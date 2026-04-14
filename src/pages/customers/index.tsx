import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TenantService } from '@/services/tenant.service';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/types';
import type { Customer, ParkingSession, MonthlySubscription } from '@/types';
import { TableSkeleton } from '@/components/ui/PageSkeletons';
import { Printer, CalendarDays } from 'lucide-react';
import { generateExitReceiptPDF } from '@/lib/utils/pdfGenerators';

export default function Customers() {
  const { tenantId } = useAuth();
  const { tenant, planModules } = useTenant();
  const [selected, setSelected] = useState<Customer | null>(null);
  const hasPrinting = planModules.includes('printing');
  const hasMonthly = planModules.includes('monthly_subscriptions');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('tenant_id', tenantId!).order('created_at', { ascending: false });
      return (data || []) as unknown as Customer[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['customer-sessions', selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from('parking_sessions').select('*').eq('customer_id', selected!.id).order('entry_time', { ascending: false });
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['customer-subscriptions', selected?.id],
    enabled: !!selected && hasMonthly,
    queryFn: async () => {
      const { data } = await supabase.from('monthly_subscriptions').select('*').eq('customer_id', selected!.id).order('start_date', { ascending: false });
      return (data || []) as unknown as MonthlySubscription[];
    },
  });

  const columns: Column<Customer>[] = [
    { key: 'full_name', label: 'Nombre' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Email', hideOnMobile: true },
    { key: 'total_visits', label: 'Visitas', render: (r) => <Badge variant="secondary">{r.total_visits}</Badge> },
    { key: 'total_spent', label: 'Total Gastado', render: (r) => formatCurrency(r.total_spent), hideOnMobile: true },
    { key: 'created_at', label: 'Registro', render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
  ];

  const sessionColumns: Column<ParkingSession>[] = [
    { key: 'plate', label: 'Placa', render: (r) => <Badge variant="outline" className="font-mono">{r.plate}</Badge> },
    { key: 'vehicle_type', label: 'Tipo', render: (r) => VEHICLE_TYPE_LABELS[r.vehicle_type], hideOnMobile: true },
    { key: 'entry_time', label: 'Entrada', render: (r) => formatDateTime(r.entry_time) },
    { key: 'exit_time', label: 'Salida', render: (r) => r.exit_time ? formatDateTime(r.exit_time) : '—', hideOnMobile: true },
    { key: 'total_amount', label: 'Total', render: (r) => r.total_amount != null ? formatCurrency(r.total_amount) : '—' },
    { key: 'status', label: 'Estado', render: (r) => <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>{SESSION_STATUS_LABELS[r.status]}</Badge> },
  ];

  const handlePrintSession = (session: ParkingSession) => {
    if (!session.exit_time || !session.total_amount) return;
    generateExitReceiptPDF({
      tenantName: tenant?.name || 'Parqueadero',
      tenantAddress: tenant?.address,
      tenantPhone: tenant?.phone,
      plate: session.plate,
      vehicleType: VEHICLE_TYPE_LABELS[session.vehicle_type] || session.vehicle_type,
      customerName: session.customer_name,
      spaceNumber: session.space_number,
      entryTime: session.entry_time,
      exitTime: session.exit_time,
      totalMinutes: Math.round((session.hours_parked || 0) * 60),
      fractions: 0,
      costPerFraction: 0,
      ratePerHour: session.rate_per_hour || 0,
      fractionMinutes: 15,
      total: session.total_amount,
    });
  };

  if (isLoading) return <TableSkeleton columns={5} rows={6} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Historial de clientes del parqueadero</p>
      </div>

      <DataTable columns={columns} data={customers} loading={isLoading} onRowClick={setSelected} searchPlaceholder="Buscar por nombre, teléfono..." />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Detalle: {selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Teléfono:</span> <strong>{selected.phone}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <strong>{selected.email || '—'}</strong></div>
                <div><span className="text-muted-foreground">Visitas:</span> <strong>{selected.total_visits}</strong></div>
                <div><span className="text-muted-foreground">Total gastado:</span> <strong>{formatCurrency(selected.total_spent)}</strong></div>
              </div>

              <Tabs defaultValue="visits">
                <TabsList className="w-full">
                  <TabsTrigger value="visits" className="flex-1">Visitas ({sessions.length})</TabsTrigger>
                  {hasMonthly && <TabsTrigger value="subscriptions" className="flex-1">Mensualidades ({subscriptions.length})</TabsTrigger>}
                </TabsList>

                <TabsContent value="visits" className="mt-3">
                  <DataTable
                    columns={sessionColumns}
                    data={sessions}
                    pageSize={5}
                    searchPlaceholder="Buscar sesiones..."
                    actions={hasPrinting ? (row) => (
                      row.status === 'completed' && row.total_amount ? (
                        <Button size="sm" variant="ghost" onClick={() => handlePrintSession(row)} title="Imprimir recibo">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      ) : null
                    ) : undefined}
                  />
                </TabsContent>

                {hasMonthly && (
                  <TabsContent value="subscriptions" className="mt-3">
                    {subscriptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Sin mensualidades registradas</p>
                    ) : (
                      <div className="space-y-2">
                        {subscriptions.map((sub) => (
                          <div key={sub.id} className="rounded-lg border p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{sub.plate} · {formatCurrency(sub.amount)}/mes</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(sub.start_date).toLocaleDateString('es-CO')} → {new Date(sub.end_date).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                            </div>
                            <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                              {sub.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
