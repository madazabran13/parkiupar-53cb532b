import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { TeamInvitePayload, TeamMember, TeamUpdatePayload } from '@/lib/types';

export function useTeam() {
  const { tenantId } = useAuth();
  return useQuery<TeamMember[], ApiError>({
    queryKey: ['team', tenantId],
    queryFn: () => api.team.list(),
    enabled: !!tenantId,
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<TeamMember, ApiError, TeamInvitePayload>({
    mutationFn: (data) => api.team.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', tenantId] });
      toast.success('Miembro agregado');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<TeamMember, ApiError, { id: string; data: TeamUpdatePayload }>({
    mutationFn: ({ id, data }) => api.team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', tenantId] });
      toast.success('Miembro actualizado');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateTeamRole() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<TeamMember, ApiError, { id: string; role: TeamUpdatePayload['role'] }>({
    mutationFn: ({ id, role }) => api.team.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', tenantId] });
      toast.success('Rol actualizado');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  return useMutation<TeamMember, ApiError, string>({
    mutationFn: (id) => api.team.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', tenantId] });
      toast.success('Miembro desactivado');
    },
    onError: (err) => toast.error(err.message),
  });
}
