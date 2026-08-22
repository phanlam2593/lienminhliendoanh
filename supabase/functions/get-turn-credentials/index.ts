import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CF_TURN_KEY_ID = Deno.env.get("CF_TURN_KEY_ID")!;
const CF_TURN_KEY_TOKEN = Deno.env.get("CF_TURN_KEY_TOKEN")!;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Cấp TURN credentials NGẮN HẠN (1 giờ) cho client dùng khi gọi thoại — chỉ cấp cho
// user đã đăng nhập thật (xác thực JWT), tránh bị người ngoài lạm dụng gọi thẳng
// endpoint này để tiêu hao free tier Cloudflare của Lomi.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${CF_TURN_KEY_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: 3600 }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "cloudflare_error", detail }, 502);
    }

    const data = await res.json();
    return json({ iceServers: data.iceServers ?? [] });
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
