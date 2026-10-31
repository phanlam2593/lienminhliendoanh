// ─────────────────────────────────────────────────────────────────────────────
// 31/10/2026 — DANH SÁCH CHATGPT LẦN 4 (120 đoạn hội thoại nhiều lượt): Lomi đúng ở câu đầu nhưng QUÊN MẠCH ở lượt 3–4.
//   • Đang nói một bệnh mà kể thêm chi tiết ("Bé 8 tháng", "Mẹ 62 tuổi", "Nặng 9 ký", "Ba em bị") → trước đây "chưa hiểu" / "Dạy Lomi".
//   • Hỏi tiếp không nhắc tên bệnh ("Bao lâu mới khỏi?", "Có cần nghỉ học không?", "Ăn tối lúc nào?") → trước đây hỏi lại "chuyện nào".
//   • Kể đang dùng một thuốc ("Mẹ em uống metformin") → trước đây "Uống metformin hả 😄 Có gì kể tiếp".
//   • Vừa nhận lời hỗ trợ khủng hoảng mà kể tiếp ("Em đang một mình", "Không biết có chịu nổi không") → trước đây quay về giọng tâm sự thường.
//   Hàm ở đây chỉ ĐỌC câu; AiAssistant quyết định dùng lúc nào (cần biết lượt trước đang nói gì).
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

const N = (q: string) => ` ${normalizeVi(q)} `;
const words = (q: string) => q.trim().split(/\s+/).filter(Boolean).length;

const NUMW: Record<string, number> = { mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10 };
const num = (x: string) => (/^\d+$/.test(x) ? Number(x) : NUMW[normalizeVi(x)] ?? NaN);

// ═══════════════ Chi tiết kể thêm ═══════════════
export type Who = { text: string; kind: "child" | "elder" | "adult" | "self" };
export type Detail = { who?: Who; months?: number; years?: number; kg?: number; never?: boolean; sick?: boolean };

const KID = "bé|con|cháu|em bé|bé con|con nít|nó|thằng bé|con bé|bé nhà (em|anh|chị|tui|tôi|mình)|con (em|anh|chị|tui|tôi|mình)";
const ELDER = "mẹ|má|ba|bố|cha|ông|bà|ổng|bả|ông bà|ba mẹ|bố mẹ|mẹ (em|anh|chị|tui|tôi|mình)|ba (em|anh|chị|tui|tôi|mình)|bố (em|anh|chị|tui|tôi|mình)";
const OTHER = "vợ|chồng|ck|vk|chị (em|anh|tui|tôi|mình|ấy)|anh (em|tui|tôi|mình|ấy)|em (gái|trai)|bạn (em|anh|tui|tôi|mình)|người yêu|ny";
const SELF = "tui|tôi|em|anh|chị|mình|tớ|tao";

/** Câu ngắn CHỈ kể thêm chi tiết (tuổi, cân nặng, ai là người bệnh) — null nếu câu còn nội dung khác. */
export function parseDetail(q: string): Detail | null {
  if (words(q) > 9) return null;
  // bỏ từ nối ở đầu ("mà em mới 24 tuổi", "còn bé 4 tuổi") — "mà" bỏ dấu trùng với "má"
  const low = q.normalize("NFC").toLowerCase().replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim().replace(/^(mà|nhưng|còn|với lại|à|ừ|dạ|ờ)\s+/u, "");
  const n = ` ${normalizeVi(low)} `;
  const d: Detail = {};
  const age = n.match(VN(/\b(\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s*(tháng|tuổi|t)\b(?! (nay|rồi nay))/));
  if (age) {
    const v = num(age[1]);
    if (!Number.isNaN(v)) (normalizeVi(age[2]) === "thang" ? (d.months = v) : (d.years = v));
  }
  const kg = n.match(VN(/\b(nặng )?(\d+(?:[.,]\d+)?)\s*(ký|kí|kg|cân|ky)\b/));
  if (kg) d.kg = Number(kg[2].replace(",", "."));
  const who = n.match(VN(new RegExp(`^ (?:(?:à|ừ|dạ|không|ko|k)\\s+)?(?:là |người bệnh là |người bị là )?(${KID}|${ELDER}|${OTHER}|${SELF})\\b`)));
  if (who) {
    const t = who[1].trim();
    const nt = normalizeVi(t);
    const kind: Who["kind"] = /^(be|con|chau|em be|be con|con nit|no|thang be|con be|be nha \S+|con (em|anh|chi|tui|toi|minh))$/.test(nt)
      ? "child"
      : /^(me|ma|ba|bo|cha|ong|ong ba|ba me|bo me)( (em|anh|chi|tui|toi|minh))?$/.test(nt)
        ? "elder"
        : /^(tui|toi|em|anh|chi|minh|to|tao)$/.test(nt)
          ? "self"
          : "adult";
    // chữ gốc người dùng gõ (có dấu) cho phần nhắc lại
    const toks = low.split(" ");
    const k = nt.split(" ").length;
    const shown = toks.slice(0, k).join(" ");
    d.who = { text: normalizeVi(shown) === nt ? shown : t, kind };
  }
  if (VN(/\b(chưa (từng )?(bị|mắc)|chưa bị bao giờ)\b/).test(n)) d.never = true;
  if (VN(/\b(bị|mới là người bệnh|là người bệnh|đang bệnh|cũng bị)\b/).test(n)) d.sick = true;
  // phần còn lại phải gần như trống (không còn ý gì khác ngoài chi tiết)
  const rest = n
    .replace(VN(new RegExp(`\\b(${KID}|${ELDER}|${OTHER}|${SELF})\\b`, "g")), " ")
    .replace(VN(/\b(\d+(?:[.,]\d+)?|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s*(tháng|tuổi|t|ký|kí|kg|cân|ky)\b/g), " ")
    .replace(VN(/\b(nặng|mới|được|đã|rồi|thôi|à|á|ạ|nha|nhé|nè|hà|đó|nay|năm nay|chưa từng|chưa|từng|bị|mắc|bao giờ|là|người bệnh|người bị|mới là|cũng|đang|bệnh|của|nhà|lo|ổng|bả|khoảng|tầm|gần|hơn|dạ|ừ|không|ko|k|nhầm|lộn|chứ)\b/g), " ")
    .replace(/\s+/g, " ")
    .trim();
  if (rest.length > 3) return null;
  if (d.months === undefined && d.years === undefined && d.kg === undefined && !(d.who && (d.sick || d.never))) return null;
  // câu hỏi ("nó là gì?", "bé mấy tháng thì…") không phải câu kể chi tiết
  if (q.includes("?") || VN(/\b(gì|sao|không|ko|chưa|mấy|bao nhiêu|nào|được không)\s*$/).test(n)) return null;
  // "tui ngủ 10 giờ" không phải chi tiết; một chữ xưng hô trơn ("em") cũng không đủ
  if (!d.months && !d.years && !d.kg && d.who?.kind === "self" && !d.sick) return null;
  return d;
}

const isChild = (d: Detail) => (d.months !== undefined && (!d.who || d.who.kind === "child")) || (d.years !== undefined && d.years <= 12 && d.who?.kind !== "elder") || d.who?.kind === "child";
const ageText = (d: Detail) => (d.months !== undefined ? `${d.months} tháng` : d.years !== undefined ? `${d.years} tuổi` : "");

/**
 * Lời đáp cho một câu kể thêm chi tiết trong mạch sức khoẻ.
 * topic = tên bệnh / triệu chứng đang nói ("cúm", "sốt"); fever = mạch chuyện có sốt.
 */
export function detailReply(d: Detail, topic: string, fever: boolean): string {
  const who = d.who?.text ? d.who.text.replace(/^\p{L}/u, (c) => c.toUpperCase()) : isChild(d) ? "Bé" : "";
  const a = ageText(d);
  const T = topic ? `**${topic}**` : "tình trạng này";
  // Bé dưới 3 tháng mà sốt → khám ngay.
  if (fever && d.months !== undefined && d.months < 3)
    return `⚠️ Bé **dưới 3 tháng tuổi** mà sốt (từ 38°C) thì cần đưa bé đi khám **ngay**, đừng tự theo dõi ở nhà hay tự cho uống thuốc hạ sốt. Bé li bì, bỏ bú, co giật, thở nhanh, tím tái hay nổi ban → gọi **115** hoặc tới cấp cứu.\n\nBé đang ở nhà hay đã tới cơ sở y tế rồi bạn?`;
  if (isChild(d)) {
    const kgLine = d.kg !== undefined ? "\n\nCân nặng của bé quan trọng khi tính liều thuốc — nhưng liều phải do bác sĩ / dược sĩ tính theo đúng thuốc, Lomi không nêu liều nha. Khi hỏi nhà thuốc, nói rõ tuổi và cân nặng của bé." : "";
    const head = a ? `Dạ, ${who.toLowerCase() === "bé" || !d.who ? "bé" : who.toLowerCase()} ${a} 👶` : d.kg !== undefined ? `Dạ, bé nặng ${d.kg} ký 👶` : `Dạ, Lomi hiểu là ${who.toLowerCase()} 👶`;
    return `${head} Với trẻ nhỏ bị ${T}, đưa bé đi khám **sớm** nếu: bé li bì, bỏ bú / bỏ ăn, thở nhanh hoặc thở rút lõm ngực, co giật, sốt cao khó hạ, nôn nhiều, có dấu hiệu mất nước (tiểu ít, môi khô, khóc không có nước mắt), hoặc bệnh không đỡ sau vài ngày.${d.months !== undefined && d.months < 6 ? " Bé càng nhỏ thì càng nên cho đi khám sớm." : ""}${kgLine}\n\nBạn muốn biết thêm phần nào về ${T} cho bé — chăm sóc ở nhà, ăn uống hay khi nào cần đi khám?`;
  }
  if (d.never)
    return `Dạ, ${who ? `${who.toLowerCase()} ` : ""}chưa từng bị ${T} 📝 Người chưa từng mắc thì có thể bị lây nếu tiếp xúc gần với người bệnh — nên hạn chế tiếp xúc trong thời gian người bệnh còn lây, rửa tay thường xuyên, không dùng chung đồ cá nhân. Hỏi bác sĩ / trạm y tế xem có vắc xin phòng bệnh này không và có nên tiêm không nha.\n\nBạn muốn biết thêm về thời gian lây hay dấu hiệu cần đi khám?`;
  const elder = d.who?.kind === "elder" || (d.years !== undefined && d.years >= 60);
  const whoLow = who ? who.toLowerCase() : "";
  const ageBit = a ? ` ${a}` : "";
  if (elder)
    return `Dạ, ${whoLow || "người bệnh"}${ageBit} 📝 Người lớn tuổi bị ${T} nên được đi khám **sớm hơn** người trẻ, nhất là khi đang có bệnh nền (tim mạch, huyết áp, tiểu đường…) hoặc đang uống nhiều thuốc — vì dễ nặng hơn và thuốc dễ tương tác với nhau.\n\nHiện ${whoLow || "người bệnh"} đang có triệu chứng gì, và bạn muốn biết phần nào — chăm sóc, ăn uống hay khi nào cần đi khám?`;
  if (d.who && d.sick && !a)
    return `À, người bị ${T} là ${whoLow} nha 📝 ${whoLow.replace(/^\p{L}/u, (c) => c.toUpperCase())} bao nhiêu tuổi, đang có triệu chứng gì? Bạn kể thêm để Lomi nói sát hơn nha.`;
  return `Dạ, Lomi ghi nhận${whoLow && d.who?.kind !== "self" ? ` ${whoLow}` : ""}${ageBit} 📝 Bạn muốn biết thêm phần nào về ${T} — cách chăm sóc, ăn uống, bao lâu thì đỡ hay khi nào cần đi khám?`;
}

// ═══════════════ Câu hỏi nối không nhắc tên bệnh — khía cạnh bổ sung ═══════════════
export type FollowAspect = "course" | "spread" | "diet" | "doctor" | "care" | "school";
export function followAspect(q: string): FollowAspect | null {
  const n = N(q);
  if (words(q) > 10) return null;
  if (VN(/\b(nghỉ học|đi học (được|lại|chưa)|đi nhà trẻ|đi mẫu giáo|đi làm (được|lại) (chưa|không|ko|k)|cách ly|ở nhà mấy ngày|nghỉ mấy ngày)\b/).test(n)) return "school";
  if (VN(/\b(ăn chung|uống chung ly|dùng chung|ở chung|ngủ chung|hôn|lây qua|lây cho|có lây)\b/).test(n)) return "spread";
  if (VN(/\b(bao lâu|mấy ngày|mấy tuần|lâu không) (mới |thì |là )?(khỏi|hết|lành|đỡ|bớt)|bao lâu (mới |thì )?khỏi|khi nào (mới |thì )?(khỏi|hết|đỡ)\b/).test(n)) return "course";
  if (!VN(/\b(hôm nay|tối nay|trưa nay|sáng nay|chiều nay|bây giờ|giờ này|lát nữa|bữa nay|ăn gì ngon|quán)\b/).test(n) && VN(/\b(ăn gì (tốt|được|cho|đây)|ăn gì|ăn uống (sao|thế nào|ra sao|như nào|như thế nào|gì)|nên ăn|kiêng gì|ăn tối lúc nào|ăn (tối|khuya) (lúc|mấy giờ|được không))\b/).test(n)) return "diet";
  if (VN(/\b(có cần (đi )?khám|đi khám (không|chưa|được không)|có nguy hiểm|nguy hiểm không|có sao không)\b/).test(n)) return "doctor";
  if (VN(/\b(làm sao|làm gì|giờ sao|sao giờ|phải làm sao|nên làm gì|cho đỡ|xử lý sao|chăm sóc sao)\b/).test(n)) return "care";
  return null;
}

// ═══════════════ Kể đang dùng một thuốc ═══════════════
// "Mẹ em uống metformin", "Tui đang uống amoxicillin", "Em đang dùng thuốc tránh thai", "Ba em uống aspirin"
const LATIN_DRUG = /^[a-z][a-z-]{4,}$/;
const TECH = /^(iphone|ipad|android|samsung|xiaomi|oppo|vivo|zalo|facebook|messenger|tiktok|chrome|safari|wifi|laptop|macbook|windows|google|youtube|instagram|grab|shopee|lazada|momo|zalopay|netflix|spotify|capcut|canva|excel|word|photoshop|mobile|online|offline)\b/;
const NOT_DRUG = new Set("coca pepsi cafe coffee sting redbull soda matcha milo ovaltine whisky vodka soju sake pizza kombucha cacao trasua bia ruou nuoc sua tra".split(" "));
export function drugStatement(q: string): { who?: string; name: string } | null {
  if (words(q) > 10 || q.includes("?")) return null;
  const raw = q.normalize("NFC").toLowerCase().replace(/[.!…]+$/u, "").trim();
  const m = raw.match(/^(?:(.{1,18}?)\s+)?(?:đang |có |hay |phải |vẫn |mới )*(?:uống|dùng|xài|chích|tiêm)\s+((?:thuốc\s+)?[\p{L}\d-]+(?:\s+[\p{L}\d-]+){0,2})$/u);
  if (!m) return null;
  const name = m[2].trim();
  const n = normalizeVi(name);
  const verb = raw.match(/(uống|dùng|xài|chích|tiêm)\s+(?:thuốc\s+)?[\p{L}\d-]+(?:\s+[\p{L}\d-]+){0,2}$/u)?.[1] ?? "";
  const isLatin = LATIN_DRUG.test(n.replace(/^thuoc /, "")) && !/[À-ỹ]/u.test(name.replace(/^thuốc\s+/u, "")) && !NOT_DRUG.has(n) && !TECH.test(n) && (verb === "uống" || verb === "tiêm" || verb === "chích" || /^thuoc /.test(n));
  const isThuoc = /^thuoc \S/.test(n) && !/^thuoc (roi|xong|day du|deu|chua|dung|lai|thuong|hoai|nua|gi|nao|do|nay|kia|vao|vo)\b/.test(n) && !VN(/\b(thuốc lá|thuốc lào)\b/).test(` ${n} `);
  if (!isLatin && !isThuoc) return null;
  const who0 = m[1]?.trim();
  const who = who0 && /^(đang|có|hay|vẫn|mới|phải)$/u.test(who0) ? undefined : who0;
  if (who && !VN(new RegExp(`^ ?(${KID}|${ELDER}|${OTHER}|${SELF})( \\S+)? ?$`)).test(` ${normalizeVi(who)} `)) return null;
  return { who, name };
}

// ═══════════════ Sau lời hỗ trợ khủng hoảng ═══════════════
export const CRISIS_SIG = /không phải một mình|096 306 1414|nghĩ tới chuyện không muốn sống nữa\?/u;
const ALONE = VN(/\b(một mình|không có ai|chẳng có ai|không ai bên cạnh|ở nhà một mình|đang ở một mình)\b/);
const HEAVY = VN(/\b(chịu (không )?nổi|không chịu nổi|nặng nề|sợ chính mình|sợ bản thân|sợ mình (sẽ )?làm|không kiểm soát|thường xuyên|lâu rồi|mỗi ngày|ngày nào cũng|không muốn nói|chẳng muốn nói|không ai hiểu|mệt lắm|mệt quá|tuyệt vọng|bế tắc|biến mất|không muốn ai|kết thúc|buông|không còn sức)\b/);
/** Câu kể tiếp ngay sau lời hỗ trợ khủng hoảng → vẫn giữ an toàn là ưu tiên. null nếu không phải. */
export function crisisFollow(q: string, prev = ""): string | null {
  const n = N(q);
  if (words(q) > 16) return null;
  const alone = ALONE.test(n);
  if (!alone && !HEAVY.test(n)) return null;
  // Lượt trước đã nói đúng lời này rồi → không lặp lại nguyên văn; nói ngắn, vẫn giữ ý an toàn.
  if (prev.startsWith("Lomi nghe em, và Lomi rất lo cho em") || prev.startsWith("Cảm ơn em đã nói cho Lomi biết") || prev.startsWith("Lomi vẫn ở đây với em"))
    return alone && !prev.startsWith("Cảm ơn em đã nói cho Lomi biết")
      ? "Cảm ơn em đã nói cho Lomi biết 💚 Đang một mình lúc này thì em gọi hoặc nhắn ngay cho một người em tin để họ qua với em nha. Nếu thấy có thể làm hại bản thân → gọi **115**; đường dây **Ngày Mai: 096 306 1414**.\n\nEm có thể gọi cho ai ngay bây giờ không?"
      : "Lomi vẫn ở đây với em 💚 Em không cần kể thêm gì cả nếu chưa muốn — điều Lomi mong nhất lúc này là em được an toàn và có người ở cạnh. Em nhắn cho một người em tin ngay bây giờ được không? Nếu thấy không giữ được an toàn, gọi **115** hoặc đường dây **Ngày Mai: 096 306 1414** nha.";
  return alone
    ? "Cảm ơn em đã nói cho Lomi biết 💚 Lúc này đang một mình thì Lomi càng muốn em có người ở bên. Em gọi hoặc nhắn ngay cho một người em tin (người nhà, bạn thân, hàng xóm) để họ qua với em, hoặc em sang chỗ có người nha.\n• Nếu em thấy mình có thể làm hại bản thân ngay lúc này → gọi **115** hoặc tới bệnh viện gần nhất\n• Đường dây hỗ trợ tâm lý **Ngày Mai: 096 306 1414**\n• Để những thứ có thể gây nguy hiểm ra xa\n\nEm có thể gọi cho ai ngay bây giờ không?"
    : "Lomi nghe em, và Lomi rất lo cho em 💚 Những gì em đang mang thật sự nặng — em không phải gánh một mình.\n• Ngay lúc này em có an toàn không? Nếu em thấy có thể làm hại bản thân → gọi **115** hoặc tới bệnh viện gần nhất\n• Gọi hoặc nhắn cho một người em tin để họ ở cạnh em\n• Đường dây hỗ trợ tâm lý **Ngày Mai: 096 306 1414**\n\nEm đang ở một mình hay có ai ở gần không?";
}

// ═══════════════ Hỏi tiếp trong mạch hỏi về APP ═══════════════
// Trước đây câu nối ngắn bị dò lại cả bảng câu hỏi thường gặp và trúng câu khác hẳn: "Giờ xác minh sao em?" → đăng ký tài xế,
// "Chặn ở đâu?" → doanh nghiệp bị yêu cầu bổ sung, "Đợi 10 phút rồi" (đặt xe) → đăng ký tài khoản, "Dùng Chrome Android" → quên mật khẩu.
export type AppFollow = { faqId?: string; text?: string; keep?: string };
export function appFollow(q: string, prevFaqId: string | undefined, recentFaqIds: string[] = []): AppFollow | null {
  const n = N(q);
  if (words(q) > 14) return null;
  const ctx = new Set([prevFaqId, ...recentFaqIds].filter(Boolean) as string[]);
  const inCtx = (...ids: string[]) => ids.some((x) => ctx.has(x));
  // Xác minh email sau đăng ký — app không gửi mail xác minh; tài khoản chờ Ban quản trị duyệt.
  if (VN(/\b(xác minh|xác thực|kích hoạt|không thấy mail|không thấy email|chưa nhận được mail|chưa nhận được email|email (vẫn )?chưa xác minh|mail xác nhận)\b/).test(n))
    return { faqId: "approve", text: "iLomi **không gửi email xác minh** đâu nha 📭 Đăng ký xong, tài khoản sẽ **chờ Ban quản trị duyệt tay** — trong lúc chờ bạn vẫn xem được Hồ sơ, Tin nhắn và Thông báo; duyệt xong app sẽ báo cho bạn 🔔\n\nChờ lâu mà chưa thấy duyệt thì liên hệ Ban quản trị: Hồ sơ → ⋯ → Trợ giúp & Liên hệ." };
  // ("chặn" bỏ dấu trùng "chân" — "đau gót chan", "giữ chan nhân viên": chỉ nhận khi gõ đúng dấu hoặc đang nói chuyện tin nhắn / báo cáo)
  if ((/chặn/u.test(q.normalize("NFC").toLowerCase()) || inCtx("msgstart", "report", "block", "msgmanage", "quetconnect")) && VN(/\bchặn\b/).test(n) && !VN(/\b(chặn quảng cáo)\b/).test(n)) return { faqId: "block" };
  if (VN(/\b(quấy rối|làm phiền|nhắn bậy|vẫn nhắn|cứ nhắn|spam)\b/).test(n) && inCtx("msgstart", "report", "block", "msgmanage"))
    return { faqId: "block", text: "Người đó vẫn nhắn thì bạn **chặn** luôn nha: trong khung chat hoặc hồ sơ người đó bấm ⋯ → **Chặn người dùng** — người bị chặn không nhắn tin, gọi hay xem hồ sơ của bạn được nữa. Báo cáo bạn đã gửi vẫn được Ban quản trị xem; theo dõi phản hồi ở /bao-cao-cua-toi.\n\nĐừng trả lời hay gửi thông tin cá nhân cho người đó; chụp màn hình giữ lại làm bằng chứng nếu cần." };
  if (VN(/\b(quấy rối|nhắn tin quấy rối|bị làm phiền)\b/).test(n)) return { faqId: "report", text: "Bị nhắn tin quấy rối thì bạn làm 2 bước nha:\n1. **Chặn**: trong khung chat hoặc hồ sơ người đó bấm ⋯ → Chặn người dùng\n2. **Báo cáo**: bấm ⋯ → Báo cáo, mô tả chuyện gì xảy ra (thêm ảnh chụp màn hình nếu có) để Ban quản trị xử lý\n\nĐừng trả lời hay gửi thông tin cá nhân cho người đó." };
  // Đặt xe / giao hàng
  if (inCtx("ridebook", "ridecancel", "ridetrack", "ridprice", "ridepay") || VN(/\b(chuyến|tài xế|đơn giao|giao hàng|đặt xe)\b/).test(n)) {
    if (VN(/\b(huỷ|hủy)\b/).test(n)) return { faqId: "ridecancel" };
    if (VN(/\b(chưa (có )?(ai |tài xế )?nhận|không (có )?(ai |tài xế )?nhận|đợi \S+ phút|chờ lâu|tài xế (không|chưa) (tới|đến)|không thấy tài xế)\b/).test(n))
      return { faqId: "ridetrack", text: "Chưa có tài xế nhận (hoặc tài xế chưa tới) thì bạn xem ở **Đưa đón (/dua-don) → Chuyến hiện tại**:\n• Chưa ai nhận: có thể giờ này ít tài xế đang mở nhận chuyến gần bạn — chờ thêm chút hoặc **Hủy chuyến** rồi đặt lại sau\n• Tài xế đã nhận mà chưa tới: xem vị trí tài xế trên bản đồ, **nhắn tin hoặc gọi** tài xế ngay trong chuyến\n• Gặp sự cố với tài xế thì gửi Báo cáo để Ban quản trị xử lý" };
    if (VN(/\b(đổi địa chỉ|sửa địa chỉ|thay địa chỉ|người nhận đổi|đổi chỗ|sửa (đơn|điểm)|đổi điểm)\b/).test(n) || (inCtx("ridebook") && VN(/\b(sửa được không|đổi được không)\b/).test(n)))
      return { faqId: "ridetrack", text: "Đơn đã có tài xế nhận mà cần đổi địa chỉ thì bạn **nhắn tin hoặc gọi tài xế** ngay trong chuyến (Đưa đón → Chuyến hiện tại) để báo địa chỉ mới — giá có thể thay đổi nếu quãng đường khác nhiều. Nếu tài xế không nhận đổi được thì Hủy chuyến rồi đặt đơn mới với địa chỉ đúng nha." };
  }
  // Thông báo không về
  if (inCtx("notif", "notifmissing", "msgmanage") && VN(/\b(không có gì|không thấy|không nhận|không về|không hiện|lỗi app|mới update|vẫn không)\b/).test(n)) return { faqId: "notifmissing" };
  // Cài app ra màn hình chính
  if (inCtx("install", "update", "forgot", "forgotnoemail") && VN(/\b(chrome|android|ba chấm|3 chấm|không thấy (nút|mục|chữ)?( thêm| cài)?|màn hình chính|safari|iphone)\b/).test(n))
    return { faqId: "install", text: "Trên **Chrome Android** bạn thử vầy nha:\n1. Mở ilomi.live bằng Chrome (không mở trong Zalo / Messenger / Facebook)\n2. Bấm **⋮** góc trên bên phải → tìm **“Cài đặt ứng dụng”** hoặc **“Thêm vào màn hình chính”** (tên mục tuỳ phiên bản Chrome)\n3. Không thấy hai mục đó thì có thể **máy đã cài app rồi** — xem trong danh sách ứng dụng; gỡ bản cũ ra rồi vào lại trang để cài bản mới\n4. Vẫn không được thì cập nhật Chrome lên bản mới nhất\n\nTrong app cũng có nút: Hồ sơ → ⋯ → Cài đặt → Cài app ra màn hình chính." };
  // Đổi mật khẩu (không phải quên)
  if (inCtx("password", "forgot", "forgotnoemail") && VN(/\b(không phải quên|vẫn đăng nhập được|đổi trong hồ sơ|đang đăng nhập|muốn đổi)\b/).test(n)) return { faqId: "password" };
  // Ảnh đại diện vẫn cũ / ảnh bị xoay
  if (inCtx("avatar", "wall", "community", "bizphotos") && VN(/\b(vẫn (là )?ảnh cũ|chưa đổi|không đổi|lưu rồi)\b/).test(n))
    return { faqId: "avatar", text: "Lưu rồi mà vẫn thấy ảnh cũ thường là do app còn giữ bản cũ trong bộ nhớ tạm. Bạn thử **tắt hẳn app (vuốt khỏi đa nhiệm) rồi mở lại**, hoặc kéo trang xuống để tải lại. Vẫn ảnh cũ thì đổi lại một lần nữa (ảnh JPG / PNG, dung lượng vừa phải) — còn không được thì báo Ban quản trị: Hồ sơ → ⋯ → Trợ giúp & Liên hệ." };
  if (VN(/\bảnh\b( \S+){0,2} (bị )?(xoay|ngược|nghiêng|lộn)/).test(n))
    return { text: "Ảnh bị xoay ngang thường do điện thoại lưu hướng xoay riêng trong ảnh. Bạn thử: mở ảnh trong thư viện điện thoại → **Chỉnh sửa → xoay đúng chiều → Lưu**, rồi đăng lại ảnh đó; hoặc chụp màn hình ảnh rồi đăng ảnh chụp màn hình. Bài đã đăng thì xoá ảnh cũ / sửa bài và tải lại ảnh mới nha." };
  // Thanh toán rồi mà vẫn free
  if (inCtx("membership", "memberexp", "free", "tip") && VN(/\b(trừ tiền|tiền trừ|đã chuyển|chuyển khoản rồi|thanh toán rồi|vẫn free|vẫn miễn phí|chưa lên|chưa được)\b/).test(n))
    return { faqId: "support", text: "Đã thanh toán mà tài khoản chưa lên Membership thì bạn **đừng thanh toán lại** nha. Chụp màn hình giao dịch (có mã giao dịch, thời gian, số tiền) rồi gửi cho Ban quản trị: Hồ sơ → ⋯ → Trợ giúp & Liên hệ (Email / Zalo / Facebook) để được kiểm tra và cập nhật." };
  // Doanh nghiệp gửi duyệt lâu
  if (inCtx("bizcreate", "bizedit", "bizphotos", "bizoffer", "bizstatus") && VN(/\b(gửi duyệt rồi|chờ duyệt|đang chờ|mấy ngày rồi|\d+ ngày rồi|ba ngày rồi|gửi lại|bao lâu (mới )?(duyệt|được))\b/).test(n))
    return { faqId: "bizstatus", text: "Doanh nghiệp được Ban quản trị **duyệt tay**, nên bạn **không cần gửi lại** (gửi trùng dễ làm chậm thêm). Bạn xem trong Hồ sơ doanh nghiệp hoặc Thông báo có ghi chú “Ban quản trị yêu cầu bổ sung” không — có thì sửa đúng mục được nhắc rồi Lưu là hồ sơ tự gửi lại.\n\nChờ lâu mà chưa thấy gì thì nhắn Ban quản trị: Hồ sơ → ⋯ → Trợ giúp & Liên hệ." };
  // Quẹt: hẹn hò / tìm bạn / match
  if (inCtx("quetwhat", "quetconnect", "quetmanage") || VN(/\bquẹt\b/).test(n)) {
    if (VN(/\b(hẹn hò|dating|tìm người yêu|tìm bạn|kết bạn|không muốn hẹn hò)\b/).test(n))
      return { faqId: "quetwhat", text: "Quẹt **không chỉ để hẹn hò** đâu nha 😄 Có 4 mục: **Game, Làm quen, Trao đổi, Công việc**. Muốn tìm bạn thì chọn **Game** (rủ chơi game) hoặc **Làm quen**, và ghi rõ trong nhu cầu là “tìm bạn đi cà phê / nói chuyện, không hẹn hò” để người khác biết. Hai bên cùng quẹt phải 👉 mới kết nối và nhắn tin được." };
    if (VN(/\b(match|kết nối|nhắn tin ở đâu|nút chat|không thấy (nút )?(chat|nhắn))\b/).test(n)) return { faqId: "quetconnect" };
  }
  // Nhận ưu đãi: dùng ở đâu, có cần đưa mã
  if (inCtx("claim", "claimexp", "pin", "offerlist") && VN(/\b(dùng ở đâu|xài ở đâu|đưa mã|đưa (cho )?nhân viên|đọc mã|có cần mã|xuất trình)\b/).test(n)) return { faqId: "claim" };
  return null;
}

// ═══════════════ Lọc tiếp danh sách quán vừa gợi ý ═══════════════
// "rẻ hơn đi", "cho 6 người", "có chỗ đậu ô tô", "mở khuya không", "có phòng riêng", "wifi ổn" — Lomi chưa lọc được theo các
// tiêu chí này (dữ liệu quán chưa có trường đó) → nói thật và chỉ cách xem / hỏi quán, không đáp "Ồ, đi em luôn hả 😄".
export function searchRefine(q: string): string | null {
  const n = N(q);
  if (words(q) > 12) return null;
  const parts: string[] = [];
  if (VN(/\b(rẻ|bình dân|giá mềm|giá sinh viên|ngân sách|\d+ ?k|\d+ nghìn|\d+ ngàn|không đắt|đỡ đắt)\b/).test(n)) parts.push("giá");
  if (VN(/\b(mở khuya|khuya|ăn đêm|sau \d+ giờ|mở tới \d+|mở đến \d+|mở buổi tối|mở tối|mở sớm|buổi sáng|mấy giờ đóng|giờ mở cửa|còn mở)\b/).test(n)) parts.push("giờ mở cửa");
  if (VN(/\b(cho|nhóm|đi) (\d+|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)( người| đứa| bạn)?\b|\b\d+ người\b/).test(n)) parts.push("số người");
  if (VN(/\b(đậu ô tô|đỗ ô tô|đậu xe|đỗ xe|chỗ đậu|bãi xe|giữ xe|đậu oto|đỗ oto)\b/).test(n)) parts.push("chỗ đậu xe");
  if (VN(/\b(phòng riêng|phòng vip)\b/).test(n)) parts.push("không gian");
  if (VN(/\b(wifi|wi-fi|ngồi làm việc|làm việc|ổ cắm|học bài|ngồi lâu)\b/).test(n)) parts.push("chỗ ngồi làm việc / wifi");
  if (VN(/\b(trẻ nhỏ|trẻ em|con nít|có bé|đi với con|cho bé)\b/).test(n)) parts.push("phù hợp trẻ nhỏ");
  if (VN(/\b(giao hàng|ship|giao tận|có giao|giao về)\b/).test(n)) parts.push("giao hàng");
  if (!parts.length) return null;
  const list = parts.join(", ");
  const tips: string[] = [];
  if (parts.includes("giờ mở cửa")) tips.push("mỗi thẻ quán có nhãn **Đang mở / Đã đóng** theo giờ chủ quán khai — bấm vào thẻ để xem giờ mở cửa");
  if (parts.includes("giao hàng")) tips.push("quán không tự giao thì bạn dùng **Giao hàng / Giao đồ ăn** trong mục Đưa đón (/dua-don) để nhờ tài xế mua giúp");
  if (parts.includes("số người") || parts.includes("không gian") || parts.includes("chỗ đậu xe")) tips.push("đi đông hay cần phòng riêng, chỗ đậu xe thì **gọi trước** cho quán (số điện thoại có trong trang quán) để giữ chỗ");
  if (parts.includes("giá")) tips.push("bấm vào thẻ quán để xem ảnh menu, đánh giá và ưu đãi đang có — quán có ưu đãi thì đi sẽ đỡ hơn");
  tips.push("muốn gần một chỗ cụ thể thì nói Lomi kiểu “gần chợ”, “gần hồ Xuân Hương”, hoặc bật vị trí để Lomi xếp theo khoảng cách");
  return `Lomi chưa lọc được theo **${list}** đâu 🙏 — dữ liệu quán trong app chưa ghi đủ những thông tin này nên Lomi không dám đoán.\n• ${tips.join("\n• ")}`;
}
