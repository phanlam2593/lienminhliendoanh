// 20/11 (Kir duyệt — "hướng lai"): Lomi trả lời bằng thư viện trên máy trước; chỉ câu Lomi BÍ mới nhờ Claude (edge function lomi-claude).
//   Không bao giờ nhờ Claude khi câu có dấu hiệu khủng hoảng / cấp cứu / bị hại / dấu hiệu đỏ y khoa — những câu đó luôn do
//   lời đáp an toàn soạn sẵn trên máy xử lý. Server chốt chi phí (20 câu / người / ngày, 300 / ngày cả app, chỉ Membership gọi Claude;
//   câu đã có trong thư viện lomi_claude_answers thì ai đăng nhập cũng nhận được, không tốn lượt).
//   20/11 (Kir): bỏ dòng ghi chú "Lomi nhờ Claude trả lời" — câu trả lời hiện như Lomi nói.
import type { StuckKind } from "@/lib/lomiStuckLog";
import type { RiskScan } from "@/lib/lomiRouter";
import { normalizeVi } from "@/lib/lomiFaq";

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

// 20/11 (Kir): chỉ 4 mục chính của Lomi (tâm sự · sức khoẻ · app · Khác: Tarot / tìm quán / kinh doanh / trò chuyện).
//   Câu RÕ RÀNG ngoài phạm vi (viết code, giải bài tập, dịch văn bản, viết bài văn…) không gửi đi luôn — đỡ tốn lượt.
//   Câu khó đoán thì máy chủ để Claude tự gắn nhãn ngoài phạm vi, và nhớ lại để lần sau khỏi hỏi.
const OFF_TOPIC =
  /\b(code|coding|lap trinh|python|javascript|typescript|java|html|css|sql|php|c\+\+|react|nodejs|thuat toan|debug|bug code|viet ham|script|excel cong thuc|cong thuc excel|giai (bai tap|phuong trinh|toan|de)|bai tap (toan|ly|hoa|tieng anh|ve nha)|tinh (dao ham|tich phan)|dich (cau|doan|bai|van ban|giup|ho|sang|qua) |translate|viet (bai van|bai luan|essay|tieu luan|luan van|bao cao|hop dong|cv)|soan (bai|hop dong|van ban|giao an)|lam (bai tap|luan van|tieu luan) )/;
export const OFF_TOPIC_REPLY =
  "Phần này nằm ngoài những gì Lomi giúp được nè 🙏 Lomi chuyên **tâm sự – tình cảm**, **sức khoẻ**, **cách dùng iLomi**, và mấy chuyện như **bói Tarot, tìm quán ở Đà Lạt, kinh doanh nhỏ, nấu ăn**. Bạn có chuyện gì trong mấy mục đó thì hỏi Lomi liền nha!";
export const offTopic = (q: string) => OFF_TOPIC.test(` ${normalizeVi(q)} `);

export function claudeEligible(i: { stuck?: StuckKind; question: string; reply: string; risk: RiskScan | null; tarot?: boolean }): boolean {
  if (offUntilReload || !i.stuck || i.tarot) return false;
  if (!ASK_KINDS.has(i.stuck)) return false;
  if (i.risk?.any) return false;
  // Câu đáp an toàn / cảnh báo / khủng hoảng soạn sẵn không bao giờ bị thay.
  if (/^(🚨|⚠️|🔥)/u.test(i.reply) || /không phải một mình|115|096 306 1414/u.test(i.reply)) return false;
  const q = i.question.trim();
  const words = q.split(/\s+/).filter(Boolean).length;
  // Mẩu câu cụt ("ừ", "ok", "hihi") → Lomi đáp trên máy như cũ.
  if (words < (i.stuck === "not_understood" ? 4 : 2) || q.length > 1500) return false;
  if (offTopic(q)) return false;
  return true;
}

/** Lỗi khiến tắt hẳn cho tới lần mở app sau. */
export const isHardOff = (code: unknown) => code === "AI_UNAVAILABLE" || code === "AI_CREDITS";
