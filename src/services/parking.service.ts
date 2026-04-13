/**
 * ParkingService — Repository pattern for parking sessions.
 * Single Responsibility: only handles parking session CRUD operations.
 * Open/Closed: extend via composition, not modification.
 */
import { supabase } from '@/integrations/supabase/client';
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
  notes?: string;
}

export interface CompleteSessionDTO {
  sessionId: string;
  exitTime: string;
  hoursParked: number;
  totalAmount: number;
}

export const ParkingService = {
  async getActiveSessions(tenantId: string): Promise<ParkingSession[]> {
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
      notes: dto.notes || null,
      status: 'active',
    });
    if (error) throw error;
  },

  async completeSession(dto: CompleteSessionDTO): Promise<void> {
    const { error } = await supabase.from('parking_sessions').update({
      exit_time: dto.exitTime,
      hours_parked: dto.hoursParked,
      total_amount: dto.totalAmount,
      status: 'completed' as const,
    }).eq('id', dto.sessionId);
    if (error) throw error;
  },
} as const;
