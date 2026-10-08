// ─────────────────────────────────────────────────────────────────────────────
// LOMI ĐÁP THEO KHUNG CÂU (09/10) — chạy trên máy, không gọi AI.
//
// lib/lomiParse đọc câu thành KHUNG (ai – phủ định – thời gian – loại câu – vị ngữ). File này quyết định:
//   • khung nào thì Lomi đáp THEO CẤU TRÚC (ghép câu đáp từ các phần của khung, không phải câu mẫu cho từng câu),
//   • khung nào thì nhường cho các lớp chuyên môn sẵn có (sức khoẻ, tâm sự, tìm quán, hỏi về app, bói bài…).
//
// Đáp theo khung khi cấu trúc cho biết điều mà lớp từ khoá không đọc được:
//   chào / chúc / cảm ơn / xin phép đi (kèm buổi, dịp bất kỳ)        "Chào e bữa tối nhé", "chúc e cuối tuần vui vẻ"
//   hỏi thăm chính Lomi                                              "tối nay e rảnh không", "e đang làm gì đó"
//   chủ ngữ là người / con vật / đồ vật khác                         "con chó nhà a dễ thương cực", "xe a hư rồi"
//   có phủ định                                                      "a chưa đói", "a không buồn đâu", "a không thèm pizza"
//   chuyện đã qua / dự định sắp tới                                  "tối qua a ngủ ngon lắm", "mai a đi Đà Nẵng chơi"
//   đang ở đâu / đang làm gì                                         "a đang ngồi ở quán cà phê", "a đang chờ bạn"
// Câu khẳng định về cảm xúc, sức khoẻ, món ăn, cách dùng app… vẫn do các lớp cũ trả lời như trước.
// Câu đáp viết với "bạn" / "Lomi"; speak() (lib/lomiAddress) đổi thành anh / chị / em lúc hiển thị.
// ─────────────────────────────────────────────────────────────────────────────
import { expandTeen, isAppish, type ChatReply } from "@/lib/lomiChat";
import type { Addr } from "@/lib/lomiAddress";
import { YOU_MARK, type Frame, type SubjectKind } from "@/lib/lomiParse";
import { detectDish, detectSearch } from "@/lib/lomiSearch";
import { senseState } from "@/lib/lomiSense";
import { analyzeBody } from "@/lib/lomiSymptoms";
import { healthSubjectOf } from "@/lib/lomiHealthTopic";
import { healthFact } from "@/lib/lomiHealthFacts";
import { dietOf } from "@/lib/lomiDiet";
import { contextReply } from "@/lib/lomiContext";
import { heartStart } from "@/lib/lomiHeart";
import { relationReply } from "@/lib/lomiRelation";
import { capabilityAsk, foodChoice } from "@/lib/lomiIntent";
import { understand } from "@/lib/lomiUnderstand";
import { detectTarot, isTarotAbilityAsk } from "@/lib/tarot";
import { looksLikeBizQuestion } from "@/lib/bizAdvisor";

export type FrameCtx = {
  /** full = bối cảnh trung tính; speech = đang ở mạch khác (sức khoẻ, hỏi app) → chỉ nhận lời chào / chúc / cảm ơn / xin phép + hỏi thăm Lomi;
   *  heart = đang tâm sự → chỉ nhận lời chúc / xin phép đi, "không muốn nói nữa", và tin người thân / thú cưng ốm, mất. */
  mode: "full" | "speech" | "heart";
  /** Câu có nội dung sức khoẻ (triệu chứng, tên bệnh) → lớp sức khoẻ trả lời. */
  health?: boolean;
  /** Câu nêu một TRIỆU CHỨNG cụ thể có trong từ điển (sốt, đau đầu…). */
  symptom?: boolean;
  /** Thư viện tâm sự nhận câu này với chủ đề gì ("ev:traffic", "work", "sad"…). */
  heart?: string;
  /** Câu có từ y tế (thuốc, bác sĩ, khám, mổ…) dù không khớp triệu chứng nào → đừng đáp kiểu chuyện thường ngày. */
  medical?: boolean;
  /** Câu nói về app / đang hỏi bói / chuyện kinh doanh / tìm quán / chọn món → lớp tương ứng trả lời. */
  appish?: boolean;
  tarot?: boolean;
  biz?: boolean;
  search?: boolean;
  food?: boolean;
  /** Câu rủ mà lớp cũ đã có câu đáp riêng (rủ chơi game → Quẹt…). */
  legacyInvite?: ChatReply | null;
};
export type FrameReply = ChatReply & {
  intent: string;
  /** Mở / giữ mạch "nghe kể". */
  talk?: boolean;
  /** Mở mạch sức khoẻ ("hôm nay a không khoẻ"). */
  openHealth?: boolean;
  /** Không đáp, mà đọc câu như câu chuẩn này cho các lớp sau ("a muốn đi đâu đó chơi" → tìm chỗ chơi). */
  redirect?: string;
  /** Đang nói về ai / cái gì ("mẹ anh", "con mèo nhà anh") — để câu sau lược chủ ngữ ("bị cảm thôi") vẫn hiểu là nói về người đó. */
  about?: { text: string; kind: SubjectKind };
  /** Đang tâm sự mà câu này vẫn thuộc mạch đó (tin buồn về người thân) → router giữ nguyên mạch tâm sự. */
  keepHeart?: boolean;
};

const MIN_CONF = 0.75;
/** Cách gọi người dùng khi tự đổi dấu YOU_MARK (không qua speak()). */
const youOf = (addr?: Addr | null) => (addr === "anh" || addr === "chị" || addr === "em" ? addr : "bạn");
let lastPick = "";
function pick(arr: string[]): string {
  const pool = arr.length > 1 ? arr.filter((x) => x !== lastPick) : arr;
  lastPick = pool[Math.floor(Math.random() * pool.length)];
  return lastPick;
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const join = (...xs: (string | undefined | false)[]) => xs.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
const PART_EMO: Record<string, string> = { "sáng": "☀️", "trưa": "🌤️", "chiều": "🌿", "tối": "🌙", "đêm": "🌙" };

/** "bữa tối" / "ban tối" / "tối" → "buổi tối"; dịp khác giữ nguyên ("cuối tuần", "tối thứ sáu"). */
function occasionOf(f: Frame): string {
  const l = (f.time?.label ?? "").replace(/^(bữa|ban) /, "buổi ");
  if (/^(sáng|trưa|chiều|tối|đêm|khuya)$/.test(l)) return `buổi ${l}`;
  return l;
}
/** Nhãn thời gian đứng đầu câu đáp: "Tối qua", "Mai", "Cuối tuần này". */
const timeCap = (f: Frame) => (f.time?.label ? cap(f.time.label) : "");
/** Nhắc lại việc vừa nói: động từ + bổ ngữ, tối đa 7 tiếng. keepQual = giữ nhận xét cuối câu ("…về trễ"). */
function echo(f: Frame, keepQual = true): string {
  const p = f.pred!;
  return join(p.head, keepQual ? p.obj : (p.objCore ?? p.obj))
    .split(" ")
    .slice(0, 7)
    .join(" ");
}

/** Tên món để nói lại: ưu tiên đúng chữ người dùng gõ ("kem", "nhậu") khi đó là cả phần bổ ngữ, không thì tên nhóm món. */
function dishWord(f: Frame, groupName: string): string {
  const p = f.pred;
  const said = (p?.objCore ?? p?.obj ?? "").trim().replace(/^(ăn|uống|đi ăn|đi uống)\s+/u, "").replace(/\s+hơn$/u, "");
  if (said && said.split(" ").length <= 2 && detectDish(said)) return said.toLowerCase();
  if (p && /(^| )nhậu( |$)/.test(`${p.head} ${p.obj}`)) return "nhậu";
  return groupName.split(/[,(]/)[0].trim().toLowerCase();
}

// ── Lời nói có khuôn ─────────────────────────────────────────────────────────
function greet(f: Frame): FrameReply {
  const part = f.time?.part;
  const occ = f.time?.occasion;
  const head = part ? `Chào buổi ${part === "đêm" ? "tối" : part} nha ${PART_EMO[part]}` : "Chào bạn nha 👋";
  const extra = f.wish ? `Cảm ơn bạn, chúc bạn ${join(occasionOf(f), f.wish.good)} luôn nè!` : occ && !/^(cả|một) /.test(occ) ? `${cap(occ)} vui vẻ nha!` : "";
  const ask =
    part === "sáng" || occ === "ngày mới" || occ === "đầu tuần"
      ? pick(["Hôm nay bạn có dự định gì không nè?", "Hôm nay của bạn bắt đầu thế nào rồi?"])
      : part === "trưa"
        ? "Bạn ăn trưa chưa đó?"
        : occ && /cuối tuần|thứ bảy|chủ nhật|ngày nghỉ|kỳ nghỉ/.test(occ)
          ? "Bạn có dự định gì chưa?"
          : pick(["Hôm nay của bạn thế nào rồi?", "Hôm nay của bạn có gì vui không nè?"]);
  return { intent: "frame:greet", text: join(head, extra, ask) };
}

function wish(f: Frame): FrameReply {
  const w = f.wish!;
  const good = w.good;
  const sleep = /ngủ ngon|ngon giấc|mơ đẹp/.test(good);
  if (w.to === "self") {
    // "chúc a ngủ ngon đi", "e chúc a may mắn đi" → Lomi chúc lại đúng điều đó.
    if (sleep) return { intent: "frame:wish_me", text: "Chúc bạn ngủ thật ngon, sáng mai thức dậy thật khoẻ nha 😴💚" };
    return { intent: "frame:wish_me", text: `Chúc bạn ${join(occasionOf(f), good || "mọi điều suôn sẻ")} nha 🍀 Lomi luôn cổ vũ bạn!` };
  }
  if (sleep) return { intent: "frame:wish", text: "Bạn cũng ngủ thật ngon nha 😴💚 Mai gặp lại Lomi nè!" };
  if (f.time?.occasion === "sinh nhật" && !good) return { intent: "frame:wish", text: "Hihi cảm ơn bạn 🥰 Lomi là robot nên không có sinh nhật đâu, nhưng được chúc là vui cả ngày luôn!" };
  const back = join(occasionOf(f), good || "vui vẻ");
  return { intent: "frame:wish", text: pick([`Cảm ơn bạn nha 🥰 Chúc bạn ${back} luôn nè!`, `Ui cảm ơn bạn 💚 Chúc lại bạn ${back} nha!`]) };
}

function thanks(f: Frame): FrameReply {
  const back = f.wish ? ` Chúc bạn ${join(occasionOf(f), f.wish.good)} nha!` : "";
  return { intent: "frame:thanks", text: pick(["Không có gì nè 😊 Cần gì cứ gọi Lomi nha!", "Lomi vui vì giúp được bạn 💚"]) + back };
}

function leave(f: Frame): FrameReply {
  if (f.leave === "brb") return { intent: "frame:leave", text: pick(["Dạ, Lomi chờ nè 😊 Bạn cứ thong thả nha.", "Okie, bạn đi đi nha — Lomi vẫn ở đây 🌿"]) };
  const p = f.pred!;
  const act = echo(f);
  if (/ngủ/.test(act)) return { intent: "frame:leave", text: "Dạ, bạn ngủ ngon nha 🌙 Mai gặp lại Lomi nè!" };
  const tail = p.cls === "duty" ? "Chúc bạn mọi việc suôn sẻ 💪" : /(^| )(ăn|nhậu|uống)( |$)/.test(act) ? "Ăn ngon miệng nha 😋" : "Lát rảnh ghé nói chuyện với Lomi tiếp nè!";
  return { intent: "frame:leave", text: `Dạ, bạn ${act} đi nha 😊 ${tail}` };
}

function invite(f: Frame, c: FrameCtx): FrameReply {
  if (c.legacyInvite) return { intent: "frame:invite", text: c.legacyInvite.text, quick: c.legacyInvite.quick };
  const d = detectDish(f.raw);
  if (d) {
    const label = dishWord(f, d.name);
    return { intent: "frame:invite", text: `Lomi chỉ ở trong app nên không đi cùng được 😆 Hay để Lomi tìm quán ${label} ngon cho bạn nha?`, quick: [`Tìm quán ${label} gần đây`] };
  }
  const when = f.time?.label ? `${timeCap(f)} bạn` : "Bạn";
  return {
    intent: "frame:invite",
    text: pick([
      `Hihi Lomi đi không được rồi 🙈 Lomi chỉ ở trong app thôi. ${when} ${echo(f)} vui nha, có gì kể Lomi nghe với!`,
      `Nghe thích ghê 😆 Tiếc là Lomi chỉ ở trong app. Muốn rủ thêm người đi cùng thì đăng ở Cộng đồng (/cong-dong) nha!`,
    ]),
  };
}

// ── Hỏi thăm chính Lomi ──────────────────────────────────────────────────────
function askLomi(f: Frame): FrameReply | null {
  const p = f.pred;
  const when = f.time?.label ? `${timeCap(f)} bạn` : "Bạn";
  if (!p) {
    // "hôm nay e thế nào", "e sao rồi"
    if (f.ask === "how") return { intent: "frame:ask_lomi", text: "Lomi vẫn ổn, pin đầy nè 🔋😄 Còn bạn hôm nay thế nào?" };
    // "e đang ở đâu vậy"
    if (f.ask === "where") return { intent: "frame:ask_lomi", text: "Lomi ở ngay trong app nè, bạn mở lên lúc nào là có Lomi lúc đó 😄 Còn bạn đang ở đâu đó?" };
    return null;
  }
  if (p.kind === "state") {
    if (p.cls === "free") return { intent: "frame:ask_lomi", text: `Lomi lúc nào cũng rảnh cho bạn nè 😄 ${when} cần Lomi giúp gì, hay muốn tám chuyện chút?` };
    if (p.cls === "busy") return { intent: "frame:ask_lomi", text: "Lomi không bận đâu, lúc nào cũng sẵn sàng nghe bạn nè 😄 Bạn cần gì nè?" };
    if (p.cls === "well") return { intent: "frame:ask_lomi", text: "Lomi khoẻ re nè 💪 Pin đầy, tinh thần phơi phới! Còn bạn hôm nay thế nào?" };
    // "hôm nay e vui không" — hỏi Lomi có vui không thì đừng đáp "không vui… mà vui lắm".
    if (p.cls === "feel" && p.val > 0) return { intent: "frame:ask_lomi", text: `Được nói chuyện với bạn là Lomi ${p.head} rồi nè 😄 Còn bạn hôm nay có ${p.head} không?` };
    if (p.cls === "feel" || p.cls === "need" || p.cls === "ill")
      return { intent: "frame:ask_lomi", text: `Lomi là robot nên không ${p.head} như người đâu 😄 Nhưng được bạn hỏi thăm là Lomi vui lắm! Còn bạn thì sao, có ${p.head} không?` };
    // "e ngủ ngon không" — hỏi thăm, không phải lời chúc ngủ ngon.
    if (/^ngủ/.test(p.head)) return { intent: "frame:ask_lomi", text: "Lomi là robot nên không cần ngủ nè 😆 Còn bạn thì sao, dạo này ngủ có ngon không?" };
    return null;
  }
  // "e có lạnh không", "e có nóng không"
  if (p.kind === "quality" && p.cls === "weather" && f.ask === "yesno") return { intent: "frame:ask_lomi", text: `Lomi là robot nên không biết ${p.head} là gì luôn 😄 Còn bạn thì sao, có ${p.head} không?` };
  // "e có thích mèo không" — hỏi sở thích của Lomi
  if (p.kind === "desire" && /^(thích|mê|khoái|ưa|ghiền|ghét)$/.test(p.head) && f.ask === "yesno" && p.obj && !/lomi/i.test(p.obj) && !p.obj.includes(YOU_MARK))
    return { intent: "frame:ask_lomi", text: `Lomi là robot nên chưa biết ${p.head} là thế nào nữa 😄 Còn bạn thì sao, bạn có ${p.head} ${p.obj} không?` };
  // "e biết nấu ăn không", "e biết bơi không" — việc đời thường Lomi không làm được (hỏi Lomi làm được gì trong app thì lớp khác trả lời)
  if (p.kind === "cognition" && p.head === "biết" && f.ask === "yesno" && /^(nấu|bơi|hát|lái|chạy|đá|chơi|vẽ|nhảy|bay|ăn|uống|ngủ|yêu|khóc|cười)( |$)/.test(p.obj))
    return { intent: "frame:ask_lomi", text: `Lomi chưa biết ${p.obj} đâu 😅 Lomi chỉ rành mấy việc trong app thôi: gợi ý quán, bói bài, tâm sự, hỏi đáp sức khoẻ. Còn bạn thì sao, ${p.obj} giỏi không?` };
  // "e đang làm gì đó / vậy"
  if (p.kind === "activity" && f.ask === "what" && /^làm/.test(p.head)) return { intent: "frame:ask_lomi", text: pick(["Lomi đang ngồi chờ bạn tới nói chuyện nè 😄 Còn bạn đang làm gì đó?", "Lomi đang “trực” app nè 🤖 Còn bạn thì sao, đang làm gì vậy?"]) };
  // "e thích ăn gì", "e thích gì nhất"
  if (p.kind === "desire" && (f.ask === "what" || f.ask === "which")) {
    if (/(^| )(ăn|uống)( |$)/.test(p.obj)) return { intent: "frame:ask_lomi", text: `Lomi là robot nên chỉ “ăn” pin thôi 🔋😆 Còn bạn ${p.head} ${p.obj.replace(/\s*(nhất|vậy)$/u, "")} nhất?` };
    return { intent: "frame:ask_lomi", text: `Lomi ${p.head} nhất là được nói chuyện với bạn nè 😄 Còn bạn ${p.head} ${p.obj.replace(/\s*(nhất|vậy)$/u, "")}?` };
  }
  return null;
}

// Chủ đề của thư viện tâm sự thuộc loại "chuyện giữa mình với người đó".
const REL_THEMES = new Set("cheat breakup ex cold fight jealous longdist family friends boss work toxic marriage inlaw situationship stayorgo lies spark parentsban gossip bullied love".split(" "));

// ── Kể chuyện người / con vật / đồ vật khác ───────────────────────────────────
function third(f: Frame, c: FrameCtx): FrameReply | null {
  const p = f.pred!;
  const subj = cap(f.subjectText ?? "");
  if (!subj) return null;
  const what = p.kind === "quality" ? p.head : echo(f);
  const person = f.subject === "third";
  const pet = f.subject === "pet";
  if (p.cls === "death" && (person || pet))
    return { intent: "frame:third_loss", talk: true, keepHeart: true, text: `${subj} ${p.recent ? "mới " : ""}${p.head} hả 🥺 Lomi chia buồn với bạn nha. ${pet ? "Bé ở với bạn lâu chưa?" : "Bạn đang thấy thế nào, kể Lomi nghe với."}` };
  if (p.cls === "ill") {
    // Có triệu chứng cụ thể thì lớp sức khoẻ trả lời (router đổi chủ ngữ cho đúng); ở đây là "đang ốm", "bị bệnh" chung chung.
    if (c.symptom) return null;
    // "bị cảm thôi", "hơi sốt nhẹ" — nói là nhẹ thì mừng cùng, không hỏi dồn "có nặng không".
    if (f.degree === "low" || f.toks.some((t) => t.t === "thôi" || t.t === "nhẹ")) return { intent: "frame:third_ill", talk: true, keepHeart: true, text: `Chỉ ${what} thôi thì đỡ lo rồi 😊 Mong ${subj.charAt(0).toLowerCase() + subj.slice(1)} mau khoẻ nha!` };
    return { intent: "frame:third_ill", talk: true, keepHeart: true, text: `${subj} ${what} hả 🥺 Thương ghê. ${pet ? "Bé bị sao vậy, bạn đưa đi thú y chưa?" : "Có nặng không bạn, đã đi khám chưa?"}` };
  }
  if (p.val < 0) {
    // Chuyện đời sống thư viện tâm sự đã có lời hỏi han riêng (cúp điện, kẹt xe…) hoặc chuyện với sếp / người yêu → để lớp đó đáp.
    //  • chuyện đời sống (cúp điện, kẹt xe…) chỉ áp cho đồ vật / nơi chốn — với người thì mấy bài đó lạc đề ("vợ a nấu ăn dở" ≠ quán dở);
    //  • chuyện tình cảm / công việc với vợ chồng, người yêu, sếp → thư viện tâm sự (khi nó nhận đúng loại chuyện đó).
    if (c.heart && (person || pet ? (f.subjectCls === "partner" || f.subjectCls === "boss") && (c.heart === "rel" || REL_THEMES.has(c.heart)) : c.heart.startsWith("ev:"))) return null;
    // Chê một nét của người đó ("lười lắm", "nấu ăn dở lắm") → hỏi chuyện; gặp chuyện không may ("mới chia tay") → hỏi han.
    if (person && (p.kind === "quality" || !!p.qual)) return { intent: "frame:third_neg", talk: true, text: `${subj} ${what} hả 😅 Chuyện sao vậy bạn, kể Lomi nghe với.` };
    if (person) return { intent: "frame:third_neg", talk: true, text: `${subj} ${what} hả 🥺 ${pick(["Nghe mà thương. Giờ sao rồi bạn?", "Chuyện sao vậy bạn, kể Lomi nghe với."])}` };
    if (pet) return { intent: "frame:third_neg", talk: true, text: `${subj} ${what} hả 🥺 Tội bé ghê. Giờ sao rồi bạn?` };
    return { intent: "frame:third_neg", talk: true, text: `${subj} ${what} hả 😣 ${p.kind === "quality" ? "Nghe là thấy bực rồi ha." : "Xui ghê ha."} Giờ bạn tính sao?` };
  }
  if (p.val > 0) {
    if (pet) return { intent: "frame:third_pos", talk: true, text: `${subj} ${what} vậy luôn hả 😍 Nghe là muốn cưng liền! Bé tên gì vậy bạn?` };
    if (person) return { intent: "frame:third_pos", talk: true, text: `${subj} ${what} vậy hả 😄 ${pick(["Nghe mà thấy quý ghê. Kể Lomi nghe thêm đi!", "Thích ghê á. Bạn chắc tự hào lắm ha?"])}` };
    if (f.subject === "place") return { intent: "frame:third_pos", talk: true, text: `${subj} ${what} vậy hả 😄 Chỗ nào vậy bạn, kể Lomi nghe với!` };
    return { intent: "frame:third_pos", talk: true, text: `${subj} ${what} thiệt hả 😄 ${pick(["Bạn mới sắm hả?", "Nghe thích ghê!"])}` };
  }
  // "con a đói bụng", "con mèo nhà a khát nước" — nhu cầu của người / con vật đó (không phải Lomi, không phải người nói).
  if ((person || pet) && p.kind === "state" && p.cls === "need")
    return { intent: "frame:third_need", talk: true, text: `${subj} ${what} hả 😄 Vậy bạn lo cho ${pet || /^(Con|Bé|Cháu|Nhóc)/.test(subj) ? "bé" : "người nhà"} trước đi nha, lát rảnh nói chuyện tiếp với Lomi!` };
  // Không khen không chê: kể một việc của người đó ("mẹ a mới lên chơi", "con a tuần sau thi").
  if ((person || pet) && (p.kind === "activity" || p.kind === "motion" || (p.kind === "cognition" && !!p.recent)) && (p.recent || p.ongoing || p.planned || f.time?.explicit))
    return { intent: "frame:third_event", talk: true, text: !p.known ? `${cap(join(f.time?.explicit ? timeCap(f) : "", f.time?.explicit ? subj.charAt(0).toLowerCase() + subj.slice(1) : subj, p.recent ? "mới" : p.ongoing ? "đang" : "", what))} hả? Rồi sao nữa bạn, kể Lomi nghe với.` : `${join(f.time?.explicit ? timeCap(f) : "", f.time?.explicit ? subj.charAt(0).toLowerCase() + subj.slice(1) : subj, p.recent ? "mới" : p.ongoing ? "đang" : "", what)} hả 😄 ${pick(["Rồi sao nữa, kể Lomi nghe với!", "Nghe vui đó!"])}` };
  return null;
}

// ── Người nói + phủ định ─────────────────────────────────────────────────────
function selfNeg(f: Frame, c: FrameCtx): FrameReply | null {
  const p = f.pred!;
  const no = f.negWord ?? "không";
  const No = cap(no);
  if (p.kind === "state") {
    // "không khoẻ", "không ổn" → mở chuyện sức khoẻ; "không vui" → để thư viện tâm sự đáp (đó là buồn).
    if (p.cls === "well") return { intent: "frame:neg_well", openHealth: true, text: `Bạn thấy ${no} ${p.head} sao vậy 🥺 Kể Lomi nghe đang bị gì nha — khó chịu ở đâu, bị lâu chưa?` };
    if (p.cls === "ill") return { intent: "frame:neg_ill", text: `${No} ${p.head} là mừng rồi nè 😊 Nhớ giữ sức khoẻ nha bạn!` };
    if (p.cls === "feel") {
      if (p.val < 0) return null; // "không vui", "không thoải mái"
      return f.degree === "low"
        ? { intent: "frame:neg_feel", text: `${No} ${p.head} lắm là mừng rồi 😊 Mà có gì thì cứ nói Lomi nghe nha.` }
        : { intent: "frame:neg_feel", text: `${No} ${p.head} là tốt rồi nè 😊 ${pick(["Vậy hôm nay của bạn thế nào?", "Có gì vui kể Lomi nghe với!"])}` };
    }
    if (p.cls === "need") {
      const tail = /đói/.test(p.head) ? "Lomi gợi ý món cho!" : /khát/.test(p.head) ? "Lomi tìm quán nước cho!" : "nhớ đừng thức khuya quá nha 🌙";
      return { intent: "frame:neg_need", text: `${No} ${p.head} thì cứ từ từ nha 😄 Khi nào ${p.head} thì nói Lomi, ${tail}` };
    }
    if (p.cls === "free") return { intent: "frame:neg_free", text: "Bận quá hả 😅 Vậy bạn cứ lo việc đi nha, khi nào rảnh ghé nói chuyện với Lomi nè!" };
    if (p.cls === "busy") return { intent: "frame:neg_busy", text: "Không bận là dễ thở rồi ha 😄 Bạn muốn tám chuyện, bói một lá hay tìm quán ngồi chơi?", quick: ["Bói một lá cho hôm nay", "Tìm quán cà phê gần đây"] };
    return null;
  }
  if (p.kind === "desire") {
    // "a không muốn nói nữa", "thôi không kể nữa đâu" → tôn trọng, dừng lại.
    if (/^(nói|kể|nhắc|tâm sự|bàn|nghĩ)( |$)/.test(p.obj)) return { intent: "frame:stop", text: "Dạ, không sao đâu 💚 Mình dừng ở đây nha. Khi nào bạn muốn nói tiếp thì Lomi vẫn ở đây." };
    if (/(^| )(lomi)( |$)/i.test(p.obj) || !p.obj) return null;
    // "không ghét cà phê" là không chê, không phải không thích.
    if (p.head === "ghét") return { intent: "frame:neg_desire", text: `Không ghét ${p.obj} là được rồi 😄 Vậy cũng thích chút chút hả?` };
    // "chưa muốn ăn", "không muốn uống gì" (không nói món nào) = chưa đói / chưa khát.
    if (/^(ăn|uống)( gì| uống)?$/.test(p.obj)) return { intent: "frame:neg_need", text: `${No} ${p.head} ${p.obj.split(" ")[0]} thì cứ từ từ nha 😄 Khi nào thấy ${/^ăn/.test(p.obj) ? "đói" : "khát"} thì nói Lomi, Lomi gợi ý cho!` };
    const d = detectDish(f.raw);
    if (d) {
      const label = dishWord(f, d.name);
      return { intent: "frame:neg_desire", text: `${No} ${p.head} ${label} hả 😄 Vậy bạn muốn đổi món khác không, Lomi gợi ý cho!`, quick: ["Hôm nay ăn gì? 🎲"] };
    }
    const v = p.obj.match(/^(ăn|uống)( |$)/)?.[1];
    if (v) return { intent: "frame:neg_desire", text: `À, bạn ${no} ${p.head} ${p.obj} ha 😄 Vậy bạn thích ${v} gì hơn nè?` };
    if (/^ngủ/.test(p.obj)) return { intent: "frame:neg_desire", talk: true, text: `${No} ${p.head} ngủ hả 🌙 Vậy tám với Lomi chút nha — bạn đang nghĩ gì đó?` };
    return { intent: "frame:neg_desire", talk: true, text: `${No} ${p.head} ${p.obj} hả? Sao vậy bạn, kể Lomi nghe với.` };
  }
  if (p.kind === "cognition" && /^(biết|chắc|rõ)$/.test(p.head)) {
    // "không biết ăn gì" → lớp chọn món; "không biết làm gì / đi đâu" → gợi ý chỗ chơi; "không biết nữa" → cứ từ từ.
    if (/(^| )(ăn|uống)( |$)/.test(p.obj)) return null;
    if (/(làm gì|đi đâu|chơi gì|chơi đâu)/.test(p.obj)) {
      const t = f.time?.label ? `${timeCap(f)} ` : "";
      return {
        intent: "frame:undecided",
        text: `${t ? `${t}chưa` : "Chưa"} biết ${p.obj.replace(/\s*nữa$/u, "")} hả 😄 Để Lomi gợi ý vài chỗ đi chơi, hay bạn muốn tìm quán ngồi chill?`,
        quick: ["Cuối tuần đi đâu chơi?", "Tìm quán cà phê gần đây"],
      };
    }
    if (!p.obj || /^nữa$/.test(p.obj)) return { intent: "frame:unsure", text: "Chưa chắc cũng không sao nè 😊 Bạn cứ từ từ nghĩ, cần Lomi gợi ý gì thì nói nha." };
    return null;
  }
  if (p.kind === "activity" || p.kind === "motion") {
    if (c.food || c.search || p.cls === "seek") return null;
    return { intent: "frame:neg_act", talk: true, text: `${join(f.time?.explicit ? timeCap(f) : "", f.time?.explicit ? no : No, echo(f).replace(/\s*(gì|đâu|nữa)$/u, ""))} hả 😮 Sao vậy bạn?` };
  }
  return null;
}

// ── Người nói: đang ở đâu / chuyện đã qua / dự định / đang làm gì ─────────────
function selfLocation(f: Frame): FrameReply {
  const place = f.pred!.place || f.pred!.obj;
  // Đà Lạt là "sân nhà" của app — lớp cũ có câu đáp riêng kèm gợi ý quán.
  const old = /đà lạt/i.test(place) ? senseState(f.raw) : null;
  if (old?.intent === "state:place") return { intent: "frame:location", talk: true, text: old.text, quick: old.quick };
  const future = f.time?.explicit && f.time.rel === "future";
  if (/^nhà( |$)/.test(place))
    return { intent: "frame:location", talk: true, text: future ? `${timeCap(f)} ở nhà thôi hả 😄 Ở nhà nghỉ ngơi cũng thích mà. Bạn định làm gì cho vui?` : "Ở nhà hả 😄 Đang nghỉ ngơi hay làm gì đó bạn?" };
  if (/^(công ty|cơ quan|văn phòng|chỗ làm)/.test(place)) return { intent: "frame:location", talk: true, text: "Đang ở chỗ làm hả 💪 Hôm nay công việc ổn không bạn?" };
  if (/^(quán|tiệm|nhà hàng)/.test(place)) return { intent: "frame:location", talk: true, text: `Đang ngồi ${place} hả 😄 Quán có chill không, bạn đi với ai đó?` };
  return { intent: "frame:location", talk: true, text: `${future ? `${timeCap(f)} ở` : "Đang ở"} ${place} hả 😄 Bạn tới đó chơi hay có việc vậy?` };
}

/** Động từ lạ (chỉ đoán theo vị trí): nhắc lại + hỏi nối, không khen không chia buồn — vì chưa biết đó là chuyện vui hay buồn. */
const neutral = (lead: string, f: Frame): FrameReply => ({ intent: "frame:echo", talk: true, text: `${cap(join(lead, echo(f)))} hả? Rồi sao nữa bạn, kể Lomi nghe với.` });

function selfPast(f: Frame): FrameReply {
  const p = f.pred!;
  const timed = !!f.time?.explicit && f.time.rel === "past";
  // "a ăn rồi", "a thi xong rồi" — việc đã xong, không có "mới / vừa": nhắc lại kèm "rồi".
  if (!timed && !p.recent && p.done) {
    const e = `${cap(echo(f))}${/xong$/.test(echo(f)) ? "" : " rồi"}`;
    if (!p.known) return { intent: "frame:echo", talk: true, text: `${e} hả? Rồi sao nữa bạn, kể Lomi nghe với.` };
    if (/^(ăn|uống)/.test(p.head)) return { intent: "frame:done", talk: true, text: `${e} hả 😋 ${p.obj ? "Ngon không bạn?" : "Ăn món gì vậy bạn?"}` };
    return { intent: "frame:done", talk: true, text: `${e} hả 😄 ${p.cls === "duty" ? "Vất vả rồi nè, nghỉ ngơi chút đi nha!" : "Vậy là xong một việc rồi ha!"}` };
  }
  const T = timed ? timeCap(f) : "Mới";
  if (!p.known) return neutral(T, f);
  if (p.val < 0) return { intent: "frame:past", talk: true, text: `${T} ${echo(f)} hả 😅 ${pick(["Rồi có sao không bạn?", "Giờ ổn hơn chưa bạn?"])}` };
  // Khen ở cuối câu ("…vui lắm", "…hay lắm") thì không cần nhắc lại; nhận xét trung tính ("ngủ sớm") thì giữ.
  const e = echo(f, p.val === 0);
  const going = p.kind === "motion" || /^đi( |$)/.test(p.head);
  if (/^mua( |$)/.test(p.head)) return { intent: "frame:past", talk: true, text: `${T} ${e} hả 😄 Xịn ghê! Dùng thấy sao bạn?` };
  if (p.cls === "duty") return { intent: "frame:past", talk: true, text: `${T} ${e} hả 🤗 Vất vả rồi nè. ${pick(["Mọi việc ổn không bạn?", "Giờ nghỉ ngơi chút đi nha!"])}` };
  if (/(^| )(ăn|uống|nhậu)( |$)/.test(p.head) && detectDish(f.raw)) return { intent: "frame:past", talk: true, text: `${T} ${e} hả 😋 Ngon không bạn?` };
  if (p.val > 0) return { intent: "frame:past", talk: true, text: `${T} ${e} hả 😄 ${pick(["Nghe đã ghê!", "Thích ghê!"])} ${p.cls === "leisure" || going ? "Kể Lomi nghe thêm đi!" : "Vậy là hôm nay có thêm năng lượng rồi ha?"}` };
  if (p.cls === "leisure" || going) return { intent: "frame:past", talk: true, text: `${T} ${e} hả 😄 ${timed ? pick(["Rồi sao, vui không bạn?", "Kể Lomi nghe với!"]) : pick(["Có gì vui kể Lomi nghe với!", "Rồi sao nữa nè?"])}` };
  return { intent: "frame:past", talk: true, text: `${T} ${e} hả 😄 ${timed && !/nãy|nay|giờ/.test(f.time?.label ?? "") ? "Rồi hôm nay bạn thế nào?" : "Rồi sao nữa nè?"}` };
}

function selfPlan(f: Frame): FrameReply {
  const p = f.pred!;
  const T = f.time?.explicit ? timeCap(f) : p.planned ? "Sắp" : "";
  const e = echo(f);
  if (!p.known) return neutral(T, f);
  if (p.val < 0) return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 🥺 Bạn giữ sức nha, có gì cứ nói với Lomi.` };
  const d = detectDish(f.raw);
  if (d && /(^| )(ăn|uống|nhậu|cà phê)( |$)/.test(e)) {
    const label = dishWord(f, d.name);
    return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 😋 Nghe thích ghê! Muốn Lomi tìm quán ${label} cho không?`, quick: [`Tìm quán ${label} gần đây`] };
  }
  const going = p.kind === "motion" || /^đi( |$)/.test(p.head);
  if (p.cls === "duty") return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 💪 ${pick(["Chúc bạn mọi việc suôn sẻ nha!", "Cố lên nha, xong việc nhớ nghỉ ngơi đó!"])}` };
  if (/(^| )cưới( |$)/.test(e) && !/ăn cưới/.test(e)) return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 🎉 Chúc mừng bạn nha! Chuẩn bị tới đâu rồi?` };
  // "tí a về", "lát a ghé" — sắp đi ngay: dặn đi đường, không hỏi "chuẩn bị gì chưa".
  if (/^về( |$)/.test(p.head)) return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 😄 Về cẩn thận nha!` };
  if (f.time?.soon && (going || p.kind === "motion")) return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 😄 Bạn đi cẩn thận nha!` };
  if (p.cls === "leisure") return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 😄 Nghe thích ghê! ${going ? pick(["Bạn đi với ai vậy?", "Chuẩn bị gì chưa bạn?"]) : "Bạn định làm gì cho vui?"}` };
  // "đi" + nơi / việc chưa rõ vui hay nghiêm túc ("đi Đà Nẵng", "đi phỏng vấn") → hỏi nối, không khen bừa.
  if (p.kind === "motion") return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 😄 ${p.place ? pick(["Bạn đi với ai vậy?", "Chuẩn bị gì chưa bạn?"]) : "Chuẩn bị gì chưa bạn?"}` };
  return { intent: "frame:plan", talk: true, text: `${cap(join(T, e))} hả 😄 ${going ? "Bạn đi cẩn thận nha!" : "Okie nè, có gì kể Lomi nghe với!"}` };
}

const LEGACY_DOING = new Set(["state:eating", "state:coffee", "state:gaming", "state:watching", "state:working", "state:studying"]);
function selfDoing(f: Frame): FrameReply {
  if (!f.pred!.known) return neutral("Đang", f);
  return { intent: "frame:doing", talk: true, text: `Đang ${echo(f)} hả 😄 ${pick(["Vậy Lomi không làm phiền nhiều nha, cần gì cứ gọi!", "Rồi sao nữa, kể Lomi nghe với!"])}` };
}

/**
 * Đáp theo khung, hoặc null để các lớp sẵn có xử lý. Gọi MỘT lần mỗi lượt, sau lớp xã giao cơ bản và trước các lớp chuyên môn.
 * Không đáp khi độ chắc thấp, khi câu thuộc về một lớp chuyên môn (c.*), hoặc khi cấu trúc không nói thêm gì so với lớp cũ.
 */
export function frameReply(f: Frame, c: FrameCtx): FrameReply | null {
  if (f.conf < 0.7) return null;
  // Đang tâm sự: lời chào / cảm ơn giữa chừng để mạch tâm sự tự đáp; lời chúc và xin phép đi thì vẫn đáp lại cho đúng.
  if (c.mode === "heart" && (f.act === "greet" || f.act === "thanks" || f.act === "hold")) return null;
  // Lời nói có khuôn — nhận ở mọi bối cảnh.
  if (f.act === "greet") return greet(f);
  if (f.act === "wish") return wish(f);
  if (f.act === "thanks") return thanks(f);
  if (f.act === "leave") return c.health ? null : leave(f);
  if (f.act === "hold") return { intent: "frame:hold", text: `Dạ, bạn cứ ${f.pred?.head || "nghĩ"} đi nha, không vội đâu 😊` };
  // Đang tâm sự: chỉ tin người thân / thú cưng ốm, mất và lời "không muốn nói nữa" là đáp theo khung; còn lại để mạch tâm sự lo.
  if (c.mode === "heart") {
    if (f.act !== "statement" || !f.pred || f.conf < MIN_CONF || f.multi) return null;
    if ((f.subject === "third" || f.subject === "pet") && !f.neg && (f.pred.cls === "death" || f.pred.cls === "ill")) return third(f, c);
    if (f.subject === "self" && f.neg && f.pred.kind === "desire" && /^(nói|kể|nhắc|tâm sự|bàn|nghĩ)( |$)/.test(f.pred.obj)) return selfNeg(f, c);
    return null;
  }
  if (c.tarot) return null;
  if (f.act === "question") {
    // Hỏi thăm Lomi (không phải hỏi Lomi làm được gì / nhờ Lomi làm gì — mấy câu đó có lớp riêng).
    if (f.subject === "you" && !f.neg && !c.health && !c.appish && !c.search && f.conf >= MIN_CONF) return askLomi(f);
    return null;
  }
  if (c.mode !== "full" || f.conf < MIN_CONF || f.multi) return null;
  if (f.act === "invite") return c.appish || c.biz ? null : invite(f, c);
  if (f.act !== "statement" || !f.pred) return null;
  if (c.appish || c.biz) return null;
  const p = f.pred;

  if (f.subject === "third" || f.subject === "pet" || f.subject === "thing" || f.subject === "place") return f.neg || (c.medical && p.cls !== "ill") ? null : third(f, c);
  // "hôm nay trời không mưa" — thời tiết + phủ định (câu khẳng định đã có lớp cũ đáp theo từng kiểu thời tiết).
  if (f.subject === "weather") {
    if (p.kind !== "quality") return null;
    if (f.neg) return { intent: "frame:weather", text: `${cap(f.subjectText ?? "trời")} không ${p.head} là dễ chịu rồi ha 🌤️ Bạn có định đi đâu chơi không?` };
    // Kiểu thời tiết lớp cũ chưa có câu đáp riêng ("trời hôm nay âm u ghê").
    if (f.subjectText && !/^(mưa|nắng|gió|lạnh|nóng|oi|mát|rét|đẹp|xanh|trong|quang)$/.test(p.head)) return { intent: "frame:weather", text: `${cap(f.subjectText)} ${p.head} vậy hả 🌥️ Bạn ra ngoài nhớ chuẩn bị cho hợp thời tiết nha. Hôm nay bạn có định đi đâu không?` };
    return null;
  }
  if (f.subject === "you") return null;

  // Từ đây: người nói (hoặc câu lược chủ ngữ có mốc thời gian / phủ định rõ).
  const elided = f.subject === "none";
  if (elided && !(f.time?.explicit || f.neg || p.planned)) return null;
  if (f.neg) {
    // Sở thích ("không thích ăn ngọt") và chuyện một món cụ thể ("không thèm pizza") không phải câu hỏi sức khoẻ.
    const taste = p.kind === "desire" && (/^(thích|khoái|ưa|mê|ghiền|ghét)$/.test(p.head) || !!detectDish(f.raw));
    return (c.health || c.medical) && p.cls !== "well" && !taste ? null : selfNeg(f, c);
  }
  if (c.health || c.medical) return null;
  // Nói với Lomi là nhớ / thương Lomi ("a nhớ e quá") — không phải than cô đơn.
  if (!elided && /^Lomi$/i.test(p.obj.trim()) && (p.kind === "desire" || p.head === "nhớ")) {
    if (p.head === "nhớ") return { intent: "frame:to_lomi", text: pick(["Lomi cũng nhớ bạn nè 🥹 Dạo này bạn sao rồi?", "Ui cảm động ghê 🥰 Lomi vẫn ở đây chờ bạn mà!"]) };
    const old = senseState(f.raw);
    return old?.intent === "state:love_lomi" ? { intent: "frame:to_lomi", text: old.text } : null;
  }
  if (p.kind === "cognition") return p.cls === "joke" ? { intent: "frame:joke", text: pick(["Hihi, làm Lomi tưởng thật 😆", "Trời, bạn làm Lomi hết hồn 🤭"]) } : null;
  if (p.kind === "desire") {
    // "muốn đi đâu đó chơi" → tìm chỗ chơi; mong muốn khác (thèm món, muốn mua…) để lớp chọn món / lắng nghe.
    if (p.indef && /(^| )đi( |$)/.test(p.obj) && !c.food) return { intent: "frame:leisure", text: "", redirect: "đi đâu chơi" };
    // "a thích ăn phở", "a thích trà sữa hơn" — nói SỞ THÍCH về một món (khác "thèm / muốn ăn": mấy câu đó lớp chọn món lo).
    const d = !elided && !f.time?.explicit && /^(thích|khoái|ưa|mê|ghiền)$/.test(p.head) ? detectDish(f.raw) : null;
    if (d) {
      const label = dishWord(f, d.name);
      return { intent: "frame:taste", text: `${cap(label)} hả 😋 Chuẩn gu luôn! Muốn Lomi tìm quán ${label} ngon cho bạn không?`, quick: [`Tìm quán ${label} gần đây`] };
    }
    return null;
  }
  // "chủ nhật này a rảnh", "tối mai a bận" — rảnh / bận vào một lúc cụ thể (không có mốc thời gian thì lớp cũ đáp).
  if (p.kind === "state" && f.time?.explicit && f.time.label && (p.cls === "free" || p.cls === "busy"))
    return p.cls === "free"
      ? { intent: "frame:free", talk: true, text: `${timeCap(f)} rảnh hả 😄 Bạn tính làm gì cho vui — đi chơi, cà phê hay ở nhà nghỉ ngơi?`, quick: ["Cuối tuần đi đâu chơi?", "Tìm quán cà phê gần đây"] }
      : { intent: "frame:busy", talk: true, text: `${timeCap(f)} bận hả 💪 Cố lên nha, xong việc nhớ nghỉ ngơi đó!` };
  if (p.kind === "state" || p.kind === "quality") {
    // Trạng thái khẳng định ("a mệt", "a vui") đã có lớp cũ; riêng điều tốt đẹp ĐÃ QUA ("tối qua a ngủ ngon lắm") thì đáp như chuyện đã qua.
    if (f.time?.explicit && f.time.rel === "past" && p.val > 0 && p.cls !== "feel") return selfPast(f);
    return null;
  }
  // "a đang ở …", "tối nay a ở nhà thôi". Câu lược chủ ngữ ("hôm nay ở Đà Lạt lạnh quá") là tả nơi đó, không phải kể mình đang ở đâu.
  if (p.kind === "location") return (c.search && !p.ongoing) || (elided && !p.ongoing) || /(^| )(nóng|lạnh|mưa|nắng|gió|rét|oi)( |$)/.test(p.obj) ? null : selfLocation(f);
  if (p.cls === "seek" || (c.search && !p.recent && !(f.time?.explicit && f.time.rel === "past"))) return null;
  // Chuyện không may thư viện tâm sự đã có lời hỏi han riêng (kẹt xe, trễ giờ, cúp điện…).
  if (c.heart && (p.val < 0 || !f.time?.explicit) && !(f.time?.explicit && f.time.rel === "future")) return null;
  // Việc đang / vừa làm mà lớp cũ đã có câu đáp riêng (tin vui, đang ăn, uống cà phê, chơi game, xem phim, làm việc, học) → dùng lại.
  if (!f.time?.explicit && !p.planned) {
    const old = senseState(f.raw);
    if (old && ((p.ongoing && LEGACY_DOING.has(old.intent)) || old.intent === "state:goodnews")) return { intent: "frame:legacy", talk: true, text: old.text, quick: old.quick };
  }
  if ((f.time?.explicit && f.time.rel === "past") || p.recent || (p.done && !f.time?.explicit && !elided)) return selfPast(f);
  if (c.food) return null;
  // Chuyện xui nho nhỏ của mình mà thư viện tâm sự không có bài riêng ("a quên mang ví").
  if (p.kind === "event") return p.val < 0 && !c.heart && !elided ? { intent: "frame:mishap", talk: true, text: `${cap(echo(f))} hả 😅 ${pick(["Rồi có sao không bạn?", "Xui ghê ha. Giờ bạn tính sao?"])}` } : null;
  if (f.time?.explicit || p.planned) return selfPlan(f);
  if (p.ongoing) return selfDoing(f);
  return null;
}

/** Chủ ngữ khi câu kể bệnh của NGƯỜI KHÁC ("con a bị sốt", "mẹ a đau lưng") — để lớp sức khoẻ không nói "Bạn đang bị…". */
export function patientOf(f: Frame, addr?: Addr | null): string | null {
  if (!((f.subject === "third" || f.subject === "pet") && f.subjectText && f.conf >= 0.4)) return null;
  return cap(f.subjectText.split(YOU_MARK).join(youOf(addr)));
}

// ── Nối vào router ───────────────────────────────────────────────────────────
export type FrameFlow = {
  /** full = bối cảnh trung tính; speech = đang ở mạch khác → chỉ lời chào / chúc / cảm ơn / xin phép + hỏi thăm Lomi; off = không dùng khung. */
  mode: "full" | "speech" | "heart" | "off";
  /** Đang nói chuyện sức khoẻ (để nhận tên bệnh viết tắt) + chủ thể sức khoẻ đang nói. */
  inHealth?: boolean;
  hsub?: string;
  lastText?: string;
  /** Cách người dùng đang tự xưng — để đổi chữ "bạn" trong mẩu nhắc lại cho đúng. */
  addr?: Addr | null;
};

/** Câu gốc bỏ đi các CỤM nhiều tiếng đã nhận ra vai (động từ, thời gian, phủ định, từ hỏi, địa danh…) — để kiểm tra một từ khoá
 *  sức khoẻ khớp được là nhờ một cụm khác nghĩa bị bỏ dấu ("đá bóng" → "da bong", "đâu có" → "dau co") hay là triệu chứng thật. */
const MASKED = new Set(["VERB", "MOTION", "GOOD", "TIME", "NEG", "INDEF", "QWORD", "ASPECT", "CONJ", "ADJ", "DESIRE", "COG"]);
function maskPhrases(f: Frame): string {
  let s = ` ${expandTeen(f.raw.normalize("NFC")).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ")} `;
  for (const t of f.toks) if (t.t.includes(" ") && (MASKED.has(t.r) || (t.r === "NOUN" && t.cls === "place")) && t.cls !== "ill") s = s.split(` ${t.t} `).join("  ");
  return s;
}
const MEDICAL = /(?<![\p{L}])(thuốc|bác sĩ|bệnh|khám|viện|xét nghiệm|triệu chứng|mổ|phẫu thuật|tiêm|vắc xin|huyết áp|tiểu đường|ung thư|cấp cứu|đau|sốt|chữa|điều trị)(?![\p{L}])/u;
const namedHealth = (q: string, flow: FrameFlow) => (analyzeBody(q)?.sx.length ?? 0) > 0 || !!healthSubjectOf(q, !!flow.inHealth) || !!dietOf(q);

/** Triệu chứng chỉ khớp nhờ một cụm khác nghĩa bị bỏ dấu (câu gõ CÓ DẤU): "chiều nay a đi đá bóng" ≠ "da bong tróc". */
export function symptomClash(q: string, f: Frame): boolean {
  if (f.loose || !(analyzeBody(q)?.sx.length ?? 0)) return false;
  return !(analyzeBody(maskPhrases(f))?.sx.length ?? 0);
}

/** Câu có nội dung sức khoẻ không (triệu chứng, tên bệnh, kiêng cữ, câu hỏi kiến thức sức khoẻ) — đã loại các trường hợp trùng chữ khi bỏ dấu. */
export function healthClaim(q: string, f: Frame, flow: FrameFlow): boolean {
  if (healthFact(q) || contextReply(q, flow.hsub)) return true;
  if (namedHealth(q, flow)) return f.loose ? true : namedHealth(maskPhrases(f), flow);
  return !!analyzeBody(f.loose ? q : maskPhrases(f)); // kiến thức chung về một triệu chứng ("đau đầu là do đâu?")
}

/**
 * Một lượt: xem câu có thuộc về lớp chuyên môn nào không rồi mới đáp theo khung. q = câu đã chuẩn hoá (teen code, từ khoá chuẩn),
 * khung f đọc từ câu GỐC. Trả null = để các lớp sẵn có xử lý như trước.
 */
export function frameTurn(q: string, f: Frame, flow: FrameFlow): FrameReply | null {
  if (flow.mode === "off" || f.conf < 0.7) return null;
  // Hỏi Lomi LÀM ĐƯỢC GÌ trong phạm vi của mình ("e tư vấn kinh doanh được không") — lớp hỏi-khả-năng trả lời, không phải chuyện phiếm về Lomi.
  if (f.act === "question" && capabilityAsk(q)) return null;
  const speechAct = f.act === "greet" || f.act === "wish" || f.act === "thanks" || f.act === "leave" || f.act === "hold";
  const u = f.act === "invite" ? understand(q, f.raw, { lastText: flow.lastText }) : null;
  const c: FrameCtx = {
    mode: flow.mode,
    health: speechAct && f.act !== "leave" ? false : healthClaim(q, f, flow),
    symptom: (analyzeBody(q)?.sx.length ?? 0) > 0,
    medical: MEDICAL.test(f.raw.normalize("NFC").toLowerCase()),
    heart: speechAct ? undefined : relationReply(q) ? "rel" : heartStart(q, false)?.theme,
    // "điện thoại a hết pin", "xe a hư" — chủ ngữ là một đồ vật đã biết thì chữ "pin", "mạng"… không phải chuyện app.
    appish: isAppish(q) && !(f.subject === "thing" && f.toks.some((t) => t.r === "NOUN" && t.cls === "thing")),
    tarot: !!detectTarot(q) || isTarotAbilityAsk(q),
    biz: looksLikeBizQuestion(q),
    search: !!detectSearch(q),
    food: !!foodChoice(q),
    legacyInvite: u && /^(invite|seek_company)/.test(u.intent) ? u : null,
  };
  const r = frameReply(f, c);
  if (!r) return null;
  const you = youOf(flow.addr);
  const text = r.text
    .split(YOU_MARK)
    .join(you).replace(/(^|[.!?]\s+)(anh|chị|em|bạn)(?=\s)/gu, (_m, a: string, w: string) => `${a}${cap(w)}`);
  const about = /^frame:third/.test(r.intent) && f.subjectText ? { text: f.subjectText.split(YOU_MARK).join(you), kind: f.subject } : undefined;
  // "chào e, a mới đi làm về" — chào lại rồi mới đáp phần sau.
  return { ...r, about, text: f.greeted && !speechAct && text ? `Chào bạn nha 👋 ${text}` : text };
}

/** Câu lược chủ ngữ ngay sau khi đang nói về một người / con vật ("mẹ a đang ốm" → "bị cảm thôi") → vẫn là nói về người đó. */
export function withAbout(f: Frame, about?: { text: string; kind: SubjectKind } | null): Frame {
  if (!about || (about.kind !== "third" && about.kind !== "pet") || f.subject !== "none" || !f.pred || f.act !== "statement" || f.multi) return f;
  return { ...f, subject: about.kind, subjectText: about.text, conf: Math.max(f.conf, 0.8) };
}

/** Câu chỉ nói KHOẢNG THỜI GIAN ("từ tối qua", "2 ngày rồi", "từ sáng tới giờ") — trả lời cho câu Lomi hỏi "bị bao lâu rồi?". */
const DUR_WORD = /^(từ|tới|đến|rồi|được|khoảng|cả|mấy|vài|hơn|gần|chừng|ngày|tuần|tháng|năm|hôm|tiếng|giờ|phút|đêm|bữa|nay|qua|lúc|hồi|mới)$/;
export function durationOf(f: Frame): string | null {
  const t = f.toks.filter((x) => x.r !== "PART" && x.r !== "VOC");
  if (!t.length || t.length > 7 || f.ask) return null;
  if (!t.every((x) => x.r === "TIME" || x.r === "NUM" || DUR_WORD.test(x.t) || /^\d+\p{L}*$/u.test(x.t))) return null;
  if (!t.some((x) => x.r === "TIME" || x.r === "NUM" || /^\d/.test(x.t))) return null;
  return t.map((x) => x.t).join(" ");
}
