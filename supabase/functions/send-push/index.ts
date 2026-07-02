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

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Support both direct calls { user_id, title, body, url }
    // and Supabase DB webhook payloads { type, table, record: { ... } }
    const raw = await req.json().catch(() => ({}));
    let user_id: string | undefined;
    let title: string | undefined;
    let body: string | undefined;
    let url: string | undefined;

    if (raw?.record && raw?.table === "notifications") {
      const r = raw.record;
      user_id = r.user_id;
      title = r.title;
      body = r.body ?? "";
      const t = r.target_type as string | null;
      const tid = r.target_id as string | null;
      if (t === "business" && tid) url = `/dn/${tid}`;
      else if (t === "user" && tid) url = `/ho-so/${tid}`;
      else if (t === "message" && tid) url = `/tin-nhan/${tid}`;
      else if (t === "report" && tid) url = `/ho-so?view=reports`;
      else url = "/thong-bao";
    } else {
      user_id = raw.user_id;
      title = raw.title;
      body = raw.body;
      url = raw.url;
    }

    if (!user_id || !title) {
      return json({ error: "user_id and title required" }, 400);
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);
    if (error) throw error;
    if (!subs?.length) return json({ sent: 0 });

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/" });
    let sent = 0;
    const stale: string[] = [];

    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) stale.push(s.id);
      }
    }));

    if (stale.length) {
      await admin.from("push_subscriptions").delete().in("id", stale);
    }

    return json({ sent, removed: stale.length });
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
