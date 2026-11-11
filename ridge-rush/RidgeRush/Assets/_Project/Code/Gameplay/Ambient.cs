using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>Se desplaza despacio por el fondo con un leve vaivén y vuelve a empezar al salir del nivel.</summary>
    public sealed class Drifter : MonoBehaviour
    {
        private Vector3 _vel;
        private float _bob, _x0, _x1, _phase, _baseY;

        public void Init(Vector3 velocity, float bob, float x0, float x1)
        {
            _vel = velocity; _bob = bob; _x0 = x0; _x1 = x1;
            _phase = Random.value * 10f; _baseY = transform.position.y;
        }

        private void Update()
        {
            var p = transform.position + _vel * Time.deltaTime;
            if (p.x > _x1) p.x = _x0;
            p.y = _baseY + Mathf.Sin(Time.time * 0.6f + _phase) * _bob;
            transform.position = p;
        }
    }

    /// <summary>Aleteo de un pájaro (las dos alas suben y bajan).</summary>
    public sealed class Flapper : MonoBehaviour
    {
        private Transform _l, _r;
        private float _phase;

        private void Start()
        {
            _l = transform.Find("WingL"); _r = transform.Find("WingR");
            _phase = Random.value * 6f;
        }

        private void Update()
        {
            float a = Mathf.Sin(Time.time * 9f + _phase) * 35f;
            if (_l != null) _l.localRotation = Quaternion.Euler(0f, 0f, a);
            if (_r != null) _r.localRotation = Quaternion.Euler(0f, 0f, -a);
        }
    }

    /// <summary>Gira sin parar sobre su eje Y (rotor del helicóptero).</summary>
    public sealed class Spinner : MonoBehaviour
    {
        public float Speed = 360f;
        private void Update() => transform.Rotate(0f, Speed * Time.deltaTime, 0f, Space.Self);
    }
}
