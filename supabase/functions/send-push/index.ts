import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:lienminhliendoanh@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

interface PushItem {
  user_id: string;
  title: string;
  body: string;
  url: string;
}

function urlForTarget(target_type: string | null, target_id: string | null): string {
  if (target_type === "business" && target_id) return `/dn/${target_id}`;
  if (target_type === "user" && target_id) return `/ho-so/${target_id}`;
  if (target_type === "message" && target_id) return `/tin-nhan/${target_id}`;
  if (target_type === "report" && target_id) return `/ho-so?view=reports`;
  return "/thong-bao";
}

// Gửi cho 1 lô nhiều người CÙNG LÚC: 1 truy vấn DB duy nhất lấy hết push_subscriptions
// (thay vì N truy vấn riêng), rồi gửi song song — quan trọng khi broadcast quy mô lớn.
async function sendBatch(items: PushItem[]) {
  if (!items.length) return { sent: 0, removed: 0 };
  const userIds = [...new Set(items.map((i) => i.user_id))];
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error) throw error;

  const subsByUser = new Map<string, typeof subs>();
  (subs ?? []).forEach((s: any) => {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  });

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    items.flatMap((item) => {
      const userSubs = subsByUser.get(item.user_id) ?? [];
      const payload = JSON.stringify({ title: item.title, body: item.body, url: item.url });
      return userSubs.map(async (s: any) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          sent++;
        } catch (e: any) {
          const code = e?.statusCode;
          if (code === 404 || code === 410) stale.push(s.id);
        }
      });
    }),
  );

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("id", stale);
  }
  return { sent, removed: stale.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const raw = await req.json().catch(() => ({}));

    // Định dạng LÔ (từ trigger FOR EACH STATEMENT — gộp nhiều thông báo trong 1 lượt gọi)
    if (Array.isArray(raw?.records) && raw?.table === "notifications") {
      const items: PushItem[] = raw.records
        .filter((r: any) => r?.user_id && r?.title)
        .map((r: any) => ({
          user_id: r.user_id,
          title: r.title,
          body: r.body ?? "",
          url: urlForTarget(r.target_type ?? null, r.target_id ?? null),
        }));
      const result = await sendBatch(items);
      return json(result);
    }

    // Định dạng CŨ — 1 thông báo (webhook FOR EACH ROW cũ, hoặc gọi trực tiếp từ nơi khác)
    let user_id: string | undefined;
    let title: string | undefined;
    let body: string | undefined;
    let url: string | undefined;

    if (raw?.record && raw?.table === "notifications") {
      const r = raw.record;
      user_id = r.user_id;
      title = r.title;
      body = r.body ?? "";
      url = urlForTarget(r.target_type ?? null, r.target_id ?? null);
    } else {
      user_id = raw.user_id;
      title = raw.title;
      body = raw.body;
      url = raw.url;
    }

    if (!user_id || !title) {
      return json({ error: "user_id and title required" }, 400);
    }

    const result = await sendBatch([{ user_id, title, body: body ?? "", url: url ?? "/" }]);
    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
