// Edge Function: schedules
// Horarios del parqueadero por agrupación de días: weekday | saturday | sunday.
//
// Rutas:
//   GET    /schedules            → horarios actuales del tenant
//   PUT    /schedules            → reemplaza/actualiza los horarios (upsert por day_group)

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant, requireRole } from "../_shared/auth.ts";
import { ok, error, handleException, readJson } from "../_shared/response.ts";

type DayGroup = "weekday" | "saturday" | "sunday";

interface ScheduleItem {
  day_group: DayGroup;
  open_time: string;  // HH:MM o HH:MM:SS
  close_time: string;
  is_active?: boolean;
  sort_order?: number;
}

interface ScheduleBody {
  schedules: ScheduleItem[];
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ctx = await authenticate(req);
    const tenantId = requireTenant(ctx);

    if (req.method === "GET") return await listSchedules(ctx, tenantId);
    if (req.method === "PUT") {
      requireRole(ctx, ["superadmin", "admin"]);
      return await upsertSchedules(ctx, tenantId, await readJson<ScheduleBody>(req));
    }
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function listSchedules(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("tenant_schedules")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });
  if (err) throw new Error(err.message);
  return ok(data ?? []);
}

async function upsertSchedules(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: ScheduleBody,
) {
  if (!Array.isArray(body?.schedules) || body.schedules.length === 0) {
    throw new Error("VALIDATION: schedules array is required");
  }

  const validGroups: DayGroup[] = ["weekday", "saturday", "sunday"];
  const sortIndex: Record<DayGroup, number> = { weekday: 1, saturday: 2, sunday: 3 };

  for (const s of body.schedules) {
    if (!validGroups.includes(s.day_group)) {
      throw new Error(`VALIDATION: invalid day_group "${s.day_group}"`);
    }
    if (!s.open_time || !s.close_time) {
      throw new Error("VALIDATION: open_time and close_time are required");
    }
  }

  // Borra los existentes del tenant y reemplaza con los nuevos.
  const { error: delErr } = await ctx.supabase
    .from("tenant_schedules")
    .delete()
    .eq("tenant_id", tenantId);
  if (delErr) throw new Error(delErr.message);

  const rows = body.schedules.map((s) => ({
    tenant_id: tenantId,
    day_group: s.day_group,
    open_time: s.open_time,
    close_time: s.close_time,
    is_active: s.is_active ?? true,
    sort_order: s.sort_order ?? sortIndex[s.day_group],
  }));

  const { data, error: insErr } = await ctx.supabase
    .from("tenant_schedules")
    .insert(rows)
    .select();
  if (insErr) throw new Error(insErr.message);
  return ok(data ?? []);
}
