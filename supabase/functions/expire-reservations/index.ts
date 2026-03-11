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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // Find expired reserved spaces
    const { data: expiredSpaces, error: fetchError } = await supabase
      .from("parking_spaces")
      .select("id, space_number, tenant_id")
      .eq("status", "reserved")
      .lt("reservation_expires_at", now);

    if (fetchError) throw fetchError;

    if (!expiredSpaces || expiredSpaces.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired reservations", expired: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const spaceIds = expiredSpaces.map((s: any) => s.id);

    // Release the spaces
    const { error: updateError } = await supabase
      .from("parking_spaces")
      .update({
        status: "available",
        reserved_by: null,
        reserved_at: null,
        reservation_expires_at: null,
      })
      .in("id", spaceIds);

    if (updateError) throw updateError;

    // Update reservation records
    const { error: resError } = await supabase
      .from("space_reservations")
      .update({ status: "expired" })
      .in("space_id", spaceIds)
      .eq("status", "pending");

    if (resError) throw resError;

    console.log(`Expired ${spaceIds.length} reservations`);

    return new Response(
      JSON.stringify({ message: "Reservations expired", expired: spaceIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error expiring reservations:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
