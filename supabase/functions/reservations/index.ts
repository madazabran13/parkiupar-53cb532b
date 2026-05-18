// Edge Function: reservations
// Reservas de espacios (space_reservations) — activas y futuras + cambios de estado.
//
// Rutas:
//   GET    /reservations         → reservas no finalizadas
//   POST   /reservations         → crear reserva (asigna espacio disponible)
//   PUT    /reservations/:id     → confirmar / cancelar / marcar como llegada

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

interface ReservationBody {
  space_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  plate?: string | null;
  vehicle_type?: "car" | "motorcycle" | "truck" | "bicycle";
  vehicle_category_id?: string | null;
  expires_at?: string; // ISO datetime
  minutes_valid?: number; // alternativa a expires_at
}

interface ReservationUpdateBody {
  status: "confirmed" | "arrived" | "cancelled" | "completed";
}

function parsePath(url: URL): { id: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "reservations");
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
    if (req.method === "POST" && !id) return await create(ctx, tenantId, await readJson<ReservationBody>(req));
    if (req.method === "PUT" && id) return await update(ctx, tenantId, id, await readJson<ReservationUpdateBody>(req));
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
  const includeAll = url.searchParams.get("all") === "true";
  const spaceId = url.searchParams.get("space_id");
  const pendingOnly = url.searchParams.get("pending_for_space") === "true";

  let q = ctx.supabase
    .from("space_reservations")
    .select("*, parking_spaces(space_number, label)")
    .eq("tenant_id", tenantId);

  if (spaceId) q = q.eq("space_id", spaceId);

  if (pendingOnly) {
    q = q.in("status", ["pending", "confirmed"]).order("created_at", { ascending: false }).limit(1);
  } else {
    q = q.order("expires_at", { ascending: true });
    if (!includeAll) q = q.in("status", ["pending", "confirmed", "arrived"]);
  }

  const { data, error: err } = await q;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function create(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: ReservationBody,
) {
  let spaceId = body.space_id ?? null;

  // Si no se especifica espacio, intentar asignar uno disponible.
  if (!spaceId) {
    const { data: free, error: freeErr } = await ctx.supabase
      .from("parking_spaces")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "available")
      .order("space_number")
      .limit(1)
      .maybeSingle();
    if (freeErr) throw new Error(freeErr.message);
    if (!free) throw new Error("CONFLICT: no available space");
    spaceId = free.id;
  } else {
    // Verificar que el espacio esté disponible y pertenezca al tenant
    const { data: space } = await ctx.supabase
      .from("parking_spaces")
      .select("id, status, tenant_id")
      .eq("id", spaceId)
      .maybeSingle();
    if (!space) throw new Error("NOT_FOUND: space not found");
    if (space.tenant_id !== tenantId) throw new Error("FORBIDDEN: space belongs to another tenant");
    if (space.status !== "available") throw new Error("CONFLICT: space is not available");
  }

  const expiresAt =
    body.expires_at ??
    new Date(Date.now() + (body.minutes_valid ?? 30) * 60_000).toISOString();

  const reservedAt = new Date().toISOString();
  const { data: reservation, error: insErr } = await ctx.supabase
    .from("space_reservations")
    .insert({
      tenant_id: tenantId,
      space_id: spaceId,
      reserved_by: ctx.userId,
      customer_name: body.customer_name ?? null,
      customer_phone: body.customer_phone ?? null,
      plate: body.plate ?? null,
      vehicle_type: body.vehicle_type ?? "car",
      vehicle_category_id: body.vehicle_category_id ?? null,
      reserved_at: reservedAt,
      expires_at: expiresAt,
      status: "pending",
    })
    .select()
    .single();
  if (insErr) throw new Error(insErr.message);

  // Marca el espacio como reservado
  await ctx.supabase
    .from("parking_spaces")
    .update({
      status: "reserved",
      reserved_by: ctx.userId,
      reserved_at: reservedAt,
      reservation_expires_at: expiresAt,
    })
    .eq("id", spaceId);

  return created(reservation);
}

async function update(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
  body: ReservationUpdateBody,
) {
  if (!body?.status) throw new Error("VALIDATION: status is required");
  const allowed = ["confirmed", "arrived", "cancelled", "completed"];
  if (!allowed.includes(body.status)) {
    throw new Error("VALIDATION: invalid status");
  }

  const { data: res, error: getErr } = await ctx.supabase
    .from("space_reservations")
    .select("id, status, space_id, tenant_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (getErr) throw new Error(getErr.message);
  if (!res) throw new Error("NOT_FOUND: reservation not found");

  const patch: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };
  if (body.status === "confirmed") patch.confirmed_at = new Date().toISOString();

  const { data: updated, error: updErr } = await ctx.supabase
    .from("space_reservations")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (updErr) throw new Error(updErr.message);

  // Liberar el espacio si la reserva se cancela/expira/completa
  if (["cancelled", "completed"].includes(body.status) && res.space_id) {
    await ctx.supabase
      .from("parking_spaces")
      .update({
        status: "available",
        reserved_by: null,
        reserved_at: null,
        reservation_expires_at: null,
      })
      .eq("id", res.space_id);
  }

  return ok(updated);
}
