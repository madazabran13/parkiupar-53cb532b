import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tenants with plans expiring in 15 or 7 days
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    const in15Days = new Date(now);
    in15Days.setDate(in15Days.getDate() + 15);

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, plan_expires_at")
      .eq("is_active", true)
      .not("plan_expires_at", "is", null);

    if (tenantsError) throw tenantsError;

    let created = 0;

    for (const tenant of tenants || []) {
      const expiresAt = new Date(tenant.plan_expires_at);
      const daysLeft = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only alert at exactly 15 days, 7 days, or already expired (0 or negative)
      const shouldAlert =
        daysLeft === 15 || daysLeft === 7 || daysLeft === 0;

      if (!shouldAlert) continue;

      // Get admin users for this tenant
      const { data: admins } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("role", "admin")
        .eq("is_active", true);

      // Also get superadmins
      const { data: superadmins } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "superadmin")
        .eq("is_active", true);

      const userIds = [
        ...(admins || []).map((a) => a.id),
        ...(superadmins || []).map((s) => s.id),
      ];

      const type = daysLeft <= 0 ? "danger" : daysLeft <= 7 ? "warning" : "info";
      const title =
        daysLeft <= 0
          ? `⚠️ Plan vencido: ${tenant.name}`
          : `⏰ Plan por vencer: ${tenant.name}`;
      const message =
        daysLeft <= 0
          ? `El plan del parqueadero "${tenant.name}" ha vencido. Renueva para mantener el servicio activo.`
          : `El plan del parqueadero "${tenant.name}" vence en ${daysLeft} días (${new Date(tenant.plan_expires_at).toLocaleDateString("es-CO")}).`;

      for (const userId of userIds) {
        // Check if already notified today for this tenant
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("tenant_id", tenant.id)
          .gte("created_at", today)
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from("notifications").insert({
          tenant_id: tenant.id,
          user_id: userId,
          title,
          message,
          type,
          metadata: { days_left: daysLeft, plan_expires_at: tenant.plan_expires_at },
        });
        created++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: created }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking expirations:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
