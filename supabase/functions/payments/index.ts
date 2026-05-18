// Edge Function: payments
// Historial y registro de cobros del tenant.
// Modelo: el cobro de una sesión de parking vive en parking_sessions.total_amount.
// Esta función expone una vista unificada y permite registrar/ajustar el cobro
// de una sesión existente.
//
// Rutas:
//   GET    /payments                  → historial con filtros ?from=&to=&type=
//   GET    /payments/:sessionId       → cobro de una sesión específica
//   POST   /payments                  → registrar/ajustar pago de una sesión

import { handleCors } from "../_shared/cors.ts";
import { authenticate, requireTenant, requireRole } from "../_shared/auth.ts";
import { ok, created, error, handleException, readJson } from "../_shared/response.ts";

interface PaymentBody {
  session_id: string;
  amount: number;
  payment_method?: string;
  notes?: string | null;
}

function parsePath(url: URL): { id: string | null } {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "payments");
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

    if (req.method === "GET" && !id) return await history(ctx, tenantId, url);
    if (req.method === "GET" && id) return await ofSession(ctx, tenantId, id);
    if (req.method === "POST" && !id) {
      requireRole(ctx, ["superadmin", "admin", "conductor"]);
      return await registerPayment(ctx, tenantId, await readJson<PaymentBody>(req));
    }
    return error("BAD_REQUEST: route not found", 404);
  } catch (e) {
    return handleException(e);
  }
});

async function history(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  url: URL,
) {
  const from = url.searchParams.get("from"); // ISO date
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type") ?? "all"; // all|parking|subscription
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? "100")));

  const result: {
    parking: unknown[];
    subscription: unknown[];
    totals: { parking: number; subscription: number; combined: number };
  } = {
    parking: [],
    subscription: [],
    totals: { parking: 0, subscription: 0, combined: 0 },
  };

  if (type === "all" || type === "parking") {
    let pq = ctx.supabase
      .from("parking_sessions")
      .select("id, plate, vehicle_type, customer_name, entry_time, exit_time, total_amount, status")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .not("total_amount", "is", null)
      .order("exit_time", { ascending: false })
      .limit(limit);
    if (from) pq = pq.gte("exit_time", from);
    if (to) pq = pq.lte("exit_time", to);
    const { data, error: err } = await pq;
    if (err) throw new Error(err.message);
    result.parking = data ?? [];
    result.totals.parking = (data ?? []).reduce((s, r: any) => s + Number(r.total_amount ?? 0), 0);
  }

  if (type === "all" || type === "subscription") {
    let sq = ctx.supabase
      .from("subscription_payments")
      .select("id, subscription_id, amount, payment_date, payment_method, notes")
      .eq("tenant_id", tenantId)
      .order("payment_date", { ascending: false })
      .limit(limit);
    if (from) sq = sq.gte("payment_date", from);
    if (to) sq = sq.lte("payment_date", to);
    const { data, error: err } = await sq;
    if (err) throw new Error(err.message);
    result.subscription = data ?? [];
    result.totals.subscription = (data ?? []).reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
  }

  result.totals.combined = result.totals.parking + result.totals.subscription;
  return ok(result);
}

async function ofSession(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  sessionId: string,
) {
  const { data, error: err } = await ctx.supabase
    .from("parking_sessions")
    .select("id, plate, vehicle_type, entry_time, exit_time, hours_parked, rate_per_hour, total_amount, status, notes")
    .eq("tenant_id", tenantId)
    .eq("id", sessionId)
    .maybeSingle();
  if (err) throw new Error(err.message);
  if (!data) throw new Error("NOT_FOUND: session not found");
  return ok(data);
}

async function registerPayment(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  tenantId: string,
  body: PaymentBody,
) {
  if (!body?.session_id || typeof body?.amount !== "number") {
    throw new Error("VALIDATION: session_id and amount are required");
  }

  const { data: session, error: sErr } = await ctx.supabase
    .from("parking_sessions")
    .select("id, total_amount, status, customer_id")
    .eq("tenant_id", tenantId)
    .eq("id", body.session_id)
    .maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!session) throw new Error("NOT_FOUND: session not found");

  const newNotes = body.notes
    ? `${body.notes}${body.payment_method ? ` [${body.payment_method}]` : ""}`
    : body.payment_method
    ? `[${body.payment_method}]`
    : null;

  const { data, error: err } = await ctx.supabase
    .from("parking_sessions")
    .update({
      total_amount: body.amount,
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.session_id)
    .select()
    .single();
  if (err) throw new Error(err.message);

  return created(data);
}
