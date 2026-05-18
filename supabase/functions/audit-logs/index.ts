// Edge Function: audit-logs
// Bitácora de auditoría con paginado y exportación.
// Solo accesible para admin/superadmin.
//
// Rutas:
//   GET /audit-logs?table=&action=&q=&page=&pageSize=  → paginado { items, total }
//   GET /audit-logs/export?table=&action=&q=           → todos (limit 5000)

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireRole } from "../_shared/auth.ts";
import { ok, error, handleException } from "../_shared/response.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    requireRole(ctx, ["admin", "superadmin"]);

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "audit-logs");
    const seg1 = parts[idx + 1] ?? null;

    if (req.method === "GET" && !seg1) return await list(ctx, url);
    if (req.method === "GET" && seg1 === "export") return await exportAll(ctx, url);
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

function buildQuery(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  url: URL,
  withCount: boolean,
) {
  const table = url.searchParams.get("table") ?? "all";
  const action = url.searchParams.get("action") ?? "all";
  const q = url.searchParams.get("q")?.trim() ?? "";

  let query = withCount
    ? ctx.supabase.from("audit_logs").select("*", { count: "exact" })
    : ctx.supabase.from("audit_logs").select("*");
  query = query.order("created_at", { ascending: false });

  if (table !== "all") query = query.eq("table_name", table);
  if (action !== "all") query = query.eq("action", action);
  if (q) query = query.or(`user_name.ilike.%${q}%,record_id.ilike.%${q}%`);

  return query;
}

async function list(ctx: Awaited<ReturnType<typeof authenticate>>, url: URL) {
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0"));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") ?? "20")));
  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  const query = buildQuery(ctx, url, true).range(fromIdx, toIdx);
  const { data, count, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok({ items: data ?? [], total: count ?? 0, page, pageSize });
}

async function exportAll(ctx: Awaited<ReturnType<typeof authenticate>>, url: URL) {
  const query = buildQuery(ctx, url, false).limit(5000);
  const { data, error: err } = await query;
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}
