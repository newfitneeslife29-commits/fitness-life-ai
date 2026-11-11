using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>Ajustes del jugador guardados en el dispositivo (Ajustes y Accesibilidad, GDD §10).</summary>
    public static class GameSettings
    {
        private static bool Get(string key, bool def) => PlayerPrefs.GetInt(key, def ? 1 : 0) == 1;
        private static void Set(string key, bool v) { PlayerPrefs.SetInt(key, v ? 1 : 0); PlayerPrefs.Save(); }

        public static bool Haptics { get => Get("rr_haptics", true); set => Set("rr_haptics", value); }
        public static bool CameraShake { get => Get("rr_shake", true); set => Set("rr_shake", value); }
        public static bool SlowMotion { get => Get("rr_slowmo", true); set => Set("rr_slowmo", value); }
        public static bool TiltControl { get => Get("rr_tilt", false); set => Set("rr_tilt", value); }
        public static bool TractionControl { get => Get("rr_tc", true); set => Set("rr_tc", value); }
        public static bool Sound { get => Get("rr_sound", true); set => Set("rr_sound", value); }

        /// <summary>-1 = automático; 0..3 = Bajo, Medio, Alto, Ultra.</summary>
        public static int QualityOverride { get => PlayerPrefs.GetInt("rr_quality", -1); set { PlayerPrefs.SetInt("rr_quality", value); PlayerPrefs.Save(); } }

        /// <summary>Preferir 120 FPS (modo Rendimiento) en pantallas que lo permiten.</summary>
        public static bool HighFrameRate { get => Get("rr_120", true); set => Set("rr_120", value); }

        public static float BestTime(string levelId) => PlayerPrefs.GetFloat("rr_best_" + levelId, 0f);
        public static void SetBestTime(string levelId, float t) { PlayerPrefs.SetFloat("rr_best_" + levelId, t); PlayerPrefs.Save(); }
    }
}
