import { VR, VN } from "@/lib/viMatch";
// ─────────────────────────────────────────────────────────────────────────────
// NÓI CHUYỆN THEO MẠCH (30/09 r5, theo ý Kir: "lomi k follow câu chuyện, cảm giác máy móc")
// Chạy trên máy, dùng chung với lib/lomiHeart.ts:
//  • Chuyện đời thường có diễn biến (mắc mưa, kẹt xe, hư xe, mất đồ, bị leo cây, có tin vui…):
//    Lomi phản ứng đúng chuyện, hỏi tiếp đúng chỗ, và hiểu câu kể tiếp ("ướt hết", "kịp trú").
//  • Trả lời ngắn "có / không / ừ" → hiểu theo câu Lomi vừa hỏi, không đáp chung chung.
//  • "Sao cứ nói vậy hoài?", "là sao?" → Lomi nhận lỗi, nhắc lại mình đang hiểu chuyện gì, hỏi bạn cần gì.
// ─────────────────────────────────────────────────────────────────────────────

export type Ev = {
  id: string;
  re: RegExp;
  react: string[]; // {act} = "đang đi ăn " nếu người dùng có nói đang làm gì
  follow: [RegExp, string[]][]; // câu kể tiếp khớp → đáp đúng ý
  advice: string[];
  good?: boolean; // tin vui
  label: string; // tóm tắt chuyện để Lomi nhắc lại ("bị mắc mưa")
  /** 11/10: chỉ là chuyện của CHÍNH người nói ("a chán quá") — "công việc chán quá", "phim này chán ghê" là chê một thứ khác, không phải đang rảnh. */
  selfOnly?: boolean;
  yes?: [RegExp, string[]][]; // người dùng đáp "có/ừ" cho câu hỏi khớp RegExp (câu Lomi vừa hỏi)
  no?: [RegExp, string[]][]; // người dùng đáp "không/chưa"
};

const ACTS: [RegExp, string][] = [
  [VN(/\b(đang|đi) ăn\b|\bđi ăn\b/), "đi ăn"],
  [VN(/\bđi chơi\b/), "đi chơi"],
  [VN(/\bđi làm\b|\bđang làm\b/), "đi làm"],
  [VR(/\bdi hoc\b/), "đi học"],
  [VN(/\bđi cafe\b|\bđi cà phê\b|\bđi cf\b/), "đi cà phê"],
  [VN(/\bđi chợ\b/), "đi chợ"],
  [VN(/\bđi về\b|\bvề nhà\b|\btrên đường về\b/), "trên đường về"],
  [VN(/\bchạy xe\b|\bđi xe\b/), "chạy xe"],
  [VN(/\bhẹn hò\b|\bđi hẹn\b/), "đi hẹn hò"],
];
export function activityOf(n: string): string | undefined {
  return ACTS.find(([re]) => re.test(` ${n} `))?.[1];
}

export const EVENTS: Ev[] = [
  {
    id: "rain",
    label: "bị mắc mưa",
    yes: [
      [VR(/về tới nhà chưa/), ["Về tới nhà là yên tâm rồi 🏠 Tắm nước ấm, thay đồ khô, uống gì nóng nóng cho ấm nha. Nay còn chuyện gì vui buồn kể Lomi nghe không?"]],
      [VR(/áo mưa/), ["Có áo mưa là yên tâm rồi 😄 Chạy chậm thôi nha, đường mưa trơn lắm. Bữa ăn vẫn vui chứ?"]],
      [VR(/kịp trú/), ["Vậy may quá 😄 Ngồi trú mưa nghe mưa rơi cũng chill phết. Giờ tạnh chưa?"]],
      [VR(/tạnh chưa/), ["Tạnh rồi là ngon 🌤️ Đi tiếp cẩn thận nha, đường còn ướt dễ trượt đó."]],
      [VR(/ăn ngon|vui chứ/), ["Vậy là vẫn cứu được buổi đi ăn 😋 Mưa mà được ăn đồ nóng thì đúng bài luôn. Bạn ăn món gì vậy?"]],
    ],
    no: [
      [VR(/về tới nhà chưa/), ["Vậy tìm chỗ trú tạm đã nha, đừng cố chạy trong mưa lớn, trơn lắm. Tới nhà rồi nhắn Lomi một tiếng cho Lomi yên tâm 😊"]],
      [VR(/áo mưa/), ["Vậy chắc ướt hết rồi 🥺 Ghé chỗ nào trú tạm nha, về nhớ tắm nước ấm, thay đồ khô kẻo cảm. Lần sau để sẵn áo mưa mỏng trong cốp xe là yên tâm luôn."]],
      [VR(/kịp trú/), ["Tội ghê 🥺 Về tới nhà nhớ tắm nước ấm, thay đồ khô, uống ly trà gừng cho ấm người nha."]],
      [VR(/tạnh chưa/), ["Vậy ngồi trú thêm chút nha, gọi ly gì nóng uống cho ấm 😊 Đừng đội mưa về, dễ cảm lắm."]],
    ],
    re: VN(/\b(mắc mưa|gặp mưa|dính mưa|bị mưa|trời mưa|mưa to|mưa lớn|ướt mưa|mưa bất chợt|mưa quá|đổ mưa|mưa xối)\b/),
    react: [
      "Trời, {act}mà mắc mưa thì cụt hứng ghê 😣 Bạn kịp trú không, hay bị ướt hết rồi?",
      "Ui, mưa bất chợt kiểu Đà Lạt đó hả 🌧️ {Act}mà gặp mưa thì mất vui thật. Có mang áo mưa theo không?",
    ],
    follow: [
      [VN(/\b(ướt|ướt hết|ướt sũng|ướt nhem|ướt nhẹp|lạnh quá|lạnh run|run|ướt lạnh)\b/), [
        "Tội ghê 🥺 Về tới nhà nhớ tắm nước ấm, thay đồ khô, uống ly trà gừng hay sữa nóng cho ấm người nha — mưa lạnh dễ bị cảm lắm. Còn bữa ăn thì sao, vẫn ăn ngon chứ?",
        "Ướt hết là khó chịu lắm luôn 😣 Lau khô người, thay đồ ấm liền nha, đừng để lạnh lâu kẻo cảm. Giờ bạn về tới nhà chưa?",
      ]],
      [VN(/\b(kịp trú|đang trú|trú mưa|có áo mưa|mặc áo mưa|không ướt|không sao)\b/), [
        "Vậy may quá 😄 Ngồi trú mưa nghe tiếng mưa rơi cũng chill phết đó. Giờ tạnh chưa?",
        "Hên ghê 😆 Có áo mưa là yên tâm rồi. Chạy chậm thôi nha, đường mưa trơn lắm.",
      ]],
      [VN(/\b(về nhà rồi|về tới nhà|tới nhà rồi|về rồi)\b/), ["Về tới nhà là yên tâm rồi 🏠 Tắm nước ấm, nghỉ ngơi chút nha. Nay còn chuyện gì vui hay buồn kể Lomi nghe không?"]],
      [VN(/\b(tạnh rồi|hết mưa)\b/), ["Tạnh rồi là ngon 🌤️ Đi tiếp cẩn thận nha, đường còn ướt dễ trượt đó."]],
      [VN(/\b(ăn ngon|vẫn ăn|ăn được|ngon)\b/), ["Vậy là vẫn cứu được bữa ăn 😋 Mưa mà được ăn đồ nóng thì đúng bài luôn. Bạn ăn món gì vậy?"]],
      [VN(/\b(huỷ|không ăn được|bỏ bữa|đóng cửa|nguội hết)\b/), ["Tiếc ghê 🥲 Hẹn bữa khác đi ăn bù nha. Giờ về nấu gì nóng nóng ăn tạm cho ấm bụng đã."]],
    ],
    advice: [
      "Để sẵn một bộ áo mưa mỏng trong cốp xe là yên tâm nhất — Đà Lạt mưa bất chợt lắm.",
      "Mắc mưa thì ghé tạm quán gần nhất trú, tiện ăn uống luôn, vừa ấm vừa khỏi ướt.",
      "Về nhà tắm nước ấm, uống đồ nóng, sấy khô tóc trước khi ngủ để khỏi bị cảm.",
      "Đường mưa trơn, chạy chậm, giữ khoảng cách và tránh phanh gấp nha.",
    ],
  },
  {
    id: "traffic",
    label: "bị kẹt xe",
    re: VN(/\b(kẹt xe|tắc đường|kẹt cứng|kẹt xe quá|đông xe quá|kẹt ở (đường|ngoài đường|ngã tư|ngã ba|cầu|hầm|quốc lộ|cao tốc))\b/),
    react: ["Kẹt xe là mệt nhất luôn 😮‍💨 Bạn đang kẹt lâu chưa, có gấp giờ không?", "Ui, {act}mà kẹt xe thì nản ghê 😩 Có trễ hẹn gì không?"],
    follow: [
      [VN(/\b(trễ|muộn|gấp|trễ hẹn|trễ giờ)\b/), ["Trễ thì nhắn báo trước một tiếng cho người ta yên tâm nha. Chạy chậm, an toàn là trên hết 🙏"]],
      [VN(/\b(thoát rồi|hết kẹt|đi được rồi|tới nơi rồi)\b/), ["Thoát kẹt rồi là nhẹ cả người ha 😄 Đi đường cẩn thận nha!"]],
    ],
    advice: ["Thử mở bản đồ xem đường vòng nào đang thoáng.", "Tranh thủ nghe nhạc, podcast cho đỡ sốt ruột.", "Nếu có hẹn, nhắn báo sớm là người ta thông cảm liền."],
  },
  {
    id: "vehicle",
    label: "bị hư xe giữa đường",
    re: VN(/\b(hư xe|xe hư|xe bị hư|xẹp lốp|thủng lốp|bánh xe xẹp|xe chết máy|hết xăng|xe không nổ|xe không chạy|đứt dây sên|xe tắt máy)\b/),
    react: ["Ôi xui ghê 😣 Bạn có an toàn không, đang ở chỗ nào vậy?", "Trời, {act}mà hư xe thì hoảng lắm 😰 Có gần tiệm sửa nào không?"],
    follow: [
      [VN(/\b(không có tiệm|xa tiệm|không biết ở đâu(?:x)?|vắng|đêm|tối rồi|trời tối|khuya)\b/), ["Vậy dắt xe vào lề chỗ sáng, an toàn trước nha. Gọi người thân hoặc đặt xe ở mục Đưa đón (/dua-don) để về trước, xe tính sau cũng được 🙏"]],
      [VN(/\b(sửa rồi|sửa xong|có tiệm|gần tiệm)\b/), ["May quá 😄 Sửa xong thì nhớ kiểm tra lại lốp, xăng trước khi đi xa nha."]],
    ],
    advice: ["Dắt xe vào lề, bật đèn cảnh báo nếu trời tối.", "Hỏi người dân gần đó tiệm sửa xe gần nhất.", "Cần về gấp thì đặt xe ở mục Đưa đón (/dua-don) trong app."],
  },
  {
    id: "lost",
    label: "bị mất đồ",
    re: VN(/\b(mất ví|mất bóp|mất điện thoại|rơi mất|đánh rơi|làm mất|bị móc túi|mất tiền|mất giấy tờ|mất chìa khoá|bị trộm|bị cướp|mất xe)\b/),
    react: ["Trời ơi, mất đồ là hoảng lắm 😰 Bạn mất lúc nào, ở đâu vậy?", "Xui quá 😣 Mất những gì vậy bạn, có giấy tờ hay thẻ ngân hàng không?"],
    follow: [
      [VN(/\b(thẻ|ngân hàng|atm|thẻ tín dụng|ví điện tử)\b/), ["Vậy gọi tổng đài ngân hàng khoá thẻ NGAY nha, trước khi làm gì khác. Ví điện tử thì đổi mật khẩu, khoá tài khoản luôn."]],
      [VN(/\b(điện thoại|sim)\b/), ["Mất điện thoại thì gọi nhà mạng khoá SIM trước, rồi đổi mật khẩu email, mạng xã hội, ví điện tử. Dùng tính năng Tìm thiết bị (Google/Apple) để định vị hoặc khoá máy từ xa."]],
      [VN(/\b(giấy tờ|căn cước|cccd|bằng lái)\b/), ["Giấy tờ thì trình báo công an phường nơi mất để được xác nhận, rồi làm lại. Nhờ Lomi nhắc: đừng tin người lạ nhắn đòi tiền chuộc giấy tờ nha."]],
      [VN(/\b(tìm được|tìm thấy|có người trả|lấy lại được)\b/), ["Ôi mừng quá 🥳 Đúng là còn người tốt ghê. Nhớ cảm ơn người ta nha!"]],
    ],
    advice: [
      "Khoá thẻ ngân hàng, SIM, ví điện tử ngay nếu có mất.",
      "Nhớ lại các chỗ vừa ghé và hỏi lại, nhiều khi có người giữ giùm.",
      "Bị trộm, cướp thì trình báo công an nơi gần nhất; nguy hiểm thì gọi 113.",
    ],
  },
  {
    id: "late",
    label: "bị trễ giờ",
    re: VN(/\b(trễ giờ|đi trễ|bị trễ|trễ hẹn|ngủ quên|dậy trễ|trễ lắm|trễ rồi)\b/),
    react: ["Hic, trễ giờ là cuống lắm ha 😅 Trễ gì vậy bạn — đi làm, đi học hay hẹn ai?"],
    follow: [
      [VN(/\b(đi làm|sếp|công ty)\b/), ["Vậy nhắn báo quản lý ngắn gọn, thành thật là được nha. Lần sau đặt 2 báo thức cách nhau 10 phút cho chắc 😄"]],
      [VN(/\b(đi học|thi|lớp)\b/), ["Nhắn thầy cô hoặc bạn cùng lớp báo giúp nha. Chạy xe an toàn, trễ chút còn hơn té 🙏"]],
      [VN(/\b(hẹn|người yêu|bạn)\b/), ["Nhắn xin lỗi trước, kèm giờ tới dự kiến là người ta dễ thông cảm liền 😊"]],
    ],
    advice: ["Chuẩn bị đồ từ tối hôm trước.", "Đặt 2 báo thức, để điện thoại xa giường để phải dậy tắt.", "Tính dư 10–15 phút đi đường, nhất là trời mưa."],
  },
  {
    id: "stoodup",
    label: "bị cho leo cây",
    re: VN(/\b(leo cây|cho leo cây|bùng hẹn|bị huỷ hẹn|huỷ hẹn|chờ hoài không tới|bị bỏ hẹn|không đến hẹn|seen không trả lời)\b/),
    react: ["Bị cho leo cây thì vừa bực vừa tủi ghê 😤 Người ta có báo gì không hay im luôn vậy?"],
    follow: [
      [VN(/\b(im luôn|không báo|không nói gì|không trả lời)\b/), ["Im luôn thì hơi thiếu tôn trọng thật đó 😕 Bạn có quyền buồn. Nếu muốn, cứ nhắn nhẹ nhàng hỏi lý do — còn không thì đừng tự trách mình nha."]],
      [VN(/\b(có báo|xin lỗi|bận đột xuất|có việc)\b/), ["Có báo và xin lỗi thì cũng đỡ ha. Nếu chỉ là lần đầu thì thông cảm được; lặp lại nhiều lần thì bạn nên nói rõ cảm giác của mình."]],
    ],
    advice: ["Hỏi thẳng một lần cho rõ, đừng đoán già đoán non.", "Dùng thời gian đó làm điều gì đó cho mình — đi dạo, ăn món mình thích.", "Nếu người đó hay vậy, cân nhắc bớt kỳ vọng vào họ."],
  },
  {
    id: "outage",
    label: "bị cúp điện, mất mạng",
    re: VN(/\b(mất điện|cúp điện|mất nước|cúp nước|mất mạng|rớt mạng|mạng yếu|wifi hư|mất wifi)\b/),
    react: ["Cúp điện, mất mạng là chán hết biết luôn 😩 Bị lâu chưa bạn?"],
    follow: [[VN(/\b(lâu|cả ngày|từ sáng|mấy tiếng)\b/), ["Lâu vậy thì khổ thiệt 😣 Bạn thử gọi tổng đài điện lực/nhà mạng hỏi giờ có lại nha. Tranh thủ nghỉ ngơi, đọc sách, ra ngoài dạo chút cũng được."]]],
    advice: ["Gọi tổng đài điện lực hoặc nhà mạng để hỏi lịch khôi phục.", "Giữ pin điện thoại, bật chế độ tiết kiệm pin.", "Ra quán cà phê gần nhà ngồi tạm nếu cần làm việc."],
  },
  {
    id: "badfood",
    label: "ăn trúng quán dở",
    re: VN(/\b(ăn dở|đồ ăn dở|dox ăn dở|ăn không ngon|quán dở|quán dox dở|dở tệ|dở ẹc|dở ò|dở không ăn được|bị chặt chém|bị chém giá|bị hốt giá|phục vụ tệ|nhân viên thái độ)\b/),
    react: ["Ăn trúng quán dở hay bị chặt chém là mất hứng ghê 😒 Quán đó sao vậy bạn?"],
    follow: [[VN(/\b(đắt|mắc|giá|tính tiền|chặt chém)\b/), ["Bị tính giá cao bất thường thì bạn có quyền hỏi lại hoá đơn chi tiết nha. Nếu quán có trong app, bạn có thể để lại đánh giá hoặc gửi Báo cáo cho Ban quản trị."]]],
    advice: ["Xem đánh giá quán trong mục Khám phá (/kham-pha) trước khi ghé.", "Hỏi giá trước với món không ghi giá.", "Đánh giá thật lòng để người khác tham khảo."],
  },
  {
    id: "scam",
    label: "bị lừa",
    re: VN(/\b(bị lừa|bị scam|bị gạt|lừa đảo|mất tiền vì|chuyển nhầm|bị chiếm đoạt|lừa tiền)\b/),
    react: ["Trời ơi, bị lừa là vừa mất tiền vừa ức lắm 😣 Bạn bị lừa qua đâu vậy — mạng xã hội, điện thoại hay gặp trực tiếp?"],
    follow: [[VN(/\b(chuyển khoản|ngân hàng|chuyển tiền)\b/), ["Gọi ngay tổng đài ngân hàng báo giao dịch lừa đảo và nhờ phong toả nếu kịp nha. Giữ lại toàn bộ tin nhắn, biên lai chuyển tiền để trình báo công an."]]],
    advice: [
      "Liên hệ ngân hàng ngay để báo giao dịch lừa đảo.",
      "Chụp lại toàn bộ bằng chứng và trình báo công an nơi gần nhất.",
      "Nếu người đó dùng iLomi, bấm Báo cáo trên hồ sơ họ để Ban quản trị xử lý.",
      "Tuyệt đối đừng chuyển thêm tiền dù họ hứa “hoàn tiền” hay “lấy lại giúp”.",
    ],
  },
  {
    id: "goodnews",
    label: "có tin vui",
    good: true,
    re: VN(/\b(được tăng lương|tăng lương rồi|lên chức|thăng chức|trúng tuyển|đậu phỏng vấn|đỗ đại học|thi đậu|đậu rồi|tốt nghiệp rồi|có việc rồi|nhận việc rồi|trúng số|được thưởng|được khen|thành công rồi|bán được hàng|chốt đơn|(mới|vừa|đã) khai trương|khai trương (rồi|xong|thành công|suôn sẻ))\b/),
    react: ["Wow chúc mừng bạn nha 🎉🥳 Nghe mà Lomi vui lây luôn! Kể Lomi nghe thêm với, bạn đã cố gắng thế nào để có được vậy?", "Tuyệt vời quá 🎊 Bạn xứng đáng lắm đó! Tính ăn mừng sao đây?"],
    follow: [[VN(/\b(ăn mừng|đi ăn|đi chơi|đãi bạn|tự thưởng)\b/), ["Ăn mừng là phải rồi 🥂 Muốn tìm quán ngon có ưu đãi thì hỏi Lomi “quán nào ngon” nha, Lomi tìm giùm!"]]],
    advice: ["Tự thưởng cho mình một chút — bạn xứng đáng mà.", "Ghi lại khoảnh khắc này, lúc nản nhìn lại sẽ có động lực.", "Chia vui với người thân, niềm vui được nhân đôi."],
  },
  {
    id: "birthday",
    label: "sinh nhật",
    good: true,
    re: VN(/\b(sinh nhật (mình|tôi|em|tui)|hôm nay sinh nhật|nay sinh nhật|mai sinh nhật)\b/),
    react: ["Chúc mừng sinh nhật bạn nha 🎂🎉 Tuổi mới thật nhiều sức khoẻ, niềm vui và may mắn! Hôm nay tính đi đâu chơi không?"],
    follow: [[VN(/\b(ở nhà|một mình|không ai nhớ|không ai chúc)\b/), ["Không sao, có Lomi nhớ nè 🥰 Tự thưởng cho mình một món ngon, một ly nước yêu thích nha — sinh nhật là ngày để thương bản thân nhiều hơn."]]],
    advice: ["Tự thưởng một món bạn thích.", "Viết vài điều bạn muốn làm trong tuổi mới.", "Hẹn một người bạn đi ăn cà phê cho vui."],
  },
  {
    // 21/10 (QA Q23): "mai a có cuộc hẹn quan trọng, nhắc a chuẩn bị tinh thần" — trước đây "Vậy hả 😄 Có gì kể tiếp em nghe nha."
    id: "bigday",
    label: "sắp có buổi hẹn quan trọng",
    re: VN(/\b((cuộc|buổi) (hẹn|gặp|họp|gặp mặt|phỏng vấn|thuyết trình|ra mắt|ký hợp đồng) quan trọng|chuẩn bị tinh thần)\b/),
    react: [
      "Sắp có hẹn quan trọng hả 💪 Lomi chưa đặt nhắc giờ được, nhưng giúp bạn chuẩn bị tinh thần nè:\n• Tối nay chuẩn bị sẵn đồ mặc, giấy tờ, đường đi\n• Nghĩ trước 2–3 điều chính bạn muốn nói\n• Ngủ sớm, sáng ăn nhẹ, đi sớm 10–15 phút cho khỏi vội\n• Trước lúc vào, hít sâu chậm vài hơi — hồi hộp là vì mình quan tâm, không phải vì mình yếu\n\nChúc bạn thật suôn sẻ nha 🍀",
    ],
    follow: [
      [VN(/\b(lo quá|run|hồi hộp|sợ)\b/), ["Hồi hộp là bình thường lắm 🤗 Thử tập nói trước gương phần mở đầu vài lần, và nhắc mình: chỉ cần làm hết sức, kết quả thế nào cũng không định nghĩa con người của bạn. Lomi tin bạn làm được 🍀"]],
    ],
    advice: ["Chuẩn bị đồ, giấy tờ từ tối hôm trước.", "Ngủ đủ quan trọng hơn thức khuya nghĩ thêm.", "Hít thở chậm vài lần trước khi bắt đầu."],
  },
  {
    id: "exam",
    label: "sắp thi / phỏng vấn",
    re: VN(/\b(sắp thi|mai thi|tuần sau thi|sắp phỏng vấn|mai phỏng vấn|sắp thuyết trình|mai thuyết trình)\b/),
    react: ["Sắp tới công chuyện lớn hả 💪 Hồi hộp là bình thường nè. Bạn chuẩn bị tới đâu rồi?"],
    follow: [
      [VN(/\b(chưa|chưa học|chưa chuẩn bị|lo quá|run)\b/), ["Không sao, còn thời gian mà. Tập trung vào phần quan trọng nhất trước, ôn theo nhịp 25 phút học – 5 phút nghỉ, và nhớ ngủ đủ tối nay nha. Lomi tin bạn làm được 🍀"]],
      [VN(/\b(xong rồi|ôn xong|chuẩn bị xong|sẵn sàng)\b/), ["Xịn vậy 😎 Giờ chỉ cần ngủ ngon, ăn sáng đầy đủ, tới sớm chút cho bình tĩnh là ổn áp luôn. Chúc bạn thật thuận lợi nha!"]],
    ],
    advice: ["Ngủ đủ đêm trước quan trọng hơn thức khuya ôn thêm.", "Chuẩn bị đồ, giấy tờ từ tối hôm trước.", "Hít thở chậm vài lần trước khi bắt đầu."],
  },
  {
    id: "bored",
    selfOnly: true,
    label: "đang chán, không có gì làm",
    re: VN(/\b(chán quá|chán ghê|chán thật|chán vậy|chán nè|chán á|chán à|chán thật sự|buồn chán|chán chết|rảnh quá|rảnh rồi|ran quá|ran rồi|ran rảnh|không có gì làm|ko có gì làm|rảnh rang|boring|chán đời quá)\b/),
    react: [
      "Chán hả 😆 Vậy để Lomi bày trò nè: bói một lá Tarot xem hôm nay thế nào, lướt Quẹt (/quet) tìm bạn chơi game hay đi cà phê, hoặc Lomi tìm quán ngon gần đây cho bạn đi ăn — bạn thích cái nào?",
      "Rảnh quá thì làm gì vui vui nha 😄 Bạn thích ở nhà hay ra ngoài?",
    ],
    follow: [
      [VN(/\b(ở nhà|nằm nhà|không muốn ra ngoài|lười ra ngoài)\b/), ["Ở nhà thì thử: xem một bộ phim bạn để dành lâu rồi, nấu một món mới, dọn lại góc phòng, gọi video cho bạn cũ, hoặc để Lomi bói một lá cho vui nè 🔮"]],
      [VN(/\b(ra ngoài|đi chơi|đi đâu(?:x)?|ra đường)\b/), ["Ra ngoài thì đi dạo hồ, ghé quán cà phê có view đẹp, hay rủ bạn đi ăn nha 😋 Gõ “quán cà phê nào đang có ưu đãi” là Lomi tìm giùm liền!"]],
      [VN(/\b(game|chơi game)\b/), ["Chơi game thì vào Quẹt (/quet) → mục Game, tìm đồng đội cùng game đang online nha 🎮"]],
    ],
    advice: [
      "Bói một lá Tarot xem thông điệp hôm nay 🔮",
      "Vào Quẹt (/quet) tìm bạn chơi game, đi cà phê, làm quen",
      "Hỏi Lomi “hôm nay ăn gì” để Lomi chọn quán giùm",
      "Ghé phòng chat Cộng đồng (/cong-dong) xem mọi người đang bàn gì",
      "Tập một kỹ năng mới 20 phút: vẽ, nấu ăn, học vài câu tiếng Anh",
    ],
  },
];

// Những chữ có thể đứng TRƯỚC cụm trạng thái mà câu vẫn là nói về chính mình ("hôm nay a đang chán quá", "ở nhà một mình chán ghê").
const SELF_LEAD = new Set("oix a anh e em c chi minh toi tui to t tao dang thay cam hom nay bua gio toi sang trua chieu dem qua lai cu hoi o nha mot ma sao troi oi ui haiz haizz u thi that su day dao luc nay may bay hay van con cung luon".split(" "));
export function eventOf(n: string): Ev | undefined {
  const s = ` ${n} `;
  return EVENTS.find((e) => {
    const m = e.re.exec(s);
    if (!m) return false;
    // Chuyện của chính người nói: trước cụm đó không có một danh từ khác làm chủ ngữ ("công việc", "phim này", "quán đó"…).
    return !e.selfOnly || s.slice(0, m.index).trim().split(" ").every((w) => !w || SELF_LEAD.has(w));
  });
}
export function eventById(id: string): Ev | undefined {
  return EVENTS.find((e) => e.id === id);
}

// Câu trả lời ngắn
// 10/10: nhận cả tiếng đệm cuối câu ("vâng ạ", "dạ vâng", "có nha") — trước đây "vâng ạ" không được hiểu là "có" nên bị nhắc lại "Vâng hả 😔".
export const YES_RE = VN(/^(có|có ạ|có à|có nè|có chứ|có lắm|ừ|u|uh|ừm|um|uhm|uk|đúng|đúng rồi|đúng vậy|vâng|dạ|dạ vâng|vâng ạ|nhiều|nhiều lắm|lắm|rồi|chắc vậy|chắc là vậy|ok|oke|okie)( (ạ|à|a|nha|nhé|nhe|rồi|luôn|chứ|nè|em|e|lomi|vậy))*$/);
export const NO_RE = VN(/^(không|ko|k|kh|hông|hong|hem|khum|chưa|chưa có|không có|không đâu(?:x)?|cũng không|không lắm|bình thường)( (bình thường|thôi|ạ|à|a|nha|lắm|đâu|có|hết|gì|cả))*( thôi)?$/);
export const DUNNO_RE = VN(/\b(không biết|hk bit|k biết|chịu|không rõ|biết đâu(?:x)?|sao biết)\b/);
// Người dùng than Lomi máy móc / không hiểu
export const META_RE =
  VN(/\b(sao cứ nói vậy|cứ nói vậy hoài|nói hoài(?! (mà )?(không|ko|chẳng|chả|chưa) (chịu )?nghe)|nói vậy hoài|lặp lại|lặp đi lặp lại|máy móc|như robot|như cái máy|không hiểu gì|không hiểu mình|nói gì vậy|là sao|ý là sao|ý gì|hiểu không vậy|trả lời gì kỳ|trả lời kỳ vậy|lạc đề|không liên quan)\b|\blà sa(?:o)+\b|^(sa(?:o)+|hể|he|hả|ha|hm(?:m)+)$/);
