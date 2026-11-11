# Ridge Rush: Pro Moto

Juego de motocross realista en 2.5D para **iPhone y Android**, en vertical (9:16). Proyecto independiente de la app Fitness Life.

## Estado

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | [Documento de diseño (GDD)](docs/01-GDD.md) y [guía de estilo visual](docs/02-estilo-visual.md) | ✅ Aprobado |
| 2 | [Motor, arquitectura y estructura](docs/03-motor-y-arquitectura.md), [lista de assets](docs/04-lista-assets.md) y [versión Android](docs/05-android.md) | ✅ Aprobado |
| 3 | [Prototipo jugable](docs/06-prototipo.md): moto con físicas, controles, piloto con IK/ragdoll y el nivel 1 de Costa Coral con iluminación y post-procesado | 🧪 Código entregado; falta probarlo en Unity y en móviles |
| 4 | Mundos, niveles, clima y ciclo día/noche | ⏳ Espera confirmación |
| 5 | Tienda, garaje 3D, monedas y guardado | — |
| 6 | Online: Game Center / Play Games, clasificaciones, fantasmas y multijugador cruzado | — |
| 7 | Pulido visual, audio y optimización por modelo | — |
| 8 | Preparación para App Store y Google Play | — |

## Carpetas

| Carpeta | Contenido |
| --- | --- |
| `docs/` | Diseño y decisiones técnicas |
| `RidgeRush/` | Proyecto de Unity 6 (abrir con Unity Hub). Instrucciones en [docs/06-prototipo.md](docs/06-prototipo.md) |
| `RidgeRush/Assets/_Project/Code/Simulation/` | Física de la moto, pista, trucos y reglas en C# puro (sin Unity): la misma lógica servirá para validar tiempos en el servidor |
| `RidgeRush/Assets/_Project/Levels/` | Niveles en JSON |
| `Tools/SimTests/` | Pruebas automáticas de la física y de los niveles (`dotnet run -c Release`) |

## Decisiones clave

- **Motor**: Unity 6 LTS + URP, con Metal en iOS y Vulkan en Android, desde un único proyecto.
- **Física de la moto propia** en C# a 240 Hz, determinista y probada sin Unity.
- **Mismo progreso en iPhone y Android** con cuenta propia; online con juego cruzado y sin colisiones entre motos.
- **Sin pay-to-win online**: clases con estadísticas igualadas. Anuncios solo recompensados, nunca durante una carrera.
