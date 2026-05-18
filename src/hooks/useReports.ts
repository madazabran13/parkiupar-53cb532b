import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ReportPeriod,
  ReportSummary,
  ReportVehiclesDistribution,
} from '@/lib/types';

export function useReports(params: { period: ReportPeriod; from?: string; to?: string }) {
  const { tenantId } = useAuth();
  return useQuery<ReportSummary, ApiError>({
    queryKey: ['reports', 'summary', tenantId, params],
    queryFn: () => api.reports.get(params),
    enabled: !!tenantId,
  });
}

export function useVehicleReport(params: { from?: string; to?: string } = {}) {
  const { tenantId } = useAuth();
  return useQuery<ReportVehiclesDistribution, ApiError>({
    queryKey: ['reports', 'vehicles', tenantId, params],
    queryFn: () => api.reports.getVehicles(params),
    enabled: !!tenantId,
  });
}
