import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, Map, Grid3X3, BarChart3, Users, DollarSign,
  UserCog, Shield, Settings, Wallet, CreditCard, MoreHorizontal, Building2,
  Clock, LogOut, Moon, Sun, CalendarDays, MessageSquare, Bug,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/types';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

const MODULE_KEY_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/parking': 'parking',
  '/map': 'map',
  '/capacity': 'capacity',
  '/reports': 'reports',
  '/customers': 'customers',
  '/rates': 'rates',
  '/schedules': 'schedules',
  '/team': 'team',
  '/audit': 'audit',
  '/payments': 'payments',
  '/my-plan': 'my_plan',
  '/settings': 'settings',
  '/monthly-subscriptions': 'monthly_subscriptions',
  '/testimonials': 'testimonials',
};

const ALL_NAV_ITEMS = [
  { label: 'Inicio', icon: LayoutDashboard, path: '/dashboard', module: 'dashboard', roles: ['superadmin', 'admin', 'portero', 'cajero'] },
  { label: 'Vehículos', icon: Car, path: '/parking', module: 'parking', roles: ['admin', 'portero', 'cajero'] },
  { label: 'Mapa', icon: Map, path: '/map', module: 'map', roles: ['admin', 'portero', 'cajero', 'conductor'] },
  { label: 'Aforo', icon: Grid3X3, path: '/capacity', module: 'capacity', roles: ['admin', 'portero', 'cajero'] },
  { label: 'Reportes', icon: BarChart3, path: '/reports', module: 'reports', roles: ['admin'] },
  { label: 'Clientes', icon: Users, path: '/customers', module: 'customers', roles: ['admin', 'portero', 'cajero'] },
  { label: 'Tarifas', icon: DollarSign, path: '/rates', module: 'rates', roles: ['admin'] },
  { label: 'Horarios', icon: Clock, path: '/schedules', module: 'schedules', roles: ['admin'] },
  { label: 'Mensualidades', icon: CalendarDays, path: '/monthly-subscriptions', module: 'monthly_subscriptions', roles: ['admin', 'portero', 'cajero'] },
  { label: 'Equipo', icon: UserCog, path: '/team', module: 'team', roles: ['admin'] },
  { label: 'Auditoría', icon: Shield, path: '/audit', module: 'audit', roles: ['admin'] },
  { label: 'Config', icon: Settings, path: '/settings', module: 'settings', roles: ['admin', 'conductor'] },
  { label: 'Pagos', icon: Wallet, path: '/payments', module: 'payments', roles: ['admin'] },
  { label: 'Mi Plan', icon: CreditCard, path: '/my-plan', module: 'my_plan', roles: ['admin'] },
  { label: 'Testimonios', icon: MessageSquare, path: '/testimonials', module: 'testimonials', roles: ['admin', 'portero', 'cajero', 'conductor'] },
  { label: 'Incidencias', icon: Bug, path: '/incidents', module: 'incidents', roles: ['admin', 'portero', 'cajero', 'conductor'] },
];

const SUPERADMIN_NAV_ITEMS = [
  { label: 'Inicio', icon: LayoutDashboard, path: '/dashboard', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Parqueaderos', icon: Building2, path: '/superadmin', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Planes', icon: CreditCard, path: '/superadmin/plans', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Pagos', icon: Wallet, path: '/payments', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Usuarios', icon: Users, path: '/superadmin/users', module: 'dashboard', roles: ['superadmin'] },
  { label: 'Config', icon: Settings, path: '/superadmin/settings', module: 'dashboard', roles: ['superadmin'] },
];

const MAX_VISIBLE = 4;

export function MobileBottomNav() {
  const { role, profile, signOut } = useAuth();
  const { planModules } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!role) return null;

  const isSuperadmin = role === 'superadmin';
  const effectiveRole = role === 'operator' ? 'portero' : (role === 'viewer' ? 'conductor' : role);
  const itemSource = isSuperadmin ? SUPERADMIN_NAV_ITEMS : ALL_NAV_ITEMS;

  const userModules = profile && (profile as any).user_modules;
  const visibleItems = itemSource.filter((item) => {
    if (!item.roles.includes(effectiveRole)) return false;
    if (!isSuperadmin && planModules.length > 0) {
      const moduleKey = MODULE_KEY_MAP[item.path];
      if (moduleKey && !planModules.includes(moduleKey)) return false;
      if (moduleKey && Array.isArray(userModules) && userModules.length > 0 && !userModules.includes(moduleKey) && !['dashboard', 'settings'].includes(moduleKey)) return false;
    }
    return true;
  });

  if (visibleItems.length === 0) return null;

  const primaryItems = visibleItems.slice(0, MAX_VISIBLE);
  const overflowItems = visibleItems.slice(MAX_VISIBLE);
  const hasOverflow = overflowItems.length > 0;
  const isOverflowActive = overflowItems.some((i) => location.pathname === i.path);

  const getRoleDisplay = (r: string | null) => {
    if (!r) return '';
    if (r === 'operator') return 'Portero';
    if (r === 'viewer' || r === 'conductor') return 'Conductor';
    return ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-md sm:hidden safe-bottom">
        <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
          {primaryItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground active:scale-95'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center rounded-xl transition-all',
                  isActive ? 'bg-primary/10 w-12 h-8' : 'w-10 h-7'
                )}>
                  <item.icon className={cn('h-6 w-6', isActive && 'stroke-[2.5]')} />
                </div>
                <span className={cn('text-[10px] leading-none', isActive ? 'font-bold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {hasOverflow && (
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all',
                isOverflowActive ? 'text-primary' : 'text-muted-foreground active:text-foreground active:scale-95'
              )}
            >
              <div className={cn(
                'flex items-center justify-center rounded-xl transition-all',
                isOverflowActive ? 'bg-primary/10 w-12 h-8' : 'w-10 h-7'
              )}>
                <MoreHorizontal className={cn('h-6 w-6', isOverflowActive && 'stroke-[2.5]')} />
              </div>
              <span className={cn('text-[10px] leading-none', isOverflowActive ? 'font-bold' : 'font-medium')}>
                Más
              </span>
            </button>
          )}
        </div>
      </nav>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">Menú</DrawerTitle>
          </DrawerHeader>
          {/* User info */}
          <div className="px-4 pb-3 flex items-center gap-3 border-b border-border/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">{getRoleDisplay(role)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            {overflowItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <DrawerClose key={item.path} asChild>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                        : 'text-muted-foreground hover:bg-muted active:bg-muted active:scale-95'
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                  </Link>
                </DrawerClose>
              );
            })}
          </div>
          <div className="border-t border-border/50 p-4 pb-8 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11 rounded-xl"
              onClick={() => {
                const isDark = document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
              }}
            >
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="h-5 w-5 hidden dark:block" />
              <span className="dark:hidden">Oscuro</span>
              <span className="hidden dark:block">Claro</span>
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2 h-11 rounded-xl"
              onClick={async () => {
                setDrawerOpen(false);
                await signOut();
                navigate('/');
              }}
            >
              <LogOut className="h-5 w-5" />
              Salir
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
