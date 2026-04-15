/**
 * Proxy Routes — Circuit breaker + reverse proxy per microservice.
 * Uses opossum for circuit breaking and http-proxy-middleware for proxying.
 */
import { Router, type Request, type Response } from 'express';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import CircuitBreaker from 'opossum';

interface ServiceConfig {
  name: string;
  path: string;
  target: string;
  pathRewrite: Record<string, string> | ((path: string) => string);
}

const services: ServiceConfig[] = [
  {
    name: 'ms-auth',
    path: '/api/auth',
    target: 'http://ms-auth:3001',
    // Express strips /api/auth before passing to the proxy, so req.url is e.g. /login.
    // Prepend /v1/auth to reconstruct the full microservice path.
    pathRewrite: { '^': '/v1/auth' },
  },
  {
    name: 'ms-vehiculos',
    path: '/api/vehicles',
    target: 'http://ms-vehiculos:3002',
    pathRewrite: { '^': '/v1/vehicles' },
  },
  {
    name: 'ms-parqueaderos',
    path: '/api/parkings',
    target: 'http://ms-parqueaderos:3003',
    pathRewrite: { '^': '/v1/parkings' },
  },
  {
    name: 'ms-reservas',
    path: '/api/reservations',
    target: 'http://ms-reservas:3004',
    pathRewrite: { '^': '/v1/reservations' },
  },
  {
    name: 'ms-reportes',
    path: '/api/reports',
    target: 'http://ms-reportes:3005',
    // /graphql stays as-is; everything else gets prefixed with /v1/reports
    pathRewrite: (path) => path.startsWith('/graphql') ? path : `/v1/reports${path}`,
  },
];

const circuitBreakerOptions = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000,
  volumeThreshold: 5,
};

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(name: string, action: () => Promise<unknown>): CircuitBreaker {
  if (!breakers.has(name)) {
    const breaker = new CircuitBreaker(action, circuitBreakerOptions);
    breaker.on('open', () => console.warn(`[CIRCUIT_BREAKER] ${name} abierto`));
    breaker.on('halfOpen', () => console.info(`[CIRCUIT_BREAKER] ${name} semi-abierto`));
    breaker.on('close', () => console.info(`[CIRCUIT_BREAKER] ${name} cerrado`));
    breakers.set(name, breaker);
  }
  return breakers.get(name)!;
}

export function createProxyRoutes(): Router {
  const router = Router();

  for (const service of services) {
    const proxyOptions: Options = {
      target: service.target,
      changeOrigin: true,
      pathRewrite: service.pathRewrite,
      on: {
        proxyReq(proxyReq, req) {
          // Re-attach body consumed by express.json() so the downstream service receives it.
          const body = (req as Request).body;
          if (body && Object.keys(body).length > 0) {
            const bodyData = JSON.stringify(body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }

          // Forward internal secret
          const internalSecret = (req as Request).headers['x-internal-secret'];
          if (internalSecret) {
            proxyReq.setHeader('x-internal-secret', internalSecret as string);
          }
          // Forward user headers
          const userId = (req as Request).headers['x-user-id'];
          const userEmail = (req as Request).headers['x-user-email'];
          const userRol = (req as Request).headers['x-user-rol'];
          if (userId) proxyReq.setHeader('x-user-id', userId as string);
          if (userEmail) proxyReq.setHeader('x-user-email', userEmail as string);
          if (userRol) proxyReq.setHeader('x-user-rol', userRol as string);
        },
        error(err, _req, res) {
          console.error(`[PROXY_ERROR] ${service.name}:`, err.message);
          if ('writeHead' in res) {
            (res as Response).status(503).json({
              error: { code: 'SERVICE_UNAVAILABLE', message: `Servicio ${service.name} no disponible` },
            });
          }
        },
      },
    };

    const proxy = createProxyMiddleware(proxyOptions);
    router.use(service.path, proxy);
    console.log(`[PROXY] ${service.path}/* → ${service.target}`);
  }

  return router;
}

export { services };
