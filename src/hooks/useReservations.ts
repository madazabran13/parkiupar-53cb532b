import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Reservation, ReservationPayload } from '@/lib/types';

export function useReservations(params: { all?: boolean } = {}) {
  const { tenantId } = useAuth();
  return useQuery<Reservation[], ApiError>({
    queryKey: ['reservations', tenantId, params],
    queryFn: () => api.reservations.list(params),
    enabled: !!tenantId,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<Reservation, ApiError, ReservationPayload>({
    mutationFn: (data) => api.reservations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['capacity', tenantId] });
      toast.success('Reserva creada');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<Reservation, ApiError, { id: string; status: Reservation['status'] }>({
    mutationFn: ({ id, status }) => api.reservations.update(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['capacity', tenantId] });
      toast.success('Reserva actualizada');
    },
    onError: (err) => toast.error(err.message),
  });
}
