using RidgeRush.Simulation;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace RidgeRush.Game
{
    /// <summary>
    /// Construye el entorno del mundo 1, Costa Coral, al cargar el nivel (docs/02 §5):
    /// atardecer dorado con sol bajo a contraluz, cielo procedural, mar con reflejos, playa, palmeras,
    /// cabañas, barcas, faro e islas lejanas en 3 planos de profundidad, niebla de calima y
    /// post-procesado cinematográfico (ACES, bloom, balance de blancos cálido, viñeta, aberración sutil,
    /// desenfoque de movimiento en calidad Alta/Ultra).
    /// Prototipo con primitivas: en producción cada mundo es una escena de entorno con arte final,
    /// luz precalculada y sondas (docs/03 §3); este código sirve de referencia de luz y color.
    /// </summary>
    public static class WorldBuilder
    {
        public sealed class World
        {
            public Light Sun;
            public Volume Post;
            public Transform Root;
        }

        public static World BuildCoast(BuiltLevel level, Transform parent)
        {
            var root = new GameObject("World_CostaCoral").transform;
            root.SetParent(parent, false);
            var world = new World { Root = root };

            BuildLighting(level.Data.timeOfDay, root, world);
            world.Post = BuildPost(root);

            float x0 = level.Track.MinX - 60f, x1 = level.Track.MaxX + 60f;
            float len = x1 - x0, mid = (x0 + x1) * 0.5f;

            // ---- Mar (detrás de la pista) ----
            var sea = MaterialFactory.Lit("coast_sea", new Color(0.04f, 0.28f, 0.36f), 0f, 0.96f);
            SimConvert.Primitive(PrimitiveType.Cube, "Sea", root, new Vector3(mid, -2.6f, 400f), new Vector3(len + 2000f, 0.1f, 800f), sea);
            // Agua de los fosos (bajo la pista).
            var pit = MaterialFactory.Lit("coast_pitwater", new Color(0.05f, 0.33f, 0.4f), 0f, 0.95f);
            foreach (var h in level.Hazards)
                if (h.type == "water")
                    SimConvert.Primitive(PrimitiveType.Cube, "PitWater", root, new Vector3((h.x0 + h.x1) * 0.5f, h.yTop - 0.05f, 0f),
                        new Vector3(h.x1 - h.x0 + 0.4f, 0.1f, TrackMeshBuilder.HalfDepth * 2f + 0.2f), pit);

            // ---- Playa entre la pista y el mar, y arena delante ----
            var beach = MaterialFactory.Lit("coast_beach", new Color(0.9f, 0.8f, 0.62f), 0f, 0.12f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal, new Vector2(60f, 4f));
            SimConvert.Primitive(PrimitiveType.Cube, "Beach_Back", root, new Vector3(mid, -2.2f, 14f), new Vector3(len, 1f, 22f), beach);
            var wet = MaterialFactory.Lit("coast_wetsand", new Color(0.62f, 0.52f, 0.4f), 0f, 0.7f);
            SimConvert.Primitive(PrimitiveType.Cube, "Beach_Wet", root, new Vector3(mid, -2.5f, 27f), new Vector3(len, 0.4f, 6f), wet);

            // ---- Islas lejanas y faro (plano lejano) ----
            var islandMat = MaterialFactory.Lit("coast_island", new Color(0.16f, 0.24f, 0.18f), 0f, 0.2f);
            var rockMat = MaterialFactory.Lit("coast_rock", new Color(0.35f, 0.31f, 0.28f), 0f, 0.25f);
            var rnd = new System.Random(level.Data.id.GetHashCode());
            for (float x = x0; x < x1; x += 90f + (float)rnd.NextDouble() * 80f)
            {
                float s = 30f + (float)rnd.NextDouble() * 60f;
                SimConvert.Primitive(PrimitiveType.Sphere, "Island", root, new Vector3(x, -6f, 260f + (float)rnd.NextDouble() * 200f),
                    new Vector3(s * 2.5f, s * 0.6f, s), islandMat);
            }
            for (float x = x0; x < x1; x += 25f + (float)rnd.NextDouble() * 30f)
            {
                float s = 1.5f + (float)rnd.NextDouble() * 3f;
                SimConvert.Primitive(PrimitiveType.Sphere, "Rock", root, new Vector3(x, -2.4f, 30f + (float)rnd.NextDouble() * 20f),
                    new Vector3(s * 1.6f, s, s * 1.2f), rockMat, Quaternion.Euler(0, (float)rnd.NextDouble() * 360f, 0));
            }

            // ---- Decoración del nivel ----
            foreach (var prop in level.Data.props) BuildProp(prop, level, root);

            // ---- Pilotes del muelle bajo los tramos de madera ----
            var pile = MaterialFactory.Lit("coast_pile", new Color(0.33f, 0.24f, 0.17f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal, new Vector2(1f, 3f));
            var pts = level.GroundPoints; var surf = level.GroundSurfaces;
            float lastPile = float.MinValue;
            for (int i = 0; i < surf.Length; i++)
            {
                if (surf[i] != SurfaceType.Wood) continue;
                float px = pts[i].x;
                if (px - lastPile < 4f || pts[i].y < -0.5f) continue;
                lastPile = px;
                float top = pts[i].y - 0.1f, bottom = -4f, h = top - bottom;
                if (h < 0.5f) continue;
                for (int side = -1; side <= 1; side += 2)
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Pile", root, new Vector3(px, bottom + h * 0.5f, side * (TrackMeshBuilder.HalfDepth + 0.25f)),
                        new Vector3(0.35f, h * 0.5f, 0.35f), pile);
            }

            // Sonda de reflejos en tiempo real (solo el cielo) para el agua, la pintura y el cromo.
            var probeGo = new GameObject("SkyReflections");
            probeGo.transform.SetParent(root, false);
            var probe = probeGo.AddComponent<ReflectionProbe>();
            probe.mode = ReflectionProbeMode.Realtime;
            probe.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
            probe.clearFlags = ReflectionProbeClearFlags.Skybox;
            probe.cullingMask = 0;
            probe.size = new Vector3(10000f, 2000f, 10000f);
            probe.resolution = 128;
            probe.hdr = true;
            probe.RenderProbe();
            return world;
        }

        private static void BuildLighting(float timeOfDay, Transform root, World world)
        {
            // Sol bajo de atardecer: elevación según la hora, por detrás-izquierda (contraluz dorado).
            float elevation = Mathf.Clamp((19.6f - timeOfDay) * 9f, 4f, 60f);
            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(root, false);
            sunGo.transform.rotation = Quaternion.Euler(elevation, -150f, 0f);
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = Color.Lerp(new Color(1f, 0.55f, 0.28f), new Color(1f, 0.93f, 0.82f), Mathf.InverseLerp(5f, 45f, elevation));
            sun.intensity = Mathf.Lerp(1.4f, 2.2f, Mathf.InverseLerp(5f, 45f, elevation));
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.85f;
            world.Sun = sun;
            RenderSettings.sun = sun;

            var sky = MaterialFactory.Library.skybox != null ? new Material(MaterialFactory.Library.skybox) : null;
            if (sky != null)
            {
                sky.SetFloat("_SunSize", 0.06f);
                sky.SetFloat("_SunSizeConvergence", 4f);
                sky.SetFloat("_AtmosphereThickness", 1.35f);
                sky.SetColor("_SkyTint", new Color(0.55f, 0.6f, 0.75f));
                sky.SetColor("_GroundColor", new Color(0.3f, 0.32f, 0.35f));
                sky.SetFloat("_Exposure", 1.25f);
                RenderSettings.skybox = sky;
            }
            RenderSettings.ambientMode = AmbientMode.Skybox;
            RenderSettings.ambientIntensity = 1f;
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Skybox;

            // Calima cálida del atardecer (separa los planos de profundidad).
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(0.96f, 0.72f, 0.55f);
            RenderSettings.fogStartDistance = 60f;
            RenderSettings.fogEndDistance = 650f;
            DynamicGI.UpdateEnvironment();
        }

        private static Volume BuildPost(Transform root)
        {
            var go = new GameObject("PostProcess");
            go.transform.SetParent(root, false);
            var vol = go.AddComponent<Volume>();
            vol.isGlobal = true;
            var p = ScriptableObject.CreateInstance<VolumeProfile>();

            var tm = p.Add<Tonemapping>(true); tm.mode.Override(TonemappingMode.ACES);
            var bloom = p.Add<Bloom>(true); bloom.intensity.Override(0.7f); bloom.threshold.Override(1.05f); bloom.scatter.Override(0.65f);
            bloom.tint.Override(new Color(1f, 0.85f, 0.7f));
            var ca = p.Add<ColorAdjustments>(true); ca.postExposure.Override(0.15f); ca.contrast.Override(14f); ca.saturation.Override(8f);
            var wb = p.Add<WhiteBalance>(true); wb.temperature.Override(18f); wb.tint.Override(4f);
            var smh = p.Add<ShadowsMidtonesHighlights>(true);
            smh.shadows.Override(new Vector4(0.9f, 1f, 1.12f, 0f));      // sombras algo cian
            smh.highlights.Override(new Vector4(1.1f, 1f, 0.9f, 0f));    // luces naranja
            var vig = p.Add<Vignette>(true); vig.intensity.Override(0.28f); vig.smoothness.Override(0.45f);
            var chroma = p.Add<ChromaticAberration>(true); chroma.intensity.Override(0.06f);
            var mb = p.Add<MotionBlur>(true); mb.intensity.Override(0.25f); mb.quality.Override(MotionBlurQuality.Low);
            var grain = p.Add<FilmGrain>(true); grain.type.Override(FilmGrainLookup.Thin1); grain.intensity.Override(0.12f);

            vol.sharedProfile = p;
            return vol;
        }

        private static void BuildProp(PropData prop, BuiltLevel level, Transform root)
        {
            float groundY = level.Track.GroundAt(prop.x, 100f, out float gy, out _, out _) ? gy : 0f;
            // Lo que está detrás de la pista se apoya en la playa (más baja que la pista elevada del muelle).
            float baseY = prop.z > TrackMeshBuilder.HalfDepth + 1f ? -1.7f : groundY;
            var pos = new Vector3(prop.x, baseY + prop.yOffset, prop.z);
            var t = new GameObject(prop.type).transform;
            t.SetParent(root, false);
            t.SetPositionAndRotation(pos, Quaternion.Euler(0f, prop.rotation, 0f));
            t.localScale = Vector3.one * prop.scale;

            switch (prop.type)
            {
                case "palm": Palm(t); break;
                case "hut": Hut(t); break;
                case "boat": Boat(t); break;
                case "buoy":
                    SimConvert.Primitive(PrimitiveType.Sphere, "Buoy", t, Vector3.zero, Vector3.one * 0.7f, MaterialFactory.Lit("prop_buoy", new Color(0.95f, 0.3f, 0.12f), 0f, 0.7f));
                    break;
                case "crate":
                    SimConvert.Primitive(PrimitiveType.Cube, "Crate", t, new Vector3(0, 0.4f, 0), Vector3.one * 0.8f, MaterialFactory.Lit("prop_crate", new Color(0.6f, 0.45f, 0.28f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal));
                    break;
                case "surfboard":
                    SimConvert.Primitive(PrimitiveType.Capsule, "Board", t, new Vector3(0, 1f, 0), new Vector3(0.55f, 1f, 0.08f), MaterialFactory.Lit("prop_board", new Color(0.2f, 0.75f, 0.85f), 0f, 0.85f), Quaternion.Euler(0, 0, 12));
                    break;
                case "lighthouse": Lighthouse(t); break;
                case "flag": Flag(t); break;
            }
        }

        private static void Palm(Transform t)
        {
            var trunk = MaterialFactory.Lit("palm_trunk", new Color(0.45f, 0.35f, 0.25f), 0f, 0.25f);
            var leaf = MaterialFactory.Lit("palm_leaf", new Color(0.18f, 0.42f, 0.16f), 0f, 0.35f);
            Vector3 p = Vector3.zero;
            float lean = 0f;
            for (int i = 0; i < 7; i++)
            {
                lean += 3f;
                var seg = SimConvert.Primitive(PrimitiveType.Cylinder, "Trunk", t, p + Quaternion.Euler(0, 0, -lean) * Vector3.up * 0.55f,
                    new Vector3(0.32f - i * 0.025f, 0.6f, 0.32f - i * 0.025f), trunk, Quaternion.Euler(0, 0, -lean));
                p += Quaternion.Euler(0, 0, -lean) * Vector3.up * 1.1f;
            }
            for (int i = 0; i < 8; i++)
            {
                var q = Quaternion.Euler(0f, i * 45f, 0f) * Quaternion.Euler(0f, 0f, -55f);
                SimConvert.Primitive(PrimitiveType.Cube, "Frond", t, p + q * new Vector3(1.4f, 0f, 0f), new Vector3(3f, 0.05f, 0.6f), leaf, q * Quaternion.Euler(0f, 0f, 20f));
            }
            SimConvert.Primitive(PrimitiveType.Sphere, "Coconuts", t, p - Vector3.up * 0.2f, Vector3.one * 0.5f, MaterialFactory.Lit("palm_coconut", new Color(0.3f, 0.22f, 0.12f), 0f, 0.3f));
        }

        private static void Hut(Transform t)
        {
            var wood = MaterialFactory.Lit("hut_wood", new Color(0.55f, 0.4f, 0.27f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal);
            var thatch = MaterialFactory.Lit("hut_thatch", new Color(0.75f, 0.62f, 0.38f), 0f, 0.15f, ProceduralTextures.Grain, null, new Vector2(3f, 3f));
            SimConvert.Primitive(PrimitiveType.Cube, "Walls", t, new Vector3(0, 1.4f, 0), new Vector3(4f, 2.4f, 3.4f), wood);
            SimConvert.Primitive(PrimitiveType.Cube, "RoofL", t, new Vector3(-1.1f, 3.2f, 0), new Vector3(3.2f, 0.25f, 4.2f), thatch, Quaternion.Euler(0, 0, 32));
            SimConvert.Primitive(PrimitiveType.Cube, "RoofR", t, new Vector3(1.1f, 3.2f, 0), new Vector3(3.2f, 0.25f, 4.2f), thatch, Quaternion.Euler(0, 0, -32));
            var lamp = MaterialFactory.Lit("hut_lamp", new Color(1f, 0.8f, 0.5f), 0f, 0.5f, emission: new Color(4f, 2.4f, 1.2f));
            SimConvert.Primitive(PrimitiveType.Sphere, "Lamp", t, new Vector3(1.6f, 2.4f, -1.8f), Vector3.one * 0.25f, lamp);
        }

        private static void Boat(Transform t)
        {
            var hull = MaterialFactory.Lit("boat_hull", new Color(0.9f, 0.9f, 0.88f), 0f, 0.7f);
            var stripe = MaterialFactory.Lit("boat_stripe", new Color(0.1f, 0.35f, 0.65f), 0f, 0.7f);
            SimConvert.Primitive(PrimitiveType.Capsule, "Hull", t, new Vector3(0, 0.5f, 0), new Vector3(1.6f, 3f, 1.2f), hull, Quaternion.Euler(0, 0, 90));
            SimConvert.Primitive(PrimitiveType.Cube, "Stripe", t, new Vector3(0, 0.6f, 0), new Vector3(5.6f, 0.15f, 1.25f), stripe);
            SimConvert.Primitive(PrimitiveType.Cylinder, "Mast", t, new Vector3(0.3f, 3f, 0), new Vector3(0.1f, 2.5f, 0.1f), MaterialFactory.Lit("boat_mast", new Color(0.4f, 0.3f, 0.2f), 0f, 0.3f));
        }

        private static void Lighthouse(Transform t)
        {
            var white = MaterialFactory.Lit("lh_white", new Color(0.92f, 0.92f, 0.9f), 0f, 0.4f);
            var red = MaterialFactory.Lit("lh_red", new Color(0.75f, 0.12f, 0.1f), 0f, 0.4f);
            for (int i = 0; i < 6; i++)
                SimConvert.Primitive(PrimitiveType.Cylinder, "Band", t, new Vector3(0, 2.5f + i * 5f, 0), new Vector3(5f - i * 0.4f, 2.5f, 5f - i * 0.4f), i % 2 == 0 ? white : red);
            var light = MaterialFactory.Lit("lh_light", new Color(1f, 0.95f, 0.8f), 0f, 0.5f, emission: new Color(8f, 7f, 5f));
            SimConvert.Primitive(PrimitiveType.Sphere, "Lantern", t, new Vector3(0, 31.5f, 0), Vector3.one * 2.4f, light);
        }

        private static void Flag(Transform t)
        {
            SimConvert.Primitive(PrimitiveType.Cylinder, "Pole", t, new Vector3(0, 2f, 0), new Vector3(0.08f, 2f, 0.08f), MaterialFactory.Lit("flag_pole", new Color(0.8f, 0.8f, 0.8f), 1f, 0.7f));
            // Bandera de meta a cuadros (dos colores alternos).
            var black = MaterialFactory.Lit("flag_black", new Color(0.05f, 0.05f, 0.05f), 0f, 0.3f);
            var white = MaterialFactory.Lit("flag_white", new Color(0.95f, 0.95f, 0.95f), 0f, 0.3f);
            for (int x = 0; x < 4; x++)
            for (int y = 0; y < 3; y++)
                SimConvert.Primitive(PrimitiveType.Cube, "Check", t, new Vector3(0.2f + x * 0.3f, 3.4f + y * 0.3f, 0), new Vector3(0.3f, 0.3f, 0.02f), (x + y) % 2 == 0 ? black : white);
        }
    }
}
