import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicRoute from '@/components/PublicRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NetworkGuard from '@/components/NetworkGuard';
import RouteFallback from '@/components/RouteFallback';
import {
  PUBLIC_ROUTES,
  PUBLIC_ONLY_ROUTES,
  PROTECTED_ROUTES,
  UTILITY_ROUTES,
  type RouteDefinition,
} from '@/routes/routes.config';

function renderPublic(route: RouteDefinition) {
  const Component = route.component;
  return <Route key={route.path} path={route.path} element={<Component />} />;
}

function renderPublicOnly(route: RouteDefinition) {
  const Component = route.component;
  return (
    <Route
      key={route.path}
      path={route.path}
      element={
        <PublicRoute>
          <Component />
        </PublicRoute>
      }
    />
  );
}

function groupProtectedByRoles(routes: RouteDefinition[]) {
  const groups = new Map<string, { roles: RouteDefinition['allowedRoles']; items: RouteDefinition[] }>();
  for (const r of routes) {
    const key = (r.allowedRoles ?? []).slice().sort().join('|');
    if (!groups.has(key)) groups.set(key, { roles: r.allowedRoles, items: [] });
    groups.get(key)!.items.push(r);
  }
  return Array.from(groups.values());
}

export default function AppContent() {
  const protectedGroups = groupProtectedByRoles(PROTECTED_ROUTES);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NetworkGuard />
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {PUBLIC_ROUTES.map(renderPublic)}
            {PUBLIC_ONLY_ROUTES.map(renderPublicOnly)}

            {protectedGroups.map((group, idx) => (
              <Route
                key={`group-${idx}`}
                element={
                  <ProtectedRoute allowedRoles={group.roles}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {group.items.map((r) => {
                  const Component = r.component;
                  return <Route key={r.path} path={r.path} element={<Component />} />;
                })}
              </Route>
            ))}

            <Route path="/spaces" element={<Navigate to="/capacity" replace />} />

            {UTILITY_ROUTES.map(renderPublic)}
          </Routes>
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  );
}
