import { z } from 'zod';
import { isoDateSchema, paginationSchema, plateSchema, uuidSchema } from './common';

export const listSessionsQuerySchema = paginationSchema
  .extend({
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .strict();

export const createSessionBodySchema = z
  .object({
    plate: plateSchema,
    vehicle_type: z.enum(['car', 'motorcycle', 'truck', 'bicycle']),
    vehicle_id: uuidSchema.optional(),
    customer_id: uuidSchema.optional(),
    customer_name: z.string().trim().min(1).max(120).optional(),
    customer_phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{5,19}$/u, 'Teléfono inválido')
      .optional(),
    space_number: z.string().trim().min(1).max(20).optional(),
    rate_per_hour: z.number().nonnegative().finite().max(1_000_000),
    notes: z.string().max(280).optional(),
  })
  .strict();

export const closeSessionParamsSchema = z.object({ id: uuidSchema }).strict();

export const closeSessionBodySchema = z
  .object({
    exit_time: isoDateSchema.optional(),
    hours_parked: z.number().nonnegative().finite().max(8784).optional(),
    total_amount: z.number().nonnegative().finite().max(1_000_000_000).optional(),
  })
  .strict();

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type CreateSessionBody = z.infer<typeof createSessionBodySchema>;
export type CloseSessionBody = z.infer<typeof closeSessionBodySchema>;
