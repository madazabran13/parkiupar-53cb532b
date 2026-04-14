/**
 * Auth Guard Middleware — Verifies JWT and injects user headers.
 * Public routes bypass this middleware.
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
}

const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/refresh' },
  { method: 'GET', path: '/health' },
];

function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some(
    (r) => r.method === method.toUpperCase() && path.startsWith(r.path)
  );
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  if (isPublicRoute(req.method, req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token requerido' } });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[AUTH_GUARD] JWT_SECRET no configurado');
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: 'Error de configuración del servidor' } });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    // Inject user info as headers for downstream microservices
    req.headers['x-user-id'] = decoded.sub;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-rol'] = decoded.rol;
    req.headers['x-internal-secret'] = process.env.INTERNAL_SECRET || '';
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado' } });
  }
}
