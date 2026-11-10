# Ridge Rush: Pro Moto

Juego de motocross realista en 2.5D para iPhone, en vertical (9:16). Proyecto independiente de la app Fitness Life.

## Estado

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | [Documento de diseño (GDD)](docs/01-GDD.md) y [guía de estilo visual](docs/02-estilo-visual.md) | ✅ Entregado, pendiente de aprobación |
| 2 | [Motor, arquitectura y estructura del proyecto](docs/03-motor-y-arquitectura.md) y [lista de assets](docs/04-lista-assets.md) | ✅ Entregado, pendiente de aprobación |
| 3 | Prototipo jugable: moto con físicas, controles y 1 nivel completo | ⏳ Espera confirmación |
| 4 | Mundos, niveles, clima y ciclo día/noche | — |
| 5 | Tienda, garaje 3D, monedas y guardado | — |
| 6 | Online: Game Center, clasificaciones, fantasmas y multijugador | — |
| 7 | Pulido visual, audio y optimización por modelo de iPhone | — |
| 8 | Preparación para la App Store | — |

## Decisiones clave

- **Motor**: Unity 6 LTS + URP con Metal. Lumen y Nanite de Unreal no funcionan en el renderizador móvil de iOS, y Unity da más FPS por vatio, una app más pequeña y los plugins oficiales de Apple (Game Center, Core Haptics).
- **Física de la moto propia** en C# a 240 Hz: suspensión independiente, neumáticos por superficie, transferencia de peso. Así se controla la sensación y el servidor puede volver a simular las carreras para validar los tiempos.
- **Online sin colisiones entre motos**: cada jugador simula su propia moto y los rivales se interpolan, así la latencia del móvil no afecta.
- **Sin pay-to-win online**: clases con estadísticas igualadas. Anuncios solo recompensados, nunca durante una carrera.
