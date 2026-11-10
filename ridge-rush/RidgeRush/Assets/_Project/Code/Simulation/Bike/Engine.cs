using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Motor con curva de par, embrague automático al salir parado y caja de cambios automática.
    /// Devuelve el par en la rueda trasera. Convención: par positivo = empuja la moto hacia delante.
    /// </summary>
    public sealed class Engine
    {
        private readonly BikeParams _p;
        private float _shiftTimer;
        private float _sinceShift;
        private const float MinTimeBetweenShifts = 0.35f;

        public int Gear { get; private set; }
        public float Rpm { get; private set; }
        public int GearCount => _p.gearRatios.Length;

        /// <summary>+1 si acaba de subir de marcha, -1 si bajó, 0 si no hubo cambio (en el último Update).</summary>
        public int LastShift { get; private set; }

        public Engine(BikeParams p) { _p = p; Reset(); }

        public void Reset() { Gear = 0; Rpm = _p.idleRpm; _shiftTimer = 0f; _sinceShift = 1f; LastShift = 0; }

        private float OverallRatio(int gear) => _p.gearRatios[gear] * _p.finalDrive;

        /// <summary>Par motor (N·m en el cigüeñal) según la curva, interpolado linealmente.</summary>
        public float CurveTorque(float rpm)
        {
            var xs = _p.torqueCurveRpm; var ys = _p.torqueCurveNm;
            if (rpm <= xs[0]) return ys[0];
            for (int i = 1; i < xs.Length; i++)
                if (rpm <= xs[i]) return SimMath.Lerp(ys[i - 1], ys[i], (rpm - xs[i - 1]) / (xs[i] - xs[i - 1]));
            return ys[ys.Length - 1];
        }

        /// <summary>
        /// Calcula el par en la rueda.
        /// </summary>
        /// <param name="wheelForwardOmega">Velocidad de giro de la rueda trasera hacia delante, relativa al chasis (rad/s).</param>
        /// <param name="groundOmega">Giro que tendría la rueda rodando sin patinar a la velocidad de la moto (rad/s).
        /// Los cambios se deciden con esta velocidad, así patinar no provoca subir y bajar de marcha sin parar.</param>
        /// <param name="throttle">Gas 0..1.</param>
        /// <param name="torqueMultiplier">Multiplicador (nitro).</param>
        public float Update(float wheelForwardOmega, float groundOmega, float throttle, float torqueMultiplier, float dt)
        {
            LastShift = 0;
            float wheelRpm = Math.Max(0f, wheelForwardOmega) * 60f / SimMath.TwoPi;
            float groundRpm = Math.Max(0f, groundOmega) * 60f / SimMath.TwoPi;
            _sinceShift += dt;

            // Caja automática (decide con la velocidad real, no con el giro de la rueda).
            if (_shiftTimer <= 0f && _sinceShift >= MinTimeBetweenShifts)
            {
                float rpmGround = groundRpm * OverallRatio(Gear);
                if (rpmGround > _p.upshiftRpm && Gear < GearCount - 1)
                {
                    Gear++; LastShift = 1; _shiftTimer = _p.shiftTime; _sinceShift = 0f;
                }
                else if (Gear > 0 && rpmGround < _p.downshiftRpm && groundRpm * OverallRatio(Gear - 1) < _p.upshiftRpm * 0.92f)
                {
                    Gear--; LastShift = -1; _shiftTimer = _p.shiftTime * 0.5f; _sinceShift = 0f;
                }
            }
            if (_shiftTimer > 0f) _shiftTimer -= dt;
            float rpmFromWheel = wheelRpm * OverallRatio(Gear);

            // Embrague: por debajo de las rpm de salida, el embrague patina y el motor gira más rápido que la rueda.
            float clutchRpm = _p.idleRpm + throttle * (_p.launchRpm - _p.idleRpm);
            float targetRpm = Math.Max(rpmFromWheel, clutchRpm);
            // Inercia del motor: las rpm visibles siguen a las reales con rapidez, sin saltos.
            Rpm = SimMath.MoveTowards(Rpm, Math.Min(targetRpm, _p.revLimitRpm + 300f), 60000f * dt);

            if (_shiftTimer > 0f) return 0f;
            float ratio = OverallRatio(Gear) * _p.drivetrainEfficiency;
            if (throttle > 0.001f)
            {
                if (rpmFromWheel >= _p.revLimitRpm) return 0f; // corte de encendido
                return CurveTorque(targetRpm) * throttle * ratio * torqueMultiplier;
            }
            // Freno motor.
            return wheelForwardOmega > 1f ? -_p.engineBrakeTorque * ratio : 0f;
        }
    }
}
