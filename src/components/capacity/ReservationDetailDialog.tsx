/**
 * ReservationDetailDialog — Shows reservation details with actions.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkCheck, Timer, X, Check, Car, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS, type VehicleType } from '@/types';
import type { ParkingSpace, SpaceReservation } from '@/types';

interface ReservationDetailDialogProps {
  space: ParkingSpace | null;
  reservation: SpaceReservation | null;
  getRemainingTime: (expiresAt: string | null) => string;
  onClose: () => void;
  onCancel: () => void;
  onConfirmArrival: () => void;
  cancelLoading: boolean;
  confirmLoading?: boolean;
}

export default function ReservationDetailDialog({
  space, reservation, getRemainingTime,
  onClose, onCancel, onConfirmArrival, cancelLoading, confirmLoading = false,
}: ReservationDetailDialogProps) {
  const isAdminConfirmed = reservation?.status === 'confirmed';
  return (
    <Dialog open={!!space} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-amber-500" />
            Reserva - Espacio #{space?.space_number}
          </DialogTitle>
          <DialogDescription>
            {isAdminConfirmed
              ? 'Reserva ya confirmada — esperando llegada del vehículo'
              : 'Detalle de la reserva activa'}
          </DialogDescription>
        </DialogHeader>
        {space && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Estado:</span>
                {isAdminConfirmed ? (
                  <Badge variant="outline" className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Confirmada
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-amber-600">Pendiente</Badge>
                )}
              </div>
              {reservation && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Placa:</span><strong className="font-mono">{reservation.plate || '—'}</strong></div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Car className="h-3 w-3" />
                      {VEHICLE_TYPE_LABELS[reservation.vehicle_type as VehicleType] || reservation.vehicle_type || 'Carro'}
                    </Badge>
                  </div>
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
              <span>
                {isAdminConfirmed
                  ? 'Cuando llegue el vehículo, registra la entrada para ocupar el espacio.'
                  : 'Si el cliente no llega a tiempo, el espacio se libera automáticamente.'}
              </span>
            </div>
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button variant="destructive" size="sm" onClick={onCancel} disabled={cancelLoading || confirmLoading}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={onConfirmArrival} disabled={confirmLoading || cancelLoading}>
            <Check className="h-4 w-4 mr-1" />
            {confirmLoading ? 'Registrando...' : 'Confirmar y registrar llegada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
