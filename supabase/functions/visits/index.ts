// Edge Function: visits
// Listado de visitas y reservas del CONDUCTOR autenticado (cross-tenant).
// Filtra por `customer_phone` extraído del user_profile (no se requiere tenant_id).
//
// Rutas:
//   GET /visits               → sesiones del conductor (todos los tenants)
//   GET /visits/reservations  → reservas del conductor (todos los tenants)

import { handleCors } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { ok, error, handleException } from "../_shared/response.ts";

async function loadUserPhone(
  ctx: Awaited<ReturnType<typeof authenticate>>,
): Promise<string | null> {
  const { data, error: err } = await ctx.supabase
    .from("user_profiles")
    .select("phone")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (err) throw new Error(err.message);
  return data?.phone ?? null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "visits");
    const seg1 = parts[idx + 1] ?? null;

    const phone = await loadUserPhone(ctx);
    if (!phone) return ok([]);

    if (req.method === "GET" && !seg1) return await listSessions(ctx, phone);
    if (req.method === "GET" && seg1 === "reservations") return await listReservations(ctx, phone);
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function listSessions(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  phone: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("parking_sessions")
    .select(`
      id,
      plate,
      vehicle_type,
      entry_time,
      exit_time,
      hours_parked,
      total_amount,
      status,
      space_number,
      space_reservation_id,
      notes,
      tenant:tenants!parking_sessions_tenant_id_fkey ( id, name, address, city, phone, latitude, longitude )
    `)
    .eq("customer_phone", phone)
    .order("entry_time", { ascending: false });
  if (err) throw new Error(err.message);
  return ok(
    (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      hours_parked: r.hours_parked != null ? Number(r.hours_parked) : null,
      total_amount: r.total_amount != null ? Number(r.total_amount) : null,
    })),
  );
}

async function listReservations(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  phone: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("space_reservations")
    .select(`
      id,
      plate,
      vehicle_type,
      status,
      reserved_at,
      expires_at,
      confirmed_at,
      customer_name,
      customer_phone,
      space:parking_spaces!space_reservations_space_id_fkey ( id, space_number ),
      tenant:tenants!space_reservations_tenant_id_fkey ( id, name, address, city, phone, latitude, longitude )
    `)
    .eq("customer_phone", phone)
    .order("reserved_at", { ascending: false });
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}
