/**
 * IncidentService — Repository for incident reports.
 * Single Responsibility: incident CRUD and status management.
 */
import { supabase } from '@/integrations/supabase/client';

export const IncidentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(payload: {
    user_id: string; user_name: string; tenant_id: string | null;
    title: string; description: string; category: string;
  }) {
    const { error } = await supabase.from('incident_reports').insert(payload as any);
    if (error) throw error;
  },

  async updateStatus(id: string, status: string, adminNotes?: string) {
    const update: Record<string, any> = { status };
    if (adminNotes !== undefined) update.admin_notes = adminNotes;
    const { error } = await supabase.from('incident_reports').update(update).eq('id', id);
    if (error) throw error;
  },
} as const;
