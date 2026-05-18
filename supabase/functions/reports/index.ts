// Edge Function: reports
// Reportes agregados por periodo + distribución de vehículos.
// Usa date_trunc de PostgreSQL vía RPC inline (raw SQL) para agrupación.
//
// Rutas:
//   GET    /reports?period=day|week|month[&from=&to=]   → ingresos, sesiones, ocupación promedio
//   GET    /reports/vehicles                            → distribución por tipo de vehículo

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant } from "../_shared/auth.ts";
import { ok, error, handleException } from "../_shared/response.ts";

type Period = "day" | "week" | "month";

function parsePath(url: URL): { sub: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "reports");
  return { sub: idx === -1 ? null : parts[idx + 1] ?? null };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);
    const url = new URL(req.url);
    const { sub } = parsePath(url);

    if (req.method === "GET" && !sub) return await overview(ctx, tenantId, url);
    if (req.method === "GET" && sub === "vehicles") return await vehicles(ctx, tenantId, url);
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function overview(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  url: URL,
) {
  const period = (url.searchParams.get("period") ?? "day") as Period;
  if (!["day", "week", "month"].includes(period)) {
    throw new Error("VALIDATION: period must be day|week|month");
  }
  const to = url.searchParams.get("to") ?? new Date().toISOString();
  const from = url.searchParams.get("from") ?? defaultFrom(period, to);

  // Trae sesiones completadas en el rango; agrupamos en JS para no requerir RPC.
  const { data: sessions, error: sErr } = await ctx.supabase
    .from("parking_sessions")
    .select("entry_time, exit_time, total_amount, vehicle_type, status")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .gte("exit_time", from)
    .lte("exit_time", to)
    .order("exit_time", { ascending: true });
  if (sErr) throw new Error(sErr.message);

  const buckets = new Map<string, { revenue: number; sessions: number }>();
  for (const s of sessions ?? []) {
    const exit = s.exit_time ? new Date(s.exit_time) : null;
    if (!exit) continue;
    const key = bucketKey(exit, period);
    const cur = buckets.get(key) ?? { revenue: 0, sessions: 0 };
    cur.revenue += Number(s.total_amount ?? 0);
    cur.sessions += 1;
    buckets.set(key, cur);
  }

  const series = Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([bucket, v]) => ({ bucket, revenue: v.revenue, sessions: v.sessions }));

  // Ocupación promedio: usa snapshots de tenants + sesiones activas. Aproximación:
  // promedio de (sesiones activas / total_spaces) sobre el rango.
  const { data: tenant } = await ctx.supabase
    .from("tenants")
    .select("total_spaces")
    .eq("id", tenantId)
    .maybeSingle();
  const totalSpaces = tenant?.total_spaces ?? 0;
  const totalSessions = (sessions ?? []).length;
  const totalRevenue = (sessions ?? []).reduce((s, r: any) => s + Number(r.total_amount ?? 0), 0);
  const avgOccupancy = totalSpaces > 0 && series.length > 0
    ? series.reduce((s, b) => s + b.sessions, 0) / (series.length * totalSpaces)
    : 0;

  return ok({
    period,
    from,
    to,
    totals: {
      sessions: totalSessions,
      revenue: totalRevenue,
      avg_occupancy: Number(avgOccupancy.toFixed(3)),
    },
    series,
  });
}

async function vehicles(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  url: URL,
) {
  const to = url.searchParams.get("to") ?? new Date().toISOString();
  const from = url.searchParams.get("from") ?? defaultFrom("month", to);

  const { data, error: err } = await ctx.supabase
    .from("parking_sessions")
    .select("vehicle_type, total_amount")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .gte("exit_time", from)
    .lte("exit_time", to);
  if (err) throw new Error(err.message);

  const grouped: Record<string, { count: number; revenue: number }> = {};
  for (const r of data ?? []) {
    const t = r.vehicle_type ?? "unknown";
    grouped[t] ??= { count: 0, revenue: 0 };
    grouped[t].count += 1;
    grouped[t].revenue += Number(r.total_amount ?? 0);
  }
  const total = Object.values(grouped).reduce((s, v) => s + v.count, 0);
  const distribution = Object.entries(grouped).map(([vehicle_type, v]) => ({
    vehicle_type,
    count: v.count,
    revenue: v.revenue,
    pct: total > 0 ? Number((v.count / total).toFixed(3)) : 0,
  })).sort((a, b) => b.count - a.count);

  return ok({ from, to, total, distribution });
}

function defaultFrom(period: Period, to: string): string {
  const d = new Date(to);
  if (period === "day") d.setDate(d.getDate() - 30);
  else if (period === "week") d.setDate(d.getDate() - 12 * 7);
  else d.setMonth(d.getMonth() - 12);
  return d.toISOString();
}

function bucketKey(date: Date, period: Period): string {
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  if (period === "day") return `${y}-${m}-${d}`;
  if (period === "month") return `${y}-${m}`;
  // week: ISO week (lunes inicio)
  const tmp = new Date(Date.UTC(y, date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}
