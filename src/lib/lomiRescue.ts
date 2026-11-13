// 11/11 — "Cứu" những câu có nội dung thật nhưng từng rơi xuống lớp nghe chung chung ("Vậy hả 😄 Có gì kể tiếp Lomi nghe nha")
//   hoặc "Dạy Lomi" trong bộ 1.000 câu kiểm toán của Lovable: lỗi gõ ở chữ sức khoẻ / kinh doanh, phép tính đơn giản,
//   lời chào ghé qua và lời tạm biệt. Tất cả chạy trên máy, không gọi AI.
import { TAROT_DECK_SIZE, tarotCard } from "@/lib/tarot";
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
export function calcReply(text: string, prev?: string): string | null {
  const n = wordsToDigits(numWords(` ${normalizeVi(text).replace(/[?!]+/g, " ")} `.replace(/\s+/g, " ")));
  // (liều thuốc, ngày tháng, tuổi, cân nặng… không phải phép tính)
  if (/\b(vien|mg|ml|goi|lieu|tuoi|kg|ky|ngay \d|thang \d|do c|huyet ap)\b/.test(n)) return null;
  const tm = n.match(/\b(?:doi )?(\d+) (?:gio|tieng)( ruoi)?(?: \d+ phut)? (?:ra|la|bang|sang|thanh)(?: bao nhieu)? phu[tc]\b/);
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
  return wordProblem(n, prev);
}

// 12/11 — bài toán đố ngắn ("3 phần, mỗi phần 25 nghìn", "chạy ba vòng, mỗi vòng hai cây số", "bill 85 nghìn đưa 100 nghìn thối bao nhiêu",
//   "chia đều hoá đơn sáu trăm nghìn cho bốn người") và câu nối phép tính trước ("rồi nhân đôi số đó lên", "thêm 10 nghìn phí nữa thì tổng bao nhiêu").
const DIG: Record<string, number> = { khong: 0, mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9 };
const DW = "(khong|mot|hai|ba|bon|nam|sau|bay|tam|chin)";
const TAIL = "(?: (mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin))?";
const UNITW = "(?:k|nghin|ngan|trieu|tr|ty)";
// từ đếm đứng sau số ("ba vòng", "hai bàn", "một cây bút") — chỉ đổi chữ số khi có từ đếm, để "ba" (bố), "năm" (năm tháng) không bị đổi bừa
const COUNTER = "(?:vong|ban|phan|quyen|cay|cai|nguoi|doi|ly|coc|chai|hop|km|lan|mon|to|dia|chiec|ve|buoi|tang|qua|trai|con|bo|suat|tieng|gio|phut|dong|nghin|ngan|trieu|tr|k|tram)";
const D1 = (w?: string) => (w ? (w === "tu" ? 4 : w === "lam" ? 5 : DIG[w]) : 0);
function numWords(n: string): string {
  return n
    .replace(new RegExp(`\\b${DW} tram ruoi\\b`, "g"), (_m, a: string) => String(DIG[a] * 100 + 50))
    .replace(new RegExp(`\\b${DW} tram(?: (?:le|linh) ${DW}| ${DW} muoi${TAIL}| muoi${TAIL})?\\b`, "g"), (_m, a: string, l?: string, t?: string, u?: string, u2?: string) =>
      String(DIG[a] * 100 + (l ? DIG[l] : t ? DIG[t] * 10 + D1(u) : u2 !== undefined || /muoi/.test(_m) ? 10 + D1(u2) : 0)))
    .replace(new RegExp(`\\b${DW} muoi${TAIL}\\b`, "g"), (_m, a: string, b?: string) => String(DIG[a] * 10 + D1(b)))
    .replace(new RegExp(`\\bmuoi${TAIL}\\b`, "g"), (_m, b?: string) => String(10 + D1(b)))
    .replace(new RegExp(`\\b${DW}(?= ${COUNTER}\\b)`, "g"), (_m, a: string) => String(DIG[a]))
    .replace(/\b(\d+) (nghin|ngan|trieu|tr|k) ruoi\b/g, (_m, a: string, u: string) => `${Number(a) + 0.5} ${u}`);
}
type Amt = { v: number; money: boolean; at: number; end: number };
const AMT = new RegExp(`(\\d+(?:[.,]\\d+)*)(?: ?(${UNITW}))?(?: (dong|d|vnd))?\\b`, "g");
function amounts(n: string): Amt[] {
  const out: Amt[] = [];
  for (const m of n.matchAll(AMT)) {
    const v = Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) * (m[2] ? UNIT[m[2]] : 1);
    if (Number.isFinite(v)) out.push({ v, money: !!(m[2] || m[3]), at: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}
const money = (x: number, isM: boolean) => `${fmt(x)}${isM ? " đồng" : ""}`;
function wordProblem(n: string, prev?: string): string | null {
  const cue = /\b(tinh|tong|bao nhieu|may (ban|km|cay|nguoi|lan)|duoc bao|thoi|chia deu|moi nguoi|nhan doi|nhan ba|gap doi|het bao|con lai)\b/.test(n);
  if (!cue) return null;
  // (a) nối phép tính ngay trước: "rồi nhân đôi số đó", "thêm 10 nghìn phí nữa thì tổng bao nhiêu"
  const pm = prev?.match(/=\s*\*\*([\d.,]+)( đồng)?/);
  if (pm && /\b(so do|ket qua|cai do|do len|nua|roi|tiep|tong)\b/.test(n)) {
    const p = Number(pm[1].replace(/\./g, "").replace(",", "."));
    const isM = !!pm[2];
    const am = amounts(n);
    const k = /\bnhan doi|gap doi\b/.test(n) ? 2 : /\bnhan ba|gap ba\b/.test(n) ? 3 : null;
    if (k) return `🧮 ${money(p, isM)} × ${k} = **${money(p * k, isM)}**.`;
    if (am.length === 1) {
      const a = am[0].v;
      if (/\b(them|cong|phi|cong them)\b/.test(n)) return `🧮 ${money(p, isM)} + ${money(a, isM || am[0].money)} = **${money(p + a, isM || am[0].money)}**.`;
      if (/\b(tru|bot|giam)\b/.test(n)) return `🧮 ${money(p, isM)} − ${money(a, isM || am[0].money)} = **${money(p - a, isM || am[0].money)}**.`;
      if (/\bchia\b/.test(n) && a) return `🧮 ${money(p, isM)} ÷ ${fmt(a)} = **${money(p / a, isM)}**.`;
      if (/\bnhan\b/.test(n)) return `🧮 ${money(p, isM)} × ${fmt(a)} = **${money(p * a, isM)}**.`;
    }
  }
  // (b) chia đều hoá đơn: "chia đều hoá đơn 600 nghìn cho 4 người"
  const cd = n.match(new RegExp(`\\bchia deu(?: \\S+){0,4}? (\\d+(?:[.,]\\d+)?) ?(${UNITW})? cho (\\d+)\\b`));
  if (cd) {
    const a = Number(cd[1].replace(",", ".")) * (cd[2] ? UNIT[cd[2]] : 1);
    const b = Number(cd[3]);
    if (b) return `🧮 ${money(a, !!cd[2])} ÷ ${b} = **${money(a / b, !!cd[2])}** mỗi người.`;
  }
  // (c) "N <đồ>, mỗi <đồ> M" / "N <đồ> giá M mỗi <đồ>" → N × M, cộng thêm "mua thêm … K", trừ ra tiền thối
  const p1 = n.match(new RegExp(`\\b(\\d+) ([a-z]+)\\b(?: \\S+){0,4}? moi \\2(?: \\S+){0,2}? (\\d+(?:[.,]\\d+)?)(?: ?(${UNITW}))?(?: (cay so|km|ban|vong|nguoi|lan))?`));
  const p2 = p1 ? null : n.match(new RegExp(`\\b(\\d+) ([a-z]+)\\b(?: \\S+){0,3}? (?:gia )?(\\d+(?:[.,]\\d+)?) ?(${UNITW})? moi \\2\\b`));
  const pr = p1 ?? p2;
  const lines: string[] = [];
  let total: number | null = null;
  let isM = false;
  let used = 0;
  if (pr) {
    const a = Number(pr[1]);
    const b = Number(pr[3].replace(",", ".")) * (pr[4] ? UNIT[pr[4]] : 1);
    isM = !!pr[4];
    total = a * b;
    used = (pr.index ?? 0) + pr[0].length;
    const unit = !isM && p1 && p1[5] ? ` ${p1[5].replace("cay so", "cây số").replace("ban", "bàn").replace("vong", "vòng").replace("nguoi", "người").replace("lan", "lần")}` : "";
    lines.push(`${a} × ${money(b, isM)} = **${money(total, isM)}${unit}**`);
  }
  const rest = amounts(n.slice(used)).map((x) => ({ ...x, at: x.at + used }));
  // mua thêm / cộng thêm
  const them = n.slice(used).match(/\b(them|cong them|phi)\b/);
  if (total !== null && them) {
    const after = rest.filter((x) => x.at >= used + (them.index ?? 0));
    const add = after.find((x) => x.money === isM && !/\b(dua|tra|to)\s*$/.test(n.slice(Math.max(0, x.at - 12), x.at)));
    if (add && !/\b(dua|tra bang|tra)\b/.test(n.slice(used + (them.index ?? 0), add.at))) {
      lines.push(`${money(total, isM)} + ${money(add.v, isM)} = **${money(total + add.v, isM)}**`);
      total += add.v;
    }
  }
  // tiền thối: "đưa / trả (bằng tờ) X … thối bao nhiêu"
  if (/\bthoi\b/.test(n)) {
    const pay = n.match(new RegExp(`\\b(?:dua|tra)(?: bang)?(?: to)?(?: \\S+){0,1}? (\\d+(?:[.,]\\d+)?) ?(${UNITW})?`));
    if (pay) {
      const pv = Number(pay[1].replace(",", ".")) * (pay[2] ? UNIT[pay[2]] : 1);
      if (total === null) {
        const cost = amounts(n).find((x) => x.at < (pay.index ?? 0) && x.money);
        if (cost) { total = cost.v; isM = true; }
      }
      if (total !== null && pv >= total) {
        lines.push(`${money(pv, true)} − ${money(total, true)} = **${money(pv - total, true)}** tiền thối`);
        return `🧮 ${lines.join("\n🧮 ")}.`;
      }
    }
  }
  if (lines.length) return `🧮 ${lines.join("\n🧮 ")}.`;
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

// ── 6) 12/11 — câu nói CHUYỆN VỚI LOMI có ý rất rõ, trả lời sớm trước các lớp đoán chủ đề (bộ 1.000 câu, nhóm trò chuyện):
//   hỏi Lomi là người hay máy / có ngủ, biết bơi, có mệt, có tên khác…; cảm ơn / chào dài; câu hỏi hẳn ra ngoài phạm vi (luật xe, cài máy tính,
//   chuyến bay, chính tả). Trước đây: "không phải bác sĩ" (lớp sức khoẻ), "Đang có chuyện gì làm bạn bận lòng" (lớp tâm sự), "Dạy Lomi".
const ID_WHO = "(lomi|ban|em|cau|may|mi)";
export function chatAboutLomi(text: string): string | null {
  const n = ` ${normalizeVi(text).replace(/\b(ng)\b/g, "nguoi").replace(/\b(z|v)\b/g, "vay").replace(/\bb\b/g, "ban")} `;
  const w = n.trim().split(" ").length;
  if (w > 40) return null;
  // (câu kể chuyện của người dùng có chữ "người thật" — "ảnh là người thật hay ảo vậy" nói về người khác — không phải hỏi Lomi)
  const toLomi = /\b(lomi|ban|em|cau)\b/.test(n);
  const KIND = "(nguoi that|nguoi|tro ly ao|tro ly ai|tro ly|ai|bot|chatbot|robot|ro bot|may|may moc|thay boi that|thay boi|thanh vien that)";
  if (toLomi && (new RegExp(`\\b${KIND}(?: \\S+){0,3} hay (chi )?(la )?(mot )?${KIND}\\b`).test(n) || /\b(chi la may|co nguoi that|nguoi that dang|la nguoi hay|nguoi hay may|that hay ao)\b/.test(n)) && /\b(nguoi|may|ai|bot|robot|thay boi)\b/.test(n)) {
    if (/\bthay boi\b/.test(n))
      return "Lomi không phải thầy bói thật đâu nha 😄 Lomi là **trợ lý ảo** của iLomi — phần Tarot là để bạn chiêm nghiệm cho vui, nhìn chuyện của mình từ góc khác, chứ không đoán trước tương lai được. Muốn rút một lá thử không?";
    return "Lomi là **trợ lý ảo** của iLomi, không phải người thật nha 🤖 Lomi chạy ngay trên máy bạn, trả lời bằng kiến thức đã soạn sẵn — nên có chuyện chưa biết, nhưng lúc nào bạn nhắn Lomi cũng ở đây. Bạn cần gì nè?";
  }
  if (/\b(lomi|ban|em|cau) (co )?(the )?(tu|chu dong) (ib|inbox|nhan tin|nhan|goi|nhac)\b/.test(n) && !/\b(minh|toi|tui|em|anh|chi) (tu|chu dong) (ib|inbox|nhan tin|nhan|goi|nhac)\b/.test(n.replace(/\b(lomi|ban|cau) (co )?(the )?(tu|chu dong)/, "")) && /\b(khong|ko|k|hong|duoc|dc|chu|ha)\b/.test(n))
    return "Lomi chưa tự nhắn trước được nha 😅 Lomi chỉ trả lời khi bạn nhắn vào đây. Muốn nhận tin mỗi ngày thì bạn bật **Thông báo** trong Hồ sơ → Cài đặt để không lỡ tin nhắn, ưu đãi mới.";
  if (toLomi && /\b(khong|ko|k|hong|dau|ha|chu|nhi)\b/.test(n)) {
    if (/\b(ngu|an|met|doi|nghi ngoi)\b(?: \S+){0,3} (nhu nguoi|ca ngay|bao gio|khi noi chuyen|vi noi chuyen)\b|\b(co|biet) (met|ngu)\b(?: \S+){0,4} (noi chuyen|ca ngay|nhu nguoi)\b|\b(dau|khong) co (ngu|an|met)\b/.test(n))
      return "Lomi là trợ lý ảo nên không cần ngủ, cũng không biết mệt đâu 😄 Nói chuyện cả ngày vẫn vui. Còn bạn thì nhớ nghỉ ngơi nha!";
    // ("bạn có thể BÓI bài xem…" — bỏ dấu "bói" và "bơi" trùng nhau: có chữ bài / tarot / xem thì là xin bói, không phải hỏi biết bơi)
    if (/\b(biet|co the) (boi|bay|nau an|hat|nhay|lai xe|choi game)\b/.test(n) && !/\b(bai|tarot|xem|la bai|rut)\b/.test(n) && !/bói/iu.test(text))
      return "Lomi không có thân thể nên không bơi, không nấu ăn được đâu 😄 Lomi chỉ trò chuyện thôi — nhưng giỏi mấy việc này: thông tin sức khoẻ thường gặp, nghe tâm sự, tìm quán, cách dùng app và bói Tarot cho vui.";
    if (/\b(ten khac|biet danh|ten gi khac|con ten)\b/.test(n))
      return "Lomi chỉ có một tên là **Lomi** thôi nè 😊 Bạn muốn gọi thân hơn kiểu gì cũng được, Lomi nghe hết.";
    if (/\bhieu (giong|tieng) (mien )?(trung|bac|nam|hue|que|dia phuong)\b|\b(giong|tieng) (mien )?(trung|hue|nghe an|quang)\b(?: \S+){0,3} (hieu|duoc)\b/.test(n))
      return "Lomi cố hết sức nha 😄 Lomi đọc chữ chứ không nghe giọng, nên bạn cứ gõ như mình hay nói — từ địa phương nào Lomi chưa hiểu thì Lomi hỏi lại, bạn giải thích giúp là lần sau Lomi quen.";
    if (/\b(hieu|biet) (tieng long|teencode|tu long)\b|\btieng long\b(?: \S+){0,4} (hieu|chu)\b/.test(n))
      return "Biết sơ sơ thôi nha 😄 Mấy kiểu như “máu đi du lịch” (rất háo hức), “toang”, “chill” Lomi hiểu được. Gặp chữ lạ quá thì Lomi hỏi lại bạn.";
  }
  return null;
}
export function thanksGreet(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  const w = n.trim().split(" ").length;
  if (w > 45 || /\b(ma (sao|gio)|cho (minh|em|toi) hoi|muon hoi|giup (minh|em|toi) (voi|xem|tim)|sao lai|tai sao)\b/.test(n)) return null;
  const toL = /\b(lomi|ban|cau)\b/.test(n);
  const thanks = /\b(cam on|cam o|thanks|thank you|tks|camon)\b/.test(n);
  if (thanks && toL) {
    if (/\b(nghe|lang nghe)\b(?: \S+){0,3}( ke| tam su| noi)?\b/.test(n) && /\b(nghe)\b/.test(n))
      return "Không có gì nè 💚 Bạn kể được ra là tốt rồi. Lúc nào muốn nói chuyện thì cứ nhắn, Lomi luôn ở đây nghe bạn.";
    if (/\b(lam duoc roi|xong roi|duoc roi|on roi|ok roi)\b/.test(n))
      return "Ui tuyệt quá 🎉 Bạn làm được rồi là Lomi vui lắm! Cần gì thêm cứ hỏi Lomi nha.";
    if (/\b(da giup|giup (minh|em|toi|tui)|nay gio|chi (minh|em|toi|tui)|tu van)\b/.test(n))
      return "Không có gì nha 🥰 Bạn đâu có làm phiền Lomi đâu. Cần gì cứ hỏi tiếp, Lomi ở đây.";
    if (/\b(tat may|phai di|di nau com|di ngu|di lam|di hoc|nghi day)\b/.test(n))
      return "Lomi mới phải cảm ơn bạn đã kể nhiều chuyện vậy nè 🥰 Bạn đi lo việc đi, khi nào muốn nói chuyện thì quay lại — Lomi luôn ở đây.";
  }
  if (toL && !/\bhom nay (ban|lomi) (the nao|sao|khoe|ra sao)\b/.test(n) && /\b(gui loi chao|nhan duoc loi chao|chuc (ban|lomi) (mot )?(ngay|buoi|toi|cuoi tuan)|(ban|lomi) con o day|chao (ban|lomi) (mot tieng|xiu|chut|cai))\b/.test(n))
    return "Lomi nhận được rồi nè 👋 Cảm ơn lời chào của bạn nha, Lomi vẫn ở đây. Chúc bạn một ngày thật vui! Có gì cần cứ nhắn Lomi.";
  if (/\bchao buoi (sang|trua|chieu|toi)\b/.test(n) || (/\b(chao|hello|hi)\b(?: \S+){0,3} (lomi|ban)\b/.test(n) && /\b(mot tieng|cho vui|hom nay (ban|lomi) (the nao|sao|khoe|ra sao))\b/.test(n))) {
    const part = n.match(/\bchao buoi (sang|trua|chieu|toi)\b/)?.[1];
    const greet = part ? `Chào buổi ${{ sang: "sáng", trua: "trưa", chieu: "chiều", toi: "tối" }[part]} nha ${part === "sang" ? "☀️" : "👋"}` : "Chào bạn nha 👋";
    const tired = /\b(met|duoi|ban hang ca ngay|cang)\b/.test(n) ? " Nghe bạn mệt rồi đó — nghỉ tay chút, uống miếng nước đã nha." : "";
    const how = /\bhom nay (ban|lomi) (the nao|sao|khoe|ra sao)\b/.test(n) ? " Lomi vẫn khoẻ re, sẵn sàng nghe bạn nè." : " Lomi cũng vui được nói chuyện với bạn.";
    return `${greet}${how}${tired} Hôm nay của bạn sao rồi?`;
  }
  if (/\bhen (lat|ti|chut|xiu|mai)( nua)? (quay lai|noi tiep|gap lai|ghe lai)\b|\b(lat|ti|chut) (nua )?(minh|em|toi|tui) (quay lai|ghe lai)\b/.test(n))
    return "Okie nha 👋 Lát quay lại Lomi vẫn ở đây chờ bạn.";
  return null;
}
export function outOfScope(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  if (/\b(boi|tarot|rut (bai|la)|xem bai|trai bai)\b/.test(n)) return null; // ("bói xem chuyến bay có bị delay không" là xin bói)
  const topic =
    /\b(dau xe|do xe)\b(?: \S+){0,6} (luat|bien|phat|cam)\b|\bluat giao thong\b/.test(n) ? "luật giao thông"
    : /\b(cai lai|cai dat lai|cai) (he dieu hanh|win|windows|macos)\b|\bhe dieu hanh may tinh\b/.test(n) ? "cài đặt máy tính"
    : /\b(tinh trang|gio bay|lich bay|tra cuu) (chuyen bay|may bay)\b|\bchuyen bay\b(?: \S+){0,4} (tre|hoan|delay|cat canh)\b/.test(n) ? "tra cứu chuyến bay"
    : /\b(dau hoi hay dau (nga|nang)|dau nga hay dau hoi|viet (dung )?chinh ta|cach viet chu)\b/.test(n) ? "chính tả"
    : /\bthien van\b|\bthuat ngu\b(?: \S+){0,4} (la|nghia)\b/.test(n) && /\b(thien van|vat ly|hoa hoc)\b/.test(n) ? "kiến thức chuyên ngành"
    : null;
  if (!topic) return null;
  return `Chuyện ${topic} thì Lomi chưa giúp chắc được rồi 🙏 Lomi chỉ giỏi mấy việc gần gũi: thông tin sức khoẻ thường gặp, nghe tâm sự, tìm quán, cách dùng app iLomi và bói Tarot cho vui. Chuyện này bạn tra nguồn chính thức hoặc hỏi người làm nghề cho chắc nha.`;
}

// ── 7) 12/11 — chuyện ăn uống hằng ngày: Lomi KHÔNG có công thức nấu ăn (Kir: "nấu ăn thì k cần, tìm quán là đc rồi") → nói thật
//   và mời tìm quán; câu chọn giữa hai món ("tối ăn cơm hay phở nhỉ") → chọn giúp một món cho vui + mời tìm quán.
// (câu có chữ CÓ DẤU về bệnh / thai / kiêng → để lớp sức khoẻ lo; so trên chữ có dấu vì "đậu" và "đau" bỏ dấu là một)
const NOT_FOOD_TALK = /(?<![\p{L}])(bệnh|bị|đau|sốt|tiểu đường|huyết áp|bầu|mang thai|kiêng|dị ứng|giảm cân|ăn kiêng|con nhỏ|bé)(?![\p{L}])/u;
export function foodChat(text: string, seed = 0): string | null {
  const n = ` ${normalizeVi(text).replace(/\bj\b/g, "gi").replace(/\bz\b/g, "vay")} `;
  if (NOT_FOOD_TALK.test(text.normalize("NFC").toLowerCase()) || (!/[^\x00-\x7F]/.test(text) && /\b(benh|bi|sot|tieu duong|bau|kieng)\b/.test(n))) return null;
  const cook =
    /\b(nau|lam|che bien|xao|hap|chien|kho)\b(?: (cai do|mon|nhanh|gi do))?(?: \S+){0,2} (mon gi|gi|kieu gi|the nao|sao cho|ra sao)\b/.test(n) && /\b(nau|che bien|lam mon|mon)\b/.test(n)
    || /\bmon (gi|nao|chay|hap|xao)\b(?: \S+){0,3} (de lam|nhanh gon|lam nhanh|nau nhanh|don gian)\b/.test(n)
    || /\b(tu|nha|tu lanh) (con|co)\b(?: \S+){1,8} (nau|lam) (mon|gi|cai)\b/.test(n);
  if (cook)
    return "Lomi chưa có công thức nấu ăn nên không dám chỉ bừa đâu 🙏 Nấu ở nhà thì bạn tra công thức trên mạng cho chắc nha.\n\nCòn nếu ngại nấu, muốn ăn ngoài cho nhanh thì bạn nói món hoặc khu vực, Lomi tìm quán ở Đà Lạt có ưu đãi cho bạn liền 🍜";
  const ch = n.match(/\b(an|uong|nau|di an)\s+(.{2,22}?)\s+hay\s+(?:la\s+)?(.{2,22}?)(?=\s+(?:thi|nhi|ta|day|di|ha|hon|ne|a)\b|\s*$)/);
  // ("uống sau ăn hay trước ăn" là hỏi cách dùng thuốc; "uống buổi sáng hay buổi tối" là hỏi giờ — không phải chọn món)
  const TIMEY = /^(sau|truoc|luc|khi|buoi|ban|moi|1|mot|2|hai|3|ba|bao)\b|\b(an|doi|no|sang|trua|chieu|toi|dem|ngay|tuan|lan|vien|lieu|thuoc)$/;
  if (ch && !/\b(tim|o dau|quan nao|thuoc|vien|lieu)\b/.test(n) && !TIMEY.test(ch[2].trim()) && !TIMEY.test(ch[3].trim())) {
    const pick = [ch[2], ch[3]][Math.abs(seed) % 2].trim();
    const raw = text.normalize("NFC");
    // (lấy lại đúng chữ có dấu người dùng gõ — "phở", không phải "pho")
    const back = (bare: string) => {
      const all = raw.match(/[\p{L}\d]+/gu) ?? [];
      const k = bare.split(" ").length;
      for (let i = 0; i + k <= all.length; i++) {
        const seg = all.slice(i, i + k).join(" ");
        if (normalizeVi(seg) === bare) return seg;
      }
      return bare;
    };
    const p = back(pick);
    return `Nếu là Lomi thì chọn **${p}** nha 😋 Chọn đại cho đỡ phân vân thôi — bạn thèm món kia hơn thì cứ chiều theo bụng mình!\n\nMuốn ăn ngoài thì gõ “tìm quán ${p}”, Lomi tìm quán ở Đà Lạt cho bạn liền.`;
  }
  return null;
}

// ── 8) 12/11 — câu hỏi CÁCH DÙNG APP nhắc rõ iLomi / một mục trong app ("gọi xe ở mục Đưa đón có trả tiền mặt được không",
//   "người yêu cũ nhắn trên iLomi làm phiền, chỉ cách chặn") → đúng câu hỏi thường gặp, trước các lớp tìm quán / tâm sự đọc nhầm
//   chữ "xe", "quán ăn", "người yêu". Trả về id câu hỏi thường gặp (lib/lomiFaq) hoặc null.
const APP_SAID = /\b(ilomi|i lomi|trong app|tren app|app nay|cua app|muc (dua don|uu dai|quet|tin nhan|cong dong|kham pha|ho so|thong bao)|chat nhom)\b/;
const HOW = /\b(cho nao|o dau|muc nao|vao dau|bam (cho )?nao|the nao|kieu gi|ntn|lam sao|cach|duoc khong|duoc ko|dc ko|duoc hong|co (duoc|can|bat buoc|phai)|bao nhieu|toi da|ai (duyet|nhan)|khac nhau|hay chi|chuan bi gi|thao tac|co xem lai|hai ben|khong|ko|hong|ha|vay)\b/;
export function appAskId(text: string, faqMatch: (t: string) => { id: string } | null): string | null {
  const n = ` ${normalizeVi(text)} `;
  if (!APP_SAID.test(n) || !HOW.test(n)) return null;
  if (/\b(dua don|goi xe|dat xe|tai xe|xe om|o to|xe may)\b/.test(n)) {
    if (/\b(tien mat|chuyen khoan|tra tien|thanh toan)\b/.test(n)) return "ridepay";
    if (/\b(dang ky|lam tai xe|chay xe|chay giao hang|nhan cuoc)\b/.test(n)) return "ridedriver";
    if (/\b(o to|xe may|xe hoi|loai xe)\b/.test(n)) return "ridebook";
  }
  if (/\b(diem)\b/.test(n) && /\b(bac|cap bac|hang)\b/.test(n)) return "points";
  if (/\b(quet|match)\b/.test(n)) {
    if (/\b(bo qua|xem lai|quet nham|lo quet)\b/.test(n)) return "quetundo";
    if (/\b(match|ca hai|hai ben|cung thich|thich nhau|cuoc tro chuyen|tro chuyen duoc)\b/.test(n)) return "quetconnect";
    if (/\b(dang nhu cau|tao nhu cau|viet nhu cau)\b/.test(n)) return "quetwhat";
  }
  if (/\b(nhom|chat nhom)\b/.test(n) && /\b(toi da|bao nhieu nguoi|\d+ nguoi|them .{0,12}nguoi)\b/.test(n)) return "group";
  if (/\b(chan)\b/.test(n) && /\b(tai khoan|nguoi|nick|nhan tin|lam phien)\b/.test(n) && /[^\x00-\x7F]/.test(text) && /chặn/u.test(text.toLowerCase())) return "block";
  if (/\b(bao cao|quay roi|to cao)\b/.test(n)) return "report";
  if (/\b(doanh nghiep|ho so doanh nghiep)\b/.test(n) && /\b(ai duyet|cho duyet|duyet)\b/.test(n)) return "bizcreate";
  if (/\buu dai\b/.test(n) && /\b(thanh vien|ai nhan|nhan ma|nhan duoc|bam (cho )?nao|kieu gi)\b/.test(n)) return "claim";
  if (/\b(xoa)\b/.test(n) && /\b(cuoc tro chuyen|tin nhan|doan chat)\b/.test(n)) return "msgmanage";
  // (chỉ nói "trên app" mà không rõ thứ gì — "đăng bài bán hàng trên app" — để các lớp hỏi app phía sau lo, chúng hiểu sâu hơn)
  return /\bilomi\b/.test(n) ? faqMatch(text)?.id ?? null : null;
}

// ── 9) 13/11 — hỏi NGHĨA MỘT LÁ TAROT có nêu tên ("tôi vừa rút lá Lovers ngược cho tình yêu, giải thích ý nghĩa được không",
//   "giải thích lại lá Tower trong trải tình cảm này", đang học The Hermit mà hỏi "nó ngược thì giải thế nào") → đọc lá đó, xuôi / ngược.
//   Trước đây: tâm sự tình cảm, thẻ bệnh "Căng thẳng", "Dạy Lomi". Tên Việt dễ trùng chữ thường ("mặt trời", "ngôi sao", "công lý")
//   nên chỉ nhận khi có chữ lá / bài / tarot / ngược / xuôi đi kèm.
type CardKey = { id: number; keys: string[] };
let CARD_KEYS: CardKey[] | null = null;
function cardKeys(): CardKey[] {
  if (CARD_KEYS) return CARD_KEYS;
  CARD_KEYS = Array.from({ length: TAROT_DECK_SIZE }, (_, id) => {
    const c = tarotCard(id);
    const en = normalizeVi(c.name.en);
    const vi = normalizeVi(c.name.vi);
    const keys = [en, en.replace(/^the /, ""), vi].filter((k) => k.length >= 3);
    return { id, keys: [...new Set(keys)] };
  });
  return CARD_KEYS;
}
// ("nghĩa LÀ sao" bỏ dấu cũng là "la" — so chữ có dấu khi câu có dấu; câu không dấu thì cần "la bai", "rut la", "tarot"…)
function tarotCue(text: string): boolean {
  const t = ` ${text.normalize("NFC").toLowerCase()} `;
  if (/[^\x00-\x7F]/.test(text)) return /(?<![\p{L}])(lá|bài|tarot|ngược|xuôi|trải|rút)(?![\p{L}])/u.test(t);
  return /\b(la bai|rut la|tarot|nguoc|xuoi|trai bai)\b/.test(normalizeVi(text));
}
export function cardNamed(text: string): { id: number; rev: boolean } | null {
  const n = ` ${normalizeVi(text)} `;
  let best: { id: number; key: string } | null = null;
  for (const c of cardKeys())
    for (const k of c.keys)
      if ((!best || k.length > best.key.length) && new RegExp(`(?<![a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`).test(n)) best = { id: c.id, key: k };
  if (!best) return null;
  // tên Việt (Mặt Trời, Ngôi Sao, Công Lý…) phải có chữ lá / bài / tarot đứng kèm
  const viKey = best.key === normalizeVi(tarotCard(best.id).name.vi);
  if (viKey && !tarotCue(text)) return null;
  return { id: best.id, rev: /\b(nguoc|reversed|lat nguoc)\b/.test(n) };
}
export function tarotCardAsk(text: string, tarotCtx: boolean, prev?: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  const asks = /\b(nghia|y nghia|giai thich|giai (the nao|sao|ra sao)|doc (nguoc|xuoi)|la gi|noi gi|bao (hieu|gi)|co dang so|dang so|tot hay xau|xau khong|tot khong|doc (the nao|sao)|hieu (the nao|sao))\b/.test(n);
  if (!asks) return null;
  // ("Tui đang học lá The Hermit." → "Nó ngược thì giải thế nào?", "quay lại lá lúc nãy, nó có đáng sợ vậy không") — lá ở câu trước
  const ref = /\b(no|la do|la nay|la luc nay|la vua roi|la kia|cai la do)\b/.test(n);
  const cp = !cardNamed(text) && ref && prev ? cardNamed(prev) : null;
  const c0 = cardNamed(text) ?? (cp ? { id: cp.id, rev: /\b(nguoc|lat nguoc)\b/.test(n) } : null);
  if (!c0) return null;
  const c = c0;
  if (!tarotCtx && !tarotCue(text)) return null;
  const k = tarotCard(c.id);
  const scary = /\b(dang so|co dang so|xau khong|tot hay xau)\b/.test(n);
  const head = `🔮 **${k.name.vi} (${k.name.en})**${c.rev ? " — **ngược**" : ""}`;
  const body = c.rev
    ? `${k.rev.vi}\n\n(Khi xuôi, lá này nói: ${k.up.vi.charAt(0).toLowerCase()}${k.up.vi.slice(1)})`
    : `**Xuôi:** ${k.up.vi}\n**Ngược:** ${k.rev.vi}`;
  const calm = scary ? "\n\nKhông có lá nào là \"xấu\" hẳn đâu nha — lá bài chỉ gợi một góc nhìn để mình chuẩn bị, chứ không quyết định chuyện gì sẽ xảy ra." : "";
  return `${head}\n\n${body}${calm}\n\nĐọc trong trải bài thì nhớ ghép với câu hỏi và vị trí của lá nha. Bạn muốn Lomi rút thêm một lá làm rõ không?`;
}
