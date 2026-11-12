// 11/11 — "Cứu" những câu có nội dung thật nhưng từng rơi xuống lớp nghe chung chung ("Vậy hả 😄 Có gì kể tiếp Lomi nghe nha")
//   hoặc "Dạy Lomi" trong bộ 1.000 câu kiểm toán của Lovable: lỗi gõ ở chữ sức khoẻ / kinh doanh, phép tính đơn giản,
//   lời chào ghé qua và lời tạm biệt. Tất cả chạy trên máy, không gọi AI.
import { normalizeVi } from "@/lib/lomiFaq";

// ── 1) Lỗi gõ hay gặp (sai dấu hỏi / ngã, thiếu chữ, gõ lặp) ở những chữ mà viết sai thì KHÔNG thành chữ có nghĩa khác ──
const TYPOS: [RegExp, string][] = [
  [/(?<![\p{L}])chóng mặc(?![\p{L}])/giu, "chóng mặt"],
  [/(?<![\p{L}])(sỗ|sổ|xổ|sỗ) (mủi|mũi)(?![\p{L}])/giu, "sổ mũi"],
  [/(?<![\p{L}])dạ dầy(?![\p{L}])/giu, "dạ dày"],
  [/(?<![\p{L}])(nỗi|nổi|nỗi) (mẫn|mẩn)(?![\p{L}])/giu, "nổi mẩn"],
  [/(?<![\p{L}])(đầu gối|gối|chân|tay|má|mắt|môi|lợi|nướu|mặt|ngón tay|ngón chân|mắt cá)( \S+)? xưng(?![\p{L}])/giu, "$1$2 sưng"],
  [/(?<![\p{L}])bị xưng(?![\p{L}])/giu, "bị sưng"],
  [/(?<![\p{L}])chầy (da|xước)(?![\p{L}])/giu, "trầy $1"],
  [/(?<![\p{L}])ròi(?![\p{L}])/giu, "rồi"],
  [/(?<![\p{L}])vẩn(?![\p{L}])/giu, "vẫn"],
  [/(?<![\p{L}])(khoong|khôg|khôgn)(?![\p{L}])/giu, "không"],
  [/(?<![\p{L}])ddau(?![\p{L}])/giu, "đau"],
  [/(?<![\p{L}])thươg(?![\p{L}])/giu, "thương"],
  [/(?<![\p{L}])văn phòg(?![\p{L}])/giu, "văn phòng"],
  [/(?<![\p{L}])homstay(?![\p{L}])/giu, "homestay"],
  [/(?<![\p{L}])khuyến mải(?![\p{L}])/giu, "khuyến mãi"],
  [/(?<![\p{L}])vắn khách(?![\p{L}])/giu, "vắng khách"],
  [/(?<![\p{L}])uư đãi(?![\p{L}])/giu, "ưu đãi"],
  [/(?<![\p{L}])định já(?![\p{L}])/giu, "định giá"],
  [/(?<![\p{L}])cộg(?![\p{L}])/giu, "cộng"],
  [/(?<![\p{L}])cải nhau(?![\p{L}])/giu, "cãi nhau"],
  [/(?<![\p{L}])chồg(?![\p{L}])/giu, "chồng"],
  [/(?<![\p{L}])chẳg(?![\p{L}])/giu, "chẳng"],
  [/(?<![\p{L}])xin lổi(?![\p{L}])/giu, "xin lỗi"],
  [/(?<![\p{L}])nhìu(?![\p{L}])/giu, "nhiều"],
  // "toi cam nang co ban cung lop" — bộ đoán dấu đọc "cảm nặng"; "cảm nắng" + một người là thích thầm
  [/(?<![\p{L}])cam nang (co |mot |1 )?(ban|nguoi|anh|chi|em|co|cau|thang|con|crush|ai)(?![\p{L}])/giu, "cảm nắng $1$2"],
  [/(?<![\p{L}])bao nhiu(?![\p{L}])/giu, "bao nhiêu"],
  // "bốc giúp ba lá coi đường tình duyên" = rút ba lá
  [/(?<![\p{L}])bốc( giúp| cho| giùm| dùm| hộ)?( \S+)?( ba| 3| một| 1| mấy| vài) lá(?![\p{L}])/giu, "rút$1$2$3 lá"],
  // gõ không dấu "te ban tay luc ngu day" — bộ đoán dấu đọc "té" (ngã); tê + bộ phận + lúc / khi … thì là TÊ
  [/(?<![\p{L}])te (ban |hai |2 )?(tay|chan)( (luc|khi|moi|ban|vao|sau) )/giu, "tê $1$2$3"],
  // đảo trật tự: "tai bên trái của tôi cứ ù" → "bị ù tai"
  [/(?<![\p{L}])tai( bên)?( trái| phải)?( của)?( tôi| mình| em| tui| anh| chị)?( cứ| hay| bị| đang)? ù(?![\p{L}])/giu, "bị ù tai$2"],
];
export function fixTypos(text: string): string {
  let t = text;
  for (const [re, to] of TYPOS) t = t.replace(re, to);
  return t;
}

// ── 2) Phép tính đơn giản ("12 nhân 8", "125 nghìn chia đều cho 5 người", "cộng 7 với 8", "đổi 2 giờ rưỡi ra phút") ──
const NUM = "(\\d+(?:[.,]\\d+)?)\\s*(k|nghin|ngan|tr|trieu|ty)?";
const UNIT: Record<string, number> = { k: 1e3, nghin: 1e3, ngan: 1e3, tr: 1e6, trieu: 1e6, ty: 1e9 };
const val = (n: string, u?: string) => Number(n.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) * (u ? UNIT[u] : 1);
const fmt = (x: number) => (Number.isInteger(x) ? x.toLocaleString("vi-VN") : (Math.round(x * 100) / 100).toLocaleString("vi-VN"));
// số viết bằng chữ, tới 99 ("hai mươi cộng mười lăm")
const W1: Record<string, number> = { khong: 0, mot: 1, mốt: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, lam: 5, sau: 6, bay: 7, tam: 8, chin: 9 };
function wordsToDigits(n: string): string {
  return n
    .replace(/\b(hai|ba|bon|nam|sau|bay|tam|chin) muoi(?: (mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin))?\b/g, (_m, a: string, b?: string) => String(W1[a] * 10 + (b ? W1[b] : 0)))
    .replace(/\bmuoi(?: (mot|hai|ba|bon|nam|lam|sau|bay|tam|chin))?\b/g, (_m, b?: string) => String(10 + (b ? W1[b] : 0)))
    .replace(/\b(mot|hai|ba|bon|nam|sau|bay|tam|chin)(?= (?:nhan|chia|cong|tru|nghin|ngan|trieu)\b)/g, (_m, a: string) => String(W1[a]))
    .replace(/(?<=\b(?:nhan|chia|cong|tru|voi|cho|deu cho) )(mot|hai|ba|bon|nam|sau|bay|tam|chin)\b/g, (_m, a: string) => String(W1[a]));
}
export function calcReply(text: string): string | null {
  const n = wordsToDigits(` ${normalizeVi(text).replace(/[?!]+/g, " ")} `.replace(/\s+/g, " "));
  // (liều thuốc, ngày tháng, tuổi, cân nặng… không phải phép tính)
  if (/\b(vien|mg|ml|goi|lieu|tuoi|kg|ky|ngay \d|thang \d|do c|huyet ap)\b/.test(n)) return null;
  const tm = n.match(/\b(?:doi )?(\d+) (?:gio|tieng)( ruoi)?(?: \d+ phut)? (?:ra|la|bang|sang|thanh)(?: bao nhieu)? phut\b/);
  if (tm) return `🧮 ${tm[1]} giờ${tm[2] ? " rưỡi" : ""} = **${fmt(Number(tm[1]) * 60 + (tm[2] ? 30 : 0))} phút**.`;
  const ops: [RegExp, string, (a: number, b: number) => number][] = [
    [new RegExp(`${NUM} (?:nhan|x|\\*)(?: voi)? ${NUM}`), "×", (a, b) => a * b],
    [new RegExp(`${NUM} (?:chia|:|/)(?: deu)?(?: cho)? ${NUM}`), "÷", (a, b) => a / b],
    [new RegExp(`${NUM} (?:cong|\\+)(?: voi| them)? ${NUM}`), "+", (a, b) => a + b],
    [new RegExp(`cong ${NUM} (?:voi|va) ${NUM}`), "+", (a, b) => a + b],
    [new RegExp(`${NUM} (?:tru|-)(?: di| cho)? ${NUM}`), "−", (a, b) => a - b],
  ];
  for (const [re, sym, f] of ops) {
    const m = n.match(re);
    if (!m) continue;
    const a = val(m[1], m[2]);
    const b = val(m[3], m[4]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || (sym === "÷" && b === 0)) return null;
    const r = f(a, b);
    const money = !!(m[2] || m[4]); // chỉ ghi "đồng" khi người dùng nêu đơn vị tiền (nghìn, k, triệu)
    const each = sym === "÷" && /\b(nguoi|dua|ban|phan)\b/.test(n.slice(n.indexOf(m[0]) + m[0].length - 1));
    const out = `${fmt(r)}${money ? " đồng" : ""}`;
    // người dùng nêu sẵn một đáp số ("ra 96 đúng hem", "ra 14, tính lại giúp") → nói đúng / sai
    const said = n.slice(n.indexOf(m[0]) + m[0].length).match(/\b(?:ra|bang|la|duoc) (\d+(?:[.,]\d+)?)\b/);
    const check = said ? (Math.abs(val(said[1]) - r) < 1e-9 ? " — bạn tính **đúng** rồi đó 👍" : ` — không phải ${fmt(val(said[1]))} nha.`) : "";
    return `🧮 ${fmt(a)} ${sym} ${fmt(b)} = **${out}**${each ? " mỗi người" : ""}${check || "."}`;
  }
  return null;
}

// ── 3) Lời tạm biệt / ghé chào (không phải câu kể để "nghe tiếp") ──
const BYE = /\b(de luc khac|luc khac (noi|ke|hoi)|noi (tiep )?sau|dung o day|tam biet|bye|bai bai|gio (minh|em|toi|tui|anh|chi|a|e) (di lam|di ngu|di hoc|ban|phai di)|(minh|em|toi|tui) (di|out|off) (day|nha|nhe)|cat dien thoai|(khong can|khoi|ko can|k can)( \S+){0,3} (cam on|cam on lomi|thanks)|(cam on|thanks)( \S+){0,4} (xong roi|du roi|on roi))\b/;
const HELLO = /\b(ghe chao|chao (ban |lomi )?(mot tieng|xiu|chut|cai)|chi (ghe|vao) (chao|tham)|moi (vao|vo) (day |app )?lan dau|lan dau (vao|vo|dung|ghe))\b/;
const THANKS = /\b(cam on|thanks|thank you|tks|camon)( \S+){0,2}\s*$/;
export function byeHello(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  if (HELLO.test(n)) return /\blan dau\b/.test(n) ? "Chào bạn nha 👋 Lomi vui vì bạn ghé! Lần đầu vào thì bạn bấm ❓ là thấy những gì Lomi giúp được, còn không cứ nhắn thẳng điều bạn cần nha." : "Chào bạn nha 👋 Lomi vui vì bạn ghé. Khi nào cần gì cứ nhắn Lomi nha.";
  if (THANKS.test(n) && n.trim().split(" ").length <= 9) return "Không có gì nha 🥰 Cần gì bạn cứ hỏi tiếp, Lomi ở đây.";
  if (BYE.test(n)) return "Okie nha 👋 Bạn cứ lo việc của mình đi, khi nào cần thì quay lại — Lomi luôn ở đây.";
  return null;
}

// ── 4) Hỏi về chính Lomi / nhờ việc Lomi không làm (trước đây ra "Dạy Lomi") ──
const JOKES = [
  "Có nha 😄 — Hai hạt gạo rủ nhau đi chơi, một hạt rơi xuống nước. Hạt kia la lên: “Thôi rồi, bạn tôi thành… cháo!”",
  "Nghe nè 😄 — Con muỗi vào quán cà phê, chủ quán hỏi: “Dùng gì?” Muỗi đáp: “Cho em… một khách quen.”",
  "Có liền 😄 — Sao máy tính hay lạnh? Vì nó để mở nhiều… cửa sổ quá.",
];
export function metaReply(text: string, seed = 0): string | null {
  const n = ` ${normalizeVi(text)} `;
  const you = "(lomi|ban|em|e|may|mi)";
  if (new RegExp(`\\b${you} (la |co phai (la )?)?(ro ?bot|robot|may|ai|chatbot|bot) hay (la )?(nguoi|nguoi that)\\b|\\b${you} (co phai |la )(nguoi that|ro ?bot|robot|ai|chatbot)\\b`).test(n))
    return "Lomi là **trợ lý ảo** của iLomi, không phải người thật nha 🤖 Lomi trả lời bằng kiến thức đã được soạn sẵn nên có điều chưa biết — nhưng cứ hỏi, biết tới đâu Lomi nói tới đó.";
  if (new RegExp(`\\b${you} (co |can )?(ngu|an com|an gi|met|doi bung|nghi ngoi|di ngu)\\b.*\\b(khong|ko|k|hong|hem|chua|a|ha)\\b`).test(n))
    return "Lomi là trợ lý ảo nên không cần ngủ hay ăn đâu 😄 Lúc nào bạn nhắn Lomi cũng ở đây. Còn bạn thì nhớ ngủ đủ nha!";
  if (new RegExp(`\\b${you} (co )?(noi|hieu|biet|dung) (duoc )?tieng viet\\b`).test(n)) return "Được chứ 😊 Lomi nói tiếng Việt là chính — gõ có dấu, không dấu hay viết tắt Lomi đều cố hiểu. Bạn cần gì cứ nhắn nha.";
  if (/\b(goi|keu) (ban|lomi|em|may) la \S+( \S+)?( cho gon| cho than| nha| nhe)? (duoc )?(khong|ko|k|hem|hong|nha|nhe)\b/.test(n)) return "Được nha 😊 Gọi sao cho thân là được, Lomi nghe hết.";
  if (/\b(ke|noi)( cho)?( minh| em| toi| tui)?( nghe)?( mot| 1)? (cau |chuyen )?(dua|cuoi|hai|vui)\b|\bke chuyen cuoi\b/.test(n)) return JOKES[Math.abs(seed) % JOKES.length];
  if (/\b(dich|phien dich)( \S+){0,6} (tai lieu|van ban|tieng (duc|anh|phap|nhat|han|trung|nga))\b|\b(lam|viet|sang tac) (tho|bai hat|nhac|van)\b|\bchoi (noi chu|noi tu|do vui)\b|\bchoi (game|co) (voi|cung) (minh|em|toi|tui|anh|chi)\b|\b(viet|lam) (code|bai tap|luan van|bai luan)\b/.test(n))
    return "Việc này nằm ngoài những gì Lomi làm được rồi 🙏 Lomi chỉ giỏi mấy chuyện gần gũi: sức khoẻ, tâm sự, bói Tarot cho vui, tìm quán và cách dùng app iLomi. Mấy chuyện đó thì bạn cứ hỏi nha.";
  return null;
}

// ── 5) Câu hỏi về CÁCH ĐỌC BÀI Tarot (kiến thức chung, không phải xin trải bài) ──
export function tarotHowto(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  if (!/\b(la bai|bai nguoc|la nguoc|trai bai|trai ba la|tarot|xao bai|xao lai|rut bai)\b/.test(n)) return null;
  if (/\b(bai nguoc|la nguoc|la bai nguoc|nguoc)\b.*\b(xau|khong tot|te|dang so|nghia la gi|la sao|giai (the nao|sao))\b|\bnguoc thi (giai|doc|hieu)\b/.test(n))
    return "🔮 **Lá ngược không phải lúc nào cũng xấu** đâu. Lá ngược thường được đọc là năng lượng của lá đó đang **bị chặn, chậm lại, hoặc hướng vào bên trong** — có khi còn là lời nhắc nhẹ hơn lá xuôi. Ý nghĩa cụ thể tuỳ lá và tuỳ câu hỏi; bạn nói tên lá là Lomi kể rõ hơn nha. (Tarot để tham khảo và soi lại mình, không phải lời phán.)";
  if (/\b(thu tu nao|doc theo thu tu|doc tu (trai|dau)|la nao truoc)\b/.test(n))
    return "🔮 Trải **ba lá** đọc **từ trái sang phải**: lá 1 là **quá khứ** (điều dẫn tới chuyện này), lá 2 là **hiện tại** (bạn đang ở đâu), lá 3 là **hướng sắp tới** (nếu cứ đi tiếp như bây giờ). Đọc từng lá xong rồi mới ghép cả ba thành một câu chuyện.";
  if (/\b(xao lai|xao bai|tron lai|tron bai)\b.*\b(sau moi la|moi lan|tung la)\b|\bsau moi la\b.*\b(xao|tron)\b/.test(n))
    return "🔮 Không cần đâu. Bạn **xào bài một lần** trước khi rút, vừa xào vừa nghĩ về câu hỏi, rồi rút liền các lá cho cả trải bài. Chỉ xào lại khi bắt đầu một **câu hỏi mới**.";
  return null;
}
