// ─────────────────────────────────────────────────────────────────────────────
// MẠCH CHUYỆN CÓ TRẠNG THÁI CỦA LOMI (10/10) — chạy trên máy, không gọi AI.
//
// Lỗi cần sửa: Lomi hỏi "Có nặng không, đã đi khám chưa?" rồi người dùng đáp "Đi khám rồi" thì Lomi coi đó là một câu ĐỘC LẬP
// (đáp bài "lo về sức khoẻ", rồi lượt sau lại tưởng chính người dùng bị viêm họng). Lomi không nhớ đang nói về AI, đã BIẾT gì,
// vừa HỎI gì và còn THIẾU gì — nên chỉ biết quay vòng mấy câu "kể thêm đi".
//
// File này không thêm câu mẫu cho từng câu người dùng gõ. Nó giữ một MẠCH CHUYỆN (Thread) trên tin Lomi gần nhất:
//
//   who     đang nói về ai ("mẹ anh", "con mèo nhà anh") — không tự đổi thành người dùng
//   facts   những điều đã biết, theo từng Ô (đã khám chưa, bác sĩ nói bị gì, có thuốc chưa, bao lâu rồi, đỡ chưa…)
//   asked   ô Lomi vừa hỏi — câu đáp cụt ("rồi", "chưa", "có", "viêm họng") được ghi vào đúng ô đó
//   done    ô đã hỏi — không hỏi lại ô đã có câu trả lời
//
// Mỗi lượt: (1) đọc câu đáp vào ô vừa hỏi, (2) nhặt thêm điều mới trong câu, (3) ghi nhận điều MỚI, (4) hỏi tiếp ô còn thiếu —
// hết ô thì khép lại bằng một lời động viên, không hỏi nữa. Có tín hiệu cảm xúc ("a lo quá") thì mới an ủi, và vẫn nhớ đang nói về ai.
// Câu hỏi kiến thức ("viêm họng kiêng gì?"), lời chào / cảm ơn, chuyện khác… trả null để các lớp sẵn có trả lời; mạch vẫn được giữ.
//
// Hai loại mạch: "care" (người thân / thú cưng đang ốm) và "loss" (người thân / thú cưng mới mất).
// Câu đáp viết với "bạn" / "Lomi"; speak() (lib/lomiAddress) đổi thành anh / chị / em lúc hiển thị.
// ─────────────────────────────────────────────────────────────────────────────
import { expandTeen } from "@/lib/lomiChat";
import { isAskLike } from "@/lib/lomiSense";
import { parseVi, YOU_MARK, type Frame, type SubjectKind } from "@/lib/lomiParse";
import { analyzeBody } from "@/lib/lomiSymptoms";
import { healthSubjectOf, type HealthCtx } from "@/lib/lomiHealthTopic";
import type { Addr } from "@/lib/lomiAddress";

export type StoryKind = "care" | "loss";
export type Slot = "severity" | "doctor" | "dx" | "meds" | "dur" | "better" | "carer" | "cause" | "feel" | "memory" | "stay" | "far" | "op";
export type Who = { text: string; kind: SubjectKind };
export type Thread = {
  kind: StoryKind;
  who: Who;
  facts: Partial<Record<Slot, string | boolean>>;
  /** Ô Lomi vừa hỏi ở tin gần nhất (đang chờ trả lời). */
  asked: Slot[];
  /** Ô đã hỏi (không hỏi lại ô đã có câu trả lời; ô chưa được đáp chỉ hỏi lại MỘT lần). */
  done: Slot[];
  reasked?: Slot[];
  /** Số lần người dùng bộc lộ cảm xúc trong mạch này (để không lặp một lời an ủi). */
  felt?: number;
  /** Lomi đã nói lời khép lại ("mong … mau khoẻ") — không lặp lại lời đó nữa. */
  closed?: boolean;
  /** Đã nói câu "chắc bạn nghĩ về … nhiều lắm" (mạch mới mất) — không lặp. */
  noted?: boolean;
  /** Số lượt liên tiếp mạch này không được dùng tới (chuyện khác chen vào) — quá 2 lượt thì bỏ. */
  idle?: number;
};
export type StoryReply = {
  text: string;
  thread: Thread;
  quick?: string[];
  health?: HealthCtx;
  /** Người dùng tiếp tục bộc lộ cảm xúc → từ lượt sau để mạch TÂM SỰ (chủ đề này) nghe tiếp; mạch chuyện chỉ còn ghi nhận điều mới. */
  heart?: string;
  why: string;
};
export type StoryEnv = {
  addr?: Addr | null;
  /** Mẩu nhắc lại câu vừa nghe (lib/lomiParse.mirrorOf, đã đổi ngôi). */
  mirror?: string | null;
  /** Câu thuộc về lớp khác (tìm quán, bói bài, hỏi app…) → chỉ nhận khi câu có điều MỚI cho mạch này. */
  claimed?: boolean;
  /** Đang tâm sự: mạch chuyện chỉ ghi nhận điều mới, phần cảm xúc để mạch tâm sự đáp. */
  inHeart?: boolean;
  /** Lớp sức khoẻ đang giữ một triệu chứng / bệnh cụ thể → câu "nên làm gì" để lớp đó trả lời cho đúng bệnh. */
  inHealth?: boolean;
};

// ── Đọc chữ: có dấu thì so có dấu, gõ không dấu thì so không dấu (tránh "đỡ" / "đó", "khám" / "kham") ─────────────
const bare = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
export type Txt = { s: string; b: string; loose: boolean; words: number };
export function txt(raw: string): Txt {
  const clean = (x: string) => ` ${x.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
  // Câu gõ KHÔNG DẤU thì giữ nguyên chữ người dùng gõ (không đổi teen code — "hong" trong "viem hong" không phải "không").
  const base = clean(raw);
  const loose = base === bare(base);
  const s = loose ? base : clean(expandTeen(raw));
  return { s, b: bare(s), loose, words: s.trim() ? s.trim().split(" ").length : 0 };
}
/** Mẫu viết CÓ DẤU, tự sinh bản không dấu. (?<!L) / (?!L): ranh giới từ cho chữ có dấu. */
export function P(src: string, looseSrc?: string) {
  const wrap = (x: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${x})(?![\\p{L}\\p{N}])`, "u");
  const a = wrap(src);
  // looseSrc: bản riêng cho câu gõ KHÔNG DẤU khi chữ bỏ dấu dễ trùng nghĩa khác ("đỡ" → "do", "nhẹ" → "nhe" = nhé, "già" → "gia").
  const b = wrap(looseSrc ?? bare(src));
  return (t: Txt) => (t.loose ? t.b.match(b) : t.s.match(a));
}
const NEG_WORD = P("chưa|không|ko|chẳng|chả|đâu có|đã đâu|hông|hổng", "chua|khong|ko|k|chang|dau co|hok");
/** Từ khoá có bị phủ định không: có từ phủ định trong 3 tiếng đứng ngay trước ("chưa đi khám", "không chịu uống thuốc"). */
export function negated(t: Txt, m: RegExpMatchArray | null): boolean {
  if (!m || m.index === undefined) return false;
  const before = (t.loose ? t.b : t.s).slice(0, m.index).trim().split(" ").slice(-3).join(" ");
  return !!NEG_WORD(txt(before));
}

// ── Các Ô của mạch "người đang ốm" — mỗi ô một bộ nhận biết (vốn từ của ô đó, không phải danh sách câu) ─────────
const DOCTOR = P("khám|tái khám|bác sĩ|bs|bệnh viện|viện|phòng khám|thú y|cấp cứu|trạm xá|xét nghiệm|siêu âm|chụp phim|mổ|phẫu thuật");
const MEDS = P("thuốc|kê đơn|đơn thuốc|kháng sinh|hạ sốt|siro|truyền nước|truyền dịch|tiêm|chích", "thuoc|ke don|don thuoc|khang sinh|ha sot|siro|truyen nuoc|truyen dich|tiem thuoc|chich");
const BETTER = P(
  "đỡ|khoẻ lại|khỏe lại|khoẻ rồi|khỏe rồi|khỏi|khỏi bệnh|hết sốt|hết bệnh|hết ho|bình phục|hồi phục|ổn hơn|khá hơn|đỡ hơn|ổn rồi|ra viện|xuất viện",
  "do roi|do hon|do nhieu|da do|co do|khoe lai|khoe roi|khoi roi|khoi benh|het sot|het benh|het ho|binh phuc|hoi phuc|on hon|kha hon|on roi|ra vien|xuat vien",
);
const WORSE = P("nặng hơn|nặng thêm|trở nặng|yếu hơn|yếu đi|vẫn vậy|vẫn thế|vẫn sốt|vẫn mệt|vẫn ho|vẫn đau|không ăn thua|không khá hơn|(?:chưa|không|chẳng) (?:hạ|giảm|bớt|khỏi|hết)");
const HEAVY = P("nặng|nguy kịch|nguy hiểm|nghiêm trọng|cấp cứu|nằm viện|nhập viện|phải mổ|phẫu thuật|hôn mê|yếu lắm");
const LIGHT = P("nhẹ|sơ sơ|xoàng|bình thường|không sao|không có gì|không đáng lo|cũng ổn|ổn|ổn định|ổn cả|tốt", "nhe thoi|so so|binh thuong|khong sao|khong co gi|khong dang lo|cung on|on dinh|on ca");
// Người kể đang ở xa / muốn về mà chưa về được.
const FAR = P("ở xa|xa nhà|xa quê|không về được|chưa về được|không ở gần|muốn về|không ở cạnh|không ở bên");
const OLD = P("lớn tuổi|cao tuổi|có tuổi|già rồi|già yếu|[6-9]\\d tuổi|bệnh nền|yếu sẵn");
const YOUNG = P("còn nhỏ|còn bé|mới sinh|sơ sinh|mới mấy tháng|\\d+ tháng tuổi|[1-5] tuổi");
const REPORT = P("(?:bác sĩ|bs|họ|người ta|bên viện|bên đó|thú y)?\\s*(?:nói|bảo|kêu|chẩn đoán|kết luận|báo)(?: là| rằng)?(?: bị| do| chỉ bị| chỉ là)?");
const UNKNOWN = P("chưa biết|không biết|chưa rõ|không rõ|chưa có kết quả|chờ kết quả|đang chờ|chưa nói|không nói gì|chưa nói gì");
const SELF_CARE = P("tự chăm|đang chăm|ở bên|ở cạnh|túc trực|trông");
const CARER = P("chăm|chăm sóc|trông|lo cho|ở với|ở cùng|ở bên|túc trực|đưa đi|đưa mẹ|đưa ba|đưa bố");
const NOBODY = P("không ai|không có ai|chẳng ai|chả ai|một mình|ở xa");
const DUR = P("(?:\\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mấy|vài|cả|nửa|hơn \\d+|gần \\d+)\\s*(?:ngày|hôm|bữa|tuần|tháng|năm|tiếng|đêm)(?: nay| rồi| trời)?|từ (?:hôm qua|hôm kia|tối qua|sáng nay|sáng giờ|đầu tuần|tuần trước|tháng trước)(?: tới giờ| đến giờ)?");
// Cảm xúc của NGƯỜI KỂ (không phải triệu chứng của người ốm).
const FEEL = P(
  "lo|lo lắng|sợ|buồn|thương|xót|rối|hoang mang|bất lực|stress|căng thẳng|áp lực|khóc|nhớ|hụt hẫng|trống vắng|đau lòng|day dứt|hối hận|tự trách|kiệt sức|đuối|không biết làm sao|không biết phải làm sao|hết cách|bó tay",
  "lo qua|lo lam|lo lang|dang lo|so qua|so lam|buon|xot|hoang mang|bat luc|stress|cang thang|ap luc|khoc|nho qua|nho lam|hut hang|trong vang|dau long|day dut|hoi han|tu trach|kiet suc|khong biet lam sao|khong biet phai lam sao|het cach|bo tay",
);
const FEEL_WORRY = P("lo|lo lắng|sợ|rối|hoang mang|căng thẳng|không biết làm sao|không biết phải làm sao|hết cách|bó tay", "lo qua|lo lam|lo lang|dang lo|so qua|so lam|hoang mang|cang thang|khong biet lam sao|khong biet phai lam sao|het cach|bo tay");
const HELPLESS = P("(?:không|chẳng|chả|chưa) biết(?: \\S+){0,3} (?:sao|gì|thế nào|cách nào)|biết làm sao (?:giờ|đây|bây giờ)|hết cách|bó tay");
const CARE_ASK = P("nên làm gì|nên làm sao|phải làm sao|phải làm gì|cần làm gì|làm sao (?:bây giờ|giờ|đây)|làm gì (?:bây giờ|giờ|đây)|giúp (?:được )?gì|chăm (?:sao|thế nào|như thế nào)", "nen lam gi|nen lam sao|phai lam sao|phai lam gi|can lam gi|lam sao (?:bay gio|gio|day)|lam gi (?:bay gio|gio|day)|giup (?:duoc )?gi|cham (?:sao|the nao|nhu the nao)");
const FEEL_MISS = P("nhớ|trống vắng|hụt hẫng", "nho qua|nho lam|trong vang|hut hang");
const FEEL_GUILT = P("day dứt|hối hận|tự trách|giá mà|lẽ ra|phải chi");
const KEEP = P("nuôi|ở với|sống với|bên nhau|theo|gắn bó|quen|yêu|cưới|lấy nhau");
// Nguyên do mất.
const C_ILL = P("bệnh|ốm|ung thư|đột quỵ|tai biến|suy thận|suy tim|nhiễm trùng|care|parvo", "benh|bi om|ung thu|dot quy|tai bien|suy than|suy tim|nhiem trung|care|parvo");
const C_OLD = P("già|tuổi già|lớn tuổi|cao tuổi", "gia roi|gia yeu|tuoi gia|lon tuoi|cao tuoi");
const C_SUDDEN = P("tai nạn|xe tông|xe cán|xe đụng|bị bả|ngộ độc|đột ngột|bất ngờ|lạc|ngã");

type AnsKind = "asp" | "yn" | "open";
const SLOT_KIND: Record<Slot, AnsKind> = { severity: "yn", doctor: "asp", dx: "open", meds: "asp", dur: "open", better: "asp", carer: "yn", cause: "open", feel: "open", memory: "open", stay: "yn", far: "yn", op: "asp" };
const OP_DONE = P("mổ xong|phẫu thuật xong|mổ rồi|đã mổ|qua cơn nguy kịch|qua khỏi|tỉnh rồi|tỉnh lại|ra phòng hồi sức");
const STAY = P("nằm viện|nhập viện|vào viện|vô viện|ở viện|trong viện|đi viện|cấp cứu|phải mổ|mổ|phẫu thuật|hồi sức");
/** Câu đáp cụt: "rồi" / "chưa" (đã – chưa), "có" / "không". */
const BARE_DONE = /^(?:(?:da|u|uh|um|vang|ok) )?(?:(?:co )?roi|di roi|kham roi|uong roi|co roi|xong roi|roi a|roi do|co di roi)(?: (?:a|nha|ne|do|ban|lomi|em|e|anh))*$/;
const BARE_NOTYET = /^(?:(?:da|u|uh|um) )?(?:chua|chua dau|chua co|chua di|chua kip|van chua)(?: (?:a|nha|ne|nua|ban|lomi|em|e))*$/;
const BARE_YES = /^(?:(?:da|u|uh|um|vang) )?(?:co|co a|co chu|co do|u|uh|um|vang|dung roi|dung vay)(?: (?:a|nha|ne|ban|lomi|em|e))*$/;
const BARE_NO = /^(?:(?:da|u|uh|um) )?(?:khong|ko|k|hong|khong dau|khong co|khong co dau|cung khong)(?: (?:a|nha|ne|ban|lomi|em|e))*$/;

const HOSP_HEAD = /^(nhập viện|nằm viện|vào viện|vô viện|cấp cứu|đi cấp cứu|phải mổ|đi mổ|mổ|phẫu thuật)$/;
const STAFF = /^(bac si|bs|y ta|dieu duong|duoc si|thu y|benh vien|phong kham)/;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const youOf = (addr?: Addr | null) => (addr === "anh" || addr === "chị" || addr === "em" ? addr : "bạn");
/** Cách gọi gọn sau lần nhắc đầu: "mẹ anh" → "mẹ" (chỉ với bậc trên — "vợ", "con", "bạn" thì giữ đủ "vợ anh"); thú cưng → "bé". */
const ELDER = /^(mẹ|má|bố|ba|cha|bà|ông|nội|ngoại|bà nội|bà ngoại|ông nội|ông ngoại|cô|dì|chú|bác|cậu|mợ|thím|dượng)$/;
function shortOf(who: Who): string {
  if (who.kind === "pet") return "bé";
  const s = who.text.replace(/\s+(?:của\s+)?(?:anh|chị|em|bạn|mình)$/u, "").trim();
  return ELDER.test(s) ? s : who.text;
}
const slotsAsked = (th: Thread, ...xs: Slot[]): Thread => ({ ...th, asked: xs, done: [...new Set([...th.done, ...xs])] });

// Người kể nói mình CŨNG đang có bệnh ("a bị gout nữa", "e cũng đang bị cảm") — không phải lời kể về người đang ốm.
const SELF_ILL = P("(?:a|anh|e|em|c|chị|mình|tui|tôi|tớ) (?:thì |cũng |còn |lại |đang |mới |vừa |hay )*(?:bị|mắc)(?! gì| sao| la| mắng| chửi)", "(?:a|anh|e|em|c|chi|minh|tui|toi|to) (?:thi |cung |con |lai |dang |moi |vua |hay )*(?:bi|mac)(?! gi| sao| la| mang| chui)");
/** Câu vừa nghe có sửa lại chủ thể không: "Mẹ a á, không phải a", "không phải a, là mẹ a". Trả về người được nói tới (nếu câu có nêu). */
const NOT_ME = P("(?:không|ko|k|hông|đâu) phải(?: là)? (?:a|anh|c|chị|e|em|mình|tôi|tui|tớ)(?: bị| ốm| bệnh| đau)?(?: đâu| nha| á| mà)*");
export function subjectFix(raw: string, addr?: Addr | null): { who?: Who } | null {
  const t = txt(raw);
  const m = NOT_ME(t);
  if (!m || t.words > 12) return null;
  // Sau "không phải a" còn nói tiếp một việc khác ("không phải a nói vậy") thì không phải sửa chủ thể.
  const tail = (t.loose ? t.b : t.s).slice((m.index ?? 0) + m[0].length).trim();
  if (tail && !/^(?:mà |ma )?(?:là|la) /.test(`${tail} `)) {
    const tf = parseVi(tail, { addr });
    if (!((tf.subject === "third" || tf.subject === "pet") && !tf.pred)) return null;
  }
  for (const part0 of raw.split(/[,;.!?…\n]+|\s-\s|(?<![\p{L}])(?:mà là|chứ|là)(?![\p{L}])/u)) {
    if (!part0.trim() || NOT_ME(txt(part0))) continue;
    // "A đang nói mẹ a, không phải a" / "e hỏi cho ba e" — phần nêu người được nói tới nằm sau "đang nói / hỏi (về, cho)".
    const part = part0.trim().replace(/^(?:(?:a|anh|c|chị|e|em|mình|tôi|tui|tớ)\s+)?(?:đang\s+)?(?:nói|hỏi|kể|nhắc|noi|hoi|ke|nhac)(?:\s+(?:về|tới|đến|chuyện|cho|ve|toi|den|chuyen))*\s+/iu, "");
    const f = parseVi(part.trim(), { addr });
    if ((f.subject === "third" || f.subject === "pet") && f.subjectText) return { who: { text: f.subjectText.split(YOU_MARK).join(youOf(addr)), kind: f.subject } };
  }
  return {};
}

/** Mở mạch từ câu đáp của lớp khung câu (lib/lomiFrame): third_ill hỏi "nặng không + khám chưa", third_loss hỏi "ở với bạn lâu chưa" / "đang thấy thế nào". */
export function storyOpen(intent: string, who: Who, text: string, illness?: string): Thread | undefined {
  if (who.kind !== "third" && who.kind !== "pet") return undefined;
  if (intent === "frame:third_ill") {
    // Câu mở đầu đã nêu tên bệnh ("bạn a bị trầm cảm") thì đó là điều đã biết — không hỏi lại "bị gì".
    const named = illness && !/^(ốm|bệnh|ốm yếu|đau|mệt|sốt|cảm|ho)$/.test(illness) && !HOSP_HEAD.test(illness) ? illness : undefined;
    const th: Thread = { kind: "care", who, facts: named ? { dx: named } : {}, asked: [], done: [] };
    // "ba a nhập viện rồi" → Lomi hỏi luôn "bác sĩ có nói … bị gì không?"; "mẹ a mổ ruột thừa" → hỏi "giờ sao rồi, đỡ hơn chưa?"
    if (/bị gì không/.test(text)) return slotsAsked({ ...th, facts: { doctor: true, stay: true } }, "dx");
    if (/đỡ hơn chưa/.test(text)) return slotsAsked({ ...th, facts: { doctor: true, stay: true }, done: ["dx"] }, "better");
    if (/khám chưa|thú y chưa/.test(text)) return slotsAsked(th, ...(who.kind === "pet" ? (["doctor"] as Slot[]) : (["severity", "doctor"] as Slot[])));
    if (/bị sao vậy/.test(text)) return slotsAsked(th, "dx"); // "a đang chăm mẹ" → Lomi hỏi "mẹ bị sao vậy?"
    if (/điều trị sao rồi/.test(text)) return slotsAsked({ ...th, facts: { ...th.facts, doctor: true }, done: ["doctor", "dx"] }, "better"); // bệnh đã có tên
    return { ...th, facts: { severity: false }, closed: true }; // "bị cảm thôi" — nói là nhẹ, Lomi đã chúc mau khoẻ
  }
  if (intent === "frame:third_loss") return slotsAsked({ kind: "loss", who, facts: {}, asked: [], done: [] }, who.kind === "pet" ? "dur" : "feel");
  return undefined;
}
/** Mở mạch khi lớp sức khoẻ vừa phân tích triệu chứng của NGƯỜI KHÁC ("con a bị sốt") — Lomi vừa hỏi "bị bao lâu rồi". */
export function storyOpenSymptom(who: Who, raw = ""): Thread {
  // 11/10: câu mở đầu đã nói bao lâu ("con gái c ho cả tuần nay") → ghi nhận luôn, không hỏi lại "ốm mấy hôm rồi".
  const d = raw ? DUR(txt(raw)) : null;
  if (d) return { kind: "care", who, facts: { dur: d[0].trim() }, asked: [], done: ["dur"] };
  return slotsAsked({ kind: "care", who, facts: {}, asked: [], done: [] }, "dur");
}

function cleanDx(x: string): string {
  return x
    .replace(/^(?:là|bị|do|chỉ|chỉ bị|chỉ là|chắc|chắc là|hình như|có lẽ)\s+/gu, "")
    .replace(/^(?:là|bị|do)\s+/u, "")
    .replace(/\s+(?:thôi|á|đó|rồi|nha|ạ|nè|mà|à|hà|thôi à|thôi mà)$/gu, "")
    .replace(/\s+(?:thôi|á|đó|rồi|nha|ạ|nè)$/u, "")
    .trim();
}

type Got = Partial<Record<Slot, string | boolean>> & { frail?: "old" | "young" };

/** Đọc câu đáp vào các ô của mạch "người đang ốm". */
function readCare(t: Txt, f: Frame | null, th: Thread): Got {
  const g: Got = {};
  const n = t.b.trim();
  const pick = (k: AnsKind) => [...th.asked].reverse().find((s) => SLOT_KIND[s] === k);
  // 1) Câu đáp cụt → ô vừa hỏi (đúng kiểu câu hỏi: "…chưa?" nhận "rồi / chưa", "…không?" nhận "có / không").
  if (th.asked.length) {
    const asp = pick("asp") ?? th.asked[th.asked.length - 1];
    const yn = pick("yn") ?? th.asked[th.asked.length - 1];
    if (BARE_DONE.test(n)) g[asp] = true;
    else if (BARE_NOTYET.test(n)) g[asp] = false;
    else if (BARE_YES.test(n)) g[yn] = true;
    else if (BARE_NO.test(n)) g[yn] = false;
    if (Object.keys(g).length) return g;
  }
  // 2) Điều mới nằm trong chính câu nói.
  const dm = DOCTOR(t);
  const mm = MEDS(t);
  if (dm) g.doctor = !negated(t, dm);
  if (mm) g.meds = !negated(t, mm);
  const bm = BETTER(t);
  if (WORSE(t) || (bm && negated(t, bm))) g.better = false;
  else if (bm) g.better = true;
  const hv = HEAVY(t);
  const sv = STAY(t);
  if (sv && !negated(t, sv)) g.stay = true;
  if (OP_DONE(t)) g.op = true;
  if (g.better === undefined) {
    if (hv && !negated(t, hv)) g.severity = true;
    else if ((hv && negated(t, hv)) || LIGHT(t)) g.severity = false;
  }
  if (FAR(t) && (!f || f.subject === "self" || f.subject === "none")) g.far = true;
  if (OLD(t)) g.frail = "old";
  else if (YOUNG(t)) g.frail = "young";
  const du = DUR(t);
  if (du) g.dur = du[0].trim();
  // Chẩn đoán: "bác sĩ nói (là) (bị) X", hoặc câu đáp ngắn cho câu "bị gì?" vừa hỏi, hoặc "bị X thôi".
  const src = t.loose ? t.b : t.s;
  const rp = REPORT(t);
  // Lời thuật lại chỉ tính là chẩn đoán khi có người nói rõ (bác sĩ, bên viện…), hoặc Lomi vừa hỏi "bị gì", hoặc đã biết là đi khám rồi.
  const sayer = !!rp && (/(bác sĩ|bac si|bs|họ|ho |người ta|nguoi ta|viện|vien|thú y|thu y|bên đó|ben do)/.test(rp[0]) || th.asked.includes("dx") || th.facts.doctor === true);
  const said = rp && sayer ? cleanDx(src.slice((rp.index ?? 0) + rp[0].length).trim()) : "";
  const mild = / (thôi|thoi|nhẹ|nhe) $/.test(src) || f?.degree === "low";
  const askedDx = th.asked.includes("dx");
  let dx = "";
  if (said) dx = said;
  // (câu chỉ nói thời điểm — "tối qua", "hồi sáng" — không phải tên bệnh.)
  // "mẹ mổ ruột thừa" trả lời cho "bị sao vậy?" → chính cụm đó là điều cần biết (bỏ phần gọi tên người bệnh ở đầu).
  else if (askedDx && sv && t.words <= 7 && !mm && !du) {
    let body = src.trim();
    for (const c of [th.who.text, shortOf(th.who)]) for (const v of [c, bare(c)]) if (body.startsWith(`${v} `)) body = body.slice(v.length + 1);
    dx = cleanDx(body);
  } else if (askedDx && t.words <= 6 && !dm && !mm && !du && !(f && f.toks.length > 0 && f.toks.every((x) => ["TIME", "NUM", "ASPECT", "PART", "FILL", "VOC"].includes(x.r)))) dx = cleanDx(src.trim());
  else if (mild && f?.pred?.cls === "ill" && t.words <= 6) dx = cleanDx(src.trim().replace(/^(?:\S+ ){0,3}?(?=bị |bi )/u, ""));
  // Chỉ nói trống tên một bệnh ("sốt xuất huyết", "tiểu đường") khi chưa biết bị gì → đó là điều người dùng đang cho biết.
  if (!dx && th.facts.dx === undefined && t.words <= 5 && !dm && !mm && !du && !bm && !FEEL(t) && (!f || f.subject === "none" || f.subject === "third") && !(analyzeBody(src)?.sx.length ?? 0) && healthSubjectOf(src.trim(), true)) dx = cleanDx(src.trim());
  // Câu còn mang từ để hỏi ("bị gì vậy e", "có sao không") là người dùng đang HỎI lại, không phải cho biết tên bệnh.
  if (!said && f?.toks.some((x) => x.r === "QWORD" || x.r === "QPART")) dx = "";
  if ((askedDx || rp) && UNKNOWN(t)) g.dx = false;
  else if (dx && !/^(rồi|roi|vậy|vay|thế|the|gì|gi|sao|đó|do)$/.test(dx)) {
    const d = txt(dx);
    if (UNKNOWN(d)) g.dx = false;
    else if (LIGHT(d) && d.words <= 4) {
      g.dx = "không sao";
      g.severity = false;
    } else if (d.words <= 7) {
      g.dx = dx;
      if (said) g.doctor = true;
      if (mild) g.severity = false;
    }
  }
  // Ai đang chăm: "không ai chăm mẹ" nói lúc nào cũng nhận; còn lại chỉ khi Lomi vừa hỏi, và câu không nói điều gì khác.
  if (NOBODY(t) && !g.far && th.facts.carer === undefined) g.carer = false;
  else if (th.asked.includes("carer") && !Object.keys(g).length) {
    if (NOBODY(t)) g.carer = false;
    else if (SELF_CARE(t) || (f?.subject === "self" && !FEEL(t))) g.carer = "self";
    else if (!FEEL(t) && f?.toks.some((x) => x.r === "KIN")) g.carer = true;
  }
  return g;
}

function feelingOf(t: Txt, f: Frame | null): string | undefined {
  if (HELPLESS(t) && (!f || f.subject === "self" || f.subject === "none")) return "worry";
  const m = FEEL(t);
  if (!m || negated(t, m)) return undefined;
  // "mẹ a lo lắm" là cảm xúc của người khác; câu lược chủ ngữ ("lo quá") hay có người nói ("a lo quá") mới là của người kể.
  if (f && f.subject !== "self" && f.subject !== "none") return undefined;
  return FEEL_MISS(t) ? "miss" : FEEL_GUILT(t) ? "guilt" : FEEL_WORRY(t) ? "worry" : "sad";
}

/** Tóm lại những điều Lomi đang nhớ về mạch này (để người dùng thấy Lomi theo kịp). */
export function recap(th: Thread): string {
  const f = th.facts;
  const xs: string[] = [];
  if (th.kind === "care") {
    if (f.doctor === true) xs.push("đã đi khám");
    else if (f.doctor === false) xs.push("chưa đi khám");
    if (typeof f.dx === "string" && f.dx !== "không sao") xs.push(f.doctor === true ? `bác sĩ nói ${f.dx}` : `bị ${f.dx}`);
    if (f.meds === true) xs.push("có thuốc uống rồi");
    if (f.better === true) xs.push("đang đỡ dần");
    if (f.better === false) xs.push("chưa đỡ");
  } else {
    if (typeof f.dur === "string") xs.push(`ở bên bạn ${f.dur.replace(/\s*(rồi|nay|trời)$/u, "")}`);
  }
  return xs.join(", ");
}

/** Ô còn thiếu kế tiếp của mạch "người đang ốm" (theo những gì đã biết), kèm câu hỏi. Không có = không cần hỏi nữa. */
function nextCare(th: Thread, w: string, pet: boolean, hold: Slot[] = []): { slot: Slot; q: string } | null {
  const f = th.facts;
  // Ô đã hỏi mà chưa được đáp chỉ hỏi lại MỘT lần — và không hỏi lại ngay lượt kế (hold) khi người dùng vừa nói sang ý khác.
  const can = (s: Slot) => f[s] === undefined && !hold.includes(s) && (!th.done.includes(s) || (!th.reasked?.includes(s) && s !== "dx" && s !== "meds"));
  if (f.better !== undefined) return null;
  if (f.severity === false && f.doctor === undefined) return null; // đã nói là nhẹ thì không hỏi dồn "đi khám chưa"
  if (can("doctor")) return { slot: "doctor", q: th.done.includes("doctor") ? (pet ? "Mà bạn đưa bé đi thú y chưa?" : `Mà ${w} đã đi khám chưa bạn?`) : pet ? "Bạn đưa bé đi thú y chưa?" : `${cap(w)} đã đi khám chưa bạn?` };
  if (f.doctor === true && can("dx")) return { slot: "dx", q: pet ? "Bác sĩ thú y có nói bé bị gì không?" : `Bác sĩ có nói ${w} bị gì không?` };
  if (f.stay === true) return null; // đang nằm viện: bác sĩ lo phần thuốc, không hỏi "có thuốc chưa"
  if (f.doctor === true && can("meds")) return { slot: "meds", q: pet ? "Bác sĩ có cho bé thuốc gì chưa?" : `Bác sĩ có kê thuốc cho ${w} uống chưa?` };
  if (f.doctor === false && can("dur")) return { slot: "dur", q: typeof f.dx === "string" || pet ? `${cap(w)} bị vậy lâu chưa bạn?` : `${cap(w)} ốm mấy hôm rồi bạn?` };
  return null;
}

/** Một lượt trong mạch chuyện. Trả null = câu này không thuộc mạch (để các lớp sẵn có trả lời; router vẫn giữ mạch thêm 2 lượt). */
export function storyTurn(raw: string, f: Frame | null, th0: Thread, env: StoryEnv = {}): StoryReply | null {
  const t = txt(raw);
  if (!t.words || t.words > 16) return null;
  const pet = th0.who.kind === "pet";
  const you = youOf(env.addr);
  const idle = th0.idle ?? 0;

  // 0) Sửa lại chủ thể: "Mẹ a á, không phải a".
  const fix = subjectFix(raw, env.addr);
  if (fix) {
    const th: Thread = { ...th0, who: fix.who ?? th0.who, asked: [], idle: 0 };
    const w = th.who.text;
    const rc = recap(th);
    const nx = th.kind === "care" ? nextCare(th, shortOf(th.who), pet) : null;
    const lead = `Dạ, Lomi hiểu rồi — người ${th.kind === "care" ? "đang ốm" : "bạn đang nhắc tới"} là ${w}, không phải ${you} 🙏`;
    const body = rc ? `Lomi vẫn nhớ nè: ${w} ${rc}.` : "";
    const out = nx ? { ...slotsAsked(th, nx.slot), reasked: th.done.includes(nx.slot) ? [...(th.reasked ?? []), nx.slot] : th.reasked } : th;
    return { why: "fix", text: [lead, body, nx?.q].filter(Boolean).join(" "), thread: out };
  }

  // 11/10: "à, a bị gout nữa", "a cũng đang bị cảm" — người dùng nói về BỆNH CỦA CHÍNH MÌNH: không ghi vào mạch của người đang ốm
  //   (trước đây: "Anh bị gout hả. Bác sĩ có kê thuốc cho mẹ uống chưa?"). Lớp sức khoẻ trả lời cho đúng người; mạch vẫn được giữ.
  if (th0.kind === "care" && f?.selfWord && f.subject === "self" && SELF_ILL(t) && !feelingOf(t, f) && !CARER(t)) return null;

  // 11/10: đang theo chuyện một người ốm mà hỏi trống "a nên làm gì", "giờ phải làm sao" → việc NGƯỜI CHĂM làm được (hỏi bác sĩ cho rõ,
  //   ở bên, dấu hiệu cần báo ngay, giữ sức) — trước đây: "Em chưa theo kịp ý anh". Câu có triệu chứng / thuốc cụ thể thì lớp sức khoẻ trả lời.
  if (th0.kind === "care" && !env.inHealth && t.words <= 8 && CARE_ASK(t) && !HELPLESS(t) && !MEDS(t) && !(analyzeBody(raw)?.sx.length ?? 0)) {
    const s0 = shortOf(th0.who);
    const seen = th0.facts.doctor === true || th0.facts.stay === true;
    const doc = pet ? "thú y" : "bác sĩ";
    return {
      why: "advice",
      thread: { ...th0, idle: 0 },
      text: [
        `Lúc ${s0} đang ${th0.facts.stay === true ? "nằm viện" : "như vậy"} thì mấy việc này giúp được nhiều nhất nè:`,
        [
          seen ? `• Hỏi ${doc} cho rõ: ${s0} bị gì, điều trị bao lâu, cần chăm và theo dõi những gì — ghi lại để khỏi quên.` : `• Chưa đi khám thì nên đưa ${s0} đi ${pet ? "thú y" : "khám"} sớm để biết rõ bị gì — nhất là khi đã kéo dài hoặc nặng dần.`,
          `• Ở bên và lo giùm mấy việc nhỏ (ăn uống, ${pet ? "chỗ nằm ấm" : "giấy tờ"}, thuốc theo đơn) để ${s0} yên tâm nghỉ.`,
          pet ? `• Thấy ${s0} bỏ ăn, lừ đừ hơn hẳn thì báo thú y ngay.` : `• Thấy ${s0} mệt hơn hẳn, khó thở, lơ mơ thì báo bác sĩ hoặc gọi **115** ngay.`,
          pet ? "• Bạn cũng đừng lo quá mà quên ăn ngủ nha 💚" : "• Bạn cũng nhớ ăn ngủ giữ sức nha — chăm người ốm là đường dài.",
        ].join("\n"),
      ].join("\n"),
    };
  }

  // Câu hỏi, lời nhờ, lời chào / chúc / cảm ơn… không phải câu kể tiếp → lớp khác trả lời (mạch vẫn được giữ).
  // (Riêng câu đáp cụt cho câu Lomi vừa hỏi — "chưa", "rồi", "không" — nhìn giống câu hỏi nhưng chính là câu trả lời.)
  const nb = t.b.trim();
  const bareAns = th0.asked.length > 0 && (BARE_DONE.test(nb) || BARE_NOTYET.test(nb) || BARE_YES.test(nb) || BARE_NO.test(nb));
  //  Cũng vậy với lời thuật lại lời bác sĩ ("bac si noi viem hong" — gõ không dấu, "hong" dễ bị đọc thành "không?") và câu nói ra nỗi lo
  //  của chính mình ("a sợ mẹ có chuyện gì", "a không biết làm sao") — không có dấu hỏi thì đó là câu kể.
  const g0 = th0.kind === "care" && !raw.includes("?") ? readCare(t, f, th0) : {};
  //  …và câu KỂ việc đã làm xong ("cho uống hạ sốt rồi") — mở đầu bằng "cho", "làm"… trông như lời nhờ nhưng kết bằng "rồi", không có từ hỏi.
  const doneStmt = !!f && !raw.includes("?") && Object.keys(g0).length > 0 && f.toks.some((x) => x.r === "ASPECT" && x.cls === "post") && !f.toks.some((x) => x.r === "QWORD" || x.r === "QPART");
  const reported = (typeof g0.dx === "string" && g0.doctor === true) || th0.asked.some((x) => (g0 as Got)[x] !== undefined) || doneStmt;
  const ownFeel = !raw.includes("?") && !env.inHeart && !!feelingOf(t, f) && ((f?.subject === "self" && f.pred?.cls === "feel") || (!!HELPLESS(t) && !f?.time?.explicit));
  if (!bareAns && !reported && !ownFeel) {
    if (f && ["question", "request", "invite", "greet", "wish", "thanks", "leave", "hold"].includes(f.act)) return null;
    if (isAskLike(expandTeen(raw))) return null;
  }
  // Câu nói về một NGƯỜI KHÁC hẳn ("bố a thì khoẻ") → không ghi vào mạch này.
  //   (bác sĩ / bệnh viện làm chủ ngữ — "bác sĩ nói viêm họng", "bác sĩ kê thuốc rồi" — vẫn là chuyện của người đang ốm.)
  //   (một người khác đang CHĂM người ốm — "vợ a về quê chăm rồi" — thì lại là điều mới cho mạch này.)
  let otherCarer = false;
  if (f && (f.subject === "third" || f.subject === "pet") && f.subjectText && f.toks.some((x) => x.r === "KIN" || x.cls === "pet") && !STAFF.test(bare(f.subjectText))) {
    const other = f.subjectText.split(YOU_MARK).join(you);
    if (bare(other) !== bare(th0.who.text) && bare(shortOf({ text: other, kind: f.subject })) !== bare(shortOf(th0.who))) {
      if (th0.kind !== "care" || !CARER(t)) return null;
      otherCarer = true;
    }
  }

  const w = th0.who.text;
  const s = shortOf(th0.who);
  const feel = env.inHeart ? undefined : feelingOf(t, f);

  if (th0.kind === "care") {
    const g: Got = otherCarer ? { carer: true } : readCare(t, f, th0);
    // Chỉ điều MỚI mới được ghi nhận: nhắc lại điều Lomi đã biết ("e muốn về mà không được" sau "e đang ở xa") thì không đáp lại y câu cũ.
    for (const k of Object.keys(g) as (keyof Got)[]) if (k !== "frail" && k !== "dur" && th0.facts[k as Slot] !== undefined && th0.facts[k as Slot] === g[k as Slot]) delete g[k];
    const keys = Object.keys(g) as (keyof Got)[];
    // Triệu chứng cụ thể ("sốt cao với ho") mà không phải lời bác sĩ / câu trả lời cho ô vừa hỏi → lớp sức khoẻ phân tích (cho đúng người bệnh).
    //   (nhiệt độ đo được — "39 độ" — cũng vậy: lớp sức khoẻ biết đó là sốt cao hay chưa.)
    const sym = (analyzeBody(raw)?.sx.length ?? 0) > 0 || /(?<![\p{L}\d])(3[5-9]|4[0-2])([.,]\d)?\s*(độ|do|°)/u.test(raw.normalize("NFC").toLowerCase());
    if (sym && g.dx === undefined && g.doctor === undefined && g.meds === undefined && g.better === undefined && !feel) return null;
    if (!keys.length && !feel) {
      // Không có điều gì mới cho mạch: chỉ đáp khi câu là một mẩu kể ngắn về chính người đó, không thuộc lớp nào khác.
      //   Câu kể về chính mình chỉ nhận khi nó mang ý không vui / mong muốn ("e muốn về mà không được") — để lớp chuyện phiếm không đáp
      //   "Thích vậy trời 🤩" giữa lúc đang nói chuyện người ốm; chuyện khác hẳn ("a đang ăn pizza", "mai a đi Đà Nẵng") thì không nhận.
      const selfOk = !(f?.subject === "self" && !!f.pred) || !!f?.neg || (f?.pred?.val ?? 0) < 0 || !!f?.multi || f?.pred?.kind === "desire";
      if (idle > 0 || env.claimed || env.inHeart || !env.mirror || t.words > 10 || !selfOk) return null;
      const nx = nextCare(th0, s, pet);
      const th = nx ? { ...slotsAsked({ ...th0, idle: 0 }, nx.slot), reasked: th0.done.includes(nx.slot) ? [...(th0.reasked ?? []), nx.slot] : th0.reasked } : { ...th0, asked: [], idle: 0 };
      const grave0 = th0.facts.stay === true || th0.facts.severity === true;
      return { why: "detail", text: `${cap(env.mirror)} hả${grave0 ? " 🥺" : "."} ${nx ? nx.q : grave0 ? `Nghe mà thương ${s} quá.` : `Có gì thay đổi về ${w} thì kể Lomi nghe nha 💚`}`, thread: th };
    }
    if (idle > 0 && !keys.length) return null; // chuyện khác đã chen vào: chỉ quay lại mạch khi câu có điều mới
    const facts = { ...th0.facts };
    for (const k of keys) if (k !== "frail") facts[k as Slot] = g[k as Slot] as string | boolean;
    let th: Thread = { ...th0, facts, asked: [], idle: 0, felt: (th0.felt ?? 0) + (feel ? 1 : 0) };

    // An ủi khi có tín hiệu cảm xúc — vẫn nhắc đúng người đang ốm.
    if (feel && !keys.length) {
      const n = th0.felt ?? 0;
      if (n === 0) {
        const ask = th.facts.carer === undefined && !th.done.includes("carer");
        if (ask) th = slotsAsked(th, "carer");
        return {
          why: "feel",
          thread: th,
          text:
            feel === "worry"
              ? `${cap(w)} ${th.facts.stay === true ? "nằm viện" : "ốm"} thì lo là phải rồi — vì bạn thương ${s} nên mới vậy 🥺 Bạn cứ bình tĩnh nha.${ask ? ` Giờ có ai ở bên chăm ${s} không bạn?` : ""}`
              : `Nhìn ${w} ${th.facts.stay === true ? "nằm viện" : "ốm"} mà xót, mà thương là phải rồi 🥺 Có bạn quan tâm vậy, ${s} chắc cũng ấm lòng lắm.${ask ? ` Giờ có ai ở bên chăm ${s} không bạn?` : ""}`,
        };
      }
      // Lần thứ hai: người dùng đang cần được nghe nhiều hơn là hỏi han → từ lượt sau mạch tâm sự (chăm người bệnh) nghe tiếp.
      return { why: "feel", heart: "caregiver", thread: th, text: `Lomi hiểu, nhìn ${pet ? "bé" : "người thân"} ốm mà mình không làm gì hơn được thì bứt rứt lắm 😔 Bạn cũng nhớ giữ sức nha — bạn có khoẻ thì mới chăm ${s} được. Điều gì đang làm bạn lo nhất, nói Lomi nghe.` };
    }

    // Ghi nhận điều MỚI (ưu tiên điều quan trọng nhất), rồi hỏi ô còn thiếu.
    const acks: string[] = [];
    if (g.better === true) {
      return { why: "better", thread: { ...th, asked: [] }, text: `Nghe vậy Lomi mừng ghê 🥰 ${cap(w)} đỡ rồi thì bạn cũng nhẹ lòng ha. Nhớ để ${s} nghỉ ngơi thêm vài hôm cho lại sức nha!` };
    }
    if (g.better === false) {
      return {
        why: "worse",
        thread: th,
        text: `Vẫn chưa đỡ hả 😔 ${th.facts.doctor === true ? `Nếu ${s} uống hết thuốc mà không khá hơn, hoặc thấy nặng thêm, thì nên ${pet ? "đưa bé đi khám lại" : "đi tái khám"} sớm nha.` : `Vậy nên đưa ${s} đi ${pet ? "thú y" : "khám"} sớm cho yên tâm nha 🩺`}`,
      };
    }
    const grave = th.facts.stay === true || th.facts.severity === true;
    if (typeof g.dx === "string") acks.push(g.dx === "không sao" ? "Bác sĩ nói không sao thì nhẹ cả người ha 😊" : g.severity === false ? `Chỉ ${g.dx} thôi thì cũng đỡ lo 😊` : grave ? `${cap(g.dx)} hả 🥺 Nghe mà lo thật. Giờ mình cứ bám theo hướng dẫn của bác sĩ nha.` : `À, ${g.dx} hả 📝`);
    else if (g.dx === false) acks.push("Chưa rõ bị gì thì cứ chờ kết quả, đừng tự đoán rồi lo thêm nha.");
    if (g.op === true) acks.push("Mổ xong rồi hả 🙏 Qua được ca mổ là mừng rồi.");
    else if (g.stay === true && !acks.length) acks.push(`${g.doctor === true || th.facts.doctor === true ? "Nằm viện rồi hả 🥺" : "Phải vào viện hả 🥺"} Có bác sĩ theo dõi sát thì cũng đỡ lo phần nào.`);
    else if (g.doctor === true && !acks.length) acks.push(g.meds === true ? "Đi khám và có thuốc rồi thì yên tâm hơn nhiều 👍" : "Đi khám rồi thì yên tâm hơn nhiều 👍");
    else if (g.meds === true && !acks.length) acks.push("Có thuốc uống rồi thì tốt quá 👍");
    else if (g.meds === false) acks.push("Chưa có thuốc hả.");
    if (g.doctor === false) acks.push(`Chưa đi ${pet ? "thú y" : "khám"} hả. Nếu kéo dài hoặc thấy nặng thêm thì nên đưa ${s} đi sớm cho yên tâm nha 🩺`);
    if (g.severity === true && g.doctor !== true && g.stay !== true) acks.push("Nặng vậy hả 🥺 Vậy phải theo sát rồi.");
    else if (g.severity === false && !acks.length) acks.push("Không nặng thì cũng đỡ lo 😊");
    if (g.frail) acks.push(`${g.frail === "young" ? "Còn nhỏ" : pet ? "Bé lớn tuổi" : "Người lớn tuổi"} mà ốm thì mình càng phải để ý kỹ hơn.`);
    if (typeof g.dur === "string" && !acks.length) acks.push(`${cap(g.dur.replace(/\s*rồi$/u, ""))} rồi hả.`);
    if (g.far) acks.push(`Ở xa mà nghe ${s} ốm thì sốt ruột lắm 🥺 Bạn gọi hỏi thăm thường xuyên nha — nghe giọng bạn, ${s} cũng yên tâm hơn.`);
    if (g.carer !== undefined) acks.push(g.carer === false ? `Không có ai ở bên thì thương ${s} ghê 🥺 Bạn tranh thủ gọi hỏi thăm, hoặc nhờ người gần đó ghé qua giúp nha.` : g.carer === "self" ? "Bạn tự chăm hả, vất vả ghê 💚 Nhớ giữ sức nha." : `Có người ở bên thì ${s} đỡ tủi, bạn cũng yên tâm hơn 💚`);
    if (typeof g.dur === "string" && th.facts.doctor === false) acks.push(`Vậy nên đưa ${s} đi ${pet ? "thú y" : "khám"} cho chắc nha.`);
    if (feel) acks.unshift("Thương bạn ghê 🥺");

    // Lượt trước hỏi MỘT ô mà người dùng đáp sang ý khác → đừng hỏi lại y ô đó ngay; hỏi HAI ô mà mới đáp một thì hỏi nốt ô còn lại.
    const answeredOne = th0.asked.some((x) => g[x] !== undefined);
    const hold = answeredOne || g.dx !== undefined ? [] : th0.asked;
    const nx = nextCare(th, acks.some((a) => a.includes(s)) ? s : w, pet, hold);
    if (nx) {
      const re = th.done.includes(nx.slot);
      th = { ...slotsAsked(th, nx.slot), reasked: re ? [...(th.reasked ?? []), nx.slot] : th.reasked };
      return { why: "progress", thread: th, text: [...acks, nx.q].join(" ") };
    }
    // Đã đủ: khép lại bằng một lời động viên (không hỏi thêm). Bệnh Lomi có kiến thức thì mời hỏi tiếp bằng nút.
    const full = th.facts.doctor === true && th.facts.meds === true;
    const hs = typeof th.facts.dx === "string" ? healthSubjectOf(th.facts.dx, true) : null;
    const close = full
      ? `Vậy là ${w} được khám và có thuốc rồi, bạn cũng đỡ lo ha 💚 ${pet ? "Nhớ cho bé uống thuốc đúng giờ và để bé nghỉ ngơi nhiều nha." : `Nhớ nhắc ${s} uống thuốc đúng giờ, uống đủ nước và nghỉ ngơi nhiều nha.`} Mong ${s} mau khoẻ!`
      : th.facts.stay === true
        ? `Bạn cũng tranh thủ ăn uống, nghỉ ngơi để còn sức chăm ${s} nha 💚 Mong ${s} sớm khoẻ lại.`
        : th.facts.severity === false && th.facts.doctor === undefined
          ? `${pet ? "Bạn để bé nghỉ ngơi, ăn uống đủ nha." : `Nhớ nhắc ${s} nghỉ ngơi, uống nhiều nước ấm nha.`} Mong ${s} mau khoẻ 💚`
          : th.facts.doctor === true && th.facts.meds === false
        ? `Vậy bạn để ý ${s} thêm nha — nghỉ ngơi, uống đủ nước, thấy nặng hơn thì ${pet ? "đưa đi khám lại" : "tái khám"} liền. Mong ${s} mau khoẻ 💚`
        : `Mong ${w} mau khoẻ nha 💚`;
    const lead = full ? acks.filter((a) => !/yên tâm hơn nhiều|tốt quá/.test(a)) : acks;
    // Lời khép lại chỉ nói MỘT lần; sau đó có điều mới thì chỉ ghi nhận.
    const tail = th.closed ? (lead.length ? "" : "Dạ, Lomi nhớ rồi nha 📝") : close;
    return {
      why: "close",
      thread: { ...th, closed: true },
      text: [...lead, tail].filter(Boolean).join(" "),
      quick: full && hs && !th0.closed && !t.loose && bare(String(th.facts.dx)) !== String(th.facts.dx) ? [`${cap(String(th.facts.dx))} nên làm gì?`, `${cap(String(th.facts.dx))} kiêng gì?`] : undefined,
      health: full && hs ? { subject: hs.subject, label: hs.label, diet: hs.diet, cond: hs.cond } : undefined,
    };
  }

  // ── Mạch "mới mất" ─────────────────────────────────────────────────────────
  const g: Got = {};
  const du = DUR(t);
  // Khoảng thời gian chỉ là "đã gắn bó bao lâu" khi Lomi vừa hỏi điều đó, hoặc câu nói rõ nuôi / ở với / bên nhau (không phải "khóc cả đêm").
  if (du && (th0.asked.includes("dur") || !!KEEP(t)) && !/(đêm|tiếng)/.test(du[0])) g.dur = du[0].trim();
  if (C_SUDDEN(t)) g.cause = "sudden";
  else if (C_OLD(t) && !g.dur) g.cause = "old";
  else if (C_ILL(t)) g.cause = "ill";
  else if (th0.asked.includes("cause") && t.words <= 8 && !feel) g.cause = "other";
  const keys = Object.keys(g) as Slot[];
  if (!keys.length && !feel) {
    // Đang được mời kể kỷ niệm → một mẩu kể ngắn là đủ để Lomi đáp lại.
    if (idle > 0 || env.claimed || env.inHeart || !env.mirror || t.words > 10) return null;
    if (th0.asked.includes("memory"))
      return { why: "memory", thread: { ...th0, asked: [], idle: 0 }, text: `${cap(env.mirror)} hả 🥹 Nghe là biết ${pet ? "bé được thương nhiều lắm" : `bạn thương ${s} nhiều lắm`}. Mấy kỷ niệm đó sẽ ở lại với bạn mãi 💚` };
    // Một mẩu kể thêm khác ("sắp tới giỗ đầu") → nhắc lại với giọng chia sẻ (không để lớp chuyện phiếm đáp "😄 À à").
    if (f?.subject === "self" && !!f.pred) return null;
    return { why: "detail", thread: { ...th0, asked: [], idle: 0, noted: true }, text: `${cap(env.mirror)} hả 🥺${th0.noted ? "" : ` Những lúc như vậy chắc bạn nghĩ về ${s} nhiều lắm.`}` };
  }
  if (idle > 0 && !keys.length) return null;
  let th: Thread = { ...th0, facts: { ...th0.facts, ...g }, asked: [], idle: 0, felt: (th0.felt ?? 0) + (feel ? 1 : 0) };
  const dur = typeof th.facts.dur === "string" ? th.facts.dur.replace(/\s*(rồi|nay|trời)$/u, "") : "";
  if (feel && !keys.length) {
    const n = th0.felt ?? 0;
    if (n === 0)
      return {
        why: "feel",
        thread: th,
        text:
          feel === "guilt"
            ? `Đừng tự trách mình nha 🥺 Bạn đã thương và chăm ${s} hết lòng rồi${dur ? ` suốt ${dur}` : ""} — ${pet ? "bé" : s} biết điều đó mà.`
            : `${feel === "miss" ? "Nhớ" : "Buồn"} là phải rồi bạn ơi 🥺 ${dur ? `${cap(dur)} bên nhau` : "Gắn bó vậy"} mà, đâu dễ gì quen ngay được. Cứ cho mình buồn một thời gian nha, không sao đâu.`,
      };
    if (n === 1 && !th.done.includes("memory")) {
      th = slotsAsked(th, "memory");
      return { why: "feel", thread: th, text: `Lomi ở đây nghe bạn nè 💚 Nếu bạn muốn, kể Lomi nghe về ${w} đi — ${pet ? "bé hay làm gì dễ thương nhất?" : `điều gì ở ${s} bạn nhớ nhất?`}` };
    }
    return { why: "feel", heart: "grief", thread: th, text: `Thương bạn ghê 🫂 Nỗi nhớ này cho thấy ${pet ? "bé" : s} quan trọng với bạn tới mức nào. Bạn không cần phải vội ổn đâu.` };
  }
  const acks: string[] = [];
  if (g.dur) acks.push(pet ? `${cap(dur)} — từng ấy thời gian thì bé như người nhà rồi 🥺 Mất bé chắc bạn hụt hẫng lắm.` : `${cap(dur)}… từng ấy thời gian gắn bó thì mất mát này lớn lắm 🥺`);
  if (g.cause === "ill") acks.push(`${cap(pet ? "bé" : s)} bệnh mà đi… chắc bạn cũng đã cố hết sức rồi 🥺 Đừng tự trách mình nha.`);
  else if (g.cause === "old") acks.push(`${cap(pet ? "bé" : s)} đi vì tuổi già — ít ra ${pet ? "bé" : s} đã có trọn một đời bên người thương mình 🥺`);
  else if (g.cause === "sudden") acks.push("Đột ngột vậy thì sốc lắm 🥺 Chưa kịp chuẩn bị gì hết mà.");
  else if (g.cause === "other") acks.push("Ra là vậy 🥺 Thương bạn ghê.");
  if (feel) acks.push("Bạn cứ buồn, cứ nhớ nha — không sao đâu.");
  // Hỏi tiếp một ô còn thiếu (thú cưng: vì sao bé mất); đã biết rồi thì chỉ ở bên, không hỏi nữa.
  if (pet && th.facts.cause === undefined && !th.done.includes("cause")) {
    th = slotsAsked(th, "cause");
    return { why: "progress", thread: th, text: [...acks, "Bé bị bệnh hay sao vậy bạn?"].join(" ") };
  }
  return { why: "close", thread: th, text: acks.join(" ") };
}
