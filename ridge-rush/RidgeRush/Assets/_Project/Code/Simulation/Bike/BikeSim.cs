using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Simulación completa de la moto en el plano de juego, con paso fijo de 240 Hz.
    /// Cuerpos: chasis (moto + piloto) y dos ruedas. Uniones: dos suspensiones prismáticas.
    /// Contactos: ruedas y círculos de colisión del chasis/piloto contra la pista, con fricción por superficie.
    /// Es determinista: las mismas entradas desde el mismo estado dan el mismo resultado en la misma plataforma.
    /// No reserva memoria en <see cref="Step"/>.
    /// </summary>
    public sealed class BikeSim
    {
        public const float FixedDt = 1f / 240f;
        public const float Gravity = 9.81f;

        private const int VelocityIterations = 10;
        private const float Baumgarte = 0.2f;
        private const float LinearSlop = 0.004f;
        private const float AirDensity = 1.2f;
        private const int MaxEvents = 64;

        public readonly BikeParams Params;
        public readonly Track Track;
        public readonly Body2D Chassis;
        public readonly Body2D FrontWheel;
        public readonly Body2D RearWheel;
        public readonly Suspension FrontSuspension;
        public readonly Suspension RearSuspension;
        public readonly Engine Engine;

        public float Time { get; private set; }
        public bool Crashed { get; private set; }
        public float Nitro { get; set; }
        public bool NitroActive { get; private set; }
        public BikeInput LastInput { get; private set; }

        /// <summary>Asistencia de control de tracción (Ajustes → Asistencias). Reduce el par si la rueda trasera patina.</summary>
        public bool TractionControl = true;

        /// <summary>Fuerza externa de viento sobre el chasis (N). La fijan las reglas del nivel.</summary>
        public Vec2 Wind;

        public WheelInfo FrontInfo;
        public WheelInfo RearInfo;

        /// <summary>Normal media del suelo bajo las ruedas (o la última conocida).</summary>
        public Vec2 GroundNormal { get; private set; } = Vec2.Up;

        // ---- Contactos ----
        private struct Contact
        {
            public Body2D Body;
            public int Kind;           // 0 rueda delantera, 1 rueda trasera, 2 chasis, 3 piloto (casco/torso)
            public Vec2 R;             // del centro del cuerpo al punto de contacto
            public Vec2 Normal, Tangent;
            public float NormalMass, TangentMass, Bias, Mu;
            public float Pn, Pt;
            public Vec2 SurfaceVelocity;
            public SurfaceType Surface;
            public int Chain;
            public float ApproachSpeed; // velocidad de acercamiento antes de resolver (impactos)
        }

        private readonly Contact[] _contacts = new Contact[24];
        private int _contactCount;
        private readonly TrackHit[] _hits = new TrackHit[3];
        private bool _frontSlidingPrev, _rearSlidingPrev;
        private float _frontLoadPrev, _rearLoadPrev;

        // ---- Eventos ----
        private readonly SimEvent[] _events = new SimEvent[MaxEvents];
        public int EventCount { get; private set; }
        public ref readonly SimEvent GetEvent(int i) => ref _events[i];
        public void ClearEvents() => EventCount = 0;

        private readonly TrickTracker _tricks;

        public BikeSim(BikeParams p, Track track)
        {
            Params = p ?? throw new ArgumentNullException(nameof(p));
            Track = track ?? throw new ArgumentNullException(nameof(track));
            Chassis = new Body2D(p.chassisMass, p.chassisInertia);
            FrontWheel = new Body2D(p.wheelMass, 0.6f * p.wheelMass * p.frontWheelRadius * p.frontWheelRadius);
            RearWheel = new Body2D(p.wheelMass, 0.6f * p.wheelMass * p.rearWheelRadius * p.rearWheelRadius);
            FrontSuspension = new Suspension(Chassis, FrontWheel, p.frontAxleExtended, p.forkAngleDeg, p.frontTravel,
                p.frontSpring, p.springProgression, p.frontCompressionDamping, p.frontReboundDamping);
            RearSuspension = new Suspension(Chassis, RearWheel, p.rearAxleExtended, p.rearAxisAngleDeg, p.rearTravel,
                p.rearSpring, p.springProgression, p.rearCompressionDamping, p.rearReboundDamping);
            Engine = new Engine(p);
            _tricks = new TrickTracker(this);
            Nitro = 0f;
        }

        /// <summary>Distancia vertical del centro de masas al suelo con la moto parada (aprox.).</summary>
        public float RideHeight => -Math.Min(Params.frontAxleExtended.y, Params.rearAxleExtended.y)
                                   + Math.Max(Params.frontWheelRadius, Params.rearWheelRadius) - 0.08f;

        /// <summary>Coloca la moto parada en (x, suelo) alineada con la pendiente.</summary>
        public void PlaceOnGround(float x, float searchFromY = 1000f)
        {
            if (!Track.GroundAt(x, searchFromY, out float y, out Vec2 normal, out _)) y = 0f;
            float angle = MathF.Atan2(-normal.x, normal.y);
            Reset(new Vec2(x, y) + normal * RideHeight, angle);
        }

        /// <summary>Reinicia la moto en una posición. No reinicia el tiempo ni la pista (lo hace el nivel).</summary>
        public void Reset(Vec2 chassisPos, float angle, Vec2 velocity = default)
        {
            Chassis.Reset(chassisPos, angle);
            Chassis.Velocity = velocity;
            FrontWheel.Reset(Vec2.Zero, 0f);
            RearWheel.Reset(Vec2.Zero, 0f);
            FrontSuspension.SnapWheel(Params.frontTravel * 0.75f);
            RearSuspension.SnapWheel(Params.rearTravel * 0.75f);
            FrontWheel.Velocity = velocity; RearWheel.Velocity = velocity;
            float r = Params.rearWheelRadius;
            float omega = velocity.Length > 0f ? -Vec2.Dot(velocity, Chassis.LocalDirToWorld(Vec2.Right)) / r : 0f;
            RearWheel.AngularVelocity = omega;
            FrontWheel.AngularVelocity = omega * r / Params.frontWheelRadius;
            Engine.Reset();
            Crashed = false;
            NitroActive = false;
            FrontInfo = default; RearInfo = default;
            _frontSlidingPrev = _rearSlidingPrev = false;
            _frontLoadPrev = _rearLoadPrev = 0f;
            _tricks.Reset();
            EventCount = 0;
        }

        /// <summary>Pone el reloj de la simulación (al reiniciar un nivel).</summary>
        public void SetTime(float t) => Time = t;

        /// <summary>Avanza la simulación un paso de <see cref="FixedDt"/>.</summary>
        public void Step(BikeInput input)
        {
            const float dt = FixedDt;
            input = input.Sanitized();
            if (Crashed) input = new BikeInput { Brake = 0.2f };
            LastInput = input;
            Time += dt;
            Track.Step(Time, dt, Gravity);

            Chassis.ClearForces(); FrontWheel.ClearForces(); RearWheel.ClearForces();

            // ---- Fuerzas ----
            var g = new Vec2(0f, -Gravity);
            Chassis.Force += g * Chassis.Mass;
            FrontWheel.Force += g * FrontWheel.Mass;
            RearWheel.Force += g * RearWheel.Mass;

            FrontSuspension.ApplySpringForces();
            RearSuspension.ApplySpringForces();

            ApplyDrivetrain(input, dt);
            ApplyLean(input);
            ApplyAero();

            // ---- Integrar velocidades ----
            Integrate(Chassis, dt); Integrate(FrontWheel, dt); Integrate(RearWheel, dt);

            // ---- Contactos ----
            CollectContacts(dt);

            // ---- Solucionador de impulsos ----
            FrontSuspension.Prepare(dt, Baumgarte, LinearSlop);
            RearSuspension.Prepare(dt, Baumgarte, LinearSlop);
            for (int it = 0; it < VelocityIterations; it++)
            {
                FrontSuspension.Solve();
                RearSuspension.Solve();
                SolveContacts();
            }

            // ---- Integrar posiciones ----
            IntegratePosition(Chassis, dt); IntegratePosition(FrontWheel, dt); IntegratePosition(RearWheel, dt);
            FrontSuspension.UpdateExtension();
            RearSuspension.UpdateExtension();

            // ---- Estado y eventos ----
            UpdateWheelInfo(dt);
            CheckCrash();
            _tricks.Update(dt);
        }

        // ------------------------------------------------------------------
        // Fuerzas
        // ------------------------------------------------------------------

        private void ApplyDrivetrain(BikeInput input, float dt)
        {
            var p = Params;
            Vec2 forward = Chassis.LocalDirToWorld(Vec2.Right);
            float forwardSpeed = Vec2.Dot(Chassis.Velocity, forward);

            // Giro de la rueda trasera relativo al chasis (hacia delante = horario = negativo).
            float rearRel = RearWheel.AngularVelocity - Chassis.AngularVelocity;

            NitroActive = input.Nitro && Nitro > 0f && !Crashed;
            if (NitroActive)
            {
                Nitro = Math.Max(0f, Nitro - dt);
                Chassis.Force += forward * p.nitroForce;
            }

            float wheelTorque = Engine.Update(-rearRel, Math.Max(0f, forwardSpeed) / p.rearWheelRadius, input.Throttle, NitroActive ? p.nitroTorqueMultiplier : 1f, dt);
            if (TractionControl && RearInfo.Grounded && RearInfo.SlipSpeed > 1.5f && wheelTorque > 0f)
                wheelTorque *= SimMath.Clamp(1.5f / RearInfo.SlipSpeed, 0.35f, 1f);
            if (Engine.LastShift != 0) PushEvent(new SimEvent { Type = Engine.LastShift > 0 ? SimEventType.GearUp : SimEventType.GearDown, Count = Engine.Gear });

            // Reversa: freno mantenido, sin gas, casi parado.
            if (input.Throttle < 0.05f && input.Brake > 0.5f && forwardSpeed < 0.4f && forwardSpeed > -p.reverseMaxSpeed)
            {
                wheelTorque = -p.reverseWheelTorque * input.Brake;
                input.Brake = 0f;
            }

            // Par motor: la rueda gira hacia delante (negativo) y el chasis recibe la reacción (levanta el morro).
            RearWheel.Torque -= wheelTorque;
            Chassis.Torque += wheelTorque;

            // Frenos: par que se opone al giro relativo, limitado a lo necesario para bloquear la rueda.
            if (input.Brake > 0f)
            {
                ApplyBrake(FrontWheel, input.Brake * p.frontBrakeTorque * (p.frontBrakeBias / 0.6f), dt);
                ApplyBrake(RearWheel, input.Brake * p.rearBrakeTorque * ((1f - p.frontBrakeBias) / 0.4f), dt);
            }

            // Resistencia a la rodadura (arena y barro frenan).
            ApplyRolling(FrontWheel, FrontInfo, p.frontWheelRadius, _frontLoadPrev, dt);
            ApplyRolling(RearWheel, RearInfo, p.rearWheelRadius, _rearLoadPrev, dt);
        }

        private void ApplyBrake(Body2D wheel, float maxTorque, float dt)
        {
            float rel = wheel.AngularVelocity - Chassis.AngularVelocity;
            // Par que detendría el giro relativo en este paso.
            float stop = rel / (dt * (wheel.InvInertia + Chassis.InvInertia));
            float torque = -SimMath.Clamp(stop, -maxTorque, maxTorque);
            wheel.Torque += torque;
            Chassis.Torque -= torque;
        }

        private static void ApplyRolling(Body2D wheel, in WheelInfo info, float radius, float load, float dt)
        {
            if (!info.Grounded) return;
            float rr = Surfaces.Get(info.Surface).RollingResistance;
            float maxT = Math.Abs(wheel.AngularVelocity) * wheel.Inertia / dt;
            float t = Math.Min(rr * load * radius, maxT);
            wheel.Torque -= Math.Sign(wheel.AngularVelocity) * t;
        }

        private void ApplyLean(BikeInput input)
        {
            if (Crashed || Math.Abs(input.Lean) < 0.02f) return;
            var p = Params;
            bool airborne = !FrontInfo.Grounded && !RearInfo.Grounded;
            float maxTorque = airborne ? p.leanTorqueAir : p.leanTorqueGround;
            // Inclinar adelante (Lean > 0) = girar en sentido horario (velocidad angular negativa).
            float targetRate = -input.Lean * p.leanMaxRate;
            float torque = SimMath.Clamp(p.leanRateGain * (targetRate - Chassis.AngularVelocity), -maxTorque, maxTorque);
            Chassis.Torque += torque * Math.Abs(input.Lean);
        }

        private void ApplyAero()
        {
            Vec2 v = Chassis.Velocity;
            float speed = v.Length;
            if (speed > 0.01f) Chassis.Force += v * (-0.5f * AirDensity * Params.dragArea * speed);
            if (Wind.LengthSquared > 0f)
            {
                bool airborne = !FrontInfo.Grounded && !RearInfo.Grounded;
                Chassis.Force += Wind * (airborne ? 1f : 0.35f);
            }
        }

        private static void Integrate(Body2D b, float dt)
        {
            b.Velocity += b.Force * (b.InvMass * dt);
            b.AngularVelocity += b.Torque * b.InvInertia * dt;
        }

        private static void IntegratePosition(Body2D b, float dt)
        {
            b.Position += b.Velocity * dt;
            b.Angle += b.AngularVelocity * dt;
        }

        // ------------------------------------------------------------------
        // Contactos
        // ------------------------------------------------------------------

        private void CollectContacts(float dt)
        {
            _contactCount = 0;
            var p = Params;
            AddCircle(FrontWheel, FrontWheel.Position, p.frontWheelRadius, 0, dt);
            AddCircle(RearWheel, RearWheel.Position, p.rearWheelRadius, 1, dt);
            AddCircle(Chassis, Chassis.LocalToWorld(p.skidPlateLocal), p.skidPlateRadius, 2, dt);
            AddCircle(Chassis, Chassis.LocalToWorld(p.rearFenderLocal), p.fenderRadius, 2, dt);
            AddCircle(Chassis, Chassis.LocalToWorld(p.frontFenderLocal), p.fenderRadius, 2, dt);
            if (!Crashed)
            {
                AddCircle(Chassis, Chassis.LocalToWorld(p.headLocal + LeanOffset()), p.headRadius, 3, dt);
                AddCircle(Chassis, Chassis.LocalToWorld(p.torsoLocal + LeanOffset() * 0.6f), p.torsoRadius, 3, dt);
            }
        }

        /// <summary>Desplazamiento del cuerpo del piloto al inclinarse (también lo usa el render para el IK).</summary>
        public Vec2 LeanOffset() => new Vec2(0.22f * LastInput.Lean, -0.06f * Math.Abs(LastInput.Lean));

        private void AddCircle(Body2D body, Vec2 center, float radius, int kind, float dt)
        {
            int n = Track.QueryCircle(center, radius, _hits);
            for (int i = 0; i < n && _contactCount < _contacts.Length; i++)
            {
                ref readonly var h = ref _hits[i];
                Vec2 point = center - h.Normal * radius;
                Vec2 r = point - body.Position;
                Vec2 t = h.Normal.PerpLeft * -1f; // tangente hacia delante en suelo plano
                float rn = Vec2.Cross(r, h.Normal), rt = Vec2.Cross(r, t);
                var props = Surfaces.Get(h.Surface);

                float mu;
                if (kind <= 1)
                {
                    bool slidingPrev = kind == 0 ? _frontSlidingPrev : _rearSlidingPrev;
                    mu = props.Grip * Params.tireGrip * (slidingPrev ? props.SlideFactor : 1f);
                }
                else mu = props.BodyFriction;

                Vec2 rel = body.VelocityAt(point) - h.SurfaceVelocity;
                _contacts[_contactCount++] = new Contact
                {
                    Body = body, Kind = kind, R = r, Normal = h.Normal, Tangent = t,
                    NormalMass = 1f / (body.InvMass + body.InvInertia * rn * rn),
                    TangentMass = 1f / (body.InvMass + body.InvInertia * rt * rt),
                    Bias = Baumgarte / dt * Math.Max(h.Depth - LinearSlop, 0f),
                    Mu = mu, SurfaceVelocity = h.SurfaceVelocity, Surface = h.Surface, Chain = h.Chain,
                    ApproachSpeed = -Vec2.Dot(rel, h.Normal),
                };
                Track.NotifyContact(h.Chain, Time);
            }
        }

        private void SolveContacts()
        {
            for (int i = 0; i < _contactCount; i++)
            {
                ref var c = ref _contacts[i];
                var b = c.Body;
                Vec2 point = b.Position + c.R;

                // Normal (no penetración).
                Vec2 rel = b.VelocityAt(point) - c.SurfaceVelocity;
                float vn = Vec2.Dot(rel, c.Normal);
                float dPn = -c.NormalMass * (vn - c.Bias);
                float newPn = Math.Max(c.Pn + dPn, 0f);
                dPn = newPn - c.Pn; c.Pn = newPn;
                b.ApplyImpulse(c.Normal * dPn, point);

                // Fricción (límite de Coulomb con el agarre de la superficie).
                rel = b.VelocityAt(point) - c.SurfaceVelocity;
                float vt = Vec2.Dot(rel, c.Tangent);
                float dPt = -c.TangentMass * vt;
                float maxPt = c.Mu * c.Pn;
                float newPt = SimMath.Clamp(c.Pt + dPt, -maxPt, maxPt);
                dPt = newPt - c.Pt; c.Pt = newPt;
                b.ApplyImpulse(c.Tangent * dPt, point);
            }
        }

        // ------------------------------------------------------------------
        // Estado
        // ------------------------------------------------------------------

        private void UpdateWheelInfo(float dt)
        {
            var oldFront = FrontInfo; var oldRear = RearInfo;
            FrontInfo = BuildWheelInfo(0, FrontWheel, dt, out _frontSlidingPrev, out _frontLoadPrev, out float frontImpact);
            RearInfo = BuildWheelInfo(1, RearWheel, dt, out _rearSlidingPrev, out _rearLoadPrev, out float rearImpact);

            if (FrontInfo.Grounded || RearInfo.Grounded)
            {
                Vec2 n = Vec2.Zero;
                if (FrontInfo.Grounded) n += FrontInfo.ContactNormal;
                if (RearInfo.Grounded) n += RearInfo.ContactNormal;
                GroundNormal = n.Normalized;
            }

            if (FrontInfo.Grounded && (!oldFront.Grounded || oldFront.Surface != FrontInfo.Surface))
                PushEvent(new SimEvent { Type = SimEventType.SurfaceChanged, Surface = FrontInfo.Surface, Count = 0 });
            if (RearInfo.Grounded && (!oldRear.Grounded || oldRear.Surface != RearInfo.Surface))
                PushEvent(new SimEvent { Type = SimEventType.SurfaceChanged, Surface = RearInfo.Surface, Count = 1 });

            float impact = 0f;
            if (FrontInfo.Grounded && !oldFront.Grounded) impact = Math.Max(impact, frontImpact);
            if (RearInfo.Grounded && !oldRear.Grounded) impact = Math.Max(impact, rearImpact);
            if (impact > 0f) _tricks.NotifyTouchdown(impact);
        }

        private WheelInfo BuildWheelInfo(int kind, Body2D wheel, float dt, out bool sliding, out float load, out float impact)
        {
            var info = new WheelInfo();
            float pn = 0f, pt = 0f, maxPt = 0f; Vec2 normal = Vec2.Zero; impact = 0f;
            for (int i = 0; i < _contactCount; i++)
            {
                ref readonly var c = ref _contacts[i];
                if (c.Kind != kind) continue;
                if (c.Pn > pn) { info.Surface = c.Surface; info.ContactPoint = wheel.Position + c.R; }
                pn += c.Pn; pt += Math.Abs(c.Pt); maxPt += c.Mu * c.Pn;
                normal += c.Normal * c.Pn;
                impact = Math.Max(impact, c.ApproachSpeed);
                info.Grounded = true;
            }
            load = pn / dt;
            sliding = info.Grounded && pn > 0f && pt >= maxPt * 0.98f;
            if (info.Grounded)
            {
                info.ContactNormal = normal.LengthSquared > 0f ? normal.Normalized : Vec2.Up;
                Vec2 t = info.ContactNormal.PerpLeft * -1f;
                float radius = kind == 0 ? Params.frontWheelRadius : Params.rearWheelRadius;
                Vec2 contactVel = wheel.VelocityAt(wheel.Position - info.ContactNormal * radius);
                info.SlipSpeed = Math.Abs(Vec2.Dot(contactVel, t));
            }
            info.Sliding = sliding;
            info.Load = load;
            return info;
        }

        private void CheckCrash()
        {
            if (Crashed) return;
            for (int i = 0; i < _contactCount; i++)
            {
                ref readonly var c = ref _contacts[i];
                if (c.Kind != 3) continue;
                Crashed = true;
                _tricks.Reset();
                PushEvent(new SimEvent { Type = SimEventType.Crashed, Value = Math.Max(c.ApproachSpeed, Chassis.Velocity.Length) });
                return;
            }
        }

        /// <summary>Provoca la caída desde fuera (p. ej. al caer en lava o agua profunda).</summary>
        public void ForceCrash()
        {
            if (Crashed) return;
            Crashed = true;
            _tricks.Reset();
            PushEvent(new SimEvent { Type = SimEventType.Crashed, Value = Chassis.Velocity.Length });
        }

        /// <summary>Impulso de velocidad hacia delante a lo largo del suelo (aterrizaje perfecto).</summary>
        internal void ApplySpeedBoost(float amount)
        {
            Vec2 forward = GroundNormal.PerpLeft * -1f;
            float sign = Vec2.Dot(Chassis.Velocity, forward) >= 0f ? 1f : -1f;
            Vec2 dv = forward * (amount * sign);
            Chassis.Velocity += dv; FrontWheel.Velocity += dv; RearWheel.Velocity += dv;
            FrontWheel.AngularVelocity -= sign * amount / Params.frontWheelRadius;
            RearWheel.AngularVelocity -= sign * amount / Params.rearWheelRadius;
        }

        internal void PushEvent(SimEvent e)
        {
            e.Time = Time;
            if (EventCount < MaxEvents) _events[EventCount++] = e;
            else
            {
                // Lleno (nadie los está leyendo): descartar el más antiguo.
                Array.Copy(_events, 1, _events, 0, MaxEvents - 1);
                _events[MaxEvents - 1] = e;
            }
        }

        /// <summary>Velocidad hacia delante (m/s) en el sentido de la moto.</summary>
        public float ForwardSpeed => Vec2.Dot(Chassis.Velocity, Chassis.LocalDirToWorld(Vec2.Right));

        public BikeState CaptureState() => new BikeState
        {
            ChassisPos = Chassis.Position,
            ChassisAngle = Chassis.Angle,
            FrontWheelPos = FrontWheel.Position,
            FrontWheelAngle = FrontWheel.Angle,
            RearWheelPos = RearWheel.Position,
            RearWheelAngle = RearWheel.Angle,
            FrontCompression = FrontSuspension.Compression01,
            RearCompression = RearSuspension.Compression01,
            Rpm = Engine.Rpm,
            Gear = (byte)Engine.Gear,
            Throttle = LastInput.Throttle,
            Lean = LastInput.Lean,
            FrontGrounded = FrontInfo.Grounded,
            RearGrounded = RearInfo.Grounded,
            Crashed = Crashed,
            NitroActive = NitroActive,
        };
    }
}
