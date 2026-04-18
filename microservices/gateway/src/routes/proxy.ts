/**
 * Proxy Routes — Reverse proxy per microservice.
 * Uses http-proxy-middleware v3 pattern: path included in target URL.
 *
 * v3 BREAKING CHANGE: When mounted via router.use('/prefix', proxy), Express strips
 * the prefix from req.url before passing it to the proxy. So the proxy already receives
 * the sub-path (e.g. /login), and we only need to set the correct base path in target.
 *
 * pathRewrite is NOT used here because:
 * - { '^': '/prefix' } in v3 produces /prefixlogin instead of /prefix/login
 * - function-based pathRewrite was removed in v3
 *
 * Solution: include the microservice base path directly in the target.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { ClientRequest } from 'http';

/** Entry used by the health check route. */
export interface ServiceEntry {
  name: string;
  path: string;
  target: string;
}

/** Aggregated health-check targets (one per physical microservice). */
export const services: ServiceEntry[] = [
  { name: 'ms-auth', path: '/api/auth', target: 'http://ms-auth:3001' },
  { name: 'ms-vehiculos', path: '/api/vehicles', target: 'http://ms-vehiculos:3002' },
  { name: 'ms-parqueaderos', path: '/api/parkings', target: 'http://ms-parqueaderos:3003' },
  { name: 'ms-reservas', path: '/api/reservations', target: 'http://ms-reservas:3004' },
  { name: 'ms-reportes', path: '/api/reports', target: 'http://ms-reportes:3005' },
];

/** Internal proxy table — same services but with the full base path baked into target. */
const proxyTable: Array<{ name: string; path: string; target: string }> = [
  {
    name: 'ms-auth',
    path: '/api/auth',
    target: 'http://ms-auth:3001/v1/auth',
  },
  {
    name: 'ms-vehiculos',
    path: '/api/vehicles',
    target: 'http://ms-vehiculos:3002/v1/vehicles',
  },
  {
    name: 'ms-parqueaderos',
    path: '/api/parkings',
    target: 'http://ms-parqueaderos:3003/v1/parkings',
  },
  {
    name: 'ms-reservas',
    path: '/api/reservations',
    target: 'http://ms-reservas:3004/v1/reservations',
  },
  // ms-reportes: /graphql stays at root, everything else goes to /v1/reports.
  // Registered first (more specific) so it takes priority.
  {
    name: 'ms-reportes-graphql',
    path: '/api/reports/graphql',
    target: 'http://ms-reportes:3005/graphql',
  },
  {
    name: 'ms-reportes',
    path: '/api/reports',
    target: 'http://ms-reportes:3005/v1/reports',
  },
];

/**
 * Builds a proxyReq hook that re-attaches the body parsed by express.json()
 * and forwards the user / auth headers injected by authGuard.
 */
function makeProxyReqHandler(name: string) {
  return function proxyReqHandler(proxyReq: ClientRequest, req: Request): void {
    console.log(`[PROXY] ${name} → ${proxyReq.method} ${proxyReq.path}`);

    // Re-attach body consumed by express.json() so the downstream service receives it.
    const body = req.body as Record<string, unknown> | undefined;
    if (body && Object.keys(body).length > 0) {
      const bodyData = JSON.stringify(body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }

    // Forward internal secret injected by authGuard
    const internalSecret = req.headers['x-internal-secret'];
    if (internalSecret) {
      proxyReq.setHeader('x-internal-secret', internalSecret as string);
    }
    // Forward user identity headers injected by authGuard
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRol = req.headers['x-user-rol'];
    if (userId) proxyReq.setHeader('x-user-id', userId as string);
    if (userEmail) proxyReq.setHeader('x-user-email', userEmail as string);
    if (userRol) proxyReq.setHeader('x-user-rol', userRol as string);
  };
}

export function createProxyRoutes(): Router {
  const router = Router();

  for (const service of proxyTable) {
    const handler = makeProxyReqHandler(service.name);

    const proxy = createProxyMiddleware({
      target: service.target,
      changeOrigin: true,
      on: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proxyReq: handler as any,
        error(err, _req, res) {
          console.error(`[PROXY_ERROR] ${service.name}:`, (err as Error).message);
          const response = res as Response;
          if (!response.headersSent) {
            response.status(503).json({
              error: { code: 'SERVICE_UNAVAILABLE', message: `Servicio ${service.name} no disponible` },
            });
          }
        },
      },
    });

    router.use(service.path, proxy);
    console.log(`[PROXY] Registered: ${service.path} → ${service.target}`);
  }

  return router;
}
