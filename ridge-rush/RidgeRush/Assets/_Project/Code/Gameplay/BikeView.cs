using RidgeRush.Simulation;
using UnityEngine;

namespace RidgeRush.Game
{
    /// <summary>
    /// Representación 3D de la moto. Lee el estado interpolado de la simulación y mueve las piezas:
    /// chasis, ruedas (giro), barras inferiores de la horquilla (recorrido), basculante y suciedad.
    /// El modelo de prototipo se genera con primitivas (BikeModelFactory); el modelo de producción
    /// solo necesita las mismas piezas con los mismos nombres (docs/04-lista-assets.md §1).
    /// </summary>
    public sealed class BikeView : MonoBehaviour
    {
        public Transform Chassis;      // origen = centro de masas de la simulación
        public Transform FrontWheel;
        public Transform RearWheel;
        public Transform ForkLower;    // se coloca en el eje delantero
        public Transform Swingarm;     // pivota hacia el eje trasero
        public Vector3 SwingarmPivotLocal;
        public Transform ExhaustTip;
        public Renderer[] Plastics;    // reciben barro

        private float _dirt;
        private MaterialPropertyBlock _mpb;
        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        private Color[] _cleanColors;

        public Vector3 Position => Chassis.position;

        private void Awake()
        {
            _mpb = new MaterialPropertyBlock();
        }

        public void CacheColors()
        {
            _cleanColors = new Color[Plastics.Length];
            for (int i = 0; i < Plastics.Length; i++) _cleanColors[i] = Plastics[i].sharedMaterial.GetColor(BaseColorId);
        }

        public void Apply(in BikeState s)
        {
            Chassis.SetPositionAndRotation(s.ChassisPos.ToV3(), SimConvert.RotZ(s.ChassisAngle));
            FrontWheel.SetPositionAndRotation(s.FrontWheelPos.ToV3(), SimConvert.RotZ(s.FrontWheelAngle));
            RearWheel.SetPositionAndRotation(s.RearWheelPos.ToV3(), SimConvert.RotZ(s.RearWheelAngle));

            // Horquilla: la parte baja va con el eje; la orientación es la del chasis.
            ForkLower.SetPositionAndRotation(s.FrontWheelPos.ToV3(), Chassis.rotation);

            // Basculante: del pivote al eje trasero.
            Vector3 pivot = Chassis.TransformPoint(SwingarmPivotLocal);
            Vector3 axle = s.RearWheelPos.ToV3();
            Vector3 dir = axle - pivot;
            dir.z = 0f;
            Swingarm.position = pivot;
            // Las piezas del basculante apuntan hacia -X local: girar en Z hasta que -X mire al eje.
            Swingarm.rotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg - 180f);
        }

        /// <summary>Desplaza las piezas tras <see cref="Apply"/> (el fantasma va detrás de la moto del jugador).</summary>
        public void ApplyOffset(Vector3 o)
        {
            Chassis.position += o; FrontWheel.position += o; RearWheel.position += o;
            ForkLower.position += o; Swingarm.position += o;
        }

        /// <summary>La moto se ensucia en barro, arena y agua y se limpia muy poco a poco.</summary>
        public void UpdateDirt(in WheelInfo rear, float speed, float dt)
        {
            if (rear.Grounded)
            {
                float gain = rear.Surface == SurfaceType.Mud ? 0.08f : rear.Surface == SurfaceType.Water ? 0.05f : rear.Surface == SurfaceType.Sand ? 0.01f : 0f;
                _dirt = Mathf.Clamp01(_dirt + gain * Mathf.Min(speed, 15f) * dt);
            }
            if (_cleanColors == null) return;
            var mud = new Color(0.3f, 0.22f, 0.15f);
            for (int i = 0; i < Plastics.Length; i++)
            {
                Plastics[i].GetPropertyBlock(_mpb);
                _mpb.SetColor(BaseColorId, Color.Lerp(_cleanColors[i], mud, _dirt * 0.65f));
                Plastics[i].SetPropertyBlock(_mpb);
            }
        }

        public void ResetDirt() { _dirt = 0f; UpdateDirt(default, 0f, 0f); ResetDamage(); }

        // ---- Daño visual (GDD §3): piezas torcidas, rayones (más oscuro) y piezas que se sueltan ----
        private float _damage;
        private Quaternion[] _plasticRest;
        private Vector3[] _plasticPos;

        /// <summary>Aplica daño (0..1 acumulado) tras un choque o un golpe fuerte. No afecta al rendimiento (GDD §4.1).</summary>
        public void AddDamage(float amount)
        {
            if (Plastics == null || Plastics.Length == 0) return;
            if (_plasticRest == null)
            {
                _plasticRest = new Quaternion[Plastics.Length];
                _plasticPos = new Vector3[Plastics.Length];
                for (int i = 0; i < Plastics.Length; i++) { _plasticRest[i] = Plastics[i].transform.localRotation; _plasticPos[i] = Plastics[i].transform.localPosition; }
            }
            _damage = Mathf.Clamp01(_damage + amount);
            for (int i = 0; i < Plastics.Length; i++)
            {
                var t = Plastics[i].transform;
                // Cada pieza se tuerce un poco en una dirección propia; con mucho daño, algunas cuelgan sueltas.
                float sign = (i % 2 == 0) ? 1f : -1f;
                t.localRotation = _plasticRest[i] * Quaternion.Euler(sign * 6f * _damage, 0f, sign * 9f * _damage * (i % 3));
                if (_damage > 0.75f && i % 4 == 1) t.localPosition = _plasticPos[i] + new Vector3(0f, -0.05f, 0f) * _damage;
            }
            _dirt = Mathf.Max(_dirt, _damage * 0.6f); // rayones: la pintura se ve más sucia y apagada
            UpdateDirt(default, 0f, 0f);
        }

        private void ResetDamage()
        {
            _damage = 0f;
            if (_plasticRest == null) return;
            for (int i = 0; i < Plastics.Length; i++) { Plastics[i].transform.localRotation = _plasticRest[i]; Plastics[i].transform.localPosition = _plasticPos[i]; }
        }
    }
}
