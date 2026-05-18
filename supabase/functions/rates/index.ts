// Edge Function: rates
// Gestiona las tarifas por tipo de vehículo del tenant.
// Solo una tarifa activa por tipo de vehículo a la vez.
//
// Rutas:
//   GET    /rates              → tarifas activas del tenant
//   POST   /rates              → crear (desactiva automáticamente la anterior del mismo tipo)
//   PUT    /rates/:id          → actualizar tarifa
//   DELETE /rates/:id          → desactivar (soft delete: is_active=false)

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant, requireRole } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

type VehicleType = "car" | "motorcycle" | "truck" | "bicycle";

interface RateBody {
  vehicle_type: VehicleType;
  rate_per_hour: number;
  minimum_minutes?: number;
  fraction_minutes?: number;
  is_active?: boolean;
}

function parsePath(url: URL): { id: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "rates");
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
      return await create(ctx, tenantId, await readJson<RateBody>(req));
    }
    if (req.method === "PUT" && id) {
      requireRole(ctx, ["superadmin", "admin"]);
      return await update(ctx, tenantId, id, await readJson<Partial<RateBody>>(req));
    }
    if (req.method === "DELETE" && id) {
      requireRole(ctx, ["superadmin", "admin"]);
      return await deactivate(ctx, tenantId, id);
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
  const includeInactive = url.searchParams.get("all") === "true";
  let q = ctx.supabase
    .from("vehicle_rates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("vehicle_type");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error: err } = await q;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function create(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: RateBody,
) {
  if (!body?.vehicle_type || typeof body.rate_per_hour !== "number") {
    throw new Error("VALIDATION: vehicle_type and rate_per_hour are required");
  }

  // Desactivar tarifas anteriores del mismo tipo (una activa por tipo)
  await ctx.supabase
    .from("vehicle_rates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("vehicle_type", body.vehicle_type)
    .eq("is_active", true);

  const { data, error: err } = await ctx.supabase
    .from("vehicle_rates")
    .insert({
      tenant_id: tenantId,
      vehicle_type: body.vehicle_type,
      rate_per_hour: body.rate_per_hour,
      minimum_minutes: body.minimum_minutes ?? 15,
      fraction_minutes: body.fraction_minutes ?? 15,
      is_active: body.is_active ?? true,
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
  body: Partial<RateBody>,
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.rate_per_hour !== undefined) patch.rate_per_hour = body.rate_per_hour;
  if (body.minimum_minutes !== undefined) patch.minimum_minutes = body.minimum_minutes;
  if (body.fraction_minutes !== undefined) patch.fraction_minutes = body.fraction_minutes;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.vehicle_type !== undefined) patch.vehicle_type = body.vehicle_type;

  // Si se activa esta tarifa, desactivar las otras del mismo tipo
  if (body.is_active === true && body.vehicle_type) {
    await ctx.supabase
      .from("vehicle_rates")
      .update({ is_active: false })
      .eq("tenant_id", tenantId)
      .eq("vehicle_type", body.vehicle_type)
      .neq("id", id);
  }

  const { data, error: err } = await ctx.supabase
    .from("vehicle_rates")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: rate not found");
  return ok(data);
}

async function deactivate(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("vehicle_rates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: rate not found");
  return ok(data);
}
