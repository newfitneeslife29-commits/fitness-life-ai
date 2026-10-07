# Fitness Life AI

App de entrenamiento de fuerza: plan, registro de series, progresión automática, coach IA y suscripción Premium.

Stack: React 19 + Vite + TypeScript en el cliente; Supabase (Auth, Postgres con RLS, Edge Functions) en el servidor; Gemini para la IA y Stripe para los pagos.

## Arquitectura en una línea

El navegador solo habla con Supabase. Las claves secretas (Gemini, Stripe) viven en Edge Functions, y Premium solo lo activa el webhook de Stripe.

```
app (React)  ──SDK──▶  Supabase Auth / Postgres + RLS
             ──────▶  Edge Function ai-coach  ──▶  Gemini
Stripe       ──────▶  Edge Function stripe-webhook  ──▶  profiles.is_premium
```

## Puesta en marcha

Requisitos: Node 20+, la [CLI de Supabase](https://supabase.com/docs/guides/cli) y un proyecto de Supabase.

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env.local` y rellena la URL y la clave anónima de Supabase y el Payment Link de Stripe. Solo van ahí valores públicos.
3. Aplica la migración (activa RLS, protege `is_premium` y crea las tablas de entrenos):
   ```bash
   supabase link --project-ref <tu-proyecto>
   supabase db push
   ```
   O pega `supabase/migrations/*.sql` en el editor SQL de Supabase. Se puede ejecutar más de una vez.
4. Guarda los secretos y despliega las funciones:
   ```bash
   supabase secrets set GEMINI_API_KEY=... STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
   supabase functions deploy ai-coach
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
5. En Stripe:
   - Webhook hacia `https://<tu-proyecto>.supabase.co/functions/v1/stripe-webhook` con los eventos `checkout.session.completed`, `customer.subscription.updated` y `customer.subscription.deleted`.
   - En el Payment Link, redirección tras el pago a `https://<tu-app>/#/onboarding?premium=true`. La app solo muestra “confirmando pago” y espera a que el webhook active Premium.
6. Arranca la app:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run build` | Build de producción en `dist/` (no se sube al repo) |
| `npm test` | Tests de la lógica de progresión (`lib/progression.test.ts`) |
| `npm run typecheck` | Comprobación de tipos con TypeScript |

## Dónde está cada cosa

| Ruta | Contenido |
| --- | --- |
| `components/ActiveTraining.tsx` | Reproductor de entreno: precarga el peso sugerido y guarda cada serie |
| `components/Progress.tsx` | Resumen de la sesión, gráfica de 1RM estimado, récords e historial |
| `services/workoutService.ts` | Guardado de sesiones y series con cola offline (localStorage) |
| `lib/progression.ts` | 1RM (Epley), volumen, doble progresión, récords, kg/lb |
| `services/geminiService.ts` | Cliente del coach IA (llama a la Edge Function `ai-coach`) |
| `supabase/functions/ai-coach` | Proxy a Gemini con la clave en el servidor y cuota por usuario |
| `supabase/functions/stripe-webhook` | Único punto que activa o desactiva Premium |
| `supabase/migrations` | Esquema, RLS y triggers |

## Seguridad

- Nunca pongas claves secretas en variables `VITE_*` ni en `vite.config.ts`: acaban en el JavaScript público.
- Una versión anterior subió `dist/` con la clave de Gemini dentro. Esa clave debe revocarse en Google AI Studio y sustituirse por una nueva guardada solo como secreto de Supabase.
