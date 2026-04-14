import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Clock, Trash2, Edit2 } from 'lucide-react';
import type { TenantSchedule, DayGroup } from '@/types';
import { DAY_GROUP_LABELS } from '@/types';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

export default function Schedules() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TenantSchedule | null>(null);
  const [dayGroup, setDayGroup] = useState<DayGroup>('weekday');
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('18:00');


  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_schedules')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('day_group')
        .order('sort_order')
        .order('open_time');
      return (data || []) as unknown as TenantSchedule[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (openTime >= closeTime) throw new Error('La hora de apertura debe ser anterior a la de cierre');
      
      if (editingSchedule) {
        const { error } = await supabase.from('tenant_schedules').update({
          day_group: dayGroup,
          open_time: openTime,
          close_time: closeTime,
        }).eq('id', editingSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenant_schedules').insert({
          tenant_id: tenantId!,
          day_group: dayGroup,
          open_time: openTime,
          close_time: closeTime,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingSchedule ? 'Horario actualizado' : 'Horario agregado');
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenant_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Horario eliminado');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('tenant_schedules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });


  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
    setDayGroup('weekday');
    setOpenTime('06:00');
    setCloseTime('18:00');
  };

  const openEdit = (schedule: TenantSchedule) => {
    setEditingSchedule(schedule);
    setDayGroup(schedule.day_group as DayGroup);
    setOpenTime(schedule.open_time.slice(0, 5));
    setCloseTime(schedule.close_time.slice(0, 5));
    setDialogOpen(true);
  };

  const grouped = {
    weekday: schedules.filter((s) => s.day_group === 'weekday'),
    saturday: schedules.filter((s) => s.day_group === 'saturday'),
    sunday: schedules.filter((s) => s.day_group === 'sunday'),
  };

  if (isLoading) return <TableSkeleton columns={4} rows={3} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Horarios</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Configura las franjas horarias de tu parqueadero</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDialogOpen(true)} className="text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </div>

      {/* Schedule cards by day group */}
      {(['weekday', 'saturday', 'sunday'] as DayGroup[]).map((group) => (
        <Card key={group}>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {DAY_GROUP_LABELS[group]}
              <Badge variant="secondary" className="text-[10px]">{grouped[group].length} franjas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {grouped[group].length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">
                Sin horarios configurados
              </p>
            ) : (
              <div className="space-y-2">
                {grouped[group].map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: schedule.id, is_active: checked })}
                      />
                      <div className={!schedule.is_active ? 'opacity-50' : ''}>
                        <span className="text-sm sm:text-base font-mono font-semibold">
                          {schedule.open_time.slice(0, 5)} — {schedule.close_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(schedule)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(schedule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Editar Horario' : 'Agregar Horario'}</DialogTitle>
            <DialogDescription>Define una franja horaria para tu parqueadero</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grupo de días</Label>
              <Select value={dayGroup} onValueChange={(v) => setDayGroup(v as DayGroup)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DAY_GROUP_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Apertura</Label>
                <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cierre</Label>
                <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
