import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types';

const POLL_INTERVAL = 30_000; // 30 seconds

export function useTenant() {
  const { tenantId } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [planModules, setPlanModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('tenants')
      .select('*, plans(modules)')
      .eq('id', tenantId)
      .single();
    if (data) {
      const { plans, ...tenantData } = data as any;
      setTenant(tenantData as unknown as Tenant);
      setPlanModules(Array.isArray(plans?.modules) ? plans.modules : []);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    fetchTenant().then(() => setLoading(false));

    // Periodic polling as backup for realtime
    const interval = setInterval(fetchTenant, POLL_INTERVAL);

    // Realtime subscription
    const channel = supabase
      .channel(`tenant-${tenantId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tenants',
        filter: `id=eq.${tenantId}`,
      }, () => {
        // Re-fetch full tenant with plan modules instead of using raw payload
        fetchTenant();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchTenant]);

  return { tenant, planModules, loading };
}
