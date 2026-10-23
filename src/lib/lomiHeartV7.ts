// ─────────────────────────────────────────────────────────────────────────────
// TÂM SỰ — QA V7 (23/10, tự soạn: 10 cuộc tâm sự 7–10 lượt). Chủ đề mới + ý riêng bổ sung cho chủ đề có sẵn.
//   • parenting   — con ăn vạ, quát con rồi áy náy, vợ chồng bất đồng cách dạy con, con mê điện thoại
//   • parentsclash— mâu thuẫn với ba mẹ về lựa chọn cuộc đời (về quê, nghề, hôn nhân), cảm giác "bất hiếu"
//   • overwork    — làm 12 tiếng / cả cuối tuần, thấy mình như cái máy, không còn thấy vui
//   (ý riêng cho grief, breakup, study, lonely, compare, selfworth, angerself, addict ở V7_HINTS / V7_ADVICE_HINTS)
// ─────────────────────────────────────────────────────────────────────────────
import { VN } from "@/lib/viMatch";
import type { Theme } from "@/lib/lomiHeart";

export const V7_THEMES: Theme[] = [
  {
    id: "parenting",
    re: VN(/\b(con (\S+ ){0,4}(ăn vạ|khóc lóc|lăn ra khóc|ương bướng|bướng bỉnh|lì lợm|hay cãi|không nghe lời|đòi điện thoại|mê điện thoại|mê ipad|xem điện thoại (suốt|hoài|cả ngày))|(quát|la|mắng|đánh|đòn|phạt) con|dạy con|nuôi con|bất đồng (chuyện|về|cách) (dạy|nuôi) con|chiều con|làm (ba|bố|mẹ|cha) (mệt|khó|áp lực))\b/),
    feel: ["Làm ba mẹ là việc khó nhất mà chẳng ai được dạy trước — mệt, bực rồi lại thương, chuyện đó ai làm cha mẹ cũng trải qua 💚"],
    insight: ["Trẻ 2–5 tuổi ăn vạ là chuyện rất thường gặp: bé chưa đủ lời để nói “con thất vọng”, nên nói bằng cách khóc, lăn ra. Bé cần người lớn bình tĩnh giữ ranh giới, không cần người lớn thắng bé."],
    step: ["Lần tới bé ăn vạ: ngồi xuống ngang tầm mắt, gọi tên cảm xúc của bé (“Con đang buồn vì muốn xem tiếp”), giữ ranh giới bằng giọng bình tĩnh, và chờ cơn qua."],
    ask: ["Bé thường ăn vạ vào lúc nào nhất — khi bị dừng điện thoại, lúc đói mệt, hay lúc ba mẹ bận?"],
    advice: [
      "Báo trước khi dừng: “5 phút nữa mình cất điện thoại nha”, hẹn giờ cho bé thấy — bé dễ chịu hơn nhiều so với bị tắt đột ngột.",
      "Giữ ranh giới nhẹ mà chắc: không quát, không chiều theo vì bé khóc to hơn — bé học rằng ăn vạ không đổi được kết quả.",
      "Khen ngay những lúc bé tự dừng hoặc bình tĩnh lại được.",
      "Với trẻ 2–5 tuổi, Viện Nhi khoa Hoa Kỳ khuyên giới hạn màn hình khoảng 1 tiếng mỗi ngày, nội dung phù hợp và có người lớn xem cùng khi được.",
      "Hai vợ chồng thống nhất vài luật chính với nhau lúc riêng tư, rồi cùng giữ trước mặt con.",
    ],
    hint: [
      [VN(/\b(quát|la|mắng|đánh) con\b.*\b(tội lỗi|hối hận|áy náy|ân hận)|\b(tội lỗi|hối hận|áy náy|ân hận)\b/), "Quát con xong thấy áy náy là chuyện rất nhiều ba mẹ gặp — và chính sự áy náy đó cho thấy bạn thương con 💚\n\nĐiều quan trọng là **làm lành sau đó**: khi đã bình tĩnh, ôm con và nói “Lúc nãy ba/mẹ to tiếng với con, ba/mẹ xin lỗi. Ba/mẹ vẫn thương con.” Con học được cách sửa sai từ chính lúc đó. Lần sau thấy mình sắp quát, thử bước ra chỗ khác vài nhịp thở trước nha.\n\nBạn hay quát con nhất vào lúc nào — lúc mệt sau giờ làm, hay lúc vội?", true],
      [VN(/\b(vợ|chồng|bà xã|ông xã|ông bà|bà nội|bà ngoại)( \S+){0,3} (chiều|bênh|nuông chiều)|bất đồng (chuyện|về|cách) (dạy|nuôi) con|khác cách dạy con\b/), "Hai người lớn dạy con khác nhau thì con dễ “chọn phe” và ranh giới bị lỏng — chuyện này rất nhiều nhà gặp.\n\nThử ngồi riêng với nhau lúc cả hai bình tĩnh, **không có mặt con**: thống nhất 2–3 luật quan trọng nhất (vd giờ xem điện thoại, giờ ngủ), và cách xử lý khi con ăn vạ. Nếu có bất đồng ngay trước mặt con, người kia tạm im, rồi bàn lại sau. Nói với vợ/chồng theo kiểu “mình cùng một đội” sẽ dễ nghe hơn là trách “em chiều con quá”.\n\nTheo bạn, hai người khác nhau nhiều nhất ở chuyện nào?", true],
      [VN(/\b(điện thoại|ipad|máy tính bảng|tivi|youtube|màn hình)\b/), "Bị dừng điện thoại đột ngột là “ngòi nổ” hay gặp nhất ở trẻ nhỏ — vì video không có điểm dừng tự nhiên.\n\n• Báo trước và hẹn giờ: “còn 5 phút nữa nha”, để bé tự bấm tắt khi chuông reo\n• Có sẵn hoạt động thay thế bé thích ngay sau đó (đọc truyện, ra sân, xếp hình)\n• Đặt giờ cố định trong ngày, không dùng điện thoại để dỗ bé nín\n• Với trẻ 2–5 tuổi, nên giới hạn khoảng 1 tiếng mỗi ngày\n\nHiện bé xem khoảng bao lâu mỗi ngày?", true],
      [VN(/\b(làm sao|nên làm sao|phải làm sao|nên làm gì|làm thế nào|cách nào)\b/), "Mình thử vài cách mà nhiều nhà thấy hiệu quả nha:\n• **Báo trước khi dừng** việc bé đang thích (“5 phút nữa…”), có hẹn giờ\n• Lúc bé ăn vạ: ngồi xuống ngang tầm mắt, gọi tên cảm xúc của bé, giữ ranh giới bằng giọng bình tĩnh — không quát, nhưng cũng không chiều theo\n• Khen ngay khi bé tự bình tĩnh lại\n• Nếu lỡ quát, làm lành với con khi đã bình tĩnh\n• Hai vợ chồng thống nhất luật chung lúc riêng tư\n\nNếu bé ăn vạ rất dữ dội, kéo dài hơn 25–30 phút, hay tự làm đau mình, hoặc chậm nói, khó giao tiếp — nên hỏi bác sĩ nhi để được tư vấn thêm.", true],
    ],
  },
  {
    id: "parentsclash",
    re: VN(/\b((với|và) (ba mẹ|bố mẹ|cha mẹ|ba|bố|mẹ|má|ông bà)( \S+){0,3} (cãi nhau|hay cãi|to tiếng|bất đồng|xung đột|không hợp)|(ba mẹ|bố mẹ|cha mẹ|ba|bố|mẹ|gia đình) (muốn|bắt|ép|cứ đòi|đòi)( \S+){0,3} (về quê|lấy vợ|lấy chồng|cưới|đổi nghề|nghỉ việc|học ngành|làm nghề|làm công chức|ở gần)|thấy (mình )?bất hiếu|sợ (mình )?bất hiếu|như vậy là bất hiếu)\b/),
    feel: ["Thương ba mẹ mà vẫn muốn sống theo lựa chọn của mình — đứng giữa hai thứ đó mệt lắm 😔"],
    insight: ["Ba mẹ thường lo vì thương, theo cách của thế hệ họ; còn mình muốn tự chọn cuộc đời mình. Hai điều đó có thể cùng đúng. Muốn sống cuộc đời của mình **không có nghĩa là bất hiếu**."],
    step: ["Thay vì nói “con không về”, thử kể cho ba mẹ nghe kế hoạch cụ thể của mình — ba mẹ thường bớt lo khi thấy con có tính toán."],
    ask: ["Theo bạn, điều ba mẹ lo nhất là gì — sợ bạn vất vả, muốn có con ở gần, hay chuyện khác?"],
    advice: [
      "Chọn lúc mọi người bình tĩnh, không nói chuyện này khi đang mệt hay đang giận.",
      "Nói từ nỗi thương trước: “Con biết ba mẹ muốn con về vì lo cho con…”, rồi mới nói mong muốn của mình.",
      "Đưa kế hoạch cụ thể: công việc, thu nhập, khi nào về thăm, nếu ba mẹ ốm thì mình sẽ làm gì.",
      "Nhờ một người ba mẹ tin (cô chú, anh chị) nói giúp nếu nói trực tiếp hay căng.",
      "Không cần thắng trong một lần nói — đôi khi ba mẹ cần thời gian để quen với lựa chọn của con.",
    ],
    hint: [
      [VN(/\bbất hiếu\b/), "Cảm giác “mình bất hiếu” cho thấy bạn thương ba mẹ nhiều lắm, chứ không phải bạn là đứa con tệ 💚 Hiếu thảo không có nghĩa là phải làm theo mọi điều ba mẹ muốn — mà là vẫn quan tâm, giữ liên lạc, có mặt khi ba mẹ cần. Bạn vẫn đang làm những điều đó mà."],
      [VN(/\b(ba|bố|cha|mẹ|má)( mình| anh| em| tui| a| e)? (\S+ )?(nóng tính|hay la|khó tính|cứng đầu|bảo thủ|hay quát)\b/), "Với người nóng tính, nói lúc ông đang bực thường chỉ làm căng thêm. Thử chọn lúc ba vui vẻ, nói ngắn và bình tĩnh, bắt đầu bằng điều ba quan tâm — và nếu ba bắt đầu to tiếng, xin dừng: “Con nói tiếp lúc khác nha ba” thay vì cãi lại."],
      [VN(/\b(mẹ|má|ba|bố)( \S+){0,2} (hay khóc|khóc|buồn)\b/), "Thấy mẹ khóc chắc bạn nhói lòng lắm, nhất là khi mình là lý do 😔 Nước mắt của mẹ thường là nỗi lo và nhớ con, chứ không hẳn là trách bạn. Một cuộc gọi riêng với mẹ, kể cho mẹ nghe cuộc sống của bạn đang ổn thế nào, nhiều khi giúp mẹ yên lòng hơn bất cứ lời giải thích nào."],
      [VN(/\b(to tiếng|lớn tiếng|cãi nhau|cãi qua cãi lại|la hét|nói chuyện không được)\b/), "Lần nào nói chuyện cũng thành to tiếng thì cả hai bên đều mệt và tổn thương 😔 Khi cảm xúc lên cao, chẳng ai còn nghe được ai. Thử đổi cách: nói lúc mọi người vui vẻ, ngắn gọn, và nếu thấy bắt đầu căng thì xin dừng — “Con nói tiếp lúc khác nha” — thay vì cố nói cho xong. Có người còn viết thư hoặc nhắn tin dài cho ba mẹ, vì viết ra thì nói được trọn ý mà không bị cắt ngang."],
      [VN(/\b(nói sao|nói thế nào|làm sao)( \S+){0,4} (hiểu|đồng ý|chấp nhận)\b/), "Thử nói theo thứ tự này nha:\n1. Ghi nhận nỗi lo của ba mẹ: “Con biết ba mẹ muốn con về vì thương, lo cho con.”\n2. Nói mong muốn của mình bằng câu “con”: “Con muốn ở lại Đà Lạt thêm vài năm vì công việc ở đây giúp con học được nhiều.”\n3. Đưa kế hoạch cụ thể: thu nhập, khi nào về thăm, khi ba mẹ cần thì con làm gì.\n4. Mời ba mẹ góp ý: “Ba mẹ còn lo điều gì nữa không?”\n\nKhông cần thuyết phục xong trong một lần — để ba mẹ có thời gian nghĩ.", true],
    ],
  },
  {
    id: "overwork",
    re: VN(/\b(làm (việc )?(\d+|mười mấy|mười hai) (tiếng|giờ) (mỗi|một|1) ngày|tăng ca (liên tục|mỗi ngày|hoài|suốt)|cuối tuần cũng (phải )?(làm|đi làm)|làm (cả|luôn cả) cuối tuần|(như|giống) (cái|một cái|con) (máy|robot|rô bốt)|kiệt sức vì (việc|công việc)|burnout|cháy sạch|làm không có ngày nghỉ)\b/),
    feel: ["Làm việc tới mức thấy mình như cái máy thì không phải bạn yếu — mà là cơ thể và đầu óc đang quá tải thật 😮‍💨"],
    insight: ["Làm quá sức kéo dài dễ dẫn tới kiệt sức: mệt không hồi lại dù đã nghỉ, thấy xa cách với công việc, và chẳng còn thấy vui. Đó là tín hiệu cần được nghe, không phải để gồng tiếp."],
    step: ["Tuần này giữ lại cho mình ít nhất một buổi hoàn toàn không làm việc — tắt thông báo công việc, làm một việc nhỏ cho riêng mình."],
    ask: ["Tình trạng làm nhiều như vậy kéo dài bao lâu rồi?"],
    advice: [
      "Ghi lại một tuần: làm bao nhiêu giờ, việc gì — có số liệu thì dễ nói chuyện với sếp về khối lượng.",
      "Nói với sếp theo hướng giữ chất lượng: xin thứ tự ưu tiên, lùi hạn hoặc chia bớt việc.",
      "Giữ giấc ngủ và một ngày nghỉ thật sự mỗi tuần — đó là điều kiện để làm lâu dài, không phải xa xỉ.",
      "Nếu chỗ làm không thay đổi được, vừa làm vừa tìm chỗ mới — không cần nghỉ ngay mới tìm.",
    ],
    hint: [
      [VN(/\b(không còn|chẳng còn|không|hết) (thấy )?(vui|hứng thú|thích)( \S+){0,4}\b/), "Không còn thấy vui với những thứ từng thích là một dấu hiệu quan trọng đó 💚 Có thể là kiệt sức vì làm quá nhiều, cũng có thể là tâm trạng đang xuống thật sự. Nếu cảm giác này kéo dài từ hai tuần trở lên, gần như ngày nào cũng vậy, kèm mất ngủ, mệt, hay thấy mình vô giá trị — nên gặp chuyên gia tâm lý hoặc bác sĩ để được đánh giá, không phải gồng một mình. (Muốn thì gõ “sàng lọc” để làm 4 câu sàng lọc nhanh.)"],
      [VN(/\b(nghỉ việc|nghỉ làm|bỏ việc)( \S+){0,3} (không có tiền|thì lấy gì|hết tiền|không đủ sống)|không (thể|dám) nghỉ\b/), "Đúng là không phải ai cũng nghỉ ngay được — tiền bạc là chuyện thật 😔 Nhưng giữa “gồng tiếp y như cũ” và “nghỉ luôn” còn nhiều lựa chọn ở giữa:\n• Nói với sếp để giảm bớt khối lượng hoặc giờ làm\n• Giữ một ngày nghỉ thật sự mỗi tuần, ngủ đủ — để không kiệt sức thêm\n• Vừa làm vừa tìm chỗ mới, chuẩn bị khoản dự phòng vài tháng rồi mới chuyển\n\nTrong mấy cách đó, cách nào bạn thấy làm được trước?", true],
    ],
  },
];

/** Ý riêng bổ sung cho chủ đề có sẵn — [mẫu, lời đáp, trọn ý?]. */
export const V7_HINTS: Record<string, [RegExp, string, boolean?][]> = {
  grief: [
    [VN(/\b(nguôi ngoai|bớt buồn|bớt đau|vượt qua|bao giờ (mới )?(hết|đỡ) (buồn|đau|nhớ))\b/), "Nỗi buồn mất người thân không có “hạn chót” — nó thường dịu đi dần theo thời gian, có ngày nhẹ có ngày nặng, chứ không biến mất một lần. Vài điều giúp nhiều người:\n• Cho phép mình buồn, khóc, nhớ — không cần gồng “phải ổn”\n• Giữ nếp ăn ngủ, ra ngoài một chút mỗi ngày\n• Nói về người đã mất với người thân — kể chuyện, xem ảnh, làm một việc người ấy từng thích\n• Ở cạnh người nhà nhiều hơn; mọi người cùng buồn thì cùng đỡ nhau\n\nNếu sau vài tháng nỗi buồn vẫn nặng như ngày đầu, hay ảnh hưởng nhiều tới ăn ngủ, công việc, gặp chuyên gia tâm lý sẽ giúp bạn nhiều đó 💚", true],
    [VN(/\b(hối hận|ân hận|tiếc|giá như|lẽ ra)( \S+){0,6}\b|\bkhông (về|đến|kịp)( \S+){0,3} (thăm|gặp|ở bên)\b/), "Cảm giác “giá như mình về thăm nhiều hơn” là một phần rất thường gặp của nỗi đau mất người thân — gần như ai cũng có 💚 Nó đến từ tình thương, chứ không chứng minh bạn là người con tệ. Lúc đó bạn không biết trước được những gì bây giờ mới biết.\n\nNếu được, thử viết cho người đã mất một lá thư, nói những điều bạn muốn nói. Và thương, chăm những người thân còn ở bên bây giờ cũng là một cách tiếp nối tình thương ấy."],
    [VN(/\b(mẹ)( \S+){0,2} (ở )?một mình\b|\bsợ (mẹ)( \S+){0,2} (buồn|cô đơn|ở một mình)\b/), "Lo cho người ở lại lúc này là rất thương họ 💚 Những tháng đầu sau mất mát thường là khó nhất với người phải ở một mình. Gọi điện cho mẹ đều đặn (dù chỉ vài phút), về thăm khi được, rủ mẹ cùng làm một việc nhỏ, và để ý nếu mẹ ăn uống, ngủ kém kéo dài thì đưa mẹ đi khám. Cùng nhau nói về người đã mất cũng giúp cả hai nhẹ lòng hơn."],
    [VN(/\b(ba|bố)( \S+){0,2} (ở )?một mình\b|\bsợ (ba|bố)( \S+){0,2} (buồn|cô đơn|ở một mình)\b/), "Lo cho người ở lại lúc này là rất thương họ 💚 Những tháng đầu sau mất mát thường là khó nhất với người phải ở một mình. Gọi điện cho ba đều đặn (dù chỉ vài phút), về thăm khi được, rủ ba cùng làm một việc nhỏ, và để ý nếu ba ăn uống, ngủ kém kéo dài thì đưa ba đi khám. Cùng nhau nói về người đã mất cũng giúp cả hai nhẹ lòng hơn."],
    [VN(/\b(bà)( \S+){0,2} (ở )?một mình\b|\bsợ (bà)( \S+){0,2} (buồn|cô đơn|ở một mình)\b/), "Lo cho người ở lại lúc này là rất thương họ 💚 Những tháng đầu sau mất mát thường là khó nhất với người phải ở một mình. Gọi điện cho bà đều đặn (dù chỉ vài phút), về thăm khi được, rủ bà cùng làm một việc nhỏ, và để ý nếu bà ăn uống, ngủ kém kéo dài thì đưa bà đi khám. Cùng nhau nói về người đã mất cũng giúp cả hai nhẹ lòng hơn."],
    [VN(/\b(ông)( \S+){0,2} (ở )?một mình\b|\bsợ (ông)( \S+){0,2} (buồn|cô đơn|ở một mình)\b/), "Lo cho người ở lại lúc này là rất thương họ 💚 Những tháng đầu sau mất mát thường là khó nhất với người phải ở một mình. Gọi điện cho ông đều đặn (dù chỉ vài phút), về thăm khi được, rủ ông cùng làm một việc nhỏ, và để ý nếu ông ăn uống, ngủ kém kéo dài thì đưa ông đi khám. Cùng nhau nói về người đã mất cũng giúp cả hai nhẹ lòng hơn."],
    [VN(/\b(mơ thấy|nằm mơ)\b/), "Mơ thấy người thân đã mất là chuyện rất nhiều người gặp trong thời gian đầu — có khi buồn, có khi lại thấy được an ủi. Đó là cách lòng mình tiếp tục nhớ thương. Khi tỉnh dậy thấy nặng lòng, thử viết lại giấc mơ hoặc kể cho người thân nghe."],
  ],
  breakup: [
    [VN(/\b(bao giờ|bao lâu|khi nào)( thì)?( mới)? (hết|đỡ|bớt|quên)( đau| buồn| nhớ)?\b/), "Không ai nói trước được con số chính xác, nhưng với nhiều người, nỗi đau dịu dần sau vài tuần tới vài tháng — có ngày tưởng đã ổn rồi lại buồn, chuyện đó bình thường. Nó sẽ nhanh hơn nếu bạn **bớt “cào lại vết thương”**: tạm ẩn / bỏ theo dõi trang của cô ấy, cất đồ kỷ niệm, giữ nếp ăn ngủ và gặp bạn bè.\n\nNếu sau vài tháng vẫn đau như ngày đầu, mất ngủ, chán ăn kéo dài, nói chuyện với chuyên gia tâm lý sẽ giúp bạn đi qua nhanh hơn 💚", true],
    [VN(/\b(vào|xem|lướt|stalk|theo dõi)( \S+){0,2} (facebook|fb|instagram|insta|trang|story|tiktok)\b/), "Cứ vào xem trang của người cũ là phản ứng rất thường gặp — nhưng mỗi lần xem là một lần tự rạch lại vết thương 😔 Thử **tạm ẩn hoặc bỏ theo dõi** (không cần chặn), để điện thoại xa lúc tối muộn, và khi thấy muốn vào xem thì nhắn cho một người bạn thay vì vậy."],
  ],
  study: [
    [VN(/\b(học (mà )?không vào|cầm sách là (lo|sợ|buồn ngủ)|học không tập trung|đọc mà không nhớ)\b/), "Càng gần ngày thi càng lo, mà càng lo thì càng khó học vào — vòng lặp này rất nhiều bạn gặp 😔\n• Chia nhỏ: học 25 phút, nghỉ 5 phút (kiểu Pomodoro), mỗi buổi chỉ đặt 1–2 mục tiêu nhỏ\n• Tự làm đề, tự kiểm tra hiệu quả hơn đọc đi đọc lại\n• Ngủ đủ — ngủ là lúc não cất kiến thức vào trí nhớ\n• Lo dâng lên thì thở chậm vài nhịp (gõ “bài tập thở” nếu muốn Lomi hướng dẫn)\n\nMôn nào làm bạn lo nhất?", true],
    [VN(/\b(sợ|lo)( \S+){0,3} (rớt|trượt|thi không đậu|thi không đỗ)|(ba mẹ|bố mẹ|gia đình)( \S+){0,2} thất vọng\b/), "Sợ thi rớt làm ba mẹ thất vọng là áp lực nặng lắm 😔 Nhưng giá trị của bạn không nằm trong một kỳ thi — và ba mẹ thương bạn nhiều hơn điểm số. Nếu được, thử nói với ba mẹ rằng bạn đang lo; nhiều khi ba mẹ nghe xong lại là người giúp bạn bớt áp lực nhất. Còn bây giờ, mình tập trung vào việc làm được từng ngày thôi nha."],
  ],
  lonely: [
    [VN(/\b(chỗ nào|ở đâu|nơi nào)( \S+){0,3} (gặp gỡ|làm quen|kết bạn|quen bạn|quen người mới)\b/), "Ở Đà Lạt có vài cách dễ quen người mới nè:\n• Trong app: **Quẹt** (/quet) để tìm người đi cà phê, chơi game, làm quen; **Cộng đồng** (/cong-dong) để vào nhóm chat theo khu vực, chủ đề\n• Tham gia lớp học ngắn (vẽ, nấu ăn, tiếng Anh), câu lạc bộ chạy bộ, leo núi, nhóm tình nguyện\n• Đi đều đặn một quán cà phê quen — gặp lại vài lần là dễ bắt chuyện\n\nBạn thích kiểu gặp gỡ nào hơn — đi chơi ngoài trời, hay ngồi cà phê nói chuyện?", true],
    [VN(/\b(ngại|sợ)( \S+){0,2} (làm quen|bắt chuyện|người ta thấy|bị đánh giá|bị chê)|sợ (người ta|mọi người) (thấy|nghĩ) (mình )?(kỳ|kì|lạ|dở)\b/), "Ngại làm quen, sợ người ta thấy mình kỳ là cảm giác rất nhiều người có — thật ra người kia thường cũng đang lo y như vậy 😅 Bắt đầu nhỏ thôi: một câu hỏi đơn giản (“bạn hay tới quán này hả?”), hoặc gặp nhau trong một hoạt động chung để có sẵn chuyện để nói. Nếu nỗi sợ này nặng tới mức bạn tránh hầu hết mọi cuộc gặp, chuyên gia tâm lý có thể giúp bạn tập dần."],
  ],
  angerself: [
    [VN(/\b(hối hận|ân hận|áy náy|tội lỗi)\b/), "Hối hận sau khi nổi nóng cho thấy bạn biết điều đó làm tổn thương người mình thương — đó là điểm bắt đầu rất tốt để thay đổi 💚 Khi đã bình tĩnh, xin lỗi cụ thể về điều mình đã làm (“lúc nãy anh to tiếng / mất bình tĩnh với em, anh xin lỗi”), rồi cùng nhau thống nhất: lần sau ai thấy nóng lên thì xin tạm dừng 15 phút."],
    [VN(/\bkhông muốn (làm )?(vợ|chồng|con|người nhà|gia đình|mọi người)( \S+){0,2} (sợ|tổn thương|buồn)\b/), "Bạn không muốn vợ con sợ mình — điều đó rất đáng quý, và cũng là lý do mạnh nhất để thay đổi 💚 Một bước quan trọng: hẹn với vợ một “tín hiệu tạm dừng” — ai thấy căng thì nói câu đó, rồi tách ra 15–30 phút cho dịu lại, sau đó mới nói tiếp. Nếu cơn giận từng làm đồ vỡ, ai đó bị đau hay thấy sợ, nên gặp chuyên gia tâm lý để có công cụ kiểm soát tốt hơn."],
    [VN(/\b(có bị (bệnh )?gì|bị (bệnh )?gì không|có phải (bị )?(bệnh|rối loạn)|có bình thường không)\b/), "Lomi không chẩn đoán được đâu — nhưng nổi nóng mạnh tới mức đập đồ vì một câu nói, rồi hối hận, là dấu hiệu cơn giận đang **khó kiểm soát** và đáng được chăm sóc nghiêm túc. Nhiều khi nó liên quan tới căng thẳng kéo dài, thiếu ngủ, rượu bia, hoặc những chuyện cũ chưa nguôi. Gặp chuyên gia tâm lý sẽ giúp bạn hiểu nguyên nhân và học cách kiềm chế — chuyện này tập được, không phải tính cách cố định."],
  ],
  addict: [
    [VN(/\b(quên buồn|giải sầu|cho đỡ buồn|trốn|né)\b/), "Chơi game để quên buồn thì dễ hiểu lắm — game làm đầu óc tạm khỏi phải nghĩ 😔 Nhưng nỗi buồn vẫn còn đó khi tắt máy, lại thêm mệt vì thức khuya. Có chuyện gì đang làm bạn buồn không? Gỡ được chuyện đó thì bỏ game cũng dễ hơn nhiều."],
    [VN(/\b(bắt đầu từ đâu|làm sao (để )?bỏ|cách bỏ|bỏ thế nào|bỏ như nào)\b/), "Bắt đầu nhỏ và cụ thể thì dễ giữ hơn nha:\n1. **Đặt giờ dừng cố định**, vd 11 giờ tối — hẹn báo thức, tới giờ là thoát\n2. **Gỡ game khỏi điện thoại**, chỉ chơi trên máy tính ở phòng khách — thêm chút bất tiện là bớt chơi hẳn\n3. Có sẵn **việc thay thế** cho khung giờ hay chơi (tắm, đọc, đi bộ, nói chuyện với vợ)\n4. **Nói với vợ** kế hoạch này và nhờ vợ nhắc — vợ thấy bạn cố gắng cũng bớt giận\n5. Ghi lại mỗi tối mình dừng lúc mấy giờ; trượt một hôm thì làm lại hôm sau, không bỏ cả kế hoạch\n\nNếu thử vài tuần mà vẫn không kiểm soát được, hoặc game ảnh hưởng nặng tới công việc, gia đình, gặp chuyên gia tâm lý sẽ giúp bạn nhiều.", true],
    [VN(/\b(vợ|chồng|người yêu|ny)( \S+){0,2} (giận|buồn|cằn nhằn|không vui)\b/), "Vợ giận vì game thường không phải vì game, mà vì thấy thiếu bạn — thiếu thời gian, thiếu sự có mặt 😔 Thay vì hứa chung chung, thử nói cụ thể: “Anh sẽ dừng game trước 11 giờ, và tối thứ bảy là của hai vợ chồng.” Rồi giữ đúng vài tuần — hành động sẽ thuyết phục hơn lời hứa."],
  ],
};

/** Ý riêng chỉ dùng khi người dùng XIN LỜI KHUYÊN. */
export const V7_ADVICE_HINTS: Record<string, [RegExp, string][]> = {
  compare: [[VN(/\b(bớt|thôi|ngừng|không|đỡ) so sánh\b/), "Vài cách giúp bớt so sánh mà nhiều người thấy hiệu quả:\n• **Bớt nguồn kích hoạt**: tạm ẩn những trang làm mình thấy tệ, giới hạn thời gian lướt mạng xã hội — mình đang so “hậu trường” của mình với “sân khấu” của người khác\n• **So với chính mình năm ngoái** thay vì với người khác: mình đã học được gì, vượt qua được gì\n• Viết ra **điều mình thật sự muốn** (không phải điều người ta có) — rồi đặt một bước nhỏ cho nó\n• Mỗi tối ghi 3 điều mình làm được hoặc biết ơn trong ngày\n• Khi gia đình hỏi: một câu trả lời sẵn, nhẹ nhàng — “Con đang làm từng bước, có gì vui con kể ba mẹ nghe liền”"]],
  selfworth: [[VN(/\b(bớt|thôi|ngừng|không|đỡ) so sánh\b/), "Vài cách giúp bớt so sánh mà nhiều người thấy hiệu quả:\n• **Bớt nguồn kích hoạt**: tạm ẩn những trang làm mình thấy tệ, giới hạn thời gian lướt mạng xã hội\n• **So với chính mình năm ngoái** thay vì với người khác\n• Viết ra **điều mình thật sự muốn**, rồi đặt một bước nhỏ cho nó\n• Mỗi tối ghi 3 điều mình làm được hoặc biết ơn trong ngày\n\nMuốn thử cùng Lomi soi lại một suy nghĩ khắt khe về bản thân thì gõ “soi lại suy nghĩ” nha."]],
};
