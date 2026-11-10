using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Sonido de motor sintetizado en tiempo real para el prototipo (2 tiempos, un encendido por vuelta).
    /// Sustituye a las grabaciones + síntesis granular con FMOD de la producción (docs/03), pero ya responde
    /// a rpm, gas y carga, así la física se puede afinar "de oído".
    /// También genera los efectos cortos (aterrizaje, choque, cambio de marcha) y el viento.
    /// </summary>
    [RequireComponent(typeof(AudioSource))]
    public sealed class EngineAudio : MonoBehaviour
    {
        // Parámetros que lee el hilo de audio.
        private volatile float _rpm = 1800f;
        private volatile float _throttle;
        private volatile float _wind;
        private volatile bool _muted;

        private int _sampleRate;
        private double _phase;
        private float _pulse, _noiseLp, _outLp, _windLp;
        private uint _rng = 12345u;
        private AudioSource _sfx;
        private AudioClip _land, _crash, _shift;

        private void Awake()
        {
            _sampleRate = AudioSettings.outputSampleRate;
            var src = GetComponent<AudioSource>();
            // Clip silencioso en bucle: OnAudioFilterRead escribe el sonido encima.
            src.clip = AudioClip.Create("engine_carrier", _sampleRate, 1, _sampleRate, false);
            src.loop = true;
            src.spatialBlend = 0f;
            src.volume = 0.55f;
            src.Play();

            _sfx = gameObject.AddComponent<AudioSource>();
            _sfx.playOnAwake = false;
            _land = Thump("land", 0.35f, 70f, 0.8f);
            _crash = Thump("crash", 0.6f, 110f, 1.5f);
            _shift = Thump("shift", 0.06f, 900f, 0.4f);
        }

        public void SetState(float rpm, float throttle, float speed)
        {
            _rpm = rpm;
            _throttle = throttle;
            _wind = Mathf.Clamp01((speed - 5f) / 30f);
            _muted = !GameSettings.Sound;
        }

        public void PlayLanding(float impact) { if (GameSettings.Sound) _sfx.PlayOneShot(_land, Mathf.Clamp01(impact / 10f)); }
        public void PlayCrash() { if (GameSettings.Sound) _sfx.PlayOneShot(_crash, 1f); }
        public void PlayShift() { if (GameSettings.Sound) _sfx.PlayOneShot(_shift, 0.5f); }

        private float Noise()
        {
            _rng ^= _rng << 13; _rng ^= _rng >> 17; _rng ^= _rng << 5;
            return (_rng & 0xFFFFFF) / 8388608f - 1f;
        }

        private void OnAudioFilterRead(float[] data, int channels)
        {
            if (_muted) { System.Array.Clear(data, 0, data.Length); return; }
            float freq = _rpm / 60f;                     // encendidos por segundo
            float thr = _throttle;
            float decay = Mathf.Exp(-1f / (_sampleRate * Mathf.Lerp(0.004f, 0.0022f, thr)));
            float noiseAmt = 0.25f + 0.35f * thr;
            float lpEngine = Mathf.Clamp01(freq * 18f / _sampleRate * 6.28f);
            float wind = _wind;
            double inc = freq / _sampleRate;

            for (int i = 0; i < data.Length; i += channels)
            {
                _phase += inc;
                if (_phase >= 1.0)
                {
                    _phase -= 1.0;
                    _pulse = 0.7f + 0.3f * thr + Noise() * 0.08f; // cada explosión, algo irregular
                }
                _pulse *= decay;
                _noiseLp += (Noise() - _noiseLp) * 0.3f;
                float engine = _pulse * (1f + _noiseLp * noiseAmt);
                _outLp += (engine - _outLp) * lpEngine;          // filtro paso bajo (tubo de escape)
                float sample = Mathf.Clamp(_outLp * (0.5f + 0.5f * thr), -1f, 1f);

                _windLp += (Noise() - _windLp) * 0.02f;
                sample += _windLp * wind * 0.5f;

                for (int c = 0; c < channels; c++) data[i + c] = sample;
            }
        }

        /// <summary>Golpe grave con ruido (aterrizaje/choque).</summary>
        private AudioClip Thump(string name, float duration, float freq, float noise)
        {
            int n = Mathf.CeilToInt(_sampleRate * duration);
            var d = new float[n];
            uint rng = 987u;
            float lp = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = (float)i / _sampleRate;
                rng ^= rng << 13; rng ^= rng >> 17; rng ^= rng << 5;
                float wn = (rng & 0xFFFF) / 32768f - 1f;
                lp += (wn - lp) * 0.08f;
                float env = Mathf.Exp(-t / (duration * 0.25f));
                d[i] = (Mathf.Sin(2f * Mathf.PI * freq * t * (1f - t)) * 0.8f + lp * noise) * env * 0.8f;
            }
            var clip = AudioClip.Create(name, n, 1, _sampleRate, false);
            clip.SetData(d, 0);
            return clip;
        }
    }
}
