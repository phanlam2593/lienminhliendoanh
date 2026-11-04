// 02/11 (hướng 2 — Kir chọn đặt mô hình hiểu nghĩa trên máy chủ của iLomi): khi các luật của Lomi BÍ, hỏi edge function
// "lomi-understand" xem câu gần nghĩa nhất với câu hỏi thường gặp / chủ đề sức khoẻ nào, rồi trộn với gợi ý theo từ khoá đang có
// (suggestFaqs) để hỏi lại "Có phải bạn muốn hỏi…". KHÔNG dùng để tự trả lời. Lỗi / chậm / chưa đăng nhập → null (Lomi đáp như cũ).
import { supabase } from "@/integrations/supabase/client";
import { faqById, suggestFaqs } from "@/lib/lomiFaq";
import { medNameOfId } from "@/lib/lomiMed";

export type MeaningHit = { id: string; score: number };
type Provider = (text: string) => Promise<MeaningHit[] | null>;

const TIMEOUT_MS = 3000;
// điểm tối thiểu của mô hình e5 (thang 0,7–1,0) để một chủ đề sức khoẻ được đưa vào gợi ý
const MIN_MED = 0.88;

const remote: Provider = async (text) => {
  try {
    const call = supabase.functions.invoke("lomi-understand", { body: { text, k: 6 } });
    const res = await Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS))]);
    if (!res || res.error || !Array.isArray(res.data?.top)) return null;
    return (res.data.top as MeaningHit[]).filter((x) => typeof x?.id === "string" && typeof x?.score === "number");
  } catch {
    return null;
  }
};
// Trong test (vitest) không gọi mạng — test tự gắn nguồn giả bằng setMeaningProvider.
let provider: Provider | null = import.meta.env.MODE === "test" ? null : remote;
export function setMeaningProvider(p: Provider | null) {
  provider = p;
}

/** Câu gợi ý (tối đa 3) cho câu Lomi chưa hiểu: trộn xếp hạng theo nghĩa (máy chủ) với xếp hạng theo từ khoá. null = không có gì thêm. */
export async function meaningChips(text: string, n = 3): Promise<string[] | null> {
  if (!provider || text.trim().split(/\s+/).length < 2) return null;
  const hits = await provider(text);
  if (!hits?.length) return null;
  const score = new Map<string, number>();
  hits.forEach((h, r) => {
    if (h.id.startsWith("med:") && h.score < MIN_MED) return;
    score.set(h.id, (score.get(h.id) ?? 0) + 1 / (10 + r));
  });
  // từ khoá được tin hơn một chút (đo trên 35 câu mới: từ khoá đúng hạng 1 nhiều hơn, nghĩa bổ sung câu từ khoá bỏ sót)
  suggestFaqs(text, 6).forEach((f, r) => score.set(`faq:${f.id}`, (score.get(`faq:${f.id}`) ?? 0) + 1.5 / (10 + r)));
  const out: string[] = [];
  for (const [id] of [...score].sort((a, b) => b[1] - a[1])) {
    const [kind, key] = [id.slice(0, 3), id.slice(4)];
    const chip = kind === "faq" ? faqById(key)?.q.vi : (() => { const nm = medNameOfId(key); return nm ? `${nm.charAt(0).toUpperCase()}${nm.slice(1)} là gì?` : undefined; })();
    if (chip && !out.includes(chip)) out.push(chip);
    if (out.length >= n) break;
  }
  return out.length ? out : null;
}
