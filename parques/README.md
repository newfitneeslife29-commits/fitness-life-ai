# Parqués 🎲🇨🇴

Parqués colombiano **online** para iOS, Android y navegador: tablero clásico en 3D, partidas contra la máquina y entre
personas, mesas con apuesta, Sala Élite y Top Leyendas, torneos, ranking, pase de batalla, más de 1.200 logros y 4 idiomas.
El servidor guarda las cuentas y es la autoridad del juego (sin trampas).

## Probar en el computador
```bash
cd parques
npm install
npm run dev:server   # servidor online (cuentas, partidas, pagos) en :3001
npm run dev          # en otra terminal: la app en http://localhost:5173
```
Celular en la misma red Wi-Fi: abre `http://<IP-de-tu-PC>:5173`.

## Apps iOS y Android
```bash
cd parques/apps/web
cp .env.mobile.example .env.mobile   # pon la URL HTTPS de tu servidor y las llaves de RevenueCat
npm run android      # abre Android Studio  → Run ▶ (emulador o celular)
npm run ios          # abre Xcode (solo en Mac) → Run ▶
```
Para publicar: en Android Studio *Build → Generate Signed Bundle* (Google Play) y en Xcode *Product → Archive* (App Store).

## Servidor en producción
```bash
cd parques && npm start             # compila la web y sirve todo en el puerto 3001 (PORT para cambiarlo)
```
Variables: `PARQUES_DATA` (archivo de la base SQLite), `STRIPE_SECRET_KEY` (pagos web), `REVENUECAT_SECRET_KEY`
(compras en Google Play / App Store), `PARQUES_DEMO_PURCHASES=off` (apaga las compras de prueba). Debe ir detrás de HTTPS.

## Pruebas
```bash
npm test         # motor (107), servidor (24) y web (11)
```

El contexto completo para desarrollar está en [CLAUDE.md](./CLAUDE.md).
