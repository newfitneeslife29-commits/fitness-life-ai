# Publicar Parqués 🚀

Igual que Fitness Life: **GitHub Actions** compila y firma las apps; el **servidor** del juego va en **Railway** y los datos
(cuentas, monedas, compras, ranking) se guardan en tu **Supabase**, en un esquema propio `parques` que no toca las tablas de
Fitness Life. Nada de esto modifica las otras apps del repositorio.

| Qué | Valor |
|---|---|
| Nombre en las tiendas | **Parqués** |
| ID de paquete (Android) / Bundle ID (iOS) | **`parques.app`** |
| Servidor | Railway (carpeta `parques`, `Dockerfile`) |
| Base de datos | Supabase Postgres (esquema `parques`, se crea solo al arrancar) |

> Los workflows `workflow_dispatch` solo aparecen en la pestaña **Actions** cuando están en la rama principal:
> primero hay que unir (merge) esta rama a `main`.

---

## 1. Servidor en Railway (primero: las apps necesitan su dirección)

1. **Cadena de conexión de Supabase**: Supabase → tu proyecto → botón **Connect** → *Session pooler* → copia la URI
   (`postgresql://postgres.xxxx:[TU-CONTRASEÑA]@aws-0-….pooler.supabase.com:5432/postgres`) y pon la contraseña de la base.
   Usa el *Session pooler* (funciona con IPv4, que es lo que tiene Railway).
2. **Railway** → New Project → *Deploy from GitHub repo* → este repositorio.
3. En el servicio → **Settings**:
   - *Root Directory*: `parques` (Railway lee `parques/railway.json` y construye con `parques/Dockerfile`).
   - *Branch*: la rama que quieras publicar (`main`).
   - *Networking* → **Generate Domain** → te da `https://algo.up.railway.app`. Esa es la **URL del servidor**.
   - Réplicas: **1** (las mesas viven en la memoria del servidor).
4. **Variables** del servicio:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la URI del paso 1 (obligatoria: sin ella el servidor no arranca en Railway) |
   | `REVENUECAT_SECRET_KEY` | clave secreta de RevenueCat del proyecto Parqués (`sk_…`), para acreditar compras de Google Play / App Store |
   | `STRIPE_SECRET_KEY` | tu clave secreta de Stripe (`sk_live_…`), para compras en la versión web |
   | `PARQUES_DEMO_PURCHASES` | `off` (apaga las compras de prueba sin cobro) |

5. Comprueba: abre `https://TU-URL/health` → debe responder `{"ok":true}`. En `https://TU-URL/` está además la versión web del juego.

## 2. RevenueCat (compras dentro de las apps)

1. RevenueCat → **New project** "Parqués" (separado de Fitness Life).
2. Agrega la app de **Google Play** (paquete `parques.app`) y la de **App Store** (bundle `parques.app`), con las mismas
   credenciales de servicio que usas en Fitness Life.
3. Copia las **claves públicas** de cada app (`goog_…` y `appl_…`) → van a GitHub (paso 3).
   La **clave secreta** (`sk_…`) → va a Railway (`REVENUECAT_SECRET_KEY`).
4. Crea los productos en **Play Console** (Monetizar → Productos integrados) y en **App Store Connect** (Compras dentro de la app)
   con estos IDs exactos. Todos son **consumibles**, salvo tableros/dados/fichas/marcos/efectos, que son **no consumibles**:

   | ID | Precio | Qué es |
   |---|---|---|
   | `coins_s` | US$0.99 | 5.000 monedas |
   | `coins_m` | US$4.99 | 30.000 monedas |
   | `coins_l` | US$9.99 | 70.000 monedas |
   | `coins_xl` | US$19.99 | 160.000 monedas |
   | `coins_xxl` | US$49.99 | 500.000 monedas |
   | `gems_s` | US$0.99 | 20 gemas |
   | `gems_m` | US$4.99 | 120 gemas |
   | `gems_l` | US$9.99 | 260 gemas |
   | `pass_premium` | US$4.99 | Pase Premium (consumible: hay uno por temporada) |
   | `pass_elite` | US$9.99 | Pase Élite (+10 niveles) (consumible) |
   | `item_board_caribe` · `item_board_madera` · `item_board_noche` · `item_board_marmol` · `item_board_oro` · `item_board_feria` · `item_board_carnaval` · `item_board_navidad` | 1.99 – 9.99 | tableros |
   | `item_dice_cafe` · `item_dice_neon` · `item_dice_cristal` · `item_dice_navidad` · `item_dice_carnaval` · `item_dice_feria` | 0.99 – 1.99 | dados |
   | `item_pieces_gema` · `item_pieces_brillante` · `item_pieces_cristal` · `item_pieces_estrella` | 0.99 – 2.99 | fichas |
   | `item_frame_vueltiao` · `item_frame_tricolor` · `item_frame_fuego` · `item_frame_navidad` | 0.99 – 1.99 | marcos |
   | `item_effect_confeti` · `item_effect_polvora` · `item_effect_nieve` | 0.99 – 1.99 | efectos |

   El precio exacto de cada artículo está en la tienda del juego (`packages/engine/src/economy.ts`).
   Después, en RevenueCat → *Products* → importa los productos de cada tienda.

## 3. GitHub (Settings → Secrets and variables → Actions)

Ya tienes de Fitness Life: variable `APPLE_TEAM_ID`, `SUPABASE_PROJECT_REF`; secretos `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`,
`APPSTORE_PRIVATE_KEY`, `SUPABASE_ACCESS_TOKEN`. Solo agrega estas **variables** nuevas:

| Variable | Valor |
|---|---|
| `PARQUES_SERVER_URL` | la URL de Railway, p. ej. `https://parques-production.up.railway.app` (sin `/` al final) |
| `PARQUES_RC_ANDROID_KEY` | clave pública de Google Play en RevenueCat (`goog_…`) |
| `PARQUES_RC_IOS_KEY` | clave pública de App Store en RevenueCat (`appl_…`) |

## 4. Android → Google Play

1. **Play Console** → *Crear app* → nombre **Parqués**, juego, gratis.
2. GitHub → **Actions** → **Parqués for Google Play** → *Run workflow*.
   La primera vez crea la clave de subida y la guarda en el Vault de Supabase (`parques_upload_key`, distinta de las otras apps).
3. Al terminar, descarga **parques-1.0.N** en *Artifacts*, descomprímelo y sube el `.aab` en Play Console
   (Pruebas → Prueba interna → Crear versión). La primera subida es manual (lo exige Google); el paquete queda fijado como `parques.app`.
4. Cada nueva versión: vuelve a lanzar el workflow (el número de versión sube solo).

## 5. iPhone → TestFlight / App Store

1. **App Store Connect** → Apps → **+** → Nueva app → iOS, nombre **Parqués**, idioma español, Bundle ID **`parques.app`**,
   SKU `parques`. (El workflow registra el Bundle ID con *In-App Purchase* si aún no existe; si la app no está creada,
   el primer paso falla y te dice exactamente qué crear.)
   Si Apple dice que el nombre "Parqués" ya está usado, prueba "Parqués Online" o "Parqués Colombiano".
2. GitHub → **Actions** → **Parqués for TestFlight** → *Run workflow*.
3. Unos 15 minutos después aparece en **TestFlight**. Desde ahí la envías a revisión para la App Store.

## 6. Antes de enviar a revisión (Apple y Google)

- Política de privacidad (URL pública) y clasificación de contenido. El juego tiene **compras** y **monedas virtuales**,
  pero **no** es apuesta con dinero real: las monedas no se pueden cambiar por dinero.
- Capturas de pantalla (teléfono y tableta) y la descripción.
- En Google Play: *Seguridad de los datos* → se guarda un id de cuenta, nombre, país y (opcional) foto de perfil.

## Resumen de dónde va cada cosa

| Dónde | Qué |
|---|---|
| Railway | `DATABASE_URL`, `REVENUECAT_SECRET_KEY`, `STRIPE_SECRET_KEY`, `PARQUES_DEMO_PURCHASES=off` |
| GitHub (variables) | `PARQUES_SERVER_URL`, `PARQUES_RC_ANDROID_KEY`, `PARQUES_RC_IOS_KEY` |
| GitHub (ya existentes) | `APPLE_TEAM_ID`, `SUPABASE_PROJECT_REF`, `APPSTORE_*`, `SUPABASE_ACCESS_TOKEN` |
| Workflows | `parques-android.yml`, `parques-ios.yml`, `parques-ci.yml` (pruebas automáticas) |
