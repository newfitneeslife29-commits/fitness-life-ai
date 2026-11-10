using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Representación 3D de la moto. Lee el estado interpolado de la simulación y mueve las piezas:
    /// chasis, ruedas (giro), barras inferiores de la horquilla (recorrido), basculante y suciedad.
    /// El modelo de prototipo se genera con primitivas (BikeModelFactory); el modelo de producción
    /// solo necesita las mismas piezas con los mismos nombres (docs/04-lista-assets.md §1).
    /// </summary>
    public sealed class BikeView : MonoBehaviour
    {
        public Transform Chassis;      // origen = centro de masas de la simulación
        public Transform FrontWheel;
        public Transform RearWheel;
        public Transform ForkLower;    // se coloca en el eje delantero
        public Transform Swingarm;     // pivota hacia el eje trasero
        public Vector3 SwingarmPivotLocal;
        public Transform ExhaustTip;
        public Renderer[] Plastics;    // reciben barro

        private float _dirt;
        private MaterialPropertyBlock _mpb;
        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        private Color[] _cleanColors;

        public Vector3 Position => Chassis.position;

        private void Awake()
        {
            _mpb = new MaterialPropertyBlock();
        }

        public void CacheColors()
        {
            _cleanColors = new Color[Plastics.Length];
            for (int i = 0; i < Plastics.Length; i++) _cleanColors[i] = Plastics[i].sharedMaterial.GetColor(BaseColorId);
        }

        public void Apply(in BikeState s)
        {
            Chassis.SetPositionAndRotation(s.ChassisPos.ToV3(), SimConvert.RotZ(s.ChassisAngle));
            FrontWheel.SetPositionAndRotation(s.FrontWheelPos.ToV3(), SimConvert.RotZ(s.FrontWheelAngle));
            RearWheel.SetPositionAndRotation(s.RearWheelPos.ToV3(), SimConvert.RotZ(s.RearWheelAngle));

            // Horquilla: la parte baja va con el eje; la orientación es la del chasis.
            ForkLower.SetPositionAndRotation(s.FrontWheelPos.ToV3(), Chassis.rotation);

            // Basculante: del pivote al eje trasero.
            Vector3 pivot = Chassis.TransformPoint(SwingarmPivotLocal);
            Vector3 axle = s.RearWheelPos.ToV3();
            Vector3 dir = axle - pivot;
            dir.z = 0f;
            Swingarm.position = pivot;
            // Las piezas del basculante apuntan hacia -X local: girar en Z hasta que -X mire al eje.
            Swingarm.rotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg - 180f);
        }

        /// <summary>La moto se ensucia en barro, arena y agua y se limpia muy poco a poco.</summary>
        public void UpdateDirt(in WheelInfo rear, float speed, float dt)
        {
            if (rear.Grounded)
            {
                float gain = rear.Surface == SurfaceType.Mud ? 0.08f : rear.Surface == SurfaceType.Water ? 0.05f : rear.Surface == SurfaceType.Sand ? 0.01f : 0f;
                _dirt = Mathf.Clamp01(_dirt + gain * Mathf.Min(speed, 15f) * dt);
            }
            if (_cleanColors == null) return;
            var mud = new Color(0.3f, 0.22f, 0.15f);
            for (int i = 0; i < Plastics.Length; i++)
            {
                Plastics[i].GetPropertyBlock(_mpb);
                _mpb.SetColor(BaseColorId, Color.Lerp(_cleanColors[i], mud, _dirt * 0.65f));
                Plastics[i].SetPropertyBlock(_mpb);
            }
        }

        public void ResetDirt() { _dirt = 0f; UpdateDirt(default, 0f, 0f); }
    }

    /// <summary>
    /// Moto de prototipo hecha con primitivas, con proporciones de una MX 125 (Haldane Sprout 125, marca ficticia).
    /// Materiales PBR: plástico brillante, aluminio, cromo, goma, asiento de vinilo.
    /// </summary>
    public static class BikeModelFactory
    {
        public static BikeView Create(BikeParams p, Transform parent, Color paint)
        {
            var root = new GameObject("Bike");
            root.transform.SetParent(parent, false);
            var view = root.AddComponent<BikeView>();

            var plastic = MaterialFactory.Lit("bike_plastic", paint, 0f, 0.78f);
            var plasticWhite = MaterialFactory.Lit("bike_plastic_white", new Color(0.92f, 0.92f, 0.9f), 0f, 0.75f);
            var frameMat = MaterialFactory.Lit("bike_frame", new Color(0.12f, 0.12f, 0.13f), 0.6f, 0.55f);
            var alu = MaterialFactory.Lit("bike_alu", new Color(0.78f, 0.79f, 0.8f), 1f, 0.7f);
            var chrome = MaterialFactory.Lit("bike_chrome", new Color(0.95f, 0.95f, 0.95f), 1f, 0.93f);
            var gold = MaterialFactory.Lit("bike_fork_gold", new Color(0.86f, 0.62f, 0.2f), 1f, 0.8f);
            var rubber = MaterialFactory.Lit("bike_rubber", new Color(0.05f, 0.05f, 0.05f), 0f, 0.25f);
            var seat = MaterialFactory.Lit("bike_seat", new Color(0.08f, 0.08f, 0.09f), 0f, 0.45f);
            var engineMat = MaterialFactory.Lit("bike_engine", new Color(0.3f, 0.3f, 0.32f), 0.8f, 0.5f);

            // ---- Chasis (origen = centro de masas) ----
            var chassis = new GameObject("Chassis").transform;
            chassis.SetParent(root.transform, false);
            view.Chassis = chassis;

            var P = PrimitiveType.Cube;
            SimConvert.Primitive(P, "Frame_Spine", chassis, new Vector3(0.1f, 0.15f, 0f), new Vector3(0.75f, 0.06f, 0.08f), frameMat, Quaternion.Euler(0, 0, -18));
            SimConvert.Primitive(P, "Frame_Down", chassis, new Vector3(0.28f, -0.1f, 0f), new Vector3(0.06f, 0.55f, 0.08f), frameMat, Quaternion.Euler(0, 0, -28));
            SimConvert.Primitive(P, "Engine", chassis, new Vector3(0.02f, -0.18f, 0f), new Vector3(0.36f, 0.3f, 0.24f), engineMat);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Engine_Cylinder", chassis, new Vector3(0.12f, 0.02f, 0f), new Vector3(0.16f, 0.12f, 0.16f), alu, Quaternion.Euler(0, 0, -20));
            var tank = SimConvert.Primitive(P, "Tank", chassis, new Vector3(0.18f, 0.24f, 0f), new Vector3(0.42f, 0.16f, 0.26f), plastic, Quaternion.Euler(0, 0, -8));
            var seatGo = SimConvert.Primitive(P, "Seat", chassis, new Vector3(-0.3f, 0.25f, 0f), new Vector3(0.62f, 0.06f, 0.2f), seat, Quaternion.Euler(0, 0, 4));
            var sideL = SimConvert.Primitive(P, "SidePanel_L", chassis, new Vector3(-0.32f, 0.12f, 0.12f), new Vector3(0.42f, 0.18f, 0.02f), plasticWhite);
            var sideR = SimConvert.Primitive(P, "SidePanel_R", chassis, new Vector3(-0.32f, 0.12f, -0.12f), new Vector3(0.42f, 0.18f, 0.02f), plasticWhite);
            var rearFender = SimConvert.Primitive(P, "Fender_Rear", chassis, new Vector3(-0.78f, 0.24f, 0f), new Vector3(0.5f, 0.025f, 0.16f), plastic, Quaternion.Euler(0, 0, 12));
            var shroudL = SimConvert.Primitive(P, "Shroud_L", chassis, new Vector3(0.33f, 0.16f, 0.14f), new Vector3(0.28f, 0.2f, 0.02f), plastic, Quaternion.Euler(0, 0, -25));
            var shroudR = SimConvert.Primitive(P, "Shroud_R", chassis, new Vector3(0.33f, 0.16f, -0.14f), new Vector3(0.28f, 0.2f, 0.02f), plastic, Quaternion.Euler(0, 0, -25));
            var numberPlate = SimConvert.Primitive(P, "NumberPlate", chassis, new Vector3(0.6f, 0.42f, 0f), new Vector3(0.04f, 0.2f, 0.22f), plasticWhite, Quaternion.Euler(0, 0, -25));
            // Escape (lado derecho = hacia la cámara).
            SimConvert.Primitive(PrimitiveType.Cylinder, "Exhaust_Header", chassis, new Vector3(0.2f, -0.1f, -0.15f), new Vector3(0.06f, 0.18f, 0.06f), chrome, Quaternion.Euler(0, 0, 40));
            var muffler = SimConvert.Primitive(PrimitiveType.Cylinder, "Exhaust_Muffler", chassis, new Vector3(-0.5f, 0.12f, -0.15f), new Vector3(0.1f, 0.24f, 0.1f), alu, Quaternion.Euler(0, 0, 78));
            var tip = new GameObject("ExhaustTip").transform;
            tip.SetParent(chassis, false);
            tip.localPosition = new Vector3(-0.76f, 0.17f, -0.15f);
            view.ExhaustTip = tip;

            // Horquilla superior (fija al chasis) y manillar.
            float forkRad = p.forkAngleDeg * Mathf.Deg2Rad;
            Vector3 forkAxis = new Vector3(Mathf.Sin(forkRad), -Mathf.Cos(forkRad), 0f);
            Vector3 axleExt = new Vector3(p.frontAxleExtended.x, p.frontAxleExtended.y, 0f);
            Vector3 forkTop = axleExt - forkAxis * (p.frontTravel + 0.62f);
            for (int side = -1; side <= 1; side += 2)
            {
                var tube = SimConvert.Primitive(PrimitiveType.Cylinder, "ForkUpper", chassis, Vector3.zero, Vector3.one, gold);
                tube.transform.localPosition = forkTop + forkAxis * 0.22f + new Vector3(0, 0, side * 0.09f);
                tube.transform.localRotation = Quaternion.FromToRotation(Vector3.up, -forkAxis);
                tube.transform.localScale = new Vector3(0.055f, 0.24f, 0.055f);
            }
            SimConvert.Primitive(PrimitiveType.Cylinder, "Handlebar", chassis, forkTop + new Vector3(-0.05f, 0.08f, 0f), new Vector3(0.025f, 0.38f, 0.025f), alu, Quaternion.Euler(90, 0, 0));
            SimConvert.Primitive(P, "TripleClamp", chassis, forkTop, new Vector3(0.08f, 0.04f, 0.24f), alu);
            var frontFenderGo = SimConvert.Primitive(P, "Fender_Front", chassis, forkTop + forkAxis * 0.52f + new Vector3(0.12f, 0f, 0f), new Vector3(0.42f, 0.02f, 0.14f), plastic, Quaternion.Euler(0, 0, -12));

            // Horquilla inferior (se mueve con la rueda).
            var forkLower = new GameObject("ForkLower").transform;
            forkLower.SetParent(root.transform, false);
            for (int side = -1; side <= 1; side += 2)
            {
                var lower = SimConvert.Primitive(PrimitiveType.Cylinder, "ForkLeg", forkLower, Vector3.zero, Vector3.one, alu);
                lower.transform.localPosition = -forkAxis * 0.24f + new Vector3(0, 0, side * 0.09f);
                lower.transform.localRotation = Quaternion.FromToRotation(Vector3.up, -forkAxis);
                lower.transform.localScale = new Vector3(0.07f, 0.26f, 0.07f);
            }
            view.ForkLower = forkLower;

            // Basculante: pieza alargada desde el pivote hacia atrás (eje local -X).
            view.SwingarmPivotLocal = new Vector3(-0.16f, -0.28f, 0f);
            var swing = new GameObject("Swingarm").transform;
            swing.SetParent(root.transform, false);
            float armLen = Vector2.Distance(new Vector2(-0.16f, -0.28f), p.rearAxleExtended.ToV2()) + 0.03f;
            for (int side = -1; side <= 1; side += 2)
                SimConvert.Primitive(P, "SwingarmSide", swing, new Vector3(-armLen * 0.5f, 0f, side * 0.08f), new Vector3(armLen, 0.07f, 0.035f), alu);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Shock", chassis, new Vector3(-0.22f, -0.02f, 0f), new Vector3(0.05f, 0.16f, 0.05f), gold, Quaternion.Euler(0, 0, -30));
            view.Swingarm = swing;

            view.FrontWheel = CreateWheel("WheelFront", root.transform, p.frontWheelRadius, rubber, alu, chrome);
            view.RearWheel = CreateWheel("WheelRear", root.transform, p.rearWheelRadius, rubber, alu, chrome);

            view.Plastics = new Renderer[]
            {
                tank.GetComponent<Renderer>(), sideL.GetComponent<Renderer>(), sideR.GetComponent<Renderer>(), rearFender.GetComponent<Renderer>(),
                shroudL.GetComponent<Renderer>(), shroudR.GetComponent<Renderer>(), numberPlate.GetComponent<Renderer>(), frontFenderGo.GetComponent<Renderer>(),
                seatGo.GetComponent<Renderer>(), muffler.GetComponent<Renderer>(),
            };
            view.CacheColors();
            return view;
        }

        private static Transform CreateWheel(string name, Transform parent, float radius, Material rubber, Material rim, Material disc)
        {
            var w = new GameObject(name).transform;
            w.SetParent(parent, false);
            var axisRot = Quaternion.Euler(90f, 0f, 0f); // cilindro con el eje en Z
            SimConvert.Primitive(PrimitiveType.Cylinder, "Tire", w, Vector3.zero, new Vector3(radius * 2f, 0.055f, radius * 2f), rubber, axisRot);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Rim", w, Vector3.zero, new Vector3(radius * 1.62f, 0.06f, radius * 1.62f), rim, axisRot);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Hub", w, Vector3.zero, new Vector3(0.1f, 0.08f, 0.1f), rim, axisRot);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Disc", w, new Vector3(0, 0, -0.065f), new Vector3(0.22f, 0.004f, 0.22f), disc, axisRot);
            // Radios: muestran el giro de la rueda.
            var spokeMat = MaterialFactory.Lit("bike_spoke", new Color(0.7f, 0.7f, 0.72f), 1f, 0.6f);
            for (int i = 0; i < 8; i++)
            {
                float a = i * 22.5f;
                SimConvert.Primitive(PrimitiveType.Cube, "Spoke", w, new Vector3(0, 0, -0.035f), new Vector3(radius * 1.55f, 0.008f, 0.008f), spokeMat, Quaternion.Euler(0, 0, a));
            }
            // Tacos del neumático (relieve que se ve girar).
            for (int i = 0; i < 18; i++)
            {
                float a = i * 20f * Mathf.Deg2Rad;
                var pos = new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f) * radius;
                SimConvert.Primitive(PrimitiveType.Cube, "Knob", w, pos, new Vector3(0.03f, 0.03f, 0.12f), rubber, Quaternion.Euler(0, 0, i * 20f));
            }
            return w;
        }
    }
}
