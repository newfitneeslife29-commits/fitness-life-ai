# Fase 8 · App Store y Google Play: ficha y configuración

## 1. Datos de la app

| Campo | Valor |
| --- | --- |
| Nombre | Ridge Rush: Pro Moto |
| Subtítulo (30 caracteres) | Motocross extremo en 3D |
| Subtitle (EN) | Extreme 3D motocross trials |
| ID de paquete | `com.ridgerush.promoto` (iOS y Android) |
| Categoría | Juegos → Carreras (secundaria: Deportes) |
| Clasificación por edad | 9+ (violencia de dibujos animados leve: caídas sin sangre) |
| Precio | Gratis, con compras dentro de la app |
| Privacidad | No se recogen datos vinculados a la persona; analítica agregada solo con consentimiento |

## 2. Descripción (ES)

**Domina la física. Vuela sobre el terreno.**

Ridge Rush: Pro Moto es motocross de trial con física realista: suspensión que trabaja, neumáticos que agarran o patinan según el terreno y un piloto que se inclina contigo y absorbe cada aterrizaje.

• 7 mundos y 160 niveles: costa tropical, cañones del desierto, selva con ruinas, montaña nevada, ciudad de neón bajo la lluvia, volcán industrial y estadio de supercross.
• Arena, barro, nieve, hielo, madera y metal: cada superficie se conduce distinto.
• Volteretas, caballitos y aterrizajes perfectos que te dan tiempo extra.
• Puentes que se derrumban, fosos de lava, tormentas de arena y noches con faro.
• 15 motos con mejoras de motor, llantas, suspensión, frenos y nitro.
• Contrarreloj contra tu propio fantasma, modo Infinito y recompensas diarias.
• Clasificaciones y logros de Game Center.
• Controles pensados para el móvil, vibración háptica y 120 FPS en pantallas ProMotion.

Sin cajas de botín: siempre sabes lo que compras. Los anuncios son opcionales y nunca interrumpen una carrera.

## 3. Description (EN)

**Master the physics. Fly over the terrain.**

Ridge Rush: Pro Moto is trials motocross with real physics: working suspension, tires that grip or slide depending on the ground, and a rider who leans with you and absorbs every landing.

• 7 worlds and 160 levels: tropical coast, desert canyons, jungle ruins, snowy peaks, rainy neon city, volcano forge and a supercross stadium.
• Sand, mud, snow, ice, wood and metal: every surface rides differently.
• Flips, wheelies and perfect landings that earn you time.
• Collapsing bridges, lava pits, sandstorms and headlight-lit nights.
• 15 bikes with engine, tire, suspension, brake and nitro upgrades.
• Time trial against your own ghost, endless mode and daily rewards.
• Game Center leaderboards and achievements.
• Touch controls built for phones, rich haptics and 120 FPS on ProMotion displays.

No loot boxes: you always know what you buy. Ads are optional and never interrupt a race.

## 4. Palabras clave (100 caracteres)

- ES: `moto,motocross,trial,carreras,acrobacias,física,saltos,offroad,enduro,bici,supercross,extremo`
- EN: `motocross,bike,trials,racing,stunt,physics,dirt,offroad,enduro,supercross,extreme,moto`

## 5. Compras dentro de la app (App Store Connect → Monetización)

Requisito previo: acuerdo de **apps de pago** firmado (Negocio → Acuerdos) y datos bancarios y fiscales.

| ID del producto | Tipo | Nombre | Contenido | Precio sugerido |
| --- | --- | --- | --- | --- |
| `com.ridgerush.promoto.gems80` | Consumible | Bolsa de gemas | 80 gemas | 0,99 € |
| `com.ridgerush.promoto.gems500` | Consumible | Cofre de gemas | 500 gemas | 4,99 € |
| `com.ridgerush.promoto.gems1200` | Consumible | Bóveda de gemas | 1.200 gemas | 9,99 € |
| `com.ridgerush.promoto.starter` | Consumible | Pack de inicio | 300 gemas + 5.000 monedas | 2,99 € |
| `com.ridgerush.promoto.noads` | No consumible | Sin anuncios | Quita los anuncios | 3,99 € |
| `com.ridgerush.promoto.season1` | No consumible | Pase premium T1 | Línea premium del pase de la temporada 1 | 4,99 € |

Cada producto necesita una captura de revisión (la tienda del juego) y una nota para el revisor: "Se compra desde Menú → Tienda".

## 6. Game Center (App Store Connect → Servicios → Game Center)

**Clasificaciones**

| ID | Tipo | Orden | Formato |
| --- | --- | --- | --- |
| `rr_total_stars` | Clásica, la mejor puntuación | Mayor es mejor | Entero |
| `rr_final_coast` | Clásica | Menor es mejor | Tiempo (centésimas de segundo) |
| `rr_final_desert` | Clásica | Menor es mejor | Tiempo (centésimas) |
| `rr_final_jungle` | Clásica | Menor es mejor | Tiempo (centésimas) |
| `rr_final_snow` | Clásica | Menor es mejor | Tiempo (centésimas) |
| `rr_final_city` | Clásica | Menor es mejor | Tiempo (centésimas) |
| `rr_final_volcano` | Clásica | Menor es mejor | Tiempo (centésimas) |
| `rr_final_stadium` | Clásica | Menor es mejor | Tiempo (centésimas) |
| `rr_freestyle` | Clásica | Mayor es mejor | Entero (puntos) |

**Logros** (100 puntos en total recomendados)

| ID | Nombre | Cómo se consigue | Puntos |
| --- | --- | --- | --- |
| `rr_first_finish` | Primera meta | Terminar un nivel | 5 |
| `rr_first_flip` | Por los aires | Hacer una voltereta | 5 |
| `rr_stars_50` | Coleccionista | 50 estrellas | 10 |
| `rr_stars_150` | Veterano | 150 estrellas | 15 |
| `rr_stars_300` | Leyenda | 300 estrellas | 20 |
| `rr_world_coast` | Rey de la costa | Terminar el final de Costa Coral | 5 |
| `rr_world_desert` | Señor del cañón | Final del Cañón Ceniza | 5 |
| `rr_world_jungle` | Explorador | Final de Selva Verdor | 5 |
| `rr_world_snow` | Cumbre | Final de Pico Glaciar | 5 |
| `rr_world_city` | Noche de neón | Final de Neón Bay | 5 |
| `rr_world_volcano` | Forjado en lava | Final de Forja Volcán | 10 |
| `rr_world_stadium` | Campeón del estadio | Final del Thunderdome | 10 |
| `rr_supercross_win` | Primero en la arena | Ganar una carrera de Supercross | 5 |
| `rr_first_ko` | Fuera de combate | Derribar a un rival con el K.O. | 5 |

## 7. Capturas y vídeo

- iPhone 6,9" (1320 × 2868 en horizontal: 2868 × 1320) y 6,5" (2688 × 1242): 5–10 capturas por idioma.
- Propuesta de capturas: 1) salto al atardecer en Costa Coral, 2) voltereta con cámara lenta, 3) ciudad de neón con lluvia, 4) volcán y lava, 5) garaje con las motos, 6) mapa de mundos.
- Vídeo de vista previa: 15–30 s grabado en el dispositivo, sin texto superpuesto que prometa cosas que no están en el juego.
- Las capturas se pueden hacer desde la build de TestFlight (botón lateral + volumen) y recortar a la medida.

## 8. Google Play

- Ficha con los mismos textos; icono 512 × 512; gráfico destacado 1024 × 500.
- Formulario de **Seguridad de los datos**: sin datos recogidos (salvo analítica opcional).
- Clasificación de contenido IARC: cuestionario de juego de carreras sin violencia realista.
- Productos de Google Play Billing con los mismos ids.
- Ver `05-android.md` y el workflow `ridge-rush-android.yml`.
