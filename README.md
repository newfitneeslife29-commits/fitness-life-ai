# Fitness Life

App de entrenamiento de fuerza para iOS, Android y web: te da un plan, registras cada serie y te sugiere el peso de la próxima sesión.

| Carpeta | Contenido |
| --- | --- |
| [`app/`](app/) | La app (React + TypeScript + Capacitor). Empieza por su [README](app/README.md). |
| `.github/workflows/` | Tests en cada push, publicación web en GitHub Pages y compilación de las apps de Android e iOS. |
| `supabase/` | Backend opcional: la función `nutrition-coach` (coach de nutrición con Claude) y la migración. Sin él, la app funciona entera salvo la IA. Ver el [README de la app](app/README.md#coach-de-nutrición-con-ia-opcional). |

```bash
cd app
npm install
npm run dev
```
