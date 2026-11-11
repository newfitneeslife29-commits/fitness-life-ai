using System.Collections.Generic;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Decoraciones de fábrica de cada moto (texturas generadas por código): rayas de carreras, dos colores,
    /// llamas, camuflaje, fibra de carbono, neón, oro, cuadros y "digital". Cada moto tiene la suya: es su skin.
    /// </summary>
    public static class LiveryTextures
    {
        private const int S = 128;
        private static readonly Dictionary<string, Texture2D> Cache = new Dictionary<string, Texture2D>();

        public static Color Rgb(uint v) => new Color(((v >> 16) & 255) / 255f, ((v >> 8) & 255) / 255f, (v & 255) / 255f);

        /// <summary>Textura de la decoración. <paramref name="glow"/> = solo las líneas brillantes (mapa de emisión).</summary>
        public static Texture2D Get(BikeDef d, bool glow = false)
        {
            string key = d.Id + (glow ? "_glow" : "");
            if (Cache.TryGetValue(key, out var tex)) return tex;
            Color a = new Color(d.BodyR, d.BodyG, d.BodyB), b = Rgb(d.Secondary), c = Rgb(d.Accent);
            var px = new Color[S * S];
            var rnd = new System.Random(d.Id.GetHashCode());
            float[] noise = Noise(rnd);
            for (int y = 0; y < S; y++)
            for (int x = 0; x < S; x++)
            {
                float u = x / (float)S, v = y / (float)S;
                Color col = a; float g = 0f;
                switch (d.Livery)
                {
                    case "stripes":
                    {
                        float diag = Frac(u * 1.0f + v * 0.6f);
                        if (diag > 0.42f && diag < 0.56f) col = b;
                        else if (diag > 0.58f && diag < 0.62f) col = c;
                        break;
                    }
                    case "split":
                    {
                        float edge = 0.5f + (u - 0.5f) * 0.35f;
                        col = v < edge - 0.03f ? b : v < edge ? c : a;
                        break;
                    }
                    case "flames":
                    {
                        // Llamas que nacen a la izquierda (morro) y se afilan hacia atrás.
                        float t = 1f - u;
                        float h = 0.5f + 0.38f * t * Mathf.Sin(v * 22f + u * 9f) * Mathf.Sin(v * 7f + 1.3f);
                        float flame = Mathf.Abs(v - 0.5f) < 0.45f * t + 0.05f ? Mathf.Clamp01((h - Mathf.Abs(v - 0.5f) * 0.6f - u * 0.55f) * 4f) : 0f;
                        col = Color.Lerp(a, Color.Lerp(c, b, Mathf.Clamp01(u * 1.6f)), flame);
                        break;
                    }
                    case "camo":
                    {
                        float n = noise[(y / 8) * 16 + (x / 8)] * 0.6f + noise[((y / 4) % 16) * 16 + ((x / 4) % 16)] * 0.4f;
                        col = n < 0.38f ? b : n < 0.62f ? a : Color.Lerp(a, Color.black, 0.45f);
                        if (n > 0.86f) col = c;
                        break;
                    }
                    case "carbon":
                    {
                        // Tejido de fibra de carbono: cuadros que alternan el sentido del brillo.
                        int cx = x / 8, cy = y / 8;
                        bool dir = ((cx + cy) & 1) == 0;
                        float w = dir ? Mathf.Abs(Mathf.Sin(x * 0.8f)) : Mathf.Abs(Mathf.Sin(y * 0.8f));
                        col = Color.Lerp(new Color(0.06f, 0.06f, 0.07f), new Color(0.22f, 0.23f, 0.25f), w);
                        if (Mathf.Abs(v - 0.3f) < 0.012f) { col = c; g = 1f; }
                        break;
                    }
                    case "neon":
                    {
                        col = b;
                        bool line = Mathf.Abs(Frac(u * 3f + v * 1.2f) - 0.5f) < 0.03f || Mathf.Abs(v - 0.22f) < 0.015f || Mathf.Abs(v - 0.78f) < 0.015f;
                        if (line) { col = c; g = 1f; }
                        break;
                    }
                    case "gold":
                    {
                        col = Color.Lerp(a, new Color(1f, 0.92f, 0.6f), Mathf.PerlinNoise(u * 3f, v * 3f) * 0.35f);
                        if (Mathf.Abs(Frac(v * 6f) - 0.5f) < 0.02f) col = b;
                        break;
                    }
                    case "checker":
                    {
                        if (v > 0.35f && v < 0.65f) col = ((x / 12 + y / 12) & 1) == 0 ? b : c;
                        break;
                    }
                    case "digital":
                    {
                        int bx = x / 10, by = y / 10;
                        float r = noise[(by % 16) * 16 + (bx % 16)];
                        float grad = u + (r - 0.5f) * 0.5f;
                        col = grad < 0.45f ? a : grad < 0.62f ? Color.Lerp(a, b, 0.5f) : b;
                        if (r > 0.9f) { col = c; g = 0.6f; }
                        break;
                    }
                }
                px[y * S + x] = glow ? new Color(g, g, g) : col;
            }
            tex = new Texture2D(S, S, TextureFormat.RGBA32, true) { name = key, wrapMode = TextureWrapMode.Repeat };
            tex.SetPixels(px);
            tex.Apply(true);
            Cache[key] = tex;
            return tex;
        }

        private static float Frac(float v) => v - Mathf.Floor(v);

        private static float[] Noise(System.Random rnd)
        {
            var n = new float[256];
            for (int i = 0; i < n.Length; i++) n[i] = (float)rnd.NextDouble();
            // Suavizar un poco (manchas en vez de ruido).
            var o = new float[256];
            for (int y = 0; y < 16; y++)
            for (int x = 0; x < 16; x++)
            {
                float sum = 0f;
                for (int dy = -1; dy <= 1; dy++)
                for (int dx = -1; dx <= 1; dx++) sum += n[((y + dy + 16) % 16) * 16 + ((x + dx + 16) % 16)];
                o[y * 16 + x] = sum / 9f;
            }
            float min = 1f, max = 0f;
            foreach (var v in o) { min = Mathf.Min(min, v); max = Mathf.Max(max, v); }
            for (int i = 0; i < o.Length; i++) o[i] = (o[i] - min) / Mathf.Max(0.001f, max - min);
            return o;
        }
    }

    /// <summary>
    /// Modelos de las motos hechos con primitivas. Cada clase tiene su forma: motocross, enduro (faro y
    /// cubremanos), trial (sin asiento, muy ligera), supermotard (ruedas lisas), deportiva (carenado y
    /// cúpula), chopper (horquilla larga y cromo), eléctrica (batería y luces de neón), quad (cuatro ruedas),
    /// moto de nieve (esquí y oruga) y rally (torre de navegación y depósito grande).
    /// Las piezas que la vista mueve tienen siempre los mismos nombres (docs/04-lista-assets.md §1).
    /// </summary>
    public static class BikeModelFactory
    {
        private const PrimitiveType Box = PrimitiveType.Cube;
        private const PrimitiveType Cyl = PrimitiveType.Cylinder;

        public static BikeView Create(BikeParams p, Transform parent, BikeDef def, bool ghost = false)
        {
            var root = new GameObject("Bike");
            root.transform.SetParent(parent, false);
            var view = root.AddComponent<BikeView>();
            string style = def.Style ?? "mx";
            float k = def.Size;

            Color primary = new Color(def.BodyR, def.BodyG, def.BodyB), secondary = LiveryTextures.Rgb(def.Secondary), accent = LiveryTextures.Rgb(def.Accent);
            bool glowy = def.Livery == "neon" || def.Livery == "carbon" || style == "electric";
            bool gold = def.Livery == "gold";
            bool chromeBody = style == "chopper";

            var body = MaterialFactory.Lit("skin_body_" + def.Id, Color.white, gold ? 1f : 0.1f, gold ? 0.9f : 0.82f,
                LiveryTextures.Get(def), null, null, glowy ? accent * 2.2f : (Color?)null, glowy ? LiveryTextures.Get(def, true) : null);
            var sec = MaterialFactory.Lit("skin_sec_" + def.Id, secondary, gold ? 0.8f : 0.05f, 0.7f);
            var acc = MaterialFactory.Lit("skin_acc_" + def.Id, accent, 0.3f, 0.75f, emission: glowy ? accent * 2.5f : (Color?)null);
            var frameMat = gold ? MaterialFactory.Lit("bike_frame_gold", new Color(0.9f, 0.7f, 0.25f), 1f, 0.85f)
                         : chromeBody ? MaterialFactory.Lit("bike_chrome", new Color(0.95f, 0.95f, 0.95f), 1f, 0.93f)
                         : MaterialFactory.Lit("bike_frame", new Color(0.12f, 0.12f, 0.13f), 0.6f, 0.55f);
            var alu = MaterialFactory.Lit("bike_alu", new Color(0.78f, 0.79f, 0.8f), 1f, 0.7f);
            var chrome = MaterialFactory.Lit("bike_chrome", new Color(0.95f, 0.95f, 0.95f), 1f, 0.93f);
            var forkGold = MaterialFactory.Lit("bike_fork_gold", new Color(0.86f, 0.62f, 0.2f), 1f, 0.8f);
            var rubber = MaterialFactory.Lit("bike_rubber", new Color(0.05f, 0.05f, 0.05f), 0f, 0.25f);
            var seatMat = MaterialFactory.Lit("bike_seat", new Color(0.08f, 0.08f, 0.09f), 0f, 0.45f);
            var engineMat = MaterialFactory.Lit("bike_engine", new Color(0.3f, 0.3f, 0.32f), 0.8f, 0.5f);
            var glass = MaterialFactory.Lit("bike_glass", new Color(0.55f, 0.75f, 0.9f), 0.2f, 0.95f);
            var lamp = MaterialFactory.Lit("bike_lamp", new Color(1f, 0.97f, 0.85f), 0f, 0.9f, emission: new Color(3f, 2.8f, 2.2f));
            var tail = MaterialFactory.Lit("bike_taillight", new Color(1f, 0.1f, 0.05f), 0f, 0.8f, emission: new Color(3f, 0.2f, 0.1f));
            Material rimMat = gold ? frameMat : glowy ? acc : alu;

            var chassis = new GameObject("Chassis").transform;
            chassis.SetParent(root.transform, false);
            view.Chassis = chassis;
            var plastics = new List<Renderer>();
            GameObject Part(PrimitiveType t, string n, Vector3 pos, Vector3 scale, Material m, float rotZ = 0f, bool plastic = false, Vector3? euler = null)
            {
                var go = SimConvert.Primitive(t, n, chassis, pos * k, scale * k, m, euler.HasValue ? Quaternion.Euler(euler.Value) : Quaternion.Euler(0, 0, rotZ));
                if (plastic) plastics.Add(go.GetComponent<Renderer>());
                return go;
            }

            // ---- Bastidor y motor (comunes, con variaciones) ----
            bool sport = style == "sport", chopper = style == "chopper", trial = style == "trial", electric = style == "electric";
            bool quad = style == "quad", snow = style == "snow", rally = style == "rally", enduro = style == "enduro", sm = style == "supermoto";
            Part(Box, "Frame_Spine", new Vector3(0.1f, trial ? 0.08f : 0.15f, 0f), new Vector3(0.75f, 0.06f, 0.08f), frameMat, trial ? -10f : -18f);
            Part(Box, "Frame_Down", new Vector3(0.28f, -0.1f, 0f), new Vector3(0.06f, 0.55f, 0.08f), frameMat, -28f);
            if (electric)
            {
                // Batería con franjas de luz y motor eléctrico en el basculante.
                Part(Box, "Battery", new Vector3(0.05f, -0.12f, 0f), new Vector3(0.52f, 0.34f, 0.26f), sec);
                Part(Box, "Battery_Glow", new Vector3(0.05f, -0.12f, -0.135f), new Vector3(0.46f, 0.03f, 0.01f), acc);
                Part(Box, "Battery_Glow2", new Vector3(0.05f, -0.2f, -0.135f), new Vector3(0.46f, 0.03f, 0.01f), acc);
                Part(Cyl, "EMotor", new Vector3(-0.2f, -0.24f, -0.06f), new Vector3(0.2f, 0.08f, 0.2f), alu, euler: new Vector3(90, 0, 0));
            }
            else
            {
                Part(Box, "Engine", new Vector3(0.02f, -0.18f, 0f), new Vector3(chopper ? 0.46f : 0.36f, 0.3f, 0.24f), chopper ? chrome : engineMat);
                if (chopper)
                {
                    // Bicilíndrico en V cromado.
                    Part(Cyl, "Cyl_Front", new Vector3(0.16f, 0.04f, 0f), new Vector3(0.16f, 0.16f, 0.16f), chrome, -30f);
                    Part(Cyl, "Cyl_Rear", new Vector3(-0.06f, 0.04f, 0f), new Vector3(0.16f, 0.16f, 0.16f), chrome, 30f);
                }
                else Part(Cyl, "Engine_Cylinder", new Vector3(0.12f, 0.02f, 0f), new Vector3(0.16f, 0.12f, 0.16f), alu, -20f);
                Part(Box, "Radiator", new Vector3(0.3f, 0.06f, -0.13f), new Vector3(0.16f, 0.2f, 0.02f), engineMat, -20f);
            }

            // ---- Depósito, asiento, laterales ----
            float tankLen = rally ? 0.6f : trial ? 0.22f : chopper ? 0.46f : 0.42f;
            float tankH = rally ? 0.24f : chopper ? 0.2f : 0.16f;
            plastics.Add(Part(chopper ? PrimitiveType.Capsule : Box, "Tank", new Vector3(0.18f, trial ? 0.16f : 0.24f, 0f),
                chopper ? new Vector3(0.24f, 0.26f, 0.26f) : new Vector3(tankLen, tankH, 0.26f), body, chopper ? 80f : -8f).GetComponent<Renderer>());
            if (!trial)
            {
                float seatY = chopper ? 0.12f : sport ? 0.3f : 0.25f;
                plastics.Add(Part(Box, "Seat", new Vector3(chopper ? -0.25f : -0.3f, seatY, 0f), new Vector3(chopper ? 0.4f : 0.62f, chopper ? 0.09f : 0.06f, 0.2f), seatMat, chopper ? 0f : 4f).GetComponent<Renderer>());
            }
            else Part(Box, "SeatPad", new Vector3(-0.42f, 0.24f, 0f), new Vector3(0.2f, 0.04f, 0.14f), seatMat, 8f);

            if (sport)
            {
                // Carenado completo, cúpula y colín.
                Part(Box, "Fairing", new Vector3(0.2f, -0.02f, 0f), new Vector3(0.8f, 0.42f, 0.3f), body, -6f, true);
                Part(Box, "Fairing_Nose", new Vector3(0.6f, 0.25f, 0f), new Vector3(0.28f, 0.22f, 0.26f), body, -35f, true);
                Part(Box, "Screen", new Vector3(0.6f, 0.43f, 0f), new Vector3(0.24f, 0.02f, 0.2f), glass, 45f);
                Part(Box, "Tail", new Vector3(-0.58f, 0.36f, 0f), new Vector3(0.5f, 0.12f, 0.2f), body, 12f, true);
                Part(Box, "TailLight", new Vector3(-0.84f, 0.42f, 0f), new Vector3(0.04f, 0.05f, 0.16f), tail);
                Part(Box, "Headlight", new Vector3(0.74f, 0.2f, 0f), new Vector3(0.04f, 0.07f, 0.18f), lamp, -35f);
                Part(Box, "Stripe", new Vector3(0.2f, 0.05f, -0.152f), new Vector3(0.7f, 0.04f, 0.005f), acc, -6f);
            }
            else if (chopper)
            {
                Part(Box, "RearFender", new Vector3(-0.72f, 0.12f, 0f), new Vector3(0.42f, 0.04f, 0.26f), body, 18f, true);
                Part(Cyl, "SissyBar", new Vector3(-0.5f, 0.38f, 0f), new Vector3(0.03f, 0.2f, 0.03f), chrome, 10f);
                Part(Cyl, "Pipe_Low", new Vector3(-0.25f, -0.24f, -0.16f), new Vector3(0.06f, 0.5f, 0.06f), chrome, 88f);
                Part(Cyl, "Pipe_High", new Vector3(-0.22f, -0.12f, -0.17f), new Vector3(0.06f, 0.5f, 0.06f), chrome, 86f);
                Part(Cyl, "Headlight", new Vector3(0.72f, 0.42f, 0f), new Vector3(0.18f, 0.05f, 0.18f), lamp, euler: new Vector3(0, 0, 90));
            }
            else if (quad)
            {
                Part(Box, "Body_Front", new Vector3(0.48f, 0.2f, 0f), new Vector3(0.5f, 0.12f, 0.9f), body, -8f, true);
                Part(Box, "Body_Rear", new Vector3(-0.5f, 0.24f, 0f), new Vector3(0.55f, 0.08f, 0.9f), body, 4f, true);
                Part(Box, "Rack_Front", new Vector3(0.5f, 0.3f, 0f), new Vector3(0.36f, 0.03f, 0.6f), frameMat);
                Part(Box, "Rack_Rear", new Vector3(-0.55f, 0.32f, 0f), new Vector3(0.4f, 0.03f, 0.6f), frameMat);
                Part(Box, "Bumper", new Vector3(0.78f, 0.0f, 0f), new Vector3(0.05f, 0.2f, 0.6f), sec);
                Part(Box, "Headlight", new Vector3(0.74f, 0.2f, -0.2f), new Vector3(0.03f, 0.06f, 0.12f), lamp);
                Part(Box, "Headlight2", new Vector3(0.74f, 0.2f, 0.2f), new Vector3(0.03f, 0.06f, 0.12f), lamp);
            }
            else if (snow)
            {
                Part(Box, "Hood", new Vector3(0.48f, 0.08f, 0f), new Vector3(0.62f, 0.3f, 0.5f), body, -14f, true);
                Part(Box, "Screen", new Vector3(0.36f, 0.34f, 0f), new Vector3(0.16f, 0.02f, 0.36f), glass, 50f);
                Part(Box, "Side", new Vector3(-0.2f, -0.02f, 0f), new Vector3(0.9f, 0.2f, 0.46f), sec, 0f, true);
                Part(Box, "Headlight", new Vector3(0.76f, 0.1f, 0f), new Vector3(0.03f, 0.06f, 0.24f), lamp, -14f);
                Part(Box, "Stripe", new Vector3(0.45f, 0.06f, -0.252f), new Vector3(0.5f, 0.05f, 0.005f), acc, -14f);
            }
            else
            {
                // Motocross / enduro / trial / supermotard / rally / eléctrica: plásticos de MX.
                Part(Box, "SidePanel_L", new Vector3(-0.32f, 0.12f, 0.12f), new Vector3(0.42f, 0.18f, 0.02f), sec, 0f, true);
                Part(Box, "SidePanel_R", new Vector3(-0.32f, 0.12f, -0.12f), new Vector3(0.42f, 0.18f, 0.02f), sec, 0f, true);
                Part(Box, "Fender_Rear", new Vector3(trial ? -0.62f : -0.78f, trial ? 0.2f : 0.24f, 0f), new Vector3(trial ? 0.3f : 0.5f, 0.025f, 0.16f), body, 12f, true);
                Part(Box, "Shroud_L", new Vector3(0.33f, 0.16f, 0.14f), new Vector3(0.28f, 0.2f, 0.02f), body, -25f, true);
                Part(Box, "Shroud_R", new Vector3(0.33f, 0.16f, -0.14f), new Vector3(0.28f, 0.2f, 0.02f), body, -25f, true);
                if (!rally && !enduro) Part(Box, "NumberPlate", new Vector3(0.6f, 0.42f, 0f), new Vector3(0.04f, 0.2f, 0.22f), sec, -25f, true);
                if (enduro || rally)
                {
                    Part(Cyl, "Headlight", new Vector3(0.64f, 0.38f, 0f), new Vector3(0.14f, 0.03f, 0.14f), lamp, euler: new Vector3(0, 0, 65));
                    Part(Box, "LightMask", new Vector3(0.62f, 0.4f, 0f), new Vector3(0.05f, 0.26f, 0.24f), body, -25f, true);
                    Part(Box, "BashPlate", new Vector3(0.05f, -0.36f, 0f), new Vector3(0.42f, 0.03f, 0.22f), alu, 6f);
                    Part(Box, "TailLight", new Vector3(-1.0f, 0.28f, 0f), new Vector3(0.03f, 0.04f, 0.1f), tail, 12f);
                }
                if (rally)
                {
                    Part(Box, "Tower", new Vector3(0.58f, 0.58f, 0f), new Vector3(0.14f, 0.22f, 0.26f), sec, -20f);
                    Part(Box, "Screen", new Vector3(0.66f, 0.72f, 0f), new Vector3(0.03f, 0.2f, 0.24f), glass, -20f);
                    Part(Box, "RoadBook", new Vector3(0.48f, 0.62f, 0f), new Vector3(0.12f, 0.04f, 0.16f), engineMat, -20f);
                    Part(Box, "Rack", new Vector3(-0.85f, 0.32f, 0f), new Vector3(0.3f, 0.025f, 0.22f), frameMat, 4f);
                }
                if (trial) Part(Box, "RadiatorTrial", new Vector3(0.36f, -0.02f, 0f), new Vector3(0.12f, 0.24f, 0.18f), engineMat, -22f);
                if (electric)
                {
                    Part(Box, "Neon_Spine", new Vector3(0.1f, 0.2f, -0.06f), new Vector3(0.7f, 0.015f, 0.01f), acc, -18f);
                    Part(Box, "TailLight", new Vector3(-1.0f, 0.28f, 0f), new Vector3(0.03f, 0.03f, 0.14f), acc, 12f);
                }
            }

            // ---- Escape (lado de la cámara) ----
            var tip = new GameObject("ExhaustTip").transform;
            tip.SetParent(chassis, false);
            if (!electric && !chopper && !sport)
            {
                Part(Cyl, "Exhaust_Header", new Vector3(0.2f, -0.1f, -0.15f), new Vector3(0.06f, 0.18f, 0.06f), chrome, 40f);
                Part(Cyl, "Exhaust_Muffler", new Vector3(-0.5f, 0.12f, -0.15f), new Vector3(0.1f, 0.24f, 0.1f), gold ? frameMat : alu, 78f);
                tip.localPosition = new Vector3(-0.76f, 0.17f, -0.15f) * k;
            }
            else if (sport)
            {
                Part(Cyl, "Exhaust_Under", new Vector3(-0.62f, 0.26f, -0.07f), new Vector3(0.08f, 0.14f, 0.08f), chrome, 80f);
                tip.localPosition = new Vector3(-0.78f, 0.28f, -0.07f) * k;
            }
            else tip.localPosition = new Vector3(-0.7f, -0.2f, -0.17f) * k;
            view.ExhaustTip = tip;

            // ---- Dorsal en el lateral y en el frontal ----
            if (!quad && !snow) Number(chassis, def.Number, new Vector3(-0.33f, 0.13f, -0.135f) * k, 0.06f * k, secondary.grayscale > 0.5f ? Color.black : Color.white);

            // ---- Horquilla y manillar ----
            float forkRad = (p.forkAngleDeg + (chopper ? 12f : 0f)) * Mathf.Deg2Rad;
            Vector3 forkAxis = new Vector3(Mathf.Sin(forkRad), -Mathf.Cos(forkRad), 0f);
            Vector3 axleExt = new Vector3(p.frontAxleExtended.x, p.frontAxleExtended.y, 0f);
            Vector3 forkTop = axleExt - forkAxis * (p.frontTravel + (chopper ? 0.85f : 0.62f));
            var upperMat = sport || sm ? MaterialFactory.Lit("bike_fork_black", new Color(0.1f, 0.1f, 0.11f), 0.8f, 0.7f) : chopper ? chrome : forkGold;
            for (int side = -1; side <= 1; side += 2)
            {
                var tube = SimConvert.Primitive(Cyl, "ForkUpper", chassis, Vector3.zero, Vector3.one, upperMat);
                tube.transform.localPosition = forkTop + forkAxis * (chopper ? 0.34f : 0.22f) + new Vector3(0, 0, side * 0.09f);
                tube.transform.localRotation = Quaternion.FromToRotation(Vector3.up, -forkAxis);
                tube.transform.localScale = new Vector3(0.055f, chopper ? 0.36f : 0.24f, 0.055f);
            }
            float barH = chopper ? 0.32f : trial ? 0.16f : sport ? -0.02f : 0.08f;
            SimConvert.Primitive(Cyl, "Handlebar", chassis, forkTop + new Vector3(-0.05f, barH, 0f), new Vector3(0.025f, quad ? 0.5f : 0.38f, 0.025f), chopper ? chrome : alu, Quaternion.Euler(90, 0, 0));
            if (chopper)
            {
                SimConvert.Primitive(Cyl, "ApeHanger", chassis, forkTop + new Vector3(-0.05f, 0.16f, -0.18f), new Vector3(0.025f, 0.16f, 0.025f), chrome);
                SimConvert.Primitive(Cyl, "ApeHanger", chassis, forkTop + new Vector3(-0.05f, 0.16f, 0.18f), new Vector3(0.025f, 0.16f, 0.025f), chrome);
            }
            if (enduro || rally)
                SimConvert.Primitive(Box, "HandGuard", chassis, forkTop + new Vector3(0.0f, barH, -0.2f), new Vector3(0.14f, 0.07f, 0.02f), body);
            SimConvert.Primitive(Box, "TripleClamp", chassis, forkTop, new Vector3(0.08f, 0.04f, 0.24f), alu);
            if (!sport && !quad && !snow && !chopper)
            {
                // Guardabarros delantero: alto en campo, pegado a la rueda en supermotard.
                var ff = SimConvert.Primitive(Box, "Fender_Front", chassis, forkTop + forkAxis * (sm ? 0.62f : 0.52f) + new Vector3(0.12f, 0f, 0f), new Vector3(0.42f, 0.02f, 0.14f), body, Quaternion.Euler(0, 0, -12));
                plastics.Add(ff.GetComponent<Renderer>());
            }

            // ---- Horquilla inferior (se mueve con la rueda) ----
            var forkLower = new GameObject("ForkLower").transform;
            forkLower.SetParent(root.transform, false);
            for (int side = -1; side <= 1; side += 2)
            {
                var lower = SimConvert.Primitive(Cyl, "ForkLeg", forkLower, Vector3.zero, Vector3.one, sport || sm ? forkGold : alu);
                lower.transform.localPosition = -forkAxis * 0.24f + new Vector3(0, 0, side * (quad ? 0.35f : 0.09f));
                lower.transform.localRotation = Quaternion.FromToRotation(Vector3.up, -forkAxis);
                lower.transform.localScale = new Vector3(0.07f, 0.26f, 0.07f);
            }
            if (snow)
            {
                // Esquí delantero (la rueda delantera no se ve).
                SimConvert.Primitive(Box, "Ski", forkLower, new Vector3(0.05f, -p.frontWheelRadius + 0.04f, 0f), new Vector3(0.9f, 0.04f, 0.16f), sec);
                SimConvert.Primitive(Box, "SkiTip", forkLower, new Vector3(0.52f, -p.frontWheelRadius + 0.12f, 0f), new Vector3(0.22f, 0.04f, 0.16f), sec, Quaternion.Euler(0, 0, 35));
            }
            view.ForkLower = forkLower;

            // ---- Basculante ----
            view.SwingarmPivotLocal = new Vector3(-0.16f, -0.28f, 0f) * k;
            var swing = new GameObject("Swingarm").transform;
            swing.SetParent(root.transform, false);
            float armLen = Vector2.Distance(new Vector2(-0.16f, -0.28f) * k, p.rearAxleExtended.ToV2()) + 0.03f;
            for (int side = -1; side <= 1; side += 2)
                SimConvert.Primitive(Box, "SwingarmSide", swing, new Vector3(-armLen * 0.5f, 0f, side * (quad ? 0.3f : 0.08f)), new Vector3(armLen, 0.07f, 0.035f), gold ? frameMat : alu);
            if (snow)
            {
                // Oruga: banda de goma alrededor de la rueda trasera.
                SimConvert.Primitive(PrimitiveType.Capsule, "Track", swing, new Vector3(-armLen * 0.55f, -0.05f, 0f), new Vector3(p.rearWheelRadius * 2.1f, armLen * 0.75f, 0.4f), rubber, Quaternion.Euler(0, 0, 90));
            }
            Part(Cyl, "Shock", new Vector3(-0.22f, -0.02f, 0f), new Vector3(0.05f, 0.16f, 0.05f), electric ? acc : forkGold, -30f);
            view.Swingarm = swing;

            // ---- Ruedas ----
            bool knobs = !sm && !sport && !chopper;
            float[] zs = quad ? new[] { -0.36f, 0.36f } : new[] { 0f };
            float tireW = sport || chopper ? 0.09f : quad ? 0.14f : 0.055f;
            view.FrontWheel = CreateWheel("WheelFront", root.transform, p.frontWheelRadius, rubber, rimMat, chrome, zs, snow ? 0f : tireW, knobs, sport || sm || chopper);
            view.RearWheel = CreateWheel("WheelRear", root.transform, p.rearWheelRadius, rubber, rimMat, chrome, zs, chopper ? 0.13f : tireW, knobs || snow, sport || sm || chopper);

            view.Plastics = plastics.ToArray();
            view.CacheColors();

            if (ghost)
            {
                var gm = MaterialFactory.Particles("ghost_bike", Texture2D.whiteTexture, new Color(0.2f, 0.9f, 1f, 0.35f));
                foreach (var r in root.GetComponentsInChildren<Renderer>()) r.sharedMaterial = gm;
                foreach (var t in root.GetComponentsInChildren<TextMesh>()) t.gameObject.SetActive(false);
            }
            return view;
        }

        /// <summary>Dorsal con números de verdad (TextMesh) pegado al lateral.</summary>
        private static void Number(Transform parent, int number, Vector3 pos, float size, Color color)
        {
            if (number <= 0) return;
            var go = new GameObject("Number");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            var tm = go.AddComponent<TextMesh>();
            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            tm.font = font; tm.text = number.ToString(); tm.fontSize = 64; tm.characterSize = size * 0.25f;
            tm.anchor = TextAnchor.MiddleCenter; tm.alignment = TextAlignment.Center; tm.fontStyle = FontStyle.BoldAndItalic;
            tm.color = color;
            go.GetComponent<MeshRenderer>().sharedMaterial = font.material;
        }

        private static Transform CreateWheel(string name, Transform parent, float radius, Material rubber, Material rim, Material disc,
                                             float[] zOffsets, float tireWidth, bool knobs, bool bigDisc)
        {
            var w = new GameObject(name).transform;
            w.SetParent(parent, false);
            if (tireWidth <= 0f) return w; // moto de nieve: sin rueda delantera visible
            var axisRot = Quaternion.Euler(90f, 0f, 0f);
            var spokeMat = MaterialFactory.Lit("bike_spoke", new Color(0.7f, 0.7f, 0.72f), 1f, 0.6f);
            foreach (float z in zOffsets)
            {
                SimConvert.Primitive(Cyl, "Tire", w, new Vector3(0, 0, z), new Vector3(radius * 2f, tireWidth, radius * 2f), rubber, axisRot);
                SimConvert.Primitive(Cyl, "Rim", w, new Vector3(0, 0, z), new Vector3(radius * 1.62f, tireWidth + 0.005f, radius * 1.62f), rim, axisRot);
                SimConvert.Primitive(Cyl, "Hub", w, new Vector3(0, 0, z), new Vector3(0.1f, tireWidth + 0.03f, 0.1f), rim, axisRot);
                SimConvert.Primitive(Cyl, "Disc", w, new Vector3(0, 0, z - 0.065f), new Vector3(bigDisc ? 0.3f : 0.22f, 0.004f, bigDisc ? 0.3f : 0.22f), disc, axisRot);
                // Radios (o brazos de llanta en motos de calle): muestran el giro.
                int spokes = bigDisc ? 5 : 8;
                for (int i = 0; i < spokes; i++)
                {
                    float a = i * 180f / spokes;
                    SimConvert.Primitive(Box, "Spoke", w, new Vector3(0, 0, z - 0.035f), new Vector3(radius * 1.55f, bigDisc ? 0.04f : 0.008f, 0.008f), bigDisc ? rim : spokeMat, Quaternion.Euler(0, 0, a));
                }
                if (!knobs) continue;
                for (int i = 0; i < 18; i++)
                {
                    float a = i * 20f * Mathf.Deg2Rad;
                    var pos = new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f) * radius + new Vector3(0, 0, z);
                    SimConvert.Primitive(Box, "Knob", w, pos, new Vector3(0.03f, 0.03f, tireWidth * 2.2f), rubber, Quaternion.Euler(0, 0, i * 20f));
                }
            }
            return w;
        }
    }
}
