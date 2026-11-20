// 20/11 (Kir duyệt — "hướng lai"): Lomi trả lời bằng thư viện trên máy trước; chỉ câu Lomi BÍ mới nhờ Claude (edge function lomi-claude).
//   Không bao giờ nhờ Claude khi câu có dấu hiệu khủng hoảng / cấp cứu / bị hại / dấu hiệu đỏ y khoa — những câu đó luôn do
//   lời đáp an toàn soạn sẵn trên máy xử lý. Server chốt chi phí (20 câu / người / ngày, 300 / ngày cả app, chỉ Membership).
import type { StuckKind } from "@/lib/lomiStuckLog";
import type { RiskScan } from "@/lib/lomiRouter";

/** Loại "bí" được chuyển cho Claude. "suggest" (đã gợi ý câu hỏi về app) và "generic_listen" (đang nghe kể) giữ nguyên trên máy. */
const ASK_KINDS: ReadonlySet<StuckKind> = new Set<StuckKind>(["unknown_med", "unknown_care", "fallback", "kb_partial", "health_detail", "mismatch", "not_understood"]);

// Máy chủ báo chưa cài key / hết tiền → tắt cho tới khi tải lại app (đỡ gọi vô ích mỗi câu bí).
let offUntilReload = false;
export const claudeOff = () => offUntilReload;
export const markClaudeOff = () => {
  offUntilReload = true;
};
/** Chỉ dùng trong test. */
export const resetClaudeOff = () => {
  offUntilReload = false;
};

export function claudeEligible(i: { stuck?: StuckKind; question: string; reply: string; risk: RiskScan | null; member: boolean; tarot?: boolean }): boolean {
  if (offUntilReload || !i.member || !i.stuck || i.tarot) return false;
  if (!ASK_KINDS.has(i.stuck)) return false;
  if (i.risk?.any) return false;
  // Câu đáp an toàn / cảnh báo / khủng hoảng soạn sẵn không bao giờ bị thay.
  if (/^(🚨|⚠️|🔥)/u.test(i.reply) || /không phải một mình|115|096 306 1414/u.test(i.reply)) return false;
  const q = i.question.trim();
  const words = q.split(/\s+/).filter(Boolean).length;
  // Mẩu câu cụt ("ừ", "ok", "hihi") → Lomi đáp trên máy như cũ.
  if (words < (i.stuck === "not_understood" ? 4 : 2) || q.length > 1500) return false;
  return true;
}

/** Dòng ghi chú dưới câu trả lời của Claude — nói thật nguồn trả lời. */
export function claudeNote(stuck: StuckKind | undefined, en: boolean): string {
  const med = stuck === "unknown_med" || stuck === "unknown_care" || stuck === "kb_partial" || stuck === "health_detail";
  if (en) return med ? "\n\n_✨ Lomi asked Claude for this one — general information only, not a substitute for a doctor._" : "\n\n_✨ Lomi asked Claude for this one._";
  return med ? "\n\n_✨ Câu này Lomi nhờ Claude trả lời — chỉ để tham khảo, không thay cho bác sĩ._" : "\n\n_✨ Câu này Lomi nhờ Claude trả lời._";
}

/** Lỗi khiến tắt hẳn cho tới lần mở app sau. */
export const isHardOff = (code: unknown) => code === "AI_UNAVAILABLE" || code === "AI_CREDITS";
