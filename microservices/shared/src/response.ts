import type { Response } from 'express';

type ApiResponseOptions = {
  message?: string;
  meta?: unknown;
};

export function sendSuccess(
  res: Response,
  data: unknown,
  options: ApiResponseOptions = {}
): void {
  const { message = 'OK', meta } = options;

  res.status(200).json({
    success: true,
    message,
    data,
    instance: process.env.INSTANCE_NAME || 'unknown',
    ...(meta !== undefined ? { meta } : {}),
  });
}

export function sendCreated(
  res: Response,
  data: unknown,
  options: ApiResponseOptions = {}
): void {
  const { message = 'Creado correctamente', meta } = options;

  res.status(201).json({
    success: true,
    message,
    data,
    instance: process.env.INSTANCE_NAME || 'unknown',
    ...(meta !== undefined ? { meta } : {}),
  });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}