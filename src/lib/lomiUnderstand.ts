// ─────────────────────────────────────────────────────────────────────────────
// LOMI HIỂU TIẾNG VIỆT ĐỜI THƯỜNG (01/10, theo tài liệu yêu cầu của Kir)
// Lomi chạy trên máy (không có AI) nên "hiểu" bằng 3 lớp, ưu tiên Ý ĐỊNH hơn từ khoá:
//   1. tone()      — đọc cảm xúc từ emoji / :)) / =)) / 🥲 …, tách riêng với ý định
//                    (":))" không có nghĩa là câu hỏi đùa — "app bị gì v :))" vẫn là báo lỗi).
//   2. understand() — nhận ý định: mở lời ("cho tui hỏi cái này vs"), báo lỗi app (lag, văng, trắng
//                    màn hình, không vào được), không tìm thấy nút, chưa hiểu, câu cụt ("cái này?",
//                    "rồi sao", "ủa?"), rủ đi chơi ("có ai đi đà lạt hong"), cà khịa vui…
//   3. ngữ cảnh    — dùng tin Lomi vừa nói (issue / faqId / nội dung) để hiểu câu cụt và câu nối
//                    ("android", "đang ở trang ưu đãi") thay vì bắt người dùng nói lại từ đầu.
// Không bao giờ bắt người dùng viết lại cho chuẩn. Thật sự mơ hồ thì hỏi lại MỘT câu ngắn, tự nhiên.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import type { ChatReply } from "@/lib/lomiChat";

export type Tone = "laugh" | "sad" | "mad" | "shock" | "love" | "neutral";

const rnd = (n: number) => Math.floor(Math.random() * n);
let lastPicked = "";
function pick(arr: string[]): string {
  const pool = arr.length > 1 ? arr.filter((x) => x !== lastPicked) : arr;
  lastPicked = pool[rnd(pool.length)];
  return lastPicked;
}

/** Cảm xúc đi kèm câu (emoji, mặt cười chữ, "haha", "huhu"…). */
export function tone(raw: string): Tone {
  const s = raw.toLowerCase();
  // "híc", "hic", "hix", "hức", "hu hu" — có dấu hay không đều là buồn (01/10: "Híc" bị bỏ sót).
  if (/(😭|🥲|😢|😞|😔|😥|😿|💔|:\(+|hu ?hu|(^|[^\p{L}])(h[iíì]c+|hix+|hức+)(?![\p{L}]))/u.test(s)) return "sad";
  if (/(😤|😡|🤬|🙄|😠|💢)/u.test(s)) return "mad";
  if (/(😳|😱|😮|😯|🫢|😧)/u.test(s)) return "shock";
  if (/(🥰|😍|❤️|❤|💕|💖|😘|🫶)/u.test(s)) return "love";
  if (/(:\)+|=\)+|:d\b|xd\b|😂|🤣|😆|😁|😄|🤭|\bhaha|\bhihi|\bhehe|\bkk+)/u.test(s)) return "laugh";
  return "neutral";
}

/** Tín hiệu biểu cảm ở câu GỐC (độ nhấn KHÔNG bị mất khi đã đưa chữ về gốc để hiểu nghĩa):
 *  stretched = có chữ kéo dài ("chánnnn", "okkkk"); trail = "..." (do dự / miễn cưỡng / bất lực);
 *  bang = "!" (dứt khoát / hào hứng); repeatEmoji = 😭😭😭. Chỉ là TÍN HIỆU — luôn đọc cùng tone() và ngữ cảnh. */
export type Expr = { stretched: boolean; trail: boolean; bang: boolean; repeatEmoji: boolean; strong: boolean };
export function expressive(raw: string): Expr {
  const t = raw.normalize("NFC");
  const stretched = /(\p{L})\1{2,}/u.test(t.replace(/\b(coffee|free|see|too|good|book|cool|all|off|kk+)\b/giu, "")) || /(\p{L}{2,})(\p{L})\2(?![\p{L}])/u.test(t.replace(/\b(coffee|free|see|too|good|book|cool|all|off|will|kiss|miss|boss|pass|class)\b/giu, ""));
  const trail = /(\.{2,}|…)\s*$/u.test(t.replace(/[\p{Extended_Pictographic}\ufe0f\s]+$/u, ""));
  const bang = /!+\s*[\p{Extended_Pictographic}\ufe0f\s]*$/u.test(t);
  const repeatEmoji = /(\p{Extended_Pictographic})\ufe0f?\s*\1/u.test(t);
  return { stretched, trail, bang, repeatEmoji, strong: stretched || repeatEmoji };
}

/** Trả lời khi người dùng CHỈ gửi emoji — đọc đúng cảm xúc thay vì đáp một kiểu. */
export function emojiOnlyReply(raw: string): string | null {
  const t = raw.trim();
  if (!t || !/^[\p{Extended_Pictographic}‍️\s]+$/u.test(t)) return null;
  switch (tone(t)) {
    case "sad":
      return pick(["Ơ sao vậy nè 🥺 Có chuyện gì kể Lomi nghe nha.", "Ôm một cái nè 🤗 Bạn ổn không?"]);
    case "mad":
      return pick(["Ai làm bạn bực vậy 😤 Kể Lomi nghe coi!", "Hít sâu một hơi nha 🌿 Có chuyện gì vậy?"]);
    case "shock":
      return pick(["Gì vậy gì vậy 😳", "Ủa có chuyện gì hả? 😯"]);
    case "love":
      return pick(["Lomi thương lại nè 🥰", "Ui ngại ghê ☺️💚"]);
    case "laugh":
      return pick(["Hihi 😆", "Cười gì đó, kể Lomi cười chung với 😄", "😆😆"]);
    default:
      return pick(["👍😄", "Lomi thấy rồi nha 😊", "Hehe 🤭"]);
  }
}

export type UCtx = {
  lastText?: string; // câu Lomi vừa nói
  faqId?: string; // Lomi vừa trả lời câu hỏi thường gặp này
  issue?: string; // Lomi vừa hỏi thêm về lỗi app (lag/crash/blank/login/find/generic)
  lastUser?: string; // câu người dùng nói trước đó
};
export type UReply = ChatReply & { issue?: string; intent: string };

const has = (n: string, re: RegExp) => re.test(` ${n} `);
const words = (n: string) => (n ? n.split(" ").length : 0);

// ── Báo lỗi app ──
const APP_REF = /\b(app|ung dung|trang|web|man hinh|cai nay|no|he thong|lomi)\b/;
const ISSUE: [string, RegExp][] = [
  ["crash", /\b(bi vang|vang ra|vang app|vang hoai|vang mat|tu vang|vang hoai luon|tu thoat|tu tat|tu dong tat|thoat ra|crash|out ra|dang xai thi tat)\b/],
  ["blank", /\b(trang tron|man hinh trang|trang xoa|trang bach|den thui|man hinh den|khong hien gi|khong hien thi gi|trong tron|khong co gi het|khong thay gi het)\b/],
  ["lag", /\b(lag|giat lag|bi giat|giat qua|bi do|(?<!thai )do qua|(?<!thai )do luon|do man hinh|dung hinh|treo|bi treo|cham qua|cham ri|cham the|cham vay|load lau|load mai|load hoai|xoay hoai|xoay mai|quay hoai|quay mai|loading mai|khong load|khong len|mai khong len|load khong len)\b/],
  ["login", /\b(khong vao duoc|vao khong duoc|khong dang nhap duoc|dang nhap khong duoc|khong login duoc|bi da ra|bi out|bi dang xuat)\b/],
  ["generic", /\b(bi gi|bi sao|bi loi|loi roi|loi gi|bao loi|hien loi|bug|hu roi|hu ha|khong chay|khong hoat dong|khong dung duoc|xai khong duoc|dung khong duoc|khong bam duoc|bam khong duoc|bam khong an|khong gui duoc|gui khong duoc|khong tai duoc|khong mo duoc|mo khong duoc|khong luu duoc|luu khong duoc|bi offline|hien offline|bao offline|mat mang|mat ket noi|khong co mang)\b|\bkhong (gui|tai|mo|luu|bam|load|xem|nghe|goi|dang|up|doi|chon|tim|thay doi|cap nhat|cai)\b.{0,30}\bduoc\b/],
];
const ISSUE_TIP: Record<string, string> = {
  crash: "App tự văng ra hả 😥",
  blank: "Màn hình trắng trơn hả 😥",
  lag: "App đang chậm / đơ hả 😥",
  login: "Không vào được app hả 😥",
  generic: "App đang trục trặc hả 😥",
};
function issueSteps(kind: string): string {
  const base = [
    "1. Vuốt tắt hẳn app rồi mở lại",
    "2. Kiểm tra mạng — đổi qua lại wifi ↔ 4G thử",
    kind === "login"
      ? "3. Chắc chắn gõ đúng tên đăng nhập; quên mật khẩu thì bấm “Quên mật khẩu” ở màn đăng nhập"
      : "3. Vẫn bị thì xoá app ngoài màn hình chính rồi cài lại từ liendoanh.world (dữ liệu không mất đâu)",
  ];
  return base.join("\n");
}

/** Câu mở đầu nhắc lại đúng việc người dùng đang kẹt ("Không gửi tin nhắn được hả") — cho thấy Lomi hiểu. */
function issueHead(q: string, kind: string): string {
  const m = q.match(/(?:^|\s)(?:không|ko|k|hông|chẳng|chả) ((?:\p{L}+ ){0,4}?\p{L}+) được/iu);
  if (kind === "generic" && m && m[1].split(" ").length <= 5) return `Không ${m[1].toLowerCase()} được hả 😥`;
  return ISSUE_TIP[kind];
}

function detectIssue(n: string): string | null {
  for (const [k, re] of ISSUE) if (has(n, re)) return k;
  return null;
}

// Trả lời tiếp khi Lomi vừa hỏi "đang ở màn nào, Android hay iPhone".
const DEVICE = /\b(android|samsung|oppo|xiaomi|redmi|vivo|realme|huawei|nokia|iphone|ios|ip|ipad|may tinh|laptop|pc|chrome|safari|zalo|facebook|fb)\b/;
const SCREEN: [RegExp, string][] = [
  [/\b(uu dai|ma uu dai|nhan ma)\b/, "Ưu đãi"],
  [/\b(quet|ket noi)\b/, "Quẹt"],
  [/\b(tin nhan|chat|nhan tin|goi)\b/, "Tin nhắn"],
  [/\b(cong dong)\b/, "Cộng đồng"],
  [/\b(ho so|trang ca nhan|anh dai dien)\b/, "Hồ sơ"],
  [/\b(dua don|dat xe|giao hang|tai xe)\b/, "Đưa đón"],
  [/\b(kham pha|tim quan|ban do)\b/, "Khám phá"],
  [/\b(thong bao)\b/, "Thông báo"],
  [/\b(dang nhap|dang ky)\b/, "Đăng nhập"],
  [/\b(trang chu)\b/, "Trang chủ"],
  [/\b(lomi|tro ly)\b/, "Trợ lý Lomi"],
];

const DEV_NAME: Record<string, string> = { android: "Android", samsung: "Samsung", oppo: "OPPO", xiaomi: "Xiaomi", redmi: "Redmi", vivo: "vivo", realme: "realme", huawei: "Huawei", nokia: "Nokia", iphone: "iPhone", ios: "iPhone", ip: "iPhone", ipad: "iPad", "may tinh": "máy tính", laptop: "laptop", pc: "máy tính", chrome: "Chrome", safari: "Safari", zalo: "Zalo", facebook: "Facebook", fb: "Facebook" };
const devName = (d: string) => DEV_NAME[d] ?? d;

// ── Mở lời, chưa vào việc ("cho tui hỏi cái này vs", "giúp mình với", "help") ──
const OPENER =
  /^(e |oi |lomi oi |lomi |ad oi |bro |ban oi |em oi |anh oi |chi oi )?(cho (tui|toi|minh|em|anh|chi|tao|t|to) hoi( (cai nay|cai|chut|xiu|ti|ty|chut xiu|ti xiu|mot chut|mot cau|cau nay|nay))?|hoi (chut|xiu|ti|cai nay|cai|mot chut|cai ne)|minh hoi (chut|xiu|cai nay|cai)|giup (minh|toi|tui|em|anh|chi|tao|t|to)?( voi| cai| chut| xiu| di)?|giup voi|giup|help( me)?|cuu (minh|toi|tui|em|voi)|cuu|co viec nho|nho ti|nho chut|nho xiu)( (voi|vs|nha|nhe|ne|di|lomi|duoc khong|dc khong|khong|a|nhen|cai))*$/;

// ── Câu cụt / tham chiếu mơ hồ ──
const VAGUE =
  /^(e |oi |ua |bro |lomi )?(cai nay|cai do|cai kia|cai nay sao|cai do sao|cai nay la sao|cai nay la gi|vay sao|sao vay|sao ta|sao the|sao the nhi|sao z|roi sao|roi sao nua|roi sao do|con cai kia|con cai nay|con gi nua|o dau|o dau vay|dau vay|dau|dau roi|sao khong co|sao khong thay|sao khong duoc|lam sao|lam sao ta|lam sao day|lam sao vay|lam the nao|the nao|ra sao|gi vay|gi day|gi the|gi z|la sao|la gi|ua|ua sao|ua gi|ua la sao|ha|hm|hmm|vay la sao|nghia la sao|y la sao|cai nay lam sao|cai nay bi gi|cai nay bi sao|sao|sao ma|ui|uii|au|oa|wow|oi|ui da|oi troi oi)( (vay|z|day|ta|nhi|nha|a|lomi|ban|troi|ha|vay ta|the))*$/;

// ── Không tìm thấy nút / chỗ ──
const NOT_FOUND =
  /\b(khong thay (nut|cho|muc|cai|o|nut do|phan|tab|dau)|khong tim thay|tim khong ra|tim hoai khong thay|kiem khong ra|khong kiem thay|khong thay dau|nut (do|nay|kia|.{0,20}) (o dau|dau)|cho nao de|bam vao dau|bam o dau|nhan vao dau|vao dau de|o dau de)\b/;

// ── Chưa hiểu câu Lomi vừa nói ──
const CONFUSED =
  /\b(khong hieu (gi|cho nay|lam|lam luon|gi het|gi luon|y|cho do|nha|a|ban noi gi|lomi noi gi)|kho hieu|chua hieu|hieu chet lien|noi gi vay|noi gi z|noi gi the|noi gi zay|la sao ta|rối|roi qua|lu qua|lu luon|khong hieu)\b/;

/**
 * Ý định của câu (chạy SAU chitChat, TRƯỚC câu hỏi thường gặp). Trả null để luồng cũ xử lý tiếp.
 * faqHit = id câu hỏi thường gặp khớp với câu này (nếu có) — để không giành câu FAQ trả lời đúng hơn.
 */
export function understand(q: string, raw: string, ctx: UCtx, faqHit?: string): UReply | null {
  const n = normalizeVi(q);
  const tn = tone(raw);
  const w = words(n);
  const soft = tn === "sad" ? "Ui đừng buồn nha 🥲 " : tn === "mad" ? "Bình tĩnh nha, để Lomi gỡ cùng bạn 💪 " : tn === "laugh" ? "Hihi " : "";

  // 0) Lomi vừa hỏi thêm về lỗi → câu này là thông tin bổ sung (máy, màn hình).
  if (ctx.issue && ctx.issue !== "find" && w <= 14) {
    const dev = n.match(DEVICE)?.[0];
    const scr = SCREEN.find(([re]) => has(n, re))?.[1];
    if (dev || scr) {
      const ios = dev && /iphone|ios|ip|ipad|safari/.test(dev);
      const tip = ios
        ? "Trên iPhone, app chạy qua Safari: vào Cài đặt → Safari → Xoá lịch sử và dữ liệu trang web, rồi mở lại app nha (tài khoản vẫn còn, chỉ cần đăng nhập lại)."
        : dev && /may tinh|laptop|pc|chrome/.test(dev)
          ? "Trên máy tính thì bấm Ctrl + Shift + R để tải lại hẳn trang nha."
          : dev
            ? "Trên Android: giữ icon app → Thông tin ứng dụng → Bộ nhớ → Xoá bộ nhớ đệm (cache), rồi mở lại nha. Nhớ tắt chế độ tiết kiệm pin cho app luôn."
            : "";
      return {
        intent: "issue_detail",
        issue: ctx.issue,
        text:
          `Okie, Lomi ghi nhận rồi nè 📝${scr || dev ? ` (${[scr && `mục ${scr}`, dev && devName(dev)].filter(Boolean).join(", ")})` : ""}` +
          (tip ? `\n\n${tip}` : "") +
          "\n\nNếu vẫn chưa được, bạn bấm ⁉️ dưới câu này để gửi ban quản trị, hoặc nhắn trực tiếp ở Hồ sơ → ⋯ → Trợ giúp & Liên hệ nha — kể giống vừa kể với Lomi là admin hiểu liền 💚",
      };
    }
  }

  // 0b) "ib mình nha" — muốn Lomi nhắn riêng.
  if (/^(nhan tin|ib|inbox) (minh|toi|tui|em|anh|chi|t|tao|to)( (nha|nhe|di|voi|lien|nhen|lomi))*$/.test(n))
    return {
      intent: "ib",
      text: "Lomi chỉ nói chuyện được ở đây thôi nè 😄 Bạn cứ nhắn ngay khung này là Lomi trả lời liền. Còn muốn nhắn riêng với người khác thì vào Tin nhắn (/tin-nhan) nha!",
    };
  // 0c) "m đi đâu z", "lomi ở đâu" — hỏi Lomi đi đâu.
  if (/^((may|lomi|ban|em|ong|ba|bro) )?(di dau|o dau|dau roi|di dau roi|di dau vay|dang o dau|tron dau)( (vay|z|roi|the|ta|ha|nay|lomi))*$/.test(n) && /^(may|lomi|ban|em|ong|ba|bro|di dau|dang o dau|tron dau)/.test(n))
    return { intent: "where_lomi", text: pick(["Lomi ở đây suốt nè, có đi đâu đâu 😆 Gọi là có mặt liền!", "Lomi “sống” trong app luôn á 🤖 Bạn cần gì nè?"]) };
  // 0d) Hướng dẫn dùng app chung chung.
  if (/\b(huong dan|chi|chi cach|day) (dung|su dung|xai|choi) (app|ung dung)\b|^(app|ung dung)( nay)? (dung|xai|su dung) (sao|the nao|nhu nao|ra sao)/.test(n))
    return {
      intent: "guide",
      text: "Có trang Hướng dẫn (/huong-dan) chỉ từng phần của app luôn nè 📖 Hoặc bạn hỏi Lomi từng việc cụ thể kiểu “nhận ưu đãi sao”, “quẹt là gì”, “đặt xe thế nào” là Lomi chỉ liền!",
      quick: ["Làm sao để nhận ưu đãi?", "Quẹt là gì, dùng thế nào?"],
    };
  // 0e) Phàn nàn quán / nhân viên (trước báo lỗi app: "thái độ" bỏ dấu có chữ "đơ").
  if (/\b(nhan vien|quan|cua hang|shop|chu quan|tiem)\b.*\b(thai do|chui|lua|lua dao|khong giu|khong nhan|te qua|do qua|chan qua|bat nat|lam gia|khong dung|mat lich su|hach)\b/.test(n))
    return {
      intent: "biz_complaint",
      text:
        "Nghe bực thiệt 😤 Bạn có thể viết đánh giá cho quán đó (vào trang quán → Đánh giá) để mọi người biết, hoặc bấm ⋯ → Báo cáo nếu quán làm sai — ban quản trị sẽ xem và xử lý nha.",
      quick: ["Quán không giữ đúng ưu đãi thì sao?", "Báo cáo nội dung hoặc người dùng thế nào?"],
    };

  // 0f) (01/10 r3, theo tài liệu Kir) Câu Việt chen từ tiếng Anh / viết tắt — hiểu theo Ý, không bắt viết lại.
  // Rủ Lomi làm gì đó ("tối nay chơi game không?", "đi cà phê hong", "xem phim đi") — không có "ai" (đó là tìm bạn, mục 6).
  const invite = n.match(/^((toi nay|chieu nay|sang nay|trua nay|mai|toi mai|cuoi tuan|nay|gio|lat nua|di|e|oi|lomi|em|ban|bro|ui) )*(choi game|choi|lam van game|lam tran|di cafe|di ca phe|uong ca phe|uong cafe|di an|di choi|di nhau|nhau|di dao|xem phim|di phuot|di da lat|hat karaoke|di hat|da banh|chay bo|tam su|nc|noi chuyen)( (khong|hong|ko|k|chu|nha|nhe|di|hok|ha|voi|voi minh|voi tui|cung minh|chung|khum|ne|lomi|em|ban|bro|ta|nao|ko ta))*$/);
  if (invite && !/\b(ai|co ai)\b/.test(n) && w <= 10) {
    const act = invite[3];
    const game = /game|van|tran/.test(act) || act === "choi";
    const coffee = /ca ?phe|cafe/.test(act);
    const talk = /tam su|nc|noi chuyen/.test(act);
    if (talk) return { intent: "invite_talk", text: pick(["Okie, Lomi rảnh nè 😄 Kể Lomi nghe đi!", "Chịu luôn 🙌 Bạn muốn nói chuyện gì nè?"]) };
    return {
      intent: "invite",
      text: game
        ? pick([
            "Lomi muốn lắm mà không có tay cầm điện thoại 😆 Bạn kiếm đồng đội ở Quẹt → Game (/quet) nha, nhiều người đang tìm bạn chơi chung lắm!",
            "Game hả, nghe cuốn ghê 🎮 Lomi thì chỉ ngồi cổ vũ được thôi 🤭 Muốn tìm người chơi chung thì vào Quẹt → Game (/quet) nha.",
          ])
        : coffee
          ? pick([
              "Lomi mà uống cà phê chắc chập mạch luôn 😆☕ Nhưng Lomi tìm quán cho bạn được nè!",
              "Ui Lomi thèm mà hông uống được 🥲 Để Lomi kiếm quán cà phê xinh cho bạn nha ☕",
            ])
          : pick([
              "Lomi chỉ ở trong app thôi nè 😆 Nhưng nghe vui ghê, đi đâu kể Lomi nghe với!",
              "Hihi Lomi đi không được rồi 🙈 Muốn rủ bạn đi cùng thì đăng ở Cộng đồng (/cong-dong) hoặc Quẹt → Làm quen (/quet) nha!",
            ]),
      quick: coffee ? ["Tìm quán cà phê gần đây"] : undefined,
    };
  }
  // Xin thông tin / link chung chung ("cho mình xin info", "cho mình link với").
  if (/^((cho|gui|xin|send) )?(minh|toi|tui|em|anh|chi|t|tao|to|minh xin|toi xin|tui xin|em xin|xin)? ?(xin )?(info|infor|thong tin|link|lien ket)( (voi|di|nha|nhe|duoc khong|dc khong|khong|ne|lomi|ban|em|app|cua app|app nay|cai))*$/.test(n) && /\b(info|infor|thong tin|link|lien ket)\b/.test(n)) {
    if (/\b(link|lien ket)\b/.test(n))
      return {
        intent: "ask_link",
        text: "Link app nè: liendoanh.world 🌐 Gửi bạn bè mở bằng trình duyệt trên điện thoại, rồi bấm “Thêm vào màn hình chính” là xài như app luôn. Còn bạn cần link của chỗ nào khác thì nói Lomi nha!",
      };
    return { intent: "ask_info", text: "Bạn cần thông tin về gì nè? 😊 Một quán / doanh nghiệp, ưu đãi, hay về app Liên Minh Liên Doanh? Nói Lomi nghe là có liền." };
  }
  // "để mình check", "mình check thử" — người dùng tự đi kiểm tra; "check giúp mình cái này" — nhờ Lomi xem.
  if (/^(de |cho )?(minh|toi|tui|em|anh|chi|t|tao|to)?( de)? ?(check|kiem tra|coi|xem) (thu|lai|cai|da|xiu|chut|ti|sau)( (nha|nhe|da|di|cai|xiu|chut|ti|roi bao|nghe))*$|^(de |cho )(minh|toi|tui|em|anh|chi|t|tao|to) (check|kiem tra|coi lai|xem lai)( (nha|nhe|da|thu|cai|xiu|chut|ti))*$/.test(n))
    return { intent: "user_check", text: pick(["Okie, bạn check đi nha, có gì cứ hỏi Lomi 😊", "Dạ, bạn xem thử nha. Kẹt chỗ nào thì nói Lomi liền 👌"]) };
  if (/^(check|kiem tra|coi|xem) (giup|ho|dum|giùm|gium) ?(minh|toi|tui|em|anh|chi|t|to)?( (cai nay|cai|chut|xiu|voi|vs|nha|nhe|di|ti))*$/.test(n))
    return { intent: "opener", text: pick(["Dạ, bạn muốn Lomi xem cái gì nè? Kể hoặc dán vào đây nha 👀", "Okie, cái gì vậy bạn? Nói Lomi nghe thử nha 👀"]) };
  // Một từ + dấu hỏi ("game?", "app?", "link?", "info?", "cà phê?", "còn không?") — hiểu theo câu trước nếu có,
  // không đủ ngữ cảnh thì hỏi lại MỘT câu ngắn (không bắt viết thành câu hoàn chỉnh).
  if (w <= 3 && !ctx.faqId) {
    const prev = normalizeVi(ctx.lastText ?? "");
    if (/^(game|choi game)( (a|ha|ne|sao))?$/.test(n))
      return { intent: "short_game", text: /quet|game/.test(prev) ? "Ừa, Game nằm trong Quẹt (/quet) nè 🎮 Chọn thẻ Game là thấy người tìm bạn chơi chung, hoặc mua bán đồ game." : "Game hả 🎮 Bạn muốn tìm bạn chơi chung (Quẹt → Game, /quet) hay đang hỏi chuyện gì khác về game nè?" };
    if (/^(app|ung dung)( (a|ha|ne|sao|nay))?$/.test(n))
      return { intent: "short_app", text: "Bạn muốn hỏi gì về app nè? 📱 Cứ nói tự nhiên kiểu “nhận ưu đãi sao”, “đặt xe ở đâu” là Lomi chỉ liền." };
    if (/^(link|lien ket)( (a|ha|ne|dau|app))?$/.test(n))
      return { intent: "ask_link", text: "Link app nè: liendoanh.world 🌐 Còn bạn cần link chỗ khác thì nói Lomi nha!" };
    if (/^(info|infor|thong tin)( (a|ha|ne|gi))?$/.test(n))
      return { intent: "ask_info", text: "Thông tin về gì nè bạn? Quán nào, ưu đãi, hay về app? 😊" };
    if (/^(ca phe|cafe)( (a|ha|ne|khong|hong|ko|k|di|nha))?$/.test(n))
      return /quan|uong|ca phe|cafe|an gi/.test(prev)
        ? { intent: "short_coffee", text: "Cà phê nha ☕ Bấm bên dưới Lomi tìm quán cà phê cho bạn liền!", quick: ["Tìm quán cà phê gần đây"] }
        : { intent: "short_coffee", text: "Cà phê hả ☕ Bạn muốn rủ đi uống hay cần Lomi tìm quán nè?", quick: ["Tìm quán cà phê gần đây"] };
    if (/^(con khong|con hong|con ko|con k|het chua|het roi a|con han khong)( (vay|z|ban|lomi|a|ha))?$/.test(n))
      return { intent: "vague", text: prev ? "Bạn hỏi còn cái nào nè? Nói Lomi tên quán / ưu đãi đó nha 👀" : "Còn gì nè bạn? 👀 Nói Lomi thêm chút xíu là hiểu liền." };
  }

  // 1) Mở lời: "ê cho tui hỏi cái này vs", "giúp mình với" → mời nói tiếp, không đoán bừa.
  if (OPENER.test(n))
    return {
      intent: "opener",
      text: pick(["Dạ, bạn hỏi đi nè 😄 Lomi nghe đây.", "Có Lomi đây 🙋 Bạn cứ nói tự nhiên nha.", "Okie, chuyện gì nè? Lomi sẵn sàng rồi 👂", "Hỏi thoải mái luôn nha 😊"]),
    };

  // 2) Báo lỗi app — ý định trước, tone sau (":))" vẫn có thể là lỗi thật).
  const PROBLEM_FAQ = new Set(["notifmissing", "update", "logout", "offerlocked", "approve", "forgot", "forgotnoemail", "bizstatus"]);
  const kind = detectIssue(n);
  if (kind && !(faqHit && PROBLEM_FAQ.has(faqHit)) && (has(n, APP_REF) || w <= 7)) {
    return {
      intent: "issue",
      issue: kind,
      text:
        `${soft}${issueHead(q, kind)} Bạn thử nhanh mấy bước này nha:\n${issueSteps(kind)}\n\n` +
        "Vẫn bị thì nói Lomi biết bạn đang ở mục nào và dùng Android hay iPhone nhé 🙏",
    };
  }

  // 3) Không tìm thấy nút / chỗ.
  if (has(n, NOT_FOUND) && !faqHit) {
    const prev = ctx.lastText && /bấm|nút|vào|mục|chọn/i.test(ctx.lastText);
    return {
      intent: "notfound",
      issue: "find",
      text: prev
        ? pick([
            "Chỗ đó khó thấy thiệt ha 😅 Bạn đang đứng ở màn nào vậy? Nói Lomi nghe để Lomi chỉ đường từ chỗ bạn đang đứng nha 🧭",
            "Không thấy hả 🤔 Có thể app chưa cập nhật bản mới — vuốt tắt hẳn app rồi mở lại thử nha. Vẫn không thấy thì nói Lomi biết bạn đang ở mục nào nhé!",
          ])
        : "Bạn đang tìm nút gì nè? 🧭 Nói Lomi việc muốn làm (vd “nhận ưu đãi”, “đổi ảnh đại diện”, “tạo nhóm chat”) là Lomi chỉ đường liền!",
    };
  }

  // 4) Chưa hiểu câu Lomi vừa nói.
  if (has(n, CONFUSED) && w <= 10 && !faqHit) {
    return {
      intent: "confused",
      text: ctx.lastText
        ? pick([
            "Ui, chắc Lomi nói hơi rối 😅 Bạn chưa rõ đoạn nào nè? Chỉ Lomi chỗ đó, Lomi giải thích lại gọn hơn nha.",
            "Lomi xin lỗi nha 🙏 Bạn kẹt ở bước nào? Nói Lomi nghe, mình đi từng bước một.",
          ])
        : "Chỗ nào chưa hiểu nè? 🤔 Bạn nói Lomi nghe đang muốn làm gì, Lomi chỉ từ từ cho nha.",
    };
  }

  // 5) Câu cụt / tham chiếu mơ hồ ("cái này?", "rồi sao", "ở đâu vậy", "ủa?").
  //    Có ngữ cảnh câu hỏi về app → để phần câu hỏi nối xử lý; không có → hỏi lại 1 câu ngắn.
  if (w <= 6 && VAGUE.test(n) && !ctx.faqId) {
    if (/^(ua|ha|hm|hmm|e|ui|uii|au|oa|wow|oi)( |$)/.test(n) && w <= 2)
      return { intent: "vague", text: pick(["Sao vậy nè? 😯", "Ủa gì vậy bạn? 😄", "Hửm, có gì hả? 👀"]) };
    return {
      intent: "vague",
      text: ctx.lastText
        ? pick([
            "Bạn đang nói tới cái nào nè? Nói Lomi thêm chút xíu nha 😄",
            "Hmm, “cái này” là cái gì vậy bạn? 👀 Kể Lomi nghe thêm chút nha.",
          ])
        : pick([
            "Cái nào nè? 👀 Nói Lomi thêm chút xíu là Lomi hiểu liền!",
            "Bạn đang hỏi về chuyện gì vậy? Kể Lomi nghe thêm chút nha 😄",
          ]),
    };
  }

  // 6) Rủ đi đâu / tìm bạn đi cùng ("có ai đi đà lạt hong", "ai đi cafe không").
  if (/\b(co ai|ai|ai do|co nguoi nao|ai ranh)\b.*\b(di|choi|an|uong|cafe|ca phe|nhau|du lich|phuot|chay bo|da banh|da bong|game|choi game|xem phim)\b/.test(n) && w <= 14)
    return {
      intent: "seek_company",
      text: pick([
        "Lomi thì chỉ ở trong app thôi nè 😆 Muốn tìm bạn đi cùng thì đăng lên Cộng đồng (/cong-dong) hoặc vào Quẹt (/quet) → Làm quen / Game, nhiều người quanh bạn đang tìm bạn y vậy đó!",
        "Nghe vui ghê 😄 Bạn thử đăng một tin ở Cộng đồng (/cong-dong) rủ mọi người, hoặc lướt Quẹt (/quet) tìm người cùng sở thích nha!",
      ]),
      quick: ["Cộng đồng dùng để làm gì?", "Quẹt là gì, dùng thế nào?"],
    };

  // 8) Cà khịa / gọi thân mật ("nay ông căng vậy", "m khùng hả", "cha nội").
  if (/^(nay )?(ong|ba|may|m|lomi|ban|bro|cha noi|ma|troi)?( nay)? ?(cang|gat|kho tinh|khung|dien|xao|lay loi|choi khum|lam lo|ba dao|lay)( (vay|the|z|ha|qua|ghe|ta|lam))*$/.test(n) ||
    /^(cha noi|ba noi|ong noi|ong oi|ba oi|bro oi|bro|ma oi|troi dat)( (oi|a|lomi|ha))*$/.test(n))
    return {
      intent: "banter",
      text: pick([
        "Đâu có căng đâu nè 😆 Lomi hiền khô à. Có gì nói Lomi nghe nè!",
        "Hihi Lomi bị oan á 🙈 Có chuyện gì vậy bạn?",
        "Lomi đây, Lomi đây 😄 Gọi chi đó?",
      ]),
    };

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNDERSTANDING GATE (01/10) — lớp hiểu nhẹ chạy TRƯỚC các module chuyên biệt (sức khoẻ, tarot, kinh doanh…)
// để tránh "module nào bắt được trước thì trả lời". Không gọi AI. Trả null = để luồng cũ xử lý như cũ.
//  • correction: "không phải…", "ý a là…", "không, a hỏi…" → bỏ ngữ cảnh cũ, hiểu phần sau như câu mới.
//  • reaction/filler: "ủa", "ok", "haha", "haiz"… → không cho vào module kiến thức (skip).
//  • follow-up / mơ hồ: "vậy sao?", "thế còn?", "cái này?", "tính sao?" → theo ngữ cảnh trước; không đủ → hỏi lại.
//  • tên đồ uống trống ("cà phê?") → không cho vào module sức khoẻ (skip, để understand() đáp).
// ─────────────────────────────────────────────────────────────────────────────
export type GateTopic = "tarot" | "health" | "biz" | "faq" | "heart" | "flow";
export type GateCtx = UCtx & { topic?: GateTopic };
export type Gate =
  | { action: "reply"; reply: UReply }
  | { action: "rewrite"; q: string } // câu sửa lại — dùng q mới, BỎ ngữ cảnh tin trước
  | { action: "skip"; intent: string }; // không cho module chuyên biệt bắt câu này

const PRON = "(?:a|anh|em|mình|tôi|tui|chị|t|tớ|tao|e|c)";
const CORR_RE = new RegExp(
  `^(?:(?:không phải|ko phải|k phải|hông phải|không|ko|hông|hong|k)(?:\\s+(?:đâu|mà|nha))?[\\s,.!]+)?` +
    `(?:ý\\s+${PRON}\\s+là|${PRON}\\s+(?:đang\\s+)?(?:hỏi|muốn hỏi|nói)(?:\\s+là)?|ý\\s+là)[\\s,:]*`,
  "iu",
);
const CORR_NEG_RE = /^(?:không phải|ko phải|k phải|hông phải)(?:\s+(?:đâu|vậy|thế|nha|mà))*[\s,.!]+/iu;
const OTHER_RE = /^(cai kia|cai khac|chuyen khac|cai do|y khac|cai truoc)( (nha|ma|a|do|ne))*$/;
const FILLER = /^(ua|ok|oke|okie|okay|oki|u|uh|um|uhm|uk|uhm|ui|ha|haha|hahaha|hihi|hehe|kk|kkk|troi|troi oi|troi dat|haiz|haizz|hmm|hm|a|o|oh|wow)$/;
const FOLLOW_TOK = new Set(["vay", "the", "con", "roi", "sao", "y", "la", "cai", "nay", "do", "kia", "tinh", "luon", "ha", "a", "nua", "thi", "gi", "z", "nhi", "ta", "nao", "ne", "sau"]);
const FOLLOW_HEAD = new Set(["vay", "the", "con", "roi", "y", "cai", "tinh"]);
const DRINK_ONLY = /^(ca phe|cafe|tra sua|tra|bia|ruou)( (a|ha|ne|khong|hong|ko|k|di|nha))?$/;

/** Câu có phải follow-up / mơ hồ ngắn ("vậy sao?", "còn cái này?", "tính luôn hả?") không. */
export function isShortFollowUp(q: string): boolean {
  const n = normalizeVi(q);
  const t = n ? n.split(" ") : [];
  return t.length > 0 && t.length <= 5 && t.every((x) => FOLLOW_TOK.has(x)) && t.some((x) => FOLLOW_HEAD.has(x));
}

/** Câu hỏi VỀ Tarot (luật bài), không phải xin bói: "tarot có bài ngược hả?", "tarot bao nhiêu lá". */
function tarotInfo(n: string): UReply | null {
  if (!/\b(tarot|la bai|bo bai)\b/.test(n)) return null;
  if (/\b(nguoc|xuoi|lat nguoc)\b/.test(n))
    return { intent: "tarot_info", text: "Có nè 🔮 Trong Tarot, lá rút ra bị lộn đầu gọi là **lá ngược**. Lomi tính cả lá ngược: mỗi lá có nghĩa xuôi và nghĩa ngược riêng — lá ngược thường là năng lượng bị chặn, chậm lại hoặc cần nhìn lại, chứ không phải lúc nào cũng xấu. Muốn rút thử một lá không?", quick: ["Bói một lá cho hôm nay"] };
  if (/\b(bao nhieu la|may la|78)\b/.test(n))
    return { intent: "tarot_info", text: "Bộ Tarot có **78 lá**: 22 lá Ẩn Chính và 56 lá Ẩn Phụ (4 chất Gậy, Cốc, Kiếm, Tiền) 🔮 Lomi trải 1, 3, 5 hoặc 10 lá tuỳ bạn nha.", quick: ["Bói một lá cho hôm nay"] };
  if (/\b(la gi|co that khong|co dung khong|co chinh xac khong|tin duoc khong)\b/.test(n))
    return { intent: "tarot_info", text: "Tarot là bộ 78 lá bài dùng để suy ngẫm, nhìn lại chuyện của mình từ góc khác 🔮 Lomi bói cho vui và để bạn có thêm góc nhìn thôi nha — quyết định quan trọng vẫn là ở bạn.", quick: ["Bói một lá cho hôm nay"] };
  return null;
}

/**
 * Chạy TRƯỚC module chuyên biệt. `correctionOnly` = chỉ xét câu sửa lại (gọi sớm, trước mọi mạch).
 * inFlow = đang ở một mạch có câu hỏi chờ (tâm sự, chọn món, chọn loại hình…) → không chặn filler/follow-up.
 */
export function gate(q: string, ctx: GateCtx & { inFlow?: boolean }, correctionOnly = false): Gate | null {
  const n = normalizeVi(q);
  const lastAsked = /\?\s*$|\?[^?]{0,12}$/.test(ctx.lastText ?? "");

  // 1) Sửa lại / bác câu trước.
  const m = q.match(CORR_RE) ?? q.match(CORR_NEG_RE);
  if (m && m[0].trim()) {
    const rest = q.slice(m[0].length).trim();
    const rn = normalizeVi(rest);
    if (!rn || OTHER_RE.test(rn) || FILLER.test(rn))
      return { action: "reply", reply: { intent: "correction", text: "Dạ, chắc Lomi hiểu nhầm rồi 🙏 Bạn muốn hỏi chuyện gì nè? Nói Lomi thêm chút xíu nha." } };
    return { action: "rewrite", q: rest };
  }
  // "không" / "không phải" đứng một mình, mà Lomi không vừa hỏi gì → bạn đang bác câu trả lời.
  if (/^(khong|ko|k|hong|khong phai|ko phai|khong dung|sai roi|khong phai vay)( (ma|dau|nha|lomi|a))*$/.test(n) && !lastAsked && !ctx.inFlow && ctx.lastText)
    return { action: "reply", reply: { intent: "correction", text: "Dạ, chắc Lomi hiểu nhầm rồi 🙏 Bạn muốn hỏi chuyện gì nè? Nói Lomi thêm chút xíu nha." } };
  if (correctionOnly) return null;

  // 2) Hỏi về luật Tarot → trả lời kiến thức Tarot (không rút bài với câu hỏi "có bài ngược hả?").
  const ti = tarotInfo(n);
  if (ti) return { action: "reply", reply: ti };

  if (ctx.inFlow) return null;

  // 3) Tiếng cảm thán / phản ứng → không vào module kiến thức.
  if (FILLER.test(n)) return { action: "skip", intent: "filler" };

  // 4) Chỉ có tên đồ uống ("cà phê?") → không phải câu hỏi sức khoẻ.
  if (DRINK_ONLY.test(n)) return { action: "skip", intent: "drink_only" };

  // 5) Follow-up / mơ hồ ngắn.
  if (isShortFollowUp(q)) {
    const topic = ctx.topic ?? (/tarot|lá bài|trải bài|🔮/i.test(ctx.lastText ?? "") ? "tarot" : undefined);
    if (topic === "tarot") {
      if (/ngược/i.test(ctx.lastText ?? "") && /\b(tinh|tinh luon|co tinh)\b/.test(n))
        return { action: "reply", reply: { intent: "followup_tarot", text: "Dạ, tính luôn nha 🔮 Lá ngược vẫn được giải nghĩa — chỉ là đọc theo nghĩa ngược (chậm lại, bị chặn, cần nhìn lại) thay vì nghĩa xuôi.", quick: ["Bói một lá cho hôm nay"] } };
      return { action: "reply", reply: { intent: "followup_tarot", text: "Bạn hỏi tiếp về trải bài vừa rồi đúng không? 🔮 Bạn muốn Lomi giải kỹ lá nào, rút thêm lá, hay hỏi bài chuyện khác nè?", quick: ["Rút thêm một lá", "Bói lại"] } };
    }
    if (topic) return null; // sức khoẻ, tâm sự, kinh doanh, FAQ… → mạch hiện có tự hiểu theo ngữ cảnh.
    return { action: "skip", intent: "followup_nocontext" };
  }
  return null;
}

/** Câu trả lời khi Lomi chưa chắc hiểu — hỏi lại, không đoán bừa. */
export const GATE_ASK_BACK = "Lomi chưa chắc hiểu ý bạn 😅 Bạn nói rõ thêm chút được không — đang hỏi về app, một quán/ưu đãi, sức khoẻ hay bói bài nè?";
