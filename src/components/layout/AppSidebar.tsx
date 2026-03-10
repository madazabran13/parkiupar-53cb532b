import {
  LayoutDashboard, Car, Users, DollarSign, BarChart3, Grid3X3,
  Building2, CreditCard, Settings, Map, LogOut, UserCog, RefreshCw, Shield, Moon, Sun, Wallet,
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/hooks/useTenant';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const MODULE_KEY_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/parking': 'parking',
  '/customers': 'customers',
  '/rates': 'rates',
  '/reports': 'reports',
  '/capacity': 'capacity',
  '/map': 'map',
  '/team': 'team',
  '/audit': 'audit',
  '/payments': 'payments',
  '/my-plan': 'my_plan',
  '/settings': 'settings',
};

const MENU_ITEMS = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['superadmin', 'admin', 'operator'] },
  parking: { label: 'Vehículos', icon: Car, path: '/parking', roles: ['admin', 'operator'] },
  customers: { label: 'Clientes', icon: Users, path: '/customers', roles: ['admin', 'operator'] },
  rates: { label: 'Tarifas', icon: DollarSign, path: '/rates', roles: ['admin'] },
  reports: { label: 'Reportes', icon: BarChart3, path: '/reports', roles: ['admin'] },
  capacity: { label: 'Aforo', icon: Grid3X3, path: '/capacity', roles: ['admin', 'operator'] },
  map: { label: 'Mapa', icon: Map, path: '/map', roles: ['admin', 'operator', 'viewer'] },
  team: { label: 'Equipo', icon: UserCog, path: '/team', roles: ['admin'] },
  audit: { label: 'Auditoría', icon: Shield, path: '/audit', roles: ['admin'] },
  settings: { label: 'Configuración', icon: Settings, path: '/settings', roles: ['admin', 'viewer'] },
  payments: { label: 'Pagos', icon: Wallet, path: '/payments', roles: ['admin'] },
  myPlan: { label: 'Mi Plan', icon: CreditCard, path: '/my-plan', roles: ['admin'] },
} as const;

const SUPERADMIN_ITEMS = [
  { label: 'Parqueaderos', icon: Building2, path: '/superadmin' },
  { label: 'Planes', icon: CreditCard, path: '/superadmin/plans' },
  { label: 'Pagos', icon: Wallet, path: '/payments' },
  { label: 'Usuarios', icon: Users, path: '/superadmin/users' },
  { label: 'Configuración', icon: Settings, path: '/superadmin/settings' },
];

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const { tenant, planModules } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => {
      setRefreshing(false);
      window.location.reload();
    }, 600);
  };

  const isSuperadmin = role === 'superadmin';
  const menuItems = isSuperadmin
    ? SUPERADMIN_ITEMS
    : Object.values(MENU_ITEMS).filter((item) => {
        if (!role || !(item.roles as readonly string[]).includes(role)) return false;
        if (planModules.length > 0) {
          const moduleKey = MODULE_KEY_MAP[item.path];
          if (moduleKey && moduleKey !== '_always_' && !planModules.includes(moduleKey)) return false;
        }
        return true;
      });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Link to={isSuperadmin ? '/superadmin' : role === 'viewer' ? '/map' : '/dashboard'} className="flex items-center gap-2 flex-1 min-w-0">
            <img src="/logo.png" alt="ParkiUpar" className="h-8 w-8 rounded object-contain flex-shrink-0" />
            <span className="font-bold text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
              {tenant?.name || 'ParkiUpar'}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
            onClick={handleRefresh}
            title="Actualizar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isSuperadmin ? 'Administración' : 'Menú'}</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.label}
                >
                  <Link to={item.path} onClick={() => isMobile && setOpenMobile(false)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground flex-shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Usuario'}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {tenant?.name || (role === 'superadmin' ? 'Super Admin' : 'Sin asignar')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
            onClick={() => {
              const isDark = document.documentElement.classList.toggle('dark');
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
            }}
            title="Cambiar tema"
          >
            <Sun className="h-3.5 w-3.5 dark:hidden" />
            <Moon className="h-3.5 w-3.5 hidden dark:block" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:hidden"
            onClick={handleSignOut}
            title="Cerrar sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
