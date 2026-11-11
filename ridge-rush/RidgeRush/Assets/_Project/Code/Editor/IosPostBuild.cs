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
    /// - Enlaza CoreHaptics, GameKit (Game Center) y StoreKit (compras) y crea RidgeRush.entitlements.
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
            proj.AddFrameworkToProject(framework, "GameKit.framework", false);
            proj.AddFrameworkToProject(framework, "StoreKit.framework", false);

            // Derechos de la app (Game Center). El workflow los aplica al firmar (el archivo se compila sin firmar).
            var entitlements = new PlistDocument();
            entitlements.root.SetBoolean("com.apple.developer.game-center", true);
            entitlements.WriteToFile(Path.Combine(path, "RidgeRush.entitlements"));
            proj.SetBuildProperty(proj.GetUnityMainTargetGuid(), "CODE_SIGN_ENTITLEMENTS", "RidgeRush.entitlements");
            proj.SetBuildProperty(framework, "SWIFT_VERSION", "5.0");
            proj.WriteToFile(projPath);
        }
    }
}
#endif
