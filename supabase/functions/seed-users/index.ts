import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { email: "central@ParkiUpar.co", password: "Central2024!", tenantId: "b2c3d4e5-0001-0001-0001-000000000001", name: "Admin Central Valledupar", role: "admin" },
    { email: "plaza@ParkiUpar.co", password: "Plaza2024!", tenantId: "b2c3d4e5-0001-0001-0001-000000000002", name: "Admin Plaza del Sol", role: "admin" },
    { email: "easypark@ParkiUpar.co", password: "EasyPark2024!", tenantId: "b2c3d4e5-0001-0001-0001-000000000003", name: "Admin EasyPark La Ceiba", role: "admin" },
    { email: "mayales@ParkiUpar.co", password: "Mayales2024!", tenantId: "b2c3d4e5-0001-0001-0001-000000000004", name: "Admin Los Mayales", role: "admin" },
  ];

  const results = [];

  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });

    if (error) {
      results.push({ email: u.email, error: error.message });
      continue;
    }

    // Update profile with role and tenant
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ role: u.role, tenant_id: u.tenantId, full_name: u.name })
      .eq("id", data.user.id);

    results.push({
      email: u.email,
      password: u.password,
      tenant: u.tenantId,
      profileError: profileError?.message || null,
      success: true,
    });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
