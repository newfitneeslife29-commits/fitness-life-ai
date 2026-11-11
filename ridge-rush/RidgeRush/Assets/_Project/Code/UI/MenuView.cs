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
        public event Action PlayTutorial;
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

        public void Show(bool visible) { gameObject.SetActive(visible); if (!visible) InGarage = false; }

        /// <summary>El garaje está abierto (la escena muestra la moto parada de cerca).</summary>
        public bool InGarage { get; private set; }

        private RectTransform NewScreen()
        {
            InGarage = false;
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
            UiKit.Button(_font, _rounded, s, Loc.Get("play"), new Vector2(0f, 0.42f), new Vector2(380f, 0f), new Vector2(560f, 120f), Ember, 54,
                () => { if (!SaveSystem.Data.tutorialDone) PlayTutorial?.Invoke(); else ShowWorlds(); });
            UiKit.Button(_font, _rounded, s, Loc.Get("freestyle"), new Vector2(0f, 0.42f), new Vector2(810f, 0f), new Vector2(260f, 120f), new Color(0.15f, 0.35f, 0.4f, 0.95f), 32, () => PlayFreestyle?.Invoke());
            UiKit.Button(_font, _rounded, s, Loc.Get("garage"), new Vector2(0f, 0.29f), new Vector2(380f, 0f), new Vector2(560f, 100f), Steel, 44, ShowGarage);
            UiKit.Button(_font, _rounded, s, Loc.Get("shop"), new Vector2(0f, 0.18f), new Vector2(380f, 0f), new Vector2(560f, 100f), Steel, 44, ShowShop);
            UiKit.Button(_font, _rounded, s, Loc.Get("leaderboards"), new Vector2(0f, 0.07f), new Vector2(380f, 0f), new Vector2(560f, 90f), Steel, 36, GameServices.ShowDashboard);
            UiKit.Button(_font, _rounded, s, Loc.Get("season"), new Vector2(0f, 0.29f), new Vector2(810f, 0f), new Vector2(260f, 100f), new Color(0.45f, 0.3f, 0.05f, 0.95f), 30, ShowSeason);
            UiKit.Button(_font, _rounded, s, Loc.Get("tutorial"), new Vector2(0f, 0.18f), new Vector2(810f, 0f), new Vector2(260f, 100f), Steel, 30, () => PlayTutorial?.Invoke());
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

        /// <summary>Abre el garaje en una moto concreta (capturas automáticas).</summary>
        public void ShowGarageFor(int index)
        {
            Show(true);
            _garageIndex = Mathf.Clamp(index, 0, BikeCatalog.Bikes.Length - 1);
            GarageChanged?.Invoke();
            ShowGarage();
        }

        public void ShowGarage()
        {
            var s = NewScreen();
            var bikes = BikeCatalog.Bikes;
            var d = SaveSystem.Data;
            if (_garageIndex < 0) _garageIndex = Math.Max(0, Array.FindIndex(bikes, b => b.Id == d.selectedBike));
            var bike = bikes[_garageIndex];
            InGarage = true;
            bool owned = d.ownedBikes.Contains(bike.Id);
            bool selected = d.selectedBike == bike.Id;
            var up = SaveSystem.Upgrades(bike.Id);
            var rarity = RarityColors[(int)bike.Rarity];
            var accent = LiveryTextures.Rgb(bike.Accent);

            UiKit.Button(_font, _rounded, s, "‹ " + Loc.Get("back"), new Vector2(0f, 1f), new Vector2(150f, -70f), new Vector2(230f, 90f), Steel, 34, () => { _garageIndex = -1; ShowTitle(); });
            WalletBar(s);

            // ---- Nombre de la moto (arriba a la izquierda, sobre la escena 3D) ----
            UiKit.Panel(_rounded, s, new Vector2(0f, 1f), new Vector2(46f, -205f), new Vector2(10f, 150f), rarity);
            UiKit.Label(_font, s, bike.Brand.ToUpperInvariant() + "  ·  " + Loc.Get("rarity" + (int)bike.Rarity).ToUpperInvariant(), 30, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(460f, -150f), new Vector2(800f, 40f), rarity);
            var title = UiKit.Label(_font, s, bike.Name.ToUpperInvariant(), 78, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(460f, -212f), new Vector2(800f, 90f), Bone);
            title.fontStyle = FontStyle.BoldAndItalic;
            UiKit.Label(_font, s, bike.Class, 32, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(460f, -268f), new Vector2(800f, 44f), new Color(1f, 1f, 1f, 0.7f));

            // ---- Carrusel de motos (abajo a la izquierda) ----
            int visible = 7;
            int first = Mathf.Clamp(_garageIndex - visible / 2, 0, bikes.Length - visible);
            for (int i = 0; i < visible; i++)
            {
                int idx = first + i;
                var b = bikes[idx];
                bool own = d.ownedBikes.Contains(b.Id);
                bool cur = idx == _garageIndex;
                Vector2 pos = new Vector2(150f + i * 150f, 110f);
                var card = UiKit.Button(_font, _rounded, s, "", new Vector2(0f, 0f), pos, new Vector2(cur ? 140f : 128f, cur ? 130f : 116f),
                    cur ? new Color(0.16f, 0.18f, 0.21f, 0.98f) : new Color(0.08f, 0.09f, 0.11f, 0.85f), 20,
                    () => { _garageIndex = idx; GarageChanged?.Invoke(); ShowGarage(); });
                var crt = (RectTransform)card.transform;
                UiKit.Panel(_rounded, crt, new Vector2(0.5f, 0f), new Vector2(0f, 8f), new Vector2(cur ? 120f : 100f, 8f), RarityColors[(int)b.Rarity]);
                var swatch = UiKit.Panel(_rounded, crt, new Vector2(0.5f, 0.5f), new Vector2(0f, 14f), new Vector2(64f, 38f), new Color(b.BodyR, b.BodyG, b.BodyB));
                UiKit.Panel(_rounded, swatch, new Vector2(0.5f, 0f), new Vector2(0f, 6f), new Vector2(64f, 12f), LiveryTextures.Rgb(b.Secondary));
                UiKit.Label(_font, crt, b.Name.Split(' ')[0], 20, TextAnchor.MiddleCenter, new Vector2(0.5f, 0f), new Vector2(0f, 32f), new Vector2(130f, 30f), own ? Bone : new Color(1f, 1f, 1f, 0.45f));
                if (!own) UiKit.Label(_font, crt, Loc.Get("locked"), 14, TextAnchor.MiddleCenter, new Vector2(0.5f, 1f), new Vector2(0f, -16f), new Vector2(130f, 24f), new Color(1f, 1f, 1f, 0.55f));
                if (d.selectedBike == b.Id) UiKit.Label(_font, crt, "√", 30, TextAnchor.UpperLeft, new Vector2(0f, 1f), new Vector2(22f, -22f), new Vector2(40f, 40f), Volt);
            }
            UiKit.Button(_font, _rounded, s, "‹", new Vector2(0f, 0f), new Vector2(150f - 110f, 250f), new Vector2(80f, 80f), Steel, 60, () => { _garageIndex = (_garageIndex + bikes.Length - 1) % bikes.Length; GarageChanged?.Invoke(); ShowGarage(); });
            UiKit.Button(_font, _rounded, s, "›", new Vector2(0f, 0f), new Vector2(150f + (visible - 1) * 150f + 110f - 220f, 250f), new Vector2(80f, 80f), Steel, 60, () => { _garageIndex = (_garageIndex + 1) % bikes.Length; GarageChanged?.Invoke(); ShowGarage(); });
            UiKit.Label(_font, s, $"{_garageIndex + 1} / {bikes.Length}", 28, TextAnchor.MiddleCenter, new Vector2(0f, 0f), new Vector2(150f + 3 * 150f, 250f), new Vector2(300f, 40f), new Color(1f, 1f, 1f, 0.7f));

            // ---- Panel derecho: rendimiento y mejoras ----
            var panel = UiKit.Panel(_rounded, s, new Vector2(1f, 0.5f), new Vector2(-400f, -20f), new Vector2(740f, 860f), new Color(0.06f, 0.07f, 0.09f, 0.88f));
            UiKit.Panel(_rounded, panel, new Vector2(0.5f, 1f), new Vector2(0f, -4f), new Vector2(700f, 6f), accent);
            UiKit.Label(_font, panel, Loc.Get("performance"), 30, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(370f, -46f), new Vector2(660f, 40f), new Color(1f, 1f, 1f, 0.6f));

            var st = BikeCatalog.Stats(bike, up.engine, up.tires, up.suspension);
            var next = BikeCatalog.Stats(bike, Math.Min(BikeCatalog.MaxUpgrade, up.engine + 1), Math.Min(BikeCatalog.MaxUpgrade, up.tires + 1), Math.Min(BikeCatalog.MaxUpgrade, up.suspension + 1));
            var maxed = BikeCatalog.Stats(bike, BikeCatalog.MaxUpgrade, BikeCatalog.MaxUpgrade, BikeCatalog.MaxUpgrade);
            SegBar(panel, Loc.Get("speed"), st.speed, maxed.speed, -100f, accent);
            SegBar(panel, Loc.Get("accel"), st.accel, maxed.accel, -150f, accent);
            SegBar(panel, Loc.Get("grip"), st.grip, maxed.grip, -200f, accent);
            SegBar(panel, Loc.Get("susp"), st.suspension, maxed.suspension, -250f, accent);
            SegBar(panel, Loc.Get("weight"), st.weight, st.weight, -300f, accent);

            UiKit.Label(_font, panel, Loc.Get("upgrades"), 30, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(370f, -360f), new Vector2(660f, 40f), new Color(1f, 1f, 1f, 0.6f));
            UpgradeCard(panel, bike, owned, "engine", "▲", up.engine, -420f, v => up.engine = v);
            UpgradeCard(panel, bike, owned, "tires", "●", up.tires, -500f, v => up.tires = v);
            UpgradeCard(panel, bike, owned, "suspension", "≈", up.suspension, -580f, v => up.suspension = v);
            UpgradeCard(panel, bike, owned, "brakes", "■", up.brakes, -660f, v => up.brakes = v);
            UpgradeCard(panel, bike, owned, "nitro_up", "»", up.nitro, -740f, v => up.nitro = v);

            // ---- Botón principal ----
            if (owned)
            {
                UiKit.Button(_font, _rounded, s, selected ? "√  " + Loc.Get("selected") : Loc.Get("select"), new Vector2(1f, 0f), new Vector2(-400f, 80f), new Vector2(740f, 110f),
                    selected ? new Color(0.15f, 0.3f, 0.2f, 0.95f) : Ember, 44,
                    () => { d.selectedBike = bike.Id; SaveSystem.Save(); GarageChanged?.Invoke(); ShowGarage(); });
            }
            else
            {
                string price = bike.PriceCoins > 0 ? $"{bike.PriceCoins:N0} ●" : $"{bike.PriceGems:N0} ◆";
                bool canBuy = bike.PriceCoins > 0 ? d.coins >= bike.PriceCoins : d.gems >= bike.PriceGems;
                UiKit.Button(_font, _rounded, s, $"{Loc.Get("buy")}   {price}", new Vector2(1f, 0f), new Vector2(-400f, 80f), new Vector2(740f, 110f), canBuy ? Ember : Steel, 44, () =>
                {
                    if (bike.PriceCoins > 0 && d.coins >= bike.PriceCoins) d.coins -= bike.PriceCoins;
                    else if (bike.PriceGems > 0 && d.gems >= bike.PriceGems) d.gems -= bike.PriceGems;
                    else { ShowShop(); return; }
                    d.ownedBikes.Add(bike.Id); d.selectedBike = bike.Id; SaveSystem.Save(); GarageChanged?.Invoke(); ShowGarage();
                });
            }
        }

        /// <summary>Barra de 10 segmentos: llenos = ahora; tenues = lo que se gana con todas las mejoras.</summary>
        private void SegBar(RectTransform parent, string name, float value, float max, float y, Color accent)
        {
            UiKit.Label(_font, parent, name, 28, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(150f, y), new Vector2(240f, 40f), Bone);
            for (int i = 0; i < 10; i++)
            {
                bool on = value >= i + 0.5f;
                bool potential = !on && max >= i + 0.5f;
                var c = on ? accent : potential ? new Color(accent.r, accent.g, accent.b, 0.28f) : new Color(1f, 1f, 1f, 0.08f);
                UiKit.Panel(_rounded, parent, new Vector2(0f, 1f), new Vector2(300f + i * 40f, y), new Vector2(34f, 22f), c);
            }
            UiKit.Label(_font, parent, value.ToString("0.0"), 26, TextAnchor.MiddleRight, new Vector2(0f, 1f), new Vector2(700f - 40f, y), new Vector2(80f, 40f), new Color(1f, 1f, 1f, 0.75f));
        }

        /// <summary>Tarjeta de mejora: icono, nombre, nivel (5 marcas) y botón con el precio.</summary>
        private void UpgradeCard(RectTransform parent, BikeDef bike, bool owned, string key, string icon, int level, float y, Action<int> set)
        {
            var card = UiKit.Panel(_rounded, parent, new Vector2(0.5f, 1f), new Vector2(0f, y), new Vector2(690f, 70f), new Color(1f, 1f, 1f, 0.05f));
            UiKit.Label(_font, card, icon, 38, TextAnchor.MiddleCenter, new Vector2(0f, 0.5f), new Vector2(40f, 0f), new Vector2(60f, 60f), Volt);
            UiKit.Label(_font, card, Loc.Get(key), 28, TextAnchor.MiddleLeft, new Vector2(0f, 0.5f), new Vector2(170f, 0f), new Vector2(200f, 50f), Bone);
            for (int i = 0; i < BikeCatalog.MaxUpgrade; i++)
                UiKit.Panel(_rounded, card, new Vector2(0f, 0.5f), new Vector2(290f + i * 34f, 0f), new Vector2(26f, 26f), i < level ? Volt : new Color(1f, 1f, 1f, 0.12f));
            if (!owned) { UiKit.Label(_font, card, Loc.Get("locked"), 22, TextAnchor.MiddleCenter, new Vector2(1f, 0.5f), new Vector2(-100f, 0f), new Vector2(180f, 50f), new Color(1f, 1f, 1f, 0.4f)); return; }
            if (level >= BikeCatalog.MaxUpgrade) { UiKit.Label(_font, card, "MAX", 30, TextAnchor.MiddleCenter, new Vector2(1f, 0.5f), new Vector2(-100f, 0f), new Vector2(180f, 50f), Gold).fontStyle = FontStyle.Bold; return; }
            int cost = BikeCatalog.UpgradeCost(bike, level);
            var d = SaveSystem.Data;
            UiKit.Button(_font, _rounded, card, $"+ {cost:N0} ●", new Vector2(1f, 0.5f), new Vector2(-110f, 0f), new Vector2(200f, 54f), d.coins >= cost ? Ember : Steel, 26, () =>
            {
                if (d.coins < cost) return;
                d.coins -= cost; set(level + 1); SaveSystem.Save(); GarageChanged?.Invoke(); ShowGarage();
            });
        }

        /// <summary>Moto que se está viendo en el garaje (la escena la muestra detrás del menú).</summary>
        public string GarageBike => _garageIndex >= 0 ? BikeCatalog.Bikes[_garageIndex].Id : null;

        // ------------------------------------------------------------------ pase de temporada

        public void ShowSeason()
        {
            var s = NewScreen();
            UiKit.Panel(_rounded, s, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(4000f, 4000f), Asphalt);
            UiKit.Label(_font, s, Loc.Get("season_title"), 64, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(620f, -70f), new Vector2(1000f, 90f), Bone).fontStyle = FontStyle.Bold;
            WalletBar(s);
            UiKit.Button(_font, _rounded, s, "‹ " + Loc.Get("back"), new Vector2(0f, 1f), new Vector2(150f, -70f), new Vector2(230f, 90f), Steel, 34, ShowTitle);
            var d = SaveSystem.Data;
            UiKit.Label(_font, s, $"{Loc.Get("tier")} {SeasonPass.Tier}/{SeasonPass.Tiers} · {SeasonPass.TierProgress:P0}", 36, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(620f, -150f), new Vector2(900f, 50f), Volt);
            if (!d.seasonPremium)
                UiKit.Button(_font, _rounded, s, $"{Loc.Get("premium")}  {Store.PriceLabel(SeasonPass.ProductId)}", new Vector2(1f, 1f), new Vector2(-330f, -150f), new Vector2(560f, 80f), Gold, 32,
                    () => Store.Buy(SeasonPass.ProductId, ok => ShowSeason()));

            // 10 niveles visibles alrededor del actual (2 filas: gratis y premium).
            int first = Math.Max(0, Math.Min(SeasonPass.Tiers - 10, SeasonPass.Tier - 3));
            UiKit.Label(_font, s, Loc.Get("free"), 30, TextAnchor.MiddleLeft, new Vector2(0f, 0.5f), new Vector2(160f, 130f), new Vector2(200f, 40f), Bone);
            UiKit.Label(_font, s, Loc.Get("premium"), 30, TextAnchor.MiddleLeft, new Vector2(0f, 0.5f), new Vector2(160f, -140f), new Vector2(200f, 40f), Gold);
            for (int k = 0; k < 10; k++)
            {
                int tier = first + k;
                float x = -650f + k * 160f;
                bool reached = tier < SeasonPass.Tier;
                UiKit.Label(_font, s, (tier + 1).ToString(), 30, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), new Vector2(x + 80f, 250f), new Vector2(140f, 40f), reached ? Volt : Bone);
                for (int row = 0; row < 2; row++)
                {
                    bool premium = row == 1;
                    var reward = premium ? SeasonPass.Premium(tier) : SeasonPass.Free(tier);
                    bool claimed = premium ? d.seasonClaimedPremium.Contains(tier) : d.seasonClaimedFree.Contains(tier);
                    bool can = SeasonPass.CanClaim(tier, premium);
                    int t = tier;
                    UiKit.Button(_font, _rounded, s, claimed ? "√" : reward.Label, new Vector2(0.5f, 0.5f), new Vector2(x + 80f, premium ? -140f : 130f), new Vector2(140f, 200f),
                        claimed ? new Color(0.15f, 0.3f, 0.2f, 0.95f) : can ? Ember : (premium && !d.seasonPremium ? new Color(0.25f, 0.2f, 0.1f, 0.95f) : Steel), 28,
                        () => { if (SeasonPass.Claim(t, premium)) ShowSeason(); });
                }
            }
            UiKit.Label(_font, s, Loc.Get("season_hint"), 26, TextAnchor.MiddleCenter, new Vector2(0.5f, 0f), new Vector2(0f, 70f), new Vector2(1600f, 40f), Bone);
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
                UiKit.Label(_font, rt, p.Gems > 0 ? $"◆ {p.Gems}" : p.Coins > 0 ? $"● {p.Coins}" : "√", 54, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.47f), Vector2.zero, new Vector2(380f, 80f), Gold);
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
