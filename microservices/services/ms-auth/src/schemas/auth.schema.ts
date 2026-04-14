import { z } from 'zod';

export const registerSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
  rol: z.enum(['admin', 'operador', 'cliente']).optional().default('cliente'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});
