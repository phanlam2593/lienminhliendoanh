// ─────────────────────────────────────────────────────────────────────────────
// LOMI HIỂU CÂU THEO CẤU TRÚC (04/10, theo ý Kir: "đừng thêm từng câu vào thư viện")
// Chạy trên máy, KHÔNG gọi AI. Thay vì mỗi câu một mẫu, Lomi tách câu thành các phần rồi ghép lại:
//   người nói (a/anh/em/mình…)  +  trạng thái / việc đang làm  +  câu hỏi hay câu kể  →  câu đáp ghép từ mảnh nhỏ.
// 4 lớp, mỗi lớp nối vào đúng 1 chỗ trong AiAssistant.tsx:
//   1. senseCanon()  — đổi CÁCH NÓI về từ khoá thư viện đã biết (đồng nghĩa + đảo từ), không đổi ý.
//                      vd "ngủ không được hoài" ⇒ thêm "mất ngủ"; "lựa quán cho a đi" ⇒ "tìm quán gần đây".
//   2. senseState()  — câu KỂ về mình ("a đói bụng", "anh đang uống cf", "em mới ăn xong phở", "mưa quá")
//                      → ghi nhận + quan tâm + hỏi nối 1 câu, KHÔNG báo "chưa tiếp thu".
//   3. senseLate()   — lưới cuối: hỏi về chính Lomi ("e hiểu a nói gì không"), gọi trống ("anh"), câu cụt,
//                      câu kể chưa nhận ra → lắng nghe + hỏi nối. Chỉ CÂU HỎI KIẾN THỨC thật sự ngoài hiểu biết
//                      mới trả null để Lomi nói "chưa tiếp thu" + hiện nút 💡 Dạy Lomi.
//   4. isAskLike()   — phân biệt câu hỏi / yêu cầu với câu kể (dùng chung).
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import type { ChatReply } from "@/lib/lomiChat";

export type SenseReply = ChatReply & { intent: string };

const rnd = (n: number) => Math.floor(Math.random() * n);
let lastPick = "";
function pick(arr: string[]): string {
  const pool = arr.length > 1 ? arr.filter((x) => x !== lastPick) : arr;
  lastPick = pool[rnd(pool.length)];
  return lastPick;
}
/** Regex nguyên TỪ (có dấu) — "đói" khác "đổi", "mưa" khác "mua". */
const W = (s: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${s})(?![\\p{L}\\p{N}])`, "iu");
const low = (raw: string) => raw.normalize("NFC").toLowerCase().trim();

// Đại từ người nói. "e/em" mơ hồ (có người xưng em, có người gọi Lomi là e) nên xử riêng.
const SELF = new Set(["a", "anh", "chi", "c", "minh", "tui", "toi", "to", "t", "tao", "tớ"]);
const SELF2 = new Set(["em", "e"]);
const VOC = new Set(["e", "em", "lomi", "ban", "oi", "ui", "ua", "ê", "alo"]);
const TIME_ADV = new Set(["hom", "nay", "bua", "sang", "trua", "chieu", "toi", "dem", "khuya", "mai", "luc", "gio", "dao", "doan", "tuan", "thang"]);

function tokens(raw: string): string[] {
  return normalizeVi(raw).split(" ").filter(Boolean);
}
/** Bỏ gọi trống ở đầu ("e ơi", "lomi ơi", "e") và từ chỉ thời gian ("hôm nay", "nay", "chiều nay"). */
function trimLead(t: string[]): string[] {
  let i = 0;
  while (i < t.length) {
    if (VOC.has(t[i]) && t[i + 1] === "oi") i += 2;
    else if (VOC.has(t[i]) && (SELF.has(t[i + 1]) || TIME_ADV.has(t[i + 1]))) i += 1;
    else if (TIME_ADV.has(t[i]) && i < t.length - 1) i += 1;
    else break;
  }
  return t.slice(i);
}
function hasSelfSubject(raw: string): boolean {
  const t = trimLead(tokens(raw));
  if (!t.length) return false;
  if (SELF.has(t[0])) return true;
  return SELF2.has(t[0]); // "em đang buồn ngủ" — người dùng xưng em (câu hỏi đã bị loại ở isAskLike)
}

// ── Câu hỏi / yêu cầu hay câu kể? ────────────────────────────────────────────
const Q_END = /(?<![\p{L}])(không|ko|hông|hok|chưa|hả|hở|nhỉ|nhể|à|ư|sao|chứ|nào|vậy|thế)\s*[?!.…]*\s*$/u;
const TRAIL_VOC = /\s+(nha|nhé|nè|nhen|đi|đó|á|ạ|e|em|lomi|ơi|bạn|anh|chị)\s*$/u;
const Q_START = /^(ai|gì|nào|đâu|sao|thế nào|bao nhiêu|mấy|tại sao|vì sao|làm sao|làm thế nào|có phải|liệu|bao giờ|khi nào|có nên|nên)\b/u;
const DIRECTIVE = /^(cho|nói|chỉ|giải thích|cho biết|tìm|tra|dịch|viết|tính|giúp|hãy|làm|kể|hướng dẫn|tư vấn|gợi ý|đề xuất|xin|mách|bảo|rút|bói|lựa|chọn|cho hỏi|hỏi)\b/u;
export function isAskLike(raw: string): boolean {
  const s = low(raw);
  if (s.includes("?")) return true;
  const body = s.replace(/^(e|em|lomi|ê|ơi|ạ)\s+(ơi\s+)?/u, "");
  if (Q_START.test(body) || DIRECTIVE.test(body)) return true;
  if (/(^|\s)có\b.+\b(không|chưa|hông|ko)\b/u.test(s)) return true;
  let body2 = s;
  for (let i = 0; i < 3; i++) body2 = body2.replace(TRAIL_VOC, "");
  return Q_END.test(body2);
}

// ── 1) CANON: đồng nghĩa + đảo từ → thêm từ khoá thư viện đã biết ──────────────
// Không thay chữ gốc (các lớp khác vẫn đọc nguyên văn), chỉ NỐI THÊM từ khoá chuẩn ở cuối.
const SYN: [RegExp, string][] = [
  // sức khoẻ / giấc ngủ
  [/\b(ngu (khong|ko|k|hong) (duoc|dc|noi|ngon|say)|khong ngu (noi|nghe)|tran troc|thuc trang|thuc tam|ngu chap chon|hay tinh giac)\b/, "mất ngủ"],
  [/\b(nhuc dau|choang vang|dau nua dau|dau dau)\b/, "đau đầu"],
  [/\b(buon non|muon non|non mua|nong ruot)\b/, "buồn nôn"],
  [/\b(day hoi|chuong bung|an khong tieu|day bung)\b/, "khó tiêu"],
  // tâm lý
  [/\b(ap luc|nang ne|ngop tho|kiet que|khong chiu noi nua|chiu hong noi|sap dat|qua suc)\b/, "áp lực quá"],
  [/\b(khong biet (lam gi|phai lam gi|lam sao|di dau ve dau)|bi quan|mat phuong huong|chang con gi|hoang mang)\b/, "hoang mang"],
  [/\b(that vong ve ban than|minh vo dung|khong ra gi|chang gioi gi|ghet ban than)\b/, "tự ti"],
  [/\b(nho nha|nho gia dinh|nho ba me|nho me|nho bo)\b/, "cô đơn"],
  [/\b(stress|cang thang|met moi|kiet suc|ap luc)\b.*\b(cong viec|di lam|sep|deadline|kpi|tang ca)\b|\b(cong viec|di lam|deadline|kpi)\b.*\b(stress|cang thang|ap luc|kiet suc)\b/, "áp lực công việc"],
  [/\b(khong biet (lam gi|phai lam gi|lam sao)( nua)?|chang biet lam gi)\b/, "hoang mang quá"],
  // tình cảm
  [/\b(thich|yeu|me|phai long|cam nang|crush)\b.*\b(nguoi (ay|do|ta)|chi ay|anh ay|co ay|cau ay|ban ay|em ay|ho)\b.*\b(khong (de y|biet|dap lai|thich lai|quan tam|de tam|ngo|nhin|coi|hay biet)|chi coi|chang de y|vo tam|chua bao gio)\b/, "thích đơn phương"],
  [/\b(nguoi (ay|do)|chi ay|anh ay|co ay|cau ay)\b.*\b(khong thich|khong yeu|khong de y|chi coi)\b.*\b(minh|toi|a|anh|em|e)\b/, "thích đơn phương"],
  [/\b(vo|chong|nguoi yeu|ny|bo|gau|ban trai|ban gai|crush)\b.*\b(gian|cau|hon|doi|mang|chui|bo di|khong noi chuyen|nang nhiec|can nhan|to tieng)\b/, "giận nhau"],
  [/\b(vo|chong)\b.*\b(di nhau|nhau nhet|ruou che|ca do|co bac|di choi khuya|ve khuya|khong ve nha|khong quan tam|vo tam|lanh nhat|nhan tin voi nguoi)\b/, "vợ chồng"],
  [/\b(nguoi yeu|ny|bo|gau|ban trai|ban gai|chong|vo|nguoi ay|nguoi do|anh ay|chi ay|co ay|crush)\b.*\b(bien mat|im lang|khong lien lac|bat may|khong tra loi|lam ngo|ne tranh|khong goi|khong nhan tin|khong rep)\b/, "lạnh nhạt"],
  [/\b(nguoi yeu|ny|bo|gau|chong|vo)\b.*\b(noi doi|noi xau|giau minh|co nguoi khac|nhan tin voi (ai|co|anh|nguoi)|di voi (ai|co|anh|nguoi) khac)\b/, "nghi ngoại tình"],
  [/\b(nho (anh|co|chi|cau|nguoi) (ay|do|ta)|khong quen duoc (nguoi|anh|co|chi))\b/, "nhớ người cũ"],
  // công việc / tiền / gia đình
  [/\b(sep|quan ly|truong phong)\b.*\b(la|mang|chui|ep|soi|bat ne|khong ghi nhan|ghet|doi xu)\b/, "bị sếp mắng"],
  [/\b(het tien|can tui|kho khan ve tien|khong du song|tien thue|tien tro)\b/, "thiếu tiền"],
  [/\b(ba|me|bo|cha)\b.*\b(khong hieu|ep|ap dat|mang|so sanh|cam)\b/, "gia đình áp đặt"],
];

/** Nối thêm từ khoá chuẩn vào câu (nếu cách nói là biến thể). Câu không dính biến thể nào thì trả nguyên. */
export function senseCanon(q: string): string {
  const n = normalizeVi(q);
  const add: string[] = [];
  for (const [re, canon] of SYN) if (re.test(n) && !n.includes(normalizeVi(canon))) add.push(canon);
  const req = canonRequest(q, n);
  if (req) return req;
  return add.length ? `${q} ${add.join(" ")}` : q;
}

// Yêu cầu nói theo nhiều cách → câu chuẩn mà các lớp khác đã hiểu.
const V_FIND = "(?:lua|chon|tim|kiem|goi y|de xuat|gioi thieu|chi|mach|cho biet|tim giup|chon giup|lua giup)";
const FILL = "(?:giup|gium|giumd|dum|ho|cho|voi|vs)?";
const WHO = "(?:a|anh|chi|c|em|e|minh|tui|toi|t|to)?";
const POL = "(?: (?:di|nha|nhe|nhen|ne|a|voi|vs|xiu|chut|ti|duoc khong|nao|ha|nhi))*";
function canonRequest(q: string, n: string): string | null {
  const w = n.split(" ").length;
  if (w > 12) return null;
  // Tìm / chọn quán, chỗ, món
  const f = n.match(new RegExp(`^(?:e |em |lomi |oi )*${V_FIND} ${FILL} ?${WHO} ?(?:mot |1 |may |vai )?(quan an|quan nhau|quan cafe|quan ca phe|quan tra sua|quan|nha hang|tiem|cho an|cho uong|cho choi|cho ngoi|cafe|ca phe|do an|mon an|mon|do uong)${POL}`));
  if (f) {
    const o = /ca phe|cafe/.test(n) ? "cafe" : /tra sua/.test(n) ? "tra sua" : /nhau/.test(n) ? "nhau" : f[1];
    if (/mon|do an|do uong/.test(o)) return /uong/.test(o) ? "hôm nay uống gì" : "hôm nay ăn gì";
    if (/cafe|ca phe/.test(o)) return "tìm quán cà phê gần đây";
    if (/nhau/.test(o)) return "tìm quán nhậu gần đây";
    if (/tra sua/.test(o)) return "tìm quán trà sữa gần đây";
    if (/uong/.test(o)) return "tìm chỗ uống gần đây";
    return "tìm quán ăn gần đây";
  }
  // Rút / bói một lá
  if (new RegExp(`^(?:e |em |lomi |oi )*(?:rut|lat|boc|xin|boi|xem) ${FILL} ?${WHO} ?(?:mot |1 |may |vai )?(la bai|la tarot|la|bai|tarot)${POL}`).test(n))
    return "bói một lá cho hôm nay";
  // Hướng dẫn dùng app
  if (/^(?:e |em |lomi |oi )*(huong dan|chi|chi cach|day|chi giup|huong dan giup)( \w+){0,2} (xai|dung|su dung|choi|thao tac) (app|ung dung|lomi|lien minh lien doanh)\b/.test(n))
    return "hướng dẫn dùng app";
  // Nói chuyện / tâm sự / tư vấn tình cảm
  if (new RegExp(`^(?:e |em |lomi |oi )*(?:noi chuyen|tro chuyen|tam|chat|tam su|ke chuyen|nc) (?:voi|cung) ${WHO}${POL}$`).test(n))
    return /tam su/.test(n) ? "tâm sự với mình nha" : "nói chuyện với mình đi";
  if (/^(?:e |em |lomi |oi )*(?:tu van|khuyen|cho (?:\w+ )?loi khuyen|giup)( \w+){0,3} (tinh cam|tinh yeu|chuyen yeu|chuyen tinh|chuyen vo chong|tam ly)\b/.test(n))
    return /tam ly/.test(n) ? "tư vấn tâm lý" : "tư vấn tình cảm";
  return null;
}

// ── 2) STATE: câu kể về mình ─────────────────────────────────────────────────
type StateDef = { id: string; re: RegExp; reply: (m: RegExpMatchArray, s: string) => ChatReply };
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
/** Cụm sau động từ ("ăn xong phở nè" → "phở"), tối đa 3 từ, bỏ từ đệm cuối. */
function tail(s: string, after: RegExp): string {
  const m = s.match(after);
  if (!m) return "";
  const rest = s.slice((m.index ?? 0) + m[0].length).split(/[,.!?…]/u)[0].trim();
  const words = rest.split(/\s+/).filter(Boolean);
  while (words.length && /^(nè|nha|nhé|nhen|á|ạ|rồi|đó|luôn|thôi|đây|mà|xong|nữa)$/u.test(words[words.length - 1])) words.pop();
  return words.slice(0, 3).join(" ");
}

const STATES: StateDef[] = [
  {
    id: "sleepy",
    re: W("buồn ngủ|muốn ngủ|thèm ngủ|ngái ngủ|díp mắt|ngủ gật|ngáp( ngắn ngáp dài)?|buon ngu|muon ngu|ngai ngu"),
    reply: () => ({
      text: pick([
        "Buồn ngủ hả 😴 Nếu được thì chợp mắt 15–20 phút cho tỉnh nha, đừng ráng quá. Còn không thì uống ngụm nước, đứng dậy vươn vai một chút.",
        "Ôi buồn ngủ rồi 🥱 Cơ thể đang nhắc bạn nghỉ đó. Hôm qua ngủ có đủ giấc không nè?",
      ]),
    }),
  },
  {
    id: "hungry",
    re: W("đói( bụng| meo| quá| lắm| rồi| ghê| xỉu| lả)?|bụng (kêu|réo|sôi)|doi bung|doi qua|doi meo|doi lam"),
    reply: () => ({
      text: pick([
        "Đói thì ăn liền đi nè 🍜 Bỏ bữa không tốt đâu. Muốn Lomi gợi ý món hay tìm quán gần bạn không?",
        "Bụng réo rồi hả 😆 Để Lomi giúp chọn món nha!",
      ]),
      quick: ["Hôm nay ăn gì? 🎲", "Tìm quán ăn gần mình"],
    }),
  },
  {
    id: "thirsty",
    re: W("khát( nước| quá| khô cổ)?|khat nuoc|khô cổ"),
    reply: () => ({ text: pick(["Khát thì uống nước liền nha 💧 Nước lọc là số một, rồi mới tới trà sữa 😄", "Uống ngụm nước đi bạn ơi 💧 Muốn Lomi gợi ý quán nước gần đây không?"]), quick: ["Hôm nay uống gì? 🎲"] }),
  },
  {
    id: "battery",
    re: W("hết pin|hết sạc|hết năng lượng|hết xăng|đuối( quá| lắm| rồi)?|kiệt sức|rã rời|không còn sức|het pin|het sac|het nang luong|cạn pin"),
    reply: () => ({
      text: pick([
        "Hết pin thật rồi đó 🔋 Nghỉ tay xíu, uống nước, hít thở sâu vài hơi để “sạc” lại nha. Hôm nay bạn làm nhiều việc lắm hả?",
        "Nghe là thấy đuối rồi 🥺 Cho phép mình nghỉ một chút cũng là cách chăm sóc bản thân. Có chuyện gì làm bạn mệt vậy?",
      ]),
    }),
  },
  {
    id: "coffee",
    re: W("(đang |vừa |mới )?(uống|nhâm nhi|làm|làm ly|làm tách|order|gọi)( một| 1| ly| tách| cốc)* (cf|cafe|cà phê|caphe|trà sữa|trà|nước)( rồi| xong)?|đang cf"),
    reply: (m, s) => {
      const tea = /trà/.test(m[0] ?? s);
      return {
        text: pick(
          tea
            ? ["Trà sữa hả 🧋 Nhớ đừng uống quá ngọt nha! Đang ngồi quán nào vậy?", "Nghe là thấy thèm 🧋 Đang uống ở nhà hay ở quán nè?"]
            : ["Cà phê hả ☕ Sáng nay uống ly nào vậy? Nhớ đừng uống nhiều quá kẻo khó ngủ nha!", "Ui, cà phê buổi này là chuẩn bài 😄 Đang ngồi quán nào vậy?"],
        ),
        quick: ["Tìm quán cà phê gần đây"],
      };
    },
  },
  {
    id: "eating",
    re: W("(đang |vừa |mới )(ăn|nhậu|đi ăn)( xong| rồi)?|ăn xong( rồi)?|(đang |vừa |mới )?ăn (sáng|trưa|tối|vặt|cơm|phở|bún|mì|cháo|lẩu|nướng|bánh mì|bánh|hủ tiếu|cơm tấm|pizza|gà|bò|hải sản|xôi|chè)"),
    reply: (m, s) => {
      const food = tail(s, /ăn xong|ăn (?=\p{L})|nhậu/u).replace(/^(xong|rồi|sáng|trưa|tối)\s*/u, "");
      const f = food && !/^(với|cùng|ở|tại|rồi|cái|một)/u.test(food) ? food : "";
      return {
        text: f
          ? pick([`${cap(f)} hả, nghe ngon ghê 😋 Ăn có no không nè?`, `Ui ${f} nghe hấp dẫn quá 🤤 Quán nào vậy bạn, ngon không?`])
          : pick(["Ăn ngon miệng nha 😋 Hôm nay ăn gì vậy nè?", "No bụng là vui rồi ha 😄 Ăn món gì vậy bạn?"]),
      };
    },
  },
  {
    id: "gaming",
    re: W("(đang |vừa |mới )?(chơi|cày|leo rank|đánh|rank|stream)( \\p{L}+)? ?(game|liên quân|lol|pubg|free fire|valorant|lmht|đột kích|fifa|minecraft|roblox)|đang game|choi game"),
    reply: () => ({
      text: pick([
        "Game hả 🎮 Đang thắng hay đang tilt vậy nè? Muốn tìm đồng đội chơi chung thì vào Quẹt → Game nha!",
        "Cày game vui ghê 🎮 Nhớ nghỉ mắt chút xíu nha. Ở Quẹt → Game có nhiều người đang tìm bạn chơi chung đó!",
      ]),
      quick: ["Quẹt là gì, dùng thế nào?"],
    }),
  },
  {
    id: "watching",
    re: W("(đang |vừa |mới )(xem|coi|cày|nghe)( \\p{L}+)? ?(phim|youtube|tiktok|netflix|bóng đá|nhạc|podcast|series|anime)"),
    reply: (m) => ({
      text: /nhạc|podcast/.test(m[0]) ? pick(["Nghe nhạc thư giãn ghê 🎧 Bài nào đang làm bạn mê vậy?", "Nhạc hay là cuộc sống tươi liền ha 🎶 Bạn đang nghe thể loại nào vậy?"]) : pick(["Xem gì vậy bạn 🍿 Phim hay thì kể Lomi nghe với!", "Nghe là thấy chill rồi 😄 Phim gì vậy, hay không?"]),
    }),
  },
  {
    id: "working",
    re: W("(đang |vừa |mới )(làm việc|làm|đi làm|họp|code|bán hàng|trông quán|chạy deadline|tăng ca|trực)(?! về)( xong| rồi)?|đang bận|bận quá|bận lắm|bận rộn"),
    reply: () => ({
      text: pick(["Cố lên nha 💪 Nhớ uống nước và đứng dậy vươn vai mỗi tiếng một lần cho đỡ mỏi. Hôm nay công việc có thuận lợi không?", "Vất vả rồi 🤗 Bận thì cứ làm đi, khi nào rảnh nói chuyện với Lomi nha!"]),
    }),
  },
  {
    id: "studying",
    re: W("(đang |vừa |mới )(học|ôn bài|ôn thi|làm bài|học bài|làm bài tập)"),
    reply: () => ({ text: pick(["Chăm chỉ ghê 📚 Học xong nhớ nghỉ giải lao chút cho đầu óc thoải mái nha. Đang học môn gì vậy?", "Cố lên bạn ơi 💪 Học 45 phút nghỉ 10 phút là hợp lý nhất đó!"]) }),
  },
  {
    id: "place",
    re: W("(đang|vừa|mới) (ở|tới|đến|về|đi)( tại)? (?!nhà\\b)\\p{L}+( \\p{L}+)?"),
    reply: (m, s) => {
      const place = tail(s, /(đang|vừa|mới) (ở|tới|đến|về|đi)( tại)? /u);
      if (/đà lạt|da lat|dalat/i.test(place)) return { text: pick(["Đà Lạt hả 🌲 Trời se lạnh dễ chịu ha! Muốn Lomi gợi ý quán cà phê hay chỗ ăn gần bạn không?", "Ở Đà Lạt thích ghê 🌸 Nhớ mang áo khoác nha. Cần tìm quán gì Lomi tìm giúp liền!"]), quick: ["Tìm quán cà phê gần đây", "Tìm quán ăn gần mình"] };
      return { text: place ? pick([`Ở ${place} hả, nghe vui đó 😄 Bạn đi chơi hay làm việc vậy?`, `${cap(place)} à, thích ghê 🌿 Đang ở đó làm gì vậy bạn?`]) : "Ừa nghe vui đó 😄 Kể Lomi nghe thêm đi!" };
    },
  },
  {
    id: "free",
    re: W("(đang |đỡ |khá |hơi )?rảnh( rỗi| quá| lắm| nè| ghê)?|không có gì làm|chả có gì làm|nhàn quá|thừa thời gian"),
    reply: () => ({
      text: pick([
        "Rảnh thì tám với Lomi nè 😄 Hoặc bạn thử bói một lá cho vui, hay ghé Quẹt xem có ai đang tìm bạn chơi không?",
        "Rảnh vậy là hợp để làm gì đó vui rồi 😆 Bạn muốn tâm sự, bói bài hay đi tìm quán ngon?",
      ]),
      quick: ["Bói một lá cho hôm nay", "Hôm nay ăn gì? 🎲"],
    }),
  },
  {
    id: "goodnews",
    re: W("(vừa|mới) (trúng|được|đậu|đỗ|nhận|thắng|lên)( \\p{L}+)*( số| giải| lương| chức| việc| điểm| tiền| học bổng| đại học| phỏng vấn)|trúng số|đậu (đại học|phỏng vấn|rồi)|được (tăng lương|thăng chức|nhận việc|điểm cao|khen)"),
    reply: () => ({ text: pick(["Wow chúc mừng bạn nha 🎉🥳 Tin vui vậy là phải ăn mừng chút xíu rồi! Kể Lomi nghe chi tiết đi nào!", "Hay quá trời luôn 🎊 Lomi vui lây nè! Bạn định ăn mừng thế nào vậy?"]) }),
  },
  {
    id: "happy",
    re: W("vui( quá| lắm| ghê| thật| vl| vãi| lắm luôn)?|hạnh phúc|phấn khích|hào hứng|yêu đời|tâm trạng tốt|happy"),
    reply: () => ({ text: pick(["Nghe bạn vui là Lomi vui lây liền 😆 Có chuyện gì hay kể Lomi nghe với!", "Yay 🎉 Giữ năng lượng này cả ngày nha! Chuyện gì làm bạn vui vậy nè?"]) }),
  },
  {
    id: "weather",
    re: W("trời (đẹp|xanh|trong|quang)|(trời )?(mưa|nắng|gió|lạnh|nóng|oi|mát|rét|sương mù|nồm)( to| lớn| nhỏ| dữ| quá| ghê| lắm| nè| rồi| rả rích| phùn| cả ngày| hoài)*"),
    reply: (m) => {
      const k = (m[0].match(/đẹp|xanh|trong|quang|mưa|nắng|gió|lạnh|nóng|oi|mát|rét|sương mù|nồm/u) ?? [""])[0];
      const t: Record<string, string[]> = {
        "mưa": ["Mưa hả 🌧️ Ra đường nhớ mang áo mưa nha. Ngồi quán cà phê nghe mưa cũng chill lắm đó ☕", "Trời mưa dễ làm lòng người chùng xuống ghê 🌧️ Pha ly trà nóng cho ấm nha. Bạn đang ở nhà hay ở ngoài vậy?"],
        "nắng": ["Nắng vậy nhớ che chắn, uống nhiều nước nha ☀️ Ra đường nhớ thoa kem chống nắng đó!"],
        "lạnh": ["Lạnh thì mặc ấm, uống chút gì nóng nha 🧣 Đà Lạt lạnh là hợp ăn lẩu nướng lắm đó 🍲"],
        "rét": ["Rét vậy nhớ mặc ấm, quấn khăn nha 🧣 Muốn Lomi tìm quán ấm cúng gần bạn không?"],
        "nóng": ["Nóng vậy nhớ uống thật nhiều nước 🥤 Một ly trà đá hay sinh tố là đã nhất!"],
        "oi": ["Oi bức khó chịu thiệt ha 🥵 Uống nước nhiều, mặc đồ thoáng mát nha."],
        "mát": ["Trời mát là lúc dễ chịu nhất ha 🌿 Đi dạo một vòng cho khoẻ nha!"],
        "đẹp": ["Trời đẹp vậy là hợp để ra ngoài lắm 🌤️ Đi dạo hay làm ly cà phê ngoài trời nha! Bạn có dự định gì không?"],
      };
      return { text: pick(t[k] ?? ["Thời tiết dạo này thất thường ha 🌦️ Giữ sức khoẻ nha bạn!"]), quick: k === "mưa" || k === "lạnh" ? ["Tìm quán cà phê gần đây"] : undefined };
    },
  },
  {
    id: "biz_state",
    re: W("(đông|vắng|ít|nhiều|hết|ế|ế ẩm|lỗ|lời|bán chạy|bán ế|chậm|lụt|ngập) ?(khách|hàng|đơn|doanh thu|tiệm|quán)?|không có khách|chưa có khách|ế quá|vắng tanh|đông nghẹt"),
    reply: (m, s) => {
      const slow = /ế|vắng|ít khách|không có khách|chưa có khách|lỗ|chậm|hết khách/.test(s);
      return {
        text: slow
          ? pick(["Nghe vắng khách là thấy lo thiệt 🥺 Một cách hay là tạo ưu đãi nhỏ đúng giờ vắng để kéo khách. Bạn kinh doanh gì để Lomi gợi ý ý tưởng nha?", "Quán có giờ đông giờ vắng là chuyện thường gặp 😊 Mình thử ưu đãi theo khung giờ xem sao nha. Bạn bán gì vậy?"])
          : pick(["Đông khách là tin vui rồi 🎉 Nhớ giữ chất lượng để khách quay lại nha. Bạn muốn Lomi gợi ý cách giữ khách quen không?", "Hay quá, buôn may bán đắt 💪 Muốn Lomi gợi ý thêm cách tăng khách vào giờ vắng không?"]),
        quick: ["Làm sao hút khách lúc vắng?", "Làm sao giữ khách quen?"],
      };
    },
  },
];

/** Câu "a thích em / a yêu e" → Lomi thân thiện nhưng rõ mình là robot (không tình tứ). */
const LOVE_LOMI = /^(a|anh|chi|c|minh|tui|toi|t)\s+(thich|yeu|thuong|nho|me)\s+(em|e|lomi|ban)(\s+(roi|lam|qua|do|nha|nhe|nhieu|ghe))*$/;

/** Thử hiểu câu KỂ về mình. Trả null nếu không phải. Gọi khi KHÔNG ở trong mạch đang chờ trả lời. */
export function senseState(raw: string, only?: string[]): SenseReply | null {
  const s = low(raw);
  if (!s || s.length > 120) return null;
  if (isAskLike(raw)) return null;
  const n = normalizeVi(raw);
  if (!only && LOVE_LOMI.test(n))
    return { intent: "state:love_lomi", text: pick(["Hihi Lomi ngại quá 😳 Lomi là robot nên chỉ biết thương cả cộng đồng thôi nè 🤖💚 Muốn gặp người thật thì ghé Quẹt → Làm quen nha!", "Cảm ơn bạn nha 🥰 Lomi là robot nhỏ thôi, nhưng lúc nào cũng sẵn sàng nghe bạn kể. Có chuyện gì cứ nói Lomi nè!"]) };
  const selfSub = hasSelfSubject(raw);
  const words = s.split(/\s+/).length;
  for (const d of STATES) {
    if (only && !only.includes(d.id)) continue;
    const m = s.match(d.re);
    if (!m) continue;
    // Có người nói rõ ràng thì tin; không có thì chỉ nhận câu ngắn mà trạng thái đứng đầu câu ("đói quá", "mưa quá").
    const idx = m.index ?? 0;
    const okShort = !selfSub && words <= 6 && idx <= 12 && !/^(con|vợ|chồng|bạn|ông|bà|mẹ|ba|bố|cô|dì|chú|bác|anh ấy|chị ấy|nó)(?![\p{L}])/u.test(s);
    // "vắng/đông khách" có thể là chuyện quán của người khác — vẫn nhận (người dùng kể chuyện kinh doanh).
    if (selfSub || okShort || d.id === "biz_state" || d.id === "weather") {
      const r = d.reply(m, s);
      return { ...r, intent: `state:${d.id}` };
    }
  }
  return null;
}


/** Hỏi thăm chính Lomi ("e có buồn không", "em mệt chưa") — Lomi là robot, đáp thật + hỏi lại người dùng. */
const ABOUT_LOMI = /^(e|em|lomi|ban)\s+(co\s+|dang\s+)?(buon|vui|met|doi|khat|chan|nho|khoe|on|ngu|thuc|cuoi|khoc|gian|buc)\b.*\b(khong|ko|chua|k|hong|ha|a|nhi)$/;
export function senseAboutLomi(raw: string): SenseReply | null {
  const n = normalizeVi(raw);
  if (!ABOUT_LOMI.test(n)) return null;
  return {
    intent: "about_lomi",
    text: pick([
      "Lomi là robot nên không buồn hay mệt như người đâu 😄 Nhưng được bạn hỏi thăm là Lomi vui lắm! Còn bạn hôm nay sao rồi?",
      "Hihi cảm ơn bạn đã quan tâm Lomi 🥰 Robot như Lomi lúc nào cũng pin đầy nè 🔋 Còn bạn có ổn không?",
    ]),
  };
}

// Chào kèm thời điểm / lời chúc ("chào e ngày mới nha", "hello cưng buổi sáng") = từ chào + toàn từ đệm / thời gian.
const GREET_WORDS = new Set(["chao", "xin", "hello", "helo", "hi", "hey", "aloha", "alo", "hallo", "he", "lo", "hế", "lô", "good", "morning"]);
const GREET_FILL = new Set(["e", "em", "anh", "chi", "a", "c", "ban", "lomi", "cung", "cuong", "cuc", "nha", "nhe", "nhen", "ne", "oi", "moi", "nguoi", "ca", "nay", "ngay", "buoi", "sang", "trua", "chieu", "toi", "vui", "ve", "tot", "lanh", "hom", "hen", "hihi", "ha", "he", "vo", "tui", "minh"]);
export function senseGreeting(raw: string): SenseReply | null {
  const n = normalizeVi(raw).replace(/([aeiouy])\1+\b/g, "$1");
  const t = n.split(" ").filter(Boolean);
  if (!t.length || t.length > 7 || !GREET_WORDS.has(t[0])) return null;
  if (!t.slice(1).every((x) => GREET_FILL.has(x) || GREET_WORDS.has(x))) return null;
  const part = /\bsang\b/.test(n) ? "sáng" : /\btrua\b/.test(n) ? "trưa" : /\bchieu\b/.test(n) ? "chiều" : /\btoi\b/.test(n) ? "tối" : "";
  const newDay = /ngay moi/.test(n);
  return {
    intent: "greeting",
    text: newDay
      ? pick(["Chào bạn, chúc một ngày mới thật nhiều niềm vui nha ☀️ Hôm nay bạn có dự định gì không nè?", "Ngày mới tốt lành nha 🌤️ Bạn dậy sớm vậy, hôm nay thế nào rồi?"])
      : part
        ? `Chào buổi ${part} nha ${part === "tối" ? "🌙" : "☀️"} Hôm nay của bạn thế nào rồi nè?`
        : pick(["Chào bạn nè 👋 Hôm nay bạn thế nào rồi?", "Hello 😄 Lomi đây! Có chuyện gì vui kể Lomi nghe nha?", "Chào bạn 🌿 Lomi nghe nè, bạn cần gì không?"]),
  };
}

// ── 3) LATE: lưới cuối trước khi nói "chưa tiếp thu" ──────────────────────────
const META: [string, RegExp, string[]][] = [
  [
    "meta_addr",
    /\b(sao (lai |cu )?(goi|xung) (a|anh|chi|c|em|e|minh|toi|tui)|a chu sao|anh chu sao|xung ho|goi sai|sai (xung|goi))\b|^(a|anh|chi|c) (chu|ma) sao (lai )?(e|em)\b/,
    ["Dạ xin lỗi, Lomi xưng hô chưa đúng ý rồi 🙏 Bạn cứ nói “gọi mình là anh” hay “gọi mình là chị” là Lomi đổi liền nha."],
  ],
  [
    "meta_understand",
    /\b(hieu (a|anh|chi|c|minh|toi|tui|khong|ko|chua)( noi)?( gi)?|co hieu|hieu gi khong|hieu hong|biet gi (khong|ko)|chua biet (ha|a|sao)|chang biet gi|ngu (qua|vay|the)|do ngoc|ngo ngan|dot qua|khong hieu gi het|sao cu (bat|hoi)|bat (minh|toi|tui|a|anh) (hoi|noi|viet) (hoai|mai|quai|lai)|(hoi|noi|lap) (hoai|mai|quai|di lap lai)|lap lai)\b/,
    [
      "Dạ xin lỗi bạn, chắc Lomi hiểu chưa đúng ý 🙏 Lomi còn đang tập hiểu cách mọi người nói chuyện. Bạn thử nói ngắn một ý nha — chuyện sức khoẻ, tâm sự, tình cảm, bói bài hay dùng app — Lomi sẽ cố hết sức!",
      "Hic, Lomi xin lỗi vì chưa theo kịp bạn 🥲 Bạn nói lại bằng vài chữ ngắn gọn giúp Lomi nha. Lomi sẽ học dần để hiểu bạn hơn nha!",
    ],
  ],
];
const VOCATIVE_ONLY = /^(e|em|lomi|anh|chi|a|c|ban|oi|alo|ê)( (oi|ơi|a|ạ|ne|nè|nhe|nha))*$/;

/** Lưới cuối. Trả null = đây là câu HỎI KIẾN THỨC Lomi chưa có → để Lomi nói "chưa tiếp thu" + nút Dạy Lomi. */
export function senseLate(raw: string, ctx: { lastText?: string } = {}): SenseReply | null {
  const n = normalizeVi(raw);
  if (!n) return null;
  const words = n.split(" ").length;
  const g = senseGreeting(raw) ?? senseAboutLomi(raw);
  if (g) return g;
  for (const [intent, re, texts] of META) if (re.test(n)) return { intent, text: pick(texts) };
  // Chỉ gọi trống ("anh", "em ơi", "lomi") — đáp "dạ", mời nói tiếp.
  if (VOCATIVE_ONLY.test(n))
    return { intent: "vocative", text: pick(["Dạ, Lomi nghe nè 🙋 Bạn cần gì nè?", "Dạ? Có Lomi đây 😊 Bạn nói đi nha!", "Dạ bạn nói đi, Lomi nghe nè 👂"]) };
  const ask = isAskLike(raw);
  // Câu hỏi cụt, không rõ nói về gì ("thiệt không?", "sao vui á?") → hỏi lại một câu ngắn, không đoán.
  if (ask && words <= 4 && !/\b(la gi|co gi|o dau|bao nhieu|khi nao)\b/.test(n))
    return {
      intent: "askback",
      text: ctx.lastText
        ? pick(["Bạn đang hỏi về chuyện nào vậy nè? Nói rõ thêm chút giúp Lomi nha 😅", "Lomi chưa theo kịp ý bạn 🙈 Bạn nói rõ hơn một chút được không?"])
        : pick(["Bạn hỏi về chuyện gì vậy nè? Nói thêm chút xíu là Lomi hiểu liền 😊", "Lomi chưa chắc hiểu ý bạn 😅 Bạn nói rõ thêm giúp Lomi nha?"]),
    };
  // Câu KỂ chưa nhận ra → lắng nghe, hỏi nối (không đẩy nút, không liệt kê dịch vụ).
  if (!ask && words >= 2) {
    const sad = /(😭|🥲|😢|😞|:\(+|huhu|hic)/iu.test(raw);
    return {
      intent: "listen",
      text: sad
        ? pick(["Ừ, Lomi nghe nè 🥺 Bạn kể thêm cho Lomi nghe được không?", "Lomi ở đây với bạn nè 💚 Chuyện này làm bạn thấy sao?"])
        : pick(["Ừa, Lomi nghe nè 😊 Bạn kể thêm cho Lomi nghe được không?", "Lomi đang nghe nè 🌿 Bạn kể thêm chút được không?", "Lomi nghe nè 😄 Rồi sau đó thế nào vậy bạn?"]),
    };
  }
  return null;
}
