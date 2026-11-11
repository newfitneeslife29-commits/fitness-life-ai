# Parqués 🎲🇨🇴

Parqués colombiano moderno para el navegador y el celular (PWA instalable): tablero clásico, contra la máquina,
local, parejas, Modo Rápido, online con amigos, torneos, tienda de skins, misiones y mucho más.

## Probar
```bash
cd parques
npm install
npm run dev          # app en http://localhost:5173
npm run dev:server   # (otra terminal) servidor online para partidas en línea, ranking y torneo
```
- Celular en la misma red Wi-Fi: abre `http://<IP-de-tu-PC>:5173`.
- Todo en un solo puerto (como producción): `npm start` y abre `http://localhost:3001`.
- `?speed=10` en la URL acelera animaciones y bots.

## Pruebas
```bash
npm test         # motor (75), web (18) y servidor (14)
npm run demo     # partida de 4 bots narrada en la consola
```

El contexto completo para desarrollar (reglas, arquitectura y convenciones) está en [CLAUDE.md](./CLAUDE.md).
