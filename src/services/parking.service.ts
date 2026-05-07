/**
 * ParkingService — Repository pattern for parking sessions.
 * Single Responsibility: only handles parking session CRUD operations.
 * Open/Closed: extend via composition, not modification.
 *
 * Cuando VITE_USE_GATEWAY=true las operaciones expuestas por el BFF
 * (`/api/parking/sessions`) van por el gateway; el resto cae al cliente
 * Supabase directo hasta que se migren.
 */
import { supabase } from '@/integrations/supabase/client';
import { apiClient, USE_GATEWAY } from '@/lib/apiClient';
import type { ParkingSession } from '@/types';

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

interface GatewayList<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
interface GatewayItem<T> {
  data: T;
}

export const ParkingService = {
  async getActiveSessions(tenantId: string): Promise<ParkingSession[]> {
    if (USE_GATEWAY) {
      const res = await apiClient.get<GatewayList<ParkingSession>>('/parking/sessions', {
        query: { status: 'active', pageSize: 100 },
      });
      return res.data ?? [];
    }
    const { data, error } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('entry_time', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as ParkingSession[];
  },

  async getActiveSessionsBySpace(tenantId: string): Promise<ParkingSession[]> {
    if (USE_GATEWAY) {
      const res = await apiClient.get<GatewayList<ParkingSession>>('/parking/sessions', {
        query: { status: 'active', pageSize: 100 },
      });
      return [...(res.data ?? [])].sort((a, b) =>
        (a.space_number ?? '').localeCompare(b.space_number ?? ''),
      );
    }
    const { data, error } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('space_number');
    if (error) throw error;
    return (data || []) as unknown as ParkingSession[];
  },

  async getTodayCompleted(tenantId: string): Promise<ParkingSession[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (USE_GATEWAY) {
      const res = await apiClient.get<GatewayList<ParkingSession>>('/parking/sessions', {
        query: { status: 'completed', from: today.toISOString(), pageSize: 100 },
      });
      return res.data ?? [];
    }
    const { data, error } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('exit_time', today.toISOString());
    if (error) throw error;
    return (data || []) as unknown as ParkingSession[];
  },

  async checkDuplicateActive(plate: string): Promise<{ exists: boolean; sameParking?: boolean; tenantId?: string }> {
    const { data } = await supabase
      .from('parking_sessions')
      .select('id, tenant_id')
      .eq('plate', plate.toUpperCase())
      .eq('status', 'active')
      .maybeSingle();
    if (!data) return { exists: false };
    return { exists: true, tenantId: data.tenant_id };
  },

  async createSession(dto: CreateSessionDTO): Promise<void> {
    if (USE_GATEWAY) {
      await apiClient.post<GatewayItem<ParkingSession>>('/parking/sessions', {
        plate: dto.plate.toUpperCase(),
        vehicle_type: dto.vehicleType,
        vehicle_id: dto.vehicleId,
        customer_id: dto.customerId,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone,
        space_number: dto.spaceNumber,
        rate_per_hour: dto.ratePerHour,
        fraction_minutes: dto.fractionMinutes,
        vehicle_category_id: dto.vehicleCategoryId,
        notes: dto.notes,
      });
      return;
    }
    const { error } = await supabase.from('parking_sessions').insert({
      tenant_id: dto.tenantId,
      vehicle_id: dto.vehicleId || null,
      customer_id: dto.customerId || null,
      plate: dto.plate.toUpperCase(),
      vehicle_type: dto.vehicleType as any,
      customer_name: dto.customerName || null,
      customer_phone: dto.customerPhone || null,
      space_number: dto.spaceNumber || null,
      rate_per_hour: dto.ratePerHour,
      fraction_minutes: dto.fractionMinutes ?? null,
      vehicle_category_id: dto.vehicleCategoryId ?? null,
      notes: dto.notes || null,
      status: 'active',
    });
    if (error) throw error;
  },

  async completeSession(dto: CompleteSessionDTO): Promise<void> {
    if (USE_GATEWAY) {
      await apiClient.patch<GatewayItem<ParkingSession>>(
        `/parking/sessions/${encodeURIComponent(dto.sessionId)}/close`,
        {
          exit_time: dto.exitTime,
          hours_parked: dto.hoursParked,
          total_amount: dto.totalAmount,
        },
      );
      return;
    }
    const { error } = await supabase.from('parking_sessions').update({
      exit_time: dto.exitTime,
      hours_parked: dto.hoursParked,
      total_amount: dto.totalAmount,
      status: 'completed' as const,
    }).eq('id', dto.sessionId);
    if (error) throw error;
  },
} as const;
