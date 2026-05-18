/**
 * ParkingService — Repository pattern for parking sessions.
 * Consume las Edge Functions vía `@/lib/api`.
 */
import { api } from '@/lib/api';
import type { ParkingSession, VehicleType } from '@/types';

export interface CreateSessionDTO {
  tenantId: string;
  vehicleId?: string;
  customerId?: string;
  plate: string;
  vehicleType: string;
  customerName?: string;
  customerPhone?: string;
  spaceNumber?: string;
  ratePerHour: number;
  fractionMinutes?: number;
  vehicleCategoryId?: string;
  notes?: string;
}

export interface CompleteSessionDTO {
  sessionId: string;
  exitTime: string;
  hoursParked: number;
  totalAmount: number;
}

export const ParkingService = {
  async getActiveSessions(_tenantId: string): Promise<ParkingSession[]> {
    return api.parking.getSessions({ status: 'active', limit: 100 });
  },

  async getActiveSessionsBySpace(_tenantId: string): Promise<ParkingSession[]> {
    const sessions = await api.parking.getSessions({ status: 'active', limit: 100 });
    return [...sessions].sort((a, b) =>
      (a.space_number ?? '').localeCompare(b.space_number ?? ''),
    );
  },

  async getTodayCompleted(_tenantId: string): Promise<ParkingSession[]> {
    const sessions = await api.parking.getSessions({ status: 'completed', limit: 100 });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const cutoff = startOfDay.getTime();
    return sessions.filter((s) => {
      const t = s.exit_time ? new Date(s.exit_time).getTime() : 0;
      return t >= cutoff;
    });
  },

  async checkDuplicateActive(
    plate: string,
  ): Promise<{ exists: boolean; sameParking?: boolean; tenantId?: string }> {
    const res = await api.parking.checkDuplicate(plate);
    if (!res?.exists) return { exists: false };
    return { exists: true, sameParking: res.same_parking, tenantId: res.tenant_id };
  },

  async createSession(dto: CreateSessionDTO): Promise<void> {
    await api.parking.registerEntry({
      plate: dto.plate.toUpperCase(),
      vehicle_type: dto.vehicleType as VehicleType,
      vehicle_category_id: dto.vehicleCategoryId,
      space_number: dto.spaceNumber,
      customer_id: dto.customerId,
      customer_name: dto.customerName,
      customer_phone: dto.customerPhone,
      notes: dto.notes,
    });
  },

  async completeSession(dto: CompleteSessionDTO): Promise<void> {
    await api.parking.registerExit(dto.sessionId);
  },
} as const;
