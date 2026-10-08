# Fitness Life

App de entrenamiento de fuerza para **iOS, Android y web**. Te da un plan, registras cada serie en el gimnasio y te sugiere el peso de la próxima sesión.

- **Funciona sola:** sin cuenta, sin servidor y sin claves. Los datos se guardan en el dispositivo; en las apps nativas, también en el almacenamiento del sistema.
- **Funciona sin conexión**, en español, en kg o en lb.

## Funciones

| Pantalla | Qué hace |
| --- | --- |
| Bienvenida | 5 preguntas (objetivo, nivel, días, material, unidades) y genera un plan de 6 posibles |
| Hoy | Anillo de entrenos de la semana, siguiente sesión del plan, racha, logros y último entreno |
| Entreno | Series editables con columna «Anterior» y peso sugerido; descanso con cuenta atrás, vibración y notificación aunque el móvil esté bloqueado; calculadora de discos y calentamiento; cambiar, añadir o quitar ejercicios; pantalla siempre encendida. Sigue abierto si cierras la app |
| Resumen | Duración, volumen, series, récords y logros nuevos; notas y compartir |
| Progreso | Entrenos por semana frente al objetivo, calendario de 18 semanas, 1RM estimado por ejercicio, series por músculo, peso corporal, récords e historial |
| Logros | 14 medallas: constancia, rachas, récords, toneladas movidas… |
| Rutinas | El plan en rotación y tus rutinas propias, con editor de series, rango de reps, descanso y orden |
| Ejercicios | 45 ejercicios con músculo, material y consejo de técnica; historial y récord de cada uno |
| Ajustes | Perfil, cambio de plan, exportar e importar copia de seguridad, borrar datos |

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
| `src/data` | Ejercicios y programas |
| `src/lib` | Lógica pura con tests: progresión, plan, estadísticas, logros, discos, entreno activo; `native.ts` para las funciones del dispositivo |
| `src/store` | Estado de la app y su guardado |
| `src/pages`, `src/components` | Pantallas e interfaz |
| `android/`, `ios/` | Proyectos nativos (Capacitor) |
| `assets/` | Icono y pantalla de inicio de los que salen todos los tamaños nativos (`npx capacitor-assets generate`) |
| `e2e` | Recorridos completos en el navegador |
