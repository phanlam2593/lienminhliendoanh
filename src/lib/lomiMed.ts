// ─────────────────────────────────────────────────────────────────────────────
// KHO KIẾN THỨC Y KHOA CÓ NGUỒN (09/10, theo ý Kir: "bệnh nào cũng trả lời được") — chạy trên máy, không gọi AI.
//
// Mỗi chủ đề (bệnh / tình trạng / thuật ngữ tâm lý) là MỘT THẺ JSON trong lib/medkb/<id>.json. Mỗi ý trong thẻ trỏ tới nguồn chính thống
// (NHS, MedlinePlus, CDC, NIH, WHO, Mayo…). Lomi chỉ nói điều CÓ trong thẻ; điều thẻ không có → nói thẳng "chưa xác minh được", không đoán.
//   • Thêm kiến thức = thêm / sửa thẻ JSON (không viết regex, không sửa code) rồi chạy `node scripts/medkb-index.mjs` để cập nhật chỉ mục.
//   • Thẻ nạp theo nhu cầu (lazy) — chỉ mục tên (medkb/index.json, nhỏ) nằm sẵn trong gói, thẻ đầy đủ tải khi cần.
//   • Quy tắc nguồn do test (src/test/lomiMed.test.ts) ép: tên miền tin cậy · mọi `src` hợp lệ · không có liều thuốc · ý ≤ 220 ký tự.
// ─────────────────────────────────────────────────────────────────────────────
import { diabetesFruitBlock, factLine, factOf, fruitIn, isSugarTopic } from "@/lib/lomiFoodFacts";
import { normalizeVi } from "@/lib/lomiFaq";
import { DRUG_CLAIMS, sourceLine, type DrugFact, type DrugSource } from "@/lib/lomiDrugData";
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
  /** 18/10: tên HIỂN THỊ khi names[0] không hợp làm tiêu đề (thẻ "ho": names[0] = "ho kéo dài" nhưng nội dung là ho nói chung).
   *  names[0] vẫn là khoá ngữ cảnh (health.label → findMedTopicId) nên không đổi. */
  display?: string;
  /** 19/10: thẻ ẢO "góc nhìn triệu chứng" ghép từ các thẻ thật (causes = triệu chứng này hay gặp trong bệnh nào). */
  view?: boolean;
  sources: DrugSource[];
  verifiedAt: string;
};
type IndexRow = { id: string; kind: MedTopic["kind"]; names: string[]; dietOnly?: boolean; child?: string; view?: boolean };
const ROWS = INDEX as IndexRow[];

// ── 19/10 (audit sức khoẻ) — GÓC NHÌN THEO TRIỆU CHỨNG ──
// Có những triệu chứng người ta hỏi mẹo trực tiếp ("mẹo chữa nghẹt mũi") nhưng kho không có thẻ riêng — trong khi các thẻ CÓ NGUỒN
// của bệnh liên quan đã có đúng các ý chăm sóc triệu chứng đó (thẻ cảm lạnh: xông hơi, nước muối nhỏ / xịt mũi; thẻ viêm xoang:
// rửa mũi bằng nước muối pha nước đun sôi để nguội…). Trước đây Lomi chỉ hỏi lại "bị bao lâu rồi" chứ không đưa mẹo nào.
// Góc nhìn = MỘT thẻ ảo ghép từ các ý đã có nguồn của những thẻ đó (lọc theo từ khoá) — không viết kiến thức mới, không chép thẻ.
// Chỉ dùng cho câu hỏi CÁCH CHĂM SÓC / KHI NÀO ĐI KHÁM / THUỐC; hỏi "là gì", "nguyên nhân"… vẫn để các lớp khác trả lời như cũ.
type ViewPick = { card: string; signs?: RegExp; care?: RegExp; doctor?: RegExp; emergency?: RegExp };
type SymptomView = { id: string; names: string[]; display: string; sx: string[]; picks: ViewPick[]; claims?: string[] };
const SYMPTOM_VIEWS: SymptomView[] = [
  {
    id: "sx-nghet-mui",
    names: ["nghẹt mũi", "ngạt mũi", "tắc mũi", "nghẹt mũi kéo dài", "sổ mũi nghẹt mũi"],
    display: "nghẹt mũi",
    sx: ["stuffy"],
    picks: [
      { card: "cam-lanh", signs: /nghẹt/iu, care: /nghẹt mũi|xịt mũi|tạo ẩm/iu, doctor: /10 ngày|nặng lên/iu, emergency: /khó thở/iu },
      { card: "viem-xoang", signs: /nghẹt/iu, care: /rửa mũi/iu, doctor: /7 ngày|3 tuần|3 tháng|11 tuổi/iu },
      { card: "viem-mui-di-ung", signs: /nghẹt/iu, care: /rửa mũi/iu, doctor: /nặng lên|không đỡ/iu },
    ],
    // Lời dặn về thuốc xịt thông mũi co mạch đã đối chiếu nguồn (lomiDrugData.DRUG_CLAIMS "decongestant-spray", NHS) — chỉ là lưu ý giới hạn, không khuyên dùng.
    claims: ["decongestant-spray"],
  },
];
const VIEW_ROWS: IndexRow[] = SYMPTOM_VIEWS.map((v) => ({ id: v.id, kind: "other", names: v.names, view: true }));
/** Mọi tên tra được (thẻ thật + góc nhìn triệu chứng). medTopicIds / loadAllMedTopics vẫn chỉ là thẻ thật. */
const LOOKUP_ROWS: IndexRow[] = [...ROWS, ...VIEW_ROWS];
/** Thẻ (thật hoặc góc nhìn) để hỏi tiếp khi lượt trước chỉ kể MỘT triệu chứng ("nghẹt mũi" → "vậy làm sao?"). */
export const symptomViewId = (sx: string): string | null => SYMPTOM_VIEWS.find((v) => v.sx.includes(sx))?.id ?? null;
export const isSymptomView = (id: string) => SYMPTOM_VIEWS.some((v) => v.id === id);
const VIEW_ASPECTS = new Set<string>(["care", "doctor", "emergency", "meds", "overview", "causes"]);

function buildView(v: SymptomView, raw: Record<string, unknown>): MedTopic | null {
  const sources: DrugSource[] = [];
  const care: DrugFact[] = [];
  const doctor: DrugFact[] = [];
  const emergency: DrugFact[] = [];
  // (triệu chứng này hay gặp trong bệnh nào: ý "triệu chứng" CÓ NGUỒN của từng thẻ có nhắc tới nó, ghi kèm tên bệnh)
  const seen: DrugFact[] = [];
  let verifiedAt = "9999-12-31";
  for (const p of v.picks) {
    const t = raw[`./medkb/${p.card}.json`] as MedTopic | undefined;
    if (!t) continue;
    const off = sources.length;
    sources.push(...t.sources);
    const take = (fs: DrugFact[], re?: RegExp) => (re ? fs.filter((f) => re.test(f.text)).map((f) => ({ text: f.text, src: f.src.map((i) => i + off) })) : []);
    const sg = take(t.signs, p.signs)[0];
    if (sg) seen.push({ text: `**${cap(displayName(t))}**: ${sg.text.charAt(0).toLowerCase()}${sg.text.slice(1)}`, src: sg.src });
    care.push(...take(t.care, p.care));
    doctor.push(...take(t.doctor, p.doctor));
    emergency.push(...take(t.emergency, p.emergency));
    if (t.verifiedAt < verifiedAt) verifiedAt = t.verifiedAt;
  }
  for (const id of v.claims ?? []) {
    const c = DRUG_CLAIMS.find((x) => x.id === id);
    if (!c) continue;
    const off = sources.length;
    sources.push(...c.sources);
    care.push({ text: `Lưu ý: ${c.claim.charAt(0).toLowerCase()}${c.claim.slice(1)}`, src: c.sources.map((_, i) => i + off) });
    if (c.verifiedAt < verifiedAt) verifiedAt = c.verifiedAt;
  }
  if (!care.length) return null;
  return { id: v.id, kind: "other", names: v.names, display: v.display, about: [], signs: [], causes: seen, course: [], care, diet: null, doctor, emergency, sources, verifiedAt, view: true };
}

// ── Nạp thẻ theo nhu cầu ── (cả kho là MỘT chunk — lib/lomiMedData — tải ở lần hỏi y khoa đầu tiên)
let cards: Promise<Record<string, unknown>> | null = null;
export async function loadMedTopic(id: string): Promise<MedTopic | null> {
  try {
    cards ??= import("@/lib/lomiMedData").then((m) => m.MED_CARDS);
    const all = await cards;
    const v = SYMPTOM_VIEWS.find((x) => x.id === id);
    if (v) return buildView(v, all);
    const t = all[`./medkb/${id}.json`];
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
/** Loại thẻ (condition / mental / other…) theo id, không cần nạp thẻ. */
export const medKindOf = (id: string): MedTopic["kind"] | null => LOOKUP_ROWS.find((r) => r.id === id)?.kind ?? null;

// ── Nhận ra chủ đề trong câu ──
// Hai cách viết i/y hay gặp ("tự kỷ"/"tự kỉ", "tâm lý"/"tâm lí") quy về một dạng để khớp tên.
const canon = (n: string) => n.replace(VR(/\bky\b/g), "ki").replace(VR(/\bly\b/g), "li");
const bare = (x: string) => ` ${canon(normalizeVi(x))} `;
const acc = (x: string) => ` ${x.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
type NameKey = { id: string; bare: string; acc: string; short: boolean; len: number };
const NAME_KEYS: NameKey[] = LOOKUP_ROWS.flatMap((r) =>
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
  ["care", VN(/\b(cách chữa|chữa sao|chữa thế nào|chữa như thế nào|chữa bệnh|chữa trị|điều trị|cách trị|làm sao|làm gì|phải làm gì|nên làm gì|chăm sóc|phòng ngừa|phòng tránh|giảm đau|cho đỡ|cải thiện|tự xử lý|tự xử lí|xử lý|xử lí|xử trí|sơ cứu|tập luyện|vận động|sinh hoạt|bôi gì|bôi thuốc|bôi kem|thoa gì|mẹo|bí quyết|lưu ý|chú ý|để ý gì|cần biết gì|nên biết gì)\b/)],
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
      // 18/10: hỏi một TỪ CHUNG đứng đầu tên món cụ thể hơn ("nước" ↔ "nước chanh mật ong ấm", "cá" ↔ "cá cơm") — nguồn nói về món
      //   cụ thể đó, không phải về cả nhóm → không khớp ("đang ho uống nước lạnh" từng bị hiểu là hỏi nước chanh mật ong ấm).
      const head = !phrase.includes(" ") && k.startsWith(`${phrase} `);
      // 15/10: món được hỏi nằm TRONG tên món của thẻ ("gà" trong "thịt gà") — chữ nào người dùng gõ dấu thì dấu phải đúng
      //   ở chính chỗ đó: "gà" không phải "ga" trong "nước ngọt có ga".
      const whole = !(single || head) && p.includes(` ${k} `);
      const hit = single || head ? false : whole ? !sa || accentAgrees(sa, acc(nm)) : bare(k).includes(p) ? !sa || typedAccentsAt(acc(nm), sa) : false;
      // 30/10: tên món của thẻ nằm TRỌN trong câu hỏi ("khoai tây" ↔ nhóm "rau củ nhiều kali") thắng trường hợp câu hỏi chỉ là
      //   một phần tên món dài hơn ("khoai tây" trong "khoai tây chiên lát" của nhóm đồ chế biến sẵn).
      const len = k.length + (whole ? 1000 : 0);
      if (hit) {
        if (!best || len > best.len) best = { f, len };
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
  // 19/10 (audit sức khoẻ): "tư vấn cho a đau bụng kinh", "khuyên mình cách…" là xin LỜI KHUYÊN chăm sóc — trước đây không có khía cạnh nào,
  //   câu rơi vào mạch hỏi han triệu chứng ("bị bao lâu rồi?") thay vì đưa mẹo. "tư vấn về bệnh gout" (hỏi chung về bệnh) giữ nguyên.
  if (VN(/\b(tư vấn|khuyên|chỉ giúp|chỉ giùm|chỉ dùm|chỉ cách)\b/).test(n) && !VN(/\b(tư vấn|khuyên)( \S+){0,3} về\b/).test(n)) return "care";
  return null;
}

// ── Câu hỏi KIẾN THỨC hay đang KỂ chuyện của mình? ──
const SELF_STATE = VN(/^(?:\s)?(?:a|anh|e|em|c|chị|mình|tôi|tui|tớ)\s+(?:đang |cũng |hay |bị |mới |vừa |lại |vẫn |thường )*(?:bị|mắc|có|hay|thấy|cảm thấy|đang|bị)\b/);
const QWORD0 = VN(/\b(gì|là gì|thế nào|như nào|ra sao|sao không|được không|có không|có được|nên|nguyên nhân|triệu chứng|dấu hiệu|kiêng|làm sao|bao lâu|có nguy hiểm|có lây|có khỏi|có phải|tại sao|vì sao|khi nào|ở đâu|nghĩa|giải thích|tìm hiểu|hỏi về|nói về)\b/);
// "không / chưa" giữa câu là phủ định ("ngủ không được, đầu cứ nghĩ…"); chỉ đứng CUỐI câu mới là từ hỏi ("ăn nhộng đc k").
const QWORD = { test: (x: string) => QWORD0.test(x) || VN(/(?:^| )(?:không|ko|k|hông|hong|chưa) *$/).test(x) };
/** Có phải câu HỎI kiến thức (không phải câu kể "a bị gout" hay tâm sự "a hay lo âu")? Có ? / từ hỏi / khía cạnh rõ / chỉ nêu tên chủ đề. */
export function isMedQuestion(text: string, topicNames: string[] = [], allowTold: 0 | 1 | 2 = 0): boolean {
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
  //   19/10: "a mới cắt amidan", "mẹ vừa sinh mổ" — "mới / vừa / xong / hôm qua" là thời điểm, cũng là nêu tên chủ đề.
  const restNoTime = rest.replace(VN(/\b((\d+|một|hai|ba|bốn|năm|mấy|vài|nhiều) (ngày|tuần|tháng|năm)( nay| rồi| trời)?|lâu rồi|lâu năm|từ lâu|mấy năm nay|rồi|nay|cũng|đã|lâu|mới|vừa|xong|hôm qua|hôm kia|sáng nay|tuần trước)\b/g), " ").replace(/\s+/g, " ").trim();
  if (topicNames.length && restNoTime === "" && words <= 9) return true;
  // 19/10: kể chuyện mình / người nhà vừa gặp một tình trạng có thẻ ("vợ a vừa sinh mổ", "bị nấc hoài", "con mới nhổ răng") —
  //   ngoài tên chủ đề chỉ còn người, thời điểm, mức độ → cũng là nêu chủ đề (đưa kiến thức chăm sóc), không phải chuyện để "kể tiếp".
  //   (allowTold = 2: thủ thuật / sau sinh — kể cả chuyện người nhà; = 1: bệnh thường — chỉ khi không nhắc người nào, vì
  //    "mẹ em bị tiểu đường" là mở MẠCH CHUYỆN hỏi han người đó, không đổ bài kiến thức.)
  const restFreq = restNoTime.replace(VN(/\b(hoài|mãi|suốt|liên tục|quá|lắm|nhiều|hay|bị|thấy|đang|vô|xong rồi|xong|mình|tôi|tui|tớ|e|c)\b/g), " ").replace(/\s+/g, " ").trim();
  const restPeople = restFreq.replace(VN(/\b(vợ|chồng|mẹ|má|ba|bố|con|em|anh|chị|bé|ông|bà|cháu|bạn|nhà|của|nội|ngoại)\b/g), " ").replace(/\s+/g, " ").trim();
  if (topicNames.length && words <= 9 && ((allowTold >= 1 && restFreq === "") || (allowTold === 2 && restPeople === ""))) return true;
  // tên + cụm bổ nghĩa ngắn: "tăng động giảm chú ý ở người lớn", "trầm cảm sau sinh", "gout cho người già"
  if (topicNames.length && words <= 9 && !SELF_STATE.test(n) && VN(/^(?:ở|cho|khi|trên|sau|trước|trong) \S+(?: \S+){0,2}$/).test(rest)) return true;
  // có từ hỏi + tên chủ đề nhưng không rõ khía cạnh ("ADHD người lớn có không", "tay chân miệng ở người lớn có không") → tóm tắt chủ đề.
  if (hasQ && topicNames.length && !SELF_STATE.test(n) && !foodPhrase(text)) return true;
  // câu kể có hỏi kèm ("a bị gout ăn nhộng được không") — phần hỏi là món
  if (hasQ && foodPhrase(text) && !VN(/^(?:a|anh|e|em)\s+(?:ko|không)\b/).test(n)) return true;
  return false;
}

// ── Dựng lời đáp (ghép hoàn toàn từ dữ liệu có nguồn) ──
/** Ý trong phần chăm sóc nói về ăn / uống (bỏ các ý về thuốc: "corticoid uống" không phải chuyện ăn uống). */
const eatFacts = (t: MedTopic): DrugFact[] =>
  t.care.filter((f) => VR(/(^|[^\p{L}])(ăn|uống|bú|thức ăn|đồ ăn|bù nước|oresol)(?![\p{L}])/iu).test(f.text) && !VR(/thuốc|corticoid|kháng sinh|kháng virus/iu).test(f.text));
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const bl = (fs: DrugFact[], max = 99) => fs.slice(0, max).map((f) => `• ${f.text}`).join("\n");
const srcs = (...g: DrugFact[][]) => g.flat().flatMap((f) => f.src);
/** Tên hiển thị của thẻ (tiêu đề lời đáp). Chip gợi ý / khoá ngữ cảnh vẫn dùng names[0] để còn định tuyến lại được. */
export const displayName = (t: MedTopic) => t.display ?? t.names[0];
const title = (t: MedTopic) => `**${cap(displayName(t))}**`;
// ── 18/10: BÙ NƯỚC (ORS / oresol) — ý có nguồn nằm ở phần chăm sóc của thẻ; hỏi "uống gì" / "oresol thế nào" thì phải đưa ra ──
const REHYD_FACT = VR(/bù nước|ORS|oresol|dung dịch bù/iu);
const REHYD_Q = VN(/\b(oresol|orezol|ors|bù nước|gói bù nước|bột bù nước|dung dịch bù nước|điện giải)\b/);
const rehydFacts = (t: MedTopic) => t.care.filter((f) => REHYD_FACT.test(f.text));
const dehydWarn = (t: MedTopic) => ({ em: t.emergency.filter((f) => /mất nước|sốc/iu.test(f.text)), doc: t.doctor.filter((f) => /mất nước/iu.test(f.text)) });
function rehydReply(t: MedTopic, now: number): MedReply | null {
  const fs = rehydFacts(t);
  if (!fs.length) return null;
  const w = dehydWarn(t);
  const text = [
    `💧 Bù nước khi bị ${title(t)}:`,
    bl(fs),
    w.doc.length ? `🧑‍⚕️ Cần đi khám sớm khi:\n${bl(w.doc, 3)}` : "",
    w.em.length ? `🚨 Gọi **115** / đi cấp cứu ngay khi:\n${bl(w.em, 2)}` : "",
    "Bù nước giúp bù lại nước và muối đã mất, không thay được việc đi khám khi có các dấu hiệu trên.",
    sourceLine(t, srcs(fs, w.doc.slice(0, 3), w.em.slice(0, 2))),
  ].filter(Boolean).join("\n\n");
  return { text, aspect: "care", topic: t, quick: chipsOf(t, "care") };
}

// Lời dặn an toàn nằm trong ghi chú của món (vd mật ong "không dùng cho trẻ dưới 1 tuổi") — tóm theo món vẫn phải giữ lại.
const CAUTION = VR(/(không (?:dùng|cho|nên|được)|tránh cho|trẻ (?:dưới|nhỏ|em|sơ sinh)|mang thai|bà bầu|cho con bú|dị ứng)/i);
function caution(note: string): string {
  const s = note.split(/(?<=[.;])\s+|;\s*/).find((x) => CAUTION.test(x));
  // (15/10: tên riêng đầu câu — "Mayo Clinic", "NHS" — giữ nguyên chữ hoa; trước đây ra "(mayo Clinic …")
  const t = s?.replace(/[.;]\s*$/, "").trim();
  return t ? ` (${/^(Mayo|NHS|CDC|WHO|MedlinePlus|NIAMS|NIDDK|NIH|StatPearls|FDA)\b/.test(t) ? t : t.replace(/^./, (c) => c.toLowerCase())})` : "";
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
    if (REHYD_Q.test(` ${food} `)) {
      const r = rehydReply(t, now);
      if (r) return r;
    }
    const f = matchFood(t, food, shown);
    if (f) {
      const say = f.verdict === "avoid" ? "nên **tránh**" : f.verdict === "limit" ? "nên **hạn chế**" : f.verdict === "good" ? "là món **nên ăn**" : "**được**";
      const body = `Với ${N}: **${f.name}** ${say}.\n${f.note}${normalizeVi(f.name) !== food ? `\n(Lomi hiểu “${shown ?? food}” thuộc nhóm “${f.name}” theo cách nguồn phân nhóm.)` : ""}`;
      const ff = factOf(question ?? shown ?? food);
      const fruit = isSugarTopic(t.id) ? fruitIn(question ?? shown ?? food) : null;
      const extra = fruit ? diabetesFruitBlock(fruit, now) : ff ? factLine(ff, t.id, now) : "";
      return out(`${body}\n\n${sourceLine(t, f.src, now)}${extra ? `\n\n${extra}` : ""}`, "food");
    }
    // Chưa có nguồn nói về đúng món này → nói thẳng, đưa nguyên tắc chung CÓ nguồn.
    // 18/10: thẻ không có bảng ăn uống (vd "ho") → nguyên tắc chung lấy từ các ý ăn / uống CÓ NGUỒN trong phần chăm sóc.
    const gen = t.diet && (t.diet.avoid.length || t.diet.ok.length) ? [t.diet.avoid[0], t.diet.ok[0]].filter(Boolean) as DrugFact[] : eatFacts(t).slice(0, 3);
    const say = `Về **${shown ?? food}** thì Lomi **chưa xác minh được**: các nguồn y khoa Lomi đã đối chiếu cho ${N} không nêu riêng món này, nên Lomi không dám nói được hay không.`;
    const tail = gen.length ? `\n\nNguyên tắc chung theo nguồn:\n${bl(gen)}\n\nMuốn chắc về món này, bạn hỏi bác sĩ hoặc chuyên viên dinh dưỡng đang theo dõi bạn nha.\n\n${end([gen])}` : `\n\nBạn hỏi bác sĩ hoặc chuyên viên dinh dưỡng nha.`;
    // 30/10: món có trong bảng FDA → kèm số liệu (calo, đường, muối, kali, béo — chỉ số theo bệnh) để người hỏi tự cân nhắc.
    const ff = factOf(question ?? shown ?? food);
    // "tiểu đường ăn mít được không" — trái cây: nguồn tiểu đường có hướng dẫn cách ăn trái cây nói chung (NHS, NIDDK).
    const fruit = isSugarTopic(t.id) ? fruitIn(question ?? shown ?? food) : null;
    const extra = fruit ? diabetesFruitBlock(fruit, now) : ff ? factLine(ff, t.id, now) : "";
    return out(say + tail + (extra ? `\n\n${extra}` : ""), "food", true);
  }
  if (aspect === "diet") {
    if (!t.diet || !(t.diet.avoid.length || t.diet.ok.length || t.diet.foods.length)) {
      // (bỏ các ý về thuốc: "corticoid uống" không phải chuyện ăn uống)
      const eat = eatFacts(t);
      // 15/10: hỏi "kiêng gì" mà nguồn không có chuyện ăn uống — vẫn nêu những điều nguồn DẶN TRÁNH (sinh hoạt, vận động, thuốc…),
      //   vì "kiêng" với người hỏi thường là kiêng cả việc chứ không chỉ món ăn ("mới cắt bao quy đầu kiêng gì").
      //   (chỉ khi nguồn không nhắc chuyện ăn uống nào — có thì chỉ đưa phần ăn uống như trước.)
      // (15/10: kèm các ý về CÂN NẶNG — "giảm cân nếu thừa cân" — vì người hỏi kiêng gì thường cũng đang lo chuyện ăn uống / cân nặng)
      const dont = eat.length ? [] : t.care.filter((f) => VR(/(^|[^\p{L}])(tránh|không nên|đừng|không được|kiêng|hạn chế|ngưng|nghỉ|giảm cân|thừa cân)(?![\p{L}])/iu).test(f.text));
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
    // 18/10: bệnh gây mất nước (tiêu chảy…) — ý bù nước nằm ở phần chăm sóc, trước đây hỏi "uống gì" không thấy nhắc ORS.
    const rh = rehydFacts(t);
    const rhText = rh.length ? `💧 Bù nước:\n${bl(rh, 4)}` : "";
    return out([`🍽️ Ăn uống với ${N}:`, general, rhText, groups && `Tóm theo món:\n${groups}`, end([...used, rh.slice(0, 4)])].filter(Boolean).join("\n\n"), "diet");
  }
  if (aspect === "meds") {
    // 19/10: "khói thuốc", "hút thuốc", "thuốc lá" không phải thuốc chữa bệnh — trước đây "Khói thuốc làm triệu chứng nặng hơn" lọt vào phần thuốc.
    const med = t.care.filter((c) => MED_FACT.test(c.text.replace(VR(/(khói|hút|bỏ|cai) thuốc( lá| lào)?/giu), "")));
    return out([`💊 Về thuốc cho ${N}: Lomi **không kê thuốc hay nêu liều** — dùng thuốc nào là do bác sĩ quyết định sau khi khám.`, med.length ? `Theo nguồn:\n${bl(med, 10)}` : "", end([med])].filter(Boolean).join("\n\n"), "meds");
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
    const r = sect(`🌿 Với ${N}, nên:`, t.care, "care");
    // 19/10: tách nên làm / nên tránh / thuốc (splitCare) thay vì đổ cả phần chăm sóc dưới tiêu đề "nên:".
    if (!r.partial) {
      const sc0 = splitCare(t);
      const seenC: string[][] = [];
      const sc = { tips: dropDupFacts(sc0.tips, seenC, t.id), avoid: dropDupFacts(sc0.avoid, seenC, t.id), meds: dropDupFacts(sc0.meds, [], t.id) };
      const urg =
        t.kind === "other" && (t.emergency.length || t.doctor.length)
          ? [t.emergency.length ? `🚨 Gọi **115** / đi cấp cứu ngay khi:\n${bl(t.emergency, 4)}` : "", t.doctor.length ? `🧑‍⚕️ Nên đi khám khi:\n${bl(t.doctor, 3)}` : ""].filter(Boolean).join("\n\n")
          : "";
      const used = [sc.tips, sc.avoid, sc.meds, ...(urg ? [t.emergency.slice(0, 4), t.doctor.slice(0, 3)] : [])];
      r.text = [
        `🌿 Với ${N}, nên:`,
        bl(sc.tips),
        sc.avoid.length ? `🚫 **Nên tránh:**\n${bl(sc.avoid)}` : "",
        sc.meds.length && t.kind !== "term" ? `💊 **Về thuốc** (theo nguồn):\n${bl(sc.meds)}` : sc.meds.length ? bl(sc.meds) : "",
        urg,
        end(used),
      ].filter(Boolean).join("\n\n");
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
  // 19/10 (Kir): hỏi "X là gì / là bệnh gì" về một BỆNH → trả lời đủ phần (như tóm tắt). Thuật ngữ (thiền, CBT…) vẫn chỉ giải thích.
  //   (giữ nhãn "define": người dùng HỎI "là gì" — nhánh chống lặp "vẫn là X nè" chỉ dành cho câu nhắc lại tên bệnh sau một bài tóm tắt.)
  if (aspect === "define" && DRUG_KINDS.has(t.kind) && t.about.length) return out(overviewText(t, now), "define");
  if (aspect === "define") {
    const body = t.about.length ? bl(t.about) : "";
    return out([TERM_HINT(t) + (body ? `📖 ${N} là gì:\n${body}` : `📖 ${N}`), end([t.about])].join("\n\n").replace(/^\n+/, ""), "define");
  }
  // Không rõ khía cạnh nhưng hỏi đúng một ý có trong thẻ → đưa đúng các ý đó.
  if (question) {
    if (REHYD_Q.test(` ${normalizeVi(question)} `)) {
      const r = rehydReply(t, now);
      if (r) return r;
    }
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
  // overview — 19/10 (Kir): hỏi về một bệnh thì trả lời ĐỦ PHẦN trong một lần: là gì · triệu chứng · kiêng · mẹo chăm sóc · thuốc ·
  //   khi nào đi khám · khi nào cấp cứu. Mọi ý vẫn lấy nguyên từ thẻ có nguồn (mỗi phần vài ý), phần nào thẻ không có thì bỏ qua;
  //   riêng phần thuốc chỉ nêu điều nguồn nói, không kê đơn, không nêu liều.
  return out(overviewText(t, now), "overview");
}

// (19/10: thêm tên nhóm thuốc / hoạt chất hay gặp trong thẻ — để ý "kháng histamin cetirizine…", "loperamide…" vào đúng phần thuốc)
const MED_FACT = VR(/(^|[^\p{L}])(thuốc(?! lá| lào)|kháng sinh|kháng virus|kháng vi rút|kháng histamin|kháng axit|kháng nấm|alginat|ức chế bơm proton|PPI|nhuận tràng|retinoid|benzoyl peroxide|azelaic|isotretinoin|loperamide|omeprazole|lansoprazole|famotidine|paracetamol|ibuprofen|aspirin|corticoid|corticosteroid|steroid|insulin|vắc xin|vaccine|allopurinol|colchicine|metformin|statin|levothyroxine|carbimazole|mebendazole|minoxidil|finasteride|sildenafil|tadalafil|dapoxetine|tamsulosin|mesalazine|methotrexate|amlodipine|losartan|ramipril|indapamide|bisphosphonate|hydroxocobalamin|axit folic|kháng nấm|naproxen|codein|codeine)(?![\p{L}])/iu);
const PREVENT_FACT = VR(/phòng (bệnh|ngừa|tránh|lây)|muỗi|vắc xin|vaccine|lây (sang|cho)|cách ly/iu);
const FOREIGN_LINE = VR(/\b988\b|ở Mỹ|ở Hoa Kỳ|NHS 111|\b999\b/iu);
const DRUG_KINDS = new Set(["condition", "infection", "cancer", "mental", "women", "child"]);

// ── 19/10 (Kir: "kiêng / nên tránh kì vậy, cái đó là khuyên chứ") — TÁCH Ý KHUYÊN và Ý KIÊNG ──
// Trước đây cả câu chăm sóc có chữ "tránh" ở đâu đó ("súc họng nước muối…; uống nhiều nước…; tránh khói thuốc") bị xếp nguyên câu vào
// mục Kiêng. Giờ tách mỗi ý thành từng vế (theo dấu ";" và hết câu, không tách trong ngoặc): vế BẮT ĐẦU bằng lời dặn tránh
// ("tránh…", "đừng…", "không nên…", "không ăn / uống / gãi…", "hạn chế…") vào mục Kiêng, còn lại vào mục khuyên. Ý về thuốc giữ nguyên câu
// (lưu ý thuốc đi cùng thuốc). Mỗi vế giữ nguồn của ý gốc — không viết thêm chữ nào ngoài nguồn.
const AVOID_LEAD = VR(/^(?:(?:NHS|MedlinePlus|Mayo Clinic|CDC|WHO)\s*(?:khuyên|gợi ý|dặn)?\s*:\s*)?(?:và\s+)?(tránh|đừng|kiêng|cữ|hạn chế|không nên|bớt|ngưng|bỏ (?:hút|thuốc lá|rượu)|không (?:ăn|uống|dùng|hút|cho|để|mặc|ngồi|nằm|gãi|nặn|chà|tự|đi|làm|bơi|đeo|dụi|giũ|chạm|hôn|quan hệ|cạy|chích|nhổ|bôi|xoa|rặn|nhịn|ngoáy|giặt|thụt|xịt|lái|cúi|ngửa|ở|tắm|súc|đắp|cởi|lau|giữ|mang|kê|chườm|nuốt|thức|bỏ bữa))(?![\p{L}])/iu);
const TIP_PREFIX = VR(/^(?:(?:NHS|MedlinePlus|Mayo Clinic|CDC|WHO)\s*(?:khuyên|gợi ý|dặn)?\s*:\s*|(?:Tự chăm sóc|Nên làm|Nên|Mẹo)\s*:\s*)/iu);
const FILLER_CLAUSE = VR(/^(?:cách )?điều trị (?:tu[ỳy] |theo )(?:vào )?nguyên nhân\.?$/iu);
function clausesOf(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    if (c === ")") depth = Math.max(0, depth - 1);
    const next = text.slice(i + 1);
    if (depth === 0 && (c === ";" || (c === "." && /^\s+\p{Lu}/u.test(next)))) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim().replace(/[.;,\s]+$/u, "")).filter((x) => x.length > 2);
}
const tidy = (x: string) => {
  const y = x.replace(TIP_PREFIX, "").trim();
  return `${y.charAt(0).toUpperCase()}${y.slice(1)}.`;
};
/** Phần chăm sóc của thẻ, chia thành: ý khuyên nên làm · ý kiêng / nên tránh · ý về thuốc. */
export function splitCare(t: MedTopic): { tips: DrugFact[]; avoid: DrugFact[]; meds: DrugFact[] } {
  const tips: DrugFact[] = [];
  const avoid: DrugFact[] = [];
  const meds: DrugFact[] = [];
  const seen = new Set<string>();
  for (const f of t.care) {
    if (MED_FACT.test(f.text.replace(VR(/(khói|hút|bỏ|cai) thuốc( lá| lào)?/giu), ""))) {
      meds.push(f);
      continue;
    }
    const cl = clausesOf(f.text);
    const tipCl: string[] = [];
    for (const c of cl) {
      if (FILLER_CLAUSE.test(c)) continue;
      const key = normalizeVi(c);
      if (seen.has(key)) continue;
      // (ý gần trùng nhau từ hai nguồn — "giảm cân nếu thừa cân nhưng không nhịn ăn cấp tốc" / "…tránh ăn kiêng cấp tốc" — chỉ giữ một)
      const kt = new Set(key.split(" "));
      if (kt.size >= 4 && [...seen].some((o) => { const ot = new Set(o.split(" ")); const inter = [...kt].filter((w) => ot.has(w)).length; return inter / (kt.size + ot.size - inter) >= 0.5; })) continue;
      seen.add(key);
      // (lời dặn PHÒNG BỆNH cho cộng đồng — "hạn chế nơi muỗi đẻ" — không phải điều người bệnh phải kiêng)
      if (AVOID_LEAD.test(c) && !PREVENT_FACT.test(c)) avoid.push({ text: tidy(c), src: f.src });
      else tipCl.push(c.replace(TIP_PREFIX, "").trim());
    }
    // (vế sau viết thường chữ đầu khi ghép lại — "…rượu bia; có thể hỏi…", trừ từ viết tắt / tên riêng như "NHS", "H. pylori")
    if (tipCl.length) tips.push({ text: tidy(tipCl.map((c, i) => (i && !/^\p{Lu}{2}|^\p{Lu}\./u.test(c) ? c.charAt(0).toLowerCase() + c.slice(1) : c)).join("; ")), src: f.src });
  }
  return { tips, avoid, meds };
}
// ── 20/10 (Kir: "câu trả lời bị lặp ý"): bỏ ý TRÙNG NGHĨA giữa các nguồn — hai nguồn nói cùng một lời dặn bằng chữ khác nhau
//   ("Tránh trà, cà phê, rượu… 6 giờ trước khi ngủ" / "Tránh thuốc lá, rượu, trà, cà phê khoảng 6 tiếng trước ngủ").
//   Một ý bị bỏ khi phần lớn chữ có nghĩa của nó đã nằm trong MỘT ý đã giữ, hoặc trong các ý đã giữ cộng lại.
const DUP_STOP = new Set("va hoac cac nhung nhu la co the de cua cho voi trong khi nen it nhat khoang neu thi hay rat nhieu mot so vao ra den tu o".split(" "));
const DUP_SYN: [RegExp, string][] = [[/\btieng\b/g, "gio"], [/\bthuc day\b/g, "day"], [/\b1\b/g, "mot"], [/\bthuoc la\b/g, "hut thuoc"], [/\ban no\b/g, "bua lon"], [/\bbuoi toi\b/g, "toi"], [/\bgio co dinh\b/g, "cung mot gio"], [/\bvan dong\b/g, "tap the duc"]];
const dupToks = (s: string): string[] => {
  let n = normalizeVi(s);
  for (const [re, to] of DUP_SYN) n = n.replace(re, to);
  return Array.from(new Set(n.split(" ").filter((w) => w && !DUP_STOP.has(w))));
};
// (thẻ SƠ CỨU từng bước — mỗi ý là một bước / một nhóm tuổi riêng, chữ giống nhau mà nghĩa khác → không lọc)
const NO_DEDUPE = new Set(["hoi-sinh-tim-phoi", "hoc-di-vat", "chay-mau", "di-vat-mat", "ngo-doc", "so-cuu-bong", "co-giat", "dien-giat", "duoi-nuoc", "sot-co-giat", "soc-phan-ve", "hoi-sinh-tim-phoi"]);
/** Giữ thứ tự; bỏ ý trùng nghĩa với ý đã giữ (kể cả ý ở các mục trước — `seen`). `id`: thẻ đang xét (thẻ sơ cứu không lọc). */
export function dropDupFacts<T extends { text: string }>(facts: T[], seen: string[][] = [], id?: string, maxMiss = 2): T[] {
  if (id && NO_DEDUPE.has(id)) return facts;
  const out: T[] = [];
  for (const f of facts) {
    const tk = dupToks(f.text);
    if (tk.length >= 4) {
      // (mọi chữ có nghĩa đều đã nằm trong MỘT ý đã giữ)
      const one = seen.some((o) => { const os = new Set(o); return tk.every((w) => os.has(w)); });
      // (ý dạng TÓM TẮT — liệt kê nhiều thứ cách nhau bằng dấu phẩy / chấm phẩy — mà gần như từng thứ đã được nói ở các ý trước)
      const all = new Set(seen.flat());
      const listy = (f.text.match(/[,;]/g) ?? []).length >= 3 && tk.length >= 8;
      const miss = tk.filter((w) => !all.has(w)).length;
      if (one || (listy && miss <= maxMiss && miss / tk.length <= (maxMiss > 2 ? 0.3 : 0.2))) continue;
    }
    seen.push(tk);
    out.push(f);
  }
  return out;
}
function overviewText(t: MedTopic, now: number): string {
  const N = title(t);
  const about = t.about.slice(0, 2);
  const signs = t.signs.slice(0, 4);
  // 19/10: tách ý khuyên / ý kiêng / ý thuốc theo từng vế (splitCare) — mục Kiêng chỉ còn đúng các lời dặn tránh.
  const sc = splitCare(t);
  const meds = dropDupFacts(sc.meds, [], t.id).slice(0, 7);
  // Kiêng: phần ăn uống nên tránh của thẻ + các lời dặn tránh trong phần chăm sóc.
  const dietAvoid = t.diet ? t.diet.avoid.slice(0, 3) : [];
  const foodsBad = t.diet ? t.diet.foods.filter((f) => f.verdict === "avoid" || f.verdict === "limit").map((f) => f.name) : [];
  // (lọc mẹo trước để ý kiêng dạng tóm tắt — "tránh ăn no muộn, xem màn hình, ngủ nướng bù" — đã có trong mẹo thì bỏ)
  const seenDup: string[][] = [];
  const tips = dropDupFacts(sc.tips, seenDup, t.id).slice(0, 7);
  const avoid = dropDupFacts([...dietAvoid, ...sc.avoid], seenDup, t.id).slice(0, 6);
  // (dòng "Món nên tránh" chỉ giữ khi còn món chưa được nói ở các ý phía trên)
  const foodsLine = foodsBad.length && dropDupFacts([{ text: foodsBad.slice(0, 8).join(", ") }], seenDup.slice(), t.id, 3).length ? foodsBad : [];
  const doctor = t.doctor.slice(0, 2);
  // (bỏ ý chỉ dùng được ở nước ngoài — đường dây 988 của Mỹ; ý nghĩ tự tử thì kèm đường dây Ngày Mai như lớp khẩn cấp của app)
  const emergency = t.emergency.filter((f) => !FOREIGN_LINE.test(f.text)).slice(0, 2);
  const crisisVN = t.emergency.some((f) => /tự tử|tự sát|tự làm hại/iu.test(f.text));
  const isDisease = DRUG_KINDS.has(t.kind);
  // 19/10: góc nhìn triệu chứng (nghẹt mũi) — không có phần "là gì"; nêu triệu chứng này hay gặp trong bệnh nào (mỗi ý có nguồn của thẻ bệnh đó).
  const seenIn = t.view ? t.causes.slice(0, 4) : [];
  const parts = [
    `${TERM_HINT(t)}Về ${N}, Lomi có kiến thức đã kiểm chứng như sau:`,
    seenIn.length ? `🔎 **${cap(displayName(t))} hay gặp trong** (chưa đủ để kết luận bạn bị bệnh nào):\n${bl(seenIn)}` : "",
    about.length ? `📖 ${N} là gì:\n${bl(about)}` : "",
    signs.length ? `🩺 **Triệu chứng thường gặp:**\n${bl(signs)}` : "",
    avoid.length || foodsLine.length
      ? `🚫 **${isDisease ? "Kiêng / nên tránh" : "Nên tránh"}:**\n${[bl(avoid), foodsLine.length ? `• Món nên tránh / hạn chế: ${foodsLine.slice(0, 8).join(", ")}.` : ""].filter(Boolean).join("\n")}`
      : "",
    tips.length ? `🌿 **Mẹo chăm sóc:**\n${bl(tips)}` : "",
    meds.length
      ? `💊 **Về thuốc** (theo nguồn):\n${bl(meds)}\n_Lomi không kê đơn, không nêu liều — dùng thuốc nào, bao nhiêu do bác sĩ / dược sĩ quyết định._`
      : isDisease
        ? "💊 **Về thuốc:** nguồn Lomi đã đối chiếu không nêu thuốc cụ thể cho bệnh này — dùng thuốc gì cần bác sĩ khám rồi quyết định."
        : "",
    doctor.length ? `🧑‍⚕️ **Khi nào nên đi khám:**\n${bl(doctor)}` : "",
    emergency.length
      ? `🚨 **Cần xử trí khẩn khi:**\n${bl(emergency)}\n(Ở Việt Nam gọi **115** hoặc tới cơ sở y tế gần nhất.${crisisVN ? " Đang có ý nghĩ làm hại bản thân thì có thể gọi đường dây Ngày Mai **096 306 1414** (13h–20h30, thứ 4 đến Chủ nhật)." : ""})`
      : "",
    sourceLine(t, srcs(seenIn, about, signs, avoid, tips, meds, doctor, emergency, t.diet ? t.diet.foods.filter((f) => f.verdict === "avoid" || f.verdict === "limit").slice(0, 8).map((f) => ({ text: f.name, src: f.src })) : []), now),
    "Muốn xem kỹ phần nào thì chọn bên dưới nha 👇",
  ];
  return parts.filter(Boolean).join("\n\n");
}

// ── 18/10: LƯU Ý THEO NHÓM CẦN THẬN TRỌNG (mang thai, cho con bú, trẻ nhỏ) ──
// Lỗi cần sửa: "Bà bầu bị táo bón nên làm gì?" → đọc nguyên bài của người lớn (kể cả gợi ý thuốc nhuận tràng), không nhắc gì tới thai kỳ.
// Ghép từ (1) đúng những ý CÓ NGUỒN trong thẻ nói về nhóm đó, và (2) lời dặn dùng thuốc đã có nguồn (DRUG_CLAIMS pregnancy-meds /
// breastfeeding-meds của NHS). Không tự viết lời khuyên mới cho nhóm này.
const PREG_CUE = VN(/ (mang thai|có thai|có bầu|bà bầu|mẹ bầu|đang bầu|mang bầu|thai phụ|bầu (\d+|mấy) (tháng|tuần)) /);
const BF_CUE = VN(/ (cho con bú|đang cho bú|nuôi con bằng sữa mẹ) /);
const KID_GROUP = VR(/ (bé|em bé|trẻ|trẻ em|trẻ nhỏ|sơ sinh|cháu|con (tôi|mình|em|tui|anh|chị)|\d+ (tuổi|tháng tuổi)) /u);
const PREG_FACT = VR(/mang thai|có thai|thai kỳ|bà bầu|sau sinh/iu);
const BF_FACT = VR(/cho con bú|sữa mẹ/iu);
const KID_FACT = VR(/(^|[^\p{L}])(trẻ|bé|em bé|sơ sinh)(?![\p{L}])/iu);
export function groupNote(t: MedTopic, text: string, shownText = ""): string {
  const a = acc(text);
  const b = bare(text);
  const pick = (re: RegExp) => allFacts(t).filter((f) => re.test(f.text) && !shownText.includes(f.text)).slice(0, 3);
  if (t.id !== "an-uong-khi-mang-thai" && PREG_CUE.test(b)) {
    const fs = pick(PREG_FACT);
    return [
      `🤰 **Đang mang thai thì lưu ý thêm:**`,
      fs.length ? bl(fs) : "",
      "• Trước khi dùng **bất kỳ thuốc gì** (kể cả thuốc không kê đơn) phải hỏi bác sĩ / dược sĩ — phần lớn thuốc dùng khi mang thai đi qua nhau thai tới em bé. Tiện nhất là hỏi nơi đang khám thai cho bạn.",
    ].filter(Boolean).join("\n");
  }
  if (BF_CUE.test(b)) {
    const fs = pick(BF_FACT);
    return [`🤱 **Đang cho con bú thì lưu ý thêm:**`, fs.length ? bl(fs) : "", "• Trước khi dùng thuốc, nói với bác sĩ / dược sĩ là mình đang cho con bú để họ chọn loại phù hợp — một lượng nhỏ thuốc có thể qua sữa mẹ."].filter(Boolean).join("\n");
  }
  if (t.kind !== "child" && !CHILD_OF.has(t.id) && KID_GROUP.test(a)) {
    const fs = pick(KID_FACT);
    return [
      `👶 **Với trẻ nhỏ thì lưu ý thêm:**`,
      fs.length ? bl(fs) : "",
      "• Thuốc và liều cho bé phải theo tuổi, cân nặng — hỏi bác sĩ / dược sĩ, không dùng thuốc của người lớn. Bé li bì, bỏ bú / bỏ ăn, co giật, thở nhanh hay nôn nhiều thì đưa đi khám ngay.",
    ].filter(Boolean).join("\n");
  }
  return "";
}
/** Chèn lưu ý nhóm ngay sau đoạn đầu của lời đáp (để không bị chìm dưới bài dài). */
export function withGroupNote(t: MedTopic, text: string, reply: string): string {
  // 18/10 (audit F, P1): đang mang thai mà lời đáp có dòng gợi ý ibuprofen (thẻ cúm, đau họng…) → ghi ngay trên dòng đó điều nguồn nói
  //   riêng cho thai kỳ (NHS "Ibuprofen for adults": tránh khi mang thai, trừ khi bác sĩ / dược sĩ khuyên — xem DRUG_CLAIMS preg-ibuprofen).
  if (t.id !== "an-uong-khi-mang-thai" && PREG_CUE.test(bare(text)))
    reply = reply.replace(/^(• [^\n]*ibuprofen[^\n]*)$/gimu, "$1 **Đang mang thai thì tránh ibuprofen**, trừ khi bác sĩ hoặc dược sĩ khuyên dùng.");
  const note = groupNote(t, text, reply);
  if (!note) return reply;
  const parts = reply.split("\n\n");
  // Đoạn đầu chỉ là tiêu đề ("🌿 Với **Táo bón**, nên:") → chèn sau đoạn kế tiếp, không chen giữa tiêu đề và danh sách của nó.
  const at = parts.length > 1 && /:\s*$/u.test(parts[0]) ? 2 : 1;
  parts.splice(Math.min(at, parts.length), 0, note);
  return parts.join("\n\n");
}

// ── 18/10: NGƯỜI DÙNG NHẮC MỘT DẤU HIỆU NGUY HIỂM CÓ TRONG THẺ ("phân có máu", "mất nước", "khó thở") ──
// Trước đây "Tiêu chảy kèm máu trong phân thì làm gì?" nhận bài chăm sóc tại nhà, còn ý "cần khám" có sẵn trong thẻ bị bỏ qua.
// Chỉ dùng các ý CÓ NGUỒN trong doctor / emergency của chính thẻ, đặt LÊN ĐẦU lời đáp.
const RED_CUES: { cue: RegExp; fact: RegExp; label: string }[] = [
  { cue: VN(/\b(máu trong phân|phân có máu|phân lẫn máu|đi ngoài ra máu|đi cầu ra máu|ỉa ra máu|phân đen|chảy máu hậu môn|có máu)\b/), fact: VR(/đi ngoài ra máu|đi cầu ra máu|máu trong phân|phân có máu|phân đen|máu đỏ|chảy máu ở hậu môn/iu), label: "có máu trong phân" },
  { cue: VN(/\b(mất nước)\b/), fact: VR(/mất nước|sốc/iu), label: "mất nước" },
  { cue: VN(/\b(khó thở|thở gấp|thở nhanh|hụt hơi|thở không nổi)\b/), fact: VR(/khó thở|thở nhanh/iu), label: "khó thở" },
  { cue: VN(/\b(đau ngực|tức ngực)\b/), fact: VR(/đau ngực/iu), label: "đau ngực" },
];
export function withRedFlags(t: MedTopic, question: string, reply: string): string {
  const q = ` ${normalizeVi(question)} `;
  const hit = RED_CUES.filter((c) => c.cue.test(q));
  if (!hit.length) return reply;
  const em = t.emergency.filter((f) => hit.some((c) => c.fact.test(f.text)) && !reply.includes(f.text));
  const doc = t.doctor.filter((f) => hit.some((c) => c.fact.test(f.text)) && !reply.includes(f.text));
  if (!em.length && !doc.length) return reply;
  const head = [
    `⚠️ **Với dấu hiệu bạn nhắc (${hit.map((c) => c.label).join(", ")}), đừng chỉ tự chăm sóc ở nhà:**`,
    em.length ? `🚨 Gọi **115** / đi cấp cứu ngay khi:\n${bl(em, 3)}` : "",
    doc.length ? `🧑‍⚕️ Cần đi khám sớm khi:\n${bl(doc, 3)}` : "",
  ].filter(Boolean).join("\n");
  return `${head}\n\n${reply}`;
}

/** Tên chủ đề đúng như người dùng gõ (giữ dấu, giữ chữ hoa/thường) — để nói lại "bạn đang bị **gout**". */
// ── 15/10: THẺ "TÊN GỌI CHUNG" (vd "viêm khớp") — hỏi ăn uống / một món thì trả lời theo từng LOẠI bệnh nằm dưới tên gọi đó ──
// Lỗi cần sửa (Kir gửi): "Viêm khớp nên kiêng gì?" → đọc nguyên bài ăn uống của thẻ chung, không nói ngay rằng viêm khớp gồm nhiều bệnh,
// không phân biệt gout (có hướng dẫn riêng) với viêm khớp dạng thấp (nguồn không ủng hộ kiêng món cụ thể). Mọi câu chữ về bệnh vẫn lấy
// nguyên từ thẻ có nguồn; ở đây chỉ sắp xếp và ghi nguồn theo TỪNG thẻ để truy ngược được từng nhận định.
export const UMBRELLA: Record<string, string[]> = {
  "viem-khop": ["thoai-hoa-khop", "viem-khop-dang-thap", "gout"],
};
const pubList = (t: MedTopic, src: number[], now: number) => {
  const line = sourceLine(t, src.length ? src : [0], now);
  const m = line.match(/^📚 Nguồn: (.*?)\. Lomi đối chiếu ngày ([\d/]+)/u);
  return m ? `${m[1]} (Lomi đối chiếu ${m[2]})` : line;
};
/** Các món trong thẻ có tên chứa đúng cụm được hỏi ("sữa" → "sữa ít béo", "sữa nguyên kem"). */
function foodsNamed(t: MedTopic, phrase: string): MedFood[] {
  if (!t.diet || !phrase) return [];
  const p = ` ${phrase} `;
  // tên món chứa cụm hỏi ("sữa" ⊂ "sữa ít béo"), hoặc cụm hỏi chứa tên món ("rượu bia" ⊃ "bia", "rượu")
  return t.diet.foods.filter((f) => [f.name, ...f.aliases].some((nm) => { const k = ` ${normalizeVi(nm)} `; return k.trim().length >= 2 && (k.includes(p) || p.includes(k)); }));
}
const SAY: Record<MedFood["verdict"], string> = { avoid: "nên **tránh**", limit: "nên **hạn chế**", ok: "**được**", good: "là món **nên ăn**" };
/** Ăn uống với một thẻ tên gọi chung: điều chung có nguồn → khác nhau theo từng loại → một câu hỏi làm rõ. */
export function renderUmbrella(t: MedTopic, subs: MedTopic[], aspect: "diet" | "food", food?: string | null, shown?: string, now = Date.now()): MedReply {
  const N = t.names[0];
  const used: [MedTopic, number[]][] = [];
  const note = (x: MedTopic, fs: DrugFact[]) => (used.push([x, fs.flatMap((f) => f.src)]), fs);
  const lab = (x: MedTopic) => `**${cap(x.names[0])}**`;
  const out: string[] = [];
  if (aspect === "diet") {
    out.push(`Với **${N}** thì **không có một danh sách kiêng chung cho mọi người** — “${N}” là cách gọi chung của nhiều bệnh khớp khác nhau, mỗi bệnh chuyện ăn uống một khác.`);
    const gen = note(t, [...(t.diet?.avoid ?? []), ...(t.diet?.ok ?? [])]);
    if (gen.length) out.push(`Điều nên làm chung cho người bị ${N}:\n${bl(gen)}`);
  } else {
    const f = matchFood(t, food ?? "", shown);
    if (f) {
      note(t, [{ text: f.note, src: f.src }]);
      out.push(`Với **${N}** nói chung: **${f.name}** ${SAY[f.verdict]}.\n${f.note}`);
    } else {
      const gen = note(t, [...(t.diet?.avoid ?? []).slice(0, 1), ...(t.diet?.ok ?? []).slice(0, 1)]);
      out.push(`Với **${N}** nói chung, các nguồn Lomi đối chiếu **không nêu riêng ${shown ?? food}** — nên Lomi không nói là phải kiêng${gen.length ? `. Điều nguồn khuyên chung:\n${bl(gen)}` : "."}`);
    }
  }
  const lines: string[] = [];
  const silent: MedTopic[] = []; // hỏi một món mà thẻ của loại đó không nêu → gom lại một dòng
  for (const s of subs) {
    if (aspect === "food" && food) {
      const fs = foodsNamed(s, food);
      const one = fs.length ? null : matchFood(s, food, shown);
      const hits = fs.length ? fs : one ? [one] : [];
      if (hits.length) {
        note(s, hits.map((h) => ({ text: h.note, src: h.src })));
        lines.push(`• ${lab(s)}: ${hits.map((h) => `${h.name} ${SAY[h.verdict]} — ${h.note.replace(/\.$/, "")}`).join("; ")}.`);
        continue;
      }
    }
    if (aspect === "food") {
      silent.push(s);
      continue;
    }
    // hỏi chung → ý chính về ăn uống của loại bệnh này, đúng như nguồn
    const lead = s.diet?.avoid[0] ?? s.diet?.ok[0];
    const weights = s.care.filter((c) => VR(/(giảm cân|thừa cân|cân nặng)/iu).test(c.text));
    const weight = weights.find((c) => VR(/thừa cân làm/iu).test(c.text)) ?? weights.find((c) => !VR(/^triệu chứng/iu).test(c.text)) ?? weights[0];
    if (lead) lines.push(`• ${lab(s)}: ${note(s, [lead])[0].text}${s.id === "gout" ? " Đây là hướng dẫn riêng cho gout, không áp nguyên cho mọi loại viêm khớp." : ""}`);
    else if (weight) lines.push(`• ${lab(s)}: chưa thấy hướng dẫn kiêng món nào riêng. Điều nên lưu ý: “${note(s, [weight])[0].text}”`);
    else lines.push(`• ${lab(s)}: các nguồn Lomi đối chiếu không nêu cách ăn uống riêng.`);
  }
  if (silent.length) lines.push(`• ${silent.map(lab).join(", ")}: nguồn không nêu riêng ${shown ?? food}${silent.some((x) => x.id === "viem-khop-dang-thap") ? " — với viêm khớp dạng thấp, nguồn còn nói chưa có bằng chứng mạnh rằng kiêng một món cụ thể giúp bệnh đỡ hơn" : ""}.`);
  if (silent.some((x) => x.id === "viem-khop-dang-thap")) {
    const ra = silent.find((x) => x.id === "viem-khop-dang-thap")!;
    if (ra.diet?.avoid[0]) note(ra, [ra.diet.avoid[0]]);
  }
  if (lines.length) out.push(`${aspect === "diet" ? "Còn tuỳ từng loại" : "Tuỳ loại " + N}:\n${lines.join("\n")}`);
  out.push(`Bạn (hoặc người nhà) đã được bác sĩ nói là loại ${N} nào chưa? Biết loại thì Lomi nói kỹ phần ăn uống cho đúng loại đó.`);
  // Nguồn ghi theo TỪNG thẻ (gộp chỉ số nguồn đã dùng) — ngày rà soát là của trang nguồn, ngày "đối chiếu" là ngày Lomi kiểm tra thẻ.
  const per = new Map<MedTopic, number[]>();
  for (const [x, src] of used) per.set(x, [...(per.get(x) ?? []), ...src]);
  out.push(`📚 Nguồn — ${[...per.entries()].map(([x, src]) => `${cap(x.names[0])}: ${pubList(x, src, now)}`).join(" · ")}. Đây là kiến thức tham khảo chung, không thay lời dặn của bác sĩ.`);
  const quick = subs.map((s) => `${cap(s.names[0])} kiêng gì?`);
  return { text: out.join("\n\n"), aspect, partial: false, topic: t, quick };
}

export function nameAsTyped(text: string, id: string): string | null {
  const row = LOOKUP_ROWS.find((r) => r.id === id);
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
    const row = LOOKUP_ROWS.find((r) => r.id === own)!;
    const names = row.names;
    // (tâm lý — "a hay lo âu quá" — là lời tâm sự, không phải nêu chủ đề kiến thức)
    if (!isMedQuestion(text, names, row.kind === "mental" || row.kind === "term" ? 0 : row.kind === "other" || row.kind === "women" ? 2 : 1)) return null;
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
    // 19/10: góc nhìn triệu chứng chỉ trả lời cách chăm sóc / khi nào khám / thuốc — câu khác để các lớp cũ trả lời như trước.
    if (row.view && !VIEW_ASPECTS.has(a)) return null;
    return { id: own, aspect: a, food: a === "food" ? topicLike : null };
  }
  // câu nối không nhắc lại tên: "còn nhộng thì sao", "vậy ăn gì được", "triệu chứng?"
  const asp = aspectOf(text);
  if (prev?.id && words <= 9) {
    // (góc nhìn triệu chứng: chỉ câu nối hỏi cách chăm sóc / khi nào khám / thuốc — "vậy làm sao?", "có cần đi khám không")
    if (isSymptomView(prev.id)) return asp && VIEW_ASPECTS.has(asp) ? { id: prev.id, aspect: asp, food: null } : null;
    const n = normalizeVi(text);
    if (MEAL_SUGGEST.test(` ${n} `) && !VN(/\b(kiêng|nên ăn|tránh)\b/).test(n)) return null;
    // (19/10: "uống thuốc gì được?" là hỏi THUỐC, không phải hỏi món "thuốc gì")
    if (asp === "meds") return { id: prev.id, aspect: "meds", food: null };
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

// ── 20/10 (Kir: "bỏ giúp mấy phần lặp đi lặp lại"): lời dặn chung chỉ nói LẦN ĐẦU trong cuộc trò chuyện ──
//   (không kê đơn / không nêu liều · "muốn xem kỹ phần nào…" · lời dặn chung khi dùng thảo dược · chú thích mức bằng chứng)
const REPEAT_NOTES: { key: RegExp; drop: RegExp[] }[] = [
  { key: /không kê (thuốc hay nêu liều|đơn, không nêu liều)/u, // (tin đã lưu đã đổi xưng hô: "Lomi" → "em" — khoá không phụ thuộc chủ ngữ)
    drop: [/\n\n💊 Lomi không kê thuốc hay nêu liều[^\n]*/gu, /\n_Lomi không kê đơn, không nêu liều[^\n]*_/gu] },
  { key: /Muốn xem kỹ phần nào thì chọn bên dưới nha/u, drop: [/\n\nMuốn xem kỹ phần nào thì chọn bên dưới nha 👇/gu] },
  { key: /Đang dùng thuốc, mang thai, cho con bú, có bệnh gan/u, drop: [/\n\n💊 Đang dùng thuốc, mang thai, cho con bú, có bệnh gan[^\n]*/gu] },
  { key: /✅ có bằng chứng \(còn hạn chế\) · /u, drop: [/\n\n✅ có bằng chứng \(còn hạn chế\) · [^\n]*/gu] },
  { key: /_Hỏi tên từng vị để xem ai không nên dùng\._/u, drop: [/\n_Hỏi tên từng vị để xem ai không nên dùng\._/gu] },
];
/** Bỏ các lời dặn chung đã xuất hiện trong các tin trước của Lomi (`earlier`: nội dung các tin trước, mới nhất cuối). */
export function trimRepeatedNotes(text: string, earlier: string[]): string {
  let out = text;
  for (const n of REPEAT_NOTES) if (earlier.some((e) => n.key.test(e))) for (const d of n.drop) out = out.replace(d, "");
  return out;
}
