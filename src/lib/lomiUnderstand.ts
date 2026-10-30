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
import { APP, normStrict } from "@/lib/lomiAccent";
import type { ChatReply } from "@/lib/lomiChat";
import { TAROT_SPREADS } from "@/lib/tarot";
import { VR, VN } from "@/lib/viMatch";

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
  if (VR(/(😭|🥲|😢|😞|😔|😥|😿|💔|:\(+|hu ?hu|(^|[^\p{L}])(h[iíì]c+|hix+|hức+)(?![\p{L}]))/u).test(s)) return "sad";
  if (/(😤|😡|🤬|🙄|😠|💢)/u.test(s)) return "mad";
  if (/(😳|😱|😮|😯|🫢|😧)/u.test(s)) return "shock";
  if (/(🥰|😍|❤️|❤|💕|💖|😘|🫶)/u.test(s)) return "love";
  if (VR(/(:\)+|=\)+|:d\b|xd\b|😂|🤣|😆|😁|😄|🤭|\bhaha|\bhihi|\bhehe|\bkk+)/u).test(s)) return "laugh";
  return "neutral";
}

/** Tín hiệu biểu cảm ở câu GỐC (độ nhấn KHÔNG bị mất khi đã đưa chữ về gốc để hiểu nghĩa):
 *  stretched = có chữ kéo dài ("chánnnn", "okkkk"); trail = "..." (do dự / miễn cưỡng / bất lực);
 *  bang = "!" (dứt khoát / hào hứng); repeatEmoji = 😭😭😭. Chỉ là TÍN HIỆU — luôn đọc cùng tone() và ngữ cảnh. */
export type Expr = { stretched: boolean; trail: boolean; bang: boolean; repeatEmoji: boolean; strong: boolean };
export function expressive(raw: string): Expr {
  const t = raw.normalize("NFC");
  const stretched = /(\p{L})\1{2,}/u.test(t.replace(VR(/\b(coffee|free|see|too|good|book|cool|all|off|kk+)\b/giu), "")) || /(\p{L}{2,})(\p{L})\2(?![\p{L}])/u.test(t.replace(VR(/\b(coffee|free|see|too|good|book|cool|all|off|will|kiss|miss|boss|pass|class)\b/giu), ""));
  const trail = /(\.{2,}|…)\s*$/u.test(t.replace(/[\p{Extended_Pictographic}\ufe0f\s]+$/u, ""));
  const bang = /!+\s*[\p{Extended_Pictographic}\ufe0f\s]*$/u.test(t);
  const repeatEmoji = /(\p{Extended_Pictographic})\ufe0f?\s*\1/u.test(t);
  return { stretched, trail, bang, repeatEmoji, strong: stretched || repeatEmoji };
}

/** Trả lời khi người dùng CHỈ gửi emoji — đọc đúng cảm xúc thay vì đáp một kiểu. */
export function emojiOnlyReply(raw: string): string | null {
  const t = raw.trim();
  if (!t || !/^[\p{Extended_Pictographic}‍️\s]+$/u.test(t)) return null;
  // 22/10: mặt ốm / mệt / lo — trước đây "🤒" nhận "👍😄".
  if (/(🤒|🤕|🤧|😷|🤢|🤮|🥵|🥶|😵)/u.test(t)) return pick(["Ơ bạn đang mệt / ốm hả 🥺 Bị sao vậy — sốt, đau đầu hay đau ở đâu? Kể Lomi nghe nha."]);
  if (/(😰|😨|😟|😧|😣|😖)/u.test(t)) return pick(["Có chuyện gì làm bạn lo vậy nè 😟 Kể Lomi nghe nha."]);
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
const APP_REF = VN(/\b(app|ứng dụng|trang|web|màn hình|cái này|nó|hệ thống|lomi)\b/);
const ISSUE: [string, RegExp][] = [
  ["crash", VN(/\b(bị văng|văng ra|văng app|văng hoài|văng mất|tự văng|văng hoài luôn|tự thoát|tự tắt|tự động tắt|thoát ra|crash|out ra|đang xài thì tắt)\b/)],
  ["blank", VN(/\b(trắng trơn|màn hình trắng|trắng xoá|trắng bạch|đen thui|màn hình đen|không hiện gì|không hiển thị gì|trống trơn|không có gì hết|không thấy gì hết)\b/)],
  ["lag", VN(/\b(lag|giật lag|bị giật|giật quá|bị đơ|(?<!thái )đơ quá|(?<!thái )đơ luôn|đơ màn hình|đứng hình|treo(?! cổ\b)|bị treo(?! cổ\b)|chậm quá|chậm rì|chậm thế|chậm vậy|load lâu|load mãi|load hoài|xoay hoài|xoay mãi|quay hoài|quay mãi|loading mãi|không load|không lên|mãi không lên|load không lên)\b/)],
  ["login", VN(/\b(không vào được|vào không được|không đăng nhập được|đăng nhập không được|không login được|bị đá ra|bị out|bị đăng xuất)\b/)],
  ["generic", VN(/\b(bị gì|bị sao|bị lỗi|lỗi rồi|lỗi gì|báo lỗi|hiện lỗi|bug|hư rồi|hư hả|không chạy|không hoạt động|không dùng được|xài không được|dùng không được|không bấm được|bấm không được|bấm không ăn|không gửi được|gửi không được|không tải được|không mở được|mở không được|không lưu được|lưu không được|bị offline|hiện offline|báo offline|mất mạng|mất kết nối|không có mạng)\b|\bkhông (gửi|tải|mở|lưu|bấm|load|xem|nghe|gọi|đăng|up|đổi|chọn|tìm|thay đổi|cập nhật|cài)\b.{0,30}\bđược\b/)],
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
  const m = q.match(VR(/(?:^|\s)(?:không|ko|k|hông|chẳng|chả) ((?:\p{L}+ ){0,4}?\p{L}+) được/iu));
  if (kind === "generic" && m && m[1].split(" ").length <= 5) return `Không ${m[1].toLowerCase()} được hả 😥`;
  return ISSUE_TIP[kind];
}

function detectIssue(n: string): string | null {
  for (const [k, re] of ISSUE) if (has(n, re)) return k;
  return null;
}

// Trả lời tiếp khi Lomi vừa hỏi "đang ở màn nào, Android hay iPhone".
const DEVICE = VN(/\b(android|samsung|oppo|xiaomi|redmi|vivo|realme|huawei|nokia|iphone|ios|ip|ipad|máy tính|laptop|pc|chrome|safari|zalo|facebook|fb)\b/);
const SCREEN: [RegExp, string][] = [
  [VN(/\b(ưu đãi|mã ưu đãi|nhận mã)\b/), "Ưu đãi"],
  [VN(/\b(quẹt|kết nối)\b/), "Quẹt"],
  [VN(/\b(tin nhắn|chat|nhắn tin|gọi)\b/), "Tin nhắn"],
  [VN(/\b(cộng đồng)\b/), "Cộng đồng"],
  [VN(/\b(hồ sơ|trang cá nhân|ảnh đại diện)\b/), "Hồ sơ"],
  [VN(/\b(đưa đón|đặt xe|giao hàng|tài xế)\b/), "Đưa đón"],
  [VN(/\b(khám phá|tìm quán|bản đồ)\b/), "Khám phá"],
  [VN(/\b(thông báo)\b/), "Thông báo"],
  [VN(/\b(đăng nhập|đăng ký)\b/), "Đăng nhập"],
  [VN(/\b(trang chủ)\b/), "Trang chủ"],
  [VN(/\b(lomi|trợ lý)\b/), "Trợ lý Lomi"],
];

const DEV_NAME: Record<string, string> = { android: "Android", samsung: "Samsung", oppo: "OPPO", xiaomi: "Xiaomi", redmi: "Redmi", vivo: "vivo", realme: "realme", huawei: "Huawei", nokia: "Nokia", iphone: "iPhone", ios: "iPhone", ip: "iPhone", ipad: "iPad", "may tinh": "máy tính", laptop: "laptop", pc: "máy tính", chrome: "Chrome", safari: "Safari", zalo: "Zalo", facebook: "Facebook", fb: "Facebook" };
const devName = (d: string) => DEV_NAME[d] ?? d;

// ── Mở lời, chưa vào việc ("cho tui hỏi cái này vs", "giúp mình với", "help") ──
const OPENER =
  VN(/^(e |ơi |lomi ơi |lomi |ad ơi |bro |bạn ơi |em ơi |anh ơi |chị ơi )?(cho (tui|tôi|mình|em|anh|chị|tao|t|tớ) hỏi( (cái này|cái|chút|xíu|tí|ti|ty|chút xíu|tí xíu|một chút|một câu|câu này|này))?|hỏi (chút|xíu|tí|ti|cái này|cái|một chút|cái nè)|mình hỏi (chút|xíu|cái này|cái)|giúp (mình|tôi|tui|em|anh|chị|tao|t|tớ)?( với| cái| chút| xíu| đi)?|giúp với|giúp|help( me)?|cứu (mình|tôi|tui|em|với)|cứu|có việc nhờ|nhờ tí|nhờ chút|nhờ xíu)( (với|vs|nha|nhé|nhe|nè|đi|lomi|được không|đc không|không|à|ạ|a|nhen|cái))*$/);

// ── Câu cụt / tham chiếu mơ hồ ──
const VAGUE =
  VN(/^(e |ơi |ủa |bro |lomi )?(cái này|cái đó|cái kia|cái này sao|cái đó sao|cái này là sao|cái này là gì|vậy sao|sao vậy|sao ta|sao thế|sao thế nhỉ|sao z|rồi sao|rồi sao nữa|rồi sao đó|còn cái kia|còn cái này|còn gì nữa|ở đâu|ở đâu vậy|đâu vậy|đâu|đâu rồi|sao không có|sao không thấy|sao không được|làm sao|làm sao ta|làm sao đây|làm sao vậy|làm thế nào|thế nào|ra sao|gì vậy|gì đây|gì đấy|gì thế|gì z|là sao|là gì|ủa|ủa sao|ủa gì|ủa là sao|hả|ha|hm|hmm|vậy là sao|nghĩa là sao|ý là sao|cái này làm sao|cái này bị gì|cái này bị sao|sao|sao mà|ui|uii|áu|au|oa|oà|wow|ơi|ôi|ui da|ôi trời ơi)( (vậy|z|đây|đấy|dậy|ta|nhỉ|nha|à|ạ|a|lomi|bạn|trời|hả|ha|vậy ta|thế))*$/);

// ── Không tìm thấy nút / chỗ ──
const NOT_FOUND =
  VN(/\b(không thấy (nút|chỗ|mục|cái|ô|nút đó|phần|tab|đâu)|không tìm thấy|tìm không ra|tìm hoài không thấy|kiếm không ra|không kiếm thấy|không thấy đâu|nút (đó|này|kia|.{0,20}) (ở đâu|đâu)|chỗ nào để|bấm vào đâu|bấm ở đâu|nhấn vào đâu|vào đâu để|ở đâu để)\b/);

// ── Chưa hiểu câu Lomi vừa nói ──
const CONFUSED =
  VR(/\b(khong hieu (gi|cho nay|lam|lam luon|gi het|gi luon|y|cho do|nha|a|ban noi gi|lomi noi gi)|kho hieu|chua hieu|hieu chet lien|noi gi vay|noi gi z|noi gi the|noi gi zay|la sao ta|rối|roi qua|lu qua|lu luon|khong hieu)\b/);

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
      const ios = dev && VR(/iphone|ios|ip|ipad|safari/).test(dev);
      const tip = ios
        ? "Trên iPhone, app chạy qua Safari: vào Cài đặt → Safari → Xoá lịch sử và dữ liệu trang web, rồi mở lại app nha (tài khoản vẫn còn, chỉ cần đăng nhập lại)."
        : dev && VN(/máy tính|laptop|pc|chrome/).test(dev)
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
          "\n\nNếu vẫn chưa được, bạn nhắn trực tiếp ở Hồ sơ → ⋯ → Trợ giúp & Liên hệ nha — kể giống vừa kể với Lomi là admin hiểu liền 💚",
      };
    }
  }

  // 0b) "ib mình nha" — muốn Lomi nhắn riêng.
  if (VN(/^(nhắn tin|ib|inbox) (mình|tôi|tui|em|anh|chị|t|tao|tớ)( (nha|nhé|nhe|đi|với|liền|nhen|lomi))*$/).test(n))
    return {
      intent: "ib",
      text: "Lomi chỉ nói chuyện được ở đây thôi nè 😄 Bạn cứ nhắn ngay khung này là Lomi trả lời liền. Còn muốn nhắn riêng với người khác thì vào Tin nhắn (/tin-nhan) nha!",
    };
  // 0c) "m đi đâu z", "lomi ở đâu" — hỏi Lomi đi đâu.
  if (VN(/^((mày|lomi|bạn|em|ông|bà|bro) )?(đi đâu|ở đâu|đâu rồi|đi đâu rồi|đi đâu vậy|đang ở đâu|trốn đâu)( (vậy|z|rồi|thế|ta|hả|ha|này|nãy|nay|lomi))*$/).test(n) && VN(/^(mày|lomi|bạn|em|ông|bà|bro|đi đâu|đang ở đâu|trốn đâu)/).test(n))
    return { intent: "where_lomi", text: pick(["Lomi ở đây suốt nè, có đi đâu đâu 😆 Gọi là có mặt liền!", "Lomi “sống” trong app luôn á 🤖 Bạn cần gì nè?"]) };
  // 0d) Hướng dẫn dùng app chung chung.
  if (VN(/\b(hướng dẫn|chỉ|chỉ cách|dạy) (dùng|sử dụng|xài|chơi) (app|ứng dụng)\b|^(app|ứng dụng)( này)? (dùng|xài|sử dụng) (sao|thế nào|như nào|ra sao)/).test(n))
    return {
      intent: "guide",
      text: "Có trang Hướng dẫn (/huong-dan) chỉ từng phần của app luôn nè 📖 Hoặc bạn hỏi Lomi từng việc cụ thể kiểu “nhận ưu đãi sao”, “quẹt là gì”, “đặt xe thế nào” là Lomi chỉ liền!",
      quick: ["Làm sao để nhận ưu đãi?", "Quẹt là gì, dùng thế nào?"],
    };
  // 0e) Phàn nàn quán / nhân viên (trước báo lỗi app: "thái độ" bỏ dấu có chữ "đơ").
  if (VN(/\b(nhân viên|quán|cửa hàng|shop|chủ quán|tiệm)\b.*\b(thái độ|chửi|lừa|lừa đảo|không giữ|không nhận|tệ quá|dở quá|chán quá|bắt nạt|làm giá|không đúng|mất lịch sự|hách)\b/).test(n))
    return {
      intent: "biz_complaint",
      text:
        "Nghe bực thiệt 😤 Bạn có thể viết đánh giá cho quán đó (vào trang quán → Đánh giá) để mọi người biết, hoặc bấm ⋯ → Báo cáo nếu quán làm sai — ban quản trị sẽ xem và xử lý nha.",
      quick: ["Quán không giữ đúng ưu đãi thì sao?", "Báo cáo nội dung hoặc người dùng thế nào?"],
    };

  // 0f) (01/10 r3, theo tài liệu Kir) Câu Việt chen từ tiếng Anh / viết tắt — hiểu theo Ý, không bắt viết lại.
  // Rủ Lomi làm gì đó ("tối nay chơi game không?", "đi cà phê hong", "xem phim đi") — không có "ai" (đó là tìm bạn, mục 6).
  const invite = n.match(VN(/^((tối nay|chiều nay|sáng nay|trưa nay|mai|tối mai|cuối tuần|nay|giờ|lát nữa|đi|e|ơi|lomi|em|bạn|bro|ui) )*(chơi game|chơi|làm ván game|làm trận|đi cafe|đi cà phê|uống cà phê|uống cafe|đi ăn|đi chơi|đi nhậu|nhậu|đi dạo|xem phim|đi phượt|đi đà lạt|hát karaoke|đi hát|đá banh|chạy bộ|tâm sự|nc|nói chuyện)( (không|hông|hong|ko|k|chứ|chớ|nha|nhé|nhe|đi|hok|hả|ha|với|với mình|với tui|cùng mình|chung|khum|nè|lomi|em|e|bạn|bro|ta|nào|ko ta))*$/));
  if (invite && !VN(/\b(ai|có ai)\b/).test(n) && w <= 10) {
    const act = invite[3];
    const game = VN(/game|ván|trận/).test(act) || act === "choi";
    const coffee = VN(/cà ?phê|cafe/).test(act);
    const talk = VN(/tâm sự|nc|nói chuyện/).test(act);
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
  if (VN(/^((cho|gửi|xin|send) )?(mình|tôi|tui|em|anh|chị|t|tao|tớ|mình xin|tôi xin|tui xin|em xin|xin)? ?(xin )?(info|infor|thông tin|link|liên kết)( (với|đi|nha|nhé|nhe|được không|đc không|không|nè|lomi|bạn|em|app|của app|app này|cái))*$/).test(n) && VN(/\b(info|infor|thông tin|link|liên kết)\b/).test(n)) {
    if (VN(/\b(link|liên kết)\b/).test(n))
      return {
        intent: "ask_link",
        text: "Link app nè: liendoanh.world 🌐 Gửi bạn bè mở bằng trình duyệt trên điện thoại, rồi bấm “Thêm vào màn hình chính” là xài như app luôn. Còn bạn cần link của chỗ nào khác thì nói Lomi nha!",
      };
    return { intent: "ask_info", text: "Bạn cần thông tin về gì nè? 😊 Một quán / doanh nghiệp, ưu đãi, hay về app iLomi? Nói Lomi nghe là có liền." };
  }
  // "để mình check", "mình check thử" — người dùng tự đi kiểm tra; "check giúp mình cái này" — nhờ Lomi xem.
  if (VN(/^(để |cho )?(mình|tôi|tui|em|anh|chị|t|tao|tớ)?( để)? ?(check|kiểm tra|coi|xem) (thử|lại|cái|đã|xíu|chút|tí|ti|sau)( (nha|nhé|nhe|đã|đi|cái|xíu|chút|tí|ti|rồi báo|nghe))*$|^(để |cho )(mình|tôi|tui|em|anh|chị|t|tao|tớ) (check|kiểm tra|coi lại|xem lại)( (nha|nhé|nhe|đã|thử|cái|xíu|chút|tí|ti))*$/).test(n))
    return { intent: "user_check", text: pick(["Okie, bạn check đi nha, có gì cứ hỏi Lomi 😊", "Dạ, bạn xem thử nha. Kẹt chỗ nào thì nói Lomi liền 👌"]) };
  if (VR(/^(check|kiem tra|coi|xem) (giup|ho|dum|giùm|gium) ?(minh|toi|tui|em|anh|chi|t|to)?( (cai nay|cai|chut|xiu|voi|vs|nha|nhe|di|ti))*$/).test(n))
    return { intent: "opener", text: pick(["Dạ, bạn muốn Lomi xem cái gì nè? Kể hoặc dán vào đây nha 👀", "Okie, cái gì vậy bạn? Nói Lomi nghe thử nha 👀"]) };
  // Một từ + dấu hỏi ("game?", "app?", "link?", "info?", "cà phê?", "còn không?") — hiểu theo câu trước nếu có,
  // không đủ ngữ cảnh thì hỏi lại MỘT câu ngắn (không bắt viết thành câu hoàn chỉnh).
  if (w <= 3 && !ctx.faqId) {
    const prev = normalizeVi(ctx.lastText ?? "");
    if (VN(/^(game|chơi game)( (à|a|hả|ha|nè|sao))?$/).test(n))
      return { intent: "short_game", text: VN(/quẹt|game/).test(prev) ? "Ừa, Game nằm trong Quẹt (/quet) nè 🎮 Chọn thẻ Game là thấy người tìm bạn chơi chung, hoặc mua bán đồ game." : "Game hả 🎮 Bạn muốn tìm bạn chơi chung (Quẹt → Game, /quet) hay đang hỏi chuyện gì khác về game nè?" };
    if (VN(/^(app|ứng dụng)( (à|a|hả|ha|nè|sao|này))?$/).test(n))
      return { intent: "short_app", text: "Bạn muốn hỏi gì về app nè? 📱 Cứ nói tự nhiên kiểu “nhận ưu đãi sao”, “đặt xe ở đâu” là Lomi chỉ liền." };
    if (VN(/^(link|liên kết)( (à|a|hả|ha|nè|đâu|app))?$/).test(n))
      return { intent: "ask_link", text: "Link app nè: liendoanh.world 🌐 Còn bạn cần link chỗ khác thì nói Lomi nha!" };
    if (VN(/^(info|infor|thông tin)( (à|a|hả|ha|nè|gì))?$/).test(n))
      return { intent: "ask_info", text: "Thông tin về gì nè bạn? Quán nào, ưu đãi, hay về app? 😊" };
    if (VN(/^(cà phê|cafe)( (à|a|hả|ha|nè|không|hông|hong|ko|k|đi|nha))?$/).test(n))
      return VN(/quán|uống|cà phê|cafe|ăn gì/).test(prev)
        ? { intent: "short_coffee", text: "Cà phê nha ☕ Bấm bên dưới Lomi tìm quán cà phê cho bạn liền!", quick: ["Tìm quán cà phê gần đây"] }
        : { intent: "short_coffee", text: "Cà phê hả ☕ Bạn muốn rủ đi uống hay cần Lomi tìm quán nè?", quick: ["Tìm quán cà phê gần đây"] };
    if (VN(/^(còn không|còn hông|còn hong|còn ko|còn k|hết chưa|hết rồi à|hết rồi a|còn hạn không)( (vậy|z|bạn|lomi|à|a|hả|ha))?$/).test(n))
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
  // 10/10: "a bị trẹo cổ" bỏ dấu = "bi treo" → tưởng app bị treo. Chữ gõ CÓ DẤU khác nghĩa ("trẹo", "chân"…) bị che trước khi so (lib/lomiAccent APP).
  const kind = detectIssue(` ${normStrict(raw || q, APP)} `);
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
    const prev = ctx.lastText && VR(/bấm|nút|vào|mục|chọn/i).test(ctx.lastText);
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
    if (VN(/^(ủa|hả|ha|hm|hmm|e|ui|uii|áu|au|oa|oà|wow|ơi|ôi)( |$)/).test(n) && w <= 2)
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
  if (VN(/\b(có ai|ai|ai đó|có người nào|ai rảnh)\b.*\b(đi|chơi|ăn|uống|cafe|cà phê|nhậu|du lịch|phượt|chạy bộ|đá banh|đá bóng|game|chơi game|xem phim)\b/).test(n) && w <= 14)
    return {
      intent: "seek_company",
      text: pick([
        "Lomi thì chỉ ở trong app thôi nè 😆 Muốn tìm bạn đi cùng thì đăng lên Cộng đồng (/cong-dong) hoặc vào Quẹt (/quet) → Làm quen / Game, nhiều người quanh bạn đang tìm bạn y vậy đó!",
        "Nghe vui ghê 😄 Bạn thử đăng một tin ở Cộng đồng (/cong-dong) rủ mọi người, hoặc lướt Quẹt (/quet) tìm người cùng sở thích nha!",
      ]),
      quick: ["Cộng đồng dùng để làm gì?", "Quẹt là gì, dùng thế nào?"],
    };

  // 8) Cà khịa / gọi thân mật ("nay ông căng vậy", "m khùng hả", "cha nội").
  if (VN(/^(nay |này )?(ông|bà|mày|m|lomi|bạn|bro|cha nội|má|trời)?( này| nay)? ?(căng|gắt|khó tính|khùng|điên|xạo|lầy lội|chơi khum|làm lố|bá đạo|lầy)( (vậy|thế|z|hả|ha|quá|ghê|ta|lắm))*$/).test(n) ||
    VN(/^(cha nội|bà nội|ông nội|ông ơi|bà ơi|bro ơi|bro|má ơi|trời đất)( (ơi|à|a|lomi|hả|ha))*$/).test(n))
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
  | { action: "skip"; intent: string } // không cho module chuyên biệt bắt câu này
  | { action: "social"; reply: UReply; preferChit: boolean }; // giao tiếp cơ bản — preferChit: ưu tiên câu đáp sẵn của chitChat

// ── Giao tiếp cơ bản (02/10): chào, gọi Lomi, cảm ơn, tạm biệt, xác nhận, cảm thán, có/không, hỏi thăm ──
const TAIL = "( (e|em|lomi|ban|anh|chi|nha|nhe|nhen|ne|a|oi|ha|nhieu|lam|qua|roi|luon|vay|z|ta|ca nha|mn|moi nguoi|bro|cung|you))*$";
const SOCIAL: [string, RegExp, string[], boolean][] = [
  ["greeting", VR(new RegExp(`^(e |oi )?(chao|xin chao|hello|helo|hi|hey|alo|aloha|he lo|yo|chao buoi (sang|trua|chieu|toi)|buoi (sang|trua|chieu|toi)( vui ve| tot lanh)?|good (morning|afternoon|evening))${TAIL}`)), ["Chào bạn nè 👋 Hôm nay Lomi giúp gì được bạn?", "Hello 😄 Lomi đây, bạn cần gì nè?"], true],
  ["call", VR(new RegExp(`^(e |alo |oi )?(lomi|em|e)( oi)+${TAIL}|^(e|alo|oi|hey|hi) lomi${TAIL}|^(a|anh|chi|c|minh|tui|toi|em|e|t) (goi|keu) (lomi|em|e)${TAIL}`)), ["Dạ, Lomi nghe nè 🙋 Bạn cần gì nè?", "Có Lomi đây 😄 Bạn nói đi nha."], true],
  ["thanks", VR(new RegExp(`^(cam on|cam on nhieu|thanks|thank|thank you|thanks nhieu|tks|thx|camon|cmon|cam on nha)${TAIL}`)), ["Không có gì nè 😊 Cần gì cứ hỏi Lomi nha!", "Lomi vui vì giúp được bạn 💚"], true],
  ["goodbye", VR(new RegExp(`^(bye|bai|bye bye|bb|pp|tam biet|thoi nha|thoi nhe|thoi bye|thoi di ngu|ngu ngon|di ngu|di ngu day|off nha|out nha|hen gap lai|gap lai sau|(a|anh|em|e|minh|tui|toi|chi|c|t) (di|ngu|off|out|di ngu|di lam) (day|nha|nhe|roi|nhen|truoc))${TAIL}`)), ["Tạm biệt nha 👋 Cần gì cứ gọi Lomi!", "Okie, hẹn gặp lại bạn nha 💚"], true],
  ["smalltalk", VR(new RegExp(`^((lomi|em|e|ban) )?((hom nay|dao nay|nay) )?(sao roi|the nao roi|on khong|khoe khong|vui khong|ra sao|co do khong|con do khong|co o do khong|online khong|dang lam gi|lam gi do|ranh khong|co ranh khong|an com chua|ngu chua)${TAIL}`)), ["Lomi vẫn ở đây, khoẻ re nè 😄 Còn bạn hôm nay sao rồi?", "Có Lomi đây nè 🙋 Bạn kể Lomi nghe hôm nay thế nào đi!"], true],
  ["opener", VR(new RegExp(`^(cho )?(a|anh|chi|c|em|e|minh|tui|toi|t|to)( muon| can)? hoi( (cai nay|cai|chut|xiu|ti|cau nay|mot chut|mot cau|voi|vs|nha|nhe|ne|lomi|duoc khong|dc khong))*$`)), ["Dạ, bạn hỏi đi nè 😄 Lomi nghe đây.", "Hỏi thoải mái luôn nha 😊"], false],
  ["ack", VN(/^(ok|oke|okie|oki|okay|ok la|okela|ừ|u|uk|ừk|uh|ừh|um|ừm|uhm|ừhm|được|dc|đc|được rồi|ổn|ổn rồi|hay|hay đó|hay quá|hay ghê|good|nice|chuẩn|đúng rồi|vâng|dạ|dạ vâng)( (nha|nhé|nhe|e|em|lomi|nè|à|ạ|a|rồi|luôn|quá|ghê|vậy))*$/), ["Okie 😊", "Dạ 👌", "Hihi okie nè 😄"], true],
  ["reaction", VN(/^(ủa|ủa vậy|wow|oa|oà|ơi|ôi|ui|oh|ồ|ô|o|hah(?:a)+|hahah(?:a)+|hihi|hehe|k(?:k)+|h(?:m)+|trời|trời ơi|trời đất|hai(?:z)+|thật hả|thật ha|thật luôn|ghê vậy)( (vậy|ta|z|hả|ha|trời|luôn))*$/), ["Sao vậy nè? 😯", "Hihi 😄", "Hửm, có gì hả? 👀"], true],
  // "a kể chuyện này nha", "để c kể cho e nghe" — người dùng xin phép KỂ → mời kể.
  ["opener", VN(/^(để )?(a|anh|chị|c|em|e|mình|tui|tôi|tớ)( muốn)? kể( cho (e|em|lomi|bạn))?( nghe)?( (chuyện|cái) này| một chuyện| 1 chuyện| chuyện)?( cho (e|em|lomi|bạn))?( nghe)?( (nha|nhé|nhe|nè|nghe|được không|đc không))*$/), ["Dạ, bạn kể đi, Lomi nghe nè 😊", "Kể đi bạn, Lomi đang nghe nè 👂"], false],
  // 21/10 (QA 100 câu, phần nói chuyện tự nhiên): kiểu nói lóng / đùa ngắn trước đây rơi vào "chưa hiểu ý" hoặc FAQ của app.
  ["call", VN(/^(alo|alô|ê|ơi|hello|hey)?( (lomi|em|e|bạn))?( ơi)? ?có ai (ở nhà|ở đó|ở đây|đó|đây)?( không| ko| hông| k| hem)?( (vậy|z|ta|trời))*$/), ["Có Lomi đây nè 🙋 Lomi trực 24/7 luôn á 😄 Bạn cần gì nè?"], false],
  ["blank", VN(/^((chả|chẳng|không|ko|hông) (biết|bít|bt) (nói|kể|hỏi) (gì|cái gì|chi)( nữa| luôn| giờ)*( (á|à|ạ|nè|ta|trời))*|hết chuyện (để )?(nói|kể)( rồi)?( (á|à|luôn))*)$/), ["Không sao, đâu cần nói gì đặc biệt 😄 Muốn thì Lomi kể chuyện vui, bốc một lá bài cho vui, hoặc bạn kể Lomi nghe hôm nay của bạn thế nào cũng được."], false],
  ["tease", VN(/^((ok+|oke+|okie+|ừ+|rồi)( ok+)?( (biết|hiểu) rồi)?|(biết|hiểu) rồi)( (bà nội|ông nội|bà dà|bà già|má|mẹ|cha nội|trời|mà|nha|nhé))+$/), ["Hihi dạ, Lomi nhiều chuyện xíu thôi mà 😆 Cần gì cứ gọi Lomi nha."], false],
  ["poke", VN(/^(rep|rép|trả lời|tl|nói|nghe) (anh|a|em|e|mình|tui|t|chị|c|tớ|tao)( (coi|đi|lẹ|nhanh|với|cái|liền|đê))+( (bà dà|bà|má|ơi|nha|nè|trời|bà nội))*$/), ["Dạ Lomi đây, rep liền nè 😆 Bạn cần gì nè?"], false],
  ["speechless", VN(/^((bruh|bro|haiz+|hây|trời|ôi)( (ơi|đất))?,? ?)?(chịu|chịu luôn|chịu thật|bó tay|cạn lời|hết nói|hết cứu|chịu rồi)( (luôn|thật|rồi|á|à|ạ|nha|trời|ghê|nổi|chấm com))*$/), ["Cạn lời luôn hả 😅 Có chuyện gì làm bạn chịu thua vậy, kể Lomi nghe thử?"], false],
  ["shrug", VN(/^((thế|vậy|dậy|zậy|z) (à|hả|ha|hở)( (vậy|z|ta|v|à|hả))*,? ?)+$/), ["Dạ đúng vậy đó 😄"], false],
  ["fun", VN(/^(?!.*\bnói chuyện vui\b).{0,40}\b((kể|nói)( (cho|anh|a|em|e|mình|tôi|tui|chị|c|nghe)){0,3} (gì|chuyện gì|cái gì|chuyện|cái|một chuyện|1 chuyện) (gì )?(vui|hài|cười)|có (gì|chuyện gì) vui( \S+)? (kể|nói)|(kể|đố|ra) (anh|em|mình|tôi|tui|a|e|chị|c)?( một| 1)? ?câu đố)\b.{0,20}$/), ["Đố bạn: bệnh gì bác sĩ cũng bó tay? …Gãy tay 🤕😂"], true],
  ["wish", VN(/\b((viết|soạn|nghĩ|gửi)( \S+){0,4} (lời chúc|câu chúc|tin nhắn chúc|status chúc|caption chúc|chúc mừng) (mừng )?sinh nhật|lời chúc sinh nhật|câu chúc sinh nhật)\b/), ["🎂 “Chúc mừng sinh nhật! Tuổi mới thật nhiều sức khoẻ, niềm vui và may mắn nha!”"], true],
  // 21/10 (QA V2 phần A): nhờ cứu (đùa), thôi khỏi, muốn nghe thật lòng, không biết thì nói không biết, hỏi chơi thôi, game, nói chuyện vui, tới lượt người dùng đố.
  ["help", VN(/^(ê |ơi |alo )?((lomi|em|e) )?(ơi )?(cứu|help|giúp) (anh|em|tui|mình|tôi|tao|t|chị|a|e|với)( (với|cái|nha|đi|lẹ|gấp|em|lomi))*$/), ["Có Lomi đây nè 🙋 Có chuyện gì vậy, Lomi giúp được gì nè? (Nếu đang gặp nguy hiểm thật thì gọi 113 / 115 trước nha.)"], false],
  ["cancel", VN(/^(thôi|ừ thôi|vậy thôi)?( )?(khỏi|không cần|hổng cần|khỏi cần)( (đi|nữa|đâu|nha|nhé|rồi|em|lomi|đâu nha))*$|^thôi (khỏi|bỏ đi|không cần)( (đi|nữa|đâu|nha|nhé|rồi|không cần nữa))*$/), ["Dạ okie, mình dừng chuyện đó nha 😊 Cần gì cứ gọi Lomi."], false],
  ["honestpls", VN(/\b(muốn nghe (ý kiến|nhận xét|góp ý) (thật|thật lòng|thẳng)|nói thật (đi|lòng)|đừng (có )?(chiều|nịnh|khen cho có|an ủi cho có))\b/), ["Dạ, Lomi sẽ nói thật lòng — kể cả khi không giống điều bạn muốn nghe 👍 Bạn đang muốn hỏi ý kiến về chuyện gì nè?"], false],
  ["noguess", VN(/\b(không biết thì (nói|bảo) (là )?không biết|đừng (có )?(đoán|bịa|nói bừa|chém gió))\b/), ["Dạ đúng vậy — chuyện gì Lomi không chắc thì Lomi nói thẳng là không biết, không đoán, nhất là chuyện sức khoẻ, thuốc men 👍 Bạn hỏi đi nè."], false],
  ["joking", VN(/\b(hỏi chơi (thôi|mà)|nói chơi (thôi|mà)|giỡn (thôi|mà)|đùa (thôi|mà)|nghiêm túc quá)\b/), ["Hihi, Lomi hơi nghiêm túc quá ha 😆 Okie, mình nói chuyện thoải mái nha — có gì vui cứ hỏi."], false],
  ["game", VN(/\b((em|lomi|e) (biết|có biết|có chơi|chơi) game( này| đó| gì)?|bí nhiệm vụ|kẹt nhiệm vụ|không qua (được )?màn|kẹt màn)\b/), ["Bạn đang chơi game gì, kẹt ở nhiệm vụ / màn nào nè? 🎮 Lomi không rành hết mọi game nên không dám chỉ bừa — bạn nói tên game và nhiệm vụ nha, phần nào Lomi không chắc thì Lomi nói thẳng. Tra wiki của game hoặc hỏi nhóm người chơi thường là nhanh nhất."], false],
  ["chill", VN(/^((anh|em|tui|mình|tôi|a|e|t) )?(muốn |chỉ muốn )?nói chuyện vui( vẻ)?( thôi| chút| xíu| nha| đi)*$/), ["Okie, mình nói chuyện vui vẻ thôi nha 😄 Muốn Lomi đố một câu, hay bạn kể Lomi nghe hôm nay có gì hay?"], false],
  ["userriddle", VN(/\b(giờ |để |tới lượt )?(anh|em|tui|mình|tôi|a|e|t) (kể|đố|hỏi) (em|lomi|e|bạn)( nghe)?( (một|1|lại))? (câu|cái|câu đố)\b/), ["Okie, tới lượt bạn nha 😄 Bạn đố đi, Lomi nghe nè!"], false],
  ["likeexample", VN(/^((anh|em|tui|mình|tôi|a|e|t) )?(thích|muốn) (câu trả lời|trả lời|giải thích) (có|kèm) ví dụ( \S+){0,2}$/), ["Dạ Lomi nhớ rồi — giải thích gì Lomi sẽ kèm ví dụ đời thường cho dễ hình dung nha 👍"], false],
  // ("ngu" gõ không dấu bị bộ đoán dấu đọc thành "ngủ" — nhận cả hai, câu chỉ có "em ngủ quá vậy" thì gần như luôn là lời chê)
  ["insult", VN(/^(em|lomi|e|mày|m|bot) (ngu|ngủ|dở|tệ|kém|vô dụng|ngốc|dốt|lú)( (quá|thế|vậy|ghê|vl|thật|vãi|à|z|thiệt))*$/), ["Dạ, chắc Lomi vừa trả lời chưa đúng ý bạn, Lomi xin lỗi nha 🙏 Bạn nói Lomi nghe chỗ nào chưa ổn — Lomi sửa lại liền."], false],
  ["prefshort", VN(/^.{0,30}\b((không|ko|chẳng|hông) thích (câu )?(trả lời|rep|nói|đọc) (dài|dài dòng)|(trả lời|nói|rep) (ngắn|ngắn gọn|gọn) (thôi|thôi nha|nha|nhé|giùm|giúp)|đừng (trả lời|nói|viết) dài( dòng)?)\b.{0,20}$/), ["Dạ Lomi nhớ rồi, từ giờ Lomi trả lời ngắn gọn thôi nha 👍"], false],
  ["yes", VN(/^(có|có chứ|có à|có ạ|có a|ừ có|u có|có nha|muốn|có muốn)$/), ["Okie 😄 Bạn nói thêm chút để Lomi làm đúng ý nha?"], false],
  ["no", VN(/^(không|ko|k|hông|hong|khum|thôi|khỏi|không cần|thôi khỏi)( (nha|nhé|nhe|à|ạ|a|đâu|lomi))*$/), ["Dạ okie, không sao nè 😊 Cần gì cứ nói Lomi nha."], false],
];
const pickS = (a: string[]) => a[Math.floor(Math.random() * a.length)];

/** Giao tiếp cơ bản — trả intent + câu đáp ngắn, hoặc null. */
export function socialIntent(q: string): { intent: string; text: string; preferChit: boolean } | null {
  const n = normalizeVi(q);
  for (const [intent, re, texts, preferChit] of SOCIAL) if (re.test(n)) return { intent, text: pickS(texts), preferChit };
  // 11/10: lời GỌI ở đầu không đổi ý một câu MỞ LỜI ("e ơi cho a hỏi", "lomi ơi a hỏi cái này") → bỏ lời gọi ra rồi so khuôn mở lời.
  //        (lời chào kèm buổi — "e ơi chào buổi trưa" — vẫn để lớp khung câu đáp đúng buổi.)
  const n2 = n.replace(VN(/^(?:e|em|lomi|bạn|bé) ơi\s+(?=\S)/), "");
  if (n2 !== n) for (const [intent, re, texts, preferChit] of SOCIAL) if (intent === "opener" && re.test(n2)) return { intent, text: pickS(texts), preferChit };
  return null;
}
/** 12/10: MỞ LỜI có nêu đề tài nhưng chưa hỏi gì ("a hỏi về ibuprofen", "cho e hỏi chuyện đặt bàn") → mời hỏi tiếp và nhắc đúng đề tài,
 *  không đáp "Chuyện sao vậy, kể Lomi nghe với" như một lời tâm sự. Router chỉ gọi khi KHÔNG lớp chuyên môn nào nhận câu này
 *  ("a hỏi về bệnh gout" đã có lớp sức khoẻ trả lời). */
export function topicOpener(q: string): string | null {
  const mt = q.trim().match(VR(/^(?:(?:e|em|lomi|bạn|bé) ơi[\s,]+)?(?:cho\s+)?(?:a|anh|chị|c|em|e|mình|tui|tôi|tớ)(?:\s+(?:muốn|cần))?\s+hỏi(?:\s+(?:chút|xíu|tí|một chút))?\s+(?:về|chuyện)\s+(.{2,40})$/iu));
  if (!mt || VN(/\b(gì|sao|không|ko|nào|bao nhiêu|mấy|thế nào|chưa|hả|ha|nhỉ)\b/).test(normalizeVi(mt[1]))) return null;
  return `Dạ, về ${mt[1].replace(/[.!…\s]+$/u, "")} thì bạn muốn hỏi điều gì nè? Bạn cứ hỏi, Lomi biết tới đâu nói tới đó 😊`;
}

const PRON = "(?:a|anh|em|mình|tôi|tui|chị|t|tớ|tao|e|c)";
const NEG = "(?:không phải|ko phải|k phải|hông phải|không|ko|hông|hong|k)(?:\\s+(?:đâu|mà|nha))?[\\s,.!]+";
// Có chữ phủ định đứng đầu: "không, a hỏi…", "không phải, ý mình là…".
const CORR_RE = VR(new RegExp(`^${NEG}(?:ý\\s+${PRON}\\s+là|${PRON}\\s+(?:đang\\s+)?(?:muốn\\s+)?hỏi(?:\\s+là)?|${PRON}\\s+nói\\s+là)[\\s,:]*`, "iu"));
// Không có phủ định thì phải rõ ý sửa: "ý a là…", "a hỏi là…", "a hỏi cái kia".
const CORR2_RE = VR(new RegExp(`^(?:ý\\s+${PRON}\\s+là|${PRON}\\s+(?:muốn\\s+)?hỏi\\s+là|${PRON}\\s+hỏi(?=\\s+(?:cái kia|cái khác|chuyện khác)))[\\s,:]*`, "iu"));
const CORR_NEG_RE = VR(/^(?:không phải|ko phải|k phải|hông phải)(?:\s+(?:đâu|vậy|thế|nha|mà))*[\s,.!]+/iu);
const OTHER_RE = VN(/^(cái kia|cái khác|chuyện khác|cái đó|ý khác|cái trước)( (nha|mà|à|a|đó|nè))*$/);
const FILLER = VN(/^(ủa|ok|oke|okie|okay|oki|ừ|u|uh|ừh|um|ừm|uhm|ừhm|uk|ừk|ui|hả|ha|haha|hahaha|hihi|hehe|kk|kkk|trời|trời ơi|trời đất|haiz|haizz|hmm|hm|à|a|ạ|ồ|ô|o|oh|wow)$/);
const FOLLOW_TOK = new Set(["vay", "the", "con", "roi", "sao", "y", "la", "cai", "nay", "do", "kia", "tinh", "luon", "ha", "a", "nua", "thi", "gi", "z", "nhi", "ta", "nao", "ne", "sau"]);
const FOLLOW_HEAD = new Set(["vay", "the", "con", "roi", "y", "cai", "tinh"]);
const DRINK_ONLY = VN(/^(cà phê|cafe|trà sữa|trà|bia|rượu)( (à|a|hả|ha|nè|không|hông|hong|ko|k|đi|nha))?$/);

/** Câu có phải follow-up / mơ hồ ngắn ("vậy sao?", "còn cái này?", "tính luôn hả?") không. */
export function isShortFollowUp(q: string): boolean {
  const n = normalizeVi(q);
  const t = n ? n.split(" ") : [];
  return t.length > 0 && t.length <= 5 && t.every((x) => FOLLOW_TOK.has(x)) && t.some((x) => FOLLOW_HEAD.has(x));
}

/** Câu hỏi VỀ Tarot (luật bài), không phải xin bói: "tarot có bài ngược hả?", "tarot bao nhiêu lá". */
export function tarotRuleInfo(q: string): UReply | null {
  return tarotInfo(normalizeVi(q));
}
function tarotInfo(n: string): UReply | null {
  // 11/10: hỏi luật mà không nhắc chữ "tarot" ("bài ngược là sao", "trải celtic là gì", "ẩn chính là gì") vẫn là hỏi về Tarot.
  const asksWhat = VN(/\b(là gì|là sao|nghĩa là|nghĩa gì|ý nghĩa|là thế nào|như thế nào|gồm những gì|khác gì)\b/).test(n);
  if (asksWhat && VN(/\b(celtic|chữ thập|trải (5|năm|10|mười|3|ba|1|một) lá|trải bài|kiểu trải|cách trải)\b/).test(n))
    return {
      intent: "tarot_info",
      text: `Trải bài là cách xếp các lá — mỗi VỊ TRÍ mang một ý riêng 🔮 Lomi có mấy kiểu:\n${TAROT_SPREADS.map((x) => `• **${x.vi.split(" · ")[0]}** — ${x.pos.map((p) => p.vi).join(" · ")}`).join("\n")}\n\nKhi bạn hỏi một câu cụ thể, tên vị trí của trải 3 lá đổi theo câu hỏi (vd Hiện tại · Trở ngại · Kết quả). Muốn thử thì gõ kiểu “trải 5 lá về công việc” nha.`,
      quick: ["Bói một lá cho hôm nay"],
    };
  if (asksWhat && VN(/\b(ẩn chính|ẩn phụ|major arcana|minor arcana)\b/).test(n))
    return { intent: "tarot_info", text: "Bộ Tarot có 78 lá 🔮 **22 lá Ẩn Chính** (Chàng Khờ, Tình Nhân, Mặt Trời…) nói về những bài học, bước ngoặt lớn; **56 lá Ẩn Phụ** chia 4 chất — Gậy (hành động), Cốc (cảm xúc), Kiếm (suy nghĩ), Tiền (vật chất) — nói về chuyện thường ngày.", quick: ["Bói một lá cho hôm nay"] };
  if (!VN(/\b(tarot|lá bài|bộ bài)\b/).test(n) && !(VN(/\b(bài|lá) (ngược|xuôi)\b/).test(n) && n.split(" ").length <= 7)) return null;
  if (VN(/\b(ngược|xuôi|lật ngược)\b/).test(n))
    return { intent: "tarot_info", text: "Có nè 🔮 Trong Tarot, lá rút ra bị lộn đầu gọi là **lá ngược**. Lomi tính cả lá ngược: mỗi lá có nghĩa xuôi và nghĩa ngược riêng — lá ngược thường là năng lượng bị chặn, chậm lại hoặc cần nhìn lại, chứ không phải lúc nào cũng xấu. Muốn rút thử một lá không?", quick: ["Bói một lá cho hôm nay"] };
  if (VN(/\b(bao nhiêu lá|mấy lá|78)\b/).test(n))
    return { intent: "tarot_info", text: "Bộ Tarot có **78 lá**: 22 lá Ẩn Chính và 56 lá Ẩn Phụ (4 chất Gậy, Cốc, Kiếm, Tiền) 🔮 Lomi trải 1, 3, 5 hoặc 10 lá tuỳ bạn nha.", quick: ["Bói một lá cho hôm nay"] };
  // Tarot KHÔNG chẩn đoán bệnh, không thay bác sĩ, không đoán chắc tương lai — hỏi thẳng thì nói thẳng.
  if (VN(/\b(chẩn đoán|chữa bệnh|biết bệnh|đoán bệnh|thay bác sĩ|thay thuốc|đoán trước|tiên tri|biết trước tương lai|đoán tương lai|chắc chắn)\b/).test(n))
    return { intent: "tarot_info", text: "Không đâu bạn 🙏 Tarot **không chẩn đoán được bệnh, không thay bác sĩ**, và cũng không nói chắc được tương lai. Lá bài chỉ là một cách nhìn lại chuyện của mình để suy ngẫm; chuyện sức khoẻ thì đi khám, chuyện quan trọng thì bạn vẫn là người quyết định nha.", quick: ["Bói một lá cho hôm nay"] };
  if (VN(/\b(là gì|có thật không|có đúng không|có chính xác không|tin được không)\b/).test(n))
    return { intent: "tarot_info", text: "Tarot là bộ 78 lá bài dùng để suy ngẫm, nhìn lại chuyện của mình từ góc khác 🔮 Lomi bói cho vui và để bạn có thêm góc nhìn thôi nha — quyết định quan trọng vẫn là ở bạn.", quick: ["Bói một lá cho hôm nay"] };
  return null;
}

/**
 * Chạy TRƯỚC module chuyên biệt. `correctionOnly` = chỉ xét câu sửa lại (gọi sớm, trước mọi mạch).
 * inFlow = đang ở một mạch có câu hỏi chờ (tâm sự, chọn món, chọn loại hình…) → không chặn filler/follow-up.
 */
/** 10/10: menu mẹo (dùng khi người dùng xin "mẹo" mà chưa nói chuyện gì) — lib/lomiConvo dùng chung. */
export const TIP_MENU: UReply = {
  intent: "tip_menu",
  text: "Lomi có mẹo ở mấy mảng này nè 😄 Bạn muốn mẹo về chuyện nào?\n• 🩺 Sức khoẻ: ngủ ngon, đỡ đau đầu, ăn uống theo bệnh…\n• 💚 Tinh thần: bớt lo âu, căng thẳng, suy nghĩ nhiều\n• 🏪 Kinh doanh: hút khách, giữ khách quen, làm ưu đãi\n• 🍜 Ăn gì hôm nay",
  quick: ["Mất ngủ nên làm gì?", "Làm sao bớt căng thẳng?", "Làm sao hút khách cho quán?", "Hôm nay ăn gì?"],
};
// 10/10: than phiền CÁCH Lomi trả lời ("sao e cứ vậy hoài", "thấy 1 câu chứ mấy", "trả lời giống nhau hoài") → xin lỗi, hỏi lại.
const COMPLAIN_RE = VN(/ (sao (e|em|lomi|bạn|mày) (cứ |lại |toàn |hay )?(vậy|thế|như vậy|như thế|kỳ vậy|kỳ thế) (hoài|mãi|vậy|thế|hoài vậy)|(cứ|toàn|lại) (trả lời|nói|hỏi|đáp) (giống nhau|giống hệt|y chang|hoài|mãi|lặp lại|một câu)|lặp lại hoài|lặp đi lặp lại|lặp lại mãi|nói hoài (một|1) câu|trả lời giống nhau|thấy (1|một) câu (chữ|thôi)|(e|em|lomi) (dở|đơ|ngu|kém|lỏ) (quá|thế|vậy|ghê)|sao (e|em|lomi) (không|ko|k|chả|chẳng) hiểu (gì|ji|j)|(e|em|lomi|bạn|mày) (không|ko|k|chả|chẳng) hiểu (gì|ji|j)( hết| cả| luôn| trơn)?|(nói|trả lời|hỏi|đáp) (gì )?(kỳ|lạ|lắm|ngộ|vô duyên) (vậy|thế|quá|ghê|zay)|hỏi đi hỏi lại) /);
const WHAT_RE = VN(/ ý (anh|em|chị|tôi|tui|mình|a|e|c) (không phải|đâu phải|chả phải|hông phải) (vậy|thế|như vậy|như thế|cái đó|chuyện đó)|^ (là sao|ý là sao|ý gì|nói gì vậy|nói gì thế|nói gì kỳ|trả lời gì vậy|gì vậy trời|cái gì vậy|hai|hải) ?$|^ (là sao|ý là sao) .{0,6}?(sao lại|liên quan)| (sao lại liên quan|liên quan gì|có liên quan gì|đâu có liên quan|liên quan chỗ nào|lạc đề|trả lời lạc|hiểu sai rồi|hiểu nhầm rồi|hiểu lầm rồi|đâu có hỏi|mình đâu có hỏi|a đâu có hỏi|e đâu có hỏi|em đâu có hỏi) /);
export function gate(q: string, ctx: GateCtx & { inFlow?: boolean }, correctionOnly = false): Gate | null {
  const n = normalizeVi(q);
  const lastAsked = /\?\s*$|\?[^?]{0,12}$/.test(ctx.lastText ?? "");

  // 1) Sửa lại / bác câu trước.
  const m = q.match(CORR_RE) ?? q.match(CORR2_RE) ?? q.match(CORR_NEG_RE);
  // 20/10 (audit): "ý e là sao", "ý em là gì" — sau "ý … là" chỉ còn chữ HỎI → đang hỏi lại ý câu Lomi vừa nói, không phải sửa lại câu
  //   của mình (trước đây bị rút thành "sao" rồi đáp "Cái nào nè?"). lib/lomiConvo trả lời câu này theo đúng câu Lomi vừa nói.
  const askOnly = !!m && /^ý\s/iu.test(m[0].trim()) && VN(/^(sao|gì|là sao|là gì|như nào|thế nào|sao vậy|gì vậy)( (vậy|thế|ta|hả|ha|à|ạ|a|nhỉ|e|em|lomi))*$/).test(normalizeVi(q.slice(m[0].length)) || "x");
  if (m && m[0].trim() && ctx.lastText && !askOnly) {
    const rest = q.slice(m[0].length).trim();
    const rn = normalizeVi(rest);
    if (!rn || OTHER_RE.test(rn) || FILLER.test(rn))
      return { action: "reply", reply: { intent: "correction", text: "Dạ, chắc Lomi hiểu nhầm rồi 🙏 Bạn muốn hỏi chuyện gì nè? Nói Lomi thêm chút xíu nha." } };
    return { action: "rewrite", q: rest };
  }
  // "không" / "không phải" đứng một mình, mà Lomi không vừa hỏi gì → bạn đang bác câu trả lời.
  if (VN(/^(không|ko|k|hông|hong|không phải|ko phải|không đúng|sai rồi|không phải vậy)( (mà|đâu|nha|lomi|à|a|ạ))*$/).test(n) && !lastAsked && !ctx.inFlow && ctx.lastText)
    return { action: "reply", reply: { intent: "correction", text: "Dạ, chắc Lomi hiểu nhầm rồi 🙏 Bạn muốn hỏi chuyện gì nè? Nói Lomi thêm chút xíu nha." } };
  // 10/10: thắc mắc chính câu Lomi vừa đáp ("là sao? sao lại liên quan e tự hào?", "liên quan gì", "nói gì vậy") → Lomi đáp lạc,
  // nhận lỗi và hỏi lại — trước đây câu này bị đoán sang chủ đề khác (bỏ dấu "liên quan e" = "quán ế" → tư vấn quán vắng khách).
  // 10/10: xin mẹo mà chưa nói chuyện gì ("E biết mẹo gì k?", "có bí kíp gì hay không") — có ngữ cảnh thì lib/lomiConvo đã xử lý trước.
  if (VN(/^((e|em|lomi|bạn|mày) )?(có )?(biết|có) (mẹo|bí kíp|tip|tips)( (gì|nào|hay))*( (không|ko|k|hông|hong|nè|à|a|hả|ha|ta|nào))*$/).test(n))
    return { action: "reply", reply: TIP_MENU };
  // 10/10: nhờ "tư vấn" mà chưa nói chuyện gì ("Tư vấn chona", "tư vấn cho a đi") → mời chọn mảng, không đoán.
  if (VN(/^(tư vấn|tv|tư vấn giùm|tư vấn giúp)( (cho|giúp|giùm))?( (a|anh|e|em|mình|tôi|tui|chị|c|bạn))?( (nha|đi|với|xíu|chút|nè|cái|nhé|nhe))*$|^tư vấn chona( (nha|đi|với|xíu|chút|nè))*$/).test(n))
    return { action: "reply", reply: { intent: "consult_menu", text: "Được chứ 😄 Lomi tư vấn được mấy chuyện này nè — bạn muốn nói chuyện nào?\n• 💚 Tâm sự, tình cảm, áp lực\n• 🩺 Sức khoẻ (kiến thức tham khảo, có nguồn)\n• 🏪 Kinh doanh: hút khách, làm ưu đãi\n• 🍜 Ăn gì, đi đâu", quick: ["Tâm sự với Lomi", "🩺 Sức khoẻ", "Tư vấn kinh doanh", "Hôm nay ăn gì?"] } };
  if (ctx.lastText && n.split(" ").length <= 14 && COMPLAIN_RE.test(` ${n} `))
    return { action: "reply", reply: { intent: "correction", text: "Dạ, Lomi xin lỗi nha 🙏 Chắc Lomi trả lời chưa đúng ý bạn. Bạn nói Lomi nghe bạn đang cần gì — một chuyện cụ thể thôi cũng được — Lomi sẽ cố hiểu cho đúng." } };
  if (ctx.lastText && n.split(" ").length <= 12 && WHAT_RE.test(` ${n} `))
    return { action: "reply", reply: { intent: "correction", text: "À, Lomi đáp lạc ý bạn rồi, xin lỗi nha 🙏 Lomi hiểu chưa đúng câu vừa rồi. Bạn nói lại giúp Lomi một chút được không?" } };
  if (correctionOnly) return null;

  // 2) Hỏi về luật Tarot → trả lời kiến thức Tarot (không rút bài với câu hỏi "có bài ngược hả?").
  const ti = tarotInfo(n);
  if (ti) return { action: "reply", reply: ti };

  if (ctx.inFlow) return null;

  // 2b) Giao tiếp cơ bản. Lomi vừa hỏi một câu (có "?") mà người dùng đáp có/không → để luồng hiện có hiểu theo câu hỏi.
  const so = socialIntent(q);
  if (so && !((so.intent === "yes" || so.intent === "no") && lastAsked))
    return { action: "social", reply: { intent: so.intent, text: so.text }, preferChit: so.preferChit };

  // 3) Tiếng cảm thán / phản ứng → không vào module kiến thức.
  if (FILLER.test(n)) return { action: "skip", intent: "filler" };

  // 4) Chỉ có tên đồ uống ("cà phê?") → không phải câu hỏi sức khoẻ.
  if (DRINK_ONLY.test(n)) return { action: "skip", intent: "drink_only" };

  // 5) Follow-up / mơ hồ ngắn.
  if (isShortFollowUp(q)) {
    const topic = ctx.topic ?? (VR(/tarot|lá bài|trải bài|🔮/i).test(ctx.lastText ?? "") ? "tarot" : undefined);
    if (topic === "tarot") {
      if (VR(/ngược/i).test(ctx.lastText ?? "") && VN(/\b(tính|tính luôn|có tính)\b/).test(n))
        return { action: "reply", reply: { intent: "followup_tarot", text: "Dạ, tính luôn nha 🔮 Lá ngược vẫn được giải nghĩa — chỉ là đọc theo nghĩa ngược (chậm lại, bị chặn, cần nhìn lại) thay vì nghĩa xuôi.", quick: ["Bói một lá cho hôm nay"] } };
      return { action: "reply", reply: { intent: "followup_tarot", text: "Bạn hỏi tiếp về trải bài vừa rồi đúng không? 🔮 Bạn muốn Lomi giải kỹ lá nào, rút thêm lá, hay hỏi bài chuyện khác nè?", quick: ["Bói một lá cho hôm nay"] } };
    }
    if (topic === "faq") return { action: "skip", intent: "followup_faq" }; // để phần câu hỏi nối của FAQ hiểu
    if (topic) return null; // sức khoẻ, tâm sự, kinh doanh, FAQ… → mạch hiện có tự hiểu theo ngữ cảnh.
    return { action: "skip", intent: "followup_nocontext" };
  }
  return null;
}

/** Câu trả lời khi Lomi chưa chắc hiểu — hỏi lại, không đoán bừa. */
export const GATE_ASK_BACK = "Lomi chưa chắc hiểu ý bạn 😅 Bạn nói rõ thêm chút được không — đang hỏi về app, một quán/ưu đãi, sức khoẻ hay bói bài nè?";
