// ─────────────────────────────────────────────────────────────────────────────
// XƯNG HÔ ĐỐI XỨNG (01/10, theo ý Kir): người dùng tự xưng "anh / chị" → Lomi gọi "anh / chị", xưng "em";
// tự xưng "em" → Lomi gọi "em"; "mình / tui / tớ" (hoặc chưa rõ) → "bạn" như cũ.
// Thư viện câu trả lời viết sẵn với "bạn" và "Lomi"; speak() đổi lại cho đúng lúc hiển thị.
// ─────────────────────────────────────────────────────────────────────────────

// 01/10 r2 (theo tài liệu xưng hô của Kir): tách NGƯỜI ĐƯỢC GỌI (Lomi) với NGƯỜI XƯNG (người dùng),
// bỏ qua ngôi thứ ba ("anh Minh", "chị tui", "anh ấy"), không đoán tuổi/giới tính từ 1 đại từ,
// giữ nhất quán, và người dùng NÓI RÕ ("gọi tui là anh nha", "gọi mình là bạn thôi") thì khoá luôn.
//  • "bạn-em": người dùng gọi Lomi là "em" nhưng chưa tự xưng → Lomi xưng "em", vẫn gọi "bạn"
//    (không đoán người dùng là anh hay chị) — vd "lomi e đang làm j đó".
export type Addr = "anh" | "chị" | "em" | "bạn" | "bạn-em";

const V = "(đang|bị|muốn|thấy|là|có|đi|hỏi|nói|không|k|ko|hk|hông|cần|mới|vừa|thích|buồn|mệt|đau|sắp|định|tính|chưa|đã|cũng|vẫn|hay|rất|thật|ở|làm|ăn|uống|ngủ|yêu|nhớ|ghét|sợ|lo|biết|hiểu|chán|vui|test|thử|xài|dùng|kể|tâm sự|tới|về|ra|vô|vào)";
// Tự xưng ở đầu câu hoặc sau dấu câu, kèm động từ ("a đang…", "anh bị…", "c muốn…", "e thấy…").
const SELF: [RegExp, Addr][] = [
  [new RegExp(`(^|[,.!?]\\s*|\\s)(anh|a)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "anh"],
  [new RegExp(`(^|[,.!?]\\s*|\\s)(chị|c)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "chị"],
  [new RegExp(`(^|[,.!?]\\s*|\\s)(em|e)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "em"],
  [new RegExp(`(^|[,.!?]\\s*|\\s)(mình|tui|tôi|tớ|t|mk)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "bạn"],
];
// Người dùng nói VỚI Lomi về chính họ: "giúp anh", "cho chị hỏi", "nói em nghe".
const OBJ: [RegExp, Addr][] = [
  [/(^|\s)(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(anh|a)(?=\s|$|[,.!?])/iu, "anh"],
  [/(^|\s)(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(chị|c)(?=\s|$|[,.!?])/iu, "chị"],
  [/(^|\s)(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(em|e)(?=\s|$|[,.!?])/iu, "em"],
  [/(^|\s)(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(mình|tui|tớ|tôi)(?=\s|$|[,.!?])/iu, "bạn"],
];
// Nói về NGƯỜI KHÁC — không phải tự xưng ("anh ấy", "chị gái", "em bé", "chị tui"…).
const THIRD = /(^|\s)(anh|a|chị|c|em|e|ông|bà|cô|chú)\s+(ấy|ta|kia|đó|trai|gái|bé|họ|người yêu|ny|hàng xóm|đồng nghiệp|của|mình|tôi|tui|tao|tớ|kế|họ|hai|ba|cả|út|rể|dâu|chồng|vợ)(?=\s|$|[,.!?])/giu;
// Ngôi thứ ba có TÊN RIÊNG ("anh Minh nói…", "chị Hoa mới nhắn") — nhận qua chữ viết hoa ở câu gốc.
const THIRD_NAME = /(^|\s)(anh|a|chị|c|em|e|ông|bà|cô|chú|bác)\s+(\p{Lu}\p{Ll}*)/gu;
// Người dùng GỌI Lomi: "lomi e đang…", "lomi em ơi", "em ơi", "e ơi cho hỏi" → Lomi là "em".
const CALL_LOMI_EM = /(^|\s)(lomi\s+(em|e)|(em|e)\s+lomi|(em|e)\s+ơi+)(?=\s|$|[,.!?])/iu;
// Người dùng gọi Lomi là anh/chị ("anh ơi", "chị ơi", "lomi anh") — Lomi vẫn xưng "Lomi" (giữ persona).
const CALL_LOMI_AC = /(^|\s)(lomi\s+(anh|a|chị|c)|(anh|a|chị|c)\s+ơi+)(?=\s|$|[,.!?])/iu;

/** Người dùng NÓI RÕ muốn xưng hô thế nào — ưu tiên tuyệt đối, khoá lại. */
export function explicitAddr(raw: string): Addr | null {
  // Gom các cách viết "anh - em", "anh/em", "anh-em", "xưng hô anh em" về một dạng (01/10 lỗi Kir gặp:
  // "Xưng hô anh - em nha. Lomi là e, ban quản trị là anh" bị hiểu thành câu hỏi "liên hệ ban quản trị").
  const t = raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/(anh|chị|em)\s*[-–—/&]\s*(anh|chị|em)/gu, "$1 $2")
    .replace(/xưng\s+hô/gu, "xưng");
  // Người dùng TỰ nói mình là ai: "tui là anh nha", "ban quản trị là anh", "admin là chị".
  const WHO = "(?:tui|tôi|mình|tớ|tao|t|admin|ad|ban quản trị|bqt|người dùng)";
  const END = "(?=\\s*(?:$|[,.!?]|nha|nhé|nhe|nghen|đó|nè|á|nhaa))";
  // (?![\\p{L}]): "ý mình là cái lúc nãy" KHÔNG phải "mình là c(hị)" — chữ c phải đứng riêng một từ (08/10).
  const selfIs = t.match(new RegExp(`(?:^|[\\s,.!?])${WHO}\\s+là\\s+(anh|a|chị|c)(?![\\p{L}])${END}`, "u"));
  const userAC: Addr | null = selfIs ? (selfIs[1].startsWith("a") ? "anh" : "chị") : null;
  // Người dùng nói Lomi là "em": "lomi là e", "lomi xưng em", "em là lomi".
  const lomiEm = new RegExp(`(lomi\\s+(là|xưng)\\s+(em|e)|(em|e)\\s+là\\s+lomi)${END}`, "u").test(t);
  if (/(đừng|thôi|bỏ|khỏi|không cần)\s+(xưng|gọi)\s+(anh em|anh|chị|em|chị em)/u.test(t) || /(gọi|kêu)\s+(tui|tôi|mình|tớ|t)\s+(là|bằng)\s+bạn/u.test(t) || /xưng\s+(bạn|mình)\s+(bạn|với)/u.test(t))
    return "bạn";
  const m = t.match(/(gọi|kêu)\s+(tui|tôi|mình|tớ|t|tao)\s+(là|bằng)\s+(anh|chị|em)(?=\s|$|[,.!?])/u);
  if (m) return m[4] as Addr;
  if (userAC) return userAC;
  const x = t.match(/xưng\s+(anh|chị)\s+em/u);
  if (x) return x[1] as Addr; // "xưng anh em với tui nha" → người dùng là anh, Lomi là em
  if (/xưng\s+em\s+(anh|chị)/u.test(t)) return "em";
  if (lomiEm) return "bạn-em"; // chỉ biết Lomi là em, chưa biết người dùng là anh hay chị
  return null;
}

/** Đoán cách người dùng tự xưng trong câu vừa gõ; null nếu câu không cho biết. */
export function detectAddr(raw: string): Addr | null {
  const ex = explicitAddr(raw);
  if (ex) return ex;
  const nfc = ` ${raw.normalize("NFC")} `;
  // Bỏ ngôi thứ ba có tên riêng trước khi hạ chữ thường.
  const noNames = nfc.replace(THIRD_NAME, (m0, pre: string, _p: string, name: string) => (name.length > 1 ? pre : m0));
  const t = noNames.toLowerCase();
  const callsEm = CALL_LOMI_EM.test(t);
  const callsAC = CALL_LOMI_AC.test(t);
  // Bỏ phần GỌI Lomi và ngôi thứ ba — phần còn lại mới là chỗ người dùng tự xưng.
  const cleaned = t.replace(CALL_LOMI_EM, " ").replace(CALL_LOMI_AC, " ").replace(THIRD, " ");
  let self: Addr | null = null;
  for (const [re, a] of SELF) if (re.test(cleaned)) { self = a; break; }
  if (!self) for (const [re, a] of OBJ) if (re.test(cleaned)) { self = a; break; }
  if (callsEm) {
    // Gọi Lomi là "em": người dùng là anh/chị. Tự xưng rõ thì theo đó, không thì không đoán → "bạn-em".
    return self === "anh" || self === "chị" ? self : "bạn-em";
  }
  if (callsAC) {
    // Gọi Lomi là anh/chị: người dùng nhiều khả năng là "em" — chỉ nhận khi họ tự xưng em.
    return self === "em" ? "em" : self === "bạn" ? "bạn" : null;
  }
  return self;
}

// "bạn" là danh từ (bạn bè, bạn thân, người bạn…) thì giữ nguyên.
const BAN_NOUN_AFTER = "(?:bè|thân|cũ|mới|trai|gái|ấy|cùng|học|đời|đồng|ruột|nhỏ|hàng|nhậu|chat|thật|khác|bên|của họ|của người|đó|kia|tốt|thân thiết|online|game)";
const BAN_NOUN_BEFORE = "(?:người|những|các|mấy|kết|một|vài|nhiều|cô|bác|hai|ba|bốn|nhóm|đám|hội|đứa|thằng|tình|[Tt]ình)";
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** "Lomi" (Lomi tự gọi mình) → "em". */
function lomiAsEm(text: string): string {
  return text.replace(/(^|[^\p{L}/“"])Lomi(?![\p{L}])/gu, (_m, pre: string) => {
    const start = pre === "" || /[.!?\n]\s*$/.test(pre) || pre === "\n";
    return `${pre}${start ? "Em" : "em"}`;
  });
}

/** Đổi "bạn" / "Lomi" trong câu Lomi nói cho khớp cách xưng hô của người dùng. */
export function speak(text: string, addr?: Addr | null): string {
  if (!addr || addr === "bạn") return text;
  // 11/10: chữ trong ngoặc kép “…” là lời TRÍCH (câu người dùng gõ) hoặc tin nhắn MẪU để gửi cho người khác
  // (“Dạo này thấy bạn im hơn, có chuyện gì không?”) — "bạn" trong đó không phải lời Lomi gọi người dùng → giữ nguyên.
  if (text.includes("“")) {
    const parts = text.split(/(“[^”]*”)/u);
    if (parts.length > 1)
      return parts.map((seg, i) => (i % 2 ? seg : speakPlain(seg, addr))).join("");
  }
  return speakPlain(text, addr);
}
function speakPlain(text: string, addr: Addr): string {
  if (!text.trim()) return text;
  // (đầu câu / sau emoji thì "em" viết hoa)
  if (addr === "bạn-em") return lomiAsEm(text).replace(/([.!?]\s+|\p{Extended_Pictographic}\uFE0F?\s+|\n\s*|^)em(?=\s)/gu, (_m, p: string) => `${p}Em`);
  const you = addr; // anh | chị | em
  // "làm bạn trước", "kết bạn với…" — "bạn" ở đây là BẠN BÈ, không phải lời gọi → giữ nguyên (đánh dấu tạm rồi trả lại).
  const KEEP_BAN = "\uE000";
  let out = text.replace(/((?:^|[^\p{L}])(?:làm|là|thành) )bạn(?=( (?:trước|với|thôi|đã|nha|nhé|bè|tốt|thân))|[,.!?…]|$)/giu, `$1b${KEEP_BAN}n`).replace(
    // (?![\\p{L}]) sau danh sách: "bạn đó" được giữ, còn "bạn đói", "bạn đời sống…" thì không bị giữ nhầm (09/10).
    new RegExp(`(?<!${BAN_NOUN_BEFORE})(^|[^\\p{L}])(bạn|Bạn)(?!\\s${BAN_NOUN_AFTER}(?![\\p{L}]))(?=[^\\p{L}]|$)`, "giu"),
    (_m, pre: string, w: string) => `${pre}${w === "Bạn" ? cap(you) : you}`,
  );
  out = out.split(`b${KEEP_BAN}n`).join("bạn");
  // Người dùng là anh/chị → Lomi xưng "em" (trừ tên riêng trong đường dẫn, tiêu đề).
  if (addr === "anh" || addr === "chị") out = lomiAsEm(out);
  // Sau khi đổi, đầu câu viết hoa lại (vd "…nha. em hiểu" → "Em hiểu").
  // (09/10: sau emoji cũng là đầu câu — "… ngại quá 😳 em là robot" → "… 😳 Em là robot")
  out = out.replace(/([.!?]\s+|\p{Extended_Pictographic}\uFE0F?\s+|\n\s*|^)(em|anh|chị)(?=\s)/gu, (_m, p: string, w: string) => `${p}${cap(w)}`);
  return out;
}
