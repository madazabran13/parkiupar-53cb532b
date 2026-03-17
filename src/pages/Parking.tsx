import { useState, useEffect } from 'react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, LogOut as ExitIcon, Pencil, Printer } from 'lucide-react';
import { formatCurrency, formatDateTime, formatDuration, formatTime } from '@/lib/utils/formatters';
import { calculateParkingFee, calculateLiveFee } from '@/lib/utils/pricing';
import { generateExitReceiptPDF } from '@/lib/utils/pdfGenerators';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VEHICLE_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/types';
import type { ParkingSession, VehicleRate, VehicleCategory, VehicleType } from '@/types';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

export default function Parking() {
  const { tenantId } = useAuth();
  const { tenant, planModules } = useTenant();
  const queryClient = useQueryClient();
  const [entryOpen, setEntryOpen] = useState(false);
  const [exitSession, setExitSession] = useState<ParkingSession | null>(null);
  const [editSession, setEditSession] = useState<ParkingSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmEntry, setConfirmEntry] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const hasPrinting = planModules.includes('printing');

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useRealtime({
    table: 'parking_sessions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['sessions-active', tenantId || ''], ['sessions-history', tenantId || '']],
  });

  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [spaceNumber, setSpaceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [editPlate, setEditPlate] = useState('');
  const [editVehicleType, setEditVehicleType] = useState<VehicleType>('car');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editSpaceNumber, setEditSpaceNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const canEdit = (session: ParkingSession) => (Date.now() - new Date(session.entry_time).getTime()) / 1000 <= 120;

  const openEditDialog = (session: ParkingSession) => {
    setEditSession(session); setEditPlate(session.plate); setEditVehicleType(session.vehicle_type);
    setEditCustomerName(session.customer_name || ''); setEditCustomerPhone(session.customer_phone || '');
    setEditSpaceNumber(session.space_number || ''); setEditNotes(session.notes || '');
  };

  const { data: rates = [] } = useQuery({
    queryKey: ['rates', tenantId], enabled: !!tenantId,
    queryFn: async () => { const { data } = await supabase.from('vehicle_rates').select('*').eq('tenant_id', tenantId!).eq('is_active', true); return (data || []) as unknown as VehicleRate[]; },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['vehicle-categories', tenantId], enabled: !!tenantId,
    queryFn: async () => { const { data } = await supabase.from('vehicle_categories').select('*').eq('tenant_id', tenantId!).eq('is_active', true); return (data || []) as unknown as VehicleCategory[]; },
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

  const { data: activeSessions = [], isLoading: loadingActive } = useQuery({
    queryKey: ['sessions-active', tenantId], enabled: !!tenantId,
    queryFn: async () => { const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).eq('status', 'active').order('entry_time', { ascending: false }); return (data || []) as unknown as ParkingSession[]; },
  });

  const { data: historySessions = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['sessions-history', tenantId], enabled: !!tenantId,
    queryFn: async () => { const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).in('status', ['completed', 'cancelled']).order('exit_time', { ascending: false }).limit(200); return (data || []) as unknown as ParkingSession[]; },
  });

  const entryMutation = useMutation({
    mutationFn: async () => {
      const { data: activeSession } = await supabase.from('parking_sessions').select('id, tenant_id').eq('plate', plate.toUpperCase()).eq('status', 'active').maybeSingle();
      if (activeSession) throw new Error(activeSession.tenant_id === tenantId ? 'Este vehículo ya se encuentra dentro del parqueadero' : 'Este vehículo se encuentra activo en otro parqueadero de la red');
      let customerId: string | null = null; let vehicleId: string | null = null;
      if (customerPhone.trim()) {
        const { data: ec } = await supabase.from('customers').select('id').eq('tenant_id', tenantId!).eq('phone', customerPhone).single();
        customerId = ec?.id ?? null;
        if (!customerId) { const { data: nc } = await supabase.from('customers').insert({ tenant_id: tenantId!, phone: customerPhone, full_name: customerName || 'Sin nombre' }).select('id').single(); customerId = nc?.id ?? null; }
        else if (customerName) await supabase.from('customers').update({ full_name: customerName }).eq('id', customerId);
      }
      const { data: ev } = await supabase.from('vehicles').select('id').eq('tenant_id', tenantId!).eq('plate', plate.toUpperCase()).single();
      vehicleId = ev?.id ?? null;
      if (!vehicleId) { const { data: nv } = await supabase.from('vehicles').insert({ tenant_id: tenantId!, plate: plate.toUpperCase(), vehicle_type: vehicleType, customer_id: customerId }).select('id').single(); vehicleId = nv?.id ?? null; }
      const rate = rateMap[vehicleType];
      const { error } = await supabase.from('parking_sessions').insert({ tenant_id: tenantId!, vehicle_id: vehicleId, customer_id: customerId, plate: plate.toUpperCase(), vehicle_type: vehicleType, customer_name: customerName || null, customer_phone: customerPhone || null, space_number: spaceNumber || null, rate_per_hour: rate?.rate_per_hour || 0, notes: notes || null, status: 'active' });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Vehículo registrado'); setEntryOpen(false); resetForm(); queryClient.invalidateQueries({ queryKey: ['sessions-active'] }); },
    onError: (e: any) => toast.error(e.message || 'Error al registrar entrada'),
  });

  const exitMutation = useMutation({
    mutationFn: async (session: ParkingSession) => {
      const exitTime = new Date().toISOString();
      const rate = getSessionRate(session);
      const fee = rate ? calculateParkingFee(session.entry_time, exitTime, rate.rate_per_hour, rate.fraction_minutes) : { total: 0, totalMinutes: 0, fractions: 0, costPerFraction: 0 };
      const { error } = await supabase.from('parking_sessions').update({ exit_time: exitTime, hours_parked: Math.round(fee.totalMinutes / 60 * 100) / 100, total_amount: fee.total, status: 'completed' as const }).eq('id', session.id);
      if (error) throw error;
      return { session, exitTime, fee, rate };
    },
    onSuccess: (result) => {
      toast.success('Salida registrada');
      setExitSession(null);
      queryClient.invalidateQueries({ queryKey: ['sessions-active'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-history'] });
      // Show receipt dialog after exit
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

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editSession) return; if (!canEdit(editSession)) throw new Error('TIMEOUT');
      const rate = rateMap[editVehicleType];
      const { error } = await supabase.from('parking_sessions').update({ plate: editPlate.toUpperCase(), vehicle_type: editVehicleType, customer_name: editCustomerName || null, customer_phone: editCustomerPhone || null, space_number: editSpaceNumber || null, notes: editNotes || null, rate_per_hour: rate?.rate_per_hour || 0 }).eq('id', editSession.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Vehículo actualizado'); setEditSession(null); queryClient.invalidateQueries({ queryKey: ['sessions-active'] }); },
    onError: (err: any) => { if (err.message === 'TIMEOUT') { toast.error('Ya pasaron más de 2 minutos'); setEditSession(null); } else toast.error('Error al actualizar'); },
  });

  const resetForm = () => { setPlate(''); setVehicleType('car'); setCustomerName(''); setCustomerPhone(''); setSpaceNumber(''); setNotes(''); };
  const previewRate = rateMap[vehicleType];

  const activeColumns: Column<ParkingSession>[] = [
    { key: 'plate', label: 'Placa', render: (r) => <Badge variant="outline" className="font-mono text-xs">{r.plate}</Badge> },
    { key: 'vehicle_type', label: 'Tipo', render: (r) => VEHICLE_TYPE_LABELS[r.vehicle_type] },
    { key: 'customer_name', label: 'Cliente', hideOnMobile: true },
    { key: 'space_number', label: 'Espacio', hideOnMobile: true },
    { key: 'entry_time', label: 'Entrada', render: (r) => formatTime(r.entry_time) },
    { key: 'duration', label: 'Tiempo', sortable: false, filterable: false, render: (r) => formatDuration(r.entry_time) },
    { key: 'live_fee', label: 'Tarifa', sortable: false, filterable: false, render: (r) => { const rate = getSessionRate(r); return rate ? formatCurrency(calculateLiveFee(r.entry_time, rate.rate_per_hour, rate.fraction_minutes)) : '—'; } },
  ];

  const historyColumns: Column<ParkingSession>[] = [
    { key: 'plate', label: 'Placa', render: (r) => <Badge variant="outline" className="font-mono text-xs">{r.plate}</Badge> },
    { key: 'vehicle_type', label: 'Tipo', render: (r) => VEHICLE_TYPE_LABELS[r.vehicle_type], hideOnMobile: true },
    { key: 'customer_name', label: 'Cliente', hideOnMobile: true },
    { key: 'hours_parked', label: 'Duración', render: (r) => r.exit_time ? formatDuration(r.entry_time, r.exit_time) : '—' },
    { key: 'total_amount', label: 'Total', render: (r) => r.total_amount != null ? formatCurrency(r.total_amount) : '—' },
    { key: 'status', label: 'Estado', render: (r) => <Badge variant={r.status === 'completed' ? 'default' : 'destructive'} className="text-[10px]">{SESSION_STATUS_LABELS[r.status]}</Badge> },
  ];

  const exitRate = exitSession ? getSessionRate(exitSession) : null;
  const exitFee = exitSession && exitRate ? calculateParkingFee(exitSession.entry_time, new Date().toISOString(), exitRate.rate_per_hour, exitRate.fraction_minutes) : null;

  if (loadingActive && loadingHistory) return <TableSkeleton columns={7} rows={6} />;

  return (
    <PullToRefresh queryKeys={[['sessions-active', tenantId || ''], ['sessions-history', tenantId || '']]}>
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Gestión de Vehículos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Registra entradas y salidas</p>
        </div>
        <Button onClick={() => setEntryOpen(true)} className="w-full sm:w-auto h-10 sm:h-9 text-sm hidden sm:flex">
          <Plus className="h-4 w-4 mr-1" /> Registrar Entrada
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="flex-1 sm:flex-none">Activos ({activeSessions.length})</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <DataTable columns={activeColumns} data={activeSessions} loading={loadingActive} searchPlaceholder="Buscar por placa, cliente..."
            actions={(row) => (
              <div className="flex gap-1">
                {canEdit(row) && <Button size="sm" variant="ghost" onClick={() => openEditDialog(row)} title="Editar"><Pencil className="h-3 w-3" /></Button>}
                <Button size="sm" variant="outline" onClick={() => setExitSession(row)}><ExitIcon className="h-3 w-3 mr-1" /> Salida</Button>
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <DataTable columns={historyColumns} data={historySessions} loading={loadingHistory} searchPlaceholder="Buscar historial..." />
        </TabsContent>
      </Tabs>

      {/* Entry Modal */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Registrar Entrada</DialogTitle><DialogDescription>Ingresa los datos del vehículo</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Placa *</Label><Input placeholder="ABC123" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="uppercase" /></div>
            <div className="space-y-2"><Label>Tipo de vehículo *</Label>
              <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nombre <span className="text-muted-foreground text-xs">(opcional)</span></Label><Input placeholder="Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Teléfono <span className="text-muted-foreground text-xs">(opcional)</span></Label><Input placeholder="3001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Espacio (opcional)</Label><Input placeholder="A-12" value={spaceNumber} onChange={(e) => setSpaceNumber(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notas (opcional)</Label><Textarea placeholder="Observaciones..." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            {previewRate && <div className="rounded-lg border bg-muted p-3 text-sm"><span className="font-medium">Tarifa:</span> {formatCurrency(previewRate.rate_per_hour)}/hora · Fracción de {previewRate.fraction_minutes} min</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button>
            <Button onClick={() => setConfirmEntry(true)} disabled={!plate || entryMutation.isPending}>{entryMutation.isPending ? 'Registrando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Modal */}
      <Dialog open={!!exitSession} onOpenChange={() => setExitSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Salida</DialogTitle><DialogDescription>Confirma la salida del vehículo</DialogDescription></DialogHeader>
          {exitSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Placa:</span> <strong>{exitSession.plate}</strong></div>
                <div><span className="text-muted-foreground">Tipo:</span> <strong>{VEHICLE_TYPE_LABELS[exitSession.vehicle_type]}</strong></div>
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{exitSession.customer_name || '—'}</strong></div>
                <div><span className="text-muted-foreground">Entrada:</span> <strong>{formatDateTime(exitSession.entry_time)}</strong></div>
                <div><span className="text-muted-foreground">Duración:</span> <strong>{formatDuration(exitSession.entry_time)}</strong></div>
              </div>
              {exitFee && exitRate && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase">Total a cobrar</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(exitFee.total)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{exitFee.totalMinutes} min · {exitFee.fractions} fracciones × {formatCurrency(exitFee.costPerFraction)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setExitSession(null)}>Cancelar</Button>
            <Button onClick={() => setConfirmExit(true)} disabled={exitMutation.isPending}>
              <ExitIcon className="h-4 w-4 mr-1" /> {exitMutation.isPending ? 'Procesando...' : 'Confirmar Salida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editSession} onOpenChange={() => setEditSession(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Editar Vehículo</DialogTitle><DialogDescription>Puedes editar dentro de los primeros 2 minutos</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Placa *</Label><Input value={editPlate} onChange={(e) => setEditPlate(e.target.value.toUpperCase())} className="uppercase" /></div>
            <div className="space-y-2"><Label>Tipo de vehículo *</Label>
              <Select value={editVehicleType} onValueChange={(v) => setEditVehicleType(v as VehicleType)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nombre <span className="text-muted-foreground text-xs">(opcional)</span></Label><Input value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Teléfono <span className="text-muted-foreground text-xs">(opcional)</span></Label><Input value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} /></div>
            <div className="space-y-2"><Label>Espacio <span className="text-muted-foreground text-xs">(opcional)</span></Label><Input value={editSpaceNumber} onChange={(e) => setEditSpaceNumber(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notas <span className="text-muted-foreground text-xs">(opcional)</span></Label><Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>Cancelar</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!editPlate || editMutation.isPending}>{editMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={confirmEntry} onOpenChange={setConfirmEntry} title="Confirmar Entrada"
        description={`¿Registrar entrada del vehículo ${plate}?`}
        onConfirm={() => { setConfirmEntry(false); entryMutation.mutate(); }} loading={entryMutation.isPending} />

      <ConfirmDialog open={confirmExit} onOpenChange={setConfirmExit} title="Confirmar Salida"
        description={`¿Registrar salida del vehículo ${exitSession?.plate || ''}? Total: ${exitFee ? formatCurrency(exitFee.total) : '$0'}`}
        onConfirm={() => { setConfirmExit(false); if (exitSession) exitMutation.mutate(exitSession); }} variant="destructive" loading={exitMutation.isPending} />
    </div>

      <button onClick={() => setEntryOpen(true)}
        className="fixed bottom-20 right-4 z-40 sm:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </button>
    </PullToRefresh>
  );
}
