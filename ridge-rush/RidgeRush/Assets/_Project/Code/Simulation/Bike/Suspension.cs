using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Suspensión de una rueda: unión prismática entre el chasis y la rueda.
    /// - Perpendicular al eje: rígida (restricción de velocidad, impulsos secuenciales).
    /// - A lo largo del eje: muelle progresivo + amortiguador (fuerza explícita, estable a 240 Hz)
    ///   y topes de recorrido (restricciones de desigualdad).
    /// La rueda gira libre alrededor de su eje.
    /// </summary>
    public sealed class Suspension
    {
        private readonly Body2D _chassis;
        private readonly Body2D _wheel;
        private readonly Vec2 _localMount;  // punto del chasis con la suspensión totalmente comprimida
        private readonly Vec2 _localAxis;   // dirección (unitaria) del montaje hacia la rueda
        private readonly float _travel;
        private readonly float _spring;
        private readonly float _progression;
        private readonly float _compressionDamping;
        private readonly float _reboundDamping;

        /// <summary>Extensión actual: 0 = comprimida a tope, <see cref="Travel"/> = extendida.</summary>
        public float Extension { get; private set; }
        public float Travel => _travel;
        public float Compression01 => 1f - SimMath.Clamp01(Extension / _travel);

        // Datos de la restricción para el paso actual.
        private Vec2 _n, _u;
        private float _sN, _sU, _massN, _massU, _biasN, _biasLimit;
        private int _limitState; // 0 libre, 1 tope de extensión, -1 tope de compresión
        private float _accLimit;

        public Suspension(Body2D chassis, Body2D wheel, Vec2 axleExtended, float axisAngleFromVerticalDeg,
                          float travel, float spring, float progression, float compressionDamping, float reboundDamping)
        {
            _chassis = chassis; _wheel = wheel;
            float a = axisAngleFromVerticalDeg * SimMath.Deg2Rad;
            _localAxis = new Vec2(MathF.Sin(a), -MathF.Cos(a)); // apunta hacia abajo (hacia la rueda)
            _travel = travel;
            _localMount = axleExtended - _localAxis * travel;
            _spring = spring; _progression = progression;
            _compressionDamping = compressionDamping; _reboundDamping = reboundDamping;
            Extension = travel;
        }

        /// <summary>Posición local del eje de la rueda para una extensión dada.</summary>
        public Vec2 LocalAxleAt(float extension) => _localMount + _localAxis * extension;

        /// <summary>Coloca la rueda en su sitio según el chasis (al reiniciar).</summary>
        public void SnapWheel(float extension)
        {
            Extension = SimMath.Clamp(extension, 0f, _travel);
            _wheel.Position = _chassis.LocalToWorld(LocalAxleAt(Extension));
            _wheel.Velocity = _chassis.Velocity;
        }

        private void Measure(out Vec2 mountW, out Vec2 rA, out Vec2 d, out Vec2 u)
        {
            mountW = _chassis.LocalToWorld(_localMount);
            rA = mountW - _chassis.Position;
            d = _wheel.Position - mountW;
            u = _chassis.LocalDirToWorld(_localAxis);
        }

        /// <summary>Aplica la fuerza del muelle y del amortiguador (antes de integrar velocidades).</summary>
        public void ApplySpringForces()
        {
            Measure(out var mountW, out var rA, out var d, out var u);
            float x = Vec2.Dot(d, u);
            Extension = x;
            float compression = SimMath.Clamp01(1f - x / _travel);

            // Velocidad de extensión (positiva = la rueda se aleja del chasis).
            Vec2 vRel = _wheel.Velocity - _chassis.VelocityAt(_wheel.Position);
            float xDot = Vec2.Dot(vRel, u);

            float springForce = _spring * (_travel - SimMath.Clamp(x, 0f, _travel)) * (1f + _progression * compression * compression);
            float damping = xDot > 0f ? _reboundDamping : _compressionDamping;
            float force = springForce - damping * xDot;

            _wheel.Force += u * force;
            _chassis.ApplyForce(u * -force, _wheel.Position);
        }

        /// <summary>Prepara la restricción para los impulsos de este paso.</summary>
        public void Prepare(float dt, float baumgarte, float slop)
        {
            Measure(out _, out var rA, out var d, out _u);
            _n = _u.PerpLeft;
            Vec2 lever = rA + d;
            _sN = Vec2.Cross(lever, _n);
            _sU = Vec2.Cross(lever, _u);
            float invMA = _chassis.InvMass, invIA = _chassis.InvInertia, invMB = _wheel.InvMass;
            _massN = 1f / (invMA + invMB + invIA * _sN * _sN);
            _massU = 1f / (invMA + invMB + invIA * _sU * _sU);

            float cN = Vec2.Dot(d, _n);
            _biasN = -baumgarte / dt * cN;

            float x = Vec2.Dot(d, _u);
            Extension = x;
            _accLimit = 0f;
            if (x >= _travel - 1e-4f) { _limitState = 1; _biasLimit = -baumgarte / dt * Math.Max(x - _travel - slop, 0f); }
            else if (x <= 1e-4f) { _limitState = -1; _biasLimit = -baumgarte / dt * Math.Min(x + slop, 0f); }
            else _limitState = 0;
        }

        /// <summary>Una iteración del solucionador de velocidades.</summary>
        public void Solve()
        {
            // Restricción perpendicular (rígida).
            float cdotN = Vec2.Dot(_n, _wheel.Velocity - _chassis.Velocity) - _chassis.AngularVelocity * _sN;
            float lambdaN = -_massN * (cdotN - _biasN);
            ApplyImpulse(_n, _sN, lambdaN);

            if (_limitState == 0) return;

            // Topes de recorrido.
            float cdotU = Vec2.Dot(_u, _wheel.Velocity - _chassis.Velocity) - _chassis.AngularVelocity * _sU;
            float lambda = -_massU * (cdotU - _biasLimit);
            float old = _accLimit;
            _accLimit = _limitState > 0 ? Math.Min(old + lambda, 0f)   // extendida: solo puede tirar
                                        : Math.Max(old + lambda, 0f);  // comprimida: solo puede empujar
            ApplyImpulse(_u, _sU, _accLimit - old);
        }

        private void ApplyImpulse(Vec2 dir, float s, float lambda)
        {
            _chassis.Velocity -= dir * (lambda * _chassis.InvMass);
            _chassis.AngularVelocity -= s * lambda * _chassis.InvInertia;
            _wheel.Velocity += dir * (lambda * _wheel.InvMass);
        }

        /// <summary>Recalcula la extensión tras integrar posiciones.</summary>
        public void UpdateExtension()
        {
            Measure(out _, out _, out var d, out var u);
            Extension = Vec2.Dot(d, u);
        }
    }
}
