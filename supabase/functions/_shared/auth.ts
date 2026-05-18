// Helper de autenticación para edge functions.
// Valida el JWT del Authorization header, carga el user_profile y retorna
// { userId, tenantId, role, email, supabase } listo para usar.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export type AppRole = "superadmin" | "admin" | "conductor";

export interface AuthContext {
  userId: string;
  tenantId: string | null;
  role: AppRole;
  email: string;
  fullName: string | null;
  supabase: SupabaseClient;
}

function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function authenticate(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("UNAUTHORIZED: missing bearer token");
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new Error("UNAUTHORIZED: empty bearer token");

  const supabase = getServiceClient();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new Error("UNAUTHORIZED: invalid or expired token");
  }
  const user = userData.user;

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("tenant_id, role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`UNAUTHORIZED: profile lookup failed: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error("UNAUTHORIZED: user_profile not found");
  }
  if (!profile.is_active) {
    throw new Error("FORBIDDEN: user is inactive");
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id,
    role: profile.role as AppRole,
    email: user.email ?? "",
    fullName: profile.full_name ?? null,
    supabase,
  };
}

export function requireTenant(ctx: AuthContext): string {
  if (!ctx.tenantId) {
    throw new Error("FORBIDDEN: user is not associated with a tenant");
  }
  return ctx.tenantId;
}

export function requireRole(ctx: AuthContext, allowed: AppRole[]): void {
  if (!allowed.includes(ctx.role)) {
    throw new Error("FORBIDDEN: insufficient role");
  }
}

export function isSuperadmin(ctx: AuthContext): boolean {
  return ctx.role === "superadmin";
}

// Asegura que el tenantId destino coincide con el del usuario (salvo superadmin).
export function assertSameTenant(ctx: AuthContext, targetTenantId: string | null | undefined): void {
  if (isSuperadmin(ctx)) return;
  if (!targetTenantId || targetTenantId !== ctx.tenantId) {
    throw new Error("FORBIDDEN: cross-tenant access denied");
  }
}
