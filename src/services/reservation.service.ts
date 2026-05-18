/**
 * ReservationService — Repository for space reservations.
 * Consume el endpoint `/reservations` (con filtros space_id/pending_for_space).
 */
import { api } from '@/lib/api';
import type { SpaceReservation } from '@/types';

export interface CreateReservationDTO {
  tenantId: string;
  spaceId: string;
  reservedBy?: string;
  customerName?: string;
  customerPhone?: string;
  plate?: string;
  expiresAt: string;
}

export const ReservationService = {
  async create(dto: CreateReservationDTO): Promise<void> {
    await api.reservations.create({
      space_id: dto.spaceId,
      customer_name: dto.customerName,
      customer_phone: dto.customerPhone,
      plate: dto.plate?.toUpperCase(),
      expires_at: dto.expiresAt,
    });
  },

  async getPendingForSpace(spaceId: string): Promise<SpaceReservation | null> {
    const items = await api.reservations.list({ space_id: spaceId, pending_for_space: true });
    return (items?.[0] as unknown as SpaceReservation) ?? null;
  },
} as const;
