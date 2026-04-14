/**
 * Shared Middleware — Zod validation, internal guard, centralized error handler.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { DomainError } from './errors.js';
import { sendError } from './response.js';

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
    sendError(res, 403, 'FORBIDDEN', 'Acceso interno requerido');
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
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 422, 'VALIDATION_FAILED', 'Error de validación', err.issues);
    return;
  }

  console.error('[ERROR]', err.message, err.stack);
  sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor');
}
