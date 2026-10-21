// ─────────────────────────────────────────────────────────────────────────────
// ĐUÔI CÂU ĐÁP (21/10, theo ý Kir: "nói gì cũng bị hỏi lại 'rồi có sao không', cảm giác máy móc").
// Nhiều lớp (nhắc lại câu kể, khung câu, nghe kể…) tự gắn một câu hỏi CHUNG CHUNG ở cuối: "Rồi sao nữa?", "Rồi có sao không bạn?",
// "Chuyện sao vậy, kể Lomi nghe với." — đọc riêng từng câu thì ổn, nhưng cả cuộc trò chuyện thành ra lượt nào cũng bị hỏi dồn.
// softenTail() chạy MỘT lần ở cuối (AiAssistant.localReply) cho mọi câu đáp trên máy:
//   • đuôi hỏi chung chung → đổi thành một câu đáp đúng sắc thái (vui lây / thương / ghi nhận nhẹ), không hỏi;
//   • chỉ GIỮ câu hỏi ở lượt đầu của một chuyện không vui, khi lượt trước Lomi chưa hỏi gì — hỏi han lúc đó mới tự nhiên;
//   • câu hỏi CỤ THỂ đúng nội dung ("bác sĩ có nói mẹ bị gì không?") không đụng tới — chỉ xử lý các đuôi chung chung dưới đây.
// ─────────────────────────────────────────────────────────────────────────────

const ME = "(?:Lomi|em|Em|mình)";
const YOU = "(?:bạn|anh|chị|em|nè)";
// Các đuôi hỏi chung chung (đứng ở CUỐI câu đáp).
const TAILS: RegExp[] = [
  new RegExp(`\\s*Rồi sao,? kể ${ME} nghe với[.!]?$`, "u"),
  new RegExp(`\\s*Rồi sao nữa(?: ${YOU})?,? kể ${ME} nghe với[.!]?$`, "u"),
  new RegExp(`\\s*Rồi sao nữa(?: ${YOU})?\\?$`, "u"),
  new RegExp(`\\s*Rồi có sao không(?: ${YOU})?\\?$`, "u"),
  new RegExp(`\\s*Sao rồi nè\\?$`, "u"),
  new RegExp(`\\s*Chuyện sao vậy(?: ${YOU})?,? kể ${ME} nghe với[.!]?$`, "u"),
  new RegExp(`\\s*Có chuyện gì vậy(?: ${YOU})?,? kể ${ME} nghe với[.!]?$`, "u"),
  new RegExp(`\\s*À à\\.?$`, "u"),
];
const NEG = /(🥺|😔|😣|😩|😢|😭|💔|😞|😥|😟)/u;
const POS = /(🎉|🎊|🥳|🥰|😍|✨)/u;

// Lời đáp thay thế — viết theo "Lomi / bạn"; nếu câu gốc đang xưng "em" thì đổi theo.
const SOFT = {
  neg: ["Nghe mà thương ghê.", "Vậy thì mệt thật.", "Lomi ở đây nghe bạn nè.", "Từ từ thôi nha, Lomi vẫn nghe nè."],
  pos: ["Nghe vui lây luôn!", "Tuyệt ghê!", "Lomi mừng cho bạn nha!"],
  neu: ["Lomi nghe nè.", "Nghe được đó.", "Có gì kể tiếp Lomi nghe nha."],
  care: ["Mong là không có gì nha.", "Nhớ nghỉ ngơi cho khoẻ nha."],
};

const pick = (a: string[], avoid: string) => {
  const ok = a.filter((x) => !avoid.includes(x));
  const pool = ok.length ? ok : a;
  return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * Đổi đuôi hỏi chung chung ở cuối câu đáp thành lời đáp đúng sắc thái.
 * prev = câu Lomi nói ngay trước (để biết lượt trước đã hỏi chưa, và không lặp lại đúng câu đó);
 * firstOfStory = lượt này mở đầu một chuyện (lượt trước không phải đang nghe kể).
 */
export function softenTail(content: string, prev = "", firstOfStory = false): string {
  const text = content.trimEnd();
  const t = TAILS.find((re) => re.test(text));
  if (!t) return content;
  const m = text.match(t)!;
  const head = text.slice(0, m.index).trimEnd();
  if (!head) return content; // cả câu chỉ có đuôi đó thì không có gì để thay
  const neg = NEG.test(head) || NEG.test(m[0]);
  const prevAsked = /\?\s*\S{0,3}\s*$/u.test(prev.trim());
  // Lượt đầu của một chuyện KHÔNG VUI và lượt trước chưa hỏi gì → hỏi han một câu là tự nhiên, giữ lại (trừ "À à" — không phải câu hỏi).
  //   ("Rồi có sao không", "Rồi sao nữa" thì không giữ — Kir thấy đó là kiểu hỏi máy móc nhất.)
  if (neg && firstOfStory && !prevAsked && /Chuyện sao vậy|Có chuyện gì vậy/u.test(m[0])) return content;
  const pos = !neg && POS.test(head);
  const usesEm = /(?:^|\s)(?:kể em|em nghe|em ở đây)/u.test(m[0]) || /(?:^|[^\p{L}])em(?![\p{L}])/u.test(m[0]);
  // Chuyện khám chữa thường ngày ("đi khám răng", "uống thuốc rồi") → hỏi han nhẹ, không "thương ghê" quá mức.
  const care = /(khám|thuốc|tiêm|chích|viện|răng|xét nghiệm)/u.test(head);
  let soft = pick(neg && care ? SOFT.care : neg ? SOFT.neg : pos ? SOFT.pos : SOFT.neu, prev);
  if (usesEm) soft = soft.replace(/Lomi/g, "em").replace(/^em/, "Em");
  // Câu gốc chỉ là "X hả 😄" + đuôi hỏi → "X hả 😄 Lomi nghe nè." (giữ emoji, thêm lời đáp không hỏi).
  return `${head} ${soft}`;
}
