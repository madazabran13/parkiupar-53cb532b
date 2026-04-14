import { z } from 'zod';

export const createParkingSchema = z.object({
  nombre: z.string().min(2),
  direccion: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  capacidad_total: z.number().int().min(1),
  tarifa_carro: z.number().min(0),
  tarifa_moto: z.number().min(0),
  tarifa_bicicleta: z.number().min(0),
});

export const updateParkingSchema = z.object({
  nombre: z.string().min(2).optional(),
  direccion: z.string().min(2).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  capacidad_total: z.number().int().min(1).optional(),
  tarifa_carro: z.number().min(0).optional(),
  tarifa_moto: z.number().min(0).optional(),
  tarifa_bicicleta: z.number().min(0).optional(),
  activo: z.boolean().optional(),
});

export const updateSpotStatusSchema = z.object({
  estado: z.enum(['disponible', 'ocupado', 'mantenimiento']),
});
