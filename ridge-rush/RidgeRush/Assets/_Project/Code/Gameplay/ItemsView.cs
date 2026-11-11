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

        /// <summary>Explosión o chispazo en un punto (barril, K.O., golpe).</summary>
        public void Burst(Vector3 at, int count, Color color)
        {
            _burst.transform.position = at;
            _burst.Emit(new ParticleSystem.EmitParams { startColor = color, applyShapeToPosition = true }, Mathf.RoundToInt(count * QualityManager.ParticleScale) + 4);
        }

        private void Update()
        {
            _spin += Time.deltaTime * 140f;
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
                }
            }
        }
    }
}
