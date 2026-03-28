import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import type { AppRole } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardLoadingSkeleton() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar skeleton - hidden on mobile */}
      <div className="hidden sm:flex w-64 border-r border-border flex-col p-4 gap-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
        <Skeleton className="h-4 w-24 mt-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`s${i}`} className="h-8 w-full rounded-md" />
        ))}
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 sm:h-14 border-b border-border flex items-center px-4 gap-3">
          <Skeleton className="h-6 w-6 rounded sm:hidden" />
          <Skeleton className="h-5 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex-1 p-4 sm:p-6 space-y-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();

  if (loading || tenantLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If tenant is suspended and user is not superadmin, redirect to suspended page
  if (role !== 'superadmin' && tenant && !tenant.is_active) {
    return <Navigate to="/suspended" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
