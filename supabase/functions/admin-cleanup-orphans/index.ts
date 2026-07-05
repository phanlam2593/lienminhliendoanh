// Admin-only: find auth users without a matching profile row and delete them.
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

    const admin = createClient(url, service);
    const userClient = createClient(url, anon);
    const { data: claimsData, error: uErr } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (uErr || !userId) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    // Load all profile ids
    const { data: profs } = await admin.from("profiles").select("id");
    const profileIds = new Set((profs ?? []).map((p: any) => p.id));

    // Page through auth users
    let page = 1;
    const perPage = 200;
    const orphans: string[] = [];
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ error: error.message }, 500);
      const users = data?.users ?? [];
      for (const u of users) {
        if (!profileIds.has(u.id) && u.id !== userId) orphans.push(u.id);
      }
      if (users.length < perPage) break;
      page++;
      if (page > 50) break; // safety
    }

    let deleted = 0;
    const failures: string[] = [];
    for (const id of orphans) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) failures.push(`${id}: ${error.message}`);
      else deleted++;
    }

    return json({ ok: true, found: orphans.length, deleted, failures });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
