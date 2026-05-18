// Edge Function: parking
// Gestiona las sesiones de parqueo: entrada, salida con cobro, listado y detalle.
//
// Rutas:
//   GET    /parking              → sesiones activas del tenant
//   GET    /parking/:id          → detalle de una sesión
//   POST   /parking              → registrar entrada
//   PUT    /parking/:id/exit     → registrar salida (calcula duración + cobro)

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

type VehicleType = "car" | "motorcycle" | "truck" | "bicycle";

interface EntryBody {
  plate: string;
  vehicle_type?: VehicleType;
  vehicle_category_id?: string | null;
  space_number?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
}

interface ExitBody {
  notes?: string | null;
}

function parsePath(url: URL): { id: string | null; action: string | null } {
  // /functions/v1/parking[/:id[/exit]]
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "parking");
  if (idx === -1) return { id: null, action: null };
  return {
    id: parts[idx + 1] ?? null,
    action: parts[idx + 2] ?? null,
  };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    const url = new URL(req.url);
    const { id, action } = parsePath(url);

    if (req.method === "GET" && id === "check-duplicate") {
      const plate = url.searchParams.get("plate");
      if (!plate) throw new Error("VALIDATION: plate query param is required");
      return await checkDuplicate(ctx, tenantId, plate);
    }
    if (req.method === "GET" && !id) return await listActive(ctx, tenantId, url);
    if (req.method === "GET" && id) return await getSession(ctx, tenantId, id);
    if (req.method === "POST" && !id) return await registerEntry(ctx, tenantId, await readJson<EntryBody>(req));
    if (req.method === "PUT" && id && action === "exit") {
      let body: ExitBody = {};
      try {
        body = await readJson<ExitBody>(req);
      } catch {
        body = {};
      }
      return await registerExit(ctx, tenantId, id, body);
    }
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function listActive(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  url: URL,
) {
  const status = url.searchParams.get("status") ?? "active";
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = ctx.supabase
    .from("parking_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", status)
    .order("entry_time", { ascending: false })
    .limit(Math.min(limit, 500));

  if (from) query = query.gte("exit_time", from);
  if (to) query = query.lte("exit_time", to);

  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function checkDuplicate(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  plate: string,
) {
  const upper = plate.toUpperCase();
  const { data } = await ctx.supabase
    .from("parking_sessions")
    .select("id, tenant_id")
    .eq("plate", upper)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return ok({ exists: false });
  return ok({
    exists: true,
    same_parking: data.tenant_id === tenantId,
    tenant_id: data.tenant_id,
  });
}

async function getSession(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("parking_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: parking session not found");
  return ok(data);
}

async function registerEntry(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: EntryBody,
) {
  if (!body?.plate || typeof body.plate !== "string") {
    throw new Error("VALIDATION: plate is required");
  }
  const plate = body.plate.trim().toUpperCase();
  const vehicleType: VehicleType = body.vehicle_type ?? "car";

  // 1) Evitar duplicados: una placa no puede tener dos sesiones activas
  const { data: existing, error: existErr } = await ctx.supabase
    .from("parking_sessions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("plate", plate)
    .eq("status", "active")
    .maybeSingle();
  if (existErr) throw new Error(existErr.message);
  if (existing) throw new Error("CONFLICT: vehicle already has an active session");

  // 2) Resolver tarifa: prioridad a vehicle_category_id, fallback a vehicle_rates por tipo
  let rate_per_hour: number | null = null;
  let fraction_minutes: number | null = null;
  let categoryId: string | null = body.vehicle_category_id ?? null;

  if (categoryId) {
    const { data: cat, error: catErr } = await ctx.supabase
      .from("vehicle_categories")
      .select("rate_per_hour, fraction_minutes")
      .eq("tenant_id", tenantId)
      .eq("id", categoryId)
      .eq("is_active", true)
      .maybeSingle();
    if (catErr) throw new Error(catErr.message);
    if (cat) {
      rate_per_hour = Number(cat.rate_per_hour);
      fraction_minutes = cat.fraction_minutes;
    }
  }
  if (rate_per_hour === null) {
    const { data: rate, error: rateErr } = await ctx.supabase
      .from("vehicle_rates")
      .select("rate_per_hour, fraction_minutes")
      .eq("tenant_id", tenantId)
      .eq("vehicle_type", vehicleType)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rateErr) throw new Error(rateErr.message);
    if (rate) {
      rate_per_hour = Number(rate.rate_per_hour);
      fraction_minutes = rate.fraction_minutes;
    }
  }

  // 3) Verificar capacidad y decrementar disponibles
  const { data: tenant, error: tenantErr } = await ctx.supabase
    .from("tenants")
    .select("available_spaces, total_spaces")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantErr) throw new Error(tenantErr.message);
  if (!tenant) throw new Error("NOT_FOUND: tenant not found");
  if ((tenant.available_spaces ?? 0) <= 0) {
    throw new Error("CONFLICT: no available spaces");
  }

  // 4) Crear la sesión
  const insertPayload = {
    tenant_id: tenantId,
    plate,
    vehicle_type: vehicleType,
    vehicle_category_id: categoryId,
    customer_id: body.customer_id ?? null,
    customer_name: body.customer_name ?? null,
    customer_phone: body.customer_phone ?? null,
    space_number: body.space_number ?? null,
    rate_per_hour,
    fraction_minutes,
    notes: body.notes ?? null,
    entry_time: new Date().toISOString(),
    status: "active" as const,
  };

  const { data: session, error: insErr } = await ctx.supabase
    .from("parking_sessions")
    .insert(insertPayload)
    .select()
    .single();
  if (insErr) throw new Error(insErr.message);

  // 5) Decrementar capacidad
  const { error: updErr } = await ctx.supabase
    .from("tenants")
    .update({ available_spaces: (tenant.available_spaces ?? 0) - 1 })
    .eq("id", tenantId);
  if (updErr) {
    // rollback de la sesión si falla el update de capacidad
    await ctx.supabase.from("parking_sessions").delete().eq("id", session.id);
    throw new Error(updErr.message);
  }

  // 6) Marcar parking_space si aplica
  if (body.space_number) {
    await ctx.supabase
      .from("parking_spaces")
      .update({ status: "occupied", session_id: session.id })
      .eq("tenant_id", tenantId)
      .eq("space_number", body.space_number);
  }

  return created(session);
}

async function registerExit(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
  body: ExitBody,
) {
  // 1) Cargar sesión activa
  const { data: session, error: sErr } = await ctx.supabase
    .from("parking_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!session) throw new Error("NOT_FOUND: parking session not found");
  if (session.status !== "active") throw new Error("CONFLICT: session is not active");

  // 2) Calcular duración y cobro
  const entryTime = new Date(session.entry_time).getTime();
  const exitTime = Date.now();
  const minutes = Math.max(1, Math.ceil((exitTime - entryTime) / 60000));
  const hours = minutes / 60;

  const ratePerHour = Number(session.rate_per_hour ?? 0);
  const fraction = Number(session.fraction_minutes ?? 60);

  // Cobro por fracciones: cantidad de fracciones * (ratePerHour / 60 * fraction)
  let totalAmount = 0;
  if (ratePerHour > 0) {
    const fractionsUsed = Math.ceil(minutes / fraction);
    const perFraction = (ratePerHour / 60) * fraction;
    totalAmount = Math.round(fractionsUsed * perFraction);
  }

  // 3) Actualizar la sesión
  const updatePayload = {
    exit_time: new Date(exitTime).toISOString(),
    hours_parked: Number(hours.toFixed(2)),
    total_amount: totalAmount,
    status: "completed" as const,
    notes: body?.notes ?? session.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data: updated, error: updErr } = await ctx.supabase
    .from("parking_sessions")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
  if (updErr) throw new Error(updErr.message);

  // 4) Incrementar capacidad
  const { data: tenant, error: tenantErr } = await ctx.supabase
    .from("tenants")
    .select("available_spaces, total_spaces")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenantErr && tenant) {
    const next = Math.min((tenant.available_spaces ?? 0) + 1, tenant.total_spaces ?? 9999);
    await ctx.supabase.from("tenants").update({ available_spaces: next }).eq("id", tenantId);
  }

  // 5) Liberar parking_space si estaba ligada
  if (session.space_number) {
    await ctx.supabase
      .from("parking_spaces")
      .update({ status: "available", session_id: null })
      .eq("tenant_id", tenantId)
      .eq("space_number", session.space_number);
  }

  // 6) Actualizar métricas del cliente
  if (session.customer_id) {
    const { data: customer } = await ctx.supabase
      .from("customers")
      .select("total_visits, total_spent")
      .eq("id", session.customer_id)
      .maybeSingle();
    if (customer) {
      await ctx.supabase
        .from("customers")
        .update({
          total_visits: (customer.total_visits ?? 0) + 1,
          total_spent: Number(customer.total_spent ?? 0) + totalAmount,
        })
        .eq("id", session.customer_id);
    }
  }

  return ok({ ...updated, duration_minutes: minutes });
}
