# Parqués Bacano 🎲🇨🇴

Parqués colombiano moderno para el navegador y el celular (PWA).

## Estado
- **Fase 1 — Motor de reglas:** lista. Incluye todas las reglas, las reglas de la casa, la IA de 3 niveles y las pruebas.
- **Fase 2 — Juego en el navegador:** lista. Tablero de 4 y 6 jugadores, dados y fichas animados, partida contra la máquina, local, parejas y Modo Rápido, pantalla de victoria y PWA instalable.

## Probar
```bash
cd parques
npm install
npm test        # pruebas del motor
npm run demo    # partida de 4 bots narrada en la consola
npm run dev -w @parques/web   # abre http://localhost:5173
```

El contexto completo para desarrollar (reglas, arquitectura y convenciones) está en [CLAUDE.md](./CLAUDE.md).
