/**
 * ReserveDialog — Space reservation with GPS-based timeout.
 * Integrates GeolocationService for dynamic reservation times.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Timer, MapPin, Loader2, Navigation } from 'lucide-react';
import { BookmarkCheck } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { GeoCoordinates } from '@/services/geolocation.service';

interface ReserveDialogProps {
  open: boolean;
  spaceNumber: string;
  defaultTimeout: number;
  parkingLocation: GeoCoordinates | null;
  onClose: () => void;
  onSubmit: (data: {
    plate: string;
    customerName: string;
    customerPhone: string;
    timeoutMinutes: number;
  }) => void;
  loading: boolean;
}

export default function ReserveDialog({
  open, spaceNumber, defaultTimeout, parkingLocation,
  onClose, onSubmit, loading,
}: ReserveDialogProps) {
  const [plate, setPlate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customTimeout, setCustomTimeout] = useState<number | null>(null);
  const geo = useGeolocation();

  const effectiveTimeout = customTimeout ?? defaultTimeout;

  const handleCalculateDistance = async () => {
    if (!parkingLocation) return;
    try {
      const result = await geo.calculateTimeout(parkingLocation);
      setCustomTimeout(result.reservationTimeoutMinutes);
    } catch {
      // Error already set in hook
    }
  };

  const handleClose = () => {
    setPlate(''); setCustomerName(''); setCustomerPhone(''); setCustomTimeout(null);
    geo.clearError();
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({ plate, customerName, customerPhone, timeoutMinutes: effectiveTimeout });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reservar Espacio #{spaceNumber}</DialogTitle>
          <DialogDescription>La reserva expirará según el tiempo asignado</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Placa</Label><Input placeholder="ABC123" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="uppercase" /></div>
          <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Teléfono</Label><Input placeholder="3001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>

          {/* GPS-based timeout */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" /> Tiempo de reserva
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={60}
                value={effectiveTimeout}
                onChange={(e) => setCustomTimeout(parseInt(e.target.value) || defaultTimeout)}
                className="w-20 text-center font-mono"
              />
              <span className="text-sm text-muted-foreground">minutos</span>
              {parkingLocation && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCalculateDistance}
                  disabled={geo.loading}
                  className="ml-auto flex-shrink-0"
                >
                  {geo.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">GPS</span>
                </Button>
              )}
            </div>

            {geo.distanceResult && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <MapPin className="h-3.5 w-3.5" />
                  Distancia: {geo.distanceResult.distanceKm} km
                </div>
                <p className="text-muted-foreground">
                  Tiempo estimado de llegada: ~{geo.distanceResult.estimatedMinutes} min
                </p>
                <p className="text-muted-foreground">
                  Reserva asignada: <strong className="text-foreground">{geo.distanceResult.reservationTimeoutMinutes} min</strong>
                </p>
              </div>
            )}

            {geo.error && (
              <p className="text-xs text-destructive">{geo.error}</p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/50 p-3 text-sm flex items-center gap-2">
            <Timer className="h-4 w-4 text-amber-600" />
            <span>Se libera en <strong>{effectiveTimeout} min</strong> si no llega</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <BookmarkCheck className="h-4 w-4 mr-1" />
            {loading ? 'Reservando...' : 'Reservar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
