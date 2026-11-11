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
            ["next"] = ("SIGUIENTE", "NEXT"),
            ["menu"] = ("MENÚ", "MENU"),
            ["season"] = ("PASE", "PASS"),
            ["season_title"] = ("PASE DE TEMPORADA 1", "SEASON 1 PASS"),
            ["tier"] = ("Nivel", "Tier"),
            ["free"] = ("Gratis", "Free"),
            ["premium"] = ("Premium", "Premium"),
            ["season_hint"] = ("Gana experiencia terminando carreras, con estrellas, monedas y K.O. La temporada dura 8 semanas.", "Earn XP by finishing races, with stars, coins and K.O.s. The season lasts 8 weeks."),
            ["tutorial"] = ("TUTORIAL", "TUTORIAL"),
            ["replay"] = ("REPETICIÓN", "REPLAY"),
            ["exit_replay"] = ("SALIR", "EXIT"),
            ["tut1"] = ("Mantén GAS (derecha) para acelerar", "Hold GAS (right) to accelerate"),
            ["tut2"] = ("Desliza el pulgar a izquierda o derecha sobre el botón para inclinarte", "Slide your thumb left or right on the button to lean"),
            ["tut3"] = ("Salta y aterriza con las dos ruedas a la vez: ¡aterrizaje perfecto!", "Jump and land on both wheels: perfect landing!"),
            ["tut4"] = ("Recoge el bidón azul y mantén NITRO para un extra de velocidad", "Grab the blue can and hold NITRO for extra speed"),
            ["tut5"] = ("Atraviesa aros de fuego y haz trucos: llenan la barra azul de PODER", "Fly through fire rings and do tricks: they fill the blue POWER bar"),
            ["tut6"] = ("Barra roja llena + rival cerca = pulsa K.O. para derribarlo", "Red bar full + rival nearby = press K.O. to take them down"),
            ["tut_done"] = ("¡Listo! Llega a la meta", "Ready! Reach the finish"),
            ["power"] = ("PODER", "POWER"),
            ["power_ready"] = ("¡PODER LISTO!", "POWER READY!"),
            ["ko_ready"] = ("¡K.O. LISTO!", "K.O. READY!"),
            ["knockout"] = ("¡K.O.!", "K.O.!"),
            ["ko_far"] = ("Acércate a un rival", "Get closer to a rival"),
            ["shield"] = ("TURBO + ESCUDO", "TURBO + SHIELD"),
            ["nitro_pick"] = ("+NITRO", "+NITRO"),
            ["ring"] = ("¡ARO DE FUEGO!", "RING OF FIRE!"),
            ["boost"] = ("¡TURBO!", "BOOST!"),
            ["hit"] = ("¡AY!", "OUCH!"),
            ["blocked"] = ("¡BLOQUEADO!", "BLOCKED!"),
            ["freestyle"] = ("FREESTYLE", "FREESTYLE"),
            ["points"] = ("puntos", "points"),
            ["position"] = ("Puesto", "Position"),
            ["leaderboards"] = ("CLASIFICACIONES", "LEADERBOARDS"),
            ["play"] = ("JUGAR", "PLAY"),
            ["garage"] = ("GARAJE", "GARAGE"),
            ["shop"] = ("TIENDA", "SHOP"),
            ["worlds"] = ("MUNDOS", "WORLDS"),
            ["back"] = ("VOLVER", "BACK"),
            ["locked"] = ("BLOQUEADO", "LOCKED"),
            ["career"] = ("CARRERA", "CAREER"),
            ["timetrial"] = ("CONTRARRELOJ", "TIME TRIAL"),
            ["endless"] = ("INFINITO", "ENDLESS"),
            ["endless_hint"] = ("Pista sin fin", "Never-ending track"),
            ["daily"] = ("Recompensa diaria", "Daily reward"),
            ["day"] = ("Día", "Day"),
            ["speed"] = ("Velocidad", "Speed"),
            ["accel"] = ("Aceleración", "Acceleration"),
            ["grip"] = ("Agarre", "Grip"),
            ["susp"] = ("Suspensión", "Suspension"),
            ["weight"] = ("Peso", "Weight"),
            ["engine"] = ("Motor", "Engine"),
            ["tires"] = ("Llantas", "Tires"),
            ["suspension"] = ("Suspensión", "Suspension"),
            ["brakes"] = ("Frenos", "Brakes"),
            ["nitro_up"] = ("Nitro", "Nitro"),
            ["select"] = ("ELEGIR", "SELECT"),
            ["selected"] = ("ELEGIDA", "SELECTED"),
            ["buy"] = ("COMPRAR", "BUY"),
            ["rarity0"] = ("Común", "Common"), ["rarity1"] = ("Rara", "Rare"), ["rarity2"] = ("Épica", "Epic"), ["rarity3"] = ("Legendaria", "Legendary"),
            ["restore"] = ("Restaurar compras", "Restore purchases"),
            ["restore_hint"] = ("Las gemas también se ganan jugando. Sin cajas de botín: siempre sabes lo que compras.", "Gems can also be earned by playing. No loot boxes: you always know what you buy."),
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
