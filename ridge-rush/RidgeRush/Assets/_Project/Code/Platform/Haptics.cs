using System.Runtime.InteropServices;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Vibración del juego (GDD §3/§4). Misma interfaz en iOS y Android:
    /// - iOS: Core Haptics (Plugins/iOS/RRHaptics.swift): motor continuo modulado por rpm + golpes transitorios.
    /// - Android: Vibrator con amplitud (API 26+). La mayoría de móviles Android no tienen un motor háptico
    ///   preciso, así que en Android solo se usan golpes cortos (aterrizajes, choques, cambios) y nunca el motor continuo.
    /// </summary>
    public interface IHaptics
    {
        /// <summary>Vibración continua del motor. intensity/sharpness 0..1.</summary>
        void Engine(float intensity, float sharpness);
        /// <summary>Golpe corto (aterrizaje, choque, cambio de marcha). strength/sharpness 0..1.</summary>
        void Impact(float strength, float sharpness);
        void Stop();
    }

    public static class Haptics
    {
        private static IHaptics _impl;

        public static IHaptics Instance
        {
            get
            {
                if (_impl != null) return _impl;
#if UNITY_IOS && !UNITY_EDITOR
                _impl = new IosHaptics();
#elif UNITY_ANDROID && !UNITY_EDITOR
                _impl = new AndroidHaptics();
#else
                _impl = new NullHaptics();
#endif
                return _impl;
            }
        }

        public static void Engine(float intensity, float sharpness) { if (GameSettings.Haptics) Instance.Engine(intensity, sharpness); else Instance.Stop(); }
        public static void Impact(float strength, float sharpness) { if (GameSettings.Haptics) Instance.Impact(strength, sharpness); }
        public static void Stop() => Instance.Stop();
    }

    internal sealed class NullHaptics : IHaptics
    {
        public void Engine(float intensity, float sharpness) { }
        public void Impact(float strength, float sharpness) { }
        public void Stop() { }
    }

#if UNITY_IOS && !UNITY_EDITOR
    internal sealed class IosHaptics : IHaptics
    {
        [DllImport("__Internal")] private static extern bool RRHaptics_Init();
        [DllImport("__Internal")] private static extern void RRHaptics_Engine(float intensity, float sharpness);
        [DllImport("__Internal")] private static extern void RRHaptics_Impact(float intensity, float sharpness);
        [DllImport("__Internal")] private static extern void RRHaptics_Stop();

        private readonly bool _ok;
        private float _lastI = -1f, _lastS = -1f;

        public IosHaptics() { _ok = RRHaptics_Init(); }

        public void Engine(float intensity, float sharpness)
        {
            if (!_ok) return;
            // Evitar llamadas nativas innecesarias si apenas cambia.
            if (Mathf.Abs(intensity - _lastI) < 0.02f && Mathf.Abs(sharpness - _lastS) < 0.02f) return;
            _lastI = intensity; _lastS = sharpness;
            RRHaptics_Engine(intensity, sharpness);
        }

        public void Impact(float strength, float sharpness) { if (_ok) RRHaptics_Impact(strength, sharpness); }
        public void Stop() { if (_ok) { RRHaptics_Stop(); _lastI = _lastS = -1f; } }
    }
#endif

#if UNITY_ANDROID && !UNITY_EDITOR
    internal sealed class AndroidHaptics : IHaptics
    {
        private readonly AndroidJavaObject _vibrator;
        private readonly AndroidJavaClass _effect;
        private readonly bool _amplitude;
        private float _lastImpact;

        public AndroidHaptics()
        {
            try
            {
                using var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
                using var activity = player.GetStatic<AndroidJavaObject>("currentActivity");
                _vibrator = activity.Call<AndroidJavaObject>("getSystemService", "vibrator");
                _effect = new AndroidJavaClass("android.os.VibrationEffect");
                _amplitude = _vibrator != null && _vibrator.Call<bool>("hasAmplitudeControl");
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"Haptics Android no disponible: {e.Message}");
                _vibrator = null;
            }
        }

        public void Engine(float intensity, float sharpness) { } // ver resumen de la clase

        public void Impact(float strength, float sharpness)
        {
            if (_vibrator == null || Time.unscaledTime - _lastImpact < 0.06f) return;
            _lastImpact = Time.unscaledTime;
            long ms = (long)Mathf.Lerp(18f, 60f, strength);
            int amp = _amplitude ? Mathf.Clamp((int)(strength * 255f), 1, 255) : -1; // -1 = DEFAULT_AMPLITUDE
            using var effect = _effect.CallStatic<AndroidJavaObject>("createOneShot", ms, amp);
            _vibrator.Call("vibrate", effect);
        }

        public void Stop() { _vibrator?.Call("cancel"); }
    }
#endif
}
