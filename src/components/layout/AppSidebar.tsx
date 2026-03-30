import {
  LayoutDashboard, Car, Users, DollarSign, BarChart3, Grid3X3,
  Building2, CreditCard, Settings, Map, LogOut, UserCog, RefreshCw, Shield, Moon, Sun, Wallet,
  Clock, CalendarDays, Printer, MessageSquare, Bug,
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
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ROLE_LABELS } from '@/types';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

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
  '/schedules': 'schedules',
  '/monthly-subscriptions': 'monthly_subscriptions',
  '/testimonials': 'testimonials',
};

type MenuItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: readonly string[];
};

const SECTIONS: { label: string; items: MenuItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['superadmin', 'admin', 'portero', 'cajero'] },
      { label: 'Mapa', icon: Map, path: '/map', roles: ['admin', 'portero', 'cajero', 'conductor'] },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Vehículos', icon: Car, path: '/parking', roles: ['admin', 'portero', 'cajero'] },
      { label: 'Aforo', icon: Grid3X3, path: '/capacity', roles: ['admin', 'portero', 'cajero'] },
      { label: 'Clientes', icon: Users, path: '/customers', roles: ['admin', 'portero', 'cajero'] },
      { label: 'Mensualidades', icon: CalendarDays, path: '/monthly-subscriptions', roles: ['admin', 'portero', 'cajero'] },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { label: 'Tarifas', icon: DollarSign, path: '/rates', roles: ['admin'] },
      { label: 'Horarios', icon: Clock, path: '/schedules', roles: ['admin'] },
      { label: 'Equipo', icon: UserCog, path: '/team', roles: ['admin'] },
      { label: 'Ajustes', icon: Settings, path: '/settings', roles: ['admin', 'conductor'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Reportes', icon: BarChart3, path: '/reports', roles: ['admin'] },
      { label: 'Auditoría', icon: Shield, path: '/audit', roles: ['admin'] },
      { label: 'Pagos', icon: Wallet, path: '/payments', roles: ['admin'] },
      { label: 'Mi Plan', icon: CreditCard, path: '/my-plan', roles: ['admin'] },
    ],
  },
  {
    label: 'Comunidad',
    items: [
      { label: 'Testimonios', icon: MessageSquare, path: '/testimonials', roles: ['admin', 'portero', 'cajero', 'conductor'] },
      { label: 'Incidencias', icon: Bug, path: '/incidents', roles: ['admin', 'portero', 'cajero', 'conductor'] },
    ],
  },
];

const SUPERADMIN_SECTIONS: { label: string; items: { label: string; icon: React.ElementType; path: string }[] }[] = [
  {
    label: 'Gestión Global',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Parqueaderos', icon: Building2, path: '/superadmin' },
      { label: 'Planes', icon: CreditCard, path: '/superadmin/plans' },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { label: 'Testimonios', icon: MessageSquare, path: '/superadmin/testimonials' },
      { label: 'FAQ', icon: Shield, path: '/superadmin/faqs' },
      { label: 'Incidencias', icon: Bug, path: '/superadmin/incidents' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Pagos', icon: Wallet, path: '/payments' },
      { label: 'Usuarios', icon: Users, path: '/superadmin/users' },
      { label: 'Configuración', icon: Settings, path: '/superadmin/settings' },
    ],
  },
];

// Map paths to notification query conditions
const NOTIFICATION_PATHS: Record<string, string> = {
  '/incidents': 'incident',
  '/superadmin/incidents': 'incident',
  '/capacity': 'info',
};

export function AppSidebar() {
  const { role, profile, signOut, user } = useAuth();
  const { tenant, planModules } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    enabled: !!user?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      return count || 0;
    },
  });

  // Fetch unread incident reports count (for superadmin)
  const { data: pendingIncidents = 0 } = useQuery({
    queryKey: ['pending-incidents-count'],
    enabled: role === 'superadmin',
    refetchInterval: 15000,
    queryFn: async () => {
      const { count } = await supabase
        .from('incident_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => {
      setRefreshing(false);
      window.location.reload();
    }, 600);
  };

  const isSuperadmin = role === 'superadmin';
  const effectiveRole = role === 'operator' ? 'portero' : (role === 'viewer' ? 'conductor' : role);
  const userModules = profile && (profile as any).user_modules;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getRoleDisplay = (r: string | null) => {
    if (!r) return '';
    if (r === 'operator') return 'Portero';
    if (r === 'viewer') return 'Conductor';
    return ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r;
  };

  const filterItem = (item: MenuItem) => {
    if (!effectiveRole || !item.roles.includes(effectiveRole)) return false;
    if (planModules.length > 0) {
      const moduleKey = MODULE_KEY_MAP[item.path];
      if (moduleKey && !planModules.includes(moduleKey)) return false;
      if (moduleKey && Array.isArray(userModules) && userModules.length > 0 && !userModules.includes(moduleKey) && !['dashboard', 'settings'].includes(moduleKey)) return false;
    }
    return true;
  };

  const hasNewForPath = (path: string): boolean => {
    if (path === '/incidents' || path === '/superadmin/incidents') {
      return isSuperadmin ? pendingIncidents > 0 : false;
    }
    if (path === '/dashboard' && unreadCount > 0) return true;
    return false;
  };

  const NotificationDot = ({ path }: { path: string }) => {
    if (!hasNewForPath(path)) return null;
    return (
      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
      </span>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Link to={isSuperadmin ? '/superadmin' : role === 'conductor' || role === 'viewer' ? '/map' : '/dashboard'} className="flex items-center gap-2 flex-1 min-w-0">
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
        {isSuperadmin
          ? SUPERADMIN_SECTIONS.map((section, idx) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.label}>
                        <Link to={item.path} onClick={() => isMobile && setOpenMobile(false)} className="relative">
                          <div className="relative">
                            <item.icon className="h-4 w-4" />
                            <NotificationDot path={item.path} />
                          </div>
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))
          : SECTIONS.map((section) => {
              const filtered = section.items.filter(filterItem);
              if (filtered.length === 0) return null;
              return (
                <SidebarGroup key={section.label}>
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarMenu>
                    {filtered.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.label}>
                          <Link to={item.path} onClick={() => isMobile && setOpenMobile(false)} className="relative">
                            <div className="relative">
                              <item.icon className="h-4 w-4" />
                              <NotificationDot path={item.path} />
                            </div>
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              );
            })
        }
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary flex-shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Usuario'}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {getRoleDisplay(role)} {tenant?.name ? `· ${tenant.name}` : role === 'superadmin' ? '' : '· Sin asignar'}
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
