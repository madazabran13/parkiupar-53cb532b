/**
 * Rate Limiter Middleware — 100 requests/min per IP.
 */
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
    },
  },
});
