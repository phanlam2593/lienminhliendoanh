// ─────────────────────────────────────────────────────────────────────────────
// 31/10/2026 — DANH SÁCH CHATGPT LẦN 3 (300 câu người dùng thật: tâm sự, tâm lý, thuốc, trò chuyện, teencode, không dấu, lẫn tiếng Anh).
//   Các câu dưới đây trước đây bị hiểu sai hẳn: "thuốc hết hạn" → hạn gói thành viên, "thuốc nhỏ mắt mở nắp lâu" → lấy lại mật khẩu,
//   "ngại kể chuyện riêng" → kể chuyện cười, "Lomi có phải bác sĩ không" → "chưa có kiến thức", "đang cảm một người" → "chúc hai bạn
//   hạnh phúc", "bị cảm mà vẫn phải đi làm, chán" → gợi ý mục Quẹt…
//   Chạy SAU lớp khủng hoảng (crisisReply / crisisCheckIn), TRƯỚC các lớp hỏi đáp app / xã giao. Mỗi luật hẹp, chỉ bắt đúng kiểu câu đó.
//   Lời khuyên về thuốc ở đây là lời dặn an toàn chung (không liều, không tên thuốc cụ thể), riêng ibuprofen có nguồn NHS.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";
import { findMedTopicId as findMedId } from "@/lib/lomiMed";

export type L3 = { text: string; heart?: string; health?: boolean; id: string };

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const words = (q: string) => q.trim().split(/\s+/).length;

const ASK_PHARM = "Mang hộp / vỉ thuốc ra nhà thuốc hỏi dược sĩ, hoặc gọi bác sĩ đã kê — đó là cách chắc nhất.";
const NHS_IBU = "📚 Nguồn: NHS — Ibuprofen for adults (rà soát 27/08/2025) https://www.nhs.uk/medicines/ibuprofen-for-adults/";

// Chữ "gan" nghĩa là can đảm ("gan lên", "đủ gan", "gan dạ") — không phải lá gan.
const GAN_BRAVE = VN(/\b(gan (lên|dạ|lì)|(đủ|thiếu|chút|có|cần|không còn|hết) gan|gan (để|mà))\b/);
// Câu có chữ "cảm" nghĩa khác (cảm thấy, cảm giác, cảm xúc, cảm ơn, cảm nắng ai…) — bỏ đi trước khi xét "bị cảm".
const CAM_OTHER = VN(/\b(cảm thấy|cảm giác|cảm xúc|cảm ơn|cám ơn|cảm động|cảm tình|cảm nhận|tình cảm|đồng cảm|nhạy cảm|truyền cảm hứng|cảm hứng)\b/);
const CAM_OTHER_G = new RegExp(CAM_OTHER.source, CAM_OTHER.flags.includes("g") ? CAM_OTHER.flags : `${CAM_OTHER.flags}g`);
const strip_cam = (n: string) => n.replace(CAM_OTHER_G, " ");

export function list3Reply(q: string): L3 | null {
  const n = ` ${normalizeVi(q)} `;
  const w = words(q);

  // ═══════════════ THUỐC ═══════════════
  // Thuốc hết hạn (trước đây: hạn gói thành viên).
  if (VN(/\b(thuốc|vỉ thuốc|lọ thuốc|siro|si rô|thuốc nhỏ mắt|kem bôi)\b/).test(n) && VN(/\b(hết hạn|quá hạn|hết date|hết hạn sử dụng|quá date)\b/).test(n))
    return {
      id: "med_expired",
      health: true,
      text: "Thuốc đã **quá hạn sử dụng** thì đừng dùng nữa nha, kể cả khi trông vẫn bình thường — thuốc có thể giảm tác dụng, nhất là thuốc trị bệnh mạn tính hay thuốc cấp cứu thì không được để tới mức đó.\n• Đừng đổ thẳng xuống bồn cầu / cống; hỏi nhà thuốc gần nhà cách bỏ cho đúng\n• Thuốc đang cần dùng hằng ngày mà hết hạn thì mua / xin kê lại, trong lúc chờ hỏi dược sĩ\n• Lỡ uống một viên đã quá hạn rồi mà thấy khó chịu thì gọi bác sĩ / dược sĩ; khó thở, sưng môi mặt → gọi **115**\n\nBạn đang lo về thuốc gì vậy?",
    };
  // Thuốc nhỏ mắt / nhỏ mũi / siro đã mở nắp lâu (trước đây: lấy lại mật khẩu).
  if (VN(/\b(thuốc nhỏ mắt|nhỏ mắt|thuốc nhỏ mũi|nhỏ mũi|siro|si rô|lọ thuốc|chai thuốc|thuốc nước)\b/).test(n) && VN(/\b(mở nắp|mở ra|đã mở|khui|mở lâu|mở rồi)\b/).test(n))
    return {
      id: "med_opened",
      health: true,
      text: "Lọ thuốc nhỏ mắt, nhỏ mũi hay siro **sau khi mở nắp** chỉ dùng được trong một khoảng thời gian ghi trên hộp hoặc tờ hướng dẫn (dòng kiểu “dùng trong … ngày sau khi mở”) — thời hạn này ngắn hơn hạn in trên vỏ nhiều.\n• Quá thời gian đó thì bỏ, kể cả còn nhiều thuốc — để lâu dễ nhiễm khuẩn, nhất là thuốc nhỏ mắt\n• Mỗi lần mở nên ghi ngày mở lên vỏ cho dễ nhớ\n• Không nhớ đã mở bao lâu thì an toàn nhất là mua lọ mới; " + "hỏi dược sĩ nếu không chắc",
    };
  // Uống rồi mà quên không biết đã uống chưa.
  if (VN(/\b((không nhớ|quên mất|không biết|chẳng nhớ)( \S+){0,4} (đã |có )?uống( thuốc)?( \S+){0,2} (chưa|rồi chưa)|uống thuốc rồi mà quên|quên (là )?(đã )?uống (thuốc )?(rồi|chưa))\b/).test(n))
    return {
      id: "med_unsure",
      health: true,
      text: "Không chắc đã uống chưa thì **đừng uống thêm cho chắc** nha — uống trùng một liều có thể thành gấp đôi, với vài loại thuốc là nguy hiểm.\n• Gọi hỏi dược sĩ / bác sĩ đã kê, nói rõ tên thuốc và giờ thường uống; họ sẽ bảo nên bỏ liều này hay uống tiếp\n• Lần sau dùng hộp chia thuốc theo ngày, hoặc đánh dấu vào vỉ / đặt nhắc giờ trên điện thoại\n• Nếu lỡ uống gấp đôi rồi mà thấy khó chịu, choáng, khó thở → gọi **115**",
    };
  // Người nhà uống nhiều thuốc → rà soát.
  if (VN(/\b((uống|dùng|xài) (nhiều|cả đống|cả chục|mấy chục|quá nhiều|rất nhiều|đủ thứ) (loại )?thuốc|nhiều (loại )?thuốc quá)\b/).test(n))
    return {
      id: "med_review",
      health: true,
      text: "Nên đó bạn — người uống nhiều loại thuốc cùng lúc (nhất là người lớn tuổi) rất nên được **rà soát thuốc** định kỳ, vì thuốc dễ trùng nhau, tương tác với nhau, hoặc có loại không còn cần nữa.\n• Gom **hết** thuốc đang dùng — cả thuốc tự mua, thực phẩm chức năng, thuốc nam — mang theo khi đi khám hoặc ra nhà thuốc\n• Nhờ bác sĩ / dược sĩ xem lại: thuốc nào còn cần, có trùng hay tương tác không, giờ uống sao cho gọn\n• Đừng tự bỏ bớt thuốc bác sĩ kê khi chưa hỏi lại",
    };
  // Thuốc tránh thai uống trễ / quên.
  if (VN(/\b(thuốc tránh thai|viên tránh thai|thuốc ngừa thai|tránh thai hằng ngày|tránh thai hàng ngày)\b/).test(n) && VN(/\b(trễ|quên|muộn|bỏ lỡ|sót|lỡ)\b/).test(n))
    return {
      id: "med_pill_late",
      health: true,
      text: "Uống viên tránh thai **trễ giờ hoặc quên** thì cách xử lý tuỳ **loại vỉ** và **trễ bao lâu** — mỗi loại một khác, nên Lomi không đoán được.\n• Xem ngay phần “quên uống thuốc” trong tờ hướng dẫn trong hộp\n• Hỏi dược sĩ / bác sĩ sớm, nói rõ tên thuốc, trễ mấy tiếng, đang ở tuần thứ mấy của vỉ\n• Trong lúc chưa chắc, dùng thêm **bao cao su** khi quan hệ cho an toàn\n• Có quan hệ không bảo vệ trong mấy ngày quên thuốc thì hỏi dược sĩ / bác sĩ về tránh thai khẩn cấp càng sớm càng tốt",
    };
  // Bé uống siro / thuốc xong nôn ra.
  if (VN(/\b(bé|con|cháu|trẻ|em bé)\b/).test(n) && VN(/\b(siro|si rô|thuốc)\b/).test(n) && VN(/\b(nôn|ói|trớ|ọe)\b/).test(n))
    return {
      id: "med_kid_vomit",
      health: true,
      text: "Bé uống thuốc xong nôn ra thì **đừng tự cho uống lại liều khác ngay** nha — không biết bé đã hấp thu bao nhiêu, cho thêm dễ thành quá liều.\n• Gọi hỏi dược sĩ / bác sĩ: nói tên thuốc, bé nôn sau khi uống bao lâu, có nên cho lại không\n• Cho bé uống từng ngụm nước nhỏ, theo dõi dấu hiệu mất nước (tiểu ít, môi khô, khóc không có nước mắt)\n• Đưa bé đi khám ngay nếu bé **nôn liên tục, li bì, khó thở, nổi mẩn, sưng môi mặt**, hoặc bé dưới 3 tháng tuổi",
    };
  // Thuốc bôi làm da đỏ rát hơn.
  if (VN(/\b(thuốc mỡ|kem bôi|thuốc bôi|bôi thuốc|thuốc thoa|thoa thuốc)\b/).test(n) && VN(/\b(đỏ|rát|ngứa hơn|sưng|nổi mẩn|phồng|bỏng|tệ hơn|nặng hơn)\b/).test(n))
    return {
      id: "med_topical",
      health: true,
      text: "Bôi thuốc mà da **đỏ rát hơn** thì có thể da đang kích ứng hoặc dị ứng với thuốc — tạm **ngưng bôi** và rửa nhẹ chỗ đó bằng nước sạch nha.\n• Gọi hỏi bác sĩ đã kê / dược sĩ, mang theo tuýp thuốc\n• Đi khám sớm nếu đỏ lan rộng, phồng nước, chảy dịch, sốt\n• 🚨 Gọi **115** nếu sưng môi – mặt – họng, khó thở",
    };
  // Thuốc của người lớn cho bé.
  if (VN(/\b(thuốc|siro|si rô)\b( \S+){0,4} (của )?người lớn\b/).test(n) && VN(/\b(bé|con|trẻ|cháu|em bé|con nít)\b/).test(n))
    return {
      id: "med_adult_kid",
      health: true,
      text: "Đừng tự cho bé uống thuốc của người lớn nha, kể cả chia nhỏ liều — thuốc cho trẻ phải theo **tuổi và cân nặng**, và có thuốc ho, cảm của người lớn không dùng cho trẻ nhỏ.\n• Hỏi dược sĩ / bác sĩ, nói rõ tuổi, cân nặng và bé đang bị gì\n• Đưa bé đi khám nếu ho kèm khó thở, thở nhanh, sốt cao, bé li bì hoặc bỏ bú",
    };
  // Kháng sinh: thấy đỡ rồi ngưng được chưa.
  if (VN(/\bkháng sinh\b/).test(n) && VN(/\b(ngưng|ngừng|dừng|bỏ|thôi|nghỉ) (uống|thuốc|được|luôn|chưa|không|ko)|\b(có )?nên (ngưng|ngừng|dừng|bỏ)\b|\b(ngưng|ngừng|dừng|bỏ|thôi) (khi|lúc) (hết sốt|đỡ|khỏe|khoẻ|hết)|\b(thấy )?(khỏe|khoẻ|đỡ) rồi\b|\b(đỡ|khỏe|khoẻ|hết)( \S+){0,2} (rồi|hẳn)( \S+){0,4} (ngưng|ngừng|dừng|bỏ|thôi)\b/).test(n))
    return {
      id: "med_abx_stop",
      health: true,
      text: "Kháng sinh thì **uống đủ số ngày bác sĩ kê**, kể cả khi đã thấy đỡ nha — bỏ giữa chừng dễ làm bệnh quay lại và vi khuẩn kháng thuốc.\n• Bị tác dụng phụ khó chịu (tiêu chảy nhiều, nổi mẩn…) thì gọi bác sĩ / dược sĩ, đừng tự bỏ\n• 🚨 Khó thở, sưng môi mặt sau khi uống → gọi **115**",
    };
  // Kháng sinh còn dư lần trước.
  if (VN(/\bkháng sinh\b/).test(n) && VN(/\b(còn dư|dư|lần trước|còn lại|để dành|của người khác|thừa)\b/).test(n))
    return {
      id: "med_abx_left",
      health: true,
      text: "Đừng tự uống lại kháng sinh còn dư lần trước nha — kháng sinh phải đúng loại, đúng bệnh và **đủ liều đủ ngày**; uống nửa vời dễ không khỏi mà còn làm vi khuẩn kháng thuốc. Bệnh do virus (cảm, cúm thông thường) thì kháng sinh không có tác dụng.\n• Lần này bị gì thì đi khám hoặc hỏi dược sĩ, để bác sĩ quyết có cần kháng sinh không\n• Thuốc dư thì hỏi nhà thuốc cách bỏ cho đúng, đừng cất để dành",
    };
  // Thuốc gây chóng mặt / buồn ngủ mà lái xe.
  if (VN(/\b(thuốc|uống)\b/).test(n) && VN(/\b(chóng mặt|buồn ngủ|lơ mơ|choáng)\b/).test(n) && VN(/\b(lái xe|đi xe|chạy xe|đi xe máy|chạy xe máy|lái ô tô|lái oto|lái máy)\b/).test(n))
    return {
      id: "med_drive",
      health: true,
      text: "Thuốc đã ghi là có thể gây chóng mặt hay buồn ngủ thì **đừng lái xe, chạy xe máy** khi chưa biết thuốc ảnh hưởng tới mình ra sao nha — lơ mơ một giây trên đường là nguy hiểm cho cả bạn lẫn người khác.\n• Đọc kỹ tờ hướng dẫn, hỏi dược sĩ thuốc này ảnh hưởng bao lâu sau khi uống\n• Đang thấy chóng mặt, buồn ngủ thì nhờ người chở hoặc đi xe ôm / taxi\n• Đừng uống rượu bia cùng — dễ làm buồn ngủ nặng hơn",
    };
  // Ibuprofen lúc bụng đói (NHS).
  if (VN(/\b(ibuprofen|ibuprofene)\b/).test(n) && VN(/\b(bụng đói|lúc đói|khi đói|chưa ăn|trước ăn|trước khi ăn|sau ăn|sau khi ăn|với sữa|ăn trước|ăn no|ăn sau)\b/).test(n))
    return {
      id: "med_ibu_food",
      health: true,
      text: "Theo hướng dẫn của NHS, ibuprofen nên uống **cùng hoặc sau bữa ăn** (nuốt với nước), để đỡ hại dạ dày — tránh uống lúc bụng đói.\n• Đang hoặc từng bị **loét dạ dày** thì ibuprofen có thể không hợp — hỏi bác sĩ / dược sĩ trước\n• Đang mang thai thì tránh ibuprofen trừ khi bác sĩ / dược sĩ bảo dùng; đang cho con bú thì hỏi trước khi dùng\n• Hạn chế rượu bia khi đang dùng vì dễ tăng tác dụng phụ\n" + NHS_IBU,
    };
  // Lỡ / lo uống thuốc khi đang mang thai / cho con bú (không phải quá liều) — trước đây ra lời báo cấp cứu quá liều.
  if (VN(/\b(cho con bú|mang thai|có bầu|có thai|đang bầu|bà bầu|mẹ bầu)\b/).test(n) && VN(/\b(lỡ|lo|sợ) (là )?(đã )?(uống|dùng)( \S+){0,2} thuốc\b/).test(n) && !VN(/\b(quá liều|nhầm|cả vỉ|hết vỉ|nhiều viên|cả lọ|hết lọ)\b/).test(n))
    return {
      id: "med_preg_worry",
      health: true,
      text: "Đang mang thai hoặc cho con bú mà lỡ uống thuốc chưa hỏi trước thì đừng hoảng nha — nhiều thuốc thông thường vẫn dùng được, nhưng phải đúng loại. Có thuốc qua nhau thai hoặc một lượng nhỏ qua sữa mẹ, nên cần hỏi cho chắc.\n• Gọi dược sĩ / bác sĩ (hoặc bác sĩ sản), nói **tên thuốc, uống lúc nào, bao nhiêu viên**, đang mang thai mấy tháng / bé bú mấy tháng tuổi\n• Từ giờ trước khi uống thuốc gì thì hỏi trước nha\n• Bé bú mà li bì, bỏ bú, khó thở, nổi mẩn → đưa bé đi khám ngay",
    };

  // ═══════════════ TÂM LÝ: bắt đầu gặp chuyên viên tâm lý ═══════════════
  const THER = VN(/\b(chuyên viên tâm lý|chuyên gia tâm lý|bác sĩ tâm lý|nhà tâm lý|nhà trị liệu|trị liệu tâm lý|tư vấn tâm lý|khám tâm lý|đi khám tâm lý|gặp tâm lý|bác sĩ tâm thần)\b/);
  if (THER.test(n) && !VN(/\b(khác nhau|khác gì|khác biệt|phân biệt)\b/).test(n) && !VN(/\b(thuốc|uống thuốc)\b/).test(n)) {
    const cost = VN(/\b(tiền|chi phí|giá|tốn|bao nhiêu)\b/).test(n);
    const when = VN(/\b(làm sao biết|khi nào|lúc nào|có cần|cần (đi )?gặp)\b/).test(n);
    const shy = VN(/\b(ngại|sợ|xấu hổ|bị đánh giá|bị phán xét|bị judge|người ta nghĩ)\b/).test(n);
    const start = VN(/\b(bắt đầu|nói gì|kể gì|kể sao|nói sao|từ đâu|lần đầu|chưa từng|đặt lịch|hẹn)\b/).test(n);
    const where = VN(/\b(ở đâu|chỗ nào|tìm|đà lạt|gần đây)\b/).test(n);
    // (hỏi riêng "khi nào cần gặp" mà thẻ y khoa có nguồn đã trả lời được thì để thẻ đó lo)
    if (!shy && !start && !cost && !where && findMedId(q)) return null;
    if (cost || when || shy || start || where || VN(/\b(ib|nhắn|muốn gặp|muốn đi|nên đi)\b/).test(n)) {
      const parts: string[] = [];
      if (shy) parts.push("Ngại hay sợ bị đánh giá là cảm giác **rất nhiều người có** trước buổi đầu, Lomi hiểu mà 💚 Chuyên viên tâm lý được đào tạo để lắng nghe **không phán xét**, và những gì bạn kể được giữ kín. Bạn cũng không cần kể hết ngay — kể tới đâu thấy thoải mái thì kể tới đó.");
      if (when) parts.push("Nên tìm gặp chuyên viên tâm lý khi một cảm xúc (buồn, lo, căng thẳng, mất ngủ…) **kéo dài vài tuần**, làm ảnh hưởng tới việc ăn ngủ, học hành, công việc hay các mối quan hệ, hoặc khi bạn thấy tự mình xoay xở không nổi nữa. Không cần đợi tới lúc “nặng lắm” mới đi.");
      if (start || (!shy && !when && !cost && !where)) parts.push("Buổi đầu thường chỉ là làm quen thôi, bạn có thể mở lời đơn giản kiểu: “Dạo này em hay … (buồn / lo / mất ngủ) khoảng … rồi, em không biết bắt đầu từ đâu.” Ghi trước vài ý ra giấy hoặc điện thoại cũng được — người ta sẽ hỏi dần để hiểu bạn.");
      if (where || start) parts.push("Tìm chỗ khám: hỏi ở **bệnh viện gần bạn** xem có phòng khám tâm lý / tâm thần không, hoặc tìm phòng khám tâm lý tư nhân; nhiều nơi có tư vấn online. Gọi trước để hỏi lịch hẹn và giá.");
      if (cost) parts.push("Chi phí mỗi buổi **khác nhau tuỳ nơi** (bệnh viện hay phòng khám tư, trực tiếp hay online), nên bạn gọi hỏi giá trước khi đặt lịch. Lomi không có bảng giá cụ thể nên không đoán con số.");
      parts.push("Nếu có lúc nào thấy nặng nề tới mức nghĩ tới chuyện làm hại bản thân thì đừng chờ lịch hẹn — gọi **115** hoặc đường dây **Ngày Mai 096 306 1414** nha.");
      return { id: "therapist", heart: "seekhelp", text: parts.join("\n\n") };
    }
  }
  // Ngại / không đủ gan kể chuyện riêng (trước đây: "ngại kể chuyện" → kể chuyện cười).
  if (VN(/\b(ngại|sợ|không đủ gan|chưa đủ gan|không đủ can đảm|không dám|khó mở lời|ngượng)( \S+){0,4} (kể|nói ra|chia sẻ|tâm sự)( \S+){0,3} (chuyện|với|này)\b|\bkể chuyện riêng\b/).test(n) && !VN(/\b(chuyện cười|truyện cười|kể chuyện vui)\b/).test(n))
    return {
      id: "shy_share",
      heart: "open",
      text: "Không sao đâu, ngại là chuyện bình thường mà 💚 Bạn cứ kể phần nào thấy thoải mái thôi, không cần kể hết, cũng không cần kể cho mạch lạc. Lomi nghe, không phán xét, và không ép bạn đâu.\n\nNếu khó bắt đầu, thử một câu thôi: “Chuyện là…” rồi viết tiếp vài chữ cũng được.",
    };

  // ═══════════════ TÂM SỰ: vài tình huống hay bị đọc sai ═══════════════
  // "không biết phải làm gì nữa" — bế tắc (trước đây: "😄 Để Lomi gợi ý vài chỗ đi chơi").
  if (VN(/\b(không|k|ko|chẳng|chả) biết (phải )?(làm|tính) (gì|j) nữa\b/).test(n) && w <= 12)
    return { id: "stuck_life", heart: "sad", text: "Nghe như bạn đang bế tắc lắm 🥺 Lúc rối quá thì chưa cần tìm ra cách giải ngay đâu — mình cứ nói ra trước đã, cho nhẹ đầu.\n\nChuyện gì đang làm bạn thấy hết đường vậy? Kể Lomi nghe nha." };
  // "xỉu ngang khi thấy điểm thi :))" — nói quá, kèm cười.
  if (VN(/\b(xỉu|ngất)( ngang| luôn| tại chỗ| up)?\b/).test(n) && VN(/\b(điểm|thi|tin nhắn|hoá đơn|hóa đơn|giá|bill|lương)\b/).test(n) && /(:\)+|=\)+|😂|🤣|😅|haha|hihi)/iu.test(q))
    return { id: "faint_joke", text: "Haha điểm thi làm bạn “xỉu ngang” luôn hả 😅 Điểm sao rồi, tốt quá bất ngờ hay tệ quá vậy? Kể Lomi nghe nè!\n\n(Còn nếu bạn bị choáng, ngất thật thì nằm nghỉ, uống chút nước và báo người bên cạnh nha.)" };
  // Mới sinh mà chồng không phụ.
  if (VN(/\b(mới sinh|sau sinh|ở cữ|đẻ xong|sinh xong|có em bé)\b/).test(n) && VN(/\b(chồng|ck)( \S+){0,2} (chẳng|không|chả|ko) (phụ|giúp|đỡ|quan tâm|chia sẻ)\b/).test(n))
    return { id: "postpartum_help", heart: "marriage", text: "Mới sinh xong cơ thể còn đau, đêm thức trông con, mà chồng lại không phụ thì vừa mệt vừa tủi lắm, Lomi thương 🥺\n\nThử nói rõ với chồng những việc cụ thể cần anh làm (thay tã, ru con đêm, nấu ăn, rửa bình sữa…) — nhiều ông chồng không phụ vì không biết bắt đầu từ đâu chứ không hẳn là không thương. Nhờ thêm người nhà phụ được thì càng tốt.\n\nNếu bạn thấy buồn bã, dễ khóc, mất hứng thú kéo dài hơn hai tuần sau sinh, hãy nói với bác sĩ — trầm cảm sau sinh là bệnh thường gặp và chữa được.\n\nGiờ bạn đang mệt nhất chuyện gì?" };
  // "đang cảm một người mà người ta có ny rồi" (trước đây: "chúc hai bạn thật hạnh phúc").
  if (VN(/\b(cảm|crush|thích|yêu thầm|để ý|cảm nắng)( \S+){0,2} (một |1 )?(người|anh|chị|bạn|cô|cậu|ảnh|ổng|ẻm|nhỏ|thằng)( \S+){0,5} (đã |có |có người yêu|có ny|có bồ|có gia đình|có vợ|có chồng)/).test(n) && VN(/\b(có ny|có người yêu|có bồ|có gia đình|có vợ|có chồng|có người rồi)\b/).test(n))
    return {
      id: "crush_taken",
      heart: "unrequited",
      text: "Thích một người mà người ta đã có đôi rồi thì lòng rối lắm, Lomi hiểu 😔 Cảm xúc tự đến, không phải lỗi của bạn.\n\nCó điều, chuyện mình làm gì với cảm xúc đó thì mình chọn được: giữ khoảng cách vừa đủ, bớt nhắn tin riêng, dành thời gian cho bạn bè và việc mình thích — để cảm xúc nhạt dần mà không ai bị tổn thương.\n\nBạn biết người ấy lâu chưa?",
    };
  // Gia đình không cho yêu / cưới (gõ không dấu "khong dong y" từng bị đoán dấu thành "đông y" → danh sách thuốc bắc).
  if (VN(/\b(ba mẹ|bố mẹ|ba má|mẹ|má|ba|bố|cha|gia đình|cả nhà|nhà (em|anh|tui|tôi|mình))( \S+){0,2} (không|chẳng|ko|k|hông) (đồng ý|đông y|chấp nhận|cho phép|ủng hộ|cho)( cho)?( \S+){0,3} (yêu|quen|cưới|lấy|đến với|qua lại)\b/).test(n))
    return {
      id: "family_love",
      heart: "family",
      text: "Thương một người mà gia đình không đồng ý thì kẹt ở giữa khó chịu lắm, Lomi hiểu 😔 Một bên là người mình thương, một bên là người thân.\n\nThường ba mẹ phản đối vì **lo** — lo về hoàn cảnh, tính cách, tương lai của mình. Thử hỏi thật bình tĩnh xem ba mẹ lo nhất điều gì, rồi để ba mẹ có dịp gặp và hiểu người ấy hơn qua thời gian, thay vì cãi tay đôi. Người yêu bạn cũng cần kiên nhẫn và tôn trọng gia đình bạn.\n\nBa mẹ đã nói lý do vì sao không đồng ý chưa?",
    };
  // Người yêu / người cũ có người mới.
  if (VN(/\b(người yêu|ny|người cũ|ex|bồ|người ta)( cũ)?( \S+){0,3} (đã )?có (người mới|bồ mới|ny mới|người yêu mới|người khác)\b/).test(n))
    return {
      id: "ex_new",
      heart: "ex",
      text: "Nghe tin người ấy có người mới thì như bị hẫng một nhịp, choáng là đương nhiên 🥺 Dù đã chia tay hay chưa rõ ràng, cảm giác bị thay thế vẫn đau thật.\n\nHôm nay đừng ép mình phải ổn ngay. Tạm đừng vào trang cá nhân của họ, ăn chút gì đó, nhắn cho một người bạn thân. Cảm giác này sẽ dịu dần.\n\nBạn biết tin này lâu chưa?",
    };
  // Sợ người yêu bỏ vì mình không đẹp (trước đây: bài chia tay).
  if (VN(/\b(sợ|lo)( \S+){0,2} (người yêu|ny|anh ấy|cô ấy|chồng|vợ|bồ)( \S+){0,2} (bỏ|chán|chê)\b/).test(n) && VN(/\b(không đẹp|xấu|mập|béo|không xinh|không giỏi|không bằng|thua)\b/).test(n))
    return {
      id: "insecure",
      heart: "selfworth",
      text: "Sợ người mình thương rời đi vì mình “không đủ đẹp” — cảm giác đó làm mình bất an lắm, Lomi hiểu 🥺\n\nNgười ta ở bên nhau lâu dài vì cách đối xử, sự quan tâm, những lúc cười cùng nhau — không chỉ vì vẻ ngoài. Nỗi sợ này nhiều khi đến từ cách mình đang nhìn chính mình hơn là từ người kia.\n\nNgười yêu bạn có nói hay làm gì khiến bạn nghĩ vậy không, hay là nỗi lo tự trong lòng?",
    };
  // Chồng / vợ nói mình "làm quá" (trước đây: "Vậy hả 😄").
  if (VN(/\b(chồng|vợ|ck|vk|người yêu|ny|anh ấy|cô ấy|mẹ|ba|bố)( \S+){0,3} (nói|bảo|chê|kêu)( \S+){0,2} (làm quá|làm lố|nhạy cảm quá|nghĩ nhiều|làm màu|làm quá lên)\b/).test(n))
    return {
      id: "dismissed",
      heart: "marriage",
      text: "Bị người thân nói “làm quá lên” thì tủi lắm, vì cảm giác như cảm xúc của mình không được tính 😔 Cảm xúc của bạn là thật, dù người khác thấy chuyện đó nhỏ.\n\nKhi cả hai bình tĩnh, thử nói theo kiểu “mình thấy …” thay vì “anh / em lúc nào cũng …”, ví dụ: “Khi anh nói em làm quá, em thấy như mình không được hiểu. Em chỉ cần anh nghe em nói hết đã.”\n\nChuyện gì khiến người ấy nói vậy?",
    };
  // Thuyết trình / nói trước đám đông run.
  if (VN(/\b(thuyết trình|nói trước đám đông|nói trước lớp|phát biểu|đứng lên nói|presentation)\b/).test(n) && VN(/\b(run|sợ|hồi hộp|lo|trốn|run run|đơ|quên hết|tim đập)\b/).test(n))
    return {
      id: "stage_fright",
      heart: "anxiety",
      text: "Run khi thuyết trình là chuyện cực kỳ phổ biến, kể cả người nói giỏi cũng run đó 😅 Run là cơ thể đang bật “chế độ sẵn sàng”, không phải dấu hiệu bạn kém.\n• Tập nói to vài lần trước gương hoặc với một người bạn — quen miệng thì đỡ run nhiều\n• Trước khi lên: thở chậm, thở ra dài hơn hít vào, vài lần\n• Nhớ 3 ý chính thay vì học thuộc từng chữ; quên thì nhìn ghi chú cũng không sao\n• Nhìn vào vài gương mặt thân thiện trong phòng\n\nLần tới bạn thuyết trình về chủ đề gì?",
    };
  // Sợ mắc lỗi, kiểm tra đi kiểm tra lại.
  if (VN(/\b(kiểm tra đi kiểm tra lại|kiểm tra lại hoài|check đi check lại|sợ (mình )?(mắc lỗi|làm sai|sai sót))\b/).test(n))
    return {
      id: "fear_mistake",
      heart: "anxiety",
      text: "Lúc nào cũng sợ sai rồi kiểm tra đi kiểm tra lại thì mệt lắm, Lomi hiểu 😮‍💨 Nhiều khi là do mình đặt chuẩn quá cao cho bản thân, hoặc từng bị trách nặng vì một lỗi.\n• Thử đặt giới hạn: kiểm tra **một lần thật kỹ**, rồi dừng\n• Tự hỏi: “Nếu sai thật thì chuyện tệ nhất là gì, sửa được không?” — đa số lỗi đều sửa được\n• Nếu cảm giác phải kiểm tra lặp lại nhiều, khó dừng và làm mất nhiều thời gian mỗi ngày, nên nói với chuyên viên tâm lý\n\nỞ chỗ làm, bạn sợ sai nhất ở việc gì?",
    };
  // Cảm xúc lên xuống thất thường (trước đây: dự báo thời tiết).
  if (VN(/\b(cảm xúc|tâm trạng|mood)( \S+){0,4} (lên xuống|lên lên xuống xuống|thất thường|thay đổi liên tục|như thời tiết|lúc lên lúc xuống)\b/).test(n))
    return {
      id: "mood_swing",
      heart: "sad",
      text: "Tâm trạng lên xuống thất thường thì mệt thật, như đi tàu lượn mà không biết lúc nào dừng 😮‍💨 Thiếu ngủ, căng thẳng, đói, thay đổi nội tiết… đều làm cảm xúc dễ chao đảo.\n• Thử ghi lại vài ngày: lúc nào tụt, trước đó đã xảy ra chuyện gì, ngủ mấy tiếng — dễ thấy quy luật hơn\n• Giữ giờ ngủ, ăn đều bữa, vận động nhẹ mỗi ngày\n• Nếu lên xuống mạnh, kéo dài nhiều tuần, ảnh hưởng tới công việc hay các mối quan hệ, nên gặp chuyên viên tâm lý / bác sĩ\n\nDạo này điều gì làm bạn tụt mood nhiều nhất?",
    };
  // "chill" mà đầu cứ lo / việc cứ dí.
  if (VN(/\b(chill)\b/).test(n) && VN(/\b(lo|nghĩ việc|nghĩ tới việc|việc cứ dí|deadline|đầu cứ|lo tùm lum|không yên|bị dí)\b/).test(n))
    return {
      id: "cant_rest",
      heart: "overthink",
      text: "Muốn nghỉ cho đàng hoàng mà đầu cứ chạy về công việc thì mệt thật 😮‍💨\n• Trước khi nghỉ, ghi ra giấy mấy việc còn dang dở và lúc nào sẽ làm — đầu sẽ yên tâm “buông” hơn\n• Tắt thông báo công việc trong lúc nghỉ, kể cả chỉ 1–2 tiếng\n• Làm gì đó cần dùng tay chân (đi bộ, nấu ăn, tắm nước ấm) để kéo đầu óc ra khỏi vòng lặp\n\nViệc gì đang dí bạn nhiều nhất vậy?",
    };
  // "rối như canh hẹ"
  if (VN(/\b(rối như canh hẹ|rối như tơ vò|rối tung rối mù|rối tinh rối mù)\b/).test(n))
    return {
      id: "overwhelm",
      heart: "overthink",
      text: "Rối như canh hẹ thì mình gỡ từng sợi một nha 🧶\n• Viết hết mọi chuyện đang làm bạn rối ra giấy, mỗi chuyện một dòng\n• Đánh dấu chuyện nào **gấp**, chuyện nào **để sau được**\n• Chỉ chọn **một** việc nhỏ làm trước — xong một việc là đầu nhẹ hơn liền\n\nChuyện nào đang làm bạn rối nhất?",
    };
  // "đầu óc cứ quay quay" — chóng mặt thật hay rối trí?
  if (VN(/\b(đầu óc|đầu|cái đầu)( \S+){0,2} (quay quay|quay cuồng|xoay xoay|lâng lâng)\b/).test(n))
    return {
      id: "dizzy_or_mind",
      text: "“Quay quay” của bạn là kiểu nào nè?\n• Chóng mặt thật: nhìn mọi thứ như xoay, lảo đảo, muốn té → ngồi / nằm xuống ngay, uống chút nước; nếu kèm méo miệng, yếu tay chân, nói khó, đau đầu dữ dội → gọi **115**\n• Hay đầu óc rối, nghĩ nhiều quá, không tập trung được?\n\nBạn nói thêm để Lomi giúp đúng chỗ nha.",
    };
  // Choáng / sắp xỉu vì nóng, đang ở ngoài nắng.
  if (VN(/\b(xỉu|ngất|choáng|chóng mặt|hoa mắt|lả)( \S+){0,4} (vì|do|tại) (nóng|nắng)|\b(nóng|nắng) (quá )?(muốn|sắp) (xỉu|ngất)\b/).test(n))
    return {
      id: "heat",
      health: true,
      text: "Cẩn thận nha, đây có thể là **kiệt sức vì nóng** — làm ngay mấy bước này:\n• Vào chỗ **mát, có bóng râm** ngay, ngồi hoặc nằm xuống, kê chân cao\n• Uống nước từ từ (nước lọc hoặc nước có chút muối / oresol)\n• Nới lỏng quần áo, lau người bằng khăn ướt, quạt cho mát\n\n🚨 Gọi **115** nếu sau khoảng 30 phút không đỡ, hoặc có **lú lẫn, nói lắp, co giật, ngất, người nóng mà không ra mồ hôi** — đó có thể là say nắng (sốc nhiệt), cần cấp cứu.\n\nBạn đang ở chỗ mát được chưa?",
    };
  // Bị cảm mà vẫn phải đi làm (trước đây: gợi ý mục Quẹt).
  if (VN(/\b(bị cảm|cảm cúm|cảm lạnh|bị ốm|bị bệnh|đang ốm|bị sốt|cảm)( \S+){0,4} (vẫn |mà )?(phải )?(đi làm|chạy deadline|làm việc|đi học|đi ca|tăng ca)\b/).test(strip_cam(n)))
    return {
      id: "sick_work",
      heart: "flu",
      text: "Bị cảm mà vẫn phải đi làm thì mệt gấp đôi, thương bạn 🤒\n• Nghỉ được một hai hôm là tốt nhất — cơ thể cần nghỉ mới mau khỏi, lại đỡ lây cho đồng nghiệp\n• Phải đi thì uống đủ nước, ăn đồ ấm dễ tiêu, ngủ sớm; ho hắt hơi thì che miệng, rửa tay thường xuyên\n• Đi khám nếu sốt cao không hạ, khó thở, đau ngực, hoặc mấy ngày không đỡ mà nặng thêm\n\nBạn đang bị triệu chứng gì — sổ mũi, đau họng hay sốt?",
    };
  // "hơi cảm", "bị cam quá" (gõ thiếu dấu) — bị cảm.
  if (w <= 10 && !VN(/\b(vợ|chồng|ck|vk|con|bé|mẹ|má|ba|bố|ông|bà|cháu|người yêu|ny|bạn tui|bạn em|anh ấy|chị ấy|em gái|em trai|anh trai|chị gái)\b/).test(n) && VN(/\b(bị|hơi|đang|thấy|mới bị) (cảm|cam)( lạnh)?( nhẹ| quá| rồi| rùi| nè| á| ghê| hà)*( làm sao đây| sao giờ| phải làm sao| làm sao)?\s*$/).test(strip_cam(n).replace(/[?!.…]+/g, " ").replace(/\s+/g, " ")) && !VN(/\b(ăn|uống|quả|trái|nước) cam\b/).test(n))
    return {
      id: "mild_cold",
      heart: "flu",
      text: "Hơi cảm hả, thương ghê 🤒 Nghỉ ngơi nhiều, uống đủ nước ấm, ăn đồ dễ tiêu, giữ ấm cổ — cảm lạnh thông thường hay tự đỡ dần sau khoảng một tuần.\n\nĐi khám nếu sốt cao không hạ, khó thở, đau ngực, lừ đừ, hoặc mấy ngày không đỡ mà nặng thêm.\n\nBạn đang bị gì nhiều nhất — sổ mũi, đau họng, sốt hay nhức người?",
    };
  // Lá gan + rượu bia / ăn uống (không phải "gan" là can đảm).
  if (VN(/\bgan\b/).test(n) && !GAN_BRAVE.test(n) && VN(/\b(nhậu|rượu|bia|ăn uống thất thường|ăn uống bậy|toang|yếu)\b/).test(n) && !VN(/\b(nóng|sôi|tức|giận)\b/).test(n))
    return {
      id: "liver_worry",
      health: true,
      text: "Gan khoẻ hay yếu thì **không đoán được bằng cảm giác** đâu — gan thường âm thầm, có bệnh rồi vẫn chưa thấy gì; còn mệt mỏi thì có rất nhiều nguyên nhân khác.\n• Uống rượu bia nhiều, thường xuyên đúng là hại gan — bớt rượu bia là việc có ích nhất cho gan\n• “Thuốc bổ gan” không thay được việc bớt rượu bia; muốn dùng thì hỏi bác sĩ / dược sĩ trước\n• Lo thì đi khám, xét nghiệm máu (men gan…) và siêu âm là biết rõ\n• Đi khám sớm nếu vàng da, vàng mắt, nước tiểu sẫm, bụng to lên, đau bụng phải",
    };
  // "gan nóng lên khi tức giận" — nói về cơn giận.
  if (VN(/\bgan\b( \S+){0,2} (nóng lên|sôi lên|nóng|sôi)\b/).test(n) && VN(/\b(tức|giận|bực|cáu)\b/).test(n))
    return {
      id: "anger_body",
      heart: "angerself",
      text: "Cái cảm giác nóng ran trong người mỗi lần tức giận là thật đó — cơ thể đang bật “chế độ chiến đấu”: tim đập nhanh, mặt nóng, người căng lên 😤\n• Lúc đang nóng: dừng lại, thở chậm vài nhịp, ra chỗ khác vài phút rồi hẵng nói\n• Uống ngụm nước mát, đi bộ một vòng cho cơn giận xuống\n• Sau đó ngẫm lại: điều gì hay làm mình nổi nóng nhất?\n\nDạo này chuyện gì làm bạn hay tức vậy?",
    };
  // "gan lên" — muốn can đảm hơn để làm một việc.
  if (GAN_BRAVE.test(n) || VN(/\b(lấy can đảm|lấy hết can đảm|can đảm hơn|dũng cảm hơn)\b/).test(n)) {
    const what = VN(/\bxin lỗi\b/).test(n) ? "Muốn xin lỗi mà ngại là vì bạn coi trọng người đó đó 💚 Một lời xin lỗi thật lòng chỉ cần ngắn: nói rõ mình sai ở đâu, mình hiểu người kia buồn ra sao, và lần sau mình sẽ làm khác thế nào." : VN(/\b(phỏng vấn)\b/).test(n) ? "Hồi hộp trước phỏng vấn là bình thường, chứng tỏ bạn coi trọng cơ hội này 💪 Chuẩn bị sẵn 3 câu: giới thiệu bản thân, vì sao muốn làm ở đây, một chuyện bạn từng làm tốt — có sẵn mấy câu đó là tự tin hơn nhiều." : VN(/\b(sếp)\b/).test(n) ? "Muốn nói chuyện với sếp mà run thì chuẩn bị trước nha 💪 Ghi ra 2–3 ý chính, nói theo kiểu “em thấy … / em đề xuất …”, chọn lúc sếp không vội." : VN(/\b(đi khám|khám)\b/).test(n) ? "Ngại đi khám là chuyện nhiều người có lắm, nhưng đi sớm thì yên tâm sớm 💚 Rủ một người thân đi cùng, ghi sẵn mấy điều muốn hỏi bác sĩ ra điện thoại cho đỡ quên." : "Muốn gan hơn mà vẫn sợ là bình thường — can đảm không phải là hết sợ, mà là vẫn làm dù còn sợ 💪 Chia việc khó thành bước nhỏ, chuẩn bị trước điều muốn nói, và tự nhắc: làm xong rồi sẽ nhẹ lòng hơn nhiều.";
    if (VN(/\b(kể|nói|chia sẻ|tâm sự)\b/).test(n) && VN(/\b(chuyện này|chuyện đó|kể chuyện)\b/).test(n))
      return { id: "shy_share", heart: "open", text: "Không sao đâu, kể được tới đâu thì kể tới đó nha 💚 Bạn không cần đủ “gan” mới được kể — Lomi nghe, không phán xét, và bạn có thể dừng lúc nào cũng được.\n\nThử bắt đầu bằng một câu thôi: “Chuyện là…”" };
    if (VN(/\b(sợ người ta đánh giá|sợ bị đánh giá|sợ bị chê)\b/).test(n)) return null; // để chủ đề "sợ bị đánh giá" lo
    return { id: "courage", text: `${what}\n\nBạn đang chuẩn bị làm chuyện gì vậy?` };
  }

  // ═══════════════ TRÒ CHUYỆN VỚI LOMI ═══════════════
  // "đừng hỏi sức khoẻ nữa" — tôn trọng, chuyển sang chuyện nhẹ nhàng.
  if (VN(/\b(đừng|thôi|khỏi|không cần) (hỏi|nói)( \S+){0,2} (sức khoẻ|sức khỏe|bệnh)( nữa)?\b/).test(n))
    return { id: "no_health", text: "Okie, không nói chuyện sức khoẻ nữa nha 😄 Chill thì chill! Bạn muốn tám chuyện gì — phim, đồ ăn, chỗ đi chơi ở Đà Lạt, hay để Lomi bói một lá tarot cho vui?" };
  if (VN(/^ (lomi ơi |lomi |ơi )?(bạn|cậu|em|lomi) là ai( vậy| thế| vậy ta| đó| á)? ?\??\s*$/).test(n.replace(/[?!.,]/g, " ").replace(/\s+/g, " ")))
    return {
      id: "who_lomi",
      text: "Lomi là trợ lý của iLomi nè 🤖 Lomi giúp bạn tìm quán, xem ưu đãi, hỏi chuyện dùng app, hỏi thông tin sức khoẻ thường gặp (có nguồn y khoa), nghe bạn tâm sự, và bói tarot cho vui. Bạn cần gì nè?",
    };
  // Lomi có phải bác sĩ / người thật / AI không (trước đây: "chưa có kiến thức").
  if (VN(/\b(lomi|bạn|em|cậu)( \S+){0,1} (có phải là|có phải|là) (bác sĩ|bác sĩ thật|người thật|người|ai|robot|máy|chatgpt)\b/).test(n) && VN(/\b(không|ko|hả|hông|chứ|vậy|hay)\b/).test(n) && w <= 12 && !VN(/\b(tâm lý|tâm thần|chuyên gia)\b/).test(n))
    return {
      id: "who_lomi",
      text: "Lomi **không phải bác sĩ** đâu, cũng không phải người thật 🤖 Lomi là trợ lý tự động của iLomi, trả lời theo kiến thức đã soạn sẵn — chuyện sức khoẻ thì theo nguồn y khoa đã đối chiếu.\n\nLomi không khám, không chẩn đoán, không kê thuốc hay nêu liều. Chuyện sức khoẻ của riêng bạn thì bác sĩ / dược sĩ vẫn là người quyết định nha.",
    };
  // Lomi có vui không.
  if (VN(/\b(lomi|bạn|cậu)( \S+){0,2} (có )?(vui|buồn|mệt|khoẻ|khỏe) (không|ko|hông|hok|k)\b/).test(n) && VN(/\blomi\b/).test(n) && w <= 8)
    return { id: "lomi_mood", text: "Được bạn hỏi thăm là Lomi vui rồi nè 😄 Còn bạn, hôm nay sao rồi?" };
  // Khen Lomi.
  if (VN(/\b(lomi|bạn|em|cậu)( \S+){0,1} (xịn|đỉnh|cute|đáng yêu|xịn xò)( ghê| quá| thật| thiệt| vậy| á| nha| ha| lắm| xỉu)*\b/).test(n) && w <= 7 && !VN(/\b(không|ko|chưa|kém|dở)\b/).test(n))
    return { id: "praise", text: pick(["Hihi cảm ơn bạn nha 🥰 Được khen là Lomi có động lực liền!", "Ui, bạn khen làm Lomi ngại ghê 😳💚 Cần gì cứ hỏi Lomi nha!"]) };
  // Chê câu trả lời / Lomi hiểu sai.
  if (VN(/\b(trả lời|rep|đáp|nói)( gì)? (kỳ|kì|sai|lạc đề|tào lao|không đúng|vô duyên|lung tung|linh tinh)( vậy| thế| quá| ghê| trời)*\b|\b(bạn|lomi|em|cứ) (cứ )?trả lời (về )?(\S+ ){0,3}hoài\b|\bhiểu (sai|nhầm|lộn) (rồi|ý)\b/).test(n))
    return {
      id: "complaint",
      text: "Ui, Lomi xin lỗi nha 🙏 Chắc Lomi hiểu nhầm ý bạn rồi. Bạn nói lại giúp Lomi bằng câu khác một chút được không? Nếu Lomi vẫn sai, bạn bấm 💡 Dạy Lomi để ban quản trị dạy lại cho Lomi nha.",
    };
  // "Tui nói 'toang' là … không phải bệnh nha"
  if (VN(/\bkhông phải (bệnh|sức khoẻ|sức khỏe|đau)( đâu| nha| nhé| mà)*\b/).test(n) && VN(/\b(nói|ý)\b/).test(n))
    return { id: "clarified", text: "Dạ, Lomi hiểu rồi nha 😅 Vậy chuyện gì đang “toang” vậy bạn, kể Lomi nghe với?" };
  // "toang" (không kèm sức khoẻ)
  if (VN(/\btoang\b/).test(n) && !VN(/\b(gan|bệnh|đau|sốt|cảm)\b/).test(n))
    return { id: "toang", heart: "sad", text: "Toang hả 😣 Chuyện gì vậy bạn? Kể Lomi nghe, biết đâu chưa tới mức hết cứu đâu." };
  if (VN(/\btoang\b/).test(n) && VN(/\b(cảm|ốm|bệnh)\b/).test(n) && VN(/\b(deadline|đi làm|việc)\b/).test(n))
    return {
      id: "sick_work",
      heart: "flu",
      text: "Vừa cảm vừa chạy deadline thì đúng là toang thật, thương bạn 🤒 Ưu tiên việc gấp nhất thôi, việc nào lùi được thì nhắn xin lùi; nhớ uống đủ nước, ăn đồ ấm và ngủ bù. Sốt cao không hạ hay khó thở thì đi khám nha.\n\nDeadline này còn bao lâu nữa?",
    };
  // Cảm ơn ngắn (trước đây: "Thôi được rồi, cảm ơn nhiều" → "chưa hiểu ý").
  if (w <= 7 && VN(/\b(cảm ơn|cám ơn|thanks|thank you|tks|thank)\b/).test(n) && VN(/^ (thôi|ok|okie|oke|được rồi|vậy)\b/).test(n))
    return { id: "thanks", text: "Dạ không có gì nè 😊 Cần gì cứ gọi Lomi nha!" };
  // App có phải của Đà Lạt không.
  if (VN(/\b(app|ứng dụng|ilomi)( này)? (có phải )?(là )?(của|ở|từ|dành cho) đà lạt\b/).test(n))
    return { id: "app_dalat", text: "Đúng rồi nè 🌲 iLomi là app cộng đồng ở **Đà Lạt** — nơi thành viên và doanh nghiệp địa phương kết nối với nhau: tìm quán, nhận ưu đãi, đặt xe, giao hàng, kết bạn và hỏi Lomi đủ thứ chuyện." };
  // Sao trả lời nhanh vậy.
  if (VN(/\b(sao|tại sao|làm sao mà)( bạn| lomi| em)? (trả lời|rep|đáp)( \S+)? (nhanh|lẹ)\b/).test(n))
    return { id: "why_fast", text: "Vì Lomi chạy **ngay trên máy của bạn** nè ⚡ Lomi trả lời theo kiến thức đã soạn sẵn nên không phải chờ gửi đi đâu xa. Có điều vì vậy mà câu nào lạ quá Lomi chưa biết thì sẽ nói thật là chưa biết." };
  // Ngoài phạm vi: lịch bóng đá, giá vàng — nói thật là không có dữ liệu trực tiếp.
  if (VN(/\b(đá mấy giờ|lịch thi đấu|lịch đá|tỉ số|tỷ số|đội tuyển|bóng đá|kết quả trận)\b/).test(n))
    return { id: "oos_sport", text: "Lomi chưa xem được lịch thi đấu hay tỉ số trực tiếp nên không dám nói bừa ⚽ Bạn xem trên app thể thao hoặc trang tin để có giờ chính xác nha. Tối nay xem bóng thì Lomi tìm giúp quán cà phê có chiếu bóng đá được nè!" };
  if (VN(/\b(giá vàng|vàng hôm nay|giá đô|tỷ giá|tỉ giá|giá xăng)\b/).test(n))
    return { id: "oos_price", text: "Lomi chưa xem được giá cập nhật trực tiếp nên không đoán con số đâu 🙏 Bạn xem trên trang của tiệm vàng / ngân hàng hoặc trang tin để có giá mới nhất trong ngày nha." };
  // Xin một câu động lực / động viên.
  if (VN(/\b(câu|lời|chút|vài câu)( \S+){0,1} (động lực|động viên|truyền động lực|khích lệ|cổ vũ|tích cực)\b|\b(động viên|cổ vũ) (tui|tôi|em|mình|anh|chị) (đi|với|chút)\b/).test(n))
    return {
      id: "motivate",
      text: pick([
        "Đây nè 💪 “Không cần chạy nhanh, chỉ cần đừng dừng lại.” Hôm nay làm được một bước nhỏ thôi cũng là tiến rồi đó!",
        "Nè 🌱 “Ngày mai của bạn được xây từ những việc nhỏ hôm nay.” Làm xong một việc nhỏ thôi rồi tự thưởng cho mình nha!",
        "Cho bạn nè ✨ “Mệt thì nghỉ, đừng bỏ cuộc.” Bạn đã đi được tới đây rồi, giỏi hơn bạn nghĩ đó!",
        "Nè 💚 “Chậm cũng được, miễn là mình vẫn đang đi.” Lomi tin bạn làm được!",
      ]),
    };
  return null;
}
