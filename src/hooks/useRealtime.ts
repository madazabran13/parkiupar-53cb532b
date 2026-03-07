import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseRealtimeOptions {
  table: string;
  schema?: string;
  filter?: string;
  queryKeys: string[][];
}

export function useRealtime({ table, schema = 'public', filter, queryKeys }: UseRealtimeOptions) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  }, [queryClient, queryKeys]);

  useEffect(() => {
    const channelConfig: Record<string, string> = {
      event: '*',
      schema,
      table,
    };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(`realtime-${table}-${filter || 'all'}`)
      .on('postgres_changes', channelConfig as any, () => {
        invalidate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, filter, invalidate]);
}
