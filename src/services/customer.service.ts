/**
 * CustomerService — Repository for customer management.
 * Single Responsibility: customer lookup and upsert.
 */
import { supabase } from '@/integrations/supabase/client';

export const CustomerService = {
  async upsert(tenantId: string, phone: string, fullName: string): Promise<string> {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .single();

    if (existing) {
      if (fullName) {
        await supabase.from('customers').update({ full_name: fullName }).eq('id', existing.id);
      }
      return existing.id;
    }

    const { data: created } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        phone,
        full_name: fullName || 'Sin nombre',
      })
      .select('id')
      .single();
    return created?.id || '';
  },

  async searchByName(tenantId: string, query: string, limit = 5) {
    const { data } = await supabase
      .from('customers')
      .select('id, full_name, phone')
      .eq('tenant_id', tenantId)
      .ilike('full_name', `%${query}%`)
      .limit(limit);
    return data || [];
  },
} as const;
