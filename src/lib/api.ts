/**
 * api — cliente HTTP tipado para las Edge Functions de Supabase.
 *
 * Base URL: `${VITE_SUPABASE_URL}/functions/v1`
 * Auth:     Authorization: Bearer <access_token> (extraído de supabase.auth.getSession())
 * Errores:  Las Edge Functions devuelven `{ data, error }`. Si `error` no es null o
 *           el HTTP no es 2xx, lanzamos `ApiError` con `status`, `code`, `message`.
 *           En 401 se hace signOut y se redirige a /login.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ApiEnvelope,
  AuditLog,
  AuditLogsFilters,
  AuditLogsPage,
  CapacityState,
  CapacityCounts,
  CategoryPayload,
  Customer,
  CustomerDetail,
  CustomersPage,
  CustomerPayload,
  DeletedCount,
  DuplicateCheck,
  EntryPayload,
  ExitPayload,
  Incident,
  IncidentPayload,
  IncidentUpdatePayload,
  MeResponse,
  MonthlySubscription,
  Notification,
  NotificationsList,
  ParkingSession,
  ParkingSpace,
  PaymentHistoryRecord,
  PaymentRecordPayload,
  PaymentsList,
  Plan,
  PlanMaxUsers,
  PlanRequestPayload,
  PlanRequestRecord,
  RatePayload,
  RenewPlanPayload,
  ReportPeriod,
  ReportSummary,
  ReportVehiclesDistribution,
  ReservePayload,
  Reservation,
  ReservationPayload,
  SchedulePayload,
  SpaceBulkPayload,
  SubscriptionPayload,
  SubscriptionPaymentPayload,
  SubscriptionPaymentRecord,
  TeamInvitePayload,
  TeamMember,
  TeamUpdatePayload,
  TenantSchedule,
  TenantWithPlan,
  TenantWithPlanModules,
  UpdateProfilePayload,
  UpdateTenantPayload,
  UserProfile,
  VehicleCategory,
  VehicleRate,
  VehicleUpsertPayload,
  VehicleWithCustomer,
  VisitRecord,
  VisitReservationRecord,
} from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

if (!SUPABASE_URL) {
  throw new Error('Missing VITE_SUPABASE_URL — la capa de API no puede inicializar.');
}

const BASE_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1`;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | undefined | null;
type Query = Record<string, QueryValue>;
type JsonBody = Record<string, unknown> | unknown[] | null;

interface RequestOptions {
  query?: Query;
  body?: JsonBody;
  signal?: AbortSignal;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUrl(path: string, query?: Query): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}${cleanPath}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function handle401(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(await authHeader()),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 401) {
    await handle401();
    throw new ApiError(401, 'UNAUTHORIZED', 'Sesión expirada');
  }

  const text = await res.text();
  let payload: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      throw new ApiError(res.status, 'INVALID_JSON', `Respuesta no JSON: ${text.slice(0, 120)}`);
    }
  }

  if (!res.ok || (payload && payload.error)) {
    const err = payload?.error ?? { message: `Error ${res.status}`, code: 'HTTP_ERROR' };
    throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? `Error ${res.status}`);
  }

  return (payload?.data ?? (null as unknown)) as T;
}

const get = <T>(path: string, query?: Query, signal?: AbortSignal) =>
  request<T>('GET', path, { query, signal });
const post = <T>(path: string, body?: JsonBody) => request<T>('POST', path, { body: body ?? null });
const put = <T>(path: string, body?: JsonBody) => request<T>('PUT', path, { body: body ?? null });
const del = <T>(path: string) => request<T>('DELETE', path);

export const api = {
  parking: {
    getSessions: (params?: {
      status?: 'active' | 'completed' | 'cancelled';
      limit?: number;
      from?: string;
      to?: string;
    }) => get<ParkingSession[]>('/parking', params as Query),
    getSession: (id: string) => get<ParkingSession>(`/parking/${id}`),
    checkDuplicate: (plate: string) =>
      get<DuplicateCheck>('/parking/check-duplicate', { plate }),
    registerEntry: (data: EntryPayload) => post<ParkingSession>('/parking', data),
    registerExit: (id: string, data: ExitPayload = {}) =>
      put<ParkingSession>(`/parking/${id}/exit`, data),
  },
  customers: {
    list: (params?: { q?: string; page?: number; pageSize?: number }) =>
      get<CustomersPage>('/customers', params as Query),
    getHistory: (id: string) => get<CustomerDetail>(`/customers/${id}`),
    create: (data: CustomerPayload) => post<CustomerDetail>('/customers', data),
    update: (id: string, data: Partial<CustomerPayload>) =>
      put<CustomerDetail>(`/customers/${id}`, data),
  },
  rates: {
    list: (params?: { all?: boolean }) => get<VehicleRate[]>('/rates', params as Query),
    create: (data: RatePayload) => post<VehicleRate>('/rates', data),
    update: (id: string, data: Partial<RatePayload>) => put<VehicleRate>(`/rates/${id}`, data),
    remove: (id: string) => del<VehicleRate>(`/rates/${id}`),
  },
  capacity: {
    get: () => get<CapacityState>('/capacity'),
    entry: () => post<CapacityCounts>('/capacity/entry'),
    exit: () => post<CapacityCounts>('/capacity/exit'),
  },
  payments: {
    list: (filters?: {
      from?: string;
      to?: string;
      type?: 'all' | 'parking' | 'subscription';
      limit?: number;
    }) => get<PaymentsList>('/payments', filters as Query),
    getBySession: (sessionId: string) => get<ParkingSession>(`/payments/${sessionId}`),
    record: (data: PaymentRecordPayload) => post<ParkingSession>('/payments', data),
  },
  monthlySubscriptions: {
    list: (params?: { active?: boolean; customer_id?: string }) =>
      get<MonthlySubscription[]>('/monthly-subscriptions', params as Query),
    create: (data: SubscriptionPayload) =>
      post<MonthlySubscription>('/monthly-subscriptions', data),
    update: (id: string, data: Partial<SubscriptionPayload>) =>
      put<MonthlySubscription>(`/monthly-subscriptions/${id}`, data),
    cancel: (id: string) => del<MonthlySubscription>(`/monthly-subscriptions/${id}`),
  },
  schedules: {
    get: () => get<TenantSchedule[]>('/schedules'),
    update: (schedules: SchedulePayload[]) =>
      put<TenantSchedule[]>('/schedules', { schedules }),
  },
  team: {
    list: () => get<TeamMember[]>('/team'),
    invite: (data: TeamInvitePayload) => post<TeamMember>('/team', data),
    update: (id: string, data: TeamUpdatePayload) => put<TeamMember>(`/team/${id}`, data),
    updateRole: (id: string, role: TeamUpdatePayload['role']) =>
      put<TeamMember>(`/team/${id}`, { role }),
    remove: (id: string) => del<TeamMember>(`/team/${id}`),
  },
  reports: {
    get: (params: { period: ReportPeriod; from?: string; to?: string }) =>
      get<ReportSummary>('/reports', params as Query),
    getVehicles: (params?: { from?: string; to?: string }) =>
      get<ReportVehiclesDistribution>('/reports/vehicles', params as Query),
  },
  incidents: {
    list: (params?: { status?: 'pending' | 'in_review' | 'resolved' }) =>
      get<Incident[]>('/incidents', params as Query),
    create: (data: IncidentPayload) => post<Incident>('/incidents', data),
    update: (id: string, data: IncidentUpdatePayload) =>
      put<Incident>(`/incidents/${id}`, data),
  },
  reservations: {
    list: (params?: { all?: boolean; space_id?: string; pending_for_space?: boolean }) =>
      get<Reservation[]>('/reservations', params as Query),
    create: (data: ReservationPayload) => post<Reservation>('/reservations', data),
    update: (id: string, status: Reservation['status']) =>
      put<Reservation>(`/reservations/${id}`, { status }),
  },
  notifications: {
    list: (params?: { unread?: boolean; limit?: number }) =>
      get<NotificationsList>('/notifications', params as Query),
    markRead: (id: string) => put<Notification>(`/notifications/${id}/read`),
    markAllRead: () => put<{ marked: true }>('/notifications/read-all'),
  },
  spaces: {
    list: () => get<ParkingSpace[]>('/spaces'),
    findByNumber: (n: string) => get<ParkingSpace | null>(`/spaces/by-number/${n}`),
    createBulk: (data: SpaceBulkPayload) => post<ParkingSpace[]>('/spaces/bulk', data),
    deleteAvailableAbove: (threshold: number) =>
      del<DeletedCount>(`/spaces/above?threshold=${threshold}`),
    occupy: (id: string) => put<ParkingSpace>(`/spaces/${id}/occupy`),
    setAvailable: (id: string) => put<ParkingSpace>(`/spaces/${id}/available`),
    reserve: (id: string, data: ReservePayload) =>
      put<ParkingSpace>(`/spaces/${id}/reserve`, data),
    expireReservation: (id: string) => put<ParkingSpace>(`/spaces/${id}/expire-reservation`),
    confirmReservation: (id: string) => put<ParkingSpace>(`/spaces/${id}/confirm-reservation`),
    cancelReservation: (id: string) => put<ParkingSpace>(`/spaces/${id}/cancel-reservation`),
  },
  vehicles: {
    findByPlate: (plate: string) =>
      get<VehicleWithCustomer | null>('/vehicles', { plate }),
    upsert: (data: VehicleUpsertPayload) => post<{ id: string }>('/vehicles', data),
    rates: (params?: { active?: boolean }) =>
      get<VehicleRate[]>('/vehicles/rates', params as Query),
    categories: (params?: { active?: boolean }) =>
      get<VehicleCategory[]>('/vehicles/categories', params as Query),
  },
  visits: {
    list: () => get<VisitRecord[]>('/visits'),
    reservations: () => get<VisitReservationRecord[]>('/visits/reservations'),
  },
  auditLogs: {
    list: (filters: AuditLogsFilters = {}) =>
      get<AuditLogsPage>('/audit-logs', filters as Query),
    exportAll: (filters: Omit<AuditLogsFilters, 'page' | 'pageSize'> = {}) =>
      get<AuditLog[]>('/audit-logs/export', filters as Query),
  },
  billing: {
    tenants: () => get<TenantWithPlan[]>('/billing/tenants'),
    payments: () => get<PaymentHistoryRecord[]>('/billing/payments'),
    renewPlan: (data: RenewPlanPayload) => post<PaymentHistoryRecord>('/billing/payments', data),
    plans: (params?: { active?: boolean }) => get<Plan[]>('/billing/plans', params as Query),
    planMaxUsers: (planId: string) => get<PlanMaxUsers>(`/billing/plans/${planId}/max-users`),
    categories: () => get<VehicleCategory[]>('/billing/categories'),
    createCategory: (data: CategoryPayload) =>
      post<VehicleCategory>('/billing/categories', data),
    updateCategory: (id: string, data: Partial<CategoryPayload>) =>
      put<VehicleCategory>(`/billing/categories/${id}`, data),
    toggleCategory: (id: string, is_active: boolean) =>
      put<VehicleCategory>(`/billing/categories/${id}/toggle`, { is_active }),
    deleteCategory: (id: string) => del<{ deleted: true }>(`/billing/categories/${id}`),
    subscriptionPayments: (subscriptionId: string) =>
      get<SubscriptionPaymentRecord[]>(`/billing/subscription-payments/${subscriptionId}`),
    createSubscriptionPayment: (data: SubscriptionPaymentPayload) =>
      post<SubscriptionPaymentRecord>('/billing/subscription-payments', data),
    planRequests: () => get<PlanRequestRecord[]>('/billing/plan-requests'),
    createPlanRequest: (data: PlanRequestPayload) =>
      post<PlanRequestRecord>('/billing/plan-requests', data),
  },
  me: {
    get: () => get<MeResponse>('/me'),
    updateProfile: (data: UpdateProfilePayload) => put<UserProfile>('/me', data),
    getTenant: () => get<TenantWithPlanModules>('/me/tenant'),
    updateTenant: (data: UpdateTenantPayload) =>
      put<TenantWithPlanModules>('/me/tenant', data),
    customers: () => get<Customer[]>('/me/customers'),
    customerSubscriptions: (customerId: string) =>
      get<MonthlySubscription[]>(`/me/customer/${customerId}/subscriptions`),
  },
} as const;

export type Api = typeof api;
