export type AppRole = 'superadmin' | 'admin' | 'operator' | 'viewer' | 'cajero' | 'portero';
export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bicycle';
export type SessionStatus = 'active' | 'completed' | 'cancelled';
export type SpaceStatus = 'available' | 'occupied' | 'reserved';
export type ReservationStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled';
export type DayGroup = 'weekday' | 'saturday' | 'sunday';

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  operator: 'Portero',
  viewer: 'Cliente',
  cajero: 'Cajero',
  portero: 'Portero',
};

export const MODULE_LABELS_ES: Record<string, string> = {
  dashboard: 'Panel Principal',
  parking: 'Gestión de Vehículos',
  customers: 'Clientes',
  rates: 'Tarifas',
  capacity: 'Control de Aforo y Reservas',
  reports: 'Reportes (solo ver)',
  reports_download: 'Descarga de Reportes PDF',
  map: 'Mapa en Tiempo Real',
  team: 'Gestión de Usuarios',
  settings: 'Configuración',
  audit: 'Auditoría',
  payments: 'Pagos y Facturación',
  my_plan: 'Mi Plan',
  theme_color: 'Personalización del Tema',
  schedules: 'Horarios de Operación',
  printing: 'Impresión de Recibos',
  monthly_subscriptions: 'Mensualidades',
  testimonials: 'Testimonios',
};

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_spaces: number;
  max_users: number;
  modules: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
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

export interface TenantSchedule {
  id: string;
  tenant_id: string;
  day_group: DayGroup;
  open_time: string;
  close_time: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ParkingSpace {
  id: string;
  tenant_id: string;
  space_number: string;
  label: string | null;
  status: SpaceStatus;
  reserved_by: string | null;
  reserved_at: string | null;
  reservation_expires_at: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceReservation {
  id: string;
  tenant_id: string;
  space_id: string;
  reserved_by: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  plate: string | null;
  status: ReservationStatus;
  reserved_at: string;
  expires_at: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlySubscription {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  plate: string;
  customer_name: string | null;
  customer_phone: string | null;
  amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
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

export const DAY_GROUP_LABELS: Record<DayGroup, string> = {
  weekday: 'Lunes a Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const SPACE_STATUS_LABELS: Record<SpaceStatus, string> = {
  available: 'Disponible',
  occupied: 'Ocupado',
  reserved: 'Reservado',
};
