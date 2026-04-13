/**
 * ReservationService — Repository for space reservations.
 * Single Responsibility: reservation CRUD and queries.
 */
import { supabase } from '@/integrations/supabase/client';
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
    const { error } = await supabase.from('space_reservations').insert({
      tenant_id: dto.tenantId,
      space_id: dto.spaceId,
      reserved_by: dto.reservedBy || null,
      customer_name: dto.customerName || null,
      customer_phone: dto.customerPhone || null,
      plate: dto.plate?.toUpperCase() || null,
      status: 'pending',
      expires_at: dto.expiresAt,
    });
    if (error) throw error;
  },

  async getPendingForSpace(spaceId: string): Promise<SpaceReservation | null> {
    const { data } = await supabase
      .from('space_reservations')
      .select('*')
      .eq('space_id', spaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as unknown as SpaceReservation) || null;
  },
} as const;
