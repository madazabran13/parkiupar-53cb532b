import {
  LayoutDashboard, Car, Users, DollarSign, BarChart3, Grid3X3,
  Building2, CreditCard, Settings, Map,
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';

const MENU_ITEMS = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['superadmin', 'admin', 'operator', 'viewer'] },
  parking: { label: 'Vehículos', icon: Car, path: '/parking', roles: ['admin', 'operator'] },
  customers: { label: 'Clientes', icon: Users, path: '/customers', roles: ['admin', 'operator'] },
  rates: { label: 'Tarifas', icon: DollarSign, path: '/rates', roles: ['admin'] },
  reports: { label: 'Reportes', icon: BarChart3, path: '/reports', roles: ['admin'] },
  capacity: { label: 'Aforo', icon: Grid3X3, path: '/capacity', roles: ['admin', 'operator'] },
  map: { label: 'Mapa', icon: Map, path: '/map', roles: ['admin', 'operator', 'viewer', 'enduser'] },
} as const;

const SUPERADMIN_ITEMS = [
  { label: 'Parqueaderos', icon: Building2, path: '/superadmin' },
  { label: 'Planes', icon: CreditCard, path: '/superadmin/plans' },
  { label: 'Configuración', icon: Settings, path: '/superadmin/settings' },
];

export function AppSidebar() {
  const { role, profile } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();

  const isSuperadmin = role === 'superadmin';
  const menuItems = isSuperadmin
    ? SUPERADMIN_ITEMS
    : Object.values(MENU_ITEMS).filter((item) => role && (item.roles as readonly string[]).includes(role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to={isSuperadmin ? '/superadmin' : '/dashboard'} className="flex items-center gap-2">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <Car className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <span className="font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {tenant?.name || 'ParkingPro'}
          </span>
        </Link>
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
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-sidebar-foreground truncate max-w-[140px]">
              {profile?.full_name || 'Usuario'}
            </span>
            <Badge variant="secondary" className="w-fit text-[10px]">
              {role || 'usuario'}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
