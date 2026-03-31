import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Plus, XCircle, History, Printer, Pencil, DollarSign, CalendarClock } from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils/formatters';
import { TableSkeleton } from '@/components/ui/PageSkeletons';
import jsPDF from 'jspdf';

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

interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

type SubFilter = 'all' | 'active' | 'pending' | 'cancelled' | 'expired';

const getDaysLeft = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

const getSubStatus = (sub: MonthlySubscription): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  if (!sub.is_active) return { label: 'Cancelada', variant: 'secondary' };
  const days = getDaysLeft(sub.end_date);
  if (days < 0) return { label: 'Vencida', variant: 'destructive' };
  if (days <= 5) return { label: `Vence en ${days}d`, variant: 'outline' };
  return { label: 'Al día', variant: 'default' };
};

function generatePaymentReceiptPDF(sub: MonthlySubscription, payment: SubscriptionPayment, tenantName: string) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 180] });
  const w = 80;
  let y = 8;
  doc.setFontSize(12);
  doc.text(tenantName, w / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(8);
  doc.text('RECIBO DE PAGO MENSUALIDAD', w / 2, y, { align: 'center' });
  y += 6;
  doc.line(4, y, w - 4, y);
  y += 5;
  const lines = [
    ['Placa', sub.plate],
    ['Cliente', sub.customer_name || '—'],
    ['Teléfono', sub.customer_phone || '—'],
    ['Fecha pago', formatDateTime(payment.payment_date)],
    ['Método', payment.payment_method || 'Efectivo'],
    ['Vencimiento', formatDate(sub.end_date)],
  ];
  doc.setFontSize(8);
  lines.forEach(([label, val]) => {
    doc.text(`${label}:`, 4, y);
    doc.text(val, w - 4, y, { align: 'right' });
    y += 5;
  });
  y += 2;
  doc.line(4, y, w - 4, y);
  y += 6;
  doc.setFontSize(14);
  doc.text(formatCurrency(payment.amount), w / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(7);
  doc.text('ABONO REGISTRADO', w / 2, y, { align: 'center' });
  if (payment.notes) {
    y += 5;
    doc.setFontSize(7);
    doc.text(`Nota: ${payment.notes}`, 4, y, { maxWidth: w - 8 });
  }
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

export default function MonthlySubscriptions() {
  const { tenantId, user } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [filter, setFilter] = useState<SubFilter>('all');

  // Form state
  const [plate, setPlate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Edit state
  const [editSub, setEditSub] = useState<MonthlySubscription | null>(null);
  const [editPlate, setEditPlate] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Payment history state
  const [historySub, setHistorySub] = useState<MonthlySubscription | null>(null);

  // Payment (abono) state
  const [paymentSub, setPaymentSub] = useState<MonthlySubscription | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentNotes, setPaymentNotes] = useState('');

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

  const activeSubId = historySub?.id || paymentSub?.id;

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['sub-payments', activeSubId],
    enabled: !!activeSubId,
    queryFn: async () => {
      const { data } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('subscription_id', activeSubId!)
        .order('payment_date', { ascending: false });
      return (data || []) as unknown as SubscriptionPayment[];
    },
  });

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remainingBalance = paymentSub ? Math.max(0, paymentSub.amount - totalPaid) : 0;

  const filteredSubs = subscriptions.filter((sub) => {
    if (filter === 'all') return true;
    const status = getSubStatus(sub);
    if (filter === 'active') return sub.is_active && getDaysLeft(sub.end_date) > 5;
    if (filter === 'pending') return sub.is_active && getDaysLeft(sub.end_date) >= 0 && getDaysLeft(sub.end_date) <= 5;
    if (filter === 'expired') return sub.is_active && getDaysLeft(sub.end_date) < 0;
    if (filter === 'cancelled') return !sub.is_active;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!plate.trim()) throw new Error('La placa es obligatoria');
      if (!amount || Number(amount) <= 0) throw new Error('El monto es obligatorio');
      if (!endDate) throw new Error('La fecha de vencimiento es obligatoria');

      let customerId: string | null = null;
      if (customerPhone) {
        const { data: existing } = await supabase.from('customers').select('id').eq('tenant_id', tenantId!).eq('phone', customerPhone).single();
        customerId = existing?.id || null;
        if (!customerId) {
          const { data: newC } = await supabase.from('customers').insert({ tenant_id: tenantId!, phone: customerPhone, full_name: customerName || 'Sin nombre' }).select('id').single();
          customerId = newC?.id || null;
        }
      }

      const { error } = await supabase.from('monthly_subscriptions').insert({
        tenant_id: tenantId!, plate: plate.toUpperCase(), customer_name: customerName || null,
        customer_phone: customerPhone || null, customer_id: customerId, amount: Number(amount),
        start_date: startDate, end_date: endDate, notes: notes || null,
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
      const { error } = await supabase.from('monthly_subscriptions').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mensualidad cancelada');
      setConfirmCancel(null);
      queryClient.invalidateQueries({ queryKey: ['monthly-subs'] });
    },
    onError: () => toast.error('Error al cancelar'),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editSub) return;
      const { error } = await supabase.from('monthly_subscriptions').update({
        plate: editPlate.toUpperCase(),
        customer_name: editCustomerName || null,
        customer_phone: editCustomerPhone || null,
        amount: Number(editAmount),
        start_date: editStartDate,
        end_date: editEndDate,
        notes: editNotes || null,
      }).eq('id', editSub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mensualidad actualizada');
      setEditSub(null);
      queryClient.invalidateQueries({ queryKey: ['monthly-subs'] });
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentSub || !paymentAmount || Number(paymentAmount) <= 0) throw new Error('Monto inválido');
      if (Number(paymentAmount) > remainingBalance && remainingBalance > 0) throw new Error(`El abono no puede superar el saldo pendiente de ${formatCurrency(remainingBalance)}`);
      if (remainingBalance <= 0) throw new Error('Esta mensualidad ya está completamente pagada');
      const { data, error } = await supabase.from('subscription_payments').insert({
        subscription_id: paymentSub.id,
        tenant_id: tenantId!,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes || null,
        created_by: user?.id || null,
      }).select().single();
      if (error) throw error;
      return data as unknown as SubscriptionPayment;
    },
    onSuccess: (payment) => {
      toast.success('Abono registrado');
      queryClient.invalidateQueries({ queryKey: ['sub-payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-subs'] });
      // Print receipt
      if (paymentSub && payment) {
        generatePaymentReceiptPDF(paymentSub, payment, tenant?.name || 'Parqueadero');
      }
      setPaymentSub(null);
      setPaymentAmount('');
      setPaymentNotes('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setPlate(''); setCustomerName(''); setCustomerPhone('');
    setAmount(''); setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(''); setNotes('');
  };

  const openEdit = (sub: MonthlySubscription) => {
    setEditSub(sub);
    setEditPlate(sub.plate);
    setEditCustomerName(sub.customer_name || '');
    setEditCustomerPhone(sub.customer_phone || '');
    setEditAmount(String(sub.amount));
    setEditStartDate(sub.start_date);
    setEditEndDate(sub.end_date);
    setEditNotes(sub.notes || '');
  };

  const filterCounts = {
    all: subscriptions.length,
    active: subscriptions.filter(s => s.is_active && getDaysLeft(s.end_date) > 5).length,
    pending: subscriptions.filter(s => s.is_active && getDaysLeft(s.end_date) >= 0 && getDaysLeft(s.end_date) <= 5).length,
    expired: subscriptions.filter(s => s.is_active && getDaysLeft(s.end_date) < 0).length,
    cancelled: subscriptions.filter(s => !s.is_active).length,
  };

  const columns: Column<MonthlySubscription>[] = [
    { key: 'plate', label: 'Placa', render: (r) => <Badge variant="outline" className="font-mono text-xs">{r.plate}</Badge> },
    { key: 'customer_name', label: 'Cliente', render: (r) => r.customer_name || '—' },
    { key: 'customer_phone', label: 'Teléfono', hideOnMobile: true },
    { key: 'amount', label: 'Monto', render: (r) => formatCurrency(r.amount) },
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
    { key: 'is_active', label: 'Estado', render: (r) => {
      const status = getSubStatus(r);
      return <Badge variant={status.variant}>{status.label}</Badge>;
    }},
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

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all', label: 'Todas' },
          { key: 'active', label: 'Al día' },
          { key: 'pending', label: 'Por vencer' },
          { key: 'expired', label: 'Vencidas' },
          { key: 'cancelled', label: 'Canceladas' },
        ] as { key: SubFilter; label: string }[]).map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key)}
            className="text-xs"
          >
            {label} ({filterCounts[key]})
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredSubs}
        searchPlaceholder="Buscar por placa, cliente..."
        actions={(row) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => openEdit(row)} title="Editar">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setPaymentSub(row); setPaymentAmount(''); setPaymentNotes(''); }} title="Registrar abono">
              <DollarSign className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setHistorySub(row)} title="Historial de pagos">
              <History className="h-3 w-3" />
            </Button>
            {row.is_active && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmCancel(row.id)} title="Cancelar">
                <XCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
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

      {/* Edit Dialog */}
      <Dialog open={!!editSub} onOpenChange={() => setEditSub(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Editar Mensualidad</DialogTitle>
            <DialogDescription>Modifica los datos de la suscripción</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Placa *</Label>
              <Input value={editPlate} onChange={(e) => setEditPlate(e.target.value.toUpperCase())} className="uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre del cliente</Label>
                <Input value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Monto mensual (COP) *</Label>
              <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha vencimiento *</Label>
                <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSub(null)}>Cancelar</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!editPlate || !editAmount || !editEndDate || editMutation.isPending}>
              {editMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment (Abono) Dialog */}
      <Dialog open={!!paymentSub} onOpenChange={() => setPaymentSub(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
            <DialogDescription>
              {paymentSub && <>Placa: <strong className="font-mono">{paymentSub.plate}</strong> · Monto total: <strong>{formatCurrency(paymentSub.amount)}</strong></>}
            </DialogDescription>
          </DialogHeader>
          {paymentSub && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimiento:</span>
                  <span className="font-medium">{formatDate(paymentSub.end_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Días restantes:</span>
                  <span className={`font-medium ${getDaysLeft(paymentSub.end_date) < 0 ? 'text-destructive' : ''}`}>
                    {getDaysLeft(paymentSub.end_date)} días
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monto del abono (COP) *</Label>
                <Input type="number" placeholder="50000" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="nequi">Nequi</SelectItem>
                    <SelectItem value="daviplata">Daviplata</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input placeholder="Abono parcial..." value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentSub(null)}>Cancelar</Button>
            <Button onClick={() => paymentMutation.mutate()} disabled={!paymentAmount || Number(paymentAmount) <= 0 || paymentMutation.isPending}>
              <DollarSign className="h-4 w-4 mr-1" /> {paymentMutation.isPending ? 'Registrando...' : 'Registrar Abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={!!historySub} onOpenChange={() => setHistorySub(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Historial de Pagos</DialogTitle>
            <DialogDescription>
              {historySub && <>Placa: <strong className="font-mono">{historySub.plate}</strong> · {historySub.customer_name || 'Sin cliente'}</>}
            </DialogDescription>
          </DialogHeader>
          {historySub && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Monto mensual</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(historySub.amount)}</p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Total pagado</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Saldo pendiente</p>
                  <p className={`text-lg font-bold ${historySub.amount - totalPaid > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(Math.max(0, historySub.amount - totalPaid))}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vencimiento:</span>
                <span className="font-medium">{formatDate(historySub.end_date)}</span>
                <Badge variant={getDaysLeft(historySub.end_date) < 0 ? 'destructive' : getDaysLeft(historySub.end_date) <= 5 ? 'secondary' : 'default'} className="ml-auto text-[10px]">
                  {getDaysLeft(historySub.end_date) < 0 ? 'Vencida' : `${getDaysLeft(historySub.end_date)} días`}
                </Badge>
              </div>

              {loadingPayments ? (
                <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
              ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin pagos registrados</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(p.payment_date)} · {p.payment_method || 'Efectivo'}</p>
                        {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => generatePaymentReceiptPDF(historySub, p, tenant?.name || 'Parqueadero')} title="Imprimir recibo">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full" variant="outline" onClick={() => { setHistorySub(null); setPaymentSub(historySub); setPaymentAmount(''); setPaymentNotes(''); }}>
                <DollarSign className="h-4 w-4 mr-1" /> Registrar Nuevo Abono
              </Button>
            </div>
          )}
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
