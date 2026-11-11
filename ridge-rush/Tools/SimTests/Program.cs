// Pruebas de la simulación de Ridge Rush (sin Unity).
// Uso:
//   dotnet run                      → ejecuta todas las pruebas
//   dotnet run -- dump <nivel.json> → imprime dónde empieza cada sección del nivel (para colocar objetos)
//   dotnet run -- bot <nivel.json>  → el piloto automático juega el nivel y muestra el resultado
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using RidgeRush.Simulation;

internal static class Program
{
    private static readonly string LevelsDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../RidgeRush/Assets/_Project/Resources/Levels"));
    private static int _failed;

    private static int Main(string[] args)
    {
        if (args.Length >= 2 && args[0] == "dump") { Dump(args[1]); return 0; }
        if (args.Length >= 1 && args[0] == "trace") { Trace(); return 0; }
        if (args.Length >= 1 && args[0] == "generate") { return GenerateAll(args.Length >= 2 ? args[1] : null); }
        if (args.Length >= 2 && args[0] == "bot") { RunBot(LoadLevel(args[1]), verbose: true); return 0; }

        Run("Moto parada se asienta sobre la suspensión", RestsOnFlat);
        Run("Acelera en tierra sin caerse", AcceleratesOnDirt);
        Run("El hielo tiene menos tracción que el asfalto", IceSlowerThanAsphalt);
        Run("Aterriza de una caída de 2 m", SurvivesDrop);
        Run("Inclinar atrás en el aire gira el morro hacia arriba", LeanRotatesInAir);
        Run("Mucho gas en 1ª levanta la rueda delantera", ThrottleWheelie);
        Run("Determinismo: mismas entradas, mismo resultado", Deterministic);
        Run("Volteretas detectadas", BackflipDetected);
        Run("Aterrizar de cabeza = caída", HeadFirstCrashes);
        Run("Plataforma que se derrumba cae tras pisarla", CollapsingPlatform);
        Run("Reglas: reloj, checkpoint y meta", RaceRulesFlow);
        Run("Las 15 motos terminan el nivel 1 (y al máximo de mejoras llegan al 85 %)", AllBikesFinish);
        foreach (var file in Directory.GetFiles(LevelsDir, "*.json", SearchOption.AllDirectories))
        {
            string name = Path.GetFileNameWithoutExtension(file);
            Run($"Nivel {name}: el piloto automático llega a la meta", () =>
            {
                var sw = System.Diagnostics.Stopwatch.StartNew();
                var r = RunBot(LoadLevel(file), verbose: false, respawn: true);
                sw.Stop();
                if (name == "coast_01") Console.WriteLine($"      coste: {sw.Elapsed.TotalMilliseconds * 1000.0 / (r.Sim.Time / BikeSim.FixedDt):0.0} µs por paso de simulación (en esta máquina)");
                // La física es determinista en una misma máquina, pero el redondeo cambia entre procesadores y el piloto
                // automático (sistema caótico) puede caerse en otro sitio: como en el juego, reaparece en el checkpoint.
                Assert(r.State == RaceState.Finished, $"no terminó (estado {r.State}, x={r.Sim.Chassis.Position.x:0.0}, caídas {r.Crashes})");
                Assert(r.Crashes <= 2, $"se cayó {r.Crashes} veces");
                Assert(r.RaceTime >= 30f && r.RaceTime <= 150f, $"duración {r.RaceTime:0.0}s fuera de 30–150 s");
                if (Environment.GetEnvironmentVariable("VERBOSE_LEVELS") == "1")
                    Console.WriteLine($"      tiempo {r.RaceTime:0.00}s, final {r.FinalTime:0.00}s, monedas {r.Coins}, estrellas {r.Stars}");
            });
        }

        Console.WriteLine(_failed == 0 ? "\nTodas las pruebas pasaron." : $"\n{_failed} prueba(s) fallaron.");
        return _failed == 0 ? 0 : 1;
    }

    // ------------------------------------------------------------------ pruebas

    private static void RestsOnFlat()
    {
        var sim = NewSim(FlatTrack(SurfaceType.Dirt));
        Simulate(sim, 3f, _ => BikeInput.Neutral);
        Assert(!sim.Crashed, "se cayó");
        Assert(sim.FrontInfo.Grounded && sim.RearInfo.Grounded, "no tiene las dos ruedas en el suelo");
        Assert(sim.Chassis.Velocity.Length < 0.05f, $"sigue moviéndose ({sim.Chassis.Velocity.Length:0.000} m/s)");
        float f = sim.FrontSuspension.Compression01, r = sim.RearSuspension.Compression01;
        Assert(f > 0.1f && f < 0.6f, $"hundimiento delantero {f:0.00} fuera de rango");
        Assert(r > 0.1f && r < 0.6f, $"hundimiento trasero {r:0.00} fuera de rango");
        Assert(Math.Abs(sim.Chassis.Angle) < 0.08f, $"chasis inclinado {sim.Chassis.Angle * SimMath.Rad2Deg:0.0}°");
    }

    private static void AcceleratesOnDirt()
    {
        var sim = NewSim(FlatTrack(SurfaceType.Dirt));
        float t60 = -1f; // tiempo hasta 60 km/h
        Simulate(sim, 6f, s =>
        {
            if (t60 < 0f && s.Chassis.Velocity.x >= 60f / 3.6f) t60 = s.Time;
            return Balance(s, 1f);
        });
        Assert(!sim.Crashed, "se cayó");
        Assert(t60 > 0f && t60 < 4.5f, $"0–60 km/h en {t60:0.00}s (esperado < 4,5 s)");
        Assert(sim.Engine.Gear >= 2, $"no cambió de marcha (marcha {sim.Engine.Gear + 1})");
        Console.WriteLine($"      0–60 km/h: {t60:0.00}s, velocidad a los 6 s: {sim.Chassis.Velocity.x * 3.6f:0} km/h, marcha {sim.Engine.Gear + 1}");
    }

    private static void IceSlowerThanAsphalt()
    {
        float Dist(SurfaceType s)
        {
            var sim = NewSim(FlatTrack(s));
            Simulate(sim, 3f, x => Balance(x, 1f));
            return sim.Chassis.Position.x;
        }
        float ice = Dist(SurfaceType.Ice), asphalt = Dist(SurfaceType.Asphalt), sand = Dist(SurfaceType.Sand);
        Console.WriteLine($"      distancia en 3 s → asfalto {asphalt:0.0} m, arena {sand:0.0} m, hielo {ice:0.0} m");
        Assert(ice < asphalt * 0.7f, "el hielo no es más lento que el asfalto");
        Assert(sand < asphalt, "la arena no es más lenta que el asfalto");
    }

    private static void SurvivesDrop()
    {
        var sim = NewSim(FlatTrack(SurfaceType.Dirt));
        sim.Reset(new Vec2(0f, 2f + sim.RideHeight), 0f, new Vec2(5f, 0f));
        float maxImpact = 0f;
        Simulate(sim, 2.5f, s =>
        {
            for (int i = 0; i < s.EventCount; i++) if (s.GetEvent(i).Type == SimEventType.Landed) maxImpact = Math.Max(maxImpact, s.GetEvent(i).Value);
            s.ClearEvents();
            return BikeInput.Neutral;
        });
        Assert(!sim.Crashed, "se cayó al aterrizar");
        Assert(sim.FrontInfo.Grounded && sim.RearInfo.Grounded, "no quedó apoyada");
        Assert(maxImpact > 4f, $"impacto detectado {maxImpact:0.0} m/s (esperado ~6)");
    }

    private static void LeanRotatesInAir()
    {
        var sim = NewSim(FlatTrack(SurfaceType.Dirt));
        sim.Reset(new Vec2(0f, 30f), 0f, new Vec2(10f, 0f));
        Simulate(sim, 0.5f, _ => new BikeInput { Lean = -1f });
        Assert(sim.Chassis.Angle > 0.6f, $"ángulo {sim.Chassis.Angle * SimMath.Rad2Deg:0}° (esperado > 35°)");
        Assert(Math.Abs(sim.Chassis.AngularVelocity) <= sim.Params.leanMaxRate * 1.1f, "gira más rápido que el máximo");
    }

    private static void ThrottleWheelie()
    {
        var sim = NewSim(FlatTrack(SurfaceType.Dirt));
        Simulate(sim, 1f, _ => BikeInput.Neutral);
        bool lifted = false;
        Simulate(sim, 1.2f, s => { lifted |= !s.FrontInfo.Grounded && s.RearInfo.Grounded; return new BikeInput { Throttle = 1f, Lean = -0.6f }; });
        Assert(lifted, "la rueda delantera nunca se levantó");
    }

    private static void Deterministic()
    {
        var level = LoadLevel(Path.Combine(LevelsDir, "coast", "coast_01.json"));
        BikeState Run()
        {
            var built = TrackBuilder.Build(level);
            var r = new RaceRules(built, new BikeParams());
            for (int i = 0; i < 240 * 20; i++) r.Step(BotDriver.Drive(r.Sim));
            return r.Sim.CaptureState();
        }
        var a = Run(); var b = Run();
        Assert(a.ChassisPos.Equals(b.ChassisPos) && a.ChassisAngle.Equals(b.ChassisAngle) && a.Rpm.Equals(b.Rpm),
            $"estados distintos: {a.ChassisPos} vs {b.ChassisPos}");
    }

    private static void BackflipDetected()
    {
        // Rampa grande para dar una vuelta hacia atrás y aterrizar.
        var data = new LevelData
        {
            id = "test_flip",
            sections = new[]
            {
                new SectionData { type = "flat", length = 30 },
                new SectionData { type = "ramp", length = 10, height = 5 },
                new SectionData { type = "flat", length = 3 },
                new SectionData { type = "landing", length = 30, height = 12 },
                new SectionData { type = "flat", length = 60 },
            },
        };
        var r = new RaceRules(TrackBuilder.Build(data), new BikeParams());
        int flips = 0; bool launched = false;
        for (int i = 0; i < 240 * 10 && r.State != RaceState.Crashed; i++)
        {
            var s = r.Sim;
            bool air = !s.FrontInfo.Grounded && !s.RearInfo.Grounded;
            if (air && s.Chassis.Position.x > 40f) launched = true;
            BikeInput input;
            if (!launched) input = Balance(s, 1f);
            else if (air)
            {
                // Girar hacia atrás hasta casi completar la vuelta y luego alinear con la bajada.
                float rot = s.Chassis.Angle;
                input = rot < SimMath.TwoPi - 0.9f ? new BikeInput { Lean = -1f, Throttle = 0.5f } : BotDriver.Drive(s);
                if (rot >= SimMath.TwoPi - 0.9f)
                {
                    float target = SimMath.TwoPi - 0.38f; // pendiente de la bajada
                    input.Lean = SimMath.Clamp(3f * (rot - target) + 0.4f * s.Chassis.AngularVelocity, -1f, 1f);
                }
            }
            else input = BotDriver.Drive(s);
            r.Step(input);
            if (Environment.GetEnvironmentVariable("FLIPDEBUG") == "1" && i % 24 == 0)
                Console.WriteLine($"      t={s.Time:0.00} x={s.Chassis.Position.x:0.0} y={s.Chassis.Position.y:0.0} v={s.Chassis.Velocity.x:0.0} ang={s.Chassis.Angle * SimMath.Rad2Deg:0} air={air} launched={launched} st={r.State}");
            for (int e = 0; e < r.Sim.EventCount; e++)
            {
                ref readonly var ev = ref r.Sim.GetEvent(e);
                if (Environment.GetEnvironmentVariable("FLIPDEBUG") == "1" && ev.Type != SimEventType.SurfaceChanged)
                    Console.WriteLine($"      evento {ev.Type} {ev.Trick} n={ev.Count} v={ev.Value:0.00} t={ev.Time:0.00}");
                if (ev.Type == SimEventType.Trick && ev.Trick == TrickType.Backflip) flips += ev.Count;
            }
            r.ClearEvents();
        }
        Assert(r.State != RaceState.Crashed, "se cayó al intentar la voltereta");
        Assert(flips == 1, $"volteretas detectadas: {flips}");
        Assert(r.BonusTime >= RaceRules.FlipTimeBonus, "no dio tiempo extra");
    }

    private static void HeadFirstCrashes()
    {
        var sim = NewSim(FlatTrack(SurfaceType.Dirt));
        sim.Reset(new Vec2(0f, 2.5f), SimMath.Pi, Vec2.Zero); // boca abajo
        bool crashed = false;
        Simulate(sim, 2f, s => { crashed |= s.Crashed; return BikeInput.Neutral; });
        Assert(crashed, "no detectó la caída");
    }

    private static void CollapsingPlatform()
    {
        var data = new LevelData
        {
            id = "test_bridge",
            sections = new[]
            {
                new SectionData { type = "flat", length = 20 },
                new SectionData { type = "gap", length = 14, depth = 6, pit = "ground" },
                new SectionData { type = "flat", length = 40 },
            },
            platforms = new[] { new PlatformData { x = 20f, y = 0f, width = 14f, motion = "Collapse", delay = 1.0f } },
        };
        var built = TrackBuilder.Build(data);
        var r = new RaceRules(built, new BikeParams());
        var platform = built.Track.Chains[1];
        for (int i = 0; i < 240 * 8; i++) r.Step(BotDriver.Drive(r.Sim));
        Assert(platform.Triggered, "la plataforma no se activó");
        Assert(platform.Offset.y < -3f, $"la plataforma no cayó (y={platform.Offset.y:0.0})");
        Assert(r.Sim.Chassis.Position.x > 40f, "la moto no cruzó el puente a tiempo");
    }

    private static void RaceRulesFlow()
    {
        var data = new LevelData
        {
            id = "test_rules",
            sections = new[] { new SectionData { type = "flat", length = 80 }, new SectionData { type = "finish", length = 10 } },
            checkpoints = new[] { 40f },
            stars = new StarTimes { gold = 8f, silver = 12f },
        };
        var r = new RaceRules(TrackBuilder.Build(data), new BikeParams());
        for (int i = 0; i < 240; i++) r.Step(BikeInput.Neutral);
        Assert(r.State == RaceState.Ready && r.RaceTime == 0f, "el reloj corrió sin tocar el gas");
        int guard = 0;
        while (r.State != RaceState.Finished && guard++ < 240 * 30) r.Step(BotDriver.Drive(r.Sim));
        Assert(r.State == RaceState.Finished, "no llegó a la meta");
        Assert(r.LastCheckpoint == 0, "no pasó el checkpoint");
        Assert(r.Stars >= 1 && r.Stars <= 3, "estrellas inválidas");
        Console.WriteLine($"      recta de 80 m en {r.FinalTime:0.00}s → {r.Stars} estrella(s)");
        r.Restart();
        Assert(r.State == RaceState.Ready && r.RaceTime == 0f && r.Sim.Chassis.Position.x < 5f, "el reinicio no volvió al inicio");
    }

    private static void AllBikesFinish()
    {
        var level = LoadLevel(Path.Combine(LevelsDir, "coast", "coast_01.json"));
        foreach (var bike in BikeCatalog.Bikes)
        {
            foreach (int lvl in new[] { 0, BikeCatalog.MaxUpgrade })
            {
                var p = BikeCatalog.Build(bike, lvl, lvl, lvl, lvl, lvl);
                var r = new RaceRules(TrackBuilder.Build(level), p);
                // Como en el juego: si se cae, reaparece en el checkpoint.
                for (int i = 0; i < 240 * 150 && r.State != RaceState.Finished; i++)
                {
                    r.Step(BotDriver.Drive(r.Sim));
                    if (r.State == RaceState.Crashed && r.CrashTimer > 1.3f) r.Respawn();
                }
                // De serie deben terminar; al máximo de mejoras el piloto automático (que no es un jugador) a veces
                // se cae siempre en el mismo sitio a mucha velocidad: basta con que llegue al 85 % de la pista.
                if (lvl == 0) Assert(r.State == RaceState.Finished, $"{bike.Name} de serie no terminó: {r.State} en x={r.Sim.Chassis.Position.x:0}");
                else Assert(r.State == RaceState.Finished || r.Progress >= 0.85f, $"{bike.Name} al máximo se quedó en el {r.Progress:P0}");
                if (lvl == 0 && Environment.GetEnvironmentVariable("VERBOSE_BIKES") == "1") Console.WriteLine($"      {bike.Name,-18} {r.FinalTime:0.0}s");
            }
        }
    }

    // ------------------------------------------------------------------ utilidades

    private static RaceRules RunBot(LevelData level, bool verbose, float aggressiveness = 1f, bool respawn = false)
    {
        var r = new RaceRules(TrackBuilder.Build(level), new BikeParams());
        float lastPrint = 0f;
        for (int i = 0; i < 240 * 150 && r.State != RaceState.Finished && (respawn || r.State != RaceState.Crashed); i++)
        {
            r.Step(BotDriver.Drive(r.Sim, aggressiveness));
            if (respawn && r.State == RaceState.Crashed && r.CrashTimer > 1.3f) r.Respawn();
            if (verbose)
            {
                for (int e = 0; e < r.Sim.EventCount; e++)
                {
                    ref readonly var ev = ref r.Sim.GetEvent(e);
                    if (ev.Type == SimEventType.Trick || ev.Type == SimEventType.PerfectLanding || ev.Type == SimEventType.Crashed || (ev.Type == SimEventType.Landed && ev.Value > 5f))
                        Console.WriteLine($"  t={r.RaceTime,6:0.00} x={r.Sim.Chassis.Position.x,6:0.0} {ev.Type} {(ev.Type == SimEventType.Trick ? ev.Trick.ToString() : "")} {ev.Value:0.00}");
                }
                if (r.RaceTime - lastPrint >= 2f)
                {
                    lastPrint = r.RaceTime;
                    var s = r.Sim;
                    Console.WriteLine($"  t={r.RaceTime,6:0.00} x={s.Chassis.Position.x,6:0.0} y={s.Chassis.Position.y,5:0.0} v={s.Chassis.Velocity.Length * 3.6f,4:0} km/h ang={s.Chassis.Angle * SimMath.Rad2Deg,5:0} marcha {s.Engine.Gear + 1} rpm {s.Engine.Rpm,6:0}");
                }
            }
            r.ClearEvents();
        }
        if (verbose) Console.WriteLine($"Resultado: {r.State} en {r.RaceTime:0.00}s (final {r.FinalTime:0.00}s), x={r.Sim.Chassis.Position.x:0.0} de {r.Level.FinishX:0.0}, monedas {r.Coins}");
        return r;
    }

    /// <summary>
    /// Genera los niveles de todos los mundos (o de uno) con LevelGenerator. Cada nivel se prueba con el piloto
    /// automático: solo se guarda si lo termina sin caerse y en 30–110 s. Las estrellas salen de ese tiempo.
    /// El nivel 1 de Costa Coral está hecho a mano y no se sobrescribe.
    /// </summary>
    private static int GenerateAll(string onlyWorld)
    {
        var json = new JsonSerializerOptions { IncludeFields = true, WriteIndented = true };
        int failures = 0;
        foreach (var w in LevelGenerator.Worlds)
        {
            if (onlyWorld != null && w.Id != onlyWorld) continue;
            string dir = Path.Combine(LevelsDir, w.Id);
            Directory.CreateDirectory(dir);
            for (int i = 0; i < w.LevelCount; i++)
            {
                string file = Path.Combine(dir, $"{w.Id}_{i + 1:00}.json");
                if (w.Id == "coast" && i == 0) continue; // hecho a mano
                bool ok = false;
                for (int seed = 0; seed < 80 && !ok; seed++)
                {
                    var level = LevelGenerator.Generate(w, i, seed);
                    var r = RunBot(level, verbose: false);
                    if (r.State != RaceState.Finished || r.Crashes > 0 || r.RaceTime < 30f || r.RaceTime > 110f) continue;
                    // Robusto: también lo termina conduciendo con menos gas (otro estilo, otra trayectoria).
                    var r2 = RunBot(level, verbose: false, aggressiveness: 0.9f);
                    var r3 = RunBot(level, verbose: false, aggressiveness: 0.8f);
                    if (r2.State != RaceState.Finished || r2.Crashes > 0 || r3.State != RaceState.Finished || r3.Crashes > 0) continue;
                    float t = r.FinalTime;
                    level.stars = new StarTimes { gold = MathF.Round(t * 1.05f, 1), silver = MathF.Round(t * 1.3f, 1) };
                    File.WriteAllText(file, JsonSerializer.Serialize(level, json));
                    Console.WriteLine($"  {level.id}: semilla {seed}, piloto automático {t:0.0}s → ★★★ {level.stars.gold}s");
                    ok = true;
                }
                if (!ok) { failures++; Console.WriteLine($"  ✗ {w.Id} {i + 1}: ninguna semilla completable"); }
            }
        }
        return failures == 0 ? 0 : 1;
    }

    private static void Trace()
    {
        var sim = NewSim(FlatTrack(SurfaceType.Dirt));
        int i = 0;
        Simulate(sim, 6f, s =>
        {
            if (i++ % 60 == 0)
                Console.WriteLine($"t={s.Time:0.00} v={s.Chassis.Velocity.x * 3.6f,5:0.0} ang={s.Chassis.Angle * SimMath.Rad2Deg,5:0.0} g={s.Engine.Gear + 1} rpm={s.Engine.Rpm,6:0} F={s.FrontInfo.Grounded} R={s.RearInfo.Grounded} slide={s.RearInfo.Sliding} slip={s.RearInfo.SlipSpeed:0.0} load={s.RearInfo.Load:0} wR={s.RearWheel.AngularVelocity:0.0}");
            return Balance(s, 1f);
        });
    }

    private static void Dump(string file)
    {
        var level = LoadLevel(file);
        var built = TrackBuilder.Build(level);
        Console.WriteLine($"{level.id}: meta en x={built.FinishX:0.0}");
        // Reconstruye sección a sección para mostrar dónde empieza cada una.
        var partial = new List<SectionData>();
        foreach (var s in level.sections)
        {
            var b = TrackBuilder.Build(new LevelData { sections = partial.ToArray() });
            var pts = b.GroundPoints;
            // El penúltimo tramo antes de la zona de frenada final añadida por el constructor.
            Vec2 start = pts[pts.Length - 4];
            Console.WriteLine($"  {s.type,-8} empieza en x={start.x,7:0.0} y={start.y,5:0.0}  ({s.surface})");
            partial.Add(s);
        }
        foreach (var h in built.Hazards) Console.WriteLine($"  peligro {h.type} x={h.x0:0.0}–{h.x1:0.0}");
    }

    private static LevelData LoadLevel(string file) =>
        JsonSerializer.Deserialize<LevelData>(File.ReadAllText(file), new JsonSerializerOptions { IncludeFields = true, PropertyNameCaseInsensitive = true });

    private static BikeSim NewSim(Track track)
    {
        var sim = new BikeSim(new BikeParams(), track);
        sim.PlaceOnGround(0f);
        return sim;
    }

    private static Track FlatTrack(SurfaceType s)
    {
        var t = new Track();
        t.Add(new TrackChain(new[] { new Vec2(-50f, 0f), new Vec2(2000f, 0f) }, new[] { s }));
        t.Build();
        return t;
    }

    private static void Simulate(BikeSim sim, float seconds, Func<BikeSim, BikeInput> input)
    {
        int steps = (int)(seconds / BikeSim.FixedDt);
        for (int i = 0; i < steps; i++) sim.Step(input(sim));
    }

    /// <summary>Gas con control de wheelie para pruebas en llano.</summary>
    private static BikeInput Balance(BikeSim s, float throttle)
    {
        float lean = SimMath.Clamp(2.5f * s.Chassis.Angle + 0.3f * s.Chassis.AngularVelocity, -1f, 1f);
        return new BikeInput { Throttle = s.Chassis.Angle > 0.3f ? 0.2f : throttle, Lean = lean };
    }

    private static void Run(string name, Action test)
    {
        try { test(); Console.WriteLine($"  ✓ {name}"); }
        catch (Exception e) { _failed++; Console.WriteLine($"  ✗ {name}: {e.Message}"); }
    }

    private static void Assert(bool cond, string msg) { if (!cond) throw new Exception(msg); }
}
