import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Edit, Car, Bike, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS } from '@/types';
import type { VehicleRate, VehicleType } from '@/types';

const VEHICLE_ICONS: Record<VehicleType, React.ReactNode> = {
  car: <Car className="h-8 w-8" />,
  motorcycle: <Bike className="h-8 w-8" />,
  truck: <Truck className="h-8 w-8" />,
  bicycle: <Bike className="h-8 w-8" />,
};

export default function Rates() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VehicleRate | null>(null);
  const [ratePerHour, setRatePerHour] = useState('');
  const [fractionMinutes, setFractionMinutes] = useState('');
  const [minimumMinutes, setMinimumMinutes] = useState('');

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['rates-all', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_rates').select('*').eq('tenant_id', tenantId!).order('vehicle_type');
      return (data || []) as unknown as VehicleRate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from('vehicle_rates').update({
        rate_per_hour: parseFloat(ratePerHour),
        fraction_minutes: parseInt(fractionMinutes),
        minimum_minutes: parseInt(minimumMinutes),
      }).eq('id', editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tarifa actualizada');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['rates-all'] });
      queryClient.invalidateQueries({ queryKey: ['rates'] });
    },
    onError: () => toast.error('Error al actualizar tarifa'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('vehicle_rates').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates-all'] });
      queryClient.invalidateQueries({ queryKey: ['rates'] });
    },
  });

  const openEdit = (rate: VehicleRate) => {
    setEditing(rate);
    setRatePerHour(String(rate.rate_per_hour));
    setFractionMinutes(String(rate.fraction_minutes));
    setMinimumMinutes(String(rate.minimum_minutes));
  };

  // If no rates exist yet, show a message to create them
  const allTypes: VehicleType[] = ['car', 'motorcycle', 'truck', 'bicycle'];
  const existingTypes = rates.map((r) => r.vehicle_type);
  const missingTypes = allTypes.filter((t) => !existingTypes.includes(t));

  const createRateMutation = useMutation({
    mutationFn: async (type: VehicleType) => {
      const { error } = await supabase.from('vehicle_rates').insert({
        tenant_id: tenantId!,
        vehicle_type: type,
        rate_per_hour: type === 'car' ? 3500 : type === 'motorcycle' ? 2000 : type === 'truck' ? 5000 : 1000,
        fraction_minutes: 15,
        minimum_minutes: 15,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tarifa creada');
      queryClient.invalidateQueries({ queryKey: ['rates-all'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tarifas</h1>
        <p className="text-muted-foreground">Configura las tarifas por tipo de vehículo</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {rates.map((rate) => (
          <Card key={rate.id} className={!rate.is_active ? 'opacity-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{VEHICLE_TYPE_LABELS[rate.vehicle_type]}</CardTitle>
              <div className="text-muted-foreground">{VEHICLE_ICONS[rate.vehicle_type]}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">{formatCurrency(rate.rate_per_hour)}<span className="text-sm font-normal text-muted-foreground">/hora</span></div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Fracción: {rate.fraction_minutes} min</p>
                <p>Costo/fracción: {formatCurrency(rate.rate_per_hour * rate.fraction_minutes / 60)}</p>
                <p>Mínimo: {rate.minimum_minutes} min</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={rate.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: rate.id, is_active: checked })} />
                  <Badge variant={rate.is_active ? 'default' : 'secondary'}>{rate.is_active ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(rate)}><Edit className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {missingTypes.map((type) => (
          <Card key={type} className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{VEHICLE_TYPE_LABELS[type]}</CardTitle>
              <div className="text-muted-foreground opacity-40">{VEHICLE_ICONS[type]}</div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => createRateMutation.mutate(type)}>
                Crear tarifa
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Tarifa - {editing && VEHICLE_TYPE_LABELS[editing.vehicle_type]}</DialogTitle>
            <DialogDescription>Modifica los valores de la tarifa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tarifa por hora (COP)</Label>
              <Input type="number" value={ratePerHour} onChange={(e) => setRatePerHour(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fracción (minutos)</Label>
              <Input type="number" value={fractionMinutes} onChange={(e) => setFractionMinutes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mínimo (minutos)</Label>
              <Input type="number" value={minimumMinutes} onChange={(e) => setMinimumMinutes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
