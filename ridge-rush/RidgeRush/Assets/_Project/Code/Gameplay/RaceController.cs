using System.Collections.Generic;
using System.IO;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    public enum GameMode { Career, TimeTrial, Endless, Freestyle, Supercross, Demo, Knockout }

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
            public string Name;
            public TextMesh Tag;
            public bool Reported;
        }
        private readonly List<Rival> _rivals = new List<Rival>();
        private ItemsView _items;
        private GameObject _shield;

        // Tutorial guiado (GDD §11).
        private bool _tutorial;
        private int _tutorialStep;
        private float _tutorialTimer;

        // Repetición con cámaras de transmisión.
        private bool _replay;
        private float _replayTime, _replayShotTime;
        private int _replayShot;
        private float[] _replayData;

        // Fantasma: grabación de esta carrera y reproducción del mejor tiempo.
        private readonly List<float> _recording = new List<float>(4096);
        private float[] _ghostData;
        private float _nextSample;

        private void Start()
        {
            Application.runInBackground = false;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            MaterialFactory.Init(materials);
            if (ShotMode.Enabled)
            {
                // Pantalla virtual sin GPU: calidad baja para que cada fotograma no tarde minutos.
                QualitySettings.vSyncCount = 0;
                GameSettings.QualityOverride = (int)QualityTier.Low;
                Debug.Log("Ridge Rush: capturas — calidad baja, sin vsync");
            }
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
            _hud.ReplayRequested += StartReplay;
            _hud.ReplayExitRequested += StopReplay;
            _hud.KnockoutRequested += OnKnockoutPressed;
            _input.Bind(_hud.GasButton, _hud.BrakeButton, _hud.NitroButton, _hud.LeanBackButton, _hud.LeanForwardButton);

            _menu = MenuView.Create();
            _menu.PlayLevel += id => StartLevel(id, id.StartsWith("stadium_") ? GameMode.Supercross : _menu.TimeTrial ? GameMode.TimeTrial : GameMode.Career);
            _menu.PlayEndless += () => StartLevel("endless", GameMode.Endless);
            _menu.PlayFreestyle += () => StartLevel("freestyle", GameMode.Freestyle);
            _menu.PlayTutorial += StartTutorial;
            _menu.PlayKnockout += StartKnockout;
            _menu.GarageChanged += () => { if (_mode == GameMode.Demo) Load(_level.Data, GameMode.Demo); };

            GoToMenu();
            if (ShotMode.Enabled) StartCoroutine(RunShots());
        }

        // ------------------------------------------------------------------ capturas automáticas (CI)
        // El workflow ridge-rush-shots.yml compila el juego para Linux y lo abre con -rrShots <carpeta>:
        // recorre menú, garaje y niveles de cada mundo con el piloto automático y guarda capturas.
        private bool _autoPilot;

        private System.Collections.IEnumerator ShotHeartbeat()
        {
            int frames = 0;
            float t0 = Time.realtimeSinceStartup;
            while (true)
            {
                yield return null;
                if (++frames % 20 == 0 || frames <= 5)
                    Debug.Log($"Ridge Rush: fotograma {frames}, {Time.realtimeSinceStartup - t0:0}s reales, sim {(_rules != null ? _rules.Sim.Time : 0f):0.0}s");
            }
        }

        private System.Collections.IEnumerator RunShots()
        {
            QualitySettings.vSyncCount = 0; // la pantalla virtual va a 0 Hz: sin esto se queda esperando
            Application.targetFrameRate = -1;
            Time.captureFramerate = 20; // cada fotograma avanza 0,05 s aunque el ordenador vaya lento
            Debug.Log("Ridge Rush: modo capturas iniciado");
            StartCoroutine(ShotHeartbeat());
            string dir = ShotMode.Directory;
            System.IO.Directory.CreateDirectory(dir);
            int n = 0;
            System.Collections.IEnumerator Shot(string name)
            {
                yield return null; yield return null;
                ScreenCapture.CaptureScreenshot(System.IO.Path.Combine(dir, $"{n++:00}_{name}.png"));
                Debug.Log($"Ridge Rush: captura {n} {name} (t={Time.realtimeSinceStartup:0}s)");
                yield return null; yield return null;
            }
            System.Collections.IEnumerator WaitSim(float seconds)
            {
                float t0 = _rules.Sim.Time;
                int guard = 0;
                while (_rules.Sim.Time - t0 < seconds && guard++ < 4000) yield return null;
            }

            yield return WaitSim(2f);
            yield return Shot("menu");
            foreach (int b in new[] { 0, 6, 7, 9 })
            {
                _menu.ShowGarageFor(b);
                for (int i = 0; i < 30; i++) yield return null;
                yield return Shot("garage_" + b);
            }
            _menu.ShowTitle();

            foreach (var id in ShotMode.Levels)
            {
                StartLevel(id, id.StartsWith("stadium_") ? GameMode.Supercross : GameMode.Career);
                if (_rules == null) continue;
                _autoPilot = true;
                yield return WaitSim(1f);
                yield return Shot(id + "_start");
                // Delante del primer loop, sierra o trampolín, si hay.
                float target = float.MaxValue;
                foreach (var l in _level.Track.Loops) target = Mathf.Min(target, l.Center.x - 14f);
                foreach (var o in _level.Data.obstacles ?? new ObstacleData[0])
                    if (o.type == "saw" || o.type == "spring") target = Mathf.Min(target, o.x - 12f);
                int guard = 0;
                if (target < float.MaxValue)
                {
                    while (_rules.Sim.Chassis.Position.x < target && _rules.State != RaceState.Finished && guard++ < 6000) yield return null;
                    yield return Shot(id + "_feature");
                    yield return WaitSim(1.2f);
                    yield return Shot(id + "_feature2");
                }
                yield return WaitSim(4f);
                yield return Shot(id + "_mid");
                _autoPilot = false;
            }
            Debug.Log($"Ridge Rush: {n} capturas en {dir}");
            yield return null;
            Application.Quit();
        }

        // ------------------------------------------------------------------ flujo

        private void GoToMenu()
        {
            _hud.HideBanner();
            _hud.SetPaused(false);
            _hud.HideFinish();
            var demo = LevelCatalog.Load(SaveSystem.Data.lastLevel) ?? LevelCatalog.Load("coast_01") ?? JsonUtility.FromJson<LevelData>(levelJson.text);
            Load(demo, GameMode.Demo);
            _menu.ShowTitle();
        }

        private void StartTutorial()
        {
            StartLevel("coast_01", GameMode.Career);
            _tutorial = true; _tutorialStep = 0; _tutorialTimer = 0f;
            _hud.SetTutorial(Loc.Get("tut1"));
        }

        /// <summary>Indicaciones del tutorial; cada paso avanza al cumplirse (o a los 12 s).</summary>
        private void TickTutorial(float dt)
        {
            if (!_tutorial) return;
            _tutorialTimer += dt;
            var sim = _rules.Sim;
            bool done = _tutorialStep switch
            {
                0 => sim.Chassis.Velocity.x > 6f,
                1 => Mathf.Abs(sim.LastInput.Lean) > 0.5f,
                2 => _rules.Combo > 1.01f || _rules.Score > 0,
                3 => sim.NitroActive,
                4 => _rules.Power > 0.3f,
                5 => _rules.Knockout >= 1f || _tutorialTimer > 8f,
                _ => _tutorialTimer > 4f,
            };
            if (!done && _tutorialTimer < 12f) return;
            _tutorialStep++; _tutorialTimer = 0f;
            if (_tutorialStep <= 5) _hud.SetTutorial(Loc.Get("tut" + (_tutorialStep + 1)));
            else if (_tutorialStep == 6) _hud.SetTutorial(Loc.Get("tut_done"));
            else
            {
                _tutorial = false;
                _hud.SetTutorial(null);
                SaveSystem.Data.tutorialDone = true;
                SaveSystem.Save();
            }
        }

        private void StartLevel(string id, GameMode mode)
        {
            _tutorial = false;
            _hud.SetTutorial(null);
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

            // Cada moto es una skin con su decoración; el equipo del piloto va a juego.
            _bike = BikeModelFactory.Create(bikeParams, _root, def);
            _rider = RiderRig.Create(bikeParams, _root, new Color(def.BodyR, def.BodyG, def.BodyB), LiveryTextures.Rgb(def.Secondary));
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
                _ghost = BikeModelFactory.Create(bikeParams, _root, def, ghost: true);
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
                bool ko = mode == GameMode.Knockout && _ko != null;
                int count = ko ? _ko.Alive.Count : 3;
                var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                for (int i = 0; i < count; i++)
                {
                    var bdef = ko ? BikeCatalog.Bikes[_ko.NextBike(BikeCatalog.Bikes.Length)] : BikeCatalog.Get(rivalBikes[i]);
                    var rp = BikeCatalog.Build(bdef);
                    var rr = new RaceRules(TrackBuilder.Build(data), rp, ModeRules.TimeTrial);
                    var view = BikeModelFactory.Create(rp, _root, bdef);
                    view.name = "Rival_" + i;
                    var rider = ko ? RiderRig.Create(rp, _root, new Color(bdef.BodyR, bdef.BodyG, bdef.BodyB), LiveryTextures.Rgb(bdef.Secondary))
                                   : RiderRig.Create(rp, _root, jerseys[i], rivalColors[i]);
                    var st = rr.Sim.CaptureState();
                    // En Carrera son algo más lentos (se les puede ganar); en Supercross, más duros; en Eliminatoria, variados.
                    float skill = ko ? _ko.NextSkill() : (mode == GameMode.Supercross ? 0.8f : 0.7f) + i * 0.07f;
                    var rv = new Rival { Rules = rr, View = view, Rider = rider, Skill = skill, Prev = st, Curr = st };
                    if (ko)
                    {
                        // Nombre flotando sobre el piloto (siempre mira a la cámara).
                        rv.Name = _ko.Alive[i];
                        var tagGo = new GameObject("NameTag");
                        tagGo.transform.SetParent(_root, false);
                        var tm = tagGo.AddComponent<TextMesh>();
                        tm.font = font; tm.text = rv.Name; tm.fontSize = 48; tm.characterSize = 0.045f; tm.anchor = TextAnchor.MiddleCenter;
                        tm.fontStyle = FontStyle.Bold; tm.color = Color.Lerp(Color.white, new Color(bdef.BodyR, bdef.BodyG, bdef.BodyB), 0.35f);
                        tagGo.GetComponent<MeshRenderer>().sharedMaterial = font.material;
                        rv.Tag = tm;
                    }
                    _rivals.Add(rv);
                }
            }
            _hud.ShowPowers(mode != GameMode.Demo && mode != GameMode.Freestyle);

            _hud.SetVisible(mode != GameMode.Demo);
            _hud.SetMode(mode == GameMode.Freestyle, mode == GameMode.Supercross || mode == GameMode.Knockout);
            _hud.SetTargetOverride(null);
            _koDone = false; _koPlayerReported = false;
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
            if (_mode == GameMode.Knockout && _ko != null)
            {
                _ko.Finished.Clear(); _koDone = false; _koPlayerReported = false;
                foreach (var rv in _rivals) rv.Reported = false;
                _hud.HideBanner();
            }
            foreach (var rv in _rivals)
            {
                rv.Rules.Restart();
                rv.Prev = rv.Curr = rv.Rules.Sim.CaptureState();
                rv.Rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
            }
            _rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
            _curr = _prev = _rules.Sim.CaptureState();
            _accumulator = 0f;
            if (_replay) { _replay = false; _hud.SetReplay(false); }
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
            if (_replay) { TickReplay(Mathf.Min(Time.unscaledDeltaTime, MaxFrameDelta)); return; }
            bool demo = _mode == GameMode.Demo;
            // Garaje: la moto se ve parada y de cerca, girando la cámara a su alrededor.
            if (demo && _menu != null && _menu.InGarage) { TickGarage(Time.unscaledDeltaTime); return; }
            if (_garageStage != null && _garageStage.activeSelf) _garageStage.SetActive(false);
            if (!demo) TickTutorial(Mathf.Min(Time.unscaledDeltaTime, MaxFrameDelta));
            if (!demo && _input.RestartPressed()) Restart();
            if (!demo && _input.BackPressed()) _hud.SetPaused(!_paused);
            float frameDt = Mathf.Min(Time.unscaledDeltaTime, MaxFrameDelta);
            if (!demo && (_rules.Sim.Nitro <= 0f || _rules.State != RaceState.Racing && _rules.State != RaceState.Ready)) _input.CancelTurbo();
            var input = demo ? BotDriver.Drive(_rules.Sim, 0.85f) : _autoPilot ? BotDriver.Drive(_rules.Sim, 0.9f) : _input.Read(frameDt);
            if (_paused) { _hud.Tick(_rules, _input, frameDt); return; }

            float timeScale = 1f;
            if (_slowMoTimer > 0f) { _slowMoTimer -= frameDt; timeScale = 0.35f; }

            _accumulator += frameDt * timeScale;
            int steps = 0;
            while (_accumulator >= BikeSim.FixedDt && steps < 48)
            {
                _prev = _curr;
                _rules.Step(demo ? BotDriver.Drive(_rules.Sim, 0.85f) : _autoPilot ? BotDriver.Drive(_rules.Sim, 0.9f) : input);
                if (_autoPilot && _rules.State == RaceState.Crashed && _rules.CrashTimer > 1f) _rules.Respawn();
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
                rv.View.ApplyOffset(new Vector3(0f, 0f, _rivals.Count > 3 ? 0.9f + (i % 4) * 0.6f : 1.1f + i * 0.9f)); // carriles detrás del jugador
                rv.Rider.Pose(rv.View.Chassis, rs, frameDt * timeScale);
                if (rv.Tag != null)
                {
                    rv.Tag.transform.position = rv.View.Chassis.position + new Vector3(0f, 2.3f, 0f);
                    rv.Tag.transform.rotation = mainCamera.transform.rotation;
                }
            }
            if (_rivals.Count > 0) _hud.SetPosition(RacePosition(), _rivals.Count + 1);
            if (_mode == GameMode.Knockout) TickKnockout();
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

        // ------------------------------------------------------------------ garaje y repetición

        private float _garageAngle;

        /// <summary>Vista del garaje: moto parada en el inicio y cámara que gira lentamente a su alrededor.</summary>
        private void TickGarage(float dt)
        {
            if (_rules.Sim.Chassis.Position.x > _level.Data.startX + 0.5f || _rules.State != RaceState.Ready) { Restart(); }
            _garageAngle += dt * 14f;
            var c = _bike.Chassis.position + new Vector3(-0.2f, 0.2f, 0f);
            var offset = Quaternion.Euler(10f, _garageAngle - 90f + Mathf.Sin(_garageAngle * 0.02f) * 25f, 0f) * new Vector3(0f, 0f, -4.4f);
            mainCamera.transform.position = c + offset;
            mainCamera.transform.LookAt(c);
            // La moto queda a la izquierda: el panel de mejoras ocupa la derecha.
            mainCamera.transform.position += mainCamera.transform.right * 1.25f;
            mainCamera.fieldOfView = 40f;
            _bike.Apply(_curr);
            _rider.Pose(_bike.Chassis, _curr, dt);
            EnsureGarageStage();
            _garageStage.SetActive(true);
            _garageStage.transform.position = new Vector3(_bike.Chassis.position.x - 0.1f, _rules.Sim.RearInfo.Grounded ? _rules.Sim.RearInfo.ContactPoint.y + 0.02f : _bike.Chassis.position.y - 0.6f, 0f);
            _garageStage.transform.rotation = Quaternion.Euler(0f, _garageAngle * 0.5f, 0f);
        }

        private GameObject _garageStage;

        /// <summary>Plataforma giratoria de exposición con aro de luz y foco (solo en el garaje).</summary>
        private void EnsureGarageStage()
        {
            if (_garageStage != null) return;
            _garageStage = new GameObject("GarageStage");
            _garageStage.transform.SetParent(_root, false);
            var t = _garageStage.transform;
            var disc = MaterialFactory.Lit("garage_disc", new Color(0.08f, 0.09f, 0.1f), 0.8f, 0.85f);
            var ring = MaterialFactory.Lit("garage_ring", new Color(0.2f, 0.9f, 1f), 0f, 0.7f, emission: new Color(0.6f, 2.8f, 3.4f));
            SimConvert.Primitive(PrimitiveType.Cylinder, "Disc", t, new Vector3(0f, -0.06f, 0f), new Vector3(3.6f, 0.05f, 3.6f), disc);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Ring", t, new Vector3(0f, -0.07f, 0f), new Vector3(3.75f, 0.03f, 3.75f), ring);
            for (int i = 0; i < 12; i++)
            {
                float a = i * 30f * Mathf.Deg2Rad;
                SimConvert.Primitive(PrimitiveType.Cube, "Dot", t, new Vector3(Mathf.Cos(a) * 1.6f, -0.02f, Mathf.Sin(a) * 1.6f), new Vector3(0.12f, 0.02f, 0.12f), ring);
            }
            var lg = new GameObject("Spot");
            lg.transform.SetParent(t, false);
            lg.transform.localPosition = new Vector3(0f, 5f, -2f);
            lg.transform.LookAt(t.position + Vector3.up * 0.5f);
            var l = lg.AddComponent<Light>();
            l.type = LightType.Spot; l.range = 12f; l.spotAngle = 50f; l.intensity = 14f; l.color = new Color(1f, 0.96f, 0.9f);
        }

        private void StartReplay()
        {
            if (_replayData == null || _replayData.Length < 18) return;
            _replay = true; _replayTime = 0f; _replayShot = 0; _replayShotTime = 0f;
            _hud.SetReplay(true);
            _rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
        }

        private void StopReplay()
        {
            _replay = false;
            _hud.SetReplay(false);
            _hud.ShowFinish(_rules, _bestBefore, LevelCatalog.Next(_level.Data.id) != null && _mode != GameMode.Endless);
            _cam.Snap(_bike.Position);
        }

        /// <summary>Repite la carrera con cámaras de retransmisión que cambian cada pocos segundos.</summary>
        private void TickReplay(float dt)
        {
            int frames = _replayData.Length / 9;
            _replayTime += dt;
            float f = _replayTime * GhostRate;
            if (f >= frames - 1) { _replayTime = 0f; f = 0f; }
            int a = (int)f, b = Mathf.Min(a + 1, frames - 1);
            float t = f - a;
            float L(int k) => Mathf.Lerp(_replayData[a * 9 + k], _replayData[b * 9 + k], t);
            var st = new BikeState
            {
                ChassisPos = new Vec2(L(0), L(1)), ChassisAngle = L(2),
                FrontWheelPos = new Vec2(L(3), L(4)), FrontWheelAngle = L(5),
                RearWheelPos = new Vec2(L(6), L(7)), RearWheelAngle = L(8),
            };
            _bike.Apply(st);
            _rider.Pose(_bike.Chassis, st, dt);

            _replayShotTime += dt;
            if (_replayShotTime > 3.5f) { _replayShotTime = 0f; _replayShot = (_replayShot + 1) % 4; }
            var target = _bike.Chassis.position;
            Vector3 camPos;
            float fov;
            switch (_replayShot)
            {
                case 0: camPos = target + new Vector3(-2f, 1.5f, -9f); fov = 45f; break;                 // lateral cercana
                case 1: camPos = target + new Vector3(-6f, 0.4f, -4f); fov = 38f; break;                 // baja, a ras de suelo
                case 2: camPos = new Vector3(target.x + 18f - _replayShotTime * 10f, target.y + 3f, -14f); fov = 30f; break; // teleobjetivo desde delante
                default: camPos = target + new Vector3(0f, 9f, -18f); fov = 50f; break;                 // grúa alta
            }
            mainCamera.transform.position = Vector3.Lerp(mainCamera.transform.position, camPos, _replayShotTime < 0.05f ? 1f : 1f - Mathf.Exp(-6f * dt));
            mainCamera.transform.LookAt(target + Vector3.up * 0.5f);
            mainCamera.fieldOfView = fov;
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
            if (_mode == GameMode.Knockout) { _replayData = _recording.ToArray(); Haptics.Impact(0.8f, 0.6f); return; } // lo resuelve TickKnockout
            SeasonPass.AddXp(SeasonPass.XpFor(_rules.Stars, _rules.Coins, true));
            if (_tutorial) { _tutorial = false; _hud.SetTutorial(null); SaveSystem.Data.tutorialDone = true; SaveSystem.Save(); }
            _replayData = _recording.ToArray();
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

        // ------------------------------------------------------------------ eliminatoria

        private KnockoutSession _ko;
        private bool _koDone, _koPlayerReported;

        private void StartKnockout()
        {
            _ko = new KnockoutSession(Random.Range(0, 1000000));
            NextKnockoutRound();
        }

        private void NextKnockoutRound()
        {
            _ko.StartRound();
            var data = LevelCatalog.Load(_ko.PickLevel()) ?? LevelCatalog.Load("coast_03");
            _menu.Show(false);
            _hud.HideBanner();
            Load(data, GameMode.Knockout);
            string round = _ko.Round == _ko.Rounds ? Loc.Get("final_round") : $"{Loc.Get("round")} {_ko.Round}/{_ko.Rounds}";
            _hud.SetLevelName($"{round}  ·  {(_ko.Qualify == 1 ? Loc.Get("only_winner") : string.Format(Loc.Get("qualify_n"), _ko.Qualify))}");
        }

        /// <summary>Orden de llegada, contador de clasificados y fin de ronda.</summary>
        private void TickKnockout()
        {
            if (_ko == null || _koDone) return;
            if (_rules.State == RaceState.Finished && !_koPlayerReported) { _koPlayerReported = true; _ko.Finished.Add(KnockoutSession.You); }
            foreach (var rv in _rivals)
                if (rv.Rules.State == RaceState.Finished && !rv.Reported) { rv.Reported = true; _ko.Finished.Add(rv.Name); }
            int done = Mathf.Min(_ko.Finished.Count, _ko.Qualify);
            _hud.SetTargetOverride($"{Loc.Get("qualified")} {done}/{_ko.Qualify}");
            int place = _ko.Place(KnockoutSession.You);
            bool qualified = place > 0 && place <= _ko.Qualify;
            if (qualified || _ko.Finished.Count >= _ko.Qualify) EndKnockoutRound(qualified);
        }

        private void EndKnockoutRound(bool qualified)
        {
            _koDone = true;
            // Los puestos que quedan se reparten por cómo iba cada uno.
            var next = new List<string>();
            foreach (var n in _ko.Finished) if (n != KnockoutSession.You && next.Count < _ko.Qualify) next.Add(n);
            var rest = new List<Rival>(_rivals.FindAll(r => !_ko.Finished.Contains(r.Name)));
            rest.Sort((a, b) => b.Rules.Progress.CompareTo(a.Rules.Progress));
            int spots = _ko.Qualify - (qualified ? 1 : 0);
            foreach (var r in rest) if (next.Count < spots) next.Add(r.Name);
            _ko.Alive.Clear(); _ko.Alive.AddRange(next);

            var save = SaveSystem.Data;
            if (qualified && _ko.Round == _ko.Rounds)
            {
                save.coins += 500 + _rules.Coins; save.gems += 20; SaveSystem.Save();
                SeasonPass.AddXp(400);
                _items.Fireworks(_rules.Sim.Chassis.Position.ToV3());
                _hud.ShowBanner(Loc.Get("champion"), "+500 ●   +20 ◆", new Color(1f, 0.78f, 0.15f),
                    Loc.Get("play_again"), StartKnockout, Loc.Get("menu"), GoToMenu);
            }
            else if (qualified)
            {
                save.coins += 60 * _ko.Round + _rules.Coins; SaveSystem.Save();
                _hud.ShowBanner(Loc.Get("qualified_big"), string.Format(Loc.Get("place_of"), _ko.Place(KnockoutSession.You), _ko.Qualify), new Color(0.3f, 0.95f, 0.45f),
                    Loc.Get("next_round"), NextKnockoutRound, Loc.Get("menu"), GoToMenu);
            }
            else
            {
                save.coins += 40 * _ko.Round + _rules.Coins; SaveSystem.Save();
                SeasonPass.AddXp(60 * _ko.Round);
                _hud.ShowBanner(Loc.Get("eliminated"), string.Format(Loc.Get("eliminated_round"), _ko.Round), new Color(1f, 0.3f, 0.25f),
                    Loc.Get("play_again"), StartKnockout, Loc.Get("menu"), GoToMenu);
            }
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
                        _bike.AddDamage(0.35f);
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
                    case RaceEventType.Hit: _bike.AddDamage(0.15f); _items.Burst(at, 20, new Color(1f, 0.8f, 0.4f)); if (!demo) { _hud.Popup(Loc.Get("hit"), ember, 0.7f); _cam.AddShake(0.6f); Haptics.Impact(0.8f, 0.4f); } break;
                    case RaceEventType.SawHit: _bike.AddDamage(0.3f); _items.Burst(at, 60, new Color(1f, 0.85f, 0.5f)); if (!demo) { _cam.AddShake(1f); Haptics.Impact(1f, 0.3f); _audio.PlayCrash(); } break;
                    case RaceEventType.Finished: _items.Fireworks(new Vector3(_level.FinishX, _rules.Sim.Chassis.Position.y, 0f)); break;
                    case RaceEventType.NearMiss: if (!demo) { _hud.Popup(Loc.Get("near_miss"), new Color(1f, 0.85f, 0.2f), 0.7f); Haptics.Impact(0.4f, 1f); } break;
                    case RaceEventType.CratesSmash: _items.Smash(at); if (!demo) { _hud.Popup(Loc.Get("smash"), new Color(1f, 0.8f, 0.4f), 0.6f); _cam.AddShake(0.4f); Haptics.Impact(0.7f, 0.6f); } break;
                    case RaceEventType.Spring: _items.SpringFx(at); _items.Burst(at, 15, new Color(0.3f, 1f, 0.5f)); if (!demo) { _hud.Popup(Loc.Get("spring"), new Color(0.3f, 1f, 0.5f), 0.7f); _cam.AddShake(0.3f); Haptics.Impact(0.6f, 0.9f); } break;
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
