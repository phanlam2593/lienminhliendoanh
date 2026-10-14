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
import { drugById, findDrug, findDrugs, findInteraction, renderDrug, sourceLine, sourceList } from "@/lib/lomiDrugData";
import { VR, VN } from "@/lib/viMatch";

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
const NOT_MED = VN(/\b(thuốc lá|thuốc lào|hút thuốc|thuốc nhuộm|thuốc tẩy|thuốc nổ|thuốc súng|thuốc diệt|thuốc trừ sâu|thuốc chuột)\b/);
const MED_WORD = VN(/\b(thuốc|kháng sinh|toa|đơn thuốc|viên uống|siro|giảm đau|hạ sốt|thuốc bổ|thuốc nam|thuốc bắc|thuốc tây)\b/);
const INTERACT = VN(/\b(tương tác|kỵ nhau|kị nhau|kỵ thuốc|kị thuốc|uống chung|dùng chung|uống cùng|dùng cùng|uống kèm|dùng kèm|uống lẫn|kết hợp với|uống với|uống cùng lúc|chung với thuốc|cùng với thuốc)\b/);
const OVERDOSE = VN(/\b(quá liều|uống nhầm thuốc|uống nhầm|uống lố|lỡ uống|uống quá nhiều thuốc|uống cả vỉ|uống cả hộp|uống cả lọ)\b/);
const DOSE = VN(/\b(liều|mấy viên|bao nhiêu viên|uống bao nhiêu|ngày mấy lần|mấy lần một ngày|mấy lần 1 ngày|bao nhiêu mg|bao nhiêu ml|mấy gói|cách nhau mấy tiếng|uống mấy)\b/);
const STOP = VN(/\b(ngưng thuốc|ngưng uống|bỏ thuốc|nghỉ thuốc|dừng thuốc lại|dùng thuốc lại|tự ngưng|quên uống|quên liều|quên thuốc|uống bù|uống thiếu|hết thuốc)\b/);
const SIDE = VN(/\b(tác dụng phụ|phản ứng phụ|có hại gì|hại gan|hại thận|hại dạ dày|có gây nghiện)\b/);
const WHAT = VN(/\b(là thuốc gì|thuốc gì vậy|là gì|trị gì|chữa gì|trị bệnh gì|chữa bệnh gì|để làm gì|dùng để làm gì|tác dụng gì|công dụng|có tác dụng)\b/);
const WHICH = VN(/\b(uống thuốc gì|thuốc gì|thuốc nào|mua thuốc gì|dùng thuốc gì|có thuốc nào|uống gì cho (đỡ|hết|khỏi|bớt)|bôi thuốc gì|xịt thuốc gì|nhỏ thuốc gì)\b/);
const ASKS = VN(/\b(không|ko|k|được|sao|gì|nào|thế nào|bao nhiêu|mấy|hả|ha|nhỉ|chưa)\b/);
// Hỏi CÓ NÊN dùng thuốc không ("có nên uống kháng sinh không", "uống thuốc ngủ được không").
const SHOULD = VN(/\b(có nên|nên|có cần|cần|có được|được) (uống|dùng|mua|xài|tiêm|chích|bôi|xịt|nhỏ)\b|\b(uống|dùng|xài|tiêm|chích|bôi)( \S+){1,3} (được không|dc không|đc không|được ko|có sao không|có được không|có nên không|được chưa)\b/);
const RX_ONLY = VN(/\b(kháng sinh|thuốc ngủ|thuốc an thần|corticoid|thuốc giảm đau mạnh)\b/);
const ALCOHOL = VN(/\b(rượu|bia|nhậu)\b/);

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** Tên thuốc người dùng gõ (để nhắc lại đúng chữ họ hỏi) — chỉ lấy khi đứng ở vị trí tên: "X là thuốc gì", "thuốc X trị gì". */
function nameOf(raw: string): string | undefined {
  const t = raw.normalize("NFC").replace(/[?!.…]+/g, " ").replace(/\s+/g, " ").trim();
  const m =
    t.match(VR(/^(?:cho (?:a|anh|e|em|c|chị|mình|tui|tôi) hỏi |(?:a|anh|e|em|c|chị|mình|tui|tôi) hỏi )?(?:thuốc\s+)?([\p{L}\d][\p{L}\d-]{2,24}(?:\s[\p{L}\d-]{2,16})?)\s+(?:là\s+thuốc\s+gì|có\s+tác\s+dụng\s+phụ|trị\s+(?:bệnh\s+)?gì|chữa\s+(?:bệnh\s+)?gì|dùng\s+để\s+làm\s+gì)/iu)) ??
    t.match(VR(/thuốc\s+([\p{L}\d][\p{L}\d-]{2,24})\s+(?:là\s+gì|là\s+thuốc\s+gì|trị|chữa|có\s+tác\s+dụng|dùng\s+để|uống\s+sao)/iu));
  const n = m?.[1]?.trim();
  if (!n || VR(/^(này|đó|kia|ấy|gì|nào|đang|bác|em|anh|chị|mình|của|thuốc|loại|cái|viên|trị|chữa)(\s|$)/iu).test(n)) return undefined;
  // "thuốc gout là gì" — sau chữ "thuốc" là TÊN BỆNH, không phải tên thuốc.
  if (healthSubjectOf(n, true)) return undefined;
  return n;
}

// 11/10 — "Uống aspirin để làm gì" (không có chữ "thuốc"): tên đứng sau một ĐỘNG TỪ DÙNG THUỐC (uống / tiêm / bôi / xịt / nhỏ / ngậm)
// và câu hỏi nó dùng để làm gì → vẫn là hỏi về thuốc đó. Không có danh sách tên thuốc, nên chỉ nhận khi tên là CHỮ NGOẠI LAI
// (không phải một tiếng Việt: "aspirin", "omeprazol", "collagen") — "uống nước / uống bia / uống trà để làm gì" không lọt vào đây.
const VI_SYL = VR(/^(ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|[bcdghklmnpqrstvx])?(uye|uya|uyu|oai|oay|oeo|uay|uoi|uou|ieu|yeu|ai|ao|au|ay|eo|eu|ia|ie|iu|oa|oe|oi|oo|ua|ue|ui|uo|uu|uy|ye|[aeiouy])(ng|nh|ch|[cmnpt])?$/);
const isForeign = (w: string) => VR(/^[a-z][a-z0-9-]{3,24}$/i).test(w) && !VI_SYL.test(w.toLowerCase());
function takenNameOf(raw: string): string | undefined {
  const t = raw.normalize("NFC").replace(/[?!.…]+/g, " ").replace(/\s+/g, " ").trim();
  const m = t.match(
    VR(/^(?:(?:cho )?(?:a|anh|e|em|c|chị|mình|tui|tôi) hỏi |vậy |thế |còn |mà |ủa )*(?:(?:a|anh|e|em|c|chị|mình|tui|tôi|người ta|bác sĩ kê) )?(?:uống|tiêm|chích|bôi|thoa|xịt|nhỏ|ngậm)\s+(?:thuốc\s+)?([\p{L}\d][\p{L}\d-]{3,24}(?:\s(?!(?:để|làm|có|là|thì|trị|chữa|tác|công)\s)[\p{L}\d-]{1,12})?)\s+(?:là\s+)?(?:để\s+làm\s+(?:gì|chi)|để\s+chi|làm\s+gì|(?:có\s+)?(?:tác|công)\s+dụng\s+gì|trị\s+(?:bệnh\s+)?gì|chữa\s+(?:bệnh\s+)?gì)/iu),
  );
  const n = m?.[1]?.trim();
  if (!n || !isForeign(n.split(" ")[0])) return undefined;
  if (healthSubjectOf(n, true)) return undefined;
  return n;
}
// Tên ngoại lai + hỏi công dụng mà không có động từ đứng trước: "omeprazol trị gì", "berberin uống để làm gì".
// loose (đang nói chuyện sức khoẻ / vừa nói về một thuốc): nhận cả "omeprazol để làm gì", "omeprazol có tác dụng gì".
function bareNameOf(raw: string, loose: boolean): string | undefined {
  const t = raw.normalize("NFC").replace(/[?!.…]+/g, " ").replace(/\s+/g, " ").trim();
  const strict = "(?:trị|chữa)\\s+(?:bệnh\\s+)?gì|(?:uống|bôi|thoa|tiêm|chích|xịt|nhỏ|ngậm)\\s+(?:vào\\s+)?(?:là\\s+)?(?:để\\s+làm\\s+(?:gì|chi)|để\\s+chi|làm\\s+gì)";
  const more = "|(?:dùng\\s+)?để\\s+làm\\s+(?:gì|chi)|(?:có\\s+)?(?:tác|công)\\s+dụng\\s+gì";
  const m = t.match(VR(new RegExp(`^(?:(?:cho )?(?:a|anh|e|em|c|chị|mình|tui|tôi) hỏi |vậy |thế |còn |mà |ủa )*([\\p{L}\\d][\\p{L}\\d-]{3,24}(?:\\s(?!(?:để|làm|có|là|thì|trị|chữa|uống|dùng|bôi|thoa|tiêm|chích|xịt|nhỏ|ngậm|tác|công)\\s)[\\p{L}\\d-]{1,12})?)\\s+(?:thì\\s+)?(?:${strict}${loose ? more : ""})`, "iu")));
  const n = m?.[1]?.trim();
  if (!n || !isForeign(n.split(" ")[0])) return undefined;
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
  if (ctx.afterOverdose && words <= 9 && !/\?/.test(text) && VN(/\b(bình thường|chưa thấy gì|không thấy gì|không sao|vẫn ổn|vẫn khoẻ|chưa bị gì|không bị gì)\b/).test(n))
    return {
      kind: "overdose",
      urgent: true,
      text: "Lúc này thấy bình thường thì cũng chưa chắc là ổn đâu — triệu chứng ngộ độc thuốc có thể vài giờ, thậm chí vài ngày sau mới xuất hiện. Lomi không biết đó là thuốc gì nên không nói được là an toàn; bạn vẫn nên gọi **115** hoặc hỏi ngay bác sĩ / dược sĩ, đọc cho họ tên thuốc, số viên và giờ uống. Trong lúc đó đừng ở một mình nha.",
    };
  if (ctx.afterOverdose && words <= 8 && !/\?/.test(text) && VN(/\b(\d+|một|hai|ba|mấy|vài|nửa) (viên|gói|ống|muỗng|ml|mg|lọ|vỉ)\b|\b(mới uống|vừa uống|lúc nãy|hồi nãy|sáng nay|tối qua|không biết thuốc gì|không nhớ)\b/).test(n))
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
  //   (11/10: câu nhắc HAI thuốc đều có mục — "paracetamol uống chung với aspirin" — thì bản ghi tương tác có thể nằm ở mục của thuốc
  //   nào cũng được: lấy mục có bản ghi cho đúng cặp đó.)
  const paired = findDrugs(text).find((d) => findInteraction(d, text));
  const known = paired ?? findDrug(text) ?? (ctx.drugId && words <= 9 ? drugById(ctx.drugId) : null);
  // 12/10: vừa nghe Lomi nói về một thuốc mà hỏi "có nguồn không", "lấy ở đâu ra" → đưa đủ nguồn (kèm đường dẫn); thuốc chưa có mục thì
  //   nói rõ chính vì chưa có nguồn nên Lomi mới không trả lời.
  if (ctx.afterDrug && words <= 9 && VN(/\b(nguồn|lấy (ở|từ) đâu|ở đâu ra|dựa vào đâu|tin được không|có chắc không|ai nói)\b/).test(n)) {
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
  if ((INTERACT.test(n) || !!hit0) && (med || !!known || !!ctx.afterDrug || VN(/\b(\S+) (uống|dùng) (chung|cùng|kèm) (với )?\S+/).test(n)) && ASKS.test(n)) {
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
  if (ctx.afterDrug && words <= 9 && VN(/\b(trẻ em|trẻ con|trẻ nhỏ|em bé|con nít|cho bé|bé uống|con uống)\b/).test(n) && ASKS.test(n)) {
    const d = ctx.drugId ? drugById(ctx.drugId) : null;
    return d
      ? { kind: "kid", drugId: d.id, name: d.names[0], text: renderDrug(d, "children") }
      : { kind: "kid", name: ctx.name, text: `Lomi chưa có dữ liệu đã kiểm chứng để nói ${ctx.name ? `**${ctx.name}**` : "thuốc đó"} trẻ em dùng được hay không. Thuốc cho trẻ phải theo tuổi và cân nặng — bạn hỏi dược sĩ / bác sĩ kèm tuổi, cân nặng của bé, và đừng tự chia thuốc của người lớn cho bé nha.` };
  }
  // "uống trước hay sau ăn", "uống mấy ngày" — cách dùng cũng tuỳ từng thuốc.
  if (VN(/\b(cách nhau (bao lâu|mấy giờ|mấy tiếng)|cách (mấy|bao nhiêu) (giờ|tiếng)|bao lâu uống (một|1) lần|mấy tiếng uống (một|1) lần|trước hay sau (khi )?ăn|uống (trước|sau) (khi )?ăn|uống lúc nào|uống khi nào|uống buổi nào|uống sáng hay tối|uống (trong )?(bao lâu|mấy ngày|mấy tuần)|(uống|dùng|xài) (sao|thế nào|như thế nào|như nào|làm sao)|cách (uống|dùng|xài))\b/).test(n) && (med || ctx.inHealth || ctx.afterDrug))
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
  if ((SIDE.test(n) && (med || !!name)) || (ctx.afterDrug && VN(/\b(có hại không|có hại gì|có sao không|có ảnh hưởng gì|có nguy hiểm không|có tốt không)\b/).test(n) && words <= 7))
    return {
      kind: "side",
      name,
      text: `Lomi chưa có dữ liệu đã kiểm chứng về ${name ? `**${name}**` : "thuốc này"}, nên không liệt kê bừa tác dụng phụ được.\n• ${ASK_PHARM}\n• Dù là thuốc gì: uống vào mà nổi mẩn, ngứa nhiều thì ngưng và đi khám; **khó thở, sưng môi / lưỡi / họng, choáng váng thì gọi 115 ngay**.`,
    };

  // Tên đứng sau động từ dùng thuốc ("uống aspirin để làm gì") cũng là hỏi về chính thuốc đó, dù câu không có chữ "thuốc".
  const taken = takenNameOf(text) ?? bareNameOf(text, !!ctx.inHealth || !!ctx.afterDrug);
  if ((named && WHAT.test(n) && VN(/\b(thuốc)\b/).test(n)) || taken)
    return {
      kind: "what",
      name: taken ?? named,
      text: `Lomi chưa có dữ liệu đã kiểm chứng về **${taken ?? name}**, nên không dám nói đại là thuốc gì, trị gì hay dùng thế nào — nói sai chuyện thuốc thì nguy hiểm lắm.\n• ${ASK_PHARM}\n• Nếu là thuốc bác sĩ kê${forWho}, hỏi lại bác sĩ thuốc đó để làm gì và uống bao lâu.`,
    };

  // Vừa hỏi chuyện thuốc rồi nói thêm hoàn cảnh ("e đang cho con bú", "a đang mang thai") → càng phải hỏi bác sĩ trước.
  if (ctx.afterDrug && words <= 8 && VN(/\b(cho con bú|mang thai|có bầu|có thai|đang bầu)\b/).test(n))
    return {
      kind: "should",
      med: true,
      text: "Đang mang thai hoặc cho con bú thì càng phải hỏi bác sĩ / dược sĩ **trước khi** uống bất kỳ thuốc gì nha — phần lớn thuốc uống khi mang thai đi qua nhau thai tới em bé, và một lượng nhỏ thuốc có thể qua sữa mẹ (theo NHS). Lomi không có dữ liệu để nói thuốc nào an toàn cho giai đoạn này, nên bạn nói rõ hoàn cảnh với người kê / bán thuốc để họ chọn loại phù hợp.",
    };
  // "có nên uống kháng sinh không", "uống thuốc ngủ được không" — Lomi không quyết thay; thuốc kê đơn thì không tự mua uống.
  if (SHOULD.test(n) && (med || RX_ONLY.test(n) || (ctx.inHealth && VN(/\b(uống|dùng|xài|tiêm|chích)\b/).test(n))) && ASKS.test(n) && words <= 14)
    return {
      kind: "should",
      med: med || RX_ONLY.test(n),
      text: `Có nên dùng thuốc hay không thì phải người khám trực tiếp mới quyết được${forWho} — Lomi không kê thuốc và cũng không có dữ liệu riêng về thuốc đó.${RX_ONLY.test(n) ? "\n\nRiêng kháng sinh, thuốc ngủ, thuốc an thần là thuốc cần bác sĩ kê đơn — đừng tự mua uống; dùng sai dễ không khỏi mà còn gặp tác dụng phụ." : ""}\n\n${ASK_PHARM}`,
    };

  // "uống thuốc gì (được)?", "thuốc nào tốt?" — Lomi không kê thuốc; đang kể triệu chứng thì nói theo đúng mạch đó.
  if (WHICH.test(n) && !VN(/\b(là thuốc gì)\b/).test(n) && words <= 14) {
    const about = ctx.label ? `${cap(ctx.label)} thì ` : "";
    return {
      kind: "which",
      text: `${about}Lomi không kê thuốc được${forWho} — thuốc nào hợp còn tuỳ nguyên nhân, tuổi, bệnh nền và thuốc khác đang dùng.\n• Ra nhà thuốc kể rõ triệu chứng (bị gì, bao lâu, mức độ) để dược sĩ tư vấn; ${who ? `${who} ` : ""}đang có bệnh nền, mang thai hoặc là trẻ nhỏ thì nói luôn.\n• Uống 1–2 ngày không đỡ, hoặc nặng lên, thì đi khám chứ đừng đổi thuốc liên tục.`,
    };
  }
  return null;
}
