/**
 * Shared Middleware — Zod validation, internal guard, centralized error handler.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { DomainError } from './errors.js';
import { sendNoContent } from './response.js';

/**
 * Zod validation middleware factory.
 * Validates req.body against the given schema.
 */
export function validate(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Guards internal-only endpoints.
 * Verifies x-internal-secret header matches INTERNAL_SECRET env var.
 */
export function guardInternal(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-internal-secret'] as string | undefined;
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    sendNoContent(res);
    return;
  }
  next();
}

/**
 * Centralized error handler middleware.
 * Maps DomainError and ZodError to proper HTTP responses.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: err.errors[0]?.message ?? 'Datos inválidos',
      errors: err.errors,
    });
    return;
  }

  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
}
