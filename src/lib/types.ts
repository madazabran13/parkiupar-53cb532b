/**
 * Tipos de los payloads y respuestas de las Edge Functions de Supabase.
 *
 * Reexportamos las entidades base desde `@/types` y añadimos los DTOs específicos
 * de cada endpoint para no duplicar el modelo de dominio.
 */
import type {
  AppRole,
  Customer,
  DayGroup,
  MonthlySubscription,
  ParkingSession,
  ParkingSpace,
  Plan,
  SessionStatus,
  SpaceReservation,
  Tenant,
  TenantSchedule,
  UserProfile,
  Vehicle,
  VehicleCategory,
  VehicleRate,
  VehicleType,
} from '@/types';

export type {
  AppRole,
  Customer,
  DayGroup,
  MonthlySubscription,
  ParkingSession,
  ParkingSpace,
  Plan,
  SessionStatus,
  SpaceReservation,
  Tenant,
  TenantSchedule,
  UserProfile,
  Vehicle,
  VehicleCategory,
  VehicleRate,
  VehicleType,
};

// ── Envelope estándar de las Edge Functions ────────────────────────────────
export interface ApiEnvelope<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

// ── parking ────────────────────────────────────────────────────────────────
export interface EntryPayload {
  plate: string;
  vehicle_type?: VehicleType;
  vehicle_category_id?: string;
  space_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
}

export interface ExitPayload {
  notes?: string;
}

// ── customers ──────────────────────────────────────────────────────────────
export interface CustomersPage {
  items: Customer[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CustomerDetail extends Customer {
  vehicles: Vehicle[];
  sessions: ParkingSession[];
}

export interface CustomerPayload {
  full_name: string;
  phone: string;
  email?: string;
}

// ── rates ──────────────────────────────────────────────────────────────────
export interface RatePayload {
  vehicle_type: VehicleType;
  rate_per_hour: number;
  minimum_minutes?: number;
  fraction_minutes?: number;
  is_active?: boolean;
}

// ── capacity ───────────────────────────────────────────────────────────────
export interface CapacityState {
  total: number;
  occupied: number;
  available: number;
  stored_available: number;
  is_consistent: boolean;
}

export interface CapacityCounts {
  total: number;
  available: number;
}

// ── payments ───────────────────────────────────────────────────────────────
export interface PaymentParkingRecord {
  id: string;
  type: 'parking';
  plate: string;
  customer_name: string | null;
  amount: number;
  paid_at: string;
  payment_method: string | null;
  notes: string | null;
}

export interface PaymentSubscriptionRecord {
  id: string;
  type: 'subscription';
  plate: string;
  customer_name: string | null;
  amount: number;
  paid_at: string;
  start_date: string;
  end_date: string;
  notes: string | null;
}

export interface PaymentsList {
  parking: PaymentParkingRecord[];
  subscription: PaymentSubscriptionRecord[];
  totals: {
    parking: number;
    subscription: number;
    combined: number;
  };
}

export interface PaymentRecordPayload {
  session_id: string;
  amount: number;
  payment_method?: string;
  notes?: string;
}

// ── monthly-subscriptions ──────────────────────────────────────────────────
export interface SubscriptionPayload {
  plate: string;
  amount: number;
  start_date: string;
  end_date: string;
  customer_id?: string;
  vehicle_id?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
}

// ── schedules ──────────────────────────────────────────────────────────────
export interface SchedulePayload {
  day_group: DayGroup;
  open_time: string;
  close_time: string;
  is_active?: boolean;
  sort_order?: number;
}

// ── team ───────────────────────────────────────────────────────────────────
export interface TeamMember extends UserProfile {
  email: string;
}

export interface TeamInvitePayload {
  email: string;
  role: 'admin' | 'conductor';
  full_name?: string;
  phone?: string;
  password?: string;
}

export interface TeamUpdatePayload {
  role?: 'admin' | 'conductor';
  full_name?: string;
  phone?: string;
  is_active?: boolean;
  user_modules?: string[];
}

// ── reports ────────────────────────────────────────────────────────────────
export type ReportPeriod = 'day' | 'week' | 'month';

export interface ReportSeriesPoint {
  bucket: string;
  revenue: number;
  sessions: number;
}

export interface ReportSummary {
  period: ReportPeriod;
  from: string;
  to: string;
  totals: {
    sessions: number;
    revenue: number;
    avg_occupancy: number;
  };
  series: ReportSeriesPoint[];
}

export interface ReportVehicleSlice {
  vehicle_type: VehicleType;
  count: number;
  revenue: number;
  pct: number;
}

export interface ReportVehiclesDistribution {
  from: string;
  to: string;
  total: number;
  distribution: ReportVehicleSlice[];
}

// ── incidents ──────────────────────────────────────────────────────────────
export type IncidentStatus = 'pending' | 'in_review' | 'resolved';
export type IncidentCategory = 'bug' | 'suggestion' | 'other';

export interface Incident {
  id: string;
  tenant_id: string;
  reporter_id: string;
  title: string;
  description: string;
  category: IncidentCategory | null;
  status: IncidentStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentPayload {
  title: string;
  description: string;
  category?: IncidentCategory;
}

export interface IncidentUpdatePayload {
  status?: IncidentStatus;
  admin_notes?: string;
  category?: IncidentCategory;
  title?: string;
  description?: string;
}

// ── reservations ───────────────────────────────────────────────────────────
export type Reservation = SpaceReservation & {
  status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled' | 'expired';
};

export interface ReservationPayload {
  space_id?: string;
  customer_name?: string;
  customer_phone?: string;
  plate?: string;
  vehicle_type?: VehicleType;
  vehicle_category_id?: string;
  expires_at?: string;
  minutes_valid?: number;
}

// ── notifications ──────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  target_role: AppRole | null;
  title: string;
  body: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsList {
  items: Notification[];
  unread: number;
}

// ── spaces ─────────────────────────────────────────────────────────────────
export interface SpaceBulkPayload {
  start: number;
  count: number;
}

export interface ReservePayload {
  user_id?: string | null;
  expires_at: string;
}

export interface DeletedCount {
  deleted: number;
}

// ── vehicles ───────────────────────────────────────────────────────────────
export type VehicleWithCustomer = Vehicle & {
  customers?: { full_name: string; phone: string } | null;
};

export interface VehicleUpsertPayload {
  plate: string;
  vehicle_type: VehicleType;
  customer_id?: string | null;
}

// ── visits (conductor) ─────────────────────────────────────────────────────
export interface VisitRecord {
  id: string;
  plate: string;
  vehicle_type: VehicleType | string;
  entry_time: string;
  exit_time: string | null;
  hours_parked: number | null;
  total_amount: number | null;
  status: string;
  space_number: string | null;
  space_reservation_id: string | null;
  notes: string | null;
  tenant: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export interface VisitReservationRecord {
  id: string;
  plate: string | null;
  vehicle_type: VehicleType | string;
  status: string;
  reserved_at: string;
  expires_at: string;
  confirmed_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  space: { id: string; space_number: string } | null;
  tenant: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

// ── audit-logs ─────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  user_name: string | null;
  table_name: string;
  action: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogsPage {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogsFilters {
  table?: string;
  action?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

// ── billing / plans ────────────────────────────────────────────────────────
export interface TenantWithPlan {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  is_active: boolean;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  plans: { id: string; name: string; price_monthly: number } | null;
}

export interface PaymentHistoryRecord {
  id: string;
  tenant_id: string;
  plan_name: string;
  amount: number;
  months: number;
  previous_expires_at: string | null;
  new_expires_at: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  tenants?: { name: string } | null;
}

export interface RenewPlanPayload {
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  months: number;
  payment_method: string;
  notes?: string;
}

export interface PlanMaxUsers {
  max_users: number;
}

export interface CategoryPayload {
  name: string;
  icon?: string;
  rate_per_hour: number;
  fraction_minutes?: number;
  minimum_minutes?: number;
  is_active?: boolean;
}

export interface SubscriptionPaymentRecord {
  id: string;
  subscription_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface SubscriptionPaymentPayload {
  subscription_id: string;
  amount: number;
  payment_date?: string;
  payment_method?: string | null;
  notes?: string | null;
}

export interface PlanRequestRecord {
  id: string;
  tenant_id: string;
  current_plan_id: string | null;
  requested_plan_id: string;
  message: string | null;
  status: string;
  created_at: string;
  requested_plan: { name: string; price_monthly: number } | null;
}

export interface PlanRequestPayload {
  current_plan_id: string | null;
  requested_plan_id: string;
  message: string | null;
}

// ── me ─────────────────────────────────────────────────────────────────────
export type TenantWithPlanModules = Tenant & {
  plans: { modules: string[]; max_spaces: number } | null;
};

export interface MeResponse {
  profile: UserProfile;
  tenant: TenantWithPlanModules | null;
}

export interface UpdateProfilePayload {
  full_name: string;
  phone: string | null;
}

export interface UpdateTenantPayload {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ── parking check-duplicate ────────────────────────────────────────────────
export interface DuplicateCheck {
  exists: boolean;
  same_parking?: boolean;
  tenant_id?: string;
}
