using System.Collections.Generic;
using RidgeRush.Simulation;

namespace RidgeRush.Game
{
    /// <summary>
    /// Modo ELIMINATORIA (estilo "battle royale" de carreras): 12 pilotos, niveles al azar y tres rondas.
    /// Ronda 1: se clasifican 8. Ronda 2: 4. Final: gana solo el primero (corona).
    /// Los que no entran en los puestos de clasificación quedan eliminados.
    /// De momento los rivales son pilotos de la IA con nombre; el modo en línea usará el mismo flujo.
    /// </summary>
    public sealed class KnockoutSession
    {
        public const string You = "__you__";
        public static readonly int[] QualifyPerRound = { 8, 4, 1 };
        private static readonly string[] Names =
        {
            "TurboTaco", "LaCabra", "MotoMax", "Rayo99", "ChispaX", "DonDerrape", "Kiwi", "NitroNina", "ElPulpo", "Saltamontes",
            "Bigotes", "Cometa", "Zigzag", "PataDePalo", "Ronroneo", "Volcán", "Pistacho", "Tornado", "Mapache", "Cohete",
            "Burbuja", "Trueno", "Gazpacho", "Panchito", "Lechuza", "Torbellino", "Churro", "Relámpago", "Coco", "Pingüino",
        };

        public int Round;                       // 1..3
        public int Rounds => QualifyPerRound.Length;
        public int Qualify => QualifyPerRound[Round - 1];
        public readonly List<string> Alive = new List<string>();    // rivales que siguen en juego
        public readonly List<string> Finished = new List<string>(); // orden de llegada de esta ronda
        public readonly List<string> RecentLevels = new List<string>();
        private readonly System.Random _rnd;

        public KnockoutSession(int seed)
        {
            _rnd = new System.Random(seed);
            var pool = new List<string>(Names);
            for (int i = 0; i < 11; i++)
            {
                int k = _rnd.Next(pool.Count);
                Alive.Add(pool[k]); pool.RemoveAt(k);
            }
        }

        public void StartRound() { Round++; Finished.Clear(); }

        /// <summary>Nivel al azar de cualquier mundo (no finales), sin repetir los de esta partida.</summary>
        public string PickLevel()
        {
            var worlds = LevelGenerator.Worlds;
            for (int tries = 0; tries < 40; tries++)
            {
                var w = worlds[_rnd.Next(worlds.Length - 1)]; // sin el estadio
                int idx = 2 + _rnd.Next(System.Math.Max(1, System.Math.Min(14, w.LevelCount - 3)));
                string id = $"{w.Id}_{idx:00}";
                if (RecentLevels.Contains(id)) continue;
                RecentLevels.Add(id);
                return id;
            }
            return "coast_03";
        }

        public int Place(string name) => Finished.IndexOf(name) + 1;
        public float NextSkill() => 0.6f + (float)_rnd.NextDouble() * 0.35f;
        public int NextBike(int count) => _rnd.Next(count);
    }
}
