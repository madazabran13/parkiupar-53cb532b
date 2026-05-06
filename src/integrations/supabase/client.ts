import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function showConfigErrorOverlay() {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:560px;margin:4rem auto;text-align:center;line-height:1.5">' +
    '<h1 style="color:#b91c1c">Configuración incompleta</h1>' +
    '<p>Faltan las variables de entorno <code>VITE_SUPABASE_URL</code> y/o <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.</p>' +
    '<p style="color:#6b7280;font-size:0.9rem">Define ambas en Vercel → Project Settings → Environment Variables y vuelve a desplegar sin caché.</p>' +
    '</div>';
}

function buildClient(): SupabaseClient<Database> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    showConfigErrorOverlay();
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = buildClient();
