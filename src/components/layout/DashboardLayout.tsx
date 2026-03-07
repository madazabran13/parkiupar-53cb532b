import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';
import { ParkingCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout() {
  const { role } = useAuth();
  const { tenant } = useTenant();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b bg-background px-3 sm:px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex flex-1 items-center justify-between min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {tenant?.name || 'ParkingPro'}
              </h1>
              {tenant && role !== 'superadmin' && (
                <Badge variant="outline" className="gap-1 flex-shrink-0 hidden sm:flex">
                  <ParkingCircle className="h-3 w-3" />
                  {tenant.available_spaces}/{tenant.total_spaces} disponibles
                </Badge>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
