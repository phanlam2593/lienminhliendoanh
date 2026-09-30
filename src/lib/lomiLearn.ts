// ─────────────────────────────────────────────────────────────────────────────
// LOMI TỰ HỌC (30/09, theo ý Kir) — không dùng AI, học từ chính cách người dùng hỏi:
//  • Lomi bí → ghi câu đó vào danh sách (gộp câu trùng, chỉ đếm số lần — không lưu ai hỏi).
//  • Ngay sau đó người dùng bấm gợi ý / hỏi lại mà trúng một câu hỏi thường gặp → Lomi ghi nhớ
//    "câu lạ này = câu hỏi kia". Lần sau có người hỏi y như vậy, Lomi trả lời luôn.
//  • Để tránh học sai: cần ≥2 người khác nhau xác nhận mới áp dụng cho mọi người (người đã dạy thì
//    được áp dụng ngay cho chính họ). Xem supabase/migrations/20260930160000_lomi_learning.sql
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";
import { normalizeVi } from "@/lib/lomiFaq";

const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/** Khoá so khớp: bỏ dấu, bỏ ký tự đặc biệt, gộp khoảng trắng. */
export function learnKey(text: string): string {
  return normalizeVi(text)
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Câu này đã được học chưa → trả id câu hỏi thường gặp (hoặc null). Lỗi mạng thì bỏ qua. */
export async function lookupLearned(text: string): Promise<string | null> {
  const key = learnKey(text);
  if (key.length < 3) return null;
  try {
    const r = await Promise.race([
      db.rpc("lomi_lookup", { _key: key }),
      new Promise<{ data: null }>((res) => setTimeout(() => res({ data: null }), 2500)),
    ]);
    return typeof r.data === "string" ? r.data : null;
  } catch {
    return null;
  }
}

export function logUnanswered(text: string) {
  const key = learnKey(text);
  if (key.length < 3) return;
  void db.rpc("lomi_log_unanswered", { _key: key, _sample: text.trim().slice(0, 300) }).then(
    () => undefined,
    () => undefined,
  );
}

export function learnAnswer(unknownText: string, faqId: string) {
  const key = learnKey(unknownText);
  if (key.length < 3 || !/^[a-z0-9_-]{1,40}$/.test(faqId)) return;
  void db.rpc("lomi_learn", { _key: key, _faq_id: faqId }).then(
    () => undefined,
    () => undefined,
  );
}
