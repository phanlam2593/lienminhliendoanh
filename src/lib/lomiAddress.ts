// ─────────────────────────────────────────────────────────────────────────────
// XƯNG HÔ ĐỐI XỨNG (01/10, theo ý Kir): người dùng tự xưng "anh / chị" → Lomi gọi "anh / chị", xưng "em";
// tự xưng "em" → Lomi gọi "em"; "mình / tui / tớ" (hoặc chưa rõ) → "bạn" như cũ.
// Thư viện câu trả lời viết sẵn với "bạn" và "Lomi"; speak() đổi lại cho đúng lúc hiển thị.
// ─────────────────────────────────────────────────────────────────────────────

export type Addr = "anh" | "chị" | "em" | "bạn";

const V = "(đang|bị|muốn|thấy|là|có|đi|hỏi|nói|không|k|ko|hk|hông|cần|mới|vừa|thích|buồn|mệt|đau|sắp|định|tính|chưa|đã|cũng|vẫn|hay|rất|thật|ở|làm|ăn|uống|ngủ|yêu|nhớ|ghét|sợ|lo|biết|hiểu|chán|vui|test|thử|xài|dùng|kể|tâm sự|tới|về|ra|vô|vào)";
// Tự xưng ở đầu câu hoặc sau dấu câu, kèm động từ ("a đang…", "anh bị…", "c muốn…", "e thấy…").
const SELF: [RegExp, Addr][] = [
  [new RegExp(`(^|[,.!?]\\s*|\\s)(anh|a)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "anh"],
  [new RegExp(`(^|[,.!?]\\s*|\\s)(chị|c)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "chị"],
  [new RegExp(`(^|[,.!?]\\s*|\\s)(em|e)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "em"],
  [new RegExp(`(^|[,.!?]\\s*|\\s)(mình|tui|tôi|tớ|t|mk)\\s+${V}(?=\\s|$|[,.!?])`, "iu"), "bạn"],
];
// Người dùng nói VỚI Lomi: "giúp anh", "cho chị hỏi", "nói em nghe".
const OBJ: [RegExp, Addr][] = [
  [/\b(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(anh|a)(?=\s|$|[,.!?])/iu, "anh"],
  [/\b(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(chị|c)(?=\s|$|[,.!?])/iu, "chị"],
  [/\b(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(em|e)(?=\s|$|[,.!?])/iu, "em"],
  [/\b(giúp|cho|với|hộ|giùm|kể|nói|chỉ|bảo)\s+(mình|tui|tớ|tôi)(?=\s|$|[,.!?])/iu, "bạn"],
];
// Nói về NGƯỜI KHÁC — không phải tự xưng ("anh ấy", "chị gái", "em bé"…).
const THIRD = /(^|\s)(anh|a|chị|c|em|e)\s+(ấy|ta|kia|đó|trai|gái|bé|họ|người yêu|ny|hàng xóm|đồng nghiệp|của|mình|tôi|tui)(?=\s|$|[,.!?])/giu;

/** Đoán cách người dùng tự xưng trong câu vừa gõ; null nếu câu không cho biết. */
export function detectAddr(raw: string): Addr | null {
  const t = ` ${raw.normalize("NFC").toLowerCase()} `;
  const cleaned = t.replace(THIRD, " ");
  for (const [re, a] of SELF) if (re.test(cleaned)) return a;
  for (const [re, a] of OBJ) if (re.test(cleaned)) return a;
  return null;
}

// "bạn" là danh từ (bạn bè, bạn thân, người bạn…) thì giữ nguyên.
const BAN_NOUN_AFTER = "(?:bè|thân|cũ|mới|trai|gái|ấy|cùng|học|đời|đồng|ruột|nhỏ|hàng|nhậu|chat|thật|khác|bên|của họ|của người|đó|kia|tốt|thân thiết|online|game)";
const BAN_NOUN_BEFORE = "(?:người|những|các|mấy|kết|một|vài|nhiều|cô|bác|hai|ba|bốn|nhóm|đám|hội)";
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Đổi "bạn" / "Lomi" trong câu Lomi nói cho khớp cách xưng hô của người dùng. */
export function speak(text: string, addr?: Addr | null): string {
  if (!addr || addr === "bạn") return text;
  const you = addr; // anh | chị | em
  let out = text.replace(
    new RegExp(`(?<!${BAN_NOUN_BEFORE})(^|[^\\p{L}])(bạn|Bạn)(?!\\s${BAN_NOUN_AFTER})(?=[^\\p{L}]|$)`, "giu"),
    (_m, pre: string, w: string) => `${pre}${w === "Bạn" ? cap(you) : you}`,
  );
  // Người dùng là anh/chị → Lomi xưng "em" (trừ tên riêng trong đường dẫn, tiêu đề).
  if (addr === "anh" || addr === "chị")
    out = out.replace(/(^|[^\p{L}/“"])Lomi(?![\p{L}])/gu, (_m, pre: string) => {
      const start = pre === "" || /[.!?\n]\s*$/.test(pre) || pre === "\n";
      return `${pre}${start ? "Em" : "em"}`;
    });
  // Sau khi đổi, đầu câu viết hoa lại (vd "…nha. em hiểu" → "Em hiểu").
  out = out.replace(/([.!?]\s+|\n\s*|^)(em|anh|chị)(?=\s)/gu, (_m, p: string, w: string) => `${p}${cap(w)}`);
  return out;
}
