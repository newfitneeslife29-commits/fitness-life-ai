using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>Producto de la tienda (GDD §9).</summary>
    public sealed class StoreProduct
    {
        public string Id;            // id en App Store Connect (o local si se paga con gemas)
        public string TitleEs, TitleEn;
        public int Gems, Coins;      // lo que da
        public int GemCost;          // > 0: se compra con gemas, sin dinero real
        public bool NonConsumable;   // quitar anuncios
        public string FallbackPrice; // precio orientativo mientras no carga el real
    }

    /// <summary>
    /// Tienda. Las compras con dinero real usan StoreKit 2 en iPhone (Plugins/iOS/RRStore.swift).
    /// Los productos deben existir en App Store Connect con estos mismos ids. En Android se conectará
    /// Google Play Billing (Fase 6); en el editor las compras se simulan para poder probar.
    /// Sin cajas de botín: todo lo que se compra se sabe de antemano (norma 3.1.1 de la App Store).
    /// </summary>
    public static class Store
    {
        public const string Prefix = "com.ridgerush.promoto.";

        public static readonly StoreProduct[] Products =
        {
            new StoreProduct { Id = Prefix + "gems80", TitleEs = "Bolsa de gemas", TitleEn = "Gem pouch", Gems = 80, FallbackPrice = "0,99 €" },
            new StoreProduct { Id = Prefix + "gems500", TitleEs = "Cofre de gemas", TitleEn = "Gem chest", Gems = 500, FallbackPrice = "4,99 €" },
            new StoreProduct { Id = Prefix + "gems1200", TitleEs = "Bóveda de gemas", TitleEn = "Gem vault", Gems = 1200, FallbackPrice = "9,99 €" },
            new StoreProduct { Id = Prefix + "starter", TitleEs = "Pack de inicio", TitleEn = "Starter pack", Gems = 300, Coins = 5000, FallbackPrice = "2,99 €" },
            new StoreProduct { Id = Prefix + "noads", TitleEs = "Sin anuncios", TitleEn = "No ads", NonConsumable = true, FallbackPrice = "3,99 €" },
            new StoreProduct { Id = Prefix + "season1", TitleEs = "Pase premium T1", TitleEn = "Premium pass S1", NonConsumable = true, FallbackPrice = "4,99 €" },
            new StoreProduct { Id = "coins5000", TitleEs = "5.000 monedas", TitleEn = "5,000 coins", Coins = 5000, GemCost = 50 },
            new StoreProduct { Id = "coins15000", TitleEs = "15.000 monedas", TitleEn = "15,000 coins", Coins = 15000, GemCost = 120 },
        };

        private static readonly Dictionary<string, string> Prices = new Dictionary<string, string>();
        private static Action<bool> _pending;
        private static bool _initialized;

        public static bool NoAds => PlayerPrefs.GetInt("rr_noads", 0) == 1;

        public static void Init()
        {
            if (_initialized) return;
            _initialized = true;
            new GameObject(StoreBridge.ObjectName).AddComponent<StoreBridge>();
#if UNITY_IOS && !UNITY_EDITOR
            var ids = new List<string>();
            foreach (var p in Products) if (p.GemCost == 0) ids.Add(p.Id);
            RRStore_Load(string.Join(",", ids));
#endif
        }

        public static string PriceLabel(string id)
        {
            var p = Find(id);
            if (p == null) return "";
            if (p.GemCost > 0) return $"◆ {p.GemCost}";
            if (IsOwned(p)) return "✓";
            return Prices.TryGetValue(id, out var price) ? price : p.FallbackPrice;
        }

        private static bool IsOwned(StoreProduct p) =>
            (p.Id == Prefix + "noads" && NoAds) || (p.Id == Prefix + "season1" && SaveSystem.Data.seasonPremium);

        public static StoreProduct Find(string id)
        {
            foreach (var p in Products) if (p.Id == id) return p;
            return null;
        }

        public static void Buy(string id, Action<bool> done)
        {
            var p = Find(id);
            if (p == null) { done?.Invoke(false); return; }
            if (p.GemCost > 0)
            {
                var d = SaveSystem.Data;
                if (d.gems < p.GemCost) { done?.Invoke(false); return; }
                d.gems -= p.GemCost; Grant(p); done?.Invoke(true);
                return;
            }
            if (IsOwned(p)) { done?.Invoke(true); return; }
            _pending = done;
#if UNITY_IOS && !UNITY_EDITOR
            RRStore_Buy(id);
#elif UNITY_EDITOR
            OnPurchased(id); // simulación en el editor
#else
            Debug.LogWarning("Compras: Google Play Billing se conecta en la Fase 6.");
            OnFailed(id);
#endif
        }

        public static void Restore(Action<bool> done)
        {
            _pending = done;
#if UNITY_IOS && !UNITY_EDITOR
            RRStore_Restore();
#else
            done?.Invoke(true);
#endif
        }

        private static void Grant(StoreProduct p)
        {
            var d = SaveSystem.Data;
            d.gems += p.Gems; d.coins += p.Coins;
            if (p.Id == Prefix + "noads") PlayerPrefs.SetInt("rr_noads", 1);
            if (p.Id == Prefix + "season1") d.seasonPremium = true;
            SaveSystem.Save();
        }

        internal static void OnProducts(string payload)
        {
            // "id=precio;id=precio"
            foreach (var pair in payload.Split(';'))
            {
                int eq = pair.IndexOf('=');
                if (eq > 0) Prices[pair.Substring(0, eq)] = pair.Substring(eq + 1);
            }
        }

        internal static void OnPurchased(string id)
        {
            var p = Find(id);
            if (p != null) Grant(p);
            var cb = _pending; _pending = null; cb?.Invoke(p != null);
        }

        internal static void OnRestored(string id)
        {
            var p = Find(id);
            if (p != null && p.NonConsumable) Grant(p);
        }

        internal static void OnFailed(string _)
        {
            var cb = _pending; _pending = null; cb?.Invoke(false);
        }

        internal static void OnRestoreFinished(string _)
        {
            var cb = _pending; _pending = null; cb?.Invoke(true);
        }

#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void RRStore_Load(string idsCsv);
        [DllImport("__Internal")] private static extern void RRStore_Buy(string id);
        [DllImport("__Internal")] private static extern void RRStore_Restore();
#endif
    }

    /// <summary>Recibe los mensajes del plugin nativo (UnitySendMessage).</summary>
    public sealed class StoreBridge : MonoBehaviour
    {
        public const string ObjectName = "RRStoreBridge";
        private void Awake() => DontDestroyOnLoad(gameObject);
        public void OnProducts(string payload) => Store.OnProducts(payload);
        public void OnPurchase(string id) => Store.OnPurchased(id);
        public void OnPurchaseFailed(string id) => Store.OnFailed(id);
        public void OnRestored(string id) => Store.OnRestored(id);
        public void OnRestoreFinished(string msg) => Store.OnRestoreFinished(msg);
    }
}
