// ─────────────────────────────────────────────────────────────────────────────
// HỎI – ĐÁP KIẾN THỨC SỨC KHOẺ THƯỜNG GẶP (30/09 r6, theo ý Kir) — chạy trên máy, không gọi AI.
// Dành cho câu hỏi kiểu "uống cà phê nhiều có sao không", "ăn gì để đẹp da", "ngủ bao nhiêu là đủ".
// (Kể triệu chứng thì do lib/lomiSymptoms lo.) Kiến thức phổ thông, không kê thuốc / liều lượng,
// không đưa chế độ ăn kiêng cụ thể; luôn nhắc hỏi bác sĩ khi có bệnh nền, đang mang thai, cho trẻ nhỏ.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { HEALTH, normStrict } from "@/lib/lomiAccent";
import { VR, VN } from "@/lib/viMatch";

// cue = chủ đề chỉ là TÊN đồ uống ("cà phê", "trà sữa") → phải có thêm ý hỏi về sức khoẻ mới trả lời kiến thức,
// để "cf?", "đi cà phê không", "trà sữa ở đâu ngon" không bị đáp thành bài sức khoẻ (01/10 r3, test thật trên app).
// src (15/10, audit sức khoẻ): nguồn đã đối chiếu cho đúng các ý trong câu trả lời; không có = kiến thức phổ thông CHƯA gắn nguồn
//   (câu đáp ghi rõ điều đó). Các con số (lượng caffeine, giờ ngủ, lượng nước, phút vận động…) chỉ giữ khi khớp nguồn.
type Fact = { id: string; re: RegExp; a: string; cue?: boolean; src?: string; checked?: string; first?: boolean; early?: boolean };
const HEALTH_CUE =
  VN(/\b(có sao|có hại|có tốt|tốt không|hại không|tác hại|lợi ích|ảnh hưởng|sức khoẻ|uống nhiều|nhiều quá|quá nhiều|mỗi ngày|bao nhiêu|mấy ly|mấy cốc|lúc nào|buổi tối|buổi sáng|khi đói|bụng đói|dạ dày|mất ngủ|khó ngủ|tim đập|huyết áp|mang thai|có bầu|cho con bú|trẻ em|béo|mập|tăng cân|giảm cân|đường|nghiện|cai|bỏ được|nóng trong|lợi tiểu|nên uống|có nên uống|uống được không)\b/);

const FACTS: Fact[] = [
  {
    // 04/10: hỏi thuốc / tác dụng phụ / liều → không kê thuốc, không đưa liều cho cá nhân.
    id: "meds",
    re: VN(/\b(tác dụng phụ|uống thuốc gì|thuốc gì|dùng thuốc gì|liều dùng|liều lượng|uống mấy viên|uống bao nhiêu viên|thuốc nào tốt|thuốc nào hiệu quả|uống thuốc .* được không|uống chung (với|thuốc))\b/),
    a: "💊 **Về thuốc:** Lomi chưa có thông tin riêng về thuốc này, và không kê thuốc hay đưa liều cho từng người được, vì thuốc nào hợp và liều bao nhiêu phụ thuộc tuổi, cân nặng, bệnh nền và thuốc khác đang dùng.\n• Hỏi trực tiếp **dược sĩ** ở nhà thuốc hoặc bác sĩ — mang theo tên các thuốc đang uống.\n• Đọc kỹ tờ hướng dẫn đi kèm (liều tối đa, chống chỉ định, tác dụng phụ thường gặp).\n• Ngưng thuốc và đi khám nếu sau khi uống bị nổi mẩn, ngứa nhiều; **gọi 115 ngay** nếu khó thở, sưng môi/lưỡi/họng, choáng váng.\nBạn đang hỏi cho mình hay cho người nhà, và đang dùng để trị triệu chứng gì?",
  },
  {
    id: "coffee",
    cue: true,
    re: VN(/\b(cà phê|cafe|cf|caffeine|cafein)\b/),
    a: "☕ **Cà phê:** theo FDA (Mỹ), người lớn khoẻ mạnh dùng tới khoảng **400 mg caffeine/ngày** — cỡ 2–3 cốc cà phê lớn (khoảng 350 ml/cốc) — thường không gây tác hại.\n• Dùng **quá nhiều** dễ bị: tim đập nhanh, hồi hộp, tăng huyết áp, mất ngủ, lo âu, bồn chồn, khó chịu dạ dày, buồn nôn, đau đầu.\n• Đang mang thai, định có thai, cho con bú, có bệnh hoặc đang dùng thuốc thì hỏi bác sĩ xem có cần bớt caffeine không.\n• Trẻ em và tuổi teen không nên dùng nước tăng lực.\n• Để ý lượng đường, sữa đặc trong ly cà phê nữa nha 😄",
    src: "FDA (Hoa Kỳ) — Spilling the Beans: How Much Caffeine is Too Much?, cập nhật 28/08/2024",
  },
  {
    id: "tea",
    cue: true,
    re: VN(/\b(trà sữa|uống trà|trà xanh|trà đặc)\b/),
    a: "🍵 **Trà / trà sữa:** trà xanh, trà thảo mộc uống vừa phải khá tốt. Trà sữa thì thường **nhiều đường và chất béo**, trân châu nhiều tinh bột — nên xem là món thỉnh thoảng thôi.\n• Chọn ít đường (30–50%), ít topping.\n• Trà đặc cũng có caffeine, tránh uống buổi tối nếu khó ngủ.",
  },
  {
    // 08/10: "pizza ăn nhiều có hại không?" là hỏi SỨC KHOẺ (không phải nhờ chọn món). Kiến thức phổ thông, không số liệu riêng.
    id: "fastfood",
    // Phải có ý hỏi sức khoẻ đi kèm tên món — "pizza bao nhiêu tiền", "tìm quán gà rán" không phải câu hỏi sức khoẻ.
    re: VN(/\b(pizza|gà rán|burger|hamburger|khoai tây chiên|đồ ăn nhanh|fast food|fastfood|xúc xích|đồ chiên rán|đồ chiên)\b(?=.*\b(có hại|có sao|có tốt|tốt không|hại không|tác hại|ảnh hưởng|sức khoẻ|ăn nhiều|nhiều quá|quá nhiều|thường xuyên|mỗi ngày|hàng ngày|hằng ngày|béo|mập|tăng cân|calo|mỡ máu)\b)|\b(có hại|có sao|có tốt|tác hại|ảnh hưởng|sức khoẻ|ăn nhiều|thường xuyên|mỗi ngày|hàng ngày|hằng ngày|béo|mập|tăng cân|calo)\b(?=.*\b(pizza|gà rán|burger|hamburger|khoai tây chiên|đồ ăn nhanh|fast food|fastfood|xúc xích|đồ chiên rán|đồ chiên)\b)/),
    a: "🍕 **Đồ ăn nhanh (pizza, gà rán, burger, khoai tây chiên…):** thỉnh thoảng ăn thì không sao. Ăn **nhiều và thường xuyên** thì dễ dư năng lượng, nhiều chất béo, muối và tinh bột — lâu dài dễ tăng cân, ảnh hưởng mỡ máu, huyết áp, và hay bị đầy bụng, khó tiêu.\n• Ăn kèm rau, chọn phần vừa phải, bớt nước ngọt đi kèm.\n• Xen kẽ với bữa cơm nhà có rau, cá, đạm nạc.",
  },
  {
    id: "water",
    re: VN(/\b(uống bao nhiêu nước|uống nước bao nhiêu|uống đủ nước|uống ít nước|uống nhiều nước|nước lọc|thiếu nước)\b/),
    a: "💧 **Uống nước:** NHS khuyên uống khoảng **6–8 cốc / ly mỗi ngày**, đủ để **nước tiểu có màu vàng nhạt, trong**. Nước lọc, sữa ít béo, đồ uống ít / không đường, cả trà và cà phê đều được tính.\n• Nước ép trái cây, sinh tố cũng tính nhưng có đường tự do — gộp lại chỉ nên khoảng 150 ml/ngày.\n• Người bệnh thận, tim nên hỏi bác sĩ lượng nước phù hợp.",
    src: "NHS (Anh) — The Eatwell Guide, rà soát 29/11/2022",
  },
  {
    // 21/10 (QA Q44): "ngủ đủ 8 tiếng mà sáng dậy vẫn mệt" — trước đây nhận bài "ngủ bao nhiêu tiếng là đủ" (không trả lời câu hỏi).
    id: "sleeptired",
    first: true,
    re: VN(/\b(ngủ (đủ|nhiều|đủ giấc|đủ \d+ tiếng|\d+ tiếng|8 tiếng|tám tiếng)( \S+){0,5} (mà|nhưng|vẫn|còn) (\S+ )?(mệt|buồn ngủ|uể oải|đuối|không tỉnh|lừ đừ)|dậy (vẫn|còn|mà vẫn) (mệt|uể oải|buồn ngủ|lừ đừ)|lúc nào cũng (mệt|buồn ngủ) dù ngủ đủ)\b/),
    a:
      "😴 **Ngủ đủ giờ mà dậy vẫn mệt** — ngủ đủ GIỜ chưa chắc là ngủ đủ SÂU. Hay gặp:\n" +
      "• Giấc ngủ bị chia cắt: hay thức giấc, giờ ngủ thất thường, xem điện thoại sát giờ ngủ\n" +
      "• Lối sống: rượu bia, cà phê trong vài giờ trước khi ngủ, ăn uống thiếu chất, ít vận động\n" +
      "• Căng thẳng, lo âu, trầm cảm cũng làm ngủ không sâu\n" +
      "• Đôi khi là bệnh: **ngưng thở khi ngủ** (ngáy to, thở hắt / sặc khi ngủ), **thiếu máu do thiếu sắt** (hồi hộp, khó thở, da xanh), tiểu đường, bệnh tuyến giáp\n\n" +
      "👉 Thử 2 tuần: ngủ – dậy cùng giờ (kể cả cuối tuần), cất điện thoại trước khi ngủ, tránh cà phê / rượu buổi tối.\n" +
      "🩺 Nên đi khám nếu mệt vài tuần không rõ lý do, mệt ảnh hưởng sinh hoạt, hoặc kèm sụt cân, thay đổi tâm trạng, hay được nói là ngáy to / thở hắt khi ngủ.",
    src: "NHS 111 Wales — Tiredness and fatigue",
    checked: "21/10/2026",
  },
  {
    // 21/10 (QA Q50): làm máy tính cả ngày → bảo vệ mắt.
    id: "screeneyes",
    first: true,
    re: VN(/\b(bảo vệ mắt|mỏi mắt|khô mắt|nhức mắt|đau mắt)( \S+){0,6} (máy tính|màn hình|điện thoại|laptop)|(máy tính|màn hình|điện thoại|laptop)( \S+){0,6} (bảo vệ mắt|mỏi mắt|khô mắt|nhức mắt|hại mắt|đau mắt)\b/),
    a:
      "👀 **Nhìn màn hình cả ngày** — Hội Nhãn khoa Hoa Kỳ (AAO) khuyên:\n" +
      "• Quy tắc **20-20-20**: cứ 20 phút, nhìn một vật cách khoảng 6 m (20 feet) trong ít nhất 20 giây\n" +
      "• Đặt màn hình cách mắt khoảng **một sải tay**, hơi thấp hơn tầm mắt để nhìn hơi xuống\n" +
      "• Chỉnh độ sáng, độ tương phản vừa mắt; giảm chói (có thể dán màn chống chói), đèn xung quanh dịu bớt\n" +
      "• Nhìn màn hình làm mình chớp mắt ít đi — mắt khô thì dùng nước mắt nhân tạo\n" +
      "• Đeo kính lens thì lúc làm máy tính lâu nên đổi sang kính gọng\n\n" +
      "🩺 Mờ mắt, đau mắt, đỏ mắt kéo dài hay thị lực giảm thì nên đi khám Mắt.",
    src: "American Academy of Ophthalmology (qua HealthDay, 22/12/2023 — cập nhật 18/01/2024)",
    checked: "21/10/2026",
  },
  {
    // 31/10 (danh sách ChatGPT lần 6): "một ngày nên nghỉ mắt mấy lần khi dùng máy tính"
    id: "screenbreak",
    first: true,
    re: VN(/\b(nghỉ mắt|cho mắt nghỉ|nghỉ ngơi mắt)\b/),
    a:
      "👀 Khi dùng máy tính, Hội Nhãn khoa Hoa Kỳ (AAO) khuyên quy tắc **20-20-20**: **cứ 20 phút** thì nhìn một vật cách khoảng 6 m trong **ít nhất 20 giây** — tức là nghỉ mắt ngắn nhiều lần trong ngày, không phải một hai lần dài.\n" +
      "• Nhớ chớp mắt; mắt khô thì dùng nước mắt nhân tạo\n" +
      "• Màn hình cách mắt khoảng một sải tay, hơi thấp hơn tầm mắt",
    src: "American Academy of Ophthalmology (qua HealthDay, 22/12/2023 — cập nhật 18/01/2024)",
    checked: "31/10/2026",
  },

  {
    // 21/10 (QA V2 Q17): tim đập nhanh sau khi uống nhiều cà phê — trước đây nhận bài "400 mg caffeine/ngày" chung chung.
    id: "caffeinepalp",
    first: true,
    re: VN(/\b(tim đập nhanh|tim đập mạnh|hồi hộp|đánh trống ngực|run tay|bồn chồn)\b.*\b(cà phê|cafe|cf|caffeine|cafein|nước tăng lực|trà đặc)\b|\b(cà phê|cafe|cf|caffeine|cafein|nước tăng lực|trà đặc)\b.*\b(tim đập nhanh|tim đập mạnh|hồi hộp|đánh trống ngực)\b/),
    a:
      "☕ **Tim đập nhanh sau khi uống nhiều cà phê** thường do caffeine, và hay dịu dần trong vài giờ khi caffeine được đào thải.\n" +
      "• Ngưng uống thêm cà phê, trà, nước tăng lực hôm nay; uống nước lọc, ngồi nghỉ, thở chậm\n" +
      "• Gọi **115** / đi cấp cứu ngay nếu có: **đau hoặc tức ngực, khó thở, ngất hoặc gần ngất, tim đập rất nhanh hay loạn nhịp kéo dài**, hoặc bạn có bệnh tim\n" +
      "• Hay bị hồi hộp kể cả khi không uống cà phê → nên đi khám Tim mạch\n\n" +
      "Bạn đang có thấy tức ngực hay khó thở không?",
  },
  {
    // 21/10 (QA V2 Q86): đau bụng / buồn nôn mỗi lần sắp đi làm vì lo — có thể do lo âu, nhưng không bỏ qua nguyên nhân thể chất.
    id: "anxietygut",
    first: true,
    early: true,
    re: VN(/\b(đau bụng|buồn nôn|tiêu chảy|đau dạ dày|muốn ói|quặn bụng)\b.*\b(vì lo|lo lắng|căng thẳng|hồi hộp|áp lực)\b|\b(lo lắng|căng thẳng|hồi hộp|áp lực)\b.*\b(đau bụng|buồn nôn|đau dạ dày|muốn ói|quặn bụng)\b/),
    a:
      "Đau bụng, buồn nôn mỗi lần sắp đi làm **có thể** do lo âu — ruột và não “nói chuyện” với nhau rất nhiều, căng thẳng làm bụng phản ứng thật chứ không phải tưởng tượng. Nhưng đừng mặc định chỉ là tâm lý nha.\n" +
      "• Đi khám (Nội tổng quát / Tiêu hoá) nếu: đau cả ngày nghỉ, đau về đêm, sụt cân, nôn ra máu, đi ngoài ra máu hoặc phân đen, sốt — để loại trừ nguyên nhân thể chất\n" +
      "• Đau dữ dội đột ngột, bụng cứng, nôn liên tục → đi cấp cứu\n\n" +
      "Nếu chủ yếu xảy ra vào lúc sắp đi làm:\n• Thử để ý điều gì ở chỗ làm làm bạn lo nhất (một người, một việc, áp lực chung)\n• Buổi sáng ăn nhẹ, đủ nước, thở chậm vài phút trước khi đi\n• Kéo dài vài tuần, ảnh hưởng công việc → nói chuyện với bác sĩ hoặc chuyên gia tâm lý\n\n" +
      "Chuyện ở chỗ làm có điều gì đang làm bạn căng thẳng không?",
  },
  {
    // 21/10 (QA V2 Q94): thiền mà càng ngồi càng lo.
    id: "meditateanx",
    first: true,
    re: VN(/\b(thiền|ngồi thiền|chánh niệm)\b.*\b(càng (thấy )?(lo|bồn chồn|khó chịu|hoảng|bứt rứt)|lại (thấy )?(lo|hoảng|khó chịu))\b/),
    a:
      "Không phải bạn làm sai đâu — **không phải ai cũng hợp với kiểu ngồi yên**, nhất là khi đang nhiều lo âu: lúc yên lặng, những suy nghĩ khó chịu dễ trồi lên rõ hơn.\n" +
      "• Thấy khó chịu nhiều thì cứ dừng lại, không cần ráng\n" +
      "• Thử kiểu có chuyển động hoặc có điểm tựa bên ngoài: đi bộ chậm chú ý bước chân, yoga nhẹ, thiền có hướng dẫn bằng giọng nói, mở mắt nhìn một vật\n" +
      "• Bắt đầu thật ngắn (2–3 phút) thay vì ngồi lâu\n" +
      "• Nếu lo âu nhiều tới mức ảnh hưởng sinh hoạt, hoặc thiền làm bạn hoảng sợ, nói chuyện với chuyên gia tâm lý để có cách phù hợp hơn",
  },
  {
    // 21/10 (QA V2 Q50): "nước chanh thải độc, chữa bệnh gan" — tuyên bố sai trên mạng.
    id: "detox",
    first: true,
    re: VN(/\b(nước chanh|chanh|detox|giải độc|thải độc|thanh lọc)\b.*\b(thải (hết )?độc|giải độc|chữa (bệnh )?gan|mát gan|thanh lọc gan|chữa bệnh)\b/),
    a:
      "🍋 **Không đúng đâu** — nước chanh không \"thải hết độc tố\" và không chữa được bệnh gan.\n" +
      "• Gan và thận vốn là cơ quan tự lọc, đào thải chất cần thải; chưa có bằng chứng nước chanh hay sản phẩm \"detox\" làm việc đó tốt hơn\n" +
      "• Uống nước chanh pha loãng thì không sao (nhưng dễ xót dạ dày, mòn men răng nếu uống nhiều, đặc)\n" +
      "• Cẩn thận: tin vào mẹo \"giải độc gan\" mà bỏ khám, hoặc tự uống thuốc nam / thực phẩm chức năng \"mát gan\" không rõ nguồn gốc có khi còn hại gan hơn\n\n" +
      "🩺 Có **vàng da, vàng mắt, nước tiểu sẫm, đau hạ sườn phải, bụng chướng, ngứa nhiều** → đi khám Tiêu hoá – Gan mật sớm.",
  },
  {
    // 21/10 (QA Q48): bị cảm có nên tắm không.
    id: "coldbath",
    first: true,
    re: VN(/\b(cảm|cảm lạnh|cảm cúm|cúm|sốt|sổ mũi|nghẹt mũi)( \S+){0,4} (có nên|được|nên|có được|có sao không khi) (tắm|gội đầu|tắm gội)|(tắm|gội đầu|tắm gội)( \S+){0,3} (khi|lúc) (bị )?(cảm|cảm lạnh|cúm|sốt)\b/),
    a:
      "🚿 **Bị cảm vẫn tắm được** — giữ vệ sinh còn giúp dễ chịu hơn. Chỉ cần:\n" +
      "• Tắm nước **ấm**, nhanh gọn, trong phòng kín gió\n" +
      "• Lau khô người và tóc ngay, mặc đồ ấm, tránh ra gió lạnh liền sau khi tắm\n" +
      "• Đang sốt cao, mệt lả hay chóng mặt thì lau người bằng khăn ấm thay vì tắm lâu, và nên có người ở gần\n" +
      "• Uống đủ nước, nghỉ ngơi — cảm lạnh thường tự khỏi sau khoảng 1–2 tuần",
  },
  {
    // 21/10 (QA V3): "ngủ có 4 tiếng mà vẫn khoẻ, có sao không" — trước đây "chưa được tiếp thu".
    id: "shortsleep",
    first: true,
    re: VN(/\bngủ (có |chỉ |chừng |khoảng )?(\d|bốn|năm|ba|sáu) (tiếng|giờ)( \S+){0,4} (mà|nhưng) (vẫn )?(khoẻ|khỏe|tỉnh|ổn|bình thường)\b/),
    a:
      "😴 Người lớn nên ngủ **từ 7 tiếng trở lên** mỗi đêm. Có một số rất ít người ngủ ngắn mà vẫn khoẻ thật, nhưng phần lớn là mình đã **quen với thiếu ngủ** mà không nhận ra — vẫn thấy “ổn” trong khi tập trung, trí nhớ, tâm trạng đã kém đi.\n" +
      "• Thiếu ngủ kéo dài liên quan tới nguy cơ cao hơn của tiểu đường type 2, bệnh tim, béo phì và trầm cảm\n" +
      "• Thử vài tuần ngủ đủ 7–8 tiếng xem có thấy khác không (tỉnh táo hơn, ít cáu hơn, ít thèm ngọt hơn)\n" +
      "• Ban ngày hay buồn ngủ, ngủ gật khi lái xe, hoặc muốn ngủ mà không ngủ được → nên đi khám",
    src: "CDC (Hoa Kỳ) — About Sleep, rà soát 20/11/2023",
  },
  {
    id: "sleep",
    re: VN(/\b(ngủ bao nhiêu|ngủ mấy tiếng|ngủ bao lâu|ngủ đủ|thức khuya có sao|thức khuya|ngủ muộn)\b/),
    a: "😴 **Giấc ngủ** theo CDC (Mỹ): tuổi teen 13–17 cần **8–10 tiếng**; người lớn 18–60 tuổi **từ 7 tiếng trở lên**; 61–64 tuổi **7–9 tiếng**; từ 65 tuổi **7–8 tiếng** mỗi đêm.\n• Thức khuya thường xuyên dễ làm mệt, kém tập trung, tâm trạng thất thường.\n• Mẹo: ngủ – dậy giờ cố định, cất điện thoại trước khi ngủ, phòng tối và yên tĩnh, tránh cà phê buổi chiều.",
    src: "CDC (Hoa Kỳ) — About Sleep, rà soát 20/11/2023",
  },
  {
    id: "skin",
    re: VN(/\b(đẹp da|da đẹp|trắng da|sáng da|da mụn|chăm sóc da|ăn gì tốt cho da|dùng gì cho da)\b/),
    a: "✨ **Ăn gì để đẹp da:**\n• Rau xanh, trái cây nhiều màu (cam, ổi, cà chua, cà rốt, bơ) — giàu vitamin C, A, chất chống oxy hoá.\n• Cá, các loại hạt (óc chó, hạnh nhân), dầu olive — chất béo tốt giúp da mềm.\n• Uống đủ nước, ngủ đủ giấc — quan trọng không kém ăn uống.\n• **Hạn chế:** đồ ngọt, trà sữa, đồ chiên, rượu bia, thuốc lá, thức khuya.\n• Luôn dùng kem chống nắng khi ra ngoài — đây là cách “trẻ da” hiệu quả nhất.\nMụn nhiều, viêm, để lại sẹo thì nên khám Da liễu nha.",
  },
  {
    id: "stomachfood",
    re: VN(/\b(đau dạ dày (nên )?ăn gì|dạ dày nên ăn|ăn gì tốt cho dạ dày|đau bao tử ăn gì|kiêng gì khi đau dạ dày|trào ngược (nên )?ăn gì)\b/),
    a: "🍚 **Đau dạ dày nên ăn:** cháo, cơm mềm, súp, khoai lang, chuối, bánh mì, sữa chua (nếu hợp), rau luộc; ăn đúng giờ, chia nhỏ bữa, nhai kỹ.\n**Nên tránh:** đồ cay, chua, chiên nhiều dầu mỡ, cà phê, rượu bia, nước có ga, ăn quá no, ăn khuya, nằm ngay sau ăn.\nĐau tái đi tái lại thì nên khám Tiêu hoá (có thể nội soi, xét nghiệm HP) nha.",
  },
  {
    id: "sickfood",
    re: VN(/\b(ốm (nên )?ăn gì|sốt (nên )?ăn gì|cảm (nên )?ăn gì|bị bệnh (nên )?ăn gì|ăn gì cho mau khoẻ|ăn gì để mau hết)\b/),
    a: "🍲 **Khi ốm, sốt, cảm:** ưu tiên đồ lỏng, dễ tiêu: cháo, súp, canh rau, nước trái cây (cam, chanh), sữa; chia nhiều bữa nhỏ.\n• Uống nhiều nước (nước lọc, oresol, nước canh) nhất là khi sốt, tiêu chảy.\n• Tránh đồ chiên, cay, rượu bia; không cần kiêng quá mức — cơ thể cần đủ chất để hồi phục.",
  },
  {
    id: "exercise",
    re: VN(/\b(tập thể dục|tập gym|chạy bộ|đi bộ bao lâu|tập bao nhiêu|vận động bao nhiêu|nên tập gì|bắt đầu tập)\b/),
    a: "🏃 **Vận động** (NHS, người 19–64 tuổi): ít nhất **150 phút/tuần** vận động vừa (đi bộ nhanh, đạp xe, bơi…) **hoặc 75 phút/tuần** vận động mạnh, cộng thêm bài tập sức mạnh cho các nhóm cơ chính **ít nhất 2 ngày/tuần**.\n• Bớt thời gian ngồi / nằm, chen vào những lúc ngồi lâu vài hoạt động nhẹ.\n• Có bệnh tim, huyết áp, xương khớp thì hỏi bác sĩ trước khi tập nặng.",
    src: "NHS (Anh) — Physical activity guidelines for adults aged 19 to 64, rà soát 22/05/2024",
  },
  {
    id: "weight",
    re: VN(/\b(giảm cân lành mạnh|giảm cân thế nào|làm sao giảm cân|muốn giảm cân|tăng cân thế nào|làm sao tăng cân|muốn tăng cân)\b/),
    a: "⚖️ **Thay đổi cân nặng lành mạnh:** đi từ từ, bền vững quan trọng hơn nhanh.\n• Ăn đủ bữa, nhiều rau, đủ đạm (thịt, cá, trứng, đậu), bớt đồ ngọt, nước ngọt, đồ chiên.\n• Vận động đều, ngủ đủ, bớt căng thẳng.\n• Tránh nhịn ăn, thuốc giảm cân trôi nổi — dễ hại sức khoẻ và tăng lại.\nMuốn có kế hoạch riêng cho mình thì gặp bác sĩ Dinh dưỡng nha. Nếu việc lo về cân nặng làm bạn căng thẳng hay sợ ăn, hãy nói chuyện với chuyên gia nhé.",
  },
  {
    id: "sugar",
    re: VN(/\b(ăn ngọt|ăn nhiều đường|nước ngọt|đồ ngọt có sao|ăn kẹo)\b/),
    a: "🍬 **Đồ ngọt:** thỉnh thoảng thì không sao, nhưng ăn/uống ngọt nhiều thường xuyên dễ gây tăng cân, sâu răng, mụn, tăng nguy cơ tiểu đường, gan nhiễm mỡ.\n• Thay nước ngọt bằng nước lọc, trà không đường.\n• Chọn trái cây thay bánh kẹo khi thèm ngọt.",
  },
  {
    id: "alcohol",
    re: VN(/\b(uống rượu bia có sao|uống bia có sao|uống rượu có sao|nhậu nhiều có sao|uống bia hàng ngày|uống bia hằng ngày|giải rượu|giải say)\b/),
    a: "🍺 **Rượu bia:** WHO khẳng định **không có mức uống rượu bia nào an toàn** cho sức khoẻ — càng ít càng tốt. Uống nhiều gây hại gan, dạ dày, tim mạch, giấc ngủ và tinh thần.\n• Nếu uống: ăn no trước, uống chậm, xen nước lọc, biết điểm dừng.\n• **Đã uống thì không lái xe.**\n• Chuyện “giải rượu” bằng thuốc hay mẹo dân gian không làm rượu hết nhanh hơn — chỉ có thời gian, nước và nghỉ ngơi.",
    src: "WHO châu Âu — No level of alcohol consumption is safe for our health, 04/01/2023 (ý “không có mức an toàn”; các mẹo còn lại là kiến thức phổ thông)",
  },
  {
    id: "smoke",
    re: VN(/\b(hút thuốc có sao|thuốc lá có hại|vape có hại|thuốc lá điện tử có sao|hút vape)\b/),
    a: "🚭 **Thuốc lá (kể cả thuốc lá điện tử):** gây nghiện nicotine và hại phổi, tim mạch, răng miệng, da; khói thuốc còn hại người xung quanh. Bỏ thuốc lúc nào cũng có lợi — cơ thể bắt đầu hồi phục ngay từ những ngày đầu.\nMuốn bỏ thì kể Lomi nghe nha, Lomi có vài mẹo; bác sĩ cũng có cách hỗ trợ cai thuốc.",
  },
  {
    id: "vitamin",
    re: VN(/\b(uống vitamin|vitamin gì|thực phẩm chức năng|tpcn|uống thuốc bổ|collagen|omega 3)\b/),
    a: "💊 **Vitamin, thực phẩm chức năng:** ăn uống đa dạng thì phần lớn người khoẻ mạnh không cần uống thêm. Uống bổ sung khi bác sĩ thấy bạn thiếu (qua khám, xét nghiệm) hoặc trong giai đoạn đặc biệt (mang thai…).\n• Uống quá liều một số vitamin (A, D, sắt…) có thể gây hại.\n• Cẩn thận sản phẩm quảng cáo “thần kỳ”, không rõ nguồn gốc.\nHỏi dược sĩ/bác sĩ trước khi dùng nha.",
  },
  {
    id: "seafoodallergy",
    re: VN(/\b(dị ứng hải sản|dị ứng tôm|dị ứng cua|dị ứng đồ ăn|dị ứng thức ăn|ăn hải sản bị ngứa)\b/),
    a: "🦐 **Dị ứng hải sản / thức ăn:** thường nổi mẩn ngứa, mề đay, sưng môi mắt, có thể đau bụng, tiêu chảy sau khi ăn vài phút tới vài giờ.\n• Ngưng ăn món nghi ngờ, uống nước, nghỉ ngơi, theo dõi.\n• **Gọi 115 / đi cấp cứu ngay** nếu: khó thở, khò khè, sưng môi lưỡi họng, choáng váng, tụt huyết áp — đó có thể là sốc phản vệ.\n• Hay bị lại thì khám chuyên khoa Dị ứng để biết mình dị ứng gì và cách xử trí.\nBạn đang bị những biểu hiện gì? Kể Lomi nghe nha.",
  },
  {
    id: "carsick",
    re: VN(/\b(say xe|say tàu|say máy bay|chóng mặt khi đi xe)\b/),
    a: "🚌 **Say xe:** ngồi hàng ghế đầu hoặc gần cửa sổ, nhìn ra xa về phía trước, không đọc hay nhìn điện thoại, ăn nhẹ trước khi đi (đừng quá no hay quá đói), mở hé cửa cho thoáng. Ngậm gừng, kẹo gừng giúp một số người đỡ buồn nôn. Cần thuốc chống say thì hỏi dược sĩ loại phù hợp nha.",
  },
  {
    id: "breakfast",
    re: VN(/\b(bỏ ăn sáng|nhịn ăn sáng|không ăn sáng|ăn khuya có sao|ăn đêm có sao)\b/),
    a: "🍳 **Bữa sáng / ăn khuya:** bỏ bữa sáng thường xuyên dễ đói cồn cào, mệt, kém tập trung, ăn bù quá nhiều bữa sau. Ăn khuya sát giờ ngủ dễ khó ngủ, ợ nóng, trào ngược.\n• Bữa sáng đơn giản cũng được: bánh mì trứng, xôi, sữa, trái cây.\n• Người hay ợ nóng / trào ngược: NHS khuyên **không ăn trong 3–4 tiếng trước khi ngủ**.",
    src: "NHS (Anh) — Heartburn and acid reflux, rà soát 20/11/2023 (ý ăn trước khi ngủ; phần còn lại là kiến thức phổ thông)",
  },
  {
    id: "coldwater",
    re: VN(/\b(uống nước đá|uống nước lạnh có sao|tắm đêm|tắm khuya|tắm đêm có sao|tắm nước lạnh)\b/),
    a: "🧊 **Nước đá / tắm đêm:** với người khoẻ, uống nước lạnh không gây bệnh, nhưng dễ làm đau họng, ê răng, khó chịu dạ dày ở người nhạy cảm. Tắm đêm thì nên tắm nước ấm, nhanh, lau khô, sấy tóc trước khi ngủ — nhất là trời lạnh như Đà Lạt; người già, người bệnh tim, huyết áp nên tránh tắm quá khuya và tắm nước lạnh.",
  },
  {
    id: "screen",
    re: VN(/\b(nhìn điện thoại nhiều có sao|xài điện thoại nhiều|ánh sáng xanh|nhìn màn hình nhiều có sao|dùng điện thoại trước khi ngủ)\b/),
    a: "📱 **Dùng điện thoại/màn hình nhiều:** dễ mỏi mắt, khô mắt (nhìn chăm chú lâu thì ít chớp mắt), đau cổ vai gáy, khó ngủ.\n• Quy tắc 20-20-20 (Viện Hàn lâm Nhãn khoa Mỹ): **cứ 20 phút, nhìn một vật xa ít nhất 20 feet (khoảng 6 mét) trong ít nhất 20 giây**.\n• Màn hình thường đặt cách mặt khoảng 50–65 cm, hơi thấp hơn tầm mắt.\n• Cất điện thoại một lúc trước khi ngủ.",
    src: "American Academy of Ophthalmology — Eye Strain (aao.org)",
  },
  {
    id: "sitlong",
    re: VN(/\b(ngồi nhiều có sao|ngồi lâu có sao|ngồi văn phòng|dân văn phòng)\b/),
    a: "🪑 **Ngồi nhiều:** dễ đau lưng, cổ vai gáy, mỏi người, tăng cân, táo bón.\n• NHS khuyên **bớt thời gian ngồi / nằm**, và chen vào những lúc ngồi lâu bằng vài hoạt động — đứng dậy đi lại, vươn vai.\n• Ghế có tựa lưng, màn hình ngang tầm mắt, hai chân chạm sàn.\n• Uống đủ nước (vừa tốt, vừa buộc phải đứng dậy đi vệ sinh 😄).",
    src: "NHS (Anh) — Physical activity guidelines for adults aged 19 to 64, rà soát 22/05/2024 (ý bớt ngồi; phần còn lại là kiến thức phổ thông)",
  },
  {
    id: "bp",
    re: VN(/\b(huyết áp cao (nên )?ăn gì|huyết áp (nên )?kiêng gì|tiểu đường (nên )?ăn gì|tiểu đường kiêng gì|mỡ máu cao ăn gì|gout (nên )?ăn gì|gout kiêng gì)\b/),
    a: "🥗 **Ăn uống khi có bệnh mạn tính** (huyết áp, tiểu đường, mỡ máu, gout): nguyên tắc chung là ăn nhạt, nhiều rau, bớt đồ ngọt, đồ chiên, nội tạng, rượu bia, đồ chế biến sẵn; giữ cân nặng hợp lý, vận động đều.\nMỗi bệnh có lưu ý riêng và cần phối hợp với thuốc, nên bạn hỏi bác sĩ đang điều trị hoặc bác sĩ Dinh dưỡng để có thực đơn đúng cho mình nha.",
  },
];

/** Câu hỏi kiến thức sức khoẻ ("… có sao không", "ăn gì …", "nên …") → trả lời, không thì null. */
/** 21/10: mục "early" — câu trộn cảm xúc + triệu chứng ("đau bụng vì lo lắng") mà các lớp thẻ bệnh hay bắt sớm → trả lời trước. */
export function healthFactEarly(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  const f = FACTS.find((x) => x.early && x.re.test(n));
  return f ? renderFact(f) : null;
}
/** 21/10: câu hỏi trúng một mục "first" (câu hỏi rất cụ thể — bị cảm có nên tắm, ngủ đủ mà vẫn mệt) → trả lời trước cả thẻ bệnh chung. */
export function healthFactFirst(text: string): string | null {
  const n = ` ${normStrict(text, HEALTH)} `;
  return FACTS.some((x) => x.first && x.re.test(n)) ? healthFact(text) : null;
}
export function healthFact(text: string): string | null {
  const n = ` ${normStrict(text, HEALTH)} `;
  const isQ = text.includes("?") || VN(/\b(có sao|có hại|có tốt|ăn gì|uống gì|nên|bao nhiêu|thế nào|làm sao|có nên|được không|không|là đủ|đủ chưa|bao lâu|mấy tiếng|mấy ly|có mập|có béo|tác dụng phụ)\b/).test(n);
  if (!isQ) return null;
  // 21/10 (QA V2 Q16): "mở quán cà phê cần bao nhiêu vốn" là chuyện kinh doanh — tên đồ uống không phải câu hỏi sức khoẻ.
  const biz = VN(/\b(mở quán|mở tiệm|kinh doanh|bao nhiêu vốn|vốn bao nhiêu|cần vốn|bán cà phê|quán cà phê của)\b/).test(n);
  const ok = (x: Fact) => x.re.test(n) && (!x.cue || (HEALTH_CUE.test(n) && !biz));
  //   (mục "first" là câu hỏi cụ thể hơn — "tim đập nhanh sau 3 ly cà phê" — được ưu tiên trước mục chung "cà phê")
  const f = FACTS.find((x) => x.first && ok(x)) ?? FACTS.find(ok);
  if (!f) return null;
  return renderFact(f);
}
function renderFact(f: Fact): string {
  return f.src
    ? `${f.a}\n\n📚 Nguồn: ${f.src}. Lomi đối chiếu ngày ${f.checked ?? "15/10/2026"}. Kiến thức tham khảo chung — có bệnh nền, đang mang thai hay cho trẻ nhỏ thì hỏi bác sĩ nha 🩺`
    : `${f.a}\n\n(Kiến thức phổ thông Lomi tổng hợp, **chưa gắn nguồn y khoa cụ thể** — có bệnh nền, đang mang thai hay cho trẻ nhỏ thì hỏi bác sĩ nha 🩺)`;
}
