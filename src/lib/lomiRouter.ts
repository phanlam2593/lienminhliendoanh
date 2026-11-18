// KIẾN TRÚC CHỌN LỚP MỚI CỦA LOMI (bắt đầu 14/11/2026 — nhánh kien-truc-lomi, xem scripts/lomi-audit/HANDOFF_KIEN_TRUC.md)
//
// Trước đây: ~190 nhánh `return` trong AiAssistant.send(), "nhánh nào khớp trước thì thắng". Lớp an toàn nằm rải ở nhiều
// chỗ, mỗi nhánh đứng trước phải tự nhớ kiểm `!crisisReply(...)`. Quên một chỗ là một câu nguy hiểm bị đáp lạc.
//
// Hướng mới, chuyển DẦN từng nhóm (nhánh chưa chuyển vẫn chạy như cũ = lớp "legacy"):
//   1) riskScan(): MỘT chỗ duy nhất đọc tín hiệu rủi ro của lượt này (tự hại, cấp cứu, bạo lực, dấu hiệu đỏ).
//   2) Mỗi lớp đã chuyển ĐỀ CỬ một ứng viên (Candidate: lớp, ý định, độ tin, đoạn chữ làm bằng chứng, vế chính / vế phụ).
//   3) arbitrate(): trọng tài so ứng viên với câu đáp của lớp legacy ở CỬA RA DUY NHẤT (localReply) và chọn:
//        • ứng viên an toàn (độ tin cao) luôn thắng lớp không phải an toàn — an toàn chỉ chặt hơn, không lỏng hơn;
//        • ứng viên có bằng chứng ở VẾ CHÍNH thắng câu đáp chỉ dựa vào vế phụ;
//        • hai ứng viên sát điểm, khác lớp → nên hỏi lại (askBack) thay vì đoán.
//   4) Cờ rủi ro mang qua 2 lượt sau: trong lúc đó câu đáp không kèm sticker / biểu tượng vui.
//
// File này THUẦN (không React, không Supabase) để test được: src/test/lomiRouter.test.tsx.
import { crisisCheckIn, crisisDenial, crisisReply } from "@/lib/lomiChat";
import { normalizeVi } from "@/lib/lomiFaq";
import { urgentOf } from "@/lib/lomiUrgent";
import { drugAsk } from "@/lib/lomiDrug";

export type Layer = "safety" | "health" | "heart" | "faq" | "food" | "tarot" | "biz" | "chat" | "askback" | "unknown";
export type Clause = "main" | "sub";

export interface Candidate<T = unknown> {
  layer: Layer;
  /** Ý định cụ thể trong lớp ("crisis", "urgent", "drug-interact"…). */
  intent: string;
  /** 0–1. ≥ 0.9 = gần như chắc chắn (vd câu nói thẳng ý định tự hại). */
  confidence: number;
  /** Đoạn chữ trong câu người dùng làm bằng chứng. */
  evidence: string;
  /** Bằng chứng nằm ở vế chính hay vế phụ của câu. */
  clause: Clause;
  payload?: T;
}

// ── 1) Tách vế ──────────────────────────────────────────────────────────────
// Vế CHÍNH = phần sau từ chuyển ý cuối cùng ("… nhưng / mà / à mà / thôi bỏ qua / thôi kệ …"); không có từ chuyển ý thì cả câu.
// So trên chữ bỏ dấu (normalizeVi) nên gõ có dấu hay không dấu đều như nhau.
const TURN_MARK = /(?:^|[\s,;.])(nhung ma|nhung|tuy nhien|a ma thoi|a ma|ma thoi|thoi bo qua|thoi ke|bo qua di|ke di|quen di|con gio thi|gio thi)(?=\s)/g;
// "mà" đứng một mình rất nhiều nghĩa ("người mà mình thương") → chỉ tính khi đứng sau dấu phẩy hoặc mở đầu câu.
const MA_MARK = /(?:^|[,;.]\s*)(ma)(?=\s)/g;

export function splitClauses(text: string): { main: string; subs: string[]; marker: string | null } {
  const n = normalizeVi(text).replace(/\s+/g, " ").trim();
  let cut = -1;
  let marker: string | null = null;
  for (const re of [TURN_MARK, MA_MARK]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(n))) {
      const at = m.index + m[0].indexOf(m[1]);
      if (at > cut) {
        cut = at;
        marker = m[1];
      }
    }
  }
  if (cut < 0 || !marker) return { main: n, subs: [], marker: null };
  const main = n.slice(cut + marker.length).trim();
  const sub = n.slice(0, cut).replace(/[\s,;.]+$/, "").trim();
  // Vế sau quá ngắn ("… nhưng thôi") thì không đủ làm vế chính.
  if (main.split(" ").filter(Boolean).length < 2 || !sub) return { main: n, subs: [], marker: null };
  return { main, subs: [sub], marker };
}

/** Bằng chứng (đoạn chữ) nằm ở vế chính hay vế phụ. Không tìm thấy trong vế phụ nào → coi là vế chính. */
export function clauseOf(text: string, evidence: string): Clause {
  const { main, subs } = splitClauses(text);
  const ev = normalizeVi(evidence).replace(/\s+/g, " ").trim();
  if (!ev || !subs.length) return "main";
  if (main.includes(ev)) return "main";
  return subs.some((s) => s.includes(ev)) ? "sub" : "main";
}

// ── 2) Quét rủi ro — MỘT chỗ duy nhất ───────────────────────────────────────
export interface RiskScan {
  /** Nói thẳng ý định tự hại (đã trừ câu chối "không có ý định…"). Có thì lời hỗ trợ khủng hoảng PHẢI là câu đáp. */
  crisis: { text: string } | null;
  /** Câu chối có ý định tự hại. */
  denial: boolean;
  /** Tín hiệu vừa ("chán muốn chết", "là gánh nặng") → hỏi thẳng một câu. */
  checkIn: boolean;
  /** Tình huống cấp cứu đang kể (uống nhầm chất độc, chảy máu không cầm…). */
  urgent: boolean;
  /** Kể bị đánh / bị doạ / bị nhốt (lib/lomiSafety) — do nơi gọi tính (cần khung câu). */
  harm: boolean;
  /** Dấu hiệu đỏ y khoa trong câu — do nơi gọi tính. */
  red: boolean;
  any: boolean;
}

export function riskScan(i: { q: string; raw: string; lang: "vi" | "en"; en?: boolean; forceAi?: boolean; harm?: boolean; red?: boolean }): RiskScan {
  const none: RiskScan = { crisis: null, denial: false, checkIn: false, urgent: false, harm: false, red: false, any: false };
  if (i.forceAi) return none;
  const denial = !i.en && !!crisisDenial(i.q);
  const cr = denial ? null : crisisReply(i.q, i.lang);
  const checkIn = !i.en && !cr && !denial && !!crisisCheckIn(i.q);
  const urgent = !i.en && !!urgentOf(i.raw);
  const harm = !!i.harm;
  const red = !!i.red;
  return { crisis: cr ? { text: cr.text } : null, denial, checkIn, urgent, harm, red, any: !!cr || checkIn || urgent || harm || red };
}

/** Ứng viên của lớp an toàn cho lượt này (hiện mới chuyển nhóm "ý định tự hại"; cấp cứu / bạo lực còn ở lớp legacy). */
export function safetyCandidates(risk: RiskScan, raw: string): Candidate<{ text: string }>[] {
  const out: Candidate<{ text: string }>[] = [];
  if (risk.crisis) out.push({ layer: "safety", intent: "crisis", confidence: 0.97, evidence: raw, clause: "main", payload: { text: risk.crisis.text } });
  return out;
}

// ── 2b) Nhóm THUỐC (bước 2, 15/11) ──────────────────────────────────────────
// Người dùng nói đang dùng một thuốc / nhóm thuốc và hỏi kèm món ăn, thuốc khác… mà nguồn có ghi TƯƠNG TÁC → đó là ý chính của
// câu, dù lớp khác (món ăn có lợi gì, tìm quán…) khớp trước. Chỉ đề cử khi drugAsk() trả về đúng loại "interact" cho CẢ CÂU, không
// kèm ngữ cảnh lượt trước (để không đoán theo mạch cũ).
export function drugCandidates(raw: string): Candidate<{ text: string; name?: string }>[] {
  let r: ReturnType<typeof drugAsk> = null;
  try {
    r = drugAsk(raw);
  } catch {
    r = null;
  }
  if (!r || r.kind !== "interact" || !r.name) return [];
  return [{ layer: "health", intent: "drug", confidence: 0.9, evidence: r.name, clause: clauseOf(raw, r.name), payload: { text: r.text, name: r.name } }];
}

/** Lớp của một câu đáp legacy — cùng cách xếp với bộ chấm (src/test/vibench/vibench.ts → classify). */
export function layerOf(m: Record<string, unknown> & { content: string }): Layer {
  const c = m.content;
  if (m.harm || /Ngày Mai|096 306 1414|1900 969 680|\b113\b/.test(c)) return "safety";
  if (m.tarot || m.tarotAwait || m.tarotRef || m.tarotBack || m.tarotGate || m.tarotCard) return "tarot";
  if (m.med || m.drug || m.diet || m.health || (Array.isArray(m.sx) && m.sx.length) || m.hsub) return "health";
  if (m.dishAsk || m.dish || m.dishPick || (Array.isArray(m.places) && m.places.length) || m.search) return "food";
  if (m.biz) return "biz";
  if (m.faqId) return "faq";
  if (m.stuck && ["fallback", "not_understood", "unknown_med", "suggest", "generic_listen"].includes(String(m.stuck))) return "unknown";
  if (m.heart || m.heartListen || m.thread || m.rel || m.talk) return "heart";
  return "chat";
}

// ── 2c) HỎI LẠI khi Lomi bí mà câu chỉ trỏ / quá ngắn (bước 4, 18/11) ─────────────────────────────────────────────
// Lomi không tìm được gì để đáp (legacy = "chưa biết" / "nghe nè"), mà câu lại TRỎ tới một thứ chưa nói ("chỗ đó", "bị vậy",
// "cái này") hoặc quá ngắn để có chủ đề → hỏi lại cho rõ thay vì nói "chưa biết". Bộ bắt câu mơ hồ có sẵn (lomiQShape.vagueAsk)
// chỉ bắt câu mà MỌI chữ là hư từ, ở câu ĐẦU cuộc trò chuyện; lưới này chỉ chạy SAU khi mọi lớp đã bí nên không cướp câu nào
// Lomi đáp được. Không chạy khi Lomi đang nghe người dùng tâm sự ("nghe nè" là đúng chỗ đó) hay khi câu có rủi ro.
// Chỉ tính CỤM chỉ trỏ (danh/động từ + đó/này/kia/ấy/vậy, "ở đó"). "vậy", "thế", "z" đứng cuối câu chỉ là tiếng đệm
// ("thủ đô nước Pháp là j vậy") nên KHÔNG tính.
const DEIX_HEAD = "chỗ|chổ|cái|vụ|người|chuyện|việc|bên|thằng|con|bị|làm|kiểu|như|ở|món|thuốc|bệnh|quán|chỗ";
const DEIX_ACC = new RegExp(`(?:^| )(?:${DEIX_HEAD}) (?:đó|đấy|đây|này|kia|ấy|vậy|vầy|thế)(?: |$)`, "u");
const DEIX_BARE = /(?:^| )(?:cho|cai|vu|nguoi|chuyen|viec|ben|thang|con|bi|lam|kieu|o|mon|thuoc|benh|quan) (?:do|day|kia|ay|vay)(?: |$)/;
export function vagueAskBack(raw: string, legacyStuck: string | undefined, ctx: { listening: boolean; isQuestion: boolean }): boolean {
  if (!legacyStuck) return false;
  const t = raw.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/(\p{L})\1{2,}/gu, "$1").replace(/(\p{L})\1+(?= |$)/gu, "$1").replace(/\s+/g, " ").trim(); // "vậyy", "đóoo"
  const words = t.split(" ").filter(Boolean);
  if (!words.length || words.length > 10) return false;
  const accented = /[^\x00-\x7F]/.test(t);
  const deixis = accented ? DEIX_ACC.test(t) : DEIX_BARE.test(normalizeVi(t));
  if (legacyStuck === "generic_listen") {
    // "Ừa, Lomi nghe nè" chỉ thay khi KHÔNG đang nghe tâm sự, và câu là câu hỏi / có chữ chỉ trỏ.
    if (ctx.listening || !(deixis || ctx.isQuestion)) return false;
  } else if (legacyStuck !== "fallback" && legacyStuck !== "not_understood") {
    return false;
  }
  return deixis;
}

// ── 3) Trọng tài ────────────────────────────────────────────────────────────
/** Câu đáp đã là lời an toàn chưa (đường dây nóng, 113 / 115 / 111, cảnh báo cấp cứu, mạch bạo lực). */
export function isSafetyReply(r: { content: string; harm?: unknown }): boolean {
  return !!r.harm || /^(🚨|⚠️|🔥)/u.test(r.content) || /Ngày Mai|096 306 1414|1900 969 680|(?<![\d.])11[135](?![\d.])|không phải một mình|you are not alone|crisis line|emergency/iu.test(r.content);
}

export interface Verdict<T = unknown> {
  winner: Candidate<T> | null; // null = giữ câu đáp của lớp legacy
  reason: "safety-first" | "main-clause" | "legacy" | "close-call";
  /** Hai ứng viên sát điểm, khác lớp → nên hỏi lại (chưa bật ở lượt này; ghi để đo). */
  askBack?: boolean;
}

export function arbitrate<T>(legacy: { layer: Layer; intent?: string; clause: Clause; confidence?: number; safety: boolean }, noms: Candidate<T>[]): Verdict<T> {
  const lc = legacy.confidence ?? 0.6;
  // (1) An toàn trước: ứng viên an toàn đủ chắc mà câu đáp legacy chưa phải lời an toàn → an toàn thắng.
  const safe = noms.filter((c) => c.layer === "safety" && c.confidence >= 0.9).sort((a, b) => b.confidence - a.confidence)[0];
  if (safe && !legacy.safety) return { winner: safe, reason: "safety-first" };
  if (legacy.safety) return { winner: null, reason: "legacy" };
  // (2) Vế chính thắng vế phụ; cùng vế thì phải hơn hẳn 0,25 mới thay câu đáp legacy.
  //     Ứng viên cùng lớp với legacy chỉ được xét khi legacy khai ý định và ý định KHÁC (vd legacy = thẻ dinh dưỡng, ứng viên = thuốc).
  const rest = noms.filter((c) => c.layer !== "safety" && (c.layer !== legacy.layer || (!!legacy.intent && legacy.intent !== c.intent))).sort((a, b) => b.confidence - a.confidence);
  const top = rest[0];
  if (top && top.clause === "main" && (legacy.clause === "sub" || top.confidence - lc >= 0.25)) return { winner: top, reason: "main-clause" };
  // (3) Sát điểm, khác lớp, cùng ở vế chính → đáng hỏi lại.
  if (top && top.clause === "main" && legacy.clause === "main" && Math.abs(top.confidence - lc) < 0.1) return { winner: null, reason: "close-call", askBack: true };
  return { winner: null, reason: "legacy" };
}

// ── 4) Cờ rủi ro mang qua lượt ──────────────────────────────────────────────
export type RiskFlag = { kind: "crisis" | "checkin" | "urgent" | "harm" | "red"; age: number };
export const RISK_CARRY_TURNS = 2;

export function riskKind(r: RiskScan): RiskFlag["kind"] | null {
  return r.crisis ? "crisis" : r.harm ? "harm" : r.urgent ? "urgent" : r.checkIn ? "checkin" : r.red ? "red" : null;
}
/** Cờ rủi ro cho câu đáp lượt này: lượt đang có rủi ro → age 0; không thì thừa hưởng cờ lượt trước (tối đa RISK_CARRY_TURNS lượt). */
export function nextRisk(now: RiskScan, prev: RiskFlag | undefined): RiskFlag | undefined {
  const k = riskKind(now);
  if (k) return { kind: k, age: 0 };
  if (prev && prev.age < RISK_CARRY_TURNS) return { kind: prev.kind, age: prev.age + 1 };
  return undefined;
}
