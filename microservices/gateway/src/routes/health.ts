/**
 * Health Check Route — Aggregated health from all microservices.
 */
import { Router } from 'express';
import { services } from './proxy.js';

const router = Router();

interface ServiceHealth {
  name: string;
  status: 'up' | 'down';
  responseTime?: number;
}

router.get('/health', async (_req, res) => {
  const results: ServiceHealth[] = [];

  await Promise.all(
    services.map(async (service) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${service.target}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        results.push({
          name: service.name,
          status: response.ok ? 'up' : 'down',
          responseTime: Date.now() - start,
        });
      } catch {
        results.push({ name: service.name, status: 'down', responseTime: Date.now() - start });
      }
    })
  );

  const allUp = results.every((r) => r.status === 'up');
  res.status(allUp ? 200 : 503).json({
    gateway: 'up',
    services: results,
  });
});

export { router as healthRouter };
