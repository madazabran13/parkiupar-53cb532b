// Edge Function: monthly-subscriptions
// CRUD de mensualidades con validación de solapamiento por placa/cliente.
//
// Rutas:
//   GET    /monthly-subscriptions          → suscripciones (filtrar ?active=true)
//   POST   /monthly-subscriptions          → crear (valida no solapamiento)
//   PUT    /monthly-subscriptions/:id      → actualizar
//   DELETE /monthly-subscriptions/:id      → cancelar (soft: is_active=false)

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant, requireRole } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

interface SubscriptionBody {
  customer_id?: string | null;
  vehicle_id?: string | null;
  plate: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  amount: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  notes?: string | null;
}

function parsePath(url: URL): { id: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "monthly-subscriptions");
  return { id: idx === -1 ? null : parts[idx + 1] ?? null };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    const url = new URL(req.url);
    const { id } = parsePath(url);

    if (req.method === "GET" && !id) return await list(ctx, tenantId, url);
    if (req.method === "POST" && !id) {
      requireRole(ctx, ["superadmin", "admin"]);
      return await create(ctx, tenantId, await readJson<SubscriptionBody>(req));
    }
    if (req.method === "PUT" && id) {
      requireRole(ctx, ["superadmin", "admin"]);
      return await update(ctx, tenantId, id, await readJson<Partial<SubscriptionBody>>(req));
    }
    if (req.method === "DELETE" && id) {
      requireRole(ctx, ["superadmin", "admin"]);
      return await cancel(ctx, tenantId, id);
    }
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function list(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  url: URL,
) {
  const activeOnly = url.searchParams.get("active") === "true";
  const customerId = url.searchParams.get("customer_id");
  const today = new Date().toISOString().slice(0, 10);
  let q = ctx.supabase
    .from("monthly_subscriptions")
    .select("*, customers(full_name, phone), vehicles(plate, vehicle_type)")
    .eq("tenant_id", tenantId)
    .order(customerId ? "start_date" : "end_date", { ascending: customerId ? false : true });
  if (activeOnly) q = q.eq("is_active", true).gte("end_date", today);
  if (customerId) q = q.eq("customer_id", customerId);
  const { data, error: err } = await q;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function create(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: SubscriptionBody,
) {
  if (!body?.plate || !body?.start_date || !body?.end_date || typeof body.amount !== "number") {
    throw new Error("VALIDATION: plate, start_date, end_date and amount are required");
  }
  if (body.start_date > body.end_date) {
    throw new Error("VALIDATION: start_date must be <= end_date");
  }
  const plate = body.plate.trim().toUpperCase();

  // Validar solapamiento: no debe existir otra activa con la misma placa
  // cuyo rango se cruce con [start_date, end_date].
  const { data: overlap, error: ovErr } = await ctx.supabase
    .from("monthly_subscriptions")
    .select("id, start_date, end_date")
    .eq("tenant_id", tenantId)
    .eq("plate", plate)
    .eq("is_active", true)
    .lte("start_date", body.end_date)
    .gte("end_date", body.start_date)
    .limit(1);
  if (ovErr) throw new Error(ovErr.message);
  if (overlap && overlap.length > 0) {
    throw new Error("CONFLICT: plate already has an active subscription overlapping these dates");
  }

  const { data, error: err } = await ctx.supabase
    .from("monthly_subscriptions")
    .insert({
      tenant_id: tenantId,
      customer_id: body.customer_id ?? null,
      vehicle_id: body.vehicle_id ?? null,
      plate,
      customer_name: body.customer_name ?? null,
      customer_phone: body.customer_phone ?? null,
      amount: body.amount,
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes ?? null,
      is_active: true,
    })
    .select()
    .single();
  if (err) throw new Error(err.message);
  return created(data);
}

async function update(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
  body: Partial<SubscriptionBody>,
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of [
    "customer_id",
    "vehicle_id",
    "plate",
    "customer_name",
    "customer_phone",
    "amount",
    "start_date",
    "end_date",
    "notes",
  ] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (typeof patch.plate === "string") patch.plate = (patch.plate as string).trim().toUpperCase();

  const { data, error: err } = await ctx.supabase
    .from("monthly_subscriptions")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: subscription not found");
  return ok(data);
}

async function cancel(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("monthly_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: subscription not found");
  return ok(data);
}
