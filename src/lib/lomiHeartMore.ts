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
    re: VN(/\b(trống rỗng|thấy trống rỗng|trầm cảm|bị trầm cảm|mất hứng thú|làm gì cũng (thấy )?chán|chán hết mọi thứ|chán mọi thứ|cái gì cũng chán|không thấy vui gì|không còn hứng thú|không muốn làm gì|không thiết gì|sống không mục đích|vô nghĩa quá|cuộc sống vô nghĩa|tê liệt cảm xúc|không cảm thấy gì|buồn kéo dài|buồn lâu rồi|không thiết sống)\b/),
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
    re: VN(/\b(nghiện game|nghiện điện thoại|nghiện mạng xã hội|nghiện tiktok|nghiện facebook|lướt điện thoại|nghiện rượu|nghiện bia|nghiện thuốc|nghiện cờ bạc|cờ bạc|cá độ|chơi lô đề|nghiện mua sắm|không bỏ được)\b/),
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
    re: VN(/\b(nhịn ăn để giảm|nhịn đói để giảm|bỏ bữa để giảm cân|ăn xong nôn|móc họng|sợ tăng cân quá|sợ ăn|ăn không kiểm soát|ăn vô độ|ăn quá nhiều rồi hối hận|chán ăn|biếng ăn|ăn uống rối loạn|rối loạn ăn uống|anorexia|bulimia)\b/),
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
    re: VN(/\b(bị bắt nạt|bắt nạt mình|bị chế giễu|bị cười nhạo|bị trêu chọc|bị trêu|bị chửi trên mạng|bị bóc phốt|bị xúc phạm trên mạng|bị bắt nạt online|bị nhóm bạn tẩy chay|bị cô lập ở lớp|bị đánh ở trường)\b/),
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
    re: VN(/\b(hối hận|hối tiếc|tiếc nuối|giá như|làm sai rồi|sai lầm lớn|không thể tha thứ cho mình|tự trách|dằn vặt|cảm thấy có lỗi)\b/),
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
    re: VN(/\b(so sánh với người khác|(hay |cứ |luôn )?so sánh (mình|bản thân|em|tôi|tui|anh|chị) với|ai cũng hơn mình|ai cũng giỏi hơn|giỏi hơn mình|bạn bè thành công|bạn bè đều có|thua bạn bằng|fomo|lướt mạng thấy buồn|nhìn người ta thấy tủi|thấy mình chậm chân|bằng tuổi người ta)\b/),
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
    re: VN(/\b(đồng tính|les|lgbt|song tính|chuyển giới|come out|comeout|công khai xu hướng|xu hướng tính dục|giới tính thật|không được chấp nhận giới tính)\b/),
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
    re: VN(/\b(đau lưng|mỏi lưng|đau cổ gáy|mỏi cổ gáy|cứng cổ|đau vai gáy|mỏi vai gáy|đau cổ vai gáy|thoát vị|đau khớp|ngồi lâu đau|đau cột sống)\b/),
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
