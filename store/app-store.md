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

Apple exige "Iniciar sesión con Apple" si la app ofrece Google. Se configura en developer.apple.com (Services ID y una clave de Sign in with Apple) y en Supabase → Authentication → Providers → **Apple**. Al activarlo en Supabase, el botón aparece solo en la app.
