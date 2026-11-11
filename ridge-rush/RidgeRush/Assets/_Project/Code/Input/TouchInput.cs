using RidgeRush.Simulation;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;

namespace RidgeRush.Game
{
    /// <summary>
    /// Controles en vertical (GDD §3):
    /// - Botón derecho = gas, botón izquierdo = freno/reversa, botón central = nitro.
    /// - Equilibrio deslizando el pulgar a izquierda/derecha sobre su botón (o inclinando el móvil, opcional).
    /// - Teclado para probar en el editor: ←/→ o A/D equilibrio, ↑/W gas, ↓/S freno, Espacio nitro.
    /// El gas sube en rampa (120 ms) porque la pantalla no mide la presión del dedo.
    /// </summary>
    public sealed class TouchInput
    {
        private const float ThrottleRamp = 1f / 0.12f;
        private const float LeanSlidePoints = 70f;   // puntos de deslizamiento para inclinación completa

        private RectTransform _gas, _brake, _nitro;
        private float _throttle;
        private int _gasTouch = -1, _brakeTouch = -1;
        private Vector2 _gasStart, _brakeStart;
        private Vector3 _tiltZero;
        private bool _tiltCalibrated;

        public bool GasHeld { get; private set; }
        public bool BrakeHeld { get; private set; }
        public bool NitroHeld { get; private set; }
        public float Lean { get; private set; }

        public void Bind(RectTransform gas, RectTransform brake, RectTransform nitro)
        {
            _gas = gas; _brake = brake; _nitro = nitro;
            if (!EnhancedTouchSupport.enabled) EnhancedTouchSupport.Enable();
            if (GravitySensor.current != null) InputSystem.EnableDevice(GravitySensor.current);
        }

        public void CalibrateTilt() => _tiltCalibrated = false;

        public BikeInput Read(float dt)
        {
            bool gas = false, brake = false, nitro = false;
            float lean = 0f;
            float scale = Screen.dpi > 0 ? Screen.dpi / 163f : 1f; // puntos → píxeles

            foreach (var t in Touch.activeTouches)
            {
                Vector2 pos = t.screenPosition;
                if (t.phase == UnityEngine.InputSystem.TouchPhase.Began)
                {
                    if (Contains(_gas, pos)) { _gasTouch = t.touchId; _gasStart = pos; }
                    else if (Contains(_brake, pos)) { _brakeTouch = t.touchId; _brakeStart = pos; }
                }
                if (t.touchId == _gasTouch)
                {
                    gas = true;
                    lean += Mathf.Clamp((pos.x - _gasStart.x) / (LeanSlidePoints * scale), -1f, 1f);
                }
                else if (t.touchId == _brakeTouch)
                {
                    brake = true;
                    lean += Mathf.Clamp((pos.x - _brakeStart.x) / (LeanSlidePoints * scale), -1f, 1f);
                }
                if (Contains(_nitro, pos)) nitro = true;
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
                if (kb.spaceKey.isPressed) nitro = true;
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
                if (pad.buttonSouth.isPressed) nitro = true;
            }

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
    }
}
