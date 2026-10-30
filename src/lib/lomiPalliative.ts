// ─────────────────────────────────────────────────────────────────────────────
// "BÁC SĨ TRẢ VỀ" / HẾT CÁCH CHỮA / GIAI ĐOẠN CUỐI (30/10, Kir gửi ảnh chụp) — chạy trên máy, không gọi AI.
//
// Lỗi gốc (chạy thật qua khung chat, commit d0ff6f4):
//   "Ung thư phúc mạc mà bác sĩ trả về thì h làm j?" → thẻ chung "🌿 Với **Ung thư**, nên: … phẫu thuật, hoá trị, xạ trị …"
//       (mất chữ "phúc mạc", và đọc phương án điều trị cho người vừa bị bác sĩ cho về — vừa sai việc vừa vô duyên)
//   "Bố e bị ung thư gan bác sĩ trả về rồi"      → "Giờ bố em đang điều trị sao rồi em?" (hỏi lại điều người ta vừa nói xong)
//   "bs cho về nhà vì k chữa được nữa, giờ sao"   → "Lomi chưa có kiến thức đã kiểm chứng…"
//
// Ở Việt Nam "bác sĩ / bệnh viện trả về" gần như luôn là: điều trị nhắm vào bệnh không còn giúp được nữa, cho về nhà chăm.
// Điều người nhà cần lúc đó KHÔNG phải danh sách cách chữa, mà là: hỏi lại bác sĩ cho rõ, chăm sóc giảm nhẹ (giảm đau, ăn uống,
// dấu hiệu phải báo bác sĩ) và lời động viên cho người chăm.
//
// File này chỉ NHẬN DIỆN tình huống + viết câu dẫn đúng người, đúng bệnh. Mọi ý y khoa lấy nguyên từ thẻ có nguồn
// medkb/cham-soc-giam-nhe.json (WHO, NHS, NCI, Macmillan, Cancer Research UK). Câu hỏi kiến thức ("chăm sóc giảm nhẹ là gì")
// không thuộc đây — kho kiến thức trả lời như mọi thẻ khác.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";
import type { MedTopic } from "@/lib/lomiMed";

export const PALLIATIVE_CARD = "cham-soc-giam-nhe";

export type Palliative = {
  /** Người bệnh: chính người gõ / người thân / không rõ. */
  who: "self" | "other" | "unknown";
  /** Người thân, viết theo lời Lomi nói ("bố bạn", "mẹ bạn"); speak() đổi "bạn" theo cách xưng hô. */
  kin?: string;
  /** Tên bệnh đúng như người dùng gõ ("ung thư phúc mạc"). */
  disease?: string;
  /** Bệnh ở vùng bụng → kèm dấu hiệu tích dịch ổ bụng / tắc ruột. */
  belly: boolean;
  /** Người dùng nói rõ bác sĩ / bệnh viện cho về (khác với chỉ nói "giai đoạn cuối", "hết cách"). */
  sentHome?: boolean;
  /** Câu hỏi "sống được bao lâu" — trả lời điều đó trước. */
  askTime?: boolean;
  /** Đã đỡ lời cảm xúc một lần (để không lặp lại). */
  felt?: boolean;
};

// Người thầy thuốc / nơi điều trị.
const ACTOR = "bác sĩ|bs|bsi|bv|bệnh viện|viện|khoa|nhà thương|bệnh viện k|viện k";
// "trả về" chỉ tính khi đi với người thầy thuốc / nơi điều trị, hoặc câu đã nói tới bệnh nặng.
const SENT_HOME_ACTOR = VN(new RegExp(`\\b(${ACTOR})( \\S+){0,3}? (trả về|trả (người )?về nhà)\\b|\\b(bị|được) (${ACTOR}) trả về\\b`));
// "cho về nhà" cũng có thể là ra viện vì đã khoẻ → chỉ tính khi câu nói tới bệnh nặng / hết cách, và không nói là đã đỡ.
const LET_HOME_ACTOR = VN(new RegExp(`\\b(${ACTOR})( \\S+){0,3}? (cho về nhà|cho về|kêu về|bảo về|cho ra viện)\\b`));
const RECOVER = VN(/\b(đỡ (nhiều|hơn|rồi)|khỏi (rồi|hẳn|bệnh)|khoẻ (lại|rồi)|khỏe (lại|rồi)|bình phục|hết bệnh|ổn rồi|mổ thành công|ca mổ thành công)\b/);
const SENT_HOME_BARE = VN(/\b(trả về|cho về nhà|về nhà)\b/);
const HOPELESS = VN(/\b(không|k|ko|hông|chẳng|hết) (còn )?(thể )?(chữa|điều trị|cứu|mổ|truyền hoá chất|truyền hóa chất|hoá trị|hóa trị) (được )?(nữa|rồi)\b|\bhết cách( chữa| điều trị| cứu)?\b|\bhết (thuốc )?chữa\b|\bvô phương cứu chữa\b|\bbó tay\b|\bchỉ (còn )?(sống )?(được )?(vài|mấy|\d+|một|hai|ba) (ngày|tuần|tháng)\b|\bchăm sóc (giảm nhẹ|cuối đời)\b|\bgiai đoạn cuối\b|\bdi căn (khắp|nhiều|toàn thân|lên|xuống|sang|qua)\b/);
// Bệnh nặng (để "cho về nhà" / "bó tay" chỉ được hiểu là trả về khi câu đang nói về bệnh nặng).
const GRAVE = VN(/\b(ung thư|ung thu|k (gan|phổi|vú|dạ dày|bao tử|đại tràng|trực tràng|tuỵ|tụy|vòm|phúc mạc|buồng trứng|cổ tử cung|thực quản|xương|máu)|ung bướu|khối u|có u|di căn|giai đoạn (cuối|4|bốn|iv)|xơ gan|suy (gan|thận|tim) (nặng|giai đoạn cuối|mạn)|suy đa tạng|tai biến|đột quỵ|bệnh nặng|nặng lắm|hôn mê|thở máy)\b/);
// Không phải chuyện đang xảy ra với người dùng / người thân.
const NOT_REAL = VN(/\b(trong phim|xem phim|đọc truyện|trong truyện|trên báo|đọc báo|trên mạng|tin tức|trong game|tiểu thuyết)\b/);
// Phủ định chính tình huống ("không phải giai đoạn cuối", "bác sĩ chưa trả về").
const DENIED = VN(/\b(không phải|chưa (bị )?|không bị|đâu phải) (giai đoạn cuối|trả về|bị trả về|hết cách)\b|\b(bác sĩ|bs|bv|bệnh viện) (chưa|không) (trả về|cho về)\b/);
// Câu hỏi kiến thức thuần ("chăm sóc giảm nhẹ là gì") → kho kiến thức trả lời.
const KNOWLEDGE = VN(/^(chăm sóc giảm nhẹ|chăm sóc cuối đời|điều trị giảm nhẹ)( \S+){0,2} (là gì|là sao|là như nào|là như thế nào|gồm những gì|khác gì)\b/);

const KIN = "bố|ba|cha|tía|mẹ|má|u|bu|ông nội|bà nội|ông ngoại|bà ngoại|ông|bà|chồng|vợ|con trai|con gái|con|anh trai|chị gái|em trai|em gái|cô|chú|dì|cậu|mợ|thím|bác(?! sĩ)|cụ|người nhà|người thân|bạn thân|bạn";
const SELF = "a|anh|e|em|c|chị|t|tui|tôi|tao|mình|tớ|ta";
const KIN_RE = new RegExp(`(?:^|[^\\p{L}])(${KIN})(?: (${SELF}))?(?=[^\\p{L}]|$)`, "iu");
const SELF_ILL = VN(new RegExp(`^(${SELF}) (đang |cũng |bị |mới |vừa |đã )*(bị|mắc|có) `));

const BELLY = /phúc mạc|buồng trứng|dạ dày|bao tử|đại tràng|trực tràng|ruột|tuỵ|tụy|gan|ổ bụng|tử cung|mật|thực quản/iu;
const DISEASE_STOP = new Set(["mà", "thì", "bị", "đã", "rồi", "giai", "bác", "bs", "bv", "nên", "nhưng", "giờ", "h", "đang", "được", "di", "và", "nay", "nữa", "ạ", "à", "á", "hả", "vì", "do", "ở", "bệnh", "viện", "trả", "cho", "không", "k", "ko", "thời", "lúc", "sau", "khi", "của", "với", "này", "đó", "kia", "là", "có", "chữa", "sống", "gì", "kiêng", "ăn", "uống", "triệu", "dấu", "nguyên", "lây", "truyền", "đoạn", "khỏi", "nặng", "nhẹ", "thế", "sao", "như", "bao", "mấy", "hả", "hông", "chưa", "ra", "lên", "vào", "vô", "phải", "cần", "nào", "rất", "quá", "lắm"]);

/** Người thân được nhắc trong câu, viết theo lời Lomi ("bố bạn"). */
export function kinOf(raw: string): string | undefined {
  const km = raw.normalize("NFC").toLowerCase().match(KIN_RE);
  if (!km || (km[1] === "bạn" && !km[2]) || (km[1] === "u" && !km[2])) return undefined;
  return km[1] === "bạn" ? "bạn thân của bạn" : `${km[1]} bạn`;
}

export function diseaseOf(raw: string): string | undefined {
  const s = raw.normalize("NFC").toLowerCase();
  const m = s.match(/(?:^|[^\p{L}])(ung thư|ung thu)((?: [\p{L}]+){0,3})/u);
  if (m) {
    const words: string[] = [];
    for (const w of m[2].trim().split(/\s+/).filter(Boolean)) {
      if (DISEASE_STOP.has(w)) break;
      words.push(w);
    }
    return ["ung thư", ...words].join(" ");
  }
  const k = s.match(/(?:^|[^\p{L}])k (gan|phổi|vú|dạ dày|bao tử|đại tràng|trực tràng|tuỵ|tụy|vòm|phúc mạc|buồng trứng|cổ tử cung|thực quản|xương|máu)(?=[^\p{L}]|$)/u);
  if (k) return `ung thư ${k[1]}`;
  const o = s.match(/(?:^|[^\p{L}])(xơ gan|suy gan|suy thận|suy tim|suy đa tạng|tai biến|đột quỵ)(?=[^\p{L}]|$)/u);
  return o?.[1];
}

/** Tình huống "bác sĩ trả về" / hết cách chữa / giai đoạn cuối — null nếu không phải. `prevWho` = người đang được nói tới ở lượt trước. */
export function palliativeOf(raw: string, prev?: { kin?: string; disease?: string }): Palliative | null {
  const n = ` ${normalizeVi(raw)} `;
  if (NOT_REAL.test(n) || DENIED.test(n) || KNOWLEDGE.test(normalizeVi(raw))) return null;
  if (RECOVER.test(n)) return null;
  const hopeless = HOPELESS.test(n);
  const grave = GRAVE.test(n) || !!prev?.disease;
  const actor = SENT_HOME_ACTOR.test(n) || (LET_HOME_ACTOR.test(n) && (grave || hopeless));
  // "trả về / về nhà" không có thầy thuốc → chỉ nhận khi câu nói tới bệnh nặng; "bó tay", "giai đoạn cuối"… tự nó đã đủ.
  if (!actor && !hopeless && !(SENT_HOME_BARE.test(n) && grave && VN(/\b(trả về|cho về)\b/).test(n))) return null;
  if (!actor && hopeless && VN(/\bbó tay\b/).test(n) && !grave) return null; // "bó tay với nó" — không phải chuyện bệnh
  const disease = diseaseOf(raw) ?? prev?.disease;
  const s = raw.normalize("NFC").toLowerCase().trim();
  const kin = kinOf(s) ?? prev?.kin;
  const who: Palliative["who"] = kin ? "other" : SELF_ILL.test(normalizeVi(s)) ? "self" : "unknown";
  return { who, kin, disease, belly: !!disease && BELLY.test(disease), sentHome: actor, askTime: ASK_TIME.test(n) };
}

const strip = (t: string) => t.replace(/\*\*/g, "");
const pick = (xs: { text: string }[], i: number) => xs[i]?.text ?? "";

/** Lời đáp: câu dẫn đúng người, đúng bệnh → hỏi lại bác sĩ → chăm sóc giảm nhẹ là gì → giảm đau → ăn uống → (bệnh vùng bụng) dấu hiệu
 *  phải báo bác sĩ → người chăm. Ý y khoa lấy từ thẻ có nguồn. Viết với "bạn"; nơi gọi đổi xưng hô bằng speak(). */
export function palliativeReply(p: Palliative, card: MedTopic): { text: string; quick: string[] } {
  const ill = p.disease ? `**${p.disease}**` : "bệnh nặng";
  // Câu dẫn chỉ nói "bác sĩ cho về" khi người dùng nói vậy; chỉ nói "giai đoạn cuối" / "hết cách" thì nói đúng điều đó.
  const news = p.sentHome ? "mà bác sĩ cho về" : "ở giai đoạn nặng như vậy";
  const head =
    p.who === "other"
      ? `Nghe ${p.kin} bị ${ill} ${news}, Lomi thương cả nhà mình lắm 🥺 Lúc này rối là đương nhiên — Lomi gom mấy việc giúp được nhiều nhất nha.`
      : p.who === "self"
        ? `Bạn đang phải đối mặt với ${ill} và lời bác sĩ như vậy, chắc nặng lòng lắm 🥺 Lomi ở đây với bạn. Mấy điều này có thể giúp bạn lúc này:`
        : `${p.disease ? `Đang ${ill} ${news}` : p.sentHome ? "Bác sĩ cho người bệnh về như vậy" : "Bệnh đã nặng như vậy"} thì chắc cả nhà rối lắm 🥺 Lomi gom mấy việc giúp được nhiều nhất lúc này nha.`;
  const pt = p.who === "self" ? "bạn" : p.kin ?? "người bệnh";
  const ask = [
    p.sentHome ? `🩺 **Hỏi lại bác sĩ cho rõ "trả về" nghĩa là gì**` : `🩺 **Hỏi bác sĩ đang điều trị cho rõ**`,
    `• Còn cách điều trị nào nữa không, hay giờ chuyển sang lo cho ${pt} dễ chịu là chính?`,
    `• Ở nhà cần chăm, theo dõi gì; thuốc giảm đau dùng ra sao; có chuyện thì gọi ai.`,
    `• Bệnh viện có khoa / đội **chăm sóc giảm nhẹ** không. Muốn chắc hơn, có thể xin hồ sơ hỏi thêm ý kiến một bệnh viện ung bướu khác.`,
  ].join("\n");
  const what = [`🤍 **Chăm sóc giảm nhẹ — không phải là bỏ cuộc**`, `• ${strip(pick(card.about, 0))}`, `• ${strip(pick(card.about, 1))}`, `• ${strip(pick(card.about, 2))}`].join("\n");
  const pain = [`💊 **Đau thì không phải ráng chịu**`, ...card.care.slice(0, 3).map((f) => `• ${strip(f.text)}`)].join("\n");
  const eat = [`🍲 **Ăn uống**`, ...(card.diet?.ok ?? []).slice(0, 3).map((f) => `• ${strip(f.text)}`)].join("\n");
  const belly = p.belly
    ? [`⚠️ **Với ${p.disease}, để ý 2 chuyện**`, `• ${strip(pick(card.doctor, 1))}`, `• ${strip(pick(card.emergency, 0))}`].join("\n")
    : "";
  const carer =
    p.who === "self"
      ? `💛 Bạn cứ nói với gia đình và bác sĩ điều bạn mong muốn nhất lúc này — việc chăm sóc nên theo mong muốn của chính bạn. Muốn tâm sự gì thì Lomi nghe nè.`
      : `💛 Người chăm cũng cần giữ sức: chia ca với người nhà, ăn ngủ đủ. ${strip(pick(card.care, 4))}`;
  const used = new Set<number>([0, 1, 2, 3, 6, ...(p.belly ? [4, 5] : [])]);
  // "Sống được bao lâu" — không né câu hỏi: nói thật là khó đoán, ai nói được sát nhất.
  const time = p.askTime ? `⏳ ${strip(pick(card.course, 0))} Bác sĩ đang theo dõi ${pt} là người nói được sát nhất — cả nhà cứ hỏi thẳng nha.` : "";
  if (p.askTime) used.add(1);
  const src = `📚 Nguồn: ${card.sources.filter((_, i) => used.has(i)).map((s) => `${s.publisher} — “${s.title}”`).join(" · ")}. Đây là kiến thức tham khảo chung, không thay lời dặn của bác sĩ đang điều trị.`;
  const text = [head, time, ask, what, pain, eat, belly, carer, src].filter(Boolean).join("\n\n");
  const quick = [
    "Giảm đau ở nhà thế nào?",
    "Người bệnh ăn uống ra sao?",
    p.belly ? "Bụng chướng to thì sao?" : "Khi nào phải gọi bác sĩ?",
    p.who === "self" ? "Đang sợ lắm" : "Đang rối quá",
  ];
  return { text, quick };
}

// ── Hỏi tiếp trong cùng chuyện (bấm gợi ý hoặc tự gõ: "giờ chăm sao cho đỡ đau", "ăn uống ra sao", "bụng chướng to thì sao") ──
// Trước đây rơi vào cách đọc thẻ chung "🌿 Với **Chăm sóc giảm nhẹ**, nên:" — đúng ý nhưng nghe như đọc sách. Giờ trả lời đúng phần được hỏi,
// gọi đúng người bệnh, vẫn chỉ dùng ý có nguồn của thẻ.
const ASK_PAIN = VN(/\b(đau|giảm đau|thuốc giảm đau|morphin|moocphin|mooc phin|thuốc phiện|nghiện thuốc|đỡ đau|hết đau)\b/);
const ASK_EAT = VN(/\b(ăn uống|ăn (gì|sao|thế nào|ra sao|như nào|như thế nào|được gì)|uống (gì|sao)|nên ăn|cho ăn|cho uống|kiêng|chán ăn|biếng ăn|bỏ ăn|không chịu ăn|ăn không (nổi|được|vô)|ăn ít|bồi bổ|bổ dưỡng)\b/);
const ASK_BELLY = VN(/\b(bụng|chướng|báng bụng|cổ trướng|dịch ổ bụng|nôn|ói|tắc ruột|không đi cầu|không đi tiêu|táo bón|xì hơi)\b/);
const ASK_WHEN = VN(/\b(khi nào|lúc nào|dấu hiệu|gọi bác sĩ|gọi 115|đi viện|nhập viện|cấp cứu|nguy hiểm|báo bác sĩ)\b/);
const ASK_FEEL = VN(/\b(rối|sợ|lo|lo lắng|buồn|mệt mỏi|kiệt sức|suy sụp|khóc|tuyệt vọng|bế tắc|không biết (làm sao|phải làm gì|làm gì)|hoang mang|đau lòng|xót|thương (bố|mẹ|ba|má) quá)\b/);
const ANTICIPATE = VN(/\b(sợ|lo|sợ hãi) (\S+ ){0,2}?(mất|mất đi|không còn|ra đi|đi mất|qua đời|không qua khỏi|không qua nổi)\b/);
const MEMORY = VN(/\b(hồi nhỏ|hồi bé|hồi xưa|ngày xưa|hồi trước|lúc nhỏ|lúc bé|nhớ hồi|nhớ lúc|kỷ niệm|kỉ niệm|thương (\S+ ){0,2}lắm|hay nấu|hay chở|hay dắt|hay dẫn)\b/);
const ASK_TIME = VN(/\b(bao lâu|sống được|còn bao|mấy tháng|mấy tuần|kéo dài)\b/);

export function palliativeFollow(raw: string, p: Palliative, card: MedTopic): { text: string; quick: string[]; heart?: string; felt?: boolean } | null {
  const n = ` ${normalizeVi(raw)} `;
  if (n.trim().split(" ").length > 16) return null;
  if (p.who !== "self" && !p.kin) {
    const k = kinOf(raw);
    if (k) p = { ...p, who: "other", kin: k };
  }
  const pt = p.who === "self" ? "bạn" : p.kin ?? "người bệnh";
  // Nói ra cảm xúc ("mình đang rối lắm", "sợ quá", "mệt mỏi lắm") → nghe và đỡ lời trước, rồi mở mạch tâm sự người chăm bệnh.
  if (ANTICIPATE.test(n)) {
    const who = kinOf(raw) ?? (p.who === "other" ? p.kin : undefined) ?? "người thân";
    return {
      text: `Sợ mất ${who} là vì thương ${who.split(" ")[0]} nhiều lắm 🤍 Buồn và sợ hãi trước cả khi chia xa là điều rất nhiều người chăm người bệnh nặng trải qua — không có gì sai cả.\n\nThời gian này, nhiều gia đình thấy nhẹ lòng hơn nhờ những điều nhỏ: ngồi cạnh, nắm tay, kể lại chuyện cũ, nói lời thương hay lời cảm ơn còn chưa kịp nói. Bạn cứ kể Lomi nghe về ${who} nha, Lomi nghe nè.`,
      quick: [],
      heart: "caregiver",
      felt: true,
    };
  }
  // Kể kỷ niệm / tình thương với người bệnh → nghe và đón lấy, không chuyển sang kiến thức.
  if (MEMORY.test(n) && !ASK_PAIN.test(n) && !ASK_EAT.test(n) && !ASK_BELLY.test(n)) {
    const who = (p.who === "other" ? p.kin : undefined) ?? kinOf(raw) ?? "người thân";
    return {
      text: `Nghe bạn kể mà Lomi thấy thương ghê 🤍 Những kỷ niệm như vậy quý lắm. Nhiều gia đình thấy nhẹ lòng khi được cùng người bệnh nhắc lại chuyện cũ — kể cả lúc ${who.split(" ")[0]} mệt, chỉ nằm nghe thôi cũng vui.\n\nBạn cứ kể tiếp nha, Lomi nghe nè.`,
      quick: [],
      heart: "caregiver",
      felt: true,
    };
  }
  // (đã nghe & đỡ lời một lần rồi → để mạch tâm sự nghe tiếp, không lặp lại cùng một câu)
  if (ASK_FEEL.test(n) && !ASK_PAIN.test(n) && !ASK_EAT.test(n)) {
    if (p.felt) return null;
    const text =
      p.who === "self"
        ? "Sợ là điều rất con người 🤍 Đối diện với tin như vậy, ai cũng sẽ sợ, buồn, có khi giận nữa — không có cảm xúc nào là sai cả.\n\nBạn không phải mang một mình: nói với người thân điều bạn đang nghĩ, và đội chăm sóc giảm nhẹ cũng lo cả phần tinh thần cho người bệnh. Trong lòng bạn đang nặng nhất điều gì, kể Lomi nghe nha."
        : `Rối là phải mà 🤍 Nghe tin như vậy ai cũng chới với — vừa thương ${pt}, vừa sợ, vừa không biết bắt đầu từ đâu. Bạn không cần lo xong mọi thứ trong hôm nay đâu.\n\nHai việc nhỏ làm trước được: ghi ra những điều muốn hỏi bác sĩ, và rủ thêm một người nhà cùng chia việc chăm. Còn trong lòng bạn đang nặng nhất chuyện gì, kể Lomi nghe nha — Lomi nghe hết.`;
    return { text, quick: [], heart: "caregiver", felt: true };
  }
  const bl = (xs: { text: string }[]) => xs.map((f) => `• ${strip(f.text)}`).join("\n");
  const srcOf = (idx: number[]) => `📚 Nguồn: ${idx.map((i) => card.sources[i]).filter(Boolean).map((s) => `${s.publisher} — “${s.title}”`).join(" · ")}. Đây là kiến thức tham khảo chung, không thay lời dặn của bác sĩ đang điều trị.`;
  const parts: string[] = [];
  const src = new Set<number>();
  const quick: string[] = [];
  if (ASK_PAIN.test(n)) {
    parts.push(`💊 Giảm đau cho ${pt} ở nhà nè:\n${bl(card.care.slice(0, 4))}\n• Lomi không nêu liều — thuốc và liều do bác sĩ đang điều trị quyết định.`);
    [0, 3].forEach((i) => src.add(i));
  }
  if (ASK_EAT.test(n) && !ASK_PAIN.test(n)) {
    parts.push(`🍲 Chuyện ăn uống của ${pt}:\n${bl(card.diet?.ok ?? [])}`);
    src.add(6);
  }
  if (ASK_BELLY.test(n) && !ASK_EAT.test(n) || (ASK_WHEN.test(n) && !parts.length)) {
    const items = [...card.emergency, ...card.doctor];
    parts.push(`⚠️ Mấy dấu hiệu cần báo bác sĩ ngay:\n${bl(items)}\n• Thấy ${pt} khó thở nhiều, lơ mơ, mệt lả hơn hẳn thì gọi bác sĩ hoặc **115**.`);
    [3, 4, 5].forEach((i) => src.add(i));
  }
  if (ASK_TIME.test(n) && !parts.length) {
    parts.push(`${strip(pick(card.course, 0))} Bác sĩ đang theo dõi ${pt} là người nói được sát nhất — cả nhà cứ hỏi thẳng, và hỏi luôn giai đoạn tới nên chuẩn bị gì nha 🤍`);
    src.add(1);
  }
  if (!parts.length) return null;
  if (!ASK_PAIN.test(n)) quick.push("Giảm đau ở nhà thế nào?");
  if (!ASK_EAT.test(n)) quick.push("Người bệnh ăn uống ra sao?");
  if (!(ASK_BELLY.test(n) || ASK_WHEN.test(n))) quick.push(p.belly ? "Bụng chướng to thì sao?" : "Khi nào phải gọi bác sĩ?");
  quick.push(p.who === "self" ? "Đang sợ lắm" : "Đang rối quá");
  return { text: [...parts, srcOf([...src].sort())].join("\n\n"), quick };
}
