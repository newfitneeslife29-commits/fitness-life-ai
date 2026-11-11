import { fileURLToPath } from 'node:url';
import { startServer } from './server';

const port = Number(process.env.PORT ?? 3001);
const staticDir = fileURLToPath(new URL('../../web/dist', import.meta.url));
const dataFile = process.env.PARQUES_DATA ?? fileURLToPath(new URL('../data/db.json', import.meta.url));

startServer({ port, staticDir, dataFile });
console.log(`🎲 Servidor de Parqués en http://localhost:${port}  (datos: ${dataFile})`);
