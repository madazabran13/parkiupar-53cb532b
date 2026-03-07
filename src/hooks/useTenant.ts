import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types';

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

    // Realtime subscription for tenant changes
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

  // Apply tenant theming via CSS variables
  useEffect(() => {
    if (!tenant) return;
    document.documentElement.style.setProperty('--tenant-primary', tenant.primary_color);
    document.documentElement.style.setProperty('--tenant-secondary', tenant.secondary_color);
    return () => {
      document.documentElement.style.removeProperty('--tenant-primary');
      document.documentElement.style.removeProperty('--tenant-secondary');
    };
  }, [tenant]);

  return { tenant, loading };
}
