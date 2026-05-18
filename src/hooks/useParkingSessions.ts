import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { EntryPayload, ExitPayload, ParkingSession } from '@/lib/types';

type SessionStatusFilter = 'active' | 'completed' | 'cancelled';

export function useParkingSessions(
  params: { status?: SessionStatusFilter; limit?: number } = {},
) {
  const { tenantId } = useAuth();
  return useQuery<ParkingSession[], ApiError>({
    queryKey: ['parking', 'sessions', tenantId, params],
    queryFn: () => api.parking.getSessions(params),
    enabled: !!tenantId,
  });
}

export function useParkingSession(id: string | null | undefined) {
  const { tenantId } = useAuth();
  return useQuery<ParkingSession, ApiError>({
    queryKey: ['parking', 'session', tenantId, id],
    queryFn: () => api.parking.getSession(id!),
    enabled: !!tenantId && !!id,
  });
}

function invalidateParking(queryClient: ReturnType<typeof useQueryClient>, tenantId: string | null) {
  queryClient.invalidateQueries({ queryKey: ['parking', 'sessions', tenantId] });
  queryClient.invalidateQueries({ queryKey: ['capacity', tenantId] });
  queryClient.invalidateQueries({ queryKey: ['reports', tenantId] });
}

export function useRegisterEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<ParkingSession, ApiError, EntryPayload>({
    mutationFn: (data) => api.parking.registerEntry(data),
    onSuccess: () => {
      invalidateParking(queryClient, tenantId);
      toast.success('Entrada registrada');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useRegisterExit() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<ParkingSession, ApiError, { id: string; data?: ExitPayload }>({
    mutationFn: ({ id, data }) => api.parking.registerExit(id, data),
    onSuccess: () => {
      invalidateParking(queryClient, tenantId);
      toast.success('Salida registrada');
    },
    onError: (err) => toast.error(err.message),
  });
}
