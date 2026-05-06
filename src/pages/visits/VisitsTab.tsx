import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { VisitService, type VisitRecord, type ReservationRecord } from '@/services/visit.service';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, AlertTriangle, MapPin, Clock, Car, BookmarkCheck, Phone, Navigation } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/PageSkeletons';
import { formatDateTime, formatCurrency } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/types';
import type { VehicleType, SessionStatus } from '@/types';
import { ReservationCard } from './ReservationCard';

export default function VisitsTab() {
  const { profile } = useAuth();
  const phone = profile?.phone || null;
  const [detail, setDetail] = useState<ReservationRecord | null>(null);

  const { data: visits = [], isLoading: loadingVisits } = useQuery({
    queryKey: ['conductor-visits', phone],
    queryFn: () => VisitService.listForConductor(phone),
    enabled: !!phone,
  });

  const { data: reservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ['conductor-reservations', phone],
    queryFn: () => VisitService.listReservationsForConductor(phone),
    enabled: !!phone,
    refetchInterval: 30_000,
  });

  const { active, history } = useMemo(() => {
    const now = Date.now();
    const active: ReservationRecord[] = [];
    const history: ReservationRecord[] = [];
    for (const r of reservations) {
      const expired = new Date(r.expires_at).getTime() <= now;
      if (r.status === 'pending' && !expired) active.push(r);
      else history.push(r);
    }
    return { active, history };
  }, [reservations]);

  const totalVisits = visits.length;
  const totalSpent = visits.reduce((acc, v) => acc + (v.total_amount || 0), 0);
  const totalHours = visits.reduce((acc, v) => acc + (v.hours_parked || 0), 0);

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    if (status === 'active') return 'default';
    if (status === 'completed') return 'secondary';
    return 'destructive';
  };

  const visitColumns: Column<VisitRecord>[] = [
    {
      key: 'tenant',
      label: 'Parqueadero',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.tenant?.name || '—'}</span>
          {r.tenant?.address && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {r.tenant.address}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'plate',
      label: 'Vehículo',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold">{r.plate}</span>
          <span className="text-xs text-muted-foreground">
            {VEHICLE_TYPE_LABELS[r.vehicle_type as VehicleType] || r.vehicle_type}
          </span>
        </div>
      ),
    },
    { key: 'space_number', label: 'Espacio', hideOnMobile: true, render: (r) => r.space_number || '—' },
    { key: 'entry_time', label: 'Entrada', render: (r) => formatDateTime(r.entry_time) },
    { key: 'exit_time', label: 'Salida', hideOnMobile: true, render: (r) => (r.exit_time ? formatDateTime(r.exit_time) : '—') },
    { key: 'hours_parked', label: 'Horas', hideOnMobile: true, render: (r) => (r.hours_parked != null ? r.hours_parked.toFixed(1) : '—') },
    { key: 'total_amount', label: 'Monto', render: (r) => (r.total_amount != null ? formatCurrency(r.total_amount) : '—') },
    {
      key: 'status',
      label: 'Estado',
      render: (r) => (
        <Badge variant={statusVariant(r.status)}>
          {SESSION_STATUS_LABELS[r.status as SessionStatus] || r.status}
        </Badge>
      ),
    },
  ];

  if (!phone) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Header />
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            Para ver tu historial necesitas registrar tu número de teléfono en
            <strong> Configuración → Datos personales</strong>. Tus reservas y visitas
            se identifican por ese teléfono.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLoading = loadingVisits || loadingReservations;
  if (isLoading && visits.length === 0 && reservations.length === 0) {
    return <TableSkeleton columns={6} rows={5} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Header subtitle={`Identificadas por el teléfono ${phone}`} />

      <Tabs defaultValue="reservations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="reservations" className="gap-1.5">
            <BookmarkCheck className="h-4 w-4" />
            Reservas
            {active.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 leading-none">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="visits" className="gap-1.5">
            <History className="h-4 w-4" />
            Visitas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-4">
          {active.length === 0 && history.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aún no has hecho reservas. Cuando reserves un cupo desde el mapa, aparecerá aquí.
              </CardContent>
            </Card>
          ) : (
            <>
              {active.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Activas ({active.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {active.map((r) => (
                      <ReservationCard key={r.id} reservation={r} onShowDetail={setDetail} />
                    ))}
                  </div>
                </section>
              )}

              {history.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Historial ({history.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {history.map((r) => (
                      <ReservationCard key={r.id} reservation={r} onShowDetail={setDetail} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="visits" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <CardDescription>Visitas totales</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">{totalVisits}</CardTitle>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardDescription>Horas acumuladas</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">{totalHours.toFixed(1)}</CardTitle>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total pagado</CardDescription>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">{formatCurrency(totalSpent)}</CardTitle>
              </CardContent>
            </Card>
          </div>

          {totalVisits === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aún no tienes visitas registradas. Cuando un parqueadero registre tu ingreso
                con tu teléfono <strong>{phone}</strong>, aparecerá aquí.
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={visitColumns}
              data={visits}
              searchPlaceholder="Buscar por placa, parqueadero..."
            />
          )}
        </TabsContent>
      </Tabs>

      <ReservationDetailDialog reservation={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
        <History className="h-6 w-6 text-primary" /> Mis Visitas
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground">
        {subtitle || 'Historial de tus reservas y visitas a parqueaderos'}
      </p>
    </div>
  );
}

const RES_STATUS_LABEL: Record<string, string> = {
  pending: 'Activa',
  confirmed: 'Confirmada',
  expired: 'Expirada',
  cancelled: 'Rechazada',
};

function ReservationDetailDialog({
  reservation,
  onClose,
}: {
  reservation: ReservationRecord | null;
  onClose: () => void;
}) {
  if (!reservation) return null;
  const t = reservation.tenant;
  const hasGeo = t?.latitude != null && t?.longitude != null;
  const mapsUrl = hasGeo
    ? `https://www.google.com/maps/dir/?api=1&destination=${t!.latitude},${t!.longitude}`
    : t?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.name} ${t.address}`)}`
      : null;
  const phoneUrl = t?.phone ? `tel:${t.phone.replace(/\s+/g, '')}` : null;

  return (
    <Dialog open={!!reservation} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de la reserva</DialogTitle>
          <DialogDescription>
            {RES_STATUS_LABEL[reservation.status] || reservation.status} · Espacio #
            {reservation.space?.space_number || '—'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row label="Parqueadero" value={t?.name || '—'} />
          {t?.address && <Row label="Dirección" value={t.address} />}
          {t?.city && <Row label="Ciudad" value={t.city} />}
          {t?.phone && <Row label="Teléfono" value={t.phone} />}
          <Row label="Placa" value={<span className="font-mono">{reservation.plate || '—'}</span>} />
          <Row label="Reservada" value={formatDateTime(reservation.reserved_at)} />
          <Row label="Expira" value={formatDateTime(reservation.expires_at)} />
          {reservation.confirmed_at && (
            <Row label="Confirmada" value={formatDateTime(reservation.confirmed_at)} />
          )}
          {reservation.customer_name && <Row label="A nombre de" value={reservation.customer_name} />}
        </div>
        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {phoneUrl && (
            <Button variant="outline" className="gap-1.5" onClick={() => (window.location.href = phoneUrl)}>
              <Phone className="h-4 w-4" /> Llamar
            </Button>
          )}
          {mapsUrl && (
            <Button className="gap-1.5" onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}>
              <Navigation className="h-4 w-4" /> Cómo llegar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  );
}
