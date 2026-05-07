import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { VehicleCategory } from '@/types';

const QUERY_KEY = (tenantId: string) => ['vehicle-categories', tenantId] as const;

export function useVehicleCategories(
  tenantId: string | null | undefined,
  opts: { activeOnly?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const { activeOnly = false } = opts;

  const query = useQuery({
    queryKey: QUERY_KEY(tenantId || ''),
    enabled: !!tenantId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_categories')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as VehicleCategory[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`vehicle-categories-${tenantId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_categories',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY(tenantId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const data = useMemo(() => {
    const all = query.data || [];
    return activeOnly ? all.filter((c) => c.is_active) : all;
  }, [query.data, activeOnly]);

  return { ...query, data };
}
