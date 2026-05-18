// Edge Function: me
// Datos del usuario autenticado y actualizaciones de su propio perfil/tenant.
//
// Rutas:
//   GET /me                    → user_profile + tenant
//   PUT /me                    → actualizar perfil propio { full_name, phone }
//   GET /me/tenant             → tenant + planes (alias)
//   PUT /me/tenant             → actualizar tenant (admin/superadmin)
//   GET /me/customers          → clientes del tenant (sin paginar) — uso interno
//   GET /me/customer/:id/subscriptions  → mensualidades del cliente

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant, requireRole } from "../_shared/auth.ts";
import { ok, error, handleException, readJson } from "../_shared/response.ts";

interface ProfileBody {
  full_name: string;
  phone: string | null;
}

interface TenantBody {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "me");
    const seg1 = parts[idx + 1] ?? null;
    const seg2 = parts[idx + 2] ?? null;
    const seg3 = parts[idx + 3] ?? null;

    if (req.method === "GET" && !seg1) return await getMe(ctx);
    if (req.method === "PUT" && !seg1) return await updateProfile(ctx, await readJson<ProfileBody>(req));
    if (req.method === "GET" && seg1 === "tenant") return await getTenant(ctx);
    if (req.method === "PUT" && seg1 === "tenant") {
      requireRole(ctx, ["admin", "superadmin"]);
      return await updateTenant(ctx, await readJson<TenantBody>(req));
    }
    if (req.method === "GET" && seg1 === "customers") return await listCustomers(ctx);
    if (req.method === "GET" && seg1 === "customer" && seg2 && seg3 === "subscriptions") {
      return await getCustomerSubscriptions(ctx, seg2);
    }
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function getMe(ctx: Awaited<ReturnType<typeof authenticate>>) {
  const { data: profile, error: err1 } = await ctx.supabase
    .from("user_profiles")
    .select("*")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (err1) throw new Error(err1.message);
  if (!profile) throw new Error("NOT_FOUND: profile not found");

  let tenant = null;
  if (ctx.tenantId) {
    const { data: t, error: err2 } = await ctx.supabase
      .from("tenants")
      .select("*, plans(modules, max_spaces)")
      .eq("id", ctx.tenantId)
      .maybeSingle();
    if (err2) throw new Error(err2.message);
    tenant = t ?? null;
  }
  return ok({ profile, tenant });
}

async function updateProfile(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  body: ProfileBody,
) {
  if (!body?.full_name) throw new Error("VALIDATION: full_name is required");
  const { data, error: err } = await ctx.supabase
    .from("user_profiles")
    .update({ full_name: body.full_name, phone: body.phone })
    .eq("id", ctx.userId)
    .select()
    .single();
  if (err) throw new Error(err.message);
  return ok(data);
}

async function getTenant(ctx: Awaited<ReturnType<typeof authenticate>>) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("tenants")
    .select("*, plans(modules, max_spaces)")
    .eq("id", tenantId)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: tenant not found");
  return ok(data);
}

async function updateTenant(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  body: TenantBody,
) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("tenants")
    .update({
      name: body.name,
      address: body.address,
      phone: body.phone,
      email: body.email,
      latitude: body.latitude,
      longitude: body.longitude,
    })
    .eq("id", tenantId)
    .select()
    .single();
  if (err) throw new Error(err.message);
  return ok(data);
}

async function listCustomers(ctx: Awaited<ReturnType<typeof authenticate>>) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function getCustomerSubscriptions(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  customerId: string,
) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("monthly_subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .order("start_date", { ascending: false });
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}
