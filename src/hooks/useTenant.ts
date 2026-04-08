import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types';

const POLL_INTERVAL = 3_000; // 3 seconds

export function useTenant() {
  const { tenantId } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [planModules, setPlanModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('tenants')
      .select('*, plans(modules, max_spaces)')
      .eq('id', tenantId)
      .single();
    if (data) {
      const { plans, ...tenantData } = data as any;
      const t = tenantData as unknown as Tenant;

      // Auto-fix: if available_spaces exceeds total_spaces, correct it
      if (t.available_spaces > t.total_spaces) {
        const corrected = Math.max(t.total_spaces, 0);
        t.available_spaces = corrected;
        // Fire-and-forget DB correction
        supabase.from('tenants').update({ available_spaces: corrected }).eq('id', tenantId).then(() => {});
      }

      // Auto-fix only when tenant exceeds the plan limit
      if (plans?.max_spaces && t.total_spaces > plans.max_spaces) {
        const occupied = Math.max(t.total_spaces - t.available_spaces, 0);
        t.total_spaces = plans.max_spaces;
        t.available_spaces = Math.max(plans.max_spaces - occupied, 0);
        // Fire-and-forget DB correction
        supabase.from('tenants').update({ 
          total_spaces: t.total_spaces, 
          available_spaces: t.available_spaces 
        }).eq('id', tenantId).then(() => {});
      }

      setTenant(t);
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
    const channelId = `tenant-${tenantId}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
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
