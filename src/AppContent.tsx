import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
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

export default function AppContent() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/map-public" element={<MapPage />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'operator', 'viewer', 'cajero', 'portero', 'conductor']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/parking" element={<Parking />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/rates" element={<Rates />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/capacity" element={<Capacity />} />
            <Route path="/team" element={<TeamUsers />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/monthly-subscriptions" element={<MonthlySubscriptions />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/my-plan" element={<MyPlan />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/incidents" element={<IncidentReports />} />
          </Route>

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

          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/suspended" element={<SuspendedAccount />} />
          <Route path="/spaces" element={<Navigate to="/capacity" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  );
}
