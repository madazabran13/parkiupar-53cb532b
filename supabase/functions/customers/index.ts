// Edge Function: customers
// CRUD de clientes del tenant con historial de visitas.
//
// Rutas:
//   GET    /customers              → lista paginada (?q=, ?page=, ?pageSize=)
//   GET    /customers/:id          → cliente + historial de visitas
//   POST   /customers              → crear cliente
//   PUT    /customers/:id          → actualizar cliente

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

interface CustomerBody {
  full_name: string;
  phone: string;
  email?: string | null;
}

function parsePath(url: URL): { id: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "customers");
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
    if (req.method === "GET" && id) return await detail(ctx, tenantId, id);
    if (req.method === "POST" && !id) return await create(ctx, tenantId, await readJson<CustomerBody>(req));
    if (req.method === "PUT" && id) return await update(ctx, tenantId, id, await readJson<Partial<CustomerBody>>(req));
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
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "20")));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = ctx.supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error: err, count } = await query;
  if (err) throw new Error(err.message);
  return ok({ items: data ?? [], page, pageSize, total: count ?? 0 });
}

async function detail(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data: customer, error: err } = await ctx.supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!customer) throw new Error("NOT_FOUND: customer not found");

  const { data: sessions } = await ctx.supabase
    .from("parking_sessions")
    .select("id, plate, vehicle_type, entry_time, exit_time, total_amount, status")
    .eq("tenant_id", tenantId)
    .eq("customer_id", id)
    .order("entry_time", { ascending: false })
    .limit(50);

  const { data: vehicles } = await ctx.supabase
    .from("vehicles")
    .select("id, plate, vehicle_type, brand, color")
    .eq("tenant_id", tenantId)
    .eq("customer_id", id);

  return ok({ ...customer, vehicles: vehicles ?? [], sessions: sessions ?? [] });
}

async function create(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: CustomerBody,
) {
  if (!body?.full_name || !body?.phone) {
    throw new Error("VALIDATION: full_name and phone are required");
  }
  const { data: dup } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", body.phone)
    .maybeSingle();
  if (dup) throw new Error("CONFLICT: a customer with this phone already exists");

  const { data, error: err } = await ctx.supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      full_name: body.full_name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() ?? null,
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
  body: Partial<CustomerBody>,
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.full_name !== undefined) patch.full_name = body.full_name;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.email !== undefined) patch.email = body.email;

  const { data, error: err } = await ctx.supabase
    .from("customers")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: customer not found");
  return ok(data);
}
