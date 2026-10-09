// ─────────────────────────────────────────────────────────────────────────────
// HỎI VỀ THUỐC — NÓI THẬT GIỚI HẠN (11/10) — chạy trên máy, không gọi AI.
//
// Lỗi cần sửa (role-play 11/10): cùng một kiểu câu mà Lomi đáp ba kiểu khác nhau —
//   "Colchicine là thuốc gì?"  → nói thật là chưa có dữ liệu (đúng)
//   "amoxicillin là thuốc gì"  → "Lomi chưa chắc hiểu ý bạn" (thiếu dấu hỏi nên lớp kiến thức bỏ qua)
//   "ibuprofen uống chung với paracetamol được không" → đọc bài paracetamol, bỏ qua câu hỏi TƯƠNG TÁC
//   "Thuốc gout có tương tác với thuốc này không?"     → hiện lại bảng chọn về gout
//   "uống thuốc gì được", "liều bao nhiêu" (đang kể triệu chứng) → "Lomi chưa biết, bấm Dạy Lomi"
//
// File này KHÔNG chứa kiến thức về từng loại thuốc (không thêm tên thuốc để tăng độ phủ). Nó nhận DÁNG câu hỏi về thuốc —
// là thuốc gì · tác dụng phụ · liều · uống thuốc gì · dùng chung / tương tác · ngưng thuốc / quên liều · uống nhầm / quá liều —
// rồi trả lời đúng điều Lomi làm được: nói rõ chưa có dữ liệu đã kiểm chứng, không kê thuốc, không đưa liều cho từng người,
// không đoán tương tác; chỉ đường tới dược sĩ / bác sĩ và nêu dấu hiệu cần đi cấp cứu. Thuốc Lomi CÓ dữ liệu (lib/lomiContext)
// vẫn do lớp đó trả lời trước — trừ câu hỏi tương tác, vì Lomi không có dữ liệu tương tác cho thuốc nào cả.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { healthSubjectOf } from "@/lib/lomiHealthTopic";
import { drugById, findDrug, findInteraction, renderDrug, sourceLine, sourceList } from "@/lib/lomiDrugData";

export type DrugKind = "interact" | "overdose" | "dose" | "stop" | "side" | "what" | "which" | "should" | "pet" | "source" | "kid";
export type DrugReply = {
  kind: DrugKind;
  text: string;
  urgent?: boolean;
  /** câu có nhắc rõ chữ "thuốc" / tên nhóm thuốc (không chỉ đoán theo ngữ cảnh). */
  med?: boolean;
  /** Tên thuốc người dùng nêu (nguyên chữ họ gõ) — để câu hỏi nối "nó có tác dụng phụ gì không" vẫn biết đang nói thuốc nào. */
  name?: string;
  /** Mã mục thuốc trong lib/lomiDrugData nếu lời đáp dựa trên dữ liệu đã kiểm chứng; không có = Lomi chỉ nói giới hạn của mình. */
  drugId?: string;
};
export type DrugCtx = {
  /** Đang ở mạch sức khoẻ (đã kể triệu chứng / đang nói về một bệnh) — câu cụt "liều bao nhiêu" mới được hiểu là hỏi liều thuốc. */
  inHealth?: boolean;
  /** Triệu chứng / bệnh đang nói tới, để nhắc lại cho đúng mạch ("đau bụng", "gout"). */
  label?: string;
  /** Đang nói về người khác ("mẹ anh") — lời khuyên hướng tới đúng người đó. */
  who?: string;
  /** Đang nói về một con vật nuôi — thuốc của người không dùng cho thú cưng được. */
  pet?: boolean;
  /** Lomi vừa trả lời một câu về thuốc — câu cụt kế tiếp ("có hại không") vẫn là hỏi về thuốc đó. */
  afterDrug?: boolean;
  /** Lomi vừa trả lời chuyện uống nhầm / quá liều — mẩu đáp ngắn kế tiếp ("2 viên", "mới uống") là kể thêm cho chuyện đó. */
  afterOverdose?: boolean;
  /** Thuốc vừa được nhắc ở lượt trước: tên người dùng gõ, và mã mục đã kiểm chứng (nếu có). */
  name?: string;
  drugId?: string;
};

// "thuốc" cũng là thuốc lá / thuốc lào / thuốc nhuộm… — mấy thứ đó không phải thuốc chữa bệnh.
const NOT_MED = /\b(thuoc la|thuoc lao|hut thuoc|thuoc nhuom|thuoc tay|thuoc no|thuoc sung|thuoc diet|thuoc tru sau|thuoc chuot)\b/;
const MED_WORD = /\b(thuoc|khang sinh|toa|don thuoc|vien uong|siro|giam dau|ha sot|thuoc bo|thuoc nam|thuoc bac|thuoc tay)\b/;
const INTERACT = /\b(tuong tac|ky nhau|ki nhau|ky thuoc|ki thuoc|uong chung|dung chung|uong cung|dung cung|uong kem|dung kem|uong lan|ket hop voi|uong voi|uong cung luc|chung voi thuoc|cung voi thuoc)\b/;
const OVERDOSE = /\b(qua lieu|uong nham thuoc|uong nham|uong lo|lo uong|uong qua nhieu thuoc|uong ca vi|uong ca hop|uong ca lo)\b/;
const DOSE = /\b(lieu|may vien|bao nhieu vien|uong bao nhieu|ngay may lan|may lan mot ngay|may lan 1 ngay|bao nhieu mg|bao nhieu ml|may goi|cach nhau may tieng|uong may)\b/;
const STOP = /\b(ngung thuoc|ngung uong|bo thuoc|nghi thuoc|dung thuoc lai|tu ngung|quen uong|quen lieu|quen thuoc|uong bu|uong thieu|het thuoc)\b/;
const SIDE = /\b(tac dung phu|phan ung phu|co hai gi|hai gan|hai than|hai da day|co gay nghien)\b/;
const WHAT = /\b(la thuoc gi|thuoc gi vay|la gi|tri gi|chua gi|tri benh gi|chua benh gi|de lam gi|dung de lam gi|tac dung gi|cong dung|co tac dung)\b/;
const WHICH = /\b(uong thuoc gi|thuoc gi|thuoc nao|mua thuoc gi|dung thuoc gi|co thuoc nao|uong gi cho (do|het|khoi|bot)|boi thuoc gi|xit thuoc gi|nho thuoc gi)\b/;
const ASKS = /\b(khong|ko|k|duoc|sao|gi|nao|the nao|bao nhieu|may|ha|nhi|chua)\b/;
// Hỏi CÓ NÊN dùng thuốc không ("có nên uống kháng sinh không", "uống thuốc ngủ được không").
const SHOULD = /\b(co nen|nen|co can|can|co duoc|duoc) (uong|dung|mua|xai|tiem|chich|boi|xit|nho)\b|\b(uong|dung|xai|tiem|chich|boi)( \S+){1,3} (duoc khong|dc khong|duoc ko|co sao khong|co duoc khong|co nen khong|duoc chua)\b/;
const RX_ONLY = /\b(khang sinh|thuoc ngu|thuoc an than|corticoid|thuoc giam dau manh)\b/;
const ALCOHOL = /\b(ruou|bia|nhau)\b/;

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Tên thuốc người dùng gõ (để nhắc lại đúng chữ họ hỏi) — chỉ lấy khi đứng ở vị trí tên: "X là thuốc gì", "thuốc X trị gì". */
function nameOf(raw: string): string | undefined {
  const t = raw.normalize("NFC").replace(/[?!.…]+/g, " ").replace(/\s+/g, " ").trim();
  const m =
    t.match(/^(?:cho (?:a|anh|e|em|c|chị|mình|tui|tôi) hỏi |(?:a|anh|e|em|c|chị|mình|tui|tôi) hỏi )?(?:thuốc\s+)?([\p{L}\d][\p{L}\d-]{2,24}(?:\s[\p{L}\d-]{2,16})?)\s+(?:là\s+thuốc\s+gì|có\s+tác\s+dụng\s+phụ|trị\s+(?:bệnh\s+)?gì|chữa\s+(?:bệnh\s+)?gì|dùng\s+để\s+làm\s+gì)/iu) ??
    t.match(/thuốc\s+([\p{L}\d][\p{L}\d-]{2,24})\s+(?:là\s+gì|là\s+thuốc\s+gì|trị|chữa|có\s+tác\s+dụng|dùng\s+để|uống\s+sao)/iu);
  const n = m?.[1]?.trim();
  if (!n || /^(này|đó|kia|ấy|gì|nào|đang|bác|em|anh|chị|mình|của|thuốc|loại|cái|viên|trị|chữa)(\s|$)/iu.test(n)) return undefined;
  // "thuốc gout là gì" — sau chữ "thuốc" là TÊN BỆNH, không phải tên thuốc.
  if (healthSubjectOf(n, true)) return undefined;
  return n;
}

const ASK_PHARM = "Cách chắc nhất: hỏi **dược sĩ** ở nhà thuốc hoặc bác sĩ, và đọc tờ hướng dẫn trong hộp thuốc.";

/** Câu có phải đang hỏi về thuốc theo một trong các dáng ở trên không; có thì trả lời trong giới hạn của Lomi. */
export function drugAsk(text: string, ctx: DrugCtx = {}): DrugReply | null {
  const n = ` ${normalizeVi(text)} `;
  if (NOT_MED.test(n)) return null;
  const words = n.trim().split(" ").length;
  if (words > 22) return null;
  const med = MED_WORD.test(n);
  const who = ctx.who;
  const forWho = who ? ` cho ${who}` : "";

  // Thú cưng: thuốc của người không dùng cho chó mèo được — không hướng tới "hỏi dược sĩ" như với người.
  if (ctx.pet && (med || DOSE.test(n)) && ASKS.test(n))
    return {
      kind: "pet",
      text: `Đừng tự cho bé uống thuốc của người nha — nhiều thuốc người dùng bình thường lại độc với chó mèo, và liều cho thú cưng tính rất khác. Lomi không có dữ liệu thuốc thú y nên không gợi ý thuốc được.\n\nBé cần thuốc gì thì để bác sĩ thú y khám rồi kê là an toàn nhất.`,
    };
  // Đang nói chuyện uống nhầm mà bảo "giờ thấy bình thường" → không trấn an: triệu chứng có thể tới muộn (NHS — xem DRUG_CLAIMS.poison-first-aid).
  if (ctx.afterOverdose && words <= 9 && !/\?/.test(text) && /\b(binh thuong|chua thay gi|khong thay gi|khong sao|van on|van khoe|chua bi gi|khong bi gi)\b/.test(n))
    return {
      kind: "overdose",
      urgent: true,
      text: "Lúc này thấy bình thường thì cũng chưa chắc là ổn đâu — triệu chứng ngộ độc thuốc có thể vài giờ, thậm chí vài ngày sau mới xuất hiện. Lomi không biết đó là thuốc gì nên không nói được là an toàn; bạn vẫn nên gọi **115** hoặc hỏi ngay bác sĩ / dược sĩ, đọc cho họ tên thuốc, số viên và giờ uống. Trong lúc đó đừng ở một mình nha.",
    };
  if (ctx.afterOverdose && words <= 8 && !/\?/.test(text) && /\b(\d+|mot|hai|ba|may|vai|nua) (vien|goi|ong|muong|ml|mg|lo|vi)\b|\b(moi uong|vua uong|luc nay|hoi nay|sang nay|toi qua|khong biet thuoc gi|khong nho)\b/.test(n))
    return {
      kind: "overdose",
      urgent: true,
      text: "Dạ, Lomi ghi nhận. Lomi không biết đó là thuốc gì nên không nói được chừng đó có sao không — bạn gọi **115** hoặc hỏi ngay bác sĩ / dược sĩ, đọc cho họ tên thuốc, số viên và giờ uống nha. Trong lúc chờ, đừng ở một mình; thấy buồn nôn, lơ mơ, khó thở, đau bụng thì đi cấp cứu liền.",
    };
  if (OVERDOSE.test(n) && (med || ctx.inHealth))
    return {
      kind: "overdose",
      urgent: true,
      text: `⚠️ Uống nhầm thuốc hoặc uống quá liều thì **đừng chờ xem có sao không**: gọi **115** hoặc tới cơ sở y tế gần nhất ngay, kể cả khi lúc này thấy bình thường.\n• Mang theo vỏ hộp / vỉ thuốc, nhớ khoảng bao nhiêu viên và uống lúc mấy giờ.\n• Không tự gây nôn, không tự uống thêm thuốc khác để "giải".\n\nLomi không có dữ liệu để nói loại thuốc đó ở mức nào thì nguy hiểm — nên đi kiểm tra là an toàn nhất.`,
    };

  // Dùng chung / tương tác. Lomi CHỈ nói về một cặp khi có bản ghi có nguồn cho đúng cặp đó (lib/lomiDrugData); còn lại nói rõ là
  // chưa xác minh được — không suy ra từ tên thuốc hay nhóm thuốc.
  const known = findDrug(text) ?? (ctx.drugId && words <= 9 ? drugById(ctx.drugId) : null);
  // 12/10: vừa nghe Lomi nói về một thuốc mà hỏi "có nguồn không", "lấy ở đâu ra" → đưa đủ nguồn (kèm đường dẫn); thuốc chưa có mục thì
  //   nói rõ chính vì chưa có nguồn nên Lomi mới không trả lời.
  if (ctx.afterDrug && words <= 9 && /\b(nguon|lay (o|tu) dau|o dau ra|dua vao dau|tin duoc khong|co chac khong|ai noi)\b/.test(n)) {
    const d = ctx.drugId ? drugById(ctx.drugId) : null;
    return d
      ? { kind: "source", drugId: d.id, name: d.names[0], text: sourceList(d) }
      : { kind: "source", name: ctx.name, text: `Với ${ctx.name ? `**${ctx.name}**` : "thuốc đó"} thì Lomi **chưa có nguồn đã kiểm chứng** — chính vì vậy Lomi mới không nói nó trị gì hay có tác dụng phụ gì. Nguồn đáng tin nhất lúc này là tờ hướng dẫn trong hộp thuốc và dược sĩ / bác sĩ.` };
  }
  // Câu nhắc tới một thuốc có mục + đúng một thứ có bản ghi tương tác ("a đang uống warfarin, uống paracetamol được không",
  // "nhậu xong uống paracetamol được không") cũng là hỏi dùng chung, dù không có chữ "uống chung".
  //   (vừa hỏi về một thuốc khác rồi hỏi "uống với paracetamol được không" → thứ dùng chung chính là thuốc vừa nhắc ở lượt trước.)
  const hit0 = known ? (findInteraction(known, text) ?? (ctx.afterDrug && ctx.name && words <= 9 ? findInteraction(known, ctx.name) : null)) : null;
  // Vừa nghe về một cặp dùng chung rồi KỂ thêm hoàn cảnh của mình ("a uống 3 lon bia mỗi ngày") — không phải câu hỏi mới: Lomi không
  // tự quy hoàn cảnh riêng của một người ra "an toàn" hay "không an toàn"; nguồn chỉ nói chung.
  if (ctx.afterDrug && ctx.drugId && known && hit0 && !ASKS.test(n) && words <= 10)
    return {
      kind: "interact",
      drugId: known.id,
      name: known.names[0],
      text: `Với hoàn cảnh bạn vừa kể thì Lomi **không tự kết luận được** là dùng ${known.names[0]} có ổn hay không — nguồn Lomi đối chiếu chỉ nói chung như ở trên, không nói cho từng người.\n\nBạn nói đúng điều này với dược sĩ / bác sĩ (đang dùng ${hit0.with.replace(/ \(.*\)$/, "")} thế nào, thường xuyên cỡ nào) để họ tư vấn cho đúng trường hợp của bạn nha.`,
    };
  if ((INTERACT.test(n) || !!hit0) && (med || !!known || !!ctx.afterDrug || /\b(\S+) (uong|dung) (chung|cung|kem) (voi )?\S+/.test(n)) && ASKS.test(n)) {
    const hit = hit0;
    if (known && hit)
      return {
        kind: "interact",
        drugId: known.id,
        name: known.names[0],
        text: [`Về **${known.names[0]}** dùng chung với **${hit.with}**, Lomi có dữ liệu đã kiểm chứng như sau:`, hit.note, `Đang dùng thêm thuốc nào khác${forWho} thì vẫn nên đưa cả danh sách cho dược sĩ xem.`, sourceLine(known, hit.src)].join("\n\n"),
      };
    if (known)
      return {
        kind: "interact",
        drugId: known.id,
        name: known.names[0],
        text: [
          `Về **${known.names[0]}** thì Lomi có dữ liệu, nhưng với thứ bạn định dùng chung thì Lomi **chưa xác minh được** — trong nguồn Lomi đã đối chiếu không có thông tin cho cặp này, nên Lomi không đoán (không có thông tin không có nghĩa là dùng chung an toàn).`,
          `Cách chắc nhất${forWho}: mang (hoặc chụp hình) **tất cả** thuốc đang uống ra nhà thuốc hỏi dược sĩ, hoặc hỏi bác sĩ đã kê đơn.`,
          `Những trường hợp Lomi có nguồn: ${known.interactions.map((x) => x.with.replace(/ \(.*\)$/, "")).join("; ")}.`,
        ].join("\n\n"),
      };
    return {
      kind: "interact",
      text: [
        "Hai thuốc dùng chung có sao không thì Lomi **không có dữ liệu tương tác thuốc** để trả lời cho chắc — và đây là loại câu hỏi mà đoán sai thì nguy hiểm, nên Lomi không đoán.",
        `Cách chắc nhất${forWho}:\n• Mang (hoặc chụp hình) **tất cả** thuốc đang uống — kể cả thuốc bổ, thuốc nam — ra nhà thuốc hỏi dược sĩ, hoặc hỏi bác sĩ đã kê đơn.\n• Chưa hỏi được thì đừng tự uống thêm thuốc mới chung với thuốc đang dùng, và cũng đừng tự ngưng thuốc bác sĩ đã kê.`,
        ALCOHOL.test(n) ? "Riêng rượu bia: Lomi chưa xác minh được với thuốc đó thì có sao không — trong lúc đang dùng thuốc, an toàn nhất là hỏi dược sĩ trước khi uống." : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  if (STOP.test(n) && (med || ctx.inHealth))
    return {
      kind: "stop",
      text: `Chuyện ngưng thuốc, quên liều hay uống bù thì tuỳ từng loại thuốc — Lomi không có dữ liệu riêng cho thuốc ${who ? `của ${who}` : "bạn đang dùng"} nên không nói bừa được.\n• Thuốc bác sĩ kê thì đừng tự ngưng giữa chừng; muốn ngưng hay đổi thì hỏi lại bác sĩ đã kê.\n• Lỡ quên một liều: đừng tự uống gấp đôi để bù — xem tờ hướng dẫn hoặc gọi hỏi dược sĩ.`,
    };

  // Vừa nói về một thuốc mà hỏi "trẻ em uống được không" → thuốc có mục thì đáp theo dữ liệu; không thì nói rõ là chưa có dữ liệu.
  if (ctx.afterDrug && words <= 9 && /\b(tre em|tre con|tre nho|em be|con nit|cho be|be uong|con uong)\b/.test(n) && ASKS.test(n)) {
    const d = ctx.drugId ? drugById(ctx.drugId) : null;
    return d
      ? { kind: "kid", drugId: d.id, name: d.names[0], text: renderDrug(d, "children") }
      : { kind: "kid", name: ctx.name, text: `Lomi chưa có dữ liệu đã kiểm chứng để nói ${ctx.name ? `**${ctx.name}**` : "thuốc đó"} trẻ em dùng được hay không. Thuốc cho trẻ phải theo tuổi và cân nặng — bạn hỏi dược sĩ / bác sĩ kèm tuổi, cân nặng của bé, và đừng tự chia thuốc của người lớn cho bé nha.` };
  }
  // "uống trước hay sau ăn", "uống mấy ngày" — cách dùng cũng tuỳ từng thuốc.
  if (/\b(cach nhau (bao lau|may gio|may tieng)|cach (may|bao nhieu) (gio|tieng)|bao lau uong (mot|1) lan|may tieng uong (mot|1) lan|truoc hay sau (khi )?an|uong (truoc|sau) (khi )?an|uong luc nao|uong khi nao|uong buoi nao|uong sang hay toi|uong (trong )?(bao lau|may ngay|may tuan)|(uong|dung|xai) (sao|the nao|nhu the nao|nhu nao|lam sao)|cach (uong|dung|xai))\b/.test(n) && (med || ctx.inHealth || ctx.afterDrug))
    return {
      kind: "dose",
      text: `Uống trước hay sau ăn, uống lúc nào và trong bao lâu thì mỗi thuốc mỗi khác — Lomi không có dữ liệu riêng cho thuốc ${who ? `của ${who}` : "đó"} nên không nói bừa được.\n• Có đơn bác sĩ: làm đúng như đơn ghi.\n• Thuốc tự mua: xem tờ hướng dẫn trong hộp, hoặc hỏi dược sĩ lúc mua.`,
    };
  if (DOSE.test(n) && (med || ctx.inHealth) && ASKS.test(n))
    return {
      kind: "dose",
      text: `Liều thuốc thì Lomi không đưa được${forWho} đâu — liều phụ thuộc **tuổi, cân nặng, bệnh nền và các thuốc khác đang dùng**, nên nói một con số chung là dễ sai.\n• Có đơn bác sĩ: uống đúng theo đơn.\n• Thuốc tự mua: làm theo tờ hướng dẫn trong hộp, hoặc hỏi dược sĩ lúc mua (nói rõ tuổi, cân nặng, đang uống thuốc gì).\n• Không tự tăng liều khi thấy chưa đỡ.`,
    };

  // Thuốc có trong dữ liệu đã kiểm chứng → trả lời từ dữ liệu, kèm nguồn.
  const entry = findDrug(text);
  if (entry && SIDE.test(n)) return { kind: "side", drugId: entry.id, name: entry.names[0], text: renderDrug(entry, "side") };
  if (entry && WHAT.test(n)) return { kind: "what", drugId: entry.id, name: entry.names[0], text: renderDrug(entry, "info") };
  // Tên thuốc: lấy trong câu; câu hỏi nối không nhắc lại tên ("nó có tác dụng phụ gì không") thì dùng thuốc vừa hỏi ở lượt trước.
  const named = nameOf(text);
  const name = named ?? (ctx.afterDrug && words <= 9 ? ctx.name : undefined);
  if ((SIDE.test(n) && (med || !!name)) || (ctx.afterDrug && /\b(co hai khong|co hai gi|co sao khong|co anh huong gi|co nguy hiem khong|co tot khong)\b/.test(n) && words <= 7))
    return {
      kind: "side",
      name,
      text: `Lomi chưa có dữ liệu đã kiểm chứng về ${name ? `**${name}**` : "thuốc này"}, nên không liệt kê bừa tác dụng phụ được.\n• ${ASK_PHARM}\n• Dù là thuốc gì: uống vào mà nổi mẩn, ngứa nhiều thì ngưng và đi khám; **khó thở, sưng môi / lưỡi / họng, choáng váng thì gọi 115 ngay**.`,
    };

  if (named && WHAT.test(n) && /\b(thuoc)\b/.test(n))
    return {
      kind: "what",
      name: named,
      text: `Lomi chưa có dữ liệu đã kiểm chứng về **${name}**, nên không dám nói đại là thuốc gì, trị gì hay dùng thế nào — nói sai chuyện thuốc thì nguy hiểm lắm.\n• ${ASK_PHARM}\n• Nếu là thuốc bác sĩ kê${forWho}, hỏi lại bác sĩ thuốc đó để làm gì và uống bao lâu.`,
    };

  // Vừa hỏi chuyện thuốc rồi nói thêm hoàn cảnh ("e đang cho con bú", "a đang mang thai") → càng phải hỏi bác sĩ trước.
  if (ctx.afterDrug && words <= 8 && /\b(cho con bu|mang thai|co bau|co thai|dang bau)\b/.test(n))
    return {
      kind: "should",
      med: true,
      text: "Đang mang thai hoặc cho con bú thì càng phải hỏi bác sĩ / dược sĩ **trước khi** uống bất kỳ thuốc gì nha — phần lớn thuốc uống khi mang thai đi qua nhau thai tới em bé, và một lượng nhỏ thuốc có thể qua sữa mẹ (theo NHS). Lomi không có dữ liệu để nói thuốc nào an toàn cho giai đoạn này, nên bạn nói rõ hoàn cảnh với người kê / bán thuốc để họ chọn loại phù hợp.",
    };
  // "có nên uống kháng sinh không", "uống thuốc ngủ được không" — Lomi không quyết thay; thuốc kê đơn thì không tự mua uống.
  if (SHOULD.test(n) && (med || RX_ONLY.test(n) || (ctx.inHealth && /\b(uong|dung|xai|tiem|chich)\b/.test(n))) && ASKS.test(n) && words <= 14)
    return {
      kind: "should",
      med: med || RX_ONLY.test(n),
      text: `Có nên dùng thuốc hay không thì phải người khám trực tiếp mới quyết được${forWho} — Lomi không kê thuốc và cũng không có dữ liệu riêng về thuốc đó.${RX_ONLY.test(n) ? "\n\nRiêng kháng sinh, thuốc ngủ, thuốc an thần là thuốc cần bác sĩ kê đơn — đừng tự mua uống; dùng sai dễ không khỏi mà còn gặp tác dụng phụ." : ""}\n\n${ASK_PHARM}`,
    };

  // "uống thuốc gì (được)?", "thuốc nào tốt?" — Lomi không kê thuốc; đang kể triệu chứng thì nói theo đúng mạch đó.
  if (WHICH.test(n) && !/\b(la thuoc gi)\b/.test(n) && words <= 14) {
    const about = ctx.label ? `${cap(ctx.label)} thì ` : "";
    return {
      kind: "which",
      text: `${about}Lomi không kê thuốc được${forWho} — thuốc nào hợp còn tuỳ nguyên nhân, tuổi, bệnh nền và thuốc khác đang dùng.\n• Ra nhà thuốc kể rõ triệu chứng (bị gì, bao lâu, mức độ) để dược sĩ tư vấn; ${who ? `${who} ` : ""}đang có bệnh nền, mang thai hoặc là trẻ nhỏ thì nói luôn.\n• Uống 1–2 ngày không đỡ, hoặc nặng lên, thì đi khám chứ đừng đổi thuốc liên tục.`,
    };
  }
  return null;
}
