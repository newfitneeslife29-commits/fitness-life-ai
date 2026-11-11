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
        public string[] Hazards = Array.Empty<string>(); // peligros propios del mundo
        public float Relief = 1f;        // cuánto sube y baja el terreno (montaña > ciudad)
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
                Weathers = new[] { "clear", "clear", "fog" }, TimeMin = 16.5f, TimeMax = 19.3f, Hazards = new[] { "barrel" }, Relief = 0.9f },
            new WorldDef { Id = "desert", NameEs = "Cañón Ceniza", NameEn = "Ash Canyon", LevelCount = 25,
                Main = SurfaceType.Sand, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "void",
                Weathers = new[] { "clear", "clear", "sandstorm" }, TimeMin = 10f, TimeMax = 18.5f, Hazards = new[] { "rock", "barrel" }, Relief = 1.4f },
            new WorldDef { Id = "jungle", NameEs = "Selva Verdor", NameEn = "Verdant Jungle", LevelCount = 25,
                Main = SurfaceType.Mud, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "water",
                Weathers = new[] { "rain", "fog", "clear" }, TimeMin = 8f, TimeMax = 16f, Hazards = new[] { "rock", "barrel" }, Relief = 1.2f },
            new WorldDef { Id = "snow", NameEs = "Pico Glaciar", NameEn = "Glacier Peak", LevelCount = 25,
                Main = SurfaceType.Snow, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "void",
                Weathers = new[] { "snow", "clear", "snow" }, TimeMin = 9f, TimeMax = 21.5f, AllowIce = true, Hazards = new[] { "rock" }, Relief = 1.6f },
            new WorldDef { Id = "city", NameEs = "Neón Bay", NameEn = "Neon Bay", LevelCount = 25,
                Main = SurfaceType.Asphalt, Alt = SurfaceType.Metal, Bridge = SurfaceType.Metal, Pit = "void",
                Weathers = new[] { "rain", "rain", "clear" }, TimeMin = 21f, TimeMax = 23.5f, Hazards = new[] { "oil", "firejet", "barrel" }, Relief = 0.8f },
            new WorldDef { Id = "volcano", NameEs = "Forja Volcán", NameEn = "Volcano Forge", LevelCount = 25,
                Main = SurfaceType.Dirt, Alt = SurfaceType.Metal, Bridge = SurfaceType.Metal, Pit = "lava",
                Weathers = new[] { "ash", "ash", "clear" }, TimeMin = 20f, TimeMax = 23f, Hazards = new[] { "firejet", "barrel", "rock" }, Relief = 1.3f },
            new WorldDef { Id = "stadium", NameEs = "Arena Thunderdome", NameEn = "Thunderdome Arena", LevelCount = 10,
                Main = SurfaceType.Dirt, Alt = SurfaceType.Dirt, Bridge = SurfaceType.Wood, Pit = "none",
                Weathers = new[] { "clear" }, TimeMin = 21.5f, TimeMax = 22.5f, Supercross = true, Hazards = new[] { "firejet" }, Relief = 0.7f },
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
            var pickups = new List<PickupData>();
            var obstacles = new List<ObstacleData>();
            var platforms = new List<PlatformData>();
            void Pickup(string type, float px, float py, float len = 6f) => pickups.Add(new PickupData { type = type, x = px, y = py, length = len });
            // Sierras candidatas: la herramienta de niveles solo deja las que el piloto automático puede esquivar.
            void Saw(float sx, float sy, float size, float sdx = 0f, float sdy = 0f, float period = 3f) =>
                obstacles.Add(new ObstacleData { type = "saw", x = sx, y = sy, size = size, dx = sdx, dy = sdy, period = period, phase = (float)rnd.NextDouble() * period });
            bool saws = !w.Supercross;
            float x = 0f; // posición aproximada (para plataformas y checkpoints)

            void Add(string type, float length, float height = 0f, SurfaceType? surf = null, int count = 0, float depth = 3f, string pit = "ground", string bridge = "", float bridgeDelay = 0.7f)
            {
                s.Add(new SectionData { type = type, length = length, height = height, surface = (surf ?? w.Main).ToString(), count = count, depth = depth, pit = pit, bridge = bridge, bridgeDelay = bridgeDelay });
                if (type != "drop") x += length;
            }

            Add("flat", 25f, surf: w.Alt);
            float sinceCheckpoint = 0f;
            int lastPattern = -1;
            for (int b = 0; b < blocks; b++)
            {
                int pattern;
                do
                {
                    pattern = rnd.Next(w.Supercross ? 6 : 20);
                    if (w.Supercross && pattern == 5) pattern = 11; // en el estadio: loop
                    if ((pattern == 12 || pattern == 16) && w.Pit == "none") pattern = 2;
                } while (pattern == lastPattern);
                lastPattern = pattern;
                float before = x;
                float j = 0.8f + (float)rnd.NextDouble() * 0.4f; // variación de tamaño
                switch (pattern)
                {
                    case 0: // dunas / lomas
                        Add("slope", 28f * j, (2.5f + d * 2f) * w.Relief);
                        Add("flat", 6f);
                        Pickup("coin", x - 3f, 1f); Pickup("coin", x - 1.5f, 1f);
                        Add("slope", 24f * j, -(2.5f + d * 2f) * w.Relief);
                        break;
                    case 1: // baches
                        Add("bumps", 22f * j, 0.3f + d * 0.35f, w.Alt, 3 + rnd.Next(3));
                        break;
                    case 2: // mesa
                        Add("table", 26f * j, 1.4f + d * 1f);
                        break;
                    case 3: // salto con loma (rampa + bajada), con placa de turbo y aro de fuego
                        Add("flat", 10f, surf: w.Alt);
                        Pickup("boost", x - 9f, 0f, 6f);
                        Add("ramp", 11f, 2f + d * 0.8f, w.Alt);
                        Pickup("ring", x + 6f, 2.6f);
                        Add("landing", 17f + d * 3f, 2f + d * 0.8f, w.Alt);
                        if (saws) Saw(x - 17f, 6.5f + (float)rnd.NextDouble(), 1.1f); // castiga volar demasiado alto
                        break;
                    case 4: // whoops (baches seguidos)
                        Add("bumps", 18f * j, 0.25f + d * 0.2f, w.Main, 5 + rnd.Next(3));
                        break;
                    case 5: // rampa + foso + llano (como el muelle del nivel 1)
                    {
                        float h = 1.6f + d * 0.6f;
                        Add("flat", 12f, surf: w.Bridge);
                        Add("ramp", 10f, h, w.Bridge);
                        float gapLen = 7f + d * 3f;
                        Pickup("ring", x + gapLen * 0.5f, 3f + 2.8f); // sobre el foso (altura desde su fondo)
                        Add("gap", gapLen, depth: 3f, surf: w.Bridge, pit: PitFor(w));
                        if (saws) Saw(x - gapLen * 0.5f, 3f + 5.5f + d, 1.2f, 0f, -1.2f - d, 3.5f); // sobre el foso, sube y baja
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
                    case 9: // montaña: subida larga, cima y bajada larga (relieve del mundo)
                        Add("slope", 45f * j, 6f * w.Relief);
                        Add("flat", 10f);
                        Pickup("nitro", x - 5f, 1.2f);
                        if (saws) Saw(x - 5f, 4.5f, 1.3f, 0f, -3.2f, 2.6f + (float)rnd.NextDouble()); // guillotina en la cima
                        Add("landing", 40f * j, 6f * w.Relief);
                        break;
                    case 10: // acantilado: turbo, rampa grande, foso ancho con aro y aterrizaje en bajada
                    {
                        float h = 2.6f + d * 0.6f;
                        Add("flat", 14f, surf: w.Alt);
                        Pickup("boost", x - 12f, 0f, 8f);
                        Add("ramp", 12f, h, w.Alt);
                        float gapLenC = 10f + d * 2f;
                        Pickup("ring", x + gapLenC * 0.5f, 3f + 2.5f);
                        Add("gap", gapLenC, depth: 3f, surf: w.Alt, pit: PitFor(w));
                        Add("landing", 30f, h, w.Main);
                        break;
                    }
                    case 11: // loop: placa de turbo, loop y salida
                    {
                        float R = 4.5f + d * 1.5f;
                        Add("flat", 14f, surf: w.Bridge);
                        Pickup("boost", x - 12f, 0f, 7f);
                        Add("loop", 2f * R + 10f, R, w.Bridge);
                        Pickup("ring", x - 6f - R, 2f * R - 1.2f); // aro arriba del loop
                        Add("flat", 10f, surf: w.Bridge);
                        if (saws && d > 0.25f) Saw(x - 2f, 3.2f, 1.1f, 0f, -2f, 2.2f + (float)rnd.NextDouble());
                        break;
                    }
                    case 12: // pilares sobre el vacío (o agua/lava): saltos cortos y precisos, cada vez más altos
                    {
                        int n = 3 + rnd.Next(2) + (d > 0.5f ? 1 : 0);
                        Add("flat", 10f, surf: w.Alt);
                        float rise = 0f;
                        for (int k = 0; k < n; k++)
                        {
                            Add("ramp", 3.5f, 0.6f, w.Alt);
                            rise += 0.6f;
                            Add("gap", 3.5f + d * 1.5f + (float)rnd.NextDouble(), depth: 9f + rise, surf: w.Alt, pit: PitFor(w));
                            Add("flat", 5f + (float)rnd.NextDouble() * 2f, surf: w.Alt);
                            if (k == n - 1) Pickup("coin", x - 2f, 1f);
                        }
                        Add("landing", 6f + rise * 4f, rise, w.Alt);
                        break;
                    }
                    case 13: // trampolín delante de un muro: hay que llegar con velocidad para subir encima
                    {
                        float wall = 3f + d * 1.2f;
                        Add("flat", 14f, surf: w.Alt);
                        obstacles.Add(new ObstacleData { type = "spring", x = x - 5f, size = 1.4f, power = 10.5f + d * 1.5f });
                        Add("step", 14f, wall, w.Alt);
                        Pickup("coin", x - 9f, 1f); Pickup("coin", x - 7.5f, 1f);
                        Add("landing", 8f + wall * 3f, wall, w.Alt);
                        break;
                    }
                    case 14: // subida muy empinada (hay que echarse adelante) y bajada
                    {
                        float h = (3.5f + d * 2f) * Math.Max(0.8f, w.Relief);
                        Add("flat", 8f, surf: w.Alt);
                        Add("slope", 9f + h, h, w.Main);
                        Add("flat", 5f);
                        Add("landing", 14f + h * 2f, h, w.Main);
                        break;
                    }
                    case 15: // pasillo de sierras que suben y bajan: hay que medir el tiempo (o frenar)
                    {
                        Add("flat", 36f, surf: w.Alt);
                        if (saws)
                        {
                            Saw(x - 26f, 4.6f, 1.2f, 0f, -3.4f, 2.4f + (float)rnd.NextDouble());
                            Saw(x - 14f, 4.6f, 1.2f, 0f, -3.4f, 2.4f + (float)rnd.NextDouble());
                            if (d > 0.4f) Saw(x - 4f, 4.6f, 1.2f, 0f, -3.4f, 2.0f + (float)rnd.NextDouble());
                        }
                        Pickup("nitro", x - 20f, 1.2f);
                        break;
                    }
                    case 16: // noria: las cabinas pasan por el hueco; hay que cruzar subido en una
                    {
                        Add("flat", 14f, surf: w.Bridge);
                        float R = 7f, cab = 4.6f, gap = 6.5f;
                        float gx = x + gap * 0.5f, deck = 0f;
                        int cabins = 5;
                        float period = 11f + (float)rnd.NextDouble() * 3f;
                        float phase0 = (float)rnd.NextDouble();
                        for (int c = 0; c < cabins; c++)
                            platforms.Add(new PlatformData { x = gx - cab * 0.5f, y = deck + R, width = cab, thickness = 0.35f, surface = "Metal", motion = "Orbit",
                                dx = R, period = period, delay = phase0 + c / (float)cabins });
                        Add("gap", gap, depth: 9f, surf: w.Bridge, pit: PitFor(w));
                        Pickup("coin", gx, 1.2f + 9f);
                        Add("flat", 16f, surf: w.Bridge);
                        break;
                    }
                    case 17: // bolas de demolición que se balancean sobre el camino
                    {
                        Add("flat", 34f, surf: w.Alt);
                        if (saws)
                        {
                            float per = 2.8f + (float)rnd.NextDouble() * 0.8f;
                            obstacles.Add(new ObstacleData { type = "pendulum", x = x - 24f, y = 7.5f, dx = 6f, dy = 55f, size = 1.1f, period = per, phase = (float)rnd.NextDouble() * per });
                            obstacles.Add(new ObstacleData { type = "pendulum", x = x - 10f, y = 7.5f, dx = 6f, dy = 55f, size = 1.1f, period = per, phase = (float)rnd.NextDouble() * per });
                        }
                        break;
                    }
                    case 18: // prensas que caen de golpe
                    {
                        Add("flat", 30f, surf: w.Alt == SurfaceType.Dirt ? SurfaceType.Metal : w.Alt);
                        if (saws)
                        {
                            float per = 2.6f + (float)rnd.NextDouble() * 0.8f;
                            obstacles.Add(new ObstacleData { type = "crusher", x = x - 21f, y = 6.6f, dy = -5.4f, size = 1.5f, period = per, phase = (float)rnd.NextDouble() * per });
                            obstacles.Add(new ObstacleData { type = "crusher", x = x - 9f, y = 6.6f, dy = -5.4f, size = 1.5f, period = per, phase = (float)rnd.NextDouble() * per });
                        }
                        break;
                    }
                    case 19: // salto con sierra que gira alrededor del aterrizaje
                    {
                        float h = 1.8f + d * 0.6f;
                        Add("flat", 10f, surf: w.Alt);
                        Add("ramp", 9f, h, w.Alt);
                        Add("landing", 22f, h, w.Alt);
                        if (saws) obstacles.Add(new ObstacleData { type = "orbit", x = x - 14f, y = 4.2f, dx = 2.8f, size = 1.0f, period = 2.4f + (float)rnd.NextDouble(), phase = (float)rnd.NextDouble() * 3f });
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
                float flat = 8f + (float)rnd.NextDouble() * 6f;
                // Llano de enlace: a veces un peligro del mundo (más a más dificultad) o nitro y monedas.
                if (w.Hazards.Length > 0 && b > 0 && rnd.NextDouble() < 0.2 + d * 0.4)
                {
                    flat += 10f;
                    string hz = w.Hazards[rnd.Next(w.Hazards.Length)];
                    obstacles.Add(new ObstacleData { type = hz, x = x + flat * 0.55f, period = hz == "oil" ? 6f : 2.6f + (float)rnd.NextDouble(), phase = (float)rnd.NextDouble() * 3f });
                }
                else if (rnd.NextDouble() < 0.25)
                {
                    // Muro de cajas para atravesar (no hace caer).
                    flat += 6f;
                    obstacles.Add(new ObstacleData { type = "crates", x = x + flat * 0.55f, size = 1f });
                }
                else if (rnd.NextDouble() < 0.35) Pickup("nitro", x + flat * 0.5f, 1.2f);
                else for (int c = 0; c < 4; c++) Pickup("coin", x + 2f + c * 1.5f, 1f);
                Add("flat", flat, surf: w.Alt);
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
                pickups = pickups.ToArray(),
                obstacles = obstacles.ToArray(),
                platforms = platforms.ToArray(),
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
            var pickups = new List<PickupData>();
            var obstacles = new List<ObstacleData>();
            void Pickup(string type, float px, float py, float len = 6f) => pickups.Add(new PickupData { type = type, x = px, y = py, length = len });
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
