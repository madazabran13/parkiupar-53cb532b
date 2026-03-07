import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function Customers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">Historial de clientes del parqueadero</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Módulo en desarrollo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Este módulo se implementará en la Fase 6.</p>
        </CardContent>
      </Card>
    </div>
  );
}
