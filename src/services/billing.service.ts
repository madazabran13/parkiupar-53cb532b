/**
 * BillingService — Repository for payments, subscriptions, and vehicle categories.
 * Consume las Edge Functions `/billing` y `/monthly-subscriptions`.
 */
import { api } from '@/lib/api';
import type {
  CategoryPayload,
  SubscriptionPayload,
  SubscriptionPaymentPayload,
} from '@/lib/types';

export const BillingService = {
  // ── Payments / Tenants ──
  async getTenantsWithPlans(_isSuperadmin: boolean, _tenantId?: string) {
    return api.billing.tenants();
  },

  async getPaymentHistory(_isSuperadmin: boolean, _tenantId?: string) {
    return api.billing.payments();
  },

  async renewTenantPlan(payload: {
    tenant_id: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    months: number;
    payment_method: string;
    notes?: string;
  }) {
    await api.billing.renewPlan(payload);
  },

  // ── Vehicle Categories ──
  async getCategories(_tenantId: string) {
    return api.billing.categories();
  },

  async saveCategory(id: string | null, payload: CategoryPayload) {
    if (id) await api.billing.updateCategory(id, payload);
    else await api.billing.createCategory(payload);
  },

  async toggleCategory(id: string, isActive: boolean) {
    await api.billing.toggleCategory(id, isActive);
  },

  async deleteCategory(id: string) {
    await api.billing.deleteCategory(id);
  },

  // ── Monthly Subscriptions ──
  async getSubscriptions(_tenantId: string) {
    return api.monthlySubscriptions.list();
  },

  async createSubscription(payload: SubscriptionPayload & { tenant_id?: string }) {
    const { tenant_id: _ignored, ...body } = payload;
    await api.monthlySubscriptions.create(body);
  },

  async updateSubscription(id: string, payload: Partial<SubscriptionPayload>) {
    await api.monthlySubscriptions.update(id, payload);
  },

  async cancelSubscription(id: string) {
    await api.monthlySubscriptions.cancel(id);
  },

  // ── Subscription Payments ──
  async getSubscriptionPayments(subscriptionId: string) {
    return api.billing.subscriptionPayments(subscriptionId);
  },

  async createSubscriptionPayment(payload: SubscriptionPaymentPayload) {
    return api.billing.createSubscriptionPayment(payload);
  },

  // ── Plans ──
  async getActivePlans() {
    return api.billing.plans({ active: true });
  },

  async getAllActivePlans() {
    return api.billing.plans({ active: true });
  },

  async getPlanMaxUsers(planId: string) {
    return api.billing.planMaxUsers(planId);
  },
} as const;
