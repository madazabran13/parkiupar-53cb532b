import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import NetworkGuard from "@/components/NetworkGuard";
import NoInternetConnection from "@/pages/auth/NoInternetConnection";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ResetPassword from "@/pages/auth/ResetPassword";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Parking from "@/pages/parking/ParkingTab";
import Customers from "@/pages/customers/index";
import Rates from "@/pages/billing/RatesTab";
import MyPlan from "@/pages/users/MyPlanTab";
import TeamUsers from "@/pages/users/TeamTab";
import Reports from "@/pages/reports/ReportsTab";
import Capacity from "@/pages/parking/CapacityTab";
import SuperAdmin from "@/pages/admin/SuperAdmin";
import MapPage from "@/pages/parking/MapTab";
import Payments from "@/pages/billing/PaymentsTab";
import AuditLog from "@/pages/reports/AuditLogTab";
import Schedules from "@/pages/parking/SchedulesTab";
import MonthlySubscriptions from "@/pages/billing/SubscriptionsTab";
import Testimonials from "@/pages/content/TestimonialsTab";
import AccessDenied from "@/pages/auth/AccessDenied";
import SuspendedAccount from "@/pages/auth/SuspendedAccount";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import IncidentReports from "./pages/incidents/index";
import TenantView from "./pages/parking/TenantView";
import SettingsPage from "@/pages/users/SettingsTab";

// ── Role definitions for route guards ──────────────────────────────
const ADMIN_STAFF = ['admin', 'portero', 'cajero'] as const;
const ALL_TENANT_ROLES = ['admin', 'portero', 'cajero', 'conductor'] as const;

export default function AppContent() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NetworkGuard />
      <AuthProvider>
        <Routes>
          {/* ── Public routes ─────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/map-public" element={<MapPage />} />

          {/* ── SuperAdmin exclusive routes ────────────────────────── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/superadmin" element={<SuperAdmin />} />
            <Route path="/superadmin/plans" element={<SuperAdmin />} />
            <Route path="/superadmin/users" element={<SuperAdmin />} />
            <Route path="/superadmin/testimonials" element={<SuperAdmin />} />
            <Route path="/superadmin/faqs" element={<SuperAdmin />} />
            <Route path="/superadmin/settings" element={<SuperAdmin />} />
            <Route path="/superadmin/incidents" element={<IncidentReports />} />
            <Route path="/superadmin/tenant/:tenantId" element={<TenantView />} />
          </Route>

          {/* ── Admin-only routes (configuration & administration) ── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/rates" element={<Rates />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/team" element={<TeamUsers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/my-plan" element={<MyPlan />} />
          </Route>

          {/* ── Admin + staff operational routes ───────────────────── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[...ADMIN_STAFF]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/parking" element={<Parking />} />
            <Route path="/capacity" element={<Capacity />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/monthly-subscriptions" element={<MonthlySubscriptions />} />
          </Route>

          {/* ── All tenant roles (map, settings, community) ────────── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[...ALL_TENANT_ROLES]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/map" element={<MapPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/incidents" element={<IncidentReports />} />
          </Route>

          {/* ── Utility routes ────────────────────────────────────── */}
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/suspended" element={<SuspendedAccount />} />
          <Route path="/no-internet" element={<NoInternetConnection />} />
          <Route path="/spaces" element={<Navigate to="/capacity" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  );
}
