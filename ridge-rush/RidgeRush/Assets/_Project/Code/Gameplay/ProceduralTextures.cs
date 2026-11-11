using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Texturas generadas al arrancar para el prototipo (grano de arena/tierra, tablones, partícula suave).
    /// Se sustituirán por texturas PBR de arte. Se crean una sola vez y se comparten.
    /// </summary>
    public static class ProceduralTextures
    {
        private const int Size = 256;
        private static Texture2D _grain, _grainNormal, _planks, _planksNormal, _softDot;

        public static Texture2D Grain => _grain ??= Albedo("grain", GrainHeight);
        public static Texture2D GrainNormal => _grainNormal ??= Normal("grain_n", GrainHeight, 2.5f);
        public static Texture2D Planks => _planks ??= Albedo("planks", PlankHeight);
        public static Texture2D PlanksNormal => _planksNormal ??= Normal("planks_n", PlankHeight, 4f);

        /// <summary>Punto suave con borde difuminado para partículas de polvo y humo.</summary>
        public static Texture2D SoftDot
        {
            get
            {
                if (_softDot != null) return _softDot;
                const int s = 64;
                _softDot = new Texture2D(s, s, TextureFormat.RGBA32, true) { name = "soft_dot", wrapMode = TextureWrapMode.Clamp };
                var px = new Color32[s * s];
                for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float dx = (x + 0.5f) / s * 2f - 1f, dy = (y + 0.5f) / s * 2f - 1f;
                    float d = Mathf.Sqrt(dx * dx + dy * dy);
                    float n = Mathf.PerlinNoise(x * 0.15f, y * 0.15f) * 0.35f + 0.65f;
                    byte a = (byte)(Mathf.Clamp01(1f - d) * Mathf.Clamp01(1f - d) * n * 255f);
                    px[y * s + x] = new Color32(255, 255, 255, a);
                }
                _softDot.SetPixels32(px);
                _softDot.Apply(true, true);
                return _softDot;
            }
        }

        // Ruido en mosaico (se repite sin costuras) a varias escalas.
        private static float GrainHeight(float u, float v)
        {
            float h = 0f, amp = 0.5f, freq = 8f;
            for (int o = 0; o < 4; o++)
            {
                h += amp * TileNoise(u, v, freq);
                amp *= 0.5f; freq *= 2f;
            }
            return h;
        }

        // Tablones de madera con vetas y juntas.
        private static float PlankHeight(float u, float v)
        {
            const int planks = 4;
            float pv = v * planks;
            float inPlank = pv - Mathf.Floor(pv);
            float joint = Mathf.SmoothStep(0f, 0.06f, inPlank) * Mathf.SmoothStep(0f, 0.06f, 1f - inPlank);
            float grain = TileNoise(u * 0.5f, v * 6f + Mathf.Floor(pv) * 3.1f, 16f) * 0.25f;
            return joint * (0.7f + grain);
        }

        private static float TileNoise(float u, float v, float freq)
        {
            // Mezcla de 4 muestras para que el borde coincida (textura que se repite).
            float x = u * freq, y = v * freq;
            float a = Mathf.PerlinNoise(x, y), b = Mathf.PerlinNoise(x - freq, y);
            float c = Mathf.PerlinNoise(x, y - freq), d = Mathf.PerlinNoise(x - freq, y - freq);
            return Mathf.Lerp(Mathf.Lerp(a, b, u), Mathf.Lerp(c, d, u), v);
        }

        private static Texture2D Albedo(string name, System.Func<float, float, float> height)
        {
            var t = new Texture2D(Size, Size, TextureFormat.RGBA32, true) { name = name, wrapMode = TextureWrapMode.Repeat, anisoLevel = 4 };
            var px = new Color32[Size * Size];
            for (int y = 0; y < Size; y++)
            for (int x = 0; x < Size; x++)
            {
                float h = height((float)x / Size, (float)y / Size);
                byte g = (byte)(Mathf.Lerp(0.72f, 1f, h) * 255f);
                px[y * Size + x] = new Color32(g, g, g, 255);
            }
            t.SetPixels32(px);
            t.Apply(true, true);
            return t;
        }

        private static Texture2D Normal(string name, System.Func<float, float, float> height, float strength)
        {
            var t = new Texture2D(Size, Size, TextureFormat.RGBA32, true, true) { name = name, wrapMode = TextureWrapMode.Repeat, anisoLevel = 4 };
            var h = new float[Size * Size];
            for (int y = 0; y < Size; y++)
            for (int x = 0; x < Size; x++)
                h[y * Size + x] = height((float)x / Size, (float)y / Size);
            var px = new Color32[Size * Size];
            for (int y = 0; y < Size; y++)
            for (int x = 0; x < Size; x++)
            {
                float l = h[y * Size + (x + Size - 1) % Size], r = h[y * Size + (x + 1) % Size];
                float d = h[((y + Size - 1) % Size) * Size + x], u = h[((y + 1) % Size) * Size + x];
                var n = new Vector3((l - r) * strength, (d - u) * strength, 1f).normalized;
                px[y * Size + x] = new Color32((byte)((n.x * 0.5f + 0.5f) * 255), (byte)((n.y * 0.5f + 0.5f) * 255), (byte)((n.z * 0.5f + 0.5f) * 255), 255);
            }
            t.SetPixels32(px);
            t.Apply(true, true);
            return t;
        }
    }
}
