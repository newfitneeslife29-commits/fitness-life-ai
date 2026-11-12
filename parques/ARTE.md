# Arte de Parqués Colombia — guía de estilo y lista de piezas

**Estilo elegido:** cartoon 3D brillante (volumen, brillos, colores vivos y saturados, materiales de plástico/cerámica pulidos,
luz de estudio suave), con identidad 100 % colombiana. Todo el arte es propio, generado con Higgsfield (modelo `gpt_image_2_6`).
No se copian personajes, logos ni gráficos de otros juegos.

## Mascota: Dadito
Dado blanco con esquinas redondas, ojos grandes, sonrisa, puntos rojos, **sombrero vueltiao**, bufanda tricolor y tenis rojos.
Archivo: `apps/web/public/art/mascota.webp` (componente `components/Mascot.tsx`).
Variantes pendientes: Dadito celebrando (ganador), triste (perder), con cofre (tienda), dormido (sin conexión), con trofeo (torneos).

## Paleta
Amarillo `#FFC928`, rojo `#E8112D`, verde `#1FAA4B`, azul `#1E6BFF`, morado de fondo `#2A1660 → #120C2E`, dorado `#FFCF3F`.

## Fórmula de los prompts (para que todo salga igual)
`[Sujeto], glossy cartoon 3D render, soft studio lighting, vibrant saturated colors, smooth plastic and ceramic materials,
playful casual mobile game style, [encuadre], no text.`
Para piezas sueltas: `transparent background` (PNG con transparencia).

## Tableros (importante)
La IA no dibuja exacto el recorrido del parqués colombiano, así que el **recorrido lo dibuja la app** (SVG, casillas, números,
seguros) y la imagen es el **escenario**: se pide "board frame and scenery only, empty center cross area" y la app pone las
casillas encima. Así cada tablero es un escenario distinto y el juego sigue funcionando igual.
Escenarios: Cartagena (muestra lista), Caribe/San Andrés, Eje Cafetero, Tatacoa, Carnaval de Barranquilla, Llanos, Guatapé,
Amazonas, Cali salsera, Feria de las Flores, Navidad (alumbrados), Ciudad Perdida.

## Lista de piezas y tamaños
| Pieza | Cantidad | Tamaño de entrega | Formato |
|---|---|---|---|
| Escenarios de tablero | 12 | 1024×1024 | WebP |
| Fichas (4 colores por juego) | 15 juegos | 256×256 c/u | WebP transparente |
| Dados (caras) | 15 skins | 256×256 | WebP transparente |
| Avatares (personajes colombianos) | 20 | 256×256 | WebP |
| Marcos de avatar | 10 | 256×256 | WebP transparente |
| Íconos (moneda, gema, cofre, trofeo, regalo, ruleta) | 12 | 128×128 | WebP transparente |
| Fondos de pantalla (inicio, tienda, torneo) | 4 | 1080×1920 | WebP |
| Dadito (variantes) | 5 | 512×512 | WebP transparente |
| Ícono de la app y capturas de tienda | 1 + 8 | 1024 / 1290×2796 | PNG |

Avatares propuestos: silletero, palenquera, llanero, cafetero (con mula), marimonda, mono tití, cóndor, guacamaya, rana dorada,
oso de anteojos, chiva, abuela costeña, futbolista, cumbiambera, vallenatero con acordeón, pescador del Pacífico, wayuu (mochila),
tejo, arepa con sombrero, tinto con ojos.

**Costo aproximado:** 0,25 créditos por imagen (calidad normal); paquete completo ≈ 90 imágenes ≈ 25 créditos (más si calidad alta).
