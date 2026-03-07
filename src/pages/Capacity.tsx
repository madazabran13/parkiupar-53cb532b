import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3 } from 'lucide-react';

export default function Capacity() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aforo</h1>
        <p className="text-muted-foreground">Visualiza la capacidad del parqueadero</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" /> Módulo en desarrollo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Este módulo se implementará en la Fase 9.</p>
        </CardContent>
      </Card>
    </div>
  );
}
