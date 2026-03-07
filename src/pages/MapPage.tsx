import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Search, Navigation } from 'lucide-react';
import type { Tenant } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function getAvailabilityColor(available: number, total: number): string {
  if (available === 0) return '#ef4444'; // red
  if (available / total < 0.2) return '#f59e0b'; // yellow
  return '#22c55e'; // green
}

function createColoredIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: tenants = [] } = useQuery({
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

  // Realtime subscription for tenant updates
  useEffect(() => {
    const channel = supabase
      .channel('map-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants' }, () => {
        // Will be handled by react-query refetch
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current).setView([10.4735, -73.2503], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when tenants change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    tenants.forEach((tenant) => {
      if (!tenant.latitude || !tenant.longitude) return;
      const color = getAvailabilityColor(tenant.available_spaces, tenant.total_spaces);
      const marker = L.marker([Number(tenant.latitude), Number(tenant.longitude)], {
        icon: createColoredIcon(color),
      }).addTo(mapInstance.current!);

      marker.bindPopup(`
        <div style="min-width:200px">
          <h3 style="font-weight:bold;font-size:14px;margin:0 0 4px">${tenant.name}</h3>
          <p style="color:#666;font-size:12px;margin:0 0 8px">${tenant.address || 'Valledupar'}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;background:#f3f4f6;padding:8px;border-radius:6px">
            <span style="font-size:12px;color:#666">Disponibles</span>
            <span style="font-weight:bold;font-size:16px;color:${color}">${tenant.available_spaces}/${tenant.total_spaces}</span>
          </div>
          ${tenant.phone ? `<p style="font-size:12px;margin:8px 0 0;color:#666">📞 ${tenant.phone}</p>` : ''}
        </div>
      `);

      markersRef.current.push(marker);
    });
  }, [tenants]);

  const filteredTenants = search
    ? tenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || (t.address || '').toLowerCase().includes(search.toLowerCase()))
    : tenants;

  const focusTenant = (tenant: Tenant) => {
    if (mapInstance.current && tenant.latitude && tenant.longitude) {
      mapInstance.current.setView([Number(tenant.latitude), Number(tenant.longitude)], 16);
      const marker = markersRef.current.find((m) => {
        const pos = m.getLatLng();
        return Math.abs(pos.lat - Number(tenant.latitude)) < 0.0001 && Math.abs(pos.lng - Number(tenant.longitude)) < 0.0001;
      });
      marker?.openPopup();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mapa de Parqueaderos</h1>
          <p className="text-muted-foreground">Disponibilidad en tiempo real en Valledupar</p>
        </div>
        {!user && (
          <Link to="/login">
            <Button variant="outline">Iniciar Sesión</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar list */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar parqueadero..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* Legend */}
          <div className="flex gap-2 text-xs">
            <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22c55e' }} /> Disponible</Badge>
            <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} /> Casi lleno</Badge>
            <Badge variant="outline" className="gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ef4444' }} /> Lleno</Badge>
          </div>

          <div className="flex-1 overflow-auto space-y-2">
            {filteredTenants.map((tenant) => {
              const color = getAvailabilityColor(tenant.available_spaces, tenant.total_spaces);
              return (
                <Card
                  key={tenant.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => focusTenant(tenant)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{tenant.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {tenant.address || 'Valledupar'}
                        </p>
                        {tenant.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {tenant.phone}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color }}>{tenant.available_spaces}</div>
                        <p className="text-[10px] text-muted-foreground">de {tenant.total_spaces}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredTenants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No se encontraron parqueaderos</p>
            )}
          </div>
        </div>

        {/* Map */}
        <div ref={mapRef} className="flex-1 rounded-lg border overflow-hidden" />
      </div>
    </div>
  );
}
