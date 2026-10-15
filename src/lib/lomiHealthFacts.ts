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
type Fact = { id: string; re: RegExp; a: string; cue?: boolean; src?: string };
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
export function healthFact(text: string): string | null {
  const n = ` ${normStrict(text, HEALTH)} `;
  const isQ = text.includes("?") || VN(/\b(có sao|có hại|có tốt|ăn gì|uống gì|nên|bao nhiêu|thế nào|làm sao|có nên|được không|không|là đủ|đủ chưa|bao lâu|mấy tiếng|mấy ly|có mập|có béo|tác dụng phụ)\b/).test(n);
  if (!isQ) return null;
  const f = FACTS.find((x) => x.re.test(n) && (!x.cue || HEALTH_CUE.test(n)));
  if (!f) return null;
  return f.src
    ? `${f.a}\n\n📚 Nguồn: ${f.src}. Lomi đối chiếu ngày 15/10/2026. Kiến thức tham khảo chung — có bệnh nền, đang mang thai hay cho trẻ nhỏ thì hỏi bác sĩ nha 🩺`
    : `${f.a}\n\n(Kiến thức phổ thông Lomi tổng hợp, **chưa gắn nguồn y khoa cụ thể** — có bệnh nền, đang mang thai hay cho trẻ nhỏ thì hỏi bác sĩ nha 🩺)`;
}
