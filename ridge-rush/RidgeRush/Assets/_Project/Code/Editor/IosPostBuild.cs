#if UNITY_IOS
using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;

namespace RidgeRush.EditorTools
{
    /// <summary>
    /// Ajustes del proyecto de Xcode que Unity no expone:
    /// - CADisableMinimumFrameDurationOnPhone: permite 120 Hz en iPhone con ProMotion.
    /// - Enlaza CoreHaptics para el plugin de vibración.
    /// - ITSAppUsesNonExemptEncryption = false (solo HTTPS estándar), evita la pregunta de exportación en cada envío.
    /// </summary>
    public static class IosPostBuild
    {
        [PostProcessBuild(100)]
        public static void OnPostProcessBuild(BuildTarget target, string path)
        {
            if (target != BuildTarget.iOS) return;

            string plistPath = Path.Combine(path, "Info.plist");
            var plist = new PlistDocument();
            plist.ReadFromFile(plistPath);
            plist.root.SetBoolean("CADisableMinimumFrameDurationOnPhone", true);
            plist.root.SetBoolean("ITSAppUsesNonExemptEncryption", false);
            plist.WriteToFile(plistPath);

            string projPath = PBXProject.GetPBXProjectPath(path);
            var proj = new PBXProject();
            proj.ReadFromFile(projPath);
            string framework = proj.GetUnityFrameworkTargetGuid();
            proj.AddFrameworkToProject(framework, "CoreHaptics.framework", false);
            proj.SetBuildProperty(framework, "SWIFT_VERSION", "5.0");
            proj.WriteToFile(projPath);
        }
    }
}
#endif
