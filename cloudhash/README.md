# CloudHash · Minería de Bitcoin en la nube

Plataforma donde los usuarios compran contratos de hashrate (TH/s) con tarjeta vía Stripe y reciben cada minuto
la producción proporcional, calculada con la dificultad real de la red y menos una comisión de mantenimiento.

## Puesta en marcha

```bash
cd cloudhash
npm install
cp .env.example .env   # opcional: sin claves de Stripe arranca en modo DEMO (sin cobro real)
npm start              # http://localhost:3000
npm test               # 5 pruebas: fórmula, flujo completo, límite de capacidad, retiros, webhook de Stripe
```

Requiere Node.js 22.13 o superior (usa `node:sqlite`, sin dependencias nativas).
El primer usuario que se registra es el administrador.

## Cobrar con Stripe

1. Crea una cuenta en Stripe y copia la clave secreta (`sk_test_…` para pruebas) en `STRIPE_SECRET_KEY`.
2. Crea un endpoint de webhook apuntando a `https://TU-DOMINIO/api/stripe/webhook` con los eventos
   `checkout.session.completed`, `checkout.session.async_payment_succeeded` y `checkout.session.expired`,
   y copia su secreto en `STRIPE_WEBHOOK_SECRET`. En local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Pon `BASE_URL` con tu dominio público y `NODE_ENV=production` (cookies `Secure`).

El contrato solo se activa cuando llega el webhook firmado, no por la redirección del navegador.

## Antes de usar dinero real

Esta app es legítima solo si cada TH/s vendido existe de verdad. Antes de pasar a `sk_live_`:

- Carga en **Admin → Capacidad real** los TH/s que tienes contratados o en tu granja; la app no vende más.
- Obtén asesoría legal y la licencia que exija tu país (VASP/CASP, KYC/AML) y confirma con Stripe que aprueba el negocio.
- Publica términos, privacidad y el aviso de riesgo: la rentabilidad nunca está garantizada.
- Paga los retiros desde una wallet con saldo limitado y registra el TXID en el panel de administración.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/server.js` | API Express: auth, planes, checkout Stripe, webhook, panel, retiros, administración |
| `src/engine.js` | Motor que acredita BTC cada 60 s por contrato activo |
| `src/network.js` | Dificultad (mempool.space) y precio (CoinGecko) con valores por defecto si fallan |
| `src/db.js` | Esquema SQLite y ajustes |
| `src/auth.js` | Contraseñas con scrypt y sesiones con cookie HttpOnly |
| `public/` | Interfaz web (HTML, CSS y JS sin build) |
| `test/` | Pruebas con `node --test` |
