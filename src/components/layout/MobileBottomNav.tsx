import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Car, Map, Grid3X3, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';

const MODULE_KEY_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/parking': 'parking',
  '/map': 'map',
  '/capacity': 'capacity',
  '/reports': 'reports',
};

const NAV_ITEMS = [
  { label: 'Inicio', icon: LayoutDashboard, path: '/dashboard', module: 'dashboard', roles: ['superadmin', 'admin', 'operator'] },
  { label: 'Vehículos', icon: Car, path: '/parking', module: 'parking', roles: ['admin', 'operator'] },
  { label: 'Mapa', icon: Map, path: '/map', module: 'map', roles: ['admin', 'operator', 'viewer'] },
  { label: 'Aforo', icon: Grid3X3, path: '/capacity', module: 'capacity', roles: ['admin', 'operator'] },
  { label: 'Reportes', icon: BarChart3, path: '/reports', module: 'reports', roles: ['admin'] },
];

export function MobileBottomNav() {
  const { role } = useAuth();
  const { planModules } = useTenant();
  const location = useLocation();

  if (!role) return null;

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (planModules.length > 0 && !planModules.includes(item.module)) return false;
    return true;
  });

  if (visibleItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md sm:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {visibleItems.slice(0, 5).map((item) => {
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
      </div>
    </nav>
  );
}
