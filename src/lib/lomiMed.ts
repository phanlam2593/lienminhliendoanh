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
const canon = (n: string) => n.replace(/\bky\b/g, "ki").replace(/\bly\b/g, "li");
const bare = (x: string) => ` ${canon(normalizeVi(x))} `;
const acc = (x: string) => ` ${x.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
type NameKey = { id: string; bare: string; acc: string; short: boolean; len: number };
const NAME_KEYS: NameKey[] = ROWS.flatMap((r) =>
  r.names.map((n) => ({ id: r.id, bare: bare(n), acc: acc(n), short: normalizeVi(n).replace(/ /g, "").length < 4, len: normalizeVi(n).length })),
).sort((a, b) => b.len - a.len);

// Một chữ có dấu so theo (chữ gốc + mũ/móc/đ) và tập dấu thanh — không phụ thuộc vị trí đặt dấu ("hoà" = "hòa"),
// và "kỷ"/"kỉ", "lý"/"lí" coi như nhau.
const TONES = /[̣̀́̃̉]/g;
function wordKey(w: string): string {
  const d = w.normalize("NFD");
  const tone = (d.match(TONES) || []).sort().join("");
  let base = d.replace(TONES, "").normalize("NFC");
  if (/^[kl][yi]$/.test(base)) base = base.replace("y", "i");
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

/** Chủ đề được nhắc trong câu (tên dài nhất thắng). Tên ngắn / dễ lẫn (< 4 chữ cái) chỉ nhận khi GÕ ĐÚNG DẤU. */
export function findMedTopicId(text: string): string | null {
  const b = bare(text);
  const a = acc(text);
  for (const k of NAME_KEYS) {
    if (!(k.short ? a.includes(k.acc) : b.includes(k.bare) && accentAgrees(a, k.acc))) continue;
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
const DIET_CUE = / (an|uong|kieng|thuc pham|mon|do an|thuc an|nhau|bia|ruou|ca phe) /;
const CHILD_OF = new Map(ROWS.filter((r) => r.child).map((r) => [r.id, r.child!]));
// ("con" có dấu là "còn" → xét trên chữ có dấu; câu gõ không dấu thì đành xét bản không dấu)
const KID_CUE = / (con|bé|trẻ|em bé|cháu|sơ sinh|nhi|bé con) /u;
const KID_CUE_B = / (con|be|tre|em be|chau|so sinh) /;

// ── Khía cạnh được hỏi ──
export type MedAspect = "define" | "signs" | "causes" | "course" | "spread" | "care" | "diet" | "food" | "doctor" | "emergency" | "meds";
const ASPECTS: [MedAspect, RegExp][] = [
  ["spread", /\b(co lay|lay khong|lay qua|lay nhiem|lay truyen|truyen nhiem|lay sang|bi lay|lay cho|lay tu|lay khi|lay duoc|lay the nao|lay nhu the nao|lay ra sao|lay bang|lay duong)\b/],
  ["emergency", /\b(cap cuu|goi 115|nguy hiem den tinh mang|dau hieu nguy hiem|bao dong)\b/],
  ["meds", /\b(thuoc gi|thuoc nao|uong thuoc|dung thuoc|thuoc tri|thuoc chua|co thuoc|can thuoc|thuoc dac tri)\b/],
  ["diet", /\b(kieng|an gi|uong gi|uong nuoc gi|an uong gi|gi tot|che do an|thuc don|nen an|nen uong|tranh an|an uong|duoc an gi|dinh duong|bo sung gi)\b/],
  ["signs", /\b(trieu chung|dau hieu|bieu hien|nhan biet|nhan ra|co nhung dau hieu|co hien tuong gi|bi sao|bi nhu the nao|lam sao biet|sao biet|lam sao de biet|biet minh bi|biet co bi)\b/],
  ["causes", /\b(nguyen nhan|tai sao|vi sao|do dau|yeu to nguy co|dan den|gay ra|tai sao bi|vi sao bi|do cai gi|bi do gi|di truyen)\b/],
  ["doctor", /\b(di kham|kham o dau|kham khoa nao|khoa nao|can kham|nen kham|khi nao.*(kham|gap bac si|di vien)|gap bac si|bac si nao|di vien)\b/],
  ["course", /\b(co khoi|khoi duoc|khoi han|chua khoi|bao lau khoi|co lay|lay khong|lay qua|co nguy hiem|co het|het khong|het ko|het duoc|co sao khong|co sao ko|nguy hiem khong|tien trien|keo dai bao lau|keo dai khong|co keo dai|bi bao lau|tai phat|bien chung|co chet|co nang khong|nang khong|co tu khoi|tu khoi|kho chua|co chua duoc|chua duoc khong|vinh vien)\b/],
  ["care", /\b(cach chua|chua sao|chua the nao|chua nhu the nao|chua benh|chua tri|dieu tri|cach tri|lam sao|lam gi|phai lam gi|nen lam gi|cham soc|phong ngua|phong tranh|giam dau|cho do|cai thien|tu xu ly|xu ly|xu tri|so cuu|tap luyen|van dong|sinh hoat|boi gi|boi thuoc|boi kem|thoa gi)\b/],
  ["define", /\b(la gi|la benh gi|la sao|nghia la gi|co nghia|hieu nhu the nao|khai niem|dinh nghia|co phai la|giai thich|khac gi|khac nhau|phan biet)\b/],
];
const CHARS_ACC_CHUA = /(?<![\p{L}])chữa(?![\p{L}])/u;
// Câu hỏi về MỘT MÓN cụ thể: "ăn X được không", "uống X có sao không", "X có ăn được không", "có nên ăn X".
const FOOD_Q = /\b(?:an|uong|dung|nau|nhau|cho (?:vao|them)|bo sung|dung kem|an them|an nhieu|uong nhieu)\s+((?:\S+\s){0,3}?\S+?)\s+(?:co |thi |nua )?(?:duoc|dc|co sao|co tot|co nen|co hai|co anh huong|co kieng|ko|khong|k|hong|nhe|nha|chu)\b/;
const FOOD_Q2 = /\b((?:\S+\s){0,3}?\S+?)\s+(?:co |thi )?(?:an|uong|dung) (?:duoc|dc|co sao|co tot)/;
const OVERVIEW_ASK = /\b(noi ve|tim hieu ve|hoi ve|gioi thieu|biet gi ve|biet ve|co biet)\b/;
const FILL = new Set("thi la nao nay do kia nua luon cung hay minh toi tui em anh chi ban co cac nhung mot it nhieu gi sao the cai vu dieu chuyen no".split(" "));
// "hôm nay ăn gì", "trưa nay ăn gì" là nhờ gợi ý món — không phải hỏi kiêng cữ của bệnh đang nói.
const MEAL_SUGGEST = /\b(hom nay|toi nay|trua nay|sang nay|chieu nay|bay gio|gio nay|lat nua|bua nay)\b/;

/** Món / thứ được hỏi ("gout ăn nhộng được không" → "nhong"). Trả về chuỗi đã bỏ dấu, hoặc null. */
export function foodPhrase(text: string, topic?: MedTopic | null): string | null {
  let n = normalizeVi(text);
  if (topic) for (const nm of topic.names) n = ` ${n} `.replace(` ${normalizeVi(nm)} `, " ").trim();
  const m = n.match(FOOD_Q) ?? n.match(FOOD_Q2);
  if (!m) return null;
  const words = m[1].split(" ").filter((w) => w && !FILL.has(w));
  const p = words.join(" ").trim();
  return p.length >= 2 ? p : null;
}
/** Cụm món đúng như người dùng gõ (có dấu) — để nói lại "nhộng" chứ không phải "nhong". */
export function foodDisplay(text: string, phrase: string): string {
  const orig = text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const b = orig.map((w) => normalizeVi(w));
  const want = phrase.split(" ");
  for (let i = 0; i + want.length <= b.length; i++) if (want.every((w, j) => b[i + j] === w)) return orig.slice(i, i + want.length).join(" ");
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
      const hit = single ? false : p.includes(` ${k} `) ? !sa || accentAgrees(sa, acc(nm)) : bare(k).includes(p) ? !sa || accentAgrees(acc(nm), sa) : false;
      if (hit) {
        if (!best || k.length > best.len) best = { f, len: k.length };
      }
    }
  return best?.f ?? null;
}

export function aspectOf(text: string): MedAspect | null {
  const n = ` ${normalizeVi(text)} `; // không qua canon(): canon đổi "xử lý" thành "xu li" làm lọt khía cạnh "xử lý"
  // "có chữa khỏi không", "bao lâu thì khỏi" là hỏi DIỄN TIẾN (có khỏi không), không phải hỏi cách chữa.
  if (/\b(chua khoi|khoi duoc|khoi khong|khoi han|co khoi|bao lau khoi|bao lau thi khoi|khoi chua)\b/.test(n)) return "course";
  if (CHARS_ACC_CHUA.test(text.normalize("NFC").toLowerCase())) return "care";
  for (const [a, re] of ASPECTS) if (re.test(n)) return a;
  return null;
}

// ── Câu hỏi KIẾN THỨC hay đang KỂ chuyện của mình? ──
const SELF_STATE = /^(?:\s)?(?:a|anh|e|em|c|chi|minh|toi|tui|to)\s+(?:dang |cung |hay |bi |moi |vua |lai |van |thuong )*(?:bi|mac|co|hay|thay|cam thay|dang|bi)\b/;
const QWORD0 = /\b(gi|la gi|the nao|nhu nao|ra sao|sao khong|duoc khong|co khong|co duoc|nen|nguyen nhan|trieu chung|dau hieu|kieng|lam sao|bao lau|co nguy hiem|co lay|co khoi|co phai|tai sao|vi sao|khi nao|o dau|nghia|giai thich|tim hieu|hoi ve|noi ve)\b/;
// "không / chưa" giữa câu là phủ định ("ngủ không được, đầu cứ nghĩ…"); chỉ đứng CUỐI câu mới là từ hỏi ("ăn nhộng đc k").
const QWORD = { test: (x: string) => QWORD0.test(x) || /(?:^| )(?:khong|ko|k|hong|chua) *$/.test(x) };
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
  const rest = topicNames.reduce((acc2, nm) => acc2.replace(normalizeVi(nm), " "), n).replace(/\b(benh|chung|hoi chung|roi loan|a|ha|nha|nhe|ne|do|vay|the|la|cai|viec|tinh trang|bi)\b/g, " ").replace(/\s+/g, " ").trim();
  if (topicNames.length && rest === "" && words <= 4) return true;
  // tên + cụm bổ nghĩa ngắn: "tăng động giảm chú ý ở người lớn", "trầm cảm sau sinh", "gout cho người già"
  if (topicNames.length && words <= 9 && !SELF_STATE.test(n) && /^(?:o|cho|khi|tren|sau|truoc|trong) \S+(?: \S+){0,2}$/.test(rest)) return true;
  // có từ hỏi + tên chủ đề nhưng không rõ khía cạnh ("ADHD người lớn có không", "tay chân miệng ở người lớn có không") → tóm tắt chủ đề.
  if (hasQ && topicNames.length && !SELF_STATE.test(n) && !foodPhrase(text)) return true;
  // câu kể có hỏi kèm ("a bị gout ăn nhộng được không") — phần hỏi là món
  if (hasQ && foodPhrase(text) && !/^(?:a|anh|e|em)\s+(?:ko|khong)\b/.test(n)) return true;
  return false;
}

// ── Dựng lời đáp (ghép hoàn toàn từ dữ liệu có nguồn) ──
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const bl = (fs: DrugFact[], max = 99) => fs.slice(0, max).map((f) => `• ${f.text}`).join("\n");
const srcs = (...g: DrugFact[][]) => g.flat().flatMap((f) => f.src);
const title = (t: MedTopic) => `**${cap(t.names[0])}**`;
// Lời dặn an toàn nằm trong ghi chú của món (vd mật ong "không dùng cho trẻ dưới 1 tuổi") — tóm theo món vẫn phải giữ lại.
const CAUTION = /(không (?:dùng|cho|nên|được)|tránh cho|trẻ (?:dưới|nhỏ|em|sơ sinh)|mang thai|bà bầu|cho con bú|dị ứng)/i;
function caution(note: string): string {
  const s = note.split(/(?<=[.;])\s+|;\s*/).find((x) => CAUTION.test(x));
  return s ? ` (${s.replace(/[.;]\s*$/, "").trim().replace(/^./, (c) => c.toLowerCase())})` : "";
}
const LAB: Record<string, string> = { avoid: "🚫 Nên tránh", limit: "⚠️ Nên hạn chế", ok: "✅ Được (theo nguồn)", good: "👍 Nên ăn" };

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
    if (cut[i] || cut[i + 1] || FOCUS_STOP.has(b[i]) || FOCUS_STOP.has(b[i + 1])) continue;
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
      const eat = t.care.filter((f) => /(^|[^\p{L}])(ăn|uống|bú|thức ăn|đồ ăn|bù nước|oresol)(?![\p{L}])/iu.test(f.text) && !/thuốc|corticoid|kháng sinh|kháng virus/iu.test(f.text));
      if (eat.length)
        return out([`Các nguồn y khoa Lomi đã đối chiếu **không có danh sách kiêng cữ riêng** cho ${N}. Phần chăm sóc có nhắc tới ăn uống thế này:`, bl(eat, 5), "Muốn chắc về món cụ thể, bạn hỏi bác sĩ hoặc chuyên viên dinh dưỡng nha.", end([eat])].join("\n\n"), "diet", true);
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
    const med = t.care.filter((c) => /thuốc/i.test(c.text));
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
    const fs = [...t.causes, ...t.course, ...t.care].filter((f) => /lây|truyền|nhiễm từ|qua đường|tiếp xúc/i.test(f.text));
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
      ov.text = `Ý “${fc.asked[0]}” bạn hỏi thì các nguồn Lomi đã đối chiếu cho ${N} **chưa nói rõ**, nên Lomi chưa xác minh được — bạn hỏi bác sĩ để chắc nha.\n\nDưới đây là phần Lomi đã kiểm chứng:\n\n${ov.text.replace(/^Về .*? như sau:\n\n/, "")}`;
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
    const a: MedAspect | "overview" = topicLike && aspF !== "spread" && (!aspF || aspF === "diet" || aspF === "define") && /\b(an|uong|dung)\b/.test(normalizeVi(text)) && !/\b(kieng|an gi|uong gi|nen an|tranh an)\b/.test(normalizeVi(text)) ? "food" : (asp ?? "overview");
    if (row.dietOnly && a !== "food" && a !== "diet") return null;
    return { id: own, aspect: a, food: a === "food" ? topicLike : null };
  }
  // câu nối không nhắc lại tên: "còn nhộng thì sao", "vậy ăn gì được", "triệu chứng?"
  const asp = aspectOf(text);
  if (prev?.id && words <= 9) {
    const n = normalizeVi(text);
    if (MEAL_SUGGEST.test(` ${n} `) && !/\b(kieng|nen an|tranh)\b/.test(n)) return null;
    const fp = foodPhrase(text, null);
    if (fp && asp !== "spread" && /\b(an|uong|dung)\b/.test(n) && !/\b(kieng|an gi|uong gi|nen an|tranh an)\b/.test(n)) return { id: prev.id, aspect: "food", food: fp };
    const fm = n.match(/^(?:vay |the |con |nhung |roi )*((?:\S+ ){0,2}?\S+?) (?:thi sao|sao|co duoc khong|duoc khong|co sao khong|duoc k|duoc ko)$/);
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
