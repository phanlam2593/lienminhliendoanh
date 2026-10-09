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
  sources: DrugSource[];
  verifiedAt: string;
};
type IndexRow = { id: string; kind: MedTopic["kind"]; names: string[] };
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

/** Chủ đề được nhắc trong câu (tên dài nhất thắng). Tên ngắn / dễ lẫn (< 4 chữ cái) chỉ nhận khi GÕ ĐÚNG DẤU. */
export function findMedTopicId(text: string): string | null {
  const b = bare(text);
  const a = acc(text);
  for (const k of NAME_KEYS) if (k.short ? a.includes(k.acc) : b.includes(k.bare)) return k.id;
  return null;
}

// ── Khía cạnh được hỏi ──
export type MedAspect = "define" | "signs" | "causes" | "course" | "spread" | "care" | "diet" | "food" | "doctor" | "emergency" | "meds";
const ASPECTS: [MedAspect, RegExp][] = [
  ["spread", /\b(co lay|lay khong|lay qua|lay nhiem|lay truyen|truyen nhiem|lay sang|bi lay|lay cho|lay tu|lay khi|lay duoc)\b/],
  ["emergency", /\b(cap cuu|goi 115|nguy hiem den tinh mang|dau hieu nguy hiem|bao dong)\b/],
  ["meds", /\b(thuoc gi|thuoc nao|uong thuoc|dung thuoc|thuoc tri|thuoc chua|co thuoc|can thuoc|thuoc dac tri)\b/],
  ["diet", /\b(kieng|an gi|uong gi|uong nuoc gi|an uong gi|gi tot|che do an|thuc don|nen an|nen uong|tranh an|an uong|duoc an gi|dinh duong|bo sung gi)\b/],
  ["signs", /\b(trieu chung|dau hieu|bieu hien|nhan biet|nhan ra|co nhung dau hieu|co hien tuong gi|bi sao|bi nhu the nao)\b/],
  ["causes", /\b(nguyen nhan|tai sao|vi sao|do dau|yeu to nguy co|dan den|gay ra|tai sao bi|vi sao bi|do cai gi|bi do gi)\b/],
  ["doctor", /\b(di kham|kham o dau|kham khoa nao|khoa nao|can kham|nen kham|khi nao.*(kham|gap bac si|di vien)|gap bac si|bac si nao|di vien)\b/],
  ["course", /\b(co khoi|khoi duoc|khoi han|chua khoi|bao lau khoi|co lay|lay khong|lay qua|di truyen|co nguy hiem|nguy hiem khong|tien trien|keo dai|tai phat|bien chung|co chet|co nang khong|nang khong|co tu khoi|tu khoi|kho chua|co chua duoc|chua duoc khong|vinh vien)\b/],
  ["care", /\b(cach chua|chua sao|chua the nao|chua nhu the nao|chua benh|chua tri|dieu tri|cach tri|lam sao|lam gi|phai lam gi|nen lam gi|cham soc|phong ngua|phong tranh|giam dau|cho do|cai thien|tu xu ly|xu ly|xu tri|so cuu|tap luyen|van dong|sinh hoat)\b/],
  ["define", /\b(la gi|la benh gi|la sao|nghia la gi|co nghia|hieu nhu the nao|khai niem|dinh nghia|co phai la|giai thich|khac gi|khac nhau|phan biet)\b/],
];
const CHARS_ACC_CHUA = /(?<![\p{L}])chữa(?![\p{L}])/u;
// Câu hỏi về MỘT MÓN cụ thể: "ăn X được không", "uống X có sao không", "X có ăn được không", "có nên ăn X".
const FOOD_Q = /\b(?:an|uong|dung|nau|nhau|cho (?:vao|them)|bo sung|dung kem|an them|an nhieu|uong nhieu)\s+((?:\S+\s){0,3}?\S+?)\s+(?:co |thi |nua )?(?:duoc|co sao|co tot|co nen|co hai|co anh huong|co kieng|ko|khong|k|hong|nhe|nha|chu)\b/;
const FOOD_Q2 = /\b((?:\S+\s){0,3}?\S+?)\s+(?:co |thi )?(?:an|uong|dung) (?:duoc|co sao|co tot)/;
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
export function matchFood(t: MedTopic, phrase: string): MedFood | null {
  if (!t.diet || !phrase) return null;
  const p = ` ${phrase} `;
  let best: { f: MedFood; len: number } | null = null;
  for (const f of t.diet.foods)
    for (const nm of [f.name, ...f.aliases]) {
      const k = normalizeVi(nm);
      if (k.length < 2) continue;
      if (p.includes(` ${k} `) || bare(k).includes(p)) {
        if (!best || k.length > best.len) best = { f, len: k.length };
      }
    }
  return best?.f ?? null;
}

export function aspectOf(text: string): MedAspect | null {
  const n = bare(text);
  // "có chữa khỏi không", "bao lâu thì khỏi" là hỏi DIỄN TIẾN (có khỏi không), không phải hỏi cách chữa.
  if (/\b(chua khoi|khoi duoc|khoi khong|khoi han|co khoi|bao lau khoi|bao lau thi khoi|khoi chua)\b/.test(n)) return "course";
  if (CHARS_ACC_CHUA.test(text.normalize("NFC").toLowerCase())) return "care";
  for (const [a, re] of ASPECTS) if (re.test(n)) return a;
  return null;
}

// ── Câu hỏi KIẾN THỨC hay đang KỂ chuyện của mình? ──
const SELF_STATE = /^(?:\s)?(?:a|anh|e|em|c|chi|minh|toi|tui|to)\s+(?:dang |cung |hay |bi |moi |vua |lai |van |thuong )*(?:bi|mac|co|hay|thay|cam thay|dang|bi)\b/;
const QWORD = /\b(gi|la gi|the nao|nhu nao|ra sao|sao khong|duoc khong|co khong|co duoc|khong\b|ko\b|\bk\b|hong\b|chua|nen|nguyen nhan|trieu chung|dau hieu|kieng|lam sao|bao lau|co nguy hiem|co lay|co khoi|co phai|tai sao|vi sao|khi nao|o dau|nghia|giai thich|tim hieu|hoi ve|noi ve)\b/;
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

export type MedReply = { text: string; quick: string[]; aspect: MedAspect | "overview"; partial?: boolean; topic: MedTopic };

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
export function renderMed(t: MedTopic, aspect: MedAspect | "overview", food?: string | null, now = Date.now(), shown?: string): MedReply {
  const N = title(t);
  const end = (used: DrugFact[][]) => `${sourceLine(t, srcs(...used), now)}`;
  const out = (text: string, a: MedReply["aspect"], partial = false): MedReply => ({ text, aspect: a, partial, topic: t, quick: chipsOf(t, a === "overview" ? undefined : a === "food" ? "diet" : a) });

  if (aspect === "food" && food) {
    const f = matchFood(t, food);
    if (f) {
      const say = f.verdict === "avoid" ? "nên **tránh**" : f.verdict === "limit" ? "nên **hạn chế**" : f.verdict === "good" ? "là món **nên ăn**" : "**được**";
      const body = `Với ${N}: **${f.name}** ${say}.\n${f.note}${f.name !== cap(food) && normalizeVi(f.name) !== food && f.aliases.some((a) => normalizeVi(a) === food) ? `\n(Lomi hiểu “${shown ?? food}” thuộc nhóm “${f.name}” theo cách nguồn phân nhóm.)` : ""}`;
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
      const eat = t.care.filter((f) => /(^|[^\p{L}])(ăn|uống|bú|thức ăn|đồ ăn|bù nước|oresol)(?![\p{L}])/iu.test(f.text));
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

export type MedState = { id: string; aspect?: string };
export type MedAsk = { id: string; aspect: MedAspect | "overview"; food: string | null };

/** Câu này có phải câu hỏi kiến thức về một chủ đề trong kho không? prev = chủ đề đang nói ở tin trước (cho câu nối). */
export function parseMedAsk(text: string, prev?: MedState): MedAsk | null {
  const own = findMedTopicId(text);
  const asp = aspectOf(text);
  const words = normalizeVi(text).split(" ").length;
  if (own) {
    const names = ROWS.find((r) => r.id === own)!.names;
    if (!isMedQuestion(text, names)) return null;
    const topicLike = foodPhrase(text, null);
    const a: MedAspect | "overview" = topicLike && asp !== "spread" && (!asp || asp === "diet" || asp === "define") && /\b(an|uong|dung)\b/.test(normalizeVi(text)) && !/\b(kieng|an gi|uong gi|nen an|tranh an)\b/.test(normalizeVi(text)) ? "food" : (asp ?? "overview");
    return { id: own, aspect: a, food: a === "food" ? topicLike : null };
  }
  // câu nối không nhắc lại tên: "còn nhộng thì sao", "vậy ăn gì được", "triệu chứng?"
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
  }
  return null;
}
