# Parqués Bacano — contexto del proyecto

Parqués colombiano moderno (web + PWA instalable), con identidad 100 % colombiana y diseño original
(no copiar logos, nombres ni gráficos de otras apps). Público: familias y jóvenes adultos.
Nombres alternativos considerados: Parqués Chévere, Parqués Berraco, Parqués de la Cuadra.

Vive en `parques/` dentro del monorepo `fitness-life-ai` (no tocar `app/`, `ridge-rush/`, `store/`, `supabase/`).
Rama de trabajo: `claude/parques-colombiano-plan-y4l8bo`.

## Stack
- **Motor**: `packages/engine` (`@parques/engine`) — TypeScript puro, sin React/DOM. Lo usan el cliente y el servidor.
- **Web** (fase 2+): `apps/web` — React + TypeScript + Vite, tablero SVG, Framer Motion, Zustand, Howler.js, PWA.
- **Servidor** (fase 5): `apps/server` — Node.js + Socket.IO, autoridad de las jugadas (corre el mismo motor).
- **Pruebas**: Vitest. Cada regla tiene su archivo en `packages/engine/test/`.
- **Persistencia online** (fases 5–6): Supabase (auth + datos). Monedas/gemas solo virtuales, sin pagos reales.
- Gráficos en SVG/CSS (sin imágenes externas). Fuentes: Baloo 2 (títulos) y Nunito (texto).

## Comandos (desde `parques/`)
```bash
npm install
npm test            # todas las pruebas
npm run typecheck
npm run demo        # partida de 4 bots narrada en consola (npm run demo -- <semilla>)
npm run bench -w @parques/engine   # Experto vs Normal, velocidad de la IA
```

## Arquitectura del motor
- `applyAction(state, action) → { ok, state, events }` es **puro** (clona y nunca muta la entrada).
- Acciones: `ROLL` (dados opcionales forzados para pruebas/servidor), `MOVE` (`exit` | `step` con un dado | `sum` con los dos),
  `SOPLAR`, `DISMISS_SOPLO`, `TIME_UP`.
- `events` describe lo ocurrido en orden (`PIECE_MOVED` con `path`, `CAPTURED`, `CROWNED`, `TRIPLE_PAIR`,
  `SOPLO_AVAILABLE`, `EXTRA_TURN`, `TURN_CHANGED`, `GAME_OVER`…). La UI anima a partir de ellos; nunca recalcula reglas.
- `getLegalMoves(state)` es la única fuente de verdad (UI resalta, IA elige, servidor valida).
- Dados con RNG con semilla (`mulberry32`) guardado en `state.rng`. En online el servidor **no** envía `rng` a los clientes.
- Estado 100 % serializable a JSON.
- IA (`src/ai`): `easy` (mayormente azar), `normal` (mejor jugada inmediata + ruido), `expert` (mejor combinación de los 2 dados).
  `autoAction(state, level)` sirve también cuando se vence el temporizador de turno.

### Topología (`src/board.ts`)
- 17 casillas por lado: 68 en 4 lados, 102 en 6 lados.
- Por lado: offset 0 = entrada al pasillo (seguro), offset 5 = SALIDA (seguro), offset 12 = seguro.
- Posición de ficha = progreso desde su salida: `-1` cárcel, `0..entry` recorrido común, pasillo de 7 casillas, `home` = cielo.
  4 lados: entry 63, home 71. 6 lados: entry 97, home 105.
- Turnos en orden de lado ascendente. En parejas, compañeros en lados opuestos (`team = side % (sides/2)`).

## Reglas implementadas
1. 4 fichas por jugador (2 en Modo Rápido), todas empiezan en la cárcel. Colores: amarillo, azul, rojo, verde (+ morado, naranja en 6).
2. Dos dados; cada dado mueve una ficha distinta o la misma; también se puede mover la **suma** con una ficha (solo captura en la casilla final).
3. Salir de la cárcel: con **par**. Sin fichas en juego hay `jailAttempts` tiros (3 por defecto). Con un par salen todas
   (o `exitCount` si `exitAll=false`). Salir consume el par y da turno extra. Con fichas en juego, un par permite la jugada `exit`.
4. Par ⇒ turno extra.
5. Tres pares seguidos ⇒ la ficha más adelantada (no coronada, incluye pasillo) va a la cárcel y termina el turno (`triplePairPenalty`).
6. Seguros y salidas: no se captura. Fichas de distintos colores pueden compartir seguro.
7. Captura: caer donde hay rival(es) fuera de seguro ⇒ todos esos rivales a la cárcel. No se captura al compañero.
8. Salida ocupada: al salir de la cárcel se captura a los rivales que estén en la salida propia (aunque sea seguro).
9. Soplar: si en una tirada se pudo capturar y no se capturó a nadie ⇒ `pendingSoplo`. Cualquier rival (no compañero) puede `SOPLAR`
   y esa ficha va a la cárcel. Expira cuando otro jugador tira o con `DISMISS_SOPLO` (el temporizador de ~5 s es de la UI/servidor).
10. Llegada al cielo con número exacto; si un dado no se puede usar se pierde (`DICE_FORFEITED`).
11. Se juega hasta definir todos los puestos. Parejas: gana la pareja que corone sus 8 fichas; quien termina mueve las de su compañero.
12. `TIME_UP` (Modo Rápido): ordena por fichas coronadas y luego por avance.

Reglas de la casa (`HouseRules`): `soplar`, `triplePairPenalty`, `jailAttempts` (1–3), `exitAll`/`exitCount`, `teams`, `piecesPerPlayer`.

## Convenciones
- Código e identificadores en inglés; textos de UI, comentarios de reglas y commits en español.
- Nada de lógica de reglas en componentes React: todo pasa por el motor.
- Toda regla nueva o cambio de regla lleva su prueba en `packages/engine/test/<regla>.test.ts`.
- Pruebas con dados forzados (`ROLL` con `dice`) y estados armados con `setup()` de `test/helpers.ts`.
- Antes de cada commit: `npm run typecheck && npm test`.
- Rendimiento: pensar en celulares de gama media (evitar re-renders masivos, animaciones con transform/opacity).

## Fases
1. ✅ Motor de reglas + pruebas unitarias + IA + simulaciones.
2. Tablero SVG, dados, fichas, animaciones; partida local y vs IA; pantalla de victoria; PWA básica.
3. Lobby, perfil, ajustes, reglas de la casa, sonidos, guardado local.
4. Monedas, tienda, misiones, recompensa diaria (racha 7 días + ruleta), logros, niveles/XP.
5. Online: Node + Socket.IO, mesas privadas, emparejamiento, reconexión, bot que reemplaza al que abandona.
6. Torneos, ranking (global, país, amigos) y temporadas (Feria de las Flores, Carnaval de Barranquilla, Navidad).
