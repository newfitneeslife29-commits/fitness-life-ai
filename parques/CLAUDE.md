# Parqués — contexto del proyecto

Parqués colombiano moderno (web + PWA instalable), con identidad 100 % colombiana y diseño original
(no copiar logos, nombres ni gráficos de otras apps). Público: familias y jóvenes adultos.
Nombre de la app: **Parqués** (decidido por el usuario).

Vive en `parques/` dentro del monorepo `fitness-life-ai` (no tocar `app/`, `ridge-rush/`, `store/`, `supabase/`).
Rama de trabajo: `claude/parques-colombiano-plan-y4l8bo`.

## Stack
- **Motor**: `packages/engine` (`@parques/engine`) — TypeScript puro, sin React/DOM. Lo usan el cliente y el servidor.
- **Web** (fase 2+): `apps/web` — React + TypeScript + Vite, tablero SVG, Framer Motion, Zustand, Howler.js, PWA.
- **Servidor** (fase 5): `apps/server` — Node.js + Socket.IO, autoridad de las jugadas (corre el mismo motor).
- **Pruebas**: Vitest. Cada regla tiene su archivo en `packages/engine/test/`.
- **Persistencia online** (fases 5–6): Supabase (auth + datos). Monedas/gemas solo virtuales, sin pagos reales.
- Gráficos en SVG/CSS (sin imágenes externas). Fuentes: Baloo 2 (títulos) y Nunito (texto).
- Ícono: `apps/web/public/icon.svg` (mini tablero clásico con corona); `npm run icons -w @parques/web` genera los PNG.

## Comandos (desde `parques/`)
```bash
npm install
npm test            # todas las pruebas (motor, web y servidor)
npm run typecheck
npm run dev         # app web en http://localhost:5173 (?speed=10 acelera animaciones y bots)
npm run dev:server  # servidor online en :3001 (Vite le pasa /socket.io por proxy)
npm start           # compila la web y la sirve junto al servidor en http://localhost:3001
npm run demo        # partida de 4 bots narrada en consola (npm run demo -- <semilla>)
npm run icons -w @parques/web    # regenera los íconos PNG desde public/icon.svg (Playwright)
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

## Arquitectura de la web (`apps/web`)
- `src/game/boardLayout.ts`: geometría del **tablero clásico** (igual a la imagen de referencia del usuario), para 4 y 6 lados.
  Cada brazo tiene 3 columnas de casillas anchas y planas: columna L = offsets 1..5 del dueño (fila 4 = SALIDA junto a su cárcel),
  columna M = SEGURO de la punta (offset 0) + pasillo de 7 + LLEGADA (ficha coronada), columna R = offsets 16..12 del lado anterior
  (fila 4 = SEGURO). Entre dos brazos hay una curva de 6 casillas (offsets 6..11) alrededor de la cárcel (esquina redondeada).
  Cielo con nubes en el centro. Orden de colores: amarillo → rojo → verde → azul (sentido contrario a las agujas del reloj);
  vista por defecto: azul arriba, amarillo izquierda, rojo abajo, verde derecha. Probado en `boardLayout.test.ts`.
- `src/stores/gameStore.ts`: `game` = verdad; `view` = posiciones dibujadas que se animan reproduciendo los eventos.
  En local maneja bots, temporizador de turno (si vence, la IA juega), ventana de soplo (4,5 s) y `TIME_UP` del Modo Rápido.
  En online (`startOnline`/`receive`) solo anima lo que manda el servidor. `finishMatch()` aplica premios al perfil una vez.
- `src/stores/profileStore.ts` (persistido en localStorage): monedas, gemas, XP/nivel, estadísticas, logros, objetos de la
  tienda y equipados, recompensa diaria + ruleta, misiones diarias/semanales, amigos. `settingsStore.ts`: sonido, música,
  vibración, idioma (es/en), tema claro/oscuro, reglas de la casa por defecto, URL del servidor.
- `src/meta/`: lógica pura y probada (`meta.test.ts`): `economy` (niveles, mesas Barrio/Ciudad/Capital/Leyenda, premios,
  racha diaria, ruleta), `missions`, `achievements`, `catalog` (skins de tablero, dados, fichas, marcos, efectos; algunas de
  temporada), `seasons` (Carnaval 15 ene–15 mar, Feria de las Flores 15 jul–15 sep, Navidad 1 nov–10 ene).
- `src/audio/`: efectos y música tropical **sintetizados** con OfflineAudioContext → WAV → Howler.js (sin archivos de audio).
- `src/lib/online.ts`: cliente Socket.IO (una sola conexión reutilizada, reconexión automática con `resume`).
- Pantallas en `src/screens`: Splash, Lobby, Tables (mesas con apuesta), Setup (práctica/local/parejas/rápido), Game, Victory,
  Profile, Shop, Events (misiones + temporada), Ranking, Settings, Friends, Online (rápida y mesa privada), Tournament.
  Navegación en `stores/appStore.ts`; efectos globales (monedas volando, avisos) en `stores/fxStore.ts` + `components/Overlays`.
- Estilo en `styles/global.css`, `screens.css` y `ui.css` (fondo animado, botones 3D con brillo, vidrio, modo claro).
- Solo en desarrollo: `window.__parques` expone los stores para depurar.

## Servidor online (`apps/server`)
- `src/room.ts`: una mesa. **Autoridad**: tira los dados con su semilla (los clientes reciben `rng: 0`), ignora dados del
  cliente, valida turno y tipo de acción (`ROLL`/`MOVE`/`SOPLAR`; nunca `DISMISS_SOPLO`/`TIME_UP`), mueve bots, temporizador
  de turno (20 s → la IA juega), ventana de soplo, desconexión con 30 s de gracia y luego la IA lo reemplaza; abandono = IA.
- `src/server.ts`: Socket.IO + emparejamiento (4 por mesa o se completa con bots a los 10 s), mesas privadas con código de
  5 letras (el anfitrión empieza; sillas vacías = bots), reconexión (`resume`), chat, ranking y torneo.
  También sirve `apps/web/dist` para jugar desde un solo puerto.
- `src/store.ts`: persistencia en JSON (`apps/server/data/db.json`, ignorado por git): trofeos (rating), victorias,
  torneo semanal por semana ISO (1º 10 pts, 2º 6, 3º 3, 4º 1) y premios top 3 reclamables la semana siguiente.
  Se puede cambiar por Supabase implementando la misma clase.
- Protocolo compartido en `packages/engine/src/net.ts`. Pruebas: `room.test.ts`, `store.test.ts`, `server.test.ts` (Socket.IO real).

## Reglas implementadas
1. 4 fichas por jugador (2 en Modo Rápido), todas empiezan en la cárcel. Colores en orden de juego: amarillo, rojo, verde, azul (+ naranja y morado en 6).
2. Dos dados; cada dado mueve una ficha distinta o la misma; también se puede mover la **suma** con una ficha (solo captura en la casilla final).
3. Salir de la cárcel: con **par**. Sin fichas en juego hay `jailAttempts` tiros (3 por defecto).
   - **Doble 1 o doble 6** (`allOutDoubles`): pueden salir **todas**.
   - **Cualquier otro par**: salen **1 o 2** (`pairExitMax`).
   - Si sale **solo 1**, se gasta un dado y el otro se juega normal (p. ej. doble 2: sale una y se mueven 2).
   - Jugada `{ type: 'exit', count }`: el jugador elige cuántas sacar. El par da turno extra como siempre.
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

Reglas de la casa (`HouseRules`): `soplar`, `triplePairPenalty`, `jailAttempts` (1–3), `allOutDoubles`/`pairExitMax`, `teams`, `piecesPerPlayer`.

## Convenciones
- Código e identificadores en inglés; textos de UI, comentarios de reglas y commits en español.
- Nada de lógica de reglas en componentes React: todo pasa por el motor.
- Toda regla nueva o cambio de regla lleva su prueba en `packages/engine/test/<regla>.test.ts`.
- Pruebas con dados forzados (`ROLL` con `dice`) y estados armados con `setup()` de `test/helpers.ts`.
- Antes de cada commit: `npm run typecheck && npm test`.
- Rendimiento: pensar en celulares de gama media (evitar re-renders masivos, animaciones con transform/opacity).

## Fases
1. ✅ Motor de reglas + pruebas unitarias + IA + simulaciones.
2. ✅ Tablero SVG (4 y 6), dados, fichas, animaciones; partida local, vs IA, parejas y Rápido; victoria; PWA básica.
3. ✅ Carga animada, lobby, perfil, ajustes, reglas de la casa, sonidos y música, modo claro/oscuro, guardado local.
4. ✅ Monedas y gemas, mesas con apuesta, tienda de skins, misiones, recompensa diaria (racha 7 días + ruleta), logros, niveles/XP.
5. ✅ Online: Node + Socket.IO, partida rápida, mesas privadas, reconexión, la IA reemplaza a quien abandona.
6. ✅ Torneo semanal con tabla, ranking (global, país, amigos) y temporadas con skins.

## Pendiente / ideas
- Cuentas en la nube (Supabase) para no depender del dispositivo; hoy el perfil vive en localStorage y el servidor usa JSON.
- Traducción al inglés completa (hoy: menús principales). Las frases del chat quedan en colombiano a propósito.
- Online solo en tablero de 4 (6 jugadores es local/IA).
