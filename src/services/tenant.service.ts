/**
 * TenantService — Repository for tenant profile and settings management.
 * Single Responsibility: tenant updates, profile updates, plan requests.
 */
import { supabase } from '@/integrations/supabase/client';

export const TenantService = {
  async updateTenant(tenantId: string, payload: {
    name: string; address: string | null; phone: string | null;
    email: string | null; latitude: number | null; longitude: number | null;
  }) {
    const { error } = await supabase.from('tenants').update(payload).eq('id', tenantId);
    if (error) throw error;
  },

  async updateProfile(userId: string, payload: { full_name: string; phone: string | null }) {
    const { error } = await supabase.from('user_profiles').update(payload).eq('id', userId);
    if (error) throw error;
  },

  async getCustomersByTenant(tenantId: string) {
    const { data } = await supabase.from('customers').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    return data || [];
  },

  async getCustomerSessions(customerId: string) {
    const { data } = await supabase.from('parking_sessions').select('*').eq('customer_id', customerId).order('entry_time', { ascending: false });
    return data || [];
  },

  async getCustomerSubscriptions(customerId: string) {
    const { data } = await supabase.from('monthly_subscriptions').select('*').eq('customer_id', customerId).order('start_date', { ascending: false });
    return data || [];
  },

  async getPlanRequests(tenantId: string) {
    const { data } = await supabase
      .from('plan_requests')
      .select('*, requested_plan:plans!plan_requests_requested_plan_id_fkey(name, price_monthly)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async createPlanRequest(payload: {
    tenant_id: string; current_plan_id: string | null;
    requested_plan_id: string; message: string | null;
  }) {
    const { error } = await supabase.from('plan_requests').insert(payload);
    if (error) throw error;
  },
} as const;
