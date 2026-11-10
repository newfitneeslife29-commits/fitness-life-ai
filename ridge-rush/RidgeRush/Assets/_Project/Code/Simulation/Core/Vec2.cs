// Ridge Rush: Pro Moto — simulación de la moto.
// Este ensamblado es C# puro (no usa UnityEngine) para poder:
//   1) probarlo fuera de Unity (Tools/SimTests), y
//   2) ejecutarlo en el servidor para validar tiempos.
// Todas las unidades son del sistema internacional: metros, segundos, kilogramos, radianes.
// Ejes: X hacia la derecha (sentido de la carrera), Y hacia arriba. Ángulo positivo = antihorario
// (para la moto: positivo = morro arriba).

using System;
using System.Runtime.CompilerServices;

namespace RidgeRush.Simulation
{
    /// <summary>Vector 2D inmutable de precisión simple.</summary>
    [Serializable]
    public struct Vec2 : IEquatable<Vec2>
    {
        public float x;
        public float y;

        public static readonly Vec2 Zero = new Vec2(0f, 0f);
        public static readonly Vec2 Up = new Vec2(0f, 1f);
        public static readonly Vec2 Right = new Vec2(1f, 0f);

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Vec2(float x, float y) { this.x = x; this.y = y; }

        public static Vec2 operator +(Vec2 a, Vec2 b) => new Vec2(a.x + b.x, a.y + b.y);
        public static Vec2 operator -(Vec2 a, Vec2 b) => new Vec2(a.x - b.x, a.y - b.y);
        public static Vec2 operator -(Vec2 a) => new Vec2(-a.x, -a.y);
        public static Vec2 operator *(Vec2 a, float s) => new Vec2(a.x * s, a.y * s);
        public static Vec2 operator *(float s, Vec2 a) => new Vec2(a.x * s, a.y * s);
        public static Vec2 operator /(Vec2 a, float s) => new Vec2(a.x / s, a.y / s);

        public float LengthSquared => x * x + y * y;
        public float Length => MathF.Sqrt(x * x + y * y);

        public Vec2 Normalized
        {
            get
            {
                float len = Length;
                return len > 1e-6f ? new Vec2(x / len, y / len) : Zero;
            }
        }

        /// <summary>Perpendicular a la izquierda (gira +90°).</summary>
        public Vec2 PerpLeft => new Vec2(-y, x);

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static float Dot(Vec2 a, Vec2 b) => a.x * b.x + a.y * b.y;

        /// <summary>Producto cruz 2D (escalar): a.x*b.y - a.y*b.x.</summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static float Cross(Vec2 a, Vec2 b) => a.x * b.y - a.y * b.x;

        /// <summary>w × r para una velocidad angular escalar w.</summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static Vec2 Cross(float w, Vec2 r) => new Vec2(-w * r.y, w * r.x);

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static Vec2 Rotate(Vec2 v, float angle)
        {
            float c = MathF.Cos(angle), s = MathF.Sin(angle);
            return new Vec2(c * v.x - s * v.y, s * v.x + c * v.y);
        }

        public static Vec2 FromAngle(float angle) => new Vec2(MathF.Cos(angle), MathF.Sin(angle));

        public static Vec2 Lerp(Vec2 a, Vec2 b, float t) => new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

        public bool Equals(Vec2 other) => x.Equals(other.x) && y.Equals(other.y);
        public override bool Equals(object obj) => obj is Vec2 v && Equals(v);
        public override int GetHashCode() => HashCode.Combine(x, y);
        public override string ToString() => $"({x:0.###}, {y:0.###})";
    }

    /// <summary>Utilidades matemáticas sin dependencias de Unity.</summary>
    public static class SimMath
    {
        public const float Pi = MathF.PI;
        public const float TwoPi = MathF.PI * 2f;
        public const float Deg2Rad = MathF.PI / 180f;
        public const float Rad2Deg = 180f / MathF.PI;

        public static float Clamp(float v, float min, float max) => v < min ? min : (v > max ? max : v);
        public static float Clamp01(float v) => Clamp(v, 0f, 1f);
        public static float Lerp(float a, float b, float t) => a + (b - a) * t;
        public static float InverseLerp(float a, float b, float v) => Math.Abs(b - a) < 1e-6f ? 0f : Clamp01((v - a) / (b - a));
        public static float SmoothStep(float t) { t = Clamp01(t); return t * t * (3f - 2f * t); }

        /// <summary>Mueve <paramref name="current"/> hacia <paramref name="target"/> como máximo <paramref name="maxDelta"/>.</summary>
        public static float MoveTowards(float current, float target, float maxDelta)
        {
            float d = target - current;
            if (Math.Abs(d) <= maxDelta) return target;
            return current + Math.Sign(d) * maxDelta;
        }

        /// <summary>Normaliza un ángulo a (-π, π].</summary>
        public static float WrapAngle(float a)
        {
            a %= TwoPi;
            if (a > Pi) a -= TwoPi;
            else if (a <= -Pi) a += TwoPi;
            return a;
        }
    }
}
