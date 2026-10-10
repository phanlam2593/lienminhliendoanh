// BỘ ĐO TIẾNG VIỆT (10/10, theo ý Kir: "đụng tới đâu lỗi tới đó") — đo Lomi hiểu đúng LOẠI câu bao nhiêu %,
// trên cùng một câu viết theo 4 cách: có dấu, không dấu, teen code, teen code không dấu.
// Bộ câu: corpus.json (sinh bằng gen_corpus.py). Chấm: lớp nào trả lời (cờ trên tin Lomi) có nằm trong các loại chấp nhận được.
import type { Turn } from "../lomiChatHarness";

export type Item = { id: string; q: string; ok: string[]; pre?: string[]; addr?: string };
export type Form = "acc" | "bare" | "teen" | "bareTeen";
export const FORMS: Form[] = ["acc", "bare", "teen", "bareTeen"];

export const bare = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFC");
// Cách viết tắt hay gặp khi chat (chỉ đổi nguyên từ).
const TEEN: [RegExp, string][] = [
  [/không/g, "k"], [/được/g, "đc"], [/gì/g, "j"], [/vậy/g, "v"], [/rồi/g, "r"], [/(^| )em( |$)/g, "$1e$2"], [/(^| )anh( |$)/g, "$1a$2"],
  [/biết/g, "bít"], [/quá/g, "wá"], [/chồng/g, "ck"], [/(^| )vợ( |$)/g, "$1vk$2"], [/người yêu/g, "ny"], [/bây giờ/g, "bh"], [/thế nào/g, "ntn"],
  [/mình/g, "mk"], [/với/g, "vs"], [/nhiều/g, "nhìu"], [/hôm nay/g, "hnay"], [/thích/g, "thik"],
];
export function teen(s: string): string {
  let t = ` ${s} `;
  // chỉ đổi NGUYÊN TỪ ("quá" → "wá" nhưng "quán" giữ nguyên); 2 lượt cho các từ đứng liền nhau
  for (let k = 0; k < 2; k++)
    for (const [re, to] of TEEN) {
      const src = re.source.replace(/^\(\^\| \)/, "").replace(/\(\s?\|\$\)$/, "").replace(/\( \|\$\)$/, "");
      t = t.replace(new RegExp(`(?<![\\p{L}])${src}(?![\\p{L}])`, "gu"), to.replace(/\$1|\$2/g, ""));
    }
  return t.trim();
}
export function variant(q: string, f: Form): string {
  return f === "acc" ? q : f === "bare" ? bare(q) : f === "teen" ? teen(q) : bare(teen(q));
}

/** Lớp đã trả lời lượt này. */
export function classify(m: Turn): string {
  const c = m.content;
  if (/đáp lạc|hiểu nhầm|hiểu chưa đúng/.test(c)) return "fix";
  if (m.harm || /Ngày Mai|096 306 1414|1900 969 680|\b113\b/.test(c)) return "safety";
  if (m.tarot || m.tarotAwait || m.tarotRef || m.tarotBack || m.tarotGate) return "tarot";
  if (m.med || m.drug || m.diet || m.health || m.sx?.length || m.hsub) return "health";
  if (m.dishAsk || m.dish || m.dishPick || m.places?.length || m.search) return "food";
  if (m.biz) return "biz";
  if (m.faqId) return "faq";
  if (m.stuck && ["fallback", "not_understood", "unknown_med", "suggest", "generic_listen"].includes(m.stuck)) return "unknown";
  if (m.heart || m.heartListen || m.thread || m.rel || m.talk) return "heart";
  return "chat";
}
/** Lomi gọi người dùng đúng cách chưa (khi mục có addr). */
export function addrOk(m: Turn, addr: string): boolean {
  const c = m.content;
  if (addr === "anh") return !/anh ấy|Anh ấy/.test(c) && /(^|[^\p{L}])anh([^\p{L}]|$)/iu.test(c);
  if (addr === "em") return /(^|[^\p{L}])em([^\p{L}]|$)/iu.test(c) || /bạn/.test(c);
  return true;
}
