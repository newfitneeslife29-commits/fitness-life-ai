using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Todos los parámetros físicos de una moto. Los campos son públicos y serializables para que Unity
    /// los muestre en un ScriptableObject (BikeDefinition) y para guardarlos en JSON.
    /// Valores por defecto: Haldane Sprout 125 (moto inicial del prototipo).
    /// Geometría en el espacio local del chasis: origen = centro de masas (moto + piloto), X hacia delante.
    /// </summary>
    [Serializable]
    public sealed class BikeParams
    {
        public string id = "haldane_sprout_125";

        [Header("Masas")]
        public float chassisMass = 145f;      // moto sin ruedas + piloto (kg)
        public float chassisInertia = 38f;    // kg·m²
        public float wheelMass = 9f;
        public float frontWheelRadius = 0.36f;
        public float rearWheelRadius = 0.34f;

        [Header("Suspensión")]
        public Vec2 frontAxleExtended = new Vec2(0.80f, -0.56f);   // eje delantero con la horquilla extendida
        public Vec2 rearAxleExtended = new Vec2(-0.78f, -0.58f);   // eje trasero con el amortiguador extendido
        public float forkAngleDeg = 27f;        // inclinación de la horquilla respecto a la vertical
        public float rearAxisAngleDeg = -10f;   // eje equivalente del basculante
        public float frontTravel = 0.30f;       // recorrido (m)
        public float rearTravel = 0.32f;
        public float frontSpring = 9000f;       // N/m
        public float rearSpring = 10500f;
        public float springProgression = 3f;    // muelle progresivo: rigidez × (1 + p·compresión²)
        public float frontCompressionDamping = 1100f; // N·s/m
        public float frontReboundDamping = 1400f;
        public float rearCompressionDamping = 1300f;
        public float rearReboundDamping = 1600f;

        [Header("Motor y transmisión")]
        public float[] torqueCurveRpm = { 1500f, 4000f, 7000f, 9500f, 11000f, 12500f };
        public float[] torqueCurveNm = { 8f, 14f, 20f, 25f, 24f, 18f };
        public float idleRpm = 1800f;
        public float launchRpm = 7500f;         // embrague: rpm a las que patina al salir parado
        public float revLimitRpm = 12500f;
        public float upshiftRpm = 11400f;
        public float downshiftRpm = 6200f;
        public float shiftTime = 0.08f;         // corte de par durante el cambio (s)
        public float[] gearRatios = { 2.6f, 1.9f, 1.5f, 1.25f, 1.07f };
        public float finalDrive = 12.9f;        // primaria × secundaria
        public float drivetrainEfficiency = 0.9f;
        public float engineBrakeTorque = 5f;    // N·m en el cigüeñal sin gas
        public float reverseWheelTorque = 140f; // N·m en la rueda en reversa
        public float reverseMaxSpeed = 2.2f;    // m/s

        [Header("Frenos")]
        public float frontBrakeTorque = 950f;   // N·m en la rueda
        public float rearBrakeTorque = 480f;
        public float frontBrakeBias = 0.6f;

        [Header("Equilibrio del piloto")]
        public float leanTorqueAir = 560f;      // par máximo para girar la moto en el aire
        public float leanTorqueGround = 420f;   // par máximo en el suelo (wheelies, stoppies)
        public float leanMaxRate = 5.5f;        // rad/s objetivo con inclinación completa
        public float leanRateGain = 140f;       // N·m por rad/s de error

        [Header("Neumáticos y aerodinámica")]
        public float tireGrip = 1.0f;           // multiplicador del agarre de la superficie (mejora de llantas)
        public float dragArea = 0.45f;          // Cd·A (m²)

        [Header("Nitro")]
        public float nitroForce = 900f;         // N hacia delante
        public float nitroCapacity = 3f;        // segundos
        public float nitroTorqueMultiplier = 1.25f;

        [Header("Colisión del piloto y el chasis (círculos locales)")]
        public Vec2 headLocal = new Vec2(0.08f, 0.85f);     // casco del piloto en posición de ataque
        public float headRadius = 0.15f;
        public Vec2 torsoLocal = new Vec2(-0.08f, 0.50f);
        public float torsoRadius = 0.20f;
        public Vec2 skidPlateLocal = new Vec2(0.02f, -0.36f);
        public float skidPlateRadius = 0.14f;
        public Vec2 rearFenderLocal = new Vec2(-0.82f, 0.02f);
        public Vec2 frontFenderLocal = new Vec2(0.60f, 0.12f);
        public float fenderRadius = 0.11f;

        [Header("Reglas")]
        public float perfectLandingBoost = 1.6f;   // m/s extra
        public float perfectLandingMaxAngleDeg = 8f;

        public BikeParams Clone() => (BikeParams)MemberwiseClone();
    }

    /// <summary>
    /// Agrupa campos (documentación). Este ensamblado no referencia UnityEngine a propósito,
    /// así que no es el HeaderAttribute de Unity y el inspector no lo dibuja.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field, AllowMultiple = true)]
    internal sealed class HeaderAttribute : Attribute
    {
        public HeaderAttribute(string header) { }
    }
}
