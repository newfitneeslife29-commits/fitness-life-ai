using System;
using System.Collections.Generic;

namespace RidgeRush.Simulation
{
    /// <summary>Datos de cada mundo para generar sus niveles (GDD §5).</summary>
    public sealed class WorldDef
    {
        public string Id;
        public string NameEs, NameEn;
        public int LevelCount;
        public SurfaceType Main, Alt, Bridge;
        public string Pit;               // water, lava, void, none
        public string[] Weathers;        // clima posible
        public float TimeMin, TimeMax;   // hora del día
        public bool Supercross;          // estadio: solo mesas, baches y saltos, sin fosos
        public bool AllowIce;
    }

    /// <summary>
    /// Genera niveles por secciones a partir de patrones probados (rampa + foso + aterrizaje, mesas, baches...).
    /// Es determinista: el mismo mundo, índice y semilla dan el mismo nivel. La herramienta de niveles
    /// (Tools/SimTests "generate") prueba cada nivel con el piloto automático y solo guarda los que se terminan.
    /// También servirá para el Modo Infinito.
    /// </summary>
    public static class LevelGenerator
    {
        public static readonly WorldDef[] Worlds =
        {
            new WorldDef { Id = "coast", NameEs = "Costa Coral", NameEn = "Coral Coast", LevelCount = 25,
                Main = SurfaceType.Sand, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "water",
                Weathers = new[] { "clear", "clear", "fog" }, TimeMin = 16.5f, TimeMax = 19.3f },
            new WorldDef { Id = "desert", NameEs = "Cañón Ceniza", NameEn = "Ash Canyon", LevelCount = 25,
                Main = SurfaceType.Sand, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "void",
                Weathers = new[] { "clear", "clear", "sandstorm" }, TimeMin = 10f, TimeMax = 18.5f },
            new WorldDef { Id = "jungle", NameEs = "Selva Verdor", NameEn = "Verdant Jungle", LevelCount = 25,
                Main = SurfaceType.Mud, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "water",
                Weathers = new[] { "rain", "fog", "clear" }, TimeMin = 8f, TimeMax = 16f },
            new WorldDef { Id = "snow", NameEs = "Pico Glaciar", NameEn = "Glacier Peak", LevelCount = 25,
                Main = SurfaceType.Snow, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "void",
                Weathers = new[] { "snow", "clear", "snow" }, TimeMin = 9f, TimeMax = 21.5f, AllowIce = true },
            new WorldDef { Id = "city", NameEs = "Neón Bay", NameEn = "Neon Bay", LevelCount = 25,
                Main = SurfaceType.Asphalt, Alt = SurfaceType.Metal, Bridge = SurfaceType.Metal, Pit = "void",
                Weathers = new[] { "rain", "rain", "clear" }, TimeMin = 21f, TimeMax = 23.5f },
            new WorldDef { Id = "volcano", NameEs = "Forja Volcán", NameEn = "Volcano Forge", LevelCount = 25,
                Main = SurfaceType.Dirt, Alt = SurfaceType.Metal, Bridge = SurfaceType.Metal, Pit = "lava",
                Weathers = new[] { "ash", "ash", "clear" }, TimeMin = 20f, TimeMax = 23f },
            new WorldDef { Id = "stadium", NameEs = "Arena Thunderdome", NameEn = "Thunderdome Arena", LevelCount = 10,
                Main = SurfaceType.Dirt, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "none",
                Weathers = new[] { "clear" }, TimeMin = 21.5f, TimeMax = 22.5f, Supercross = true },
        };

        public static WorldDef World(string id)
        {
            foreach (var w in Worlds) if (w.Id == id) return w;
            throw new ArgumentException($"Mundo desconocido: {id}");
        }

        /// <summary>Genera el nivel <paramref name="index"/> (0..LevelCount-1) de un mundo.</summary>
        public static LevelData Generate(WorldDef w, int index, int seed)
        {
            var rnd = new Random(Hash(w.Id, index, seed));
            int worldNo = Array.IndexOf(Worlds, w);
            bool final = index == w.LevelCount - 1;
            // Dificultad 0..1: sube dentro del mundo y un poco de mundo en mundo.
            float d = Math.Min(1f, index / (float)Math.Max(1, w.LevelCount - 1) * 0.8f + worldNo * 0.04f);
            int blocks = 14 + (int)(d * 10) + (final ? 8 : 0);

            var s = new List<SectionData>();
            var checkpoints = new List<float>();
            float x = 0f; // posición aproximada (para plataformas y checkpoints)

            void Add(string type, float length, float height = 0f, SurfaceType? surf = null, int count = 0, float depth = 3f, string pit = "ground", string bridge = "", float bridgeDelay = 0.7f)
            {
                s.Add(new SectionData { type = type, length = length, height = height, surface = (surf ?? w.Main).ToString(), count = count, depth = depth, pit = pit, bridge = bridge, bridgeDelay = bridgeDelay });
                if (type != "drop" && type != "step") x += length;
            }

            Add("flat", 25f, surf: w.Alt);
            float sinceCheckpoint = 0f;
            int lastPattern = -1;
            for (int b = 0; b < blocks; b++)
            {
                int pattern;
                do pattern = rnd.Next(w.Supercross ? 5 : 9); while (pattern == lastPattern);
                lastPattern = pattern;
                float before = x;
                float j = 0.8f + (float)rnd.NextDouble() * 0.4f; // variación de tamaño
                switch (pattern)
                {
                    case 0: // dunas / lomas
                        Add("slope", 28f * j, 2.5f + d * 2f);
                        Add("flat", 6f);
                        Add("slope", 24f * j, -(2.5f + d * 2f));
                        break;
                    case 1: // baches
                        Add("bumps", 22f * j, 0.3f + d * 0.35f, w.Alt, 3 + rnd.Next(3));
                        break;
                    case 2: // mesa
                        Add("table", 26f * j, 1.4f + d * 1f);
                        break;
                    case 3: // salto con loma (rampa + bajada)
                        Add("flat", 10f, surf: w.Alt);
                        Add("ramp", 11f, 2f + d * 0.8f, w.Alt);
                        Add("landing", 17f + d * 3f, 2f + d * 0.8f, w.Alt);
                        break;
                    case 4: // whoops (baches seguidos)
                        Add("bumps", 18f * j, 0.25f + d * 0.2f, w.Main, 5 + rnd.Next(3));
                        break;
                    case 5: // rampa + foso + llano (como el muelle del nivel 1)
                    {
                        float h = 1.6f + d * 0.6f;
                        Add("flat", 12f, surf: w.Bridge);
                        Add("ramp", 10f, h, w.Bridge);
                        Add("gap", 7f + d * 3f, depth: 3f, surf: w.Bridge, pit: PitFor(w));
                        Add("flat", 34f, surf: w.Bridge); // zona de aterrizaje larga: las motos rápidas vuelan más
                        Add("drop", 0f, h, w.Bridge);
                        break;
                    }
                    case 6: // rampa + foso + aterrizaje en bajada
                    {
                        float h = 1.2f + d * 0.4f;
                        Add("flat", 12f, surf: w.Bridge);
                        Add("ramp", 8f, h, w.Bridge);
                        Add("gap", 6f + d * 2.5f, depth: 3f, surf: w.Bridge, pit: PitFor(w));
                        Add("landing", 14f, h, w.Bridge);
                        break;
                    }
                    case 7: // puente que se derrumba sobre un foso
                    {
                        Add("flat", 14f, surf: w.Bridge);
                        Add("gap", 9f + d * 4f, depth: 3f, surf: w.Bridge, pit: PitFor(w), bridge: "collapse", bridgeDelay: 0.75f - d * 0.15f);
                        Add("flat", 16f, surf: w.Bridge);
                        break;
                    }
                    default: // tramo de la superficie alternativa (hielo en nieve) + subida y bajada
                        Add("flat", 18f, surf: w.AllowIce && d > 0.3f ? SurfaceType.Ice : w.Alt);
                        Add("slope", 20f, 1.5f + d);
                        Add("slope", 20f, -(1.5f + d));
                        break;
                }
                // Cada patrón vuelve a la altura de partida, así el nivel no sube ni baja sin control.
                sinceCheckpoint += x - before;
                if (sinceCheckpoint > 160f && b < blocks - 2) { checkpoints.Add(x + 2f); sinceCheckpoint = 0f; }
                Add("flat", 8f + (float)rnd.NextDouble() * 6f, surf: w.Alt);
            }
            Add("finish", 20f, surf: w.Alt);

            var wx = w.Weathers[rnd.Next(w.Weathers.Length)];
            return new LevelData
            {
                id = $"{w.Id}_{index + 1:00}",
                world = w.Id,
                nameEs = $"{w.NameEs} {index + 1}" + (final ? " — Final" : ""),
                nameEn = $"{w.NameEn} {index + 1}" + (final ? " — Final" : ""),
                timeOfDay = w.TimeMin + (float)rnd.NextDouble() * (w.TimeMax - w.TimeMin),
                weather = final && w.Weathers.Length > 0 ? w.Weathers[0] : wx,
                startX = 2f,
                sections = s.ToArray(),
                checkpoints = checkpoints.ToArray(),
                stars = new StarTimes { gold = 60f, silver = 75f }, // se ajustan con el tiempo del piloto automático
            };
        }

        /// <summary>
        /// Parque de Freestyle: rampas grandes con bajadas largas (volteretas), mesas y baches, sin fosos.
        /// Muy largo para que la sesión de 2 minutos no se acabe; se repite el patrón.
        /// </summary>
        public static LevelData FreestylePark(int seed)
        {
            var rnd = new Random(seed);
            var s = new List<SectionData>();
            void Add(string type, float length, float height = 0f, SurfaceType surf = SurfaceType.Dirt, int count = 0) =>
                s.Add(new SectionData { type = type, length = length, height = height, surface = surf.ToString(), count = count });
            Add("flat", 30f);
            for (int b = 0; b < 40; b++)
            {
                switch (rnd.Next(4))
                {
                    case 0: Add("ramp", 12f, 4.5f, SurfaceType.Wood); Add("flat", 3f, 0f, SurfaceType.Wood); Add("landing", 32f, 4.5f); break; // voltereta
                    case 1: Add("ramp", 10f, 3f, SurfaceType.Wood); Add("landing", 24f, 3f); break;
                    case 2: Add("table", 30f, 2.5f); break;
                    default: Add("bumps", 20f, 0.5f, SurfaceType.Dirt, 3); break;
                }
                Add("flat", 14f);
            }
            Add("finish", 20f);
            var checkpoints = new List<float>();
            for (float x = 150f; x < 3000f; x += 150f) checkpoints.Add(x);
            return new LevelData
            {
                id = "freestyle", world = "stadium", nameEs = "Freestyle · Parque", nameEn = "Freestyle · Park",
                timeOfDay = 22f, weather = "clear", sections = s.ToArray(), checkpoints = checkpoints.ToArray(),
                stars = new StarTimes { gold = 9999f, silver = 9999f },
            };
        }

        private static string PitFor(WorldDef w) => w.Pit == "none" ? "ground" : w.Pit;

        private static int Hash(string world, int index, int seed)
        {
            unchecked
            {
                int h = 17;
                foreach (char c in world) h = h * 31 + c;
                return h * 31 + index * 7919 + seed * 104729;
            }
        }
    }
}
