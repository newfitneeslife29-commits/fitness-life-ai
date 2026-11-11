using System.Collections.Generic;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Genera la malla 3D de la pista a partir de la polilínea de la simulación:
    /// - superficie superior extruida en profundidad (un submaterial por tipo de superficie),
    /// - cara frontal (corte del terreno visto por la cámara),
    /// - colisionador de malla para el ragdoll del piloto y los objetos con física.
    /// Las plataformas móviles se generan como objetos aparte que siguen a su cadena.
    /// </summary>
    public static class TrackMeshBuilder
    {
        public const float HalfDepth = 3.2f;     // la pista mide 6,4 m de profundidad
        private const float SkirtDepth = 8f;     // cuánto baja la cara frontal
        private const float UvScale = 0.25f;

        public static GameObject BuildGround(BuiltLevel level, Transform parent)
        {
            var go = new GameObject("Track");
            go.transform.SetParent(parent, false);
            var mesh = BuildChainMesh(level.GroundPoints, level.GroundSurfaces, true, out var materials);
            mesh.name = "TrackMesh";
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterials = materials;
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            go.AddComponent<MeshCollider>().sharedMesh = mesh;
            go.isStatic = true;
            return go;
        }

        /// <summary>Crea las plataformas (estáticas, móviles o que se derrumban). Devuelve un objeto por cadena dinámica.</summary>
        public static List<(TrackChain chain, Transform view)> BuildPlatforms(BuiltLevel level, Transform parent)
        {
            var result = new List<(TrackChain, Transform)>();
            for (int c = 1; c < level.Track.Chains.Count; c++)
            {
                var ch = level.Track.Chains[c];
                if (ch.IsLoop) continue; // los loops los dibuja ItemsView (anillo detrás de la moto)
                var go = new GameObject($"Platform_{c}");
                go.transform.SetParent(parent, false);
                var mesh = BuildChainMesh(ch.Points, ch.Surfaces, false, out var mats);
                go.AddComponent<MeshFilter>().sharedMesh = mesh;
                go.AddComponent<MeshRenderer>().sharedMaterials = mats;
                go.transform.position = ch.Offset.ToV3();
                if (ch.Motion == ChainMotion.Static) go.AddComponent<MeshCollider>().sharedMesh = mesh;
                else
                {
                    // Colisionador cinemático: el ragdoll puede chocar con él mientras se mueve.
                    var rb = go.AddComponent<Rigidbody>();
                    rb.isKinematic = true;
                    var mc = go.AddComponent<MeshCollider>();
                    mc.sharedMesh = mesh;
                    mc.convex = false;
                }
                result.Add((ch, go.transform));
            }
            return result;
        }

        private static Mesh BuildChainMesh(Vec2[] pts, SurfaceType[] surfaces, bool skirt, out Material[] materials)
        {
            var verts = new List<Vector3>();
            var normals = new List<Vector3>();
            var uvs = new List<Vector2>();
            var subMeshes = new Dictionary<int, List<int>>(); // clave: superficie (o 100 = cara frontal)
            float dist = 0f;

            // Normales suavizadas por vértice (las curvas no se ven facetadas).
            var pointNormals = new Vector3[pts.Length];
            for (int i = 0; i < pts.Length - 1; i++)
            {
                Vec2 n = (pts[i + 1] - pts[i]).PerpLeft.Normalized;
                pointNormals[i] += n.ToV3();
                pointNormals[i + 1] += n.ToV3();
            }
            for (int i = 0; i < pointNormals.Length; i++) pointNormals[i] = pointNormals[i].normalized;

            for (int i = 0; i < pts.Length - 1; i++)
            {
                Vec2 a = pts[i], b = pts[i + 1];
                float segLen = (b - a).Length;
                Vec2 segN = (b - a).PerpLeft.Normalized;
                // Paredes casi verticales: normal propia (no suavizar con el suelo).
                bool wall = Mathf.Abs(segN.y) < 0.3f;
                Vector3 na = wall ? segN.ToV3() : pointNormals[i];
                Vector3 nb = wall ? segN.ToV3() : pointNormals[i + 1];

                int key = (int)surfaces[i];
                if (!subMeshes.TryGetValue(key, out var tris)) subMeshes[key] = tris = new List<int>();

                // Superficie superior: a_cerca, a_lejos, b_lejos, b_cerca (sentido horario visto desde arriba).
                int v0 = verts.Count;
                verts.Add(a.ToV3(-HalfDepth)); verts.Add(a.ToV3(HalfDepth)); verts.Add(b.ToV3(HalfDepth)); verts.Add(b.ToV3(-HalfDepth));
                normals.Add(na); normals.Add(na); normals.Add(nb); normals.Add(nb);
                float u0 = dist * UvScale, u1 = (dist + segLen) * UvScale;
                uvs.Add(new Vector2(u0, 0f)); uvs.Add(new Vector2(u0, 2f * HalfDepth * UvScale));
                uvs.Add(new Vector2(u1, 2f * HalfDepth * UvScale)); uvs.Add(new Vector2(u1, 0f));
                tris.Add(v0); tris.Add(v0 + 1); tris.Add(v0 + 2);
                tris.Add(v0); tris.Add(v0 + 2); tris.Add(v0 + 3);

                if (skirt && !wall)
                {
                    // Cara frontal (corte del terreno) hasta debajo del punto más bajo.
                    if (!subMeshes.TryGetValue(100, out var front)) subMeshes[100] = front = new List<int>();
                    float bottom = Mathf.Min(a.y, b.y) - SkirtDepth;
                    int f0 = verts.Count;
                    verts.Add(new Vector3(a.x, bottom, -HalfDepth)); verts.Add(a.ToV3(-HalfDepth));
                    verts.Add(b.ToV3(-HalfDepth)); verts.Add(new Vector3(b.x, bottom, -HalfDepth));
                    for (int k = 0; k < 4; k++) normals.Add(Vector3.back);
                    uvs.Add(new Vector2(u0, bottom * UvScale)); uvs.Add(new Vector2(u0, a.y * UvScale));
                    uvs.Add(new Vector2(u1, b.y * UvScale)); uvs.Add(new Vector2(u1, bottom * UvScale));
                    front.Add(f0); front.Add(f0 + 1); front.Add(f0 + 2);
                    front.Add(f0); front.Add(f0 + 2); front.Add(f0 + 3);
                }
                dist += segLen;
            }

            var mesh = new Mesh();
            if (verts.Count > 65000) mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
            mesh.SetVertices(verts);
            mesh.SetNormals(normals);
            mesh.SetUVs(0, uvs);
            mesh.subMeshCount = subMeshes.Count;
            materials = new Material[subMeshes.Count];
            int sm = 0;
            foreach (var kv in subMeshes)
            {
                mesh.SetTriangles(kv.Value, sm);
                materials[sm] = kv.Key == 100
                    ? MaterialFactory.Lit("track_front", new Color(0.42f, 0.31f, 0.21f), 0f, 0.1f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal, new Vector2(1f, 1f))
                    : MaterialFactory.Surface((SurfaceType)kv.Key);
                sm++;
            }
            mesh.RecalculateTangents();
            mesh.RecalculateBounds();
            return mesh;
        }
    }

    /// <summary>
    /// Huellas de los neumáticos sobre arena, barro, tierra y nieve (GDD §3: terreno deformable).
    /// Prototipo: tiras oscuras en un búfer circular de una sola malla (1 llamada de dibujo).
    /// Producción: hundimiento real del terreno con una textura de altura que sigue a la cámara (docs/03 §2.5).
    /// </summary>
    public sealed class TireMarks : MonoBehaviour
    {
        private const int MaxQuads = 600;
        private const float Width = 0.13f;
        private const float MinSegment = 0.25f;

        private Mesh _mesh;
        private Vector3[] _verts;
        private Color32[] _colors;
        private int _next;
        private readonly Vector3?[] _last = new Vector3?[2];

        private void Awake()
        {
            _mesh = new Mesh { name = "TireMarks" };
            _mesh.MarkDynamic();
            _verts = new Vector3[MaxQuads * 4];
            _colors = new Color32[MaxQuads * 4];
            var tris = new int[MaxQuads * 6];
            var uvs = new Vector2[MaxQuads * 4];
            for (int q = 0; q < MaxQuads; q++)
            {
                int v = q * 4, t = q * 6;
                tris[t] = v; tris[t + 1] = v + 1; tris[t + 2] = v + 2;
                tris[t + 3] = v; tris[t + 4] = v + 2; tris[t + 5] = v + 3;
                uvs[v] = new Vector2(0.5f, 0.5f); uvs[v + 1] = uvs[v]; uvs[v + 2] = uvs[v]; uvs[v + 3] = uvs[v];
            }
            _mesh.vertices = _verts;
            _mesh.uv = uvs;
            _mesh.colors32 = _colors;
            _mesh.triangles = tris;
            _mesh.bounds = new Bounds(Vector3.zero, Vector3.one * 100000f);
            gameObject.AddComponent<MeshFilter>().sharedMesh = _mesh;
            var mr = gameObject.AddComponent<MeshRenderer>();
            mr.sharedMaterial = MaterialFactory.Particles("tire_marks", Texture2D.whiteTexture, Color.white);
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        public void Clear()
        {
            System.Array.Clear(_verts, 0, _verts.Length);
            _mesh.vertices = _verts;
            _last[0] = _last[1] = null;
        }

        /// <summary>Añade huella para una rueda (0 delantera, 1 trasera).</summary>
        public void Track(int wheel, in WheelInfo info)
        {
            if (!info.Grounded || !Surfaces.LeavesTracks(info.Surface)) { _last[wheel] = null; return; }
            Vector3 p = info.ContactPoint.ToV3(wheel == 0 ? -0.02f : 0.02f) + info.ContactNormal.ToV3() * 0.012f;
            if (_last[wheel] is Vector3 prev)
            {
                if ((p - prev).sqrMagnitude < MinSegment * MinSegment) return;
                AddQuad(prev, p, MarkColor(info.Surface, info.Sliding));
            }
            _last[wheel] = p;
        }

        private static Color32 MarkColor(SurfaceType s, bool sliding)
        {
            byte a = (byte)(sliding ? 150 : 110);
            switch (s)
            {
                case SurfaceType.Sand: return new Color32(150, 115, 75, a);
                case SurfaceType.Mud: return new Color32(40, 28, 18, a);
                case SurfaceType.Snow: return new Color32(170, 185, 205, a);
                default: return new Color32(70, 50, 32, a);
            }
        }

        private void AddQuad(Vector3 a, Vector3 b, Color32 c)
        {
            int v = _next * 4;
            Vector3 side = new Vector3(0f, 0f, Width * 0.5f);
            _verts[v] = a - side; _verts[v + 1] = a + side; _verts[v + 2] = b + side; _verts[v + 3] = b - side;
            _colors[v] = _colors[v + 1] = _colors[v + 2] = _colors[v + 3] = c;
            _next = (_next + 1) % MaxQuads;
            _mesh.vertices = _verts;
            _mesh.colors32 = _colors;
        }
    }
}
