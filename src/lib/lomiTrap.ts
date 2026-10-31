// ────────────────────────────────────────────────────────────────────────
// "TỪ KHOÁ BẪY" (31/10, danh sách ChatGPT lần 6): câu có chữ của sức khoẻ / thuốc / tarot nhưng thật ra hỏi chuyện app
//   ("thuốc nào trị lỗi không tải được ảnh", "bài đăng bị sốt lượt xem", "tin nhắn bị nhiễm bệnh à", "quán tên 'Mất Ngủ'"),
//   cùng vài câu hỏi app hay bị hiểu lạc (OTP, mấy tuổi được tạo tài khoản, bài đăng có cần duyệt không…).
//   Mọi điều nói về app ở đây đã đối chiếu với code app (31/10): đăng nhập bằng tên đăng nhập + mật khẩu (không có OTP / SMS),
//   phải đủ 18 tuổi (trang Đăng ký + Điều khoản), bài Cộng đồng / tường hồ sơ không qua duyệt, tài khoản + doanh nghiệp duyệt tay.
// ────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

export type Trap = { text: string; faqId?: string; retry?: string; heart?: string };

const APP_OBJ = VN(/\b(lỗi|app|ứng dụng|tài khoản|acc|bài đăng|bài viết|bài quẹt|quẹt|đăng nhập|otp|tin nhắn|ảnh|lượt xem|lượt thích|ưu đãi|mã giảm giá|hồ sơ|thông báo)\b/);
const MED_WORD = VN(/\b(thuốc|thuốc giải|chữa|trị|bệnh|nhiễm bệnh|virus|vi rút|sốt|đau đầu)\b/);
const APP_PROBLEM = VN(/\b(lỗi|bị lỗi|không tải|không vào|không gửi|không hiện|bị ẩn|bị mất|mất rồi|virus|nhiễm|đơ|treo|văng)\b/);

export function trapReply(q: string): Trap | null {
  const low = q.normalize("NFC").toLowerCase().replace(/[?!.…]+$/u, "").trim();
  const n = ` ${normalizeVi(low)} `;
  const w = low.split(/\s+/).length;
  if (w > 22) return null;

  // Câu hỏi "bao nhiêu lần" về ăn uống có nguồn NHS (31/10, danh sách ChatGPT lần 6)
  if (/\b(an ca|ca)( \S+){0,3} (may lan|bao nhieu lan|may bua|bao nhieu bua)\b|\b(may lan|bao nhieu lan|may bua)( \S+){0,3} (an )?ca\b/.test(n) && !/\b(ca phe|ca nhan|ca lam|ca toi|ca sang)\b/.test(n))
    return { text: "🐟 NHS khuyên mỗi tuần ăn **ít nhất 2 phần cá**, trong đó **1 phần là cá béo** (cá hồi, cá thu, cá mòi, cá trích…).\n• Bà bầu, người đang cho con bú và trẻ em: cá béo **tối đa 2 phần/tuần**, tránh cá kiếm, cá mập, cá cờ (nhiều thuỷ ngân)\n• Ưu tiên hấp, nướng, luộc hơn chiên" };
  if (/\b(rau|rau qua|trai cay|hoa qua)( \S+){0,3} (may bua|may lan|bao nhieu|may phan|bao nhieu phan)\b|\b(may bua|may phan|bao nhieu phan)( \S+){0,3} (rau|trai cay)\b/.test(n))
    return { text: "🥦 NHS khuyên mỗi ngày ăn **ít nhất 5 phần rau và trái cây** (đủ loại; tươi, đông lạnh hay nấu đều tính) — rải ra các bữa là dễ đủ nhất, ví dụ bữa nào cũng có một đĩa rau, thêm trái cây giữa buổi.\n• Một phần người lớn khoảng **80 g** (cỡ một trái chuối, một trái táo, 3 muỗng canh rau nấu)\n• Nước ép trái cây chỉ tính tối đa 1 phần/ngày" };
  // Mật ong cho trẻ — dưới 1 tuổi không dùng (nguồn: thẻ thuốc / mẹo dân gian đã ghi)
  if (/\bmat ong\b/.test(n) && /\b(tre|be|con|em be|so sinh)\b/.test(n) && /\b(may tuoi|bao nhieu tuoi|may thang|bao nhieu thang|duoc an|an duoc|uong duoc|duoc chua)\b/.test(n))
    return { text: "🍯 **Không cho trẻ dưới 1 tuổi ăn / uống mật ong** nha — kể cả một chút để pha nước hay chấm núm vú. Từ **đủ 1 tuổi** trở lên thì dùng được.\nLý do: mật ong có thể chứa bào tử vi khuẩn gây **ngộ độc botulinum ở trẻ nhỏ**, rất nguy hiểm với bé dưới 1 tuổi." };
  // Mã OTP / SMS xác minh — app không dùng
  if (VN(/\b(otp|mã xác nhận|mã xác thực|mã xác minh|sms xác (minh|nhận))\b/).test(n))
    return {
      text: "iLomi **không gửi mã OTP / SMS** đâu nha 📵 Đăng nhập bằng **tên đăng nhập + mật khẩu**. Quên mật khẩu thì ở màn đăng nhập bấm **Quên mật khẩu**, nhập đúng email và số điện thoại đã đăng ký là được.\n\nTài khoản mới thì chờ Ban quản trị duyệt tay — không cần mã gì cả.",
      faqId: "forgot",
    };
  // Mấy tuổi được tạo tài khoản
  if (VN(/\b(bao nhiêu|mấy|bn) tuổi\b/).test(n) && VN(/\b(tạo|đăng ký|lập|mở|dùng|xài|chơi)( \S+){0,2} (tài khoản|acc|app|ilomi|lomi)\b|\b(tài khoản|acc|app|ilomi)\b/).test(n) && !VN(/\b(lomi (bao nhiêu|mấy) tuổi|em (bao nhiêu|mấy) tuổi|bạn (bao nhiêu|mấy) tuổi)\b/).test(n))
    return { text: "Phải **đủ 18 tuổi** trở lên mới đăng ký và dùng iLomi được nha 🙂 Lúc đăng ký app hỏi ngày sinh để xác nhận (ngày sinh không hiện công khai), rồi tài khoản chờ Ban quản trị duyệt.", faqId: "register" };
  // Bài đăng có cần duyệt không
  if (VN(/\b(đăng bài|bài đăng|bài viết)\b/).test(n) && VN(/\b(duyệt|kiểm duyệt)\b/).test(n) && !VN(/\b(doanh nghiệp|ưu đãi|hồ sơ doanh nghiệp)\b/).test(n))
    return { text: "Bài đăng ở **Cộng đồng** và trên **tường hồ sơ** hiện **ngay**, không cần chờ duyệt nha 📝 Thứ được Ban quản trị duyệt tay là **tài khoản mới** và **hồ sơ doanh nghiệp**.\n\nĐăng rồi mà không thấy bài thì kéo trang xuống để tải lại, hoặc tắt hẳn app rồi mở lại.", faqId: "wall" };
  // Không muốn người lạ nhắn tin
  if (VN(/\b(người lạ|người không quen)\b/).test(n) && VN(/\b(nhắn|tin nhắn|inbox)\b/).test(n))
    return { text: "App **chưa có** chỗ cài “chặn mọi người lạ nhắn tin” nha 🙏 Cách làm được ngay:\n• Ai nhắn làm phiền → trong khung chat hoặc hồ sơ người đó bấm **⋯ → Chặn người dùng** (họ không nhắn, gọi hay xem hồ sơ bạn được nữa)\n• Quấy rối → bấm **Báo cáo** để Ban quản trị xử lý; theo dõi ở /bao-cao-cua-toi", faqId: "block" };
  // Chủ quán không trả lời tin nhắn
  if (VN(/\bchủ quán\b/).test(n) && VN(/\b(không trả lời|chưa trả lời|không rep|ko rep|không phản hồi|không seen|không xem)\b/).test(n))
    return { text: "Chủ quán chưa trả lời thì bạn thử vầy nha:\n• Mở **trang doanh nghiệp** đó (từ Khám phá) — nếu quán có ghi **số điện thoại** thì bấm vào số để gọi luôn\n• Ghé thẳng địa chỉ trên trang quán\n• Đợi thêm chút — chủ quán có khi bận giờ đông khách\n\nQuán sai thông tin hay có chuyện không ổn thì bấm **Báo cáo** trên trang doanh nghiệp nha." };
  // Chỉ muốn xem quán / ưu đãi, không đăng bài
  if (VN(/\b(chỉ muốn xem|chỉ xem|chỉ cần xem)\b/).test(n) && VN(/\b(quán|ưu đãi|chỗ)\b/).test(n))
    return { text: "Được chứ 😊 Không cần đăng bài gì cả — vào **Khám phá** (/kham-pha) xem quán, **Ưu đãi** (/uu-dai) xem ưu đãi, thích thì bấm Theo dõi quán để có ưu đãi mới là biết liền.", faqId: "offerlist" };
  // Quẹt không thấy ai
  if (VN(/\bquẹt\b/).test(n) && VN(/\b(không (thấy|hiện|có) ai|ko (thay|hien|co) ai|hết người|không còn ai|trống trơn|không có người)\b/).test(n))
    return { text: "Quẹt chỉ hiện những người **đang có nhu cầu cùng mục** (Game, Làm quen, Trao đổi, Công việc) và hợp **bộ lọc** của bạn — nên lúc ít người thì có thể trống, không phải app hỏng đâu nha 🙂\n• Mở rộng bộ lọc: khu vực, độ tuổi\n• Thử mục khác, hoặc quay lại sau — người mới tạo nhu cầu sẽ hiện thêm\n• Người bạn đã bỏ qua sẽ hiện lại sau 48 giờ\n\nVẫn trống hoàn toàn lâu ngày thì tắt hẳn app rồi mở lại; còn không được thì nhắn Ban quản trị.", faqId: "quetwhat" };
  // Không đăng nhập được / đăng nhập bị lỗi
  if (VN(/\b(đăng nhập|login)\b/).test(n) && VN(/\b(lỗi|không được|không vào|ko vào|không đăng nhập được|sai)\b/).test(n) && !VN(/\b(quên mật khẩu|mấy lần|bao nhiêu lần)\b/).test(n))
    return { text: "Không đăng nhập được thì bạn kiểm tra lần lượt nha:\n1. Gõ đúng **tên đăng nhập** (tên bạn đặt lúc đăng ký) và mật khẩu — để ý chữ hoa / thường, dấu cách thừa\n2. Quên mật khẩu → bấm **Quên mật khẩu**, nhập đúng email + số điện thoại đã đăng ký để xem lại tên đăng nhập và gợi ý mật khẩu\n3. Tắt hẳn app rồi mở lại, kiểm tra mạng\n4. Vẫn không được thì nhắn Ban quản trị (trang đầu có Email / Hotline / Facebook)", faqId: "forgot" };
  // Ưu đãi quảng cáo "chữa bệnh"
  if (VN(/\b(chữa bệnh|trị bệnh|chữa khỏi|trị khỏi)\b/).test(n) && VN(/\b(ưu đãi|quảng cáo|bài đăng|đăng)\b/).test(n))
    return { text: "Lomi khuyên **không nên** ghi ưu đãi / quảng cáo là món ăn, đồ uống “chữa bệnh” nha 🙏 Nói vậy dễ thành thông tin sai, khách tin rồi bỏ đi khám — và nội dung sai sự thật có thể bị người dùng báo cáo, Ban quản trị xem xét gỡ.\nCứ giới thiệu thật: nguyên liệu, cách làm, hương vị, giá và điều kiện ưu đãi là đủ hấp dẫn rồi." };
  // "Chữa cháy" khi quán hết ưu đãi
  if (VN(/\bchữa cháy\b/).test(n) && VN(/\b(ưu đãi|quán|khách)\b/).test(n))
    return { text: "Ưu đãi vừa hết mà muốn “chữa cháy” nhanh thì thử nha 🔥\n• Vào **Hồ sơ → ⋯ → Hồ sơ doanh nghiệp → Ưu đãi / Deal**: gia hạn ưu đãi cũ hoặc **Thêm ưu đãi mới** (ngắn ngày, dễ nhận), rồi bấm **Gửi thông báo** cho người theo dõi\n• Đăng một bài có ảnh món thật trong Cộng đồng khu vực mình\n• Ghi rõ thời gian áp dụng để khách khỏi hụt hẫng lần sau", faqId: "bizoffer" };
  // Tarot (tính năng) bị lỗi
  if (VN(/\b(tarot|lá bài|bói bài)\b/).test(n) && VN(/\b(lỗi|không hiện|không chạy|bị đơ|không rút được)\b/).test(n))
    return { text: "Phần bói tarot của Lomi chạy ngay trong app (không phụ thuộc quán nào) nha 🔮 Nếu lá bài không hiện hay bị đơ: kéo trang xuống tải lại, hoặc tắt hẳn app rồi mở lại. Vẫn bị thì nhắn Ban quản trị, kể rõ máy đang dùng và lỗi hiện ra sao." };
  // "Ngoài tarot, Lomi còn tâm sự được không", "tarot hay tâm sự hợp hơn khi buồn"
  if (VN(/\b(tâm sự|trò chuyện|chia sẻ|nói chuyện|chuyện tình cảm|hỏi lomi)\b/).test(n) && VN(/\b(ngoài tarot|không tin tarot|tarot hay|hay tâm sự|ko tin tarot|chứ không phải tarot)\b/).test(n) && !VN(/\b(rút|bói|xem bài|trải bài)\b/).test(n))
    return { text: "Được chứ 💚 Lomi nghe bạn tâm sự bất cứ lúc nào, không cần bói bài. Tarot chỉ là một cách để ngẫm cho vui; còn lúc buồn, kể Lomi nghe chuyện đang xảy ra là đủ — Lomi lắng nghe, cùng bạn gỡ từng chút, và nhắc khi nào nên tìm thêm người hỗ trợ.\n\nBạn đang có chuyện gì muốn kể không?", heart: "sad" };
  // Lá bài / mã giảm giá "có độc không"
  if (VN(/\b(lá bài|lá tarot|bài tarot|lá này)\b/).test(n) && VN(/\b(độc|ám|xui|có hại|nguy hiểm|tà)\b/).test(n))
    return { text: "Không đâu nha 😄 Lá bài chỉ là hình vẽ trên màn hình thôi, không “độc” hay “ám” gì cả. Còn nếu ý bạn là lá nghe đáng sợ, thì trong tarot **không có lá tốt hay xấu tuyệt đối** — mỗi lá chỉ gợi một góc nhìn để mình ngẫm, xem cho vui và tham khảo thôi." };
  if (VN(/\b(mã giảm giá|mã ưu đãi|voucher|link)\b/).test(n) && VN(/\b(độc|mã độc|virus|lừa đảo)\b/).test(n))
    return { text: "Mã ưu đãi trong iLomi chỉ là **dãy ký tự để quán xác nhận** bạn đã nhận ưu đãi — không phải file hay đường link, nên không chứa mã độc gì đâu nha 🙂 Cẩn thận với **link lạ** ai đó gửi qua tin nhắn (nhất là đòi đăng nhập, chuyển tiền) — gặp thì đừng bấm, báo cáo người gửi cho Ban quản trị.", faqId: "claim" };
  // Quán có TÊN giống chữ sức khoẻ ("quán tên 'Mất Ngủ'", "quán bún tên Bệnh Viện")
  const named = low.match(/\b(?:quán|tiệm)\s*(?:[\p{L}]+\s+){0,2}(?:có\s+)?(?:tên|tên là|tên gọi)\s*['"“”‘’]?([\p{L}\d ]{2,25}?)['"“”‘’]?(?=\s+(?:ở|mở|có|nằm|đâu|giờ|vậy|v|không|ko)\b|$)/u)
    ?? low.match(/\b(?:quán|tiệm)\s+(?:[\p{L}]+\s+){0,2}['"“”‘’]([^'"“”‘’]{2,25})['"“”‘’]/u);
  if (named) {
    const nm = named[1].trim().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
    const hours = VN(/\b(mấy giờ|giờ mở|mở cửa|đóng cửa)\b/).test(n);
    const offer = VN(/\b(ưu đãi|giảm giá|khuyến mãi)\b/).test(n);
    return { text: `Lomi chưa tìm quán **theo tên** được 🙏 Bạn gõ “${nm}” vào ô tìm kiếm ở **Khám phá** (/kham-pha) là ra nếu quán có trong iLomi${hours ? " — trên thẻ quán có nhãn **Đang mở / Đã đóng**, bấm vào để xem giờ mở cửa" : ""}${offer ? " — quán đang có ưu đãi sẽ hiện ngay trên trang quán" : ""}. Nếu không thấy thì có thể quán chưa tham gia app.` };
  }
  // Lượt xem "bị sốt"
  if (VN(/\bsốt\b/).test(n) && VN(/\b(lượt xem|lượt thích|bài đăng|view|like)\b/).test(n))
    return { text: "Bài “sốt” lượt xem là tin vui nha 🔥😄 Bài đang được nhiều người xem — tranh thủ trả lời bình luận, ghim thông tin quan trọng (giờ mở cửa, ưu đãi) cho người mới ghé. Nếu ý bạn là lượt xem **tăng / giảm bất thường** mà nghi lỗi, thì kéo trang xuống tải lại; vẫn lạ thì nhắn Ban quản trị (Hồ sơ → ⋯ → Trợ giúp)." };
  // Chữ thuốc / chữa / bệnh dùng cho lỗi app → bỏ chữ ẩn dụ, hỏi lại phần app
  if (MED_WORD.test(n) && APP_OBJ.test(n) && APP_PROBLEM.test(n) && !VN(/\b(đau (bụng|ngực|lưng|răng|họng)|uống thuốc|bị sốt|đang sốt|bác sĩ|bệnh viện|phòng khám|đặt thuốc|giao thuốc|mua thuốc)\b/).test(n)) {
    const rest = low
      .replace(/^(?:tôi|tui|mình|em|anh|chị)\s+/u, "")
      .replace(/\b(?:đau đầu với (?:cái )?app(?: này)?(?: quá)?|lomi có thuốc giải cho|có thuốc giải cho|thuốc (?:nào|gì) (?:trị|chữa)|có bệnh gì khiến|muốn tìm thuốc cho|cần chữa|muốn chữa|hỏi bệnh của|bị nhiễm bệnh|nhiễm bệnh|bị virus|như virus)\b[,:]?\s*/gu, " ")
      .replace(/\b(?:chữa|trị)\b/gu, "sửa")
      .replace(/\s+/g, " ")
      .trim();
    return {
      text: "Lomi hiểu là bạn đang hỏi chuyện **app bị trục trặc** chứ không phải chuyện sức khoẻ nha 😄 Thử nhanh mấy bước này:\n1. Vuốt tắt hẳn app rồi mở lại\n2. Kiểm tra mạng — đổi qua lại wifi ↔ 4G\n3. Kéo trang xuống để tải lại\n4. Vẫn bị thì nhắn Ban quản trị (Hồ sơ → ⋯ → Trợ giúp & Liên hệ), kể rõ đang làm gì và lỗi hiện chữ gì",
      retry: rest && rest !== low && rest.split(" ").length >= 3 ? rest : undefined,
    };
  }
  return null;
}
