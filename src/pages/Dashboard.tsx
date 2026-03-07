import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, ParkingCircle, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency, formatDuration, formatTime } from '@/lib/utils/formatters';
import { calculateLiveFee } from '@/lib/utils/pricing';
import { VEHICLE_TYPE_LABELS } from '@/types';
import type { ParkingSession, VehicleRate } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { profile, tenantId } = useAuth();
  const { tenant } = useTenant();
  const [now, setNow] = useState(Date.now());

  // Refresh live fees every 60s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useRealtime({
    table: 'parking_sessions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['active-sessions', tenantId || ''], ['today-completed', tenantId || '']],
  });

  // Active sessions
  const { data: activeSessions = [] } = useQuery({
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

  // Today's completed sessions for revenue
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

  // Rates for live fee calculation
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

  // Chart data: revenue by vehicle type
  const chartData = (['car', 'motorcycle', 'truck', 'bicycle'] as const).map((type) => ({
    name: VEHICLE_TYPE_LABELS[type],
    ingresos: todayCompleted
      .filter((s) => s.vehicle_type === type)
      .reduce((sum, s) => sum + (s.total_amount || 0), 0),
    cantidad: todayCompleted.filter((s) => s.vehicle_type === type).length,
  })).filter((d) => d.cantidad > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido, {profile?.full_name || 'Usuario'}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Espacios Disponibles</CardTitle>
            <ParkingCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant?.available_spaces ?? '—'}</div>
            <p className="text-xs text-muted-foreground">de {tenant?.total_spaces ?? '—'} totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehículos Activos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground">en este momento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ocupación</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyPercent}%</div>
            <Badge variant={occupancyPercent > 80 ? 'destructive' : 'secondary'} className="mt-1">
              {occupancyPercent > 80 ? 'Alta' : 'Normal'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">{todayCompleted.length} servicios completados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
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

        {/* Active vehicles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Vehículos Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay vehículos activos</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {activeSessions.slice(0, 10).map((session) => {
                  const rate = rateMap[session.vehicle_type];
                  const liveFee = rate
                    ? calculateLiveFee(session.entry_time, rate.rate_per_hour, rate.fraction_minutes)
                    : 0;
                  return (
                    <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{session.plate}</Badge>
                        <div>
                          <p className="text-sm font-medium">{session.customer_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {VEHICLE_TYPE_LABELS[session.vehicle_type]} · {formatTime(session.entry_time)} · {formatDuration(session.entry_time)}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm">{formatCurrency(liveFee)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
