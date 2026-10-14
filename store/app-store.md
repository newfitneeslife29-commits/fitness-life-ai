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

Las capturas para iPhone de 6,9" (1290×2796) están en [`app-store/`](app-store/), de `01-inicio.png` a `08-premium.png`, en ese orden.

**Nombre** (máx. 30): `Fitness Life: Gym y Nutrición`

**Subtítulo** (máx. 30): `Gym, rutinas y nutrición IA`

**Texto promocional** (máx. 170):
```
Nuevo: tu plan cambia cada semana, un entrenador con IA para el gym o la casa y Gym Wrapped para compartir tu mes. Prueba Premium 7 días gratis.
```

**Palabras clave** (máx. 100, separadas por comas, sin espacios):
```
gym,rutinas,gimnasio,pesas,fuerza,nutricion,calorias,proteina,entrenador,casa,mujeres,musculo,dieta
```

**Descripción:**
```
Fitness Life arma tu plan de fuerza en un minuto y te acompaña en cada entreno, cada comida y cada récord.

TU PLAN, A TU MEDIDA
• Dinos tu objetivo, tu nivel, tus días y dónde entrenas: gimnasio, mancuernas o en casa sin material.
• Tu plan avanza cada semana: al completar tu semana, tus rutinas se renuevan con nuevas fases y ejercicios.
• Sección de entrenamiento para mujeres: planes para bajar de peso o tonificar, en casa o en el gimnasio.

TU ENTRENADOR PERSONAL CON IA (PREMIUM)
• Pregúntale qué entrenar hoy, con cuánto peso y cómo mejorar.
• Pídele una rutina para casa sin material, con mancuernas o para el gym, y la guarda en tu plan.

ENTRENA MEJOR
• Fotos de cada ejercicio y consejos de técnica.
• Temporizador de descanso automático con vibración y sonido.
• Repite la serie anterior con un toque y la app te dice cuándo subir de peso.
• ¿Máquina ocupada? Cámbiala al instante por otro ejercicio del mismo músculo.
• Alertas de recuperación: te avisa cuando tus músculos ya descansaron.
• Funciona sin internet: tus entrenos se guardan y se sincronizan al volver la señal.

MIRA Y COMPARTE TU PROGRESO
• Constancia por semanas, 1RM estimado, volumen y peso corporal.
• Tu actividad: calendario con los días que entrenas y tus rachas.
• Gym Wrapped: tu mes en tarjetas para Instagram, Facebook y TikTok, con un fondo de gym o tu propia foto.
• Antes y después: compara tus fotos y compártelas.
• Pasos, calorías activas y pulso desde la app Salud.

NUTRICIÓN SIN COMPLICARTE
• Calorías, proteína, carbohidratos y grasa del día, con objetivos según tu meta.
• Índice de masa corporal (IMC) y tu rango de peso saludable.
• Tabla con 94 alimentos comunes.
• Premium: toma una foto de tu comida y la IA calcula los macros.
• Premium: coach de nutrición con IA que conoce tu objetivo y lo que llevas comido hoy.

COMUNIDAD
• Publica tu progreso con fotos, da like y comenta.
• Reporta y bloquea con un toque: tolerancia cero con el contenido ofensivo.

TU CUENTA, TUS DATOS
• Úsala sin cuenta o entra con tu correo, Google o Apple para guardar una copia en la nube.
• Elige el color del ícono de la app.
• Sin anuncios. No vendemos tus datos.
• En español, inglés y portugués, con modo claro y oscuro.

FITNESS LIFE PREMIUM
Entrenar es gratis. Premium añade la IA: entrenador personal, coach de nutrición y comidas calculadas desde una foto.
• Mensual: 4,99 USD al mes, con 7 días de prueba gratis para nuevos suscriptores.
• Anual: 39,99 USD al año.
El pago se carga a tu cuenta de Apple al confirmar la compra (o al terminar la prueba gratis). La suscripción se renueva sola salvo que la canceles al menos 24 horas antes del final del periodo. Puedes gestionarla y cancelarla en los Ajustes de tu cuenta de Apple.

Términos de uso: https://newfitneeslife29-commits.github.io/fitness-life-ai/legal.html#terminos
Privacidad: https://newfitneeslife29-commits.github.io/fitness-life-ai/legal.html#privacidad

Fitness Life no sustituye el consejo de un médico o nutricionista. Consulta a un profesional antes de empezar un programa de ejercicio o cambiar tu dieta.
```

**URL de soporte:** `https://newfitneeslife29-commits.github.io/fitness-life-ai/`
**URL de la política de privacidad:** `https://newfitneeslife29-commits.github.io/fitness-life-ai/legal.html#privacidad`
**Categoría:** Salud y forma física (secundaria: Estilo de vida).
**Clasificación por edad:** responde "No" a todo, salvo **contenido generado por usuarios** (comunidad): Sí. El resultado suele ser 12+.

**Notas para el revisor de Apple:**
```
Fitness Life works without an account: tap "Start for free" and then "Continue without account". Premium is an auto-renewable subscription (monthly with a 7-day free trial, or annual) and unlocks the AI personal trainer and the AI nutrition coach. The community has report and block buttons on every post and comment.
```
