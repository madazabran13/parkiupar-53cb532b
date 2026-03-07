import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/types';
import type { Customer, ParkingSession } from '@/types';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

export default function Customers() {
  const { tenantId } = useAuth();
  const [selected, setSelected] = useState<Customer | null>(null);

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

  const columns: Column<Customer>[] = [
    { key: 'full_name', label: 'Nombre' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
    { key: 'total_visits', label: 'Visitas', render: (r) => <Badge variant="secondary">{r.total_visits}</Badge> },
    { key: 'total_spent', label: 'Total Gastado', render: (r) => formatCurrency(r.total_spent) },
    { key: 'created_at', label: 'Registro', render: (r) => formatDateTime(r.created_at) },
  ];

  const sessionColumns: Column<ParkingSession>[] = [
    { key: 'plate', label: 'Placa', render: (r) => <Badge variant="outline" className="font-mono">{r.plate}</Badge> },
    { key: 'vehicle_type', label: 'Tipo', render: (r) => VEHICLE_TYPE_LABELS[r.vehicle_type] },
    { key: 'entry_time', label: 'Entrada', render: (r) => formatDateTime(r.entry_time) },
    { key: 'exit_time', label: 'Salida', render: (r) => r.exit_time ? formatDateTime(r.exit_time) : '—' },
    { key: 'total_amount', label: 'Total', render: (r) => r.total_amount != null ? formatCurrency(r.total_amount) : '—' },
    { key: 'status', label: 'Estado', render: (r) => <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>{SESSION_STATUS_LABELS[r.status]}</Badge> },
  ];

  if (isLoading) return <TableSkeleton columns={5} rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">Historial de clientes del parqueadero</p>
      </div>

      <DataTable columns={columns} data={customers} loading={isLoading} onRowClick={setSelected} searchPlaceholder="Buscar por nombre, teléfono..." />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Cliente: {selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Teléfono:</span> <strong>{selected.phone}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <strong>{selected.email || '—'}</strong></div>
                <div><span className="text-muted-foreground">Visitas:</span> <strong>{selected.total_visits}</strong></div>
                <div><span className="text-muted-foreground">Total gastado:</span> <strong>{formatCurrency(selected.total_spent)}</strong></div>
              </div>
              <h3 className="font-semibold text-sm">Historial de Sesiones</h3>
              <DataTable columns={sessionColumns} data={sessions} pageSize={5} searchPlaceholder="Buscar sesiones..." />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
