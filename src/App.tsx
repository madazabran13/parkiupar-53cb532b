import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SettingsPage from "@/pages/SettingsPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Parking from "@/pages/Parking";
import Customers from "@/pages/Customers";
import Rates from "@/pages/Rates";
import MyPlan from "@/pages/MyPlan";
import TeamUsers from "@/pages/TeamUsers";
import Reports from "@/pages/Reports";
import Capacity from "@/pages/Capacity";
import SuperAdmin from "@/pages/SuperAdmin";
import MapPage from "@/pages/MapPage";
import Payments from "@/pages/Payments";
import AuditLog from "@/pages/AuditLog";
import Schedules from "@/pages/Schedules";
import MonthlySubscriptions from "@/pages/MonthlySubscriptions";
import Testimonials from "@/pages/Testimonials";
import AccessDenied from "@/pages/AccessDenied";
import SuspendedAccount from "@/pages/SuspendedAccount";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import IncidentReports from "./pages/IncidentReports";
import TenantView from "./pages/TenantView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
