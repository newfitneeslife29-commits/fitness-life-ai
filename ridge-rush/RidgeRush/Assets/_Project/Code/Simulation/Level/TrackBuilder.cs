using System;
using System.Collections.Generic;

namespace RidgeRush.Simulation
{
    /// <summary>Resultado de construir un nivel: la pista física y datos derivados.</summary>
    public sealed class BuiltLevel
    {
        public LevelData Data;
        public Track Track;
        /// <summary>Puntos del suelo principal (para generar la malla 3D).</summary>
        public Vec2[] GroundPoints;
        public SurfaceType[] GroundSurfaces;
        public float FinishX;
        public float KillY;
        public HazardData[] Hazards;
    }

    /// <summary>Convierte las secciones de un <see cref="LevelData"/> en la pista física.</summary>
    public static class TrackBuilder
    {
        private const float SampleStep = 0.5f; // m entre puntos en curvas
        private const float WallWidth = 0.02f; // las paredes verticales tienen un mínimo de anchura

        public static BuiltLevel Build(LevelData data)
        {
            if (data == null) throw new ArgumentNullException(nameof(data));
            var pts = new List<Vec2>();
            var surf = new List<SurfaceType>();
            var hazards = new List<HazardData>(data.hazards ?? Array.Empty<HazardData>());

            // Pared y zona de salida a la izquierda.
            pts.Add(new Vec2(-12f, 12f));
            pts.Add(new Vec2(-12f + WallWidth, 0f));
            surf.Add(SurfaceType.Metal);
            float x = -12f + WallWidth, y = 0f;
            float finishX = float.NaN;
            float minY = 0f;

            void Line(float nx, float ny, SurfaceType s)
            {
                pts.Add(new Vec2(nx, ny)); surf.Add(s);
                x = nx; y = ny; minY = Math.Min(minY, ny);
            }

            void Curve(float length, float height, Func<float, float> shape, SurfaceType s)
            {
                int n = Math.Max(1, (int)Math.Ceiling(length / SampleStep));
                float x0 = x, y0 = y;
                for (int i = 1; i <= n; i++)
                {
                    float t = i / (float)n;
                    Line(x0 + length * t, y0 + height * shape(t), s);
                }
            }

            // Tramo inicial hasta x = 0.
            Line(0f, 0f, SurfaceType.Dirt);

            foreach (var sec in data.sections ?? Array.Empty<SectionData>())
            {
                var s = ParseSurface(sec.surface);
                float L = Math.Max(0.1f, sec.length), H = sec.height;
                switch ((sec.type ?? "flat").ToLowerInvariant())
                {
                    case "flat":
                        Line(x + L, y, s);
                        break;
                    case "slope":
                        Curve(L, H, SimMath.SmoothStep, s);
                        break;
                    case "ramp": // kicker cóncavo, termina en el labio a +H
                        Curve(L, H, t => MathF.Pow(t, 1.7f), s);
                        break;
                    case "landing": // bajada convexa, empinada al principio y suave al final
                        Curve(L, -Math.Abs(H), t => 1f - (1f - t) * (1f - t), s);
                        break;
                    case "drop":
                        Line(x + WallWidth, y - Math.Abs(H), s);
                        break;
                    case "step":
                        Line(x + WallWidth, y + Math.Abs(H), s);
                        Line(x + Math.Max(0.5f, L), y, s);
                        break;
                    case "gap":
                    {
                        float depth = Math.Max(0.5f, sec.depth);
                        var pitSurface = sec.pit == "water" ? SurfaceType.Water : s;
                        float top = y;
                        Line(x + WallWidth, y - depth, s);
                        float pitX0 = x;
                        Line(x + L, y, pitSurface);
                        float pitX1 = x;
                        Line(x + WallWidth, top, s);
                        if (sec.pit == "water" || sec.pit == "lava")
                            hazards.Add(new HazardData { type = sec.pit, x0 = pitX0, x1 = pitX1, yTop = top - depth + Math.Min(1.2f, depth * 0.5f) });
                        break;
                    }
                    case "bumps":
                    {
                        int count = Math.Max(1, sec.count);
                        Curve(L, Math.Abs(H), t => 0.5f - 0.5f * MathF.Cos(t * count * SimMath.TwoPi), s);
                        break;
                    }
                    case "stairs":
                    {
                        int count = Math.Max(1, sec.count);
                        float stepLen = L / count;
                        for (int i = 0; i < count; i++)
                        {
                            Line(x + WallWidth, y + H, s);
                            Line(x + stepLen - WallWidth, y, s);
                        }
                        break;
                    }
                    case "table": // subida, meseta y bajada
                        Curve(L * 0.3f, Math.Abs(H), t => MathF.Pow(t, 1.5f), s);
                        Line(x + L * 0.4f, y, s);
                        Curve(L * 0.3f, -Math.Abs(H), t => 1f - (1f - t) * (1f - t), s);
                        break;
                    case "finish":
                        finishX = x + 2f;
                        Line(x + L, y, s);
                        break;
                    default:
                        throw new FormatException($"Tipo de sección desconocido: '{sec.type}' en el nivel {data.id}.");
                }
            }

            if (float.IsNaN(finishX)) { finishX = x; Line(x + 15f, y, SurfaceType.Dirt); }
            // Zona de frenada y pared final.
            Line(x + 25f, y, SurfaceType.Dirt);
            Line(x + WallWidth, y + 12f, SurfaceType.Metal);

            var track = new Track();
            var ground = new TrackChain(pts.ToArray(), surf.ToArray());
            track.Add(ground);

            foreach (var p in data.platforms ?? Array.Empty<PlatformData>())
            {
                // Plataforma como rectángulo cerrado en sentido horario (normales hacia fuera).
                float w = p.width, th = Math.Max(0.1f, p.thickness);
                var s = ParseSurface(p.surface);
                var rect = new[]
                {
                    new Vec2(0f, 0f), new Vec2(w, 0f), new Vec2(w, -th), new Vec2(0f, -th), new Vec2(0f, 0f),
                };
                var rs = new[] { s, s, s, s };
                var motion = ParseMotion(p.motion);
                track.Add(new TrackChain(rect, rs, motion, new Vec2(p.x, p.y), new Vec2(p.dx, p.dy), p.period, p.delay));
                minY = Math.Min(minY, p.y + Math.Min(0f, p.dy) - th);
            }

            track.Build();
            return new BuiltLevel
            {
                Data = data, Track = track,
                GroundPoints = ground.Points, GroundSurfaces = ground.Surfaces,
                FinishX = finishX, KillY = minY - 15f, Hazards = hazards.ToArray(),
            };
        }

        public static SurfaceType ParseSurface(string name) =>
            Enum.TryParse(name, true, out SurfaceType s) ? s : SurfaceType.Dirt;

        private static ChainMotion ParseMotion(string name) =>
            Enum.TryParse(name, true, out ChainMotion m) ? m : ChainMotion.Static;
    }
}
