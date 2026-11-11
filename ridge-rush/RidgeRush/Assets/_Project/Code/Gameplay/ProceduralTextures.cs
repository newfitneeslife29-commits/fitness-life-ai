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
        private static Texture2D _grain, _grainNormal, _planks, _planksNormal, _softDot, _windows, _crowd;

        /// <summary>Fachada con ventanas (algunas encendidas): para los edificios de la ciudad (albedo y emisión).</summary>
        public static Texture2D Windows
        {
            get
            {
                if (_windows != null) return _windows;
                const int s = 64;
                _windows = new Texture2D(s, s, TextureFormat.RGBA32, true) { name = "windows", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
                var px = new Color32[s * s];
                var rnd = new System.Random(5);
                for (int cy = 0; cy < 8; cy++)
                for (int cx = 0; cx < 8; cx++)
                {
                    bool lit = rnd.NextDouble() < 0.45;
                    var c = lit ? (rnd.NextDouble() < 0.7 ? new Color32(255, 214, 150, 255) : new Color32(150, 210, 255, 255)) : new Color32(18, 20, 26, 255);
                    for (int y = 0; y < 8; y++)
                    for (int x = 0; x < 8; x++)
                    {
                        bool frame = x < 2 || y < 2;
                        px[(cy * 8 + y) * s + cx * 8 + x] = frame ? new Color32(8, 8, 10, 255) : c;
                    }
                }
                _windows.SetPixels32(px);
                _windows.Apply(true, true);
                return _windows;
            }
        }

        /// <summary>Público de las gradas: puntos de colores sobre fondo oscuro.</summary>
        public static Texture2D Crowd
        {
            get
            {
                if (_crowd != null) return _crowd;
                const int s = 64;
                _crowd = new Texture2D(s, s, TextureFormat.RGBA32, true) { name = "crowd", wrapMode = TextureWrapMode.Repeat };
                var px = new Color32[s * s];
                var rnd = new System.Random(9);
                var palette = new[] { new Color32(230, 80, 40, 255), new Color32(40, 200, 240, 255), new Color32(240, 200, 60, 255), new Color32(220, 220, 220, 255), new Color32(60, 60, 70, 255) };
                for (int i = 0; i < px.Length; i++) px[i] = new Color32(30, 30, 36, 255);
                for (int cy = 0; cy < 16; cy++)
                for (int cx = 0; cx < 16; cx++)
                {
                    var c = palette[rnd.Next(palette.Length)];
                    for (int y = 1; y < 4; y++)
                    for (int x = 1; x < 3; x++)
                        px[(cy * 4 + y) * s + cx * 4 + x] = c;
                }
                _crowd.SetPixels32(px);
                _crowd.Apply(true, true);
                return _crowd;
            }
        }

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
