import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function SuperAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Super Administrador</h1>
        <p className="text-muted-foreground">Gestiona todos los parqueaderos de la plataforma</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Módulo en desarrollo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Este módulo se implementará en la Fase 10.</p>
        </CardContent>
      </Card>
    </div>
  );
}
