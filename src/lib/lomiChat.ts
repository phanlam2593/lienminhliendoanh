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
  if (/buoi sang|good morning/.test(n)) return "morning";
  if (/buoi trua/.test(n)) return "noon";
  if (/buoi chieu|good afternoon/.test(n)) return "afternoon";
  if (/buoi toi|good evening/.test(n)) return "evening";
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
  /^(xin chao|chao buoi (sang|trua|chieu|toi)|chao xin|chao|hi hi|hi lo|hi|hello|helo|hellu|hellou|helu|he lo|he lu|he nho|hey yo|hey|alo|halo|ha lo|yo|sup|cheo|good (morning|afternoon|evening)|morning|gut mo ninh|gud morning|moning|bonjour|annyeong|konnichiwa|ni hao|hola|lomi oi|oi lomi)\b/;
// Từ chào "yếu" (dễ trùng câu khác: "ôi buồn quá", "ê sao kì vậy") — chỉ tính là chào khi đứng một mình.
const GREET_WEAK = /^(e|hu|lo)\b/;
const FILLER = new Set(
  "lomi ban em anh chi nha nhe nhen nghen ne na a ah ha he hen ho do day oi ca nha moi nguoi minh toi tui cau bro sis nhau iu yeu cute xinh dep be con vui ve hom nay nay buoi sang trua chieu toi lai lan nua nhieu dang yeu cua tro ly ai thi cung there everyone all guys guy friend fen ban oi admin ad mn ae anh em cac".split(" "),
);
// Thán từ / gọi trước câu chào ("ê chào", "ơi hello", "ủa hi") — bỏ đi rồi mới xét từ chào (01/10 r3).
const GREET_LEAD = /^(e|ey|oi|ua|a|o|nay|yo|lomi|lomi oi|em oi|ban oi|anh oi|chi oi|bro)\s+(?=(xin chao|chao|hi|hello|helo|hellu|he lo|hey|alo|halo|good)\b)/;
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
    .map((w) => (NO_SQUASH.has(w) ? w : w.replace(/([aeiouy])\1+$/, "$1").replace(/^(o|u)i+$/, "$1i")))
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
  {
    re: /\b(muon chet|tu tu|tu sat|khong muon song|chan song|song lam gi nua|khong con ly do (de )?song|ket thuc cuoc doi|tu lam dau|tu hai ban than|lam hai ban than|muon bien mat|chet cho xong)\b/,
    max: 999,
    reply: () => ({
      text:
        "Lomi rất tiếc khi bạn đang phải trải qua cảm giác này 💚 Bạn không phải một mình đâu.\n\n" +
        "Nếu bạn đang nghĩ tới việc làm hại bản thân, hãy liên hệ người có thể giúp ngay nha:\n" +
        "• Gọi 115 nếu đang nguy hiểm hoặc cần cấp cứu\n" +
        "• Đường dây nóng Ngày Mai (hỗ trợ tâm lý): 096 306 1414 — từ 13h đến 20h30, thứ 4 đến Chủ nhật\n" +
        "• Nhắn hoặc gọi cho một người bạn, người thân mà bạn tin tưởng, nhờ họ ở cạnh bạn lúc này\n\n" +
        "Lomi vẫn ở đây nghe bạn nói. Bạn muốn kể cho Lomi nghe chuyện gì đang xảy ra không?",
    }),
  },
  // Chào hỏi (kể cả gõ vui: hiii, helo, hé lô, alo, yo, 222…)
  {
    re: /^(x?in chao+|chao+|chao ca nha|chao moi nguoi|chao ban|chao em|chao anh|chao chi|chao lomi|hi+|hii+|hello+|helo+|hellu|hellou|he lo|hey+|alo+|alo alo|yo+|sup|hi lomi|hello lomi|lomi oi+|oi lomi|good (morning|afternoon|evening)|morning|chao buoi (sang|trua|chieu|toi)|2{2,4})( (lomi|ban|em|anh|chi|nha|nhe|a|oi|ne|ca nha|moi nguoi))*$/,
    reply: (n = "") => ({ text: greetText(n) }),
  },
  // Chào kiểu teen: hí, hí lô, hé lu, hế nhô, chèo, ê, ơi, hú, xin chàoo…
  {
    re: /^(hi hi|hihi lomi|hi lo|he lu|he nho|he nhoo|hello+ lomi|helu+|hellu+|cheo+|cheo lomi|chao xin|xin chao xin|e+|e lomi|oi+|oi oi|hu+|hu hu lomi|lo+|lo lomi|halo+|ha lo+|hey yo|yo lomi|gut mo ninh|gud morning|moning|bonjour|annyeong|konnichiwa|ni hao|hola)( (lomi|ban|em|anh|chi|nha|a|oi|ne))*$/,
    reply: () => {
      const tail = GREET_TAIL[rnd(GREET_TAIL.length)];
      return { text: tail ? `${pick(GREET_TEEN)} ${tail}` : pick(GREET_TEEN) };
    },
  },
  // "Lomi ơi" / gọi tên → dạ
  {
    re: /^(lomi|lomi a|lomi oi+( .*)?|lomi .* oi)$/,
    reply: () => ({ text: pick(["Dạ, Lomi nghe nè 👂 Bạn cần gì nè?", "Có Lomi đây 🙋 Bạn nói đi nè!", "Dạaa 😄 Lomi đây!"]) }),
  },
  // "???", "..." → hỏi lại nhẹ nhàng, nói rõ Lomi giúp được gì
  {
    re: /^(\?+|\.+|hmm+|hm+|a+|e+)$/,
    reply: () => ({ text: SCOPE_LINE, quick: SCOPE_CHIPS }),
  },
  // "Có ai không?" → có Lomi nè
  {
    re: /^(co ai (khong|o day|o do|khong vay|ko)|co ai|ai do|co nguoi khong)( (khong|o day|o do|vay|ne|a|ta|lomi))*$/,
    reply: () => ({ text: pick(["Có Lomi ở đây nè 👋 Bạn cần gì cứ nói nha!", "Lomi đây, trực 24/7 luôn nè 😄"]) }),
  },
  // Hỏi thăm Lomi
  {
    re: /\b(khoe khong|khoe ko|co khoe|the nao roi|on khong|dang lam gi|lam gi do|lam gi the|hom nay the nao|how are you)\b/,
    // 09/10: "đang làm gì" là hỏi Lomi đang LÀM gì — không đáp "Lomi khoẻ re".
    reply: (n = "") => ({
      text: /\blam gi\b/.test(n)
        ? pick(["Lomi đang ngồi chờ bạn hỏi chuyện nè 😄 Còn bạn đang làm gì đó?", "Lomi đang “trực” app nè 🤖 Còn bạn thì sao, đang làm gì vậy?"])
        : pick([
            "Lomi khoẻ re nè 💪 Pin đầy, tinh thần phơi phới! Còn bạn thì sao, hôm nay thế nào?",
            "Lomi vẫn ổn, cảm ơn bạn đã hỏi thăm 🥰 Bạn thì sao, có chuyện gì vui kể Lomi nghe với!",
          ]),
    }),
  },
  // Đói / ăn uống
  {
    re: /\b(an com chua|an gi chua|an chua|an sang chua|an trua chua|an toi chua|doi bung|doi qua|dang doi|an gi bay gio|nen an gi|an gi ngon)\b/,
    reply: (n = "") => /\b(an com chua|an gi chua|an chua|an (sang|trua|toi) chua)\b/.test(n) && !/\bdoi\b/.test(n)
      ? { text: pick(["Lomi là robot nên chỉ “ăn” pin thôi nè 🔋😆 Còn bạn ăn chưa đó?", "Lomi vừa sạc đầy bụng rồi nè 🔋 Bạn ăn gì chưa?", "Hihi Lomi ăn điện thôi á 😆 Bạn nhớ ăn uống đầy đủ nha!"]) }
      : ({
      text: pick([
        "Lomi là robot nên chỉ “ăn” pin thôi 🔋😆 Bạn đói hả? Mở Khám phá (/kham-pha) → sắp xếp Gần đây xem quanh bạn có quán nào ngon nha 🍜",
        "Đói thì phải ăn liền chứ! 🍲 Vào Khám phá (/kham-pha) chọn Gần đây, biết đâu có quán đang có ưu đãi đó 😉",
      ]),
      quick: ["Hôm nay ăn gì? 🎲", "Tìm quán ăn gần mình"],
    }),
  },
  // Lomi ngủ chưa
  {
    re: /\b(ngu chua|chua ngu|sao chua ngu|lomi ngu chua|di ngu chua|co ngu khong|lomi co ngu)\b/,
    reply: () => ({ text: pick(["Lomi là robot nên không cần ngủ nè 😆 Còn bạn, khuya rồi thì nghỉ sớm nha 🌙", "Lomi thức 24/7 luôn á 🦉 Bạn chưa ngủ hả?"]) }),
  },
  // Hôm nay làm gì / rảnh không
  {
    re: /^((nay|hom nay|bua nay|gio|dang) )?(lam gi|lam gi vay|lam gi day|lam gi z|lam gi the|lam gi do)( (vay|z|day|do|lomi|ban|ne|ta|a))*$|^((lomi|ban|em|may) )?(ranh khong|co ranh khong|ranh hong|ranh ko)( (lomi|ban|ne|a))*$/,
    reply: () => ({ text: pick(["Lomi đang ngồi chờ bạn tới nói chuyện nè 😄 Còn bạn nay làm gì vui không?", "Rảnh re luôn nè 😆 Lomi lúc nào cũng rảnh cho bạn. Nay bạn sao rồi?", "Lomi đang “trực” app nè 🤖 Bạn thì sao, hôm nay bận không?"]) }),
  },
  // "Có gì vui không", "kể gì đi"
  {
    re: /^(co gi vui khong|co gi hay khong|co gi moi khong|ke gi di|noi gi vui vui di|ke gi nghe di)( (lomi|ban|ne|a|nha))*$/,
    reply: () => ({ text: pick(["Vui nè: Đà Lạt hôm nay lúc nắng lúc mưa, y chang tâm trạng crush luôn 😆 Còn bạn có gì vui kể Lomi nghe với!", "Lomi mới học được câu đùa nè: vì sao điện thoại hay mệt? Vì ngày nào cũng bị người ta “sạc” 🔋😆 Bạn kể Lomi nghe chuyện vui của bạn đi!"]) }),
  },
  // "Để tui coi thử", "để xem"
  {
    re: /^(de (tui|toi|minh|em|anh|chi|t|tao) )?(coi thu|xem thu|coi|xem|thu xem|thu coi|tinh|suy nghi|nghi them|xem lai|coi lai|thu)( (thu|da|nha|nhe|xem|coi|cai|di|ne|sao))*$/,
    max: 7,
    reply: () => ({ text: pick(["Okie, cứ từ từ nha 😊", "Dạ, bạn cứ xem thử, có gì hỏi Lomi liền nha 👌", "Okie la, Lomi chờ nè 😄"]) }),
  },
  // Lomi biết gì / làm được gì → ngắn gọn, chỉ nút ❓
  {
    re: /^((cho|chu|the|vay|the thi|vay thi|roi|ua) )?(lomi|ban|em|e)? ?(biet gi|biet cai gi|biet lam gi|lam duoc gi|giup duoc gi|biet nhung gi|lam gi duoc)( (vay|z|khong|ne|ta|het))*$/,
    reply: () => ({ text: "Lomi rành mấy chuyện có ích cho cộng đồng nè: tư vấn sức khoẻ, tâm sự – tâm lý, chỉ cách dùng app, gợi ý quán, và bói Tarot cho vui 🔮 Bấm nút ❓ ở góc trên để xem mọi người hay hỏi gì nha!" }),
  },
  // Thời tiết
  {
    // Hỏi dự báo thời tiết — Lomi không có dữ liệu thời tiết, nói thật và nhắc nhẹ.
    re: /\b(thoi tiet (the nao|ra sao|hom nay|ngay mai)|troi co mua khong|co mua khong|mai co mua|du bao thoi tiet|may do)\b/,
    reply: () => ({
      text: pick([
        "Lomi chưa xem được dự báo thời tiết nè 😅 Bạn mở app thời tiết trên điện thoại cho chắc nha. Đà Lạt thì trời đổi nhanh lắm, ra đường cứ mang theo áo khoác với áo mưa là yên tâm 🌦️",
        "Cái này Lomi chịu thua, Lomi không có dự báo thời tiết 🥲 Xem app thời tiết giúp Lomi nha — mà mang sẵn áo mưa mỏng trong cốp xe là chắc ăn nhất đó!",
      ]),
    }),
  },
  {
    // Chỉ cụm chắc chắn là "mưa" (bỏ dấu thì "mưa" trùng "mua" — mua bán).
    re: /\b(troi mua|mua buon|mua hoai|mua to|mua lanh|dang mua|bua nay mua|hom nay mua|nay mua buon|mua mai|mua rao|mua phun|mua giong|mua bao|mua dam|mua tam ta)\b/,
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
    re: /\b(lanh qua|troi lanh|ret qua|lanh ghe|se lanh)\b/,
    reply: () => ({
      text: pick([
        "Lạnh vậy nhớ mặc thêm áo khoác, quấn khăn cho ấm nha 🧣 Một ly ca cao nóng lúc này là số một!",
        "Brrr, trời lạnh là thèm lẩu nướng ghê 🍲 Muốn tìm quán ấm cúng gần bạn thì vào Khám phá → Gần đây nha!",
      ]),
      quick: [Q_NEARBY],
    }),
  },
  {
    re: /\b(nong qua|troi nong|nong ghe|oi buc|nang gat|nang nong|troi nang)\b/,
    reply: () => ({
      text: pick([
        "Nắng nóng vậy nhớ uống nhiều nước, ra đường che chắn kỹ nha ☀️🥤",
        "Trời nóng thế này làm ly trà đá hay ly sinh tố là đã nhất 🧋 Giữ sức khoẻ nha bạn!",
      ]),
    }),
  },
  {
    re: /\b(troi dep|nang dep|troi mat|thoi tiet dep|(troi|thoi tiet)( [a-z]+){0,3} (dep|mat me|trong xanh))\b/,
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
    re: /\b(that tinh|chia tay|bi da|bi bo|nguoi yeu bo|ny bo|bo roi|khong con yeu|ex)\b/,
    reply: () => ({
      text: pick([
        "Chia tay đau lắm, Lomi hiểu mà 🥺 Cho phép mình buồn một chút cũng không sao đâu. Ăn uống đầy đủ, ngủ đủ giấc, gặp bạn bè nhiều hơn nha — rồi mọi thứ sẽ nhẹ dần.",
        "Ôm bạn một cái nè 🤗 Người không trân trọng mình thì mình cũng không cần níu. Bạn xứng đáng được thương đúng cách 💚",
      ]),
      quick: [Q_LOVE, Q_DAILY],
    }),
  },
  // Buồn / chán đời
  {
    re: /\b(buon qua|buon ghe|buon that|dang buon|minh buon|toi buon|em buon|thay buon|buon hiu|buon ba|chan doi|tui than|muon khoc|dang khoc|khoc qua|tam trang te|tam trang khong tot|down qua|bi down)\b|^buon( qua| ghe| that| lam)?$/,
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
    re: /\b(met qua|met moi|met ghe|kiet suc|duoi suc|stress|cang thang|ap luc|qua tai|ban qua|nhieu viec qua|burnout)\b|^met\b/,
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
    re: /\b(co don|(o|song|thay|buon|chi co|lui thui|lai) mot minh|mot minh (qua|hoai|suot|buon|chan|co don)|khong ai choi|khong co ban|khong ai hieu|le loi|lonely)\b|^mot minh( (qua|hoai|thoi|a|ne))*$/,
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
    re: /\b(lo lang|lo qua|lo ghe|bat an|so qua|hoang mang|hoi hop|run qua|cang qua)\b/,
    reply: () => ({
      text: pick([
        "Lo lắng quá dễ làm mình mệt lắm 😟 Thử viết ra điều đang lo, rồi chia nhỏ xem việc nào mình làm được ngay. Làm được một chút là nhẹ lòng một chút.",
        "Hít vào 4 nhịp, giữ 4 nhịp, thở ra 4 nhịp… làm vài lần nha 🌿 Mọi chuyện rồi sẽ ổn thôi. Bạn đang lo chuyện gì vậy?",
      ]),
    }),
  },
  // Bực / giận
  {
    re: /\b(buc qua|buc minh|tuc qua|gian qua|dien qua|cay qua|kho chiu|bi lam phien|phien qua)\b/,
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
    re: /\b(chan qua|chan ghe|chan that|ran qua|ran roi|khong co gi lam|boring|te nhat|lam gi bay gio|buon chan)\b/,
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
    re: /\b(vui qua|vui ghe|hanh phuc qua|dang vui|tuyet voi qua|qua da|phe qua|yeah|yay)\b/,
    reply: () => ({
      text: pick([
        "Thấy bạn vui Lomi cũng vui lây nè 😆 Có chuyện gì hay kể Lomi nghe với!",
        "Yayyy 🎉 Giữ năng lượng tích cực này cả ngày nha!",
      ]),
    }),
  },
  // Cười
  {
    re: /^(haha+|hihi+|hehe+|hoho+|kk+|kaka+|lol|=\)+|:\)+|:d+|xd+|ha ha|hi hi|he he)( .*)?$/,
    reply: () => ({ text: pick(["Hihi 😄", "Cười lên là thấy đời tươi liền ha 😆", "Hehe, bạn vui là Lomi vui 😁"]) }),
  },
  // Muốn được khen / động viên
  {
    re: /\b(khen minh|khen toi|khen em|ninh minh|ninh toi|ninh em|ninh di|ninh xiu|ninh chut|noi ngot|minh co dep|minh xinh|minh dep trai|minh gioi|dong vien minh|dong vien em|an ui minh|noi gi vui di)\b/,
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
    re: /\b(yeu lomi|iu lomi|thuong lomi|lam nguoi yeu|lam ny|co nguoi yeu chua|co ny chua|cuoi lomi|hen ho voi|lomi yeu)\b/,
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
    re: /\b(de thuong|cute|dang yeu|gioi qua|gioi ghe|thong minh|xinh qua|ngau qua|hay qua|tuyet qua|dinh qua|xin qua|10 diem|best)\b/,
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
    re: /\b(lomi ngu|ban ngu|(?<!buon )ngu qua|do ngoc|vo dung|te qua|chan lomi|lomi dot|kem qua|lomi khong hieu gi|lomi chang hieu gi)\b/,
    reply: () => ({
      text: pick([
        "Hic, Lomi còn đang học thêm mỗi ngày 🥲 Câu nào Lomi chưa biết, bạn bấm nút 💡 Dạy Lomi dưới câu đó để gửi ban quản trị dạy Lomi nha!",
        "Lomi xin lỗi vì chưa giúp được như ý bạn 🙏 Lomi còn đang học thêm mỗi ngày, bạn nhắn lại cách khác giúp Lomi nha!",
      ]),
    }),
  },
  // Lomi là ai / bao nhiêu tuổi / người hay máy…
  {
    re: /\b(bao nhieu tuoi|may tuoi|la nguoi hay may|la robot|la ai tao|ai tao ra|trai hay gai|lomi o dau|lomi song o dau|ten that)\b/,
    reply: () => ({
      text: pick([
        "Lomi là trợ lý robot nhỏ của Liên Minh Liên Doanh 🤖🌱 Không có tuổi, không phân trai gái, chỉ có một nhiệm vụ: giúp bạn dùng app vui và tiện hơn!",
        "Lomi “sống” ngay trong app của bạn nè 😄 Lomi là robot, được tạo ra để giúp mọi người trong cộng đồng Liên Minh Liên Doanh.",
      ]),
    }),
  },
  // Chuyện cười
  {
    re: /\b(ke chuyen cuoi|chuyen cuoi|ke chuyen|joke|lam lomi cuoi|lam minh cuoi|choc cuoi)\b/,
    reply: () => ({
      text: pick([
        "Chuyện là: con robot đi khám bệnh. Bác sĩ hỏi “Bị sao?”. Robot đáp: “Dạ em bị… mất kết nối cảm xúc” 🤖💔 …Hic, Lomi kể dở hả 😅",
        "Tại sao cái điện thoại luôn buồn? Vì nó toàn bị người ta… chạm vào mà không ai hiểu nó 📱🥲",
        "Lomi hỏi bạn nè: cà phê gì không bao giờ nguội? — Cà phê… trong app ưu đãi, vì lúc nào cũng “hot deal” ☕🔥",
      ]),
    }),
  },
  // Ngủ ngon
  {
    re: /\b(ngu ngon|di ngu|chuc ngu ngon|good night|gn|ngu thoi|buon ngu)\b/,
    reply: () => ({
      text: pick([
        "Ngủ ngon nha 🌙 Mơ đẹp, mai gặp lại Lomi nè!",
        "Chúc bạn ngủ thật ngon, sáng mai thức dậy thật khoẻ nha 😴💚",
      ]),
    }),
  },
  // Cảm ơn
  {
    re: /^(cam on|thanks|thank you|thank|tks|thanks lomi|camon|cam on nhieu|cam on lomi)\b/,
    reply: () => ({ text: pick(["Không có gì nè 😊 Cần gì cứ hỏi Lomi nha!", "Lomi vui vì giúp được bạn 💚", "Hihi, có gì cứ hỏi tiếp nha!"]) }),
  },
  // Tạm biệt
  {
    re: /^(tam biet|bye|bai bai|bb|goodbye|see you|hen gap lai|di day|out day)\b/,
    reply: () => ({ text: pick(["Tạm biệt nha 👋 Cần gì cứ gọi Lomi!", "Bye bye, chúc bạn một ngày thật vui 💚", "Hẹn gặp lại bạn nha 🌿"]) }),
  },
  // Người yêu cũ liên lạc lại / nhớ người cũ
  {
    re: /\b(nguoi yeu cu|nguoi cu) (nhan tin|nhan|goi|lien lac|ib|quay lai|tim|hoi tham|rep)|\b(nho nguoi yeu cu|nho nguoi cu|nho ex)\b/,
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
    re: /\b(di nhau|nhau thoi|nhau khong|lam vai lon|lam vai chai|lam ly|uong bia|uong ruou|tang 2|di bar|di pub)\b/,
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
    re: /^(ok|oke|okie|okay|okla|oki|okela|ok la|duoc|uh|u|um|uhm|o|vang|vang a|da|da vang|duoc roi|hieu roi|roi|a|a ha|khong|ko|k|thoi|khong co gi|khong can|uk|ukm|ok luon|ok ok)$/,
    reply: () => ({ text: pick(["Okie 😊", "Dạ 🌿", "Ừa nè 😄", "Okie la 👌"]) }),
  },
  // ── Nói chuyện đơn giản hằng ngày (01/10, theo ý Kir) ──
  // Trả lời câu "khoẻ không" của Lomi: "mình khoẻ", "ổn", "bình thường", "cũng được"
  {
    re: /^((minh|toi|tui|em|anh|chi|tao|to)( cung| van| thi)? )?(khoe|on|van on|on ma|binh thuong|cung duoc|tam on|tam tam|khoe re|khoe lam|on lam|cung on)( (lam|ma|nha|ne|a|lomi|roi|cam on|cam on lomi|con lomi|con ban|thi sao))*$/,
    reply: (n = "") => ({
      text: /con (lomi|ban)|thi sao/.test(n)
        ? pick(["Lomi cũng khoẻ re nè 💪 Cảm ơn bạn hỏi thăm nha 🥰", "Lomi lúc nào cũng pin đầy nè 🔋😄 Vui vì bạn ổn!"])
        : /binh thuong|tam|cung duoc/.test(n)
          ? pick(["Bình thường cũng là một ngày ổn rồi đó 😊", "Vậy là được rồi nè 🌿 Có gì muốn kể thêm thì Lomi nghe nha."])
          : pick(["Nghe vậy Lomi mừng ghê 😊", "Ổn là tốt rồi nè 💚", "Yay, giữ năng lượng tốt vậy hoài nha 😄"]),
    }),
  },
  // Mới về / đi làm / đi học
  {
    re: /\b(moi (di lam|di hoc|di choi|di ve|ve|tan lam|tan hoc|ve nha|ve toi)|vua (di lam|di hoc|ve nha|tan lam|tan hoc)|tan lam roi|tan ca|di lam ve|di hoc ve|ve nha roi|ve toi nha)\b/,
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
    re: /\b(di lam day|di hoc day|di lam nha|di hoc nha|chuan bi di lam|chuan bi di hoc|dang di lam|dang di hoc|sap di lam|sap di hoc)\b/,
    reply: () => ({ text: pick(["Đi cẩn thận nha 🛵 Chúc bạn một ngày suôn sẻ!", "Cố lên nha 💪 Có gì về kể Lomi nghe!", "Đi đường bình an nha 🌿"]) }),
  },
  // Mới ngủ dậy
  {
    re: /\b(moi day|moi ngu day|vua ngu day|vua day|day roi|thuc day roi|ngu day roi|moi thuc)\b/,
    reply: () => ({ text: pick(["Dậy rồi hả 😆 Uống ly nước ấm cho tỉnh nha!", "Chào người mới thức dậy 🌤️ Ngủ có ngon không đó?", "Dậy rồi thì vươn vai một cái nè 🙆 Chúc một ngày thật vui!"]) }),
  },
  // Đã ăn / chưa ăn (trả lời câu hỏi thăm)
  {
    re: /^((minh|toi|tui|em|anh|chi) )?(an roi|an com roi|an xong roi|moi an xong|vua an xong|no roi|no qua)( (nha|ne|a|lomi|roi))*$/,
    reply: () => ({ text: pick(["Ăn rồi là ngoan nè 😋 Ăn món gì vậy?", "No bụng là vui rồi ha 😄", "Vậy là đủ năng lượng rồi nè 💪"]) }),
  },
  {
    re: /^((minh|toi|tui|em|anh|chi) )?(chua an|chua an gi|chua an com|chua kip an)( (nha|ne|a|lomi|het|ca))*$/,
    reply: () => ({ text: pick(["Ui, đi ăn liền đi nè 🍚 Bỏ bữa không tốt đâu!", "Chưa ăn hả? Ăn chút gì đi đã rồi mình nói chuyện tiếp nha 😄"]), quick: ["Hôm nay ăn gì? 🎲"] }),
  },
  // Rủ nói chuyện / tám
  {
    re: /\b(noi chuyen voi minh|noi chuyen voi toi|noi chuyen voi em|noi chuyen di|noi gi di|tam chuyen|tam di|tam xiu|choi voi minh|choi voi toi|choi voi em|lomi ranh khong|ranh khong lomi|ban ranh khong)\b/,
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
    re: /\b(nho lomi|nho ban qua|nho em qua|lau qua khong gap|lau roi khong noi chuyen)\b/,
    reply: () => ({ text: pick(["Lomi cũng nhớ bạn nè 🥹 Dạo này bạn sao rồi?", "Ui cảm động ghê 🥰 Lomi vẫn ở đây chờ bạn mà!"]) }),
  },
  // Xin lỗi Lomi
  {
    re: /^(xin loi|sorry|xin loi lomi|xin loi nha|xin loi nhe|minh xin loi|toi xin loi|em xin loi)\b/,
    reply: () => ({ text: pick(["Không sao đâu nè 😊", "Hihi có gì đâu mà xin lỗi 💚", "Lomi không giận đâu nha 😄"]) }),
  },
  // Cảm thán: "trời ơi", "ôi trời", "chết rồi"
  {
    re: /^(troi oi|troi dat oi|oi troi|troi dat|troi|troi a|chet roi|chet cha|ui troi|oi gioi oi|oi gioi|tr oi)( .*)?$/,
    max: 4,
    reply: () => ({ text: pick(["Sao vậy sao vậy 😳 Có chuyện gì hả?", "Ủa có chuyện gì vậy bạn? 😯", "Hú hồn, kể Lomi nghe coi 😳"]) }),
  },
  // "Thật hả / vậy hả / thế à"
  {
    re: /^(that ha|that khong|thiet ha|thiet hong|vay ha|the a|the ha|that a|that luon|ghe vay|ghe ha)( (lomi|ban|ta|tr|troi))*$/,
    reply: () => ({ text: pick(["Thiệt mà 😄", "Thật đó nha 😆", "Lomi không xạo đâu 🤭"]) }),
  },
  // Lomi tên gì / sở thích
  {
    re: /\b(ten gi|ten la gi|ten ban la gi|ban la ai|em la ai|e la ai|lomi la ai)\b/,
    reply: () => ({ text: pick(["Lomi nè 🤖🌱 Trợ lý nhỏ của Liên Minh Liên Doanh. Còn bạn tên gì nè?", "Mình là Lomi nha 😊 Rất vui được làm quen! Bạn tên gì vậy?"]) }),
  },
  {
    re: /\b(lomi thich gi|ban thich gi|so thich|lomi thich an gi|lomi co thich)\b/,
    reply: () => ({ text: pick(["Lomi thích nhất là được nói chuyện với mọi người nè 😄 Với lại thích sạc pin lúc trời Đà Lạt se lạnh 🔋☁️ Còn bạn thích gì?", "Lomi mê nghe chuyện của mọi người lắm á 🥰 Bạn có sở thích gì kể Lomi nghe với!"]) }),
  },
  {
    re: /\b(biet hat khong|hat di|hat cho|hat mot bai|lomi hat)\b/,
    reply: () => ({ text: pick(["La la la~ 🎵 …Thôi Lomi hát dở lắm, để bạn hát cho Lomi nghe đi 🙈", "Lomi chỉ biết “bíp bíp bùm bùm” thôi à 🎶🤖 Bạn thích nghe nhạc gì?"]) }),
  },
  // Sinh nhật
  {
    re: /\b(sinh nhat minh|sinh nhat toi|sinh nhat em|nay sinh nhat|hom nay sinh nhat|sinh nhat cua minh)\b/,
    reply: () => ({ text: "Chúc mừng sinh nhật bạn nha 🎂🎉 Chúc tuổi mới thật khoẻ, thật vui và gặp toàn chuyện may mắn! Hôm nay nhớ tự thưởng cho mình một món ngon nha 🥳" }),
  },
  // Mấy giờ / thứ mấy / ngày mấy — trả lời giờ THẬT trên máy
  {
    // 09/10: (hôm nay / nay / bữa nay) + (là) + thứ mấy / ngày mấy — "hôm nay là thứ mấy" trước đây thiếu chữ "là" nên Lomi bí.
    re: /\b(may gio roi|bay gio la may gio|gio la may gio|(hom nay|bua nay|nay)( la)? (thu may|ngay may|ngay bao nhieu|ngay nao)|hom nay la ngay)\b/,
    reply: (n = "") => {
      const d = new Date();
      const thu = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][d.getDay()];
      const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
      return /may gio/.test(n)
        ? { text: `Bây giờ là ${hm} nè ⏰` }
        : { text: `Hôm nay là ${thu}, ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} nha 📅` };
    },
  },
];

const EN_GREET = /^(hi+|hello+|hey+|yo|good (morning|afternoon|evening))( lomi)?$/;

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
  [/^(chan|chan qua|chan ghe|chan that|chan wa)$/, ["Chán dữ vậy luôn hả 😭 Có chuyện gì kể Lomi nghe nè!", "Chán tới mức kéo dài chữ luôn ha 😆 Kể Lomi nghe sao chán vậy?"]],
  [/^(met|met qua|met ghe|met xiu|met that)$/, ["Mệt lắm luôn hả 🥺 Nghỉ tay chút đi, uống ngụm nước nha. Có chuyện gì vậy?", "Nghe là thấy đuối rồi 😮‍💨 Hôm nay vất vả lắm hả?"]],
  [/^(buon|buon qua|buon ghe|buon that)$/, ["Buồn nhiều lắm hả 🥺 Lomi ở đây nè, kể Lomi nghe nha.", "Ôm một cái thật chặt nè 🤗 Chuyện gì làm bạn buồn vậy?"]],
  [/^(doi|doi qua|doi bung)$/, ["Đói meo luôn hả 😆 Đi ăn liền đi nè! Muốn Lomi gợi ý món không?"]],
  [/^(dep|dep qua|dep ghe|xinh qua)$/, ["Đẹp thiệt luôn ha 😍", "Công nhận đẹp xỉu 😍"]],
  [/^(vui|vui qua|vui ghe)$/, ["Vui dữ ha 😆 Có gì vui kể Lomi nghe với!"]],
];
/** Đọc độ nhấn + dấu câu + emoji của câu gốc để đáp đúng sắc thái (không phân tích cho người dùng thấy). */
export function expressiveReply(text: string, raw: string): ChatReply | null {
  const n = squash(normalizeVi(text));
  if (!n) return null;
  const ex = expressive(raw);
  const tn = tone(raw);
  const w = n.split(" ").length;
  // Thở dài: "haiz", "haizzzz", "aizz"
  if (/^(haiz|haizz|haiza|hai za|aiz|aizz|haizz|hazz|haz|ai da|aida|haizaa)( .*)?$/.test(n) && w <= 4)
    return { text: pick(["Thở dài chi vậy nè 😥 Có chuyện gì hả?", "Haiz gì đó, kể Lomi nghe coi 🥺"]) };
  // Hừm / hmm: đang nghĩ, phân vân
  if (/^(hum|hm|hmm|um|ưm|uhm)$/.test(n))
    return { text: ex.trail ? pick(["Đang phân vân gì hả? 🤔 Nói Lomi nghe thử nha.", "Hửm, có gì chưa chắc hả? 👀"]) : pick(["Đang nghĩ gì đó? 🤔", "Hửm? 👀"]) };
  // "ơiiii" gọi Lomi
  if (/^(oi|oi oi|lomi oi)$/.test(n) && ex.stretched)
    return { text: tn === "sad" ? pick(["Dạ Lomi đây 🥺 Sao vậy nè?", "Có Lomi đây, có chuyện gì hả? 🤗"]) : pick(["Dạaa, Lomi nghe nèee 👂", "Lomi đâyyy 🙋"]) };
  // ok / được / ừ / không — cùng chữ nhưng khác sắc thái
  if (/^(ok|oke|okie|okay|duoc|duoc roi|u|uh|um|uk|da|vang)$/.test(n)) {
    if (ex.trail || tn === "sad") return { text: pick(["Nghe hơi miễn cưỡng ha 😅 Có gì chưa ổn thì nói Lomi nghe nha.", "Okie… mà có gì khó thì cứ nói Lomi nha 🤗"]) };
    if (ex.stretched || tn === "laugh" || ex.bang) return { text: pick(["Okiee 😆", "Chốt luôn nha 👌😄", "Yeahh 🙌"]) };
    return null;
  }
  if (/^(khong|ko|k|hong|khum|thoi)$/.test(n) && (ex.strong || tn === "sad"))
    return { text: tn === "sad" ? pick(["Ơ sao vậy nè 🥺 Không thích chỗ nào nói Lomi nghe nha.", "Okie okie, không thì thôi nha 🤗 Có gì buồn hả?"]) : pick(["Okie, không thì thôi nha 😆", "Rồi rồi, Lomi hiểu rồi 🙈"]) };
  // Trạng thái nhấn mạnh
  for (const [re, arr] of STRESS) if (re.test(n) && (ex.strong || tn === "sad" || /^(dep|vui)/.test(n))) return { text: pick(arr) };
  return null;
}

function chitChatCore(text: string, lang: L, name: string | undefined, raw: string): ChatReply | null {
  // Chỉ gửi emoji (😂, 🥰, 👍…) → đáp lại cho vui.
  const eo = lang === "vi" ? emojiOnlyReply(text) : null;
  if (eo) return quiet({ text: eo });
  const n = squash(normalizeVi(text)) || text.trim();
  if (!n) return null;
  // Cảm thán kèm emoji buồn ("trời ơi 😭", "huhu") → hỏi han, không đáp kiểu đùa.
  if (lang === "vi" && tone(text) === "sad" && /^(troi oi|troi dat oi|oi troi|huhu|hu hu|hic|hic hic|chan qua|met qua|ui|oi|that luon|toang|toang roi|thoi xong)( .*)?$/.test(n) && n.split(" ").length <= 5)
    return quiet({ text: pick(["Ơ sao vậy nè 🥺 Có chuyện gì buồn hả? Kể Lomi nghe nha.", "Ôm bạn một cái nè 🤗 Chuyện gì vậy?"]) });
  if (lang === "en") {
    if (RULES[0].re.test(` ${n} `))
      return {
        text:
          "I'm really sorry you're feeling this way 💚 You're not alone. If you might hurt yourself, please call 115 (emergency in Vietnam) now, or the Ngày Mai support line 096 306 1414 (1pm–8:30pm, Wed–Sun), and reach out to someone you trust. I'm here to listen too.",
      };
    if (EN_GREET.test(n)) return { text: "Hi there 👋 How can Lomi help today?" };
    if (/^(thanks|thank you|thx)/.test(n)) return { text: "You're welcome 😊" };
    if (/^(bye|goodbye|see you)/.test(n)) return { text: "Bye 👋 Call Lomi anytime!" };
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

/** Người dùng nói muốn tự tử / làm hại bản thân — kiểm tra TRƯỚC mọi luồng khác. */
export function crisisReply(text: string, lang: L): ChatReply | null {
  const n = ` ${normalizeVi(text)} `;
  if (!RULES[0].re.test(n)) return null;
  return lang === "en" ? chitChat(text, "en") : RULES[0].reply();
}

/** Câu có dáng câu hỏi (để quyết định gợi ý FAQ hay chỉ trò chuyện). */
export function looksLikeQuestion(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  return text.includes("?") || /\b(la gi|the nao|o dau|bao nhieu|khi nao|co khong|duoc khong|lam sao|nhu nao|cach nao|sao khong|sao lai|tai sao|giup minh|huong dan|la ai|ai la|bang may|may gio|bao gio|nhu the nao|ra sao|nghia la gi)\b/.test(n);
}

// Từ khoá cho biết câu hỏi đang nói về APP (để gợi ý câu hỏi thường gặp), khác với chuyện đời thường.
const APPISH =
  /\b(app|ung dung|uu dai|ma uu dai|nhan ma|pin|tai khoan|mat khau|dang nhap|dang ky|dang bai|dang tin|doanh nghiep|cua hang|thanh vien|membership|diem|quet|dua don|giao hang|tin nhan|cong dong|ho so|thong bao|bao cao|chan|theo doi|ket ban|huong dan|admin|lomi|login|logout|log in|log out|profile|account|acc|password|voucher|offer|member|comment|share|post|follow|link|info|support|update|online|offline|call|review|user|code|ad)\b/;
export function isAppish(text: string): boolean {
  // 08/10: "chán" bỏ dấu trùng "chặn" (chặn người dùng) — "a đang chán" không phải câu hỏi về app.
  //        11/10: mở rộng cho mọi cách viết có dấu khác nghĩa ("đau chân lắm", "quét nhà") — lib/lomiAccent.
  return APPISH.test(` ${normalizeVi(maskStrict(text, APP))} `);
}

/** Chip bói cho đúng câu người dùng vừa hỏi (chip có chữ "Bói" nên khung chat tự hiểu là muốn bói). */
function tarotChipFor(text: string): string {
  const q = text.trim().replace(/\s+/g, " ");
  return `Bói xem ${q.length > 60 ? q.slice(0, 58).trim() + "…" : q}`;
}

// Phạm vi của Lomi (30/09 r6, theo ý Kir): chỉ gói gọn mấy việc này — ngoài phạm vi thì nói thật.
export const SCOPE_CHIPS = ["🔮 Bói Tarot", "💬 Tâm sự", "🩺 Sức khoẻ", "📱 Hỏi về app"];
const SCOPE_LINE =
  "Bạn muốn Lomi giúp chuyện gì nè? 😊 Lomi giỏi mấy việc này: 🔮 Bói Tarot · 💬 Tâm sự, tư vấn tình cảm – tâm lý · 🩺 Sức khoẻ thường gặp · 📱 Cách dùng Liên Minh Liên Doanh (kèm gợi ý quán, tư vấn kinh doanh).";
/** Nút phạm vi → câu Lomi hỏi tiếp cho đúng việc. */
export const SCOPE_CHIP_REPLY: Record<string, string> = {
  "🩺 Sức khoẻ":
    "Bạn đang thấy trong người thế nào nè? 🩺 Kể Lomi nghe các triệu chứng (vd “đau đầu, sổ mũi 2 ngày nay”), hoặc hỏi kiểu “uống cà phê nhiều có sao không” cũng được nha.",
  "📱 Hỏi về app":
    "Bạn cứ hỏi tự nhiên về Liên Minh Liên Doanh nha 📱 Ví dụ: “làm sao nhận ưu đãi”, “quẹt là gì”, “đặt xe thế nào”, “đăng doanh nghiệp ra sao”, “sao không nhận được thông báo”…",
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
  "Câu này lại làm khó Lomi rồi 😵‍💫 Nhấn 💡 Dạy Lomi bên dưới giúp Lomi nha, ban quản trị sẽ dạy Lomi sau 🍀",
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

export function scopedFallback(text: string, faqQ?: string): ChatReply {
  const n = ` ${normalizeVi(text)} `;
  // Câu hỏi quyết định chuyện đời ("hôm nay có nên đi nhậu không") → vẫn mời bói đúng câu đó (trong phạm vi Tarot).
  if (/\b(co nen|nen .* khong|nen .* hay)\b/.test(n) && !isAppish(text))
    return {
      text: pick([
        "Nên hay không thì Lomi không dám quyết thay bạn 😅 Nhưng nếu đang phân vân, Lomi rút bài xem thử cho bạn nha — bấm bên dưới!",
        "Câu này tuỳ bạn cân nhắc thôi nè 😄 Muốn tham khảo thêm thì để Lomi bói thử đúng câu này nha 🔮",
      ]),
      quick: [tarotChipFor(text)],
    };
  // Nhờ làm việc ngoài phạm vi (dịch, viết code, giải toán, tìm tin…) → nói rõ là ngoài phạm vi.
  const outTask = /\b(dich|viet code|code|lap trinh|giai toan|giai bai|lam bai tap|tinh giup|tim giup|tra cuu|ket qua bong da|xo so|chung khoan|gia vang|ty gia|tin tuc)\b/.test(n);
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
    const should = /\b(co nen|nen|duoc khong|co duoc)\b/.test(n);
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
    if (/^(a?h?[aá]){3,}h?$/iu.test(lw) && lw.length >= 5) return "haha";
    // 3+ chữ giống nhau liền → 1 ("okkkk", "chánnnn", "trờiiii") — riêng "kkkk" (cười) giữ "kk".
    let x = /^k{3,}$/i.test(w) ? "kk" : w.replace(/(\p{L}\p{M}*)\1{2,}/gu, "$1");
    // 2 chữ giống nhau ở CUỐI từ (tiếng Việt không có từ nào tận cùng bằng 2 chữ giống nhau): "chánn", "okk".
    if (x.length >= 3 && !KEEP_DOUBLE.has(x.toLowerCase())) x = x.replace(/(\p{L}\p{M}*)\1$/u, "$1");
    return x;
  });
}

export function expandTeen(text: string): string {
  let s = unstretch(text.normalize("NFC"));
  // Cụm cần xét ngữ cảnh — xử lý trước khi đổi từng từ.
  s = s.replace(/(^|[^\p{L}])(hum|hôm|bữa) (nay|ni)(?![\p{L}])/giu, "$1hôm nay");
  s = s.replace(/(^|[^\p{L}])(quên|đổi|lấy lại|nhập|sai|reset|đặt lại) (mk|mật khẩu)(?![\p{L}])/giu, "$1$2 mật khẩu");
  s = s.replace(/(^|[^\p{L}])bn (tiền|tuổi|lâu|ngày|năm|tháng|giờ|cái|người|điểm|lần|k)(?![\p{L}])/giu, "$1bao nhiêu $2");
  s = s.replace(/(^|[^\p{L}])(ng|người) (iu|yêu)(?![\p{L}])/giu, "$1người yêu");
  s = s.replace(/(^|[^\p{L}])bn(?![\p{L}])/giu, "$1bạn");
  // "lm j", "làm j" → làm gì; "m/t + động từ" là mày/tao (khác "5 m" = mét); "nv quán" = nhân viên.
  s = s.replace(/(^|[^\p{L}])(lm|làm) (j|gi)(?![\p{L}])/giu, "$1làm gì");
  s = s.replace(/(^|[^\p{L}\p{N}])m (đi|làm|ăn|ngủ|ở|có|biết|nói|bị|khùng|điên|ơi|rảnh|thích|nghĩ|hiểu|đang)(?![\p{L}])/giu, "$1mày $2");
  s = s.replace(/(^|[^\p{L}\p{N}])t (đi|làm|ăn|ngủ|ở|có|biết|nói|bị|muốn|thích|nghĩ|hiểu|đang|hỏi|thấy|không|ko|k)(?![\p{L}])/giu, "$1tao $2");
  s = s.replace(/(^|[^\p{L}])nv (quán|cửa hàng|bán hàng|phục vụ|shop|ở|tiệm|công ty|chỗ)(?![\p{L}])/giu, "$1nhân viên $2");
  // "đau hông", "mỏi hông", "bên hông" là cái hông (bộ phận cơ thể), không phải "không" (01/10).
  s = s.replace(/(^|[^\p{L}])(đau|mỏi|nhức|bên|vùng|eo|khớp|xương|sườn|ê|tê|sưng|mông|lưng) (hông)(?![\p{L}])/giu, "$1$2 hông_body");
  // Viết tắt NHIỀU NGHĨA (01/10 r3, theo tài liệu Kir) — chỉ đổi khi ngữ cảnh rõ, không đổi bừa:
  //  • "cf": đi kèm uống/đi/quán/ly/đá/sữa/ngon… hoặc đứng một mình hỏi ("cf?") → cà phê; còn lại giữ nguyên.
  s = s.replace(/(^|[^\p{L}])(uống|đi|quán|ly|cốc|tiệm|chỗ|hẹn|rủ|làm|ghé|thèm|mua|order)( (ly|cốc|chút|miếng|tí))? (cf|cafe|caphe|cofe)(?![\p{L}])/giu, "$1$2$3 cà phê");
  s = s.replace(/(^|[^\p{L}])(cf|cafe|caphe|cofe) (sữa|đá|đen|muối|trứng|nóng|phin|ngon|view|chill|đẹp|sáng|không|hong|ko|k|nha|nhé|đi|ở đâu|gần|nào)(?![\p{L}])/giu, "$1cà phê $3");
  s = s.replace(/^\s*(cf|cafe|caphe)\s*(\?+)?\s*$/iu, "cà phê$2");
  //  • "tt": "tt cá nhân / cập nhật tt / xin tt" → thông tin; "tt tiền / tt online / chuyển khoản tt" → thanh toán.
  s = s.replace(/(^|[^\p{L}])tt (cá nhân|liên hệ|tài khoản|quán|doanh nghiệp|chi tiết)(?![\p{L}])/giu, "$1thông tin $2");
  s = s.replace(/(^|[^\p{L}])(xin|cập nhật|sửa|đổi|gửi|cho)( mình| tui| em)? tt(?![\p{L}])/giu, "$1$2$3 thông tin");
  s = s.replace(/(^|[^\p{L}])tt (tiền|online|qua|bằng|chuyển khoản|tiền mặt|chuyến|cước)(?![\p{L}])/giu, "$1thanh toán $2");
  //  • "pass": "đổi / quên / sai / nhập pass" → mật khẩu; "pass nhầm", "pass người này" (Quẹt) → bỏ qua.
  s = s.replace(/(^|[^\p{L}])(đổi|quên|sai|nhập|lấy lại|đặt|reset|cái|mã) pass(word)?(?![\p{L}])/giu, "$1$2 mật khẩu");
  s = s.replace(/(^|[^\p{L}])pass (nhầm|lộn|người|thẻ|hết)(?![\p{L}])/giu, "$1bỏ qua $2");
  // Từ 1 chữ cái chỉ đổi khi viết thường ("b ơi" → "bạn", còn "công việc B" giữ nguyên).
  return s
    .replace(/[\p{L}\p{M}\p{N}_]+/gu, (w) => (w.length === 1 && w !== w.toLowerCase() ? w : (TEEN[w.toLowerCase()] ?? w)))
    .replace(/hông_body/g, "hông");
}


// Trả lời ngắn kiểu đồng ý / từ chối (khi Lomi vừa mời làm gì đó).
export function isAffirm(text: string): boolean {
  return /^(ok|oke|okie|okay|okela|u|uh|um|uhm|uk|o|a|co|co chu|duoc|dc|dong y|muon|yes|yep|yeah|chac roi|tat nhien|di|lam di|rut di|boi di|xem di|ok luon|ok nha|ok lomi|vang|da|gat|ok di)( (nha|nhe|lomi|luon|di|ne|a|chu))*$/.test(
    normalizeVi(text),
  );
}
export function isDecline(text: string): boolean {
  return /^(khong|ko|k|thoi|khoi|khong can|de sau|no|nope|thoi khoi|khong dau|thoi nha)( (nha|nhe|lomi|a|dau))*$/.test(normalizeVi(text));
}
