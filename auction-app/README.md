# Subastia — app de subastas para iOS y Android

Implementación funcional de la guía [`docs/funcionamiento-app-subastas.md`](../docs/funcionamiento-app-subastas.md): subasta inglesa con puja automática, precio de reserva, compra inmediata, cierre ampliable anti-sniping, tiempo real, pagos protegidos (escrow), envíos, incidencias y valoraciones.

```
auction-app/
├── server/   API REST + WebSocket (Node 22, Express, Socket.IO, SQLite)
└── mobile/   App iOS/Android (Expo SDK 57, React Native, Expo Router, TypeScript)
```

## Puesta en marcha (5 minutos)

Requisitos: **Node.js 22.18 o superior** y la app **Expo Go** en tu móvil (o un simulador iOS / emulador Android).

```bash
# 1. Servidor
cd auction-app/server
npm install
DEMO_BOTS=1 npm run dev        # crea datos de demo la primera vez

# 2. App (en otra terminal)
cd auction-app/mobile
npm install
npx expo start                 # escanea el QR con Expo Go (misma Wi-Fi)
```

En desarrollo, la app detecta sola la IP del ordenador donde corre Metro y se conecta a `http://<esa-IP>:4000/api`. Para otro servidor, define `EXPO_PUBLIC_API_URL` (ver `mobile/.env.example`).

**Cuentas de demostración** (contraseña `subastia123`): `ana@demo.com`, `luis@demo.com`, `marta@demo.com`, `javier@demo.com`. La pantalla de inicio de sesión tiene botones para entrar con un toque. Con `DEMO_BOTS=1`, otros usuarios simulados pujan cada ~20 s para que veas el tiempo real y los avisos de "te han superado".

**Tarjetas de prueba** (pasarela simulada): `4242 4242 4242 4242` se aprueba; `4000 0000 0000 0002` se rechaza. Cualquier fecha futura y CVC.

Para reiniciar los datos de demo: `npm run seed` en `server/`.

## Qué incluye

| Área | Funcionalidad |
|---|---|
| Cuenta | Registro, inicio de sesión (JWT guardado en el llavero seguro del sistema), perfil público con valoraciones |
| Descubrir | Búsqueda, categorías, ordenaciones, paginación infinita, precios que se actualizan en vivo |
| Pujar | Puja automática hasta tu máximo, sugerencias de importe, desglose de comisión + IVA + envío antes de confirmar, claves de idempotencia, vibración al ganar o al ser superado |
| Reglas | Tabla de incrementos, reserva oculta, compra inmediata, anti-sniping (+2 min), el vendedor no puede pujar, límite de pujas por segundo, bloqueo por impagos |
| Tiempo real | WebSocket por subasta y por usuario, reloj sincronizado con el servidor, reconexión automática, avisos dentro de la app |
| Vender | Fotos desde galería o cámara, categoría, estado, reserva, compra inmediata, envío, duración, cálculo de lo que recibirás, moderación automática |
| Después del cierre | Pedido automático, plazo de pago de 48 h con recordatorio, pago protegido con libro contable de doble entrada, envío con seguimiento, confirmación de entrega, incidencias, liberación automática a los 14 días, valoraciones mutuas |
| Actividad | Mis pujas (ganando/superado), seguidas, avisos de "paga ahora" / "envía ahora", ventas, pedidos, notificaciones |
| Diseño | Modo claro y oscuro, áreas seguras, teclado, estados vacíos, de carga y de error |

## Calidad

```bash
cd server && npm test && npm run typecheck   # 13 pruebas: motor de pujas + flujo completo por HTTP
cd mobile && npx tsc --noEmit && npx eslint src
```

Las pruebas del motor incluyen el ejemplo de la guía (§7.3) y 300 secuencias aleatorias de pujas que comprueban que el precio nunca baja, que el líder siempre tiene el máximo más alto y que el precio nunca supera ese máximo. La prueba de integración recorre publicar → pujar → cerrar → pagar → enviar → confirmar → valorar y comprueba que el libro contable cuadra a cero.

## Arquitectura (resumen)

- **Motor de pujas puro** (`server/src/engine.ts`): sin entrada/salida, fácil de probar.
- **Concurrencia**: cada puja se procesa en una transacción `BEGIN IMMEDIATE`. Node ejecuta el JavaScript en un solo hilo y el driver de SQLite es síncrono, así que las pujas sobre una misma subasta nunca se intercalan (§14.2 de la guía). Al pasar a PostgreSQL, usa `SELECT … FOR UPDATE`.
- **El servidor manda en el tiempo**: todas las respuestas llevan `X-Server-Time` y la app corrige su reloj con él.
- **Programador** (`scheduler.ts`): abre y cierra subastas, envía recordatorios, marca impagos y completa pedidos. Todos los pasos son idempotentes: la restricción `UNIQUE(auction_id)` impide pedidos duplicados.
- **Pagos** (`services/payments.ts`): interfaz `PaymentProvider` con una implementación de pruebas.
- **Dinero** siempre en céntimos enteros.

## Publicar en App Store y Google Play

1. Despliega el servidor con HTTPS (Railway, Render, Fly.io, un VPS…) con `JWT_SECRET` definido y un disco persistente para `data/` y `uploads/`.
2. Cambia `EXPO_PUBLIC_API_URL` en `mobile/eas.json` por la URL real de tu API.
3. Ajusta `name`, `ios.bundleIdentifier` y `android.package` en `mobile/app.json`, y sustituye los iconos de `mobile/assets/`.
4. Compila y envía con EAS (no necesitas Xcode ni Android Studio):
   ```bash
   cd mobile
   npx eas-cli@latest login
   npx eas-cli@latest build --platform all --profile production
   npx eas-cli@latest submit --platform all
   ```
   Para probar en dispositivos antes de publicar: `--profile preview` genera un APK de Android y una build interna de iOS.

## Antes de producción

Partes del MVP que aún usan sustitutos o faltan:

- **Pagos reales**: implementa `PaymentProvider` con Stripe Connect, Adyen o Mangopay (PaymentIntent + 3-D Secure + webhooks). La pasarela de pruebas actual no cobra dinero.
- **Notificaciones push** con la app cerrada: añade `expo-notifications`, guarda el token Expo Push de cada usuario y envíalo desde `server/src/notifications.ts`. Ahora mismo los avisos llegan en tiempo real con la app abierta y quedan en la bandeja de notificaciones.
- **Base de datos**: SQLite basta para un MVP en una sola instancia. Para varias instancias, usa PostgreSQL y el adaptador de Redis para Socket.IO.
- **Imágenes**: muévelas a S3/GCS + CDN con URLs firmadas.
- **KYC de vendedores, panel de administración, resolución de disputas, verificación de email, recuperación de contraseña y textos legales** (Términos, Privacidad, RGPD): pendientes (fases 2 y 3 de la guía).
