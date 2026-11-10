# Fase 2 · Elección de motor, arquitectura y estructura del proyecto

## 1. Recomendación: **Unity 6 LTS + URP** (renderizado con Metal)

Para este juego concreto (2.5D, vertical, iPhone, físicas de vehículo, 60/120 FPS y sesiones cortas) **Unity 6 con Universal Render Pipeline** es la mejor opción. Unreal Engine 5 da mejores gráficos en consola y PC, pero sus mayores ventajas no llegan al renderizador móvil de iOS.

| Criterio | Unity 6 + URP | Unreal Engine 5 (móvil) | Ventaja |
| --- | --- | --- | --- |
| Lumen / Nanite (lo que hace a UE5 "realista") | — | **No disponibles en el renderizador móvil de iOS**; se usa iluminación precalculada igual que en Unity | Empate en la práctica |
| Rendimiento y temperatura en iPhone | Forward+ ligero, GPU Resident Drawer, SRP Batcher; muy bueno para 120 FPS | Más coste base por fotograma y más calor; 120 FPS sostenidos es difícil | **Unity** |
| Tamaño de la app | Base ~40–60 MB | Base ~150 MB+ | **Unity** (límite de descarga por datos móviles y conversión) |
| Integración iOS (Game Center, Core Haptics, accesibilidad) | **Plugins oficiales de Apple para Unity** (GameKit, Core Haptics, Accessibility, Game Controller, PHASE) | Soporte parcial; Core Haptics requiere módulo nativo propio | **Unity** |
| Físicas de vehículo | PhysX con control total del paso fijo; sim propia fácil en C# | Chaos Vehicles pensado para coches 3D | **Unity** (vamos a escribir nuestra propia sim de moto de todos modos) |
| Iteración (cambiar y probar) | Compilación C# en segundos, ScriptableObjects para afinar | C++ lento / Blueprints menos mantenibles | **Unity** |
| Talento disponible para móvil | Muy amplio | Más escaso en móvil | **Unity** |
| Calidad máxima posible en Ultra | Muy alta con trabajo de shaders (SSR propio, volumétricos propios) | Algo más alta "de serie" | Unreal |

**Conclusión**: en iPhone, la diferencia visual entre ambos motores la marcan el arte, la luz precalculada y el post-procesado, no el motor. Unity nos da más FPS por vatio, una app más pequeña y la mejor integración con iOS, que son las metas de este proyecto.

**Lo que Unity no trae y construiremos** (presupuestado en las fases): reflejos en espacio de pantalla (SSR) como Renderer Feature, niebla volumétrica ligera, huellas en terreno deformable, nieve que se acumula.

### Versiones y paquetes

| Área | Paquete / tecnología |
| --- | --- |
| Motor | Unity 6 LTS (6000.x), IL2CPP, ARM64, API gráfica **solo Metal** |
| Render | URP (Forward+), Adaptive Probe Volumes, Reflection Probes con mezcla, SRP Batcher, GPU Resident Drawer |
| Entrada | Input System (táctil, giroscopio vía `AttitudeSensor`, mandos MFi) |
| Cámara | Cinemachine 3 |
| Contenido | Addressables (+ On-Demand Resources / descarga en segundo plano para mundos 2–7) |
| Pistas | Splines (extrusión de la superficie de la pista) |
| Rendimiento | Burst, Collections, Mathematics, Jobs |
| Animación | Animation Rigging (IK de manos, pies, tronco), Timeline (cinemáticas y finales de mundo) |
| Audio | **FMOD for Unity** (síntesis granular de motor, parámetros RPM/carga); sin coste por debajo del umbral de ingresos de su licencia indie — revisar al lanzar |
| iOS nativo | Apple Unity Plugins: **GameKit**, **Core Haptics**, **Accessibility**, **Game Controller** |
| Compras | Unity IAP 5 (StoreKit 2) o puente propio a StoreKit 2 |
| Nube | Puente Swift propio a **CloudKit** (no hay plugin oficial) |
| Localización | Unity Localization (es, en) |
| Pruebas | Unity Test Framework (EditMode + PlayMode) |
| Backend | Ver §6 |

Requisito: compilar para iOS necesita **Mac con Xcode 16+**. Integración continua en GitHub Actions con runners macOS (como ya se hace con la app iOS de este repositorio) + Unity Build Automation o GameCI.

---

## 2. Arquitectura del juego

```
                          ┌────────────────────────┐
                          │       Bootstrap        │  escena 0: servicios, ajustes de calidad,
                          └───────────┬────────────┘  inicio de sesión, carga de perfil
                                      │
          ┌───────────────────────────┼─────────────────────────────┐
          ▼                           ▼                             ▼
 ┌─────────────────┐        ┌───────────────────┐         ┌──────────────────┐
 │  Meta (menús)   │        │   Race (carrera)  │         │   Garage (3D)    │
 │ mundos, tienda, │◄──────►│ nivel + moto +    │         │ moto bajo focos, │
 │ pase, perfil    │        │ cámara + HUD      │         │ personalización  │
 └────────┬────────┘        └─────────┬─────────┘         └────────┬─────────┘
          │                           │                            │
          └───────────────┬───────────┴────────────┬───────────────┘
                          ▼                        ▼
               ┌────────────────────┐   ┌─────────────────────┐
               │  Servicios (core)  │   │   Datos (Scriptable │
               │ Save · Economy ·   │   │   Objects + JSON)   │
               │ Online · Audio ·   │   │ motos, niveles,     │
               │ Haptics · Analytics│   │ superficies, tienda │
               └────────────────────┘   └─────────────────────┘
```

### Principios
1. **Módulos como ensamblados** (`.asmdef`) con dependencias en una sola dirección: `Core` ← `Gameplay` ← `Features` ← `App`. El código de juego no conoce la tienda; la tienda no conoce la física.
2. **Datos fuera del código**: motos, superficies, niveles, precios y temporadas son ScriptableObjects/JSON. Los parámetros de la tienda y eventos se pueden actualizar desde el servidor sin nueva versión.
3. **Servicios por interfaz** (`ISaveService`, `IOnlineService`, `IHapticsService`…) registrados en un contenedor simple en el arranque. Cada servicio tiene una implementación "falsa" para el editor y las pruebas.
4. **Eventos de juego** por canales tipados (p. ej. `TrickCompleted`, `Landed`, `Crashed`, `CheckpointReached`) para que HUD, audio, háptica, cámara y analítica reaccionen sin acoplarse a la física.
5. **Sin asignaciones de memoria en el bucle de carrera** (pools para partículas, decals, sonidos), para evitar tirones del recolector de basura.

### 2.1 Simulación de la moto (corazón del juego)

Se escribe una **simulación propia en C#** en lugar de usar `WheelCollider` (pensado para coches 3D):

```
 Paso fijo: 240 Hz (4 sub-pasos por fotograma a 60 FPS; 2 a 120 FPS)

 ┌──────────── BikeSim (plano XY, 3 grados de libertad por cuerpo) ────────────┐
 │                                                                             │
 │  Chasis (masa, inercia) ── horquilla (eje deslizante, muelle+amortiguador) ─► rueda delantera
 │       │                                                                     │
 │       └── basculante (pivote, muelle+amortiguador progresivo) ─────────────► rueda trasera
 │                                                                             │
 │  Piloto = masa adicional cuyo centro se desplaza con la inclinación          │
 │                                                                             │
 │  Ruedas: contacto con la pista por circle-cast contra el perfil de la pista  │
 │          → fuerza normal → modelo de neumático (curva de deslizamiento por   │
 │          superficie, tipo Pacejka simplificado) → tracción / frenada         │
 │                                                                             │
 │  Motor: curva de par por moto × marcha (caja automática 5–6 vel.) × gas      │
 └─────────────────────────────────────────────────────────────────────────────┘
          │ estado (posición, ángulos, compresión, RPM, deslizamiento)
          ▼
   BikeView: mueve los modelos 3D, IK del piloto, partículas, sonido, háptica
```

- **Por qué propia**: control total de la sensación, coste fijo y bajo (< 0,3 ms por fotograma en un A13), y la misma lógica puede ejecutarse fuera de Unity para validar tiempos en servidor.
- El resto del mundo (barriles, puentes que caen, cajas) usa **PhysX 3D con el eje Z bloqueado**; la moto interactúa con ellos por fuerzas recíprocas.
- **Choque**: si el casco o el torso tocan geometría con impulso > umbral, o el ángulo supera límites, el piloto pasa a **ragdoll activo** (PhysX ConfigurableJoints con motores que intentan mantener la pose) y la moto sigue como cuerpo libre.
- **Parámetros de sensación** expuestos en ScriptableObjects con recarga en caliente durante el juego (panel de depuración en el dispositivo).

### 2.2 Cámara
Cinemachine con un controlador propio: look-ahead por velocidad, zoom-out por altura de salto, cámara lenta (escala de tiempo 0,3 durante 0,6 s en trucos grandes, solo en Carrera/Freestyle, nunca online), sacudida por impulso (respetando "reducir movimiento"). Repeticiones: cámaras colocadas por nivel (grúa, fija, teleobjetivo) que se eligen por proximidad y "interés" (salto, truco, choque).

### 2.3 Calidad gráfica por dispositivo

Detección al primer arranque por familia de chip (identificador de modelo `hw.machine` → tabla en JSON actualizable desde el servidor; para modelos nuevos desconocidos: memoria + GPU como respaldo). El jugador puede cambiarlo.

| Calidad | Chips (iOS 17+) | Resolución interna | FPS | Sombras | Reflejos | Post | Clima / partículas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Bajo** | A12, A13 | 70 % + upscale | 60 (30 en ahorro) | 1 cascada, 1024 | Sondas | Bloom + LUT | Partículas ×0,4, sin volumétricos |
| **Medio** | A14, A15 | 80 % | 60 | 2 cascadas, 2048, suaves | Sondas + charcos planos | + viñeta, motion blur de cámara | ×0,7, niebla por altura |
| **Alto** | A16, A17 Pro | 90 % | 60 / **120** en ProMotion | 2 cascadas, 2048, PCF suave | **SSR** en superficies mojadas | + motion blur por objeto, DoF en repeticiones | ×1, volumétricos ligeros |
| **Ultra** | A18 Pro y posteriores | 100 % | 60 / **120** | 3 cascadas, 4096 | SSR completo | Pila completa | ×1, volumétricos completos, nieve acumulada |

- **Escalado dinámico de resolución** si el tiempo de GPU supera el presupuesto (8,3 ms a 120 FPS / 16,6 ms a 60 FPS).
- **Control térmico**: si `thermalState` pasa a *serious*, se baja un nivel de calidad o de 120 a 60 FPS con un aviso discreto; en *critical*, a 30 FPS.
- **120 FPS** se ofrece como opción "Rendimiento" en iPhone Pro; "Calidad" mantiene 60 con más efectos. `CADisableMinimumFrameDurationOnPhone` activado en Info.plist.

### 2.4 Presupuestos por fotograma (Alto, 60 FPS)

| Concepto | Presupuesto |
| --- | --- |
| CPU: simulación moto + mundo | 1,0 ms |
| CPU: lógica, animación, IK | 1,5 ms |
| CPU: render (envío) | 3,0 ms |
| GPU total | 12 ms (margen térmico ~25 %) |
| Llamadas de dibujo | < 250 (SRP Batcher) |
| Triángulos en pantalla | < 600 k |
| Memoria total | < 1,2 GB (dispositivos de 4 GB); < 900 MB en Bajo |

### 2.5 Pista y terreno
- Cada nivel es **una spline de pista** (perfil 2D) extruida en profundidad con un shader de terreno por capas; la física solo lee el perfil 2D (rápido y exacto).
- **Huellas**: un render texture que sigue a la cámara donde se "pintan" las ruedas; el shader de terreno lo usa para hundir los vértices (malla densa solo en la franja de la pista) y oscurecer/humedecer. Se borra con el tiempo.
- **Nieve que se acumula / barro en la moto**: parámetros de shader animados (máscara de altura, máscara de suciedad por pieza), no simulación costosa.

### 2.6 Formato de nivel (preparado para el editor de pistas)
```json
{
  "id": "w1_l07",
  "world": "coast",
  "version": 3,
  "track": { "spline": [[0,0,0.0], [12,1.5,0.3], "…"], "surfaces": [{"from":0,"to":40,"type":"sand"}] },
  "objects": [{ "type": "ramp_wood_m", "t": 31.5, "flip": false }, { "type": "barrel_explosive", "t": 58.2 }],
  "checkpoints": [45.0, 92.0],
  "weather": { "preset": "sunset_clear", "wind": 0.2 },
  "stars": { "gold": 52.4, "silver": 60.0 },
  "camera_shots": ["crane_01", "fixed_03"]
}
```
Los niveles de Carrera se construyen en el editor de Unity con herramientas propias y se **exportan a este formato**; el juego carga siempre desde el formato, así el futuro editor dentro del juego usa el mismo cargador y validador.

---

## 3. Estructura del proyecto Unity

```
RidgeRush/
├── Assets/
│   ├── _Project/
│   │   ├── Code/
│   │   │   ├── Core/                 RidgeRush.Core.asmdef — servicios, eventos, utilidades, pools
│   │   │   │   ├── Services/         ISaveService, IEconomyService, IHapticsService, IAudioService…
│   │   │   │   ├── Events/           Canales de eventos tipados
│   │   │   │   └── Config/           Calidad por dispositivo, flags remotos
│   │   │   ├── Simulation/           RidgeRush.Simulation.asmdef — BikeSim pura (sin UnityEngine.Object)
│   │   │   │   ├── Bike/             Chasis, suspensión, neumático, motor, transmisión
│   │   │   │   ├── Track/            Perfil 2D, consultas de contacto, superficies
│   │   │   │   └── Tricks/           Detección de trucos, combos, aterrizaje perfecto
│   │   │   ├── Gameplay/             RidgeRush.Gameplay.asmdef — nivel, checkpoints, obstáculos, reglas por modo
│   │   │   │   ├── Bike/             BikeView, RiderIK, RagdollController, DamageVisuals
│   │   │   │   ├── Camera/           RaceCamera, ReplayDirector
│   │   │   │   ├── Level/            LevelLoader, Obstacles/, Hazards/, Weather/, DayNight/
│   │   │   │   ├── Modes/            Career, TimeTrial, Daily, Endless, Freestyle, Supercross
│   │   │   │   └── Replay/           Grabación, reproducción, fantasmas
│   │   │   ├── Rendering/            RidgeRush.Rendering.asmdef — Renderer Features (SSR, volumétricos), huellas
│   │   │   ├── Input/                Esquemas táctil / giroscopio / mando
│   │   │   ├── Audio/                Puente FMOD, motor, superficies, música adaptativa
│   │   │   ├── Platform/             RidgeRush.Platform.asmdef — puentes iOS
│   │   │   │   ├── GameCenter/       Login, clasificaciones, logros, partidas (Apple GameKit plugin)
│   │   │   │   ├── Haptics/          Patrones Core Haptics (AHAP)
│   │   │   │   ├── CloudSave/        CloudKit (Swift + bridge)
│   │   │   │   ├── Store/            StoreKit 2
│   │   │   │   └── Privacy/          ATT, consentimiento
│   │   │   ├── Online/               Backend REST, validación, torneos, clubs, multijugador
│   │   │   ├── Meta/                 Economía, progreso, pase de temporada, recompensas diarias
│   │   │   ├── UI/                   UI Toolkit: HUD, menús, garaje, tienda; SafeArea
│   │   │   └── App/                  RidgeRush.App.asmdef — Bootstrap, flujo de escenas
│   │   ├── Data/                     ScriptableObjects: Bikes/, Surfaces/, Worlds/, Store/, Seasons/
│   │   ├── Levels/                   JSON de niveles por mundo (Addressables)
│   │   ├── Art/
│   │   │   ├── Bikes/  Riders/  Worlds/<Mundo>/  Props/  VFX/  UI/  Shaders/  Materials/
│   │   ├── Audio/                    Proyecto FMOD exportado (banks)
│   │   ├── Scenes/                   Bootstrap, Meta, Race, Garage, + escenas de entorno por mundo
│   │   ├── Settings/                 URP assets por calidad, Volume profiles por mundo
│   │   └── Localization/             Tablas es / en
│   ├── Plugins/iOS/                  Swift/Obj-C nativo (CloudKit, StoreKit 2, utilidades)
│   └── Tests/
│       ├── EditMode/                 BikeSim determinista, economía, validación de niveles
│       └── PlayMode/                 Carrera completa automática con "bot" de entradas
├── Packages/manifest.json
├── ProjectSettings/
├── Tools/                            Scripts de compilación, validador de niveles, exportador
├── Backend/                          Servicios del servidor (ver §6)
└── .github/workflows/                Compilación iOS, pruebas, TestFlight
```

**Escenas**: `Bootstrap` (siempre cargada) → `Meta` | `Garage` | `Race`. En `Race` se carga aditivamente la escena de entorno del mundo (fondos, luz precalculada, sondas) y luego el nivel desde su JSON. Reiniciar un nivel **no recarga escenas**: se reinicia la simulación y se devuelven objetos a sus pools (<300 ms).

---

## 4. Safe Area, Dynamic Island y tamaños de iPhone
- Todo el HUD vive dentro de `Screen.safeArea`; un componente `SafeAreaRoot` reajusta al cambiar.
- La franja de la Dynamic Island no recibe elementos interactivos; el tiempo de carrera se coloca **debajo** de ella.
- Diseño de referencia a 390×844 pt (iPhone 15/16) con anclajes relativos; probado en SE (pantalla 16:9, sin isla) hasta Pro Max.
- Solo orientación vertical (`UIInterfaceOrientationPortrait`); la repetición puede verse en horizontal opcionalmente.

---

## 5. Calidad del código
- C# con convenciones de Microsoft, `nullable` activado en ensamblados de simulación, comentarios XML en todas las API públicas.
- `Simulation` sin dependencias de escena: probada con pruebas unitarias (p. ej. "una 450 en tierra a gas completo alcanza 20 m/s en 2,0–2,4 s").
- Revisión de código obligatoria, análisis estático (Roslyn analyzers), perfilado con Unity Profiler + Xcode Instruments (Metal System Trace) cada sprint en un iPhone de gama baja (A13) y uno Pro.

---

## 6. Backend (para Fases 5–6)

| Necesidad | Solución propuesta |
| --- | --- |
| Identidad | Game Center (identidad del jugador) + Sign in with Apple; token verificado en servidor |
| Guardado | **CloudKit** (base de datos privada del usuario), con resolución de conflictos por campo (máximo de estrellas, suma de monedas por transacción) |
| Clasificaciones públicas | Game Center (amigos/global) + clasificación propia por país en servidor |
| Validación de tiempos | Servicio propio: recibe entradas + muestras de estado; comprueba plausibilidad (velocidad máx., trayectoria sobre la pista, tiempo ≥ límite físico) y **re-simula** con la misma `BikeSim` (compilada para .NET) con tolerancias |
| Fantasmas | Archivos de muestras comprimidos (~40 KB/min) en almacenamiento de objetos + CDN |
| Multijugador 1–4 | Fase inicial: **GameKit real-time matches** (hasta 4 jugadores, sin servidor propio). Las motos no colisionan entre sí: cada cliente simula su moto y envía estados a 20 Hz; los rivales se muestran interpolados con ~100 ms de retraso. Escalado posterior: relé dedicado (UDP) si se necesita emparejamiento global por habilidad |
| Torneos, clubs, temporadas, tienda remota | API REST (contenedores sin servidor) + base de datos gestionada |
| Analítica | Eventos agregados propios, sin IDFA salvo consentimiento ATT |

---

## 7. Hoja de ruta estimada (equipo de ~8–10 personas)

| Fase | Contenido | Duración orientativa |
| --- | --- | --- |
| 1–2 | GDD, estilo, arquitectura, lista de assets (**este documento**) | ✅ |
| 3 | Prototipo: BikeSim, controles, piloto IK/ragdoll, 1 nivel de Costa Coral con luz y post | 8–10 semanas |
| 4 | Mundos, clima, día/noche, herramientas de nivel | 12–16 semanas (en paralelo con producción de arte) |
| 5 | Tienda, garaje 3D, economía, guardado | 6–8 semanas |
| 6 | Online | 10–12 semanas |
| 7 | Pulido, audio, optimización | 8 semanas |
| 8 | App Store: icono, capturas, tráiler, ficha | 2–3 semanas |
| | **Soft-launch → lanzamiento** | ~12–15 meses en total |
