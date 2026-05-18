/**
 * TenantService — Repository for tenant profile and settings management.
 * Consume los endpoints `/me` y `/billing/plan-requests`.
 */
import { api } from '@/lib/api';
import type { UpdateProfilePayload, UpdateTenantPayload } from '@/lib/types';

export const TenantService = {
  async updateTenant(
    _tenantId: string,
    payload: UpdateTenantPayload,
  ) {
    await api.me.updateTenant(payload);
  },

  async updateProfile(_userId: string, payload: UpdateProfilePayload) {
    await api.me.updateProfile(payload);
  },

  async getCustomersByTenant(_tenantId: string) {
    return api.me.customers();
  },

  async getCustomerSubscriptions(customerId: string) {
    return api.me.customerSubscriptions(customerId);
  },

  async getPlanRequests(_tenantId: string) {
    return api.billing.planRequests();
  },

  async createPlanRequest(payload: {
    tenant_id: string;
    current_plan_id: string | null;
    requested_plan_id: string;
    message: string | null;
  }) {
    await api.billing.createPlanRequest({
      current_plan_id: payload.current_plan_id,
      requested_plan_id: payload.requested_plan_id,
      message: payload.message,
    });
  },
} as const;
