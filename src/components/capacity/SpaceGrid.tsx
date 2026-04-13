/**
 * SpaceGrid — Presentational component for the parking spaces grid.
 * Single Responsibility: renders the visual grid, delegates events up.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParkingCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { calculateLiveFee } from '@/lib/utils/pricing';
import type { ParkingSession, ParkingSpace, SpaceStatus, VehicleCategory } from '@/types';

export interface GridSpace {
  num: number;
  occupied: boolean;
  session?: ParkingSession;
  vehicleType?: string;
  parkingSpace?: ParkingSpace;
  status: SpaceStatus;
}

interface SpaceGridProps {
  spaces: GridSpace[];
  categories: VehicleCategory[];
  onSpaceClick: (space: GridSpace) => void;
  onSpaceContextMenu: (space: GridSpace) => void;
  getRemainingTime: (expiresAt: string | null) => string;
  onConfigureClick: () => void;
}

const STATUS_COLORS: Record<SpaceStatus, string> = {
  available: 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400',
  occupied: 'bg-destructive/15 border-destructive/40 text-destructive',
  reserved: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400',
};

export default function SpaceGrid({
  spaces,
  categories,
  onSpaceClick,
  onSpaceContextMenu,
  getRemainingTime,
  onConfigureClick,
}: SpaceGridProps) {
  const findRate = (session: ParkingSession) => {
    return (
      categories.find(c => c.name.toLowerCase() === session.vehicle_type?.toLowerCase()) ||
      categories.find(c => c.icon === session.vehicle_type)
    );
  };

  if (spaces.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ParkingCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">No hay espacios configurados</p>
          <button onClick={onConfigureClick} className="text-primary underline text-sm">Configurar Espacios</button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <ParkingCircle className="h-4 w-4 sm:h-5 sm:w-5" /> Mapa de Espacios
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 sm:gap-2">
          {spaces.map((space) => {
            const rate = space.session ? findRate(space.session) : null;
            const liveFee = space.session && rate
              ? calculateLiveFee(space.session.entry_time, rate.rate_per_hour, rate.fraction_minutes) : 0;

            if (space.status === 'reserved' && space.parkingSpace) {
              const remaining = getRemainingTime(space.parkingSpace.reservation_expires_at);
              return (
                <button key={space.num} onClick={() => onSpaceClick(space)}
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-1.5 sm:p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 min-h-[52px] sm:min-h-[64px] ${STATUS_COLORS.reserved}`}
                  title={`Reservado - ${remaining}`}
                >
                  <span className="font-bold text-sm sm:text-base">#{space.num}</span>
                  <span className="text-[9px] sm:text-[10px] font-mono mt-0.5">{remaining}</span>
                </button>
              );
            }

            if (space.status === 'available') {
              return (
                <button key={space.num} onClick={() => onSpaceClick(space)}
                  onContextMenu={(e) => { e.preventDefault(); onSpaceContextMenu(space); }}
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-1.5 sm:p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 min-h-[52px] sm:min-h-[64px] ${STATUS_COLORS.available}`}
                  title={`Espacio #${space.num} - Click para registrar`}
                >
                  <span className="font-bold text-sm sm:text-base">{space.num}</span>
                </button>
              );
            }

            return (
              <button key={space.num} onClick={() => onSpaceClick(space)}
                className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-1.5 sm:p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 min-h-[52px] sm:min-h-[64px] ${STATUS_COLORS.occupied} shadow-sm`}
                title={space.session ? `${space.session.plate} - ${formatCurrency(liveFee)}` : `Espacio #${space.num}`}
              >
                <span className="font-bold">{space.num}</span>
                {space.session && <span className="text-[9px] truncate w-full text-center">{space.session.plate}</span>}
                {space.session && liveFee > 0 && <span className="text-[8px] font-bold opacity-90">{formatCurrency(liveFee)}</span>}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
