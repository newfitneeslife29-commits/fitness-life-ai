using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Partículas de la moto (GDD §3): tierra/arena/barro que salpica la rueda trasera, nube de polvo,
    /// humo del escape, salpicaduras de agua y golpes de polvo al aterrizar. La cantidad se escala
    /// según la calidad gráfica (<see cref="QualityManager.ParticleScale"/>).
    /// </summary>
    public sealed class SurfaceFx : MonoBehaviour
    {
        private ParticleSystem _spray, _dust, _exhaust, _splash, _burst;
        private Transform _exhaustTip;

        public static SurfaceFx Create(Transform parent, Transform exhaustTip)
        {
            var go = new GameObject("BikeFx");
            go.transform.SetParent(parent, false);
            var fx = go.AddComponent<SurfaceFx>();
            fx._exhaustTip = exhaustTip;
            var tex = ProceduralTextures.SoftDot;
            fx._spray = Make("Spray", go.transform, tex, lifetime: 0.7f, size: 0.12f, speed: 6f, gravity: 1.2f, maxParticles: 300);
            fx._dust = Make("Dust", go.transform, tex, lifetime: 1.8f, size: 1.1f, speed: 1.2f, gravity: -0.05f, maxParticles: 120);
            fx._exhaust = Make("Exhaust", go.transform, tex, lifetime: 1.2f, size: 0.35f, speed: 0.6f, gravity: -0.1f, maxParticles: 80);
            fx._splash = Make("Splash", go.transform, tex, lifetime: 0.9f, size: 0.2f, speed: 7f, gravity: 1.5f, maxParticles: 200);
            fx._burst = Make("LandingBurst", go.transform, tex, lifetime: 1.4f, size: 1.3f, speed: 3f, gravity: 0f, maxParticles: 120);

            SetGrowth(fx._dust, 2.5f);
            SetGrowth(fx._exhaust, 3f);
            SetGrowth(fx._burst, 2f);
            return fx;
        }

        private static ParticleSystem Make(string name, Transform parent, Texture2D tex, float lifetime, float size, float speed, float gravity, int maxParticles)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = ps.main;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.startLifetime = new ParticleSystem.MinMaxCurve(lifetime * 0.6f, lifetime);
            main.startSize = new ParticleSystem.MinMaxCurve(size * 0.6f, size * 1.3f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(speed * 0.5f, speed);
            main.gravityModifier = gravity;
            main.maxParticles = maxParticles;
            main.startRotation = new ParticleSystem.MinMaxCurve(0f, Mathf.PI * 2f);
            main.playOnAwake = false;
            var emission = ps.emission;
            emission.rateOverTime = 0f;
            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Cone;
            shape.angle = 25f;
            shape.radius = 0.05f;
            var col = ps.colorOverLifetime;
            col.enabled = true;
            var grad = new Gradient();
            grad.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                         new[] { new GradientAlphaKey(0f, 0f), new GradientAlphaKey(1f, 0.1f), new GradientAlphaKey(0f, 1f) });
            col.color = grad;
            var r = go.GetComponent<ParticleSystemRenderer>();
            r.sharedMaterial = MaterialFactory.Particles("fx_soft", tex, Color.white);
            r.renderMode = ParticleSystemRenderMode.Billboard;
            r.sortMode = ParticleSystemSortMode.Distance;
            ps.Play();
            return ps;
        }

        private static void SetGrowth(ParticleSystem ps, float growth)
        {
            var sol = ps.sizeOverLifetime;
            sol.enabled = true;
            sol.size = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Linear(0f, 1f, 1f, growth));
        }

        private static Color SurfaceColor(SurfaceType s)
        {
            switch (s)
            {
                case SurfaceType.Sand: return new Color(0.92f, 0.8f, 0.6f, 0.9f);
                case SurfaceType.Mud: return new Color(0.3f, 0.22f, 0.15f, 1f);
                case SurfaceType.Snow: return new Color(0.95f, 0.97f, 1f, 0.9f);
                case SurfaceType.Water: return new Color(0.85f, 0.93f, 1f, 0.8f);
                case SurfaceType.Wood: return new Color(0.7f, 0.6f, 0.45f, 0.35f);
                case SurfaceType.Asphalt: return new Color(0.75f, 0.75f, 0.78f, 0.6f); // humo de goma
                default: return new Color(0.6f, 0.46f, 0.32f, 0.9f);
            }
        }

        /// <summary>Actualiza los emisores con el estado de la rueda trasera.</summary>
        public void Tick(in WheelInfo rear, Vector2 velocity, float throttle, float rpm01, float scale)
        {
            float speed = velocity.magnitude;
            bool ground = rear.Grounded;
            var surf = rear.Surface;
            Vector3 contact = rear.ContactPoint.ToV3(0.05f);

            // Salpicadura de la rueda (hacia atrás y arriba).
            Vector3 back = new Vector3(-Mathf.Sign(velocity.x == 0f ? 1f : velocity.x), 0.6f, 0f).normalized;
            float sprayRate = 0f;
            if (ground && surf != SurfaceType.Asphalt && surf != SurfaceType.Metal && surf != SurfaceType.Ice && surf != SurfaceType.Water)
                sprayRate = (rear.SlipSpeed * 30f + speed * 3f * throttle) * (surf == SurfaceType.Wood ? 0.15f : 1f);
            Emit(_spray, contact, back, sprayRate * scale, SurfaceColor(surf));

            // Nube de polvo (arena y tierra seca).
            float dustRate = ground && (surf == SurfaceType.Sand || surf == SurfaceType.Dirt) ? (speed * 1.5f + rear.SlipSpeed * 6f) : 0f;
            if (ground && surf == SurfaceType.Asphalt && rear.Sliding) dustRate = rear.SlipSpeed * 12f;
            Emit(_dust, contact + Vector3.up * 0.2f, Vector3.up, dustRate * scale, SurfaceColor(surf));

            // Agua.
            float splashRate = ground && surf == SurfaceType.Water ? speed * 12f : 0f;
            Emit(_splash, contact, new Vector3(back.x * 0.5f, 1f, 0f), splashRate * scale, SurfaceColor(SurfaceType.Water));

            // Escape: más humo con gas y a altas rpm.
            if (_exhaustTip != null)
            {
                float exhaustRate = 4f + throttle * 22f * rpm01;
                Emit(_exhaust, _exhaustTip.position, -_exhaustTip.right + Vector3.up * 0.3f, exhaustRate * scale, new Color(0.85f, 0.85f, 0.88f, 0.25f));
            }
        }

        /// <summary>Golpe de polvo al aterrizar.</summary>
        public void LandingBurst(Vec2 point, SurfaceType surf, float impact, float scale)
        {
            if (surf == SurfaceType.Metal || surf == SurfaceType.Asphalt || surf == SurfaceType.Ice) return;
            int count = Mathf.RoundToInt(Mathf.Clamp(impact * 4f, 4f, 40f) * scale);
            var ep = new ParticleSystem.EmitParams { startColor = SurfaceColor(surf), applyShapeToPosition = true };
            _burst.transform.SetPositionAndRotation(point.ToV3(0f), Quaternion.LookRotation(Vector3.up));
            var shape = _burst.shape;
            shape.angle = 80f;
            _burst.Emit(ep, count);
            if (surf == SurfaceType.Water) _splash.Emit(new ParticleSystem.EmitParams { startColor = SurfaceColor(surf), position = point.ToV3(), applyShapeToPosition = true }, count * 2);
        }

        private static void Emit(ParticleSystem ps, Vector3 pos, Vector3 dir, float rate, Color color)
        {
            var em = ps.emission;
            em.rateOverTime = rate;
            if (rate <= 0f) return;
            ps.transform.SetPositionAndRotation(pos, Quaternion.LookRotation(dir));
            var main = ps.main;
            main.startColor = color;
        }

        public void Clear()
        {
            foreach (var ps in new[] { _spray, _dust, _exhaust, _splash, _burst }) ps.Clear(true);
        }
    }
}
