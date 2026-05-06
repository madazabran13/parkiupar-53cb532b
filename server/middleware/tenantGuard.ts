import type { MiddlewareHandler } from 'hono';
import { AppError } from '../lib/errors';
import type { AuthUser } from './authGuard';

export const tenantGuardMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as AuthUser | undefined;
  if (user?.role === 'superadmin') return next();
  if (!user?.tenant_id) {
    throw new AppError('FORBIDDEN', 'Usuario sin tenant asignado');
  }
  await next();
};
