import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VisitService, type VisitRecord, type ReservationRecord } from '@/services/visit.service';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { History, AlertTriangle, MapPin, Clock, Car, BookmarkCheck, Phone, Navigation, Info, Timer, DollarSign } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/PageSkeletons';
import { formatDateTime, formatCurrency } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS } from '@/types';
import type { VehicleType } from '@/types';
import { useCountdown } from '@/hooks/useCountdown';

type ItemKind = 'visit' | 'reservation';
type KindFilter = 'all' | 'visit' | 'reservation';
type StateFilter = 'all' | 'active' | 'completed' | 'expired' | 'cancelled';

const STATE_LABEL: Record<string, string> = {
  active: 'Activa',
  completed: 'Completada',
  expired: 'Expirada',
  cancelled: 'Cancelada',
};

const STATE_STYLE: Record<string, string> = {
  active: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40',
  completed: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40',
  expired: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40',
};

interface CombinedItem {
  id: string;
  kind: ItemKind;
  state: StateFilter;
  state_label: string;
  raw_status: string;
  tenant: ReservationRecord['tenant'];
  tenant_name: string;
  plate: string;
  vehicle_type_label: string;
  space_number: string;
  date: string; // entry_time o reserved_at
  total_amount: number | null;
  hours_parked: number | null;
  exit_time: string | null;
  expires_at: string | null;
  raw_visit?: VisitRecord;
  raw_reservation?: ReservationRecord;
}

function visitToItem(v: VisitRecord): CombinedItem {
  let state: StateFilter = 'completed';
  if (v.status === 'active') state = 'active';
  else if (v.status === 'cancelled') state = 'cancelled';
  return {
    id: `v-${v.id}`,
    kind: 'visit',
    state,
    state_label: STATE_LABEL[state],
    raw_status: v.status,
    tenant: v.tenant,
    tenant_name: v.tenant?.name || '',
    plate: v.plate || '—',
    vehicle_type_label: VEHICLE_TYPE_LABELS[v.vehicle_type as VehicleType] || v.vehicle_type || 'Carro',
    space_number: v.space_number || '',
    date: v.entry_time,
    total_amount: v.total_amount,
    hours_parked: v.hours_parked,
    exit_time: v.exit_time,
    expires_at: null,
    raw_visit: v,
  };
}

function reservationToItem(r: ReservationRecord): CombinedItem {
  const expired = new Date(r.expires_at).getTime() <= Date.now();
  let state: StateFilter;
  if (r.status === 'cancelled') state = 'cancelled';
  else if (r.status === 'expired') state = 'expired';
  else if ((r.status === 'pending' || r.status === 'confirmed') && expired) state = 'expired';
  else state = 'active'; // pending, confirmed, arrived no expiradas
  return {
    id: `r-${r.id}`,
    kind: 'reservation',
    state,
    state_label: STATE_LABEL[state],
    raw_status: r.status,
    tenant: r.tenant,
    tenant_name: r.tenant?.name || '',
    plate: r.plate || '—',
    vehicle_type_label: VEHICLE_TYPE_LABELS[r.vehicle_type as VehicleType] || r.vehicle_type || 'Carro',
    space_number: r.space?.space_number || '',
    date: r.reserved_at,
    total_amount: null,
    hours_parked: null,
    exit_time: null,
    expires_at: r.expires_at,
    raw_reservation: r,
  };
}

export default function VisitsTab() {
  const { user, profile } = useAuth();
  const phone = profile?.phone || null;
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<CombinedItem | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`conductor-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const title: string = payload?.new?.title || '';
          const message: string = payload?.new?.message || '';
          if (title === 'Reserva confirmada' || title === 'Reserva rechazada' || title === 'Reserva cancelada') {
            queryClient.invalidateQueries({ queryKey: ['conductor-reservations'] });
            queryClient.invalidateQueries({ queryKey: ['conductor-visits'] });
            if (title === 'Reserva confirmada') toast.success(title, { description: message });
            else toast.warning(title, { description: message });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const { data: visits = [], isLoading: loadingVisits } = useQuery({
    queryKey: ['conductor-visits', phone],
    queryFn: () => VisitService.listForConductor(phone),
    enabled: !!phone,
    refetchInterval: 30_000,
  });

  const { data: reservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ['conductor-reservations', phone],
    queryFn: () => VisitService.listReservationsForConductor(phone),
    enabled: !!phone,
    refetchInterval: 30_000,
  });

  const items = useMemo<CombinedItem[]>(() => {
    const all = [
      ...visits.map(visitToItem),
      ...reservations.map(reservationToItem),
    ];
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return all;
  }, [visits, reservations]);

  const counts = useMemo(() => {
    const c = {
      total: items.length,
      visit: 0, reservation: 0,
      active: 0, completed: 0, expired: 0, cancelled: 0,
    };
    for (const it of items) {
      c[it.kind]++;
      c[it.state]++;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (kindFilter !== 'all' && it.kind !== kindFilter) return false;
      if (stateFilter !== 'all' && it.state !== stateFilter) return false;
      return true;
    });
  }, [items, kindFilter, stateFilter]);

  const totalSpent = useMemo(
    () => visits.reduce((acc, v) => acc + (v.total_amount || 0), 0),
    [visits]
  );

  const columns: Column<CombinedItem>[] = [
    {
      key: 'kind',
      label: 'Tipo',
      render: (r) => (
        r.kind === 'visit' ? (
          <Badge variant="secondary" className="gap-1 text-xs bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40">
            <History className="h-3 w-3" /> Visita
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40">
            <BookmarkCheck className="h-3 w-3" /> Reserva
          </Badge>
        )
      ),
    },
    {
      key: 'tenant_name',
      label: 'Parqueadero',
      render: (r) => (
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-foreground truncate">{r.tenant?.name || '—'}</span>
          {r.tenant?.address && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" /> {r.tenant.address}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'space_number',
      label: 'Espacio',
      hideOnMobile: true,
      render: (r) => r.space_number ? <span className="font-mono font-semibold">#{r.space_number}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'plate',
      label: 'Placa',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold">{r.plate}</span>
          <span className="text-xs text-muted-foreground">{r.vehicle_type_label}</span>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Fecha',
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.date)}</span>,
    },
    {
      key: 'state',
      label: 'Estado',
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge variant="outline" className={`text-xs ${STATE_STYLE[r.state] || ''}`}>
            {r.state_label}
          </Badge>
          {r.kind === 'reservation' && r.state === 'active' && r.expires_at && (
            <CountdownCell expiresAt={r.expires_at} />
          )}
        </div>
      ),
    },
    {
      key: 'total_amount',
      label: 'Monto',
      render: (r) =>
        r.kind === 'visit' && r.total_amount != null
          ? <span className="font-semibold text-foreground">{formatCurrency(r.total_amount)}</span>
          : <span className="text-muted-foreground">—</span>,
    },
  ];

  const renderActions = (r: CombinedItem) => {
    const tenant = r.tenant;
    const hasGeo = tenant?.latitude != null && tenant?.longitude != null;
    const mapsUrl = hasGeo
      ? `https://www.google.com/maps/dir/?api=1&destination=${tenant!.latitude},${tenant!.longitude}`
      : tenant?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tenant.name} ${tenant.address}`)}`
        : null;
    const phoneUrl = tenant?.phone ? `tel:${tenant.phone.replace(/\s+/g, '')}` : null;
    const isActiveReservation = r.kind === 'reservation' && r.state === 'active';

    return (
      <div className="flex items-center gap-1">
        {isActiveReservation && mapsUrl && (
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
          >
            <Navigation className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ir</span>
          </Button>
        )}
        {isActiveReservation && phoneUrl && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => (window.location.href = phoneUrl)}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Llamar</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setDetail(r)}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Info</span>
        </Button>
      </div>
    );
  };

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
  if (isLoading && items.length === 0) {
    return <TableSkeleton columns={6} rows={5} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Header subtitle={`Identificadas por el teléfono ${phone}`} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Total registros</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{counts.total}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-amber-600" />
              <CardDescription>Reservas activas</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{items.filter(i => i.kind === 'reservation' && i.state === 'active').length}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              <CardDescription>Visitas</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{counts.visit}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <CardDescription>Total pagado</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl sm:text-2xl">{formatCurrency(totalSpent)}</CardTitle>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Tipo:</span>
            <ToggleGroup
              type="single"
              value={kindFilter}
              onValueChange={(v) => v && setKindFilter(v as KindFilter)}
              size="sm"
              variant="outline"
            >
              <ToggleGroupItem value="all" className="text-xs h-8 px-2.5">Todos ({counts.total})</ToggleGroupItem>
              <ToggleGroupItem value="reservation" className="text-xs h-8 px-2.5">Reservas ({counts.reservation})</ToggleGroupItem>
              <ToggleGroupItem value="visit" className="text-xs h-8 px-2.5">Visitas ({counts.visit})</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Estado:</span>
            <ToggleGroup
              type="single"
              value={stateFilter}
              onValueChange={(v) => v && setStateFilter(v as StateFilter)}
              size="sm"
              variant="outline"
            >
              <ToggleGroupItem value="all" className="text-xs h-8 px-2.5">Todos</ToggleGroupItem>
              <ToggleGroupItem value="active" className="text-xs h-8 px-2.5">Activas ({counts.active})</ToggleGroupItem>
              <ToggleGroupItem value="completed" className="text-xs h-8 px-2.5">Completadas ({counts.completed})</ToggleGroupItem>
              <ToggleGroupItem value="expired" className="text-xs h-8 px-2.5">Expiradas ({counts.expired})</ToggleGroupItem>
              <ToggleGroupItem value="cancelled" className="text-xs h-8 px-2.5">Canceladas ({counts.cancelled})</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aún no tienes visitas ni reservas registradas con el teléfono <strong>{phone}</strong>.
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Ningún registro coincide con los filtros seleccionados.
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            searchPlaceholder="Buscar por placa, parqueadero, espacio..."
            actions={renderActions}
          />
        )}
      </div>

      <DetailDialog item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function CountdownCell({ expiresAt }: { expiresAt: string }) {
  const c = useCountdown(expiresAt, true);
  if (c.expired) return null;
  const urgent = c.minutes < 5;
  return (
    <span className={`flex items-center gap-1 font-mono text-xs tabular-nums ${
      urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
    }`}>
      <Timer className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
        <History className="h-6 w-6 text-primary" /> Mis Visitas y Reservas
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground">
        {subtitle || 'Historial unificado de tu actividad en parqueaderos'}
      </p>
    </div>
  );
}

function DetailDialog({ item, onClose }: { item: CombinedItem | null; onClose: () => void }) {
  if (!item) return null;
  const t = item.tenant;
  const hasGeo = t?.latitude != null && t?.longitude != null;
  const mapsUrl = hasGeo
    ? `https://www.google.com/maps/dir/?api=1&destination=${t!.latitude},${t!.longitude}`
    : t?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.name} ${t.address}`)}`
      : null;
  const phoneUrl = t?.phone ? `tel:${t.phone.replace(/\s+/g, '')}` : null;
  const isVisit = item.kind === 'visit';
  const v = item.raw_visit;
  const r = item.raw_reservation;

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isVisit ? 'Detalle de la visita' : 'Detalle de la reserva'}
          </DialogTitle>
          <DialogDescription>
            {item.state_label} {item.space_number ? `· Espacio #${item.space_number}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row label="Parqueadero" value={t?.name || '—'} />
          {t?.address && <Row label="Dirección" value={t.address} />}
          {t?.city && <Row label="Ciudad" value={t.city} />}
          {t?.phone && <Row label="Teléfono" value={t.phone} />}
          <Row label="Placa" value={<span className="font-mono">{item.plate}</span>} />
          <Row label="Tipo de vehículo" value={item.vehicle_type_label} />
          {isVisit && v && (
            <>
              <Row label="Entrada" value={formatDateTime(v.entry_time)} />
              {v.exit_time && <Row label="Salida" value={formatDateTime(v.exit_time)} />}
              {v.hours_parked != null && <Row label="Horas" value={v.hours_parked.toFixed(1)} />}
              {v.total_amount != null && (
                <Row label="Total pagado" value={
                  <strong className="text-green-600 dark:text-green-400">{formatCurrency(v.total_amount)}</strong>
                } />
              )}
            </>
          )}
          {!isVisit && r && (
            <>
              <Row label="Reservada" value={formatDateTime(r.reserved_at)} />
              <Row label="Expira" value={formatDateTime(r.expires_at)} />
              {r.confirmed_at && <Row label="Confirmada" value={formatDateTime(r.confirmed_at)} />}
              {r.customer_name && <Row label="A nombre de" value={r.customer_name} />}
            </>
          )}
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
