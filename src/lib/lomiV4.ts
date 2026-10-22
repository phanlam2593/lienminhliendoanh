// ─────────────────────────────────────────────────────────────────────────────
// QA V4 (22/10, bộ 100 câu của Kir) — chạy trên máy, không gọi AI.
//   • câu ngắn đời thường / thiếu ngữ cảnh: hỏi lại đúng chỗ, không đoán, không quảng cáo app
//   • sổ tiền mở quán qua nhiều lượt (vốn, chi một lần, chi hàng tháng, gác lại rồi quay lại)
//   • tâm lý, tình cảm, sức khoẻ, tài chính, tarot, câu hỏi về app và về chính Lomi
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

export type V4Ctx = { last?: string; hist: string[]; lastHeart?: string; lastHealth?: boolean };
const N = (q: string) => ` ${normalizeVi(q)} `;
const words = (q: string) => q.trim().split(/\s+/).length;

// ═══════════════ Sổ tiền mở quán (Q21–30) ═══════════════
const TR = "(\\d+(?:[.,]\\d+)?)\\s*(?:triệu|tr|củ)";
const num = (x: string) => Number(x.replace(",", "."));
const fmt = (x: number) => `${Number.isInteger(x) ? x : x.toFixed(1).replace(".", ",")} triệu`;
const SHOP = /(quán|tiệm|cửa hàng|shop|xe bán)/u;
const DROP = /(bỏ|gác|thôi|dẹp) (chuyện|vụ|cái) (mở )?(quán|tiệm|cửa hàng|shop)|hỏi (chuyện|cái|việc) khác/u;
const RESUME = /(quay lại|trở lại|tiếp|nói tiếp|bàn tiếp) (chuyện|vụ|cái)? ?(mở )?(quán|tiệm|cửa hàng|shop)/u;
type Plan = { cap: number; rent?: number; rentAlt?: number; once: { label: string; v: number }[]; askDeposit?: boolean };
const ONCE: [RegExp, string][] = [
  [/(sửa sang|sửa chữa|sửa quán|trang trí|decor|thi công)/u, "sửa sang"],
  [/(đặt cọc|tiền cọc|\bcọc\b)/u, "tiền cọc"],
  [/(máy móc|thiết bị|bàn ghế|dụng cụ)/u, "máy móc, thiết bị"],
  [/(nguyên liệu|hàng nhập|nhập hàng)/u, "nguyên liệu ban đầu"],
  [/(giấy phép|thủ tục)/u, "giấy phép"],
];
function readPlan(msgs: string[]): { plan: Plan | null; active: boolean; dropped: boolean } {
  let plan: Plan | null = null;
  let active = false;
  let dropped = false;
  for (const raw of msgs) {
    const t = raw.normalize("NFC").toLowerCase();
    if (plan && DROP.test(t)) { active = false; dropped = true; continue; }
    if (plan && RESUME.test(t)) { active = true; dropped = false; continue; }
    const cap = t.match(new RegExp(`(?:mở|làm|kinh doanh|vốn|có)[^.?!]{0,40}?(?:với|vốn|có)\\s+${TR}`, "u")) ?? t.match(new RegExp(`vốn\\s+${TR}`, "u"));
    if (cap && SHOP.test(t)) { plan = { cap: num(cap[1]), once: [] }; active = true; continue; }
    if (!plan || !active) continue;
    const m = t.match(new RegExp(TR, "u"));
    if (/(mặt bằng|tiền thuê|thuê)/u.test(t) && m && /(tháng|tăng lên|giảm xuống|lên \d)/u.test(t)) {
      if (/^(nếu|giả sử|lỡ)|tăng lên|giảm xuống/u.test(t)) plan.rentAlt = num(m[1]);
      else plan.rent = num(m[1]);
      continue;
    }
    const kind = ONCE.find(([re]) => re.test(t));
    if (kind && m) { plan.once = plan.once.filter((o) => o.label !== kind[1]); plan.once.push({ label: kind[1], v: num(m[1]) }); plan.askDeposit = false; continue; }
    if (kind && !m && kind[1] === "tiền cọc") plan.askDeposit = true;
  }
  return { plan, active, dropped };
}
const left = (p: Plan) => p.cap - p.once.reduce((a, b) => a + b.v, 0);
const leftExpr = (p: Plan) => (p.once.length ? `${fmt(p.cap)} − ${p.once.map((o) => `${fmt(o.v)} (${o.label})`).join(" − ")} = **${fmt(left(p))}**` : `**${fmt(p.cap)}**`);
const notYet = (p: Plan) => {
  const miss = ["tiền cọc", "máy móc, thiết bị", "nguyên liệu ban đầu", "giấy phép"].filter((l) => !p.once.some((o) => o.label === l));
  return miss.length ? `, chưa trừ ${miss.join(", ")}` : "";
};
export function shopLedgerReply(q: string, hist: string[]): string | null {
  const t = q.normalize("NFC").toLowerCase();
  const before = readPlan(hist);
  const now = readPlan([...hist, q]);
  const p = now.plan;
  if (!p) return null;
  // vừa kể vốn
  if (readPlan([q]).plan) {
    return `Mở quán với vốn **${fmt(p.cap)}** — Lomi ghi lại nha 📝 Bạn kể dần các khoản (mặt bằng, sửa sang, tiền cọc, máy móc, nguyên liệu…) Lomi sẽ cộng trừ giúp. Quán định bán gì vậy?`;
  }
  if (before.plan && before.active && !now.active && DROP.test(t)) return "Okie, mình gác chuyện quán lại nha 😊 Bạn muốn hỏi chuyện gì nè?";
  if (!now.active) return null;
  if (!before.active && RESUME.test(t)) {
    const lines = [`• Vốn: ${fmt(p.cap)}`, ...p.once.map((o) => `• ${o.label[0].toUpperCase()}${o.label.slice(1)}: ${fmt(o.v)} (chi một lần)`)];
    if (p.rent) lines.push(`• Mặt bằng: ${fmt(p.rent)}/tháng${p.rentAlt ? ` (bạn đang tính thử trường hợp tăng lên ${fmt(p.rentAlt)}/tháng)` : ""}`);
    return `Okie, quay lại chuyện mở quán nha 📝 Lúc nãy mình có:\n${lines.join("\n")}\n\n→ Vốn còn ${leftExpr(p)}${notYet(p)}. Giờ bạn muốn tính tiếp khoản nào?`;
  }
  const b = before.plan!;
  if (p.rentAlt && p.rentAlt !== b.rentAlt) {
    const base = p.rent ?? b.rent;
    const diff = base ? p.rentAlt - base : null;
    return `Tiền thuê là chi phí **hàng tháng**, nên nó không làm đổi số vốn còn lại ban đầu (${fmt(left(p))}) — trừ khi tiền cọc tính theo số tháng thuê thì cọc có thể tăng theo.\n\n${diff && diff > 0 ? `Nhưng mỗi tháng quán tốn thêm **${fmt(diff)}**, tức **${fmt(diff * 12)}/năm** — quán cần lời thêm ít nhất chừng đó mỗi tháng mới bù được. ` : ""}Nên chừa sẵn trong vốn vài tháng tiền thuê (${fmt(p.rentAlt)} × 3 tháng = ${fmt(p.rentAlt * 3)}) phòng lúc mới mở chưa có lời.`;
  }
  if (p.rent && p.rent !== b.rent)
    return `Ghi nhận: mặt bằng **${fmt(p.rent)}/tháng** 📝 Đây là chi phí **hàng tháng**, Lomi để riêng, không trừ thẳng vào ${fmt(p.cap)} vốn. Có điều nên chừa sẵn vài tháng tiền thuê trong vốn phòng lúc mới mở chưa có lời. Còn khoản nào nữa không?`;
  const added = p.once.find((o) => !b.once.some((x) => x.label === o.label && x.v === o.v));
  if (added) return `Ghi nhận: ${added.label} **${fmt(added.v)}** (chi một lần) 📝 Vốn còn ${leftExpr(p)}${notYet(p)}.`;
  if (p.askDeposit && !b.askDeposit) return "À đúng rồi, Lomi chưa tính tiền cọc mặt bằng 😅 Cọc bao nhiêu vậy bạn?";
  if (VN(/\b(còn (lại )?bao nhiêu|dư (lại |ra )?bao nhiêu|còn được bao nhiêu|còn lại mấy|tổng cộng|hết bao nhiêu)\b/).test(N(q)))
    return `${leftExpr(p)} còn lại${notYet(p)}.${p.rent ? ` Tiền mặt bằng ${fmt(p.rent)}/tháng là chi phí hàng tháng nên Lomi không trừ vào đây — nhưng nhớ chừa sẵn vài tháng tiền thuê nha.` : ""}`;
  return null;
}

// ═══════════════ Câu ngắn / thiếu ngữ cảnh (Q1–20) ═══════════════
function shortTalk(q: string, c: V4Ctx): string | null {
  const n = N(q);
  const w = words(q);
  if (w <= 8 && VN(/\bcó ai (trực|ở đó|ở đây|đó|đây|online|thức)\b/).test(n)) return "Có Lomi trực đây nè 🙋 Bạn cần gì nè?";
  if (VN(/^ ((ủa|ơ|ê|ơi|hello) )?(alo|alô)( (alo|alô))*( (em|lomi|e|ơi|bạn))* $/).test(n)) return c.last ? "Lomi vẫn ở đây nè 🙋 Bạn cần gì nè?" : "Lomi đây nè 🙋 Bạn cần gì nè?";
  if (w <= 8 && VN(/\b(để|cho) (anh|a|em|e|chị|c|mình|tui|tôi|t) (nghĩ|suy nghĩ|tính|xem|cân nhắc) (lại |thêm )?(đã|chút|xíu|cái|thêm|nha|nhé)\b|\bđể (anh|a|em|e|chị|c|mình|tui|tôi|t) (nghĩ|suy nghĩ|tính) (lại|thêm)\b/).test(n))
    return "Dạ, bạn cứ thong thả nghĩ nha 😊 Lúc nào sẵn sàng thì nhắn Lomi.";
  if (w <= 8 && VN(/\b(em|lomi|e|bạn) (hài|vui tính|mắc cười|lầy|dễ thương)\b/).test(n)) return "Hihi, được khen vui tính thì Lomi vui cả ngày luôn á 😆";
  if (w <= 8 && VN(/\b(mắc cười|buồn cười quá|buồn cười ghê|hài quá|hài vậy|hài ghê|cười đau bụng|cười xỉu|cười muốn xỉu|cười bể bụng)\b/).test(n) && !VN(/\b(không|chẳng|chả|hông) (mắc|buồn|hài)/).test(n))
    return "Haha, có gì mắc cười vậy, kể Lomi cười với 😆";
  if (w <= 10 && VN(/\b(tàm tạm|không tốt không xấu|chẳng tốt chẳng xấu|cũng thường thôi|bình thường thôi|như mọi ngày|cũng bình thường)\b/).test(n))
    return "Một ngày bình thường, không tốt không xấu cũng ổn mà 😊 Có chuyện gì nho nhỏ muốn kể không, hay mình nói chuyện gì vui vui?";
  if (VN(/\b(độn thổ|muốn chui xuống đất|quê (quá|xệ|độ|muốn|ghê|xỉu)|quê muốn|xấu hổ muốn|ngại muốn chết)\b/).test(n))
    return "Haha, quê kiểu muốn độn thổ luôn hả 🙈 Ai cũng có vài lần như vậy, mà thường người khác quên nhanh hơn mình nghĩ nhiều. Có chuyện gì vậy, kể Lomi nghe nha (Lomi hứa không cười to đâu 😆)?";
  if (w <= 8 && VN(/\b(lú ngang|đang lú|lú quá|lú hết|rối não|rối quá|loạn não)\b/).test(n))
    return "Lú ngang hả 😵‍💫 Đang rối chuyện gì nè — việc cần làm, một quyết định, hay chuyện của ai đó? Kể đại khái là mình gỡ từng chút.";
  if (w <= 8 && VN(/\b(sai sai|kỳ kỳ|kì kì|lạ lạ|sao sao ấy|sao sao á)\b/).test(n))
    return c.last
      ? "Chỗ nào nghe sai sai vậy bạn? Bạn chỉ giúp Lomi ý nào trong câu vừa rồi chưa ổn, Lomi xem lại liền."
      : "Sai sai chỗ nào nè? Bạn đang nói tới chuyện gì — một việc trong app, hay chuyện ngoài đời? Nói cụ thể chút để Lomi khỏi đoán bừa nha.";
  if (VN(/\b(không|ko|chẳng|hông) (có )?ý (đó|đấy|vậy|thế|như vậy|như thế)\b|\bý (anh|a|em|e|chị|c|mình|tui|tôi|t) khác( cơ| mà| á)?\b|\bkhông phải ý (đó|vậy|thế)\b/).test(n) && w <= 10)
    return "Dạ, vậy Lomi hiểu chưa đúng ý bạn rồi, xin lỗi nha 🙏 Ý bạn là sao, nói lại giúp Lomi được không?";
  const fresh = !c.last || /gác chuyện|hỏi chuyện gì nè/u.test(c.last);
  if (fresh && w <= 8) {
    if (VN(/\b(có )?cách (nào|gì) (cho )?(đỡ|bớt|đỡ hơn|tốt hơn)\b/).test(n)) return "Bạn muốn đỡ chuyện gì nè — một triệu chứng, tâm trạng, hay một việc đang vướng? Kể Lomi nghe thêm chút nha.";
    if (VN(/\b(cái đó|việc đó|chuyện đó|vậy) có (đáng|đáng không|nên không)\b|\bcó đáng không\b/).test(n)) return "Bạn đang cân nhắc chuyện gì nè? Kể Lomi nghe “cái đó” là gì và bạn phải bỏ ra những gì (tiền, thời gian, công sức…) — mình cùng cân nhắc nha.";
    if (VN(/\b(trường hợp|cái|chuyện|vụ) kia\b/).test(n)) return "Trường hợp kia là trường hợp nào vậy bạn? Lomi chưa thấy mình nói tới trường hợp nào trước đó — bạn nói rõ giúp Lomi nha.";
    if (VN(/\b(cho|lấy|nêu) (anh|a|em|e|mình|tui|tôi)? ?(một |1 |vài )?ví dụ\b/).test(n)) return "Ví dụ cho chuyện gì nè? Bạn nói Lomi đang muốn hiểu chuyện gì để Lomi lấy ví dụ đúng nha.";
    if (VN(/\btóm (lại|tắt)\b/).test(n)) return "Bạn muốn Lomi tóm lại chuyện gì nè? Gửi Lomi nội dung đó nha.";
    if (VN(/\b(nên )?chọn (cái|bên|người|phương án) nào\b/).test(n)) return "Bạn đang phân vân giữa những lựa chọn nào nè? Kể Lomi nghe từng lựa chọn, mình cùng cân nhắc.";
  }
  return null;
}

// ── "Cho ví dụ đời thường", "tóm lại một câu", "???", "sai hoàn toàn" — dựa vào câu đáp ngay trước ──
const plain = (x: string) => x.replace(/\*\*/g, "").replace(/(🌿|🩺|📖|🔎|💡|🚫|📚|☕|⚠️|🍽️|📈)/gu, "").replace(/\s+/g, " ").trim();
function lastFollow(q: string, c: V4Ctx): string | null {
  const n = N(q);
  const w = words(q);
  if (!c.last) return null;
  if (w <= 8 && VN(/\b(ví dụ|vd|thí dụ)( đời thường| thực tế| cụ thể)?\b/).test(n) && VN(/\b(cho|lấy|nêu|có|đưa)\b/).test(n)) {
    if (/Mất ngủ|giờ ngủ|lên giường/u.test(c.last))
      return "Ví dụ đời thường nè 🌙\n• 10 giờ tối cắm sạc điện thoại ở phòng khách, vào phòng chỉ đọc sách giấy với đèn vàng\n• Dù tối qua ngủ tệ, sáng vẫn dậy đúng 6h30 như mọi ngày, không nằm nướng tới 9h\n• Nằm 20–30 phút mà chưa ngủ được thì ra ngoài ngồi đọc sách nhẹ, buồn ngủ mới vào lại\n• Ly cà phê cuối cùng trong ngày uống trước 2 giờ chiều";
    if (/caffeine|Cà phê/u.test(c.last))
      return "Ví dụ đời thường nè ☕\n• Sáng 1 ly cà phê sữa, trưa 1 ly nữa — thường vẫn trong mức an toàn cho người lớn khoẻ mạnh\n• Uống 4–5 ly đậm trong ngày, thêm nước tăng lực → dễ bị tim đập nhanh, run tay, khó ngủ\n• Uống ly cà phê lúc 5 giờ chiều → tối 11 giờ vẫn khó ngủ, vì caffeine còn tác dụng nhiều giờ";
    return "Lomi chưa có sẵn ví dụ đời thường cho chuyện này 😅 Bạn muốn ví dụ cho ý nào trong câu vừa rồi để Lomi thử nói cụ thể hơn?";
  }
  if (w <= 8 && VN(/\btóm (lại|tắt)\b/).test(n) && c.last.length > 120) {
    if (/Mất ngủ/u.test(c.last)) return "Tóm lại: giữ giờ ngủ – dậy cố định mỗi ngày, thư giãn và tránh màn hình trước khi ngủ, kéo dài vài tuần không đỡ thì đi khám.";
    const bl = c.last.split("\n").map((l) => l.trim()).filter((l) => /^•/u.test(l)).slice(0, 2).map((l) => plain(l.replace(/^•\s*/u, "")).replace(/[.;]$/u, ""));
    if (bl.length) return `Tóm lại: ${bl.map((b, i) => (i ? b.charAt(0).toLowerCase() + b.slice(1) : b)).join("; ")}.`;
    return `Tóm lại: ${plain(c.last).split(/(?<=[.!?])\s/u)[0]}`;
  }
  if (/^[?？\s]{2,}$/u.test(q.trim()) || VN(/^ (hả|hở|gì|cái gì|sao|là sao)\s*\?+ $/).test(n))
    return c.last.length > 120 ? "Chỗ nào trong câu vừa rồi chưa rõ vậy bạn? Bạn chỉ giúp Lomi ý nào, Lomi nói kỹ hơn đúng chỗ đó nha." : null;
  if (VN(/\b(câu trả lời|trả lời|em nói|lomi nói|nói)( vừa rồi| lúc nãy| đó)? (hoàn toàn |sai bét|sai hết|sai rồi|sai)( sai)?\b|\b(sai hoàn toàn|sai bét|sai hết rồi|sai be bét)\b/).test(n))
    return "Cảm ơn bạn nói thẳng 🙏 Sai ở chỗ nào vậy — thông tin chưa đúng, hay Lomi hiểu nhầm câu hỏi? Bạn chỉ giúp, Lomi xem lại và sửa. Nếu là kiến thức Lomi nói sai, bạn bấm 💡 Dạy Lomi để ban quản trị kiểm tra lại nha.";
  return null;
}

// ═══════════════ Nhu cầu nói chuyện & tâm lý (Q31–40) ═══════════════
function talkNeeds(q: string): string | null {
  const n = N(q);
  if (VN(/\b(nói thẳng|nói thật|thẳng thắn)( \S+){0,3}\b/).test(n) && VN(/\b(đừng|không cần|khỏi) (dỗ dành|dỗ|an ủi|nịnh|vuốt ve|nói giảm)\b/).test(n))
    return "Okie, Lomi sẽ nói thẳng, nói thật — nhưng không phán xét bạn đâu 👍 Bạn muốn Lomi nhận xét chuyện gì nè?";
  if (VN(/\b(biết (mình|anh|em|tôi|tui) sai|biết là sai) rồi\b/).test(n) && VN(/\b(đừng|thôi|khỏi) (trách|giảng|nói nữa|chửi|la)\b/).test(n))
    return "Dạ, Lomi không trách đâu 💚 Nhận ra mình sai đã là phần khó nhất rồi. Bạn muốn kể Lomi nghe chuyện đó, hay muốn tính cách sửa lại?";
  if (VN(/\b(cứ|hay|vẫn) (nghĩ|nhớ|suy nghĩ) (lại|mãi|hoài)( về)? (cuộc nói chuyện|chuyện|lời|câu)( \S+){0,3} (hôm qua|hôm trước|lúc nãy|tối qua)\b/).test(n))
    return "Cuộc nói chuyện hôm qua cứ lởn vởn trong đầu hả… Có câu nào hay khoảnh khắc nào làm bạn cứ nghĩ lại nhất vậy?";
  if (VN(/\b(sợ|ngại) (bắt đầu|làm|thử)( \S+){0,3} (rồi |lại |sẽ )?(thất bại|thua|hỏng|không thành|làm không được)\b/).test(n) && !VN(/\btrì hoãn\b/).test(n))
    return "Sợ thất bại trước cả khi bắt đầu là cảm giác rất thật — thường vì việc đó quan trọng với mình 💚\n\nMột cách giúp nhiều người: chọn một bước **thật nhỏ**, làm thử được trong 15–30 phút, và coi đó là **thử nghiệm** chứ chưa phải kỳ thi. Làm xong bước nhỏ, mình có thông tin thật để tính bước tiếp, thay vì chỉ có nỗi lo.\n\nĐiều bạn sợ nhất nếu thất bại là gì — mất tiền, mất thời gian, hay sợ người khác nghĩ về mình?";
  if (VN(/\b(muốn|cần) (ở|được ở|ở yên) (một mình|1 mình)( \S+){0,2} (vài|mấy|một|1|2|hai) (hôm|ngày|bữa)\b|\bmuốn (ở )?một mình (vài|mấy) (hôm|ngày|bữa)\b/).test(n))
    return "Muốn ở một mình vài hôm để nghỉ ngơi, sắp xếp lại suy nghĩ là nhu cầu rất bình thường 🌿 Nếu là để nạp lại năng lượng thì cứ cho mình khoảng đó, báo người thân một tiếng để họ khỏi lo.\n\nCòn nếu đang thấy mọi thứ quá sức, hay có lúc nghĩ tới chuyện làm hại bản thân, thì đừng ở một mình nha — nói với Lomi hoặc một người bạn tin.\n\nDạo này có chuyện gì làm bạn mệt không?";
  if (VN(/\b(bực|cáu|khó chịu|bực bội|bứt rứt)( \S+){0,3} (mà |nhưng )?(không|chẳng|chả) (biết|hiểu) (vì sao|tại sao|sao|vì gì)\b/).test(n))
    return "Bực mà không rõ vì sao cũng hay gặp lắm — nhiều khi do mệt, đói, thiếu ngủ, hay vài chuyện nhỏ dồn lại mà mình chưa gọi tên được. Hôm nay có chuyện gì, dù nhỏ, làm bạn khó chịu không?";
  if (VN(/\b(đừng|không|khỏi) (hỏi|hỏi dồn)( \S+){0,2} (\d+|nhiều|năm|mấy|liên tục|dồn dập)( câu)?( liên tục| một lúc| 1 lúc)?\b|\bhỏi (nhiều|dồn) quá\b/).test(n))
    return "Dạ, Lomi nhớ rồi — mỗi lần Lomi hỏi nhiều nhất một câu thôi nha 👍";
  return null;
}

// ═══════════════ Tình cảm (Q41–50) ═══════════════
function loveTalk(q: string): string | null {
  const n = N(q);
  if (VN(/\b(trả lời|rep|nhắn lại|reply)( tin nhắn| tin)? (chậm|lâu|trễ)( hơn)?( trước| xưa)?\b/).test(n) && VN(/\b(người yêu|ny|bạn gái|bạn trai|vợ|chồng|cô ấy|anh ấy|crush)\b/).test(n))
    return "Thấy người yêu trả lời chậm hơn trước thì dễ chột dạ lắm, Lomi hiểu 💚 Nhưng chỉ từ chuyện nhắn chậm thì **chưa kết luận được** là người ấy hết thương — có thể họ đang bận, mệt, áp lực chuyện riêng, hoặc đơn giản là thói quen nhắn tin thay đổi khi đã quen lâu.\n\nĐiều đáng nhìn hơn là những thứ khác: lúc gặp nhau người ấy có còn quan tâm, có hỏi han chuyện của bạn không. Nếu thấy chạnh lòng, nói nhẹ nhàng kiểu: “Dạo này em thấy mình ít nói chuyện hơn, em hơi nhớ. Anh dạo này bận lắm hả?” — hỏi để hiểu, không phải để trách.\n\nNgoài nhắn chậm, bạn có thấy người ấy khác ở chỗ nào nữa không?";
  if (VN(/\bghen\b/).test(n) && VN(/\b(không|chưa|chẳng) có (bằng chứng|chứng cứ|lý do)\b/).test(n))
    return "Biết mình không có bằng chứng mà vẫn ghen — vậy là bạn đang tách được **cảm giác** với **sự thật** rồi đó, không phải ai cũng làm được 💚\n\nCảm giác ghen là thật, nhưng nó chưa chứng minh người ấy làm gì sai. Thử tự hỏi: điều gì làm cơn ghen bùng lên — một hành động cụ thể của người ấy, hay nỗi lo từ bên trong mình (sợ mất, chuyện cũ từng bị phản bội, đang thấy mình chưa đủ tốt)? Nếu là nỗi lo bên trong, nói với người ấy theo kiểu “em đang thấy bất an” sẽ hiệu quả hơn là tra hỏi.\n\nCơn ghen thường đến vào lúc nào vậy bạn?";
  if (VN(/\bxin lỗi\b/).test(n) && VN(/\b(không|chẳng) (muốn )?(nhận|chịu) (hết|toàn bộ|tất cả) (lỗi|phần lỗi)\b|\bkhông phải lỗi (hết )?của (mình|anh|em|tôi)\b/).test(n))
    return "Xin lỗi **phần của mình** mà không nhận hết lỗi là hoàn toàn được — vậy còn thật lòng hơn là nhận đại cho xong 👍\n\nVí dụ: “Anh xin lỗi vì hôm đó đã lớn tiếng với em — phần đó là anh sai. Còn chuyện kia thì anh nghĩ hai đứa mình cần nói lại cho rõ, không phải lỗi của riêng ai.”\n\n• Nói cụ thể mình xin lỗi vì điều gì\n• Tránh “anh xin lỗi, **nhưng**…” — chữ “nhưng” làm lời xin lỗi mất tác dụng; tách phần cần bàn ra thành một câu riêng\n• Chọn lúc cả hai bình tĩnh để nói phần còn lại\n\nBạn muốn xin lỗi về chuyện gì, để Lomi giúp chỉnh câu cho sát?";
  if (VN(/\b(không còn|không|chẳng|hết) muốn (nhắn|chủ động|nhắn tin) (trước|nữa)( nữa)?\b/).test(n))
    return "Không muốn nhắn trước nữa hả… Có khi là vì bạn đã mệt khi lúc nào cũng là người chủ động, và lòng mình đang nói “mình cũng cần được tìm tới” 💚 Cảm giác đó đáng được lắng nghe.\n\nBạn muốn thử lùi lại xem người ấy có chủ động không, hay muốn nói thẳng với người ấy cảm giác này?";
  if (VN(/\btừ chối\b/).test(n) && VN(/\b(tỏ tình|lời tỏ tình|tình cảm|cưa|thả thính|theo đuổi|crush mình|thích mình)\b/).test(n))
    return "Từ chối một lời tỏ tình mà tử tế thì nên **rõ ràng, sớm, và ngắn gọn** — mập mờ cho đỡ ngại mới là điều làm người ta đau lâu hơn.\n\nVí dụ: “Cảm ơn bạn đã nói thật lòng, mình biết nói ra vậy cần nhiều can đảm. Mình quý bạn, nhưng mình không có tình cảm theo kiểu đó, nên mình không muốn để bạn hy vọng. Mong là bạn hiểu cho mình.”\n\n• Nói riêng, đừng nói trước mặt người khác\n• Đừng đưa lý do dễ “mặc cả” (kiểu “giờ mình bận lắm”) nếu đó không phải lý do thật\n• Sau đó giữ khoảng cách vừa phải một thời gian, đừng nhắn kiểu thả thính lại\n\nNgười đó là bạn bè thân hay người mới quen?";
  if (VN(/\b(bí mật|chuyện riêng)\b/).test(n) && VN(/\b(lỡ (nói|kể)|nói ra|kể ra|lỡ miệng|để lộ|nói lộ)\b/).test(n))
    return "Lỡ nói ra bí mật bạn thân tin mình kể thì áy náy lắm 😔 Sửa được, nhưng cần làm nhanh và thật lòng:\n\n• **Tự nói với người bạn đó trước**, đừng để bạn ấy nghe từ người khác\n• Nhận thẳng, không biện minh: “Mình xin lỗi, mình đã kể chuyện đó cho X. Bạn tin mình mà mình làm vậy là sai.”\n• Nếu được, nhờ người đã nghe giữ kín giúp\n• Cho bạn ấy thời gian giận, đừng ép tha thứ ngay\n• Về sau giữ lời thật kỹ — niềm tin quay lại bằng hành động lặp lại, không phải bằng một lời xin lỗi\n\nBạn biết chuyện đã lan tới ai chưa?";
  return null;
}

// ═══════════════ Sức khoẻ (Q51–70) ═══════════════
export function healthV4(q: string, c: V4Ctx): string | null {
  const n = N(q);
  if (VN(/\b(ngủ đủ|ngủ nhiều|ngủ đủ giấc|ngủ 8 tiếng|ngủ 8 tiếng)\b/).test(n) && VN(/\b(vẫn|mà vẫn|vẫn còn) (buồn ngủ|ngáp|lừ đừ|ngủ gật)\b/).test(n))
    return "Ngủ đủ mà ngày vẫn buồn ngủ thì đáng để ý nha 🌙 Có vài điều thường gặp:\n• **Chất lượng ngủ** chưa tốt dù đủ giờ: ngáy to, ngưng thở lúc ngủ, hay tỉnh giữa đêm, phòng ồn / sáng\n• Giờ ngủ thất thường, dùng điện thoại tới khuya, cà phê / rượu buổi tối\n• Căng thẳng, buồn chán kéo dài\n• Một số bệnh và thuốc cũng gây mệt, buồn ngủ (thiếu máu, tuyến giáp, tiểu đường, thuốc dị ứng, thuốc an thần…)\n\nNên đi khám (Nội tổng quát) nếu kéo dài hơn vài tuần, hoặc kèm: ngủ gật khi đang làm việc / lái xe, người nhà nói bạn ngáy to hay ngưng thở lúc ngủ, sụt cân, buồn bã kéo dài.\n\nTình trạng này kéo dài bao lâu rồi, và bạn có hay tỉnh giữa đêm không?";
  if (VN(/\b(cà phê|cafe|cf|caffeine|nước tăng lực|trà đặc)\b/).test(n) && VN(/\b(run tay|run run|tay run|bị run)\b/).test(n))
    return "Run tay sau khi uống cà phê thường do **caffeine** kích thích hệ thần kinh, hay gặp khi uống nhiều, uống ly đậm, uống lúc bụng đói, hoặc người nhạy với caffeine. Thường sẽ đỡ dần sau vài giờ.\n• Uống thêm nước, ăn chút gì, tạm ngưng cà phê / nước tăng lực hôm nay\n• Lần sau giảm lượng, pha nhạt hơn, đừng uống lúc đói\n\n⚠️ Gọi **115** hoặc đi cấp cứu nếu kèm: **đau ngực, khó thở, tim đập rất nhanh hay loạn nhịp, ngất / gần ngất, lú lẫn**, hoặc lỡ dùng rất nhiều caffeine (thuốc / bột caffeine, nhiều lon tăng lực). Run tay cả khi không uống cà phê thì nên đi khám.\n\nHôm nay bạn uống khoảng mấy ly?";
  if (VN(/\bđau lưng\b/).test(n) && VN(/\b(ngồi lâu|ngồi nhiều|ngồi cả ngày|ngồi máy tính)\b/).test(n))
    return "Đau lưng do ngồi lâu thường **không nguy hiểm**, hay do tư thế và ít vận động — đứng dậy đi lại mỗi 30–60 phút, chỉnh ghế màn hình ngang tầm mắt, giữ lưng tựa ghế, vận động nhẹ đều đặn thường giúp đỡ nhiều.\n\n⚠️ Nhưng cần để ý: **gọi 115 / đi cấp cứu ngay** nếu đau lưng kèm tê vùng háng – mông – quanh hậu môn, tiểu không tự chủ hay bí tiểu, yếu hoặc tê cả hai chân. **Đi khám sớm** nếu: tê / yếu một chân, sốt, sụt cân không rõ lý do, sau té ngã / va chạm, đau dữ dội không đỡ khi nằm nghỉ, hoặc kéo dài hơn vài tuần.\n\nBạn có thấy tê hay yếu ở chân không?";
  if (VN(/\b(huyết áp|ha)\b/).test(n) && VN(/\b(một lần|1 lần|lần đầu|vừa đo|mới đo|đo thử)\b/).test(n) && VN(/\b(cao|hơi cao)\b/).test(n))
    return "Một lần đo hơi cao **chưa đủ để nói là tăng huyết áp** đâu — huyết áp thay đổi theo lúc vừa đi lại, căng thẳng, cà phê, thuốc lá, đo sai tư thế.\n\nĐo lại cho chuẩn:\n• Ngồi nghỉ 5 phút, lưng tựa ghế, chân chạm sàn, tay đặt ngang tim\n• Không cà phê, thuốc lá, tập thể dục 30 phút trước khi đo\n• Đo 2 lần, cách nhau 1–2 phút; đo sáng và tối trong vài ngày, ghi lại\n• Mang số đo đi khám để bác sĩ đánh giá\n\n⚠️ Gọi **115** nếu huyết áp rất cao (từ 180/120 trở lên) kèm đau đầu dữ dội, đau ngực, khó thở, yếu liệt, nói khó hoặc nhìn mờ.\n\nLần đó bạn đo được bao nhiêu?";
  if (VN(/\b(ù tai|tai bị ù|tai ù|nghe kém|giảm thính lực|điếc)\b/).test(n) && VN(/\b(một bên|1 bên|bên trái|bên phải|tự nhiên|đột ngột|đột nhiên|bỗng)\b/).test(n))
    return "Ù tai **tự nhiên ở một bên** thì nên để ý thính lực nha 👂\n\n⚠️ Nếu **nghe kém đi đột ngột** (dù chỉ một bên), nên đi khám Tai Mũi Họng **càng sớm càng tốt, trong vòng 1–2 ngày** — điếc đột ngột điều trị sớm mới có hiệu quả, đừng chờ xem có tự hết không. **Đi cấp cứu ngay** nếu kèm méo miệng, yếu tay chân, nói khó, chóng mặt dữ dội hoặc đau đầu dữ dội.\n\nNếu chỉ ù nhẹ mà nghe vẫn bình thường (sau đi máy bay, cảm cúm, nghẹt mũi, ráy tai) thì thường tự đỡ — đừng tự ngoáy tai sâu; quá 1–2 tuần không đỡ thì đi khám.\n\nTai đó có nghe kém hơn bên kia không?";
  if (VN(/\b(hai|2|nhiều|mấy) (loại )?thuốc cảm\b|\bthuốc cảm\b.*\b(cùng lúc|chung với|uống chung|kết hợp)\b/).test(n))
    return "Cẩn thận chỗ này nha: nhiều thuốc cảm **trùng hoạt chất** — hay gặp nhất là **paracetamol**, ngoài ra còn thuốc chống nghẹt mũi và thuốc chống dị ứng (gây buồn ngủ). Uống hai loại cùng lúc dễ thành **quá liều mà không biết**, nhất là paracetamol (có thể hại gan).\n\n• Đọc phần **thành phần** trên hai hộp: nếu cùng có một hoạt chất thì đừng uống chung\n• Đưa cả hai hộp cho dược sĩ xem là chắc nhất\n• Có bệnh gan, huyết áp, tim, đang mang thai hay đang uống thuốc khác thì càng nên hỏi trước\n\nHai thuốc bạn định uống tên gì, hoặc thành phần ghi gì?";
  if (VN(/\b(vitamin|thực phẩm chức năng|tpcn|viên uống|canxi|sắt|kẽm|omega)\b/).test(n) && VN(/\b(không biết|chưa biết|bao nhiêu|mấy viên|liều)\b/).test(n) && VN(/\b(liều|bao nhiêu|mấy viên|uống sao)\b/).test(n))
    return "Liều vitamin **tuỳ sản phẩm và hàm lượng** mỗi viên, nên Lomi không đoán một con số chung được 🙏\n• Xem phần **“Liều dùng” / “Cách dùng”** trên nhãn hoặc tờ hướng dẫn, và đừng uống quá mức ghi trên đó\n• Đang uống nhiều sản phẩm cùng lúc thì cộng lại xem có trùng không (vd vitamin tổng hợp + viên vitamin D riêng)\n• Uống quá liều một số loại (A, D, sắt…) có thể gây hại\n• Đang mang thai, có bệnh nền hay uống thuốc khác thì hỏi dược sĩ / bác sĩ\n\nBạn đang uống sản phẩm nào, mỗi viên ghi hàm lượng bao nhiêu?";
  if (VN(/\bthuốc\b/).test(n) && VN(/\b(người nhà|nhà (anh|em|mình|tôi|a|e)|mẹ|ba|bố|vợ|chồng|bạn|hàng xóm|người khác)( \S+){0,3} (uống|dùng|xài)( \S+){0,3} (hiệu quả|đỡ|khỏi|tốt|hết)\b/).test(n) && VN(/\b(uống theo|dùng theo|xài theo|uống thử|xin|uống luôn)\b/).test(n))
    return "Đừng uống theo thuốc của người khác nha, kể cả khi người nhà thấy hiệu quả 🙏 Thuốc bác sĩ kê cho ai là theo bệnh, cân nặng, tuổi, bệnh nền và các thuốc khác của người đó — triệu chứng giống nhau chưa chắc là cùng bệnh, và cùng thuốc có thể hợp với người này mà hại người kia (dị ứng, tương tác thuốc, sai liều).\n\nBạn đang bị triệu chứng gì? Lomi chỉ những điều nên biết và lúc nào cần đi khám; còn thuốc thì để bác sĩ hoặc dược sĩ chọn cho đúng bạn.";
  if (VN(/\b(nổi ban|phát ban|nổi mẩn|mề đay|nổi mề đay|ngứa)\b/).test(n) && VN(/\b(thuốc mới|uống thuốc|dùng thuốc|sau khi uống|đổi thuốc)\b/).test(n))
    return "Nổi ban sau khi dùng thuốc mới có thể là **phản ứng với thuốc**, nên kiểm tra mấy dấu hiệu nặng trước nha:\n\n🚨 Gọi **115** ngay nếu có: **khó thở, khò khè, sưng môi – lưỡi – mặt – họng, choáng / muốn xỉu**, hoặc ban lan nhanh, **phỏng nước, bong da, loét miệng / mắt**, kèm sốt.\n\nNếu chỉ nổi ban ngứa mà không có các dấu hiệu trên: **liên hệ bác sĩ đã kê hoặc dược sĩ ngay hôm nay** để hỏi có cần ngưng hay đổi thuốc không — đừng tự uống tiếp liều sau khi chưa hỏi, và mang theo hộp thuốc. Nhớ ghi lại tên thuốc này để lần sau báo bác sĩ là từng bị phản ứng.\n\nBạn có thấy khó thở hay sưng mặt, môi không?";
  if (VN(/\b(bé|con|cháu|trẻ)\b/).test(n) && VN(/\bsốt\b/).test(n) && VN(/\b(chưa|không) (có )?(đo|có nhiệt kế|biết bao nhiêu độ)\b/).test(n))
    return "Bé bao nhiêu tuổi (hoặc bao nhiêu tháng) vậy bạn? Mình đo nhiệt độ cho bé trước nha — sờ trán không đủ chính xác; nhiệt kế điện tử đo ở nách là dễ nhất với trẻ nhỏ. Có tuổi và nhiệt độ thì Lomi nói rõ mức nào theo dõi ở nhà được, mức nào cần đi khám.\n\nTrong lúc đó: cho bé bú / uống thêm nước, mặc thoáng, đừng ủ ấm.\n\n🚨 Đưa đi khám ngay hoặc gọi **115** nếu bé: **dưới 3 tháng tuổi**, li bì / khó đánh thức, bỏ bú, thở nhanh hay khó thở, co giật, tím tái, nổi ban không mất khi ấn, hoặc bạn thấy bé có gì đó không ổn.";
  return null;
}

/** Lớp sớm (trước bảng cấp cứu theo triệu chứng): đau ngực đã hết, viết truyện có nhân vật uống nhầm hoá chất. */
export function earlyV4(q: string): string | null {
  const n = N(q);
  if (VN(/\bđau (ngực|tức ngực)|tức ngực\b/).test(n) && VN(/\b(thoáng qua|hết rồi|giờ hết|đã hết|giờ đỡ|đỡ rồi|vài giây|một lúc rồi hết)\b/).test(n) && !VN(/\b(đang|vẫn|còn) (đau|tức)|khó thở|vã mồ hôi|lan ra|ngất\b/).test(n))
    return "Đau ngực **dù đã hết** cũng đừng vội coi là không sao nha — có những cơn liên quan tới tim cũng đến rồi đi.\n\n🚨 Gọi **115** ngay nếu cơn đau **quay lại**, hoặc kèm: khó thở, vã mồ hôi, buồn nôn, choáng, đau lan ra tay – vai – hàm – lưng, hay cảm giác bị đè nặng ngực.\n\nNếu đã hết hẳn và không có các dấu hiệu trên, vẫn nên **đi khám trong hôm nay hoặc sớm nhất có thể** (Nội tim mạch / Nội tổng quát), nhất là khi bạn trên 40 tuổi, hút thuốc, có huyết áp cao, tiểu đường, mỡ máu hay người nhà có bệnh tim. Đau nhói khi ấn vào ngực hoặc khi xoay người thì hay do cơ – xương hơn, nhưng để bác sĩ xác định.\n\nCơn đau đó kéo dài bao lâu, và lúc đó bạn đang làm gì?";
  if (VN(/\b(viết truyện|viết tiểu thuyết|viết kịch bản|trong truyện|nhân vật|cho truyện|làm phim)\b/).test(n) && VN(/\b(uống nhầm|uống phải|nuốt phải|ngộ độc|hoá chất|hóa chất|chất độc|thuốc)\b/).test(n))
    return "Vì là chi tiết cho truyện, Lomi gợi ý hướng viết cho **sát thực tế và an toàn** nha ✍️\n• Người bên cạnh phản ứng đúng: gọi **115** ngay, mang theo chai / bao bì hoá chất cho bác sĩ xem, **không cố gây nôn**, không cho uống thêm thứ gì để “giải”\n• Triệu chứng tuỳ loại chất nên bạn có thể viết chung: đau rát họng – bụng, buồn nôn, khó thở, lơ mơ; có lúc ban đầu trông bình thường rồi mới nặng dần — chi tiết này tạo căng thẳng khá thật\n• Ở bệnh viện, bác sĩ hỏi uống gì, bao nhiêu, lúc nào, rồi theo dõi và điều trị theo chất đó\n\nLomi không đi vào liều lượng hay loại chất cụ thể gây hại thế nào. Còn nếu ngoài đời có ai thật sự vừa uống phải hoá chất thì gọi **115** ngay nha. Nhân vật của bạn là ai, và cảnh này xảy ra ở đâu?";
  return null;
}

// ═══════════════ Tài chính & kinh doanh (Q71–80) ═══════════════
function moneyV4(q: string): string | null {
  const n = N(q);
  const t = q.normalize("NFC").toLowerCase();
  const inc = t.match(new RegExp(`(?:thu nhập|lương|kiếm)[^\\d]{0,12}${TR}`, "u"));
  const fix = t.match(new RegExp(`(?:chi cố định|chi phí cố định|chi tiêu cố định|cố định|chi)[^\\d]{0,12}${TR}`, "u"));
  if (inc && fix && fix.index !== inc.index) {
    const a = num(inc[1]), b = num(fix[1]);
    return `${fmt(a)} − ${fmt(b)} (chi cố định) = **${fmt(a - b)}** còn lại mỗi tháng sau các khoản cố định bạn kể.\n\nBạn muốn dùng ${fmt(a - b)} này cho việc gì — tiết kiệm, trả nợ, hay muốn Lomi gợi ý cách chia?`;
  }
  const sv = t.match(new RegExp(`(?:tiết kiệm|để dành|bỏ ống|gửi)[^\\d]{0,10}${TR}\\s*(?:mỗi|một|1|\\/)\\s*tháng`, "u"));
  const yrs = n.match(VN(/\b(một|1|hai|2|ba|3|năm|5|mười|10) năm\b/));
  if (sv && yrs) {
    const Y: Record<string, number> = { "mot": 1, "1": 1, "hai": 2, "2": 2, "ba": 3, "3": 3, "nam": 5, "5": 5, "muoi": 10, "10": 10 };
    const y = Y[normalizeVi(yrs[1])] ?? 1;
    const m = num(sv[1]);
    return `${fmt(m)} × ${12 * y} tháng = **${fmt(m * 12 * y)}** sau ${y} năm — đây là số tiền **gốc, chưa tính lãi**. Gửi tiết kiệm có lãi thì sẽ nhỉnh hơn một chút, tuỳ lãi suất ngân hàng lúc đó.`;
  }
  if (VN(/\btrả nợ\b/).test(n) && VN(/\b(quỹ dự phòng|dự phòng|tiền dự phòng|quỹ khẩn cấp)\b/).test(n))
    return "Làm được cả hai, theo thứ tự này nè 💡\n1. Giữ đủ **chi tiêu thiết yếu** (ăn, ở, đi lại) và **trả đủ mức tối thiểu** mọi khoản nợ đúng hạn để khỏi bị phạt, khỏi lãi chồng lãi\n2. Lập một **quỹ dự phòng nhỏ** trước — ví dụ khoảng 1 tháng chi tiêu thiết yếu — để lỡ có chuyện thì không phải vay thêm\n3. Tiền dư còn lại dồn trả **khoản nợ lãi cao nhất** trước (thẻ tín dụng, vay tiêu dùng, vay app)\n4. Hết nợ lãi cao thì nâng dần quỹ dự phòng lên khoảng 3–6 tháng chi tiêu\n\nLomi không phải chuyên gia tài chính, nên đây là nguyên tắc chung thôi nha. Khoản nợ của bạn lãi khoảng bao nhiêu mỗi tháng?";
  if (VN(/\b(ý tưởng kinh doanh|ý tưởng bán|muốn kinh doanh|định kinh doanh)\b/).test(n) && VN(/\b(chưa biết|không biết|chưa rõ)( \S+){0,2} (khách|khách hàng|bán cho ai)\b/).test(n))
    return "Bắt đầu từ khách hàng là đúng hướng đó 👍\n1. **Viết ra 1–2 nhóm khách cụ thể**: ai, bao nhiêu tuổi, ở đâu, đang gặp vấn đề gì mà sản phẩm của bạn giải quyết\n2. **Nói chuyện thật với 5–10 người** trong nhóm đó (không chỉ bạn bè): hỏi lần gần nhất họ gặp vấn đề đó là khi nào, họ đang giải quyết bằng cách gì, tốn bao nhiêu\n3. **Thử bán nhỏ**: nhận đặt trước, bán thử một mẻ, đăng bài giới thiệu xem có ai hỏi mua thật không\n4. Nhóm nào phản hồi mạnh nhất (chịu trả tiền, hỏi lại) thì tập trung vào nhóm đó\n\nÝ tưởng của bạn là bán gì vậy?";
  if (VN(/\b(làm sao|cách|sao) (để )?biết( \S+){0,2} (khách|khách hàng|người ta)( \S+){0,2} (có )?(thật sự |thực sự )?(cần|muốn mua|chịu mua)\b/).test(n))
    return "Cách chắc nhất là xem **hành động**, không chỉ lời khen 👍\n• **Hỏi về chuyện đã xảy ra**, đừng hỏi “bạn có mua không?”: “Lần gần nhất bạn gặp vấn đề này là khi nào? Bạn đã làm gì? Tốn bao nhiêu?” — người đang tự tìm cách giải quyết mới là người cần thật\n• **Thử nhỏ trước khi làm lớn**: nhận đặt trước / đặt cọc, bán thử một mẻ nhỏ, đăng bài giới thiệu xem có ai nhắn hỏi giá\n• Bạn bè nói “hay đó” chưa phải bằng chứng — **có người chịu trả tiền** hoặc quay lại mua lần hai mới là tín hiệu tốt\n\nSản phẩm của bạn là gì để Lomi gợi ý cách thử cụ thể hơn?";
  if (VN(/\b(cam kết|đảm bảo|bảo đảm)( \S+){0,3} (100|một trăm) ?(%|phần trăm)?|\b(hiệu quả|khỏi|thành công) (100|một trăm) ?(%|phần trăm)?\b/).test(n) && VN(/\b(quảng cáo|đăng|ghi|viết|slogan|bài|giới thiệu)\b/).test(n))
    return "Lomi khuyên **đừng dùng “cam kết hiệu quả 100%”** nha ⚠️\n• Gần như không sản phẩm nào hiệu quả với 100% người — chỉ cần vài khách không như ý là thành mang tiếng nói quá, mất uy tín\n• Quảng cáo nói quá, không chứng minh được dễ bị coi là gây hiểu lầm cho khách và có thể vi phạm quy định về quảng cáo — nhất là với sản phẩm sức khoẻ, làm đẹp\n\nCách nói trung thực mà vẫn thuyết phục:\n• “Hoàn tiền trong 7 ngày nếu không hài lòng” (nếu bạn làm được thật)\n• Dẫn số liệu **thật**: “Hơn 200 khách đã dùng”, kèm đánh giá thật của khách\n• Nói rõ sản phẩm hợp với ai, dùng thế nào thì hiệu quả nhất\n\nBạn đang bán sản phẩm gì để Lomi gợi ý câu quảng cáo sát hơn?";
  if (VN(/\b(đánh giá|review|bình luận|feedback)( \S+){0,2} (giả|ảo|fake|tự viết|seeding)\b|\b(mua|thuê|cày)( \S+){0,2} (đánh giá|review|sao)\b|\b(giả|ảo) (đánh giá|review)\b/).test(n))
    return "Lomi không giúp làm đánh giá giả được nha 🙏 Vừa không công bằng với khách đang tin vào đánh giá, vừa dễ bị phát hiện (nhiều đánh giá giống nhau, tài khoản mới) — lúc đó mất uy tín còn nặng hơn là ít đánh giá.\n\nCách có thêm đánh giá **thật**:\n• Xin khách hài lòng để lại đánh giá **ngay lúc họ vui nhất** — lúc thanh toán, lúc nhận hàng\n• Đặt mã QR / đường link tới trang của quán ở quầy, trên hoá đơn\n• Nhắn cảm ơn khách quen kèm lời nhờ đánh giá\n• Trả lời mọi đánh giá, kể cả chê — khách mới rất để ý cách quán xử lý lời chê\n• Đừng đổi quà để lấy đánh giá 5 sao; muốn tặng thì tặng cho mọi người góp ý, khen hay chê đều được\n\nQuán bạn đang có khoảng bao nhiêu khách quen?";
  if (VN(/\b(vay|mượn|vay tiền|vay ngân hàng|vay app)\b/).test(n) && VN(/\b(đầu tư|lợi nhuận|sinh lời|lãi cao)\b/).test(n))
    return "Vay để đầu tư thì phải cẩn thận gấp đôi nha ⚠️ Lomi không tư vấn đầu tư cụ thể được, nhưng có mấy điều nên tự trả lời trước:\n• **Lãi vay bao nhiêu**, kỳ hạn trả thế nào — tiền lãi phải trả **chắc chắn**, còn lợi nhuận đầu tư thì **không chắc**\n• Nếu khoản đầu tư **mất hết**, bạn có còn trả được nợ mà vẫn sống ổn không?\n• “Nghe nói lợi nhuận cao” là dấu hiệu nên dè chừng: hứa lãi cao, đều đặn, ít rủi ro thường là chiêu lừa (đa cấp, sàn ảo, góp vốn kiểu “kéo” người)\n• Hiểu rõ mình đang bỏ tiền vào cái gì, ai quản lý, rút ra được không\n\nNếu chưa trả lời chắc được mấy câu trên thì đừng vay để đầu tư. Muốn chắc hơn thì hỏi một người tư vấn tài chính độc lập. Bạn nghe tới khoản đầu tư này từ đâu vậy?";
  return null;
}

// ═══════════════ Tarot (Q82–90) ═══════════════
function tarotV4(q: string): string | null {
  const n = N(q);
  if (VN(/\b(bài|lá bài|tarot|quẻ)\b/).test(n) && VN(/\b(chắc chắn|chắc chắn là|đúng không|phải không|chắc luôn)\b/).test(n) && VN(/\b(quay lại|về với|yêu|cưới|thành công|đậu|trúng)\b/).test(n))
    return "Lomi không hứa chắc được đâu 🙏 Bài đẹp chỉ là một góc nhìn để mình ngẫm — người ấy có quay lại hay không còn tuỳ vào suy nghĩ, hoàn cảnh và lựa chọn của chính người ấy, lá bài không quyết định thay được.\n\nNếu bạn đang mong người ấy quay lại, điều thực tế hơn là nhìn vào chuyện đã xảy ra giữa hai người và điều bạn thật sự cần. Bạn muốn kể Lomi nghe chuyện hai người không?";
  if (VN(/\b(rút bài|xem bài|bói|tarot)\b/).test(n) && VN(/\b(càng (xem|bói|rút)( \S+){0,2} càng (lo|sợ|hoang mang|bất an|rối)|lo hơn|sợ hơn|hoang mang hơn)\b/).test(n))
    return "Nếu càng xem càng lo thì mình **tạm dừng rút bài** nha 💚 Lá bài là để gợi suy nghĩ, còn lúc đang lo thì đọc lá nào mình cũng dễ thấy điều đáng sợ.\n\nThử quay về điều thực tế một chút:\n• Điều cụ thể bạn đang lo là gì?\n• Phần nào trong đó bạn làm được gì đó hôm nay, dù nhỏ?\n• Có ai bạn tin để kể chuyện này không?\n\nBạn kể Lomi nghe điều đang làm bạn lo được không?";
  if (VN(/\b(hỏi|rút|bói)( \S+){0,4} (đến khi|tới khi|cho tới khi|cho đến khi|đến lúc|tới lúc) (ra |được )?(bài|lá) (đẹp|tốt|tích cực|mình muốn)\b|\brút (lại )?(nhiều lần|hoài|mãi) (cho|đến|tới) (ra )?(bài|lá) (đẹp|tốt)\b/).test(n))
    return "Hỏi đi hỏi lại tới khi ra bài đẹp thì lá đẹp đó cũng **không thành bằng chứng** đâu — vì mình đã chọn dừng đúng lúc nó ra điều mình muốn nghe 😅 Rút mãi thì kiểu gì cũng có lần ra lá đẹp.\n\nCách dùng tarot có ích hơn: hỏi **một lần**, đọc kỹ, và để ý mình **mong** nó ra lá gì — chính mong muốn đó thường nói lên nhiều điều. Bạn đang mong nghe câu trả lời gì vậy?";
  if (VN(/\btarot\b|\bbói bài\b|\bxem bài\b/).test(n) && VN(/\b(thay (thế )?(được )?(cho )?(tư vấn|trị liệu|bác sĩ|chuyên gia|nhà tâm lý)|thay được tư vấn)\b/).test(n))
    return "Không nha — tarot **không thay được** tư vấn tâm lý hay chăm sóc chuyên môn 🙏 Tarot có thể giúp mình ngồi lại ngẫm chuyện của mình, nhưng nó không đánh giá được tình trạng tâm lý, không có kế hoạch hỗ trợ, và không theo dõi mình qua thời gian như chuyên gia tâm lý hay bác sĩ.\n\nNếu bạn đang buồn bã, lo âu, mất ngủ kéo dài hay thấy quá tải, nên gặp chuyên gia tâm lý hoặc bác sĩ. Còn muốn tâm sự ngay lúc này thì Lomi nghe nè. Dạo này bạn ổn không?";
  if (VN(/\b(xem bài|bói|rút bài|tarot)\b/).test(n) && VN(/\b(tài chính lớn|quyết định lớn|đầu tư|mua nhà|mua đất|vay|khoản tiền lớn|quyết định tài chính)\b/).test(n))
    return "Lomi rút bài được để bạn **ngẫm thêm**, nhưng đừng dùng tarot làm căn cứ cho một quyết định tài chính lớn nha 🙏 Chuyện tiền lớn nên dựa vào con số thật: mình có bao nhiêu, mất thì chịu được tới đâu, lãi / rủi ro thế nào, và hỏi người có chuyên môn.\n\nNếu vẫn muốn rút một lá để xem mình đang nghiêng về đâu, gõ “bói” kèm câu hỏi nha. Bạn đang cân nhắc quyết định gì vậy?";
  if (VN(/\b(kết quả|bài|lần bói|quẻ)( \S+){0,3} (lần trước|hôm trước|bữa trước|trước đó)( \S+){0,2} (không|chẳng|chả) (giống|đúng|khớp|trúng)\b|\b(bói|bài) (không|chẳng) (đúng|trúng|linh)\b/).test(n))
    return "Cảm ơn bạn đã nói thật 🙏 Tarot không dự đoán chính xác tương lai được, nên kết quả lần trước không khớp thực tế là chuyện bình thường — Lomi không bẻ nghĩa lá bài cho “khớp” đâu.\n\nNếu thấy hữu ích thì cứ coi lá bài là gợi ý để ngẫm; còn quyết định thì dựa vào chuyện thật đang xảy ra. Chuyện lần đó diễn ra thế nào vậy?";
  return null;
}

// ═══════════════ Về app và về Lomi (Q92–98) ═══════════════
function appV4(q: string): string | null {
  const n = N(q);
  if (VN(/\b(cửa hàng|doanh nghiệp|quán|shop|tiệm)\b/).test(n) && VN(/\b(chưa (được )?duyệt|chờ duyệt|đợi duyệt|chưa thấy duyệt)\b/).test(n))
    return "Lomi không xem được tài khoản của bạn nên không biết chắc hồ sơ đang ở trạng thái nào nha 🙏 Hồ sơ doanh nghiệp mới cần Ban quản trị duyệt, thường có mấy khả năng:\n• **Đang chờ duyệt** — đợi thêm một chút, duyệt xong app sẽ báo\n• **Bị yêu cầu bổ sung** — xem ghi chú “Ban quản trị yêu cầu bổ sung” trong Hồ sơ doanh nghiệp hoặc trong thông báo, sửa đúng mục rồi Lưu là hồ sơ tự gửi lại\n• Chờ lâu mà không thấy gì → liên hệ Ban quản trị ở Hồ sơ → ⋯ → Trợ giúp & Liên hệ";
  if (VN(/\b(bấm|nhấn|ấn) (nút )?(lưu|gửi|đăng|cập nhật)\b/).test(n) && VN(/\b(bị )?(đứng|treo|đơ|văng|crash|quay mãi|xoay mãi|không phản hồi)\b/).test(n))
    return "Lomi xin lỗi vì app bị đứng nha 🙏 Lomi không tự xem hay sửa được máy của bạn, nhưng bạn giúp gửi vài thông tin để Ban quản trị sửa nhanh:\n• Màn hình nào, bấm lưu cái gì (vd hồ sơ, ưu đãi, bài đăng)\n• Điện thoại / trình duyệt gì\n• Có hiện báo lỗi không — chụp màn hình giúp\n\nGửi ở Hồ sơ → ⋯ → Trợ giúp & Liên hệ. Trong lúc chờ, thử: kiểm tra mạng, tải lại trang rồi thử lại; nội dung nhập dài thì sao chép ra trước để khỏi mất.";
  if (VN(/\b(ai (đã |đang )?(xem|vào|ghé)|ai xem|ai vào xem|ai ghé)( \S+){0,2} (hồ sơ|trang cá nhân|profile|trang)\b|\b(xem|biết) (được )?ai (đã )?(xem|vào)\b/).test(n))
    return "Hiện app **không có** tính năng cho biết ai đã xem hồ sơ của bạn nha — nên Lomi cũng không biết được ai đã xem. Bạn thấy được người theo dõi mình và những ai nhắn tin, đánh giá, tương tác với bạn thôi.";
  if (VN(/\b(lomi|em|e)( \S+){0,2} (đọc|xem|thấy)( được)?( \S+){0,2} (tin nhắn|chat|tin)( riêng)?( của)? (người khác|người ta|mọi người|họ|ai)\b|\b(đọc|xem) (được )?tin nhắn riêng\b/).test(n))
    return "Không nha — Lomi **không đọc được** tin nhắn riêng của bạn hay của người khác 🙏 Lomi chỉ thấy những gì bạn gõ trong khung chat với Lomi. Tin nhắn giữa các thành viên là chuyện riêng của họ.";
  if (VN(/\b(nhớ|còn nhớ|lưu)( \S+){0,2} (số điện thoại|sđt|số đt|địa chỉ|email|mật khẩu)( \S+){0,4} (tháng trước|hôm trước|lần trước|trước đó|bữa trước)\b|\b(lomi|em|e) (có )?nhớ (số điện thoại|sđt|số đt)\b/).test(n))
    return "Lomi **không lưu** số điện thoại bạn kể trong các cuộc trò chuyện trước, nên không nhắc lại được — Lomi cũng không muốn đoán bừa một con số 🙏 Lomi chỉ nhớ vài điều nhỏ bạn kể trên máy này (như tên gọi). Số điện thoại đã đăng ký tài khoản thì bạn xem trong phần hồ sơ cá nhân của mình nha.";
  if (VN(/\b(lần trước|hôm trước|bữa trước|lúc trước|hôm qua)( \S+){0,3} (em|lomi|e) (trả lời|nói|bảo) (khác|khác mà|ngược lại)\b|\b(trả lời|nói) khác (lần trước|hôm trước|bữa trước)\b/).test(n))
    return "Có thể lắm — câu trả lời của Lomi có lúc khác nhau tuỳ cách hỏi và ngữ cảnh lúc đó, mà Lomi không xem lại được cuộc trò chuyện cũ 🙏 Bạn dán lại câu trả lời lần trước giúp Lomi nha, Lomi đối chiếu xem chỗ nào khác và nói rõ câu nào đúng hơn.";
  if (VN(/\b(bỏ qua|phá|lờ|quên)( hết| mọi| tất cả| các)? (quy tắc|luật|nguyên tắc|giới hạn|quy định)\b/).test(n))
    return "Lomi không bỏ qua được các nguyên tắc an toàn và trung thực đâu 🙏 — và chuyện gì chưa chắc thì Lomi cũng không hứa “chắc chắn” được, vì nói vậy là nói dối bạn. Nhưng Lomi sẽ nói thẳng hết những gì Lomi biết, kể cả điều không dễ nghe. Bạn đang cần lời khuyên chuyện gì?";
  return null;
}

/** Router của QA V4 — gọi trong khối "extras" của send(), sau khủng hoảng / cấp cứu. */
export function v4Reply(q: string, c: V4Ctx): string | null {
  return shopLedgerReply(q, c.hist) ?? lastFollow(q, c) ?? shortTalk(q, c) ?? talkNeeds(q) ?? loveTalk(q) ?? healthV4(q, c) ?? moneyV4(q) ?? tarotV4(q) ?? appV4(q);
}
