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

// ─────────────────────────────────────────────────────────────────────────────
// NÚT ⁉️ + ADMIN DẠY LOMI (01/10, theo ý Kir)
//  • Người dùng bấm ⁉️ dưới câu Lomi đáp → gửi (câu hỏi, câu Lomi đáp, lý do) vào lomi_feedback.
//  • Admin vào Quản trị → "Lomi học hỏi" → viết câu trả lời đúng → lưu lomi_taught.
//  • Lomi tải các câu đã dạy và ưu tiên trả lời bằng câu đó khi người dùng hỏi giống.
//  Cột question của lomi_taught: mỗi dòng là một cách hỏi khác nhau của cùng một ý.
// ─────────────────────────────────────────────────────────────────────────────
const sb = supabase as unknown as {
  from: (t: string) => any;
};

export type FeedbackReason = "unknown" | "wrong" | "offtopic" | "other";
export async function sendFeedback(question: string, answer: string, reason: FeedbackReason, note?: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { error } = await sb.from("lomi_feedback").insert({
    user_id: u.user.id,
    question: question.trim().slice(0, 500) || "(không có câu hỏi)",
    answer: answer.slice(0, 4000),
    reason,
    note: note?.trim() ? note.trim().slice(0, 500) : null,
  });
  return !error;
}

type Taught = { id: string; keys: string[]; tokens: Set<string>[]; answer: string };
let taughtCache: Taught[] | null = null;
let taughtAt = 0;
// Từ đệm không mang nghĩa — bỏ khi so khớp gần đúng.
const STOP = new Set("lomi oi a nha nhe ne vay the la cho minh toi tui em anh chi ban co khong ko k gi di voi duoc roi thi ma".split(" "));
const toks = (k: string) => new Set(k.split(" ").filter((w) => w && !STOP.has(w)));

export async function loadTaught(force = false): Promise<Taught[]> {
  if (taughtCache && !force && Date.now() - taughtAt < 5 * 60_000) return taughtCache;
  try {
    const { data } = await sb.from("lomi_taught").select("id, question, answer").eq("active", true).limit(1000);
    taughtCache = ((data ?? []) as { id: string; question: string; answer: string }[]).map((r) => {
      const keys = r.question.split(/\n|\|/).map(learnKey).filter((k) => k.length >= 2);
      return { id: r.id, keys, tokens: keys.map(toks), answer: r.answer };
    });
    taughtAt = Date.now();
  } catch {
    taughtCache = taughtCache ?? [];
  }
  return taughtCache;
}

/** Câu trả lời admin đã dạy. exactOnly = chỉ khớp y câu (dùng ưu tiên trước mọi luồng khác). */
export function matchTaught(text: string, exactOnly = false): { id: string; answer: string } | null {
  if (!taughtCache?.length) return null;
  const key = learnKey(text);
  if (key.length < 2) return null;
  for (const t of taughtCache) if (t.keys.includes(key)) return t;
  if (exactOnly) return null;
  const q = toks(key);
  if (q.size < 2) return null;
  let best: Taught | null = null;
  let bestScore = 0;
  for (const t of taughtCache)
    for (const ts of t.tokens) {
      if (ts.size < 2) continue;
      let inter = 0;
      q.forEach((w) => ts.has(w) && inter++);
      const score = inter / (q.size + ts.size - inter);
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
  return best && bestScore >= 0.7 ? best : null;
}

export function taughtHit(id: string) {
  void db.rpc("lomi_taught_hit", { _id: id }).then(
    () => undefined,
    () => undefined,
  );
}
