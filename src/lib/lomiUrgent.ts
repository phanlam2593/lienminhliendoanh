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
  id: "fall" | "poison" | "swallow" | "choke" | "drown" | "bleed" | "burn" | "anaphylaxis" | "preg" | "preeclampsia" | "hypo" | "dengue" | "dvt" | "glaucoma" | "dehydration" | "panicish";
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

// 21/10 (audit bổ sung): thêm dầu hôi / dầu lửa / nhớt / nước giặt / băng phiến / cồn sát khuẩn / pin cúc áo… — trước đây
//   "bé nhà a uống dầu hôi" bị đáp "😅 kể em nghe với". (Nuốt pin / nam châm là DỊ VẬT — SWALLOW bên dưới lo, có lời dặn riêng.)
// 21/10 (đợt 3): danh sách chất độc dùng chung — lib/lomiChat.crisisReply cũng dùng (poisonIntent) để nhận Ý ĐỊNH tự hại bằng hoá chất.
const POISON_SUBST = "thuốc tẩy|nước tẩy|javel|thuốc chuột|bả chuột|thuốc trừ sâu|thuốc sâu|thuốc diệt cỏ|thuốc diệt côn trùng|hoá chất|hóa chất|xăng|dầu hoả|dầu hỏa|nước rửa chén|nước lau sàn|axit|acid|thuốc tẩy bồn cầu|dầu hôi|dầu lửa|dầu nhớt|nhớt xe|nhớt|nước giặt|viên giặt|nước xả vải|nước lau kính|thuốc tẩy quần áo|băng phiến|long não|thuốc diệt muỗi|thuốc xịt muỗi|nhang muỗi|cồn 70|cồn 90|cồn y tế|cồn sát khuẩn|nước rửa tay khô";
const POISON = VN(new RegExp(`\\b((uống|nuốt|ăn|hít|lỡ uống|uống nhầm|uống phải|nuốt phải|nuốt nhầm|ăn phải|hít phải)\\s+(nhầm\\s+|phải\\s+)?(${POISON_SUBST})|ngộ độc (hoá chất|hóa chất|thuốc trừ sâu|thuốc sâu|khí|khí ga|khói|thuốc diệt cỏ|thuốc chuột))\\b`));
// Ý ĐỊNH tự hại bằng chất độc / hoá chất CHƯA xảy ra ("a muốn uống thuốc tẩy để chết", "a định uống thuốc trừ sâu cho xong") —
//   không được đáp như sự cố đã xảy ra; lib/lomiChat.crisisReply đáp lời hỗ trợ khủng hoảng.
const POISON_INTENT = VN(new RegExp(`\\b(muốn|định|tính|sẽ|sắp|chuẩn bị|chỉ muốn|thèm|quyết định) (\\S+ ){0,2}?(uống|nuốt|ăn|hít|tu|nốc) (hết |cả |nguyên |một |1 )?(chai |lọ |hộp |can |gói |bình |ly )?(${POISON_SUBST})\\b|\\b(uống|nuốt|ăn|hít|tu|nốc) (\\S+ ){0,4}?(để|cho) (chết|xong đời|chết luôn|tự tử|khỏi sống)\\b`));
export function poisonIntent(text: string): boolean {
  return POISON_INTENT.test(` ${normalizeVi(text)} `);
}
const SELF_HARM_POISON = VN(/\b(thuốc chuột|bả chuột|thuốc trừ sâu|thuốc sâu|thuốc diệt cỏ)\b/);
const SWALLOW = VN(/\b(nuốt (phải |nhầm |mất )?(đồng xu|xu|pin|pin cúc|pin nút|cục pin|viên pin|nam châm|đinh|cây kim|kim|ghim|hạt|hột|đồ chơi|dị vật|cúc áo|nút áo|viên bi|bi|mảnh|miếng nhựa))\b/);
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

const FALL = VN(/\b(bị ngã|té ngã|bị té|ngã cầu thang|té cầu thang|ngã xe|té xe|trượt ngã|ngã đập|té đập)\b/);
const FALL_BAD = VN(/\b(không (đứng|ngồi|tự) dậy được|không dậy được|không đứng lên được|đập đầu|va đầu|đau (hông|lưng|cổ|háng) (dữ dội|nhiều|lắm|quá)|gãy|không cử động được|bất tỉnh|ngất|lơ mơ)\b/);
const ELDER = VN(/\b(ông|bà|ông bà|ba|bố|mẹ|má|cụ|người già|người cao tuổi|cao tuổi|lớn tuổi|[6-9]\d tuổi|1[01]\d tuổi)\b/);
const CALL = "gọi **115** ngay";
// 18/10 (audit F, P0): đang sốt xuất huyết mà kể DẤU HIỆU CẢNH BÁO (NHS "Dengue", rà soát 13/08/2026: đau bụng dữ dội, nôn nhiều lần,
//   thở nhanh, chảy máu chân răng / mũi, rất mệt, bồn chồn, nôn / phân có máu → đi cấp cứu). Trước đây "sốt xuất huyết ngày thứ 4 đau bụng,
//   chảy máu chân răng" bị chọn nhầm thẻ viêm nướu ("chảy máu chân răng" là một tên của thẻ đó) rồi rơi vào nhánh hỏi thêm.
//   Chỉ khi câu NÊU RÕ sốt xuất huyết; hỏi kiến thức ("sốt xuất huyết là bệnh gì") đã bị KNOWLEDGE loại từ trước.
const DENGUE = VN(/\b(sốt xuất huyết|sxh|dengue)\b/);
// (review F1) "năm ngoái bị sốt xuất huyết, chảy máu cam, giờ khỏi rồi" là chuyện đã qua.
const DENGUE_PAST = VN(/\b(năm ngoái|năm trước|hồi trước|lúc trước|trước đây|hồi nhỏ|đã khỏi|khỏi rồi|khỏi hẳn|hết bệnh|từng bị)\b/);
// Có người / thời điểm cụ thể đang bị → nói như tình huống đang xảy ra; không có → câu hỏi chung.
const DENGUE_NOW = VN(/\b(đang|giờ|bây giờ|hôm nay|tối nay|sáng nay|ngày (thứ )?\d+|tôi|tui|mình|em|anh|chị|con|bé|cháu|vợ|chồng|mẹ|má|ba|bố|ông|bà|nó|hàng xóm|bạn)\b/);
// Dấu hiệu bị PHỦ ĐỊNH ("không chảy máu chân răng", "không đau bụng") thì không tính.
function dengueWarnAsserted(n: string): boolean {
  let off = 0;
  for (;;) {
    const m = n.slice(off).match(DENGUE_WARN);
    if (!m || m.index === undefined) return false;
    const idx = off + m.index;
    if (!VN(/\b(không|ko|chưa|hết|không còn|không bị|không có)\s*$/).test(n.slice(0, idx))) return true;
    off = idx + m[0].length;
  }
}
const DENGUE_WARN = VN(/\b(đau bụng (dữ dội|nhiều|quá|lắm|quặn)|quặn bụng|nôn (nhiều|liên tục|hoài|ra máu)|ói (nhiều|liên tục|ra máu)|chảy máu (chân răng|nướu|lợi|mũi|cam)|máu cam|thở (nhanh|gấp)|li bì|lừ đừ|mệt lả|rất mệt|bồn chồn|vật vã|phân (có máu|đen)|đi (ngoài|cầu) ra máu)\b/);

// 21/10 (QA V2): huyết khối, tăng nhãn áp cấp, mất nước, cơn lo kèm tim đập nhanh.
const CALF = VN(/\b(bắp chân|cẳng chân|bắp chuối|bắp vế|một bên chân|một chân|chân trái|chân phải)\b/);
const CALF_PAIN = VN(/\b(đau|nhức|căng tức|chuột rút)\b/);
const CALF_SWELL = VN(/\b(sưng|phù|nóng đỏ|đỏ lên|to hơn)\b/);
const LONG_SIT = VN(/\b(chuyến bay|bay dài|đi máy bay|ngồi lâu|ngồi xe lâu|nằm lâu|sau mổ|sau phẫu thuật|bó bột|ngồi suốt)\b/);
const EYE_PAIN = VN(/\b(đau mắt|nhức mắt|mắt đau|mắt nhức)( \S+){0,2} (dữ dội|nhiều|quá|đột ngột|kinh khủng|lắm)|(đau|nhức) (dữ dội|đột ngột)( \S+){0,2} (mắt|hốc mắt)\b/);
const EYE_HALO = VN(/\b(quầng sáng|vòng sáng|quầng (màu|cầu vồng)|thấy quầng)\b/);
const EYE_RED = VN(/\b(mắt đỏ|đỏ mắt|đỏ cả mắt)\b/);
const EYE_BLUR = VN(/\b(nhìn mờ|mờ mắt|mắt mờ|nhìn không rõ)\b/);
const GUT_LOSS = VN(/\b(tiêu chảy|đi ngoài|đi cầu (liên tục|nhiều)|nôn|ói)\b/);
const DEHY_SIGN = VN(/\b((chóng mặt|choáng|xây xẩm|hoa mắt) (khi |lúc )?(đứng|ngồi) (lên|dậy)|tiểu (rất )?ít|ít tiểu|không đi tiểu|không tiểu|nước tiểu (sẫm|đậm|ít)|mắt trũng|khát (dữ|nhiều|khô cổ)|lả đi|lừ đừ)\b/);
const PANICISH = VN(/\b(lo lắng|lo âu|hoảng|hoảng loạn|sợ hãi|căng thẳng)\b.*\b(sắp chết|như sắp chết|tưởng (mình )?chết|sợ chết|như muốn chết)\b/);
const PALP_RUN = VN(/\b(tim đập nhanh|tim đập mạnh|đánh trống ngực|hồi hộp|run)\b/);

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
  if (DENGUE.test(n) && dengueWarnAsserted(n) && !DENGUE_PAST.test(n))
    return {
      id: "dengue",
      card: "sot-xuat-huyet",
      aspect: "emergency",
      // (review F1) câu hỏi chung, không nói ai đang bị ("sốt xuất huyết có bị chảy máu chân răng không?") → trả lời như kiến thức: đó là dấu hiệu
      //   cảnh báo, NẾU đang bị thì đi cấp cứu — không nói như thể người hỏi đang trong tình huống cấp cứu.
      head: DENGUE_NOW.test(n)
        ? `⚠️ Đang sốt xuất huyết mà có những dấu hiệu như vậy thì cần **đi cấp cứu ngay** (nhờ người chở hoặc ${CALL}), đừng chờ ở nhà — nguồn y khoa xếp chúng vào dấu hiệu cảnh báo sốt xuất huyết nặng, có thể xuất hiện cả khi đã hạ sốt. Lomi không kết luận được là đã chuyển nặng chỉ qua tin nhắn; bác sĩ cần khám trực tiếp.`
        : `📌 Theo nguồn y khoa, đó là một trong những **dấu hiệu cảnh báo sốt xuất huyết nặng** (có thể xuất hiện cả khi đã hạ sốt). Nếu ai đang bị sốt xuất huyết mà có dấu hiệu này thì cần **đi cấp cứu ngay** (nhờ người chở hoặc ${CALL}), đừng chờ ở nhà.`,
      extra: "Trong lúc này đừng tự uống ibuprofen hay aspirin — với sốt xuất huyết, các thuốc giảm đau kháng viêm này có thể gây chảy máu.",
    };
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
  // Té ngã (thẻ te-nga, NHS Falls): gọi cấp cứu khi có thể chấn thương đầu, lưng, cổ, hông hoặc không đứng dậy được.
  if (FALL.test(n) && FALL_BAD.test(n))
    return { id: "fall", card: "te-nga", aspect: "care", head: `🚨 Bị ngã mà **có thể chấn thương đầu, lưng, cổ, hông, hoặc không tự đứng dậy được** → ${CALL}. Đừng cố đỡ dậy vội nếu nghi chấn thương cổ, lưng, hông.` };
  // Người LỚN TUỔI bị ngã (kể cả không thấy đau): NHS khuyên đi khám sau khi ngã để tìm nguyên nhân, phòng ngã lại.
  if (FALL.test(n) && ELDER.test(n) && !VN(/\b(ngã xe đạp nhẹ|không sao rồi|ổn rồi)\b/).test(n))
    return { id: "fall", card: "te-nga", aspect: "care", head: "⚠️ Người lớn tuổi bị ngã thì nên được kiểm tra kỹ, kể cả khi trông không sao — NHS khuyên đi khám sau khi bị ngã. Nếu **có thể chấn thương đầu, lưng, cổ, hông, hoặc không tự đứng dậy được** → gọi **115** ngay." };
  // 21/10 (QA V2 Q31): đau + sưng MỘT bên bắp chân (nhất là sau bay dài / ngồi lâu) — nghi huyết khối tĩnh mạch sâu.
  if (CALF.test(n) && ((CALF_PAIN.test(n) && CALF_SWELL.test(n)) || ((CALF_PAIN.test(n) || CALF_SWELL.test(n)) && LONG_SIT.test(n))))
    return {
      id: "dvt",
      head: `⚠️ Đau và sưng **một bên bắp chân** (nhất là sau chuyến bay dài, ngồi hay nằm lâu) có thể là dấu hiệu **cục máu đông ở tĩnh mạch sâu (huyết khối)** — cần được bác sĩ khám **khẩn, ngay trong hôm nay**. Đừng xoa bóp, chườm nóng hay cố tập cho chân đó.\n\nNếu kèm **khó thở, đau ngực (nhất là khi hít vào), ho ra máu** → ${CALL} ngay, vì cục máu đông có thể lên phổi.`,
      extra: "Lomi không chẩn đoán được qua tin nhắn — cần bác sĩ khám (thường kèm siêu âm) mới biết có phải huyết khối hay không.",
    };
  // 21/10 (QA V2 Q33): đau mắt dữ dội + đỏ mắt + nhìn mờ / thấy quầng sáng quanh đèn — nghi tăng nhãn áp cấp (glôcôm góc đóng).
  if (EYE_PAIN.test(n) && (EYE_HALO.test(n) || (EYE_RED.test(n) && EYE_BLUR.test(n))))
    return {
      id: "glaucoma",
      head: `🚨 Đau mắt **dữ dội**, mắt đỏ kèm **nhìn mờ hoặc thấy quầng sáng quanh đèn** (có thể kèm nhức đầu, buồn nôn) có thể là **tăng nhãn áp cấp (glôcôm góc đóng)** — cần đi **cấp cứu mắt ngay** (khoa Mắt / bệnh viện gần nhất), đừng tự nhỏ thuốc rồi chờ: để chậm có thể mất thị lực.`,
      extra: "Lomi không chẩn đoán được qua tin nhắn — bác sĩ mắt cần đo nhãn áp và khám trực tiếp.",
    };
  // 21/10 (QA V2 Q30): tiêu chảy / nôn kèm chóng mặt khi đứng, tiểu rất ít — mất nước đáng kể.
  if (GUT_LOSS.test(n) && DEHY_SIGN.test(n))
    return {
      id: "dehydration",
      head: `⚠️ Tiêu chảy hay nôn kèm **chóng mặt khi đứng lên, tiểu rất ít** là dấu hiệu **mất nước đáng kể** — nên đi khám **ngay trong hôm nay** để được bù nước đúng cách (có khi phải truyền).\n\nTrong lúc chờ: uống từng ngụm nhỏ, liên tục, dung dịch bù nước (oresol pha **đúng** hướng dẫn trên gói); đứng dậy từ từ, có người ở cạnh.\n\nLơ mơ, ngất, gần như không tiểu cả nửa ngày, đi ngoài ra máu, nôn ra mọi thứ không uống được → ${CALL} hoặc đi cấp cứu ngay.`,
      extra: "Trẻ nhỏ, người già, người có bệnh nền mất nước nhanh hơn — càng nên khám sớm.",
    };
  // 21/10 (QA V2 Q89): lo lắng + tim đập nhanh, run, cảm giác sắp chết — có thể là cơn hoảng loạn, nhưng không loại trừ được bệnh tim qua tin nhắn.
  if (PANICISH.test(n) && PALP_RUN.test(n))
    return {
      id: "panicish",
      head: `⚠️ Tim đập nhanh, run, cảm giác như sắp chết khi đang lo lắng **có thể** là một cơn hoảng loạn — thường lên đỉnh trong khoảng 10 phút rồi dịu dần. Nhưng Lomi **không phân biệt được** qua tin nhắn: nếu **đây là lần đầu**, hoặc có **đau / tức ngực, khó thở nhiều, ngất, yếu tay chân, méo miệng**, hoặc bạn có bệnh tim → ${CALL} ngay.`,
      extra: "Nếu từng bị như vậy và bác sĩ đã nói là hoảng loạn: ngồi xuống, thở chậm (hít vào đếm 4, thở ra đếm 6), nhìn và gọi tên 5 thứ quanh mình — cơn sẽ qua. Bị lặp lại nhiều lần thì nên đi khám để được điều trị, đừng chịu một mình nha.",
    };
  if (DIABETES.test(n) && HYPO.test(n))
    return {
      id: "hypo",
      card: "ha-duong-huyet",
      aspect: "both",
      head: "⚠️ Người đang bị tiểu đường mà **vã mồ hôi, run, chóng mặt, lả hay lú lẫn** thì cần nghĩ tới **hạ đường huyết** và xử trí ngay theo hướng dẫn dưới đây. Đã lơ mơ, không tỉnh hoặc không nuốt được → **không cho ăn uống**, gọi **115**.",
    };
  return null;
}
