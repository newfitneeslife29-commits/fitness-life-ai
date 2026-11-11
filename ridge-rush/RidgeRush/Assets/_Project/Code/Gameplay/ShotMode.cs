using System;

namespace RidgeRush.Game
{
    /// <summary>
    /// Modo de capturas automáticas: el juego se abre con <c>-rrShots &lt;carpeta&gt;</c> (workflow ridge-rush-shots.yml)
    /// y recorre menú, garaje y niveles guardando imágenes. Opcional: <c>-rrShotLevels coast_01,city_05</c>.
    /// </summary>
    public static class ShotMode
    {
        public static bool Enabled => Directory != null;
        public static readonly string Directory = Arg("-rrShots");
        public static readonly string[] Levels = (Arg("-rrShotLevels") ?? "coast_01,desert_06,city_06,volcano_06").Split(',');

        private static string Arg(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++) if (args[i] == name) return args[i + 1];
            return null;
        }
    }
}
