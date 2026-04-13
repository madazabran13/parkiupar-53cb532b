/**
 * ExitDialog — Vehicle exit with fee calculation.
 * Single Responsibility: exit confirmation and receipt.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut as ExitIcon, Printer } from 'lucide-react';
import { formatCurrency, formatTime } from '@/lib/utils/formatters';
import { calculateParkingFee } from '@/lib/utils/pricing';
import type { ParkingSession, VehicleCategory } from '@/types';

interface ExitDialogProps {
  session: ParkingSession | null;
  spaceNumber: number | null;
  categories: VehicleCategory[];
  hasPrinting: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

export default function ExitDialog({
  session, spaceNumber, categories, hasPrinting, onConfirm, onClose, loading,
}: ExitDialogProps) {
  if (!session) return null;

  const category =
    categories.find(c => c.name.toLowerCase() === session.vehicle_type?.toLowerCase()) ||
    categories.find(c => c.icon === session.vehicle_type);

  const ratePerHour = category?.rate_per_hour || session.rate_per_hour || 0;
  const fractionMin = category?.fraction_minutes || 15;
  const fee = calculateParkingFee(session.entry_time, new Date().toISOString(), ratePerHour, fractionMin);
  const categoryLabel = category?.name || session.vehicle_type;

  return (
    <Dialog open={!!session} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ExitIcon className="h-5 w-5 text-destructive" />
            Registrar Salida
            <Badge variant="outline" className="font-mono text-xs ml-1">Espacio #{spaceNumber}</Badge>
          </DialogTitle>
          <DialogDescription>Confirma la salida del vehículo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
              <p className="text-xs text-muted-foreground">Placa</p>
              <p className="font-mono font-bold text-base">{session.plate}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-semibold text-sm">{categoryLabel}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-semibold text-sm truncate">{session.customer_name || '—'}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="font-semibold text-sm">{formatTime(session.entry_time)}</p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-primary/10 p-5 text-center space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total a cobrar</p>
            <p className="text-4xl font-extrabold text-primary tracking-tight">{formatCurrency(fee.total)}</p>
            <p className="text-xs text-muted-foreground">
              {fee.totalMinutes} min · {fee.fractions} fracciones × {formatCurrency(fee.costPerFraction)}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {hasPrinting && (
            <Button variant="secondary" onClick={onConfirm} disabled={loading}>
              <Printer className="h-4 w-4 mr-1" /> Salida + Recibo
            </Button>
          )}
          <Button onClick={onConfirm} disabled={loading} variant="destructive" className="font-semibold">
            <ExitIcon className="h-4 w-4 mr-1" />
            {loading ? 'Procesando...' : 'Salida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
