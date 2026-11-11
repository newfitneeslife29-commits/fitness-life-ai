using System.Collections.Generic;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Textos en español e inglés (GDD §11). Prototipo: tabla en código.
    /// Producción: Unity Localization con tablas por idioma.
    /// </summary>
    public static class Loc
    {
        public static bool Spanish => Application.systemLanguage == SystemLanguage.Spanish || Application.systemLanguage == SystemLanguage.Catalan || Application.systemLanguage == SystemLanguage.Basque;

        private static readonly Dictionary<string, (string es, string en)> T = new Dictionary<string, (string, string)>
        {
            ["hold_gas"] = ("Mantén GAS para salir", "Hold GAS to start"),
            ["gas"] = ("GAS", "GAS"),
            ["brake"] = ("FRENO", "BRAKE"),
            ["nitro"] = ("NITRO", "NITRO"),
            ["crash"] = ("¡CAÍDA!", "CRASH!"),
            ["checkpoint"] = ("CHECKPOINT", "CHECKPOINT"),
            ["finish"] = ("¡META!", "FINISH!"),
            ["retry"] = ("REPETIR", "RETRY"),
            ["next"] = ("SIGUIENTE (PRONTO)", "NEXT (SOON)"),
            ["best"] = ("Mejor", "Best"),
            ["new_best"] = ("¡NUEVO RÉCORD!", "NEW BEST!"),
            ["coins"] = ("monedas", "coins"),
            ["paused"] = ("PAUSA", "PAUSED"),
            ["resume"] = ("CONTINUAR", "RESUME"),
            ["restart"] = ("REINICIAR", "RESTART"),
            ["haptics"] = ("Vibración", "Haptics"),
            ["shake"] = ("Sacudida de cámara y desenfoque", "Camera shake & blur"),
            ["slowmo"] = ("Cámara lenta en trucos", "Slow motion on tricks"),
            ["tilt"] = ("Equilibrio con giroscopio", "Tilt to balance"),
            ["tc"] = ("Control de tracción", "Traction control"),
            ["sound"] = ("Sonido", "Sound"),
            ["fps"] = ("120 FPS (si la pantalla lo permite)", "120 FPS (if supported)"),
            ["quality"] = ("Calidad", "Quality"),
            ["q_auto"] = ("Automática", "Auto"),
            ["q0"] = ("Baja", "Low"), ["q1"] = ("Media", "Medium"), ["q2"] = ("Alta", "High"), ["q3"] = ("Ultra", "Ultra"),
            ["on"] = ("Sí", "On"), ["off"] = ("No", "Off"),
            ["backflip"] = ("VOLTERETA ATRÁS", "BACKFLIP"),
            ["frontflip"] = ("VOLTERETA ADELANTE", "FRONTFLIP"),
            ["wheelie"] = ("CABALLITO", "WHEELIE"),
            ["stoppie"] = ("STOPPIE", "STOPPIE"),
            ["longjump"] = ("SALTO LARGO", "BIG AIR"),
            ["perfect"] = ("ATERRIZAJE PERFECTO", "PERFECT LANDING"),
            ["combo"] = ("COMBO", "COMBO"),
        };

        public static string Get(string key) => T.TryGetValue(key, out var v) ? (Spanish ? v.es : v.en) : key;

        public static string Time(float seconds)
        {
            int m = (int)(seconds / 60f);
            float s = seconds - m * 60;
            return $"{m}:{s:00.00}";
        }
    }
}
