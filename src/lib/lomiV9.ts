// ─────────────────────────────────────────────────────────────────────────────
// QA V9 (23/10, tự soạn: 30 hội thoại — tarot hỏi tiếp, sức khoẻ trẻ nhỏ / bà bầu / người già, tài khoản app,
//   chuyện phiếm, câu hỏi về chính Lomi, tiền bạc đời thường) — chạy trên máy, không gọi AI.
//   An toàn trước: bà bầu phù + đau đầu + mờ mắt (tiền sản giật), bé dưới 1 tuổi ho mà thở nhanh, bé sốt cao uống hạ sốt
//   chưa hạ, người già ngã không đứng dậy được (nghi gãy cổ xương đùi), bỏng phồng rộp ở tay / bôi kem đánh răng.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";
import { jokeText } from "@/lib/lomiChat";
import { urgentOf } from "@/lib/lomiUrgent";

export type V9Ctx = { last?: string; hist: string[]; lastHeart?: string };
export type V9Reply = { text: string; heart?: string; keepHealth?: boolean; about?: { text: string; kind: "third" } };
const N = (q: string) => ` ${normalizeVi(q)} `;
const anyIn = (re: RegExp, hs: string[]) => hs.some((h) => re.test(N(h)));
const said = (last: string | undefined, s: string) => !!last && last.includes(s);
const low = (q: string) => q.normalize("NFC").toLowerCase();

// ═══════════════ An toàn ═══════════════

// Đang mang thai + dấu hiệu nguy hiểm
const PREG = VN(/\b(mang bầu|mang thai|có bầu|bầu \d+|đang bầu|có thai|thai \d+|bầu được)\b/);
function pregnancy(q: string, c: V9Ctx): V9Reply | null {
  const n = N(q);
  const ctx = PREG.test(n) || anyIn(PREG, c.hist.slice(-4));
  if (!ctx) return null;
  const danger: string[] = [];
  if (VN(/\b(đau đầu|nhức đầu)\b/).test(n) && VN(/\b(nhiều|dữ dội|dữ|nặng|liên tục|không hết|quá)\b/).test(n)) danger.push("đau đầu nhiều");
  if (VN(/\b(mờ mắt|mắt (hơi )?mờ|nhìn mờ|hoa mắt|nhìn thấy đốm|chớp sáng)\b/).test(n)) danger.push("mờ mắt / nhìn có đốm sáng");
  if (VN(/\b(phù|sưng)( \S+){0,2} (mặt|tay|chân|người)|(mặt|tay|chân)( \S+){0,2} (phù|sưng)\b/).test(n) && (danger.length || VN(/\b(tự nhiên|đột ngột|nhanh|nhiều)\b/).test(n))) danger.push("phù đột ngột");
  if (VN(/\b(đau (vùng )?thượng vị|đau (dưới )?xương sườn|đau bụng trên)\b/).test(n)) danger.push("đau vùng bụng trên");
  if (VN(/\b(ra máu|chảy máu|ra huyết)\b/).test(n)) danger.push("ra máu");
  if (VN(/\b(vỡ ối|rỉ ối|ra nước|chảy nước)\b/).test(n)) danger.push("ra nước / nghi vỡ ối");
  if (VN(/\b(thai ít đạp|ít đạp|không thấy đạp|không đạp|con ít máy|giảm cử động)\b/).test(n)) danger.push("thai đạp ít đi");
  if (VN(/\b(co giật|ngất|lơ mơ|khó thở)\b/).test(n)) danger.push("co giật / ngất / khó thở");
  if (VN(/\b(đau bụng)( \S+){0,2} (dữ dội|nhiều|từng cơn|liên tục)|gò (bụng )?(nhiều|liên tục)\b/).test(n)) danger.push("đau bụng / gò nhiều");
  if (danger.length && said(c.last, "cấp cứu sản khoa"))
    return { keepHealth: true, text: `🚨 Thêm **${danger.join(", ")}** nữa thì càng phải **đi cấp cứu sản khoa ngay bây giờ** nha — gọi **115** nếu không tự đi được. Đừng chờ xem có đỡ không.` };
  if (said(c.last, "rất thường gặp khi mang thai") && VN(/\b(có sao không|có nguy hiểm không|có ảnh hưởng|ảnh hưởng (tới |đến )?(thai|em bé|con|bé)|có sao ko|nguy hiểm không)\b/).test(n))
    return { keepHealth: true, text: "Chuột rút khi mang thai thường **không ảnh hưởng tới em bé** và không nguy hiểm cho mẹ đâu nha 💚 Chỉ cần đi khám sớm nếu bắp chân một bên sưng, nóng, đỏ, đau kéo dài, hoặc chuột rút kèm phù nhiều, đau đầu, mờ mắt. Lần khám thai tới, bạn cứ kể với bác sĩ để được dặn thêm." };
  if (danger.length && urgentOf(q)) return null; // câu tự nói đủ (có chữ "mang thai") → thẻ cấp cứu có nguồn
  const pre = danger.some((d) => /đau đầu|mờ mắt|phù|bụng trên/u.test(d)) || (anyIn(VN(/\b(phù|sưng)\b/), c.hist.slice(-3)) && danger.length > 0);
  if (danger.length)
    return { keepHealth: true, text: `🚨 Đang mang thai mà có **${danger.join(", ")}** là dấu hiệu cần **đi khám cấp cứu sản khoa ngay hôm nay** (hoặc gọi **115**), đừng chờ tới lịch khám.${pre ? "\n\nPhù kèm đau đầu nhiều, mờ mắt có thể là dấu hiệu **tiền sản giật** — tình trạng huyết áp tăng khi mang thai, nguy hiểm cho cả mẹ và bé nếu không được xử trí sớm. Ở bệnh viện, bác sĩ sẽ đo huyết áp, xét nghiệm nước tiểu, máu và theo dõi thai." : ""}\n\nTrong lúc đi: mang theo sổ khám thai, có người đi cùng; nếu co giật, ngất, khó thở hay ra máu nhiều thì gọi **115** ngay.` };
  if (VN(/\b(chuột rút|vọp bẻ|bị rút)\b/).test(n))
    return { keepHealth: true, text: "Chuột rút (nhất là ở bắp chân, hay về đêm) **rất thường gặp khi mang thai**, nhất là từ 3 tháng giữa trở đi, thường không nguy hiểm 💚\n• Khi bị: duỗi thẳng chân, kéo nhẹ mũi bàn chân về phía người, xoa bóp bắp chân, chườm ấm\n• Phòng: đi bộ nhẹ, duỗi bắp chân trước khi ngủ, uống đủ nước, không đứng hoặc ngồi một tư thế quá lâu\n• Đừng tự uống thêm thuốc bổ (canxi, magie…) ngoài những gì bác sĩ đã kê — hỏi bác sĩ khám thai trước nha\n\n⚠️ Đi khám sớm nếu một bên bắp chân **sưng, nóng, đỏ, đau kéo dài** (cần loại trừ cục máu đông), hoặc chuột rút kèm phù nhiều, đau đầu, mờ mắt." };
  return null;
}

// Bé dưới 1 tuổi ho + thở nhanh / khó thở
const BABY = VN(/\b(con|bé|em bé|cháu)( \S+){0,2} (\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mười một) (tháng|tuần)( tuổi)?\b|\b(sơ sinh|trẻ sơ sinh)\b/);
const RESP = VN(/\b(ho|khò khè|sổ mũi|nghẹt mũi|sốt)\b/);
function babyBreath(q: string, c: V9Ctx): V9Reply | null {
  const ctx = c.hist.slice(-4).some((h) => BABY.test(N(h))) || BABY.test(N(q));
  if (!ctx || !(anyIn(RESP, c.hist.slice(-4)) || RESP.test(N(q)))) return null;
  const n = N(q);
  if (said(c.last, "Cách đếm nhịp thở") && VN(/\b(có sao không|có nguy hiểm không|có nặng không|có sao ko|nguy hiểm không|có cần đi không)\b/).test(n))
    return { keepHealth: true, text: "Lomi không khám được nên không nói chắc bé có sao không — nhưng **ho kèm thở nhanh ở bé dưới 1 tuổi** là dấu hiệu bác sĩ luôn muốn được xem sớm, nên mình **cho bé đi khám trong hôm nay** cho yên tâm nha. Nếu bác sĩ nghe phổi bình thường thì về nhà theo dõi tiếp; còn nếu là viêm tiểu phế quản / viêm phổi thì phát hiện sớm sẽ xử lý nhẹ nhàng hơn.\n\n🚨 Đi cấp cứu ngay nếu bé rút lõm ngực, tím môi, bỏ bú, li bì." };
  if (VN(/\b(thở (hơi |rất )?nhanh|thở gấp|thở mạnh|thở khó|khó thở|thở rít|thở khò khè|rút lõm|co kéo|cánh mũi phập phồng|tím|môi tím|bỏ bú|bú kém|li bì|lừ đừ)\b/).test(n))
    return { keepHealth: true, text: "🚨 Bé nhỏ mà ho kèm **thở nhanh / khó thở** thì nên cho bé **đi khám ngay hôm nay**, đừng chờ — trẻ dưới 1 tuổi có thể chuyển nặng (viêm phổi, viêm tiểu phế quản) nhanh hơn người lớn.\n\nCách đếm nhịp thở: khi bé nằm yên hoặc ngủ, đếm số lần bụng phồng lên trong **1 phút** — với bé 2–12 tháng, **từ 50 lần/phút trở lên** là thở nhanh.\n\n🚨 Gọi **115** / đi cấp cứu ngay nếu bé: lồng ngực **rút lõm** khi thở, cánh mũi phập phồng, môi hoặc da **tím tái**, thở rít, ngưng thở từng lúc, **bỏ bú**, li bì khó đánh thức, hoặc co giật.\n\nTrong lúc chờ đi khám: hút mũi, nhỏ nước muối sinh lý cho bé dễ thở, cho bú nhiều cữ nhỏ; không tự cho bé uống thuốc ho hay kháng sinh." };
  return null;
}

// Bé sốt — câu kể tiếp (vẫn chơi, uống hạ sốt chưa hạ, có cần đi viện không)
const KID = VN(/\b(con|bé|em bé|cháu|con trai|con gái)( \S+){0,2} (\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười) (tuổi|tháng)\b|\b(bé nhà|con nhà|con mình|con em|con anh|con a|con e|con tôi|bé con)\b/);
const FEVER = VN(/\b(sốt|nóng sốt|sốt cao|sốt \d+)\b/);
function kidFever(q: string, c: V9Ctx): V9Reply | null {
  const ctx = c.hist.slice(-4).some((h) => KID.test(N(h)) && FEVER.test(N(h)));
  if (!ctx) return null;
  const n = N(q);
  const RED = "🚨 Đưa bé đi **cấp cứu ngay** nếu: bé dưới 3 tháng tuổi mà sốt, **co giật**, li bì khó đánh thức, **khó thở**, nổi ban tím / chấm đỏ không mất khi ấn ly lên, cổ cứng, nôn liên tục không uống được, ít đi tiểu, hoặc bé quấy khóc không dỗ được.";
  if (VN(/\b(vẫn chơi|vẫn chạy nhảy|vẫn ăn|vẫn bú|vẫn tỉnh|vẫn cười|chơi bình thường)\b/).test(n))
    return { keepHealth: true, text: `Bé vẫn chơi, vẫn tỉnh táo là **dấu hiệu tốt** nha 👍 Với trẻ sốt, bác sĩ thường xem **bé có lừ đừ, mệt lả không** quan trọng hơn con số trên nhiệt kế.\n\nỞ nhà: cho bé mặc thoáng, uống nhiều nước / bú nhiều hơn, lau người bằng **nước ấm** (không dùng nước lạnh, cồn, chanh). Thuốc hạ sốt cho trẻ phải dùng **đúng liều theo cân nặng** ghi trên hộp thuốc — không chắc thì hỏi dược sĩ, đừng tự tăng liều.\n\n${RED}\n\nBé sốt từ bao giờ rồi bạn?` };
  if (VN(/\b(chưa hạ|không hạ|không giảm|chưa giảm|vẫn sốt|vẫn còn sốt|lại sốt|sốt lại|hạ rồi lại lên)\b/).test(n))
    return { keepHealth: true, text: `Thuốc hạ sốt thường cần khoảng **30–60 phút** mới có tác dụng, và thường chỉ làm **giảm bớt** vài độ cho bé dễ chịu chứ không nhất thiết về hẳn bình thường — chưa hạ ngay chưa chắc là thuốc không tác dụng 💚\n• **Đừng cho uống thêm liều** khi chưa tới giờ theo hướng dẫn trên hộp thuốc, đừng tự đổi / phối thêm thuốc khác\n• Cởi bớt áo, lau người bằng nước ấm, cho bé uống nhiều nước\n• Đo lại nhiệt độ sau khoảng 1 tiếng\n\nNên **đưa bé đi khám** nếu sốt cao không hạ dù đã dùng thuốc đúng cách, sốt kéo dài quá 2–3 ngày, hoặc bé có vẻ mệt hơn.\n\n${RED}` };
  if (VN(/\b(có cần|có nên|phải)( \S+){0,2} (đi viện|đi khám|nhập viện|đi bệnh viện|đi bác sĩ|vào viện)\b|\bkhi nào (đi|phải đi|nên đi) (khám|viện)\b/).test(n))
    return { keepHealth: true, text: `Nên **đưa bé đi khám** khi:\n• Sốt cao không hạ dù đã dùng thuốc hạ sốt đúng liều, hoặc hạ rồi lại lên liên tục\n• Sốt kéo dài **quá 2–3 ngày**\n• Bé mệt, bỏ ăn bỏ bú, kèm ho nhiều, đau tai, tiêu chảy, nôn, hay tiểu buốt\n• Ba mẹ thấy lo, thấy bé “không giống mọi khi” — linh cảm của ba mẹ cũng là lý do chính đáng để đi khám\n\n${RED}\n\nNếu bé vẫn chơi, tỉnh táo, uống được nước, thì có thể theo dõi ở nhà và đặt lịch khám nhi trong ngày / hôm sau cho yên tâm.` };
  return null;
}

// Người già ngã — đau hông, không đứng dậy được
const ELDER = VN(/\b(ông|bà|mẹ|ba|bố|cha|má|người già|người lớn tuổi|ông nội|bà nội|ông ngoại|bà ngoại)\b/);
function elderFall(q: string, c: V9Ctx): V9Reply | null {
  const ctx = c.hist.slice(-3).some((h) => ELDER.test(N(h)) && VN(/\b(ngã|té|trượt chân|trượt ngã)\b/).test(N(h)));
  const n = N(q);
  const now = ELDER.test(n) && VN(/\b(ngã|té)\b/).test(n);
  if (!ctx && !now) return null;
  if (VN(/\b(không (đứng|đi|ngồi) (dậy )?được|không tự đứng|không cử động|đau hông|đau háng|đau đùi|chân (bị )?ngắn|chân (bị )?xoay|đau (nhiều|dữ dội)|đập đầu|chảy máu|lơ mơ|nôn)\b/).test(n))
    return { keepHealth: true, text: "🚨 Người lớn tuổi ngã mà **đau hông, không đứng dậy được** thì rất có thể bị **gãy xương (thường là cổ xương đùi)** — gọi **115** ngay hoặc nhờ người đưa đi cấp cứu bằng cáng / xe, **đừng cố đỡ bà đứng dậy hay đi lại**.\n\nTrong lúc chờ:\n• Để bà nằm yên ở tư thế đỡ đau nhất, kê gối mềm, đắp chăn giữ ấm (nằm sàn nhà tắm lâu dễ bị lạnh)\n• **Không cho ăn uống gì** — phòng khi cần mổ\n• Nếu bà đập đầu, lơ mơ, nôn, chảy máu, hay đang uống thuốc chống đông → báo rõ khi gọi 115\n\nSau này, để phòng ngã: thảm chống trơn và tay vịn trong nhà tắm, đèn sáng ban đêm, dép đế bám." };
  return null;
}

// Bỏng — phồng rộp, kem đánh răng, mẹo dân gian
const BURN = VN(/\b(bỏng|phỏng|bị bỏng|bị phỏng)\b/);
function burnFollow(q: string, c: V9Ctx): V9Reply | null {
  const ctx = anyIn(BURN, c.hist.slice(-3)) || BURN.test(N(q));
  if (!ctx) return null;
  const n = N(q);
  if (VN(/\b(kem đánh răng|nước mắm|mỡ trăn|dầu ăn|dầu gió|bơ|lòng trắng trứng|đá lạnh|chườm đá|nước đá|mật ong|bã cà phê|giấm|rượu|lá cây|nghệ|nha đam)\b/).test(n))
    return { keepHealth: true, text: `**Không nên bôi ${q.match(/kem đánh răng|nước mắm|mỡ trăn|dầu ăn|dầu gió|bơ|lòng trắng trứng|mật ong|bã cà phê|giấm|rượu|nghệ|nha đam/iu)?.[0]?.toLowerCase() ?? "những thứ đó"}** hay các mẹo dân gian lên vết bỏng nha ❌ — chúng không làm mát được sâu, giữ nhiệt lại trong da, dễ gây **nhiễm trùng** và làm bác sĩ khó đánh giá vết bỏng. Cũng đừng chườm **đá lạnh** trực tiếp.\n\nCách đúng:\n• Để vết bỏng dưới **vòi nước mát (không lạnh buốt) khoảng 20 phút**\n• Tháo nhẫn, đồng hồ ở gần chỗ bỏng trước khi sưng\n• Che nhẹ bằng màng bọc thực phẩm hoặc gạc sạch, không bó chặt\n• Đau thì có thể hỏi dược sĩ thuốc giảm đau thông thường\n\nBỏng ở **bàn tay** mà đã **phồng rộp** thì nên đi khám để được xử lý đúng, tránh để lại sẹo co kéo ở khớp ngón tay.` };
  if (anyIn(BURN, c.hist.slice(-3)) && VN(/\b(phồng rộp|phồng nước|bóng nước|rộp|phồng lên|bể bóng|vỡ bóng|lột da)\b/).test(n) && !BURN.test(n)) {
    const hand = anyIn(VN(/\b(tay|bàn tay|ngón tay|mặt|chân|bàn chân|khớp)\b/), [...c.hist.slice(-3), q]);
    return { keepHealth: true, text: `Phồng rộp nghĩa là bỏng đã vào **lớp sâu hơn của da (bỏng độ 2)** 😣\n• **Đừng chọc vỡ** bóng nước — lớp da đó đang che chắn, giúp chống nhiễm trùng; nếu bóng tự vỡ thì rửa nhẹ bằng nước sạch, che bằng gạc sạch\n• Tiếp tục làm mát bằng nước mát nếu vẫn còn trong vài giờ đầu, rồi che nhẹ bằng gạc / màng bọc thực phẩm\n• Không bôi kem đánh răng, nước mắm, dầu… lên vết bỏng\n\n${hand ? "Bỏng phồng rộp ở **tay, mặt, chân hay chỗ khớp** thì nên **đi khám** trong hôm nay nha — vùng này dễ để lại sẹo co kéo, ảnh hưởng cử động." : "Nên đi khám nếu vùng bỏng rộng hơn lòng bàn tay, ở tay / mặt / khớp / bộ phận sinh dục, hoặc có dấu hiệu nhiễm trùng (sưng đỏ lan rộng, chảy mủ, sốt)."}\n\n🚨 Gọi **115** nếu bỏng rộng, da trắng bệch hoặc cháy đen, bỏng do điện / hoá chất, hay người bị bỏng là trẻ nhỏ, người già.` };
  }
  return null;
}

// ═══════════════ Đời thường ═══════════════

// Mất ví có căn cước + thẻ ngân hàng
function lostWallet(q: string, c: V9Ctx): string | null {
  const ctx = anyIn(VN(/\b(mất ví|rơi ví|bị móc túi|mất bóp|rớt ví|mất giấy tờ|bị trộm ví)\b/), c.hist.slice(-3));
  if (!ctx) return null;
  const n = N(q);
  if (!VN(/\b(làm sao|làm gì|phải làm|giờ sao|thế nào|như thế nào)\b/).test(n)) return null;
  const all = [...c.hist.slice(-3), q].map(N).join(" ");
  const id = VN(/\b(căn cước|cccd|chứng minh|cmnd|giấy tờ)\b/).test(all);
  const card = VN(/\b(thẻ ngân hàng|thẻ atm|thẻ tín dụng|thẻ)\b/).test(all);
  return `Làm theo thứ tự này nha 📝\n${card ? "1. **Gọi tổng đài ngân hàng khoá thẻ ngay** (nếu chưa khoá) — số tổng đài có trên app ngân hàng hoặc trang web chính thức; đổi mật khẩu app ngân hàng, ví điện tử nếu có lưu trong ví\n" : ""}${id ? `${card ? "2" : "1"}. **Báo mất căn cước** với công an phường / xã nơi bạn ở và hỏi thủ tục **cấp lại**; từ giờ cảnh giác cuộc gọi, tin nhắn lạ — người nhặt được có thể dùng giấy tờ để mạo danh, vay tiền qua app\n` : ""}${card || id ? "" : "1. Liệt kê những gì có trong ví và khoá / báo mất từng thứ\n"}• Nhớ lại các chỗ vừa ghé, gọi hỏi lại — nhiều khi có người nhặt được giữ giùm hoặc gửi công an\n• Đăng tin tìm đồ ở Cộng đồng (/cong-dong) khu vực bạn, ghi đặc điểm ví\n\nBạn đã khoá thẻ chưa?`;
}

// Hàng xóm ồn ào đêm khuya
function noisyNeighbor(q: string, c: V9Ctx): string | null {
  const n = N(q);
  const now = VN(/\b(hàng xóm|nhà bên cạnh|phòng bên|nhà đối diện)\b/).test(n) && VN(/\b(ồn|mở nhạc|hát karaoke|karaoke|nhạc to|loa|la hét|nhậu|cãi nhau)\b/).test(n);
  const ctx = now || c.hist.slice(-3).some((h) => VN(/\b(hàng xóm|nhà bên cạnh|phòng bên)\b/).test(N(h)) && VN(/\b(ồn|mở nhạc|karaoke|nhạc to|loa|nhậu)\b/).test(N(h)));
  if (!ctx) return null;
  if (now)
    return "Bị ồn tới 1–2 giờ sáng thì mất ngủ, bực bội lắm 😣 Thử theo từng bước nha:\n• **Nói chuyện trực tiếp lúc bình tĩnh** (ban ngày, không phải lúc đang bực): nói rõ giờ nào bị ảnh hưởng, đề nghị giảm âm lượng sau 22h\n• Nếu vẫn vậy, nhờ **tổ trưởng tổ dân phố** hoặc ban quản lý chung cư / chủ trọ nói giúp\n• Vẫn tái diễn vào ban đêm thì báo **công an phường** — gây ồn ào làm mất trật tự vào giờ nghỉ ngơi ban đêm có thể bị nhắc nhở, xử phạt\n• Ghi lại ngày giờ, quay video có tiếng làm bằng chứng\n\nBạn đã thử nói chuyện với họ lần nào chưa?";
  if (VN(/\b(báo ai|báo đâu|báo cho ai|gọi ai|nhờ ai|kiện|phạt|báo công an|thưa)\b/).test(n))
    return "Đã nói mà không nghe thì bạn có thể:\n• Nhờ **tổ trưởng tổ dân phố** (hoặc ban quản lý chung cư, chủ nhà trọ) nhắc nhở trước — cách này nhẹ nhàng, giữ được tình làng xóm\n• Báo **công an phường / xã** nơi bạn ở, nhất là khi ồn vào ban đêm và đã nhắc nhiều lần; nếu đang ồn ngay lúc đó có thể gọi trực tiếp công an phường\n• Chuẩn bị bằng chứng: ghi ngày giờ, quay video có tiếng\n\nCố giữ bình tĩnh, đừng sang to tiếng lúc nửa đêm — dễ thành xô xát mà mình lại chịu thiệt.";
  if (VN(/\b(không nghe|không chịu|vẫn vậy|vẫn mở|nói rồi)\b/).test(n))
    return "Nói rồi mà họ vẫn vậy thì bực thật 😤 Lúc này nhờ người có vai trò nói giúp thường hiệu quả hơn: **tổ trưởng tổ dân phố**, ban quản lý chung cư hay chủ trọ. Nếu vẫn tái diễn vào ban đêm, bạn có thể báo **công an phường** — nhớ ghi lại ngày giờ, quay video có tiếng làm bằng chứng.";
  return null;
}

// Tiêu hết lương, còn N ngày mới có lương
function brokeUntilPayday(q: string, c: V9Ctx): string | null {
  const all = [...c.hist.slice(-3), q].map(N).join(" ");
  if (!VN(/\b(tiêu hết|xài hết|hết sạch|cạn) (lương|tiền)|hết tiền|cháy túi|viêm màng túi\b/).test(all)) return null;
  const n = N(q);
  const days = low([...c.hist.slice(-3), q].join(" ")).match(/(\d+) ngày/u)?.[1];
  if (!VN(/\b(làm sao|làm gì|phải làm|giờ sao|sống sao|xoay sao|xoay xở)\b/).test(n) && !(days && VN(/\b(ngày|lương)\b/).test(n))) return null;
  if (!VN(/\b(làm sao|làm gì|phải làm|giờ sao|sống sao|xoay sao|xoay xở)\b/).test(n))
    return `Còn ${days} ngày nữa mới tới lương thì mình tính một kế hoạch “sống sót” gọn gọn là qua được nè 💪 Bạn đang còn khoảng bao nhiêu tiền (kể cả tiền lẻ, tiền trong ví điện tử)?`;
  return `Mình xoay ${days ? `${days} ngày` : "mấy ngày tới"} cho qua nha 💪\n• **Đếm hết số tiền còn lại**, chia đều theo số ngày → ra mức tiêu tối đa mỗi ngày\n• Ưu tiên khoản bắt buộc: ăn uống đơn giản (tự nấu cơm, mì, trứng, rau — rẻ hơn ăn ngoài nhiều), xăng đi làm, tiền thuốc nếu có\n• Tạm hoãn mọi khoản chưa cần: cà phê, trà sữa, mua sắm online, đi chơi\n• Xem lại các khoản tự động trừ tiền (gói đăng ký, trả góp) có hoãn được không\n• Nếu thật sự thiếu, mượn tạm **người thân tin cậy** một khoản nhỏ, hẹn rõ ngày trả — **tránh vay qua app, vay nóng** vì lãi rất cao\n\nTháng sau, ngay khi nhận lương thì để riêng một khoản tiết kiệm và chia tiền tiêu theo tuần — đỡ bị hụt cuối tháng. Bạn muốn Lomi giúp chia ngân sách tháng tới không?`;
}

// Tiết kiệm mua nhà: lương X → nên để dành bao nhiêu
function savingPlan(q: string, c: V9Ctx): string | null {
  const hs = [...c.hist.slice(-4), q];
  if (!anyIn(VN(/\b(tiết kiệm|để dành|mua nhà|mua đất|mua xe|dành dụm)\b/), hs)) return null;
  const n = N(q);
  if (!VN(/\b(để dành|tiết kiệm|dành ra|bỏ ống)( \S+){0,2} (bao nhiêu|mấy|bao nhiu)|\bbao nhiêu (là )?(hợp lý|đủ|vừa)\b/).test(n)) return null;
  const sal = low(hs.join(" ")).match(/(?:lương|thu nhập|kiếm được)(?: \S+){0,2}? (\d+(?:[.,]\d+)?)\s*(?:triệu|tr|củ)/u);
  const s = sal ? Number(sal[1].replace(",", ".")) : null;
  const f = (x: number) => `${Math.round(x * 10) / 10}`.replace(".", ",");
  return `Một cách chia hay được dùng là **50/30/20**: khoảng 50% cho chi tiêu thiết yếu (nhà, ăn, đi lại), 30% cho nhu cầu cá nhân, **20% để dành**.${s ? `\n\nVới lương ${f(s)} triệu:\n• Để dành **20%** ≈ **${f(s * 0.2)} triệu/tháng** → khoảng ${f(s * 0.2 * 12)} triệu/năm\n• Nếu quyết tâm mua nhà, cố lên **30%** ≈ ${f(s * 0.3)} triệu/tháng → khoảng ${f(s * 0.3 * 12)} triệu/năm` : ""}\n\nMẹo giữ được lâu:\n• **Trích tiền để dành ngay khi nhận lương** (chuyển sang tài khoản riêng / gửi tiết kiệm), tiêu phần còn lại — đừng đợi cuối tháng còn dư mới để\n• Giữ trước một **quỹ dự phòng** khoảng 3–6 tháng chi tiêu, rồi mới dồn cho mục tiêu nhà\n• Mỗi lần tăng lương, tăng luôn phần để dành\n\nBạn dự định mua nhà trong khoảng mấy năm, và giá nhà ở khu bạn muốn khoảng bao nhiêu? Lomi tính thử cần để dành bao lâu nha.`;
}

// Quà sinh nhật handmade
function giftIdeas(q: string, c: V9Ctx): string | null {
  const hs = [...c.hist.slice(-3), q];
  if (!anyIn(VN(/\b(quà|tặng)\b/), hs)) return null;
  const n = N(q);
  if (VN(/\b(lời chúc|câu chúc|chúc mừng|viết|thiệp|caption|status)\b/).test(n)) return null;
  const hand = anyIn(VN(/\b(handmade|hand made|tự làm|làm tay|thủ công)\b/), hs);
  if (!VN(/\b(gợi ý|nên tặng|tặng gì|quà gì|ý tưởng|chỉ giúp|giúp (a|anh|em|mình|tôi))\b/).test(n) && !(hand && VN(/\b(handmade|tự làm|thủ công)\b/).test(n))) return null;
  if (hand && said(c.last, "trúng tủ"))
    return "Chọn một món làm thử trong 1–2 buổi tối nè ✂️\n**Sổ kỷ niệm 52 lý do:** mua một cuốn sổ nhỏ (hoặc 52 tấm thiệp), mỗi trang dán một tấm ảnh hai vợ chồng và viết một lý do bạn thương vợ — “vì em luôn để phần anh miếng ngon nhất”, “vì em cười là nhà sáng hẳn”… Không cần viết hay, chỉ cần thật.\n**Lọ phiếu ước:** cắt 20–30 mảnh giấy màu, mỗi mảnh ghi một lời hứa (một buổi massage vai, một ngày anh nấu cơm, một buổi đi cà phê riêng hai đứa), cuộn lại bỏ vào hũ thuỷ tinh, buộc nơ.\n\nTặng kèm bữa tối món vợ thích và một lá thư tay là đủ làm vợ xúc động rồi 💕";
  if (hand)
    return "Vợ thích đồ handmade thì quà tự tay làm là “trúng tủ” luôn nè 🎁\n• **Hộp / sổ kỷ niệm**: in những tấm ảnh hai vợ chồng, viết vài dòng dưới mỗi ảnh — hoặc “52 lý do anh thương em”\n• **Thư tay** viết thật lòng — món quà rẻ nhất mà nhiều người giữ lâu nhất\n• **Lọ “phiếu ước”**: mỗi tờ giấy là một lời hứa (“một buổi anh rửa chén”, “một buổi hẹn hò đi xem phim”…)\n• Nếu khéo tay chút: đan khăn, làm vòng tay, nến thơm, móc khoá đất sét có tên hai người\n• Cùng nhau đi một **lớp workshop** (làm gốm, làm nến, vẽ tranh) — vừa là quà vừa là buổi hẹn\n\nKèm thêm một bữa tối tự nấu món vợ thích là trọn vẹn 💕 Vợ bạn thích kiểu dễ thương, tình cảm hay kiểu dùng được hằng ngày hơn?";
  return "Gợi ý vài hướng quà sinh nhật nè 🎁\n• Thứ người ấy **từng nhắc muốn có** mà chưa mua — để ý lời nói hằng ngày là ra quà “chuẩn” nhất\n• **Trải nghiệm**: một bữa tối ở quán người ấy thích, một chuyến đi ngắn, một buổi workshop cùng nhau\n• Quà tự tay làm: thư tay, sổ ảnh kỷ niệm, lọ “phiếu ước”\n• Đồ dùng hằng ngày nhưng chọn loại tốt hơn: khăn choàng, ví, mỹ phẩm quen dùng\n\nNgười ấy thích gì, hay đang cần gì dạo này?";
}

// Nấu canh chua — công thức cơ bản
function cookBasic(q: string): string | null {
  const n = N(q);
  if (!VN(/\b(chỉ|dạy|hướng dẫn|cách|công thức)( \S+){0,3} (nấu )?canh chua\b|\bnấu canh chua (sao|thế nào|như thế nào|kiểu gì)\b/).test(n)) return null;
  return "Canh chua cá kiểu miền Nam dễ nấu nè 🍲 (khoảng 3–4 người ăn)\n\n**Nguyên liệu:** 500g cá (cá lóc, cá basa hoặc cá diêu hồng), 2 trái cà chua, 1/4 trái thơm (dứa), vài nhánh bạc hà (dọc mùng), đậu bắp, giá; me chua (hoặc vài trái me / me vắt); hành tím, tỏi, ngò om, ngò gai, ớt; muối, đường, nước mắm.\n\n**Cách nấu:**\n1. Cá làm sạch, cắt khúc, ướp chút muối, nước mắm, hành tím băm khoảng 15 phút\n2. Me ngâm nước ấm, dầm lấy nước, bỏ hạt\n3. Phi thơm tỏi, cho cà chua và thơm vào xào sơ, rồi đổ khoảng 1,2 lít nước, nấu sôi\n4. Cho nước me vào, nêm đường, nước mắm, muối cho vị chua ngọt vừa ăn; thả cá vào nấu nhỏ lửa tới khi cá chín (khoảng 7–10 phút), hớt bọt\n5. Cho đậu bắp, bạc hà vào, sôi lại là tắt bếp, cuối cùng cho giá, ngò om, ngò gai, ớt\n\nMẹo: nêm vị chua – ngọt – mặn cân nhau trước khi thả rau; rau cho sau cùng để còn giòn. Muốn ăn quán ngon thì nhắn Lomi tìm quán nha 😄";
}

// Trời lạnh ăn gì cho ấm
function warmFood(q: string, c: V9Ctx): string | null {
  const n = N(q);
  if (VN(/\b(ăn gì|uống gì|món gì)( \S+){0,2} (cho ấm|ấm bụng|ấm người|trời lạnh|lúc lạnh)\b|\btrời lạnh( \S+){0,2} (ăn|uống) gì\b/).test(n))
    return "Trời lạnh thì mấy món nóng hổi này là số một nè 🔥\n• **Lẩu** (lẩu gà lá é, lẩu bò, lẩu dê) — đi nhóm là hết sẩy\n• **Bánh căn, bánh tráng nướng** nóng giòn\n• Bún bò, phở, cháo, súp cua nóng\n• Uống: sữa đậu nành nóng, ca cao nóng, trà gừng, chè nóng\n\nBạn đang ở khu nào? Lomi tìm quán gần đó cho nha — hoặc gõ thẳng tên món, kiểu “quán lẩu gà lá é”.";
  if (said(c.last, "tìm quán gần đó") && VN(/^ (gần|ở|tại|khu)( \S+){0,4} $/).test(n))
    return VN(/\bchợ\b/).test(n)
      ? "Quanh **chợ Đà Lạt** buổi tối có khu **chợ đêm** với nhiều món nóng: bánh tráng nướng, sữa đậu nành nóng, bánh căn, xiên nướng, lẩu… 🔥 Muốn Lomi tìm quán cụ thể thì gõ tên món kèm khu vực, kiểu “quán lẩu gần chợ Đà Lạt” hoặc “bánh căn gần chợ” nha."
      : `Okie, khu ${q.trim().replace(/^(gần|ở|tại|khu)\s+/iu, "")} nha 📍 Bạn gõ tên món kèm khu vực, kiểu “quán lẩu ${q.trim()}”, để Lomi tìm quán cụ thể cho nha.`;
  return null;
}

// Kể chuyện cười — "nữa đi", "không buồn cười"
function jokeFollow(q: string, c: V9Ctx): string | null {
  if (!c.last || !anyIn(VN(/\b(chuyện cười|kể chuyện vui|kể gì vui|truyện cười|câu đố vui|chọc cười)\b/), c.hist.slice(-2))) return null;
  const n = N(q);
  if (VN(/^ (nữa|nữa đi|thêm|thêm đi|thêm nữa|kể nữa|kể tiếp|tiếp|tiếp đi|cái nữa|câu nữa|câu khác|kể thêm|nữa nha) $/).test(n)) {
    let j = jokeText("kể chuyện cười");
    for (let i = 0; i < 4 && c.last.includes(j.slice(0, 25)); i++) j = jokeText("kể chuyện cười nữa");
    return j;
  }
  if (VN(/\b(không buồn cười|chẳng buồn cười|nhạt|nhạt quá|dở|dở ẹc|xàm|không vui|chán)\b/).test(n)) {
    let j = jokeText("kể chuyện cười");
    for (let i = 0; i < 4 && c.last.includes(j.slice(0, 25)); i++) j = jokeText("kể chuyện cười nữa");
    return `Hic, câu đó nhạt thật 😅 Lomi gỡ lại một câu nha:\n\n${j}`;
  }
  return null;
}

// Hỏi về chính Lomi
function aboutLomi(q: string): string | null {
  const n = N(q);
  if (VN(/^ (?:(?:em|lomi|bạn|mày|cậu|e)( \S+){0,2} )?(có phải|là) (là )?(người thật|con người|người|robot|máy|bot|chatbot|trí tuệ nhân tạo)( thật)?( không| hả| à| ko| vậy| ha| hông)* $|\b(là người hay (là )?máy|người thật hay (là )?(robot|máy|bot))\b/).test(n))
    return "Lomi không phải người thật đâu nè 🤖 Lomi là **trợ lý tự động** của Liên Minh Liên Doanh — trả lời theo kiến thức đã được soạn sẵn, chạy ngay trên máy của bạn.\n\nLomi tâm sự, gợi ý về sức khoẻ, tiền bạc, chỉ cách dùng app… được, nhưng chỉ để **tham khảo** — chuyện sức khoẻ, tâm lý nghiêm trọng thì vẫn cần bác sĩ, chuyên gia thật. Nếu muốn gặp người thật trong ban quản trị, bạn liên hệ qua Email / Zalo / Facebook ở mục trợ giúp nha.";
  return null;
}

// Câu hỏi tiếp về app (quên mật khẩu, thông báo trên iPhone, đặt xe / giao đồ ăn)
function appFollow(q: string, c: V9Ctx): string | null {
  const n = N(q);
  if (said(c.last, "Quên mật khẩu") || said(c.last, "lấy lại mật khẩu") || said(c.last, "lấy lại tài khoản")) {
    if (VN(/\b(không (nhận|thấy) (được )?(email|mail|thư|mã|otp|tin nhắn)|chưa (nhận|thấy) (được )?(email|mail|mã))\b/).test(n))
      return "Phần Quên mật khẩu của app **không gửi email** đâu nha — app kiểm tra ngay trên màn hình: bạn nhập **đúng cả email và số điện thoại đã đăng ký**, khớp thì app hiện tên đăng nhập và gợi ý mật khẩu luôn. Nên không thấy email gửi tới là bình thường.\n\nNếu nhập mà báo không khớp (quên email / SĐT đã dùng, hoặc không còn dùng nữa), bạn liên hệ Ban quản trị qua **Email / Zalo / Facebook** ngay ở màn Quên mật khẩu — admin sẽ xác minh rồi hỗ trợ lấy lại tài khoản.";
  }
  if (said(c.last, "Thông báo") || said(c.last, "thông báo đẩy")) {
    if (VN(/\b(iphone|ios|ip|ipad|apple)\b/).test(n))
      return "Với iPhone thì thông báo của app chỉ chạy khi app được **thêm vào Màn hình chính** và mở từ biểu tượng đó (iOS 16.4 trở lên) nè:\n1. Mở app bằng **Safari** → bấm nút **Chia sẻ** (ô vuông có mũi tên) → **Thêm vào MH chính**\n2. Mở app từ biểu tượng mới trên màn hình chính (không mở trong Safari), đăng nhập lại\n3. Vào Hồ sơ → ⋯ → Cài đặt → Thông báo → **Bật thông báo đẩy**, bấm **Cho phép** khi iPhone hỏi\n4. Kiểm tra **Cài đặt iPhone → Thông báo** → tên app → đã bật **Cho phép thông báo** chưa; tắt chế độ Tập trung / Không làm phiền nếu đang bật\n\nNếu iPhone của bạn đang dùng iOS cũ hơn 16.4 thì cần cập nhật iOS mới nhận được thông báo nha.";
    if (VN(/\b(bật rồi|đã bật|bật hết rồi|bật mà|vẫn không|vẫn chưa)\b/).test(n))
      return "Bật rồi mà vẫn không thấy thì thử thêm mấy bước này nha:\n• Trong app: Hồ sơ → ⋯ → Cài đặt → Thông báo → bấm **Đồng bộ lại**\n• Kiểm tra cài đặt **của điện thoại** cho app / trình duyệt: đã cho phép thông báo chưa, có đang bật chế độ Không làm phiền / Tiết kiệm pin không\n• iPhone: phải **thêm app vào Màn hình chính** và mở từ đó mới nhận được\n• Android: vào Cài đặt → Ứng dụng → app (hoặc Chrome) → Thông báo → bật\n\nBạn đang dùng iPhone hay Android?";
  }
  if (said(c.last, "Đưa đón") || said(c.last, "giá THAM KHẢO") || said(c.last, "Chở người, Giao hàng")) {
    if (VN(/\b(giao đồ ăn|ship đồ ăn|giao thức ăn|đặt đồ ăn|giao món|giao hàng)( \S+){0,2}( không| được không| hả| ko)?\b/).test(n))
      return "Có nha 🛵 Ở **Đưa đón & Giao hàng** (/dua-don) bạn chọn **Giao đồ ăn** (hoặc Giao hàng), rồi chọn điểm lấy và điểm giao, xem giá tham khảo → Đặt ngay. Tài xế nhận chuyến sẽ liên hệ bạn. Giá cuối cùng hai bên tự thoả thuận, trả tiền mặt cho tài xế.";
    if (VN(/\b(phí|giá|bao nhiêu tiền|tốn bao nhiêu|mất bao nhiêu|cước)\b/).test(n))
      return "App hiện **giá tham khảo** theo quãng đường ước tính: giá mở cửa (đã gồm vài km đầu) + giá mỗi km tiếp theo, tuỳ loại xe; hàng cồng kềnh hoặc cần bốc dỡ có phụ phí. Giá cuối cùng hai bên tự thoả thuận, trả tiền mặt cho tài xế — **tài xế nhận 100%, app không thu phí**. Muốn biết con số cụ thể thì bạn chọn điểm đón / điểm đến trong /dua-don, app sẽ hiện giá tham khảo trước khi đặt.";
  }
  return null;
}

// Mua phải xe gian
function stolenGoods(q: string, c: V9Ctx): string | null {
  const all = [...c.hist.slice(-3), q].map(N).join(" ");
  if (!VN(/\b(xe gian|đồ gian|hàng gian|xe ăn trộm|xe trộm|đồ ăn cắp|hàng ăn cắp|xe không giấy tờ)\b/).test(all)) return null;
  const n = N(q);
  if (!VN(/\b(xe gian|đồ gian|bị lừa|công an|giữ xe|thu xe|tạm giữ|làm sao|làm gì|giờ sao|mất tiền|đòi lại)\b/).test(n)) return null;
  if (said(c.last, "Mua phải xe gian") && VN(/\b(giữ xe|thu xe|tạm giữ|thu giữ|lấy xe)\b/).test(n))
    return "Công an tạm giữ xe để xác minh nguồn gốc là đúng quy trình, bạn đừng lo mình bị coi là người có lỗi nha — người mua không biết là xe gian thì thường chỉ phải giao lại xe. Vài điều nên làm:\n• Xin / giữ bản sao **biên bản tạm giữ**, ghi lại tên và số điện thoại cán bộ thụ lý\n• Khai rõ, đưa đủ bằng chứng mua bán để được ghi nhận là **người mua ngay tình**\n• Hỏi cán bộ về cách **đòi lại tiền từ người bán** (thường là yêu cầu người bán hoàn trả, hoặc khởi kiện dân sự nếu họ không trả)\n\nNếu số tiền lớn, nên hỏi thêm luật sư / trợ giúp pháp lý để biết quyền lợi cụ thể của bạn.";
  return "Mua phải xe gian thì vừa mất tiền vừa lo lắm 😔 Lomi không phải luật sư, nhưng thường nên làm vầy:\n• **Hợp tác với công an**, khai rõ mua của ai, ở đâu, giá bao nhiêu, lúc nào\n• Đưa hết **bằng chứng**: giấy mua bán (nếu có), tin nhắn, số điện thoại, tài khoản người bán, biên lai chuyển tiền, người làm chứng\n• Xe gian thường phải **trả lại cho chủ thật**; còn số tiền đã trả, bạn có quyền **yêu cầu người bán hoàn lại** — đề nghị công an ghi nhận bạn là người mua không biết đó là xe gian\n• Nếu cần, hỏi thêm **luật sư** hoặc trợ giúp pháp lý ở địa phương về quyền lợi của bạn\n\nLần sau mua xe cũ: kiểm tra **giấy đăng ký xe** đúng tên người bán, số khung số máy khớp giấy, làm hợp đồng mua bán có công chứng / chứng thực.";
}

// Buồn, trống rỗng kéo dài
function longSad(q: string, c: V9Ctx): V9Reply | null {
  if (!["sad", "depress", "lost", "heavyheart"].includes(c.lastHeart ?? "")) return null;
  const n = N(q);
  const t = low(q);
  const m = t.match(/(\d+|một|hai|ba|vài|mấy) (tuần|tháng|năm)/u);
  if (!m || !VN(/\b(kéo dài|được|rồi|nay|lâu)\b/).test(n)) return null;
  const long = m[2] !== "tuần" || !/^(1|một)$/u.test(m[1]);
  if (!long) return null;
  return { heart: c.lastHeart, text: `${m[0][0].toUpperCase()}${m[0].slice(1)} rồi mà vẫn thấy buồn, trống rỗng như vậy thì mệt lắm 😔 Cảm ơn bạn đã nói ra.\n\nBuồn hoặc trống rỗng **kéo dài trên 2 tuần**, gần như ngày nào cũng vậy, là lúc nên được **bác sĩ / chuyên gia tâm lý** đánh giá — có thể là trầm cảm, và trầm cảm **điều trị được**, không phải do bạn yếu đuối. Lomi có bài **sàng lọc nhanh 4 câu** (gõ “sàng lọc”) để bạn có thêm thông tin trước khi đi khám.\n\nLomi hỏi thật một câu nha, vì Lomi quan tâm: trong những ngày này, có lúc nào bạn nghĩ tới chuyện không muốn sống nữa?` };
}

// Chỉ nêu tuổi người thân ("ông a 80 tuổi") — hỏi tiếp, không đáp "chưa hiểu"
function ageOnly(q: string): V9Reply | null {
  const m = low(q).trim().match(/^(ông|bà|mẹ|ba|bố|má|cha|ông nội|bà nội|ông ngoại|bà ngoại)(?: (?:a|anh|em|e|mình|tôi|tui|chị|c|tớ|t))? (?:năm nay |giờ |đã )?(\d{2,3}) tuổi(?: rồi)?[.!]?$/u);
  if (!m) return null;
  const w = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return { about: { text: m[1], kind: "third" }, text: `${w} ${m[2]} tuổi rồi hả 😊 ${w} dạo này sức khoẻ sao rồi bạn, có chuyện gì cần Lomi giúp không?` };
}

// Câu mở đầu "con a 3 tuổi bị sốt 39 độ" / "con a 8 tháng bị ho" — nói theo trẻ, không đọc "8 tháng" là đã bị 8 tháng
function kidIntro(q: string): V9Reply | null {
  const t = low(q);
  const am = t.match(/(?:con|bé|em bé|cháu|con trai|con gái)(?: \S+){0,2} (\d+) (tháng|tuổi|tuần)(?: tuổi)?/u);
  if (!am) return null;
  const n = N(q);
  const fever = VN(/\b(sốt|nóng sốt)\b/).test(n);
  const cough = VN(/\b(ho|khò khè)\b/).test(n);
  const gi = VN(/\b(tiêu chảy|đi ngoài|đi phân lỏng)\b/).test(n);
  if (!fever && !cough && !gi) return null;
  if (urgentOf(q)) return null;
  const months = am[2] === "tuổi" ? Number(am[1]) * 12 : am[2] === "tuần" ? Number(am[1]) / 4 : Number(am[1]);
  // Sốt, tiêu chảy ở trẻ đã có thẻ kiến thức riêng cho TRẺ EM (lớp sức khoẻ) — ở đây chỉ nhận câu bé dưới 1 tuổi bị ho mà chưa nói bao lâu
  //   (trước đây "con a 8 tháng bị ho" bị đọc "8 tháng" thành đã ho 8 tháng: "Bị lâu như vậy rồi thì nên đi khám").
  if (fever || gi || !cough || months >= 12 || VN(/\b(\d+|mấy|vài) (ngày|hôm|tuần)( nay| rồi)?\b/).test(n)) return null;
  const age = `${am[1]} ${am[2]}`;
  const about = { text: "bé", kind: "third" as const };
  const RED = "🚨 Đi cấp cứu ngay nếu bé co giật, li bì khó đánh thức, khó thở / thở rút lõm ngực, tím môi, nổi chấm đỏ tím không mất khi ấn, nôn liên tục không uống được, hoặc ít đi tiểu.";
  if (fever) {
    const deg = t.match(/(\d{2}(?:[.,]\d)?)\s*(?:độ|°)/u)?.[1];
    return { keepHealth: true, about, text: `Bé ${age} sốt${deg ? ` ${deg.replace(".", ",")} độ` : ""} thì ba mẹ lo lắm ha 🥺 Với trẻ, điều quan trọng nhất là xem **bé có tỉnh táo, còn chơi, còn ăn uống được không**.\n\nỞ nhà:\n• Cho bé mặc thoáng, uống nhiều nước / bú nhiều hơn\n• Lau người bằng **nước ấm** (không dùng nước lạnh, cồn, chanh)\n• Thuốc hạ sốt cho trẻ dùng **đúng liều theo cân nặng** ghi trên hộp, đúng khoảng cách giữa các lần — không chắc thì hỏi dược sĩ, đừng tự tăng liều\n\nNên đưa bé đi khám nếu sốt cao không hạ dù đã dùng thuốc đúng cách, sốt quá 2–3 ngày, hoặc bé mệt, bỏ ăn.\n${RED}\n\nBé sốt từ khi nào, và có ho, sổ mũi, nôn hay tiêu chảy kèm theo không?` };
  }
  if (cough && months < 12)
    return { keepHealth: true, about, text: `Bé ${age} bị ho thì ba mẹ để ý kỹ hơn người lớn một chút nha 🥺 Bé nhỏ dễ bị viêm tiểu phế quản, viêm phổi.\n\nỞ nhà: nhỏ nước muối sinh lý, hút mũi cho bé dễ thở, cho bú nhiều cữ nhỏ, giữ ấm vừa phải, tránh khói thuốc. **Không tự cho bé uống thuốc ho** hay kháng sinh khi bác sĩ chưa kê.\n\nĐưa bé đi khám **trong hôm nay** nếu bé sốt, **thở nhanh** (2–12 tháng: từ 50 lần/phút trở lên khi nằm yên), khò khè, bú kém, hoặc ho nhiều tới nôn trớ.\n🚨 Cấp cứu ngay nếu bé rút lõm ngực khi thở, tím môi, ngưng thở từng lúc, bỏ bú, li bì.\n\nBé ho mấy ngày rồi, có sốt hay khò khè không?` };
  if (cough)
    return { keepHealth: true, about, text: `Bé ${age} bị ho thì phần lớn là do cảm lạnh, sẽ đỡ dần sau 1–2 tuần 💚\n\nỞ nhà: cho bé uống đủ nước, nhỏ nước muối sinh lý, giữ ấm vừa phải, tránh khói thuốc; trẻ trên 1 tuổi có thể dùng một chút mật ong ấm cho dịu cổ. **Không tự cho bé uống kháng sinh**.\n\nĐưa bé đi khám nếu ho kéo dài quá 2–3 tuần, sốt cao, thở nhanh, khò khè, ho từng cơn tới tím mặt / nôn, hoặc bé mệt, bỏ ăn.\n${RED}\n\nBé ho mấy ngày rồi, có sốt kèm theo không?` };
  return { keepHealth: true, about, text: `Bé ${age} bị tiêu chảy thì điều quan trọng nhất là **bù nước** nha 💧\n• Cho bé uống **oresol** loại dành cho trẻ, **pha đúng lượng nước ghi trên gói**, từng thìa nhỏ, sau mỗi lần đi ngoài cho uống thêm\n• Vẫn cho bé bú / ăn bình thường, chia nhiều bữa nhỏ\n• **Không tự cho thuốc cầm tiêu chảy**\n\nĐể ý dấu hiệu **mất nước**: ít đi tiểu, khóc không có nước mắt, môi khô, mắt trũng, lừ đừ — có là đưa bé đi khám ngay.\n${RED}\n\nBé đi mấy lần rồi, có nôn hay sốt kèm theo không?` };
}

/** QA V9 — chạy cùng chỗ với QA V8 (sau lớp khủng hoảng của chính người dùng, trước mạch nghe kể / khung câu). */
export function v9Reply(q: string, c: V9Ctx): V9Reply | null {
  const s = kidIntro(q) ?? pregnancy(q, c) ?? babyBreath(q, c) ?? elderFall(q, c) ?? burnFollow(q, c) ?? kidFever(q, c) ?? longSad(q, c);
  if (s) return s;
  const ao = ageOnly(q);
  if (ao) return ao;
  const t = aboutLomi(q) ?? appFollow(q, c) ?? jokeFollow(q, c) ?? lostWallet(q, c) ?? noisyNeighbor(q, c) ?? stolenGoods(q, c) ?? brokeUntilPayday(q, c) ?? savingPlan(q, c) ?? giftIdeas(q, c) ?? cookBasic(q) ?? warmFood(q, c);
  return t ? { text: t } : null;
}
