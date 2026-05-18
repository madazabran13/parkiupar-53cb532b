/**
 * SpaceService — Repository for parking spaces and reservations.
 * Consume el endpoint `/spaces` de las Edge Functions.
 * El parámetro `tenantId` se conserva por compatibilidad de firma.
 */
import { api } from '@/lib/api';
import type { ParkingSpace } from '@/types';

export const SpaceService = {
  async getSpaces(_tenantId: string): Promise<ParkingSpace[]> {
    return api.spaces.list();
  },

  async findByNumber(_tenantId: string, spaceNumber: string): Promise<ParkingSpace | null> {
    return api.spaces.findByNumber(spaceNumber);
  },

  async setOccupied(spaceId: string): Promise<void> {
    await api.spaces.occupy(spaceId);
  },

  async setAvailable(spaceId: string): Promise<void> {
    await api.spaces.setAvailable(spaceId);
  },

  async reserve(spaceId: string, userId: string | null, expiresAt: string): Promise<void> {
    await api.spaces.reserve(spaceId, { user_id: userId, expires_at: expiresAt });
  },

  async createBulk(_tenantId: string, startNum: number, count: number): Promise<void> {
    await api.spaces.createBulk({ start: startNum, count });
  },

  async deleteAvailableAbove(_spaces: ParkingSpace[], threshold: number): Promise<void> {
    await api.spaces.deleteAvailableAbove(threshold);
  },

  async expireReservation(spaceId: string): Promise<void> {
    await api.spaces.expireReservation(spaceId);
  },

  async confirmReservation(spaceId: string): Promise<void> {
    await api.spaces.confirmReservation(spaceId);
  },

  async cancelReservation(spaceId: string): Promise<void> {
    await api.spaces.cancelReservation(spaceId);
  },
} as const;
