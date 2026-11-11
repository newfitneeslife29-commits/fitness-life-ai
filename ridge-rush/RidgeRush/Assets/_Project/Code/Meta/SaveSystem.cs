using System;
using System.Collections.Generic;
using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>Récord de un nivel.</summary>
    [Serializable]
    public sealed class LevelRecord
    {
        public string id;
        public int stars;
        public float best;
    }

    /// <summary>
    /// Progreso del jugador. Se guarda en el dispositivo (PlayerPrefs, JSON) y en la Fase 6 se sincroniza
    /// con el backend para tener el mismo progreso en iPhone y Android.
    /// </summary>
    [Serializable]
    public sealed class SaveData
    {
        public int version = 1;
        public List<LevelRecord> levels = new List<LevelRecord>();
        public int coins;
        public int gems;
        public string selectedBike = "haldane_sprout_125";
        public List<string> ownedBikes = new List<string> { "haldane_sprout_125" };
        public List<BikeUpgrades> upgrades = new List<BikeUpgrades>();
        public List<BikePaint> paints = new List<BikePaint>();
        public string lastLevel = "coast_01";
        public int freestyleBest;      // récord de puntos en Freestyle
        public long lastDailyReward;   // día (UTC) de la última recompensa diaria
        public int dailyStreak;
    }

    [Serializable]
    public sealed class BikeUpgrades
    {
        public string bike;
        public int engine, tires, suspension, brakes, nitro; // 0..5
    }

    [Serializable]
    public sealed class BikePaint
    {
        public string bike;
        public Color body = new Color(0.95f, 0.36f, 0.1f);
        public Color rider = new Color(0.1f, 0.45f, 0.9f);
    }

    public static class SaveSystem
    {
        private const string Key = "rr_save_v1";
        private static SaveData _data;

        public static SaveData Data
        {
            get
            {
                if (_data != null) return _data;
                try { _data = JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(Key, "")); } catch { _data = null; }
                return _data ??= new SaveData();
            }
        }

        public static void Save()
        {
            PlayerPrefs.SetString(Key, JsonUtility.ToJson(Data));
            PlayerPrefs.Save();
        }

        public static LevelRecord Record(string id)
        {
            foreach (var r in Data.levels) if (r.id == id) return r;
            return null;
        }

        public static int Stars(string id) => Record(id)?.stars ?? 0;

        /// <summary>Guarda el resultado de una carrera terminada. Devuelve true si es récord.</summary>
        public static bool ReportFinish(string id, int stars, float time, int coins)
        {
            var r = Record(id);
            bool best = false;
            if (r == null) { r = new LevelRecord { id = id }; Data.levels.Add(r); }
            if (r.best <= 0f || time < r.best) { r.best = time; best = true; }
            r.stars = Math.Max(r.stars, stars);
            Data.coins += coins;
            Save();
            return best;
        }

        public static int WorldStars(string world)
        {
            int total = 0;
            foreach (var r in Data.levels) if (r.id.StartsWith(world + "_", StringComparison.Ordinal)) total += r.stars;
            return total;
        }

        public static int TotalStars()
        {
            int total = 0;
            foreach (var r in Data.levels) total += r.stars;
            return total;
        }

        /// <summary>
        /// Desbloqueo (GDD §7): cada mundo se abre al terminar el nivel final del anterior o al reunir 40 estrellas
        /// por mundo previo; el estadio (bonus) con 150 estrellas.
        /// </summary>
        public static bool WorldUnlocked(int worldIndex)
        {
            if (worldIndex == 0) return true;
            var worlds = LevelGenerator.Worlds;
            if (worlds[worldIndex].Supercross) return TotalStars() >= 150;
            var prev = worlds[worldIndex - 1];
            return Stars($"{prev.Id}_{prev.LevelCount:00}") > 0 || TotalStars() >= 40 * worldIndex;
        }

        public static int StarsNeeded(int worldIndex) => LevelGenerator.Worlds[worldIndex].Supercross ? 150 : 40 * worldIndex;

        public static bool LevelUnlocked(string world, int index) => index == 0 || Stars($"{world}_{index:00}") > 0;

        public static BikeUpgrades Upgrades(string bike)
        {
            foreach (var u in Data.upgrades) if (u.bike == bike) return u;
            var n = new BikeUpgrades { bike = bike };
            Data.upgrades.Add(n);
            return n;
        }

        public static BikePaint Paint(string bike)
        {
            foreach (var p in Data.paints) if (p.bike == bike) return p;
            var n = new BikePaint { bike = bike };
            Data.paints.Add(n);
            return n;
        }
    }

    /// <summary>Carga los niveles (JSON en Resources/Levels/&lt;mundo&gt;/).</summary>
    public static class LevelCatalog
    {
        private static readonly Dictionary<string, TextAsset[]> Cache = new Dictionary<string, TextAsset[]>();

        public static TextAsset[] Levels(string world)
        {
            if (Cache.TryGetValue(world, out var list)) return list;
            list = Resources.LoadAll<TextAsset>("Levels/" + world);
            Array.Sort(list, (a, b) => string.CompareOrdinal(a.name, b.name));
            Cache[world] = list;
            return list;
        }

        public static LevelData Load(string id)
        {
            int sep = id.LastIndexOf('_');
            string world = sep > 0 ? id.Substring(0, sep) : "coast";
            foreach (var t in Levels(world))
                if (t.name == id) return JsonUtility.FromJson<LevelData>(t.text);
            return null;
        }

        /// <summary>Id del nivel siguiente del mismo mundo, o null si era el último.</summary>
        public static string Next(string id)
        {
            int sep = id.LastIndexOf('_');
            if (sep < 0 || !int.TryParse(id.Substring(sep + 1), out int n)) return null;
            string world = id.Substring(0, sep);
            string next = $"{world}_{n + 1:00}";
            return Load(next) != null ? next : null;
        }
    }
}
