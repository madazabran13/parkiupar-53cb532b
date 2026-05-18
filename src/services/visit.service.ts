/**
 * VisitService — Listado de visitas y reservas para conductores (cross-tenant).
 * Consume el endpoint `/visits`. El `phone` ya se infiere del JWT en el server.
 */
import { api } from '@/lib/api';
import type { VisitRecord, VisitReservationRecord } from '@/lib/types';

export type { VisitRecord };
export type ReservationRecord = VisitReservationRecord;
export type ReservationStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled';

export const VisitService = {
  async listForConductor(phone: string | null): Promise<VisitRecord[]> {
    if (!phone) return [];
    return api.visits.list();
  },

  async listReservationsForConductor(phone: string | null): Promise<VisitReservationRecord[]> {
    if (!phone) return [];
    return api.visits.reservations();
  },
};
