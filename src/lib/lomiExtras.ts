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
