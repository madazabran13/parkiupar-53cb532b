/**
 * ReportService — Repository for reports and audit logs.
 * Single Responsibility: querying completed sessions and audit records.
 */
import { supabase } from '@/integrations/supabase/client';

export const ReportService = {
  async getCompletedSessions(tenantId: string, from: string, to: string) {
    const { data } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('exit_time', from)
      .lte('exit_time', to)
      .order('exit_time', { ascending: false });
    return data || [];
  },

  async getAuditLogs(params: {
    tableFilter: string; actionFilter: string; search: string;
    page: number; pageSize: number;
  }) {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(params.page * params.pageSize, (params.page + 1) * params.pageSize - 1);

    if (params.tableFilter !== 'all') query = query.eq('table_name', params.tableFilter);
    if (params.actionFilter !== 'all') query = query.eq('action', params.actionFilter);
    if (params.search) query = query.or(`user_name.ilike.%${params.search}%,record_id.ilike.%${params.search}%`);

    const { data, count, error } = await query;
    if (error) throw error;
    return { logs: data || [], total: count || 0 };
  },

  async getAllAuditLogsForExport(params: {
    tableFilter: string; actionFilter: string; search: string;
  }) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (params.tableFilter !== 'all') query = query.eq('table_name', params.tableFilter);
    if (params.actionFilter !== 'all') query = query.eq('action', params.actionFilter);
    if (params.search) query = query.or(`user_name.ilike.%${params.search}%,record_id.ilike.%${params.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
} as const;
