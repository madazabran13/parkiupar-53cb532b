/**
 * BillingService — Repository for payments, subscriptions, and vehicle categories.
 * Single Responsibility: billing operations and payment history.
 */
import { supabase } from '@/integrations/supabase/client';

export const BillingService = {
  // ── Payments / Tenants ──
  async getTenantsWithPlans(isSuperadmin: boolean, tenantId?: string) {
    let query = supabase
      .from('tenants')
      .select('id, name, slug, plan_id, plan_started_at, plan_expires_at, is_active, city, address, phone, email, plans(id, name, price_monthly)')
      .eq('is_active', true)
      .order('plan_expires_at', { ascending: true, nullsFirst: false });
    if (!isSuperadmin && tenantId) query = query.eq('id', tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getPaymentHistory(isSuperadmin: boolean, tenantId?: string) {
    let query = supabase
      .from('payment_history')
      .select('id, tenant_id, plan_name, amount, months, previous_expires_at, new_expires_at, payment_method, notes, created_at, tenants(name)')
      .order('created_at', { ascending: false });
    if (!isSuperadmin && tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async renewTenantPlan(tenantId: string, planId: string, planStartedAt: string, planExpiresAt: string) {
    const { error } = await supabase.from('tenants').update({
      plan_id: planId,
      plan_started_at: planStartedAt,
      plan_expires_at: planExpiresAt,
    }).eq('id', tenantId);
    if (error) throw error;
  },

  async insertPaymentHistory(record: {
    tenant_id: string; plan_id: string; plan_name: string; amount: number;
    months: number; previous_expires_at: string | null; new_expires_at: string; payment_method: string;
  }) {
    const { error } = await supabase.from('payment_history').insert(record);
    if (error) console.error('Payment history insert error:', error);
  },

  // ── Vehicle Categories (Rates) ──
  async getCategories(tenantId: string) {
    const { data } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    return data || [];
  },

  async saveCategory(id: string | null, payload: any) {
    if (id) {
      const { error } = await supabase.from('vehicle_categories').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('vehicle_categories').insert(payload);
      if (error) throw error;
    }
  },

  async toggleCategory(id: string, isActive: boolean) {
    const { error } = await supabase.from('vehicle_categories').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from('vehicle_categories').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Monthly Subscriptions ──
  async getSubscriptions(tenantId: string) {
    const { data } = await supabase
      .from('monthly_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async createSubscription(payload: any) {
    const { error } = await supabase.from('monthly_subscriptions').insert(payload);
    if (error) throw error;
  },

  async updateSubscription(id: string, payload: any) {
    const { error } = await supabase.from('monthly_subscriptions').update(payload).eq('id', id);
    if (error) throw error;
  },

  async cancelSubscription(id: string) {
    const { error } = await supabase.from('monthly_subscriptions').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  },

  // ── Subscription Payments ──
  async getSubscriptionPayments(subscriptionId: string) {
    const { data } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('payment_date', { ascending: false });
    return data || [];
  },

  async createSubscriptionPayment(payload: any) {
    const { data, error } = await supabase
      .from('subscription_payments')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Plans ──
  async getActivePlans() {
    const { data } = await supabase.from('plans').select('id, name, price_monthly, max_spaces').eq('is_active', true).order('price_monthly');
    return data || [];
  },

  async getAllActivePlans() {
    const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('price_monthly');
    return data || [];
  },

  async getPlanMaxUsers(planId: string) {
    const { data } = await supabase.from('plans').select('max_users').eq('id', planId).single();
    return data;
  },
} as const;
