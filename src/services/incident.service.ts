/**
 * IncidentService — Repository for incident reports.
 * Consume `/incidents` Edge Function vía `@/lib/api`.
 * Los campos `user_id`, `user_name` y `tenant_id` los infiere el endpoint del JWT.
 */
import { api } from '@/lib/api';
import type { IncidentCategory, IncidentStatus } from '@/lib/types';

export const IncidentService = {
  async getAll() {
    return api.incidents.list();
  },

  async create(payload: {
    user_id: string; user_name: string; tenant_id: string | null;
    title: string; description: string; category: string;
  }) {
    await api.incidents.create({
      title: payload.title,
      description: payload.description,
      category: payload.category as IncidentCategory,
    });
  },

  async updateStatus(id: string, status: string, adminNotes?: string) {
    await api.incidents.update(id, {
      status: status as IncidentStatus,
      ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
    });
  },
} as const;
