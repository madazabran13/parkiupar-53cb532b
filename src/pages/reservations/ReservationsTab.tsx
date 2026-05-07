import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { useCountdown } from '@/hooks/useCountdown';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  BookmarkCheck, CheckCircle2, XCircle, Timer, Phone, Car, User, Hash,
  Clock, AlertTriangle,
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
        .limit(200);
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
      if (r.status === 'pending' && !expired) pending.push(r);
      else if (r.status === 'confirmed') confirmed.push(r);
      else history.push(r);
    }
    return { pending, confirmed, history };
  }, [reservations]);

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('confirm_reservation', { p_reservation_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reserva confirmada');
      setVerifyTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reservations', tenantId || ''] });
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
    },
    onError: (e: any) => toast.error(e?.message || 'No se pudo rechazar la reserva'),
  });

  if (isLoading) return <TableSkeleton columns={5} rows={5} />;

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

        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState message="No hay reservas pendientes en este momento." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pending.map((r) => (
                <PendingCard
                  key={r.id}
                  reservation={r}
                  onVerify={() => setVerifyTarget(r)}
                  onReject={() => setRejectTarget(r)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-3">
          {confirmed.length === 0 ? (
            <EmptyState message="Todavía no has confirmado ninguna reserva." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {confirmed.map((r) => (
                <ConfirmedCard
                  key={r.id}
                  reservation={r}
                  onCancel={() => setRejectTarget(r)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <EmptyState message="Sin historial de reservas todavía." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {history.map((r) => (
                <HistoryCard key={r.id} reservation={r} />
              ))}
            </div>
          )}
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

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

function VehicleBadge({ value }: { value: string }) {
  const label = VEHICLE_TYPE_LABELS[value as VehicleType] || value || 'Carro';
  return (
    <Badge variant="secondary" className="gap-1">
      <Car className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_STYLE[status] || ''}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

function PendingCard({
  reservation, onVerify, onReject,
}: {
  reservation: AdminReservation;
  onVerify: () => void;
  onReject: () => void;
}) {
  const countdown = useCountdown(reservation.expires_at, true);
  const expired = countdown.expired;

  return (
    <Card className="overflow-hidden border-amber-500/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-foreground">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-bold text-base">
                Espacio #{reservation.space?.space_number || '—'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reservada {formatDateTime(reservation.reserved_at)}
            </p>
          </div>
          <StatusBadge status={expired ? 'expired' : 'pending'} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <InfoRow icon={<Car className="h-3.5 w-3.5" />} label="Placa">
            <span className="font-mono font-semibold text-foreground">
              {reservation.plate || '—'}
            </span>
          </InfoRow>
          <InfoRow icon={<BookmarkCheck className="h-3.5 w-3.5" />} label="Tipo">
            <VehicleBadge value={reservation.vehicle_type} />
          </InfoRow>
          <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Cliente">
            <span className="text-foreground">{reservation.customer_name || '—'}</span>
          </InfoRow>
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono">
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
          </InfoRow>
        </div>

        {!expired && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 flex items-center gap-2">
            <Timer className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-amber-700 dark:text-amber-500 uppercase tracking-wide">
                Vence en
              </p>
              <p className="font-mono font-bold text-base text-amber-800 dark:text-amber-300 tabular-nums">
                {countdown.label}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onReject}
            disabled={expired}
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onVerify}
            disabled={expired}
          >
            <CheckCircle2 className="h-4 w-4" />
            Verificar y aceptar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfirmedCard({
  reservation, onCancel,
}: {
  reservation: AdminReservation;
  onCancel: () => void;
}) {
  return (
    <Card className="overflow-hidden border-green-500/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-foreground">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-bold text-base">
                Espacio #{reservation.space?.space_number || '—'}
              </span>
            </div>
            {reservation.confirmed_at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirmada {formatDateTime(reservation.confirmed_at)}
              </p>
            )}
          </div>
          <StatusBadge status="confirmed" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <InfoRow icon={<Car className="h-3.5 w-3.5" />} label="Placa">
            <span className="font-mono font-semibold text-foreground">
              {reservation.plate || '—'}
            </span>
          </InfoRow>
          <InfoRow icon={<BookmarkCheck className="h-3.5 w-3.5" />} label="Tipo">
            <VehicleBadge value={reservation.vehicle_type} />
          </InfoRow>
          <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Cliente">
            <span className="text-foreground">{reservation.customer_name || '—'}</span>
          </InfoRow>
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono">
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
          </InfoRow>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onCancel}
          >
            <XCircle className="h-4 w-4" />
            Cancelar reserva
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryCard({ reservation }: { reservation: AdminReservation }) {
  const isExpiredPending =
    reservation.status === 'pending' &&
    new Date(reservation.expires_at).getTime() <= Date.now();
  const status = isExpiredPending ? 'expired' : reservation.status;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-foreground">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-bold text-base">
                Espacio #{reservation.space?.space_number || '—'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reservada {formatDateTime(reservation.reserved_at)}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <InfoRow icon={<Car className="h-3.5 w-3.5" />} label="Placa">
            <span className="font-mono font-semibold text-foreground">
              {reservation.plate || '—'}
            </span>
          </InfoRow>
          <InfoRow icon={<BookmarkCheck className="h-3.5 w-3.5" />} label="Tipo">
            <VehicleBadge value={reservation.vehicle_type} />
          </InfoRow>
          <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Cliente">
            <span className="text-foreground">{reservation.customer_name || '—'}</span>
          </InfoRow>
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono">
            <span className="text-foreground">{reservation.customer_phone || '—'}</span>
          </InfoRow>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
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
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Espacio</span>
              <span className="font-mono font-bold text-lg text-foreground">
                #{reservation.space?.space_number || '—'}
              </span>
            </div>
            <Separator />
            <DetailLine label="Placa">
              <span className="font-mono font-bold text-base">{reservation.plate || '—'}</span>
            </DetailLine>
            <DetailLine label="Tipo de vehículo">
              <VehicleBadge value={reservation.vehicle_type} />
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

function Separator() {
  return <div className="border-t border-border" />;
}
