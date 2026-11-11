using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Piloto con cinemática inversa mientras va montado y ragdoll físico al caerse (GDD §4.2).
    /// - Montado: manos en el manillar, pies en las estriberas; caderas y hombros se mueven con la inclinación
    ///   del jugador y bajan al comprimirse la suspensión (amortigua los aterrizajes con un muelle visual).
    /// - Caída: las piezas pasan a ser cuerpos rígidos (PhysX) unidos con articulaciones, con la velocidad
    ///   que llevaba la moto. Se mueven en el plano del juego.
    /// Prototipo con primitivas; el modelo final usa un esqueleto con el mismo reparto de huesos.
    /// </summary>
    public sealed class RiderRig : MonoBehaviour
    {
        private enum Part { Torso, Head, UpperArmL, ForearmL, UpperArmR, ForearmR, ThighL, ShinL, ThighR, ShinR, Count }

        private const float ThighLen = 0.45f, ShinLen = 0.45f, UpperArmLen = 0.3f, ForearmLen = 0.3f, TorsoLen = 0.5f;
        private const float LimbZ = 0.17f, ArmZ = 0.3f;

        private readonly Transform[] _parts = new Transform[(int)Part.Count];
        private readonly Rigidbody[] _bodies = new Rigidbody[(int)Part.Count];
        private readonly float[] _lengths = new float[(int)Part.Count];

        private Vector2 _grip, _peg;
        private Vector2 _absorb, _absorbVel; // desplazamiento visual del cuerpo (muelle)
        public bool Ragdoll { get; private set; }
        public Transform Torso => _parts[(int)Part.Torso];

        public static RiderRig Create(BikeParams p, Transform parent, Color jersey, Color helmet)
        {
            var go = new GameObject("Rider");
            go.transform.SetParent(parent, false);
            var rig = go.AddComponent<RiderRig>();
            rig.Build(p, jersey, helmet);
            return rig;
        }

        private void Build(BikeParams p, Color jersey, Color helmet)
        {
            // Manillar (misma geometría que BikeModelFactory) y estriberas, en el espacio local del chasis.
            float forkRad = p.forkAngleDeg * Mathf.Deg2Rad;
            var forkAxis = new Vector2(Mathf.Sin(forkRad), -Mathf.Cos(forkRad));
            Vector2 forkTop = p.frontAxleExtended.ToV2() - forkAxis * (p.frontTravel + 0.62f);
            _grip = forkTop + new Vector2(-0.05f, 0.08f);
            _peg = new Vector2(-0.10f, -0.22f);

            var jerseyMat = MaterialFactory.Lit("rider_jersey_" + ColorUtility.ToHtmlStringRGB(jersey), jersey, 0f, 0.3f);
            var pantsMat = MaterialFactory.Lit("rider_pants", new Color(0.15f, 0.16f, 0.2f), 0f, 0.35f);
            var bootMat = MaterialFactory.Lit("rider_boots", new Color(0.9f, 0.9f, 0.9f), 0f, 0.6f);
            var helmetMat = MaterialFactory.Lit("rider_helmet", helmet, 0.1f, 0.85f);
            var visorMat = MaterialFactory.Lit("rider_goggles", new Color(0.05f, 0.05f, 0.06f), 0.9f, 0.95f);
            var gloveMat = MaterialFactory.Lit("rider_gloves", new Color(0.1f, 0.1f, 0.1f), 0f, 0.4f);

            Make(Part.Torso, TorsoLen, 0.17f, jerseyMat, 22f);
            Make(Part.Head, 0.16f, 0.15f, helmetMat, 5f);
            Make(Part.UpperArmL, UpperArmLen, 0.055f, jerseyMat, 2.5f);
            Make(Part.ForearmL, ForearmLen, 0.05f, jerseyMat, 2f);
            Make(Part.UpperArmR, UpperArmLen, 0.055f, jerseyMat, 2.5f);
            Make(Part.ForearmR, ForearmLen, 0.05f, jerseyMat, 2f);
            Make(Part.ThighL, ThighLen, 0.075f, pantsMat, 9f);
            Make(Part.ShinL, ShinLen, 0.06f, bootMat, 5f);
            Make(Part.ThighR, ThighLen, 0.075f, pantsMat, 9f);
            Make(Part.ShinR, ShinLen, 0.06f, bootMat, 5f);

            // Detalles: gafas, visera del casco, guantes, botas.
            var head = _parts[(int)Part.Head];
            SimConvert.Primitive(PrimitiveType.Cube, "Goggles", head, new Vector3(0.11f, 0.02f, 0f), new Vector3(0.06f, 0.07f, 0.2f), visorMat);
            SimConvert.Primitive(PrimitiveType.Cube, "Peak", head, new Vector3(0.12f, 0.12f, 0f), new Vector3(0.16f, 0.02f, 0.18f), helmetMat, Quaternion.Euler(0, 0, -12));
            SimConvert.Primitive(PrimitiveType.Cube, "ChinBar", head, new Vector3(0.12f, -0.08f, 0f), new Vector3(0.1f, 0.08f, 0.14f), helmetMat, Quaternion.Euler(0, 0, 20));
            foreach (var f in new[] { Part.ForearmL, Part.ForearmR })
                SimConvert.Primitive(PrimitiveType.Sphere, "Glove", _parts[(int)f], new Vector3(0, ForearmLen * 0.5f, 0), Vector3.one * 0.09f, gloveMat);
            foreach (var s in new[] { Part.ShinL, Part.ShinR })
                SimConvert.Primitive(PrimitiveType.Cube, "Boot", _parts[(int)s], new Vector3(0.05f, ShinLen * 0.5f, 0), new Vector3(0.16f, 0.07f, 0.1f), bootMat);

            // Articulaciones del ragdoll (inactivas mientras los cuerpos son cinemáticos).
            Joint(Part.Head, Part.Torso, 40f);
            Joint(Part.UpperArmL, Part.Torso, 80f); Joint(Part.ForearmL, Part.UpperArmL, 70f);
            Joint(Part.UpperArmR, Part.Torso, 80f); Joint(Part.ForearmR, Part.UpperArmR, 70f);
            Joint(Part.ThighL, Part.Torso, 70f, proximalAtTorsoBase: true); Joint(Part.ShinL, Part.ThighL, 70f);
            Joint(Part.ThighR, Part.Torso, 70f, proximalAtTorsoBase: true); Joint(Part.ShinR, Part.ThighR, 70f);
            SetRagdoll(false, Vector3.zero, 0f, Vector3.zero);
        }

        /// <summary>Cada parte: objeto sin escala (cuerpo rígido + cápsula) con su eje Y del extremo proximal al distal.</summary>
        private void Make(Part part, float length, float radius, Material mat, float mass)
        {
            var go = new GameObject(part.ToString());
            go.transform.SetParent(transform, false);
            var col = go.AddComponent<CapsuleCollider>();
            col.direction = 1; col.height = length + radius * 2f; col.radius = radius;
            var rb = go.AddComponent<Rigidbody>();
            rb.mass = mass;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
            var vis = SimConvert.Primitive(part == Part.Head ? PrimitiveType.Sphere : PrimitiveType.Capsule, "Mesh", go.transform, Vector3.zero,
                part == Part.Head ? Vector3.one * radius * 2f : new Vector3(radius * 2f, (length + radius * 2f) * 0.5f, radius * 2f), mat);
            vis.GetComponent<MeshRenderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            _parts[(int)part] = go.transform;
            _bodies[(int)part] = rb;
            _lengths[(int)part] = length;
        }

        private void Joint(Part child, Part parent, float swing, bool proximalAtTorsoBase = false)
        {
            var j = _parts[(int)child].gameObject.AddComponent<CharacterJoint>();
            j.connectedBody = _bodies[(int)parent];
            j.anchor = new Vector3(0f, -_lengths[(int)child] * 0.5f, 0f); // extremo proximal del hijo
            // Punto de unión en el padre: extremo distal (hombro, codo, rodilla) o la base del torso (cadera).
            j.autoConfigureConnectedAnchor = false;
            float parentHalf = _lengths[(int)parent] * 0.5f;
            j.connectedAnchor = new Vector3(0f, proximalAtTorsoBase ? -parentHalf : parentHalf, 0f);
            j.axis = Vector3.forward;
            j.swingAxis = Vector3.right;
            j.lowTwistLimit = new SoftJointLimit { limit = -swing };
            j.highTwistLimit = new SoftJointLimit { limit = swing };
            j.swing1Limit = new SoftJointLimit { limit = swing * 0.5f };
            j.swing2Limit = new SoftJointLimit { limit = swing * 0.5f };
            j.enableProjection = true;
            j.enablePreprocessing = false;
        }

        /// <summary>Activa o desactiva el ragdoll. Al activarlo hereda la velocidad de la moto.</summary>
        public void SetRagdoll(bool on, Vector3 velocity, float angularVelocityZ, Vector3 rotationCenter)
        {
            Ragdoll = on;
            for (int i = 0; i < _bodies.Length; i++)
            {
                var rb = _bodies[i];
                rb.isKinematic = !on;
                rb.detectCollisions = on;
                // Interpolación solo con física activa: montado, la pose se escribe directamente en el transform.
                rb.interpolation = on ? RigidbodyInterpolation.Interpolate : RigidbodyInterpolation.None;
                if (!on) continue;
                rb.constraints = RigidbodyConstraints.FreezePositionZ | RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationY;
                Vector3 r = rb.position - rotationCenter;
                rb.linearVelocity = velocity + new Vector3(-angularVelocityZ * r.y, angularVelocityZ * r.x, 0f);
                rb.angularVelocity = new Vector3(0f, 0f, angularVelocityZ);
            }
        }

        /// <summary>Pose montado (IK). Llamar cada fotograma mientras no hay ragdoll.</summary>
        public void Pose(Transform chassis, in BikeState s, float dt)
        {
            if (Ragdoll) return;

            // Muelle visual: la compresión de la suspensión empuja el cuerpo hacia abajo y luego se recupera.
            float compression = (s.FrontCompression + s.RearCompression) * 0.5f;
            var target = new Vector2(0.22f * s.Lean, -0.06f * Mathf.Abs(s.Lean) - Mathf.Max(0f, compression - 0.3f) * 0.22f);
            Vector2 accel = (target - _absorb) * 260f - _absorbVel * 24f;
            _absorbVel += accel * dt;
            _absorb += _absorbVel * dt;

            Vector2 hip = new Vector2(-0.28f, 0.32f) + _absorb * new Vector2(0.8f, 1f);
            float torsoAngle = (45f + 15f * s.Lean) * Mathf.Deg2Rad;             // inclinación hacia delante
            Vector2 shoulder = hip + new Vector2(Mathf.Sin(torsoAngle), Mathf.Cos(torsoAngle)) * TorsoLen;
            Vector2 headPos = shoulder + new Vector2(0.05f, 0.17f);

            Place(Part.Torso, chassis, hip, shoulder, 0f);
            Place(Part.Head, chassis, headPos - new Vector2(0f, 0.08f), headPos + new Vector2(0.02f, 0.08f), 0f);

            for (int side = -1; side <= 1; side += 2)
            {
                bool left = side > 0;
                Vector2 elbow = Ik(shoulder, _grip, UpperArmLen, ForearmLen, +1f);
                Place(left ? Part.UpperArmL : Part.UpperArmR, chassis, shoulder, elbow, side * ArmZ * 0.8f);
                Place(left ? Part.ForearmL : Part.ForearmR, chassis, elbow, _grip, side * ArmZ);

                Vector2 knee = Ik(hip, _peg, ThighLen, ShinLen, +1f);
                Place(left ? Part.ThighL : Part.ThighR, chassis, hip, knee, side * LimbZ);
                Place(left ? Part.ShinL : Part.ShinR, chassis, knee, _peg, side * LimbZ);
            }
        }

        private void Place(Part part, Transform chassis, Vector2 a, Vector2 b, float z)
        {
            Vector3 wa = chassis.TransformPoint(new Vector3(a.x, a.y, z));
            Vector3 wb = chassis.TransformPoint(new Vector3(b.x, b.y, z));
            var t = _parts[(int)part];
            Vector3 d = wb - wa;
            t.SetPositionAndRotation((wa + wb) * 0.5f, d.sqrMagnitude > 1e-8f ? Quaternion.LookRotation(Vector3.forward, d) : chassis.rotation);
        }

        /// <summary>IK de dos huesos en el plano. bend = +1 dobla la articulación en sentido antihorario.</summary>
        private static Vector2 Ik(Vector2 root, Vector2 target, float l1, float l2, float bend)
        {
            Vector2 d = target - root;
            float dist = Mathf.Clamp(d.magnitude, 0.01f, l1 + l2 - 0.001f);
            Vector2 dir = d.normalized;
            float cos = Mathf.Clamp((l1 * l1 + dist * dist - l2 * l2) / (2f * l1 * dist), -1f, 1f);
            float a = Mathf.Acos(cos) * bend;
            Vector2 rotated = new Vector2(dir.x * Mathf.Cos(a) - dir.y * Mathf.Sin(a), dir.x * Mathf.Sin(a) + dir.y * Mathf.Cos(a));
            return root + rotated * l1;
        }
    }
}
