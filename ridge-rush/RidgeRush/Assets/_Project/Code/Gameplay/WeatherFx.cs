using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Clima del nivel (GDD §3): lluvia, nieve, tormenta de arena, ceniza volcánica y niebla.
    /// Las partículas siguen a la cámara (solo se generan donde se ven) y su cantidad depende de la calidad gráfica.
    /// La niebla densa acerca el final de la niebla lineal del mundo.
    /// </summary>
    public sealed class WeatherFx : MonoBehaviour
    {
        private ParticleSystem _ps;
        private Transform _cam;
        private float _flashTimer, _nextFlash;
        private Light _sun;
        private float _sunBase;
        private string _type = "clear";

        public static WeatherFx Create(Transform parent, Transform camera, string weather, Light sun, float scale)
        {
            var go = new GameObject("Weather_" + weather);
            go.transform.SetParent(parent, false);
            var fx = go.AddComponent<WeatherFx>();
            fx._cam = camera;
            fx._sun = sun;
            fx._sunBase = sun != null ? sun.intensity : 1f;
            fx.Setup(weather ?? "clear", scale);
            return fx;
        }

        private void Setup(string weather, float scale)
        {
            _type = weather;
            switch (weather)
            {
                case "fog":
                    RenderSettings.fogStartDistance *= 0.3f;
                    RenderSettings.fogEndDistance *= 0.35f;
                    return;
                case "sandstorm":
                    RenderSettings.fogStartDistance = 5f;
                    RenderSettings.fogEndDistance = 140f;
                    break;
                case "rain":
                    RenderSettings.fogEndDistance *= 0.6f;
                    _nextFlash = Random.Range(6f, 14f);
                    break;
                case "snow":
                    RenderSettings.fogEndDistance *= 0.7f;
                    break;
                case "ash":
                    break;
                default:
                    return;
            }

            _ps = gameObject.AddComponent<ParticleSystem>();
            _ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = _ps.main;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.playOnAwake = false;
            var shape = _ps.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            var emission = _ps.emission;
            var col = _ps.colorOverLifetime;
            col.enabled = true;
            var grad = new Gradient();
            grad.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                         new[] { new GradientAlphaKey(0f, 0f), new GradientAlphaKey(1f, 0.15f), new GradientAlphaKey(1f, 0.8f), new GradientAlphaKey(0f, 1f) });
            col.color = grad;
            var r = GetComponent<ParticleSystemRenderer>();
            r.sharedMaterial = MaterialFactory.Particles("fx_soft", ProceduralTextures.SoftDot, Color.white);

            switch (weather)
            {
                case "rain":
                    main.startLifetime = 0.9f; main.startSpeed = 0f; main.startSize = new ParticleSystem.MinMaxCurve(0.03f, 0.05f);
                    main.startColor = new Color(0.75f, 0.82f, 0.95f, 0.45f); main.maxParticles = 1500; main.gravityModifier = 0f;
                    shape.scale = new Vector3(60f, 1f, 24f);
                    var vel = _ps.velocityOverLifetime; vel.enabled = true; vel.space = ParticleSystemSimulationSpace.World;
                    vel.x = new ParticleSystem.MinMaxCurve(-3f); vel.y = new ParticleSystem.MinMaxCurve(-30f); vel.z = new ParticleSystem.MinMaxCurve(0f);
                    r.renderMode = ParticleSystemRenderMode.Stretch; r.velocityScale = 0.04f; r.lengthScale = 1f;
                    emission.rateOverTime = 1100f * scale;
                    break;
                case "snow":
                    main.startLifetime = 7f; main.startSpeed = 0f; main.startSize = new ParticleSystem.MinMaxCurve(0.07f, 0.16f);
                    main.startColor = new Color(1f, 1f, 1f, 0.9f); main.maxParticles = 1500;
                    shape.scale = new Vector3(60f, 1f, 24f);
                    var vs = _ps.velocityOverLifetime; vs.enabled = true; vs.space = ParticleSystemSimulationSpace.World;
                    vs.x = new ParticleSystem.MinMaxCurve(-1.5f, 0.5f); vs.y = new ParticleSystem.MinMaxCurve(-2.2f, -1.2f); vs.z = new ParticleSystem.MinMaxCurve(0f);
                    var noise = _ps.noise; noise.enabled = true; noise.strength = 0.6f; noise.frequency = 0.4f;
                    emission.rateOverTime = 220f * scale;
                    break;
                case "sandstorm":
                    main.startLifetime = 3f; main.startSpeed = 0f; main.startSize = new ParticleSystem.MinMaxCurve(2f, 5f);
                    main.startColor = new Color(0.9f, 0.72f, 0.5f, 0.22f); main.maxParticles = 400;
                    shape.scale = new Vector3(4f, 14f, 20f);
                    var vsd = _ps.velocityOverLifetime; vsd.enabled = true; vsd.space = ParticleSystemSimulationSpace.World;
                    vsd.x = new ParticleSystem.MinMaxCurve(-24f, -14f); vsd.y = new ParticleSystem.MinMaxCurve(-1f, 1f); vsd.z = new ParticleSystem.MinMaxCurve(0f);
                    emission.rateOverTime = 110f * scale;
                    break;
                case "ash":
                    main.startLifetime = 6f; main.startSpeed = 0f; main.startSize = new ParticleSystem.MinMaxCurve(0.05f, 0.12f);
                    main.startColor = new ParticleSystem.MinMaxGradient(new Color(1f, 0.45f, 0.1f, 0.9f), new Color(0.4f, 0.38f, 0.36f, 0.8f));
                    main.maxParticles = 800;
                    shape.scale = new Vector3(60f, 1f, 24f);
                    var va = _ps.velocityOverLifetime; va.enabled = true; va.space = ParticleSystemSimulationSpace.World;
                    va.x = new ParticleSystem.MinMaxCurve(-1f, 1f); va.y = new ParticleSystem.MinMaxCurve(-1.5f, -0.4f); va.z = new ParticleSystem.MinMaxCurve(0f);
                    var na = _ps.noise; na.enabled = true; na.strength = 0.8f; na.frequency = 0.3f;
                    emission.rateOverTime = 160f * scale;
                    break;
            }
            _ps.Play();
        }

        private void LateUpdate()
        {
            if (_cam == null) return;
            // El emisor va por encima y algo por delante de la cámara (o a su derecha en la tormenta de arena).
            Vector3 c = _cam.position;
            transform.position = _type == "sandstorm" ? new Vector3(c.x + 30f, c.y - 4f, 0f) : new Vector3(c.x + 4f, c.y + 14f, 4f);
            transform.rotation = Quaternion.identity;

            // Relámpagos ocasionales con lluvia.
            if (_type == "rain" && _sun != null)
            {
                _nextFlash -= Time.deltaTime;
                if (_nextFlash <= 0f) { _flashTimer = 0.25f; _nextFlash = Random.Range(8f, 18f); }
                if (_flashTimer > 0f)
                {
                    _flashTimer -= Time.deltaTime;
                    _sun.intensity = _sunBase + (Mathf.Sin(_flashTimer * 80f) > 0f ? 2.5f : 0.4f);
                }
                else _sun.intensity = _sunBase;
            }
        }
    }
}
