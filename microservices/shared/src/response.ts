/**
 * Standardized HTTP Response Helpers.
 * Format: { data, meta } for success, { error: { code, message, details? } } for errors.
 */
import { randomUUID } from 'crypto';
import type { Response } from 'express';

export interface SuccessMeta {
  timestamp: string;
  requestId: string;
}

export interface SuccessResponse<T> {
  data: T;
  meta: SuccessMeta;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function buildMeta(): SuccessMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId: randomUUID(),
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ data, meta: buildMeta() });
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(res: Response, statusCode: number, code: string, message: string, details?: unknown): void {
  const body: ErrorResponse = { error: { code, message } };
  if (details) body.error.details = details;
  res.status(statusCode).json(body);
}
