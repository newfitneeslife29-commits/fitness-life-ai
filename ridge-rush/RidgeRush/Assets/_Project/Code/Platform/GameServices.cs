using System.Runtime.InteropServices;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Servicios de juego del sistema (GDD §8): Game Center en iPhone (Plugins/iOS/RRGameCenter.swift).
    /// Google Play Games en Android llega en la Fase 6 (por ahora no hace nada en Android).
    /// Las clasificaciones y logros deben existir en App Store Connect con estos ids (docs/07-app-store.md).
    /// </summary>
    public static class GameServices
    {
        public const string BoardTotalStars = "rr_total_stars";

        public static void Authenticate()
        {
#if UNITY_IOS && !UNITY_EDITOR
            RRGC_Authenticate();
#endif
        }

        /// <summary>Al terminar un nivel: estrellas totales, tiempo en los niveles finales y logros.</summary>
        public static void ReportLevel(string levelId, float time, int totalStars)
        {
            Score(BoardTotalStars, totalStars);
            // Clasificación de cada nivel final de mundo (tiempo en centésimas; menor es mejor).
            if (levelId.EndsWith("_25") || levelId == "stadium_10")
                Score("rr_final_" + levelId.Substring(0, levelId.LastIndexOf('_')), (long)(time * 100f));
            Achievement("rr_first_finish");
            if (levelId.EndsWith("_25") || levelId == "stadium_10") Achievement("rr_world_" + levelId.Substring(0, levelId.LastIndexOf('_')));
            if (totalStars >= 50) Achievement("rr_stars_50");
            if (totalStars >= 150) Achievement("rr_stars_150");
            if (totalStars >= 300) Achievement("rr_stars_300");
        }

        public static void Score(string board, long value)
        {
#if UNITY_IOS && !UNITY_EDITOR
            RRGC_Score(board, value);
#endif
        }

        public static void Achievement(string id)
        {
            if (PlayerPrefs.GetInt("rr_ach_" + id, 0) == 1) return; // ya enviado
            PlayerPrefs.SetInt("rr_ach_" + id, 1);
#if UNITY_IOS && !UNITY_EDITOR
            RRGC_Achievement(id, 100.0);
#endif
        }

        public static void ShowDashboard()
        {
#if UNITY_IOS && !UNITY_EDITOR
            RRGC_Dashboard();
#endif
        }

#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void RRGC_Authenticate();
        [DllImport("__Internal")] private static extern void RRGC_Score(string board, long value);
        [DllImport("__Internal")] private static extern void RRGC_Achievement(string id, double percent);
        [DllImport("__Internal")] private static extern void RRGC_Dashboard();
#endif
    }
}
