// Phần LOGIC thuần của cuộc gọi 1-1 (không đụng WebRTC / Supabase) — tách khỏi call.tsx để
// test được bằng vitest (src/test/callLogic.test.ts). call.tsx gọi các hàm này để quyết định.

export type CallPhase = "idle" | "calling" | "incoming" | "connected";
export type CallLogStatus = "answered" | "missed" | "declined" | "busy";

/** Trạng thái ghi vào bảng `calls` khi 1 cuộc gọi kết thúc ở phía mình. */
export function callEndStatus(phase: Exclude<CallPhase, "idle">, reason?: string): CallLogStatus {
  if (phase === "connected") return "answered";
  if (reason === "declined") return "declined";
  if (reason === "busy") return "busy";
  return "missed";
}

export type OfferDecision =
  | "ring" // đang rảnh → đổ chuông
  | "busy" // đang bận cuộc khác → báo bận
  | "yield" // nhường: bỏ lượt gọi đi của mình, trả lời offer của họ
  | "hold" // giữ vai người gọi: gửi lại offer của mình để bên kia nhường
  | "duplicate" // offer lặp của cuộc đang xử lý → bỏ qua
  | "blocked"; // mình đã chặn người này → im lặng bỏ qua

export interface OfferContext {
  myId: string;
  fromId: string;
  incomingCallId: string;
  phase: CallPhase;
  curCallId?: string | null;
  curPeerId?: string | null;
  /** callId mà mình ĐANG trả lời (đã vào connectAsCallee) — để nhận ra offer lặp. */
  calleeOfCallId?: string | null;
  blocked?: boolean;
}

/**
 * Quyết định khi nhận 1 "offer".
 *
 * Hai người bấm gọi nhau cùng lúc (glare): trước đây CẢ HAI cùng "nhường" → cả hai thành người
 * nghe, không ai còn giữ offer → "đang kết nối" rồi thất bại. Giờ phân vai cố định theo id:
 * id NHỎ hơn giữ vai người gọi (hold, gửi lại offer), id LỚN hơn nhường (yield).
 * Riêng trường hợp bên kia "Nghe" qua đường trễ bằng ĐÚNG callId của mình thì mình luôn nhường.
 */
export function decideOnOffer(c: OfferContext): OfferDecision {
  if (c.blocked) return "blocked";
  if (c.phase === "idle") return "ring";
  const samePeer = !!c.curPeerId && c.curPeerId === c.fromId;
  if (samePeer && c.calleeOfCallId) return "duplicate";
  if (c.curCallId && c.curCallId === c.incomingCallId) {
    return c.phase === "calling" && samePeer ? "yield" : "duplicate";
  }
  if (c.phase === "calling" && samePeer) return c.myId < c.fromId ? "hold" : "yield";
  return "busy";
}

/** Bước async (xin mic, lấy TURN, tạo SDP) xong thì cuộc gọi này còn là cuộc đang chạy không? */
export function stillSameCall(
  cur: { status: CallPhase; callId?: string | null },
  callId: string,
  allowed: CallPhase[] = ["calling", "incoming", "connected"],
): boolean {
  return cur.status !== "idle" && cur.callId === callId && allowed.includes(cur.status);
}

/** Dòng "ringing" trong DB đã quá hạn đổ chuông (người gọi đóng app giữa chừng) → coi như nhỡ. */
export function isStaleRinging(status: string, createdAtIso: string, now: number, ringTimeoutMs: number): boolean {
  if (status !== "ringing") return false;
  const t = new Date(createdAtIso).getTime();
  return Number.isNaN(t) || now - t > ringTimeoutMs + 15_000;
}

/** Trạng thái hiển thị của 1 dòng `calls` (dòng "ringing" quá hạn hiện như cuộc nhỡ). */
export function displayCallStatus(
  status: string,
  createdAtIso: string,
  now: number,
  ringTimeoutMs = 30_000,
): CallLogStatus | "ringing" {
  if (status === "ringing") return isStaleRinging(status, createdAtIso, now, ringTimeoutMs) ? "missed" : "ringing";
  if (status === "answered" || status === "declined" || status === "busy") return status;
  return "missed";
}
