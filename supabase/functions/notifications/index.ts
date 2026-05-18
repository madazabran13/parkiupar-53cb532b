// Edge Function: notifications
// Notificaciones del usuario autenticado.
//
// Rutas:
//   GET    /notifications              → notificaciones del usuario (no leídas primero)
//   PUT    /notifications/:id/read     → marcar una como leída
//   PUT    /notifications/read-all     → marcar todas las del usuario como leídas

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, error, handleException } from "../_shared/response.ts";

function parsePath(url: URL): { id: string | null; action: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "notifications");
  if (idx === -1) return { id: null, action: null };
  const next = parts[idx + 1] ?? null;
  if (next === "read-all") return { id: null, action: "read-all" };
  return { id: next, action: parts[idx + 2] ?? null };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    const url = new URL(req.url);
    const { id, action } = parsePath(url);

    if (req.method === "GET" && !id && !action) return await list(ctx, tenantId, url);
    if (req.method === "PUT" && id && action === "read") return await markOneRead(ctx, tenantId, id);
    if (req.method === "PUT" && !id && action === "read-all") return await markAllRead(ctx, tenantId);
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
  const onlyUnread = url.searchParams.get("unread") === "true";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

  // Notificaciones dirigidas al usuario directamente o a su rol dentro del tenant
  let q = ctx.supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .or(`user_id.eq.${ctx.userId},and(tenant_id.eq.${tenantId},target_role.eq.${ctx.role})`);

  if (onlyUnread) q = q.eq("is_read", false);

  const { data, error: err } = await q;
  if (err) throw new Error(err.message);

  const unreadCount = (data ?? []).filter((n: any) => !n.is_read).length;
  return ok({ items: data ?? [], unread: unreadCount });
}

async function markOneRead(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  id: string,
) {
  const { data: target } = await ctx.supabase
    .from("notifications")
    .select("id, user_id, tenant_id, target_role")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw new Error("NOT_FOUND: notification not found");

  // Solo el dueño (o un usuario del tenant con el rol target) puede marcarla.
  const owns =
    target.user_id === ctx.userId ||
    (target.tenant_id === tenantId && target.target_role === ctx.role);
  if (!owns) throw new Error("FORBIDDEN: notification not addressed to this user");

  const { data, error: err } = await ctx.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (err) throw new Error(err.message);
  return ok(data);
}

async function markAllRead(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
) {
  // 1) Las dirigidas directamente al usuario
  const { error: e1 } = await ctx.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", ctx.userId)
    .eq("is_read", false);
  if (e1) throw new Error(e1.message);

  // 2) Las dirigidas al rol del usuario dentro del tenant
  const { error: e2 } = await ctx.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("tenant_id", tenantId)
    .eq("target_role", ctx.role)
    .eq("is_read", false);
  if (e2) throw new Error(e2.message);

  return ok({ marked: true });
}
