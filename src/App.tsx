import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Parking from "@/pages/Parking";
import Customers from "@/pages/Customers";
import Rates from "@/pages/Rates";
import Reports from "@/pages/Reports";
import Capacity from "@/pages/Capacity";
import SuperAdmin from "@/pages/SuperAdmin";
import MapPage from "@/pages/MapPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* Map is also accessible without auth */}
            <Route path="/map" element={<MapPage />} />

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
              <Route path="/superadmin/settings" element={<SuperAdmin />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
