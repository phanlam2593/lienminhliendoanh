import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limit đơn giản trong bộ nhớ: tối đa 5 lần / 10 phút cho mỗi IP
const hits = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 5;
const WINDOW = 10 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const rec = hits.get(ip);
    if (rec && now < rec.resetAt) {
      if (rec.count >= LIMIT) {
        return new Response(
          JSON.stringify({ locked: true, message: "Bạn đã thử quá nhiều lần. Vui lòng đợi ít phút hoặc liên hệ admin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      rec.count++;
    } else {
      hits.set(ip, { count: 1, resetAt: now + WINDOW });
    }

    const { email, phone } = await req.json();
    if (!email || !phone) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await admin
      .from("profiles")
      .select("username, password_hint")
      .eq("email", String(email).trim())
      .eq("phone", String(phone).trim())
      .maybeSingle();

    if (!data) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ found: true, username: data.username, password_hint: data.password_hint ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
