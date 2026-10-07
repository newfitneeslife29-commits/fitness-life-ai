# Fitness Life

App de entrenamiento de fuerza al estilo Lifta: te da un plan, registras cada serie en el gimnasio y te sugiere el peso de la próxima sesión.

- **Funciona sola:** sin cuenta, sin servidor y sin claves. Los datos se guardan en el dispositivo.
- **Se instala en el móvil:** es una PWA y funciona sin conexión.
- **En español**, en kg o en lb.

## Qué hace

| Pantalla | Qué hace |
| --- | --- |
| Bienvenida | 5 preguntas (objetivo, nivel, días, material, unidades) y genera un plan de 6 posibles |
| Hoy | Entrenos de la semana frente a tu objetivo, siguiente sesión del plan, racha y último entreno |
| Entreno | Series editables con columna «Anterior», peso sugerido, descanso con cuenta atrás y vibración, cambiar, añadir o quitar ejercicios. Sigue abierto si cierras la app |
| Resumen | Duración, volumen, series y récords batidos |
| Progreso | Entrenos por semana frente al objetivo, 1RM estimado por ejercicio, series por músculo, récords e historial |
| Rutinas | El plan en rotación y tus rutinas propias, con editor (series, rango de reps, descanso, orden) |
| Ejercicios | 45 ejercicios con músculo, material y consejo de técnica; historial y récord por ejercicio |
| Ajustes | Perfil, cambio de plan, exportar e importar copia de seguridad, borrar datos |

**Progresión doble:** si en la última sesión todas las series con el peso más alto llegaron al máximo del rango, la app sube el peso según el ejercicio (+5 kg sentadilla, +2,5 kg press de banca, +1 kg elevaciones laterales…) y vuelve al mínimo del rango. Si no, mantiene el peso y pide una repetición más. En los ejercicios con tu propio peso, sube repeticiones.

## Desarrollo

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios (Vitest)
npm run e2e        # tests de extremo a extremo en un móvil simulado (Playwright)
npm run build      # build de producción en dist/
```

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/data` | Ejercicios y programas |
| `src/lib` | Lógica pura con tests: progresión, plan, estadísticas, entreno activo |
| `src/store` | Estado de la app guardado en localStorage |
| `src/pages`, `src/components` | Pantallas e interfaz |
| `e2e` | Recorridos completos en el navegador |

## Publicarla

Cada push a `main` la publica en GitHub Pages (`.github/workflows/app-deploy.yml`). Solo hace falta activarlo una vez: Settings → Pages → Source: **GitHub Actions**.
