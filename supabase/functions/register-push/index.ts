import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { endpoint, p256dh, auth, oldEndpoint } = await req.json();
    if (!endpoint || !p256dh || !auth) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    let userId = null;
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData } = await userClient.auth.getUser();
      if (authData?.user) userId = authData.user.id;
    }

    if (!userId && oldEndpoint) {
      const { data: oldRow } = await admin
        .from("push_subscriptions")
        .select("user_id")
        .eq("endpoint", oldEndpoint)
        .maybeSingle();
      if (oldRow?.user_id) userId = oldRow.user_id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (oldEndpoint && oldEndpoint !== endpoint) {
      await admin.from("push_subscriptions").delete().eq("endpoint", oldEndpoint);
    }

    const { error: insertErr } = await admin
      .from("push_subscriptions")
      .insert({ user_id: userId, endpoint, p256dh, auth });

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
