namespace RidgeRush.Simulation
{
    /// <summary>Tipos de superficie. El orden no debe cambiar: se guarda en los niveles y en las repeticiones.</summary>
    public enum SurfaceType : byte
    {
        Dirt = 0,
        Sand = 1,
        Mud = 2,
        Snow = 3,
        Ice = 4,
        Asphalt = 5,
        Metal = 6,
        Wood = 7,
        Water = 8,
    }

    /// <summary>Propiedades físicas de una superficie.</summary>
    public readonly struct SurfaceProps
    {
        /// <summary>Coeficiente de agarre máximo del neumático (antes de patinar).</summary>
        public readonly float Grip;
        /// <summary>Agarre mientras patina, como fracción de <see cref="Grip"/> (pérdida de agarre).</summary>
        public readonly float SlideFactor;
        /// <summary>Resistencia a la rodadura (arena y barro frenan mucho).</summary>
        public readonly float RollingResistance;
        /// <summary>Fricción para piezas que no son ruedas (chasis, casco) al rozar.</summary>
        public readonly float BodyFriction;

        public SurfaceProps(float grip, float slideFactor, float rolling, float bodyFriction)
        {
            Grip = grip; SlideFactor = slideFactor; RollingResistance = rolling; BodyFriction = bodyFriction;
        }
    }

    /// <summary>Tabla de superficies (valores del GDD §4.4). Ajustables aquí para afinar la sensación.</summary>
    public static class Surfaces
    {
        private static readonly SurfaceProps[] Table =
        {
            new SurfaceProps(1.00f, 0.80f, 0.030f, 0.55f), // Dirt
            new SurfaceProps(0.70f, 0.75f, 0.160f, 0.60f), // Sand
            new SurfaceProps(0.55f, 0.70f, 0.220f, 0.45f), // Mud
            new SurfaceProps(0.50f, 0.75f, 0.090f, 0.25f), // Snow
            new SurfaceProps(0.15f, 0.80f, 0.010f, 0.05f), // Ice
            new SurfaceProps(1.10f, 0.75f, 0.015f, 0.45f), // Asphalt
            new SurfaceProps(0.85f, 0.70f, 0.015f, 0.30f), // Metal
            new SurfaceProps(0.90f, 0.80f, 0.020f, 0.40f), // Wood
            new SurfaceProps(0.60f, 0.70f, 0.350f, 0.30f), // Water (vadeo)
        };

        public static ref readonly SurfaceProps Get(SurfaceType type) => ref Table[(int)type];

        /// <summary>Superficies que dejan huellas en el terreno (lo usa el render).</summary>
        public static bool LeavesTracks(SurfaceType type) =>
            type == SurfaceType.Dirt || type == SurfaceType.Sand || type == SurfaceType.Mud || type == SurfaceType.Snow;
    }
}
