// 27/11 (Kir duyệt: "tâm sự để AI lo" — đo trước rồi mới quyết): CHẠY THỬ câu trả lời AI trên bộ test của Lomi.
//   • Không phải tính năng cho người dùng: chỉ chạy khi header x-eval-key khớp một mã trong bảng lomi_eval_keys (service role).
//   • Mỗi lần gọi lấy tối đa `limit` dòng "pending" của `batch` trong bảng lomi_ai_eval, chạy song song; mỗi dòng là một hội thoại
//     (mảng câu người dùng) — chạy lần lượt từng câu, câu sau kèm lịch sử, ghi lại câu trả lời, thời gian và số token.
//   • Dùng cùng ANTHROPIC_API_KEY của lomi-claude. Prompt (system) gửi kèm trong body để thử nhiều bản mà không cần deploy lại.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const k = req.headers.get("x-eval-key") ?? "";
  if (k.length < 24) return json({ error: "auth" }, 401);
  const { data: ok } = await admin.from("lomi_eval_keys").select("key").eq("key", k).maybeSingle();
  if (!ok) return json({ error: "auth" }, 401);

  const body = await req.json().catch(() => ({}));
  const batch = String(body?.batch ?? "");
  const system = String(body?.system ?? "");
  const model = String(body?.model ?? Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-5-5");
  const limit = Math.min(Math.max(Number(body?.limit ?? 6), 1), 20);
  const maxTokens = Math.min(Math.max(Number(body?.max_tokens ?? 500), 50), 1200);
  if (!batch || !system) return json({ error: "batch/system" }, 400);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "AI_UNAVAILABLE" }, 500);

  const { data: rows } = await admin.from("lomi_ai_eval").select("id, turns").eq("batch", batch).eq("status", "pending").order("id").limit(limit);
  if (!rows?.length) return json({ done: 0, left: 0 });
  await admin.from("lomi_ai_eval").update({ status: "running" }).in("id", rows.map((r) => r.id));

  // (27/11: tài khoản Anthropic giới hạn số yêu cầu chạy cùng lúc — chạy TUẦN TỰ từng ca, gặp 429 / 529 thì chờ rồi thử lại,
  //   để bài chạy thử không làm nghẽn lomi-claude của người dùng thật)
  const call = async (messages: { role: string; content: string }[]) => {
    let res: Response | null = null;
    for (let k = 0; k < 5; k++) {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
      });
      if (res.status !== 429 && res.status !== 529) break;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** k));
    }
    if (!res!.ok) throw new Error(`${res!.status} ${(await res!.text()).slice(0, 200)}`);
    const d = await res!.json();
    const text = (d?.content ?? []).filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n").trim();
    return { text, inTok: d?.usage?.input_tokens ?? 0, outTok: d?.usage?.output_tokens ?? 0 };
  };

  for (const r of rows) {
    const t0 = Date.now();
    const msgs: { role: string; content: string }[] = [];
    const replies: string[] = [];
    let inTok = 0, outTok = 0;
    try {
      for (const u of (r.turns as string[])) {
        msgs.push({ role: "user", content: String(u) });
        const a = await call(msgs);
        replies.push(a.text);
        inTok += a.inTok; outTok += a.outTok;
        msgs.push({ role: "assistant", content: a.text || "…" });
      }
      await admin.from("lomi_ai_eval").update({ status: "done", replies, ms: Date.now() - t0, in_tok: inTok, out_tok: outTok, done_at: new Date().toISOString() }).eq("id", r.id);
    } catch (e) {
      await admin.from("lomi_ai_eval").update({ status: "error", replies, error: String(e).slice(0, 300) }).eq("id", r.id);
    }
  }
  const { count } = await admin.from("lomi_ai_eval").select("id", { count: "exact", head: true }).eq("batch", batch).eq("status", "pending");
  return json({ done: rows.length, left: count ?? 0 });
});
