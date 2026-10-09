// ─────────────────────────────────────────────────────────────────────────────
// NHẬT KÝ "LOMI BÍ" KÈM HỘI THOẠI (09/10, theo ý Kir)
// Bất cứ lúc nào Lomi bí khi ADMIN hỏi thử → tự ghi lên bảng lomi_stuck_log: câu hỏi, câu Lomi đáp, vài lượt trước đó và LOẠI bí.
// Admin (hoặc Claude) vào xem hội thoại thật rồi sửa đúng chỗ. Người dùng thường không bị ghi bảng này
// (họ vẫn chỉ vào lomi_unanswered: gộp câu trùng, không lưu người hỏi / hội thoại).
// Xem supabase/migrations/20261009130000_lomi_stuck_log.sql
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";

/** Loại "bí" — để lọc khi xem lại. */
export type StuckKind =
  | "unknown_med" // hỏi y khoa mà chưa có kiến thức đã kiểm chứng
  | "unknown_care" // đang theo chuyện người ốm, hỏi điều chưa có kiến thức
  | "not_understood" // câu kể / mẩu câu Lomi không đọc được
  | "fallback" // rơi xuống câu đáp chung "ngoài phạm vi"
  | "suggest" // chỉ đoán được vài câu hỏi thường gặp để mời chọn
  | "generic_listen" // chỉ đáp "Lomi nghe nè, kể thêm đi" mà không nhận ra nội dung
  | "health_detail" // ghi nhận chi tiết sức khoẻ nhưng chưa có dữ liệu riêng
  | "kb_partial"; // có chủ đề trong kho kiến thức nhưng chưa có đúng phần được hỏi

export type StuckEntry = { kind: StuckKind; question: string; reply: string; context: { r: "u" | "a"; t: string }[] };

type Sink = (e: StuckEntry) => void;
let sink: Sink | null = null;
/** Dùng trong test / khi Claude chạy thử: nhận mọi mục "bí" (không cần đăng nhập admin). */
export function setStuckSink(s: Sink | null) {
  sink = s;
}

const db = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };

/** Ghi 1 lượt bí. admin=false → chỉ gọi sink (nếu có), không gửi gì lên máy chủ. Mọi lỗi mạng bị bỏ qua. */
export function recordStuck(e: StuckEntry, admin: boolean) {
  const clean: StuckEntry = {
    kind: e.kind,
    question: e.question.trim().slice(0, 500),
    reply: e.reply.slice(0, 1500),
    context: e.context.slice(-8).map((c) => ({ r: c.r, t: c.t.slice(0, 400) })),
  };
  if (!clean.question) return;
  try {
    sink?.(clean);
  } catch {
    /* sink của test không được làm hỏng chat */
  }
  if (!admin) return;
  void db.rpc("lomi_log_stuck", { _kind: clean.kind, _question: clean.question, _reply: clean.reply, _context: clean.context }).then(
    () => undefined,
    () => undefined,
  );
}
