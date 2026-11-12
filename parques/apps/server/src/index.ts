import { fileURLToPath } from 'node:url';
import { startServer } from './server';

const port = Number(process.env.PORT ?? 3001);
const staticDir = fileURLToPath(new URL('../../web/dist', import.meta.url));
// Producción: DATABASE_URL = Postgres de Supabase. Desarrollo: PGlite en una carpeta local.
const databaseUrl = process.env.DATABASE_URL || null;
if (!databaseUrl && process.env.RAILWAY_ENVIRONMENT) {
  // En Railway el disco se borra en cada publicación: sin Postgres se perderían cuentas y compras.
  console.error('Falta DATABASE_URL (la conexión a Postgres de Supabase). Agrégala en las variables del servicio en Railway.');
  process.exit(1);
}
const dataDir = databaseUrl ? null : (process.env.PARQUES_DATA ?? fileURLToPath(new URL('../data/pglite', import.meta.url)));

// Tiempos configurables (útil para pruebas): PARQUES_TURN_MS, PARQUES_BOT_MS.
const timing = {
  ...(process.env.PARQUES_TURN_MS ? { turnMs: Number(process.env.PARQUES_TURN_MS) } : {}),
  ...(process.env.PARQUES_BOT_MS ? { botDelayMs: Number(process.env.PARQUES_BOT_MS) } : {}),
};
const server = startServer({ port, staticDir, databaseUrl, dataDir, timing });
server.store.ready().then(
  () => console.log(`🎲 Servidor de Parqués en el puerto ${port} (datos: ${databaseUrl ? 'Postgres' : dataDir})`),
  (e) => {
    console.error('No se pudo abrir la base de datos:', e instanceof Error ? e.message : e);
    process.exit(1);
  },
);

// Railway detiene el contenedor con SIGTERM al publicar una versión nueva.
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, () => {
    server.close().finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  });
}
