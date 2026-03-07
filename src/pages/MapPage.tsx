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

function createColoredIcon(color: string, available: number, total: number) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
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

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([10.4735, -73.2503], 15);

    // Clean CartoDB Positron tiles - minimal, street names only
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Position zoom control on the right
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

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
      const pct = tenant.total_spaces > 0 ? Math.round(((tenant.total_spaces - tenant.available_spaces) / tenant.total_spaces) * 100) : 0;
      const statusLabel = tenant.available_spaces === 0 ? 'LLENO' : tenant.available_spaces / tenant.total_spaces < 0.2 ? 'Casi lleno' : 'Disponible';

      const marker = L.marker([Number(tenant.latitude), Number(tenant.longitude)], {
        icon: createColoredIcon(color, tenant.available_spaces, tenant.total_spaces),
      }).addTo(mapInstance.current!);

      marker.on('click', () => {
        mapInstance.current?.flyTo([Number(tenant.latitude), Number(tenant.longitude)], 18, {
          duration: 1,
        });
      });

      marker.bindPopup(`
        <div style="min-width:240px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <h3 style="font-weight:700;font-size:15px;margin:0;color:#1a1a1a;">${tenant.name}</h3>
          </div>
          <p style="color:#666;font-size:12px;margin:0 0 10px;padding-left:18px;">📍 ${tenant.address || 'Valledupar'}</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Espacios libres</div>
                <div style="font-size:24px;font-weight:800;color:${color};line-height:1.2;">${tenant.available_spaces}<span style="font-size:14px;font-weight:400;color:#94a3b8;">/${tenant.total_spaces}</span></div>
              </div>
              <div style="text-align:right;">
                <span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;color:white;background:${color};">${statusLabel}</span>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${pct}% ocupado</div>
              </div>
            </div>
          </div>
          ${tenant.phone ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b;">📞 <a href="tel:${tenant.phone}" style="color:#3b82f6;text-decoration:none;">${tenant.phone}</a></div>` : ''}
        </div>
      `, { className: 'parking-popup', maxWidth: 280 });

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
