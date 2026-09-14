// Internal test-data helper: generate a contextual illustration image for each
// swipe_needs row that is still missing photo_url, upload it to the "uploads"
// bucket (same path pattern as the app: <user_id>/quet/<uuid>.<ext>) and write
// both photo_url and photo_urls.
//
// Not part of the product UI. Guarded by ADMIN_SEED_TOKEN.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SEED_TOKEN = Deno.env.get("QUET_SEED_TOKEN") ?? "";

const CUTOFF = "2026-09-14 16:41:50+00";

type Need = {
  id: string;
  user_id: string;
  need_type: string;
  title: string | null;
  description: string | null;
  details: Record<string, unknown> | null;
};

function detailLine(d: Record<string, unknown> | null): string {
  if (!d) return "";
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function buildPrompt(n: Need, variantSeed: string): string {
  const base =
    `Ảnh minh hoạ chân thực, chất lượng cao, phong cách Việt Nam đương đại. ` +
    `Nội dung cần minh hoạ: "${n.title ?? ""}". Chi tiết: ${n.description ?? ""}. ` +
    `Thông tin thêm: ${detailLine(n.details)}. `;

  let styling = "";
  switch (n.need_type) {
    case "trao_doi":
      styling =
        "Chụp đúng món đồ / bất động sản / chủ đề được nhắc tới ở trên, đặt trong bối cảnh thật, " +
        "ánh sáng tự nhiên, góc chụp như ảnh đăng bán trên chợ online. Nếu là trao đổi tương tác mạng xã hội thì " +
        "minh hoạ bằng cảnh người dùng điện thoại với ứng dụng mạng xã hội, không hiển thị logo thương hiệu cụ thể.";
      break;
    case "tim_viec":
      styling =
        "Minh hoạ đúng công việc / ngành nghề được nhắc tới: cảnh làm việc thật tại nơi làm việc, " +
        "người Việt, ánh sáng tự nhiên, phong cách phóng sự.";
      break;
    case "lam_quen":
      styling =
        "Ảnh chân dung lifestyle của một người Việt, ngoài trời hoặc quán cafe, thân thiện, tự nhiên, " +
        "đúng giới tính và độ tuổi nêu trong thông tin thêm. Một người duy nhất trong khung hình.";
      break;
    case "game":
      styling =
        "Minh hoạ chủ đề chơi game đúng tựa game/nền tảng được nhắc tới: cảnh người chơi trên điện thoại hoặc PC, " +
        "ánh sáng đèn LED, không dùng nhân vật có bản quyền, không chữ.";
      break;
    default:
      styling = "Ảnh minh hoạ hợp ngữ cảnh, chân thực.";
  }

  return (
    base +
    styling +
    ` Không có chữ hay watermark trong ảnh. Bố cục và tông màu độc nhất, khác biệt hoàn toàn với các ảnh khác ` +
    `(mã biến thể ${variantSeed}).`
  );
}

async function generateImage(prompt: string): Promise<{ bytes: Uint8Array; ext: string; contentType: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image in gateway response");
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { bytes: bin, ext: "png", contentType: "image/png" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("x-seed-token") ?? "";
  if (!SEED_TOKEN || token !== SEED_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let limit = 5;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number" && body.limit > 0 && body.limit <= 20) limit = Math.floor(body.limit);
  } catch { /* defaults */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await admin
    .from("swipe_needs")
    .select("id, user_id, need_type, title, description, details")
    .is("photo_url", null)
    .gte("created_at", CUTOFF)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const n of (rows ?? []) as Need[]) {
    try {
      const uuid = crypto.randomUUID();
      const { bytes, ext, contentType } = await generateImage(buildPrompt(n, uuid.slice(0, 8)));
      const path = `${n.user_id}/quet/${uuid}.${ext}`;
      const up = await admin.storage.from("uploads").upload(path, bytes, { contentType, upsert: false });
      if (up.error) throw up.error;
      const { error: updErr } = await admin
        .from("swipe_needs")
        .update({ photo_url: path, photo_urls: [path] })
        .eq("id", n.id);
      if (updErr) throw updErr;
      results.push({ id: n.id, ok: true });
    } catch (e) {
      results.push({ id: n.id, ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) });
    }
  }

  const { count: remaining } = await admin
    .from("swipe_needs")
    .select("id", { count: "exact", head: true })
    .is("photo_url", null)
    .gte("created_at", CUTOFF);

  return new Response(
    JSON.stringify({
      processed: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
      remaining: remaining ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
