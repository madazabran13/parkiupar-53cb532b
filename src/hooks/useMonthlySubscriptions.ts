import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { MonthlySubscription, SubscriptionPayload } from '@/lib/types';

export function useMonthlySubscriptions(params: { active?: boolean } = {}) {
  const { tenantId } = useAuth();
  return useQuery<MonthlySubscription[], ApiError>({
    queryKey: ['monthlySubscriptions', tenantId, params],
    queryFn: () => api.monthlySubscriptions.list(params),
    enabled: !!tenantId,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<MonthlySubscription, ApiError, SubscriptionPayload>({
    mutationFn: (data) => api.monthlySubscriptions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlySubscriptions', tenantId] });
      toast.success('Mensualidad creada');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<
    MonthlySubscription,
    ApiError,
    { id: string; data: Partial<SubscriptionPayload> }
  >({
    mutationFn: ({ id, data }) => api.monthlySubscriptions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlySubscriptions', tenantId] });
      toast.success('Mensualidad actualizada');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<MonthlySubscription, ApiError, string>({
    mutationFn: (id) => api.monthlySubscriptions.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlySubscriptions', tenantId] });
      toast.success('Mensualidad cancelada');
    },
    onError: (err) => toast.error(err.message),
  });
}
