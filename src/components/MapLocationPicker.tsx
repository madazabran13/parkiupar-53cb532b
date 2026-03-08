import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface MapLocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapLocationPicker({ lat, lng, onChange }: MapLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [displayCoords, setDisplayCoords] = useState({ lat, lng });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="background:hsl(var(--primary));width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setDisplayCoords({ lat: pos.lat, lng: pos.lng });
      onChange(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setDisplayCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      onChange(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Fix tile rendering in dialog
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync external lat/lng changes
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
        setDisplayCoords({ lat, lng });
      }
    }
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" /> Ubicación del parqueadero
      </Label>
      <p className="text-xs text-muted-foreground">Haz clic en el mapa o arrastra el marcador para seleccionar la ubicación</p>
      <div
        ref={mapRef}
        className="h-48 w-full rounded-lg border border-border overflow-hidden"
        style={{ zIndex: 0 }}
      />
      <p className="text-[11px] text-muted-foreground">
        {displayCoords.lat.toFixed(6)}, {displayCoords.lng.toFixed(6)}
      </p>
    </div>
  );
}
