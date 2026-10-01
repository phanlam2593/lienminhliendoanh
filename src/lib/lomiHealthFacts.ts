// ─────────────────────────────────────────────────────────────────────────────
// HỎI – ĐÁP KIẾN THỨC SỨC KHOẺ THƯỜNG GẶP (30/09 r6, theo ý Kir) — chạy trên máy, không gọi AI.
// Dành cho câu hỏi kiểu "uống cà phê nhiều có sao không", "ăn gì để đẹp da", "ngủ bao nhiêu là đủ".
// (Kể triệu chứng thì do lib/lomiSymptoms lo.) Kiến thức phổ thông, không kê thuốc / liều lượng,
// không đưa chế độ ăn kiêng cụ thể; luôn nhắc hỏi bác sĩ khi có bệnh nền, đang mang thai, cho trẻ nhỏ.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { HEALTH, normStrict } from "@/lib/lomiAccent";

// cue = chủ đề chỉ là TÊN đồ uống ("cà phê", "trà sữa") → phải có thêm ý hỏi về sức khoẻ mới trả lời kiến thức,
// để "cf?", "đi cà phê không", "trà sữa ở đâu ngon" không bị đáp thành bài sức khoẻ (01/10 r3, test thật trên app).
type Fact = { id: string; re: RegExp; a: string; cue?: boolean };
const HEALTH_CUE =
  /\b(co sao|co hai|co tot|tot khong|hai khong|tac hai|loi ich|anh huong|suc khoe|uong nhieu|nhieu qua|qua nhieu|moi ngay|bao nhieu|may ly|may coc|luc nao|buoi toi|buoi sang|khi doi|bung doi|da day|mat ngu|kho ngu|tim dap|huyet ap|mang thai|co bau|cho con bu|tre em|beo|map|tang can|giam can|duong|nghien|cai|bo duoc|nong trong|loi tieu|nen uong|co nen uong|uong duoc khong)\b/;

const FACTS: Fact[] = [
  {
    id: "coffee",
    cue: true,
    re: /\b(ca phe|cafe|cf|caffeine|cafein)\b/,
    a: "☕ **Cà phê:** với người lớn khoẻ mạnh, uống vừa phải (khoảng 1–3 ly nhỏ/ngày) thường không sao, còn giúp tỉnh táo.\n• Uống **nhiều** dễ bị: tim đập nhanh, bồn chồn, mất ngủ, đau/xót dạ dày, đi tiểu nhiều.\n• Nên: uống sau khi ăn, tránh uống sau 2–3 giờ chiều, uống thêm nước lọc.\n• Nên hạn chế nếu: đau dạ dày, trào ngược, mất ngủ, lo âu, tim mạch/huyết áp cao, đang mang thai (hỏi bác sĩ).\n• Để ý lượng đường, sữa đặc trong ly cà phê nữa nha 😄",
  },
  {
    id: "tea",
    cue: true,
    re: /\b(tra sua|uong tra|tra xanh|tra dac)\b/,
    a: "🍵 **Trà / trà sữa:** trà xanh, trà thảo mộc uống vừa phải khá tốt. Trà sữa thì thường **nhiều đường và chất béo**, trân châu nhiều tinh bột — nên xem là món thỉnh thoảng thôi.\n• Chọn ít đường (30–50%), ít topping.\n• Trà đặc cũng có caffeine, tránh uống buổi tối nếu khó ngủ.",
  },
  {
    id: "water",
    re: /\b(uong bao nhieu nuoc|uong nuoc bao nhieu|uong du nuoc|uong it nuoc|uong nhieu nuoc|nuoc loc|thieu nuoc)\b/,
    a: "💧 **Uống nước:** mỗi người cần khác nhau tuỳ cân nặng, thời tiết, vận động. Cách dễ nhất: uống rải rác cả ngày, **nước tiểu vàng nhạt** là đủ; vàng sẫm là đang thiếu.\n• Uống nhiều hơn khi trời nóng, tập thể dục, sốt, tiêu chảy.\n• Người bệnh thận, tim nên hỏi bác sĩ lượng nước phù hợp.",
  },
  {
    id: "sleep",
    re: /\b(ngu bao nhieu|ngu may tieng|ngu bao lau|ngu du|thuc khuya co sao|thuc khuya|ngu muon)\b/,
    a: "😴 **Giấc ngủ:** người lớn thường cần khoảng **7–9 tiếng** mỗi đêm; tuổi teen cần nhiều hơn.\n• Thức khuya thường xuyên dễ gây mệt, giảm tập trung, tăng cân, da xấu, dễ ốm, tâm trạng thất thường.\n• Mẹo: ngủ – dậy giờ cố định, cất điện thoại trước khi ngủ 30–60 phút, phòng tối và mát, tránh cà phê buổi chiều.",
  },
  {
    id: "skin",
    re: /\b(dep da|da dep|trang da|sang da|da mun|cham soc da|an gi tot cho da|dung gi cho da)\b/,
    a: "✨ **Ăn gì để đẹp da:**\n• Rau xanh, trái cây nhiều màu (cam, ổi, cà chua, cà rốt, bơ) — giàu vitamin C, A, chất chống oxy hoá.\n• Cá, các loại hạt (óc chó, hạnh nhân), dầu olive — chất béo tốt giúp da mềm.\n• Uống đủ nước, ngủ đủ giấc — quan trọng không kém ăn uống.\n• **Hạn chế:** đồ ngọt, trà sữa, đồ chiên, rượu bia, thuốc lá, thức khuya.\n• Luôn dùng kem chống nắng khi ra ngoài — đây là cách “trẻ da” hiệu quả nhất.\nMụn nhiều, viêm, để lại sẹo thì nên khám Da liễu nha.",
  },
  {
    id: "stomachfood",
    re: /\b(dau da day (nen )?an gi|da day nen an|an gi tot cho da day|dau bao tu an gi|kieng gi khi dau da day|trao nguoc (nen )?an gi)\b/,
    a: "🍚 **Đau dạ dày nên ăn:** cháo, cơm mềm, súp, khoai lang, chuối, bánh mì, sữa chua (nếu hợp), rau luộc; ăn đúng giờ, chia nhỏ bữa, nhai kỹ.\n**Nên tránh:** đồ cay, chua, chiên nhiều dầu mỡ, cà phê, rượu bia, nước có ga, ăn quá no, ăn khuya, nằm ngay sau ăn.\nĐau tái đi tái lại thì nên khám Tiêu hoá (có thể nội soi, xét nghiệm HP) nha.",
  },
  {
    id: "sickfood",
    re: /\b(om (nen )?an gi|sot (nen )?an gi|cam (nen )?an gi|bi benh (nen )?an gi|an gi cho mau khoe|an gi de mau het)\b/,
    a: "🍲 **Khi ốm, sốt, cảm:** ưu tiên đồ lỏng, dễ tiêu: cháo, súp, canh rau, nước trái cây (cam, chanh), sữa; chia nhiều bữa nhỏ.\n• Uống nhiều nước (nước lọc, oresol, nước canh) nhất là khi sốt, tiêu chảy.\n• Tránh đồ chiên, cay, rượu bia; không cần kiêng quá mức — cơ thể cần đủ chất để hồi phục.",
  },
  {
    id: "exercise",
    re: /\b(tap the duc|tap gym|chay bo|di bo bao lau|tap bao nhieu|van dong bao nhieu|nen tap gi|bat dau tap)\b/,
    a: "🏃 **Vận động:** người lớn nên có khoảng **150 phút/tuần** vận động vừa (đi bộ nhanh, đạp xe, bơi…), chia 30 phút × 5 ngày, thêm 2 buổi tập sức mạnh.\n• Mới bắt đầu: đi bộ 15–20 phút/ngày rồi tăng dần.\n• Khởi động trước, giãn cơ sau; uống đủ nước.\n• Có bệnh tim, huyết áp, xương khớp thì hỏi bác sĩ trước khi tập nặng.",
  },
  {
    id: "weight",
    re: /\b(giam can lanh manh|giam can the nao|lam sao giam can|muon giam can|tang can the nao|lam sao tang can|muon tang can)\b/,
    a: "⚖️ **Thay đổi cân nặng lành mạnh:** đi từ từ, bền vững quan trọng hơn nhanh.\n• Ăn đủ bữa, nhiều rau, đủ đạm (thịt, cá, trứng, đậu), bớt đồ ngọt, nước ngọt, đồ chiên.\n• Vận động đều, ngủ đủ, bớt căng thẳng.\n• Tránh nhịn ăn, thuốc giảm cân trôi nổi — dễ hại sức khoẻ và tăng lại.\nMuốn có kế hoạch riêng cho mình thì gặp bác sĩ Dinh dưỡng nha. Nếu việc lo về cân nặng làm bạn căng thẳng hay sợ ăn, hãy nói chuyện với chuyên gia nhé.",
  },
  {
    id: "sugar",
    re: /\b(an ngot|an nhieu duong|nuoc ngot|do ngot co sao|an keo)\b/,
    a: "🍬 **Đồ ngọt:** thỉnh thoảng thì không sao, nhưng ăn/uống ngọt nhiều thường xuyên dễ gây tăng cân, sâu răng, mụn, tăng nguy cơ tiểu đường, gan nhiễm mỡ.\n• Thay nước ngọt bằng nước lọc, trà không đường.\n• Chọn trái cây thay bánh kẹo khi thèm ngọt.",
  },
  {
    id: "alcohol",
    re: /\b(uong ruou bia co sao|uong bia co sao|uong ruou co sao|nhau nhieu co sao|uong bia hang ngay|giai ruou|giai say)\b/,
    a: "🍺 **Rượu bia:** càng ít càng tốt — không có mức nào hoàn toàn “an toàn”. Uống nhiều gây hại gan, dạ dày, tim mạch, giấc ngủ và tinh thần.\n• Nếu uống: ăn no trước, uống chậm, xen nước lọc, biết điểm dừng.\n• **Đã uống thì không lái xe.**\n• Chuyện “giải rượu” bằng thuốc hay mẹo dân gian không làm rượu hết nhanh hơn — chỉ có thời gian, nước và nghỉ ngơi.",
  },
  {
    id: "smoke",
    re: /\b(hut thuoc co sao|thuoc la co hai|vape co hai|thuoc la dien tu co sao|hut vape)\b/,
    a: "🚭 **Thuốc lá (kể cả thuốc lá điện tử):** gây nghiện nicotine và hại phổi, tim mạch, răng miệng, da; khói thuốc còn hại người xung quanh. Bỏ thuốc lúc nào cũng có lợi — cơ thể bắt đầu hồi phục ngay từ những ngày đầu.\nMuốn bỏ thì kể Lomi nghe nha, Lomi có vài mẹo; bác sĩ cũng có cách hỗ trợ cai thuốc.",
  },
  {
    id: "vitamin",
    re: /\b(uong vitamin|vitamin gi|thuc pham chuc nang|tpcn|uong thuoc bo|collagen|omega 3)\b/,
    a: "💊 **Vitamin, thực phẩm chức năng:** ăn uống đa dạng thì phần lớn người khoẻ mạnh không cần uống thêm. Uống bổ sung khi bác sĩ thấy bạn thiếu (qua khám, xét nghiệm) hoặc trong giai đoạn đặc biệt (mang thai…).\n• Uống quá liều một số vitamin (A, D, sắt…) có thể gây hại.\n• Cẩn thận sản phẩm quảng cáo “thần kỳ”, không rõ nguồn gốc.\nHỏi dược sĩ/bác sĩ trước khi dùng nha.",
  },
  {
    id: "seafoodallergy",
    re: /\b(di ung hai san|di ung tom|di ung cua|di ung do an|di ung thuc an|an hai san bi ngua)\b/,
    a: "🦐 **Dị ứng hải sản / thức ăn:** thường nổi mẩn ngứa, mề đay, sưng môi mắt, có thể đau bụng, tiêu chảy sau khi ăn vài phút tới vài giờ.\n• Ngưng ăn món nghi ngờ, uống nước, nghỉ ngơi, theo dõi.\n• **Gọi 115 / đi cấp cứu ngay** nếu: khó thở, khò khè, sưng môi lưỡi họng, choáng váng, tụt huyết áp — đó có thể là sốc phản vệ.\n• Hay bị lại thì khám chuyên khoa Dị ứng để biết mình dị ứng gì và cách xử trí.\nBạn đang bị những biểu hiện gì? Kể Lomi nghe nha.",
  },
  {
    id: "carsick",
    re: /\b(say xe|say tau|say may bay|chong mat khi di xe)\b/,
    a: "🚌 **Say xe:** ngồi hàng ghế đầu hoặc gần cửa sổ, nhìn ra xa về phía trước, không đọc hay nhìn điện thoại, ăn nhẹ trước khi đi (đừng quá no hay quá đói), mở hé cửa cho thoáng. Ngậm gừng, kẹo gừng giúp một số người đỡ buồn nôn. Cần thuốc chống say thì hỏi dược sĩ loại phù hợp nha.",
  },
  {
    id: "breakfast",
    re: /\b(bo an sang|nhin an sang|khong an sang|an khuya co sao|an dem co sao)\b/,
    a: "🍳 **Bữa sáng / ăn khuya:** bỏ bữa sáng thường xuyên dễ đói cồn cào, mệt, kém tập trung, ăn bù quá nhiều bữa sau, không tốt cho dạ dày. Ăn khuya sát giờ ngủ dễ khó ngủ, trào ngược, tăng cân.\n• Bữa sáng đơn giản cũng được: bánh mì trứng, xôi, sữa, trái cây.\n• Bữa tối nên cách giờ ngủ 2–3 tiếng.",
  },
  {
    id: "coldwater",
    re: /\b(uong nuoc da|uong nuoc lanh co sao|tam dem|tam khuya|tam dem co sao|tam nuoc lanh)\b/,
    a: "🧊 **Nước đá / tắm đêm:** với người khoẻ, uống nước lạnh không gây bệnh, nhưng dễ làm đau họng, ê răng, khó chịu dạ dày ở người nhạy cảm. Tắm đêm thì nên tắm nước ấm, nhanh, lau khô, sấy tóc trước khi ngủ — nhất là trời lạnh như Đà Lạt; người già, người bệnh tim, huyết áp nên tránh tắm quá khuya và tắm nước lạnh.",
  },
  {
    id: "screen",
    re: /\b(nhin dien thoai nhieu co sao|xai dien thoai nhieu|anh sang xanh|nhin man hinh nhieu co sao|dung dien thoai truoc khi ngu)\b/,
    a: "📱 **Dùng điện thoại/màn hình nhiều:** dễ mỏi mắt, khô mắt, đau cổ vai gáy, khó ngủ (ánh sáng màn hình làm não tỉnh táo).\n• Quy tắc 20-20-20: 20 phút nhìn xa 6 mét trong 20 giây.\n• Cất điện thoại 30–60 phút trước khi ngủ, bật chế độ ánh sáng ấm buổi tối.\n• Giữ màn hình ngang tầm mắt, không cúi đầu lâu.",
  },
  {
    id: "sitlong",
    re: /\b(ngoi nhieu co sao|ngoi lau co sao|ngoi van phong|dan van phong)\b/,
    a: "🪑 **Ngồi nhiều:** dễ đau lưng, cổ vai gáy, tăng cân, trĩ, táo bón, kém tuần hoàn.\n• Cứ 45–60 phút đứng dậy đi lại, vươn vai vài phút.\n• Ghế có tựa lưng, màn hình ngang tầm mắt, hai chân chạm sàn.\n• Uống đủ nước (vừa tốt, vừa buộc phải đứng dậy đi vệ sinh 😄).",
  },
  {
    id: "bp",
    re: /\b(huyet ap cao (nen )?an gi|huyet ap (nen )?kieng gi|tieu duong (nen )?an gi|tieu duong kieng gi|mo mau cao an gi|gout (nen )?an gi|gout kieng gi)\b/,
    a: "🥗 **Ăn uống khi có bệnh mạn tính** (huyết áp, tiểu đường, mỡ máu, gout): nguyên tắc chung là ăn nhạt, nhiều rau, bớt đồ ngọt, đồ chiên, nội tạng, rượu bia, đồ chế biến sẵn; giữ cân nặng hợp lý, vận động đều.\nMỗi bệnh có lưu ý riêng và cần phối hợp với thuốc, nên bạn hỏi bác sĩ đang điều trị hoặc bác sĩ Dinh dưỡng để có thực đơn đúng cho mình nha.",
  },
];

/** Câu hỏi kiến thức sức khoẻ ("… có sao không", "ăn gì …", "nên …") → trả lời, không thì null. */
export function healthFact(text: string): string | null {
  const n = ` ${normStrict(text, HEALTH)} `;
  const isQ = text.includes("?") || /\b(co sao|co hai|co tot|an gi|uong gi|nen|bao nhieu|the nao|lam sao|co nen|duoc khong|khong|la du|du chua|bao lau|may tieng|may ly|co map|co beo)\b/.test(n);
  if (!isQ) return null;
  const f = FACTS.find((x) => x.re.test(n) && (!x.cue || HEALTH_CUE.test(n)));
  return f ? `${f.a}\n\n(Kiến thức tham khảo chung — có bệnh nền, đang mang thai hay cho trẻ nhỏ thì hỏi bác sĩ nha 🩺)` : null;
}
