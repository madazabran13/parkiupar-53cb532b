import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const plateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{3,10}$/, 'Placa inválida');

export const isoDateSchema = z.string().datetime();
export const positiveIntSchema = z.number().int().positive();
export const moneySchema = z.number().nonnegative().finite();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
