/**
 * EntryDialog — Vehicle entry registration.
 * Single Responsibility: entry form and submission.
 */
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Car, Bike, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { VehicleService, CustomerService } from '@/services';
import type { VehicleCategory, Vehicle } from '@/types';
import { useQuery } from '@tanstack/react-query';

const ICON_MAP: Record<string, React.ElementType> = {
  car: Car, motorcycle: Bike, truck: Truck, bicycle: Bike,
};

interface EntryDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSpace: number | null;
  availableSpaces: number[];
  categories: VehicleCategory[];
  tenantId: string;
  onSubmit: (data: {
    plate: string;
    categoryId: string;
    spaceNumber: number;
    customerName: string;
    customerPhone: string;
    notes: string;
    vehicleId?: string;
    customerId?: string;
  }) => void;
  loading: boolean;
  // Pre-fill from reservation
  initialPlate?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
}

export default function EntryDialog({
  open, onClose, selectedSpace: initSpace, availableSpaces, categories,
  tenantId, onSubmit, loading,
  initialPlate, initialCustomerName, initialCustomerPhone,
}: EntryDialogProps) {
  const [plate, setPlate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingPlate, setSearchingPlate] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['entry-customer-suggestions', tenantId, customerSearch],
    enabled: !!tenantId && customerSearch.length >= 2,
    queryFn: () => CustomerService.searchByName(tenantId, customerSearch),
  });

  const selectedCat = categories.find(c => c.id === selectedCategoryId);
  const isBicycle = selectedCat?.icon === 'bicycle';

  // Initialize on open
  useEffect(() => {
    if (open) {
      setSelectedSpace(initSpace);
      setPlate(initialPlate || '');
      setCustomerName(initialCustomerName || '');
      setCustomerPhone(initialCustomerPhone || '');
      setNotes('');
      setFoundVehicle(null);
      if (categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categories[0].id);
      }
    }
  }, [open]);

  // Auto-generate bicycle plate
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat?.icon === 'bicycle' && (!plate || plate.startsWith('BICI-'))) {
      setPlate(`BICI-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  // Plate search with debounce
  const searchPlate = useCallback(async (plateVal: string) => {
    if (!tenantId || plateVal.length < 3) { setFoundVehicle(null); return; }
    setSearchingPlate(true);
    try {
      const vehicle = await VehicleService.findByPlate(tenantId, plateVal);
      if (vehicle) {
        setFoundVehicle(vehicle as Vehicle);
        const matchCat = categories.find(c => c.icon === (vehicle as any).vehicle_type || c.name.toLowerCase() === (vehicle as any).vehicle_type);
        if (matchCat) setSelectedCategoryId(matchCat.id);
        if ((vehicle as any).customers) {
          setCustomerName((vehicle as any).customers.full_name || '');
          setCustomerPhone((vehicle as any).customers.phone || '');
        }
      } else { setFoundVehicle(null); }
    } finally { setSearchingPlate(false); }
  }, [tenantId, categories]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { if (plate.length >= 3) searchPlate(plate); }, 400);
    return () => clearTimeout(t);
  }, [plate, searchPlate, open]);

  const handleClose = () => {
    setPlate(''); setSelectedCategoryId(categories[0]?.id || '');
    setCustomerName(''); setCustomerPhone(''); setNotes('');
    setFoundVehicle(null); setCustomerSearch(''); setShowSuggestions(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Registrar Entrada {selectedSpace ? `- Espacio #${selectedSpace}` : ''}</DialogTitle>
          <DialogDescription>{isBicycle ? 'Datos del cliente y bicicleta' : 'Busca por placa si el vehículo ya está registrado'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{isBicycle ? 'Identificador (auto)' : 'Placa *'}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={isBicycle ? 'BICI-XXXX' : 'ABC123'} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="pl-9 uppercase font-mono text-base" autoFocus={!isBicycle} readOnly={isBicycle} />
            </div>
            {searchingPlate && <p className="text-xs text-muted-foreground animate-pulse">Buscando vehículo...</p>}
            {foundVehicle && <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"><p className="font-medium text-primary">✓ Vehículo encontrado</p></div>}
          </div>
          <div className="space-y-2">
            <Label>Espacio *</Label>
            <Select value={selectedSpace ? String(selectedSpace) : ''} onValueChange={(v) => setSelectedSpace(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
              <SelectContent>{availableSpaces.map((num) => (<SelectItem key={num} value={String(num)}>Espacio #{num}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoría *</Label>
            {categories.length > 0 ? (
              <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{categories.map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Car;
                  return <SelectItem key={cat.id} value={cat.id}><span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {cat.name} — {formatCurrency(cat.rate_per_hour)}/h</span></SelectItem>;
                })}</SelectContent>
              </Select>
            ) : <p className="text-sm text-muted-foreground">Crea categorías en Tarifas.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 relative">
              <Label>Nombre {isBicycle && <span className="text-destructive">*</span>}</Label>
              <Input placeholder="Juan Pérez" value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setCustomerSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => customerSearch.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                autoFocus={isBicycle} />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-auto">
                  {suggestions.map((c: any) => (
                    <button key={c.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); setCustomerName(c.full_name); setCustomerPhone(c.phone || ''); setCustomerSearch(''); setShowSuggestions(false); }}>
                      <span className="font-medium">{c.full_name}</span>
                      {c.phone && <span className="text-muted-foreground ml-2 text-xs">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Teléfono {isBicycle && <span className="text-destructive">*</span>}</Label><Input placeholder="3001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Notas</Label><Textarea placeholder="Observaciones..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          {selectedCat && (
            <div className="rounded-lg border bg-muted p-3 text-sm">
              <span className="font-medium">{selectedCat.name}:</span> {formatCurrency(selectedCat.rate_per_hour)}/hora · Fracción {selectedCat.fraction_minutes} min
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={() => onSubmit({ plate, categoryId: selectedCategoryId, spaceNumber: selectedSpace!, customerName, customerPhone, notes, vehicleId: foundVehicle?.id })} disabled={!plate || !selectedCategoryId || !selectedSpace || loading}>
            {loading ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
