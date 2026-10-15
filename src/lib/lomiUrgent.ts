// ─────────────────────────────────────────────────────────────────────────────
// TÌNH HUỐNG KHẨN CẤP (15/10, audit sức khoẻ) — chạy trên máy, không gọi AI.
//
// Lỗi cần sửa (chạy thử thật qua khung chat): câu KỂ một tình huống cấp cứu bị các lớp đứng trước khối sức khoẻ bắt mất —
//   "con a uống nhầm thuốc tẩy" / "đứt tay chảy máu nhiều quá" → "chưa hiểu ý"
//   "bà bầu bị ra máu"            → "Chúc mừng nha! Được mấy tháng rồi?"
//   "con a bị đuối nước", "bé bị bỏng nước sôi" → "Giờ sao rồi?" / "Có nặng không?"
//   "ăn tôm xong sưng môi khó thở" → hỏi "bị bao lâu rồi"
// trong khi kho kiến thức y khoa (lib/medkb) ĐÃ có thẻ sơ cứu có nguồn cho đúng các tình huống đó.
//
// File này chỉ NHẬN DIỆN tình huống và chọn thẻ; nội dung sơ cứu lấy nguyên từ thẻ có nguồn (lomiMed.renderMed).
// Câu dẫn chỉ nói việc phải làm ngay (gọi 115 / đi khám ngay) — không thêm kiến thức y khoa mới.
// Riêng "nuốt phải dị vật" (chưa có thẻ) dùng đúng hướng dẫn của NHS Healthier Together (Wessex), có ghi nguồn.
// Câu hỏi kiến thức ("bỏng có để lại sẹo không", "đuối nước là gì") không thuộc đây — để kho kiến thức trả lời như cũ.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

export type Urgent = {
  id: "poison" | "swallow" | "choke" | "drown" | "bleed" | "burn" | "anaphylaxis" | "preg" | "preeclampsia" | "hypo";
  /** Thẻ medkb có nguồn để lấy phần sơ cứu / khi nào đi cấp cứu. */
  card?: string;
  /** Phần của thẻ cần đưa: "care" (sơ cứu — thẻ sơ cứu tự kèm khi nào gọi 115) hoặc "emergency" (khi nào cần xử trí khẩn). */
  aspect?: "care" | "emergency" | "both";
  /** Câu mở đầu: việc phải làm NGAY. */
  head: string;
  /** Phần thêm sau nội dung thẻ (nguồn riêng, đường dây hỗ trợ…). */
  extra?: string;
};

// Câu hỏi KIẾN THỨC về tình huống (không phải đang xảy ra) → để kho kiến thức trả lời.
const KNOWLEDGE = VN(/\b(là gì|là sao|bao lâu (thì )?(lành|khỏi|hết)|có (để lại )?sẹo|có lây|kiêng gì|ăn gì|nên ăn|vì sao|tại sao|nguyên nhân|phòng (ngừa|tránh)|cách phòng|có di truyền|thống kê|bao nhiêu người)\b/);
// Người bị là người khác (con, mẹ, bé…) — để không nói như thể chính người gõ đang có ý làm hại mình.
const OTHER = VN(/\b(con|bé|em bé|cháu|mẹ|má|ba|bố|cha|ông|bà|vợ|chồng|anh ấy|chị ấy|em ấy|bạn (tôi|tui|mình|em|anh|a|e)|nó|người nhà|đứa nhỏ|thằng nhỏ|con nhỏ)\b/);

const POISON = VN(/\b((uống|nuốt|ăn|hít|lỡ uống|uống nhầm|uống phải|nuốt phải|nuốt nhầm|ăn phải|hít phải)\s+(nhầm\s+|phải\s+)?(thuốc tẩy|nước tẩy|javel|thuốc chuột|bả chuột|thuốc trừ sâu|thuốc sâu|thuốc diệt cỏ|thuốc diệt côn trùng|hoá chất|hóa chất|xăng|dầu hoả|dầu hỏa|nước rửa chén|nước lau sàn|axit|acid|thuốc tẩy bồn cầu)|ngộ độc (hoá chất|hóa chất|thuốc trừ sâu|thuốc sâu|khí|khí ga|khói|thuốc diệt cỏ|thuốc chuột))\b/);
const SELF_HARM_POISON = VN(/\b(thuốc chuột|bả chuột|thuốc trừ sâu|thuốc sâu|thuốc diệt cỏ)\b/);
const SWALLOW = VN(/\b(nuốt (phải |nhầm |mất )?(đồng xu|xu|pin|pin cúc|pin nút|nam châm|đinh|cây kim|kim|ghim|hạt|hột|đồ chơi|dị vật|cúc áo|nút áo|viên bi|bi|mảnh|miếng nhựa))\b/);
// (Lời than "nghẹn ngào", "nghẹn lời", và chuyện hay bị nghẹn từ lâu không phải đang hóc.)
const CHOKE_NOT = VN(/\b(nghẹn ngào|nghẹn lời|hay bị nghẹn|thỉnh thoảng bị nghẹn|hay nghẹn)\b/);
const CHOKE = VN(/\b(bị hóc|hóc (xương|hạt|hột|dị vật|đồ chơi|kẹo|thạch|thức ăn)|mắc (xương|nghẹn)|bị nghẹn|nghẹn (thức ăn|không thở|thở không))\b/);
const DROWN = VN(/\b(đuối nước|chết đuối|ngạt nước|chìm nước|bị chìm|sặc nước (biển|hồ|sông|hồ bơi|bể bơi))\b/);
const BLEED = VN(/\b(chảy máu (nhiều|không cầm|không ngừng|không dứt|xối xả|ồ ạt|quá trời|dữ lắm|đầm đìa)|máu chảy (nhiều|không ngừng|không cầm|xối xả|ồ ạt|quá trời)|mất (nhiều|rất nhiều) máu|máu phun|chảy máu (ở )?đầu|vỡ đầu|toác đầu)\b/);
const NOSE_GUM = VN(/\b(chảy máu cam|máu cam|chân răng|nướu|lợi|kinh nguyệt|đến tháng|hành kinh|rong kinh|cường kinh|hiến máu)\b/);
// Chuyện đọc / xem ở đâu đó (tin tức, phim, truyện) — không phải đang xảy ra với người dùng.
const HEARSAY = VN(/\b(tin tức|đọc báo|trên báo|xem tin|bản tin|đọc tin|trên mạng|trên tivi|trong phim|xem phim|đọc truyện|trong truyện|trong game)\b/);
const BURN = VN(/\b((bị|vừa bị|mới bị|lỡ bị) (bỏng|phỏng)(?! (nắng|lưỡi))|(bỏng|phỏng) (nước sôi|nước nóng|lửa|dầu|dầu nóng|điện|hoá chất|hóa chất|axit|nặng|nồi|bô|ô bô|pô|cháy|canh nóng|cháo nóng))\b/);
// Phản vệ: theo thẻ soc-phan-ve và trang NHS "Insect bites and stings" — môi / miệng / lưỡi / họng sưng đột ngột, họng thít, khó thở.
//   (Chỉ sưng MẶT sau khi bị đốt thì NHS không xếp vào gọi cấp cứu → để mạch triệu chứng hỏi thêm.)
const SWELL_AIR = VN(/\b(sưng (lưỡi|họng|cổ họng)|lưỡi sưng|họng (sưng|thít)|thít họng)\b/);
const SWELL = VN(/\b(sưng (môi|mặt|mí|mí mắt|mắt|miệng)|phù (môi|mặt)|môi sưng|mặt sưng|nổi mề đay|mề đay|nổi mẩn|mẩn đỏ|phát ban|nổi ban|ngứa khắp người)\b/);
const AIRWAY = VN(/\b(khó thở|thở khò khè|thở rít|tức ngực|khó nuốt|nghẹt thở|thở không (được|nổi)|không thở được|choáng|ngất|lơ mơ|tím tái)\b/);
const TRIGGER = VN(/\b(ong (đốt|chích)|bị (ong|kiến|côn trùng|bò cạp|rết) (đốt|chích|cắn)|ăn (tôm|cua|hải sản|đậu phộng|lạc|trứng)( \S+){0,3} (xong|vào|rồi)|sau khi (ăn|uống thuốc|tiêm)|uống thuốc (xong|vào))\b/);
const SUDDEN_LIP = VN(/\b(sưng (môi|miệng)|môi sưng)\b/);
// Thai kỳ — chỉ những cách nói rõ là đang mang thai ("bầu cử", "bầu trời" không phải).
const PREG = VN(/\b(mang thai|có thai|có bầu|bà bầu|mẹ bầu|đang bầu|đang mang bầu|bầu (\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mấy) (tháng|tuần)|thai (\d+|mấy) (tuần|tháng))\b/);
const PREG_URGENT = VN(/\b(ra máu|ra huyết|chảy máu|đau bụng (dữ dội|nhiều|quá|lắm|quặn|không chịu nổi)|quặn bụng|ra nước|vỡ ối|rỉ ối|thai (không|ít) (máy|đạp)|không thấy thai (máy|đạp)|thai máy ít|ít đạp|co giật|ngất)\b/);
const PE_VISION = VN(/\b(nhìn mờ|mờ mắt|hoa mắt|nhìn thấy đốm|thấy chớp sáng|nhìn đôi)\b/);
const PE_HEAD = VN(/\b(đau đầu|nhức đầu)\b/);
const PE_SWELL = VN(/\b(phù|sưng) (mặt|tay|chân|người|cả người)\b/);
const PE_RIB = VN(/\b(đau (dưới|vùng) sườn|đau thượng vị|đau trên rốn)\b/);
// Hạ đường huyết ở người đang bị tiểu đường (thẻ ha-duong-huyet).
const DIABETES = VN(/\b(tiểu đường|đái tháo đường)\b/);
const HYPO = VN(/\b(vã mồ hôi|toát mồ hôi|đổ mồ hôi lạnh|run tay|run rẩy|run người|lả đi|mệt lả|đói cồn cào|bủn rủn|lú lẫn|lơ mơ|choáng|xỉu|ngất)\b/);

const CALL = "gọi **115** ngay";

/** Câu kể một tình huống cần xử trí khẩn → tình huống + thẻ để trả lời; không phải thì null. */
export function urgentOf(text: string): Urgent | null {
  const n = ` ${normalizeVi(text)} `;
  if (n.trim().split(" ").length > 30) return null;
  if (KNOWLEDGE.test(n) || HEARSAY.test(n)) return null;
  const other = OTHER.test(n);

  // Thai kỳ đứng trước "chảy máu" chung: đang mang thai mà ra máu là chuyện của thai kỳ.
  if (PREG.test(n)) {
    if (PREG_URGENT.test(n))
      return {
        id: "preg",
        head: `🚨 Đang mang thai mà **ra máu, đau bụng nhiều, ra nước (rỉ / vỡ ối), thai máy ít hẳn đi hoặc co giật, ngất** thì cần được khám **ngay** — ${CALL} hoặc tới khoa sản / cơ sở y tế gần nhất, đừng chờ xem có đỡ không.`,
        extra: "Lomi không đánh giá được tình trạng của mẹ và bé qua tin nhắn — nhân viên y tế cần khám trực tiếp. Mang theo sổ khám thai nếu có nha.",
      };
    const head = PE_HEAD.test(n);
    if (PE_VISION.test(n) || PE_RIB.test(n) || (head && PE_SWELL.test(n)))
      return {
        id: "preeclampsia",
        card: "tien-san-giat",
        aspect: "emergency",
        head: "⚠️ Đang mang thai mà **nhìn mờ / hoa mắt, đau đầu kèm phù mặt – tay – chân, hoặc đau dưới sườn** có thể là dấu hiệu **tiền sản giật** — cần được khám **khẩn**: gọi **115** hoặc tới khoa sản ngay.",
      };
  }
  if (POISON.test(n)) {
    const selfHarm = !other && SELF_HARM_POISON.test(n);
    return {
      id: "poison",
      card: "ngo-doc",
      aspect: "care",
      head: `🚨 Nuốt / uống / hít phải chất độc là tình huống cấp cứu — ${CALL} hoặc đưa tới cơ sở y tế gần nhất, **kể cả khi lúc này trông vẫn bình thường**. Mang theo chai, bao bì của chất đó.`,
      extra: selfHarm
        ? "Nếu bạn đang có ý định làm hại bản thân: bạn không phải một mình đâu 💚 Gọi **115** khi nguy hiểm, hoặc đường dây Ngày Mai **096 306 1414** (13h–20h30, thứ 4 đến Chủ nhật), và nhờ một người tin tưởng ở cạnh bạn lúc này."
        : undefined,
    };
  }
  if (CHOKE.test(n) && !CHOKE_NOT.test(n))
    return { id: "choke", card: "hoc-di-vat", aspect: "care", head: `🚨 Đang **hóc / nghẹn mà không thở, không ho, không nói được** → ${CALL} và sơ cứu ngay theo hướng dẫn dưới đây.` };
  if (SWALLOW.test(n))
    return {
      id: "swallow",
      head: [
        "🚨 Nuốt phải **pin (nhất là pin cúc), nam châm, vật nhọn hoặc vật to** → đưa đi cấp cứu **ngay** (gọi **115**).",
        "Cũng đi cấp cứu ngay nếu sau khi nuốt có: chảy nước dãi nhiều hơn bình thường, thở khó hoặc thở rít, ho mới xuất hiện, nghẹn khi ăn uống, bỏ ăn, nôn ói, đau nhiều, đi ngoài ra máu, lơ mơ hoặc khó đánh thức.",
        "Đau nhẹ, sốt, hoặc hơn một ngày không đi ngoài như bình thường → gọi bác sĩ / đi khám trong ngày.",
        "Không có các dấu hiệu trên thì phần lớn vật nhỏ sẽ tự ra theo phân, thường trong khoảng 3–5 ngày. Vẫn lo thì hỏi bác sĩ hoặc dược sĩ nha.",
      ].join("\n\n"),
      extra: "📚 Nguồn: NHS Healthier Together (Wessex) — “Swallowed a foreign object” (healthiertogether.westlondon.nhs.uk). Đây là hướng dẫn tham khảo chung, không thay bác sĩ khám trực tiếp.",
    };
  if (DROWN.test(n)) return { id: "drown", card: "duoi-nuoc", aspect: "care", head: `🚨 Đuối nước là tình huống cấp cứu — ${CALL}, kể cả khi người đó đã tỉnh lại.` };
  if (BLEED.test(n) && !NOSE_GUM.test(n)) return { id: "bleed", card: "chay-mau", aspect: "care", head: `🚨 Chảy máu nhiều hoặc không cầm được → ${CALL}, trong lúc chờ thì sơ cứu như dưới đây.` };
  if (SWELL_AIR.test(n) || (SWELL.test(n) && AIRWAY.test(n)) || (SUDDEN_LIP.test(n) && TRIGGER.test(n)))
    return { id: "anaphylaxis", card: "soc-phan-ve", aspect: "care", head: `🚨 Sưng môi / lưỡi / họng đột ngột, hoặc nổi mẩn kèm khó thở có thể là **sốc phản vệ** — ${CALL}, nói rõ là nghi phản vệ, đừng chờ xem có đỡ không.` };
  if (BURN.test(n)) return { id: "burn", card: "so-cuu-bong", aspect: "care", head: "🔥 Sơ cứu bỏng **ngay bây giờ** theo hướng dẫn dưới đây — và xem phần khi nào phải gọi **115**." };
  if (DIABETES.test(n) && HYPO.test(n))
    return {
      id: "hypo",
      card: "ha-duong-huyet",
      aspect: "both",
      head: "⚠️ Người đang bị tiểu đường mà **vã mồ hôi, run, chóng mặt, lả hay lú lẫn** thì cần nghĩ tới **hạ đường huyết** và xử trí ngay theo hướng dẫn dưới đây. Đã lơ mơ, không tỉnh hoặc không nuốt được → **không cho ăn uống**, gọi **115**.",
    };
  return null;
}
