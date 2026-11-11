using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace RidgeRush.EditorTools
{
    /// <summary>
    /// Compilación desde la línea de comandos (GitHub Actions, workflow ridge-rush-ios.yml).
    /// Configura el proyecto igual que el menú "Ridge Rush → Configurar proyecto" y genera el proyecto de Xcode.
    ///   -executeMethod RidgeRush.EditorTools.CiBuild.BuildIos -customBuildPath &lt;carpeta&gt; -rrBuildNumber 12 -rrVersion 0.1.12
    /// </summary>
    public static class CiBuild
    {
        /// <summary>
        /// Primera pasada en CI: configura el proyecto (URP, materiales, ajustes de jugador, Input System, escena)
        /// y lo guarda. Unity solo aplica el cambio de sistema de entrada al reiniciarse, por eso la compilación
        /// se hace en una segunda ejecución de Unity (<see cref="BuildIos"/>).
        /// </summary>
        public static void PrepareProject()
        {
            ProjectSetup.SetupAll();
            AssetDatabase.SaveAssets();
            Debug.Log("Ridge Rush: proyecto configurado y guardado para la compilación.");
        }

        public static void BuildIos()
        {
#if !ENABLE_INPUT_SYSTEM
            throw new Exception("El editor arrancó sin el nuevo Input System. Ejecuta antes CiBuild.PrepareProject en otra sesión de Unity.");
#endif
            string output = Arg("-customBuildPath") ?? "build/iOS";
            string buildNumber = Arg("-rrBuildNumber") ?? "1";
            string version = Arg("-rrVersion") ?? "0.1." + buildNumber;

            ProjectSetup.SetupAll();
            PlayerSettings.bundleVersion = version;
            PlayerSettings.iOS.buildNumber = buildNumber;

            var options = new BuildPlayerOptions
            {
                scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray(),
                locationPathName = output,
                target = BuildTarget.iOS,
                targetGroup = BuildTargetGroup.iOS,
                options = BuildOptions.None,
            };
            if (options.scenes.Length == 0) throw new Exception("No hay escenas en la compilación.");

            Debug.Log($"Ridge Rush: compilando iOS {version} ({buildNumber}) en {output}");
            BuildReport report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;
            Debug.Log($"Ridge Rush: resultado {summary.result}, {summary.totalErrors} errores, {summary.totalSize / (1024 * 1024)} MB, {summary.totalTime}");
            if (summary.result != BuildResult.Succeeded)
                throw new Exception($"La compilación de iOS falló: {summary.result} ({summary.totalErrors} errores). Revisa el registro de Unity más arriba.");
        }

        /// <summary>
        /// Juego para Linux (Mono, OpenGL, ventana 1920×1080) que solo usa el workflow de capturas
        /// (ridge-rush-shots.yml) para ver cómo se ve cada cambio sin un iPhone.
        /// </summary>
        public static void BuildLinuxShots()
        {
            string output = Arg("-customBuildPath") ?? "build/StandaloneLinux64/RidgeRush";
            if (!output.EndsWith(".x86_64")) output += ".x86_64";
            ProjectSetup.SetupAll();
            PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneLinux64, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneLinux64, new[] { UnityEngine.Rendering.GraphicsDeviceType.OpenGLCore });
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.defaultScreenWidth = 1920; PlayerSettings.defaultScreenHeight = 1080;
            PlayerSettings.resizableWindow = false;
            var options = new BuildPlayerOptions
            {
                scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray(),
                locationPathName = output,
                target = BuildTarget.StandaloneLinux64,
                targetGroup = BuildTargetGroup.Standalone,
                options = BuildOptions.None,
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            Debug.Log($"Ridge Rush (capturas): {report.summary.result}, {report.summary.totalErrors} errores");
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("La compilación para Linux falló.");
        }

        /// <summary>
        /// Android App Bundle (.aab) firmado para Google Play. La firma la pasa GameCI con -androidKeystoreName,
        /// -androidKeystorePass, -androidKeyaliasName y -androidKeyaliasPass (workflow ridge-rush-android.yml).
        /// </summary>
        public static void BuildAndroid()
        {
#if !ENABLE_INPUT_SYSTEM
            throw new Exception("El editor arrancó sin el nuevo Input System. Ejecuta antes CiBuild.PrepareProject en otra sesión de Unity.");
#endif
            string output = Arg("-customBuildPath") ?? "build/Android/RidgeRush.aab";
            if (!output.EndsWith(".aab")) output += ".aab";
            string buildNumber = Arg("-rrBuildNumber") ?? "1";
            string version = Arg("-rrVersion") ?? "0.1." + buildNumber;

            ProjectSetup.SetupAll();
            PlayerSettings.bundleVersion = version;
            PlayerSettings.Android.bundleVersionCode = int.Parse(buildNumber);
            EditorUserBuildSettings.buildAppBundle = true;

            string keystore = Arg("-androidKeystoreName");
            if (!string.IsNullOrEmpty(keystore))
            {
                PlayerSettings.Android.useCustomKeystore = true;
                PlayerSettings.Android.keystoreName = keystore;
                PlayerSettings.Android.keystorePass = Arg("-androidKeystorePass");
                PlayerSettings.Android.keyaliasName = Arg("-androidKeyaliasName");
                PlayerSettings.Android.keyaliasPass = Arg("-androidKeyaliasPass");
            }
            else Debug.LogWarning("Ridge Rush: sin clave de subida; el .aab irá firmado con la clave de depuración (no vale para Google Play).");

            var options = new BuildPlayerOptions
            {
                scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray(),
                locationPathName = output,
                target = BuildTarget.Android,
                targetGroup = BuildTargetGroup.Android,
                options = BuildOptions.None,
            };
            Debug.Log($"Ridge Rush: compilando Android {version} ({buildNumber}) en {output}");
            var summary = BuildPipeline.BuildPlayer(options).summary;
            Debug.Log($"Ridge Rush: resultado {summary.result}, {summary.totalErrors} errores, {summary.totalSize / (1024 * 1024)} MB");
            if (summary.result != BuildResult.Succeeded)
                throw new Exception($"La compilación de Android falló: {summary.result} ({summary.totalErrors} errores).");
        }

        private static string Arg(string name)
        {
            var args = Environment.GetCommandLineArgs();
            int i = Array.IndexOf(args, name);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
        }
    }
}
