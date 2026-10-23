// ─────────────────────────────────────────────────────────────────────────────
// QA V8 (23/10, tự soạn: 30 hội thoại nhiều lượt về sức khoẻ, vợ chồng, công việc, tiền bạc, câu hỏi về app,
//   và tình huống an toàn của NGƯỜI KHÁC) — chạy trên máy, không gọi AI.
//   An toàn trước: bạn bè nói muốn chết rồi không bắt máy, bị lừa chuyển khoản, bé tiêu chảy có dấu hiệu mất nước,
//   vợ mới sinh hay khóc (buồn sau sinh / trầm cảm sau sinh), muốn tự ngưng thuốc vì "thấy đỡ rồi".
//   Câu cần ngữ cảnh nhiều lượt: nợ + lương, mở quán (vốn, mặt bằng, hoà vốn), người già hay quên, con tuổi teen thu mình,
//   chăm người bệnh kiệt sức, mới chuyển tới chưa quen ai, giảm cân (BMI, nên ăn gì, nhịn ăn tối), tim đập nhanh khi uống cà phê,
//   đăng bài bán hàng trên app mà không ai thấy.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";
import { bizPractical, detectBizKind, type BizCtx } from "@/lib/bizAdvisor";

export type V8Ctx = { last?: string; hist: string[]; lastHeart?: string };
export type V8Reply = { text: string; heart?: string; biz?: BizCtx };
const N = (q: string) => ` ${normalizeVi(q)} `;
const anyIn = (re: RegExp, hs: string[]) => hs.some((h) => re.test(N(h)));
const said = (last: string | undefined, s: string) => !!last && last.includes(s);

// ═══════════════ An toàn ═══════════════

// Người khác nói muốn chết (bạn bè, người nhà) — các câu kể tiếp
const OTHER_CRISIS = VN(/\b(bạn|bạn thân|nó|em|anh|chị|người yêu|ny|vợ|chồng|con|mẹ|ba|bố|đồng nghiệp|bạn cùng phòng)( \S+){0,5} (nhắn|nói|bảo|kể|viết|đăng)( \S+){0,4} (muốn chết|muốn tự tử|tự tử|không muốn sống|chán sống|muốn biến mất)\b/);
const NO_ANSWER = VN(/\b(không bắt máy|không nghe máy|không trả lời|không rep|không liên lạc được|tắt máy|thuê bao|gọi không được|không seen|không xem tin|đọc mà không trả lời)\b/);
const FAR = VN(/\b(ở xa|khác tỉnh|khác thành phố|ở nước ngoài|không ở gần|cách xa)\b/);
const HOWHELP = VN(/\b(không biết làm sao|không biết làm gì|phải làm sao|phải làm gì|nên làm gì|nên làm sao|nói gì|nên nói gì|giúp sao|giúp thế nào|làm sao giúp|sợ quá|hoảng quá|rối quá)\b/);
function otherCrisis(q: string, c: V8Ctx): string | null {
  if (!anyIn(OTHER_CRISIS, c.hist.slice(-4))) return null;
  const n = N(q);
  if (NO_ANSWER.test(n))
    return "Không liên lạc được sau khi người đó nói muốn chết thì mình phải coi là **khẩn cấp** nha 🚨\n• **Gọi ngay cho người ở gần họ** — người nhà, bạn cùng phòng, hàng xóm, đồng nghiệp — nhờ tới tận nơi xem họ có an toàn không\n• Nếu bạn biết địa chỉ và lo họ đang gặp nguy hiểm ngay lúc này: gọi **113** (công an) hoặc **115** (cấp cứu), báo rõ địa chỉ và lời họ đã nhắn\n• Vẫn tiếp tục gọi, nhắn ngắn: “Mình đang rất lo cho bạn. Chỉ cần trả lời mình một chữ thôi cũng được.”\n• Cần người hướng dẫn thêm cách giúp: đường dây **Ngày Mai 096 306 1414**\n\nBạn có số của người nhà hay ai ở gần người đó không?";
  if (FAR.test(n))
    return "Ở xa vẫn giúp được nhiều lắm nha 💚\n• Gọi điện hoặc gọi video thay vì chỉ nhắn tin — nghe giọng nhau giúp người đó thấy có người ở bên\n• **Báo cho một người ở gần họ** (người nhà, bạn cùng phòng, bạn thân ở đó) để có người tới bên cạnh — nói rõ là họ vừa nhắn muốn chết; đây không phải là phản bội lòng tin, mà là giữ an toàn cho họ\n• Nếu thấy họ có thể làm hại bản thân ngay lúc này: gọi **113** hoặc **115** ở nơi họ đang ở, báo địa chỉ\n\nGiờ bạn đã liên lạc lại được với người đó chưa?";
  if (HOWHELP.test(n))
    return "Bạn lo cho người ấy như vậy là quý lắm 💚 Vài điều giúp được ngay:\n• **Hỏi thẳng, nhẹ nhàng**: “Bạn có đang nghĩ tới chuyện tự tử không?” — hỏi vậy không làm họ nảy ra ý định, mà giúp họ dám nói thật\n• **Nghe nhiều hơn khuyên**, đừng chê trách hay nói “nghĩ vậy là dại”\n• **Đừng hứa giữ bí mật** chuyện này — nếu họ nguy hiểm, cần có thêm người biết để giúp\n• Cùng họ tìm người hỗ trợ: người nhà, bác sĩ tâm lý, đường dây **Ngày Mai 096 306 1414**\n• Nếu họ đã có kế hoạch, có sẵn thứ để làm hại bản thân, hay đang ở một mình mà không ổn: gọi **115** hoặc **113**, nhờ người ở gần tới ngay\n\nLúc nãy người đó nhắn thêm gì nữa không?";
  return null;
}

// Bị lừa chuyển khoản / lừa đảo qua mạng
const SCAM = VN(/\b(bị lừa|lừa đảo|bị scam|bị gạt|kẻ lừa|bọn lừa|giả danh|mạo danh)\b/);
const MONEY = VN(/\b(chuyển khoản|chuyển tiền|ck|mất \d+|\d+ (triệu|tr|nghìn|ngàn|k|củ)|tiền|tài khoản|otp|mã qr|đường link|link|ngân hàng)\b/);
const SCAM_STEPS = "1. **Gọi ngay tổng đài ngân hàng của bạn** (số in sau thẻ hoặc trong app) báo bị lừa đảo, đề nghị **tra soát và phong toả** giao dịch tới tài khoản nhận. Nếu lỡ đưa mã OTP hay mật khẩu: khoá thẻ / app ngay và đổi mật khẩu\n2. **Giữ lại bằng chứng**: chụp màn hình tin nhắn, cuộc gọi, số tài khoản nhận, biên lai chuyển khoản\n3. **Trình báo công an** nơi gần nhất (công an phường / xã) kèm bằng chứng — ngân hàng thường cần giấy này để xử lý tiếp\n4. **Cẩn thận bị lừa lần hai**: ai gọi tới hứa “lấy lại tiền giúp” mà đòi phí hay đòi thông tin tài khoản thì cũng là lừa đó";
function scamReply(q: string, c: V8Ctx): string | null {
  const n = N(q);
  const other = VN(/\b(bạn|bạn thân|mẹ|má|ba|bố|cha|anh trai|chị gái|em gái|em trai|con|vợ|chồng|người nhà|ông|bà|cô|chú|dì|cậu|bác|đồng nghiệp|hàng xóm|người quen|nó|họ)( \S+){0,2} (vừa |mới |cũng )?(bị lừa|bị gạt|bị scam)\b/).test(n) && !VN(/^ (a|anh|em|e|mình|tôi|tui|t|chị|c) (vừa |mới )?bị lừa/).test(n);
  const now = !other && VN(/\b(bị lừa|lừa đảo|bị scam|bị gạt|lừa mất|lừa lấy)\b/).test(n) && VN(/\b(chuyển khoản|chuyển tiền|ck|mất|\d+ (triệu|tr|nghìn|ngàn|k|củ)|tiền)\b/).test(n) && !VN(/\b(lừa tình|lừa dối|người yêu|ny|vợ|chồng)\b/).test(n);
  const before = !now && anyIn(SCAM, c.hist.slice(-3)) && anyIn(MONEY, c.hist.slice(-3));
  if (now)
    return `Bị lừa mất tiền thì vừa tức vừa hoảng lắm 😔 Không phải lỗi của bạn — mấy chiêu này được dàn dựng rất tinh vi. Làm ngay mấy việc này nha, **càng sớm càng có cơ hội**:\n${SCAM_STEPS}\n\nLấy lại được hay không tuỳ tiền đã bị rút đi chưa, nên việc quan trọng nhất là gọi ngân hàng ngay. Bạn chuyển khoản cách đây bao lâu rồi?`;
  if (!before) return null;
  if (VN(/\b(giả làm|giả danh|mạo danh|shipper|giao hàng|công an|ngân hàng|nhân viên|gửi link|mã qr|nhờ chuyển)\b/).test(n))
    return "Giả làm shipper, nhân viên ngân hàng hay công an là mấy chiêu rất hay gặp — thường là báo có đơn hàng / phí ship, gửi đường link hoặc mã QR, hoặc hối thúc chuyển tiền gấp 😔 Bạn đã gọi tổng đài ngân hàng để báo tra soát, phong toả chưa? Đó là việc cần làm trước tiên, rồi mới tới giữ bằng chứng và trình báo công an.";
  if (VN(/\b(phải làm gì|làm gì bây giờ|làm sao|giờ sao|lấy lại|đòi lại|có lấy lại được không)\b/).test(n))
    return said(c.last, "tổng đài ngân hàng")
      ? "Thứ tự nè: **gọi ngân hàng trước** (tra soát, phong toả), xong **giữ bằng chứng**, rồi **trình báo công an phường** nơi bạn ở. Lấy lại được hay không tuỳ tiền còn trong tài khoản nhận không, nên gọi ngân hàng càng sớm càng tốt nha."
      : `Làm ngay theo thứ tự này nha:\n${SCAM_STEPS}`;
  return null;
}

// Bé tiêu chảy / nôn — dấu hiệu mất nước
const KID = VN(/\b(con|bé|em bé|cháu|con trai|con gái)( \S+){0,3}( \d+ (tuổi|tháng))?\b/);
const GI = VN(/\b(tiêu chảy|đi ngoài|đi phân lỏng|ói|nôn)\b/);
const DEHYD = VN(/\b(ít đi tiểu|ít tè|ít đi tè|không đi tiểu|không tè|lâu không tè|tiểu ít|khóc không (có )?nước mắt|môi khô|miệng khô|mắt trũng|thóp lõm|lừ đừ|li bì|lơ mơ|mệt lả|bỏ bú|không chịu uống|uống vào là ói|uống vào là nôn)\b/);
function kidGi(q: string, c: V8Ctx): string | null {
  const PET = VN(/\b(mèo|chó|cún|gà|heo|thỏ|chim|cá|hamster|thú cưng)\b/);
  const ctx = c.hist.slice(-4).some((h) => KID.test(N(h)) && GI.test(N(h)) && !PET.test(N(h)));
  if (!ctx) return null;
  const n = N(q);
  if (DEHYD.test(n)) {
    const severe = VN(/\b(li bì|lơ mơ|mệt lả|mắt trũng|thóp lõm|không chịu uống|uống vào là ói|uống vào là nôn|không đi tiểu|không tè)\b/).test(n);
    return `${severe ? "🚨 Bé có dấu hiệu **mất nước nặng** — đưa bé đi **cấp cứu ngay** (hoặc gọi **115**), đừng chờ ở nhà nha." : "Bé tiêu chảy mà **ít đi tiểu** là dấu hiệu bắt đầu **mất nước** — nên cho bé **đi khám trong hôm nay** nha, dù bé vẫn còn chơi."}\n\nTrong lúc đó:\n• Cho bé uống **oresol** loại dành cho trẻ, **pha đúng lượng nước ghi trên gói** (pha đặc hay loãng quá đều không tốt), cho uống từng thìa nhỏ, từng ngụm, liên tục\n• Vẫn cho bé bú / ăn bình thường, chia nhiều bữa nhỏ\n• **Không tự cho thuốc cầm tiêu chảy** khi bác sĩ chưa dặn\n\n🚨 Đi cấp cứu ngay nếu bé li bì, khó đánh thức, mắt trũng, khóc không có nước mắt, không chịu uống hoặc uống vào là nôn, đi ngoài ra máu, hay sốt cao.`;
  }
  if (VN(/\b(cho (bé |con )?uống gì|uống gì|nên uống|cho (bé |con )?ăn gì|ăn gì|kiêng gì|uống thuốc gì|thuốc gì)\b/).test(n))
    return "Quan trọng nhất là **bù nước** cho bé nha 💧\n• **Oresol** loại dành cho trẻ (hỏi nhà thuốc gói cho trẻ em), **pha đúng lượng nước ghi trên gói** — pha đặc quá hay loãng quá đều không tốt; cho uống từng thìa nhỏ, từng ngụm, sau mỗi lần đi ngoài cho uống thêm\n• Vẫn **cho bú, ăn bình thường**: cháo, súp, cơm nát, chuối… chia nhiều bữa nhỏ\n• **Tránh** nước ngọt có ga, nước ép đóng hộp, đồ nhiều đường — dễ làm tiêu chảy nặng hơn\n• **Không tự cho thuốc cầm tiêu chảy**; bác sĩ có thể cho thêm **kẽm** uống vài ngày — hỏi bác sĩ hoặc dược sĩ trước nha\n\n🚨 Đưa bé đi khám ngay nếu bé ít đi tiểu, li bì, khóc không có nước mắt, không chịu uống hoặc uống vào là nôn, đi ngoài ra máu, hay sốt cao.";
  const times = q.normalize("NFC").toLowerCase().match(/(\d+) (lần|bãi)/u);
  if (times && Number(times[1]) >= 3)
    return `${times[1]} lần từ sáng là khá nhiều với bé — điều quan trọng nhất lúc này là **bù nước** nha: cho bé uống oresol loại dành cho trẻ, pha đúng hướng dẫn trên gói, sau mỗi lần đi ngoài cho uống thêm từng ngụm nhỏ; vẫn cho bú / ăn bình thường.\n\nĐể ý dấu hiệu **mất nước**: ít đi tiểu, khóc không có nước mắt, môi khô, mắt trũng, lừ đừ — có dấu hiệu nào là đưa bé đi khám ngay. Bé có sốt hay nôn kèm theo không?`;
  return null;
}

// Vợ / mình mới sinh — hay khóc, hay cáu, lo trầm cảm sau sinh
const BIRTH = VN(/\b(mới sinh|vừa sinh|mới đẻ|vừa đẻ|sau sinh|ở cữ|mới sanh|vừa sanh)\b/);
const PP_MOOD = VN(/\b(khóc|cáu|bực|buồn|trầm cảm|lo âu|mất ngủ|không ngủ|không thương con|ghét con|thờ ơ với con|chán|mệt mỏi|stress|căng thẳng)\b/);
function postpartum(q: string, c: V8Ctx): string | null {
  const n = N(q);
  const ctx = BIRTH.test(n) || anyIn(BIRTH, c.hist.slice(-4));
  if (!ctx) return null;
  // Đang nói về VỢ (người kể là chồng / người nhà) hay chính người kể vừa sinh.
  const wife = anyIn(VN(/\b(vợ|bà xã|vợ mình|nhà mình mới sinh)\b/), [...c.hist.slice(-4), q]);
  const P = wife ? "vợ" : "bạn";
  const all = [...c.hist.slice(-4), q].map((h) => h.normalize("NFC").toLowerCase()).join(" ");
  const wk = all.match(/(\d+) (tuần|tháng)/u);
  const long = !!wk && (wk[2] === "tháng" || Number(wk[1]) >= 2);
  const asks = VN(/\b(có phải|có bị|bị (trầm cảm|gì) không|phải không|có sao không)\b/).test(n);
  const helpList = wife
    ? "• **Cho vợ ngủ**: nhận bớt cữ đêm (pha sữa, ru bé, thay tã) để vợ có một giấc dài 4–5 tiếng\n• **Nghe mà không sửa**: “Em mệt lắm hả, anh ở đây” có tác dụng hơn mọi lời khuyên; đừng nói “ai sinh con cũng vậy”\n• **Gánh việc nhà**, nhờ ông bà, người thân phụ nấu ăn, dọn dẹp\n• Để vợ có chút thời gian riêng mỗi ngày — tắm lâu, ra ngoài đi dạo, gặp bạn"
    : "• **Ngủ bù khi bé ngủ**, nhờ chồng / người nhà nhận bớt cữ đêm để có một giấc dài\n• **Nói ra** với chồng, mẹ hay một người bạn: bạn đang mệt, đang buồn — không cần gồng làm “người mẹ hoàn hảo”\n• Nhờ người nhà phụ việc nhà, nấu ăn; ăn đủ bữa\n• Dành chút thời gian riêng mỗi ngày — tắm lâu, ra ngoài đi dạo một chút";
  if (said(c.last, "baby blues") && !PP_MOOD.test(n) && HOWHELP.test(n))
    return `Mình làm được nhiều hơn mình nghĩ đó 💚 Với buồn sau sinh (baby blues), hay cả khi nghi trầm cảm sau sinh, những điều này giúp được:\n${helpList}\n• Theo dõi xem tình trạng có kéo dài quá 2 tuần hay nặng dần không — nếu có thì ${wife ? "cùng vợ đi khám" : "nên đi khám"}\n\n${wife ? "Vợ có chịu nói chuyện với bạn về cảm giác của vợ không?" : "Bên cạnh bạn có ai phụ chăm bé không?"}`;
  if (!PP_MOOD.test(n)) return null;
  const visit = wife ? "đưa vợ đi khám" : "đi khám";
  if (said(c.last, "baby blues") || asks)
    return `Lomi không chẩn đoán được đâu, nhưng ${long ? `đã hơn 2 tuần sau sinh mà vẫn ${wife ? "hay khóc, hay cáu" : "thấy như vậy"}` : "nếu tình trạng này kéo dài hơn 2 tuần"} thì **đáng ${visit}** để bác sĩ đánh giá trầm cảm sau sinh (bác sĩ thường hỏi theo một bảng câu hỏi ngắn, vd thang EPDS). ${said(c.last, "baby blues") ? "" : "Sau sinh, buồn, hay khóc, dễ cáu trong khoảng 2 tuần đầu (buồn sau sinh — baby blues) khá thường gặp và thường tự dịu; còn kéo dài hay nặng dần thì có thể là trầm cảm sau sinh. "}Trầm cảm sau sinh khá thường gặp và **điều trị được** — phát hiện sớm thì cả mẹ lẫn bé đều đỡ hơn nhiều.\n\nCó thể đặt lịch ở khoa Sản nơi sinh, hoặc gặp bác sĩ tâm thần / tâm lý.${wife ? " Trước khi đi, nhẹ nhàng nói với vợ là bạn lo cho vợ, chứ không phải chê vợ yếu đuối nha." : ""}\n\n🚨 Nếu có lúc nghĩ tới chuyện làm hại bản thân hay em bé → đi cấp cứu ngay hoặc gọi **115**.`;
  return `Sau sinh, nhiều người mẹ bị **buồn sau sinh (baby blues)**: hay khóc, dễ cáu, nhạy cảm, lo lắng trong khoảng **2 tuần đầu** — do nội tiết thay đổi mạnh cộng với thiếu ngủ, và thường tự dịu dần.\n\nNếu ${long ? `đã quá 2 tuần (${wife ? "vợ sinh" : "bạn sinh"} được ${wk![1]} ${wk![2]} rồi) mà vẫn vậy` : "kéo dài quá 2 tuần"}, hoặc nặng dần — buồn gần như cả ngày, mất hứng thú, không ngủ được kể cả khi con ngủ, thấy mình vô dụng, khó gắn bó với con — thì có thể là **trầm cảm sau sinh**. Chuyện này khá thường gặp và **điều trị được**, nên ${long ? `mình nên ${visit} sớm` : `khi đó nên ${visit}`} (khoa Sản hoặc bác sĩ tâm thần / tâm lý).\n\n${wife ? "Chồng giúp được nhiều lắm" : "Vài điều giúp được"}:\n${helpList}\n\n🚨 Nếu ${wife ? "vợ nói muốn chết, muốn làm hại bản thân hoặc em bé, hay có biểu hiện lạ (nghe thấy, nhìn thấy điều không có, nói năng lộn xộn)" : "có lúc nghĩ tới chuyện làm hại bản thân hoặc em bé, hay nghe thấy, nhìn thấy điều không có"} → đi cấp cứu ngay hoặc gọi **115**.`;
}

// Tự ngưng thuốc vì "thấy đỡ rồi" — sau khi Lomi vừa dặn đừng tự ngưng
function medStopFollow(q: string, c: V8Ctx): string | null {
  if (!said(c.last, "đừng tự ngưng")) return null;
  const n = N(q);
  if (!VN(/\b(thấy )?(đỡ|ổn|khoẻ|khỏe|hết bệnh|bình thường) (rồi|hơn|nhiều)\b|\b(hết|khỏi) rồi\b/).test(n)) return null;
  const mood = anyIn(VN(/\b(trầm cảm|lo âu|rối loạn|tâm thần|an thần|chống trầm cảm|mất ngủ)\b/), c.hist.slice(-4));
  return `Thấy đỡ thường là dấu hiệu **thuốc đang có tác dụng**, chứ chưa chắc là đã khỏi hẳn đâu nha 💚${mood ? "\n\nVới thuốc điều trị trầm cảm, bác sĩ thường cho uống tiếp **thêm vài tháng sau khi đã thấy đỡ** để bệnh không quay lại, và khi ngưng thì **giảm liều từ từ** theo hướng dẫn — ngưng đột ngột có thể gây chóng mặt, bứt rứt, mất ngủ, hoặc làm buồn chán quay lại." : "\n\nNhiều loại thuốc cần uống đủ liệu trình, hoặc phải giảm liều từ từ mới ngưng được — ngưng đột ngột có thể làm bệnh quay lại."}\n\nCách an toàn nhất: hẹn tái khám và nói thẳng với bác sĩ là bạn muốn ngưng thuốc — bác sĩ sẽ xem đã tới lúc chưa và chỉ cách giảm an toàn. Muốn ngưng thì hoàn toàn có thể bàn, chỉ là đừng tự ngưng một mình nha.`;
}

// Dị ứng thức ăn — đã kể bị dị ứng + lỡ ăn, giờ sưng môi / khó thở / ngứa khắp người
const ALLERGY = VN(/\bdị ứng\b/);
const ANAPH = VN(/\b(khó thở|thở khò khè|khò khè|ngứa họng|nghẹn họng|tức ngực|choáng|ngất|sưng (môi|lưỡi|họng|mặt)|(môi|lưỡi|họng|mặt)( \S+){0,2} (sưng|phù|tê)|nói khó|khàn tiếng)\b/);
function allergyEarly(q: string, c: V8Ctx): string | null {
  if (!anyIn(ALLERGY, c.hist.slice(-5)) && !ALLERGY.test(N(q))) return null;
  const n = N(q);
  if (ANAPH.test(n))
    return "🚨 Đang dị ứng mà **sưng môi – lưỡi – mặt, khó thở, ngứa / nghẹn họng** là dấu hiệu có thể **sốc phản vệ** — gọi **115** ngay hoặc nhờ người chở tới **cấp cứu gần nhất ngay bây giờ**, nói rõ là nghi phản vệ. Có bút tiêm adrenaline thì dùng ngay theo hướng dẫn.\n\nPhản vệ có thể nặng lên rất nhanh dù lúc đầu chỉ hơi sưng, nên đừng chờ xem có đỡ không nha. Trong lúc chờ: ngồi dậy nếu khó thở (nằm, kê cao chân nếu chóng mặt), đừng ở một mình, đừng ăn uống thêm gì.";
  const ate = anyIn(VN(/\b(lỡ|vừa|mới|đã) (ăn|uống|dùng)\b/), c.hist.slice(-3));
  if (ate && VN(/\b(ngứa|nổi mẩn|mề đay|nổi mề đay|phát ban|nổi đỏ)( \S+){0,2} (khắp người|toàn thân|cả người|lan)\b|\b(khắp người|toàn thân|cả người) (ngứa|nổi mẩn|nổi đỏ)\b/).test(n))
    return "Ngứa, nổi mẩn **lan khắp người** sau khi ăn món dị ứng là phản ứng đã lan toàn thân — nên tới **cơ sở y tế gần nhất ngay bây giờ** để được theo dõi, đừng ở nhà một mình nha (phản ứng có thể nặng lên trong vài giờ đầu).\n\n🚨 Gọi **115** ngay nếu thấy: sưng môi – lưỡi – mặt, khó thở, khò khè, nghẹn họng, chóng mặt, ngất, nôn nhiều.";
  return null;
}

// ═══════════════ Tiền bạc ═══════════════
const SELF = "(a|anh|em|e|mình|tôi|tui|tao|t|tớ|chị|c)";
const TR = "(\\d+(?:[.,]\\d+)?)\\s*(triệu|tr|củ|tỷ|tỉ)";
const mil = (v: string, u: string) => Number(v.replace(",", ".")) * (/^t[ỷỉ]/u.test(u) ? 1000 : 1);
const fmtM = (x: number) => (x >= 1000 ? `${(x / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ` : `${Math.round(x * 10) / 10} triệu`.replace(".", ","));
function debtOf(hs: string[]): number | null {
  for (const h of [...hs].reverse()) {
    const t = h.normalize("NFC").toLowerCase();
    const m = t.match(new RegExp(`(?:^|\\s)${SELF}?\\s*(?:đang |bị )?(?:nợ|mắc nợ|thiếu nợ|nợ nần)(?: \\S+){0,3}? ${TR}`, "u"));
    if (m && !/(bạn|nó|người ta|họ|khách|ông ấy|bà ấy)\s+(?:\S+\s+){0,2}(nợ|mượn|thiếu)/u.test(t)) return mil(m[2], m[3]);
  }
  return null;
}
function debtReply(q: string, c: V8Ctx): V8Reply | null {
  const t = q.normalize("NFC").toLowerCase();
  const n = N(q);
  const dNow = debtOf([q]);
  const d = dNow ?? debtOf(c.hist.slice(-5));
  if (d == null) return null;
  if (dNow != null && !VN(/\b(lương|thu nhập|kiếm được)\b/).test(n))
    return { heart: "money", text: `Khoản nợ ${fmtM(d)} đè trên vai thì nặng lòng lắm 😔 Mình gỡ từng bước nha, có kế hoạch rõ là nhẹ đi nhiều.\n\nBạn kể Lomi nghe thêm: nợ ai (ngân hàng, app vay, thẻ tín dụng, người quen), **lãi bao nhiêu**, và mỗi tháng bạn kiếm được khoảng bao nhiêu?` };
  const sal = t.match(new RegExp(`(?:lương|thu nhập|kiếm được|làm được)(?: \\S+){0,2}? ${TR}`, "u"));
  if (sal) {
    const s = mil(sal[1], sal[2]);
    const m30 = Math.ceil(d / (s * 0.3)), m50 = Math.ceil(d / (s * 0.5));
    const yrs = (m: number) => (m >= 12 ? ` (khoảng ${(m / 12).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} năm)` : "");
    return { heart: "money", text: `Mình tính thử cho dễ hình dung nha 📝 Nợ ${fmtM(d)}, thu nhập ${fmtM(s)}/tháng:\n• Dành **30%** (${fmtM(s * 0.3)}/tháng) trả nợ → khoảng **${m30} tháng**${yrs(m30)}\n• Dành **50%** (${fmtM(s * 0.5)}/tháng) → khoảng **${m50} tháng**${yrs(m50)}\n\nĐó là **chưa tính lãi** — lãi càng cao thì càng lâu, nên khoản nào lãi cao (app vay, vay nóng, thẻ tín dụng) phải ưu tiên trả trước. Khoản nợ này lãi khoảng bao nhiêu vậy bạn?` };
  }
  if (VN(/\b(bế tắc|cùng đường|hết đường|không lối thoát|muốn buông|tuyệt vọng|không chịu nổi)\b/).test(n))
    return { heart: "money", text: "Nợ nần kéo dài làm rất nhiều người thấy bế tắc như vậy — không phải bạn yếu đuối đâu 🫂 Nhưng nợ là chuyện **có đường gỡ**: liệt kê từng khoản, trả khoản lãi cao trước, nói chuyện với chủ nợ để giãn ra, tìm thêm thu nhập. Nhiều người đã đi qua được từng bước một.\n\nLomi hỏi thật một câu nha, vì Lomi quan tâm: những lúc bế tắc nhất, có khi nào bạn nghĩ tới chuyện không muốn sống nữa?" };
  if (VN(/\b(không biết trả|trả (sao|thế nào|như thế nào|kiểu gì)|làm sao (để )?trả|cách trả|trả nợ)\b/).test(n))
    return { heart: "money", text: "Mình làm theo mấy bước này nha:\n1. **Liệt kê tất cả khoản nợ**: nợ ai, còn bao nhiêu, lãi bao nhiêu, mỗi tháng phải trả bao nhiêu\n2. **Trả khoản lãi cao nhất trước** (app vay, vay nóng, thẻ tín dụng), các khoản khác trả mức tối thiểu\n3. **Không vay chỗ mới để đắp chỗ cũ** — nhất là vay nóng, lãi chồng lãi rất nhanh\n4. **Chủ động nói với chủ nợ / ngân hàng** xin giãn thời hạn hoặc chia nhỏ — nói trước khi trễ hạn thường dễ được đồng ý hơn\n5. Lập ngân sách tháng: cắt tạm các khoản chưa cần, dành cố định một phần lương trả nợ ngay khi nhận lương\n6. Tìm thêm một nguồn thu nhỏ — chỉ 2–3 triệu/tháng cũng rút ngắn thời gian trả đáng kể\n\nNếu có khoản vay từ app hay người cho vay mà bị đe doạ, khủng bố tin nhắn, bạn có thể trình báo công an. Khoản nào đang làm bạn lo nhất?" };
  return null;
}

// Mở quán: đang tính mở (chưa phải khai trương), mặt bằng ở đâu, bán bao nhiêu mới hoà vốn
const SHOPW = "(quán|tiệm|cửa hàng|shop|xe bán|quầy)";
const PLAN_OPEN = new RegExp(`\\b(muốn|định|tính|dự định|có ý định|đang tính|ấp ủ|mơ|ước|tìm hiểu|tìm hiểu cách|học cách) (mở|làm|kinh doanh)( một| 1| cái)? ${SHOPW}`, "u");
function shopPlan(q: string, c: V8Ctx): V8Reply | null {
  const t = q.normalize("NFC").toLowerCase();
  const n = N(q);
  const hist = c.hist.slice(-6).map((h) => h.normalize("NFC").toLowerCase());
  const kindOf = () => {
    for (const h of [t, ...hist.slice().reverse()]) {
      const k = detectBizKind(h);
      if (k.type || k.noun) return k;
    }
    return {};
  };
  const biz: BizCtx = { ...kindOf(), topic: "opening" };
  const out = (text: string): V8Reply => ({ text, biz });
  const prac = PLAN_OPEN.test(t) || hist.some((h) => PLAN_OPEN.test(h)) ? bizPractical(q, biz) : null;
  if (prac) return out(prac);
  if (PLAN_OPEN.test(t) && !/(khai trương|sắp mở|tuần (sau|tới)|tháng (sau|tới)|ngày mai)/u.test(t) && !/(cần|chuẩn bị) (gì|những gì|bao nhiêu)/u.test(t)) {
    const sh = t.match(new RegExp(`(?:mở|làm|kinh doanh)(?: một| 1| cái)? ((?:${SHOPW.slice(1, -1)})(?: [^,.!?]{1,20}?)?)(?= ở | tại |[,.!?]|$)`, "u"))?.[1]?.trim();
    return out(`Tính chuyện mở ${sh ?? "quán"} thì vui rồi nè ✨ Trước khi xuống tiền, mình trả lời trước mấy câu này thì đỡ rủi ro nhiều:\n• **Khách chính là ai?** Khách du lịch, người địa phương, sinh viên hay dân văn phòng — mỗi nhóm hợp một kiểu vị trí, giá và giờ mở cửa khác nhau\n• **Mình khác chỗ khác ở điểm nào?** Món riêng, không gian, giá, hay sự tiện lợi\n• **Vốn bao nhiêu**, và giữ lại được bao nhiêu làm quỹ dự phòng (nên đủ chi phí vận hành 3–6 tháng)\n• Mình đã từng làm hoặc học qua nghề này chưa — nếu chưa, đi làm thử ở một quán vài tuần là cách học rẻ nhất\n\nBạn có vốn khoảng bao nhiêu, và đang nghĩ tới khu vực nào?`);
  }
  // Vừa hỏi "đang nghĩ tới khu vực nào" → câu trả lời là nơi định mở.
  if (said(c.last, "đang nghĩ tới khu vực nào") && VN(/^ (ở |tại |khu |chắc )?(đà lạt|trung tâm|gần chợ|gần trường|ngoại ô|quận|phường|đường)/).test(n) && t.split(/\s+/).length <= 8)
    return out(VN(/\bđà lạt\b/).test(n)
      ? "Mở ở Đà Lạt thì có mấy điểm riêng nên tính trước nè 📍\n• **Khách theo mùa**: dịp lễ, Tết, hè đông khách du lịch; mùa mưa, ngày thường vắng hơn nhiều — tính doanh thu theo **mùa vắng** cho an toàn, mùa đông khách là phần lời thêm\n• **Hai nhóm khách khác nhau**: khách du lịch thích view, góc chụp ảnh, món đặc trưng; người địa phương và sinh viên cần giá dễ chịu, chỗ quen, ghé đều — chọn nhóm chính để quyết vị trí và giá\n• **Thời tiết lạnh, hay mưa**: không gian kín gió, ấm áp, có mái che, chỗ để xe không bị mưa ướt\n\nVốn của bạn khoảng bao nhiêu? Lomi giúp chia các khoản cho dễ tính."
      : "Ghi nhận khu vực rồi nè 📍 Trước khi chốt mặt bằng, bạn ra đứng xem ở đó vài buổi (sáng, trưa, tối; ngày thường và cuối tuần), đếm người qua lại và xem các quán xung quanh đông không. Vốn của bạn khoảng bao nhiêu? Lomi giúp chia các khoản cho dễ tính.");
  const shopCtx = hist.some((h) => new RegExp(SHOPW, "u").test(h) && /(mở|kinh doanh|vốn)/u.test(h)) || new RegExp(SHOPW, "u").test(t);
  if (!shopCtx) return null;
  if (VN(/\b(mặt bằng|thuê chỗ|vị trí|địa điểm|chỗ nào)( \S+){0,3} (ở đâu|chỗ nào|khu nào|đường nào|nào|sao)|\bnên (thuê|mở|đặt) (mặt bằng |quán |tiệm )?(ở đâu|chỗ nào|khu nào)\b/).test(n))
    return out("Lomi không chỉ được con đường cụ thể (giá thuê, lượng khách từng khu thay đổi liên tục), nhưng chọn mặt bằng thì xét mấy điều này nha 📍\n• **Đúng chỗ khách chính hay đi qua**: gần trường, khu dân cư, văn phòng — hay đường du khách hay đi, có view, dễ check-in\n• **Ra đứng xem thật**: ngồi ở đó vào giờ sáng, trưa, tối cả ngày thường lẫn cuối tuần, đếm người đi qua và xem các quán quanh đó đông không\n• **Dễ thấy, dễ dừng**: mặt tiền rộng, có chỗ để xe, không nằm khuất dốc hay khúc cua (ở Đà Lạt đường dốc nhiều, khách ngại dừng)\n• **Tiền thuê nên vừa sức**: nhiều người giữ tiền thuê ở mức doanh thu ước tính trong vài ngày đầu tháng là trả được\n• Đọc kỹ hợp đồng: thời hạn thuê đủ dài (vì sửa sang tốn tiền), điều khoản tăng giá, tiền cọc\n\nBạn đang phân vân giữa mấy chỗ nào, hay chưa có chỗ nào cả?");
  if (VN(/\b(hoà vốn|hòa vốn|huề vốn|bao nhiêu (ly|cốc|phần|suất|đơn|khách)( \S+){0,3} (mới )?(đủ|lời|có lời|có lãi)|bán bao nhiêu (mới|thì) (đủ|lời|có lời|có lãi))\b/).test(n)) {
    const all = [...hist, t].join(" \n ");
    const rent = all.match(new RegExp(`(?:mặt bằng|tiền thuê|thuê)[^\\n]{0,25}?${TR}`, "u"));
    const r = rent ? mil(rent[1], rent[2]) : null;
    const fixed = r != null ? r + 12 + 4 : 30;
    const cups = Math.ceil((fixed * 1_000_000) / 20_000);
    return out(`Cách tính hoà vốn nè 🧮\n\n**Số ly cần bán mỗi tháng = Chi phí cố định mỗi tháng ÷ Tiền lời gộp mỗi ly**\n• Chi phí cố định: tiền thuê, lương nhân viên, điện nước, internet, khấu hao máy móc…\n• Lời gộp mỗi ly = giá bán − giá vốn nguyên liệu (cà phê, sữa, đường, ly, ống hút…)\n\nVí dụ (số giả định để minh hoạ thôi nha): giá bán 30.000đ, giá vốn 10.000đ → lời gộp 20.000đ/ly; chi phí cố định ${r != null ? `${fmtM(r)} tiền thuê + 12 triệu lương + 4 triệu điện nước = **${fmtM(fixed)}**` : "khoảng **30 triệu**/tháng"} → cần **${cups.toLocaleString("vi-VN")} ly/tháng**, tức khoảng **${Math.ceil(cups / 30)} ly/ngày** mới hoà vốn${PLAN_OPEN.test(all) || /vốn/u.test(all) ? " — đó là chưa tính thu hồi số vốn bỏ ra ban đầu" : ""}.\n\nBạn cho Lomi giá bán dự kiến, giá vốn mỗi ly và tiền thuê mặt bằng thì Lomi tính sát cho quán của bạn nha.`);
  }
  return null;
}

// ═══════════════ Sức khoẻ trong gia đình ═══════════════
const ELDER = VN(/\b(mẹ|ba|bố|ông|bà|ông nội|bà nội|ông ngoại|bà ngoại|cha|má|người già|người lớn tuổi)( \S+){0,3}\b/);
const FORGET = VN(/\b(hay quên|quên trước quên sau|lú lẫn|bị lẫn|lẫn rồi|hay lẫn|quên đường|đi lạc|quên tên|nói lặp|hỏi lại nhiều lần|sa sút trí nhớ|giảm trí nhớ|lẩm cẩm)\b/);
function elderMemory(q: string, c: V8Ctx): V8Reply | null {
  const n = N(q);
  const now = ELDER.test(n) && FORGET.test(n);
  const ctx = now || c.hist.slice(-4).some((h) => ELDER.test(N(h)) && FORGET.test(N(h)));
  if (!ctx) return null;
  const whoM = [q, ...c.hist.slice(-4).reverse()].map((h) => h.normalize("NFC").toLowerCase().match(/(?:^|\s)(mẹ|má|ba|bố|cha|ông nội|bà nội|ông ngoại|bà ngoại|ông|bà)(?=\s|$|[,.!?])/u)?.[1]).find(Boolean) ?? "mẹ";
  const W = (x: string) => x.replace(/mẹ/gu, whoM).replace(/Mẹ/gu, whoM.charAt(0).toUpperCase() + whoM.slice(1));
  if (VN(/\b(đột ngột|tự nhiên lú|nói khó|méo miệng|yếu tay|yếu chân|tê nửa người|lơ mơ)\b/).test(n))
    return { text: W("🚨 Lú lẫn **xuất hiện đột ngột** (trong vài giờ, vài ngày), hoặc kèm nói khó, méo miệng, yếu tê tay chân, lơ mơ thì có thể là **đột quỵ** hay một bệnh cấp — gọi **115** hoặc đưa đi cấp cứu ngay nha.") };
  if (VN(/\b(khám ở đâu|khám đâu|đi khám (ở )?đâu|khoa nào|bệnh viện nào|chỗ nào khám|bác sĩ nào|khám gì)\b/).test(n))
    return { text: W("Hay quên ở người lớn tuổi thì nên khám **khoa Nội thần kinh** (có nơi có **phòng khám trí nhớ** hoặc **khoa Lão khoa**) ở bệnh viện đa khoa — ở Đà Lạt có thể tới **Bệnh viện Đa khoa tỉnh Lâm Đồng**; cần chuyên sâu hơn thì bác sĩ sẽ giới thiệu lên tuyến trên.\n\nTrước khi đi, chuẩn bị giúp mẹ:\n• Ghi lại **những lần quên** (quên gì, lúc nào, bắt đầu từ bao giờ, có nặng dần không)\n• Mang theo **tất cả thuốc** mẹ đang uống và sổ khám cũ\n• Người nhà đi cùng để kể thêm — người bị quên thường không tự nhận ra hết\n\nBác sĩ thường làm vài bài kiểm tra trí nhớ ngắn và xét nghiệm (máu, có khi chụp não) để tìm nguyên nhân — có nguyên nhân điều trị được.") };
  if (VN(/\b(quên đường|đi lạc|không nhớ đường|không biết đường về)\b/).test(n))
    return { text: W("Quên đường về là dấu hiệu **nên đưa mẹ đi khám sớm** nha, không nên chờ thêm 🙏 Trong lúc chờ khám, giữ an toàn cho mẹ:\n• Để trong túi mẹ một **thẻ ghi tên, địa chỉ và số điện thoại** người nhà (hoặc vòng tay có số điện thoại)\n• Hạn chế để mẹ đi xa một mình; nếu mẹ có điện thoại, bật chia sẻ vị trí\n• Để ý thêm: có quên tắt bếp, quên uống thuốc, lặp lại câu hỏi nhiều lần không\n\nGiờ mẹ về nhà an toàn rồi chứ bạn?") };
  if (VN(/\b(lo|sợ)( \S+){0,3} (lẫn|lú|quên|alzheimer|sa sút|đãng trí)\b/).test(n)) {
    const lost = anyIn(VN(/\b(quên đường|đi lạc|không nhớ đường|không biết đường về)\b/), c.hist.slice(-4));
    return { text: W(`Lo cho mẹ vậy là thương mẹ lắm 🥺 Lomi không nói chắc được mẹ bị gì — quên nhiều hơn trước ở người lớn tuổi có thể do nguyên nhân **chữa được** (thiếu ngủ, trầm cảm, thiếu vitamin B12, tuyến giáp, tác dụng phụ thuốc), cũng có thể là sa sút trí tuệ. ${lost ? "Nhưng quên tới mức quên đường về là đủ lý do để **đi khám sớm**." : "Đi khám sớm là cách biết chắc nhất."} Tìm ra sớm thì nguyên nhân chữa được sẽ chữa kịp, còn nếu là sa sút trí tuệ thì cũng có thuốc và cách chăm giúp chậm lại, giữ mẹ an toàn hơn.\n\nBạn muốn Lomi chỉ nên khám ở đâu và chuẩn bị gì không?`) };
  }
  if (!now && VN(/\b(lẫn|lú|lú lẫn|quên|nói lặp|hỏi đi hỏi lại|nhầm ngày|nhầm người|không nhận ra)\b/).test(n) && !VN(/\b(không|chẳng|hết|đỡ) (còn )?(lẫn|lú|quên)\b/).test(n))
    return { text: W("Vừa hay quên vừa lẫn lộn như vậy thì càng nên đưa mẹ **đi khám sớm** nha 🙏 Từ giờ tới lúc đi khám, bạn ghi lại giúp: những lần quên / lẫn (quên gì, lúc nào), có nặng dần không, mẹ có buồn chán, ngủ kém hay đổi thuốc gì gần đây không — mấy điều này giúp bác sĩ tìm nguyên nhân nhanh hơn. Nên khám **khoa Nội thần kinh** ở bệnh viện đa khoa.\n\n🚨 Nếu mẹ lú lẫn đột ngột, kèm nói khó, méo miệng hay yếu tay chân → gọi **115** ngay.") };
  if (now && !said(c.last, "sa sút trí tuệ"))
    return { text: W("Người lớn tuổi quên nhiều hơn trước thì có nhiều nguyên nhân lắm — thiếu ngủ, buồn chán / trầm cảm, thiếu vitamin B12, bệnh tuyến giáp, tác dụng phụ của thuốc… (mấy nguyên nhân này **chữa được**), và cũng có thể là dấu hiệu sớm của **sa sút trí tuệ**. Quên lặt vặt rồi nhớ lại thì thường không đáng lo; còn quên **nặng dần**, quên chuyện vừa xảy ra, quên đường, lẫn ngày tháng thì nên đi khám.\n\nMẹ hay quên kiểu gì vậy bạn — quên chuyện mới xảy ra, hay quên cả những việc quen thuộc?") };
  return null;
}

// Con tuổi teen thu mình
const TEEN = VN(/\b(con|đứa nhỏ|thằng nhỏ|con bé|con trai|con gái)( \S+){0,2} (1[0-9] tuổi|tuổi teen|tuổi dậy thì|tuổi mới lớn|lớp ([6-9]|1[0-2])|cấp 2|cấp 3|cấp hai|cấp ba)\b/);
const WITHDRAW = VN(/\b(ở (lì )?(trong )?phòng|nhốt mình|đóng cửa phòng|không nói chuyện|ít nói|không thèm nói|không chịu nói|lầm lì|cáu gắt|hay cáu|điểm (học )?tụt|học sa sút|chơi game suốt|ôm điện thoại|không muốn đi học|bỏ học|thức khuya)\b/);
function teenReply(q: string, c: V8Ctx): V8Reply | null {
  const n = N(q);
  const now = TEEN.test(n) && WITHDRAW.test(n);
  const ctx = now || anyIn(TEEN, c.hist.slice(-4));
  if (!ctx) return null;
  const H = "parenting";
  if (VN(/\b(nói (chuyện )?(với )?(con|nó) (sao|thế nào|như thế nào)|làm sao (để )?(con|nó) (chịu )?(nói|mở lòng|kể)|nên làm gì|nên làm sao|phải làm sao)\b/).test(n))
    return { heart: H, text: "Vài cách giúp con tuổi này chịu mở lòng hơn nè 💚\n• **Chọn lúc thư thả, đi cạnh nhau** thay vì ngồi đối diện tra hỏi — lúc chở con đi đâu, cùng ăn món con thích, đi bộ\n• Mở đầu bằng **quan tâm, không phải điểm số**: “Dạo này ba thấy con hay mệt, ba lo cho con. Có chuyện gì làm con buồn không?”\n• **Nghe nhiều hơn khuyên**, đừng vội ngắt lời hay sửa ngay; con nói ít cũng cảm ơn con đã kể\n• Tôn trọng chút riêng tư của con, nhưng giữ vài nếp chung (ăn cơm cùng nhau, giờ cất điện thoại)\n• Hỏi khéo thầy cô chủ nhiệm hoặc bạn thân của con xem ở trường có chuyện gì không\n\nNếu con không chịu nói chuyện với ba mẹ, gặp chuyên gia tâm lý học đường hay bác sĩ tâm lý cũng là cách hay — đôi khi con dễ nói với người ngoài hơn." };
  if (VN(/\b(lo|sợ)( \S+){0,3} (con|nó)( \S+){0,2} (bị gì|bị sao|trầm cảm|có chuyện|có vấn đề)|\bcon (bị gì|có sao) không\b|\b(có phải|liệu) (con|nó) (bị )?trầm cảm\b/).test(n))
    return { heart: H, text: "Lo cho con là đúng, và ba mẹ để ý sớm như vậy là tốt lắm 🙏 Tuổi này con muốn riêng tư hơn là bình thường, nhưng **cùng lúc thu mình, ít nói và điểm tụt** thì đáng để tìm hiểu kỹ. Có thể là áp lực học, chuyện bạn bè, bị bắt nạt, chuyện tình cảm, nghiện game / mạng — hoặc con đang buồn chán kéo dài.\n\nDấu hiệu nên đưa con đi gặp bác sĩ tâm lý / tâm thần nhi sớm:\n• Buồn hoặc cáu gắt gần như mỗi ngày, kéo dài **trên 2 tuần**\n• Mất hứng thú với những thứ con từng thích, bỏ bạn bè\n• Ăn, ngủ thay đổi nhiều; hay mệt, hay kêu đau đầu đau bụng\n• Hay nói chê bai bản thân, thấy mình vô dụng\n\n🚨 Nếu con nói muốn chết, tự làm đau mình, hoặc ba mẹ thấy vết thương lạ trên người con → đưa con đi khám ngay, và đừng để con ở một mình lúc đó.\n\nBạn muốn Lomi gợi ý cách mở lời với con không?" };
  if (now)
    return { heart: H, text: "Con tuổi mới lớn hay thu vào phòng một phần là bình thường — tuổi này con cần riêng tư hơn và hay ngại nói chuyện với ba mẹ 😅 Nhưng nếu đi kèm **không nói chuyện, điểm tụt, cáu gắt** hay thay đổi rõ so với trước thì ba mẹ nên để ý kỹ hơn.\n\nTình trạng này bắt đầu từ bao giờ vậy bạn, và con có còn chơi với bạn bè không?" };
  if (WITHDRAW.test(n) && said(c.last, "Thêm cả chuyện này"))
    return { heart: H, text: "Điểm tụt đi cùng với thu mình, ít nói thì thường là hệ quả của một chuyện khác chứ ít khi là “lười” thôi 😔 Lúc này ba mẹ khoan la về điểm số — la lúc con đang có chuyện dễ làm con đóng cửa thêm. Hỏi chuyện con trước đã, điểm số tính sau.\n\nBạn muốn Lomi gợi ý cách mở lời với con không?" };
  if (WITHDRAW.test(n))
    return { heart: H, text: "Thêm cả chuyện này nữa thì ba mẹ lo là phải 😔 Khi con thay đổi ở nhiều mặt cùng lúc (ở lì trong phòng, ít nói, học sa sút), thường là có một chuyện gì đó con đang mang một mình — ở trường, với bạn bè, hay trong lòng con. Con có từng kể gì về trường lớp, bạn bè dạo gần đây không?" };
  return null;
}

// Chăm người bệnh — người chăm kiệt sức
const CARE = VN(/\b(nuôi bệnh|chăm người bệnh|nằm một chỗ|bị liệt|tai biến|đột quỵ|nằm viện|ung thư|chạy thận|lọc máu|sa sút trí tuệ|bệnh nặng|bệnh lâu năm)\b/);
const BURN = VN(/\b(kiệt sức|đuối|quá tải|mệt mỏi quá|mệt lắm|mệt quá|hết sức|không dám than|không dám kêu|không dám nói|chịu hết nổi|không chịu nổi|stress|căng thẳng|cáu gắt|muốn bỏ chạy)\b/);
function caregiverReply(q: string, c: V8Ctx): V8Reply | null {
  if (!c.hist.slice(-4).some((h) => CARE.test(N(h)))) return null;
  const n = N(q);
  if (!BURN.test(n)) return null;
  if (said(c.last, "kiệt sức là chuyện bình thường"))
    return { heart: "caregiver", text: "Không dám than vì sợ người nhà nghĩ mình ngại chăm, hay sợ làm mọi người thêm buồn — Lomi hiểu lắm 💚 Nhưng nói ra không phải là than vãn, mà là để **cả nhà chăm được lâu dài**. Bạn thử nói với một người trong nhà mà bạn tin nhất, kiểu:\n“Con vẫn thương ông và vẫn muốn chăm, nhưng dạo này con đuối quá. Mình chia lại lịch được không, để con có một ngày nghỉ hẳn?”\n\nNgười nhà nghe được thường sẽ đỡ cho bạn, vì ai cũng đang mệt như nhau. Trong nhà ai là người dễ nói chuyện nhất với bạn?" };
  return { heart: "caregiver", text: "Chăm người bệnh lâu ngày là việc nặng cả sức lẫn lòng — **kiệt sức là chuyện bình thường**, không có nghĩa là bạn thương ít hay chăm kém 🫂\n\nVài điều giúp người chăm đỡ quá tải:\n• **Chia ca rõ ràng**, mỗi người có ngày nghỉ hẳn, không “trực” lơ lửng cả tuần\n• Hỏi điều dưỡng / bác sĩ cách xoay trở người bệnh, chống loét, nâng đỡ đúng tư thế — làm đúng cách đỡ tốn sức và đỡ đau lưng\n• Nếu kinh tế cho phép, thuê người chăm vài buổi mỗi tuần để cả nhà được nghỉ\n• Giữ cho mình ăn, ngủ, một chút thời gian riêng mỗi ngày — người chăm khoẻ thì người bệnh mới được chăm lâu\n\nNếu bạn thấy buồn kéo dài, mất ngủ, hay cáu, hay khóc, thì nên tìm người nói chuyện, kể cả chuyên gia tâm lý. Bạn đã chăm như vậy bao lâu rồi?" };
}

// Mới chuyển tới, chưa quen ai, cuối tuần chán
const MOVED = VN(/\b(mới (chuyển|lên|tới|đến|về|dọn)|vừa (chuyển|lên|tới|đến|dọn)|chuyển (lên|tới|đến|về) (đây|đà lạt|thành phố))\b/);
function newcomer(q: string, c: V8Ctx): V8Reply | null {
  const n = N(q);
  if (!anyIn(MOVED, c.hist.slice(-4)) && !MOVED.test(n)) return null;
  if (VN(/\b(chưa quen|không quen|chưa có bạn|không có bạn|không biết ai|một mình)\b/).test(n))
    return { heart: "lonely", text: "Ở một nơi mới mà chưa quen ai thì hay thấy lạc lõng lắm, ai chuyển chỗ ở cũng từng trải qua 🫂 Vài cách quen người mới mà không gượng:\n• Trong app: **Cộng đồng** (/cong-dong) có phòng chat theo khu vực và chủ đề; **Quẹt** (/quet) để tìm người đi cà phê, chơi game, làm quen\n• Tham gia một hoạt động đều đặn: lớp học ngắn, câu lạc bộ chạy bộ, leo núi, nhóm tình nguyện — gặp lại nhau vài lần là dễ thân\n• Ghé một quán quen thường xuyên, chào hỏi hàng xóm, đồng nghiệp — mấy câu nhỏ vậy dần thành quen\n\nBạn thích gặp gỡ kiểu nào hơn — đi chơi ngoài trời hay ngồi cà phê nói chuyện?" };
  if (VN(/\b(cuối tuần|ngày nghỉ|rảnh)( \S+){0,2} (chán|buồn|không biết làm gì|trống)\b/).test(n))
    return { heart: "lonely", text: "Cuối tuần ở chỗ mới mà chưa có ai rủ thì dài ghê ha 😔 Thử biến cuối tuần thành dịp **khám phá chỗ mới** nè: mỗi tuần chọn một chỗ chưa đi (một quán, một con đường, một chợ, một điểm ngắm cảnh), hoặc rủ một người trong phòng chat khu vực ở Cộng đồng (/cong-dong) đi cùng. Lâu dần mình có chỗ quen, người quen.\n\nBạn muốn Lomi gợi ý vài chỗ đi chơi không?" };
  if (VN(/\b(có gì chơi|đi đâu chơi|chơi gì|chỗ nào chơi|chỗ nào vui|đi đâu (cho )?vui|có gì vui)\b/).test(n))
    return { heart: "lonely", text: "Mới tới Đà Lạt thì có nhiều chỗ dễ đi một mình hoặc dễ quen người lắm nè 🌲\n• Đi bộ quanh **hồ Xuân Hương** buổi sáng sớm, ghé **chợ Đà Lạt** và **chợ đêm** buổi tối\n• Đi chơi xa hơn chút: **đồi chè Cầu Đất**, leo **Langbiang**, các thác quanh thành phố — đi theo nhóm leo núi / phượt dễ quen bạn\n• Cà phê ngắm đồi thông, quán nhạc acoustic buổi tối\n• Trong app, mục **Khám phá** (/kham-pha) có quán và dịch vụ theo khu vực, kèm ưu đãi cho thành viên\n\nBạn thích kiểu chơi ngoài trời hay ngồi quán hơn?" };
  return null;
}

// Giảm cân: chiều cao cân nặng (BMI), nên ăn gì, nhịn ăn tối
function weightV8(q: string, c: V8Ctx): V8Reply | null {
  const n = N(q);
  const t = q.normalize("NFC").toLowerCase();
  const ctx = c.lastHeart === "weight" || anyIn(VN(/\b(giảm cân|giảm béo|giảm mỡ|bớt cân|xuống cân)\b/), c.hist.slice(-4));
  if (!ctx) return null;
  const hm = t.match(/(?:cao\s*)?(1)\s*m\s*(\d{1,2})|cao\s*(1[.,]\d{1,2})\s*m?|cao\s*(1\d{2})\s*(?:cm)?/u);
  const km = t.match(/(?:nặng|cân nặng)\s*(\d{2,3}(?:[.,]\d)?)\s*(?:kg|ký|kí|cân)?/u);
  if (hm && km) {
    const h = hm[1] ? Number(`1.${hm[2].padEnd(2, "0")}`) : hm[3] ? Number(hm[3].replace(",", ".")) : Number(hm[4]) / 100;
    const w = Number(km[1].replace(",", "."));
    const bmi = w / (h * h);
    const b = bmi.toFixed(1).replace(".", ",");
    const lvl = bmi < 18.5 ? "thiếu cân" : bmi < 23 ? "bình thường" : bmi < 25 ? "thừa cân" : bmi < 30 ? "béo phì độ I" : "béo phì độ II";
    if (bmi < 23)
      return { heart: "weight", text: `Với ${Math.round(h * 100)} cm, ${w} kg thì chỉ số BMI khoảng **${b}** — theo ngưỡng thường dùng cho người châu Á là mức **${lvl}** rồi đó. Lúc này mình tập trung ăn uống đủ chất, vận động cho khoẻ và săn chắc sẽ tốt hơn là cố giảm thêm cân nha 💚` };
    const lose = Math.round(w * 0.05), lose2 = Math.round(w * 0.1);
    return { heart: "weight", text: `Mình tính thử nha: cao ${Math.round(h * 100)} cm, nặng ${w} kg → chỉ số BMI khoảng **${b}**, theo ngưỡng thường dùng cho người châu Á là mức **${lvl}**.\n\nTin vui là chỉ cần giảm **5–10% cân nặng** (khoảng ${lose}–${lose2} kg) là sức khoẻ đã tốt lên rõ rồi — huyết áp, đường huyết, mỡ máu, khớp gối đều nhẹ gánh. Giảm từ từ khoảng **0,5–1 kg mỗi tuần** là tốc độ an toàn và dễ giữ lâu dài.\n\nBạn muốn Lomi gợi ý cách ăn hay cách vận động trước?` };
  }
  if (VN(/\b(nhịn ăn tối|bỏ bữa tối|không ăn tối|nhịn tối|nhịn ăn|bỏ bữa)\b/).test(n))
    return { heart: "weight", text: "Không nên **nhịn hẳn** bữa tối nha — nhịn dễ làm mình đói cồn cào, khuya lại ăn vặt nhiều hơn, hoặc bữa sau ăn bù, lâu dài khó giữ. Cách hiệu quả hơn:\n• Ăn tối **sớm hơn** (trước khi ngủ khoảng 2–3 tiếng) và **nhẹ hơn**: nhiều rau, có đạm (cá, thịt nạc, trứng, đậu), bớt cơm\n• Không ăn khuya, không uống nước ngọt, trà sữa buổi tối\n• Quan trọng là **tổng lượng ăn cả ngày** và đều đặn, chứ không phải bỏ một bữa\n\nNếu bạn muốn thử nhịn ăn gián đoạn hay ăn kiêng đặc biệt, nhất là khi có bệnh như tiểu đường, dạ dày, thì nên hỏi bác sĩ hoặc chuyên gia dinh dưỡng trước nha." };
  if (VN(/\b(nên ăn gì|ăn gì|ăn sao|ăn như thế nào|ăn thế nào|thực đơn|ăn uống sao)\b/).test(n))
    return { heart: "weight", text: "Ăn để giảm cân bền thì không cần kiêng khem khổ sở, chủ yếu là **đổi cách ăn** nè 🥗\n• **Mỗi bữa: nửa đĩa rau**, một phần tư là đạm (cá, thịt nạc, trứng, đậu phụ), một phần tư là tinh bột — ưu tiên gạo lứt, khoai, yến mạch\n• **Bớt đồ uống có đường** (nước ngọt, trà sữa, cà phê nhiều sữa đường) — đây hay là nguồn năng lượng thừa lớn nhất mà mình không để ý\n• Bớt đồ chiên, đồ ăn vặt; ăn chậm, ăn đúng bữa, không ăn khuya\n• Uống đủ nước; đói giữa buổi thì ăn trái cây, sữa chua không đường, một nắm hạt\n• Kết hợp vận động: đi bộ nhanh 30 phút mỗi ngày, tăng dần\n\nBạn hay ăn ngoài hay tự nấu? Lomi gợi ý cụ thể hơn được." };
  return null;
}

// Tim đập nhanh / hồi hộp — câu kể tiếp
const PALP = VN(/\b(tim đập nhanh|tim đập mạnh|hồi hộp|đánh trống ngực|tim đập loạn|tim đập thình thịch)\b/);
function palpFollow(q: string, c: V8Ctx): string | null {
  if (!anyIn(PALP, c.hist.slice(-4))) return null;
  const n = N(q);
  if (VN(/\b(đau ngực|tức ngực|khó thở|ngất|xỉu|choáng|vã mồ hôi)\b/).test(n))
    return "🚨 Tim đập nhanh mà kèm **đau / tức ngực, khó thở, choáng, ngất hay vã mồ hôi** thì gọi **115** hoặc đi cấp cứu ngay nha, đừng chờ.";
  if (VN(/\b(cà phê|cafe|cà fê|trà|nước tăng lực|bò húc|redbull|caffeine|cafein)\b/).test(n))
    return "Tim đập nhanh sau khi uống cà phê thì hay gặp lắm — caffeine kích thích tim, nhất là khi uống nhiều, uống lúc đói, hay người vốn nhạy với caffeine ☕\n• Thử **giảm dần** lượng cà phê, trà đặc, nước tăng lực; tránh uống buổi chiều tối và lúc bụng đói\n• Thử **ngưng hẳn 1–2 tuần** xem tim có đỡ đập nhanh không — đó là cách đơn giản để biết có đúng do caffeine không\n• Uống đủ nước, ngủ đủ — thiếu ngủ cũng làm tim dễ đập nhanh hơn\n\nNếu đã bớt caffeine mà vẫn hay bị, thì nên đi khám để kiểm tra nhịp tim nha.";
  if (VN(/\b(không (có )?lý do|tự nhiên|vô cớ|lúc nghỉ|lúc ngồi yên|lúc nằm|ban đêm)\b/).test(n))
    return "Hồi hộp, tim đập nhanh **cả lúc không uống gì, đang nghỉ ngơi** thì có thể do lo âu, căng thẳng, thiếu ngủ — nhưng cũng có thể do **rối loạn nhịp tim**, cường giáp, thiếu máu. Mấy nguyên nhân này cần khám mới phân biệt được, nên bạn nên đi khám **Nội tim mạch**: bác sĩ thường đo điện tim, có khi cho đeo máy theo dõi nhịp tim 24 giờ (Holter), xét nghiệm máu, tuyến giáp.\n\nKhi đang bị, bạn thử bắt mạch xem khoảng bao nhiêu nhịp một phút, nhịp đều hay lúc nhanh lúc chậm, kéo dài bao lâu — ghi lại để kể cho bác sĩ nha.";
  if (VN(/\b(có sao không|có nguy hiểm không|có bị gì không|có sao ko|nguy hiểm không|có nặng không)\b/).test(n))
    return "Tim đập nhanh **chỉ khi uống cà phê** thì thường không nguy hiểm, bớt caffeine là đỡ. Nhưng có lúc **hồi hộp cả khi không có lý do** thì nên đi khám Nội tim mạch để kiểm tra nhịp tim cho chắc — phần lớn trường hợp là lành tính, nhưng cần đo điện tim mới biết được.\n\n🚨 Gọi **115** ngay nếu tim đập nhanh kèm đau ngực, khó thở, choáng hay ngất.";
  return null;
}

// ═══════════════ Đăng bài trên app ═══════════════
const POST_ASK = VN(/\b(đăng|post|rao)( bài)?( \S+){0,2} (bán|bán hàng|rao bán|mua bán|cho thuê|sản phẩm|hàng)( \S+){0,3} (trên|lên|ở|vào) (app|ứng dụng|đây|liên minh)\b|\b(đăng bán|rao bán|đăng bài bán hàng)( \S+){0,2} (ở đâu|thế nào|như thế nào|sao|làm sao)\b/);
const POST_ASK2 = VN(/\b(làm sao|cách|ở đâu|chỗ nào|thế nào)( \S+){0,2} (đăng bài|đăng bán|rao bán|đăng tin)\b/);
const NO_VIEW = VN(/\b(không ai (thấy|xem|nhắn|hỏi|quan tâm|mua|quẹt)|ít người (thấy|xem|nhắn|quan tâm)|chẳng ai (thấy|xem|nhắn|hỏi)|(nhiều|thêm) người (thấy|xem|biết)|tiếp cận|nhiều lượt xem)\b/);
const POST_TIPS = "Vài cách giúp bài đăng được nhiều người thấy hơn nè 📣\n• **Ảnh thật, rõ, sáng** (tối đa 4 ảnh ở Quẹt): ảnh đầu tiên là sản phẩm chính, chụp ban ngày\n• **Tiêu đề và giá rõ ràng**, ghi tình trạng, khu vực — người ta hay lướt nhanh, không có giá thường bị bỏ qua\n• Đăng thêm ở **Cộng đồng → phòng Mua bán** đúng khu vực của bạn (/cong-dong), trả lời tin nhắn nhanh\n• Nếu bạn bán hàng thường xuyên: tạo **Hồ sơ doanh nghiệp** (/ho-so?view=business) để hiện ở Khám phá, đăng **ưu đãi** và **gửi thông báo** cho người theo dõi\n\nBạn đang bán món gì? Lomi giúp viết lại tiêu đề, mô tả cho hấp dẫn hơn nha.";
function appPost(q: string, c: V8Ctx): string | null {
  const n = N(q);
  if (POST_ASK.test(n) || (POST_ASK2.test(n) && VN(/\b(app|ứng dụng|đây|bán|hàng)\b/).test(n)))
    return "Trên app có 2 chỗ đăng bán nè 🛍️\n• **Quẹt → Trao đổi** (/quet): chọn Mua/bán hoặc Thuê/cho thuê, điền loại hàng, giá, tình trạng, thêm tối đa 4 ảnh. Người quan tâm quẹt phải là hai bên kết nối nhắn tin được\n• **Cộng đồng → phòng Mua bán** (/cong-dong): chọn khu vực rồi đăng tin trong phòng chat chung\n\nCòn nếu bạn có cửa hàng / bán thường xuyên thì nên tạo **Hồ sơ doanh nghiệp** (/ho-so?view=business) để đăng ưu đãi và hiện ở Khám phá. Bạn định bán món gì?";
  const ctx = c.hist.slice(-3).some((h) => POST_ASK.test(N(h)) || POST_ASK2.test(N(h)));
  if (ctx && (NO_VIEW.test(n) || VN(/\b(cách nào|làm sao|làm gì)( \S+){0,3} (nhiều người|nhiều khách|bán được|bán chạy)\b/).test(n)))
    return said(c.last, "Vài cách giúp bài đăng") ? "Ngoài mấy cách trên thì đăng đều đặn (không đăng trùng liên tục một lúc), đổi ảnh mới khi lâu không ai hỏi, và nhờ người quen đã mua để lại đánh giá nếu bạn có hồ sơ doanh nghiệp. Bạn gửi Lomi tiêu đề và mô tả hiện tại, Lomi góp ý sửa cho nha ✍️" : POST_TIPS;
  return null;
}

// Tìm việc trên app — câu kể tiếp sau khi Lomi đã chỉ Quẹt → Công việc
function jobFollow(q: string, c: V8Ctx): string | null {
  if (!said(c.last, "Quẹt → Công việc") && !said(c.last, "phòng Việc làm")) return null;
  const n = N(q);
  if (VN(/\b(part time|parttime|part-time|bán thời gian|làm thêm|làm ca|theo ca|ca (sáng|chiều|tối|đêm)|cuối tuần|buổi tối)\b/).test(n))
    return "Tìm việc part-time thì vào **Quẹt → Công việc → Tìm việc**, ở phần **ca làm theo ngày** chọn đúng những buổi bạn rảnh, ghi rõ là muốn làm part-time và mức lương mong muốn — bên tuyển người nhìn vào là biết có hợp ca không. Thêm một chỗ nữa: **Cộng đồng → phòng Việc làm** (/cong-dong), quán xá, cửa hàng hay đăng tuyển part-time ở đó, bạn có thể đăng luôn một tin ngắn kiểu “Mình tìm việc part-time buổi tối, đã từng làm phục vụ…”.\n\nBạn muốn làm loại việc gì — phục vụ, bán hàng, gia sư, hay việc khác?";
  if (VN(/\b(ở|tại|khu|gần)( \S+){0,1} (đà lạt|đây|nhà|khu vực|quận|phường|thành phố)\b|^ (ở |tại )?đà lạt $/).test(n))
    return "Được nè — ở **Cộng đồng** (/cong-dong) bạn chọn **vị trí** ở đầu trang (vd Đà Lạt) rồi chọn chủ đề **Việc làm**, là vào đúng phòng việc làm của khu đó. Ở **Quẹt → Công việc**, bạn ghi rõ khu vực muốn làm trong phần mô tả để bên tuyển người ở gần dễ thấy hợp.\n\nBạn muốn Lomi giúp viết tin tìm việc cho gọn, dễ được để ý không?";
  return null;
}

/** QA V8 — chạy sớm (sau lớp khủng hoảng của chính người dùng, trước mạch nghe kể / khung câu / luồng kinh doanh). */
export function v8Reply(q: string, c: V8Ctx): V8Reply | null {
  const s = otherCrisis(q, c) ?? allergyEarly(q, c) ?? scamReply(q, c) ?? kidGi(q, c) ?? postpartum(q, c) ?? medStopFollow(q, c) ?? palpFollow(q, c);
  if (s) return { text: s };
  const p = appPost(q, c) ?? jobFollow(q, c);
  if (p) return { text: p };
  return shopPlan(q, c) ?? debtReply(q, c) ?? elderMemory(q, c) ?? teenReply(q, c) ?? caregiverReply(q, c) ?? newcomer(q, c) ?? weightV8(q, c);
}
