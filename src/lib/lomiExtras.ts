// ─────────────────────────────────────────────────────────────────────────────
// ĐỜI THƯỜNG & NGỮ CẢNH NHIỀU LƯỢT (21/10, QA V2 phần A) — chạy trên máy.
//   • "nói khó hiểu quá, nói bình thường thôi" → nói gọn lại câu vừa rồi
//   • thu nhập / chi tiêu qua nhiều lượt → tính phần còn lại (Q19)
//   • lạm phát + "ví dụ đời thường" (Q21), sách nhập môn tâm lý học (Q12), tarot có cơ sở khoa học không (Q13)
//   • nhớ người có tên trong câu kể ("Minh vừa nghỉ việc, Nam đang tìm việc") → "người nào cần sửa CV trước" (Q23)
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

// ── Đính chính "không, ý anh là X, không phải Y" (Q22) ──
const FIX = /^(?:không|ko|k|hông|không phải|đâu)[,.!]?\s*ý (?:anh|em|chị|tôi|mình|tui|tớ|a|e|c) là (.+?),?\s+(?:không phải|chứ không phải|chớ không phải) (?:là |chuyện )?(.+?)[\s.!?]*$/iu;
export function fixReply(q: string): string | null {
  const m = q.trim().normalize("NFC").match(FIX);
  if (!m) return null;
  return `À, Lomi hiểu nhầm rồi, xin lỗi nha 😅 Vậy là ${m[1].trim()} — không phải chuyện ${m[2].trim()}.\n\nVậy chuyện đó đang làm bạn thấy sao — lo, sốt ruột, hay chỉ muốn kể Lomi nghe thôi?`;
}

const SIMPLER = VN(/\b((nói|giải thích|trả lời|viết)( \S+){0,3} (khó hiểu|rối|phức tạp|dài dòng)|nói (kiểu |cho )?(bình thường|dễ hiểu|đơn giản|dễ nghe) (hơn |lại )?(thôi|đi|được không|giùm|giúp)|khó hiểu quá|không hiểu gì hết)\b/);
const plain = (x: string) => x.replace(/\*\*/g, "").replace(/(🌿|🩺|📖|🔎|💡|🚫|🧑‍⚕️|📚)/gu, "").trim();
/** "Em nói gì nghe khó hiểu quá, nói kiểu bình thường thôi" → nói gọn lại câu đáp ngay trước. */
export function simplerReply(q: string, last?: string): string | null {
  const n = ` ${normalizeVi(q)} `;
  if (!SIMPLER.test(n)) return null;
  // "giải thích AI là gì, nói đơn giản thôi" là câu hỏi MỚI kèm yêu cầu nói đơn giản — không phải bảo nói lại câu trước.
  if (VN(/\b(là gì|là sao|nghĩa là|về (cái|chuyện|vụ)?)\b/).test(n) && !VN(/\bkhó hiểu\b/).test(n)) return null;
  if (!last || last.length < 120) return "Dạ, Lomi sẽ nói đơn giản hơn nha 😊 Bạn muốn Lomi giải thích lại chuyện gì?";
  const lines = last.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^(•|-|\d+[.)]|[①-⑨])/u.test(l)).slice(0, 3).map((l) => `• ${plain(l.replace(/^(•|-|\d+[.)]|[①-⑨])\s*/u, ""))}`);
  const head = plain(lines.find((l) => !/^(•|-|\d+[.)]|[①-⑨])/u.test(l) && !/^\(/.test(l)) ?? "").split(/(?<=[.!?])\s/)[0];
  return `Dạ, Lomi xin lỗi vì nói rối 😅 Nói gọn lại nha:\n\n${head ? `${head}\n` : ""}${bullets.join("\n")}\n\nChỗ nào còn khó hiểu, bạn hỏi đúng chỗ đó Lomi giải thích tiếp nha.`;
}

// ── Tính tiền còn lại (Q19) ──
const LEFT_ASK = VN(/\b(còn (lại )?bao nhiêu|dư (lại |ra )?bao nhiêu|còn được bao nhiêu|còn dư bao nhiêu|còn lại mấy)\b/);
const MONEY = /(\d+(?:[.,]\d+)?)\s*(triệu|tr|củ)\b/giu;
const INCOME = /(kiếm|lương|thu nhập|nhận|làm ra|được trả)( được)?( \p{L}+){0,3}?\s+(\d+(?:[.,]\d+)?)\s*(triệu|tr|củ)\b/iu;
const num = (x: string) => Number(x.replace(",", "."));
const fmt = (x: number) => `${Number.isInteger(x) ? x : x.toFixed(1).replace(".", ",")} triệu`;
export function budgetReply(q: string, history: string[]): string | null {
  if (!LEFT_ASK.test(` ${normalizeVi(q)} `)) return null;
  const all = [...history, q];
  let income: number | null = null;
  for (const t of all) {
    const m = t.normalize("NFC").match(INCOME);
    if (m) income = num(m[4]);
  }
  if (income === null) return null;
  const items: { label: string; v: number }[] = [];
  for (const seg of q.normalize("NFC").split(/[,;]| và |\n/u)) {
    if (INCOME.test(seg)) continue;
    const m = [...seg.matchAll(MONEY)][0];
    if (!m) continue;
    const label = seg.slice(0, m.index).replace(/^(vậy|còn|rồi|thì|mà)\s+/iu, "").trim().toLowerCase();
    items.push({ label: label || "khoản chi", v: num(m[1]) });
  }
  if (!items.length) return null;
  const left = items.reduce((a, b) => a - b.v, income);
  const expr = `${fmt(income)} − ${items.map((i) => `${fmt(i.v)} (${i.label})`).join(" − ")}`;
  return (
    `${expr} = **${fmt(left)}** còn lại mỗi tháng — đây là **trước** các khoản khác như đi lại, điện nước, điện thoại, hiếu hỉ.` +
    (left > 0
      ? `\n\nMuốn tiết kiệm đều thì thử chuyển ngay một phần vào tài khoản riêng **ngay khi nhận lương** (vd ${fmt(Math.max(1, Math.round(left * 0.3)))}), rồi mới chi phần còn lại — tiết kiệm trước, tiêu sau.`
      : "\n\nKhoản chi đang bằng hoặc vượt thu nhập rồi — mình xem lại khoản nào cắt được trước nha.")
  );
}

// ── Lạm phát (Q21) ──
const INFL = VN(/\b(lạm phát)\b/);
const EXAMPLE_ASK = VN(/\b(ví dụ|vd|thí dụ|minh hoạ|minh họa)\b/);
export function inflationReply(q: string, last?: string): string | null {
  const n = ` ${normalizeVi(q)} `;
  if (EXAMPLE_ASK.test(n) && last && /Lạm phát/u.test(last) && !INFL.test(n))
    return "Vài ví dụ đời thường về lạm phát nè:\n• Ly cà phê quen từ 20 nghìn lên 25 nghìn, dù quán, ly, vị vẫn y vậy\n• Lương tăng 5% nhưng tiền ăn, tiền nhà tăng 8% → thực tế mỗi tháng bạn mua được ít đồ hơn\n• 10 triệu bỏ ống heo 5 năm vẫn là 10 triệu, nhưng mua được ít đồ hơn hồi mới bỏ vào\n• Gói bánh vẫn giá cũ mà nhỏ đi — một kiểu tăng giá \"ngầm\"";
  if (!INFL.test(n)) return null;
  return (
    "**Lạm phát** là khi giá cả nói chung tăng lên theo thời gian, nên cùng một số tiền mua được ít đồ hơn trước — tức là tiền bị \"mất giá\".\n\n" +
    "Ví dụ: trước đây 100 nghìn mua được 4 ổ bánh mì, giờ giá lên thì 100 nghìn chỉ đủ 3 ổ — tiền vẫn vậy, nhưng sức mua giảm.\n\n" +
    "• Lạm phát vừa phải, vài phần trăm mỗi năm, là chuyện bình thường của nhiều nền kinh tế\n• Lạm phát cao làm tiền để không (ống heo, két) mất giá nhanh — nên người ta thường gửi tiết kiệm có lãi hoặc đầu tư để giữ giá trị\n• Thường được đo bằng chỉ số giá tiêu dùng (CPI)"
  );
}

// ── Kiến thức nhập môn (Q12, Q13) ──
export function knowledgeReply(q: string): string | null {
  const n = ` ${normalizeVi(q)} `;
  if (VN(/\b(tìm hiểu|học|đọc sách|đọc|bắt đầu)( \S+){0,3} (về )?tâm lý học\b|\bsách tâm lý (học )?(nhập môn|cơ bản|nên đọc)/).test(n))
    return (
      "Muốn tìm hiểu tâm lý học để đọc cho mình thì bắt đầu nhẹ nhàng vầy nha 📚\n" +
      "• Đọc một giáo trình **nhập môn** trước (sách \"Tâm lý học đại cương\" của các trường đại học, hoặc bộ \"Psychology\" của David G. Myers nếu bạn đọc tiếng Anh) — để có cái nhìn tổng quát: trí nhớ, cảm xúc, động lực, phát triển, xã hội…\n" +
      "• Sách phổ thông dễ đọc: \"Tư duy nhanh và chậm\" (Daniel Kahneman) về cách mình ra quyết định; \"Đi tìm lẽ sống\" (Viktor Frankl) về ý nghĩa sống\n" +
      "• Chọn một nhánh mình tò mò nhất (tâm lý xã hội, phát triển, tâm lý học tích cực…) rồi đọc sâu dần\n" +
      "• Cẩn thận sách \"đọc vị người khác trong 5 phút\" — thường không có cơ sở khoa học\n\n" +
      "Bạn tò mò nhất phần nào của tâm lý học nè?"
    );
  if (VN(/\btarot\b/).test(n) && VN(/\b(hoạt động (như )?(thế nào|sao|ra sao)|cơ sở khoa học|có khoa học|khoa học không|có thật không|có đúng không|tin được không|chính xác không|nguyên lý)\b/).test(n))
    return (
      "Nói thật nha: **chưa có bằng chứng khoa học** nào cho thấy tarot dự đoán được tương lai 🔮\n\n" +
      "Tarot là bộ 78 lá (22 lá ẩn chính, 56 lá ẩn phụ), mỗi lá mang hình ảnh và ý nghĩa tượng trưng. Khi trải bài, người đọc nối các ý nghĩa đó với câu hỏi của bạn. Nhiều người dùng tarot như một công cụ để **ngẫm lại chuyện của mình** — hình ảnh lá bài gợi ra góc nhìn mình chưa nghĩ tới — chứ không phải lời tiên tri.\n\n" +
      "Vì vậy Lomi bói cho vui và để gợi suy nghĩ thôi; quyết định quan trọng (sức khoẻ, tiền bạc, tình cảm) thì vẫn nên dựa vào thông tin thật và người có chuyên môn. Muốn bốc một lá cho vui thì gõ \"bói\" nha."
    );
  return null;
}

// ── Nhớ người có tên trong câu kể (Q23) ──
const WHO_ASK = VN(/\b(người nào|ai|bạn nào|đứa nào)( \S+){0,4} (cần|nên|phải) (sửa|làm|viết|chuẩn bị|cập nhật) (cv|hồ sơ|lý lịch)( trước)?\b/);
export function whoNeedsCv(q: string, history: string[]): string | null {
  if (!WHO_ASK.test(` ${normalizeVi(q)} `)) return null;
  const facts: { name: string; what: string }[] = [];
  for (const t of history) for (const m of t.normalize("NFC").matchAll(/(\p{Lu}\p{Ll}+) (vừa|đang|mới|sắp|đã) ([^,.;!?]+)/gu)) facts.push({ name: m[1], what: `${m[2]} ${m[3].trim()}` });
  const seek = facts.find((f) => /(tìm việc|xin việc|ứng tuyển|phỏng vấn)/u.test(f.what));
  const quit = facts.find((f) => f !== seek && /(nghỉ việc|mất việc|thất nghiệp|bị cho nghỉ)/u.test(f.what));
  if (!seek && !quit) return null;
  const list = facts.map((f) => `${f.name} ${f.what}`).join(", ");
  if (seek && quit)
    return `Theo bạn kể: ${list}.\n\n**${seek.name}** đang tìm việc nên cần CV ngay — sửa cho ${seek.name} trước. ${quit.name} ${quit.what}; nếu ${quit.name} cũng định tìm chỗ mới thì sửa CV cho ${quit.name} ngay sau đó (còn nếu ${quit.name} muốn nghỉ ngơi một thời gian thì chưa gấp).`;
  const p = seek ?? quit!;
  return `Theo bạn kể: ${list}. ${p.name} là người cần CV trước, vì ${p.name} ${p.what}.`;
}

// ═══════════════════════ 21/10 (QA V3 tự soạn) ═══════════════════════
const has = (re: RegExp, q: string) => re.test(` ${normalizeVi(q)} `);

/** Nhờ Lomi gọi cấp cứu / sợ có người lạ trong nhà — Lomi không gọi điện được: nói rõ số cần gọi và việc làm ngay. */
export function safetyNowReply(q: string): string | null {
  if (has(VN(/\b(gọi|kêu|báo) (giùm|giúp|hộ|dùm)?( (anh|em|tôi|tui|mình|a|e))? ?(cấp cứu|xe cấp cứu|115|113|114|công an|cứu hoả|cứu hỏa)\b|\bgọi (giùm|giúp|hộ|dùm) (anh|em|tôi|tui|mình|a|e)? ?(cấp cứu|115|113|114|công an)\b/), q))
    return "Lomi **không gọi điện được** — bạn gọi ngay nha (hoặc nhờ người bên cạnh gọi giúp):\n• **115** — cấp cứu y tế\n• **113** — công an (bị đe doạ, có người lạ, bạo lực)\n• **114** — cháy, cứu nạn\n\nKhi gọi: nói rõ **địa chỉ**, chuyện gì đang xảy ra, có ai bị thương / bất tỉnh không, và để điện thoại mở chờ hướng dẫn. Bạn đang gặp chuyện gì, có an toàn không?";
  if (has(VN(/\b(một mình|ở nhà một mình)\b/), q) && has(VN(/\b(tiếng động lạ|tiếng lạ|có người lạ|ai đó (đang )?(cạy|mở|đập) cửa|có trộm|đột nhập|có người (trong|ngoài) nhà)\b/), q))
    return "Nghe sợ thật 😟 Mình làm vầy cho an toàn nha:\n• **Đừng ra kiểm tra một mình**; vào phòng có khoá, khoá cửa lại, bật đèn\n• Nếu nghĩ có người lạ cạy cửa / đột nhập: gọi **113** ngay, nói rõ địa chỉ\n• Nhắn hoặc gọi cho người thân, hàng xóm biết bạn đang ở một mình và đang sợ\n• Giữ điện thoại bên mình, đừng đối đầu nếu gặp người lạ\n\nNếu chỉ là tiếng động không rõ, đợi một lúc, nghe ngóng từ trong phòng; sáng ra hãy kiểm tra cửa nẻo. Giờ bạn đang ở trong phòng khoá được không?";
  return null;
}

/** Uống rượu bia rồi lái xe — luật Việt Nam cấm hoàn toàn. */
export function drinkDriveReply(q: string): string | null {
  if (!(has(VN(/\b(uống|nhậu|xỉn|say)\b/), q) && has(VN(/\b(lái xe|chạy xe|đi xe|cầm lái|lái về|chạy về|tự lái)\b/), q))) return null;
  return "**Không nên lái nha** — ở Việt Nam, người lái xe (kể cả xe máy) **bị cấm có nồng độ cồn trong máu hay hơi thở**, nên chỉ 1–2 lon cũng đã vi phạm, bị phạt nặng và có thể bị tước bằng lái. Quan trọng hơn: cồn làm chậm phản xạ, kể cả khi mình thấy vẫn tỉnh.\n\nAn toàn hơn: đặt xe, nhờ người không uống chở về, hoặc để xe lại và về bằng taxi — trong app có mục Đưa đón (/dua-don) nè.";
}

/** Giảm cân cấp tốc / sụt cân không rõ lý do / hỏi calo. history = các câu người dùng gần đây. */
const ED_SIGN = VN(/\b(móc họng|tự gây nôn|nôn ra vì sợ|sợ (mập|béo|tăng cân)|nhịn ăn (cả ngày|mấy ngày)|bỏ bữa|ăn xong nôn|ghét cơ thể)\b/);
export function weightReply(q: string, history: string[]): string | null {
  const n = ` ${normalizeVi(q)} `;
  if (VN(/\bsụt( \S+){0,2} (\d+|mấy|vài) ?(kg|ký|cân|kí)\b|\bsụt cân\b/).test(n) && VN(/\b(không|chẳng|chả) (ăn kiêng|giảm cân|cố|tập|làm gì)|không rõ (lý do|nguyên nhân)|tự nhiên\b/).test(n))
    return "⚠️ **Sụt cân nhiều mà không ăn kiêng, không cố giảm** thì nên **đi khám sớm** (Nội tổng quát) để tìm nguyên nhân — có thể do tiểu đường, bệnh tuyến giáp, bệnh tiêu hoá, trầm cảm, nhiễm trùng hay những bệnh cần phát hiện sớm. Lomi không đoán được nguyên nhân qua tin nhắn.\n\nĐi khám sớm hơn nữa nếu kèm: sốt, ra mồ hôi đêm, ho kéo dài, đi ngoài ra máu / phân đen, nuốt khó, khát và tiểu nhiều, mệt nhiều. Bạn có thấy triệu chứng nào kèm theo không?";
  const ed = [...history, q].some((t) => ED_SIGN.test(` ${normalizeVi(t)} `));
  if (VN(/\b(giảm|xuống) (\d+|mười|chục) ?(kg|ký|kí|cân)( \S+){0,3} (trong|chỉ trong) (\d+|một|hai|ba|vài) (ngày|tuần)\b/).test(n) || VN(/\bnhịn ăn( \S+){0,3} (giảm cân|cho nhanh|được không)\b/).test(n)) {
    if (ed) return null;
    return "Giảm 10 kg trong 2 tuần là **không an toàn** đâu, và nhịn ăn để làm vậy dễ gây mệt, chóng mặt, mất cơ, rối loạn tiêu hoá, sỏi mật — xong thường tăng lại nhanh. NHS khuyên giảm khoảng **0,5–1 kg mỗi tuần** là mức an toàn, bền.\n\n• Ăn đủ bữa, nhiều rau, đạm nạc; bớt đồ ngọt, đồ chiên, nước ngọt, rượu bia\n• Vận động đều (đi bộ nhanh, đạp xe…), ngủ đủ\n• Có bệnh nền hay muốn giảm nhiều → gặp bác sĩ dinh dưỡng để có kế hoạch riêng";
  }
  if (VN(/\b(bao nhiêu|mấy) (calo|calories|kcal|ca lo)\b|\bcalo (mỗi|một) ngày\b/).test(n)) {
    if (ed) return "Phần số calo thì Lomi xin không đưa con số nha — với hoàn cảnh bạn kể, con số dễ thành áp lực hơn là giúp. Bác sĩ hoặc chuyên gia dinh dưỡng sẽ giúp bạn ăn uống an toàn, và đường dây / chuyên gia tâm lý có thể đồng hành nếu chuyện ăn uống đang làm bạn khổ sở. Bạn có muốn kể Lomi nghe thêm không?";
    const all = [...history, q].map((t) => t.normalize("NFC")).join(" ");
    const h = all.match(/(\d)\s*m\s*(\d{1,2})|(\d{3})\s*cm/iu);
    const w = all.match(/(\d{2,3})\s*(kg|ký|kí|cân)/iu);
    const hm = h ? (h[3] ? Number(h[3]) / 100 : Number(`${h[1]}.${h[2].padEnd(2, "0")}`)) : null;
    const bmi = hm && w ? Number(w[1]) / (hm * hm) : null;
    const bmiLine = bmi ? `\n\nVới ${Math.round(hm! * 100)} cm, ${w![1]} kg thì BMI khoảng **${bmi.toFixed(1)}**${bmi >= 25 ? (bmi >= 30 ? " — thuộc nhóm béo phì theo cách tính chung, nên gặp bác sĩ để có kế hoạch an toàn." : " — thuộc nhóm thừa cân theo cách tính chung.") : bmi < 18.5 ? " — đang thấp hơn mức bình thường, không nên giảm thêm." : " — trong mức bình thường."}` : "";
    return "Nhu cầu calo **khác nhau theo tuổi, giới, chiều cao, cân nặng và mức vận động**, nên Lomi chỉ nói mức tham khảo chung nha: NHS cho biết nam giới trưởng thành cần khoảng **2.500 kcal/ngày**, nữ khoảng **2.000 kcal/ngày** để giữ cân; muốn giảm khoảng 0,5 kg mỗi tuần thì thường ăn ít hơn mức mình cần khoảng 600 kcal/ngày." + bmiLine + "\n\nĐừng ăn quá ít cho nhanh — dễ mệt, mất cơ và tăng lại. Muốn con số sát với mình thì gặp bác sĩ / chuyên gia dinh dưỡng nha.";
  }
  return null;
}

/** Đã nói bé bao nhiêu tháng ở câu trước rồi nói nhiệt độ ("38 độ rưỡi") → trả lời theo tuổi của bé (NHS: <3 tháng từ 38°C, 3–6 tháng từ 39°C thì đi khám). */
export function kidFeverFollow(q: string, history: string[]): string | null {
  const n = normalizeVi(q);
  const tm = n.match(/\b(3[5-9]|4[0-2])(?:\s*(?:do|độ|c|oc))?(?:\s*(ruoi|rưỡi|[,.]\s*(\d)))?\b/u);
  if (!tm || !VN(/\b(độ|do|sốt|rưỡi|ruoi)\b/).test(` ${n} `) || n.split(" ").length > 8) return null;
  const t = Number(tm[1]) + (tm[2] && /ru/u.test(tm[2]) ? 0.5 : tm[3] ? Number(tm[3]) / 10 : 0);
  let months: number | null = null;
  for (const h of history.slice(-4)) {
    const hn = ` ${normalizeVi(h)} `;
    const m = hn.match(VN(/\b(\d+)\s*(tháng|tuần|tuổi)\b/));
    if (m && /(^|[^\p{L}])(bé|be|con|cháu|chau|trẻ|tre)(?![\p{L}])/iu.test(`${history.join(" ")} ${hn}`)) months = m[2].startsWith("tu") && !/tuần/u.test(m[0]) ? (m[2] === "tuoi" || m[2] === "tuổi" ? Number(m[1]) * 12 : Number(m[1]) / 4) : Number(m[1]);
  }
  if (months === null) return null;
  const temp = `${String(t).replace(".", ",")}°C`;
  if (t < 38) return `${temp} thì chưa tính là sốt nha. Cứ theo dõi bé, mặc thoáng, cho bú / uống đủ; bé li bì, bỏ bú, khó thở thì đưa đi khám.`;
  const urgent = (months < 3 && t >= 38) || (months < 6 && t >= 39);
  return (
    (urgent
      ? `⚠️ Bé ${months < 1 ? "dưới 1 tháng" : `${Math.round(months)} tháng`} mà sốt ${temp} thì cần **đưa đi khám ngay** (NHS khuyên: dưới 3 tháng từ 38°C, 3–6 tháng từ 39°C).`
      : `Bé ${Math.round(months)} tháng sốt ${temp} thì thường **theo dõi ở nhà được**, nếu bé vẫn tỉnh, chịu bú / ăn.`) +
    "\n\n• Cho bú / uống thêm nước, mặc thoáng, không ủ ấm, không chườm lạnh\n• Thuốc hạ sốt cho bé phải theo **cân nặng** và đúng loại dành cho trẻ — hỏi dược sĩ / bác sĩ, không dùng thuốc người lớn\n• Đi khám ngay hoặc gọi **115** nếu bé: li bì, khó đánh thức, bỏ bú, thở nhanh / khó thở, co giật, tím tái, nổi ban không mất khi ấn, thóp phồng, sốt trên 5 ngày, hoặc bạn thấy lo"
  );
}

/** Đã nói dị ứng một món rồi kể "lỡ ăn rồi". */
export function allergyAteReply(q: string, history: string[]): string | null {
  const allergic = history.slice(-3).some((h) => has(VN(/\bdị ứng\b/), h));
  // Đang nói chuyện dị ứng mà kể khó thở / ngứa họng / sưng → cấp cứu (trước đây mất ngữ cảnh, đáp "đau họng" thường).
  if (allergic && has(VN(/\b(khó thở|thở khò khè|khò khè|ngứa họng|nghẹn họng|tức ngực|sưng (môi|lưỡi|họng|mặt)|choáng|ngất)\b/), q))
    return "🚨 Đang dị ứng mà **khó thở, ngứa / nghẹn họng, sưng môi – lưỡi – họng** là dấu hiệu có thể **sốc phản vệ** — gọi **115** ngay, nói rõ là nghi phản vệ. Có bút tiêm adrenaline thì dùng ngay theo hướng dẫn.\n\nTrong lúc chờ: ngồi dậy nếu khó thở (nằm, kê cao chân nếu chóng mặt), đừng ở một mình, đừng ăn uống thêm gì. Đừng chờ xem có đỡ không nha.";
  if (!has(VN(/\b(lỡ|vừa|mới|đã) (ăn|uống|dùng)( \S+){0,3}( rồi)?\b/), q)) return null;
  if (!allergic) return null;
  return "Lỡ ăn món mình dị ứng rồi thì **đừng ăn thêm** và theo dõi sát trong vài giờ tới nha (phản ứng thường xuất hiện trong vài phút tới 2 giờ).\n\n🚨 Gọi **115** ngay nếu có: **khó thở, khò khè, ngứa / nghẹn họng, sưng môi – lưỡi – mặt, chóng mặt, ngất, nôn nhiều** — có thể là sốc phản vệ. Có bút tiêm adrenaline thì dùng ngay theo hướng dẫn.\n\nChỉ ngứa, nổi mẩn nhẹ thì hỏi dược sĩ về thuốc kháng histamine và đi khám nếu không đỡ. Giờ bạn đang thấy thế nào?";
}

/** Phép tính đơn giản "1+1 bằng mấy", "15 x 3 = ?" */
export function mathReply(q: string): string | null {
  const m = q.replace(/\s+/g, "").match(/^(?:tính)?(-?\d+(?:[.,]\d+)?)([+\-*x×:/])(-?\d+(?:[.,]\d+)?)(?:=|bằng|bằngmấy|bằngbaonhiêu|là|làbaonhiêu|\?)*$/iu);
  if (!m) return null;
  const a = Number(m[1].replace(",", ".")), b = Number(m[3].replace(",", "."));
  const op = m[2];
  const r = op === "+" ? a + b : op === "-" ? a - b : /[*x×]/u.test(op) ? a * b : b === 0 ? NaN : a / b;
  if (Number.isNaN(r)) return "Chia cho 0 thì không được nha 😄";
  const out = Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/0+$/, "").replace(".", ",");
  return `${m[1]} ${op === "x" || op === "×" ? "×" : op === ":" ? ":" : op} ${m[3]} = **${out}** 😄`;
}

/** Những việc ngoài khả năng / ngoài dữ liệu — nói thật, chỉ chỗ làm được. */
export function outOfScopeReply(q: string): string | null {
  const n = ` ${normalizeVi(q)} `;
  if (VN(/\b(thời tiết|trời mưa không|có mưa không|nhiệt độ ngoài trời|dự báo thời tiết)\b/).test(n))
    return "Lomi chưa xem được dự báo thời tiết trực tiếp nên không dám nói bừa ☁️ Bạn xem app thời tiết trên điện thoại hoặc trang của Trung tâm Dự báo KTTV nha.\n\nĐà Lạt nói chung mát quanh năm, sáng tối se lạnh; mùa mưa thường khoảng tháng 5 tới tháng 11, hay mưa chiều — đi chơi nhớ mang áo khoác và áo mưa.";
  if (VN(/\b(dịch|translate)( \S+){0,4} (sang|qua|ra) (tiếng )?(anh|english|nhật|hàn|trung)\b/).test(n)) {
    if (VN(/\b(tôi|anh|em|mình) yêu (em|anh|bạn)\b/).test(n)) return "“Tôi yêu em” trong tiếng Anh là **“I love you”** 💕";
    return "Lomi chưa dịch được câu tự do đâu 😅 Bạn dùng Google Dịch hoặc ứng dụng dịch trên điện thoại cho nhanh và chuẩn nha.";
  }
  if (VN(/\b(bitcoin|btc|tiền ảo|tiền điện tử|tiền mã hoá|tiền mã hóa|crypto|coin)\b/).test(n) && VN(/\b(đầu tư|mua|nên|có nên|lời|lãi)\b/).test(n))
    return "Lomi không tư vấn đầu tư được (Lomi không phải chuyên gia tài chính), nhưng có vài điều nên biết trước khi quyết định:\n• Bitcoin / tiền mã hoá **biến động rất mạnh** — có thể lên hay xuống vài chục phần trăm trong thời gian ngắn\n• Chỉ dùng số tiền mà nếu mất hết bạn vẫn sống ổn; đừng vay mượn để đầu tư\n• Ở Việt Nam, tiền mã hoá **không phải phương tiện thanh toán hợp pháp**, và có rất nhiều chiêu lừa (hứa lãi cố định, sàn ảo, nhóm \"kéo\" đầu tư)\n• Tìm hiểu kỹ, hoặc hỏi người tư vấn tài chính có chuyên môn\n\nQuyết định cuối cùng là của bạn nha.";
  if (VN(/\b(viết|làm|soạn) (giúp |giùm |hộ |dùm )?(anh |em |tôi |mình |a |e )?(cái |một |1 )?(cv|hồ sơ xin việc|lý lịch|đơn xin việc)\b/).test(n))
    return "Lomi viết sẵn khung CV để bạn điền nha ✍️\n\n**1. Thông tin:** họ tên, số điện thoại, email, khu vực sống\n**2. Mục tiêu nghề nghiệp:** 2–3 câu, nêu vị trí muốn ứng tuyển và điều bạn mang lại\n**3. Kinh nghiệm:** công việc gần nhất trước — tên công ty, vị trí, thời gian, 2–4 gạch đầu dòng việc đã làm **kèm kết quả** (vd \"tăng 20% đơn hàng\")\n**4. Học vấn / chứng chỉ**\n**5. Kỹ năng:** kỹ năng chuyên môn + vài kỹ năng mềm có ví dụ\n**6. (Tuỳ chọn)** hoạt động, giải thưởng, ngoại ngữ\n\nMẹo: gọn 1 trang, mỗi lần nộp sửa mục tiêu và kinh nghiệm cho khớp tin tuyển dụng. Bạn ứng tuyển vị trí gì để Lomi gợi ý câu mục tiêu sát hơn?";
  if (VN(/\b(đặt lịch|đặt hẹn|book|lấy số|đăng ký) (khám|bác sĩ|bệnh viện|phòng khám)|đặt lịch khám\b/).test(n))
    return "Lomi chưa đặt lịch khám giùm được nha 🙏 Bạn đặt nhanh theo mấy cách này:\n• Gọi tổng đài / hotline của bệnh viện, phòng khám muốn tới\n• Đặt qua website hoặc ứng dụng của bệnh viện (nhiều nơi có đặt lịch online, lấy số trước)\n• Tới trực tiếp quầy tiếp đón, nên đi sớm\n\nNếu đang có dấu hiệu nặng (đau ngực, khó thở, yếu liệt…) thì **đừng chờ lịch** — gọi **115** hoặc vào cấp cứu ngay.";
  if (VN(/\b(kể|đọc) (cho (anh|em|mình|tôi|a|e) nghe )?(một |1 )?(chuyện )?cổ tích\b/).test(n))
    return "Kể bạn nghe chuyện **Rùa và Thỏ** nha 🐢🐇\n\nNgày xưa, Thỏ hay chê Rùa chậm chạp. Rùa bèn rủ Thỏ thi chạy. Vừa xuất phát, Thỏ phóng vèo đi xa, ngoái lại thấy Rùa còn lẹt đẹt, bèn nằm dưới gốc cây ngủ một giấc cho khoẻ. Rùa thì cứ chậm mà chắc, bò từng bước không nghỉ. Tới lúc Thỏ tỉnh dậy, chạy hết tốc lực về đích — thì Rùa đã ở đó từ lâu rồi.\n\nBài học: chậm mà đều, không bỏ cuộc thì vẫn tới đích; còn giỏi mà chủ quan thì dễ thua 😄";
  if (VN(/\b(sao|tại sao) (em|lomi|e) (biết|hiểu) (hay|giỏi|nhiều|rành)( vậy| thế| ghê| quá)*\b/).test(n))
    return "Hihi, Lomi được dạy sẵn một thư viện kiến thức nè 😄 — sức khoẻ có nguồn đối chiếu, tâm lý, tình cảm, cách dùng app, chút Tarot cho vui. Cái gì không chắc thì Lomi nói thẳng là không biết chứ không đoán bừa đâu.";
  if (VN(/^ (em|lomi|e|mày|m) (ngu|dở|tệ|kém|vô dụng|ngốc|dốt|chán)( quá| thế| vậy| ghê| vl| thật| vãi)* $/).test(n))
    return "Dạ, chắc Lomi vừa trả lời chưa đúng ý bạn, Lomi xin lỗi nha 🙏 Bạn nói Lomi nghe chỗ nào chưa ổn — Lomi sửa lại liền.";
  if (VN(/\b(muốn|chỉ muốn) (đi|trốn|bỏ đi) (đâu đó |đi đâu đó )?(thật xa|xa thật xa|khỏi đây|biệt tăm)\b/).test(n) && !VN(/\bchơi\b/).test(n))
    return "Muốn đi đâu đó thật xa hả… Lomi tò mò chút: bạn đang thèm một chuyến đi cho đổi gió, hay đang mệt với mọi thứ ở đây quá? 🌿";
  return null;
}

/** Câu nối trong mạch sức khoẻ: đau ngày càng tăng sau khi đã được dặn đi cấp cứu; hỏi "loại nào tốt" sau khi nói về thuốc ngủ. */
export function healthFollowReply(q: string, last?: string): string | null {
  if (!last) return null;
  if (/ruột thừa|cấp cứu/u.test(last) && has(VN(/\b(tăng dần|nặng hơn|đau hơn|càng lúc càng|ngày càng|dữ dội hơn)\b/), q))
    return "Đau **ngày càng tăng** thì càng phải **đi cấp cứu ngay** nha — đừng chờ thêm, đừng tự uống thuốc giảm đau rồi theo dõi ở nhà (thuốc có thể che triệu chứng). Nhờ người chở đi hoặc gọi **115**; trong lúc chờ đừng ăn uống gì phòng khi cần mổ.";
  if (/thuốc ngủ|thuốc an thần|Về thuốc/u.test(last) && has(VN(/^ (vậy |thế )?(loại|thuốc|cái) (nào|gì) (tốt|được|hiệu quả|ngon|mạnh)( nhất)?( vậy| nha| ạ| em| lomi)?\??\s*$/), q))
    return "Lomi **không gợi ý tên thuốc ngủ** được đâu — thuốc ngủ cần bác sĩ khám rồi mới kê, vì nhiều loại dễ gây lệ thuộc, buồn ngủ ngày hôm sau, té ngã (nhất là người lớn tuổi) và tương tác với thuốc khác.\n• Mất ngủ kéo dài vài tuần → đi khám (Nội thần kinh / Tâm thần / phòng khám giấc ngủ); bác sĩ thường thử chỉnh thói quen ngủ và liệu pháp nhận thức hành vi cho mất ngủ trước, thuốc chỉ dùng ngắn hạn khi cần\n• Đừng tự mua thuốc ngủ hay dùng thuốc của người khác\n\nBạn mất ngủ kiểu khó vào giấc, hay hay tỉnh giữa đêm?";
  return null;
}
