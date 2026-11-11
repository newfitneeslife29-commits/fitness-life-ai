using System.Collections.Generic;
using System.IO;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    public enum GameMode { Career, TimeTrial, Endless, Freestyle, Supercross, Demo }

    /// <summary>
    /// Punto de entrada del juego. Gestiona menús y carreras en una sola escena:
    /// - Menú: detrás se ve una carrera de demostración que conduce el piloto automático.
    /// - Carrera: lee la entrada → simulación a 240 Hz (paso fijo, determinista) → interpola para dibujar a 60/120 FPS
    ///   → moto, piloto, cámara, partículas, clima, sonido, vibración y HUD.
    /// Reiniciar no recarga nada (&lt; 300 ms, GDD §1); cambiar de nivel reconstruye solo el mundo.
    /// </summary>
    public sealed class RaceController : MonoBehaviour
    {
        [Header("Datos")]
        public TextAsset levelJson;          // nivel de respaldo si Resources/Levels no existe
        public MaterialLibrary materials;
        [Header("Escena")]
        public Camera mainCamera;

        private const float RespawnDelay = 1.3f;
        private const float MaxFrameDelta = 0.1f;
        private const float GhostRate = 30f;

        private RaceRules _rules;
        private BuiltLevel _level;
        private Transform _root;
        private BikeView _bike, _ghost;
        private RiderRig _rider;
        private RaceCamera _cam;
        private SurfaceFx _fx;
        private TireMarks _marks;
        private EngineAudio _audio;
        private HudView _hud;
        private MenuView _menu;
        private Light _headlight;
        private readonly TouchInput _input = new TouchInput();
        private WorldBuilder.World _world;
        private List<(TrackChain chain, Transform view)> _platforms;

        private GameMode _mode = GameMode.Demo;
        private BikeState _prev, _curr;
        private float _accumulator;
        private float _slowMoTimer;
        private bool _paused;
        private bool _finishShown;
        private float _bestBefore;

        // Supercross: rivales con IA (cada uno con su propia simulación; no chocan con el jugador).
        private sealed class Rival
        {
            public RaceRules Rules;
            public BikeView View;
            public RiderRig Rider;
            public float Skill;
            public BikeState Prev, Curr;
        }
        private readonly List<Rival> _rivals = new List<Rival>();
        private ItemsView _items;
        private GameObject _shield;

        // Fantasma: grabación de esta carrera y reproducción del mejor tiempo.
        private readonly List<float> _recording = new List<float>(4096);
        private float[] _ghostData;
        private float _nextSample;

        private void Start()
        {
            Application.runInBackground = false;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            MaterialFactory.Init(materials);
            Store.Init();
            GameServices.Authenticate();

            _audio = mainCamera.gameObject.AddComponent<EngineAudio>();
            _cam = mainCamera.gameObject.AddComponent<RaceCamera>();
            _cam.Cam = mainCamera;
            mainCamera.nearClipPlane = 0.3f;
            mainCamera.farClipPlane = 1500f;

            _hud = HudView.Create();
            _hud.RestartRequested += Restart;
            _hud.PauseChanged += p => { _paused = p; if (p) Haptics.Stop(); };
            _hud.SettingsChanged += ApplySettings;
            _hud.MenuRequested += GoToMenu;
            _hud.NextRequested += PlayNext;
            _hud.PowerRequested += OnPowerPressed;
            _hud.KnockoutRequested += OnKnockoutPressed;
            _input.Bind(_hud.GasButton, _hud.BrakeButton, _hud.NitroButton);

            _menu = MenuView.Create();
            _menu.PlayLevel += id => StartLevel(id, id.StartsWith("stadium_") ? GameMode.Supercross : _menu.TimeTrial ? GameMode.TimeTrial : GameMode.Career);
            _menu.PlayEndless += () => StartLevel("endless", GameMode.Endless);
            _menu.PlayFreestyle += () => StartLevel("freestyle", GameMode.Freestyle);
            _menu.GarageChanged += () => { if (_mode == GameMode.Demo) Load(_level.Data, GameMode.Demo); };

            GoToMenu();
        }

        // ------------------------------------------------------------------ flujo

        private void GoToMenu()
        {
            _hud.SetPaused(false);
            _hud.HideFinish();
            var demo = LevelCatalog.Load(SaveSystem.Data.lastLevel) ?? LevelCatalog.Load("coast_01") ?? JsonUtility.FromJson<LevelData>(levelJson.text);
            Load(demo, GameMode.Demo);
            _menu.ShowTitle();
        }

        private void StartLevel(string id, GameMode mode)
        {
            LevelData data;
            if (id == "freestyle") data = LevelGenerator.FreestylePark(Random.Range(0, 100000));
            else if (id == "endless")
            {
                // Modo Infinito: pista procedural muy larga de un mundo al azar; la puntuación es la distancia.
                var worlds = LevelGenerator.Worlds;
                var w = worlds[Random.Range(0, worlds.Length - 1)];
                data = LevelGenerator.Generate(w, w.LevelCount - 1, Random.Range(0, 100000));
                var list = new List<SectionData>(data.sections);
                var extra = LevelGenerator.Generate(w, w.LevelCount - 2, Random.Range(0, 100000)).sections;
                list.RemoveAt(list.Count - 1); // quitar la meta y alargar
                for (int i = 1; i < extra.Length; i++) list.Add(extra[i]);
                data.sections = list.ToArray();
                data.id = "endless";
                data.nameEs = "Infinito · " + w.NameEs; data.nameEn = "Endless · " + w.NameEn;
            }
            else
            {
                data = LevelCatalog.Load(id);
                if (data == null) return;
                SaveSystem.Data.lastLevel = id;
                SaveSystem.Save();
            }
            _menu.Show(false);
            Load(data, mode);
        }

        private void PlayNext()
        {
            string next = _level != null ? LevelCatalog.Next(_level.Data.id) : null;
            if (next != null && SaveSystem.Stars(_level.Data.id) > 0) StartLevel(next, _mode);
            else GoToMenu();
        }

        /// <summary>Construye el nivel completo (mundo, pista, moto, piloto, efectos).</summary>
        private void Load(LevelData data, GameMode mode)
        {
            _mode = mode;
            if (_root != null) Destroy(_root.gameObject);
            _root = new GameObject("Race").transform;

            _level = TrackBuilder.Build(data);
            var save = SaveSystem.Data;
            var def = BikeCatalog.Get(mode == GameMode.Demo && _menu != null && _menu.GarageBike != null ? _menu.GarageBike : save.selectedBike);
            var up = SaveSystem.Upgrades(def.Id);
            var bikeParams = BikeCatalog.Build(def, up.engine, up.tires, up.suspension, up.brakes, up.nitro);
            var modeRules = mode == GameMode.TimeTrial ? ModeRules.TimeTrial
                          : mode == GameMode.Supercross ? ModeRules.Supercross
                          : mode == GameMode.Freestyle ? ModeRules.Freestyle
                          : mode == GameMode.Endless ? new ModeRules() : ModeRules.Career;
            _rules = new RaceRules(_level, bikeParams, modeRules);

            _world = WorldBuilder.Build(_level, _root);
            TrackMeshBuilder.BuildGround(_level, _root);
            _platforms = TrackMeshBuilder.BuildPlatforms(_level, _root);

            var paint = SaveSystem.Paint(def.Id);
            Color body = save.paints.Exists(p => p.bike == def.Id) ? paint.body : new Color(def.BodyR, def.BodyG, def.BodyB);
            _bike = BikeModelFactory.Create(bikeParams, _root, body);
            _rider = RiderRig.Create(bikeParams, _root, paint.rider, new Color(0.98f, 0.98f, 0.98f));
            _fx = SurfaceFx.Create(_root, _bike.ExhaustTip);
            _marks = new GameObject("TireMarks").AddComponent<TireMarks>();
            _marks.transform.SetParent(_root, false);
            WeatherFx.Create(_root, mainCamera.transform, data.weather, _world.Sun, QualityManager.ParticleScale);

            // Faro de la moto de noche (ciudad, volcán, niveles nocturnos).
            _headlight = null;
            if (_world.Night || _world.Theme.Headlight)
            {
                var lg = new GameObject("Headlight");
                lg.transform.SetParent(_bike.Chassis, false);
                lg.transform.localPosition = new Vector3(0.75f, 0.35f, 0f);
                lg.transform.localRotation = Quaternion.Euler(8f, 90f, 0f);
                _headlight = lg.AddComponent<Light>();
                _headlight.type = LightType.Spot;
                _headlight.range = 38f; _headlight.spotAngle = 62f; _headlight.intensity = 9f;
                _headlight.color = new Color(1f, 0.95f, 0.85f);
                _headlight.shadows = LightShadows.None;
            }

            // Fantasma del mejor tiempo (Contrarreloj).
            _ghost = null;
            _ghostData = mode == GameMode.TimeTrial ? LoadGhost(data.id) : null;
            if (_ghostData != null)
            {
                _ghost = BikeModelFactory.Create(bikeParams, _root, new Color(0.2f, 0.9f, 1f));
                _ghost.name = "Ghost";
            }

            // Objetos y peligros del nivel.
            _items = ItemsView.Create(_root, _rules);

            // Escudo del poder: burbuja alrededor de la moto.
            _shield = SimConvert.Primitive(PrimitiveType.Sphere, "Shield", _bike.Chassis, new Vector3(0f, 0.2f, 0f), new Vector3(3.2f, 2.6f, 2.2f),
                MaterialFactory.Particles("shield_bubble", Texture2D.whiteTexture, new Color(0.2f, 0.9f, 1f, 0.22f)));
            _shield.SetActive(false);

            // Rivales con IA en Carrera y Supercross (con su propia pista: los puentes que caen son de cada uno).
            _rivals.Clear();
            if (modeRules.rivals)
            {
                var rivalBikes = new[] { "haldane_raptor_250", "vextor_brute_450", "ferrum_trailhound_300" };
                var rivalColors = new[] { new Color(0.1f, 0.3f, 0.85f), new Color(0.9f, 0.1f, 0.15f), new Color(0.2f, 0.55f, 0.2f) };
                var jerseys = new[] { new Color(0.95f, 0.85f, 0.2f), new Color(0.15f, 0.15f, 0.15f), new Color(0.9f, 0.4f, 0.8f) };
                for (int i = 0; i < 3; i++)
                {
                    var rp = BikeCatalog.Build(BikeCatalog.Get(rivalBikes[i]));
                    var rr = new RaceRules(TrackBuilder.Build(data), rp, ModeRules.TimeTrial);
                    var view = BikeModelFactory.Create(rp, _root, rivalColors[i]);
                    view.name = "Rival_" + i;
                    var rider = RiderRig.Create(rp, _root, jerseys[i], rivalColors[i]);
                    var st = rr.Sim.CaptureState();
                    // En Carrera son algo más lentos (se les puede ganar); en Supercross, más duros.
                    float skill = (mode == GameMode.Supercross ? 0.8f : 0.7f) + i * 0.07f;
                    _rivals.Add(new Rival { Rules = rr, View = view, Rider = rider, Skill = skill, Prev = st, Curr = st });
                }
            }
            _hud.ShowPowers(mode != GameMode.Demo && mode != GameMode.Freestyle);

            _hud.SetVisible(mode != GameMode.Demo);
            _hud.SetMode(mode == GameMode.Freestyle, mode == GameMode.Supercross);
            _hud.SetLevelName(Loc.Spanish ? data.nameEs : data.nameEn);
            ApplySettings();
            Restart();
        }

        private void ApplySettings()
        {
            int q = GameSettings.QualityOverride;
            if (_world != null) QualityManager.Apply(q < 0 ? QualityManager.Detect() : (QualityTier)q, mainCamera, _world.Post, _world.Sun);
            if (_rules != null) _rules.Sim.TractionControl = GameSettings.TractionControl;
            _input.CalibrateTilt();
        }

        private void Restart()
        {
            _rules.Restart();
            foreach (var rv in _rivals)
            {
                rv.Rules.Restart();
                rv.Prev = rv.Curr = rv.Rules.Sim.CaptureState();
                rv.Rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
            }
            _rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
            _curr = _prev = _rules.Sim.CaptureState();
            _accumulator = 0f;
            _slowMoTimer = 0f;
            _finishShown = false;
            _hud.HideFinish();
            _marks.Clear();
            _fx.Clear();
            _bike.ResetDirt();
            _bestBefore = SaveSystem.Record(_level.Data.id)?.best ?? 0f;
            _recording.Clear();
            _nextSample = 0f;
            _bike.Apply(_curr);
            _rider.Pose(_bike.Chassis, _curr, 0f);
            _cam.Snap(_bike.Position);
            _input.CalibrateTilt();
        }

        private void Respawn()
        {
            _rules.Respawn();
            _rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
            _curr = _prev = _rules.Sim.CaptureState();
            _marks.Clear();
            _cam.Snap(_curr.ChassisPos.ToV3());
        }

        // ------------------------------------------------------------------ bucle

        private void Update()
        {
            if (_rules == null) return;
            bool demo = _mode == GameMode.Demo;
            if (!demo && _input.RestartPressed()) Restart();
            if (!demo && _input.BackPressed()) _hud.SetPaused(!_paused);
            float frameDt = Mathf.Min(Time.unscaledDeltaTime, MaxFrameDelta);
            var input = demo ? BotDriver.Drive(_rules.Sim, 0.85f) : _input.Read(frameDt);
            if (_paused) { _hud.Tick(_rules, _input, frameDt); return; }

            float timeScale = 1f;
            if (_slowMoTimer > 0f) { _slowMoTimer -= frameDt; timeScale = 0.35f; }

            _accumulator += frameDt * timeScale;
            int steps = 0;
            while (_accumulator >= BikeSim.FixedDt && steps < 48)
            {
                _prev = _curr;
                _rules.Step(demo ? BotDriver.Drive(_rules.Sim, 0.85f) : input);
                _curr = _rules.Sim.CaptureState();
                _accumulator -= BikeSim.FixedDt;
                steps++;
                Record();
                HandleEvents(demo);
                StepRivals();
            }
            float alpha = Mathf.Clamp01(_accumulator / BikeSim.FixedDt);
            var state = BikeState.Lerp(_prev, _curr, alpha);

            var sim = _rules.Sim;
            _bike.Apply(state);
            _rider.Pose(_bike.Chassis, state, frameDt * timeScale);
            foreach (var (chain, view) in _platforms) view.position = chain.Offset.ToV3();
            if (_ghost != null) ApplyGhost(_rules.RaceTime);
            for (int i = 0; i < _rivals.Count; i++)
            {
                var rv = _rivals[i];
                var rs = BikeState.Lerp(rv.Prev, rv.Curr, alpha);
                rv.View.Apply(rs);
                rv.View.ApplyOffset(new Vector3(0f, 0f, 1.1f + i * 0.9f)); // carriles detrás del jugador
                rv.Rider.Pose(rv.View.Chassis, rs, frameDt * timeScale);
            }
            if (_rivals.Count > 0) _hud.SetPosition(RacePosition(), _rivals.Count + 1);
            _shield.SetActive(_rules.Shielded);
            if (!demo) _hud.TickPowers(_rules, NearestKnockoutTarget() != null);

            Vector2 vel = sim.Chassis.Velocity.ToV2();
            float rpm01 = Mathf.InverseLerp(sim.Params.idleRpm, sim.Params.revLimitRpm, sim.Engine.Rpm);
            _fx.Tick(sim.RearInfo, vel, sim.LastInput.Throttle, rpm01, QualityManager.ParticleScale);
            _marks.Track(0, sim.FrontInfo);
            _marks.Track(1, sim.RearInfo);
            _bike.UpdateDirt(sim.RearInfo, vel.magnitude, frameDt);
            _audio.SetState(sim.Engine.Rpm, demo ? sim.LastInput.Throttle * 0.4f : sim.LastInput.Throttle, vel.magnitude);

            bool riding = !demo && _rules.State == RaceState.Racing && (sim.FrontInfo.Grounded || sim.RearInfo.Grounded);
            if (riding) Haptics.Engine(0.08f + 0.22f * sim.LastInput.Throttle * rpm01, 0.2f + 0.5f * rpm01);
            else Haptics.Engine(0f, 0f);

            Vector3 target = _rider.Ragdoll ? _rider.Torso.position : state.ChassisPos.ToV3();
            float height = 0f;
            if (_level.Track.GroundAt(target.x, target.y + 0.5f, out float gy, out _, out _)) height = target.y - gy - sim.RideHeight;
            _cam.Tick(target, vel, height, frameDt);

            if (!demo) _hud.Tick(_rules, _input, frameDt);

            if (_rules.State == RaceState.Crashed && _rules.CrashTimer > RespawnDelay)
            {
                if (demo) Restart(); else Respawn();
            }
            if (_rules.State == RaceState.Finished && !_finishShown)
            {
                _finishShown = true;
                if (demo) { Restart(); return; }
                OnFinished();
            }
        }

        /// <summary>Avanza los rivales al mismo ritmo que el jugador (salen cuando él arranca).</summary>
        private void StepRivals()
        {
            if (_rivals.Count == 0 || _rules.State == RaceState.Ready) return;
            foreach (var rv in _rivals)
            {
                rv.Prev = rv.Curr;
                var input = rv.Rules.State == RaceState.Finished ? new BikeInput { Brake = 1f } : BotDriver.Drive(rv.Rules.Sim, rv.Skill);
                if (rv.Rules.State == RaceState.Ready) input.Throttle = Mathf.Max(input.Throttle, 0.5f);
                rv.Rules.Step(input);
                var sim = rv.Rules.Sim;
                if (rv.Rules.State == RaceState.Crashed && !rv.Rider.Ragdoll)
                    rv.Rider.SetRagdoll(true, sim.Chassis.Velocity.ToV3(), sim.Chassis.AngularVelocity, sim.Chassis.Position.ToV3());
                if (rv.Rules.State == RaceState.Crashed && rv.Rules.CrashTimer > 1.6f)
                {
                    rv.Rules.Respawn();
                    rv.Rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
                }
                rv.Rules.ClearEvents();
                rv.Curr = sim.CaptureState();
            }
        }

        /// <summary>Rival más cercano que se puede derribar ahora mismo, o null.</summary>
        private Rival NearestKnockoutTarget()
        {
            Rival best = null; float bestDist = float.MaxValue;
            foreach (var rv in _rivals)
            {
                if (!_rules.CanKnockout(rv.Rules)) continue;
                float d = Mathf.Abs(rv.Rules.Sim.Chassis.Position.x - _rules.Sim.Chassis.Position.x);
                if (d < bestDist) { bestDist = d; best = rv; }
            }
            return best;
        }

        private void OnPowerPressed()
        {
            if (_rules.ActivatePower()) { Haptics.Impact(0.7f, 0.9f); _cam.AddShake(0.3f); }
        }

        private void OnKnockoutPressed()
        {
            var target = NearestKnockoutTarget();
            if (target == null) { _hud.Popup(Loc.Get("ko_far"), new Color(1f, 0.6f, 0.4f), 0.8f); return; }
            if (!_rules.KnockoutRival(target.Rules)) return;
            var at = target.Rules.Sim.Chassis.Position.ToV3();
            _items.Burst(at, 80, new Color(1f, 0.4f, 0.1f));
            _items.Burst(_rules.Sim.Chassis.Position.ToV3(), 40, new Color(0.2f, 0.9f, 1f));
            _cam.AddShake(1f);
            Haptics.Impact(1f, 1f);
            _audio.PlayCrash();
            if (GameSettings.SlowMotion) _slowMoTimer = 0.9f;
            GameServices.Achievement("rr_first_ko");
        }

        /// <summary>Puesto del jugador (1 = primero) por progreso; quien ya terminó va delante.</summary>
        private int RacePosition()
        {
            int pos = 1;
            float mine = _rules.State == RaceState.Finished ? 2f + 1f / Mathf.Max(0.01f, _rules.FinalTime) : _rules.Progress;
            foreach (var rv in _rivals)
            {
                float theirs = rv.Rules.State == RaceState.Finished ? 2f + 1f / Mathf.Max(0.01f, rv.Rules.FinalTime) : rv.Rules.Progress;
                if (theirs > mine) pos++;
            }
            return pos;
        }

        private void OnFinished()
        {
            var id = _level.Data.id;
            bool best = false;
            if (_mode == GameMode.Freestyle)
            {
                var save = SaveSystem.Data;
                save.freestyleBest = Mathf.Max(save.freestyleBest, _rules.Score);
                save.coins += _rules.Coins;
                SaveSystem.Save();
                GameServices.Score("rr_freestyle", _rules.Score);
                _hud.ShowFinish(_rules, 0f, false);
                Haptics.Impact(0.8f, 0.6f);
                return;
            }
            if (_mode == GameMode.Supercross && RacePosition() == 1) GameServices.Achievement("rr_supercross_win");
            if (_mode != GameMode.Endless)
            {
                best = SaveSystem.ReportFinish(id, _rules.Stars, _rules.FinalTime, _rules.Coins);
                if (best) SaveGhost(id);
                GameServices.ReportLevel(id, _rules.FinalTime, SaveSystem.TotalStars());
            }
            else SaveSystem.ReportFinish("endless", 0, _rules.FinalTime, _rules.Coins);
            string next = LevelCatalog.Next(id);
            _hud.ShowFinish(_rules, _bestBefore, next != null && _mode != GameMode.Endless);
            Haptics.Impact(0.8f, 0.6f);
        }

        private void HandleEvents(bool demo)
        {
            var sim = _rules.Sim;
            for (int i = 0; i < sim.EventCount; i++)
            {
                ref readonly var e = ref sim.GetEvent(i);
                switch (e.Type)
                {
                    case SimEventType.Landed:
                        float impact = e.Value;
                        if (!demo) { _cam.AddShake(Mathf.Clamp01((impact - 4f) / 10f)); Haptics.Impact(Mathf.Clamp01(impact / 12f), 0.4f); _audio.PlayLanding(impact); }
                        _fx.LandingBurst(sim.RearInfo.Grounded ? sim.RearInfo.ContactPoint : sim.FrontInfo.ContactPoint,
                            sim.RearInfo.Grounded ? sim.RearInfo.Surface : sim.FrontInfo.Surface, impact, QualityManager.ParticleScale);
                        break;
                    case SimEventType.Crashed when !_rider.Ragdoll:
                        if (!demo) { _cam.AddShake(0.9f); Haptics.Impact(1f, 0.8f); _audio.PlayCrash(); }
                        _rider.SetRagdoll(true, sim.Chassis.Velocity.ToV3(), sim.Chassis.AngularVelocity, sim.Chassis.Position.ToV3());
                        break;
                    case SimEventType.GearUp:
                        if (!demo) { _audio.PlayShift(); Haptics.Impact(0.25f, 0.9f); }
                        break;
                    case SimEventType.Trick:
                    case SimEventType.PerfectLanding:
                        if (demo) break;
                        _hud.PopupTrick(e);
                        if (e.Type == SimEventType.Trick && e.Trick <= TrickType.Frontflip)
                        {
                            if (GameSettings.SlowMotion) _slowMoTimer = 0.6f;
                            GameServices.Achievement("rr_first_flip");
                        }
                        break;
                }
            }
            for (int i = 0; i < _rules.EventCount; i++)
            {
                ref readonly var re = ref _rules.GetEvent(i);
                var at = new Vector3(re.X, re.Y, 0f);
                var volt = new Color(0.18f, 0.89f, 1f);
                var ember = new Color(1f, 0.35f, 0.12f);
                switch (re.Type)
                {
                    case RaceEventType.Explosion: _items.Burst(at, 70, new Color(1f, 0.5f, 0.1f)); if (!demo) { _cam.AddShake(0.8f); Haptics.Impact(0.9f, 0.5f); _audio.PlayCrash(); } break;
                    case RaceEventType.PickupRing: _items.Burst(at, 30, new Color(1f, 0.6f, 0.2f)); if (!demo) { _hud.Popup(Loc.Get("ring"), ember, 0.9f); Haptics.Impact(0.5f, 0.8f); } break;
                    case RaceEventType.PickupNitro: _items.Burst(at, 15, volt); if (!demo) { _hud.Popup(Loc.Get("nitro_pick"), volt, 0.7f); Haptics.Impact(0.3f, 1f); } break;
                    case RaceEventType.PickupCoin: if (!demo) Haptics.Impact(0.15f, 1f); break;
                    case RaceEventType.Boost: if (!demo) { _hud.Popup(Loc.Get("boost"), volt, 0.6f); _cam.AddShake(0.2f); } break;
                    case RaceEventType.Hit: _items.Burst(at, 20, new Color(1f, 0.8f, 0.4f)); if (!demo) { _hud.Popup(Loc.Get("hit"), ember, 0.7f); _cam.AddShake(0.6f); Haptics.Impact(0.8f, 0.4f); } break;
                    case RaceEventType.Blocked: _items.Burst(at, 25, volt); if (!demo) _hud.Popup(Loc.Get("blocked"), volt, 0.7f); break;
                    case RaceEventType.PowerReady: if (!demo) { _hud.Popup(Loc.Get("power_ready"), volt, 1f); Haptics.Impact(0.5f, 1f); } break;
                    case RaceEventType.PowerActivated: if (!demo) _hud.Popup(Loc.Get("shield"), volt, 1f); break;
                    case RaceEventType.KnockoutReady: if (!demo) { _hud.Popup(Loc.Get("ko_ready"), ember, 1f); Haptics.Impact(0.6f, 1f); } break;
                    case RaceEventType.KnockedOut: if (!demo) _hud.Popup(Loc.Get("knockout"), ember, 1.2f); break;
                    case RaceEventType.CheckpointReached: if (!demo) { _hud.Popup(Loc.Get("checkpoint"), volt); Haptics.Impact(0.4f, 1f); } break;
                }
            }
            _rules.ClearEvents();
        }

        // ------------------------------------------------------------------ fantasma

        private void Record()
        {
            if (_mode == GameMode.Demo || _rules.State != RaceState.Racing) return;
            if (_rules.RaceTime < _nextSample) return;
            _nextSample += 1f / GhostRate;
            var s = _curr;
            _recording.Add(s.ChassisPos.x); _recording.Add(s.ChassisPos.y); _recording.Add(s.ChassisAngle);
            _recording.Add(s.FrontWheelPos.x); _recording.Add(s.FrontWheelPos.y); _recording.Add(s.FrontWheelAngle);
            _recording.Add(s.RearWheelPos.x); _recording.Add(s.RearWheelPos.y); _recording.Add(s.RearWheelAngle);
        }

        private static string GhostPath(string id) => Path.Combine(Application.persistentDataPath, "ghosts", id + ".ghost");

        private void SaveGhost(string id)
        {
            if (_recording.Count == 0) return;
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(GhostPath(id)));
                using var w = new BinaryWriter(File.Create(GhostPath(id)));
                w.Write(1); w.Write(_recording.Count);
                foreach (var f in _recording) w.Write(f);
            }
            catch (IOException e) { Debug.LogWarning($"No se pudo guardar el fantasma: {e.Message}"); }
        }

        private static float[] LoadGhost(string id)
        {
            try
            {
                if (!File.Exists(GhostPath(id))) return null;
                using var r = new BinaryReader(File.OpenRead(GhostPath(id)));
                if (r.ReadInt32() != 1) return null;
                var data = new float[r.ReadInt32()];
                for (int i = 0; i < data.Length; i++) data[i] = r.ReadSingle();
                return data;
            }
            catch (IOException) { return null; }
        }

        private void ApplyGhost(float time)
        {
            int frames = _ghostData.Length / 9;
            float f = time * GhostRate;
            int a = Mathf.Clamp((int)f, 0, frames - 1), b = Mathf.Min(a + 1, frames - 1);
            float t = Mathf.Clamp01(f - a);
            float V(int frame, int k) => _ghostData[frame * 9 + k];
            float L(int k) => Mathf.Lerp(V(a, k), V(b, k), t);
            var s = new BikeState
            {
                ChassisPos = new Vec2(L(0), L(1)), ChassisAngle = L(2),
                FrontWheelPos = new Vec2(L(3), L(4)), FrontWheelAngle = L(5),
                RearWheelPos = new Vec2(L(6), L(7)), RearWheelAngle = L(8),
            };
            _ghost.Apply(s);
            _ghost.ApplyOffset(new Vector3(0f, 0f, 1.4f)); // un poco detrás de la moto del jugador
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused && _hud != null && !_paused && _mode != GameMode.Demo) _hud.SetPaused(true);
            if (paused) Haptics.Stop();
        }

        private void OnDestroy() => Haptics.Stop();
    }
}
