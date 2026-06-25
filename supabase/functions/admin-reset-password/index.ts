// Admin-only: reset a member's password to a generated temp password, and
// store a masked hint in profiles.password_hint.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function maskPassword(pw: string) {
  if (!pw) return "";
  const n = pw.length;
  if (n <= 1) return "*";
  if (n <= 3) return pw[0] + "*".repeat(Math.max(1, n - 2)) + pw[n - 1];
  return pw.slice(0, 2) + "*".repeat(n - 3) + pw.slice(-1);
}

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

    const { data: prof } = await admin.from("profiles").select("username").eq("id", user_id).maybeSingle();
    if (!prof) return json({ error: "Profile not found" }, 404);

    const uname = (prof.username ?? "usr").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 3).padEnd(3, "x");
    const rand2 = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    const tempPassword = `${uname}2024${rand2}`;

    const { error: pwErr } = await admin.auth.admin.updateUserById(user_id, { password: tempPassword });
    if (pwErr) return json({ error: pwErr.message }, 500);

    await admin.from("profiles").update({ password_hint: maskPassword(tempPassword) }).eq("id", user_id);

    return json({ ok: true, temp_password: tempPassword });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
