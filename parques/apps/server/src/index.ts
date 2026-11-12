import { fileURLToPath } from 'node:url';
import { startServer } from './server';

const port = Number(process.env.PORT ?? 3001);
const staticDir = fileURLToPath(new URL('../../web/dist', import.meta.url));
const dataFile = process.env.PARQUES_DATA ?? fileURLToPath(new URL('../data/parques.db', import.meta.url));

// Tiempos configurables (útil para pruebas): PARQUES_TURN_MS, PARQUES_BOT_MS.
const timing = {
  ...(process.env.PARQUES_TURN_MS ? { turnMs: Number(process.env.PARQUES_TURN_MS) } : {}),
  ...(process.env.PARQUES_BOT_MS ? { botDelayMs: Number(process.env.PARQUES_BOT_MS) } : {}),
};
startServer({ port, staticDir, dataFile, timing });
console.log(`🎲 Servidor de Parqués en http://localhost:${port}  (datos: ${dataFile})`);
