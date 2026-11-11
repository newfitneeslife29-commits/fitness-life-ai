using System;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Pase de temporada (GDD §7): 30 niveles de recompensa por temporada (6–8 semanas).
    /// La experiencia se gana jugando; la línea gratuita es para todos y la premium se compra
    /// (producto no consumible por temporada: com.ridgerush.promoto.season1).
    /// </summary>
    public static class SeasonPass
    {
        public const int Tiers = 30;
        public const int XpPerTier = 1000;
        public const string ProductId = Store.Prefix + "season1";

        public struct Reward
        {
            public int Coins, Gems;
            public string Label;
        }

        public static int Tier => Math.Min(Tiers, SaveSystem.Data.seasonXp / XpPerTier);
        public static float TierProgress => Tier >= Tiers ? 1f : (SaveSystem.Data.seasonXp % XpPerTier) / (float)XpPerTier;

        /// <summary>Experiencia por carrera: terminar, estrellas, monedas y K.O.</summary>
        public static int XpFor(int stars, int coins, bool finished) => (finished ? 150 : 40) + stars * 80 + coins / 4;

        public static void AddXp(int xp)
        {
            SaveSystem.Data.seasonXp += Math.Max(0, xp);
            SaveSystem.Save();
        }

        public static Reward Free(int tier) => tier % 5 == 4
            ? new Reward { Gems = 10, Label = "◆ 10" }
            : new Reward { Coins = 300 + tier * 40, Label = $"● {300 + tier * 40}" };

        public static Reward Premium(int tier) => tier % 3 == 2
            ? new Reward { Gems = 25 + tier, Label = $"◆ {25 + tier}" }
            : new Reward { Coins = 800 + tier * 120, Label = $"● {800 + tier * 120}" };

        public static bool CanClaim(int tier, bool premium)
        {
            var d = SaveSystem.Data;
            if (tier >= Tier) return false;
            if (premium) return d.seasonPremium && !d.seasonClaimedPremium.Contains(tier);
            return !d.seasonClaimedFree.Contains(tier);
        }

        public static bool Claim(int tier, bool premium)
        {
            if (!CanClaim(tier, premium)) return false;
            var d = SaveSystem.Data;
            var r = premium ? Premium(tier) : Free(tier);
            d.coins += r.Coins; d.gems += r.Gems;
            (premium ? d.seasonClaimedPremium : d.seasonClaimedFree).Add(tier);
            SaveSystem.Save();
            return true;
        }
    }
}
