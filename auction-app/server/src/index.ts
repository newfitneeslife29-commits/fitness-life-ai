import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createApp } from './app.ts';
import { config } from './config.ts';
import { getDb } from './db.ts';
import { attachRealtime } from './realtime.ts';
import { startScheduler } from './scheduler.ts';
import { seedIfEmpty, startDemoBots } from './seed.ts';

if (config.jwtSecret === 'dev-secret-change-me' && process.env.NODE_ENV === 'production') {
  throw new Error('Define JWT_SECRET antes de arrancar en producción');
}

getDb();
seedIfEmpty();

const server = createServer(createApp());
attachRealtime(server);
startScheduler();
if (process.env.DEMO_BOTS === '1') {
  startDemoBots();
  console.log('Pujadores de demostración activados (DEMO_BOTS=1)');
}

server.listen(config.port, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  console.log(`Subastia API escuchando en http://localhost:${config.port}/api`);
  if (lan) console.log(`Desde el móvil (misma red Wi-Fi): http://${lan}:${config.port}/api`);
});
