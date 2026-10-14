// ─────────────────────────────────────────────────────────────────────────────
// BỘ ĐỌC CÂU DÙNG CHUNG — SO KHỚP GIỮ DẤU (14/10, theo ý Kir: "làm cho dứt điểm" lỗi "nói 1 đường hiểu 1 nẻo")
//
// Gốc lỗi: các lớp của Lomi bỏ hết dấu của câu (normalizeVi) rồi mới so với luật viết không dấu, nên "là" = "lá" (lá bài),
// "trẹo" = "treo", "đập" = "đạp", "chữa" = "chưa", "quan" = "quán"… — kể cả khi người dùng đã gõ dấu đầy đủ.
//
// Cách sửa — không đổi chỗ gọi, không đổi kiểu dữ liệu các lớp đang dùng:
//   1) normalizeVi(text) vẫn trả về chuỗi KHÔNG DẤU như cũ, nhưng ghi lại vào "sổ" (registry) dạng CÓ DẤU của đúng chuỗi đó.
//   2) Mọi luật của Lomi được bọc bằng V(/…/). V trả về một RegExp thật (kiểu RegExp, .test / .exec / match / replace như cũ),
//      chỉ khác ở chỗ: khi chuỗi đem so là chuỗi không dấu mà sổ biết dạng có dấu, luật được so trên dạng CÓ DẤU:
//        • mỗi chữ trong luật VN được viết ĐÚNG như tiếng Việt ("lá", "đau", "nha", "a" viết tắt) → câu phải có đúng chữ đó
//          ("là" không khớp "lá", "nhà" không khớp "nha"); chữ không phải tiếng Việt ("gout", "app") viết như thường;
//        • lớp ký tự ([a-z], \w, \S, .) vẫn khớp chữ có dấu bất kỳ.
//      Không biết dạng có dấu (chuỗi tự tạo, mã, id…) hoặc câu người dùng gõ không dấu → luật bỏ dấu, so như cũ.
//      Luật chưa ghi ý (VR) chạy y như regex thường.
//   3) Câu gõ KHÔNG DẤU: các lớp vẫn so như cũ (có thêm lớp khôi phục dấu lomiViRestore phía trước) — xem setViStrict.
//
// Dạng có dấu chuẩn ("canon"): chữ thường, tách dấu (NFD), dấu thanh dời về CUỐI chữ ("hoà" = "hòa"), "đ" = "d" + U+0336.
// Bỏ hết dấu khỏi dạng chuẩn thì ra đúng chuỗi normalizeVi — nhờ vậy vị trí khớp đổi qua lại được giữa hai dạng.
// ─────────────────────────────────────────────────────────────────────────────

const TONES = new Set(["̀", "́", "̃", "̉", "̣"]);
const D_MARK = "̶"; // "đ" = "d" + U+0336 (U+0336 nằm trong khoảng dấu mà normalizeVi bỏ đi)
const isMark = (ch: string) => ch >= "̀" && ch <= "ͯ";

/** Một chữ (đã NFD, chữ thường) → dạng chuẩn: dấu mũ / móc / trăng giữ sau nguyên âm, dấu thanh dời về cuối chữ. */
function canonWord(w: string): string {
  if (!/[̀-ͯ]/.test(w)) return w;
  let out = "";
  const tones: string[] = [];
  for (const ch of w) {
    if (TONES.has(ch)) tones.push(ch);
    else out += ch;
  }
  return out + tones.sort().join("");
}

/** Dạng có dấu chuẩn của một câu, khớp từng vị trí với normalizeVi(text) sau khi bỏ dấu. null nếu không căn được. */
export function canonVi(text: string): string | null {
  const d = text.toLowerCase().normalize("NFD");
  let s = "";
  let prevLetter = false;
  for (const ch of d) {
    if (isMark(ch)) {
      if (prevLetter) s += ch; // dấu đứng sau chữ cái mới giữ (dấu treo trên ký tự lạ thì bỏ, như normalizeVi)
      continue;
    }
    if (ch === "đ") {
      s += "d" + D_MARK;
      prevLetter = true;
    } else if (/[a-z0-9]/.test(ch)) {
      s += ch;
      prevLetter = /[a-z]/.test(ch);
    } else if (/\s/.test(ch)) {
      s += " ";
      prevLetter = false;
    } else {
      s += " ";
      prevLetter = false;
    }
  }
  const words = s.split(/ +/).filter(Boolean).map(canonWord);
  return words.join(" ");
}

/** Bỏ hết dấu khỏi dạng chuẩn. */
export const stripCanon = (c: string) => c.replace(/[̀-ͯ]/g, "");
const hasMark = (c: string) => /[̀-ͯ]/.test(c);

let strictOn = false;

// ── Sổ ghi: chuỗi không dấu → dạng có dấu (của những câu đã đọc gần đây) ──
// USER: câu người dùng của lượt đang xử lý (AiAssistant.send gọi beginViTurn) — được ưu tiên khi tìm đoạn câu.
// REG : mọi câu normalizeVi đã đọc gần đây (cả lời của Lomi, tên lá bài, tên bệnh…).
const REG = new Map<string, string>();
const USER = new Map<string, string>();
const REG_MAX = 150;
const lookCache = new Map<string, string | null>();

function put(map: Map<string, string>, text: string, bare: string): void {
  if (!bare || !/[^\x00-\x7f]/.test(text)) return; // câu không có chữ nào có dấu → không có thông tin gì thêm
  const c = canonVi(text);
  if (c === null || !hasMark(c) || stripCanon(c) !== bare) return;
  const old = map.get(bare);
  if (old === c) return;
  map.delete(bare);
  map.set(bare, c); // cùng một chuỗi không dấu mà dấu khác → câu mới nhất thắng
  while (map.size > REG_MAX) map.delete(map.keys().next().value as string);
  lookCache.clear();
}
/** Ghi dạng có dấu của `text` (normalizeVi gọi). bare = normalizeVi(text). */
export function registerVi(text: string, bare: string): void {
  put(REG, text, bare);
}
/** Bắt đầu một lượt chat: các câu này là lời người dùng (câu gõ, câu đã chuẩn hoá…). */
export function beginViTurn(texts: string[], strict?: boolean): void {
  USER.clear();
  REG.clear(); // mỗi lượt đọc lại từ đầu: không lẫn dấu của câu ở lượt trước
  lookCache.clear();
  if (strict !== undefined) strictOn = strict;
  for (const t of texts) {
    const b = stripCanon(canonVi(t) ?? "");
    put(USER, t, b);
    put(REG, t, b);
  }
}

/** Gộp các dạng có dấu cùng một đoạn: chữ nào các nguồn đặt dấu khác nhau thì về dạng không dấu (= khớp như cũ). */
const mergeSeg = (a: string[] | null, b: string[]) => (a ? a.map((w, k) => (w === b[k] ? w : stripCanon(w))) : b);

/**
 * Dạng có dấu của chuỗi không dấu `s` (giữ nguyên khoảng trắng của s). Tìm: đúng chuỗi đã ghi → s là một đoạn liền (trọn chữ)
 * của câu người dùng lượt này → của một câu đã đọc gần đây. Nhiều nguồn đặt dấu khác nhau cho cùng chữ → chữ đó không đặt dấu.
 * null = không biết (luật so như cũ).
 */
export function canonOf(s: string): string | null {
  if (!s || (REG.size === 0 && USER.size === 0) || /[^a-z0-9 ]/.test(s)) return null;
  const hit = lookCache.get(s);
  if (hit !== undefined) return hit;
  const res = lookup(s);
  if (lookCache.size > 3000) lookCache.clear();
  lookCache.set(s, res);
  return res;
}
function segIn(map: Map<string, string>, core: string, want: string[]): string[] | null {
  let merged: string[] | null = null;
  for (const [bare, canon] of map) {
    if (!` ${bare} `.includes(` ${core} `)) continue;
    const bw = bare.split(" ");
    const cw = canon.split(" ");
    for (let i = 0; i + want.length <= bw.length; i++) {
      let ok = true;
      for (let j = 0; j < want.length && ok; j++) if (bw[i + j] !== want[j]) ok = false;
      if (ok) merged = mergeSeg(merged, cw.slice(i, i + want.length));
    }
  }
  return merged;
}
function lookup(s: string): string | null {
  const core = s.trim();
  if (!core || / {2,}/.test(core)) return null;
  const lead = s.slice(0, s.indexOf(core));
  const trail = s.slice(lead.length + core.length);
  const want = core.split(" ");
  // Câu người dùng (đã khôi phục dấu cho chữ họ gõ thiếu dấu) được ưu tiên hơn mọi câu khác.
  const u = USER.get(core);
  const seg = u !== undefined ? u.split(" ") : (segIn(USER, core, want) ?? (REG.has(core) ? REG.get(core)!.split(" ") : segIn(REG, core, want)));
  if (!seg || !seg.some(hasMark)) return null;
  return lead + seg.join(" ") + trail;
}

/**
 * Người dùng có gõ dấu không? typed = câu gõ, restored = câu sau khi lomiViRestore đoán dấu cho chữ gõ thiếu dấu (cùng số chữ).
 * Gõ dấu khi: có ít nhất một chữ có dấu, và trong các chữ "cần dấu" (chữ đã gõ dấu + chữ được đoán thêm dấu) ít nhất 60% là
 * người dùng tự gõ. ("hôm nay a vui lắm hehe" là câu gõ dấu đầy đủ dù nhiều chữ vốn không dấu; "e la ai" là câu không dấu.)
 */
export function typedWithAccents(typed: string, restored: string): boolean {
  const W = (x: string) => x.normalize("NFC").toLowerCase().match(/\p{L}+/gu) ?? [];
  const t = W(typed);
  const r = W(restored);
  let marked = 0;
  let guessed = 0;
  for (let i = 0; i < t.length; i++) {
    if (/[^\x00-\x7f]/.test(t[i])) marked++;
    else if (r[i] && r[i] !== t[i]) guessed++;
  }
  return marked > 0 && marked / (marked + guessed) >= 0.6;
}

/** Chỉ dùng trong test: xoá sổ. */
export function resetViRegistry() {
  REG.clear();
  USER.clear();
  lookCache.clear();
}

// ── Bật / tắt so khớp có dấu ──
// Chỉ bật trong một lượt chat mà người dùng gõ CÓ DẤU (AiAssistant.send → beginViTurn). Câu gõ không dấu thì dạng "có dấu" chỉ là
// đoán (lomiViRestore) → lượt đó so như cũ. Ngoài khung chat (trang khác, test gọi thẳng thư viện) cũng so như cũ.
export function setViStrict(on: boolean) {
  strictOn = on;
}
export const viStrict = () => strictOn;

// ── Dịch luật sang dạng so trên chữ có dấu ──
const M = "\\p{M}";
const WORD = `[\\w${M}]`;
const B_BOUND = `(?:(?<=${WORD})(?!${WORD})|(?<!${WORD})(?=\\w))`;
const SYNTAX = new Set("^$\\.*+?()[]{}|/".split(""));
const isLetter = (ch: string) => /\p{L}/u.test(ch);
const escLit = (ch: string) => (SYNTAX.has(ch) ? `\\${ch}` : /[\w ]/.test(ch) || isMark(ch) ? ch : `\\u{${ch.codePointAt(0)!.toString(16)}}`);

/**
 * Một dãy chữ trong luật VN → mẫu so trên dạng có dấu: ĐÚNG chữ như viết. "lá" chỉ khớp "lá"; "a" (viết tắt "anh") chỉ khớp "a",
 * không khớp "à" / "á". (Chữ người dùng gõ thiếu dấu đã được lomiViRestore đoán dấu trước khi so.)
 */
function runToPattern(run: string): string {
  const lower = run.normalize("NFC");
  const c = canonVi(lower);
  if (c === null || c.includes(" ") || stripCanon(c).length !== lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "").length) throw new Error(`run ${run}`);
  return [...c].map(escLit).join("") + `(?!${M})`;
}

/** Nội dung một lớp ký tự [...] → mẫu (null nếu lớp có chữ có dấu — không hỗ trợ). */
function classToPattern(body: string, negated: boolean): string {
  if (/[^\x00-\x7f]/.test(body.replace(/\\u\{?[0-9a-fA-F]+\}?/g, ""))) throw new Error("accented class");
  let b = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\") {
      const e = body[i + 1];
      i++;
      if (e === "w") b += `\\w${M}`;
      else if (e === "W") throw new Error("\\W in class");
      else if (e === "u" || e === "x" || e === "p" || e === "P" || e === "c") {
        // copy escape with its argument
        let j = i + 1;
        if (e === "p" || e === "P" || (e === "u" && body[j] === "{")) {
          const end = body.indexOf("}", j);
          b += `\\${e}${body.slice(j, end + 1)}`;
          i = end;
        } else {
          const n = e === "u" ? 4 : e === "x" ? 2 : 1;
          b += `\\${e}${body.slice(j, j + n)}`;
          i = j + n - 1;
        }
      } else if (/[dDsSbnrtfv0]/.test(e)) b += `\\${e}`;
      else if (e === "-" || SYNTAX.has(e)) b += `\\${e}`;
      else b += escLit(e);
    } else if (ch === "-" || /[\w ]/.test(ch)) b += ch;
    else b += SYNTAX.has(ch) || ch === "-" ? `\\${ch}` : escLit(ch);
  }
  const hasLetters = /[a-zA-Z]|\\w/.test(body.replace(/\\[dDsSnrtfvux0]/g, ""));
  if (negated) return `(?:[^${b}${M}]${M}*)`;
  return hasLetters ? `(?:[${b}]${M}*)` : `[${b}]`;
}

/** Dịch nguồn của một luật (viết cho chuỗi không dấu) sang mẫu so trên dạng có dấu chuẩn. Ném lỗi nếu gặp cú pháp chưa hỗ trợ. */
export function compileVi(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      const e = src[i + 1];
      if (e === undefined) throw new Error("trailing \\");
      if (e === "b") out += B_BOUND;
      else if (e === "B") out += `(?!${B_BOUND})`;
      else if (e === "w") out += `(?:\\w${M}*)`;
      else if (e === "W") out += `[^\\w${M}]`;
      else if (e === "S") out += `(?:[^\\s${M}]${M}*)`;
      else if (e === "D") out += `(?:[^\\d${M}]${M}*)`;
      else if (/[dsnrtfv0]/.test(e)) out += `\\${e}`;
      else if (/[1-9]/.test(e)) {
        let j = i + 1;
        while (/\d/.test(src[j + 1] ?? "")) j++;
        out += `\\${src.slice(i + 1, j + 1)}`;
        i = j + 1;
        continue;
      } else if (e === "k") {
        const end = src.indexOf(">", i);
        out += src.slice(i, end + 1);
        i = end + 1;
        continue;
      } else if (e === "u" || e === "x") {
        if (src[i + 2] === "{") {
          const end = src.indexOf("}", i);
          out += src.slice(i, end + 1);
          i = end + 1;
        } else {
          const n = e === "u" ? 4 : 2;
          out += src.slice(i, i + 2 + n);
          i += 2 + n;
        }
        continue;
      } else if (e === "p" || e === "P") {
        const end = src.indexOf("}", i);
        out += src.slice(i, end + 1);
        i = end + 1;
        continue;
      } else if (SYNTAX.has(e)) out += `\\${e}`;
      else if (isLetter(e)) throw new Error(`escape \\${e}`);
      else out += escLit(e);
      i += 2;
      continue;
    }
    if (ch === "[") {
      let j = i + 1;
      const neg = src[j] === "^";
      if (neg) j++;
      const start = j;
      if (src[j] === "]") j++;
      while (j < src.length && src[j] !== "]") j += src[j] === "\\" ? 2 : 1;
      if (j >= src.length) throw new Error("unclosed class");
      out += classToPattern(src.slice(start, j), neg);
      i = j + 1;
      continue;
    }
    if (ch === "(") {
      const m = src.slice(i).match(/^\((\?(?:[:=!]|<[=!]|<[A-Za-z_]\w*>))?/)!;
      out += m[0];
      i += m[0].length;
      continue;
    }
    if (ch === ".") {
      out += `(?:[^\\n\\r\\u2028\\u2029${M}]${M}*)`;
      i++;
      continue;
    }
    if (ch === "{") {
      const m = src.slice(i).match(/^\{\d+(,\d*)?\}\??/);
      if (!m) throw new Error("bare {");
      out += m[0];
      i += m[0].length;
      continue;
    }
    if (isLetter(ch)) {
      let j = i;
      while (j < src.length && (isLetter(src[j]) || isMark(src[j]))) j++;
      const run = src.slice(i, j);
      const q = src.slice(j).match(/^(?:[?*+]|\{\d+(?:,\d*)?\})\??/);
      if (q) {
        // Lượng từ áp vào chữ cái cuối ("chào+" = "chàoooo", "hi+", "thuốc?" = "thuố"/"thuốc"): dạng chuẩn để dấu thanh ở cuối
        // chữ, nên lặp / bỏ chữ cái cuối (kèm dấu mũ / móc của nó) rồi mới tới dấu thanh.
        const p = runToPattern(run).slice(0, -`(?!${M})`.length);
        const chars = [...p];
        let t = chars.length;
        while (t > 0 && TONES.has(chars[t - 1])) t--;
        let k = t - 1;
        while (k > 0 && isMark(chars[k])) k--;
        out += chars.slice(0, k).join("") + `(?:${chars.slice(k, t).join("")})${q[0]}` + chars.slice(t).join("") + `(?!${M})`;
        i = j + q[0].length;
        continue;
      }
      out += runToPattern(run);
      i = j;
      continue;
    }
    out += ch === "}" || ch === "]" ? `\\${ch}` : SYNTAX.has(ch) || /[\w ]/.test(ch) ? ch : escLit(ch);
    i++;
  }
  return out;
}

// ── RegExp có dấu ──
type Strict = RegExp | null;
const strictCache = new Map<string, Strict>();
let compileFails = 0;
const failed: string[] = [];
function strictFor(src: string, flags: string): Strict {
  const key = `${flags}/${src}`;
  let r = strictCache.get(key);
  if (r !== undefined) return r;
  try {
    r = new RegExp(compileVi(src), flags.replace("u", "") + "u");
  } catch (e) {
    r = null;
    compileFails++;
    if (failed.length < 200) failed.push(`/${src}/${flags} — ${(e as Error).message}`);
  }
  strictCache.set(key, r);
  return r;
}
/** Dùng trong test: luật nào chưa dịch được sang dạng có dấu (vẫn chạy như cũ). */
export const viCompileFailures = () => ({ count: compileFails, list: [...failed] });

/** Bảng vị trí: chỉ số trong dạng có dấu → chỉ số trong chuỗi không dấu. */
function posMap(c: string): number[] {
  const m = new Array<number>(c.length + 1);
  let b = 0;
  for (let i = 0; i < c.length; i++) {
    m[i] = b;
    if (!isMark(c[i])) b++;
  }
  m[c.length] = b;
  return m;
}

let stats = { strict: 0, plain: 0 };
/** Dùng trong test / đo: số lần so theo dấu và so như cũ. */
export const viMatchStats = () => ({ ...stats });
export const resetViMatchStats = () => (stats = { strict: 0, plain: 0 });

const NON_ASCII = /[^\x00-\x7f]/;
/** Bỏ dấu chữ trong nguồn luật (để so như cũ trên chuỗi không dấu). */
const stripSrc = (src: string) => src.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFC");

export class VRegExp extends RegExp {
  /** Nguồn luật đúng như viết (có dấu). */
  vsrc = "";
  /** Luật đúng như viết — dùng khi chuỗi đem so là câu CÓ DẤU nguyên văn (chưa qua normalizeVi). */
  orig: RegExp | null = null;
  /** Luật so trên dạng có dấu (dịch lười); null = không dịch được → so như cũ. */
  private sr: RegExp | null | undefined;
  /** Luật có phủ định ((?!…), (?<!…)) → khớp theo dấu có thể RỘNG hơn khớp không dấu, không lọc trước bằng luật bỏ dấu được. */
  private neg = false;
  exec(s: string): RegExpExecArray | null {
    if (typeof s !== "string" || !this.orig) return RegExp.prototype.exec.call(this, s);
    if (NON_ASCII.test(s)) {
      // so trên câu nguyên văn (có dấu): như luật viết
      this.orig.lastIndex = this.lastIndex;
      const r = this.orig.exec(s);
      this.lastIndex = this.orig.lastIndex;
      return r;
    }
    const li = this.lastIndex;
    const c = strictOn ? canonOf(s) : null;
    if (this.sr === undefined && c !== null) this.sr = strictFor(this.vsrc, this.flags);
    const sr = c !== null ? this.sr : null;
    if (c === null || !sr) {
      stats.plain++;
      return RegExp.prototype.exec.call(this, s);
    }
    if (!this.neg) {
      // lọc trước bằng luật bỏ dấu: không khớp không dấu thì chắc chắn không khớp có dấu
      const r = RegExp.prototype.exec.call(this, s);
      this.lastIndex = li;
      if (!r) {
        if (this.global || this.sticky) this.lastIndex = 0;
        stats.plain++;
        return null;
      }
    }
    stats.strict++;
    const pm = posMap(c);
    const keep = this.global || this.sticky;
    let start = 0;
    if (keep) {
      if (li > s.length) {
        this.lastIndex = 0;
        return null;
      }
      start = pm.indexOf(li);
      if (start < 0) start = c.length;
    }
    sr.lastIndex = start;
    const m = sr.exec(c);
    if (!m) {
      if (keep) this.lastIndex = 0;
      return null;
    }
    const res = Array.from(m, (x) => (x === undefined ? undefined : stripCanon(x))) as unknown as RegExpExecArray;
    res.index = pm[m.index];
    res.input = s;
    if (m.groups) {
      const g: Record<string, string> = {};
      for (const [k, v] of Object.entries(m.groups)) if (v !== undefined) g[k] = stripCanon(v);
      res.groups = g;
    } else res.groups = undefined;
    if (keep) this.lastIndex = pm[m.index + m[0].length];
    return res;
  }
  /** (V gọi) đặt nguồn luật gốc. */
  setSource(src: string, flags: string) {
    this.vsrc = src;
    this.orig = new RegExp(src, flags);
    this.neg = /\(\?<?!/.test(src);
  }
  // Tách chuỗi theo luật: luôn như cũ (dấu không đổi chỗ tách).
  [Symbol.split](s: string, limit?: number): string[] {
    const src = NON_ASCII.test(s) && this.orig ? this.orig.source : this.source;
    return s.split(new RegExp(src, this.flags.replace(/[gy]/g, "")), limit);
  }
  static get [Symbol.species]() {
    return RegExp;
  }
}

const vCache = new Map<string, VRegExp>();
/**
 * Bọc một luật: so khớp giữ dấu khi biết dạng có dấu của chuỗi (xem đầu file).
 *   • chuỗi không dấu (đã normalizeVi) mà sổ biết dạng có dấu → so trên dạng có dấu;
 *   • chuỗi không dấu không rõ dạng có dấu → luật bỏ dấu, so như cũ;
 *   • câu nguyên văn có dấu → luật đúng như viết.
 */
export function V(re: RegExp): RegExp {
  // Luật có cờ g / y mang trạng thái (lastIndex) → mỗi lần gọi một đối tượng riêng, như regex viết thẳng trong code.
  if (re.global || re.sticky) {
    const v = new VRegExp(stripSrc(re.source), re.flags);
    v.setSource(re.source, re.flags);
    return v;
  }
  const key = `${re.flags}/${re.source}`;
  let v = vCache.get(key);
  if (!v) {
    v = new VRegExp(stripSrc(re.source), re.flags);
    v.setSource(re.source, re.flags);
    vCache.set(key, v);
  }
  return v;
}
/**
 * Hai cách bọc luật trong các file của Lomi:
 *   VN(/…/) — luật so trên chuỗi đã normalizeVi, ĐÃ GHI Ý: chữ có dấu = đúng chữ đó (xem V ở trên).
 *   VR(/…/) — luật cũ chưa ghi ý (chạy y như regex thường). Test lomiViRules chặn VR chứa chữ một tiếng mơ hồ
 *             ("la", "dau", "chong"…): chữ mơ hồ phải được viết có dấu trong VN.
 */
export const VN = V;
export const VR = (re: RegExp): RegExp => re;
