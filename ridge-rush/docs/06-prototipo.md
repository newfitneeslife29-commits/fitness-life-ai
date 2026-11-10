# Fase 3 · Prototipo jugable

Estado: **código entregado.** La física está probada fuera de Unity. Falta abrir el proyecto en Unity y probarlo en iPhone y Android: ese entorno no estaba disponible al escribir el código.

## 1. Cómo abrirlo y jugar

1. Instala **Unity 6 LTS (6000.0.x)** con los módulos **iOS Build Support** y **Android Build Support** desde Unity Hub.
2. En Unity Hub: **Add → Add project from disk** → carpeta `ridge-rush/RidgeRush`. Si te ofrece otra versión 6000.0.x, acéptala; si el gestor de paquetes propone otras versiones de URP o Input System, acéptalas también.
3. Si Unity pregunta por el nuevo sistema de entrada (*Input System*), responde **Yes** (se reinicia el editor).
4. Menú **Ridge Rush → Configurar proyecto (iOS + Android)**. Crea el URP, los materiales base, los ajustes de iOS/Android y la escena `Race_Prototype`.
5. Abre `Assets/_Project/Scenes/Race_Prototype` y pulsa **Play**.

| Acción | Móvil | Teclado (editor) | Mando |
| --- | --- | --- | --- |
| Gas | Botón derecho | ↑ / W | Gatillo derecho |
| Freno / reversa | Botón izquierdo (mantener parado = reversa) | ↓ / S | Gatillo izquierdo |
| Equilibrio | Deslizar el pulgar a izquierda/derecha sobre su botón · o inclinar el móvil (Ajustes) | ← → / A D | Stick izquierdo |
| Nitro | Botón central | Espacio | A / ✕ |
| Reiniciar | Botón ↻ | R | — |
| Pausa / ajustes | Botón II · atrás en Android | Esc | — |

**En el móvil:** *File → Build Profiles* → iOS (genera un proyecto de Xcode; hace falta un Mac) o Android (genera el APK/AAB directamente).

## 2. Qué incluye

| Pieza | Archivo(s) | Notas |
| --- | --- | --- |
| **Física de la moto** (240 Hz, determinista) | `Code/Simulation/Bike/*` | Chasis + 2 ruedas como cuerpos rígidos; suspensión independiente con muelle progresivo, amortiguación de compresión/rebote y topes; motor con curva de par, embrague y caja automática de 5 marchas; frenos que pueden bloquear la rueda; agarre por superficie con pérdida de agarre al patinar; transferencia de peso (caballitos y stoppies salen de la física, no de animaciones); control de tracción opcional; nitro; viento |
| **Pista** | `Code/Simulation/Track/*`, `Level/TrackBuilder.cs` | Niveles en JSON por secciones (rampa, salto con foso, mesa, baches, escalones, bajadas…); plataformas fijas, móviles y **puentes que se derrumban** |
| **Trucos y reglas** | `Tricks/TrickTracker.cs`, `Level/RaceRules.cs` | Volteretas (adelante y atrás, múltiples), caballito, stoppie, salto largo, **aterrizaje perfecto con impulso de velocidad**, combos ×3, −1,5 s por voltereta, monedas, nitro que se recarga con trucos, checkpoints (+3 s), estrellas por tiempo, agua y lava que reinician |
| **Nivel 1 completo** | `Levels/coast/w1_l01.json` | *Muelle del Amanecer* (Costa Coral): 730 m, arena, madera, barro y tierra; 4 fosos con agua, un puente que se derrumba, dunas, mesas, saltos; 2 checkpoints |
| **Moto 3D y piloto** | `Gameplay/BikeView.cs`, `RiderRig.cs` | Moto de prototipo con piezas móviles (horquilla, basculante, radios y tacos que giran) y materiales PBR; se ensucia con barro. Piloto en posición de ataque con **IK** (manos en el manillar, pies en las estriberas), que se inclina con el jugador y **amortigua los aterrizajes**; al caer pasa a **ragdoll físico** |
| **Escenario e iluminación** | `Gameplay/WorldBuilder.cs`, `TrackMeshBuilder.cs` | Atardecer con sol bajo a contraluz, cielo procedural, mar con reflejos, playa, muelle con pilotes, palmeras, cabañas, barcas, faro, islas en 3 planos de profundidad, calima |
| **Post-procesado** | `WorldBuilder.BuildPost` | ACES, bloom, balance de blancos cálido, sombras/medios/luces, viñeta, aberración cromática sutil, desenfoque de movimiento y grano (según calidad) |
| **Cámara** | `Gameplay/RaceCamera.cs` | Anticipación según la velocidad, se aleja en saltos, FOV dinámico, sacudida en impactos, **cámara lenta en volteretas**, sigue al piloto al caer |
| **Partículas y huellas** | `Gameplay/SurfaceFx.cs`, `TireMarks` | Tierra/arena/barro que salpica, polvo, humo del escape, agua, golpe de polvo al aterrizar; **huellas de neumático** en arena, barro, tierra y nieve |
| **Sonido** | `Gameplay/EngineAudio.cs` | Motor 2T sintetizado que responde a rpm y gas, viento, aterrizajes, choque y cambios de marcha (provisional hasta las grabaciones con FMOD) |
| **Vibración** | `Platform/Haptics.cs`, `Plugins/iOS/RRHaptics.swift`, `Plugins/Android/` | iOS: Core Haptics con motor continuo + golpes. Android: golpes con amplitud |
| **Calidad por dispositivo** | `Platform/QualityManager.cs` | Bajo/Medio/Alto/Ultra automática (iPhone por modelo, Android por GPU+memoria), 120 FPS si la pantalla lo permite |
| **HUD y ajustes** | `UI/HudView.cs`, `UI/Loc.cs` | Tiempo, estrellas objetivo, progreso, monedas, combo, nitro, avisos de trucos, pantalla de meta con récord; pausa con vibración, sonido, sacudida, cámara lenta, giroscopio, control de tracción, 120 FPS y calidad. Español/inglés según el idioma del móvil. Safe Area |
| **Configuración** | `Editor/ProjectSetup.cs`, `Editor/IosPostBuild.cs` | Un menú configura iOS y Android y crea la escena; en iOS activa 120 Hz (ProMotion) y enlaza Core Haptics |

## 3. Pruebas automáticas (sin Unity)

```bash
cd ridge-rush/Tools/SimTests
dotnet run -c Release                     # todas las pruebas
dotnet run -c Release -- bot <nivel.json> # el piloto automático juega un nivel y lo narra
dotnet run -c Release -- dump <nivel.json> # posición de cada sección (para colocar objetos)
```

Resultado actual (12/12 ✓, más la medición de coste):

| Prueba | Resultado |
| --- | --- |
| Moto parada se asienta en la suspensión | ✓ |
| 0–60 km/h en tierra | ✓ 2,7 s; 109 km/h a los 6 s, 5.ª marcha |
| Tracción por superficie (distancia en 3 s) | ✓ asfalto 30 m · arena 14 m · hielo 2,6 m |
| Caída de 2 m sin caerse | ✓ |
| Inclinarse en el aire gira la moto | ✓ |
| Mucho gas en 1.ª levanta la rueda delantera | ✓ |
| Determinismo (mismo resultado bit a bit) | ✓ |
| Voltereta hacia atrás detectada y premiada | ✓ |
| Aterrizar de cabeza = caída | ✓ |
| Puente que se derrumba | ✓ |
| Reloj, checkpoint, meta y reinicio | ✓ |
| **Nivel 1 completable** por el piloto automático | ✓ 35,1 s sin caídas (3 estrellas: ≤ 37 s; 2 estrellas: ≤ 46 s) |
| Coste de la física | ✓ ~24 µs por paso ≈ 0,1 ms por fotograma |

El piloto automático va casi a fondo. Un jugador tardará más (estimado 45–60 s, dentro del objetivo de 45–120 s del GDD). Los tiempos de estrellas se ajustarán con pruebas de juego.

## 4. Limitaciones conocidas del prototipo

- **No probado aún dentro de Unity ni en un móvil real.** El código de Unity no tiene errores de sintaxis, pero puede necesitar pequeños ajustes de API al abrirlo; la física sí está probada.
- Arte provisional con primitivas (moto, piloto, palmeras). Se sustituye por los modelos de la lista de assets sin tocar la lógica: las piezas tienen nombres fijos.
- La luz es en tiempo real; la luz precalculada y las sondas llegan con las escenas de entorno por mundo (Fase 4).
- Las huellas son marcas sobre el suelo; el hundimiento real del terreno está previsto en Fase 4/7.
- Sonido sintetizado provisional; FMOD y las grabaciones llegan en Fase 7.
- Sin repetición ni fantasmas todavía: la instantánea `BikeState` ya existe para grabarlos (Fase 4/6).

## 5. Lo primero al abrirlo (checklist)

1. Configurar el proyecto y jugar en el editor: revisar que la moto, el piloto y el escenario se ven y que no hay errores en la consola.
2. Probar en un iPhone y en un Android de gama media: FPS, temperatura y tacto de los botones.
3. Afinar la sensación en `BikeParams` (suspensión, par, inclinación) y los tiempos de estrellas.
