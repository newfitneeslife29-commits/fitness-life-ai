# Fase 1 · Documento de diseño del juego (GDD resumido)

> Versión 0.1 · Estado: **pendiente de aprobación** · Plataforma: iPhone (iOS 17+) · Orientación: vertical 9:16

---

## 1. Identidad

| | |
| --- | --- |
| **Nombre provisional** | **Ridge Rush: Pro Moto** |
| **Alternativas** | 1. **Throttle Ridge** — corto, fácil de recordar y de buscar en la App Store. <br>2. **Dirt Apex: Moto Trials** — "apex" transmite precisión y nivel pro; el subtítulo ayuda al SEO. <br>3. **Gravel & Gravity** — juego de palabras con lo que define al género (terreno + física). |
| **Género** | Trials / stunts de motocross en 2.5D (escenarios 3D, jugabilidad en un plano lateral). |
| **Pilares** | 1) **Peso real**: la moto se siente pesada, la suspensión trabaja, el piloto absorbe los golpes. <br>2) **Una mano, un minuto**: niveles de 45–120 s, reinicio instantáneo (<300 ms), jugable en vertical con los pulgares. <br>3) **Espectáculo**: cada salto puede ser una repetición digna de compartir. |
| **Público** | 13+ (PEGI 7 / ESRB E10+ previsto: choques sin sangre). Jugadores casuales de móvil y fans del motor que buscan dominar un nivel. |
| **Referencias de género (no de arte ni marca)** | Juegos de trials con físicas en vista lateral. Todo el arte, nombres, motos, pilotos y logotipos son originales. |

> **Antes del lanzamiento**: búsqueda de marca registrada (USPTO, EUIPO, App Store) para el nombre elegido y para las marcas de motos inventadas.

---

## 2. Bucle de juego

```
 ┌──────────────── Bucle de 1 minuto ────────────────┐
 │ Elegir nivel → Correr (45–120 s) → Choque? ──sí──► reinicio instantáneo / checkpoint
 │                         │ no
 │                         ▼
 │      Meta: tiempo + trucos → estrellas (1–3) + monedas
 └───────────────────────────────────────────────────┘
 ┌──────────────── Bucle de sesión (10–20 min) ──────┐
 │ Varios niveles → mejorar la moto en el garaje → desbloquear nivel/mundo siguiente
 │ Desafío diario · fantasma de un amigo · repetición para compartir
 └───────────────────────────────────────────────────┘
 ┌──────────────── Bucle meta (semanas) ─────────────┐
 │ Temporada de 6–8 semanas · pase de temporada · torneos semanales · club
 └───────────────────────────────────────────────────┘
```

---

## 3. Controles (vertical, una o dos manos)

```
┌───────────────────────────┐  ← Dynamic Island / Safe Area superior: nada interactivo
│ ⏱ 00:41.27   ★★☆   ⏸     │  HUD superior (tiempo, estrellas objetivo, pausa)
│                           │
│        [ ESCENA 3D ]      │  La moto ocupa el tercio central; la cámara
│                           │  deja ver más terreno por delante que por detrás.
│                           │
│  ◄ inclinar     inclinar ►│  Zona de deslizamiento (balance) — mitad inferior
│ ┌──────┐         ┌──────┐ │
│ │FRENO │  NITRO  │ GAS  │ │  Botones grandes (≥ 88 pt), en la zona del pulgar
│ └──────┘   (⚡)   └──────┘ │
└───────────────────────────┘  ← Home indicator / Safe Area inferior
```

| Acción | Esquema por defecto | Alternativas (Ajustes) |
| --- | --- | --- |
| Acelerar | Botón derecho. El iPhone no mide la presión del dedo, así que el gas sube en rampa de 0 a 100 % en 120 ms al pulsar (no hay saltos bruscos de potencia) | — |
| Frenar / reversa | Botón izquierdo; mantenido parado = reversa lenta | — |
| Equilibrio | Deslizar el pulgar hacia la izquierda/derecha sobre su botón (inclina atrás/adelante) | Botones de inclinación separados · **giroscopio** (inclinar el iPhone) |
| Nitro | Botón central, carga con trucos | Desactivable (modo sencillo) |
| Embrague (avanzado) | Doble toque en el gas = "clutch-dump" (salida más brusca, más wheelie) | Desactivado por defecto |
| Reinicio | Botón en pausa + gesto de dos dedos hacia abajo | — |

**Asistencias** (para accesibilidad y principiantes, activables por separado): estabilizador de aterrizaje, control de tracción, auto-nitro. Los tiempos con asistencias se marcan en las clasificaciones.

**Háptica (Core Haptics)**: patrón continuo del motor modulado por RPM (intensidad) y marcha (nitidez); transitorios para aterrizajes (fuerza ∝ velocidad vertical), choques, cambio de marcha y textura del terreno (grava = transitorios rápidos e irregulares; asfalto = casi liso; metal = nitidez alta). Todo desactivable.

---

## 4. Mecánicas

### 4.1 Física de la moto (sensación objetivo)
- **Suspensión independiente** delantera (horquilla telescópica) y trasera (basculante + amortiguador), con muelle, compresión y rebote ajustables por mejora.
- **Tracción por superficie** (curva de deslizamiento longitudinal por material, ver 4.4).
- **Transferencia de peso**: acelerar descarga la rueda delantera (wheelie); frenar fuerte la carga (stoppie). El piloto desplaza el centro de masas al inclinarse.
- **Derrape y pérdida de agarre**: patinar la rueda trasera en barro o hielo; bloquear la rueda con el freno.
- **Daño visual**: rayones, barro, guardabarros doblado, piezas sueltas. **No afecta al rendimiento** (decisión de diseño: evitar frustración en niveles de 1 minuto).

### 4.2 Piloto
- Animado por **IK** mientras va montado: manos en el manillar, pies en las estriberas, rodillas y codos que flexionan al amortiguar.
- Al superar un umbral de impacto (cabeza contra el suelo, ángulo imposible, golpe lateral fuerte) pasa a **ragdoll activo** (mezcla de físicas y animación, sin "muñeco de trapo" exagerado).

### 4.3 Trucos y puntuación

| Truco | Condición | Recompensa |
| --- | --- | --- |
| Backflip / Frontflip | Rotación completa (≥ 330°) y aterrizar | +1,5 s de bonificación de tiempo, +monedas, carga nitro |
| Wheelie | Rueda delantera en el aire ≥ 1 s (escala por segundo) | Monedas + nitro |
| Stoppie | Rueda trasera en el aire ≥ 0,5 s | Monedas + nitro |
| Salto largo | Tiempo en el aire ≥ 1,5 s | Monedas |
| **Aterrizaje perfecto** | Ambas ruedas tocan con < 8° de diferencia respecto a la pendiente | **Impulso de velocidad** + combo ×1,2 |
| Combo | Encadenar trucos sin tocar el suelo con ambas ruedas por más de 2 s | Multiplicador hasta ×3 |

La **bonificación de tiempo** se resta del tiempo final (el reloj real no se detiene), así las clasificaciones siguen siendo comparables.

### 4.4 Superficies

| Superficie | Agarre | Resistencia | Sonido / partículas | Huellas |
| --- | --- | --- | --- | --- |
| Tierra compacta | 1,00 | Baja | Polvo marrón | Sí |
| Arena | 0,70 | Alta (se hunde) | Nube de arena | Sí, profundas |
| Barro | 0,55 | Muy alta | Salpicaduras, la moto se ensucia | Sí, profundas |
| Nieve | 0,50 | Media | Polvo de nieve | Sí |
| Hielo | 0,15 | Mínima | Crujido, chispas de hielo | No (rayado) |
| Asfalto | 1,10 | Mínima | Humo de goma al derrapar | Marcas de goma |
| Metal | 0,85 (0,45 mojado) | Mínima | Chispas al rozar | No |
| Madera | 0,90 | Baja | Golpes huecos | No |
| Agua (vadeo) | 0,60 | Muy alta, frena | Salpicaduras, estela | — |

### 4.5 Obstáculos y elementos
Rampas de madera y metal · troncos · rocas · contenedores · autos abandonados · **puentes que se derrumban** (activados por peso/tiempo) · plataformas móviles (rieles, grúas) · **barriles explosivos** (impulso + fuego) · agua profunda (motor se apaga si cubre el escape > 1,5 s) · lodo · hielo · **viento** (zonas con fuerza lateral sobre la moto en el aire) · lava (reinicio inmediato).

### 4.6 Objetivos de nivel
- **Estrellas por tiempo**: ★ terminar · ★★ tiempo objetivo · ★★★ tiempo de desarrollador +5 %.
- **Checkpoints**: 2–4 por nivel. Reiniciar desde checkpoint añade +3 s de penalización (solo en Carrera; en Contrarreloj y Online no hay checkpoints).
- **Fallos**: choque = reinicio desde checkpoint en < 300 ms con fundido mínimo.

### 4.7 Repeticiones
Se graba un muestreo de estado (posición, rotación, suspensión, estado del piloto) a 30 Hz e interpolado; ocupa ~40 KB por minuto. Al terminar: repetición automática con **cámaras tipo transmisión** (grúa, cámara fija junto a la pista, teleobjetivo, cámara lenta en trucos). Exportar clip con **ReplayKit** / renderizado del clip y compartir con la hoja de compartir de iOS.

---

## 5. Mundos

6 mundos × 25 niveles = **150 niveles** + estadio bonus. Cada mundo: 22 niveles normales, 2 niveles "desafío" (una mecánica llevada al extremo) y **1 nivel final épico**.

| # | Mundo | Superficies clave | Clima / hora | Obstáculos propios | Color grading | Música | Nivel final |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Costa Coral** — costa tropical | Arena, madera (muelles), agua | Soleado → atardecer dorado | Muelles que crujen, olas que cubren la pista, barcos varados | Cálido, turquesa/naranja | Surf-rock / indie | **Ola gigante**: escapar por el muelle mientras una ola rompe detrás |
| 2 | **Cañón Ceniza** — desierto y cañones | Arena, roca, tierra | Calor (distorsión), **tormenta de arena** | Puentes de cuerda, derrumbes de roca, minas abandonadas | Ocre, alto contraste | Rock desértico / stoner | **Tormenta**: la tormenta avanza; la visibilidad baja y el viento empuja |
| 3 | **Selva Verdor** — selva con ruinas | Barro, piedra, madera, agua | Lluvia tropical, niebla | Ruinas que se desmoronan, troncos flotantes, lianas, ríos | Verde saturado, rayos de luz volumétrica | Percusión tribal + orquesta | **Templo**: persecución por el interior de un templo que se derrumba |
| 4 | **Pico Glaciar** — montaña nevada | Nieve, hielo, roca | Nevada, ventisca, aurora nocturna | Grietas, puentes de hielo, telesillas, **avalanchas** | Azul frío, blancos limpios | Cinematográfica épica | **Avalancha**: bajar la montaña por delante de la avalancha |
| 5 | **Neón Bay** — ciudad nocturna | Asfalto mojado, metal, hormigón | Noche, **lluvia**, charcos con reflejos de neón | Azoteas, grúas, andamios, vagones de metro | Magenta/cian, noche | Synthwave / electrónica | **Persecución en azoteas** contra un dron de policía (no hay daño, solo ritmo) |
| 6 | **Forja Volcán** — industrial y volcán | Metal, roca volcánica, ceniza | Ceniza, cielo rojizo, erupciones | Cintas transportadoras, prensas, **lava**, barriles explosivos, chorros de vapor | Rojo/negro, bloom intenso | Metal industrial | **Erupción**: carrera contra un río de lava que sube |
| ★ | **Arena Thunderdome** — estadio supercross | Tierra compacta, madera | Noche con focos, pirotecnia | Whoops, triples, rhythm sections | Contraste de focos | Rock de estadio + público | Gran final supercross (Modo Supercross) |

**Clima dinámico por nivel** (definido por el diseñador, no aleatorio en Carrera, para que los tiempos sean justos). En el Modo Infinito y en desafíos diarios sí puede ser aleatorio.

**Editor de pistas**: Fase 2 del producto (post-lanzamiento). El formato de nivel ya se diseña como datos (spline + objetos) para que el editor reutilice el mismo cargador.

---

## 6. Modos de juego

| Modo | Descripción | Lanzamiento |
| --- | --- | --- |
| Carrera | 6 mundos × 25 niveles, desbloqueo por estrellas | v1.0 |
| Contrarreloj | Cualquier nivel completado, sin checkpoints, contra fantasmas | v1.0 |
| Desafíos diarios / semanales | Un nivel + condición (p. ej. "solo backflips", "hielo y viento") | v1.0 |
| Infinito | Pista procedural por bloques prediseñados; distancia como puntuación | v1.0 |
| Freestyle | Parque abierto con contador de puntos por trucos (2 min) | v1.0 |
| Supercross | Estadio, carreras de 3 vueltas contra IA o fantasmas | v1.1 |
| Online 1v1 / 4 jugadores | Carreras simultáneas, sin colisión entre motos (ver Fase 6) | v1.1 |
| Torneos y eventos | Semanales, con premios por percentil | v1.1 |
| Temporadas | 6–8 semanas, pase gratis + premium | v1.1 |
| Editor de pistas | Crear, compartir y valorar niveles | v2.0 |

---

## 7. Progresión y economía

- **Monedas** (se ganan jugando): mejoras, motos comunes/raras, cosméticos básicos.
- **Gemas** (premium, también en pequeñas cantidades jugando: logros, pase gratis, primeras 3 estrellas de cada mundo): motos épicas/legendarias, cosméticos premium, acelerar nada (**no hay temporizadores de espera**).
- **Rarezas**: común · rara · épica · legendaria (color + marco).
- **Sin pay-to-win en Online**: las carreras online usan **clases normalizadas** (125 / 250 / 450 / Abierta) con estadísticas igualadas dentro de la clase; las mejoras solo cuentan en Carrera y Contrarreloj offline.
- **Sin cajas de botín** en v1.0. Si se añaden (p. ej. sobres de cosméticos), se muestran las **probabilidades exactas** antes de comprar (norma 3.1.1 de la App Store).
- **Anuncios recompensados opcionales** (x2 monedas al final del nivel, recarga de desafío). **Nunca durante una carrera** y nunca intersticiales tras un choque. "Quitar anuncios" elimina todos los no recompensados y da la recompensa sin ver el anuncio.
- **StoreKit 2**: paquetes de gemas, quitar anuncios, pase de temporada, ofertas limitadas.

### Motos (15 en lanzamiento, marcas inventadas)

| # | Moto | Marca ficticia | Clase | Rareza |
| --- | --- | --- | --- | --- |
| 1 | Sprout 125 | Haldane Moto | Motocross 125cc | Común (inicial) |
| 2 | Raptor 250F | Haldane Moto | Motocross 250cc | Común |
| 3 | Brute 450R | Vextor | Motocross 450cc | Rara |
| 4 | Trailhound 300 | Ferrum Works | Enduro | Rara |
| 5 | Goat T-280 | Kestrel Bikes | Trial | Rara |
| 6 | Asfalto SM 450 | Vextor | Supermoto | Rara |
| 7 | Stratos 1000 | Aurelion | Deportiva | Épica |
| 8 | Ironhide 1200 | Ferrum Works | Chopper | Épica |
| 9 | Volt-X | Solace EV | Eléctrica futurista | Épica |
| 10 | Mule 4x4 | Kestrel Bikes | Quad | Rara |
| 11 | Frostbite 600 | Nordvik | Moto de nieve | Épica |
| 12 | Dune Viper 250 | Haldane Moto | Rally/desierto | Rara |
| 13 | Shadow 450 | Vextor | Motocross nocturna (faro LED) | Épica |
| 14 | **Carbon Ghost 450** | Aurelion | Edición carbono | Legendaria |
| 15 | **Aurum 450** | Haldane Moto | Edición legendaria dorada | Legendaria |

Estadísticas (1–10): **velocidad, aceleración, agarre, suspensión, peso**. Mejoras por moto (5 niveles cada una): motor, escape, llantas por terreno (barro / arena / nieve-hielo / asfalto), suspensión, frenos, nitro.

### Pilotos (originales)
**Mara "Grit" Okafor**, **Teo Valdés**, **Kenji "Sora" Hayashi**, **Lina Brandt**, **Rocco "Torque" Ferraz**, **Ava Thorne** (cada uno con 2 animaciones de celebración propias; el aspecto es 100 % personalizable).

---

## 8. Online (resumen; diseño detallado en Fase 6)
Game Center + Sign in with Apple · clasificaciones global/país/amigos · fantasmas reales · 1v1 y hasta 4 jugadores **sin colisiones entre motos** (cada uno en su "carril fantasma": hace viable la sincronización con latencia móvil) · torneos · clubs · perfil · logros · guardado en CloudKit · validación de tiempos en servidor.

---

## 9. Audio (resumen)
Motor por síntesis granular a partir de grabaciones propias por tipo de moto (RPM × carga × marcha) · capas de terreno · audio espacial (AirPods con seguimiento de cabeza en menús/garaje) · música original por mundo · ambiente (público, viento, lluvia, olas).

---

## 10. Extras
Tutorial interactivo (3 niveles guiados, 4 min) · recompensa diaria (7 días, sin penalizar si se rompe la racha más allá de reiniciar) · logros de Game Center (60) · ReplayKit · español e inglés (todo el texto externalizado) · accesibilidad (daltónico: 3 filtros + iconos además de colores, Dynamic Type en menús, desactivar vibración/sacudida de cámara/motion blur/destellos, reducir movimiento respeta la opción de iOS) · analítica agregada sin IDFA salvo consentimiento ATT · modo ahorro de batería (30 FPS, Bajo) y control térmico automático.

---

## 11. Métricas de éxito (objetivos para soft-launch)
| Métrica | Objetivo |
| --- | --- |
| Retención D1 / D7 / D30 | 40 % / 18 % / 7 % |
| Tiempo hasta el primer salto | < 15 s desde abrir la app |
| Tiempo de carga de nivel | < 2 s (iPhone 12) |
| Reinicio | < 300 ms |
| Crash-free sessions | > 99,8 % |
| Tamaño de descarga inicial | < 200 MB (resto bajo demanda) |

---

## 12. Riesgos principales y mitigación
| Riesgo | Mitigación |
| --- | --- |
| La física "realista" se siente lenta o frustrante | Prototipo de física primero (Fase 3) con pruebas de juego semanales; parámetros expuestos en ScriptableObjects para afinar sin compilar |
| 150 niveles = mucho contenido | Kit modular por mundo + herramienta de pistas por splines; los niveles se construyen en horas, no días |
| Calor y batería en gráficos Ultra | Presupuestos por nivel de calidad, escalado dinámico de resolución, monitor térmico de iOS (`ProcessInfo.thermalState`) |
| Sincronización online con latencia móvil | Sin colisiones entre jugadores; cada cliente simula su moto; los rivales se interpolan |
| Trampas en clasificaciones | Validación en servidor (Fase 6): plausibilidad + repetición con tolerancias |
| Parecido con marcas reales | Diseño propio de motos (siluetas mezcladas, sin logotipos reales), búsqueda de marcas antes de lanzar |
