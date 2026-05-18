// Edge Function: vehicles
// Gestión de vehículos del tenant.
//
// Rutas:
//   GET    /vehicles?plate=ABC123          → buscar por placa (con join al cliente)
//   POST   /vehicles                        → upsert (idempotente por placa) { plate, vehicle_type, customer_id? }
//   GET    /vehicles/rates?active=true     → tarifas activas por tipo
//   GET    /vehicles/categories?active=true → categorías activas

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

type VehicleType = "car" | "motorcycle" | "truck" | "bicycle";

interface UpsertBody {
  plate: string;
  vehicle_type: VehicleType;
  customer_id?: string | null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "vehicles");
    const seg1 = parts[idx + 1] ?? null;

    if (req.method === "GET" && !seg1) {
      const plate = url.searchParams.get("plate");
      if (!plate) throw new Error("VALIDATION: plate query param is required");
      return await findByPlate(ctx, tenantId, plate);
    }
    if (req.method === "GET" && seg1 === "rates") {
      const active = url.searchParams.get("active") !== "false";
      return await getRates(ctx, tenantId, active);
    }
    if (req.method === "GET" && seg1 === "categories") {
      const active = url.searchParams.get("active") !== "false";
      return await getCategories(ctx, tenantId, active);
    }
    if (req.method === "POST" && !seg1) {
      return await upsert(ctx, tenantId, await readJson<UpsertBody>(req));
    }
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function findByPlate(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  plate: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("vehicles")
    .select("*, customers:customer_id(full_name, phone)")
    .eq("tenant_id", tenantId)
    .eq("plate", plate.toUpperCase())
    .maybeSingle();
  if (err) throw new Error(err.message);
  return ok(data ?? null);
}

async function upsert(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: UpsertBody,
) {
  if (!body?.plate || !body?.vehicle_type) {
    throw new Error("VALIDATION: plate and vehicle_type are required");
  }
  const plate = body.plate.toUpperCase();

  const { data: existing, error: err1 } = await ctx.supabase
    .from("vehicles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("plate", plate)
    .maybeSingle();
  if (err1) throw new Error(err1.message);
  if (existing) return ok({ id: existing.id });

  const { data: createdRow, error: err2 } = await ctx.supabase
    .from("vehicles")
    .insert({
      tenant_id: tenantId,
      plate,
      vehicle_type: body.vehicle_type,
      customer_id: body.customer_id ?? null,
    })
    .select("id")
    .single();
  if (err2) throw new Error(err2.message);
  return created({ id: createdRow.id });
}

async function getRates(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  active: boolean,
) {
  let query = ctx.supabase.from("vehicle_rates").select("*").eq("tenant_id", tenantId);
  if (active) query = query.eq("is_active", true);
  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function getCategories(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  active: boolean,
) {
  let query = ctx.supabase.from("vehicle_categories").select("*").eq("tenant_id", tenantId).order("name");
  if (active) query = query.eq("is_active", true);
  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}
