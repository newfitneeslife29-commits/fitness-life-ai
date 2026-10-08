# Fitness Life

App de entrenamiento de fuerza para **iOS, Android y web**. Te da un plan, registras cada serie en el gimnasio y te sugiere el peso de la próxima sesión.

- **Funciona sola:** sin cuenta y sin claves. Los datos se guardan en el dispositivo; en las apps nativas, también en el almacenamiento del sistema.
- **Funciona sin conexión**, en **español, inglés o portugués** (sigue el idioma del móvil y se cambia en Bienvenida o Ajustes), en kg o en lb.
- **Coach de nutrición con IA (Claude)**, opcional: solo necesita conexión y el backend de abajo. Sin él, la nutrición funciona igual a mano.
- **Gratis, con Premium opcional a 4,99 US$ al mes:** todo el entrenamiento y la nutrición son gratis; Premium amplía la IA de 5 a 100 consultas al mes.

## Funciones

| Pantalla | Qué hace |
| --- | --- |
| Bienvenida | 5 preguntas (objetivo, nivel, días, material, unidades) y genera un plan de 6 posibles |
| Hoy | Anillo de entrenos de la semana, siguiente sesión del plan, racha, logros y último entreno |
| Entreno | Foto animada de cada ejercicio (posición inicial y final) y «Cómo se hace» con la técnica; series editables con columna «Anterior» y peso sugerido; descanso con cuenta atrás, vibración y notificación aunque el móvil esté bloqueado; calculadora de discos y calentamiento; cambiar, añadir o quitar ejercicios; pantalla siempre encendida. Sigue abierto si cierras la app |
| Resumen | Duración, volumen, series, récords y logros nuevos; notas y compartir |
| Progreso | Entrenos por semana frente al objetivo, calendario de 18 semanas, 1RM estimado por ejercicio, series por músculo, peso corporal, récords e historial |
| Logros | 14 medallas: constancia, rachas, récords, toneladas movidas… |
| Rutinas | El plan en rotación y tus rutinas propias, con editor de series, rango de reps, descanso y orden |
| Ejercicios | 45 ejercicios con fotos, músculo, material y consejo de técnica; historial y récord de cada uno (desde Rutinas) |
| Nutrición | Objetivos diarios de calorías y macros según tu peso y objetivo (editables); registro de comidas por día, a mano o describiéndolas para que la IA calcule los macros; chat con un coach de nutrición IA que conoce tu objetivo y lo que llevas comido |
| Premium | Comparativa gratis/Premium, precio de la tienda, suscribirse, restaurar compras, gestionar o cancelar; enlaces a términos y privacidad (`public/legal.html`) |
| Ajustes | Premium, perfil, idioma, cambio de plan, exportar e importar copia de seguridad, borrar datos |

**Progresión doble:** si en la última sesión todas las series con el peso más alto llegaron al máximo del rango, la app sube el peso según el ejercicio y vuelve al mínimo del rango. Ejemplos: +5 kg en sentadilla, +2,5 kg en press de banca, +1 kg en elevaciones laterales; en libras, saltos de discos reales (+10 lb, +5 lb…). Si no se completa el rango, mantiene el peso y pide una repetición más. En los ejercicios con tu propio peso, sube repeticiones.

## Instalar

| Plataforma | Cómo |
| --- | --- |
| Android | En GitHub → Actions → **Native apps** → la última ejecución → artefacto `fitness-life-android` → instala `app-debug.apk` (el móvil pedirá permitir apps de fuentes desconocidas). |
| iPhone | Abre la web publicada en Safari → Compartir → **Añadir a pantalla de inicio**. Para la app nativa hace falta un Mac con Xcode: `npm run ios`. |
| Web | Cada push a `main` la publica en GitHub Pages. Actívalo una vez: Settings → Pages → Source: **GitHub Actions**. |

### Publicar en las tiendas

| Tienda | Qué necesitas | Pasos |
| --- | --- | --- |
| Google Play | Cuenta de desarrollador de Google Play (pago único de 25 USD) y una clave de firma | `npm run android`, en Android Studio: Build → Generate Signed App Bundle, y súbelo a Play Console. |
| App Store | Apple Developer Program (99 USD al año) y un Mac | `npm run ios`, en Xcode elige tu equipo de firma, Product → Archive y súbelo a App Store Connect / TestFlight. |

## Coach de nutrición con IA (opcional)

La app nunca lleva la clave de la IA. Llama a una función de Supabase ([`supabase/functions/nutrition-coach`](../supabase/functions/nutrition-coach/index.ts)) que guarda la clave de Anthropic, usa Claude y limita las consultas por dispositivo (30 al día por defecto). La app entra con un usuario anónimo; no se guardan datos personales en el servidor.

1. Crea un proyecto en [Supabase](https://supabase.com) y aplica la migración de `supabase/migrations` (crea la tabla `ai_usage`).
2. En Authentication → Sign In / Providers, activa **Anonymous sign-ins**.
3. Despliega la función y guarda la clave como secreto del servidor (nunca en la app ni en el repositorio):
   ```bash
   supabase functions deploy nutrition-coach
   supabase secrets set ANTHROPIC_API_KEY=...        # opcional: NUTRITION_DAILY_LIMIT=30
   ```
4. Da a la app la URL y la clave pública *anon* del proyecto: en local, en `app/.env.local`; para las builds de GitHub, como **variables** del repositorio (Settings → Secrets and variables → Actions → Variables):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
Sin estas variables, la app muestra que el asistente no está disponible y todo lo demás funciona.

## Suscripción Premium (4,99 US$ al mes)

La app es gratis. Premium sube las consultas de IA (coach y comidas calculadas) de 5 a 100 al mes: la IA es lo único que cuesta dinero mantener. Con Claude, cada consulta cuesta unos 0,02–0,05 US$, así que 100 consultas caben en lo que deja la suscripción después de la comisión de la tienda. Los límites se cambian con `FREE_MONTHLY_LIMIT` y `PREMIUM_MONTHLY_LIMIT` en la función (y `FREE_AI_USES` / `PREMIUM_AI_USES` en `src/lib/premium.ts`, solo para los textos).

Apple y Google obligan a cobrar las suscripciones digitales con sus propios pagos. [RevenueCat](https://www.revenuecat.com) une App Store, Google Play y la web (con Stripe) en una sola suscripción `premium`, y es gratis hasta 2.500 US$ de ingresos al mes. La app usa como identificador de RevenueCat el mismo usuario anónimo que la IA, así que la función comprueba en el servidor quién paga.

1. **Tiendas:** crea la suscripción mensual (por ejemplo `premium_monthly`) a 4,99 US$ en App Store Connect (necesitas el Apple Developer Program) y en Google Play Console. En Xcode, añade la capacidad **In-App Purchase** (Signing & Capabilities). Si quieres una prueba gratis, se configura ahí, sin tocar el código.
2. **RevenueCat:** crea el proyecto, añade las apps de iOS y Android y, si quieres vender en la web, **Web Billing** con tu cuenta de Stripe. Crea el entitlement `premium`, asígnale los productos y ponlos en la offering *current* como paquete mensual.
3. **Servidor:** `supabase secrets set REVENUECAT_SECRET_KEY=...` (la clave secreta de RevenueCat, solo en el servidor) y vuelve a desplegar `nutrition-coach`.
4. **App:** las claves públicas de SDK de RevenueCat van en `app/.env.local` o como variables del repositorio: `VITE_RC_IOS_KEY`, `VITE_RC_ANDROID_KEY` y `VITE_RC_WEB_KEY`.
5. **Probar:** haz una compra de prueba en sandbox (TestFlight o una cuenta de prueba de Google Play) y comprueba en Ajustes → Premium que pasa a «Premium activo» y en Nutrición que el límite sube a 100.

Sin las claves, la app no muestra la compra y todo lo gratis funciona igual. Antes de publicar, añade tu correo de soporte en la ficha de cada tienda: la política de privacidad remite a él.

## Idiomas

Los textos están en `src/i18n` (`es.ts` es la referencia; `en.ts` y `pt.ts` deben tener las mismas claves, lo comprueba TypeScript y un test). Los nombres y consejos de los ejercicios, programas y logros están junto a sus datos. Las fotos de los ejercicios son de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público) y se guardan en `public/exercises`, así funcionan sin conexión.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios (Vitest)
npm run e2e        # recorridos completos en un móvil simulado (Playwright)
npm run build      # web de producción en dist/
npm run native     # build + copia a los proyectos android/ e ios/
npm run android    # abre Android Studio
npm run ios        # abre Xcode (solo en macOS)
```

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/data` | Ejercicios (en 3 idiomas, con fotos) y programas |
| `src/i18n` | Traducciones y formato de números y fechas por idioma |
| `src/lib` | Lógica pura con tests: progresión, plan, estadísticas, logros, discos, entreno activo, nutrición; `ai.ts` para el coach IA; `premium.ts` para la suscripción; `native.ts` para las funciones del dispositivo |
| `src/store` | Estado de la app y su guardado |
| `src/pages`, `src/components` | Pantallas e interfaz |
| `android/`, `ios/` | Proyectos nativos (Capacitor) |
| `assets/` | Icono y pantalla de inicio de los que salen todos los tamaños nativos (`npx capacitor-assets generate`) |
| `e2e` | Recorridos completos en el navegador |
