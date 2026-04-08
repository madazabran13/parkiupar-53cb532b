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
import { Settings, ParkingCircle, Search, Car, Bike, Truck, LogOut as ExitIcon, AlertTriangle, BookmarkCheck, Timer, RefreshCw, Printer, Eye, X, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency, formatDuration, formatTime, formatDateTime } from '@/lib/utils/formatters';
import { calculateParkingFee, calculateLiveFee } from '@/lib/utils/pricing';
import { generateExitReceiptPDF } from '@/lib/utils/pdfGenerators';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ParkingSession, VehicleCategory, Vehicle, ParkingSpace, SpaceStatus } from '@/types';
import { SPACE_STATUS_LABELS } from '@/types';
import { CapacitySkeleton } from '@/components/ui/PageSkeletons';

const ICON_MAP: Record<string, React.ElementType> = {
  car: Car, motorcycle: Bike, truck: Truck, bicycle: Bike,
};

const TYPE_COLORS: Record<string, string> = {
  car: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500',
  motorcycle: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500',
  truck: 'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500',
  bicycle: 'bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500',
};

const STATUS_COLORS: Record<SpaceStatus, string> = {
  available: 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400',
  occupied: 'bg-destructive/15 border-destructive/40 text-destructive',
  reserved: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400',
};

const STATUS_DOT: Record<SpaceStatus, string> = {
  available: 'bg-green-500', occupied: 'bg-destructive', reserved: 'bg-amber-500',
};

export default function Capacity() {
  const { tenantId, user } = useAuth();
  const { tenant, planModules } = useTenant();
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
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [searchingPlate, setSearchingPlate] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null);

  // Customer name autocomplete query
  const { data: customerSuggestions = [] } = useQuery({
    queryKey: ['capacity-customer-suggestions', tenantId, customerSearch],
    enabled: !!tenantId && customerSearch.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .eq('tenant_id', tenantId!)
        .ilike('full_name', `%${customerSearch}%`)
        .limit(5);
      return data || [];
    },
  });

  // Bicycle/autocomplete helpers defined after categories query below
  

  // Exit dialog
  const [exitSession, setExitSession] = useState<ParkingSession | null>(null);
  const [exitSpace, setExitSpace] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Reserve dialog
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveSpaceId, setReserveSpaceId] = useState<string | null>(null);
  const [reserveSpaceNum, setReserveSpaceNum] = useState<string>('');
  const [reservePlate, setReservePlate] = useState('');
  const [reserveCustomerName, setReserveCustomerName] = useState('');
  const [reserveCustomerPhone, setReserveCustomerPhone] = useState('');

  // Reservation detail dialog
  const [reservationDetailSpace, setReservationDetailSpace] = useState<ParkingSpace | null>(null);
  const [reservationDetail, setReservationDetail] = useState<any>(null);

  // Confirm dialogs
  const [confirmEntry, setConfirmEntry] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmReserve, setConfirmReserve] = useState(false);
  const [confirmCancelReserve, setConfirmCancelReserve] = useState<ParkingSpace | null>(null);
  const [confirmReserveFromDetail, setConfirmReserveFromDetail] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Setup dialog
  const [setupOpen, setSetupOpen] = useState(false);
  const [spaceCount, setSpaceCount] = useState('');

  const hasPrinting = planModules.includes('printing');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useRealtime({
    table: 'parking_sessions',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['capacity-sessions', tenantId || ''], ['parking-spaces', tenantId || '']],
  });

  useRealtime({
    table: 'parking_spaces',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['parking-spaces', tenantId || ''], ['capacity-sessions', tenantId || '']],
  });

  useRealtime({
    table: 'space_reservations',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    queryKeys: [['parking-spaces', tenantId || ''], ['space-reservations', tenantId || ''], ['capacity-sessions', tenantId || '']],
  });

  useRealtime({
    table: 'tenants',
    filter: tenantId ? `id=eq.${tenantId}` : undefined,
    queryKeys: [['tenant', tenantId || '']],
  });

  const { data: activeSessions = [], isLoading: loadingCapacity } = useQuery({
    queryKey: ['capacity-sessions', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('parking_sessions').select('*').eq('tenant_id', tenantId!).eq('status', 'active').order('space_number');
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const { data: parkingSpaces = [] } = useQuery({
    queryKey: ['parking-spaces', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from('parking_spaces').select('*').eq('tenant_id', tenantId!).order('space_number');
      return (data || []) as unknown as ParkingSpace[];
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

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Auto-generate plate for bicycles
  const generateBicyclePlate = () => `BICI-${Math.floor(1000 + Math.random() * 9000)}`;
  const selectedCatIcon = categories.find(c => c.id === selectedCategoryId)?.icon;
  const isBicycleCategory = selectedCatIcon === 'bicycle';

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat?.icon === 'bicycle' && (!plate || plate.startsWith('BICI-'))) {
      setPlate(generateBicyclePlate());
    }
  };

  const findRateForSession = (session: ParkingSession): VehicleCategory | undefined => {
    const byName = categories.find((c) => c.name.toLowerCase() === session.vehicle_type?.toLowerCase());
    if (byName) return byName;
    const byIcon = categories.find((c) => c.icon === session.vehicle_type);
    if (byIcon) return byIcon;
    return undefined;
  };

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const searchPlate = useCallback(async (plateVal: string) => {
    if (!tenantId || plateVal.length < 3) { setFoundVehicle(null); return; }
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
      const matchCat = categories.find((c) => c.icon === v.vehicle_type || c.name.toLowerCase() === v.vehicle_type);
      if (matchCat) setSelectedCategoryId(matchCat.id);
      if (v.customers) {
        setCustomerName(v.customers.full_name || '');
        setCustomerPhone(v.customers.phone || '');
      }
    } else { setFoundVehicle(null); }
    setSearchingPlate(false);
  }, [tenantId, categories]);

  useEffect(() => {
    const timeout = setTimeout(() => { if (plate.length >= 3) searchPlate(plate); }, 400);
    return () => clearTimeout(timeout);
  }, [plate, searchPlate]);

  const { data: tenantPlan } = useQuery({
    queryKey: ['tenant-plan', tenant?.plan_id],
    enabled: !!tenant?.plan_id,
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('max_spaces').eq('id', tenant!.plan_id!).single();
      return data;
    },
  });
  const maxSpaces = tenantPlan?.max_spaces || 999;
  const reservationTimeout = ((tenant?.settings as any)?.reservation_timeout_minutes || 15) as number;

  const updateCapacity = useMutation({
    mutationFn: async () => {
      const cap = parseInt(newCapacity);
      if (isNaN(cap) || cap < 1) throw new Error('Invalid');
      if (cap > maxSpaces) throw new Error(`El máximo de espacios según tu plan es ${maxSpaces}`);
      const occupied = tenant ? tenant.total_spaces - tenant.available_spaces : 0;
      const { error } = await supabase.from('tenants').update({
        total_spaces: cap, available_spaces: Math.max(0, cap - occupied),
      }).eq('id', tenantId!);
      if (error) throw error;

      // Sync parking_spaces to match new capacity
      const currentSpaces = parkingSpaces.length;
      if (cap > currentSpaces) {
        // Add missing spaces
        const newSpaces = Array.from({ length: cap - currentSpaces }, (_, i) => ({
          tenant_id: tenantId!,
          space_number: String(currentSpaces + i + 1),
          label: `Espacio ${currentSpaces + i + 1}`,
          status: 'available' as const,
        }));
        for (let i = 0; i < newSpaces.length; i += 50) {
          const batch = newSpaces.slice(i, i + 50);
          const { error: insertErr } = await supabase.from('parking_spaces').insert(batch);
          if (insertErr) throw insertErr;
        }
      } else if (cap < currentSpaces) {
        // Remove excess spaces (only those that are available, from the end)
        const spacesToRemove = parkingSpaces
          .filter(s => parseInt(s.space_number) > cap && s.status === 'available')
          .map(s => s.id);
        if (spacesToRemove.length > 0) {
          await supabase.from('parking_spaces').delete().in('id', spacesToRemove);
        }
      }
    },
    onSuccess: () => {
      toast.success('Capacidad y espacios actualizados');
      setConfigOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const entryMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !plate) throw new Error('Faltan datos');
      const { data: activeSession } = await supabase.from('parking_sessions').select('id, tenant_id').eq('plate', plate.toUpperCase()).eq('status', 'active').maybeSingle();
      if (activeSession) {
        throw new Error(activeSession.tenant_id === tenantId ? 'Este vehículo ya se encuentra dentro del parqueadero' : 'Este vehículo se encuentra activo en otro parqueadero de la red');
      }
      const category = categoryMap[selectedCategoryId];
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
      const vehicleType = (category?.icon || 'car') as 'car' | 'motorcycle' | 'truck' | 'bicycle';
      const { data: existingVehicle } = await supabase.from('vehicles').select('id').eq('tenant_id', tenantId).eq('plate', plate.toUpperCase()).single();
      let vehicleId = existingVehicle?.id;
      if (!vehicleId) {
        const { data: newVehicle } = await supabase.from('vehicles').insert({ tenant_id: tenantId, plate: plate.toUpperCase(), vehicle_type: vehicleType, customer_id: customerId || null }).select('id').single();
        vehicleId = newVehicle?.id;
      }
      const { error } = await supabase.from('parking_sessions').insert({
        tenant_id: tenantId, vehicle_id: vehicleId, customer_id: customerId || null,
        plate: plate.toUpperCase(), vehicle_type: vehicleType, customer_name: customerName || null,
        customer_phone: customerPhone || null, space_number: selectedSpace ? String(selectedSpace) : null,
        rate_per_hour: category?.rate_per_hour || 0, notes: notes || null, status: 'active',
      });
      if (error) throw error;
      if (selectedSpace) {
        const matchSpace = parkingSpaces.find(s => s.space_number === String(selectedSpace));
        if (matchSpace) {
          await supabase.from('parking_spaces').update({ status: 'occupied' }).eq('id', matchSpace.id);
          await supabase.from('space_reservations').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('space_id', matchSpace.id).eq('status', 'pending');
        }
      }
    },
    onSuccess: () => {
      toast.success(`Vehículo registrado en espacio #${selectedSpace}`);
      closeEntryDialog();
      queryClient.invalidateQueries({ queryKey: ['capacity-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-active'] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al registrar entrada'),
  });

  const exitMutation = useMutation({
    mutationFn: async (session: ParkingSession) => {
      const exitTime = new Date().toISOString();
      const category = findRateForSession(session);
      const ratePerHour = category?.rate_per_hour || session.rate_per_hour || 0;
      const fractionMin = category?.fraction_minutes || 15;
      const fee = calculateParkingFee(session.entry_time, exitTime, ratePerHour, fractionMin);
      const { error } = await supabase.from('parking_sessions').update({
        exit_time: exitTime, hours_parked: Math.round(fee.totalMinutes / 60 * 100) / 100,
        total_amount: fee.total, status: 'completed' as const,
      }).eq('id', session.id);
      if (error) throw error;
      if (session.space_number) {
        const matchSpace = parkingSpaces.find(s => s.space_number === session.space_number);
        if (matchSpace) {
          await supabase.from('parking_spaces').update({ status: 'available', reserved_by: null, reserved_at: null, reservation_expires_at: null }).eq('id', matchSpace.id);
        }
      }
      return { session, exitTime, fee, ratePerHour, fractionMin };
    },
    onSuccess: (result) => {
      toast.success('Salida registrada');
      setExitSession(null); setExitSpace(null);
      queryClient.invalidateQueries({ queryKey: ['capacity-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-active'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-history'] });
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
      // Show receipt dialog
      if (hasPrinting && result) {
        const { session, exitTime, fee, ratePerHour, fractionMin } = result;
        setReceiptData({
          tenantName: tenant?.name || 'Parqueadero', tenantAddress: tenant?.address, tenantPhone: tenant?.phone,
          plate: session.plate, vehicleType: session.vehicle_type, customerName: session.customer_name,
          customerPhone: session.customer_phone, spaceNumber: session.space_number,
          entryTime: session.entry_time, exitTime, totalMinutes: fee.totalMinutes,
          fractions: fee.fractions, costPerFraction: fee.costPerFraction,
          ratePerHour, fractionMinutes: fractionMin, total: fee.total,
        });
      }
    },
    onError: () => toast.error('Error al registrar salida'),
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!reserveSpaceId) throw new Error('Sin espacio');
      const expiresAt = new Date(Date.now() + reservationTimeout * 60 * 1000).toISOString();
      const { error: resError } = await supabase.from('space_reservations').insert({
        tenant_id: tenantId!, space_id: reserveSpaceId, reserved_by: user?.id || null,
        customer_name: reserveCustomerName || null, customer_phone: reserveCustomerPhone || null,
        plate: reservePlate?.toUpperCase() || null, status: 'pending', expires_at: expiresAt,
      });
      if (resError) throw resError;
      const { error } = await supabase.from('parking_spaces').update({
        status: 'reserved', reserved_by: user?.id || null,
        reserved_at: new Date().toISOString(), reservation_expires_at: expiresAt,
      }).eq('id', reserveSpaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Espacio #${reserveSpaceNum} reservado por ${reservationTimeout} min`);
      closeReserveDialog();
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al reservar'),
  });

  const cancelReservation = useMutation({
    mutationFn: async (space: ParkingSpace) => {
      const { error } = await supabase.from('parking_spaces').update({
        status: 'available', reserved_by: null, reserved_at: null, reservation_expires_at: null,
      }).eq('id', space.id);
      if (error) throw error;
      await supabase.from('space_reservations').update({ status: 'cancelled' }).eq('space_id', space.id).eq('status', 'pending');
    },
    onSuccess: () => {
      toast.success('Reserva cancelada');
      setReservationDetailSpace(null); setReservationDetail(null);
      setConfirmCancelReserve(null);
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    },
    onError: () => toast.error('Error al cancelar'),
  });

  // Confirm reservation (transition to entry)
  const confirmReservationMutation = useMutation({
    mutationFn: async (space: ParkingSpace) => {
      // Just open entry dialog with the space pre-selected and reservation data pre-filled
      return space;
    },
    onSuccess: (space) => {
      const spaceNum = parseInt(space.space_number);
      setSelectedSpace(spaceNum);
      if (reservationDetail) {
        setPlate(reservationDetail.plate || '');
        setCustomerName(reservationDetail.customer_name || '');
        setCustomerPhone(reservationDetail.customer_phone || '');
      }
      setReservationDetailSpace(null);
      setReservationDetail(null);
      setEntryOpen(true);
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const count = parseInt(spaceCount);
      if (isNaN(count) || count < 1 || count > 500) throw new Error('Ingresa entre 1 y 500 espacios');
      await supabase.from('parking_spaces').delete().eq('tenant_id', tenantId!);
      const spacesToInsert = Array.from({ length: count }, (_, i) => ({
        tenant_id: tenantId!, space_number: String(i + 1), label: `Espacio ${i + 1}`, status: 'available' as const,
      }));
      for (let i = 0; i < spacesToInsert.length; i += 50) {
        const batch = spacesToInsert.slice(i, i + 50);
        const { error } = await supabase.from('parking_spaces').insert(batch);
        if (error) throw error;
      }
      // Also sync tenant total_spaces
      const occupied = activeSessions.length;
      await supabase.from('tenants').update({
        total_spaces: count, available_spaces: Math.max(0, count - occupied),
      }).eq('id', tenantId!);
    },
    onSuccess: () => {
      toast.success('Espacios creados');
      setSetupOpen(false);
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const closeEntryDialog = () => {
    setEntryOpen(false); setSelectedSpace(null); setPlate('');
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : '');
    setCustomerName(''); setCustomerPhone(''); setNotes(''); setFoundVehicle(null);
    setCustomerSearch(''); setShowCustomerSuggestions(false);
  };

  const closeReserveDialog = () => {
    setReserveOpen(false); setReserveSpaceId(null); setReserveSpaceNum('');
    setReservePlate(''); setReserveCustomerName(''); setReserveCustomerPhone('');
  };

  const handleGridSpaceClick = (space: typeof finalSpaces[0]) => {
    if (space.status === 'reserved' && space.parkingSpace) {
      // Show reservation detail
      loadReservationDetail(space.parkingSpace);
    } else if (space.occupied && space.session) {
      setExitSession(space.session);
      setExitSpace(space.num);
    } else if (!space.occupied) {
      setSelectedSpace(space.num);
      setEntryOpen(true);
    }
  };

  const loadReservationDetail = async (space: ParkingSpace) => {
    setReservationDetailSpace(space);
    const { data } = await supabase
      .from('space_reservations')
      .select('*')
      .eq('space_id', space.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setReservationDetail(data);
  };

  // Auto-expire reservations client-side check
  useEffect(() => {
    const expiredSpaces = parkingSpaces.filter(
      s => s.status === 'reserved' && s.reservation_expires_at && new Date(s.reservation_expires_at).getTime() < Date.now()
    );
    expiredSpaces.forEach(async (space) => {
      await supabase.from('parking_spaces').update({
        status: 'available', reserved_by: null, reserved_at: null, reservation_expires_at: null,
      }).eq('id', space.id).eq('status', 'reserved');
      await supabase.from('space_reservations').update({ status: 'expired' }).eq('space_id', space.id).eq('status', 'pending');
      queryClient.invalidateQueries({ queryKey: ['parking-spaces'] });
    });
  }, [now, parkingSpaces]);

  const totalSpaces = tenant?.total_spaces || 20;
  const occupiedSpaces = activeSessions.length;
  const availableSpaces = Math.max(0, totalSpaces - occupiedSpaces);
  const reservedCount = parkingSpaces.filter(s => s.status === 'reserved').length;

  const occupiedMap = new Map<string, ParkingSession>();
  activeSessions.forEach((s) => { if (s.space_number) occupiedMap.set(s.space_number, s); });

  const sessionsWithoutSpace = [...activeSessions.filter((s) => !s.space_number)];
  const explicitOccupied = new Set([...occupiedMap.keys()].map(Number));

  const finalSpaces = Array.from({ length: totalSpaces }, (_, i) => {
    const num = i + 1;
    const key = String(num);
    const parkingSpace = parkingSpaces.find(s => s.space_number === key);
    if (occupiedMap.has(key)) {
      return { num, occupied: true, session: occupiedMap.get(key)!, vehicleType: occupiedMap.get(key)!.vehicle_type, parkingSpace, status: 'occupied' as SpaceStatus };
    }
    if (parkingSpace?.status === 'reserved') {
      return { num, occupied: false, session: undefined, vehicleType: undefined, parkingSpace, status: 'reserved' as SpaceStatus };
    }
    if (!explicitOccupied.has(num) && sessionsWithoutSpace.length > 0) {
      const unassigned = sessionsWithoutSpace.shift();
      return { num, occupied: true, session: unassigned, vehicleType: unassigned?.vehicle_type || 'car', parkingSpace, status: 'occupied' as SpaceStatus };
    }
    return { num, occupied: false, session: undefined, vehicleType: undefined, parkingSpace, status: 'available' as SpaceStatus };
  });

  const getCategoryLabel = (vehicleType: string): string => {
    const cat = categories.find((c) => c.icon === vehicleType || c.name.toLowerCase() === vehicleType.toLowerCase());
    return cat?.name || vehicleType;
  };

  const getRemainingTime = (expiresAt: string | null): string => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expirado';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedCategory = categoryMap[selectedCategoryId];
  const availableSpacesList = finalSpaces.filter((s) => !s.occupied && s.status !== 'reserved').map((s) => s.num);
  const exitCategory = exitSession ? findRateForSession(exitSession) : null;
  const exitRatePerHour = exitCategory?.rate_per_hour || exitSession?.rate_per_hour || 0;
  const exitFractionMin = exitCategory?.fraction_minutes || 15;
  const exitFee = exitSession
    ? calculateParkingFee(exitSession.entry_time, new Date().toISOString(), exitRatePerHour, exitFractionMin)
    : null;

  if (loadingCapacity) return <CapacitySkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Aforo</h1>
          <p className="text-sm text-muted-foreground">Gestión de espacios, reservas y entradas/salidas en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setSpaceCount(String(parkingSpaces.length || totalSpaces)); setSetupOpen(true); }} className="text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Cupos
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setNewCapacity(String(totalSpaces)); setConfigOpen(true); }} className="text-xs">
            <Settings className="h-3.5 w-3.5 mr-1" /> Capacidad
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-4">
        <Card><CardContent className="pt-3 sm:pt-6 text-center">
          <div className="text-xl sm:text-3xl font-bold text-green-600">{availableSpaces - reservedCount}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Disponibles</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 sm:pt-6 text-center">
          <div className="text-xl sm:text-3xl font-bold text-destructive">{occupiedSpaces}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Ocupados</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 sm:pt-6 text-center">
          <div className="text-xl sm:text-3xl font-bold text-amber-600">{reservedCount}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Reservados</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 sm:pt-6 text-center">
          <div className="text-xl sm:text-3xl font-bold">{totalSpaces}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total</p>
        </CardContent></Card>
      </div>

      {occupiedSpaces > totalSpaces && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Sobrecupo detectado</AlertTitle>
          <AlertDescription className="text-sm">
            Hay <strong>{occupiedSpaces}</strong> vehículos pero tu plan solo permite <strong>{totalSpaces}</strong> espacios.
          </AlertDescription>
        </Alert>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SPACE_STATUS_LABELS).map(([status, label]) => (
          <Badge key={status} variant="outline" className="gap-1 text-xs">
            <div className={`h-2.5 w-2.5 rounded ${STATUS_DOT[status as SpaceStatus]}`} />
            {label}
          </Badge>
        ))}
        {categories.map((cat) => (
          <Badge key={cat.id} variant="outline" className="gap-1 text-xs">
            <div className={`h-2.5 w-2.5 rounded ${TYPE_COLORS[cat.icon]?.split(' ')[0] || 'bg-blue-500'}`} />
            {cat.name}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <ParkingCircle className="h-4 w-4 sm:h-5 sm:w-5" /> Mapa de Espacios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {parkingSpaces.length === 0 && finalSpaces.length === 0 ? (
            <div className="py-12 text-center">
              <ParkingCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-4">No hay espacios configurados</p>
              <Button onClick={() => { setSpaceCount(String(totalSpaces)); setSetupOpen(true); }}>Crear Espacios</Button>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 sm:gap-2">
              {finalSpaces.map((space) => {
                const spaceRate = space.session ? findRateForSession(space.session) : null;
                const spaceLiveFee = space.session && spaceRate
                  ? calculateLiveFee(space.session.entry_time, spaceRate.rate_per_hour, spaceRate.fraction_minutes) : 0;

                if (space.status === 'reserved' && space.parkingSpace) {
                  const remaining = getRemainingTime(space.parkingSpace.reservation_expires_at);
                  return (
                    <button key={space.num} onClick={() => handleGridSpaceClick(space)}
                      className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-1.5 sm:p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 min-h-[52px] sm:min-h-[64px] ${STATUS_COLORS.reserved}`}
                      title={`Reservado - ${remaining} - Click para ver detalle`}
                    >
                      <span className="font-bold text-sm sm:text-base">#{space.num}</span>
                      <span className="text-[9px] sm:text-[10px] font-mono mt-0.5">{remaining}</span>
                    </button>
                  );
                }

                if (space.status === 'available') {
                  return (
                    <button key={space.num} onClick={() => handleGridSpaceClick(space)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (space.parkingSpace) {
                          setReserveSpaceId(space.parkingSpace.id);
                          setReserveSpaceNum(space.parkingSpace.space_number);
                          setReserveOpen(true);
                        }
                      }}
                      className="relative flex flex-col items-center justify-center rounded-lg border p-1.5 sm:p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 min-h-[52px] sm:min-h-[64px] bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:border-green-400 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                      title={`Espacio #${space.num} - Click para registrar, mantener para reservar`}
                    >
                      <span className="font-bold text-sm sm:text-base">{space.num}</span>
                    </button>
                  );
                }

                return (
                  <button key={space.num} onClick={() => handleGridSpaceClick(space)}
                    className={`relative flex flex-col items-center justify-center rounded-lg border p-1.5 sm:p-2 text-xs font-medium transition-all cursor-pointer active:scale-95 min-h-[52px] sm:min-h-[64px] ${
                      space.occupied
                        ? `${TYPE_COLORS[space.vehicleType || 'car'] || 'bg-blue-500 hover:bg-blue-600'} text-white border-transparent shadow-sm`
                        : 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                    }`}
                    title={space.session ? `${space.session.plate} - ${getCategoryLabel(space.session.vehicle_type)} - ${formatCurrency(spaceLiveFee)}` : `Espacio #${space.num}`}
                  >
                    <span className="font-bold">{space.num}</span>
                    {space.session && <span className="text-[9px] truncate w-full text-center">{space.session.plate}</span>}
                    {space.session && spaceLiveFee > 0 && <span className="text-[8px] font-bold opacity-90">{formatCurrency(spaceLiveFee)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Dialog */}
      <Dialog open={entryOpen} onOpenChange={(open) => { if (!open) closeEntryDialog(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Registrar Entrada {selectedSpace ? `- Espacio #${selectedSpace}` : ''}</DialogTitle>
            <DialogDescription>{isBicycleCategory ? 'Ingresa los datos del cliente y detalles de la bicicleta' : 'Busca por placa si el vehículo ya está registrado'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isBicycleCategory ? 'Identificador (auto)' : 'Placa *'}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={isBicycleCategory ? 'BICI-XXXX' : 'ABC123'}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="pl-9 uppercase font-mono text-base"
                  autoFocus={!isBicycleCategory}
                  readOnly={isBicycleCategory}
                />
              </div>
              {isBicycleCategory && (
                <p className="text-xs text-muted-foreground">Se genera automáticamente para bicicletas</p>
              )}
              {searchingPlate && <p className="text-xs text-muted-foreground animate-pulse">Buscando vehículo...</p>}
              {foundVehicle && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"><p className="font-medium text-primary">✓ Vehículo encontrado</p></div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Espacio *</Label>
              <Select value={selectedSpace ? String(selectedSpace) : ''} onValueChange={(v) => setSelectedSpace(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
                <SelectContent>{availableSpacesList.map((num) => (<SelectItem key={num} value={String(num)}>Espacio #{num}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría *</Label>
              {categories.length > 0 ? (
                <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => {
                      const Icon = ICON_MAP[cat.icon] || Car;
                      return (<SelectItem key={cat.id} value={cat.id}><span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {cat.name} — {formatCurrency(cat.rate_per_hour)}/h</span></SelectItem>);
                    })}
                  </SelectContent>
                </Select>
              ) : <p className="text-sm text-muted-foreground">Crea categorías en Tarifas.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 relative">
                <Label>Nombre {isBicycleCategory && <span className="text-destructive">*</span>}</Label>
                <Input
                  placeholder="Juan Pérez"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerSearch(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => customerSearch.length >= 2 && setShowCustomerSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                  autoFocus={isBicycleCategory}
                />
                {showCustomerSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-auto">
                    {customerSuggestions.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCustomerName(c.full_name);
                          setCustomerPhone(c.phone || '');
                          setCustomerSearch('');
                          setShowCustomerSuggestions(false);
                        }}
                      >
                        <span className="font-medium">{c.full_name}</span>
                        {c.phone && <span className="text-muted-foreground ml-2 text-xs">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2"><Label>Teléfono {isBicycleCategory && <span className="text-destructive">*</span>}</Label><Input placeholder="3001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea placeholder="Observaciones..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
            {selectedCategory && (
              <div className="rounded-lg border bg-muted p-3 text-sm">
                <span className="font-medium">{selectedCategory.name}:</span> {formatCurrency(selectedCategory.rate_per_hour)}/hora · Fracción {selectedCategory.fraction_minutes} min
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEntryDialog}>Cancelar</Button>
            <Button onClick={() => setConfirmEntry(true)} disabled={!plate || !selectedCategoryId || !selectedSpace || entryMutation.isPending}>
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
              Registrar Salida <Badge variant="secondary" className="font-mono">Espacio #{exitSpace}</Badge>
            </DialogTitle>
            <DialogDescription>Confirma la salida del vehículo</DialogDescription>
          </DialogHeader>
          {exitSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Placa:</span> <strong className="font-mono">{exitSession.plate}</strong></div>
                <div><span className="text-muted-foreground">Tipo:</span> <strong>{getCategoryLabel(exitSession.vehicle_type)}</strong></div>
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{exitSession.customer_name || '—'}</strong></div>
                <div><span className="text-muted-foreground">Entrada:</span> <strong>{formatTime(exitSession.entry_time)}</strong></div>
              </div>
              {exitFee && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total a cobrar</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(exitFee.total)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {exitFee.totalMinutes} min · {exitFee.fractions} fracciones × {formatCurrency(exitFee.costPerFraction)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setExitSession(null); setExitSpace(null); }}>Cancelar</Button>
            {hasPrinting && (
              <Button variant="secondary" onClick={() => setConfirmExit(true)} disabled={exitMutation.isPending}>
                <Printer className="h-4 w-4 mr-1" /> Salida + Recibo
              </Button>
            )}
            <Button onClick={() => setConfirmExit(true)} disabled={exitMutation.isPending} variant="destructive">
              <ExitIcon className="h-4 w-4 mr-1" />
              {exitMutation.isPending ? 'Procesando...' : 'Confirmar Salida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reservation Detail Dialog */}
      <Dialog open={!!reservationDetailSpace} onOpenChange={() => { setReservationDetailSpace(null); setReservationDetail(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-amber-500" />
              Reserva - Espacio #{reservationDetailSpace?.space_number}
            </DialogTitle>
            <DialogDescription>Detalle de la reserva activa</DialogDescription>
          </DialogHeader>
          {reservationDetailSpace && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Estado:</span><Badge variant="secondary" className="text-amber-600">Reservado</Badge></div>
                {reservationDetail && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Placa:</span><strong className="font-mono">{reservationDetail.plate || '—'}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><strong>{reservationDetail.customer_name || '—'}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Teléfono:</span><strong>{reservationDetail.customer_phone || '—'}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reservado el:</span><strong>{formatDateTime(reservationDetail.reserved_at)}</strong></div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tiempo restante:</span>
                  <span className="font-mono font-bold text-amber-600 text-lg">
                    {getRemainingTime(reservationDetailSpace.reservation_expires_at)}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3 text-sm flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Si el cliente no llega a tiempo, el espacio se libera automáticamente</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setReservationDetailSpace(null); setReservationDetail(null); }}>Cerrar</Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmCancelReserve(reservationDetailSpace)}
              disabled={cancelReservation.isPending}>
              <X className="h-4 w-4 mr-1" /> Cancelar Reserva
            </Button>
            <Button size="sm" onClick={() => reservationDetailSpace && confirmReservationMutation.mutate(reservationDetailSpace)}>
              <Check className="h-4 w-4 mr-1" /> Confirmar Llegada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reserve Dialog */}
      <Dialog open={reserveOpen} onOpenChange={closeReserveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reservar Espacio #{reserveSpaceNum}</DialogTitle>
            <DialogDescription>La reserva expirará en {reservationTimeout} minutos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Placa</Label><Input placeholder="ABC123" value={reservePlate} onChange={(e) => setReservePlate(e.target.value.toUpperCase())} className="uppercase" /></div>
            <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Juan Pérez" value={reserveCustomerName} onChange={(e) => setReserveCustomerName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input placeholder="3001234567" value={reserveCustomerPhone} onChange={(e) => setReserveCustomerPhone(e.target.value)} /></div>
            <div className="rounded-lg border bg-muted/50 p-3 text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-600" />
              <span>Se libera en <strong>{reservationTimeout} min</strong> si no llega</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReserveDialog}>Cancelar</Button>
            <Button onClick={() => setConfirmReserve(true)} disabled={reserveMutation.isPending}>
              <BookmarkCheck className="h-4 w-4 mr-1" />
              {reserveMutation.isPending ? 'Reservando...' : 'Reservar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Configurar Capacidad</DialogTitle><DialogDescription>Total de espacios del parqueadero</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label>Total de espacios (máx. {maxSpaces})</Label><Input type="number" min="1" max={maxSpaces} value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button><Button onClick={() => updateCapacity.mutate()} disabled={updateCapacity.isPending}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup Spaces Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Configurar Cupos</DialogTitle><DialogDescription>Se crearán espacios individuales para gestión de reservas</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label>Cantidad de espacios</Label><Input type="number" min={1} max={500} value={spaceCount} onChange={(e) => setSpaceCount(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setSetupOpen(false)}>Cancelar</Button><Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>{setupMutation.isPending ? 'Creando...' : 'Crear Espacios'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialogs */}
      <ConfirmDialog open={confirmEntry} onOpenChange={setConfirmEntry} title="Confirmar Entrada"
        description={`¿Registrar entrada del vehículo ${plate} en espacio #${selectedSpace}?`}
        onConfirm={() => { setConfirmEntry(false); entryMutation.mutate(); }} loading={entryMutation.isPending} />

      <ConfirmDialog open={confirmExit} onOpenChange={setConfirmExit} title="Confirmar Salida"
        description={`¿Registrar salida del vehículo ${exitSession?.plate || ''}? Total: ${exitFee ? formatCurrency(exitFee.total) : '$0'}`}
        onConfirm={() => { setConfirmExit(false); if (exitSession) exitMutation.mutate(exitSession); }} variant="destructive" loading={exitMutation.isPending} />

      <ConfirmDialog open={confirmReserve} onOpenChange={setConfirmReserve} title="Confirmar Reserva"
        description={`¿Reservar espacio #${reserveSpaceNum} por ${reservationTimeout} minutos?`}
        onConfirm={() => { setConfirmReserve(false); reserveMutation.mutate(); }} loading={reserveMutation.isPending} />

      <ConfirmDialog open={!!confirmCancelReserve} onOpenChange={() => setConfirmCancelReserve(null)} title="Cancelar Reserva"
        description={`¿Cancelar la reserva del espacio #${confirmCancelReserve?.space_number || ''}?`}
        onConfirm={() => { if (confirmCancelReserve) cancelReservation.mutate(confirmCancelReserve); }} variant="destructive" loading={cancelReservation.isPending} />

      {/* Receipt Dialog */}
      <Dialog open={!!receiptData} onOpenChange={() => setReceiptData(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recibo de Salida</DialogTitle>
            <DialogDescription>La salida ha sido registrada exitosamente</DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Placa:</span><strong className="font-mono">{receiptData.plate}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><strong>{receiptData.vehicleType}</strong></div>
                {receiptData.customerName && <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><strong>{receiptData.customerName}</strong></div>}
                {receiptData.spaceNumber && <div className="flex justify-between"><span className="text-muted-foreground">Espacio:</span><strong>#{receiptData.spaceNumber}</strong></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Duración:</span><strong>{Math.floor(receiptData.totalMinutes / 60)}h {receiptData.totalMinutes % 60}m</strong></div>
              </div>
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Total cobrado</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(receiptData.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{receiptData.fractions} fracciones × {formatCurrency(receiptData.costPerFraction)}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setReceiptData(null)}>Cerrar</Button>
            <Button onClick={() => { generateExitReceiptPDF(receiptData); }}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
