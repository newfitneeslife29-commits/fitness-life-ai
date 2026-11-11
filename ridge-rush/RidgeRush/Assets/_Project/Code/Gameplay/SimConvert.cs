using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Conversión entre la simulación 2D (plano XY) y el mundo 3D de Unity.
    /// La pista vive en z = 0; la cámara mira hacia +Z; z positiva = fondo (detrás de la pista).
    /// </summary>
    public static class SimConvert
    {
        public static Vector3 ToV3(this Vec2 v, float z = 0f) => new Vector3(v.x, v.y, z);
        public static Vector2 ToV2(this Vec2 v) => new Vector2(v.x, v.y);
        public static Quaternion RotZ(float radians) => Quaternion.Euler(0f, 0f, radians * Mathf.Rad2Deg);

        /// <summary>Crea una primitiva sin colisionador (la física la lleva la simulación).</summary>
        public static GameObject Primitive(PrimitiveType type, string name, Transform parent, Vector3 localPos, Vector3 localScale,
                                           Material material, Quaternion? localRot = null)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            var col = go.GetComponent<Collider>();
            if (col != null) Object.Destroy(col);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localRotation = localRot ?? Quaternion.identity;
            go.transform.localScale = localScale;
            var r = go.GetComponent<MeshRenderer>();
            r.sharedMaterial = material;
            return go;
        }

        /// <summary>Coloca una pieza alargada (cilindro/cápsula, eje Y) entre dos puntos.</summary>
        public static void Stretch(Transform t, Vector3 a, Vector3 b, float thickness, bool capsule = false)
        {
            Vector3 d = b - a;
            float len = d.magnitude;
            t.position = (a + b) * 0.5f;
            t.rotation = len > 1e-5f ? Quaternion.FromToRotation(Vector3.up, d / len) : Quaternion.identity;
            // Cilindro de Unity: altura 2 → escala Y = len/2. Cápsula: altura 2 incluye las semiesferas.
            float y = capsule ? (len + thickness) * 0.5f : len * 0.5f;
            t.localScale = new Vector3(thickness, y, thickness);
        }
    }
}
