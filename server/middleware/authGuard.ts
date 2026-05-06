import type { MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';
import { AppError } from '../lib/errors';

export interface AuthUser {
  sub: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  app_metadata?: Record<string, unknown>;
}

export function authGuardMiddleware(jwtSecret: string): MiddlewareHandler {
  const secret = new TextEncoder().encode(jwtSecret);

  return async (c, next) => {
    const header = c.req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Token de acceso requerido');
    }
    const token = header.slice(7);
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      const meta = (payload.app_metadata ?? {}) as Record<string, unknown>;
      const user: AuthUser = {
        sub: String(payload.sub),
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: typeof meta.role === 'string' ? meta.role : undefined,
        tenant_id: typeof meta.tenant_id === 'string' ? meta.tenant_id : undefined,
        app_metadata: meta,
      };
      c.set('user', user);
      await next();
    } catch {
      throw new AppError('UNAUTHORIZED', 'Token inválido o expirado');
    }
  };
}
