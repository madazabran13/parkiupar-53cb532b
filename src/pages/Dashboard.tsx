import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Bike, Truck, ParkingCircle, DollarSign, TrendingUp, Clock, Timer } from 'lucide-react';
import { formatCurrency, formatDuration, formatTime } from '@/lib/utils/formatters';
import { calculateLiveFee } from '@/lib/utils/pricing';
import { VEHICLE_TYPE_LABELS } from '@/types';
import type { ParkingSession, VehicleRate } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardSkeleton } from '@/components/ui/PageSkeletons';

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  car: Car,
  motorcycle: Bike,
  truck: Truck,
  bicycle: Bike,
};

export default function Dashboard() {
  const { profile, tenantId } = useAuth();
  const { tenant } = useTenant();
  const [now, setNow] = useState(Date.now());

  // Refresh live fees every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  useRealtime({
    table: 'parking_sessions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['active-sessions', tenantId || ''], ['today-completed', tenantId || '']],
  });

  const { data: activeSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['active-sessions', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('parking_sessions')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active')
        .order('entry_time', { ascending: false });
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const { data: todayCompleted = [] } = useQuery({
    queryKey: ['today-completed', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('parking_sessions')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'completed')
        .gte('exit_time', today.toISOString());
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['rates', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicle_rates')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true);
      return (data || []) as unknown as VehicleRate[];
    },
  });

  const rateMap = Object.fromEntries(rates.map((r) => [r.vehicle_type, r]));
  const todayRevenue = todayCompleted.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const occupancyPercent = tenant
    ? Math.round(((tenant.total_spaces - tenant.available_spaces) / tenant.total_spaces) * 100)
    : 0;

  const chartData = (['car', 'motorcycle', 'truck', 'bicycle'] as const).map((type) => ({
    name: VEHICLE_TYPE_LABELS[type],
    ingresos: todayCompleted
      .filter((s) => s.vehicle_type === type)
      .reduce((sum, s) => sum + (s.total_amount || 0), 0),
    cantidad: todayCompleted.filter((s) => s.vehicle_type === type).length,
  })).filter((d) => d.cantidad > 0);

  if (loadingSessions) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs sm:text-base text-muted-foreground">Bienvenido, {profile?.full_name || 'Usuario'}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Espacios</CardTitle>
            <ParkingCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{tenant?.available_spaces ?? '—'}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">de {tenant?.total_spaces ?? '—'} totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Activos</CardTitle>
            <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{activeSessions.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">en este momento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Ocupación</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{occupancyPercent}%</div>
            <Badge variant={occupancyPercent > 80 ? 'destructive' : 'secondary'} className="mt-1 text-[10px] sm:text-xs">
              {occupancyPercent > 80 ? 'Alta' : 'Normal'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{todayCompleted.length} completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions - Visual Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="text-sm sm:text-lg font-semibold text-foreground">Sesiones Activas</h2>
          <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">{activeSessions.length}</Badge>
        </div>

        {activeSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ParkingCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No hay vehículos estacionados en este momento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeSessions.map((session) => {
              const rate = rateMap[session.vehicle_type];
              const liveFee = rate
                ? calculateLiveFee(session.entry_time, rate.rate_per_hour, rate.fraction_minutes)
                : 0;
              const VehicleIcon = VEHICLE_ICONS[session.vehicle_type] || Car;
              const entryDate = new Date(session.entry_time);
              const minutesParked = Math.floor((Date.now() - entryDate.getTime()) / 60000);
              const hours = Math.floor(minutesParked / 60);
              const mins = minutesParked % 60;

              return (
                <Card key={session.id} className="relative overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    {/* Header: Plate + Vehicle Icon */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <VehicleIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-base tracking-wider text-foreground">
                            {session.plate}
                          </span>
                          <p className="text-[10px] text-muted-foreground uppercase">
                            {VEHICLE_TYPE_LABELS[session.vehicle_type]}
                          </p>
                        </div>
                      </div>
                      {session.space_number && (
                        <Badge variant="outline" className="text-xs font-mono">
                          #{session.space_number}
                        </Badge>
                      )}
                    </div>

                    {/* Customer */}
                    {session.customer_name && (
                      <p className="text-sm text-muted-foreground mb-2 truncate">
                        👤 {session.customer_name}
                      </p>
                    )}

                    {/* Time + Fee */}
                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Timer className="h-3.5 w-3.5" />
                        <span className="text-xs">
                          {formatTime(session.entry_time)} · <span className="font-medium text-foreground">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</span>
                        </span>
                      </div>
                      <span className="text-base font-bold text-primary">
                        {formatCurrency(liveFee)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingresos por Tipo de Vehículo (Hoy)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">Sin datos de hoy</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
