using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace RidgeRush.Game
{
    public enum QualityTier { Low = 0, Medium = 1, High = 2, Ultra = 3 }

    /// <summary>
    /// Detecta la calidad gráfica según el dispositivo (docs/03 §2.3 y docs/05-android.md) y la aplica:
    /// escala de render, sombras, MSAA, HDR, post-procesado, partículas y FPS (60 / 120 en ProMotion y
    /// pantallas Android de 120 Hz). El jugador puede forzar una calidad en Ajustes.
    /// </summary>
    public static class QualityManager
    {
        public static QualityTier Tier { get; private set; } = QualityTier.High;
        public static float ParticleScale { get; private set; } = 1f;
        public static bool MotionBlur => Tier >= QualityTier.High;

        public static QualityTier Detect()
        {
            int ram = SystemInfo.systemMemorySize; // MB
#if UNITY_IOS && !UNITY_EDITOR
            return DetectIos(SystemInfo.deviceModel, ram);
#elif UNITY_ANDROID && !UNITY_EDITOR
            return DetectAndroid(SystemInfo.graphicsDeviceName ?? "", ram, SystemInfo.processorCount);
#else
            return QualityTier.Ultra;
#endif
        }

        /// <summary>
        /// iPhone por identificador de modelo ("iPhone15,2" = iPhone 14 Pro, chip A16).
        /// El número mayor sube con cada generación: 11 = A12, 12 = A13, 13 = A14, 14 = A15, 15 = A16, 16 = A17 Pro, 17 = A18.
        /// Un modelo más nuevo que la tabla se trata como Ultra.
        /// </summary>
        public static QualityTier DetectIos(string model, int ramMb)
        {
            var m = Regex.Match(model ?? "", @"iPhone(\d+),(\d+)");
            if (!m.Success) return ramMb >= 6000 ? QualityTier.High : QualityTier.Medium; // iPad u otro
            int major = int.Parse(m.Groups[1].Value);
            int minor = int.Parse(m.Groups[2].Value);
            if (major <= 12) return QualityTier.Low;            // A12, A13 (XS, XR, 11, SE 2)
            if (major <= 14) return QualityTier.Medium;         // A14, A15 (12, 13, 14, SE 3)
            if (major == 15) return QualityTier.High;           // A16 (14 Pro, 15)
            if (major == 16) return QualityTier.High;           // A17 Pro (15 Pro)
            if (major == 17) return minor <= 2 ? QualityTier.Ultra : QualityTier.High; // 16 Pro (A18 Pro) / 16 (A18)
            return QualityTier.Ultra;                            // posteriores
        }

        /// <summary>
        /// Android: por familia de GPU y memoria (la variedad de modelos hace inviable una tabla por modelo).
        /// La tabla se podrá ajustar desde el servidor (configuración remota) con datos reales de rendimiento.
        /// </summary>
        public static QualityTier DetectAndroid(string gpu, int ramMb, int cores)
        {
            gpu = gpu.ToLowerInvariant();
            int score = 0;
            var adreno = Regex.Match(gpu, @"adreno\D*(\d{3})");
            var mali = Regex.Match(gpu, @"mali-g(\d+)");
            if (adreno.Success)
            {
                int n = int.Parse(adreno.Groups[1].Value);
                score = n >= 740 ? 3 : n >= 660 ? 2 : n >= 618 ? 1 : 0;   // 8 Gen 2+ / 8+ Gen 1 / gama media / baja
            }
            else if (gpu.Contains("immortalis")) score = 3;                // Dimensity 9200+
            else if (mali.Success)
            {
                int n = int.Parse(mali.Groups[1].Value);
                score = n >= 710 ? 2 : n >= 68 ? 1 : 0;                     // G710+/G715 / G68-G78 / anteriores
            }
            else if (gpu.Contains("xclipse")) score = 2;                   // Exynos con RDNA
            else if (gpu.Contains("powervr")) score = 0;

            if (ramMb < 4500) score = Mathf.Min(score, 1);
            if (ramMb < 3500 || cores < 6) score = 0;
            return (QualityTier)Mathf.Clamp(score, 0, 3);
        }

        public static void Apply(QualityTier tier, Camera cam, Volume postVolume, Light sun)
        {
            Tier = tier;
            var urp = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
            if (urp != null)
            {
                urp.renderScale = tier switch { QualityTier.Low => 0.7f, QualityTier.Medium => 0.8f, QualityTier.High => 0.9f, _ => 1f };
                urp.shadowDistance = tier switch { QualityTier.Low => 25f, QualityTier.Medium => 40f, _ => 60f };
                urp.shadowCascadeCount = tier switch { QualityTier.Low => 1, QualityTier.Ultra => 3, _ => 2 };
                urp.msaaSampleCount = tier >= QualityTier.High ? 4 : 1;
                urp.supportsHDR = tier >= QualityTier.Medium;
            }
            if (sun != null) sun.shadows = tier == QualityTier.Low ? LightShadows.Hard : LightShadows.Soft;

            var camData = cam.GetUniversalAdditionalCameraData();
            camData.renderPostProcessing = true;
            camData.antialiasing = tier >= QualityTier.High ? AntialiasingMode.None : AntialiasingMode.FastApproximateAntialiasing;

            if (postVolume != null && postVolume.profile != null)
            {
                if (postVolume.profile.TryGet(out MotionBlur mb)) mb.active = tier >= QualityTier.High && GameSettings.CameraShake;
                if (postVolume.profile.TryGet(out ChromaticAberration ca)) ca.active = tier >= QualityTier.High;
                if (postVolume.profile.TryGet(out Bloom bloom)) bloom.highQualityFiltering.Override(tier == QualityTier.Ultra);
            }

            ParticleScale = tier switch { QualityTier.Low => 0.4f, QualityTier.Medium => 0.7f, _ => 1f };
            ApplyFrameRate();
        }

        /// <summary>120 FPS en pantallas que lo permiten (iPhone Pro con ProMotion, Android de 120 Hz) si el jugador lo prefiere.</summary>
        public static void ApplyFrameRate()
        {
            QualitySettings.vSyncCount = 0;
            double hz = Screen.currentResolution.refreshRateRatio.value;
            bool can120 = hz >= 119.0 && Tier >= QualityTier.High;
            Application.targetFrameRate = can120 && GameSettings.HighFrameRate ? 120 : 60;
        }
    }
}
