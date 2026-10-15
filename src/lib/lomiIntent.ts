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
import { VR, VN } from "@/lib/viMatch";

export type CapDomain = "health" | "heart" | "biz" | "food";
export type Capability = { intent: "capability"; domain: CapDomain; text: string };

// 08/10: hỏi khả năng thì LOMI phải là người làm việc đó ("Lomi có tư vấn…", "e biết… không", "tư vấn… được không")
// hoặc người dùng xin phép hỏi Lomi ("hỏi Lomi về sức khoẻ được không"). Chỉ có "động từ + có…không" ở đâu đó trong
// câu là CHƯA đủ — "thuốc này có giúp hết đau không", "bác sĩ có biết bệnh này không", "anh ấy có biết tình cảm của
// mình không" là hỏi chuyện thật, không phải hỏi Lomi làm được gì.
const LOMI_DOES = VN(/^(?:(?:lomi|em|e|bạn|bot) )?(?:có thể |có biết |có |biết )*(?:tư vấn|hỗ trợ|giúp|biết|chia sẻ|giải đáp|trả lời) /);
const ASK_LOMI = VN(/^(?:(?:a|anh|chị|c|mình|tôi|tui|em|e|t|tớ) )?(?:có thể |có |muốn |cho )*(?:hỏi|tâm sự|nói chuyện)(?: (?:lomi|em|e|bạn))?(?: (?:về chuyện|về|chuyện))? /);
const WHAT_CAN = VN(/\b(làm được gì|làm gì được|làm được những gì|biết làm gì|giúp được gì)\b/);
// "ơ a tưởng e tư vấn sức khoẻ được mà" — người dùng NGỠ là Lomi làm được (câu thật trong nhật ký "Lomi bí" 05/10).
const EXPECT = VN(/^(?:(?:ơ|à|a|ủa|ôi|ơi|ui) )*(?:(?:a|anh|chị|c|mình|tui|tôi|em|e|t) )?(?:tưởng là|tưởng|nghe nói|nghe bảo|thấy bảo) (?=(?:lomi|em|e|bạn) )/);
const ABLE_END = VN(/\b(không|ko|k|hông|hong|chưa|chứ|hả|ha)$/);
const ABLE_OK = VN(/\b(được|dc|đc) (không|ko|k|hông|hong|chứ|hả|ha)$/);
// Nhắc tới người thứ ba → đang kể / hỏi chuyện của họ, không phải hỏi khả năng của Lomi.
const THIRD = VN(/\b(anh ấy|chị ấy|cô ấy|người ấy|người đó|người ta|crush|bác sĩ|bs|dược sĩ)\b/);
// Người dùng đang kể mình bị gì → không phải hỏi khả năng, để luồng sức khoẻ lo.
const PERSONAL = VN(/\b(mình bị|tôi bị|em bị|anh bị|tui bị|đang bị|bị đau|bị sốt|bị ho)\b/);
const DOMAINS: [CapDomain, RegExp][] = [
  ["health", VN(/\b(sức khoẻ|bệnh|thuốc|triệu chứng|y tế|bác sĩ)\b/)],
  ["heart", VN(/\b(tâm sự|tình cảm|tâm lý|tâm lí|chuyện tình)\b/)],
  ["biz", VN(/\b(kinh doanh|bán hàng|mở quán|buôn bán)\b/)],
  ["food", VN(/\b(ăn gì|món ăn|quán ăn|gợi ý món)\b/)],
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
  const n0 = normalizeVi(text).replace(VN(/^(lomi|em|e|bạn) ơi /), "$1 ");
  if (PERSONAL.test(n0)) return null;
  const expect = EXPECT.test(n0) && VN(/\b(được|dc|đc)( (mà|chứ|cơ mà|mà ta))?$/).test(n0);
  // "tưởng e tư vấn sức khoẻ được mà" đọc như "e tư vấn sức khoẻ được không".
  const n = expect ? n0.replace(EXPECT, "").replace(VN(/( (mà|chứ|cơ mà|mà ta))?$/), " khong") : n0;
  // Bỏ từ đệm / xưng hô ở cuối ("… được không nha", "… không e") để đọc đúng dáng câu hỏi.
  const tail = n.replace(VN(/( (nha|nhé|nhe|nè|vậy|ta|nhỉ|à|a|ạ|lomi|em|e|bạn))+$/), "");
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

const PLACE = VN(/\b(quán|tìm|gần đây|gần mình|ở đâu|chỗ nào|địa chỉ|tiệm)\b/);
const HEALTHY = VN(/\b(có hại|có sao|tốt không|có tốt|béo không|mập không|tăng cân|nhiều có|ăn nhiều|calo|bao nhiêu calo|sức khoẻ)\b/);
// 08/10: có bệnh / triệu chứng / kiêng khem trong câu → là câu hỏi sức khoẻ ("đau bụng có nên ăn phở không"), không phải chọn món.
// "đau" / "đâu" bỏ dấu giống nhau nên từ dễ lẫn đọc theo chữ CÓ DẤU; từ không lẫn thì đọc cả dạng không dấu.
const ILL_ACC = VR(/(?<![\p{L}])(đau|bị sốt|sốt cao|bệnh|bị ốm|đang ốm|kiêng|viêm|thuốc|dạ dày|bao tử)(?![\p{L}])/u);
const ILL = VN(/\b(đau bụng|đau dạ dày|đau bao tử|bị bệnh|dị ứng|ngộ độc|tiêu chảy|táo bón|gout|tiểu đường|huyết áp|mỡ máu|mang thai|có bầu|giảm cân|ăn kiêng)\b/);
const STORY = VN(/\b(hôm qua|hôm kia|tối qua|hồi đó|lúc đó|cãi nhau|chia tay)\b/);
const CHOICE = VN(/\b(thèm|thêm|chọn|nên ăn|ăn gì|gì ta|gì đây|gì dậy|gì ngon|nào ngon|loại nào|vị nào|không biết ăn|gợi ý|muốn ăn)\b/);
// 08/10: chưa nhắc món nào mà hỏi "ăn gì / uống gì" theo đủ kiểu ("nay ăn gì ta", "giờ ăn gì", "a đói mà không biết ăn gì",
// "chọn món giúp a") → Lomi gợi ý món (luồng "Hôm nay ăn gì" sẵn có). Nhận theo CẤU TRÚC: (thời điểm) + ăn/uống + gì,
// hoặc không/chưa biết + ăn/uống + gì, hoặc chọn/gợi ý + món — không phải danh sách câu.
const EAT_ASK = VN(/\b(ăn|uống|nhậu|ăn sáng|ăn trưa|ăn tối|ăn vặt|ăn đêm|ăn khuya) (gì|món gì|cái gì)\b/);
const EAT_PICK = VN(/\b(chọn|lựa|gợi ý|đề xuất|bốc|random|chỉ)( (giúp|giùm|dùm|hộ|cho))?( (a|anh|chị|c|mình|tôi|tui|em|e))?( (một|1|vài|mấy))? (món|đồ ăn|đồ uống)\b/);
// Không phải nhờ chọn món: hỏi kiến thức ("ăn gì để đẹp da"), hỏi thăm ("e ăn gì chưa"), hỏi Lomi ("Lomi thích ăn gì"), chuyện đã qua.
const EAT_NOT = VN(/\b(ăn gì cũng|uống gì cũng|ăn gì để|uống gì để|ăn gì cho|uống gì cho|ăn gì tốt|uống gì tốt|ăn gì mà|uống gì mà|nên kiêng|không nên ăn gì|không được ăn gì|vừa ăn gì|đã ăn gì|mới ăn gì|ăn gì chưa|uống gì chưa|ăn gì rồi|hôm qua|tối qua|hồi nãy|hồi sáng|lúc nãy)\b|\b(lomi|em|e|bạn) (thích |hay |muốn |đang |có |sẽ |đã )*(ăn|uống) gì\b/);
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
    if (EAT_ASK.test(n) || EAT_PICK.test(n)) return { intent: "food_suggest", drink: VN(/\b(uống|đồ uống)\b/).test(n) && !VN(/\b(ăn|món ăn|đồ ăn)\b/).test(n) };
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
const NARRATIVE = VN(/\b(anh ấy|chị ấy|cô ấy|người ấy|người yêu|ny|vợ|chồng|bạn trai|bạn gái|crush|sếp|đồng nghiệp|khách|quán (mình|em|anh|tui|tôi|a)|tiệm (mình|em|anh|tui|tôi|a)|shop|bán hàng|doanh thu|hôm qua|hôm kia|hồi đó|lúc đó|cãi nhau|giận|buồn|chán|khóc|mệt|stress|áp lực)\b/);

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
  //   15/10 (audit): nhưng "giờ ĐI ăn gì", "đi uống gì" là rủ đi ăn — trước đây sau một mạch sức khoẻ câu này thành "đang hỏi về chuyện nào".
  if (flow.talk === "health") return VN(/\b(đi ăn|đi uống|ra ngoài ăn|đi nhậu|đi cà phê|đi cf)\b/).test(n) && !VN(/\b(nên|kiêng|được không|bệnh|đau|sốt|ốm)\b/).test(n) ? fc : null;
  // Đang bói / tâm sự / tư vấn kinh doanh: chỉ nhận câu ngắn, hỏi thẳng chuyện ăn uống.
  return n.trim().split(" ").length <= 7 ? fc : null;
}
