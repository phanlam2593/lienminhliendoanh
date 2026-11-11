// ─────────────────────────────────────────────────────────────────────────────
// HÌNH DẠNG CÂU HỎI (01/11, Kir: "không bao giờ hỏi A trả lời B") — chạy trên máy, không gọi AI, không thêm kiến thức.
//
// Mấy lớp trả lời (lib/lomiCause, lib/lomiMed, lib/lomiTrap) khớp theo TỪ KHOÁ; file này chỉ đọc CẤU TRÚC câu để các lớp đó
// biết: ai/cái gì là nguyên nhân (kể cả khi câu đảo "Y có phải do X không"), người dùng hỏi LOẠI gì (ở đâu / bao lâu / bao nhiêu /
// khác nhau thế nào…), và chủ ngữ có phải là một đồ vật / tên quán chứ không phải người bệnh.
// Mọi hàm ở đây là hàm thuần (chuỗi vào → kết quả), không đọc kho kiến thức.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";

/** \b của JS không hiểu chữ có dấu → ranh giới theo chữ cái Unicode. */
const W = (re: RegExp): RegExp => new RegExp(re.source.replace(/\\b/g, "(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))"), re.flags.includes("u") ? re.flags : re.flags + "u");
const N = (s: string) => ` ${normalizeVi(s)} `;
const low0 = (s: string) => s.normalize("NFC").toLowerCase().replace(/[?!.…,]+/gu, " ").replace(/\s+/g, " ").trim();

/** Đuôi câu hỏi có / không (gồm tiếng địa phương, viết tắt). */
const QEND = "(?:\\s+(?:hay\\s+)?(?:không|ko|k|hông|hong|hem|hok|khum|hả|ha|à|chứ|ạ|vậy|nhỉ|nhể|ta|đúng không|phải không|đúng hông|phải hông|thật không|luôn))+";

/**
 * Câu nhân quả ĐẢO VỊ TRÍ → dạng xuôi "X có gây Y không" (X = nguyên nhân, Y = hậu quả).
 *   "mất ngủ có phải do cà phê không"      → "cà phê có gây mất ngủ không"
 *   "bị mất ngủ là vì uống cà phê hả"       → "uống cà phê có gây mất ngủ không"
 *   "khó ngủ có phải tại trà xanh không"    → "trà xanh có gây khó ngủ không"
 *   "cà phê có phải nguyên nhân gây mất ngủ không" → "cà phê có gây mất ngủ không"
 * Không phải dạng đó → null.
 */
export function flipCause(q: string): string | null {
  const low = low0(q);
  if (low.split(" ").length > 16) return null;
  // Y (có) phải (là) do / tại / vì / bởi X không
  const a = low.match(new RegExp(`^(?:(?:cho (?:em|anh|chị|tui|mình) hỏi|vậy|thế|còn)\\s+)?(?:bị\\s+)?(.{2,30}?)\\s+(?:có phải|có phải là|phải|phải chăng|liệu có phải|có khi nào|có khi|chắc|là|có thể là|có thể)\\s+(?:là\\s+)?(?:do|tại|vì|bởi|bởi vì|tại vì|nguyên nhân từ)\\s+(.{2,30}?)(?:\\s+(?:mà ra|gây ra|nên))?${QEND}$`, "u"));
  const y = (t: string) => t.replace(/^(?:(?:tôi|tui|mình|em|anh|chị|con|bé)\s+)?(?:(?:hay|thường|đang|cứ)\s+)?(?:bị|thấy)\s+/u, "");
  if (a) return `${a[2]} có gây ${y(a[1])} không`;
  // X có phải (là) nguyên nhân (gây / của / làm) Y không
  const b = low.match(new RegExp(`^(.{2,30}?)\\s+(?:có phải|có phải là|là)\\s+(?:là\\s+)?nguyên nhân\\s+(?:gây(?: ra)?|của|làm|khiến)\\s+(.{2,30}?)${QEND}$`, "u"));
  if (b) return `${b[1]} có gây ${y(b[2])} không`;
  // vì sao / tại sao X lại / thì / hay Y ("vì sao uống cà phê lại mất ngủ") — hỏi cơ chế của một quan hệ nhân quả
  const c = low.match(/^(?:vì sao|tại sao|sao|do đâu mà)\s+(.{2,30}?)\s+(?:lại|thì|hay|cứ|lại hay|lại bị|thì bị|hay bị)\s+(?:bị\s+)?(.{2,30}?)(?:\s+(?:vậy|thế|ta|nhỉ|ạ|à|hả))*$/u);
  if (c) return `${c[1]} có gây ${y(c[2])} không`;
  return null;
}

export type QType = "where" | "howlong" | "howmany" | "when" | "why" | "how" | "should" | "compare" | "what" | "yesno";
/**
 * Loại câu hỏi theo TỪ HỎI và vị trí của nó. Thứ tự ưu tiên: so sánh trước (vì "khác nhau ở đâu" không phải hỏi chỗ),
 * rồi các từ hỏi có nội dung (ở đâu, bao lâu…), cuối cùng mới là có / không.
 */
export function qtypeOf(q: string): QType | null {
  const n = N(low0(q));
  if (/\b(khac nhau|khac gi|khac cho nao|khac o dau|giong nhau|giong va khac|phan biet)\b/.test(n)) return "compare";
  // (01/11: câu có dấu thì so đúng chữ "ở đâu / chỗ nào" — "đau răng nên đi khám ở đâu" vẫn là hỏi chỗ; câu không dấu thì "o dau" không
  //   được là phần đầu của "đau đầu / đau bụng…")
  const acc = /[^\x00-\x7F]/.test(q);
  if (acc ? /(?:^|\s)(ở đâu|chỗ nào|nơi nào|ở chỗ nào|ở mô|đâu vậy|đâu ta|tại đâu|ở nơi nào)(?=\s|$)/u.test(low0(q)) : /\b(o dau|cho nao|noi nao|o cho nao|o mo|dau vay|dau ta|tai dau|o noi nao)\b(?! (dau|bung|lung|nguc|hong|rang|bao tu|da day|khop))/.test(n)) return "where";
  if (/\b(bao lau|may ngay|may tuan|may thang|may hom|bao nhieu ngay|bao nhieu lau|keo dai bao lau)\b/.test(n)) return "howlong";
  if (/\b(bao nhieu|may (vien|ly|coc|lit|lan|bua|phan|gam|ml|tieng|gio))\b/.test(n)) return "howmany";
  if (/\b(khi nao|luc nao|bao gio|may gio|gio nao)\b/.test(n)) return "when";
  if (/\b(vi sao|tai sao|sao lai|do dau|nguyen nhan)\b/.test(n)) return "why";
  if (/\b(lam sao|the nao|nhu the nao|nhu nao|ra sao|cach nao|bang cach nao|lam gi)\b/.test(n)) return "how";
  if (/\b(co nen|nen hay khong|nen khong|co can)\b/.test(n)) return "should";
  if (/\b(la gi|la benh gi|nghia la gi)\b/.test(n)) return "what";
  if (/(?:^| )(?:khong|ko|k|hong|hem|khum|chua|ha|a|chu) *$/.test(n)) return "yesno";
  return null;
}

/** Hỏi THỜI GIAN HỒI PHỤC ("bao lâu thì hết / lành / đỡ", "mấy ngày thì khỏi", "kéo dài bao lâu") — khác "bao lâu thì phải đi khám". */
export const RECOVERY_Q = /\b(bao lau|may ngay|may tuan|may thang|may hom|bao nhieu ngay)( thi| moi| se| la)? (khoi|het|lanh|do|bot|giam|xep|khoi han|het han|lanh han|on)\b|\bkeo dai bao lau\b|\b(bi|benh)( \S+){0,3} bao lau\s*$/;

/** Đồ vật / máy móc làm chủ ngữ ("điện thoại bị sốt pin", "máy nóng quá", "app bị bệnh gì") — không phải người bệnh. */
const DEVICE = /^(?:(?:cai|con|chiec)\s+)?(dien thoai|dt|dthoai|may|may tinh|laptop|pin|sac|cuc sac|app|ung dung|wifi|mang|tivi|ti vi|tu lanh|may lanh|dieu hoa|xe|xe may|o to|loa|tai nghe|dong ho|ipad|iphone|android)\b/;
export function deviceSubject(q: string): string | null {
  const n = normalizeVi(low0(q).replace(/^(?:(?:tôi|tui|mình|em|anh|chị|con|bé)\s+)?(?:(?:thấy|bị|hỏi)\s+)?/u, "").replace(/^(?:cái|con|chiếc)\s+/u, ""));
  const m = n.match(DEVICE);
  if (!m) return null;
  // "máy đo huyết áp", "máy xông" là dụng cụ y tế — câu hỏi vẫn là sức khoẻ
  if (/^may (do|xong|thay|tro thinh|tao oxy|hut)\b/.test(n)) return null;
  return m[1];
}

/**
 * Tên quán viết HOA ngay sau "quán / tiệm" ("quán Đau Đầu ở đâu", "tiệm Mất Ngủ mở cửa không") — tên riêng, không phải bệnh.
 * Chỉ nhận khi các chữ của tên đều viết hoa chữ cái đầu (trong câu gốc người dùng gõ).
 */
export function namedShop(raw: string): string | null {
  const m = raw.normalize("NFC").match(/(?:^|[^\p{L}])(?:quán|tiệm|cửa hàng|nhà hàng)\s+((?:\p{Lu}[\p{Ll}\p{M}]*)(?:\s+\p{Lu}[\p{Ll}\p{M}]*){0,3})(?=$|[^\p{L}])/u);
  return m ? m[1] : null;
}

/** Dịch vụ y tế hỏi "ở đâu" ("tiêm phòng cúm ở đâu", "khám thuỷ đậu chỗ nào", "xét nghiệm tiểu đường ở đâu"). */
export function medPlaceAsk(q: string): string | null {
  const low = low0(q);
  if (qtypeOf(low) !== "where") return null;
  const m = low.match(W(/\b(tiêm phòng|tiêm ngừa|chích ngừa|tiêm vắc ?xin|tiêm|chích|khám|xét nghiệm|tầm soát|chụp|siêu âm|nội soi|điều trị|chữa|mua thuốc|lấy thuốc|hỗ trợ|tư vấn|cai)\b/u));
  return m ? m[1] : null;
}

/**
 * "A với / và B khác nhau thế nào", "A khác B chỗ nào", "phân biệt A và B" → [A, B].
 */
export function diffPair(q: string): [string, string] | null {
  const low = low0(q).replace(/^(?:cho (?:em|anh|chị|tui|mình) hỏi|phân biệt( giúp| giùm)?)\s+/u, "");
  const a = low.match(/^(.{2,30}?)\s+(?:với|và|vs|so với)\s+(.{2,30}?)\s+(?:khác nhau|khác gì nhau|khác gì|khác)(?:\s+(?:thế nào|ntn|như nào|như thế nào|ra sao|chỗ nào|ở đâu|ở chỗ nào|gì|không|ko|hả|vậy|nhau))*$/u);
  if (a) return [a[1], a[2]];
  const b = low.match(/^(.{2,30}?)\s+khác\s+(?:gì\s+)?(?:với\s+)?(.{2,30}?)(?:\s+(?:thế nào|ntn|như nào|như thế nào|ra sao|chỗ nào|ở đâu|ở chỗ nào|không|ko|hả|vậy))+$/u)
    ?? low.match(/^(.{2,30}?)\s+khác gì\s+(?:với\s+)?(.{2,30}?)$/u);
  if (b && !/^(?:nhau|gì)$/u.test(b[2])) return [b[1], b[2]];
  // "cúm có triệu chứng gì khác cảm lạnh", "dấu hiệu sốt xuất huyết khác sốt thường thế nào"
  const d = low0(q).match(/^(.{2,30}?)\s+(?:có\s+)?(?:triệu chứng|dấu hiệu|biểu hiện)\s+(?:gì\s+)?khác\s+(?:gì\s+)?(?:với\s+|so với\s+)?(.{2,30}?)(?:\s+(?:thế nào|ntn|như nào|ra sao|không|chỗ nào|ở đâu|vậy))*$/u)
    ?? low0(q).match(/^(?:triệu chứng|dấu hiệu|biểu hiện)\s+(?:của\s+)?(.{2,30}?)\s+(?:khác|với|và)\s+(?:gì\s+)?(?:với\s+)?(.{2,30}?)(?:\s+(?:khác nhau|thế nào|ntn|như nào|ra sao|chỗ nào|ở đâu|vậy))*$/u);
  if (d) return [d[1], d[2]];
  const c = low0(q).match(/^phân biệt(?: giúp| giùm)?\s+(.{2,30}?)\s+(?:với|và)\s+(.{2,30}?)$/u);
  if (c) return [c[1], c[2]];
  return null;
}

/**
 * Con vật là NGƯỜI BỆNH ("con mèo nhà tui bị tiêu chảy", "chó bị sốt", "bé cún nôn hoài") — kiến thức sức khoẻ của Lomi là cho NGƯỜI,
 * không được đưa nguyên nhân / mẹo / thuốc của người. Trả về tên con vật như người dùng gõ, hoặc null.
 */
const PET = "(?:con |bé |em |chú |cô )?(mèo|chó|cún|mèo con|chó con|cún con|thú cưng|vẹt|chim|thỏ|hamster|chuột hamster|rùa|cá cảnh)";
const PET_SX = "(sốt|tiêu chảy|đi ngoài|nôn|ói|ho|hắt hơi|sổ mũi|chảy nước mũi|ngứa|rụng lông|nổi mẩn|ghẻ|táo bón|chảy máu|đau bụng|khó thở|thở gấp|co giật|run|sưng|viêm|nhiễm trùng|bị thương|đi tiểu ra máu|tiểu ra máu|ăn phải|nuốt phải|ăn nhầm|uống nhầm|liếm phải)";
export function petPatient(q: string): string | null {
  const low = low0(q);
  const m = low.match(new RegExp(`^(?:(?:nhà|của)\\s+(?:tôi|tui|mình|em|anh|chị|con)\\s+(?:có\\s+)?)?${PET}(?:\\s+(?:nhà|của)\\s+(?:tôi|tui|mình|em|anh|chị|bạn|con|tớ|a|e|c))?\\s+(?:\\S+\\s+){0,3}?(?:đang\\s+|hay\\s+|cứ\\s+|bị\\s+|lại\\s+)*${PET_SX}(?![\\p{L}])`, "u"));
  return m ? m[1] : null;
}


/**
 * CHUẨN HOÁ PHỦ ĐỊNH (01/11): đưa các kiểu phủ định / phủ định kép / phủ định tu từ về câu hỏi thẳng, để lớp sau đọc đúng ý chính.
 *   "không phải đau đầu mà là đau bụng thì làm sao" → "đau bụng thì làm sao"     (bỏ vế bị bác, giữ vế được nhận)
 *   "không phải con tôi mà là tôi bị sốt"          → "tôi bị sốt"
 *   "ko hẳn là đau đầu, chỉ hơi nặng đầu thôi"     → "hơi nặng đầu thôi"
 *   "chẳng lẽ uống cà phê không gây mất ngủ"       → "uống cà phê có gây mất ngủ không"
 *   "cà phê đâu có gây mất ngủ đâu đúng không"     → "cà phê có gây mất ngủ không"
 *   "cúm không lây đúng không"                      → "cúm có lây không"   (phủ định đặt giả định rồi hỏi lại)
 * Không đổi được → null.
 */
export function normNeg(q: string): string | null {
  const low = q.normalize("NFC").replace(/[?!.…]+$/u, "").replace(/\s+/g, " ").trim();
  const L = low.toLowerCase();
  // không phải (là) A, mà (là) B …  (A ngắn; B là phần còn lại)
  const a = L.match(/^(?:ko|không|k|hông|chẳng|chả|đâu)\s+phải\s+(?:là\s+)?(.{2,25}?)\s*,?\s+mà\s+(?:là\s+)?(?!do\s)(.{2,60})$/u);
  if (a && !/^(hỏi|chữa|trị)\b/u.test(a[1])) return low.slice(low.length - a[2].length);
  // đâu phải / không phải (là) A, (tôi) chỉ B — vế sau sửa lại vế trước ("đâu phải tôi bị sốt, tôi chỉ hơi mệt thôi")
  const a2 = L.match(/^(?:đâu|không|ko|chẳng|chả)\s+phải\s+(?:là\s+)?(.{2,30}?)\s*,\s*((?:(?:tôi|tui|mình|em|anh|chị|con|bé)\s+)?(?:chỉ|chỉ là|chỉ bị|mà là|là)\s+.{2,50})$/u);
  if (a2) return low.slice(low.length - a2[2].length).replace(/^((?:tôi|tui|mình|em|anh|chị|con|bé)\s+)?(?:chỉ là|chỉ|mà là|là)\s+/iu, (_m, w) => `${w ?? ""}`);
  // không hẳn (là) A, (chỉ / mà) B
  const b = L.match(/^(?:ko|không|k|chưa)\s+hẳn\s+(?:là\s+)?(.{2,25}?)\s*[,;]\s*(?:mà\s+|chỉ\s+(?:là\s+)?)?(.{2,60})$/u);
  if (b) return low.slice(low.length - b[2].length);
  // chẳng lẽ / lẽ nào / bộ X không Y (sao / hả)
  const c = L.match(/^(?:chẳng lẽ|lẽ nào|chả lẽ|bộ|không lẽ)\s+(.{2,30}?)\s+(?:lại\s+)?(?:không|ko|chẳng|chả)\s+(.{2,30}?)(?:\s+(?:sao|hả|à|ư|thật|thiệt|à|ha|vậy|thật sao))*$/u);
  if (c) return `${c[1]} có ${c[2]} không`;
  // X đâu có Y đâu (đúng không / phải không / nhỉ)
  const d = L.match(/^(.{2,30}?)\s+(?:đâu có|có đâu|đâu)\s+(.{2,30}?)\s+đâu(?:\s+(?:đúng không|phải không|nhỉ|ha|hả|chứ|ta))*$/u);
  if (d) return `${d[1]} có ${d[2]} không`;
  // X không Y đúng không / phải không  (Y là vị ngữ có thể hỏi có / không)
  const e = L.match(/^(.{2,30}?)\s+(?:không|ko|chẳng|chả)\s+((?:có\s+)?(?:lây|nguy hiểm|gây|hại|ảnh hưởng|sao|cần|nặng|đau|tái phát|di truyền|chữa được|khỏi|độc)(?:\s+.{0,25})?)\s+(?:đúng không|phải không|đúng hông|phải hông|đúng ko|phải ko|nhỉ|chứ gì)$/u);
  if (e && !/^(?:tôi|tui|mình|em|anh|chị|con|bé)\b/u.test(e[1])) return `${e[1]} có ${e[2].replace(/^có\s+/u, "")} không`;
  return null;
}

/**
 * Câu nêu một CHỖ ĐAU / VIÊM ("đau bụng", "viêm họng", "nhức răng") không thuộc tên của chủ đề đang nói → là chuyện mới,
 * không phải câu hỏi nối của thẻ cũ ("đau đầu nên ăn gì" → "đau bụng nên ăn gì"). names = các tên của thẻ đang nói.
 */
export function otherComplaint(text: string, names: string[]): string | null {
  const m = ` ${normalizeVi(text)} `.match(/ (dau|viem|nhuc|sung) (bung duoi|lung duoi|bao tu|da day|bung|dau|lung|hong|rang|nguc|khop|mat|tai|co|vai|chan|tay|gan|than|phoi|xoang|goi) /);
  if (!m) return null;
  const k = `${m[1]} ${m[2]}`;
  const nn = names.map((x) => normalizeVi(x));
  return nn.some((x) => x.includes(k) || k.includes(x)) ? null : k;
}

// 11/11 (kiểm toán Lovable, P1-8 / G06 / G08 — "cần hỏi lại" chỉ đúng 58/112): câu KHÔNG có ngữ cảnh mà chỉ gồm chữ thay thế + hư từ
//   ("bả bị sao vậy", "nó có ổn không", "bao nhiêu?", "ổng nói vậy là ý gì", "lại nữa rồi") thì không có gì để trả lời —
//   trước đây ra "Dạy Lomi", "Vậy hả 😄 kể tiếp", hay bị FAQ / lời hỏi thăm Lomi bắt nhầm. Giờ hỏi lại MỘT câu.
//   Chỉ dùng khi lượt trước KHÔNG có mạch nào đang mở (bệnh, tâm sự, quán, bài…) — có mạch thì các lớp hỏi nối lo.
// Hư từ / chữ thay thế — viết ĐỦ DẤU. Chữ gõ có dấu phải khớp đúng dấu ("chó", "cắn", "đau", "đầu" KHÔNG nằm trong danh sách);
//   chữ gõ không dấu chỉ được tính khi dạng bỏ dấu của nó không trùng một chữ có nghĩa hay gặp (VG_AMBIG).
const VG_WORDS =
  "bh giờ bây làm ntn thế nào đây hix huhu cho tui tôi mình em anh chị e a c mk xin đó với vs liệu có dc đc được không ko k nhỉ bả bị sao vậy z ổng nói là ý gì j nó ổn họ cần ở người hả nên đi chỉ tính ấy còn như trước chứ lại nữa rồi r đang bao nhiêu thì bên hơn hết lâu mới xong để qua đêm ngày mấy lần cái hợp đọc giùm giúp thêm chút nha của mẹ á chưa mà vừa thấy cũng hỏi kia này ta nhé nè ad ơi ừ hay cứ vẫn sẽ đã từng thật sự về chuyện việc vụ điều khác nếu vì tại ai kiểu ảnh cổ";
const VG_STOP = new Set(VG_WORDS.split(" "));
const VG_BARE = new Set(VG_WORDS.split(" ").map((w) => normalizeVi(w)));
const VG_AMBIG = new Set("can dau cho me ba la lam o a de hop doc ve vu tai anh co ong tinh ben chi no ho hoi".split(" ")); // cắn/cân, đau/đầu, chó, mè, ba/bà, lá, lạm, ổ…
const VG_ACK = /^(?:cho (?:minh |em |toi |tui |anh |chi )?hoi(?: chut| ti| xiu| cai nay)?|hoi (?:chut|ti|xiu|cai nay)(?: nha| nhe)?|(?:\S+ )?la ai(?: vay| the| nhi)?)$|^(?:(?:vay|the|u|uh|um|o|a|ra|ok|oke|okie|duoc|roi|ha|nha|thoi|khong sao|ko sao|da|vang|uk|uhm|hay|that|a ha) ?)+$/;
const VG_WHO = /(?:^| )(ổng|bả|nó|họ|ảnh|cổ|người đó|người ấy|người ta|người kia|anh ấy|cô ấy|chị ấy|ông ấy|bà ấy|thằng đó|con đó|nguoi do|nguoi ay|nguoi ta|nguoi kia|anh ay|co ay|chi ay)(?: |$)/u;
/** Câu trơn không có nội dung để trả lời (khi chưa có ngữ cảnh)? "who" = có nhắc một NGƯỜI chưa rõ là ai; "what" = chưa rõ chuyện gì. */
export function vagueAsk(text: string): "who" | "what" | null {
  const t = text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/(\p{L})\1{2,}/gu, "$1").replace(/\s+/g, " ").trim();
  const n = normalizeVi(t);
  const toks = t.split(" ").filter(Boolean);
  if (!toks.length || toks.length > 9 || VG_ACK.test(n)) return null;
  const accented = /[^\x00-\x7F]/.test(t);
  const ok = (w: string) => (/[^\x00-\x7F]/.test(w) ? VG_STOP.has(w) : VG_STOP.has(w) || (VG_BARE.has(w) && (accented ? false : !VG_AMBIG.has(w))));
  if (!toks.every(ok)) return null;
  return VG_WHO.test(t) ? "who" : "what";
}
export const VAGUE_TEXT = {
  who: "Bạn đang nói về **ai**, và chuyện gì đã xảy ra vậy nè 🤔 Lomi chưa có ngữ cảnh — bạn kể thêm một chút để Lomi hiểu đúng nha.",
  what: "Lomi chưa rõ bạn đang nói tới chuyện gì 🤔 Bạn nói cụ thể hơn một chút nha — ví dụ chuyện sức khoẻ, tình cảm, công việc, hay cách dùng app?",
};
