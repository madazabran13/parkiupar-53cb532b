import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CapacityState } from '@/lib/types';

export function useCapacity() {
  const { tenantId } = useAuth();
  return useQuery<CapacityState, ApiError>({
    queryKey: ['capacity', tenantId],
    queryFn: () => api.capacity.get(),
    enabled: !!tenantId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
