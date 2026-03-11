import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, ParkingCircle, Timer, BookmarkCheck, X, RefreshCw } from 'lucide-react';
import type { ParkingSpace, SpaceStatus } from '@/types';
import { SPACE_STATUS_LABELS } from '@/types';
import { CapacitySkeleton } from '@/components/ui/PageSkeletons';

const STATUS_COLORS: Record<SpaceStatus, string> = {
  available: 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400',
  occupied: 'bg-destructive/15 border-destructive/40 text-destructive',
  reserved: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400',
};

const STATUS_DOT: Record<SpaceStatus, string> = {
  available: 'bg-green-500',
  occupied: 'bg-destructive',
  reserved: 'bg-amber-500',
};

export default function Spaces() {
  const { tenantId, user } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [setupOpen, setSetupOpen] = useState(false);
  const [spaceCount, setSpaceCount] = useState('');
  const [reserveOpen, setReserveOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [plate, setPlate] = useState('');

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useRealtime({
    table: 'parking_spaces',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['parking-spaces', tenantId || '']],
  });

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['parking-spaces', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('parking_spaces')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('space_number');
      return (data || []) as unknown as ParkingSpace[];
    },
  });

  const reservationTimeout = ((tenant?.settings as any)?.reservation_timeout_minutes || 15) as number;

  // Auto-generate spaces
  const setupMutation = useMutation({
    mutationFn: async () => {
      const count = parseInt(spaceCount);
      if (isNaN(count) || count < 1 || count > 500) throw new Error('Ingresa entre 1 y 500 espacios');
      
      // Delete existing spaces first
      await supabase.from('parking_spaces').delete().eq('tenant_id', tenantId!);
      
      const spacesToInsert = Array.from({ length: count }, (_, i) => ({
        tenant_id: tenantId!,
        space_number: String(i + 1),
        label: `Espacio ${i + 1}`,
        status: 'available' as const,
      }));

      // Insert in batches of 50
      for (let i = 0; i < spacesToInsert.length; i += 50) {
        const batch = spacesToInsert.slice(i, i + 50);
        const { error } = await supabase.from('parking_spaces').insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Espacios creados');
      setSetupOpen(false);
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  // Reserve space
  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSpace) throw new Error('Sin espacio');
      const expiresAt = new Date(Date.now() + reservationTimeout * 60 * 1000).toISOString();
      
      // Create reservation
      const { error: resError } = await supabase.from('space_reservations').insert({
        tenant_id: tenantId!,
        space_id: selectedSpace.id,
        reserved_by: user?.id || null,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        plate: plate?.toUpperCase() || null,
        status: 'pending',
        expires_at: expiresAt,
      });
      if (resError) throw resError;

      // Update space status
      const { error } = await supabase.from('parking_spaces').update({
        status: 'reserved',
        reserved_by: user?.id || null,
        reserved_at: new Date().toISOString(),
        reservation_expires_at: expiresAt,
      }).eq('id', selectedSpace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Espacio #${selectedSpace?.space_number} reservado por ${reservationTimeout} min`);
      closeReserveDialog();
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al reservar'),
  });

  // Cancel reservation
  const cancelReservation = useMutation({
    mutationFn: async (space: ParkingSpace) => {
      const { error } = await supabase.from('parking_spaces').update({
        status: 'available',
        reserved_by: null,
        reserved_at: null,
        reservation_expires_at: null,
      }).eq('id', space.id);
      if (error) throw error;
      
      // Also update any pending reservations
      await supabase.from('space_reservations')
        .update({ status: 'cancelled' })
        .eq('space_id', space.id)
        .eq('status', 'pending');
    },
    onSuccess: () => {
      toast.success('Reserva cancelada');
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: () => toast.error('Error al cancelar'),
  });

  const closeReserveDialog = () => {
    setReserveOpen(false);
    setSelectedSpace(null);
    setCustomerName('');
    setCustomerPhone('');
    setPlate('');
  };

  const handleSpaceClick = (space: ParkingSpace) => {
    if (space.status === 'available') {
      setSelectedSpace(space);
      setReserveOpen(true);
    } else if (space.status === 'reserved') {
      setSelectedSpace(space);
    }
  };

  const getRemainingTime = (expiresAt: string | null): string => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expirado';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const counts = {
    available: spaces.filter((s) => s.status === 'available').length,
    occupied: spaces.filter((s) => s.status === 'occupied').length,
    reserved: spaces.filter((s) => s.status === 'reserved').length,
  };

  if (isLoading) return <CapacitySkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Control de Cupos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestión en tiempo real de espacios</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSpaceCount(String(spaces.length || tenant?.total_spaces || 20)); setSetupOpen(true); }} className="text-xs sm:text-sm">
            <RefreshCw className="h-4 w-4 mr-1" /> Configurar
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-3 sm:pt-6 text-center">
            <div className="text-2xl sm:text-4xl font-bold text-green-600">{counts.available}</div>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-6 text-center">
            <div className="text-2xl sm:text-4xl font-bold text-destructive">{counts.occupied}</div>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">Ocupados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-6 text-center">
            <div className="text-2xl sm:text-4xl font-bold text-amber-600">{counts.reserved}</div>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">Reservados</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SPACE_STATUS_LABELS).map(([status, label]) => (
          <Badge key={status} variant="outline" className="gap-1 text-xs">
            <div className={`h-2.5 w-2.5 rounded ${STATUS_DOT[status as SpaceStatus]}`} />
            {label}
          </Badge>
        ))}
      </div>

      {spaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ParkingCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">No hay espacios configurados</p>
            <Button onClick={() => { setSpaceCount(String(tenant?.total_spaces || 20)); setSetupOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Crear Espacios
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ParkingCircle className="h-4 w-4 sm:h-5 sm:w-5" /> Mapa de Cupos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2">
              {spaces.map((space) => {
                const remaining = space.status === 'reserved' ? getRemainingTime(space.reservation_expires_at) : '';
                return (
                  <button
                    key={space.id}
                    onClick={() => handleSpaceClick(space)}
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-1.5 sm:p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 min-h-[52px] sm:min-h-[64px] ${STATUS_COLORS[space.status]}`}
                  >
                    <span className="font-bold text-sm sm:text-base">#{space.space_number}</span>
                    {space.status === 'reserved' && remaining && (
                      <span className="text-[9px] sm:text-[10px] font-mono mt-0.5">{remaining}</span>
                    )}
                    {space.status === 'occupied' && (
                      <span className="text-[9px] sm:text-[10px] mt-0.5">Ocupado</span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Space detail for reserved */}
      {selectedSpace && selectedSpace.status === 'reserved' && !reserveOpen && (
        <Dialog open={true} onOpenChange={() => setSelectedSpace(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Espacio #{selectedSpace.space_number} - Reservado</DialogTitle>
              <DialogDescription>
                Tiempo restante: {getRemainingTime(selectedSpace.reservation_expires_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado</span>
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/40">Reservado</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expira en</span>
                <span className="font-mono font-semibold">{getRemainingTime(selectedSpace.reservation_expires_at)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSpace(null)}>Cerrar</Button>
              <Button variant="destructive" onClick={() => { cancelReservation.mutate(selectedSpace); setSelectedSpace(null); }}>
                <X className="h-4 w-4 mr-1" /> Cancelar Reserva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reserve Dialog */}
      <Dialog open={reserveOpen} onOpenChange={closeReserveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reservar Espacio #{selectedSpace?.space_number}</DialogTitle>
            <DialogDescription>La reserva expirará en {reservationTimeout} minutos si no se confirma</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Placa del vehículo</Label>
              <Input placeholder="ABC123" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="uppercase" />
            </div>
            <div className="space-y-2">
              <Label>Nombre (opcional)</Label>
              <Input placeholder="Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono (opcional)</Label>
              <Input placeholder="3001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="rounded-lg border bg-muted/50 p-3 text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-600" />
              <span>Se liberará automáticamente en <strong>{reservationTimeout} min</strong> si no llega</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReserveDialog}>Cancelar</Button>
            <Button onClick={() => reserveMutation.mutate()} disabled={reserveMutation.isPending}>
              <BookmarkCheck className="h-4 w-4 mr-1" />
              {reserveMutation.isPending ? 'Reservando...' : 'Reservar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Espacios</DialogTitle>
            <DialogDescription>Se eliminarán los espacios actuales y se crearán nuevos</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Cantidad de espacios</Label>
            <Input type="number" min={1} max={500} value={spaceCount} onChange={(e) => setSpaceCount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Cancelar</Button>
            <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
              {setupMutation.isPending ? 'Creando...' : 'Crear Espacios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
