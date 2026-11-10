using System;
using System.Collections.Generic;

namespace RidgeRush.Simulation
{
    /// <summary>Cómo se mueve una cadena de pista.</summary>
    public enum ChainMotion : byte
    {
        /// <summary>Fija (suelo, rampas).</summary>
        Static = 0,
        /// <summary>Plataforma que va y vuelve entre su posición y posición + <see cref="TrackChain.MoveDelta"/>.</summary>
        PingPong = 1,
        /// <summary>Puente que cae con la gravedad poco después de que la moto pase por encima.</summary>
        Collapse = 2,
    }

    /// <summary>Contacto entre un círculo y la pista.</summary>
    public struct TrackHit
    {
        public Vec2 Point;          // punto de la pista más cercano
        public Vec2 Normal;         // apunta desde la pista hacia el círculo
        public float Depth;         // penetración (> 0)
        public SurfaceType Surface;
        public Vec2 SurfaceVelocity; // velocidad de la pista en ese punto (plataformas móviles)
        public int Chain;
    }

    /// <summary>
    /// Polilínea de pista. Los puntos van de izquierda a derecha (o en sentido horario para piezas cerradas),
    /// así la normal izquierda de cada segmento apunta hacia "fuera" (hacia arriba en el suelo).
    /// </summary>
    public sealed class TrackChain
    {
        public readonly Vec2[] Points;           // en espacio local de la cadena
        public readonly SurfaceType[] Surfaces;  // una por segmento (Points.Length - 1)
        public readonly ChainMotion Motion;
        public readonly Vec2 MoveDelta;          // PingPong
        public readonly float Period;            // PingPong: segundos para ida y vuelta
        public readonly float TriggerDelay;      // Collapse: segundos desde que la moto la pisa

        public Vec2 Offset;    // posición actual de la cadena
        public Vec2 Velocity;  // velocidad actual
        public bool Triggered;
        public float TriggerTime;

        private readonly Vec2 _startOffset;
        public Vec2 LocalMin { get; }
        public Vec2 LocalMax { get; }

        public TrackChain(Vec2[] points, SurfaceType[] surfaces, ChainMotion motion = ChainMotion.Static,
                          Vec2 offset = default, Vec2 moveDelta = default, float period = 4f, float triggerDelay = 0.4f)
        {
            if (points == null || points.Length < 2) throw new ArgumentException("Una cadena necesita al menos 2 puntos.");
            if (surfaces == null || surfaces.Length != points.Length - 1) throw new ArgumentException("Debe haber una superficie por segmento.");
            Points = points; Surfaces = surfaces; Motion = motion;
            MoveDelta = moveDelta; Period = Math.Max(0.5f, period); TriggerDelay = triggerDelay;
            Offset = _startOffset = offset;

            var min = new Vec2(float.MaxValue, float.MaxValue);
            var max = new Vec2(float.MinValue, float.MinValue);
            foreach (var p in points)
            {
                min = new Vec2(Math.Min(min.x, p.x), Math.Min(min.y, p.y));
                max = new Vec2(Math.Max(max.x, p.x), Math.Max(max.y, p.y));
            }
            LocalMin = min; LocalMax = max;
        }

        public int SegmentCount => Points.Length - 1;
        public Vec2 WorldPoint(int i) => Points[i] + Offset;

        public void ResetMotion()
        {
            Offset = _startOffset; Velocity = Vec2.Zero; Triggered = false; TriggerTime = 0f;
        }

        /// <summary>Avanza el movimiento de la cadena. Es función del tiempo, así el resultado es determinista.</summary>
        public void Step(float time, float dt, float gravity)
        {
            switch (Motion)
            {
                case ChainMotion.PingPong:
                {
                    // Movimiento suave (coseno) de ida y vuelta.
                    float phase = time / Period * SimMath.TwoPi;
                    float s = 0.5f - 0.5f * MathF.Cos(phase);
                    float ds = 0.5f * MathF.Sin(phase) * SimMath.TwoPi / Period;
                    Offset = _startOffset + MoveDelta * s;
                    Velocity = MoveDelta * ds;
                    break;
                }
                case ChainMotion.Collapse:
                {
                    if (Triggered && time - TriggerTime > TriggerDelay)
                    {
                        Velocity = new Vec2(0f, Velocity.y - gravity * dt);
                        Offset += Velocity * dt;
                    }
                    break;
                }
            }
        }
    }

    /// <summary>
    /// Pista completa de un nivel: varias cadenas, con una rejilla por X para que las consultas sean O(1)
    /// en la práctica. No reserva memoria durante la carrera.
    /// </summary>
    public sealed class Track
    {
        private const float CellSize = 2f;

        public readonly List<TrackChain> Chains = new List<TrackChain>();
        private int[][] _cells = Array.Empty<int[]>();
        private float _minX;
        private int _cellCount = 1;
        private readonly List<int> _dynamicChains = new List<int>();

        public float MinX { get; private set; }
        public float MaxX { get; private set; }

        public void Add(TrackChain chain) => Chains.Add(chain);

        /// <summary>Construye la rejilla de búsqueda. Llamar una vez tras añadir todas las cadenas.</summary>
        public void Build()
        {
            _dynamicChains.Clear();
            MinX = float.MaxValue; MaxX = float.MinValue;
            for (int c = 0; c < Chains.Count; c++)
            {
                var ch = Chains[c];
                MinX = Math.Min(MinX, ch.LocalMin.x + ch.Offset.x);
                MaxX = Math.Max(MaxX, ch.LocalMax.x + ch.Offset.x);
                if (ch.Motion != ChainMotion.Static) _dynamicChains.Add(c);
            }
            _minX = MinX - CellSize;
            int cellCount = (int)Math.Ceiling((MaxX - _minX) / CellSize) + 2;
            _cellCount = cellCount;
            var lists = new List<int>[cellCount];
            for (int c = 0; c < Chains.Count; c++)
            {
                var ch = Chains[c];
                if (ch.Motion != ChainMotion.Static) continue;
                for (int s = 0; s < ch.SegmentCount; s++)
                {
                    float x0 = Math.Min(ch.WorldPoint(s).x, ch.WorldPoint(s + 1).x);
                    float x1 = Math.Max(ch.WorldPoint(s).x, ch.WorldPoint(s + 1).x);
                    int i0 = CellIndex(x0), i1 = CellIndex(x1);
                    for (int i = i0; i <= i1; i++) (lists[i] ??= new List<int>()).Add(Pack(c, s));
                }
            }
            _cells = new int[cellCount][];
            for (int i = 0; i < cellCount; i++) _cells[i] = lists[i]?.ToArray() ?? Array.Empty<int>();
        }

        public void ResetMotion()
        {
            foreach (var ch in Chains) ch.ResetMotion();
        }

        public void Step(float time, float dt, float gravity)
        {
            for (int i = 0; i < _dynamicChains.Count; i++) Chains[_dynamicChains[i]].Step(time, dt, gravity);
        }

        /// <summary>Marca como pisada una cadena que se derrumba.</summary>
        public void NotifyContact(int chain, float time)
        {
            var ch = Chains[chain];
            if (ch.Motion == ChainMotion.Collapse && !ch.Triggered) { ch.Triggered = true; ch.TriggerTime = time; }
        }

        /// <summary>
        /// Busca contactos de un círculo con la pista. Devuelve como mucho <paramref name="results"/>.Length contactos,
        /// descartando los que tienen casi la misma normal (vértices compartidos).
        /// </summary>
        public int QueryCircle(Vec2 center, float radius, TrackHit[] results)
        {
            int count = 0;
            int i0 = CellIndex(center.x - radius), i1 = CellIndex(center.x + radius);
            for (int i = i0; i <= i1; i++)
            {
                var cell = _cells[i];
                for (int k = 0; k < cell.Length; k++)
                {
                    Unpack(cell[k], out int c, out int s);
                    // Un segmento puede estar en varias celdas: solo se evalúa en la primera que toca el círculo.
                    var ch = Chains[c];
                    float segMinX = Math.Min(ch.WorldPoint(s).x, ch.WorldPoint(s + 1).x);
                    if (CellIndex(Math.Max(segMinX, center.x - radius)) != i) continue;
                    TestSegment(ch, c, s, center, radius, results, ref count);
                }
            }
            for (int d = 0; d < _dynamicChains.Count; d++)
            {
                int c = _dynamicChains[d];
                var ch = Chains[c];
                if (center.x + radius < ch.LocalMin.x + ch.Offset.x || center.x - radius > ch.LocalMax.x + ch.Offset.x) continue;
                if (center.y + radius < ch.LocalMin.y + ch.Offset.y || center.y - radius > ch.LocalMax.y + ch.Offset.y) continue;
                for (int s = 0; s < ch.SegmentCount; s++) TestSegment(ch, c, s, center, radius, results, ref count);
            }
            return count;
        }

        private static void TestSegment(TrackChain ch, int chainIndex, int s, Vec2 center, float radius, TrackHit[] results, ref int count)
        {
            Vec2 a = ch.WorldPoint(s), b = ch.WorldPoint(s + 1);
            Vec2 ab = b - a;
            float lenSq = ab.LengthSquared;
            if (lenSq < 1e-10f) return;
            float t = SimMath.Clamp01(Vec2.Dot(center - a, ab) / lenSq);
            Vec2 q = a + ab * t;
            Vec2 d = center - q;
            float distSq = d.LengthSquared;
            Vec2 segNormal = ab.PerpLeft / MathF.Sqrt(lenSq);
            float side = Vec2.Dot(center - a, segNormal);

            Vec2 normal; float depth;
            if (t > 0f && t < 1f && side < 0f)
            {
                // El centro ya está detrás de la superficie (interior): empujar hacia fuera por la normal del segmento.
                if (-side > radius * 1.5f) return; // demasiado profundo: es otra parte de la pista, no este segmento
                normal = segNormal; depth = radius - side;
            }
            else
            {
                if (distSq >= radius * radius) return;
                float dist = MathF.Sqrt(distSq);
                if (dist < 1e-5f) { normal = segNormal; depth = radius; }
                else
                {
                    normal = d / dist; depth = radius - dist;
                    // En vértices, ignorar contactos desde detrás de la superficie.
                    if (Vec2.Dot(normal, segNormal) < -0.2f) return;
                }
            }

            // Descartar duplicados (vértice compartido por dos segmentos): quedarse con el más profundo.
            for (int i = 0; i < count; i++)
            {
                if (Vec2.Dot(results[i].Normal, normal) > 0.995f && results[i].Chain == chainIndex)
                {
                    if (depth > results[i].Depth) results[i] = MakeHit(ch, chainIndex, s, q, normal, depth);
                    return;
                }
            }
            if (count < results.Length) results[count++] = MakeHit(ch, chainIndex, s, q, normal, depth);
            else
            {
                // Lleno: sustituir el menos profundo si este es más profundo.
                int min = 0;
                for (int i = 1; i < count; i++) if (results[i].Depth < results[min].Depth) min = i;
                if (depth > results[min].Depth) results[min] = MakeHit(ch, chainIndex, s, q, normal, depth);
            }
        }

        private static TrackHit MakeHit(TrackChain ch, int chainIndex, int s, Vec2 q, Vec2 normal, float depth) => new TrackHit
        {
            Point = q, Normal = normal, Depth = depth, Surface = ch.Surfaces[s], SurfaceVelocity = ch.Velocity, Chain = chainIndex,
        };

        /// <summary>
        /// Altura del suelo más alto bajo <paramref name="fromY"/> en la posición <paramref name="x"/>.
        /// Devuelve false si no hay suelo. También da la normal del segmento encontrado.
        /// </summary>
        public bool GroundAt(float x, float fromY, out float y, out Vec2 normal, out SurfaceType surface)
        {
            y = float.MinValue; normal = Vec2.Up; surface = SurfaceType.Dirt;
            bool found = false;
            for (int c = 0; c < Chains.Count; c++)
            {
                var ch = Chains[c];
                if (x < ch.LocalMin.x + ch.Offset.x || x > ch.LocalMax.x + ch.Offset.x) continue;
                for (int s = 0; s < ch.SegmentCount; s++)
                {
                    Vec2 a = ch.WorldPoint(s), b = ch.WorldPoint(s + 1);
                    if (b.x <= a.x) continue; // solo segmentos que miran hacia arriba
                    if (x < a.x || x > b.x) continue;
                    float t = (x - a.x) / (b.x - a.x);
                    float sy = a.y + (b.y - a.y) * t;
                    if (sy > fromY || sy <= y) continue;
                    Vec2 segNormal = (b - a).PerpLeft.Normalized;
                    if (segNormal.y < 0.25f) continue; // paredes casi verticales: no son "suelo"
                    y = sy; normal = segNormal; surface = ch.Surfaces[s]; found = true;
                }
            }
            return found;
        }

        private int CellIndex(float x)
        {
            int i = (int)((x - _minX) / CellSize);
            return i < 0 ? 0 : (i >= _cellCount ? _cellCount - 1 : i);
        }

        private static int Pack(int chain, int seg) => (chain << 20) | seg;
        private static void Unpack(int v, out int chain, out int seg) { chain = v >> 20; seg = v & 0xFFFFF; }
    }
}
