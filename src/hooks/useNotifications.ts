import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification, NotificationsList } from '@/lib/types';

export function useNotifications(params: { unread?: boolean; limit?: number } = {}) {
  const { tenantId } = useAuth();
  return useQuery<NotificationsList, ApiError>({
    queryKey: ['notifications', tenantId, params],
    queryFn: () => api.notifications.list(params),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<Notification, ApiError, string>({
    mutationFn: (id) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<{ marked: true }, ApiError, void>({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
      toast.success('Todas marcadas como leídas');
    },
    onError: (err) => toast.error(err.message),
  });
}
