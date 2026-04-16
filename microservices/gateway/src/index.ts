/**
 * API Gateway — Single entry point for the microservices architecture.
 * Responsibilities: Reverse proxy, WAF, JWT auth, rate limiting, circuit breaker, CORS.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { wafMiddleware } from './middleware/waf.js';
import { authGuard } from './middleware/authGuard.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { createProxyRoutes } from './routes/proxy.js';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// ── Prevent gateway from crashing on unhandled promise rejections ──
process.on('unhandledRejection', (reason) => {
  console.error('[GATEWAY] UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[GATEWAY] UncaughtException:', err.message, err.stack);
});

// ── Security Headers ──
app.use(helmet({ xPoweredBy: false }));
app.disable('x-powered-by');

// Remove Server header
app.use((_req, res, next) => {
  res.removeHeader('Server');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// ── CORS — Only allow frontend origin ──
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parser with 1MB limit ──
app.use(express.json({ limit: '1mb' }));

// ── WAF ──
app.use(wafMiddleware);

// ── Rate Limiting ──
app.use(rateLimiter);

// ── Health Check (public, before auth) ──
app.use(healthRouter);

// ── JWT Auth Guard ──
app.use(authGuard);

// ── Proxy Routes ──
app.use(createProxyRoutes());

// ── Start ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GATEWAY] Listening on port ${PORT}`);
  console.log(`[GATEWAY] CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});

export default app;
