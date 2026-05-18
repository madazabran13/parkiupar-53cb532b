import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ParkingSession,
  PaymentRecordPayload,
  PaymentsList,
} from '@/lib/types';

type PaymentFilters = {
  from?: string;
  to?: string;
  type?: 'all' | 'parking' | 'subscription';
  limit?: number;
};

export function usePayments(filters: PaymentFilters = {}) {
  const { tenantId } = useAuth();
  return useQuery<PaymentsList, ApiError>({
    queryKey: ['payments', 'list', tenantId, filters],
    queryFn: () => api.payments.list(filters),
    enabled: !!tenantId,
  });
}

export function usePaymentBySession(sessionId: string | null | undefined) {
  const { tenantId } = useAuth();
  return useQuery<ParkingSession, ApiError>({
    queryKey: ['payments', 'session', tenantId, sessionId],
    queryFn: () => api.payments.getBySession(sessionId!),
    enabled: !!tenantId && !!sessionId,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<ParkingSession, ApiError, PaymentRecordPayload>({
    mutationFn: (data) => api.payments.record(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'list', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['parking', 'sessions', tenantId] });
      toast.success('Pago registrado');
    },
    onError: (err) => toast.error(err.message),
  });
}
