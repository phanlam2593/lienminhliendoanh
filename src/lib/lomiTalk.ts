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
  yes?: [RegExp, string[]][]; // người dùng đáp "có/ừ" cho câu hỏi khớp RegExp (câu Lomi vừa hỏi)
  no?: [RegExp, string[]][]; // người dùng đáp "không/chưa"
};

const ACTS: [RegExp, string][] = [
  [/\b(dang|di) an\b|\bdi an\b/, "đi ăn"],
  [/\bdi choi\b/, "đi chơi"],
  [/\bdi lam\b|\bdang lam\b/, "đi làm"],
  [/\bdi hoc\b/, "đi học"],
  [/\bdi cafe\b|\bdi ca phe\b|\bdi cf\b/, "đi cà phê"],
  [/\bdi cho\b/, "đi chợ"],
  [/\bdi ve\b|\bve nha\b|\btren duong ve\b/, "trên đường về"],
  [/\bchay xe\b|\bdi xe\b/, "chạy xe"],
  [/\bhen ho\b|\bdi hen\b/, "đi hẹn hò"],
];
export function activityOf(n: string): string | undefined {
  return ACTS.find(([re]) => re.test(` ${n} `))?.[1];
}

export const EVENTS: Ev[] = [
  {
    id: "rain",
    label: "bị mắc mưa",
    yes: [
      [/về tới nhà chưa/, ["Về tới nhà là yên tâm rồi 🏠 Tắm nước ấm, thay đồ khô, uống gì nóng nóng cho ấm nha. Nay còn chuyện gì vui buồn kể Lomi nghe không?"]],
      [/áo mưa/, ["Có áo mưa là yên tâm rồi 😄 Chạy chậm thôi nha, đường mưa trơn lắm. Bữa ăn vẫn vui chứ?"]],
      [/kịp trú/, ["Vậy may quá 😄 Ngồi trú mưa nghe mưa rơi cũng chill phết. Giờ tạnh chưa?"]],
      [/tạnh chưa/, ["Tạnh rồi là ngon 🌤️ Đi tiếp cẩn thận nha, đường còn ướt dễ trượt đó."]],
      [/ăn ngon|vui chứ/, ["Vậy là vẫn cứu được buổi đi ăn 😋 Mưa mà được ăn đồ nóng thì đúng bài luôn. Bạn ăn món gì vậy?"]],
    ],
    no: [
      [/về tới nhà chưa/, ["Vậy tìm chỗ trú tạm đã nha, đừng cố chạy trong mưa lớn, trơn lắm. Tới nhà rồi nhắn Lomi một tiếng cho Lomi yên tâm 😊"]],
      [/áo mưa/, ["Vậy chắc ướt hết rồi 🥺 Ghé chỗ nào trú tạm nha, về nhớ tắm nước ấm, thay đồ khô kẻo cảm. Lần sau để sẵn áo mưa mỏng trong cốp xe là yên tâm luôn."]],
      [/kịp trú/, ["Tội ghê 🥺 Về tới nhà nhớ tắm nước ấm, thay đồ khô, uống ly trà gừng cho ấm người nha."]],
      [/tạnh chưa/, ["Vậy ngồi trú thêm chút nha, gọi ly gì nóng uống cho ấm 😊 Đừng đội mưa về, dễ cảm lắm."]],
    ],
    re: /\b(mac mua|gap mua|dinh mua|bi mua|troi mua|mua to|mua lon|uot mua|mua bat chot|mua qua|do mua|mua xoi)\b/,
    react: [
      "Trời, {act}mà mắc mưa thì cụt hứng ghê 😣 Bạn kịp trú không, hay bị ướt hết rồi?",
      "Ui, mưa bất chợt kiểu Đà Lạt đó hả 🌧️ {Act}mà gặp mưa thì mất vui thật. Có mang áo mưa theo không?",
    ],
    follow: [
      [/\b(uot|uot het|uot sung|uot nhem|uot nhep|lanh qua|lanh run|run|uot lanh)\b/, [
        "Tội ghê 🥺 Về tới nhà nhớ tắm nước ấm, thay đồ khô, uống ly trà gừng hay sữa nóng cho ấm người nha — mưa lạnh dễ bị cảm lắm. Còn bữa ăn thì sao, vẫn ăn ngon chứ?",
        "Ướt hết là khó chịu lắm luôn 😣 Lau khô người, thay đồ ấm liền nha, đừng để lạnh lâu kẻo cảm. Giờ bạn về tới nhà chưa?",
      ]],
      [/\b(kip tru|dang tru|tru mua|co ao mua|mac ao mua|khong uot|khong sao)\b/, [
        "Vậy may quá 😄 Ngồi trú mưa nghe tiếng mưa rơi cũng chill phết đó. Giờ tạnh chưa?",
        "Hên ghê 😆 Có áo mưa là yên tâm rồi. Chạy chậm thôi nha, đường mưa trơn lắm.",
      ]],
      [/\b(ve nha roi|ve toi nha|toi nha roi|ve roi)\b/, ["Về tới nhà là yên tâm rồi 🏠 Tắm nước ấm, nghỉ ngơi chút nha. Nay còn chuyện gì vui hay buồn kể Lomi nghe không?"]],
      [/\b(tanh roi|het mua)\b/, ["Tạnh rồi là ngon 🌤️ Đi tiếp cẩn thận nha, đường còn ướt dễ trượt đó."]],
      [/\b(an ngon|van an|an duoc|ngon)\b/, ["Vậy là vẫn cứu được bữa ăn 😋 Mưa mà được ăn đồ nóng thì đúng bài luôn. Bạn ăn món gì vậy?"]],
      [/\b(huy|khong an duoc|bo bua|dong cua|nguoi het)\b/, ["Tiếc ghê 🥲 Hẹn bữa khác đi ăn bù nha. Giờ về nấu gì nóng nóng ăn tạm cho ấm bụng đã."]],
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
    re: /\b(ket xe|tac duong|ket cung|ket xe qua|dong xe qua|ket o)\b/,
    react: ["Kẹt xe là mệt nhất luôn 😮‍💨 Bạn đang kẹt lâu chưa, có gấp giờ không?", "Ui, {act}mà kẹt xe thì nản ghê 😩 Có trễ hẹn gì không?"],
    follow: [
      [/\b(tre|muon|gap|tre hen|tre gio)\b/, ["Trễ thì nhắn báo trước một tiếng cho người ta yên tâm nha. Chạy chậm, an toàn là trên hết 🙏"]],
      [/\b(thoat roi|het ket|di duoc roi|toi noi roi)\b/, ["Thoát kẹt rồi là nhẹ cả người ha 😄 Đi đường cẩn thận nha!"]],
    ],
    advice: ["Thử mở bản đồ xem đường vòng nào đang thoáng.", "Tranh thủ nghe nhạc, podcast cho đỡ sốt ruột.", "Nếu có hẹn, nhắn báo sớm là người ta thông cảm liền."],
  },
  {
    id: "vehicle",
    label: "bị hư xe giữa đường",
    re: /\b(hu xe|xe hu|xe bi hu|xep lop|thung lop|banh xe xep|xe chet may|het xang|xe khong no|xe khong chay|dut day sen|xe tat may)\b/,
    react: ["Ôi xui ghê 😣 Bạn có an toàn không, đang ở chỗ nào vậy?", "Trời, {act}mà hư xe thì hoảng lắm 😰 Có gần tiệm sửa nào không?"],
    follow: [
      [/\b(khong co tiem|xa tiem|khong biet o dau|vang|dem|toi roi|troi toi|khuya)\b/, ["Vậy dắt xe vào lề chỗ sáng, an toàn trước nha. Gọi người thân hoặc đặt xe ở mục Đưa đón (/dua-don) để về trước, xe tính sau cũng được 🙏"]],
      [/\b(sua roi|sua xong|co tiem|gan tiem)\b/, ["May quá 😄 Sửa xong thì nhớ kiểm tra lại lốp, xăng trước khi đi xa nha."]],
    ],
    advice: ["Dắt xe vào lề, bật đèn cảnh báo nếu trời tối.", "Hỏi người dân gần đó tiệm sửa xe gần nhất.", "Cần về gấp thì đặt xe ở mục Đưa đón (/dua-don) trong app."],
  },
  {
    id: "lost",
    label: "bị mất đồ",
    re: /\b(mat vi|mat bop|mat dien thoai|roi mat|danh roi|lam mat|bi moc tui|mat tien|mat giay to|mat chia khoa|bi trom|bi cuop|mat xe)\b/,
    react: ["Trời ơi, mất đồ là hoảng lắm 😰 Bạn mất lúc nào, ở đâu vậy?", "Xui quá 😣 Mất những gì vậy bạn, có giấy tờ hay thẻ ngân hàng không?"],
    follow: [
      [/\b(the|ngan hang|atm|the tin dung|vi dien tu)\b/, ["Vậy gọi tổng đài ngân hàng khoá thẻ NGAY nha, trước khi làm gì khác. Ví điện tử thì đổi mật khẩu, khoá tài khoản luôn."]],
      [/\b(dien thoai|sim)\b/, ["Mất điện thoại thì gọi nhà mạng khoá SIM trước, rồi đổi mật khẩu email, mạng xã hội, ví điện tử. Dùng tính năng Tìm thiết bị (Google/Apple) để định vị hoặc khoá máy từ xa."]],
      [/\b(giay to|can cuoc|cccd|bang lai)\b/, ["Giấy tờ thì trình báo công an phường nơi mất để được xác nhận, rồi làm lại. Nhờ Lomi nhắc: đừng tin người lạ nhắn đòi tiền chuộc giấy tờ nha."]],
      [/\b(tim duoc|tim thay|co nguoi tra|lay lai duoc)\b/, ["Ôi mừng quá 🥳 Đúng là còn người tốt ghê. Nhớ cảm ơn người ta nha!"]],
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
    re: /\b(tre gio|di tre|bi tre|tre hen|ngu quen|day tre|tre lam|tre roi)\b/,
    react: ["Hic, trễ giờ là cuống lắm ha 😅 Trễ gì vậy bạn — đi làm, đi học hay hẹn ai?"],
    follow: [
      [/\b(di lam|sep|cong ty)\b/, ["Vậy nhắn báo quản lý ngắn gọn, thành thật là được nha. Lần sau đặt 2 báo thức cách nhau 10 phút cho chắc 😄"]],
      [/\b(di hoc|thi|lop)\b/, ["Nhắn thầy cô hoặc bạn cùng lớp báo giúp nha. Chạy xe an toàn, trễ chút còn hơn té 🙏"]],
      [/\b(hen|nguoi yeu|ban)\b/, ["Nhắn xin lỗi trước, kèm giờ tới dự kiến là người ta dễ thông cảm liền 😊"]],
    ],
    advice: ["Chuẩn bị đồ từ tối hôm trước.", "Đặt 2 báo thức, để điện thoại xa giường để phải dậy tắt.", "Tính dư 10–15 phút đi đường, nhất là trời mưa."],
  },
  {
    id: "stoodup",
    label: "bị cho leo cây",
    re: /\b(leo cay|cho leo cay|bung hen|bi huy hen|huy hen|cho hoai khong toi|bi bo hen|khong den hen|seen khong tra loi)\b/,
    react: ["Bị cho leo cây thì vừa bực vừa tủi ghê 😤 Người ta có báo gì không hay im luôn vậy?"],
    follow: [
      [/\b(im luon|khong bao|khong noi gi|khong tra loi)\b/, ["Im luôn thì hơi thiếu tôn trọng thật đó 😕 Bạn có quyền buồn. Nếu muốn, cứ nhắn nhẹ nhàng hỏi lý do — còn không thì đừng tự trách mình nha."]],
      [/\b(co bao|xin loi|ban dot xuat|co viec)\b/, ["Có báo và xin lỗi thì cũng đỡ ha. Nếu chỉ là lần đầu thì thông cảm được; lặp lại nhiều lần thì bạn nên nói rõ cảm giác của mình."]],
    ],
    advice: ["Hỏi thẳng một lần cho rõ, đừng đoán già đoán non.", "Dùng thời gian đó làm điều gì đó cho mình — đi dạo, ăn món mình thích.", "Nếu người đó hay vậy, cân nhắc bớt kỳ vọng vào họ."],
  },
  {
    id: "outage",
    label: "bị cúp điện, mất mạng",
    re: /\b(mat dien|cup dien|mat nuoc|cup nuoc|mat mang|rot mang|mang yeu|wifi hu|mat wifi)\b/,
    react: ["Cúp điện, mất mạng là chán hết biết luôn 😩 Bị lâu chưa bạn?"],
    follow: [[/\b(lau|ca ngay|tu sang|may tieng)\b/, ["Lâu vậy thì khổ thiệt 😣 Bạn thử gọi tổng đài điện lực/nhà mạng hỏi giờ có lại nha. Tranh thủ nghỉ ngơi, đọc sách, ra ngoài dạo chút cũng được."]]],
    advice: ["Gọi tổng đài điện lực hoặc nhà mạng để hỏi lịch khôi phục.", "Giữ pin điện thoại, bật chế độ tiết kiệm pin.", "Ra quán cà phê gần nhà ngồi tạm nếu cần làm việc."],
  },
  {
    id: "badfood",
    label: "ăn trúng quán dở",
    re: /\b(an do|do an do|an khong ngon|quan do|bi chat chem|bi chem gia|bi hot gia|phuc vu te|nhan vien thai do)\b/,
    react: ["Ăn trúng quán dở hay bị chặt chém là mất hứng ghê 😒 Quán đó sao vậy bạn?"],
    follow: [[/\b(dat|mac|gia|tinh tien|chat chem)\b/, ["Bị tính giá cao bất thường thì bạn có quyền hỏi lại hoá đơn chi tiết nha. Nếu quán có trong app, bạn có thể để lại đánh giá hoặc gửi Báo cáo cho Ban quản trị."]]],
    advice: ["Xem đánh giá quán trong mục Khám phá (/kham-pha) trước khi ghé.", "Hỏi giá trước với món không ghi giá.", "Đánh giá thật lòng để người khác tham khảo."],
  },
  {
    id: "scam",
    label: "bị lừa",
    re: /\b(bi lua|bi scam|bi gat|lua dao|mat tien vi|chuyen nham|bi chiem doat|lua tien)\b/,
    react: ["Trời ơi, bị lừa là vừa mất tiền vừa ức lắm 😣 Bạn bị lừa qua đâu vậy — mạng xã hội, điện thoại hay gặp trực tiếp?"],
    follow: [[/\b(chuyen khoan|ngan hang|chuyen tien)\b/, ["Gọi ngay tổng đài ngân hàng báo giao dịch lừa đảo và nhờ phong toả nếu kịp nha. Giữ lại toàn bộ tin nhắn, biên lai chuyển tiền để trình báo công an."]]],
    advice: [
      "Liên hệ ngân hàng ngay để báo giao dịch lừa đảo.",
      "Chụp lại toàn bộ bằng chứng và trình báo công an nơi gần nhất.",
      "Nếu người đó dùng Liên Minh Liên Doanh, bấm Báo cáo trên hồ sơ họ để Ban quản trị xử lý.",
      "Tuyệt đối đừng chuyển thêm tiền dù họ hứa “hoàn tiền” hay “lấy lại giúp”.",
    ],
  },
  {
    id: "goodnews",
    label: "có tin vui",
    good: true,
    re: /\b(duoc tang luong|tang luong roi|len chuc|thang chuc|trung tuyen|dau phong van|do dai hoc|thi dau|dau roi|tot nghiep roi|co viec roi|nhan viec roi|trung so|duoc thuong|duoc khen|thanh cong roi|ban duoc hang|chot don|khai truong)\b/,
    react: ["Wow chúc mừng bạn nha 🎉🥳 Nghe mà Lomi vui lây luôn! Kể Lomi nghe thêm với, bạn đã cố gắng thế nào để có được vậy?", "Tuyệt vời quá 🎊 Bạn xứng đáng lắm đó! Tính ăn mừng sao đây?"],
    follow: [[/\b(an mung|di an|di choi|dai ban|tu thuong)\b/, ["Ăn mừng là phải rồi 🥂 Muốn tìm quán ngon có ưu đãi thì hỏi Lomi “quán nào ngon” nha, Lomi tìm giùm!"]]],
    advice: ["Tự thưởng cho mình một chút — bạn xứng đáng mà.", "Ghi lại khoảnh khắc này, lúc nản nhìn lại sẽ có động lực.", "Chia vui với người thân, niềm vui được nhân đôi."],
  },
  {
    id: "birthday",
    label: "sinh nhật",
    good: true,
    re: /\b(sinh nhat (minh|toi|em|tui)|hom nay sinh nhat|nay sinh nhat|mai sinh nhat)\b/,
    react: ["Chúc mừng sinh nhật bạn nha 🎂🎉 Tuổi mới thật nhiều sức khoẻ, niềm vui và may mắn! Hôm nay tính đi đâu chơi không?"],
    follow: [[/\b(o nha|mot minh|khong ai nho|khong ai chuc)\b/, ["Không sao, có Lomi nhớ nè 🥰 Tự thưởng cho mình một món ngon, một ly nước yêu thích nha — sinh nhật là ngày để thương bản thân nhiều hơn."]]],
    advice: ["Tự thưởng một món bạn thích.", "Viết vài điều bạn muốn làm trong tuổi mới.", "Hẹn một người bạn đi ăn cà phê cho vui."],
  },
  {
    id: "exam",
    label: "sắp thi / phỏng vấn",
    re: /\b(sap thi|mai thi|tuan sau thi|sap phong van|mai phong van|sap thuyet trinh|mai thuyet trinh)\b/,
    react: ["Sắp tới công chuyện lớn hả 💪 Hồi hộp là bình thường nè. Bạn chuẩn bị tới đâu rồi?"],
    follow: [
      [/\b(chua|chua hoc|chua chuan bi|lo qua|run)\b/, ["Không sao, còn thời gian mà. Tập trung vào phần quan trọng nhất trước, ôn theo nhịp 25 phút học – 5 phút nghỉ, và nhớ ngủ đủ tối nay nha. Lomi tin bạn làm được 🍀"]],
      [/\b(xong roi|on xong|chuan bi xong|san sang)\b/, ["Xịn vậy 😎 Giờ chỉ cần ngủ ngon, ăn sáng đầy đủ, tới sớm chút cho bình tĩnh là ổn áp luôn. Chúc bạn thật thuận lợi nha!"]],
    ],
    advice: ["Ngủ đủ đêm trước quan trọng hơn thức khuya ôn thêm.", "Chuẩn bị đồ, giấy tờ từ tối hôm trước.", "Hít thở chậm vài lần trước khi bắt đầu."],
  },
  {
    id: "bored",
    label: "đang chán, không có gì làm",
    re: /\b(chan qua|chan ghe|chan that|chan vay|chan ne|chan a|chan that su|buon chan|chan chet|ran qua|ran roi|khong co gi lam|ko co gi lam|ran ranh|boring|chan doi qua)\b/,
    react: [
      "Chán hả 😆 Vậy để Lomi bày trò nè: bói một lá Tarot xem hôm nay thế nào, lướt Quẹt (/quet) tìm bạn chơi game hay đi cà phê, hoặc Lomi tìm quán ngon gần đây cho bạn đi ăn — bạn thích cái nào?",
      "Rảnh quá thì làm gì vui vui nha 😄 Bạn thích ở nhà hay ra ngoài?",
    ],
    follow: [
      [/\b(o nha|nam nha|khong muon ra ngoai|luoi ra ngoai)\b/, ["Ở nhà thì thử: xem một bộ phim bạn để dành lâu rồi, nấu một món mới, dọn lại góc phòng, gọi video cho bạn cũ, hoặc để Lomi bói một lá cho vui nè 🔮"]],
      [/\b(ra ngoai|di choi|di dau|ra duong)\b/, ["Ra ngoài thì đi dạo hồ, ghé quán cà phê có view đẹp, hay rủ bạn đi ăn nha 😋 Gõ “quán cà phê nào đang có ưu đãi” là Lomi tìm giùm liền!"]],
      [/\b(game|choi game)\b/, ["Chơi game thì vào Quẹt (/quet) → mục Game, tìm đồng đội cùng game đang online nha 🎮"]],
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

export function eventOf(n: string): Ev | undefined {
  return EVENTS.find((e) => e.re.test(` ${n} `));
}
export function eventById(id: string): Ev | undefined {
  return EVENTS.find((e) => e.id === id);
}

// Câu trả lời ngắn
export const YES_RE = /^(co|co a|co ne|co chu|co lam|u|uh|um|uhm|uk|dung|dung roi|dung vay|vang|da|nhieu|nhieu lam|lam|roi|chac vay|chac la vay|ok)$/;
export const NO_RE = /^(khong|ko|k|kh|hong|hem|khum|chua|chua co|khong co|khong dau|cung khong|khong lam|binh thuong)( (binh thuong|thoi|a|nha|lam|dau|co|het|gi|ca))*( thoi)?$/;
export const DUNNO_RE = /\b(khong biet|hk bit|k biet|chiu|khong ro|biet dau|sao biet)\b/;
// Người dùng than Lomi máy móc / không hiểu
export const META_RE =
  /\b(sao cu noi vay|cu noi vay hoai|noi hoai|noi vay hoai|lap lai|lap di lap lai|may moc|nhu robot|nhu cai may|khong hieu gi|khong hieu minh|noi gi vay|la sao|y la sao|y gi|hieu khong vay|tra loi gi ky|tra loi ky vay|lac de|khong lien quan)\b|\bla sao+\b|^(sao+|he|ha|hmm+)$/;
