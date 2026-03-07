import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types';

function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getLuminance(hex: string): number {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function useTenant() {
  const { tenantId } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchTenant = async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      if (data) setTenant(data as unknown as Tenant);
      setLoading(false);
    };

    fetchTenant();

    const channel = supabase
      .channel(`tenant-${tenantId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tenants',
        filter: `id=eq.${tenantId}`,
      }, (payload) => {
        setTenant(payload.new as unknown as Tenant);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  // Apply tenant theming by overriding design system CSS variables
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    const primaryHSL = hexToHSL(tenant.primary_color);
    const secondaryHSL = hexToHSL(tenant.secondary_color);
    const primaryFg = getLuminance(tenant.primary_color) > 0.5 ? '222.2 84% 4.9%' : '210 40% 98%';

    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--primary-foreground', primaryFg);
    root.style.setProperty('--ring', primaryHSL);
    root.style.setProperty('--sidebar-primary', primaryHSL);
    root.style.setProperty('--sidebar-ring', primaryHSL);
    root.style.setProperty('--accent', secondaryHSL);

    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
      root.style.removeProperty('--accent');
    };
  }, [tenant]);

  return { tenant, loading };
}
