import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { config } from './config.ts';
import { ApiError } from './errors.ts';
import { router } from './routes.ts';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ exposedHeaders: ['X-Server-Time'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));
  app.use('/api', router);

  app.use((_req: Request, _res: Response, next: NextFunction) => next(new ApiError(404, 'NOT_FOUND', 'Ruta no encontrada')));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.details } });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON no válido' } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno. Inténtalo de nuevo.' } });
  });
  return app;
}
