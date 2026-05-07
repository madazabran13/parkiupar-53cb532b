import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { useCountdown } from '@/hooks/useCountdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import {
  BookmarkCheck, CheckCircle2, XCircle, Timer, Car, Clock, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS, type VehicleType } from '@/types';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

interface AdminReservation {
  id: string;
  tenant_id: string;
  space_id: string;
  plate: string | null;
  vehicle_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  reserved_at: string;
  expires_at: string;
  confirmed_at: string | null;
  reserved_by: string | null;
  space: { id: string; space_number: string } | null;
  // flattened fields for DataTable filtering/sorting
  space_number?: string;
  vehicle_type_label?: string;
  status_label?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  expired: 'Expirada',
  cancelled: 'Rechazada',
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40',
  confirmed: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40',
  expired: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40',
};

function flatten(r: AdminReservation, effectiveStatus?: string): AdminReservation {
  return {
    ...r,
    space_number: r.space?.space_number || '',
    vehicle_type_label: VEHICLE_TYPE_LABELS[r.vehicle_type as VehicleType] || r.vehicle_type || 'Carro',
    status_label: STATUS_LABEL[effectiveStatus || r.status] || r.status,
  };
}

export default function ReservationsTab() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [verifyTarget, setVerifyTarget] = useState<AdminReservation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminReservation | null>(null);

  useRealtime({
    table: 'space_reservations',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['admin-reservations', tenantId || '']],
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['admin-reservations', tenantId || ''],
    enabled: !!tenantId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_reservations')
        .select(`
          id, tenant_id, space_id, plate, vehicle_type, customer_name, customer_phone,
          status, reserved_at, expires_at, confirmed_at, reserved_by,
          space:parking_spaces!space_reservations_space_id_fkey ( id, space_number )
        `)
        .eq('tenant_id', tenantId!)
        .order('reserved_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as AdminReservation[];
    },
  });

  const { pending, confirmed, history } = useMemo(() => {
    const now = Date.now();
    const pending: AdminReservation[] = [];
    const confirmed: AdminReservation[] = [];
    const history: AdminReservation[] = [];
    for (const r of reservations) {
      const expired = new Date(r.expires_at).getTime() <= now;
      if (r.status === 'pending' && !expired) pending.push(flatten(r, 'pending'));
      else if (r.status === 'confirmed') confirmed.push(flatten(r, 'confirmed'));
      else {
        const eff = r.status === 'pending' && expired ? 'expired' : r.status;
        history.push(flatten(r, eff));
      }
    }
    return { pending, confirmed, history };
  }, [reservations]);

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('confirm_reservation', { p_reservation_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reserva confirmada — espacio marcado como ocupado');
      setVerifyTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reservations', tenantId || ''] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['capacity'] });
    },
    onError: (e: any) => toast.error(e?.message || 'No se pudo confirmar la reserva'),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_reservation', { p_reservation_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reserva rechazada y cupo liberado');
      setRejectTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reservations', tenantId || ''] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['capacity'] });
    },
    onError: (e: any) => toast.error(e?.message || 'No se pudo rechazar la reserva'),
  });

  const baseColumns: Column<AdminReservation>[] = useMemo(() => [
    {
      key: 'space_number',
      label: 'Espacio',
      render: (r) => (
        <span className="font-mono font-semibold">#{r.space_number || '—'}</span>
      ),
    },
    {
      key: 'plate',
      label: 'Placa',
      render: (r) => <span className="font-mono font-semibold">{r.plate || '—'}</span>,
    },
    {
      key: 'vehicle_type_label',
      label: 'Tipo',
      render: (r) => (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Car className="h-3 w-3" />
          {r.vehicle_type_label}
        </Badge>
      ),
    },
    {
      key: 'customer_name',
      label: 'Cliente',
      render: (r) => <span className="text-sm">{r.customer_name || '—'}</span>,
    },
    {
      key: 'customer_phone',
      label: 'Teléfono',
      hideOnMobile: true,
      render: (r) =>
        r.customer_phone ? (
          <a
            href={`tel:${r.customer_phone.replace(/\s+/g, '')}`}
            className="text-primary hover:underline text-sm"
          >
            {r.customer_phone}
          </a>
        ) : <span className="text-muted-foreground">—</span>,
    },
  ], []);

  const pendingColumns: Column<AdminReservation>[] = useMemo(() => [
    ...baseColumns,
    {
      key: 'expires_at',
      label: 'Vence en',
      sortable: true,
      filterable: false,
      render: (r) => <CountdownCell expiresAt={r.expires_at} />,
    },
  ], [baseColumns]);

  const confirmedColumns: Column<AdminReservation>[] = useMemo(() => [
    ...baseColumns,
    {
      key: 'confirmed_at',
      label: 'Confirmada',
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.confirmed_at ? formatDateTime(r.confirmed_at) : '—'}
        </span>
      ),
    },
  ], [baseColumns]);

  const historyColumns: Column<AdminReservation>[] = useMemo(() => [
    ...baseColumns,
    {
      key: 'reserved_at',
      label: 'Reservada',
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(r.reserved_at)}</span>
      ),
    },
    {
      key: 'status_label',
      label: 'Estado',
      render: (r) => {
        const isExpiredPending =
          r.status === 'pending' && new Date(r.expires_at).getTime() <= Date.now();
        const status = isExpiredPending ? 'expired' : r.status;
        return (
          <Badge variant="outline" className={`text-xs ${STATUS_STYLE[status] || ''}`}>
            {STATUS_LABEL[status] || status}
          </Badge>
        );
      },
    },
  ], [baseColumns]);

  if (isLoading) return <TableSkeleton columns={6} rows={5} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <BookmarkCheck className="h-6 w-6 text-primary" /> Reservas de Cupos
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Verifica y confirma las reservas que hacen los conductores e invitados.
        </p>
      </div>

      {pending.length > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            Tienes <strong>{pending.length}</strong> {pending.length === 1 ? 'reserva pendiente' : 'reservas pendientes'} por verificar.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="pending" className="gap-1.5">
            <Timer className="h-4 w-4" />
            Pendientes
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 leading-none">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Confirmadas
            {confirmed.length > 0 && (
              <span className="ml-1 rounded-full bg-green-600 text-white text-[10px] px-1.5 py-0.5 leading-none">
                {confirmed.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <DataTable
            columns={pendingColumns}
            data={pending}
            searchPlaceholder="Buscar por placa, cliente, espacio..."
            actions={(r) => (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setVerifyTarget(r)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aceptar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRejectTarget(r)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rechazar
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="confirmed">
          <DataTable
            columns={confirmedColumns}
            data={confirmed}
            searchPlaceholder="Buscar por placa, cliente, espacio..."
            actions={(r) => (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setRejectTarget(r)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="history">
          <DataTable
            columns={historyColumns}
            data={history}
            searchPlaceholder="Buscar por placa, cliente, espacio..."
          />
        </TabsContent>
      </Tabs>

      <VerifyDialog
        reservation={verifyTarget}
        onClose={() => setVerifyTarget(null)}
        onConfirm={(id) => confirmMutation.mutate(id)}
        loading={confirmMutation.isPending}
      />

      <AlertDialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              El cupo se liberará automáticamente y quedará disponible para otros conductores.
              {rejectTarget?.plate && (
                <> La reserva de la placa <strong className="font-mono">{rejectTarget.plate}</strong> en el espacio
                  #{rejectTarget.space?.space_number || '—'} se marcará como rechazada.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelMutation.isPending}
              onClick={() => rejectTarget && cancelMutation.mutate(rejectTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? 'Rechazando...' : 'Sí, rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CountdownCell({ expiresAt }: { expiresAt: string }) {
  const c = useCountdown(expiresAt, true);
  if (c.expired) {
    return <Badge variant="outline" className={STATUS_STYLE.expired}>Expirada</Badge>;
  }
  const urgent = c.minutes < 5;
  return (
    <span
      className={`font-mono font-bold tabular-nums text-sm ${
        urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
      }`}
    >
      {c.label}
    </span>
  );
}

function VerifyDialog({
  reservation, onClose, onConfirm, loading,
}: {
  reservation: AdminReservation | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  loading: boolean;
}) {
  const countdown = useCountdown(reservation?.expires_at, !!reservation);

  if (!reservation) return null;

  const vehicleLabel =
    VEHICLE_TYPE_LABELS[reservation.vehicle_type as VehicleType] || reservation.vehicle_type || 'Carro';

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Verificar reserva
          </DialogTitle>
          <DialogDescription>
            Revisa la información del conductor antes de confirmar el cupo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
            <DetailLine label="Espacio">
              <span className="font-mono font-bold text-base">
                #{reservation.space?.space_number || '—'}
              </span>
            </DetailLine>
            <DetailLine label="Placa">
              <span className="font-mono font-bold">{reservation.plate || '—'}</span>
            </DetailLine>
            <DetailLine label="Tipo de vehículo">
              <Badge variant="secondary" className="gap-1">
                <Car className="h-3 w-3" /> {vehicleLabel}
              </Badge>
            </DetailLine>
            <DetailLine label="Cliente">
              <span className="font-medium">{reservation.customer_name || '—'}</span>
            </DetailLine>
            <DetailLine label="Teléfono">
              {reservation.customer_phone ? (
                <a
                  href={`tel:${reservation.customer_phone.replace(/\s+/g, '')}`}
                  className="text-primary hover:underline font-medium"
                >
                  {reservation.customer_phone}
                </a>
              ) : (
                <span>—</span>
              )}
            </DetailLine>
            <DetailLine label="Reservada">
              <span className="text-sm">{formatDateTime(reservation.reserved_at)}</span>
            </DetailLine>
            <DetailLine label="Expira">
              <span className="text-sm">{formatDateTime(reservation.expires_at)}</span>
            </DetailLine>
          </div>

          {!countdown.expired ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-center gap-3">
              <Timer className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-amber-700 dark:text-amber-500">Tiempo restante</p>
                <p className="font-mono font-bold text-lg text-amber-800 dark:text-amber-300 tabular-nums">
                  {countdown.label}
                </p>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Esta reserva ya expiró. No se puede confirmar.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(reservation.id)}
            disabled={loading || countdown.expired}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {loading ? 'Confirmando...' : 'Confirmar reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
