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
        public event Action ReplayRequested;
        public event Action ReplayExitRequested;
        private Text _tutorial;
        private RectTransform _tutorialPanel, _replayBar;
        public event Action KnockoutRequested;

        public RectTransform LeanBackButton { get; private set; }
        public RectTransform LeanForwardButton { get; private set; }
        private RoundBtn _gasBtn, _brakeBtn, _nitroBtn, _leanBack, _leanFwd, _powerRb, _koRb;
        private Sprite _circle, _ring, _soft;
        public event Action<bool> PauseChanged;
        public event Action SettingsChanged;

        private Font _font;
        private Sprite _rounded;
        private Text _timer, _target, _coins, _popup, _hint, _combo;
        private Image _progressFill;
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

            // ---- Controles (botones redondos de cristal oscuro con aro de color) ----
            // Izquierda: inclinarse atrás / adelante, y encima PODER y K.O. (aro = barra de carga).
            // Derecha: GAS grande, FRENO a su izquierda y TURBO (nitro) encima del gas (aro = nitro que queda).
            _circle = CircleSprite(256, 0f); _ring = CircleSprite(256, 0.11f); _soft = SoftSprite(128);
            _leanBack = RoundButton(safe, "LeanBack", "◄", Loc.Get("lean_back"), new Vector2(0f, 0f), new Vector2(150f, 165f), 210f, Volt);
            _leanFwd = RoundButton(safe, "LeanFwd", "►", Loc.Get("lean_fwd"), new Vector2(0f, 0f), new Vector2(390f, 165f), 210f, Volt);
            _gasBtn = RoundButton(safe, "Gas", Loc.Get("gas"), "", new Vector2(1f, 0f), new Vector2(-165f, 190f), 260f, Ember);
            _brakeBtn = RoundButton(safe, "Brake", Loc.Get("brake"), "", new Vector2(1f, 0f), new Vector2(-420f, 150f), 190f, Bone);
            _nitroBtn = RoundButton(safe, "Nitro", "»", Loc.Get("turbo"), new Vector2(0f, 0f), new Vector2(270f, 420f), 170f, Volt, meter: true);
            _powerRb = RoundButton(safe, "Power", "★", Loc.Get("power"), new Vector2(1f, 0f), new Vector2(-185f, 430f), 150f, Gold, meter: true);
            _koRb = RoundButton(safe, "KO", "K.O.", "", new Vector2(1f, 0f), new Vector2(-420f, 375f), 140f, Ember, meter: true);
            _powerRb.Root.gameObject.AddComponent<Button>().onClick.AddListener(() => PowerRequested?.Invoke());
            _koRb.Root.gameObject.AddComponent<Button>().onClick.AddListener(() => KnockoutRequested?.Invoke());
            _powerRb.Bg.raycastTarget = _koRb.Bg.raycastTarget = true;
            GasButton = _gasBtn.Root; BrakeButton = _brakeBtn.Root; NitroButton = _nitroBtn.Root;
            LeanBackButton = _leanBack.Root; LeanForwardButton = _leanFwd.Root;

            // Tutorial: indicación grande arriba.
            _tutorialPanel = Panel("Tutorial", safe, new Vector2(0.5f, 1f), new Vector2(0f, -280f), new Vector2(1300f, 110f), new Color(0.07f, 0.08f, 0.09f, 0.8f));
            _tutorial = Label("Text", _tutorialPanel, "", 40, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(1260f, 110f));
            _tutorial.color = Volt;
            _tutorialPanel.gameObject.SetActive(false);

            // Repetición: barra con el título y el botón de salir.
            _replayBar = Rect("Replay", transform as RectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            Label("Title", _replayBar, Loc.Get("replay"), 56, TextAnchor.MiddleLeft, new Vector2(0f, 1f), new Vector2(300f, -70f), new Vector2(500f, 80f)).fontStyle = FontStyle.BoldAndItalic;
            TextButton(_replayBar, Loc.Get("exit_replay"), new Vector2(1f, 0f), new Vector2(-300f, 100f), Steel, () => ReplayExitRequested?.Invoke());
            _replayBar.gameObject.SetActive(false);

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
            _hint.enabled = r.State == RaceState.Ready;
            _levelName.enabled = r.State == RaceState.Ready;
            if (r.State == RaceState.Crashed && _popupTimer <= 0f) Popup(Loc.Get("crash"), Ember, 1f);

            int nextStars = r.FinalTime <= r.Level.Data.stars.gold ? 3 : r.FinalTime <= r.Level.Data.stars.silver ? 2 : 1;
            float targetTime = nextStars == 3 ? r.Level.Data.stars.gold : r.Level.Data.stars.silver;
            _target.text = nextStars >= 2 ? $"{new string('★', nextStars)}  {Loc.Time(targetTime)}" : "★";
            if (_freestyle) _target.text = $"{r.Score:N0} {Loc.Get("points")}";
            if (_banner != null && _bannerTitle != null)
            {
                // Entrada con rebote del título.
                _bannerAnim += dt;
                float k = Mathf.Clamp01(_bannerAnim * 3f);
                _bannerTitle.localScale = Vector3.one * (1f + Mathf.Sin(k * Mathf.PI) * 0.25f) * Mathf.Lerp(0.3f, 1f, k);
            }
            else if (_supercross) _target.text = $"{Loc.Get("position")} {_position}/{_racers}";
            if (_targetOverride != null) _target.text = $"{_targetOverride}   ·   {Loc.Get("position")} {_position}/{_racers}";

            _gasBtn.Set(input.GasHeld, true, dt);
            _brakeBtn.Set(input.BrakeHeld, true, dt);
            _leanBack.Set(input.LeanBackHeld, true, dt);
            _leanFwd.Set(input.LeanForwardHeld, true, dt);
            bool hasNitro = r.Sim.Nitro > 0.01f && r.Mode.nitroEnabled;
            _nitroBtn.Set(input.TurboActive || (input.NitroHeld && hasNitro), hasNitro, dt);
            _nitroBtn.SetMeter(r.Sim.Params.nitroCapacity > 0f ? r.Sim.Nitro / r.Sim.Params.nitroCapacity : 0f);

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

        public void SetTutorial(string text)
        {
            _tutorialPanel.gameObject.SetActive(!string.IsNullOrEmpty(text));
            _tutorial.text = text ?? "";
        }

        /// <summary>Modo repetición: oculta el HUD y la pantalla de meta y muestra la barra de repetición.</summary>
        public void SetReplay(bool on)
        {
            _replayBar.gameObject.SetActive(on);
            _safe.gameObject.SetActive(!on);
            _finishPanel.gameObject.SetActive(!on);
        }

        public void SetLevelName(string name) => _levelName.text = name;

        private bool _freestyle, _supercross;
        private int _position = 1, _racers = 1;

        /// <summary>Freestyle: muestra puntos y tiempo restante. Supercross: muestra el puesto.</summary>
        public void SetMode(bool freestyle, bool supercross) { _freestyle = freestyle; _supercross = supercross; }

        public void SetPosition(int position, int racers) { _position = position; _racers = racers; }

        private string _targetOverride;
        /// <summary>Texto fijo en lugar del objetivo (p. ej. "Clasificados 3/8" en la Eliminatoria).</summary>
        public void SetTargetOverride(string text) => _targetOverride = text;

        private RectTransform _banner;

        /// <summary>
        /// Cartel grande a pantalla completa (Eliminatoria): título enorme con contorno, subtítulo y dos botones
        /// gordos de colores, estilo juego de fiesta.
        /// </summary>
        public void ShowBanner(string title, string subtitle, Color color, string primary, Action onPrimary, string secondary, Action onSecondary)
        {
            HideBanner();
            _banner = Rect("Banner", transform as RectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var dim = _banner.gameObject.AddComponent<Image>();
            dim.color = new Color(0.02f, 0.03f, 0.08f, 0.55f);
            var stripe = Panel("Stripe", _banner, new Vector2(0.5f, 0.6f), Vector2.zero, new Vector2(4000f, 260f), new Color(color.r * 0.35f, color.g * 0.35f, color.b * 0.35f, 0.92f));
            stripe.localRotation = Quaternion.Euler(0f, 0f, -3f);
            var t = Label("Title", _banner, title, 150, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.62f), Vector2.zero, new Vector2(1800f, 200f));
            t.fontStyle = FontStyle.BoldAndItalic; t.color = color;
            var o = t.gameObject.AddComponent<Outline>(); o.effectColor = new Color(0f, 0f, 0f, 0.9f); o.effectDistance = new Vector2(6f, -6f);
            Label("Sub", _banner, subtitle, 50, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.45f), Vector2.zero, new Vector2(1600f, 70f)).fontStyle = FontStyle.Bold;
            ChunkyButton(_banner, primary, new Vector2(0.5f, 0.22f), new Vector2(260f, 0f), new Color(1f, 0.78f, 0.1f), onPrimary);
            ChunkyButton(_banner, secondary, new Vector2(0.5f, 0.22f), new Vector2(-260f, 0f), new Color(0.25f, 0.55f, 1f), onSecondary);
            _bannerAnim = 0f;
            _bannerTitle = t.rectTransform;
        }

        public void HideBanner()
        {
            if (_banner != null) Destroy(_banner.gameObject);
            _banner = null;
        }

        private float _bannerAnim;
        private RectTransform _bannerTitle;

        /// <summary>Botón gordo con "labio" inferior más oscuro (aspecto 3D) y texto con contorno.</summary>
        private void ChunkyButton(RectTransform parent, string text, Vector2 anchor, Vector2 pos, Color color, Action onClick)
        {
            var size = new Vector2(460f, 130f);
            var lip = Panel("Lip", parent, anchor, pos + new Vector2(0f, -12f), size, new Color(color.r * 0.55f, color.g * 0.55f, color.b * 0.55f, 1f));
            var rt = Rect("Btn", parent, anchor, anchor, pos, size);
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = _rounded; img.type = Image.Type.Sliced; img.color = color;
            rt.gameObject.AddComponent<Button>().onClick.AddListener(() => onClick?.Invoke());
            Panel("Shine", rt, new Vector2(0.5f, 1f), new Vector2(0f, -22f), new Vector2(size.x - 40f, 18f), new Color(1f, 1f, 1f, 0.35f));
            var l = Label("Text", rt, text, 54, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), Vector2.zero, size);
            l.fontStyle = FontStyle.Bold;
            var o = l.gameObject.AddComponent<Outline>(); o.effectColor = new Color(0f, 0f, 0f, 0.8f); o.effectDistance = new Vector2(3f, -3f);
        }

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
            TextButton(_finishPanel, Loc.Get("replay"), new Vector2(0.5f, 0.3f), new Vector2(0f, 0f), new Color(0.15f, 0.35f, 0.4f, 0.95f), () => ReplayRequested?.Invoke());
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

        private bool _powersVisible = true;

        /// <summary>Muestra u oculta los botones de poder y K.O. (no hay en Freestyle ni en la demostración).</summary>
        public void ShowPowers(bool visible)
        {
            _powersVisible = visible;
            _powerRb.Root.gameObject.SetActive(visible);
            _koRb.Root.gameObject.SetActive(visible);
        }

        /// <summary>Poder y K.O.: el aro se llena con los trucos; lleno, el botón se enciende y late.</summary>
        public void TickPowers(RaceRules r, bool rivalInRange)
        {
            if (!_powersVisible) return;
            float dt = Time.unscaledDeltaTime;
            _koRb.Root.gameObject.SetActive(r.Mode.rivals);
            bool racing = r.State == RaceState.Racing;
            bool powerReady = r.Power >= 1f && racing;
            bool koReady = r.Knockout >= 1f && racing && rivalInRange;
            _powerRb.SetMeter(r.Shielded ? r.ShieldTime / RaceRules.ShieldSeconds : r.Power);
            _koRb.SetMeter(r.Knockout);
            _powerRb.Set(r.Shielded, powerReady || r.Shielded, dt);
            _koRb.Set(false, koReady, dt);
            _powerRb.Caption.text = r.Shielded ? $"{r.ShieldTime:0.0}s" : Loc.Get("power");
            _koRb.Caption.text = r.Knockout >= 1f && !rivalInRange ? Loc.Get("ko_near") : "";
            float pulse = 1f + Mathf.Sin(Time.unscaledTime * 8f) * 0.07f;
            _powerRb.Root.localScale = Vector3.one * (powerReady ? pulse : 1f);
            _koRb.Root.localScale = Vector3.one * (koReady ? pulse : 1f);
        }

        /// <summary>Botón redondo: fondo de cristal oscuro, aro del color del botón, icono y texto debajo.</summary>
        private sealed class RoundBtn
        {
            public RectTransform Root;
            public Image Bg, Ring, Meter, Glow;
            public Text Icon, Caption;
            public Color Accent;
            private float _press;

            public void Set(bool pressed, bool enabled, float dt)
            {
                _press = Mathf.MoveTowards(_press, pressed ? 1f : 0f, dt * 12f);
                float dim = enabled ? 1f : 0.35f;
                Bg.color = Color.Lerp(new Color(0.06f, 0.07f, 0.09f, 0.62f), new Color(Accent.r, Accent.g, Accent.b, 0.85f), _press);
                Ring.color = new Color(Accent.r, Accent.g, Accent.b, (Meter != null ? 0.25f : 0.9f) * dim);
                if (Meter != null) Meter.color = new Color(Accent.r, Accent.g, Accent.b, dim);
                Glow.color = new Color(Accent.r, Accent.g, Accent.b, (enabled ? 0.18f : 0f) + _press * 0.35f);
                Icon.color = Color.Lerp(new Color(1f, 1f, 1f, 0.95f * dim), new Color(0.05f, 0.05f, 0.06f, 1f), _press);
                Caption.color = new Color(1f, 1f, 1f, 0.85f * dim);
                Root.localScale = Vector3.one * (1f - 0.07f * _press);
            }

            public void SetMeter(float v) { if (Meter != null) Meter.fillAmount = Mathf.Clamp01(v); }
        }

        private RoundBtn RoundButton(RectTransform parent, string name, string icon, string caption, Vector2 anchor, Vector2 pos, float d, Color accent, bool meter = false)
        {
            var b = new RoundBtn { Accent = accent };
            b.Root = Rect(name, parent, anchor, anchor, pos, new Vector2(d, d));
            Image Img(string n, Sprite sp, float size)
            {
                var rt = Rect(n, b.Root, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(size, size));
                var img = rt.gameObject.AddComponent<Image>();
                img.sprite = sp; img.raycastTarget = false;
                return img;
            }
            b.Glow = Img("Glow", _soft, d * 1.35f);
            b.Bg = Img("Bg", _circle, d);
            b.Ring = Img("Ring", _ring, d);
            if (meter)
            {
                b.Meter = Img("Meter", _ring, d);
                b.Meter.type = Image.Type.Filled; b.Meter.fillMethod = Image.FillMethod.Radial360;
                b.Meter.fillOrigin = (int)Image.Origin360.Top; b.Meter.fillClockwise = true;
            }
            bool word = icon.Length > 2;
            float iconSize = word ? d * Mathf.Min(0.26f, 1.15f / icon.Length) : d * 0.38f;
            b.Icon = Label("Icon", b.Root, icon, (int)iconSize, TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), new Vector2(0f, string.IsNullOrEmpty(caption) ? 0f : d * 0.08f), new Vector2(d, d * 0.5f));
            b.Icon.fontStyle = FontStyle.Bold;
            b.Caption = Label("Caption", b.Root, caption, Mathf.Max(22, (int)(d * 0.13f)), TextAnchor.MiddleCenter, new Vector2(0.5f, 0.5f), new Vector2(0f, -d * 0.24f), new Vector2(d, 40f));
            b.Caption.fontStyle = FontStyle.Bold;
            b.Set(false, true, 1f);
            return b;
        }

        /// <summary>Halo difuso (brillo alrededor del botón).</summary>
        private static Sprite SoftSprite(int size)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = "soft" };
            var px = new Color32[size * size];
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(size * 0.5f, size * 0.5f)) / (size * 0.5f);
                float a = Mathf.Clamp01(1f - d);
                px[y * size + x] = new Color32(255, 255, 255, (byte)(a * a * 255f));
            }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f);
        }

        /// <summary>Círculo suave (thickness = 0) o aro (grosor relativo al radio), con bordes antialias.</summary>
        private static Sprite CircleSprite(int size, float thickness)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, name = thickness > 0f ? "ring" : "circle" };
            var px = new Color32[size * size];
            float r = size * 0.5f - 1f, inner = thickness > 0f ? r * (1f - thickness) : -1f;
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(size * 0.5f, size * 0.5f));
                float a = Mathf.Clamp01(r - d + 0.5f);
                if (inner > 0f) a *= Mathf.Clamp01(d - inner + 0.5f);
                px[y * size + x] = new Color32(255, 255, 255, (byte)(a * 255f));
            }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f);
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
