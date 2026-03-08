import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the calling user is admin or superadmin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("No autorizado");

    const { data: callerProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("role, tenant_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["superadmin", "admin"].includes(callerProfile.role)) {
      throw new Error("No tienes permisos para gestionar usuarios");
    }

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, full_name, role, tenant_id } = payload;

      // Admin can only create users for their own tenant
      const targetTenant = callerProfile.role === "superadmin" ? tenant_id : callerProfile.tenant_id;
      
      // Admin cannot create superadmin or admin users
      if (callerProfile.role === "admin" && ["superadmin", "admin"].includes(role)) {
        throw new Error("No puedes crear usuarios con ese rol");
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .update({ role, tenant_id: targetTenant, full_name })
        .eq("id", authData.user.id);
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = payload;

      // Admin cannot set superadmin role
      if (callerProfile.role === "admin" && ["superadmin", "admin"].includes(role)) {
        throw new Error("No puedes asignar ese rol");
      }

      // Admin can only update users from their tenant
      if (callerProfile.role === "admin") {
        const { data: targetProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("tenant_id")
          .eq("id", user_id)
          .single();
        if (targetProfile?.tenant_id !== callerProfile.tenant_id) {
          throw new Error("No puedes modificar usuarios de otro parqueadero");
        }
      }

      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({ role })
        .eq("id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_tenant") {
      // Only superadmin
      if (callerProfile.role !== "superadmin") throw new Error("Solo superadmin");
      const { user_id, tenant_id, role } = payload;

      const updateData: Record<string, unknown> = { tenant_id: tenant_id || null };
      if (role) updateData.role = role;

      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update(updateData)
        .eq("id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_active") {
      const { user_id, is_active } = payload;

      if (callerProfile.role === "admin") {
        const { data: targetProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("tenant_id")
          .eq("id", user_id)
          .single();
        if (targetProfile?.tenant_id !== callerProfile.tenant_id) {
          throw new Error("No puedes modificar usuarios de otro parqueadero");
        }
      }

      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({ is_active })
        .eq("id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      // Superadmin gets all, admin gets own tenant
      let query = supabaseAdmin.from("user_profiles").select("*").order("created_at", { ascending: false });
      if (callerProfile.role === "admin") {
        query = query.eq("tenant_id", callerProfile.tenant_id);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Get emails from auth
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || []);

      const enriched = (data || []).map(p => ({
        ...p,
        email: emailMap.get(p.id) || null,
      }));

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Acción no válida");
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
