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
import { detectDish } from "@/lib/lomiSearch";
import { namedDish } from "@/lib/lomiCook";
import { expandTeen, type ChatReply } from "@/lib/lomiChat";
import { VR, VN } from "@/lib/viMatch";

/** talk = câu đáp này mở / giữ mạch "nghe kể": tin kế tiếp của người dùng là kể tiếp, không phải câu độc lập (lib/lomiConvo). */
export type SenseReply = ChatReply & { intent: string; talk?: boolean };

const rnd = (n: number) => Math.floor(Math.random() * n);
let lastPick = "";
function pick(arr: string[]): string {
  const pool = arr.length > 1 ? arr.filter((x) => x !== lastPick) : arr;
  lastPick = pool[rnd(pool.length)];
  return lastPick;
}
/** Regex nguyên TỪ (có dấu) — "đói" khác "đổi", "mưa" khác "mua". */
const W = (s: string) => VR(new RegExp(`(?<![\\p{L}\\p{N}])(?:${s})(?![\\p{L}\\p{N}])`, "iu"));
const low = (raw: string) => raw.normalize("NFC").toLowerCase().trim();

// Đại từ người nói. "e/em" mơ hồ (có người xưng em, có người gọi Lomi là e) nên xử riêng.
const SELF = new Set(["a", "anh", "chi", "c", "minh", "tui", "toi", "to", "t", "tao", "tớ"]);
const SELF2 = new Set(["em", "e"]);
const VOC = new Set(["e", "em", "lomi", "ban", "oi", "ui", "ua", "ê", "alo"]);
const TIME_ADV = new Set(["hom", "nay", "qua", "bua", "sang", "trua", "chieu", "toi", "dem", "khuya", "mai", "luc", "gio", "dao", "doan", "tuan", "thang"]);

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
const Q_END = VR(/(?<![\p{L}])(không|ko|hông|hok|chưa|hả|hở|nhỉ|nhể|à|ư|sao|chứ|nào|vậy|thế)\s*[?!.…]*\s*$/u);
const TRAIL_VOC = VR(/\s+(nha|nhé|nè|nhen|đi|đó|á|ạ|e|em|lomi|ơi|bạn|anh|chị)\s*$/u);
const Q_START = VR(/^(ai|gì|nào|đâu|sao|thế nào|bao nhiêu|mấy|tại sao|vì sao|làm sao|làm thế nào|có phải|liệu|bao giờ|khi nào|có nên|nên)\b/u);
// 08/10: từ để hỏi đứng CUỐI câu ("máy này bao nhiêu", "giờ ăn gì", "quán này ở đâu") cũng là câu hỏi dù không có "?".
// Trừ khi phía trước là phủ định — "a chưa ăn gì", "mình không sao đâu", "không biết làm gì" là câu kể.
const WH_END = VR(/(?<![\p{L}])(gì|chi|đâu|bao nhiêu|bao lâu|bao giờ|khi nào|mấy|ai|thế nào|ra sao|làm sao|kiểu gì|cái gì|là gì|như nào|sao ta)\s*[!.…]*\s*$/u);
const NEG_BEFORE = VR(/(?<![\p{L}])(không|ko|hông|hok|khum|chưa|chẳng|chả|đâu có|đừng|k)(?![\p{L}])/u);
// (21/10: "nói chuyện hợp lắm", "nói chuyện vui ghê" là câu KỂ — chỉ "nói chuyện gì / đi / với em" mới là lời nhờ)
const DIRECTIVE = VR(/^(cho|nói(?! chuyện(?! (gì|đi|cười|với (em|e|lomi|mình)))\b)|chỉ|giải thích|cho biết|tìm|tra|dịch|viết|tính|giúp|hãy|làm(?= (giúp|giùm|dùm|hộ|cho|ơn|bài|thơ|văn|toán|phép|sao|thế nào|gì|như|theo|thử|lại|đi|một|cái|câu))|kể|hướng dẫn|tư vấn|gợi ý|đề xuất|xin|mách|bảo|rút|bói|lựa|chọn|cho hỏi|hỏi)\b/u);
export function isAskLike(raw: string): boolean {
  const s = low(raw);
  if (s.includes("?")) return true;
  const body = s.replace(VR(/^(e|em|lomi|ê|ơi|ạ)\s+(ơi\s+)?/u), "");
  if (Q_START.test(body) || DIRECTIVE.test(body)) return true;
  // (01/11 vòng 24: "uống nước nóng có tốt k" — đuôi hỏi viết tắt "k / hk / hok / khum" cũng là câu hỏi)
  if (/(^|\s)(có|co)\s.+\s(không|chưa|hông|ko|k|hk|hok|khum|hem|khong)\s*[?!.…]*\s*$/u.test(s) || VR(/(^|\s)có\b.+\b(không|chưa|hông|ko)\b/u).test(s)) return true;
  let body2 = s;
  for (let i = 0; i < 3; i++) body2 = body2.replace(TRAIL_VOC, "");
  if (Q_END.test(body2)) return true;
  // "bạn làm gì rồi", "ăn gì giờ ta" — bỏ thêm từ đệm cuối câu rồi mới tìm từ để hỏi.
  const body3 = body2.replace(VR(/(\s+(rồi|vậy|thế|ta|nhỉ|hả|ha|giờ|đây|luôn|nữa|trời))+\s*$/u), "");
  const wh = body3.match(WH_END);
  return !!wh && !NEG_BEFORE.test(body3.slice(0, wh.index));
}

// ── 1) CANON: đồng nghĩa + đảo từ → thêm từ khoá thư viện đã biết ──────────────
// Không thay chữ gốc (các lớp khác vẫn đọc nguyên văn), chỉ NỐI THÊM từ khoá chuẩn ở cuối.
const SYN: [RegExp, string][] = [
  // sức khoẻ / giấc ngủ
  [VN(/\b(ngủ (không|ko|k|hông|hong) (được|dc|đc|nổi|ngon|say)|không ngủ (nổi|nghê)|trằn trọc|thức trắng|thuc tam|ngủ chập chờn|hay tỉnh giấc)\b/), "mất ngủ"],
  [VN(/\b(nhức đầu|choáng váng|đau nửa đầu|đau đầu)\b/), "đau đầu"],
  [VN(/\b(buồn nôn|muốn nôn|nôn mửa)\b/), "buồn nôn"],
  // 05/11 (rà hiểu sai): "nóng ruột chờ người yêu nhắn" là SỐT RUỘT (lo, mong) — chỉ là buồn nôn khi không kèm chuyện chờ đợi / lo
  [VN(/\bnóng ruột\b(?!.*\b(chờ|đợi|mong|lo|tin nhắn|nhắn|kết quả|không biết|quá trời|ghê))/), "buồn nôn"],
  [VN(/\bnóng ruột\b(?=.*\b(chờ|đợi|mong|lo|tin nhắn|nhắn|kết quả|không biết|quá trời|ghê))/), "sốt ruột lo lắng"],
  [VN(/\b(muốn trốn|chỉ muốn trốn)( \S+){0,4} (cho yên|yên tĩnh|một mình|khỏi mọi người|khỏi tất cả)\b/), "áp lực quá"],
  // 05/11 (bộ đề "nói kiểu khác" do ChatGPT soạn): tên gọi dân gian / cách tả của bệnh thường gặp → tên chuẩn
  [VN(/\b(tào tháo đuổi|ỉa chảy|ỉa lỏng|tiêu lỏng|đi phân lỏng|phân lỏng|đi ngoài (nhiều lần|liên tục|hoài|lỏng|toàn nước)|đi cầu (lỏng|nhiều lần|liên tục|toàn nước))\b/), "tiêu chảy"],
  [VN(/\b(bị bón|bón bụng|bon bung|khó đi (cầu|vệ sinh|ngoài|đại tiện|nặng)|(chưa|không|ko|hông) đi (ngoài|cầu|vệ sinh|nặng) (được|đc|dc|nổi)|(mấy|nhiều|vài) (ngày|hôm|bữa)( \S+){0,2} (chưa|không|ko) đi (ngoài|cầu|vệ sinh|nặng))\b/), "táo bón"],
  [VN(/\b(đau bụng (khi |lúc |mỗi lần |mỗi khi |những )?(ngày )?(tới|đến|có|hành) (tháng|kỳ|kinh)|(tới|đến|có) (tháng|kỳ|kinh)( \S+){0,4} đau bụng|đau bụng (ngày|mùa|kỳ) (đèn đỏ|kinh|dâu|đèn)|(ngày|kỳ) đèn đỏ( \S+){0,4} đau bụng|đau bụng ngày kinh)\b/), "đau bụng kinh"],
  [VN(/\b(căng như dây đàn|đầu óc căng thẳng|căng não)\b/), "căng thẳng"],
  [VN(/\b(tâm trạng (xuống|đi xuống|chùng xuống|tụt)|(chẳng|không|hông|ko) (thấy )?vui (chút )?(nào|gì cả|gì hết|nổi))\b/), "tâm trạng tệ"],
  [VN(/\b(đầy hơi|chướng bụng|ăn không tiêu|đầy bụng)\b/), "khó tiêu"],
  // tâm lý
  [VN(/\b(áp lực|nặng nề|ngộp thở|ngợp thở|kiệt quệ|không chịu nổi nữa|chịu hông nổi|chịu hong nổi|sap dat|quá sức)\b/), "áp lực quá"],
  // 08/10: "không biết làm gì" trần ("cuối tuần không biết làm gì", "rảnh quá không biết làm gì") là đang rảnh / chán,
  // KHÔNG phải hoang mang. Chỉ nhận khi có dấu hiệu bế tắc thật: "không biết PHẢI làm gì/sao", "… nữa", "mất phương hướng".
  [VN(/\b(không biết phải làm (gì|sao)|không biết (làm gì|làm sao) (nữa|bây giờ đây|đây nữa)|không biết đi đâu về đâu|bi quan|mất phương hướng|chẳng còn gì|hoang mang)\b/), "hoang mang"],
  [VN(/\b(thất vọng về bản thân|mình vô dụng|không ra gì|chẳng giỏi gì|ghét bản thân)\b/), "tự ti"],
  [VN(/\b(stress|căng thẳng|mệt mỏi|kiệt sức|áp lực)\b.*\b(công việc|đi làm|sếp|deadline|kpi|tăng ca)\b|\b(công việc|đi làm|deadline|kpi)\b.*\b(stress|căng thẳng|áp lực|kiệt sức)\b/), "áp lực công việc"],
  // tình cảm
  [VN(/\b(thích|yêu|mê|phải lòng|cảm nắng|crush)\b.*\b(người (ấy|đó|ta)|chị ấy|anh ấy|cô ấy|cậu ấy|bạn ấy|em ấy|họ)\b.*\b(không (để ý|biết|đáp lại|thích lại|quan tâm|để tâm|ngó|nhìn|coi|hay biết)|chỉ coi|chẳng để ý|vô tâm|chưa bao giờ)\b/), "thích đơn phương"],
  [VN(/\b(người (ấy|đó)|chị ấy|anh ấy|cô ấy|cậu ấy)\b.*\b(không thích|không yêu|không để ý|chỉ coi)\b.*\b(mình|tôi|a|anh|em|e)\b/), "thích đơn phương"],
  [VN(/\b(vợ|chồng|người yêu|ny|bồ|gấu|bạn trai|bạn gái|crush)\b.*\b(giận|cáu|hờn|dỗi|mắng|chửi|bỏ đi|không nói chuyện|nặng nhiếc|cằn nhằn|to tiếng)\b/), "giận nhau"],
  [VN(/\b(vợ|chồng)\b.*\b(đi nhậu|nhậu nhẹt|rượu chè|cá độ|cờ bạc|đi chơi khuya|về khuya|không về nhà|không quan tâm|vô tâm|lạnh nhạt|nhắn tin với người)\b/), "vợ chồng"],
  [VN(/\b(người yêu|ny|bồ|gấu|bạn trai|bạn gái|chồng|vợ|người ấy|người đó|anh ấy|chị ấy|cô ấy|crush)\b.*\b(biến mất|im lặng|không liên lạc|bắt máy|không trả lời|làm ngơ|né tránh|không gọi|không nhắn tin|không rep)\b/), "lạnh nhạt"],
  [VN(/\b(người yêu|ny|bồ|gấu|chồng|vợ)\b.*\b(nói dối|nói xấu|giấu mình|có người khác|nhắn tin với (ai|cô|anh|người)|đi với (ai|cô|anh|người) khác)\b/), "nghi ngoại tình"],
  [VN(/\b(nhớ (anh|cô|chị|cậu|người) (ấy|đó|ta)|không quên được (người|anh|cô|chị))\b/), "nhớ người cũ"],
  // công việc / tiền / gia đình
  // (11/10: chữ "la" (la mắng) xét riêng ở senseCanon trên câu CÓ DẤU — "sếp em là nữ", "trưởng phòng là ai" không phải bị mắng.)
  [VN(/\b(sếp|quản lý|quản lí|trưởng phòng)\b.*\b(mắng|chửi|ép|soi|bắt nẹt|không ghi nhận|ghét|đối xử)\b/), "bị sếp mắng"],
  [VN(/\b(hết tiền|cạn túi|khó khăn về tiền|không đủ sống|tiền thuê|tiền trọ)\b/), "thiếu tiền"],
  [VN(/\b(ba|mẹ|bố|cha)\b.*\b(không hiểu|ép|áp đặt|mắng|so sánh|cấm)\b/), "gia đình áp đặt"],
];

/** Nối thêm từ khoá chuẩn vào câu (nếu cách nói là biến thể). Câu không dính biến thể nào thì trả nguyên. */
// 05/11 (bộ đề "nói kiểu khác"): tên gọi khác của bệnh / triệu chứng → ĐỔI THẲNG trong câu (không nối thêm ở cuối, để câu
//   "cao đường ăn chuối hok" vẫn đọc được là hỏi món với bệnh). Có cả dạng có dấu lẫn không dấu.
const RENAME: [RegExp, string][] = [
  // 12/11 (bộ 1.000 câu — câu sức khoẻ nói theo kiểu đời thường mà kho có bài): đổi về tên bài
  [VR(/(?<![\p{L}])(lá gan|gan)( của)?( \S+)?( (bị|đã|cũng|hơi))? nhiễm mỡ(?![\p{L}])/giu), "gan nhiễm mỡ"],
  [VR(/(?<![\p{L}])(lãng tai|lang tai|nặng tai|nang tai|tai (nghe )?kém|nghe (không|ko|chẳng) rõ|nghe nhỏ|nghe ngày càng kém)(?![\p{L}])/giu), "nghe kém"],
  [VR(/(?<![\p{L}])(nóng rát|rát|nóng|bỏng rát) (sau|ở|vùng|giữa|trong) (xương ức|ngực|thượng vị|lồng ngực)(?![\p{L}])/giu), "ợ nóng"],
  [VR(/(?<![\p{L}])(cổ tay (\S+ )?(hay|bị|cứ|thường|hơi)? ?tê|tê (ở |hai |2 )?cổ tay|tê (bàn |các )?(ngón )?tay (khi|lúc|mỗi|ban|về) (\S+ ){0,2}(ngủ|đêm|sáng|dậy|gõ|làm))(?![\p{L}])/giu), "tê tay chân"],
  [VR(/(?<![\p{L}])(té|tê) (bàn )?(tay|chân) (lúc|khi|mỗi) (ngủ|sáng|đêm)(?![\p{L}])/giu), "tê tay chân $4 $5"],
  [VR(/(?<![\p{L}])(va|đập|cụng|đụng) (đầu|trán) (vào|vô|xuống)(?![\p{L}])/giu), "va đập đầu vào"],
  [VR(/(?<![\p{L}])lưng( \S+)? (nhức|đau|mỏi)( âm ỉ| nhiều| quá| ê ẩm)?(?![\p{L}])/giu), "đau lưng"],
  [VR(/(?<![\p{L}])(nhức|đau) (âm ỉ )?(ở )?(vùng )?(thắt )?lưng(?![\p{L}])/giu), "đau lưng"],
  [VR(/(?<![\p{L}])(đầu gối|gối)( \S+)? (sưng|sưng đau|bị sưng)(?![\p{L}])/giu), "đau đầu gối, sưng"],
  [VR(/(?<![\p{L}])sưng (đầu )?gối(?![\p{L}])/giu), "đau đầu gối, sưng"],
  [VR(/(?<![\p{L}])(bị )?(ói|ọe|oẹ|mửa|nôn)( \d+| hai| ba| mấy)? (lần|bận|cữ)(?![\p{L}])/giu), "bị nôn$3 $4"],
  [VR(/(?<![\p{L}])(trầy da|trầy xước|bị trầy|xước da|trầy chân|trầy tay|trầy đầu gối)(?![\p{L}])/giu), "vết trầy xước"],
  [VR(/(?<![\p{L}])nhịp tim (nhanh|cao|hơi nhanh)(?![\p{L}])/giu), "đánh trống ngực"],
  [VR(/(?<![\p{L}])(tào tháo đuổi|tao thao duoi|ỉa chảy|ia chay|ỉa lỏng|tiêu lỏng)(?![\p{L}])/giu), "tiêu chảy"],
  [VR(/(?<![\p{L}])(bón bụng|bon bung)(?![\p{L}])/giu), "táo bón"],
  [VR(/(?<![\p{L}])(bị bón|bi bon)(?![\p{L}])/giu), "bị táo bón"],
  [VR(/(?<![\p{L}])(rát cổ họng|rát cổ|rat co|cổ họng (bị )?rát|co hong (bi )?rat|rát họng|rat hong)(?![\p{L}])/giu), "đau họng"],
  [VR(/(?<![\p{L}])(mũi (bị )?(tịt|tắc)|mui (bi )?(tit|tac)|tịt mũi|tắc mũi)(?![\p{L}])/giu), "nghẹt mũi"],
  [VR(/(?<![\p{L}])(cao máu|cao mau)(?![\p{L}])/giu), "tăng huyết áp"],
  [VR(/(?<![\p{L}])(bệnh đường|benh duong|cao đường|cao duong|đường huyết cao|duong huyet cao)(?![\p{L}])/giu), "tiểu đường"],
  [VR(/(?<![\p{L}])(muỗi (chích|cắn)|muoi (chich|can))(?![\p{L}])/giu), "muỗi đốt"],
  [VR(/(?<![\p{L}])(nóng sốt|sốt nóng)(?![\p{L}])/giu), "sốt"],
  [VR(/(?<![\p{L}])dạ dàu(?![\p{L}])/giu), "dạ dày"],
  // 05/11 (rà hiểu sai): nói ví von, không phải bệnh
  [VR(/(?<![\p{L}])(đau đầu|nhức đầu|điên đầu|nhức nhối|đau não) (vì|với|do|tại|chuyện) (?=(sếp|deadline|công việc|việc|con|chồng|vợ|tiền|nợ|chuyện|người yêu|ny|bài tập|thi cử|kỳ thi|đống|mấy đứa|khách|nhà chồng|nhà vợ)(?![\p{L}]))/giu), "áp lực vì "],
  [VR(/(?<![\p{L}])điên đầu(?![\p{L}])/giu), "áp lực quá"],
  [VR(/(?<![\p{L}])(đầu óc |đầu )?(cứ )?quay cuồng (vì|với|do|tại|chuyện)(?![\p{L}])/giu), "áp lực vì"],
  [VR(/(?<![\p{L}])(đau bụng|đầy bụng|đi ngoài|tiêu chảy|sôi bụng)( \S+){0,1} (mỗi khi|mỗi lần|khi|sau khi|lúc) (uống|ăn) (sữa|đồ sữa|phô mai|kem)(?![\p{L}])/giu), "không dung nạp lactose"],
  [VR(/(?<![\p{L}])tim (đập nhanh|đập thình thịch|loạn nhịp|rung rinh)( \S+){0,2} (khi|lúc|mỗi khi|mỗi lần) (gặp|thấy|nhìn|nói chuyện với|nhắn tin với|đứng gần) (crush|người ấy|anh ấy|cô ấy|người yêu|ny|bạn ấy|ảnh|ổng|chị ấy|người (mình |tôi |em )?thích)(?![\p{L}])/giu), "mình thích $5"],
  [VR(/(?<![\p{L}])(mất sóng|yếu sóng|không có sóng|rớt sóng)( điện thoại)?(?![\p{L}])/giu), "mất mạng"],
  [VR(/(?<![\p{L}])giết thời gian(?![\p{L}])/giu), "không có gì làm"],
  [VR(/(?<![\p{L}])ăn đòn(?![\p{L}])/giu), "bị đánh"],
  [VR(/(?<![\p{L}])đau như (bị )?(dao|kim|lửa) (cắt|đâm|xé|cứa|đốt)( ở| vùng)? (bụng|ngực|đầu|lưng|dạ dày)(?![\p{L}])/giu), "đau $5 dữ dội"],
  [VR(/(?<![\p{L}])(bị |đang )?lên cơn (hen suyễn|hen|suyễn)(?![\p{L}])/giu), "bị cơn hen suyễn"],
  [VR(/(?<![\p{L}])(bị cho thôi việc|cho thôi việc|bị thôi việc|bị cho nghỉ việc|mất công việc)(?![\p{L}])/giu), "bị mất việc"],
  [VR(/(?<![\p{L}])đau cái (đầu|bụng|lưng|răng|họng|bụng)(?![\p{L}])/giu), "đau $1"],
  [VR(/(?<![\p{L}])bị hô(?= (phải|thì|hoài|quá|lâu|mấy|nhiều|làm|lm|có)(?![\p{L}]))/giu), "bị ho"],
];
export function senseCanon(q0: string): string {
  let q = q0;
  // (câu gõ không dấu → tên chuẩn cũng không dấu, để cả câu vẫn là "không dấu" cho bộ đoán dấu / các lớp đọc lỏng)
  const plain = !/[\u0080-\uFFFF]/.test(q0);
  for (const [re, to] of RENAME) q = q.replace(re, plain && !to.includes("$") ? normalizeVi(to) : to);
  const n = normalizeVi(q);
  const add: string[] = [];
  for (const [re, canon] of SYN) if (re.test(n) && !n.includes(normalizeVi(canon))) add.push(canon);
  // "sếp la a hoài": "la" = la mắng chỉ khi người dùng gõ đúng chữ "la" — chữ "là" bỏ dấu cũng thành "la" nhưng không phải bị mắng.
  if (VN(/\b(sếp|quản lý|trưởng phòng)\b.*\bla\b/).test(n) && VN(/(^|\s)la(\s|$)/).test(q.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ")) && !add.includes("bị sếp mắng") && !n.includes("bi sep mang")) add.push("bị sếp mắng");
  // 11/10: "dạ dày e đau quá", "lưng a cứ đau hoài" — bộ phận đứng TRƯỚC chữ "đau" → thêm cụm chuẩn "đau <bộ phận>" cho lớp triệu chứng.
  const bp = n.match(VN(/\b(dạ dày|bao tử|bụng|lưng|răng|họng|ngực|đầu)( (của )?(e|em|a|anh|c|chị|mình|tui|tôi|con|bé))?( (bị|đang|cứ|hay|lại|vẫn))* đau\b/));
  if (bp) {
    const part = ({ "da day": "dạ dày", "bao tu": "bao tử", bung: "bụng", lung: "lưng", rang: "răng", hong: "họng", nguc: "ngực", dau: "đầu" } as Record<string, string>)[bp[1]];
    if (part && !n.includes(`dau ${bp[1]}`)) add.push(`đau ${part}`);
  }
  const req = canonRequest(q, n);
  if (req) return req;
  return add.length ? `${q} ${add.join(" ")}` : q;
}

// Yêu cầu nói theo nhiều cách → câu chuẩn mà các lớp khác đã hiểu.
const V_FIND = "(?:lua|chon|tim|kiem|goi y|de xuat|gioi thieu|chi|mach|cho biet|tim giup|chon giup|lua giup)";
const FILL = "(?:giup|gium|giumd|dum|ho|cho|voi|vs)?";
const WHO = "(?:a|anh|chi|c|em|e|minh|tui|toi|t|to)?";
const POL = "(?: (?:di|nha|nhe|nhen|ne|a|voi|vs|xiu|chut|ti|duoc khong|nao|ha|nhi))*";
// Phần còn lại sau cụm "tìm + quán/món" chỉ gồm từ đệm, người nhờ, "gần đây", loại quán đã đọc → không còn chi tiết riêng.
const REQ_FILLER = new Set("cho giup gium dum ho voi vs a anh chi c em e minh tui toi t to di nha nhe nhen ne xiu chut ti nao ha nhi duoc khong ko k gan day minh quanh nay ngon nao do an uong ca phe cafe tra sua nhau trua toi sang chieu hom nay gio bay luon".split(" "));
const hasExtra = (rest: string) => rest.split(" ").filter(Boolean).some((w) => !REQ_FILLER.has(w));
function canonRequest(q: string, n: string): string | null {
  const w = n.split(" ").length;
  if (w > 12) return null;
  // Tìm / chọn quán, chỗ, món
  const f = n.match(VR(new RegExp(`^(?:e |em |lomi |oi )*${V_FIND} ${FILL} ?${WHO} ?(?:mot |1 |may |vai )?(quan an|quan nhau|quan cafe|quan ca phe|quan tra sua|quan|nha hang|cho an|cho uong|cho choi|cho ngoi|cafe|ca phe|do an|mon an|mon|do uong)${POL}`)));
  // 08/10: chỉ đổi về câu chuẩn khi yêu cầu KHÔNG còn chi tiết riêng. "tìm quán pizza", "tìm quán cà phê yên tĩnh để làm việc"
  // phải giữ nguyên văn để lớp sau đọc đúng món / yêu cầu — đổi thành "tìm quán ăn gần đây" là làm mất ý người dùng.
  if (f && !hasExtra(n.slice(f[0].length))) {
    const o = VN(/cà phê|cafe/).test(n) ? "cafe" : VN(/trà sữa/).test(n) ? "tra sua" : VR(/nhau/).test(n) ? "nhau" : f[1];
    let out = "tìm quán ăn gần đây";
    if (VN(/món|đồ ăn|đồ uống/).test(o)) out = VR(/uong/).test(o) ? "hôm nay uống gì" : "hôm nay ăn gì";
    else if (VN(/cafe|cà phê/).test(o)) out = "tìm quán cà phê gần đây";
    else if (VR(/nhau/).test(o)) out = "tìm quán nhậu gần đây";
    else if (VN(/trà sữa/).test(o)) out = "tìm quán trà sữa gần đây";
    else if (VR(/uong/).test(o)) out = "tìm chỗ uống gần đây";
    // Câu gốc có nhắc một món mà câu chuẩn làm mất món đó ("tìm quán pizza") → giữ nguyên văn.
    const dish = detectDish(q);
    if (!dish || detectDish(out)?.id === dish.id) return out;
  }
  // 08/10: các câu chuẩn dưới đây cũng chỉ dùng khi câu gốc KHÔNG còn ý riêng phía sau. Trước đó "bói tarot xem người ấy
  // có còn tình cảm với mình không" bị đổi thành "bói một lá cho hôm nay" — mất luôn câu hỏi của người dùng.
  const bare = (m: RegExpMatchArray | null) => !!m && !hasExtra(n.slice((m.index ?? 0) + m[0].length));
  // Rút / bói một lá
  if (bare(n.match(VR(new RegExp(`^(?:e |em |lomi |oi )*(?:rut|lat|boc|xin|boi|xem) ${FILL} ?${WHO} ?(?:mot |1 |may |vai )?(la bai|la tarot|la|bai|tarot)${POL}`)))))
    return "bói một lá cho hôm nay";
  // Hướng dẫn dùng app
  if (bare(n.match(VN(/^(?:e |em |lomi |ơi )*(hướng dẫn|chỉ|chỉ cách|dạy|chỉ giúp|hướng dẫn giúp)( \w+){0,2} (xài|dùng|sử dụng|chơi|thao tác) (app|ứng dụng|lomi|ilomi|liên minh liên doanh)\b/))))
    return "hướng dẫn dùng app";
  // Nói chuyện / tâm sự / tư vấn tình cảm
  if (VR(new RegExp(`^(?:e |em |lomi |oi )*(?:noi chuyen|tro chuyen|tam|chat|tam su|ke chuyen|nc) (?:voi|cung) ${WHO}${POL}$`)).test(n))
    return VN(/tâm sự/).test(n) ? "tâm sự với mình nha" : "nói chuyện với mình đi";
  // "e tư vấn tình cảm được không?" là HỎI KHẢ NĂNG (lib/lomiIntent trả lời), không phải lời nhờ tư vấn ngay.
  if (!VN(/\b(được|dc|đc) (không|ko|k|hông|hong|chứ|hả|ha)\b|\b(không|ko|hông|hong)$/).test(n) && bare(n.match(VN(/^(?:e |em |lomi |ơi )*(?:tư vấn|khuyên|cho (?:\w+ )?lời khuyên|giúp)( \w+){0,3} (tình cảm|tình yêu|chuyện yêu|chuyện tình|chuyện vợ chồng|tâm lý)\b/))))
    return VN(/tâm lý|tâm lí/).test(n) ? "tư vấn tâm lý" : "tư vấn tình cảm";
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
  while (words.length && VR(/^(nè|nha|nhé|nhen|á|ạ|rồi|đó|luôn|thôi|đây|mà|xong|nữa)$/u).test(words[words.length - 1])) words.pop();
  return words.slice(0, 3).join(" ");
}

const STATES: StateDef[] = [
  {
    // 08/10: DỰ ĐỊNH ("a đang tính đi cf", "định đi ăn lẩu") — ghi nhận + mời bước tiếp theo, để câu sau ("quán nào ổn?")
    // có ngữ cảnh mà nối. Đứng trước các trạng thái "đang ăn / đang uống" vì đây là việc CHƯA làm.
    id: "plan",
    re: W("(đang |đang có |có )?(tính|định|sắp|chuẩn bị|dự định)( là| sẽ)? (đi|ra|ghé|qua|làm|ăn|uống|kiếm|mua)( [\\p{L}\\d]+){0,4}"),
    reply: (m, s) => {
      const d = detectDish(expandTeen(s));
      if (d) {
        const label = d.name.split(/[,(]/)[0].trim();
        return { text: `${d.drink ? `Đi ${label} hả ☕` : `${cap(label)} hả 😋`} Nghe thích đó! Muốn Lomi tìm quán ${label} cho không?`, quick: [`Tìm quán ${label} gần đây`] };
      }
      const what = tail(s, VR(/(tính|định|sắp|chuẩn bị|dự định)( là| sẽ)? /u));
      return { text: what ? `${cap(what)} hả 😄 Nghe hay đó! Kế hoạch sao rồi nè?` : "Nghe hay đó 😄 Kế hoạch sao rồi nè?" };
    },
  },
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
      const tea = VR(/trà/).test(m[0] ?? s);
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
      const food = tail(s, VR(/ăn xong|ăn (?=\p{L})|nhậu/u)).replace(VR(/^(xong|rồi|sáng|trưa|tối)\s*/u), "");
      // (01/11 vòng 24: "ăn cơm xong buồn ngủ / mệt / đau bụng" — phần sau là cảm giác SAU khi ăn, không phải tên món)
      const f = food && !VR(/^(với|cùng|ở|tại|rồi|cái|một)/u).test(food) && !VR(/(?<![\p{L}])(xong|buồn ngủ|buồn|mệt|đau|khó chịu|đầy bụng|no quá|buồn nôn|ói|nôn|chóng mặt|ngứa)(?![\p{L}])/u).test(food) ? food : "";
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
      text: VR(/nhạc|podcast/).test(m[0]) ? pick(["Nghe nhạc thư giãn ghê 🎧 Bài nào đang làm bạn mê vậy?", "Nhạc hay là cuộc sống tươi liền ha 🎶 Bạn đang nghe thể loại nào vậy?"]) : pick(["Xem gì vậy bạn 🍿 Phim hay thì kể Lomi nghe với!", "Nghe là thấy chill rồi 😄 Phim gì vậy, hay không?"]),
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
      const place = tail(s, VR(/(đang|vừa|mới) (ở|tới|đến|về|đi)( tại)? /u));
      if (VR(/đà lạt|da lat|dalat/i).test(place)) return { text: pick(["Đà Lạt hả 🌲 Trời se lạnh dễ chịu ha! Muốn Lomi gợi ý quán cà phê hay chỗ ăn gần bạn không?", "Ở Đà Lạt thích ghê 🌸 Nhớ mang áo khoác nha. Cần tìm quán gì Lomi tìm giúp liền!"]), quick: ["Tìm quán cà phê gần đây", "Tìm quán ăn gần mình"] };
      return { text: place ? pick([`Ở ${place} hả, nghe vui đó 😄 Bạn đi chơi hay làm việc vậy?`, `${cap(place)} à, thích ghê 🌿 Đang ở đó làm gì vậy bạn?`]) : "Ừa nghe vui đó 😄 Kể Lomi nghe thêm đi!" };
    },
  },
  {
    id: "free",
    re: W("(đang |đỡ |khá |hơi )?rảnh( rỗi| quá| lắm| nè| ghê)?|không có gì làm|chả có gì làm|(không|chẳng|chả|ko|k) có việc gì (để )?làm|(không|chưa|chả|chẳng|ko|hông) biết làm gì|nhàn quá|thừa thời gian"),
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
    re: W("(vừa|mới) (trúng|được|đậu|đỗ|nhận|thắng|lên)( \\p{L}+)*( số| giải| lương| chức| việc| điểm| tiền| học bổng| đại học| phỏng vấn)|trúng số|đậu (đại học|phỏng vấn|rồi)|được (tăng lương|thăng chức|nhận việc|điểm cao|khen)|(vừa |mới )sinh (em bé|con trai|con gái|con|bé)|sinh em bé rồi"),
    reply: () => ({ text: pick(["Wow chúc mừng bạn nha 🎉🥳 Tin vui vậy là phải ăn mừng chút xíu rồi! Kể Lomi nghe chi tiết đi nào!", "Hay quá trời luôn 🎊 Lomi vui lây nè! Bạn định ăn mừng thế nào vậy?"]) }),
  },
  {
    // "a đang chán", "chán quá" — hỏi thăm một câu, không đẩy dịch vụ.
    id: "bored",
    re: W("(đang |hơi |thấy |cảm thấy )?(chán|buồn chán|nhàm chán|nhạt)( quá| ghê| lắm| thật| thiệt| vãi| ghê á| xỉu| kinh)?"),
    reply: () => ({ text: pick(["Chán hả 😶 Có chuyện gì làm bạn chán vậy, hay chỉ là hôm nay hơi nhạt thôi?", "Ui, chán thiệt ha 🥱 Hôm nay của bạn có gì không vui hả?"]) }),
  },
  {
    id: "happy",
    re: W("vui( quá| lắm| ghê| thật| vl| vãi| lắm luôn)?|hạnh phúc|phấn khích|hào hứng|yêu đời|tâm trạng tốt|happy"),
    reply: () => ({ text: pick(["Nghe bạn vui là Lomi vui lây liền 😆 Có chuyện gì hay kể Lomi nghe với!", "Yay 🎉 Giữ năng lượng này cả ngày nha! Chuyện gì làm bạn vui vậy nè?"]) }),
  },
  {
    id: "weather",
    re: W("trời (đẹp|xanh|trong|quang)|(trời )?(mưa|nắng|gió|lạnh|nóng|oi|mát|rét|sương mù|nồm)(?! (lùng|nhạt|lẽo|tanh|ruột|lòng|tính|nảy|giận|mặt))( to| lớn| nhỏ| dữ| quá| ghê| lắm| nè| rồi| rả rích| phùn| cả ngày| hoài)*"),
    reply: (m) => {
      const k = (m[0].match(VR(/đẹp|xanh|trong|quang|mưa|nắng|gió|lạnh|nóng|oi|mát|rét|sương mù|nồm/u)) ?? [""])[0];
      const t: Record<string, string[]> = {
        "mưa": ["Mưa hả 🌧️ Ra đường nhớ mang áo mưa nha. Ngồi quán cà phê nghe mưa cũng chill lắm đó ☕", "Trời mưa dễ làm lòng người chùng xuống ghê 🌧️ Pha ly trà nóng cho ấm nha. Bạn đang ở nhà hay ở ngoài vậy?"],
        "nắng": ["Nắng vậy nhớ che chắn, uống nhiều nước nha ☀️ Ra đường nhớ thoa kem chống nắng đó!"],
        "lạnh": ["Lạnh thì mặc ấm, uống chút gì nóng nha 🧣 Trời lạnh là hợp ăn lẩu nướng lắm đó 🍲"],
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
      const slow = VR(/ế|vắng|ít khách|không có khách|chưa có khách|lỗ|chậm|hết khách/).test(s);
      return {
        text: slow
          ? pick(["Nghe vắng khách là thấy lo thiệt 🥺 Một cách hay là tạo ưu đãi nhỏ đúng giờ vắng để kéo khách. Bạn kinh doanh gì để Lomi gợi ý ý tưởng nha?", "Quán có giờ đông giờ vắng là chuyện thường gặp 😊 Mình thử ưu đãi theo khung giờ xem sao nha. Bạn bán gì vậy?"])
          : pick(["Đông khách là tin vui rồi 🎉 Nhớ giữ chất lượng để khách quay lại nha. Bạn muốn Lomi gợi ý cách giữ khách quen không?", "Hay quá, buôn may bán đắt 💪 Muốn Lomi gợi ý thêm cách tăng khách vào giờ vắng không?"]),
        quick: ["Làm sao hút khách lúc vắng?", "Làm sao giữ khách quen?"],
      };
    },
  },
];

// Phần đứng trước trạng thái chỉ gồm từ đệm, gọi trống, thời gian, nơi chốn chung — tức là trạng thái mở đầu câu.
const LEAD_ONLY = VR(/^((trời|thời tiết|ngoài kia|ngoài đường|ngoài|hôm nay|bữa nay|nay|cuối tuần|tuần này|bây giờ|giờ|lúc này|sáng|trưa|chiều|tối|đêm|khuya|ở đà lạt|đà lạt|ở đây|dạo này|mấy nay|e|em|lomi|ơi|ui|ôi|ủa|sao|mà|đang|vừa|mới|hơi|thấy|cảm thấy|lại|cũng|vẫn|a|anh|chị|mình|tui|tôi|tớ)\s+)*$/u);

/** Câu "a thích em / a yêu e" → Lomi thân thiện nhưng rõ mình là robot (không tình tứ). */
const LOVE_LOMI = VN(/^(a|anh|chị|c|mình|tui|tôi|t)\s+(thích|yêu|thương|nhớ|mê)\s+(em|e|lomi|bạn)(\s+(rồi|lắm|quá|đó|nha|nhé|nhe|nhiều|ghê))*$/);

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
    // 21/10 (QA V3): "nghiện chơi game, mất cả việc" — không phải đang chơi game cho vui.
    if (d.id === "gaming" && VR(/(?<![\p{L}])(nghiện|nghien|mất việc|mat viec|bỏ bê|bo be)(?![\p{L}])/u).test(s)) continue;
    // 21/10 (QA V2 Q77): "mà vẫn không thấy vui" — trạng thái bị PHỦ ĐỊNH ngay trước thì không phải đang vui / đang chán.
    if (VR(/(?<![\p{L}])(không|ko|k|chẳng|chả|hông|chưa|đâu có|kbh|hết)( (thấy|cảm thấy|còn|hề|được|bao giờ|bao h|bh|từng|có))*\s*$/u).test(s.slice(0, idx))) continue;
    // 27/11: mặt buồn ":((", "huhu" đi kèm thì không phải tin vui / đang vui.
    if ((d.id === "goodnews" || d.id === "happy") && VR(/(😭|🥲|😢|😞|:\(+|huhu|hic)/iu).test(raw)) continue;
    // 08/10: câu lược chủ ngữ chỉ nhận khi trạng thái đứng ĐẦU câu (trước nó chỉ có từ đệm / thời gian): "đói quá", "hôm nay mệt ghê".
    // "máy lạnh hư rồi", "điện thoại hết pin" có danh từ khác đứng trước → đang nói về đồ vật, không phải kể về mình.
    const lead = LEAD_ONLY.test(s.slice(0, idx));
    const okShort = !selfSub && words <= 6 && idx <= 12 && lead && !VR(/^(con|vợ|chồng|bạn|ông|bà|mẹ|ba|bố|cô|dì|chú|bác|anh ấy|chị ấy|nó)(?![\p{L}])/u).test(s);
    // "vắng/đông khách" có thể là chuyện quán của người khác — vẫn nhận (người dùng kể chuyện kinh doanh).
    // Thời tiết: nhận khi đứng đầu câu ("mưa quá", "hôm nay ở Đà Lạt lạnh ghê") — "máy lạnh inverter tiết kiệm điện" không phải kể thời tiết.
    // Chuyện buôn bán ("sáng đông khách lắm, chiều thì ế") nhận ở bất kỳ vị trí nào, nhưng phải thật sự nói về khách / quán / bán —
    // "điện thoại hết pin", "nhiều việc quá" có chữ "hết", "nhiều" mà không phải chuyện kinh doanh.
    const bizTalk = d.id === "biz_state" && VR(/(?<![\p{L}])(khách|đơn|doanh thu|quán|tiệm|bán|ế)(?![\p{L}])/u).test(s);
    if (d.id === "weather" ? lead : d.id === "biz_state" ? bizTalk : selfSub || okShort) {
      const r = d.reply(m, s);
      return { ...r, intent: `state:${d.id}`, talk: true };
    }
  }
  return null;
}


/** Hỏi thăm chính Lomi ("e có buồn không", "em mệt chưa") — Lomi là robot, đáp thật + hỏi lại người dùng. */
const ABOUT_LOMI = VN(/^(e|em|lomi|bạn)\s+(có\s+|đang\s+)?(buồn|vui|mệt|đói|khát|chán|nhớ|khoẻ|ổn|ngủ|thức|cười|khóc|giận|bực)\b.*\b(không|ko|chưa|k|hông|hong|hả|ha|à|a|nhỉ)$/);
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
  const n = normalizeVi(raw).replace(VR(/([aeiouy])\1+\b/g), "$1");
  const t = n.split(" ").filter(Boolean);
  if (!t.length || t.length > 7 || !GREET_WORDS.has(t[0])) return null;
  if (!t.slice(1).every((x) => GREET_FILL.has(x) || GREET_WORDS.has(x))) return null;
  const part = VN(/\bsáng\b/).test(n) ? "sáng" : VR(/\btrua\b/).test(n) ? "trưa" : VN(/\bchiều\b/).test(n) ? "chiều" : VN(/\btối\b/).test(n) ? "tối" : "";
  const newDay = VN(/ngày mới/).test(n);
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
const THIRD_SAY = VN(/\b(mẹ|má|ba|bố|cha|họ hàng|họ|người ta|mọi người|anh ấy|chị ấy|cô ấy|ông ấy|bà ấy|vợ|chồng|ck|vk|người yêu|ny|bạn (tôi|mình|em)|sếp|thầy|cô giáo|đồng nghiệp|bà con|cả nhà)( \S+){0,4} (hiểu|hỏi|nói|lặp)\b/);
const META: [string, RegExp, string[]][] = [
  [
    "meta_addr",
    VN(/\b(sao (lại |cứ )?(gọi|xưng) (a|anh|chị|c|em|e|mình|tôi|tui)|a chứ sao|anh chứ sao|xưng hô|gọi sai|sai (xưng|gọi))\b|^(a|anh|chị|c) (chứ|mà) sao (lại )?(e|em)\b/),
    ["Dạ xin lỗi, Lomi xưng hô chưa đúng ý rồi 🙏 Bạn cứ nói “gọi mình là anh” hay “gọi mình là chị” là Lomi đổi liền nha."],
  ],
  [
    "meta_understand",
    VN(/\b(hiểu (a|anh|chị|c|mình|tôi|tui|không|ko|chưa)( nói)?( gì)?|có hiểu|hiểu gì không|hiểu hông|hiểu hong|biết gì (không|ko)|chưa biết (hả|ha|à|a|sao)|chẳng biết gì|ngu (quá|vậy|thế)|đồ ngốc|ngớ ngẩn|dốt quá|không hiểu gì hết|sao cứ (bắt|hỏi)|bắt (mình|tôi|tui|a|anh) (hỏi|nói|viết) (hoài|mãi|quài|lại)|(hỏi|nói|lặp) (hoài|mãi|quài|đi lặp lại)(?! (mà )?(không|ko|chẳng|chả|chưa) (chịu )?nghe)|lặp lại|(sao )?(e|em|lomi|bạn) cứ (vậy|thế|như vậy|như thế) (hoài|mãi|quài)|cứ (vậy|thế) (hoài|mãi|quài))\b/),
    [
      "Dạ xin lỗi bạn, chắc Lomi hiểu chưa đúng ý 🙏 Lomi còn đang tập hiểu cách mọi người nói chuyện. Bạn thử nói ngắn một ý nha — chuyện sức khoẻ, tâm sự, tình cảm, bói bài hay dùng app — Lomi sẽ cố hết sức!",
      "Hic, Lomi xin lỗi vì chưa theo kịp bạn 🥲 Bạn nói lại bằng vài chữ ngắn gọn giúp Lomi nha. Lomi sẽ học dần để hiểu bạn hơn nha!",
    ],
  ],
  [
    // 30/10 (nhật ký bí: "chớ e biết cái gì") — hỏi Lomi biết làm gì → kể các mảng Lomi giúp được, không báo "chưa tiếp thu".
    "meta_know",
    VN(/^(chớ|chứ|vậy|thế|rồi|thế thì|vậy thì)? ?(e|em|lomi|bạn|cưng) (biết|làm được|giúp được|rành) (cái |những |những cái |được )?gì( (hả|ha|vậy|thế|không|ko|nào))?$|^(e|em|lomi) (biết|làm) được (những )?gì\b/),
    ["Lomi giúp được mấy chuyện này nè 😄\n• 🩺 Sức khoẻ: bệnh, triệu chứng, thuốc, ăn uống theo bệnh, vitamin, calo — có nguồn y khoa\n• 💚 Tâm sự: buồn, áp lực, tình cảm, gia đình\n• 🍜 Ăn gì, đi đâu, tìm quán & ưu đãi trong app\n• 🃏 Bói bài Tarot cho vui\n• 📱 Chỉ cách dùng app\nBạn muốn bắt đầu từ chuyện nào?"],
  ],
  [
    // 30/10: "tháng này em có tiền không" — hỏi chuyện tương lai (không có chữ "bói") → nói thật không ai đoán chắc được, mời bói cho vui.
    "fortune_ask",
    VN(/\b(tháng này|năm nay|tuần này|sắp tới|năm sau|năm tới|tháng sau|tháng tới|mai mốt|sau này)\b( \S+){0,3} (có tiền|có lộc|giàu|phát tài|trúng số|trúng xổ số|có người yêu|có bồ|có ny|lấy chồng|lấy vợ|thăng chức|đổi đời|may mắn)( \S+)? (không|ko|k|hông|hong|chưa|hả|ha)\b/),
    ["Chuyện tương lai thì không ai đoán chắc được đâu 😄 Nhưng nếu muốn cho vui, Lomi rút bài Tarot xem thử nha — bạn gõ “bói bài” kèm câu hỏi, ví dụ “bói bài tháng này em có tiền không”."],
  ],
  [
    // 30/10 — tiếng lóng hay gặp (trước đây "chưa hiểu ý")
    "slang_toang",
    VN(/^(toang|toang rồi|toang thật|toang thật rồi|toang luôn|hỏng hết rồi|hỏng hết|tiêu rồi|xong đời|xong phim)( (á|à|ạ|nha|luôn|thiệt|thật|mất|rồi))*$/),
    ["Toang hả 😅 Chuyện gì vậy bạn, kể Lomi nghe thử — biết đâu còn cứu được!"],
  ],
  [
    "slang_chill",
    VN(/^(chill|chil|chill thôi|chil thôi|chill chill|chil chil|chill đi|chil đi|thư giãn thôi|relax|chill nha|chil nha)( (á|à|nha|nhé|thôi|đi))*$/),
    ["Chill chill 😎 Thả lỏng chút cho đầu óc nhẹ nhàng nha. Cần Lomi gợi ý quán cà phê view đẹp để chill không?"],
  ],
  [
    "slang_laugh",
    VN(/^(xỉu|xỉu up xỉu down|xỉu ngang|xỉu dọc|cười xỉu|cười đau bụng|hài xỉu|hết nước chấm|cười ẻ|ối dồi ôi|ôi dồi ôi|trời đất ơi|má ơi|trời ơi đất hỡi)( (luôn|á|à|nha|thiệt|thật|ơi))*$/),
    ["Haha gì mà dữ vậy 😆 Kể Lomi nghe với, cho Lomi cười ké!"],
  ],
  [
    "slang_deal",
    VN(/^kèo (này |đó |nay )?(thơm|ngon|thơm phức|thơm quá|ngon ăn|hời)( (quá|ghê|lắm|nha|á))*$/),
    ["Kèo thơm hả 😆 Kèo gì vậy, kể Lomi nghe chung vui với!"],
  ],
  [
    // 30/10 — Đà Lạt: thời tiết, mặc gì, đi đâu (app của cộng đồng Đà Lạt; trước đây "chưa được học").
    "dalat_weather",
    VN(/\b(đà lạt|dalat|đà lạc)\b.*\b(lạnh|nóng|mưa|thời tiết|nhiệt độ|mặc gì|mặc sao|mang gì|đem gì|áo khoác)\b|\b(lạnh|thời tiết|mặc gì|mang gì|đem gì)\b.*\b(đà lạt|dalat)\b/),
    ["Đà Lạt mát quanh năm, sáng sớm và tối se lạnh, có hôm khá lạnh — nhớ mang **áo khoác**, khăn mỏng; đi xe máy thì thêm găng tay 🧥 Mùa mưa thường khoảng từ tháng 5 tới tháng 10, hay mưa chiều nên mang áo mưa / dù nha.\n\nMuốn tìm quán ăn, cà phê, chỗ chơi thì vào **Khám phá** (/kham-pha) hoặc nói Lomi “tìm quán cà phê view đẹp” nha!"],
  ],
  [
    "dalat_where",
    VN(/\b(đà lạt|dalat)\b.*\b(chơi đâu|đi đâu|ở đâu|ăn gì|ăn đâu|có gì chơi|có gì vui|điểm nào|chỗ nào)\b|\b(chơi đâu|đi đâu|ăn gì)\b.*\b(đà lạt|dalat)\b/),
    ["Ở Đà Lạt muốn ăn, uống, chơi thì Lomi gợi ý theo các quán trong cộng đồng iLomi nè 🌲 Vào **Khám phá** (/kham-pha) xem theo khu vực, hoặc nói Lomi cụ thể kiểu “tìm quán lẩu”, “cà phê view đẹp”, “homestay” là Lomi tìm liền!"],
  ],
  [
    // "đi đường cẩn thận nha" — lời chào / dặn dò, không phải câu hỏi.
    "meta_care",
    VN(/^((đi|về|chạy xe|lái xe) )?(đường )?(cẩn thận|cẩn thẩn)( (nha|nhé|nhe|nghen|đó|nhá|á))*$|^đi đường cẩn thận\b/),
    ["Dạ cảm ơn bạn nha 😊 Bạn cũng vậy, đi đâu nhớ cẩn thận, giữ sức khoẻ nè!"],
  ],
];
const VOCATIVE_ONLY = VR(/^(e|em|lomi|anh|chi|a|c|ban|oi|alo|ê|mn|moi nguoi|ca nha)( (oi|ơi|a|ạ|ne|nè|nhe|nha))*$/);
// Chỉ gõ tên một chủ đề Lomi rành ("sức khoẻ", "tình cảm") → mời nói cụ thể, không báo "chưa tiếp thu".
const TOPIC_ONLY: [RegExp, string][] = [
  [VN(/^(về |chuyện |vấn đề )?(sức khoẻ|bệnh tật)( (ạ|à|a|nha|nhé|nhe|đi|nè))?$/), "sức khoẻ"],
  [VN(/^(về |chuyện |vấn đề )?(tâm lý|tâm lí|tâm sự)( (ạ|à|a|nha|nhé|nhe|đi|nè))?$/), "tâm lý"],
  [VN(/^(về |chuyện |vấn đề )?(tình cảm|tình yêu|chuyện tình)( (ạ|à|a|nha|nhé|nhe|đi|nè))?$/), "tình cảm"],
  [VN(/^(về |chuyện |vấn đề )?(công việc|gia đình|học hành|tiền bạc)( (ạ|à|a|nha|nhé|nhe|đi|nè))?$/), "chuyện này"],
];

const REACTION = VN(/^(buồn cười|mắc cười|hài|hài hước|vui|dễ thương|đỉnh|xịn|ghê|kỳ|lạ|hay|tuyệt|ngầu|chất|chà|chu choa|chu cha|oa|wow|ủa|ui|ôi)( (chà|ghê|quá|thật|thiệt|vậy|dữ|vãi|luôn|á|à|a|hả|ha|nha|ta|trời|lắm|thế|nè))*$/);
// ── Đáp lời KỂ TIẾP: bám vào điều vừa kể (vui / xui / một mẩu chi tiết) thay vì một câu mẫu cố định ──
const TALK_POS = W("vui|đã ghê|đã quá|thích|ngon|đẹp|được thưởng|được khen|được nghỉ|được tăng|thắng|trúng|xịn|tuyệt|phê|chill|đỉnh|may|ổn|khoẻ|rẻ|hời|lời|đậu|đỗ|khen|thưởng|tăng lương");
// Từ hay gặp trong câu KỂ TIẾP ("câu được mấy con cá to") — đủ để biết là đang kể, nhưng chưa đủ để nói đó là chuyện vui.
const TALK_MORE = W("đã|to|nhiều|được");
const TALK_NEG = W("quát|ăn vạ|tội lỗi|hối hận|áy náy|ngại|không quen|như cái máy|kiệt sức|không vào|một mình|tự trách|cáu gắt|nổi nóng|cáu|quên|không ai|chẳng ai|chả ai|bị quên|bị bỏ|hết tiền|không có tiền|kẹt tiền|bắt nạt|ăn hiếp|mệt|chán|hư|hỏng|mất|trễ|thua|xui|tệ|dở|đau|buồn|bực|ế|kẹt|rớt|trượt|ốm|bệnh|khám|viện|lỗ|cãi|la|mắng|khóc|sợ|lo|giận|dỗi|ghét|lạnh nhạt|chia tay|thức khuya|mất ngủ|áp lực|stress|mổ|phẫu thuật|cấp cứu|tai nạn|chết|đám tang|giỗ|sảy thai|ung thư|uống thuốc|tiêm|chích thuốc|truyền nước|nhập viện|có lỗi|áy náy|hối hận|ân hận|tội lỗi|cắn rứt|lục đục|đứng yên|dậm chân|gánh hết|gánh|không còn thân|xa cách|xa lánh|cô lập|bỏ rơi|lạc lõng|thất vọng|hoang mang|làm phiền|phiền|làm quá|tích sự|vô dụng|vô ích|đuối|gồng|khổ|tức|ấm ức|tủi|bế tắc|tuyệt vọng|toang|không đủ|tự ti|kém cỏi|thất bại|nợ|đổ vỡ|ly hôn|ngoại tình|phản bội|tranh chấp|chia tài sản|xỉu|ngất|chóng mặt|run|hồi hộp|ngộp|lo âu|trầm cảm|cô đơn|sai|mắc lỗi|không ngừng|thất thường|im ru|im lặng|lạnh lùng|nặng nề|ngột ngạt|đè nén|so sánh|chê|bị từ chối|từ chối|nghỉ chơi|không phụ|chẳng phụ|bỏ mặc|thờ ơ|khó chịu|không ổn|sad|lonely|thấp thỏm|bồn chồn|la hét|đánh nhau|sợ về nhà|cần thời gian|bơ vơ|chới với|tired|stress|pressure|hopeless|broke up|breakup|ghosted|anxious|depressed|burnout");
const ACT_STOP = new Set("với cùng ở tại rồi nè nha mà thì và hôm lúc xong về cho để nên quá lắm ghê luôn á ạ nhưng mới vừa đang mấy nhiều hoài suốt nữa đó".split(" "));
/** Việc vừa kể: "hôm qua anh đi câu cá với mấy đứa bạn" → "đi câu cá" (động từ + tối đa 3 từ, dừng ở từ nối). */
function echoAct(s: string): string {
  const m = s.match(VR(/(?<![\p{L}])(đi|chơi|xem|coi|ăn|uống|mua|làm|học|gặp|ghé|nấu|tập|chạy|đá|leo|bơi|dọn|sửa|bán|thi|nhận|trồng)\s+([\p{L}\d ]+)/u));
  if (!m) return "";
  // 31/10: "chẳng làm được tích sự gì" — có phủ định đứng ngay trước động từ thì nhắc lại sẽ thành nghĩa ngược ("Làm được tích sự hả") → không nhắc.
  if (NEG_TAIL.test(s.slice(0, m.index))) return "";
  const out: string[] = [];
  for (const w of m[2].split(/\s+/)) {
    if (!w || ACT_STOP.has(w) || out.length >= 3) break;
    out.push(w);
  }
  return out.length ? `${m[1]} ${out.join(" ")}` : "";
}
// Từ mở đầu của một câu kể tiếp lược chủ ngữ: từ nối, phó từ, động từ thường gặp — không phải một danh từ / tên riêng mới.
const CONT_HEAD = new Set("xong roi sau ma tai vi nen voi con luc hoi toi den ve di an uong choi ngoi nam ngu lam mua gap thay duoc bi co khong chua dang moi vua cung lai toan chi ca het them nhung ai ngo ai de o".split(" "));
/** Đang nghe kể: tin này có phải KỂ TIẾP không (để đáp theo mạch thay vì coi là câu độc lập). */
export function isTalkCont(raw: string): boolean {
  const s = low(raw);
  const t = trimLead(tokens(raw)); // bỏ "hôm qua", "sáng nay"… ở đầu rồi mới xét
  if (!t.length || isAskLike(raw)) return false;
  return isPersonalTalk(raw) || t.length <= 3 || TALK_POS.test(s) || TALK_MORE.test(s) || TALK_NEG.test(s) || CONT_HEAD.has(t[0]);
}
// 11/10: từ vui đứng ngay sau phủ định ("mà sếp không khen", "chẳng vui gì") là điều KHÔNG có — không phải chuyện vui để mừng "Quá xịn luôn 😄".
// (23/10: "không còn thấy vui" — cho phép tới 2 chữ giữa từ phủ định và từ vui; trước đây đáp "Thích vậy trời 🤩")
// (27/11: "a chưa bao giờ thấy hạnh phúc" — phủ định cách 3 chữ)
const NEG_TAIL = VR(/(?<![\p{L}])(không|ko|k|chưa|chẳng|chả|hổng|hông|đâu có|khong|chua|chang|hok|hết)\s+(?:\S+\s+){0,3}$/iu);
function negatedPos(s: string): boolean {
  const m = TALK_POS.exec(s);
  // 27/11: "chưa bao giờ vui NHƯ hôm nay", "chưa từng thấy ngon BẰNG" là so sánh — vui nhất, không phải phủ định.
  if (m && VR(/^\s*(như|bằng|hơn|đến vậy|tới vậy|cỡ này)(?![\p{L}])/u).test(s.slice(m.index + m[0].length))) return false;
  return !!m && NEG_TAIL.test(s.slice(0, m.index));
}
/** Câu kể vui / nhẹ nhàng (không có dấu hiệu buồn, mệt, xui) — để chuyện vui không bị đọc thành tâm sự nặng nề. */
export function isUpbeat(raw: string): boolean {
  const s = low(raw);
  return !TALK_NEG.test(s) && !negatedPos(s) && !VR(/(😭|🥲|😢|😞|:\(+|huhu|hic)/iu).test(raw) && !isAskLike(raw);
}
/** sober = đang nói chuyện không vui của một người (Lomi vừa đáp bằng giọng chia sẻ) → lời đáp ngắn không kèm mặt cười. */
export function talkContinue(raw: string, depth: number, sober = false, lastText = "", mirror: string | null = null): SenseReply {
  const s = low(raw).replace(/[.!…,]+$/u, "");
  const words = s.split(/\s+/).filter(Boolean);
  const neg = TALK_NEG.test(s) || negatedPos(s) || VR(/(😭|🥲|😢|😞|:\(+|huhu|hic)/iu).test(raw);
  const pos = !neg && TALK_POS.test(s);
  // Mẩu chi tiết ngắn ("xe máy", "ở Đà Lạt") → nhắc lại đúng mẩu đó cho thấy Lomi theo kịp.
  // (chữ "bạn" trong mẩu nhắc lại là NGƯỜI BẠN của người dùng — viết "bạn bè" để lúc hiển thị không bị đổi thành anh / chị)
  //   (bỏ từ tự xưng ở đầu — "a ăn với vợ" → "Ăn với vợ hả" — vì đây là lời Lomi nhắc lại.)
  const fw = VR(/^(a|anh|c|chị|e|em|mình|tui|tôi|tớ)$/).test(words[0] ?? "") ? words.slice(1) : words;
  const frag = words.length <= 4 && fw.length >= 1 && !neg && !pos ? `${cap(fw.join(" ").replace(VR(/(?<![\p{L}])bạn(?![\p{L}])(?! (bè|thân|gái|trai))/gu), "bạn bè"))} hả 😄` : "";
  const ack = neg
    ? pick(["Ui, nghe mà thương ghê 🥺", "Hic, vậy thì khó chịu thiệt ha.", "Trời, tội ghê 😣"])
    : pos
      ? pick(["Nghe đã ghê 😆", "Quá xịn luôn 😄", "Thích vậy trời 🤩"])
      : frag
        ? `${frag} ${pick(["Ra là vậy.", "À à."])}`
        : sober
          ? // 12/10: đang nghe chuyện không vui mà chỉ đáp "Vậy hả…" là câu cụt — có mẩu nhắc lại điều vừa nghe thì nhắc lại đúng điều đó.
            mirror
            ? `${cap(mirror)} hả 😔 ${pick(["Lomi hiểu.", "Nghe là thấy mệt rồi."])}`
            : pick(["Vậy hả…", "Ừm, ra vậy.", "Lomi nghe nè."])
          : pick(["Ra là vậy 😄", "À, vậy hả 😮", "Ồ, vậy luôn 😄"]);
  // Lượt lẻ hỏi nối một câu; lượt chẵn chỉ đáp lại — không phải câu nào cũng kết bằng "kể thêm đi".
  const tailQ =
    depth % 2 === 1
      ? // Lomi vừa mời "kể … nghe với" và người dùng đang kể rồi thì không hỏi lại "có chuyện gì vậy" lần nữa.
        VR(/kể \S+ nghe với/).test(lastText)
        ? neg || sober
          ? "Rồi giờ sao rồi bạn?"
          : "Rồi sao nữa nè?"
        : pick(neg || sober ? ["Rồi giờ sao rồi bạn?", "Có chuyện gì vậy, kể Lomi nghe với."] : ["Rồi sao nữa nè?", "Kể tiếp đi, Lomi đang nghe nè."])
      : depth >= 4
        ? "Nghe bạn kể mà Lomi thấy như được đi cùng luôn."
        : "";
  return { intent: "continue", talk: true, text: [ack, tailQ].filter(Boolean).join(" ") };
}

const CLOSER = VN(/^(thôi|vậy thôi|thôi vậy|thế thôi|thôi kệ|kệ đi|thôi kệ đi|kệ nó|không có gì|ko có gì|không sao|không sao đâu|vậy hả|vậy à|thế à|thế hả|ừ thì|u thi|thì thôi|chịu|chịu thôi|bỏ đi|thôi bỏ đi|sao cũng được|gì cũng được|tuỳ|để sau|để sau đi|lúc khác|thôi để sau|biết rồi|hiểu rồi|ra vậy|ra là vậy|có vậy thôi)( (nha|nhé|nhe|nè|ạ|à|a|e|em|lomi|đi|hả|ha|vậy|mà|luôn|thôi))*$/);
// Dấu hiệu "đang kể chuyện của mình" — đọc theo CẤU TRÚC, không theo danh sách câu:
//  • có người kể (tôi/mình/anh/chị/em… — chữ có dấu để "tối" không lẫn "tôi"; không dấu thì xét từ đầu câu),
//  • nhắc người thân / người trong chuyện (mẹ, vợ, sếp, người yêu, anh ấy…),
//  • từ cảm xúc / cảm nhận (thấy, buồn, vui, mệt, lo, nhớ…) hoặc biểu cảm buồn,
//  • câu lược chủ ngữ mở đầu bằng từ chỉ việc đang / vừa / chưa làm ("mới ngủ dậy nè", "chưa ngủ mà").
const TALK_SELF = W("tôi|mình|tui|tớ|tao|anh|chị|em|tụi mình|bọn mình|nhà mình|tụi em|tụi anh");
const TALK_PEOPLE = W("mẹ|má|bố|ba mẹ|vợ|chồng|con trai|con gái|con mình|bạn thân|bạn trai|bạn gái|bạn mình|sếp|người yêu|ny|crush|bồ|anh ấy|chị ấy|cô ấy|nó|tụi nó|đồng nghiệp|khách");
const TALK_FEEL = W("thấy|cảm thấy|cảm giác|buồn(?! cười| ngủ| nôn)|vui|mệt|chán|lo|sợ|tức|bực|nhớ|thương|ghét|thích|ngại|hồi hộp|áp lực|stress|khó chịu|thoải mái|tủi|cô đơn|hạnh phúc|tiếc|hối hận");
const TALK_ASPECT = new Set(["moi", "vua", "dang", "chua", "sap", "dinh", "lai", "van", "muon", "them", "bi"]);
export function isPersonalTalk(raw: string): boolean {
  const s = low(raw);
  if (hasSelfSubject(raw) || TALK_SELF.test(s) || TALK_PEOPLE.test(s) || TALK_FEEL.test(s)) return true;
  if (VR(/(😭|🥲|😢|😞|🥺|:\(+|huhu|hic)/iu).test(raw)) return true;
  const t = trimLead(tokens(raw));
  return t.length >= 2 && TALK_ASPECT.has(t[0]);
}

/** Lưới cuối. Trả null = đây là câu HỎI KIẾN THỨC Lomi chưa có → để Lomi nói "chưa tiếp thu" + nút Dạy Lomi. */
// 20/10 (audit): đã làm / đã thử mà KHÔNG ĐƯỢC ("a làm theo rồi mà không được", "cài lại vẫn chưa được") — câu báo trục trặc, không phải chuyện vui.
const FAILED = VN(/\b(mà|nhưng|vẫn|cũng|rồi) (vẫn |cũng )?(không|ko|k|chưa|chẳng|chả) (được|đc|dc|ăn thua|xong|chạy|vào|lên|hiện|ra|nhận)\b/);
const TRIED = VN(/\b(làm theo|làm rồi|thử rồi|thử lại|làm lại|cài lại|bấm rồi|bấm hoài|nhập rồi|đăng nhập lại|tải lại|làm y chang|làm đúng)\b/);
export function senseLate(raw: string, ctx: { lastText?: string; talk?: number; mirror?: string | null; /** Bộ đọc câu (lib/lomiParse) thấy câu mang nghĩa tiêu cực. */ neg?: boolean } = {}): SenseReply | null {
  const n = normalizeVi(raw);
  if (!n) return null;
  const words = n.split(" ").length;
  const g = senseGreeting(raw) ?? senseAboutLomi(raw);
  if (g) return g;
  for (const [intent, re, texts] of META) {
    // 12/11 (bộ 1.000 câu G02-044, G04-091): "họ hàng hỏi hoài chuyện ck con", "làm sao nói để mẹ hiểu mình" là chuyện với NGƯỜI KHÁC,
    //   không phải chê Lomi; và câu đầu cuộc trò chuyện thì chưa có gì để Lomi "hiểu sai".
    if (intent === "meta_understand" && THIRD_SAY.test(` ${n} `)) continue;
    if (re.test(n)) return { intent, text: pick(texts) };
  }
  // Chỉ gọi trống ("anh", "em ơi", "lomi") — đáp "dạ", mời nói tiếp.
  if (VOCATIVE_ONLY.test(n))
    return { intent: "vocative", text: pick(["Dạ, Lomi nghe nè 🙋 Bạn cần gì nè?", "Dạ? Có Lomi đây 😊 Bạn nói đi nha!", "Dạ bạn nói đi, Lomi nghe nè 👂"]) };
  for (const [re, label] of TOPIC_ONLY)
    if (re.test(n)) return { intent: "topic", text: `Bạn muốn nói về ${label} hả 😊 Bạn đang gặp chuyện gì, kể Lomi nghe cụ thể hơn chút nha.` };
  const ask = isAskLike(raw);
  // Câu hỏi cụt, không rõ nói về gì ("thiệt không?", "sao vui á?") → hỏi lại một câu ngắn, không đoán.
  if (ask && words <= 4 && !VN(/\b(là gì|có gì|ở đâu|bao nhiêu|khi nào)\b/).test(n))
    return {
      intent: "askback",
      text: ctx.lastText
        ? pick(["Bạn đang hỏi về chuyện nào vậy nè? Nói rõ thêm chút giúp Lomi nha 😅", "Lomi chưa theo kịp ý bạn 🙈 Bạn nói rõ hơn một chút được không?"])
        : pick(["Bạn hỏi về chuyện gì vậy nè? Nói thêm chút xíu là Lomi hiểu liền 😊", "Lomi chưa chắc hiểu ý bạn 😅 Bạn nói rõ thêm giúp Lomi nha?"]),
    };
  if (ask) return null; // câu hỏi kiến thức Lomi chưa có → "chưa tiếp thu" + nút 💡 Dạy Lomi
  // Tiếng cảm thán / phản ứng ngắn ("chà chà", "buồn cười ghê", "đỉnh thật") = từ cảm thán + từ nhấn → hỏi nối, không báo "chưa tiếp thu".
  if (words <= 4 && REACTION.test(n)) return { intent: "reaction", talk: true, text: pick(["Hihi 😄 Có chuyện gì vậy, kể Lomi nghe với!", "Hửm, có gì hay hả? 👀 Kể Lomi nghe nha!"]) };
  // Lời khép lại / cho qua ("thôi kệ đi", "vậy thôi", "không có gì") → đáp nhẹ, không hỏi dồn.
  if (CLOSER.test(n)) return { intent: "closer", text: pick(["Okie nè 😊 Khi nào cần thì cứ gọi Lomi nha.", "Dạ 🌿 Lomi vẫn ở đây, bạn muốn nói gì cứ nói nha."]) };
  // 08/10: CHỈ lắng nghe khi nhận ra đây là lời kể chuyện của người dùng (có người kể / người thân / cảm xúc / việc đang làm).
  // Câu không nhận ra được gì ("bitcoin hôm nay lên 100k", "asdf qwer") thì trả null — nói thật là chưa hiểu, ghi vào
  // "Lomi bí" và hiện nút 💡 Dạy Lomi, chứ không giả vờ "Lomi nghe nè".
  // 08/10: Lomi ĐANG nghe kể (tin trước là lời "nghe kể") → tin này là kể tiếp: đáp theo nội dung vừa kể rồi mới (đôi khi) hỏi nối,
  // không coi là câu độc lập để báo "chưa tiếp thu", và không lặp "kể thêm cho Lomi nghe" ở mọi lượt.
  // Vẫn phải nhận ra đây là lời kể (có người kể / cảm xúc / mẩu chi tiết ngắn / câu nối "xong…", "rồi…", "mà…");
  // một câu dài nói chuyện khác hẳn ("bitcoin hôm nay lên 100k") thì không giả vờ hiểu.
  if (ctx.talk && isTalkCont(raw)) return talkContinue(raw, ctx.talk, /🥺|😔|😣/u.test(ctx.lastText ?? ""), ctx.lastText ?? "", ctx.mirror ?? null);
  // Đã làm theo mà vẫn không được, không rõ đang làm việc gì → hỏi đúng chỗ kẹt (không nhắc lại "làm theo hả 😄").
  if (FAILED.test(` ${n} `) && TRIED.test(` ${n} `) && words <= 12)
    return { intent: "clarify", text: "Làm rồi mà vẫn chưa được hả 😣 Bạn đang làm việc gì, kẹt ở bước nào hay hiện thông báo gì? Kể Lomi nghe để Lomi chỉ tiếp nha." };
  // 22/11 (câu thật: "Dạo này thấy trong người không ổn lắm.") — "trong người" có thể là sức khoẻ hay tâm trạng → hỏi đúng hai hướng
  if (VN(/\b(trong người|người) (không|chẳng|hông|k) (ổn|khoẻ|khỏe|được khoẻ|thoải mái)|thấy (trong người|người) (sao sao|kì kì|kỳ kỳ|lạ lạ|mệt mệt)\b/).test(` ${n} `))
    return { intent: "clarify", text: "Không ổn kiểu nào nè bạn 🥺\n• **Mệt trong người** — đau, sốt, chóng mặt, mất ngủ, ăn không ngon…? Kể Lomi nghe triệu chứng, bị bao lâu rồi\n• Hay **trong lòng nặng nề** — buồn, áp lực, chán chán? Lomi nghe nè\n\nCó dấu hiệu nặng như **đau ngực, khó thở, ngất, yếu nửa người** thì gọi **115** ngay nha." };
  // "híc", "hic hic" một mình → hỏi han, không bảo "chưa hiểu ý"
  if (VN(/^\s*(híc|hic|hix|huhu|hu hu|hức)( (híc|hic|hix|hu|hức))*\s*$/).test(` ${n} `))
    return { intent: "listen", talk: true, text: pick(["Híc, sao vậy nè 🥺 Có chuyện gì buồn hả? Kể Lomi nghe nha.", "Ơ, sao đó bạn 🥺 Lomi ở đây nè, có gì cứ kể."]) };
  if (words >= 2 && isPersonalTalk(raw)) {
    const s = low(raw);
    // 27/11: chữ vui bị phủ định ("chưa bao giờ thấy hạnh phúc", "hết vui rồi") là câu buồn, không chúc mừng.
    const negGlad = negatedPos(s);
    const sad = VR(/(😭|🥲|😢|😞|:\(+|huhu|hic)/iu).test(raw) || TALK_NEG.test(s) || !!ctx.neg || FAILED.test(` ${n} `) || negGlad;
    // 11/11 (bộ 1.000 câu — "Ghé chào bạn một hả 😄", "Chạy bộ hả 😄", "Ăn vô là cồn hả 🥺"): nhại một MẨU của câu dài nghe rất lạc,
    //   và 😄 đặt sau chuyện không vui thì vô duyên. Chỉ nhại khi câu ngắn (≤ 8 chữ); chỉ 😄 khi câu có ý vui.
    const act = words <= 8 ? echoAct(s) : null;
    const glad = !negGlad && VN(/\b(vui|thích|mừng|tuyệt|sướng|ngon|đẹp|được khen|tự hào|hạnh phúc|may quá|đã quá|xịn|phê)\b/).test(` ${n} `);
    return {
      intent: "listen",
      talk: true,
      text: sad
        ? act
          ? `${cap(act)} hả 🥺 Rồi có sao không bạn?`
          : pick(["Ừ, Lomi nghe nè 🥺 Chuyện sao vậy bạn?", "Lomi ở đây với bạn nè 💚 Chuyện này làm bạn thấy sao?"])
        : act
          ? glad
            ? pick([`${cap(act)} hả 😄 Rồi sao, kể Lomi nghe với!`, `Ồ, ${act} luôn hả 😄 Sao rồi nè?`])
            : `${cap(act)} hả? Rồi sao nữa, kể Lomi nghe với.`
          : glad
            ? pick(["Ui, nghe mà Lomi vui lây luôn á 🥳 Bạn làm được vậy là đáng tự hào lắm đó! Lúc đó bạn thấy sao?", "Tuyệt quá 🥰 Lomi mừng cho bạn ghê! Kể Lomi nghe thêm chút đi — chuyện vui thì nói bao nhiêu cũng được."])
            : pick(["Ừa, Lomi nghe nè. Rồi sao nữa bạn?", "Lomi nghe nè 🌿 Bạn kể thêm chút được không?"]),
    };
  }
  // Mẩu câu rất ngắn mà không nhận ra được gì ("quay lại", "tháng này") → hỏi lại một câu, vì chưa đủ ý để mà "bí".
  // (30/10: tiếng lóng ngắn — "toang rồi", "chill thôi" — có lời đáp riêng, không hỏi lại "ý bạn là sao")
  for (const [intent, re, texts] of META) if (intent.startsWith("slang_") && re.test(n)) return { intent, text: pick(texts) };
  // 25/11: gõ mỗi tên món ("phở", "bún bò") → hỏi muốn tìm quán hay xem cách nấu (trước: "Lomi chưa chắc hiểu ý bạn")
  const bd = !ctx.lastText ? bareDishReply(raw) : null;
  if (bd) return bd;
  if (words <= 3) return { intent: "clarify", text: pick(["Lomi chưa chắc hiểu ý bạn 😅 Bạn nói rõ thêm giúp Lomi nha?", "Ý bạn là sao ta 🤔 Bạn nói thêm chút xíu để Lomi hiểu nha."]) };
  return null;
}

/**
 * 08/10 — QUYẾT ĐỊNH CUỐI, gọi khi mọi luồng khác (xã giao, sức khoẻ, Tarot, món ăn, FAQ, câu đã dạy) đều không đáp được.
 * Thứ tự: senseState → senseLate. Có câu đáp ⇒ Lomi HIỂU, không ghi "Lomi bí", không hiện nút 💡.
 * Trả null ⇒ thật sự bí: lúc đó (và chỉ lúc đó) AiAssistant mới logUnanswered + gắn `unk`.
 * hasSuggest = câu nói về app và đã có gợi ý câu hỏi gần đúng → không dùng lưới "lắng nghe / hỏi lại" (đưa gợi ý tốt hơn).
 */
export function senseLast(raw: string, ctx: { lastText?: string; hasSuggest?: boolean; talk?: number; mirror?: string | null; neg?: boolean } = {}): SenseReply | null {
  // senseState đọc câu NGUYÊN VĂN (giữ :( và chữ kéo dài); senseLate đọc câu đã đổi teen code ("đc k" → "được không").
  return senseState(raw) ?? (ctx.hasSuggest ? null : senseLate(expandTeen(raw), { lastText: ctx.lastText, talk: ctx.talk, mirror: ctx.mirror, neg: ctx.neg }));
}

/** 25/11: câu chỉ có tên món ("phở", "bún bò", "trà sữa") → hỏi tìm quán hay xem cách nấu. null nếu không phải. */
export function bareDishReply(raw: string): SenseReply | null {
  const n = normalizeVi(raw);
  // (chỉ khi câu CHỈ có tên món: có chữ tìm / quán / ăn / đổi… là người dùng đã nói rõ muốn gì rồi)
  if (!n || n.split(" ").length > 3 || /\b(nau|lam|cach|cong thuc|che bien|tim|kiem|quan|tiem|an|uong|muon|them|doi|qua|cho|gan|di|o|mua|ban|order|ship|giao)\b/.test(n)) return null;
  const dd = detectDish(raw);
  if (!dd) return null;
  const nm = dd.name.split(/[,(]/)[0].trim();
  const lc = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
  const ck = dd.drink ? null : namedDish(raw);
  return {
    intent: "dish_bare",
    text: `**${nm.charAt(0).toUpperCase() + nm.slice(1)}** hả 😋 Bạn muốn Lomi tìm quán ${lc(nm)} quanh bạn${ck ? `, hay chỉ cách nấu ${lc(ck)} ở nhà` : ""} nè?`,
    quick: [`🔎 Tìm quán ${lc(nm)}`, ...(ck ? [`🍳 Cách nấu ${lc(ck)}`] : [])],
  };
}

// ── 27/11 — CHUYỆN MAY / KHÔNG MAY (Kir: "A chưa bh trúng số :((" bị đáp "Hay quá trời luôn 🎊… ăn mừng") ──────────────
// Một lớp riêng đọc hết các kiểu nói quanh "trúng số / đậu / rớt / tăng lương / thăng chức / được khen", chạy SỚM (sau lớp an toàn):
//   phủ định ("chưa bao giờ trúng", "không đậu"), hỏi vặn ("có trúng đâu", "làm gì có chuyện"), hụt ("trật 1 số", "suýt trúng"),
//   rớt / trượt, so với người khác ("ai cũng đậu chỉ có a rớt"), vui mà kèm chuyện buồn ("được tăng lương mà bị chuyển đi xa"),
//   ước / mong ("ước gì trúng số", "khi nào a mới được thăng chức") và tin vui thật ("cuối cùng a cũng trúng số").
// So trên câu KHÔNG DẤU (VN tự đối chiếu dạng có dấu) nên câu gõ không dấu / teen code cũng hiểu.
const LK_NEG = "(chưa|không|ko|k|kh|hk|hok|chẳng|chả|hông|hong|khum|chx|kbh|hổng|hem)";
const LK_FILL = "( (bao giờ|bao gio|từng|hề|có|được|đc|dc|còn|thể|mua|ai|lần nào|lần mô|nổi|kịp|xin))*";
const LK_EXAM = "(đậu|đỗ)(?= (đại học|cao đẳng|phỏng vấn|tốt nghiệp|nguyện vọng|rồi|nổi|luôn|nữa|môn|kỳ thi|kì thi|bằng|vào|trường|lớp|công chức|thạc sĩ|cấp 3|lần nào|bao giờ|thủ khoa|á khoa)\\b| *$)";
const LK_PRIZE = "(giải (nhất|nhì|ba|tư|khuyến khích|đặc biệt|độc đắc|gì)|đạt giải|được giải|vô địch|huy chương)";
const LK_GOOD = `(trúng (xổ số|vé số|số|thưởng|giải|vietlott|độc đắc|tờ nào|lần nào|lần mô)|trúng|tăng lương|thăng chức|lên chức|nhận việc|nhận vào làm|xin (được )?việc|được khen|khen|thưởng tết|thưởng|${LK_EXAM}|có việc làm|có việc(?! gì)|qua môn|qua phỏng vấn|may mắn|hên|gặp may|${LK_PRIZE})`;
// (chỉ khi câu nói RÕ vé số: "trật" một mình là trật khớp, "xịt" là thuốc xịt)
const LOTTO = VN(/\b(trúng (có )?(1|một|2|hai) (số|con số)|trật (có )?(1|một|2|hai) (số|con số)|trúng (xổ số|vé số|số|vietlott|độc đắc|tờ nào|\d+ ?(triệu|tr|trăm|nghìn|ngàn|k|tỷ|tỉ|củ))|vé số|xổ số|vietlott|dò số|độc đắc|(chục|mấy|\d+) tờ|tờ nào|(mua|dò)( \S+){0,5} (trật|xịt)|số (nhọ|đen|xui))\b/);
// Chữ tận cùng vô lý của câu mỉa ("a mà trúng số chắc trời sập", "… thì heo biết bay")
const LK_ABSURD = "(heo biết bay|lợn biết bay|trời sập|mặt trời mọc (đằng|hướng|ở) tây|tận thế|có mà mơ|nằm mơ|chuyện lạ|gà mọc răng|chó biết nói)";
const LK = {
  neg: VN(new RegExp(`\\b${LK_NEG}${LK_FILL} ${LK_GOOD}\\b`)),
  rhet: [
    VN(new RegExp(`\\b(có|đâu có|có bao giờ|làm gì có)( chuyện)?( \\S+){0,3} ${LK_GOOD}( \\S+){0,2} (đâu|bao giờ)\\b`)),
    VN(/\b(trúng|đậu|đỗ) đâu mà\b/),
    VN(new RegExp(`\\blàm gì có (chuyện )?(\\S+ ){0,2}${LK_GOOD}\\b`)),
    VN(new RegExp(`\\bđâu có ${LK_GOOD}\\b`)),
    // mỉa: "trúng cái nịt", "trúng số gì tầm này", "a mà trúng số chắc trời sập", "kiếp sau mới trúng", "mua bao nhiêu cũng trật"
    VN(/\btrúng (cái )?(nịt|con khỉ|cái đầu|cục cứt|cái gì|búa)\b/),
    VN(new RegExp(`\\b${LK_GOOD} gì (tầm này|nổi|mà|trời|đâu)\\b`)),
    VN(new RegExp(`\\b${LK_GOOD}( \\S+){0,3} (thì|chắc|là)( \\S+){0,2} ${LK_ABSURD}\\b`)),
    VN(new RegExp(`\\bkiếp sau( \\S+){0,3} ${LK_GOOD}\\b`)),
    VN(/\b(mua|dò|chơi|đánh|thi|nộp)( \S+){0,3} (bao nhiêu|mấy|hoài|cả đời|mỗi ngày|bao lần)( \S+){0,2} (cũng|vẫn) (trật|xịt|không trúng|chẳng trúng|chả trúng|rớt|trượt|tạch)\b/),
    VN(/\b(hoài|mãi|toàn) (không|chẳng|chả|hông|ko|k) trúng\b/),
  ],
  miss: [
    VN(/\b(suýt|xém|xíu nữa|tí nữa|hụt)( \S+)? trúng\b/),
    VN(/\b(trật|xịt|tạch|nhọ|đen|duyên âm|số đen|số nhọ)\b/), // (chỉ tính khi LOTTO — xem missed)
    VN(/\btrúng gió thì có\b/),
    VN(/\btrúng (có )?(1|một|2|hai) (số|con số)\b/),
  ],
  fail: VN(/\b(toàn|lại|cứ|hoài|liên tục|mấy lần) (thi )?(rớt|trượt|tạch)\b|\b(rớt|trượt|tạch) (hoài|mãi|suốt|hết|liên tục|mấy lần)\b|\b(nào|đâu|mô) cũng (rớt|trượt|tạch|bị loại|không đậu|không đỗ|bị từ chối)\b|\b(thi )?(rớt|trượt|tạch|bị loại|bị đánh rớt|bị đánh trượt)( \S+)?( (đại học|cao đẳng|phỏng vấn|tốt nghiệp|môn|nguyện vọng|kỳ thi|kì thi|bằng lái|công chức|vòng|cấp 3))|(^|\s)(thi )?(rớt|trượt|tạch|bị loại)( rồi| luôn| mất rồi| nữa| hoài| thật| thiệt)*$/),
  // "rớt / trượt" của đồ vật, giá cả, chân tay — không phải thi rớt
  failObj: VN(/\b(điện thoại|đt|đồ|ví|chìa khoá|chìa khóa|răng|tóc|lá|giá|vàng|xe|mạng|wifi|sóng|cân|ký|kg|hạng|rank|chân|tay|nước|hàng|cổ phiếu|coin|tiền ảo|chứng khoán|mưa)\b/),
  compare: VN(/\b(còn|chỉ có|chỉ mình|riêng|mỗi) (a|anh|em|e|mình|tui|tôi|t|tao|tớ)( thì| là)? (không|chưa|chẳng|chả|ko|k|bị|rớt|trượt|tạch|vẫn|lại|toàn)\b/),
  wish: [
    VN(new RegExp(`\\b(ước gì|ước|giá mà|giá như|mong|mong sao|cầu|cầu cho|cầu mong|mơ|mơ được|muốn|thèm|nếu)( \\S+){0,4} ${LK_GOOD}\\b`)),
    VN(new RegExp(`\\b(bao giờ|khi nào|chừng nào|tới bao giờ|đến bao giờ|bao h)( \\S+){0,3} (mới|được)( \\S+){0,2} ${LK_GOOD}\\b`)),
    VN(new RegExp(`\\bmà ${LK_GOOD}( \\S+){0,3} thì\\b`)),
  ],
  mixed: VN(/\b(mà|nhưng|nhưng mà|có điều|tiếc là|khổ nỗi)( \S+){0,2} (bị|không|chẳng|chả|mất|buồn|lo|xa|ít|chán|mệt|áp lực|sợ|tiếc|khó)\b/),
  lostAfter: VN(/\b(mà|nhưng|nhưng mà)( giờ| rồi| sau đó)? (mất hết|tiêu hết|hết sạch|mất sạch|thua hết|nướng hết|đốt hết|bay hết)\b/),
  pos: VN(new RegExp(`\\b(trúng (xổ số|vé số|số|thưởng|giải|vietlott|độc đắc|\\d+ ?(triệu|tr|trăm|nghìn|ngàn|k|tỷ|tỉ|củ))|được (tăng lương|thăng chức|nhận việc|nhận vào làm|thưởng|khen)|được( \\S+){1,2} (khen|thưởng|tăng lương)|tăng lương|thăng chức|lên chức|${LK_EXAM}|có việc làm|nhận việc|xin được việc|qua phỏng vấn|qua môn|${LK_PRIZE})\\b`)),
  past: VN(new RegExp(`\\b(hồi xưa|hồi trước|ngày xưa|năm (ngoái|xưa|trước|đó)|có lần|từng)( \\S+){0,3} ${LK_GOOD}\\b`)),
  // câu cụt: "trúng rồi", "đậu rồi em ơi" / "trật", "lại xịt"
  bareGood: VN(/^((a|anh|em|e|mình|tui|tôi|t|tao|tớ) )?(trúng|đậu|đỗ|qua)( rồi| luôn| nè| thật| thiệt| rồi nè| rồi nha| á| nha)+$/),
  bareMiss: VN(/^((a|anh|em|e|mình|tui|tôi|t|tao|tớ) )?(lại )?(trật|xịt|tạch|toang)( rồi| nữa| hoài| luôn| mất rồi| thật| tiếp)*$/),
  unlucky: VN(/\b(toàn xui|xui (quá|tận mạng|thật|ghê|dữ|hoài|lắm|kinh|xẻo|vãi|vl|như)|xui xẻo|đen (như chó mực|như mực|đủi|thui|quá|vãi)|đen đủi|nhọ (quá|lắm|vãi|ghê)|số (nhọ|đen|xui)|hên xui mà)\b/),
  bizSlow: VN(/\b(không|chưa|chẳng|chả|hông|hổng|ko|k)( có)?( bán| ra| chốt)( được)? (gì|đơn|hàng|đồng|ly|món|cái|ai)\b|\b(không|chưa|chẳng|chả|hông|hổng|ko|k) (có|được) (đơn|khách|đồng)( nào)?\b|\b(lỗ nặng|lỗ vốn|lỗ quá|lỗ to|lỗ sấp mặt|ế (quá|ẩm|chỏng chơ|hàng|khách)|đìu hiu|vắng (hoe|tanh|khách))\b|\bbán( \S+){0,3} (chưa|không|chẳng) (được|có) (đồng|đơn|khách)\b/),
  bizWord: VN(/\b(quán|shop|tiệm|bán|đơn|khách|hàng|lỗ|doanh thu|buôn|kinh doanh|cửa hàng|sạp|chợ)\b/),
  bizGood: VN(/\bchốt( được)? \d+ đơn\b|\bchốt đơn (ầm ầm|liên tục|mỏi tay|quá trời)\b|\bbán (đắt|chạy|hết sạch|được nhiều|đắt như tôm tươi)\b|\bcháy hàng\b|\b(hết|sạch) hàng (rồi|luôn|sớm)\b/),
  sportLose: VN(/\b(đội|team|clb|câu lạc bộ|tuyển|a|anh|em|mình|tui|tôi)( \S+){0,2} (thua(?! (kém|thiệt|bạn|người|ai|đứa|chị|anh|em|nó|lỗ))|bị loại)( rồi| trận| đậm| tan nát| sát nút| luôn| mất rồi)*\b|^thua( rồi| luôn| trận| đậm)*$/),
  gamble: VN(/\b(cá độ|cá cược|cờ bạc|đánh bạc|đánh đề|số đề|lô đề|ghi đề|tài xỉu|casino|bài bạc|xì dách|đánh bài|thua lỗ)\b/),
  worry: VN(/\b(lỡ|nhỡ|ngộ nhỡ|sợ|lo|e là)( \S+){0,3} ((không|chẳng|chả|ko|k|hông) (đậu|đỗ|qua|được nhận|trúng tuyển|được tăng lương|được thăng chức)|rớt|trượt|tạch|bị loại)\b/),
  ifPlan: VN(new RegExp(`\\bnếu( \\S+){0,3} ${LK_NEG}${LK_FILL} ${LK_GOOD}( \\S+){0,3} thì\\b`)),
  lottoAsk: VN(/\b(vé số|xổ số|trúng số|vietlott|độc đắc)\b/),
  askWord: VN(/\b(làm sao|làm thế nào|cách nào|có nên|có phải|nên làm gì|làm gì (đầu tiên|trước|tiếp)|thì sao|bao nhiêu|thế nào|ra sao|ở đâu|khi nào|có cần|cần gì)\b/),
  scam: VN(/\b(lừa|lừa đảo|scam|bị gạt|chiếm đoạt)\b/),
  health: VN(/\b(sốt|ốm|bệnh|đau|nhức|ho|nôn|ói|tiêu chảy|thuốc|tháng tuổi|độ|bệnh viện|khám|mổ|cấp cứu|trúng gió|trúng độc|trúng thực|trật khớp|bong gân|thuốc xịt|xịt (mũi|họng|thuốc)|bôi|nhỏ mắt|cảm cúm|cảm lạnh|chóng mặt|khó thở|co giật|ngộ độc|dị ứng|bầu|mang thai)\b/),
  danger: VN(/\b(chết|tự tử|tự sát|tự hại|tự làm đau|rạch|nhảy (cầu|lầu|sông)|uống thuốc ngủ|không muốn sống|chẳng muốn sống|sống (chẳng|không|chả)|sống (để )?làm gì|biến mất|kết thúc (tất cả|cuộc đời|mọi thứ)|buông xuôi|tuyệt vọng|đánh|bạo lực|nợ nần|siết nợ|xã hội đen|tín dụng đen)\b/),
};
const SAD_FACE = /(😭|🥲|😢|😞|😔|☹|💔|🙃|:\(+|huhu|hic)/iu;
// Gõ tắt / sai chính tả hay gặp ở mấy câu này (so trên câu không dấu)
const LK_TYPO: Record<string, string> = { trug: "trung", trun: "trung", truong: "truong", luog: "luong", pv: "phong van", dh: "dai hoc", r: "roi", dc: "duoc", đc: "duoc", hk: "khong", hok: "khong", hem: "khong", ko: "khong" };
// Người được kể tới (không phải chính người nói): "con a", "vợ a", "ba a", "em gái a", "bạn a", "đồng nghiệp a"
const LK_WHO = VR(/^(?:\S+\s+){0,2}?(con trai|con gái|con|vợ|chồng|ba|bố|mẹ|má|em gái|em trai|anh trai|chị gái|em|bạn thân|bạn|đồng nghiệp|cháu|ông|bà|người yêu|bồ|sếp|đứa bạn)(?:\s+(?:của\s+)?(?:a|anh|em|e|mình|tui|tôi|t|tao|tớ|chị|c))(?![\p{L}])/u);
const LK_WHO0 = VR(/^(con trai|con gái|con|vợ|chồng|đứa bạn|bạn thân|đồng nghiệp|sếp)\s/u);
function luckWho(raw: string): string {
  const s = low(raw);
  const m = s.match(LK_WHO) ?? s.match(LK_WHO0);
  if (!m) return "";
  const w = m[1];
  // ("ba bạn" bị đọc là "ba người bạn" nên không đổi được thành "ba anh" — viết "ba của bạn")
  return /^(bạn|bạn thân|đứa bạn)$/u.test(w) ? "bạn ấy" : w === "ba" ? "ba của bạn" : `${w} bạn`;
}

export function senseLuck(raw: string, opt: { tarot?: boolean; thread?: boolean; biz?: boolean } = {}): SenseReply | null {
  const r = low(expandTeen(raw));
  if (!r || r.length > 160) return null;
  let t = normalizeVi(r).replace(/[?!.,…]+/g, " ").replace(/\s+/g, " ").trim();
  t = t.split(" ").map((w) => LK_TYPO[w] ?? w).join(" ");
  for (let i = 0; i < 3; i++) t = t.replace(/\s+(em oi|e oi|lomi oi|mi oi|ban oi|oi|ne|nha|nhe|a|ah|em|e|mi|lomi|ban)$/u, "");
  const n = ` ${t} `;
  // Có chữ về sống chết / tự hại → không bao giờ đáp nhẹ kiểu chuyện may rủi: để lớp an toàn / tâm sự xử lý.
  if (LK.danger.test(n)) return null;
  // Chuyện sức khoẻ ("con 2 tháng tuổi sốt 38 độ" — đoán dấu có thể ra "38 đỗ"; "trúng gió", "trúng thực") → để lớp sức khoẻ / cấp cứu đáp.
  //   ("a dau dh roi" — bộ đoán dấu có thể ra "đau đh": "đau" + đại học / phỏng vấn là ĐẬU)
  const nH = n.replace(/ dau (dai hoc|phong van|tot nghiep|nguyen vong|thu khoa|cao dang|cap 3|roi)(?= )/g, " _exam_ ");
  if (LK.health.test(nH) || VN(/\b\d+ ?(đậu|đỗ)\b/).test(n)) return null;
  if (LK.scam.test(n)) return null; // "trúng số mà bị lừa" — để lớp "bị lừa" chỉ việc cần làm ngay
  const lotto = LOTTO.test(n);
  // Đang ở giữa một mạch có sẵn (tâm sự, tư vấn kinh doanh, sức khoẻ) → để mạch đó hiểu câu theo ngữ cảnh ("mai a phỏng vấn" → "sợ rớt");
  //   chỉ giữ chuyện vé số (mạch kia không hiểu chuyện trúng / trật).
  if (opt.thread && !lotto) return null;
  const hasGood = LK.pos.test(n) || LK.neg.test(n) || lotto;
  const sad = SAD_FACE.test(raw);
  // (câu PHỦ ĐỊNH kết bằng "nào / gì" là câu kể: "chưa bán được đơn nào", "hổng có trúng gì hết"; "mua bao nhiêu cũng trật" cũng vậy)
  const ask = (isAskLike(raw) || LK.askWord.test(n)) && !VN(/\b(không|chưa|chẳng|chả|hông|hổng|ko|k)( \S+){0,6} (nào|gì|đâu)( hết| cả| luôn| trơn| hết trơn)*$/).test(t) && !VN(/\b(bao nhiêu|mấy)( \S+){0,2} (cũng|vẫn)\b/).test(n);
  const who = luckWho(raw);
  const Who = who ? who.charAt(0).toUpperCase() + who.slice(1) : "";
  const out = (kind: string, text: string): SenseReply & { dream?: boolean } => ({ intent: `luck:${kind}`, text, talk: true, dream: /làm gì đầu tiên|muốn làm là gì|trúng thì làm gì/u.test(text) });

  // Hỏi về vé số — trả lời thật, không chúc mừng ("trúng số có phải đóng thuế không", "mua vé số có phải cờ bạc không", "trúng số thì nên làm gì")
  // (câu hỏi vặn / so bì / phủ định có dáng câu hỏi — "a có bao giờ trúng số đâu", "làm gì có chuyện a trúng", "… còn a thì không" — là câu KỂ)
  const negForm = LK.neg.test(n) || LK.rhet.some((re) => re.test(n)) || LK.compare.test(n);
  if (ask && LK.lottoAsk.test(n) && !negForm) {
    if (VN(/\b(thuế|đóng thuế|nộp thuế|khấu trừ)\b/).test(n))
      return out("lottoTax", "Có nha 🙂 Từ 1/7/2026, trúng xổ số chỉ phải nộp **thuế thu nhập cá nhân 10%** trên phần vượt **20 triệu đồng** của **mỗi vé** trong một đợt quay (trước đó là phần vượt 10 triệu). Ví dụ một vé trúng 50 triệu thì thuế là 10% × 30 triệu = 3 triệu. Công ty xổ số **khấu trừ luôn khi trả thưởng**, bạn không cần tự đi khai.\n\nĐể chắc từng trường hợp, bạn hỏi lại công ty xổ số / đại lý lúc lĩnh thưởng nha.");
    if (VN(/\b(cờ bạc|nghiện|có hại|xấu|tốt không)\b/).test(n))
      return out("lottoGamble", "Vé số do công ty xổ số của Nhà nước phát hành là trò chơi may rủi **hợp pháp** (còn số đề, lô đề là cờ bạc trái phép). Nhưng bản chất vẫn là may rủi: tính chung thì người mua luôn bỏ ra nhiều hơn nhận về.\n\nMua cho vui thì nên đặt một mức nhỏ cố định, mất cũng không ảnh hưởng ăn ở. Nếu thấy mình mua để **gỡ**, mua nhiều hơn dự tính, hay giấu người nhà — đó là dấu hiệu đang sa vào rồi, kể Lomi nghe nha 🤝");
    if (VN(/\b(trúng|trúng số|trúng thưởng)( \S+){0,3} (nên|phải|cần) (làm gì|làm sao)|\btrúng( \S+){0,3} (làm gì|thì sao)\b/).test(n))
      return out("lottoWon", "Lỡ trúng thật thì mấy việc nên làm nè 🍀\n• **Giữ kín**, đừng khoe rộng — kể cả trên mạng\n• **Cất vé thật kỹ**, đừng để ướt, rách, nhàu; chụp lại hai mặt vé\n• Đến công ty xổ số (hoặc đại lý lớn) **lĩnh thưởng sớm**, vé có hạn lĩnh thưởng — mang theo căn cước\n• Giải lớn thì nhận qua tài khoản ngân hàng cho an toàn; thuế thu nhập cá nhân công ty sẽ khấu trừ luôn\n• **Đừng quyết chi lớn ngay** — cho mình vài tuần bình tĩnh, trả nợ trước, rồi mới tính mua sắm, đầu tư\n\nCó dự định gì chưa nè? 😄");
    return null;
  }

  if (LK.gamble.test(n)) return null; // cá độ, lô đề, thua bài — để lớp tâm sự (nghiện / nợ) nghe
  // "a chưa có người yêu", "vẫn ế" — chuyện một mình, hỏi nhẹ (không chúc mừng, không coi là chuyện không may)
  if (VN(/\b(chưa|không|ko|k|chẳng|chả|hông|chx) (có )?(người yêu|ny|bồ|bạn gái|bạn trai|gấu)\b|\b(vẫn|còn|đang) ế\b|\bế (quá|lâu rồi|mấy năm|hoài)\b/).test(n) && !LK.bizWord.test(n))
    return out("single", pick([
      "Chưa có người yêu hả 😄 Bạn đang thấy thoải mái với chuyện một mình, hay dạo này cũng muốn có ai đó bên cạnh rồi?",
      "Một mình cũng có cái tự do của nó mà 😄 Mà bạn đang muốn tìm ai đó, hay chỉ kể cho vui thôi nè?",
    ]));
  // Niềm vui bị phủ định hẳn — "a chưa bao giờ thấy hạnh phúc", "a hết vui rồi" (không phải "chưa bao giờ vui NHƯ hôm nay")
  //   (chỉ câu ngắn chỉ nói mỗi chuyện đó — câu dài có chuyện khác như "làm 12 tiếng … không còn thấy vui" để thư viện tâm sự nhận đúng chủ đề)
  if (t.split(" ").length <= 8 && VN(/\b((chưa|không|chẳng|chả|ko|k) (bao giờ|từng|hề)( thấy| cảm thấy| được)?|hết|mất) (vui|hạnh phúc|yêu đời|vui vẻ|sướng)\b(?! (như|bằng|hơn|đến vậy))/).test(n))
    return out("nohappy", pick([
      "Nghe vậy Lomi thương ghê 🥺 Cảm giác lâu rồi không thấy vui thật nặng lòng lắm. Dạo này có chuyện gì làm bạn mệt hả, kể Lomi nghe nha?",
      "Ôm bạn một cái nè 🫂 Không thấy vui lâu vậy chắc bạn gồng nhiều lắm. Chuyện gì đang đè lên bạn vậy?",
    ]));
  // Buôn bán ế / đắt — "quán a không bán được gì", "shop chưa có đơn nào", "chốt được 20 đơn"
  if (!opt.biz && LK.bizWord.test(n) && LK.bizSlow.test(n) && !ask)
    return out("bizSlow", pick([
      "Ngày ế khách thì nản thật 😣 Bán cả ngày mà không ra đơn ai cũng sốt ruột hết. Bạn bán gì vậy — có quán hay bán online? Kể Lomi nghe chút, mình cùng tìm cách kéo khách nha.",
      "Ui, ế vậy là mệt lòng lắm 😔 Có hôm vắng vậy thôi bạn. Bạn đang bán món gì, ở đâu, để Lomi cùng nghĩ cách nha?",
    ]));
  if (!opt.biz && LK.bizGood.test(n) && !ask && !sad)
    return out("bizGood", pick(["Buôn may bán đắt vậy là quá đỉnh luôn 🎉 Chúc mừng bạn nha! Hôm nay có bí quyết gì vậy, kể Lomi nghe với?", "Chốt đơn ầm ầm vậy là vui lây luôn 🥳 Chúc mừng bạn nha! Nhớ nghỉ tay uống miếng nước nữa đó."]));
  // So với người khác — "ai cũng đậu chỉ có a rớt", "bạn a trúng số còn a thì không"
  if ((hasGood || VN(/\b(rớt|trượt|tạch)\b/).test(n)) && LK.compare.test(n))
    return out("compare", pick([
      "Thấy người khác được còn mình thì chưa, chạnh lòng lắm ha 😔 Cảm giác đó bình thường mà, không có nghĩa là bạn kém hơn ai đâu. Chuyện sao vậy, kể Lomi nghe với?",
      "Đứng cạnh người khác mà mình chưa được như vậy thì tủi thật 🥺 Mỗi người một nhịp mà bạn. Bạn đang thấy buồn hay thấy áp lực nhiều hơn?",
    ]));
  // Lo trước kết quả — "lỡ a rớt thì sao", "a sợ năm nay không đậu" (đang tâm sự dở thì để mạch tâm sự hiểu cả câu)
  if (!opt.thread && LK.worry.test(n))
    return out("worry", pick([
      "Lo trước kết quả là chuyện ai cũng bị nè 🫂 Mà dù ra sao thì bạn vẫn còn đường khác, không phải hết đâu. Bạn đang chờ kết quả gì vậy, kể Lomi nghe nha?",
      "Chờ kết quả mà cứ nghĩ tới chuyện xấu nhất thì mệt lắm ha 🥺 Bạn đã làm hết sức rồi mà. Chuyện gì vậy, kể Lomi nghe với?",
    ]));
  // Giả định có kế hoạch — "nếu a không được tăng lương thì a nghỉ"
  if (!opt.thread && LK.ifPlan.test(n))
    return out("ifPlan", "Nghe như bạn đã tính trước đường lui rồi ha 🤔 Ngoài chuyện đó ra, còn điều gì ở chỗ hiện tại làm bạn lấn cấn không? Kể Lomi nghe, mình cùng cân nhắc nha.");
  // Rớt rồi hỏi bước tiếp — "rớt đại học thì làm gì tiếp", "trượt phỏng vấn rồi giờ sao"
  if (LK.fail.test(t.replace(/ (thi|thì|giờ|rồi|nên|phải)( \S+){0,4}$/u, "")) || VN(/\b(rớt|trượt|tạch)( \S+){0,3} (thì|rồi|giờ)( \S+){0,2} (làm gì|tính sao|sao|đi đâu|học gì|làm sao)\b/).test(n))
    if (ask && VN(/\b(làm gì|tính sao|thì sao|giờ sao|đi đâu|học gì|làm sao|nên)\b/).test(n) && !LK.failObj.test(n))
      return out("failAsk", VN(/\b(đại học|cao đẳng|nguyện vọng|thi)\b/).test(n)
        ? "Rớt thì buồn thật, nhưng còn nhiều đường lắm nè 🫂\n• **Nguyện vọng bổ sung** — nhiều trường còn xét đợt sau, canh thông báo của trường và Bộ\n• **Cao đẳng / trung cấp nghề** — học ngắn hơn, ra làm sớm, sau này vẫn liên thông lên đại học được\n• **Ôn thi lại năm sau** — nếu bạn thật sự muốn ngành đó, một năm chuẩn bị kỹ không phí đâu\n• **Vừa đi làm vừa học** (văn bằng 2, hệ từ xa) cũng là một lựa chọn\n\nBạn đang nghiêng về hướng nào, hay muốn kể Lomi nghe mình thích ngành gì trước?"
        : "Trượt một lần chưa phải hết đâu 🫂 Mình làm vầy nha:\n• Nếu được, **xin nhận xét** từ bên tuyển dụng — biết hụt ở đâu để sửa\n• Ghi lại mấy câu bị hỏi khó, **tập trả lời lại** cho lần sau\n• Rải hồ sơ thêm vài chỗ, đừng dồn hết hy vọng vào một nơi\n\nBạn trượt vòng nào vậy, kể Lomi nghe để mình chuẩn bị kỹ hơn cho lần tới nha?");
  // Rớt / trượt — "a rớt đại học rồi", "con a thi rớt rồi", "năm ngoái đậu mà năm nay rớt", "chỗ nào cũng trượt"
  if (LK.fail.test(t) && !lotto && !LK.failObj.test(n))
    return out("fail", who
      ? pick([`${Who} rớt hả 😔 Chắc ${who} buồn lắm, mà bạn cũng lo cho ${who} nữa ha. ${Who} giờ sao rồi bạn?`, `Thương ${who} ghê 🫂 Một lần không qua không nói lên gì hết. Giờ ${who} thấy sao rồi bạn, có cần Lomi gợi ý cách nói chuyện với ${who} cho nhẹ lòng không?`])
      : pick([
        "Ui, rớt thì buồn và hụt hẫng lắm 😔 Bạn đã cố gắng mà kết quả không như mong muốn, thấy nặng lòng là đúng rồi. Bạn muốn kể Lomi nghe chút không — hay mình cùng tính bước tiếp theo?",
        "Thương bạn ghê 🫂 Một lần không qua không nói lên giá trị của bạn đâu. Giờ bạn đang thấy sao — buồn, tiếc hay lo cho chuyện sắp tới?",
      ]));
  // Thua (thi đấu) — "đội a thua rồi"
  if (LK.sportLose.test(n) && !ask)
    return out("lose", pick(["Thua hả 😩 Tiếc ghê! Trận gì vậy bạn, thua sát nút hay cách biệt?", "Ui, thua rồi hả 😣 Tiếc thiệt chứ. Thôi trận sau gỡ lại nha! Trận đó sao vậy bạn?"]));
  // Ước / mong (không phải tin vui đã xảy ra). Đang ở tab Tarot thì để Tarot hiểu là câu hỏi bói.
  if (!opt.tarot && LK.wish.some((re) => re.test(n)) && !LK.neg.test(n))
    return out("wish", lotto
      ? pick(["Ai mà không mơ trúng số ha 😆 Nếu trúng thật thì bạn tính làm gì đầu tiên nè?", "Mong lắm luôn ha 😆 Mà nếu trúng thật, món đầu tiên bạn muốn làm là gì nè?"])
      : pick(["Lomi mong chuyện đó sớm tới với bạn nha 🍀 Bạn mong chuyện này lâu chưa, có gì đang làm bạn lo không?", "Mong là sắp tới thôi 🍀 Kể Lomi nghe thêm đi — bạn đang chờ chuyện này ra sao rồi?"]));
  // Phủ định / hỏi vặn / mỉa / hụt — "chưa bao giờ trúng số", "có trúng đâu", "trúng cái nịt", "trật có 1 số"
  // "về quê sợ không có việc", "lỡ không đậu thì sao" — lo trước / giả sử, chưa xảy ra → để lớp tâm sự hiểu cả câu.
  if (VN(new RegExp(`\\b(sợ|lo|lỡ|nếu|giả sử|nhỡ|ngộ nhỡ|e là|chắc là)( \\S+){0,2} ${LK_NEG}${LK_FILL} ${LK_GOOD}\\b`)).test(n)) return null;
  const negd = (LK.neg.test(n) || LK.rhet.some((re) => re.test(n))) && !(ask && !lotto && !LK.rhet.some((re) => re.test(n)) && !VN(/\b(bao giờ|lần nào)\b/).test(n));
  // "đoán không trúng", "bắn không trúng" — chữ "trúng" ở đây không phải trúng thưởng.
  if (negd && !lotto && VN(/\b(đoán|bắn|ném|đá|sút|chọn|nói|đánh|chích|tiêm|bấm|gõ)( \S+){0,2} (không|chưa|chẳng|chả|ko|k|hông) trúng\b/).test(n)) return null;
  const missed = lotto && LK.miss.some((re) => re.test(n));
  if (negd || missed) {
    if (missed && VN(/\b(suýt|xém|xíu nữa|tí nữa|hụt|trúng (có )?(1|một|2|hai) (số|con số)|trật (có )?(1|một) số)\b/).test(n))
      return out("nearmiss", pick([
        "Ui, suýt nữa là trúng rồi, tiếc dữ lắm luôn 😩 Hụt sát nút vậy ai cũng ấm ức hết. Thôi coi như hôm nay hên ở chỗ khác nha — mà bạn đã tính trúng thì làm gì chưa? 😆",
        "Trời, sát nút luôn hả 😫 Tiếc thiệt chứ! Vé số mình coi như mua niềm vui thôi nha, đừng mua dồn để gỡ đó.",
      ]));
    if (lotto || (VN(/\btrúng\b/).test(n) && t.split(" ").length <= 12 && !VN(/\b(đậu|đỗ|lương|chức|việc|khen|thưởng|bắn|đoán|ném|đá|sút|giải)\b/).test(n)))
      return out("nolotto", who
        ? pick([`Mua hoài mà chưa trúng thì ${who} kiên trì ghê luôn 😆 Vé số coi như niềm vui nho nhỏ của ${who} thôi ha, miễn đừng mua nhiều quá là được.`])
        : pick([
          "Huhu chưa tới lượt bạn thôi mà 😆 Vé số thì mình coi như mua niềm vui, đừng dồn nhiều tiền vào nha. Mà nếu trúng thật thì bạn tính làm gì đầu tiên nè?",
          "Ui, khoản này Lomi cũng chưa trúng lần nào nè 🥲 Vé số coi như mua chút hy vọng thôi, đừng mua nhiều quá nha. Dạo này bạn đang cần tiền cho việc gì hả?",
        ]));
    return out("nogood", who
      ? pick([`Vậy là ${who} chưa được như mong muốn rồi 🥺 ${Who} có buồn nhiều không bạn?`, `Ui, ${who} chưa được như ý rồi 😔 Bạn có lo cho ${who} không, kể Lomi nghe với?`])
      : pick([
        "Chưa được như mong muốn chắc cũng hơi nản ha 😔 Chuyện sao vậy, kể Lomi nghe với?",
        "Ui, vậy là chưa được như ý rồi 🥺 Bạn đang thấy buồn hay chỉ hơi tiếc thôi? Kể Lomi nghe nè.",
      ]));
  }
  // Xui liên tục — "a xui tận mạng", "đen như chó mực", "hên xui mà toàn xui"
  if (LK.unlucky.test(n) && !ask)
    return out("unlucky", pick(["Nghe là thấy dạo này xui dồn dập ha 😣 Có chuyện gì vừa xảy ra vậy bạn, kể Lomi nghe với?", "Xui liên tục thì ai cũng nản 🥲 Mà xui tới rồi thì hên cũng sắp tới thôi. Vụ gì vậy bạn?"]));
  // Câu cụt — "trật", "lại xịt" / "trúng rồi", "đậu rồi em ơi"
  if (LK.bareMiss.test(t)) return out("miss", pick(["Lại xịt hả 😩 Tiếc ghê. Vụ gì vậy bạn, kể Lomi nghe với?", "Ui, trật rồi hả 🥲 Tiếc thiệt. Chuyện gì vậy bạn?"]));
  // Có rồi mà mất — "a từng trúng mà giờ mất hết rồi"
  if ((hasGood || VN(/\b(trúng|đậu|đỗ|thắng)\b/).test(n)) && LK.lostAfter.test(n)) return out("lostAfter", "Có rồi mà mất hết thì còn tiếc hơn chưa từng có nữa 😔 Chuyện sao vậy bạn, kể Lomi nghe với?");
  if (ask) return null;
  if (LK.bareGood.test(t))
    return out("good", pick(["Thật hả 🎉🥳 Chúc mừng bạn nha! Vụ gì vậy, kể Lomi nghe với!", "Wow chúc mừng bạn 🎊 Nghe mà Lomi vui lây! Kể Lomi nghe chi tiết đi nào!"]));
  if (!LK.pos.test(n)) return null;
  // Chuyện đã qua — "hồi xưa a từng trúng số 1 lần"
  if (LK.past.test(n))
    return out("past", lotto
      ? "Ồ từng trúng luôn hả 😄 Hồi đó chắc vui lắm ha! Trúng dịp nào vậy, kể Lomi nghe chút đi."
      : "Nghe kể lại thôi mà Lomi cũng thấy vui lây 😄 Hồi đó chắc bạn mừng lắm ha! Kể Lomi nghe thêm đi.");
  // Vui mà kèm chuyện không vui — "được tăng lương mà bị chuyển đi xa :((", "đậu rồi mà không vui nổi"
  if (LK.mixed.test(n) || sad)
    return out("mixed", pick([
      "Vừa có chuyện vui mà cũng kèm chuyện làm bạn lấn cấn ha 😕 Phần nào đang làm bạn bận lòng nhất, kể Lomi nghe nè?",
      "Tin vui mà lòng chưa vui trọn được ha 🫂 Chuyện gì đang làm bạn lăn tăn vậy?",
    ]));
  // Tin vui thật — "cuối cùng a cũng trúng số", "không tin nổi a đậu đại học rồi", "a trúng 2 triệu nè"
  if (t.split(" ").length > 18) return null;
  if (who)
    return out("good", lotto
      ? `Trời, ${who} trúng số hả 🎉🥳 Chúc mừng cả nhà nha! Nhớ dặn ${who} cất vé thật kỹ, đừng kể rộng quá đó.`
      : pick([`Ui chúc mừng ${who} nha 🎉🥳 ${Who} chắc vui lắm, mà bạn chắc cũng tự hào ghê! Kể Lomi nghe thêm với.`, `Tin vui quá trời 🎊 Chúc mừng ${who} nha! Cả nhà tính ăn mừng sao nè?`]));
  // Được khen — vui nhẹ, không làm quá như đậu đại học / trúng số
  if (!lotto && VN(/\bkhen\b/).test(n) && !VN(/\b(tăng lương|thăng chức|lên chức|đậu|đỗ|nhận việc|thưởng|trúng|giải|vô địch)\b/).test(n))
    return out("good", pick(["Ui được khen hả 😄 Nghe mà Lomi vui lây! Ai khen bạn vậy, khen chuyện gì nè?", "Ui được khen hả 😆 Lomi vui lây luôn, công sức của bạn có người thấy rồi đó! Kể Lomi nghe với."]));
  return out("good", lotto
    ? pick(["Trời ơi trúng thật hả 🎉🥳 Chúc mừng bạn nha! Nhớ cất vé thật kỹ và đừng kể rộng quá nha. Tính ăn mừng sao nè?", "Wow chúc mừng bạn 🎊 Hên ghê luôn! Bạn định dùng tiền trúng làm gì nè?"])
    : pick(["Wow chúc mừng bạn nha 🎉🥳 Nghe mà Lomi vui lây luôn! Kể Lomi nghe thêm với, bạn đã cố gắng thế nào để có được vậy?", "Tuyệt vời quá 🎊 Bạn xứng đáng lắm đó! Tính ăn mừng sao đây?"]));
}

/** 27/11 — Lomi vừa hỏi "nếu trúng thì bạn tính làm gì đầu tiên?" → câu sau là ĐIỀU người dùng mơ ("mua nhà cho ba mẹ", "đi du lịch"),
 *  không phải câu độc lập ("mua nhà cho ba mẹ" từng bị hiểu thành chuyện gia đình bất hoà). */
export function senseDream(raw: string): SenseReply | null {
  const n = ` ${normalizeVi(expandTeen(low(raw)))} `;
  if (n.trim().split(" ").length > 20 || isAskLike(raw)) return null;
  if (VN(/\b(nợ|trả nợ|bệnh|viện phí|chữa bệnh|mổ|thuốc)\b/).test(n)) return null; // chuyện lo thật → để lớp tâm sự / tiền bạc nghe
  const fam = n.match(VN(/\b(ba mẹ|bố mẹ|cha mẹ|ba má|tía má|mẹ|ba|bố|má|vợ|chồng|con|gia đình|ông bà|người yêu|em gái|em trai|anh trai|chị gái)\b/));
  const who = fam ? normalizeVi(fam[0]) : "";
  if (who) {
    const shown = (raw.normalize("NFC").toLowerCase().match(VR(/(ba mẹ|bố mẹ|cha mẹ|ba má|tía má|mẹ|ba|bố|má|vợ|chồng|con|gia đình|ông bà|người yêu|em gái|em trai|anh trai|chị gái)/u)) ?? [""])[0] || "người nhà";
    return { intent: "luck:dream", talk: true, text: pick([
      `Nghe mà thương ghê 🥰 Có tiền là nghĩ tới ${shown} trước tiên — vậy là biết bạn thương ${shown} nhiều lắm rồi. Mong một ngày điều đó thành thật nha 🍀`,
      `Dễ thương quá trời 🥰 Trúng số mà nghĩ cho ${shown} đầu tiên thì ${shown} có bạn là có phước lắm đó. Chưa trúng thì mình cứ góp từng chút một nha 🍀`,
    ]) };
  }
  return { intent: "luck:dream", talk: true, text: pick([
    "Nghe đã ghê 😆 Mơ vậy là có động lực rồi đó! Biết đâu chưa cần trúng số, mình góp dần từng chút cũng làm được một phần nha 🍀",
    "Kế hoạch nghe hay đó 😄 Lomi mong có ngày bạn làm được thật — trúng số hay tự tay làm ra cũng được hết nha 🍀",
  ]) };
}
