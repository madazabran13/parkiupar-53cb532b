// Edge Function: capacity
// Reporta y ajusta el aforo en tiempo real del tenant.
//
// Rutas:
//   GET    /capacity            → { total, occupied, available }
//   POST   /capacity/entry      → decrementa available_spaces
//   POST   /capacity/exit       → incrementa available_spaces (hasta total)

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, error, handleException } from "../_shared/response.ts";

function parsePath(url: URL): { action: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "capacity");
  return { action: idx === -1 ? null : parts[idx + 1] ?? null };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    const url = new URL(req.url);
    const { action } = parsePath(url);

    if (req.method === "GET" && !action) return await status(ctx, tenantId);
    if (req.method === "POST" && action === "entry") return await delta(ctx, tenantId, -1);
    if (req.method === "POST" && action === "exit") return await delta(ctx, tenantId, +1);
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function status(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
) {
  const { data: tenant, error: err } = await ctx.supabase
    .from("tenants")
    .select("total_spaces, available_spaces")
    .eq("id", tenantId)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!tenant) throw new Error("NOT_FOUND: tenant not found");

  // Verificación cruzada con sesiones activas (fuente de verdad)
  const { count: activeCount } = await ctx.supabase
    .from("parking_sessions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const total = tenant.total_spaces ?? 0;
  const occupied = activeCount ?? Math.max(0, total - (tenant.available_spaces ?? 0));
  const available = Math.max(0, total - occupied);

  return ok({
    total,
    occupied,
    available,
    stored_available: tenant.available_spaces ?? 0,
    is_consistent: (tenant.available_spaces ?? 0) === available,
  });
}

async function delta(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  step: number,
) {
  // Lectura + escritura. Para evitar race conditions críticas el lado correcto
  // es usar un RPC con FOR UPDATE; aquí mantenemos coherencia con un check.
  const { data: tenant, error: err } = await ctx.supabase
    .from("tenants")
    .select("total_spaces, available_spaces")
    .eq("id", tenantId)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!tenant) throw new Error("NOT_FOUND: tenant not found");

  const current = tenant.available_spaces ?? 0;
  const total = tenant.total_spaces ?? 0;
  const next = Math.max(0, Math.min(total, current + step));

  if (step < 0 && current <= 0) {
    throw new Error("CONFLICT: no available spaces to decrement");
  }
  if (next === current) {
    return ok({ total, available: current });
  }

  const { data, error: updErr } = await ctx.supabase
    .from("tenants")
    .update({ available_spaces: next, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .eq("available_spaces", current) // optimistic concurrency
    .select("total_spaces, available_spaces")
    .maybeSingle();
  if (updErr) throw new Error(updErr.message);
  if (!data) throw new Error("CONFLICT: capacity changed concurrently, retry");

  return ok({ total: data.total_spaces, available: data.available_spaces });
}
