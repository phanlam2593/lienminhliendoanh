// Admin-only: mọi thao tác GHI của trang Admin đi qua đây (CLAUDE.md #12) — 18/11/2026.
//
// Kiểm quyền admin ở SERVER (has_role), chỉ nhận thao tác + cột trong danh sách trắng bên dưới, rồi thực thi bằng chính phiên đăng
// nhập của admin (không dùng service role) → RLS, trigger, thông báo… chạy y hệt như khi trang Admin gọi thẳng bảng trước đây.
// Policy admin cũ trên các bảng CHƯA khoá (phiên sau mới khoá, khi chắc mọi thao tác đã qua đây).
//
// Body: { action: "update" | "delete" | "insert_offer" | "broadcast", ... } — xem từng nhánh.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cột được phép đổi theo từng bảng (đúng các cột trang Admin đang đổi).
const UPDATE_COLS: Record<string, string[]> = {
  profiles: ["status", "admin_note", "full_name", "email", "phone", "is_member", "membership_expires_at", "membership_started_at"],
  businesses: [
    "status", "admin_note", "is_featured", "name", "type", "description", "hours_open", "hours_close",
    "address", "phone", "facebook_url", "website_url",
  ],
  offers: ["status"],
};
const DELETE_TABLES = ["businesses", "offers", "reviews", "reports"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.replace("Bearer ", "")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const db = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const {
      data: { user },
      error: uErr,
    } = await db.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "update") {
      const table = String(body.table ?? "");
      const id = String(body.id ?? "");
      const allowed = UPDATE_COLS[table];
      if (!allowed) return json({ error: "Bad table" }, 400);
      if (!UUID.test(id)) return json({ error: "Bad id" }, 400);
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries((body.patch ?? {}) as Record<string, unknown>)) {
        if (!allowed.includes(k)) return json({ error: `Column not allowed: ${k}` }, 400);
        patch[k] = v;
      }
      if (!Object.keys(patch).length) return json({ error: "Empty patch" }, 400);
      const { error } = await db.from(table).update(patch).eq("id", id);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    if (action === "delete") {
      const table = String(body.table ?? "");
      const id = String(body.id ?? "");
      if (!DELETE_TABLES.includes(table)) return json({ error: "Bad table" }, 400);
      if (!UUID.test(id)) return json({ error: "Bad id" }, 400);
      if (table === "businesses") {
        // Như trang Admin cũ: xoá ưu đãi của DN trước rồi mới xoá DN.
        const { error: oErr } = await db.from("offers").delete().eq("business_id", id);
        if (oErr) return json({ error: oErr.message }, 400);
      }
      const { error } = await db.from(table).delete().eq("id", id);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    if (action === "insert_offer") {
      const businessId = String(body.business_id ?? "");
      const title = String(body.title ?? "").trim().slice(0, 200);
      if (!UUID.test(businessId) || !title) return json({ error: "Bad offer" }, 400);
      const { error } = await db.from("offers").insert({ business_id: businessId, title, status: "active" });
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }

    if (action === "broadcast") {
      // Tin "📢" từ Ban quản trị tới nhiều người — người gửi LUÔN là admin đang đăng nhập.
      const content = String(body.content ?? "").slice(0, 4000);
      const ids = (Array.isArray(body.receiver_ids) ? body.receiver_ids : []).map(String).filter((x: string) => UUID.test(x) && x !== user.id);
      if (!content || !ids.length) return json({ error: "Empty broadcast" }, 400);
      const rows = ids.map((rid: string) => ({ sender_id: user.id, receiver_id: rid, content, type: "broadcast" }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from("messages").insert(rows.slice(i, i + 500));
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true, sent: rows.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
