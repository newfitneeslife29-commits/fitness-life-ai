# Fase 1 · Guía de estilo visual (referencia)

## 1. Dirección de arte en una frase
**"Transmisión deportiva en la palma de la mano"**: realismo fotográfico en materiales y luz, encuadrado como una retransmisión de motocross (teleobjetivo, profundidad de campo, polvo a contraluz), pero con siluetas legibles en una pantalla de 6".

## 2. Reglas de legibilidad (por encima del realismo)
1. **La moto y el piloto siempre se leen**: contorno por iluminación de borde (rim light) del color del mundo; nunca se pierden contra el fondo.
2. **Tres planos de profundidad** con contraste decreciente: plano de juego (contraste completo) · plano medio (−25 % contraste, algo de niebla) · fondo (atmósfera densa, casi silueta).
3. **La superficie de la pista se distingue por color y textura** antes que por detalle: el jugador debe saber "hielo" o "barro" sin leer nada.
4. **Peligros en rojo/naranja cálido** (lava, barriles, bordes); ayudas en cian (rampas de nitro, checkpoints). El modo daltónico añade patrones e iconos.
5. **El HUD ocupa < 12 % de la pantalla** y se atenúa durante saltos largos.

## 3. Composición vertical (9:16)

```
 ┌─────────────────┐
 │  cielo / fondo  │ 25 % — atmósfera, eventos (ola, avalancha, dron)
 │─────────────────│
 │   plano medio   │ 20 % — parallax, estructuras, público
 │─────────────────│
 │  ◉ MOTO ◉  ───► │ 30 % — plano de juego; la moto en el 40 % izquierdo
 │  terreno ───►   │        para ver lo que viene
 │─────────────────│
 │  pista cercana  │ 25 % — primer plano desenfocado + controles encima
 └─────────────────┘
```

- Cámara con FOV vertical de 40–55° (más ancho a más velocidad), ligeramente **por debajo** de la moto en saltos para dramatismo.
- En vertical se ve poco horizonte: la cámara **adelanta su encuadre** según la velocidad (look-ahead) y hace zoom-out en saltos grandes para mostrar el aterrizaje.

## 4. Materiales PBR (biblioteca maestra)

| Material | Albedo | Rugosidad | Metalicidad | Notas |
| --- | --- | --- | --- | --- |
| Plástico de carenado | Color de pintura, sin saturar al 100 % | 0,35 brillante / 0,6 mate | 0 | Capa de barro y rayones por máscara |
| Metal pintado (chasis) | Color | 0,4 | 1 bajo pintura (desconchones muestran metal) | |
| Aluminio cepillado | Gris claro | 0,3 + anisotropía simulada | 1 | Basculante, manillar |
| Cromo | Blanco casi puro | 0,05–0,1 | 1 | Escapes de chopper, llantas premium |
| Fibra de carbono | Tejido 2×2 | 0,25 capa clara sobre 0,5 tejido | 0 | Clearcoat simulado en shader |
| Goma (neumático) | Casi negro 0,04 | 0,85 | 0 | Taco en normal map; polvo en los costados |
| Cuero / textil del traje | Variable | 0,7–0,9 | 0 | Micro-detalle de costuras |
| Barro (húmedo → seco) | Marrón oscuro → claro | 0,2 → 0,9 | 0 | Parámetro de humedad global por clima |
| Hielo | Azul muy claro | 0,05 | 0 | Refracción falsa + sub-superficie simulada |
| Agua / charcos | — | 0,0–0,1 | 0 | Reflejos SSR/sonda + ondas de lluvia |

Toda la biblioteca usa **un shader maestro de vehículo** y **uno de terreno** (capas por máscara), para limitar variantes de shader y tiempos de compilación.

## 5. Iluminación y post-procesado por mundo

| Mundo | Hora "héroe" | Luz principal | Grading | Post especial |
| --- | --- | --- | --- | --- |
| Costa Coral | Atardecer | Sol bajo, naranja, contraluz | Cálido, cian en sombras | Destellos en el agua, bloom suave |
| Cañón Ceniza | Mediodía → tormenta | Sol cenital duro | Ocre, alto contraste | Distorsión por calor, niebla de arena |
| Selva Verdor | Mañana con niebla | Rayos entre el follaje | Verde, sombras profundas | Luz volumétrica (god rays) |
| Pico Glaciar | Día nublado / noche con aurora | Cielo difuso / luna | Azul frío | Brillo de nieve, aurora animada |
| Neón Bay | Noche lluviosa | Neones + faro de la moto | Magenta/cian | Reflejos en charcos, aberración cromática sutil |
| Forja Volcán | Noche roja | Lava (emisiva) + fuego | Rojo/negro | Bloom intenso, chispas, ceniza |
| Thunderdome | Noche | Focos de estadio | Neutro, contraste alto | Haces de focos, pirotecnia |

**Pila de post-procesado** (se reduce por calidad, ver Fase 2): bloom · color grading LUT por mundo · viñeta · motion blur por objeto/cámara · profundidad de campo (solo en repeticiones, garaje y cámara lenta en Medio/Bajo) · aberración cromática (≤ 0,1, desactivable) · grano de película fino (Ultra).

## 6. Paleta y UI

| Token | Uso | Color |
| --- | --- | --- |
| `rr-asphalt` | Fondos de menú | `#121417` |
| `rr-steel` | Paneles | `#22262C` |
| `rr-bone` | Texto principal | `#F2EFE9` |
| `rr-ember` | Acción principal, gas | `#FF5A1F` |
| `rr-volt` | Nitro, ayudas | `#2FE3FF` |
| `rr-gold` | Legendaria, 3 estrellas | `#F5B82E` |
| Rarezas | común / rara / épica / legendaria | `#9AA3AD` / `#3D8BFF` / `#B45CFF` / `#F5B82E` |

- Tipografía: sans condensada deportiva para titulares (con licencia comercial, p. ej. de Google Fonts con OFL) + **SF Pro** del sistema para texto (Dynamic Type).
- UI con aspecto de "placa técnica": esquinas en chaflán de 8 pt, texturas de fibra muy sutiles, microanimaciones de 150–250 ms.

## 7. Logotipo (concepto)
"RIDGE RUSH" en cursiva condensada, con la cresta de una montaña formada por el perfil de una rampa y la huella de un neumático de tacos atravesando la "R". Variante de icono: la "R" con la huella sobre fondo `rr-ember` → `rr-asphalt` en degradado.

## 8. Moodboard (qué buscar al hacer referencias)
Se recomienda que el equipo de arte reúna fotos **propias o con licencia** (no capturas de otros juegos) de:
- Fotografía de motocross con teleobjetivo a contraluz al atardecer (polvo iluminado).
- Pistas de enduro con barro y huellas profundas.
- Ciudades con lluvia nocturna y neones (reflejos en asfalto).
- Fundiciones y acerías (chispas, metal incandescente).
- Estadios de supercross con focos y humo.

## 9. Lo que NO hacemos
- Sangre, heridas o gore (los choques son espectaculares, no violentos).
- Logotipos, colores corporativos o siluetas reconocibles de fabricantes reales.
- Saturación "de dibujo animado": los colores vivos vienen de la luz (neón, lava, atardecer), no de la pintura del mundo.
