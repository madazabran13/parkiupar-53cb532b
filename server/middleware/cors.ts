import { cors } from 'hono/cors';

export function corsMiddleware(allowedOrigins: string) {
  const list = allowedOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return cors({
    origin: (origin) => {
      if (!origin) return null;
      if (list.includes(origin)) return origin;
      if (list.some((p) => p.endsWith('*.vercel.app') && origin.endsWith('.vercel.app'))) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    credentials: false,
    maxAge: 600,
  });
}
