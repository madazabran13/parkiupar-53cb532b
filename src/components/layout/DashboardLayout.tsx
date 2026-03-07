import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, ParkingCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout() {
  const { signOut, profile, role } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-sm font-semibold text-foreground">
              {tenant?.name || 'ParkingPro'}
            </h1>
            <div className="flex items-center gap-3">
              {tenant && role !== 'superadmin' && (
                <Badge variant="outline" className="gap-1">
                  <ParkingCircle className="h-3 w-3" />
                  {tenant.available_spaces}/{tenant.total_spaces} disponibles
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
