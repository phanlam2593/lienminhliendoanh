// lomi-understand — HIỂU NGHĨA câu cho Lomi (02/11, hướng 2 — Kir chọn đặt mô hình trên máy chủ của iLomi, không qua dịch vụ bên ngoài).
//
// App chỉ gọi khi các luật của Lomi BÍ (không hiểu câu): trả về vài câu hỏi thường gặp / chủ đề sức khoẻ GẦN NGHĨA nhất để Lomi hỏi lại
// "Có phải bạn muốn hỏi…" — KHÔNG tự trả lời, không lưu, không ghi câu của người dùng vào nhật ký.
//
// Mô hình: multilingual-e5-small (intfloat, MIT) đã rút gọn còn mảnh chữ tiếng Việt + tiếng Anh — file nằm ở public/models/lomi-e5-vi
// của chính app. Lần đầu khởi động function tải các file đó về, KIỂM TRA MÃ BĂM SHA-256 ghi cứng dưới đây; sai mã băm thì không dùng.
// Nghĩa của câu mẫu tính sẵn lúc dựng (anchors.json — scripts/lomi-understand-build.py).
// (bản dựng cho trình duyệt — đã gói sẵn onnxruntime-web, không kéo theo gói biên dịch riêng như bản npm; giống hướng dẫn của Supabase)
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js";
import anchors from "./anchors.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODEL = "lomi-e5-vi";
// Mã băm các file mô hình (public/models/lomi-e5-vi) — đổi file thì phải cập nhật ở đây, không thì function từ chối dùng.
const SHA256: Record<string, string> = {
  "config.json": "2e0fe4402e17afd64f220086b6c9a5cddbcd1b43809b2b8c4f340760015e5725",
  "tokenizer.json": "6fb0d4ea6f63e8ff6290d6076927cdfff913342648f45662eb03172ce594c05d",
  "tokenizer_config.json": "a1d6bc8734a6f635dc158508bef000f8e2e5a759c7d92f984b2c86e5ff53425b",
  "special_tokens_map.json": "d05497f1da52c5e09554c0cd874037a083e1dc1b9cfd48034d1c717f1afc07a7",
  "onnx/model_quantized.onnx": "d80ff1f048c4cc69ff7dcb9989d77fcd299aefcf9c0ef07ef33965a64b1f9f6c",
};

type Anchors = { v: number; dim: number; scale: number; items: string[]; owner: number[]; q: string; sig: string };
const A = anchors as Anchors;
const AV = (() => {
  const raw = Uint8Array.from(atob(A.q), (c) => c.charCodeAt(0));
  return new Int8Array(raw.buffer);
})();

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
let extractor: Promise<(t: string, o: Record<string, unknown>) => Promise<{ data: Float32Array }>> | null = null;

/** Tải + kiểm tra mã băm các file mô hình, rồi mới giao cho thư viện (qua bộ đệm tuỳ chỉnh; thư viện không được tự tải thêm gì). */
async function load(base: string) {
  // Deno 2 có sẵn biến `process` nên bản dựng cho trình duyệt tưởng đang chạy Node và chọn bộ chạy native (không có) →
  //   ẩn `process` đúng lúc nạp thư viện để nó dùng onnxruntime-web (WebAssembly).
  const g = globalThis as { process?: unknown };
  const saved = g.process;
  g.process = undefined;
  try {
    return await loadInner(base);
  } finally {
    g.process = saved;
  }
}
async function loadInner(base: string) {
  // (bộ chạy WebAssembly cũng xem `process` lúc khởi tạo → cả bước tạo mô hình + một lần chạy thử đều nằm trong lúc ẩn)
  const { env, pipeline } = await import(Deno.env.get("LOMI_TRANSFORMERS_URL") ?? TRANSFORMERS);
  const root = base.replace(/\/?$/, "/");
  const files = new Map<string, Uint8Array>();
  for (const [name, want] of Object.entries(SHA256)) {
    const res = await fetch(`${root}${MODEL}/${name}`);
    if (!res.ok) throw new Error(`không tải được ${name} (${res.status})`);
    const buf = await res.arrayBuffer();
    const got = hex(await crypto.subtle.digest("SHA-256", buf));
    if (got !== want) throw new Error(`mã băm ${name} không khớp`);
    files.set(`${root}${MODEL}/${name}`, new Uint8Array(buf));
  }
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  env.remoteHost = root;
  env.remotePathTemplate = "{model}/";
  env.useCustomCache = true;
  env.customCache = {
    match: async (key: string | Request) => {
      const k = typeof key === "string" ? key : key.url;
      const b = files.get(k);
      return b ? new Response(b) : undefined;
    },
    put: async () => {},
  };
  // (thư viện bắt buộc bật "tải từ xa"; mọi file mô hình nó cần đều đã nằm trong bộ đệm đã kiểm tra mã băm ở trên — remoteHost cũng
  //  chính là thư mục mô hình của app, không phải Hugging Face)
  env.allowRemoteModels = true;
  const ow = (env.backends?.onnx as { wasm?: { wasmPaths?: string; numThreads?: number } } | undefined)?.wasm;
  const wasm = Deno.env.get("LOMI_ORT_WASM_PATHS");
  if (ow) {
    if (wasm) ow.wasmPaths = wasm;
    ow.numThreads = 1;
  }
  const ex = await pipeline("feature-extraction", MODEL, { quantized: true });
  await ex("query: xin chào", { pooling: "mean", normalize: true });
  // bộ chạy đã giữ bản riêng của mô hình → bỏ các bản tải về để nhẹ bộ nhớ (giới hạn của edge function)
  files.clear();
  return ex;
}

function rank(v: Float32Array, k: number) {
  const best = new Float32Array(A.items.length).fill(-9);
  const d = A.dim;
  for (let r = 0; r < A.owner.length; r++) {
    let s = 0;
    const o = r * d;
    for (let j = 0; j < d; j++) s += v[j] * AV[o + j];
    s *= A.scale;
    const it = A.owner[r];
    if (s > best[it]) best[it] = s;
  }
  return [...best.keys()].sort((a, b) => best[b] - best[a]).slice(0, k).map((i) => ({ id: A.items[i], score: Math.round(best[i] * 1000) / 1000 }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Chỉ nhận POST" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.normalize("NFC").trim().slice(0, 300) : "";
    if (!text) return json({ error: "Thiếu câu" }, 400);
    const k = Math.min(8, Math.max(1, Number(body?.k) || 5));
    // nơi đặt file mô hình: biến môi trường LOMI_MODEL_BASE, không có thì lấy theo địa chỉ app đang gọi (file vẫn phải đúng mã băm)
    const origin = req.headers.get("origin") ?? "";
    const base = Deno.env.get("LOMI_MODEL_BASE") ?? (/^https:\/\/[\w.-]+(:\d+)?$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin) ? `${origin}/models/` : "");
    if (!base) return json({ error: "Chưa biết nơi đặt mô hình (LOMI_MODEL_BASE)" }, 503);
    const t0 = Date.now();
    extractor ??= load(base).catch((e) => {
      extractor = null;
      throw e;
    }) as typeof extractor;
    const ex = await extractor!;
    const out = await ex(`query: ${text}`, { pooling: "mean", normalize: true });
    return json({ top: rank(out.data, k), sig: A.sig, ms: Date.now() - t0 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
