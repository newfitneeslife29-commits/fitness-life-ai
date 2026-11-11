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
        /// <summary>Hay rivales en pista: se llena la barra de K.O.</summary>
        public bool rivals = false;
        /// <summary>Freestyle: segundos de sesión (0 = sin límite). Al acabar el tiempo, la sesión termina.</summary>
        public float timeLimit = 0f;
        /// <summary>Freestyle: puntúan los trucos; no hay meta ni estrellas por tiempo.</summary>
        public bool freestyle = false;

        public static ModeRules Career => new ModeRules { rivals = true };
        public static ModeRules Supercross => new ModeRules { checkpoints = false, rivals = true };
        public static ModeRules Freestyle => new ModeRules { checkpoints = true, checkpointPenalty = 0f, trickTimeBonus = false, timeLimit = 120f, freestyle = true };
        public static ModeRules TimeTrial => new ModeRules { checkpoints = false };
        public static ModeRules Online => new ModeRules { checkpoints = false, trickTimeBonus = true };
    }

    /// <summary>Eventos de carrera (además de los de la moto).</summary>
    public enum RaceEventType : byte
    {
        Started, CheckpointReached, Respawned, Finished, Coins, ComboChanged,
        PickupNitro, PickupRing, PickupCoin, Boost, Hit, Blocked, Explosion, PowerReady, PowerActivated, KnockoutReady, KnockedOut,
        SawHit, Spring,
    }

    public struct RaceEvent
    {
        public RaceEventType Type;
        public int Value;
        public float Time;
        /// <summary>Posición en el mundo del evento (para efectos visuales).</summary>
        public float X, Y;
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
        private readonly RaceEvent[] _events = new RaceEvent[64];
        public int EventCount { get; private set; }
        public ref readonly RaceEvent GetEvent(int i) => ref _events[i];

        // ---- Poderes ----
        public const float ShieldSeconds = 5f;
        public const float PowerBoostForce = 1300f;
        /// <summary>Barra de poder (0..1): se llena con trucos y aros. Llena = turbo con escudo.</summary>
        public float Power { get; private set; }
        /// <summary>Barra de K.O. (0..1): se llena con trucos cuando hay rivales. Llena = derribar a un rival cercano.</summary>
        public float Knockout { get; private set; }
        public float ShieldTime { get; private set; }
        public bool Shielded => ShieldTime > 0f;
        private float _boostPadTime, _hitCooldown;

        // ---- Objetos y peligros ----
        private bool[] _pickupTaken = Array.Empty<bool>();
        private float[] _pickupY = Array.Empty<float>();
        private float[] _obsGround = Array.Empty<float>();
        private bool[] _barrelExploded = Array.Empty<bool>();
        private float[] _rockY = Array.Empty<float>(), _rockVy = Array.Empty<float>();
        private bool[] _rockTriggered = Array.Empty<bool>();

        public bool PickupTaken(int i) => _pickupTaken[i];
        /// <summary>Altura en el mundo del centro del objeto.</summary>
        public float PickupWorldY(int i) => _pickupY[i];
        public float ObstacleGroundY(int i) => _obsGround[i];
        public bool BarrelExploded(int i) => _barrelExploded[i];
        public float RockY(int i) => _rockY[i];
        public bool RockTriggered(int i) => _rockTriggered[i];
        /// <summary>Centro actual de una sierra (se mueve con el reloj de la simulación).</summary>
        public Vec2 SawPosition(int i)
        {
            var o = Level.Data.obstacles[i];
            Vec2 basePos = new Vec2(o.x, _obsGround[i] + o.y);
            if (o.dx == 0f && o.dy == 0f) return basePos;
            float period = Math.Max(0.5f, o.period);
            float s = 0.5f - 0.5f * MathF.Cos((Sim.Time + o.phase) / period * SimMath.TwoPi);
            return basePos + new Vec2(o.dx, o.dy) * s;
        }

        public bool FireActive(int i)
        {
            var o = Level.Data.obstacles[i];
            float period = Math.Max(1f, o.period);
            return o.type == "firejet" && ((Sim.Time + o.phase) % period) < period * 0.4f;
        }

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
            Power = 0f; Knockout = 0f; ShieldTime = 0f; _boostPadTime = 0f; _hitCooldown = 0f;
            Sim.BoostForce = 0f; Sim.GripScale = 1f;
            ResetItems();
        }

        private void ResetItems()
        {
            var pk = Level.Data.pickups ?? Array.Empty<PickupData>();
            var ob = Level.Data.obstacles ?? Array.Empty<ObstacleData>();
            if (_pickupTaken.Length != pk.Length) { _pickupTaken = new bool[pk.Length]; _pickupY = new float[pk.Length]; }
            if (_obsGround.Length != ob.Length)
            {
                _obsGround = new float[ob.Length]; _barrelExploded = new bool[ob.Length];
                _rockY = new float[ob.Length]; _rockVy = new float[ob.Length]; _rockTriggered = new bool[ob.Length];
            }
            for (int i = 0; i < pk.Length; i++)
            {
                _pickupTaken[i] = false;
                _pickupY[i] = Ground(pk[i].x) + pk[i].y;
            }
            for (int i = 0; i < ob.Length; i++)
            {
                _obsGround[i] = Ground(ob[i].x);
                _barrelExploded[i] = false; _rockTriggered[i] = false; _rockVy[i] = 0f;
                _rockY[i] = _obsGround[i] + 14f;
            }
        }

        private float Ground(float x) => Level.Track.GroundAt(x, 10000f, out float y, out _, out _) ? y : 0f;

        /// <summary>Usa la barra de poder: turbo con escudo durante unos segundos.</summary>
        public bool ActivatePower()
        {
            if (Power < 1f || State != RaceState.Racing) return false;
            Power = 0f; ShieldTime = ShieldSeconds;
            Push(RaceEventType.PowerActivated, 0);
            return true;
        }

        /// <summary>¿Puede derribar a este rival? (barra llena y rival cerca, delante o detrás).</summary>
        public bool CanKnockout(RaceRules rival) =>
            Knockout >= 1f && State == RaceState.Racing && rival.State == RaceState.Racing && !rival.Shielded &&
            Math.Abs(rival.Sim.Chassis.Position.x - Sim.Chassis.Position.x) < 12f;

        /// <summary>K.O.: onda expansiva que derriba al rival (sin daño gráfico: el piloto sale volando y reaparece).</summary>
        public bool KnockoutRival(RaceRules rival)
        {
            if (!CanKnockout(rival)) return false;
            Knockout = 0f;
            rival.Sim.Kick(new Vec2(-4f, 8f), 6f);
            rival.Sim.ForceCrash();
            AddScore(3000);
            AddCoins(50);
            Push(RaceEventType.KnockedOut, 1, rival.Sim.Chassis.Position);
            return true;
        }

        private void AddMeters(float power, float knockout)
        {
            bool wasPower = Power >= 1f, wasKo = Knockout >= 1f;
            Power = Math.Min(1f, Power + power);
            if (Mode.rivals) Knockout = Math.Min(1f, Knockout + knockout);
            if (!wasPower && Power >= 1f) Push(RaceEventType.PowerReady, 0);
            if (!wasKo && Knockout >= 1f) Push(RaceEventType.KnockoutReady, 0);
        }

        /// <summary>Objetos, peligros y poderes en cada paso.</summary>
        private void StepItems(float dt)
        {
            Vec2 p = Sim.Chassis.Position;
            if (ShieldTime > 0f) ShieldTime -= dt;
            if (_boostPadTime > 0f) _boostPadTime -= dt;
            if (_hitCooldown > 0f) _hitCooldown -= dt;
            Sim.BoostForce = (ShieldTime > 0f ? PowerBoostForce : 0f) + (_boostPadTime > 0f ? 1800f : 0f);
            if (State != RaceState.Racing) { Sim.BoostForce = 0f; return; }

            var pk = Level.Data.pickups ?? Array.Empty<PickupData>();
            for (int i = 0; i < pk.Length; i++)
            {
                if (_pickupTaken[i]) continue;
                var d = pk[i];
                if (d.type == "boost")
                {
                    // Placa en el suelo: acelera mientras se pisa.
                    if ((Sim.RearInfo.Grounded || Sim.FrontInfo.Grounded) && p.x >= d.x && p.x <= d.x + d.length && Math.Abs(p.y - _pickupY[i]) < 2.5f)
                    {
                        if (_boostPadTime <= 0f) Push(RaceEventType.Boost, 0, new Vec2(p.x, p.y));
                        _boostPadTime = 0.6f;
                    }
                    continue;
                }
                float dx = p.x - d.x, dy = p.y - _pickupY[i];
                float r = d.type == "ring" ? 2.0f : 1.4f;
                if (dx * dx + dy * dy > r * r) continue;
                _pickupTaken[i] = true;
                var at = new Vec2(d.x, _pickupY[i]);
                switch (d.type)
                {
                    case "nitro":
                        Sim.Nitro = Math.Min(Sim.Params.nitroCapacity, Sim.Nitro + Sim.Params.nitroCapacity * 0.4f);
                        Push(RaceEventType.PickupNitro, 0, at);
                        break;
                    case "ring":
                        AddScore(500); AddCoins(10); AddMeters(0.25f, 0.2f);
                        Sim.ApplySpeedBoost(2.5f);
                        Push(RaceEventType.PickupRing, 0, at);
                        break;
                    default:
                        AddCoins(5);
                        Push(RaceEventType.PickupCoin, 5, at);
                        break;
                }
            }

            var ob = Level.Data.obstacles ?? Array.Empty<ObstacleData>();
            float grip = 1f;
            for (int i = 0; i < ob.Length; i++)
            {
                var o = ob[i];
                switch (o.type)
                {
                    case "barrel":
                    {
                        if (_barrelExploded[i]) break;
                        float dx = p.x - o.x, dy = p.y - (_obsGround[i] + 0.6f);
                        if (dx * dx + dy * dy > 1.5f * 1.5f) break;
                        _barrelExploded[i] = true;
                        Push(RaceEventType.Explosion, 0, new Vec2(o.x, _obsGround[i] + 0.6f));
                        Hit(new Vec2(-2.5f, 4.5f), 2f, 0.85f);
                        break;
                    }
                    case "firejet":
                        if (FireActive(i) && Math.Abs(p.x - o.x) < 0.9f && p.y < _obsGround[i] + 5f) Hit(new Vec2(0f, 1.5f), 0f, 0.55f);
                        break;
                    case "rock":
                    {
                        if (!_rockTriggered[i] && p.x > o.x - 16f) _rockTriggered[i] = true;
                        if (_rockTriggered[i] && _rockY[i] > _obsGround[i] + 0.7f)
                        {
                            _rockVy[i] -= BikeSim.Gravity * dt;
                            _rockY[i] = Math.Max(_obsGround[i] + 0.7f, _rockY[i] + _rockVy[i] * dt);
                        }
                        float dx = p.x - o.x, dy = p.y - _rockY[i];
                        if (_rockTriggered[i] && dx * dx + dy * dy < 1.4f * 1.4f) Hit(new Vec2(-3f, 3f), 2.5f, 0.6f);
                        break;
                    }
                    case "saw":
                    {
                        Vec2 c = SawPosition(i);
                        if (!SawTouches(c, o.size)) break;
                        if (Shielded)
                        {
                            if (_hitCooldown <= 0f) { _hitCooldown = 1f; Push(RaceEventType.Blocked, 0, c); }
                            break;
                        }
                        if (State == RaceState.Racing)
                        {
                            Push(RaceEventType.SawHit, 0, c);
                            Vec2 away = (p - c).Normalized;
                            Sim.Kick(away * 5f + new Vec2(0f, 3f), 5f);
                            Sim.ForceCrash();
                        }
                        break;
                    }
                    case "spring":
                    {
                        if (_hitCooldown > 0f) break;
                        bool onPad = (Sim.RearInfo.Grounded && Math.Abs(Sim.RearWheel.Position.x - o.x) < o.size) ||
                                     (Sim.FrontInfo.Grounded && Math.Abs(Sim.FrontWheel.Position.x - o.x) < o.size);
                        if (!onPad || Math.Abs(p.y - _obsGround[i]) > 2.5f) break;
                        float vy = Sim.Chassis.Velocity.y;
                        if (vy < o.power) Sim.Kick(new Vec2(0f, o.power - vy), 0f);
                        _hitCooldown = 0.5f;
                        Push(RaceEventType.Spring, 0, new Vec2(o.x, _obsGround[i]));
                        break;
                    }
                    case "oil":
                        if ((Sim.RearInfo.Grounded || Sim.FrontInfo.Grounded) && p.x >= o.x && p.x <= o.x + Math.Max(2f, o.period)) grip = 0.3f;
                        break;
                }
            }
            Sim.GripScale = grip;
        }

        /// <summary>¿Toca la sierra a la moto o al piloto?</summary>
        private bool SawTouches(Vec2 c, float r)
        {
            var bp = Sim.Params;
            return Near(Sim.FrontWheel.Position, c, r + bp.frontWheelRadius) ||
                   Near(Sim.RearWheel.Position, c, r + bp.rearWheelRadius) ||
                   Near(Sim.Chassis.Position, c, r + 0.35f) ||
                   Near(Sim.Chassis.LocalToWorld(bp.headLocal), c, r + bp.headRadius);
        }

        private static bool Near(Vec2 a, Vec2 b, float r) => (a - b).LengthSquared < r * r;

        /// <summary>Golpe de un peligro: empuja, frena y rompe el combo. El escudo lo bloquea.</summary>
        private void Hit(Vec2 kick, float spin, float slow)
        {
            if (_hitCooldown > 0f) return;
            _hitCooldown = 1f;
            if (Shielded) { Push(RaceEventType.Blocked, 0, Sim.Chassis.Position); return; }
            Sim.Slow(slow);
            Sim.Kick(kick, spin);
            if (Combo > 1f) { Combo = 1f; Push(RaceEventType.ComboChanged, 10); }
            Power = Math.Max(0f, Power - 0.15f);
            Push(RaceEventType.Hit, 0, Sim.Chassis.Position);
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
            StepItems(dt);

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
                        AddMeters(0.12f, 0.1f);
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
                    AddMeters(0.3f * e.Count, 0.25f * e.Count);
                    BumpCombo(0.5f * e.Count);
                    break;
                case TrickType.Wheelie:
                    AddCoins((int)(WheelieCoinsPerSecond * e.Value));
                    AddScore((int)(250 * e.Value));
                    AddMeters(0.08f * e.Value, 0.05f * e.Value);
                    BumpCombo(0.25f);
                    break;
                case TrickType.Stoppie:
                    AddCoins((int)(StoppieCoinsPerSecond * e.Value));
                    AddScore((int)(350 * e.Value));
                    AddMeters(0.1f * e.Value, 0.06f * e.Value);
                    BumpCombo(0.25f);
                    break;
                case TrickType.LongJump:
                    AddCoins(LongJumpCoins);
                    AddScore((int)(150 * e.Value));
                    AddMeters(0.08f, 0.06f);
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

        private void Push(RaceEventType type, int value, Vec2 at = default)
        {
            if (EventCount < _events.Length) _events[EventCount++] = new RaceEvent { Type = type, Value = value, Time = RaceTime, X = at.x, Y = at.y };
        }

        /// <summary>Lo llama quien consume los eventos (HUD, audio...) tras leerlos. Limpia también los de la moto.</summary>
        public void ClearEvents()
        {
            EventCount = 0;
            Sim.ClearEvents();
        }
    }
}
