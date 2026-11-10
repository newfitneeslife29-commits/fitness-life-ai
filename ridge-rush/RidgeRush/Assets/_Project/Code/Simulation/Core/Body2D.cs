using System;

namespace RidgeRush.Simulation
{
    /// <summary>
    /// Cuerpo rígido en el plano de juego: 2 grados de libertad de traslación y 1 de rotación.
    /// Las ruedas también son <see cref="Body2D"/>: su rotación es el giro de la rueda.
    /// </summary>
    public sealed class Body2D
    {
        public Vec2 Position;
        public float Angle;
        public Vec2 Velocity;
        public float AngularVelocity;

        public float Mass { get; private set; }
        public float InvMass { get; private set; }
        public float Inertia { get; private set; }
        public float InvInertia { get; private set; }

        // Fuerzas acumuladas durante el paso actual.
        public Vec2 Force;
        public float Torque;

        public Body2D(float mass, float inertia) => SetMass(mass, inertia);

        public void SetMass(float mass, float inertia)
        {
            if (mass <= 0f || inertia <= 0f) throw new ArgumentOutOfRangeException(nameof(mass), "Masa e inercia deben ser positivas.");
            Mass = mass; InvMass = 1f / mass;
            Inertia = inertia; InvInertia = 1f / inertia;
        }

        /// <summary>Convierte un punto del espacio local del cuerpo al mundo.</summary>
        public Vec2 LocalToWorld(Vec2 local) => Position + Vec2.Rotate(local, Angle);

        /// <summary>Convierte una dirección local a dirección en el mundo.</summary>
        public Vec2 LocalDirToWorld(Vec2 localDir) => Vec2.Rotate(localDir, Angle);

        /// <summary>Velocidad de un punto del mundo que se mueve solidario al cuerpo.</summary>
        public Vec2 VelocityAt(Vec2 worldPoint) => Velocity + Vec2.Cross(AngularVelocity, worldPoint - Position);

        public void ApplyImpulse(Vec2 impulse, Vec2 worldPoint)
        {
            Velocity += impulse * InvMass;
            AngularVelocity += InvInertia * Vec2.Cross(worldPoint - Position, impulse);
        }

        public void ApplyForce(Vec2 force, Vec2 worldPoint)
        {
            Force += force;
            Torque += Vec2.Cross(worldPoint - Position, force);
        }

        public void ClearForces() { Force = Vec2.Zero; Torque = 0f; }

        public void Reset(Vec2 position, float angle)
        {
            Position = position; Angle = angle;
            Velocity = Vec2.Zero; AngularVelocity = 0f;
            ClearForces();
        }
    }
}
