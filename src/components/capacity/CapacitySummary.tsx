/**
 * CapacitySummary — KPI cards for capacity overview.
 * Single Responsibility: display-only summary.
 */
import { Card, CardContent } from '@/components/ui/card';

interface CapacitySummaryProps {
  available: number;
  occupied: number;
  reserved: number;
  total: number;
}

export default function CapacitySummary({ available, occupied, reserved, total }: CapacitySummaryProps) {
  return (
    <div className="grid gap-3 grid-cols-4">
      <Card><CardContent className="pt-3 sm:pt-6 text-center">
        <div className="text-xl sm:text-3xl font-bold text-green-600">{available}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Disponibles</p>
      </CardContent></Card>
      <Card><CardContent className="pt-3 sm:pt-6 text-center">
        <div className="text-xl sm:text-3xl font-bold text-destructive">{occupied}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Ocupados</p>
      </CardContent></Card>
      <Card><CardContent className="pt-3 sm:pt-6 text-center">
        <div className="text-xl sm:text-3xl font-bold text-amber-600">{reserved}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Reservados</p>
      </CardContent></Card>
      <Card><CardContent className="pt-3 sm:pt-6 text-center">
        <div className="text-xl sm:text-3xl font-bold">{total}</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total</p>
      </CardContent></Card>
    </div>
  );
}
