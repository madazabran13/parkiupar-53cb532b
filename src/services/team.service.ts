/**
 * TeamService — Repository for team/user management.
 *
 * Consume el endpoint `/team` documentado en Edge Functions. El antiguo flujo
 * `manage-users` queda deprecado. La firma pública se conserva para no romper
 * a los consumidores.
 */
import { api } from '@/lib/api';
import type { AppRole } from '@/types';

export const TeamService = {
  async listUsers() {
    return api.team.list();
  },

  async createUser(payload: {
    email: string; password: string; full_name: string;
    role: string; modules: string[] | null;
  }) {
    const created = await api.team.invite({
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name,
      role: payload.role as 'admin' | 'conductor',
    });

    // El endpoint POST no acepta `user_modules`; lo aplicamos en un PUT posterior.
    if (payload.modules) {
      await api.team.update(created.id, { user_modules: payload.modules });
    }
    return created;
  },

  async updateRole(userId: string, role: string) {
    await api.team.updateRole(userId, role as Exclude<AppRole, 'superadmin'>);
  },

  async updateModules(userId: string, modules: string[] | null) {
    await api.team.update(userId, { user_modules: modules ?? [] });
  },

  async toggleActive(userId: string, isActive: boolean) {
    await api.team.update(userId, { is_active: isActive });
  },
} as const;
