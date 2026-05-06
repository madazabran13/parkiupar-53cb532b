import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Info, Timer, Navigation, BookmarkCheck, XCircle, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import type { ReservationRecord, ReservationStatus } from '@/services/visit.service';

interface Props {
  reservation: ReservationRecord;
  onShowDetail: (r: ReservationRecord) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Activa',
  confirmed: 'Confirmada',
  expired: 'Expirada',
  cancelled: 'Rechazada',
};

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Timer; className: string }> = {
  pending: { variant: 'default', icon: Timer, className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40' },
  confirmed: { variant: 'default', icon: CheckCircle2, className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40' },
  expired: { variant: 'destructive', icon: XCircle, className: '' },
  cancelled: { variant: 'destructive', icon: XCircle, className: '' },
};

function useCountdown(expiresAt: string, active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const remainingMs = new Date(expiresAt).getTime() - now;
  const expired = remainingMs <= 0;
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    expired,
    label: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    minutes,
  };
}

export function ReservationCard({ reservation, onShowDetail }: Props) {
  const status = (reservation.status as ReservationStatus) || 'pending';
  const isActive = status === 'pending';
  const countdown = useCountdown(reservation.expires_at, isActive);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  // Render status: if pending but expired client-side, show as expired
  const effectiveStatus = isActive && countdown.expired ? 'expired' : status;
  const effectiveCfg = STATUS_CONFIG[effectiveStatus] || cfg;
  const EffectiveIcon = effectiveCfg.icon;

  const tenant = reservation.tenant;
  const hasGeo = tenant?.latitude != null && tenant?.longitude != null;
  const mapsUrl = hasGeo
    ? `https://www.google.com/maps/dir/?api=1&destination=${tenant!.latitude},${tenant!.longitude}`
    : tenant?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tenant.name} ${tenant.address}`)}`
      : null;
  const phoneUrl = tenant?.phone ? `tel:${tenant.phone.replace(/\s+/g, '')}` : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{tenant?.name || 'Parqueadero'}</h3>
            {tenant?.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" /> {tenant.address}
              </p>
            )}
          </div>
          <Badge variant="outline" className={`flex items-center gap-1 ${effectiveCfg.className}`}>
            <EffectiveIcon className="h-3 w-3" />
            {STATUS_LABELS[effectiveStatus] || effectiveStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Espacio</p>
            <p className="font-mono font-semibold text-foreground">#{reservation.space?.space_number || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Placa</p>
            <p className="font-mono font-semibold text-foreground">{reservation.plate || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Reservada</p>
            <p className="text-foreground">{formatDateTime(reservation.reserved_at)}</p>
          </div>
        </div>

        {isActive && !countdown.expired && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-center gap-3">
            <Timer className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-amber-700 dark:text-amber-500">Tiempo restante</p>
              <p className="font-mono font-bold text-lg text-amber-800 dark:text-amber-300 tabular-nums">
                {countdown.label}
              </p>
            </div>
          </div>
        )}

        {(isActive || effectiveStatus === 'confirmed') && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              className="gap-1 h-9"
              disabled={!mapsUrl}
              onClick={() => mapsUrl && window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
            >
              <Navigation className="h-3.5 w-3.5" />
              <span className="text-xs">Ir</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-9"
              disabled={!phoneUrl}
              onClick={() => phoneUrl && (window.location.href = phoneUrl)}
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="text-xs">Llamar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-9"
              onClick={() => onShowDetail(reservation)}
            >
              <Info className="h-3.5 w-3.5" />
              <span className="text-xs">Info</span>
            </Button>
          </div>
        )}

        {!isActive && effectiveStatus !== 'confirmed' && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => onShowDetail(reservation)}>
              <Info className="h-3.5 w-3.5" /> Ver información
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { BookmarkCheck };
