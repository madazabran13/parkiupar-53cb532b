import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Plus, CalendarDays, XCircle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

interface MonthlySubscription {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  plate: string;
  customer_name: string | null;
  customer_phone: string | null;
  amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export default function MonthlySubscriptions() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const [plate, setPlate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  useRealtime({
    table: 'monthly_subscriptions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['monthly-subs', tenantId || '']],
  });

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['monthly-subs', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('monthly_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      return (data || []) as unknown as MonthlySubscription[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!plate.trim()) throw new Error('La placa es obligatoria');
      if (!amount || Number(amount) <= 0) throw new Error('El monto es obligatorio');
      if (!endDate) throw new Error('La fecha de vencimiento es obligatoria');

      let customerId: string | null = null;
      if (customerPhone) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId!)
          .eq('phone', customerPhone)
          .single();
        customerId = existing?.id || null;
        if (!customerId) {
          const { data: newC } = await supabase
            .from('customers')
            .insert({ tenant_id: tenantId!, phone: customerPhone, full_name: customerName || 'Sin nombre' })
            .select('id')
            .single();
          customerId = newC?.id || null;
        }
      }

      const { error } = await supabase.from('monthly_subscriptions').insert({
        tenant_id: tenantId!,
        plate: plate.toUpperCase(),
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_id: customerId,
        amount: Number(amount),
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mensualidad registrada');
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['monthly-subs'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monthly_subscriptions')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mensualidad cancelada');
      setConfirmCancel(null);
      queryClient.invalidateQueries({ queryKey: ['monthly-subs'] });
    },
    onError: () => toast.error('Error al cancelar'),
  });

  const resetForm = () => {
    setPlate(''); setCustomerName(''); setCustomerPhone('');
    setAmount(''); setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(''); setNotes('');
  };

  const getDaysLeft = (end: string) => {
    const diff = Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const columns: Column<MonthlySubscription>[] = [
    { key: 'plate', label: 'Placa', render: (r) => <Badge variant="outline" className="font-mono text-xs">{r.plate}</Badge> },
    { key: 'customer_name', label: 'Cliente', render: (r) => r.customer_name || '—' },
    { key: 'customer_phone', label: 'Teléfono', hideOnMobile: true },
    { key: 'amount', label: 'Monto', render: (r) => formatCurrency(r.amount) },
    { key: 'start_date', label: 'Inicio', render: (r) => new Date(r.start_date).toLocaleDateString('es-CO'), hideOnMobile: true },
    { key: 'end_date', label: 'Vencimiento', render: (r) => {
      const days = getDaysLeft(r.end_date);
      const expired = days < 0;
      const soon = days >= 0 && days <= 5;
      return (
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${expired ? 'text-destructive font-semibold' : soon ? 'text-amber-600 font-medium' : ''}`}>
            {new Date(r.end_date).toLocaleDateString('es-CO')}
          </span>
          {expired && <Badge variant="destructive" className="text-[9px]">Vencido</Badge>}
          {soon && !expired && <Badge variant="secondary" className="text-[9px] text-amber-600">{days}d</Badge>}
        </div>
      );
    }},
    { key: 'is_active', label: 'Estado', render: (r) => (
      <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Activa' : 'Cancelada'}</Badge>
    )},
  ];

  if (isLoading) return <TableSkeleton columns={6} rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Mensualidades</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestiona suscripciones mensuales de vehículos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Nueva Mensualidad
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
        searchPlaceholder="Buscar por placa, cliente..."
        actions={(row) => row.is_active ? (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmCancel(row.id)}>
            <XCircle className="h-3 w-3 mr-1" /> Cancelar
          </Button>
        ) : null}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Mensualidad</DialogTitle>
            <DialogDescription>Registra una suscripción mensual para un vehículo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Placa *</Label>
              <Input placeholder="ABC123" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre del cliente</Label>
                <Input placeholder="Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input placeholder="3001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Monto mensual (COP) *</Label>
              <Input type="number" placeholder="150000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha vencimiento *</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea placeholder="Observaciones..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!plate || !amount || !endDate || createMutation.isPending}>
              {createMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
        title="¿Cancelar mensualidad?"
        description="Esta acción desactivará la mensualidad. ¿Estás seguro?"
        onConfirm={() => confirmCancel && cancelMutation.mutate(confirmCancel)}
        confirmLabel="Sí, cancelar"
        variant="destructive"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
