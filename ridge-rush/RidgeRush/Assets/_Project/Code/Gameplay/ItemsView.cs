using System.Collections.Generic;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Dibuja los objetos y peligros del nivel y los sincroniza con las reglas (RaceRules):
    /// nitro (bidón que flota y gira), aros de fuego, monedas, placas de turbo, barriles explosivos,
    /// chorros de fuego intermitentes, rocas que caen y manchas de aceite. Explosiones y chispas con partículas.
    /// </summary>
    public sealed class ItemsView : MonoBehaviour
    {
        private RaceRules _rules;
        private readonly List<Transform> _pickups = new List<Transform>();
        private readonly List<Transform> _obstacles = new List<Transform>();
        private readonly List<ParticleSystem> _obsFires = new List<ParticleSystem>(); // uno por peligro (null si no tiene fuego)
        private ParticleSystem _burst;
        private float _spin;
        private readonly Dictionary<int, float> _springSquash = new Dictionary<int, float>();
        private readonly Dictionary<int, Transform> _springTops = new Dictionary<int, Transform>();
        private readonly Dictionary<int, Transform> _arms = new Dictionary<int, Transform>();
        private readonly List<(TrackChain chain, Transform hanger, Vector3 hub)> _cabins = new List<(TrackChain, Transform, Vector3)>();
        private readonly List<(Transform wheel, TrackChain chain)> _wheels = new List<(Transform, TrackChain)>();

        public static ItemsView Create(Transform parent, RaceRules rules)
        {
            var go = new GameObject("Items");
            go.transform.SetParent(parent, false);
            var v = go.AddComponent<ItemsView>();
            v._rules = rules;
            v.Build();
            return v;
        }

        private void Build()
        {
            var nitroMat = MaterialFactory.Lit("item_nitro", new Color(0.2f, 0.9f, 1f), 0.6f, 0.8f, emission: new Color(0.4f, 2.2f, 3f));
            var capMat = MaterialFactory.Lit("item_nitro_cap", new Color(0.85f, 0.85f, 0.9f), 1f, 0.8f);
            var ringMat = MaterialFactory.Lit("item_ring", new Color(1f, 0.45f, 0.1f), 0.5f, 0.6f, emission: new Color(4f, 1.4f, 0.2f));
            var coinMat = MaterialFactory.Lit("item_coin", new Color(1f, 0.78f, 0.2f), 1f, 0.85f, emission: new Color(0.8f, 0.55f, 0.1f));
            var padMat = MaterialFactory.Lit("item_pad", new Color(0.2f, 0.9f, 1f), 0f, 0.6f, emission: new Color(0.3f, 2.5f, 3.2f));
            var barrelMat = MaterialFactory.Lit("barrel_red", new Color(0.75f, 0.12f, 0.08f), 0.5f, 0.45f);
            var bandMat = MaterialFactory.Lit("barrel_hazard", new Color(1f, 0.8f, 0.1f), 0.3f, 0.5f, emission: new Color(1.2f, 0.9f, 0.1f));
            var nozzleMat = MaterialFactory.Lit("firejet_nozzle", new Color(0.25f, 0.25f, 0.28f), 0.9f, 0.4f);
            var rockMat = MaterialFactory.Lit("falling_rock", new Color(0.4f, 0.33f, 0.28f), 0f, 0.2f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal);
            var oilMat = MaterialFactory.Lit("oil", new Color(0.02f, 0.02f, 0.03f), 0.2f, 0.98f);
            var sawMat = MaterialFactory.Lit("saw_blade", new Color(0.78f, 0.8f, 0.84f), 1f, 0.85f);
            var sawHubMat = MaterialFactory.Lit("saw_hub", new Color(0.9f, 0.15f, 0.1f), 0.6f, 0.6f, emission: new Color(1.4f, 0.15f, 0.08f));
            var postMat = MaterialFactory.Lit("saw_post", new Color(0.18f, 0.18f, 0.2f), 0.9f, 0.45f);
            var hazardMat = MaterialFactory.Lit("hazard_stripe", new Color(1f, 0.78f, 0.1f), 0.2f, 0.5f, emission: new Color(0.9f, 0.65f, 0.05f));
            var springPadMat = MaterialFactory.Lit("spring_pad", new Color(0.1f, 0.85f, 0.35f), 0.3f, 0.6f, emission: new Color(0.2f, 1.8f, 0.6f));
            var coilMat = MaterialFactory.Lit("spring_coil", new Color(0.85f, 0.86f, 0.9f), 1f, 0.8f);
            var ironMat = MaterialFactory.Lit("hazard_iron", new Color(0.16f, 0.16f, 0.18f), 0.85f, 0.5f);
            BuildFerris();
            BuildLoops();

            var pk = _rules.Level.Data.pickups ?? new PickupData[0];
            for (int i = 0; i < pk.Length; i++)
            {
                var d = pk[i];
                var t = new GameObject("Pickup_" + d.type).transform;
                t.SetParent(transform, false);
                t.position = new Vector3(d.x, _rules.PickupWorldY(i), 0f);
                switch (d.type)
                {
                    case "nitro":
                        SimConvert.Primitive(PrimitiveType.Capsule, "Can", t, Vector3.zero, new Vector3(0.45f, 0.4f, 0.45f), nitroMat);
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Cap", t, new Vector3(0, 0.42f, 0), new Vector3(0.22f, 0.05f, 0.22f), capMat);
                        break;
                    case "ring":
                        // Aro de fuego: segmentos en círculo (plano XY, se atraviesa en el salto) y llamas.
                        for (int s = 0; s < 18; s++)
                        {
                            float a = s / 18f * Mathf.PI * 2f;
                            SimConvert.Primitive(PrimitiveType.Cube, "Seg", t, new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f) * 1.9f, new Vector3(0.18f, 0.7f, 0.18f), ringMat, Quaternion.Euler(0, 0, a * Mathf.Rad2Deg));
                        }
                        var flames = Fire(t, Vector3.zero, 1.9f, 60f, new Color(1f, 0.5f, 0.1f, 0.8f));
                        var sh = flames.shape; sh.shapeType = ParticleSystemShapeType.Circle; sh.radius = 1.9f; sh.rotation = new Vector3(0f, 0f, 0f);
                        break;
                    case "boost":
                        t.position = new Vector3(d.x + d.length * 0.5f, _rules.PickupWorldY(i) + 0.03f, 0f);
                        for (int s = 0; s < 3; s++)
                            SimConvert.Primitive(PrimitiveType.Cube, "Chevron", t, new Vector3(-d.length * 0.3f + s * d.length * 0.3f, 0f, 0f), new Vector3(d.length * 0.18f, 0.04f, TrackMeshBuilder.HalfDepth * 1.6f), padMat);
                        break;
                    default:
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Coin", t, Vector3.zero, new Vector3(0.6f, 0.04f, 0.6f), coinMat, Quaternion.Euler(90f, 0f, 0f));
                        break;
                }
                _pickups.Add(t);
            }

            var ob = _rules.Level.Data.obstacles ?? new ObstacleData[0];
            for (int i = 0; i < ob.Length; i++)
            {
                var o = ob[i];
                var t = new GameObject("Obstacle_" + o.type).transform;
                t.SetParent(transform, false);
                float gy = _rules.ObstacleGroundY(i);
                t.position = new Vector3(o.x, gy, 0f);
                ParticleSystem fire = null;
                switch (o.type)
                {
                    case "barrel":
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Barrel", t, new Vector3(0, 0.6f, 0), new Vector3(0.9f, 0.6f, 0.9f), barrelMat);
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Band", t, new Vector3(0, 0.75f, 0), new Vector3(0.93f, 0.08f, 0.93f), bandMat);
                        break;
                    case "firejet":
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Nozzle", t, new Vector3(0, 0.15f, 0), new Vector3(0.7f, 0.15f, 0.7f), nozzleMat);
                        fire = Fire(t, new Vector3(0f, 0.3f, 0f), 0.3f, 0f, new Color(1f, 0.45f, 0.08f, 0.9f));
                        var main = fire.main; main.startSpeed = new ParticleSystem.MinMaxCurve(8f, 12f); main.startLifetime = 0.5f;
                        var shape = fire.shape; shape.shapeType = ParticleSystemShapeType.Cone; shape.angle = 6f; shape.rotation = new Vector3(-90f, 0f, 0f);
                        break;
                    case "rock":
                        t.position = new Vector3(o.x, _rules.RockY(i), 0f);
                        SimConvert.Primitive(PrimitiveType.Sphere, "Rock", t, Vector3.zero, new Vector3(1.5f, 1.3f, 1.4f), rockMat, Quaternion.Euler(20f, 40f, 10f));
                        break;
                    case "saw":
                    {
                        // Sierra circular: disco, dientes, buje rojo y brazo hasta el suelo (o raíl si se mueve).
                        var arm = SimConvert.Primitive(PrimitiveType.Cylinder, "Arm", t, Vector3.zero, Vector3.one, postMat);
                        float top = Mathf.Max(o.y, o.y + o.dy) + o.size * 0.2f;
                        SimConvert.Stretch(arm.transform, new Vector3(o.x, gy, 0.9f), new Vector3(o.x + Mathf.Max(0f, o.dx), gy + top, 0.9f), 0.22f);
                        SimConvert.Primitive(PrimitiveType.Cube, "Base", t, new Vector3(0f, 0.15f, 0.9f), new Vector3(1.2f, 0.3f, 1.2f), hazardMat);
                        BuildBlade(t, i, o.size, sawMat, sawHubMat, postMat);
                        break;
                    }
                    case "orbit":
                    {
                        // Sierra que gira alrededor de un eje: poste, brazo y disco.
                        var post = SimConvert.Primitive(PrimitiveType.Cylinder, "Post", t, Vector3.zero, Vector3.one, postMat);
                        SimConvert.Stretch(post.transform, new Vector3(o.x, gy, 1.1f), new Vector3(o.x, gy + o.y, 1.1f), 0.35f);
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Hub", t, new Vector3(0f, o.y, 0.9f), new Vector3(0.6f, 0.2f, 0.6f), sawHubMat, Quaternion.Euler(90f, 0f, 0f));
                        var armT = SimConvert.Primitive(PrimitiveType.Cube, "Arm", t, new Vector3(0f, o.y, 0.6f), new Vector3(o.dx, 0.18f, 0.12f), hazardMat).transform;
                        _arms[i] = armT;
                        BuildBlade(t, i, o.size, sawMat, sawHubMat, postMat);
                        break;
                    }
                    case "pendulum":
                    {
                        // Bola de demolición: pórtico, cadena y bola de hierro con pinchos.
                        foreach (float side in new[] { -1f, 1f })
                        {
                            var leg = SimConvert.Primitive(PrimitiveType.Cylinder, "Leg", t, Vector3.zero, Vector3.one, postMat);
                            SimConvert.Stretch(leg.transform, new Vector3(o.x + side * 2.2f, gy, 2.2f), new Vector3(o.x + side * 0.4f, gy + o.y + 0.3f, 1.4f), 0.3f);
                        }
                        SimConvert.Primitive(PrimitiveType.Cube, "Beam", t, new Vector3(0f, o.y + 0.3f, 1.2f), new Vector3(1.6f, 0.4f, 2.4f), hazardMat);
                        var chain = SimConvert.Primitive(PrimitiveType.Cylinder, "Chain", t, Vector3.zero, Vector3.one, postMat).transform;
                        _arms[i] = chain;
                        var ball = new GameObject("Blade").transform;
                        ball.SetParent(t, false);
                        SimConvert.Primitive(PrimitiveType.Sphere, "Ball", ball, Vector3.zero, Vector3.one * o.size * 2f, ironMat);
                        for (int k = 0; k < 10; k++)
                        {
                            var dir = Quaternion.Euler(k * 37f, k * 71f, k * 13f) * Vector3.up;
                            SimConvert.Primitive(PrimitiveType.Cube, "Spike", ball, dir * o.size, new Vector3(0.18f, 0.5f, 0.18f), postMat, Quaternion.FromToRotation(Vector3.up, dir));
                        }
                        break;
                    }
                    case "crusher":
                    {
                        // Prensa: guías a los lados, carcasa arriba y bloque de acero con franjas de peligro.
                        float top = o.y + ObstacleMotion.CrusherHalfHeight + 0.6f;
                        foreach (float side in new[] { -1f, 1f })
                        {
                            var rail = SimConvert.Primitive(PrimitiveType.Cube, "Rail", t, new Vector3(side * (o.size + 0.25f), top * 0.5f, 0.6f), new Vector3(0.3f, top, 0.3f), postMat);
                        }
                        SimConvert.Primitive(PrimitiveType.Cube, "Housing", t, new Vector3(0f, top + 0.4f, 0.4f), new Vector3(o.size * 2f + 1.2f, 0.8f, 2.6f), postMat);
                        var block = new GameObject("Blade").transform;
                        block.SetParent(t, false);
                        SimConvert.Primitive(PrimitiveType.Cube, "Block", block, Vector3.zero, new Vector3(o.size * 2f, ObstacleMotion.CrusherHalfHeight * 2f, 2.4f), ironMat);
                        for (int k = 0; k < 4; k++)
                            SimConvert.Primitive(PrimitiveType.Cube, "Stripe", block, new Vector3(-o.size + 0.35f + k * o.size * 0.55f, -ObstacleMotion.CrusherHalfHeight + 0.2f, -1.21f), new Vector3(0.3f, 0.35f, 0.02f), hazardMat, Quaternion.Euler(0, 0, 35f));
                        var piston = SimConvert.Primitive(PrimitiveType.Cylinder, "Piston", t, Vector3.zero, Vector3.one, coilMat).transform;
                        _arms[i] = piston;
                        break;
                    }
                    case "sign":
                    {
                        // Cartel de atajo: poste y tablero amarillo con flecha, detrás de la pista.
                        float zb = TrackMeshBuilder.HalfDepth + 0.4f;
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Post", t, new Vector3(0f, 1.6f, zb), new Vector3(0.18f, 1.6f, 0.18f), postMat);
                        SimConvert.Primitive(PrimitiveType.Cube, "Board", t, new Vector3(0f, 3.4f, zb), new Vector3(3.2f, 1.3f, 0.12f), hazardMat);
                        var label = new GameObject("Text");
                        label.transform.SetParent(t, false);
                        label.transform.localPosition = new Vector3(0f, 3.4f, zb - 0.08f);
                        var tm = label.AddComponent<TextMesh>();
                        var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                        tm.font = font; tm.text = Loc.Get("shortcut") + " ↑"; tm.fontSize = 80; tm.characterSize = 0.07f;
                        tm.anchor = TextAnchor.MiddleCenter; tm.fontStyle = FontStyle.Bold; tm.color = new Color(0.08f, 0.08f, 0.1f);
                        label.GetComponent<MeshRenderer>().sharedMaterial = font.material;
                        break;
                    }
                    case "crates":
                    {
                        // Muro de cajas de madera (2 de ancho × 3 de alto) que se rompe al atravesarlo.
                        var crateMat = MaterialFactory.Lit("prop_crate", new Color(0.6f, 0.45f, 0.28f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal);
                        for (int cx = 0; cx < 2; cx++)
                        for (int cy = 0; cy < 3 - cx; cy++)
                            SimConvert.Primitive(PrimitiveType.Cube, "Crate", t, new Vector3(-0.45f + cx * 0.95f, 0.47f + cy * 0.92f, (cy % 2) * 0.3f - 0.15f), Vector3.one * 0.9f, crateMat, Quaternion.Euler(0, (cx + cy) * 9f, 0));
                        break;
                    }
                    case "spring":
                    {
                        // Trampolín: base con franjas, muelle y plataforma verde que se comprime al saltar.
                        float w = o.size * 2f;
                        SimConvert.Primitive(PrimitiveType.Cube, "Base", t, new Vector3(0f, 0.08f, 0f), new Vector3(w + 0.3f, 0.16f, TrackMeshBuilder.HalfDepth * 1.2f), hazardMat);
                        for (int k = 0; k < 3; k++)
                            SimConvert.Primitive(PrimitiveType.Cylinder, "Coil", t, new Vector3(0f, 0.22f + k * 0.12f, 0f), new Vector3(w * 0.6f, 0.03f, w * 0.6f), coilMat);
                        var top = SimConvert.Primitive(PrimitiveType.Cube, "Pad", t, new Vector3(0f, 0.6f, 0f), new Vector3(w, 0.12f, TrackMeshBuilder.HalfDepth * 1.1f), springPadMat).transform;
                        _springTops[i] = top;
                        break;
                    }
                    case "oil":
                        float len = Mathf.Max(2f, o.period);
                        t.position = new Vector3(o.x + len * 0.5f, gy + 0.02f, 0f);
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Puddle", t, Vector3.zero, new Vector3(len, 0.01f, TrackMeshBuilder.HalfDepth * 1.4f), oilMat);
                        break;
                }
                _obstacles.Add(t);
                _obsFires.Add(fire);
            }

            _burst = Fire(transform, Vector3.zero, 0.5f, 0f, new Color(1f, 0.6f, 0.15f, 1f));
            var bm = _burst.main; bm.startSpeed = new ParticleSystem.MinMaxCurve(4f, 12f); bm.startSize = new ParticleSystem.MinMaxCurve(0.4f, 1.4f); bm.startLifetime = 0.8f; bm.gravityModifier = 0.3f;
            var bs = _burst.shape; bs.shapeType = ParticleSystemShapeType.Sphere; bs.radius = 0.4f;
        }

        private static ParticleSystem Fire(Transform parent, Vector3 pos, float radius, float rate, Color color)
        {
            var go = new GameObject("Fire");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = ps.main;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.3f, 0.6f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.5f, 1.5f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.3f, 0.7f);
            main.startColor = color;
            main.maxParticles = 300;
            main.playOnAwake = false;
            var em = ps.emission; em.rateOverTime = rate * QualityManager.ParticleScale;
            var col = ps.colorOverLifetime; col.enabled = true;
            var g = new Gradient();
            g.SetKeys(new[] { new GradientColorKey(new Color(1f, 0.9f, 0.5f), 0f), new GradientColorKey(new Color(1f, 0.3f, 0.05f), 0.6f), new GradientColorKey(new Color(0.2f, 0.2f, 0.2f), 1f) },
                      new[] { new GradientAlphaKey(0.9f, 0f), new GradientAlphaKey(0.6f, 0.6f), new GradientAlphaKey(0f, 1f) });
            col.color = g;
            var sol = ps.sizeOverLifetime; sol.enabled = true; sol.size = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Linear(0f, 1f, 1f, 0.3f));
            go.GetComponent<ParticleSystemRenderer>().sharedMaterial = MaterialFactory.Particles("fx_fire", ProceduralTextures.SoftDot, Color.white);
            ps.Play();
            return ps;
        }

        private void BuildBlade(Transform t, int i, float r, Material sawMat, Material hubMat, Material postMat)
        {
            var blade = new GameObject("Blade").transform;
            blade.SetParent(t, false);
            blade.position = _rules.SawPosition(i).ToV3(0f);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Disc", blade, Vector3.zero, new Vector3(r * 2f, 0.04f, r * 2f), sawMat, Quaternion.Euler(90f, 0f, 0f));
            for (int k = 0; k < 16; k++)
            {
                float a = k / 16f * 360f;
                SimConvert.Primitive(PrimitiveType.Cube, "Tooth", blade, Quaternion.Euler(0, 0, a) * new Vector3(r, 0f, 0f), new Vector3(0.28f, 0.16f, 0.05f), sawMat, Quaternion.Euler(0, 0, a + 35f));
            }
            SimConvert.Primitive(PrimitiveType.Cylinder, "Hub", blade, new Vector3(0f, 0f, -0.04f), new Vector3(r * 0.55f, 0.06f, r * 0.55f), hubMat, Quaternion.Euler(90f, 0f, 0f));
            SimConvert.Primitive(PrimitiveType.Cylinder, "Axle", blade, new Vector3(0f, 0f, 0.45f), new Vector3(0.18f, 0.45f, 0.18f), postMat, Quaternion.Euler(90f, 0f, 0f));
        }

        /// <summary>
        /// Noria: aro con luces y radios que gira, soporte en A y una barra de cada cabina al aro.
        /// Las cabinas son plataformas de la física (se dibujan en TrackMeshBuilder); aquí va la estructura.
        /// </summary>
        private void BuildFerris()
        {
            var chains = _rules.Level.Track.Chains;
            var hubs = new Dictionary<Vector2Int, Transform>();
            var frame = MaterialFactory.Lit("ferris_frame", new Color(0.92f, 0.92f, 0.95f), 0.6f, 0.6f);
            var bulbs = MaterialFactory.Lit("ferris_bulbs", new Color(1f, 0.85f, 0.4f), 0f, 0.7f, emission: new Color(3.2f, 2.4f, 0.9f));
            var redMat = MaterialFactory.Lit("ferris_red", new Color(0.85f, 0.12f, 0.1f), 0.3f, 0.6f);
            foreach (var ch in chains)
            {
                if (ch.Motion != ChainMotion.Orbit) continue;
                float w = ch.LocalMax.x - ch.LocalMin.x;
                // Centro de la noria = posición inicial de la cabina + medio ancho (arriba de la cabina).
                ch.ResetMotion();
                float R = ch.MoveDelta.x;
                float a0 = ch.TriggerDelay * Mathf.PI * 2f;
                Vector3 hub = new Vector3(ch.Offset.x - Mathf.Cos(a0) * R + w * 0.5f, ch.Offset.y - Mathf.Sin(a0) * R + 1.6f, 0.8f);
                var key = new Vector2Int(Mathf.RoundToInt(hub.x * 10f), Mathf.RoundToInt(hub.y * 10f));
                if (!hubs.TryGetValue(key, out var wheel))
                {
                    var root = new GameObject("FerrisWheel").transform;
                    root.SetParent(transform, false);
                    // Soporte en A hasta el suelo (por detrás).
                    float ground = hub.y - R - 1.6f - 9f;
                    foreach (float side in new[] { -1f, 1f })
                    {
                        var leg = SimConvert.Primitive(PrimitiveType.Cylinder, "Leg", root, Vector3.zero, Vector3.one, redMat);
                        SimConvert.Stretch(leg.transform, new Vector3(hub.x + side * R * 0.7f, ground, 2.6f), new Vector3(hub.x, hub.y, 1.6f), 0.45f);
                    }
                    wheel = new GameObject("Wheel").transform;
                    wheel.SetParent(root, false);
                    wheel.position = new Vector3(hub.x, hub.y, 1.2f);
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Hub", wheel, Vector3.zero, new Vector3(1.2f, 0.4f, 1.2f), redMat, Quaternion.Euler(90, 0, 0));
                    int n = 48;
                    for (int k = 0; k < n; k++)
                    {
                        float a = k / (float)n * Mathf.PI * 2f, b = (k + 1) / (float)n * Mathf.PI * 2f;
                        var p0 = new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f) * R; var p1 = new Vector3(Mathf.Cos(b), Mathf.Sin(b), 0f) * R;
                        var seg = SimConvert.Primitive(PrimitiveType.Cube, "Rim", wheel, (p0 + p1) * 0.5f, new Vector3((p1 - p0).magnitude + 0.05f, 0.22f, 0.22f), frame, Quaternion.Euler(0, 0, (a + b) * 0.5f * Mathf.Rad2Deg + 90f));
                        if (k % 2 == 0) SimConvert.Primitive(PrimitiveType.Sphere, "Bulb", wheel, p0 * 1.03f + new Vector3(0, 0, -0.15f), Vector3.one * 0.22f, bulbs);
                        if (k % 6 == 0)
                        {
                            var spoke = SimConvert.Primitive(PrimitiveType.Cube, "Spoke", wheel, p0 * 0.5f, new Vector3(R, 0.12f, 0.12f), frame, Quaternion.Euler(0, 0, a * Mathf.Rad2Deg));
                        }
                    }
                    hubs[key] = wheel;
                    _wheels.Add((wheel, ch));
                }
                var hanger = SimConvert.Primitive(PrimitiveType.Cylinder, "Hanger", transform, Vector3.zero, Vector3.one, frame).transform;
                _cabins.Add((ch, hanger, hub));
            }
        }

        /// <summary>Las cajas saltan en pedazos (cubos con física de Unity que rebotan en la pista y desaparecen).</summary>
        public void Smash(Vector3 at)
        {
            var mat = MaterialFactory.Lit("prop_crate", new Color(0.6f, 0.45f, 0.28f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal);
            int n = QualityManager.ParticleScale < 0.6f ? 6 : 12;
            for (int k = 0; k < n; k++)
            {
                var piece = SimConvert.Primitive(PrimitiveType.Cube, "Debris", transform, at + new Vector3(Random.Range(-0.6f, 0.6f), Random.Range(-0.6f, 1.2f), Random.Range(-0.4f, 0.4f)),
                    new Vector3(Random.Range(0.15f, 0.5f), Random.Range(0.08f, 0.2f), Random.Range(0.15f, 0.5f)), mat, Random.rotation);
                piece.AddComponent<BoxCollider>();
                var rb = piece.AddComponent<Rigidbody>();
                rb.mass = 0.3f;
                rb.linearVelocity = new Vector3(Random.Range(4f, 11f), Random.Range(2f, 8f), Random.Range(-3f, 3f));
                rb.angularVelocity = Random.insideUnitSphere * 12f;
                Destroy(piece, 3f);
            }
            Burst(at, 25, new Color(0.8f, 0.65f, 0.4f));
        }

        /// <summary>Fuegos artificiales sobre la meta (varias explosiones de colores durante unos segundos).</summary>
        public void Fireworks(Vector3 at) => StartCoroutine(FireworksRoutine(at));

        private System.Collections.IEnumerator FireworksRoutine(Vector3 at)
        {
            Color[] cols = { new Color(1f, 0.3f, 0.2f), new Color(0.2f, 0.9f, 1f), new Color(1f, 0.85f, 0.2f), new Color(0.6f, 1f, 0.3f), new Color(1f, 0.4f, 0.9f) };
            for (int k = 0; k < 9; k++)
            {
                var p = at + new Vector3(Random.Range(-6f, 14f), Random.Range(9f, 17f), Random.Range(2f, 10f));
                Burst(p, 70, cols[k % cols.Length] * 2.5f);
                yield return new WaitForSeconds(Random.Range(0.15f, 0.45f));
            }
        }

        /// <summary>Anima el trampolín más cercano a <paramref name="at"/>.</summary>
        public void SpringFx(Vector3 at)
        {
            var ob = _rules.Level.Data.obstacles ?? new ObstacleData[0];
            int best = -1; float bd = 4f;
            for (int i = 0; i < ob.Length; i++)
                if (ob[i].type == "spring" && Mathf.Abs(ob[i].x - at.x) < bd) { bd = Mathf.Abs(ob[i].x - at.x); best = i; }
            if (best >= 0) _springSquash[best] = 1f;
        }

        /// <summary>
        /// Anillo de cada loop: banda metálica con luces, detrás de la moto (la moto recorre su borde delantero),
        /// y dos patas hasta el suelo.
        /// </summary>
        private void BuildLoops()
        {
            var loops = _rules.Level.Track.Loops;
            if (loops.Count == 0) return;
            var bandMat = MaterialFactory.Lit("loop_band", new Color(0.22f, 0.24f, 0.28f), 0.85f, 0.55f);
            var lightMat = MaterialFactory.Lit("loop_light", new Color(0.3f, 0.9f, 1f), 0f, 0.6f, emission: new Color(0.6f, 2.6f, 3.2f));
            var legMat = MaterialFactory.Lit("loop_leg", new Color(0.3f, 0.3f, 0.33f), 0.9f, 0.4f);
            var stripeMat = MaterialFactory.Lit("hazard_stripe", new Color(1f, 0.78f, 0.1f), 0.2f, 0.5f, emission: new Color(0.9f, 0.65f, 0.05f));
            foreach (var l in loops)
            {
                var root = new GameObject("Loop").transform;
                root.SetParent(transform, false);
                Vector3 c = l.Center.ToV3(0f);
                float R = l.Radius, thick = 0.35f, z0 = 0.12f, z1 = 2.1f;
                int n = 64;
                var verts = new List<Vector3>(); var norms = new List<Vector3>(); var uvs = new List<Vector2>(); var tris = new List<int>();
                void Quad(Vector3 a, Vector3 b, Vector3 cc, Vector3 d, Vector3 nrm, float u0, float u1)
                {
                    int v = verts.Count;
                    verts.Add(a); verts.Add(b); verts.Add(cc); verts.Add(d);
                    for (int k = 0; k < 4; k++) norms.Add(nrm);
                    uvs.Add(new Vector2(u0, 0)); uvs.Add(new Vector2(u0, 1)); uvs.Add(new Vector2(u1, 1)); uvs.Add(new Vector2(u1, 0));
                    tris.Add(v); tris.Add(v + 1); tris.Add(v + 2); tris.Add(v); tris.Add(v + 2); tris.Add(v + 3);
                    // Cara opuesta (las dos caras visibles: la cámara ve el anillo por dentro y por fuera).
                    int w = verts.Count;
                    verts.Add(d); verts.Add(cc); verts.Add(b); verts.Add(a);
                    for (int k = 0; k < 4; k++) norms.Add(-nrm);
                    uvs.Add(new Vector2(u1, 0)); uvs.Add(new Vector2(u1, 1)); uvs.Add(new Vector2(u0, 1)); uvs.Add(new Vector2(u0, 0));
                    tris.Add(w); tris.Add(w + 1); tris.Add(w + 2); tris.Add(w); tris.Add(w + 2); tris.Add(w + 3);
                }
                for (int i = 0; i < n; i++)
                {
                    float a0 = i / (float)n * Mathf.PI * 2f, a1 = (i + 1) / (float)n * Mathf.PI * 2f;
                    var d0 = new Vector3(Mathf.Cos(a0), Mathf.Sin(a0), 0f); var d1 = new Vector3(Mathf.Cos(a1), Mathf.Sin(a1), 0f);
                    Vector3 i0 = c + d0 * R, i1 = c + d1 * R, o0 = c + d0 * (R + thick), o1 = c + d1 * (R + thick);
                    var zf = new Vector3(0, 0, z0); var zb = new Vector3(0, 0, z1);
                    Quad(i1 + zf, i1 + zb, i0 + zb, i0 + zf, -(d0 + d1).normalized, a1, a0);      // cara interior (donde ruedan)
                    Quad(o0 + zf, o0 + zb, o1 + zb, o1 + zf, (d0 + d1).normalized, a0, a1);       // cara exterior
                    Quad(i0 + zf, o0 + zf, o1 + zf, i1 + zf, Vector3.back, a0, a1);               // borde delantero
                    if (i % 4 == 0)
                        SimConvert.Primitive(PrimitiveType.Cube, "Light", root, c + d0 * (R + thick * 0.5f) + new Vector3(0, 0, z0 - 0.02f), new Vector3(0.18f, 0.18f, 0.04f), lightMat);
                }
                var mesh = new Mesh { name = "LoopRing" };
                mesh.SetVertices(verts); mesh.SetNormals(norms); mesh.SetUVs(0, uvs); mesh.SetTriangles(tris, 0);
                mesh.RecalculateBounds();
                var ring = new GameObject("Ring");
                ring.transform.SetParent(root, false);
                ring.AddComponent<MeshFilter>().sharedMesh = mesh;
                ring.AddComponent<MeshRenderer>().sharedMaterial = bandMat;
                // Patas y travesaño con franjas de peligro.
                float floor = c.y - R;
                foreach (float side in new[] { -1f, 1f })
                {
                    var leg = SimConvert.Primitive(PrimitiveType.Cylinder, "Leg", root, Vector3.zero, Vector3.one, legMat);
                    SimConvert.Stretch(leg.transform, new Vector3(c.x + side * (R + 1.2f), floor, 1.4f), new Vector3(c.x + side * (R + thick) * 0.92f, c.y + 0.3f, 1.4f), 0.3f);
                }
                SimConvert.Primitive(PrimitiveType.Cube, "Beam", root, new Vector3(c.x, floor + 0.12f, 2.2f), new Vector3(2f * R + 3f, 0.24f, 0.4f), stripeMat);
            }
        }

        /// <summary>Explosión o chispazo en un punto (barril, K.O., golpe).</summary>
        public void Burst(Vector3 at, int count, Color color)
        {
            _burst.transform.position = at;
            _burst.Emit(new ParticleSystem.EmitParams { startColor = color, applyShapeToPosition = true }, Mathf.RoundToInt(count * QualityManager.ParticleScale) + 4);
        }

        private void Update()
        {
            _spin += Time.deltaTime * 140f;
            float simT = _rules.Sim.Time;
            foreach (var (wh, ch) in _wheels) wh.localRotation = Quaternion.Euler(0f, 0f, simT / ch.Period * 360f); // gira con las cabinas
            foreach (var (ch, hanger, hub) in _cabins)
            {
                float w = ch.LocalMax.x - ch.LocalMin.x;
                Vector3 top = new Vector3(ch.Offset.x + w * 0.5f, ch.Offset.y, 0.2f);
                SimConvert.Stretch(hanger, top, top + new Vector3(0f, 1.6f, 0.6f), 0.12f);
            }
            var pk = _rules.Level.Data.pickups ?? new PickupData[0];
            for (int i = 0; i < _pickups.Count; i++)
            {
                bool show = !_rules.PickupTaken(i);
                if (_pickups[i].gameObject.activeSelf != show) _pickups[i].gameObject.SetActive(show);
                if (!show) continue;
                string type = pk[i].type;
                if (type == "nitro" || type == "coin")
                {
                    _pickups[i].rotation = Quaternion.Euler(0f, _spin, 0f);
                    _pickups[i].position = new Vector3(pk[i].x, _rules.PickupWorldY(i) + Mathf.Sin(Time.time * 3f + i) * 0.12f, 0f);
                }
            }
            var ob = _rules.Level.Data.obstacles ?? new ObstacleData[0];
            for (int i = 0; i < _obstacles.Count; i++)
            {
                switch (ob[i].type)
                {
                    case "barrel":
                        bool alive = !_rules.BarrelExploded(i);
                        if (_obstacles[i].gameObject.activeSelf != alive) _obstacles[i].gameObject.SetActive(alive);
                        break;
                    case "firejet":
                        if (_obsFires[i] != null)
                        {
                            var em = _obsFires[i].emission;
                            em.rateOverTime = _rules.FireActive(i) ? 220f * QualityManager.ParticleScale : 4f;
                        }
                        break;
                    case "rock":
                        _obstacles[i].position = new Vector3(ob[i].x, _rules.RockY(i), 0f);
                        break;
                    case "saw":
                    case "orbit":
                    case "pendulum":
                    case "crusher":
                    {
                        var blade = _obstacles[i].Find("Blade");
                        if (blade == null) break;
                        var o = ob[i];
                        Vector3 c = _rules.SawPosition(i).ToV3(0f);
                        blade.position = c;
                        float gy = _rules.ObstacleGroundY(i);
                        Vector3 pivot = new Vector3(o.x, gy + o.y, 0.05f);
                        if (o.type == "saw" || o.type == "orbit") blade.rotation = Quaternion.Euler(0f, 0f, -_spin * 6f);
                        if (_arms.TryGetValue(i, out var arm))
                        {
                            if (o.type == "orbit")
                            {
                                Vector3 d = c - pivot; d.z = 0f;
                                arm.position = (pivot + c) * 0.5f + new Vector3(0, 0, 0.55f);
                                arm.rotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg);
                            }
                            else if (o.type == "pendulum")
                            {
                                SimConvert.Stretch(arm, pivot, c, 0.12f);
                                blade.rotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(c.x - pivot.x, pivot.y - c.y) * Mathf.Rad2Deg);
                            }
                            else if (o.type == "crusher")
                            {
                                float top = gy + o.y + ObstacleMotion.CrusherHalfHeight + 0.6f;
                                SimConvert.Stretch(arm, new Vector3(c.x, top, 0f), c + new Vector3(0f, ObstacleMotion.CrusherHalfHeight, 0f), 0.5f);
                            }
                        }
                        break;
                    }
                    case "crates":
                    {
                        bool whole = !_rules.CratesBroken(i);
                        if (_obstacles[i].gameObject.activeSelf != whole) _obstacles[i].gameObject.SetActive(whole);
                        break;
                    }
                    case "spring":
                    {
                        if (!_springTops.TryGetValue(i, out var top)) break;
                        _springSquash.TryGetValue(i, out float sq);
                        sq = Mathf.Max(0f, sq - Time.deltaTime * 4f);
                        _springSquash[i] = sq;
                        // Se hunde y rebota (curva amortiguada).
                        float k = Mathf.Sin(sq * Mathf.PI * 3f) * sq;
                        top.localPosition = new Vector3(0f, 0.6f - k * 0.35f, 0f);
                        break;
                    }
                }
            }
        }
    }
}
