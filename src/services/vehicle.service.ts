/**
 * VehicleService — Repository for vehicles and vehicle categories.
 * Single Responsibility: vehicle lookup and creation.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Vehicle, VehicleCategory, VehicleRate } from '@/types';

export const VehicleService = {
  async findByPlate(tenantId: string, plate: string): Promise<(Vehicle & { customers?: { full_name: string; phone: string } }) | null> {
    const { data } = await supabase
      .from('vehicles')
      .select('*, customers:customer_id(full_name, phone)')
      .eq('tenant_id', tenantId)
      .eq('plate', plate.toUpperCase())
      .single();
    return data ? (data as any) : null;
  },

  async upsert(tenantId: string, plate: string, vehicleType: string, customerId?: string): Promise<string> {
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('plate', plate.toUpperCase())
      .single();
    if (existing) return existing.id;

    const { data: created } = await supabase
      .from('vehicles')
      .insert({
        tenant_id: tenantId,
        plate: plate.toUpperCase(),
        vehicle_type: vehicleType as any,
        customer_id: customerId || null,
      })
      .select('id')
      .single();
    return created?.id || '';
  },

  async getActiveCategories(tenantId: string): Promise<VehicleCategory[]> {
    const { data } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');
    return (data || []) as unknown as VehicleCategory[];
  },

  async getActiveRates(tenantId: string): Promise<VehicleRate[]> {
    const { data } = await supabase
      .from('vehicle_rates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);
    return (data || []) as unknown as VehicleRate[];
  },
} as const;
