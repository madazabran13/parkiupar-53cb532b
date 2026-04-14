/**
 * WAF Middleware — Basic Web Application Firewall.
 * Blocks SQL injection and XSS patterns. Returns 400 on detection.
 */
import type { Request, Response, NextFunction } from 'express';

const SQL_PATTERNS = [
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\b.*\b(FROM|INTO|TABLE|SET|WHERE)\b)/i,
  /(--)|(;.*\b(DROP|ALTER|DELETE)\b)/i,
  /(\'.*\bOR\b.*\')/i,
];

const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript\s*:/i,
  /on(load|error|click|mouseover)\s*=/i,
  /<iframe\b/i,
  /<img\b[^>]+\bonerror\b/i,
];

function containsMalicious(value: string): boolean {
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(value)) return true;
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) return true;
  }
  return false;
}

function scanObject(obj: unknown): boolean {
  if (typeof obj === 'string') return containsMalicious(obj);
  if (typeof obj === 'object' && obj !== null) {
    for (const val of Object.values(obj)) {
      if (scanObject(val)) return true;
    }
  }
  return false;
}

export function wafMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check URL
  if (containsMalicious(decodeURIComponent(req.originalUrl))) {
    res.status(400).json({ error: { code: 'WAF_BLOCKED', message: 'Solicitud bloqueada por seguridad' } });
    return;
  }

  // Check body
  if (req.body && scanObject(req.body)) {
    res.status(400).json({ error: { code: 'WAF_BLOCKED', message: 'Solicitud bloqueada por seguridad' } });
    return;
  }

  // Check query params
  if (scanObject(req.query)) {
    res.status(400).json({ error: { code: 'WAF_BLOCKED', message: 'Solicitud bloqueada por seguridad' } });
    return;
  }

  next();
}
