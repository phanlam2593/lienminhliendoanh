// 22/11 (bộ test trộn 40 đoạn — đổi chủ đề giữa chừng, gõ tắt): các câu nối tiếp mà luồng cũ trả lời lệch.
//   Mỗi luật chỉ bật khi đúng ngữ cảnh mấy lượt trước; nội dung sức khoẻ theo NHS (Anh), không nêu liều thuốc (quy tắc #62).
import { normalizeVi } from "./lomiFaq";
import { VN } from "./viMatch";

export type MixReply = { text: string; health?: boolean; heart?: boolean };

const T = (s: string) => ` ${normalizeVi(s)} `;

// ── bạo lực gia đình: say xỉn đập đồ / đánh — an toàn trước, không coi là "vợ chồng nhạt" ──
const DV = VN(/\b((say|xỉn|nhậu|uống rượu)( \S+){0,5} (đập đồ|đập phá|ném đồ|đánh|chửi bới|đuổi|doạ|dọa)|đập phá đồ|đập đồ)\b/); // "ba đánh mẹ" có luồng riêng (bạo lực với người thân)
const DV_FOLLOW = VN(/\b(sợ|lo|tối nay|lại uống|lại say|lại nhậu|làm sao|phải làm gì|nên làm gì|bỏ đi|ly hôn|chịu không nổi)\b/);
function dvText(planNow: boolean, who: string): string {
  return [
    planNow
      ? `Tối nay ${who === "Chồng" ? "ảnh" : "người đó"} lại uống mà bạn đã thấy sợ — mình **chuẩn bị trước cho an toàn** nha 💚 Say rồi đập đồ là dấu hiệu bạo lực, không phải chuyện giận nhau thường.`
      : `${who} say về đập đồ, bạn thấy sợ — đó là dấu hiệu **bạo lực gia đình**, không phải chuyện ${who === "Chồng" ? "vợ chồng nhạt hay " : ""}giận nhau thường 💚 An toàn của bạn (và con, nếu có) là trên hết.`,
    "• Đang bị đánh, đe doạ, hoặc thấy **nguy hiểm ngay** → gọi **113**, ra khỏi nhà sang nhà người thân / hàng xóm",
    "• **Lên kế hoạch trước** khi người đó về: điện thoại sạc đầy, biết sẵn chỗ sang lánh, để giấy tờ quan trọng và ít tiền ở chỗ lấy nhanh được",
    `• Lúc ${who === "Chồng" ? "ảnh" : "người đó"} say: **đừng cãi lý**, tránh xa bếp và chỗ có dao, kéo, giữ con ở phòng khác; thấy bắt đầu nóng là ra ngoài sớm`,
    "• Kể cho **một người tin cậy** biết (người nhà, bạn thân), hẹn một câu báo hiệu khi cần họ tới / gọi giúp",
    "• Có thể tìm hỗ trợ ở **công an phường**, **Hội Liên hiệp Phụ nữ phường / xã**; con bị ảnh hưởng thì có tổng đài bảo vệ trẻ em **111** (miễn phí, 24/7)",
    "\nBạn không có lỗi khi người đó đập phá. Bạn có đang an toàn ngay lúc này không?",
  ].join("\n");
}

// ── sắp thi mà run (trước kỳ thi — khác "thi xong bị điểm kém") ──
const PRE_EXAM = VN(/\b(sắp thi|mai thi|chuẩn bị thi|tuần sau thi|sắp kiểm tra|mai kiểm tra|trước (khi|giờ) thi|sắp phỏng vấn|mai phỏng vấn)\b/);
const NERVE = VN(/\b(run|hồi hộp|lo|sợ|căng thẳng|áp lực|bớt run|mẹo|trượt|rớt|không ngủ được)\b/);

// ── buồn / chia tay rồi "không muốn ăn gì" — đây là chuyện lòng, không phải hỏi món ──
const HEART_CTX = VN(/\b(chia tay|thất tình|bị bỏ|người yêu bỏ|buồn quá|buồn lắm|tan vỡ|ly hôn|mất người thân|mất việc)\b/);
const NO_EAT = VN(/\b(không|ko|k|chẳng|hông) (muốn|thèm|nuốt nổi|ăn nổi|ăn được) (ăn|gì)( gì)?( hết| cả| nổi)?\b/);

// ── nghén ──
const NAUSEA_PREG = VN(/\b(nghén|ốm nghén|bị nghén|buồn nôn khi (mang thai|có bầu)|nôn khi (mang thai|có bầu))\b/);
const PREG_CTX = VN(/\b(có bầu|mang thai|có thai|bà bầu|đang bầu|bầu \d+|thai \d+)\b/);
const NAUSEA = VN(/\b(buồn nôn|nôn nhiều|ói|nôn ói|hay nôn)\b/);
const NAUSEA_TEXT =
  "Ốm nghén mệt lắm, nhưng thường **đỡ dần sau khoảng tuần 16–20** của thai kỳ 💚 Mấy điều có thể giúp:\n" +
  "• **Nghỉ ngơi** nhiều — mệt làm nghén nặng hơn\n" +
  "• Sáng dậy **ăn chút đồ khô** (bánh quy lạt, bánh mì nướng) trước khi ra khỏi giường\n" +
  "• **Chia nhỏ bữa**, ăn ít một mà nhiều lần, ưu tiên món **nhiều tinh bột, ít béo** (cơm, cháo, bánh mì); đồ **nguội** thường dễ ăn hơn đồ nóng\n" +
  "• **Uống nước từng ngụm nhỏ**, nhiều lần trong ngày\n" +
  "• Tránh mùi, món làm buồn nôn; mở cửa cho thoáng khi nấu\n" +
  "• **Gừng** có thể giúp một số người (trà gừng, bánh gừng) — muốn dùng dạng viên bổ sung thì hỏi bác sĩ / dược sĩ trước\n\n" +
  "⚠️ Đi khám ngay nếu: **nôn tới mức không giữ được đồ ăn, nước uống**, nước tiểu **rất sẫm** hoặc **hơn 8 tiếng không đi tiểu**, chóng mặt khi đứng, đau bụng, sốt, **nôn ra máu** — có thể là nghén nặng (cần truyền dịch, điều trị). Thuốc chống nôn khi mang thai thì chỉ dùng khi bác sĩ kê.\n\n" +
  "_Nguồn: NHS (Anh) — Vomiting and morning sickness in pregnancy._";

// ── trẻ sốt: ăn / uống được gì ──
const KID_FEVER = VN(/\b(bé|con|cháu|trẻ)( \S+){0,6} (sốt|nóng sốt)|sốt( \S+){0,3} (bé|con)\b/);
const EAT_Q = VN(/\b((ăn|bú|uống)( \S+){0,4} (được không|đc ko|được ko|đc k|được k|gì|thế nào|sao)|(ăn|uống) (được )?\S+( \S+)? (không|ko|k|hông))\b/);
const KID_FEVER_EAT =
  "Bé sốt **ăn cháo được** nha 👍 Không cần kiêng món gì đặc biệt:\n" +
  "• Quan trọng nhất là **cho bé uống đủ nước** (bé còn bú thì cứ cho bú mẹ / bú sữa như thường), uống từng ít một nhiều lần\n" +
  "• **Bé muốn ăn thì cho ăn** món mềm, dễ tiêu (cháo, súp, sữa chua…); bé chán ăn vài bữa thì **đừng ép**, miễn là vẫn uống đủ\n" +
  "• Để ý dấu hiệu **thiếu nước**: ít đi tiểu (tã khô lâu), môi khô, khóc không có nước mắt, li bì → đưa bé đi khám\n" +
  "• Bé lừ đừ, khó đánh thức, khó thở, co giật, nổi ban không mất khi ấn → đi cấp cứu / gọi **115**\n\n" +
  "_Nguồn: NHS (Anh) — Fever in children._";

// ── dị ứng: lỡ ăn rồi, giờ "ngứa nhẹ ở tay thôi" ──
const ALLERGY_CTX = VN(/\b(dị ứng|bị dị ứng)\b/);
const ATE_CTX = VN(/\b(lỡ ăn|vừa ăn|mới ăn|đã ăn|ăn phải|ăn nhầm)\b/);
const MILD = VN(/\b(ngứa nhẹ|chỉ ngứa|hơi ngứa|nổi (vài|ít) (nốt|mẩn)|mẩn nhẹ|đỏ nhẹ|ngứa (ở )?(tay|chân)( thôi)?|nhẹ thôi)\b/);
const ALLERGY_MILD =
  "Ngứa nhẹ ở tay thôi thì **chưa phải dấu hiệu nguy hiểm**, nhưng mình **theo dõi sát trong khoảng 2 giờ tới** nha (phản ứng có thể nặng lên sau đó):\n" +
  "• **Không ăn thêm** món đó; rửa tay, rửa miệng\n" +
  "• Ngứa khó chịu thì có thể hỏi **dược sĩ** về thuốc chống dị ứng (kháng histamin) hợp với bạn — nói rõ đang dùng thuốc gì khác\n" +
  "• Có người ở gần trong lúc theo dõi\n\n" +
  "🚨 Gọi **115** ngay nếu thấy: **sưng môi, lưỡi, họng**, khó nuốt, **khò khè, khó thở**, chóng mặt, choáng, nổi mẩn lan nhanh khắp người — có bút adrenaline thì dùng ngay.\n\n" +
  "_Nguồn: NHS (Anh) — Food allergy; Anaphylaxis._";

// ── bỏng nhẹ: "đỏ thôi không phồng" ──
const BURN_CTX = VN(/\b(bỏng|phỏng|chạm nồi|nước sôi|bàn là|bàn ủi)\b/);
const BURN_MILD = VN(/\b(đỏ thôi|chỉ đỏ|không phồng|ko phồng|k phồng|chưa phồng|không rộp|hết đau|đỡ đau|nhẹ thôi)\b/);
const BURN_MILD_TEXT =
  "Đỏ mà **không phồng rộp** thường là **bỏng nhẹ** (bỏng nông) 👍 Chăm vầy nha:\n" +
  "• Nếu chưa làm mát đủ thì để dưới **vòi nước mát chảy nhẹ khoảng 20 phút** — không dùng đá, nước đá\n" +
  "• Tháo nhẫn, đồ chật ở gần chỗ bỏng (ngón tay dễ sưng)\n" +
  "• Che lỏng bằng **màng bọc thực phẩm** hoặc gạc sạch; **không bôi kem đánh răng, mỡ, nước mắm, dầu**\n" +
  "• Đau thì hỏi **dược sĩ** thuốc giảm đau hợp với tuổi của bé\n" +
  "• Đừng chọc vỡ nếu sau đó nổi bóng nước\n\n" +
  "🧑‍⚕️ Cho bé đi khám nếu: vết bỏng **to hơn lòng bàn tay của bé**, **phồng rộp**, da **trắng / xám / cháy đen**, bỏng ở mặt, tay chân khớp, bộ phận sinh dục, bé **còn rất nhỏ**, hoặc mấy ngày sau **sưng đỏ lan, chảy mủ, sốt** (nhiễm trùng).\n\n" +
  "_Nguồn: NHS (Anh) — Burns and scalds._";

// ── thèm đồ cay ──
const SPICY = VN(/^\s*(thèm|muốn ăn|đang thèm) (đồ |món )?(cay|cay cay)\b/);

// ── app đơ: "làm sao giờ" sau khi đã chỉ các bước ──
const APP_LAG_PREV = /App đang chậm \/ đơ/u;
const STILL = VN(/^\s*(làm sao giờ|giờ sao|vẫn (bị|đơ|lag|vậy)|thử rồi|làm rồi|vẫn không được)\b/);

// ── học ngoại ngữ: "mỗi ngày học bao lâu" ──
const LEARN_CTX = VN(/\b(học tiếng|ngoại ngữ|tiếng anh|tiếng trung|tiếng hàn|tiếng nhật|học từ vựng)\b/);
const HOW_LONG = VN(/\b(mỗi ngày|một ngày|1 ngày)( \S+){0,3} (bao lâu|mấy tiếng|bao nhiêu (phút|tiếng))\b/);

export function mixReply(raw: string, prevUser: string[], lastAssistant = ""): MixReply | null {
  const n = T(raw);
  const pu = prevUser.slice(-3).map(T);
  const thread = pu.join(" ") + n;

  if (DV.test(n) || (pu.some((t) => DV.test(t)) && DV_FOLLOW.test(n)))
    return { text: dvText(VN(/\b(tối nay|lại uống|lại say|lại nhậu)\b/).test(n), VN(/\b(chồng|ck|ông xã|ảnh|ổng)\b/).test(thread) ? "Chồng" : "Người nhà"), heart: true };

  if ((PRE_EXAM.test(n) && NERVE.test(n)) || (pu.some((t) => PRE_EXAM.test(t)) && NERVE.test(n) && !VN(/\b(điểm (kém|thấp)|thi (rớt|trượt) rồi|bị rớt|đã rớt)\b/).test(n)))
    return {
      heart: true,
      text: "Run trước khi thi là **bình thường** lắm nha — hơi hồi hộp còn giúp mình tỉnh táo hơn 💪 Mấy cách cho bớt run:\n" +
        "• **Ôn bằng cách làm thử đề** có bấm giờ — quen dạng bài thì bớt sợ nhiều\n" +
        "• Đêm trước **ngủ đủ**, đừng thức khuya học dồn; sáng **ăn nhẹ**, đến sớm một chút\n" +
        "• Lúc run: **hít vào 4 nhịp – giữ 4 – thở ra 6 nhịp**, làm vài lần cho nhịp tim chậm lại\n" +
        "• Vào phòng thi: đọc lướt cả đề, **làm câu dễ trước**, câu khó để sau\n" +
        "• Tự nhắc: một kỳ thi **không quyết định hết** con người mình; làm hết sức là đủ\n\n" +
        "Bạn thi môn gì, còn mấy ngày nữa? Lomi giúp bạn chia lịch ôn nha.",
    };

  if (NO_EAT.test(n) && pu.some((t) => HEART_CTX.test(t)))
    return {
      heart: true,
      text: "Buồn tới mức không muốn ăn gì là chuyện **rất hay gặp** sau chia tay, Lomi hiểu mà 🥺 Cơ thể đang chịu chung nỗi buồn với mình đó.\n" +
        "• Không cần ăn bữa đầy đủ — **vài miếng dễ nuốt** thôi cũng được: cháo, súp, sữa, sữa chua, trái cây\n" +
        "• **Uống đủ nước**, nhất là khi khóc nhiều, mất ngủ\n" +
        "• Ăn cùng một người bạn, người nhà thường dễ ăn hơn ăn một mình\n" +
        "• Nếu kéo dài **vài tuần**, sụt cân nhiều, mất ngủ, không làm nổi việc gì → nói chuyện với người thân hoặc bác sĩ / chuyên gia tâm lý nha\n\n" +
        "Hôm nay bạn đã ăn được chút gì chưa?",
    };

  if (NAUSEA_PREG.test(n) || (pu.some((t) => PREG_CTX.test(t)) && (NAUSEA.test(n) || VN(/\b(đỡ nghén|bớt nghén|mẹo)\b/).test(n))))
    return { text: NAUSEA_TEXT, health: true };

  if (EAT_Q.test(n) && (VN(/\b(bé|con|cháu|trẻ|cháo|bú|sữa)\b/).test(n)) && pu.some((t) => KID_FEVER.test(t)) && !VN(/\b(thuốc|hạ sốt)\b/).test(n)) return { text: VN(/\bcháo\b/).test(n) ? KID_FEVER_EAT : KID_FEVER_EAT.replace("Bé sốt **ăn cháo được** nha 👍", "Bé sốt vẫn **ăn uống bình thường được** nha 👍"), health: true };

  if (MILD.test(n) && pu.some((t) => ALLERGY_CTX.test(t)) && pu.some((t) => ATE_CTX.test(t)) && !VN(/\b(sưng|khó thở|khò khè|môi)\b/).test(n))
    return { text: ALLERGY_MILD, health: true };

  if (BURN_MILD.test(n) && pu.some((t) => BURN_CTX.test(t))) return { text: BURN_MILD_TEXT, health: true };

  if (SPICY.test(n))
    return { text: "Thèm cay hả 🌶️ Mấy món cay hay được ghé nè: **lẩu Thái**, **bún bò Huế**, **mì cay**, **ốc xào sa tế / me**, **gà nướng muối ớt**, **lẩu kim chi**. Ưng món nào nói Lomi, Lomi tìm quán có món đó cho bạn liền nha!" };

  if (APP_LAG_PREV.test(lastAssistant) && STILL.test(n))
    return { text: "Thử mấy bước đó rồi mà vẫn đơ thì làm tiếp vầy nha 🙏\n1. Kiểm tra **bản cập nhật** — có thông báo bản mới thì bấm **Cập nhật**, rồi **đóng hẳn app mở lại**\n2. Khởi động lại điện thoại\n3. Đang dùng trên trình duyệt thì thử **xoá bộ nhớ đệm (cache)** của trang, hoặc mở bằng trình duyệt khác\n4. Vẫn bị: vào **Hồ sơ → ⋯ → Trợ giúp & Liên hệ** gửi cho Ban quản trị — ghi rõ **tên điện thoại**, bị ở **trang nào**, **lúc mở app hay lúc bấm gì** để mọi người sửa nhanh" };

  if (HOW_LONG.test(n) && pu.some((t) => LEARN_CTX.test(t)))
    return { text: "Học **đều mỗi ngày quan trọng hơn học lâu** nha 📚 Với người đi làm / đi học bận, khoảng **20–30 phút mỗi ngày** đều đặn thường hiệu quả hơn học dồn 3 tiếng vào cuối tuần.\n• Chia nhỏ: 10 phút nghe (podcast, video có phụ đề) + 10 phút từ vựng (ôn lại từ cũ trước) + 5–10 phút nói / viết vài câu\n• Gắn vào một thói quen có sẵn (sau ăn sáng, lúc đi xe buýt) cho dễ duy trì\n• Mỗi tuần dành một buổi dài hơn để ôn và tự kiểm tra\n\nBạn đang học để thi, đi làm hay đi du lịch? Lomi gợi ý cách học sát hơn nha." };

  return null;
}

// ── nấu ăn: hỏi tiếp sau công thức ("cá lóc nha", "bỏ thơm vào lúc nào") ──
const RECIPE = /^🍳 \*\*(.+?)\*\*/u;
const SYN: Record<string, string[]> = { thơm: ["thơm", "dứa", "khóm"], dứa: ["dứa", "thơm", "khóm"], khóm: ["khóm", "dứa", "thơm"] };
export function cookFollow(raw: string, recentAssistant: string[]): string | null {
  // công thức gần nhất trong vài lượt trước (lượt giữa có thể là "cá lóc nha" → mẹo sơ chế cá)
  const lastAssistant = recentAssistant.slice(-3).reverse().find((t) => RECIPE.test(t)) ?? "";
  const m = lastAssistant.match(RECIPE);
  if (!m) return null;
  const dish = m[1];
  const low = raw.normalize("NFC").toLowerCase().replace(/[?!.…]+$/u, "").trim();
  const when = low.match(/^(?:bỏ|cho|thả|thêm|nêm)\s+(.{1,20}?)\s+(?:vào\s+)?(?:lúc nào|khi nào|trước hay sau|lúc mấy giờ|bước nào)/u);
  if (when) {
    const ing = when[1].trim();
    const keys = SYN[ing] ?? [ing];
    const steps = lastAssistant.split("\n").filter((l) => l.startsWith("• "));
    const hits = steps.filter((l) => keys.some((k) => l.toLowerCase().includes(k)));
    const st = hits.find((l) => /^• (Thêm|Cho|Bỏ|Thả)/u.test(l)) ?? hits[hits.length - 1];
    if (st) return `Theo cách nấu **${dish}** lúc nãy thì **${ing}** cho ở bước này nha 👇\n${st}\n\n💡 Mẹo: trái cây chua (thơm / dứa, cà chua) cho **sau khi cá chín** thì canh giữ được vị chua ngọt, không bị nhừ; rau thơm (ngò om, ngò gai) **tắt bếp rồi mới rắc** cho thơm.`;
    return `Trong cách nấu **${dish}** lúc nãy Lomi chưa ghi bước cho **${ing}** 🙏 Thường thì rau củ lâu chín cho trước, rau thơm cho sau cùng lúc tắt bếp nha.`;
  }
  const fish = low.match(/^(?:dùng |nấu |làm |chọn )?(cá (?:lóc|basa|diêu hồng|điêu hồng|bông lau|hú|kèo|trê|rô|thu|ngừ|chép|trắm|khoai|chim))(?: nha| nhé| nhe| đi| á| thôi)?$/u);
  if (fish && /cá/u.test(dish.toLowerCase()))
    return `**${fish[1].charAt(0).toUpperCase() + fish[1].slice(1)}** nấu ${dish.toLowerCase()} là hợp lắm 👍\n• Cá cắt khúc vừa ăn, **rửa với muối hoặc chanh** cho bớt nhớt, bớt tanh, để ráo\n• Có thể ướp sơ chút nước mắm, tiêu khoảng 10 phút cho cá đậm\n• Thả cá khi nước **đang sôi**, đừng khuấy mạnh cho cá khỏi nát; cá chín (thịt trắng, tách thớ) thì cho rau củ và nêm\n\nCác bước còn lại giữ như công thức ở trên nha 😋`;
  return null;
}
