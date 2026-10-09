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

/**
 * 10/10 — điều lớp hội thoại biết về lượt này, để câu đáp BÁM NỘI DUNG vừa nghe thay vì xoay vòng mấy câu "kể thêm đi".
 * (Trước đây phần "kể tiếp" chỉ bốc ngẫu nhiên 4 câu: “Lomi đang nghe nè…”, “Chuyện này làm bạn bận lòng nhiều không?”,
 *  “Bạn cứ kể tiếp…”, “Giờ điều bạn mong nhất là gì?” — câu nào cũng tử tế nhưng không câu nào nói tới điều người dùng vừa kể.)
 */
export type HeartCtx = {
  /** Mẩu nhắc lại câu vừa nghe, đã đổi ngôi ("vợ anh không nói chuyện với anh") — lib/lomiParse.mirrorOf. */
  mirror?: string | null;
  /** Điều vừa kể nghiêng về xấu (-1), tốt (1) hay chưa rõ (0) — theo khung câu. */
  val?: number;
  /** Vài tin gần nhất của Lomi (mới nhất trước) — không dùng lại câu / câu hỏi đã nói. */
  recent?: string[];
  /** Các mẩu người dùng đã kể trong mạch này, gồm cả mẩu vừa rồi — để tóm lại cho thấy Lomi theo kịp. */
  details?: string[];
  /** Câu nói về một NGƯỜI KHÁC (con, mẹ, bạn…) → không đọc chữ "thi", "học", "gia đình" thành chuyện của chính người dùng. */
  third?: boolean;
  /** Người đang được nhắc trong chuyện tình cảm ("người ấy", "anh ấy"). */
  person?: string;
  /** Câu vừa nghe là một mệnh đề (có vị ngữ / phủ định / mức độ), không chỉ gọi tên một chủ đề — lib/lomiFrame.isClause. */
  clause?: boolean;
  /** Chủ ngữ của câu vừa nghe là chính người dùng ("a xin lỗi rồi"). */
  self?: boolean;
  /** Câu vừa nghe là câu HỎI / có phủ định ("sếp không nói gì") — theo khung câu. */
  ask?: boolean;
  neg?: boolean;
  /** Đổi một câu mẫu sang cách xưng hô đang dùng (lịch sử lưu câu ĐÃ đổi "bạn" → "anh"…) — để so "đã nói câu này chưa". */
  say?: (x: string) => string;
};

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
  hint?: [RegExp, string][];
  /** Như hint, nhưng CHỈ dùng khi người dùng xin lời khuyên (câu kể thì vẫn hỏi han trước, chưa khuyên vội). */
  adviceHint?: [RegExp, string][]; // câu nói trúng chi tiết người dùng kể (vd nhắc tên thuốc) → dùng thay góc nhìn ngẫu nhiên
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
      "Lo cho sức khoẻ đã đủ mệt rồi, đừng để mình phải lo một mình — có người cùng nghe lời bác sĩ dặn thì nhẹ hơn nhiều.",
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
    // 12/10: "a mới đi khám về" — đã đi khám rồi thì hỏi bác sĩ nói sao, không nhắc "nên đi khám sớm" hay hỏi "đã đi khám chưa".
    hint: [
      [/ (bac si|bs) (noi|bao|keu) (\S+ ){0,3}(khong sao|binh thuong|on|khong co gi|tot|khong van de gi) /, "Bác sĩ nói không sao thì mừng rồi 💚 Nghe vậy bạn thấy nhẹ người hơn chưa?"],
      [/ (moi (di )?kham|vua (di )?kham|di kham (ve|roi)|kham (xong|ve)|tai kham (ve|roi|xong)) /, "Đi khám về rồi hả. Bác sĩ nói sao bạn — có điều gì làm bạn lo không?"],
    ],
  },
  {
    id: "cheat",
    re: /\b(ngoai tinh|cam sung|bi cam sung|phan boi|lua doi|bi lua|co nguoi khac|co ban gai khac|co ban trai khac|di voi nguoi khac|bat cha|bat gap .* nhan tin|tuesday|nguoi thu ba)\b/,
    feel: [
      "Bị người mình tin tưởng lừa dối là một trong những nỗi đau khó chịu nhất.",
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
    re: /\b(chia tay|that tinh|bi da|bi bo|bi (chong|vo|nguoi yeu|ban trai|ban gai|bo|crush) (bo|da)|(chong|vo|ban trai|ban gai) bo (di|minh|em|toi|chi|anh|me con|theo)|nguoi yeu bo|nguoi yeu (minh|toi|em|anh|a|e|tui) bo|bo (minh|toi|em|anh|a|e|tui) (roi|di)|bo roi|bo minh|khong con yeu|het yeu|tan vo|ket thuc roi|dut tinh)\b/,
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
    hint: [[/\b(co nen nhan|nen nhan|nhan truoc|co nen goi|lien lac lai khong)\b/, "Nhắn cho người cũ hay không thì tuỳ điều bạn mong sau tin nhắn đó. Nếu chỉ là nhớ quá muốn hỏi thăm, cứ để qua một đêm rồi xem còn muốn nhắn không. Nếu mong quay lại, tự hỏi trước: lý do chia tay ngày đó đã khác chưa? Còn nếu người ấy đã có cuộc sống mới thì giữ khoảng cách thường nhẹ lòng hơn cho cả hai."], [/\b(nhan lai|nhan tin|nhan cho|tra loi|rep|goi lai|lien lac lai)\b/, "Người cũ nhắn lại thì không cần trả lời ngay đâu. Chờ một ngày cho đầu óc tỉnh táo, rồi tự hỏi: mình trả lời vì còn điều muốn nói, hay chỉ vì thói quen và nỗi nhớ? Trả lời hay không đều được — miễn là bạn chọn, chứ không phải bị kéo theo."]],
    re: /\b(nguoi yeu cu|nguoi cu|ny cu|tinh cu|ban trai cu|ban gai cu|vo cu|chong cu|nho nguoi yeu cu|nho nguoi cu|nho ex|quen nguoi yeu cu|quen nguoi cu|quen ex|quen di nguoi|quen mot nguoi|khong quen duoc|nguoi yeu cu nhan tin|nguoi yeu cu quay lai|quay lai voi nguoi yeu cu|quay lai voi nguoi cu)\b/,
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
    hint: [[/\b(co nguoi yeu roi|co ban gai roi|co ban trai roi|co vo roi|co chong roi|co gia dinh roi|co bo roi)\b/, "Người ấy đã có người yêu thì khó cho mình thật 😔 Thích một người không có gì sai, nhưng chen vào giữa hai người thường làm cả ba cùng tổn thương — mà chính mình cũng mệt. Cho mình buồn một thời gian, giữ khoảng cách vừa đủ, rồi để lòng mở ra với người có thể đáp lại trọn vẹn."], [/\b(co nguoi yeu roi|co ban gai roi|co ban trai roi|co vo roi|co chong roi|co gia dinh roi|co bo roi)\b/, "Khi người ấy đã có người yêu, điều mình làm chủ được là khoảng cách của chính mình: bớt nhắn riêng, bớt tìm cớ gặp, và cho mình thời gian để nguôi. Nếu làm chung chỗ thì giữ mọi thứ ở mức đồng nghiệp bình thường. Không còn nuôi hy vọng mỗi ngày thì lòng sẽ dịu dần — buồn một thời gian cũng không sao."], [/\b(bat chuyen|mo loi|lam quen|nen nhan gi|nen noi gi)\b/, "Bắt chuyện dễ nhất là từ thứ hai người đang có chung: lớp học, công việc, một chuyện vừa xảy ra. Hỏi một câu cụ thể, dễ trả lời (“bài hôm nay làm tới đâu rồi?”) thì tự nhiên hơn là “đang làm gì đó?”. Nói vài câu rồi thôi cũng được — gặp thường, mỗi lần một chút là thân dần."], [/\b(dong nghiep|cung cong ty|cung cho lam)\b/, "Thích đồng nghiệp thì hơi “nhạy cảm” một chút ha 😄 Cứ từ từ làm bạn trước, giữ chuyên nghiệp ở chỗ làm; nếu tỏ tình thì chọn lúc riêng tư ngoài giờ, và chuẩn bị tinh thần cư xử tự nhiên dù kết quả thế nào nha."], [/\b(cung lop|ban hoc|cung truong)\b/, "Thích bạn cùng lớp thì có lợi thế là gặp nhau hằng ngày nè 😄 Rủ học nhóm, hỏi bài, đi ăn sau giờ học — gần gũi tự nhiên trước rồi hẵng tính chuyện tỏ tình nha."]],
    re: /\b(crush|thich mot nguoi|thich 1 nguoi|thich mot ban|thich 1 ban|thich (co|anh|chi|ban|dua|thang|nho|nguoi) (ay|do|kia|nay|dong nghiep|hang xom|cung \S+|hoc chung|lam chung|\S+ cung \S+)|dang thich|tham thuong|cam nang|co nen to tinh|to tinh|lam quen voi|muon lam quen|bat chuyen|nhan tin lam quen|ho co thich minh)\b/,
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
    hint: [[/\b(xin loi|lam lanh|het gian|nguoi gian|bot gian|lam hoa)\b/, "Muốn xin lỗi, làm lành là bước khó nhất rồi đó 💚 Một lời xin lỗi dễ được nhận thường có ba ý: nói rõ mình sai ở đâu, không kèm chữ “nhưng…”, và nói mình sẽ làm khác đi thế nào. Ví dụ: “Hôm đó mình nặng lời, mình xin lỗi. Mình không muốn tụi mình giận nhau vì chuyện này.” Chọn lúc cả hai đã nguôi rồi hẵng nói, và nghe người kia nói hết trước khi giải thích."], [/\b(noi sao|noi the nao|nen noi gi|mo loi|het gian|bot gian|lam lanh)\b/, "Mở lời sau khi cãi nhau thì ngắn và thật là đủ, ví dụ: “Mình không muốn giận nhau nữa, tụi mình nói chuyện được không?” Nói cảm giác của mình (“mình buồn vì…”) thay cho lời trách (“lúc nào cũng…”), rồi hỏi lại: “còn điều gì chưa vui thì nói mình nghe.” Người đang giận thường cần thấy mình được nghe trước, rồi mới nghe được lời giải thích."]],
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
    re: /\b(tu ti|that bai|vo dung|ganh nang|khong ai can (minh|toi|tui|em|anh|chi|a|e|c)\b|an bam|kem coi|khong bang ai|so sanh voi|thua kem|ghet ban ?than|chan ban ?than|khong lam duoc gi|khong co gia tri|minh te qua|minh do qua|khong ai thuong|xau xi|beo qua|khong du tot)\b/,
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
    hint: [[/\b(thuoc ngu|thuoc an than)\b/, "Thuốc ngủ thì đừng tự mua uống nha — đó là loại thuốc cần bác sĩ khám rồi mới kê; tự dùng dễ bị lệ thuộc và che mất nguyên nhân thật của chuyện mất ngủ. Mất ngủ kéo dài thì đi khám để tìm nguyên nhân là chắc nhất, Lomi không kê thuốc được."]],
    re: /\b(mat ngu|khong ngu duoc|kho ngu|thuc trang|ngu khong ngon|tinh giac giua dem|thuc khuya hoai|trang dem|thuoc ngu)\b/,
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
    // 12/10: lo trước một BUỔI QUAN TRỌNG (phỏng vấn, thi, thuyết trình) mà hỏi cách bớt run → gợi ý cho đúng chuyện đó, không đọc bài lo âu chung.
    adviceHint: [
      [
        / (phong van|thuyet trinh|mai thi|sap thi|ky thi|buoi thi|len san khau|phat bieu) /,
        "Hồi hộp trước một buổi quan trọng là chuyện rất bình thường — nó cho thấy bạn coi trọng việc này.\n• Chuẩn bị trước vài ý chính và tập nói thành tiếng một hai lần; có sẵn câu mở đầu là đỡ run nhiều.\n• Ngay trước khi vào: thở chậm vài nhịp, thả lỏng vai, uống một ngụm nước.\n• Tới sớm một chút để quen chỗ, khỏi cuống.\n• Lỡ vấp thì dừng một nhịp rồi nói tiếp — người nghe ít để ý hơn mình tưởng.",
      ],
    ],
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
    re: /\b(buon(?! ban| cuoi| ngu| non)|buon qua|buon ghe|dang buon|thay buon|buon hiu|chan doi|tui than|muon khoc|dang khoc|khoc qua|tam trang te|tam trang khong tot|down|bi down|nang long|trong rong|that vong|khong vui)\b/,
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
const ADVICE_RE = /\b(lam sao|lam the nao|lam gi|nen lam gi|co nen|loi khuyen|khuyen|giup minh|cach nao|phai lam sao|lam cach nao|tu van|goi y|chi minh|noi gi di|y kien|noi sao|noi the nao|nen noi gi|sao cho|xin loi sao|xin loi the nao|lam lanh sao)\b/;
// "làm gì CŨNG hỏng", "nói sao cũng không nghe" — từ hỏi + "cũng" là "việc gì cũng", không phải câu xin lời khuyên.
const UNIV_RE = /\b(lam gi|lam sao|noi gi|noi sao|cach nao|the nao) (\S+ )?cung\b/;
const asksAdvice = (n: string) => ADVICE_RE.test(` ${n} `) && !UNIV_RE.test(` ${n} `);
// 11/10 — người dùng nói rõ CHỈ MUỐN ĐƯỢC NGHE ("a chỉ muốn than thôi, chưa cần lời khuyên") — nhận cả khi chưa vào mạch tâm sự.
const LISTEN_RE = /\b(chi muon duoc nghe|chi can nghe|dung khuyen|khong can khuyen|nghe thoi|chi muon than|muon than tho|than mot chut|than ti thoi|chua can loi khuyen|khong can loi khuyen|chua can khuyen|khong can tu van|chi can (co )?nguoi nghe|chi muon ke|chi muon noi ra|muon xa stress|trut bau tam su)\b/;
// 11/10 — tự hỏi mình có MẮC một vấn đề tâm lý không ("không biết có phải a bị trầm cảm không?") — Lomi không chẩn đoán, và cũng không
// đáp bằng bài "trầm cảm" như thể đã chắc là vậy.
const DX_WORD: [RegExp, string][] = [
  [/\b(tram cam)\b/, "trầm cảm"],
  [/\b(roi loan lo au|lo au)\b/, "rối loạn lo âu"],
  [/\b(tu ky)\b/, "tự kỷ"],
  [/\b(tang dong|adhd)\b/, "tăng động giảm chú ý"],
  [/\b(ocd|am anh cuong che)\b/, "ám ảnh cưỡng chế"],
  [/\b(luong cuc)\b/, "rối loạn lưỡng cực"],
  [/\b(roi loan|benh tam ly|van de tam ly|van de ve tam ly|tam than|suy nhuoc than kinh|co van de ve dau oc)\b/, "một vấn đề tâm lý"],
];
const DX_MARK = "Lomi không chẩn đoán được";
const DX_SRC = DX_WORD.map(([re]) => re.source.replace(/\\b/g, "")).join("|");
// Dáng câu TỰ HỎI: "có phải / liệu / không biết có … <tên>", hoặc "(bị / là) <tên> không / hả / nhỉ".
const DX_ASK_A = new RegExp(`\\b(co phai|phai chang|lieu|khong biet co|co khi nao|hay la|chac la|so la|nghi la)\\b.{0,30}(?:${DX_SRC})\\b`);
//   ("c có bị trầm cảm SAU SINH không" — vài chữ nói rõ thêm sau tên vẫn là câu tự hỏi đó.)
const DX_ASK_B = new RegExp(`\\b(bi|mac|la|co)\\s+(?:benh\\s+)?(?:${DX_SRC})(?:\\s+\\S+){0,3}?\\s+(?:roi\\s+)?(khong|ko|k|ha|nhi|chua|phai khong|dung khong|chang|u)\\b`);
/** Câu tự hỏi mình có mắc một vấn đề tâm lý không (để lớp khác không đáp thay bằng bài phân tích cảm giác). */
export function selfDxAsk(text: string): boolean {
  return !!selfDx(text, normStrict(text, HEART), {});
}
function selfDx(_text: string, n: string, ctx: HeartCtx): string | undefined {
  if (ctx.third) return undefined;
  const m = ` ${n} `;
  const label = DX_WORD.find(([re]) => re.test(m))?.[1];
  if (!label || /\b(la gi|la sao|nghia la|la nhu the nao|trieu chung|dau hieu|chua duoc|co chua|chua khoi)\b/.test(m)) return undefined;
  return DX_ASK_A.test(m) || DX_ASK_B.test(m) ? label : undefined;
}
function selfDxReply(label: string, prev: string | undefined, listen: boolean, ctx: HeartCtx): HeartReply {
  const det = (ctx.details ?? []).filter((d) => !!d && d !== ctx.mirror && !DX_WORD.some(([re]) => re.test(` ${normalizeVi(d)} `))).slice(-3);
  return {
    theme: prev && prev !== "open" && !prev.startsWith("ev:") ? prev : "sad",
    quick: [],
    listen,
    text: [
      `${DX_MARK} đâu bạn — chỉ qua vài câu kể thì chưa ai kết luận được là ${label} hay không, bác sĩ cũng phải hỏi kỹ hơn nhiều mới nói được.`,
      det.length ? `Nhưng những điều bạn kể — ${det.join(", ")} — là có thật và đáng được quan tâm, dù nó mang tên gì.` : "Nhưng cảm giác bạn đang có là thật và đáng được quan tâm, dù nó mang tên gì.",
      "Người ta thường nên đi gặp bác sĩ tâm lý hoặc chuyên khoa tâm thần khi những cảm giác này kéo dài từ khoảng hai tuần, gần như ngày nào cũng có, và bắt đầu ảnh hưởng tới ăn ngủ, công việc, sinh hoạt.",
      "Bạn thấy như vậy bao lâu rồi?",
    ].join("\n\n"),
  };
}
// Chỉ nói mình đang BÍ, chưa kể chuyện gì ("a không biết phải làm sao") → hỏi chuyện, không đáp bài "suy nghĩ nhiều".
const HELPLESS_ONLY = /^((a|anh|e|em|c|chi|minh|toi|tui|to) )?((gio|bay gio|that su|thiet|dang) )*(khong|ko|k|chang|cha) biet (phai )?(lam sao|lam gi|lam the nao|tinh sao|sao)( (nua|gio|day|bay gio|het|ca|luon|roi))*( hoang mang)?$/;
// Mệt tới mức muốn buông hết — chưa phải lời nói muốn tự hại (lib/lomiChat.crisisReply lo), nhưng không đáp như chuyện phiếm.
const HOPELESS_RE = /\b(buong xuoi|muon buong het|muon bo het|bo cuoc het|khong thiet gi nua|chang thiet gi nua|khong con thiet|khong muon co gang nua|het muon co gang|chiu het noi|khong chiu noi nua|khong gong noi nua|kiet que roi|song cung nhu khong|ton tai cho co)\b/;
const evOfPrev = (prev: string) => prev.startsWith("ev:");
function hopelessReply(prev: string | undefined, listen: boolean): HeartReply {
  return {
    theme: prev && prev !== "open" && !prev.startsWith("ev:") ? prev : "tired",
    quick: [],
    listen,
    text: "Nghe bạn nói vậy Lomi thương, mà cũng lo nữa 🥺 Gồng lâu quá thì ai cũng tới lúc muốn buông hết.\n\n“Buông xuôi” với bạn là muốn được nghỉ, bỏ bớt gánh nặng một thời gian — hay có lúc bạn nghĩ tới chuyện không muốn sống nữa? Bạn nói thật với Lomi được mà, Lomi không phán xét đâu.",
  };
}
const HOW_DUNNO = /\b(khong biet|k biet|hk bit|chang biet|cha biet|khong ro) (\S+ ){0,3}(lam|noi|tinh|xu ly|giai quyet|bat dau|mo loi|tra loi|nhan|doi mat) (sao|gi|the nao|nhu the nao|kieu gi|lam sao)\b|\b(khong biet|k biet|chang biet) (phai )?(sao|lam sao|the nao|lam gi|lam the nao|tinh sao)\b|\b(chiu|bo tay|het cach|biet daux?|sao biet)\b/;
// "chẳng muốn nói với ai", "không muốn gặp ai" — đang thu mình lại.
const WITHDRAW_RE = /\b(khong|ko|chang|cha|chua) (muon|thiet|buon|dam|con muon) (noi|ke|gap|tam su|noi chuyen|tiep xuc|chia se)( \S+){0,2} (voi )?ai\b/;
const SPAN_RE = /\b(\d+|mot|hai|ba|bon|nam|may|vai|nhieu|ca|nua)\s*(ngay|hom|bua|tuan|thang|nam)\b/;
const UNIT: Record<string, string> = { ngay: "ngày", hom: "hôm", bua: "bữa", tuan: "tuần", thang: "tháng", nam: "năm" };
const NUMW: Record<string, string> = { mot: "một", hai: "hai", ba: "ba", bon: "bốn", nam: "năm", may: "mấy", vai: "vài", nhieu: "nhiều", ca: "cả", nua: "nửa", mo: "mấy" };
const spanOf = (m: RegExpMatchArray) => `${NUMW[m[1]] ?? m[1]} ${UNIT[m[2]]}`;
/** Khoảng thời gian đủ dài để nên đi khám (từ hai tuần trở lên). */
const longSpan = (m: RegExpMatchArray) => m[2] === "thang" || m[2] === "nam" || (m[2] === "tuan" && !/^(1|mot|nua)$/.test(m[1]));

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
// Mấy câu "đang nghe" chung chung. 10/10: KHÔNG còn là câu đáp mặc định — chỉ dùng khi Lomi không nhắc lại được điều vừa nghe
// (câu quá dài / không đọc được), và không bao giờ dùng hai lượt liền nhau (xem follow()).
const LISTEN = [
  "Lomi đang nghe nè 🌿 Bạn kể thêm cho Lomi hiểu rõ hơn được không?",
  "Ừm, Lomi nghe rồi. Chuyện này làm bạn bận lòng nhiều không?",
  "Lomi vẫn ở đây nè 💚 Bạn cứ kể tiếp, từ từ thôi.",
  "Lomi hiểu rồi. Giờ điều bạn mong nhất là gì nè?",
];
// Nhóm cảm xúc của chủ đề đang nói — để lời đáp sau khi nhắc lại đúng tông (mệt / căng thẳng với ai đó / buồn / lo).
type Fam = "tired" | "conflict" | "sad" | "worry" | "mishap";
// Chỉ những chủ đề mà lời đáp theo nhóm luôn hợp nghĩa; chủ đề khác (mất ngủ, công việc, học hành…) thì chỉ nhắc lại, không đoán cảm xúc.
const FAM: Record<string, Fam> = {
  tired: "tired",
  fight: "conflict", boss: "conflict", toxic: "conflict", gossip: "conflict", bullied: "conflict", inlaw: "conflict", parentsban: "conflict", lies: "conflict",
  anxiety: "worry", caregiver: "worry", panic: "worry", suspect: "worry",
  marriage: "conflict", jealous: "conflict",
  sad: "sad", lonely: "sad", grief: "sad", breakup: "sad", ex: "sad", unrequited: "sad", homesick: "sad", cheat: "sad", friends: "sad", family: "sad", selfworth: "sad", depress: "sad",
};
const REACT: Record<Fam, string[]> = {
  tired: ["Nghe thôi đã thấy đuối thay bạn.", "Vậy thì oải thật.", "Cứ vậy hoài thì ai mà không mệt."],
  conflict: ["Vậy thì khó chịu thật.", "Ở trong cảnh đó ai cũng thấy bức bối.", "Nghe là thấy căng rồi."],
  sad: ["Nghe mà thương bạn ghê.", "Vậy thì buồn thật.", "Chuyện đó để trong lòng thì nặng lắm."],
  worry: ["Hèn gì bạn lo.", "Vậy thì thấp thỏm là phải.", "Lo như vậy cũng dễ hiểu."],
  mishap: ["Nghe mà oải thay bạn.", "Xui ghê ha."],
};
// Câu hỏi ĐI TIẾP câu chuyện (hỏi một ý cụ thể), dùng khi câu hỏi mở đầu của chủ đề đã hỏi rồi.
const PROGRESS: Record<Fam | "any", string[]> = {
  tired: ["Có ai phụ bạn một tay không?", "Trong mấy việc đó, việc nào bạn bớt được trước?"],
  conflict: ["Rồi bên kia phản ứng sao?", "Bạn muốn chuyện này đi theo hướng nào?"],
  sad: ["Chuyện này xảy ra lâu chưa bạn?"],
  worry: ["Bạn lo nhất là điều gì trong chuyện này?"],
  mishap: ["Rồi sau đó có sao không bạn?"],
  any: ["Rồi sau đó sao nữa bạn?", "Giờ bạn tính sao?"],
};
// Chuyện tình cảm đang nói về MỘT NGƯỜI cụ thể ({p}) — góc nhìn / câu hỏi bám đúng người đó, không hỏi lại "bạn đang thích ai".
const REL_INSIGHT = [
  "Một tin hỏi thăm ngắn thì không phiền đâu — {p} có trả lời hay không, bạn cũng biết thêm được một chút.",
  "Mình không điều khiển được {p} nghĩ gì, chỉ chọn được cách mình cư xử cho đàng hoàng thôi.",
  "Bạn đặt cho mình một mốc nha: chờ tới đâu thì cần một câu trả lời rõ ràng.",
];
const REL_ASK = ["Điều bạn ngại nhất nếu chủ động với {p} là gì?", "Nếu {p} trả lời, bạn mong nghe điều gì nhất?"];
const LOVEISH = new Set(["love", "cold", "crush", "unrequited", "ex", "situationship", "spark", "longdist"]);
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
// (nghi ngờ bị phản bội cũng xét trước: "a nghi vợ a ngoại tình" là NGHI, chưa phải đã bị phản bội.)
const FIRST = ["grief", "suspect"];
function themeOf(n: string): Theme | undefined {
  const m = ` ${n} `;
  const t = THEMES.find((x) => FIRST.includes(x.id) && x.re.test(m)) ?? THEMES.find((x) => x.re.test(m));
  // "e bị bạn thân phản bội" — bị BẠN BÈ phản bội là chuyện bạn bè, không phải bị người yêu lừa dối.
  if (t?.id === "cheat" && /\b(ban than|ban be|dua ban|con ban|thang ban|nguoi ban|dong nghiep)\b/.test(m) && !/\b(nguoi yeu|chong|vo|ban trai|ban gai|ny)\b/.test(m)) return THEMES.find((x) => x.id === "friends") ?? t;
  return t;
}
function emotionOf(n: string): string | undefined {
  return EMOTIONS.find(([re]) => re.test(` ${n} `))?.[1];
}

/** Mở màn tâm sự (nút "Tâm sự cùng Lomi"). */
export function heartOpen(): HeartReply {
  return { text: pick("open", OPEN), quick: [], theme: "open" };
}

const advGiven = new Map<string, number>(); // số lần đã đưa lời khuyên theo chủ đề (trong phiên)
// 12/10: câu vừa nghe đã nói rõ điều gì thì không hỏi lại điều đó — "2 năm rồi" → không hỏi "lâu chưa?"; nêu rõ người ("ba mẹ thất
// vọng về e") → không hỏi "xảy ra với ai trong nhà vậy?".
const NAMED_WHO = /\b(ba me|bo me|cha me|bo|me|ma|cha|chong|vo|con trai|con gai|ong ba|sep|me chong|me vo|ba chong|bo chong|anh trai|chi gai|em trai|em gai)\b/;
function avoidAskFor(n: string, span: boolean): RegExp | undefined {
  //   ("a mới đi khám về", "bác sĩ nói…" → không hỏi "đã đi khám bác sĩ chưa?")
  const seenDoctor = /\b(di kham (ve|roi)|kham (roi|xong|ve)|moi (di )?kham|vua (di )?kham|bac si (noi|bao|keu|ke|chan doan)|ket qua kham|tai kham|nhap vien|nam vien|mo xong)\b/.test(` ${n} `);
  const parts = [span ? "lâu chưa|bao lâu|từ khi nào|lâu rồi|từ lâu chưa" : "", NAMED_WHO.test(` ${n} `) ? "với ai|ai trong nhà|là ai vậy" : "", seenDoctor ? "đi khám bác sĩ chưa|đi khám chưa" : ""].filter(Boolean);
  return parts.length ? new RegExp(parts.join("|")) : undefined;
}
/** Chọn một câu hỏi của chủ đề: bỏ câu hỏi về điều người dùng vừa nói rõ (avoid) và câu đã hỏi trong cuộc trò chuyện này (said). */
function pickAsk(t: Theme, said: (x: string) => boolean, avoid?: RegExp): string | undefined {
  const kept = avoid ? t.ask.filter((x) => !avoid.test(x)) : t.ask;
  const fresh = kept.filter((x) => !said(x));
  const asks = fresh.length ? fresh : kept;
  return asks.length ? pick(`${t.id}:ask${asks.length !== t.ask.length ? `:${asks.length}` : ""}`, asks) : undefined;
}
/** lead = câu mở thay cho lời đồng cảm chung của chủ đề (vd nhắc lại đúng điều vừa nghe khi chuyện rẽ sang một ý mới). */
function themeReply(t: Theme, n: string, adviceAsked: boolean, avoidAsk?: RegExp, said: (x: string) => boolean = () => false, lead?: string): HeartReply {
  const parts: string[] = [];
  // Ý chủ đề có sẵn lời đáp riêng cho đúng điều vừa hỏi / kể — bỏ qua ý đã nói rồi (không đọc lại y nguyên một đoạn).
  const hintOf = () => t.hint?.find(([re, x]) => re.test(` ${n} `) && !said(x))?.[1];
  const defined = !!t.define && /\b(la gi|nghia la|la sao|hieu .* khong)\b/.test(` ${n} `);
  if (defined) parts.push(t.define!);
  // Đã khuyên hết ý của chủ đề này rồi mà người dùng hỏi tiếp → đổi sang góc nhìn + bước làm khác, không lặp lời khuyên.
  const given = advGiven.get(t.id) ?? 0;
  if (adviceAsked && given * 2 >= t.advice.length) {
    advGiven.set(t.id, 0);
    parts.push(hintOf() ?? pick(`${t.id}:ins`, t.insight));
    parts.push(`Thêm vài bước nhỏ bạn thử nha:\n• ${pick(`${t.id}:step`, t.step)}\n• ${pick(`${t.id}:step`, t.step)}`);
    parts.push(pick(`${t.id}:ask`, t.ask));
    return { text: parts.join("\n\n"), quick: chipsFor(t), theme: t.id };
  }
  if (adviceAsked) {
    advGiven.set(t.id, given + 1);
    // 11/10: câu xin lời khuyên trúng một ý chủ đề có sẵn lời đáp riêng ("nói sao cho vợ hết giận", "có nên uống thuốc ngủ không")
    // → trả lời thẳng ý đó trước, rồi mới thêm gợi ý chung (trước đây chỉ ra ba gạch đầu dòng chung chung, không đụng tới câu hỏi).
    const hintA = hintOf() ?? t.adviceHint?.find(([re, x]) => re.test(` ${n} `) && !said(x))?.[1];
    parts.push(hintA ?? pick(`${t.id}:feel`, t.feel));
    //   (ý riêng đã đủ dài và đủ ý thì không kèm thêm gợi ý chung — dễ nói ngược lại chính ý đó.)
    if (hintA && hintA.length > 220) return { text: parts.join("\n\n"), quick: chipsFor(t), theme: t.id };
    parts.push(hintA ? `Thêm vài điều nhỏ nha:\n• ${pick(`${t.id}:adv`, t.advice)}\n• ${pick(`${t.id}:step`, t.step)}` : `Lomi gợi ý vài điều nha:\n• ${pick(`${t.id}:adv`, t.advice)}\n• ${pick(`${t.id}:adv`, t.advice)}\n• ${pick(`${t.id}:step`, t.step)}`);
  } else {
    const hint = hintOf();
    // Câu kể trúng chi tiết có lời đáp riêng → đáp thẳng ý đó (không mở đầu chung chung dễ lệch ý).
    if (!defined && !hint) parts.push(lead ?? pick(`${t.id}:feel`, t.feel));
    parts.push(hint ?? pick(`${t.id}:ins`, t.insight));
    // Lời đáp riêng đã kết bằng một câu hỏi ("Bác sĩ nói sao bạn?") thì dừng ở đó — không chêm bước làm, không hỏi thêm câu thứ hai.
    const hintAsks = !!hint && /\?\s*$/.test(hint);
    if (t.stepFirst && !hintAsks) parts.push(pick(`${t.id}:step`, t.step));
    // Người dùng vừa nói rõ điều đó rồi ("chia tay 2 năm rồi") thì không hỏi lại "chia tay lâu chưa?".
    //   Câu hỏi đã hỏi trong cuộc trò chuyện này cũng không hỏi lại.
    const q1 = hintAsks ? undefined : pickAsk(t, said, avoidAsk);
    if (q1) parts.push(q1);
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
  // Tự hỏi mình có mắc một vấn đề tâm lý không → không chẩn đoán, không đáp như thể đã chắc.
  const dx = selfDx(text, n, {});
  if (dx) return { ...selfDxReply(dx, undefined, false, {}), story: storyOf(text) };
  if (HOPELESS_RE.test(` ${n} `)) return { ...hopelessReply(undefined, false), story: storyOf(text) };
  // Nói rõ chỉ muốn được nghe → vào mạch tâm sự ở chế độ CHỈ NGHE (không khuyên) ngay từ câu đầu.
  if (LISTEN_RE.test(` ${n} `))
    return t && !GENERIC.has(t.id)
      ? { text: `${pick(`${t.id}:feel`, t.feel)}\n\nLomi chỉ nghe thôi, không khuyên gì hết 🫶 Bạn cứ kể nha.`, quick: [], theme: t.id, listen: true, story: storyOf(text) }
      : { text: pick("lonly0", ["Okie, Lomi chỉ nghe thôi — không khuyên, không phán xét 🫶 Bạn cứ than đi, có chuyện gì vậy?", "Được luôn, Lomi ngồi đây nghe bạn nè 🌿 Có chuyện gì, bạn cứ nói ra cho nhẹ."]), quick: [], theme: "open", listen: true };
  // Chỉ nói mình đang bí mà chưa kể chuyện gì → hỏi chuyện trước, chưa có gì để khuyên.
  if (HELPLESS_ONLY.test(n)) return { text: "Nghe là thấy bạn đang rối lắm 🥺 Có chuyện gì vậy, kể Lomi nghe đầu đuôi được không? Mình gỡ từ từ.", quick: [], theme: "open" };
  if (t) {
    // Câu mở đầu đã nói rõ bao lâu ("mất ngủ nhiều tuần rồi") → không hỏi lại "lâu chưa?"; kéo dài từ hai tuần thì nhắc đi khám.
    const sp = n.match(SPAN_RE);
    const r = themeReply(t, n, asksAdvice(n), avoidAskFor(n, !!sp));
    const note = sp && longSpan(sp) && t.heavy && !r.text.includes(PRO) ? `\n\nKéo dài ${spanOf(sp)} rồi thì bạn nên đi khám để tìm đúng nguyên nhân nha, đừng ráng chịu một mình.` : "";
    // (lời nhắc đi khám đặt TRƯỚC câu hỏi cuối, để tin kết thúc bằng câu hỏi chứ không phải bằng lời dặn.)
    const ps = r.text.split("\n\n");
    const txt = note && ps.length > 1 && /\?\s*$/.test(ps[ps.length - 1]) ? [...ps.slice(0, -1), note.trim(), ps[ps.length - 1]].join("\n\n") : r.text + note;
    return { ...r, text: txt, story: storyOf(text) };
  }
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
export function heartContinue(text: string, prev: string, listen: boolean, depth: number, lastText = "", story = "", ctx: HeartCtx = {}): HeartReply {
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
  if (text.trim() === LISTEN_ONLY || LISTEN_RE.test(` ${n} `))
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
  //   (câu có chủ ngữ là người dùng / người khác — "c nói hoài mà ảnh không nghe" — là đang KỂ, không phải chê Lomi lặp lại.)
  if (META_RE.test(` ${n} `) && !ctx.self && !ctx.third)
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
  // 11/10: tự hỏi mình có bị trầm cảm / rối loạn… không → Lomi không chẩn đoán; nhắc lại điều đã nghe, nói khi nào nên đi khám, hỏi bao lâu.
  const dx = selfDx(text, n, ctx);
  if (dx) return selfDxReply(dx, prev, listen, ctx);
  //   …và câu trả lời "bao lâu" cho câu hỏi đó: từ hai tuần trở lên thì khuyên đi gặp người có chuyên môn, ngắn hơn thì theo dõi thêm.
  //   (lastText đã đổi xưng hô — "Em không chẩn đoán được…" — nên so phần không có đại từ.)
  if (lastText.includes("không chẩn đoán được đâu") && /bao lâu rồi\?\s*$/.test(lastText.trim())) {
    const sp = n.match(SPAN_RE);
    const vagueLong = /\b(lau roi|tu lau|lau lam|keo dai|may thang nay|ca nam|nhieu nam|tu nho|tu hoi)\b/.test(` ${n} `);
    if ((sp && longSpan(sp)) || vagueLong)
      return {
        text: `${sp ? `${capF(spanOf(sp))} rồi` : "Lâu vậy rồi"} thì đủ để mình nghiêm túc với nó rồi đó. Lomi nghĩ bạn nên đặt một buổi gặp bác sĩ tâm lý hoặc chuyên khoa tâm thần — không phải vì bạn “có vấn đề”, mà để có người có chuyên môn nghe kỹ và nói rõ cho bạn biết. Trong lúc chờ, cố giữ giờ ăn ngủ cho đều và đừng ở một mình quá lâu nha.\n\nBạn có ai tin tưởng để kể chuyện này không?`,
        quick: [],
        theme: prev,
        listen,
      };
    if (sp || /\b(tuan nay|may hom nay|may ngay nay|hom qua|hom nay|moi day|gan day|vai hom|may bua nay)\b/.test(` ${n} `))
      return {
        text: `Mới ${sp ? spanOf(sp) : "đây thôi"} thì cứ theo dõi thêm, đừng vội gắn cho mình một cái tên bệnh. Nếu qua khoảng hai tuần mà vẫn vậy, hoặc thấy nặng hơn, thì nên đi gặp bác sĩ tâm lý nha.\n\nMấy hôm nay có chuyện gì xảy ra làm bạn thấy vậy không?`,
        quick: [],
        theme: prev,
        listen,
      };
  }
  //   ("ăn kiêng sao e", "bắt đầu thế nào" — câu HỎI kết bằng "sao / thế nào" là hỏi CÁCH làm → cũng là xin gợi ý; "sao ảnh làm vậy" thì không.)
  const howAtEnd = !!ctx.ask && !ctx.third && /\b(sao|the nao|nhu the nao|kieu gi|cach nao)( (e|em|a|anh|chi|ban|lomi|nhi|ta|day|gio|bay gio|nua|duoc))*$/.test(n) && !/\b(tai sao|vi sao|thi sao|co sao|khong sao|ra sao|sao roi)\b/.test(n) && !/\b(khong|ko|k|chang|cha|hong|hk) (biet|bit|ro|hieu)\b/.test(n);
  const adviceAsked = text.trim() === HEART_ADVICE || asksAdvice(n) || howAtEnd;
  // Câu mẫu đã nói trong mấy tin gần đây (so cả bản đã đổi xưng hô) — để không đọc lại y nguyên một đoạn.
  const saidR = (x: string) => (ctx.recent ?? []).some((r) => r.includes(x.slice(0, 48)) || (!!ctx.say && r.includes(ctx.say(x).slice(0, 48))));
  // "nhiều lúc c muốn buông xuôi hết" — có thể chỉ là quá mệt, cũng có thể là dấu hiệu nặng hơn → hỏi thẳng một cách nhẹ nhàng.
  if (HOPELESS_RE.test(` ${n} `) && !ctx.third) return hopelessReply(prev, listen);
  // "mà vợ con thì sao", "còn mẹ a thì sao" — một nỗi vướng bận, không phải câu hỏi kiến thức ("chưa bắt chắc ý bạn").
  const tied = !adviceAsked && n.split(" ").length <= 7 ? text.trim().replace(/[?.!…]+$/u, "").match(/^(?:(?:mà|nhưng|còn|rồi|thế|vậy)\s+)+(.{2,30}?)\s+thì\s+(?:sao|làm sao|tính sao|biết làm sao|thế nào)(?:\s+(?:đây|giờ|nhỉ|ta|e|em))*$/iu) : null;
  if (tied && cur && !evOfPrev(prev)) {
    const x = /(^| )(a|anh|e|em|c|chị|mình|tui|tôi)( |$)/iu.test(tied[1]) ? "chuyện đó" : tied[1].toLowerCase();
    return { text: `Ừ ha, còn ${x} nữa 😔 Vướng chỗ đó nên mới khó quyết. Bạn lo nhất điều gì ${x === "chuyện đó" ? "ở chuyện đó" : `cho ${x}`}?`, quick: [], theme: prev, listen };
  }
  // Lomi vừa hỏi "Bạn có ai tin tưởng để kể chuyện này không?" mà người dùng nói không có ai → không đáp "Ra là vậy".
  if (/để kể chuyện này không\?\s*$/.test(lastText.trim()) && (NO_RE.test(n) || /\b(khong co ai|chang co ai|cha co ai|khong ai|khong biet ke voi ai)\b/.test(` ${n} `)))
    return { text: "Vậy thì trước mắt bạn cứ kể với Lomi, lúc nào cũng được 💚 Còn khi gặp bác sĩ tâm lý, họ cũng là người để bạn nói hết ra mà không sợ bị phán xét.\n\nNếu có lúc thấy quá sức, đường dây nóng Ngày Mai **096 306 1414** (13h–20h30, thứ 4 đến Chủ nhật) có người sẵn sàng nghe bạn.", quick: [], theme: prev, listen };
  // Lomi vừa hỏi "…hay có lúc bạn nghĩ tới chuyện không muốn sống nữa?" mà người dùng nói KHÔNG, chỉ muốn nghỉ → nhẹ lòng, hỏi tiếp việc cụ thể.
  //   (đáp "có" thì router đã chuyển sang lời hỗ trợ khẩn.)
  if (/không muốn sống nữa\?/.test(lastText) && (NO_RE.test(n) || /^(khong|ko|k|hong|chua)( |$)|\b(chi muon nghi|nghi thoi|met thoi|khong co dau|khong den muc|chua den muc)\b/.test(n)))
    return { text: "Vậy thì Lomi đỡ lo rồi 💚 Bạn cần được nghỉ thật sự đó — gồng mãi không ai chịu nổi. Trong tuần này có việc nào bạn bớt được, hoặc nhờ ai đỡ một tay không?", quick: [], theme: prev, listen };
  // "a cũng chẳng muốn nói với ai" — đang thu mình lại: ghi nhận điều đó, không coi là lời bảo dừng và không hỏi dồn.
  if (WITHDRAW_RE.test(` ${n} `) && !adviceAsked && !ctx.third)
    return { text: `${ctx.mirror ? `${capF(ctx.mirror)} hả 😔 ` : ""}Giữ hết trong lòng một mình thì nặng lắm. Bạn chịu nói ra với Lomi chừng này là quý rồi — cứ từ từ, không cần gồng.`, quick: [], theme: prev, listen };
  let t = themeOf(n);
  const words = n.split(" ").length;
  // Chi tiết ngắn kể thêm cho chuyện đang nói ("bạn ấy là đồng nghiệp", "cả với bạn bè của mình") → KHÔNG đổi chủ đề.
  const detailOnly = !!(t && cur && t.id !== cur.id && !GENERIC.has(cur.id) && NOUNISH.has(t.id) && words <= 9 && !emotionOf(n) && !adviceAsked);
  if (detailOnly) t = undefined;
  // Đang nói một cảm xúc chung (buồn, lo, cô đơn…) mà kể thêm một MỆNH ĐỀ có nhắc "bạn bè / công việc / gia đình" ("bạn bè ai cũng bận",
  // "công việc nhiều quá") → đó là chi tiết của chính nỗi buồn / lo đó, không phải mở chuyện "mâu thuẫn với bạn bè". (Chỉ nói trống tên
  // chủ đề — "chuyện công việc" — thì vẫn chuyển sang chủ đề đó như trước.)
  if (t && cur && t.id !== cur.id && GENERIC.has(cur.id) && NOUNISH.has(t.id) && !!ctx.mirror && !!ctx.clause && words <= 9 && !emotionOf(n) && !adviceAsked && !DUNNO_RE.test(` ${n} `) && depth >= 2 && prev !== "open") t = undefined;
  // Vừa mở lời ("a không biết làm sao nữa") rồi kể dần ("công ty sắp phá sản" → "a là trụ cột gia đình"): câu kể về CHÍNH MÌNH có nhắc
  // "gia đình / công việc" là chi tiết của chuyện đang kể, không phải mở chuyện "mâu thuẫn gia đình".
  if (t && !cur && prev === "open" && depth >= 3 && NOUNISH.has(t.id) && !!ctx.self && words <= 9 && !emotionOf(n) && !adviceAsked) t = undefined;
  // Đang nói về MỘT NGƯỜI cụ thể ("người ấy im lặng") mà kể thêm một chi tiết về hai người ("tụi a mới quen") → vẫn là chuyện đó.
  if (ctx.person && t && cur && t.id !== cur.id && (LOVEISH.has(t.id) || t.id === "newlove" || t.id === "single") && words <= 8 && !adviceAsked) t = undefined;
  // Đang kể chuyện với NGƯỜI THƯƠNG ("bạn gái a hay ghen" → "a mệt lắm") mà nói thêm một cảm giác chung (mệt, buồn, lo) → vẫn là chuyện đó,
  // không rẽ sang bài "mệt mỏi" rồi quên mất đang nói về ai.
  if (t && cur && cur.id === "love" && GENERIC.has(t.id) && t.id !== "love" && words <= 6 && !adviceAsked && /(vợ|chồng|bạn gái|bạn trai|người yêu|người ấy|crush|cô ấy|anh ấy|bà xã|ông xã|(?<![\p{L}])ny(?![\p{L}]))/iu.test(story)) t = undefined;
  // Câu kể về một NGƯỜI KHÁC ("con a sắp thi", "mẹ a ở quê") trong lúc đang tâm sự → chữ "thi", "học", "gia đình" không phải chuyện của người dùng.
  if (ctx.third && t && cur && (NOUNISH.has(t.id) || GENERIC.has(t.id)) && !adviceAsked && !emotionOf(n)) t = undefined;
  // Chuyện đời thường đang kể (vd mắc mưa) → hiểu câu kể tiếp theo đúng chuyện đó.
  const evCur = prev.startsWith("ev:") ? eventById(prev.slice(3)) : undefined;
  const evNew = eventOf(n);
  //   (chuyện của một người khác — "con a sắp thi" — không phải chuyện đời thường của chính người dùng.)
  //   Đang kể một chuyện CỤ THỂ (bị sếp mắng) mà thêm một mẩu ngắn ("vì đi trễ", "mà e bị kẹt xe") → đó là chi tiết của chuyện đó.
  const detailOfStory = !!cur && !GENERIC.has(cur.id) && !evCur && words <= 8;
  //   Câu nêu LÝ DO cho cảm xúc đang nói ("chắc tại trời mưa", "tại a ngủ ít") cũng là chi tiết của chuyện đó — không rẽ sang "mắc mưa".
  const reasonLead = !!cur && words <= 8 && /^(chac (la )?(tai|do|vi)|co le (tai|do|vi)|tai vi|boi vi|tai|do|vi) /.test(n);
  if (evNew && evNew !== evCur && (!t || GENERIC.has(t.id)) && !ctx.third && !detailOfStory && !reasonLead) return eventReply(evNew, n, text);
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
    //   (đang chán mà hỏi một câu Lomi không có bài riêng — "xem phim gì hay không e" — cũng là đang xin gợi ý.)
    if (adviceAsked || DUNNO_RE.test(` ${n} `) || (!!ctx.ask && !evCur.good && !emotionOf(n)))
      return {
        text: `${evCur.good ? "Gợi ý nhỏ của Lomi nè" : ctx.ask && !adviceAsked ? "Cái đó thì Lomi không rành lắm 😅 Nhưng Lomi gợi ý vài điều nha" : "Lomi gợi ý vài điều nha"}:\n• ${pick(`ev:${evCur.id}:a`, evCur.advice)}\n• ${pick(`ev:${evCur.id}:a`, evCur.advice)}\n\nCòn chuyện gì khác làm bạn bận lòng không, kể Lomi nghe tiếp nha.`,
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
            `Ừm, ${story ? `chuyện “${story}” ` : "chuyện này "}làm bạn khó chịu thật đó. Điều gì trong chuyện đó làm bạn thấy tệ nhất?`,
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
  //   Đang kể dở mà rẽ sang ý mới ("ba mẹ thất vọng về e") → mở bằng chính điều vừa nghe, không đọc lại lời đồng cảm chung của chủ đề mới.
  if (t && t.id !== prev && !(listen && !adviceAsked)) {
    const mw = ctx.mirror?.split(" ").length ?? 0;
    const lead = depth >= 2 && ctx.mirror && mw >= 3 && mw <= 10 && !ctx.ask ? `${ctx.mirror.charAt(0).toUpperCase() + ctx.mirror.slice(1)} hả 😔` : undefined;
    return themeReply(t, n, adviceAsked, avoidAskFor(n, /\b(\d+|mot|hai|ba|may|vai)\s*(ngay|hom|tuan|thang|nam)\b/.test(n)), saidR, lead);
  }
  const th = t ?? cur;
  // Câu kể trúng chi tiết mà chủ đề có sẵn lời đáp riêng (vd crush là đồng nghiệp, tính nghỉ việc) → đáp đúng ý đó.
  //   (đang ở chế độ CHỈ NGHE thì không chen lời khuyên; ý đã nói rồi thì không đọc lại.)
  const hintHit = listen ? undefined : th?.hint?.find(([re, x]) => re.test(` ${n} `) && !saidR(x));
  if (hintHit && !adviceAsked) return { text: `${hintHit[1]}${/\?\s*$/.test(lastText.trim()) ? "" : `\n\n${pickAsk(th!, saidR) ?? ""}`}`.trim(), quick: [], theme: th!.id, listen };
  //   (lời khuyên xét cả điều vừa kể ở 1–2 lượt trước: "ảnh có người yêu rồi" → "e nên làm sao" phải đáp đúng hoàn cảnh đó.)
  if (adviceAsked && th) return themeReply(th, `${n} ${(ctx.details ?? []).slice(-3).map((d) => normalizeVi(d)).join(" ")}`.trim(), true, undefined, saidR);
  // "a không biết nói sao", "chẳng biết phải làm thế nào" — bí, đang cần gợi ý (không phải câu hỏi kiến thức) → đưa lời khuyên của đúng chuyện đang nói.
  //   (chỉ khi là bí CÁCH LÀM — "không biết nói sao", "chẳng biết tính sao nữa"; còn "e không biết e sai gì" là đang kể nỗi băn khoăn.)
  //   Lomi vừa hỏi "chuyện gì / vì sao…" mà người dùng đáp "không biết (sao) nữa" → là KHÔNG RÕ VÌ SAO mình thấy vậy, không phải bí cách làm
  //   → không dội ba gạch đầu dòng lời khuyên.
  if (/^(khong|ko|k|chang|cha|hong|hk) (biet|bit|ro|hieu)( (sao|vi sao|tai sao|nua|luon|gi|nx))*$/.test(n) && /\?\s*$/.test(lastText.trim()) && /(chuyện gì|điều gì|vì sao|tại sao|sao vậy)/i.test(lastText.trim().split("\n").pop() ?? ""))
    return { text: "Không rõ vì sao mà vẫn thấy vậy thì cũng không sao đâu — không phải cảm xúc nào cũng có lý do rõ ràng 💚 Bạn không cần tìm ra ngay.\n\nBạn thấy như vậy mới hôm nay, hay mấy hôm rồi?", quick: [], theme: prev, listen };
  if (DUNNO_RE.test(` ${n} `) && HOW_DUNNO.test(` ${n} `) && th && !listen && !emotionOf(n)) return themeReply(th, n, true, undefined, saidR);
  // Kể thời gian ("3 năm rồi đó", "2 tuần nay") → đáp theo đúng chuyện đang nói.
  const dur = n.match(/\b(\d+|mot|hai|ba|bon|nam|may|vai|mo)\s*(ngay|hom|bua|tuan|thang|nam)\b/);
  // Chỉ khi câu NÓI RIÊNG khoảng thời gian đã qua ("3 năm rồi đó", "từ 2 tuần nay"): "làm được 5 năm" là kể việc khác, "còn 2 tuần nữa thi"
  // là chuyện sắp tới — mấy câu đó để phần kể tiếp nhắc lại đúng nội dung.
  const bareDur = !!dur && !n.replace(dur[0], " ").split(" ").some((w) => w && !/^(roi|do|nay|ne|a|luon|thoi|khoang|gan|hon|ca|tu|toi|den|gio|troi|lan|chac|cung|tam)$/.test(w));
  if (dur && bareDur && th && !t) {
    const span = `${dur[1] === "mo" ? "mấy" : dur[1]} ${({ ngay: "ngày", hom: "hôm", bua: "bữa", tuan: "tuần", thang: "tháng", nam: "năm" } as Record<string, string>)[dur[2]]}`;
    const love = LOVE_THEMES.has(th.id);
    // Đang nói về MỘT NGƯỜI cụ thể ("người ấy im lặng" → "2 ngày rồi") → đáp đúng chuyện với người đó, không hỏi lại "bạn đang thích ai".
    if (ctx.person && LOVEISH.has(th.id))
      return {
        text: `${capF(span)} rồi hả 😔 Từng ấy thời gian cứ phải đoán ý ${ctx.person} thì mệt thật. Nếu bạn muốn chủ động, một tin ngắn, nhẹ nhàng là đủ — không cần giải thích dài.`,
        quick: [],
        theme: prev,
        listen,
      };
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
  if (detailOnly && th) return ctx.mirror ? follow(n, th, prev, listen, depth, lastText, story, ctx) : { text: `À, ${echo(text)} hả 🤔 ${pick(`${th.id}:ins`, th.insight)}\n\n${pick(`${th.id}:ask`, th.ask)}`, quick: [], theme: prev, listen };
  if (adviceAsked || (DUNNO_RE.test(` ${n} `) && !th))
    return {
      text: `${story ? `Về chuyện “${story}”, ` : ""}Lomi gợi ý vài điều nha:\n• ${pick("gadv", byId("sad")!.advice)}\n• Viết ra điều đang làm bạn bận lòng, rồi chia nhỏ xem phần nào mình làm được ngay.\n• Cho mình nghỉ ngơi đủ trước khi quyết định chuyện lớn.`,
      quick: chipsFor(th),
      theme: prev,
    };
  // Hỏi một điều Lomi không biết (không khớp chủ đề nào) → nói thật, không đáp đại cho có.
  if (!t && !NO_RE.test(n) && !YES_RE.test(n) && ((ctx.ask && !emotionOf(n)) || /\?|\b(la gi|nghia la|hieu .* khong|biet .* khong|co biet)\b/.test(`${text} ${n} `)))
    return {
      text: pick("unk", [
        "Ừa, Lomi nghe nè. Bạn nói thêm một chút để Lomi bắt đúng ý nha.",
        "Lomi chưa bắt chắc ý bạn. Bạn đang hỏi về chuyện nào — nói rõ tên chuyện đó giúp Lomi nha.",
      ]),
      quick: [],
      theme: prev,
      listen,
    };
  const out = follow(n, th, prev, listen, depth, lastText, story, ctx, !!t);
  // Đang "chỉ nghe" từ đầu (chưa rõ chuyện gì) mà câu này cho biết chuyện gì → nhớ chủ đề đó (vẫn không khuyên), để lúc người dùng xin lời khuyên thì có lời khuyên đúng chuyện.
  return listen && t && prev === "open" && !GENERIC.has(t.id) ? { ...out, theme: t.id } : out;
}

/**
 * KỂ TIẾP (10/10) — đáp bám nội dung:
 *   1. nhắc lại đúng điều vừa nghe (hoặc gọi tên cảm xúc người dùng vừa nói ra);
 *   2. xoay kiểu đi tiếp theo lượt: một góc nhìn → một câu hỏi CỤ THỂ → một bước nhỏ / chỉ ở bên — không phải lượt nào cũng hỏi,
 *      và không hỏi dồn khi lượt trước Lomi vừa hỏi;
 *   3. kể được vài ý rồi thì TÓM LẠI các ý đó và hỏi bạn cần gợi ý hay chỉ cần người nghe;
 *   4. không dùng lại câu đã nói trong mấy tin gần đây. Mấy câu "đang nghe" chung chung chỉ là phương án cuối, không dùng hai lượt liền.
 */
function follow(n: string, th: Theme | undefined, prev: string, listen: boolean, depth: number, lastText: string, story: string, ctx: HeartCtx, newTheme = false): HeartReply {
  const recent = ctx.recent ?? (lastText ? [lastText] : []);
  const lowR = recent.map((r) => r.toLowerCase());
  const said = (x: string) => lowR.some((r) => r.includes(x.toLowerCase()) || (!!ctx.say && r.includes(ctx.say(x).toLowerCase())));
  // Chọn câu CHƯA nói; trong số đó ưu tiên câu có chung từ với điều người dùng vừa kể ("sợ làm phiền" → câu nói về "không phiền").
  //   (so chữ CÓ DẤU: "hàng" trong "nợ ngân hàng" không phải "hẵng" trong "rồi hẵng phản hồi".)
  const keyWords = (x: string) => x.normalize("NFC").toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !STOP.has(normalizeVi(w)));
  const mine = new Set(keyWords(ctx.mirror ?? ""));
  const fresh = (key: string, arr: string[] | undefined) => {
    const pool = (arr ?? []).filter((x) => !said(x));
    if (!pool.length) return undefined;
    const near = mine.size ? pool.filter((x) => keyWords(x).some((w) => mine.has(w))) : [];
    return near.length ? near[0] : pick(key, pool);
  };
  const evCur = prev.startsWith("ev:") ? eventById(prev.slice(3)) : undefined;
  const fam: Fam | undefined = evCur ? (evCur.good ? undefined : "mishap") : th ? FAM[th.id] : undefined;
  const e = emotionOf(n);
  const m = ctx.mirror?.trim();
  const p = ctx.person && th && LOVEISH.has(th.id) ? ctx.person : undefined;
  const lastAsked = /\?\s*$/.test(lastText.trim());
  const good = (ctx.val ?? 0) > 0;
  const bad = (ctx.val ?? 0) < 0;
  const parts: string[] = [];

  // 3) Tóm lại khi đã kể được vài ý.
  const det = (ctx.details ?? []).filter(Boolean);
  const sumMark = "hay chỉ cần có người nghe thôi";
  //   (lượt trước Lomi vừa hỏi thì lời mời ở cuối là câu KỂ, không thêm một câu hỏi nữa — không hỏi dồn.)
  if (th && !evCur && det.length >= 4 && depth >= 5 && !said("từng đó") && !said(sumMark) && !good) {
    const list = det.slice(-4).join(", ");
    parts.push(`${capF(list)} — từng đó chuyện dồn lại thì ai mà không ${fam === "tired" ? "kiệt sức" : fam === "worry" ? "lo" : "nặng lòng"} 🥺`);
    if (!listen) parts.push(lastAsked ? "Bạn cần Lomi gợi ý gì thì cứ nói nha, còn không thì Lomi cứ ngồi đây nghe bạn." : `Bạn muốn Lomi gợi ý vài cách cho nhẹ bớt, ${sumMark}?`);
    return { text: parts.join("\n\n"), quick: chipsFor(th), theme: prev, listen };
  }

  // "thôi kệ", "bỏ đi", "ừ", "vậy thôi" sau một câu Lomi không hỏi gì → người dùng đang khép lại: đáp nhẹ, không hỏi dồn, không "kể thêm đi".
  if (!lastAsked && !e && CLOSE_RE.test(n)) {
    const soft = "Khi nào muốn nói tiếp thì cứ nhắn Lomi nha.";
    return { text: said(soft) ? "Dạ 🌿" : `Dạ 🌿 ${soft}`, quick: [], theme: prev, listen };
  }
  let reacted = false;
  // 1) Mở đầu: nhắc lại điều vừa nghe / gọi tên cảm xúc.
  if (m) {
    // Mặt buồn chỉ khi điều vừa kể là chuyện không vui; việc bình thường của chính người dùng ("tụi a mới quen", "a xin lỗi rồi") thì không.
    const mark = good ? " 😊" : ctx.neg && fam === "mishap" ? "" : bad || e || ((fam || th) && !ctx.self && !evCur?.good) ? (fam === "mishap" ? " 😩" : " 😔") : "";
    const head = `${capF(m)} hả${mark || "."}`;
    // Đã nhắc lại đúng lời người dùng thì không cần gọi tên cảm xúc thêm lần nữa; chỉ thêm một lời đáp đúng tông (không lặp câu đã nói).
    //   (câu có phủ định — "sếp không nói gì" — là chuyện KHÔNG xảy ra, chưa chắc là điều tệ → chỉ nhắc lại.)
    //   Lời đáp đó chỉ dành cho điều xảy đến với người dùng ("làm cả ngày", "vợ a không nói chuyện với a"); còn việc chính họ làm / muốn
    //   ("a xin lỗi rồi", "a muốn nghỉ") thì chỉ nhắc lại, không phán "vậy thì khó chịu thật".
    //   (trong chuyện mâu thuẫn, điều chính người dùng làm — "a quên sinh nhật cô ấy" — không đáp "ai cũng thấy bức bối".)
    const react = good ? "Nghe vậy cũng nhẹ được một chút ha." : fam && !p && !(ctx.neg && fam === "mishap") && (!ctx.self || (bad && fam !== "conflict")) ? fresh(`react:${fam}`, REACT[fam]) : undefined;
    reacted = !!react;
    // Chỉ nhắc lại trơ trọi mà lượt này không nói thêm gì nữa (đang "chỉ nghe") thì thêm một lời ngắn cho thấy Lomi vẫn theo kịp.
    const lone = !react && (listen || good) ? fresh("support", SUPPORT) : undefined;
    parts.push([head, react, lone].filter(Boolean).join(" "));
  } else if (e) parts.push(fresh("reflect", REFLECT.map((x) => x.replace("{e}", e))) ?? `Lomi hiểu, ${e} như vậy khó chịu lắm.`);
  else {
    // Phương án cuối: câu "đang nghe" — không dùng hai lượt liền nhau.
    const justListened = LISTEN.some((x) => said(x) && ((lowR[0] ?? "").includes(x.toLowerCase()) || (!!ctx.say && (lowR[0] ?? "").includes(ctx.say(x).toLowerCase()))));
    parts.push(
      justListened
        ? story && !lastAsked
          ? `Ừm. Trong chuyện “${story}”, điều gì làm bạn khó chịu nhất?`
          : "Ừm, Lomi hiểu."
        : (fresh("listen", LISTEN) ?? "Ừm, Lomi hiểu."),
    );
    if (!justListened || !th) return { text: parts.join("\n\n"), quick: chipsFor(th), theme: prev, listen };
  }
  if (listen || good) return { text: parts.join("\n\n"), quick: chipsFor(th), theme: prev, listen };

  // 2) Đi tiếp: xoay kiểu theo lượt.
  // Chủ đề chung chung (buồn, mệt, lo…) mà người dùng chỉ đang KỂ chi tiết, không nói ra cảm xúc → không chen bài "góc nhìn / bước nhỏ"
  // (kể "con học không tốt" mà được khuyên "hít thở 4 nhịp" là tư vấn tâm lý không ai hỏi). Chỉ nhắc lại + hỏi tiếp một ý cụ thể.
  const calmDetail = !!th && GENERIC.has(th.id) && !newTheme && !e;
  const insight = () => (p ? fresh("rel:ins", REL_INSIGHT.map((x) => x.split("{p}").join(p))) : th && !calmDetail ? fresh(`${th.id}:ins`, th.insight) : undefined);
  const step = () => (th && !p && !calmDetail ? fresh(`${th.id}:step`, th.step) : undefined);
  const ask = () => {
    if (lastAsked) return undefined; // lượt trước vừa hỏi → lượt này không hỏi dồn
    if (p) return fresh("rel:ask", REL_ASK.map((x) => x.split("{p}").join(p)));
    // Câu hỏi mở đầu của chủ đề ("Có chuyện gì làm bạn buồn vậy?") chỉ hợp lúc mới vào chuyện; sau đó hỏi một ý cụ thể để đi tiếp.
    //   (câu mở đầu đã nói rõ bao lâu — "mất ngủ nhiều tuần rồi" — thì không hỏi lại "lâu chưa?".)
    const knownDur = SPAN_RE.test(normalizeVi(story));
    const opening = th && depth <= 2 && !GENERIC.has(th.id) ? fresh(`${th.id}:ask`, knownDur ? th.ask.filter((x) => !/lâu chưa|bao lâu|từ khi nào|lâu rồi/.test(x)) : th.ask) : undefined;
    const upcoming = /(^| )(sắp|sẽ|chuẩn bị|tính|định|sap|se|chuan bi)( |$)/.test(m ?? "");
    //   (vừa kể người kia phản ứng thế nào — "cô ấy vẫn không nói gì" — thì không hỏi lại "bên kia phản ứng sao".)
    const toldReact = /(không nói gì|im lặng|không trả lời|không thèm|bảo là|nói là|kêu là|chửi|la |mắng)/.test(m ?? "");
    const prog = fam ? PROGRESS[fam].filter((x) => !(toldReact && /phản ứng/.test(x))) : undefined;
    return opening ?? (prog ? fresh(`prog:${fam}`, prog) : undefined) ?? fresh("prog:any", upcoming ? PROGRESS.any.filter((x) => !/sau đó/.test(x)) : PROGRESS.any);
  };
  // Ý có CHUNG TỪ với điều vừa kể thì dùng ngay (đó là đáp đúng nội dung); còn lại xoay theo lượt và dè dặt với "bài học chung":
  //   lượt 1 hỏi tiếp một ý cụ thể · lượt 2 chỉ ghi nhận (có nói ra cảm xúc thì thêm một góc nhìn) · lượt 3 một bước nhỏ / góc nhìn.
  const nearOf = (arr: string[] | undefined) => (mine.size ? (arr ?? []).filter((x) => !said(x) && keyWords(x).some((w) => mine.has(w)))[0] : undefined);
  const relevant = p ? nearOf(REL_INSIGHT.map((x) => x.split("{p}").join(p))) : th && !calmDetail ? (nearOf(th.insight) ?? nearOf(th.step)) : undefined;
  const k = depth % 3;
  //   Người dùng CHỈ ĐANG KỂ (không nói ra cảm xúc) thì Lomi nghe: nhắc lại, thỉnh thoảng hỏi tiếp một ý — không chen lời khuyên không ai hỏi
  //   (lời khuyên có khi người dùng xin, hoặc khi Lomi tóm lại và mời). Có nói ra cảm xúc thì mới thêm một góc nhìn / bước nhỏ.
  const extra = relevant ?? (e || p ? (k === 0 && !p ? (step() ?? insight()) : (insight() ?? ask())) : k === 1 || (k === 2 && !reacted) ? ask() : undefined);
  const added = !!extra;
  if (extra) parts.push(extra);
  // Chỉ nhắc lại trơ trọi thì cụt quá → thêm một lời ngắn cho thấy Lomi vẫn theo kịp (không lặp câu vừa dùng).
  if (!added && m && parts.length === 1 && !reacted) {
    const s = fresh("support", SUPPORT);
    if (s) parts[0] = `${parts[0]} ${s}`;
  }
  if (th?.heavy && e && depth >= 3 && depth % 3 === 0 && !said(PRO)) parts.push(PRO);
  return { text: parts.join("\n\n"), quick: chipsFor(th), theme: prev, listen };
}
const CLOSE_RE = /^(khong|ko|hong|khong co|thoi|thoi ke|ke di|ke no|ke|bo di|thoi bo di|thoi bo qua|bo qua di|khong sao|khong co gi|vay thoi|the thoi|vay do|u|uh|um|uhm|ok|oke|okie|da|vang|ua)( (nha|nhe|a|di|em|e|lomi|vay|thoi))*$/;
const SUPPORT = ["Lomi hiểu.", "Ra là vậy."];
const STOP = new Set("khong nhung nhieu duoc nguoi minh chuyen muon dang thoi cung nhau biet nghe thay luon chua".split(" "));

/** Kể tiếp một chuyện đời thường không vui (kẹt xe, mắc mưa…) bằng một mẩu ngắn không khớp bài nào → đáp bám nội dung, đúng tông. */
export function heartFollow(text: string, prev: string, listen: boolean, depth: number, lastText = "", story = "", ctx: HeartCtx = {}): HeartReply {
  return follow(normStrict(text, HEART), byId(prev), prev, listen, depth, lastText, story, ctx);
}

/** Chủ đề tâm sự khớp với câu (để biết câu này là chuyện cụ thể hay chỉ là cảm xúc chung). */
export function heartThemeOf(text: string): string | undefined {
  return themeOf(normStrict(text, HEART))?.id;
}
