using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>Aspecto de un mundo: luz, cielo, niebla, color, suelo de fondo y decoración (docs/02 §5).</summary>
    public sealed class WorldTheme
    {
        public string Id;
        public Color SunDay, SunLow, Fog, FogNight, Ground, Backdrop, BackdropAlt, Accent;
        public Color SkyTint;
        public float FogStart = 60f, FogEnd = 650f;
        public float Temperature, Saturation, Contrast = 12f, Bloom = 0.7f;
        public Color ShadowsTint = Color.white, HighlightsTint = Color.white;
        public string[] Props;
        public bool AlwaysNight;   // ciudad de noche, volcán, estadio
        public bool Headlight;     // faro encendido
    }

    public static class WorldThemes
    {
        public static WorldTheme Get(string id)
        {
            switch (id)
            {
                case "desert": return new WorldTheme
                {
                    Id = id, SunDay = new Color(1f, 0.92f, 0.78f), SunLow = new Color(1f, 0.55f, 0.3f),
                    Fog = new Color(0.93f, 0.76f, 0.55f), FogNight = new Color(0.2f, 0.16f, 0.2f), SkyTint = new Color(0.6f, 0.55f, 0.5f),
                    Ground = new Color(0.86f, 0.62f, 0.4f), Backdrop = new Color(0.72f, 0.38f, 0.22f), BackdropAlt = new Color(0.55f, 0.3f, 0.2f),
                    Accent = new Color(0.3f, 0.5f, 0.25f), Temperature = 22f, Saturation = 4f, Contrast = 20f, FogStart = 40f, FogEnd = 500f,
                    Props = new[] { "cactus", "rock", "cactus", "wagon", "rock" },
                };
                case "jungle": return new WorldTheme
                {
                    Id = id, SunDay = new Color(1f, 0.96f, 0.85f), SunLow = new Color(1f, 0.7f, 0.45f),
                    Fog = new Color(0.62f, 0.75f, 0.62f), FogNight = new Color(0.08f, 0.12f, 0.1f), SkyTint = new Color(0.5f, 0.62f, 0.55f),
                    Ground = new Color(0.25f, 0.33f, 0.18f), Backdrop = new Color(0.12f, 0.3f, 0.14f), BackdropAlt = new Color(0.45f, 0.43f, 0.38f),
                    Accent = new Color(0.2f, 0.55f, 0.2f), Temperature = 4f, Saturation = 18f, FogStart = 25f, FogEnd = 300f,
                    ShadowsTint = new Color(0.92f, 1.05f, 0.95f),
                    Props = new[] { "jtree", "jtree", "column", "fern", "jtree", "statue" },
                };
                case "snow": return new WorldTheme
                {
                    Id = id, SunDay = new Color(0.95f, 0.97f, 1f), SunLow = new Color(1f, 0.7f, 0.55f),
                    Fog = new Color(0.82f, 0.88f, 0.95f), FogNight = new Color(0.08f, 0.1f, 0.18f), SkyTint = new Color(0.45f, 0.55f, 0.8f),
                    Ground = new Color(0.92f, 0.95f, 1f), Backdrop = new Color(0.85f, 0.9f, 0.98f), BackdropAlt = new Color(0.4f, 0.45f, 0.52f),
                    Accent = new Color(0.12f, 0.3f, 0.2f), Temperature = -18f, Saturation = -5f, FogStart = 40f, FogEnd = 450f,
                    ShadowsTint = new Color(0.9f, 0.95f, 1.12f),
                    Props = new[] { "pine", "pine", "cabin", "pine", "snowrock" },
                };
                case "city": return new WorldTheme
                {
                    Id = id, SunDay = new Color(0.7f, 0.75f, 1f), SunLow = new Color(0.6f, 0.6f, 0.9f),
                    Fog = new Color(0.25f, 0.18f, 0.35f), FogNight = new Color(0.12f, 0.08f, 0.2f), SkyTint = new Color(0.3f, 0.25f, 0.5f),
                    Ground = new Color(0.1f, 0.1f, 0.12f), Backdrop = new Color(0.12f, 0.12f, 0.16f), BackdropAlt = new Color(0.08f, 0.08f, 0.1f),
                    Accent = new Color(1f, 0.15f, 0.7f), Temperature = -12f, Saturation = 20f, Contrast = 18f, Bloom = 1.4f, FogStart = 30f, FogEnd = 380f,
                    ShadowsTint = new Color(0.95f, 0.9f, 1.15f), HighlightsTint = new Color(1.1f, 0.95f, 1.05f),
                    Props = new[] { "lamp", "neon", "container", "lamp", "crane" }, AlwaysNight = true, Headlight = true,
                };
                case "volcano": return new WorldTheme
                {
                    Id = id, SunDay = new Color(1f, 0.5f, 0.3f), SunLow = new Color(1f, 0.35f, 0.15f),
                    Fog = new Color(0.35f, 0.12f, 0.08f), FogNight = new Color(0.25f, 0.08f, 0.05f), SkyTint = new Color(0.8f, 0.3f, 0.2f),
                    Ground = new Color(0.12f, 0.1f, 0.1f), Backdrop = new Color(0.16f, 0.12f, 0.12f), BackdropAlt = new Color(0.25f, 0.22f, 0.22f),
                    Accent = new Color(1f, 0.35f, 0.05f), Temperature = 25f, Saturation = 10f, Contrast = 22f, Bloom = 1.6f, FogStart = 30f, FogEnd = 350f,
                    HighlightsTint = new Color(1.15f, 0.95f, 0.85f),
                    Props = new[] { "rock", "chimney", "barrel", "pipe", "rock" }, AlwaysNight = true, Headlight = true,
                };
                case "stadium": return new WorldTheme
                {
                    Id = id, SunDay = new Color(1f, 0.98f, 0.95f), SunLow = new Color(1f, 0.98f, 0.95f),
                    Fog = new Color(0.08f, 0.08f, 0.12f), FogNight = new Color(0.08f, 0.08f, 0.12f), SkyTint = new Color(0.2f, 0.2f, 0.3f),
                    Ground = new Color(0.4f, 0.28f, 0.18f), Backdrop = new Color(0.2f, 0.2f, 0.25f), BackdropAlt = new Color(0.6f, 0.6f, 0.65f),
                    Accent = new Color(1f, 0.35f, 0.12f), Temperature = 0f, Saturation = 12f, Contrast = 20f, Bloom = 1.2f, FogStart = 80f, FogEnd = 600f,
                    Props = new[] { "banner", "tirestack", "banner", "flag" }, AlwaysNight = true,
                };
                default: return new WorldTheme
                {
                    Id = "coast", SunDay = new Color(1f, 0.93f, 0.82f), SunLow = new Color(1f, 0.55f, 0.28f),
                    Fog = new Color(0.96f, 0.72f, 0.55f), FogNight = new Color(0.1f, 0.12f, 0.2f), SkyTint = new Color(0.55f, 0.6f, 0.75f),
                    Ground = new Color(0.9f, 0.8f, 0.62f), Backdrop = new Color(0.16f, 0.24f, 0.18f), BackdropAlt = new Color(0.35f, 0.31f, 0.28f),
                    Accent = new Color(0.04f, 0.28f, 0.36f), Temperature = 18f, Saturation = 8f, Contrast = 14f,
                    ShadowsTint = new Color(0.9f, 1f, 1.12f), HighlightsTint = new Color(1.1f, 1f, 0.9f),
                    Props = new[] { "palm", "palm", "hut", "palm", "surfboard", "palm" },
                };
            }
        }
    }
}
