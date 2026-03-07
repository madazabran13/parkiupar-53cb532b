import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { MapPin, Phone, Search, List, X, DollarSign, Navigation, Filter, Locate, Car } from 'lucide-react';
import type { Tenant, VehicleCategory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { MapSkeleton } from '@/components/ui/PageSkeletons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function getAvailabilityColor(available: number, total: number): string {
  if (available === 0) return '#ef4444';
  if (available / total < 0.2) return '#f59e0b';
  return '#22c55e';
}

function createColoredIcon(color: string, available: number) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="background:${color};width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:700;font-size:11px;line-height:1;">${available}</span>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-2px;"></div>
      </div>
    `,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });
}

function getGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function getWazeUrl(lat: number, lng: number) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(50000);
  const [locating, setLocating] = useState(false);

  const { data: tenants = [], isLoading: loadingMap } = useQuery({
    queryKey: ['map-tenants'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true)
        .eq('city', 'Valledupar');
      return (data || []) as unknown as Tenant[];
    },
  });

  const { data: ratesMap = {} } = useQuery({
    queryKey: ['map-rates', tenants.map(t => t.id)],
    enabled: tenants.length > 0,
    queryFn: async () => {
      const ids = tenants.map(t => t.id);
      const { data } = await supabase
        .from('vehicle_categories')
        .select('*')
        .in('tenant_id', ids)
        .eq('is_active', true)
        .order('rate_per_hour', { ascending: true });
      const map: Record<string, VehicleCategory[]> = {};
      (data || []).forEach((r: any) => {
        if (!map[r.tenant_id]) map[r.tenant_id] = [];
        map[r.tenant_id].push(r as unknown as VehicleCategory);
      });
      return map;
    },
  });

  // Get all unique category names for filter
  const allCategoryNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(ratesMap).forEach(rates => rates.forEach(r => names.add(r.name)));
    return Array.from(names).sort();
  }, [ratesMap]);

  // Get global max price for slider
  const globalMaxPrice = useMemo(() => {
    let max = 10000;
    Object.values(ratesMap).forEach(rates => rates.forEach(r => {
      if (Number(r.rate_per_hour) > max) max = Number(r.rate_per_hour);
    }));
    return Math.ceil(max / 1000) * 1000;
  }, [ratesMap]);

  // Reset maxPrice when globalMaxPrice loads
  useEffect(() => {
    if (globalMaxPrice > 0) setMaxPrice(globalMaxPrice);
  }, [globalMaxPrice]);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // Text search
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(t.address || '').toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      const rates = ratesMap[t.id] || [];
      // Vehicle type filter
      if (vehicleFilter !== 'all') {
        const hasCategory = rates.some(r => r.name === vehicleFilter);
        if (!hasCategory) return false;
      }
      // Price filter
      if (rates.length > 0) {
        const minRate = Math.min(...rates.map(r => Number(r.rate_per_hour)));
        if (minRate > maxPrice) return false;
      }
      return true;
    });
  }, [tenants, ratesMap, search, vehicleFilter, maxPrice]);

  useEffect(() => {
    const channel = supabase
      .channel('map-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants' }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([10.4735, -73.2503], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance.current);
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

    // Try geolocation on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          mapInstance.current?.flyTo([latitude, longitude], 15, { duration: 1.5 });
          addUserMarker(latitude, longitude);
        },
        () => {} // silently fail
      );
    }

    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);

  const addUserMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.2);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    }).addTo(mapInstance.current).bindPopup('Tu ubicación');
  };

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current?.flyTo([latitude, longitude], 16, { duration: 1 });
        addUserMarker(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!mapInstance.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filteredIds = new Set(filteredTenants.map(t => t.id));

    tenants.forEach((tenant) => {
      if (!tenant.latitude || !tenant.longitude) return;
      if (!filteredIds.has(tenant.id)) return;

      const color = getAvailabilityColor(tenant.available_spaces, tenant.total_spaces);
      const pct = tenant.total_spaces > 0 ? Math.round(((tenant.total_spaces - tenant.available_spaces) / tenant.total_spaces) * 100) : 0;
      const statusLabel = tenant.available_spaces === 0 ? 'LLENO' : tenant.available_spaces / tenant.total_spaces < 0.2 ? 'Casi lleno' : 'Disponible';
      const rates = ratesMap[tenant.id] || [];
      const lat = Number(tenant.latitude);
      const lng = Number(tenant.longitude);

      const ratesHtml = rates.length > 0
        ? `<div style="margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Tarifas</div>
            ${rates.map(r => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;">
              <span style="color:#475569;">${r.name}</span>
              <span style="font-weight:600;color:#1a1a1a;">$${Number(r.rate_per_hour).toLocaleString()}/h</span>
            </div>`).join('')}
          </div>`
        : '';

      const navHtml = `
        <div style="display:flex;gap:6px;margin-top:10px;">
          <a href="${getGoogleMapsUrl(lat, lng)}" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 8px;background:#4285f4;color:white;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;">
            📍 Google Maps
          </a>
          <a href="${getWazeUrl(lat, lng)}" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 8px;background:#33ccff;color:white;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;">
            🧭 Waze
          </a>
        </div>
      `;

      const marker = L.marker([lat, lng], {
        icon: createColoredIcon(color, tenant.available_spaces),
      }).addTo(mapInstance.current!);

      marker.on('click', () => {
        mapInstance.current?.flyTo([lat, lng], 18, { duration: 1 });
      });

      marker.bindPopup(`
        <div style="min-width:220px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <h3 style="font-weight:700;font-size:14px;margin:0;color:#1a1a1a;">${tenant.name}</h3>
          </div>
          <p style="color:#666;font-size:12px;margin:0 0 10px;padding-left:18px;">📍 ${tenant.address || 'Valledupar'}</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Espacios libres</div>
                <div style="font-size:22px;font-weight:800;color:${color};line-height:1.2;">${tenant.available_spaces}<span style="font-size:13px;font-weight:400;color:#94a3b8;">/${tenant.total_spaces}</span></div>
              </div>
              <div style="text-align:right;">
                <span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;color:white;background:${color};">${statusLabel}</span>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${pct}% ocupado</div>
              </div>
            </div>
          </div>
          ${ratesHtml}
          ${tenant.phone ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b;margin-top:8px;">📞 <a href="tel:${tenant.phone}" style="color:#3b82f6;text-decoration:none;">${tenant.phone}</a></div>` : ''}
          ${navHtml}
        </div>
      `, { className: 'parking-popup', maxWidth: 300 });

      markersRef.current.push(marker);
    });
  }, [tenants, ratesMap, filteredTenants]);

  const focusTenant = (tenant: Tenant) => {
    if (mapInstance.current && tenant.latitude && tenant.longitude) {
      mapInstance.current.setView([Number(tenant.latitude), Number(tenant.longitude)], 16);
      const marker = markersRef.current.find((m) => {
        const pos = m.getLatLng();
        return Math.abs(pos.lat - Number(tenant.latitude)) < 0.0001 && Math.abs(pos.lng - Number(tenant.longitude)) < 0.0001;
      });
      marker?.openPopup();
    }
    setShowList(false);
  };

  const TenantList = () => (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar parqueadero..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Filters toggle */}
      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowFilters(!showFilters)}>
        <Filter className="h-3.5 w-3.5" />
        Filtros
        {(vehicleFilter !== 'all' || maxPrice < globalMaxPrice) && (
          <Badge variant="default" className="ml-auto text-[10px] h-4 px-1.5">Activos</Badge>
        )}
      </Button>

      {showFilters && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de vehículo</Label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allCategoryNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Precio máximo/hora</Label>
                <span className="text-xs font-medium">${maxPrice.toLocaleString()}</span>
              </div>
              <Slider
                value={[maxPrice]}
                onValueChange={([v]) => setMaxPrice(v)}
                min={0}
                max={globalMaxPrice}
                step={500}
                className="py-1"
              />
            </div>
            {(vehicleFilter !== 'all' || maxPrice < globalMaxPrice) && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setVehicleFilter('all'); setMaxPrice(globalMaxPrice); }}>
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22c55e' }} /> Disponible</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} /> Casi lleno</Badge>
        <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ef4444' }} /> Lleno</Badge>
      </div>
      <div className="flex-1 overflow-auto space-y-2">
        {filteredTenants.map((tenant) => {
          const color = getAvailabilityColor(tenant.available_spaces, tenant.total_spaces);
          const rates = ratesMap[tenant.id] || [];
          const lat = Number(tenant.latitude);
          const lng = Number(tenant.longitude);
          return (
            <Card key={tenant.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => focusTenant(tenant)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{tenant.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{tenant.address || 'Valledupar'}</span>
                    </p>
                    {tenant.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 flex-shrink-0" /> {tenant.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-lg font-bold" style={{ color }}>{tenant.available_spaces}</div>
                    <p className="text-[10px] text-muted-foreground">de {tenant.total_spaces}</p>
                  </div>
                </div>
                {rates.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tarifas</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {rates.map((r) => (
                        <div key={r.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground truncate">{r.name}</span>
                          <span className="font-medium">${Number(r.rate_per_hour).toLocaleString()}/h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Navigation buttons */}
                {tenant.latitude && tenant.longitude && (
                  <div className="mt-2 pt-2 border-t border-border flex gap-2">
                    <a
                      href={getGoogleMapsUrl(lat, lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm" className="w-full text-[10px] h-7 gap-1">
                        <Navigation className="h-3 w-3" /> Google Maps
                      </Button>
                    </a>
                    <a
                      href={getWazeUrl(lat, lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm" className="w-full text-[10px] h-7 gap-1">
                        <Navigation className="h-3 w-3" /> Waze
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filteredTenants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No se encontraron parqueaderos</p>
        )}
      </div>
    </>
  );

  const isPublic = !user;

  return (
    <div className={`flex flex-col ${isPublic ? 'h-screen p-4 sm:p-6' : 'h-[calc(100vh-5rem)]'} gap-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isPublic && (
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {isPublic ? 'ParkingPro' : 'Mapa de Parqueaderos'}
            </h1>
            <p className="text-sm text-muted-foreground">Disponibilidad en tiempo real · {filteredTenants.length} parqueaderos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setShowList(!showList)}>
            {showList ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          {!user && (
            <Link to="/login">
              <Button variant="outline" size="sm">Iniciar Sesión</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 relative">
        {/* Desktop sidebar */}
        <div className="hidden md:flex w-72 lg:w-80 flex-shrink-0 flex-col gap-3">
          <TenantList />
        </div>

        {/* Mobile slide-over list */}
        {showList && (
          <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col gap-3 p-2 md:hidden overflow-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">Parqueaderos</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowList(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <TenantList />
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0 rounded-lg border overflow-hidden" />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-3 right-3 z-[1000] h-9 w-9 bg-background/90 backdrop-blur-sm shadow-md"
            onClick={handleLocate}
            disabled={locating}
            title="Mi ubicación"
          >
            <Locate className={`h-4 w-4 ${locating ? 'animate-pulse text-primary' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
