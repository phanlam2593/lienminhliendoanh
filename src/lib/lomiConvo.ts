// ─────────────────────────────────────────────────────────────────────────────
// NGỮ CẢNH HỘI THOẠI CỦA LOMI (08/10) — chạy trên máy, không gọi AI.
// Lomi hiểu từng câu đơn khá ổn; chỗ yếu là câu NỐI TIẾP. File này không thêm câu mẫu để hiểu thêm câu đơn,
// mà đọc 2–5 lượt gần nhất để biết: đang nói chủ đề gì, về món / người / trải bài nào, Lomi vừa hỏi gì và
// đang chờ kiểu trả lời nào — rồi đổi câu nối tiếp thành câu ĐẦY ĐỦ Ý cho các lớp hiểu câu đơn sẵn có.
//
//   convoOf(lịch sử)     → trạng thái hội thoại (chủ đề, thực thể, kiểu câu trả lời đang chờ, đang nghe kể…)
//   resolveTurn(q, raw…) → một trong:
//       rewrite  "quán nào ổn?" (đang nói cà phê)        ⇒ "tìm quán cà phê"
//       refine   "yên tĩnh" (vừa tìm quán cà phê)        ⇒ tìm lại quán cà phê, thêm điều kiện "yên tĩnh"
//       reply    "ừ" (Lomi vừa hỏi "tâm sự, bói bài hay tìm quán?") ⇒ hỏi lại đúng phần còn thiếu
//       null     không phải câu nối tiếp → để nguyên cho các lớp sau
// AiAssistant.send() gọi resolveTurn MỘT lần ở đầu lượt. Luật ở đây chỉ chạy khi CÓ ngữ cảnh phù hợp.
// ─────────────────────────────────────────────────────────────────────────────
import { faqById, normalizeVi } from "@/lib/lomiFaq";
import { DISHES, detectDish, detectSearch, type Dish } from "@/lib/lomiSearch";
import { expandTeen, isAffirm, isAppish, isDecline, type ChatReply } from "@/lib/lomiChat";
import { isAskLike, isTalkCont, senseLate, senseState, talkContinue } from "@/lib/lomiSense";
import { TIP_MENU, socialIntent } from "@/lib/lomiUnderstand";
import { detectTarot, readingCardAt, readingRecap, tarotCard, type TarotReading } from "@/lib/tarot";
import { findMedTopicId } from "@/lib/lomiMed";
import { symptomLabel } from "@/lib/lomiSymptoms";
import { VR, VN } from "@/lib/viMatch";

/** Phần của một tin trong lịch sử mà ngữ cảnh cần đọc (khớp các cờ trên Msg của AiAssistant). */
export type ConvoMsg = {
  role: "user" | "assistant";
  content: string;
  raw?: string;
  quick?: string[];
  heart?: string;
  /** Mạch SỨC KHOẺ (lib/lomiHealthTopic) — tách khỏi mạch tâm sự (heart). */
  health?: unknown;
  rel?: string;
  hsub?: string;
  sx?: string[];
  diet?: string;
  dish?: string;
  dishPick?: boolean;
  dishAsk?: { drink: boolean; shown: string[] };
  search?: unknown;
  tarot?: TarotReading;
  tarotRef?: TarotReading;
  /** Trải bài rút cách đây vài lượt (chuyện khác đã chen vào) — vẫn hỏi lại được khi câu nhắc rõ "lá / bài". */
  tarotBack?: { r: TarotReading; n: number };
  tarotAwait?: boolean;
  bizPick?: boolean;
  bizTopicPick?: boolean;
  biz?: unknown;
  faqId?: string;
  issue?: string;
  unk?: string;
  talk?: number;
};

export type Topic = "tarot" | "health" | "heart" | "food" | "biz" | "app" | "talk";
export type Convo = {
  /** Tin Lomi gần nhất (không có = cuộc trò chuyện mới). */
  last?: ConvoMsg;
  topic?: Topic;
  /** Lomi vừa hỏi và chờ đúng một câu trả lời (câu hỏi bói, loại hình kinh doanh) — không chen ngữ cảnh khác vào. */
  waiting: boolean;
  /** Món / loại quán đang nói trong 2 lượt gần nhất. */
  dish?: { id: string; label: string };
  /** Đang nói chuyện ăn uống (vừa than đói, Lomi vừa gợi ý chuyện ăn). */
  foodTalk: boolean;
  /** Người đang được nhắc trong chuyện tình cảm ("người ấy", "anh ấy"…). */
  person?: string;
  symptoms: string[];
  reading?: TarotReading;
  /** Trải bài rút cách đây 1–3 lượt, giữa chừng đã nói sang chuyện khác. */
  readingBack?: TarotReading;
  /** Số lượt Lomi đang "nghe kể" liên tục (0 = không). */
  talk: number;
  /** Kiểu câu trả lời Lomi đang chờ cho câu hỏi vừa hỏi. */
  asked?: "yesno" | "choice" | "open";
  /** Chủ đề đã nói TRƯỚC chủ đề hiện tại (để hiểu "cái lúc nãy"). */
  earlier: { topic: Topic; label: string; resume: string; /** tin Lomi cách tin cuối bao nhiêu tin (1 = ngay trước tin cuối) */ back: number }[];
};

export type Want = { text?: string; offer?: boolean; near?: boolean; /** giới hạn khoảng cách (km) người dùng nói: "5km thôi", "dưới 2 cây số" */ maxKm?: number };
export type Resolved =
  | { kind: "rewrite"; q: string; why: string }
  | { kind: "refine"; dish: string; want: Want; why: string }
  /** Thêm điều kiện cho lần tìm CHỖ vừa rồi (không theo món): "giới hạn 5km thôi" sau "lựa quán cho a đi". */
  | { kind: "research"; want: Want; why: string }
  /** keep = giữ nguyên cờ ngữ cảnh của tin trước (đang tâm sự, đang nói sức khoẻ, trải bài vừa rút…). */
  | { kind: "reply"; reply: ChatReply; keep: boolean; talk?: boolean; why: string; /** keep: giữ cờ ngữ cảnh của tin Lomi cách đây `back` tin (mặc định tin cuối) */ back?: number };

const dishLabel = (d: Dish) => d.name.split(/[,(]/)[0].trim();
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

function topicOf(m: ConvoMsg): Topic | undefined {
  if (m.tarot || m.tarotRef || m.tarotAwait) return "tarot";
  if (m.health && !m.heart) return "health";
  // Có cả hai = đang tâm sự VỀ một chuyện sức khoẻ → là mạch tâm sự. (Lịch sử cũ: heart "health" kèm triệu chứng = mạch sức khoẻ.)
  if (m.heart) return m.heart === "health" && !m.health && (m.sx?.length || m.hsub || m.diet) ? "health" : "heart";
  if (m.sx?.length || m.hsub || m.diet) return "health";
  if (m.biz || m.bizPick || m.bizTopicPick) return "biz";
  if (m.dish || m.dishAsk || m.dishPick || m.search) return "food";
  if (m.faqId || m.issue) return "app";
  if (m.talk) return "talk";
  return undefined;
}

/** Câu hỏi CUỐI trong tin của Lomi đang chờ kiểu trả lời nào. */
export function askedKind(content: string): Convo["asked"] {
  const qs = content.match(/[^.!?\n]*\?/g);
  if (!qs) return undefined;
  const n = ` ${normalizeVi(qs[qs.length - 1])} `;
  // "tâm sự, bói bài hay đi tìm quán ngon?" — chọn một trong nhiều thứ ("… hay không?" vẫn là có/không).
  if (VN(/ hay (?!không|chưa|sao|là không)/).test(n)) return "choice";
  const yesNoEnd = VN(/ (không|ko|chưa|hả|ha|hở|ho|à|a|nha|nhé|nhe|chứ|đúng không|phải không|được không|chưa nhỉ|không nè|không nhỉ) $/).test(n);
  if (!yesNoEnd && VN(/ (gì|nào|sao|đâu|mấy|bao nhiêu|bao lâu|thế nào|ai|khi nào) /).test(n)) return "open";
  return "yesno";
}

/** Tin của Lomi có phải LỜI MỜI làm một việc ("Muốn Lomi tìm quán không?") để "ừ" = làm luôn gợi ý đầu. */
export function isOffer(content: string): boolean {
  // 09/10: lời mời không có dấu hỏi ("Để Lomi kiếm quán cà phê xinh cho bạn nha ☕", "Lomi tìm quán cho bạn được nè!") cũng là lời mời.
  if (VR(/(để (Lomi|em) (kiếm|tìm)|(Lomi|em) tìm quán[^.!?]* được)/i).test(content)) return true;
  return /\?/.test(content) && VR(/(muốn|thử|để Lomi|để em|rút|bói|chọn giùm|chỉ cách|xem thử)/i).test(content);
}

const userText = (m: ConvoMsg) => expandTeen(m.raw ?? m.content);

/** Đọc 2–5 lượt gần nhất thành trạng thái hội thoại. */
export function convoOf(history: ConvoMsg[]): Convo {
  const h = history.slice(-10);
  const lastMsg = h[h.length - 1];
  const last = lastMsg?.role === "assistant" ? lastMsg : undefined;
  const c: Convo = { last, waiting: false, foodTalk: false, symptoms: [], talk: 0, earlier: [] };
  if (!last) return c;
  const as = h.filter((m) => m.role === "assistant");
  const us = h.filter((m) => m.role === "user");
  c.topic = topicOf(last);
  c.waiting = !!(last.tarotAwait || last.bizPick || last.bizTopicPick);
  c.person = last.rel?.split("|")[0] || undefined;
  c.symptoms = last.sx ?? [];
  c.reading = last.tarot ?? last.tarotRef;
  c.readingBack = last.tarotBack?.r;
  c.asked = askedKind(last.content);
  // Đang nghe kể: tin Lomi gần nhất là lời "nghe kể", hoặc là một câu đáp xã giao ngắn chen giữa mạch kể.
  const prevA = as[as.length - 2];
  c.talk = last.talk ?? (!topicOf(last) && !last.unk && prevA?.talk ? prevA.talk : 0);
  if (c.talk && !c.topic) c.topic = "talk";
  // Món / loại quán: cờ trên tin Lomi, không có thì đọc 2 tin gần nhất của người dùng.
  const d = (last.dish ? DISHES.find((x) => x.id === last.dish) : undefined) ?? us.slice(-2).reverse().map((m) => detectDish(userText(m))).find(Boolean);
  if (d && (!c.topic || c.topic === "food" || c.topic === "talk")) c.dish = { id: d.id, label: dishLabel(d) };
  const lastUser = us[us.length - 1];
  const hungry = lastUser ? VR(/^state:(hungry|thirsty)$/).test(senseState(lastUser.raw ?? lastUser.content)?.intent ?? "") : false;
  c.foodTalk = (!c.topic || c.topic === "food" || c.topic === "talk") && (!!last.dishAsk || hungry || !!last.quick?.some((x) => VR(/ăn gì|uống gì|quán ăn/i).test(x)));
  if (c.foodTalk && !c.topic) c.topic = "food";
  // Chủ đề đã nói trước đó (khác chủ đề hiện tại), mới nhất trước.
  const olderA = as.slice(0, -1).reverse();
  for (const [bi, m] of olderA.entries()) {
    const t = topicOf(m);
    if (!t || t === c.topic || t === "talk" || c.earlier.some((e) => e.topic === t)) continue;
    const md = m.dish ? DISHES.find((x) => x.id === m.dish) : undefined;
    const e =
      t === "tarot" ? { label: "trải bài Tarot", resume: "Bói lại" }
      : t === "health" ? { label: "chuyện sức khoẻ", resume: "🩺 Sức khoẻ" }
      : t === "heart" ? { label: "chuyện bạn đang tâm sự", resume: "Tâm sự với Lomi" }
      : t === "biz" ? { label: "chuyện kinh doanh", resume: "Tư vấn kinh doanh" }
      : t === "food" ? { label: md ? `quán ${dishLabel(md)}` : "chuyện ăn uống", resume: md ? `Tìm quán ${dishLabel(md)}` : "Hôm nay ăn gì? 🎲" }
      : m.faqId && faqById(m.faqId) ? { label: `câu “${faqById(m.faqId)!.q.vi.replace(/\?$/, "")}”`, resume: faqById(m.faqId)!.q.vi }
      : { label: "câu hỏi về app", resume: "Hướng dẫn dùng app" };
    c.earlier.push({ topic: t, ...e, back: bi + 1 });
    if (c.earlier.length >= 2) break;
  }
  return c;
}

// ── Cụm THAM CHIẾU: (từ nối)* + từ chỉ định + ("thì sao")? — đọc theo cấu trúc, không theo danh sách câu ──
const LEAD = "(?:(?:vay|the|roi|con|ua|a|o|ma|y|la) )*";
const TAIL = "(?: (?:thi sao|sao|the nao|thi the nao|nhu nao|thi lam sao))?(?: (?:a|ha|nhi|ta|vay|ne|do))*";
const REF_THING = VR(new RegExp(`^${LEAD}(?:cai|chuyen|dieu|viec|mon|cho) (?:do|kia|nay|ay)${TAIL}$`));
const REF_PERSON = VR(new RegExp(`^${LEAD}(?:nguoi (?:do|ay|kia|ta)|ho|anh ay|co ay|chi ay|ban ay|nguoi yeu|ny|crush)${TAIL}$`));
// 20/10 (audit): "thôi quay lại chuyện lúc nãy", "nói tiếp chuyện hồi nãy đi" — có động từ QUAY LẠI thì người dùng đã chọn rồi.
const RESUME = "(?:quay lai|quay ve|tro lai|noi tiep|ke tiep|tiep tuc|noi lai|ke lai|nghe tiep)";
const REF_EARLIER = VR(new RegExp(`^(?:thoi )?${LEAD}(?:${RESUME} (?:voi )?(?:ve )?)?(?:(?:cai|chuyen|dieu|viec) )?(?:luc nay|hoi nay|vua roi|vua nay|ban nay|truoc do|luc truoc|ban dau|luc dau)(?: (?:do|ay|kia))?(?: (?:di|nha|nhe|nhen|thoi))*${TAIL}$`));
const RESUME_RE = VR(new RegExp(`\\b${RESUME}\\b`));
// Xác nhận / bác bỏ (rộng hơn isAffirm / isDecline một chút: "đúng rồi", "chuẩn", "không phải").
const YES = VN(/^(đúng|đúng rồi|đúng vậy|chuẩn|chuẩn rồi|phải|phải rồi|chính xác|ừ đúng|ừ đúng rồi|có chứ)( (ạ|à|a|nha|nhé|nhe|nè|đó|lomi|em|e))*$/);
const WRONG = VN(/^(không phải|ko phải|k phải|hông phải|hong phải|sai rồi|không đúng|không phải vậy|nhầm rồi|không phải thế)( (đâu|mà|nha|ạ|à|a|lomi|em|e))*$/);
// Câu hỏi về CHỖ mà không nói chỗ gì ("quán nào ổn?", "ở đâu ngon?") — cần ngữ cảnh mới biết quán gì.
const PLACE_Q = VN(/\b(quán nào|quán gì|chỗ nào|ở đâu|đi đâu|địa chỉ nào|có quán nào|biết quán nào|quán ở đâu)\b/);
const NEAR = VN(/\b(gần|gần đây|gần mình|gần nhà|gần cho mình|quanh đây|gần nhất)\b/);
const OFFER = VN(/\b(ưu đãi|khuyến mãi|giảm giá|sale|deal|voucher)\b/);
// Động tác liên lạc trong chuyện tình cảm ("còn nên nhắn không?", "gọi luôn được không?").
const CONTACT = VN(/\b(nhắn|nhắn tin|gọi|gọi điện|liên lạc|inbox|rep|bắt chuyện|chủ động|mở lời)\b/);
// Từ đệm bỏ khỏi điều kiện tìm quán ("yên tĩnh chút nha" → "yên tĩnh").
const WANT_DROP = VR(/(^|\s)(thôi|nha|nhé|nhen|á|ạ|đi|chút|xíu|tí|hơn|một chút|quán|chỗ|nào|kiểu|loại|cái|cho|mình|a|anh|em|e|thích|muốn|cần|có|là)(?=\s|$)/giu);

// 10/10 — ĐỒNG Ý / TỪ CHỐI KÈM VÀI CHỮ ("Ừa 8 chút cũng đc", "ừ thì gợi ý đi", "thôi khỏi cũng được", "để lúc khác đi"):
// chữ đầu là lời đồng ý / từ chối, các chữ sau chỉ là chữ đệm hoặc nhắc lại đúng việc Lomi vừa mời → coi như "ừ" / "không".
const AGREE_HEAD = new Set("u ua uh um uhm ok oke okie okay okla duoc dc vang da co uk yes yep chac".split(" "));
const DECLINE_HEAD = new Set("thoi khoi khong ko k de no hong".split(" "));
const SOFT = new Set(
  "cung duoc dc luon thoi nha nhe nhen ne di a ah vay the chut xiu ti 8 tam chuyen noi tro lomi em e anh chi minh ban ok oke thi gi hay do nghe on roi lam dang goi y tim boi rut xem ke giup cho khoi luc khac sau de khi nao can dau ma qua lat nua bua hom mai toi chieu".split(" "),
);
function looseAnswer(n: string): "yes" | "no" | null {
  const w = n.split(" ").filter(Boolean);
  if (w.length < 2 || w.length > 7 || !w.slice(1).every((x) => SOFT.has(x))) return null;
  if (DECLINE_HEAD.has(w[0]) || VN(/^(để lúc khác|để sau|thôi khỏi|khỏi đi|lúc khác|lát nữa|để lát)\b/).test(n)) return VN(/\b(khỏi|lúc khác|để sau|không|ko|thôi|lát nữa|chút nữa|tí nữa|để lát|bữa khác|hôm khác)\b/).test(n) ? "no" : null;
  if (AGREE_HEAD.has(w[0]) || VN(/^cũng được\b/).test(n)) return "yes";
  return null;
}
// Lomi vừa hỏi thăm ("Hôm nay của bạn thế nào?") mà người dùng đáp "cũng được", "bình thường" → đáp nhẹ, mời kể.
// ("ok", "được" đứng một mình KHÔNG tính — đó là "ừ")
const SOSO = VN(/^(cũng (được|ổn|bình thường|tạm tạm|vậy|thường thường|ổn ổn)|ổn|ổn ổn|bình thường|tạm ổn|tạm tạm|thường thường|vậy vậy|như mọi ngày|chưa biết nữa|tạm được|ổn áp)( (ạ|à|a|ah|thôi|nha|nè|lomi|e|em|lắm|mà))*$/);
// 10/10 — XIN MẸO theo chuyện đang nói ("E biết mẹo gì k?", "còn mẹo nào khác không", "có cách nào khác không").
const TIP = VN(/\b(mẹo|bí kíp|kinh nghiệm gì|còn cách nào|cách nào khác|cách khác|có cách gì|tips|tip)\b/);
// 10/10 — KHOẢNG CÁCH cho lần tìm chỗ vừa rồi ("giới hạn 5km thôi", "trong vòng 3km", "dưới 2 cây số").
const KM = VN(/\b(\d+(?:[.,]\d+)?) ?(?:km|ki lô mét|kí lô mét|kilomet|kilô mét|kilo mét|cây số|cs)\b/);

// 20/10 (audit): hỏi lại ý câu Lomi vừa nói / bác câu đó.
const EXPLAIN_ME = VN(/^(?:(?:vậy|thế|ủa|ơ|à|nhưng) )*(?:ý (?:e|em|lomi|bạn) là (?:sao|gì)|ý là sao|ý là gì|nghĩa là sao|vậy là sao|là sao|nói rõ hơn|nói rõ lại|giải thích (?:thêm|lại|rõ hơn|cho (?:a|anh|mình|tui) hiểu)|(?:e|em|lomi) nói (?:gì|cái gì) (?:vậy|thế|zậy)|(?:a|anh|mình|tui) (?:chưa |không |ko )hiểu(?: lắm)?|khó hiểu (?:quá|ghê))(?: (?:vậy|thế|à|ạ|a|hả|ha|nhỉ|e|em|lomi|đi|nha|nhé))*$/);
//   ("sai rồi" trơn sau một lời đoán là Lomi HIỂU NHẦM — mục 4 lo; ở đây phải nói rõ là Lomi NÓI sai: "e nói sai rồi", "trả lời sai".)
const DISPUTE = VN(/^(?:(?:mà|nhưng|ủa) )?(?:(?:e|em|lomi|bạn) (?:nói|trả lời|đáp|ghi) |(?:e|em|lomi) |nói |trả lời )(?:sai|không đúng|ko đúng|nhầm|bậy|trật)(?: (?:rồi|nha|đó|nhé|á|mà|hết|bét))*(?: (?:e|em|lomi|ơi))*$|\b(?:thông tin|cái|chỗ) (?:này|đó) (?:sai|không đúng)\b/);
/** Ý chính của một câu trả lời dài: dòng gạch đầu dòng / câu có nội dung đầu tiên (bỏ tiêu đề, emoji, chữ đậm). */
function gistOf(content: string): string | null {
  const lines = content.split("\n").map((x) => x.replace(/\*\*/g, "").trim()).filter(Boolean);
  const pick = lines.find((x) => /^•/.test(x)) ?? lines.find((x) => x.length > 40 && !/:$/.test(x) && !/^📚/u.test(x));
  if (!pick) return null;
  const t = pick.replace(/^•\s*/, "").replace(/^\p{Extended_Pictographic}\s*/u, "");
  const one = t.split(/(?<=[.!?])\s/)[0];
  return one.length > 220 ? `${one.slice(0, 217).trim()}…` : /[.!?…]$/.test(one) ? one : `${one}.`;
}
// Lệnh của mạch chọn món sẵn có ("món khác", "quán khác") — AiAssistant tự xử lý, không coi là điều kiện tìm quán.
const FLOW_CMD = VN(/\b(món khác|quán khác|đổi món|đổi quán|chỗ khác|đồ uống khác|gợi ý khác|món nào khác)\b/);
const PLACE_FILL = new Set("on ngon ok oke duoc dep tot re xin hay nhat vay ta nhi ha e em lomi co khong ko thi biet chi gioi thieu goi y a anh cho minh di day gio nay ne nha".split(" "));
/** Câu tự nêu một LOẠI CHỖ khác món đang nói ("quán ăn", "spa", "homestay"…) → không phải câu nối về món đó. */
export function otherPlace(q: string): boolean {
  return VN(/\b(quán ăn|nhà hàng|spa|massage|gội đầu|nail|tóc|salon|barber|gym|yoga|phòng tập|homestay|khách sạn|hotel|bar|pub|shop|cửa hàng|tiệm)\b/).test(normalizeVi(q));
}
const mine = (p: string) => p.replace(VR(/ bạn$/), " mình");

// 11/10 — "LÁ" (lá bài) ≠ "LÀ". Bỏ dấu thì hai chữ trùng nhau, nên trước đây MỌI câu có chữ "là" ("Tăng huyết áp là gì?") đều bị
// coi là đang nhắc tới lá bài vừa rút. Đọc trên câu CÓ DẤU: "lá" / "bài" / "tarot" mới là nhắc tới bài; "là" thì không.
// Câu gõ không dấu ("la nay nghia la gi"): chữ "la" chỉ tính là lá bài khi đi với từ chỉ định / số đếm ("la nay", "la thu 2", "may la").
const CARD_DET = new Set("nay do kia ay bai thu so dau cuoi giua nguoc xuoi vua tren".split(" "));
const CARD_NUM = new Set("may cac nhung tung moi mot hai ba bon nam sau bay tam chin muoi 1 2 3 4 5 6 7 8 9 10".split(" "));
export function mentionsCard(text: string): boolean {
  const w = text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return w.some((t, i) => {
    if (t === "tarot" || t === "lá" || t === "bài" || t === "bai") return true;
    if (t !== "la") return false;
    return CARD_DET.has(normalizeVi(w[i + 1] ?? "")) || CARD_NUM.has(normalizeVi(w[i - 1] ?? ""));
  });
}
// Câu hỏi NGHĨA có chủ ngữ riêng ("X là gì?", "X nghĩa là sao?"): X phải là chính lá bài / trải bài (hoặc bỏ trống: "là sao?",
// "nghĩa là gì?") thì mới là hỏi nghĩa lá bài. X là một thứ khác ("tăng huyết áp", "điểm thưởng") → câu hỏi mới, không phải hỏi bài.
const MEAN_HEAD = VN(/^(.*?)\b(?:có nghĩa là|nghĩa là|có nghĩa|ý nghĩa|nghĩa|là)(?: bệnh| cái)? (?:gì|sao)\b/);
const REF_WORDS = new Set(
  "vay the roi con ua a o ma y la thi lomi e em oi cho hoi anh chi minh toi tui ban no nay do kia ay cai dieu chuyen cau viec tren vua rut ra bai tarot trai quan nguoc xuoi thu so dau tien cuoi cung giua may cac nhung nhu noi chung tom lai ket qua thong diep loi khuyen vi tri hien tai qua khu tuong lai tinh cam yeu cong su nghiep tien bac tai chinh ha nhi vay".split(" "),
);
/** Chủ ngữ của câu hỏi nghĩa: "foreign" = một thứ khác lá bài; "card" = gọi đúng tên một lá trong trải bài; null = không có / chỉ từ chỉ định. */
function meanSubject(n: string, r: TarotReading): "foreign" | "card" | null {
  const m = n.match(MEAN_HEAD);
  if (!m) return null;
  const card = new Set<string>();
  for (const d of r.cards) {
    const k = tarotCard(d.id);
    for (const x of `${normalizeVi(k.name.vi)} ${normalizeVi(k.name.en)}`.split(" ")) if (x) card.add(x);
  }
  const own = new Set(card);
  for (const x of normalizeVi(`${r.question ?? ""} ${(r.pos ?? []).map((p) => p.vi).join(" ")}`).split(" ")) if (x) own.add(x);
  const ws = m[1].split(" ").filter((x) => x && !REF_WORDS.has(x) && !/^\d+$/.test(x));
  if (ws.some((x) => !own.has(x))) return "foreign";
  return ws.some((x) => card.has(x)) ? "card" : null;
}
const foreignSubject = (n: string, r: TarotReading) => meanSubject(n, r) === "foreign";

/**
 * Hiểu tin này theo ngữ cảnh gần nhất. q = câu đã chuẩn hoá (teen code, cách nói khác); raw = câu gõ nguyên văn.
 * Trả null khi tin này không phải câu nối tiếp (hoặc chưa có ngữ cảnh) → các lớp hiểu câu đơn xử lý như thường.
 */
export function resolveTurn(q: string, raw: string, c: Convo, opts: { correcting?: boolean } = {}): Resolved | null {
  const last = c.last;
  if (!last || c.waiting) return null;
  const n = normalizeVi(q);
  if (!n) return null;
  const words = n.split(" ").length;
  const ask = isAskLike(q);
  const loose = !isAffirm(q) && !YES.test(n) && !isDecline(q) ? looseAnswer(n) : null;
  const yes = isAffirm(q) || YES.test(n) || loose === "yes";
  const no = isDecline(q) || loose === "no";
  const wrong = WRONG.test(n);

  // 1) "cái lúc nãy", "chuyện vừa rồi" → chủ đề đã nói TRƯỚC đó.
  if (REF_EARLIER.test(n)) {
    const e = c.earlier[0];
    //   Nói rõ "quay lại / nói tiếp" → quay lại luôn, mang theo ngữ cảnh của chính chuyện đó (không hỏi lại "muốn nói tiếp hả?").
    if (e && RESUME_RE.test(n))
      return {
        kind: "reply",
        keep: true,
        back: e.back,
        why: "ref:resume",
        reply: { text: e.topic === "heart" ? `Ừ, mình quay lại **${e.label}** nha 🌿 Bạn kể tiếp đi, Lomi nghe nè.` : `Ừ, quay lại **${e.label}** nha. Bạn muốn hỏi tiếp phần nào?`, quick: e.topic === "heart" ? [] : [e.resume] },
      };
    if (e) return { kind: "reply", keep: false, why: "ref:earlier", reply: { text: `Lúc nãy mình đang nói về **${e.label}** — bạn muốn nói tiếp chuyện đó hả?`, quick: [e.resume] } };
    if (c.topic && c.topic !== "talk") return { kind: "reply", keep: true, why: "ref:earlier-same", reply: { text: "Ý bạn là chuyện mình vừa nói ở trên hả? Bạn hỏi cụ thể hơn một chút giúp Lomi nha 😊" } };
    return { kind: "reply", keep: true, why: "ref:earlier-none", reply: { text: "Lúc nãy là chuyện nào ta 😅 Bạn nhắc lại giúp Lomi vài chữ thôi cũng được nha." } };
  }
  // Người dùng vừa sửa lại ("ý a là…", "không, a hỏi…") → phần sau là ý MỚI, không ghép ngữ cảnh cũ vào nữa.
  if (opts.correcting) return null;

  // 2) Chuyện tình cảm đang nói về MỘT NGƯỜI: câu nối thiếu chủ thể → điền đúng người đó.
  if (c.topic === "heart" && c.person) {
    const p = c.person;
    const named = VN(/\b(người ấy|người đó|anh ấy|cô ấy|chị ấy|crush|người yêu|ny|bạn trai|bạn gái|vợ|chồng)\b/).test(n);
    if (REF_PERSON.test(n))
      return {
        kind: "reply",
        keep: true,
        why: "ref:person",
        reply: { text: `Bạn đang hỏi về ${p} đúng không? Bạn muốn biết ${p} đang nghĩ gì, hay bạn nên làm gì tiếp theo?`, quick: [`${cap(mine(p))} đang nghĩ gì về mình?`, "Mình nên làm gì bây giờ?"] },
      };
    if (CONTACT.test(n) && ask && !named && words <= 9)
      return { kind: "rewrite", why: "heart:contact", q: VN(/\b(nhắn gì|nói gì|mở lời sao|bắt chuyện sao|nhắn sao|nhắn thế nào|nhắn như thế nào|nói sao|nói thế nào|viết gì|viết sao|câu nào)\b/).test(n) ? `nên nhắn gì cho ${mine(p)}` : `có nên nhắn cho ${mine(p)} không` };
  }

  // 11/10: trải bài rút cách đây vài lượt (đã nói sang chuyện khác) vẫn là trải bài đang nói tới khi câu nhắc rõ "lá / bài"
  //        ("Nếu lá ngược thì sao?" sau hai câu kể thêm về người ấy) — trước đây Lomi đáp "chưa bắt chắc ý bạn".
  const tWord = mentionsCard(raw);
  const rd = c.reading ?? (tWord ? c.readingBack : undefined);
  // 3a) Hỏi riêng MỘT lá theo thứ tự ("lá thứ 3 nói gì?", "lá đầu tiên là sao?", "lá cuối nghĩa gì?") → giải đúng lá đó theo vị trí của nó.
  const nth = rd && words <= 10 && !detectTarot(q) ? n.match(VN(/\blá (?:bài )?(?:(?:thứ|số) (\d+|nhất|hai|ba|tư|bốn|năm|sáu|bảy|tám|chín|mười)|(đầu tiên|đầu|cuối cùng|cuối|giữa))\b/)) : null;
  if (rd && nth) {
    const ORD: Record<string, number> = { nhat: 1, hai: 2, ba: 3, tu: 4, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10 };
    const i = nth[1] ? (ORD[nth[1]] ?? Number(nth[1])) - 1 : VN(/^đầu/).test(nth[2]) ? 0 : VN(/^cuối/).test(nth[2]) ? rd.cards.length - 1 : Math.floor((rd.cards.length - 1) / 2);
    const one = readingCardAt(rd, i);
    return {
      kind: "reply",
      keep: true,
      why: "tarot:card",
      reply: one
        ? { text: one, quick: ["Rút thêm", "Bói lại"] }
        : { text: `Trải bài vừa rồi chỉ có ${rd.cards.length} lá thôi nè 🔮 Bạn muốn Lomi giải kỹ lá nào trong ${rd.cards.length} lá đó, hay rút thêm một lá?`, quick: ["Rút thêm"] },
    };
  }
  // 3) Vừa bói xong, hỏi nghĩa xuôi / ngược của CHÍNH các lá vừa rút → giải theo trải bài đó, không rút bài mới.
  if (rd && VR(/\b(nguoc|xuoi)\b/).test(n) && words <= 10 && !detectTarot(q)) {
    const r = rd;
    // 21/10 (audit P3): hỏi ĐÚNG một chiều ("nếu lá ngược thì sao") → mỗi lá chỉ đọc nghĩa chiều đó (lá đang ra đúng chiều đó thì nói rõ);
    //   trước đây mỗi lá đọc cả hai chiều, lời đáp dài tới ~1.000 ký tự khi rút trúng lá có lời giải dài.
    const wantRev = VR(/\bnguoc\b/).test(n) && !VR(/\bxuoi\b/).test(n);
    const wantUp = VR(/\bxuoi\b/).test(n) && !VR(/\bnguoc\b/).test(n);
    const cards = r.cards.slice(0, 3).map((d) => {
      const k = tarotCard(d.id);
      if (wantRev) return d.rev ? `• **${k.name.vi}** đang ra ngược sẵn rồi: ${k.rev.vi}` : `• **${k.name.vi}** (đang xuôi) — nếu ra ngược: ${k.rev.vi}`;
      if (wantUp) return d.rev ? `• **${k.name.vi}** (đang ngược) — nếu ra xuôi: ${k.up.vi}` : `• **${k.name.vi}** đang ra xuôi sẵn rồi: ${k.up.vi}`;
      return d.rev ? `• **${k.name.vi}** đang ra ngược: ${k.rev.vi}\n  Nếu ra xuôi thì nghiêng về: ${k.up.vi}` : `• **${k.name.vi}** đang ra xuôi: ${k.up.vi}\n  Nếu ra ngược thì nghiêng về: ${k.rev.vi}`;
    });
    const head = r.question ? `Vẫn với câu hỏi “${r.question.replace(/[?？\s]+$/u, "")}” nha 🔮` : "Vẫn với lá bài vừa rút nha 🔮";
    return {
      kind: "reply",
      keep: true,
      why: "tarot:reverse",
      reply: {
        text: `${head}\n\n${cards.join("\n")}${r.cards.length > 3 ? "\n• … (các lá còn lại cũng đọc theo cách đó)" : ""}\n\nLá ngược không hẳn là xấu — thường là năng lượng đang bị chặn, chậm lại hoặc cần nhìn lại thôi.`,
        quick: ["Rút thêm", "Bói lại"],
      },
    };
  }

  // 3b) Vừa bói xong, hỏi NGHĨA của chính lá vừa rút ("lá này nghĩa là sao?", "giải thích thêm đi") → giải lá đó, vẫn giữ trải bài
  //     (để câu sau "thế còn tình cảm thì sao?" vẫn là hỏi bài).
  // 3c) Hỏi lại KẾT LUẬN của trải bài ("vậy chọn A hả?", "tóm lại là sao?", "vậy là có hay không?") → nhắc lại kết luận theo đúng câu hỏi gốc,
  //     không rút bài mới và không đổi câu hỏi.
  if (c.reading && words <= 9 && !detectTarot(q) && (VN(/\b(tóm lại|nói gọn|kết luận|chốt lại|rốt cuộc|nói chung là sao|vậy là sao|vậy là (có|không|nên|được|ổn|tốt|xấu|chưa)|vậy (là )?(có|không) (hả|ha|à|a|nhỉ)|cái nào (tốt|hơn|ổn)|bên nào (tốt|hơn|ổn)|nghiêng về)\b/).test(n) || (c.reading.kind === "choice" && VN(/\b(chọn|nên chọn|vậy chọn|theo) \S+/).test(n) && ask)))
    return { kind: "reply", keep: true, why: "tarot:recap", reply: { text: readingRecap(c.reading, VR(/nói gọn lại là vầy|vừa tóm lại đó/).test(last.content)), quick: ["Rút thêm", "Bói lại"] } };
  //     11/10: chỉ khi câu thật sự nói về lá bài — "Tăng huyết áp là gì?" sau một trải bài là câu hỏi MỚI (chữ "là" không phải "lá",
  //     và chủ ngữ là một thứ khác), nhường cho lớp kiến thức trả lời.
  const otherAsk = !!rd && !tWord && (foreignSubject(n, rd) || !!findMedTopicId(q));
  if (rd && (c.reading || tWord) && !otherAsk && words <= 9 && !detectTarot(q) && VN(/\b(nghĩa là|ý nghĩa|nghĩa gì|nghĩa sao|là sao|giải thích|nói rõ|nói thêm|nói kỹ|nói kĩ|hiểu sao|nói về gì|nói gì|là gì)\b/).test(n) && (tWord || VN(/\b(nó|cái này|cái đó|thêm|hơn)\b/).test(n) || words <= 4 || meanSubject(n, rd) === "card")) {
    const r = rd;
    const cards = r.cards.slice(0, 3).map((d) => {
      const k = tarotCard(d.id);
      return `• **${k.name.vi}** (${d.rev ? "ngược" : "xuôi"}): ${d.rev ? k.rev.vi : k.up.vi}`;
    });
    return {
      kind: "reply",
      keep: true,
      why: "tarot:meaning",
      reply: {
        text: `${r.cards.length > 1 ? "Mấy lá bạn vừa rút" : "Lá bạn vừa rút"} nói thế này nè 🔮\n\n${cards.join("\n")}${r.cards.length > 3 ? "\n• … (các lá còn lại đọc theo cách đó)" : ""}\n\nNói gọn: bài không phán số phận, mà chỉ ra năng lượng đang nổi lên để bạn tự chọn cách đi tiếp. Bạn muốn xem kỹ hơn về mảng nào?`,
        quick: ["Thế còn tình cảm thì sao?", "Thế còn công việc thì sao?", "Rút thêm"],
      },
    };
  }

  // 3c') 20/10 (audit) — HỎI LẠI / BÁC câu Lomi VỪA trả lời ("ý e là sao", "e nói sai rồi") → bám đúng câu trả lời đó, giữ mạch đang nói.
  //   (trước đây: "Cái nào nè? 👀" và mất luôn ngữ cảnh sức khoẻ / bệnh đang nói.) Trải bài Tarot có lời giải riêng ở trên.
  const substantive = last.content.length >= 120 && !last.tarot && !last.tarotRef;
  if (substantive && words <= 8 && EXPLAIN_ME.test(n)) {
    const gist = gistOf(last.content);
    return {
      kind: "reply",
      keep: true,
      why: "meta:explain",
      reply: { text: gist ? `Nói gọn lại thì ý Lomi là: ${gist}\n\nBạn thấy chỗ nào khó hiểu, chỉ giúp Lomi để Lomi giải thích kỹ đúng chỗ đó nha.` : "Bạn thấy chỗ nào khó hiểu, chỉ giúp Lomi để Lomi giải thích kỹ đúng chỗ đó nha." },
    };
  }
  if (substantive && words <= 10 && DISPUTE.test(n))
    return {
      kind: "reply",
      keep: true,
      why: "meta:dispute",
      reply: {
        text: `Dạ, bạn thấy chỗ nào chưa đúng ạ? Bạn chỉ giúp Lomi nha, Lomi xem lại liền 🙏${/📚|Nguồn/.test(last.content) || (last as { src?: string }).src ? " Phần Lomi vừa nói là theo nguồn y khoa đã ghi kèm — nếu thông tin bạn biết khác, hỏi thêm bác sĩ / dược sĩ là chắc nhất." : ""}`,
      },
    };

  // 3d) Lomi vừa hỏi thăm ("…thế nào?", "có gì vui không?") mà đáp "cũng được", "bình thường" → đáp nhẹ, mời kể (không coi là "ừ").
  if (SOSO.test(n) && ((c.asked && VR(/(thế nào|sao rồi|ổn không|có gì vui|ra sao|khoẻ không|khỏe không)/i).test(last.content)) || VR(/^(chào|hello|hi|alo|lomi vẫn ở đây|hihi chào)/i).test(last.content.trim())))
    return { kind: "reply", keep: false, talk: true, why: "answer:soso", reply: { text: "Vậy là cũng ổn ổn ha 😊 Có chuyện gì vui hay mệt thì kể Lomi nghe nha, Lomi rảnh nè." } };

  // 3e) Thêm giới hạn khoảng cách / "gần thôi" cho lần tìm chỗ vừa rồi.
  const kmM = n.match(KM);
  const lastSearch = (last as { search?: unknown }).search;
  // 20/10: câu tự nêu LOẠI CHỖ / MÓN mới ("Tìm quán cà phê có ưu đãi") là một lần tìm MỚI, không phải thêm điều kiện
  // cho lần tìm trước — trước đây bị gộp vào lần tìm "đi chơi" (không có loại) nên ra đủ thứ: mỹ phẩm, tư vấn BĐS…
  const freshKind = !!detectSearch(q)?.kind || !!detectDish(q);
  if ((kmM || VN(/^(gần|gần gần|gần thôi|gần gần thôi|gần nhà thôi|gần nhà|ở gần thôi)( (thôi|nha|nhé|nhe|thì|ạ|à|a|e|em|lomi))*$/).test(n)) && words <= 9 && (last.dish || lastSearch) && !freshKind) {
    const maxKm = kmM ? Math.max(0.3, Math.min(50, parseFloat(kmM[1].replace(",", ".")))) : undefined;
    if (last.dish && c.dish) return { kind: "refine", why: "place:km", dish: c.dish.id, want: { near: true, maxKm } };
    return { kind: "research", why: "place:km", want: { near: true, maxKm } };
  }

  // 3e') "có ưu đãi không?" ngay sau một danh sách chỗ (không theo món) → tìm lại đúng loại chỗ đó, chỉ lấy chỗ đang có ưu đãi.
  if (lastSearch && !last.dish && !freshKind && words <= 7 && OFFER.test(n) && !VN(/\b(làm sao|cách|thế nào|là gì|nhận|mã pin|dùng sao|đăng)\b/).test(n))
    return { kind: "research", why: "place:offer", want: { offer: true } };

  // 3g) Hỏi lại chính CHỮ Lomi vừa dùng ("Sao vui á?" sau "Hôm nay có gì vui không nè?") → Lomi giải thích là hỏi thăm thôi.
  const echo = n.match(VN(/^(?:sao|sao lại|tại sao|vì sao|là sao) ((?:\S+ )??\S+?)(?: (?:ạ|à|a|ah|vậy|thế|hả|ha|ta|nhỉ|nè|lomi|e|em))*$/));
  if (echo && words <= 5 && ` ${normalizeVi(last.content)} `.includes(` ${echo[1]} `) && c.asked)
    return { kind: "reply", keep: false, talk: true, why: "echo:ask", reply: { text: "Hihi, ý Lomi chỉ là hỏi thăm bạn thôi á 😄 Hôm nay của bạn thế nào, có chuyện gì muốn kể không nè?" } };

  // 3h) "Thiệt không?", "thật hả?" ngay sau một câu Lomi KHẲNG ĐỊNH (không phải câu hỏi) → xác nhận, mời hỏi tiếp.
  if (VN(/^(thiệt|thật|thiệt không|thật không|thật hả|thiệt hả|thật à|thiệt à|thật sao|thiệt hông|thật hông|thật luôn|thiệt luôn|thật không vậy|thiệt hông ta)( (không|ko|k|hông|hong|hả|ha|à|a|vậy|ta|lomi|e|em|nè))*$/).test(n) && !c.asked)
    return { kind: "reply", keep: true, why: "really", reply: { text: "Thiệt mà 😄 Lomi nói đúng những gì Lomi biết đó. Bạn còn thắc mắc chỗ nào thì hỏi tiếp nha." } };

  // 3f) Xin mẹo theo chuyện đang nói.
  if (TIP.test(n) && words <= 9 && !detectTarot(q)) {
    const med = (last as { med?: { id: string; aspect?: string } }).med;
    // 19/10 (audit sức khoẻ): lượt trước chỉ kể MỘT triệu chứng (chưa đáp từ thẻ nào) → mẹo là cho chính triệu chứng đó,
    //   không phải bệnh mà bảng kiêng cữ cũ gán ("nghẹt mũi" → khoá "cảm cúm" → trước đây viết lại thành "cảm cúm nên làm gì" → bài Cúm).
    const sx = (last as { sx?: string[] }).sx;
    const sxL = !med && sx?.length === 1 ? symptomLabel(sx[0]) : undefined;
    const hl = sxL && findMedTopicId(sxL) ? sxL : (last.health as { label?: string } | undefined)?.label;
    // Câu xin mẹo TỰ NÊU chủ đề ("mẹo cho đỡ nghẹt mũi") → không phải câu nối: để lớp sức khoẻ đọc đúng chủ đề người dùng gõ.
    const named = findMedTopicId(q);
    if (c.topic === "health" && hl && (!named || named === findMedTopicId(hl))) {
      // Vừa đưa cách xử trí rồi mà hỏi "còn mẹo nào khác" → không đọc lại; mời xem phần khác (có nguồn).
      if (med?.aspect === "care" || VN(/\b(còn|khác|nữa)\b/).test(n))
        return { kind: "reply", keep: true, why: "tip:health-more", reply: { text: `Những cách xử trí có nguồn cho **${hl}** Lomi đưa hết ở trên rồi nè — Lomi không tự thêm mẹo ngoài nguồn. Bạn muốn xem thêm phần nào?`, quick: [`${cap(hl)} kiêng gì?`, "Khi nào cần đi khám?", "Nguyên nhân"] } };
      return { kind: "rewrite", why: "tip:health", q: `${hl} nên làm gì` };
    }
    if (c.topic === "biz") return { kind: "rewrite", why: "tip:biz", q: "có mẹo gì không" };
    if (!c.topic || c.topic === "talk" || c.topic === "app")
      return {
        kind: "reply",
        keep: false,
        why: "tip:menu",
        reply: { text: TIP_MENU.text, quick: TIP_MENU.quick },
      };
  }

  // 4) Câu trả lời cho câu Lomi vừa hỏi.
  const softTopic = !c.topic || c.topic === "talk" || c.topic === "food" || c.topic === "app";
  if (yes || wrong || no) {
    // "không phải" → bạn đang sửa Lomi, không phải mở chủ đề mới.
    if (wrong && (softTopic || c.topic === "health" || (c.topic === "heart" && c.asked !== "yesno")))
      return { kind: "reply", keep: false, why: "answer:wrong", reply: { text: c.topic === "health" ? "Dạ, vậy là Lomi hiểu chưa đúng rồi 🙏 Bạn kể lại giúp Lomi là đang bị sao nha." : "Dạ, vậy là Lomi hiểu chưa đúng rồi 🙏 Ý bạn là sao, nói Lomi nghe thêm chút nha." } };
    // Lomi hỏi "A hay B?" mà bạn đáp "ok gợi ý đi", "ừ tìm quán đi" → câu đáp đã nói rõ chọn cái nào → làm đúng cái đó.
    if (yes && c.asked === "choice" && last.quick?.length) {
      const pickChip = VN(/\b(gợi ý|món)\b/).test(n) ? last.quick.find((x) => VR(/(ăn gì|món|gợi ý)/i).test(x)) : VN(/\b(tìm|quán|gần)\b/).test(n) ? last.quick.find((x) => VR(/(tìm|quán)/i).test(x)) : undefined;
      if (pickChip) return { kind: "rewrite", why: "answer:choice-named", q: expandTeen(pickChip) };
    }
    // Lomi hỏi "A, B hay C?" mà bạn đáp "ừ" → chưa biết chọn cái nào, hỏi lại đúng phần đó (không tự chọn giùm).
    if (yes && c.asked === "choice" && (last.quick?.length ?? 0) >= 2 && (softTopic || c.topic === "health" || c.topic === "heart"))
      return { kind: "reply", keep: true, why: "answer:choice", reply: { text: "Bạn chọn giúp Lomi một cái nha 😄", quick: last.quick } };
    // Lomi hỏi mở ("Bạn muốn hỏi chuyện gì về sức khoẻ nè?") mà bạn đáp "ừ" → mời nói cụ thể, kèm ví dụ đúng chủ đề.
    if (yes && c.asked === "open" && c.topic !== "tarot" && c.topic !== "biz") {
      const eg =
        c.topic === "health" ? "Bạn cứ kể triệu chứng hoặc điều muốn hỏi nha — ví dụ “mình bị đau đầu 2 ngày rồi” hay “uống cà phê nhiều có sao không”."
        : c.topic === "heart" ? "Bạn cứ kể nha, Lomi nghe nè 💚 Chuyện gì đang làm bạn bận lòng nhất?"
        : c.topic === "food" ? "Bạn nói tên món đang thèm, hoặc để Lomi gợi ý vài món nha 😋"
        : "Bạn nói cụ thể hơn một chút giúp Lomi nha 😊";
      return { kind: "reply", keep: true, why: "answer:open", reply: { text: eg, quick: c.topic === "food" ? ["Hôm nay ăn gì? 🎲"] : undefined } };
    }
    // Vừa than đói / đang nói chuyện ăn mà đáp "ừ", "đúng rồi" (Lomi không mời việc gì cụ thể) → gợi ý món luôn.
    //  (lời mời gợi ý món mà không kèm nút bấm cũng vậy)
    if (yes && c.foodTalk && !last.dishAsk && (!isOffer(last.content) || !last.quick?.length) && softTopic) return { kind: "rewrite", why: "answer:food-yes", q: "hôm nay ăn gì" };
    // Đồng ý với LỜI MỜI có nút gợi ý ("Để Lomi gợi ý vài món nha?" → "ừ", "đúng rồi", "ok gợi ý đi") → làm đúng việc của nút đó.
    if (yes && isOffer(last.content) && last.quick?.length && c.asked !== "choice" && softTopic && !last.dishAsk) {
      const qk = last.quick;
      const chip =
        (VR(/(rút|bói)/i).test(last.content) && qk.find((x) => VR(/bói/i).test(x))) ||
        (VR(/(gợi ý|món)/i).test(last.content) && qk.find((x) => VR(/(ăn gì|món)/i).test(x))) ||
        (VR(/(quán|tìm)/i).test(last.content) && qk.find((x) => VR(/(tìm|ăn gì)/i).test(x))) ||
        qk[0];
      return { kind: "rewrite", why: "answer:offer-yes", q: expandTeen(chip) };
    }
    // Lomi vừa đưa vài món để chọn mà đáp "ok luôn" → chưa biết món nào, mời chọn một (không tự chọn giùm).
    if (yes && last.dishAsk && (last.quick?.length ?? 0) >= 2)
      return { kind: "reply", keep: true, why: "answer:dish-pick", reply: { text: "Bạn chọn giúp Lomi một món nha 😄 Bấm bên dưới, Lomi tìm quán có món đó liền.", quick: last.quick } };
    // Từ chối LỜI MỜI ("Muốn Lomi gợi ý món hay tìm quán không?" → "thôi khỏi cũng được"), hoặc nói rõ "khỏi / để lúc khác" → đáp nhẹ nhàng.
    if (no && softTopic && (isOffer(last.content) || VN(/\b(khỏi|lúc khác|để sau)\b/).test(n)))
      return { kind: "reply", keep: false, why: "answer:decline-offer", reply: { text: "Okie, không sao nè 😊 Khi nào cần cứ gọi Lomi nha!" } };
    // Lomi chỉ gợi ý (không hỏi) mà bạn đáp "không" → từ chối nhẹ nhàng, không phải "Lomi hiểu nhầm".
    if (no && !c.asked && softTopic && (last.quick?.length || c.foodTalk))
      return { kind: "reply", keep: false, why: "answer:decline", reply: { text: "Okie, không sao nè 😊 Khi nào cần cứ gọi Lomi nha!" } };
    // Lomi hỏi có/không (không phải lời mời làm việc gì — lời mời đã có chỗ xử lý riêng) mà bạn đáp "không":
    //  • câu hỏi là Lomi ĐOÁN ("Bạn đói hả?") → Lomi đoán sai, hỏi lại bạn cần gì;
    //  • câu hỏi thăm ("Hôm qua ngủ có đủ giấc không nè?") → "không" là câu trả lời, Lomi hỏi nối chứ không khép lại.
    if (no && c.asked === "yesno" && softTopic && !isOffer(last.content)) {
      const lastQ = normalizeVi((last.content.match(/[^.!?\n]*\?/g) ?? [""]).pop() ?? "");
      return VN(/ (hả|ha|à|a|hở|ho|đúng không|phải không)$/).test(` ${lastQ}`)
        ? { kind: "reply", keep: false, why: "answer:no-guess", reply: { text: "À, vậy là Lomi đoán sai rồi 😅 Vậy bạn đang cần gì nè?" } }
        : { kind: "reply", keep: false, talk: true, why: "answer:no", reply: { text: "Vậy hả 😮 Sao vậy bạn, kể Lomi nghe với." } };
    }
    // Đồng ý / từ chối kèm vài chữ mà chưa có chỗ xử lý ở trên → đổi thành "ừ" / "không" để lớp lời mời phía sau làm đúng việc.
    if (loose) return { kind: "rewrite", why: `answer:loose-${loose}`, q: loose === "yes" ? "ừ" : "không" };
    return null;
  }

  // 4a') 21/10 (audit): vừa trả lời một câu về app mà hỏi "có chắc tính năng đó có thật không" → xác nhận theo đúng câu vừa trả lời.
  if (c.topic === "app" && last.faqId && words <= 12 && VN(/\b(có chắc|chắc không|chắc chưa|có thật không|thật không|có thật|có đúng không|đúng không vậy)\b/).test(` ${n} `)) {
    const f = faqById(last.faqId);
    if (f)
      return {
        kind: "reply",
        keep: true,
        why: "app:sure",
        reply: { text: `Dạ có thật nha 😊 Lomi chỉ trả lời theo những tính năng đang có trong Liên Minh Liên Doanh — phần “${f.q.vi.replace(/\?$/, "")}” ở trên là đúng cách app đang chạy. Bạn làm theo mà không thấy nút hay bị báo lỗi thì nói Lomi đang kẹt ở bước nào, Lomi chỉ tiếp nha.`, quick: last.quick },
      };
  }
  // 4b) Vừa trả lời một câu về app, giờ hỏi trống "cái đó thì sao?" → không đoán sang câu khác, hỏi đúng ý còn thiếu.
  if (c.topic === "app" && last.faqId && REF_THING.test(n)) {
    const f = faqById(last.faqId);
    if (f) return { kind: "reply", keep: true, why: "ref:app", reply: { text: `Bạn muốn hỏi thêm ý nào về “${f.q.vi.replace(/\?$/, "")}” nè? Bạn nói rõ hơn một chút, hoặc chọn câu gần đúng bên dưới nha.`, quick: last.quick } };
  }
  // 4c) Lomi đang nghe kể, bạn đáp một mẩu ngắn có chữ "quán / gần…" ("quán gần nhà") → là KỂ TIẾP, không phải nhờ tìm quán.
  if (c.talk && !ask && words <= 6 && !detectDish(q) && detectSearch(q) && isTalkCont(raw) && !VN(/\b(tìm|kiếm|gợi ý|giới thiệu|chỉ|muốn|cần|thêm|thèm|cho (mình|a|anh|em|e|tôi|tui))\b/).test(n)) {
    const r = talkContinue(raw, c.talk, /🥺|😔|😣/u.test(last.content), last.content);
    return { kind: "reply", keep: false, talk: true, why: "talk:cont", reply: { text: r.text } };
  }

  // 4d) "còn cái đó thì sao?", "cái đó á?" khi đang nói về MỘT MÓN hay MỘT BỆNH → nói rõ Lomi hiểu "cái đó" là gì rồi hỏi đúng phần
  //     còn thiếu, giữ nguyên mạch (trước đây câu này bị coi như câu trả lời khẩu vị và Lomi tự đi tìm quán).
  if (REF_THING.test(n)) {
    const hl = (last.health as { label?: string; diet?: string } | undefined)?.label;
    if (c.topic === "health" && hl)
      return { kind: "reply", keep: true, why: "ref:health-subject", reply: { text: `Bạn đang hỏi tiếp về **${hl}** đúng không? Bạn muốn biết ${hl} là gì, nên xử lý thế nào hay ăn uống cần kiêng gì?`, quick: [`${cap(hl)} là gì?`, `${cap(hl)} nên làm gì?`, `${cap(hl)} kiêng gì?`, "Khi nào cần đi khám?"] } };
    if (c.dish && (c.topic === "food" || !c.topic || c.topic === "talk")) {
      const d = c.dish.label.toLowerCase();
      return last.dishPick
        ? { kind: "reply", keep: true, why: "ref:dish-pick", reply: { text: `Ý bạn là **${d}** đúng không 😄 Bạn chọn một kiểu giúp Lomi, hoặc để Lomi tìm quán ${d} luôn nha.`, quick: [`🔎 Tìm quán ${d}`] } }
        : { kind: "reply", keep: true, why: "ref:dish", reply: { text: `Bạn đang hỏi về **${d}** đúng không? Bạn muốn Lomi tìm quán ${d}, hay đổi sang món khác?`, quick: [`Tìm quán ${d} gần đây`, "🎲 Món khác"] } };
    }
  }

  // 5) Đang nói chuyện ăn uống / tìm quán.
  if (softTopic && !FLOW_CMD.test(n) && !/^(🎲|🔁|🔎)/u.test(raw.trim())) {
    const own = detectDish(q);
    const otherKind = otherPlace(q); // câu tự nói rõ loại chỗ khác ("spa nào gần đây") thì không ghép món cũ vào
    // "quán nào ổn?" (đang nói cà phê) → quán cà phê. Chỉ khi ngoài cụm hỏi chỗ ra câu không còn ý riêng nào.
    if (c.dish && !own && !otherKind && PLACE_Q.test(n) && words <= 7 && !n.replace(PLACE_Q, " ").split(" ").some((w) => w && !PLACE_FILL.has(w)))
      return { kind: "rewrite", why: "food:place", q: `tìm quán ${c.dish.label}` };
    // Đang nói về một món mà hỏi "loại nào ngon?", "kiểu nào?", "vị nào?" → vẫn là món đó: hỏi khẩu vị cho đúng món.
    if (c.dish && !own && !otherKind && words <= 6 && VN(/\b(loại|kiểu|vị|size|cỡ|phần|topping|nhân) (nào|gì)\b/).test(n)) return { kind: "rewrite", why: "food:kind", q: `${c.dish.label} loại nào ngon` };
    // Vừa than đói, giờ chỉ gõ tên món ("pizza") → tìm quán món đó.
    if (own && words <= 3 && c.foodTalk && !last.dishAsk && !last.dishPick && !ask) return { kind: "rewrite", why: "food:dish", q: `tìm quán ${dishLabel(own)}` };
    // Vừa có kết quả tìm quán cho một món, giờ thêm điều kiện ("gần mình", "có ưu đãi không?", "yên tĩnh").
    if (last.dish && c.dish && !own && !otherKind && words <= 6 && !detectTarot(q)) {
      const near = NEAR.test(n);
      const offer = OFFER.test(n);
      // "có ưu đãi không?", "gần mình thôi" — hỏi về chính mấy quán vừa tìm, không phải hỏi cách dùng app ("làm sao nhận ưu đãi").
      if ((near || offer) && !VN(/\b(làm sao|cách|thế nào|là gì|ở đâu xem|nhận|mã pin|dùng sao)\b/).test(n)) return { kind: "refine", why: "food:refine", dish: c.dish.id, want: { near, offer } };
      // Mẩu ngắn không phải hỏi, không phải xã giao / cảm thán / kể về mình → là điều kiện mô tả quán.
      // Riêng khi Lomi vừa hỏi khẩu vị (dishPick) thì đó là câu trả lời khẩu vị — AiAssistant tìm quán món đó như cũ.
      const late = senseLate(expandTeen(raw))?.intent;
      if (!ask && !last.dishPick && words <= 4 && !isAppish(q) && !socialIntent(q) && !senseState(raw) && (!late || late === "clarify")) {
        const text = raw.normalize("NFC").toLowerCase().replace(/[.!…,?]+/g, " ").replace(WANT_DROP, " ").replace(/\s+/g, " ").trim();
        if (text.length >= 3) return { kind: "refine", why: "food:refine-text", dish: c.dish.id, want: { text } };
      }
    }
  }

  // 6) Đang nói chuyện sức khoẻ, hỏi "cái đó thì sao?" mà không rõ ý → hỏi đúng phần còn thiếu, giữ nguyên mạch.
  if (c.topic === "health" && c.symptoms.length && !last.hsub && REF_THING.test(n))
    return {
      kind: "reply",
      keep: true,
      why: "ref:health",
      reply: { text: "Bạn đang hỏi thêm về triệu chứng vừa kể đúng không? Bạn muốn biết **nên làm gì cho đỡ**, hay **khi nào cần đi khám**?", quick: ["Nên làm gì cho đỡ?", "Khi nào cần đi khám?"] },
    };
  return null;
}
