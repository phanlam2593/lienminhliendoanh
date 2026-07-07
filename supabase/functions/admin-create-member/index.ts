// Admin-only: tạo tài khoản đăng nhập mới cho thành viên, kèm mật khẩu tạm.
// Trigger DB "handle_new_user" đã tự tạo dòng profiles + user_roles khi auth user được tạo.
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
    const {
      data: { user },
      error: uErr,
    } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const rawUsername = String(body.username ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const realEmail = String(body.real_email ?? "").trim();

    const username = rawUsername.replace(/[^a-z0-9_]/g, "");
    if (!username || username.length < 3) {
      return json({ error: "Username phải có ít nhất 3 ký tự (chỉ chữ thường, số, gạch dưới)" }, 400);
    }
    if (!fullName) return json({ error: "Vui lòng nhập họ tên" }, 400);

    const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existing) return json({ error: "Username đã tồn tại, vui lòng chọn tên khác" }, 400);

    const loginEmail = `${username}@lienminh.local`;
    const rand4 = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const tempPassword = `${username.slice(0, 4).padEnd(4, "x")}${rand4}`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName,
        real_email: realEmail || loginEmail,
        phone: phone || "",
      },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "Tạo tài khoản thất bại" }, 500);

    await admin.from("profiles").update({ password_hint: maskPassword(tempPassword) }).eq("id", created.user.id);

    return json({ ok: true, username, temp_password: tempPassword, user_id: created.user.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
