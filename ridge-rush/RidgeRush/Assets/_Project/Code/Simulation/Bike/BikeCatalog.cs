using System;

namespace RidgeRush.Simulation
{
    public enum Rarity : byte { Common, Rare, Epic, Legendary }

    /// <summary>Una moto del garaje (marcas y modelos ficticios, GDD §7).</summary>
    public sealed class BikeDef
    {
        public string Id, Name, Brand, Class;
        public Rarity Rarity;
        public int PriceCoins;      // 0 = no se vende con monedas
        public int PriceGems;       // 0 = no se vende con gemas
        public float Torque = 1f;   // multiplicadores sobre la moto base
        public float TopSpeed = 1f;
        public float Grip = 1f;
        public float Mass = 1f;
        public float Suspension = 1f;
        public float Lean = 1f;
        public float Nitro = 1f;
        public float WheelScale = 1f;
        public float BodyR = 0.95f, BodyG = 0.36f, BodyB = 0.1f; // pintura de fábrica
    }

    /// <summary>
    /// Catálogo de motos y mejoras. Convierte una moto + sus mejoras en los parámetros físicos de la simulación.
    /// En el modo online se usan las clases normalizadas (sin mejoras) para que no haya pay-to-win (GDD §7).
    /// </summary>
    public static class BikeCatalog
    {
        public const int MaxUpgrade = 5;

        public static readonly BikeDef[] Bikes =
        {
            new BikeDef { Id = "haldane_sprout_125", Name = "Sprout 125", Brand = "Haldane Moto", Class = "MX 125", Rarity = Rarity.Common },
            new BikeDef { Id = "haldane_raptor_250", Name = "Raptor 250F", Brand = "Haldane Moto", Class = "MX 250", Rarity = Rarity.Common, PriceCoins = 2500,
                Torque = 1.15f, TopSpeed = 1.05f, Mass = 1.04f, BodyR = 0.95f, BodyG = 0.55f, BodyB = 0.1f },
            new BikeDef { Id = "vextor_brute_450", Name = "Brute 450R", Brand = "Vextor", Class = "MX 450", Rarity = Rarity.Rare, PriceCoins = 7500,
                Torque = 1.35f, TopSpeed = 1.12f, Mass = 1.08f, Lean = 0.95f, BodyR = 0.1f, BodyG = 0.3f, BodyB = 0.85f },
            new BikeDef { Id = "ferrum_trailhound_300", Name = "Trailhound 300", Brand = "Ferrum Works", Class = "Enduro", Rarity = Rarity.Rare, PriceCoins = 6000,
                Torque = 1.2f, Grip = 1.12f, Suspension = 1.15f, Mass = 1.1f, BodyR = 0.2f, BodyG = 0.55f, BodyB = 0.2f },
            new BikeDef { Id = "kestrel_goat_280", Name = "Goat T-280", Brand = "Kestrel Bikes", Class = "Trial", Rarity = Rarity.Rare, PriceCoins = 6500,
                Torque = 1.1f, TopSpeed = 0.9f, Grip = 1.2f, Mass = 0.85f, Lean = 1.3f, BodyR = 0.9f, BodyG = 0.1f, BodyB = 0.15f },
            new BikeDef { Id = "vextor_asfalto_450", Name = "Asfalto SM 450", Brand = "Vextor", Class = "Supermoto", Rarity = Rarity.Rare, PriceCoins = 8000,
                Torque = 1.3f, TopSpeed = 1.2f, Grip = 1.05f, Suspension = 0.85f, WheelScale = 0.9f, BodyR = 0.95f, BodyG = 0.95f, BodyB = 0.95f },
            new BikeDef { Id = "aurelion_stratos_1000", Name = "Stratos 1000", Brand = "Aurelion", Class = "Deportiva", Rarity = Rarity.Epic, PriceGems = 450,
                Torque = 1.9f, TopSpeed = 1.45f, Mass = 1.35f, Suspension = 0.75f, Lean = 0.8f, WheelScale = 0.9f, BodyR = 0.75f, BodyG = 0.05f, BodyB = 0.05f },
            new BikeDef { Id = "ferrum_ironhide_1200", Name = "Ironhide 1200", Brand = "Ferrum Works", Class = "Chopper", Rarity = Rarity.Epic, PriceGems = 400,
                Torque = 2.0f, TopSpeed = 1.25f, Mass = 1.6f, Suspension = 0.7f, Lean = 0.65f, BodyR = 0.08f, BodyG = 0.08f, BodyB = 0.1f },
            new BikeDef { Id = "solace_voltx", Name = "Volt-X", Brand = "Solace EV", Class = "Eléctrica", Rarity = Rarity.Epic, PriceGems = 500,
                Torque = 1.7f, TopSpeed = 1.2f, Mass = 1.05f, Lean = 1.1f, BodyR = 0.18f, BodyG = 0.89f, BodyB = 1f },
            new BikeDef { Id = "kestrel_mule_4x4", Name = "Mule 4x4", Brand = "Kestrel Bikes", Class = "Quad", Rarity = Rarity.Rare, PriceCoins = 9000,
                Torque = 1.35f, TopSpeed = 0.92f, Grip = 1.25f, Mass = 1.3f, Lean = 0.9f, Suspension = 1.1f, WheelScale = 1.05f, BodyR = 0.35f, BodyG = 0.4f, BodyB = 0.2f },
            new BikeDef { Id = "nordvik_frostbite_600", Name = "Frostbite 600", Brand = "Nordvik", Class = "Moto de nieve", Rarity = Rarity.Epic, PriceGems = 350,
                Torque = 1.5f, Grip = 1.5f, Mass = 1.3f, TopSpeed = 1.05f, BodyR = 0.95f, BodyG = 0.85f, BodyB = 0.1f },
            new BikeDef { Id = "haldane_duneviper_250", Name = "Dune Viper 250", Brand = "Haldane Moto", Class = "Rally", Rarity = Rarity.Rare, PriceCoins = 7000,
                Torque = 1.2f, TopSpeed = 1.15f, Suspension = 1.2f, Mass = 1.06f, BodyR = 0.9f, BodyG = 0.75f, BodyB = 0.45f },
            new BikeDef { Id = "vextor_shadow_450", Name = "Shadow 450", Brand = "Vextor", Class = "MX nocturna", Rarity = Rarity.Epic, PriceGems = 300,
                Torque = 1.4f, TopSpeed = 1.15f, Mass = 1.05f, BodyR = 0.12f, BodyG = 0.12f, BodyB = 0.14f },
            new BikeDef { Id = "aurelion_carbon_ghost", Name = "Carbon Ghost 450", Brand = "Aurelion", Class = "Edición carbono", Rarity = Rarity.Legendary, PriceGems = 1200,
                Torque = 1.55f, TopSpeed = 1.22f, Grip = 1.1f, Mass = 0.9f, Lean = 1.15f, Suspension = 1.1f, BodyR = 0.15f, BodyG = 0.15f, BodyB = 0.17f },
            new BikeDef { Id = "haldane_aurum_450", Name = "Aurum 450", Brand = "Haldane Moto", Class = "Edición dorada", Rarity = Rarity.Legendary, PriceGems = 1500,
                Torque = 1.6f, TopSpeed = 1.25f, Grip = 1.12f, Mass = 0.95f, Lean = 1.15f, Suspension = 1.15f, Nitro = 1.4f, BodyR = 0.96f, BodyG = 0.72f, BodyB = 0.18f },
        };

        public static BikeDef Get(string id)
        {
            foreach (var b in Bikes) if (b.Id == id) return b;
            return Bikes[0];
        }

        /// <summary>Precio en monedas de la siguiente mejora (nivel actual 0..4).</summary>
        public static int UpgradeCost(BikeDef bike, int currentLevel) =>
            (int)(400 * Math.Pow(1.9, currentLevel) * (1 + (int)bike.Rarity * 0.5));

        /// <summary>Parámetros físicos de una moto con sus mejoras (niveles 0..5).</summary>
        public static BikeParams Build(BikeDef d, int engine = 0, int tires = 0, int suspension = 0, int brakes = 0, int nitro = 0)
        {
            var p = new BikeParams { id = d.Id };
            float torque = d.Torque * (1f + 0.05f * engine);
            for (int i = 0; i < p.torqueCurveNm.Length; i++) p.torqueCurveNm[i] *= torque;
            p.finalDrive /= d.TopSpeed * (1f + 0.015f * engine);
            p.tireGrip = d.Grip * (1f + 0.04f * tires);
            p.chassisMass *= d.Mass;
            p.chassisInertia *= d.Mass;
            float susp = d.Suspension * (1f + 0.05f * suspension);
            p.frontTravel *= Math.Min(1.25f, susp); p.rearTravel *= Math.Min(1.25f, susp);
            p.frontSpring *= d.Mass; p.rearSpring *= d.Mass;
            p.frontCompressionDamping *= susp * d.Mass; p.rearCompressionDamping *= susp * d.Mass;
            p.leanTorqueAir *= d.Lean * d.Mass; p.leanTorqueGround *= d.Lean * d.Mass; p.leanMaxRate *= d.Lean;
            p.frontBrakeTorque *= d.Mass * (1f + 0.08f * brakes); p.rearBrakeTorque *= d.Mass * (1f + 0.08f * brakes);
            p.nitroCapacity *= d.Nitro * (1f + 0.12f * nitro); p.nitroForce *= d.Mass;
            p.frontWheelRadius *= d.WheelScale; p.rearWheelRadius *= d.WheelScale;
            return p;
        }

        /// <summary>Estadísticas 1–10 para el garaje (velocidad, aceleración, agarre, suspensión, peso).</summary>
        public static (float speed, float accel, float grip, float suspension, float weight) Stats(BikeDef d, int engine = 0, int tires = 0, int suspension = 0)
        {
            float speed = d.TopSpeed * (1f + 0.015f * engine);
            float accel = d.Torque * (1f + 0.05f * engine) / d.Mass;
            float grip = d.Grip * (1f + 0.04f * tires);
            float susp = d.Suspension * (1f + 0.05f * suspension);
            float Clamp(float v) => Math.Max(1f, Math.Min(10f, v));
            return (Clamp(speed * 6f), Clamp(accel * 5.5f), Clamp(grip * 6f), Clamp(susp * 6f), Clamp(d.Mass * 5f));
        }
    }
}
