// ─────────────────────────────────────────────────────────────────────────────
// CHỦ THỂ SỨC KHOẺ (08/10) — chạy trên máy, không gọi AI.
// "Đang nói chuyện sức khoẻ" KHÁC "đang tâm sự". Trước đây cả hai dùng chung cờ heart ("health"), nên chỉ cần Lomi
// vừa trả lời một câu sức khoẻ là tin kế tiếp ("a hỏi về bệnh gout") bị thư viện tâm sự đáp "Chuyện này làm anh bận
// lòng nhiều không?". File này cho mạch sức khoẻ một trạng thái RIÊNG (Msg.health ở AiAssistant):
//
//   healthSubjectOf(câu)   → câu đang nói về bệnh / tình trạng nào (gout, tiểu đường, huyết áp, dạ dày, gan…)
//   healthTopicReply(...)  → trả lời theo KHÍA CẠNH được hỏi: là gì · nên làm gì · khi nào đi khám;
//                            chỉ nhắc tên bệnh ("a hỏi về bệnh gout", "bệnh gút á") → hỏi lại muốn biết phần nào;
//                            câu nối không nhắc lại tên bệnh ("vậy chữa sao?") → dùng chủ thể đang nói.
//   healthFeeling(câu)     → có tín hiệu CẢM XÚC không ("a lo quá vì bệnh này") — chỉ khi đó mới mở mạch tâm sự.
//
// Không có kiến thức riêng cho từng bệnh ở đây: chủ thể lấy từ hai bảng sẵn có — bảng kiêng cữ (lib/lomiDiet)
// và bảng tình trạng (lib/lomiSymptoms) — nên bệnh nào hai bảng đó có thì ở đây tự có.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { dietName, dietOf } from "@/lib/lomiDiet";
import { condByName, condInfo } from "@/lib/lomiSymptoms";
import { VR, VN, dropNegated } from "@/lib/viMatch";

/** Trạng thái mạch sức khoẻ lưu trên tin của Lomi. Có cờ này = đang nói chuyện sức khoẻ; subject có thể chưa có. */
export type HealthCtx = { subject?: string; label?: string; diet?: string; cond?: string };
export type HealthSubject = Required<Pick<HealthCtx, "subject" | "label">> & Pick<HealthCtx, "diet" | "cond">;
export type HealthAspect = "what" | "care" | "doctor" | "menu";
export type HealthReply = { text: string; quick?: string[]; health: HealthCtx; aspect: HealthAspect };

// Bệnh trong bảng kiêng cữ ↔ tình trạng tương đương trong bảng triệu chứng (chỉ nối khi cùng một bệnh).
const DIET_COND: Record<string, string> = {
  gout: "gout", htn: "highbp", dm: "diabetes", stomach: "gastritis", liver: "liver", anemia: "anemia", dengue: "dengue",
  constip: "constipation", hemorrhoid: "hemorrhoid", allergy: "urticaria", acne: "acne", ibs: "ibs", asthma: "asthma",
  chickenpox: "chickenpox", lowbp: "lowbp", uti: "uti", migraine: "migraine",
};
const COND_DIET = Object.fromEntries(Object.entries(DIET_COND).map(([d, c]) => [c, d]));
// Gọi tên cơ quan thay cho tên bệnh ("a hỏi về gan", "bệnh thận") — đọc CÓ DẤU để "gan" không lẫn "gắn", "gần".
const ORGAN: [RegExp, string][] = [
  [VN(/(?<![\p{L}])gan(?![\p{L}])/u), "liver"],
  [VR(/(?<![\p{L}])thận(?![\p{L}])/u), "kidney"],
  [VR(/(?<![\p{L}])(dạ dày|bao tử)(?![\p{L}])/u), "stomach"],
  [VR(/(?<![\p{L}])tim mạch(?![\p{L}])/u), "heart"],
  [VR(/(?<![\p{L}])tuyến giáp(?![\p{L}])/u), "thyroid"],
];
// Bảng kiêng cữ có vài mục là HOÀN CẢNH chứ không phải bệnh — không coi là chủ thể để hỏi "là gì / chữa sao".
const NOT_DISEASE = new Set(["pregnant", "breastfeed", "wound", "insomnia"]);
const TOPIC_MARK = VN(/\b(hỏi về|hỏi chuyện|nói về|tư vấn về|tìm hiểu về|bệnh|bị)\b/);

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const shortName = (name: string) => name.replace(VR(/^bị\s+/u), "").split(/[(/,]/)[0].trim();

function subjectFrom(diet?: string, cond?: string, condLabel?: string): HealthSubject | null {
  if (diet && NOT_DISEASE.has(diet)) diet = undefined;
  if (!diet && !cond) return null;
  const c = cond ? condInfo(cond) : undefined;
  const label = diet ? shortName(dietName(diet) ?? "") : (condLabel ?? shortName(c?.name ?? "").toLowerCase());
  if (!label) return null;
  return { subject: diet ? `diet:${diet}` : `cond:${cond}`, label, diet, cond };
}
/** Trạng thái mạch sức khoẻ cho một bệnh trong bảng kiêng cữ (sau khi lib/lomiDiet vừa trả lời về bệnh đó). */
export function healthCtxOfDiet(diet: string): HealthCtx {
  return subjectFrom(diet, DIET_COND[diet]) ?? {};
}

/** Câu đang nói về bệnh / tình trạng nào. inHealth = đang ở mạch sức khoẻ (cho phép gọi tắt bằng tên cơ quan). */
export function healthSubjectOf(text0: string, inHealth = false): HealthSubject | null {
  // 20/10 (audit): bỏ phần người dùng CHỐI ("không bị sốt, chỉ hơi mệt") — trước đây "sốt" bị chốt thành bệnh "cảm cúm".
  const text = dropNegated(text0);
  const n = ` ${normalizeVi(text)} `;
  let diet = dietOf(text);
  const byName = condByName(text);
  let cond = byName?.id;
  if (!diet && !cond && (inHealth || TOPIC_MARK.test(n))) {
    const acc = text.normalize("NFC").toLowerCase();
    diet = ORGAN.find(([re]) => re.test(acc))?.[1];
  }
  if (diet && !cond) cond = DIET_COND[diet];
  if (cond && !diet) diet = COND_DIET[cond];
  return subjectFrom(diet, cond, byName?.label);
}

// ── Khía cạnh được hỏi — đọc theo dáng câu hỏi, dùng chung cho mọi bệnh ──
const ASK_WHAT = VN(/\b(là gì|là bệnh gì|là sao|là như thế nào|như thế nào|thế nào|dấu hiệu|triệu chứng|biểu hiện|nhận biết|nguyên nhân|do đâu|tại sao bị|vì sao bị|có nguy hiểm|nguy hiểm không|đáng sợ|đáng lo|đáng ngại|có nặng không|có sao không|có chết không|có lây không|có di truyền)\b/);
// "chữa" bỏ dấu trùng "chưa" → đọc chữ CÓ DẤU; gõ không dấu thì nhận qua cụm "cach chua", "chua benh", "chua tri".
const ASK_CARE = VN(/\b(cách chữa|chữa bệnh|chữa trị|chữa được|chữa khỏi|điều trị|cách trị|trị bệnh|trị được|làm sao|làm gì|nên làm gì|phải làm sao|xử lý|xử lí|chăm sóc|có khỏi|khỏi được|khỏi hẳn|bao lâu khỏi|giảm đau|cho đỡ|cho bớt|cải thiện|thuốc gì|thuốc nào|uống thuốc|dùng thuốc|thuốc trị|thuốc chữa)\b/);
const ASK_CARE_ACC = VR(/(?<![\p{L}])chữa(?![\p{L}])/u);
const ASK_DOCTOR = VN(/\b(đi khám|khám ở đâu|khám khoa nào|khoa nào|cần khám|nên khám|có cần đi viện|đi viện|bác sĩ nào|gặp bác sĩ)\b/);
// Câu hỏi ăn uống / kiêng cữ thuộc về lib/lomiDiet — ở đây không trả lời thay.
const ASK_DIET = VN(/\b(kiêng|ăn gì|uống gì|ăn được|uống được|được ăn|được uống|nên ăn|nên uống|tránh ăn|tránh gì|ăn uống|chế độ ăn|thực đơn)\b/);
const NOTE = "(Kiến thức tham khảo chung — không thay được chẩn đoán và chỉ định của bác sĩ nha 🩺)";
/** Câu hỏi ăn uống / kiêng cữ ("kiêng gì?", "ăn gì được?") — để ghép với bệnh đang nói rồi chuyển cho lib/lomiDiet. */
// Chỉ câu hỏi TRỐNG, ngắn ("kiêng gì?", "nên ăn gì") — "hôm nay ăn gì" là nhờ gợi ý món, không phải hỏi kiêng cữ của bệnh.
export const isDietAsk = (text: string) => {
  const n = ` ${normalizeVi(text)} `;
  return ASK_DIET.test(n) && n.trim().split(" ").length <= 7 && !VN(/\b(hôm nay|tối nay|trưa nay|sáng nay|chiều nay|bây giờ|giờ này|lát nữa)\b/).test(n);
};

function aspectOf(n: string, raw: string): Exclude<HealthAspect, "menu"> | null {
  if (ASK_DIET.test(n)) return null;
  if (ASK_DOCTOR.test(n)) return "doctor";
  // 11/10: "… để làm gì" hỏi MỤC ĐÍCH của một thứ ("uống nước để làm gì"), không phải hỏi "nên làm gì" với bệnh đang nói.
  if (ASK_CARE.test(n.replace(VN(/\bđể làm (gì|chi)\b/g), " ")) || ASK_CARE_ACC.test(raw.normalize("NFC").toLowerCase())) return "care";
  if (ASK_WHAT.test(n)) return "what";
  return null;
}

/** Các phần Lomi THẬT SỰ có để nói về chủ thể này (không mời hỏi thứ mình không biết). */
function chips(s: HealthSubject, skip?: HealthAspect | "diet"): string[] {
  const L = cap(s.label);
  return [s.cond && skip !== "what" && `${L} là gì?`, s.cond && skip !== "care" && `${L} nên làm gì?`, s.diet && skip !== "diet" && `${L} kiêng gì?`].filter(Boolean) as string[];
}

const SELF_HAS = VN(/\b(mình|tôi|tui|em|e|anh|a|chị|tớ) (đang |cũng |mới |hay |vừa )?(bị|mắc|có bệnh)\b|^(đang |mới |vừa )?(bị|mắc) |\b(bác sĩ|bs) (nói|bảo|chẩn đoán|kết luận)\b.*\b(bị|mắc)\b/);
const OTHERS = VN(/\b(mẹ|má|ba|bà|bố|cha|vợ|chồng|con|ông|bà nội|bà ngoại|bạn|người nhà|người thân|sếp|anh ấy|chị ấy|cô ấy|người yêu|ny)\b/);

/**
 * Trả lời một câu về bệnh / tình trạng theo khía cạnh được hỏi. prev = chủ thể sức khoẻ đang nói ở tin trước.
 * only = "aspect": chỉ trả lời khi câu có hỏi khía cạnh cụ thể (gọi TRƯỚC lib/lomiDiet);
 *        "menu": chỉ xử lý câu nhắc tên bệnh mà chưa hỏi gì (gọi SAU các lớp triệu chứng / kiêng cữ).
 * Trả null nếu câu không nói về chủ thể nào Lomi có kiến thức.
 */
export function healthTopicReply(text: string, prev?: HealthCtx, only?: "aspect" | "menu"): HealthReply | null {
  const n = normalizeVi(text);
  if (!n) return null;
  const words = n.split(" ").length;
  const own = healthSubjectOf(text, !!prev);
  const asp = aspectOf(` ${n} `, text);
  // Câu nối không nhắc lại tên bệnh ("vậy chữa sao?", "nó là gì?") → chủ thể đang nói.
  const carried = !own && prev?.subject && prev.label && asp && words <= 8 ? ({ subject: prev.subject, label: prev.label, diet: prev.diet, cond: prev.cond } as HealthSubject) : null;
  const s = own ?? carried;
  if (!s) return null;
  const health: HealthCtx = { subject: s.subject, label: s.label, diet: s.diet, cond: s.cond };
  const c = s.cond ? condInfo(s.cond) : undefined;

  if (asp && only !== "menu") {
    if (!c) return null; // chỉ có phần kiêng cữ → để lib/lomiDiet hoặc để Lomi nói thật là chưa biết
    if (asp === "what")
      return { aspect: "what", health, quick: chips(s, "what"), text: `🩺 **${c.name}** — biểu hiện thường gặp: ${c.about}\n\n${NOTE}` };
    if (asp === "doctor") return { aspect: "doctor", health, quick: chips(s, "doctor"), text: `🧑‍⚕️ **${c.name}:** ${c.doctor}\n\n${NOTE}` };
    return {
      aspect: "care",
      health,
      quick: chips(s, "care"),
      text: [
        `Với **${c.name}**, nói chung nên:\n${c.do.map((x) => `• ${x}`).join("\n")}`,
        `🚫 **Nên tránh:**\n${c.avoid.map((x) => `• ${x}`).join("\n")}`,
        `🧑‍⚕️ ${c.doctor}`,
        "Lomi không kê thuốc hay đưa phác đồ điều trị — dùng thuốc gì, liều bao nhiêu là do bác sĩ quyết định sau khi khám nha.",
        NOTE,
      ].join("\n\n"),
    };
  }
  if (asp || only === "aspect" || !own) return null;
  // Chỉ NHẮC tên bệnh, chưa hỏi gì cụ thể. Câu dài là đang kể chuyện → không chen vào bằng bảng chọn.
  if (words > 9) return null;
  const q = chips(s);
  if (!q.length) return null;
  // Chưa ở mạch sức khoẻ: chỉ chen bảng chọn khi câu thật sự đang hỏi về bệnh ("hỏi về…", "bệnh…", "bị…") hoặc cả câu chỉ là tên bệnh.
  if (!prev && !TOPIC_MARK.test(` ${n} `) && words > 3) return null;
  const parts = [c && `${s.label} là gì`, c && "nên xử lý thế nào", s.diet && "ăn uống cần kiêng gì"].filter(Boolean) as string[];
  const menu = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} hay ${parts[parts.length - 1]}` : parts[0];
  const again = prev?.subject === s.subject;
  const self = SELF_HAS.test(n) && !OTHERS.test(n);
  // Bệnh chỉ có phần kiêng cữ → nói rõ Lomi có gì, không mời hỏi thứ mình chưa biết.
  if (parts.length === 1)
    return { aspect: "menu", health, quick: q, text: `${self ? `Bạn đang bị **${s.label}** hả 🩺` : `À, **${s.label}** nha 😄`} Về ${s.label}, Lomi có phần **ăn uống nên kiêng gì** — bạn muốn xem không? Còn bệnh là gì, điều trị thế nào thì Lomi chưa có thông tin riêng.` };
  return {
    aspect: "menu",
    health,
    quick: q,
    text: again
      ? `Dạ, **${s.label}** nha 👍 Bạn chọn phần muốn biết bên dưới, hoặc hỏi thẳng kiểu “${s.label} kiêng gì” cũng được.`
      : self
        ? `Bạn đang bị **${s.label}** hả 🩺 Bạn muốn biết ${menu}?`
        : `À, bạn đang hỏi về **${s.label}** nha 😄 Bạn muốn biết ${menu}?`,
  };
}

// ── Tín hiệu CẢM XÚC trong một câu về sức khoẻ ──
// "buồn nôn", "buồn ngủ" là triệu chứng; "lo" bỏ dấu dễ lẫn nên chỉ nhận khi đi thành cụm.
const FEEL_ACC = VR(/(?<![\p{L}])(lo lắng|lo quá|lo sợ|lo ghê|rất lo|đang lo|lo(?= (vì|về|cho|là|không|mà))|sợ|hoảng|hoang mang|buồn(?! nôn| ngủ| cười)|khóc|stress|áp lực|chán nản|nản|tuyệt vọng|bất an|suy sụp|tủi thân|sốc|ám ảnh)(?![\p{L}])/u);
const FEEL_PLAIN = VN(/\b(lo lắng|lo quá|lo sợ|rất lo|đang lo|lo vì|lo về|sợ quá|sợ lắm|rất sợ|đang sợ|hoang mang|stress|áp lực|chán nản|tuyệt vọng|bất an|suy sụp|tủi thân)\b/);
// "gout có đáng sợ không?", "có đáng lo không?" là hỏi kiến thức (mức độ nguy hiểm), không phải đang kể cảm xúc.
const FEEL_ASK = VN(/\b(có )?(đáng sợ|đáng lo|đáng ngại)\b.*\b(không|ko|k|hông|hong)\b/);

/**
 * Câu đang HỎI VỀ một bệnh / thuốc cụ thể ("a hỏi về bệnh lupus", "bệnh zona", "thuốc này") dù Lomi chưa có kiến thức về nó.
 * Dùng để Lomi nói thật là chưa biết (và ở lại mạch sức khoẻ), thay vì đáp như đang nghe tâm sự.
 */
export function looksLikeHealthTopic(text: string): boolean {
  const n = normalizeVi(text);
  return VN(/\b(hỏi|tư vấn|nói|tìm hiểu|biết) (về|chuyện|thêm về) (bệnh|thuốc|sức khoẻ|sức khỏe)\b/).test(n) || VN(/^(a |anh |em |e |mình |tôi |tui )?(bệnh|thuốc) \S+( \S+){0,2}( (à|a|hả|ha|nha|nè|đó))?$/).test(n);
}

/** Người dùng đang nói CẢM XÚC của mình (lo, sợ, buồn…) chứ không chỉ hỏi kiến thức. */
export function healthFeeling(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  if (FEEL_ASK.test(n)) return false;
  return FEEL_ACC.test(text.normalize("NFC").toLowerCase()) || FEEL_PLAIN.test(n);
}
