/**
 * VehicleService — Repository for vehicles and vehicle categories.
 * Consume el endpoint `/vehicles` de las Edge Functions.
 */
import { api } from '@/lib/api';
import type { Vehicle, VehicleCategory, VehicleRate, VehicleType } from '@/types';

export const VehicleService = {
  async findByPlate(
    _tenantId: string,
    plate: string,
  ): Promise<(Vehicle & { customers?: { full_name: string; phone: string } | null }) | null> {
    return api.vehicles.findByPlate(plate) as Promise<
      (Vehicle & { customers?: { full_name: string; phone: string } | null }) | null
    >;
  },

  async upsert(
    _tenantId: string,
    plate: string,
    vehicleType: string,
    customerId?: string,
  ): Promise<string> {
    const res = await api.vehicles.upsert({
      plate,
      vehicle_type: vehicleType as VehicleType,
      customer_id: customerId ?? null,
    });
    return res?.id ?? '';
  },

  async getActiveCategories(_tenantId: string): Promise<VehicleCategory[]> {
    return api.vehicles.categories({ active: true });
  },

  async getActiveRates(_tenantId: string): Promise<VehicleRate[]> {
    return api.vehicles.rates({ active: true });
  },
} as const;
