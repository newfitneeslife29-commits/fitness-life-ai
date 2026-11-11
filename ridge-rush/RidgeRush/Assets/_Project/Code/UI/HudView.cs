using System;
using RidgeRush.Simulation;
using UnityEngine;
using UnityEngine.UI;

namespace RidgeRush.Game
{
    /// <summary>
    /// HUD de carrera en horizontal (GDD §3, docs/02 §6), construido por código para el prototipo:
    /// tiempo bajo la Dynamic Island, estrellas objetivo, progreso, monedas, avisos de trucos,
    /// botones grandes de freno/gas/nitro abajo, menú de pausa con ajustes y accesibilidad, y pantalla de meta.
    /// Todo dentro del Safe Area. Producción: UI Toolkit con el diseño final.
    /// </summary>
    public sealed class HudView : MonoBehaviour
    {
        // Paleta (docs/02 §6).
        private static readonly Color Asphalt = new Color32(0x12, 0x14, 0x17, 0xE6);
        private static readonly Color Steel = new Color32(0x22, 0x26, 0x2C, 0xCC);
        private static readonly Color Bone = new Color32(0xF2, 0xEF, 0xE9, 0xFF);
        private static readonly Color Ember = new Color32(0xFF, 0x5A, 0x1F, 0xFF);
        private static readonly Color Volt = new Color32(0x2F, 0xE3, 0xFF, 0xFF);
        private static readonly Color Gold = new Color32(0xF5, 0xB8, 0x2E, 0xFF);

        public RectTransform GasButton { get; private set; }
        public RectTransform BrakeButton { get; private set; }
        public RectTransform NitroButton { get; private set; }

        public event Action RestartRequested;
        public event Action MenuRequested;
        public event Action NextRequested;
        public event Action PowerRequested;
        public event Action KnockoutRequested;

        private Image _powerFill, _koFill, _powerBtn, _koBtn;
        private Text _powerText, _koText;
        public event Action<bool> PauseChanged;
        public event Action SettingsChanged;

        private Font _font;
        private Sprite _rounded;
        private Text _timer, _target, _coins, _popup, _hint, _combo;
        private Image _progressFill, _nitroFill, _gasImg, _brakeImg, _nitroImg;
        private RectTransform _pausePanel, _finishPanel, _settingsList;
        private Text _finishTime, _finishStars, _finishCoins, _finishBest;
        private Button _nextButton;
        private Text _levelName;
        private RectTransform _safe;
        private float _popupTimer;
        private CanvasGroup _popupGroup;

        public static HudView Create()
        {
            var go = new GameObject("HUD");
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 1f; // horizontal: escala con la altura
            go.AddComponent<GraphicRaycaster>();
            var hud = go.AddComponent<HudView>();
            hud.Build();
            return hud;
        }

        private void Build()
        {
            _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            _rounded = RoundedSprite();

            var safe = Rect("SafeArea", transform as RectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            safe.gameObject.AddComponent<SafeAreaFitter>();
            _safe = safe;

            // ---- Barra superior ----
            _timer = Label("Timer", safe, "0:00.00", 80, TextAnchor.UpperCenter, new Vector2(0.5f, 1f), new Vector2(0f, -66f), new Vector2(600f, 96f)); // centro de la caja (pivote 0,5)
            _timer.fontStyle = FontStyle.Bold;
            _target = Label("Target", safe, "", 34, TextAnchor.UpperCenter, new Vector2(0.5f, 1f), new Vector2(0f, -132f), new Vector2(700f, 46f));
            _target.color = Gold;
            var progressBg = Panel("Progress", safe, new Vector2(0.5f, 1f), new Vector2(0f, -176f), new Vector2(620f, 12f), Steel);
            _progressFill = Panel("Fill", progressBg, new Vector2(0f, 0.5f), Vector2.zero, new Vector2(620f, 12f), Ember).GetComponent<Image>();
            _progressFill.rectTransform.pivot = new Vector2(0f, 0.5f);
            _progressFill.type = Image.Type.Filled; _progressFill.fillMethod = Image.FillMethod.Horizontal;
            _coins = Label("Coins", safe, "0", 40, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(430f, -70f), new Vector2(300f, 60f));
            _coins.color = Gold;
            _combo = Label("Combo", safe, "", 40, TextAnchor.MiddleRight, new Vector2(1f, 1f), new Vector2(-300f, -70f), new Vector2(300f, 60f));
            _combo.color = Volt;

            IconButton(safe, "II", new Vector2(1f, 1f), new Vector2(-70f, -70f), () => SetPaused(true));
            IconButton(safe, Loc.Get("restart"), new Vector2(0f, 1f), new Vector2(150f, -70f), () => RestartRequested?.Invoke(), 230f, 30);

            // ---- Avisos ----
            _popup = Label("Popup", safe, "", 60, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.7f), Vector2.zero, new Vector2(1200f, 180f));
            _popup.fontStyle = FontStyle.Bold;
            _popupGroup = _popup.gameObject.AddComponent<CanvasGroup>();
            _popupGroup.alpha = 0f;
            _hint = Label("Hint", safe, Loc.Get("hold_gas"), 42, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.74f), Vector2.zero, new Vector2(1000f, 80f));
            _levelName = Label("LevelName", safe, "", 52, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.82f), Vector2.zero, new Vector2(1400f, 80f));
            _levelName.fontStyle = FontStyle.Bold;

            // ---- Controles (zona del pulgar, ≥ 88 pt) ----
            BrakeButton = ControlButton(safe, "Brake", Loc.Get("brake"), new Vector2(0f, 0f), new Vector2(190f, 170f), new Vector2(280f, 260f), out _brakeImg);
            GasButton = ControlButton(safe, "Gas", Loc.Get("gas"), new Vector2(1f, 0f), new Vector2(-190f, 170f), new Vector2(280f, 260f), out _gasImg);
            NitroButton = ControlButton(safe, "Nitro", Loc.Get("nitro"), new Vector2(1f, 0f), new Vector2(-460f, 120f), new Vector2(170f, 170f), out _nitroImg);
            var nitroBar = Panel("NitroBar", NitroButton, new Vector2(0.5f, 0f), new Vector2(0f, -22f), new Vector2(170f, 14f), Steel);
            _nitroFill = Panel("Fill", nitroBar, new Vector2(0f, 0.5f), Vector2.zero, new Vector2(170f, 14f), Volt).GetComponent<Image>();
            _nitroFill.rectTransform.pivot = new Vector2(0f, 0.5f);
            _nitroFill.type = Image.Type.Filled; _nitroFill.fillMethod = Image.FillMethod.Horizontal;
            Label("Slide", safe, "◄  ►", 30, TextAnchor.MiddleCenter, new Vector2(1f, 0f), new Vector2(-190f, 330f), new Vector2(280f, 40f)).color = new Color(1f, 1f, 1f, 0.5f);
            Label("Slide", safe, "◄  ►", 30, TextAnchor.MiddleCenter, new Vector2(0f, 0f), new Vector2(190f, 330f), new Vector2(280f, 40f)).color = new Color(1f, 1f, 1f, 0.5f);

            // ---- Barras de poder y de K.O. (izquierda, sobre el freno) ----
            var powerBg = Panel("PowerBar", safe, new Vector2(0f, 0f), new Vector2(190f, 420f), new Vector2(280f, 16f), Steel);
            _powerFill = Panel("Fill", powerBg, new Vector2(0f, 0.5f), Vector2.zero, new Vector2(280f, 16f), Volt).GetComponent<Image>();
            _powerFill.rectTransform.pivot = new Vector2(0f, 0.5f); _powerFill.type = Image.Type.Filled; _powerFill.fillMethod = Image.FillMethod.Horizontal;
            var koBg = Panel("KoBar", safe, new Vector2(0f, 0f), new Vector2(190f, 450f), new Vector2(280f, 16f), Steel);
            _koFill = Panel("Fill", koBg, new Vector2(0f, 0.5f), Vector2.zero, new Vector2(280f, 16f), Ember).GetComponent<Image>();
            _koFill.rectTransform.pivot = new Vector2(0f, 0.5f); _koFill.type = Image.Type.Filled; _koFill.fillMethod = Image.FillMethod.Horizontal;
            _powerBtn = ActionButton(safe, Loc.Get("power"), new Vector2(0f, 0f), new Vector2(110f, 540f), Volt, () => PowerRequested?.Invoke(), out _powerText);
            _koBtn = ActionButton(safe, "K.O.", new Vector2(0f, 0f), new Vector2(270f, 540f), Ember, () => KnockoutRequested?.Invoke(), out _koText);

            BuildPause(safe);
            BuildFinish(safe);
        }

        // ------------------------------------------------------------------ actualización

        public void Tick(RaceRules r, TouchInput input, float dt)
        {
            _timer.text = _freestyle ? Loc.Time(r.TimeLeft) : Loc.Time(r.FinalTime);
            _progressFill.fillAmount = r.Progress;
            _coins.text = $"● {r.Coins}";
            _combo.text = r.Combo > 1.01f ? $"{Loc.Get("combo")} ×{r.Combo:0.0}" : "";
            _nitroFill.fillAmount = r.Sim.Params.nitroCapacity > 0f ? r.Sim.Nitro / r.Sim.Params.nitroCapacity : 0f;
            _hint.enabled = r.State == RaceState.Ready;
            _levelName.enabled = r.State == RaceState.Ready;
            if (r.State == RaceState.Crashed && _popupTimer <= 0f) Popup(Loc.Get("crash"), Ember, 1f);

            int nextStars = r.FinalTime <= r.Level.Data.stars.gold ? 3 : r.FinalTime <= r.Level.Data.stars.silver ? 2 : 1;
            float targetTime = nextStars == 3 ? r.Level.Data.stars.gold : r.Level.Data.stars.silver;
            _target.text = nextStars >= 2 ? $"{new string('★', nextStars)}  {Loc.Time(targetTime)}" : "★";
            if (_freestyle) _target.text = $"{r.Score:N0} {Loc.Get("points")}";
            else if (_supercross) _target.text = $"{Loc.Get("position")} {_position}/{_racers}";

            _gasImg.color = input.GasHeld ? Ember : Steel;
            _brakeImg.color = input.BrakeHeld ? Bone * new Color(1, 1, 1, 0.9f) : Steel;
            _nitroImg.color = input.NitroHeld && r.Sim.Nitro > 0f ? Volt : Steel;

            if (_popupTimer > 0f)
            {
                _popupTimer -= dt;
                _popupGroup.alpha = Mathf.Clamp01(_popupTimer * 3f);
                float s = 1f + Mathf.Clamp01((_popupTimer - 0.9f) * 6f) * 0.3f;
                _popup.rectTransform.localScale = Vector3.one * s;
            }
        }

        public void Popup(string text, Color color, float seconds = 1.2f)
        {
            _popup.text = text;
            _popup.color = color;
            _popupTimer = seconds;
        }

        public void PopupTrick(in SimEvent e)
        {
            string key = e.Type == SimEventType.PerfectLanding ? "perfect" : e.Trick switch
            {
                TrickType.Backflip => "backflip", TrickType.Frontflip => "frontflip", TrickType.Wheelie => "wheelie",
                TrickType.Stoppie => "stoppie", _ => "longjump",
            };
            string text = Loc.Get(key);
            if (e.Type == SimEventType.Trick && e.Count > 1) text = $"{e.Count}× {text}";
            if (e.Type == SimEventType.Trick && e.Trick <= TrickType.Frontflip) text += $"\n−{RaceRules.FlipTimeBonus * e.Count:0.0}s";
            Popup(text, e.Type == SimEventType.PerfectLanding ? Volt : Gold);
        }

        public void SetVisible(bool visible) => _safe.gameObject.SetActive(visible);

        public void SetLevelName(string name) => _levelName.text = name;

        private bool _freestyle, _supercross;
        private int _position = 1, _racers = 1;

        /// <summary>Freestyle: muestra puntos y tiempo restante. Supercross: muestra el puesto.</summary>
        public void SetMode(bool freestyle, bool supercross) { _freestyle = freestyle; _supercross = supercross; }

        public void SetPosition(int position, int racers) { _position = position; _racers = racers; }

        public void ShowFinish(RaceRules r, float previousBest, bool hasNext)
        {
            _finishPanel.gameObject.SetActive(true);
            _nextButton.interactable = hasNext;
            _finishTime.text = _freestyle ? $"{r.Score:N0} {Loc.Get("points")}" : _supercross ? $"{_position}º · {Loc.Time(r.FinalTime)}" : Loc.Time(r.FinalTime);
            _finishStars.text = new string('★', r.Stars) + new string('☆', 3 - r.Stars);
            _finishCoins.text = $"● {r.Coins} {Loc.Get("coins")}";
            bool newBest = previousBest <= 0f || r.FinalTime < previousBest;
            _finishBest.text = newBest ? Loc.Get("new_best") : $"{Loc.Get("best")}: {Loc.Time(previousBest)}";
            _finishBest.color = newBest ? Volt : Bone;
        }

        public void HideFinish() => _finishPanel.gameObject.SetActive(false);

        public void SetPaused(bool paused)
        {
            _pausePanel.gameObject.SetActive(paused);
            if (paused) RefreshSettings();
            PauseChanged?.Invoke(paused);
        }

        // ------------------------------------------------------------------ paneles

        private void BuildPause(RectTransform safe)
        {
            _pausePanel = Rect("Pause", transform as RectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            _pausePanel.gameObject.AddComponent<Image>().color = Asphalt;
            Label("Title", _pausePanel, Loc.Get("paused"), 70, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.9f), Vector2.zero, new Vector2(800f, 100f)).fontStyle = FontStyle.Bold;
            _settingsList = Rect("Settings", _pausePanel, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0f, 60f), new Vector2(1640f, 560f));
            TextButton(_pausePanel, Loc.Get("resume"), new Vector2(0.5f, 0.12f), new Vector2(560f, 0f), Ember, () => SetPaused(false));
            TextButton(_pausePanel, Loc.Get("restart"), new Vector2(0.5f, 0.12f), new Vector2(0f, 0f), Steel, () => { SetPaused(false); RestartRequested?.Invoke(); });
            TextButton(_pausePanel, Loc.Get("menu"), new Vector2(0.5f, 0.12f), new Vector2(-560f, 0f), Steel, () => { SetPaused(false); MenuRequested?.Invoke(); });
            _pausePanel.gameObject.SetActive(false);
        }

        private void RefreshSettings()
        {
            foreach (Transform c in _settingsList) Destroy(c.gameObject);
            int row = 0;
            void Toggle(string key, bool value, Action<bool> set)
            {
                var b = SettingRow(row++, $"{Loc.Get(key)}: {(value ? Loc.Get("on") : Loc.Get("off"))}");
                b.onClick.AddListener(() => { set(!value); RefreshSettings(); SettingsChanged?.Invoke(); });
            }
            Toggle("haptics", GameSettings.Haptics, v => GameSettings.Haptics = v);
            Toggle("sound", GameSettings.Sound, v => GameSettings.Sound = v);
            Toggle("shake", GameSettings.CameraShake, v => GameSettings.CameraShake = v);
            Toggle("slowmo", GameSettings.SlowMotion, v => GameSettings.SlowMotion = v);
            Toggle("tilt", GameSettings.TiltControl, v => GameSettings.TiltControl = v);
            Toggle("tc", GameSettings.TractionControl, v => GameSettings.TractionControl = v);
            Toggle("fps", GameSettings.HighFrameRate, v => GameSettings.HighFrameRate = v);
            int q = GameSettings.QualityOverride;
            var qb = SettingRow(row, $"{Loc.Get("quality")}: {(q < 0 ? Loc.Get("q_auto") + $" ({Loc.Get("q" + (int)QualityManager.Tier)})" : Loc.Get("q" + q))}");
            qb.onClick.AddListener(() => { GameSettings.QualityOverride = q >= 3 ? -1 : q + 1; RefreshSettings(); SettingsChanged?.Invoke(); });
        }

        private Button SettingRow(int index, string text)
        {
            // Dos columnas de filas (en horizontal no caben 8 filas en una sola columna).
            float x = index % 2 == 0 ? -420f : 420f;
            var rt = Rect("Row", _settingsList, new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(x, -55f - (index / 2) * 120f), new Vector2(800f, 100f));
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = _rounded; img.type = Image.Type.Sliced; img.color = Steel;
            var b = rt.gameObject.AddComponent<Button>();
            Label("Text", rt, text, 34, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(780f, 100f));
            return b;
        }

        private void BuildFinish(RectTransform safe)
        {
            _finishPanel = Rect("Finish", transform as RectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            _finishPanel.gameObject.AddComponent<Image>().color = new Color(0.07f, 0.08f, 0.09f, 0.82f);
            Label("Title", _finishPanel, Loc.Get("finish"), 96, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.86f), Vector2.zero, new Vector2(900f, 130f)).fontStyle = FontStyle.Bold;
            _finishStars = Label("Stars", _finishPanel, "", 120, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.69f), Vector2.zero, new Vector2(900f, 150f));
            _finishStars.color = Gold;
            _finishTime = Label("Time", _finishPanel, "", 84, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.53f), Vector2.zero, new Vector2(900f, 110f));
            _finishBest = Label("Best", _finishPanel, "", 40, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.42f), Vector2.zero, new Vector2(900f, 60f));
            _finishCoins = Label("Coins", _finishPanel, "", 44, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.34f), Vector2.zero, new Vector2(900f, 60f));
            _finishCoins.color = Gold;
            TextButton(_finishPanel, Loc.Get("menu"), new Vector2(0.5f, 0.15f), new Vector2(-560f, 0f), Steel, () => MenuRequested?.Invoke());
            TextButton(_finishPanel, Loc.Get("retry"), new Vector2(0.5f, 0.15f), new Vector2(0f, 0f), Steel, () => RestartRequested?.Invoke());
            _nextButton = TextButton(_finishPanel, Loc.Get("next"), new Vector2(0.5f, 0.15f), new Vector2(560f, 0f), Ember, () => NextRequested?.Invoke());
            _finishPanel.gameObject.SetActive(false);
        }

        // ------------------------------------------------------------------ utilidades de UI

        private static RectTransform Rect(string name, RectTransform parent, Vector2 anchorMin, Vector2 anchorMax, Vector2 pos, Vector2 size)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            rt.anchorMin = anchorMin; rt.anchorMax = anchorMax;
            rt.anchoredPosition = pos; rt.sizeDelta = size;
            return rt;
        }

        private RectTransform Panel(string name, RectTransform parent, Vector2 anchor, Vector2 pos, Vector2 size, Color color)
        {
            var rt = Rect(name, parent, anchor, anchor, pos, size);
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = _rounded; img.type = Image.Type.Sliced; img.color = color;
            img.raycastTarget = false;
            return rt;
        }

        private Text Label(string name, RectTransform parent, string text, int size, TextAnchor align, Vector2 anchor, Vector2 pos, Vector2 box)
        {
            var rt = Rect(name, parent, anchor, anchor, pos, box);
            var t = rt.gameObject.AddComponent<Text>();
            t.font = _font; t.fontSize = size; t.alignment = align; t.text = text; t.color = Bone;
            t.raycastTarget = false;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            var shadow = rt.gameObject.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, 0.6f);
            shadow.effectDistance = new Vector2(3f, -3f);
            return t;
        }

        private Image ActionButton(RectTransform parent, string text, Vector2 anchor, Vector2 pos, Color color, Action onClick, out Text label)
        {
            var rt = Rect("Action_" + text, parent, anchor, anchor, pos, new Vector2(140f, 110f));
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = _rounded; img.type = Image.Type.Sliced; img.color = color;
            rt.gameObject.AddComponent<Button>().onClick.AddListener(() => onClick());
            label = Label("Text", rt, text, 32, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(140f, 110f));
            label.fontStyle = FontStyle.Bold;
            rt.gameObject.SetActive(false);
            return img;
        }

        private bool _powersVisible = true;

        /// <summary>Muestra u oculta las barras de poder y K.O. (no hay en Freestyle ni en la demostración).</summary>
        public void ShowPowers(bool visible)
        {
            _powersVisible = visible;
            _powerFill.transform.parent.gameObject.SetActive(visible);
            _koFill.transform.parent.gameObject.SetActive(visible);
            if (!visible) { _powerBtn.gameObject.SetActive(false); _koBtn.gameObject.SetActive(false); }
        }

        /// <summary>Barras de poder y K.O.; los botones aparecen (y laten) cuando están llenas.</summary>
        public void TickPowers(RaceRules r, bool rivalInRange)
        {
            if (!_powersVisible) return;
            _powerFill.fillAmount = r.Power;
            _koFill.fillAmount = r.Knockout;
            _koFill.transform.parent.gameObject.SetActive(r.Mode.rivals);
            bool powerReady = r.Power >= 1f && r.State == RaceState.Racing;
            bool koReady = r.Knockout >= 1f && r.State == RaceState.Racing;
            _powerBtn.gameObject.SetActive(powerReady || r.Shielded);
            _koBtn.gameObject.SetActive(koReady);
            float pulse = 1f + Mathf.Sin(Time.unscaledTime * 8f) * 0.06f;
            _powerBtn.rectTransform.localScale = Vector3.one * (powerReady ? pulse : 1f);
            _powerText.text = r.Shielded ? $"{r.ShieldTime:0.0}s" : Loc.Get("power");
            _koBtn.color = rivalInRange ? Ember : new Color(0.4f, 0.25f, 0.2f, 0.9f);
            _koBtn.rectTransform.localScale = Vector3.one * (rivalInRange ? pulse : 1f);
        }

        private RectTransform ControlButton(RectTransform parent, string name, string text, Vector2 anchor, Vector2 pos, Vector2 size, out Image img)
        {
            var rt = Rect(name, parent, anchor, anchor, pos, size);
            img = rt.gameObject.AddComponent<Image>();
            img.sprite = _rounded; img.type = Image.Type.Sliced; img.color = Steel;
            img.raycastTarget = false; // el toque lo lee TouchInput, no el EventSystem
            Label("Text", rt, text, size.x > 250 ? 52 : 36, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, size).fontStyle = FontStyle.Bold;
            return rt;
        }

        private void IconButton(RectTransform parent, string glyph, Vector2 anchor, Vector2 pos, Action onClick, float width = 110f, int fontSize = 56)
        {
            var rt = Rect("Btn_" + glyph, parent, anchor, anchor, pos, new Vector2(width, 110f));
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = _rounded; img.type = Image.Type.Sliced; img.color = Steel;
            rt.gameObject.AddComponent<Button>().onClick.AddListener(() => onClick());
            Label("Glyph", rt, glyph, fontSize, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(width, 110f));
        }

        private Button TextButton(RectTransform parent, string text, Vector2 anchor, Vector2 pos, Color color, Action onClick)
        {
            var rt = Rect("Btn", parent, anchor, anchor, pos, new Vector2(520f, 120f));
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = _rounded; img.type = Image.Type.Sliced; img.color = color;
            var b = rt.gameObject.AddComponent<Button>();
            if (onClick != null) b.onClick.AddListener(() => onClick());
            Label("Text", rt, text, 46, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(520f, 120f)).fontStyle = FontStyle.Bold;
            return b;
        }

        /// <summary>Sprite de rectángulo con esquinas redondeadas (9-slice), generado al arrancar.</summary>
        private static Sprite RoundedSprite()
        {
            const int s = 64, r = 20;
            var tex = new Texture2D(s, s, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = "rounded" };
            var px = new Color32[s * s];
            for (int y = 0; y < s; y++)
            for (int x = 0; x < s; x++)
            {
                float cx = Mathf.Clamp(x + 0.5f, r, s - r), cy = Mathf.Clamp(y + 0.5f, r, s - r);
                float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(cx, cy));
                byte a = (byte)(Mathf.Clamp01(r - d + 0.5f) * 255f);
                px[y * s + x] = new Color32(255, 255, 255, a);
            }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, s, s), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(r, r, r, r));
        }
    }

    /// <summary>Ajusta el RectTransform al Safe Area (Dynamic Island, notch, barra de inicio, recortes de Android).</summary>
    public sealed class SafeAreaFitter : MonoBehaviour
    {
        private Rect _applied;
        private void Update()
        {
            var sa = Screen.safeArea;
            if (sa == _applied || Screen.width == 0) return;
            _applied = sa;
            var rt = (RectTransform)transform;
            rt.anchorMin = new Vector2(sa.xMin / Screen.width, sa.yMin / Screen.height);
            rt.anchorMax = new Vector2(sa.xMax / Screen.width, sa.yMax / Screen.height);
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }
    }
}
