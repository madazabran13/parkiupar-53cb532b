/**
 * env — configuracion central del frontend.
 *
 * Valores embebidos en el bundle al hacer `vite build`. La PUBLISHABLE_KEY
 * (anon) de Supabase esta disenada para ser publica: la seguridad real
 * proviene de las politicas RLS del backend, no de ocultar esta llave.
 *
 * Para cambiar de proyecto o entorno, edita este archivo y recompila.
 */

export const SUPABASE_PROJECT_ID = 'xqgwetpzuslklycflebu';

export const SUPABASE_URL = 'https://xqgwetpzuslklycflebu.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZ3dldHB6dXNsa2x5Y2ZsZWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTg3MTQsImV4cCI6MjA4ODQzNDcxNH0.RCPe6oeIkulav9GjOzMYDJHSFyxuZJHAp2hyVSz-C2Y';
