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
  earlier: { topic: Topic; label: string; resume: string }[];
};

export type Want = { text?: string; offer?: boolean; near?: boolean; /** giới hạn khoảng cách (km) người dùng nói: "5km thôi", "dưới 2 cây số" */ maxKm?: number };
export type Resolved =
  | { kind: "rewrite"; q: string; why: string }
  | { kind: "refine"; dish: string; want: Want; why: string }
  /** Thêm điều kiện cho lần tìm CHỖ vừa rồi (không theo món): "giới hạn 5km thôi" sau "lựa quán cho a đi". */
  | { kind: "research"; want: Want; why: string }
  /** keep = giữ nguyên cờ ngữ cảnh của tin trước (đang tâm sự, đang nói sức khoẻ, trải bài vừa rút…). */
  | { kind: "reply"; reply: ChatReply; keep: boolean; talk?: boolean; why: string };

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
  if (/ hay (?!khong|chua|sao|la khong)/.test(n)) return "choice";
  const yesNoEnd = / (khong|ko|chua|ha|ho|a|nha|nhe|chu|dung khong|phai khong|duoc khong|chua nhi|khong ne|khong nhi) $/.test(n);
  if (!yesNoEnd && / (gi|nao|sao|dau|may|bao nhieu|bao lau|the nao|ai|khi nao) /.test(n)) return "open";
  return "yesno";
}

/** Tin của Lomi có phải LỜI MỜI làm một việc ("Muốn Lomi tìm quán không?") để "ừ" = làm luôn gợi ý đầu. */
export function isOffer(content: string): boolean {
  // 09/10: lời mời không có dấu hỏi ("Để Lomi kiếm quán cà phê xinh cho bạn nha ☕", "Lomi tìm quán cho bạn được nè!") cũng là lời mời.
  if (/(để (Lomi|em) (kiếm|tìm)|(Lomi|em) tìm quán[^.!?]* được)/i.test(content)) return true;
  return /\?/.test(content) && /(muốn|thử|để Lomi|để em|rút|bói|chọn giùm|chỉ cách|xem thử)/i.test(content);
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
  const hungry = lastUser ? /^state:(hungry|thirsty)$/.test(senseState(lastUser.raw ?? lastUser.content)?.intent ?? "") : false;
  c.foodTalk = (!c.topic || c.topic === "food" || c.topic === "talk") && (!!last.dishAsk || hungry || !!last.quick?.some((x) => /ăn gì|uống gì|quán ăn/i.test(x)));
  if (c.foodTalk && !c.topic) c.topic = "food";
  // Chủ đề đã nói trước đó (khác chủ đề hiện tại), mới nhất trước.
  for (const m of as.slice(0, -1).reverse()) {
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
    c.earlier.push({ topic: t, ...e });
    if (c.earlier.length >= 2) break;
  }
  return c;
}

// ── Cụm THAM CHIẾU: (từ nối)* + từ chỉ định + ("thì sao")? — đọc theo cấu trúc, không theo danh sách câu ──
const LEAD = "(?:(?:vay|the|roi|con|ua|a|o|ma|y|la) )*";
const TAIL = "(?: (?:thi sao|sao|the nao|thi the nao|nhu nao|thi lam sao))?(?: (?:a|ha|nhi|ta|vay|ne|do))*";
const REF_THING = new RegExp(`^${LEAD}(?:cai|chuyen|dieu|viec|mon|cho) (?:do|kia|nay|ay)${TAIL}$`);
const REF_PERSON = new RegExp(`^${LEAD}(?:nguoi (?:do|ay|kia|ta)|ho|anh ay|co ay|chi ay|ban ay|nguoi yeu|ny|crush)${TAIL}$`);
const REF_EARLIER = new RegExp(`^${LEAD}(?:(?:cai|chuyen|dieu|viec) )?(?:luc nay|hoi nay|vua roi|vua nay|ban nay|truoc do|luc truoc)(?: (?:do|ay|kia))?${TAIL}$`);
// Xác nhận / bác bỏ (rộng hơn isAffirm / isDecline một chút: "đúng rồi", "chuẩn", "không phải").
const YES = /^(dung|dung roi|dung vay|chuan|chuan roi|phai|phai roi|chinh xac|u dung|u dung roi|co chu)( (a|nha|nhe|ne|do|lomi|em|e))*$/;
const WRONG = /^(khong phai|ko phai|k phai|hong phai|sai roi|khong dung|khong phai vay|nham roi|khong phai the)( (dau|ma|nha|a|lomi|em|e))*$/;
// Câu hỏi về CHỖ mà không nói chỗ gì ("quán nào ổn?", "ở đâu ngon?") — cần ngữ cảnh mới biết quán gì.
const PLACE_Q = /\b(quan nao|quan gi|cho nao|o dau|di dau|dia chi nao|co quan nao|biet quan nao|quan o dau)\b/;
const NEAR = /\b(gan|gan day|gan minh|gan nha|gan cho minh|quanh day|gan nhat)\b/;
const OFFER = /\b(uu dai|khuyen mai|giam gia|sale|deal|voucher)\b/;
// Động tác liên lạc trong chuyện tình cảm ("còn nên nhắn không?", "gọi luôn được không?").
const CONTACT = /\b(nhan|nhan tin|goi|goi dien|lien lac|inbox|rep|bat chuyen|chu dong|mo loi)\b/;
// Từ đệm bỏ khỏi điều kiện tìm quán ("yên tĩnh chút nha" → "yên tĩnh").
const WANT_DROP = /(^|\s)(thôi|nha|nhé|nhen|á|ạ|đi|chút|xíu|tí|hơn|một chút|quán|chỗ|nào|kiểu|loại|cái|cho|mình|a|anh|em|e|thích|muốn|cần|có|là)(?=\s|$)/giu;

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
  if (DECLINE_HEAD.has(w[0]) || /^(de luc khac|de sau|thoi khoi|khoi di|luc khac|lat nua|de lat)\b/.test(n)) return /\b(khoi|luc khac|de sau|khong|ko|thoi|lat nua|chut nua|ti nua|de lat|bua khac|hom khac)\b/.test(n) ? "no" : null;
  if (AGREE_HEAD.has(w[0]) || /^cung duoc\b/.test(n)) return "yes";
  return null;
}
// Lomi vừa hỏi thăm ("Hôm nay của bạn thế nào?") mà người dùng đáp "cũng được", "bình thường" → đáp nhẹ, mời kể.
// ("ok", "được" đứng một mình KHÔNG tính — đó là "ừ")
const SOSO = /^(cung (duoc|on|binh thuong|tam tam|vay|thuong thuong|on on)|on|on on|binh thuong|tam on|tam tam|thuong thuong|vay vay|nhu moi ngay|chua biet nua|tam duoc|on ap)( (a|ah|thoi|nha|ne|lomi|e|em|lam|ma))*$/;
// 10/10 — XIN MẸO theo chuyện đang nói ("E biết mẹo gì k?", "còn mẹo nào khác không", "có cách nào khác không").
const TIP = /\b(meo|bi kip|kinh nghiem gi|con cach nao|cach nao khac|cach khac|co cach gi|tips?)\b/;
// 10/10 — KHOẢNG CÁCH cho lần tìm chỗ vừa rồi ("giới hạn 5km thôi", "trong vòng 3km", "dưới 2 cây số").
const KM = /\b(\d+(?:[.,]\d+)?) ?(?:km|ki lo met|kilomet|kilo met|cay so|cs)\b/;

// Lệnh của mạch chọn món sẵn có ("món khác", "quán khác") — AiAssistant tự xử lý, không coi là điều kiện tìm quán.
const FLOW_CMD = /\b(mon khac|quan khac|doi mon|doi quan|cho khac|do uong khac|goi y khac|mon nao khac)\b/;
const PLACE_FILL = new Set("on ngon ok oke duoc dep tot re xin hay nhat vay ta nhi ha e em lomi co khong ko thi biet chi gioi thieu goi y a anh cho minh di day gio nay ne nha".split(" "));
/** Câu tự nêu một LOẠI CHỖ khác món đang nói ("quán ăn", "spa", "homestay"…) → không phải câu nối về món đó. */
export function otherPlace(q: string): boolean {
  return /\b(quan an|nha hang|spa|massage|goi dau|nail|toc|salon|barber|gym|yoga|phong tap|homestay|khach san|hotel|bar|pub|shop|cua hang|tiem)\b/.test(normalizeVi(q));
}
const mine = (p: string) => p.replace(/ bạn$/, " mình");

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
    if (e) return { kind: "reply", keep: false, why: "ref:earlier", reply: { text: `Lúc nãy mình đang nói về **${e.label}** — bạn muốn nói tiếp chuyện đó hả?`, quick: [e.resume] } };
    if (c.topic && c.topic !== "talk") return { kind: "reply", keep: true, why: "ref:earlier-same", reply: { text: "Ý bạn là chuyện mình vừa nói ở trên hả? Bạn hỏi cụ thể hơn một chút giúp Lomi nha 😊" } };
    return { kind: "reply", keep: true, why: "ref:earlier-none", reply: { text: "Lúc nãy là chuyện nào ta 😅 Bạn nhắc lại giúp Lomi vài chữ thôi cũng được nha." } };
  }
  // Người dùng vừa sửa lại ("ý a là…", "không, a hỏi…") → phần sau là ý MỚI, không ghép ngữ cảnh cũ vào nữa.
  if (opts.correcting) return null;

  // 2) Chuyện tình cảm đang nói về MỘT NGƯỜI: câu nối thiếu chủ thể → điền đúng người đó.
  if (c.topic === "heart" && c.person) {
    const p = c.person;
    const named = /\b(nguoi ay|nguoi do|anh ay|co ay|chi ay|crush|nguoi yeu|ny|ban trai|ban gai|vo|chong)\b/.test(n);
    if (REF_PERSON.test(n))
      return {
        kind: "reply",
        keep: true,
        why: "ref:person",
        reply: { text: `Bạn đang hỏi về ${p} đúng không? Bạn muốn biết ${p} đang nghĩ gì, hay bạn nên làm gì tiếp theo?`, quick: [`${cap(mine(p))} đang nghĩ gì về mình?`, "Mình nên làm gì bây giờ?"] },
      };
    if (CONTACT.test(n) && ask && !named && words <= 9)
      return { kind: "rewrite", why: "heart:contact", q: /\b(nhan gi|noi gi|mo loi sao|bat chuyen sao|nhan sao|nhan the nao|nhan nhu the nao|noi sao|noi the nao|viet gi|viet sao|cau nao)\b/.test(n) ? `nên nhắn gì cho ${mine(p)}` : `có nên nhắn cho ${mine(p)} không` };
  }

  // 11/10: trải bài rút cách đây vài lượt (đã nói sang chuyện khác) vẫn là trải bài đang nói tới khi câu nhắc rõ "lá / bài"
  //        ("Nếu lá ngược thì sao?" sau hai câu kể thêm về người ấy) — trước đây Lomi đáp "chưa bắt chắc ý bạn".
  const tWord = /\b(la|bai|la bai|trai bai|tarot)\b/.test(n);
  const rd = c.reading ?? (tWord ? c.readingBack : undefined);
  // 3a) Hỏi riêng MỘT lá theo thứ tự ("lá thứ 3 nói gì?", "lá đầu tiên là sao?", "lá cuối nghĩa gì?") → giải đúng lá đó theo vị trí của nó.
  const nth = rd && words <= 10 && !detectTarot(q) ? n.match(/\bla (?:bai )?(?:(?:thu|so) (\d+|nhat|hai|ba|tu|bon|nam|sau|bay|tam|chin|muoi)|(dau tien|dau|cuoi cung|cuoi|giua))\b/) : null;
  if (rd && nth) {
    const ORD: Record<string, number> = { nhat: 1, hai: 2, ba: 3, tu: 4, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10 };
    const i = nth[1] ? (ORD[nth[1]] ?? Number(nth[1])) - 1 : /^dau/.test(nth[2]) ? 0 : /^cuoi/.test(nth[2]) ? rd.cards.length - 1 : Math.floor((rd.cards.length - 1) / 2);
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
  if (rd && /\b(nguoc|xuoi)\b/.test(n) && words <= 10 && !detectTarot(q)) {
    const r = rd;
    const cards = r.cards.slice(0, 3).map((d) => {
      const k = tarotCard(d.id);
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
  if (c.reading && words <= 9 && !detectTarot(q) && (/\b(tom lai|noi gon|ket luan|chot lai|rot cuoc|noi chung la sao|vay la sao|vay la (co|khong|nen|duoc|on|tot|xau|chua)|vay (la )?(co|khong) (ha|a|nhi)|cai nao (tot|hon|on)|ben nao (tot|hon|on)|nghieng ve)\b/.test(n) || (c.reading.kind === "choice" && /\b(chon|nen chon|vay chon|theo) \S+/.test(n) && ask)))
    return { kind: "reply", keep: true, why: "tarot:recap", reply: { text: readingRecap(c.reading, /nói gọn lại là vầy|vừa tóm lại đó/.test(last.content)), quick: ["Rút thêm", "Bói lại"] } };
  if (rd && (c.reading || tWord) && words <= 9 && !detectTarot(q) && /\b(nghia la|y nghia|nghia gi|nghia sao|la sao|giai thich|noi ro|noi them|noi ky|hieu sao|noi ve gi|noi gi|la gi)\b/.test(n) && (/\b(la|bai|no|cai nay|cai do|them|hon)\b/.test(n) || words <= 4)) {
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

  // 3d) Lomi vừa hỏi thăm ("…thế nào?", "có gì vui không?") mà đáp "cũng được", "bình thường" → đáp nhẹ, mời kể (không coi là "ừ").
  if (SOSO.test(n) && ((c.asked && /(thế nào|sao rồi|ổn không|có gì vui|ra sao|khoẻ không|khỏe không)/i.test(last.content)) || /^(chào|hello|hi|alo|lomi vẫn ở đây|hihi chào)/i.test(last.content.trim())))
    return { kind: "reply", keep: false, talk: true, why: "answer:soso", reply: { text: "Vậy là cũng ổn ổn ha 😊 Có chuyện gì vui hay mệt thì kể Lomi nghe nha, Lomi rảnh nè." } };

  // 3e) Thêm giới hạn khoảng cách / "gần thôi" cho lần tìm chỗ vừa rồi.
  const kmM = n.match(KM);
  const lastSearch = (last as { search?: unknown }).search;
  if ((kmM || /^(gan|gan gan|gan thoi|gan gan thoi|gan nha thoi|gan nha|o gan thoi)( (thoi|nha|nhe|thi|a|e|em|lomi))*$/.test(n)) && words <= 9 && (last.dish || lastSearch)) {
    const maxKm = kmM ? Math.max(0.3, Math.min(50, parseFloat(kmM[1].replace(",", ".")))) : undefined;
    if (last.dish && c.dish) return { kind: "refine", why: "place:km", dish: c.dish.id, want: { near: true, maxKm } };
    return { kind: "research", why: "place:km", want: { near: true, maxKm } };
  }

  // 3e') "có ưu đãi không?" ngay sau một danh sách chỗ (không theo món) → tìm lại đúng loại chỗ đó, chỉ lấy chỗ đang có ưu đãi.
  if (lastSearch && !last.dish && words <= 7 && OFFER.test(n) && !/\b(lam sao|cach|the nao|la gi|nhan|ma pin|dung sao|dang)\b/.test(n))
    return { kind: "research", why: "place:offer", want: { offer: true } };

  // 3g) Hỏi lại chính CHỮ Lomi vừa dùng ("Sao vui á?" sau "Hôm nay có gì vui không nè?") → Lomi giải thích là hỏi thăm thôi.
  const echo = n.match(/^(?:sao|sao lai|tai sao|vi sao|la sao) ((?:\S+ )??\S+?)(?: (?:a|ah|vay|the|ha|ta|nhi|ne|lomi|e|em))*$/);
  if (echo && words <= 5 && ` ${normalizeVi(last.content)} `.includes(` ${echo[1]} `) && c.asked)
    return { kind: "reply", keep: false, talk: true, why: "echo:ask", reply: { text: "Hihi, ý Lomi chỉ là hỏi thăm bạn thôi á 😄 Hôm nay của bạn thế nào, có chuyện gì muốn kể không nè?" } };

  // 3h) "Thiệt không?", "thật hả?" ngay sau một câu Lomi KHẲNG ĐỊNH (không phải câu hỏi) → xác nhận, mời hỏi tiếp.
  if (/^(thiet|that|thiet khong|that khong|that ha|thiet ha|that a|thiet a|that sao|thiet hong|that hong|that luon|thiet luon|that khong vay|thiet hong ta)( (khong|ko|k|hong|ha|a|vay|ta|lomi|e|em|ne))*$/.test(n) && !c.asked)
    return { kind: "reply", keep: true, why: "really", reply: { text: "Thiệt mà 😄 Lomi nói đúng những gì Lomi biết đó. Bạn còn thắc mắc chỗ nào thì hỏi tiếp nha." } };

  // 3f) Xin mẹo theo chuyện đang nói.
  if (TIP.test(n) && words <= 9 && !detectTarot(q)) {
    const hl = (last.health as { label?: string } | undefined)?.label;
    const med = (last as { med?: { id: string; aspect?: string } }).med;
    if (c.topic === "health" && hl) {
      // Vừa đưa cách xử trí rồi mà hỏi "còn mẹo nào khác" → không đọc lại; mời xem phần khác (có nguồn).
      if (med?.aspect === "care" || /\b(con|khac|nua)\b/.test(n))
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
      const pickChip = /\b(goi y|mon)\b/.test(n) ? last.quick.find((x) => /(ăn gì|món|gợi ý)/i.test(x)) : /\b(tim|quan|gan)\b/.test(n) ? last.quick.find((x) => /(tìm|quán)/i.test(x)) : undefined;
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
        (/(rút|bói)/i.test(last.content) && qk.find((x) => /bói/i.test(x))) ||
        (/(gợi ý|món)/i.test(last.content) && qk.find((x) => /(ăn gì|món)/i.test(x))) ||
        (/(quán|tìm)/i.test(last.content) && qk.find((x) => /(tìm|ăn gì)/i.test(x))) ||
        qk[0];
      return { kind: "rewrite", why: "answer:offer-yes", q: expandTeen(chip) };
    }
    // Lomi vừa đưa vài món để chọn mà đáp "ok luôn" → chưa biết món nào, mời chọn một (không tự chọn giùm).
    if (yes && last.dishAsk && (last.quick?.length ?? 0) >= 2)
      return { kind: "reply", keep: true, why: "answer:dish-pick", reply: { text: "Bạn chọn giúp Lomi một món nha 😄 Bấm bên dưới, Lomi tìm quán có món đó liền.", quick: last.quick } };
    // Từ chối LỜI MỜI ("Muốn Lomi gợi ý món hay tìm quán không?" → "thôi khỏi cũng được"), hoặc nói rõ "khỏi / để lúc khác" → đáp nhẹ nhàng.
    if (no && softTopic && (isOffer(last.content) || /\b(khoi|luc khac|de sau)\b/.test(n)))
      return { kind: "reply", keep: false, why: "answer:decline-offer", reply: { text: "Okie, không sao nè 😊 Khi nào cần cứ gọi Lomi nha!" } };
    // Lomi chỉ gợi ý (không hỏi) mà bạn đáp "không" → từ chối nhẹ nhàng, không phải "Lomi hiểu nhầm".
    if (no && !c.asked && softTopic && (last.quick?.length || c.foodTalk))
      return { kind: "reply", keep: false, why: "answer:decline", reply: { text: "Okie, không sao nè 😊 Khi nào cần cứ gọi Lomi nha!" } };
    // Lomi hỏi có/không (không phải lời mời làm việc gì — lời mời đã có chỗ xử lý riêng) mà bạn đáp "không":
    //  • câu hỏi là Lomi ĐOÁN ("Bạn đói hả?") → Lomi đoán sai, hỏi lại bạn cần gì;
    //  • câu hỏi thăm ("Hôm qua ngủ có đủ giấc không nè?") → "không" là câu trả lời, Lomi hỏi nối chứ không khép lại.
    if (no && c.asked === "yesno" && softTopic && !isOffer(last.content)) {
      const lastQ = normalizeVi((last.content.match(/[^.!?\n]*\?/g) ?? [""]).pop() ?? "");
      return / (ha|a|ho|dung khong|phai khong)$/.test(` ${lastQ}`)
        ? { kind: "reply", keep: false, why: "answer:no-guess", reply: { text: "À, vậy là Lomi đoán sai rồi 😅 Vậy bạn đang cần gì nè?" } }
        : { kind: "reply", keep: false, talk: true, why: "answer:no", reply: { text: "Vậy hả 😮 Sao vậy bạn, kể Lomi nghe với." } };
    }
    // Đồng ý / từ chối kèm vài chữ mà chưa có chỗ xử lý ở trên → đổi thành "ừ" / "không" để lớp lời mời phía sau làm đúng việc.
    if (loose) return { kind: "rewrite", why: `answer:loose-${loose}`, q: loose === "yes" ? "ừ" : "không" };
    return null;
  }

  // 4b) Vừa trả lời một câu về app, giờ hỏi trống "cái đó thì sao?" → không đoán sang câu khác, hỏi đúng ý còn thiếu.
  if (c.topic === "app" && last.faqId && REF_THING.test(n)) {
    const f = faqById(last.faqId);
    if (f) return { kind: "reply", keep: true, why: "ref:app", reply: { text: `Bạn muốn hỏi thêm ý nào về “${f.q.vi.replace(/\?$/, "")}” nè? Bạn nói rõ hơn một chút, hoặc chọn câu gần đúng bên dưới nha.`, quick: last.quick } };
  }
  // 4c) Lomi đang nghe kể, bạn đáp một mẩu ngắn có chữ "quán / gần…" ("quán gần nhà") → là KỂ TIẾP, không phải nhờ tìm quán.
  if (c.talk && !ask && words <= 6 && !detectDish(q) && detectSearch(q) && isTalkCont(raw) && !/\b(tim|kiem|goi y|gioi thieu|chi|muon|can|them|cho (minh|a|anh|em|e|toi|tui))\b/.test(n)) {
    const r = talkContinue(raw, c.talk, /🥺|😔|😣/u.test(last.content), last.content);
    return { kind: "reply", keep: false, talk: true, why: "talk:cont", reply: { text: r.text } };
  }

  // 4d) "còn cái đó thì sao?", "cái đó á?" khi đang nói về MỘT MÓN hay MỘT BỆNH → nói rõ Lomi hiểu "cái đó" là gì rồi hỏi đúng phần
  //     còn thiếu, giữ nguyên mạch (trước đây câu này bị coi như câu trả lời khẩu vị và Lomi tự đi tìm quán).
  if (REF_THING.test(n)) {
    const hl = (last.health as { label?: string; diet?: string } | undefined)?.label;
    if (c.topic === "health" && hl)
      return { kind: "reply", keep: true, why: "ref:health-subject", reply: { text: `Bạn đang hỏi tiếp về **${hl}** đúng không? Bạn muốn biết ${hl} là gì, nên xử lý thế nào hay ăn uống cần kiêng gì?`, quick: [`${cap(hl)} là gì?`, `${cap(hl)} nên làm gì?`, `${cap(hl)} kiêng gì?`] } };
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
    if (c.dish && !own && !otherKind && words <= 6 && /\b(loai|kieu|vi|size|co|phan|topping|nhan) (nao|gi)\b/.test(n)) return { kind: "rewrite", why: "food:kind", q: `${c.dish.label} loại nào ngon` };
    // Vừa than đói, giờ chỉ gõ tên món ("pizza") → tìm quán món đó.
    if (own && words <= 3 && c.foodTalk && !last.dishAsk && !last.dishPick && !ask) return { kind: "rewrite", why: "food:dish", q: `tìm quán ${dishLabel(own)}` };
    // Vừa có kết quả tìm quán cho một món, giờ thêm điều kiện ("gần mình", "có ưu đãi không?", "yên tĩnh").
    if (last.dish && c.dish && !own && !otherKind && words <= 6 && !detectTarot(q)) {
      const near = NEAR.test(n);
      const offer = OFFER.test(n);
      // "có ưu đãi không?", "gần mình thôi" — hỏi về chính mấy quán vừa tìm, không phải hỏi cách dùng app ("làm sao nhận ưu đãi").
      if ((near || offer) && !/\b(lam sao|cach|the nao|la gi|o dau xem|nhan|ma pin|dung sao)\b/.test(n)) return { kind: "refine", why: "food:refine", dish: c.dish.id, want: { near, offer } };
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
