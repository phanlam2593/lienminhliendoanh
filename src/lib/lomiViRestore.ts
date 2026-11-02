// ─────────────────────────────────────────────────────────────────────────────
// KHÔI PHỤC DẤU TIẾNG VIỆT (10/10, theo ý Kir: "sửa 1 lúc lỗi kiểu tiếng Việt… update 1 từ điển VN") — chạy trên máy, không gọi AI.
//
// Câu gõ KHÔNG DẤU ("con em bi chong mat") được đoán lại dấu ("con em bị chóng mặt") TRƯỚC khi các lớp của Lomi đọc câu, nhờ:
//   • từ điển chữ có dấu + số lần gặp,
//   • thống kê CẶP CHỮ hay đi liền nhau ("chóng mặt" chứ không phải "chồng mất"),
// cùng học từ chữ tiếng Việt có dấu ngay trong app (lời thoại, chú thích, kho kiến thức y khoa) — scripts/vi-accent-build.py.
// Thuật toán: Viterbi trên chuỗi chữ — chọn cách đọc có tổng điểm cặp chữ cao nhất.
//   • chữ người dùng ĐÃ gõ dấu thì giữ nguyên (chỉ dùng làm ngữ cảnh);
//   • chữ không có trong từ điển (tên riêng, tiếng Anh, chữ viết tắt "k", "dc") thì giữ nguyên.
// Bỏ dấu của câu đã khôi phục luôn trùng câu gốc → các lớp so KHÔNG DẤU không đổi gì; chỉ các lớp so CÓ DẤU đọc đúng hơn.
// ─────────────────────────────────────────────────────────────────────────────
/** u: số lần gặp mỗi chữ; b["a"]["b"]: số lần "a b" đi liền; t["a b"]["c"]: số lần "a b c". "<s>" / "</s>" = đầu / cuối câu. */
export type ViModel = { u: Record<string, number>; b: Record<string, Record<string, number>>; t?: Record<string, Record<string, number>> };

const strip = (w: string) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFC");
const HAS_MARK = /\P{ASCII}/u;

type Index = { m: ViModel; forms: Map<string, string[]>; total: number };
let idx: Index | null = null;
function build(m: ViModel): Index {
  const forms = new Map<string, string[]>();
  let total = 0;
  for (const [w, c] of Object.entries(m.u)) {
    if (w === "<s>" || w === "</s>") continue;
    total += c;
    const k = strip(w);
    const a = forms.get(k);
    if (a) a.push(w);
    else forms.set(k, [w]);
  }
  return { m, forms, total };
}
/** Dùng trong test / khi đã có sẵn mô hình. */
export function useViModel(m: ViModel) {
  idx = build(m);
}
let loading: Promise<void> | null = null;
/** Nạp mô hình (một chunk riêng, tải ở lần đầu gặp câu không dấu). */
export function loadViModel(): Promise<void> {
  if (idx) return Promise.resolve();
  loading ??= import("@/lib/viAccent/model.json").then(
    (mod) => {
      idx = build((mod as { default: ViModel }).default ?? (mod as unknown as ViModel));
    },
    () => {
      loading = null; // lỗi mạng → lần sau thử lại
    },
  );
  return loading;
}
export const viModelReady = () => !!idx;

/** Câu gần như không dấu (cùng ngưỡng với lomiStory.txt: dưới 40% chữ có dấu)? */
export function isLooseVi(text: string): boolean {
  const ws = text.normalize("NFC").toLowerCase().match(/[\p{L}]+/gu) ?? [];
  if (ws.length < 2) return false;
  return ws.filter((w) => HAS_MARK.test(w)).length / ws.length < 0.4;
}

const LOG_FLOOR = Math.log(1e-7);
let BARE_BONUS = 0.7;
/** Chỉ dùng khi đo (src/test): đổi mức ưu tiên cách đọc không dấu. */
export function setBareBonus(x: number) {
  BARE_BONUS = x;
}
/** Đoán dấu cho câu. Trả về chính câu đó nếu chưa nạp mô hình hoặc không đổi gì. Giữ nguyên dấu câu, khoảng trắng, chữ hoa đầu câu. */
let off = false;
/** Chỉ dùng khi đo (src/test/vibench): tắt khôi phục dấu để so trước / sau. */
export function setViRestoreOff(x: boolean) {
  off = x;
}
/**
 * opts.keepBare (14/10, bộ đọc câu lib/viMatch): câu người dùng ĐÃ gõ dấu mà có chữ không dấu — chữ không dấu đó vốn là một chữ
 * tiếng Việt có thật ("di" trong "di truyền", "la" trong "la mắng", "a" viết tắt "anh") thì giữ nguyên, chỉ đoán dấu cho chữ không
 * dấu mà bản thân nó không phải chữ nào ("dau" → "đau", "nhe" → "nhé").
 */
const KEEP_BARE = new Set(["cua", "cam", "phan"]);
// 01/11 (vòng 24): chữ viết tắt hay gặp — không đoán dấu chúng, nhưng dùng NGHĨA của chúng làm ngữ cảnh cho chữ bên cạnh
//   ("sao toi k nhan dc thong bao": "k … dc" = "không … được" → "nhận được thông báo", không phải "nhắn"). Chữ in ra vẫn giữ như người dùng gõ.
const TEEN_CTX: Record<string, string> = {
  k: "không", ko: "không", kh: "không", hk: "không", khum: "không", dc: "được", đc: "được", j: "gì", v: "vậy", z: "vậy",
  r: "rồi", ntn: "thế", nhiu: "nhiều", vs: "với", wa: "quá", ck: "chồng", vk: "vợ", ny: "người", mk: "mình", lm: "làm", trc: "trước", hnay: "nay",
};
type Prepared = { parts: string[]; wi: number[]; cands: string[][]; typedAt: string[]; linked: boolean[] };
function prepare(text: string, opts: { keepBare?: boolean }): Prepared | null {
  if (!idx || off) return null;
  const { m, forms } = idx;
  // lẻ: chữ hoặc SỐ (số tính như một chữ "num" để "sốt 38 độ" vẫn nối được ngữ cảnh), chẵn: phần giữa (khoảng trắng, dấu câu…)
  const parts = text.normalize("NFC").split(/([\p{L}]+|\d+(?:[.,]\d+)?)/u);
  const wi: number[] = [];
  for (let i = 1; i < parts.length; i += 2) wi.push(i);
  if (!wi.length) return null;
  // Ứng viên cho từng chữ
  const cands: string[][] = wi.map((i) => {
    const w = parts[i].toLowerCase();
    if (/^\d/.test(w)) return ["num"];
    if (TEEN_CTX[w] && m.u[TEEN_CTX[w]]) return [TEEN_CTX[w]];
    if (HAS_MARK.test(w)) return [w]; // người dùng gõ dấu → giữ
    const f = forms.get(w);
    if (!f) return [w];
    // (31/10) câu đã gõ dấu mà viết "cua", "cam", "phan" không dấu là chủ ý (con cua, quả cam, phan tả diệp) — không đoán thành "của", "cám" ("ăn cua xong ăn cam").
    if (opts.keepBare && KEEP_BARE.has(w)) return [w];
    if (opts.keepBare && m.u[w]) {
      const tot = f.reduce((a, x) => a + (m.u[x] ?? 0), 0) + (f.includes(w) ? 0 : m.u[w]);
      if (m.u[w] / Math.max(1, tot) >= 0.05) return [w];
    }
    return m.u[w] && !f.includes(w) ? [w, ...f] : f;
  });
  // Câu đứt đoạn bởi dấu câu ("ok. em buon") thì chữ sau dấu câu tính như đầu câu.
  const linked = wi.map((i, k) => k > 0 && /^\s+$/.test(parts[i - 1]));
  const typedAt = wi.map((i) => parts[i].toLowerCase());
  return { parts, wi, cands, typedAt, linked };
}
/** Viterbi bậc 2 trên các ứng viên → cách đọc tốt nhất và tổng điểm (log). */
function decode(cands: string[][], typedAt: string[], linked: boolean[]): { out: string[]; score: number } {
  const { m, total } = idx!;
  // Điểm: log P(c | a b) — có bộ ba thì theo bộ ba, không thì cặp chữ, không nữa thì tần suất chữ (stupid backoff 0.4).
  const uni = (w: string) => (m.u[w] ? Math.log(m.u[w] / total) : LOG_FLOOR);
  // Cách đọc VỐN KHÔNG DẤU ("anh", "con", "tui", "nay") được ưu tiên nhẹ: người gõ không dấu dùng các chữ này rất nhiều, còn văn bản
  // học được (lời của app) lại nghiêng về "ảnh" (ảnh đại diện), "còn"… (đo trên bộ đo: xem src/test/vibench)
  const pref = (w: string, typed: string) => (w === typed ? BARE_BONUS : 0);
  const two = (a: string, b: string) => {
    const c = m.b[a]?.[b];
    if (c && m.u[a]) return Math.log(c / m.u[a]);
    return Math.log(0.4) + uni(b);
  };
  const three = (a: string, b: string, c: string) => {
    const t = m.t?.[`${a} ${b}`]?.[c];
    const ab = m.b[a]?.[b];
    if (t && ab) return Math.log(t / ab);
    return Math.log(0.4) + two(b, c);
  };
  // Viterbi bậc 2: trạng thái = (chữ trước, chữ này). "<s>" = đầu câu.
  type St = { p: string; w: string; s: number; back: number };
  let prev: St[] = cands[0].map((w) => ({ p: "<s>", w, s: two("<s>", w) + pref(w, typedAt[0]), back: -1 }));
  const trail: St[][] = [prev];
  for (let k = 1; k < cands.length; k++) {
    const cur: St[] = [];
    for (const w of cands[k]) {
      if (!linked[k]) {
        // đầu đoạn mới: chỉ cần điểm tốt nhất của đoạn trước
        let bi = 0;
        prev.forEach((x, j) => (x.s > prev[bi].s ? (bi = j) : 0));
        cur.push({ p: "<s>", w, s: prev[bi].s + two("<s>", w) + pref(w, typedAt[k]), back: bi });
        continue;
      }
      // gom theo chữ trước
      const byPrev = new Map<string, St>();
      prev.forEach((x, j) => {
        const sc = x.s + three(x.p, x.w, w) + pref(w, typedAt[k]);
        const o = byPrev.get(x.w);
        if (!o || sc > o.s) byPrev.set(x.w, { p: x.w, w, s: sc, back: j });
      });
      cur.push(...byPrev.values());
    }
    trail.push(cur);
    prev = cur;
  }
  // Lần ngược — cộng điểm "đứng cuối câu" ("đau bụng quá" chứ không phải "qua"; "mấy ngày nay" chứ không phải "này")
  const fin = prev.map((x) => x.s + three(x.p, x.w, "</s>"));
  let j = fin.reduce((bi, x, i) => (x > fin[bi] ? i : bi), 0);
  const score = fin[j];
  const out: string[] = new Array(cands.length);
  for (let k = cands.length - 1; k >= 0; k--) {
    out[k] = trail[k][j].w;
    j = trail[k][j].back;
  }
  return { out, score };
}
function render(pr: Prepared, out: string[]): string {
  const parts = [...pr.parts];
  pr.wi.forEach((i, k) => {
    const orig = parts[i];
    const w = out[k];
    if (w === "num" || TEEN_CTX[orig.toLowerCase()]) return;
    // giữ chữ hoa như người dùng gõ
    parts[i] = orig === orig.toUpperCase() && orig.length > 1 ? w.toUpperCase() : orig[0] === orig[0].toUpperCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  });
  return parts.join("");
}
export function restoreVi(text: string, opts: { keepBare?: boolean } = {}): string {
  const pr = prepare(text, opts);
  if (!pr) return text;
  return render(pr, decode(pr.cands, pr.typedAt, pr.linked).out);
}

/** Một cách đọc khác của câu: đổi đúng MỘT chữ so với cách đọc tốt nhất, kèm độ chênh điểm (log, càng nhỏ càng sát). */
export type ViAlt = { text: string; delta: number; at: number; word: string; alt: string };
/**
 * 01/11 (hướng 1 — sửa gốc phần dấu): đoán dấu xong KHÔNG tin tuyệt đối một cách đọc. Trả về cách đọc tốt nhất và các cách đọc
 *   khác sát điểm (mỗi cách đổi một chữ có nhiều cách đọc: "chị/chỉ", "ho/họ", "bơi/bói"…). Nơi gọi chọn cách đọc nào khớp với điều
 *   Lomi thật sự biết (tên bệnh, câu hỏi về app), hoặc thấy còn phân vân thì nói "Lomi hiểu là…".
 */
export function restoreViAlts(text: string, opts: { keepBare?: boolean; maxDelta?: number; max?: number } = {}): { best: string; alts: ViAlt[] } {
  const pr = prepare(text, opts);
  if (!pr) return { best: text, alts: [] };
  const top = decode(pr.cands, pr.typedAt, pr.linked);
  const alts: ViAlt[] = [];
  const maxDelta = opts.maxDelta ?? 4;
  pr.cands.forEach((cs, k) => {
    if (cs.length < 2) return;
    for (const c of cs) {
      if (c === top.out[k]) continue;
      const forced = pr.cands.map((x, i) => (i === k ? [c] : x));
      const r = decode(forced, pr.typedAt, pr.linked);
      const delta = top.score - r.score;
      if (delta <= maxDelta) alts.push({ text: render(pr, r.out), delta, at: k, word: top.out[k], alt: c });
    }
  });
  alts.sort((a, b) => a.delta - b.delta);
  return { best: render(pr, top.out), alts: alts.slice(0, opts.max ?? 8) };
}

// ── 30/10: sửa MỘT lỗi gõ trong một chữ (nhật ký bí: "Mẹo chữa nghẹt mũu" → "Ui... Kiến thức này Lomi chưa được tiếp thu") ──
// Chỉ dùng như phép thử ở nơi gọi (AiAssistant): chữ không có trong từ điển âm tiết của mô hình → thử các chữ cách 1 phép sửa
// (thay / thêm / bớt / đảo một ký tự) có trong từ điển, xếp theo tần suất. Nơi gọi chỉ nhận khi câu đã sửa mới khớp một chủ đề sức khoẻ.
const VI_LETTERS = [..."aàáảãạăằắẳẵặâầấẩẫậbcdđeèéẻẽẹêềếểễệghiìíỉĩịklmnoòóỏõọôồốổỗộơờớởỡợpqrstuùúủũụưừứửữựvxyỳýỷỹỵ"];
/** Chữ có trong từ điển âm tiết không (mô hình chưa nạp → coi như có, để không sửa bừa). */
export function isKnownSyllable(w: string): boolean {
  if (!idx) return true;
  return (idx.m.u[w.normalize("NFC").toLowerCase()] ?? 0) > 0;
}
/** Các chữ có trong từ điển cách `w` đúng một phép sửa, tần suất cao trước (tối đa `max`). */
export function typoCandidates(w: string, max = 6): string[] {
  if (!idx) return [];
  const s = [...w.normalize("NFC").toLowerCase()];
  const out = new Map<string, number>();
  const add = (c: string[]) => {
    const k = c.join("");
    const n = idx!.m.u[k] ?? 0;
    if (n > 0 && k !== s.join("")) out.set(k, n);
  };
  for (let i = 0; i <= s.length; i++) {
    for (const L of VI_LETTERS) {
      if (i < s.length) add([...s.slice(0, i), L, ...s.slice(i + 1)]); // thay
      add([...s.slice(0, i), L, ...s.slice(i)]); // thêm
    }
    if (i < s.length) add([...s.slice(0, i), ...s.slice(i + 1)]); // bớt
    if (i < s.length - 1) add([...s.slice(0, i), s[i + 1], s[i], ...s.slice(i + 2)]); // đảo
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k);
}
