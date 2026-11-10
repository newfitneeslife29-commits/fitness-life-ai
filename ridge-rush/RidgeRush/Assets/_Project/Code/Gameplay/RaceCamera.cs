using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Cámara de carrera para pantalla vertical (docs/02 §3):
    /// - seguimiento suave con anticipación según la velocidad (la moto queda en el 40 % izquierdo),
    /// - se aleja en los saltos para que se vea el aterrizaje y con la velocidad,
    /// - sacudida en impactos (desactivable en Accesibilidad),
    /// - sigue al piloto cuando se cae.
    /// </summary>
    public sealed class RaceCamera : MonoBehaviour
    {
        public Camera Cam;
        [Tooltip("Distancia base a la pista (m)")] public float baseDistance = 11f;
        public float heightOffset = 1.6f;
        public float lookAheadPerMps = 0.22f;
        public float maxLookAhead = 4.5f;

        private Vector3 _pos;
        private Vector3 _vel;
        private float _distance;
        private float _distanceVel;
        private float _shake;
        private float _shakeSeed;

        public void Snap(Vector3 target)
        {
            _distance = baseDistance;
            _pos = target + new Vector3(0f, heightOffset, 0f);
            _vel = Vector3.zero;
            Apply(0f);
        }

        public void AddShake(float amount)
        {
            if (!GameSettings.CameraShake) return;
            _shake = Mathf.Min(1f, _shake + amount);
        }

        /// <param name="target">Posición de la moto (o del piloto si está caído).</param>
        /// <param name="velocity">Velocidad (m/s).</param>
        /// <param name="heightAboveGround">Altura sobre el suelo (para alejar en saltos).</param>
        public void Tick(Vector3 target, Vector2 velocity, float heightAboveGround, float dt)
        {
            if (dt <= 0f) return;
            float speed = velocity.magnitude;
            float lookAhead = Mathf.Clamp(velocity.x * lookAheadPerMps, -maxLookAhead * 0.5f, maxLookAhead);
            float lookUp = Mathf.Clamp(velocity.y * 0.12f, -1.5f, 1.5f);
            Vector3 desired = target + new Vector3(lookAhead, heightOffset + lookUp + Mathf.Min(heightAboveGround, 6f) * 0.35f, 0f);

            _pos = Vector3.SmoothDamp(_pos, desired, ref _vel, 0.18f, 200f, dt);

            float desiredDistance = baseDistance + Mathf.Clamp(speed - 8f, 0f, 25f) * 0.12f + Mathf.Clamp(heightAboveGround - 1f, 0f, 8f) * 0.6f;
            _distance = Mathf.SmoothDamp(_distance, desiredDistance, ref _distanceVel, 0.5f, 100f, dt);

            // Campo de visión un poco más abierto a más velocidad (sensación de velocidad).
            Cam.fieldOfView = Mathf.Lerp(Cam.fieldOfView, 48f + Mathf.Clamp(speed, 0f, 30f) * 0.18f, 1f - Mathf.Exp(-3f * dt));

            _shake = Mathf.MoveTowards(_shake, 0f, dt * 2.5f);
            _shakeSeed += dt * 25f;
            Apply(dt);
        }

        private void Apply(float dt)
        {
            Vector3 shake = Vector3.zero;
            if (_shake > 0f)
            {
                float s = _shake * _shake * 0.35f;
                shake = new Vector3((Mathf.PerlinNoise(_shakeSeed, 0f) - 0.5f) * s, (Mathf.PerlinNoise(0f, _shakeSeed) - 0.5f) * s, 0f);
            }
            // Cámara ligeramente por debajo y mirando un poco hacia arriba: los saltos se ven más altos.
            Vector3 camPos = _pos + new Vector3(0f, -0.6f, -_distance) + shake;
            transform.position = camPos;
            transform.rotation = Quaternion.LookRotation((_pos + shake * 0.5f) - camPos + new Vector3(0f, 0.4f, 0f), Vector3.up);
        }
    }
}
