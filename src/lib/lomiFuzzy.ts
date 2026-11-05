// 05/11 — BỘ SO KHỚP GẦN ĐÚNG CHẠY NGAY TRÊN MÁY (thay edge function "lomi-understand": máy chủ không nạp được thư viện
// mô hình từ CDN → lỗi 500, Kir cũng muốn Lomi không phụ thuộc máy chủ / credit). Chỉ dùng để GỢI Ý "Có phải bạn muốn hỏi…"
// khi các luật của Lomi bí — KHÔNG tự trả lời.
// Cách làm: bỏ dấu + quy teencode → cắt thành cụm 3 ký tự (có đánh dấu đầu / cuối từ) → so độ giống TF-IDF (cosine) với
// câu hỏi thường gặp (câu hỏi + từ khoá) và tên các chủ đề sức khoẻ. Cụm ký tự chịu được gõ sai, thiếu dấu, dính chữ
// ("nghet muu", "dau dau ko het") mà không cần tải mô hình nặng. Chỉ mục dựng một lần (lười), vài ms.
import { FAQS, normalizeVi } from "@/lib/lomiFaq";
import INDEX from "@/lib/medkb/index.json";

export type FuzzyHit = { id: string; score: number };

// teencode / viết tắt hay gặp → chữ đầy đủ (đã bỏ dấu)
const SHORT: Record<string, string> = {
  k: "khong", ko: "khong", kh: "khong", hok: "khong", hong: "khong", hem: "khong", kg: "khong", khg: "khong",
  dc: "duoc", dk: "duoc", đc: "duoc", j: "gi", ji: "gi", z: "vay", v: "vay", dzay: "vay", zay: "vay",
  ntn: "nhu the nao", sao: "sao", bn: "bao nhieu", bnh: "bao nhieu", bik: "biet", bit: "biet", wa: "qua",
  ng: "nguoi", ny: "nguoi yeu", t: "toi", m: "minh", e: "em", a: "anh", r: "roi", ms: "moi",
  thik: "thich", nick: "tai khoan", nik: "tai khoan", acc: "tai khoan", tk: "tai khoan", mk: "mat khau", pass: "mat khau", cx: "cung", cg: "cung", vs: "voi", ok: "duoc", oke: "duoc", h: "gio", bh: "bay gio",
};
// từ đệm / từ hỏi chung — bỏ khi so (không mang chủ đề)
const STOP = new Set(
  "toi minh em anh chi ban con tui lomi oi a ah nha nhe nhe ne vay the thi la co khong gi sao nao duoc bi lam phai nen can cho voi va hay hoac ma roi qua lam ghe the nao nhu bao nhieu cai nay kia do day moi dang se da vua".split(" "),
);

export function fuzzyNorm(text: string): string[] {
  return normalizeVi(text)
    .split(" ")
    .flatMap((w) => (SHORT[w] ?? w).split(" "))
    .filter((w) => w && !STOP.has(w));
}

function grams(words: string[]): Map<string, number> {
  const m = new Map<string, number>();
  const add = (g: string, w = 1) => m.set(g, (m.get(g) ?? 0) + w);
  for (const w of words) {
    const s = `^${w}$`;
    for (let i = 0; i + 3 <= s.length; i++) add(s.slice(i, i + 3));
    add(`w:${w}`, 1.5); // nguyên từ khớp được thưởng thêm
  }
  for (let i = 0; i + 1 < words.length; i++) add(`b:${words[i]}_${words[i + 1]}`, 2); // cặp từ liền nhau
  return m;
}

type Doc = { id: string; vec: Map<string, number>; norm: number };
let DOCS: Doc[] | null = null;
let IDF: Map<string, number> = new Map();

function build(): Doc[] {
  const raw: { id: string; texts: string[] }[] = [];
  for (const f of FAQS) raw.push({ id: `faq:${f.id}`, texts: [f.q.vi, ...f.kw] });
  for (const r of INDEX as { id: string; names: string[] }[]) raw.push({ id: `med:${r.id}`, texts: r.names.slice(0, 8) });
  // mỗi câu mẫu là một "tài liệu" riêng; điểm của một mục = câu mẫu giống nhất
  const docs = raw.flatMap((r) => r.texts.map((t) => ({ id: r.id, g: grams(fuzzyNorm(t)) }))).filter((d) => d.g.size);
  const df = new Map<string, number>();
  for (const d of docs) for (const k of d.g.keys()) df.set(k, (df.get(k) ?? 0) + 1);
  IDF = new Map([...df].map(([k, n]) => [k, Math.log(1 + docs.length / n)]));
  return docs.map((d) => {
    const vec = new Map([...d.g].map(([k, v]) => [k, v * (IDF.get(k) ?? 0)]));
    return { id: d.id, vec, norm: Math.hypot(...vec.values()) || 1 };
  });
}

/** Các mục gần nghĩa nhất (faq:… / med:…), điểm 0–1 (cosine), mỗi mục một lần, giảm dần. */
export function fuzzyTop(text: string, k = 6): FuzzyHit[] {
  DOCS ??= build();
  const q = grams(fuzzyNorm(text));
  if (!q.size) return [];
  const qv = new Map([...q].map(([g, v]) => [g, v * (IDF.get(g) ?? Math.log(1 + DOCS!.length))]));
  const qn = Math.hypot(...qv.values()) || 1;
  const best = new Map<string, number>();
  for (const d of DOCS) {
    let dot = 0;
    for (const [g, v] of qv) {
      const w = d.vec.get(g);
      if (w) dot += v * w;
    }
    if (!dot) continue;
    const s = dot / (qn * d.norm);
    if (s > (best.get(d.id) ?? 0)) best.set(d.id, s);
  }
  return [...best].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score).slice(0, k);
}
