/**
 * TeamService — Repository for team/user management via Edge Functions.
 * Single Responsibility: user CRUD operations through the manage-users function.
 */
import { supabase } from '@/integrations/supabase/client';

export const TeamService = {
  async listUsers() {
    const { data, error } = await supabase.functions.invoke('manage-users', { body: { action: 'list' } });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data.users || [];
  },

  async createUser(payload: {
    email: string; password: string; full_name: string;
    role: string; modules: string[] | null;
  }) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'create', ...payload },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data;
  },

  async updateRole(userId: string, role: string) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update_role', user_id: userId, role },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
  },

  async updateModules(userId: string, modules: string[] | null) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update_modules', user_id: userId, modules },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
  },

  async toggleActive(userId: string, isActive: boolean) {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'toggle_active', user_id: userId, is_active: isActive },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
  },
} as const;
