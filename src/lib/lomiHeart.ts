// ─────────────────────────────────────────────────────────────────────────────
// TÂM SỰ CÙNG LOMI (30/09, theo ý Kir) — lắng nghe, an ủi, tư vấn tình cảm / tâm lý nhẹ nhàng.
// Chạy hoàn toàn trên máy (không gọi AI). Nội dung tự viết, dựa trên các nguyên tắc tâm lý phổ biến:
// công nhận cảm xúc → phản chiếu → góc nhìn nhẹ nhàng → một bước nhỏ làm được → câu hỏi mở để bạn kể tiếp.
// Lomi KHÔNG chẩn đoán, không thay chuyên gia; chủ đề nặng thì nhắc nhẹ gặp chuyên gia tâm lý.
// ⚠️ Ý định tự hại luôn được lomiChat.crisisReply xử lý TRƯỚC khi tới đây.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { HEART, normStrict } from "@/lib/lomiAccent";
import { MORE_THEMES } from "@/lib/lomiHeartMore";
import { DUNNO_RE, META_RE, NO_RE, YES_RE, activityOf, eventById, eventOf, type Ev } from "@/lib/lomiTalk";

export type HeartReply = { text: string; quick: string[]; theme: string; listen?: boolean; end?: boolean; story?: string };

export type Theme = {
  id: string;
  re: RegExp;
  feel: string[]; // công nhận cảm xúc
  insight: string[]; // góc nhìn tâm lý nhẹ nhàng
  step: string[]; // một bước nhỏ làm được ngay
  ask: string[]; // câu hỏi mở để kể tiếp
  advice: string[]; // khi người dùng xin lời khuyên
  tarot?: string; // câu bói hợp chủ đề (chip "Bói xem …")
  heavy?: boolean; // nhắc gặp chuyên gia nếu kéo dài
  hint?: [RegExp, string][]; // câu nói trúng chi tiết người dùng kể (vd nhắc tên thuốc) → dùng thay góc nhìn ngẫu nhiên
  stepFirst?: boolean; // chuyện sức khoẻ → ngay lượt đầu đã chỉ bước nên làm (đi khám…)
  define?: string; // người dùng hỏi "X là gì" → giải thích ngắn trước
};

// Chọn câu không lặp lại gần đây (nhớ trong phiên).
const used = new Map<string, number[]>();
function pick(key: string, arr: string[]): string {
  const u = used.get(key) ?? [];
  let free = arr.map((_, i) => i).filter((i) => !u.includes(i));
  if (!free.length) {
    free = arr.map((_, i) => i).filter((i) => i !== u[u.length - 1]);
    u.length = 0;
  }
  const i = free[Math.floor(Math.random() * free.length)] ?? 0;
  u.push(i);
  used.set(key, u);
  return arr[i];
}

const PRO =
  "Nếu cảm giác này kéo dài vài tuần, ảnh hưởng tới ăn ngủ hay công việc, bạn nên nói chuyện với một chuyên gia tâm lý nha — Lomi chỉ là robot nhỏ, không thay được người thật đâu 💚";

// Chủ đề mở rộng (lib/lomiHeartMore) đứng trước — từ khoá cụ thể hơn nên được ưu tiên.
const THEMES: Theme[] = [
  ...MORE_THEMES,
  {
    // Sức khoẻ nam giới — nói tế nhị, đúng y khoa, khuyên gặp bác sĩ; không đi vào chi tiết nhạy cảm.
    id: "menhealth",
    stepFirst: true,
    re: /\b(xuat tinh som|yeu sinh ly|yeu sinh li|roi loan cuong|kho cuong|khong cuong|liet duong|suy giam ham muon|giam ham muon|khong con ham muon|chuyen phong the|chuyen giuong chieu|sinh ly yeu|ban linh dan ong)\b/,
    define:
      "“YSL” là cách viết tắt của yếu sinh lý — cách gọi chung cho các vấn đề như giảm ham muốn, khó cương, hay xuất tinh sớm. Đây là chuyện sức khoẻ rất phổ biến, không có gì xấu hổ cả.",
    feel: [
      "Cảm ơn bạn đã tin mà chia sẻ chuyện tế nhị này với Lomi 💚 Nói ra được đã là bước quan trọng rồi.",
      "Lomi hiểu, chuyện này khó mở lời lắm, nhiều bạn nam giữ trong lòng rất lâu. Bạn không cô đơn đâu.",
      "Đây là chuyện sức khoẻ rất thường gặp, không phải lỗi của bạn và cũng không làm bạn kém đi chút nào.",
    ],
    insight: [
      "Tình trạng này khá phổ biến ở nam giới, và rất hay liên quan tới căng thẳng, lo lắng, thiếu ngủ hoặc áp lực “phải làm tốt”. Càng lo thì thường càng nặng thêm — một vòng lặp của tâm lý.",
      "Tin vui là đây là chuyện chữa được: bác sĩ có nhiều cách, từ tư vấn tâm lý, tập luyện đến điều trị bằng thuốc phù hợp với từng người.",
      "Sức khoẻ tổng thể ảnh hưởng nhiều lắm: ngủ đủ, vận động đều, bớt rượu bia thuốc lá thường giúp cải thiện rõ.",
    ],
    step: [
      "Đặt lịch khám bác sĩ Nam khoa (hoặc khoa Tiết niệu) ở bệnh viện uy tín — bác sĩ gặp chuyện này mỗi ngày nên bạn cứ yên tâm nói thật.",
      "Tránh tự mua thuốc hay “thuốc bổ” quảng cáo trên mạng, dễ tiền mất tật mang và có thể hại sức khoẻ.",
      "Nếu có người yêu, nói chuyện nhẹ nhàng với nhau — cảm giác được thấu hiểu giúp bớt áp lực đi rất nhiều.",
    ],
    ask: ["Chuyện này làm bạn lo lắng nhiều không?", "Bạn đã từng đi khám về chuyện này chưa?", "Dạo này bạn có hay căng thẳng, thiếu ngủ không?"],
    advice: [
      "Đi khám Nam khoa là cách nhanh và chắc nhất — bác sĩ sẽ tìm nguyên nhân (tâm lý hay thể chất) và hướng dẫn cách phù hợp riêng cho bạn.",
      "Giảm áp lực “phải hoàn hảo”: chuyện chăn gối là sự gần gũi của hai người, không phải bài kiểm tra.",
      "Ngủ đủ 7–8 tiếng, tập thể dục đều, hạn chế rượu bia, thuốc lá — những thói quen này hỗ trợ sức khoẻ sinh lý khá nhiều.",
    ],
  },
  {
    id: "health",
    stepFirst: true,
    re: /\b(bi benh|mac benh|om qua|dang om|bi om|benh hoai|dau bung|dau dau qua|dau lung|di kham|ket qua kham|nhap vien|nam vien|phau thuat|mo xong|sut can|tang can|beo phi|suc khoe yeu|suc khoe khong tot|lo ve suc khoe|ung thu|benh nan y)\b/,
    feel: [
      "Có chuyện sức khoẻ thì lo lắng là đương nhiên.",
      "Sức khoẻ là chuyện đáng để ý. Bạn kể rõ hơn để Lomi gợi ý sát hơn nha.",
    ],
    insight: [
      "Lúc lo về sức khoẻ, đầu mình hay tưởng tượng ra điều tệ nhất — nhất là khi đọc tìm hiểu trên mạng. Bác sĩ mới là người trả lời chính xác được.",
      "Chăm sóc tinh thần cũng là một phần của chữa bệnh: bớt lo được chút nào, cơ thể cũng hồi phục tốt hơn chút đó.",
    ],
    step: [
      "Nếu triệu chứng kéo dài hoặc nặng lên, bạn nên đi khám sớm nha — đừng cố chịu.",
      "Nhờ một người thân đi khám cùng, vừa đỡ lo vừa có người nhớ giùm lời bác sĩ dặn.",
    ],
    ask: ["Bạn bị vậy lâu chưa?", "Bạn đã đi khám bác sĩ chưa?"],
    advice: [
      "Ghi lại triệu chứng (bắt đầu khi nào, lúc nào nặng hơn) để kể bác sĩ cho đủ.",
      "Nếu đau dữ dội, khó thở hay có dấu hiệu nguy hiểm, gọi 115 hoặc tới cơ sở y tế gần nhất ngay nha.",
    ],
  },
  {
    id: "cheat",
    re: /\b(ngoai tinh|cam sung|bi cam sung|phan boi|lua doi|bi lua|co nguoi khac|co ban gai khac|co ban trai khac|di voi nguoi khac|bat cha|bat gap .* nhan tin|tuesday|nguoi thu ba)\b/,
    feel: [
      "Bị người mình tin tưởng lừa dối là một trong những nỗi đau khó chịu nhất",
      "Ôi… chuyện này chắc làm bạn chết lặng luôn. Cảm giác bị phản bội đau lắm, không phải ai cũng chịu nổi đâu 💔",
      "Lomi nghe mà thấy nghẹn thay bạn. Tin tưởng ai đó rồi bị phụ lòng — đau là đương nhiên, bạn không yếu đuối chút nào.",
    ],
    insight: [
      "Việc họ phản bội nói lên cách họ chọn sống, chứ không đo giá trị của bạn. Rất nhiều người sau chuyện này tự hỏi “mình thiếu gì?” — nhưng lỗi không nằm ở bạn.",
      "Lúc mới biết, cảm xúc sẽ lẫn lộn: giận, tủi, tiếc, thậm chí vẫn thương. Tất cả đều bình thường, không có cảm xúc nào là “sai”.",
      "Niềm tin vỡ rồi thì hàn lại được hay không là do cả hai, và cần thời gian. Bạn không có nghĩa vụ phải quyết định ngay hôm nay.",
    ],
    step: [
      "Tạm thời đừng quyết định gì lớn khi cảm xúc đang dâng cao. Ăn chút gì, ngủ một giấc, rồi hẵng tính.",
      "Nhắn cho một người bạn thân và kể thật lòng — đừng ôm chuyện này một mình.",
      "Nếu cần, tạm tắt thông báo hay ẩn trang cá nhân của người đó vài hôm để lòng mình có chỗ thở.",
    ],
    ask: ["Bạn phát hiện chuyện này lâu chưa?", "Giờ điều làm bạn đau nhất là gì — sự thật đó, hay cảm giác bị lừa?", "Bạn đã nói chuyện thẳng với người đó chưa?"],
    advice: [
      "Hỏi lòng mình: nếu gạt cảm giác sợ mất đi, mình còn muốn ở lại không? Câu trả lời thật thường nằm ở đó.",
      "Nếu muốn nói chuyện, hãy chọn lúc cả hai bình tĩnh, nói bằng “mình cảm thấy…” thay vì buộc tội — để nghe được sự thật chứ không chỉ là cãi nhau.",
      "Tha thứ hay rời đi đều là lựa chọn can đảm. Điều quan trọng là bạn chọn vì tôn trọng bản thân, chứ không phải vì sợ cô đơn.",
      "Nếu quyết định dừng lại: cắt liên lạc một thời gian, đừng tự hành hạ bằng cách lục lại tin nhắn cũ nha.",
    ],
    tarot: "chuyện tình cảm của mình sắp tới",
  },
  {
    id: "breakup",
    re: /\b(chia tay|that tinh|bi da|bi bo|nguoi yeu bo|nguoi yeu (minh|toi|em|anh|a|e|tui) bo|bo (minh|toi|em|anh|a|e|tui) (roi|di)|bo roi|bo minh|khong con yeu|het yeu|tan vo|ket thuc roi|dut tinh)\b/,
    feel: [
      "Chia tay đau lắm, Lomi hiểu mà 🥺 Như có một phần thói quen hằng ngày tự nhiên biến mất vậy.",
      "Kết thúc một mối quan hệ chưa bao giờ là chuyện nhẹ nhàng.",
      "Mất đi một người từng rất thân thì trống trải là đương nhiên.",
    ],
    insight: [
      "Tâm lý học gọi đây là một kiểu “mất mát” — mình không chỉ mất một người, mà mất cả những kế hoạch, thói quen đã có với họ. Nên buồn lâu một chút cũng không sao.",
      "Não mình quen với người kia như quen một thói quen, nên những ngày đầu hay nhớ, hay muốn nhắn tin. Cảm giác đó sẽ nhạt dần theo thời gian, thật đó.",
      "Kết thúc không có nghĩa là bạn thất bại — nó chỉ có nghĩa là hai người không còn hợp đi tiếp cùng nhau.",
    ],
    step: [
      "Hôm nay chỉ cần ăn một bữa tử tế, tắm nước ấm và ngủ sớm thôi. Vậy là đủ giỏi rồi.",
      "Thử cất tạm những thứ gợi nhớ vào một chiếc hộp — không cần vứt, chỉ cần để ngoài tầm mắt.",
      "Hẹn một người bạn đi cà phê hay đi dạo. Có người bên cạnh, lòng sẽ bớt chênh vênh.",
    ],
    ask: ["Hai bạn chia tay lâu chưa?", "Chuyện này đến bất ngờ, hay đã có dấu hiệu từ trước?", "Giờ bạn nhớ họ nhiều nhất vào lúc nào trong ngày?"],
    advice: [
      "Cho phép mình buồn, nhưng đặt “giờ buồn” — ví dụ khóc thoải mái buổi tối, còn ban ngày thì cố làm việc của mình.",
      "Hạn chế xem trang cá nhân của họ. Mỗi lần xem là một lần vết thương bị gãi lại.",
      "Viết ra 3 điều bạn đã học được từ mối quan hệ này — nó giúp não khép lại chuyện cũ nhẹ nhàng hơn.",
      "Đừng vội tìm người mới chỉ để lấp chỗ trống. Hãy thương mình trước đã.",
    ],
    tarot: "chuyện tình cảm sắp tới của mình",
  },
  {
    id: "ex",
    re: /\b(nho nguoi yeu cu|nho nguoi cu|nho ex|quen nguoi yeu cu|quen nguoi cu|quen ex|quen di nguoi|quen mot nguoi|khong quen duoc|nguoi yeu cu nhan tin|nguoi yeu cu quay lai|quay lai voi nguoi yeu cu|quay lai voi nguoi cu)\b/,
    feel: [
      "Nhớ người cũ là chuyện bình thường lắm, vì mình đã từng có rất nhiều kỷ niệm với họ 🥺",
      "Có những người đi rồi mà vẫn để lại một khoảng trong lòng — Lomi hiểu cảm giác đó.",
      "Người cũ chợt hiện lên là lòng xao động liền ha. Không sao đâu, bạn đâu có sai khi còn nhớ.",
    ],
    insight: [
      "Nhiều khi mình không nhớ người đó, mà nhớ con người mình lúc ở bên họ, hoặc nhớ cảm giác được thương.",
      "Trí nhớ hay “lọc” kỷ niệm: giữ lại chuyện đẹp, làm mờ chuyện buồn. Nên người cũ trong ký ức thường đẹp hơn thực tế một chút.",
      "Muốn quên càng cố thì càng nhớ — tâm lý học gọi là hiệu ứng “con gấu trắng”. Chấp nhận là mình còn nhớ, rồi để nó đi qua, sẽ nhẹ hơn.",
    ],
    step: [
      "Lúc nhớ quá, thử viết hết ra giấy (hoặc ghi chú điện thoại) thay vì nhắn cho họ. Viết xong đọc lại vào sáng hôm sau.",
      "Lấp thời gian rảnh bằng một việc mới: một lớp học ngắn, một môn thể thao, một nhóm bạn mới.",
      "Tạm ẩn hoặc tắt thông báo từ họ. Không phải ghét, chỉ là cho lòng mình được yên.",
    ],
    ask: ["Hai bạn chia tay lâu chưa?", "Bạn nhớ họ, hay nhớ khoảng thời gian đó nhiều hơn?", "Nếu họ quay lại, bạn nghĩ mọi chuyện sẽ khác đi chứ?"],
    advice: [
      "Trước khi nghĩ tới chuyện quay lại, hỏi mình: lý do chia tay ngày đó đã thật sự được giải quyết chưa? Nếu chưa, rất dễ lặp lại.",
      "Nếu người cũ nhắn tin: không cần trả lời ngay. Chờ một ngày, khi đầu óc tỉnh táo, rồi quyết định.",
      "Quên không phải là xoá sạch, mà là nhớ tới mà không còn đau. Điều đó đến từ từ, bạn cứ cho mình thời gian.",
    ],
    tarot: "người yêu cũ có quay lại không",
  },
  {
    id: "unrequited",
    hint: [[/\b(co (nguoi yeu|ny|chong|vo) roi|da co (nguoi yeu|chu))\b/, "Thích một người đã có đôi thì khó xử lắm, Lomi hiểu 🥺 Cảm xúc thì mình không chọn được, nhưng cách mình hành động thì chọn được. Tôn trọng mối quan hệ của họ, giữ khoảng cách vừa đủ và cho lòng mình thời gian — đó là cách vừa thương mình vừa tử tế với người ta."]],
    re: /\b(don phuong|yeu don phuong|(ban ay|nguoi ay|ho|anh ay|co ay) (da )?co (nguoi yeu|ny|chong|vo) roi|thich nguoi (da )?co (nguoi yeu|chu)|thich don phuong|khong thich lai|khong thich minh|bi tu choi|to tinh that bai|bi tu choi to tinh|chi coi minh la ban|friendzone|ho khong de y)\b/,
    feel: [
      "Thương một người mà họ không đáp lại — cảm giác đó vừa ngọt vừa đắng ghê 🥺",
      "Bị từ chối đau lắm, nhất là khi mình đã lấy hết can đảm. Lomi tự hào vì bạn đã dám thật lòng.",
      "Lomi hiểu mà, đơn phương là kiểu buồn âm thầm, chẳng biết kể với ai.",
    ],
    insight: [
      "Người ta không thích lại không có nghĩa là bạn không đáng được thương. Chỉ là hai trái tim chưa cùng nhịp thôi.",
      "Tình cảm không đáp lại thường làm mình tự hỏi “mình có vấn đề gì”. Nhưng hấp dẫn là chuyện rất khó giải thích, nó không phải bảng chấm điểm con người bạn.",
      "Dám bày tỏ là một điểm mạnh. Người biết thương thật lòng như bạn rồi sẽ gặp người trân trọng điều đó.",
    ],
    step: [
      "Tạm giữ khoảng cách một thời gian để lòng lắng lại — không phải cắt đứt, chỉ là cho mình nghỉ.",
      "Dồn năng lượng vào việc làm mình vui: gặp bạn bè, thử cái mới, chăm chút bản thân.",
      "Viết ra những điều bạn thích ở chính mình. Nghe hơi sến, nhưng hiệu quả lắm đó.",
    ],
    ask: ["Bạn thích người đó lâu chưa?", "Họ biết tình cảm của bạn rồi phải không?", "Giờ điều bạn mong nhất là gì — được đáp lại, hay được buông nhẹ nhàng?"],
    advice: [
      "Nếu họ đã rõ ràng từ chối: tôn trọng quyết định đó cũng là tôn trọng chính mình. Đừng cố “chứng minh” thêm nha.",
      "Nếu chưa bày tỏ: một lời nói nhẹ nhàng, không gây áp lực (kiểu “mình quý bạn, muốn hiểu bạn hơn”) sẽ giúp bạn biết câu trả lời thay vì đoán mãi.",
      "Đặt cho mình một mốc — sau khoảng thời gian đó mà mọi thứ không đổi, mình cho phép bản thân bước tiếp.",
    ],
    tarot: "người ấy có tình cảm với mình không",
  },
  {
    id: "crush",
    hint: [[/\b(dong nghiep|cung cong ty|cung cho lam)\b/, "Thích đồng nghiệp thì hơi “nhạy cảm” một chút ha 😄 Cứ từ từ làm bạn trước, giữ chuyên nghiệp ở chỗ làm; nếu tỏ tình thì chọn lúc riêng tư ngoài giờ, và chuẩn bị tinh thần cư xử tự nhiên dù kết quả thế nào nha."], [/\b(cung lop|ban hoc|cung truong)\b/, "Thích bạn cùng lớp thì có lợi thế là gặp nhau hằng ngày nè 😄 Rủ học nhóm, hỏi bài, đi ăn sau giờ học — gần gũi tự nhiên trước rồi hẵng tính chuyện tỏ tình nha."]],
    re: /\b(crush|thich mot nguoi|thich mot ban|dang thich|tham thuong|cam nang|co nen to tinh|to tinh|lam quen voi|muon lam quen|bat chuyen|nhan tin lam quen|ho co thich minh)\b/,
    feel: [
      "Ui, đang cảm nắng ai đó hả 😳 Cảm giác tim đập loạn xạ này dễ thương ghê!",
      "Thích một người là cảm giác vừa vui vừa hồi hộp ha 🥰",
      "Lomi nghe mà thấy rộn ràng giùm bạn luôn nè 💕",
    ],
    insight: [
      "Lúc mới thích, mình hay soi từng tín hiệu nhỏ — một cái like, một tin nhắn trả lời chậm. Đừng quá phân tích nha, dễ tự làm rối mình.",
      "Tình cảm đẹp nhất thường bắt đầu từ việc làm bạn thoải mái với nhau trước.",
      "Hồi hộp là bình thường, nó cho thấy bạn đang thật lòng — không phải dấu hiệu bạn “kém”.",
    ],
    step: [
      "Bắt đầu nhẹ nhàng: hỏi han một chuyện chung hai người cùng quan tâm, đừng vội dồn dập.",
      "Rủ đi một hoạt động nhẹ như cà phê, đi dạo — không khí thoải mái giúp hai người gần nhau tự nhiên hơn.",
      "Cứ là chính mình. Người hợp với bạn sẽ thích con người thật của bạn.",
    ],
    ask: ["Bạn quen người đó ở đâu vậy?", "Hai bạn đã nói chuyện nhiều chưa?", "Bạn thấy họ có đang để ý lại bạn không?"],
    advice: [
      "Để ý xem họ có chủ động hỏi han, nhớ những chuyện nhỏ bạn kể, hay tìm cớ nói chuyện không — đó là tín hiệu tốt.",
      "Muốn tỏ tình thì chọn lúc riêng tư, nói ngắn gọn, chân thành, và cho họ thời gian trả lời. Đừng đặt nặng áp lực kiểu “phải trả lời ngay”.",
      "Dù kết quả thế nào, dám thật lòng là bạn đã thắng chính mình rồi.",
    ],
    tarot: "người ấy có tình cảm với mình không",
  },
  {
    id: "cold",
    re: /\b(lanh nhat|it nhan tin|khong nhan tin|khong rep|seen khong rep|khong tra loi tin nhan|chua tra loi tin nhan|khong tra loi|khong nhan lai|seen|bi ghost|ghost minh|khong quan tam minh|het quan tam|thay doi roi|khac xua|xa cach|vo tam|bo be|khong con nhu truoc)\b/,
    feel: [
      "Người thương tự dưng lạnh đi, cảm giác hụt hẫng và bất an lắm 🥺",
      "Chờ tin nhắn mà không thấy đâu thì lòng cứ thấp thỏm ha. Lomi hiểu mà.",
      "Thấy người kia khác xưa mà không biết vì sao — đó là kiểu buồn làm mình nghĩ mãi.",
    ],
    insight: [
      "Người ta ít nhắn có khi vì đang áp lực chuyện riêng, chứ không hẳn là hết thương. Nhưng cảm giác của bạn vẫn đáng được nói ra.",
      "Khi bất an, não hay tự điền vào chỗ trống bằng kịch bản xấu nhất. Đừng tin hết những gì đầu mình tự vẽ ra nha.",
      "Mối quan hệ nào cũng có lúc nhạt. Quan trọng là hai người có chịu ngồi lại nói với nhau không.",
    ],
    step: [
      "Thay vì trách “sao dạo này lạnh nhạt vậy”, thử hỏi “dạo này em/anh có chuyện gì mệt không?”. Mở lòng trước, người kia dễ mở lòng theo.",
      "Tạm bớt soi điện thoại chờ tin nhắn — làm việc mình thích một chút, lòng sẽ bớt thấp thỏm.",
      "Nói rõ nhu cầu của mình, kiểu “mình cần được hỏi han nhiều hơn một chút”, thay vì mong người kia tự hiểu.",
    ],
    ask: ["Người đó thay đổi từ khi nào vậy?", "Bạn đã thử hỏi thẳng họ chưa?", "Trước đây hai bạn hay nói chuyện thế nào?"],
    advice: [
      "Chọn lúc cả hai rảnh, nói chuyện trực tiếp thay vì qua tin nhắn — giọng nói và ánh mắt đỡ hiểu lầm hơn nhiều.",
      "Nếu đã nói mà người kia vẫn né tránh kéo dài, đó cũng là một câu trả lời. Bạn xứng đáng với người muốn ở bên bạn.",
      "Đừng quên chăm sóc mình: bạn bè, sở thích, công việc. Mối quan hệ lành mạnh là khi hai người vẫn có đời sống riêng.",
    ],
    tarot: "người ấy đang nghĩ gì về mình",
  },
  {
    id: "fight",
    re: /\b(cai nhau|gian nhau|chien tranh lanh|bat hoa|xich mich|hieu lam nhau|khong noi chuyen voi nhau|doi chia tay|to tieng)\b/,
    feel: [
      "Cãi nhau với người mình thương mệt lòng lắm ha 😔",
      "Lomi hiểu, giận người thân thiết thì vừa bực vừa buồn, chẳng biết phải làm sao.",
      "Mâu thuẫn xảy ra là chuyện bình thường trong mọi mối quan hệ, nhưng lúc đang trong đó thì khó chịu thật.",
    ],
    insight: [
      "Cãi nhau thường không phải vì chuyện nhỏ trước mắt, mà vì một nhu cầu chưa được đáp ứng — muốn được lắng nghe, được tôn trọng, được ưu tiên.",
      "Khi nóng giận, cả hai đều muốn “thắng”, nên chẳng ai nghe ai. Tạm dừng một chút không phải là thua đâu.",
      "Cặp đôi bền không phải là không cãi nhau, mà là biết làm lành sau khi cãi.",
    ],
    step: [
      "Nếu đang nóng, tạm dừng 20–30 phút rồi hẵng nói tiếp. Lúc bình tĩnh, lời nói sẽ khác hẳn.",
      "Thử bắt đầu bằng “mình cảm thấy… khi…” thay vì “bạn lúc nào cũng…”. Câu nói nhẹ đi, người nghe cũng mềm lại.",
      "Làm lành đôi khi chỉ cần một tin nhắn đơn giản: “Mình không muốn giận nhau nữa, mình nói chuyện nhé?”",
    ],
    ask: ["Hai bạn cãi nhau vì chuyện gì vậy?", "Chuyện này xảy ra lần đầu, hay lặp đi lặp lại?", "Giờ bạn muốn làm lành, hay cần thêm thời gian?"],
    advice: [
      "Mỗi lần chỉ nói một chuyện, đừng lôi chuyện cũ ra — càng nói càng rối.",
      "Nghe để hiểu chứ không phải nghe để cãi lại: nhắc lại ý của người kia (“ý bạn là…”) trước khi nói ý mình.",
      "Nếu mâu thuẫn cứ lặp lại một kiểu, hai người nên ngồi xuống thống nhất một “luật chơi” chung.",
    ],
    tarot: "mối quan hệ của mình và người ấy sẽ thay đổi ra sao",
  },
  {
    id: "jealous",
    hint: [[/\b(ban be|ban cua minh|ban than|dong nghiep)\b/, "Ghen cả với bạn bè của bạn thì dễ làm bạn thấy ngột ngạt lắm 😔 Người ấy có thể đang bất an. Thử nói rõ: bạn bè là một phần cuộc sống của bạn và bạn cần được tin tưởng — đồng thời hỏi xem điều gì làm họ lo để cùng tìm cách."]],
    re: /\b(ghen|ghen tuong|hay ghen|bi ghen|nghi ngo nguoi yeu|kiem soat)\b/,
    feel: [
      "Ghen là cảm xúc rất người — ai thương thật cũng có lúc ghen hết á 😅",
      "Cảm giác bất an khi thấy người thương thân với ai khác khó chịu lắm, Lomi hiểu.",
    ],
    insight: [
      "Ghen thường đến từ nỗi sợ mất đi, hoặc cảm giác mình chưa đủ tốt. Nhìn vào nỗi sợ đó sẽ giúp bạn hiểu mình hơn.",
      "Ghen một chút là gia vị, nhưng ghen quá thành kiểm soát thì cả hai đều ngột ngạt.",
    ],
    step: [
      "Khi cơn ghen nổi lên, dừng lại và hỏi mình: mình đang thấy sự thật, hay đang đoán?",
      "Nói ra cảm giác của mình bằng lời nhẹ nhàng, thay vì kiểm tra điện thoại hay hỏi dồn.",
    ],
    ask: ["Chuyện gì làm bạn thấy ghen vậy?", "Người ấy đã từng làm bạn mất lòng tin chưa?"],
    advice: [
      "Hai người nên thống nhất ranh giới rõ ràng — thế nào là ổn, thế nào là không — để khỏi mỗi người hiểu một kiểu.",
      "Xây sự tự tin cho bản thân: khi bạn thấy mình có giá trị, nỗi sợ mất ai đó sẽ nhẹ đi nhiều.",
    ],
    tarot: "người ấy nghĩ gì về mình",
  },
  {
    id: "longdist",
    re: /\b(yeu xa|o xa nhau|xa mat|cach nhau xa|khac thanh pho|khac nuoc)\b/,
    feel: ["Yêu xa là thử thách lớn lắm, thương ai mà không được gặp thì nhớ muốn xỉu luôn 🥺", "Lomi hiểu, khoảng cách làm mọi cảm xúc to hơn — nhớ cũng nhiều hơn, lo cũng nhiều hơn."],
    insight: [
      "Yêu xa bền được khi hai người có chung một “điểm đến” — biết khi nào sẽ ở gần nhau.",
      "Ít gặp dễ sinh hiểu lầm qua tin nhắn. Gọi video, nghe giọng nhau giúp gắn kết hơn nhiều.",
    ],
    step: ["Thử hẹn nhau một “buổi hẹn online” cố định mỗi tuần: cùng ăn tối qua video, cùng xem phim.", "Lên kế hoạch cho lần gặp tới — có điều để mong chờ, những ngày xa cũng dễ chịu hơn."],
    ask: ["Hai bạn xa nhau lâu chưa?", "Có kế hoạch sống gần nhau không?"],
    advice: [
      "Nói rõ kỳ vọng với nhau: nhắn tin bao nhiêu là đủ, lúc nào cần gọi — đỡ tủi thân vì chờ đợi.",
      "Giữ cuộc sống riêng thật vui, để mỗi lần nói chuyện là có chuyện hay kể cho nhau.",
    ],
    tarot: "tình cảm của mình thời gian tới thế nào",
  },
  {
    id: "family",
    hint: [[/\b(so sanh|con nha nguoi ta)\b/, "Bị so sánh với “con nhà người ta” là tủi lắm, Lomi hiểu 🥺 Bố mẹ thường so sánh vì muốn con tốt hơn, nhưng cách đó lại làm con thấy mình không đủ tốt. Thử nói với mẹ lúc cả hai vui vẻ: “Con biết mẹ muốn con giỏi, nhưng bị so sánh làm con buồn và mất động lực lắm.”"]],
    re: /\b(bo me|ba me|cha me|gia dinh|bo minh|me minh|ba minh|cha minh|anh chi em|bi mang|bi la|bi so sanh voi|ap dat|cai nhau voi (bo|me|ba|cha)|khong hieu minh|vo chong|nha chong|nha vo|me chong|bo chong)\b/,
    feel: [
      "Chuyện gia đình là chuyện khó nói nhất, vì mình thương mà cũng mệt 😔",
      "Lomi hiểu, bị chính người nhà không hiểu thì tủi thân lắm.",
      "Gia đình là nơi mình mong được bình yên nhất, nên khi có chuyện, lòng nặng gấp đôi.",
    ],
    insight: [
      "Nhiều khi bố mẹ thương theo cách của thế hệ họ — lo lắng biến thành la mắng, kỳ vọng biến thành áp đặt. Không phải vì họ không thương.",
      "Bạn có thể thương gia đình mà vẫn có quyền có suy nghĩ, lựa chọn riêng. Hai điều đó không mâu thuẫn.",
      "Đặt ranh giới với người nhà không phải là bất hiếu, mà là giữ cho mối quan hệ lâu dài được lành mạnh.",
    ],
    step: [
      "Chọn lúc mọi người vui vẻ, nói chuyện riêng với một người trước — thường dễ hơn nói trước cả nhà.",
      "Viết một lá thư hoặc tin nhắn dài nếu nói trực tiếp khó. Viết giúp mình nói đủ ý mà không bị ngắt lời.",
      "Tìm một khoảng riêng cho mình mỗi ngày — đi dạo, nghe nhạc — để nạp lại năng lượng.",
    ],
    ask: ["Chuyện này xảy ra với ai trong nhà vậy?", "Điều bạn mong gia đình hiểu nhất là gì?", "Trong nhà có ai bạn thấy dễ nói chuyện hơn không?"],
    advice: [
      "Nói bằng cảm xúc thay vì lý lẽ: “con thấy buồn khi…” thường chạm tới bố mẹ hơn là tranh luận đúng sai.",
      "Chấp nhận là có những điều người lớn khó thay đổi. Mình tập trung vào phần mình kiểm soát được: cách mình phản ứng và lựa chọn của mình.",
      "Nếu căng thẳng quá, nhờ một người lớn mà cả nhà tôn trọng (cô, dì, chú…) đứng giữa nói giúp.",
    ],
    tarot: "chuyện gia đình mình thời gian tới",
  },
  {
    id: "friends",
    re: /\b(ban than|ban be|bi ban|bi co lap|bi noi xau|bi tay chay|bi bo roi|ban phan boi|mat ban|khong co ban|hoi ban|nhom ban|bi loai ra)\b/,
    feel: [
      "Chuyện bạn bè mà buồn thì nhói lắm, vì đó là những người mình chọn để tin 😔",
      "Bị bạn bè làm tổn thương đau không kém gì chuyện tình cảm đâu, Lomi hiểu mà.",
    ],
    insight: [
      "Tình bạn cũng thay đổi theo thời gian — có người đi cùng mình một đoạn, có người đi cả đời. Điều đó không làm bạn kém đi.",
      "Người nói xấu sau lưng thường nói nhiều về họ hơn là về bạn.",
      "Một vài người bạn thật lòng quý hơn nhiều một nhóm đông mà không thoải mái.",
    ],
    step: [
      "Nếu có hiểu lầm, thử nhắn riêng một câu nhẹ nhàng: “Mình thấy dạo này tụi mình hơi xa, có chuyện gì không?”",
      "Mở rộng vòng bạn bè: một câu lạc bộ, một lớp học, hay phòng chat Cộng đồng trong app cũng là chỗ hay để quen người mới.",
    ],
    ask: ["Chuyện gì đã xảy ra giữa bạn và họ vậy?", "Bạn còn muốn giữ tình bạn này không?"],
    advice: [
      "Nói thẳng nhưng tử tế: nói ra điều làm bạn buồn, và cho người kia cơ hội giải thích.",
      "Nếu mối quan hệ chỉ làm bạn mệt mỏi, lùi lại một bước cũng là cách thương bản thân.",
    ],
  },
  {
    id: "boss",
    hint: [[/\b(nghi viec|bo viec|xin nghi|nghi lam)\b/, "Bị sếp đối xử vậy mà tính nghỉ cũng dễ hiểu lắm. Nhưng đừng quyết lúc đang ức nha — chuẩn bị khoản dự phòng, tìm chỗ mới trước khi nghỉ, và nếu nghỉ thì nghỉ đàng hoàng, giữ quan hệ tốt."]],
    re: /\b(sep (hay |cu |lai |)(mang|la|chui|chen ep|kho tinh|ghet|soi|bat ne|trach|quat)|bi sep|dong nghiep (noi xau|chen ep|ghet|bat nat|choi xau|tay chay)|bi dong nghiep|moi truong (lam viec )?doc hai|bi bat nat o cong ty|bi mang truoc mat)\b/,
    feel: [
      "Bị đối xử như vậy ở chỗ làm chắc ấm ức lắm 😣 Lomi hiểu mà.",
      "Bị mắng hay bị chèn ép trước mặt người khác thì vừa tủi vừa quê, khó chịu thật sự.",
      "Đi làm đã mệt, còn gặp chuyện với sếp hay đồng nghiệp thì nặng lòng gấp đôi 😔",
    ],
    insight: [
      "Cách người khác cư xử phản ánh cách họ quản lý cảm xúc, không phải toàn bộ giá trị của bạn.",
      "Góp ý về công việc là bình thường, nhưng xúc phạm hay làm nhục thì không. Bạn có quyền được tôn trọng ở chỗ làm.",
      "Lúc bị mắng, não dễ phóng đại thành “mình tệ quá”. Tách riêng: phần nào là góp ý đúng để sửa, phần nào chỉ là cảm xúc của người kia.",
    ],
    step: [
      "Ghi lại sự việc (ngày, chuyện gì, ai chứng kiến) — vừa giúp bình tĩnh, vừa có căn cứ nếu cần nói chuyện với cấp trên.",
      "Tối nay làm điều gì đó để “xả” áp lực: đi bộ, tập thể dục, gặp bạn bè.",
      "Đợi cảm xúc lắng xuống rồi hẵng phản hồi, tránh đáp trả lúc đang nóng.",
    ],
    ask: ["Chuyện này xảy ra lần đầu, hay thường xuyên vậy?", "Bạn thấy mình có sai phần nào không, hay hoàn toàn bị đối xử bất công?", "Ở chỗ làm có ai bạn tin để nói chuyện không?"],
    advice: [
      "Nếu có phần mình sai: nhận phần đó ngắn gọn và nêu cách sửa — vừa chuyên nghiệp, vừa giữ được lòng tự trọng.",
      "Nếu bị đối xử bất công lặp lại: xin gặp riêng để nói thẳng, bình tĩnh, bằng sự việc cụ thể. Không ổn thì báo lên cấp cao hơn hoặc phòng nhân sự.",
      "Nếu môi trường độc hại kéo dài, âm thầm chuẩn bị một lối thoát (cập nhật CV, tìm cơ hội mới) cũng là cách thương bản thân.",
    ],
    tarot: "công việc sắp tới của mình thế nào",
  },
  {
    id: "work",
    hint: [[/\b(nghi viec|bo viec|xin nghi|nghi lam)\b/, "Nếu đang tính nghỉ việc thì đừng quyết lúc đang nóng giận nha. Thử viết ra: điều gì không chịu nổi, điều gì còn giữ bạn lại; chuẩn bị khoản dự phòng vài tháng và tìm chỗ mới trước khi nghỉ thì an toàn hơn nhiều."], [/\b(sep|quan ly)\b/, "Chuyện với sếp là áp lực lớn nhất ở chỗ làm luôn 😣 Nếu bị la nhiều, thử tách riêng: phần nào là góp ý đúng để sửa, phần nào chỉ là cảm xúc của họ. Bị xúc phạm lặp lại thì bạn có quyền nói rõ hoặc báo lên cấp cao hơn."]],
    re: /\b(ap luc cong viec|cong viec ap luc|sep|dong nghiep|bi duoi viec|bi sa thai|mat viec|that nghiep|nghi viec|chan viec|chan di lam|ghet cong viec|bi chen ep|bi mang o cong ty|qua tai cong viec|burnout|kiet suc)\b/,
    feel: [
      "Áp lực công việc mà kéo dài thì mệt cả thân lẫn tâm luôn 😮‍💨 Bạn vất vả rồi.",
      "Lomi hiểu, đi làm mà không vui thì mỗi sáng thức dậy đều nặng nề.",
      "Chuyện công việc ảnh hưởng tới cả tiền bạc lẫn tự tin, nên lo là đương nhiên.",
    ],
    insight: [
      "Kiệt sức (burnout) không phải do bạn yếu, mà do năng lượng bỏ ra lâu ngày nhiều hơn năng lượng được nạp lại.",
      "Giá trị của bạn lớn hơn chức danh hay một công việc. Một giai đoạn khó không định nghĩa cả con người bạn.",
      "Nhiều người đã phải thay đổi vài lần mới tìm được chỗ hợp mình. Đổi hướng không phải là thất bại.",
    ],
    step: [
      "Chia việc thành 3 nhóm: gấp, quan trọng, để sau được. Hôm nay chỉ cần làm xong nhóm gấp.",
      "Cho mình một “ranh giới tắt máy”: sau giờ nhất định thì không đọc tin nhắn công việc nữa.",
      "Ra ngoài đi bộ 10 phút giữa giờ — nghe đơn giản nhưng giúp đầu óc nhẹ hẳn.",
    ],
    ask: ["Điều gì ở công việc làm bạn mệt nhất?", "Chuyện này kéo dài lâu chưa?", "Bạn đang muốn cố gắng tiếp, hay đang nghĩ tới chuyện đổi hướng?"],
    advice: [
      "Nếu vấn đề nằm ở khối lượng việc: nói chuyện thẳng với quản lý, kèm danh sách việc đang làm — để họ thấy và cùng sắp xếp.",
      "Nếu đang tính nghỉ: chuẩn bị trước một khoản dự phòng và cập nhật CV, đừng nghỉ trong lúc cảm xúc bùng nổ.",
      "Nếu đang tìm việc: đặt mục tiêu nhỏ mỗi ngày (vd gửi 2 hồ sơ), giữ nhịp sinh hoạt đều đặn để không bị hụt tinh thần.",
    ],
    tarot: "công việc sắp tới của mình thế nào",
  },
  {
    id: "study",
    re: /\b(thi rot|thi truot|truot mon|rot mon|diem kem|diem thap|hoc hanh|ap luc hoc|ap luc thi|thi cu|on thi|hoc khong vao|luan van|do an|tot nghiep)\b/,
    feel: [
      "Chuyện học hành, thi cử áp lực lắm, Lomi hiểu mà 📚",
      "Điểm số không như mong đợi thì buồn là đương nhiên — nhất là khi bạn đã cố gắng.",
    ],
    insight: [
      "Một bài thi chỉ đo một thời điểm, không đo được hết khả năng hay tương lai của bạn.",
      "Học không vào thường là dấu hiệu đầu óc đang quá tải, cần nghỉ chứ không phải do bạn kém.",
    ],
    step: [
      "Thử học theo nhịp 25 phút học – 5 phút nghỉ. Chia nhỏ ra, não đỡ “sợ” hơn nhiều.",
      "Ngủ đủ quan trọng hơn thức khuya học thêm — trí nhớ được sắp xếp lại khi mình ngủ đó.",
    ],
    ask: ["Bạn đang lo nhất môn nào / việc nào?", "Còn bao lâu nữa là tới hạn vậy?"],
    advice: [
      "Xem lại bài sai để biết mình hổng ở đâu, thay vì chỉ nhìn điểm — lần sau sẽ khác hẳn.",
      "Nhờ bạn học giỏi hoặc thầy cô giảng lại phần khó. Hỏi không phải là yếu, mà là khôn.",
    ],
  },
  {
    id: "money",
    re: /\b(no nan|mac no|vo no|no nhieu|no qua|nhieu no|ganh no|tra no|het tien|thieu tien|ket tien|ap luc tien|lo tien|khong du tien|cang tien|tien bac)\b/,
    feel: ["Áp lực tiền bạc làm người ta mất ngủ thật sự đó 😔 Lomi hiểu.", "Lo chuyện tiền là một trong những nỗi lo nặng nhất, vì nó ảnh hưởng tới mọi thứ khác."],
    insight: [
      "Khi lo tiền, não dễ rơi vào chế độ “sinh tồn”, khó nghĩ xa. Nên bước đầu tiên là nhìn rõ con số, không phải tự trách.",
      "Rất nhiều người từng trải qua giai đoạn khó khăn tài chính và vượt qua được — từng bước nhỏ một.",
    ],
    step: [
      "Ghi hết ra: đang có bao nhiêu, cần trả bao nhiêu, khoản nào gấp nhất. Nhìn rõ con số là bớt sợ một nửa.",
      "Cắt tạm vài khoản chi không cần thiết trong 1–2 tháng để có chút dư thở.",
    ],
    ask: ["Khoản nào đang làm bạn lo nhất?", "Bạn có người thân nào có thể nói chuyện về chuyện này không?"],
    advice: [
      "Nếu đang có nợ: ưu tiên trả khoản lãi cao trước, và tránh vay chỗ này đắp chỗ kia — nhất là vay nóng, lãi rất nặng.",
      "Tìm thêm một nguồn thu nhỏ từ kỹ năng mình có. Nhỏ thôi nhưng đều đặn sẽ giúp rất nhiều.",
    ],
    tarot: "tài chính của mình sắp tới",
  },
  {
    id: "grief",
    re: /\b(mat nguoi than|qua doi|tang le|dam tang|ong mat|ba mat|bo mat|me mat|mat me|mat bo|mat ong|mat ba|mat di mot nguoi|(chong|vo|con|ban than) (minh |toi |em )?(mat|qua doi|mat roi)|thu cung mat|cho mat|meo mat|con cho chet|con meo chet)\b/,
    feel: [
      "Lomi rất tiếc về sự mất mát của bạn 🤍 Không lời nào đủ để xoa dịu nỗi đau này.",
      "Mất đi người (hay bé cưng) mình thương là nỗi đau rất lớn. Lomi ở đây với bạn.",
    ],
    insight: [
      "Đau buồn không có thời hạn và không có cách “đúng”. Có ngày thấy ổn, có ngày lại oà khóc — tất cả đều bình thường.",
      "Nỗi đau lớn vì tình thương lớn. Người ấy vẫn sống trong ký ức và trong những điều tốt họ để lại nơi bạn.",
    ],
    step: [
      "Đừng ở một mình quá lâu. Ngồi cạnh người thân, dù không nói gì, cũng giúp lòng bớt trống trải.",
      "Nếu được, viết vài dòng gửi người đã đi — những điều bạn muốn nói mà chưa kịp.",
    ],
    ask: ["Bạn có muốn kể cho Lomi nghe về người ấy không?", "Chuyện này mới xảy ra phải không?"],
    advice: [
      "Cho phép mình buồn, không cần tỏ ra mạnh mẽ với ai cả.",
      "Giữ nhịp sinh hoạt tối thiểu: ăn, ngủ, uống đủ nước. Cơ thể cần sức để đi qua giai đoạn này.",
    ],
    heavy: true,
  },
  {
    id: "selfworth",
    re: /\b(tu ti|that bai|vo dung|kem coi|khong bang ai|so sanh voi|thua kem|ghet ban ?than|chan ban ?than|khong lam duoc gi|khong co gia tri|minh te qua|minh do qua|khong ai thuong|xau xi|beo qua|khong du tot)\b/,
    feel: [
      "Nghe bạn nói vậy Lomi thương lắm 🥺 Cảm giác mình không đủ tốt nặng nề thật.",
      "Lomi hiểu, có những ngày mình nhìn đâu cũng thấy mình thua kém người ta.",
    ],
    insight: [
      "Mình hay so “hậu trường” của mình với “sân khấu” của người khác — mạng xã hội chỉ cho thấy phần đẹp nhất thôi.",
      "Tiếng nói tự chê trong đầu thường khắt khe hơn bất kỳ ai. Nếu bạn thân của bạn nói vậy về họ, bạn sẽ đáp lại họ thế nào?",
      "Giá trị của bạn không đo bằng thành tích hay ngoại hình. Việc bạn còn đang cố gắng đã là một điều đáng quý.",
    ],
    step: [
      "Tối nay thử viết 3 việc nhỏ bạn đã làm được trong ngày, dù nhỏ như “đã dậy đúng giờ”.",
      "Tạm nghỉ mạng xã hội vài ngày, xem lòng mình có nhẹ hơn không.",
    ],
    ask: ["Điều gì làm bạn thấy mình kém vậy?", "Cảm giác này có từ lâu chưa, hay mới gần đây?"],
    advice: [
      "Nói chuyện với bản thân như với một người bạn thân: tử tế, kiên nhẫn, không chê bai.",
      "Đặt mục tiêu thật nhỏ và làm được — mỗi lần làm được là một viên gạch xây lại sự tự tin.",
      "Ở gần những người làm bạn thấy thoải mái là chính mình, bớt thời gian với ai khiến bạn thấy nhỏ bé.",
    ],
    heavy: true,
  },
  {
    id: "overthink",
    re: /\b(suy nghi nhieu|nghi nhieu|overthinking|overthink|nghi qua nhieu|khong ngung nghi|nghi linh tinh|dau dau vi nghi|roi qua|roi tri|hoang mang qua|khong biet phai lam sao)\b/,
    feel: ["Đầu óc cứ chạy mãi không ngừng mệt lắm ha 😵‍💫 Lomi hiểu mà.", "Suy nghĩ nhiều quá thì cả người cũng rã rời theo, bạn không một mình đâu."],
    insight: [
      "Overthinking là khi não cố “giải” một chuyện chưa xảy ra. Nó tưởng đang bảo vệ mình, nhưng thật ra chỉ làm mình mệt thêm.",
      "Phần lớn những điều mình lo chưa bao giờ xảy ra — nghiên cứu cho thấy vậy đó.",
    ],
    step: [
      "Viết hết những gì đang nghĩ ra giấy. Đưa suy nghĩ ra ngoài, đầu sẽ nhẹ hơn nhiều.",
      "Chia ra 2 cột: “việc mình làm được” và “việc ngoài tầm tay”. Chỉ tập trung vào cột đầu.",
      "Thử hít vào 4 nhịp, giữ 4 nhịp, thở ra 6 nhịp, lặp lại vài lần.",
    ],
    ask: ["Chuyện gì đang làm bạn nghĩ nhiều nhất?", "Bạn hay nghĩ nhiều vào lúc nào — tối trước khi ngủ, hay cả ngày?"],
    advice: [
      "Đặt “giờ lo lắng” 15 phút mỗi ngày. Ngoài giờ đó, suy nghĩ tới thì ghi lại, để dành tới giờ hẵng nghĩ.",
      "Vận động nhẹ (đi bộ, đạp xe) là cách kéo não ra khỏi vòng lặp suy nghĩ rất hiệu quả.",
    ],
    heavy: true,
  },
  {
    id: "insomnia",
    re: /\b(mat ngu|khong ngu duoc|kho ngu|thuc trang|ngu khong ngon|tinh giac giua dem|thuc khuya hoai|trang dem)\b/,
    feel: ["Mất ngủ mệt lắm luôn, sáng dậy như chưa được sạc pin 😴", "Nằm mãi không ngủ được mà đầu cứ chạy — Lomi hiểu cảm giác đó."],
    insight: [
      "Càng cố ép mình ngủ thì càng tỉnh. Đôi khi chỉ cần nằm thư giãn thôi, giấc ngủ sẽ tự tới.",
      "Ánh sáng xanh từ điện thoại làm não tưởng vẫn còn ban ngày — đó là thủ phạm thường gặp lắm.",
    ],
    step: [
      "Cất điện thoại xa giường 30 phút trước khi ngủ, thay bằng đọc vài trang sách hay nghe nhạc nhẹ.",
      "Nếu nằm 20 phút chưa ngủ được, dậy làm việc gì nhẹ nhàng dưới ánh đèn dịu, buồn ngủ rồi hẵng quay lại giường.",
    ],
    ask: ["Bạn mất ngủ lâu chưa?", "Trước khi ngủ bạn hay nghĩ về chuyện gì?"],
    advice: [
      "Giữ giờ thức dậy cố định mỗi ngày, kể cả cuối tuần — nhịp sinh học sẽ ổn dần.",
      "Hạn chế cà phê, trà sau 2–3 giờ chiều.",
    ],
    heavy: true,
  },
  {
    id: "anxiety",
    re: /\b(lo au|lo lang|bat an|hoang so|so hai|tim dap nhanh|hoi hop|cang thang|stress|ap luc qua|so qua|lo qua)\b/,
    feel: ["Lo âu làm mình như lúc nào cũng căng dây đàn, mệt lắm 😟", "Lomi hiểu, cảm giác bất an cứ lởn vởn khó chịu thật."],
    insight: [
      "Lo âu là cách cơ thể báo động khi thấy nguy hiểm — chỉ là đôi khi chuông báo hơi nhạy quá.",
      "Cảm giác lo thường lên đỉnh rồi tự hạ xuống sau vài phút. Nó không kéo dài mãi đâu.",
    ],
    step: [
      "Thử bài 5-4-3-2-1: nhìn 5 thứ quanh mình, chạm 4 thứ, nghe 3 âm thanh, ngửi 2 mùi, nếm 1 vị. Giúp kéo mình về hiện tại.",
      "Hít vào chậm bằng mũi 4 nhịp, thở ra bằng miệng 6 nhịp. Làm 5 lần.",
    ],
    ask: ["Điều gì đang làm bạn lo nhất?", "Cảm giác lo này đến thường xuyên, hay chỉ gần đây?"],
    advice: [
      "Viết điều mình lo ra, rồi tự hỏi: khả năng nó xảy ra thật là bao nhiêu? Nếu xảy ra, mình sẽ làm gì? Có kế hoạch là bớt sợ.",
      "Giảm cà phê, ngủ đủ, vận động đều — nghe cơ bản nhưng ảnh hưởng tới lo âu nhiều lắm.",
    ],
    heavy: true,
  },
  {
    id: "lonely",
    re: /\b(co don|mot minh|khong ai choi|khong ai hieu|le loi|lonely|khong co ai|khong ai quan tam|khong ai nghe)\b/,
    feel: ["Cô đơn là cảm giác ai cũng có lúc gặp, nhưng lúc đang ở trong đó thì lạnh lắm 🥺", "Lomi ở đây với bạn nè 🤗 Cảm giác không ai hiểu mình buồn thật."],
    insight: [
      "Cô đơn không phải vì bạn có vấn đề — nhiều khi chỉ là mình chưa gặp đúng người, hoặc đang ở một giai đoạn chuyển đổi.",
      "Có thể cô đơn ngay giữa đám đông. Điều mình cần thường là một kết nối thật, chứ không phải nhiều người.",
    ],
    step: [
      "Nhắn cho một người bạn cũ lâu rồi chưa hỏi han. Một câu “dạo này sao rồi?” có khi mở ra cả buổi trò chuyện.",
      "Thử ghé Cộng đồng (/cong-dong) hoặc mục Làm quen trên Quẹt (/quet) — nhiều người quanh bạn cũng đang tìm bạn đó.",
    ],
    ask: ["Bạn thấy cô đơn nhiều nhất vào lúc nào?", "Gần đây bạn có ai để trò chuyện không?"],
    advice: [
      "Tham gia một hoạt động đều đặn (lớp học, CLB, tình nguyện) — gặp lại cùng một nhóm người nhiều lần là cách dễ nhất để thành bạn.",
      "Học cách ở một mình thật vui: đi cà phê một mình, xem phim một mình. Thoải mái với chính mình thì cô đơn cũng nhẹ bớt.",
    ],
  },
  {
    id: "love",
    re: /\b(chuyen tinh cam|tu van tinh cam|tinh yeu|nguoi yeu|chuyen yeu duong|moi quan he)\b/,
    feel: ["Chuyện tình cảm luôn là chuyện làm lòng mình lên xuống nhiều nhất ha 💕", "Lomi sẵn sàng nghe chuyện tình cảm của bạn nè 🥰"],
    insight: ["Mối quan hệ nào cũng cần hai người cùng vun. Không ai hoàn hảo, quan trọng là cùng muốn hiểu nhau.", "Cảm xúc của bạn trong chuyện này đều đáng được lắng nghe, dù là vui hay buồn."],
    step: ["Kể Lomi nghe từ từ nha, chuyện gì đang làm bạn nghĩ nhiều nhất?"],
    ask: ["Chuyện tình cảm của bạn đang thế nào vậy?", "Bạn đang có người yêu, hay đang thích ai đó?"],
    advice: [
      "Giao tiếp là chìa khoá: nói ra điều mình cần, và thật sự lắng nghe điều người kia cần.",
      "Một mối quan hệ lành mạnh làm bạn thấy an toàn và được là chính mình. Nếu thường xuyên thấy ngột ngạt, bất an, hãy dừng lại nhìn kỹ nha.",
    ],
    tarot: "tình cảm của mình thời gian tới thế nào",
  },
  {
    id: "tired",
    re: /\b(met qua|met moi|met ghe|met lam|hoi met|thay met|met met|duoi suc|kiet suc|qua tai|ban qua|nhieu viec qua|chan nan|nan long|mat dong luc|khong con dong luc)\b/,
    feel: ["Bạn vất vả rồi 💚 Mệt thì nghỉ một chút, không ai trách đâu.", "Lomi nghe mà thấy thương, chắc dạo này bạn gồng nhiều lắm."],
    insight: [
      "Mệt mỏi là tín hiệu cơ thể và tâm trí đang cần nạp lại, không phải dấu hiệu bạn lười hay yếu.",
      "Mất động lực thường đến sau một thời gian dài cố quá sức. Nghỉ ngơi cũng là một phần của cố gắng.",
    ],
    step: ["Hôm nay cho phép mình làm ít đi một chút: chọn 1 việc quan trọng nhất thôi.", "Uống một ly nước, ra ngoài hít thở vài phút, rồi hẵng làm tiếp."],
    ask: ["Điều gì làm bạn mệt nhất dạo này?", "Bạn có được nghỉ ngơi đủ không?"],
    advice: [
      "Giữ giấc ngủ đều và đủ — đây là “sạc pin” quan trọng nhất.",
      "Tìm một việc nhỏ làm bạn vui mỗi ngày, dù chỉ 15 phút, để có cái mà mong chờ.",
    ],
  },
  {
    id: "sad",
    re: /\b(buon(?! ban)|buon qua|buon ghe|dang buon|thay buon|buon hiu|chan doi|tui than|muon khoc|dang khoc|khoc qua|tam trang te|tam trang khong tot|down|bi down|nang long|trong rong|that vong|khong vui)\b/,
    feel: [
      "Nghe bạn buồn, Lomi thương ghê 🥺",
      "Lomi gửi bạn một cái ôm thật chặt nè 🤗",
      "Buồn thì cứ buồn một chút, không sao đâu 💚 Lomi ở đây với bạn.",
    ],
    insight: [
      "Buồn không phải là yếu đuối — đó là cách lòng mình báo rằng có điều gì đó quan trọng vừa bị chạm tới.",
      "Cảm xúc giống như thời tiết: có lúc mưa dầm, nhưng rồi trời sẽ tạnh. Hôm nay tệ không có nghĩa ngày mai cũng vậy.",
      "Nói ra được là đã nhẹ đi một nửa rồi đó.",
    ],
    step: ["Pha một ly gì ấm, nghe một bài nhạc bạn thích, cho mình nghỉ một chút nha.", "Nếu muốn khóc thì cứ khóc, nước mắt cũng là một cách để lòng nhẹ bớt."],
    ask: ["Có chuyện gì làm bạn buồn vậy? Kể Lomi nghe được không?", "Chuyện gì đang làm bạn bận lòng nè?"],
    tarot: "Bói một lá cho hôm nay",
    advice: [
      "Đừng giữ một mình: kể cho một người bạn tin tưởng, hoặc cứ kể Lomi nghe.",
      "Vận động nhẹ, ra nắng, ăn uống đầy đủ — cơ thể khoẻ lên, tâm trạng cũng dễ khá hơn.",
    ],
  },
];

// Chủ đề chỉ là "danh từ" (bạn bè, gia đình, công việc…) — nhắc tới trong lúc kể chuyện khác thì không đổi chủ đề.
const NOUNISH = new Set(["friends", "family", "work", "study", "love", "single", "money", "health", "homesick"]);
const LOVE_THEMES = new Set(["breakup", "ex", "cheat", "marriage", "fight", "cold", "situationship", "spark", "unrequited", "stayorgo", "lies", "toxic", "longdist"]);
/** Nhắc lại lời người dùng theo ngôi của Lomi ("mình" → "bạn"). */
function echo(text: string): string {
  const t = text.trim().replace(/[.!?…:()]+$/g, "").replace(/\s+/g, " ");
  const sw = t.replace(/(^|\s)(mình|mềnh|tui|tôi|tớ|em|anh|a|e)(?=\s|$)/giu, "$1bạn");
  return sw.charAt(0).toLowerCase() + sw.slice(1);
}
export const GENERIC = new Set(["sad", "tired", "love", "overthink", "anxiety", "lonely", "health"]);
const byId = (id: string) => THEMES.find((t) => t.id === id);

// Câu mở lời "muốn tâm sự" (chưa rõ chuyện gì).
const START_RE =
  /\b(tam su|muon tam su|tam su voi|noi chuyen voi minh|nghe minh ke|nghe minh noi|ke lomi nghe|ke cho lomi|an ui minh|an ui toi|an ui em|tu van tinh cam|tu van tam ly|tu van tam li|cho minh loi khuyen|khuyen minh|chia se voi lomi|muon chia se|co ai nghe)\b/;
// Xin lời khuyên trong câu ("làm sao để quên người cũ", "có nên quay lại không").
const ADVICE_RE = /\b(lam sao|lam the nao|lam gi|nen lam gi|co nen|loi khuyen|khuyen|giup minh|cach nao|phai lam sao|lam cach nao|tu van|goi y|chi minh|noi gi di|y kien)\b/;

// Cảm xúc để phản chiếu lại khi người dùng kể tiếp.
const EMOTIONS: [RegExp, string][] = [
  [/\b(tui than)\b/, "tủi thân"],
  [/\b(that vong)\b/, "thất vọng"],
  [/\b(hoi han|hoi tiec|tiec nuoi)\b/, "tiếc nuối"],
  [/\b(ton thuong|dau long|dau lam|dau qua)\b/, "tổn thương"],
  [/\b(bat luc)\b/, "bất lực"],
  [/\b(trong rong|trong trai)\b/, "trống rỗng"],
  [/\b(xau ho|nhuc|mat mat)\b/, "xấu hổ"],
  [/\b(tuc qua|tuc lam|buc qua|buc minh|buc boi|gian qua|gian lam|dang gian|uc che|am uc)\b/, "ấm ức, bực bội"],
  [/\b(so qua|so lam|dang so|thay so|lo qua|lo lam|lo lang)\b/, "lo lắng"],
  [/\b(met|duoi)\b/, "mệt mỏi"],
  [/\b(nho qua|nho lam|nho ho|nho nguoi|nho anh|nho em|dang nho)\b/, "nhớ"],
  [/\b(co don|mot minh)\b/, "cô đơn"],
  [/\b(ghen)\b/, "ghen"],
  [/\b(roi qua|roi tri|hoang mang|khong biet phai)\b/, "rối và hoang mang"],
  [/\b(ap luc)\b/, "áp lực"],
  [/\b(buon|khoc)\b/, "buồn"],
];
const REFLECT = [
  "Nghe bạn kể, Lomi cảm được là bạn đang thấy {e} lắm…",
  "Cảm giác {e} như vậy mà phải giữ một mình thì nặng lòng thật đó.",
  "Ai ở vị trí của bạn chắc cũng sẽ thấy {e} thôi, bạn không làm quá đâu.",
  "Lomi hiểu mà, {e} như vậy khó chịu lắm.",
];
const LISTEN = [
  "Lomi đang nghe nè 🌿 Bạn kể thêm cho Lomi hiểu rõ hơn được không?",
  "Ừm, Lomi nghe rồi. Chuyện này làm bạn bận lòng nhiều không?",
  "Lomi vẫn ở đây nè 💚 Bạn cứ kể tiếp, từ từ thôi.",
  "Lomi hiểu rồi. Giờ điều bạn mong nhất là gì nè?",
];
const OPEN = [
  "Lomi đây, Lomi nghe nè 🌿 Bạn cứ kể từ từ, chuyện gì cũng được — Lomi không phán xét đâu. Đang có chuyện gì làm bạn bận lòng vậy?",
  "Okie, mình tâm sự nha 🤗 Lomi luôn sẵn sàng lắng nghe. Chuyện tình cảm, gia đình, công việc hay chỉ là một ngày tệ — kể Lomi nghe đi.",
  "Lomi ở đây rồi nè 💚 Bạn muốn kể chuyện gì? Chọn một chủ đề bên dưới, hoặc gõ tự nhiên như đang nhắn cho bạn thân cũng được.",
];
const CLOSE = [
  "Nghe vậy Lomi mừng ghê 🥰 Cảm ơn bạn đã tin kể Lomi nghe. Khi nào cần, cứ quay lại tâm sự tiếp nha 💚",
  "Yay, bạn thấy nhẹ lòng hơn là Lomi vui rồi 🌤️ Nhớ thương bản thân nhiều hơn nha. Lomi luôn ở đây.",
  "Hihi, vậy là tốt rồi nè 🤗 Chúc bạn một ngày dịu dàng hơn. Cần thì gọi Lomi nha!",
];

export const HEART_CHIPS = ["💔 Chuyện tình cảm", "👨‍👩‍👧 Chuyện gia đình", "💼 Áp lực công việc", "📚 Chuyện học hành", "🥺 Thấy cô đơn", "🌙 Suy nghĩ nhiều, mất ngủ"];
const CHIP_THEME: Record<string, string> = {
  "💔 Chuyện tình cảm": "love",
  "👨‍👩‍👧 Chuyện gia đình": "family",
  "💼 Áp lực công việc": "work",
  "📚 Chuyện học hành": "study",
  "🥺 Thấy cô đơn": "lonely",
  "🌙 Suy nghĩ nhiều, mất ngủ": "overthink",
};
export const HEART_ADVICE = "💬 Cho mình lời khuyên";
const LISTEN_ONLY = "🫶 Mình chỉ muốn được nghe";
const BETTER = "😊 Mình ổn hơn rồi";

// 30/09 r2 (theo ý Kir): khi đang tâm sự thì KHÔNG hiện nút gợi ý — để trò chuyện tự nhiên như nhắn tin.
function chipsFor(_t: Theme | undefined): string[] {
  return [];
}
// Mất người thân luôn ưu tiên trước (vd "chồng mình mất rồi" không phải chuyện vợ chồng lục đục).
const FIRST = ["grief"];
function themeOf(n: string): Theme | undefined {
  const m = ` ${n} `;
  return THEMES.find((t) => FIRST.includes(t.id) && t.re.test(m)) ?? THEMES.find((t) => t.re.test(m));
}
function emotionOf(n: string): string | undefined {
  return EMOTIONS.find(([re]) => re.test(` ${n} `))?.[1];
}

/** Mở màn tâm sự (nút "Tâm sự cùng Lomi"). */
export function heartOpen(): HeartReply {
  return { text: pick("open", OPEN), quick: [], theme: "open" };
}

const advGiven = new Map<string, number>(); // số lần đã đưa lời khuyên theo chủ đề (trong phiên)
function themeReply(t: Theme, n: string, adviceAsked: boolean): HeartReply {
  const parts: string[] = [];
  const defined = !!t.define && /\b(la gi|nghia la|la sao|hieu .* khong)\b/.test(` ${n} `);
  if (defined) parts.push(t.define!);
  // Đã khuyên hết ý của chủ đề này rồi mà người dùng hỏi tiếp → đổi sang góc nhìn + bước làm khác, không lặp lời khuyên.
  const given = advGiven.get(t.id) ?? 0;
  if (adviceAsked && given * 2 >= t.advice.length) {
    advGiven.set(t.id, 0);
    parts.push(pick(`${t.id}:ins`, t.insight));
    parts.push(`Thêm vài bước nhỏ bạn thử nha:\n• ${pick(`${t.id}:step`, t.step)}\n• ${pick(`${t.id}:step`, t.step)}`);
    parts.push(pick(`${t.id}:ask`, t.ask));
    return { text: parts.join("\n\n"), quick: chipsFor(t), theme: t.id };
  }
  if (adviceAsked) {
    advGiven.set(t.id, given + 1);
    parts.push(pick(`${t.id}:feel`, t.feel));
    parts.push(`Lomi gợi ý vài điều nha:\n• ${pick(`${t.id}:adv`, t.advice)}\n• ${pick(`${t.id}:adv`, t.advice)}\n• ${pick(`${t.id}:step`, t.step)}`);
  } else {
    const hint = t.hint?.find(([re]) => re.test(` ${n} `))?.[1];
    // Câu kể trúng chi tiết có lời đáp riêng → đáp thẳng ý đó (không mở đầu chung chung dễ lệch ý).
    if (!defined && !hint) parts.push(pick(`${t.id}:feel`, t.feel));
    parts.push(hint ?? pick(`${t.id}:ins`, t.insight));
    if (t.stepFirst) parts.push(pick(`${t.id}:step`, t.step));
    parts.push(pick(`${t.id}:ask`, t.ask));
  }
  if (t.heavy && adviceAsked) parts.push(PRO);
  return { text: parts.join("\n\n"), quick: chipsFor(t), theme: t.id };
}

const storyOf = (text: string): string | undefined => {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.split(" ").length < 5) return undefined; // câu quá ngắn ("buồn quá") thì không trích lại
  return t.length > 90 ? t.slice(0, 88).trim() + "…" : t;
};
const capF = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
function eventReply(ev: Ev, n: string, text: string): HeartReply {
  const act = activityOf(n);
  const line = pick(`ev:${ev.id}:r`, ev.react)
    .replace("{act}", act ? `đang ${act} ` : "")
    .replace("{Act}", act ? capF(`đang ${act} `) : "Ra ngoài ");
  // Tóm tắt chuyện bằng lời của Lomi ("đi ăn mà bị mắc mưa") thay vì trích nguyên câu người dùng gõ.
  return { text: line, quick: [], theme: `ev:${ev.id}`, story: act && !ev.good ? `${act} mà ${ev.label}` : ev.label };
}

/**
 * Người dùng bắt đầu tâm sự (chưa ở chế độ tâm sự). Trả null nếu không phải chuyện tâm sự.
 * Không bắt câu hỏi về cách dùng app (để FAQ trả lời).
 */
export function heartStart(text: string, appQuestion: boolean): HeartReply | null {
  const n = normStrict(text, HEART);
  if (!n || appQuestion) return null;
  const chip = CHIP_THEME[text.trim()];
  if (chip) return themeReply(byId(chip)!, n, false);
  const t = themeOf(n);
  const start = START_RE.test(` ${n} `);
  if (t) return { ...themeReply(t, n, ADVICE_RE.test(` ${n} `)), story: storyOf(text) };
  // Chuyện đời thường có diễn biến (mắc mưa, kẹt xe, có tin vui…) — lib/lomiTalk.
  const ev = eventOf(n);
  if (ev) return eventReply(ev, n, text);
  if (start) return heartOpen();
  return null;
}

/**
 * Đang trong cuộc tâm sự → hiểu tin kế tiếp theo ngữ cảnh.
 * prev = chủ đề đang nói; listen = người dùng chỉ muốn được nghe (không khuyên); depth = số lượt đã tâm sự.
 */
export function heartContinue(text: string, prev: string, listen: boolean, depth: number, lastText = "", story = ""): HeartReply {
  const n = normStrict(text, HEART);
  const cur = byId(prev);
  const chip = CHIP_THEME[text.trim()];
  if (chip) return themeReply(byId(chip)!, n, false);
  if (text.trim() === BETTER || /\b(on hon roi|do hon roi|nhe long hon|nhe nhom hon|on roi|khong sao roi|cam on lomi|cam on nhieu|cam on nha|cam on)\b/.test(` ${n} `))
    return {
      text: prev.startsWith("ev:") && eventById(prev.slice(3))?.good
        ? pick("closeG", ["Không có gì nè 🥰 Chúc mừng bạn lần nữa nha, cứ tiếp tục toả sáng! 🎉", "Hihi, Lomi vui lây luôn á 🎊 Có tin vui gì nữa nhớ kể Lomi nghe nha!"])
        : pick("close", CLOSE),
      quick: [],
      theme: prev,
      end: true,
    };
  if (text.trim() === LISTEN_ONLY || /\b(chi muon duoc nghe|chi can nghe|dung khuyen|khong can khuyen|nghe thoi)\b/.test(` ${n} `))
    return {
      text: pick("lonly", [
        "Okie, Lomi chỉ nghe thôi, không phán xét, không khuyên gì hết 🫶 Bạn cứ kể nha.",
        "Được luôn, Lomi ngồi đây nghe bạn nè 🌿 Muốn nói gì cứ nói.",
      ]),
      quick: [],
      theme: prev,
      listen: true,
    };
  // Người dùng than Lomi máy móc / "là sao?" → nhận lỗi, nhắc lại mình đang hiểu chuyện gì, hỏi bạn cần gì.
  if (META_RE.test(` ${n} `))
    return {
      text: story
        ? pick("meta", [
            `Lomi xin lỗi nha, nãy giờ Lomi trả lời hơi máy móc thiệt 😅 Lomi đang hiểu là bạn kể: “${story}”. Bạn muốn Lomi góp ý cách xử lý, an ủi bạn, hay chỉ cần có người nghe thôi?`,
            `Hic, Lomi lặp lại hoài thiệt, xin lỗi bạn 🙏 Mình quay lại chuyện “${story}” nha — giờ bạn đang thấy sao, và bạn cần Lomi giúp gì nhất?`,
          ])
        : "Lomi xin lỗi nha, Lomi chưa theo kịp ý bạn 😅 Bạn nói lại giúp Lomi theo cách khác được không? Lần này Lomi nghe kỹ hơn.",
      quick: [],
      theme: prev,
      listen,
    };
  const adviceAsked = text.trim() === HEART_ADVICE || ADVICE_RE.test(` ${n} `);
  let t = themeOf(n);
  const words = n.split(" ").length;
  // Chi tiết ngắn kể thêm cho chuyện đang nói ("bạn ấy là đồng nghiệp", "cả với bạn bè của mình") → KHÔNG đổi chủ đề.
  const detailOnly = !!(t && cur && t.id !== cur.id && !GENERIC.has(cur.id) && NOUNISH.has(t.id) && words <= 9 && !emotionOf(n) && !adviceAsked);
  if (detailOnly) t = undefined;
  // Chuyện đời thường đang kể (vd mắc mưa) → hiểu câu kể tiếp theo đúng chuyện đó.
  const evCur = prev.startsWith("ev:") ? eventById(prev.slice(3)) : undefined;
  const evNew = eventOf(n);
  if (evNew && evNew !== evCur && (!t || GENERIC.has(t.id))) return eventReply(evNew, n, text);
  if (evCur && (!t || GENERIC.has(t.id))) {
    const f = evCur.follow.find(([re]) => re.test(` ${n} `));
    // Nói lại đúng chuyện đang kể (vd đang "chán" rồi nói "không có gì làm") → gợi ý luôn thay vì hỏi lại.
    if (!f && evNew === evCur)
      return {
        text: `${evCur.good ? "Gợi ý nhỏ của Lomi nè" : "Vậy Lomi gợi ý vài thứ nha"}:\n• ${pick(`ev:${evCur.id}:a`, evCur.advice)}\n• ${pick(`ev:${evCur.id}:a`, evCur.advice)}\n• ${pick(`ev:${evCur.id}:a`, evCur.advice)}\n\nBạn thấy cái nào hợp không?`,
        quick: [],
        theme: prev,
      };
    if (f) return { text: pick(`ev:${evCur.id}:f${evCur.follow.indexOf(f)}`, f[1]), quick: [], theme: prev };
    if (adviceAsked || DUNNO_RE.test(` ${n} `))
      return {
        text: `${evCur.good ? "Gợi ý nhỏ của Lomi nè" : "Lomi gợi ý vài điều nha"}:\n• ${pick(`ev:${evCur.id}:a`, evCur.advice)}\n• ${pick(`ev:${evCur.id}:a`, evCur.advice)}\n\nCòn chuyện gì khác làm bạn bận lòng không, kể Lomi nghe tiếp nha.`,
        quick: [],
        theme: prev,
      };
  }
  // Trả lời ngắn "có / không" → hiểu theo ĐÚNG câu hỏi Lomi vừa hỏi (câu cuối trong tin trước).
  const asked = /\?\s*$/.test(lastText.trim());
  const lastQ = lastText.trim().split(/(?<=[.!…])\s+|\n+/).pop() ?? "";
  if (asked && evCur && !t) {
    const map = YES_RE.test(n) ? evCur.yes : NO_RE.test(n) ? evCur.no : undefined;
    const hit = map?.find(([re]) => re.test(lastQ));
    if (hit) return { text: pick(`ev:${evCur.id}:yn${map!.indexOf(hit)}${YES_RE.test(n) ? "y" : "n"}`, hit[1]), quick: [], theme: prev };
  }
  // Câu hỏi có/không ("…không?", "…chưa?", "…hay…?") khác câu hỏi mở ("vì chuyện gì?").
  const ynQ = /(không|chưa|hả|nhỉ|đúng không|phải không)\s*\?\s*$|\bhay\b/i.test(lastQ);
  if (asked && !ynQ && NO_RE.test(n) && !t)
    return {
      text: pick("noOpen", [
        "Ừm, không sao, bạn chưa muốn nói cũng được nha 🌿 Khi nào sẵn sàng thì kể Lomi nghe, Lomi vẫn ở đây.",
        "Okie, mình không cần nói chi tiết đâu 😊 Giờ bạn đang thấy trong lòng thế nào?",
      ]),
      quick: [],
      theme: prev,
      listen,
    };
  if (asked && YES_RE.test(n) && !t) {
    const heavyQ = /(bận lòng|buồn|khó chịu|nặng lòng|lo lắng|mệt|tệ)/.test(lastQ);
    return {
      text: heavyQ
        ? pick("yesH", [
            `Ừa, Lomi hiểu rồi 🥺 ${story ? `Chuyện “${story}” ` : "Chuyện này "}làm bạn khó chịu thật đó. Điều gì trong chuyện đó làm bạn thấy tệ nhất?`,
            "Vậy là nó ảnh hưởng tới bạn nhiều thật 😔 Bạn muốn Lomi an ủi, góp ý cách xử lý, hay chỉ cần có người nghe thôi?",
          ])
        : pick("yes", ["À, vậy hả 😮 Rồi sao nữa, kể Lomi nghe tiếp đi!", "Ừm, Lomi hiểu rồi. Kể thêm chút cho Lomi nghe nha, lúc đó bạn thấy sao?"]),
      quick: [],
      theme: prev,
      listen,
    };
  }
  if (asked && ynQ && NO_RE.test(n) && !t && prev === "health")
    return {
      text: pick("noH", [
        "Vậy là chưa có dấu hiệu nặng, cũng đỡ ha 😊 Cứ làm theo mấy gợi ý ở trên và theo dõi thêm; thấy nặng lên hay có triệu chứng mới thì kể Lomi hoặc đi khám liền nha.",
        "Okie, không có thì tốt rồi 🌿 Nghỉ ngơi, uống đủ nước, theo dõi thêm vài hôm nha. Có gì thay đổi cứ nhắn Lomi.",
      ]),
      quick: [],
      theme: prev,
      listen,
    };
  if (asked && ynQ && NO_RE.test(n) && !t)
    return {
      text: pick("no", [
        "Vậy cũng đỡ ha 😊 Có gì cứ kể Lomi nghe nha, chuyện vui chuyện buồn gì cũng được.",
        "Okie, không sao nè 🌿 Nếu muốn, bạn kể Lomi nghe thêm về ngày hôm nay của bạn đi.",
      ]),
      quick: [],
      theme: prev,
      listen,
    };
  // Chủ đề chung chung (buồn, mệt, tình cảm nói chung) không đè lên chuyện cụ thể đang kể (vd chia tay).
  if (t && cur && GENERIC.has(t.id) && !GENERIC.has(cur.id)) t = undefined;
  // Hỏi nghĩa ("YSL là gì?") → giải thích luôn, kể cả khi vẫn đang nói đúng chủ đề đó.
  if (t?.define && /\b(la gi|nghia la|la sao|hieu .* khong)\b/.test(` ${n} `)) return themeReply(t, n, false);
  // Chủ đề mới (vd đang buồn chung chung → kể ra là cãi nhau với người yêu) → trả lời theo chủ đề mới.
  if (t && t.id !== prev && !(listen && !adviceAsked)) return themeReply(t, n, adviceAsked);
  const th = t ?? cur;
  // Câu kể trúng chi tiết mà chủ đề có sẵn lời đáp riêng (vd crush là đồng nghiệp, tính nghỉ việc) → đáp đúng ý đó.
  const hintHit = th?.hint?.find(([re]) => re.test(` ${n} `));
  if (hintHit && !adviceAsked) return { text: `${hintHit[1]}\n\n${pick(`${th!.id}:ask`, th!.ask)}`, quick: [], theme: th!.id, listen };
  if (adviceAsked && th) return themeReply(th, n, true);
  // Kể thời gian ("3 năm rồi đó", "2 tuần nay") → đáp theo đúng chuyện đang nói.
  const dur = n.match(/\b(\d+|mot|hai|ba|bon|nam|may|vai|mo)\s*(ngay|hom|bua|tuan|thang|nam)\b/);
  if (dur && th && !t) {
    const span = `${dur[1] === "mo" ? "mấy" : dur[1]} ${({ ngay: "ngày", hom: "hôm", bua: "bữa", tuan: "tuần", thang: "tháng", nam: "năm" } as Record<string, string>)[dur[2]]}`;
    const love = LOVE_THEMES.has(th.id);
    return {
      text: love
        ? `${span} là cả một chặng đường dài đó 🥺 Gắn bó từng ấy thời gian thì buồn, hụt hẫng là đương nhiên — có biết bao kỷ niệm và thói quen chung mà. ${pick(`${th.id}:ask`, th.ask)}`
        : `${capF(span)} rồi hả — kéo dài vậy chắc bạn mệt lắm 😔 ${pick(`${th.id}:ins`, th.insight)}\n\n${pick(`${th.id}:ask`, th.ask)}`,
      quick: [],
      theme: prev,
      listen,
    };
  }
  // Chi tiết ngắn → nhắc lại cho người dùng thấy Lomi đang nghe đúng chuyện, rồi đi tiếp chuyện đang nói.
  if (detailOnly && th)
    return { text: `À, ${echo(text)} hả 🤔 ${pick(`${th.id}:ins`, th.insight)}\n\n${pick(`${th.id}:ask`, th.ask)}`, quick: [], theme: prev, listen };
  if (adviceAsked || (DUNNO_RE.test(` ${n} `) && !th))
    return {
      text: `${story ? `Về chuyện “${story}”, ` : ""}Lomi gợi ý vài điều nha:\n• ${pick("gadv", byId("sad")!.advice)}\n• Viết ra điều đang làm bạn bận lòng, rồi chia nhỏ xem phần nào mình làm được ngay.\n• Cho mình nghỉ ngơi đủ trước khi quyết định chuyện lớn.`,
      quick: chipsFor(th),
      theme: prev,
    };
  // Hỏi một điều Lomi không biết (không khớp chủ đề nào) → nói thật, không đáp đại cho có.
  if (!t && /\?|\b(la gi|nghia la|hieu .* khong|biet .* khong|co biet)\b/.test(`${text} ${n} `))
    return {
      text: pick("unk", [
        "Câu này Lomi chưa hiểu rõ lắm 😅 Bạn giải thích thêm một chút giúp Lomi được không?",
        "Hmm, Lomi chưa chắc hiểu đúng ý bạn. Bạn nói rõ hơn xíu nha, Lomi nghe nè 🌿",
      ]),
      quick: [],
      theme: prev,
      listen,
    };
  // Kể tiếp → phản chiếu cảm xúc + (nếu không chỉ muốn nghe) một góc nhìn / bước nhỏ + câu hỏi mở.
  const e = emotionOf(n);
  const parts: string[] = [];
  parts.push(e ? pick("reflect", REFLECT).replace("{e}", e) : pick("listen", LISTEN));
  if (!listen && th && !(GENERIC.has(th.id) && !t && !e)) {
    if (depth % 2 === 1) parts.push(pick(`${th.id}:ins`, th.insight));
    else parts.push(pick(`${th.id}:step`, th.step));
    if (e) parts.push(pick(`${th.id}:ask`, th.ask));
  } else if (e) parts.push(pick("listen", LISTEN));
  if (th?.heavy && depth >= 3 && depth % 3 === 0) parts.push(PRO);
  return { text: parts.join("\n\n"), quick: chipsFor(th), theme: prev, listen };
}

/** Chủ đề tâm sự khớp với câu (để biết câu này là chuyện cụ thể hay chỉ là cảm xúc chung). */
export function heartThemeOf(text: string): string | undefined {
  return themeOf(normStrict(text, HEART))?.id;
}
