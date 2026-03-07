import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map as MapIcon } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mapa de Parqueaderos</h1>
        <p className="text-muted-foreground">Encuentra parqueaderos disponibles en Valledupar</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-5 w-5" /> Módulo en desarrollo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">El mapa interactivo con Leaflet se implementará en la Fase 11.</p>
        </CardContent>
      </Card>
    </div>
  );
}
