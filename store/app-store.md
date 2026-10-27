# Fitness Life en el App Store (iPhone)

Pasos para publicar la app de iPhone, en orden. Las claves y contraseñas van solo en GitHub (Secrets) o en las páginas de Apple, Supabase y RevenueCat; nunca en un chat ni en el código.

## 1. Cuenta de desarrollador de Apple

1. En el iPhone, instala la app **Apple Developer** desde el App Store.
2. Ábrela, entra con tu Apple ID (necesita la verificación en dos pasos) y toca **Inscribirse ahora**.
3. Elige inscribirte como **persona (Individual)**. En la tienda saldrá tu nombre como vendedor.
4. Paga la membresía (99 USD al año). Apple tarda de unas horas a 2 días en aprobarla.

## 2. Datos para que GitHub compile y suba la app

Cuando la cuenta esté activa:

1. **Team ID:** developer.apple.com → Account → **Membership details** → Team ID (10 caracteres).
   En GitHub: Settings → Secrets and variables → Actions → **Variables** → `APPLE_TEAM_ID`.
2. **Clave de la API de App Store Connect:** appstoreconnect.apple.com → **Usuarios y acceso** → **Integraciones** → **API de App Store Connect** → **Generar clave** con acceso **Administrador**. Descarga el archivo `.p8` (solo se puede descargar una vez).
   En GitHub → **Secrets**:
   - `APPSTORE_KEY_ID`: el ID de la clave.
   - `APPSTORE_ISSUER_ID`: el "Issuer ID" que sale arriba de la lista de claves.
   - `APPSTORE_PRIVATE_KEY`: todo el contenido del archivo `.p8` (desde `-----BEGIN PRIVATE KEY-----` hasta `-----END PRIVATE KEY-----`).

## 3. La app en App Store Connect

1. **Apps → + → Nueva app**: plataforma iOS, nombre `Fitness Life: Gym y Nutrición`, idioma principal Español (México), ID de paquete `com.fitnesslife.app`, SKU `fitnesslife`.
2. Si el ID de paquete no aparece, créalo en developer.apple.com → **Identifiers** → `com.fitnesslife.app`, con **HealthKit** y **Sign in with Apple** activados.

## 4. Subir una versión a TestFlight

1. GitHub → **Actions** → **iOS for TestFlight** → **Run workflow**.
2. Unos 15 minutos después, la versión aparece en App Store Connect → **TestFlight**.
3. En **Pruebas internas**, agrégate como tester. Instala la app **TestFlight** en el iPhone y desde ahí instala Fitness Life.

## 5. Suscripciones (Premium)

1. App Store Connect → la app → **Suscripciones** → grupo **Premium** con dos suscripciones:
   - Mensual, 4,99 USD, con oferta introductoria **gratis 7 días** (Nuevos suscriptores).
   - Anual, 39,99 USD, sin prueba.
2. En **RevenueCat**: agrega la app de iOS, sube la **clave de compras dentro de la app** (App Store Connect → Usuarios y acceso → Integraciones → Compras dentro de la app) y pon los productos en el mismo `premium` y la misma oferta que Android.
3. La clave pública de RevenueCat para iOS va en GitHub → Variables → `VITE_RC_IOS_KEY`.
4. Para probar sin pagar: App Store Connect → Usuarios y acceso → **Sandbox** → crea un tester. En TestFlight las compras siempre son de prueba.

## 6. Iniciar sesión con Apple

Apple exige "Iniciar sesión con Apple" si la app ofrece Google. Lo configura el flujo **Sign in with Apple** de GitHub, que además renueva la clave cada mes (Apple la deja durar como máximo 6 meses).

1. developer.apple.com → **Identifiers** → `com.fitnesslife.app` → activa **Sign in with Apple** → Save.
2. **Identifiers → +** → **Services IDs**: descripción `Fitness Life Sign In`, identificador `com.fitnesslife.app.signin`. Ábrelo, activa **Sign in with Apple** → **Configure**:
   - Primary App ID: `com.fitnesslife.app`.
   - Domains: `<proyecto>.supabase.co` (el de `SUPABASE_PROJECT_REF`).
   - Return URLs: `https://<proyecto>.supabase.co/auth/v1/callback`.
3. **Keys → +**: nombre `Sign in with Apple`, activa **Sign in with Apple** → Configure → `com.fitnesslife.app` → descarga el `.p8`.
4. En GitHub:
   - Variable `APPLE_SERVICES_ID`: `com.fitnesslife.app.signin`.
   - Secrets `APPLE_SIGNIN_KEY_ID` (el ID de esa clave) y `APPLE_SIGNIN_PRIVATE_KEY` (todo el contenido del `.p8`).
5. Actions → **Sign in with Apple** → **Run workflow**. Al terminar, el botón de Apple aparece solo en la app y en la web.

## 7. Ficha del App Store (textos para copiar)

Los textos (nombre, subtítulo, texto promocional, palabras clave, descripción y novedades) en español, inglés y portugués están en [`textos-tiendas.md`](textos-tiendas.md).
Las capturas para iPhone de 6,9" (1290×2796) están en [`app-store/es`](app-store/es), [`app-store/en`](app-store/en) y [`app-store/pt`](app-store/pt), de `01-inicio.png` a `08-premium.png`, en ese orden.

**URL de soporte:** `https://newfitneeslife29-commits.github.io/fitness-life-ai/`
**URL de la política de privacidad:** `https://newfitneeslife29-commits.github.io/fitness-life-ai/legal.html#privacidad`
**Categoría:** Salud y forma física (secundaria: Estilo de vida).
**Clasificación por edad:** responde "No" a todo, salvo **contenido generado por usuarios** (comunidad): Sí. El resultado suele ser 12+.

**Notas para el revisor de Apple:**
```
Fitness Life works without an account: tap "Start for free" and then "Continue without account". An account (email or Sign in with Apple) is only needed for the cloud backup, the community and online trainers.

Premium is an auto-renewable subscription sold with In-App Purchase (monthly with a 7-day free trial, or annual). It unlocks the AI personal trainer and the AI nutrition coach. "Restore purchases", the Terms of Use and the Privacy Policy are on the Premium screen.

Online trainers: people can hire a real, human personal trainer for 1:1 coaching (chat, routines and follow-up). This is a person-to-person service, so it is paid outside In-App Purchase as allowed by guideline 3.1.3(d). The iPhone app does not sell any digital content outside In-App Purchase.

Location: the GPS is used only while the app is open and a walk or ride is being recorded, to measure the distance. The app has no background location mode.

AI: the AI features use Claude, by Anthropic. Before the first request the app explains what is sent and asks for permission; nothing is sent without it. This is also in the Privacy Policy.

Apple Health: read-only (steps, active energy, heart rate, sleep), shown in the app; nothing is written.

User-generated content: the community has report and block buttons on every post, comment and story, community rules that must be accepted before posting, and reported content is hidden automatically. The trainer chat has a "Report conversation" option.
```
