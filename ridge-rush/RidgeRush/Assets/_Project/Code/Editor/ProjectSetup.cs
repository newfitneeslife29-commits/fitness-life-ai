using System.IO;
using System.Linq;
using RidgeRush.Game;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object = UnityEngine.Object;

namespace RidgeRush.EditorTools
{
    /// <summary>
    /// Menú "Ridge Rush → Configurar proyecto (iOS + Android)": deja el proyecto listo para jugar el prototipo.
    /// 1) Crea y asigna el URP (si el proyecto no tiene uno).
    /// 2) Crea los materiales base (para que los shaders entren en la compilación).
    /// 3) Ajustes de jugador para iOS (Metal, iOS 17, vertical) y Android (Vulkan, ARM64, Android 10+, vertical).
    /// 4) Crea la escena Race_Prototype y la añade a la compilación.
    /// Se puede ejecutar varias veces sin duplicar nada.
    /// </summary>
    public static class ProjectSetup
    {
        private const string Root = "Assets/_Project";
        private const string SettingsDir = Root + "/Settings";
        private const string MaterialsDir = Root + "/Art/Materials";
        private const string ScenePath = Root + "/Scenes/Race_Prototype.unity";
        private const string LevelPath = Root + "/Levels/coast/w1_l01.json";

        [MenuItem("Ridge Rush/Configurar proyecto (iOS + Android)", priority = 0)]
        public static void SetupAll()
        {
            Directory.CreateDirectory(SettingsDir);
            Directory.CreateDirectory(MaterialsDir);
            Directory.CreateDirectory(Path.GetDirectoryName(ScenePath));
            AssetDatabase.Refresh();

            EnsureUrp();
            var lib = EnsureMaterials();
            ConfigurePlayer();
            EnsureIcon();
            CreateScene(lib);
            AssetDatabase.SaveAssets();
            Debug.Log("Ridge Rush: proyecto configurado. Abre Race_Prototype y pulsa Play (↑ gas, ↓ freno, ←/→ equilibrio, Espacio nitro, R reiniciar).");
        }

        [MenuItem("Ridge Rush/Abrir escena del prototipo", priority = 1)]
        public static void OpenScene()
        {
            if (!File.Exists(ScenePath)) SetupAll();
            EditorSceneManager.OpenScene(ScenePath);
        }

        private static void EnsureUrp()
        {
            if (GraphicsSettings.defaultRenderPipeline is UniversalRenderPipelineAsset existing)
            {
                if (QualitySettings.renderPipeline == null) QualitySettings.renderPipeline = existing;
                return;
            }
            var rendererData = ScriptableObject.CreateInstance<UniversalRendererData>();
            AssetDatabase.CreateAsset(rendererData, SettingsDir + "/RR_UniversalRenderer.asset");
            var urp = UniversalRenderPipelineAsset.Create(rendererData);
            urp.supportsHDR = true;
            urp.msaaSampleCount = 4;
            urp.shadowDistance = 60f;
            urp.shadowCascadeCount = 2;
            AssetDatabase.CreateAsset(urp, SettingsDir + "/RR_URP.asset");
            GraphicsSettings.defaultRenderPipeline = urp;
            for (int i = 0; i < QualitySettings.names.Length; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = urp;
            }
            Debug.Log("Ridge Rush: URP creado y asignado.");
        }

        private static MaterialLibrary EnsureMaterials()
        {
            string libPath = SettingsDir + "/RR_MaterialLibrary.asset";
            var lib = AssetDatabase.LoadAssetAtPath<MaterialLibrary>(libPath);
            if (lib == null)
            {
                lib = ScriptableObject.CreateInstance<MaterialLibrary>();
                AssetDatabase.CreateAsset(lib, libPath);
            }

            lib.lit = LoadOrCreate("M_BaseLit", "Universal Render Pipeline/Lit", null);
            lib.particles = LoadOrCreate("M_BaseParticles", "Universal Render Pipeline/Particles/Unlit", m =>
            {
                // Transparente con mezcla alfa y color por vértice.
                m.SetFloat("_Surface", 1f);
                m.SetFloat("_Blend", 0f);
                m.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
                m.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
                m.SetFloat("_SrcBlendAlpha", (float)BlendMode.One);
                m.SetFloat("_DstBlendAlpha", (float)BlendMode.OneMinusSrcAlpha);
                m.SetFloat("_ZWrite", 0f);
                m.SetOverrideTag("RenderType", "Transparent");
                m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                m.renderQueue = (int)RenderQueue.Transparent;
            });
            lib.skybox = LoadOrCreate("M_Sky", "Skybox/Procedural", null);
            EditorUtility.SetDirty(lib);
            return lib;
        }

        private static Material LoadOrCreate(string name, string shader, System.Action<Material> configure)
        {
            string path = $"{MaterialsDir}/{name}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m != null) return m;
            var s = Shader.Find(shader);
            if (s == null) throw new System.Exception($"No se encontró el shader '{shader}'. ¿Está instalado URP?");
            m = new Material(s) { name = name };
            configure?.Invoke(m);
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        private static void ConfigurePlayer()
        {
            PlayerSettings.companyName = "Ridge Rush Studio";
            PlayerSettings.productName = "Ridge Rush";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.statusBarHidden = true;
            UseNewInputSystem();

            // iOS: Metal, iOS 17+, solo iPhone, IL2CPP.
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.ridgerush.promoto");
            PlayerSettings.iOS.targetOSVersionString = "17.0";
            PlayerSettings.iOS.targetDevice = iOSTargetDevice.iPhoneOnly;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.iOS, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.iOS, new[] { GraphicsDeviceType.Metal });
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);

            // Android: Vulkan (con OpenGL ES 3 de respaldo), ARM64, Android 10 (API 29)+, IL2CPP.
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.ridgerush.promoto");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = (AndroidSdkVersions)29;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.Vulkan, GraphicsDeviceType.OpenGLES3 });
            PlayerSettings.Android.renderOutsideSafeArea = true;   // dibujar bajo los recortes; el HUD respeta el Safe Area
            PlayerSettings.Android.optimizedFramePacing = true;
        }

        /// <summary>
        /// Activa el backend del nuevo Input System ("Active Input Handling" = Input System Package).
        /// Sin esto, en compilaciones por línea de comandos los toques y el teclado no llegan al juego.
        /// No hay API pública: se edita ProjectSettings.asset como hace la ventana de ajustes.
        /// </summary>
        private static void UseNewInputSystem()
        {
            var settings = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset").FirstOrDefault();
            if (settings == null) return;
            var so = new SerializedObject(settings);
            var prop = so.FindProperty("activeInputHandler");
            if (prop == null || prop.intValue == 1) return;
            prop.intValue = 1; // 0 = antiguo, 1 = Input System, 2 = ambos
            so.ApplyModifiedPropertiesWithoutUndo();
            Debug.Log("Ridge Rush: Active Input Handling = Input System Package (en el editor, reinícialo para que surta efecto).");
        }

        /// <summary>
        /// Icono provisional de la app (1024×1024, sin transparencia, como exige la App Store):
        /// degradado ascua → asfalto, cresta de montaña y huella de neumático (docs/02 §7). Sin texto.
        /// </summary>
        private static void EnsureIcon()
        {
            const string dir = Root + "/Art/Icon";
            const string path = dir + "/AppIcon.png";
            if (!File.Exists(path))
            {
                Directory.CreateDirectory(dir);
                const int n = 1024;
                var tex = new Texture2D(n, n, TextureFormat.RGB24, false);
                var px = new Color32[n * n];
                var ember = new Color(1f, 0.353f, 0.122f);
                var asphalt = new Color(0.07f, 0.078f, 0.09f);
                var bone = new Color(0.95f, 0.937f, 0.914f);
                for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    float u = x / (float)n, v = y / (float)n;
                    Color c = Color.Lerp(asphalt, ember, Mathf.Clamp01(v * 1.1f - u * 0.25f));
                    // Cresta de montaña (silueta oscura en la mitad inferior).
                    float ridge = 0.34f + 0.16f * Mathf.Max(0f, 1f - Mathf.Abs(u - 0.42f) * 3.2f) + 0.08f * Mathf.Max(0f, 1f - Mathf.Abs(u - 0.78f) * 5f);
                    if (v < ridge) c = Color.Lerp(asphalt, c, 0.18f);
                    // Huella de neumático en diagonal (banda con tacos).
                    float d = (u + v * 0.55f) - 0.86f;
                    if (Mathf.Abs(d) < 0.075f)
                    {
                        float along = (u - v * 0.55f) * 22f;
                        bool knob = Mathf.Abs(d) > 0.02f && (along - Mathf.Floor(along)) < 0.55f;
                        c = knob ? bone : Color.Lerp(c, asphalt, 0.75f);
                    }
                    px[y * n + x] = c;
                }
                tex.SetPixels32(px);
                tex.Apply();
                File.WriteAllBytes(path, tex.EncodeToPNG());
                Object.DestroyImmediate(tex);
                AssetDatabase.ImportAsset(path);
                var importer = (TextureImporter)AssetImporter.GetAtPath(path);
                importer.textureType = TextureImporterType.Default;
                importer.alphaSource = TextureImporterAlphaSource.None;
                importer.npotScale = TextureImporterNPOTScale.None;
                importer.mipmapEnabled = false;
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                importer.SaveAndReimport();
            }
            var icon = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            PlayerSettings.SetIcons(NamedBuildTarget.Unknown, new[] { icon }, IconKind.Application);
        }

        private static void CreateScene(MaterialLibrary lib)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
            var cam = camGo.AddComponent<Camera>();
            cam.fieldOfView = 50f;
            cam.clearFlags = CameraClearFlags.Skybox;
            camGo.AddComponent<AudioListener>();
            var camData = cam.GetUniversalAdditionalCameraData();
            camData.renderPostProcessing = true;
            camData.renderShadows = true;

            var es = new GameObject("EventSystem");
            es.AddComponent<EventSystem>();
            es.AddComponent<InputSystemUIInputModule>();

            var race = new GameObject("RaceController");
            var rc = race.AddComponent<RaceController>();
            rc.levelJson = AssetDatabase.LoadAssetAtPath<TextAsset>(LevelPath);
            rc.materials = lib;
            rc.mainCamera = cam;
            if (rc.levelJson == null) Debug.LogError($"No se encontró el nivel en {LevelPath}");

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }
    }
}
