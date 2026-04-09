import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error("No autorizado");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      throw new Error("No se pudo validar el parqueadero");
    }

    if (!["superadmin", "admin", "operator", "portero", "cajero"].includes(profile.role)) {
      throw new Error("No tienes permisos para actualizar la capacidad");
    }

    const { capacity } = await req.json();
    const nextCapacity = Number.parseInt(String(capacity), 10);

    if (!Number.isFinite(nextCapacity) || nextCapacity < 1) {
      throw new Error("Capacidad inválida");
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, plan_id")
      .eq("id", profile.tenant_id)
      .single();

    if (tenantError || !tenant) throw new Error("Parqueadero no encontrado");

    if (tenant.plan_id) {
      const { data: plan, error: planError } = await supabaseAdmin
        .from("plans")
        .select("max_spaces")
        .eq("id", tenant.plan_id)
        .single();

      if (planError) throw planError;
      if (plan?.max_spaces && nextCapacity > plan.max_spaces) {
        throw new Error(`El máximo de espacios según tu plan es ${plan.max_spaces}`);
      }
    }

    const { count: activeCount, error: countError } = await supabaseAdmin
      .from("parking_sessions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active");

    if (countError) throw countError;

    const availableSpaces = Math.max(nextCapacity - (activeCount || 0), 0);

    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({
        total_spaces: nextCapacity,
        available_spaces: availableSpaces,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.tenant_id)
      .select("id, total_spaces, available_spaces")
      .single();

    if (updateError || !updatedTenant) {
      throw updateError || new Error("No se pudo guardar la capacidad");
    }

    return jsonResponse(updatedTenant);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message });
  }
});