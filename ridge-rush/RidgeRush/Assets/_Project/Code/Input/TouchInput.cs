using RidgeRush.Simulation;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;

namespace RidgeRush.Game
{
    /// <summary>
    /// Controles en horizontal:
    /// - Derecha: GAS (grande) y FRENO/reversa a su izquierda; encima, PODER y K.O.
    /// - Izquierda: inclinarse ATRÁS ◄ y ADELANTE ►; encima, TURBO: un toque y la moto acelera sola con
    ///   el nitro durante <see cref="TurboSeconds"/> (o hasta vaciarlo), sin tener que mantener el gas.
    /// - Opcional: equilibrio inclinando el móvil.
    /// - Teclado para probar en el editor: ←/→ o A/D equilibrio, ↑/W gas, ↓/S freno, Espacio nitro.
    /// El gas sube en rampa (120 ms) porque la pantalla no mide la presión del dedo.
    /// </summary>
    public sealed class TouchInput
    {
        private const float ThrottleRamp = 1f / 0.12f;

        private RectTransform _gas, _brake, _nitro, _leanBack, _leanFwd;
        private float _throttle;
        private int _gasTouch = -1, _brakeTouch = -1;
        private Vector3 _tiltZero;
        private bool _tiltCalibrated;

        public bool GasHeld { get; private set; }
        public bool BrakeHeld { get; private set; }
        public bool NitroHeld { get; private set; }
        public const float TurboSeconds = 2.5f;
        private float _turbo;
        private int _nitroTouch = -1;
        /// <summary>Turbo en marcha (acelera solo).</summary>
        public bool TurboActive => _turbo > 0f;
        /// <summary>Corta el turbo (sin nitro, caída, meta).</summary>
        public void CancelTurbo() => _turbo = 0f;
        public float Lean { get; private set; }
        public bool LeanBackHeld { get; private set; }
        public bool LeanForwardHeld { get; private set; }

        public void Bind(RectTransform gas, RectTransform brake, RectTransform nitro, RectTransform leanBack, RectTransform leanFwd)
        {
            _gas = gas; _brake = brake; _nitro = nitro; _leanBack = leanBack; _leanFwd = leanFwd;
            if (!EnhancedTouchSupport.enabled) EnhancedTouchSupport.Enable();
            if (GravitySensor.current != null) InputSystem.EnableDevice(GravitySensor.current);
        }

        public void CalibrateTilt() => _tiltCalibrated = false;

        public BikeInput Read(float dt)
        {
            bool gas = false, brake = false, nitro = false, back = false, fwd = false;
            float lean = 0f;

            foreach (var t in Touch.activeTouches)
            {
                Vector2 pos = t.screenPosition;
                if (t.phase == UnityEngine.InputSystem.TouchPhase.Began)
                {
                    if (Contains(_gas, pos, 1.1f)) _gasTouch = t.touchId;
                    else if (Contains(_brake, pos, 1.1f)) _brakeTouch = t.touchId;
                }
                if (t.touchId == _gasTouch) gas = true;
                else if (t.touchId == _brakeTouch) brake = true;
                if (t.phase == UnityEngine.InputSystem.TouchPhase.Began && Contains(_nitro, pos, 1.1f)) { _turbo = TurboSeconds; _nitroTouch = t.touchId; }
                // Inclinación: el dedo puede pasar de un botón al otro sin levantarlo.
                if (Contains(_leanBack, pos, 1.15f)) back = true;
                else if (Contains(_leanFwd, pos, 1.15f)) fwd = true;
                if (t.phase == UnityEngine.InputSystem.TouchPhase.Ended || t.phase == UnityEngine.InputSystem.TouchPhase.Canceled)
                {
                    if (t.touchId == _gasTouch) _gasTouch = -1;
                    if (t.touchId == _brakeTouch) _brakeTouch = -1;
                }
            }

            // Giroscopio (inclinar el móvil a la derecha = inclinarse hacia delante).
            if (GameSettings.TiltControl && GravitySensor.current != null)
            {
                Vector3 g = GravitySensor.current.gravity.ReadValue().normalized;
                if (!_tiltCalibrated) { _tiltZero = g; _tiltCalibrated = true; }
                lean += Mathf.Clamp((g.x - _tiltZero.x) * 2.8f, -1f, 1f);
            }

            // Teclado (editor y mandos con teclado).
            var kb = Keyboard.current;
            if (kb != null)
            {
                if (kb.upArrowKey.isPressed || kb.wKey.isPressed) gas = true;
                if (kb.downArrowKey.isPressed || kb.sKey.isPressed) brake = true;
                if (kb.spaceKey.wasPressedThisFrame) _turbo = TurboSeconds;
                if (kb.rightArrowKey.isPressed || kb.dKey.isPressed) lean += 1f;
                if (kb.leftArrowKey.isPressed || kb.aKey.isPressed) lean -= 1f;
            }

            // Mando (MFi / Xbox / PlayStation): gatillo derecho gas, izquierdo freno, stick equilibrio.
            var pad = Gamepad.current;
            if (pad != null)
            {
                float rt = pad.rightTrigger.ReadValue(), lt = pad.leftTrigger.ReadValue();
                if (rt > 0.1f) gas = true;
                if (lt > 0.1f) brake = true;
                lean += pad.leftStick.ReadValue().x;
                if (pad.buttonSouth.wasPressedThisFrame) _turbo = TurboSeconds;
            }

            if (back) lean -= 1f;
            if (fwd) lean += 1f;
            LeanBackHeld = back || (Keyboard.current != null && (Keyboard.current.leftArrowKey.isPressed || Keyboard.current.aKey.isPressed));
            LeanForwardHeld = fwd || (Keyboard.current != null && (Keyboard.current.rightArrowKey.isPressed || Keyboard.current.dKey.isPressed));
            if (_turbo > 0f) { _turbo -= dt; nitro = true; gas = !brake; }
            _throttle = gas ? Mathf.MoveTowards(_throttle, 1f, ThrottleRamp * dt) : 0f;
            GasHeld = gas; BrakeHeld = brake; NitroHeld = nitro;
            Lean = Mathf.Clamp(lean, -1f, 1f);
            return new BikeInput { Throttle = _throttle, Brake = brake ? 1f : 0f, Lean = Lean, Nitro = nitro };
        }

        /// <summary>Botón/gesto "atrás" de Android (el Input System lo entrega como Escape) o Esc en el editor.</summary>
        public bool BackPressed() => Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame;

        public bool RestartPressed() => Keyboard.current != null && Keyboard.current.rKey.wasPressedThisFrame;

        private static bool Contains(RectTransform rt, Vector2 screenPos) =>
            rt != null && RectTransformUtility.RectangleContainsScreenPoint(rt, screenPos, null);

        /// <summary>Contiene con margen (zona táctil algo mayor que el dibujo).</summary>
        private static bool Contains(RectTransform rt, Vector2 screenPos, float scale)
        {
            if (rt == null) return false;
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(rt, screenPos, null, out var local)) return false;
            var r = rt.rect;
            return Mathf.Abs(local.x - r.center.x) <= r.width * 0.5f * scale && Mathf.Abs(local.y - r.center.y) <= r.height * 0.5f * scale;
        }
    }
}
