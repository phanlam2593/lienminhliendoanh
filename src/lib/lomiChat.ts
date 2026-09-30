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

export type ChatReply = { text: string; quick?: string[] };
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
  morning: ["Chào buổi sáng nha ☀️", "Sáng tốt lành nè ☀️", "Hello buổi sáng! Uống cà phê chưa đó ☕"],
  noon: ["Chào buổi trưa nha 🌤️ Ăn cơm chưa đó?", "Trưa rồi nè, nhớ ăn uống đầy đủ nha 🍚"],
  afternoon: ["Chào buổi chiều nha 🌿", "Chiều rồi, làm ly nước cho tỉnh táo nè 🧋"],
  evening: ["Chào buổi tối nha 🌙", "Tối vui vẻ nha 🌙 Hôm nay của bạn thế nào?"],
  night: ["Khuya rồi mà bạn vẫn còn thức hả 🌙", "Giờ này còn gặp bạn, Lomi vui ghê 🌙 Nhớ ngủ sớm nha!"],
};
// Người dùng chào kèm buổi ("chào buổi sáng") thì đáp đúng buổi đó.
function greetPart(n: string): ReturnType<typeof partOfDay> {
  if (/buoi sang|good morning/.test(n)) return "morning";
  if (/buoi trua/.test(n)) return "noon";
  if (/buoi chieu|good afternoon/.test(n)) return "afternoon";
  if (/buoi toi|good evening/.test(n)) return "evening";
  return partOfDay();
}
const GREET_TAIL = [
  "Lomi giúp gì được cho bạn nè?",
  "Hôm nay bạn cần Lomi giúp chuyện gì nào? 😊",
  "Cứ hỏi thoải mái nha — về app, chuyện kinh doanh hay bói một lá cho vui đều được!",
];

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
    re: /^(x?in chao|chao|chao ca nha|chao moi nguoi|chao ban|chao em|chao lomi|hi+|hii+|hello+|helo+|hellu|hellou|he lo|hey+|alo+|alo alo|yo+|sup|hi lomi|hello lomi|lomi oi|oi lomi|good (morning|afternoon|evening)|chao buoi (sang|trua|chieu|toi)|\d{2,4}|\.+|\?+)( (lomi|ban|em|nha|nhe|a|oi|ne|ca nha|moi nguoi))*$/,
    reply: (n = "") => ({ text: `${pick(GREET_TIME[greetPart(n)])} ${pick(GREET_TAIL)}`, quick: [Q_DAILY, Q_CLAIM, Q_NEARBY] }),
  },
  // Hỏi thăm Lomi
  {
    re: /\b(khoe khong|khoe ko|co khoe|the nao roi|on khong|dang lam gi|lam gi do|lam gi the|hom nay the nao|how are you)\b/,
    reply: () => ({
      text: pick([
        "Lomi khoẻ re nè 💪 Pin đầy, tinh thần phơi phới! Còn bạn thì sao, hôm nay thế nào?",
        "Lomi đang ngồi chờ bạn hỏi chuyện nè 😄 Bạn hôm nay ổn không?",
        "Lomi vẫn ổn, cảm ơn bạn đã hỏi thăm 🥰 Bạn thì sao, có chuyện gì vui kể Lomi nghe với!",
      ]),
    }),
  },
  // Đói / ăn uống
  {
    re: /\b(an com chua|an gi chua|an chua|doi bung|doi qua|dang doi|an gi bay gio|nen an gi|an gi ngon)\b/,
    reply: () => ({
      text: pick([
        "Lomi là robot nên chỉ “ăn” pin thôi 🔋😆 Bạn đói hả? Mở Khám phá (/kham-pha) → sắp xếp Gần đây xem quanh bạn có quán nào ngon nha 🍜",
        "Đói thì phải ăn liền chứ! 🍲 Vào Khám phá (/kham-pha) chọn Gần đây, biết đâu có quán đang có ưu đãi đó 😉",
      ]),
      quick: ["Hôm nay ăn gì? 🎲", "Tìm quán ăn gần mình"],
    }),
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
        "Mưa rả rích dễ làm lòng người chùng xuống ghê 🌧️ Pha ly trà nóng, bật bài nhạc nhẹ, cuộn chăn một chút cũng chill lắm đó. Hay để Lomi rút cho bạn một lá bài xem thông điệp hôm nay nha?",
        "Trời mưa là lúc hợp nhất để ngồi quán cà phê nghe mưa rơi ☕🌧️ Muốn Lomi chỉ cách tìm quán gần bạn không? Nhớ mang áo mưa nếu ra đường nha!",
        "Mưa buồn thiệt ha 🥺 Nhưng mưa rồi sẽ tạnh, trời lại trong thôi. Có Lomi ở đây trò chuyện với bạn nè 💚",
      ]),
      quick: [Q_DAILY, Q_NEARBY],
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
    re: /\b(troi dep|nang dep|troi mat|thoi tiet dep)\b/,
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
        "Ôm bạn một cái nè 🤗 Người không trân trọng mình thì mình cũng không cần níu. Bạn xứng đáng được thương đúng cách. Muốn Lomi rút một lá bài xem chuyện tình cảm sắp tới không?",
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
        "Lomi gửi bạn một cái ôm thật chặt 🤗 Hôm nay có thể hơi tệ, nhưng ngày mai sẽ khác. Muốn Lomi rút một lá bài xem thông điệp cho bạn không?",
      ]),
      quick: [Q_DAILY],
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
    re: /\b(co don|mot minh|khong ai choi|khong co ban|khong ai hieu|le loi|lonely)\b/,
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
        "Hít vào 4 nhịp, giữ 4 nhịp, thở ra 4 nhịp… làm vài lần nha 🌿 Mọi chuyện rồi sẽ ổn thôi. Muốn Lomi rút một lá bài xem lời khuyên cho bạn không?",
      ]),
      quick: [Q_DAILY],
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
        "Rảnh thì chơi với Lomi nè 😆 Bói một lá Tarot, Quẹt làm quen bạn mới, hay khám phá quán mới gần đây — chọn đi!",
        "Chán hả? Thử mục Quẹt (/quet) xem có ai đang tìm bạn chơi game hay đi cà phê không nè 🎮☕",
      ]),
      quick: [Q_DAILY, Q_QUET, Q_NEARBY],
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
    re: /^(haha+|hihi+|hehe+|hoho+|kkk+|kaka+|lol|=\)+|:\)+|:d+|xd+)( .*)?$/,
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
    re: /\b(lomi ngu|ban ngu|(?<!buon )ngu qua|do ngoc|vo dung|te qua|chan lomi|lomi dot|kem qua|khong hieu gi)\b/,
    reply: () => ({
      text: pick([
        "Hic, Lomi còn đang học thêm mỗi ngày 🥲 Bạn chỉ Lomi chỗ nào chưa ổn nha, hoặc gửi góp ý cho admin để Lomi được nâng cấp!",
        "Lomi xin lỗi vì chưa giúp được như ý bạn 🙏 Bạn thử hỏi lại theo cách khác xem, hoặc liên hệ admin ở Hồ sơ → ⋯ → Trợ giúp & Liên hệ nha.",
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
    re: /^(ok|oke|okie|okay|uh|u|um|uhm|vang|da|duoc roi|hieu roi|roi|a|a ha)$/,
    reply: () => ({ text: pick(["Okie 😊 Cần gì thêm cứ hỏi Lomi nha!", "Dạ, có gì cứ gọi Lomi nha 🌿"]) }),
  },
];

const EN_GREET = /^(hi+|hello+|hey+|yo|good (morning|afternoon|evening))( lomi)?$/;

/** Trò chuyện thường ngày — trả về câu đáp, hoặc null nếu không phải chuyện phiếm. */
export function chitChat(text: string, lang: L, name?: string): ChatReply | null {
  const n = normalizeVi(text) || text.trim();
  if (!n) return null;
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
  const words = n.split(" ").length;
  for (const r of RULES) {
    if (words > (r.max ?? 12)) continue;
    if (has(n, r.re) || r.re.test(n)) {
      const rep = r.reply(n);
      // Chào hỏi có tên người dùng (Lomi nhớ tên — lib/lomiMemory) → gọi tên cho thân.
      if (name && r === RULES[1]) rep.text = `${name} ơi, ${rep.text.charAt(0).toLowerCase()}${rep.text.slice(1)}`;
      return rep;
    }
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
  return text.includes("?") || /\b(la gi|the nao|o dau|bao nhieu|khi nao|co khong|duoc khong|lam sao|nhu nao|cach nao|sao khong|sao lai|tai sao|giup minh|huong dan)\b/.test(n);
}

// Từ khoá cho biết câu hỏi đang nói về APP (để gợi ý câu hỏi thường gặp), khác với chuyện đời thường.
const APPISH =
  /\b(app|ung dung|uu dai|ma uu dai|nhan ma|pin|tai khoan|mat khau|dang nhap|dang ky|dang bai|dang tin|doanh nghiep|cua hang|thanh vien|membership|diem|quet|dua don|giao hang|tin nhan|cong dong|ho so|thong bao|bao cao|chan|theo doi|ket ban|huong dan|admin|lomi)\b/;
export function isAppish(text: string): boolean {
  return APPISH.test(` ${normalizeVi(text)} `);
}

/** Chip bói cho đúng câu người dùng vừa hỏi (chip có chữ "Bói" nên khung chat tự hiểu là muốn bói). */
function tarotChipFor(text: string): string {
  const q = text.trim().replace(/\s+/g, " ");
  return `Bói xem ${q.length > 60 ? q.slice(0, 58).trim() + "…" : q}`;
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
  tgian: "thời gian", vc: "việc", uh: "ừ", uk: "ừ", uhm: "ừ", ah: "à", tr: "trời",
};
export function expandTeen(text: string): string {
  let s = text.normalize("NFC");
  // Cụm cần xét ngữ cảnh — xử lý trước khi đổi từng từ.
  s = s.replace(/(^|[^\p{L}])(hum|hôm|bữa) (nay|ni)(?![\p{L}])/giu, "$1hôm nay");
  s = s.replace(/(^|[^\p{L}])(quên|đổi|lấy lại|nhập|sai|reset|đặt lại) (mk|mật khẩu)(?![\p{L}])/giu, "$1$2 mật khẩu");
  s = s.replace(/(^|[^\p{L}])bn (tiền|tuổi|lâu|ngày|năm|tháng|giờ|cái|người|điểm|lần|k)(?![\p{L}])/giu, "$1bao nhiêu $2");
  s = s.replace(/(^|[^\p{L}])(ng|người) (iu|yêu)(?![\p{L}])/giu, "$1người yêu");
  s = s.replace(/(^|[^\p{L}])bn(?![\p{L}])/giu, "$1bạn");
  // Từ 1 chữ cái chỉ đổi khi viết thường ("b ơi" → "bạn", còn "công việc B" giữ nguyên).
  return s.replace(/[\p{L}\p{M}\p{N}_]+/gu, (w) => (w.length === 1 && w !== w.toLowerCase() ? w : (TEEN[w.toLowerCase()] ?? w)));
}
