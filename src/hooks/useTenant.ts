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

  return { tenant, loading };
}
