// ─────────────────────────────────────────────────────────────────────────────
// THƯ VIỆN TÂM SỰ MỞ RỘNG (30/09 r3, theo ý Kir) — tư vấn tâm lý, tình cảm, sức khoẻ.
// Dùng chung khung với lib/lomiHeart.ts (đặt TRƯỚC các chủ đề cũ nên từ khoá phải cụ thể).
// Nguyên tắc: kiến thức phổ thông, nói nhẹ nhàng; sức khoẻ thì KHÔNG kê thuốc/liều lượng, luôn khuyên
// gặp bác sĩ khi cần; ăn uống rối loạn thì không đưa con số hay chế độ ăn; nguy hiểm → 113 / 115.
// ⚠️ Ý định tự hại luôn do lomiChat.crisisReply xử lý trước.
// ─────────────────────────────────────────────────────────────────────────────

import type { Theme } from "@/lib/lomiHeart";
import { VR, VN } from "@/lib/viMatch";


export const MORE_THEMES: Theme[] = [
  // ═══════════════════════ 21/10 (QA V3 tự soạn) ═══════════════════════
  // Người lớn quen trẻ vị thành niên (em gái 15 tuổi quen người 25 tuổi) — trước đây bài "lo âu" chung.
  {
    id: "minorrel",
    howto: true,
    re: VN(/\b(em gái|con gái|cháu gái|em trai|con trai|cháu|em|con|bé)( \S+){0,3} (1[0-7]|mười (ba|bốn|lăm|sáu|bảy)) tuổi( \S+){0,6} (quen|yêu|hẹn hò|cặp|qua lại|nói chuyện)( \S+){0,3} (với )?(một )?(người|anh|chú|ông|ông chú|gã|đàn ông|ổng|thằng)( \S+){0,3} (\d{2}|hai mươi|ba mươi|bốn mươi)( \S+)? tuổi\b/),
    feel: ["Bạn lo là đúng rồi — đây là chuyện cần người lớn trong nhà để tâm."],
    insight: ["Một người trưởng thành hẹn hò với một bạn dưới 18 tuổi có sự chênh lệch rất lớn về tuổi, kinh nghiệm và quyền lực — dễ dẫn tới thao túng. Ở Việt Nam, mọi quan hệ tình dục với người dưới 16 tuổi đều là tội phạm, kể cả khi bạn nhỏ \"đồng ý\"."],
    step: ["Nói chuyện với em bằng sự quan tâm, không trách mắng — để em còn muốn kể với gia đình. Nếu nghi em bị dụ dỗ, xâm hại hay đe doạ: gọi tổng đài bảo vệ trẻ em **111** (miễn phí, 24/7) hoặc báo công an **113**."],
    stepFirst: true,
    ask: ["Ba mẹ đã biết chuyện này chưa?"],
    advice: [
      "Nói chuyện với em nhẹ nhàng, hỏi han chứ không cấm đoán gay gắt hay chê bai em — bị trách dễ làm em giấu và gần người kia hơn.",
      "Báo cho ba mẹ / người giám hộ của em biết; người lớn trong nhà cần cùng theo dõi.",
      "Để ý dấu hiệu đáng lo: người kia bảo em giữ bí mật, tặng quà / tiền, tách em khỏi gia đình bạn bè, rủ gặp riêng, xin ảnh nhạy cảm.",
      "Nếu nghi em bị xâm hại, bị dụ dỗ hay đe doạ: gọi tổng đài bảo vệ trẻ em **111** (miễn phí, 24/7) hoặc báo công an **113**; giữ lại tin nhắn làm bằng chứng.",
    ],
  },
  // Uống rượu mỗi ngày, khó ngưng — trước đây "Nghe là thấy vui rồi 🍻".
  {
    id: "alcohol",
    howto: true,
    re: VN(/\b((uống|nhậu) (rượu|bia)( \S+){0,4} (mỗi|hằng|hàng|hầu như mỗi) (tối|ngày|đêm)|(khó|không) (ngưng|bỏ|dừng|cai) (được )?(rượu|bia|nhậu)|(rượu|bia|nhậu)( \S+){0,4} (khó|không thể|không) (ngưng|bỏ|dừng|cai)|nghiện rượu|nghiện bia|cai rượu|cai bia)\b|\b(uống rượu|uống bia|nhậu)\b.*\b(khó ngưng|khó bỏ|không bỏ được|không ngưng được)\b/),
    feel: ["Nhận ra mình khó ngưng uống và muốn thay đổi là bước khó nhất — bạn đã làm được rồi đó 💪"],
    insight: ["Uống hằng ngày lâu ngày thì cơ thể quen dần, nên ngưng thấy khó là bình thường, không phải do bạn yếu ý chí."],
    step: ["Ghi lại mỗi ngày uống bao nhiêu, lúc nào, vì sao — để thấy rõ thói quen."],
    ask: ["Thường bạn uống vào lúc nào, và vì chuyện gì?"],
    advice: [
      "Đừng ngưng đột ngột nếu đã uống nhiều mỗi ngày trong thời gian dài — có thể bị run, vã mồ hôi, bồn chồn, nặng thì co giật, lú lẫn. Nên nói với bác sĩ để có kế hoạch giảm an toàn.",
      "Giảm dần và đặt ngày không uống trong tuần; không để sẵn rượu bia trong nhà.",
      "Thay thói quen: lúc hay uống thì đi bộ, tắm, gọi cho ai đó, uống trà / nước.",
      "Nói với người thân để có người đồng hành; bác sĩ (Nội, Tâm thần) có cách hỗ trợ cai rượu hiệu quả.",
    ],
  },
  // Thói quen kiểm tra / rửa lặp lại (Q39) — không chẩn đoán.
  {
    id: "ocd",
    re: VN(/\b(kiểm tra (lại )?(khoá|khóa|bếp|ga|điện|cửa)( \S+){0,3} (nhiều lần|chục lần|mấy lần|hoài|liên tục|cả chục)|rửa tay (hoài|liên tục|chục lần|nhiều lần)|ám ảnh cưỡng chế|ocd|phải làm (đi làm )?lại (nhiều lần|hoài) mới yên tâm)\b/),
    feel: ["Phải kiểm tra đi kiểm tra lại mới yên tâm thì mệt và mất thời gian lắm, Lomi hiểu."],
    insight: ["Lomi không chẩn đoán được, nhưng kiểu lặp lại để bớt lo này hay gặp khi đang căng thẳng, lo âu; nếu nó chiếm nhiều thời gian, làm bạn khổ sở hay ảnh hưởng sinh hoạt thì có thể là rối loạn ám ảnh cưỡng chế — một tình trạng điều trị được."],
    step: ["Thử kiểm tra MỘT lần thật chậm, nói thành tiếng “mình đã khoá cửa rồi”, chụp một tấm ảnh — rồi đi, không quay lại."],
    ask: ["Mỗi ngày việc kiểm tra này mất của bạn khoảng bao lâu?"],
    advice: ["Kiểm tra một lần có chủ ý, kèm ghi nhớ (nói thành tiếng, chụp ảnh).", "Nếu chiếm hơn khoảng một giờ mỗi ngày hay làm bạn rất khổ sở, gặp bác sĩ tâm thần / chuyên gia tâm lý — liệu pháp nhận thức hành vi giúp rất nhiều."],
    heavy: true,
  },
  // Cảm giác ai cũng ghét mình (Q40).
  {
    id: "disliked",
    re: VN(/\b((ai|mọi người|cả lớp|cả công ty|cả nhà) (cũng|đều) (ghét|không ưa|khinh|xa lánh) (mình|anh|em|tôi|tui|tớ|a|e))\b/),
    feel: ["Cảm giác ai cũng ghét mình nặng nề lắm, như đi đâu cũng thấy mình lạc lõng."],
    insight: ["Khi đang buồn hay mệt, đầu óc dễ đọc mọi phản ứng của người khác thành “họ ghét mình” — có khi đúng với một vài người, nhưng hiếm khi đúng với tất cả."],
    step: ["Thử viết ra: chuyện gì cụ thể làm bạn nghĩ vậy, và có ai vẫn đối xử tốt với bạn không."],
    ask: ["Gần đây có chuyện gì làm bạn thấy như vậy không?"],
    advice: ["Tách điều đã xảy ra với điều mình đoán.", "Giữ liên lạc với một hai người bạn thấy an toàn.", "Cảm giác này kéo dài kèm buồn bã, muốn thu mình thì nên nói chuyện với chuyên gia tâm lý."],
  },
  // Bạn mượn tiền không trả (Q27).
  {
    id: "debtfriend",
    howto: true,
    re: VN(/\b((bạn|bạn thân|người quen|đồng nghiệp|họ hàng)( \S+){0,3} (mượn|vay) (tiền|\d+)( \S+){0,6} (chưa|không|chẳng) (trả|đưa lại)|(mượn|vay) tiền( \S+){0,4} (né|lơ|trốn|không trả|chưa trả))\b/),
    feel: ["Cho bạn thân mượn tiền rồi bị né thì vừa tiếc tiền vừa buồn vì tình bạn, Lomi hiểu."],
    insight: ["Nhiều khi người mượn né vì ngại chưa có tiền trả, chứ chưa chắc là cố tình quỵt. Nói rõ ràng, bình tĩnh thường giữ được cả tiền lẫn tình hơn."],
    step: ["Nhắn một tin rõ ràng, không trách móc, đề nghị một cách trả cụ thể."],
    ask: ["Số tiền đó có ảnh hưởng nhiều tới chi tiêu của bạn không?"],
    advice: [
      "Nhắn rõ mà nhẹ: “Khoản mình cho bạn mượn hồi tháng 4, bạn tính trả sao cho tiện? Chia làm vài lần cũng được.”",
      "Đề nghị trả góp, đặt mốc cụ thể — dễ được đồng ý hơn đòi một lần.",
      "Giữ lại tin nhắn, giấy tờ mượn tiền (nếu có).",
      "Nếu số tiền lớn mà người kia cố tình không trả, có thể nhờ người có uy tín hai bên nói giúp, hoặc hỏi luật sư về thủ tục đòi nợ dân sự.",
    ],
  },
  // ═══════════════════════ 21/10 (QA V2) — tình cảm: không đoán ý, thử lòng, mâu thuẫn thực tế, ranh giới ═══════════════════════
  // Q51–Q53: đoán ý người yêu qua một dấu hiệu (đã xem không trả lời, đăng bài buồn, "tùy em") — trước đây FAQ "tin nhắn", "đăng bài".
  {
    id: "mindread",
    re: VN(/\b((xem|seen|đã xem|đọc)( tin nhắn)? (nhưng|mà) (chưa|không|chẳng) (trả lời|rep|nhắn lại)|(chưa|không) (trả lời|rep|nhắn lại)( tin nhắn)? (\d+|mấy|vài|cả|hơn) (tiếng|giờ|ngày)|đăng (bài|status|story|stt) (buồn|bóng gió|ẩn ý|than)|(chắc chắn|có phải|chắc là) (là )?đang (nói|ám chỉ|đá xéo|nhắc) (anh|em|mình|tôi|tui)|(nói|bảo|kêu) (‘|'|"|“)?tùy (em|anh)|tùy em (mỗi|hoài|suốt))\b/),
    feel: ["Đoán ý người mình thương qua vài dấu hiệu nhỏ là chuyện ai cũng từng làm — và nó làm mình thấp thỏm lắm."],
    insight: ["Một dấu hiệu đơn lẻ thì chưa đủ để biết người kia nghĩ gì. Đoán rồi tin chắc vào phỏng đoán dễ làm mình buồn thêm hoặc phản ứng sai — cách nhanh nhất để hết đoán là hỏi thẳng, nhẹ nhàng."],
    step: ["Tách ra: điều mình THẤY (vd đã xem, chưa trả lời) và điều mình ĐOÁN (vd chán mình) — phần đoán thì chưa phải sự thật."],
    ask: ["Gần đây hai bạn có chuyện gì làm bạn bất an không, hay chỉ mới lần này?"],
    advice: ["Hỏi thẳng mà nhẹ, nói về cảm giác của mình thay vì buộc tội.", "Nếu chuyện lặp lại nhiều, nói ra một mong muốn cụ thể thay vì để mình đoán mãi."],
    hint: [
      [VN(/\b(xem|seen|đọc|trả lời|rep|nhắn lại)\b/), "Chưa trả lời vài tiếng thì **chưa nói lên được** là người ấy chán bạn đâu — có thể đang bận, đang mệt, đang nghĩ cách trả lời, hoặc đọc rồi quên. Một dấu hiệu đơn lẻ thì chưa đủ để kết luận.\n\nNếu chuyện này lặp lại và làm bạn bất an, nói nhẹ nhàng lúc gặp: “Mình hay thấp thỏm khi tin nhắn lâu được trả lời, bạn bận thì nhắn mình một chữ thôi cũng được nha.” Gần đây hai bạn có chuyện gì làm bạn lo không?", true],
      [VN(/\b(đăng|bài|status|story|stt)\b/), "Bài đăng buồn sau khi cãi nhau thì **có thể** liên quan, cũng **có thể không** — mình chỉ thấy được bài đăng, còn điều cô ấy nghĩ thì chưa biết chắc. Tin chắc vào phỏng đoán dễ làm mình buồn thêm hoặc phản ứng sai.\n\nCách rõ nhất là hỏi thẳng mà nhẹ: “Mình thấy bài bạn đăng, bạn còn buồn chuyện hôm trước không? Mình muốn nói chuyện lại cho đàng hoàng.”", true],
      [VN(/\btùy (em|anh)\b/), "“Tùy em” có thể là **đồng ý thật**, cũng có thể là **mệt, không muốn cãi tiếp**, hay **đang khó chịu mà không nói ra** — chỉ từ chữ đó thì không biết chắc được, nên đừng tự gán một ý cho người ấy.\n\nThử hỏi lúc cả hai bình tĩnh: “Mỗi lần bạn nói ‘tùy em’, mình không biết là bạn đồng ý hay đang không vui. Lần sau bạn nói thật cảm giác của bạn được không, mình muốn hiểu bạn.”", true],
    ],
  },
  // Q54: người yêu muốn giữ mật khẩu riêng — trước đây FAQ "quên mật khẩu".
  {
    id: "privacy",
    howto: true,
    re: VN(/\b((giữ|muốn giữ|đặt|có) (mật khẩu|pass|password|mã khoá|mã khóa)( \S+){0,2} riêng|mật khẩu (điện thoại )?riêng|không cho (anh|em|mình|tôi) (biết|xem) (mật khẩu|pass|điện thoại))\b/),
    feel: ["Thấy người yêu giữ mật khẩu riêng mà mình bất an là chuyện dễ hiểu — nhất là khi mình đang cần cảm giác được tin tưởng."],
    insight: ["Muốn giữ mật khẩu riêng **không đồng nghĩa** với đang giấu chuyện xấu — nhiều người chỉ cần một khoảng riêng tư, như nhật ký hay tin nhắn với bạn bè, gia đình. Riêng tư khác với lừa dối."],
    step: ["Nhìn vào cả mối quan hệ: ngoài chuyện mật khẩu, người ấy có minh bạch, nhất quán và tôn trọng bạn không?"],
    ask: ["Ngoài chuyện mật khẩu, có điều gì khác làm bạn mất niềm tin không?"],
    advice: [
      "Riêng tư khác với giấu giếm: nhìn vào cả mối quan hệ — người ấy có minh bạch về những chuyện liên quan tới hai người không.",
      "Nói về **niềm tin**, đừng đòi mật khẩu: “Mình hơi bất an, không phải muốn kiểm tra bạn, mà muốn hai đứa nói chuyện để mình thấy yên tâm hơn.”",
      "Hai người có thể thống nhất ranh giới chung: điều gì là riêng của mỗi người, điều gì cần minh bạch với nhau.",
      "Nếu cảm giác nghi ngờ đến từ một chuyện cụ thể, nói thẳng chuyện đó — đừng lục điện thoại.",
    ],
  },
  // Q55, Q70: thử lòng bằng im lặng / cố làm người yêu ghen — trước đây đọc thành "cô ấy im lặng", "bạn đang ghen".
  {
    id: "testlove",
    howto: true,
    re: VN(/\b((thử|thử lòng|test)( \S+){0,4} (im lặng|biến mất|không nhắn|lơ)|im lặng (vài|mấy|một) (ngày|hôm|tuần) (xem|để xem|coi)|(khiến|làm|chọc|cố tình làm) (cho )?(người yêu|cô ấy|anh ấy|ny|em ấy|người ta|bạn gái|bạn trai)( \S+){0,2} ghen)\b/),
    feel: ["Muốn biết người ấy có quan tâm mình không là mong muốn rất thật — ai cũng cần cảm giác được để ý."],
    insight: ["Nhưng **thử lòng** (im lặng để xem, cố làm người kia ghen) thường phản tác dụng: người kia không biết mình đang bị thử, có thể hiểu là bạn lạnh nhạt hay không nghiêm túc, rồi cả hai cùng đoán ý nhau — và niềm tin mòn đi."],
    step: ["Nói thẳng điều bạn cần thay vì thử: “Dạo này mình thấy hơi thiếu được quan tâm, mình mong hai đứa dành cho nhau nhiều thời gian hơn.”"],
    ask: ["Điều gì làm bạn thấy chưa được quan tâm đủ vậy?"],
    advice: [
      "Thử lòng thường phản tác dụng: người kia không biết đang bị thử, dễ hiểu sai là bạn lạnh nhạt hay không nghiêm túc.",
      "Nói thẳng nhu cầu của mình bằng câu “mình”: “Mình thấy hơi thiếu được quan tâm, mình mong bạn nhắn mình nhiều hơn / mình đi chơi riêng nhiều hơn.”",
      "Đề nghị một việc cụ thể (một buổi hẹn mỗi tuần, gọi điện trước khi ngủ) — dễ làm hơn một lời trách chung chung.",
      "Nếu nói rõ rồi mà mọi thứ vẫn vậy, đó là thông tin thật để bạn cân nhắc — rõ ràng hơn mọi phép thử.",
    ],
  },
  // Q56: một người muốn giải quyết ngay, người kia cần thời gian bình tĩnh.
  {
    id: "pace",
    howto: true,
    re: VN(/\b(giải quyết ngay( \S+){0,8} (cần|muốn) (thời gian|bình tĩnh|khoảng lặng)|(cần|muốn) (thời gian|khoảng lặng) (để )?(bình tĩnh|nguôi)( \S+){0,8} giải quyết ngay)\b/),
    feel: ["Một người muốn nói cho xong, một người cần lùi lại cho nguôi — đây là chuyện rất nhiều cặp đôi gặp, không ai sai cả."],
    insight: ["Người muốn giải quyết ngay thường sợ bị bỏ lơ; người cần thời gian thường sợ nói lúc nóng sẽ làm tổn thương nhau. Cả hai nhu cầu đều chính đáng."],
    step: ["Thống nhất trước, lúc đang vui: khi cãi nhau thì tạm dừng bao lâu, và ai là người mở lời lại."],
    ask: ["Thường thì bạn gái cần khoảng bao lâu để bình tĩnh lại?"],
    advice: [
      "Thống nhất một **quãng tạm dừng có hẹn quay lại**: “Mình nghỉ 30 phút / tới tối nay rồi nói tiếp nha” — người cần thời gian được bình tĩnh, người muốn giải quyết biết chắc sẽ được nói.",
      "Trong lúc tạm dừng, đừng nhắn dồn hay bỏ đi im lặng không báo; mỗi người tự làm dịu mình (đi bộ, uống nước, viết ra điều muốn nói).",
      "Quay lại đúng hẹn, mỗi người nói về cảm giác và điều mình cần, không lôi thêm chuyện khác.",
      "Thống nhất cách này từ trước, lúc hai đứa đang vui — đừng đợi tới lúc đang cãi mới bàn.",
    ],
  },
  // Q57: xin lỗi nhiều lần mà vẫn lặp lại lỗi cũ.
  {
    id: "repeatsorry",
    howto: true,
    re: VN(/\b(xin lỗi (nhiều lần|hoài|mãi|rồi)( \S+){0,4} (vẫn )?(lặp lại|tái phạm|mắc lại)|(lặp lại|tái phạm|mắc lại) (đúng )?(lỗi|chuyện) cũ)\b/),
    feel: ["Thấy mình xin lỗi rồi mà vẫn lặp lại đúng lỗi cũ thì vừa áy náy vừa bực chính mình, Lomi hiểu."],
    insight: ["Lời xin lỗi chỉ là bước đầu — với người kia, xin lỗi mà vẫn lặp lại dần mất trọng lượng. Điều thật sự sửa được là **thay đổi hành vi cụ thể**."],
    step: ["Viết ra: lỗi đó thường xảy ra trong hoàn cảnh nào, điều gì châm ngòi."],
    ask: ["Lỗi đó thường xảy ra trong hoàn cảnh nào vậy?"],
    advice: [
      "Gọi đúng tên lỗi và hoàn cảnh hay xảy ra (vd hay quên hẹn khi bận, hay to tiếng khi mệt).",
      "Đặt **một việc cụ thể** để chặn nó: báo thức nhắc hẹn, tự hẹn “mệt thì xin nghỉ 15 phút rồi mới nói”…",
      "Nói với người ấy kế hoạch đó, và mời họ nhắc mình — xin lỗi kèm việc làm thì khác hẳn xin lỗi suông.",
      "Lỡ tái phạm thì nhận ngay, không bào chữa, và xem kế hoạch hỏng ở đâu để chỉnh.",
    ],
  },
  // Q58: bị nói là không lắng nghe dù mình đã giải thích nhiều.
  {
    id: "notlisten",
    howto: true,
    re: VN(/\b((nói|bảo|chê|trách) (anh|em|mình|tôi|tui) (không|chẳng) (biết )?lắng nghe|(không|chẳng) chịu lắng nghe)\b/),
    feel: ["Mình đã cố giải thích mà vẫn bị nói là không lắng nghe thì oan ức thật."],
    insight: ["Nhưng **giải thích không đồng nghĩa với lắng nghe**: giải thích là mình nói cho người kia hiểu mình; lắng nghe là để người kia thấy mình hiểu họ. Khi đang buồn, người ta thường cần được hiểu trước, rồi mới nghe lý lẽ."],
    step: ["Lần tới, trước khi giải thích, nhắc lại điều bạn gái đang cảm thấy: “Ý em là em thấy buồn vì…, đúng không?”"],
    ask: ["Lần gần nhất bạn gái nói vậy là trong chuyện gì?"],
    advice: [
      "Trước khi giải thích, nói lại điều người kia đang cảm thấy: “Em thấy bị bỏ rơi khi anh về trễ mà không báo, đúng không?”",
      "Hỏi thêm một câu thay vì phản bác: “Còn điều gì làm em buồn nữa không?”",
      "Chỉ giải thích khi người kia thấy đã được hiểu — lúc đó lời giải thích mới vào.",
      "Hỏi thẳng: “Lúc em buồn, em muốn anh nghe thôi, hay muốn anh cùng tìm cách?”",
    ],
  },
  // Q59, Q65: bất đồng giá trị lớn (sinh con, tôn giáo, lối sống) — trước đây "không hiểu" / bài chia tay.
  {
    id: "values",
    howto: true,
    re: VN(/\b(khác (biệt )?(tôn giáo|đạo|lối sống|quan điểm sống|giá trị sống)|bất đồng( \S+){0,4} (sinh con|có con|tôn giáo)|(một người|một đứa) muốn (có con|sinh con)|(muốn|không muốn) (có con|sinh con)( \S+){0,6} (không muốn|muốn))\b/),
    feel: ["Khác biệt lớn như chuyện con cái, tôn giáo hay lối sống làm mình băn khoăn là phải — vì nó chạm tới tương lai của cả hai."],
    insight: ["Không có đáp án chung là “phải chia tay” hay “cứ yêu là vượt qua”. Điều quyết định là: khác biệt đó có chạm vào **giá trị cốt lõi** — điều mỗi người không thể nhượng bộ — hay chỉ là thói quen có thể dung hoà."],
    step: ["Mỗi người tự viết ra: điều gì mình **không thể** nhượng bộ, điều gì mình **có thể** linh hoạt."],
    ask: ["Với bạn, trong chuyện này điều gì là không thể nhượng bộ?"],
    advice: [
      "Nói chuyện nghiêm túc, không vội: mỗi người nói vì sao điều đó quan trọng với mình, không phải ai thắng ai.",
      "Tách điều **không thể nhượng bộ** với điều **có thể thoả thuận** (vd lễ nghi, cách nuôi dạy con, chuyện hai bên gia đình).",
      "Không ép một người nhượng bộ chỉ để giữ nhau — nhượng bộ ở chuyện cốt lõi thường thành ấm ức về sau.",
      "Nếu hai người đều muốn đi tiếp mà bế tắc, tư vấn cặp đôi có thể giúp nói chuyện rõ hơn.",
    ],
  },
  // Q61: vợ dành thời gian cho bên ngoại nhiều hơn bên nội.
  {
    id: "sidesfam",
    howto: true,
    re: VN(/\b(bên ngoại|bên nội|nhà ngoại|nhà nội|nhà vợ|nhà chồng|bên vợ|bên chồng)( \S+){0,6} (hơn|nhiều hơn|ít hơn)\b/),
    feel: ["Thấy hai bên gia đình được quan tâm không đều thì mình chạnh lòng cũng dễ hiểu."],
    insight: ["Nhiều khi đó không phải thiên vị, mà do thói quen, khoảng cách nhà, hay bên đó đang cần người hơn. Nói ra điều mình cần thay vì quy kết sẽ dễ được lắng nghe hơn."],
    step: ["Nghĩ rõ điều bạn thật sự mong: nhiều thời gian hơn cho bên nội, hay cảm giác được vợ coi trọng gia đình mình?"],
    ask: ["Điều bạn mong nhất là gì — thêm thời gian về bên nội, hay cảm giác được coi trọng?"],
    advice: [
      "Tránh câu quy kết như “em lúc nào cũng thiên vị nhà em”.",
      "Nói về cảm giác và mong muốn: “Anh thấy hơi chạnh lòng vì dạo này mình ít về nhà nội, anh mong mình sắp xếp về thăm ba mẹ anh đều hơn.”",
      "Hỏi xem có lý do gì không (bên ngoại đang có việc, đường xa…) trước khi kết luận.",
      "Cùng lên lịch cụ thể cho cả hai bên, để không ai phải đếm.",
    ],
  },
  // Q62: lỡ nặng lời với người yêu trước mặt bạn bè — trước đây bài "bạn bè".
  {
    id: "hurtword",
    howto: true,
    re: VN(/\b((?<!(sếp|bị|bị sếp|ổng|bả|ảnh|chị ấy|anh ấy|người ta|họ|nó|thầy|cô|ba|mẹ|bố|chồng|vợ) )(lỡ )?(nói|quát|chửi|mắng|to tiếng|nặng lời)( \S+){0,6} (trước mặt|trước) (bạn bè|mọi người|người khác|đám đông|bạn)|lỡ (nói|lời) (nặng|quá|khó nghe)|nói (một câu )?(rất )?nặng lời)\b/),
    feel: ["Biết mình lỡ lời và thấy áy náy cho thấy bạn rất quan tâm người ấy."],
    insight: ["Nặng lời **trước mặt người khác** thường đau hơn nói riêng, vì người kia thấy mất mặt. Không nên chỉ chờ cho quên đi — nhận trách nhiệm và sửa lại mới làm lành được."],
    step: ["Tìm lúc riêng tư, xin lỗi cụ thể chứ không chung chung."],
    ask: ["Từ hôm đó tới giờ người ấy phản ứng thế nào?"],
    advice: [
      "Xin lỗi **riêng**, nói đúng điều mình đã làm: “Hôm đó anh nói câu đó trước mặt mọi người là sai, chắc em thấy tổn thương và mất mặt lắm.”",
      "Không kèm “nhưng…” để bào chữa; để người ấy được nói cảm giác của họ.",
      "Hỏi người ấy có muốn bạn đính chính hay xin lỗi trước nhóm bạn không — sửa chữa ở nơi đã gây tổn thương.",
      "Nghĩ xem điều gì làm bạn bùng lên lúc đó, để lần sau tạm dừng trước khi nói.",
    ],
  },
  // Q63: người yêu lôi chuyện cũ ra mỗi lần cãi nhau.
  {
    id: "oldstuff",
    howto: true,
    re: VN(/\b((lôi|nhắc|đào|khơi) (lại )?(chuyện|lỗi) cũ|chuyện cũ ra (mỗi|hoài|mãi))\b/),
    feel: ["Cãi chuyện này lại bị lôi thêm chuyện cũ thì mệt lắm, như không bao giờ được khép lại."],
    insight: ["Chuyện cũ hay bị nhắc lại thường vì nó **chưa được giải quyết xong** trong lòng người kia — họ chưa thấy được hiểu, hay chưa tin là chuyện đó sẽ không lặp lại."],
    step: ["Chọn lúc cả hai bình tĩnh (không phải lúc đang cãi) để nói riêng về chuyện cũ đó."],
    ask: ["Chuyện cũ hay bị nhắc là chuyện gì vậy, hai bạn đã nói cho ra lẽ chưa?"],
    advice: [
      "Mở riêng một buổi để nói cho xong chuyện cũ: người ấy còn đau ở đâu, cần gì để thấy chuyện đó khép lại.",
      "Thoả thuận “luật cãi nhau”: mỗi lần chỉ nói một chuyện, chuyện cũ đã giải quyết thì không lôi ra làm vũ khí.",
      "Khi đang cãi mà chuyện cũ bị nhắc, nói nhẹ: “Chuyện đó quan trọng, mình hẹn nói riêng nha, giờ mình giải quyết chuyện này trước.”",
      "Nếu vòng lặp cứ diễn ra dù đã cố, tư vấn cặp đôi có thể giúp hai bạn thoát ra.",
    ],
  },
  // Q64, Q80: muốn chia sẻ áp lực nhưng sợ bị cho là yếu đuối / lúc nào cũng phải mạnh mẽ.
  {
    id: "showweak",
    re: VN(/\b((sợ|ngại)( \S+){0,4} (nghĩ|thấy|cho là|chê|coi) ((anh|em|mình|tôi|tui) )?(là )?(yếu đuối|yếu|vô dụng|phiền|đàn ông yếu)|(lúc nào cũng|luôn|phải) (phải )?(làm người |tỏ ra )?mạnh mẽ|không được (than|than thở|khóc|yếu đuối))\b/),
    feel: ["Gồng mình mạnh mẽ mãi, có chuyện cũng không dám than — nghe thôi đã thấy mệt thay bạn."],
    insight: ["Chia sẻ áp lực **không phải là yếu đuối** — ai cũng có giới hạn, và mở lòng có chọn lọc với người thân thiết thường làm mối quan hệ gần nhau hơn. Lomi không đoán trước được người ấy sẽ phản ứng thế nào, nhưng bạn có thể bắt đầu nhỏ."],
    step: ["Bắt đầu nhỏ: kể một chuyện cụ thể và nói rõ điều mình cần — “Anh không cần em giải quyết, chỉ cần em nghe anh nói chút.”"],
    ask: ["Điều gì làm bạn thấy mình không được phép than thở vậy?"],
    advice: [
      "Chọn một người tin được và một lúc thoải mái để nói, không cần kể hết một lần.",
      "Nói rõ điều mình cần nghe: lắng nghe, góp ý hay chỉ một cái ôm.",
      "Bạn được quyền có lúc yếu lòng — mạnh mẽ cũng gồm việc biết khi nào cần người khác.",
    ],
  },
  // Q69: muốn xem trộm điện thoại người yêu — không chỉ cách; đưa cách xử lý nghi ngờ an toàn, tôn trọng.
  {
    id: "snoop",
    howto: true,
    re: VN(/\b((muốn|định|tính|cách|chỉ)( \S+){0,3} (xem|đọc|coi|lục|check|kiểm tra|mở) (trộm|lén) (điện thoại|tin nhắn|zalo|facebook|messenger|máy)|(hack|vào trộm|đăng nhập lén) (tài khoản|facebook|zalo|messenger|điện thoại))\b/),
    feel: ["Nghi ngờ mà chưa có câu trả lời thì bứt rứt lắm, Lomi hiểu vì sao bạn muốn tìm bằng chứng."],
    insight: ["Nhưng Lomi **không chỉ cách xem trộm điện thoại hay vào tài khoản của người khác** được — việc đó xâm phạm quyền riêng tư, có thể vi phạm pháp luật, và nếu bị phát hiện thì chính bạn thành người phá vỡ niềm tin trước."],
    step: ["Viết ra điều cụ thể làm bạn nghi (thay đổi giờ giấc, thái độ…), tách với điều chỉ là cảm giác."],
    ask: ["Điều gì cụ thể làm bạn nghi ngờ vậy?"],
    advice: [
      "Lomi không chỉ cách xem trộm điện thoại / tài khoản người khác — xâm phạm quyền riêng tư và có thể vi phạm pháp luật.",
      "Ghi lại những điều cụ thể làm bạn nghi, rồi nói chuyện thẳng: “Dạo này mình thấy…, mình bất an, mình muốn nghe bạn nói thật.”",
      "Quan sát cách người ấy phản ứng: giải thích rõ ràng, hay né tránh, đổ lỗi.",
      "Nếu niềm tin đã mất tới mức muốn lục điện thoại, đó là lúc cần nói thẳng về mối quan hệ — hoặc nhờ tư vấn cặp đôi.",
    ],
  },
  // Q73: giữ kín khoản tiết kiệm riêng sau kết hôn.
  {
    id: "privatemoney",
    howto: true,
    re: VN(/\b((giữ kín|giấu|giữ riêng|để riêng)( \S+){0,3} (khoản )?(tiết kiệm|tiền|quỹ)( \S+){0,5} (kết hôn|cưới|lấy vợ|lấy chồng)|quỹ đen|quỹ riêng sau khi cưới)\b/),
    feel: ["Muốn có một khoản riêng cho mình là mong muốn rất phổ biến, không có gì lạ cả."],
    insight: ["Không có đúng sai tuyệt đối: có **quỹ riêng** (tiền mình tự quyết) khác với **giấu tiền** (người kia không biết, trong khi hai người đang cùng lo một kế hoạch chung). Điều làm tổn thương thường là chuyện bị giấu, hơn là chuyện có tiền riêng."],
    step: ["Nghĩ xem vì sao bạn muốn giữ kín: để tự chủ, để phòng thân, hay vì sợ bị kiểm soát?"],
    ask: ["Bạn muốn giữ khoản đó vì lý do gì nè?"],
    advice: [
      "Phân biệt **quỹ riêng có thoả thuận** (hai người biết mỗi người có một khoản tự quyết) với **giấu tiền**.",
      "Nhiều cặp chia: quỹ chung cho nhà cửa, con cái, tiết kiệm chung + mỗi người một khoản riêng không phải giải trình — đây là cách được nhiều người chọn.",
      "Nếu hai người đang có nghĩa vụ chung (nợ, mua nhà), giấu một khoản lớn dễ thành mất niềm tin khi bị phát hiện.",
      "Chuyện tài sản trong hôn nhân còn liên quan tới pháp luật — cần rõ ràng thì nên hỏi luật sư hoặc người có chuyên môn.",
    ],
  },
  // Q75: người dùng phản hồi Lomi cứ khuyên quay lại — nhận lỗi, không mặc định phải hoà giải.
  {
    id: "advicewrong",
    re: VN(/\b(nhưng|mà) (em|lomi|bạn) (cứ|lại|toàn|cứ hay) (bảo|khuyên|nói|kêu)( \S+){0,6} (phải|nên)\b/),
    feel: ["Lomi xin lỗi nha 🙏 Lomi không nên mặc định là bạn phải quay lại — tình yêu cần cố gắng, nhưng không phải chuyện nào cũng nên cố bằng mọi giá."],
    insight: ["Chia tay hay quay lại là quyết định của bạn, dựa trên hoàn cảnh thật mà chỉ bạn biết rõ. Lomi ở đây để giúp bạn nhìn rõ, không phải để kéo bạn về một phía."],
    step: ["Nghĩ xem điều bạn cần nhất lúc này: được nghe, được an ủi, hay cùng xem lại quyết định?"],
    ask: ["Bạn kể Lomi nghe vì sao hai người chia tay, và bạn đang mong điều gì lúc này nha?"],
    advice: ["Lomi sẽ nghe hoàn cảnh của bạn trước rồi mới nói, và không mặc định phải hoà giải."],
  },
  // ═══════════════════════ 21/10 (QA V2) — tâm lý ═══════════════════════
  // Q76: không có chuyện gì lớn mà vẫn nặng nề.
  {
    id: "heavyheart",
    re: VN(/\b((không|chẳng|chả) có (chuyện|gì|việc) (gì )?(lớn|to tát|đặc biệt|cả)( \S+){0,4} (nặng nề|buồn|nặng lòng|khó chịu|bức bối|chán)|nặng nề trong lòng|nặng lòng mà không (biết|rõ))\b/),
    feel: ["Có những lúc lòng nặng trĩu mà không gọi tên được vì sao — cảm giác đó vẫn thật, không cần có chuyện gì lớn mới được buồn đâu."],
    insight: ["Cảm giác nặng nề có khi đến từ nhiều chuyện nhỏ cộng lại, từ mệt mỏi, thiếu ngủ, hay một giai đoạn chuyển đổi. Không cần tìm ra nguyên nhân ngay mới được nghỉ ngơi."],
    step: ["Cho mình một chút dịu lại hôm nay: đi bộ ngắn, tắm nước ấm, hay ngồi yên viết vài dòng — không cần phải giải quyết gì."],
    ask: ["Cảm giác này có từ bao giờ — mới vài hôm, hay đã một thời gian rồi?"],
    advice: ["Ghi lại mỗi ngày một dòng: hôm nay nặng nề lúc nào, sau chuyện gì — dần dần sẽ thấy quy luật.", "Nếu cảm giác kéo dài trên hai tuần, ảnh hưởng ăn ngủ, công việc, hãy nói chuyện với bác sĩ hoặc chuyên gia tâm lý."],
    heavy: true,
  },
  // Q77: đạt được mục tiêu mà vẫn không vui — trước đây "Nghe bạn vui là Lomi vui lây".
  {
    id: "emptywin",
    re: VN(/\b((đạt|có|làm|thi|xin) (được|đậu|đỗ)( \S+){0,6} (mà|nhưng) (vẫn |lại )?(không|chẳng|chả) (thấy )?(vui|hạnh phúc|hài lòng|sướng|thoả mãn)|thành công rồi mà (vẫn )?(không|chẳng) (vui|thấy gì))\b/),
    feel: ["Cố gắng mãi mới đạt được, tới nơi rồi lại thấy trống trơn — cảm giác hụt hẫng đó có thật, và nhiều người từng trải qua, không phải bạn vô ơn đâu."],
    insight: ["Có khi vì mình đã quá mệt trên đường đi, có khi mục tiêu đó không còn là điều mình thật sự cần, hoặc mình quen với cảm giác phải chạy tiếp. Nếu cả những điều trước đây làm bạn vui cũng nhạt đi thì đáng để ý hơn."],
    step: ["Thử hỏi mình: điều mình mong cảm thấy khi đạt được mục tiêu là gì — an toàn, được công nhận, hay tự do?"],
    ask: ["Cảm giác không vui này chỉ với mục tiêu đó, hay dạo này nhiều chuyện khác cũng thấy nhạt?"],
    advice: ["Cho mình nghỉ thật sự sau một chặng dài trước khi đặt mục tiêu mới.", "Nếu mất hứng thú với nhiều thứ kéo dài vài tuần, nói chuyện với chuyên gia tâm lý sẽ giúp bạn hiểu mình hơn."],
  },
  // Q79: sợ bị đánh giá, đăng bài rồi xoá — trước đây FAQ "đăng bài".
  {
    id: "judged",
    re: VN(/\b(sợ (người khác|mọi người|người ta|bị) (đánh giá|nghĩ|chê|phán xét|cười)|(xóa|xoá) (đi )?đăng lại|đăng (rồi|xong) lại (xóa|xoá))\b/),
    feel: ["Đăng gì cũng sợ người ta nghĩ này nghĩ kia rồi xoá đi đăng lại — mệt ghê, Lomi hiểu cảm giác đó."],
    insight: ["Sợ bị đánh giá là một dạng lo âu xã hội rất phổ biến. Thật ra mọi người thường bận nghĩ về chính họ nhiều hơn ta tưởng — cái “đèn sân khấu” chiếu vào mình mờ hơn mình nghĩ nhiều."],
    step: ["Thử một bước nhỏ: lần tới đăng một bài đơn giản, đặt hẹn giờ 10 phút không mở lại xem — và để nguyên bài đó."],
    ask: ["Bạn sợ nhất là người ta sẽ nghĩ gì về mình?"],
    advice: ["Tập từng bước nhỏ: bài ngắn, ít người xem trước (bạn thân), rồi mới rộng hơn.", "Để ý câu tự phán xét trong đầu và hỏi lại: có bằng chứng thật không?", "Nếu nỗi sợ làm bạn né nhiều việc trong đời sống, chuyên gia tâm lý có thể giúp bạn bằng những bài tập cụ thể."],
  },
  // Q81: ghen tị với thành công của bạn thân — trước đây bài "ghen trong tình yêu".
  {
    id: "envy",
    re: VN(/\b(ghen tị|ghen tỵ|đố kỵ|đố kị|ganh tị|ganh tỵ|ganh ghét)\b/),
    feel: ["Ghen tị với thành công của người thân thiết rồi lại thấy mình xấu tính — cảm giác đó khó chịu lắm, nhưng nó rất người, ai cũng có lúc như vậy."],
    insight: ["Ghen tị không làm bạn thành người xấu — điều quan trọng là mình làm gì với nó. Thường nó chỉ ra một điều mình đang mong cho chính mình."],
    step: ["Hỏi mình: trong thành công của bạn ấy, điều gì mình thật sự mong có — công việc, sự công nhận, hay cảm giác đang tiến lên?"],
    ask: ["Điều gì trong thành công của bạn ấy chạm vào bạn nhất?"],
    advice: ["Gọi tên điều mình mong, rồi đặt một bước nhỏ cho chính mình hướng tới nó.", "Vẫn có thể chúc mừng bạn ấy thật lòng — hai cảm xúc tồn tại cùng lúc được.", "Bớt so sánh trên mạng xã hội một thời gian nếu nó làm bạn thấy tệ."],
  },
  // Q82: không biết mình đang buồn, giận hay thất vọng.
  {
    id: "nameit",
    re: VN(/\b(không (biết|rõ) (mình |anh |em )?(đang )?(buồn|giận|thất vọng|cảm thấy gì|thấy sao)( \S+){0,2} (hay|hoặc|hay là)|lẫn lộn cảm xúc|cảm xúc lẫn lộn|không gọi tên được (cảm xúc|cảm giác))\b/),
    feel: ["Cảm xúc rối vào nhau, không biết là buồn, giận hay thất vọng — chuyện này hay gặp lắm, nhất là khi nhiều chuyện dồn lại."],
    insight: ["Gọi được tên cảm xúc giúp nó dịu bớt. Mấy cảm xúc này hay đi cùng nhau: buồn thường đi với mất mát, giận với cảm giác bị đối xử bất công, thất vọng với kỳ vọng không thành."],
    step: ["Thử trả lời nhanh: chuyện vừa rồi làm bạn thấy mất đi điều gì (buồn), bị đối xử không công bằng ở đâu (giận), hay mình đã mong điều gì mà không được (thất vọng)?"],
    ask: ["Gần đây có chuyện gì xảy ra làm bạn thấy như vậy không?"],
    advice: ["Viết ra vài dòng không cần đúng ngữ pháp — cảm xúc thường rõ hơn khi ra giấy.", "Không cần chọn một cảm xúc duy nhất; có thể là cả ba."],
    stepFirst: true,
  },
  // Q83: luôn đồng ý giúp mọi người vì sợ bị ghét.
  {
    id: "peoplepleaser",
    howto: true,
    re: VN(/\b((cứ |luôn |hay )?(đồng ý|nhận lời|giúp) (mọi người|hết mọi người|ai cũng)( \S+){0,6} (mệt|sợ (họ|người ta|mọi người) ghét|ngại từ chối)|không (dám|biết cách) từ chối|sợ (bị )?(người ta |mọi người |họ )?ghét)\b/),
    feel: ["Cứ gật đầu giúp mọi người dù mình đã cạn sức — vì sợ bị ghét — lâu dần mệt lắm, Lomi hiểu."],
    insight: ["Đặt ranh giới không làm bạn thành người xấu. Người quý bạn thật sẽ vẫn quý khi bạn nói “lần này mình không giúp được”."],
    step: ["Lần tới khi được nhờ, đừng trả lời ngay — nói “để mình xem lịch rồi báo nha” để có thời gian nghĩ."],
    ask: ["Lần gần nhất bạn muốn từ chối mà không dám là chuyện gì?"],
    advice: [
      "Cho mình thời gian: “Để mình xem lại rồi báo bạn nha” thay vì gật ngay.",
      "Từ chối ngắn, lịch sự, không cần giải thích dài: “Lần này mình không giúp được rồi, mình đang kín việc.”",
      "Đề nghị phần nhỏ hơn nếu muốn: “Mình không làm cả được, nhưng mình góp ý bản nháp cho bạn nhé.”",
      "Bắt đầu từ những lời nhờ nhỏ, ít rủi ro để tập — và để ý thấy phần lớn mọi người không ghét mình như mình sợ.",
    ],
  },
  // Q91: không muốn gặp ai mấy tuần nay.
  {
    id: "withdraw",
    heavy: true,
    re: VN(/\b(không muốn gặp (ai|bất kỳ ai|ai cả|mọi người)|thu mình|tránh mặt (mọi người|tất cả)|không muốn liên lạc với ai|né (hết )?mọi người)\b/),
    feel: ["Mấy tuần liền không muốn gặp ai, kể cả người từng thân — chắc bạn đang mệt lắm. Lomi không ép bạn phải ra ngoài ngay đâu."],
    insight: ["Thu mình một thời gian ngắn có thể là cách nghỉ ngơi. Nhưng nếu kéo dài vài tuần, kèm buồn, mất hứng thú, ăn ngủ thay đổi, thì đáng để được quan tâm kỹ hơn."],
    step: ["Không cần gặp ngay — thử nhắn cho một người bạn tin một câu ngắn: “Dạo này mình hơi mệt, chưa muốn gặp ai, nhưng vẫn nhớ bạn.”"],
    ask: ["Dạo này việc ăn, ngủ, làm việc của bạn thế nào? Và có lúc nào bạn nghĩ tới chuyện không muốn sống nữa không?"],
    advice: ["Giữ một sợi dây liên lạc nhỏ với một người tin được.", "Kéo dài trên hai tuần thì nên nói chuyện với bác sĩ hoặc chuyên gia tâm lý."],
  },
  // Q92, Q93: muốn tìm chuyên gia tâm lý nhưng ngại bị đánh giá; từng đi tư vấn mà không hợp.
  {
    id: "seekhelp",
    re: VN(/\b((tìm|gặp|đi|đến) (chuyên gia tâm lý|bác sĩ tâm lý|nhà tâm lý|nhà trị liệu|tư vấn tâm lý|bác sĩ tâm thần|chuyên gia)( \S+){0,6} (sợ|ngại)|sợ bị (đánh giá|cho là|nghĩ) (là )?(có vấn đề|bị điên|thần kinh|tâm thần)|(đi tư vấn|đi trị liệu|gặp chuyên gia)( \S+){0,4} (không hợp|chưa hợp)|không hợp (chuyên gia|bác sĩ|người tư vấn|nhà trị liệu))\b/),
    feel: ["Muốn tìm người giúp mà còn ngại bị đánh giá — Lomi hiểu, và việc bạn nghĩ tới chuyện này đã là một bước can đảm."],
    insight: ["Gặp chuyên gia tâm lý **không có nghĩa là bạn “có vấn đề”** — giống như đi khám khi đau người thôi. Rất nhiều người tìm tư vấn để hiểu mình hơn, vượt qua một giai đoạn khó, hay học cách ứng phó với căng thẳng."],
    step: ["Chuẩn bị cho buổi đầu: ghi ra 2–3 điều bạn muốn được giúp, và cứ nói thẳng là mình còn hồi hộp."],
    ask: ["Điều bạn muốn được giúp nhất khi đi tư vấn là gì?"],
    advice: [
      "Buổi đầu thường là để làm quen: bạn kể vì sao tới, chuyên gia hỏi thêm — bạn có quyền chưa kể hết.",
      "Có thể hỏi trước về cách làm việc, chi phí, bảo mật thông tin.",
      "Không hợp với một chuyên gia là chuyện bình thường — sự hợp nhau quan trọng lắm. Bạn có thể nói thẳng điều chưa ổn, hoặc tìm người khác phù hợp hơn, không cần bỏ hẳn việc được giúp.",
    ],
    hint: [
      [VN(/\b(không hợp|chưa hợp)\b/), "Không hợp với một chuyên gia là chuyện **bình thường** — mức độ hợp nhau ảnh hưởng nhiều tới hiệu quả tư vấn. Lomi không quyết thay bạn, nhưng có mấy lựa chọn:\n• Nói thẳng với chuyên gia điều chưa ổn (cách nói chuyện, tốc độ, hướng làm việc) — nhiều khi chỉnh lại được\n• Tìm một người khác, có thể khác cách tiếp cận hoặc chuyên về đúng vấn đề của bạn\n• Nhìn lại: điều gì ở lần đó làm bạn thấy không hợp, để lần sau hỏi trước\n\nBỏ một người không hợp **không có nghĩa** là bỏ hẳn việc được giúp. Điều gì ở lần đó làm bạn thấy không ổn nhất?", true],
    ],
  },
  // ═══════════════════════ 21/10 (QA 100 câu) — các chuyện trước đây Lomi đáp lạc chủ đề ═══════════════════════
  // Cặp đôi / vợ chồng bất đồng chuyện tiền (Q73, Q79) — trước đây nhận thành "áp lực tiền bạc", "bị người nhà không hiểu".
  {
    id: "couplemoney",
    howto: true,
    re: VN(/\b(vợ chồng|người yêu|ny|bạn trai|bạn gái|hai đứa|hai người|yêu nhau|vợ|chồng)\b.*(\b(bất đồng|cãi nhau|cãi|mâu thuẫn|tranh cãi|khác nhau|không hợp|xung đột|giận nhau)( \S+){0,3} (tiền bạc|tiền nong|chuyện tiền|tiền|chi tiêu|tiết kiệm|tiêu xài|xài tiền)\b|\bnợ\b.*\b(ưu tiên|mỗi người muốn|khác nhau|bất đồng)\b)/),
    hint: [
      [VN(/\bnợ\b/), "Đang nợ mà mỗi người muốn ưu tiên một khoản khác thì căng thẳng là phải — nhưng đây là bài toán **chung**, không phải chuyện ai thắng ai, và cũng không cần mặc định một người phải nắm hết tiền.\n\nThử cùng ngồi làm vầy:\n• Liệt kê **tất cả** khoản nợ: còn bao nhiêu, lãi suất, hạn trả, phạt nếu trễ\n• Ưu tiên trước khoản **sắp tới hạn / có phạt**, rồi tới khoản **lãi cao nhất** (vd thẻ tín dụng, vay tiêu dùng)\n• Giữ một khoản dự phòng nhỏ cho chi tiêu thiết yếu để không phải vay thêm\n• Thống nhất số tiền trả nợ mỗi tháng, xem lại cùng nhau mỗi tháng\n\nNợ nhiều quá khả năng trả thì nên hỏi ngân hàng về giãn nợ, hoặc người có chuyên môn tài chính. Hai bạn đang bất đồng ở khoản nào vậy?", true],
    ],
    feel: ["Bất đồng chuyện tiền bạc là một trong những điều làm các cặp đôi căng thẳng nhất — vì tiền gắn với cảm giác an toàn và cách mỗi người được nuôi lớn."],
    insight: ["Thường không phải ai đúng ai sai: một người thấy an toàn khi để dành, người kia thấy sống là phải tận hưởng. Hiểu tiền có ý nghĩa gì với mỗi người quan trọng hơn tranh luận từng khoản chi."],
    step: ["Chọn lúc cả hai đều bình tĩnh (không phải ngay sau khi vừa cãi), mỗi người nói mình lo điều gì nhất về tiền.", "Thử chia: một quỹ chung (nhà, ăn uống, tiết kiệm chung) và mỗi người một khoản riêng tự quyết, không phải giải trình."],
    ask: ["Hai bạn hay bất đồng nhất ở khoản nào — chi tiêu hằng ngày, tiết kiệm, hay chuyện giúp đỡ gia đình hai bên?"],
    advice: [
      "Không cần ai phải nhường ai hoàn toàn — mục tiêu là một thoả thuận cả hai cùng thấy công bằng: thống nhất mức tiết kiệm chung trước, phần còn lại mỗi người được tự do.",
      "Khoản lớn (trên một mức hai bạn tự đặt) thì bàn trước khi chi; khoản nhỏ thì tôn trọng quyền tự quyết của nhau.",
      "Nói bằng câu “mình” thay vì trách: “Mình thấy lo khi tháng này chưa để dành được” thay cho “Bạn tiêu hoang quá”.",
      "Mỗi tháng ngồi xem lại một lần, ngắn thôi — như một buổi họp gia đình nhẹ nhàng, không phải để bắt lỗi nhau.",
    ],
  },
  // Luôn là người chủ động / yêu nhiều hơn (Q74, Q84) — trước đây Q74 nhận thành câu hỏi "nhắn tin cho ai" của app.
  {
    id: "onesided",
    howto: true,
    re: VN(/\b((luôn|lúc nào cũng|toàn|chỉ có|cứ) (là )?(mình|anh|a|em|e|tôi|tui) (là )?(người )?(chủ động|nhắn trước|làm hoà|làm hòa|xin lỗi trước|rủ trước|hẹn trước)|(luôn|lúc nào cũng|toàn|cứ|chỉ) (là )?(người )?(chủ động|nhắn trước|làm hoà trước|làm hòa trước|xin lỗi trước|rủ trước|hẹn trước)|(mình|anh|em|tôi|tui) yêu (nhiều )?hơn (đối phương|người ta|cô ấy|anh ấy|ny|người yêu|họ)|yêu nhiều hơn|chỉ (mình|anh|em|tôi) cố gắng|một mình (mình|anh|em|tôi) cố|(người ta|cô ấy|anh ấy|ny|người yêu) (không bao giờ|chẳng bao giờ|chưa bao giờ) chủ động)\b/),
    feel: ["Lúc nào cũng là người chủ động nhắn, chủ động hẹn, chủ động làm hoà — lâu dần mình sẽ thấy mệt và tủi, như đang giữ mối quan hệ bằng một tay vậy."],
    insight: ["Một mối quan hệ cân bằng không phải lúc nào cũng 50–50, nhưng nếu lâu dài chỉ một người vun thì người đó sẽ kiệt sức. Cảm giác của bạn là tín hiệu đáng lắng nghe, không phải do bạn đòi hỏi."],
    step: ["Thử lùi lại vài ngày — không giận dỗi, chỉ là không chủ động trước — để xem người kia có tìm tới bạn không.", "Nói thẳng mà nhẹ, bằng cảm xúc của mình: “Dạo này mình thấy hay là người chủ động trước, mình hơi tủi. Mình cũng muốn được bạn tìm tới.”"],
    ask: ["Mỗi lần bạn chủ động thì người kia phản ứng thế nào — vui vẻ đón nhận hay hờ hững?"],
    advice: [
      "Nói rõ điều bạn cần bằng câu “mình”: “Mình thấy mình hay chủ động trước, mình mong bạn cũng nhắn mình, rủ mình nhiều hơn.”",
      "Để ý xem sau khi nghe bạn nói, người kia có thay đổi không. Mỗi người thể hiện tình cảm một kiểu, nhưng đã nói rõ mà mọi thứ vẫn vậy thì đó là điều đáng cân nhắc.",
      "Giữ cuộc sống riêng thật đầy — bạn bè, sở thích, mục tiêu — để giá trị của bạn không phụ thuộc vào việc người kia có nhắn hay không.",
    ],
  },
  // Làm sao biết người ta thật lòng (Q66) — trước đây "chưa được học".
  {
    id: "sincere",
    howto: true,
    re: VN(/\b((làm sao|làm thế nào|cách nào|sao) (để )?(biết|nhận ra|phân biệt|nhìn ra)( \S+){0,5} (thật lòng|thật sự|có thật|có thực sự) (yêu|thương|thích)|(có )?(thật lòng|thật sự) (yêu|thương|thích) (mình|anh|em|tôi|tui) (không|hay không)|yêu thật lòng hay)\b/),
    feel: ["Muốn biết người ta có thật lòng không là mong muốn rất bình thường — ai cũng muốn tình cảm mình trao đi được đặt đúng chỗ."],
    insight: ["Không có một dấu hiệu duy nhất, nhưng tình cảm thật thường lộ ra qua việc làm đều đặn hơn là lời nói ngọt: nhất quán, tôn trọng, và có bạn trong kế hoạch của họ."],
    step: ["Nhìn vào sự nhất quán: lời nói và việc làm có khớp nhau, và có duy trì theo thời gian không?"],
    ask: ["Có điều gì làm bạn đang băn khoăn về tình cảm của người ấy không?"],
    advice: [
      "Sự nhất quán: lời nói và việc làm có khớp nhau, và giữ được theo thời gian — không chỉ lúc mới quen.",
      "Cách họ đối xử khi bạn gặp khó khăn hay khi hai người bất đồng: có tôn trọng, lắng nghe, hay coi thường, kiểm soát.",
      "Họ có giới thiệu bạn với bạn bè, gia đình, nói về tương lai có bạn không.",
      "Và quan trọng nhất: ở cạnh họ bạn thấy an toàn, được là chính mình — hay thường xuyên lo lắng, hoài nghi.",
    ],
  },
  // Muốn chia tay nhẹ nhàng (Q75) — trước đây nhận thành "ở lại hay rời đi".
  {
    id: "endit",
    howto: true,
    re: VN(/\b((muốn|định|tính|sắp|phải) chia tay( \S+){0,8} (nói (thế nào|sao|như nào|làm sao|ra sao)|sợ (người ta|đối phương|cô ấy|anh ấy|ny|họ|người kia) (bị )?(tổn thương|buồn|đau|sốc))|(cách|làm sao|làm thế nào) (để )?(nói|đề nghị|mở lời) chia tay|chia tay (sao|thế nào|như nào) cho (nhẹ nhàng|êm|đỡ đau|tử tế))\b/),
    feel: ["Muốn kết thúc mà vẫn lo cho cảm xúc của người kia — điều đó cho thấy bạn là người tử tế lắm."],
    insight: ["Không có cách chia tay nào hoàn toàn không đau, nhưng có cách giúp người kia đỡ tổn thương hơn: rõ ràng, tôn trọng và thật lòng."],
    step: ["Nghĩ trước vài câu mình muốn nói, để lúc gặp không bị cuống mà nói điều làm người kia đau thêm."],
    ask: ["Bạn đã chắc với quyết định này chưa, hay trong lòng vẫn còn phân vân?"],
    advice: [
      "Nói trực tiếp, ở chỗ riêng tư, lúc cả hai không vội — tránh chia tay qua tin nhắn nếu có thể.",
      "Nói về mình thay vì đổ lỗi: “Mình đã suy nghĩ nhiều, và mình thấy mình không còn muốn tiếp tục nữa.”",
      "Rõ ràng, đừng hứa “biết đâu sau này” nếu bạn không thật sự nghĩ vậy — mập mờ làm người kia đau lâu hơn.",
      "Để người kia được nói, được buồn hay giận; không cần tranh luận ai đúng ai sai.",
      "Sau đó giữ khoảng cách một thời gian, đừng hỏi han thường xuyên, để cả hai có chỗ hồi phục.",
    ],
  },
  // Từ chối khéo (Q27) — trước đây vướng chữ "buồn" nên nhận thành "bạn đang buồn".
  {
    id: "decline",
    howto: true,
    re: VN(/\b((cách|làm sao|làm thế nào|sao) (để )?từ chối|từ chối (khéo|sao cho|thế nào|như nào|mà không)|(từ chối|khước từ|nói không với)( \S+){0,2} (lời mời|lời rủ|đi chơi|đám cưới|tiệc|nhậu|kèo|lời nhờ|người ta nhờ))\b/),
    feel: ["Từ chối mà vẫn giữ được lòng người khác là chuyện khó thật, nhất là khi mình quý họ."],
    insight: ["Từ chối một lời mời không phải là từ chối con người họ. Người ta thường buồn vì cách nói hơn là vì câu “không”."],
    step: ["Nói sớm, đừng hứa lửng rồi huỷ sát giờ — đó mới là điều làm người ta buồn nhất."],
    ask: ["Bạn đang muốn từ chối lời mời gì vậy — đi chơi, đám tiệc hay một việc nhờ vả?"],
    advice: [
      "Cảm ơn trước: “Cảm ơn bạn đã rủ mình nha!”",
      "Lý do ngắn và thật, không cần giải thích dài: “Hôm đó mình kẹt việc rồi” hay “Dạo này mình cần nghỉ ngơi chút.”",
      "Nếu bạn vẫn muốn gặp, đề nghị cách khác: “Lần sau mình đi cà phê nha, mình rủ bạn.”",
      "Ví dụ trọn câu: “Cảm ơn bạn rủ mình nha! Tối đó mình kẹt rồi, tiếc ghê. Tuần sau mình đi ăn bù nhé?”",
    ],
  },
  // Muốn kiếm thêm thu nhập (Q24) — trước đây "Vậy hả 😄 Có gì kể tiếp em nghe nha."
  {
    id: "sideincome",
    howto: true,
    re: VN(/\b(kiếm thêm (thu nhập|tiền|chút tiền|việc)|thu nhập thêm|tăng thu nhập|việc làm thêm|làm thêm (gì|việc gì|nghề gì)|nghề tay trái|kiếm tiền thêm)\b/),
    feel: ["Muốn có thêm thu nhập là chuyện rất nhiều người đang tính — nghĩ tới là đã chủ động rồi đó 💪"],
    insight: ["Hướng hợp nhất thường bắt đầu từ thứ mình đã có sẵn: kỹ năng, thời gian rảnh và chút vốn."],
    step: ["Viết ra 3 thứ: mình giỏi gì, mỗi tuần rảnh mấy tiếng, có bao nhiêu vốn có thể thử mà không ảnh hưởng chi tiêu chính."],
    ask: ["Mỗi tuần bạn rảnh khoảng bao nhiêu giờ, và kỹ năng nào bạn tự tin nhất?"],
    advice: [
      "Bắt đầu từ thứ bạn đã có: kỹ năng (dạy kèm, thiết kế, viết, sửa đồ, nấu ăn…), thời gian rảnh và vốn — mỗi thứ dẫn tới một hướng khác nhau.",
      "Ít vốn: nhận việc tự do theo kỹ năng, dạy kèm, giao hàng hay chạy xe giờ rảnh, bán đồ tự làm.",
      "Có chút vốn: bán hàng online quy mô nhỏ — nhập ít để thử trước, bán được rồi mới tăng.",
      "Thử 1–2 tháng, ghi lại thu – chi để biết hướng nào thật sự có lời; đừng vội bỏ việc chính.",
      "Cẩn thận lời mời “việc nhẹ lương cao”, phải đóng tiền trước hay làm nhiệm vụ online ăn hoa hồng — gần như luôn là lừa đảo.",
    ],
  },
  // Người yêu xin "không gian riêng" (Q83) — trước đây đáp chung chung "chuyện tình cảm lên xuống".
  {
    id: "space",
    howto: true,
    re: VN(/\b(người yêu|ny|vợ|chồng|bạn trai|bạn gái|cô ấy|anh ấy|em ấy|người ấy|crush)\b.*\b(cần|muốn|xin) (có )?(thêm )?(không gian riêng|không gian|khoảng lặng|khoảng trống|thời gian riêng|thời gian một mình|ở một mình|thời gian (để )?suy nghĩ)\b/),
    feel: ["Nghe người thương nói cần thời gian hay không gian riêng dễ làm mình chột dạ, sợ đó là dấu hiệu người ta muốn đi — cảm giác đó rất dễ hiểu."],
    insight: ["Cần thời gian, không gian riêng **không nhất thiết** là muốn rời xa: nhiều người cần thời gian một mình để nạp lại năng lượng, gỡ áp lực, hoặc sắp xếp lại suy nghĩ. Lomi không đoán được lòng người ấy — điều nói lên nhiều nhất là cách họ cư xử trong và sau khoảng thời gian đó."],
    step: ["Tôn trọng khoảng lặng đó: đừng nhắn dồn hay ngồi canh điện thoại."],
    ask: ["Người ấy nói vậy trong hoàn cảnh nào — sau một lần cãi nhau, hay lúc đang nhiều áp lực?"],
    advice: [
      "Cần không gian **chưa chắc** là muốn chia tay — nhiều người chỉ cần thời gian một mình để nạp lại năng lượng hay gỡ áp lực.",
      "Hỏi nhẹ một lần để hiểu: “Bạn cần không gian kiểu nào, khoảng bao lâu, có điều gì đang làm bạn mệt không?” — hỏi để hiểu, không phải tra hỏi.",
      "Tôn trọng khoảng lặng đó, đừng nhắn dồn; trong lúc chờ thì lo cho mình: bạn bè, việc riêng, sở thích.",
      "Để ý sau đó: người ấy vẫn quan tâm, quay lại trò chuyện thì thường chỉ là nhu cầu nghỉ; còn ngày càng xa, né nói chuyện thì đó là lúc cần một cuộc nói chuyện thẳng thắn về hai người.",
    ],
  },
  // Muốn giảm chi tiêu (Q38) — trước đây "Vậy hả 😄", câu hỏi tiếp về tiền cà phê thì nhận thành thẻ caffeine.
  {
    id: "saving",
    howto: true,
    re: VN(/\b(giảm chi tiêu|cắt giảm chi tiêu|bớt chi tiêu|tiết kiệm (tiền|chi tiêu|hơn)|muốn tiết kiệm|chi tiêu (quá tay|hoang|nhiều quá)|tiêu (hoang|quá tay)|để dành (tiền|được tiền)|hết tiền trước cuối tháng)\b/),
    feel: ["Muốn giảm chi tiêu là bước đầu hay lắm — biết mình cần siết lại đã là một nửa chặng đường rồi 💪"],
    insight: ["Tiết kiệm bền nhất thường không đến từ nhịn hết mọi thứ, mà từ việc biết tiền đang đi đâu và cắt đúng những khoản nhỏ lặp lại mỗi ngày."],
    step: ["Ghi lại mọi khoản chi trong 1–2 tuần (kể cả ly nước, gói xôi) — nhìn vào là thấy ngay khoản nào “rò rỉ” nhiều nhất."],
    ask: ["Bạn thấy khoản nào đang tốn nhiều nhất — ăn uống, mua sắm online, hay đi lại?"],
    hint: [
      [VN(/\b(cà phê|cafe|cf|trà sữa|nước uống|đồ uống|ly nước)\b/), "Tiền cà phê mỗi ngày nhìn nhỏ mà cộng lại không nhỏ đâu: khoảng 30–40 nghìn một ly thì mỗi tháng đã gần 1 triệu. Không cần bỏ hẳn cho buồn — thử pha ở nhà vài hôm trong tuần, hoặc giữ một ly mỗi ngày nhưng bỏ ly thứ hai, và săn ưu đãi của quán quen ngay trong app 😉", true],
    ],
    advice: [
      "Ghi chi tiêu 1–2 tuần để biết tiền đi đâu, rồi mới quyết cắt khoản nào.",
      "Vừa nhận lương là chuyển ngay một phần vào tài khoản tiết kiệm riêng — tiết kiệm trước, tiêu sau.",
      "Đặt mức trần cho từng nhóm (ăn uống, mua sắm, giải trí) mỗi tuần, hết mức thì dừng.",
      "Món muốn mua mà không gấp thì chờ 48 giờ — qua cơn thích nhiều khi không cần nữa.",
      "Cắt khoản nhỏ lặp lại mỗi ngày (đồ uống, phí giao hàng, gói đăng ký ít dùng) thường hiệu quả hơn nhịn một món lớn.",
    ],
  },
  // Học tiếng Anh / ngoại ngữ (Q34) — trước đây nhận thành FAQ "đổi ngôn ngữ app".
  {
    id: "learnlang",
    howto: true,
    re: VN(/\b((học|luyện|ôn|tự học|bắt đầu học) (lại )?(tiếng anh|tiếng nhật|tiếng hàn|tiếng trung|tiếng pháp|tiếng đức|ngoại ngữ|ielts|toeic|giao tiếp tiếng anh)|(tiếng anh|ngoại ngữ) (mất gốc|kém quá|dở quá))\b/),
    feel: ["Muốn học ngoại ngữ là quyết định hay lắm đó 💪 Quan trọng nhất không phải học nhiều, mà là học đều."],
    insight: ["Học ngôn ngữ giống tập thể dục: mỗi ngày một chút đều đặn hiệu quả hơn hẳn học dồn một buổi thật dài rồi bỏ cả tuần."],
    step: ["Chọn một mục tiêu cụ thể (giao tiếp, thi chứng chỉ, đọc tài liệu công việc) — mục tiêu khác thì cách học khác."],
    ask: ["Bạn học để giao tiếp, đi làm hay thi chứng chỉ nè?"],
    hint: [
      [VN(/\b((\d+|mười lăm|mười|hai mươi|ba mươi) phút|mỗi ngày (bao lâu|mấy tiếng|bao nhiêu)|có đủ không|đủ không)\b/), "15 phút mỗi ngày mà **đều đặn** là khởi đầu tốt đó — đều đặn quan trọng hơn học lâu. Để 15 phút “ra chữ” hơn: 5 phút ôn từ cũ, 5 phút nghe hoặc đọc một đoạn ngắn, 5 phút nói to / tự đặt câu. Khi đã thành thói quen thì tăng dần lên 20–30 phút, nhất là nếu bạn có mục tiêu thi trong vài tháng.", true],
    ],
    advice: [
      "Đặt mục tiêu cụ thể và nhỏ: vd mỗi ngày 10 từ mới, mỗi tuần nghe hết một tập podcast ngắn.",
      "Học ít mà đều: 15–30 phút mỗi ngày tốt hơn 3 tiếng một buổi rồi nghỉ cả tuần.",
      "Kết hợp nghe – nói – đọc – viết; nói to thành tiếng dù chỉ một mình.",
      "Đưa tiếng Anh vào đời sống: đổi ngôn ngữ điện thoại, xem phim có phụ đề tiếng Anh, ghi chú bằng tiếng Anh.",
    ],
  },
  // Muốn thay đổi cuộc sống mà quá nhiều việc (Q95) — trước đây "chưa được học".
  {
    id: "overwhelm",
    howto: true,
    re: VN(/\b(kế hoạch (quá )?(lớn|to|nhiều)( \S+){0,4} bỏ (giữa chừng|dở)|cứ bỏ (giữa chừng|dở)|cải thiện bản thân( \S+){0,6} bỏ|muốn thay đổi (cuộc sống|bản thân|cuộc đời|cuộc sống của mình)|(quá nhiều|bao nhiêu|cả đống|một đống|ngập) (việc|thứ|chuyện) (phải|cần|muốn) (làm|lo|thay đổi)|ngập việc|quá tải (việc|công việc)?)\b/),
    feel: ["Muốn thay đổi mà nhìn vào thấy cả núi việc thì dễ bị “đứng hình” lắm — không phải bạn lười, mà là đầu óc đang quá tải."],
    insight: ["Thay đổi lớn thường bắt đầu từ một thói quen nhỏ làm đều đặn, không phải từ việc sửa mọi thứ cùng lúc."],
    step: ["Viết hết mọi việc ra giấy cho đầu nhẹ bớt, rồi khoanh đúng MỘT việc để bắt đầu trong tuần này."],
    ask: ["Trong mớ việc đó, điều bạn muốn thay đổi nhất là gì?"],
    advice: [
      "Viết hết mọi việc ra giấy — để trong đầu thì cái gì cũng thấy gấp.",
      "Chọn đúng MỘT việc quan trọng nhất (hoặc dễ nhất) và làm nó trong tuần này; các việc khác tạm gác lại.",
      "Chia việc đó nhỏ tới mức làm được trong 10–15 phút mỗi ngày — nhỏ mà đều thắng lớn mà bỏ dở.",
      "Ưu tiên nền tảng trước: ngủ đủ, ăn uống, vận động nhẹ — có sức thì mới đủ năng lượng đổi những thứ khác.",
    ],
  },
  // ═══════════════════════ BỊ NÓI XẤU / HIỂU LẦM (01/10) ═══════════════════════
  {
    id: "gossip",
    re: VN(/\b(nói xấu (mình|tôi|em|tui|tớ|anh|chị|sau lưng)|bị nói xấu|nói sau lưng|bị đặt điều|đặt điều cho mình|bị đồn|đồn đại về mình|tung tin (đồn )?(bậy|sai)|bị vu khống|vu khống mình|bị hiểu lầm|hiểu lầm mình|ai cũng hiểu lầm|bị mắng sau lưng|xì xào về mình|bị đem ra bàn tán|(hox|họ|người ta|mấy người đó|tụi nó|bà ấy) nhiều chuyện|nhiều chuyện về mình)\b/),
    feel: [
      "Bị nói xấu sau lưng khó chịu lắm, vừa tức vừa tủi, mà nhiều khi còn không biết giải thích với ai 😣",
      "Bị hiểu lầm hay bị đặt điều là cảm giác bất lực ghê, Lomi hiểu mà 🫂",
    ],
    insight: [
      "Người hay nói xấu thường nói về nhiều người chứ không riêng gì bạn. Lời họ nói phản ánh họ nhiều hơn là phản ánh bạn.",
      "Mình không kiểm soát được miệng người khác, nhưng kiểm soát được cách mình phản ứng. Giữ bình tĩnh thường khiến tin đồn tự xẹp nhanh hơn.",
      "Những người hiểu bạn thật sẽ không tin chỉ vì vài lời đồn đâu.",
    ],
    step: [
      "Viết ra điều bạn nghe được và cảm xúc của mình trước khi phản ứng — đợi nguôi rồi hãy quyết.",
      "Nếu là hiểu lầm với người quan trọng, hẹn nói chuyện riêng, bình tĩnh kể phía mình: “Mình nghe nói…, thật ra là…”.",
      "Hạn chế chia sẻ chuyện riêng với người từng đem chuyện mình đi kể.",
    ],
    ask: ["Ai nói xấu bạn vậy — bạn bè, đồng nghiệp hay người quen?", "Chuyện họ nói có ảnh hưởng gì tới bạn không, hay chủ yếu là thấy tổn thương?"],
    advice: [
      "Nếu tin đồn ảnh hưởng tới công việc, uy tín: nói chuyện thẳng với người liên quan hoặc cấp trên, giữ bằng chứng nếu có.",
      "Không cần thanh minh với tất cả mọi người — chỉ cần những người quan trọng với bạn hiểu đúng là đủ.",
      "Bị bôi nhọ, xúc phạm nghiêm trọng trên mạng thì chụp màn hình lưu lại và báo cáo với nền tảng.",
    ],
  },
  // ═══════════════════════ SỐ KHỔ / XUI XẺO (01/10) ═══════════════════════
  {
    id: "fate",
    // "sox" = chữ "số" gõ có dấu (lib/lomiAccent đổi để không nhầm với "sợ").
    re: VN(/\b((số|sox) mình (khổ|xui|đen)|(số|sox) khổ|đời mình khổ|đời khổ quá|sao mình khổ thế|sao mình khổ vậy|sao mình xui|xui xẻo quá|xui quá trời|xui hoài|xui liên tục|đen đủi|toàn gặp chuyện xui|làm gì cũng thất bại|làm gì cũng hỏng|cái gì cũng hỏng|cái gì cũng đổ bể|(số|sox) phận|kiếp này khổ|trời không thương|ông trời bất công)\b/),
    feel: [
      "Nghe như dạo này mọi chuyện cứ dồn dập đổ lên đầu bạn, mệt lắm ha 😔",
      "Cảm giác làm gì cũng hỏng, cứ như cả thế giới chống lại mình — Lomi hiểu mà 🫂",
    ],
    insight: [
      "Khi đang buồn, não hay gom hết chuyện xui lại để chứng minh “mình khổ”, và bỏ qua những điều nhỏ vẫn đang ổn.",
      "Xui xẻo thường đến thành đợt rồi qua. Giai đoạn này không định nghĩa cả cuộc đời bạn đâu.",
      "Có những việc do mình, có những việc hoàn toàn ngoài tầm tay. Tách hai loại ra sẽ thấy nhẹ bớt phần tự trách.",
    ],
    step: [
      "Viết ra 3 chuyện xui gần đây, cạnh mỗi chuyện ghi: “cái này mình làm được gì?”. Việc nào không làm được gì thì cho phép mình buông.",
      "Tối nay thử ghi lại 1 điều nhỏ vẫn còn ổn — một bữa ăn ngon, một tin nhắn dễ thương.",
      "Chọn một việc nhỏ chắc chắn làm được hôm nay và làm cho xong — lấy lại cảm giác “mình vẫn làm được”.",
    ],
    ask: ["Dạo này chuyện gì làm bạn thấy xui nhất?", "Mọi chuyện dồn tới từ khi nào vậy?"],
    advice: [
      "Đừng ra quyết định lớn lúc đang thấy mọi thứ tối om — chờ vài ngày cho đầu óc dịu lại đã.",
      "Kể cho một người tin cậy nghe; nhiều khi chỉ cần nói ra là thấy chuyện nhỏ lại một nửa.",
      "Ngủ đủ, ăn đủ — người mệt thì chuyện gì cũng thấy nặng gấp đôi.",
    ],
    heavy: true,
  },
  // ═══════════════════════ TÌNH CẢM ═══════════════════════
  {
    // 11/10: NGHI người mình thương có người khác (chưa biết thật hư). Trước đây câu "a nghi vợ a ngoại tình" được đáp bằng bài "bị phản bội"
    // ("Việc họ phản bội nói lên cách họ chọn sống…") — coi điều đang nghi là sự thật. Chủ đề này không khẳng định gì về người kia.
    id: "suspect",
    re: VN(/\b(nghi|nghi ngờ|linh cảm|sợ|hình như|không biết có|có khi nào|có vẻ|chắc là|đoán là|lo là)\b.{0,40}\b(ngoại tình|có người khác|có ai khác|có bồ|lừa dối|phản bội|cắm sừng|say nắng|thay lòng|có người mới|có con khác|có thằng khác)\b/),
    feel: [
      "Nghi ngờ người mình thương mà chưa biết thật hư ra sao — cái lơ lửng đó hành mình ghê lắm 😔",
      "Sống trong nghi ngờ mệt lắm, vì lúc nào đầu cũng phải chạy hai kịch bản cùng lúc 😔",
    ],
    insight: [
      "Lomi không biết được chuyện gì đang thật sự xảy ra, và nghi ngờ thì chưa phải là sự thật. Nhưng cảm giác bất an của bạn là có thật — nó đáng được nói ra thay vì ôm một mình mà đoán.",
      "Khi đã nghi, mình rất dễ chỉ nhìn thấy những gì khớp với nỗi nghi đó. Thử tách riêng: điều gì bạn tận mắt thấy, điều gì là bạn suy ra?",
    ],
    step: [
      "Viết ra hai cột: “điều mình biết chắc” và “điều mình đang đoán”. Nhìn hai cột đó rồi hẵng tính bước tiếp theo.",
      "Chọn lúc cả hai bình tĩnh để nói bằng cảm giác của mình — “Dạo này mình thấy bất an vì…, mình muốn nghe từ chính người mình thương.” — đừng mở đầu bằng lời buộc tội.",
    ],
    ask: ["Điều gì khiến bạn bắt đầu nghi vậy?", "Bạn đã thử nói thẳng nỗi lo này với người ấy chưa?"],
    advice: [
      "Trước khi kết luận, nói chuyện thẳng thắn một lần: kể điều bạn thấy và cảm giác của bạn, rồi nghe người ấy giải thích.",
      "Hạn chế lén kiểm tra điện thoại hay theo dõi — nó hiếm khi cho câu trả lời rõ ràng, mà làm mình mệt và mất lòng tin thêm.",
      "Dù sự thật là gì, bạn có quyền cần sự rõ ràng. Nói chuyện rồi mà vẫn thấy bị lảng tránh thì một buổi tư vấn cho cả hai có thể giúp hai người nói được với nhau.",
    ],
  },
  {
    id: "toxic",
    re: VN(/\b(thao túng|gaslight|bị kiểm soát|kiểm soát mình|hay kiểm soát|kiểm soát điện thoại|cấm mình (đi|gặp|chơi)|độc hại|toxic|bị đánh đập|đánh đập|bị (người yêu|chồng|vợ|bạn trai|bạn gái) đánh|đánh mình|bạo lực|bị chửi bới|xúc phạm mình|bị đe doạ|đe doạ mình|ghen tuông quá mức|coi điện thoại mình)\b/),
    feel: [
      "Lomi nghe mà lo cho bạn ghê 🥺 Không ai đáng bị đối xử như vậy cả, kể cả trong tình yêu.",
      "Cảm ơn bạn đã dám kể. Sống trong một mối quan hệ làm mình sợ hãi, ngột ngạt là rất mệt mỏi.",
    ],
    insight: [
      "Yêu thương thật sự không đi kèm kiểm soát, đe doạ hay làm mình thấy nhỏ bé. Ghen quá mức, cấm đoán, xúc phạm… là dấu hiệu của mối quan hệ độc hại, không phải “vì quá thương”.",
      "Người bị thao túng lâu ngày hay tự nghi ngờ trí nhớ và cảm nhận của chính mình. Nếu bạn thường xuyên thấy mình “có lỗi” mà không rõ vì sao, hãy tin cảm giác của bạn.",
      "Rời khỏi mối quan hệ độc hại khó hơn người ngoài nghĩ — vì còn tình cảm, còn sợ hãi, còn ràng buộc. Bạn không yếu đuối khi thấy khó.",
    ],
    step: [
      "Nếu bạn đang gặp nguy hiểm hoặc bị bạo lực, gọi 113 ngay nha. An toàn của bạn là quan trọng nhất.",
      "Kể cho một người thân hoặc bạn bè bạn tin tưởng — đừng để mình bị cô lập.",
      "Lưu lại bằng chứng (tin nhắn, hình ảnh) ở chỗ an toàn, phòng khi cần tới.",
    ],
    ask: ["Chuyện này diễn ra lâu chưa?", "Hiện giờ bạn có đang an toàn không?", "Có ai bên cạnh mà bạn có thể nhờ giúp không?"],
    advice: [
      "Đặt ranh giới rõ ràng và nói ra: điều gì bạn không chấp nhận. Người tôn trọng bạn sẽ lắng nghe; người không tôn trọng thì phản ứng của họ cũng là câu trả lời.",
      "Nếu quyết định rời đi, hãy lên kế hoạch trước: chỗ ở, người hỗ trợ, giấy tờ quan trọng — và nhờ người thân đồng hành.",
      "Một chuyên gia tâm lý có thể giúp bạn lấy lại sự tự tin và nhìn rõ mọi chuyện hơn.",
    ],
    heavy: true,
  },
  {
    id: "marriage",
    re: VN(/\b(vợ chồng (cãi nhau|giận nhau|nhạt|lạnh nhạt|bất hoà|xa cách)|hôn nhân|ly hôn|ly thân|chồng mình|vợ mình|chồng em|vợ em|chồng tôi|vợ tôi|lấy nhau rồi|sau khi cưới|nhạt nhẽo|chán chồng|chán vợ)\b/),
    feel: [
      "Chuyện vợ chồng là chuyện khó nói nhất, vì nó gắn với cả cuộc sống hằng ngày 😔",
      "Lomi hiểu, sống chung mà thấy xa cách thì còn cô đơn hơn cả ở một mình.",
    ],
    insight: [
      "Sau cưới, áp lực cơm áo, con cái, hai bên gia đình dễ làm tình cảm bị đẩy xuống cuối danh sách. Nhạt không có nghĩa là hết thương, mà là đã lâu không được chăm.",
      "Hôn nhân bền không phải vì không có mâu thuẫn, mà vì hai người vẫn chọn đứng về cùng một phía để giải quyết mâu thuẫn.",
      "Nhiều cặp chỉ nói với nhau chuyện “việc” (tiền điện, đón con…) mà quên nói chuyện “lòng”. Khoảng cách lớn dần từ đó.",
    ],
    step: [
      "Thử dành 15 phút mỗi tối nói chuyện không điện thoại, không bàn chuyện tiền bạc — chỉ hỏi han nhau hôm nay thế nào.",
      "Hẹn hò lại như hồi mới yêu: một bữa tối riêng, một buổi đi dạo, dù chỉ mỗi tháng một lần.",
      "Nói lời cảm ơn cho những điều nhỏ người kia làm — nghe đơn giản nhưng hâm nóng lại nhiều lắm.",
    ],
    ask: ["Chuyện này bắt đầu từ khi nào vậy?", "Hai bạn còn nói chuyện thật lòng với nhau được không?", "Điều bạn mong người ấy thay đổi nhất là gì?"],
    advice: [
      "Khi góp ý, nói về hành động cụ thể và cảm xúc của mình (“em buồn khi anh về trễ mà không nhắn”), tránh chê bai con người (“anh lúc nào cũng vô tâm”).",
      "Nếu mâu thuẫn lặp lại mãi không gỡ được, tư vấn hôn nhân với chuyên gia là lựa chọn rất đáng cân nhắc — không phải chỉ dành cho cặp sắp tan vỡ.",
      "Nếu đang nghĩ tới ly hôn: đừng quyết định trong lúc giận. Bình tĩnh, cân nhắc con cái, tài chính, và nói chuyện với người mình tin tưởng trước.",
    ],
    tarot: "hôn nhân của mình thời gian tới",
  },
  {
    id: "inlaw",
    re: VN(/\b(mẹ chồng|bố chồng|nhà chồng|mẹ vợ|bố vợ|nhà vợ|nàng dâu|con dâu|con rể|về nhà chồng|sống chung với nhà chồng|ở chung nhà chồng)\b/),
    feel: ["Chuyện với nhà chồng / nhà vợ là nỗi niềm của rất nhiều người, Lomi hiểu mà 😔", "Làm dâu, làm rể mà không được thấu hiểu thì mệt mỏi và tủi thân lắm."],
    insight: [
      "Hai gia đình có thói quen, cách nghĩ khác nhau là chuyện tự nhiên. Mâu thuẫn thường đến từ khác biệt, không hẳn vì ai xấu.",
      "Người đứng giữa (chồng hoặc vợ của bạn) đóng vai trò rất quan trọng — họ nên là cầu nối, không để bạn một mình đối mặt.",
    ],
    step: [
      "Nói chuyện riêng với chồng/vợ trước, bình tĩnh kể điều làm bạn buồn và mong họ hỗ trợ thế nào.",
      "Giữ lễ phép nhưng đặt ranh giới rõ ràng với những chuyện riêng của hai vợ chồng.",
    ],
    ask: ["Điều gì làm bạn khó chịu nhất trong chuyện này?", "Chồng/vợ bạn có hiểu và đứng về phía bạn không?"],
    advice: [
      "Để người con ruột góp ý với bố mẹ mình thường dễ lọt tai hơn là con dâu/con rể nói trực tiếp.",
      "Tìm điểm chung để gần nhau hơn: nấu một món bố mẹ thích, hỏi han sức khoẻ — thiện chí nhỏ đôi khi gỡ được nhiều khúc mắc.",
      "Nếu có điều kiện, ra ở riêng thường giúp giảm rất nhiều va chạm hằng ngày.",
    ],
  },
  {
    id: "marrypressure",
    re: VN(/\b(hỏi cưới|giục cưới|thúc cưới|ép cưới|bị ép cưới|bao giờ cưới|khi nào cưới|chưa lấy chồng|chưa lấy vợ|lớn tuổi chưa|áp lực lấy chồng|áp lực lấy vợ|áp lực kết hôn|bị hỏi chuyện chồng|bị hỏi chuyện vợ|ế chồng|ế vợ)\b/),
    feel: ["Bị hỏi “bao giờ cưới” hoài mệt ghê ha 😮‍💨 Lomi hiểu mà.", "Áp lực chuyện cưới xin từ gia đình, họ hàng làm nhiều người thấy ngột ngạt lắm."],
    insight: [
      "Mỗi người có một thời điểm riêng. Cưới vì áp lực thường khó hạnh phúc hơn là chờ đúng người, đúng lúc.",
      "Người lớn hỏi thường vì lo, theo cách của thế hệ họ — không phải vì bạn kém cỏi.",
    ],
    step: ["Chuẩn bị sẵn một câu trả lời nhẹ nhàng, vui vẻ để “né” khéo, kiểu “con đang chọn kỹ nè, chọn đúng người mới về chung nhà được”.", "Nói chuyện riêng với bố mẹ về suy nghĩ của mình, để họ hiểu bạn không phải không muốn, mà muốn chọn đúng."],
    ask: ["Ai hay hỏi chuyện này nhất vậy?", "Còn bạn, bạn thật sự mong muốn điều gì?"],
    advice: [
      "Tập trung xây cuộc sống của mình thật vui và vững: công việc, sức khoẻ, bạn bè. Khi mình ổn, người khác cũng bớt lo.",
      "Nếu muốn mở lòng gặp gỡ, cứ chủ động một chút — tham gia hoạt động mới, hay thử mục Làm quen trên Quẹt (/quet).",
    ],
    tarot: "khi nào mình gặp đúng người",
  },
  {
    id: "single",
    re: VN(/\b(độc thân|chưa có người yêu|không có người yêu|chưa ai yêu|không ai yêu|chưa từng yêu|chưa yêu ai|(?<!(?:bán|hàng|quán|shop|tiệm|khách|phòng|cửa hàng|buôn bán|bán hàng|homestay|spa)\b.{0,40})(?:ế quá|bị ế|ế lâu|ế rồi)|fa lâu|làm sao có người yêu|muốn có người yêu|kiếm người yêu|tìm người yêu)\b/),
    feel: ["Độc thân lâu đôi khi cũng thấy chạnh lòng ha, nhất là mùa lễ Tết 😅", "Muốn có một người để thương, để kể chuyện mỗi ngày — mong ước đó dễ thương mà 💕"],
    insight: [
      "Độc thân không có nghĩa là bạn thiếu gì. Nhiều khi chỉ là chưa gặp đúng người, hoặc vòng quen biết còn hẹp.",
      "Một mối quan hệ tốt thường đến khi mình đã ổn với chính mình — đủ vui để chia sẻ niềm vui, chứ không phải tìm người lấp chỗ trống.",
    ],
    step: [
      "Mở rộng vòng quen biết: một lớp học, một câu lạc bộ, nhóm chạy bộ, hay mục Làm quen trên Quẹt (/quet) và phòng chat Cộng đồng.",
      "Chăm chút bản thân vì chính mình: ngủ đủ, tập thể dục, ăn mặc gọn gàng — tự tin lên là người khác thấy liền.",
    ],
    ask: ["Bạn độc thân lâu chưa?", "Bạn thích người như thế nào?"],
    advice: [
      "Chủ động bắt chuyện trước cũng không sao đâu — tệ nhất là không hợp, còn hơn là không bao giờ biết.",
      "Đừng đặt tiêu chuẩn quá cứng nhắc. Hãy cho người ta cơ hội qua vài lần nói chuyện rồi hẵng đánh giá.",
    ],
    tarot: "khi nào mình gặp đúng người",
  },
  {
    id: "situationship",
    re: VN(/\b(mập mờ|mối quan hệ mập mờ|mối quan hệ không rõ ràng|không rõ ràng với nhau|chưa xác định|không danh phận|chưa có danh phận|nửa vời|bạn cũng không phải|người yêu cũng không phải|trên mức bạn bè)\b/),
    feel: ["Mập mờ là kiểu quan hệ làm mình vừa vui vừa bất an ghê 😵‍💫", "Lomi hiểu, không biết mình là gì của người ta thì lòng cứ lơ lửng hoài."],
    insight: [
      "Mập mờ kéo dài thường thiệt nhất cho người thương nhiều hơn. Bạn có quyền được biết rõ vị trí của mình.",
      "Nếu người kia cứ né tránh xác định, đó cũng là một cách họ trả lời.",
    ],
    step: ["Tự hỏi mình trước: mình muốn mối quan hệ này đi tới đâu?", "Hỏi thẳng nhưng nhẹ nhàng: “Mình thấy tụi mình khá thân, bạn nghĩ tụi mình là gì của nhau?”"],
    ask: ["Hai bạn như vậy lâu chưa?", "Bạn muốn tiến tới, hay đang thấy mệt rồi?"],
    advice: [
      "Đặt một khoảng thời gian cho mình: nếu sau đó mọi thứ vẫn lưng chừng, bạn cho phép bản thân bước ra.",
      "Đừng đầu tư hết cảm xúc vào một người chưa chắc chắn. Giữ cuộc sống, bạn bè, niềm vui riêng.",
    ],
    tarot: "người ấy có tình cảm với mình không",
  },
  {
    id: "newlove",
    re: VN(/\b(mới quen|mới yêu|mới hẹn hò|hẹn hò lần đầu|buổi hẹn đầu|lần đầu hẹn|đi hẹn|nhắn tin thế nào|nên nhắn gì|nói chuyện gì với|cách giữ người yêu|làm sao để người ấy thích)\b/),
    feel: ["Mới quen là giai đoạn ngọt ngào mà hồi hộp nhất luôn 😆", "Ui, đang trong giai đoạn tìm hiểu hả, dễ thương ghê 💕"],
    insight: [
      "Giai đoạn đầu, điều quan trọng nhất là cả hai thấy thoải mái khi ở cạnh nhau — hơn là phải thật ấn tượng.",
      "Người ta thích mình vì con người thật của mình. Cố diễn quá thì về lâu dài mệt cả hai.",
    ],
    step: [
      "Hỏi những câu mở, kiểu “cuối tuần bạn hay làm gì cho vui?”, rồi lắng nghe thật — người ta sẽ nhớ cảm giác được lắng nghe.",
      "Buổi hẹn đầu nên chọn chỗ nhẹ nhàng, dễ nói chuyện như quán cà phê, đi dạo — đừng quá cầu kỳ.",
    ],
    ask: ["Hai bạn quen nhau thế nào vậy?", "Điều gì làm bạn thấy hồi hộp nhất?"],
    advice: [
      "Nhắn tin vừa phải, đừng dồn dập hay “thả thính” quá tay. Để cả hai có khoảng trống để nhớ nhau.",
      "Để ý cách người ấy đối xử với người khác (phục vụ, bạn bè) — đó là tấm gương rõ nhất về con người họ.",
      "Đi chậm một chút cũng được. Tình cảm vững thường được xây từ từ.",
    ],
    tarot: "người ấy có tình cảm với mình không",
  },
  {
    id: "stayorgo",
    re: VN(/\b(có nên tiếp tục|nên tiếp tục hay|nên chia tay không|có nên chia tay|muốn chia tay|định chia tay|không biết nên ở lại|nên ở lại hay|hết yêu rồi thì sao|không còn cảm xúc|sợ làm họ tổn thương)\b/),
    feel: ["Đứng giữa ở lại hay rời đi là một trong những quyết định khó nhất, Lomi hiểu 😔", "Nghĩ tới chuyện kết thúc mà vẫn còn thương, vẫn sợ làm người kia đau — chắc bạn rối lắm."],
    insight: [
      "Không có quyết định nào hoàn toàn không đau. Câu hỏi là: nỗi đau nào mình chấp nhận được về lâu dài?",
      "Còn thương không đủ để ở lại nếu mình luôn thấy bất an, mất mình. Nhưng một giai đoạn nhạt cũng chưa hẳn là hết.",
    ],
    step: ["Viết ra 2 cột: điều giữ bạn ở lại, và điều khiến bạn muốn đi. Nhìn giấy trắng mực đen dễ thấy rõ lòng mình hơn.", "Tự hỏi: nếu mọi thứ cứ như hiện tại thêm 1 năm nữa, mình có ổn không?"],
    ask: ["Điều gì làm bạn nghĩ tới chuyện dừng lại?", "Bạn đã nói với người ấy về cảm giác này chưa?"],
    advice: [
      "Trước khi quyết định, hãy thử nói chuyện thật lòng một lần — biết đâu có những điều người kia chưa từng biết.",
      "Nếu quyết định chia tay: nói trực tiếp, rõ ràng, tôn trọng; tránh im lặng biến mất. Rõ ràng lúc đầu giúp cả hai đỡ đau về sau.",
    ],
    tarot: "Ở lại hay rời đi?",
  },
  {
    id: "parentsban",
    re: VN(/\b(gia đình (không cho|ngăn cấm|cấm|phản đối)|bố mẹ (không cho|ngăn cấm|cấm|phản đối)|ba mẹ (không cho|ngăn cấm|cấm|phản đối)|không được gia đình ủng hộ|chênh lệch tuổi|hơn nhiều tuổi|khác tôn giáo|môn đăng hộ đối)\b/),
    feel: ["Thương nhau mà gia đình ngăn cấm thì khổ tâm lắm, kẹt ở giữa không biết theo bên nào 😔"],
    insight: [
      "Bố mẹ phản đối thường vì lo — về tương lai, tài chính, khác biệt. Hiểu được nỗi lo đó là bước đầu để thuyết phục.",
      "Thời gian và sự kiên trì chứng minh bằng hành động thường có sức nặng hơn tranh cãi.",
    ],
    step: ["Hỏi rõ bố mẹ lo điều gì cụ thể, thay vì chỉ nghe “không được”.", "Để người ấy có cơ hội gặp gỡ, thể hiện sự tôn trọng với gia đình bạn từ từ."],
    ask: ["Gia đình lo ngại điều gì nhất?", "Người ấy biết chuyện này chưa, và họ nghĩ sao?"],
    advice: [
      "Đừng đối đầu gay gắt — cãi nhau chỉ làm bố mẹ càng tin là mình đúng. Kiên nhẫn, chân thành sẽ hiệu quả hơn.",
      "Nhờ một người lớn mà bố mẹ tin tưởng nói giúp một tiếng.",
    ],
  },
  {
    id: "lies",
    re: VN(/\b(nói dối|bị nói dối|giấu mình|giấu diếm|không trung thực|mất niềm tin|không tin tưởng nữa|không còn tin)\b/),
    feel: ["Bị người thân thiết nói dối làm mình hụt hẫng lắm, Lomi hiểu 😔", "Niềm tin mà lung lay thì mọi thứ khác cũng chông chênh theo."],
    insight: [
      "Người ta nói dối có khi vì sợ làm mình buồn, sợ mâu thuẫn — nhưng dù lý do gì, cảm giác bị giấu vẫn rất thật.",
      "Niềm tin xây lại được, nhưng cần người kia thành thật và kiên trì, còn mình cần thời gian.",
    ],
    step: ["Nói rõ với người kia điều bạn biết và cảm giác của bạn, cho họ cơ hội giải thích.", "Đừng vội kết luận khi chưa nói chuyện — đôi khi có những hiểu lầm."],
    ask: ["Họ giấu bạn chuyện gì vậy?", "Đây là lần đầu hay đã có trước đó?"],
    advice: ["Nói rõ điều bạn cần để tin lại (minh bạch hơn, kể nhau nghe nhiều hơn…).", "Nếu nói dối lặp lại nhiều lần, hãy nghiêm túc nghĩ xem mối quan hệ này có còn an toàn cho bạn không."],
  },
  {
    id: "spark",
    re: VN(/\b(hâm nóng|nhàm chán|hết lửa|mất lửa|không còn lãng mạn|yêu lâu năm|yêu lâu rồi|tình cảm nhạt|nhạt quá|làm mới tình cảm|làm sao để lãng mạn)\b/),
    feel: ["Yêu lâu thấy nhạt là chuyện rất nhiều cặp gặp, bạn không phải người duy nhất đâu 😄"],
    insight: [
      "Giai đoạn “say nắng” ban đầu tự nhiên sẽ lắng xuống — thay vào đó là sự thân quen. Muốn giữ lửa thì cần chủ động thêm củi.",
      "Điều làm tình cảm nhạt thường không phải thiếu yêu, mà thiếu những trải nghiệm mới cùng nhau.",
    ],
    step: ["Cùng thử một điều mới: một món ăn lạ, một chuyến đi ngắn, một lớp học chung.", "Viết một lời nhắn nhỏ, tặng một món quà bất ngờ không cần dịp gì."],
    ask: ["Hai bạn quen nhau lâu chưa?", "Trước đây điều gì làm hai bạn vui nhất khi ở bên nhau?"],
    advice: [
      "Mỗi người có cách cảm nhận yêu thương khác nhau: lời nói, thời gian, quà tặng, cử chỉ chăm sóc, sự gần gũi. Hỏi xem người ấy cần điều gì nhất.",
      "Dành thời gian “chỉ hai người” đều đặn, không điện thoại, không chuyện công việc.",
    ],
    tarot: "tình cảm của mình thời gian tới thế nào",
  },

  // ═══════════════════════ TÂM LÝ ═══════════════════════
  {
    id: "depress",
    re: VN(/\b(trống rỗng|thấy trống rỗng|trầm cảm|bị trầm cảm|mất hứng thú|(chẳng|không|chả) (có |còn |thấy )?hứng thú (làm |với )?(gì|cái gì|điều gì|chuyện gì)|hết hứng thú|làm gì cũng (thấy )?chán|chán hết mọi thứ|chán mọi thứ|cái gì cũng chán|không thấy vui gì|không còn hứng thú|không muốn làm gì|không thiết gì|sống không mục đích|vô nghĩa quá|cuộc sống vô nghĩa|tê liệt cảm xúc|không cảm thấy gì|buồn kéo dài|buồn lâu rồi|không thiết sống)\b/),
    feel: [
      "Cảm giác trống rỗng, chẳng thiết gì kéo dài như vậy nặng nề thật sự.",
      "Cảm ơn bạn đã nói ra với Lomi. Khi mọi thứ đều mất màu, việc bạn vẫn tìm người để kể đã là một điều rất can đảm.",
    ],
    insight: [
      "Khi buồn kéo dài, mất hứng thú với những điều từng thích, ngủ và ăn thay đổi… đó có thể là dấu hiệu của trầm cảm — một tình trạng sức khoẻ có thể điều trị được, không phải do bạn yếu đuối.",
      "Trầm cảm hay “nói dối” rằng mọi thứ sẽ mãi như vậy. Nhưng với sự hỗ trợ phù hợp, rất nhiều người đã khá hơn từng chút một.",
    ],
    step: [
      "Hôm nay chỉ cần một việc thật nhỏ: tắm nước ấm, ra ngoài nắng 10 phút, hay ăn một bữa đàng hoàng. Nhỏ thôi cũng được.",
      "Nhắn cho một người bạn tin tưởng một câu đơn giản: “Dạo này mình không ổn lắm.”",
    ],
    ask: ["Cảm giác này kéo dài bao lâu rồi?", "Dạo này bạn ăn ngủ thế nào?", "Có ai bên cạnh mà bạn có thể kể chuyện này không?"],
    advice: [
      "Gặp bác sĩ tâm thần hoặc chuyên gia tâm lý là bước rất nên làm — họ có thể giúp bạn hiểu mình đang trải qua điều gì và cách để khá hơn.",
      "Giữ nhịp sinh hoạt tối thiểu: giờ ngủ, bữa ăn, chút vận động nhẹ. Cơ thể ổn định giúp tâm trí có chỗ dựa.",
      "Nếu có lúc bạn nghĩ tới việc làm hại bản thân, hãy gọi 115 hoặc đường dây nóng Ngày Mai 096 306 1414 ngay nha. Bạn không phải một mình.",
    ],
    heavy: true,
  },
  {
    id: "panic",
    re: VN(/\b(hoảng loạn|lên cơn hoảng|cơn hoảng sợ|panic|panic attack|khó thở vì lo|tim đập thình thịch|tưởng mình sắp chết|run hết người|nghẹt thở)\b/),
    feel: ["Cơn hoảng loạn đáng sợ lắm, như thể mất kiểm soát hoàn toàn — Lomi hiểu 🥺", "Lomi ở đây với bạn nè. Mình cùng thở chậm lại nha."],
    insight: [
      "Cơn hoảng loạn thường lên đỉnh trong vài phút rồi tự dịu xuống. Nó rất khó chịu, nhưng tự nó không gây hại cho bạn.",
      "Cơ thể đang bật “chế độ báo động” nhầm lúc. Thở chậm là cách nhắn cho não biết: mình an toàn.",
    ],
    step: [
      "Thở ra thật chậm và dài hơn hơi hít vào: hít 4 nhịp, thở ra 6 nhịp. Lặp lại vài lần.",
      "Đặt chân chạm đất, nhìn quanh gọi tên 5 đồ vật bạn thấy. Kéo mình về hiện tại.",
    ],
    ask: ["Bạn hay bị như vậy trong hoàn cảnh nào?", "Giờ bạn thấy dịu hơn chút nào chưa?"],
    advice: [
      "Nếu cơn hoảng lặp lại thường xuyên, bạn nên gặp bác sĩ để kiểm tra sức khoẻ và được hướng dẫn điều trị — có nhiều cách hiệu quả lắm.",
      "Nếu đau ngực dữ dội, khó thở kéo dài hoặc lần đầu bị, hãy đi khám hoặc gọi 115 để chắc chắn không phải vấn đề tim mạch nha.",
    ],
    heavy: true,
    stepFirst: true,
  },
  {
    id: "angerself",
    re: VN(/\b(nóng tính|hay nổi nóng|dễ nổi nóng|không kiềm chế được|mất kiểm soát khi giận|hay giận|hay cáu|hay quát|nổi nóng với|to tiếng với|hay la hét|kiểm soát (cơn )?(giận|nóng|tức giận|cảm xúc)|kiềm chế (cơn )?(giận|nóng|tức giận|cảm xúc)|bớt nóng|bớt giận|dễ giận|giận dữ|cách hết giận|hết giận)\b/),
    feel: ["Lomi hiểu, nổi nóng xong nhiều khi mình còn thấy hối hận hơn cả người kia 😔", "Việc bạn nhận ra và muốn thay đổi đã là bước rất đáng quý rồi đó."],
    insight: [
      "Tức giận là cảm xúc bình thường, thường là “lớp vỏ” bên ngoài của mệt mỏi, tổn thương hay cảm giác không được tôn trọng.",
      "Thiếu ngủ, đói, căng thẳng kéo dài đều làm “ngòi nổ” ngắn lại.",
    ],
    step: [
      "Khi thấy nóng lên, tạm rời khỏi tình huống vài phút: “Mình cần bình tĩnh chút rồi nói tiếp.”",
      "Đếm chậm tới 10, thở sâu, uống ngụm nước — cho não lý trí kịp quay lại.",
    ],
    ask: ["Bạn hay nổi nóng trong tình huống nào nhất?", "Sau những lần như vậy bạn thấy thế nào?"],
    advice: [
      "Ghi lại những lần nổi nóng: chuyện gì xảy ra, mình đang mệt hay đói không. Nhận ra “ngòi nổ” là kiểm soát được một nửa.",
      "Vận động đều đặn giúp xả bớt căng thẳng tích tụ.",
      "Nếu cơn giận làm tổn thương người thân nhiều lần, nói chuyện với chuyên gia tâm lý sẽ giúp bạn có công cụ tốt hơn.",
    ],
  },
  {
    id: "procrast",
    re: VN(/\b(trì hoãn|hay trì hoãn|lười quá|lười biếng|lười học|lười làm|không có động lực|không thể tập trung|mất tập trung|khó tập trung|dễ xao nhãng|cứ để mai|nước đến chân mới nhảy)\b/),
    feel: ["Ai cũng có lúc trì hoãn hết á, bạn không lười đâu 😄", "Lomi hiểu, biết phải làm mà cứ không bắt đầu được thì khó chịu với chính mình lắm."],
    insight: [
      "Trì hoãn ít khi do lười — thường là do việc đó làm mình thấy ngợp, chán, hoặc sợ làm không tốt.",
      "Động lực thường đến SAU khi bắt đầu, chứ không phải trước. Bắt tay vào 5 phút là não tự “vào guồng”.",
    ],
    step: [
      "Thử luật 5 phút: chỉ hứa với mình làm đúng 5 phút thôi. Hết 5 phút muốn dừng thì dừng.",
      "Chia việc lớn thành bước thật nhỏ, nhỏ tới mức thấy buồn cười (vd “mở file ra”).",
      "Cất điện thoại sang phòng khác trong lúc làm.",
    ],
    ask: ["Việc bạn đang trì hoãn là gì vậy?", "Điều gì làm bạn ngại bắt đầu nhất?"],
    advice: [
      "Làm theo nhịp 25 phút tập trung – 5 phút nghỉ, xong 4 lượt thì nghỉ dài.",
      "Làm việc khó nhất vào lúc bạn tỉnh táo nhất trong ngày.",
      "Tự thưởng nhỏ khi xong mỗi phần — não thích phần thưởng lắm.",
    ],
  },
  {
    id: "lost",
    re: VN(/\b(mất phương hướng|không biết mình muốn gì|không biết làm gì với cuộc đời|khủng hoảng tuổi|định hướng|chọn ngành|chọn nghề|không biết theo nghề gì|không biết học gì|bất định|bị lạc lối|không có mục tiêu)\b/),
    feel: ["Cảm giác lạc lối, không biết mình muốn gì — rất nhiều người trẻ đang trải qua giống bạn đó 🌱", "Lomi hiểu, đứng giữa nhiều ngã rẽ mà không biết chọn đường nào thì hoang mang lắm."],
    insight: [
      "Ít ai biết rõ mình muốn gì ngay từ đầu. Đam mê thường được tìm thấy qua việc thử, chứ không phải ngồi nghĩ ra.",
      "Không cần một kế hoạch cho cả đời. Chỉ cần bước tiếp theo đủ rõ là được.",
    ],
    step: [
      "Viết ra: những lúc bạn quên cả thời gian là đang làm gì? Người khác hay nhờ bạn việc gì? Đó là manh mối.",
      "Thử một việc nhỏ liên quan tới điều bạn tò mò: một khoá học ngắn, một buổi làm thử, nói chuyện với người trong nghề.",
    ],
    ask: ["Hiện giờ bạn đang học hay đi làm?", "Có điều gì bạn từng rất thích mà lâu rồi không làm không?"],
    advice: [
      "Coi vài năm tới là giai đoạn “thử nghiệm”: thử, rút kinh nghiệm, điều chỉnh. Không có lựa chọn nào là mất trắng.",
      "Nói chuyện với những người đi trước ở ngành bạn quan tâm — 30 phút trò chuyện có khi hơn cả tháng tự tìm hiểu.",
    ],
    tarot: "hướng đi nào hợp với mình",
  },
  {
    id: "social",
    re: VN(/\b(ngại giao tiếp|sợ giao tiếp|sợ đám đông|sợ nói trước đám đông|hướng nội|ngại nói chuyện|không biết nói chuyện|vụng về|khó hoà nhập|run khi nói|sợ bị đánh giá|sợ người khác nghĩ)\b/),
    feel: ["Ngại giao tiếp không phải lỗi của bạn đâu, rất nhiều người cũng như vậy 🌿", "Lomi hiểu, cảm giác lo bị đánh giá làm mình muốn thu mình lại."],
    insight: [
      "Mình thường nghĩ người khác để ý mình nhiều hơn thực tế — ai cũng đang bận lo về bản thân họ.",
      "Hướng nội không phải điểm yếu. Người hướng nội thường lắng nghe tốt, sâu sắc và được tin tưởng.",
    ],
    step: ["Bắt đầu từ việc nhỏ: chào hỏi, hỏi một câu đơn giản với người quen.", "Chuẩn bị sẵn vài câu hỏi mở để bắt chuyện, vd “dạo này bạn có gì vui không?”."],
    ask: ["Bạn thấy khó nhất trong tình huống nào?", "Có ai bạn thấy thoải mái khi nói chuyện không?"],
    advice: [
      "Tập nói trước gương hoặc ghi âm lại khi cần thuyết trình — quen dần là bớt run.",
      "Tập trung vào người đối diện (hỏi han, lắng nghe) thay vì lo mình trông thế nào — áp lực sẽ giảm rất nhiều.",
      "Nếu nỗi sợ làm bạn né tránh hầu hết các hoạt động, chuyên gia tâm lý có thể giúp bạn tập dần.",
    ],
  },
  {
    id: "perfect",
    re: VN(/\b(cầu toàn|hoàn hảo|sợ thất bại|sợ sai|sợ làm sai|phải làm tốt nhất|không cho phép mình sai|áp lực phải giỏi|kỳ vọng quá cao|kì vọng quá cao|sợ làm người khác thất vọng)\b/),
    feel: ["Lúc nào cũng phải thật hoàn hảo thì mệt lắm, Lomi hiểu 😮‍💨"],
    insight: [
      "Cầu toàn thường xuất phát từ nỗi sợ không đủ tốt. Nhưng “đủ tốt” nhiều khi đã là rất tốt rồi.",
      "Sai lầm là một phần của học hỏi. Người thành công nhất cũng là người đã sai nhiều nhất.",
    ],
    step: ["Thử cho mình làm một việc ở mức “80% là được” và xem chuyện gì xảy ra — thường là chẳng sao cả.", "Khi tự chê, hỏi lại: mình có nói câu này với bạn thân không?"],
    ask: ["Điều gì bạn sợ nhất nếu mọi thứ không hoàn hảo?", "Áp lực này đến từ bạn hay từ người xung quanh?"],
    advice: ["Đặt mục tiêu về sự tiến bộ thay vì sự hoàn hảo.", "Ghi nhận những gì bạn đã làm được mỗi ngày, không chỉ những gì còn thiếu."],
  },
  {
    id: "addict",
    re: VN(/\b(nghiện (chơi )?game|nghiện điện thoại|nghiện mạng xã hội|nghiện tiktok|nghiện facebook|lướt điện thoại|nghiện rượu|nghiện bia|nghiện thuốc|nghiện cờ bạc|cờ bạc|cá độ|chơi lô đề|nghiện mua sắm|không bỏ được)\b/),
    feel: ["Muốn bỏ mà mãi không bỏ được thì bức bối lắm, Lomi hiểu 😔", "Việc bạn nhận ra và muốn thay đổi đã là bước khó nhất rồi đó 💪"],
    insight: [
      "Thói quen khó bỏ vì não đã quen với “phần thưởng” nhanh. Không phải bạn thiếu ý chí.",
      "Thay thế thói quen dễ hơn là chỉ cố nhịn — cần có một việc khác lấp vào khoảng trống.",
    ],
    step: [
      "Tạo “rào cản”: xoá app khỏi màn hình chính, để điện thoại xa giường, không giữ tiền mặt dư…",
      "Nhận ra thời điểm dễ sa đà nhất (buồn chán, căng thẳng, buổi tối) và chuẩn bị sẵn việc thay thế.",
    ],
    ask: ["Bạn muốn bỏ thói quen này vì điều gì?", "Bạn hay bị cuốn vào nhất lúc nào?"],
    advice: [
      "Đặt mục tiêu giảm dần thay vì bỏ ngay một lúc — dễ duy trì hơn.",
      "Nói với người thân về quyết tâm của mình để có người nhắc nhở, đồng hành.",
      "Với rượu bia, cờ bạc hay chất gây nghiện đã ảnh hưởng tới tiền bạc, sức khoẻ, gia đình — hãy tìm tới bác sĩ hoặc chuyên gia để được hỗ trợ. Đừng tự vay mượn để gỡ nha.",
    ],
    heavy: true,
  },
  {
    id: "bodyimage",
    re: VN(/\b(tự ti ngoại hình|bị chê béo|bị chê gầy|bị chê xấu|bị chê mập|body shame|chán thân hình|ghét ngoại hình|không thích ngoại hình|mình xấu quá|mình béo quá|mình gầy quá|mặt xấu)\b/),
    feel: ["Bị chê về ngoại hình đau lắm, nhất là khi nghe từ người quen 🥺", "Lomi hiểu, nhìn gương mà không thích mình thì buồn thật sự."],
    insight: [
      "Tiêu chuẩn “đẹp” trên mạng phần lớn đã qua chỉnh sửa, góc máy, ánh sáng. So với nó thì ai cũng thấy mình thiếu.",
      "Người thương bạn thật sự nhớ tới nụ cười, sự tử tế, cách bạn làm họ vui — không phải số cân nặng.",
      "Cơ thể bạn đang giúp bạn sống mỗi ngày. Nó xứng đáng được đối xử tử tế.",
    ],
    step: ["Bớt theo dõi những tài khoản làm bạn thấy tệ về bản thân.", "Chăm sóc cơ thể vì sức khoẻ và niềm vui (ngủ đủ, vận động mình thích), chứ không phải để trừng phạt nó."],
    ask: ["Ai đã nói điều làm bạn buồn vậy?", "Cảm giác này ảnh hưởng tới việc ăn uống hay sinh hoạt của bạn không?"],
    advice: [
      "Tập nói với bản thân một điều bạn thích ở mình mỗi ngày — không nhất thiết về ngoại hình.",
      "Nếu nỗi lo về ngoại hình làm bạn ăn uống thất thường hoặc né tránh mọi người, hãy nói chuyện với bác sĩ hoặc chuyên gia tâm lý nha.",
    ],
  },
  {
    id: "eating",
    re: VN(/\b((tự )?(móc họng|gây nôn|làm cho nôn|cho nôn ra)( \S+){0,4} (sợ (mập|béo|tăng cân)|giảm cân)|nôn ra vì sợ (mập|béo)|ăn xong (là )?(tự )?(móc họng|nôn)|nhịn ăn để giảm|nhịn đói để giảm|bỏ bữa để giảm cân|ăn xong nôn|móc họng|sợ tăng cân quá|sợ ăn|ăn không kiểm soát|ăn vô độ|ăn quá nhiều rồi hối hận|chán ăn|biếng ăn|ăn uống rối loạn|rối loạn ăn uống|anorexia|bulimia)\b/),
    feel: ["Cảm ơn bạn đã tin kể với Lomi 🤍 Chuyện ăn uống gắn với cảm xúc nhiều hơn người ta nghĩ, và bạn không phải một mình.", "Những gì bạn đang trải qua nghe rất mệt mỏi."],
    insight: [
      "Mối quan hệ với đồ ăn thường phản ánh những cảm xúc khó nói — căng thẳng, lo âu, áp lực. Không phải do bạn yếu đuối hay thiếu ý chí.",
      "Đây là chuyện sức khoẻ cần được hỗ trợ đúng cách, và có thể hồi phục được.",
    ],
    step: ["Nếu được, hãy kể cho một người bạn tin tưởng về điều bạn đang trải qua.", "Đặt lịch gặp bác sĩ hoặc chuyên gia tâm lý — họ là người giúp được bạn an toàn nhất."],
    ask: ["Cảm giác này xuất hiện lâu chưa?", "Có ai bên cạnh bạn biết chuyện này không?"],
    advice: [
      "Tìm tới bác sĩ hoặc chuyên gia tâm lý có kinh nghiệm về rối loạn ăn uống — họ sẽ cùng bạn tìm cách phù hợp và an toàn.",
      "Nhẹ nhàng với bản thân. Hồi phục là một quá trình, có ngày tốt ngày chưa tốt, và điều đó hoàn toàn bình thường.",
    ],
    heavy: true,
    stepFirst: true,
  },
  {
    id: "bullied",
    hint: [[VN(/\b(con|cháu) (trai |gái )?(\S+ ){0,4}bị (bạn |bạn bè |mấy đứa |tụi |các bạn )?(bắt nạt|trêu|đánh|cô lập|tẩy chay)/), "Nghe con bị bắt nạt ở trường chắc bạn xót lắm 😔 Điều quan trọng nhất là con thấy có người lớn đứng về phía mình.\n\n• Nghe con kể hết, tin con, đừng trách “sao không đánh lại / sao không nói sớm”\n• Ghi lại cụ thể: ngày giờ, ai, chuyện gì, tin nhắn / hình ảnh nếu có\n• Gặp giáo viên chủ nhiệm, chưa ổn thì gặp ban giám hiệu — đề nghị nhà trường có biện pháp cụ thể và báo lại\n• Để ý dấu hiệu con không ổn: sợ đi học, mất ngủ, thu mình, có vết thương; bị đánh, bị doạ nặng thì có thể báo công an; tổng đài bảo vệ trẻ em **111** hỗ trợ miễn phí\n\nCon kể chuyện này với bạn thế nào, đã bị lâu chưa?", true]],
    re: VN(/\b(bị (bạn |bạn bè |mấy đứa |tụi )?bắt nạt|bị bắt nạt|bắt nạt mình|bị chế giễu|bị cười nhạo|bị trêu chọc|bị trêu|bị chửi trên mạng|bị bóc phốt|bị xúc phạm trên mạng|bị bắt nạt online|bị nhóm bạn tẩy chay|bị cô lập ở lớp|bị đánh ở trường)\b/),
    feel: ["Bị bắt nạt, chế giễu là trải nghiệm rất tổn thương.", "Không ai đáng bị đối xử như vậy. Lỗi không nằm ở bạn đâu."],
    insight: [
      "Người bắt nạt thường muốn thấy mình mạnh hơn bằng cách làm người khác nhỏ đi. Điều đó nói về họ, không phải về bạn.",
      "Im lặng chịu đựng một mình làm vết thương sâu hơn. Nói ra với người có thể giúp là việc can đảm, không phải “mách lẻo”.",
    ],
    step: [
      "Kể với một người lớn bạn tin tưởng: bố mẹ, thầy cô, quản lý — họ có thể can thiệp.",
      "Chụp màn hình, lưu lại bằng chứng nếu bị bắt nạt trên mạng; dùng tính năng Chặn và Báo cáo.",
      "Nếu bị đe doạ hay hành hung, gọi 113 nha.",
    ],
    ask: ["Chuyện này xảy ra ở đâu vậy — trường, chỗ làm hay trên mạng?", "Đã có ai biết chuyện này chưa?"],
    advice: ["Tìm những người bạn tốt, ở gần họ nhiều hơn — bạn không cần nhóm đông, chỉ cần vài người thật lòng.", "Nếu cảm giác sợ hãi, buồn bã kéo dài, nói chuyện với chuyên gia tâm lý sẽ giúp bạn nhẹ lòng hơn."],
    heavy: true,
  },
  {
    id: "homesick",
    re: VN(/\b(nhớ nhà|xa nhà|nhớ bố mẹ|nhớ mẹ|nhớ gia đình|du học|sống một mình ở|lên thành phố (một mình|lạ)|chưa quen nơi mới|lạc lõng ở nơi mới)\b/),
    feel: ["Nhớ nhà là cảm giác chênh vênh ai xa nhà cũng từng trải qua 🥺", "Lomi hiểu, ở nơi mới chưa có ai thân thì những buổi tối thấy trống trải lắm."],
    insight: ["Nhớ nhà cho thấy bạn có một nơi để thương, để quay về — đó là điều may mắn.", "Làm quen với nơi ở mới thường mất vài tháng. Cảm giác lạc lõng sẽ nhạt dần."],
    step: ["Gọi video cho gia đình vào một giờ cố định, có điều để mong chờ mỗi ngày.", "Tạo vài thói quen quen thuộc ở chỗ mới: nấu món ở nhà hay nấu, trang trí góc nhỏ của mình."],
    ask: ["Bạn xa nhà lâu chưa?", "Ở chỗ mới bạn đã quen được ai chưa?"],
    advice: ["Khám phá khu vực mới — quán quen, công viên, góc đọc sách. Mục Khám phá (/kham-pha) trong app giúp tìm chỗ gần bạn đó.", "Tham gia hội đồng hương, câu lạc bộ, hay phòng chat Cộng đồng để có thêm bạn."],
  },
  {
    id: "regret",
    re: VN(/\b(nhớ lại( \S+){0,4} (làm sai|lỗi lầm|sai lầm|lỗi)|(lỗi|sai lầm|làm sai)( \S+){0,3} (từ|cách đây) (nhiều|mấy|vài|\d+) năm|hối hận|hối tiếc|tiếc nuối|giá như|làm sai rồi|sai lầm lớn|không thể tha thứ cho mình|tự trách|dằn vặt|cảm thấy có lỗi)\b/),
    feel: ["Hối hận là cảm giác nặng nề lắm, cứ lặp đi lặp lại trong đầu hoài 😔", "Lomi hiểu, tự trách mình là kiểu đau âm ỉ mà khó buông."],
    insight: [
      "Hối hận chứng tỏ bạn có lương tâm và biết điều gì quan trọng với mình.",
      "Bạn của hôm qua quyết định dựa trên những gì bạn biết lúc đó. Giờ nhìn lại mới thấy rõ, nhưng lúc ấy thì không.",
    ],
    step: ["Viết ra điều bạn học được từ chuyện đó — biến nỗi tiếc thành bài học.", "Nếu có thể sửa sai hay xin lỗi ai đó, hãy làm — dù người kia phản ứng thế nào, lòng bạn cũng nhẹ hơn."],
    ask: ["Chuyện gì làm bạn tiếc nuối vậy?", "Bạn nghĩ mình có thể làm gì để lòng nhẹ hơn không?"],
    advice: ["Tự tha thứ không có nghĩa là coi như chưa có gì, mà là cho phép mình bước tiếp và làm tốt hơn.", "Nói với bản thân như một người bạn: “Mình đã sai, mình đang học, mình sẽ ổn.”"],
  },
  {
    id: "compare",
    re: VN(/\b((\d{2}|ba mươi|hai mươi lăm|ba lăm|bốn mươi) tuổi( rồi)? mà (vẫn )?(chưa|chẳng|không) (có gì|ra gì|làm được gì|có gì trong tay)|so sánh với người khác|thua kém (bạn bè|mọi người|người khác|người ta|ai)|(thấy|cảm thấy) (mình |bản thân )?thua kém|ai cũng thành công hơn|(hay |cứ |luôn )?so sánh (mình|bản thân|em|tôi|tui|anh|chị) với|ai cũng hơn mình|ai cũng giỏi hơn|giỏi hơn mình|bạn bè thành công|bạn bè đều có|thua bạn bằng|fomo|lướt mạng thấy buồn|nhìn người ta thấy tủi|thấy mình chậm chân|bằng tuổi người ta)\b/),
    feel: ["Lướt mạng thấy ai cũng thành công, còn mình thì dậm chân — cảm giác đó khó chịu lắm, Lomi hiểu 😔"],
    insight: [
      "Mạng xã hội là “cuộn phim nổi bật” của người khác, không phải cuộc sống thật của họ.",
      "Mỗi người có một dòng thời gian riêng. Có người thành công sớm, có người muộn — không ai trễ cả.",
    ],
    step: ["Tạm nghỉ mạng xã hội vài ngày hoặc bỏ theo dõi những tài khoản làm bạn thấy tệ.", "So sánh với chính mình của năm ngoái — đó là thước đo công bằng nhất."],
    ask: ["Điều gì làm bạn thấy mình thua kém nhất?", "Nếu không so với ai, bạn thật sự muốn đạt được điều gì?"],
    advice: ["Đặt mục tiêu của riêng mình, chia nhỏ và ghi nhận từng bước tiến.", "Chúc mừng thành công của người khác một cách thật lòng — lạ là nó giúp mình nhẹ lòng hơn."],
  },
  {
    id: "lgbt",
    re: VN(/\b((là|mình là|anh là|em là) (đồng tính|song tính)|đồng tính|les|lgbt|song tính|chuyển giới|come out|comeout|công khai xu hướng|xu hướng tính dục|giới tính thật|không được chấp nhận giới tính)\b/),
    feel: ["Cảm ơn bạn đã tin tưởng chia sẻ với Lomi 🌈 Bạn được là chính mình, và bạn xứng đáng được yêu thương như bất kỳ ai.", "Lomi hiểu, sống thật với bản thân mà sợ không được chấp nhận thì áp lực lắm 🤍"],
    insight: [
      "Xu hướng tính dục hay bản dạng giới là một phần tự nhiên của con người, không phải bệnh hay lỗi của ai cả.",
      "Công khai hay không, khi nào, với ai — là quyền của bạn. Không ai được ép bạn.",
    ],
    step: ["Tìm tới những người, những cộng đồng an toàn, tôn trọng bạn — có họ bên cạnh sẽ đỡ cô đơn nhiều.", "Nếu muốn nói với gia đình, có thể bắt đầu với một người bạn nghĩ sẽ dễ hiểu nhất."],
    ask: ["Bạn đang lo lắng điều gì nhất?", "Có ai xung quanh biết và ủng hộ bạn chưa?"],
    advice: [
      "Chọn thời điểm bạn thấy an toàn để chia sẻ. Gia đình có thể cần thời gian để hiểu — phản ứng ban đầu chưa phải là cuối cùng.",
      "Nếu bạn gặp kỳ thị, bắt nạt hoặc thấy quá áp lực, nói chuyện với chuyên gia tâm lý thân thiện với cộng đồng LGBT sẽ giúp bạn rất nhiều.",
    ],
  },
  {
    id: "confidence",
    re: VN(/\b(muốn tự tin|làm sao tự tin|tự tin hơn|thiếu tự tin|muốn thay đổi bản ?thân|phát triển bản ?thân|muốn tốt hơn|sống tích cực|làm sao để sống vui|bắt đầu lại|làm lại từ đầu)\b/),
    feel: ["Muốn trở nên tốt hơn là một mong muốn rất đẹp, Lomi ủng hộ bạn hết mình 💪", "Ui, nghe bạn muốn thay đổi là Lomi thấy có năng lượng liền 🌱"],
    insight: [
      "Tự tin không phải là không sợ, mà là dám làm dù còn sợ. Nó được xây từ những lần mình giữ lời hứa với chính mình.",
      "Thay đổi bền vững đến từ những thói quen nhỏ lặp lại, không phải một cú lột xác trong một ngày.",
    ],
    step: ["Chọn MỘT thói quen nhỏ bắt đầu từ ngày mai (dậy sớm hơn 15 phút, đi bộ 10 phút, đọc 5 trang sách).", "Ghi lại mỗi ngày một việc bạn làm được — nhìn lại sau 1 tháng sẽ thấy mình khác nhiều."],
    ask: ["Bạn muốn thay đổi điều gì nhất ở bản thân?", "Điều gì đang cản bạn bắt đầu?"],
    advice: ["Ở gần những người truyền năng lượng tích cực, bớt thời gian với ai làm bạn thấy nhỏ bé.", "Chăm sóc nền tảng: ngủ đủ, vận động, ăn uống lành mạnh — tinh thần vững bắt đầu từ cơ thể khoẻ."],
  },

  // ═══════════════════════ SỨC KHOẺ ═══════════════════════
  {
    id: "pregnant",
    // 10/10: chỉ khi LO / NGHI có thai ("sợ có bầu", "trễ kinh", "có thai không ta") — câu hỏi kiến thức thai kỳ ("mang thai mấy tuần thì
    // siêu âm được") không phải lo trễ kinh.
    re: VN(/\b((lo|sợ|nghi|hay là|chắc là|liệu) (mình |em |e |chị |c |tôi |tui |vợ |bạn gái |ny |người yêu )?(đã |bị )?(có thai|có bầu|mang thai|dính bầu)|(có thai|có bầu|dính bầu) (rồi )?(không|ko|k|chưa|hả|ha|à|a)|lo có bầu|sợ có bầu|trễ kinh|chưa có kinh|que thử thai|thử thai|vỡ kế hoạch|lo dính bầu|sợ dính bầu)\b/),
    feel: ["Lomi hiểu, lo lắng chuyện này làm mình bồn chồn không yên 🤍", "Bình tĩnh nha, Lomi ở đây với bạn. Mình cùng xem nên làm gì trước."],
    insight: [
      "Trễ kinh có thể do nhiều lý do: căng thẳng, thay đổi cân nặng, thiếu ngủ, rối loạn nội tiết… chứ không chỉ do có thai.",
      "Lo lắng quá cũng có thể làm chu kỳ lệch đi thêm. Cách tốt nhất để hết lo là kiểm tra cho rõ.",
    ],
    step: [
      "Thử que thử thai (bán ở nhà thuốc) sau khi trễ kinh vài ngày, làm theo hướng dẫn trên bao bì — thử buổi sáng thường rõ hơn.",
      "Đi khám bác sĩ Sản phụ khoa để được xét nghiệm và tư vấn chính xác nhất.",
    ],
    ask: ["Bạn đã thử que lần nào chưa?", "Bạn có người thân hay người bạn tin tưởng để đi cùng không?"],
    advice: [
      "Dù kết quả thế nào, bạn có quyền được tư vấn đầy đủ và quyết định cho cơ thể mình. Bác sĩ Sản phụ khoa sẽ giải thích mọi lựa chọn an toàn.",
      "Tránh tự dùng thuốc không rõ nguồn gốc hoặc theo lời mách trên mạng — có thể rất nguy hiểm.",
      "Về lâu dài, tìm hiểu một biện pháp tránh thai phù hợp với bác sĩ để yên tâm hơn.",
    ],
    stepFirst: true,
  },
  {
    id: "period",
    re: VN(/\b(đau bụng kinh|đến tháng|kinh nguyệt|chu kỳ kinh|chu kì kinh|kinh không đều|rong kinh|kỳ kinh|kì kinh|tiền kinh nguyệt|pms)\b/),
    feel: ["Mấy ngày “đèn đỏ” mệt lắm ha 🥺 Thương bạn.", "Lomi hiểu, đau bụng kinh có khi làm mình chẳng muốn làm gì luôn."],
    insight: ["Đau bụng kinh nhẹ đến vừa là khá phổ biến. Nhưng đau dữ dội, kéo dài, hay chu kỳ thất thường nhiều tháng thì nên đi khám.", "Hormone thay đổi trước kỳ kinh có thể làm tâm trạng lên xuống — bạn không “khó ở vô cớ” đâu."],
    step: ["Chườm ấm bụng dưới, uống nước ấm, nghỉ ngơi nhiều hơn một chút.", "Vận động nhẹ như đi bộ, giãn cơ giúp giảm co thắt."],
    ask: ["Bạn đau nhiều không?", "Chu kỳ của bạn có đều không?"],
    advice: [
      "Nếu cần thuốc giảm đau, hỏi dược sĩ hoặc bác sĩ loại phù hợp với bạn nha.",
      "Đi khám Sản phụ khoa nếu đau tới mức không đi học/đi làm được, ra máu quá nhiều, hoặc chu kỳ rối loạn kéo dài.",
    ],
    stepFirst: true,
  },
  {
    id: "headache",
    re: VN(/\b(đau đầu|nhức đầu|đau nửa đầu|đau nửa đầu đau|đau đầu hoài|đau đầu liên tục|bị chóng mặt|hay chóng mặt|chóng mặt quá|choáng váng|hoa mắt|xây xẩm)\b/),
    feel: ["Đau đầu khó chịu lắm, làm gì cũng không tập trung được 😣", "Thương bạn, chóng mặt đau đầu thì mệt cả người."],
    insight: ["Đau đầu hay liên quan tới thiếu ngủ, căng thẳng, uống ít nước, nhìn màn hình lâu hoặc bỏ bữa.", "Nếu đau đầu dữ dội đột ngột, kèm nôn, sốt cao, yếu tay chân, nói khó hay nhìn mờ — đó là dấu hiệu cần đi cấp cứu ngay."],
    step: ["Uống một ly nước, nghỉ ngơi ở chỗ yên tĩnh, ít ánh sáng một chút.", "Rời màn hình, nhắm mắt thư giãn, xoa nhẹ thái dương và vai gáy."],
    ask: ["Bạn bị vậy lâu chưa?", "Dạo này bạn có thiếu ngủ hay căng thẳng không?"],
    advice: [
      "Ngủ đủ, ăn đúng bữa, uống đủ nước — ba điều đơn giản giúp giảm đau đầu rất nhiều.",
      "Đau đầu thường xuyên hoặc ngày càng nặng thì nên đi khám Nội thần kinh để tìm nguyên nhân, đừng tự uống thuốc giảm đau kéo dài.",
      "Có dấu hiệu nguy hiểm (đau dữ dội đột ngột, yếu liệt, nói khó) thì gọi 115 ngay nha.",
    ],
    stepFirst: true,
  },
  {
    id: "stomach",
    re: VN(/\b(đau dạ dày|đau bao tử|trào ngược|ợ chua|ợ nóng|đầy bụng|khó tiêu|tiêu chảy|đi ngoài nhiều|táo bón|đau bụng hoài|buồn nôn|ngộ độc thực phẩm)\b/),
    feel: ["Đau bụng, khó tiêu thì khó chịu cả ngày luôn 😣", "Thương bạn, bụng dạ không yên thì ăn gì cũng không ngon."],
    insight: ["Dạ dày rất “nhạy cảm” với căng thẳng, ăn uống thất thường, đồ cay nóng, rượu bia, cà phê.", "Nếu đau dữ dội, nôn ra máu, đi ngoài phân đen, sốt cao hay mất nước — cần đi khám ngay."],
    step: ["Ăn chậm, chia nhỏ bữa, tránh đồ cay, chua, dầu mỡ vài hôm.", "Không nằm ngay sau khi ăn, bữa tối nên cách giờ ngủ vài tiếng."],
    ask: ["Bạn bị vậy bao lâu rồi?", "Dạo này bạn ăn uống có đúng bữa không?"],
    advice: [
      "Tiêu chảy thì nhớ uống đủ nước (có thể dùng dung dịch bù nước mua ở nhà thuốc).",
      "Đau dạ dày kéo dài hoặc tái đi tái lại, nên khám Tiêu hoá để được chẩn đoán và điều trị đúng.",
      "Hạn chế tự mua thuốc dạ dày dùng lâu dài khi chưa có chỉ định của bác sĩ.",
    ],
    stepFirst: true,
  },
  {
    // Nghẹt mũi kéo dài / lệ thuộc thuốc xịt co mạch (Otilin, Otrivin, Naphazolin…) — thông tin phổ thông, không kê thuốc.
    id: "nasal",
    hint: [
      [
        VN(/\b(otilin|otrivin|naphazolin|xylometazolin|xịt mũi)\b/),
        "Có một điều quan trọng nè: thuốc xịt thông mũi như Otilin, Otrivin, Naphazolin chỉ nên dùng ngắn ngày (hộp thuốc thường ghi vài ngày). Xịt lâu dài dễ bị “nghẹt mũi dội ngược” — hết thuốc là nghẹt hơn, lại phải xịt tiếp, thành vòng lặp lệ thuộc thuốc (bác sĩ gọi là viêm mũi do thuốc). Có khi chính nó làm bạn mãi không dứt được đó.",
      ],
    ],
    re: VN(/\b(otilin|otrivin|naphazolin|xylometazolin|thuốc xịt mũi|xịt mũi hoài|xịt mũi hằng ngày|xịt mũi hàng ngày|xịt mũi mỗi ngày|không xịt không thở được|nghẹt mũi (kéo dài|hoài|lâu|quanh năm|mãn tính|lâu năm)|nghẹt mũi hoài|ngạt mũi hoài|viêm xoang|viêm mũi|dị ứng mũi|polyp mũi|khó thở bằng mũi)\b/),
    feel: [
      "Nghẹt mũi kéo dài khó chịu lắm luôn, ngủ không ngon, đầu óc cũng nặng theo 😣 Đi khám hoài mà không đỡ thì nản thật sự.",
      "Lomi hiểu, uống thuốc hết đợt này tới đợt khác mà mũi vẫn nghẹt thì vừa mệt vừa bực ghê 🥺",
    ],
    insight: [
      "Có một điều nhiều người không biết: các loại thuốc xịt thông mũi co mạch như Otilin, Otrivin, Naphazolin chỉ nên dùng ngắn ngày (hướng dẫn trên hộp thường ghi vài ngày). Dùng lâu dài dễ bị “nghẹt mũi dội ngược” — hết thuốc là nghẹt hơn, phải xịt tiếp, thành vòng lặp lệ thuộc thuốc (bác sĩ gọi là viêm mũi do thuốc).",
      "Nghẹt mũi kéo dài hay gặp do viêm mũi dị ứng, viêm xoang, lệch vách ngăn hoặc polyp mũi — mỗi nguyên nhân chữa một kiểu, nên cần tìm đúng gốc thay vì chỉ uống thuốc cho đỡ triệu chứng.",
      "Khí hậu lạnh ẩm như Đà Lạt, bụi nhà, mạt bụi, lông thú là những thứ hay làm mũi dị ứng nặng hơn.",
    ],
    step: [
      "Đi khám bác sĩ chuyên khoa Tai Mũi Họng (ưu tiên bệnh viện lớn), xin nội soi mũi xoang để xem rõ nguyên nhân — và nhớ nói thật là bạn đang xịt Otilin thường xuyên, bao lâu rồi.",
      "Mang theo danh sách (hoặc chụp hình) các thuốc đã dùng trước đây để bác sĩ không kê trùng những thứ không hiệu quả.",
      "Rửa mũi bằng nước muối sinh lý giúp mũi thông thoáng hơn mà không gây lệ thuộc.",
    ],
    ask: ["Bạn xịt Otilin lâu chưa?", "Bạn bị nghẹt quanh năm, hay nặng hơn vào lúc trời lạnh / buổi sáng?", "Bạn đã được nội soi mũi lần nào chưa?"],
    advice: [
      "Đừng tự ngưng hay tự đổi thuốc đột ngột nha — hãy nhờ bác sĩ Tai Mũi Họng hướng dẫn cách giảm dần thuốc xịt co mạch và thay bằng cách điều trị phù hợp, an toàn hơn khi dùng lâu dài.",
      "Nếu nghi dị ứng, có thể hỏi bác sĩ về xét nghiệm dị ứng để biết mình “kỵ” cái gì mà tránh.",
      "Giữ phòng ngủ sạch bụi, giặt chăn gối thường xuyên, hạn chế thú cưng lên giường, đeo khẩu trang khi ra đường bụi hoặc trời lạnh.",
      "Nếu đã khám nhiều nơi mà không đỡ, thử một bệnh viện chuyên khoa Tai Mũi Họng lớn để có ý kiến thứ hai.",
    ],
    stepFirst: true,
  },
  {
    id: "flu",
    re: VN(/\b(bị cảm cúm|bị cảm lạnh|cảm cúm|cảm lạnh|bị cúm|sổ mũi|nghẹt mũi|bị ho (khan|nhiều|hoài|dai|lâu)|ho có đờm|ho khan|ho nhiều|ho hoài|đau họng|viêm họng|bị sốt|sốt cao|phát sốt|hắt hơi)\b/),
    feel: ["Ốm vậy mệt ghê, thương bạn 🤒 Nghỉ ngơi cho khoẻ nha.", "Thời tiết thay đổi dễ cảm lắm, nhất là Đà Lạt trời lạnh. Bạn giữ ấm nha 🧣"],
    insight: ["Cảm cúm thông thường hay tự khỏi sau khoảng một tuần nếu nghỉ ngơi, ăn uống đủ.", "Sốt cao không hạ, khó thở, đau ngực, lừ đừ, hay ho kéo dài nhiều tuần thì cần đi khám."],
    step: ["Nghỉ ngơi, uống nhiều nước ấm, ăn cháo súp dễ tiêu.", "Súc miệng nước muối, giữ ấm cổ và ngực, đeo khẩu trang để không lây cho người khác."],
    ask: ["Bạn bị mấy ngày rồi?", "Bạn có sốt cao không?"],
    advice: [
      "Thuốc hạ sốt, giảm triệu chứng thì hỏi dược sĩ hoặc bác sĩ loại và liều phù hợp nha — đặc biệt nếu có bệnh nền, đang mang thai hay cho trẻ nhỏ dùng.",
      "Không tự ý dùng kháng sinh — cảm cúm do virus thì kháng sinh không có tác dụng.",
      "Đi khám nếu sốt cao kéo dài, khó thở, hay người già, trẻ nhỏ bị ốm.",
    ],
    stepFirst: true,
  },
  {
    id: "backpain",
    re: VN(/\b(đau lưng|mỏi lưng|đau cổ gáy|mỏi cổ gáy|bị cứng cổ|cứng cổ gáy|cổ bị cứng|đau vai gáy|mỏi vai gáy|đau cổ vai gáy|thoát vị|đau khớp|ngồi lâu đau|đau cột sống)\b/),
    feel: ["Đau lưng mỏi cổ là “bệnh nghề nghiệp” của dân ngồi nhiều đó 😣", "Thương bạn, đau nhức kéo dài làm người uể oải lắm."],
    insight: ["Ngồi sai tư thế, cúi điện thoại nhiều, ít vận động là nguyên nhân thường gặp nhất.", "Đau lan xuống chân, tê bì, yếu tay chân thì cần đi khám sớm."],
    step: ["Cứ 45–60 phút đứng dậy đi lại, vươn vai vài phút.", "Chỉnh màn hình ngang tầm mắt, ghế có tựa lưng, hai chân chạm sàn."],
    ask: ["Bạn đau lâu chưa?", "Công việc của bạn có phải ngồi nhiều không?"],
    advice: ["Tập các bài giãn cơ cổ vai gáy, lưng nhẹ nhàng mỗi ngày; bơi lội, yoga cũng rất tốt.", "Đau kéo dài hoặc kèm tê yếu thì khám Cơ xương khớp hoặc Vật lý trị liệu."],
    stepFirst: true,
  },
  {
    id: "eyes",
    re: VN(/\b(mỏi mắt|khô mắt|nhức mắt|mờ mắt|cận thị tăng|nhìn màn hình nhiều|đau mắt|chảy nước mắt)\b/),
    feel: ["Nhìn màn hình nhiều thì mắt mỏi là chuyện thường gặp lắm 😵", "Thương đôi mắt làm việc chăm chỉ của bạn ghê."],
    insight: ["Khi nhìn màn hình, mình chớp mắt ít hơn hẳn nên mắt dễ khô và mỏi."],
    step: ["Áp dụng quy tắc 20-20-20: cứ 20 phút, nhìn xa khoảng 6 mét trong 20 giây.", "Chỉnh độ sáng màn hình vừa phải, không dùng điện thoại trong bóng tối."],
    ask: ["Mỗi ngày bạn nhìn màn hình khoảng bao lâu?"],
    advice: ["Nếu mắt mờ, đau, đỏ kéo dài hay thị lực giảm, nên đi khám Mắt.", "Nhớ chớp mắt thường xuyên, ra ngoài trời nhìn xa khi có thể."],
    stepFirst: true,
  },
  {
    id: "weight",
    re: VN(/\b(muốn giảm cân|giảm cân|giảm mỡ|muốn tăng cân|tăng cân|béo phì|thừa cân|ăn kiêng|chế độ ăn|ăn sao cho khoẻ|ăn uống lành mạnh|eat clean)\b/),
    feel: ["Muốn chăm sóc cơ thể là một điều rất đáng khen 💪", "Lomi ủng hộ bạn sống khoẻ hơn nè 🌱"],
    insight: [
      "Cơ thể khoẻ quan trọng hơn con số trên cân. Thay đổi từ từ, bền vững tốt hơn nhiều so với ăn kiêng khắt khe.",
      "Nhịn ăn hay cắt bỏ hẳn nhóm chất dễ gây mệt mỏi và dễ tăng lại — không phải cách lâu dài.",
    ],
    step: ["Thêm rau, trái cây vào mỗi bữa; uống nước lọc thay nước ngọt.", "Tìm một môn vận động bạn thấy vui để duy trì được lâu."],
    ask: ["Bạn muốn thay đổi vì sức khoẻ hay vì điều gì khác?", "Dạo này bạn ăn uống, ngủ nghỉ thế nào?"],
    advice: [
      "Nếu muốn có kế hoạch cụ thể, hãy gặp bác sĩ Dinh dưỡng — họ sẽ tư vấn phù hợp với cơ thể và sức khoẻ của riêng bạn.",
      "Ngủ đủ và bớt căng thẳng cũng ảnh hưởng tới cân nặng nhiều hơn mình nghĩ.",
      "Nếu việc lo về cân nặng làm bạn căng thẳng, sợ ăn hoặc ăn mất kiểm soát, hãy nói chuyện với bác sĩ hoặc chuyên gia tâm lý nha.",
    ],
  },
  {
    id: "skin",
    re: VN(/\b(nổi mụn|bị mụn|mụn trứng cá|mụn ẩn|da mụn|mụn nhiều|thâm mụn|da xấu|khô da|dị ứng da|rụng tóc|hói đầu|tóc rụng nhiều)\b/),
    feel: ["Da nổi mụn hay tóc rụng nhiều làm mình mất tự tin ghê, Lomi hiểu 😔"],
    insight: ["Mụn và rụng tóc hay bị ảnh hưởng bởi căng thẳng, thiếu ngủ, nội tiết và thói quen chăm sóc.", "Nặn mụn bằng tay dễ để lại thâm sẹo và nhiễm trùng hơn."],
    step: ["Giữ vệ sinh da nhẹ nhàng, không chà xát mạnh; thay vỏ gối thường xuyên.", "Ngủ đủ và bớt thức khuya — da và tóc “hồi phục” khi mình ngủ."],
    ask: ["Tình trạng này kéo dài lâu chưa?", "Dạo này bạn có căng thẳng hay đổi mỹ phẩm gì không?"],
    advice: ["Mụn viêm nhiều, để lại sẹo hay rụng tóc thành mảng thì nên khám bác sĩ Da liễu.", "Cẩn thận với mỹ phẩm, thuốc trôi nổi không rõ nguồn gốc."],
    stepFirst: true,
  },
  {
    id: "hangover",
    re: VN(/\b(say rượu|say xỉn|xỉn quá|còn say|nhức đầu sau khi nhậu|mệt sau khi nhậu|uống nhiều quá|đau đầu vì rượu|giải rượu)\b/),
    feel: ["Hôm qua “chiến” căng quá hả 😅 Mệt ghê, thương bạn.", "Say xỉn xong sáng ra khó chịu lắm ha."],
    insight: ["Rượu làm cơ thể mất nước và rối loạn giấc ngủ, nên sáng ra mới mệt, đau đầu như vậy."],
    step: ["Uống nhiều nước lọc, nước điện giải, ăn chút cháo hay súp nhẹ bụng.", "Nghỉ ngơi thêm, và tuyệt đối không lái xe khi còn hơi men nha."],
    ask: ["Giờ bạn thấy đỡ hơn chưa?"],
    advice: [
      "Lần sau ăn no trước khi uống, uống xen nước lọc, và biết điểm dừng.",
      "Nếu người say nôn nhiều, lơ mơ, khó đánh thức hay thở chậm — gọi 115 ngay, đó có thể là ngộ độc rượu.",
    ],
    stepFirst: true,
  },
  {
    id: "smoking",
    re: VN(/\b(bỏ thuốc|cai thuốc|hút thuốc|thuốc lá|thuốc lá điện tử|vape)\b/),
    feel: ["Muốn bỏ thuốc là một quyết định tuyệt vời, Lomi ủng hộ bạn hết mình 💪"],
    insight: ["Cơn thèm thuốc thường chỉ kéo dài vài phút rồi qua. Vượt qua được từng cơn là thắng từng chút một.", "Nhiều người phải thử vài lần mới bỏ hẳn được — tái nghiện không có nghĩa là thất bại."],
    step: ["Chọn một ngày bắt đầu, báo cho người thân để có người động viên.", "Khi thèm, thử uống nước, nhai kẹo cao su, đi bộ vài phút để qua cơn."],
    ask: ["Bạn hút lâu chưa?", "Bạn hay thèm nhất vào lúc nào?"],
    advice: ["Tránh những tình huống gắn với thói quen hút (cà phê, nhậu) trong những tuần đầu.", "Bác sĩ có thể tư vấn các phương pháp hỗ trợ cai thuốc phù hợp — bạn không phải tự chiến đấu một mình."],
  },
  {
    id: "caregiver",
    re: VN(/\b((bố|mẹ|ba|bà|cha|ông|bà nội|bà ngoại|ông nội|ông ngoại|con|vợ|chồng) (mình |tôi |em )?(bị bệnh|ốm|nằm viện|nhập viện|đang bệnh|bệnh nặng|phải mổ)|chăm người bệnh|nuôi bệnh|lo cho bố mẹ|lo cho sức khoẻ của (bố|mẹ))\b/),
    feel: ["Người thân bị bệnh thì mình lo đứng ngồi không yên, Lomi hiểu lắm 🤍", "Vừa lo cho người thân vừa phải lo cho mọi thứ khác — chắc bạn mệt lắm."],
    insight: ["Chăm người bệnh rất hao sức và hao tâm. Mệt mỏi, cáu gắt, thậm chí kiệt sức là chuyện bình thường.", "Muốn chăm tốt cho người thân thì bạn cũng cần giữ sức cho chính mình."],
    step: ["Chia sẻ việc chăm sóc với người nhà khác, đừng ôm hết một mình.", "Ghi lại lời bác sĩ dặn, lịch khám, lịch thuốc để đỡ rối."],
    ask: ["Người thân của bạn bị bệnh gì vậy?", "Có ai cùng bạn chăm sóc không?"],
    advice: ["Hỏi bác sĩ điều trị thật rõ về tình trạng, hướng điều trị và cách chăm sóc tại nhà.", "Dành cho mình vài khoảng nghỉ ngắn mỗi ngày — ăn uống, ngủ nghỉ đầy đủ để còn sức đồng hành lâu dài."],
    heavy: true,
  },
];
