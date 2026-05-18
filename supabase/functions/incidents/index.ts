// Edge Function: incidents
// CRUD de incidencias (reportes de bug, sugerencias) del tenant.
//
// Rutas:
//   GET    /incidents            → lista
//   POST   /incidents            → crear incidencia
//   PUT    /incidents/:id        → actualizar estado / admin_notes

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant, isSuperadmin } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

interface IncidentBody {
  title: string;
  description: string;
  category?: string;
}

interface IncidentUpdateBody {
  status?: string;
  admin_notes?: string;
  category?: string;
  title?: string;
  description?: string;
}

function parsePath(url: URL): { id: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "incidents");
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
    if (req.method === "POST" && !id) return await create(ctx, tenantId, await readJson<IncidentBody>(req));
    if (req.method === "PUT" && id) return await update(ctx, tenantId, id, await readJson<IncidentUpdateBody>(req));
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
  const status = url.searchParams.get("status");
  let q = ctx.supabase
    .from("incident_reports")
    .select("*")
    .order("created_at", { ascending: false });

  // Superadmin puede ver todos los tenants si no envía filter
  if (!isSuperadmin(ctx)) {
    q = q.eq("tenant_id", tenantId);
  } else if (url.searchParams.get("tenant_id")) {
    q = q.eq("tenant_id", url.searchParams.get("tenant_id"));
  }
  if (status) q = q.eq("status", status);

  const { data, error: err } = await q;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function create(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: IncidentBody,
) {
  if (!body?.title || !body?.description) {
    throw new Error("VALIDATION: title and description are required");
  }
  const { data, error: err } = await ctx.supabase
    .from("incident_reports")
    .insert({
      tenant_id: tenantId,
      user_id: ctx.userId,
      user_name: ctx.fullName,
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category ?? "bug",
      status: "pending",
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
  body: IncidentUpdateBody,
) {
  // Solo admins/superadmins pueden cambiar status y admin_notes;
  // el creador puede actualizar título/descripcion mientras esté pendiente.
  const { data: target } = await ctx.supabase
    .from("incident_reports")
    .select("user_id, tenant_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw new Error("NOT_FOUND: incident not found");
  if (!isSuperadmin(ctx) && target.tenant_id !== tenantId) {
    throw new Error("FORBIDDEN: incident belongs to another tenant");
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const isAdmin = ctx.role === "admin" || ctx.role === "superadmin";
  if (isAdmin) {
    if (body.status !== undefined) patch.status = body.status;
    if (body.admin_notes !== undefined) patch.admin_notes = body.admin_notes;
    if (body.category !== undefined) patch.category = body.category;
  }
  if (target.user_id === ctx.userId && target.status === "pending") {
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
  }

  const { data, error: err } = await ctx.supabase
    .from("incident_reports")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  return ok(data);
}
