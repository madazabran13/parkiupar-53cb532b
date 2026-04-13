/**
 * SpaceService — Repository pattern for parking spaces and reservations.
 * Single Responsibility: manages space state transitions.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ParkingSpace } from '@/types';

export const SpaceService = {
  async getSpaces(tenantId: string): Promise<ParkingSpace[]> {
    const { data, error } = await supabase
      .from('parking_spaces')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('space_number');
    if (error) throw error;
    return (data || []) as unknown as ParkingSpace[];
  },

  async setOccupied(spaceId: string): Promise<void> {
    const { error } = await supabase
      .from('parking_spaces')
      .update({ status: 'occupied' })
      .eq('id', spaceId);
    if (error) throw error;
  },

  async setAvailable(spaceId: string): Promise<void> {
    const { error } = await supabase
      .from('parking_spaces')
      .update({
        status: 'available',
        reserved_by: null,
        reserved_at: null,
        reservation_expires_at: null,
      })
      .eq('id', spaceId);
    if (error) throw error;
  },

  async reserve(spaceId: string, userId: string | null, expiresAt: string): Promise<void> {
    const { error } = await supabase
      .from('parking_spaces')
      .update({
        status: 'reserved',
        reserved_by: userId,
        reserved_at: new Date().toISOString(),
        reservation_expires_at: expiresAt,
      })
      .eq('id', spaceId);
    if (error) throw error;
  },

  async createBulk(tenantId: string, startNum: number, count: number): Promise<void> {
    const spaces = Array.from({ length: count }, (_, i) => ({
      tenant_id: tenantId,
      space_number: String(startNum + i),
      label: `Espacio ${startNum + i}`,
      status: 'available' as const,
    }));
    // Insert in batches of 50
    for (let i = 0; i < spaces.length; i += 50) {
      const { error } = await supabase.from('parking_spaces').insert(spaces.slice(i, i + 50));
      if (error) throw error;
    }
  },

  async deleteAvailableAbove(spaces: ParkingSpace[], threshold: number): Promise<void> {
    const toRemove = spaces
      .filter(s => parseInt(s.space_number) > threshold && s.status === 'available')
      .map(s => s.id);
    if (toRemove.length > 0) {
      await supabase.from('parking_spaces').delete().in('id', toRemove);
    }
  },

  async expireReservation(spaceId: string): Promise<void> {
    await supabase
      .from('parking_spaces')
      .update({ status: 'available', reserved_by: null, reserved_at: null, reservation_expires_at: null })
      .eq('id', spaceId)
      .eq('status', 'reserved');
    await supabase
      .from('space_reservations')
      .update({ status: 'expired' })
      .eq('space_id', spaceId)
      .eq('status', 'pending');
  },

  async confirmReservation(spaceId: string): Promise<void> {
    await supabase
      .from('space_reservations')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .eq('status', 'pending');
  },

  async cancelReservation(spaceId: string): Promise<void> {
    await this.setAvailable(spaceId);
    await supabase
      .from('space_reservations')
      .update({ status: 'cancelled' })
      .eq('space_id', spaceId)
      .eq('status', 'pending');
  },
} as const;
