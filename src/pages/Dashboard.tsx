import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, ParkingCircle, DollarSign, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { role, profile } = useAuth();
  const { tenant } = useTenant();

  const occupancyPercent = tenant
    ? Math.round(((tenant.total_spaces - tenant.available_spaces) / tenant.total_spaces) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido, {profile?.full_name || 'Usuario'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Espacios Disponibles</CardTitle>
            <ParkingCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant?.available_spaces ?? '—'}</div>
            <p className="text-xs text-muted-foreground">de {tenant?.total_spaces ?? '—'} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehículos Activos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenant ? tenant.total_spaces - tenant.available_spaces : '—'}
            </div>
            <p className="text-xs text-muted-foreground">en este momento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Ocupación</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyPercent}%</div>
            <Badge variant={occupancyPercent > 80 ? 'destructive' : 'secondary'} className="mt-1">
              {occupancyPercent > 80 ? 'Alta ocupación' : 'Normal'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">se calculará con datos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Los módulos de vehículos, reportes y aforo estarán disponibles en las siguientes fases.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
