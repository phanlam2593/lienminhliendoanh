// ─────────────────────────────────────────────────────────────────────────────
// Ý ĐỊNH BỔ SUNG (06/10) — chạy trên máy, không gọi AI.
//  • capabilityAsk: hỏi Lomi có làm được việc X không ("e tư vấn sức khỏe a đc k") → trả lời đúng khả năng THẬT.
//  • foodChoice: thèm / chọn một món cụ thể ("thèm pizza mà k biết ăn pizza gì") → hỏi khẩu vị;
//    hỏi chỗ ăn món đó ("pizza nào gần đây") → tìm quán. Dùng danh sách món sẵn có (lib/lomiSearch).
//    Chưa nhắc món nào ("giờ ăn gì", "a đói mà không biết ăn gì") → gợi ý món (08/10).
//  • earlyIntent: hai ý định trên + luật ưu tiên ngữ cảnh đang nói (08/10).
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { detectDish } from "@/lib/lomiSearch";
import { analyzeBody } from "@/lib/lomiSymptoms";
import { detectTarot } from "@/lib/tarot";

export type CapDomain = "health" | "heart" | "biz" | "food";
export type Capability = { intent: "capability"; domain: CapDomain; text: string };

// 08/10: hỏi khả năng thì LOMI phải là người làm việc đó ("Lomi có tư vấn…", "e biết… không", "tư vấn… được không")
// hoặc người dùng xin phép hỏi Lomi ("hỏi Lomi về sức khoẻ được không"). Chỉ có "động từ + có…không" ở đâu đó trong
// câu là CHƯA đủ — "thuốc này có giúp hết đau không", "bác sĩ có biết bệnh này không", "anh ấy có biết tình cảm của
// mình không" là hỏi chuyện thật, không phải hỏi Lomi làm được gì.
const LOMI_DOES = /^(?:(?:lomi|em|e|ban|bot) )?(?:co the |co biet |co |biet )*(?:tu van|ho tro|giup|biet|chia se|giai dap|tra loi) /;
const ASK_LOMI = /^(?:(?:a|anh|chi|c|minh|toi|tui|em|e|t|to) )?(?:co the |co |muon |cho )*(?:hoi|tam su|noi chuyen)(?: (?:lomi|em|e|ban))?(?: (?:ve chuyen|ve|chuyen))? /;
const WHAT_CAN = /\b(lam duoc gi|lam gi duoc|lam duoc nhung gi|biet lam gi|giup duoc gi)\b/;
// "ơ a tưởng e tư vấn sức khoẻ được mà" — người dùng NGỠ là Lomi làm được (câu thật trong nhật ký "Lomi bí" 05/10).
const EXPECT = /^(?:(?:o|a|ua|oi|ui) )*(?:(?:a|anh|chi|c|minh|tui|toi|em|e|t) )?(?:tuong la|tuong|nghe noi|nghe bao|thay bao) (?=(?:lomi|em|e|ban) )/;
const ABLE_END = /\b(khong|ko|k|hong|chua|chu|ha)$/;
const ABLE_OK = /\b(duoc|dc) (khong|ko|k|hong|chu|ha)$/;
// Nhắc tới người thứ ba → đang kể / hỏi chuyện của họ, không phải hỏi khả năng của Lomi.
const THIRD = /\b(anh ay|chi ay|co ay|nguoi ay|nguoi do|nguoi ta|crush|bac si|bs|duoc si)\b/;
// Người dùng đang kể mình bị gì → không phải hỏi khả năng, để luồng sức khoẻ lo.
const PERSONAL = /\b(minh bi|toi bi|em bi|anh bi|tui bi|dang bi|bi dau|bi sot|bi ho)\b/;
const DOMAINS: [CapDomain, RegExp][] = [
  ["health", /\b(suc khoe|benh|thuoc|trieu chung|y te|bac si)\b/],
  ["heart", /\b(tam su|tinh cam|tam ly|tam li|chuyen tinh)\b/],
  ["biz", /\b(kinh doanh|ban hang|mo quan|buon ban)\b/],
  ["food", /\b(an gi|mon an|quan an|goi y mon)\b/],
];
/** Lĩnh vực được nhắc trong vài từ đầu (ngay sau động từ) — không tính lĩnh vực nằm tít cuối câu. */
function domainNear(rest: string, maxWords: number): CapDomain | null {
  const head = rest.split(" ").slice(0, maxWords).join(" ");
  return DOMAINS.find(([, re]) => re.test(head))?.[0] ?? null;
}
const CAP_TEXT: Record<CapDomain, string> = {
  health:
    "Được chứ 😄 Lomi hỗ trợ được các câu hỏi sức khoẻ phổ thông: giải thích triệu chứng, thuốc, xét nghiệm ở mức tham khảo, và giúp nhận biết khi nào nên đi khám hay gọi 115. Lomi không thay bác sĩ, không chẩn đoán và không đưa liều thuốc cho từng người nha. Bạn muốn hỏi chuyện gì về sức khoẻ nè?",
  heart: "Được nè 😊 Lomi nghe bạn tâm sự chuyện tình cảm, gia đình, công việc, và góp vài góc nhìn nếu bạn muốn. Lomi không phải chuyên gia tâm lý, chuyện nặng thì Lomi sẽ gợi ý tìm người hỗ trợ. Bạn muốn kể chuyện gì?",
  biz: "Được chứ 😄 Lomi gợi ý được cách hút khách, giữ khách quen, làm ưu đãi, đặt giá, viết bài đăng cho cửa hàng của bạn. Bạn đang kinh doanh gì nè?",
  food: "Được nè 😋 Lomi gợi ý món ăn và tìm quán thật trong Liên Minh Liên Doanh cho bạn. Bạn đang thèm món gì, hay để Lomi bốc một món?",
};

/** "Lomi có tư vấn sức khoẻ không?", "có hỏi về thuốc được không?" → khả năng của Lomi. */
export function capabilityAsk(text: string): Capability | null {
  const n0 = normalizeVi(text).replace(/^(lomi|em|e|ban) oi /, "$1 ");
  if (PERSONAL.test(n0)) return null;
  const expect = EXPECT.test(n0) && /\b(duoc|dc)( (ma|chu|co ma|ma ta))?$/.test(n0);
  // "tưởng e tư vấn sức khoẻ được mà" đọc như "e tư vấn sức khoẻ được không".
  const n = expect ? n0.replace(EXPECT, "").replace(/( (ma|chu|co ma|ma ta))?$/, " khong") : n0;
  // Bỏ từ đệm / xưng hô ở cuối ("… được không nha", "… không e") để đọc đúng dáng câu hỏi.
  const tail = n.replace(/( (nha|nhe|ne|vay|ta|nhi|a|lomi|em|e|ban))+$/, "");
  const m1 = n.match(LOMI_DOES);
  const m2 = n.match(ASK_LOMI);
  // Phần câu tính từ động từ ("tư vấn sức khoẻ…", "hỏi về thuốc…") — "tâm sự" vừa là động từ vừa là lĩnh vực.
  const fromVerb = (m: RegExpMatchArray) => `${m[0].trim().split(" ").slice(-2).join(" ")} ${n.slice(m[0].length)}`;
  let d: CapDomain | null = null;
  if (WHAT_CAN.test(n)) d = DOMAINS.find(([, re]) => re.test(n))?.[0] ?? null;
  // "Lomi (có) tư vấn <lĩnh vực> … không / được không"
  else if (m1 && ABLE_END.test(tail)) d = domainNear(fromVerb(m1), 7);
  // "(mình) hỏi (Lomi) (về) <lĩnh vực> được không" — lĩnh vực đứng ngay sau, khác "cho hỏi thuốc X uống lúc đói được không"
  else if (m2 && ABLE_OK.test(tail) && n.slice(m2[0].length).split(" ").length <= 5) d = domainNear(fromVerb(m2), 5);
  if (!d) return null;
  // "em có biết tình cảm của anh ấy không", "Lomi biết bác sĩ nào không" — chuyện của người khác.
  if (THIRD.test(n)) return null;
  // "Lomi có tư vấn sức khoẻ không, mình đang đau đầu" → người dùng đang CÓ triệu chứng: chuyện sức khoẻ thắng.
  if (d === "health" && (analyzeBody(text)?.sx.length ?? 0) > 0) return null;
  return { intent: "capability", domain: d, text: CAP_TEXT[d] };
}

export type FoodChoice =
  | { intent: "food_choice" | "food_place"; dish: string; label: string; text?: string; quick?: string[] }
  | { intent: "food_suggest"; drink: boolean };

const PLACE = /\b(quan|tim|gan day|gan minh|o dau|cho nao|dia chi|tiem)\b/;
const HEALTHY = /\b(co hai|co sao|tot khong|co tot|beo khong|map khong|tang can|nhieu co|an nhieu|calo|bao nhieu calo|suc khoe)\b/;
// 08/10: có bệnh / triệu chứng / kiêng khem trong câu → là câu hỏi sức khoẻ ("đau bụng có nên ăn phở không"), không phải chọn món.
// "đau" / "đâu" bỏ dấu giống nhau nên từ dễ lẫn đọc theo chữ CÓ DẤU; từ không lẫn thì đọc cả dạng không dấu.
const ILL_ACC = /(?<![\p{L}])(đau|bị sốt|sốt cao|bệnh|bị ốm|đang ốm|kiêng|viêm|thuốc|dạ dày|bao tử)(?![\p{L}])/u;
const ILL = /\b(dau bung|dau da day|dau bao tu|bi benh|di ung|ngo doc|tieu chay|tao bon|gout|tieu duong|huyet ap|mo mau|mang thai|co bau|giam can|an kieng)\b/;
const STORY = /\b(hom qua|hom kia|toi qua|hoi do|luc do|cai nhau|chia tay)\b/;
const CHOICE = /\b(them|chon|nen an|an gi|gi ta|gi day|gi ngon|nao ngon|loai nao|vi nao|khong biet an|goi y|muon an)\b/;
// 08/10: chưa nhắc món nào mà hỏi "ăn gì / uống gì" theo đủ kiểu ("nay ăn gì ta", "giờ ăn gì", "a đói mà không biết ăn gì",
// "chọn món giúp a") → Lomi gợi ý món (luồng "Hôm nay ăn gì" sẵn có). Nhận theo CẤU TRÚC: (thời điểm) + ăn/uống + gì,
// hoặc không/chưa biết + ăn/uống + gì, hoặc chọn/gợi ý + món — không phải danh sách câu.
const EAT_ASK = /\b(an|uong|nhau|an sang|an trua|an toi|an vat|an dem|an khuya) (gi|mon gi|cai gi)\b/;
const EAT_PICK = /\b(chon|lua|goi y|de xuat|boc|random|chi)( (giup|gium|dum|ho|cho))?( (a|anh|chi|c|minh|toi|tui|em|e))?( (mot|1|vai|may))? (mon|do an|do uong)\b/;
// Không phải nhờ chọn món: hỏi kiến thức ("ăn gì để đẹp da"), hỏi thăm ("e ăn gì chưa"), hỏi Lomi ("Lomi thích ăn gì"), chuyện đã qua.
const EAT_NOT = /\b(an gi cung|uong gi cung|an gi de|uong gi de|an gi cho|uong gi cho|an gi tot|uong gi tot|an gi ma|uong gi ma|nen kieng|khong nen an gi|khong duoc an gi|vua an gi|da an gi|moi an gi|an gi chua|uong gi chua|an gi roi|hom qua|toi qua|hoi nay|hoi sang|luc nay)\b|\b(lomi|em|e|ban) (thich |hay |muon |dang |co |se |da )*(an|uong) gi\b/;
// Vài món có kiểu chọn quen thuộc; món khác dùng câu hỏi khẩu vị chung.
const STYLES: Record<string, string> = {
  pizza: "nhiều thịt (bò, xúc xích), hải sản, nhiều phô mai, hay rau củ thanh nhẹ",
  pho: "bò tái, bò chín, gà, hay đặc biệt đủ thứ",
  lau: "lẩu Thái chua cay, lẩu gà lá é, lẩu bò, hay lẩu nấm thanh nhẹ",
};

/**
 * Thèm / chọn một món cụ thể (food_choice); hỏi chỗ ăn món đó (food_place); chưa nhắc món nào mà hỏi ăn/uống gì (food_suggest).
 * null nếu không phải chuyện chọn món hay đang hỏi chuyện sức khoẻ.
 */
export function foodChoice(text: string): FoodChoice | null {
  const n = ` ${normalizeVi(text)} `;
  if (HEALTHY.test(n) || ILL.test(n) || ILL_ACC.test(text.normalize("NFC").toLowerCase())) return null;
  const d = detectDish(text);
  if (!d) {
    if (EAT_NOT.test(n) || n.trim().split(" ").length > 12) return null;
    if (EAT_ASK.test(n) || EAT_PICK.test(n)) return { intent: "food_suggest", drink: /\b(uong|do uong)\b/.test(n) && !/\b(an|mon an|do an)\b/.test(n) };
    return null;
  }
  // Tên nhóm món có thể là "pizza, đồ Âu" — nói với người dùng thì chỉ dùng tên món chính.
  const label = d.name.split(/[,(]/)[0].trim(); // "Lẩu (gà lá é, lẩu bò…)" → "Lẩu"
  // Đang KỂ một chuyện đã qua có nhắc món ("hôm qua tụi em đi ăn pizza rồi cãi nhau…") → không phải nhờ chọn món.
  if (STORY.test(n)) return null;
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

// ── ƯU TIÊN NGỮ CẢNH ĐANG NÓI (08/10) ───────────────────────────────────────
// Ý định chung (hỏi khả năng, chọn món) KHÔNG được cướp một mạch đang chạy: đang bói, đang tâm sự chuyện tình cảm,
// đang nói chuyện sức khoẻ, đang chọn món, đang tư vấn kinh doanh. AiAssistant.send() gọi đúng hàm này.
export type Flow = {
  /** Lomi vừa hỏi và đang chờ đúng một câu trả lời (câu hỏi bói, loại hình / chủ đề kinh doanh). */
  waiting?: boolean;
  /** Mạch đang nói ở tin trước. */
  talk?: "tarot" | "heart" | "health" | "biz" | "dish";
};
// Câu có người khác / chuyện quán / chuyện đã qua / cảm xúc → đang KỂ, không phải nhờ chọn món.
const NARRATIVE = /\b(anh ay|chi ay|co ay|nguoi ay|nguoi yeu|ny|vo|chong|ban trai|ban gai|crush|sep|dong nghiep|khach|quan (minh|em|anh|tui|toi|a)|tiem (minh|em|anh|tui|toi|a)|shop|ban hang|doanh thu|hom qua|hom kia|hoi do|luc do|cai nhau|gian|buon|chan|khoc|met|stress|ap luc)\b/;

export function earlyIntent(text: string, flow: Flow = {}): Capability | FoodChoice | null {
  if (flow.waiting) return null;
  const cap = capabilityAsk(text);
  if (cap) return cap;
  const fc = foodChoice(text);
  if (!fc) return null;
  // "bói xem tối nay nên ăn phở hay lẩu" là nhờ BÓI, không phải nhờ chọn món.
  if (detectTarot(text)) return null;
  if (!flow.talk || flow.talk === "dish") return fc;
  // Đang trong một mạch: lời KỂ có nhắc món / quán ("quán mình bán pizza, khách không biết chọn loại nào") vẫn thuộc mạch đó.
  const n = ` ${normalizeVi(text)} `;
  if (NARRATIVE.test(n)) return null;
  // Hỏi tìm QUÁN rõ ràng thì nhường (kể cả đang nói chuyện sức khoẻ).
  if (fc.intent === "food_place") return fc;
  // Đang nói chuyện sức khoẻ: "vậy nên ăn gì" là xin lời khuyên sức khoẻ, không phải nhờ chọn món.
  if (flow.talk === "health") return null;
  // Đang bói / tâm sự / tư vấn kinh doanh: chỉ nhận câu ngắn, hỏi thẳng chuyện ăn uống.
  return n.trim().split(" ").length <= 7 ? fc : null;
}
