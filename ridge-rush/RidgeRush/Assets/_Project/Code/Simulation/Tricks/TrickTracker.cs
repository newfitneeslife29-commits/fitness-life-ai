using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Detecta trucos a partir del estado de la simulación (GDD §4.3):
    /// volteretas, wheelies, stoppies, saltos largos y aterrizajes perfectos.
    /// Vive dentro de <see cref="BikeSim"/> para que sea determinista y se pueda validar en el servidor.
    /// </summary>
    internal sealed class TrickTracker
    {
        // Umbrales del GDD.
        private const float MinAirTimeForLanding = 0.25f;
        private const float MinAirTimeForPerfect = 0.4f;
        private const float LongJumpTime = 1.5f;
        private const float WheelieTime = 1.0f;
        private const float StoppieTime = 0.5f;
        private const float BothWheelsWindow = 0.12f;

        private readonly BikeSim _sim;
        private float _airTime;
        private float _airRotation;
        private float _takeoffAngle;
        private float _wheelieTime;
        private float _stoppieTime;

        // Ventana tras tocar el suelo para comprobar el aterrizaje perfecto.
        private float _landingWindow;
        private float _landingAirTime;
        private float _pendingImpact;
        private bool _landingPending;

        public TrickTracker(BikeSim sim) { _sim = sim; }

        public void Reset()
        {
            _airTime = _airRotation = _wheelieTime = _stoppieTime = 0f;
            _landingWindow = 0f; _landingPending = false; _pendingImpact = 0f;
        }

        /// <summary>Una rueda acaba de tocar el suelo con esta velocidad de impacto.</summary>
        public void NotifyTouchdown(float impact) => _pendingImpact = Math.Max(_pendingImpact, impact);

        public void Update(float dt)
        {
            if (_sim.Crashed) return;
            bool fg = _sim.FrontInfo.Grounded, rg = _sim.RearInfo.Grounded;
            bool airborne = !fg && !rg;

            if (airborne)
            {
                if (_airTime == 0f) _takeoffAngle = _sim.Chassis.Angle - _sim.Chassis.AngularVelocity * dt;
                _airTime += dt;
                _airRotation += _sim.Chassis.AngularVelocity * dt;
                EndWheelieStoppie();
                _pendingImpact = 0f;
                return;
            }

            // Acaba de aterrizar.
            if (_airTime > 0f)
            {
                if (_airTime >= MinAirTimeForLanding) OnLanded();
                _airTime = 0f; _airRotation = 0f;
            }

            // Aterrizaje perfecto: ambas ruedas dentro de la ventana y la moto alineada con el suelo.
            if (_landingPending)
            {
                _landingWindow -= dt;
                if (fg && rg)
                {
                    _landingPending = false;
                    Vec2 up = _sim.Chassis.LocalDirToWorld(Vec2.Up);
                    float angle = MathF.Acos(SimMath.Clamp(Vec2.Dot(up, _sim.GroundNormal), -1f, 1f));
                    if (angle <= _sim.Params.perfectLandingMaxAngleDeg * SimMath.Deg2Rad)
                    {
                        _sim.ApplySpeedBoost(_sim.Params.perfectLandingBoost);
                        _sim.PushEvent(new SimEvent { Type = SimEventType.PerfectLanding, Value = _landingAirTime });
                    }
                }
                else if (_landingWindow <= 0f) _landingPending = false;
            }

            // Wheelie / stoppie.
            if (rg && !fg) { _wheelieTime += dt; if (_stoppieTime > 0f) EndStoppie(); }
            else if (fg && !rg) { _stoppieTime += dt; if (_wheelieTime > 0f) EndWheelie(); }
            else EndWheelieStoppie();
        }

        private void OnLanded()
        {
            _sim.PushEvent(new SimEvent { Type = SimEventType.Landed, Value = _pendingImpact });
            _pendingImpact = 0f;

            // Una voltereta = la moto pasa una vez por "boca abajo" (ángulo π + 2πk) entre el despegue y el aterrizaje.
            // Así cuenta igual saltar desde una rampa inclinada y aterrizar en una bajada (despegue a +40°, aterrizaje a -20°).
            float landing = _sim.Chassis.Angle;
            int flips = Math.Abs(InvertedIndex(landing) - InvertedIndex(_takeoffAngle));
            if (flips >= 1)
            {
                _sim.PushEvent(new SimEvent
                {
                    Type = SimEventType.Trick,
                    Trick = _airRotation > 0f ? TrickType.Backflip : TrickType.Frontflip,
                    Count = flips,
                    Value = _airTime,
                });
            }
            if (_airTime >= LongJumpTime)
                _sim.PushEvent(new SimEvent { Type = SimEventType.Trick, Trick = TrickType.LongJump, Count = 1, Value = _airTime });

            if (_airTime >= MinAirTimeForPerfect)
            {
                _landingPending = true;
                _landingWindow = BothWheelsWindow;
                _landingAirTime = _airTime;
            }
        }

        private static int InvertedIndex(float angle) => (int)MathF.Floor((angle - SimMath.Pi) / SimMath.TwoPi);

        private void EndWheelieStoppie() { EndWheelie(); EndStoppie(); }

        private void EndWheelie()
        {
            if (_wheelieTime >= WheelieTime)
                _sim.PushEvent(new SimEvent { Type = SimEventType.Trick, Trick = TrickType.Wheelie, Count = 1, Value = _wheelieTime });
            _wheelieTime = 0f;
        }

        private void EndStoppie()
        {
            if (_stoppieTime >= StoppieTime)
                _sim.PushEvent(new SimEvent { Type = SimEventType.Trick, Trick = TrickType.Stoppie, Count = 1, Value = _stoppieTime });
            _stoppieTime = 0f;
        }
    }
}
