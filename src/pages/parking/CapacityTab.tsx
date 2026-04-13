/**
 * CapacityTab — Orchestrator component for parking capacity management.
 * 
 * Architecture: Mediator pattern — coordinates child components and services.
 * Each dialog/section is a focused component with Single Responsibility.
 * Business logic is in services and hooks, not in the UI.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Settings, AlertTriangle, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { calculateParkingFee } from '@/lib/utils/pricing';
import { generateExitReceiptPDF } from '@/lib/utils/pdfGenerators';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CapacitySkeleton } from '@/components/ui/PageSkeletons';
import { SPACE_STATUS_LABELS } from '@/types';
import type { ParkingSession, VehicleCategory, ParkingSpace, SpaceStatus, SpaceReservation } from '@/types';

// Services (Repository pattern)
import { ParkingService, SpaceService, ReservationService, VehicleService, CustomerService } from '@/services';
import type { GeoCoordinates } from '@/services/geolocation.service';

// Child components (SRP)
import CapacitySummary from '@/components/capacity/CapacitySummary';
import SpaceGrid, { type GridSpace } from '@/components/capacity/SpaceGrid';
import EntryDialog from '@/components/capacity/EntryDialog';
import ExitDialog from '@/components/capacity/ExitDialog';
import ReserveDialog from '@/components/capacity/ReserveDialog';
import ReservationDetailDialog from '@/components/capacity/ReservationDetailDialog';

const STATUS_DOT: Record<SpaceStatus, string> = {
  available: 'bg-green-500', occupied: 'bg-destructive', reserved: 'bg-amber-500',
};

export default function Capacity() {
  const { tenantId, user } = useAuth();
  const { tenant, planModules } = useTenant();
  const queryClient = useQueryClient();

  const [configOpen, setConfigOpen] = useState(false);
  const [newCapacity, setNewCapacity] = useState('');
  const [optimisticTotalSpaces, setOptimisticTotalSpaces] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Dialog state
  const [entryOpen, setEntryOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [exitSession, setExitSession] = useState<ParkingSession | null>(null);
  const [exitSpace, setExitSpace] = useState<number | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveSpaceId, setReserveSpaceId] = useState<string | null>(null);
  const [reserveSpaceNum, setReserveSpaceNum] = useState('');
  const [reservationDetailSpace, setReservationDetailSpace] = useState<ParkingSpace | null>(null);
  const [reservationDetail, setReservationDetail] = useState<SpaceReservation | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  // Pre-fill from reservation
  const [entryPrefill, setEntryPrefill] = useState<{ plate?: string; name?: string; phone?: string }>({});

  // Confirm dialogs
  const [confirmEntry, setConfirmEntry] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmReserve, setConfirmReserve] = useState(false);
  const [confirmCancelReserve, setConfirmCancelReserve] = useState<ParkingSpace | null>(null);
  const [pendingEntryData, setPendingEntryData] = useState<any>(null);

  const hasPrinting = planModules.includes('printing');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscriptions
  useRealtime({ table: 'parking_sessions', filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined, queryKeys: [['capacity-sessions', tenantId || ''], ['parking-spaces', tenantId || '']] });
  useRealtime({ table: 'parking_spaces', filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined, queryKeys: [['parking-spaces', tenantId || ''], ['capacity-sessions', tenantId || '']] });
  useRealtime({ table: 'space_reservations', filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined, queryKeys: [['parking-spaces', tenantId || ''], ['capacity-sessions', tenantId || '']] });
  useRealtime({ table: 'tenants', filter: tenantId ? `id=eq.${tenantId}` : undefined, queryKeys: [['tenant', tenantId || '']] });

  // Queries (via services)
  const { data: activeSessions = [], isLoading } = useQuery({
    queryKey: ['capacity-sessions', tenantId],
    enabled: !!tenantId,
    queryFn: () => ParkingService.getActiveSessionsBySpace(tenantId!),
  });

  const { data: parkingSpaces = [] } = useQuery({
    queryKey: ['parking-spaces', tenantId],
    enabled: !!tenantId,
    queryFn: () => SpaceService.getSpaces(tenantId!),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['vehicle-categories', tenantId],
    enabled: !!tenantId,
    queryFn: () => VehicleService.getActiveCategories(tenantId!),
  });

  const { data: tenantPlan } = useQuery({
    queryKey: ['tenant-plan', tenant?.plan_id],
    enabled: !!tenant?.plan_id,
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('max_spaces').eq('id', tenant!.plan_id!).single();
      return data;
    },
  });

  const maxSpaces = tenantPlan?.max_spaces || 999;
  const reservationTimeout = ((tenant?.settings as any)?.reservation_timeout_minutes || 15) as number;
  const parkingLocation: GeoCoordinates | null =
    tenant?.latitude && tenant?.longitude ? { lat: Number(tenant.latitude), lng: Number(tenant.longitude) } : null;

  useEffect(() => {
    if (typeof tenant?.total_spaces === 'number') setOptimisticTotalSpaces(tenant.total_spaces);
  }, [tenant?.total_spaces]);

  // Auto-expire reservations
  useEffect(() => {
    const expired = parkingSpaces.filter(
      s => s.status === 'reserved' && s.reservation_expires_at && new Date(s.reservation_expires_at).getTime() < Date.now()
    );
    expired.forEach(async (space) => {
      await SpaceService.expireReservation(space.id);
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    });
  }, [now, parkingSpaces]);

  // Compute grid
  const totalSpaces = optimisticTotalSpaces ?? tenant?.total_spaces ?? 20;
  const occupiedSpaces = activeSessions.length;
  const reservedCount = parkingSpaces.filter(s => s.status === 'reserved').length;
  const availableCount = Math.max(0, totalSpaces - occupiedSpaces - reservedCount);

  const occupiedMap = new Map<string, ParkingSession>();
  activeSessions.forEach(s => { if (s.space_number) occupiedMap.set(s.space_number, s); });
  const unassigned = [...activeSessions.filter(s => !s.space_number)];
  const explicitOccupied = new Set([...occupiedMap.keys()].map(Number));

  const gridSpaces: GridSpace[] = Array.from({ length: totalSpaces }, (_, i) => {
    const num = i + 1;
    const key = String(num);
    const ps = parkingSpaces.find(s => s.space_number === key);
    if (occupiedMap.has(key)) return { num, occupied: true, session: occupiedMap.get(key)!, vehicleType: occupiedMap.get(key)!.vehicle_type, parkingSpace: ps, status: 'occupied' as SpaceStatus };
    if (ps?.status === 'reserved') return { num, occupied: false, parkingSpace: ps, status: 'reserved' as SpaceStatus };
    if (!explicitOccupied.has(num) && unassigned.length > 0) {
      const s = unassigned.shift();
      return { num, occupied: true, session: s, vehicleType: s?.vehicle_type || 'car', parkingSpace: ps, status: 'occupied' as SpaceStatus };
    }
    return { num, occupied: false, parkingSpace: ps, status: 'available' as SpaceStatus };
  });

  const availableSpacesList = gridSpaces.filter(s => !s.occupied && s.status !== 'reserved').map(s => s.num);

  const getRemainingTime = (expiresAt: string | null): string => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expirado';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // === Mutations ===
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const updateCapacity = useMutation({
    mutationFn: async () => {
      const cap = parseInt(newCapacity);
      if (isNaN(cap) || cap < 1) throw new Error('Valor inválido');
      if (cap > maxSpaces) throw new Error(`El máximo según tu plan es ${maxSpaces}`);
      const { data, error } = await supabase.functions.invoke('update-tenant-capacity', { body: { capacity: cap } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const currentCount = parkingSpaces.length;
      if (cap > currentCount) await SpaceService.createBulk(tenantId!, currentCount + 1, cap - currentCount);
      else if (cap < currentCount) await SpaceService.deleteAvailableAbove(parkingSpaces, cap);
      return { totalSpaces: data?.total_spaces ?? cap };
    },
    onSuccess: (result) => {
      setOptimisticTotalSpaces(result.totalSpaces);
      toast.success('Capacidad actualizada');
      setConfigOpen(false);
      queryClient.invalidateQueries({ queryKey: ['parking-spaces', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['capacity-sessions', tenantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const entryMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!tenantId || !data.plate) throw new Error('Faltan datos');
      const dup = await ParkingService.checkDuplicateActive(data.plate);
      if (dup.exists) throw new Error(dup.tenantId === tenantId ? 'Vehículo ya dentro del parqueadero' : 'Vehículo activo en otro parqueadero');
      const category = categoryMap[data.categoryId];
      let customerId: string | undefined;
      if (data.customerPhone) customerId = await CustomerService.upsert(tenantId, data.customerPhone, data.customerName);
      const vehicleType = category?.icon || 'car';
      const vehicleId = data.vehicleId || await VehicleService.upsert(tenantId, data.plate, vehicleType, customerId);
      await ParkingService.createSession({
        tenantId, vehicleId, customerId, plate: data.plate, vehicleType,
        customerName: data.customerName, customerPhone: data.customerPhone,
        spaceNumber: String(data.spaceNumber), ratePerHour: category?.rate_per_hour || 0, notes: data.notes,
      });
      const matchSpace = parkingSpaces.find(s => s.space_number === String(data.spaceNumber));
      if (matchSpace) {
        await SpaceService.setOccupied(matchSpace.id);
        await SpaceService.confirmReservation(matchSpace.id);
      }
    },
    onSuccess: () => {
      toast.success('Vehículo registrado');
      setEntryOpen(false);
      queryClient.invalidateQueries({ queryKey: ['capacity-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exitMutation = useMutation({
    mutationFn: async (session: ParkingSession) => {
      const exitTime = new Date().toISOString();
      const cat = categories.find(c => c.name.toLowerCase() === session.vehicle_type?.toLowerCase()) || categories.find(c => c.icon === session.vehicle_type);
      const ratePerHour = cat?.rate_per_hour || session.rate_per_hour || 0;
      const fractionMin = cat?.fraction_minutes || 15;
      const fee = calculateParkingFee(session.entry_time, exitTime, ratePerHour, fractionMin);
      await ParkingService.completeSession({ sessionId: session.id, exitTime, hoursParked: Math.round(fee.totalMinutes / 60 * 100) / 100, totalAmount: fee.total });
      if (session.space_number) {
        const matchSpace = parkingSpaces.find(s => s.space_number === session.space_number);
        if (matchSpace) await SpaceService.setAvailable(matchSpace.id);
      }
      return { session, exitTime, fee, ratePerHour, fractionMin };
    },
    onSuccess: (result) => {
      toast.success('Salida registrada');
      setExitSession(null); setExitSpace(null);
      queryClient.invalidateQueries({ queryKey: ['capacity-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
      if (hasPrinting && result) {
        const { session, exitTime, fee, ratePerHour, fractionMin } = result;
        setReceiptData({
          tenantName: tenant?.name || 'Parqueadero', tenantAddress: tenant?.address, tenantPhone: tenant?.phone,
          plate: session.plate, vehicleType: session.vehicle_type, customerName: session.customer_name,
          customerPhone: session.customer_phone, spaceNumber: session.space_number,
          entryTime: session.entry_time, exitTime, totalMinutes: fee.totalMinutes,
          fractions: fee.fractions, costPerFraction: fee.costPerFraction,
          ratePerHour, fractionMinutes: fractionMin, total: fee.total,
        });
      }
    },
    onError: () => toast.error('Error al registrar salida'),
  });

  const reserveMutation = useMutation({
    mutationFn: async (data: { plate: string; customerName: string; customerPhone: string; timeoutMinutes: number }) => {
      if (!reserveSpaceId) throw new Error('Sin espacio');
      const expiresAt = new Date(Date.now() + data.timeoutMinutes * 60 * 1000).toISOString();
      await ReservationService.create({
        tenantId: tenantId!, spaceId: reserveSpaceId, reservedBy: user?.id,
        customerName: data.customerName, customerPhone: data.customerPhone,
        plate: data.plate, expiresAt,
      });
      await SpaceService.reserve(reserveSpaceId, user?.id || null, expiresAt);
    },
    onSuccess: () => {
      toast.success(`Espacio #${reserveSpaceNum} reservado`);
      setReserveOpen(false);
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelReservation = useMutation({
    mutationFn: async (space: ParkingSpace) => {
      await SpaceService.cancelReservation(space.id);
    },
    onSuccess: () => {
      toast.success('Reserva cancelada');
      setReservationDetailSpace(null); setReservationDetail(null); setConfirmCancelReserve(null);
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: () => toast.error('Error al cancelar'),
  });

  // Handlers
  const handleGridClick = (space: GridSpace) => {
    if (space.status === 'reserved' && space.parkingSpace) {
      loadReservationDetail(space.parkingSpace);
    } else if (space.occupied && space.session) {
      setExitSession(space.session);
      setExitSpace(space.num);
    } else if (!space.occupied) {
      setSelectedSpace(space.num);
      setEntryPrefill({});
      setEntryOpen(true);
    }
  };

  const handleContextMenu = (space: GridSpace) => {
    if (space.parkingSpace && space.status === 'available') {
      setReserveSpaceId(space.parkingSpace.id);
      setReserveSpaceNum(space.parkingSpace.space_number);
      setReserveOpen(true);
    }
  };

  const loadReservationDetail = async (space: ParkingSpace) => {
    setReservationDetailSpace(space);
    const detail = await ReservationService.getPendingForSpace(space.id);
    setReservationDetail(detail);
  };

  const handleConfirmArrival = () => {
    if (!reservationDetailSpace) return;
    const spaceNum = parseInt(reservationDetailSpace.space_number);
    setSelectedSpace(spaceNum);
    setEntryPrefill({
      plate: reservationDetail?.plate || undefined,
      name: reservationDetail?.customer_name || undefined,
      phone: reservationDetail?.customer_phone || undefined,
    });
    setReservationDetailSpace(null);
    setReservationDetail(null);
    setEntryOpen(true);
  };

  const handleEntrySubmit = (data: any) => {
    setPendingEntryData(data);
    setConfirmEntry(true);
  };

  if (isLoading) return <CapacitySkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Aforo</h1>
          <p className="text-sm text-muted-foreground">Gestión de espacios, reservas y entradas/salidas en tiempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setNewCapacity(String(totalSpaces)); setConfigOpen(true); }} className="text-xs">
          <Settings className="h-3.5 w-3.5 mr-1" /> Capacidad
        </Button>
      </div>

      <CapacitySummary available={availableCount} occupied={occupiedSpaces} reserved={reservedCount} total={totalSpaces} />

      {occupiedSpaces > totalSpaces && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Sobrecupo detectado</AlertTitle>
          <AlertDescription className="text-sm">
            Hay <strong>{occupiedSpaces}</strong> vehículos pero solo hay <strong>{totalSpaces}</strong> espacios.
          </AlertDescription>
        </Alert>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SPACE_STATUS_LABELS).map(([status, label]) => (
          <Badge key={status} variant="outline" className="gap-1 text-xs">
            <div className={`h-2.5 w-2.5 rounded ${STATUS_DOT[status as SpaceStatus]}`} />
            {label}
          </Badge>
        ))}
      </div>

      <SpaceGrid
        spaces={gridSpaces}
        categories={categories}
        onSpaceClick={handleGridClick}
        onSpaceContextMenu={handleContextMenu}
        getRemainingTime={getRemainingTime}
        onConfigureClick={() => { setNewCapacity(String(totalSpaces)); setConfigOpen(true); }}
      />

      {/* Dialogs */}
      <EntryDialog
        open={entryOpen}
        onClose={() => { setEntryOpen(false); setSelectedSpace(null); }}
        selectedSpace={selectedSpace}
        availableSpaces={availableSpacesList}
        categories={categories}
        tenantId={tenantId || ''}
        onSubmit={handleEntrySubmit}
        loading={entryMutation.isPending}
        initialPlate={entryPrefill.plate}
        initialCustomerName={entryPrefill.name}
        initialCustomerPhone={entryPrefill.phone}
      />

      <ExitDialog
        session={exitSession}
        spaceNumber={exitSpace}
        categories={categories}
        hasPrinting={hasPrinting}
        onConfirm={() => setConfirmExit(true)}
        onClose={() => { setExitSession(null); setExitSpace(null); }}
        loading={exitMutation.isPending}
      />

      <ReserveDialog
        open={reserveOpen}
        spaceNumber={reserveSpaceNum}
        defaultTimeout={reservationTimeout}
        parkingLocation={parkingLocation}
        onClose={() => { setReserveOpen(false); setReserveSpaceId(null); setReserveSpaceNum(''); }}
        onSubmit={(data) => reserveMutation.mutate(data)}
        loading={reserveMutation.isPending}
      />

      <ReservationDetailDialog
        space={reservationDetailSpace}
        reservation={reservationDetail}
        getRemainingTime={getRemainingTime}
        onClose={() => { setReservationDetailSpace(null); setReservationDetail(null); }}
        onCancel={() => setConfirmCancelReserve(reservationDetailSpace)}
        onConfirmArrival={handleConfirmArrival}
        cancelLoading={cancelReservation.isPending}
      />

      {/* Config dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Configurar Capacidad</DialogTitle><DialogDescription>Total de espacios del parqueadero</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label>Total de espacios (máx. {maxSpaces})</Label><Input type="number" min="1" max={maxSpaces} value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button><Button onClick={() => updateCapacity.mutate()} disabled={updateCapacity.isPending}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialogs */}
      <ConfirmDialog open={confirmEntry} onOpenChange={setConfirmEntry} title="Confirmar Entrada"
        description={`¿Registrar entrada del vehículo ${pendingEntryData?.plate || ''} en espacio #${pendingEntryData?.spaceNumber || ''}?`}
        onConfirm={() => { setConfirmEntry(false); if (pendingEntryData) entryMutation.mutate(pendingEntryData); }} loading={entryMutation.isPending} />

      <ConfirmDialog open={confirmExit} onOpenChange={setConfirmExit} title="Confirmar Salida"
        description={`¿Registrar salida del vehículo ${exitSession?.plate || ''}?`}
        onConfirm={() => { setConfirmExit(false); if (exitSession) exitMutation.mutate(exitSession); }} variant="destructive" loading={exitMutation.isPending} />

      <ConfirmDialog open={!!confirmCancelReserve} onOpenChange={() => setConfirmCancelReserve(null)} title="Cancelar Reserva"
        description={`¿Cancelar la reserva del espacio #${confirmCancelReserve?.space_number || ''}?`}
        onConfirm={() => { if (confirmCancelReserve) cancelReservation.mutate(confirmCancelReserve); }} variant="destructive" loading={cancelReservation.isPending} />

      {/* Receipt Dialog */}
      <Dialog open={!!receiptData} onOpenChange={() => setReceiptData(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Recibo de Salida</DialogTitle><DialogDescription>Salida registrada exitosamente</DialogDescription></DialogHeader>
          {receiptData && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Placa:</span><strong className="font-mono">{receiptData.plate}</strong></div>
                {receiptData.customerName && <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><strong>{receiptData.customerName}</strong></div>}
                {receiptData.spaceNumber && <div className="flex justify-between"><span className="text-muted-foreground">Espacio:</span><strong>#{receiptData.spaceNumber}</strong></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Duración:</span><strong>{Math.floor(receiptData.totalMinutes / 60)}h {receiptData.totalMinutes % 60}m</strong></div>
              </div>
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Total cobrado</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(receiptData.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{receiptData.fractions} fracciones × {formatCurrency(receiptData.costPerFraction)}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setReceiptData(null)}>Cerrar</Button>
            <Button onClick={() => generateExitReceiptPDF(receiptData)}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
