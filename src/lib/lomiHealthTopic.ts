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
  [/(?<![\p{L}])gan(?![\p{L}])/u, "liver"],
  [/(?<![\p{L}])thận(?![\p{L}])/u, "kidney"],
  [/(?<![\p{L}])(dạ dày|bao tử)(?![\p{L}])/u, "stomach"],
  [/(?<![\p{L}])tim mạch(?![\p{L}])/u, "heart"],
  [/(?<![\p{L}])tuyến giáp(?![\p{L}])/u, "thyroid"],
];
// Bảng kiêng cữ có vài mục là HOÀN CẢNH chứ không phải bệnh — không coi là chủ thể để hỏi "là gì / chữa sao".
const NOT_DISEASE = new Set(["pregnant", "breastfeed", "wound", "insomnia"]);
const TOPIC_MARK = /\b(hoi ve|hoi chuyen|noi ve|tu van ve|tim hieu ve|benh|bi)\b/;

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const shortName = (name: string) => name.replace(/^bị\s+/u, "").split(/[(/,]/)[0].trim();

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
export function healthSubjectOf(text: string, inHealth = false): HealthSubject | null {
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
const ASK_WHAT = /\b(la gi|la benh gi|la sao|la nhu the nao|nhu the nao|the nao|dau hieu|trieu chung|bieu hien|nhan biet|nguyen nhan|do dau|tai sao bi|vi sao bi|co nguy hiem|nguy hiem khong|dang so|dang lo|dang ngai|co nang khong|co sao khong|co chet khong|co lay khong|co di truyen)\b/;
// "chữa" bỏ dấu trùng "chưa" → đọc chữ CÓ DẤU; gõ không dấu thì nhận qua cụm "cach chua", "chua benh", "chua tri".
const ASK_CARE = /\b(cach chua|chua benh|chua tri|chua duoc|chua khoi|dieu tri|cach tri|tri benh|tri duoc|lam sao|lam gi|nen lam gi|phai lam sao|xu ly|cham soc|co khoi|khoi duoc|khoi han|bao lau khoi|giam dau|cho do|cho bot|cai thien|thuoc gi|thuoc nao|uong thuoc|dung thuoc|thuoc tri|thuoc chua)\b/;
const ASK_CARE_ACC = /(?<![\p{L}])chữa(?![\p{L}])/u;
const ASK_DOCTOR = /\b(di kham|kham o dau|kham khoa nao|khoa nao|can kham|nen kham|co can di vien|di vien|bac si nao|gap bac si)\b/;
// Câu hỏi ăn uống / kiêng cữ thuộc về lib/lomiDiet — ở đây không trả lời thay.
const ASK_DIET = /\b(kieng|an gi|uong gi|an duoc|uong duoc|duoc an|duoc uong|nen an|nen uong|tranh an|tranh gi|an uong|che do an|thuc don)\b/;
const NOTE = "(Kiến thức tham khảo chung — không thay được chẩn đoán và chỉ định của bác sĩ nha 🩺)";
/** Câu hỏi ăn uống / kiêng cữ ("kiêng gì?", "ăn gì được?") — để ghép với bệnh đang nói rồi chuyển cho lib/lomiDiet. */
// Chỉ câu hỏi TRỐNG, ngắn ("kiêng gì?", "nên ăn gì") — "hôm nay ăn gì" là nhờ gợi ý món, không phải hỏi kiêng cữ của bệnh.
export const isDietAsk = (text: string) => {
  const n = ` ${normalizeVi(text)} `;
  return ASK_DIET.test(n) && n.trim().split(" ").length <= 7 && !/\b(hom nay|toi nay|trua nay|sang nay|chieu nay|bay gio|gio nay|lat nua)\b/.test(n);
};

function aspectOf(n: string, raw: string): Exclude<HealthAspect, "menu"> | null {
  if (ASK_DIET.test(n)) return null;
  if (ASK_DOCTOR.test(n)) return "doctor";
  if (ASK_CARE.test(n) || ASK_CARE_ACC.test(raw.normalize("NFC").toLowerCase())) return "care";
  if (ASK_WHAT.test(n)) return "what";
  return null;
}

/** Các phần Lomi THẬT SỰ có để nói về chủ thể này (không mời hỏi thứ mình không biết). */
function chips(s: HealthSubject, skip?: HealthAspect | "diet"): string[] {
  const L = cap(s.label);
  return [s.cond && skip !== "what" && `${L} là gì?`, s.cond && skip !== "care" && `${L} nên làm gì?`, s.diet && skip !== "diet" && `${L} kiêng gì?`].filter(Boolean) as string[];
}

const SELF_HAS = /\b(minh|toi|tui|em|e|anh|a|chi|to) (dang |cung |moi |hay |vua )?(bi|mac|co benh)\b|^(dang |moi |vua )?(bi|mac) |\b(bac si|bs) (noi|bao|chan doan|ket luan)\b.*\b(bi|mac)\b/;
const OTHERS = /\b(me|ma|ba|bo|cha|vo|chong|con|ong|ba noi|ba ngoai|ban|nguoi nha|nguoi than|sep|anh ay|chi ay|co ay|nguoi yeu|ny)\b/;

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
const FEEL_ACC = /(?<![\p{L}])(lo lắng|lo quá|lo sợ|lo ghê|rất lo|đang lo|lo(?= (vì|về|cho|là|không|mà))|sợ|hoảng|hoang mang|buồn(?! nôn| ngủ| cười)|khóc|stress|áp lực|chán nản|nản|tuyệt vọng|bất an|suy sụp|tủi thân|sốc|ám ảnh)(?![\p{L}])/u;
const FEEL_PLAIN = /\b(lo lang|lo qua|lo so|rat lo|dang lo|lo vi|lo ve|so qua|so lam|rat so|dang so|hoang mang|stress|ap luc|chan nan|tuyet vong|bat an|suy sup|tui than)\b/;
// "gout có đáng sợ không?", "có đáng lo không?" là hỏi kiến thức (mức độ nguy hiểm), không phải đang kể cảm xúc.
const FEEL_ASK = /\b(co )?(dang so|dang lo|dang ngai)\b.*\b(khong|ko|k|hong)\b/;

/**
 * Câu đang HỎI VỀ một bệnh / thuốc cụ thể ("a hỏi về bệnh lupus", "bệnh zona", "thuốc này") dù Lomi chưa có kiến thức về nó.
 * Dùng để Lomi nói thật là chưa biết (và ở lại mạch sức khoẻ), thay vì đáp như đang nghe tâm sự.
 */
export function looksLikeHealthTopic(text: string): boolean {
  const n = normalizeVi(text);
  return /\b(hoi|tu van|noi|tim hieu|biet) (ve|chuyen|them ve) (benh|thuoc|suc khoe)\b/.test(n) || /^(a |anh |em |e |minh |toi |tui )?(benh|thuoc) \S+( \S+){0,2}( (a|ha|nha|ne|do))?$/.test(n);
}

/** Người dùng đang nói CẢM XÚC của mình (lo, sợ, buồn…) chứ không chỉ hỏi kiến thức. */
export function healthFeeling(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  if (FEEL_ASK.test(n)) return false;
  return FEEL_ACC.test(text.normalize("NFC").toLowerCase()) || FEEL_PLAIN.test(n);
}
