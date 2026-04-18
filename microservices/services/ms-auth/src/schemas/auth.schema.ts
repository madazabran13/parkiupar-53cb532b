import { z } from 'zod';

export const registerSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
  rol: z.enum(['superadmin', 'admin', 'operator', 'viewer', 'cajero', 'portero', 'conductor']).optional().default('viewer'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export const reactivationRequestSchema = z.object({
  tenantId: z.string().uuid('ID de tenant inválido'),
  tenantName: z.string().min(1, 'Nombre del parqueadero requerido'),
  requesterName: z.string().min(1, 'Nombre del solicitante requerido'),
});
