import { z } from 'zod';

export const createReservationSchema = z.object({
  vehiculo_id: z.string().uuid(),
  spot_id: z.string().uuid(),
  parking_id: z.string().uuid(),
});
