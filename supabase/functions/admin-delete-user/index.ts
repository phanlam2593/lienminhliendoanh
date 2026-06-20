// Admin-only: cascade delete a member (their businesses + auth user). All other
// references cascade automatically via FK ON DELETE CASCADE on auth.users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { user_id } = await req.json();
    if (!user_id) return json({ error: "Missing user_id" }, 400);
    if (user_id === user.id) return json({ error: "Cannot delete self" }, 400);

    // 1. Delete businesses owned by user (cascades offers/reviews/follows/claims via FKs)
    const { data: bizList } = await admin.from("businesses").select("id").eq("owner_id", user_id);
    for (const b of bizList ?? []) {
      await admin.from("offers").delete().eq("business_id", b.id);
      await admin.from("businesses").delete().eq("id", b.id);
    }

    // 2. Delete auth user — cascades profile, user_roles, messages, notifications,
    //    reviews, reports, offer_claims, follows, replies via ON DELETE CASCADE.
    const { error: dErr } = await admin.auth.admin.deleteUser(user_id);
    if (dErr) return json({ error: dErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
