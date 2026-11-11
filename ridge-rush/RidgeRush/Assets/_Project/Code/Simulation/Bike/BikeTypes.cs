using System;

namespace RidgeRush.Simulation
{
    /// <summary>Entradas del jugador en un paso de simulación.</summary>
    [Serializable]
    public struct BikeInput
    {
        /// <summary>Gas, 0..1.</summary>
        public float Throttle;
        /// <summary>Freno, 0..1. Mantenido con la moto parada = reversa.</summary>
        public float Brake;
        /// <summary>Equilibrio, -1 (inclinar atrás, morro arriba) .. +1 (inclinar adelante, morro abajo).</summary>
        public float Lean;
        public bool Nitro;

        public static BikeInput Neutral => default;

        public BikeInput Sanitized() => new BikeInput
        {
            Throttle = SimMath.Clamp01(Throttle),
            Brake = SimMath.Clamp01(Brake),
            Lean = SimMath.Clamp(Lean, -1f, 1f),
            Nitro = Nitro,
        };
    }

    public enum TrickType : byte { Backflip, Frontflip, Wheelie, Stoppie, LongJump }

    public enum SimEventType : byte
    {
        /// <summary>Aterrizaje tras estar en el aire. Value = velocidad de impacto (m/s).</summary>
        Landed,
        /// <summary>El piloto se cae. Value = velocidad de impacto.</summary>
        Crashed,
        GearUp,
        GearDown,
        /// <summary>Truco completado. Trick, Count (vueltas) y Value (duración o tiempo en el aire).</summary>
        Trick,
        /// <summary>Aterrizaje perfecto: impulso de velocidad aplicado.</summary>
        PerfectLanding,
        /// <summary>Una rueda toca una superficie distinta. Count = 0 delantera, 1 trasera.</summary>
        SurfaceChanged,
    }

    /// <summary>Evento de la simulación para HUD, audio, háptica, cámara y reglas.</summary>
    public struct SimEvent
    {
        public SimEventType Type;
        public TrickType Trick;
        public SurfaceType Surface;
        public int Count;
        public float Value;
        public float Time;
    }

    /// <summary>Estado de una rueda tras el último paso.</summary>
    public struct WheelInfo
    {
        public bool Grounded;
        public SurfaceType Surface;
        public Vec2 ContactPoint;
        public Vec2 ContactNormal;
        /// <summary>Velocidad de deslizamiento del neumático respecto al suelo (m/s). Sirve para humo y partículas.</summary>
        public float SlipSpeed;
        public bool Sliding;
        /// <summary>Fuerza normal estimada (N).</summary>
        public float Load;
    }

    /// <summary>
    /// Instantánea compacta del estado visible de la moto. Se usa para dibujar (interpolando entre dos),
    /// para las repeticiones y para los fantasmas.
    /// </summary>
    [Serializable]
    public struct BikeState
    {
        public Vec2 ChassisPos;
        public float ChassisAngle;
        public Vec2 FrontWheelPos;
        public float FrontWheelAngle;
        public Vec2 RearWheelPos;
        public float RearWheelAngle;
        public float FrontCompression; // 0 = extendida, 1 = a tope
        public float RearCompression;
        public float Rpm;
        public byte Gear;
        public float Throttle;
        public float Lean;
        public bool FrontGrounded;
        public bool RearGrounded;
        public bool Crashed;
        public bool NitroActive;

        /// <summary>Interpola dos estados (para dibujar a 60/120 FPS una simulación a 240 Hz).</summary>
        public static BikeState Lerp(in BikeState a, in BikeState b, float t)
        {
            var s = b;
            s.ChassisPos = Vec2.Lerp(a.ChassisPos, b.ChassisPos, t);
            s.ChassisAngle = a.ChassisAngle + SimMath.WrapAngle(b.ChassisAngle - a.ChassisAngle) * t;
            s.FrontWheelPos = Vec2.Lerp(a.FrontWheelPos, b.FrontWheelPos, t);
            s.FrontWheelAngle = a.FrontWheelAngle + SimMath.WrapAngle(b.FrontWheelAngle - a.FrontWheelAngle) * t;
            s.RearWheelPos = Vec2.Lerp(a.RearWheelPos, b.RearWheelPos, t);
            s.RearWheelAngle = a.RearWheelAngle + SimMath.WrapAngle(b.RearWheelAngle - a.RearWheelAngle) * t;
            s.FrontCompression = SimMath.Lerp(a.FrontCompression, b.FrontCompression, t);
            s.RearCompression = SimMath.Lerp(a.RearCompression, b.RearCompression, t);
            s.Rpm = SimMath.Lerp(a.Rpm, b.Rpm, t);
            s.Lean = SimMath.Lerp(a.Lean, b.Lean, t);
            return s;
        }
    }
}
