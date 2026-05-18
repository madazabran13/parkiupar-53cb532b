// Edge Function: billing
// Gestión de planes, pagos del software (no de parqueo), categorías de vehículo,
// pagos de mensualidades y solicitudes de cambio de plan.
//
// Rutas:
//   GET    /billing/tenants                          → tenants + plan (superadmin: todos)
//   GET    /billing/payments                         → payment_history (superadmin: todos)
//   POST   /billing/payments                         → registrar pago + renovar plan { tenant_id, plan_id, plan_name, amount, months, payment_method }
//   GET    /billing/plans?active=true                → planes (active=true → solo activos)
//   GET    /billing/plans/:id/max-users              → max_users del plan
//   GET    /billing/categories                       → vehicle_categories del tenant
//   POST   /billing/categories                       → crear categoría
//   PUT    /billing/categories/:id                   → actualizar
//   PUT    /billing/categories/:id/toggle            → toggle is_active { is_active }
//   DELETE /billing/categories/:id                   → eliminar
//   GET    /billing/subscription-payments/:subId     → pagos de una mensualidad
//   POST   /billing/subscription-payments            → registrar pago de mensualidad
//   GET    /billing/plan-requests                    → solicitudes del tenant
//   POST   /billing/plan-requests                    → crear solicitud

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireRole, requireTenant, isSuperadmin } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "billing");
    const seg1 = parts[idx + 1] ?? null;
    const seg2 = parts[idx + 2] ?? null;
    const seg3 = parts[idx + 3] ?? null;

    // tenants
    if (req.method === "GET" && seg1 === "tenants") return await listTenants(ctx);

    // payments (renovaciones del software)
    if (req.method === "GET" && seg1 === "payments") return await listPayments(ctx);
    if (req.method === "POST" && seg1 === "payments") {
      requireRole(ctx, ["admin", "superadmin"]);
      return await renewPlan(ctx, await readJson(req));
    }

    // plans
    if (req.method === "GET" && seg1 === "plans" && !seg2) {
      const active = url.searchParams.get("active") !== "false";
      return await listPlans(ctx, active);
    }
    if (req.method === "GET" && seg1 === "plans" && seg2 && seg3 === "max-users") {
      return await getPlanMaxUsers(ctx, seg2);
    }

    // categories
    if (req.method === "GET" && seg1 === "categories") return await listCategories(ctx);
    if (req.method === "POST" && seg1 === "categories") {
      requireRole(ctx, ["admin", "superadmin"]);
      return await createCategory(ctx, await readJson(req));
    }
    if (req.method === "PUT" && seg1 === "categories" && seg2 && !seg3) {
      requireRole(ctx, ["admin", "superadmin"]);
      return await updateCategory(ctx, seg2, await readJson(req));
    }
    if (req.method === "PUT" && seg1 === "categories" && seg2 && seg3 === "toggle") {
      requireRole(ctx, ["admin", "superadmin"]);
      return await toggleCategory(ctx, seg2, await readJson(req));
    }
    if (req.method === "DELETE" && seg1 === "categories" && seg2) {
      requireRole(ctx, ["admin", "superadmin"]);
      return await deleteCategory(ctx, seg2);
    }

    // subscription-payments
    if (req.method === "GET" && seg1 === "subscription-payments" && seg2) {
      return await listSubscriptionPayments(ctx, seg2);
    }
    if (req.method === "POST" && seg1 === "subscription-payments") {
      requireRole(ctx, ["admin", "superadmin"]);
      return await createSubscriptionPayment(ctx, await readJson(req));
    }

    // plan-requests
    if (req.method === "GET" && seg1 === "plan-requests") return await listPlanRequests(ctx);
    if (req.method === "POST" && seg1 === "plan-requests") {
      return await createPlanRequest(ctx, await readJson(req));
    }

    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

// ── tenants ────────────────────────────────────────────────────────────────
async function listTenants(ctx: Awaited<ReturnType<typeof authenticate>>) {
  let query = ctx.supabase
    .from("tenants")
    .select(
      "id, name, slug, plan_id, plan_started_at, plan_expires_at, is_active, city, address, phone, email, plans(id, name, price_monthly)",
    )
    .eq("is_active", true)
    .order("plan_expires_at", { ascending: true, nullsFirst: false });
  if (!isSuperadmin(ctx) && ctx.tenantId) query = query.eq("id", ctx.tenantId);
  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

// ── payment_history ────────────────────────────────────────────────────────
async function listPayments(ctx: Awaited<ReturnType<typeof authenticate>>) {
  let query = ctx.supabase
    .from("payment_history")
    .select(
      "id, tenant_id, plan_name, amount, months, previous_expires_at, new_expires_at, payment_method, notes, created_at, tenants(name)",
    )
    .order("created_at", { ascending: false });
  if (!isSuperadmin(ctx) && ctx.tenantId) query = query.eq("tenant_id", ctx.tenantId);
  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

interface RenewBody {
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  months: number;
  payment_method: string;
  notes?: string;
}

async function renewPlan(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  body: RenewBody,
) {
  if (!body?.tenant_id || !body?.plan_id || !body?.months) {
    throw new Error("VALIDATION: tenant_id, plan_id and months are required");
  }
  if (!isSuperadmin(ctx) && body.tenant_id !== ctx.tenantId) {
    throw new Error("FORBIDDEN: cross-tenant renewal denied");
  }

  const { data: tenant, error: terr } = await ctx.supabase
    .from("tenants")
    .select("plan_expires_at")
    .eq("id", body.tenant_id)
    .maybeSingle();
  if (terr) throw new Error(terr.message);
  if (!tenant) throw new Error("NOT_FOUND: tenant not found");

  const now = new Date();
  const baseDate = tenant.plan_expires_at && new Date(tenant.plan_expires_at) > now
    ? new Date(tenant.plan_expires_at)
    : now;
  const newExpires = new Date(baseDate);
  newExpires.setMonth(newExpires.getMonth() + body.months);

  const { error: uerr } = await ctx.supabase
    .from("tenants")
    .update({
      plan_id: body.plan_id,
      plan_started_at: now.toISOString(),
      plan_expires_at: newExpires.toISOString(),
    })
    .eq("id", body.tenant_id);
  if (uerr) throw new Error(uerr.message);

  const { data: row, error: ierr } = await ctx.supabase
    .from("payment_history")
    .insert({
      tenant_id: body.tenant_id,
      plan_id: body.plan_id,
      plan_name: body.plan_name,
      amount: body.amount,
      months: body.months,
      previous_expires_at: tenant.plan_expires_at,
      new_expires_at: newExpires.toISOString(),
      payment_method: body.payment_method,
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (ierr) throw new Error(ierr.message);
  return created(row);
}

// ── plans ──────────────────────────────────────────────────────────────────
async function listPlans(ctx: Awaited<ReturnType<typeof authenticate>>, active: boolean) {
  let query = ctx.supabase.from("plans").select("*").order("price_monthly");
  if (active) query = query.eq("is_active", true);
  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function getPlanMaxUsers(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  planId: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("plans")
    .select("max_users")
    .eq("id", planId)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: plan not found");
  return ok(data);
}

// ── vehicle_categories ─────────────────────────────────────────────────────
async function listCategories(ctx: Awaited<ReturnType<typeof authenticate>>) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("vehicle_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function createCategory(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  body: Record<string, unknown>,
) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("vehicle_categories")
    .insert({ ...body, tenant_id: tenantId })
    .select()
    .single();
  if (err) throw new Error(err.message);
  return created(data);
}

async function updateCategory(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  id: string,
  body: Record<string, unknown>,
) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("vehicle_categories")
    .update(body)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: category not found");
  return ok(data);
}

async function toggleCategory(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  id: string,
  body: { is_active: boolean },
) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("vehicle_categories")
    .update({ is_active: body.is_active })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: category not found");
  return ok(data);
}

async function deleteCategory(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  id: string,
) {
  const tenantId = requireTenant(ctx);
  const { error: err } = await ctx.supabase
    .from("vehicle_categories")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (err) throw new Error(err.message);
  return ok({ deleted: true });
}

// ── subscription_payments ──────────────────────────────────────────────────
async function listSubscriptionPayments(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  subscriptionId: string,
) {
  const tenantId = requireTenant(ctx);
  const { data: sub, error: serr } = await ctx.supabase
    .from("monthly_subscriptions")
    .select("id, tenant_id")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (serr) throw new Error(serr.message);
  if (!sub) throw new Error("NOT_FOUND: subscription not found");
  if (!isSuperadmin(ctx) && sub.tenant_id !== tenantId) {
    throw new Error("FORBIDDEN: cross-tenant access denied");
  }

  const { data, error: err } = await ctx.supabase
    .from("subscription_payments")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("payment_date", { ascending: false });
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function createSubscriptionPayment(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  body: Record<string, unknown>,
) {
  if (!body?.subscription_id) {
    throw new Error("VALIDATION: subscription_id is required");
  }
  const { data, error: err } = await ctx.supabase
    .from("subscription_payments")
    .insert(body)
    .select()
    .single();
  if (err) throw new Error(err.message);
  return created(data);
}

// ── plan_requests ──────────────────────────────────────────────────────────
async function listPlanRequests(ctx: Awaited<ReturnType<typeof authenticate>>) {
  const tenantId = requireTenant(ctx);
  const { data, error: err } = await ctx.supabase
    .from("plan_requests")
    .select(
      "*, requested_plan:plans!plan_requests_requested_plan_id_fkey(name, price_monthly)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

interface PlanRequestBody {
  current_plan_id: string | null;
  requested_plan_id: string;
  message?: string | null;
}

async function createPlanRequest(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  body: PlanRequestBody,
) {
  const tenantId = requireTenant(ctx);
  if (!body?.requested_plan_id) {
    throw new Error("VALIDATION: requested_plan_id is required");
  }
  const { data, error: err } = await ctx.supabase
    .from("plan_requests")
    .insert({
      tenant_id: tenantId,
      current_plan_id: body.current_plan_id ?? null,
      requested_plan_id: body.requested_plan_id,
      message: body.message ?? null,
    })
    .select()
    .single();
  if (err) throw new Error(err.message);
  return created(data);
}
