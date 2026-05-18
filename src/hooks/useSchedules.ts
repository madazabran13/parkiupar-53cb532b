import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { SchedulePayload, TenantSchedule } from '@/lib/types';

export function useSchedules() {
  const { tenantId } = useAuth();
  return useQuery<TenantSchedule[], ApiError>({
    queryKey: ['schedules', tenantId],
    queryFn: () => api.schedules.get(),
    enabled: !!tenantId,
  });
}

export function useUpdateSchedules() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<TenantSchedule[], ApiError, SchedulePayload[]>({
    mutationFn: (schedules) => api.schedules.update(schedules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', tenantId] });
      toast.success('Horarios actualizados');
    },
    onError: (err) => toast.error(err.message),
  });
}
