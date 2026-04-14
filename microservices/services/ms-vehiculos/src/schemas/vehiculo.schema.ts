import { z } from 'zod';

export const createVehicleSchema = z.object({
  placa: z.string().min(1).max(8).transform(v => v.toUpperCase()),
  tipo: z.enum(['carro', 'moto', 'bicicleta']),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  color: z.string().optional(),
  owner_id: z.string().uuid().optional(),
});

export const updateVehicleSchema = z.object({
  placa: z.string().min(1).max(8).transform(v => v.toUpperCase()).optional(),
  tipo: z.enum(['carro', 'moto', 'bicicleta']).optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  color: z.string().optional(),
  owner_id: z.string().uuid().optional(),
});
