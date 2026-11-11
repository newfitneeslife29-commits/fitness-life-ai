using System;
using RidgeRush.Simulation;
using UnityEngine;
using UnityEngine.UI;

namespace RidgeRush.Game
{
    /// <summary>
    /// Menús del juego (horizontal): inicio, mundos, niveles (estrellas y desbloqueo), garaje (motos, mejoras,
    /// pintura) y tienda. Detrás se ve una carrera de demostración que conduce el piloto automático.
    /// Prototipo con uGUI construido por código; producción: UI Toolkit con el diseño final.
    /// </summary>
    public sealed class MenuView : MonoBehaviour
    {
        private static readonly Color Asphalt = new Color32(0x12, 0x14, 0x17, 0xD9);
        private static readonly Color Steel = new Color32(0x22, 0x26, 0x2C, 0xE6);
        private static readonly Color Bone = new Color32(0xF2, 0xEF, 0xE9, 0xFF);
        private static readonly Color Ember = new Color32(0xFF, 0x5A, 0x1F, 0xFF);
        private static readonly Color Volt = new Color32(0x2F, 0xE3, 0xFF, 0xFF);
        private static readonly Color Gold = new Color32(0xF5, 0xB8, 0x2E, 0xFF);
        private static readonly Color[] RarityColors = { new Color32(0x9A, 0xA3, 0xAD, 0xFF), new Color32(0x3D, 0x8B, 0xFF, 0xFF), new Color32(0xB4, 0x5C, 0xFF, 0xFF), Gold };

        public event Action<string> PlayLevel;
        public event Action PlayEndless;
        public event Action PlayFreestyle;
        public event Action GarageChanged;

        /// <summary>Modo elegido en la pantalla de niveles: Carrera (con checkpoints) o Contrarreloj (con fantasma).</summary>
        public bool TimeTrial { get; private set; }

        private Font _font;
        private Sprite _rounded;
        private RectTransform _screen;
        private Text _wallet;

        public static MenuView Create()
        {
            var go = new GameObject("Menu");
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 20;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 1f;
            go.AddComponent<GraphicRaycaster>();
            var menu = go.AddComponent<MenuView>();
            menu._font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            menu._rounded = UiKit.Rounded;
            return menu;
        }

        public void Show(bool visible) => gameObject.SetActive(visible);

        private RectTransform NewScreen()
        {
            if (_screen != null) Destroy(_screen.gameObject);
            _screen = UiKit.Rect("Screen", (RectTransform)transform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var safe = UiKit.Rect("Safe", _screen, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            safe.gameObject.AddComponent<SafeAreaFitter>();
            return safe;
        }

        private void WalletBar(RectTransform s)
        {
            var d = SaveSystem.Data;
            _wallet = UiKit.Label(_font, s, $"● {d.coins}     ◆ {d.gems}     ★ {SaveSystem.TotalStars()}", 38, TextAnchor.MiddleRight, new Vector2(1f, 1f), new Vector2(-260f, -60f), new Vector2(700f, 60f), Gold);
        }

        // ------------------------------------------------------------------ inicio

        public void ShowTitle()
        {
            Show(true);
            var s = NewScreen();
            var shade = UiKit.Panel(_rounded, s, new Vector2(0f, 0.5f), new Vector2(560f, 0f), new Vector2(1120f, 4000f), new Color(0.07f, 0.08f, 0.09f, 0.55f));
            shade.anchorMin = new Vector2(0f, 0f); shade.anchorMax = new Vector2(0f, 1f);
            var title = UiKit.Label(_font, s, "RIDGE RUSH", 150, TextAnchor.MiddleLeft, new Vector2(0f, 0.72f), new Vector2(560f, 0f), new Vector2(1000f, 180f), Bone);
            title.fontStyle = FontStyle.BoldAndItalic;
            UiKit.Label(_font, s, "PRO MOTO", 56, TextAnchor.MiddleLeft, new Vector2(0f, 0.6f), new Vector2(560f, 0f), new Vector2(1000f, 80f), Ember).fontStyle = FontStyle.Bold;
            WalletBar(s);
            UiKit.Button(_font, _rounded, s, Loc.Get("play"), new Vector2(0f, 0.42f), new Vector2(380f, 0f), new Vector2(560f, 120f), Ember, 54, ShowWorlds);
            UiKit.Button(_font, _rounded, s, Loc.Get("freestyle"), new Vector2(0f, 0.42f), new Vector2(810f, 0f), new Vector2(260f, 120f), new Color(0.15f, 0.35f, 0.4f, 0.95f), 32, () => PlayFreestyle?.Invoke());
            UiKit.Button(_font, _rounded, s, Loc.Get("garage"), new Vector2(0f, 0.29f), new Vector2(380f, 0f), new Vector2(560f, 100f), Steel, 44, ShowGarage);
            UiKit.Button(_font, _rounded, s, Loc.Get("shop"), new Vector2(0f, 0.18f), new Vector2(380f, 0f), new Vector2(560f, 100f), Steel, 44, ShowShop);
            UiKit.Button(_font, _rounded, s, Loc.Get("leaderboards"), new Vector2(0f, 0.07f), new Vector2(380f, 0f), new Vector2(560f, 90f), Steel, 36, GameServices.ShowDashboard);
            DailyReward(s);
        }

        /// <summary>Recompensa diaria (GDD §11): 7 días, más monedas cada día seguido; el día 7 da gemas.</summary>
        private void DailyReward(RectTransform s)
        {
            var d = SaveSystem.Data;
            long today = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 86400;
            if (d.lastDailyReward == today) return;
            d.dailyStreak = d.lastDailyReward == today - 1 ? d.dailyStreak % 7 + 1 : 1;
            d.lastDailyReward = today;
            int coins = 100 * d.dailyStreak;
            int gems = d.dailyStreak == 7 ? 20 : 0;
            d.coins += coins; d.gems += gems;
            SaveSystem.Save();
            WalletBar(s);
            var box = UiKit.Panel(_rounded, s, new Vector2(1f, 0f), new Vector2(-330f, 170f), new Vector2(560f, 200f), Steel);
            UiKit.Label(_font, box, $"{Loc.Get("daily")} · {Loc.Get("day")} {d.dailyStreak}/7", 34, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.72f), Vector2.zero, new Vector2(540f, 60f), Bone);
            UiKit.Label(_font, box, gems > 0 ? $"+{coins} ●  +{gems} ◆" : $"+{coins} ●", 52, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.32f), Vector2.zero, new Vector2(540f, 80f), Gold).fontStyle = FontStyle.Bold;
        }

        // ------------------------------------------------------------------ mundos y niveles

        public void ShowWorlds()
        {
            var s = NewScreen();
            UiKit.Panel(_rounded, s, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(4000f, 4000f), Asphalt);
            UiKit.Label(_font, s, Loc.Get("worlds"), 70, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(560f, -70f), new Vector2(900f, 90f), Bone).fontStyle = FontStyle.Bold;
            WalletBar(s);
            UiKit.Button(_font, _rounded, s, "‹ " + Loc.Get("back"), new Vector2(0f, 1f), new Vector2(150f, -70f), new Vector2(230f, 90f), Steel, 34, ShowTitle);

            var worlds = LevelGenerator.Worlds;
            for (int i = 0; i < worlds.Length; i++)
            {
                var w = worlds[i];
                int col = i % 4, row = i / 4;
                bool unlocked = SaveSystem.WorldUnlocked(i);
                var theme = WorldThemes.Get(w.Id);
                int idx = i;
                var card = UiKit.Button(_font, _rounded, s, "", new Vector2(0.5f, 0.5f), new Vector2(-645f + col * 430f, 150f - row * 380f), new Vector2(400f, 350f),
                    unlocked ? Color.Lerp(theme.Backdrop, theme.Accent, 0.35f) : new Color(0.2f, 0.2f, 0.22f, 0.95f), 30, () => { if (SaveSystem.WorldUnlocked(idx)) ShowLevels(idx); });
                var rt = (RectTransform)card.transform;
                UiKit.Label(_font, rt, Loc.Spanish ? w.NameEs : w.NameEn, 40, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.7f), Vector2.zero, new Vector2(380f, 100f), Bone).fontStyle = FontStyle.Bold;
                int stars = SaveSystem.WorldStars(w.Id);
                UiKit.Label(_font, rt, unlocked ? $"★ {stars}/{w.LevelCount * 3}" : $"{Loc.Get("locked")} · ★ {SaveSystem.StarsNeeded(i)}", 32, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.3f), Vector2.zero, new Vector2(380f, 60f), unlocked ? Gold : Bone);
                if (w.Supercross) UiKit.Label(_font, rt, "SUPERCROSS · BONUS", 26, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.12f), Vector2.zero, new Vector2(380f, 40f), Volt);
            }
            // Modo Infinito (8.ª tarjeta).
            var endless = UiKit.Button(_font, _rounded, s, "", new Vector2(0.5f, 0.5f), new Vector2(-645f + 3 * 430f, 150f - 380f), new Vector2(400f, 350f), new Color(0.15f, 0.35f, 0.4f, 0.95f), 30, () => PlayEndless?.Invoke());
            var ert = (RectTransform)endless.transform;
            UiKit.Label(_font, ert, Loc.Get("endless"), 40, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.7f), Vector2.zero, new Vector2(380f, 100f), Bone).fontStyle = FontStyle.Bold;
            var bestEndless = SaveSystem.Record("endless");
            UiKit.Label(_font, ert, bestEndless != null ? $"{Loc.Get("best")}: {Loc.Time(bestEndless.best)}" : Loc.Get("endless_hint"), 28, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.3f), Vector2.zero, new Vector2(380f, 60f), Volt);
        }

        public void ShowLevels(int worldIndex)
        {
            var w = LevelGenerator.Worlds[worldIndex];
            var s = NewScreen();
            UiKit.Panel(_rounded, s, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(4000f, 4000f), Asphalt);
            UiKit.Label(_font, s, Loc.Spanish ? w.NameEs : w.NameEn, 64, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(620f, -70f), new Vector2(1000f, 90f), Bone).fontStyle = FontStyle.Bold;
            WalletBar(s);
            UiKit.Button(_font, _rounded, s, "‹ " + Loc.Get("back"), new Vector2(0f, 1f), new Vector2(150f, -70f), new Vector2(230f, 90f), Steel, 34, ShowWorlds);
            int wi = worldIndex;
            UiKit.Button(_font, _rounded, s, Loc.Get("career"), new Vector2(0.5f, 0f), new Vector2(-230f, 80f), new Vector2(420f, 90f), TimeTrial ? Steel : Ember, 34, () => { TimeTrial = false; ShowLevels(wi); });
            UiKit.Button(_font, _rounded, s, Loc.Get("timetrial"), new Vector2(0.5f, 0f), new Vector2(230f, 80f), new Vector2(420f, 90f), TimeTrial ? Ember : Steel, 34, () => { TimeTrial = true; ShowLevels(wi); });

            int perRow = 9;
            for (int i = 0; i < w.LevelCount; i++)
            {
                string id = $"{w.Id}_{i + 1:00}";
                bool unlocked = SaveSystem.LevelUnlocked(w.Id, i);
                bool final = i == w.LevelCount - 1;
                int col = i % perRow, row = i / perRow;
                var rec = SaveSystem.Record(id);
                var b = UiKit.Button(_font, _rounded, s, "", new Vector2(0.5f, 0.5f), new Vector2(-760f + col * 190f, 230f - row * 230f), new Vector2(170f, 200f),
                    !unlocked ? new Color(0.2f, 0.2f, 0.22f, 0.95f) : final ? new Color(0.5f, 0.15f, 0.08f, 0.95f) : Steel, 30,
                    () => { if (SaveSystem.LevelUnlocked(w.Id, int.Parse(id.Substring(id.Length - 2)) - 1)) PlayLevel?.Invoke(id); });
                var rt = (RectTransform)b.transform;
                UiKit.Label(_font, rt, unlocked ? (i + 1).ToString() : "—", 56, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.62f), Vector2.zero, new Vector2(160f, 90f), Bone).fontStyle = FontStyle.Bold;
                int st = rec?.stars ?? 0;
                UiKit.Label(_font, rt, new string('★', st) + new string('☆', 3 - st), 30, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.24f), Vector2.zero, new Vector2(160f, 50f), Gold);
            }
        }

        // ------------------------------------------------------------------ garaje

        private int _garageIndex = -1;

        public void ShowGarage()
        {
            var s = NewScreen();
            var bikes = BikeCatalog.Bikes;
            var d = SaveSystem.Data;
            if (_garageIndex < 0) _garageIndex = Math.Max(0, Array.FindIndex(bikes, b => b.Id == d.selectedBike));
            var bike = bikes[_garageIndex];
            bool owned = d.ownedBikes.Contains(bike.Id);
            var up = SaveSystem.Upgrades(bike.Id);

            var panel = UiKit.Panel(_rounded, s, new Vector2(1f, 0.5f), new Vector2(-470f, 0f), new Vector2(880f, 4000f), Asphalt);
            panel.anchorMin = new Vector2(1f, 0f); panel.anchorMax = new Vector2(1f, 1f);
            UiKit.Button(_font, _rounded, s, "‹ " + Loc.Get("back"), new Vector2(0f, 1f), new Vector2(150f, -70f), new Vector2(230f, 90f), Steel, 34, () => { _garageIndex = -1; ShowTitle(); });
            WalletBar(s);

            float x = -470f;
            UiKit.Label(_font, s, bike.Brand.ToUpperInvariant(), 30, TextAnchor.MiddleLeft, new Vector2(1f, 1f), new Vector2(x, -150f), new Vector2(780f, 40f), RarityColors[(int)bike.Rarity]);
            UiKit.Label(_font, s, bike.Name, 64, TextAnchor.MiddleLeft, new Vector2(1f, 1f), new Vector2(x, -205f), new Vector2(780f, 80f), Bone).fontStyle = FontStyle.Bold;
            UiKit.Label(_font, s, $"{bike.Class} · {Loc.Get("rarity" + (int)bike.Rarity)}", 30, TextAnchor.MiddleLeft, new Vector2(1f, 1f), new Vector2(x, -260f), new Vector2(780f, 40f), Bone);

            var st = BikeCatalog.Stats(bike, up.engine, up.tires, up.suspension);
            StatBar(s, Loc.Get("speed"), st.speed, -330f);
            StatBar(s, Loc.Get("accel"), st.accel, -385f);
            StatBar(s, Loc.Get("grip"), st.grip, -440f);
            StatBar(s, Loc.Get("susp"), st.suspension, -495f);
            StatBar(s, Loc.Get("weight"), st.weight, -550f);

            if (owned)
            {
                UpgradeRow(s, bike, "engine", up.engine, -630f, v => up.engine = v);
                UpgradeRow(s, bike, "tires", up.tires, -700f, v => up.tires = v);
                UpgradeRow(s, bike, "suspension", up.suspension, -770f, v => up.suspension = v);
                UpgradeRow(s, bike, "brakes", up.brakes, -840f, v => up.brakes = v);
                UpgradeRow(s, bike, "nitro_up", up.nitro, -910f, v => up.nitro = v);
                // Pintura.
                var paint = SaveSystem.Paint(bike.Id);
                Color[] palette = { new Color(0.95f, 0.36f, 0.1f), new Color(0.1f, 0.3f, 0.85f), new Color(0.2f, 0.55f, 0.2f), new Color(0.9f, 0.1f, 0.15f), new Color(0.95f, 0.95f, 0.95f), new Color(0.1f, 0.1f, 0.12f), new Color(0.96f, 0.72f, 0.18f), new Color(0.18f, 0.89f, 1f) };
                for (int i = 0; i < palette.Length; i++)
                {
                    var c = palette[i];
                    UiKit.Button(_font, _rounded, s, "", new Vector2(1f, 1f), new Vector2(x - 330f + i * 90f, -990f), new Vector2(76f, 60f), c, 20,
                        () => { paint.body = c; SaveSystem.Save(); GarageChanged?.Invoke(); });
                }
                bool selected = d.selectedBike == bike.Id;
                UiKit.Button(_font, _rounded, s, selected ? Loc.Get("selected") : Loc.Get("select"), new Vector2(0.5f, 0f), new Vector2(-300f, 90f), new Vector2(460f, 110f), selected ? Steel : Ember, 42,
                    () => { d.selectedBike = bike.Id; SaveSystem.Save(); GarageChanged?.Invoke(); ShowGarage(); });
            }
            else
            {
                string price = bike.PriceCoins > 0 ? $"{bike.PriceCoins} ●" : $"{bike.PriceGems} ◆";
                bool canBuy = bike.PriceCoins > 0 ? d.coins >= bike.PriceCoins : d.gems >= bike.PriceGems;
                UiKit.Button(_font, _rounded, s, $"{Loc.Get("buy")}  {price}", new Vector2(0.5f, 0f), new Vector2(-300f, 90f), new Vector2(460f, 110f), canBuy ? Ember : Steel, 42, () =>
                {
                    if (bike.PriceCoins > 0 && d.coins >= bike.PriceCoins) d.coins -= bike.PriceCoins;
                    else if (bike.PriceGems > 0 && d.gems >= bike.PriceGems) d.gems -= bike.PriceGems;
                    else { ShowShop(); return; }
                    d.ownedBikes.Add(bike.Id); d.selectedBike = bike.Id; SaveSystem.Save(); GarageChanged?.Invoke(); ShowGarage();
                });
            }

            UiKit.Button(_font, _rounded, s, "‹", new Vector2(0f, 0.5f), new Vector2(110f, 0f), new Vector2(120f, 160f), Steel, 80, () => { _garageIndex = (_garageIndex + bikes.Length - 1) % bikes.Length; GarageChanged?.Invoke(); ShowGarage(); });
            UiKit.Button(_font, _rounded, s, "›", new Vector2(0.5f, 0.5f), new Vector2(-30f, 0f), new Vector2(120f, 160f), Steel, 80, () => { _garageIndex = (_garageIndex + 1) % bikes.Length; GarageChanged?.Invoke(); ShowGarage(); });
            UiKit.Label(_font, s, $"{_garageIndex + 1}/{bikes.Length}", 30, TextAnchor.MiddleCenter, new Vector2(0.25f, 0f), new Vector2(0f, 230f), new Vector2(300f, 40f), Bone);
        }

        /// <summary>Moto que se está viendo en el garaje (la escena la muestra detrás del menú).</summary>
        public string GarageBike => _garageIndex >= 0 ? BikeCatalog.Bikes[_garageIndex].Id : null;

        private void StatBar(RectTransform s, string name, float value, float y)
        {
            UiKit.Label(_font, s, name, 30, TextAnchor.MiddleLeft, new Vector2(1f, 1f), new Vector2(-670f, y), new Vector2(380f, 40f), Bone);
            var bg = UiKit.Panel(_rounded, s, new Vector2(1f, 1f), new Vector2(-300f, y), new Vector2(420f, 18f), Steel);
            var fill = UiKit.Panel(_rounded, bg, new Vector2(0f, 0.5f), Vector2.zero, new Vector2(42f * value, 18f), Ember);
            fill.pivot = new Vector2(0f, 0.5f);
        }

        private void UpgradeRow(RectTransform s, BikeDef bike, string key, int level, float y, Action<int> set)
        {
            UiKit.Label(_font, s, Loc.Get(key), 30, TextAnchor.MiddleLeft, new Vector2(1f, 1f), new Vector2(-670f, y), new Vector2(380f, 50f), Bone);
            UiKit.Label(_font, s, new string('■', level) + new string('□', BikeCatalog.MaxUpgrade - level), 30, TextAnchor.MiddleLeft, new Vector2(1f, 1f), new Vector2(-380f, y), new Vector2(220f, 50f), Volt);
            if (level >= BikeCatalog.MaxUpgrade) return;
            int cost = BikeCatalog.UpgradeCost(bike, level);
            var d = SaveSystem.Data;
            UiKit.Button(_font, _rounded, s, $"+  {cost} ●", new Vector2(1f, 1f), new Vector2(-150f, y), new Vector2(230f, 56f), d.coins >= cost ? Ember : Steel, 28, () =>
            {
                if (d.coins < cost) return;
                d.coins -= cost; set(level + 1); SaveSystem.Save(); GarageChanged?.Invoke(); ShowGarage();
            });
        }

        // ------------------------------------------------------------------ tienda

        public void ShowShop()
        {
            var s = NewScreen();
            UiKit.Panel(_rounded, s, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(4000f, 4000f), Asphalt);
            UiKit.Label(_font, s, Loc.Get("shop"), 70, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(560f, -70f), new Vector2(900f, 90f), Bone).fontStyle = FontStyle.Bold;
            WalletBar(s);
            UiKit.Button(_font, _rounded, s, "‹ " + Loc.Get("back"), new Vector2(0f, 1f), new Vector2(150f, -70f), new Vector2(230f, 90f), Steel, 34, ShowTitle);

            var products = Store.Products;
            for (int i = 0; i < products.Length; i++)
            {
                var p = products[i];
                var card = UiKit.Button(_font, _rounded, s, "", new Vector2(0.5f, 0.5f), new Vector2(-645f + (i % 4) * 430f, 120f - (i / 4) * 360f), new Vector2(400f, 330f), Steel, 30,
                    () => Store.Buy(p.Id, ok => { if (ok) ShowShop(); }));
                var rt = (RectTransform)card.transform;
                UiKit.Label(_font, rt, Loc.Spanish ? p.TitleEs : p.TitleEn, 36, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.75f), Vector2.zero, new Vector2(380f, 80f), Bone).fontStyle = FontStyle.Bold;
                UiKit.Label(_font, rt, p.Gems > 0 ? $"◆ {p.Gems}" : p.Coins > 0 ? $"● {p.Coins}" : "✓", 54, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.47f), Vector2.zero, new Vector2(380f, 80f), Gold);
                UiKit.Label(_font, rt, Store.PriceLabel(p.Id), 34, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.18f), Vector2.zero, new Vector2(380f, 60f), Volt);
            }
            UiKit.Label(_font, s, Loc.Get("restore_hint"), 26, TextAnchor.MiddleCenter, new Vector2(0.5f, 0f), new Vector2(0f, 60f), new Vector2(1600f, 40f), Bone);
            UiKit.Button(_font, _rounded, s, Loc.Get("restore"), new Vector2(1f, 0f), new Vector2(-240f, 60f), new Vector2(380f, 80f), Steel, 30, () => Store.Restore(ok => ShowShop()));
        }
    }

    /// <summary>Utilidades de uGUI compartidas por el HUD y los menús.</summary>
    public static class UiKit
    {
        private static Sprite _rounded;
        public static Sprite Rounded => _rounded != null ? _rounded : (_rounded = CreateRounded());

        public static RectTransform Rect(string name, RectTransform parent, Vector2 anchorMin, Vector2 anchorMax, Vector2 pos, Vector2 size)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            rt.anchorMin = anchorMin; rt.anchorMax = anchorMax;
            rt.anchoredPosition = pos; rt.sizeDelta = size;
            return rt;
        }

        public static RectTransform Panel(Sprite sprite, RectTransform parent, Vector2 anchor, Vector2 pos, Vector2 size, Color color)
        {
            var rt = Rect("Panel", parent, anchor, anchor, pos, size);
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = sprite; img.type = Image.Type.Sliced; img.color = color; img.raycastTarget = false;
            return rt;
        }

        public static Text Label(Font font, RectTransform parent, string text, int size, TextAnchor align, Vector2 anchor, Vector2 pos, Vector2 box, Color color)
        {
            var rt = Rect("Label", parent, anchor, anchor, pos, box);
            var t = rt.gameObject.AddComponent<Text>();
            t.font = font; t.fontSize = size; t.alignment = align; t.text = text; t.color = color; t.raycastTarget = false;
            t.horizontalOverflow = HorizontalWrapMode.Overflow; t.verticalOverflow = VerticalWrapMode.Overflow;
            var sh = rt.gameObject.AddComponent<Shadow>(); sh.effectColor = new Color(0f, 0f, 0f, 0.6f); sh.effectDistance = new Vector2(3f, -3f);
            return t;
        }

        public static Button Button(Font font, Sprite sprite, RectTransform parent, string text, Vector2 anchor, Vector2 pos, Vector2 size, Color color, int fontSize, Action onClick)
        {
            var rt = Rect("Button", parent, anchor, anchor, pos, size);
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = sprite; img.type = Image.Type.Sliced; img.color = color;
            var b = rt.gameObject.AddComponent<Button>();
            if (onClick != null) b.onClick.AddListener(() => onClick());
            if (!string.IsNullOrEmpty(text))
                Label(font, rt, text, fontSize, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, size, new Color32(0xF2, 0xEF, 0xE9, 0xFF)).fontStyle = FontStyle.Bold;
            return b;
        }

        private static Sprite CreateRounded()
        {
            const int s = 64, r = 20;
            var tex = new Texture2D(s, s, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = "rounded" };
            var px = new Color32[s * s];
            for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                float cx = Mathf.Clamp(x + 0.5f, r, s - r), cy = Mathf.Clamp(y + 0.5f, r, s - r);
                float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(cx, cy));
                px[y * s + x] = new Color32(255, 255, 255, (byte)(Mathf.Clamp01(r - d + 0.5f) * 255f));
            }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, s, s), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(r, r, r, r));
        }
    }
}
