using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Movimiento y choque de los peligros mortales (dependen solo del reloj, así son deterministas):
    /// sierra (fija o en vaivén), sierra que gira alrededor de un eje (orbit), bola de demolición (pendulum)
    /// y prensa que cae de golpe (crusher). Lo usan las reglas, el dibujo y la herramienta de niveles.
    /// </summary>
    public static class ObstacleMotion
    {
        public const float CrusherHalfHeight = 1.2f;

        public static bool IsDeadly(string type) => type == "saw" || type == "orbit" || type == "pendulum" || type == "crusher";

        /// <summary>Centro del peligro en el instante <paramref name="t"/> (suelo en <paramref name="groundY"/>).</summary>
        public static Vec2 Center(ObstacleData o, float groundY, float t)
        {
            var b = new Vec2(o.x, groundY + o.y);
            float period = Math.Max(0.5f, o.period);
            switch (o.type)
            {
                case "orbit": // dx = radio de giro alrededor de b
                {
                    float a = (t + o.phase) / period * SimMath.TwoPi;
                    return b + new Vec2(MathF.Cos(a), MathF.Sin(a)) * o.dx;
                }
                case "pendulum": // b = pivote, dx = largo de la cadena, dy = amplitud en grados
                {
                    float th = o.dy * SimMath.Deg2Rad * MathF.Sin((t + o.phase) / period * SimMath.TwoPi);
                    return b + new Vec2(MathF.Sin(th), -MathF.Cos(th)) * o.dx;
                }
                case "crusher": // arriba, cae de golpe (dy < 0), espera abajo y sube despacio
                    return b + new Vec2(0f, o.dy * CrusherProfile((t + o.phase) / period));
                default:
                    if (o.dx == 0f && o.dy == 0f) return b;
                    float s = 0.5f - 0.5f * MathF.Cos((t + o.phase) / period * SimMath.TwoPi);
                    return b + new Vec2(o.dx, o.dy) * s;
            }
        }

        /// <summary>0 = arriba, 1 = abajo.</summary>
        public static float CrusherProfile(float cycles)
        {
            float u = cycles - MathF.Floor(cycles);
            if (u < 0.5f) return 0f;
            if (u < 0.58f) { float k = (u - 0.5f) / 0.08f; return k * k; }
            if (u < 0.72f) return 1f;
            return 1f - (u - 0.72f) / 0.28f;
        }

        /// <summary>¿Un círculo (pieza de la moto) en <paramref name="p"/> con radio <paramref name="r"/> toca el peligro?</summary>
        public static bool Touches(ObstacleData o, Vec2 center, Vec2 p, float r)
        {
            if (o.type == "crusher")
                return Math.Abs(p.x - center.x) < o.size + r && Math.Abs(p.y - center.y) < CrusherHalfHeight + r;
            float rr = o.size + r;
            return (p - center).LengthSquared < rr * rr;
        }
    }
}
