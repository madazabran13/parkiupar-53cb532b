import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { RatePayload, VehicleRate } from '@/lib/types';

export function useRates(params: { all?: boolean } = {}) {
  const { tenantId } = useAuth();
  return useQuery<VehicleRate[], ApiError>({
    queryKey: ['rates', tenantId, params],
    queryFn: () => api.rates.list(params),
    enabled: !!tenantId,
  });
}

export function useCreateRate() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<VehicleRate, ApiError, RatePayload>({
    mutationFn: (data) => api.rates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', tenantId] });
      toast.success('Tarifa creada');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateRate() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<VehicleRate, ApiError, { id: string; data: Partial<RatePayload> }>({
    mutationFn: ({ id, data }) => api.rates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', tenantId] });
      toast.success('Tarifa actualizada');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteRate() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<VehicleRate, ApiError, string>({
    mutationFn: (id) => api.rates.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', tenantId] });
      toast.success('Tarifa eliminada');
    },
    onError: (err) => toast.error(err.message),
  });
}
