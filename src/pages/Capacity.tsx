import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useRealtime } from '@/hooks/useRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, ParkingCircle, Search, Car, Bike, Truck, LogOut as ExitIcon } from 'lucide-react';
import { formatCurrency, formatDuration, formatTime } from '@/lib/utils/formatters';
import { calculateParkingFee, calculateLiveFee } from '@/lib/utils/pricing';
import type { ParkingSession, VehicleCategory, Vehicle } from '@/types';
import { CapacitySkeleton } from '@/components/ui/PageSkeletons';

const ICON_MAP: Record<string, React.ElementType> = {
  car: Car,
  motorcycle: Bike,
  truck: Truck,
  bicycle: Bike,
};

const TYPE_COLORS: Record<string, string> = {
  car: 'bg-blue-500 hover:bg-blue-600',
  motorcycle: 'bg-amber-500 hover:bg-amber-600',
  truck: 'bg-purple-500 hover:bg-purple-600',
  bicycle: 'bg-green-600 hover:bg-green-700',
};

export default function Capacity() {
  const { tenantId } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  const [configOpen, setConfigOpen] = useState(false);
  const [newCapacity, setNewCapacity] = useState('');

  // Entry dialog
  const [entryOpen, setEntryOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [plate, setPlate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [searchingPlate, setSearchingPlate] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null);

  // Exit dialog
  const [exitSession, setExitSession] = useState<ParkingSession | null>(null);
  const [exitSpace, setExitSpace] = useState<number | null>(null);

  useRealtime({
    table: 'parking_sessions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['capacity-sessions', tenantId || '']],
  });

  const { data: activeSessions = [], isLoading: loadingCapacity } = useQuery({
    queryKey: ['capacity-sessions', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).eq('status', 'active').order('space_number');
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['vehicle-categories', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_categories').select('*').eq('tenant_id', tenantId!).eq('is_active', true).order('name');
      return (data || []) as unknown as VehicleCategory[];
    },
  });

  // Build a map from category name to category for rate lookups
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  // Also build a map by name for display of sessions (sessions store vehicle_type as text)
  const categoryByName = Object.fromEntries(categories.map((c) => [c.name.toLowerCase(), c]));

  // Find rate for a session - try matching by vehicle_type text against category name
  const findRateForSession = (session: ParkingSession): VehicleCategory | undefined => {
    // First try exact match by vehicle_type against category names
    const byName = categories.find((c) => c.name.toLowerCase() === session.vehicle_type?.toLowerCase());
    if (byName) return byName;
    // Fallback: try matching icon
    const byIcon = categories.find((c) => c.icon === session.vehicle_type);
    if (byIcon) return byIcon;
    // Use rate_per_hour from session if available
    return undefined;
  };

  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const searchPlate = useCallback(async (plateVal: string) => {
    if (!tenantId || plateVal.length < 3) {
      setFoundVehicle(null);
      return;
    }
    setSearchingPlate(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*, customers:customer_id(full_name, phone)')
      .eq('tenant_id', tenantId)
      .eq('plate', plateVal.toUpperCase())
      .single();

    if (data) {
      const v = data as any;
      setFoundVehicle(v as Vehicle);
      // Try to match vehicle_type to a category
      const matchCat = categories.find((c) => c.icon === v.vehicle_type || c.name.toLowerCase() === v.vehicle_type);
      if (matchCat) setSelectedCategoryId(matchCat.id);
      if (v.customers) {
        setCustomerName(v.customers.full_name || '');
        setCustomerPhone(v.customers.phone || '');
      }
    } else {
      setFoundVehicle(null);
    }
    setSearchingPlate(false);
  }, [tenantId, categories]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (plate.length >= 3) searchPlate(plate);
    }, 400);
    return () => clearTimeout(timeout);
  }, [plate, searchPlate]);

  // Get max spaces from tenant's plan
  const { data: tenantPlan } = useQuery({
    queryKey: ['tenant-plan', tenant?.plan_id],
    enabled: !!tenant?.plan_id,
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('max_spaces').eq('id', tenant!.plan_id!).single();
      return data;
    },
  });
  const maxSpaces = tenantPlan?.max_spaces || 999;

  const updateCapacity = useMutation({
    mutationFn: async () => {
      const cap = parseInt(newCapacity);
      if (isNaN(cap) || cap < 1) throw new Error('Invalid');
      if (cap > maxSpaces) throw new Error(`El máximo de espacios según tu plan es ${maxSpaces}`);
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
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const entryMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !plate) throw new Error('Faltan datos');
      const category = categoryMap[selectedCategoryId];

      // Upsert customer only if phone is provided
      let customerId: string | undefined;
      if (customerPhone) {
        const { data: existingCustomer } = await supabase.from('customers').select('id').eq('tenant_id', tenantId).eq('phone', customerPhone).single();
        customerId = existingCustomer?.id;
        if (!customerId) {
          const { data: newCustomer } = await supabase.from('customers').insert({ tenant_id: tenantId, phone: customerPhone, full_name: customerName || 'Sin nombre' }).select('id').single();
          customerId = newCustomer?.id;
        } else if (customerName) {
          await supabase.from('customers').update({ full_name: customerName }).eq('id', customerId);
        }
      }

      // Upsert vehicle - use category icon as vehicle_type for DB enum compatibility
      const vehicleType = (category?.icon || 'car') as 'car' | 'motorcycle' | 'truck' | 'bicycle';
      const { data: existingVehicle } = await supabase.from('vehicles').select('id').eq('tenant_id', tenantId).eq('plate', plate.toUpperCase()).single();
      let vehicleId = existingVehicle?.id;
      if (!vehicleId) {
        const { data: newVehicle } = await supabase.from('vehicles').insert({ tenant_id: tenantId, plate: plate.toUpperCase(), vehicle_type: vehicleType, customer_id: customerId || null }).select('id').single();
        vehicleId = newVehicle?.id;
      }

      const { error } = await supabase.from('parking_sessions').insert({
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        customer_id: customerId || null,
        plate: plate.toUpperCase(),
        vehicle_type: vehicleType,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        space_number: selectedSpace ? String(selectedSpace) : null,
        rate_per_hour: category?.rate_per_hour || 0,
        notes: notes || null,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Vehículo registrado en espacio #${selectedSpace}`);
      closeEntryDialog();
      queryClient.invalidateQueries({ queryKey: ['capacity-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-active'] });
    },
    onError: () => toast.error('Error al registrar entrada'),
  });

  const exitMutation = useMutation({
    mutationFn: async (session: ParkingSession) => {
      const exitTime = new Date().toISOString();
      const category = findRateForSession(session);
      const ratePerHour = category?.rate_per_hour || session.rate_per_hour || 0;
      const fractionMin = category?.fraction_minutes || 15;
      const fee = calculateParkingFee(session.entry_time, exitTime, ratePerHour, fractionMin);
      const { error } = await supabase.from('parking_sessions').update({
        exit_time: exitTime,
        hours_parked: Math.round(fee.totalMinutes / 60 * 100) / 100,
        total_amount: fee.total,
        status: 'completed' as const,
      }).eq('id', session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Salida registrada');
      setExitSession(null);
      setExitSpace(null);
      queryClient.invalidateQueries({ queryKey: ['capacity-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-active'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-history'] });
    },
    onError: () => toast.error('Error al registrar salida'),
  });

  const closeEntryDialog = () => {
    setEntryOpen(false);
    setSelectedSpace(null);
    setPlate('');
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : '');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setFoundVehicle(null);
  };

  const handleSpaceClick = (space: typeof finalSpaces[0]) => {
    if (space.occupied && space.session) {
      setExitSession(space.session);
      setExitSpace(space.num);
    } else if (!space.occupied) {
      setSelectedSpace(space.num);
      setEntryOpen(true);
    }
  };

  const totalSpaces = tenant?.total_spaces || 20;
  const occupiedSpaces = activeSessions.length;
  const availableSpaces = Math.max(0, totalSpaces - occupiedSpaces);

  const occupiedMap = new Map<string, ParkingSession>();
  activeSessions.forEach((s) => {
    if (s.space_number) occupiedMap.set(s.space_number, s);
  });

  const sessionsWithoutSpace = [...activeSessions.filter((s) => !s.space_number)];
  const explicitOccupied = new Set([...occupiedMap.keys()].map(Number));

  const finalSpaces = Array.from({ length: totalSpaces }, (_, i) => {
    const num = i + 1;
    const key = String(num);
    if (occupiedMap.has(key)) {
      return { num, occupied: true, session: occupiedMap.get(key)!, vehicleType: occupiedMap.get(key)!.vehicle_type };
    }
    if (!explicitOccupied.has(num) && sessionsWithoutSpace.length > 0) {
      const unassigned = sessionsWithoutSpace.shift();
      return { num, occupied: true, session: unassigned, vehicleType: unassigned?.vehicle_type || 'car' };
    }
    return { num, occupied: false, session: undefined, vehicleType: undefined };
  });

  // Get display name for a vehicle type from categories
  const getCategoryLabel = (vehicleType: string): string => {
    const cat = categories.find((c) => c.icon === vehicleType || c.name.toLowerCase() === vehicleType.toLowerCase());
    return cat?.name || vehicleType;
  };

  const selectedCategory = categoryMap[selectedCategoryId];
  const availableSpacesList = finalSpaces.filter((s) => !s.occupied).map((s) => s.num);
  const exitCategory = exitSession ? findRateForSession(exitSession) : null;
  const exitRatePerHour = exitCategory?.rate_per_hour || exitSession?.rate_per_hour || 0;
  const exitFractionMin = exitCategory?.fraction_minutes || 15;
  const exitFee = exitSession
    ? calculateParkingFee(exitSession.entry_time, new Date().toISOString(), exitRatePerHour, exitFractionMin)
    : null;

  if (loadingCapacity) return <CapacitySkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Aforo</h1>
          <p className="text-sm text-muted-foreground">Toca un espacio libre para registrar o uno ocupado para dar salida</p>
        </div>
        <Button variant="outline" onClick={() => { setNewCapacity(String(totalSpaces)); setConfigOpen(true); }} className="w-full sm:w-auto">
          <Settings className="h-4 w-4 mr-1" /> Configurar
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-4 sm:pt-6 text-center">
            <div className="text-2xl sm:text-4xl font-bold text-green-600">{availableSpaces}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6 text-center">
            <div className="text-2xl sm:text-4xl font-bold text-destructive">{occupiedSpaces}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Ocupados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6 text-center">
            <div className="text-2xl sm:text-4xl font-bold">{totalSpaces}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend - dynamic from categories */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Badge variant="outline" className="gap-1 text-xs"><div className="h-2.5 w-2.5 rounded bg-green-500" /> Libre</Badge>
        {categories.map((cat) => (
          <Badge key={cat.id} variant="outline" className="gap-1 text-xs">
            <div className={`h-2.5 w-2.5 rounded ${TYPE_COLORS[cat.icon]?.split(' ')[0] || 'bg-blue-500'}`} />
            {cat.name}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ParkingCircle className="h-5 w-5" /> Mapa de Espacios</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {finalSpaces.map((space) => (
              <button
                key={space.num}
                onClick={() => handleSpaceClick(space)}
                className={`relative flex flex-col items-center justify-center rounded-lg border p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                  space.occupied
                    ? `${TYPE_COLORS[space.vehicleType || 'car'] || 'bg-blue-500 hover:bg-blue-600'} text-white border-transparent shadow-sm`
                    : 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:border-green-400 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                }`}
                title={space.session ? `${space.session.plate} - ${getCategoryLabel(space.session.vehicle_type)} - Click para dar salida` : `Espacio #${space.num} - Click para registrar`}
              >
                <span className="font-bold">{space.num}</span>
                {space.session && <span className="text-[9px] truncate w-full text-center">{space.session.plate}</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entry Dialog */}
      <Dialog open={entryOpen} onOpenChange={(open) => { if (!open) closeEntryDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Entrada</DialogTitle>
            <DialogDescription>Busca por placa si el vehículo ya está registrado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Plate search */}
            <div className="space-y-2">
              <Label>Placa *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ABC123"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="pl-9 uppercase font-mono text-base"
                  autoFocus
                />
              </div>
              {searchingPlate && <p className="text-xs text-muted-foreground animate-pulse">Buscando vehículo...</p>}
              {foundVehicle && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
                  <p className="font-medium text-primary">✓ Vehículo encontrado — datos completados</p>
                  <p className="text-muted-foreground">
                    {getCategoryLabel(foundVehicle.vehicle_type)}
                    {foundVehicle.brand && ` · ${foundVehicle.brand}`}
                    {foundVehicle.color && ` · ${foundVehicle.color}`}
                  </p>
                </div>
              )}
              {plate.length >= 3 && !searchingPlate && !foundVehicle && (
                <p className="text-xs text-muted-foreground">Vehículo nuevo — completa los datos abajo</p>
              )}
            </div>

            {/* Space selector */}
            <div className="space-y-2">
              <Label>Espacio *</Label>
              <Select value={selectedSpace ? String(selectedSpace) : ''} onValueChange={(v) => setSelectedSpace(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar espacio disponible" />
                </SelectTrigger>
                <SelectContent>
                  {availableSpacesList.map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      Espacio #{num}
                    </SelectItem>
                  ))}
                  {availableSpacesList.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No hay espacios disponibles</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría de vehículo *</Label>
              {categories.length > 0 ? (
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => {
                      const Icon = ICON_MAP[cat.icon] || Car;
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" /> {cat.name} — {formatCurrency(cat.rate_per_hour)}/h
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">No hay categorías. Crea una en el módulo de Tarifas.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input placeholder="Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono *</Label>
                <Input placeholder="3001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea placeholder="Observaciones..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {selectedCategory && (
              <div className="rounded-lg border bg-muted p-3 text-sm">
                <span className="font-medium">Tarifa ({selectedCategory.name}):</span> {formatCurrency(selectedCategory.rate_per_hour)}/hora · Fracción de {selectedCategory.fraction_minutes} min
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEntryDialog}>Cancelar</Button>
            <Button
              onClick={() => entryMutation.mutate()}
              disabled={!plate || !customerName || !customerPhone || !selectedCategoryId || !selectedSpace || entryMutation.isPending}
            >
              {entryMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Dialog */}
      <Dialog open={!!exitSession} onOpenChange={() => { setExitSession(null); setExitSpace(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Registrar Salida
              <Badge variant="secondary" className="font-mono">Espacio #{exitSpace}</Badge>
            </DialogTitle>
            <DialogDescription>Confirma la salida del vehículo</DialogDescription>
          </DialogHeader>
          {exitSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Placa:</span> <strong className="font-mono">{exitSession.plate}</strong></div>
                <div><span className="text-muted-foreground">Tipo:</span> <strong>{getCategoryLabel(exitSession.vehicle_type)}</strong></div>
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{exitSession.customer_name || '—'}</strong></div>
                <div><span className="text-muted-foreground">Teléfono:</span> <strong>{exitSession.customer_phone || '—'}</strong></div>
                <div><span className="text-muted-foreground">Entrada:</span> <strong>{formatTime(exitSession.entry_time)}</strong></div>
                <div><span className="text-muted-foreground">Duración:</span> <strong>{formatDuration(exitSession.entry_time)}</strong></div>
              </div>
              {exitFee && (
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total a cobrar</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(exitFee.total)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {exitFee.fractions} fracciones × {formatCurrency(exitFee.costPerFraction)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExitSession(null); setExitSpace(null); }}>Cancelar</Button>
            <Button
              onClick={() => exitSession && exitMutation.mutate(exitSession)}
              disabled={exitMutation.isPending}
              variant="destructive"
            >
              <ExitIcon className="h-4 w-4 mr-1" />
              {exitMutation.isPending ? 'Procesando...' : 'Confirmar Salida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Capacidad</DialogTitle>
            <DialogDescription>Establece el total de espacios del parqueadero</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Total de espacios (máx. {maxSpaces})</Label>
            <Input type="number" min="1" max={maxSpaces} value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
            {parseInt(newCapacity) > maxSpaces && (
              <p className="text-xs text-destructive">Excede el máximo de tu plan ({maxSpaces} espacios)</p>
            )}
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
