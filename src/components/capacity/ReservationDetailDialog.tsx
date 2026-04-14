/**
 * ReservationDetailDialog — Shows reservation details with actions.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkCheck, Timer, X, Check } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import type { ParkingSpace, SpaceReservation } from '@/types';

interface ReservationDetailDialogProps {
  space: ParkingSpace | null;
  reservation: SpaceReservation | null;
  getRemainingTime: (expiresAt: string | null) => string;
  onClose: () => void;
  onCancel: () => void;
  onConfirmArrival: () => void;
  cancelLoading: boolean;
}

export default function ReservationDetailDialog({
  space, reservation, getRemainingTime,
  onClose, onCancel, onConfirmArrival, cancelLoading,
}: ReservationDetailDialogProps) {
  return (
    <Dialog open={!!space} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-amber-500" />
            Reserva - Espacio #{space?.space_number}
          </DialogTitle>
          <DialogDescription>Detalle de la reserva activa</DialogDescription>
        </DialogHeader>
        {space && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="secondary" className="text-amber-600">Reservado</Badge>
              </div>
              {reservation && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Placa:</span><strong className="font-mono">{reservation.plate || '—'}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><strong>{reservation.customer_name || '—'}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Teléfono:</span><strong>{reservation.customer_phone || '—'}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Reservado el:</span><strong>{formatDateTime(reservation.reserved_at)}</strong></div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tiempo restante:</span>
                <span className="font-mono font-bold text-amber-600 text-lg">
                  {getRemainingTime(space.reservation_expires_at)}
                </span>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3 text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>Si el cliente no llega a tiempo, el espacio se libera automáticamente</span>
            </div>
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button variant="destructive" size="sm" onClick={onCancel} disabled={cancelLoading}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={onConfirmArrival}>
            <Check className="h-4 w-4 mr-1" /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
