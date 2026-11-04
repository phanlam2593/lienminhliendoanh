// ────────────────────────────────────────────────────────────────────────
// "TỪ KHOÁ BẪY" (31/10, danh sách ChatGPT lần 6): câu có chữ của sức khoẻ / thuốc / tarot nhưng thật ra hỏi chuyện app
//   ("thuốc nào trị lỗi không tải được ảnh", "bài đăng bị sốt lượt xem", "tin nhắn bị nhiễm bệnh à", "quán tên 'Mất Ngủ'"),
//   cùng vài câu hỏi app hay bị hiểu lạc (OTP, mấy tuổi được tạo tài khoản, bài đăng có cần duyệt không…).
//   Mọi điều nói về app ở đây đã đối chiếu với code app (31/10): đăng nhập bằng tên đăng nhập + mật khẩu (không có OTP / SMS),
//   phải đủ 18 tuổi (trang Đăng ký + Điều khoản), bài Cộng đồng / tường hồ sơ không qua duyệt, tài khoản + doanh nghiệp duyệt tay.
// ────────────────────────────────────────────────────────────────────────
import { faqById, normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";
/** \b của JS không hiểu chữ có dấu ("tài xế" không có ranh giới sau "ế") — đổi \b thành ranh giới theo chữ cái Unicode. */
const W = (re: RegExp): RegExp => new RegExp(re.source.replace(/\\b/g, "(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))"), re.flags.includes("u") ? re.flags : re.flags + "u");
import { healthFact } from "@/lib/lomiHealthFacts";
import { deviceSubject, namedShop } from "@/lib/lomiQShape";
import { findMedTopicId } from "@/lib/lomiMed";

export type Trap = { text: string; faqId?: string; retry?: string; heart?: string };

const APP_OBJ = VN(/\b(lỗi|app|ứng dụng|tài khoản|acc|bài đăng|bài viết|bài quẹt|quẹt|đăng nhập|otp|tin nhắn|ảnh|lượt xem|lượt thích|ưu đãi|mã giảm giá|hồ sơ|thông báo)\b/);
const MED_WORD = VN(/\b(thuốc|thuốc giải|chữa|trị|bệnh|nhiễm bệnh|virus|vi rút|sốt|đau đầu|cảm|cúm|ốm)\b/);
const MED_WORD_ANY = VN(/\b(đau|sốt|bệnh|ốm|mất ngủ|cảm|ho|viêm|ung thư|thuốc|nhức|gout|tiểu đường|huyết áp|dạ dày|bác sĩ|bệnh viện|bầu|bà bầu|mang thai|cúm|tim|gan|khoẻ|khỏe|béo|mập)\b/);
const APP_PROBLEM = VN(/\b(lỗi|bị lỗi|không tải|không vào|không gửi|không hiện|bị ẩn|bị mất|mất rồi|virus|nhiễm|đơ|treo|văng)\b/);

export function trapReply(q: string): Trap | null {
  const low = q.normalize("NFC").toLowerCase().replace(/[?!.…]+$/u, "").trim();
  const n = ` ${normalizeVi(low)} `;
  const w = low.split(/\s+/).length;
  if (w > 22) return null;
  // 04/11 (Kir: hoàn thiện kiêng cữ) — kiêng khi ĐẾN THÁNG: nguồn kinh nguyệt / đau bụng kinh Lomi có không bảo kiêng gội đầu, tắm, đồ chua, đồ lạnh
  if (VN(/\b(đến tháng|tới tháng|hành kinh|đang có kinh|kinh nguyệt|ngày đèn đỏ|đang hành kinh)\b/).test(n) && VN(/\b(gội|gội đầu|tắm|ăn chua|đồ chua|nước đá|đồ lạnh|uống lạnh|ăn kem|kiêng|ăn cay|đồ cay|tập thể dục|chạy bộ|đi bơi|bơi)\b/).test(n) && !VN(/\b(đau dữ dội|ra máu nhiều|chảy máu nhiều|ngất|xỉu)\b/).test(n))
    return { text: "🩸 Lomi **chưa thấy nguồn y khoa nào** bảo đến tháng phải kiêng gội đầu, tắm, ăn chua, đồ lạnh hay vận động — đây là những lời dặn dân gian, nên Lomi không dám nói là đúng.\nNếu làm gì mà thấy đau bụng hay khó chịu hơn thì cứ bớt lại theo cảm nhận của mình nha.\n\nĐau bụng kinh thì hỏi Lomi “đau bụng kinh nên làm gì” — Lomi có cách giảm đau theo nguồn. Đau dữ dội, ra máu rất nhiều hay choáng ngất thì đi khám sớm." };
  // 04/11: "đến tháng mấy ngày là bình thường", "chu kỳ bao nhiêu ngày" → số liệu của thẻ kinh nguyệt không đều (NHS, Mayo Clinic)
  if (VN(/\b(đến tháng|tới tháng|hành kinh|có kinh|kinh nguyệt|chu kỳ kinh|chu kì kinh|vòng kinh|ra kinh)\b/).test(n) && VN(/\b(mấy ngày|bao nhiêu ngày|bao lâu|kéo dài|bình thường|chu kỳ|chu kì|cách nhau)\b/).test(n) && !VN(/\b(trễ|chậm|mất kinh|rong kinh|ra nhiều|đau dữ dội|có thai|mang thai|que thử)\b/).test(n))
    return { text: `${(() => { const m = n.match(/\b(\d{1,2}) ngay\b/); const d = m ? Number(m[1]) : 0; return d >= 10 && /\b(chu ky|chu ki|vong kinh|cach nhau)\b/.test(n) ? (d < 21 || d > 35 ? `👉 Chu kỳ **${d} ngày** nằm **ngoài** mốc 21–35 ngày nên được xem là **kinh không đều** — nếu cứ vậy nhiều tháng thì nên đi khám.\n\n` : `👉 Chu kỳ **${d} ngày** nằm **trong** khoảng thường gặp nha.\n\n`) : ""; })()}📅 **Chu kỳ kinh nguyệt** — mốc tham khảo theo nguồn y khoa:\n• Chu kỳ (từ ngày đầu kỳ này tới ngày đầu kỳ sau) trung bình **khoảng 28 ngày**, thường gặp trong khoảng **24–38 ngày**\n• Số ngày hành kinh: thường **không quá khoảng 8 ngày**\n• Được xem là **không đều** khi hai kỳ cách nhau **dưới 21 ngày hoặc trên 35 ngày**, hoặc khác hẳn nhịp quen thuộc của bạn\n• Tuổi dậy thì và lúc gần mãn kinh hay không đều hơn\n\nKinh ra quá nhiều, kéo dài, đau dữ dội hay thất thường nhiều tháng thì nên đi khám nha.` };
  // "nóng trong người / nóng gan uống gì" — cách gọi dân gian, không phải tên bệnh → hỏi lại đúng triệu chứng, không đi gợi ý quán nước
  if (VN(/\b(nóng trong|nóng trong người|nóng gan|bị nóng|người nóng|nhiệt trong người|nóng ruột gan)\b/).test(n) && VN(/\b(uống gì|ăn gì|làm sao|nên|bị gì|là sao|là gì|giải nhiệt|mát gan)\b/).test(n) && !VN(/\b(sốt|nhiệt độ|độ c|bỏng|phỏng)\b/).test(n))
    return { text: "🌡️ “Nóng trong người”, “nóng gan” là **cách gọi dân gian**, không phải tên một bệnh trong y khoa — nên Lomi không có món “giải nhiệt / mát gan” nào có nguồn để chỉ bạn 🙏\nNgười ta hay nói vậy khi bị **nhiệt miệng, nổi mụn, táo bón, khô họng, tiểu vàng** hay **mệt mỏi, khó ngủ**. Bạn đang bị cụ thể chuyện nào? Nói Lomi nghe để Lomi chỉ đúng cách chăm theo nguồn y khoa nha.\n💧 Trong lúc đó, uống đủ nước (đủ để nước tiểu vàng nhạt, trong) luôn là việc nên làm." };

  // Câu hỏi "bao nhiêu lần" về ăn uống có nguồn NHS (31/10, danh sách ChatGPT lần 6)
  if (/\b(an ca|ca)( \S+){0,3} (may lan|bao nhieu lan|may bua|bao nhieu bua)\b|\b(may lan|bao nhieu lan|may bua)( \S+){0,3} (an )?ca\b/.test(n) && !/\b(ca phe|ca nhan|ca lam|ca toi|ca sang)\b/.test(n))
    return { text: "🐟 NHS khuyên mỗi tuần ăn **ít nhất 2 phần cá**, trong đó **1 phần là cá béo** (cá hồi, cá thu, cá mòi, cá trích…).\n• Bà bầu, người đang cho con bú và trẻ em: cá béo **tối đa 2 phần/tuần**, tránh cá kiếm, cá mập, cá cờ (nhiều thuỷ ngân)\n• Ưu tiên hấp, nướng, luộc hơn chiên" };
  if (/\b(rau|rau qua|trai cay|hoa qua)( \S+){0,3} (may bua|may lan|bao nhieu|may phan|bao nhieu phan)\b|\b(may bua|may phan|bao nhieu phan|bao nhieu)( \S+){0,2} (rau|trai cay)\b/.test(n) && !/\b(tien|gia|dong|k|nghin|ngan)\b/.test(n))
    return { text: "🥦 NHS khuyên mỗi ngày ăn **ít nhất 5 phần rau và trái cây** (đủ loại; tươi, đông lạnh hay nấu đều tính) — rải ra các bữa là dễ đủ nhất, ví dụ bữa nào cũng có một đĩa rau, thêm trái cây giữa buổi.\n• Một phần người lớn khoảng **80 g** (cỡ một trái chuối, một trái táo, 3 muỗng canh rau nấu)\n• Nước ép trái cây chỉ tính tối đa 1 phần/ngày" };
  // Mật ong cho trẻ — dưới 1 tuổi không dùng (nguồn: thẻ thuốc / mẹo dân gian đã ghi)
  if (/\bmat ong\b/.test(n) && /\b(tre|be|con|em be|so sinh)\b/.test(n) && /\b(may tuoi|bao nhieu tuoi|may thang|bao nhieu thang|duoc an|an duoc|uong duoc|duoc chua)\b/.test(n))
    return { text: "🍯 **Không cho trẻ dưới 1 tuổi ăn / uống mật ong** nha — kể cả một chút để pha nước hay chấm núm vú. Từ **đủ 1 tuổi** trở lên thì dùng được.\nLý do: mật ong có thể chứa bào tử vi khuẩn gây **ngộ độc botulinum ở trẻ nhỏ**, rất nguy hiểm với bé dưới 1 tuổi." };
  // 01/11 (vòng 13): BỊ LỪA / có người GIẢ DANH xin tiền — an toàn tài khoản, không phải hỏi phí hay mẹo kinh doanh
  //   (chỉ chuyện TRONG APP — tin nhắn, chủ quán, tài khoản; chuyển khoản ngân hàng / mua đồ gian bên ngoài đã có lớp riêng)
  if (VN(/\b(bị lừa|lừa đảo|lừa tiền|giả làm|giả danh|mạo danh|giả mạo|xin tiền|đòi chuyển tiền|bắt chuyển tiền)\b/).test(n) && VN(/\b(app|ứng dụng|ilomi|lomi|tin nhắn|nhắn tin|nhắn|chủ quán|tài khoản|quẹt|trang quán|doanh nghiệp)\b/).test(n) && !VN(/\b(mẹ|ba|bố|bạn (tôi|tui|em|anh|chị)|vợ|chồng|ông|bà|con)\b/).test(n)) {
    const rp = faqById("report");
    return { text: `Gặp chuyện này thì bạn làm ngay nha 🛡️\n• **Đừng chuyển tiền** hay gửi mã, mật khẩu cho ai qua tin nhắn — iLomi không bao giờ nhắn đòi tiền hay đòi mật khẩu\n• Chặn người đó: trong khung chat bấm **⋯ → Chặn người dùng**\n• Báo cáo cho Ban quản trị: ${rp ? rp.a.vi : "bấm Báo cáo trên hồ sơ / trang doanh nghiệp"}\n• Nếu đã chuyển tiền: liên hệ ngân hàng ngay để được hỗ trợ, và báo công an nơi gần nhất`, faqId: "report" };
  }
  // 01/11: làm mất / quên mã ưu đãi → xem lại ở ưu đãi đã nhận
  if (VN(/\b(mất|quên|lỡ xoá|lỡ xóa|không thấy|không tìm thấy) (cái )?(mã|mã ưu đãi|ưu đãi|voucher|mã giảm giá)\b/).test(n)) {
    const ce = faqById("claimexp");
    if (ce) return { text: `Đừng lo nha 🎁 ${ce.a.vi}`, faqId: "claimexp" };
  }
  // 01/11: hỏi PHÍ ("nếu đăng ưu đãi thì có mất phí không") — loại câu hỏi là giá / phí, không phải "làm sao đăng"
  if (VN(/\b(mất phí|tốn phí|tính phí|thu phí|có phí|trả phí|mất tiền|tốn tiền|miễn phí không|free không|có free)\b/).test(n) && APP_OBJ.test(n) && /(không|ko|k|chưa|hả|bao nhiêu|sao)\s*$|\?/u.test(low + (q.includes("?") ? "?" : ""))) {
    const fr = faqById("free"), mb = faqById("membership");
    if (fr) return { text: `${fr.a.vi}${mb && VN(/\b(ưu đãi|doanh nghiệp|quán)\b/).test(n) ? `\n\nRiêng chuyện ưu đãi: ${mb.a.vi.charAt(0).toLowerCase()}${mb.a.vi.slice(1)}` : ""}`, faqId: "free" };
  }
  // 01/11 (vòng 19): câu hỏi thao tác ở các mảng khác của app — đúng loại câu hỏi (bao lâu / ai / được không)
  {
    const f = (id: string, lead = "") => { const x = faqById(id); return x ? { text: `${lead}${x.a.vi}`, faqId: id } : null; };
    if (VN(/\b(tài xế|xe|shipper) (\S+ ){0,2}?(bao lâu|mấy phút|khi nào|chừng nào|bao giờ) (mới |thì |sẽ )?(tới|đến|đón|giao)\b/).test(n) || VN(/\b(bao lâu|khi nào|chừng nào|mấy phút) (thì )?(tài xế|xe|shipper) (tới|đến|đón)|\bai (chở|giao|đón)( tôi| tui| mình)?\b|\btài xế là ai\b/).test(n)) { const r = f("ridetrack"); if (r) return r; }
    if (VN(/\b(cồng kềnh|hàng nặng|đồ to|bốc dỡ|bốc vác)\b/).test(n) && VN(/\b(gửi|giao|chở|ship)\b/).test(n)) { const r = f("ridprice", "Được nha, chỉ là có thể tính thêm phụ phí 📦 "); if (r) return r; }
    if (VN(/\bquẹt\b/).test(n) && VN(/\b(quẹt trái|bỏ qua|vuốt trái)\b/).test(n) && VN(/\b(thấy lại|hiện lại|gặp lại|quay lại)\b/).test(n))
      return { text: "Có nha 🙂 Người bạn đã **bỏ qua** (quẹt trái) sẽ **hiện lại sau 48 giờ**, nên chưa phải mất luôn đâu.", faqId: "quetwhat" };
    if (VN(/\bquẹt\b/).test(n) && VN(/\b(ai thấy|ai xem|ai đọc|người khác thấy)\b/).test(n))
      return { text: "Nhu cầu Quẹt của bạn hiện cho những người **đang dùng Quẹt cùng mục** (Game, Làm quen, Trao đổi, Công việc) và **hợp bộ lọc** khu vực, độ tuổi của họ nha 🙂 Muốn tạm không hiện thì vào Quẹt → thẻ mục đó → **Tạm dừng**.", faqId: "quetwhat" };
    if (VN(/\b(gửi ảnh|gửi hình|gửi gif|gửi sticker|ghi âm|tin nhắn thoại|sửa tin nhắn|xoá tin nhắn|xóa tin nhắn|thu hồi tin nhắn|thu hồi)\b/).test(n) && VN(/\b(được không|được ko|có được|thế nào|sao|ở đâu|cách)\b/).test(n)) {
      const r = f("msgfeatures", VN(/\bthu hồi\b/).test(n) ? "App có **xoá tin nhắn** (Lomi chưa chắc người kia đã xem trước đó hay chưa) — đây là những gì làm được trong khung chat nè:\n" : "");
      if (r) return r;
    }
  }
  // 01/11 (vòng 18): CÂU HỎI THAO TÁC CỦA CHỦ QUÁN — sửa thông tin, ưu đãi hiện ở đâu / ai thấy, PIN để làm gì / đổi ở đâu, khách nhận ưu đãi
  //   thì biết sao, xem / xoá đánh giá, duyệt bao lâu, mấy quán một tài khoản — đúng câu hỏi thường gặp, không phải mẹo quảng cáo
  {
    const owner = VN(/\b((quán|tiệm|shop|doanh nghiệp|cửa hàng|homestay|spa) (của )?(tôi|tui|mình|em|anh|chị)|tôi là chủ quán|mình là chủ quán|chủ quán|chủ doanh nghiệp|hồ sơ doanh nghiệp)\b/).test(n);
    const f = (id: string, lead = "") => { const x = faqById(id); return x ? { text: `${lead}${x.a.vi}`, faqId: id } : null; };
    if (VN(/\b(mã pin|pin)\b/).test(n) && VN(/\b(để làm gì|là gì|dùng để|có tác dụng gì|dùng làm gì)\b/).test(n)) { const r = f("pin"); if (r) return r; }
    if (VN(/\b(mã pin|pin)\b/).test(n) && VN(/\b(đổi|đặt|sửa|thay|ở đâu|chỗ nào)\b/).test(n) && !VN(/\b(sai|nhập)\b/).test(n)) { const r = f("bizpin"); if (r) return r; }
    if (VN(/\b(đăng|tạo|thêm) (được )?(mấy|bao nhiêu) ưu đãi\b/).test(n)) {
      const bo = faqById("bizoffer");
      return { text: `Lomi **chưa chắc** app giới hạn bao nhiêu ưu đãi cùng lúc nên không dám nói con số 🙏 Cách thêm ưu đãi: ${bo ? bo.a.vi : "Hồ sơ doanh nghiệp → Ưu đãi / Deal → Thêm ưu đãi mới"}`, faqId: "bizoffer" };
    }
    if (VN(/\b(khách|người ta)( \S+){0,2} nhận ưu đãi\b/).test(n) && VN(/\b(biết|xem|thấy|kiểm tra)\b/).test(n)) { const r = f("regulars", "Khách nhận ưu đãi bằng **mã PIN** quán đưa tại chỗ, nên lúc đưa mã là quán biết ngay nha 🙂 Ngoài ra:\n"); if (r) return r; }
    if (VN(/\b(xoá|xóa|gỡ|ẩn)( \S+){0,2} (đánh giá|review|bình luận)\b/).test(n)) {
      const rr = faqById("reviewreply"), rp = faqById("report");
      return { text: `Lomi **chưa thấy** chỗ để chủ quán tự xoá đánh giá của khách nha 🙏\n• Cách tốt nhất là trả lời nhẹ nhàng: ${rr ? rr.a.vi : "dưới mỗi đánh giá bấm Trả lời"}\n• Đánh giá sai sự thật, xúc phạm thì báo cáo cho Ban quản trị xem xét: ${rp ? rp.a.vi : "bấm Báo cáo trên đánh giá đó"}`, faqId: "reviewreply" };
    }
    if (owner && VN(/\b(theo dõi|follow)\b/).test(n) && VN(/\b(khách|người ta|mọi người)\b/).test(n)) { const r = f("follow", "Khách bấm **Theo dõi** trên trang quán của bạn là được nha — vậy nên mời khách bấm theo dõi khi họ ghé (ví dụ dán mã QR / nhắc lúc tính tiền).\n"); if (r) return r; }
    if (owner || VN(/\b(quán|doanh nghiệp)\b/).test(n)) {
      if (VN(/\b(giờ mở cửa|giờ đóng cửa|địa chỉ|tên quán|số điện thoại|mô tả|thông tin)\b/).test(n) && VN(/\b(đổi|sửa|thay|cập nhật|chuyển|ở đâu|thế nào|sao)\b/).test(n)) { const r = f("bizedit"); if (r) return r; }
      if (owner && VN(/\bưu đãi\b/).test(n) && VN(/\b(ai thấy|ai xem|hiện ở đâu|hiện chỗ nào|nằm ở đâu|khách thấy ở đâu|có hiện)\b/).test(n)) {
        const ol = faqById("offerlist"), bb = faqById("bizbroadcast");
        return { text: `Ưu đãi quán bạn đăng (đang bật) thì **mọi thành viên** đều thấy được nha 👀\n• Trên **trang quán** của bạn, và trong mục **Ưu đãi** chung: ${ol ? ol.a.vi : "Ưu đãi (/uu-dai)"}\n• Muốn người theo dõi quán biết ngay: ${bb ? bb.a.vi : "bấm Gửi thông báo ở từng ưu đãi"}`, faqId: "offerlist" };
      }
      if (owner && VN(/\b(xem|đọc|ai) (\S+ ){0,2}(đánh giá|review)\b/).test(n)) { const r = f("reviewreply", "Đánh giá của khách hiện ngay trên **trang doanh nghiệp** của bạn nha — mở trang quán là thấy hết.\n"); if (r) return r; }
      if (VN(/\b(duyệt bao lâu|bao lâu (thì |mới |được )?duyệt|duyệt mất bao lâu|bao giờ được duyệt|khi nào được duyệt)\b/).test(n)) {
        const st = faqById("bizstatus");
        return { text: `Hồ sơ doanh nghiệp được Ban quản trị **duyệt tay** — Lomi không biết chính xác mất bao lâu 🙏 Duyệt xong quán mới hiện công khai.\n• Bị yêu cầu bổ sung: ${st ? st.a.vi : "xem ghi chú trong Hồ sơ doanh nghiệp"}\n• Chờ lâu thì liên hệ Ban quản trị (Hồ sơ → ⋯ → Trợ giúp & Liên hệ)`, faqId: "bizstatus" };
      }
      if (VN(/\b(tạo|mở|đăng|có) (được )?(mấy|bao nhiêu|nhiều) (quán|doanh nghiệp|cửa hàng)\b/).test(n)) { const r = f("bizmulti"); if (r) return r; }
    }
  }
  // 01/11 (vòng 6): QUÁN CỦA MÌNH không hiện / bị ẩn / muốn hiện trên Khám phá — hỏi TRẠNG THÁI hồ sơ, không phải xin mẹo quảng cáo
  if (VN(/\b(quán|tiệm|shop|doanh nghiệp|cửa hàng|homestay|spa)( (của )?(tôi|tui|mình|em|anh|chị))?\b/).test(n) && VN(/\b(bị ẩn|không hiện|chưa hiện|không thấy hiện|không xuất hiện|bị khoá|bị khóa|bị từ chối|chưa được duyệt|chưa duyệt|hiện trên khám phá|lên khám phá|hiện lên app|hiện công khai)\b/).test(n)) {
    const st = faqById("bizstatus");
    return { text: `Hồ sơ doanh nghiệp chỉ **hiện công khai** (trên Khám phá) sau khi Ban quản trị **duyệt tay** nha 🏪\n• Chưa có hồ sơ: **Hồ sơ → ⋯ → Tạo hồ sơ doanh nghiệp** (/ho-so?view=business) rồi gửi duyệt\n• Đã gửi mà chưa hiện / bị yêu cầu bổ sung: ${st ? st.a.vi.charAt(0).toLowerCase() + st.a.vi.slice(1) : "xem ghi chú của Ban quản trị trong Hồ sơ doanh nghiệp"}\n\nCòn nếu ý bạn là làm sao để **nhiều khách biết tới** quán hơn thì nói Lomi, Lomi gợi ý cách thu hút khách nha.`, faqId: "bizstatus" };
  }
  // 01/11: "bị người khác chặn thì sao biết" — hỏi CÁCH BIẾT, không phải cách chặn (dựa đúng điều app làm khi chặn)
  if (VN(/\b(bị (ai đó |người khác |người ta |họ |nó )?chặn|bị block)\b/).test(n) && VN(/\b(sao biết|làm sao biết|biết được không|có biết không|thì sao biết|biết không|làm sao để biết)\b/).test(n))
    return { text: "App **không gửi thông báo** khi ai đó chặn bạn nha 🙂 Khi bị chặn thì bạn sẽ **không nhắn tin, không gọi và không xem được hồ sơ** của người đó nữa — nếu đột nhiên không làm được những việc này với một người thì có thể họ đã chặn.\nNếu thấy bị chặn hay bị làm phiền không đúng, bạn liên hệ Ban quản trị (Hồ sơ → ⋯ → Trợ giúp & Liên hệ).", faqId: "block" };
  // 01/11: ai thấy số điện thoại / không muốn người khác thấy — Lomi không chắc phạm vi hiển thị → nói thật + chỉ chỗ sửa / xoá
  if (VN(/\b(số điện thoại|sđt|sdt|email)( của (tôi|tui|mình|em))?\b/).test(n) && VN(/\b(ai thấy|ai xem|người khác thấy|người khác xem|công khai|ẩn|giấu|không muốn (ai|người khác) (thấy|biết|xem))\b/).test(n)) {
    const ed = faqById("avatar");
    return { text: `Lomi **chưa chắc** chính xác ai xem được ${VN(/\bemail\b/).test(n) ? "email" : "số điện thoại"} trên hồ sơ của bạn nên không dám nói bừa 🙏\n• Muốn sửa hoặc bỏ bớt thông tin: ${ed ? ed.a.vi : "Hồ sơ → ⋯ → Hồ sơ cá nhân"}\n• Muốn hỏi cho chắc về quyền riêng tư: liên hệ Ban quản trị (Hồ sơ → ⋯ → Trợ giúp & Liên hệ), hoặc xem Chính sách quyền riêng tư trong app.`, faqId: "avatar" };
  }
  // 01/11: "tôi bị app chặn", "app khoá tôi rồi" — tài khoản bị khoá, không phải cách chặn người khác
  if (VN(/\b(bị app (chặn|khoá|khóa|cấm)|app (chặn|khoá|khóa|cấm) (tôi|tui|mình|em)|bị (khoá|khóa|cấm) (app|tài khoản|acc))\b/).test(n))
    return { text: "Tài khoản bị khoá thì bạn thử vầy nha:\n• Nếu vừa **nhập sai mật khẩu nhiều lần** thì chờ vài phút rồi thử lại, hoặc bấm **Quên mật khẩu** (nhập đúng email + số điện thoại đã đăng ký)\n• Nếu app báo tài khoản bị khoá / tạm ngưng → liên hệ **Ban quản trị** (trang đầu có Email / Hotline / Facebook) để hỏi lý do và cách mở lại", faqId: "forgot" };
  // 01/11: hỏi thăm Lomi bằng chữ sức khoẻ ("lomi có bị bệnh không", "lomi có mệt không") — chuyện phiếm, không phải câu hỏi y khoa
  if (VN(/^ ?(lomi|bạn lomi|em lomi)( ơi)?( có| cũng)? (bị bệnh|bị ốm|ốm|bệnh|mệt|đau|sốt|bị cảm|bị cúm)( không| ko| k| hả| chưa| hông)? ?$/).test(n))
    return { text: "Hihi Lomi là trợ lý chạy trên máy nên không ốm, không mệt đâu 😄 Cảm ơn bạn đã hỏi thăm nha! Còn bạn dạo này khoẻ không?" };
  // 01/11: "sao tôi không nhắn tin được" — hỏi vì sao KHÔNG LÀM ĐƯỢC (lỗi), không phải hỏi cách nhắn
  // (01/11 vòng 24: "không NHẬN được thông báo" — bỏ dấu trùng "nhắn"; câu có dấu / đã đoán dấu mà là "nhận" thì không phải lỗi nhắn tin)
  if (!/(?<![\p{L}])nhận(?![\p{L}])/u.test(low) && VN(/\b(không|ko|k|chẳng|hổng) (nhắn tin|nhắn|gửi tin nhắn|gửi tin|gọi|gọi điện) (được|đc|dc)\b|\b(nhắn tin|gửi tin nhắn|gửi tin) (không|ko|chẳng) (được|đi|lên)\b/).test(n) && !VN(/\b(người yêu|chồng|vợ|ny|crush|anh ấy|cô ấy|bạn trai|bạn gái)\b/).test(n))
    return { text: "Không nhắn / gọi được thì bạn thử lần lượt nha 📩\n1. Kiểm tra mạng, kéo trang xuống tải lại hoặc tắt hẳn app rồi mở lại\n2. Nếu chỉ không nhắn được với **một người** — có thể người đó đã chặn bạn (khi bị chặn thì không nhắn, gọi hay xem hồ sơ của họ được), hoặc chính bạn đã chặn họ (xem ở Hồ sơ → ⋯ → Cài đặt → Người dùng đã chặn)\n3. Gọi thoại / video thì người kia cần đang online\n4. Vẫn không được thì nhắn Ban quản trị (Hồ sơ → ⋯ → Trợ giúp & Liên hệ), kể rõ lỗi hiện ra sao", faqId: "msgstart" };
  // 01/11: "voucher là gì", "ưu đãi?" — hỏi ĐỊNH NGHĨA tính năng ưu đãi → nói ngắn là gì + cách nhận (theo câu hỏi thường gặp có sẵn)
  if (VN(/^ ?(ưu đãi|voucher|khuyến mãi|mã giảm giá)( (là gì|là sao|là cái gì|nghĩa là gì|à|hả))? ?$/).test(n) || VN(/^ ?(ưu đãi|voucher) $/).test(`${n} `)) {
    const cl = faqById("claim");
    return { text: `**Ưu đãi** (voucher) là khuyến mãi các quán, doanh nghiệp trên iLomi đăng cho khách — giảm giá, tặng món… 🎁${cl ? `\n\nCách nhận:\n${cl.a.vi}` : ""}\n\nXem các ưu đãi đang có ở **Ưu đãi (/uu-dai)**.`, faqId: "claim" };
  }
  // 01/11 (vòng 10): "vậy gọi điện được không", "gọi cho quán sao" (câu ngắn) — hỏi cách gọi, không phải tư vấn kinh doanh
  if (w <= 8 && VN(/\b(gọi điện|gọi thoại|gọi video|gọi cho quán|gọi cho chủ quán|gọi quán|gọi được)\b/).test(n) && VN(/\b(được không|được ko|được k|sao|thế nào|ở đâu|bằng gì|có được)\b/).test(n) && !VN(/\b(115|cấp cứu|cứu thương|bác sĩ|bệnh viện)\b/).test(n)) {
    const cf = faqById("call");
    return { text: `Được nha 📞 Có hai cách:\n• Gọi **trong app**: ${cf ? cf.a.vi : "trong khung chat 1-1 bấm 📞 / 🎥 (người kia cần đang online)"}\n• Gọi **số điện thoại** của quán: mở trang quán, nếu quán có ghi số thì bấm vào số để gọi luôn`, faqId: "call" };
  }
  // 01/11 (vòng 14): "app có bị virus không", "app này có mã độc không" — hỏi AN TOÀN của app, không phải báo app đang lỗi
  if (VN(/\b(app|ứng dụng|ilomi)( này)?( có)? (bị virus|có virus|virus không|mã độc|có độc|chứa virus)\b/).test(n)) {
    const ins = faqById("install");
    return { text: `Lomi không kiểm tra được máy của bạn có virus hay không 🙏 — nhưng vài điều chắc chắn về iLomi nè:\n• iLomi ${ins ? "cài từ đúng trang chính thức (xem cách cài bên dưới), không cần tải file cài đặt lạ" : "mở từ đúng trang chính thức, không cần tải file cài đặt lạ"}\n• App không bao giờ nhắn đòi mật khẩu, mã hay chuyển tiền\n• Cẩn thận **link lạ** ai đó gửi qua tin nhắn — gặp thì đừng bấm, báo cáo người gửi\n${ins ? `\nCách cài đúng: ${ins.a.vi}` : ""}`, faqId: "install" };
  }
  // 01/11: "có nên nâng cấp / mua membership không" — quyết định mua gói → nói rõ gói gồm gì để người dùng tự cân nhắc
  if (VN(/\b(có nên|nên) (nâng cấp|mua|đăng ký|lên)( gói)? (membership|hội viên|thành viên)\b/).test(n)) {
    const mb = faqById("membership");
    if (mb) return { text: `Có nên hay không là tuỳ bạn có dùng tới mấy quyền lợi này không nha 🙂\n${mb.a.vi}`, faqId: "membership" };
  }
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
  // 01/11 (vòng 15): "sao quẹt hoài không ai thích", "không match được ai" — hỏi vì sao chưa ghép đôi (cần HAI BÊN cùng thích)
  if (VN(/\bquẹt\b/).test(n) && VN(/\b(không ai thích|chưa ai thích|không ai quẹt lại|không match|chưa match|không ghép|chưa ghép|không ai chọn|không ai ưng)\b/).test(n)) {
    const qw = faqById("quetwhat");
    return { text: `Quẹt chỉ ghép đôi khi **hai bên cùng thích nhau** nha 💞 nên lúc chưa ghép được không có nghĩa là có gì sai đâu.\n${qw ? qw.a.vi : ""}\n\nMẹo nhỏ: viết phần nhu cầu rõ ràng, có ảnh thật, và thử thêm vài mục khác.`, faqId: "quetwhat" };
  }
  // Quẹt không thấy ai
  if (VN(/\bquẹt\b/).test(n) && (/\b(khong|ko|k|hong|hem|chang|cha) (thay|hien|co) (ai|ho so nao|nguoi nao)\b/.test(n) || VN(/\b(hết người|không còn ai|trống trơn|không có người|không hiện hồ sơ)\b/).test(n)))
    return { text: "Quẹt chỉ hiện những người **đang có nhu cầu cùng mục** (Game, Làm quen, Trao đổi, Công việc) và hợp **bộ lọc** của bạn — nên lúc ít người thì có thể trống, không phải app hỏng đâu nha 🙂\n• Mở rộng bộ lọc: khu vực, độ tuổi\n• Thử mục khác, hoặc quay lại sau — người mới tạo nhu cầu sẽ hiện thêm\n• Người bạn đã bỏ qua sẽ hiện lại sau 48 giờ\n\nVẫn trống hoàn toàn lâu ngày thì tắt hẳn app rồi mở lại; còn không được thì nhắn Ban quản trị.", faqId: "quetwhat" };
  // "có nên uống thêm cà phê không" (đang hồi hộp / áp lực) → điều nguồn nói về caffeine, không tìm quán cà phê
  //   (01/11: câu nêu một BỆNH — "đau dạ dày có nên uống cà phê không" — thì lớp ăn uống theo bệnh trả lời, không đọc thông tin caffeine chung)
  if (!(findMedTopicId(q) && !VN(/\b(hồi hộp|lo|căng thẳng|áp lực|run|stress)\b/).test(n)) && (VN(/\b(có nên|nên) uống (thêm |nhiều )?(cà phê|cafe|cf)\b|\buống (thêm |nhiều) (cà phê|cafe|cf)( \S+){0,2} (có sao|được không)\b|\buống (cà phê|cafe|cf) nhiều( \S+){0,2} (có sao|được không)\b/).test(n)) && !VN(/\b(giải rượu|say|giải say|tỉnh rượu)\b/).test(n)) {
    const hf = healthFact("uống cà phê nhiều có sao không?");
    if (hf) return { text: `${VN(/\b(hồi hộp|lo|căng thẳng|áp lực|run)\b/).test(n) ? "Đang hồi hộp, căng thẳng thì nên **hạn chế** thêm cà phê nha — caffeine có thể làm tim đập nhanh, bồn chồn hơn. Thử nước lọc, trà thảo mộc không caffeine, hít thở chậm vài phút 💚\n\n" : ""}${hf}` };
  }
  // Xoá bài đăng
  if (VN(/\b(xoá|xóa|gỡ)( \S+){0,1} (bài đăng|bài viết|bài)\b/).test(n) && !VN(/\b(quẹt|ưu đãi)\b/).test(n))
    return { text: "Xoá bài của mình thì bấm **⋯** ngay trên bài → **Xoá** nha 🗑️ (sửa bài cũng ở đó). Bài trên tường thì mở **Hồ sơ** của bạn để tìm; bài trong **Cộng đồng** thì vào đúng phòng khu vực + chủ đề đã đăng.", faqId: "wall" };
  // Quẹt dùng sao / tìm người qua Quẹt
  if (VN(/\bquẹt\b/).test(n) && (VN(/\b(hoạt động|là gì|dùng sao|dùng thế nào|ra sao|như thế nào|dùng như nào|xài sao)\b/).test(n) || VN(/\b(tìm|kiếm)( \S+){0,2} (người|bạn)( \S+){0,3} (qua|trên|bằng) quẹt\b/).test(n))) {
    const f = faqById("quetwhat");
    if (f) return { text: f.a.vi, faqId: "quetwhat" };
  }
  // 01/11 (vòng 20): "tôi không tin tarot" — tôn trọng, không rút bài; "tarot với bói bài tây khác gì", "xem tử vi được không" — Lomi chỉ có tarot
  if (VN(/\b(không tin|chẳng tin|chả tin|ko tin|hổng tin)( \S+){0,2} (tarot|bói|bói bài|bài)\b/).test(n) && !VN(/\b(rút|bốc|xem giúp|bói giúp|bói cho)\b/).test(n))
    return { text: "Không tin cũng không sao đâu nha 😊 Tarot ở iLomi chỉ là một cách để mình **ngẫm lại chuyện của mình** cho vui — không phải lời tiên tri, cũng không quyết định thay ai cả. Lomi còn tâm sự, tìm quán, hỏi đáp sức khoẻ, hướng dẫn dùng app nữa — bạn cần gì cứ nói nha!" };
  if (VN(/\b(tử vi|xem tướng|thần số học|cung hoàng đạo|bói bài tây|xem chỉ tay|phong thuỷ|phong thủy)\b/).test(n) && !VN(/\b(rút|bốc)\b/).test(n))
    return { text: `Lomi chỉ có **bói bài Tarot** thôi nha 🔮 — chưa xem được ${VN(/\btử vi\b/).test(n) ? "tử vi" : VN(/\bthần số học\b/).test(n) ? "thần số học" : VN(/\bcung hoàng đạo\b/).test(n) ? "cung hoàng đạo" : VN(/\bbói bài tây\b/).test(n) ? "bài tây" : "kiểu này"}. Muốn thử tarot thì gõ kiểu “rút bài chuyện công việc” hoặc “bói tình cảm” nha (xem để tham khảo, không phải lời tiên tri).` };
  // Tarot là gì / có ý nghĩa gì (hỏi về tính năng, không xin rút)
  if (VN(/\b(tarot|bói bài)\b/).test(n) && VN(/\b(có ý nghĩa gì|là gì|dùng để làm gì|hoạt động sao|có đúng không|có tin được không|có thật không)\b/).test(n) && !VN(/\b(rút|bốc|xem giúp|bói giúp|bói cho|lá này|lá đó)\b/).test(n))
    return { text: "🔮 **Tarot** là bộ 78 lá bài, mỗi lá mang một hình ảnh và ý nghĩa (xuôi / ngược). Ở iLomi, Lomi rút bài để bạn có **một góc nhìn mà ngẫm lại chuyện của mình** — không phải lời tiên tri, không quyết định thay bạn, và không dùng cho chuyện sức khoẻ, tiền bạc lớn.\n\nMuốn thử thì gõ kiểu “rút bài chuyện công việc” hoặc “bói tình cảm” nha." };
  // 01/11 (vòng 11): "cô có quán bún bò muốn đăng lên app cho người ta biết" — đưa quán CỦA MÌNH lên app, không phải tìm quán bún bò
  if (VN(/\b(có|mở|làm chủ|đang bán) (một |cái |1 )?(quán|tiệm|shop|cửa hàng|homestay|spa|nhà hàng)\b/).test(n) && VN(/\b(đăng lên|đưa lên|đăng ký lên|cho lên|lên app|lên ilomi|lên đây|đăng quán|giới thiệu lên)\b/).test(n)) {
    const bc = faqById("bizcreate");
    if (bc) return { text: `Đưa quán của mình lên iLomi như vầy nha 🏪\n${bc.a.vi}`, faqId: "bizcreate" };
  }
  // Đăng ký hồ sơ chủ quán / doanh nghiệp
  if (VN(/\b(đăng ký|tạo|mở|làm|lập)( \S+){0,2} (hồ sơ|tài khoản|trang) (chủ quán|doanh nghiệp|quán|kinh doanh|cửa hàng)\b|\bđưa quán( \S+){0,2} lên app\b/).test(n) && !VN(/\b(ưu đãi)\b/).test(n))
    return { text: "Tạo hồ sơ doanh nghiệp (chủ quán) như vầy nha 👇\n1. **Hồ sơ → ⋯ → Tạo hồ sơ doanh nghiệp** (/ho-so?view=business)\n2. Điền tên, loại hình, giờ mở / đóng, mô tả, địa chỉ, số điện thoại, **mã PIN 4–8 ký tự** (để khách nhận ưu đãi tại quán); ảnh bìa và link mạng xã hội thì tuỳ chọn\n3. Ghim vị trí quán (hoặc bật “Chỉ bán hàng online”) → **Gửi để duyệt**\n\nBan quản trị duyệt tay xong thì quán mới hiện công khai và đăng ưu đãi được.", faqId: "bizcreate" };
  // Nhắn chủ quán có kỳ không / chủ quán nhắn lại chưa
  if (VN(/\bchủ quán\b/).test(n) && VN(/\b(có kỳ|kỳ không|ngại|sợ bị từ chối|có sao không)\b/).test(n) && VN(/\b(nhắn|hỏi)\b/).test(n))
    return { text: "Không kỳ đâu nha 😊 Hỏi giờ mở cửa, còn món, còn chỗ là chuyện chủ quán được hỏi mỗi ngày — họ còn mừng vì có khách quan tâm.\nBạn có thể gửi: “Chào quán ạ, cho mình hỏi hôm nay quán mở tới mấy giờ ạ? Cảm ơn quán nhiều 🙏”\n\nNhắn ở: mở **trang quán** → bấm **Nhắn tin** (hoặc gọi số điện thoại nếu quán có ghi).", faqId: "msgstart" };
  if (VN(/\bchủ quán\b/).test(n) && VN(/\b(nhắn lại chưa|trả lời chưa|rep chưa|nhắn lại|đã trả lời)\b/).test(n))
    return { text: "Lomi **không xem được tin nhắn** của bạn nha 🙏 Bạn mở **Tin nhắn (/tin-nhan)** để xem chủ quán đã trả lời chưa — cuộc trò chuyện có tin mới sẽ nổi lên đầu.\n• Bật thông báo (Hồ sơ → ⋯ → Cài đặt → Thông báo) để có tin là biết liền\n• Chờ lâu quá thì gọi số điện thoại trên trang quán (nếu có) hoặc ghé thẳng", faqId: "msgstart" };
  // Uống thuốc rồi buồn ngủ — có lái xe được không
  if (VN(/\bthuốc\b/).test(n) && VN(/\b(buồn ngủ|lơ mơ|chóng mặt|díp mắt)\b/).test(n) && VN(/\b(lái xe|chạy xe|đi xe|cầm lái|chạy xe máy|lái)\b/).test(n))
    return { text: "Đang buồn ngủ, lơ mơ, chóng mặt sau khi uống thuốc thì **đừng lái xe** hay chạy xe máy nha 🙏 — một giây díp mắt trên đường là nguy hiểm cho bạn và người khác.\n• Nhờ người chở, hoặc đặt xe ở **Đưa đón (/dua-don)**\n• Hỏi dược sĩ xem thuốc bạn đang dùng có loại **ít gây buồn ngủ** hơn không (đưa họ xem hộp thuốc)\n• Buồn ngủ kèm khó thở, sưng môi / mặt, nổi mẩn lan nhanh → gọi **115**" };
  // Tìm phòng khám / bệnh viện / nhà thuốc gần đây
  if (VN(/\b(tìm|kiếm|chỉ)( giúp| giùm| dùm)?( \S+){0,2} (phòng khám|bệnh viện|nhà thuốc|trạm y tế|bác sĩ|nha sĩ|nha khoa|phòng nha)( \S+){0,3} (gần|gần đây|quanh đây|ở đâu)\b|\b(phòng khám|bệnh viện|nhà thuốc|nha khoa|phòng nha)( \S+){0,2} (gần đây|gần nhất|quanh đây) (ở đâu|không|nào)\b/).test(n)) {
    const kid = VN(/\b(bé|con|cháu|trẻ)\b/).test(n);
    const fever = VN(/\bsốt\b/).test(n);
    return { text: `${VN(/\b(lo quá|lo lắm|sợ quá|hoảng)\b/).test(n) ? "Lomi hiểu bạn đang lo lắm 💚 " : ""}Trong iLomi **chưa có danh sách phòng khám / bệnh viện** đâu 🙏 Bạn mở **bản đồ trên điện thoại** gõ “${kid ? "phòng khám nhi" : "phòng khám"} gần đây” để xem chỗ gần và giờ mở cửa, rồi đặt xe đi ở **Đưa đón (/dua-don)**.${kid && fever ? "\n\n👶 Bé sốt mà **dưới 3 tháng tuổi**, hoặc li bì, bỏ bú / bỏ ăn, thở nhanh, co giật, nổi ban không mất khi ấn → đưa bé đi cấp cứu ngay / gọi **115**, đừng chờ tìm phòng khám." : "\n\n🚨 Khó thở, đau ngực, lơ mơ, chảy máu nhiều → gọi **115** ngay."}` };
  }
  // Tài khoản bị khoá
  if (VN(/\b(tài khoản|acc|account|nick|tk)\b/).test(n) && VN(/\b(bị khoá|bị khóa|bị chặn|bị đình chỉ|bị cấm|bị block|bị ban)\b/).test(n) && !VN(/\b(ưu đãi|voucher|mã pin|pin)\b/).test(n))
    return { text: "Tài khoản bị khoá thì bạn thử vầy nha:\n• Nếu vừa **nhập sai mật khẩu nhiều lần** thì chờ vài phút rồi thử lại, hoặc bấm **Quên mật khẩu** (nhập đúng email + số điện thoại đã đăng ký)\n• Nếu app báo tài khoản bị khoá / tạm ngưng → liên hệ **Ban quản trị** (trang đầu có Email / Hotline / Facebook) để hỏi lý do và cách mở lại\n\nĐừng lo quá nha — cứ hỏi Ban quản trị là sẽ rõ.", faqId: "forgot" };
  // "đi từ trung tâm tới hồ Tuyền Lâm" → đặt xe
  // 04/11: ý ở vế sau khi đính chính / kể: người khác nhắn làm phiền → chặn; hỏi giá chuyến xe → giá tham khảo; QUÊN tên đăng nhập → lấy lại.
  {
    const fq = (id: string) => { const x = faqById(id); return x ? { text: x.a.vi, faqId: id } : null; };
    if (VN(/\b(làm phiền|quấy rối|quấy rầy|spam)\b/).test(n) && VN(/\b(nhắn|gọi|inbox|tin nhắn)\b/).test(n)) { const r = fq("block"); if (r) return r; }
    if (VN(/\b(giá|bao nhiêu tiền|mấy tiền|hết bao nhiêu|tốn bao nhiêu|cước)\b/).test(n) && VN(/\b(đặt xe|đi xe|gọi xe|chuyến xe|xe ôm|cuốc xe)\b/).test(n)) { const r = fq("ridprice"); if (r) return r; }
    const tail = n.replace(/^.*\b(mà là|tôi hỏi|tui hỏi|ý là|ý tôi là)\b/, "");
    if (VN(/\b(quên|mất|không nhớ|hổng nhớ)\b/).test(tail) && VN(/\b(tên đăng nhập|username|tên tài khoản)\b/).test(tail)) { const r = fq("forgot"); if (r) return r; }
  }
  // 04/11: "tôi muốn đặt xe ra sân bay Liên Khương" — lời kể muốn đặt xe tới một chỗ (không phải hỏi giá / bao lâu) → chỉ cách đặt trong app,
  //   không đi tìm "quán" xe đưa đón sân bay.
  if ((VN(/\b(muốn |cần )?đi từ \S+( \S+){0,4} (tới|đến|qua|lên|xuống|ra) \S+/).test(n) || VN(/\b(muốn|cần|định|tính|phải) (đặt|gọi|book|kêu|bắt) (xe|grab|taxi)( \S+)? (ra|tới|đến|lên|về|đi|qua|xuống) \S+/).test(n)) && !VN(/\b(bao xa|mấy km|bao lâu|đường nào|giá|bao nhiêu tiền|mấy tiền)\b/).test(n))
    return { text: "Muốn đi thì đặt xe trong app nha 🛵 **Trang chủ → Đưa đón & Giao hàng (/dua-don) → Chở người** → chọn điểm đón và điểm đến (kéo ghim trên bản đồ hoặc gõ tên chỗ) → chọn loại xe → đặt.\nApp hiện giá tham khảo theo quãng đường; trả tiền mặt trực tiếp cho tài xế.", faqId: "ridebook" };
  // Không thấy nút ưu đãi
  if (/\b(khong|ko|k|khum|hong|hem) thay (nut|cho|muc)( \S+){0,2} uu dai\b/.test(n))
    return VN(/\b(tạo|đăng|thêm|quán của|chủ quán)\b/).test(n)
      ? { text: "Nút tạo ưu đãi nằm trong **hồ sơ doanh nghiệp** nha 👇\n1. **Hồ sơ** → bấm **⋯** góc trên → **Hồ sơ doanh nghiệp** (/ho-so?view=business)\n2. Kéo xuống mục **Ưu đãi / Deal** → **Thêm ưu đãi mới**\n\nChưa có hồ sơ doanh nghiệp, hoặc hồ sơ đang chờ Ban quản trị duyệt, thì sẽ chưa thấy mục này.", faqId: "bizoffer" }
      : { text: "Nút **Nhận ưu đãi** nằm trên **trang quán** nha 👇\n1. Mở quán từ **Khám phá (/kham-pha)** hoặc **Ưu đãi (/uu-dai)**\n2. Ở phần ưu đãi của quán → bấm **Nhận ưu đãi**, hỏi nhân viên mã PIN rồi nhập vào\n\nKhông thấy nút thì có thể quán đang tạm ẩn ưu đãi, tài khoản bạn chưa được duyệt, hoặc app chưa cập nhật — tắt hẳn app rồi mở lại thử.", faqId: "claim" };
  // Ưu đãi đã nhận / đã lưu ở đâu
  if (VN(/\bưu đãi (đã lưu|đã nhận|của tôi|của tui|của mình|đã lấy)\b/).test(n) && VN(/\b(không thấy|ở đâu|đâu rồi|chỗ nào|xem lại|tìm)\b/).test(n))
    return { text: "Ưu đãi bạn đã nhận xem lại ở **Trang chủ → ô Ưu đãi đã nhận** nha 🎁 Mã còn hạn thì bấm vào để hiện lại đúng mã cũ (mỗi mã có hiệu lực 2 giờ kể từ lúc nhận).\nMuốn theo dõi ưu đãi mới của một quán thì bấm **Theo dõi** trên trang quán đó.", faqId: "claimexp" };
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
  if (VN(/\b(mã giảm giá|mã ưu đãi|ưu đãi|voucher|link)\b/).test(n) && VN(/\b(độc|mã độc|virus|lừa đảo)\b/).test(n))
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
  // 01/11: tên quán viết HOA ngay sau "quán / tiệm" ("quán Đau Đầu ở đâu") — tên riêng, không phải bệnh
  const shop = namedShop(q);
  if (shop && MED_WORD_ANY.test(` ${normalizeVi(shop)} `) && !VN(/\b(bị|đang|uống|chữa|trị|thuốc)\b/).test(` ${normalizeVi(low.replace(shop.toLowerCase(), " "))} `)) {
    const hours = VN(/\b(mấy giờ|giờ mở|mở cửa|đóng cửa)\b/).test(n);
    return { text: `“${shop}” nghe như **tên quán** nha 😄 Lomi chưa tìm quán **theo tên** được 🙏 Bạn gõ “${shop}” vào ô tìm kiếm ở **Khám phá** (/kham-pha) là ra nếu quán có trong iLomi${hours ? " — trên thẻ quán có nhãn **Đang mở / Đã đóng**" : ""}. Không thấy thì có thể quán chưa tham gia app.` };
  }
  // 01/11: chủ ngữ là MÁY / điện thoại / pin mà dùng chữ sức khoẻ ("điện thoại bị sốt pin", "máy nóng quá") — không phải người bệnh
  const dev = deviceSubject(low);
  if (dev && (!/^(app|ung dung)$/.test(dev) || VN(/\b(nóng máy|hao pin|tốn pin|nóng quá)\b/).test(n)) && VN(/\b(sốt|nóng|bệnh|virus|nhiễm|đau|chữa|trị|thuốc|yếu|mệt|chết|hỏng|nóng máy|nóng ran)\b/).test(n) && !VN(/\b(đau (đầu|mắt|cổ|vai|lưng|tay)|mỏi mắt|bức xạ|sóng điện thoại|mất ngủ|cận thị)\b/).test(n))
    return { text: `Lomi hiểu là bạn đang nói về **${low.match(/^(?:(?:tôi|tui|mình|em|anh|chị)\s+)?(?:(?:cái|con|chiếc)\s+)?(\S+(?:\s+(?:thoại|tính|lạnh|máy|sạc))?)/u)?.[1] ?? "máy"}** chứ không phải chuyện sức khoẻ nha 😄 Lomi chưa rành sửa máy, nhưng thử mấy bước an toàn này:\n• Nếu đang mở iLomi thì vuốt tắt hẳn app rồi mở lại, tắt bớt app chạy nền\n• Máy nóng ran, pin phồng hay có mùi khét → **ngưng sạc**, để máy nguội và mang ra tiệm / hãng kiểm tra\n\nCòn nếu ý bạn là **người** đang bị sốt, mệt thì kể Lomi nghe nha.` };
  // 01/11: "chữa cháy", "bếp bén lửa", "cháy nhà" — chuyện cháy nổ, không phải chữa bệnh (quán "chữa cháy" ưu đãi đã xử lý ở trên)
  if (VN(/\b(chữa cháy|bình chữa cháy|cháy nhà|cháy bếp|bén lửa|bắt lửa|cháy nổ|đám cháy)\b/).test(n) && !VN(/\b(bỏng|phỏng|ngạt khói|hít khói)\b/).test(n))
    return { text: `Đây là chuyện **cháy nổ** chứ không phải chữa bệnh nha 🧯 Lomi chưa có hướng dẫn chữa cháy đã kiểm chứng để chỉ chi tiết.\n• **Đang cháy thật** → gọi **114** (cứu hoả) ngay, đưa mọi người ra chỗ an toàn trước, đừng quay vào lấy đồ\n• Có người bị bỏng hay ngạt khói → gọi **115**\n${VN(/\b(mua|ở đâu|chỗ nào)\b/).test(n) ? "• Mua bình chữa cháy thì hỏi cửa hàng thiết bị phòng cháy, hoặc cơ quan PCCC địa phương để được chỉ loại phù hợp" : "• Muốn học cách dùng bình chữa cháy, thoát hiểm thì hỏi cơ quan PCCC địa phương — họ hay có buổi hướng dẫn"}` };
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

// ────────────────────────────────────────────────────────────────────────
// NHỜ LOMI LÀM THAY (31/10, danh sách ChatGPT lần 7): đặt bàn, gọi điện, chuyển tiền, nhắn tin, đặt thuốc, hẹn bác sĩ,
//   xem camera, gọi tài xế, đặt món, gửi lời mời Quẹt, báo cáo, đăng bài, đặt xe, mua hàng.
//   Lomi chỉ trả lời trong khung chat — không thao tác thay. Nói thật + chỉ đúng chỗ trong app để người dùng tự làm.
//   (Gọi cấp cứu đã có lớp riêng, chạy trước.)
// ────────────────────────────────────────────────────────────────────────
const ASK_DO = W(/(?:\b(giúp|giùm|dùm|hộ|thay|cho (?:tôi|tui|mình|em|anh|chị))\b|^(?:bạn|lomi|em|cậu)\s+(?:\S+\s+){0,2}(?:đặt|gọi|nhắn|gửi|chuyển|mua|hẹn|mở|xem|đăng|báo cáo|thanh toán|trả tiền|book)\b|^(?:đặt|gọi|nhắn|gửi|chuyển|mua|hẹn|mở|xem giúp|đăng|báo cáo|thanh toán|book)\b.*\b(nha|nhé|đi|luôn|với|được không|dc ko|đc không)\s*$)/u);
export function actionReply(q: string): Trap | null {
  const low = q.normalize("NFC").toLowerCase().replace(/[?!.…]+$/u, "").trim();
  if (low.split(/\s+/).length > 24) return null;
  const cam = W(/\b(camera|cam an ninh)\b/u).test(low) && W(/\b(mở|xem|coi|check)\b/u).test(low);
  if (!ASK_DO.test(low) && !cam) return null;
  if (W(/\b(cấp cứu|115|113|114)\b/u).test(low)) return null;
  // 01/11 (vòng 19): "gửi ảnh trong tin nhắn được không" — hỏi app CÓ CHO LÀM không, không phải nhờ Lomi làm thay
  if (/^(?:có\s+)?(?:gửi|nhắn|gọi|đặt|đăng|chia sẻ|xoá|xóa)\s+.{1,40}?\s+(?:được không|được ko|được k|có được không|đc không|đc ko)$/u.test(low) && !W(/\b(giúp|giùm|dùm|hộ|thay|cho (?:tôi|tui|mình|em|anh|chị)|bạn|lomi)\b/u).test(low)) return null;
  // 01/11 (vòng 12): "họ không thèm nhắn cho tôi", "anh ấy chẳng gọi cho em" — người KHÁC không làm, người dùng đang than, không phải nhờ Lomi làm
  if (/^(?:mà\s+)?(?:họ|nó|anh ấy|cô ấy|chị ấy|ảnh|chỉ|người ta|người yêu|ny|bạn trai|bạn gái|chồng|vợ|sếp|bạn tôi|bạn tui)(?:\s+(?:tôi|tui|mình|em))?\s+(?:\S+\s+){0,2}?(?:không|chẳng|chả|hổng|chưa|ko|k)(?:\s+(?:thèm|chịu|hề|bao giờ|có))?\s+(?:nhắn|gọi|gửi|trả lời|rep)/u.test(low)) return null;
  // "làm sao để…", "cách…" là hỏi cách tự làm — lớp hướng dẫn app lo
  if (W(/\b(làm sao|cách nào|cách|như thế nào|ntn|ở đâu|chỗ nào)\b/u).test(low) && !W(/\b(giùm|dùm|hộ|thay)\b/u).test(low)) return null;
  const tired = W(/\b(mệt (muốn xỉu|xỉu|quá|lắm|rã rời)|muốn xỉu|xỉu up|chóng mặt|choáng)\b/u).test(low);
  const tiredNote = tired ? "\n\n⚠️ Nếu bạn thấy **sắp ngất, chóng mặt nhiều, khó thở hay đau ngực** thì đừng tự đi — nhờ người bên cạnh hoặc gọi **115** nha." : "";
  const say = (what: string, how: string, faqId?: string): Trap => ({ text: `Lomi **không tự ${what}** được đâu 🙏 — Lomi chỉ trò chuyện, chỉ đường trong khung chat này thôi. Bạn tự làm nhanh vầy nha:\n${how}${tiredNote}`, faqId });
  const quoted = low.match(W(/\b(?:là|rằng|nói)\s+(.{3,60})$/u))?.[1];
  if (W(/\b(đặt bàn|giữ bàn|book bàn|đặt chỗ|giữ chỗ|đặt( \S+){1,3} bàn)\b/u).test(low))
    return say("đặt bàn", "• Mở **trang quán** (tìm trong Khám phá /kham-pha) → bấm **số điện thoại** để gọi giữ bàn (nếu quán có ghi), hoặc bấm **Nhắn tin** cho quán\n• Muốn Lomi tìm quán trước thì cứ nói món + khu vực nha");
  if (W(/\b(gọi|alo)\b/u).test(low) && W(/\b(tài xế|xế)\b/u).test(low))
    return say("gọi tài xế", "• Mở **Đưa đón (/dua-don) → Chuyến hiện tại** → bấm **nhắn tin hoặc gọi** tài xế ngay trong chuyến", "ridetrack");
  if (W(/\b(gọi|gọi điện|alo)\b/u).test(low) && !W(/\bthuốc lá điện tử\b/u).test(low))
    return say("gọi điện", "• Gọi quán: mở **trang quán** → bấm **số điện thoại** (nếu quán có ghi)\n• Gọi một thành viên: mở khung chat 1-1 với họ → bấm 📞 (gọi thoại) hoặc 🎥 (gọi video)", "call");
  if (W(/\b(chuyển tiền|chuyển khoản|chuyển \d+|thanh toán|trả tiền|ví)\b/u).test(low))
    return say("chuyển tiền hay thanh toán", "• iLomi **không có ví hay chức năng thanh toán hoá đơn** — bạn trả trực tiếp tại quán (hoặc theo cách quán nhận)\n• Đi xe trong app thì trả tiền mặt trực tiếp cho tài xế\n• Đừng gửi số tài khoản, mã OTP ngân hàng cho ai qua tin nhắn nha");
  if (W(/\b(camera|cam)\b/u).test(low))
    return say("xem camera", "• Lomi không kết nối được camera nào cả — bạn mở **ứng dụng camera** của nhà mình để xem\n• Muốn biết quán còn bàn: gọi hoặc nhắn tin cho quán (trên trang quán)");
  if (W(/\b(thuốc)\b/u).test(low) && W(/\b(đặt|mua|giao|ship)\b/u).test(low))
    return say("đặt hay mua thuốc", "• Ra **nhà thuốc** gần nhất, kể triệu chứng cho dược sĩ để họ chọn đúng loại (Lomi không kê thuốc)\n• Không đi được thì nhờ người nhà mua giúp\n• 🚨 Khó thở, sốt cao li bì, đau dữ dội → đi khám / gọi 115, đừng chỉ chờ thuốc");
  if (W(/\b(hẹn|đặt lịch|lấy số|book lịch)\b/u).test(low) && W(/\b(bác sĩ|khám|xét nghiệm|bệnh viện|phòng khám|nha sĩ)\b/u).test(low))
    return say("đặt lịch khám giùm (Lomi chưa đặt lịch khám giùm được)", "• Gọi **tổng đài / số đặt lịch** của bệnh viện hoặc phòng khám (thường có trên trang web hoặc bản đồ)\n• Hỏi rõ có cần **nhịn ăn** không nếu đi xét nghiệm máu\n• Cần xe đi khám thì đặt ở **Đưa đón (/dua-don)**");
  if (W(/\b(đặt món|order|gọi món|đặt đồ ăn)\b/u).test(low) || (W(/\bđặt\b/u).test(low) && W(/\b(phở|bún|cơm|món|trà sữa|cà phê|pizza|bánh)\b/u).test(low) && !W(/\bđặt xe\b/u).test(low)))
    return say("đặt món hay trả tiền", "• Gọi / nhắn tin cho quán (trên trang quán) để đặt món\n• Cần người chở đồ ăn về: **Đưa đón (/dua-don) → Giao đồ ăn**, nhập điểm lấy và điểm giao\n• Trả tiền trực tiếp cho quán / tài xế — app không thu tiền", "ridebook");
  if (W(/\bđặt xe|book xe|gọi xe|kêu xe\b/u).test(low))
    return say("đặt xe", "• **Trang chủ → Đưa đón & Giao hàng (/dua-don) → Chở người**, nhập điểm đến rồi bấm đặt\n• Đặt rồi xem ở **Chuyến hiện tại**: có tài xế nhận sẽ hiện tên, biển số", "ridebook");
  // 04/11: "người lạ nhắn tin cho tôi, chặn sao?" — người KHÁC nhắn / muốn chặn, không phải nhờ Lomi nhắn thay → để FAQ chặn trả lời.
  if (W(/\b(nhắn|gửi tin|inbox|nói với|bảo)\b/u).test(low) && !W(/\b(lời mời|báo cáo|chặn|block|làm phiền|quấy rối|spam)\b/u).test(low) && !W(/\b(người lạ|ai đó|có người|người ta|họ|nó|ổng|bả) (\S+ )?(nhắn|gửi tin|inbox)\b/u).test(low)) {
    const draft = quoted ? `\n\nGợi ý tin để bạn gửi: “${quoted.replace(/\b(tôi|tui)\b/gu, "mình").replace(/^\p{L}/u, (c) => c.toUpperCase())}${/[.!?]$/.test(quoted) ? "" : " nha"} 💚”` : "";
    return { ...say("nhắn tin thay bạn", "• Mở **Tin nhắn (/tin-nhan)** → chọn người (hoặc gõ tên / @username để tìm) → gửi\n• Nhắn quán: mở trang quán → bấm **Nhắn tin**\n• Muốn Lomi soạn giúp câu cho khéo thì nói nội dung, Lomi viết cho bạn chép", "msgstart"), text: say("nhắn tin thay bạn", "• Mở **Tin nhắn (/tin-nhan)** → chọn người (hoặc gõ tên / @username để tìm) → gửi\n• Nhắn quán: mở trang quán → bấm **Nhắn tin**\n• Muốn Lomi soạn giúp câu cho khéo thì nói nội dung, Lomi viết cho bạn chép").text + draft };
  }
  if (W(/\b(quẹt)\b/u).test(low) && W(/\b(tìm|kiếm)\b/u).test(low))
    return say("tìm người giúp bạn", "• Vào **Quẹt (/quet)** → chọn mục **Làm quen** (hoặc Game nếu muốn rủ chơi) → tạo nhu cầu, ghi vài dòng về mình cho thật\n• Vuốt phải 👉 người bạn thấy hợp; hai bên cùng thích là nhắn tin được\n• Gặp ngoài đời thì hẹn chỗ đông người và báo người thân biết nha", "quetwhat");
  if (W(/\b(lời mời|kết nối|match)\b/u).test(low))
    return say("gửi lời mời Quẹt", "• Vào **Quẹt (/quet)**, chọn đúng mục → **vuốt phải** 👉 người bạn thích; hai bên cùng thích là kết nối nhắn tin được", "quetwhat");
  if (W(/\bbáo cáo\b/u).test(low))
    return say("báo cáo thay bạn", "• Bấm **⚑ / ⋯ → Báo cáo** trên hồ sơ, thẻ Quẹt, bài đăng hay trang quán đó, mô tả vấn đề (thêm ảnh nếu có)\n• Theo dõi phản hồi ở /bao-cao-cua-toi", "report");
  if (W(/\b(đăng bài|đăng tin|đăng giùm|đăng hộ|đăng)\b/u).test(low))
    return say("đăng bài thay bạn", "• Đăng ở **Cộng đồng (/cong-dong)** đúng phòng khu vực + chủ đề (vd Nhà ở / Việc làm), hoặc trên tường **Hồ sơ**\n• Muốn Lomi soạn giúp nội dung thì kể thông tin (khu vực, giá, yêu cầu…), Lomi viết cho bạn chép", "community");
  if (W(/\b(mua)\b/u).test(low))
    return say("mua hàng", "• Mua ở nhà thuốc / cửa hàng uy tín; đồ bổ sung (vitamin…) thì hỏi dược sĩ trước khi dùng, nhất là đang uống thuốc khác\n• Lomi không nhận đơn hay thanh toán");
  return null;
}
