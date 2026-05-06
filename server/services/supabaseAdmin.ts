import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(url: string, serviceRoleKey: string): SupabaseClient {
  if (cached) return cached;
  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-gateway-origin': 'parkiupar-bff' } },
  });
  return cached;
}
