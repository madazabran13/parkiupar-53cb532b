import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Incident,
  IncidentPayload,
  IncidentStatus,
  IncidentUpdatePayload,
} from '@/lib/types';

export function useIncidents(params: { status?: IncidentStatus } = {}) {
  const { tenantId } = useAuth();
  return useQuery<Incident[], ApiError>({
    queryKey: ['incidents', tenantId, params],
    queryFn: () => api.incidents.list(params),
    enabled: !!tenantId,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<Incident, ApiError, IncidentPayload>({
    mutationFn: (data) => api.incidents.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', tenantId] });
      toast.success('Incidencia reportada');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<Incident, ApiError, { id: string; data: IncidentUpdatePayload }>({
    mutationFn: ({ id, data }) => api.incidents.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', tenantId] });
      toast.success('Incidencia actualizada');
    },
    onError: (err) => toast.error(err.message),
  });
}
