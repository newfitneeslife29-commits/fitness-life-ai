using System;

namespace RidgeRush.Simulation
{
    // Formato de nivel (JSON). Compatible con UnityEngine.JsonUtility (campos públicos, sin diccionarios
    // ni arrays anidados) y con System.Text.Json (IncludeFields = true) para pruebas y servidor.
    // Los niveles se describen por secciones (rampa, salto, baches...) que TrackBuilder convierte en polilínea.
    // El mismo formato lo usarán el Modo Infinito (secciones aleatorias) y el futuro editor de pistas.

    [Serializable]
    public sealed class LevelData
    {
        public int version = 1;
        public string id = "";
        public string world = "coast";
        public string nameEs = "";
        public string nameEn = "";

        /// <summary>Hora del día (0–24) para el ciclo día/noche.</summary>
        public float timeOfDay = 18.5f;
        /// <summary>Preset de clima: clear, rain, fog, sandstorm, snow.</summary>
        public string weather = "clear";

        public float startX = 2f;
        public SectionData[] sections = Array.Empty<SectionData>();
        public PlatformData[] platforms = Array.Empty<PlatformData>();
        public HazardData[] hazards = Array.Empty<HazardData>();
        public WindData[] winds = Array.Empty<WindData>();
        /// <summary>Posiciones X de los checkpoints.</summary>
        public float[] checkpoints = Array.Empty<float>();
        public StarTimes stars = new StarTimes();
        public PropData[] props = Array.Empty<PropData>();
    }

    [Serializable]
    public sealed class SectionData
    {
        /// <summary>flat, slope, ramp, landing, drop, step, gap, bumps, stairs, table, finish.</summary>
        public string type = "flat";
        public float length = 10f;
        public float height = 0f;
        /// <summary>Nombre de <see cref="SurfaceType"/> (Dirt, Sand, Mud, ...).</summary>
        public string surface = "Dirt";
        /// <summary>Repeticiones (baches, escalones).</summary>
        public int count = 0;
        /// <summary>gap: profundidad del foso.</summary>
        public float depth = 3f;
        /// <summary>gap: contenido del foso (ground, water, lava, void). Agua, lava y vacío reinician.</summary>
        public string pit = "ground";
        /// <summary>gap: puente sobre el foso ("", "static" o "collapse": se derrumba poco después de pisarlo).</summary>
        public string bridge = "";
        /// <summary>gap con bridge = collapse: segundos desde que se pisa hasta que cae.</summary>
        public float bridgeDelay = 0.7f;
    }

    [Serializable]
    public sealed class PlatformData
    {
        public float x, y;
        public float width = 6f;
        public float thickness = 0.4f;
        public string surface = "Wood";
        /// <summary>Static, PingPong, Collapse.</summary>
        public string motion = "Static";
        public float dx, dy;
        public float period = 4f;
        public float delay = 0.4f;
    }

    [Serializable]
    public sealed class HazardData
    {
        /// <summary>water, lava, void.</summary>
        public string type = "water";
        public float x0, x1;
        public float yTop;
    }

    [Serializable]
    public sealed class WindData
    {
        public float x0, x1;
        /// <summary>Fuerza horizontal (N). Negativa = en contra.</summary>
        public float force;
    }

    [Serializable]
    public sealed class StarTimes
    {
        /// <summary>Tiempo para 3 estrellas (s).</summary>
        public float gold = 60f;
        /// <summary>Tiempo para 2 estrellas (s).</summary>
        public float silver = 75f;
    }

    /// <summary>Decoración (solo visual). La crea el render; la física la ignora.</summary>
    [Serializable]
    public sealed class PropData
    {
        public string type = "";
        public float x;
        /// <summary>Profundidad (positiva = detrás de la pista).</summary>
        public float z = 4f;
        public float yOffset;
        public float scale = 1f;
        public float rotation;
    }
}
