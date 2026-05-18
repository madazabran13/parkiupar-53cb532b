import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerDetail, CustomerPayload, CustomersPage } from '@/lib/types';

export function useCustomers(params: { q?: string; page?: number; pageSize?: number } = {}) {
  const { tenantId } = useAuth();
  return useQuery<CustomersPage, ApiError>({
    queryKey: ['customers', 'list', tenantId, params],
    queryFn: () => api.customers.list(params),
    enabled: !!tenantId,
  });
}

export function useCustomerHistory(id: string | null | undefined) {
  const { tenantId } = useAuth();
  return useQuery<CustomerDetail, ApiError>({
    queryKey: ['customers', 'detail', tenantId, id],
    queryFn: () => api.customers.getHistory(id!),
    enabled: !!tenantId && !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<CustomerDetail, ApiError, CustomerPayload>({
    mutationFn: (data) => api.customers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list', tenantId] });
      toast.success('Cliente creado');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<CustomerDetail, ApiError, { id: string; data: Partial<CustomerPayload> }>({
    mutationFn: ({ id, data }) => api.customers.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', tenantId, id] });
      toast.success('Cliente actualizado');
    },
    onError: (err) => toast.error(err.message),
  });
}
