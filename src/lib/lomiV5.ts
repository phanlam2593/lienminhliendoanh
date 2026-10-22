// ─────────────────────────────────────────────────────────────────────────────
// QA V5 (22/10, tự soạn: tin nhắn dài nhiều ý + hội thoại 10–15 lượt) — chạy trên máy.
//   • tin dài kể NHIỀU chuyện cùng lúc → gọi tên từng chuyện, hỏi muốn gỡ chuyện nào trước (không bắt nhầm một ý phụ)
//   • góp vốn với bạn mà lỗ, chọn giữa hai việc, nhiều câu hỏi đánh số, uống rượu "giã rượu", mẹ lớn tuổi chóng mặt khi đứng dậy
//   • câu nối trong mạch sức khoẻ ("uống nước ấm thì đỡ", "nếu 3 ngày không đỡ thì sao"), kể chuyện cười khi đang buồn chán
// ─────────────────────────────────────────────────────────────────────────────
import { matchFaq, normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";
import { heartThemeOf } from "@/lib/lomiHeart";
import { jokeText } from "@/lib/lomiChat";

export type V5Ctx = { last?: string; lastHeart?: string; inHealth?: boolean; healthLabel?: string };
const N = (q: string) => ` ${normalizeVi(q)} `;
const words = (q: string) => q.trim().split(/\s+/).length;

// ── Tin dài kể nhiều chuyện ──
const LABEL: [RegExp, string][] = [
  [/^(work|boss|jobloss|burnout|overwork|colleague)/, "chuyện ở chỗ làm"],
  [/^(love|fight|cold|breakup|stayorgo|jealous|cheat|ex|crush|onesided|longdist|mindread|toxic|space|testlove|privacy|snoop)/, "chuyện với người yêu"],
  [/^(family|parents|sidesfam|kids|inlaw)/, "chuyện gia đình"],
  [/^(friends|debtfriend|betray)/, "chuyện với bạn bè"],
  [/^(money|couplemoney|saving|debt)/, "chuyện tiền bạc"],
  [/^(study|exam)/, "chuyện học hành"],
  [/^(insomnia|tired)/, "chuyện giấc ngủ, mệt mỏi"],
];
const labelOf = (th: string) => LABEL.find(([re]) => re.test(th))?.[1];
const BOSS = VN(/\b(sếp|công ty|chỗ làm|đồng nghiệp|đi làm)\b/);
const LOVE = VN(/\b(người yêu|ny|bạn gái|bạn trai|vợ|chồng|crush)\b/);
export function multiIssueReply(q: string): string | null {
  if (words(q) < 25) return null;
  const segs = q.split(/[,.;!?\n]+|\s+(?:còn|về nhà thì|rồi|mà|nhưng)\s+/u).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3);
  const labels: string[] = [];
  for (const sg of segs) {
    const n = N(sg);
    const th = heartThemeOf(sg);
    const lb = (th && labelOf(th)) ?? (BOSS.test(n) ? "chuyện ở chỗ làm" : LOVE.test(n) ? "chuyện với người yêu" : undefined);
    if (lb && !labels.includes(lb)) labels.push(lb);
  }
  if (labels.length < 2) return null;
  const ask = q.match(/(?:không biết |chả biết |chẳng biết )?nên ([^,.?!]{3,60}?) hay ([^,.?!]{2,50}?)(?:\s+nữa)?[?.!]*$/iu);
  return `Nghe một lúc dồn tới mấy chuyện, chắc bạn mệt lắm 😮‍💨 Lomi nghe thấy:\n${labels.map((l) => `• ${l[0].toUpperCase()}${l.slice(1)}`).join("\n")}\n\n${ask ? `Bạn đang phân vân nên ${ask[1].trim()} hay ${ask[2].trim()} — mình bàn chuyện đó trước nha? Hay` : "Mình gỡ từng chuyện một nha —"} bạn muốn bắt đầu từ chuyện nào trước?`;
}

// ── Các tình huống dài cụ thể ──
function longCases(q: string): string | null {
  const n = N(q);
  // Góp vốn với bạn, quán lỗ, bất đồng có bỏ thêm tiền không.
  if (VN(/\b(góp vốn|hùn vốn|chung vốn|làm chung)\b/).test(n) && VN(/\b(lỗ|thua lỗ|không có lời|âm)\b/).test(n))
    return "Vừa lo tiền vừa sợ mất luôn tình bạn thì nặng lòng thật 😔 Mình tách hai chuyện ra cho dễ nghĩ nha:\n\n**Chuyện quán:** trước khi bỏ thêm tiền, hai người cùng ngồi xem số liệu thật — lỗ vì sao (ít khách, giá vốn cao, mặt bằng đắt…), có thay đổi cụ thể nào làm khác đi không, và đặt **mốc dừng lỗ** rõ ràng (vd thử thêm 2–3 tháng với kế hoạch cụ thể, không cải thiện thì dừng). Bỏ thêm tiền mà không đổi cách làm thì thường chỉ kéo dài khoản lỗ.\n\n**Chuyện tình bạn:** nói thẳng nỗi lo của mình trước khi nói chuyện tiền: “Tui sợ chuyện này làm mất tình bạn của hai đứa, nên mình bàn cho rõ nha.” Nếu một người muốn rút, có thể thoả thuận để người kia mua lại phần vốn, viết ra giấy cho rõ ràng.\n\nHiện giờ quán lỗ chủ yếu vì đâu, bạn nghĩ sao?";
  // Mẹ / người lớn tuổi chóng mặt khi đứng dậy, có tiểu đường / huyết áp.
  if (VN(/\b(chóng mặt|choáng|xây xẩm|hoa mắt)\b/).test(n) && VN(/\b(khi |lúc |mỗi khi )?(đứng dậy|đứng lên|ngồi dậy|thay đổi tư thế)\b/).test(n) && VN(/\b(mẹ|ba|bố|ông|bà|người già|lớn tuổi|\d{2} tuổi)\b/).test(n))
    return "Người lớn tuổi đang uống thuốc tiểu đường, huyết áp mà **chóng mặt khi đứng dậy** thì nên cho đi khám **sớm trong vài ngày tới** — có thể do huyết áp tụt khi đổi tư thế, đường huyết thấp, thiếu nước vì ăn uống kém, hoặc thuốc đang hơi \"quá tay\". Bác sĩ có thể cần chỉnh thuốc, nên **đừng tự ngưng hay giảm thuốc** ở nhà.\n\nTrong lúc chờ khám:\n• Dặn mẹ **đứng dậy từ từ**: ngồi ở mép giường một lúc rồi mới đứng, vịn tay chắc chắn để tránh té ngã\n• Cho mẹ uống đủ nước, ăn đủ bữa nhỏ, không bỏ bữa khi đang dùng thuốc tiểu đường\n• Nếu có máy: đo huyết áp lúc ngồi và lúc mới đứng dậy, đo đường huyết khi chóng mặt — ghi lại mang theo khi khám\n• Mang theo đủ các thuốc mẹ đang uống\n\n🚨 Gọi **115** nếu mẹ ngất, té ngã đập đầu, nói khó, méo miệng, yếu tay chân, đau ngực, khó thở, hoặc lơ mơ, vã mồ hôi, run (nghi hạ đường huyết nặng).\n\nMẹ chóng mặt như vậy mấy hôm rồi, có lần nào suýt té chưa?";
  // Chọn giữa hai việc (lương, khoảng cách).
  const sal = [...q.normalize("NFC").matchAll(/lương\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|củ)/giu)].map((m) => Number(m[1].replace(",", ".")));
  if (sal.length >= 2 && VN(/\b(phân vân|chọn|nên chọn|giữa hai|giữa 2|hai việc|2 việc|hai chỗ|2 chỗ)\b/).test(n)) {
    const [a, b] = sal;
    const km = q.match(/(\d+)\s*km/iu);
    return `Mình đặt hai lựa chọn cạnh nhau cho dễ nhìn nha 📝\n• Chênh lệch lương: ${Math.abs(a - b)} triệu/tháng, tức khoảng **${Math.abs(a - b) * 12} triệu/năm**\n${km ? `• Đi xa ${km[1]} km mỗi chiều ≈ ${Number(km[1]) * 2} km/ngày — trừ tiền xăng, hao xe và khoảng 1 tiếng đi lại mỗi ngày, phần chênh lệch thực tế sẽ ít hơn con số trên giấy\n` : ""}• Thứ khó đo bằng tiền: cơ hội thăng tiến, học được gì, môi trường, sức khoẻ và thời gian rảnh\n\nỞ tuổi còn đang xây sự nghiệp, nhiều người ưu tiên chỗ **học được nhiều và có đường đi lên**, miễn là sức khoẻ và thời gian vẫn chịu được. Nhưng tuỳ bạn đang cần gì nhất lúc này. Trong 2–3 năm tới, điều bạn muốn có nhất là gì — tiền, kỹ năng, hay thời gian cho bản thân?`;
  }
  // Đổi nghề khi đã đi làm nhiều năm (sợ trễ, sợ học không nổi, gia đình không ủng hộ).
  if (VN(/\b(chuyển|đổi|chuyển qua|chuyển sang|nhảy sang|nhảy qua)( \S+){0,2} (nghề|ngành|làm|sang làm|qua làm)\b/).test(n) && VN(/\b(sợ|trễ|muộn|có nên|nên thử|không ủng hộ|học không nổi)\b/).test(n) && !VN(/\b(bói|tarot|xem bài|rút bài|lá bài)\b/).test(n))
    return "Muốn đổi sang nghề mình thích mà còn lo trễ, lo học không nổi, nhà lại chưa ủng hộ — cân nhắc kỹ vậy là rất tỉnh táo đó 💚\n\nVài điều giúp bớt rủi ro:\n• **Chưa trễ đâu**: nhiều người đổi nghề ở tuổi 30–40; kinh nghiệm cũ (vd kế toán) còn là lợi thế nếu sau này làm phần mềm cho tài chính, doanh nghiệp\n• **Thử trước khi nhảy**: học một khoá ngắn 2–3 tháng buổi tối / cuối tuần, làm vài dự án nhỏ — xem mình còn thích khi gặp phần khó không\n• **Giữ việc cũ** trong lúc học, chuẩn bị khoản dự phòng vài tháng chi tiêu trước khi chuyển hẳn\n• Với gia đình: cho họ thấy **kế hoạch cụ thể** (học gì, bao lâu, tiền dự phòng) thường dễ được ủng hộ hơn là chỉ nói \"con thích\"\n\nBạn đã thử học chút nào chưa, hay mới đang tính?";
  // Rượu: uống thêm cho "giã rượu".
  if (VN(/\b(uống thêm|làm thêm|uống tiếp|làm chút) (chút |ít |một ít )?(bia|rượu|lon)\b|\bgiã rượu\b|\bdã rượu\b/).test(n) && VN(/\b(say|đau đầu|buồn nôn|nôn|mệt|run|uống rượu|nhậu)\b/).test(n))
    return "Đừng uống thêm bia cho \"giã rượu\" nha — cách đó chỉ làm cơ thể đang mất nước và gan đang phải xử lý cồn càng mệt thêm, rồi lát nữa còn tệ hơn.\n• Uống nước lọc, nước điện giải (oresol pha đúng hướng dẫn), nước canh\n• Ăn nhẹ, dễ tiêu (cháo, bánh mì); nghỉ ngơi\n• Đau đầu có thể dùng paracetamol đúng liều — nhưng **đừng dùng quá liều** khi vừa uống nhiều rượu\n• Đừng lái xe khi người còn mệt, run\n\n🚨 Đi khám / gọi **115** nếu nôn liên tục không uống được nước, nôn ra máu, lơ mơ khó đánh thức, co giật, thở chậm hoặc bất thường.\n\nGiờ bạn còn buồn nôn nhiều không?";
  // Nhiều câu hỏi đánh số.
  if (VN(/\bthứ nhất\b/).test(n) && VN(/\bthứ hai\b/).test(n)) {
    const parts = q.split(/thứ (?:nhất|hai|ba|tư)\s*(?:là)?\s*/iu).map((x) => x.replace(/^[,:\s]+|[,.\s]+$/gu, "")).filter((x) => x.split(/\s+/).length >= 2).slice(1);
    if (parts.length < 2) return null;
    const ans = parts.map((p, i) => {
      const pn = N(p);
      if (VN(/\b(bói|tarot|xem bài)\b/).test(pn)) return `${i + 1}. **${p}** → phần này Lomi rút bài riêng cho bạn nha: gõ “bói” kèm câu hỏi, vd “bói xem tháng này buôn bán thế nào” (xem để tham khảo thôi nha).`;
      if (VN(/\bgiảm giá (50|năm mươi) ?(%|phần trăm)?/).test(pn) || VN(/\bgiảm (một )?nửa giá\b/).test(pn)) return `${i + 1}. **${p}** → giảm 50% dễ lỗ và dễ hút khách chỉ đến vì rẻ rồi không quay lại. Thường hiệu quả hơn: giảm vừa phải (10–20%) hoặc tặng kèm, **có hạn** 3–7 ngày, kèm lý do để khách quay lại lần hai (thẻ tích điểm, voucher lần sau).`;
      const f = matchFaq(p);
      if (f) return `${i + 1}. **${p}** → ${f.a.vi}`;
      return `${i + 1}. **${p}** → phần này bạn hỏi riêng giúp Lomi một câu nha, Lomi trả lời kỹ hơn.`;
    });
    return `Lomi trả lời lần lượt nha 😊\n\n${ans.join("\n\n")}`;
  }
  return null;
}

// ── Câu nối trong mạch sức khoẻ ──
function healthFollow(q: string, c: V5Ctx): string | null {
  if (!c.inHealth) return null;
  const n = N(q);
  if (VN(/\b(uống|súc miệng|ngậm)( \S+){0,2} (nước ấm|nước muối|trà gừng|nước chanh|mật ong)( \S+){0,3} (đỡ|đỡ hơn|dễ chịu|bớt)\b|\b(đỡ|bớt) (chút|một chút|được chút)\b/).test(n))
    return "Đỡ được chút là tốt nè 👍 Bạn cứ tiếp tục uống nước ấm, nghỉ ngơi, và theo dõi thêm nha. Nếu sốt cao lên, đau nhiều hơn, khó nuốt hay khó thở thì đi khám liền.";
  const days = n.match(VN(/\b(nếu|mà|lỡ)( \S+){0,2} (\d+|hai|ba|bốn|năm|vài|mấy) (ngày|hôm|bữa|tuần)( \S+){0,2} (không|chưa|vẫn không|vẫn chưa) (đỡ|khỏi|hết|bớt)\b|\b(không|chưa) (đỡ|khỏi|hết) thì (sao|làm sao|làm gì|phải làm sao)\b|\bkéo dài thì sao\b/));
  if (days)
    return `Nếu sau mấy ngày vẫn không đỡ — hoặc nặng hơn — thì nên **đi khám** để bác sĩ xem trực tiếp${c.healthLabel ? ` (với ${c.healthLabel}, đừng tự mua kháng sinh uống)` : ""}.\n\nĐi khám sớm hơn, không cần chờ, nếu: sốt cao từ 39°C hoặc sốt kéo dài quá 3 ngày, đau tăng nhiều, khó nuốt hay khó thở, chảy nước dãi vì không nuốt được, nổi ban, hoặc bạn thấy người mệt lả. Khó thở, không nuốt được nước thì gọi **115**.`;
  return null;
}

// ── Đang chán / đang tâm sự mà xin kể chuyện cười ──
function funInFlow(q: string, c: V5Ctx): string | null {
  const n = N(q);
  if (VN(/\bkể( \S+){0,2} (chuyện )?(cười|hài|vui)( đi| nghe| coi)?\b|\bchuyện cười\b|\bcâu đố\b/).test(n) && words(q) <= 8) return jokeText(q);
  if (c.last && /…|\.\.\./u.test(c.last) && /😆|😂|🤕/u.test(c.last) && VN(/\b(nhạt|dở|không vui|chán òm|xàm|chưa hài|không buồn cười)\b/).test(n))
    return "Hihi, công nhận câu đó hơi nhạt thiệt 😅 Lomi kể dở mà vẫn mong bạn cười được chút. Thôi bạn kể Lomi nghe chuyện gì vui vui hôm nay đi, hay mình nói chuyện khác cũng được nha?";
  return null;
}

// ── Câu nối hay gặp trong hội thoại dài ──
function convoFollow(q: string, c: V5Ctx): string | null {
  const n = N(q);
  const w = words(q);
  if (w <= 10 && VN(/\b(không biết|chẳng biết|chả biết) (mình|anh|a|em|e|tôi|tui) sai (ở )?(đâu|chỗ nào|gì)\b/).test(n))
    return "Có khi không phải ai “sai” cả đâu 💚 Nhiều cuộc chia tay đến từ những thứ tích lại dần — ít thời gian cho nhau, nhu cầu khác nhau, mỗi người thay đổi theo một hướng. Tự trách mình lúc này dễ hiểu, nhưng nó không giúp lòng nhẹ hơn.\n\nNếu nhìn lại, có giai đoạn nào bạn thấy hai người bắt đầu xa nhau không?";
  if (w <= 16 && VN(/\b(có lẽ|chắc|chắc là|hình như) (do|tại|vì) (mình|anh|a|em|e|tôi|tui) (bận|vô tâm|ít quan tâm|ít dành thời gian|lo làm)/).test(n))
    return "Nhận ra được điều đó đã là một bước rất thật lòng rồi 💚 Bận rộn làm mình ít ở bên người kia — chuyện này nhiều cặp gặp, và nó sửa được nếu cả hai còn muốn.\n\nNếu nói chuyện lại với cô ấy, bạn có thể nhận phần đó một cách cụ thể (“anh biết thời gian qua anh bận và để em một mình nhiều”), rồi hỏi cô ấy cần gì — thay vì hứa chung chung. Bạn còn muốn giữ mối quan hệ này không?";
  if (VN(/\b(giao|ôm|dồn)( \S+){0,2} (quá )?nhiều việc\b|\b(tối nào|ngày nào|đêm nào) cũng (làm|ở công ty|tăng ca)( \S+){0,2}( tới| đến)? \d{1,2} ?(h|giờ)\b|\btăng ca (liên tục|hoài|mãi|mỗi ngày)\b/).test(n))
    return "Tối nào cũng làm tới khuya như vậy thì kiệt sức là chuyện sớm muộn thôi 😮‍💨 Khối lượng việc quá tải không phải do bạn yếu — mà là cần được sắp xếp lại.\n\n• Ghi lại 1–2 tuần: việc gì, mất bao lâu, làm tới mấy giờ — có số liệu thì dễ nói chuyện với sếp hơn\n• Hỏi sếp thứ tự ưu tiên khi việc dồn: “Tuần này em có A, B, C — anh/chị muốn em ưu tiên cái nào trước?”\n• Giữ lại một khoảng nghỉ cố định mỗi tối, dù ngắn\n\nChuyện này kéo dài bao lâu rồi?";
  if (VN(/\b(nói|đề xuất|xin|thương lượng|trao đổi) (với|cho)? ?sếp( \S+){0,4} (giảm|bớt|chia|san|giãn) (việc|tải|khối lượng)\b|\bgiảm (bớt )?việc\b/).test(n))
    return "Có nè, nói với sếp sao cho hiệu quả thì nên dựa vào **việc cụ thể và kết quả**, không chỉ nói mình mệt:\n\n• Chọn lúc sếp không vội, xin 10–15 phút nói riêng\n• Đưa danh sách việc đang làm và thời gian mỗi việc — để sếp thấy khối lượng thật\n• Nói theo hướng giữ chất lượng: “Hiện em đang làm A, B, C và thường làm tới 11 giờ đêm. Em sợ làm vậy lâu sẽ ảnh hưởng chất lượng. Anh/chị giúp em chọn việc nào ưu tiên, việc nào lùi lại hoặc chia cho người khác được không?”\n• Đề xuất phương án cụ thể (lùi hạn, chia việc, bớt một đầu việc) thay vì chỉ nói “nhiều quá”\n\nSếp của bạn thường dễ nói chuyện hay khá khó tính?";
  if (VN(/\b(cách|làm sao|làm thế nào|có cách nào)( \S+){0,4} (ngủ ngon|dễ ngủ|ngủ được|ngủ sớm|ngủ sâu)( hơn)?\b/).test(n))
    return "Có nè, mấy cách giúp dễ ngủ hơn mà nhiều người thấy hiệu quả 🌙\n• **Dậy cùng một giờ mỗi ngày**, kể cả sau đêm ngủ tệ — nhịp ngủ sẽ ổn dần\n• Chỉ lên giường khi buồn ngủ; nằm 20–30 phút chưa ngủ được thì ra ngoài làm việc nhẹ nhàng, buồn ngủ mới vào lại\n• Tắt điện thoại, màn hình khoảng 1 tiếng trước khi ngủ; phòng tối, yên, mát\n• Bớt cà phê, trà sau 2 giờ chiều; không uống rượu cho dễ ngủ\n• Hay nghĩ linh tinh thì trước khi ngủ viết hết những điều đang lo ra giấy\n\nMất ngủ kéo dài vài tuần, hoặc ảnh hưởng nhiều tới ban ngày thì nên đi khám nha. Bạn thử từ cách nào trước?";
  if (VN(/\b(níu kéo|níu giữ|xin quay lại|quay lại với|làm lành)\b/).test(n) && VN(/\b(nói gì|nói sao|nhắn gì|nhắn sao|nói thế nào|nói như nào|mở lời)\b/).test(n))
    return "Nếu muốn nói chuyện lại, nên **thành thật và không ép** — mục tiêu là để cô ấy hiểu lòng bạn, chứ không phải thuyết phục bằng được.\n\nVí dụ: “Anh đã nghĩ nhiều về điều em nói. Anh biết thời gian qua anh bận và để em một mình nhiều — phần đó là lỗi của anh. Anh vẫn thương em và muốn thử thay đổi thật sự, nhưng anh cũng tôn trọng quyết định của em. Em có muốn mình nói chuyện kỹ hơn không?”\n\n• Nói trực tiếp hoặc gọi, đừng nhắn dồn dập nhiều tin\n• Nêu thay đổi **cụ thể** bạn sẽ làm, thay vì hứa chung chung\n• Nếu cô ấy vẫn muốn dừng, chấp nhận và giữ tự trọng — níu quá dễ làm cả hai đau thêm\n\nBạn muốn Lomi chỉnh câu cho sát với chuyện hai người hơn không?";
  if (w <= 12 && VN(/\b(có nên|nên) (níu kéo|níu giữ|xin quay lại|giữ lại)( \S+){0,2}( không| hay không)?\b/).test(n))
    return "Chuyện níu kéo thì Lomi không quyết thay bạn được, nhưng mình cùng cân nhắc nha 💚\n• Nếu lý do chia tay là điều **sửa được** (vd bạn quá bận, ít quan tâm) và bạn thật lòng muốn thay đổi — nói chuyện lại một lần cho rõ là đáng thử\n• Nếu cô ấy đã nói rõ là hết tình cảm, hoặc hai người khác nhau ở những điều quan trọng — níu kéo dễ làm cả hai đau thêm\n• Dù chọn gì, hãy để cô ấy được tự quyết; tôn trọng quyết định của người kia cũng là một cách thương\n\nTheo bạn, cô ấy muốn dừng vì hết thương, hay vì mệt với cách hai người đang đi cùng nhau?";
  if (w <= 6 && VN(/^ (ok|oke|okie|ừ|ừm|được|vậy) ?(rồi )?(để|cho) (anh|a|em|e|mình|tui|tôi|chị|c) (thử|làm thử|áp dụng)( (xem|coi|sao|nha|nhé|thử))* $/).test(n))
    return "Dạ, bạn thử rồi kể Lomi nghe có đỡ hơn không nha 💚 Lomi vẫn ở đây.";
  if (w <= 6 && VN(/^ (thôi )?(nói|kể|đổi) (chuyện|chủ đề) khác (đi|nha|nhé|đi em|nào)?\s*$/).test(n))
    return "Okie, đổi chủ đề nha 😄 Bạn muốn nói chuyện gì nè?";
  if (c.lastHeart === "ev:bored" && w <= 6 && VN(/\b(không biết|chẳng biết|chả biết) (làm gì|chơi gì|đi đâu)\b/).test(n))
    return "Vậy để Lomi chọn giùm nha 😄 Ba lựa chọn nè:\n• Lomi kể chuyện cười hoặc đố bạn một câu\n• Rút một lá Tarot xem hôm nay thế nào\n• Lomi tìm một quán cà phê hay chỗ ăn vặt gần đây để bạn đổi gió\n\nBạn chọn cái nào?";
  return null;
}

/** Router của QA V5 — gọi trong khối "extras" của send() (sau khủng hoảng / cấp cứu / an toàn). */
export function v5Reply(q: string, c: V5Ctx): string | null {
  return longCases(q) ?? multiIssueReply(q) ?? healthFollow(q, c) ?? funInFlow(q, c) ?? convoFollow(q, c);
}
