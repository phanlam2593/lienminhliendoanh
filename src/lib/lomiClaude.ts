// 20/11 (Kir duyệt — "hướng lai"): Lomi trả lời bằng thư viện trên máy trước; chỉ câu Lomi BÍ mới nhờ Claude (edge function lomi-claude).
//   Không bao giờ nhờ Claude khi câu có dấu hiệu khủng hoảng / cấp cứu / bị hại / dấu hiệu đỏ y khoa — những câu đó luôn do
//   lời đáp an toàn soạn sẵn trên máy xử lý. Server chốt chi phí (20 câu / người / ngày, 300 / ngày cả app, chỉ Membership gọi Claude;
//   câu đã có trong thư viện lomi_claude_answers thì ai đăng nhập cũng nhận được, không tốn lượt).
//   20/11 (Kir): bỏ dòng ghi chú "Lomi nhờ Claude trả lời" — câu trả lời hiện như Lomi nói.
import type { StuckKind } from "@/lib/lomiStuckLog";
import type { RiskScan } from "@/lib/lomiRouter";
import { normalizeVi } from "@/lib/lomiFaq";
import { LOMI_TABS, type LomiTab } from "@/lib/lomiTab";

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
  /\b(code|coding|lap trinh|python|javascript|typescript|java|html|css|sql|php|c\+\+|react|nodejs|thuat toan|debug|bug code|viet ham|script|excel cong thuc|cong thuc excel|giai (bai tap|phuong trinh|toan|de)|bai tap (toan|ly|hoa|tieng anh|ve nha)|tinh (dao ham|tich phan)|dich (cau|doan|bai|van ban|giup|ho|sang|qua) |translate|viet (bai van|bai luan|essay|tieu luan|luan van|bao cao|hop dong|cv)|soan (bai|hop dong|van ban|giao an)|lam (bai tap|luan van|tieu luan) |thu cung|thu y|nuoi (meo|cho canh|ca koi|ca canh|ca vang|chim|hamster|tho canh|bo sat|ran canh)|ca koi|ca canh|(cach|tu|lam sao|huong dan) sua (xe|xe may|o to|dien thoai|may tinh|laptop|tivi|tu lanh|may giat|dieu hoa|may lanh|voi nuoc|dien nha)|(xe may|o to|dien thoai|laptop|may tinh|tivi|tu lanh|may giat) (bi )?(chet may|khong len nguon|hu|hong|loi) |(mua|ban|dau tu|choi|luot song) (chung khoan|co phieu|crypto|bitcoin|coin|tien ao|tien dien tu)|(chung khoan|co phieu|bitcoin|crypto) (nao|gi|hom nay|bao nhieu|tang|giam)|gia (bitcoin|coin|vang hom nay|vang bao nhieu)|forex|ngoai hoi|ty gia|ti gia|ty so|ti so|keo (bong|nha cai)|soi keo|lich thi dau|ket qua (bong da|tran)|xo so|xs(mb|mn|mt)|so de|lo de|du bao thoi tiet|thoi tiet (ngay mai|hom nay|tuan nay|tuan sau)|lam (ho chieu|passport|visa|cccd|can cuoc|bang lai|giay phep lai xe|so do|so hong|khai sinh)|thu tuc (ly hon|sang ten|cong chung)|cai (win|windows|office|phan mem|driver)|crack|ban quyen win|reset (iphone|dien thoai|may)|root (may|android)|jailbreak|wifi (yeu|cham|bi loi)|cach choi (lien quan|lol|pubg|free fire|genshin|valorant|minecraft)|len do|build (tuong|nhan vat|do)|nap (game|the game)|thu do cua|dan so (cua|the gioi|viet nam)|chien tranh the gioi|ai phat minh|cong thuc hoa hoc|dinh luat |thuyet (tien hoa|tuong doi|big bang|vu no lon|luong tu|nhat tam|dia tam|day)|(co hoc|vat ly|may tinh) luong tu|ho den|vu tru (hinh thanh|ra doi|bat dau)|giai thich (thuyet|dinh ly|dinh luat|cong thuc) )/;
export const OFF_TOPIC_REPLY =
  "Phần này nằm ngoài những gì Lomi giúp được nè 🙏 Lomi chuyên **tâm sự – tình cảm**, **sức khoẻ**, **cách dùng iLomi**, và mấy chuyện như **bói Tarot, tìm quán, chỗ chơi quanh bạn, kinh doanh nhỏ, nấu ăn**. Bạn có chuyện gì trong mấy mục đó thì hỏi Lomi liền nha!";
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

/**
 * 25/11 (Kir): người dùng đã chọn một chủ đề (Sức khoẻ, Ăn chơi, Nấu ăn, Tarot, Kinh doanh, Hỏi về app) mà Lomi trên máy chỉ đáp được
 * câu trò chuyện chung → nhờ Claude đọc lại câu đó theo chủ đề. "Tâm sự" thì câu trò chuyện chung là đúng chỗ, không chuyển.
 */
export function tabClaudeEligible(i: { tab: LomiTab | null; sense: boolean; question: string; risk: RiskScan | null }): boolean {
  if (offUntilReload || !i.tab || i.tab === "heart" || !i.sense) return false;
  if (i.risk?.any) return false;
  const q = i.question.trim();
  if (q.split(/\s+/).filter(Boolean).length < 3 || q.length > 1500) return false;
  return !offTopic(q);
}
/** Ghi chú chủ đề đang chọn, gắn sau câu gửi Claude. */
export function withTabHint(q: string, tab: LomiTab): string {
  const t = LOMI_TABS.find((x) => x.id === tab);
  return t ? `${q}\n\n(Ghi chú của app: người dùng đang bấm chọn chủ đề "${t.label}" — hiểu câu trên theo chủ đề này nếu hợp lý, trả lời đúng vào đó.)` : q;
}

// ── 27/11 (Kir: "tâm sự / chuyện đời thường để AI lo, máy giữ sức khoẻ – Tarot – app"; chọn Sonnet; chưa tính Membership) ──────────
// Tab "Tâm sự": câu đáp KIỂU TRÒ CHUYỆN do AI viết (edge function lomi-claude, mode "talk"). Máy vẫn chạy trước và GIỮ:
//   • mọi câu đáp an toàn / khủng hoảng / cấp cứu / bị hại (và cả lượt ngay sau một câu hỏi han an toàn — vd Lomi hỏi
//     "bạn có đang nghĩ tới chuyện không muốn sống không?" → câu "có" do máy xử lý, không đưa AI đoán);
//   • câu đáp có cấu trúc: thẻ sức khoẻ / thuốc / thảo dược / kiêng ăn, Tarot, tìm quán, tư vấn kinh doanh, câu hỏi về app,
//     bài tập tâm lý đang làm dở, chẩn đoán lỗi app.
//   AI lỗi / hết lượt / người dùng không đồng ý gửi → giữ câu đáp trên máy như cũ.
const SAFETY_TEXT = /^(🚨|⚠️|🔥)|không phải một mình|không một mình|\b115\b|096 306 1414|\b113\b|\b111\b/u;
type TalkMsg = {
  role: "user" | "assistant";
  content: string;
  tarot?: unknown; tarotAwait?: unknown; tarotSpread?: unknown; tarotCard?: unknown; tarotRef?: unknown; tarotGate?: unknown; tarotBack?: unknown;
  biz?: unknown; bizPick?: unknown; bizTopicPick?: unknown;
  places?: unknown; search?: unknown; searchAsk?: unknown; dishPick?: unknown; dishAsk?: unknown; dish?: unknown;
  faqId?: unknown; med?: unknown; drug?: unknown; herb?: unknown; diet?: unknown; src?: unknown; foodRev?: unknown;
  harm?: unknown; risk?: unknown; therapy?: unknown; issue?: unknown; taught?: unknown;
  quick?: string[];
};
const structured = (m?: TalkMsg) =>
  !!m && !!(m.tarot || m.tarotAwait || m.tarotSpread || m.tarotCard || m.tarotRef || m.tarotGate || m.tarotBack || m.biz || m.bizPick || m.bizTopicPick ||
    m.places || m.search || m.searchAsk || m.dishPick || m.dishAsk || m.dish || m.faqId || m.med || m.drug || m.herb || m.diet || m.src || m.foodRev ||
    m.harm || m.risk || m.therapy || m.issue || m.taught);
export function talkEligible(i: { tab: LomiTab | null; reply: TalkMsg; prev?: TalkMsg; question: string; risk: RiskScan | null }): boolean {
  if (offUntilReload || i.tab !== "heart") return false;
  if (i.risk?.any) return false;
  if (SAFETY_TEXT.test(i.reply.content) || (i.prev && SAFETY_TEXT.test(i.prev.content))) return false;
  if (structured(i.reply)) return false;
  // Đang làm dở một luồng có cấu trúc (bài tập tâm lý, tư vấn kinh doanh, chọn món…) → để máy đi tiếp luồng đó.
  if (i.prev && (i.prev.therapy || i.prev.bizPick || i.prev.bizTopicPick || i.prev.dishPick || i.prev.dishAsk || i.prev.searchAsk || i.prev.tarotAwait || i.prev.tarotSpread || i.prev.issue)) return false;
  const q = i.question.trim();
  if (!q || q.length > 1500) return false;
  return !offTopic(q);
}
// ── 28/11 (Kir duyệt: "AI hiểu câu trước ở mọi tab" — 120 câu bẫy của ChatGPT: máy hiểu sai rõ 31 câu, lệch ý 17) ─────────────────
// Các tab trừ Tâm sự: AI (lomi-claude mode "route") đọc câu + ngữ cảnh trước, rồi HOẶC viết lại câu cho phần trên máy (thẻ sức khoẻ có
//   nguồn, tìm chỗ, trải bài Tarot khi người dùng tự xin, câu hỏi về app), HOẶC tự trả lời (nấu ăn, kinh doanh, trò chuyện…).
//   Máy vẫn chạy TRƯỚC phần an toàn: câu nguy hiểm / khủng hoảng / cấp cứu / bị hại không gửi đi. Đang làm dở một luồng có cấu trúc
//   (chọn loại hình, chọn món, rút bài, bài tập tâm lý…) hoặc bấm chip gợi ý → để máy đi tiếp như cũ.
export function routeEligible(i: { tab: LomiTab | null; prev?: TalkMsg; typed: string; risk: RiskScan | null; danger: boolean }): boolean {
  if (offUntilReload || i.tab === "heart") return false;
  if (i.danger || i.risk?.any) return false;
  if (i.prev && SAFETY_TEXT.test(i.prev.content)) return false;
  const p = i.prev;
  if (p && (p.therapy || p.bizPick || p.bizTopicPick || p.dishPick || p.dishAsk || p.searchAsk || p.tarotAwait || p.tarotSpread || p.issue)) return false;
  const q = i.typed.trim();
  if (!q || q.length > 1500) return false;
  if (p?.quick?.some((c) => c.trim().toLowerCase() === q.toLowerCase())) return false;
  return !offTopic(q);
}
export type RouteKind = "health" | "place" | "tarot" | "app";
export type RouteResult = { do: "reply"; text: string } | { do: "local"; q: string; kind?: RouteKind; text?: string };
export function parseRoute(r: unknown): RouteResult | null {
  const o = r as { do?: unknown; text?: unknown; q?: unknown; kind?: unknown } | null;
  if (o?.do === "reply" && typeof o.text === "string" && o.text.trim()) return { do: "reply", text: o.text.trim() };
  if (o?.do === "local" && typeof o.q === "string" && o.q.trim() && o.q.length <= 400) {
    const kind = (["health", "place", "tarot", "app"] as const).find((k) => k === o.kind);
    const text = typeof o.text === "string" && o.text.trim() ? o.text.trim() : undefined;
    return { do: "local", q: o.q.trim(), ...(kind ? { kind } : {}), ...(text ? { text } : {}) };
  }
  return null;
}
type KindMsg = TalkMsg & { sx?: string[]; tarotGate?: unknown };
/**
 * Câu máy trả lời cho câu AI viết lại có ĐÚNG loại việc AI đã nhận ra không (đo 28/11: câu viết lại sạch vẫn có lúc bị máy đọc lệch —
 * "tìm chỗ chill thư giãn" → thẻ Kỹ thuật thở, "tôi ăn vào thấy khó chịu bụng" → câu dỗ nóng giận). Lệch → dùng câu dự phòng của AI.
 * Câu đáp an toàn / cấp cứu luôn được giữ.
 */
export function routeKindOk(kind: RouteKind | undefined, m: KindMsg): boolean {
  if (!kind || SAFETY_TEXT.test(m.content)) return true;
  if (kind === "health") return !!(m.med || m.drug || m.herb || m.diet || m.foodRev || m.src || (m.sx && m.sx.length));
  if (kind === "place") return !!(m.places || m.search || m.searchAsk || m.dishAsk || m.dishPick || m.dish);
  if (kind === "tarot") return !!(m.tarot || m.tarotAwait || m.tarotSpread || m.tarotGate);
  return !!m.faqId;
}
/** 27/11 tối (Kir: "auto"): không còn hộp hỏi đồng ý — AI tự bật. Giữ khoá tắt "no" trên máy (bộ test dùng để chạy phần trên máy). */
const TALK_OK_KEY = (uid: string) => `lomi_talk_ai_${uid}`;
export function talkConsent(uid: string): "yes" | "no" | null {
  try {
    const v = localStorage.getItem(TALK_OK_KEY(uid));
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}
