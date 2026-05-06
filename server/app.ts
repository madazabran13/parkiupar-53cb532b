import { Hono } from 'hono';
import { ZodError } from 'zod';
import { loadEnv } from './lib/env';
import { AppError } from './lib/errors';
import { log } from './lib/log';
import { corsMiddleware } from './middleware/cors';
import { secureHeadersMiddleware } from './middleware/secureHeaders';
import { wafMiddleware } from './middleware/waf';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { parkingRoutes } from './routes/parking';

export function createApp(rawEnv: Record<string, string | undefined>) {
  const env = loadEnv(rawEnv);
  const app = new Hono().basePath('/api');

  app.use('*', secureHeadersMiddleware);
  app.use('*', corsMiddleware(env.ALLOWED_ORIGINS));
  app.use(
    '*',
    rateLimitMiddleware({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
      windowSeconds: 60,
      max: 100,
      keyPrefix: 'rl:global',
    }),
  );
  app.use('*', wafMiddleware);

  app.get('/health', (c) => c.json({ status: 'ok', t: Date.now() }));

  app.route('/parking', parkingRoutes(env));

  app.onError((err, c) => {
    if (err instanceof AppError) {
      log.warn('app_error', { code: err.code, msg: err.message, path: c.req.path });
      return c.json(err.toJSON(), err.status as 400 | 401 | 403 | 404 | 422 | 429 | 500);
    }
    if (err instanceof ZodError) {
      log.warn('zod_error', { path: c.req.path });
      return c.json(
        { code: 'UNPROCESSABLE_ENTITY', message: 'Validación fallida', details: err.issues },
        422,
      );
    }
    log.error('unhandled', { err: String(err), path: c.req.path });
    return c.json({ code: 'INTERNAL', message: 'Error interno' }, 500);
  });

  app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Ruta no encontrada' }, 404));

  return app;
}
