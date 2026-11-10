using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Piloto automático sencillo. Usos: pruebas automáticas (comprobar que cada nivel se puede terminar),
    /// modo demostración en el menú y fantasma "de desarrollador" de referencia.
    /// Mantiene la moto alineada con el suelo y controla los wheelies con el gas.
    /// </summary>
    public static class BotDriver
    {
        public static BikeInput Drive(BikeSim sim, float aggressiveness = 1f)
        {
            var c = sim.Chassis;
            bool airborne = !sim.FrontInfo.Grounded && !sim.RearInfo.Grounded;

            // En el aire mira dónde va a aterrizar; en el suelo, un poco por delante.
            float lookAhead = airborne ? Math.Max(1f, c.Velocity.x * 0.35f) : 1.2f;
            float target = 0f;
            if (sim.Track.GroundAt(c.Position.x + lookAhead, c.Position.y + 1.5f, out _, out Vec2 n, out _))
                target = MathF.Atan2(-n.x, n.y);

            float angle = SimMath.WrapAngle(c.Angle);
            float error = SimMath.WrapAngle(angle - target);       // > 0: morro demasiado alto
            float lean = SimMath.Clamp(2.8f * error + 0.35f * c.AngularVelocity, -1f, 1f);

            float throttle = aggressiveness;
            if (!airborne && error > 0.35f) throttle = 0.2f;        // controlar el wheelie
            if (airborne) throttle = 0.6f;

            return new BikeInput { Throttle = throttle, Lean = lean };
        }
    }
}
