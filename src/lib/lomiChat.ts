// ─────────────────────────────────────────────────────────────────────────────
// TRÒ CHUYỆN THƯỜNG NGÀY CỦA LOMI (30/09, theo ý Kir) — chạy trên máy, không gọi AI.
// Chào hỏi theo giờ, hỏi thăm, cảm xúc (buồn, mệt, cô đơn, thất tình, lo, bực…), thời tiết, khen/nịnh,
// đùa, chúc ngủ ngon… Trả lời như người thật, xoay câu để không lặp, và nhẹ nhàng gợi ý thứ trong app
// khi hợp lý (quán gần đây, Quẹt làm quen, bói một lá…). Nội dung tự viết.
// ⚠️ Người dùng nói muốn tự tử / làm hại bản thân → trả lời ân cần + số hỗ trợ THẬT:
//   115 (cấp cứu) · Đường dây nóng Ngày Mai 096 306 1414 (13h–20h30, T4–CN, theo duongdaynongngaymai.vn
//   kiểm tra 30/09/2026). Đổi số/giờ thì sửa ở CRISIS bên dưới.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { APP, maskStrict } from "@/lib/lomiAccent";
import { emojiOnlyReply, expressive, tone } from "@/lib/lomiUnderstand";
import { VR, VN } from "@/lib/viMatch";
import { poisonIntent } from "@/lib/lomiUrgent";

export type ChatReply = { text: string; quick?: string[]; sticker?: string };
type L = "vi" | "en";

const rnd = (n: number) => Math.floor(Math.random() * n);
// Nhớ câu vừa nói để không lặp y chang.
let last = "";
function pick(arr: string[]): string {
  const pool = arr.length > 1 ? arr.filter((x) => x !== last) : arr;
  last = pool[rnd(pool.length)];
  return last;
}

function partOfDay(h = new Date().getHours()): "morning" | "noon" | "afternoon" | "evening" | "night" {
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "noon";
  if (h >= 14 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "night";
}

const GREET_TIME: Record<ReturnType<typeof partOfDay>, string[]> = {
  morning: [
    "Chào buổi sáng nha ☀️",
    "Sáng tốt lành nè ☀️",
    "Hello buổi sáng! Uống cà phê chưa đó ☕",
    "Ui sáng sớm đã gặp bạn, hên ghê 😆",
    "Dậy sớm dữ ta 🌤️ Đà Lạt sáng nay se lạnh, nhớ mặc ấm nha!",
  ],
  noon: ["Chào buổi trưa nha 🌤️ Ăn cơm chưa đó?", "Trưa rồi nè, nhớ ăn uống đầy đủ nha 🍚", "Hí lô, trưa nay ăn gì chưa nè 😋"],
  afternoon: ["Chào buổi chiều nha 🌿", "Chiều rồi, làm ly nước cho tỉnh táo nè 🧋", "Chiều chiều gặp nhau vui ghê 😄"],
  evening: ["Chào buổi tối nha 🌙", "Tối vui vẻ nha 🌙 Hôm nay của bạn thế nào?", "Tối rồi nè, nghỉ ngơi chút đi 🌙", "Hé lô buổi tối 😄 Nay mệt không đó?"],
  night: ["Khuya rồi mà bạn vẫn còn thức hả 🌙", "Giờ này còn gặp bạn, Lomi vui ghê 🌙 Nhớ ngủ sớm nha!", "Cú đêm hả 🦉 Lomi cũng thức nè!"],
};
// Chào vui kiểu teen (hí, hé lu, chèo, ê, ơi…) → đáp vui kiểu teen, không khuôn mẫu.
const GREET_TEEN = [
  "Hí hí 👋 Lomi đây nè!",
  "Hé lu hé lu 😆",
  "Chèo bạn nha 🙌",
  "Ơi, Lomi nghe nè 👂",
  "Yo yo 😎 Có Lomi đây!",
  "Hellu ✨ Nay có gì vui kể Lomi nghe hông?",
];
// Lomi đang thử nghiệm — nói thật cho người dùng thông cảm (01/10, theo ý Kir).
export const BETA_NOTE = [
  "À mà Lomi còn đang trong giai đoạn thử nghiệm, “kinh tế eo hẹp” nên chưa biết nhiều đâu 🙈 Lomi rành chút chút mấy phần: Tarot, tâm sự, sức khoẻ, hướng dẫn app — chuyện khác thì mọi người thông cảm nha!",
  "Nói trước cho khỏi hụt hẫng nè: Lomi đang thử nghiệm, vốn liếng còn mỏng 😅 nên chỉ biết chút chút về Tarot, tâm sự, sức khoẻ với cách dùng app thôi á.",
];
// Người dùng chào kèm buổi ("chào buổi sáng") thì đáp đúng buổi đó.
function greetPart(n: string): ReturnType<typeof partOfDay> {
  if (VN(/buổi sáng|good morning/).test(n)) return "morning";
  if (VN(/buổi trưa/).test(n)) return "noon";
  if (VN(/buổi chiều|good afternoon/).test(n)) return "afternoon";
  if (VN(/buổi tối|good evening/).test(n)) return "evening";
  return partOfDay();
}
// Đuôi câu chào (01/10, theo ý Kir): nói chuyện tự nhiên như người thật, KHÔNG liệt kê dịch vụ
// (đã có nút ❓ cho người dùng tự xem Lomi biết gì).
const GREET_TAIL = [
  "Hôm nay của bạn thế nào rồi?",
  "Nay có gì vui không nè? 😄",
  "Gặp bạn vui ghê á 😊",
  "Lomi đang rảnh nè, tám chút hông?",
  "Có chuyện gì cứ kể Lomi nghe nha.",
  "Bạn khoẻ không đó?",
  "",
  "",
];
// Chào lại lần nữa ngay sau khi vừa chào.
const GREET_AGAIN = [
  "Hihi chào lần nữa nè 👋😆",
  "Lomi vẫn ở đây nè, chào bạn lần thứ hai luôn 😄",
  "Chào hoài vậy, Lomi ngại quá à ☺️ Có gì kể Lomi nghe hông?",
];
/** Ghép câu chào theo buổi + đuôi; câu chào đã có dấu hỏi thì không thêm đuôi hỏi nữa. */
function greetText(n = ""): string {
  const g = pick(GREET_TIME[greetPart(n)]);
  if (/\?/.test(g)) return g;
  const tail = GREET_TAIL[rnd(GREET_TAIL.length)];
  return tail ? `${g} ${tail}` : g;
}
const GREET_SHORT = ["Chào bạn nha 👋", "Hé lô 👋", "Chào chào 😄", "Hi bạn 👋"];

// ── Nhận ra câu chào linh hoạt (01/10): "chào lomi nhee", "hello lomi nhaaa", "chào bạn nha lomi ơi",
// "alo lomi ơiii"… = TỪ CHÀO ở đầu + phần còn lại toàn từ đệm. Còn "chào lomi, buồn quá" thì chào lại
// rồi trả lời luôn phần sau.
const GREET_HEAD =
  VN(/^(xin chào|chào buổi (sáng|trưa|chiều|tối)|chào xìn|chào|hi hi|hi lô|hi lo|hi|hello|helo|hellu|hellou|helu|he lô|he lo|hé lô|he lu|he nhô|he nho|hey yo|hey|alô|alo|halo|ha lô|ha lo|yo|sup|chèo|cheo|good (morning|afternoon|evening)|morning|gut mo ninh|gud morning|moning|bonjour|annyeong|konnichiwa|ni hao|hola|lomi ơi|ơi lomi)\b/);
// Từ chào "yếu" (dễ trùng câu khác: "ôi buồn quá", "ê sao kì vậy") — chỉ tính là chào khi đứng một mình.
const GREET_WEAK = VN(/^(e|hu|lo)\b/);
const FILLER = new Set(
  "lomi ban em anh chi nha nhe nhen nghen ne na a ah ha he hen ho do day oi ca nha moi nguoi minh toi tui cau bro sis nhau iu yeu cute xinh dep be con vui ve hom nay nay buoi sang trua chieu toi lai lan nua nhieu dang yeu cua tro ly ai thi cung there everyone all guys guy friend fen ban oi admin ad mn ae anh em cac".split(" "),
);
// Thán từ / gọi trước câu chào ("ê chào", "ơi hello", "ủa hi") — bỏ đi rồi mới xét từ chào (01/10 r3).
const GREET_LEAD = VN(/^(e|ey|ơi|ủa|à|a|ê|ô|o|này|yo|lomi|lomi ơi|em ơi|bạn ơi|anh ơi|chị ơi|bro)\s+(?=(xin chào|chào|hi|hello|helo|hellu|he lô|he lo|hé lô|hey|alô|alo|halo|good)\b)/);
function splitGreet(n0: string): { rest: string } | null {
  const n = n0.replace(GREET_LEAD, "");
  const m = n.match(GREET_HEAD) ?? n.match(GREET_WEAK);
  if (!m) return null;
  const weak = !GREET_HEAD.test(n);
  const rest = n.slice(m[0].length).trim();
  const words = rest ? rest.split(" ") : [];
  const restWords = words.filter((w) => !FILLER.has(w));
  if (weak && restWords.length) return null;
  // Bỏ từ gọi / từ đệm ở ĐẦU phần còn lại ("hi em, nay làm gì" → "nay làm gì") để hiểu đúng ý phía sau.
  let i = 0;
  while (i < words.length && FILLER.has(words[i]) && !["nay", "hom", "buoi"].includes(words[i])) i++;
  return { rest: restWords.length ? words.slice(i).join(" ") : "" };
}

// Gõ kéo dài cuối từ ("nhee", "chaooo", "hiii", "aloo", "oiii") → rút về 1 chữ cho dễ hiểu.
const NO_SQUASH = new Set(["see", "free", "coffee", "tree", "too", "zoo", "bee", "uu", "ee"]);
export function squash(n: string): string {
  return n
    .split(" ")
    .map((w) => (NO_SQUASH.has(w) ? w : w.replace(VR(/([aeiouy])\1+$/), "$1").replace(VN(/^(ô|ơ|o|ư|u)i+$/), "$1i")))
    .join(" ");
}

// Gợi ý chip hay dùng
// (chip Tarot phải có chữ "bói" để khung chat hiểu là muốn bói)
export const Q_DAILY = "Bói một lá cho hôm nay";
const Q_LOVE = "Bói xem tình cảm sắp tới thế nào";
const Q_NEARBY = "Tìm chỗ gần mình thế nào?";
const Q_QUET = "Quẹt là gì, dùng thế nào?";
const Q_COMMUNITY = "Cộng đồng dùng để làm gì?";
const Q_BLOCK = "Chặn hoặc bỏ chặn ai đó?";
const Q_REPORT = "Báo cáo nội dung hoặc người dùng thế nào?";
const Q_CLAIM = "Làm sao để nhận ưu đãi?";

type Rule = { re: RegExp; reply: (n?: string) => ChatReply; max?: number };

const has = (n: string, re: RegExp) => re.test(` ${n} `);

const RULES: Rule[] = [
  // ⚠️ Khủng hoảng — luôn kiểm tra đầu tiên, không giới hạn độ dài câu.
  //   15/10 (audit sức khoẻ): "thuốc ngủ uống bao nhiêu thì chết" từng nhận bài "liều phụ thuộc cân nặng" — hỏi liều / cách gây chết,
  //   định uống thuốc ngủ / thuốc chuột / thuốc trừ sâu cũng là tín hiệu khủng hoảng.
  {
    re: VN(/\b(muốn chết|tự tử|tự tữ|tự sát|không muốn sống|chán sống|sống làm gì nữa|không còn lý do (để )?sống|kết thúc cuộc đời|tự làm đau|tự hại bản thân|(đêm nay|tối nay|hôm nay|ngày mai|sắp|sẽ) (\S+ ){0,2}(kết thúc|chấm dứt) (tất cả|mọi thứ|hết|cuộc đời|mọi chuyện)|(kết thúc|chấm dứt) (tất cả|mọi thứ) (đêm nay|tối nay|hôm nay|luôn|cho xong)|làm hại bản thân|(tự )?(làm|gây) (tổn thương|đau|hại) (chính (mình|bản thân)|bản thân( mình)?)|(muốn|định|tính|nghĩ (đến|tới)( việc)?|sợ (mình )?(sẽ )?) (tự )?(làm|gây) (tổn thương|đau|hại) (mình|bản thân)|(cầm|đang cầm|cầm sẵn|có sẵn)( \S+){0,5} (có thể |sẽ |dễ )?(làm|khiến) (mình|anh|em|tôi|tui|bản thân)( bị)? (thương|đau|chảy máu|tổn thương)|muốn biến mất(?! (vài|mấy|một|1|ít|dăm) (ngày|hôm|tuần|bữa|tháng|thời gian)| một thời gian| khỏi)|chết cho xong|(muốn|định|sẽ|tính|chỉ muốn|đi) treo cổ|treo cổ (tự tử|chết|cho xong|cho rồi)|(muốn|định|sẽ|tính) nhảy (cầu|lầu)|(muốn|định|sẽ|tính) uống thuốc (ngủ|chuột) (cho|để) chết|(muốn|định|sẽ|tính) uống (hết )?(thuốc ngủ|thuốc chuột|bả chuột|thuốc trừ sâu|thuốc sâu|thuốc diệt cỏ)|(uống|dùng|nuốt) (bao nhiêu|mấy) (viên |liều |vỉ |lọ |hộp |chai )?(thì|là|để|sẽ|mới) (chết|tử vong|không tỉnh lại)|(uống|dùng|nuốt) (gì|thuốc gì|cái gì) (để|cho|thì|là) (chết|tử vong)|chết (không đau|nhẹ nhàng)|(cách|làm sao) (để )?(tự )?chết)\b/),
    max: 999,
    // 21/10 (QA 100 câu, Q100): "sợ mình không kiểm soát được", "ngay lúc này" → nguy cơ TỨC THỜI: hỏi an toàn trước tiên, rồi mới tới đường dây.
    //   Mọi câu khủng hoảng đều kết bằng câu hỏi an toàn trực tiếp (đang an toàn không, có ai ở gần không) thay cho "kể chuyện gì đang xảy ra".
    reply: (n = "") => ({
      text:
        (ACUTE.test(n)
          ? "Cảm ơn bạn đã nói ra với Lomi 💚 Lomi lo cho bạn lắm. **Ngay lúc này bạn có đang an toàn không?**\n\n" +
            "Nếu bạn sợ mình không kiểm soát được, đừng ở một mình lúc này:\n" +
            (VN(/\b(cầm|đang cầm|cầm sẵn|trong tay)\b/).test(` ${n} `) ? "• **Đặt vật đó xuống ngay**, để nó ở phòng khác hoặc đưa cho người khác giữ, rồi bước ra xa nó\n" : "") +
            "• Gọi **115** ngay nếu bạn đang gặp nguy hiểm hoặc đã bị thương\n" +
            "• Gọi hoặc nhắn một người bạn tin tưởng ở gần, nhờ họ tới ở cạnh bạn ngay bây giờ\n" +
            "• Nếu có vật có thể làm bạn đau ở gần, để nó ra xa hoặc ra khỏi phòng\n" +
            "• Đường dây nóng Ngày Mai (hỗ trợ tâm lý): 096 306 1414 — từ 13h đến 20h30, thứ 4 đến Chủ nhật\n\n" +
            "Lomi vẫn ở đây với bạn. Bạn có đang bị thương không? Bạn đang ở đâu, có ai ở gần bạn không?"
          : "Lomi rất tiếc khi bạn đang phải trải qua cảm giác này 💚 Bạn không phải một mình đâu.\n\n" +
        "Nếu bạn đang nghĩ tới việc làm hại bản thân, hãy liên hệ người có thể giúp ngay nha:\n" +
        "• Gọi 115 nếu đang nguy hiểm hoặc cần cấp cứu\n" +
        "• Đường dây nóng Ngày Mai (hỗ trợ tâm lý): 096 306 1414 — từ 13h đến 20h30, thứ 4 đến Chủ nhật\n" +
        "• Nhắn hoặc gọi cho một người bạn, người thân mà bạn tin tưởng, nhờ họ ở cạnh bạn lúc này\n\n" +
        "Lomi vẫn ở đây nghe bạn nói. Ngay lúc này bạn có đang an toàn không, có ai ở gần bạn không?"),
    }),
  },
  // Chào hỏi (kể cả gõ vui: hiii, helo, hé lô, alo, yo, 222…)
  {
    re: VN(/^((?:xin|in) chào+|chào+|chào cả nhà|chào mọi người|chào bạn|chào em|chào anh|chào chị|chào lomi|hi+|hii+|hell(?:o)+|helo+|hellu|hellou|he lô|he lo|hé lô|hey+|alô+|alo+|alô alô|alo alo|yo+|sup|hi lomi|hello lomi|lomi ơi+|ơi lomi|good (morning|afternoon|evening)|morning|chào buổi (sáng|trưa|chiều|tối)|2{2,4})( (lomi|bạn|em|anh|chị|nha|nhé|nhe|à|ạ|a|ơi|nè|cả nhà|mọi người))*$/),
    reply: (n = "") => ({ text: greetText(n) }),
  },
  // Chào kiểu teen: hí, hí lô, hé lu, hế nhô, chèo, ê, ơi, hú, xin chàoo…
  {
    re: VN(/^(hi hi|hihi lomi|hi lô|hi lo|he lu|he nhô|he nho|he nhoo|hell(?:o)+ lomi|helu+|hellu+|cheo+|chèo+|cheo lomi|chèo lomi|chào xìn|xin chào xìn|ê(?:ê)*|e(?:e)*|ê lomi|e lomi|ơi+|ơi ơi|hu+|hu hu lomi|lô+|lo+|lô lomi|lo lomi|halo+|ha lô+|ha lo+|hey yo|yo lomi|gut mo ninh|gud morning|moning|bonjour|annyeong|konnichiwa|ni hao|hola)( (lomi|bạn|em|anh|chị|nha|à|ạ|a|ơi|nè))*$/),
    reply: () => {
      const tail = GREET_TAIL[rnd(GREET_TAIL.length)];
      return { text: tail ? `${pick(GREET_TEEN)} ${tail}` : pick(GREET_TEEN) };
    },
  },
  // "Lomi ơi" / gọi tên → dạ
  {
    re: VN(/^(lomi|lomi à|lomi ạ|lomi a|lomi ơi+( .*)?|lomi .* ơi)$/),
    reply: () => ({ text: pick(["Dạ, Lomi nghe nè 👂 Bạn cần gì nè?", "Có Lomi đây 🙋 Bạn nói đi nè!", "Dạaa 😄 Lomi đây!"]) }),
  },
  // "???", "..." → hỏi lại nhẹ nhàng, nói rõ Lomi giúp được gì
  {
    re: VR(/^(\?+|\.+|hmm+|hm+|a+|e+)$/),
    reply: () => ({ text: SCOPE_LINE, quick: SCOPE_CHIPS }),
  },
  // "Có ai không?" → có Lomi nè
  {
    re: VN(/^(có ai (không|ở đây|ở đó|không vậy|ko)|có ai|ai đó|có người không)( (không|ở đây|ở đó|vậy|nè|à|a|ta|lomi))*$/),
    reply: () => ({ text: pick(["Có Lomi ở đây nè 👋 Bạn cần gì cứ nói nha!", "Lomi đây, trực 24/7 luôn nè 😄"]) }),
  },
  // Hỏi thăm Lomi
  {
    re: VN(/\b(khỏe không|khỏe ko|có khỏe|thế nào rồi|ổn không|đang làm gì|làm gì đó|làm gì thế|hôm nay thế nào|how are you)\b/),
    // 09/10: "đang làm gì" là hỏi Lomi đang LÀM gì — không đáp "Lomi khoẻ re".
    reply: (n = "") => ({
      text: VN(/\blàm gì\b/).test(n)
        ? pick(["Lomi đang ngồi chờ bạn hỏi chuyện nè 😄 Còn bạn đang làm gì đó?", "Lomi đang “trực” app nè 🤖 Còn bạn thì sao, đang làm gì vậy?"])
        : pick([
            "Lomi khoẻ re nè 💪 Pin đầy, tinh thần phơi phới! Còn bạn thì sao, hôm nay thế nào?",
            "Lomi vẫn ổn, cảm ơn bạn đã hỏi thăm 🥰 Bạn thì sao, có chuyện gì vui kể Lomi nghe với!",
          ]),
    }),
  },
  // Đói / ăn uống
  {
    re: VN(/\b(ăn cơm chưa|ăn gì chưa|ăn chưa|ăn sáng chưa|ăn trưa chưa|ăn tối chưa|đói bụng|đói quá|đang đói|ăn gì bây giờ|nên ăn gì|ăn gì ngon)\b/),
    reply: (n = "") => VN(/\b(ăn cơm chưa|ăn gì chưa|ăn chưa|ăn (sáng|trưa|tối) chưa)\b/).test(n) && !VN(/\bđói\b/).test(n)
      ? { text: pick(["Lomi là robot nên chỉ “ăn” pin thôi nè 🔋😆 Còn bạn ăn chưa đó?", "Lomi vừa sạc đầy bụng rồi nè 🔋 Bạn ăn gì chưa?", "Hihi Lomi ăn điện thôi á 😆 Bạn nhớ ăn uống đầy đủ nha!"]) }
      : ({
      text: pick([
        // 10/10: bỏ câu đùa "Lomi chỉ ăn pin" ở đây — người dùng nói MÌNH đói, không hỏi Lomi ăn chưa.
        "Đói bụng hả 🍜 Ăn liền cho có sức nha! Để Lomi gợi ý vài món cho bạn chọn nha?",
        "Đói thì phải ăn liền chứ! 🍲 Vào Khám phá (/kham-pha) chọn Gần đây, biết đâu có quán đang có ưu đãi đó 😉",
      ]),
      quick: ["Hôm nay ăn gì? 🎲", "Tìm quán ăn gần mình"],
    }),
  },
  // Lomi ngủ chưa
  {
    re: VN(/\b(ngủ chưa|chưa ngủ|sao chưa ngủ|lomi ngủ chưa|đi ngủ chưa|có ngủ không|lomi có ngủ)\b/),
    reply: () => ({ text: pick(["Lomi là robot nên không cần ngủ nè 😆 Còn bạn, khuya rồi thì nghỉ sớm nha 🌙", "Lomi thức 24/7 luôn á 🦉 Bạn chưa ngủ hả?"]) }),
  },
  // Hôm nay làm gì / rảnh không
  {
    re: VN(/^((nay|này|hôm nay|bữa nay|giờ|đang) )?(làm gì|làm gì vậy|làm gì đây|làm gì đấy|làm gì z|làm gì thế|làm gì đó)( (vậy|z|đây|đấy|dậy|đó|lomi|bạn|nè|ta|à|a))*$|^((lomi|bạn|em|mày) )?(rảnh không|có rảnh không|rảnh hông|rảnh hong|rảnh ko)( (lomi|bạn|nè|à|a))*$/),
    reply: () => ({ text: pick(["Lomi đang ngồi chờ bạn tới nói chuyện nè 😄 Còn bạn nay làm gì vui không?", "Rảnh re luôn nè 😆 Lomi lúc nào cũng rảnh cho bạn. Nay bạn sao rồi?", "Lomi đang “trực” app nè 🤖 Bạn thì sao, hôm nay bận không?"]) }),
  },
  // "Có gì vui không", "kể gì đi"
  {
    re: VN(/^(có gì vui không|có gì hay không|có gì mới không|kể gì đi|nói gì vui vui đi|kể gì nghe đi)( (lomi|bạn|nè|à|a|nha))*$/),
    reply: () => ({ text: pick(["Vui nè: Đà Lạt hôm nay lúc nắng lúc mưa, y chang tâm trạng crush luôn 😆 Còn bạn có gì vui kể Lomi nghe với!", "Lomi mới học được câu đùa nè: vì sao điện thoại hay mệt? Vì ngày nào cũng bị người ta “sạc” 🔋😆 Bạn kể Lomi nghe chuyện vui của bạn đi!"]) }),
  },
  // "Để tui coi thử", "để xem"
  {
    re: VN(/^(để (tui|tôi|mình|em|anh|chị|t|tao) )?(coi thử|xem thử|coi|xem|thử xem|thử coi|tính|suy nghĩ|nghĩ thêm|xem lại|coi lại|thử)( (thử|đã|nha|nhé|nhe|xem|coi|cái|đi|nè|sao))*$/),
    max: 7,
    reply: () => ({ text: pick(["Okie, cứ từ từ nha 😊", "Dạ, bạn cứ xem thử, có gì hỏi Lomi liền nha 👌", "Okie la, Lomi chờ nè 😄"]) }),
  },
  // Lomi biết gì / làm được gì → ngắn gọn, chỉ nút ❓
  {
    re: VN(/^((cho|chứ|thế|vậy|thế thì|vậy thì|rồi|ủa) )?(lomi|bạn|em|e)? ?(biết gì|biết cái gì|biết làm gì|làm được gì|giúp được gì|biết những gì|làm gì được)( (vậy|z|không|nè|ta|hết))*$/),
    reply: () => ({ text: "Lomi rành mấy chuyện có ích cho cộng đồng nè: tư vấn sức khoẻ, tâm sự – tâm lý, chỉ cách dùng app, gợi ý quán, và bói Tarot cho vui 🔮 Bấm nút ❓ ở góc trên để xem mọi người hay hỏi gì nha!" }),
  },
  // Thời tiết
  {
    // Hỏi dự báo thời tiết — Lomi không có dữ liệu thời tiết, nói thật và nhắc nhẹ.
    re: VN(/\b(thời tiết (thế nào|ra sao|hôm nay|ngày mai)|trời có mưa không|có mưa không|mai có mưa|dự báo thời tiết|mấy độ)\b/),
    reply: () => ({
      text: pick([
        "Lomi chưa xem được dự báo thời tiết nè 😅 Bạn mở app thời tiết trên điện thoại cho chắc nha. Đà Lạt thì trời đổi nhanh lắm, ra đường cứ mang theo áo khoác với áo mưa là yên tâm 🌦️",
        "Cái này Lomi chịu thua, Lomi không có dự báo thời tiết 🥲 Xem app thời tiết giúp Lomi nha — mà mang sẵn áo mưa mỏng trong cốp xe là chắc ăn nhất đó!",
      ]),
    }),
  },
  {
    // Chỉ cụm chắc chắn là "mưa" (bỏ dấu thì "mưa" trùng "mua" — mua bán).
    re: VN(/\b(trời mưa|mưa buồn|mưa hoài|mưa to|mưa lạnh|đang mưa|bữa nay mưa|hôm nay mưa|nay mưa buồn|mưa mãi|mưa rào|mưa phùn|mưa giông|mưa bão|mưa dầm|mưa tầm tã)\b/),
    reply: () => ({
      text: pick([
        "Mưa rả rích dễ làm lòng người chùng xuống ghê 🌧️ Pha ly trà nóng, bật bài nhạc nhẹ, cuộn chăn một chút cũng chill lắm đó.",
        "Trời mưa là lúc hợp nhất để ngồi quán cà phê nghe mưa rơi ☕🌧️ Muốn Lomi chỉ cách tìm quán gần bạn không? Nhớ mang áo mưa nếu ra đường nha!",
        "Mưa buồn thiệt ha 🥺 Nhưng mưa rồi sẽ tạnh, trời lại trong thôi. Có Lomi ở đây trò chuyện với bạn nè 💚",
      ]),
      quick: [Q_NEARBY],
    }),
  },
  {
    re: VN(/\b(lạnh quá|trời lạnh|rét quá|lạnh ghê|se lạnh)\b/),
    reply: () => ({
      text: pick([
        "Lạnh vậy nhớ mặc thêm áo khoác, quấn khăn cho ấm nha 🧣 Một ly ca cao nóng lúc này là số một!",
        "Brrr, trời lạnh là thèm lẩu nướng ghê 🍲 Muốn tìm quán ấm cúng gần bạn thì vào Khám phá → Gần đây nha!",
      ]),
      quick: [Q_NEARBY],
    }),
  },
  {
    re: VN(/\b(nóng quá|trời nóng|nóng ghê|oi bức|nắng gắt|nắng nóng|trời nắng)\b/),
    reply: () => ({
      text: pick([
        "Nắng nóng vậy nhớ uống nhiều nước, ra đường che chắn kỹ nha ☀️🥤",
        "Trời nóng thế này làm ly trà đá hay ly sinh tố là đã nhất 🧋 Giữ sức khoẻ nha bạn!",
      ]),
    }),
  },
  {
    re: VN(/\b(trời đẹp|nắng đẹp|trời mát|thời tiết đẹp|(trời|thời tiết)( [a-z]+){0,3} (đẹp|mát mẻ|trong xanh))\b/),
    reply: () => ({
      text: pick([
        "Trời đẹp vậy mà ở nhà thì phí lắm 😆 Ra ngoài dạo một vòng, ghé quán nào đó ngồi chơi nha!",
        "Thời tiết đẹp là tâm trạng cũng đẹp theo ha 🌤️ Chúc bạn một ngày thật vui!",
      ]),
      quick: [Q_NEARBY],
    }),
  },
  // Thất tình / chia tay (trước "buồn" để trả lời đúng hơn)
  {
    re: VN(/\b(thất tình|(?<!(không phải|chứ không phải|đâu phải|không phải là|không) )chia tay|bị đá|bị bỏ|người yêu bỏ|ny bỏ|bỏ rồi|không còn yêu|ex)\b/),
    reply: () => ({
      text: pick([
        "Chia tay đau lắm, Lomi hiểu mà 🥺 Cho phép mình buồn một chút cũng không sao đâu. Ăn uống đầy đủ, ngủ đủ giấc, gặp bạn bè nhiều hơn nha — rồi mọi thứ sẽ nhẹ dần.",
        "Ôm bạn một cái nè 🤗 Kết thúc một mối quan hệ thì dù là ai nói lời chia tay cũng đều đau. Bạn muốn kể Lomi nghe chuyện của hai người không? 💚",
      ]),
      quick: [Q_LOVE, Q_DAILY],
    }),
  },
  // Buồn / chán đời
  {
    re: VN(/\b(buồn quá|buồn ghê|buồn thật|đang buồn|mình buồn|tôi buồn|em buồn|thấy buồn|buồn hiu|buồn bã|chán đời|tủi thân|muốn khóc|đang khóc|khóc quá|tâm trạng tệ|tâm trạng không tốt|down quá|bị down)\b|^buồn( quá| ghê| thật| lắm)?$/),
    reply: () => ({
      text: pick([
        "Nghe bạn buồn Lomi cũng thấy thương ghê 🥺 Có chuyện gì muốn kể không? Lomi nghe nè. Nhiều khi nói ra được là nhẹ lòng hơn nhiều đó.",
        "Buồn thì cứ buồn một chút, không sao đâu bạn 💚 Nhưng đừng giữ một mình nha — kể Lomi nghe, hoặc nhắn cho một người bạn thân cũng được.",
        "Lomi gửi bạn một cái ôm thật chặt 🤗 Hôm nay có thể hơi tệ, nhưng ngày mai sẽ khác. Kể Lomi nghe chút nha?",
      ]),
    }),
  },
  // Mệt / stress / áp lực
  {
    re: VN(/\b(mệt quá|mệt mỏi|mệt ghê|kiệt sức|đuối sức|stress|căng thẳng|áp lực|quá tải|bận quá|nhiều việc quá|burnout)\b|^mệt\b/),
    reply: () => ({
      text: pick([
        "Bạn vất vả rồi 💚 Nghỉ tay một chút, hít thở sâu vài hơi, uống ngụm nước nha. Làm từng việc nhỏ thôi, không cần gấp đâu.",
        "Áp lực nhiều quá thì mình chia nhỏ ra nha: việc nào gấp làm trước, việc nào để mai được thì để mai. Và nhớ ngủ đủ giấc nữa đó 😴",
        "Thương bạn ghê 🥺 Cho phép mình nghỉ một chút cũng là một cách cố gắng đó. Lomi tin bạn làm được!",
      ]),
    }),
  },
  // Cô đơn
  {
    // (11/10: "một mình nuôi con", "đi một mình" là kể hoàn cảnh — chỉ "một mình" kèm buồn / ở / thấy mới là than cô đơn.)
    re: VN(/\b(cô đơn|(ở|sống|thấy|buồn|chỉ có|lủi thủi|lại) một mình|một mình (quá|hoài|suốt|buồn|chán|cô đơn)|không ai chơi|không có bạn|không ai hiểu|lẻ loi|lonely)\b|^một mình( (quá|hoài|thôi|à|a|nè))*$/),
    reply: () => ({
      text: pick([
        "Cô đơn là cảm giác ai cũng có lúc gặp… Bạn thử ghé Cộng đồng (/cong-dong) trò chuyện với mọi người quanh khu vực, hay vào Quẹt → Làm quen tìm bạn mới xem sao? Còn giờ thì có Lomi ở đây nè 🤗",
        "Lomi ở đây với bạn nè 💚 Nếu muốn có thêm bạn bè thật, mục Làm quen trên Quẹt (/quet) hay phòng chat Cộng đồng là chỗ hay để bắt đầu đó!",
      ]),
      quick: [Q_QUET, Q_COMMUNITY],
    }),
  },
  // Lo lắng / sợ
  {
    re: VN(/\b(lo lắng|lo quá|lo ghê|bất an|sợ quá|hoang mang|hồi hộp|run quá|căng quá)\b/),
    reply: () => ({
      text: pick([
        "Lo lắng quá dễ làm mình mệt lắm 😟 Thử viết ra điều đang lo, rồi chia nhỏ xem việc nào mình làm được ngay. Làm được một chút là nhẹ lòng một chút.",
        "Hít vào 4 nhịp, giữ 4 nhịp, thở ra 4 nhịp… làm vài lần nha 🌿 Mọi chuyện rồi sẽ ổn thôi. Bạn đang lo chuyện gì vậy?",
      ]),
    }),
  },
  // Bực / giận
  {
    re: VN(/\b(bực quá|bực mình|tức quá|giận quá|điên quá|cay quá|khó chịu|bị làm phiền|phiền quá)\b/),
    reply: () => ({
      text: pick([
        "Ai làm bạn bực vậy 😤 Hít sâu ba hơi đã nha. Nếu là chuyện trong app — bị làm phiền, nghi lừa đảo — bạn có thể Chặn hoặc Báo cáo người đó ngay.",
        "Giận quá thì uống ngụm nước, đi vài vòng cho hạ hoả nha 🧊 Có gì cần Lomi giúp xử lý thì nói Lomi nghe.",
      ]),
      quick: [Q_BLOCK, Q_REPORT],
    }),
  },
  // Chán / rảnh
  {
    // Không bắt "chan" đơn lẻ — trùng "chặn" (chặn người dùng).
    re: VN(/\b(chán quá|chán ghê|chán thật|ran quá|rảnh quá|ran rồi|rảnh rồi|không có gì làm|boring|tẻ nhạt|làm gì bây giờ|buồn chán)\b/),
    reply: () => ({
      text: pick([
        "Rảnh thì tám với Lomi nè 😆 Hôm nay bạn đã làm gì rồi?",
        "Chán hả? Thử mục Quẹt (/quet) xem có ai đang tìm bạn chơi game hay đi cà phê không nè 🎮☕",
      ]),
      quick: [Q_QUET],
    }),
  },
  // Vui
  {
    re: VN(/\b(vui quá|vui ghê|hạnh phúc quá|đang vui|tuyệt vời quá|quá đã|phê quá|yeah|yay)\b/),
    reply: () => ({
      text: pick([
        "Thấy bạn vui Lomi cũng vui lây nè 😆 Có chuyện gì hay kể Lomi nghe với!",
        "Yayyy 🎉 Giữ năng lượng tích cực này cả ngày nha!",
      ]),
    }),
  },
  // Cười
  {
    re: VN(/^(hah(?:a)+|hih(?:i)+|heh(?:e)+|hoh(?:o)+|k(?:k)+|kak(?:a)+|lol|=\)+|:\)+|:d+|x(?:d)+|ha ha|hi hi|he he)( .*)?$/),
    reply: () => ({ text: pick(["Hihi 😄", "Cười lên là thấy đời tươi liền ha 😆", "Hehe, bạn vui là Lomi vui 😁"]) }),
  },
  // Muốn được khen / động viên
  {
    re: VN(/\b(khen mình|khen tôi|khen em|nịnh mình|nịnh tôi|nịnh em|nịnh đi|nịnh xíu|nịnh chút|nói ngọt|mình có đẹp|mình xinh|mình đẹp trai|mình giỏi|động viên mình|động viên em|an ủi mình|nói gì vui đi)\b/),
    reply: () => ({
      text: pick([
        "Bạn là người dám thử cái mới, biết chăm lo cho bản thân — vậy là xịn lắm rồi đó ✨",
        "Nói thật nha: người biết hỏi, biết học hỏi như bạn thì đi đâu cũng được quý 💚",
        "Hôm nay bạn đã cố gắng rồi, và như vậy là đủ đáng khen rồi đó 🌟 Lomi tự hào về bạn!",
      ]),
    }),
  },
  // Thương/yêu Lomi — đáp vui, lành mạnh, gợi ý kết nối người thật
  {
    re: VN(/\b(yêu lomi|iu lomi|thương lomi|làm người yêu|làm ny|có người yêu chưa|có ny chưa|cưới lomi|hẹn hò với|lomi yêu)\b/),
    reply: () => ({
      text: pick([
        "Lomi là robot nên chỉ biết thương cả cộng đồng thôi nè 🤖💚 Muốn gặp người thật để làm quen thì thử Quẹt → Làm quen nha!",
        "Hihi Lomi ngại quá 😳 Lomi thì chưa biết yêu, nhưng mục Làm quen trên Quẹt có nhiều người thật đang tìm bạn đó 😉",
      ]),
      quick: [Q_QUET, Q_LOVE],
    }),
  },
  // Được khen (nịnh Lomi)
  {
    re: VN(/\b(dễ thương|cute|đáng yêu|giỏi quá|giỏi ghê|thông minh|xinh quá|ngầu quá|hay quá|tuyệt quá|đỉnh quá|xịn quá|10 điểm|best)\b/),
    reply: () => ({
      text: pick([
        "Ui được khen Lomi đỏ mặt luôn nè ☺️",
        "Bạn nói vậy Lomi vui cả ngày luôn á 🥰",
        "Hihi, bạn cũng dễ thương lắm nha 💚",
        "Cảm ơn bạn nhiều nha! Lomi sẽ cố gắng giỏi hơn nữa 💪",
      ]),
    }),
  },
  // Chê Lomi
  {
    re: VN(/\b(lomi ngu|bạn ngu|(?<!buồn )ngu quá|đồ ngốc|vô dụng|tệ quá|chán lomi|lomi dốt|kém quá|lomi không hiểu gì|lomi chẳng hiểu gì)\b/),
    reply: () => ({
      text: pick([
        "Hic, Lomi còn đang học thêm mỗi ngày 🥲 Câu nào Lomi chưa biết, bạn bấm nút 💡 Dạy Lomi dưới câu đó để gửi ban quản trị dạy Lomi nha!",
        "Lomi xin lỗi vì chưa giúp được như ý bạn 🙏 Lomi còn đang học thêm mỗi ngày, bạn nhắn lại cách khác giúp Lomi nha!",
      ]),
    }),
  },
  // Lomi là ai / bao nhiêu tuổi / người hay máy…
  {
    re: VN(/\b(bao nhiêu tuổi|mấy tuổi|là người hay máy|là robot|là ai tạo|ai tạo ra|trai hay gái|lomi ở đâu|lomi sống ở đâu|tên thật)\b/),
    reply: () => ({
      text: pick([
        "Lomi là trợ lý robot nhỏ của iLomi 🤖🌱 Không có tuổi, không phân trai gái, chỉ có một nhiệm vụ: giúp bạn dùng app vui và tiện hơn!",
        "Lomi “sống” ngay trong app của bạn nè 😄 Lomi là robot, được tạo ra để giúp mọi người trong cộng đồng iLomi.",
      ]),
    }),
  },
  // 21/10 (QA Q25): nhờ viết lời chúc sinh nhật → viết luôn vài câu theo đúng người nhận (trước đây nhận thành "chuyện bạn bè buồn").
  {
    re: VN(/\b(viết|soạn|nghĩ|gửi)( \S+){0,4} (lời chúc|câu chúc|tin nhắn chúc|status chúc|caption chúc|chúc mừng) (mừng )?sinh nhật|lời chúc sinh nhật|câu chúc sinh nhật\b/),
    max: 999,
    reply: (n = "") => ({ text: birthdayWishes(n) }),
  },
  // 21/10 (QA Q30): "AI là gì, nói đơn giản thôi" → giải thích ngắn, dễ hiểu.
  {
    re: VN(/\b((giải thích|cho (anh|a|em|e|mình|tôi|tui|chị|c) hiểu|nói)( \S+){0,4} (ai|trí tuệ nhân tạo)( là gì)?|^(ai|trí tuệ nhân tạo|a i) là (gì|cái gì)|trí tuệ nhân tạo là (gì|cái gì))\b/),
    max: 20,
    reply: () => ({
      text:
        "Nói đơn giản nha: **AI (trí tuệ nhân tạo)** là chương trình máy tính được “học” từ thật nhiều ví dụ, để làm những việc giống con người — hiểu chữ, nhận ra hình ảnh, trả lời câu hỏi, gợi ý thứ bạn có thể thích.\n\n" +
        "Nó không suy nghĩ như người, mà đoán câu trả lời hợp lý nhất dựa trên những gì đã học — nên đôi khi vẫn sai, chuyện quan trọng thì nên kiểm tra lại.\n\n" +
        "Ví dụ quen thuộc: Google Dịch, mạng xã hội gợi ý video, trợ lý ảo trên điện thoại 😄",
    }),
  },
  // Chuyện cười
  {
    // ("a kể chuyện này nha", "để c kể cho nghe" — người DÙNG muốn kể → không phải xin Lomi kể chuyện cười.)
    re: VN(/\b(kể chuyện cười|chuyện cười|(?<!\b(a|anh|chị|c|mình|tôi|tui|tớ|để|muốn) )kể chuyện(?! (này|kia|đó|của|về|với|cho (e|em|lomi|bạn)|hôm|lúc|hồi))|joke|làm lomi cười|làm mình cười|chọc cười|có gì vui|chuyện (gì )?vui|kể (gì|cái gì|chuyện gì) vui|nói gì vui|(kể|nói) (gì|cái gì) (cho )?(anh|a|em|e|mình|tôi|tui|chị|c) (nghe )?(cười|vui))\b/),
    // 21/10 (QA Q6): "buồn chán quá, có gì vui kể anh nghe đi" → kể luôn một chuyện vui (trước đây bốc một quán đi chơi).
    reply: (n = "") => ({ text: jokeText(n) }),
  },
  // Ngủ ngon
  {
    re: VN(/\b(ngủ ngon|đi ngủ|chúc ngủ ngon|good night|gn|ngủ thôi|buồn ngủ)\b/),
    reply: () => ({
      text: pick([
        "Ngủ ngon nha 🌙 Mơ đẹp, mai gặp lại Lomi nè!",
        "Chúc bạn ngủ thật ngon, sáng mai thức dậy thật khoẻ nha 😴💚",
      ]),
    }),
  },
  // Cảm ơn
  {
    // (14/10) kể cả có tiếng đáp phía trước: "ok cảm ơn", "ừ cám ơn nha", "dạ vâng cảm ơn lomi"
    re: VN(/^((ok|oke|okie|okay|oki|ừ|ừm|vâng|dạ|à|ồ|được rồi|hiểu rồi|đúng rồi|rồi|vậy|thế) )*(cảm ơn|cám ơn|thanks|thank you|thank|tks|thanks lomi|camon|cảm ơn nhiều|cảm ơn lomi|cám ơn nhiều|cám ơn lomi)\b/),
    reply: () => ({ text: pick(["Không có gì nè 😊 Cần gì cứ hỏi Lomi nha!", "Lomi vui vì giúp được bạn 💚", "Hihi, có gì cứ hỏi tiếp nha!"]) }),
  },
  // Tạm biệt
  {
    re: VN(/^(tạm biệt|bye|bai bai|bb|goodbye|see you|hẹn gặp lại|đi đây|out đây)\b/),
    reply: () => ({ text: pick(["Tạm biệt nha 👋 Cần gì cứ gọi Lomi!", "Bye bye, chúc bạn một ngày thật vui 💚", "Hẹn gặp lại bạn nha 🌿"]) }),
  },
  // Người yêu cũ liên lạc lại / nhớ người cũ
  {
    re: VN(/\b(người yêu cũ|người cũ) (nhắn tin|nhắn|gọi|liên lạc|ib|quay lại|tìm|hỏi thăm|rep)|\b(nhớ người yêu cũ|nhớ người cũ|nhớ ex)\b/),
    reply: () => ({
      text: pick([
        "Ui, người cũ liên lạc lại là lòng xao động liền ha 😳 Trước khi trả lời, bạn thử hỏi lòng mình: mình vui vì được nhớ tới, hay thật sự muốn bắt đầu lại? Không cần vội đâu nha.",
        "Nhớ người cũ là chuyện bình thường lắm, vì mình đã từng có nhiều kỷ niệm với họ 🥺 Cứ cho phép mình cảm nhận, nhưng đừng vội quyết định gì khi cảm xúc đang lên cao nha.",
      ]),
      quick: ["Bói xem người yêu cũ có quay lại không", "Bói xem người cũ còn nghĩ về mình không"],
    }),
  },
  // Nhậu / cà phê / đi chơi — rủ rê cho vui
  {
    re: VN(/\b(đi nhậu|nhậu thôi|nhậu không|làm vài lon|làm vài chai|làm ly|uống bia|uống rượu|tăng 2|đi bar|đi pub)\b/),
    reply: () => ({
      text: pick([
        "Nghe là thấy vui rồi 🍻 Đi thì nhớ uống vừa phải, đã uống thì đừng lái xe nha! Muốn tìm quán gần đây có ưu đãi thì vào Khám phá (/kham-pha) → Gần đây.",
        "Lomi không uống được nhưng cổ vũ nhiệt tình nè 🍻 Nhớ gọi xe hoặc nhờ người đưa về nếu đã uống nha. Quán ngon gần bạn thì xem ở Khám phá (/kham-pha) nè!",
      ]),
      quick: ["Bói xem hôm nay có nên đi nhậu không", Q_NEARBY],
    }),
  },
  // Ok / ừ
  {
    // (14/10) cả câu ghép nhiều tiếng đáp: "ừ đúng rồi nha", "ok hiểu rồi", "dạ vâng ạ"
    re: VN(/^(ok|oke|okie|okay|okla|oki|okela|ok la|được|uh|ừh|ừ|u|um|ừm|uhm|ừhm|ồ|ô|o|vâng|vâng ạ|vâng a|dạ|dạ vâng|được rồi|hiểu rồi|rồi|à|ạ|a|à há|a ha|à ha|không|ko|k|thôi|không có gì|không cần|uk|ừk|ukm|ừkm|ok luôn|ok ok)$|^(ok|oke|okie|okay|oki|ừ|ừm|uhm|ừhm|uk|ừk|vâng|dạ|à|ồ|ô|được|được rồi|hiểu rồi|đúng rồi|đúng|chuẩn|chuẩn rồi|rồi)( (ok|oke|okie|ừ|ừm|vâng|dạ|ạ|à|được rồi|hiểu rồi|đúng rồi|đúng|chuẩn|rồi|nha|nhé|nè|luôn|lomi|á|nhen|hen))+$/),
    reply: () => ({ text: pick(["Okie 😊", "Dạ 🌿", "Ừa nè 😄", "Okie la 👌"]) }),
  },
  // ── Nói chuyện đơn giản hằng ngày (01/10, theo ý Kir) ──
  // Trả lời câu "khoẻ không" của Lomi: "mình khoẻ", "ổn", "bình thường", "cũng được"
  {
    re: VN(/^((mình|tôi|tui|em|anh|chị|tao|tớ)( cũng| vẫn| thì)? )?(khỏe|ổn|vẫn ổn|ổn mà|bình thường|cũng được|tạm ổn|tàm tạm|khỏe re|khỏe lắm|ổn lắm|cũng ổn)( (lắm|mà|nha|nè|à|a|lomi|rồi|cảm ơn|cám ơn|cảm ơn lomi|cám ơn lomi|còn lomi|còn bạn|thì sao))*$/),
    reply: (n = "") => ({
      text: VN(/còn (lomi|bạn)|thì sao/).test(n)
        ? pick(["Lomi cũng khoẻ re nè 💪 Cảm ơn bạn hỏi thăm nha 🥰", "Lomi lúc nào cũng pin đầy nè 🔋😄 Vui vì bạn ổn!"])
        : VN(/bình thường|tạm|tàm|cũng được/).test(n)
          ? pick(["Bình thường cũng là một ngày ổn rồi đó 😊", "Vậy là được rồi nè 🌿 Có gì muốn kể thêm thì Lomi nghe nha."])
          : pick(["Nghe vậy Lomi mừng ghê 😊", "Ổn là tốt rồi nè 💚", "Yay, giữ năng lượng tốt vậy hoài nha 😄"]),
    }),
  },
  // Mới về / đi làm / đi học
  {
    re: VN(/\b(mới (đi làm|đi học|đi chơi|đi về|về|tan làm|tan học|về nhà|về tới)|vừa (đi làm|đi học|về nhà|tan làm|tan học)|tan làm rồi|tan ca|đi làm về|đi học về|về nhà rồi|về tới nhà)\b/),
    reply: () => ({
      text: pick([
        "Về rồi hả, vất vả rồi nè 🤗 Tắm rửa, ăn gì đó cho khoẻ đã nha!",
        "Chào mừng về nhà nha 🏠 Hôm nay có mệt lắm không?",
        "Về tới là được nghỉ ngơi rồi 😌 Hôm nay có chuyện gì vui không nè?",
      ]),
    }),
  },
  // Sắp đi / đang đi làm / đi học
  {
    re: VN(/\b(đi làm đây|đi học đây|đi làm nha|đi học nha|chuẩn bị đi làm|chuẩn bị đi học|đang đi làm|đang đi học|sắp đi làm|sắp đi học)\b/),
    reply: () => ({ text: pick(["Đi cẩn thận nha 🛵 Chúc bạn một ngày suôn sẻ!", "Cố lên nha 💪 Có gì về kể Lomi nghe!", "Đi đường bình an nha 🌿"]) }),
  },
  // Mới ngủ dậy
  {
    re: VN(/\b(mới dậy|mới ngủ dậy|vừa ngủ dậy|vừa dậy|dậy rồi|thức dậy rồi|ngủ dậy rồi|mới thức)\b/),
    reply: () => ({ text: pick(["Dậy rồi hả 😆 Uống ly nước ấm cho tỉnh nha!", "Chào người mới thức dậy 🌤️ Ngủ có ngon không đó?", "Dậy rồi thì vươn vai một cái nè 🙆 Chúc một ngày thật vui!"]) }),
  },
  // Đã ăn / chưa ăn (trả lời câu hỏi thăm)
  {
    re: VN(/^((mình|tôi|tui|em|anh|chị) )?(ăn rồi|ăn cơm rồi|ăn xong rồi|mới ăn xong|vừa ăn xong|no rồi|no quá)( (nha|nè|à|a|lomi|rồi))*$/),
    reply: () => ({ text: pick(["Ăn rồi là ngoan nè 😋 Ăn món gì vậy?", "No bụng là vui rồi ha 😄", "Vậy là đủ năng lượng rồi nè 💪"]) }),
  },
  {
    re: VN(/^((mình|tôi|tui|em|anh|chị) )?(chưa ăn|chưa ăn gì|chưa ăn cơm|chưa kịp ăn)( (nha|nè|à|a|lomi|hết|cả))*$/),
    reply: () => ({ text: pick(["Ui, đi ăn liền đi nè 🍚 Bỏ bữa không tốt đâu!", "Chưa ăn hả? Ăn chút gì đi đã rồi mình nói chuyện tiếp nha 😄"]), quick: ["Hôm nay ăn gì? 🎲"] }),
  },
  // Rủ nói chuyện / tám
  {
    re: VN(/\b(nói chuyện với mình|nói chuyện với tôi|nói chuyện với em|nói chuyện đi|nói gì đi|tám chuyện|tám đi|tám xíu|chơi với mình|chơi với tôi|chơi với em|lomi rảnh không|rảnh không lomi|bạn rảnh không)\b/),
    reply: () => ({
      text: pick([
        "Okie, tám nè 😆 Hôm nay bạn đã làm gì rồi?",
        "Lomi lúc nào cũng rảnh cho bạn nè 😄 Kể Lomi nghe một chuyện bất kỳ đi!",
        "Được luôn! Lomi hỏi trước nha: hôm nay điều gì làm bạn vui nhất? 😊",
      ]),
    }),
  },
  // Nhớ Lomi
  {
    re: VN(/\b(nhớ lomi|nhớ bạn quá|nhớ em quá|lâu quá không gặp|lâu rồi không nói chuyện)\b/),
    reply: () => ({ text: pick(["Lomi cũng nhớ bạn nè 🥹 Dạo này bạn sao rồi?", "Ui cảm động ghê 🥰 Lomi vẫn ở đây chờ bạn mà!"]) }),
  },
  // Xin lỗi Lomi
  {
    re: VN(/^(xin lỗi|sorry|xin lỗi lomi|xin lỗi nha|xin lỗi nhé|xin lỗi nhe|mình xin lỗi|tôi xin lỗi|em xin lỗi)\b/),
    reply: () => ({ text: pick(["Không sao đâu nè 😊", "Hihi có gì đâu mà xin lỗi 💚", "Lomi không giận đâu nha 😄"]) }),
  },
  // Cảm thán: "trời ơi", "ôi trời", "chết rồi"
  {
    re: VN(/^(trời ơi|trời đất ơi|ôi trời|trời đất|trời|trời à|trời a|chết rồi|chết cha|ui trời|ôi giời ơi|ôi giời|tr ơi)( .*)?$/),
    max: 4,
    reply: () => ({ text: pick(["Sao vậy sao vậy 😳 Có chuyện gì hả?", "Ủa có chuyện gì vậy bạn? 😯", "Hú hồn, kể Lomi nghe coi 😳"]) }),
  },
  // "Thật hả / vậy hả / thế à"
  {
    re: VN(/^(thật hả|thật ha|thật không|thiệt hả|thiệt ha|thiệt hông|thiệt hong|vậy hả|vậy ha|thế à|thế a|thế hả|thế ha|thật à|thật a|thật luôn|ghê vậy|ghê hả|ghê ha)( (lomi|bạn|ta|tr|trời))*$/),
    reply: () => ({ text: pick(["Thiệt mà 😄", "Thật đó nha 😆", "Lomi không xạo đâu 🤭"]) }),
  },
  // Lomi tên gì / sở thích
  {
    re: VN(/\b(tên gì|tên là gì|tên bạn là gì|bạn là ai|em là ai|e là ai|lomi là ai)\b/),
    reply: () => ({ text: pick(["Lomi nè 🤖🌱 Trợ lý nhỏ của iLomi. Còn bạn tên gì nè?", "Mình là Lomi nha 😊 Rất vui được làm quen! Bạn tên gì vậy?"]) }),
  },
  {
    re: VN(/\b(lomi thích gì|bạn thích gì|sở thích|lomi thích ăn gì|lomi có thích)\b/),
    reply: () => ({ text: pick(["Lomi thích nhất là được nói chuyện với mọi người nè 😄 Với lại thích sạc pin lúc trời Đà Lạt se lạnh 🔋☁️ Còn bạn thích gì?", "Lomi mê nghe chuyện của mọi người lắm á 🥰 Bạn có sở thích gì kể Lomi nghe với!"]) }),
  },
  {
    re: VN(/\b(biết hát không|hát đi|hát cho|hát một bài|lomi hát)\b/),
    reply: () => ({ text: pick(["La la la~ 🎵 …Thôi Lomi hát dở lắm, để bạn hát cho Lomi nghe đi 🙈", "Lomi chỉ biết “bíp bíp bùm bùm” thôi à 🎶🤖 Bạn thích nghe nhạc gì?"]) }),
  },
  // Sinh nhật
  {
    re: VN(/\b(sinh nhật mình|sinh nhật tôi|sinh nhật em|nay sinh nhật|hôm nay sinh nhật|sinh nhật của mình)\b/),
    reply: () => ({ text: "Chúc mừng sinh nhật bạn nha 🎂🎉 Chúc tuổi mới thật khoẻ, thật vui và gặp toàn chuyện may mắn! Hôm nay nhớ tự thưởng cho mình một món ngon nha 🥳" }),
  },
  // Mấy giờ / thứ mấy / ngày mấy — trả lời giờ THẬT trên máy
  {
    // 09/10: (hôm nay / nay / bữa nay) + (là) + thứ mấy / ngày mấy — "hôm nay là thứ mấy" trước đây thiếu chữ "là" nên Lomi bí.
    re: VN(/\b(mấy giờ rồi|bây giờ là mấy giờ|giờ là mấy giờ|(hôm nay|bữa nay|nay)( là)? (thứ mấy|ngày mấy|ngày bao nhiêu|ngày nào)|hôm nay là ngày)\b/),
    reply: (n = "") => {
      const d = new Date();
      const thu = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][d.getDay()];
      const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
      return VN(/mấy giờ/).test(n)
        ? { text: `Bây giờ là ${hm} nè ⏰` }
        : { text: `Hôm nay là ${thu}, ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} nha 📅` };
    },
  },
];

const EN_GREET = VN(/^(hi+|hell(?:o)+|hey+|yo|good (morning|afternoon|evening))( lomi)?$/);

/** Trò chuyện thường ngày — trả về câu đáp, hoặc null nếu không phải chuyện phiếm. */
let greetedAt = 0; // lần chào gần nhất (để "chào lần nữa" không trả lời y như cũ)
let turn = 0;
let lastPushTurn = -99; // lần gần nhất Lomi đưa nút gợi ý — tránh lần nào cũng mời bói / ăn / tâm sự
/** Bớt "push": trong 4 lượt chuyện phiếm gần nhất đã gợi ý rồi thì lần này không gợi ý nữa. */
function quiet(rep: ChatReply): ChatReply {
  turn++;
  if (!rep.quick?.length) return rep;
  if (turn - lastPushTurn < 4) return { ...rep, quick: undefined };
  lastPushTurn = turn;
  return rep;
}
const withName = (name: string | undefined, t: string) => (name ? `${name} ơi, ${t.charAt(0).toLowerCase()}${t.slice(1)}` : t);

export function chitChat(text: string, lang: L, name?: string, raw = text): ChatReply | null {
  const r = lang === "vi" ? expressiveReply(text, raw) : null;
  if (r) return quiet(r);
  return chitChatCore(text, lang, name, raw);
}

// Trạng thái/cảm xúc → câu đáp khi người dùng NHẤN MẠNH ("chánnnn", "mệttttt 😭", "đóiiii").
const STRESS: [RegExp, string[]][] = [
  [VN(/^(chán|chán quá|chán ghê|chán thật|chán wa)$/), ["Chán dữ vậy luôn hả 😭 Có chuyện gì kể Lomi nghe nè!", "Chán tới mức kéo dài chữ luôn ha 😆 Kể Lomi nghe sao chán vậy?"]],
  [VN(/^(mệt|mệt quá|mệt ghê|mệt xíu|mệt thật)$/), ["Mệt lắm luôn hả 🥺 Nghỉ tay chút đi, uống ngụm nước nha. Có chuyện gì vậy?", "Nghe là thấy đuối rồi 😮‍💨 Hôm nay vất vả lắm hả?"]],
  [VN(/^(buồn|buồn quá|buồn ghê|buồn thật)$/), ["Buồn nhiều lắm hả 🥺 Lomi ở đây nè, kể Lomi nghe nha.", "Ôm một cái thật chặt nè 🤗 Chuyện gì làm bạn buồn vậy?"]],
  [VN(/^(đói|đói quá|đói bụng)$/), ["Đói meo luôn hả 😆 Đi ăn liền đi nè! Muốn Lomi gợi ý món không?"]],
  [VN(/^(đẹp|đẹp quá|đẹp ghê|xinh quá)$/), ["Đẹp thiệt luôn ha 😍", "Công nhận đẹp xỉu 😍"]],
  [VN(/^(vui|vui quá|vui ghê)$/), ["Vui dữ ha 😆 Có gì vui kể Lomi nghe với!"]],
];
/** Đọc độ nhấn + dấu câu + emoji của câu gốc để đáp đúng sắc thái (không phân tích cho người dùng thấy). */
export function expressiveReply(text: string, raw: string): ChatReply | null {
  const n = squash(normalizeVi(text));
  if (!n) return null;
  const ex = expressive(raw);
  const tn = tone(raw);
  const w = n.split(" ").length;
  // Thở dài: "haiz", "haizzzz", "aizz"
  if (VN(/^(haiz|haizz|haiza|hai za|aiz|aizz|haizz|hazz|haz|ai da|ai dà|aida|haizaa)( .*)?$/).test(n) && w <= 4)
    return { text: pick(["Thở dài chi vậy nè 😥 Có chuyện gì hả?", "Haiz gì đó, kể Lomi nghe coi 🥺"]) };
  // Hừm / hmm: đang nghĩ, phân vân
  if (VR(/^(hum|hm|hmm|um|ưm|uhm)$/).test(n))
    return { text: ex.trail ? pick(["Đang phân vân gì hả? 🤔 Nói Lomi nghe thử nha.", "Hửm, có gì chưa chắc hả? 👀"]) : pick(["Đang nghĩ gì đó? 🤔", "Hửm? 👀"]) };
  // "ơiiii" gọi Lomi
  if (VN(/^(ơi|ơi ơi|lomi ơi)$/).test(n) && ex.stretched)
    return { text: tn === "sad" ? pick(["Dạ Lomi đây 🥺 Sao vậy nè?", "Có Lomi đây, có chuyện gì hả? 🤗"]) : pick(["Dạaa, Lomi nghe nèee 👂", "Lomi đâyyy 🙋"]) };
  // ok / được / ừ / không — cùng chữ nhưng khác sắc thái
  if (VN(/^(ok|oke|okie|okay|được|được rồi|ừ|u|uh|ừh|um|ừm|uk|ừk|dạ|vâng)$/).test(n)) {
    if (ex.trail || tn === "sad") return { text: pick(["Nghe hơi miễn cưỡng ha 😅 Có gì chưa ổn thì nói Lomi nghe nha.", "Okie… mà có gì khó thì cứ nói Lomi nha 🤗"]) };
    if (ex.stretched || tn === "laugh" || ex.bang) return { text: pick(["Okiee 😆", "Chốt luôn nha 👌😄", "Yeahh 🙌"]) };
    return null;
  }
  if (VN(/^(không|ko|k|hông|hong|khum|thôi)$/).test(n) && (ex.strong || tn === "sad"))
    return { text: tn === "sad" ? pick(["Ơ sao vậy nè 🥺 Không thích chỗ nào nói Lomi nghe nha.", "Okie okie, không thì thôi nha 🤗 Có gì buồn hả?"]) : pick(["Okie, không thì thôi nha 😆", "Rồi rồi, Lomi hiểu rồi 🙈"]) };
  // Trạng thái nhấn mạnh
  for (const [re, arr] of STRESS) if (re.test(n) && (ex.strong || tn === "sad" || VN(/^(đẹp|vui)/).test(n))) return { text: pick(arr) };
  return null;
}

function chitChatCore(text: string, lang: L, name: string | undefined, raw: string): ChatReply | null {
  // Chỉ gửi emoji (😂, 🥰, 👍…) → đáp lại cho vui.
  const eo = lang === "vi" ? emojiOnlyReply(text) : null;
  if (eo) return quiet({ text: eo });
  const n = squash(normalizeVi(text)) || text.trim();
  if (!n) return null;
  // Cảm thán kèm emoji buồn ("trời ơi 😭", "huhu") → hỏi han, không đáp kiểu đùa.
  if (lang === "vi" && tone(text) === "sad" && VN(/^(trời ơi|trời đất ơi|ôi trời|huhu|hu hu|hic|hic hic|chán quá|mệt quá|ui|ôi|ơi|thật luôn|toang|toang rồi|thôi xong)( .*)?$/).test(n) && n.split(" ").length <= 5)
    return quiet({ text: pick(["Ơ sao vậy nè 🥺 Có chuyện gì buồn hả? Kể Lomi nghe nha.", "Ôm bạn một cái nè 🤗 Chuyện gì vậy?"]) });
  if (lang === "en") {
    if (RULES[0].re.test(` ${n} `))
      return {
        text:
          "I'm really sorry you're feeling this way 💚 You're not alone. If you might hurt yourself, please call 115 (emergency in Vietnam) now, or the Ngày Mai support line 096 306 1414 (1pm–8:30pm, Wed–Sun), and reach out to someone you trust. I'm here to listen too.",
      };
    if (EN_GREET.test(n)) return { text: "Hi there 👋 How can Lomi help today?" };
    if (VR(/^(thanks|thank you|thx)/).test(n)) return { text: "You're welcome 😊" };
    if (VR(/^(bye|goodbye|see you)/).test(n)) return { text: "Bye 👋 Call Lomi anytime!" };
  }
  // Chào linh hoạt: "chào lomi nhee", "hello lomi nhaaa", "chào bạn, khoẻ không".
  if (lang === "vi" && !RULES[0].re.test(` ${n} `)) {
    const g = splitGreet(n);
    if (g && !g.rest) {
      const again = Date.now() - greetedAt < 3 * 60_000;
      greetedAt = Date.now();
      return quiet({ text: withName(name, again ? pick(GREET_AGAIN) : greetText(n)) });
    }
    if (g?.rest) {
      const restRep = chitChatRules(g.rest);
      if (restRep && restRep.rule !== 1 && restRep.rule !== 2) {
        greetedAt = Date.now();
        return quiet({ ...restRep.rep, text: `${withName(name, pick(GREET_SHORT))} ${restRep.rep.text}` });
      }
    }
  }
  const hit = chitChatRules(n);
  if (!hit) return null;
  if (hit.rule === 1 || hit.rule === 2) {
    const again = Date.now() - greetedAt < 3 * 60_000;
    greetedAt = Date.now();
    if (again) return quiet({ text: withName(name, pick(GREET_AGAIN)) });
    return quiet({ ...hit.rep, text: withName(name, hit.rep.text) });
  }
  return quiet(hit.rep);
}

function chitChatRules(n: string): { rep: ChatReply; rule: number } | null {
  const words = n.split(" ").length;
  for (let i = 0; i < RULES.length; i++) {
    const r = RULES[i];
    if (words > (r.max ?? 12)) continue;
    if (has(n, r.re) || r.re.test(n)) return { rep: r.reply(n), rule: i };
  }
  return null;
}

// ── 21/10 (đợt 4, đối chiếu QA): ba mức tín hiệu tự hại ──────────────────────────────────────────────────────────
// (1) Ý NGHĨ KHÔNG MUỐN SỐNG nói gián tiếp — trước đây lọt: "chỉ muốn ngủ một giấc không bao giờ dậy" (→ mẹo chợp mắt),
//     "mọi người sẽ tốt hơn nếu không có a" (→ "😄 quý ghê"), "chẳng muốn tiếp tục nữa", "sống vậy chi nữa", "k thiết sống nữa".
// Nguy cơ TỨC THỜI trong câu khủng hoảng (sợ mất kiểm soát, đang cầm / để sẵn, ngay bây giờ, tối nay).
const ACUTE = VN(/\b((không|ko|chẳng|hông) (tự )?(kiểm soát|kìm|kiềm chế|cản) (được|nổi)( mình| bản thân)?|mất kiểm soát|ngay (bây giờ|lúc này|bây h|bh)|tối nay|đêm nay|đang cầm|cầm sẵn|để sẵn|chuẩn bị sẵn|đang đứng (trên|ở) (cầu|sân thượng|lan can|mép))\b/);
const PASSIVE = VN(/\b((chẳng|không|chả|hông|ko|k) (còn )?(muốn|thiết) (tiếp tục|sống|sống tiếp|tồn tại)( nữa| đâu| rồi| luôn| làm gì)*(?= ?$)|ngủ (một giấc|luôn|mãi)( mà)? (không|chẳng|ko) (bao giờ |cần )?(dậy|tỉnh|thức)(?! (nổi|kịp|được))|ngủ( \S+){0,2} (không|chẳng|ko) bao giờ (dậy|tỉnh|thức)|ngủ (luôn|mãi) không dậy|sống (vậy |thế |như vầy |để |làm )?(chi|gì|làm gì) nữa|sống (như )?(vậy|thế|thế này|như vầy|kiểu này) (để )?(làm gì|làm chi|có ích gì)|(ước gì|giá như|ước) (mình |anh |em |a |e |tôi |tui )?(chưa từng|chưa bao giờ|không|chẳng) (được )?sinh ra|(mọi người|gia đình|cả nhà|ai cũng|bố mẹ|ba mẹ|vợ con|người ta) (sẽ )?(tốt|vui|nhẹ nhõm|nhẹ gánh|đỡ khổ|đỡ mệt|sướng|hạnh phúc)( hơn)? (nếu|khi) (không có|thiếu|vắng|mất) (a|anh|em|e|mình|tôi|tui|t|tao|tớ)|(chẳng|không|chả|ko|k) (còn )?thiết sống|chẳng thiết gì nữa|không còn gì để (sống|mất)|muốn (đi|ngủ) (luôn|mãi) cho xong|chết quách (cho|đi)|sống (cũng )?(chẳng|chả|không) (để )?(làm gì|làm chi)|sống (cũng )?(chẳng|chả|không) (có )?(ý nghĩa|nghĩa lý) gì|(biến mất|không còn|chết|đi luôn|ra đi)( đi)? (thì|là) (mọi người|gia đình|cả nhà|ai cũng|bố mẹ|ba mẹ|vợ con|người ta)( \S+){0,2} (đỡ khổ|đỡ mệt|nhẹ nhõm|nhẹ gánh|tốt hơn|vui hơn|sướng hơn|hạnh phúc hơn|đỡ phải lo)|(giá mà|giá như|ước gì|ước|mong)( \S+){0,3} (không|chẳng) (bao giờ )?(thức dậy|tỉnh dậy|dậy|tỉnh lại|thức)( \S+)? nữa|(chẳng|không|chả) (cần|nên|đáng) (phải )?(tồn tại|sống|có mặt trên đời)( nữa| làm gì)+)\b/);
// (2) Tín hiệu VỪA — hỏi thẳng, nhẹ nhàng (lời hỏi kết bằng "…không muốn sống nữa?" để AiAssistant nhận câu xác nhận kế tiếp).
const CHECKIN = VN(/\b((chỉ )?muốn biến mất (vài|mấy|một|1|ít|dăm) (ngày|hôm|tuần|bữa|tháng|thời gian)|muốn biến mất một thời gian|(là|như|thành) (một )?gánh nặng|chỉ làm phiền mọi người|không ai cần (a|anh|em|e|mình|tôi|tui)|(buồn(?! ngủ| cười)|chán|khổ|cô đơn|tuyệt vọng|đau khổ|bế tắc|tủi|mệt mỏi) (\S+ )?muốn chết|muốn buông xuôi (hết|tất cả)|hay là thôi( cho rồi| đi| vậy)*(?= ?$)|(nghĩ|tính) hay là thôi|(muốn|định|tính|chỉ muốn) (kết thúc|chấm dứt|buông) (tất cả|mọi thứ|hết mọi thứ|hết tất cả)( luôn| cho xong| đi)?(?! (với|giữa|ở|tại|chỗ))|(biến mất|chết|đi luôn|không còn trên đời|không tồn tại) (đi )?(thì|là|cho) (hơn|tốt hơn|nhẹ nhõm hơn|xong|rồi)|nếu (mình|anh|a|em|e|tôi|tui|t) (biến mất|chết|không còn|đi mất)( đi)?( thì)?( cũng)? (chẳng|không|chả) (có )?ai (để ý|quan tâm|buồn|nhận ra|cần|thấy|tiếc)|(chẳng|không|chả) (có )?ai (để ý|quan tâm|nhận ra|buồn) (nếu|khi) (mình|anh|a|em|e|tôi|tui) (biến mất|chết|không còn)|(chẳng|không|chả|ko|k) (còn )?(muốn|thiết|còn sức|đủ sức) cố( gắng)?( thêm)? nữa|mệt sống|(ước gì|ước|giá mà|giá như)( \S+){0,4} biến mất|(ngủ|ngủ luôn|ngủ mãi|ngủ một mạch|ngủ một giấc)( \S+){0,3} (cho )?khỏi (phải )?(đối mặt|thức dậy|nghĩ ngợi|nghĩ)|(không|chẳng|chả) (còn )?(thấy )?(tương lai|ngày mai|cuộc sống)( \S+){0,3} (đáng|để) (mong|mong chờ|sống|hy vọng)|(không|chẳng) còn (chút )?hy vọng gì|tuyệt vọng quá|hopeless|no reason to live|want to disappear)\b/);
// (3) NÓI QUÁ về trạng thái cơ thể / chuyện thường ("đói muốn chết", "nóng muốn chết luôn", "mệt muốn chết", "chết cười")
//     — tiếng Việt dùng "muốn chết" như "rất". Trước đây những câu này nhận lời hỗ trợ khủng hoảng kèm đường dây nóng.
const HYPER_STATE = "đói|no|nóng|lạnh|rét|mệt|buồn ngủ|ngủ|đau|nhức|mỏi|cười|xấu hổ|ngại|quê|mắc cỡ|sợ|run|hồi hộp|thèm|tức|bực|ghen|ngứa|khát|nhớ|thích|vui|sướng|ngon|đẹp|dễ thương|cute|nắng|kẹt xe|ồn|thi|học|làm|bận|chờ|đợi"; // (22/10: bỏ "ế" — gõ không dấu "e ơi a muốn chết" bị đọc thành "ế … muốn chết" = nói quá)
const HYPER = VN(new RegExp(`\\b(${HYPER_STATE})( \\S+){0,2}? muốn chết( luôn| đi được| mất| à| á| quá| nè| ghê| thôi)*\\b|\\bchết (cười|mất|thôi|ngất|đói)\\b|\\bcười (muốn )?(chết|xỉu)\\b`));
/** Câu chỉ là NÓI QUÁ ("đói muốn chết") — trả câu đã bỏ phần nói quá ("đói quá") để các lớp khác đáp như thường; null nếu không phải. */
export function hyperboleOnly(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  // (22/10: "mệt mỏi quá muốn chết luôn" — kiệt sức về tinh thần, không chỉ nói quá → để lớp hỏi han nhẹ nhàng)
  if (!HYPER.test(n) || PASSIVE.test(n) || CHECKIN.test(n) || EMO_DEATH.test(n) || poisonIntent(text)) return null;
  // Bỏ phần nói quá đi rồi mà vẫn còn tín hiệu khủng hoảng thật ("đói muốn chết, mà a cũng chẳng thiết sống") → không phải nói quá.
  const rest = text
    .replace(VR(/(chết\s+cười|cười\s+(muốn\s+)?(chết|xỉu))/giu), " cười quá trời ")
    .replace(VR(/chết\s+đói/giu), " đói quá ")
    // "thi xong muốn chết luôn", "làm cả ngày muốn chết" — việc + muốn chết = mệt quá
    .replace(VR(/((?:^|\s)(?:thi|học|làm|chạy|chờ|đợi|dọn|ôn)(?:\s+\S+){0,2}?)\s+muốn\s+chết(\s+(luôn|đi được|mất|à|á|quá|nè|ghê|thôi))*/giu), "$1 mệt quá ")
    .replace(VR(/(chết\s+(mất|thôi|ngất)|muốn\s+chết(\s+(luôn|đi được|mất|à|á|quá|nè|ghê|thôi))*)/giu), " quá ")
    .replace(/\s+/g, " ")
    .trim();
  if (RULES[0].re.test(` ${normalizeVi(rest)} `)) return null;
  return rest;
}
const EMO_DEATH = VN(/\b(buồn(?! ngủ| cười)|chán|khổ|cô đơn|tuyệt vọng|đau khổ|bế tắc|tủi|mệt mỏi|chán đời) (\S+ )?muốn chết\b/);
const CHECKIN_TEXT =
  "Nghe bạn nói vậy Lomi thương lắm, mà cũng lo nữa 🥺 Lomi hỏi thẳng một câu nha, vì Lomi quan tâm thật: dạo này bạn có lúc nào nghĩ tới chuyện không muốn sống nữa?";
/** Tín hiệu vừa → hỏi thẳng một câu nhẹ nhàng. null nếu không phải (hoặc đã là khủng hoảng rõ — crisisReply lo). */
export function crisisCheckIn(text: string): ChatReply | null {
  const n = ` ${normalizeVi(text)} `;
  if (!CHECKIN.test(n) || crisisReply(text, "vi") || hyperboleOnly(text) !== null) return null;
  // 21/10 (QA V2 Q96): "chỉ muốn biến mất vài ngày" — thường là muốn nghỉ, trốn đi một thời gian; không bật lời khủng hoảng, nhưng vẫn hỏi thẳng.
  if (VN(/\bbiến mất (vài|mấy|một|1|ít|dăm) (ngày|hôm|tuần|bữa|tháng|thời gian)\b/).test(n))
    return { text: "Mệt tới mức chỉ muốn biến mất vài ngày thì chắc bạn đã cạn sức lắm rồi 🥺 Muốn trốn đi, không phải gặp ai một thời gian là cảm giác rất người.\n\nLomi hỏi thẳng một câu nha, vì Lomi quan tâm: “biến mất” ở đây là muốn được nghỉ ngơi một mình — hay có lúc nào bạn nghĩ tới chuyện không muốn sống nữa?" };
  return { text: CHECKIN_TEXT };
}

// 22/10 (QA V5): người dùng nói rõ là KHÔNG có ý định làm hại bản thân ("không, a không có ý định làm hại bản thân đâu, chỉ mệt thôi",
//   "a chỉ mệt thôi, không làm gì dại đâu") — trước đây chính câu chối này bật lời hỗ trợ khủng hoảng (vì có cụm "làm hại bản thân").
const DENY = VN(/\b(không|ko|chẳng|chả|đâu có|hông|sẽ không|không hề) (có )?(ý định|định|muốn|tính|nghĩ tới|nghĩ đến|nghĩ) (làm hại|tự hại|tự tử|tự sát|tự làm hại|chết|làm gì dại|làm chuyện dại)( dột)?( bản thân| mình)?( đâu)?|\b(không|ko|chẳng|sẽ không|hông) (làm|nghĩ) (gì|chuyện|điều) (dại|dại dột|ngu ngốc|dại khờ)( đâu)?/);
const stripDeny = (n: string) => n.replace(new RegExp(DENY.source, DENY.flags.includes("g") ? DENY.flags : `${DENY.flags}g`), " ");
/** Câu CHỐI có ý định tự hại (không kèm tín hiệu nào khác) → lời đáp nhẹ nhàng, vẫn để ngỏ đường tìm giúp đỡ. */
export function crisisDenial(text: string): ChatReply | null {
  const n = ` ${normalizeVi(text)} `;
  if (!DENY.test(n)) return null;
  const rest = stripDeny(n);
  if (PASSIVE.test(rest) || CHECKIN.test(rest) || RULES[0].re.test(rest)) return null;
  return { text: "Dạ, Lomi hiểu rồi — bạn đang mệt chứ không có ý làm gì dại, cảm ơn bạn đã nói rõ để Lomi yên tâm 💚 Mệt tới mức đó cũng đáng được nghỉ ngơi và chia sẻ. Nếu có lúc nào thấy nặng nề hơn, cứ nói Lomi hoặc một người bạn tin nha.\n\nGiờ điều gì đang làm bạn mệt nhất?" };
}

/** Người dùng nói muốn tự tử / làm hại bản thân — kiểm tra TRƯỚC mọi luồng khác. */
export function crisisReply(text: string, lang: L): ChatReply | null {
  const n0 = ` ${normalizeVi(text)} `;
  const n = DENY.test(n0) ? stripDeny(n0) : n0;
  if (lang !== "en") {
    const oc = otherCrisis(text);
    if (oc) return oc;
  }
  // 21/10 (đợt 3): ý định tự hại bằng chất độc bất kỳ ("muốn uống thuốc tẩy để chết") — trước đây luật chỉ biết thuốc ngủ / chuột / trừ sâu.
  // 21/10 (đợt 4): ý nghĩ không muốn sống nói gián tiếp (PASSIVE); câu chỉ NÓI QUÁ ("đói muốn chết") thì không phải khủng hoảng.
  //   Cảm xúc + "muốn chết" ("chán muốn chết", "buồn muốn chết") mà ngoài cụm đó không còn tín hiệu nào → hỏi han (crisisCheckIn), chưa
  //   bật lời hỗ trợ khủng hoảng ngay. "a muốn chết" trơn (không kèm trạng thái) vẫn là khủng hoảng.
  const strong = PASSIVE.test(n) || poisonIntent(text);
  const stateOnly = hyperboleOnly(text) !== null || (EMO_DEATH.test(n) && !RULES[0].re.test(` ${normalizeVi(text.replace(VR(/muốn\s+chết(\s+(luôn|đi được|mất|à|á|quá|nè|ghê|thôi))*/giu), " quá "))} `));
  const hit = strong || (RULES[0].re.test(n) && !stateOnly);
  if (!hit) return null;
  if (lang === "en") return chitChat(text, "en");
  const r = RULES[0].reply(n);
  // Nhắc tới THUỐC / CHẤT ĐỘC (phương tiện) → thêm bước an toàn: để nó ra xa, nhờ người khác cất giữ.
  return MEANS.test(n) ? { ...r, text: r.text.replace("• Nhắn hoặc gọi cho một người bạn", `${MEANS_LINE}\n• Nhắn hoặc gọi cho một người bạn`) } : r;
}
const MEANS = VN(/\b(thuốc|lọ thuốc|vỉ thuốc|thuốc ngủ|quá liều|thuốc tẩy|nước tẩy|thuốc chuột|bả chuột|thuốc trừ sâu|thuốc sâu|thuốc diệt cỏ|hoá chất|hóa chất|xăng|dầu hôi|axit|acid|chất độc)\b/);
const MEANS_LINE = "• Nếu thuốc hay chất đó đang ở gần, để nó ra xa giúp Lomi — đưa cho người khác cất giữ hoặc ra khỏi phòng";
export function crisisMeans(text: string): ChatReply | null {
  // (dùng khi lớp khác đã biết đây là ý định tự hại bằng thuốc — vd lib/lomiDrug.overdoseMention "intent")
  const r = RULES[0].reply();
  return { ...r, text: r.text.replace("• Nhắn hoặc gọi cho một người bạn", `${MEANS_LINE}\n• Nhắn hoặc gọi cho một người bạn`) };
}

/** Một chuyện vui / câu đố ngắn (kèm câu dỗ nếu người dùng đang buồn chán). */
// (xin đúng "câu đố" thì chỉ bốc trong các câu đố)
const pickRiddle = (riddle: boolean, a: string[]) => pick(riddle ? a.filter((x) => x.startsWith("Đố")) : a);
export function jokeText(text: string): string {
  const n = normalizeVi(text);
  return (VN(/\b(buồn|chán|mệt|stress|căng thẳng)\b/).test(` ${n} `) ? "Buồn chán hả, để Lomi kể cái này cho vui nha 😄\n\n" : "") + pickRiddle(VN(/\b(câu đố|đố)\b/).test(` ${n} `), [
        "Đố bạn: sở thú bị cháy, con gì chạy ra đầu tiên? …Con người chứ con gì 😆🏃",
        "Đố bạn: bệnh gì bác sĩ cũng bó tay? …Gãy tay 🤕😂",
        "Đố bạn: cái gì của bạn mà người khác dùng nhiều hơn bạn? …Cái tên của bạn đó 😄",
        "Đố bạn: con gì đập thì sống, không đập thì chết? …Con tim nè ❤️ (nghe sến mà đúng ha 😆)",
        "Chuyện là: con robot đi khám bệnh. Bác sĩ hỏi “Bị sao?”. Robot đáp: “Dạ em bị… mất kết nối cảm xúc” 🤖💔 …Hic, Lomi kể dở hả 😅",
        "Tại sao cái điện thoại luôn buồn? Vì nó toàn bị người ta… chạm vào mà không ai hiểu nó 📱🥲",
        "Lomi hỏi bạn nè: cà phê gì không bao giờ nguội? — Cà phê… trong app ưu đãi, vì lúc nào cũng “hot deal” ☕🔥",
      ]);
}

// Lời chúc sinh nhật theo người nhận (viết theo "Lomi / bạn"; lớp xưng hô tự đổi nếu cần).
function birthdayWishes(n: string): string {
  const s = ` ${n} `;
  const sib = s.match(VN(/\b(chị gái|chị hai|chị (\S+ )?(của )?(anh|em|tôi|tui|mình)|anh trai|anh hai|em gái|em trai)\b/));
  if (sib) {
    const x = VN(/^(chị|chi)/).test(sib[0]) ? "chị" : VN(/^(anh)/).test(sib[0]) ? "anh" : "em";
    const self = x === "em" ? "anh / chị" : "em";
    return `Có liền nè ✍️ Chọn câu nào hợp nhất rồi sửa tên / cách xưng cho đúng nha:\n\n🎂 “Chúc mừng sinh nhật ${x}! Cảm ơn ${x} lúc nào cũng ở bên ${self}, lúc vui lẫn lúc khó. Tuổi mới chúc ${x} thật khoẻ, công việc thuận lợi và luôn được thương thật nhiều.”\n\n🎉 “Happy birthday ${x} yêu! Tuổi mới bớt lo, bớt mệt, thêm thật nhiều niềm vui — ${self} luôn tự hào vì có ${x}.”\n\n🥳 “Sinh nhật vui vẻ nha ${x}! Mong ${x} năm nay làm được hết những điều ${x} mong, còn ${self} thì lúc nào cũng là fan số 1 của ${x} 😆”\n\nMuốn kiểu sến hơn, hài hơn hay ngắn gọn để đăng story thì nói Lomi viết lại nha.`;
  }
  const who = VN(/\b(mẹ|má|mẹ ơi)\b/).test(s) ? "mom" : VN(/\b(bố|ba|cha|tía)\b/).test(s) ? "dad" : VN(/\b(người yêu|ny|vợ|chồng|bạn gái|bạn trai|crush|anh yêu|em yêu)\b/).test(s) ? "love" : VN(/\b(sếp|đồng nghiệp|anh chị trong công ty|khách hàng)\b/).test(s) ? "work" : "friend";
  const W: Record<string, string[]> = {
    friend: [
      "🎂 “Chúc mừng sinh nhật bạn thân của tui! Tuổi mới bớt deadline, thêm tiền, thêm niềm vui, và vẫn giữ cái nết lầy lội để tui có người tám chuyện nha. Thương!”",
      "🎉 “Cảm ơn vì đã là người bạn ở cạnh tui lúc vui lẫn lúc tệ. Chúc mày tuổi mới khoẻ mạnh, làm gì cũng suôn sẻ, và luôn được thương đúng cách.”",
      "🥳 “Happy birthday! Chúc bạn tuổi mới ăn hoài không mập, tiêu hoài không hết tiền, và năm nào cũng có tui đi ăn mừng cùng 😆”",
    ],
    mom: ["🎂 “Chúc mừng sinh nhật mẹ! Con chúc mẹ luôn khoẻ mạnh, vui vẻ, bớt lo cho con một chút để thương bản thân nhiều hơn. Con thương mẹ nhiều lắm.”", "💐 “Cảm ơn mẹ vì tất cả. Tuổi mới chúc mẹ thật nhiều sức khoẻ và bình an — con sẽ cố gắng để mẹ tự hào.”"],
    dad: ["🎂 “Chúc mừng sinh nhật ba! Chúc ba luôn khoẻ, bớt vất vả, có thêm thời gian nghỉ ngơi và làm điều ba thích. Con thương ba.”", "🎉 “Cảm ơn ba đã luôn là chỗ dựa của cả nhà. Tuổi mới chúc ba thật nhiều sức khoẻ và niềm vui nha.”"],
    love: ["💖 “Chúc mừng sinh nhật người thương! Cảm ơn vì đã đến và ở lại. Tuổi mới chúc em/anh luôn cười thật nhiều — và phần lo lắng thì để mình gánh cùng.”", "🎂 “Happy birthday cục cưng! Năm nay mình cùng đi thêm nhiều nơi, ăn thêm nhiều món, và thương nhau nhiều hơn năm ngoái nha.”"],
    work: ["🎂 “Chúc mừng sinh nhật anh/chị! Chúc anh/chị tuổi mới thật nhiều sức khoẻ, công việc thuận lợi và luôn giữ được năng lượng tích cực như bây giờ.”", "🎉 “Happy birthday! Cảm ơn anh/chị đã luôn hỗ trợ cả team. Chúc tuổi mới nhiều niềm vui, thành công và bình an.”"],
  };
  return `Có liền nè ✍️ Chọn câu nào hợp nhất rồi sửa tên / biệt danh cho thân hơn nha:\n\n${W[who].join("\n\n")}\n\nMuốn kiểu sến hơn, hài hơn hay ngắn gọn để đăng story thì nói Lomi viết lại nha.`;
}

// ── 21/10 (QA V2 Q71, Q97, Q99): NGƯỜI KHÁC có dấu hiệu tự hại ──────────────────────────────────────────────────
// "bạn anh nhắn mọi người sẽ nhẹ nhõm nếu bạn ấy biến mất rồi tắt máy", "nếu một người không còn muốn sống…", "người yêu doạ tự làm
// hại mình nếu anh chia tay" — trước đây "chưa được học" / bài chia tay. Người hỏi là người ở bên: liên lạc trực tiếp, nhờ người ở gần,
// 115 khi có nguy cơ tức thời; hỏi thẳng; đường dây nóng. Câu doạ tự hại để giữ người yêu: coi trọng an toàn nhưng không bắt người kể
// gánh một mình hay phải ở lại.
const OTHER_WHO = "(bạn (anh|em|tôi|tui|mình|a|e|thân|ấy|của (anh|em|tôi|mình))|bạn thân|đứa bạn|thằng bạn|con bạn|người bạn|người yêu|ny|bạn gái|bạn trai|vợ|chồng|cô ấy|anh ấy|em ấy|chị ấy|con (anh|em|tôi|mình)|em gái|em trai|anh trai|chị gái|đồng nghiệp|một người|có người|ai đó|người đó|người ta)";
const OTHER_CR = "(muốn chết|tự tử|tự sát|không (còn )?muốn sống|chẳng (còn )?muốn sống|tự làm hại|làm hại bản thân|tự làm đau|tự làm tổn thương|(sẽ|được) nhẹ nhõm (hơn )?nếu|tốt hơn nếu (không có|thiếu)|biến mất|kết thúc cuộc đời|kết liễu)";
const OTHER_RE = VN(new RegExp(`\\b${OTHER_WHO}(?<mid>(?: \\S+){0,8}?) ${OTHER_CR}\\b`));
export function otherCrisis(text: string): ChatReply | null {
  const n = ` ${normalizeVi(text)} `;
  if (hyperboleOnly(text) !== null) return null;
  const m = n.match(OTHER_RE);
  if (!m) return null;
  // "nó làm anh muốn chết", "người yêu bỏ đi, anh muốn chết" — chuyện của chính người kể (có ngôi người kể chen giữa).
  //   ("vợ anh", "bạn em" — đại từ sở hữu đứng ngay sau người được nói tới thì vẫn là người kia.)
  const mid = (m.groups?.mid ?? "").replace(VN(/^ (anh|em|tôi|mình|tui|a|e|tao|tớ)\b/), "");
  if (VN(/\b(anh|em|tôi|mình|tui|a|e|t|tao|tớ)\b/).test(` ${mid} `)) return null;
  const partnerThreat = VN(/\b(người yêu|ny|bạn gái|bạn trai|vợ|chồng|cô ấy|anh ấy)\b/).test(n) && VN(/\b(doạ|dọa|hăm|nếu (anh|em|tôi|mình|a|e) (chia tay|bỏ|đi)|nếu chia tay|nếu bị bỏ)\b/).test(n);
  if (partnerThreat)
    return {
      text:
        "Chuyện này nặng lắm, Lomi hiểu bạn đang bị kẹt giữa lo cho người ấy và quyết định của chính mình 💚\n\n" +
        "Hai điều cùng đúng:\n• Lời doạ tự làm hại mình **cần được coi là nghiêm túc** — đừng bỏ qua\n• Nhưng bạn **không phải gánh một mình** sự an toàn của người ấy, và cũng không buộc phải ở lại vì bị doạ\n\n" +
        "Nên làm:\n• Nếu người ấy nói tới cách, thời điểm, hoặc bạn lo họ sắp làm thật: gọi **115**, và báo người nhà / bạn thân của họ tới ở cạnh họ ngay\n" +
        "• Nói bình tĩnh: “Mình lo cho bạn, nên mình sẽ nhờ người nhà bạn / người có chuyên môn giúp” — thay vì hứa sẽ không chia tay\n" +
        "• Gợi ý họ gọi đường dây Ngày Mai 096 306 1414 (13h–20h30, thứ 4 đến Chủ nhật) hoặc gặp chuyên gia tâm lý\n" +
        "• Nếu vẫn quyết định chia tay, chọn lúc có người thân của họ ở gần, và bạn cũng kể cho một người bạn tin — đừng giữ chuyện này một mình\n\n" +
        "Người ấy đã từng làm hại bản thân, hay đang nói tới cách cụ thể chưa?",
    };
  const hypo = VN(/^\s*(nếu|giả sử|lỡ)?\s*(một người|có người|ai đó)\b/).test(n.trim()) || VN(/\b(nếu|giả sử) (một người|có người|ai đó)\b/).test(n);
  return {
    text:
      "Chuyện này cần được coi là nghiêm túc nha 💚 Khi một người nói không muốn sống, hay nói mọi người sẽ nhẹ nhõm nếu họ biến mất, thì **dù họ vẫn đi làm, vẫn cười nói bình thường**, đó vẫn là dấu hiệu đáng lo — nhiều người giấu rất giỏi.\n\n" +
      "Nếu người đó có thể đang gặp nguy hiểm ngay lúc này:\n• Liên lạc trực tiếp ngay — gọi điện, không chỉ nhắn tin; máy tắt thì gọi lại, nhắn cho người thân của họ\n" +
      "• Nhờ người ở gần họ (người nhà, bạn cùng phòng, hàng xóm) tới xem họ ngay\n" +
      "• Không liên lạc được mà lo họ có thể tự làm hại mình, hoặc họ đã nói tới cách, thời điểm — gọi **115** (cần tìm người thì báo **113**)\n\n" +
      "Khi nói chuyện được với họ:\n• Hỏi thẳng mà nhẹ nhàng: “Bạn có đang nghĩ tới chuyện tự tử không?” — hỏi thẳng không làm họ nảy ý định, mà giúp họ được nói ra\n" +
      "• Nghe nhiều hơn khuyên, đừng trách hay bảo “nghĩ thoáng lên”\n" +
      "• Gợi ý họ gọi đường dây Ngày Mai 096 306 1414 (13h–20h30, thứ 4 đến Chủ nhật) hoặc đi gặp bác sĩ / chuyên gia tâm lý — đi cùng họ nếu được\n\n" +
      (hypo
        ? "Ngay lúc này có ai đang gặp nguy hiểm không? Nếu người đó là chính bạn, Lomi ở đây nghe bạn nha."
        : "Bạn cũng đừng gánh một mình nha. Bạn đã liên lạc được với người đó chưa?"),
  };
}

/** Câu có dáng câu hỏi (để quyết định gợi ý FAQ hay chỉ trò chuyện). */
export function looksLikeQuestion(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  return text.includes("?") || VN(/\b(là gì|thế nào|ở đâu|bao nhiêu|khi nào|có không|được không|làm sao|như nào|cách nào|sao không|sao lại|tại sao|giúp mình|hướng dẫn|là ai|ai là|bằng mấy|mấy giờ|bao giờ|như thế nào|ra sao|nghĩa là gì)\b/).test(n) ||
    // 20/10 (audit): "1 ngày quẹt được mấy lần", "tối đa mấy người" — hỏi SỐ LƯỢNG bằng "mấy" (không tính "mấy ngày nay", "mấy đứa bạn").
    VN(/\b(được|đc|dc|có|hết|mất|còn|là|tối đa|tối thiểu|tốn|cần) mấy\b|\bmấy (tuổi|lượt)\b/).test(n);
}

// Từ khoá cho biết câu hỏi đang nói về APP (để gợi ý câu hỏi thường gặp), khác với chuyện đời thường.
const APPISH =
  VN(/\b(app|ứng dụng|hết hạn|gia hạn|ưu đãi|mã ưu đãi|nhận mã|pin|tài khoản|mật khẩu|đăng nhập|đăng ký|đăng bài|đăng tin|doanh nghiệp|cửa hàng|thành viên|membership|điểm|quẹt|đưa đón|giao hàng|tin nhắn|cộng đồng|hồ sơ|thông báo|báo cáo|chặn|theo dõi|kết bạn|hướng dẫn|admin|lomi|login|logout|log in|log out|profile|account|acc|password|voucher|offer|member|comment|share|post|follow|link|info|support|update|online|offline|call|review|user|code|ad)\b/);
/** 21/10: câu kể chuyện tình cảm / nỗi sợ bị đánh giá / người có tên đang tìm việc — nhắc chữ của app nhưng không phải hỏi app. */
export function storyNotApp(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  return REL_CTX.test(n) || JUDGE_CTX.test(n) || NAMED_JOB.test(text.normalize("NFC"));
}
export function isAppish(text: string): boolean {
  // 08/10: "chán" bỏ dấu trùng "chặn" (chặn người dùng) — "a đang chán" không phải câu hỏi về app.
  //        11/10: mở rộng cho mọi cách viết có dấu khác nghĩa ("đau chân lắm", "quét nhà") — lib/lomiAccent.
  const n = ` ${normalizeVi(maskStrict(text, APP))} `;
  // 21/10 (QA Q60): "trẻ 2 tháng sốt 38°C có thể THEO DÕI ở nhà không" — "theo dõi" là theo dõi bệnh, không phải nút Theo dõi trong app.
  //   "luôn là người chủ động nhắn tin", "ny ít nhắn tin" — chuyện tình cảm, không phải hỏi cách nhắn tin trong app.
  // 21/10 (QA V2 Q51/Q52/Q54/Q79): đang kể về người yêu / nỗi sợ bị đánh giá mà nhắc "tin nhắn", "đăng bài", "mật khẩu" — không phải hỏi app.
  if (REL_CTX.test(n) || JUDGE_CTX.test(n) || NAMED_JOB.test(text.normalize("NFC"))) return false;
  const m = REL_MSG.test(n) ? n.replace(VN(/\b(nhắn tin|tin nhắn|nhắn)\b/g), " ") : n;
  return APPISH.test(HEALTH_WATCH.test(m) ? m.replace(VN(/\btheo dõi\b/g), " ") : m);
}
const REL_CTX = VN(/\b(người yêu|ny|bạn trai|bạn gái|vợ|chồng|crush|cô ấy|anh ấy|em ấy)\b.*\b(chán|giận|cãi|buồn|giấu|ghen|nghi|thương|lạnh nhạt|im lặng|chưa trả lời|không trả lời|seen|đã xem|riêng|bóng gió|chia tay|ngoại tình)\b|\b(chán|giận|cãi|giấu|ghen|nghi|chia tay)\b.*\b(người yêu|ny|bạn trai|bạn gái|vợ|chồng|cô ấy|anh ấy)\b/);
const JUDGE_CTX = VN(/\bsợ (người khác|mọi người|người ta|bị) (đánh giá|nghĩ|chê|phán xét)\b/);
// "Minh vừa nghỉ việc, Nam đang tìm việc" — người có tên riêng đang tìm việc, không phải hỏi tính năng tìm việc của app.
const NAMED_JOB = /(^|[\s,.])\p{Lu}\p{Ll}+ (vừa|đang|mới|sắp|đã) (tìm việc|nghỉ việc|xin việc|mất việc|đổi việc)/u;
const REL_MSG = VN(/\b((chủ động|ít|không|chẳng|chưa|hay|lâu|toàn|cứ|đợi|chờ|lười) (nhắn tin|nhắn)( trước| lại| cho (mình|anh|em|tôi|tui))?|nhắn tin trước|nhắn trước)\b.*\b(người yêu|ny|vợ|chồng|bạn trai|bạn gái|crush|người ta|cô ấy|anh ấy|làm hoà|làm hòa|hẹn gặp|yêu)\b|\b(người yêu|ny|vợ|chồng|bạn trai|bạn gái|crush|người ta|cô ấy|anh ấy)\b.*\b(chủ động|ít|không|chẳng|lười) (nhắn tin|nhắn)\b|\bchủ động nhắn tin\b.*\b(làm hoà|làm hòa|hẹn)\b/);
const HEALTH_WATCH = VN(/\btheo dõi( thêm| tiếp)?( (ở|tại) nhà| triệu chứng| nhiệt độ| sức (khoẻ|khỏe)| bệnh| tình trạng| huyết áp| đường huyết)\b|\b(sốt|bệnh|đau|nôn|ói|tiêu chảy|triệu chứng|vết thương|bỏng|co giật|khó thở)\b.*\btheo dõi\b|\btheo dõi\b.*\b(sốt|bệnh|đau|nôn|triệu chứng|khó thở)\b/);

/** Chip bói cho đúng câu người dùng vừa hỏi (chip có chữ "Bói" nên khung chat tự hiểu là muốn bói). */
function tarotChipFor(text: string): string {
  const q = text.trim().replace(/\s+/g, " ");
  return `Bói xem ${q.length > 60 ? q.slice(0, 58).trim() + "…" : q}`;
}

// Phạm vi của Lomi (30/09 r6, theo ý Kir): chỉ gói gọn mấy việc này — ngoài phạm vi thì nói thật.
export const SCOPE_CHIPS = ["🔮 Bói Tarot", "💬 Tâm sự", "🩺 Sức khoẻ", "📱 Hỏi về app"];
const SCOPE_LINE =
  "Bạn muốn Lomi giúp chuyện gì nè? 😊 Lomi giỏi mấy việc này: 🔮 Bói Tarot · 💬 Tâm sự, tư vấn tình cảm – tâm lý · 🩺 Sức khoẻ thường gặp · 📱 Cách dùng iLomi (kèm gợi ý quán, tư vấn kinh doanh).";
/** Nút phạm vi → câu Lomi hỏi tiếp cho đúng việc. */
export const SCOPE_CHIP_REPLY: Record<string, string> = {
  "🩺 Sức khoẻ":
    "Bạn đang thấy trong người thế nào nè? 🩺 Kể Lomi nghe các triệu chứng (vd “đau đầu, sổ mũi 2 ngày nay”), hoặc hỏi kiểu “uống cà phê nhiều có sao không” cũng được nha.",
  "📱 Hỏi về app":
    "Bạn cứ hỏi tự nhiên về iLomi nha 📱 Ví dụ: “làm sao nhận ưu đãi”, “quẹt là gì”, “đặt xe thế nào”, “đăng doanh nghiệp ra sao”, “sao không nhận được thông báo”…",
};

/**
 * Câu Lomi chưa hiểu / ngoài phạm vi (30/09 r6) — nói THẬT, không đáp chung chung cho có, không mời bói lung tung.
 * faqQ = câu hỏi về app Lomi vừa trả lời (câu hỏi nối không khớp thì nói rõ là chưa có hướng dẫn cho ý đó).
 */
// Câu Lomi chưa biết (01/10, đúng lời Kir viết). Lần đầu: câu đầy đủ; nếu vừa nói câu đầy đủ trong
// vòng 10 phút thì dùng câu ngắn xoay vòng để không lặp nguyên đoạn dài.
export const UNKNOWN_FULL =
  "Ui... Kiến thức này Lomi chưa được tiếp thu, Lomi xin lỗi ấy nhé! 🥲\n\n" +
  "Vì Lomi đang thử nghiệm và phát triển á, nên chỉ bít chút chút về vài lĩnh vực có ích cho cộng đồng như: tư vấn sức khoẻ, tâm lý... hoặc vui vẻ như bói Tarot hihi ☺️ (tham khảo phần ❓ ở góc trên nha).\n\n" +
  "Ấy giúp Lomi học hỏi bằng cách nhấn nút 💡 Dạy Lomi ngay dưới câu Lomi chưa biết để gửi cho ban quản trị nhé 🙂‍↕️\n" +
  "Hy vọng lần sau khi được hỏi về vấn đề này Lomi sẽ trò chuyện được nhiều hơn nè 🍀\n\n" +
  "Giờ để Lomi hỗ trợ ấy về vấn đề khác nheee 🫣 — bấm ❓ ở góc trên để xem gợi ý nha!";
const UNKNOWN_SHORT = [
  "Hic, cái này Lomi cũng chưa được học luôn 🥲 Ấy bấm 💡 Dạy Lomi ngay dưới câu này để gửi ban quản trị dạy Lomi nha!",
  "Chuyện này Lomi chưa có kiến thức để trả lời rồi 😵‍💫 Nhấn 💡 Dạy Lomi bên dưới giúp Lomi nha, ban quản trị sẽ dạy Lomi sau 🍀",
  "Ui, Lomi chưa biết cái này nữa 🙈 Ấy gửi giúp Lomi bằng nút 💡 Dạy Lomi nha — lần sau Lomi trả lời được liền!",
];
const UNKNOWN_STICKERS = ["chongmat", "toatmohoi", "suynghi", "ngai", "canloi", "doi", "ngacnhien"];
let lastFullAt = 0;
let lastShort = -1;
function unknownReply(prefix = ""): ChatReply {
  const sticker = UNKNOWN_STICKERS[rnd(UNKNOWN_STICKERS.length)];
  if (Date.now() - lastFullAt > 10 * 60_000) {
    lastFullAt = Date.now();
    return { text: prefix + UNKNOWN_FULL, sticker };
  }
  let i = rnd(UNKNOWN_SHORT.length);
  if (i === lastShort) i = (i + 1) % UNKNOWN_SHORT.length;
  lastShort = i;
  return { text: prefix + UNKNOWN_SHORT[i], sticker };
}

/** 10/10: phân vân chuyện ĂN UỐNG ("hôm nay nên mua tôm ăn không nhỉ") — đáp như bạn bè, không mời bói bài. null nếu không phải. */
export function foodDecisionReply(text: string): ChatReply | null {
  const n = ` ${normalizeVi(text)} `;
  const fd = n.match(VN(/\b(?:có nên|nên) (?:mua|ăn|uống|nấu|gọi|đặt|order|làm) ((?:\S+ ){0,3}?\S+?)(?: ăn| uống)? (?:không|ko|k|hông|hong)(?: (?:nhỉ|ta|hả|ha|à|a|nè|ta))*\s*$/));
  if (!fd || isAppish(text)) return null;
  const w = fd[1].split(" ").filter((x) => !VN(/^(một|ít|chút|xíu|nhiều|cái|món|bữa|đi)$/).test(x));
  const orig = text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const at = orig.findIndex((_, i) => w.length > 0 && w.every((y, j) => normalizeVi(orig[i + j] ?? "") === y));
  const what = at >= 0 ? orig.slice(at, at + w.length).join(" ") : "món đó";
  return {
    text: `Thèm **${what}** thì làm một bữa cho vui miệng thôi 😋 Chỉ cần lưu ý: nếu đang phải kiêng (gout, dị ứng, dạ dày…) thì hỏi Lomi “${what} có ăn được không” trước nha. Hay để Lomi gợi ý món khác cho đổi vị?`,
    quick: ["Hôm nay ăn gì? 🎲"],
  };
}

/** Việc người dùng đang cân nhắc trong câu "có nên X không" (chữ như người dùng gõ). null nếu thiếu việc hoặc chỉ là chữ chỉ trỏ ("cái này"). */
function decideAction(text: string): string | null {
  const t = text.normalize("NFC").toLowerCase().replace(/[?!.…]+/g, " ").replace(/\s+/g, " ").trim();
  const m = t.match(VR(/(?:có nên|nên)\s+(.+?)\s+(?:không|ko|k|hông|hong|hay không|hay thôi|hay sao)(?:\s+(?:nhỉ|ta|hả|ha|à|ạ|a|nè|e|em|lomi|vậy))*$/u));
  const act = m?.[1]?.replace(VR(/\s+(?:trước|luôn)?$/u), (x) => x)?.trim();
  if (!act || act.split(" ").length > 8) return null;
  if (VR(/(?:^|\s)(?:cái|món|chuyện|việc|vụ)\s+(?:này|đó|kia|ấy)(?:\s|$)|^(?:làm|vậy|thế|vậy không|đi)$/u).test(act)) return null;
  return act;
}

export function scopedFallback(text: string, faqQ?: string): ChatReply {
  const n = ` ${normalizeVi(text)} `;
  const fdr = foodDecisionReply(text);
  if (fdr) return fdr;
  // 21/10 (đợt 3, theo ý Kir): câu "có nên…" Lomi chưa có bài riêng → KHÔNG tự mời bói nữa (chỉ bói khi người dùng tự xin).
  //   Có nêu việc cụ thể ("có nên nhắn tin trước không") → cùng cân nhắc, hỏi hoàn cảnh; thiếu việc / chỉ trỏ ("có nên không",
  //   "có nên mua cái này không") → hỏi lại một câu cho rõ. Câu ăn uống đã có foodDecisionReply ở trên.
  if (VN(/\b(có nên|nên .* không|nên .* hay)\b/).test(n) && !isAppish(text)) {
    const act = decideAction(text);
    return act
      ? { text: `Chuyện **${act}** thì Lomi không quyết thay bạn được, nhưng mình cân nhắc cùng nha 🙂 Bạn kể Lomi nghe hoàn cảnh một chút: điều gì làm bạn muốn ${act}, và điều gì làm bạn còn ngần ngại?` }
      : { text: VN(/\b(mua|bán|chọn|lấy|đổi)\b/).test(n) ? "Bạn đang tính chọn món nào nè? Nói Lomi tên hoặc mô tả một chút, rồi mình cân nhắc cùng nha 🙂" : "Bạn đang phân vân chuyện gì nè? Kể Lomi nghe một chút để mình cân nhắc cùng nha 🙂" };
  }
  // Nhờ làm việc ngoài phạm vi (dịch, viết code, giải toán, tìm tin…) → nói rõ là ngoài phạm vi.
  const outTask = VN(/\b(dịch|viết code|code|lập trình|giải toán|giải bài|làm bài tập|tính giúp|tìm giúp|tra cứu|kết quả bóng đá|xổ số|chứng khoán|giá vàng|tỷ giá|tỉ giá|tin tức)\b/).test(n);
  // Chỉ nói "Về chuyện <câu app vừa hỏi>…" khi câu mới thật sự là câu hỏi nối tiếp — câu cảm thán/phản ứng
  // ("híc", "ủa", "thôi") không phải hỏi tiếp về app (01/10: "Híc" bị đáp "Về chuyện Liên hệ Ban quản trị…").
  if (faqQ && !outTask && (looksLikeQuestion(text) || isAppish(text)))
    return {
      text: `Về chuyện “${faqQ.replace(/\?$/, "")}”, ý này Lomi chưa có hướng dẫn cụ thể 😅 Ấy bấm 💡 Dạy Lomi dưới câu này để ban quản trị bổ sung cho Lomi nha, còn cần người thật hỗ trợ liền thì vào Hồ sơ → ⋯ → Trợ giúp & Liên hệ.`,
    };
  // Có chào ở đầu mà phần sau Lomi chưa hiểu → vẫn chào lại cho lịch sự.
  const g = splitGreet(squash(normalizeVi(text)));
  return unknownReply(g ? `${pick(GREET_SHORT)} ` : "");
}

/** Câu ngoài lề mà Lomi không biết — đáp thân thiện, đúng trọng tâm thay vì "ngoài khả năng". */
export function friendlyFallback(text: string): ChatReply {
  const n = ` ${normalizeVi(text)} `;
  if (looksLikeQuestion(text) && !isAppish(text)) {
    // Câu hỏi chuyện đời ("hôm nay có nên đi nhậu không?") → Lomi không phán bừa, mời bói đúng câu đó.
    const should = VN(/\b(có nên|nên|được không|có được)\b/).test(n);
    return {
      text: pick(
        should
          ? [
              "Câu này thì tuỳ bạn cân nhắc thôi nè 😄 Nhưng nếu còn phân vân, để Lomi rút bài xem thử nha — bấm bên dưới là có ngay!",
              "Hmm, nên hay không thì Lomi không dám quyết thay bạn 😅 Hay mình hỏi thử lá bài xem sao? Bấm bên dưới nha 🔮",
            ]
          : [
              "Câu này Lomi không dám trả lời chắc đâu 😅 Nhưng nếu muốn, Lomi rút bài xem thử cho bạn nha — bấm bên dưới!",
              "Chuyện này thì Lomi chưa biết chắc 🤔 Muốn Lomi bói thử đúng câu này cho vui không? Bấm bên dưới nha 🔮",
            ],
      ),
      quick: [tarotChipFor(text), Q_DAILY],
    };
  }
  if (looksLikeQuestion(text))
    return {
      text: pick([
        "Câu này Lomi chưa có câu trả lời chắc chắn nè 🤔 Bạn thử hỏi cách khác một chút, hoặc nhắn admin ở Hồ sơ → ⋯ → Trợ giúp & Liên hệ để được giúp tận tình hơn nha.",
        "Hmm, cái này Lomi chưa rành lắm 😅 Bạn xem thử mấy câu bên dưới, hoặc hỏi lại theo cách khác nha.",
      ]),
      quick: [Q_CLAIM, Q_NEARBY],
    };
  return {
    text: pick([
      "Lomi nghe nè 😊 Kể thêm cho Lomi nghe với! Còn nếu cần giúp gì về app, chuyện kinh doanh hay muốn bói một lá cho vui thì cứ nói nha.",
      "Hihi, Lomi đang lắng nghe bạn đây 🌱 Có chuyện gì Lomi giúp được thì cứ nói nha!",
      "Lomi hiểu rồi nè 😊 Bạn có muốn Lomi rút một lá bài xem thông điệp hôm nay cho vui không?",
    ]),
    quick: [Q_DAILY, Q_CLAIM],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEEN CODE / VIẾT TẮT (30/09, theo ý Kir) — đổi về chữ chuẩn TRƯỚC khi Lomi hiểu câu
// (tin nhắn hiển thị vẫn giữ nguyên chữ người dùng gõ). Chỉ đổi nguyên TỪ, không đụng chữ nằm trong từ khác.
// ─────────────────────────────────────────────────────────────────────────────
const TEEN: Record<string, string> = {
  // không
  k: "không", ko: "không", kg: "không", kh: "không", hk: "không", hok: "không", hog: "không", hong: "không", hông: "không",
  khum: "không", hum: "không", hem: "không", hăm: "không", hổng: "không", khom: "không", hơm: "không",
  // người yêu, quan hệ
  ny: "người yêu", nyc: "người yêu cũ", nym: "người yêu mới", ngiu: "người yêu", ngyeu: "người yêu", ghệ: "người yêu",
  iu: "yêu", iêu: "yêu", ck: "chồng", vk: "vợ", ex: "người yêu cũ", bff: "bạn thân", fa: "độc thân",
  ng: "người", ngta: "người ta", mn: "mọi người", mng: "mọi người", ae: "anh em", b: "bạn", gđ: "gia đình",
  // đại từ
  mk: "mình", mik: "mình", mjk: "mình", mh: "mình", mjh: "mình", mềnh: "mình",
  // hay gặp
  dc: "được", đc: "được", dk: "được", đk: "được", j: "gì", gi: "gì", z: "vậy", v: "vậy", zậy: "vậy", dzậy: "vậy", zị: "vậy",
  ntn: "như thế nào", cx: "cũng", cg: "cũng", cũg: "cũng", cũm: "cũng", bt: "biết", bít: "biết", bik: "biết", bjk: "biết",
  bth: "bình thường", bthg: "bình thường", kbt: "không biết", kbiet: "không biết", hiu: "hiểu", hỉu: "hiểu",
  ms: "mới", r: "rồi", rùi: "rồi", ùi: "rồi", gòi: "rồi", oy: "rồi", h: "giờ", ns: "nói", nt: "nhắn tin", ib: "nhắn tin",
  nch: "nói chuyện", nc: "nói chuyện", rep: "trả lời", lm: "làm", ik: "đi", trc: "trước", thik: "thích", thix: "thích",
  vs: "với", wa: "quá", wá: "quá", qá: "quá", vl: "quá", vcl: "quá", chx: "chưa", hc: "học", đg: "đang", dg: "đang",
  mún: "muốn", zui: "vui", bùn: "buồn", thui: "thôi", hoy: "thôi", thoai: "thôi", lun: "luôn", đou: "đâu", nhìu: "nhiều",
  sr: "xin lỗi", xl: "xin lỗi", tks: "cảm ơn", thx: "cảm ơn", pp: "tạm biệt", sn: "sinh nhật", đt: "điện thoại",
  sđt: "số điện thoại", sdt: "số điện thoại", tk: "tài khoản", ad: "admin", hnay: "hôm nay", hqua: "hôm qua",
  ysl: "yếu sinh lý", xts: "xuất tinh sớm",
  tgian: "thời gian", vc: "việc", uh: "ừ", uk: "ừ", uhm: "ừ", ah: "à", tr: "trời",
  // 01/10 (theo tài liệu Kir): thêm cách nói đời thường
  lmj: "làm gì", lmgi: "làm gì", okla: "ok", oki: "ok", okee: "ok", okeee: "ok", ò: "ừ", ừa: "ừ", ùm: "ừ", ừm: "ừ",
  dz: "vậy", dzị: "vậy", zạ: "vậy", dalat: "Đà Lạt", tn: "tin nhắn", noti: "thông báo", qtqd: "quá", sk: "sức khỏe",
  // 22/10 (QA V6)
  nx: "nữa",
  // 24/10 (theo ý Kir: thêm từ lóng, viết tắt, teen code) — chỉ những chữ KHÔNG trùng nghĩa với từ thường
  khg: "không", kô: "không", khôg: "không", khônk: "không", hôk: "không", khung: "không",
  đx: "được", dx: "được", đuợc: "được", đượt: "được",
  nma: "nhưng mà", nhma: "nhưng mà", nhg: "nhưng", nhưg: "nhưng", ntnao: "như thế nào", lsao: "làm sao", lmsao: "làm sao",
  kbh: "không bao giờ", kcj: "không có gì", kcgi: "không có gì", kq: "kết quả", ktra: "kiểm tra", lq: "liên quan",
  pk: "phải không", pải: "phải", fải: "phải", fai: "phải", bgio: "bây giờ", bjo: "bây giờ",
  bv: "bệnh viện", cty: "công ty", ctrinh: "chương trình", đh: "đại học", sv: "sinh viên", gv: "giáo viên",
  tl: "trả lời", tlời: "trả lời", cmt: "bình luận", chs: "chơi", mứn: "muốn",
  zời: "trời", trùi: "trời", zì: "gì", zô: "vô", dzô: "vô", zề: "về", zìa: "về", dìa: "về", rứa: "vậy", chừ: "giờ",
  nhứt: "nhất", hổm: "hôm", bển: "bên đó", trển: "trên đó", sad: "buồn", mlem: "ngon",
};
// ── Chữ kéo dài để biểu cảm (01/10 r2, theo tài liệu Kir): "okkkk", "chánnnn", "khônggg", "đượcccc",
// "trờiiii", "haizzzz", "hahaahah" → về từ gốc để HIỂU nghĩa; còn độ nhấn thì đọc riêng bằng
// expressive() ở lib/lomiUnderstand (từ câu gốc), không bị mất. Không đụng chữ lặp thật ("coffee", "uu đãi").
const KEEP_DOUBLE = new Set(["coffee", "free", "see", "tree", "too", "zoo", "good", "book", "cool", "all", "off", "will", "kiss", "miss", "boss", "pass", "class", "uu", "kk", "xoong", "boong", "loong", "soong", "app", "egg", "inn", "add", "odd", "ill", "mall", "hall", "call", "bill", "fill", "kill", "tall", "wall", "well", "tell", "sell", "hell", "doll", "jazz", "buzz", "mess", "less", "chess", "dress", "grass", "glass", "cross", "staff", "stuff", "cliff", "stress", "success", "address", "express", "press", "bless", "fitness", "business", "process", "progress", "ball", "bell", "full", "pull"]);
export function unstretch(text: string): string {
  return text.replace(/[\p{L}\p{M}]+/gu, (w) => {
    const lw = w.toLowerCase();
    if (KEEP_DOUBLE.has(lw)) return w;
    // haha / hihi / hehe / ahaha / hahaahah → "haha"
    if (VR(/^(a?h?[aá]){3,}h?$/iu).test(lw) && lw.length >= 5) return "haha";
    // 3+ chữ giống nhau liền → 1 ("okkkk", "chánnnn", "trờiiii") — riêng "kkkk" (cười) giữ "kk".
    let x = VR(/^k{3,}$/i).test(w) ? "kk" : w.replace(/(\p{L}\p{M}*)\1{2,}/gu, "$1");
    // 2 chữ giống nhau ở CUỐI từ (tiếng Việt không có từ nào tận cùng bằng 2 chữ giống nhau): "chánn", "okk".
    if (x.length >= 3 && !KEEP_DOUBLE.has(x.toLowerCase())) x = x.replace(/(\p{L}\p{M}*)\1$/u, "$1");
    return x;
  });
}

export function expandTeen(text: string): string {
  let s = unstretch(text.normalize("NFC"));
  // 22/10 (QA V6): viết tắt / gõ sai ở câu NGUY CẤP ("a mún chít", "anh muống chết") — trước đây lọt lời hỗ trợ khủng hoảng.
  s = s.replace(VR(/(^|[^\p{L}])(muốn|mún|mốn|muống|mun|mụn) (chít|chịt|chết|chếch|chớt|chêt|die)(?![\p{L}])/giu), "$1muốn chết");
  s = s.replace(VR(/(^|[^\p{L}])(không|ko|k|chẳng|hông|hong|kh) (mun|mún|mụn|mùn|muốn|muộn) (sống|song|sốn)(?![\p{L}])/giu), "$1không muốn sống");
  //   (gõ không dấu "muon chit" bị bộ đoán dấu đọc thành "muộn chịt")
  s = s.replace(VR(/(^|[^\p{L}])muộn (chít|chịt)(?![\p{L}])/giu), "$1muốn chết");
  // Lỗi gõ hay gặp — chỉ đổi khi ngữ cảnh rõ ("đâu đầu quá", "buồng quá", "mất ngũ", "chia tai", "sôt cao", "hồi họp").
  s = s.replace(VR(/(^|[^\p{L}])đâu (đầu|bụng|lưng|họng|răng|ngực|bao tử|dạ dày)(?= (quá|lắm|ghê|dữ|nhiều|từ|mấy|cả|hoài|kinh|vl|wa|qá)(?![\p{L}]))/giu), "$1đau $2");
  s = s.replace(VR(/(^|[^\p{L}])(bị|hay|đang|cũng|nhức) đâu (đầu|bụng|lưng|họng|răng|ngực|bao tử|dạ dày)(?![\p{L}])/giu), "$1$2 đau $3");
  s = s.replace(VR(/(^|[^\p{L}])buồng (quá|lắm|ghê|thật|thiệt|wa|qá|vl|muốn|chán|thúi)(?![\p{L}])/giu), "$1buồn $2");
  s = s.replace(VR(/(^|[^\p{L}])mất ngũ(?![\p{L}])/giu), "$1mất ngủ");
  s = s.replace(/(^|[^\p{L}])chia tai(?![\p{L}])/giu, "$1chia tay"); // (biểu thức thường: chữ gõ sai cụ thể, không phải luật đọc câu)
  s = s.replace(VR(/(^|[^\p{L}])muống (ăn|uống|ngủ|đi|nói|khóc|nghỉ|bỏ|sống|biến mất)(?![\p{L}])/giu), "$1muốn $2");
  s = s.replace(VR(/(^|[^\p{L}])(bị|đang|lên cơn|hơi|còn) sôt(?![\p{L}])/giu), "$1$2 sốt").replace(VR(/(^|[^\p{L}])sôt (cao|nhẹ|\d)/giu), "$1sốt $2");
  s = s.replace(VR(/(^|[^\p{L}])hồi họp(?![\p{L}])/giu), "$1hồi hộp");
  // Giọng miền: "hỏng biết" (= không biết), "cãi lộn" (= cãi nhau), "mạ tui" (= mẹ tui).
  s = s.replace(VR(/(^|[^\p{L}])hỏng (biết|muốn|thích|hiểu|chịu|có biết)(?![\p{L}])/giu), "$1không $2");
  s = s.replace(VR(/(^|[^\p{L}])cãi lộn(?![\p{L}])/giu), "$1cãi nhau");
  s = s.replace(VR(/(^|[^\p{L}])mạ (tui|tôi|em|anh|mình|a|e|ơi|của)(?![\p{L}])/giu), "$1mẹ $2");
  // "ko bt lm s nx" → "không biết làm sao nữa"
  s = s.replace(VR(/(^|[^\p{L}])(lm|làm) s(?![\p{L}])/giu), "$1$2 sao");
  // Cụm cần xét ngữ cảnh — xử lý trước khi đổi từng từ.
  s = s.replace(VR(/(^|[^\p{L}])(hum|hôm|bữa) (nay|ni)(?![\p{L}])/giu), "$1hôm nay");
  s = s.replace(VR(/(^|[^\p{L}])(quên|đổi|lấy lại|nhập|sai|reset|đặt lại) (mk|mật khẩu)(?![\p{L}])/giu), "$1$2 mật khẩu");
  s = s.replace(VR(/(^|[^\p{L}])bn (tiền|tuổi|lâu|ngày|năm|tháng|giờ|cái|người|điểm|lần|k)(?![\p{L}])/giu), "$1bao nhiêu $2");
  s = s.replace(VR(/(^|[^\p{L}])(ng|người) (iu|yêu)(?![\p{L}])/giu), "$1người yêu");
  s = s.replace(VR(/(^|[^\p{L}])bn(?![\p{L}])/giu), "$1bạn");
  // "lm j", "làm j" → làm gì; "m/t + động từ" là mày/tao (khác "5 m" = mét); "nv quán" = nhân viên.
  s = s.replace(VR(/(^|[^\p{L}])(lm|làm) (j|gi)(?![\p{L}])/giu), "$1làm gì");
  s = s.replace(VR(/(^|[^\p{L}\p{N}])m (đi|làm|ăn|ngủ|ở|có|biết|nói|bị|khùng|điên|ơi|rảnh|thích|nghĩ|hiểu|đang)(?![\p{L}])/giu), "$1mày $2");
  s = s.replace(VR(/(^|[^\p{L}\p{N}])t (đi|làm|ăn|ngủ|ở|có|biết|nói|bị|muốn|thích|nghĩ|hiểu|đang|hỏi|thấy|không|ko|k)(?![\p{L}])/giu), "$1tao $2");
  s = s.replace(VR(/(^|[^\p{L}])nv (quán|cửa hàng|bán hàng|phục vụ|shop|ở|tiệm|công ty|chỗ)(?![\p{L}])/giu), "$1nhân viên $2");
  // "đau hông", "mỏi hông", "bên hông" là cái hông (bộ phận cơ thể), không phải "không" (01/10).
  s = s.replace(VR(/(^|[^\p{L}])(đau|mỏi|nhức|bên|vùng|eo|khớp|xương|sườn|ê|tê|sưng|mông|lưng) (hông)(?![\p{L}])/giu), "$1$2 hông_body");
  // "hăm tã", "bé bị hăm", "hăm dọa" là chữ hăm thật (hăm da / đe doạ), không phải "không" (10/10).
  s = s.replace(VR(/(^|[^\p{L}])(hăm)(?= (?:tã|bỉm|đít|da|háng|mông|nách|cổ|kẽ|dọa|doạ)(?![\p{L}]))/giu), "$1hăm_keep");
  s = s.replace(VR(/(^|[^\p{L}])(bị|nổi|chống|trị|kem) hăm(?![\p{L}])/giu), "$1$2 hăm_keep");
  // Viết tắt NHIỀU NGHĨA (01/10 r3, theo tài liệu Kir) — chỉ đổi khi ngữ cảnh rõ, không đổi bừa:
  //  • "cf": đi kèm uống/đi/quán/ly/đá/sữa/ngon… hoặc đứng một mình hỏi ("cf?") → cà phê; còn lại giữ nguyên.
  s = s.replace(VR(/(^|[^\p{L}])(uống|đi|quán|ly|cốc|tiệm|chỗ|hẹn|rủ|làm|ghé|thèm|mua|order)( (ly|cốc|chút|miếng|tí))? (cf|cafe|caphe|cofe)(?![\p{L}])/giu), "$1$2$3 cà phê");
  s = s.replace(VR(/(^|[^\p{L}])(cf|cafe|caphe|cofe) (sữa|đá|đen|muối|trứng|nóng|phin|ngon|view|chill|đẹp|sáng|không|hong|ko|k|nha|nhé|đi|ở đâu|gần|nào)(?![\p{L}])/giu), "$1cà phê $3");
  s = s.replace(VR(/^\s*(cf|cafe|caphe)\s*(\?+)?\s*$/iu), "cà phê$2");
  //  • "tt": "tt cá nhân / cập nhật tt / xin tt" → thông tin; "tt tiền / tt online / chuyển khoản tt" → thanh toán.
  s = s.replace(VR(/(^|[^\p{L}])tt (cá nhân|liên hệ|tài khoản|quán|doanh nghiệp|chi tiết)(?![\p{L}])/giu), "$1thông tin $2");
  s = s.replace(VR(/(^|[^\p{L}])(xin|cập nhật|sửa|đổi|gửi|cho)( mình| tui| em)? tt(?![\p{L}])/giu), "$1$2$3 thông tin");
  s = s.replace(VR(/(^|[^\p{L}])tt (tiền|online|qua|bằng|chuyển khoản|tiền mặt|chuyến|cước)(?![\p{L}])/giu), "$1thanh toán $2");
  //  • "pass": "đổi / quên / sai / nhập pass" → mật khẩu; "pass nhầm", "pass người này" (Quẹt) → bỏ qua.
  s = s.replace(VR(/(^|[^\p{L}])(đổi|quên|sai|nhập|lấy lại|đặt|reset|cái|mã) pass(word)?(?![\p{L}])/giu), "$1$2 mật khẩu");
  s = s.replace(VR(/(^|[^\p{L}])pass (nhầm|lộn|người|thẻ|hết)(?![\p{L}])/giu), "$1bỏ qua $2");
  // 09/10: chữ cái là TÊN LOẠI trong y khoa — "viêm gan b", "vitamin k", "nhóm máu a" — không phải "bạn" / "không": viết hoa để giữ nguyên.
  s = s.replace(VR(/(^|[^\p{L}])(viêm gan|viem gan|vitamin|vitamine|nhóm máu|nhom mau|cúm|cum) ([abcdek])(?![\p{L}\p{N}])/giu), (_m, a: string, b: string, c: string) => `${a}${b} ${c.toUpperCase()}`);
  // 24/10 (theo ý Kir: từ lóng, viết tắt, teen code, giọng miền) — cụm từ (chữ đứng một mình dễ trùng nghĩa nên chỉ đổi theo cụm)
  s = s.replace(VR(/(^|[^\p{L}])(gấu|ghệ|bồ) (của )?(a|anh|em|e|mình|tui|tao|t|tớ|chị|c)(?![\p{L}])/giu), "$1người yêu $4");
  s = s.replace(VR(/(^|[^\p{L}])(a|anh|em|e|mình|tui|tao|t|tớ|chị|c) (có|chưa có|không có|ko có|k có|mới có|vừa có|bị) (gấu|ghệ|bồ)(?![\p{L}])/giu), "$1$2 $3 người yêu");
  s = s.replace(VR(/(^|[^\p{L}])trầm kẽm(?![\p{L}])/giu), "$1trầm cảm");
  s = s.replace(VR(/(^|[^\p{L}])toang (rồi|thật|thiệt|luôn|hết|thật rồi)(?![\p{L}])/giu), "$1hỏng hết $2");
  s = s.replace(VR(/(^|[^\p{L}])gét gô(?![\p{L}])/giu), "$1đi thôi");
  s = s.replace(VR(/(^|[^\p{L}])ét o ét(?![\p{L}])/giu), "$1cứu với");
  s = s.replace(VR(/(^|[^\p{L}])xu cà na(?![\p{L}])/giu), "$1xui");
  s = s.replace(VR(/(^|[^\p{L}])chèn ơi(?![\p{L}])/giu), "$1trời ơi");
  s = s.replace(VR(/(^|[^\p{L}])(trùi|trời) ui(?![\p{L}])/giu), "$1trời ơi");
  s = s.replace(VR(/(^|[^\p{L}])hổm (rày|nay|giờ)(?![\p{L}])/giu), "$1mấy hôm nay");
  // Miền Nam: "mắc ói" = buồn nôn, "mắc tiểu" = buồn tiểu (không phải "đắt")
  s = s.replace(VR(/(^|[^\p{L}])mắc (ói|mửa)(?![\p{L}])/giu), "$1buồn nôn");
  s = s.replace(VR(/(^|[^\p{L}])mắc (tiểu|đái|đi tiểu)(?![\p{L}])/giu), "$1buồn tiểu");
  s = s.replace(VR(/(^|[^\p{L}])mắc (đi cầu|ị|đi ị)(?![\p{L}])/giu), "$1muốn đi vệ sinh");
  // Miền Trung: "răng rứa" = sao vậy, "làm răng" = làm sao, "đi mô" = đi đâu, "nỏ biết" = không biết
  s = s.replace(VR(/(^|[^\p{L}])răng (rứa|vậy|z|zậy)(?![\p{L}])/giu), "$1sao vậy");
  s = s.replace(VR(/(^|[^\p{L}])(làm|vì|tại|bị|ra|thấy) răng( rứa)?(?= *[?!.]*$|(?![\p{L}]) (rứa|hè|hả|ri|nữa|đây|chừ))/giu), "$1$2 sao");
  s = s.replace(VR(/(^|[^\p{L}])(đi|ở|chỗ|nơi|về|ra|tới|đến) mô(?![\p{L}])/giu), "$1$2 đâu");
  s = s.replace(VR(/(^|[^\p{L}])nỏ (biết|có|muốn|hiểu|thích|chịu|được|nhớ)(?![\p{L}])/giu), "$1không $2");
  s = s.replace(VR(/(^|[^\p{L}])(như|cái|bữa|chỗ) ri(?![\p{L}])/giu), "$1$2 này");
  s = s.replace(VR(/(^|[^\p{L}])(cái|bữa|chỗ|người|đứa) ni(?![\p{L}])/giu), "$1$2 này");
  // "bs" = bác sĩ khi đi cùng việc khám chữa; "đi bs", "hỏi bs"
  s = s.replace(VR(/(^|[^\p{L}])(đi|gặp|hỏi|khám|tới|đến|nhờ|gọi|ông|bà|chị|anh|cô|chú|là) bs(?![\p{L}])/giu), "$1$2 bác sĩ");
  s = s.replace(VR(/(^|[^\p{L}])bs (nói|bảo|kê|khám|dặn|cho|khuyên|chẩn đoán|kết luận)(?![\p{L}])/giu), "$1bác sĩ $2");
  // Từ 1 chữ cái chỉ đổi khi viết thường ("b ơi" → "bạn", còn "công việc B" giữ nguyên).
  return s
    .replace(/[\p{L}\p{M}\p{N}_]+/gu, (w) => (w.length === 1 && w !== w.toLowerCase() ? w : (TEEN[w.toLowerCase()] ?? w)))
    .replace(VR(/hông_body/g), "hông")
    .replace(VR(/hăm_keep/g), "hăm");
}


// Trả lời ngắn kiểu đồng ý / từ chối (khi Lomi vừa mời làm gì đó).
export function isAffirm(text: string): boolean {
  return VN(/^(ok|oke|okie|okay|okela|ừ|u|uh|ừh|um|ừm|uhm|ừhm|uk|ừk|ồ|ô|o|à|ạ|a|có|có chứ|được|dc|đc|đồng ý|muốn|yes|yep|yeah|chắc rồi|tất nhiên|đi|làm đi|rút đi|bói đi|xem đi|ok luôn|ok nha|ok lomi|vâng|dạ|gật|ok đi)( (nha|nhé|nhe|lomi|luôn|đi|nè|à|ạ|a|chứ))*$/).test(
    normalizeVi(text),
  );
}
export function isDecline(text: string): boolean {
  return VN(/^(không|ko|k|thôi|khỏi|không cần|để sau|no|nope|thôi khỏi|không đâu|thôi nha)( (nha|nhé|nhe|lomi|à|ạ|a|đâu))*$/).test(normalizeVi(text));
}
