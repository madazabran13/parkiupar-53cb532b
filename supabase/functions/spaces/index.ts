// Edge Function: spaces
// Gestión de parking_spaces y sus transiciones de estado.
//
// Rutas:
//   GET    /spaces                          → listar espacios del tenant
//   GET    /spaces/by-number/:number        → buscar por space_number
//   POST   /spaces/bulk                     → crear N espacios desde un número inicial
//   DELETE /spaces/above?threshold=N        → borrar disponibles cuyo número > threshold
//   PUT    /spaces/:id/occupy               → marcar como ocupado
//   PUT    /spaces/:id/available            → liberar (status=available, limpia reserva)
//   PUT    /spaces/:id/reserve              → reservar { user_id?, expires_at }
//   PUT    /spaces/:id/expire-reservation   → expirar reserva (libera + marca expired)
//   PUT    /spaces/:id/confirm-reservation  → reserva → arrived (entrada del cliente)
//   PUT    /spaces/:id/cancel-reservation   → cancelar reserva y liberar espacio

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

interface BulkBody {
  start_number: number;
  count: number;
}
interface ReserveBody {
  user_id?: string | null;
  expires_at: string;
}

function parsePath(url: URL): { id: string | null; sub: string | null; action: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "spaces");
  if (idx === -1) return { id: null, sub: null, action: null };
  return {
    id: parts[idx + 1] ?? null,
    sub: parts[idx + 2] ?? null,
    action: parts[idx + 1] ?? null,
  };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "spaces");
    const seg1 = parts[idx + 1] ?? null;
    const seg2 = parts[idx + 2] ?? null;

    if (req.method === "GET" && !seg1) return await list(ctx, tenantId);
    if (req.method === "GET" && seg1 === "by-number" && seg2) {
      return await findByNumber(ctx, tenantId, seg2);
    }
    if (req.method === "POST" && seg1 === "bulk") {
      return await createBulk(ctx, tenantId, await readJson<BulkBody>(req));
    }
    if (req.method === "DELETE" && seg1 === "above") {
      const threshold = Number(url.searchParams.get("threshold") ?? "0");
      return await deleteAvailableAbove(ctx, tenantId, threshold);
    }
    if (req.method === "PUT" && seg1 && seg2 === "occupy") return await setOccupied(ctx, tenantId, seg1);
    if (req.method === "PUT" && seg1 && seg2 === "available") return await setAvailable(ctx, tenantId, seg1);
    if (req.method === "PUT" && seg1 && seg2 === "reserve") {
      return await reserve(ctx, tenantId, seg1, await readJson<ReserveBody>(req));
    }
    if (req.method === "PUT" && seg1 && seg2 === "expire-reservation") {
      return await expireReservation(ctx, tenantId, seg1);
    }
    if (req.method === "PUT" && seg1 && seg2 === "confirm-reservation") {
      return await confirmReservation(ctx, tenantId, seg1);
    }
    if (req.method === "PUT" && seg1 && seg2 === "cancel-reservation") {
      return await cancelReservation(ctx, tenantId, seg1);
    }
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function list(ctx: Awaited<ReturnType<typeof authenticate>>, tenantId: string) {
  const { data, error: err } = await ctx.supabase
    .from("parking_spaces")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("space_number");
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function findByNumber(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  number: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("parking_spaces")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("space_number", number)
    .maybeSingle();
  if (err) throw new Error(err.message);
  return ok(data ?? null);
}

async function createBulk(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: BulkBody,
) {
  if (!body?.start_number || !body?.count) {
    throw new Error("VALIDATION: start_number and count are required");
  }
  const rows = Array.from({ length: body.count }, (_, i) => ({
    tenant_id: tenantId,
    space_number: String(body.start_number + i),
    label: `Espacio ${body.start_number + i}`,
    status: "available" as const,
  }));
  for (let i = 0; i < rows.length; i += 50) {
    const { error: err } = await ctx.supabase.from("parking_spaces").insert(rows.slice(i, i + 50));
    if (err) throw new Error(err.message);
  }
  return created({ inserted: rows.length });
}

async function deleteAvailableAbove(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  threshold: number,
) {
  const { data: spaces, error: err1 } = await ctx.supabase
    .from("parking_spaces")
    .select("id, space_number, status")
    .eq("tenant_id", tenantId)
    .eq("status", "available");
  if (err1) throw new Error(err1.message);
  const toRemove = (spaces ?? [])
    .filter((s) => Number(s.space_number) > threshold)
    .map((s) => s.id);
  if (toRemove.length > 0) {
    const { error: err2 } = await ctx.supabase.from("parking_spaces").delete().in("id", toRemove);
    if (err2) throw new Error(err2.message);
  }
  return ok({ removed: toRemove.length });
}

async function setOccupied(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("parking_spaces")
    .update({ status: "occupied" })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: space not found");
  return ok(data);
}

async function setAvailable(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("parking_spaces")
    .update({
      status: "available",
      reserved_by: null,
      reserved_at: null,
      reservation_expires_at: null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: space not found");
  return ok(data);
}

async function reserve(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
  body: ReserveBody,
) {
  if (!body?.expires_at) throw new Error("VALIDATION: expires_at is required");
  const { data, error: err } = await ctx.supabase
    .from("parking_spaces")
    .update({
      status: "reserved",
      reserved_by: body.user_id ?? null,
      reserved_at: new Date().toISOString(),
      reservation_expires_at: body.expires_at,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: space not found");
  return ok(data);
}

async function expireReservation(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  await ctx.supabase
    .from("parking_spaces")
    .update({
      status: "available",
      reserved_by: null,
      reserved_at: null,
      reservation_expires_at: null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .eq("status", "reserved");

  await ctx.supabase
    .from("space_reservations")
    .update({ status: "expired" })
    .eq("tenant_id", tenantId)
    .eq("space_id", id)
    .eq("status", "pending");

  return ok({ expired: true });
}

async function confirmReservation(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  await ctx.supabase
    .from("space_reservations")
    .update({ status: "arrived", confirmed_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("space_id", id)
    .in("status", ["pending", "confirmed"]);
  return ok({ confirmed: true });
}

async function cancelReservation(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  await ctx.supabase
    .from("parking_spaces")
    .update({
      status: "available",
      reserved_by: null,
      reserved_at: null,
      reservation_expires_at: null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  await ctx.supabase
    .from("space_reservations")
    .update({ status: "cancelled" })
    .eq("tenant_id", tenantId)
    .eq("space_id", id)
    .in("status", ["pending", "confirmed"]);

  return ok({ cancelled: true });
}
