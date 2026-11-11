using RidgeRush.Simulation;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace RidgeRush.Game
{
    /// <summary>
    /// Construye el entorno de cualquier mundo al cargar un nivel (docs/02 §5): luz según la hora del día
    /// (sol, atardecer, luna), cielo procedural, niebla, post-procesado con el color del mundo, fondo en
    /// varios planos de profundidad, fosos (agua, lava, vacío), soportes bajo puentes y decoración.
    /// Prototipo con primitivas; en producción cada mundo será una escena de entorno con arte final.
    /// </summary>
    public static class WorldBuilder
    {
        public sealed class World
        {
            public Light Sun;
            public Volume Post;
            public Transform Root;
            public WorldTheme Theme;
            public bool Night;
        }

        public static bool IsNight(float hour) => hour < 6.3f || hour > 19.7f;

        public static World Build(BuiltLevel level, Transform parent)
        {
            var theme = WorldThemes.Get(level.Data.world);
            var root = new GameObject("World_" + theme.Id).transform;
            root.SetParent(parent, false);
            bool night = theme.AlwaysNight || IsNight(level.Data.timeOfDay);
            var world = new World { Root = root, Theme = theme, Night = night };

            BuildLighting(level.Data.timeOfDay, theme, night, root, world);
            world.Post = BuildPost(theme, night, root);

            float x0 = level.Track.MinX - 80f, x1 = level.Track.MaxX + 80f;
            float len = x1 - x0, mid = (x0 + x1) * 0.5f;
            var rnd = new System.Random(level.Data.id.Length * 7919 + (int)(level.Data.timeOfDay * 100));

            // Suelo de fondo (detrás y delante de la pista).
            var ground = MaterialFactory.Lit("bg_ground_" + theme.Id, theme.Ground, 0f, theme.Id == "city" ? 0.75f : 0.15f,
                ProceduralTextures.Grain, ProceduralTextures.GrainNormal, new Vector2(80f, 6f));
            SimConvert.Primitive(PrimitiveType.Cube, "Ground_Back", root, new Vector3(mid, -2.2f, 30f), new Vector3(len, 1f, 54f), ground);
            SimConvert.Primitive(PrimitiveType.Cube, "Ground_Front", root, new Vector3(mid, -9f, -12f), new Vector3(len, 1f, 10f), ground);

            BuildBackdrop(theme, root, x0, x1, mid, len, rnd);
            BuildPits(level, theme, root);
            BuildSupports(level, theme, root);
            if (level.Data.props != null && level.Data.props.Length > 0)
                foreach (var prop in level.Data.props) BuildProp(prop.type, new Vector3(prop.x, 0f, prop.z), prop.yOffset, prop.scale, prop.rotation, level, root);
            else
                ScatterProps(theme, level, root, rnd);

            // Banderas de meta a los dos lados de la pista.
            BuildProp("flag", new Vector3(level.FinishX, 0f, -TrackMeshBuilder.HalfDepth + 0.4f), 0f, 1f, 0f, level, root);
            BuildProp("flag", new Vector3(level.FinishX, 0f, TrackMeshBuilder.HalfDepth - 0.4f), 0f, 1f, 0f, level, root);

            // Sonda de reflejos (solo el cielo) para el agua, la pintura y el cromo.
            var probe = new GameObject("SkyReflections").AddComponent<ReflectionProbe>();
            probe.transform.SetParent(root, false);
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

        // ------------------------------------------------------------------ luz y post-procesado

        private static void BuildLighting(float hour, WorldTheme theme, bool night, Transform root, World world)
        {
            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(root, false);
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.85f;

            float elevation;
            if (night)
            {
                // Luna: luz fría y suave desde arriba.
                elevation = 40f;
                sun.color = theme.Id == "volcano" ? new Color(1f, 0.45f, 0.25f) : new Color(0.55f, 0.65f, 1f);
                sun.intensity = theme.Id == "stadium" ? 1.6f : 0.45f; // en el estadio, los focos
            }
            else
            {
                // Sol: sale a las 6, cenit a las 13, se pone a las 20.
                float t = Mathf.InverseLerp(6f, 20f, hour);
                elevation = Mathf.Max(4f, Mathf.Sin(t * Mathf.PI) * 62f);
                float low = 1f - Mathf.InverseLerp(5f, 35f, elevation);
                sun.color = Color.Lerp(theme.SunDay, theme.SunLow, low);
                sun.intensity = Mathf.Lerp(2.2f, 1.4f, low);
            }
            sunGo.transform.rotation = Quaternion.Euler(elevation, -150f, 0f);
            world.Sun = sun;
            RenderSettings.sun = sun;

            var lib = MaterialFactory.Library;
            if (lib.skybox != null)
            {
                var sky = new Material(lib.skybox);
                sky.SetFloat("_SunSize", night ? 0.02f : 0.06f);
                sky.SetFloat("_SunSizeConvergence", 4f);
                sky.SetFloat("_AtmosphereThickness", theme.Id == "volcano" ? 2.4f : theme.Id == "desert" ? 1.6f : 1.3f);
                sky.SetColor("_SkyTint", theme.SkyTint);
                sky.SetColor("_GroundColor", theme.Ground * 0.5f);
                sky.SetFloat("_Exposure", night ? 0.18f : 1.25f);
                RenderSettings.skybox = sky;
            }
            RenderSettings.ambientMode = AmbientMode.Skybox;
            RenderSettings.ambientIntensity = night ? 1.6f : 1f;
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Skybox;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = night ? theme.FogNight : theme.Fog;
            RenderSettings.fogStartDistance = theme.FogStart;
            RenderSettings.fogEndDistance = theme.FogEnd;
            DynamicGI.UpdateEnvironment();
        }

        private static Volume BuildPost(WorldTheme theme, bool night, Transform root)
        {
            var go = new GameObject("PostProcess");
            go.transform.SetParent(root, false);
            var vol = go.AddComponent<Volume>();
            vol.isGlobal = true;
            var p = ScriptableObject.CreateInstance<VolumeProfile>();
            p.Add<Tonemapping>(true).mode.Override(TonemappingMode.ACES);
            var bloom = p.Add<Bloom>(true);
            bloom.intensity.Override(theme.Bloom * (night ? 1.3f : 1f)); bloom.threshold.Override(1.0f); bloom.scatter.Override(0.65f);
            var ca = p.Add<ColorAdjustments>(true);
            ca.postExposure.Override(night ? 0.35f : 0.15f); ca.contrast.Override(theme.Contrast); ca.saturation.Override(theme.Saturation);
            var wb = p.Add<WhiteBalance>(true); wb.temperature.Override(night && !theme.AlwaysNight ? -20f : theme.Temperature);
            var smh = p.Add<ShadowsMidtonesHighlights>(true);
            smh.shadows.Override(new Vector4(theme.ShadowsTint.r, theme.ShadowsTint.g, theme.ShadowsTint.b, 0f));
            smh.highlights.Override(new Vector4(theme.HighlightsTint.r, theme.HighlightsTint.g, theme.HighlightsTint.b, 0f));
            var vig = p.Add<Vignette>(true); vig.intensity.Override(night ? 0.36f : 0.26f); vig.smoothness.Override(0.45f);
            p.Add<ChromaticAberration>(true).intensity.Override(0.06f);
            var mb = p.Add<MotionBlur>(true); mb.intensity.Override(0.25f); mb.quality.Override(MotionBlurQuality.Low);
            var grain = p.Add<FilmGrain>(true); grain.type.Override(FilmGrainLookup.Thin1); grain.intensity.Override(night ? 0.2f : 0.1f);
            vol.sharedProfile = p;
            return vol;
        }

        // ------------------------------------------------------------------ fondo

        private static float R(System.Random r, float a, float b) => a + (float)r.NextDouble() * (b - a);

        private static void BuildBackdrop(WorldTheme theme, Transform root, float x0, float x1, float mid, float len, System.Random rnd)
        {
            var bd = MaterialFactory.Lit("bd_" + theme.Id, theme.Backdrop, 0f, 0.2f);
            var bd2 = MaterialFactory.Lit("bd2_" + theme.Id, theme.BackdropAlt, 0f, 0.25f);
            switch (theme.Id)
            {
                case "coast":
                    SimConvert.Primitive(PrimitiveType.Cube, "Sea", root, new Vector3(mid, -2.6f, 420f), new Vector3(len + 2000f, 0.1f, 760f), MaterialFactory.Lit("coast_sea", new Color(0.04f, 0.28f, 0.36f), 0f, 0.96f));
                    for (float x = x0; x < x1; x += R(rnd, 90f, 170f))
                    {
                        float s = R(rnd, 30f, 90f);
                        SimConvert.Primitive(PrimitiveType.Sphere, "Island", root, new Vector3(x, -6f, R(rnd, 260f, 460f)), new Vector3(s * 2.5f, s * 0.6f, s), bd);
                    }
                    BuildProp("lighthouse", new Vector3(mid, 0f, 60f), -1.7f, 1f, 0f, null, root);
                    break;
                case "desert":
                    for (float x = x0; x < x1; x += R(rnd, 50f, 110f))
                    {
                        float h = R(rnd, 30f, 90f), w = R(rnd, 40f, 120f);
                        SimConvert.Primitive(PrimitiveType.Cube, "Mesa", root, new Vector3(x, h * 0.5f - 3f, R(rnd, 160f, 380f)), new Vector3(w, h, R(rnd, 30f, 60f)), rnd.Next(2) == 0 ? bd : bd2);
                    }
                    break;
                case "jungle":
                    for (float x = x0; x < x1; x += R(rnd, 30f, 60f))
                    {
                        float s = R(rnd, 25f, 60f);
                        SimConvert.Primitive(PrimitiveType.Sphere, "Hill", root, new Vector3(x, -4f, R(rnd, 90f, 260f)), new Vector3(s * 1.6f, s, s), bd);
                    }
                    SimConvert.Primitive(PrimitiveType.Cube, "River", root, new Vector3(mid, -2.5f, 60f), new Vector3(len, 0.1f, 18f), MaterialFactory.Lit("jungle_river", new Color(0.12f, 0.25f, 0.2f), 0f, 0.95f));
                    for (float x = x0; x < x1; x += R(rnd, 140f, 220f))
                        for (int i = 0; i < 4; i++)
                            SimConvert.Primitive(PrimitiveType.Cube, "Pyramid", root, new Vector3(x, 4f + i * 7f, 200f), new Vector3(60f - i * 13f, 7f, 60f - i * 13f), bd2);
                    break;
                case "snow":
                    for (float x = x0; x < x1; x += R(rnd, 60f, 130f))
                    {
                        float h = R(rnd, 80f, 180f);
                        var peak = SimConvert.Primitive(PrimitiveType.Cube, "Mountain", root, new Vector3(x, h * 0.25f, R(rnd, 250f, 450f)), new Vector3(h, h, h), bd, Quaternion.Euler(0f, 45f, 45f));
                        peak.GetComponent<Renderer>().shadowCastingMode = ShadowCastingMode.Off;
                    }
                    break;
                case "city":
                {
                    var windows = MaterialFactory.Lit("city_windows", new Color(0.08f, 0.08f, 0.1f), 0.3f, 0.6f, ProceduralTextures.Windows, null, new Vector2(1f, 1f), new Color(1.4f, 1.2f, 0.9f), ProceduralTextures.Windows);
                    for (float x = x0; x < x1; x += R(rnd, 14f, 30f))
                    {
                        float h = R(rnd, 30f, 140f), w = R(rnd, 12f, 26f);
                        var b = SimConvert.Primitive(PrimitiveType.Cube, "Building", root, new Vector3(x, h * 0.5f - 3f, R(rnd, 60f, 200f)), new Vector3(w, h, w), windows);
                        b.GetComponent<Renderer>().material.SetTextureScale("_BaseMap", new Vector2(w / 8f, h / 8f));
                        b.GetComponent<Renderer>().material.SetTextureScale("_EmissionMap", new Vector2(w / 8f, h / 8f));
                    }
                    break;
                }
                case "volcano":
                {
                    float vx = mid;
                    for (int i = 0; i < 8; i++)
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Volcano", root, new Vector3(vx, -3f + i * 18f, 420f), new Vector3(420f - i * 48f, 9f, 420f - i * 48f), bd);
                    var lava = MaterialFactory.Lit("lava_glow", new Color(1f, 0.35f, 0.05f), 0f, 0.6f, emission: new Color(6f, 1.6f, 0.2f));
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Crater", root, new Vector3(vx, 141f, 420f), new Vector3(70f, 2f, 70f), lava);
                    for (float x = x0; x < x1; x += R(rnd, 70f, 140f))
                        SimConvert.Primitive(PrimitiveType.Cube, "LavaRiver", root, new Vector3(x, -2.55f, R(rnd, 50f, 90f)), new Vector3(R(rnd, 20f, 60f), 0.1f, R(rnd, 4f, 10f)), lava);
                    break;
                }
                case "stadium":
                {
                    // Gradas a ambos lados del circuito y focos.
                    var seats = MaterialFactory.Lit("stadium_seats", new Color(0.25f, 0.25f, 0.3f), 0f, 0.3f, ProceduralTextures.Crowd, null, new Vector2(30f, 4f));
                    for (int i = 0; i < 6; i++)
                        SimConvert.Primitive(PrimitiveType.Cube, "Stand", root, new Vector3(mid, i * 3f, 30f + i * 4f), new Vector3(len, 3f, 4f), seats);
                    var lamp = MaterialFactory.Lit("stadium_lamp", Color.white, 0f, 0.5f, emission: new Color(10f, 10f, 9f));
                    var pole = MaterialFactory.Lit("stadium_pole", new Color(0.5f, 0.5f, 0.55f), 0.8f, 0.5f);
                    for (float x = x0 + 40f; x < x1; x += 80f)
                    {
                        SimConvert.Primitive(PrimitiveType.Cylinder, "LightPole", root, new Vector3(x, 25f, 58f), new Vector3(1f, 25f, 1f), pole);
                        SimConvert.Primitive(PrimitiveType.Cube, "Floodlight", root, new Vector3(x, 51f, 57f), new Vector3(8f, 4f, 1f), lamp);
                    }
                    break;
                }
            }
        }

        // ------------------------------------------------------------------ fosos y soportes

        private static void BuildPits(BuiltLevel level, WorldTheme theme, Transform root)
        {
            foreach (var h in level.Hazards)
            {
                Material m;
                switch (h.type)
                {
                    case "water": m = MaterialFactory.Lit("pit_water_" + theme.Id, theme.Id == "jungle" ? new Color(0.1f, 0.22f, 0.16f) : new Color(0.05f, 0.33f, 0.4f), 0f, 0.95f); break;
                    case "lava": m = MaterialFactory.Lit("pit_lava", new Color(1f, 0.3f, 0.05f), 0f, 0.5f, emission: new Color(7f, 1.8f, 0.2f)); break;
                    default: continue; // vacío: no se rellena (se ve el abismo)
                }
                SimConvert.Primitive(PrimitiveType.Cube, "Pit_" + h.type, root, new Vector3((h.x0 + h.x1) * 0.5f, h.yTop - 0.05f, 0f),
                    new Vector3(h.x1 - h.x0 + 0.4f, 0.1f, TrackMeshBuilder.HalfDepth * 2f + 0.2f), m);
            }
        }

        /// <summary>Pilotes de madera o vigas de metal bajo los tramos de puente.</summary>
        private static void BuildSupports(BuiltLevel level, WorldTheme theme, Transform root)
        {
            var wood = MaterialFactory.Lit("support_wood", new Color(0.33f, 0.24f, 0.17f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal, new Vector2(1f, 3f));
            var steel = MaterialFactory.Lit("support_steel", new Color(0.35f, 0.36f, 0.4f), 0.9f, 0.45f);
            var pts = level.GroundPoints; var surf = level.GroundSurfaces;
            float last = float.MinValue;
            for (int i = 0; i < surf.Length; i++)
            {
                bool isWood = surf[i] == SurfaceType.Wood, isMetal = surf[i] == SurfaceType.Metal;
                if (!isWood && !isMetal) continue;
                float px = pts[i].x;
                if (px - last < 4f) continue;
                last = px;
                float top = pts[i].y - 0.1f, bottom = -6f, h = top - bottom;
                if (h < 0.5f) continue;
                for (int side = -1; side <= 1; side += 2)
                    SimConvert.Primitive(isWood ? PrimitiveType.Cylinder : PrimitiveType.Cube, "Support", root,
                        new Vector3(px, bottom + h * 0.5f, side * (TrackMeshBuilder.HalfDepth + 0.25f)),
                        isWood ? new Vector3(0.35f, h * 0.5f, 0.35f) : new Vector3(0.3f, h, 0.3f), isWood ? wood : steel);
            }
        }

        // ------------------------------------------------------------------ decoración

        private static void ScatterProps(WorldTheme theme, BuiltLevel level, Transform root, System.Random rnd)
        {
            for (float x = level.Track.MinX + 5f; x < level.Track.MaxX; x += R(rnd, 9f, 18f))
            {
                string type = theme.Props[rnd.Next(theme.Props.Length)];
                float z = R(rnd, 5.5f, 14f);
                BuildProp(type, new Vector3(x, 0f, z), 0f, R(rnd, 0.8f, 1.3f), R(rnd, 0f, 360f), level, root);
            }
        }

        private static void BuildProp(string type, Vector3 at, float yOffset, float scale, float rotation, BuiltLevel level, Transform root)
        {
            float groundY = -1.7f;
            if (level != null && at.z <= TrackMeshBuilder.HalfDepth + 1f && level.Track.GroundAt(at.x, 100f, out float gy, out _, out _)) groundY = gy;
            var t = new GameObject(type).transform;
            t.SetParent(root, false);
            t.SetPositionAndRotation(new Vector3(at.x, groundY + yOffset, at.z), Quaternion.Euler(0f, rotation, 0f));
            t.localScale = Vector3.one * scale;
            var P = PrimitiveType.Cube;
            switch (type)
            {
                case "palm": Palm(t); break;
                case "hut": Hut(t); break;
                case "boat": Boat(t); break;
                case "lighthouse": Lighthouse(t); break;
                case "flag": Flag(t); break;
                case "buoy": SimConvert.Primitive(PrimitiveType.Sphere, "Buoy", t, Vector3.zero, Vector3.one * 0.7f, MaterialFactory.Lit("prop_buoy", new Color(0.95f, 0.3f, 0.12f), 0f, 0.7f)); break;
                case "crate": SimConvert.Primitive(P, "Crate", t, new Vector3(0, 0.4f, 0), Vector3.one * 0.8f, MaterialFactory.Lit("prop_crate", new Color(0.6f, 0.45f, 0.28f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal)); break;
                case "surfboard": SimConvert.Primitive(PrimitiveType.Capsule, "Board", t, new Vector3(0, 1f, 0), new Vector3(0.55f, 1f, 0.08f), MaterialFactory.Lit("prop_board", new Color(0.2f, 0.75f, 0.85f), 0f, 0.85f), Quaternion.Euler(0, 0, 12)); break;
                case "cactus":
                {
                    var m = MaterialFactory.Lit("cactus", new Color(0.25f, 0.45f, 0.22f), 0f, 0.3f);
                    SimConvert.Primitive(PrimitiveType.Capsule, "Trunk", t, new Vector3(0, 1.6f, 0), new Vector3(0.5f, 1.6f, 0.5f), m);
                    SimConvert.Primitive(PrimitiveType.Capsule, "ArmL", t, new Vector3(-0.55f, 2f, 0), new Vector3(0.32f, 0.6f, 0.32f), m);
                    SimConvert.Primitive(PrimitiveType.Capsule, "ArmR", t, new Vector3(0.55f, 2.4f, 0), new Vector3(0.32f, 0.5f, 0.32f), m);
                    break;
                }
                case "rock": SimConvert.Primitive(PrimitiveType.Sphere, "Rock", t, new Vector3(0, 0.4f, 0), new Vector3(2.2f, 1.3f, 1.6f), MaterialFactory.Lit("rock_" + (level?.Data.world ?? ""), level != null && level.Data.world == "volcano" ? new Color(0.15f, 0.13f, 0.13f) : new Color(0.55f, 0.4f, 0.3f), 0f, 0.25f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal)); break;
                case "wagon":
                {
                    var wood = MaterialFactory.Lit("wagon_wood", new Color(0.45f, 0.32f, 0.2f), 0f, 0.3f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal);
                    SimConvert.Primitive(P, "Body", t, new Vector3(0, 0.9f, 0), new Vector3(2.4f, 0.8f, 1.2f), wood);
                    for (int i = -1; i <= 1; i += 2)
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Wheel", t, new Vector3(i * 0.8f, 0.45f, 0.65f), new Vector3(0.9f, 0.05f, 0.9f), wood, Quaternion.Euler(90, 0, 0));
                    break;
                }
                case "jtree":
                {
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Trunk", t, new Vector3(0, 3f, 0), new Vector3(0.6f, 3f, 0.6f), MaterialFactory.Lit("jtree_trunk", new Color(0.3f, 0.22f, 0.15f), 0f, 0.3f));
                    var leaves = MaterialFactory.Lit("jtree_leaves", new Color(0.12f, 0.38f, 0.12f), 0f, 0.35f);
                    SimConvert.Primitive(PrimitiveType.Sphere, "Canopy", t, new Vector3(0, 6.5f, 0), new Vector3(5f, 3f, 5f), leaves);
                    SimConvert.Primitive(PrimitiveType.Sphere, "Canopy2", t, new Vector3(1.2f, 5.6f, 0.8f), new Vector3(3f, 2f, 3f), leaves);
                    break;
                }
                case "fern":
                {
                    var leaf = MaterialFactory.Lit("fern", new Color(0.2f, 0.5f, 0.18f), 0f, 0.35f);
                    for (int i = 0; i < 6; i++)
                    {
                        var q = Quaternion.Euler(0f, i * 60f, 0f) * Quaternion.Euler(0f, 0f, 35f);
                        SimConvert.Primitive(P, "Frond", t, q * new Vector3(0.6f, 0.4f, 0f), new Vector3(1.4f, 0.04f, 0.35f), leaf, q);
                    }
                    break;
                }
                case "column":
                {
                    var stone = MaterialFactory.Lit("ruin_stone", new Color(0.55f, 0.53f, 0.45f), 0f, 0.2f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal);
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Column", t, new Vector3(0, 2.2f, 0), new Vector3(0.9f, 2.2f, 0.9f), stone);
                    SimConvert.Primitive(P, "Cap", t, new Vector3(0, 4.5f, 0), new Vector3(1.4f, 0.35f, 1.4f), stone);
                    break;
                }
                case "statue":
                {
                    var stone = MaterialFactory.Lit("ruin_stone_dark", new Color(0.4f, 0.4f, 0.34f), 0f, 0.2f, ProceduralTextures.Grain, ProceduralTextures.GrainNormal);
                    SimConvert.Primitive(P, "Base", t, new Vector3(0, 0.6f, 0), new Vector3(1.6f, 1.2f, 1.6f), stone);
                    SimConvert.Primitive(P, "Head", t, new Vector3(0, 2.4f, 0), new Vector3(1.2f, 2.2f, 1f), stone);
                    break;
                }
                case "pine":
                {
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Trunk", t, new Vector3(0, 0.8f, 0), new Vector3(0.35f, 0.8f, 0.35f), MaterialFactory.Lit("pine_trunk", new Color(0.3f, 0.2f, 0.14f), 0f, 0.3f));
                    var needles = MaterialFactory.Lit("pine_needles", new Color(0.1f, 0.25f, 0.16f), 0f, 0.3f);
                    var snowCap = MaterialFactory.Lit("pine_snow", new Color(0.95f, 0.97f, 1f), 0f, 0.4f);
                    for (int i = 0; i < 4; i++)
                    {
                        float s = 2.6f - i * 0.6f;
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Tier", t, new Vector3(0, 1.8f + i * 1.1f, 0), new Vector3(s, 0.45f, s), needles);
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Snow", t, new Vector3(0, 2.28f + i * 1.1f, 0), new Vector3(s * 0.85f, 0.06f, s * 0.85f), snowCap);
                    }
                    break;
                }
                case "cabin":
                    Hut(t);
                    SimConvert.Primitive(P, "SnowRoof", t, new Vector3(0, 4.05f, 0), new Vector3(3.6f, 0.15f, 4.3f), MaterialFactory.Lit("pine_snow", new Color(0.95f, 0.97f, 1f), 0f, 0.4f));
                    break;
                case "snowrock":
                    SimConvert.Primitive(PrimitiveType.Sphere, "Rock", t, new Vector3(0, 0.4f, 0), new Vector3(2f, 1.2f, 1.5f), MaterialFactory.Lit("snowrock", new Color(0.4f, 0.42f, 0.46f), 0f, 0.3f));
                    SimConvert.Primitive(PrimitiveType.Sphere, "Cap", t, new Vector3(0, 0.85f, 0), new Vector3(1.7f, 0.5f, 1.3f), MaterialFactory.Lit("pine_snow", new Color(0.95f, 0.97f, 1f), 0f, 0.4f));
                    break;
                case "lamp":
                {
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Pole", t, new Vector3(0, 2.5f, 0), new Vector3(0.12f, 2.5f, 0.12f), MaterialFactory.Lit("lamp_pole", new Color(0.2f, 0.2f, 0.22f), 0.8f, 0.5f));
                    SimConvert.Primitive(PrimitiveType.Sphere, "Bulb", t, new Vector3(0, 5.1f, 0), Vector3.one * 0.5f, MaterialFactory.Lit("lamp_bulb", new Color(1f, 0.85f, 0.6f), 0f, 0.5f, emission: new Color(6f, 4.5f, 2.5f)));
                    break;
                }
                case "neon":
                {
                    bool pink = Mathf.Abs(at.x) % 2f < 1f;
                    var glow = pink ? MaterialFactory.Lit("neon_pink", new Color(1f, 0.2f, 0.75f), 0f, 0.5f, emission: new Color(6f, 0.8f, 4f))
                                    : MaterialFactory.Lit("neon_cyan", new Color(0.2f, 0.9f, 1f), 0f, 0.5f, emission: new Color(0.6f, 4.5f, 6f));
                    SimConvert.Primitive(P, "Frame", t, new Vector3(0, 3.5f, 0), new Vector3(3.2f, 1.4f, 0.2f), MaterialFactory.Lit("neon_frame", new Color(0.1f, 0.1f, 0.12f), 0.5f, 0.5f));
                    SimConvert.Primitive(P, "Tube", t, new Vector3(0, 3.5f, -0.12f), new Vector3(2.8f, 0.15f, 0.05f), glow);
                    SimConvert.Primitive(P, "Tube2", t, new Vector3(0, 3.9f, -0.12f), new Vector3(2.8f, 0.15f, 0.05f), glow);
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Post", t, new Vector3(0, 1.4f, 0), new Vector3(0.15f, 1.4f, 0.15f), MaterialFactory.Lit("lamp_pole", new Color(0.2f, 0.2f, 0.22f), 0.8f, 0.5f));
                    break;
                }
                case "container":
                {
                    var colors = new[] { new Color(0.7f, 0.15f, 0.1f), new Color(0.1f, 0.35f, 0.6f), new Color(0.85f, 0.6f, 0.1f) };
                    var c = colors[Mathf.Abs((int)at.x) % colors.Length];
                    SimConvert.Primitive(P, "Box", t, new Vector3(0, 1.3f, 0), new Vector3(6f, 2.6f, 2.4f), MaterialFactory.Lit("container_" + c.GetHashCode(), c, 0.6f, 0.4f, ProceduralTextures.Planks, ProceduralTextures.PlanksNormal, new Vector2(4f, 1f)));
                    break;
                }
                case "crane":
                {
                    var yellow = MaterialFactory.Lit("crane", new Color(0.9f, 0.65f, 0.1f), 0.6f, 0.4f);
                    SimConvert.Primitive(P, "Tower", t, new Vector3(0, 12f, 0), new Vector3(1.2f, 24f, 1.2f), yellow);
                    SimConvert.Primitive(P, "Jib", t, new Vector3(6f, 23.5f, 0), new Vector3(16f, 0.8f, 0.8f), yellow);
                    SimConvert.Primitive(PrimitiveType.Sphere, "Beacon", t, new Vector3(13.5f, 24.2f, 0), Vector3.one * 0.5f, MaterialFactory.Lit("beacon", Color.red, 0f, 0.5f, emission: new Color(6f, 0.3f, 0.2f)));
                    break;
                }
                case "chimney":
                {
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Stack", t, new Vector3(0, 6f, 0), new Vector3(1.6f, 6f, 1.6f), MaterialFactory.Lit("chimney", new Color(0.3f, 0.26f, 0.24f), 0.4f, 0.3f));
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Ember", t, new Vector3(0, 12.1f, 0), new Vector3(1.3f, 0.1f, 1.3f), MaterialFactory.Lit("lava_glow", new Color(1f, 0.35f, 0.05f), 0f, 0.6f, emission: new Color(6f, 1.6f, 0.2f)));
                    break;
                }
                case "barrel":
                {
                    var red = MaterialFactory.Lit("barrel_red", new Color(0.75f, 0.12f, 0.08f), 0.5f, 0.45f);
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Barrel", t, new Vector3(0, 0.55f, 0), new Vector3(0.75f, 0.55f, 0.75f), red);
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Band", t, new Vector3(0, 0.75f, 0), new Vector3(0.78f, 0.05f, 0.78f), MaterialFactory.Lit("barrel_band", new Color(0.95f, 0.8f, 0.1f), 0.5f, 0.5f));
                    break;
                }
                case "pipe":
                    SimConvert.Primitive(PrimitiveType.Cylinder, "Pipe", t, new Vector3(0, 1f, 0), new Vector3(0.8f, 4f, 0.8f), MaterialFactory.Lit("pipe", new Color(0.4f, 0.38f, 0.36f), 0.9f, 0.4f), Quaternion.Euler(0, 0, 90));
                    break;
                case "banner":
                {
                    var colors = new[] { new Color(1f, 0.35f, 0.12f), new Color(0.18f, 0.89f, 1f), new Color(0.96f, 0.72f, 0.18f) };
                    var c = colors[Mathf.Abs((int)at.x) % colors.Length];
                    SimConvert.Primitive(P, "Banner", t, new Vector3(0, 0.6f, 0), new Vector3(4f, 1.2f, 0.1f), MaterialFactory.Lit("banner_" + c.GetHashCode(), c, 0f, 0.5f, emission: c * 0.4f));
                    break;
                }
                case "tirestack":
                {
                    var rubber = MaterialFactory.Lit("bike_rubber", new Color(0.05f, 0.05f, 0.05f), 0f, 0.25f);
                    for (int i = 0; i < 4; i++)
                        SimConvert.Primitive(PrimitiveType.Cylinder, "Tire", t, new Vector3(0, 0.15f + i * 0.3f, 0), new Vector3(1.1f, 0.15f, 1.1f), rubber);
                    break;
                }
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
                SimConvert.Primitive(PrimitiveType.Cylinder, "Trunk", t, p + Quaternion.Euler(0, 0, -lean) * Vector3.up * 0.55f,
                    new Vector3(0.32f - i * 0.025f, 0.6f, 0.32f - i * 0.025f), trunk, Quaternion.Euler(0, 0, -lean));
                p += Quaternion.Euler(0, 0, -lean) * Vector3.up * 1.1f;
            }
            for (int i = 0; i < 8; i++)
            {
                // Hojas que salen hacia fuera desde la copa y caen un poco por el peso.
                var q = Quaternion.Euler(0f, i * 45f + 10f, 0f) * Quaternion.Euler(0f, 0f, -22f);
                SimConvert.Primitive(PrimitiveType.Cube, "Frond", t, p + q * new Vector3(1.5f, 0f, 0f), new Vector3(3.2f, 0.05f, 0.7f), leaf, q);
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
            SimConvert.Primitive(PrimitiveType.Sphere, "Lamp", t, new Vector3(1.6f, 2.4f, -1.8f), Vector3.one * 0.25f, MaterialFactory.Lit("hut_lamp", new Color(1f, 0.8f, 0.5f), 0f, 0.5f, emission: new Color(4f, 2.4f, 1.2f)));
        }

        private static void Boat(Transform t)
        {
            SimConvert.Primitive(PrimitiveType.Capsule, "Hull", t, new Vector3(0, 0.5f, 0), new Vector3(1.6f, 3f, 1.2f), MaterialFactory.Lit("boat_hull", new Color(0.9f, 0.9f, 0.88f), 0f, 0.7f), Quaternion.Euler(0, 0, 90));
            SimConvert.Primitive(PrimitiveType.Cube, "Stripe", t, new Vector3(0, 0.6f, 0), new Vector3(5.6f, 0.15f, 1.25f), MaterialFactory.Lit("boat_stripe", new Color(0.1f, 0.35f, 0.65f), 0f, 0.7f));
            SimConvert.Primitive(PrimitiveType.Cylinder, "Mast", t, new Vector3(0.3f, 3f, 0), new Vector3(0.1f, 2.5f, 0.1f), MaterialFactory.Lit("boat_mast", new Color(0.4f, 0.3f, 0.2f), 0f, 0.3f));
        }

        private static void Lighthouse(Transform t)
        {
            var white = MaterialFactory.Lit("lh_white", new Color(0.92f, 0.92f, 0.9f), 0f, 0.4f);
            var red = MaterialFactory.Lit("lh_red", new Color(0.75f, 0.12f, 0.1f), 0f, 0.4f);
            for (int i = 0; i < 6; i++)
                SimConvert.Primitive(PrimitiveType.Cylinder, "Band", t, new Vector3(0, 2.5f + i * 5f, 0), new Vector3(5f - i * 0.4f, 2.5f, 5f - i * 0.4f), i % 2 == 0 ? white : red);
            SimConvert.Primitive(PrimitiveType.Sphere, "Lantern", t, new Vector3(0, 31.5f, 0), Vector3.one * 2.4f, MaterialFactory.Lit("lh_light", new Color(1f, 0.95f, 0.8f), 0f, 0.5f, emission: new Color(8f, 7f, 5f)));
        }

        private static void Flag(Transform t)
        {
            SimConvert.Primitive(PrimitiveType.Cylinder, "Pole", t, new Vector3(0, 2f, 0), new Vector3(0.08f, 2f, 0.08f), MaterialFactory.Lit("flag_pole", new Color(0.8f, 0.8f, 0.8f), 1f, 0.7f));
            var black = MaterialFactory.Lit("flag_black", new Color(0.05f, 0.05f, 0.05f), 0f, 0.3f);
            var white = MaterialFactory.Lit("flag_white", new Color(0.95f, 0.95f, 0.95f), 0f, 0.3f);
            for (int x = 0; x < 4; x++)
            for (int y = 0; y < 3; y++)
                SimConvert.Primitive(PrimitiveType.Cube, "Check", t, new Vector3(0.2f + x * 0.3f, 3.4f + y * 0.3f, 0), new Vector3(0.3f, 0.3f, 0.02f), (x + y) % 2 == 0 ? black : white);
        }
    }
}
