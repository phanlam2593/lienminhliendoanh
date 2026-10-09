// ─────────────────────────────────────────────────────────────────────────────
// LOMI ĐỌC CẤU TRÚC CÂU TIẾNG VIỆT (09/10) — chạy trên máy, không gọi AI.
//
// Các lớp cũ (lomiChat, lomiSense, lomiUnderstand) hiểu theo kiểu "thấy từ khoá → đáp câu mẫu": không lớp nào biết
// AI là chủ ngữ, câu có PHỦ ĐỊNH không, chuyện ĐÃ QUA hay SẮP TỚI, đang CHÀO / CHÚC hay đang KỂ. Vì vậy "a chưa đói" bị đáp
// "Bụng réo rồi hả", "con chó nhà a dễ thương" bị hiểu là khen Lomi, "tối qua a ngủ ngon lắm" bị đáp như lời chúc ngủ ngon.
//
// File này KHÔNG thêm câu mẫu. Nó tách một câu thành KHUNG (Frame):
//
//   câu gốc → chuẩn hoá teen code → nhận cụm trước, từ đơn sau → vai của từng từ → chủ ngữ / vị ngữ → loại câu
//
//   • act      loại câu: chào, chúc, cảm ơn, hỏi, rủ, xin phép đi, kể, mẩu câu
//   • subject  ai / cái gì là chủ ngữ: người nói, Lomi, người thứ ba, con vật, đồ vật, nơi chốn, thời tiết
//   • neg      có phủ định không (và phủ định cái gì)
//   • time     thời điểm + thì (đã qua / đang / sắp tới) — "tối nay" đọc theo đồng hồ
//   • pred     vị ngữ: trạng thái, mong muốn, việc làm, đi đâu, ở đâu, tính chất… + phần bổ ngữ nguyên văn
//   • degree   mức độ (hơi / rất…)
//   • conf     độ chắc 0..1 — thấp thì lớp gọi không được đáp theo khung
//
// Từ điển ở đây là các NHÓM TỪ ĐÓNG của tiếng Việt (đại từ, từ chỉ thời gian, phủ định, mức độ, tiểu từ cuối câu…)
// và các động từ / tính từ thông dụng — là vốn từ, không phải danh sách câu. Từ lạ vẫn được chấp nhận ở vị trí
// bổ ngữ / tên riêng ("mai a đi Phú Quốc", "a mới mua cái máy pha cà phê").
//
// Nguyên tắc: giữ câu gốc (raw), không thay raw bằng câu chuẩn; một từ có thể mang nhiều vai tuỳ vị trí
// ("không" phủ định / hỏi, "mới" vừa xong / mới tinh, "đi" đi lại / giục); ưu tiên CỤM trước từ đơn.
// ─────────────────────────────────────────────────────────────────────────────
import { expandTeen } from "@/lib/lomiChat";
import { isAskLike } from "@/lib/lomiSense";
import type { Addr } from "@/lib/lomiAddress";

export type Role =
  | "SELF" // người nói: a, anh, chị, mình, tui…
  | "EM" // e / em — người nói hay Lomi tuỳ câu
  | "YOU" // Lomi, bạn
  | "THIRD" // nó, họ, anh ấy…
  | "KIN" // người thân / người quen: mẹ, vợ, sếp, bạn gái…
  | "CLS" // loại từ: cái, con, chiếc…
  | "NOUN" // danh từ đã biết nhóm (con vật, đồ vật, nơi chốn)
  | "TIME"
  | "ASPECT" // đã, đang, sẽ, vừa, mới, sắp, rồi…
  | "NEG"
  | "DEGREE"
  | "QWORD" // gì, đâu, sao, ai…
  | "QPART" // không / chưa / hả… đứng cuối câu hỏi
  | "PART" // tiểu từ cuối câu, từ lịch sự: nha, nhé, ạ…
  | "VOC" // ơi, ê
  | "GREET"
  | "WISH"
  | "THANK"
  | "GOOD" // điều tốt lành trong lời chúc: vui vẻ, an lành, ngủ ngon…
  | "DESIRE" // muốn, thèm, thích…
  | "MOTION" // đi, về, ghé, tới…
  | "VERB"
  | "COG" // biết, nghĩ, nhớ, quên, đùa…
  | "STATE" // trạng thái của người / vật: đói, mệt, vui, rảnh, hư…
  | "ADJ" // tính chất: đẹp, ngon, dễ thương, trễ…
  | "PREP"
  | "DEM" // này, đó, kia
  | "INDEF" // gì đó, đâu đó
  | "CONJ"
  | "FILL"
  | "NUM"
  | "UNK";

/** Vai ngữ pháp / ngữ nghĩa gắn cho từng từ sau khi đọc cấu trúc (để test và để lớp gọi dùng). */
export type GRole = "SUBJECT" | "PERSON" | "VERB" | "STATE" | "ADJECTIVE" | "ADVERB" | "TIME" | "PLACE" | "OBJECT" | "ENTITY" | "QUESTION" | "NEGATION" | "DEGREE" | "POLITENESS" | "EMOTION" | "GREETING" | "WISH";

export type Rel = "past" | "now" | "future";
export type Part = "sáng" | "trưa" | "chiều" | "tối" | "đêm";
type Ent = { r: Role; v?: number; rel?: Rel; part?: Part; cls?: string; today?: boolean; low?: boolean; w?: string };
export type Tok = Ent & { t: string; /** Chữ người dùng gõ (giữ hoa / thường) — dùng khi nhắc lại tên riêng. */ o?: string; /** Từ đầu câu (viết hoa ở đó chưa chắc là tên riêng). */ init?: boolean; g?: GRole; amb?: boolean };

export type Act = "greet" | "wish" | "thanks" | "leave" | "hold" | "question" | "request" | "invite" | "statement" | "fragment";
export type SubjectKind = "self" | "you" | "third" | "pet" | "thing" | "place" | "weather" | "none";
export type PredKind = "state" | "desire" | "activity" | "motion" | "location" | "quality" | "event" | "cognition" | "possess";
export type AskKind = "yesno" | "what" | "where" | "when" | "who" | "how" | "why" | "which" | "howmany";

export type Frame = {
  raw: string;
  toks: Tok[];
  act: Act;
  /** Chào / gọi ở đầu rồi mới vào ý chính ("chào e, a mới đi làm về"). */
  greeted: boolean;
  subject: SubjectKind;
  /** Cụm chủ ngữ để nhắc lại trong câu đáp, đã đổi ngôi ("con chó nhà a" → "con chó nhà bạn"). */
  subjectText?: string;
  /** Nhóm của chủ ngữ là người: partner (vợ, chồng, người yêu…), boss (sếp, đồng nghiệp, khách), person (còn lại). */
  subjectCls?: string;
  /** Từ người nói dùng để tự xưng trong câu, làm chủ ngữ hay chỉ sở hữu ("a đói", "mẹ a") — để học cách xưng hô. */
  selfWord?: string;
  /** Câu có "e / em": đó là Lomi ("you") hay người nói tự xưng ("self"). */
  em?: "you" | "self";
  /** Câu có gọi Lomi (e ơi, … nha e). */
  addressee: boolean;
  neg: boolean;
  /** Từ phủ định người dùng dùng ("chưa" khác "không") — để câu đáp nhắc lại cho đúng. */
  negWord?: string;
  time?: { rel?: Rel; part?: Part; label: string; explicit: boolean; soon?: boolean; occasion?: string };
  degree?: "low" | "high";
  pred?: { kind: PredKind; head: string; cls?: string; obj: string; /** obj bỏ tính từ nhận xét ở cuối ("xem phim xong | hay") */ objCore?: string; /** Từ chính của vị ngữ có trong vốn từ (false = động từ lạ, chỉ đoán theo vị trí). */ known: boolean; /** Việc đã xong ("ăn rồi", "thi xong rồi"). */ done?: boolean; val: number; place?: string; indef?: boolean; recent?: boolean; ongoing?: boolean; planned?: boolean; qual?: string };
  ask?: AskKind;
  /** Lời chúc: điều được chúc + chúc cho ai. */
  wish?: { good: string; to: "you" | "self"; occasion?: string };
  /** "xin phép đi": lát quay lại hay đi luôn. */
  leave?: "brb" | "go";
  polite: boolean;
  tags: GRole[];
  /** Câu gõ không dấu → đọc lỏng hơn, độ chắc thấp hơn. */
  loose: boolean;
  /** Câu có từ 2 mệnh đề có nội dung trở lên — khung chỉ đọc mệnh đề chính, lớp gọi nên dè dặt. */
  multi: boolean;
  conf: number;
};

// ── Từ điển ─────────────────────────────────────────────────────────────────
const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
const LEX = new Map<string, Ent>();
const LEX_U = new Map<string, Ent & { amb?: boolean }>();
let MAXLEN = 1;
function add(r: Role, list: string, extra: Omit<Ent, "r"> = {}) {
  for (const w0 of list.split("|")) {
    const w = w0.trim();
    if (!w) continue;
    const e: Ent = { r, ...extra, w };
    if (!LEX.has(w)) LEX.set(w, e);
    MAXLEN = Math.max(MAXLEN, w.split(" ").length);
    const u = strip(w);
    const old = LEX_U.get(u);
    if (!old) LEX_U.set(u, e);
    else if (old.w !== w) old.amb = true;
  }
}

const PARTS: [Part, string][] = [
  ["sáng", "sáng"],
  ["trưa", "trưa"],
  ["chiều", "chiều"],
  ["tối", "tối"],
  ["đêm", "đêm"],
  ["đêm", "khuya"],
];
// Thời gian — cụm dài đứng trước để "tối hôm qua" không bị tách thành "tối" + "hôm qua".
for (const [p, w] of PARTS) {
  add("TIME", `${w} hôm qua|${w} qua|hồi ${w}|${w} hôm kia|${w} hôm trước`, { rel: "past", part: p });
  add("TIME", `${w} ngày mai|${w} mai|${w} mốt`, { rel: "future", part: p });
  add("TIME", `${w} hôm nay|${w} nay`, { part: p, today: true });
  add("TIME", `${w} giờ`, { rel: "now", part: p }); // "sáng giờ a chưa ăn gì" = từ sáng tới giờ
  add("TIME", `buổi ${w}|bữa ${w}|ban ${w}|${w} sớm`, { part: p });
  add("TIME", w, { part: p, today: true }); // "chiều a đi đá bóng" = chiều nay — đã qua hay sắp tới thì xem đồng hồ
}
add("TIME", "sáng sớm|sáng tinh mơ", { part: "sáng" });
add("TIME", "giữa trưa|xế trưa", { part: "trưa" });
add("TIME", "xế chiều|chiều tà|chiều muộn", { part: "chiều" });
add("TIME", "chiều tối|tối muộn|chập tối", { part: "tối" });
add("TIME", "đêm khuya|nửa đêm", { part: "đêm" });
add("TIME", "hôm qua|hôm kia|hôm trước|hôm bữa|bữa trước|bữa hổm|tuần trước|tuần rồi|tháng trước|tháng rồi|năm ngoái|năm trước|hồi nãy|lúc nãy|vừa nãy|ban nãy|khi nãy|nãy|hồi đó|hồi xưa|ngày xưa|trước đây|dạo trước|cuối tuần trước|cuối tuần rồi|vừa rồi|mới đây", { rel: "past" });
add("TIME", "hôm nay|bữa nay|nay|bây giờ|giờ này|lúc này|hiện tại|hiện giờ|dạo này|mấy nay|mấy bữa nay|mấy hôm nay|dạo gần đây|gần đây|tuần này|tháng này|năm nay|nãy giờ|giờ", { rel: "now" });
add("TIME", "ngày mai|mai mốt|ngày mốt|ngày kia|mai|mốt|tuần sau|tuần tới|tháng sau|tháng tới|năm sau|năm tới|sang năm|cuối tuần này|cuối tuần sau|cuối tuần tới|cuối tuần|cuối tháng|cuối năm|sắp tới|sau này|hè này|dịp tết|tết này", { rel: "future" });
add("TIME", "lát nữa|lát hồi|tí nữa|tý nữa|chút nữa|xíu nữa|tẹo nữa|lát", { rel: "future", cls: "soon" });
for (const d of ["hai", "ba", "tư", "năm", "sáu", "bảy", "2", "3", "4", "5", "6", "7"]) {
  add("TIME", `thứ ${d} này|thứ ${d} tới|thứ ${d} sau|thứ ${d} tuần sau`, { rel: "future", cls: "day" });
  add("TIME", `thứ ${d} trước|thứ ${d} rồi|thứ ${d} tuần trước`, { rel: "past", cls: "day" });
  add("TIME", `thứ ${d}`, { cls: "day" });
}
add("TIME", "chủ nhật này|chủ nhật tới|chủ nhật sau", { rel: "future", cls: "day" });
add("TIME", "chủ nhật trước|chủ nhật rồi", { rel: "past", cls: "day" });
add("TIME", "chủ nhật|ngày mới|đầu tuần|tuần mới|đầu tháng|tháng mới|năm mới|đầu năm|ngày nghỉ|kỳ nghỉ|ngày lễ|lễ|tết|giáng sinh|noel|trung thu|valentine|sinh nhật|một ngày|cả ngày|cả tuần", { cls: "occasion" });

add("SELF", "anh|a|chị|c|mình|tui|tôi|tớ|tao|tụi mình|bọn mình|tụi anh|tụi tui|chúng tôi|chúng mình|chúng ta|tụi em");
add("EM", "em|e");
add("YOU", "lomi|bạn|bot|mày");
add("THIRD", "anh ấy|chị ấy|cô ấy|ông ấy|bà ấy|bạn ấy|người ấy|người đó|người ta|nó|họ|ổng|bả|ảnh|tụi nó|mọi người|ai đó");
// partner / boss: chuyện không vui với những người này là chuyện TÂM SỰ của chính người nói (thư viện tâm sự lo).
add("KIN", "bạn gái|bạn trai|người yêu cũ|người yêu|bà xã|ông xã|vợ|chồng|bồ|crush", { cls: "partner" });
add("KIN", "đồng nghiệp|nhân viên|sếp|khách", { cls: "boss" });
add("KIN", "ba mẹ|bố mẹ|cha mẹ|ông bà|vợ con|anh trai|chị gái|em trai|em gái|con trai|con gái|bạn thân|bạn bè|hàng xóm|cô giáo|thầy giáo|gia đình|thằng bạn|con bạn|đứa bạn|mấy đứa bạn|đứa nhỏ|mấy đứa nhỏ|tụi nhỏ|mẹ|má|ba|bố|cha|thầy|cô|dì|chú|bác|cậu|mợ|thím|cháu|ông|bà|nội|ngoại|bé|nhóc", { cls: "person" });
add("NOUN", "chó|mèo|cún|chim|cá|thỏ|hamster|rùa|vẹt|gà|vịt|heo|bò", { cls: "pet" });
add("NOUN", "xe máy|xe đạp|xe hơi|ô tô|điện thoại|máy tính|máy lạnh|máy giặt|tủ lạnh|chìa khoá|chìa khóa|đồng hồ|xe|máy|laptop|tivi|áo|quần|giày|dép|túi|ví|kính|tóc|wifi|mạng|điện|đèn|quạt|bếp|nước", { cls: "thing" });
add("NOUN", "quán cà phê|quán cafe|quán nhậu|quán ăn|quán nước|nhà hàng|công ty|cơ quan|văn phòng|siêu thị|bệnh viện|sân bay|bến xe|công viên|khách sạn|homestay|thành phố|ngoài đường|đà lạt|sài gòn|hà nội|đà nẵng|nha trang|phú quốc|vũng tàu|hội an|quán|tiệm|chỗ làm|chỗ|trường|lớp|chợ|quê|biển|núi|rừng|đồi|hồ|huế|nhà|phòng", { cls: "place" });
add("NOUN", "trời|thời tiết|ngoài trời|bên ngoài", { cls: "weather" });
add("CLS", "cái|chiếc|con|đứa|thằng|quyển|cuốn|đôi|căn|tấm|bức|bộ");
add("DEM", "này|đó|kia|ấy|đấy");
add("INDEF", "cái gì đó|chỗ nào đó|món gì đó|gì đó|đâu đó|nào đó|gì đấy|đâu đấy");

add("ASPECT", "vừa mới|mới vừa|đã từng|đã|vừa|mới|từng", { rel: "past" });
add("ASPECT", "vẫn đang|còn đang|đang", { rel: "now" });
add("ASPECT", "sắp sửa|chuẩn bị|dự định|đang tính|đang định|sẽ|sắp|định|tính", { rel: "future" });
add("ASPECT", "xong rồi|rồi|xong", { rel: "past", cls: "post" });
add("NEG", "không phải|đâu có|chưa có|không có|chả có|chẳng có|không|chưa|chẳng|chả|đừng|khỏi|ko|k");
add("DEGREE", "rất|siêu|cực kỳ|cực kì|thật sự|khá");
add("DEGREE", "hơi|một chút|một tí|một xíu|chút|tí|xíu|tẹo", { low: true });
add("DEGREE", "quá trời|quá chừng|lắm luôn|ghê luôn|dã man|kinh khủng|quá|lắm|ghê|cực|thật|thiệt|vãi|xỉu|nhiều");
add("QWORD", "cái gì|là gì|gì|chi", { cls: "what" });
add("QWORD", "ở đâu|đâu", { cls: "where" });
add("QWORD", "nào", { cls: "which" });
add("QWORD", "như thế nào|thế nào|làm sao|ra sao|sao", { cls: "how" });
add("QWORD", "tại sao|vì sao", { cls: "why" });
add("QWORD", "ai", { cls: "who" });
add("QWORD", "bao nhiêu|bao lâu|mấy", { cls: "howmany" });
add("QWORD", "khi nào|bao giờ|mấy giờ|lúc nào", { cls: "when" });
add("QPART", "phải không|đúng không|được không|hả|hử|ư|nhỉ|chứ");
add("PART", "tí nào|chút nào|xíu nào|gì hết|gì cả", { cls: "atall" }); // "chẳng buồn ngủ tí nào"
add("PART", "nha|nhé|nhen|nghen|nhá|nè|nà|á|ạ|dạ|vậy|thế|luôn|thôi|mà|hen|ha|ta|với|giùm|giúp|hộ|dùm|đây");
add("VOC", "ơi|ê|ey|alo");
add("GREET", "xin chào|chào|hello|helo|hi|hey|hé lô|hế lô|good morning|good evening");
add("WISH", "chúc mừng|chúc");
add("THANK", "cảm ơn|cám ơn|thanks|thank you|thank");
add("GOOD", "vui vẻ|tốt lành|an lành|bình an|may mắn|thành công|hạnh phúc|ngủ ngon|ngon giấc|ngon miệng|mạnh khoẻ|mạnh khỏe|sức khoẻ|sức khỏe|thuận lợi|suôn sẻ|như ý|phát tài|đắt hàng|mơ đẹp|ấm áp|trọn vẹn|nhiều niềm vui|thượng lộ bình an", { v: 1 });

add("DESIRE", "muốn|thèm|thích|cần|mong|ước|khoái|mê|ghiền|ưa");
add("DESIRE", "ghét", { v: -1 });
add("MOTION", "quay lại|trở lại|ghé lại|vào lại|trở về", { cls: "return" });
add("MOTION", "đi|về|ra|vô|vào|tới|đến|lên|xuống|ghé|sang|bay");
add("VERB", "câu cá|đá bóng|đá banh|leo núi|du lịch|cắm trại|xem phim|coi phim|nghe nhạc|ăn cưới|nghỉ phép|nghỉ ngơi|dạo phố|đi dạo|chạy bộ|tập gym|tập thể dục|bơi|phượt|chơi|hát|nhậu|nghỉ|cưới", { cls: "leisure" });
add("VERB", "làm việc|công tác|tăng ca|phỏng vấn|thuyết trình|báo cáo|kiểm tra|đi làm|đi học|họp|thi|học|trực|làm|khám", { cls: "duty" });
add("VERB", "nhắn lại|gọi lại|nói chuyện sau|nói sau", { cls: "return" });
add("VERB", "chăm sóc|chăm nom|chăm|nuôi bệnh", { cls: "care" });
add("VERB", "có hẹn|hẹn hò|hẹn", { cls: "leisure" });
add("VERB", "thức khuya|dậy sớm|dậy trễ|dậy muộn|ngủ trưa|ngủ nướng|rửa chén|rửa bát|quét nhà|lau nhà|phơi đồ|giặt đồ|chuyển nhà|dọn nhà|rửa|quét|lau|phơi|chuyển", { cls: "daily" });
add("VERB", "nấu ăn|nấu cơm|cắt tóc|ăn sáng|ăn trưa|ăn tối|ăn khuya|ăn đêm|ăn vặt|ăn cơm|ăn|uống|ngủ|dậy|thức|nấu|tắm|giặt|dọn|sửa|mua|bán|gặp|đón|đưa|chờ|đợi|xem|coi|nghe|đọc|viết|vẽ|chụp|gọi|nhắn|nói|kể|mang|lấy|trồng|nuôi|thăm|chăm|trông|ngồi|nằm|đứng|sống|lái|chở|tập|chạy|dắt|dẫn", { cls: "daily" });
add("VERB", "tìm|kiếm|hỏi|nhờ|chọn|đặt|order|tư vấn|bói", { cls: "seek" });
add("COG", "nói giỡn|nói đùa|nói chơi|đùa|giỡn", { cls: "joke" });
add("COG", "cảm thấy|biết|nghĩ|hiểu|nhớ|tin|chắc|đoán|tưởng|thấy|rõ");
add("STATE", "buồn ngủ|thèm ngủ|đói bụng|đói|khát", { cls: "need", v: 0 });
add("STATE", "no", { cls: "need", v: 1 });
add("STATE", "rảnh rỗi|rảnh", { cls: "free", v: 0 });
add("STATE", "bận rộn|bận", { cls: "busy", v: 0 });
add("STATE", "mệt mỏi|lo lắng|căng thẳng|cô đơn|thất vọng|hoang mang|khó chịu|áp lực|buồn|chán|mệt|lo|sợ|giận|bực|tức|stress|tủi|nản|đuối", { cls: "feel", v: -1 });
add("STATE", "hạnh phúc|thoải mái|phấn khích|hào hứng|yên tâm|vui", { cls: "feel", v: 1 });
add("STATE", "khoẻ|khỏe|ổn|đỡ", { cls: "well", v: 1 });
add("STATE", "mất ngủ|ốm yếu|ốm|bệnh|đau|sốt|cảm|ho|bỏ ăn|biếng ăn|bỏ bú|tiêu chảy|co giật|khó thở|trầm cảm|tai biến|đột quỵ|ung thư|tiểu đường|cao huyết áp|huyết áp cao|viêm phổi|sốt xuất huyết", { cls: "ill", v: -1 });
add("STATE", "hết pin|hết xăng|hết tiền|mất điện|cúp điện|kẹt xe|chia tay|cãi nhau|hư|hỏng|bể|vỡ|rớt|thua|mất|quên", { cls: "bad", v: -1 });
add("STATE", "qua đời|chết", { cls: "death", v: -1 });
add("STATE", "thất nghiệp|mất việc|nghỉ việc|tai nạn|nhập viện|nằm viện|vào viện|vô viện|cấp cứu|đi cấp cứu|phải mổ|đi mổ|mổ|phẫu thuật|sảy thai|té xe|ngã xe|té|ngã|bị thương|gãy tay|gãy chân|ly hôn|ly dị|phá sản|đám tang|đám ma|bị đuổi", { cls: "bad", v: -1 });
add("STATE", "thắng|đậu|đỗ|trúng|tăng lương|lên lương|thăng chức|lên chức|trúng thưởng", { cls: "good", v: 1 });
add("ADJ", "dễ thương|đáng yêu|thông minh|vui tính|dễ chịu|yên tĩnh|đẹp|xinh|cute|ngon|giỏi|tốt|xịn|đỉnh|tuyệt|ngoan|hiền|siêng|sạch|rộng|rẻ|ấm|mát|êm|chill|thơm|ngầu|hay", { v: 1 });
add("ADJ", "khó tính|xấu|dở|tệ|lười|dơ|bẩn|chật|cũ|đắt|mắc|ồn|hôi|dữ|trễ|muộn|chậm", { v: -1 });
add("ADJ", "to|nhỏ|lớn|cao|thấp|dài|ngắn|ít|sớm|nhanh|xa|gần", { v: 0 });
add("ADJ", "âm u|u ám|mát mẻ|se lạnh|oi bức|nắng gắt|mưa phùn|mưa rào|sương mù|nhiều mây|nóng|lạnh|mưa|nắng|gió|rét|oi|bão|giông", { v: 0, cls: "weather" });
add("PREP", "ở|tại", { cls: "loc" });
add("PREP", "cùng|cho|của|từ|trong|ngoài|trên|dưới|bằng|để");
add("CONJ", "tại vì|nhưng|vì|do|nên|và|hoặc");
add("FILL", "một mình|ai cũng|ai nấy|buổi|bữa|tự nhiên|thật ra|hình như|có lẽ|chắc là|thì|là|cũng|lại|cứ|chỉ|toàn|đều|còn|nữa|hết|ơ|à|ờ|ừ|ủa|ui|ôi|chắc|có|bị|được|một|vẫn");

// 11/10 — thêm SAU CÙNG, để khi gõ không dấu các từ có sẵn vẫn được ưu tiên ("cam" = cảm, "mang" = mang, "nghi" = nghỉ, "cai" = cái):
// • việc người ta làm VỚI NHAU — trước đây là từ lạ nên "mà sếp không khen", "ảnh còn doạ đánh e" không đọc ra chủ ngữ / vị ngữ;
// • nét tính cách hay bị than về một người ("chồng e ít nói lắm", "sếp a gia trưởng") — là lời chê, không phải câu trung tính.
add("VERB", "xin lỗi|làm lành|nói dối|ngoại tình|kiểm soát|nghi ngờ|la mắng|khen|chê|mắng|chửi|trách|ghen|nghi|than|giấu|cấm|doạ|dọa|đánh|lừa|cãi", { cls: "social" });
add("STATE", "sốt ruột|hay khóc|khóc", { cls: "feel", v: -1 });
add("STATE", "có bầu|có thai|mang thai|mang bầu|bầu bí|bầu", { cls: "preg", v: 0 });
add("STATE", "bị bắt nạt|bắt nạt|bị ăn hiếp|ăn hiếp|bị tẩy chay|tẩy chay|bị cô lập|bị trêu chọc|bị xúc phạm", { cls: "bad", v: -1 });
add("ADJ", "ít nói|lạnh nhạt|lạnh lùng|vô tâm|cộc cằn|nóng tính|gia trưởng|ích kỷ|ích kỉ|keo kiệt|bừa bộn|hay ghen|ghen tuông|vô trách nhiệm", { v: -1 });

// Từ không dấu dễ trùng với từ khác NGOÀI từ điển — gặp ở vị trí then chốt thì hạ độ chắc.
const LOOSE_RISK = new Set("toi ban chua dau qua moi an la da co ma no voi thi cho nao ve sang roi nho ngu lam that buon kho doi khoe con day bua mua chan lo so to mat ho cam hay de di ra nha ba bo gap coi nghe".split(" "));

// Gõ không dấu: tiếng nào trùng nhiều từ thì ưu tiên từ thông dụng nhất (đi > dì, ăn > an, ở > ô…).
const LOOSE_PREF: Record<string, string> = { di: "đi", an: "ăn", o: "ở", ve: "về", ngu: "ngủ", ra: "ra", co: "có", la: "là", da: "đã", ban: "bạn", moi: "mới", qua: "quá", khong: "không", chua: "chưa", minh: "mình", toi: "tôi", choi: "chơi", doi: "đói", met: "mệt", buon: "buồn", lo: "lo", vo: "vợ", me: "mẹ", bo: "bố", nay: "nay", mai: "mai", lam: "làm", nha: "nha", day: "đây", dau: "đâu", gi: "gì", sao: "sao", thi: "thì", roi: "rồi", den: "đến" };
for (const [u, w] of Object.entries(LOOSE_PREF)) {
  const e = LEX.get(w);
  if (e) LEX_U.set(u, { ...e, amb: true });
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const DIACRITIC = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/;

/** Tách từ: thử cụm dài nhất trước (tối đa MAXLEN tiếng), không có thì từng tiếng. */
function tokenize(syl: string[], loose: boolean, orig: string[] = syl): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < syl.length) {
    let hit: Tok | null = null;
    let len = 1;
    for (let n = Math.min(MAXLEN, syl.length - i); n >= 1 && !hit; n--) {
      const ph = syl.slice(i, i + n).join(" ");
      const e = LEX.get(ph) ?? (loose ? LEX_U.get(ph) : undefined);
      if (e) {
        const risky = loose && n === 1 && (LOOSE_RISK.has(ph) || !!(e as { amb?: boolean }).amb);
        hit = { ...e, t: e.w ?? ph, amb: risky || undefined };
        len = n;
      }
    }
    if (!hit) hit = { r: /^\d+([.,/:h]\d*)?$/.test(syl[i]) ? "NUM" : "UNK", t: syl[i] };
    hit.o = orig.slice(i, i + len).join(" ");
    if (i === 0) hit.init = true;
    out.push(hit);
    i += len;
  }
  return out;
}

const is = (t: Tok | undefined, ...rs: Role[]) => !!t && rs.includes(t.r);
const PRED_START: Role[] = ["ASPECT", "NEG", "DEGREE", "STATE", "ADJ", "VERB", "MOTION", "DESIRE", "COG", "GOOD"];
const SOFT_END: Role[] = ["PART", "VOC", "QPART", "DEGREE"];

/** Chỉnh vai theo VỊ TRÍ: một từ có thể mang nhiều vai. */
const TITLE = new Set(["anh", "chị", "em", "cô", "chú", "bác", "ông", "bà", "dì", "cậu", "thầy", "bé"]);
function disambiguate(tk: Tok[], loose = false) {
  // "anh Minh nói…", "chị Hoa mới nhắn" — từ xưng hô + TÊN RIÊNG (viết hoa) là người thứ ba, không phải người nói.
  for (let i = 0; i + 1 < tk.length; i++) {
    const n = tk[i + 1];
    if (TITLE.has(tk[i].t) && n.r === "UNK" && n.o && /^\p{Lu}\p{Ll}/u.test(n.o)) Object.assign(tk[i], { r: "KIN", cls: "person" });
    // "chị a đang bệnh", "anh e mới cưới", "em a sắp thi" — anh / chị / em + người nói (viết gọn) là NGƯỜI THÂN của người nói.
    else if (/^(chị|anh|em)$/.test(tk[i].t) && is(n, "SELF", "EM") && /^(a|e|c|mình|tôi|tui|tớ)$/.test(n.t) && n.t !== tk[i].t && i + 2 < tk.length && (i === 0 || is(tk[i - 1], "TIME", "VOC", "FILL"))) Object.assign(tk[i], { r: "KIN", cls: "person" });
  }
  if (loose) {
    for (let i = 0; i < tk.length; i++) {
      const t = tk[i];
      const prev = tk[i - 1];
      const next = tk[i + 1];
      const to = (w: string) => Object.assign(t, { ...LEX.get(w)!, t: w, amb: true });
      // "toi": đầu câu / trước động từ = tôi; còn lại ("buoi toi", "toi roi") = tối.
      if (t.t === "tôi" && !(is(next, "ASPECT", "NEG", "VERB", "MOTION", "DESIRE", "STATE", "COG", "DEGREE", "FILL") && !is(prev, "TIME"))) to("tối");
      // "lam": sau tính từ / trạng thái = lắm; còn lại = làm.
      else if (t.t === "làm" && is(prev, "STATE", "ADJ", "GOOD", "UNK") && !is(next, "QWORD", "INDEF", "UNK", "NOUN")) to("lắm");
      // "nha": sau "ở / về / tới…" hoặc trước người sở hữu = nhà.
      else if (t.t === "nha" && (is(prev, "PREP", "MOTION") || (is(prev, "NOUN", "KIN", "UNK") && is(next, "SELF", "EM")))) to("nhà");
      // "qua": sau trạng thái / tính từ = quá (mặc định); sau người nói ở đầu câu + động từ = qua (đi qua) — giữ "quá".
      else if (t.t === "bạn" && is(prev, "STATE", "ADJ") && !next) to("bận");
      // "ma": trước một người khác ("ma sep ko khen" = mà sếp không khen) là từ nối "mà"; trước người nói ("ma a dang om") vẫn là "má".
      else if (t.t === "má" && is(next, "KIN", "THIRD")) to("mà");
    }
  }
  // Đuôi câu: bỏ qua tiểu từ, gọi trống ("… nha e", "… không e ơi") để tìm từ nội dung cuối cùng.
  let end = tk.length - 1;
  const passiveAgents = () => {
    // CÂU BỊ ĐỘNG: "bị BẠN bắt nạt", "bị SẾP mắng", "bị MẸ A chê", "bị CHỒNG bỏ" — người đứng giữa "bị" và việc xảy ra là NGƯỜI GÂY RA,
    // không phải chủ ngữ / vị ngữ của câu. Việc xảy ra có thể là một từ chưa có trong từ điển ("bị vợ la") — cấu trúc đã đủ rõ.
    for (let i = 1; i < end; i++) {
      if (tk[i - 1].t !== "bị" || !is(tk[i], "KIN", "THIRD")) continue;
      let k = i + 1;
      if (is(tk[k], "KIN") && k < end) k++; // "bị MẸ CHỒNG mắng", "bị ANH TRAI la"
      const own = k;
      if (is(tk[k], "SELF", "EM") && k < end && /^(a|e|c|anh|em|chị|mình|tôi|tui|tớ)$/.test(tk[k].t)) k++; // "bị mẹ A chê"
      if (k > end || !is(tk[k], "VERB", "STATE", "UNK")) continue;
      for (let m = i; m < k; m++) Object.assign(tk[m], { r: "FILL", cls: m < own ? "agent" : "agentOf" });
    }
  };
  while (end > 0 && (is(tk[end], "PART", "VOC", "DEGREE") || (is(tk[end], "EM", "YOU") && end > 1 && tk[end].t !== "bạn"))) end--;
  for (let i = 0; i < tk.length; i++) {
    const t = tk[i];
    const prev = tk[i - 1];
    const next = tk[i + 1];
    // "không / chưa" cuối câu = hỏi; chỗ khác = phủ định.
    if (t.r === "NEG" && i === end && i > 0 && ["không", "chưa", "ko", "k"].includes(t.t)) t.r = "QPART";
    // "mai MỚI sửa được", "tối mới về" — "mới" ngay sau mốc thời gian là "tới lúc đó mới", không phải "vừa mới".
    else if (t.t === "mới" && t.r === "ASPECT" && is(prev, "TIME") && is(next, "VERB", "MOTION", "COG", "UNK")) Object.assign(t, { r: "FILL", rel: undefined });
    // "mới": trước động từ = vừa xong; sau danh từ / cuối câu = mới tinh.
    else if (t.t === "mới" && t.r === "ASPECT" && !is(next, "VERB", "MOTION", "DESIRE", "STATE", "COG", "FILL", "ADJ", "GOOD", "UNK", "PREP")) Object.assign(t, { r: "ADJ", v: 1, rel: undefined });
    // "đã": trước động từ = đã xong; cuối câu = "…đã" (làm cái này trước đã).
    else if (t.t === "đã" && (i >= end || is(next, "PART", "VOC"))) Object.assign(t, { r: "PART", rel: undefined, cls: "leave" });
    else if (t.t === "đây" && i >= end) t.cls = "leave";
    // "cái" cuối câu ("a đi tắm cái") là tiểu từ.
    else if (t.t === "cái" && (i >= end || is(next, "PART", "VOC"))) Object.assign(t, { r: "PART", cls: "leave" });
    // "đi" cuối câu sau một cụm khác là lời giục ("chúc a ngủ ngon đi", "kể đi").
    else if (t.t === "đi" && i > 0 && (i >= end || is(next, "PART", "VOC", "EM", "YOU")) && !is(prev, "SELF", "EM", "YOU", "TIME", "ASPECT", "NEG", "FILL", "COG", "DESIRE")) Object.assign(t, { r: "PART", cls: "urge" });
    // "đâu": sau phủ định ở cuối câu là nhấn mạnh phủ định ("a không buồn đâu").
    else if (t.t === "đâu" && i >= end && tk.slice(0, i).some((x) => x.r === "NEG")) t.r = "PART";
    // 11/10: từ hỏi + "cũng" = TẤT CẢ ("cái gì cũng làm không xong", "ở đâu cũng vậy", "lúc nào a cũng mệt") — là câu kể, không phải câu hỏi.
    else if (t.r === "QWORD" && tk.slice(i + 1, i + 4).some((x) => x.t === "cũng") && !tk.slice(i + 1).some((x) => x.r === "QPART")) t.r = "INDEF";
    // "gì / đâu / sao" sau phủ định = phiếm chỉ ("a chưa ăn gì", "không biết làm gì", "không sao").
    else if (t.r === "QWORD" && tk.slice(0, i).some((x) => x.r === "NEG") && !tk.slice(i + 1).some((x) => x.r === "QPART")) t.r = "INDEF";
    // "đi xem mắt mấy lần rồi", "a ăn mấy chén rồi" — "mấy … rồi" là "vài … rồi" (kể), không phải hỏi bao nhiêu — trừ khi đang hỏi Lomi.
    else if (t.t === "mấy" && t.r === "QWORD" && i < end && tk.slice(i + 1).some((x) => x.r === "ASPECT" && x.cls === "post") && !tk.some((x) => is(x, "EM", "YOU", "QPART"))) t.r = "INDEF";
    // "bỏ mấy lần không được", "nói mấy lần rồi mà không nghe" — "mấy" + phủ định phía sau là "vài", không phải hỏi bao nhiêu.
    else if (t.t === "mấy" && t.r === "QWORD" && tk.slice(i + 1).some((x) => x.r === "NEG") && !tk.some((x) => x.r === "QPART")) t.r = "INDEF";
    // "làm gì đó", "nghĩ gì đấy" cuối câu, không có "muốn / thèm" phía trước = hỏi "gì" + tiểu từ "đó" (khác "ăn gì đó cay cay").
    else if (t.r === "INDEF" && /^gì (đó|đấy)$/.test(t.t) && i >= end && !tk.slice(0, i).some((x) => is(x, "DESIRE", "NEG", "SELF")) && is(prev, "VERB", "COG")) Object.assign(t, { r: "QWORD", cls: "what" });
    // "con": trước con vật / danh từ lạ là loại từ; còn lại là "con" (đứa con).
    else if (t.t === "con" && t.r === "CLS" && !(is(next, "NOUN") && next!.cls === "pet") && !is(next, "UNK")) Object.assign(t, { r: "KIN", cls: "person" });
    // "bạn": có người sở hữu phía sau ("bạn a"), hoặc đứng sau động từ / giới từ ("chờ bạn", "với bạn") là người bạn.
    //   ("bị bạn bắt nạt", "bị bạn chơi xấu" — sau "bị" cũng là người bạn.)
    else if (t.t === "bạn" && t.r === "YOU" && (is(next, "SELF") || (is(next, "EM") && i + 1 < end) || is(prev, "VERB", "MOTION", "PREP", "CLS", "NUM") || prev?.t === "với" || (prev?.t === "bị" && is(next, "VERB", "STATE", "UNK")))) Object.assign(t, { r: "KIN", cls: "person" });
    // Người nói xưng anh / chị (gọi Lomi là em) thì "bạn" trong câu là người bạn: "đi sinh nhật bạn", "ghé quán bạn chơi".
    else if (t.t === "bạn" && t.r === "YOU" && tk.some((x) => x.r === "SELF" && /^(a|anh|chị|c)$/.test(x.t))) Object.assign(t, { r: "KIN", cls: "person" });
    // "tí / chút / xíu" đầu câu hoặc ngay trước người nói = lát nữa ("tí a quay lại").
    else if (t.r === "DEGREE" && t.low && ["tí", "chút", "xíu", "tẹo"].includes(t.t) && (i === 0 || is(next, "SELF", "EM")) && is(next, "SELF", "EM", "MOTION", "VERB")) Object.assign(t, { r: "TIME", rel: "future", cls: "soon", low: undefined });
    // "hay": trước mức độ / cuối câu = hay (tốt); còn lại = hay (thường / hoặc).
    else if (t.t === "hay" && !(i >= end || is(next, "DEGREE", "PART", "QPART"))) Object.assign(t, { r: "FILL", v: undefined });
    // "với" cuối câu là tiểu từ ("giúp a với"); giữa câu là giới từ.
    else if (t.t === "với" && i < end) t.r = "PREP";
    // "giờ" sau số ("7 giờ") không phải "bây giờ".
    else if (t.t === "giờ" && is(prev, "NUM")) Object.assign(t, { r: "UNK", rel: undefined });
    // "nhà" ngay sau một danh từ và trước người nói ("con chó nhà a") là "của nhà".
    else if (t.t === "nhà" && is(prev, "NOUN", "KIN", "UNK") && is(next, "SELF", "EM")) Object.assign(t, { r: "PREP", cls: "of" });
    // Tính từ thời tiết chỉ là thời tiết khi nói về trời; "máy lạnh", "nước nóng" đã là cụm riêng.
  }
  passiveAgents();
}

const PROPER = new Set("đà lạt|sài gòn|hà nội|đà nẵng|nha trang|phú quốc|vũng tàu|hội an|huế".split("|"));
/** Dấu chỉ NGƯỜI NÓI trong các mẩu nhắc lại (subjectText, pred.obj…). Lớp đáp đổi nó thành anh / chị / em / bạn theo cách xưng hô.
 *  Không viết thẳng "bạn" vì speak() (lib/lomiAddress) cố ý giữ nguyên "bạn mới", "bạn học", "bạn tốt"… — vốn thường là "người bạn". */
export const YOU_MARK = "⟦you⟧";
const PRON_OUT: Record<string, string> = { SELF: YOU_MARK, YOU: "Lomi" };
/** Ghép lại một đoạn để nhắc trong câu đáp, đổi ngôi: người nói → YOU_MARK, Lomi → "Lomi". */
function render(tk: Tok[], emIs: "you" | "self"): string {
  return tk
    .map((t, i) => {
      if (t.r === "EM") return emIs === "you" ? "Lomi" : YOU_MARK;
      // "bạn" là NGƯỜI BẠN (không phải lời gọi): viết thành "người bạn của …" / "bạn bè" / "cô bạn" để speak() không đổi thành anh / chị.
      if ((t.r === "KIN" || t.cls === "agent") && t.t === "bạn") return is(tk[i + 1], "SELF", "EM") ? "người bạn của" : "bạn bè";
      if (t.r === "KIN" && t.t === "con bạn") return "cô bạn";
      // Tên riêng: địa danh đã biết viết hoa; từ lạ giữ đúng kiểu người dùng gõ ("Phú Quốc", "con Mực").
      if (t.r === "NOUN" && PROPER.has(t.t)) return t.t.replace(/(^|\s)\p{L}/gu, (x) => x.toUpperCase());
      if (t.r === "UNK" && t.o && t.o !== t.o.toLowerCase() && !t.init) return t.o;
      return PRON_OUT[t.r] ?? t.t;
    })
    .join(" ")
    .trim();
}

/** Cụm chỉ nơi chốn bắt đầu ở k: danh từ nơi chốn + phần bổ nghĩa, dừng ở giới từ / động từ ("quán nhậu | với bạn", "siêu thị | về"). */
function placeSpan(body: Tok[], k: number): Tok[] {
  let e = k + 1;
  while (e < body.length && is(body[e], "NOUN", "UNK", "DEM", "NUM") && e - k < 4) e++;
  return body.slice(k, e);
}

const ASK_KIND: Record<string, AskKind> = { what: "what", where: "where", which: "which", how: "how", why: "why", who: "who", howmany: "howmany", when: "when" };
const TODAY_ORDER: Record<Part, number> = { "sáng": 0, "trưa": 1, "chiều": 2, "tối": 3, "đêm": 4 };
function partNow(h: number): number {
  if (h < 5) return 4;
  if (h < 11) return 0;
  if (h < 14) return 1;
  if (h < 18) return 2;
  if (h < 23) return 3;
  return 4;
}

export type ParseOpts = { /** Cách người dùng đang tự xưng (để biết "e" là ai). */ addr?: Addr | null; /** Giờ hiện tại 0–23 (để đọc "tối nay"); mặc định lấy đồng hồ máy. */ hour?: number };

/** Đọc một câu thành KHUNG. Không bao giờ ném lỗi; câu không đọc được thì conf thấp. */
export function parseVi(raw: string, opts: ParseOpts = {}): Frame {
  const nfc = raw.normalize("NFC");
  const base: Frame = { raw, toks: [], act: "fragment", greeted: false, subject: "none", addressee: false, neg: false, polite: false, tags: [], loose: false, multi: false, conf: 0 };
  const expO = expandTeen(nfc);
  const exp = expO.toLowerCase();
  if (!/\p{L}/u.test(exp)) return base;
  // 11/10: xét theo câu người dùng GÕ, không theo câu đã đổi teen code — "hnay a met wa" gõ không dấu, nhưng sau khi đổi
  // ("hôm nay a met quá") lại có dấu nên "met" từng bị coi là từ lạ ("Hôm nay met hả?").
  const loose = !DIACRITIC.test(nfc.toLowerCase());
  // Tách mệnh đề theo dấu câu; mệnh đề chỉ gồm lời gọi / lời chào / từ đệm thì gộp vào phần mở đầu.
  const clauses = expO
    .split(/[,.;!?…\n]+|\s-\s/u)
    .map((c) => c.replace(/[^\p{L}\p{N}\s/]/gu, " ").trim().split(/\s+/).filter(Boolean))
    .filter((c) => c.length);
  if (!clauses.length) return base;
  const parsed = clauses.map((c) => {
    const tk = tokenize(c.map((x) => x.toLowerCase()), loose, c);
    disambiguate(tk, loose);
    return tk;
  });
  const isOpener = (tk: Tok[]) => tk.every((t) => is(t, "GREET", "VOC", "EM", "YOU", "PART", "FILL")) && tk.length <= 4;
  let greeted = false;
  const content: Tok[][] = [];
  for (const tk of parsed) {
    if (isOpener(tk) && parsed.length > 1) {
      if (tk.some((t) => t.r === "GREET")) greeted = true;
      if (!content.length && tk.some((t) => is(t, "EM", "YOU", "VOC"))) base.addressee = true;
    } else content.push(tk);
  }
  if (!content.length) content.push(parsed[0]);
  const tk = content[0];
  const f: Frame = { ...base, toks: tk, loose, greeted, multi: content.filter((c) => c.length >= 2).length > 1 };
  // (khai báo sớm: tagsOf() ở cuối hàm đọc các biến này, kể cả khi câu được nhận là lời chào / chúc và trả về sớm)
  let subjToks: Tok[] = [];
  let s0: Tok | undefined = undefined;
  let body: Tok[] = [];
  let ask = false;

  const hasSelf = tk.some((t) => t.r === "SELF");
  const ask0 = isAskLike(expandTeen(nfc)) || tk.some((t) => is(t, "QPART") || (t.r === "QWORD" && loose));
  // "e / em" là ai: câu có người nói riêng (a, anh, chị, mình…) hoặc người dùng đang xưng anh / chị → là Lomi.
  const emIs: "you" | "self" = (() => {
    if (hasSelf) return "you";
    // Chủ ngữ là người khác ("chị Hoa mới nhắn em", "mẹ la em") → "em" là người nói.
    if (is(tk.find((t) => !is(t, "TIME", "VOC", "FILL")), "KIN", "THIRD") && tk.findIndex((t) => t.r === "EM") > 0) return "self";
    if (opts.addr === "anh" || opts.addr === "chị" || opts.addr === "bạn-em") return "you";
    if (opts.addr === "em") return "self";
    const i = tk.findIndex((t) => t.r === "EM");
    if (i < 0) return "you";
    // "con mèo nhà e", "mẹ nhà em" — "nhà e" là nhà của người nói (Lomi không có nhà); "tại e bận quá", "vì e…" — "e" mở đầu vế chỉ lý do là người nói.
    if (i > 0 && /^(nhà|tại|vì|do|bởi)$/.test(tk[i - 1].t) && !nfc.includes("?")) return "self";
    if (is(tk[i + 1], "VOC") || i === tk.length - 1 || tk.slice(i + 1).every((t) => is(t, "PART", "VOC"))) return "you";
    if (is(tk[i - 1], "GREET", "WISH", "THANK", "VERB", "DESIRE", "PREP")) return "you";
    // Lời giục ("e nói lại đi", "em kể tiếp đi") là nói với Lomi.
    if (tk.some((t) => t.cls === "urge")) return "you";
    // Câu hỏi thật (có từ hỏi / "không", "chưa" cuối câu / dấu ?) mở đầu bằng "e" là hỏi Lomi; câu kể ("em hỏi anh ấy rồi") là người nói.
    return nfc.includes("?") || tk.some((t) => is(t, "QPART", "QWORD")) ? "you" : "self";
  })();

  if (tk.some((t) => t.r === "EM")) f.em = emIs;
  f.selfWord = tk.find((t) => t.r === "SELF")?.t;
  // Bỏ lời gọi ở đầu ("e ơi", "lomi ơi", "ê") và ở cuối ("… nha e", "… không e ơi").
  let a = 0;
  let b = tk.length;
  for (;;) {
    if (is(tk[a], "VOC")) a++;
    else if (is(tk[a], "EM", "YOU") && is(tk[a + 1], "VOC") && (tk[a].r === "YOU" || emIs === "you")) a += 2;
    else break;
    f.addressee = true;
  }
  while (b > a + 1) {
    const t = tk[b - 1];
    const objPos = is(tk[b - 2], "DESIRE", "COG", "VERB", "PREP", "MOTION");
    if (is(t, "VOC") || (is(t, "EM") && emIs === "you" && b - 1 > a + 1 && !objPos) || (is(t, "YOU") && b - 1 > a + 1 && t.t !== "bạn" && !objPos)) {
      f.addressee = true;
      b--;
    } else if (is(t, "PART")) b--;
    else break;
  }
  // "chào e nha a đi ngủ đây" — chào xong nói tiếp không có dấu phẩy: bỏ phần chào, đọc phần sau như một câu.
  if (is(tk[a], "GREET") && hasSelf) {
    let g = a + 1;
    while (g < b && (is(tk[g], "EM", "YOU", "PART", "VOC") || tk[g].r === "TIME")) g++;
    if (is(tk[g], "SELF")) {
      a = g;
      f.greeted = true;
      f.addressee = true;
    }
  }
  // (phần lõi = tk[a..b) — tiểu từ cuối câu vẫn giữ trong tk để đọc phép lịch sự / kiểu câu)
  const tailParts = tk.slice(b).filter((t) => t.r === "PART").map((t) => t.t);
  const core = tk.slice(a, b);
  f.polite = tk.some((t) => t.r === "PART" && /^(nha|nhé|nhen|nghen|nhá|ạ|dạ|giùm|giúp|hộ|dùm)$/.test(t.t)) || tk.some((t) => t.r === "THANK");

  // ── Thời gian ──
  // Dịp / buổi đứng SAU động từ là bổ ngữ của động từ đó ("đi sinh nhật bạn", "thức tới khuya"), không phải mốc thời gian của câu.
  {
    const v = core.findIndex((t) => is(t, "VERB", "MOTION", "DESIRE"));
    if (v >= 0 && !core.some((t) => is(t, "GREET", "WISH", "THANK", "GOOD")))
      for (const t of core.slice(v + 1)) if (t.r === "TIME" && !t.rel && !t.today && (t.cls === "occasion" || t.part)) Object.assign(t, { r: "NOUN", cls: "occasion", part: undefined });
  }
  const times = core.filter((t) => t.r === "TIME");
  const aspects = core.filter((t) => t.r === "ASPECT");
  if (times.length || aspects.length) {
    const hour = opts.hour ?? new Date().getHours();
    let rel: Rel | undefined;
    let part: Part | undefined;
    let occasion: string | undefined;
    for (const t of times) {
      part = part ?? t.part;
      if (t.cls === "occasion" || t.cls === "day" || /^cuối (tuần|tháng|năm)/.test(t.t)) occasion = occasion ?? t.t;
      if (t.rel) rel = rel ?? t.rel;
      else if (t.today && t.part) {
        const d = TODAY_ORDER[t.part] - partNow(hour);
        rel = rel ?? (d < 0 ? "past" : d > 0 ? "future" : "now");
      }
    }
    const explicit = !!rel && times.some((t) => t.rel || t.today);
    // Từ chỉ thì ("đã", "sẽ", "đang") nói rõ hơn mốc "tối nay / sáng nay"; còn mốc rõ ("hôm qua", "mai") thì giữ.
    const hard = times.some((t) => t.rel === "past" || t.rel === "future");
    const asp = aspects.find((t) => t.cls !== "post") ?? aspects[0];
    if (asp?.rel && !hard) rel = asp.rel;
    f.time = { rel, part, label: times.map((t) => t.t).join(" "), explicit, soon: times.some((t) => t.cls === "soon") || undefined, occasion };
  }

  const rest = core.filter((t) => !is(t, "TIME"));
  const hasRole = (...rs: Role[]) => core.some((t) => rs.includes(t.r));
  const goodToks = core.filter((t) => t.r === "GOOD");
  const youToks = (t: Tok) => t.r === "YOU" || (t.r === "EM" && emIs === "you");
  const selfTok = (t: Tok) => t.r === "SELF" || (t.r === "EM" && emIs === "self");

  // ── Lời nói có khuôn: chào / chúc / cảm ơn ──
  const SPEECH_OK: Role[] = ["EM", "YOU", "TIME", "GOOD", "PART", "DEGREE", "VOC", "FILL", "NUM"];
  const onlyWith = (allowed: Role[], maxUnk = 0) => {
    let unk = 0;
    for (const t of core) {
      if (allowed.includes(t.r)) continue;
      if (t.r === "ASPECT" && t.cls === "post") continue; // "tối rồi chào e nha"
      if (t.r === "UNK" && ++unk <= maxUnk) continue;
      return false;
    }
    return true;
  };
  const finish = (act: Act, conf: number): Frame => {
    f.act = act;
    // Trong lời chào / chúc / cảm ơn, "e" là người được chào / chúc (Lomi) — trừ khi đó là xin Lomi chúc mình.
    if (f.em && (act === "greet" || act === "thanks" || (act === "wish" && f.wish?.to !== "self")) && !hasSelf && opts.addr !== "em") f.em = "you";
    f.conf = Math.max(0, Math.min(1, loose ? conf * 0.9 : conf));
    f.tags = tagsOf(f, tk);
    return f;
  };

  if (hasRole("THANK") && onlyWith([...SPEECH_OK, "SELF", "THANK", "WISH"])) {
    if (goodToks.length) f.wish = { good: goodToks.map((t) => t.t).join(" "), to: "you", occasion: f.time?.label };
    return finish("thanks", 0.95);
  }
  const wi = core.findIndex((t) => t.r === "WISH");
  if (wi >= 0) {
    const after = core.slice(wi + 1);
    const before = core.slice(0, wi);
    const tgt = after.find((t) => is(t, "SELF", "EM", "YOU"));
    // "chúc a ngủ ngon đi", "e chúc a may mắn đi" → xin Lomi chúc mình; còn lại là chúc Lomi.
    const toSelf = !!tgt && (selfTok(tgt) || (tgt.r === "SELF" && before.some(youToks))) && !before.some((t) => t.r === "SELF");
    const wbody = after.filter((t) => !is(t, "SELF", "EM", "YOU", "PART", "VOC", "FILL", "DEGREE"));
    const unk = wbody.filter((t) => !is(t, "GOOD", "TIME", "NUM", "STATE", "ADJ", "VERB")).length;
    if (unk <= 2 && before.every((t) => is(t, "SELF", "EM", "YOU", "FILL", "TIME"))) {
      const good = wbody.filter((t) => !is(t, "TIME")).map((t) => t.t).join(" ");
      f.wish = { good, to: toSelf ? "self" : "you", occasion: f.time?.label || undefined };
      return finish("wish", unk ? 0.75 : 0.95);
    }
  }
  if (hasRole("GREET") && onlyWith([...SPEECH_OK, "GREET"], core.length >= 3 ? (times.length ? 2 : 1) : 0) && !hasSelf) {
    if (goodToks.length) f.wish = { good: goodToks.map((t) => t.t).join(" "), to: "you", occasion: f.time?.label };
    return finish("greet", core.some((t) => t.r === "UNK") ? 0.75 : 0.95);
  }
  // "(cuối tuần / buổi tối) + vui vẻ / an lành + nha (e)" không có động từ, không có người nói → lời chúc gửi Lomi.
  if (goodToks.length && onlyWith(SPEECH_OK) && (tailParts.length || f.addressee || tk.some((t) => t.r === "PART")) && !core.some((t) => t.r === "DEGREE")) {
    f.wish = { good: goodToks.map((t) => t.t).join(" "), to: "you", occasion: f.time?.label || undefined };
    return finish("wish", 0.9);
  }

  // ── Chủ ngữ ──
  let i = 0;
  const skipLead = () => {
    while (i < rest.length && (is(rest[i], "FILL", "CONJ") || (is(rest[i], "PART") && i === 0))) i++;
  };
  skipLead();
  s0 = rest[i];
  if (s0 && (s0.r === "SELF" || s0.r === "EM")) {
    // "a với e", "tụi mình" + rủ → cả hai; còn lại theo người nói / Lomi.
    f.subject = s0.r === "SELF" || emIs === "self" ? "self" : "you";
    i++;
    // "a với vợ", "mình và mấy đứa bạn" — chủ ngữ ghép, vẫn là chuyện của người nói.
    if (f.subject === "self" && /^(với|và|cùng)$/.test(rest[i]?.t ?? "") && is(rest[i + 1], "KIN", "THIRD", "EM", "YOU")) {
      subjToks = rest.slice(i - 1, i + 2);
      i += 2;
    }
  } else if (s0 && s0.r === "YOU") {
    f.subject = "you";
    i++;
  } else if (s0 && s0.r === "THIRD") {
    f.subject = "third";
    subjToks = [s0];
    i++;
  } else if (s0 && (is(s0, "KIN", "CLS", "NOUN") || (s0.r === "UNK" && rest.length > 1))) {
    // Cụm danh từ: (loại từ) + danh từ… + (nhà / của) + người sở hữu + (này / đó)
    let j = i;
    if (is(rest[j], "CLS")) j++;
    const headStart = j;
    while (j < rest.length && is(rest[j], "KIN", "NOUN", "UNK") && j - headStart < 3) j++;
    // "điện thoại MỚI của a", "cái áo NÀY" — tính từ "mới" / từ chỉ định nằm trong cụm danh từ
    if (j > headStart) {
      if (is(rest[j], "PREP") && (rest[j].cls === "of" || rest[j].t === "của") && is(rest[j + 1], "SELF", "EM", "YOU", "THIRD", "KIN")) j += 2;
      else if (is(rest[j], "SELF", "EM") && (is(rest[j + 1], ...PRED_START, "FILL", "DEM") || j + 1 >= rest.length)) j++;
      if (is(rest[j], "DEM")) j++;
      const np = rest.slice(i, j);
      const head = np.find((t) => is(t, "KIN", "NOUN")) ?? np.find((t) => t.r === "UNK");
      const after = rest[j];
      const predNext = is(after, ...PRED_START, "FILL", "PREP") || !after;
      // Cụm chỉ NGƯỜI / CON VẬT đứng một mình ("mẹ a á", "con mèo nhà a") vẫn cho biết đang nói về ai — câu không có vị ngữ nên độ chắc thấp.
      const bareNp = j >= rest.length && j > i && (head?.r === "KIN" || head?.cls === "pet");
      if (head && predNext && (j < rest.length || bareNp)) {
        subjToks = np;
        const named = np[0].t === "con" && np[0].r === "CLS" && head.r === "UNK"; // "con Mực nhà a" — con vật có tên
        f.subject = head.r === "KIN" ? "third" : head.cls === "pet" || named ? "pet" : head.cls === "place" ? "place" : head.cls === "weather" ? "weather" : "thing";
        i = j;
      }
    }
  }
  if (subjToks.length && f.subject !== "self") {
    f.subjectText = render(subjToks, emIs);
    f.subjectCls = subjToks.find((t) => t.r === "KIN")?.cls;
  }
  skipLead();

  // ── Vị ngữ ──
  let neg = false;
  let degLow = false;
  let degHigh = false;
  let recent = false;
  let ongoing = false;
  let planned = false;
  let j = i;
  for (; j < rest.length; j++) {
    const t = rest[j];
    if (t.r === "ASPECT") {
      if (t.rel === "past" && t.cls !== "post") recent = true;
      if (t.rel === "now") ongoing = true;
      if (t.rel === "future") planned = true;
    } else if (t.r === "NEG") {
      neg = true;
      f.negWord = /^chưa/.test(t.t) ? "chưa" : "không";
    } else if (t.r === "DEGREE") {
      if (t.low) degLow = true;
      else degHigh = true;
    } else if (t.r === "FILL" || t.r === "CONJ") continue;
    else break;
  }
  const head = rest[j];
  let predToks: Tok[] = [];
  if (head && is(head, "DESIRE", "MOTION", "VERB", "COG", "STATE", "ADJ", "GOOD", "PREP", "QWORD", "INDEF", "UNK", "NOUN", "KIN", "NUM")) predToks = rest.slice(j);
  // Đuôi vị ngữ: mức độ, "rồi", từ hỏi cuối câu.
  const tailTok = (t: Tok) => is(t, "DEGREE", "QPART", "PART") || (t.r === "ASPECT" && t.cls === "post" && t.t !== "xong"); // "thi xong" giữ chữ "xong"
  let pe = predToks.length;
  while (pe > 0 && tailTok(predToks[pe - 1])) pe--;
  for (const t of predToks.slice(pe)) {
    if (t.r !== "DEGREE") continue;
    if (t.low) degLow = true;
    else degHigh = true;
  }
  body = predToks.slice(0, pe);
  // "không … lắm" = chỉ hơi hơi.
  if (neg && degHigh && core.some((t) => t.r === "DEGREE" && /^(lắm|mấy)$/.test(t.t))) {
    degLow = true;
    degHigh = false;
  }
  f.neg = neg;
  f.degree = degLow ? "low" : degHigh ? "high" : undefined;

  const knownHead = head && is(head, "DESIRE", "MOTION", "VERB", "COG", "STATE", "ADJ", "GOOD", "PREP");
  // Từ lạ đứng sau từ chỉ thì ("đang …", "sẽ …", "mới …") hoặc sau chủ ngữ rõ + mốc thời gian vẫn là việc làm.
  const unkVerb = head?.r === "UNK" && (recent || ongoing || planned || (f.subject === "self" && !!f.time?.explicit));
  // "chị e bị chồng BỎ", "con a bị ĐIỂM KÉM", "a bị vợ LA" — sau "bị" (+ người gây ra) là VIỆC XẢY ĐẾN với chủ ngữ, kể cả khi từ đó chưa có
  // trong từ điển. Với người nói thì chỉ nhận khi có người gây ra ("a bị zona" để lớp sức khoẻ lo).
  const lead = rest.slice(0, j);
  const hasAgent = lead.some((t) => t.cls === "agent");
  const passiveUnk = head?.r === "UNK" && !unkVerb && lead.some((t) => t.t === "bị") && (hasAgent || f.subject === "third" || f.subject === "pet");
  if (body.length && (knownHead || unkVerb || passiveUnk)) {
    const h = body[0];
    const after = body.slice(1);
    let kind: PredKind = "activity";
    let headText = h.t;
    let cls = h.cls;
    let objToks = after;
    if (h.r === "DESIRE") kind = "desire";
    else if (h.r === "COG") kind = "cognition";
    else if (h.r === "STATE" || h.r === "GOOD") kind = h.cls === "bad" || h.cls === "good" ? "event" : "state";
    else if (h.r === "ADJ") kind = "quality";
    else if (h.r === "PREP") kind = h.cls === "loc" ? "location" : "activity";
    else if (h.r === "MOTION") {
      kind = "motion";
      // "đi ăn", "đi chơi", "đi đón con", "về quê thăm mẹ" — động từ theo sau mới là việc chính.
      const v = after.findIndex((t) => t.r === "VERB");
      if (v >= 0 && v <= 1 && after.slice(0, v).every((t) => is(t, "UNK", "NOUN"))) {
        kind = v === 0 ? "activity" : "motion";
        if (v === 0) {
          headText = `${h.t} ${after[0].t}`;
          cls = after[0].cls;
          objToks = after.slice(1);
        } else cls = after[v].cls ?? cls;
      } else {
        // "đi chơi" / "đi đà nẵng chơi" — việc chính nằm sau nơi đến.
        const lv = after.find((t) => t.r === "VERB");
        if (lv) cls = lv.cls;
      }
      if (h.cls === "return") cls = "return";
    } else if (h.r === "VERB") {
      kind = "activity";
      // "ngồi / nằm / đứng / sống + ở X" là đang ở đâu.
      if (/^(ngồi|nằm|đứng|sống)$/.test(h.t) && is(after[0], "PREP") && after[0].cls === "loc") {
        kind = "location";
        objToks = after.slice(1);
      }
    }
    // "bị ốm", "được khen": từ đệm "bị/được" đã bỏ qua ở trên — head là trạng thái.
    // "mẹ a mất rồi", "con mèo nhà a mới mất" — với người / con vật, "mất" là qua đời (với đồ vật là thất lạc).
    if (h.t === "mất" && (f.subject === "third" || f.subject === "pet") && !after.some((t) => is(t, "NOUN", "UNK"))) cls = "death";
    let val = 0;
    // Phủ định nằm TRONG vị ngữ ("học không tốt lắm", "ăn không ngon") đảo nghĩa đúng từ đứng sau nó.
    const negAt = (k: number) => k > 0 && (body[k - 1].r === "NEG" || (k > 1 && body[k - 2].r === "NEG" && is(body[k - 1], "FILL", "DEGREE")));
    body.forEach((t, k) => {
      if (is(t, "STATE", "ADJ", "GOOD", "DESIRE") && t.v) val += negAt(k) ? -t.v : t.v;
    });
    if (neg && is(h, "STATE", "ADJ", "GOOD", "DESIRE")) val = h.v ? -h.v : val;
    const qualTok = [...after].reverse().find((t) => is(t, "ADJ", "STATE", "GOOD") && t.v !== undefined);
    const qualNeg = !!qualTok && negAt(body.indexOf(qualTok));
    const placeTok = body.find((t, k) => (is(t, "NOUN") && t.cls === "place") || (k > 0 && is(body[k - 1], "PREP") && body[k - 1].cls === "loc"));
    const obj = render(objToks, emIs);
    const lastObj = objToks[objToks.length - 1];
    f.pred = {
      kind,
      head: headText,
      cls,
      obj,
      objCore: qualTok && lastObj === qualTok ? render(objToks.slice(0, -1), emIs) : obj,
      known: !!knownHead,
      val: Math.sign(val),
      place: placeTok ? render(placeSpan(body, body.indexOf(placeTok)), emIs) : kind === "location" ? obj : undefined,
      indef: body.some((t) => t.r === "INDEF") || undefined,
      recent: recent || undefined,
      done: predToks.slice(pe).some((t) => t.r === "ASPECT" && t.cls === "post") || body.some((t) => t.t === "xong") || undefined,
      ongoing: ongoing || undefined,
      planned: planned || undefined,
      qual: qualTok ? (qualNeg ? `không ${qualTok.t}` : qualTok.t) : undefined,
    };
    if (planned && !f.time) f.time = { rel: "future", label: "", explicit: false };
  }
  // Chủ ngữ là thời tiết ("trời", "ngoài trời") hoặc câu chỉ có tính từ thời tiết ở đầu.
  if (f.subject === "weather" || (f.subject === "none" && f.pred?.kind === "quality" && body[0]?.cls === "weather")) f.subject = "weather";

  // ── Loại câu ──
  const qword = core.find((t) => t.r === "QWORD");
  const qpart = tk.some((t) => t.r === "QPART");
  // "chẳng buồn ngủ tí nào", "không vui chút nào" — "nào" ở đây nhấn mạnh phủ định, không phải hỏi.
  const atAll = neg && tk.some((t) => t.cls === "atall");
  // "a sợ mẹ có chuyện gì", "a lo có gì không hay" — sau "sợ / lo", "gì" là "điều gì đó", không phải câu hỏi (trừ khi có dấu ?).
  const fearIndef = f.subject === "self" && f.pred?.cls === "feel" && /^(sợ|lo|ngại|e)( |$)/.test(f.pred.head) && !!f.pred.obj && !nfc.includes("?");
  ask = !fearIndef && ((ask0 && !atAll) || !!qword || qpart);
  if (ask) f.ask = qword?.cls ? ASK_KIND[qword.cls] : "yesno";

  // Độ chắc: phần nào của câu đã được xếp vai. Từ lạ trong bổ ngữ / cụm chủ ngữ là bình thường.
  const scored = core.filter((t) => !is(t, "PART", "VOC", "FILL"));
  const stray = rest.slice(0, j).filter((t) => t.r === "UNK" && !subjToks.includes(t)).length;
  let conf = f.pred ? 1 - stray / Math.max(1, scored.length) : 0.35;
  if (!f.pred && f.subject !== "none") conf = 0.45;
  // "hôm nay e thế nào", "e sao rồi" — hỏi thăm trống: chủ ngữ + từ hỏi "thế nào / sao", ngoài ra chỉ có thời gian / từ đệm.
  if (!f.pred && f.subject === "you" && (qword?.cls === "how" || qword?.cls === "where") && rest.every((t) => is(t, "EM", "YOU", "QWORD", "FILL", "PART", "ASPECT"))) conf = 0.85;
  if (unkVerb) conf *= 0.8;
  if (passiveUnk && !hasAgent) conf *= 0.9;
  if (loose && (head?.amb || subjToks.some((t) => t.amb))) conf *= 0.85;
  // "… mà chưa được duyệt", "… nhưng …" — có vế sau: khung chỉ đọc vế đầu.
  if (core.some((t, k) => k >= 2 && (t.r === "CONJ" || (t.t === "mà" && k < core.length - 1)))) f.multi = true;
  // "… nói với em là mai đi", "… bảo là …" — lời thuật lại: vế sau "là" mới là ý chính.
  if (core.some((t, k) => t.t === "là" && k >= 2 && core.slice(0, k).some((x) => /^(nói|kể|nhắn|hỏi|nghĩ|tưởng|thấy)$/.test(x.t) || x.t === "bảo"))) f.multi = true;
  if (f.multi) conf *= 0.6;

  // Chủ ngữ là một từ lạ không có loại từ đi trước ("bitcoin hôm nay lên 100k") → chưa chắc đó là chủ ngữ.
  if (subjToks.length && !subjToks.some((t) => is(t, "KIN", "NOUN", "CLS", "THIRD"))) conf *= 0.6;
  // Hỏi có / không về một trạng thái mà không nêu chủ ngữ ("tối nay rảnh không e", "mệt không") = hỏi người nghe.
  if (f.subject === "none" && ask && !qword && f.pred?.kind === "state" && !neg && ["free", "busy", "feel", "need", "well"].includes(f.pred.cls ?? "") && rest.every((t) => is(t, "STATE", "FILL", "QPART", "DEGREE", "PART", "ASPECT"))) f.subject = "you";

  const last = [...tk].reverse().find((t) => !is(t, "VOC") && !(is(t, "EM", "YOU") && f.addressee));
  const lastPart = tk.filter((t) => t.r === "PART").pop();
  const p = f.pred;
  // Xin phép đi: người nói + (đi …) + "đây / đã / cái / trước" — hoặc "tí a quay lại".
  if (p && !ask && !neg && f.subject === "self" && !recent && (!f.time || f.time.soon || f.time.rel === "now") && tk.length <= 9) {
    const leaveMark = lastPart?.cls === "leave" || last?.t === "trước" || tk.some((t) => t.cls === "leave");
    const softMark = !!lastPart && /^(nha|nhé|nhen|nghen)$/.test(lastPart.t);
    const back = p.cls === "return" || /^(quay lại|trở lại|ghé lại|vào lại)/.test(p.head);
    // "a đi công chuyện tí", "a ra ngoài chút" — đi một lát.
    const aBit = /^(tí|chút|xíu|tẹo|một tí|một chút|một xíu|một lát)$/.test(last?.t ?? "") && /^(đi|ra)( |$)/.test(p.head) && !f.time;
    if (aBit) {
      f.leave = "brb";
      return finish("leave", conf);
    }
    if (back && (f.time?.soon || leaveMark || softMark)) {
      f.leave = "brb";
      return finish("leave", conf);
    }
    if ((p.kind === "motion" || p.kind === "activity") && (leaveMark || (softMark && /^đi( |$)/.test(p.head) && !f.time))) {
      f.leave = f.time?.soon ? "brb" : "go";
      return finish("leave", conf);
    }
  }
  // "để a nghĩ đã", "để mình coi thử" — xin thêm chút thời gian.
  if (!ask && core[0]?.t === "để" && is(core[1], "SELF", "EM") && core.length >= 3 && core.length <= 7) {
    f.subject = "self";
    const act = core.slice(2).filter((t) => !is(t, "PART", "DEGREE"));
    f.pred = { kind: "cognition", head: act.map((t) => t.t).join(" "), obj: "", val: 0, known: true };
    return finish("hold", act.some((t) => t.r === "UNK") ? 0.7 : 0.9);
  }
  // Nhờ Lomi làm: không chủ ngữ + động từ nhờ vả ("tìm…", "bói…"), hoặc động từ + "cho / giúp / giùm" + người nói.
  const forMe = core.some((t, k) => /^(cho|giúp|giùm|dùm|hộ)$/.test(t.t) && is(core[k + 1], "SELF", "EM"));
  //   (câu cầu khiến không phải câu hỏi — chỉ tính là hỏi khi có từ hỏi / "không" cuối câu / dấu ?)
  const realQ = nfc.includes("?") || !!qword || qpart;
  if (p && (f.subject === "none" || f.subject === "you") && (p.cls === "seek" || (forMe && p.kind === "activity"))) return finish(realQ ? "question" : "request", conf);
  // Rủ: không có chủ ngữ (hoặc "mình / tụi mình") + việc làm + hỏi có/không hay "nha / đi", không phải chuyện đã qua.
  //   • phải là việc ĐI / ăn uống / vui chơi ("đi cf", "đi ăn lẩu", "xem phim"), không phải hỏi được-không, nên-không, có-không
  //     ("ăn gan được không", "có nên quay lại không") hay câu nối ("thế còn ăn?");
  //   • dạng hỏi: kết bằng "không / hông" trần; dạng mời: "mai đi cà phê nha" (có mốc thời gian + "đi").
  if (p && !neg && (p.kind === "motion" || p.kind === "activity") && p.cls !== "seek" && !times.some((t) => t.rel === "past") && !recent && !ongoing) {
    const inclWe = f.subject === "self" && /^(mình|tụi mình|bọn mình|chúng mình|chúng ta)$/.test(s0?.t ?? "");
    const incl = f.subject === "none" || inclWe;
    const softEnd = !!lastPart && /^(nha|nhé|nhen|nghen)$/.test(lastPart.t);
    const going = /^đi( |$)/.test(p.head) || (p.kind === "motion" && /^(ghé|ra|qua|về)$/.test(p.head));
    const fun = p.cls === "leisure" || /^(ăn|uống|nhậu)/.test(p.head);
    const modal = core.some((t) => /^(được|nên|phải|có|cho|hỏi|thể|còn|thế|vậy|thì)$/.test(t.t) || t.r === "CONJ");
    const bareQ = f.ask === "yesno" && !qword && tk.some((t) => t.r === "QPART" && /^(không|ko|k|chứ)$/.test(t.t));
    if (incl && !modal && bareQ && (going || (fun && (!!f.time?.explicit || inclWe || f.addressee)))) return finish("invite", conf);
    if (f.subject === "none" && !modal && softEnd && !ask && going && !!f.time?.explicit) return finish("invite", conf);
  }
  if (ask) return finish("question", conf);
  if (!f.pred) return finish("fragment", conf);
  return finish("statement", conf);

  // (hàm lồng dùng các biến khai báo sớm ở trên)
  function tagsOf(fr: Frame, all: Tok[]): GRole[] {
    const out = new Set<GRole>();
    const tag = (t: Tok, g: GRole) => {
      t.g = g;
      out.add(g);
    };
    for (const t of all) {
      if (t.r === "GREET") tag(t, "GREETING");
      else if (t.r === "WISH" || t.r === "GOOD") tag(t, "WISH");
      else if (t.r === "TIME") tag(t, "TIME");
      else if (t.r === "NEG") tag(t, "NEGATION");
      else if (t.r === "DEGREE") tag(t, "DEGREE");
      else if (t.r === "QWORD" || t.r === "QPART") tag(t, "QUESTION");
      else if (t.r === "THANK" || (t.r === "PART" && /^(nha|nhé|nhen|nghen|nhá|ạ|dạ|giùm|giúp|hộ|dùm|với)$/.test(t.t))) tag(t, "POLITENESS");
      else if (is(t, "SELF", "EM", "YOU", "THIRD", "KIN")) {
        tag(t, subjToks.includes(t) || (t === s0 && fr.subject !== "none") ? "SUBJECT" : "PERSON");
        out.add("PERSON");
      } else if (t.r === "STATE") {
        tag(t, t.cls === "feel" ? "EMOTION" : "STATE");
        out.add("STATE");
      } else if (t.r === "ADJ") tag(t, "ADJECTIVE");
      else if (is(t, "VERB", "MOTION", "DESIRE", "COG")) tag(t, "VERB");
      else if (t.r === "ASPECT") tag(t, "ADVERB");
      else if (subjToks.includes(t)) tag(t, "SUBJECT");
      else if (t.r === "NOUN" && t.cls === "place") tag(t, "PLACE");
      else if (is(t, "NOUN", "UNK", "INDEF") && body.includes(t)) tag(t, t.r === "NOUN" ? "ENTITY" : "OBJECT");
    }
    if (fr.subject !== "none") out.add("SUBJECT");
    if (fr.pred?.place) out.add("PLACE");
    if (ask) out.add("QUESTION");
    return [...out];
  }
}

/**
 * NHẮC LẠI điều vừa nghe theo ngôi của Lomi ("tại a về trễ" → "tại ⟦you⟧ về trễ", "vợ a không nói chuyện với a" → "vợ ⟦you⟧ không nói
 * chuyện với ⟦you⟧") — để câu đáp bám đúng nội dung thay vì một câu mẫu. Bỏ lời gọi, từ nối mở đầu ("mà", "rồi", "còn"…) và tiểu từ cuối câu.
 * Trả null khi câu là câu hỏi / lời chào – chúc – cảm ơn, quá dài, hoặc không còn gì để nhắc.
 */
const LEAD_DROP = /^(mà|nhưng|rồi|xong|còn|thì|với lại|và|à|ờ|ừ|ủa|ui|ôi|dạ|thật ra)$/;
const END_DROP = /^(nha|nhé|nhen|nghen|nhá|nè|nà|á|ạ|dạ|vậy|thế|hen|ha|ta|đây|mà|đã|cái)$/;
export function mirrorOf(f: Frame, max = 10): string | null {
  if (f.ask || f.act === "question" || f.act === "greet" || f.act === "wish" || f.act === "thanks" || f.act === "request" || f.act === "invite") return null;
  let tk = f.toks.filter((t) => t.r !== "VOC");
  //   ("còn" chỉ là từ nối khi đứng trước một ý khác — "còn vợ a thì…"; trước con số / thời gian — "còn 2 tuần nữa thi" — thì giữ.)
  while (tk.length && ((LEAD_DROP.test(tk[0].t) && !(tk[0].t === "còn" && (is(tk[1], "NUM", "TIME") || /^\d/.test(tk[1]?.t ?? "")))) || (is(tk[0], "EM", "YOU") && f.addressee && f.em !== "self"))) tk = tk.slice(1);
  // (chỉ bỏ tiểu từ thuần cuối câu; "giúp", "với", "luôn", "thôi" ở cuối thường mang nghĩa — "chẳng ai giúp", "mệt thôi")
  while (tk.length && ((is(tk[tk.length - 1], "PART") && END_DROP.test(tk[tk.length - 1].t)) || is(tk[tk.length - 1], "QPART") || (is(tk[tk.length - 1], "EM", "YOU") && f.addressee && f.em !== "self"))) tk = tk.slice(0, -1);
  const words = tk.reduce((n, t) => n + t.t.split(" ").length, 0);
  if (!tk.length || words > max || !tk.some((t) => !is(t, "SELF", "EM", "YOU", "FILL", "DEGREE", "PART", "ASPECT", "NEG", "CONJ"))) return null;
  return render(tk, f.em ?? "you");
}

/** Nhãn thời gian để nhắc lại ở đầu câu đáp ("Tối qua", "Mai", "Cuối tuần"). */
export function timeLabel(f: Frame): string {
  return f.time?.label ? cap(f.time.label) : "";
}
