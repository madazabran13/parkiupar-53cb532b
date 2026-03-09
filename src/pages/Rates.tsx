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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Car, Bike, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import type { VehicleCategory } from '@/types';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

const ICON_OPTIONS = [
  { value: 'car', label: 'Carro', icon: Car },
  { value: 'motorcycle', label: 'Moto', icon: Bike },
  { value: 'truck', label: 'Camión', icon: Truck },
  { value: 'bicycle', label: 'Bicicleta', icon: Bike },
];

const ICON_MAP: Record<string, React.ElementType> = {
  car: Car,
  motorcycle: Bike,
  truck: Truck,
  bicycle: Bike,
};

export default function Rates() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleCategory | null>(null);
  const [deleting, setDeleting] = useState<VehicleCategory | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('car');
  const [ratePerHour, setRatePerHour] = useState('');
  const [fractionEnabled, setFractionEnabled] = useState(false);
  const [fractionMinutes, setFractionMinutes] = useState('15');
  const [minimumMinutes, setMinimumMinutes] = useState('15');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['vehicle-categories', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicle_categories')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('name');
      return (data || []) as unknown as VehicleCategory[];
    },
  });

  const resetForm = () => {
    setName('');
    setIcon('car');
    setRatePerHour('');
    setFractionEnabled(false);
    setFractionMinutes('15');
    setMinimumMinutes('15');
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (cat: VehicleCategory) => {
    setEditing(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setRatePerHour(String(cat.rate_per_hour));
    setFractionEnabled(cat.fraction_minutes !== 60);
    setFractionMinutes(String(cat.fraction_minutes));
    setMinimumMinutes(String(cat.minimum_minutes));
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId!,
        name,
        icon,
        rate_per_hour: parseFloat(ratePerHour) || 0,
        fraction_minutes: fractionEnabled ? (parseInt(fractionMinutes) || 15) : 60,
        minimum_minutes: fractionEnabled ? (parseInt(minimumMinutes) || 15) : 0,
      };
      if (editing) {
        const { error } = await supabase.from('vehicle_categories').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicle_categories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Categoría actualizada' : 'Categoría creada');
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('vehicle_categories').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoría eliminada');
      setDeleteDialogOpen(false);
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarifas</h1>
          <p className="text-muted-foreground">Crea y configura las categorías de vehículos con sus tarifas</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Nueva Categoría
        </Button>
      </div>

      {isLoading ? (
        <CardGridSkeleton cards={4} />
      ) : categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Sin categorías</h3>
            <p className="text-muted-foreground mb-4">Crea tu primera categoría de vehículo con su tarifa</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Crear Categoría
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || Car;
            return (
              <Card key={cat.id} className={!cat.is_active ? 'opacity-50' : ''}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{cat.name}</CardTitle>
                  <IconComponent className="h-8 w-8 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold">
                    {formatCurrency(cat.rate_per_hour)}
                    <span className="text-sm font-normal text-muted-foreground">/hora</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {cat.fraction_minutes < 60 ? (
                      <>
                        <p>Fracción: {cat.fraction_minutes} min</p>
                        <p>Costo/fracción: {formatCurrency(cat.rate_per_hour * cat.fraction_minutes / 60)}</p>
                        {cat.minimum_minutes > 0 && <p>Mínimo: {cat.minimum_minutes} min</p>}
                      </>
                    ) : (
                      <p>Cobro por hora completa</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cat.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: cat.id, is_active: checked })}
                      />
                      <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                        {cat.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setDeleting(cat); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modifica los datos de la categoría' : 'Define el nombre, ícono y tarifa'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Carro, Moto, Patineta..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ícono</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" /> {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tarifa por hora (COP) *</Label>
              <Input type="number" placeholder="3500" value={ratePerHour} onChange={(e) => setRatePerHour(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fracción (min)</Label>
                <Input type="number" value={fractionMinutes} onChange={(e) => setFractionMinutes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mínimo (min)</Label>
                <Input type="number" value={minimumMinutes} onChange={(e) => setMinimumMinutes(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!name || !ratePerHour || saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) setDeleting(null); setDeleteDialogOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Categoría</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar la categoría <strong>{deleting?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleting(null); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
