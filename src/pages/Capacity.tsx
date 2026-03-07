import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, ParkingCircle } from 'lucide-react';
import type { ParkingSession } from '@/types';
import { VEHICLE_TYPE_LABELS } from '@/types';

export default function Capacity() {
  const { tenantId } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [configOpen, setConfigOpen] = useState(false);
  const [newCapacity, setNewCapacity] = useState('');

  useRealtime({
    table: 'parking_sessions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['capacity-sessions', tenantId || '']],
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['capacity-sessions', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).eq('status', 'active').order('space_number');
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const updateCapacity = useMutation({
    mutationFn: async () => {
      const cap = parseInt(newCapacity);
      if (isNaN(cap) || cap < 1) throw new Error('Invalid');
      const occupied = tenant ? tenant.total_spaces - tenant.available_spaces : 0;
      const { error } = await supabase.from('tenants').update({
        total_spaces: cap,
        available_spaces: Math.max(0, cap - occupied),
      }).eq('id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Capacidad actualizada');
      setConfigOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const totalSpaces = tenant?.total_spaces || 20;
  const availableSpaces = tenant?.available_spaces || 0;
  const occupiedSpaces = totalSpaces - availableSpaces;

  // Build a grid: occupied spaces show session info, available are green
  const occupiedMap = new Map<string, ParkingSession>();
  activeSessions.forEach((s) => {
    if (s.space_number) occupiedMap.set(s.space_number, s);
  });

  // Assign remaining sessions without space numbers to sequential slots
  let unassignedIdx = 0;
  const sessionsWithoutSpace = activeSessions.filter((s) => !s.space_number);

  const getSpaceStatus = (spaceNum: number): { occupied: boolean; session?: ParkingSession } => {
    const key = String(spaceNum);
    if (occupiedMap.has(key)) return { occupied: true, session: occupiedMap.get(key) };
    if (unassignedIdx < sessionsWithoutSpace.length) {
      // Fill first N unassigned spaces
      const countAssigned = occupiedMap.size;
      const unassignedSlotsNeeded = occupiedSpaces - countAssigned;
      if (spaceNum <= countAssigned + unassignedSlotsNeeded && !occupiedMap.has(key)) {
        // This is a rough approximation
      }
    }
    return { occupied: false };
  };

  // Simpler approach: first `occupiedSpaces` slots are occupied, rest are free
  const spaces = Array.from({ length: totalSpaces }, (_, i) => {
    const num = i + 1;
    const key = String(num);
    if (occupiedMap.has(key)) {
      return { num, occupied: true, session: occupiedMap.get(key)! };
    }
    return { num, occupied: i < occupiedSpaces && !occupiedMap.has(key) ? true : false, session: undefined };
  });

  // Better: use explicit occupied map + fill remaining
  const explicitOccupied = new Set([...occupiedMap.keys()].map(Number));
  let filledCount = explicitOccupied.size;
  const finalSpaces = Array.from({ length: totalSpaces }, (_, i) => {
    const num = i + 1;
    const key = String(num);
    if (occupiedMap.has(key)) {
      return { num, occupied: true, session: occupiedMap.get(key)!, vehicleType: occupiedMap.get(key)!.vehicle_type };
    }
    if (!explicitOccupied.has(num) && filledCount < occupiedSpaces) {
      filledCount++;
      const unassigned = sessionsWithoutSpace.shift();
      return { num, occupied: true, session: unassigned, vehicleType: unassigned?.vehicle_type || 'car' as const };
    }
    return { num, occupied: false, session: undefined, vehicleType: undefined };
  });

  const typeColors: Record<string, string> = {
    car: 'bg-blue-500',
    motorcycle: 'bg-amber-500',
    truck: 'bg-purple-500',
    bicycle: 'bg-green-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Aforo</h1>
          <p className="text-sm text-muted-foreground">Visualización de la capacidad del parqueadero</p>
        </div>
        <Button variant="outline" onClick={() => { setNewCapacity(String(totalSpaces)); setConfigOpen(true); }} className="w-full sm:w-auto">
          <Settings className="h-4 w-4 mr-1" /> Configurar
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-green-600">{availableSpaces}</div>
            <p className="text-sm text-muted-foreground mt-1">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-destructive">{occupiedSpaces}</div>
            <p className="text-sm text-muted-foreground mt-1">Ocupados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold">{totalSpaces}</div>
            <p className="text-sm text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="gap-1"><div className="h-3 w-3 rounded bg-green-500" /> Libre</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-3 w-3 rounded bg-blue-500" /> Carro</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-3 w-3 rounded bg-amber-500" /> Moto</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-3 w-3 rounded bg-purple-500" /> Camión</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-3 w-3 rounded bg-green-600" /> Bicicleta</Badge>
      </div>

      {/* Grid */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ParkingCircle className="h-5 w-5" /> Mapa de Espacios</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {finalSpaces.map((space) => (
              <div
                key={space.num}
                className={`relative flex flex-col items-center justify-center rounded-lg border p-2 text-xs font-medium transition-colors ${
                  space.occupied
                    ? `${typeColors[space.vehicleType || 'car']} text-white border-transparent`
                    : 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400'
                }`}
                title={space.session ? `${space.session.plate} - ${VEHICLE_TYPE_LABELS[space.session.vehicle_type]}` : 'Libre'}
              >
                <span className="font-bold">{space.num}</span>
                {space.session && <span className="text-[9px] truncate w-full text-center">{space.session.plate}</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Config dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Capacidad</DialogTitle>
            <DialogDescription>Establece el total de espacios del parqueadero</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Total de espacios</Label>
            <Input type="number" min="1" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={() => updateCapacity.mutate()} disabled={updateCapacity.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
