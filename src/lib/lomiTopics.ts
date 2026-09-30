// ─────────────────────────────────────────────────────────────────────────────
// CHỦ ĐỀ HOT CỦA LOMI (01/10, theo ý Kir): nút 💡 trên đầu khung chat hiện các chủ đề được mọi người hỏi
// nhiều nhất. Mỗi lần Lomi trả lời đúng một chủ đề → +1 lượt (bảng lomi_topic_stats, chỉ lưu khoá chủ đề,
// không lưu ai hỏi / hỏi gì). Chưa đủ dữ liệu thì hiện danh sách mặc định.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";
import { faqById } from "@/lib/lomiFaq";

export type TopicAction = "tarot" | "heart" | "biz" | "send";
export type Topic = { key: string; label: string; action: TopicAction; prompt?: string };

export const TOPICS: Record<string, Omit<Topic, "key">> = {
  tarot: { label: "🔮 Bói Tarot", action: "tarot" },
  daily: { label: "🃏 Lá bài hôm nay", action: "send", prompt: "Bói một lá cho hôm nay" },
  food: { label: "🍜 Hôm nay ăn gì?", action: "send", prompt: "🍜 Hôm nay ăn gì?" },
  drink: { label: "🧋 Uống gì giờ?", action: "send", prompt: "🧋 Uống gì giờ?" },
  heart: { label: "💬 Tâm sự", action: "heart" },
  love: { label: "💕 Tư vấn tình cảm", action: "send", prompt: "Tư vấn tình cảm" },
  health: { label: "🩺 Sức khoẻ", action: "send", prompt: "🩺 Sức khoẻ" },
  mind: { label: "🧠 Căng thẳng, lo âu", action: "send", prompt: "Dạo này mình hay căng thẳng, lo lắng" },
  biz: { label: "💡 Tư vấn kinh doanh", action: "biz" },
};
const DEFAULT_TOP = ["tarot", "food", "heart", "health", "faq:claim", "faq:quetwhat", "love", "biz"];

export function topicOf(key: string): Topic | null {
  if (TOPICS[key]) return { key, ...TOPICS[key] };
  if (key.startsWith("faq:")) {
    const f = faqById(key.slice(4));
    if (f) return { key, label: `📱 ${f.q.vi}`, action: "send", prompt: f.q.vi };
  }
  return null;
}

// Không đếm 1 chủ đề 2 lần liền trong vài giây (vd bấm lặp).
let last = "";
let lastAt = 0;
export function topicHit(key: string) {
  const now = Date.now();
  if (key === last && now - lastAt < 5000) return;
  last = key;
  lastAt = now;
  void (supabase as any).rpc("lomi_topic_hit", { _key: key }).then(() => {}, () => {});
}

/** Top chủ đề (mọi người hỏi nhiều nhất), bù thêm mặc định cho đủ n. */
export async function loadTopTopics(n = 8): Promise<Topic[]> {
  let keys: string[] = [];
  try {
    const { data } = await (supabase as any).rpc("lomi_top_topics", { _n: 12 });
    keys = ((data ?? []) as { key: string; hits: number }[]).filter((r) => r.hits >= 3).map((r) => r.key);
  } catch {
    /* mất mạng → dùng mặc định */
  }
  const out: Topic[] = [];
  for (const k of [...keys, ...DEFAULT_TOP]) {
    const t = topicOf(k);
    if (t && !out.some((x) => x.key === t.key)) out.push(t);
    if (out.length >= n) break;
  }
  return out;
}
