export type AppRole = 'superadmin' | 'admin' | 'operator' | 'viewer';
export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bicycle';
export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_spaces: number;
  modules: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan_id: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  address: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  total_spaces: number;
  available_spaces: number;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id: string | null;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleRate {
  id: string;
  tenant_id: string;
  vehicle_type: VehicleType;
  rate_per_hour: number;
  minimum_minutes: number;
  fraction_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleCategory {
  id: string;
  tenant_id: string;
  name: string;
  icon: string;
  rate_per_hour: number;
  fraction_minutes: number;
  minimum_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  phone: string;
  full_name: string;
  email: string | null;
  total_visits: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  plate: string;
  vehicle_type: VehicleType;
  brand: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParkingSession {
  id: string;
  tenant_id: string;
  vehicle_id: string | null;
  customer_id: string | null;
  plate: string;
  vehicle_type: VehicleType;
  customer_name: string | null;
  customer_phone: string | null;
  space_number: string | null;
  entry_time: string;
  exit_time: string | null;
  hours_parked: number | null;
  rate_per_hour: number | null;
  total_amount: number | null;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Carro',
  motorcycle: 'Moto',
  truck: 'Camión',
  bicycle: 'Bicicleta',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};
