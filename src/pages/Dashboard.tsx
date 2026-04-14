import { useEffect, useState } from 'react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { useRateStrategy } from '@/hooks/useRateStrategy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Car, Bike, Truck, ParkingCircle, DollarSign, TrendingUp, Clock, Timer, LogOut, AlertTriangle, Printer } from 'lucide-react';
import { formatCurrency, formatDuration, formatTime, formatDateTime } from '@/lib/utils/formatters';
import { calculateLiveFee, calculateParkingFee } from '@/lib/utils/pricing';
import { generateExitReceiptPDF } from '@/lib/utils/pdfGenerators';
import { VEHICLE_TYPE_LABELS } from '@/types';
import type { ParkingSession, VehicleRate, VehicleCategory } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardSkeleton } from '@/components/ui/PageSkeletons';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { ParkingService, VehicleService } from '@/services';

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  car: Car,
  motorcycle: Bike,
  truck: Truck,
  bicycle: Bike,
};

export default function Dashboard() {
  const { profile, tenantId } = useAuth();
  const { tenant, planModules } = useTenant();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [selectedSession, setSelectedSession] = useState<ParkingSession | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const hasPrinting = planModules.includes('printing');

  // Refresh live fees every 1s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
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
    queryFn: () => ParkingService.getActiveSessions(tenantId!),
  });

  const { data: todayCompleted = [] } = useQuery({
    queryKey: ['today-completed', tenantId],
    enabled: !!tenantId,
    queryFn: () => ParkingService.getTodayCompleted(tenantId!),
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['rates', tenantId],
    enabled: !!tenantId,
    queryFn: () => VehicleService.getActiveRates(tenantId!),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['vehicle-categories', tenantId],
    enabled: !!tenantId,
    queryFn: () => VehicleService.getActiveCategories(tenantId!),
  });

  // Strategy pattern for rate resolution
  const { resolveRate } = useRateStrategy(rates, categories);

  const getSessionRate = (session: ParkingSession) => {
    const resolved = resolveRate(session);
    if (resolved.source === 'none') return null;
    return { rate_per_hour: resolved.ratePerHour, fraction_minutes: resolved.fractionMinutes };
  };

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

  // Exit fee calculation for selected session
  const selectedRate = selectedSession ? getSessionRate(selectedSession) : null;
  const exitFee = selectedSession && selectedRate
    ? calculateParkingFee(selectedSession.entry_time, new Date().toISOString(), selectedRate.rate_per_hour, selectedRate.fraction_minutes)
    : null;

  // Exit mutation
  const exitMutation = useMutation({
    mutationFn: async (session: ParkingSession) => {
      const exitTime = new Date().toISOString();
      const rate = getSessionRate(session);
      const fee = rate
        ? calculateParkingFee(session.entry_time, exitTime, rate.rate_per_hour, rate.fraction_minutes)
        : { total: 0, totalMinutes: 0, fractions: 0, costPerFraction: 0 };

      await ParkingService.completeSession({
        sessionId: session.id,
        exitTime,
        hoursParked: Math.round(fee.totalMinutes / 60 * 100) / 100,
        totalAmount: fee.total,
      });

      if (session.space_number) {
        const spaces = await SpaceService.findByNumber(tenantId!, session.space_number);
        if (spaces) await SpaceService.setAvailable(spaces.id);
      }
      return { session, exitTime, fee, rate };
    },
    onSuccess: (result) => {
      toast.success('Salida registrada');
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['today-completed'] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
      if (hasPrinting && result?.rate) {
        setReceiptData({
          tenantName: tenant?.name || 'Parqueadero', tenantAddress: tenant?.address, tenantPhone: tenant?.phone,
          plate: result.session.plate, vehicleType: VEHICLE_TYPE_LABELS[result.session.vehicle_type],
          customerName: result.session.customer_name, spaceNumber: result.session.space_number,
          entryTime: result.session.entry_time, exitTime: result.exitTime,
          totalMinutes: result.fee.totalMinutes, fractions: result.fee.fractions,
          costPerFraction: result.fee.costPerFraction, ratePerHour: result.rate.rate_per_hour,
          fractionMinutes: result.rate.fraction_minutes, total: result.fee.total,
        });
      }
    },
    onError: () => toast.error('Error al registrar salida'),
  });

  if (loadingSessions) {
    return <DashboardSkeleton />;
  }

  return (
    <PullToRefresh queryKeys={[['active-sessions', tenantId || ''], ['today-completed', tenantId || '']]}>
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

      {/* Overcapacity Alert */}
      {tenant && activeSessions.length > tenant.total_spaces && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Sobrecupo detectado</AlertTitle>
          <AlertDescription className="text-sm">
            Hay <strong>{activeSessions.length}</strong> vehículos estacionados pero tu plan solo permite <strong>{tenant.total_spaces}</strong> espacios.
            Se excede en <strong>{activeSessions.length - tenant.total_spaces}</strong> {activeSessions.length - tenant.total_spaces === 1 ? 'vehículo' : 'vehículos'}.
            Considera actualizar tu plan o registrar salidas pendientes.
          </AlertDescription>
        </Alert>
      )}

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
                <Card
                  key={session.id}
                  className="relative overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-primary cursor-pointer group"
                  onClick={() => setSelectedSession(session)}
                >
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

                    {/* Hover hint */}
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <Badge className="bg-primary text-primary-foreground shadow-lg">
                        <LogOut className="h-3 w-3 mr-1" /> Ver detalles / Salida
                      </Badge>
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

      {/* Session Detail / Exit Modal */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del Vehículo</DialogTitle>
            <DialogDescription>Información completa y opción de salida</DialogDescription>
          </DialogHeader>
          {selectedSession && (() => {
            const VIcon = VEHICLE_ICONS[selectedSession.vehicle_type] || Car;
            const minutesParked = Math.floor((Date.now() - new Date(selectedSession.entry_time).getTime()) / 60000);
            const hours = Math.floor(minutesParked / 60);
            const mins = minutesParked % 60;

            return (
              <div className="space-y-4">
                {/* Vehicle header */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <VIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-xl tracking-wider text-foreground">
                      {selectedSession.plate}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {VEHICLE_TYPE_LABELS[selectedSession.vehicle_type]}
                      {selectedSession.space_number && ` · Espacio #${selectedSession.space_number}`}
                    </p>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente</span>
                    <p className="font-medium">{selectedSession.customer_name || 'Sin registrar'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono</span>
                    <p className="font-medium">{selectedSession.customer_phone || 'Sin registrar'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entrada</span>
                    <p className="font-medium">{formatDateTime(selectedSession.entry_time)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tiempo</span>
                    <p className="font-medium">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</p>
                  </div>
                  {selectedSession.notes && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Notas</span>
                      <p className="font-medium">{selectedSession.notes}</p>
                    </div>
                  )}
                </div>

                {/* Fee breakdown */}
                {exitFee && selectedRate && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total a cobrar</p>
                      <p className="text-3xl font-bold text-primary">{formatCurrency(exitFee.total)}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {exitFee.totalMinutes} min · {exitFee.fractions} fracciones × {formatCurrency(exitFee.costPerFraction)}
                      </p>
                    </div>

                    <details className="group">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-center select-none">
                        Ver desglose detallado
                      </summary>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tiempo total</span>
                          <span className="font-medium">{exitFee.totalMinutes} min ({Math.floor(exitFee.totalMinutes / 60)}h {exitFee.totalMinutes % 60}m)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tarifa por hora</span>
                          <span className="font-medium">{formatCurrency(selectedRate.rate_per_hour)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fracción</span>
                          <span className="font-medium">{selectedRate.fraction_minutes} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Costo por fracción</span>
                          <span className="font-medium">{formatCurrency(exitFee.costPerFraction)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fracciones cobradas</span>
                          <span className="font-medium">{exitFee.fractions}</span>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedSession(null)}>Cerrar</Button>
            <Button
              onClick={() => setConfirmExit(true)}
              disabled={exitMutation.isPending}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {exitMutation.isPending ? 'Procesando...' : 'Registrar Salida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={confirmExit} onOpenChange={setConfirmExit} title="Confirmar Salida"
        description={`¿Registrar salida del vehículo ${selectedSession?.plate || ''}? Total: ${exitFee ? formatCurrency(exitFee.total) : '$0'}`}
        onConfirm={() => { setConfirmExit(false); if (selectedSession) exitMutation.mutate(selectedSession); }} variant="destructive" loading={exitMutation.isPending} />

      {/* Receipt Dialog */}
      <Dialog open={!!receiptData} onOpenChange={() => setReceiptData(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recibo de Salida</DialogTitle>
            <DialogDescription>La salida ha sido registrada exitosamente</DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Placa:</span><strong className="font-mono">{receiptData.plate}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><strong>{receiptData.vehicleType}</strong></div>
                {receiptData.customerName && <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><strong>{receiptData.customerName}</strong></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Duración:</span><strong>{Math.floor(receiptData.totalMinutes / 60)}h {receiptData.totalMinutes % 60}m</strong></div>
              </div>
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Total cobrado</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(receiptData.total)}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setReceiptData(null)}>Cerrar</Button>
            <Button onClick={() => { generateExitReceiptPDF(receiptData); }}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}
