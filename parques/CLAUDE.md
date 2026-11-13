# Parqués — contexto del proyecto

Parqués colombiano moderno (web + PWA instalable), con identidad 100 % colombiana y diseño original
(no copiar logos, nombres ni gráficos de otras apps). Público: familias y jóvenes adultos.
Nombre de la app: **Parqués Colombia** (decidido por el usuario; en el ícono y la tienda).

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
npm run dev:server  # servidor online en :3001 (OBLIGATORIO: el juego es online; Vite le pasa /socket.io y /api)
npm start           # compila la web y la sirve junto al servidor en http://localhost:3001
npm run demo        # partida de 4 bots narrada en consola (npm run demo -- <semilla>)
npm run icons -w @parques/web    # regenera los íconos PNG desde public/icon.svg (Playwright)
```

## Arquitectura del motor
- `applyAction(state, action) → { ok, state, events }` es **puro** (clona y nunca muta la entrada).
- Acciones: `ROLL` (dados opcionales forzados para pruebas/servidor), `MOVE` (`exit` | `step` con un dado | `sum` con los dos),
  `SOPLAR`, `DISMISS_SOPLO`, `TIME_UP`, `RESIGN` (abandono online).
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

## Economía, monetización y progreso (v0.6)
- **Economía compartida** en `packages/engine/src/economy.ts` (cliente y servidor):
  - Mesas (entrada que paga CADA jugador): Barrio 200 (nv 1), Ciudad 1.000 (nv 5), Capital 5.000 (nv 20),
    Leyenda 25.000 (nv 50), Sala Élite 100.000 (nv 100), Top Leyendas 250.000 (solo online, top 100 del ranking).
  - Reparto `payouts(entry, players, teams)`: 4 jugadores → 1º = su entrada + 75 % de las entradas del 3º y 4º,
    2º recupera su entrada, 3º/4º nada. 6 jugadores → ganan 1º, 2º y 3º (1º +50 % y 2º +25 % de lo perdido,
    3º recupera). 1 vs 1 → 1º = entrada + 75 % de la rival. Parejas → cada ganador = entrada + 75 %. La casa se queda el 25 %.
  - El 1º de una mesa con apuesta gana **5 gemas** (`WINNER_GEMS`). Monedas iniciales: 1.000.
  - Niveles hasta **2.000**: XP acumulada `100·(L−1) + 50·(L−1)²`, nivel 2000 = exactamente **200.000.000 XP**.
    XP por partida `matchXp`: 50 al ganador en mesa de 200, crece con √entrada; 2º 80 %, resto 60 %; sin apuesta 10.
  - **Toda partida contra la máquina con un humano paga entrada** (Setup y Mesas). Partidas locales de varios humanos son gratis y sin premios.
- **Gemas**: solo para **emotes** en partida (`EMOTES` en `meta/catalog.ts`, 1–3 gemas). Se ganan quedando 1º, en el pase o comprándolas.
- **Pagos con dinero real** (`apps/server/src/payments.ts` + `apps/web/src/lib/payments.ts`): Stripe Checkout por API REST.
  El precio lo fija el servidor (`PRODUCTS` / `ITEM_PRICES_USD` del motor). Al volver (`?purchase=success&session_id=`) el
  servidor verifica `payment_status = paid` y el cliente entrega (ids de compra deduplicados en `profile.grants`).
  Variables: `STRIPE_SECRET_KEY` (sk_…), `STRIPE_CURRENCY` (usd por defecto). **Sin llave → modo prueba** (diálogo claro, no cobra;
  el servidor acredita por `/api/demo/grant`; se apaga con `PARQUES_DEMO_PURCHASES=off`).
- **Tienda**: tableros mayormente con dinero real (Caribe, Madera fina, Noche de rumba, Mármol real, Oro 24K, temporada) y pocos con monedas
  (Eje Cafetero); igual dados/fichas/marcos/efectos. Paquetes de monedas y gemas en dólares. Objetos `currency: 'pass'` solo en el pase.
- **Pase de batalla** mensual (`meta/battlepass.ts`, `screens/PassScreen.tsx`): 50 niveles, 150 XP de pase por nivel (la XP de las partidas),
  camino gratis (monedas, gemas) y Premium (US$4,99; Élite +10 niveles US$9,99) con tableros Esmeralda y Galaxia, fichas Corona, dados Rubí, marco Diamante.
- **Logros**: 1.205 generados por categorías × niveles I…L (`meta/achievements.ts`), recompensa en monedas, pantalla `AchievementsScreen`.
- **Foto de perfil**: se recorta a 160×160 JPEG (`photoToDataUrl`), se guarda en el perfil y se envía al servidor (≤40 KB).
- **Idiomas**: es (base), en, pt, fr. `t('texto en español', vars)`; traducciones en `lib/locales.ts`. `i18n.test.ts` falla si falta
  una traducción o no coinciden las variables. Al agregar un texto nuevo: usar `t()`/`tr()` y añadirlo a `locales.ts`.
- **Gráficos 3D** (SVG/CSS): tablero con canto/grosor y perspectiva (`BoardScene`, `BoardMini` para tienda/lobby/pase con prefijo de ids),
  fichas tipo peón con sombreado (`PieceGlyph`, gradientes en `components/GlobalDefs.tsx`), dados cubo 3D CSS (`Cube`).
- **Salas online por mesa**: `quick_match(table)`; el servidor valida nivel (enviado en `hello`) y el puesto en el ranking para Top Leyendas.

## Juego ONLINE (v0.7): el servidor es la autoridad
- **Cuentas**: al abrir la app el cliente hace `auth` (Socket.IO). Sin sesión, el servidor crea una cuenta de invitado y devuelve
  `{id, token}` (se guarda en localStorage como `parques-session`; `id-token` es el **código de recuperación** en Ajustes → Cuenta).
- **Base de datos**: PostgreSQL (`apps/server/src/store.ts`, API asíncrona). Producción: Supabase vía `DATABASE_URL`, esquema
  propio `parques` (accounts con perfil JSONB + rating, tournaments, claims, purchases; RLS activo sin políticas = solo el servidor).
  Desarrollo: PGlite (Postgres embebido) en `apps/server/data/pglite` (o `PARQUES_DATA`); pruebas: PGlite en memoria.
  El esquema se aplica al arrancar (`SCHEMA`, idempotente). `update()` usa `SELECT … FOR UPDATE` en una transacción;
  `creditPurchase()` registra y entrega la compra en la misma transacción (nunca dos veces).
- **Perfil = datos + operaciones puras** en `packages/engine/src/meta/profile.ts` (applyMatch, payEntry, buyWithCoins, equip,
  spendEmote, grantProduct, claimDaily, spin, claimMission, claimPass, setIdentity, amigos). El servidor las ejecuta (`profile_op`)
  dentro de una transacción; el cliente (`stores/profileStore.ts`) es solo un espejo que recibe `profile`.
- **Todas las partidas con premio corren en el servidor**, también contra la máquina (`play_ai` → sala con bots, 4 o 6 jugadores,
  parejas, Modo Rápido con `TIME_UP`). La sala cobra la entrada al empezar (`charge`) y al terminar aplica `applyMatch` a cada
  humano y envía `match_result` (premios). Ranking y torneo solo cuentan partidas entre personas (`mode: 'online'`).
  Lo único local es "varias personas en el mismo celular" (gratis, sin premios).
- Datos del juego compartidos (catálogo, logros, misiones, pase, temporadas, premios) en `packages/engine/src/meta/`.
- Tiempos de prueba del servidor: `PARQUES_TURN_MS`, `PARQUES_BOT_MS`. URL del servidor en el cliente: Ajustes, o `VITE_SERVER_URL`.

## Publicación (ver PUBLICAR.md)
- **No tocar las otras apps del repo** (Fitness Life en `app/`, Ridge Rush): Parqués usa solo archivos propios
  (`parques/**`, `.github/workflows/parques-*.yml`, `.github/scripts/parques-ios-signing.mjs`). Scripts compartidos como
  `android-upload-key.sh` se usan sin modificarlos (con `UPLOAD_KEY_NAME=parques_upload_key`).
- Servidor: Railway, proyecto `parques`, servicio `parques-server` → https://parques-server-production.up.railway.app
  (raíz `parques`, `Dockerfile`, 1 réplica, healthcheck `/health`, ajustes puestos por API; Railway ya no usa railway.json).
  Sin `DATABASE_URL` en Railway no arranca.
- Supabase (proyecto pmnsdovmbitqjdtxbeuo): usuario `parques_server` (sin superusuario, dueño solo del esquema `parques`,
  sin acceso a public/auth/vault/storage). Conexión: Session pooler `aws-1-ca-central-1.pooler.supabase.com:5432`,
  usuario `parques_server.pmnsdovmbitqjdtxbeuo`. La contraseña solo vive en la variable `DATABASE_URL` de Railway.
- Variables de GitHub: `PARQUES_SERVER_URL`, `PARQUES_RC_ANDROID_KEY`, `PARQUES_RC_IOS_KEY` (+ las de Apple/Supabase ya existentes).

## Apps iOS y Android (Capacitor 8, como Fitness Life)
- Proyectos nativos en `apps/web/android` (Gradle) y `apps/web/ios` (Xcode, Swift Package Manager). Id: `parques.app`, nombre "Parqués".
- `cp apps/web/.env.mobile.example apps/web/.env.mobile` y llenar `VITE_SERVER_URL` (HTTPS público) y llaves de RevenueCat.
- `npm run android -w @parques/web` / `npm run ios -w @parques/web`: compila (`vite build --mode mobile`), `cap sync` y abre el IDE.
- Íconos y pantallas de inicio: `npm run assets:mobile -w @parques/web` (desde `public/icon.svg`).
- `src/lib/native.ts`: barra de estado, splash, botón atrás de Android (lobby/minimizar, pausa en partida), háptica.
  El service worker de la PWA solo se registra en la web.
- **Compras en las tiendas** (obligatorio por Apple/Google para bienes digitales): RevenueCat (`@revenuecat/purchases-capacitor`).
  Ids de producto en las tiendas = `storeProductId()` (`coins_s`, `gems_m`, `pass_premium`, `item_board_oro`…), todos consumibles
  o no consumibles (no suscripciones). La app compra con `appUserID = id de la cuenta`; luego `POST /api/iap/verify {id, token}`:
  el servidor consulta `api.revenuecat.com/v1/subscribers/{id}` con `REVENUECAT_SECRET_KEY` y acredita cada transacción una vez.

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
9. ✅ v0.8: publicación — servidor en Railway (Dockerfile) con Postgres de Supabase; workflows
   `parques-android.yml` (Google Play), `parques-ios.yml` (TestFlight), `parques-ci.yml`. Guía en `PUBLICAR.md`.
8. ✅ v0.7: juego 100 % online (cuentas y monedero en el servidor, partidas contra la máquina en el servidor), apps iOS/Android con Capacitor y compras en tiendas (RevenueCat).
7. ✅ v0.6: economía con entradas y reparto, nivel 2000, pagos reales (Stripe), gemas para emotes, pase de batalla,
   1.205 logros, foto de perfil, 4 idiomas, Sala Élite y Top Leyendas, gráficos 3D.

## v0.9 (lo nuevo)
- **Reglas**: capturar da otra tirada (`captureBonus`, evento `EXTRA_TURN` con `reason: 'capture'`; no cuenta para tres pares).
  Nivel máximo **500** (XP con la misma curva, total 12.499.950). Sala Élite desde nivel **200** y Top Leyendas desde nivel **300** (además del top 100). Turno de 20 s en todas las mesas.
- **Partida**: botón de emotes pegado a mi avatar (`seat-emote`), panel con pestañas Emotes / Frases / regiones (`REGIONS` en
  `game/phrases.ts`: Costa, Paisa, Bogotá, Valle, Santander, Pacífico, Llanos, Nariño y Tolima, Boyacá). Si se cierra la app en plena
  partida, al volver se sale de la mesa (la máquina juega por ti) y queda en el inicio; un corte de red con la app abierta sí retoma.
- **Motor `meta/`**: `ads.ts` (300 monedas por anuncio, 8/día, espera 25 s, solo con < 1.000 monedas), `events.ts` (evento de 15 días
  rotando 8 retos; 7 niveles de premio y objeto exclusivo `currency: 'event'`), `shop.ts` (3 ofertas del día −40 %, cofres con gemas,
  cambio de gemas), `competition.ts` (premios semanales del ranking global/país/amigos; copas Libre/Bronce/Plata/Oro/Diamante con
  inscripción, bote = inscripciones + casa, reparto al top 10). Paquetes con dinero real (`kind: 'bundle'`). 37 misiones (4 diarias
  y 4 semanales visibles, dan gemas). **2.400+ logros**.
- **Servidor**: tablas `cups`, `cup_results`, `settled`, `rank_results`, `identities`, `sessions`. Cierre semanal automático cada 10 min
  (`settleCups` / `settleRanking`, una sola vez por semana gracias a `settled`). Sockets: `cups`, `cup_match` (fila `cup:<tier>`),
  `hall_of_fame`, `rank_rewards`, `find_player`, `friends_online`, `invite` → `invited`, `auth_provider` (Apple/Google con `jose`;
  `APPLE_CLIENT_IDS` = parques.app, `GOOGLE_CLIENT_IDS` = ids de cliente OAuth separados por coma).
- **App**: `lib/auth.ts` (@capgo/capacitor-social-login; Apple solo en iOS, Google si hay `VITE_GOOGLE_WEB_CLIENT_ID`),
  `lib/ads.ts` (@capacitor-community/admob, anuncios no personalizados; sin ids propios usa los de prueba de Google).
  Tableros ilustrados (`game/BoardArt.tsx`, `BoardTheme.art`): el dibujo cubre todo el tablero y las casillas quedan semitransparentes.
  Fichas con salto 3D (`HOP_S`), acabados perla/mate/obsidiana/tricolor/fuego/viento; efectos burbujas/mariposas/rayos/cumbia.
  **Arte (v0.9.2)**: escenarios pintados en `public/art/boards/*.webp` (`BoardTheme.image`): la IA solo pinta el paisaje
  (esquinas y bordes) y la app dibuja encima el recorrido EXACTO del tablero clásico; las cárceles quedan transparentes.
  Texturas de dados `public/art/dice/*.webp` (`DiceSkin.texture`, generadas con código). Avatares de la tienda
  (`category: 'avatar'`, equipados como `av:<id>`): con `avatarImg` muestran la ilustración, si no un medallón de color con su emoji.
  Fichas nuevas dibujadas en SVG (cerámica, muisca, grano, vueltiao, chiva, esmeralda). `src/lib/art.test.ts` falla si una
  skin apunta a una imagen que no existe. Animaciones: entrada del tablero, aviso "¡Tu turno!", ficha capturada vuela en arco
  a la cárcel, entradas escalonadas en lobby y tienda.
  Galería de gráficos solo en desarrollo: `http://localhost:5173/#galeria`. Textos nuevos en `lib/locales2.ts`.

## v1.0 (lo nuevo)
- **Arte con Higgsfield**: logo (`public/art/logo.webp`, componente `Logo` con brillo y flotación), ícono de la app
  (`resources/icon-art.png` → `python3 scripts/gen-art-icons.py` regenera íconos y splash de Android/iOS/PWA; usa también
  `resources/splash-bg.png`), fondo de fiesta animado (`components/FiestaBackdrop.tsx`: plaza ilustrada `art/welcome.webp`
  con zoom lento, guirnaldas, luces, luciérnagas y confeti) en carga y registro, Dadito animado (`art/dadito-hola.webp`,
  `art/dadito-gana.webp`; `<Mascot mood>`), 24 avatares ilustrados, escenarios de 26 tableros.
- **Sonido**: efectos grabados en `public/sfx/*.mp3` y música en `public/music/lobby.mp3` y `game.mp3` (cambia sola al
  entrar/salir de la partida, `setMusicTrack`). Si un archivo no carga se usa el sonido sintetizado de `audio/sounds.ts`
  (los dados siguen sintetizados).
- **Ajustes → Cerrar sesión** (`logout()` en `lib/online.ts`: borra la sesión del celular y vuelve al registro); en el
  registro se puede entrar con Apple/Google o con un código de recuperación.
- Arreglo: el menú de pausa quedaba abajo cortado (`.game-screen > *:not(.bg)` le quitaba el `position: fixed`).
- Más tienda: tableros Comuna 13, El Dorado, Arrecife de Providencia, Valle de Cocora, Festival Vallenato; 10 dados con
  textura nueva; 8 marcos. `art.test.ts` sigue exigiendo que toda skin tenga su imagen.

## v1.1 (lo nuevo)
- **Todos los tableros con escenario** de Higgsfield (37); `art.test.ts` lo exige.
- **Abandono online** (`RESIGN` en el motor, `PLAYER_LEFT`): en partidas `mode: 'online'` sin parejas, quien se sale (o no vuelve
  tras la gracia) queda fuera: fichas a la cárcel, sus turnos se saltan, queda último y no puede volver a sentarse. Prueba
  `test/resign.test.ts` y en `room.test.ts`. Contra la máquina y en parejas sigue reemplazándolo la IA.
- **Tutorial** (`screens/TutorialScreen.tsx`, textos en `game/tutorialData.ts`): tras registrarse, partida de práctica guiada con
  dados preparados (sacar con par, mover, capturar con 2+3 —la víctima se ubica con el motor—, seguros, soplar, tres pares, cielo)
  y luego recorrido del inicio (`components/CoachTour.tsx`, `LOBBY_TOUR`). Se repite desde Ajustes. Llaves `parques-tutorial-done`
  y `parques-tour-pending`.
- **Música elegible** (Ajustes y menú de pausa): Automática, Cumbia, Vallenato, Salsa, Champeta, Porro (`public/music/*.mp3`,
  `musicTrack` en ajustes). Se pausa al pasar la app a segundo plano (`visibilitychange` + `appStateChange` de Capacitor) y en
  iPhone suena aunque esté en silencio (`navigator.audioSession.type = 'playback'`).
- Tienda: banco de monedas/gemas arriba (`bank-strip`); velo bajo la barra de estado (`status-veil`). Dados: el usado se ve gris
  con ✓ (no transparente). Más frases de la Costa.

## Pendiente / ideas
- Iniciar sesión con Google / Apple (hoy: cuenta de invitado + código de recuperación).
- Para muchos jugadores a la vez: varias instancias del servidor (Socket.IO adapter; hoy las salas viven en memoria → 1 réplica).
- Online solo en tablero de 4 (6 jugadores es local/IA).
