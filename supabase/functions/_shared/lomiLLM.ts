// 28/11 chiều (Kir: "bên này hết lượt thì qua bên kia") — gọi AI cho Lomi: thử Anthropic trước; hết tiền / quá tải / lỗi mạng
//   → thử Groq (gói miễn phí, API kiểu OpenAI) nếu đã cài GROQ_API_KEY; vẫn lỗi → app dùng Lomi trên máy như cũ.
//   Groq: không dùng dữ liệu API để huấn luyện; nên bật Zero Data Retention trong Data Controls của Groq.
//   Gói miễn phí Groq (đọc 28/11): openai/gpt-oss-120b 30 lượt/phút, 1.000 lượt/ngày, 8.000 token/phút, 200.000 token/ngày
//   → chỉ gửi lời dặn GỌN (ROUTE_PROMPT, LOMI_TALK_PROMPT); mục Hỏi về app (kèm cả kiến thức app, ~18.000 token) không đi Groq.

export type LLMMsg = { role: "user" | "assistant"; content: string };
export type LLMOk = { ok: true; text: string; stop: string; provider: "anthropic" | "groq"; model: string };
export type LLMErr = { ok: false; code: string; detail: string };
export type LLMOut = LLMOk | LLMErr;

type Opts = {
  model: string; // model Anthropic
  system: string;
  cacheSystem?: boolean; // bật prompt caching cho lời dặn (dài, giống nhau mọi lượt)
  messages: LLMMsg[];
  maxTokens: number;
  /** Cho phép thử Groq khi Anthropic lỗi. json = bắt Groq trả JSON. */
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

async function groq(o: Opts): Promise<LLMOut> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return { ok: false, code: "AI_UNAVAILABLE", detail: "no groq key" };
  const model = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: o.system }, ...o.messages],
        // gpt-oss "nghĩ" trước khi viết, phần nghĩ cũng tính vào token ra → nghĩ ít, chừa chỗ.
        max_tokens: o.maxTokens + 700,
        ...(/gpt-oss/i.test(model) ? { reasoning_effort: "low" } : {}),
        ...(o.groq?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, code: res.status === 429 ? "AI_BUSY" : "AI_ERROR", detail: `groq ${res.status} ${t.slice(0, 180)}` };
    }
    const data = await res.json();
    const c = data?.choices?.[0];
    const text = String(c?.message?.content ?? "").trim();
    const fin = String(c?.finish_reason ?? "");
    return { ok: true, text, stop: fin === "length" ? "max_tokens" : fin, provider: "groq", model };
  } catch (e) {
    return { ok: false, code: "AI_ERROR", detail: `groq ${String(e).slice(0, 180)}` };
  }
}

/** Anthropic trước; lỗi thì thử Groq (khi o.groq có và đã cài key). Trả lỗi của Anthropic kèm chi tiết cả hai nếu đều hỏng. */
export async function callLLM(o: Opts): Promise<LLMOut> {
  const a = await anthropic(o);
  if (a.ok || !o.groq || !Deno.env.get("GROQ_API_KEY")) return a;
  const g = await groq(o);
  if (g.ok) return g;
  return { ok: false, code: a.code, detail: `${a.detail} | ${g.detail}`.slice(0, 400) };
}

/** Chỉ Groq — cho lomi-eval đo miễn phí. */
export const callGroq = groq;
