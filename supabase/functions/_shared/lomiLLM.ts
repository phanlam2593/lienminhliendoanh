// 28/11 chiều (Kir: "bên này hết lượt thì qua bên kia", "làm cả Gemini với gì cũng miễn phí nữa") — gọi AI cho Lomi: thử
//   Anthropic trước; hết tiền / quá tải / lỗi mạng → lần lượt Groq → Gemini → OpenRouter (gói miễn phí, API kiểu OpenAI; bên nào
//   chưa cài key thì bỏ qua: GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY); tất cả hỏng → app dùng Lomi trên máy như cũ.
//   Groq: không dùng dữ liệu API để huấn luyện; nên bật Zero Data Retention trong Data Controls của Groq.
//   Gói miễn phí Groq (đọc 28/11): openai/gpt-oss-120b 30 lượt/phút, 1.000 lượt/ngày, 8.000 token/phút, 200.000 token/ngày
//   → chỉ gửi lời dặn GỌN (ROUTE_PROMPT, LOMI_TALK_PROMPT); mục Hỏi về app (kèm cả kiến thức app, ~18.000 token) không đi Groq.

export type LLMMsg = { role: "user" | "assistant"; content: string };
export type LLMOk = { ok: true; text: string; stop: string; provider: string; model: string };
export type LLMErr = { ok: false; code: string; detail: string };
export type LLMOut = LLMOk | LLMErr;

type Opts = {
  model: string; // model Anthropic
  system: string;
  cacheSystem?: boolean; // bật prompt caching cho lời dặn (dài, giống nhau mọi lượt)
  messages: LLMMsg[];
  maxTokens: number;
  /** Các nhà cung cấp dự phòng được thử khi Anthropic lỗi (FALLBACKS_SMALL / FALLBACKS_BIG). */
  fallback?: Prov[];
  /** json = bắt bên dự phòng trả JSON (nếu hỗ trợ). */
  groq?: { json?: boolean };
};

async function anthropic(o: Opts): Promise<LLMOut> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { ok: false, code: "AI_UNAVAILABLE", detail: "no anthropic key" };
  // Tắt "nghĩ ngầm" (đo 27/11: để bật thì có câu rỗng / cụt). Sonnet đòi "between_tools", Haiku nhận "disabled".
  const thinking = { type: /haiku/i.test(o.model) ? "disabled" : "between_tools" };
  const system = o.cacheSystem ? [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }] : o.system;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: o.model, max_tokens: o.maxTokens, system, messages: o.messages, thinking }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      const code = /credit balance/i.test(t) ? "AI_CREDITS" : res.status === 429 || res.status === 529 ? "AI_BUSY" : "AI_ERROR";
      return { ok: false, code, detail: `anthropic ${res.status} ${t.slice(0, 180)}` };
    }
    const data = await res.json();
    const text = (Array.isArray(data?.content) ? data.content : [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => String(b.text))
      .join("\n")
      .trim();
    return { ok: true, text, stop: String(data?.stop_reason ?? ""), provider: "anthropic", model: o.model };
  } catch (e) {
    return { ok: false, code: "AI_ERROR", detail: `anthropic ${String(e).slice(0, 180)}` };
  }
}

type Prov = "groq" | "gemini" | "openrouter";
// Các nhà cung cấp dự phòng (API kiểu OpenAI), thử theo thứ tự này. Gemini / OpenRouter gói miễn phí có thể dùng nội dung để cải
//   thiện dịch vụ (Google ghi rõ ở trang giá) → đứng sau Groq (Groq không huấn luyện trên dữ liệu API).
const PROVS: Record<Prov, { key: string; url: string; model: string; json: boolean }> = {
  groq: { key: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", model: "GROQ_MODEL|openai/gpt-oss-120b", json: true },
  gemini: { key: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "GEMINI_MODEL|gemini-3.5-flash-lite", json: true },
  openrouter: { key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", model: "OPENROUTER_MODEL|openrouter/free", json: false },
};
export const FALLBACKS_SMALL: Prov[] = ["groq", "gemini", "openrouter"]; // lời dặn gọn (vừa 8.000 token/phút của Groq)
export const FALLBACKS_BIG: Prov[] = ["gemini", "openrouter"]; // lời dặn dài (mục Hỏi về app kèm kiến thức app)

async function compat(p: Prov, o: Opts): Promise<LLMOut> {
  const c = PROVS[p];
  const key = Deno.env.get(c.key);
  if (!key) return { ok: false, code: "AI_UNAVAILABLE", detail: `no ${p} key` };
  const [envName, def] = c.model.split("|");
  const model = Deno.env.get(envName) || def;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(c.url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: o.system }, ...o.messages],
        // gpt-oss "nghĩ" trước khi viết, phần nghĩ cũng tính vào token ra → nghĩ ít, chừa chỗ.
        max_tokens: o.maxTokens + 700,
        ...(/gpt-oss/i.test(model) ? { reasoning_effort: "low" } : {}),
        ...(o.groq?.json && c.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, code: res.status === 429 ? "AI_BUSY" : "AI_ERROR", detail: `${p} ${res.status} ${t.slice(0, 160)}` };
    }
    const data = await res.json();
    const ch = data?.choices?.[0];
    const text = String(ch?.message?.content ?? "").trim();
    if (!text) return { ok: false, code: "AI_ERROR", detail: `${p} empty ${String(ch?.finish_reason ?? "")}` };
    const fin = String(ch?.finish_reason ?? "");
    return { ok: true, text, stop: fin === "length" ? "max_tokens" : fin, provider: p, model };
  } catch (e) {
    return { ok: false, code: "AI_ERROR", detail: `${p} ${String(e).slice(0, 160)}` };
  }
}

/**
 * Anthropic trước; lỗi (hết tiền, quá tải, mạng) thì lần lượt thử các nhà cung cấp dự phòng đã cài key (o.fallback, theo thứ tự).
 * Tất cả đều hỏng → trả lỗi của Anthropic kèm chi tiết từng bên (app dùng Lomi trên máy).
 */
export async function callLLM(o: Opts): Promise<LLMOut> {
  const a = await anthropic(o);
  if (a.ok) return a;
  const notes = [a.detail];
  for (const p of o.fallback ?? []) {
    if (!Deno.env.get(PROVS[p].key)) continue;
    const g = await compat(p, o);
    if (g.ok) return g;
    notes.push(g.detail);
  }
  return { ok: false, code: a.code, detail: notes.join(" | ").slice(0, 500) };
}

/** Gọi thẳng một nhà cung cấp dự phòng — cho lomi-eval đo miễn phí. */
export const callCompat = compat;
