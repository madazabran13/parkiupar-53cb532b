import { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import type { AppRole } from '@/types';

const ADMIN_ONLY: AppRole[] = ['admin'];
const ALL_TENANT_ROLES: AppRole[] = ['admin', 'conductor'];

export type RouteAccess = 'public' | 'public-only' | 'protected' | 'utility';

export interface RouteDefinition {
  path: string;
  component: LazyExoticComponent<ComponentType>;
  access: RouteAccess;
  allowedRoles?: AppRole[];
  withLayout?: boolean;
}

const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const AccessDenied = lazy(() => import('@/pages/auth/AccessDenied'));
const SuspendedAccount = lazy(() => import('@/pages/auth/SuspendedAccount'));
const NoInternetConnection = lazy(() => import('@/pages/auth/NoInternetConnection'));

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Terms = lazy(() => import('@/pages/legal/Terms'));
const Privacy = lazy(() => import('@/pages/legal/Privacy'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Parking = lazy(() => import('@/pages/parking/ParkingTab'));
const Capacity = lazy(() => import('@/pages/parking/CapacityTab'));
const MapPage = lazy(() => import('@/pages/parking/MapTab'));
const Schedules = lazy(() => import('@/pages/parking/SchedulesTab'));
const TenantView = lazy(() => import('@/pages/parking/TenantView'));

const Customers = lazy(() => import('@/pages/customers/index'));
const IncidentReports = lazy(() => import('@/pages/incidents/index'));
const Testimonials = lazy(() => import('@/pages/content/TestimonialsTab'));

const Rates = lazy(() => import('@/pages/billing/RatesTab'));
const Payments = lazy(() => import('@/pages/billing/PaymentsTab'));
const MonthlySubscriptions = lazy(() => import('@/pages/billing/SubscriptionsTab'));

const TeamUsers = lazy(() => import('@/pages/users/TeamTab'));
const MyPlan = lazy(() => import('@/pages/users/MyPlanTab'));
const SettingsPage = lazy(() => import('@/pages/users/SettingsTab'));

const Reports = lazy(() => import('@/pages/reports/ReportsTab'));
const AuditLog = lazy(() => import('@/pages/reports/AuditLogTab'));

const SuperAdmin = lazy(() => import('@/pages/admin/SuperAdmin'));

const Visits = lazy(() => import('@/pages/visits/VisitsTab'));
const Reservations = lazy(() => import('@/pages/reservations/ReservationsTab'));

export const PUBLIC_ROUTES: RouteDefinition[] = [
  { path: '/', component: LandingPage, access: 'public' },
  { path: '/map-public', component: MapPage, access: 'public' },
  { path: '/reset-password', component: ResetPassword, access: 'public' },
  { path: '/terms', component: Terms, access: 'public' },
  { path: '/privacy', component: Privacy, access: 'public' },
];

export const PUBLIC_ONLY_ROUTES: RouteDefinition[] = [
  { path: '/login', component: Login, access: 'public-only' },
  { path: '/register', component: Register, access: 'public-only' },
  { path: '/forgot-password', component: ForgotPassword, access: 'public-only' },
];

export const PROTECTED_ROUTES: RouteDefinition[] = [
  { path: '/superadmin', component: SuperAdmin, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/plans', component: SuperAdmin, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/users', component: SuperAdmin, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/testimonials', component: SuperAdmin, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/faqs', component: SuperAdmin, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/settings', component: SuperAdmin, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/incidents', component: IncidentReports, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/payments', component: Payments, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },
  { path: '/superadmin/tenant/:tenantId', component: TenantView, access: 'protected', allowedRoles: ['superadmin'], withLayout: true },

  { path: '/rates', component: Rates, access: 'protected', allowedRoles: ['admin'], withLayout: true },
  { path: '/schedules', component: Schedules, access: 'protected', allowedRoles: ['admin'], withLayout: true },
  { path: '/team', component: TeamUsers, access: 'protected', allowedRoles: ['admin'], withLayout: true },
  { path: '/reports', component: Reports, access: 'protected', allowedRoles: ['admin'], withLayout: true },
  { path: '/audit', component: AuditLog, access: 'protected', allowedRoles: ['admin'], withLayout: true },
  { path: '/payments', component: Payments, access: 'protected', allowedRoles: ['admin'], withLayout: true },
  { path: '/my-plan', component: MyPlan, access: 'protected', allowedRoles: ['admin'], withLayout: true },

  { path: '/dashboard', component: Dashboard, access: 'protected', allowedRoles: ADMIN_ONLY, withLayout: true },
  { path: '/parking', component: Parking, access: 'protected', allowedRoles: ADMIN_ONLY, withLayout: true },
  { path: '/capacity', component: Capacity, access: 'protected', allowedRoles: ADMIN_ONLY, withLayout: true },
  { path: '/customers', component: Customers, access: 'protected', allowedRoles: ADMIN_ONLY, withLayout: true },
  { path: '/reservations', component: Reservations, access: 'protected', allowedRoles: ADMIN_ONLY, withLayout: true },
  { path: '/monthly-subscriptions', component: MonthlySubscriptions, access: 'protected', allowedRoles: ADMIN_ONLY, withLayout: true },

  { path: '/map', component: MapPage, access: 'protected', allowedRoles: ALL_TENANT_ROLES, withLayout: true },
  { path: '/visits', component: Visits, access: 'protected', allowedRoles: ['conductor'], withLayout: true },
  { path: '/settings', component: SettingsPage, access: 'protected', allowedRoles: ALL_TENANT_ROLES, withLayout: true },
  { path: '/testimonials', component: Testimonials, access: 'protected', allowedRoles: ALL_TENANT_ROLES, withLayout: true },
  { path: '/incidents', component: IncidentReports, access: 'protected', allowedRoles: ALL_TENANT_ROLES, withLayout: true },
];

export const UTILITY_ROUTES: RouteDefinition[] = [
  { path: '/access-denied', component: AccessDenied, access: 'utility' },
  { path: '/suspended', component: SuspendedAccount, access: 'utility' },
  { path: '/no-internet', component: NoInternetConnection, access: 'utility' },
  { path: '*', component: NotFound, access: 'utility' },
];
