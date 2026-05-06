import type { MiddlewareHandler } from 'hono';
import { Redis } from '@upstash/redis';
import { AppError } from '../lib/errors';
import { log } from '../lib/log';

interface Options {
  url?: string;
  token?: string;
  windowSeconds: number;
  max: number;
  keyPrefix: string;
}

export function rateLimitMiddleware(opts: Options): MiddlewareHandler {
  const enabled = !!(opts.url && opts.token);
  const redis = enabled ? new Redis({ url: opts.url!, token: opts.token! }) : null;

  return async (c, next) => {
    if (!redis) return next();

    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('cf-connecting-ip') ??
      'unknown';
    const key = `${opts.keyPrefix}:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, opts.windowSeconds);
      if (count > opts.max) {
        c.header('Retry-After', String(opts.windowSeconds));
        throw new AppError('TOO_MANY_REQUESTS', 'Rate limit excedido');
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      log.warn('rate_limit_unavailable', { err: String(err) });
    }
    await next();
  };
}
