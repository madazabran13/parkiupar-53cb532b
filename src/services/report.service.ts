/**
 * ReportService — Repository for reports and audit logs.
 * Consume los endpoints `/parking` (completed) y `/audit-logs`.
 */
import { api } from '@/lib/api';

export const ReportService = {
  async getCompletedSessions(_tenantId: string, from: string, to: string) {
    return api.parking.getSessions({ status: 'completed', from, to, limit: 500 });
  },

  async getAuditLogs(params: {
    tableFilter: string;
    actionFilter: string;
    search: string;
    page: number;
    pageSize: number;
  }) {
    const res = await api.auditLogs.list({
      table: params.tableFilter,
      action: params.actionFilter,
      q: params.search,
      page: params.page,
      pageSize: params.pageSize,
    });
    return { logs: res.items, total: res.total };
  },

  async getAllAuditLogsForExport(params: {
    tableFilter: string;
    actionFilter: string;
    search: string;
  }) {
    return api.auditLogs.exportAll({
      table: params.tableFilter,
      action: params.actionFilter,
      q: params.search,
    });
  },
} as const;
