import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Badge } from '@/components/ui/badge';
import { ParkingCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/NotificationBell';

export default function DashboardLayout() {
  const { role } = useAuth();
  const { tenant } = useTenant();
  useThemeColor(); // Apply persisted theme color
  const navigate = useNavigate();

  // Immediately redirect to suspended page when tenant is deactivated via realtime
  useEffect(() => {
    if (role !== 'superadmin' && tenant && !tenant.is_active) {
      navigate('/suspended', { replace: true });
    }
  }, [tenant?.is_active, role, navigate, tenant]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden sm:block">
          <AppSidebar />
        </div>
        <SidebarInset>
          <header className="flex h-12 sm:h-14 items-center gap-2 border-b bg-background px-2 sm:px-4">
            <SidebarTrigger className="h-8 w-8 hidden sm:flex" />
            <Separator orientation="vertical" className="h-5 sm:h-6 hidden sm:block" />
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="flex items-center gap-2 sm:hidden">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 rounded object-contain" />
                <h1 className="text-sm font-semibold text-foreground truncate">
                  {tenant?.name || 'ParkiUpar'}
                </h1>
              </div>
              <h1 className="text-sm font-semibold text-foreground truncate hidden sm:block">
                {tenant?.name || 'ParkiUpar'}
              </h1>
              {tenant && role !== 'superadmin' && (
                <Badge variant="outline" className="gap-1 flex-shrink-0 hidden sm:flex text-xs">
                  <ParkingCircle className="h-3 w-3" />
                  {tenant.available_spaces}/{tenant.total_spaces} disponibles
                </Badge>
              )}
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 pb-16 sm:pb-4 md:pb-6">
            <Outlet />
          </main>
        </SidebarInset>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
