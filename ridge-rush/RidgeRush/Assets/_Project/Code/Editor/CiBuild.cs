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
        public static void BuildIos()
        {
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

        private static string Arg(string name)
        {
            var args = Environment.GetCommandLineArgs();
            int i = Array.IndexOf(args, name);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
        }
    }
}
