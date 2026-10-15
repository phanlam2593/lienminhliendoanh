// ─────────────────────────────────────────────────────────────────────────────
// KHO KIẾN THỨC Y KHOA CÓ NGUỒN (09/10, theo ý Kir: "bệnh nào cũng trả lời được") — chạy trên máy, không gọi AI.
//
// Mỗi chủ đề (bệnh / tình trạng / thuật ngữ tâm lý) là MỘT THẺ JSON trong lib/medkb/<id>.json. Mỗi ý trong thẻ trỏ tới nguồn chính thống
// (NHS, MedlinePlus, CDC, NIH, WHO, Mayo…). Lomi chỉ nói điều CÓ trong thẻ; điều thẻ không có → nói thẳng "chưa xác minh được", không đoán.
//   • Thêm kiến thức = thêm / sửa thẻ JSON (không viết regex, không sửa code) rồi chạy `node scripts/medkb-index.mjs` để cập nhật chỉ mục.
//   • Thẻ nạp theo nhu cầu (lazy) — chỉ mục tên (medkb/index.json, nhỏ) nằm sẵn trong gói, thẻ đầy đủ tải khi cần.
//   • Quy tắc nguồn do test (src/test/lomiMed.test.ts) ép: tên miền tin cậy · mọi `src` hợp lệ · không có liều thuốc · ý ≤ 220 ký tự.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { sourceLine, type DrugFact, type DrugSource } from "@/lib/lomiDrugData";
import INDEX from "@/lib/medkb/index.json";
import { VR, VN } from "@/lib/viMatch";

export type MedFood = { name: string; aliases: string[]; verdict: "avoid" | "limit" | "ok" | "good"; note: string; src: number[] };
export type MedTopic = {
  id: string;
  kind: "condition" | "mental" | "infection" | "child" | "women" | "cancer" | "term" | "other";
  names: string[];
  about: DrugFact[];
  signs: DrugFact[];
  causes: DrugFact[];
  course: DrugFact[];
  care: DrugFact[];
  diet: { avoid: DrugFact[]; ok: DrugFact[]; foods: MedFood[] } | null;
  doctor: DrugFact[];
  emergency: DrugFact[];
  disambiguation?: string;
  /** Thẻ chỉ nói về ăn uống (vd ăn uống khi mang thai) — chỉ nhận câu hỏi ăn uống / hỏi món, câu khác về chủ đề này để lớp khác đáp. */
  dietOnly?: boolean;
  /** id thẻ riêng cho trẻ em của cùng chủ đề (vd sot → sot-o-tre-em): câu nói tới con / bé / trẻ thì dùng thẻ đó. */
  child?: string;
  sources: DrugSource[];
  verifiedAt: string;
};
type IndexRow = { id: string; kind: MedTopic["kind"]; names: string[]; dietOnly?: boolean; child?: string };
const ROWS = INDEX as IndexRow[];

// ── Nạp thẻ theo nhu cầu ── (cả kho là MỘT chunk — lib/lomiMedData — tải ở lần hỏi y khoa đầu tiên)
let cards: Promise<Record<string, unknown>> | null = null;
export async function loadMedTopic(id: string): Promise<MedTopic | null> {
  try {
    cards ??= import("@/lib/lomiMedData").then((m) => m.MED_CARDS);
    const t = (await cards)[`./medkb/${id}.json`];
    return (t as MedTopic) ?? null;
  } catch {
    cards = null; // lỗi mạng → lần sau thử lại
    return null;
  }
}
/** Dùng trong test: nạp sẵn mọi thẻ. */
export async function loadAllMedTopics(): Promise<MedTopic[]> {
  const out = await Promise.all(ROWS.map((r) => loadMedTopic(r.id)));
  return out.filter(Boolean) as MedTopic[];
}
export const medTopicIds = () => ROWS.map((r) => r.id);

// ── Nhận ra chủ đề trong câu ──
// Hai cách viết i/y hay gặp ("tự kỷ"/"tự kỉ", "tâm lý"/"tâm lí") quy về một dạng để khớp tên.
const canon = (n: string) => n.replace(VR(/\bky\b/g), "ki").replace(VR(/\bly\b/g), "li");
const bare = (x: string) => ` ${canon(normalizeVi(x))} `;
const acc = (x: string) => ` ${x.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
type NameKey = { id: string; bare: string; acc: string; short: boolean; len: number };
const NAME_KEYS: NameKey[] = ROWS.flatMap((r) =>
  r.names.map((n) => ({ id: r.id, bare: bare(n), acc: acc(n), short: normalizeVi(n).replace(/ /g, "").length < 4, len: normalizeVi(n).length })),
).sort((a, b) => b.len - a.len);

// Một chữ có dấu so theo (chữ gốc + mũ/móc/đ) và tập dấu thanh — không phụ thuộc vị trí đặt dấu ("hoà" = "hòa"),
// và "kỷ"/"kỉ", "lý"/"lí" coi như nhau.
const TONES = VR(/[̣̀́̃̉]/g);
function wordKey(w: string): string {
  const d = w.normalize("NFD");
  const tone = (d.match(TONES) || []).sort().join("");
  let base = d.replace(TONES, "").normalize("NFC");
  if (VR(/^[kl][yi]$/).test(base)) base = base.replace("y", "i");
  return `${base}|${tone}`;
}
const isAccented = (w: string) => normalizeVi(w) !== w;
/** Tên dài khớp khi bỏ dấu; nhưng chữ nào người dùng ĐÃ gõ dấu thì dấu phải đúng ("đậu rang" ≠ "đau răng", "viêm gan" ≠ "viêm gân"). */
function accentAgrees(textAcc: string, nameAcc: string): boolean {
  const tw = textAcc.trim().split(" ");
  const nw = nameAcc.trim().split(" ");
  const tb = tw.map((w) => canon(normalizeVi(w)));
  const nb = nw.map((w) => canon(normalizeVi(w)));
  if (tb.some((w) => w.includes(" "))) return true; // không căn được từng chữ → giữ cách khớp cũ
  for (let i = 0; i + nb.length <= tb.length; i++) {
    let hit = true;
    for (let j = 0; j < nb.length && hit; j++) {
      if (tb[i + j] !== nb[j]) hit = false;
      else if (isAccented(tw[i + j]) && wordKey(tw[i + j]) !== wordKey(nw[j])) hit = false;
    }
    if (hit) return true;
  }
  return false;
}

// 11/10 — tên MỘT TIẾNG ("cảm", "lao", "lậu"…) cũng là một tiếng trong nhiều TỪ GHÉP không liên quan tới bệnh: "tình cảm là gì",
// "cảm xúc là gì", "cảm ơn" từng bị đáp bằng bài Cảm lạnh. Tiếng đó chỉ là tên bệnh khi KHÔNG đứng trong một từ ghép như vậy
// (tiếng đứng trước / đứng sau liệt kê ở đây). Tên dài hơn ("trầm cảm", "cảm nắng", "lao phổi") đã thắng từ trước nên không cần liệt kê.
const set = (x: string) => new Set(x.split(" ").filter(Boolean));
const COMPOUND: Record<string, { before: Set<string>; after: Set<string> }> = {
  cảm: {
    before: set("tình thông đồng linh thiện ác mặc nhạy đa tự giao xúc thương dũng quả mẫn truyền gợi khoái hảo phản biểu vô tri trực dự mỹ mĩ rung thiện tâm thấu thụ hàm ngoại nội bi thẩm"),
    after: set("ơn xúc giác thấy nhận động tình thông hứng kích phục mến thương tưởng quan tính ứng biến nghĩ tạ hóa hoá thụ tác thán khái tử hoài phiền thấu ứng"),
  },
  lao: { before: set("cần gian công nhọc"), after: set("động công lực đao tù vào tới xuống ra lên xao đầu tâm khổ") },
  lậu: { before: set("hàng buôn trốn nhập rượu xăng thuốc đồ phim nhạc sách"), after: set("thuế vé") },
  ghẻ: { before: set("mẹ dì con cha bố bà"), after: set("lạnh") },
  bỏng: { before: set("nóng"), after: set("ngô gạo mắt") },
  trĩ: { before: set("ấu"), after: set("") },
  nghẹn: { before: set(""), after: set("ngào lời") },
  ngất: { before: set("cao"), after: set("ngây ngưởng") },
  chàm: { before: set("màu xanh áo"), after: set("") },
  thiền: { before: set(""), after: set("sư viện tông môn") },
};
/** Tên một tiếng có đứng riêng (không nằm trong từ ghép khác nghĩa) ở ít nhất một chỗ trong câu không? */
function standsAlone(a: string, name: string): boolean {
  const c = COMPOUND[name];
  if (!c) return true;
  const w = a.trim().split(" ");
  return w.some((x, i) => x === name && !c.before.has(w[i - 1] ?? "") && !c.after.has(w[i + 1] ?? ""));
}

/** Chủ đề được nhắc trong câu (tên dài nhất thắng). Tên ngắn / dễ lẫn (< 4 chữ cái) chỉ nhận khi GÕ ĐÚNG DẤU. */
export function findMedTopicId(text: string): string | null {
  const b = bare(text);
  const a = acc(text);
  for (const k of NAME_KEYS) {
    if (!(k.short ? a.includes(k.acc) : b.includes(k.bare) && accentAgrees(a, k.acc))) continue;
    if (!standsAlone(a, k.acc.trim())) continue;
    // Thẻ chỉ nói ăn uống ("bầu", "mang thai") chỉ nhận khi câu nói tới ăn uống — "bầu cử là gì" không phải.
    if (DIET_ONLY.has(k.id) && !DIET_CUE.test(b)) continue;
    // Thẻ người lớn có thẻ riêng cho trẻ ("con bị sốt bao nhiêu độ" → sốt ở trẻ em).
    const kid = CHILD_OF.get(k.id);
    if (kid && (a === b ? KID_CUE_B.test(b) : KID_CUE.test(a))) return kid;
    return k.id;
  }
  return null;
}
const DIET_ONLY = new Set(ROWS.filter((r) => r.dietOnly).map((r) => r.id));
const DIET_CUE = VN(/ (ăn|uống|kiêng|thực phẩm|món|đồ ăn|thức ăn|nhậu|bia|rượu|cà phê) /);
const CHILD_OF = new Map(ROWS.filter((r) => r.child).map((r) => [r.id, r.child!]));
// ("con" có dấu là "còn" → xét trên chữ có dấu; câu gõ không dấu thì đành xét bản không dấu)
const KID_CUE = VR(/ (con|bé|trẻ|em bé|cháu|sơ sinh|nhi|bé con) /u);
const KID_CUE_B = VN(/ (con|bé|trẻ|em bé|cháu|sơ sinh) /);

// ── Khía cạnh được hỏi ──
export type MedAspect = "define" | "signs" | "causes" | "course" | "spread" | "care" | "diet" | "food" | "doctor" | "emergency" | "meds";
const ASPECTS: [MedAspect, RegExp][] = [
  ["spread", VN(/\b(có lây|lây không|lây qua|lây nhiễm|lây truyền|truyền nhiễm|lây sang|bị lây|lây cho|lây từ|lây khi|lây được|lây thế nào|lây như thế nào|lây ra sao|lây bằng|lây đường)\b/)],
  ["emergency", VN(/\b(cấp cứu|gọi 115|nguy hiểm đến tính mạng|dấu hiệu nguy hiểm|báo động)\b/)],
  ["meds", VN(/\b(thuốc gì|thuốc nào|uống thuốc|dùng thuốc|thuốc trị|thuốc chữa|có thuốc|cần thuốc|thuốc đặc trị)\b/)],
  ["diet", VN(/\b(kiêng|ăn gì|uống gì|uống nước gì|ăn uống gì|gì tốt|chế độ ăn|thực đơn|nên ăn|nên uống|tránh ăn|ăn uống|được ăn gì|dinh dưỡng|bổ sung gì)\b/)],
  ["signs", VN(/\b(triệu chứng|dấu hiệu|biểu hiện|nhận biết|nhận ra|có những dấu hiệu|có hiện tượng gì|bị sao|bị như thế nào|làm sao biết|sao biết|làm sao để biết|biết mình bị|biết có bị)\b/)],
  ["causes", VN(/\b(nguyên nhân|tại sao|vì sao|do đâu|yếu tố nguy cơ|dẫn đến|gây ra|tại sao bị|vì sao bị|do cái gì|bị do gì|di truyền)\b/)],
  ["doctor", VN(/\b(đi khám|khám ở đâu|khám khoa nào|khoa nào|cần khám|nên khám|khi nào.*(khám|gặp bác sĩ|đi viện)|gặp bác sĩ|bác sĩ nào|đi viện)\b/)],
  ["course", VN(/\b(có khỏi|khỏi được|khỏi hẳn|chưa khỏi|chữa khỏi|bao lâu khỏi|có lây|lây không|lây qua|có nguy hiểm|có hết|hết không|hết ko|hết được|có sao không|có sao ko|nguy hiểm không|tiến triển|kéo dài bao lâu|kéo dài không|có kéo dài|bị bao lâu|tái phát|biến chứng|có chết|có nặng không|nặng không|có tự khỏi|tự khỏi|khó chữa|có chữa được|chữa được không|vĩnh viễn)\b/)],
  ["care", VN(/\b(cách chữa|chữa sao|chữa thế nào|chữa như thế nào|chữa bệnh|chữa trị|điều trị|cách trị|làm sao|làm gì|phải làm gì|nên làm gì|chăm sóc|phòng ngừa|phòng tránh|giảm đau|cho đỡ|cải thiện|tự xử lý|tự xử lí|xử lý|xử lí|xử trí|sơ cứu|tập luyện|vận động|sinh hoạt|bôi gì|bôi thuốc|bôi kem|thoa gì)\b/)],
  ["define", VN(/\b(là gì|là bệnh gì|là sao|nghĩa là gì|có nghĩa|hiểu như thế nào|khái niệm|định nghĩa|có phải là|giải thích|khác gì|khác nhau|phân biệt)\b/)],
];
const CHARS_ACC_CHUA = VR(/(?<![\p{L}])chữa(?![\p{L}])/u);
// Câu hỏi về MỘT MÓN cụ thể: "ăn X được không", "uống X có sao không", "X có ăn được không", "có nên ăn X".
const FOOD_Q = VN(/\b(?:ăn|uống|dùng|nấu|nhậu|cho (?:vào|thêm)|bổ sung|dùng kèm|ăn thêm|ăn nhiều|uống nhiều)\s+((?:\S+\s){0,3}?\S+?)\s+(?:có |thì |nữa )?(?:được|dc|đc|có sao|có tốt|có nên|có hại|có ảnh hưởng|có kiêng|ko|không|k|hông|hong|nhé|nhe|nha|chứ)\b/);
const FOOD_Q2 = VN(/\b((?:\S+\s){0,3}?\S+?)\s+(?:có |thì )?(?:ăn|uống|dùng) (?:được|dc|đc|có sao|có tốt)/);
const OVERVIEW_ASK = VN(/\b(nói về|tìm hiểu về|hỏi về|giới thiệu|biết gì về|biết về|có biết)\b/);
const FILL = new Set("thi la nao nay do kia nua luon cung hay minh toi tui em anh chi ban co cac nhung mot it nhieu gi sao the cai vu dieu chuyen no".split(" "));
// "hôm nay ăn gì", "trưa nay ăn gì" là nhờ gợi ý món — không phải hỏi kiêng cữ của bệnh đang nói.
const MEAL_SUGGEST = VN(/\b(hôm nay|tối nay|trưa nay|sáng nay|chiều nay|bây giờ|giờ này|lát nữa|bữa nay)\b/);

/** Món / thứ được hỏi ("gout ăn nhộng được không" → "nhong"). Trả về chuỗi đã bỏ dấu, hoặc null. */
export function foodPhrase(text: string, topic?: MedTopic | null): string | null {
  let n = normalizeVi(text);
  if (topic) for (const nm of topic.names) n = ` ${n} `.replace(` ${normalizeVi(nm)} `, " ").trim();
  const m = n.match(FOOD_Q) ?? n.match(FOOD_Q2);
  if (!m) return null;
  // Chỉ bỏ chữ đệm ở HAI ĐẦU — chữ ở giữa là một phần tên món ("nước CÓ ga", "trà CÓ đường").
  const words = m[1].split(" ").filter(Boolean);
  while (words.length && FILL.has(words[0])) words.shift();
  while (words.length && FILL.has(words[words.length - 1])) words.pop();
  const p0 = words.join(" ").trim();
  const p = normalizeVi(foodSyn(p0)); // "cf" → "ca phe"
  return p.length >= 2 ? p : null;
}
/** Cụm món đúng như người dùng gõ (có dấu) — để nói lại "nhộng" chứ không phải "nhong". */
export function foodDisplay(text: string, phrase: string): string {
  const orig = text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const b = orig.map((w) => normalizeVi(w));
  const want = phrase.split(" ");
  for (let i = 0; i + want.length <= b.length; i++) if (want.every((w, j) => b[i + j] === w)) return orig.slice(i, i + want.length).join(" ");
  for (const [, to] of FOOD_SYN) if (normalizeVi(to) === phrase) return to;
  return phrase;
}
/** Món trong thẻ khớp với cụm đã hỏi (theo tên hoặc tên gọi khác). */
export function matchFood(t: MedTopic, phrase: string, shown?: string): MedFood | null {
  if (!t.diet || !phrase) return null;
  const p = ` ${phrase} `;
  // Chữ người dùng đã gõ dấu thì dấu phải khớp: "đậu rang" không phải "dâu", "nấm" không phải "nâm".
  const sa = shown ? acc(shown) : null;
  let best: { f: MedFood; len: number } | null = null;
  for (const f of t.diet.foods)
    for (const nm of [f.name, ...f.aliases]) {
      const k = normalizeVi(nm);
      if (k.length < 2) continue;
      // Tên món MỘT chữ ("đậu", "cá") chỉ khớp khi người dùng hỏi đúng món đó — "đậu rang", "đậu hũ" chưa chắc thuộc nhóm nguồn nêu.
      const single = !k.includes(" ") && k !== phrase;
      // 15/10: món được hỏi nằm TRONG tên món của thẻ ("gà" trong "thịt gà") — chữ nào người dùng gõ dấu thì dấu phải đúng
      //   ở chính chỗ đó: "gà" không phải "ga" trong "nước ngọt có ga".
      const hit = single ? false : p.includes(` ${k} `) ? !sa || accentAgrees(sa, acc(nm)) : bare(k).includes(p) ? !sa || typedAccentsAt(acc(nm), sa) : false;
      if (hit) {
        if (!best || k.length > best.len) best = { f, len: k.length };
      }
    }
  return best?.f ?? null;
}

/** Cụm người dùng gõ (sa) nằm trong tên món (nameAcc): có một chỗ khớp mà mọi chữ người dùng ĐÃ gõ dấu đều đúng dấu. */
function typedAccentsAt(nameAcc: string, sa: string): boolean {
  const nw = nameAcc.trim().split(" ");
  const tw = sa.trim().split(" ");
  const nb = nw.map((w) => canon(normalizeVi(w)));
  const tb = tw.map((w) => canon(normalizeVi(w)));
  for (let i = 0; i + tb.length <= nb.length; i++) {
    let ok = true;
    for (let j = 0; j < tb.length && ok; j++) {
      if (nb[i + j] !== tb[j]) ok = false;
      else if (isAccented(tw[j]) && wordKey(tw[j]) !== wordKey(nw[i + j])) ok = false;
    }
    if (ok) return true;
  }
  return false;
}

// 15/10: cách gọi tắt / tiếng Anh của món hay gặp → tên món trong thẻ ("cf" = cà phê).
const FOOD_SYN: [RegExp, string][] = [[VR(/^(cf|cafe|caphe|cafè|coffee|coffe|cà fê|ca fe)$/), "cà phê"]];
/** Đổi cách gọi tắt của món sang tên đầy đủ (giữ nguyên nếu không có). */
export function foodSyn(shown: string): string {
  const k = shown.normalize("NFC").toLowerCase().trim();
  for (const [re, to] of FOOD_SYN) if (re.test(k)) return to;
  return shown;
}

export function aspectOf(text: string): MedAspect | null {
  // không qua canon(): canon đổi "xử lý" thành "xu li" làm lọt khía cạnh "xử lý".
  // 11/10: "… để làm gì" hỏi MỤC ĐÍCH của một thứ ("uống aspirin để làm gì", "đo huyết áp để làm gì") — không phải hỏi "nên làm gì" với bệnh.
  const n = ` ${normalizeVi(text)} `.replace(VN(/ để làm (gì|chi) /g), " ");
  // "có chữa khỏi không", "bao lâu thì khỏi" là hỏi DIỄN TIẾN (có khỏi không), không phải hỏi cách chữa.
  if (VN(/\b(chữa khỏi|chưa khỏi|khỏi được|khỏi không|khỏi hẳn|có khỏi|bao lâu khỏi|bao lâu thì khỏi|khỏi chưa)\b/).test(n)) return "course";
  if (CHARS_ACC_CHUA.test(text.normalize("NFC").toLowerCase())) return "care";
  for (const [a, re] of ASPECTS) if (re.test(n)) return a;
  return null;
}

// ── Câu hỏi KIẾN THỨC hay đang KỂ chuyện của mình? ──
const SELF_STATE = VN(/^(?:\s)?(?:a|anh|e|em|c|chị|mình|tôi|tui|tớ)\s+(?:đang |cũng |hay |bị |mới |vừa |lại |vẫn |thường )*(?:bị|mắc|có|hay|thấy|cảm thấy|đang|bị)\b/);
const QWORD0 = VN(/\b(gì|là gì|thế nào|như nào|ra sao|sao không|được không|có không|có được|nên|nguyên nhân|triệu chứng|dấu hiệu|kiêng|làm sao|bao lâu|có nguy hiểm|có lây|có khỏi|có phải|tại sao|vì sao|khi nào|ở đâu|nghĩa|giải thích|tìm hiểu|hỏi về|nói về)\b/);
// "không / chưa" giữa câu là phủ định ("ngủ không được, đầu cứ nghĩ…"); chỉ đứng CUỐI câu mới là từ hỏi ("ăn nhộng đc k").
const QWORD = { test: (x: string) => QWORD0.test(x) || VN(/(?:^| )(?:không|ko|k|hông|hong|chưa) *$/).test(x) };
/** Có phải câu HỎI kiến thức (không phải câu kể "a bị gout" hay tâm sự "a hay lo âu")? Có ? / từ hỏi / khía cạnh rõ / chỉ nêu tên chủ đề. */
export function isMedQuestion(text: string, topicNames: string[] = []): boolean {
  const n = normalizeVi(text);
  const words = n.split(" ").length;
  const asp = aspectOf(text);
  const hasQ = text.includes("?") || QWORD.test(` ${n} `);
  if (OVERVIEW_ASK.test(n)) return true;
  if (asp && hasQ) return true;
  if (asp && !SELF_STATE.test(n)) return true;
  // chỉ nêu tên: "bệnh gout", "tự kỷ ám thị", "gout á"
  const rest = topicNames.reduce((acc2, nm) => acc2.replace(normalizeVi(nm), " "), n).replace(VN(/\b(bệnh|chứng|hội chứng|rối loạn|á|à|a|ạ|hả|ha|nha|nhé|nhe|nè|đó|vậy|thế|là|cái|việc|tình trạng|bị)\b/g), " ").replace(/\s+/g, " ").trim();
  if (topicNames.length && rest === "" && words <= 4) return true;
  // 15/10: kể kèm thời gian mắc bệnh ("a bị mỡ máu 3 năm rồi", "mẹ bị gout lâu rồi") vẫn là nêu tên bệnh → tóm tắt thẻ có nguồn
  //   (trước đây rơi về bảng cũ, nói "chưa có thông tin riêng" dù kho có thẻ).
  const restNoTime = rest.replace(VN(/\b((\d+|một|hai|ba|bốn|năm|mấy|vài|nhiều) (ngày|tuần|tháng|năm)( nay| rồi| trời)?|lâu rồi|lâu năm|từ lâu|mấy năm nay|rồi|nay|cũng|đã|lâu)\b/g), " ").replace(/\s+/g, " ").trim();
  if (topicNames.length && restNoTime === "" && words <= 9) return true;
  // tên + cụm bổ nghĩa ngắn: "tăng động giảm chú ý ở người lớn", "trầm cảm sau sinh", "gout cho người già"
  if (topicNames.length && words <= 9 && !SELF_STATE.test(n) && VN(/^(?:ở|cho|khi|trên|sau|trước|trong) \S+(?: \S+){0,2}$/).test(rest)) return true;
  // có từ hỏi + tên chủ đề nhưng không rõ khía cạnh ("ADHD người lớn có không", "tay chân miệng ở người lớn có không") → tóm tắt chủ đề.
  if (hasQ && topicNames.length && !SELF_STATE.test(n) && !foodPhrase(text)) return true;
  // câu kể có hỏi kèm ("a bị gout ăn nhộng được không") — phần hỏi là món
  if (hasQ && foodPhrase(text) && !VN(/^(?:a|anh|e|em)\s+(?:ko|không)\b/).test(n)) return true;
  return false;
}

// ── Dựng lời đáp (ghép hoàn toàn từ dữ liệu có nguồn) ──
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const bl = (fs: DrugFact[], max = 99) => fs.slice(0, max).map((f) => `• ${f.text}`).join("\n");
const srcs = (...g: DrugFact[][]) => g.flat().flatMap((f) => f.src);
const title = (t: MedTopic) => `**${cap(t.names[0])}**`;
// Lời dặn an toàn nằm trong ghi chú của món (vd mật ong "không dùng cho trẻ dưới 1 tuổi") — tóm theo món vẫn phải giữ lại.
const CAUTION = VR(/(không (?:dùng|cho|nên|được)|tránh cho|trẻ (?:dưới|nhỏ|em|sơ sinh)|mang thai|bà bầu|cho con bú|dị ứng)/i);
function caution(note: string): string {
  const s = note.split(/(?<=[.;])\s+|;\s*/).find((x) => CAUTION.test(x));
  return s ? ` (${s.replace(/[.;]\s*$/, "").trim().replace(/^./, (c) => c.toLowerCase())})` : "";
}
const LAB: Record<string, string> = { avoid: "🚫 Nên tránh", limit: "⚠️ Nên hạn chế", ok: "✅ Được (theo nguồn)", good: "👍 Nên ăn / uống" };

export type MedReply = { text: string; quick: string[]; aspect: MedAspect | "overview" | "focus"; partial?: boolean; topic: MedTopic };

// ── Hỏi đúng MỘT Ý trong thẻ ("thuốc lá điện tử có giúp bỏ không", "polyp có thành ung thư không") ──
// Không rõ khía cạnh → tìm trong thẻ các ý chứa đúng cụm từ người dùng hỏi (cặp chữ liền nhau, bỏ tên chủ đề và chữ đệm).
const FOCUS_STOP = new Set(
  "a ah ai anh ba bao be bi biet bo ca cac cai can cho chi chu co con cua cung da dang de den di do duoc dc em gi giup gio ha hay hoi hon hong k khi khong kia ko la lai lam luc ma minh moi mot nay nao ne neu nen nha nhe nhi nhieu nhu nhung no nua o oi phai qua ra rang rat roi sao se sau tai the thi tho thuong toi tren tu tui va van vay ve voi vo xem ban benh chung loai nguoi".split(" "),
);
function focusTerms(t: MedTopic, text: string): { terms: string[]; shown: string[] } {
  const orig = text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const b = orig.map((w) => normalizeVi(w));
  const cut = new Array(b.length).fill(false);
  for (const nm of t.names) {
    const want = normalizeVi(nm).split(" ");
    for (let i = 0; i + want.length <= b.length; i++) if (want.every((w, j) => b[i + j] === w)) for (let j = 0; j < want.length; j++) cut[i + j] = true;
  }
  const terms: string[] = [];
  const shown: string[] = [];
  for (let i = 0; i + 1 < b.length; i++) {
    // (15/10: cặp chữ toàn là số — "9.0" thành "9 0" — không phải một "ý" để dò trong thẻ; trước đây Lomi đáp "Ý “9 0” bạn hỏi…".)
    if (cut[i] || cut[i + 1] || FOCUS_STOP.has(b[i]) || FOCUS_STOP.has(b[i + 1]) || /^\d+$/.test(b[i]) || /^\d+$/.test(b[i + 1])) continue;
    terms.push(`${b[i]} ${b[i + 1]}`);
    shown.push(`${orig[i]} ${orig[i + 1]}`);
  }
  return { terms, shown };
}
function allFacts(t: MedTopic): DrugFact[] {
  return [...t.about, ...t.signs, ...t.causes, ...t.course, ...t.care, ...(t.diet ? [...t.diet.avoid, ...t.diet.ok] : []), ...t.doctor, ...t.emergency];
}
/** Các ý trong thẻ nói đúng điều được hỏi (rỗng nếu không có ý nào). */
export function focusFacts(t: MedTopic, text: string): { facts: DrugFact[]; shown: string[]; asked?: string[] } {
  const { terms, shown } = focusTerms(t, text);
  // Tên cụ thể hơn chứa một tên chung của cùng thẻ ("thuốc lá điện tử" ⊃ "thuốc lá") → phần thêm ("điện tử", ≥ 2 chữ) là trọng tâm.
  const nq = ` ${normalizeVi(text)} `;
  const named = t.names.map((n) => normalizeVi(n)).filter((n) => nq.includes(` ${n} `));
  const special: string[] = [];
  for (const L of named)
    for (const S of named) {
      if (L === S || !` ${L} `.includes(` ${S} `)) continue;
      const extra = ` ${L} `.replace(` ${S} `, " ").trim();
      if (extra.split(" ").length >= 2 && !special.includes(extra)) special.push(extra);
    }
  const facts = allFacts(t);
  const hay = facts.map((f) => ` ${normalizeVi(f.text)} `);
  if (!terms.length && !special.length) return { facts: [], shown: [] };
  const score = hay.map((h) => terms.filter((x) => h.includes(` ${x} `)).length + special.filter((n) => h.includes(` ${n} `)).length * 2);
  const best = Math.max(0, ...score);
  if (!best) return { facts: [], shown: [], asked: [...special.map((n) => nameShown(text, n)), ...shown] };
  const used = shown.filter((_, i) => hay.some((h) => h.includes(` ${terms[i]} `)));
  const pick = facts.filter((_, i) => score[i] === best).filter((f, i, a) => a.findIndex((g) => g.text === f.text) === i).slice(0, 4);
  return { facts: pick, shown: [...special.map((n) => nameShown(text, n)), ...used] };
}
function nameShown(text: string, bareName: string): string {
  const orig = text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const b = orig.map((w) => normalizeVi(w));
  const want = bareName.split(" ");
  for (let i = 0; i + want.length <= b.length; i++) if (want.every((w, j) => b[i + j] === w)) return orig.slice(i, i + want.length).join(" ");
  return bareName;
}

function chipsOf(t: MedTopic, skip?: string): string[] {
  const N = cap(t.names[0]);
  const all: [string, boolean][] = [
    [`${N} là gì?`, t.about.length > 0 && skip !== "define"],
    [`${N} nên làm gì?`, t.care.length > 0 && skip !== "care"],
    [["condition", "infection", "women", "child", "cancer"].includes(t.kind) ? `${N} kiêng gì?` : `Ăn uống thế nào?`, !!t.diet && (t.diet.avoid.length + t.diet.ok.length + t.diet.foods.length) > 0 && skip !== "diet"],
    [`Triệu chứng của ${t.names[0]}`, t.signs.length > 0 && skip !== "signs"],
    [`Khi nào cần đi khám?`, (t.doctor.length > 0 || t.emergency.length > 0) && skip !== "doctor"],
    [`Nguyên nhân`, t.causes.length > 0 && skip !== "causes"],
  ];
  return all.filter(([, ok]) => ok).map(([c]) => c).slice(0, 5);
}

const TERM_HINT = (t: MedTopic) => (t.disambiguation ? `${t.disambiguation}\n\n` : "");

/** Lời đáp cho một khía cạnh của một thẻ. food = cụm món được hỏi (đã bỏ dấu) nếu aspect là "food". */
export function renderMed(t: MedTopic, aspect: MedAspect | "overview", food?: string | null, now = Date.now(), shown?: string, question?: string): MedReply {
  const N = title(t);
  const end = (used: DrugFact[][]) => `${sourceLine(t, srcs(...used), now)}`;
  const out = (text: string, a: MedReply["aspect"], partial = false): MedReply => ({ text, aspect: a, partial, topic: t, quick: chipsOf(t, a === "overview" ? undefined : a === "food" ? "diet" : a) });

  if (aspect === "food" && food) {
    const f = matchFood(t, food, shown);
    if (f) {
      const say = f.verdict === "avoid" ? "nên **tránh**" : f.verdict === "limit" ? "nên **hạn chế**" : f.verdict === "good" ? "là món **nên ăn**" : "**được**";
      const body = `Với ${N}: **${f.name}** ${say}.\n${f.note}${normalizeVi(f.name) !== food ? `\n(Lomi hiểu “${shown ?? food}” thuộc nhóm “${f.name}” theo cách nguồn phân nhóm.)` : ""}`;
      return out(`${body}\n\n${sourceLine(t, f.src, now)}`, "food");
    }
    // Chưa có nguồn nói về đúng món này → nói thẳng, đưa nguyên tắc chung CÓ nguồn.
    const gen = t.diet && (t.diet.avoid.length || t.diet.ok.length) ? [t.diet.avoid[0], t.diet.ok[0]].filter(Boolean) as DrugFact[] : [];
    const say = `Về **${shown ?? food}** thì Lomi **chưa xác minh được**: các nguồn y khoa Lomi đã đối chiếu cho ${N} không nêu riêng món này, nên Lomi không dám nói được hay không.`;
    const tail = gen.length ? `\n\nNguyên tắc chung theo nguồn:\n${bl(gen)}\n\nMuốn chắc về món này, bạn hỏi bác sĩ hoặc chuyên viên dinh dưỡng đang theo dõi bạn nha.\n\n${end([gen])}` : `\n\nBạn hỏi bác sĩ hoặc chuyên viên dinh dưỡng nha.`;
    return out(say + tail, "food", true);
  }
  if (aspect === "diet") {
    if (!t.diet || !(t.diet.avoid.length || t.diet.ok.length || t.diet.foods.length)) {
      // (bỏ các ý về thuốc: "corticoid uống" không phải chuyện ăn uống)
      const eat = t.care.filter((f) => VR(/(^|[^\p{L}])(ăn|uống|bú|thức ăn|đồ ăn|bù nước|oresol)(?![\p{L}])/iu).test(f.text) && !VR(/thuốc|corticoid|kháng sinh|kháng virus/iu).test(f.text));
      // 15/10: hỏi "kiêng gì" mà nguồn không có chuyện ăn uống — vẫn nêu những điều nguồn DẶN TRÁNH (sinh hoạt, vận động, thuốc…),
      //   vì "kiêng" với người hỏi thường là kiêng cả việc chứ không chỉ món ăn ("mới cắt bao quy đầu kiêng gì").
      //   (chỉ khi nguồn không nhắc chuyện ăn uống nào — có thì chỉ đưa phần ăn uống như trước.)
      const dont = eat.length ? [] : t.care.filter((f) => VR(/(^|[^\p{L}])(tránh|không nên|đừng|không được|kiêng|hạn chế|ngưng|nghỉ)(?![\p{L}])/iu).test(f.text));
      if (eat.length || dont.length)
        return out(
          [
            `Các nguồn y khoa Lomi đã đối chiếu **không có danh sách kiêng cữ riêng** cho ${N}${dont.length ? " (không nêu món ăn nào phải kiêng)" : ""}.`,
            eat.length ? `Phần chăm sóc có nhắc tới ăn uống thế này:\n${bl(eat, 5)}` : "",
            dont.length ? `Những điều nguồn dặn **nên tránh / lưu ý**:\n${bl(dont, 5)}` : "",
            "Muốn chắc về món cụ thể, bạn hỏi bác sĩ hoặc chuyên viên dinh dưỡng nha.",
            end([eat, dont]),
          ].filter(Boolean).join("\n\n"),
          "diet",
          true,
        );
      return out(`Các nguồn y khoa Lomi đã đối chiếu **không nêu cách ăn uống riêng** cho ${N}, nên Lomi không đưa ra danh sách kiêng cữ. Nếu bạn lo về ăn uống, hỏi bác sĩ hoặc chuyên viên dinh dưỡng nha.`, "diet", true);
    }
    const groups = (["avoid", "limit", "good", "ok"] as const)
      .map((v) => {
        const fs = t.diet!.foods.filter((f) => f.verdict === v);
        return fs.length ? `${LAB[v]}: ${fs.map((f) => f.name + caution(f.note)).join(", ")}` : "";
      })
      .filter(Boolean)
      .join("\n");
    const general = [bl(t.diet.avoid), bl(t.diet.ok)].filter(Boolean).join("\n");
    const used = [t.diet.avoid, t.diet.ok, t.diet.foods.map((f) => ({ text: f.name, src: f.src }))];
    return out([`🍽️ Ăn uống với ${N}, theo các nguồn y khoa:`, general, groups && `Tóm theo món:\n${groups}`, "Hỏi món cụ thể kiểu “ăn … được không” — món nào nguồn có nêu thì Lomi nói, không có thì Lomi nói thẳng là chưa xác minh được.", end(used)].filter(Boolean).join("\n\n"), "diet");
  }
  if (aspect === "meds") {
    const med = t.care.filter((c) => VR(/thuốc/i).test(c.text));
    return out([`💊 Về thuốc cho ${N}: Lomi **không kê thuốc hay nêu liều** — dùng thuốc nào là do bác sĩ quyết định sau khi khám.`, med.length ? `Theo nguồn:\n${bl(med, 3)}` : "", end([med])].filter(Boolean).join("\n\n"), "meds");
  }
  const sect = (head: string, fs: DrugFact[], a: MedAspect, cut = 99, none?: string) => {
    if (!fs.length) return out(none ?? `Các nguồn Lomi đã đối chiếu cho ${N} **không nêu phần này**, nên Lomi chưa xác minh được. Bạn hỏi bác sĩ để chắc nha.`, a, true);
    return out([head, bl(fs, cut), end([fs])].join("\n\n"), a);
  };
  if (aspect === "signs") return sect(`🩺 Dấu hiệu thường gặp của ${N}:`, t.signs, "signs");
  if (aspect === "causes") return sect(`🔎 Nguyên nhân và yếu tố nguy cơ của ${N}:`, t.causes, "causes");
  if (aspect === "course") return sect(`📈 Diễn tiến của ${N}:`, t.course, "course");
  if (aspect === "spread") {
    // "có lây không": gom các ý nói về lây truyền (thẻ ghi ở nguyên nhân / diễn tiến / phòng ngừa); không có thì nói thẳng.
    const fs = [...t.causes, ...t.course, ...t.care].filter((f) => VR(/lây|truyền|nhiễm từ|qua đường|tiếp xúc/i).test(f.text));
    return sect(`🦠 Về chuyện lây của ${N}:`, fs, "spread", 6, `Các nguồn Lomi đã đối chiếu cho ${N} **không nói về chuyện lây**, nên Lomi chưa xác minh được. Bạn hỏi bác sĩ để chắc nha.`);
  }
  if (aspect === "care") {
    const r = sect(`🌿 Với ${N}, theo các nguồn y khoa nên:`, t.care, "care");
    // Sơ cứu (thẻ "other": bỏng, chó cắn, đuối nước…): nói luôn khi nào phải đi cấp cứu / đi khám — đừng bắt hỏi thêm một lượt.
    if (!r.partial && t.kind === "other" && (t.emergency.length || t.doctor.length)) {
      const urg = [t.emergency.length ? `🚨 Gọi **115** / đi cấp cứu ngay khi:\n${bl(t.emergency, 4)}` : "", t.doctor.length ? `🧑‍⚕️ Nên đi khám khi:\n${bl(t.doctor, 3)}` : ""].filter(Boolean).join("\n\n");
      r.text = [`🌿 Với ${N}, theo các nguồn y khoa nên:`, bl(t.care), urg, end([t.care, t.emergency.slice(0, 4), t.doctor.slice(0, 3)])].join("\n\n");
    }
    // Hỏi cách chữa → luôn nói rõ giới hạn: Lomi không kê thuốc / liều (trừ thẻ thuật ngữ, vd "thiền", "CBT").
    if (!r.partial && t.kind !== "term" && t.kind !== "other") r.text = r.text.replace(/\n\n📚/, "\n\n💊 Lomi không kê thuốc hay nêu liều — dùng thuốc nào là do bác sĩ quyết định sau khi khám.\n\n📚");
    return r;
  }
  if (aspect === "doctor" || aspect === "emergency") {
    const fs = [...t.doctor, ...t.emergency];
    if (!fs.length) return sect("", [], "doctor", 0, `Các nguồn Lomi đã đối chiếu cho ${N} **không nêu rõ khi nào cần đi khám**. Nếu bạn thấy lo, hoặc triệu chứng nặng lên, kéo dài, đi khám là cách an toàn nhất nha.`);
    return out(
      [
        t.doctor.length ? `🧑‍⚕️ Nên đi khám với ${N} khi:\n${bl(t.doctor)}` : "",
        t.emergency.length ? `🚨 Cần xử trí **khẩn** khi:\n${bl(t.emergency)}\n(Ở Việt Nam gọi **115** hoặc tới cơ sở y tế gần nhất.)` : "",
        end([t.doctor, t.emergency]),
      ].filter(Boolean).join("\n\n"),
      aspect,
    );
  }
  if (aspect === "define") {
    const body = t.about.length ? bl(t.about) : "";
    return out([TERM_HINT(t) + (body ? `📖 ${N} là gì:\n${body}` : `📖 ${N}`), end([t.about])].join("\n\n").replace(/^\n+/, ""), "define");
  }
  // Không rõ khía cạnh nhưng hỏi đúng một ý có trong thẻ → đưa đúng các ý đó.
  if (question) {
    const fc = focusFacts(t, question);
    if (fc.facts.length) {
      const what = fc.shown.length ? ` (“${[...new Set(fc.shown)].slice(0, 2).join("”, “")}”)` : "";
      return out([`🔎 Về điều bạn hỏi${what}, nguồn về ${N} nói:`, bl(fc.facts), end([fc.facts])].join("\n\n"), "focus");
    }
    // Hỏi một ý cụ thể mà thẻ không có ("sốt xuất huyết có cần truyền nước không") → nói thẳng là chưa xác minh được, rồi mới tóm tắt.
    if (fc.asked?.length && hasQuestion(question)) {
      const ov = renderMed(t, "overview", null, now);
      ov.text = `Ý “${fc.asked[0]}” bạn hỏi thì các nguồn Lomi đã đối chiếu cho ${N} **chưa nói rõ**, nên Lomi chưa xác minh được — bạn hỏi bác sĩ để chắc nha.\n\nDưới đây là phần Lomi đã kiểm chứng:\n\n${ov.text.replace(VR(/^Về .*? như sau:\n\n/), "")}`;
      ov.partial = true;
      return ov;
    }
  }
  // overview: tóm tắt ngắn + mời chọn phần muốn xem
  const bits = [t.about[0] && `📖 ${t.about[0].text}`, t.signs.length ? `🩺 Dấu hiệu thường gặp:\n${bl(t.signs, 3)}` : "", t.doctor[0] ? `🧑‍⚕️ ${t.doctor[0].text}` : ""].filter(Boolean);
  return out([`${TERM_HINT(t)}Về ${N}, Lomi có kiến thức đã kiểm chứng như sau:`, ...bits, end([t.about.slice(0, 1), t.signs.slice(0, 3), t.doctor.slice(0, 1)]), "Bạn muốn xem kỹ phần nào? Chọn bên dưới nha 👇"].join("\n\n"), "overview");
}

/** Tên chủ đề đúng như người dùng gõ (giữ dấu, giữ chữ hoa/thường) — để nói lại "bạn đang bị **gout**". */
export function nameAsTyped(text: string, id: string): string | null {
  const row = ROWS.find((r) => r.id === id);
  if (!row) return null;
  const orig = text.normalize("NFC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const b = orig.map((w) => canon(normalizeVi(w)));
  for (const nm of [...row.names].sort((x, y) => y.length - x.length)) {
    const want = canon(normalizeVi(nm)).split(" ");
    for (let i = 0; i + want.length <= b.length; i++) if (want.every((w, j) => b[i + j] === w)) return orig.slice(i, i + want.length).join(" ");
  }
  return null;
}
/** Người dùng tự nói mình đang mắc ("a bị gout", "em bị trầm cảm") chứ không hỏi kiến thức chung. */
export const isSelfStatement = (text: string) => SELF_STATE.test(normalizeVi(text));
/** Câu có dạng câu hỏi (dấu ? hoặc từ hỏi). */
export const hasQuestion = (text: string) => text.includes("?") || QWORD.test(` ${normalizeVi(text)} `);

export type MedState = { id: string; aspect?: string };
// ── Hỏi NGƯỢC theo món (14/10, theo ý Kir): "có bệnh gì kiêng ăn cá không", "dưa leo thì bệnh gì không được ăn",
//    "ai không nên ăn măng". Lomi dò MỌI thẻ có hướng dẫn ăn uống, gom những bệnh mà nguồn có nêu đúng món đó
//    (tránh / hạn chế / ăn được / nên ăn), kèm nguồn. Món mà không thẻ nào nêu → nói thật là nguồn chưa nêu bệnh nào.
const R_SUBJ = String.raw`(?:có )?(?:những )?(?:người bị bệnh|người bệnh|bị bệnh|bệnh|người|đối tượng|ai)(?: (?:gì|nào))?`;
const R_VERB = String.raw`(?:(?:thì|phải|cần|nên|bị|hay|là) )*(?:kiêng cữ|kiêng|cữ|cấm|tránh|hạn chế|kỵ|kị|(?:không|ko|k|chẳng|chả) (?:được|đc|dc|nên|ăn được|ăn đc|uống được|hợp))`;
const R_TAIL = String.raw`(?: (?:không|ko|k|hông|vậy|nhỉ|ạ|à|nhé|nha|thế|hả|ha|ta|đâu|z|nữa|ăn|uống))*$`;
const REV_A = VN(new RegExp(String.raw`^(?:cho (?:mình|em|tôi|tui|anh|chị) hỏi |hỏi |vậy )?${R_SUBJ} ${R_VERB}(?: (?:ăn|uống|dùng))? (.+?)${R_TAIL}`));
const REV_B = VN(new RegExp(String.raw`^(?:ăn |uống )?(.+?) (?:thì |có |là |này )*(?:${R_SUBJ} ${R_VERB}(?: (?:ăn|uống|dùng))?|(?:kiêng|kỵ|kị|cữ|hại cho|có hại cho|không tốt cho|không hợp với|không hợp cho) (?:với )?(?:bệnh gì|bệnh nào|ai|người nào|những ai|người bệnh gì|người bị bệnh gì))${R_TAIL}`));
const REV_LEAD = VN(/^(?:các loại|các món|món|đồ|quả|trái|con|loại) /);

/** Câu hỏi ngược "món X kiêng với bệnh gì" → món được hỏi (phrase = không dấu, shown = như người dùng gõ). */
export function foodReverseAsk(text: string): { phrase: string; shown: string } | null {
  const n = normalizeVi(text);
  const m = n.match(REV_A) ?? n.match(REV_B);
  if (!m) return null;
  const p = m[1].replace(REV_LEAD, "").trim();
  const words = p.split(" ").filter(Boolean);
  if (!words.length || words.length > 5 || p.length < 2) return null;
  // "bệnh gout kiêng gì" không phải hỏi ngược — câu nhắc một bệnh có thẻ thì để lớp hỏi theo bệnh trả lời.
  if (findMedTopicId(text) || VN(/\b(gì|nào|bệnh|ai)\b/).test(p)) return null;
  const shown = foodSyn(foodDisplay(text, p));
  return { phrase: normalizeVi(shown), shown };
}

// 15/10: vừa trả lời một món của một bệnh mà người dùng nhắc lại / sửa lại món ("gà mà", "ý a là gà", "còn gà?") → cụm món đó.
const RETRY_TAIL = String.raw`(?: (?:mà|á|à|thôi|nha|nhé|đó|chứ|nè|kìa|ạ|cơ|đâu|được không|được ko|đc không|đc k|đc ko|được k|thì sao|thì|nữa|ấy))`;
const RETRY_RE = VN(new RegExp(String.raw`^(?:(?:(?:ý|tui|tôi|mình|em|anh|a|e|chị|c) (?:hỏi|nói|là|hỏi là|nói là)|còn|vậy còn|thế còn|còn món) (.+?)${RETRY_TAIL}*|(?:(?:hỏi|nói|là|ăn|uống|vậy|thế) )?(.+?)${RETRY_TAIL}+)$`));
/** Câu ngắn chỉ nêu lại một món (kèm "mà / á / thì sao…") → món như người dùng gõ, hoặc null. */
export function foodRetryPhrase(text: string): string | null {
  const n = normalizeVi(text);
  const m = n.match(RETRY_RE);
  if (!m) return null;
  const p = (m[1] ?? m[2]).replace(REV_LEAD, "").trim();
  const w = p.split(" ").filter(Boolean);
  if (!w.length || w.length > 3 || VN(/\b(gì|nào|sao|ai|vậy|thế|lomi|em|anh|chị|bạn|mình|tôi|tui|ok|ừ|vâng|dạ|đúng|rồi|không|ko)\b/).test(p)) return null;
  return foodSyn(foodDisplay(text, p));
}

// Câu NỐI sau một lời đáp hỏi ngược: "măng thì sao?", "còn cua?", "vậy trứng thì sao", "gout thì sao" → món / bệnh được hỏi tiếp.
const REV_FOLLOW = VN(/^(?:còn|vậy|thế|rồi|với|thế còn|vậy còn|còn món|còn với)? ?(.+?)(?: (?:thì sao|thì thế nào|thì như nào|thì sao nhỉ|sao|thì|nữa|thì được không|được không|có sao không|có kiêng không|thì kiêng không|thì có kiêng không))?(?: (?:nhỉ|ạ|à|nha|vậy|ta|z|hả|ha))*$/);
const FOLLOW_CUE = VN(/^(?:còn|vậy|thế|rồi|với) |(?: thì sao| thì thế nào| thì như nào| thì| nữa| được không| có sao không| kiêng không| sao)(?: (?:nhỉ|ạ|à|nha|vậy|ta|z|hả|ha))*$/);
/** Câu nối ngắn sau lời đáp hỏi ngược theo món → cụm được hỏi tiếp (như người dùng gõ), hoặc null. */
export function foodFollowPhrase(text: string): string | null {
  const n = normalizeVi(text);
  if (!FOLLOW_CUE.test(n)) return null;
  const m = n.match(REV_FOLLOW);
  if (!m) return null;
  const p = m[1].replace(REV_LEAD, "").trim();
  const w = p.split(" ").filter(Boolean);
  if (!w.length || w.length > 4 || VN(/\b(gì|nào|sao|ai|vậy|thế|lomi|em|anh|chị|bạn|mình|tôi|tui)\b/).test(p)) return null;
  return foodSyn(foodDisplay(text, p));
}

const pubShort = (p: string) => p.replace(/\s*\(.*\)\s*$/, "");
type RevHit = { t: MedTopic; f: MedFood; key: string };
// Chỉ những tiếng chỉ NHÓM món mới được hiểu rộng ra món cụ thể ("cá" → "cá kiếm", "thịt" → "thịt bò"). Tiếng khác thì không:
// "măng" không phải "măng tây", "cà" không phải "cà phê", "sữa" không phải "sữa đậu nành".
const REV_GROUP = new Set(["cá", "thịt", "tôm", "cua", "hải sản", "trứng", "rau", "hạt", "ốc", "sò"]);
/** Món được hỏi có phải một tiếng chỉ nhóm không — so ĐÚNG DẤU ("cà" không phải "cá"); gõ không dấu thì chỉ nhận khi không lẫn. */
const isGroup = (shown: string) => {
  const s = shown.normalize("NFC").toLowerCase().trim();
  if (REV_GROUP.has(s)) return true;
  return s === normalizeVi(s) && s !== "ca" && [...REV_GROUP].some((g) => normalizeVi(g) === s);
};
/** Tên món trong thẻ khớp với món được hỏi → trả về đúng tên đã khớp (để nói lại), không khớp → null. */
function revMatch(f: MedFood, phrase: string, shown: string): string | null {
  const qq = canon(phrase).split(" ");
  const keys = [f.name, ...f.name.split(/, | và /), ...f.aliases];
  for (const nm of keys) {
    const k = canon(normalizeVi(nm)).split(" ").filter(Boolean);
    if (!k.length) continue;
    let hit = false;
    if (k.length === qq.length) hit = k.every((w, i) => w === qq[i]);
    else if (k.length > qq.length) hit = isGroup(shown) && qq.every((w, i) => w === k[i]); // hỏi "cá" → "cá kiếm"
    else hit = k.length >= 2 && k.every((w, i) => w === qq[i]); // hỏi "cà chua bi" → "cà chua"
    if (!hit) continue;
    // Chữ người dùng đã gõ dấu thì dấu phải đúng: "cá" ≠ "cà", "dưa" ≠ "dừa".
    const sw = shown.normalize("NFC").toLowerCase().split(/\s+/);
    const nw = nm.normalize("NFC").toLowerCase().split(/\s+/);
    if (sw.every((w, i) => i >= nw.length || !isAccented(w) || wordKey(w) === wordKey(nw[i]))) return nm;
  }
  return null;
}

export type FoodAcrossReply = { text: string; quick: string[]; partial: boolean; topics: string[] };
/** Lời đáp cho câu hỏi ngược: những bệnh mà nguồn có nêu món này. topics = mọi thẻ đã nạp. */
export function renderFoodAcross(topics: MedTopic[], phrase: string, shown: string, now = Date.now()): FoodAcrossReply {
  const S = shown.trim();
  const hits: RevHit[] = [];
  for (const t of topics)
    for (const f of t.diet?.foods ?? []) {
      const key = revMatch(f, phrase, S);
      if (key) hits.push({ t, f, key });
    }
  const withDiet = topics.filter((t) => t.diet && t.diet.foods.length).length;
  const pubs = (h: RevHit[]) => Array.from(new Set(h.flatMap(({ t, f }) => f.src.map((i) => t.sources[i]).filter(Boolean).map((s) => pubShort(s.publisher)))));
  const allergy = hits.filter((h) => h.t.id === "di-ung-thuc-pham");
  const rest = hits.filter((h) => h.t.id !== "di-ung-thuc-pham");
  const byTopic = (hs: RevHit[]) => {
    const m = new Map<string, RevHit[]>();
    for (const h of hs) m.set(h.t.id, [...(m.get(h.t.id) ?? []), h]);
    return [...m.values()];
  };
  const verdictWord: Record<MedFood["verdict"], string> = { avoid: "nên **tránh**", limit: "nên **hạn chế**", ok: "**ăn được**", good: "**nên ăn**" };
  const line = (hs: RevHit[]) => {
    const t = hs[0].t;
    const items = hs.map(({ f, key }) => `${verdictWord[f.verdict]}${normalizeVi(key) === phrase ? "" : ` (${key})`}`).filter((x, i, a) => a.indexOf(x) === i).join("; ");
    const note = hs.map((h) => h.f.note).sort((a, b) => a.length - b.length)[0];
    return `• **${cap(t.names[0])}**: ${items}. ${note} (${pubs(hs).join(" · ")})`;
  };
  const bad = byTopic(rest.filter((h) => h.f.verdict === "avoid" || h.f.verdict === "limit")).sort((a, b) => Number(b.some((h) => h.f.verdict === "avoid")) - Number(a.some((h) => h.f.verdict === "avoid")));
  const fine = byTopic(rest.filter((h) => h.f.verdict === "ok" || h.f.verdict === "good" ? !bad.some((g) => g[0].t.id === h.t.id) : false));
  const end = `Đây là kiến thức tham khảo chung từ các nguồn y khoa Lomi đã đối chiếu, không thay lời dặn của bác sĩ / chuyên viên dinh dưỡng đang theo dõi bạn.`;
  const quick = [...bad, ...fine].slice(0, 3).map((g) => `${cap(g[0].t.names[0])} ăn ${S} được không?`);
  if (!hits.length)
    return {
      text: `Lomi đã dò hướng dẫn ăn uống của ${withDiet} bệnh (trong ${topics.length} chủ đề sức khoẻ có nguồn của Lomi), nhưng **chưa nguồn nào nêu riêng bệnh nào phải kiêng ${S}** 🙏\n\nNhư vậy không có nghĩa là ai ăn cũng được — nếu bạn đang có bệnh cần ăn kiêng, hỏi Lomi kiểu “<tên bệnh> ăn ${S} được không” để Lomi xem riêng bệnh đó, hoặc hỏi bác sĩ cho chắc nha.`,
      quick: [],
      partial: true,
      topics: [],
    };
  const parts = [`🍽️ **${cap(S)}** — những bệnh mà nguồn y khoa có nhắc tới:`];
  if (!bad.length && !allergy.length) parts.push(`Chưa nguồn nào Lomi đã đối chiếu nêu bệnh nào phải **kiêng** ${S}.`);
  if (bad.length) parts.push(`🚫 Cần tránh / hạn chế:\n${bad.slice(0, 8).map(line).join("\n")}${bad.length > 8 ? `\n• …và ${bad.length - 8} bệnh khác` : ""}`);
  if (allergy.length) parts.push(`🤧 Người **bị dị ứng** với ${S} thì phải tránh hoàn toàn (kể cả món có thành phần đó) (${pubs(allergy).join(" · ")}).`);
  if (fine.length) parts.push(`✅ Nguồn nói ăn được / nên ăn: ${fine.slice(0, 8).map((g) => `**${cap(g[0].t.names[0])}**${normalizeVi(g[0].key) !== phrase ? ` (${g[0].key})` : ""}`).join(", ")}.`);
  parts.push(`Bệnh không có trong danh sách là vì nguồn Lomi đã đọc không nêu riêng — không có nghĩa là chắc chắn ăn thoải mái. Muốn rõ cho một bệnh, hỏi kiểu “gout ăn ${S} được không” nha.`);
  parts.push(`📚 ${end}`);
  return { text: parts.join("\n\n"), quick, partial: false, topics: [...new Set(hits.map((h) => h.t.id))] };
}

export type MedAsk = { id: string; aspect: MedAspect | "overview"; food: string | null; focusOnly?: boolean };

/** Câu này có phải câu hỏi kiến thức về một chủ đề trong kho không? prev = chủ đề đang nói ở tin trước (cho câu nối). */
export function parseMedAsk(text: string, prev?: MedState): MedAsk | null {
  const own = findMedTopicId(text);
  const words = normalizeVi(text).split(" ").length;
  if (own) {
    const row = ROWS.find((r) => r.id === own)!;
    const names = row.names;
    if (!isMedQuestion(text, names)) return null;
    // Khía cạnh xét trên phần câu NGOÀI tên chủ đề: "rối loạn ăn uống là gì" — chữ "ăn uống" là tên bệnh, không phải hỏi kiêng cữ.
    const rest0 = names.reduce((acc2, nm) => acc2.replace(` ${normalizeVi(nm)} `, " "), ` ${normalizeVi(text)} `);
    const aspR = aspectOf(rest0);
    // (tên chủ đề tự chứa khía cạnh — "đi khám tâm lý", "dấu hiệu cần hỗ trợ tâm lý" — thì vẫn lấy khía cạnh trong tên)
    const asp = aspR ?? aspectOf(text);
    const topicLike = foodPhrase(text, null);
    // Khía cạnh xét trên phần câu NGOÀI tên món: "uống sữa chua được không" bỏ dấu dễ thành "chữa được không".
    const aspF = topicLike ? aspectOf(rest0.replace(` ${topicLike} `, " ")) : asp;
    const a: MedAspect | "overview" = topicLike && aspF !== "spread" && (!aspF || aspF === "diet" || aspF === "define") && VN(/\b(ăn|uống|dùng)\b/).test(normalizeVi(text)) && !VN(/\b(kiêng|ăn gì|uống gì|nên ăn|tránh ăn)\b/).test(normalizeVi(text)) ? "food" : (asp ?? "overview");
    if (row.dietOnly && a !== "food" && a !== "diet") return null;
    return { id: own, aspect: a, food: a === "food" ? topicLike : null };
  }
  // câu nối không nhắc lại tên: "còn nhộng thì sao", "vậy ăn gì được", "triệu chứng?"
  const asp = aspectOf(text);
  if (prev?.id && words <= 9) {
    const n = normalizeVi(text);
    if (MEAL_SUGGEST.test(` ${n} `) && !VN(/\b(kiêng|nên ăn|tránh)\b/).test(n)) return null;
    const fp = foodPhrase(text, null);
    if (fp && asp !== "spread" && VN(/\b(ăn|uống|dùng)\b/).test(n) && !VN(/\b(kiêng|ăn gì|uống gì|nên ăn|tránh ăn)\b/).test(n)) return { id: prev.id, aspect: "food", food: fp };
    const fm = n.match(VN(/^(?:vậy |thế |còn |nhưng |rồi )*((?:\S+ ){0,2}?\S+?) (?:thì sao|sao|có được không|được không|có sao không|được k|được ko)$/));
    if (fm && !asp) {
      const w = fm[1].split(" ").filter((x) => !FILL.has(x)).join(" ");
      if (w.length >= 2) return { id: prev.id, aspect: "food", food: w };
    }
    if (asp) return { id: prev.id, aspect: asp, food: null };
    // câu hỏi nối về một ý cụ thể ("thế có di truyền không", "vape có giúp không") → chỉ nhận nếu thẻ thật sự có ý đó (focusOnly)
    //   (đang nói ăn uống — "còn hải sản?" — thì để lớp kiêng cữ hiểu là hỏi món)
    if ((text.includes("?") || QWORD.test(` ${n} `)) && prev.aspect !== "diet" && prev.aspect !== "food") return { id: prev.id, aspect: "overview", food: null, focusOnly: true };
  }
  return null;
}
