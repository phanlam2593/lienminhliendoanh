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
export function restoreVi(text: string): string {
  if (!idx || off) return text;
  const { m, forms, total } = idx;
  // lẻ: chữ hoặc SỐ (số tính như một chữ "num" để "sốt 38 độ" vẫn nối được ngữ cảnh), chẵn: phần giữa (khoảng trắng, dấu câu…)
  const parts = text.normalize("NFC").split(/([\p{L}]+|\d+(?:[.,]\d+)?)/u);
  const wi: number[] = [];
  for (let i = 1; i < parts.length; i += 2) wi.push(i);
  if (!wi.length) return text;
  // Ứng viên cho từng chữ
  const cands: string[][] = wi.map((i) => {
    const w = parts[i].toLowerCase();
    if (/^\d/.test(w)) return ["num"];
    if (HAS_MARK.test(w)) return [w]; // người dùng gõ dấu → giữ
    const f = forms.get(w);
    if (!f) return [w];
    return m.u[w] && !f.includes(w) ? [w, ...f] : f;
  });
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
  // Câu đứt đoạn bởi dấu câu ("ok. em buon") thì chữ sau dấu câu tính như đầu câu.
  const linked = wi.map((i, k) => k > 0 && /^\s+$/.test(parts[i - 1]));
  // Viterbi bậc 2: trạng thái = (chữ trước, chữ này). "<s>" = đầu câu.
  type St = { p: string; w: string; s: number; back: number };
  const typedAt = wi.map((i) => parts[i].toLowerCase());
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
  const out: string[] = new Array(cands.length);
  for (let k = cands.length - 1; k >= 0; k--) {
    out[k] = trail[k][j].w;
    j = trail[k][j].back;
  }
  wi.forEach((i, k) => {
    const orig = parts[i];
    const w = out[k];
    if (w === "num") return;
    // giữ chữ hoa như người dùng gõ
    parts[i] = orig === orig.toUpperCase() && orig.length > 1 ? w.toUpperCase() : orig[0] === orig[0].toUpperCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  });
  return parts.join("");
}
