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
import AccessDenied from "@/pages/AccessDenied";
import SuspendedAccount from "@/pages/SuspendedAccount";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Public routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            {/* Map without auth */}
            <Route path="/map-public" element={<MapPage />} />

            {/* Protected dashboard routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'operator', 'viewer']}>
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
              
              <Route path="/my-plan" element={<MyPlan />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Superadmin routes */}
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
              <Route path="/superadmin/settings" element={<SuperAdmin />} />
            </Route>

            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/suspended" element={<SuspendedAccount />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
