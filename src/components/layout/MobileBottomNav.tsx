import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, Map, Grid3X3, BarChart3, Users, DollarSign,
  UserCog, Shield, Settings, Wallet, CreditCard, MoreHorizontal, Building2,
  Clock, ParkingCircle, LogOut, Moon, Sun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

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

const ALL_NAV_ITEMS = [
  { label: 'Inicio', icon: LayoutDashboard, path: '/dashboard', module: 'dashboard', roles: ['superadmin', 'admin', 'operator'] },
  { label: 'Vehículos', icon: Car, path: '/parking', module: 'parking', roles: ['admin', 'operator'] },
  { label: 'Mapa', icon: Map, path: '/map', module: 'map', roles: ['admin', 'operator', 'viewer'] },
  { label: 'Aforo', icon: Grid3X3, path: '/capacity', module: 'capacity', roles: ['admin', 'operator'] },
  { label: 'Reportes', icon: BarChart3, path: '/reports', module: 'reports', roles: ['admin'] },
  { label: 'Clientes', icon: Users, path: '/customers', module: 'customers', roles: ['admin', 'operator'] },
  { label: 'Tarifas', icon: DollarSign, path: '/rates', module: 'rates', roles: ['admin'] },
  { label: 'Horarios', icon: Clock, path: '/schedules', module: 'schedules', roles: ['admin'] },
  { label: 'Cupos', icon: ParkingCircle, path: '/spaces', module: 'spaces', roles: ['admin', 'operator'] },
  { label: 'Equipo', icon: UserCog, path: '/team', module: 'team', roles: ['admin'] },
  { label: 'Auditoría', icon: Shield, path: '/audit', module: 'audit', roles: ['admin'] },
  { label: 'Config', icon: Settings, path: '/settings', module: 'settings', roles: ['admin', 'viewer'] },
  { label: 'Pagos', icon: Wallet, path: '/payments', module: 'payments', roles: ['admin'] },
  { label: 'Mi Plan', icon: CreditCard, path: '/my-plan', module: 'my_plan', roles: ['admin'] },
];

const SUPERADMIN_NAV_ITEMS = [
  { label: 'Inicio', icon: LayoutDashboard, path: '/dashboard', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Parqueaderos', icon: Building2, path: '/superadmin', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Planes', icon: CreditCard, path: '/superadmin/plans', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Pagos', icon: Wallet, path: '/payments', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Usuarios', icon: Users, path: '/superadmin/users', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Config', icon: Settings, path: '/superadmin/settings', module: 'dashboard', roles: ['superadmin'] },
];

const MAX_VISIBLE = 4; // Show 4 + "More" button

export function MobileBottomNav() {
  const { role } = useAuth();
  const { planModules } = useTenant();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!role) return null;

  const isSuperadmin = role === 'superadmin';
  const itemSource = isSuperadmin ? SUPERADMIN_NAV_ITEMS : ALL_NAV_ITEMS;

  const visibleItems = itemSource.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (!isSuperadmin && planModules.length > 0) {
      const moduleKey = MODULE_KEY_MAP[item.path];
      if (moduleKey && !planModules.includes(moduleKey)) return false;
    }
    return true;
  });

  if (visibleItems.length === 0) return null;

  const primaryItems = visibleItems.slice(0, MAX_VISIBLE);
  const overflowItems = visibleItems.slice(MAX_VISIBLE);
  const hasOverflow = overflowItems.length > 0;
  const isOverflowActive = overflowItems.some((i) => location.pathname === i.path);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-around h-14 px-1 pb-[env(safe-area-inset-bottom)]">
          {primaryItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-normal')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {hasOverflow && (
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors',
                isOverflowActive ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5', isOverflowActive && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] leading-tight', isOverflowActive ? 'font-semibold' : 'font-normal')}>
                Más
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Overflow Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Menú</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-2 p-4 pb-8">
            {overflowItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <DrawerClose key={item.path} asChild>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted active:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                </DrawerClose>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
