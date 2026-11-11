using System;

namespace RidgeRush.Simulation
{
    public enum RaceState : byte
    {
        /// <summary>Esperando al primer toque de gas (el reloj no corre).</summary>
        Ready,
        Racing,
        /// <summary>El piloto se ha caído; la moto sigue simulándose hasta reaparecer.</summary>
        Crashed,
        Finished,
    }

    /// <summary>Reglas que dependen del modo de juego.</summary>
    [Serializable]
    public sealed class ModeRules
    {
        public bool checkpoints = true;
        public float checkpointPenalty = 3f;
        public bool trickTimeBonus = true;
        public bool nitroEnabled = true;
        /// <summary>Freestyle: segundos de sesión (0 = sin límite). Al acabar el tiempo, la sesión termina.</summary>
        public float timeLimit = 0f;
        /// <summary>Freestyle: puntúan los trucos; no hay meta ni estrellas por tiempo.</summary>
        public bool freestyle = false;

        public static ModeRules Career => new ModeRules();
        public static ModeRules Freestyle => new ModeRules { checkpoints = true, checkpointPenalty = 0f, trickTimeBonus = false, timeLimit = 120f, freestyle = true };
        public static ModeRules TimeTrial => new ModeRules { checkpoints = false };
        public static ModeRules Online => new ModeRules { checkpoints = false, trickTimeBonus = true };
    }

    /// <summary>Eventos de carrera (además de los de la moto).</summary>
    public enum RaceEventType : byte { Started, CheckpointReached, Respawned, Finished, Coins, ComboChanged }

    public struct RaceEvent
    {
        public RaceEventType Type;
        public int Value;
        public float Time;
    }

    /// <summary>
    /// Una carrera en un nivel: reloj, checkpoints, meta, estrellas, trucos → tiempo extra y monedas,
    /// zonas de peligro y viento. No depende de Unity: la misma lógica corre en el servidor.
    /// </summary>
    public sealed class RaceRules
    {
        // Recompensas (GDD §4.3).
        public const float FlipTimeBonus = 1.5f;
        public const int FlipCoins = 25;
        public const int WheelieCoinsPerSecond = 10;
        public const int StoppieCoinsPerSecond = 12;
        public const int LongJumpCoins = 15;
        public const int PerfectLandingCoins = 10;
        public const float NitroPerTrick = 0.75f;
        public const float ComboWindow = 2f;
        public const float MaxCombo = 3f;

        public readonly BuiltLevel Level;
        public readonly BikeSim Sim;
        public readonly ModeRules Mode;

        public RaceState State { get; private set; }
        public float RaceTime { get; private set; }
        public float BonusTime { get; private set; }
        public float PenaltyTime { get; private set; }
        public float FinalTime => Math.Max(0f, RaceTime - BonusTime + PenaltyTime);
        public int Coins { get; private set; }
        public float Combo { get; private set; } = 1f;
        public int LastCheckpoint { get; private set; } = -1;
        public int Crashes { get; private set; }
        /// <summary>Puntos de trucos (Freestyle, y como dato en el resto de modos).</summary>
        public int Score { get; private set; }
        /// <summary>Tiempo que queda en Freestyle.</summary>
        public float TimeLeft => Mode.timeLimit > 0f ? Math.Max(0f, Mode.timeLimit - RaceTime) : 0f;
        public int Stars { get; private set; }
        public float CrashTimer { get; private set; }

        /// <summary>Progreso 0..1 hasta la meta.</summary>
        public float Progress => SimMath.Clamp01((Sim.Chassis.Position.x - Level.Data.startX) / (Level.FinishX - Level.Data.startX));

        private long _simEventsSeen;
        private float _timeSinceTrickGrounded;
        private readonly RaceEvent[] _events = new RaceEvent[32];
        public int EventCount { get; private set; }
        public ref readonly RaceEvent GetEvent(int i) => ref _events[i];

        public RaceRules(BuiltLevel level, BikeParams bike, ModeRules mode = null)
        {
            Level = level ?? throw new ArgumentNullException(nameof(level));
            Mode = mode ?? ModeRules.Career;
            Sim = new BikeSim(bike, level.Track);
            Restart();
        }

        /// <summary>Reinicio instantáneo del nivel (no recarga nada).</summary>
        public void Restart()
        {
            Level.Track.ResetMotion();
            Sim.SetTime(0f);
            Sim.PlaceOnGround(Level.Data.startX);
            Sim.Nitro = Mode.nitroEnabled ? Sim.Params.nitroCapacity * 0.34f : 0f;
            State = RaceState.Ready;
            RaceTime = BonusTime = PenaltyTime = 0f;
            Coins = 0; Combo = 1f; LastCheckpoint = -1; Crashes = 0; Stars = 0; CrashTimer = 0f; Score = 0;
            _simEventsSeen = 0; _timeSinceTrickGrounded = 0f;
            EventCount = 0;
        }

        /// <summary>Vuelve al último checkpoint (o al inicio en modos sin checkpoints).</summary>
        public void Respawn()
        {
            if (!Mode.checkpoints || LastCheckpoint < 0) { Restart(); return; }
            float x = Level.Data.checkpoints[LastCheckpoint];
            Sim.PlaceOnGround(x);
            PenaltyTime += Mode.checkpointPenalty;
            Combo = 1f;
            State = RaceState.Racing;
            CrashTimer = 0f;
            _simEventsSeen = Sim.TotalEvents;
            Push(RaceEventType.Respawned, LastCheckpoint);
        }

        /// <summary>Avanza un paso fijo (<see cref="BikeSim.FixedDt"/>).</summary>
        public void Step(BikeInput input)
        {
            const float dt = BikeSim.FixedDt;
            if (State == RaceState.Ready)
            {
                if (input.Throttle <= 0.05f && input.Brake <= 0.05f) { Sim.Step(BikeInput.Neutral); return; }
                State = RaceState.Racing;
                Push(RaceEventType.Started, 0);
            }
            if (State == RaceState.Finished) input = new BikeInput { Brake = 1f };
            if (!Mode.nitroEnabled) input.Nitro = false;

            Sim.Wind = WindAt(Sim.Chassis.Position.x);
            Sim.Step(input);

            if (State == RaceState.Racing || State == RaceState.Crashed) RaceTime += dt;

            ProcessSimEvents();
            CheckHazards();

            if (State == RaceState.Crashed) CrashTimer += dt;

            if (State == RaceState.Racing)
            {
                // Checkpoints.
                var cps = Level.Data.checkpoints;
                while (LastCheckpoint + 1 < cps.Length && Sim.Chassis.Position.x >= cps[LastCheckpoint + 1])
                {
                    LastCheckpoint++;
                    Push(RaceEventType.CheckpointReached, LastCheckpoint);
                }
                // Combo: se pierde tras 2 s en el suelo sin trucos.
                if (Sim.FrontInfo.Grounded && Sim.RearInfo.Grounded)
                {
                    _timeSinceTrickGrounded += dt;
                    if (_timeSinceTrickGrounded > ComboWindow && Combo > 1f) { Combo = 1f; Push(RaceEventType.ComboChanged, 10); }
                }
                // Freestyle: termina al acabar el tiempo (o al llegar al final del parque).
                if (Mode.timeLimit > 0f && RaceTime >= Mode.timeLimit)
                {
                    State = RaceState.Finished;
                    Stars = Mode.freestyle ? FreestyleStars(Score) : StarsFor(FinalTime);
                    Push(RaceEventType.Finished, Stars);
                }
                // Meta.
                else if (Sim.Chassis.Position.x >= Level.FinishX)
                {
                    State = RaceState.Finished;
                    Stars = Mode.freestyle ? FreestyleStars(Score) : StarsFor(FinalTime);
                    Push(RaceEventType.Finished, Stars);
                }
            }
        }

        /// <summary>Estrellas de Freestyle por puntos.</summary>
        public static int FreestyleStars(int score) => score >= 60000 ? 3 : score >= 30000 ? 2 : 1;

        public int StarsFor(float time)
        {
            if (time <= Level.Data.stars.gold) return 3;
            if (time <= Level.Data.stars.silver) return 2;
            return 1;
        }

        private Vec2 WindAt(float x)
        {
            var winds = Level.Data.winds;
            if (winds == null) return Vec2.Zero;
            for (int i = 0; i < winds.Length; i++)
                if (x >= winds[i].x0 && x <= winds[i].x1) return new Vec2(winds[i].force, 0f);
            return Vec2.Zero;
        }

        private void CheckHazards()
        {
            if (State != RaceState.Racing) return;
            Vec2 p = Sim.Chassis.Position;
            if (p.y < Level.KillY) { Sim.ForceCrash(); ProcessSimEvents(); return; }
            var hz = Level.Hazards;
            for (int i = 0; i < hz.Length; i++)
            {
                if (p.x >= hz[i].x0 && p.x <= hz[i].x1 && p.y <= hz[i].yTop)
                {
                    Sim.ForceCrash();
                    ProcessSimEvents();
                    return;
                }
            }
        }

        private void ProcessSimEvents()
        {
            // Eventos nuevos = los últimos (TotalEvents - vistos) de la lista (aunque se haya llenado).
            long unseen = Sim.TotalEvents - _simEventsSeen;
            int start = (int)Math.Max(0, Sim.EventCount - unseen);
            _simEventsSeen = Sim.TotalEvents;
            for (int idx = start; idx < Sim.EventCount; idx++)
            {
                ref readonly var e = ref Sim.GetEvent(idx);
                switch (e.Type)
                {
                    case SimEventType.Crashed:
                        if (State == RaceState.Racing) { State = RaceState.Crashed; Crashes++; CrashTimer = 0f; Combo = 1f; }
                        break;
                    case SimEventType.Trick:
                        OnTrick(e);
                        break;
                    case SimEventType.PerfectLanding:
                        AddCoins(PerfectLandingCoins);
                        AddScore(200);
                        BumpCombo(0.2f);
                        break;
                }
            }
        }

        private void OnTrick(in SimEvent e)
        {
            if (State != RaceState.Racing) return;
            switch (e.Trick)
            {
                case TrickType.Backflip:
                case TrickType.Frontflip:
                    if (Mode.trickTimeBonus) BonusTime += FlipTimeBonus * e.Count;
                    AddCoins(FlipCoins * e.Count);
                    AddScore(1000 * e.Count * e.Count); // dobles y triples valen mucho más
                    BumpCombo(0.5f * e.Count);
                    break;
                case TrickType.Wheelie:
                    AddCoins((int)(WheelieCoinsPerSecond * e.Value));
                    AddScore((int)(250 * e.Value));
                    BumpCombo(0.25f);
                    break;
                case TrickType.Stoppie:
                    AddCoins((int)(StoppieCoinsPerSecond * e.Value));
                    AddScore((int)(350 * e.Value));
                    BumpCombo(0.25f);
                    break;
                case TrickType.LongJump:
                    AddCoins(LongJumpCoins);
                    AddScore((int)(150 * e.Value));
                    break;
            }
            if (Mode.nitroEnabled) Sim.Nitro = Math.Min(Sim.Params.nitroCapacity, Sim.Nitro + NitroPerTrick);
        }

        private void AddCoins(int baseCoins)
        {
            int c = (int)MathF.Round(baseCoins * Combo);
            if (c <= 0) return;
            Coins += c;
            Push(RaceEventType.Coins, c);
        }

        private void AddScore(int points) => Score += (int)MathF.Round(points * Combo);

        private void BumpCombo(float amount)
        {
            _timeSinceTrickGrounded = 0f;
            float old = Combo;
            Combo = Math.Min(MaxCombo, Combo + amount);
            if (Combo != old) Push(RaceEventType.ComboChanged, (int)MathF.Round(Combo * 10f));
        }

        private void Push(RaceEventType type, int value)
        {
            if (EventCount < _events.Length) _events[EventCount++] = new RaceEvent { Type = type, Value = value, Time = RaceTime };
        }

        /// <summary>Lo llama quien consume los eventos (HUD, audio...) tras leerlos. Limpia también los de la moto.</summary>
        public void ClearEvents()
        {
            EventCount = 0;
            Sim.ClearEvents();
        }
    }
}
