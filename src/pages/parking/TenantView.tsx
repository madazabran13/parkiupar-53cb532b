import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Car, Bike, Truck, ParkingCircle, DollarSign, TrendingUp, Clock, Timer, Users, CalendarDays, Building2, CarFront, UserCheck, FileBarChart } from 'lucide-react';
import { formatCurrency, formatDuration, formatTime, formatDateTime } from '@/lib/utils/formatters';
import { calculateLiveFee } from '@/lib/utils/pricing';
import { VEHICLE_TYPE_LABELS, ROLE_LABELS } from '@/types';
import type { Tenant, ParkingSession, VehicleRate, VehicleCategory, UserProfile } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DashboardSkeleton } from '@/components/ui/PageSkeletons';

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  car: Car, motorcycle: Bike, truck: Truck, bicycle: Bike,
};

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

type SubFilter = 'all' | 'active' | 'pending' | 'expired' | 'cancelled';

const getDaysLeft = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

const getSubStatusTV = (sub: any): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  if (!sub.is_active) return { label: 'Cancelada', variant: 'secondary' };
  const days = getDaysLeft(sub.end_date);
  if (days < 0) return { label: 'Vencida', variant: 'destructive' };
  if (days <= 5) return { label: `Vence en ${days}d`, variant: 'outline' };
  return { label: 'Al día', variant: 'default' };
};

export default function TenantView() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [subFilter, setSubFilter] = useState<SubFilter>('all');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useRealtime({
    table: 'parking_sessions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['tv-sessions', tenantId || ''], ['tv-completed', tenantId || '']],
  });

  const { data: tenant, isLoading: loadingTenant } = useQuery({
    queryKey: ['tv-tenant', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*, plans(name, modules, max_spaces, max_users, price_monthly)').eq('id', tenantId!).single();
      return data as any;
    },
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['tv-sessions', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).eq('status', 'active').order('entry_time', { ascending: false });
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const { data: todayCompleted = [] } = useQuery({
    queryKey: ['tv-completed', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).eq('status', 'completed').gte('exit_time', today.toISOString());
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['tv-rates', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_rates').select('*').eq('tenant_id', tenantId!).eq('is_active', true);
      return (data || []) as unknown as VehicleRate[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['tv-categories', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_categories').select('*').eq('tenant_id', tenantId!).eq('is_active', true);
      return (data || []) as unknown as VehicleCategory[];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['tv-team', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('user_profiles').select('*').eq('tenant_id', tenantId!).order('created_at');
      return (data || []) as unknown as UserProfile[];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['tv-subs', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('monthly_subscriptions').select('*').eq('tenant_id', tenantId!).order('end_date', { ascending: false });
      return data || [];
    },
  });

  const { data: spaces = [] } = useQuery({
    queryKey: ['tv-spaces', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('parking_spaces').select('*').eq('tenant_id', tenantId!).order('space_number');
      return data || [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['tv-vehicles', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('*, customers(full_name, phone)').eq('tenant_id', tenantId!).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['tv-customers', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('tenant_id', tenantId!).order('total_visits', { ascending: false });
      return data || [];
    },
  });

  const { data: recentHistory = [] } = useQuery({
    queryKey: ['tv-history', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).in('status', ['completed', 'cancelled']).order('exit_time', { ascending: false }).limit(100);
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const rateMap = Object.fromEntries(rates.map((r) => [r.vehicle_type, r]));
  const getSessionRate = (session: ParkingSession) => {
    const fromRates = rateMap[session.vehicle_type];
    if (fromRates) return { rate_per_hour: fromRates.rate_per_hour, fraction_minutes: fromRates.fraction_minutes };
    const fromCat = categories.find((c) => c.icon === session.vehicle_type);
    if (fromCat) return { rate_per_hour: fromCat.rate_per_hour, fraction_minutes: fromCat.fraction_minutes };
    if (session.rate_per_hour && session.rate_per_hour > 0) return { rate_per_hour: session.rate_per_hour, fraction_minutes: 15 };
    return null;
  };

  if (loadingTenant) return <DashboardSkeleton />;
  if (!tenant) return <div className="p-6 text-center text-muted-foreground">Parqueadero no encontrado</div>;

  const todayRevenue = todayCompleted.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const occupancyPercent = tenant.total_spaces > 0
    ? Math.round(((tenant.total_spaces - tenant.available_spaces) / tenant.total_spaces) * 100)
    : 0;

  const chartData = (['car', 'motorcycle', 'truck', 'bicycle'] as const).map((type) => ({
    name: VEHICLE_TYPE_LABELS[type],
    ingresos: todayCompleted.filter((s) => s.vehicle_type === type).reduce((sum, s) => sum + (s.total_amount || 0), 0),
    cantidad: todayCompleted.filter((s) => s.vehicle_type === type).length,
  })).filter((d) => d.cantidad > 0);

  const spaceStatusCounts = {
    available: spaces.filter((s: any) => s.status === 'available').length,
    occupied: spaces.filter((s: any) => s.status === 'occupied').length,
    reserved: spaces.filter((s: any) => s.status === 'reserved').length,
  };

  const plan = tenant.plans;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">{tenant.name}</h1>
            <Badge variant={tenant.is_active ? 'default' : 'destructive'}>
              {tenant.is_active ? 'Activo' : 'Suspendido'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {tenant.address || tenant.city} · {tenant.phone || 'Sin teléfono'} · {tenant.email || 'Sin email'}
          </p>
        </div>
      </div>

      {/* Plan info */}
      {plan && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-semibold text-sm">{plan.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="font-semibold text-sm">{formatCurrency(plan.price_monthly)}/mes</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Espacios</p>
              <p className="font-semibold text-sm">{plan.max_spaces}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Usuarios</p>
              <p className="font-semibold text-sm">{plan.max_users}</p>
            </div>
            {tenant.plan_expires_at && (
              <div>
                <p className="text-xs text-muted-foreground">Vence</p>
                <p className="font-semibold text-sm">{new Date(tenant.plan_expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Módulos</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {(Array.isArray(plan.modules) ? plan.modules : []).map((m: string) => (
                  <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones ({activeSessions.length})</TabsTrigger>
          <TabsTrigger value="vehicles">Vehículos ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="customers">Clientes ({customers.length})</TabsTrigger>
          <TabsTrigger value="subs">Mensualidades ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="spaces">Aforo ({spaces.length})</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="team">Equipo ({teamMembers.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Espacios</CardTitle>
                <ParkingCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{tenant.available_spaces}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">de {tenant.total_spaces} totales</p>
                <Progress value={occupancyPercent} className="mt-2 h-2" />
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
                <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Ingresos Hoy</CardTitle>
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{todayCompleted.length} completados</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue chart */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Ingresos por Tipo (Hoy)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
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

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{teamMembers.length}</div>
                <p className="text-[10px] text-muted-foreground">Usuarios</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <CalendarDays className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{subscriptions.length}</div>
                <p className="text-[10px] text-muted-foreground">Mensualidades</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <ParkingCircle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{spaces.length}</div>
                <p className="text-[10px] text-muted-foreground">Espacios Config.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{rates.length + categories.length}</div>
                <p className="text-[10px] text-muted-foreground">Tarifas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SESSIONS */}
        <TabsContent value="sessions" className="mt-4">
          {activeSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ParkingCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No hay vehículos estacionados en este momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeSessions.map((session) => {
                const sessionRate = getSessionRate(session);
                const liveFee = sessionRate
                  ? calculateLiveFee(session.entry_time, sessionRate.rate_per_hour, sessionRate.fraction_minutes)
                  : 0;
                const VehicleIcon = VEHICLE_ICONS[session.vehicle_type] || Car;
                const entryDate = new Date(session.entry_time);
                const minutesParked = Math.floor((Date.now() - entryDate.getTime()) / 60000);
                const hours = Math.floor(minutesParked / 60);
                const mins = minutesParked % 60;

                return (
                  <Card key={session.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <VehicleIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-base tracking-wider text-foreground">{session.plate}</span>
                            <p className="text-[10px] text-muted-foreground uppercase">{VEHICLE_TYPE_LABELS[session.vehicle_type]}</p>
                          </div>
                        </div>
                        {session.space_number && <Badge variant="outline" className="text-xs font-mono">#{session.space_number}</Badge>}
                      </div>
                      {session.customer_name && <p className="text-sm text-muted-foreground mb-2 truncate">👤 {session.customer_name}</p>}
                      <div className="flex items-end justify-between mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Timer className="h-3.5 w-3.5" />
                          <span className="text-xs">{formatTime(session.entry_time)} · <span className="font-medium text-foreground">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</span></span>
                        </div>
                        <span className="text-base font-bold text-primary">{formatCurrency(liveFee)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SPACES */}
        <TabsContent value="spaces" className="mt-4">
          {spaces.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ParkingCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No hay espacios configurados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Disponibles: {spaceStatusCounts.available}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Ocupados: {spaceStatusCounts.occupied}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Reservados: {spaceStatusCounts.reserved}
                </Badge>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                {spaces.map((space: any) => (
                  <div
                    key={space.id}
                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-mono font-bold border-2 ${
                      space.status === 'available' ? 'border-green-500/30 bg-green-500/10 text-green-700' :
                      space.status === 'occupied' ? 'border-red-500/30 bg-red-500/10 text-red-700' :
                      'border-amber-500/30 bg-amber-500/10 text-amber-700'
                    }`}
                  >
                    {space.space_number}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="mt-4">
          {teamMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No hay usuarios registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {(member.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.full_name || 'Sin nombre'}</p>
                      <p className="text-xs text-muted-foreground">{member.phone || 'Sin teléfono'}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={member.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                      {!member.is_active && <p className="text-[10px] text-destructive mt-0.5">Inactivo</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SUBSCRIPTIONS - ALL */}
        <TabsContent value="subs" className="mt-4 space-y-4">
          {(() => {
            const subFilterCounts = {
              all: subscriptions.length,
              active: subscriptions.filter((s: any) => s.is_active && getDaysLeft(s.end_date) > 5).length,
              pending: subscriptions.filter((s: any) => s.is_active && getDaysLeft(s.end_date) >= 0 && getDaysLeft(s.end_date) <= 5).length,
              expired: subscriptions.filter((s: any) => s.is_active && getDaysLeft(s.end_date) < 0).length,
              cancelled: subscriptions.filter((s: any) => !s.is_active).length,
            };
            const filteredSubs = subscriptions.filter((sub: any) => {
              if (subFilter === 'all') return true;
              if (subFilter === 'active') return sub.is_active && getDaysLeft(sub.end_date) > 5;
              if (subFilter === 'pending') return sub.is_active && getDaysLeft(sub.end_date) >= 0 && getDaysLeft(sub.end_date) <= 5;
              if (subFilter === 'expired') return sub.is_active && getDaysLeft(sub.end_date) < 0;
              if (subFilter === 'cancelled') return !sub.is_active;
              return true;
            });
            return (
              <>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'all' as SubFilter, label: 'Todas' },
                    { key: 'active' as SubFilter, label: 'Al día' },
                    { key: 'pending' as SubFilter, label: 'Por vencer' },
                    { key: 'expired' as SubFilter, label: 'Vencidas' },
                    { key: 'cancelled' as SubFilter, label: 'Canceladas' },
                  ]).map(({ key, label }) => (
                    <Badge
                      key={key}
                      variant={subFilter === key ? 'default' : 'outline'}
                      className="cursor-pointer text-xs px-3 py-1"
                      onClick={() => setSubFilter(key)}
                    >
                      {label} ({subFilterCounts[key]})
                    </Badge>
                  ))}
                </div>

                {filteredSubs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No hay mensualidades en esta categoría</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSubs.map((sub: any) => {
                      const status = getSubStatusTV(sub);
                      const days = getDaysLeft(sub.end_date);
                      return (
                        <Card key={sub.id} className={!sub.is_active ? 'opacity-60' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono font-bold text-sm">{sub.plate}</span>
                              <div className="flex items-center gap-1">
                                <Badge variant={status.variant} className="text-[10px]">
                                  {status.label}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">{formatCurrency(sub.amount)}/mes</Badge>
                              </div>
                            </div>
                            {sub.customer_name && <p className="text-sm text-muted-foreground truncate">👤 {sub.customer_name}</p>}
                            {sub.customer_phone && <p className="text-xs text-muted-foreground">📞 {sub.customer_phone}</p>}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                              <span>{new Date(sub.start_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                              <span>→</span>
                              <span className={days < 0 ? 'text-destructive font-semibold' : days <= 5 ? 'text-amber-600 font-medium' : ''}>
                                {new Date(sub.end_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {days >= 0 && sub.is_active && ` (${days}d)`}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* VEHICLES */}
        <TabsContent value="vehicles" className="mt-4">
          {vehicles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CarFront className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No hay vehículos registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['car', 'motorcycle', 'truck', 'bicycle'] as const).map((type) => {
                  const count = vehicles.filter((v: any) => v.vehicle_type === type).length;
                  if (count === 0) return null;
                  const Icon = VEHICLE_ICONS[type] || Car;
                  return (
                    <Badge key={type} variant="secondary" className="gap-1">
                      <Icon className="h-3 w-3" /> {VEHICLE_TYPE_LABELS[type]}: {count}
                    </Badge>
                  );
                })}
              </div>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {vehicles.map((v: any) => {
                  const Icon = VEHICLE_ICONS[v.vehicle_type] || Car;
                  const hasActiveSession = activeSessions.some((s) => s.plate === v.plate);
                  return (
                    <Card key={v.id} className={hasActiveSession ? 'border-l-4 border-l-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-mono font-bold text-sm tracking-wider">{v.plate}</span>
                            <p className="text-[10px] text-muted-foreground uppercase">{VEHICLE_TYPE_LABELS[v.vehicle_type]}</p>
                          </div>
                          {hasActiveSession && <Badge className="text-[10px]">En parqueadero</Badge>}
                        </div>
                        {v.brand && <p className="text-xs text-muted-foreground">🚗 {v.brand} {v.color ? `· ${v.color}` : ''}</p>}
                        {v.customers && <p className="text-xs text-muted-foreground truncate">👤 {v.customers.full_name} · {v.customers.phone}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* CUSTOMERS */}
        <TabsContent value="customers" className="mt-4">
          {customers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No hay clientes registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {(c.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone} {c.email ? `· ${c.email}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatCurrency(c.total_spent)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.total_visits} visitas</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REPORTS / HISTORY */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <FileBarChart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{recentHistory.length}</div>
                <p className="text-[10px] text-muted-foreground">Sesiones recientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{formatCurrency(recentHistory.reduce((s, h) => s + (h.total_amount || 0), 0))}</div>
                <p className="text-[10px] text-muted-foreground">Ingresos recientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{recentHistory.filter(h => h.status === 'completed').length}</div>
                <p className="text-[10px] text-muted-foreground">Completadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <CarFront className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{vehicles.length}</div>
                <p className="text-[10px] text-muted-foreground">Vehículos totales</p>
              </CardContent>
            </Card>
          </div>

          {/* History table */}
          {recentHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No hay historial de sesiones</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-sm sm:text-base">Últimas 100 sesiones finalizadas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-2 sm:p-3 text-left font-medium text-muted-foreground">Placa</th>
                        <th className="p-2 sm:p-3 text-left font-medium text-muted-foreground">Tipo</th>
                        <th className="p-2 sm:p-3 text-left font-medium text-muted-foreground">Cliente</th>
                        <th className="p-2 sm:p-3 text-left font-medium text-muted-foreground">Entrada</th>
                        <th className="p-2 sm:p-3 text-left font-medium text-muted-foreground">Salida</th>
                        <th className="p-2 sm:p-3 text-right font-medium text-muted-foreground">Total</th>
                        <th className="p-2 sm:p-3 text-center font-medium text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHistory.map((h) => (
                        <tr key={h.id} className="border-b border-border hover:bg-muted/30">
                          <td className="p-2 sm:p-3 font-mono font-bold">{h.plate}</td>
                          <td className="p-2 sm:p-3 text-muted-foreground">{VEHICLE_TYPE_LABELS[h.vehicle_type]}</td>
                          <td className="p-2 sm:p-3 text-muted-foreground truncate max-w-[120px]">{h.customer_name || '—'}</td>
                          <td className="p-2 sm:p-3 text-muted-foreground whitespace-nowrap">{formatDateTime(h.entry_time)}</td>
                          <td className="p-2 sm:p-3 text-muted-foreground whitespace-nowrap">{h.exit_time ? formatDateTime(h.exit_time) : '—'}</td>
                          <td className="p-2 sm:p-3 text-right font-bold text-primary">{formatCurrency(h.total_amount || 0)}</td>
                          <td className="p-2 sm:p-3 text-center">
                            <Badge variant={h.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                              {h.status === 'completed' ? 'Completada' : 'Cancelada'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}