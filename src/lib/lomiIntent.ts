// ─────────────────────────────────────────────────────────────────────────────
// Ý ĐỊNH BỔ SUNG (06/10) — chạy trên máy, không gọi AI.
//  • capabilityAsk: hỏi Lomi có làm được việc X không ("e tư vấn sức khỏe a đc k") → trả lời đúng khả năng THẬT.
//  • foodChoice: thèm / chọn một món cụ thể ("thèm pizza mà k biết ăn pizza gì") → hỏi khẩu vị;
//    hỏi chỗ ăn món đó ("pizza nào gần đây") → tìm quán. Dùng danh sách món sẵn có (lib/lomiSearch).
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { detectDish } from "@/lib/lomiSearch";

export type CapDomain = "health" | "heart" | "biz" | "food";
export type Capability = { intent: "capability"; domain: CapDomain; text: string };

const CAP_VERB = /\b(tu van|hoi|biet|giup|ho tro|lam duoc gi|lam gi duoc|chia se)\b/;
const CAP_ABLE = /\b(duoc khong|duoc ko|dc khong|dc k|co .*khong|biet .*khong|lam duoc gi|lam gi duoc|duoc hong|duoc chu)\b/;
// Người dùng đang kể mình bị gì → không phải hỏi khả năng, để luồng sức khoẻ lo.
const PERSONAL = /\b(minh bi|toi bi|em bi|anh bi|tui bi|dang bi|bi dau|bi sot|bi ho)\b/;
const DOMAINS: [CapDomain, RegExp][] = [
  ["health", /\b(suc khoe|benh|thuoc|trieu chung|y te|bac si)\b/],
  ["heart", /\b(tam su|tinh cam|tam ly|tam li|chuyen tinh)\b/],
  ["biz", /\b(kinh doanh|ban hang|mo quan|buon ban)\b/],
  ["food", /\b(an gi|mon an|quan an|goi y mon)\b/],
];
const CAP_TEXT: Record<CapDomain, string> = {
  health:
    "Được chứ 😄 Lomi hỗ trợ được các câu hỏi sức khoẻ phổ thông: giải thích triệu chứng, thuốc, xét nghiệm ở mức tham khảo, và giúp nhận biết khi nào nên đi khám hay gọi 115. Lomi không thay bác sĩ, không chẩn đoán và không đưa liều thuốc cho từng người nha. Bạn muốn hỏi chuyện gì về sức khoẻ nè?",
  heart: "Được nè 😊 Lomi nghe bạn tâm sự chuyện tình cảm, gia đình, công việc, và góp vài góc nhìn nếu bạn muốn. Lomi không phải chuyên gia tâm lý, chuyện nặng thì Lomi sẽ gợi ý tìm người hỗ trợ. Bạn muốn kể chuyện gì?",
  biz: "Được chứ 😄 Lomi gợi ý được cách hút khách, giữ khách quen, làm ưu đãi, đặt giá, viết bài đăng cho cửa hàng của bạn. Bạn đang kinh doanh gì nè?",
  food: "Được nè 😋 Lomi gợi ý món ăn và tìm quán thật trong Liên Minh Liên Doanh cho bạn. Bạn đang thèm món gì, hay để Lomi bốc một món?",
};

/** "Lomi có tư vấn sức khoẻ không?", "có hỏi về thuốc được không?" → khả năng của Lomi. */
export function capabilityAsk(text: string): Capability | null {
  const n = ` ${normalizeVi(text)} `;
  if (PERSONAL.test(n)) return null;
  const cap = (CAP_VERB.test(n) && CAP_ABLE.test(n)) || /\blam duoc gi\b/.test(n);
  if (!cap) return null;
  const d = DOMAINS.find(([, re]) => re.test(n))?.[0];
  return d ? { intent: "capability", domain: d, text: CAP_TEXT[d] } : null;
}

export type FoodChoice = { intent: "food_choice" | "food_place"; dish: string; label: string; text?: string; quick?: string[] };

const PLACE = /\b(quan|tim|gan day|gan minh|o dau|cho nao|dia chi|tiem)\b/;
const HEALTHY = /\b(co hai|co sao|tot khong|co tot|beo khong|map khong|tang can|nhieu co|an nhieu|calo|bao nhieu calo|suc khoe)\b/;
const CHOICE = /\b(them|chon|nen an|an gi|gi ta|gi day|gi ngon|nao ngon|loai nao|vi nao|khong biet an|goi y|muon an)\b/;
// Vài món có kiểu chọn quen thuộc; món khác dùng câu hỏi khẩu vị chung.
const STYLES: Record<string, string> = {
  pizza: "nhiều thịt (bò, xúc xích), hải sản, nhiều phô mai, hay rau củ thanh nhẹ",
  pho: "bò tái, bò chín, gà, hay đặc biệt đủ thứ",
  lau: "lẩu Thái chua cay, lẩu gà lá é, lẩu bò, hay lẩu nấm thanh nhẹ",
};

/** Thèm / chọn một món cụ thể; hoặc hỏi chỗ ăn món đó. null nếu không nhắc món nào hay đang hỏi chuyện sức khoẻ. */
export function foodChoice(text: string): FoodChoice | null {
  const d = detectDish(text);
  if (!d) return null;
  const n = ` ${normalizeVi(text)} `;
  if (HEALTHY.test(n)) return null;
  const label = (d as { name?: string; label?: string }).name ?? (d as { label?: string }).label ?? d.id;
  if (PLACE.test(n)) return { intent: "food_place", dish: d.id, label };
  if (!CHOICE.test(n)) return null;
  const style = STYLES[d.id];
  return {
    intent: "food_choice",
    dish: d.id,
    label,
    text: `Thèm ${label.toLowerCase()} mà chưa biết chọn gì hả 😆 ${style ? `Bạn thích kiểu nào: ${style}?` : "Bạn thích vị đậm đà, cay, hay thanh nhẹ để Lomi chọn cho?"} Hoặc để Lomi tìm quán ${label.toLowerCase()} gần bạn luôn nha.`,
    quick: [`🔎 Tìm quán ${label.toLowerCase()}`],
  };
}
