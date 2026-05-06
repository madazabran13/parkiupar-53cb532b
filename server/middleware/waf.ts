import type { MiddlewareHandler } from 'hono';
import { AppError } from '../lib/errors';

const SQL_INJECTION = /\b(union\s+select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from|drop\s+(table|database)|truncate\s+table|alter\s+table|exec\s*\(|xp_cmdshell)\b/i;
const SCRIPT_TAG = /<\s*script\b|javascript:|on\w+\s*=/i;
const PATH_TRAVERSAL = /\.\.[\/\\]/;
const PROTOTYPE_POLLUTION = /(__proto__|constructor\.prototype|prototype\[)/i;
const NOSQL_OPERATORS = /\$(?:ne|gt|lt|gte|lte|in|nin|where|regex|exists|expr)\b/;

const PATTERNS: Array<{ name: string; rx: RegExp }> = [
  { name: 'sqli', rx: SQL_INJECTION },
  { name: 'xss', rx: SCRIPT_TAG },
  { name: 'traversal', rx: PATH_TRAVERSAL },
  { name: 'prototype', rx: PROTOTYPE_POLLUTION },
  { name: 'nosql_op', rx: NOSQL_OPERATORS },
];

function scan(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    for (const p of PATTERNS) if (p.rx.test(value)) return p.name;
    return null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = scan(v);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      for (const p of PATTERNS) if (p.rx.test(k)) return p.name;
      const hit = scan(v);
      if (hit) return hit;
    }
  }
  return null;
}

export const wafMiddleware: MiddlewareHandler = async (c, next) => {
  const url = new URL(c.req.url);
  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    queryParams[k] = v;
  });
  const queryHit = scan(queryParams);
  if (queryHit) throw new AppError('WAF_BLOCK', `WAF: query bloqueado (${queryHit})`);

  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const ct = c.req.header('content-type') ?? '';
    if (ct.includes('application/json')) {
      try {
        const body = await c.req.json();
        const bodyHit = scan(body);
        if (bodyHit) throw new AppError('WAF_BLOCK', `WAF: body bloqueado (${bodyHit})`);
        c.set('parsedBody', body);
      } catch (e) {
        if (e instanceof AppError) throw e;
      }
    }
  }
  await next();
};
