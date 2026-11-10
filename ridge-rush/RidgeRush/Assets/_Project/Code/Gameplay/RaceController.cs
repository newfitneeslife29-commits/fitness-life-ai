using System.Collections.Generic;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Punto de entrada de la escena de carrera del prototipo (Fase 3).
    /// Bucle: lee la entrada → avanza la simulación a 240 Hz (paso fijo, determinista) → interpola el estado
    /// para dibujar a 60/120 FPS → actualiza moto, piloto, cámara, partículas, sonido, vibración y HUD.
    /// Reiniciar un nivel no recarga la escena: se reinicia la simulación (&lt; 300 ms, GDD §1).
    /// </summary>
    public sealed class RaceController : MonoBehaviour
    {
        [Header("Datos")]
        public TextAsset levelJson;
        public MaterialLibrary materials;
        [Header("Escena")]
        public Camera mainCamera;

        [Header("Aspecto")]
        public Color bikePaint = new Color(0.95f, 0.36f, 0.1f);   // naranja Haldane (marca ficticia)
        public Color jersey = new Color(0.1f, 0.45f, 0.9f);
        public Color helmet = new Color(0.98f, 0.98f, 0.98f);

        private const float RespawnDelay = 1.3f;
        private const float MaxFrameDelta = 0.1f;

        private RaceRules _rules;
        private BuiltLevel _level;
        private BikeView _bike;
        private RiderRig _rider;
        private RaceCamera _cam;
        private SurfaceFx _fx;
        private TireMarks _marks;
        private EngineAudio _audio;
        private HudView _hud;
        private readonly TouchInput _input = new TouchInput();
        private WorldBuilder.World _world;
        private List<(TrackChain chain, Transform view)> _platforms;

        private BikeState _prev, _curr;
        private float _accumulator;
        private float _slowMoTimer;
        private bool _paused;
        private bool _finishShown;
        private float _bestBefore;

        private void Start()
        {
            Application.runInBackground = false;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            MaterialFactory.Init(materials);

            var data = JsonUtility.FromJson<LevelData>(levelJson.text);
            _level = TrackBuilder.Build(data);
            var bikeParams = new BikeParams();
            _rules = new RaceRules(_level, bikeParams, ModeRules.Career);

            var root = new GameObject("Race").transform;
            _world = WorldBuilder.BuildCoast(_level, root);
            TrackMeshBuilder.BuildGround(_level, root);
            _platforms = TrackMeshBuilder.BuildPlatforms(_level, root);

            _bike = BikeModelFactory.Create(bikeParams, root, bikePaint);
            _rider = RiderRig.Create(bikeParams, root, jersey, helmet);
            _fx = SurfaceFx.Create(root, _bike.ExhaustTip);
            _marks = new GameObject("TireMarks").AddComponent<TireMarks>();
            _marks.transform.SetParent(root, false);
            _audio = mainCamera.gameObject.AddComponent<EngineAudio>();

            _cam = mainCamera.gameObject.AddComponent<RaceCamera>();
            _cam.Cam = mainCamera;
            mainCamera.nearClipPlane = 0.3f;
            mainCamera.farClipPlane = 1500f;

            _hud = HudView.Create();
            _hud.RestartRequested += Restart;
            _hud.PauseChanged += p => { _paused = p; if (p) Haptics.Stop(); };
            _hud.SettingsChanged += ApplySettings;
            _input.Bind(_hud.GasButton, _hud.BrakeButton, _hud.NitroButton);

            ApplySettings();
            Restart();
        }

        private void ApplySettings()
        {
            int q = GameSettings.QualityOverride;
            QualityManager.Apply(q < 0 ? QualityManager.Detect() : (QualityTier)q, mainCamera, _world.Post, _world.Sun);
            _rules.Sim.TractionControl = GameSettings.TractionControl;
            _input.CalibrateTilt();
        }

        private void Restart()
        {
            _rules.Restart();
            _rider.SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
            _curr = _prev = _rules.Sim.CaptureState();
            _accumulator = 0f;
            _slowMoTimer = 0f;
            _finishShown = false;
            _hud.HideFinish();
            _marks.Clear();
            _fx.Clear();
            _bike.ResetDirt();
            _bestBefore = GameSettings.BestTime(_level.Data.id);
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

        private void Update()
        {
            if (_input.RestartPressed()) Restart();
            if (_input.BackPressed()) _hud.SetPaused(!_paused);
            float frameDt = Mathf.Min(Time.unscaledDeltaTime, MaxFrameDelta);
            var input = _input.Read(frameDt);
            if (_paused) { _hud.Tick(_rules, _input, frameDt); return; }

            // Cámara lenta en volteretas (solo en Carrera/Freestyle, nunca online).
            float timeScale = 1f;
            if (_slowMoTimer > 0f) { _slowMoTimer -= frameDt; timeScale = 0.35f; }

            _accumulator += frameDt * timeScale;
            int steps = 0;
            while (_accumulator >= BikeSim.FixedDt && steps < 48)
            {
                _prev = _curr;
                _rules.Step(input);
                _curr = _rules.Sim.CaptureState();
                _accumulator -= BikeSim.FixedDt;
                steps++;
                HandleEvents();
            }
            float alpha = Mathf.Clamp01(_accumulator / BikeSim.FixedDt);
            var state = BikeState.Lerp(_prev, _curr, alpha);

            var sim = _rules.Sim;
            _bike.Apply(state);
            _rider.Pose(_bike.Chassis, state, frameDt * timeScale);
            foreach (var (chain, view) in _platforms) view.position = chain.Offset.ToV3();

            Vector2 vel = sim.Chassis.Velocity.ToV2();
            float rpm01 = Mathf.InverseLerp(sim.Params.idleRpm, sim.Params.revLimitRpm, sim.Engine.Rpm);
            _fx.Tick(sim.RearInfo, vel, sim.LastInput.Throttle, rpm01, QualityManager.ParticleScale);
            _marks.Track(0, sim.FrontInfo);
            _marks.Track(1, sim.RearInfo);
            _bike.UpdateDirt(sim.RearInfo, vel.magnitude, frameDt);
            _audio.SetState(sim.Engine.Rpm, sim.LastInput.Throttle, vel.magnitude);

            // Vibración continua del motor (solo con las ruedas en el suelo y en carrera).
            bool riding = _rules.State == RaceState.Racing && (sim.FrontInfo.Grounded || sim.RearInfo.Grounded);
            if (riding) Haptics.Engine(0.08f + 0.22f * sim.LastInput.Throttle * rpm01, 0.2f + 0.5f * rpm01);
            else Haptics.Engine(0f, 0f);

            // Cámara: sigue al piloto si se ha caído.
            Vector3 target = _rider.Ragdoll ? _rider.Torso.position : state.ChassisPos.ToV3();
            float height = 0f;
            if (_level.Track.GroundAt(target.x, target.y + 0.5f, out float gy, out _, out _)) height = target.y - gy - sim.RideHeight;
            _cam.Tick(target, vel, height, frameDt);

            _hud.Tick(_rules, _input, frameDt);

            if (_rules.State == RaceState.Crashed && _rules.CrashTimer > RespawnDelay) Respawn();
            if (_rules.State == RaceState.Finished && !_finishShown)
            {
                _finishShown = true;
                if (_bestBefore <= 0f || _rules.FinalTime < _bestBefore) GameSettings.SetBestTime(_level.Data.id, _rules.FinalTime);
                _hud.ShowFinish(_rules, _bestBefore);
                Haptics.Impact(0.8f, 0.6f);
            }
        }

        private void HandleEvents()
        {
            var sim = _rules.Sim;
            for (int i = 0; i < sim.EventCount; i++)
            {
                ref readonly var e = ref sim.GetEvent(i);
                switch (e.Type)
                {
                    case SimEventType.Landed:
                        float impact = e.Value;
                        _cam.AddShake(Mathf.Clamp01((impact - 4f) / 10f));
                        Haptics.Impact(Mathf.Clamp01(impact / 12f), 0.4f);
                        _audio.PlayLanding(impact);
                        _fx.LandingBurst(sim.RearInfo.Grounded ? sim.RearInfo.ContactPoint : sim.FrontInfo.ContactPoint,
                            sim.RearInfo.Grounded ? sim.RearInfo.Surface : sim.FrontInfo.Surface, impact, QualityManager.ParticleScale);
                        break;
                    case SimEventType.Crashed when !_rider.Ragdoll:
                        _cam.AddShake(0.9f);
                        Haptics.Impact(1f, 0.8f);
                        _audio.PlayCrash();
                        _rider.SetRagdoll(true, sim.Chassis.Velocity.ToV3(), sim.Chassis.AngularVelocity, sim.Chassis.Position.ToV3());
                        break;
                    case SimEventType.GearUp:
                        _audio.PlayShift();
                        Haptics.Impact(0.25f, 0.9f);
                        break;
                    case SimEventType.Trick:
                    case SimEventType.PerfectLanding:
                        _hud.PopupTrick(e);
                        if (e.Type == SimEventType.Trick && e.Trick <= TrickType.Frontflip && GameSettings.SlowMotion) _slowMoTimer = 0.6f;
                        break;
                }
            }
            for (int i = 0; i < _rules.EventCount; i++)
            {
                ref readonly var re = ref _rules.GetEvent(i);
                if (re.Type == RaceEventType.CheckpointReached) { _hud.Popup(Loc.Get("checkpoint"), new Color(0.18f, 0.89f, 1f)); Haptics.Impact(0.4f, 1f); }
            }
            _rules.ClearEvents();
        }

        private void OnApplicationPause(bool paused)
        {
            // Al salir de la app (llamada, multitarea) la carrera queda en pausa con el menú abierto.
            if (paused && _hud != null && !_paused) _hud.SetPaused(true);
            if (paused) Haptics.Stop();
        }

        private void OnDestroy() => Haptics.Stop();
    }
}
