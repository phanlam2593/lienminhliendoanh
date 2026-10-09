// ─────────────────────────────────────────────────────────────────────────────
// AN TOÀN TRONG MỐI QUAN HỆ (11/10) — chạy trên máy, không gọi AI.
//
// Lỗi cần sửa (role-play 11/10): người dùng kể bị kiểm soát, bị doạ, bị đánh mà Lomi đáp như chuyện phiếm —
//   "bạn trai e hay kiểm tra điện thoại e" → "Lomi nghe nè, em kể thêm chút được không?"
//   "không cho e đi chơi với bạn"         → "Ra là vậy 😄 Kể tiếp đi"
//   "ảnh còn doạ đánh e"                  → "Ra là vậy 😄"
//   "chồng e đánh e"                      → "Lomi nghe nè 🌿"
// Bài "mối quan hệ độc hại" của thư viện tâm sự có sẵn nhưng chỉ nhận vài cụm cố định ("đánh mình", "bị kiểm soát").
//
// File này đọc theo CẤU TRÚC: ai làm (người yêu / vợ chồng / người nhà — hoặc đang nói dở về người đó) + làm gì (đánh / doạ / kiểm soát)
// + với ai (chính người kể, hay một người khác trong nhà). Ba mức:
//   violence  bị đánh / bạo hành            → an toàn trước hết: 113, 115, người tin cậy, đường dây hỗ trợ
//   threat    bị doạ đánh / doạ giết…       → như trên
//   control   bị kiểm tra điện thoại, cấm gặp bạn bè, giữ tiền… → gọi đúng tên chuyện đó, hỏi han, hỏi một câu về an toàn
// Lomi không phán "phải chia tay", không ép tha thứ hay làm lành — chỉ nói rõ đó không phải lỗi của người kể và chỉ đường tới nơi giúp được.
// Số điện thoại: 113 (công an), 115 (cấp cứu), 111 (tổng đài bảo vệ trẻ em), 1900 969 680 (Ngôi nhà Bình yên – Hội Liên hiệp Phụ nữ
// Việt Nam; kiểm tra lại ngày 09/10/2026 qua báo chí chính thống). Không ghi giờ hoạt động / "miễn phí" cho số 1900 vì chưa kiểm chứng được.
// ─────────────────────────────────────────────────────────────────────────────
import { P, negated, txt, type Txt } from "@/lib/lomiStory";
import { YOU_MARK, type Frame } from "@/lib/lomiParse";
import type { Addr } from "@/lib/lomiAddress";

export type HarmKind = "violence" | "threat" | "control";
export type Harm = {
  kind: HarmKind;
  /** Người bị: chính người kể, hay một người khác ("mẹ anh", "bạn em"). */
  victim: "self" | "other";
  /** Người bị, khi đó là người khác ("con em", "bạn em") — để lời đáp nói đúng người. */
  whom?: string;
  /** Người gây ra, nếu câu có nêu ("bạn trai bạn", "chồng bạn") — để lượt sau nói tiếp vẫn biết đang nói về ai. */
  actor?: string;
  /** Chuyện xảy ra giữa bạn bè / ở trường ("con e bị bạn đánh ở trường") — lời khuyên khác hẳn bạo lực trong nhà: báo thầy cô, nhà trường, 111. */
  setting?: "school";
};
export type SafetyReply = { text: string; harm: Harm };

const SELF = "(?:e|em|a|anh|c|chị|mình|tui|tôi|tớ|t|con|cháu)";
const SELF_B = "(?:e|em|a|anh|c|chi|minh|tui|toi|to|t|con|chau)";
const PARTNER = "(?:chồng|vợ|bạn trai|bạn gái|người yêu cũ|người yêu|ny|bồ|ảnh|ổng|bả|ẻm|anh ấy|anh ta|cô ấy|cô ta|ông ấy|bà ấy|hắn|thằng đó|nó)";
const PARTNER_B = "(?:chong|vo|ban trai|ban gai|nguoi yeu cu|nguoi yeu|ny|anh ay|anh ta|co ay|co ta|ong ay|ba ay|han|thang do|no)";
const KIN = "(?:ba|bố|cha|mẹ|má|dượng|chú|bác|anh trai|ông|bà|mẹ chồng|ba chồng|bố chồng|mẹ vợ|sếp|thầy|cô giáo)";
// (gõ không dấu thì "ba", "bo", "ma", "me", "ong"… trùng quá nhiều chữ khác → chỉ nhận những cách gọi không lẫn được)
const KIN_B = "(?:cha|duong|anh trai|me chong|ba chong|bo chong|me vo|ba toi|ba e|ba em|ba a|bo e|bo em|bo a|me e|me em|me a|sep)";
const HIT = "(?:đánh đập|bạo hành|bạo lực|đánh|tát|đấm|đạp|bóp cổ|túm tóc|xô ngã|hành hạ|ném đồ vào|cầm dao|đập đầu)";
const HIT_B = "(?:danh dap|bao hanh|bao luc|danh|tat|dam|dap|bop co|tum toc|xo nga|hanh ha|nem do vao|cam dao|dap dau)";
// "đánh" + một thứ không phải người ("đánh cầu lông", "đánh răng", "đánh giá"…) không phải đánh người.
const NOT_HIT = "(?! (?:cầu|bóng|banh|bài|răng|giá|máy|đàn|trống|golf|tennis|game|thức|dấu|vần|rơi|mất|liều|lừa|số|bida|bi-a|cờ|bạc|nhau|son|phấn|móng))";
const NOT_HIT_B = "(?! (?:cau|bong|banh|bai|rang|gia|may|dan|trong|golf|tennis|game|thuc|dau|van|roi|mat|lieu|lua|so|bida|co|bac|nhau|son|phan|mong))";

// Bị đánh: "X đánh e", "e bị (chồng) đánh", "chồng e hay đánh đập", "bị bạo hành".
const V_OBJ = P(`${HIT}${NOT_HIT} ${SELF}`, `${HIT_B}${NOT_HIT_B} ${SELF_B}`);
const V_PASSIVE = P(`bị (?:\\S+ ){0,3}?${HIT}${NOT_HIT}|bị bạo hành|bị bạo lực|bạo lực gia đình|bạo hành gia đình`, `bi (?:\\S+ ){0,3}?${HIT_B}${NOT_HIT_B}|bi bao hanh|bi bao luc|bao luc gia dinh|bao hanh gia dinh`);
const V_ACTOR = P(`(?:${PARTNER}|${KIN})(?: ${SELF})?(?: \\S+){0,3} ${HIT}${NOT_HIT}`, `(?:${PARTNER_B}|${KIN_B})(?: ${SELF_B})?(?: \\S+){0,3} ${HIT_B}${NOT_HIT_B}`);
// Bị doạ: "doạ đánh e", "hăm giết", "đe doạ tung ảnh".
const THREAT = P(
  `(?:doạ|dọa|hăm doạ|hăm dọa|hăm|đe doạ|đe dọa|đòi)(?: \\S+){0,2} (?:đánh|giết|chém|đâm|tạt axit|tung ảnh|tung clip|tung hình|đuổi ra khỏi nhà|từ mặt|bắt con)|(?:doạ|dọa|hăm doạ|hăm dọa|đe doạ|đe dọa) ${SELF}|bị (?:đe doạ|đe dọa|hăm doạ|hăm dọa|doạ|dọa)`,
  `(?:doa|ham doa|ham|de doa|doi)(?: \\S+){0,2} (?:danh|giet|chem|dam|tat axit|tung anh|tung clip|tung hinh|duoi ra khoi nha|tu mat|bat con)|(?:doa|ham doa|de doa) ${SELF_B}|bi (?:de doa|ham doa|doa)`,
);
// Chuyện ở trường / giữa bạn bè: "ở trường", "trong lớp", "bạn học", "bị (mấy) bạn đánh" (không phải "bị bạn trai đánh").
const SCHOOL = P(
  `(?:ở|trong|tại) (?:trường|lớp)|bạn học|cùng lớp|cùng trường|bắt nạt|bị (?:mấy |tụi |đám |lũ |các )?bạn(?! trai| gái)(?: bè| học)? ${HIT}`,
  `(?:o|trong|tai) (?:truong|lop)|ban hoc|cung lop|cung truong|bat nat|bi (?:may |tui |dam |lu |cac )?ban(?! trai| gai)(?: be| hoc)? ${HIT_B}`,
);
// Bị kiểm soát: kiểm tra điện thoại, cấm đi / gặp / làm, theo dõi, giữ tiền – giấy tờ, đòi mật khẩu.
const CONTROL = P(
  `(?:kiểm tra|coi|xem|đọc|lục|soi|check)(?: lén| trộm)? (?:điện thoại|tin nhắn|zalo|facebook|messenger|máy|đt)(?: của)? ${SELF}|(?:không cho|ko cho|k cho|cấm|không muốn cho|chẳng cho) ${SELF}(?: \\S+){0,2} (?:đi|gặp|chơi|làm|học|mặc|nói chuyện|liên lạc|ra ngoài|kết bạn|về)|bắt ${SELF}(?: \\S+){0,2} (?:nghỉ|xoá|xóa|ở nhà|báo cáo|đưa|chặn|block|bỏ)|kiểm soát ${SELF}|${SELF} bị kiểm soát|theo dõi ${SELF}|định vị ${SELF}|giữ (?:hết )?(?:tiền lương|tiền|lương|giấy tờ|điện thoại|thẻ)(?: của)? ${SELF}|đòi (?:mật khẩu|pass)`,
  `(?:kiem tra|coi|xem|doc|luc|soi|check)(?: len| trom)? (?:dien thoai|tin nhan|zalo|facebook|messenger|may|dt)(?: cua)? ${SELF_B}|(?:khong cho|ko cho|k cho|cam|khong muon cho|chang cho) ${SELF_B}(?: \\S+){0,2} (?:di|gap|choi|lam|hoc|mac|noi chuyen|lien lac|ra ngoai|ket ban|ve)|bat ${SELF_B}(?: \\S+){0,2} (?:nghi|xoa|o nha|bao cao|dua|chan|block|bo)|kiem soat ${SELF_B}|${SELF_B} bi kiem soat|theo doi ${SELF_B}|dinh vi ${SELF_B}|giu (?:het )?(?:tien luong|tien|luong|giay to|dien thoai|the)(?: cua)? ${SELF_B}|doi (?:mat khau|pass)`,
);
const NEG_IN = / (chưa|không|ko|chẳng|chả|hông|hổng|chua|khong|chang|đâu có|dau co) /u;
const HAS_PARTNER = P(PARTNER, PARTNER_B);
const HAS_KIN = P(KIN, KIN_B);
// Câu giả định / đùa / kể phim — không phải chuyện đang xảy ra với người kể.
const NOT_REAL = P("trong phim|xem phim|đọc truyện|trong truyện|trong game|nhân vật|giỡn|đùa|nói chơi|ví dụ|giả sử");

const youOf = (addr?: Addr | null) => (addr === "anh" || addr === "chị" || addr === "em" ? addr : "bạn");
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export type SafetyCtx = {
  addr?: Addr | null;
  /** Đang nói dở chuyện này (lượt trước Lomi đã đáp một câu an toàn) — câu lược chủ ngữ ("không cho e đi chơi với bạn") vẫn là kể tiếp. */
  inHarm?: Harm;
};

/** Câu có kể chuyện bị đánh / bị doạ / bị kiểm soát không. Trả null nếu không (hoặc câu phủ định: "ảnh chưa bao giờ đánh e"). */
export function harmOf(raw: string, f: Frame | null, ctx: SafetyCtx = {}): Harm | null {
  const h = harmOf0(raw, f, ctx);
  if (h && h.kind !== "control" && (SCHOOL(txt(raw)) || ctx.inHarm?.setting === "school")) h.setting = "school";
  return h;
}
function harmOf0(raw: string, f: Frame | null, ctx: SafetyCtx): Harm | null {
  const t: Txt = txt(raw);
  if (!t.words || t.words > 28 || NOT_REAL(t)) return null;
  const you = youOf(ctx.addr);
  // Người gây ra: chủ ngữ của câu (nếu là người khác), không có thì người đang được nhắc từ lượt trước.
  const subj = f && f.subject === "third" && f.subjectText ? f.subjectText.split(YOU_MARK).join(you) : undefined;
  const actor = subj ?? ctx.inHarm?.actor;
  const partnerish = !!HAS_PARTNER(t) || !!ctx.inHarm;
  const hit = (m: RegExpMatchArray | null) => (m && !negated(t, m) ? m : null);

  // Người KỂ là người làm ("a lỡ doạ đánh nó") thì không phải chuyện người kể bị hại → để lớp khác đáp.
  const body = t.loose ? t.b : t.s;
  const selfActs = f?.subject === "self" && !/ (bị|bi) /.test(body);
  // "ảnh còn doạ đánh e" là bị DOẠ (chưa bị đánh) → xét trước, để lời đáp nói đúng chuyện.
  const th0 = hit(THREAT(t));
  if (th0 && !selfActs && !/(?:^| )(bị|bi) (?:\S+ ){0,2}(?:đánh|danh|tát|tat|đấm|dam)(?: |$)/u.test(body.slice(0, th0.index ?? 0))) return { kind: "threat", victim: "self", actor };
  const vObj = hit(V_OBJ(t));
  const vPas = hit(V_PASSIVE(t));
  // "ảnh CHƯA BAO GIỜ đánh e" — từ phủ định nằm GIỮA người làm và việc làm → không phải kể chuyện bị đánh.
  const vAct0 = hit(V_ACTOR(t));
  const vAct = vAct0 && !NEG_IN.test(` ${vAct0[0]} `) ? vAct0 : null;
  if (vObj) return { kind: "violence", victim: "self", actor };
  if (vPas && !selfActs) {
    const other = f?.subject === "third" && f.subjectCls !== "partner";
    return { kind: "violence", victim: other ? "other" : "self", actor: other ? undefined : actor, whom: other ? subj : undefined };
  }
  if (vAct && !selfActs) {
    // "ba a hay đánh mẹ a" — sau động từ là một người khác trong nhà → người bị là người đó; "chồng e hay đánh đập" → chính người kể.
    const after = body.slice((vAct.index ?? 0) + vAct[0].length).trim().split(" ")[0] ?? "";
    const other = /^(mẹ|má|ba|bố|con|chị|bà|vợ|em|me|ma|bo|chi|vo|cháu|chau)$/u.test(after);
    return { kind: "violence", victim: other ? "other" : "self", actor };
  }
  const th = hit(THREAT(t));
  if (th && !selfActs) return { kind: "threat", victim: "self", actor };
  // Kiểm soát: chỉ tính khi người làm là người yêu / vợ chồng (cha mẹ cấm con đi chơi là chuyện khác — thư viện tâm sự có bài riêng).
  const c = hit(CONTROL(t));
  if (c && partnerish && !(HAS_KIN(t) && !HAS_PARTNER(t) && !ctx.inHarm)) return { kind: "control", victim: "self", actor };
  return null;
}

const SAFE_Q = "Hiện giờ bạn có đang ở chỗ an toàn không?";
const HELP = (other: boolean) =>
  [
    `• ${other ? "Nếu người đó đang gặp nguy hiểm" : "Đang nguy hiểm ngay lúc này"}: ${other ? "" : "rời khỏi chỗ đó nếu được và "}gọi **113**; có người bị thương thì gọi **115**.`,
    `• ${other ? "Giúp người đó nói chuyện với" : "Kể cho"} một người tin cậy (người thân, bạn bè) — đừng ${other ? "để họ giữ" : "giữ"} một mình.`,
    "• Cần người tư vấn hay chỗ tạm lánh: đường dây nóng **Ngôi nhà Bình yên 1900 969 680** (Hội Liên hiệp Phụ nữ Việt Nam) hỗ trợ phụ nữ và trẻ em bị bạo lực; dưới 18 tuổi có thể gọi **111**.",
  ].join("\n");

/** Lời đáp cho một câu kể chuyện bị đánh / doạ / kiểm soát. mirror = mẩu nhắc lại điều vừa nghe (đã đổi ngôi), nếu có. */
export function harmReply(h: Harm, ctx: SafetyCtx & { mirror?: string | null; said?: string[] } = {}): SafetyReply {
  const prev = ctx.inHarm;
  const said = (x: string) => (ctx.said ?? []).some((s) => s.includes(x));
  const head = ctx.mirror ? `${cap(ctx.mirror)} hả 🥺 ` : "";
  if (h.kind === "control") {
    // Lượt đầu: gọi tên chuyện đó + hỏi han. Lượt sau: nói về việc bị tách khỏi bạn bè / người thân + một câu hỏi về an toàn.
    if (!prev)
      return {
        harm: h,
        text: `${head}Bị người mình thương kiểm tra, quản từng chút như vậy thì ngột ngạt lắm. Quan tâm khác với kiểm soát: quan tâm là hỏi han, còn kiểm soát là khiến mình phải xin phép, phải giấu, phải sợ.\n\nChuyện này diễn ra lâu chưa, và mỗi lần như vậy bạn thấy sao?`,
      };
    return {
      harm: { ...h, actor: h.actor ?? prev.actor },
      text: `${head}Mấy chuyện này cộng lại là đáng để ý đó — khi bị tách dần khỏi bạn bè, người thân thì mình dễ thấy cô lập và khó nhờ ai hơn. Bạn cố giữ liên lạc với một người bạn tin nha.\n\n${said("nặng lời hay doạ nạt") ? "Bạn muốn Lomi gợi ý cách nói ra ranh giới của mình, hay chỉ cần có người nghe thôi?" : "Ngoài mấy chuyện này, người đó có bao giờ nặng lời hay doạ nạt bạn không?"}`,
    };
  }
  const other = h.victim === "other";
  const whom = h.whom ?? prev?.whom;
  // Bị bạn bè đánh / doạ ở trường: việc cần làm là xem vết thương, nghe kể, ghi lại và báo nhà trường — không phải "chỗ tạm lánh".
  if (h.setting === "school") {
    const keep: Harm = { ...h, actor: h.actor ?? prev?.actor, whom };
    const w = other ? (whom ?? "người đó") : "bạn";
    if (prev?.setting === "school" && said("giáo viên chủ nhiệm"))
      return { harm: keep, text: `${head}Nghe mà Lomi lo. Chuyện lặp lại như vậy thì càng cần người lớn và nhà trường vào cuộc sớm — ${other ? "bạn" : "bạn nhớ"} ghi lại từng lần nha.\n\nNhà trường đã biết chuyện này chưa bạn?` };
    return {
      harm: keep,
      text: [
        `${head}${other ? `Nghe mà Lomi lo cho ${w}.` : "Lomi lo cho bạn lắm."} Bị bạn bè ${h.kind === "threat" ? "doạ" : "đánh"} là chuyện nghiêm trọng, và **không phải lỗi của ${other ? "người bị " + (h.kind === "threat" ? "doạ" : "đánh") : "bạn"}** — dù bên kia đưa ra lý do gì.`,
        other
          ? `Việc nên làm trước:\n• Xem ${w} có bị thương không — đau nhiều, sưng, choáng thì đưa đi khám; nguy cấp gọi **115**.\n• Nghe kể hết, đừng trách “sao không đánh lại”, “sao không nói sớm” — để ${w} thấy kể ra là an toàn.\n• Ghi lại ngày giờ, ai làm, chụp lại vết thương, rồi báo giáo viên chủ nhiệm / nhà trường để họ xử lý.\n• Cần hỏi thêm về bảo vệ trẻ em: gọi **111** (Tổng đài quốc gia bảo vệ trẻ em, miễn phí, 24/24).`
          : "Việc nên làm trước:\n• Bị thương, đau nhiều thì nhờ người lớn đưa đi khám; nguy cấp gọi **115**.\n• Kể cho một người lớn bạn tin (ba mẹ, giáo viên chủ nhiệm) — đừng chịu một mình, và đừng tự đi trả đũa.\n• Giữ lại bằng chứng: tin nhắn, hình ảnh, vết thương.\n• Dưới 18 tuổi có thể gọi **111** (Tổng đài quốc gia bảo vệ trẻ em, miễn phí, 24/24).",
        `${other ? cap(w) : "Bạn"} có bị thương ở đâu không${other ? " bạn" : ""}?`,
      ].join("\n\n"),
    };
  }
  const what = h.kind === "threat" ? "Bị doạ như vậy" : other ? (whom ? `${cap(whom)} bị đánh` : "Có người thân bị đánh") : "Bị đánh";
  // Đã đưa số điện thoại ở lượt trước rồi thì không lặp lại cả danh sách.
  if (prev && (prev.kind === "violence" || prev.kind === "threat") && said("1900 969 680"))
    return { harm: { ...h, actor: h.actor ?? prev.actor }, text: `${head}Nghe mà Lomi lo. ${other ? "Người đó" : "Bạn"} không đáng bị đối xử như vậy. Mấy số Lomi gửi ở trên bạn giữ lại nha — thấy không an toàn là gọi liền, đừng chờ.\n\n${other ? "Bạn có ở gần để ở cạnh người đó lúc này không?" : "Có ai ở gần mà bạn tin, có thể qua với bạn hoặc cho bạn ở nhờ không?"}` };
  return {
    harm: { ...h, actor: h.actor ?? prev?.actor },
    text: [
      `${head}${other ? `Nghe mà Lomi lo cho ${whom ?? "người đó"}.` : "Lomi lo cho bạn lắm."} ${what} là chuyện nghiêm trọng, và **không phải lỗi của ${other ? "người bị đánh" : "bạn"}** — dù người kia đưa ra lý do gì.`,
      `An toàn là trước hết:\n${HELP(other)}`,
      `Lomi không ép bạn phải quyết định gì ngay đâu. ${other ? "Người đó hiện giờ có đang ở chỗ an toàn không?" : SAFE_Q}`,
    ].join("\n\n"),
  };
}

/** Đang kể chuyện bị kiểm soát mà hỏi nên nói sao / muốn gợi ý cách nói ra ranh giới → một câu mẫu ngắn, không ép phải rời đi. */
const HOW_SAY = P("nói sao|nói gì|nói thế nào|nên làm gì|làm sao|làm gì|ranh giới|gợi ý|có nên", "noi sao|noi gi|noi the nao|nen lam gi|lam sao|lam gi|ranh gioi|goi y|co nen");
export function boundaryAdvice(raw: string, h: Harm, lastText: string): string | null {
  if (h.kind !== "control" || h.victim !== "self") return null;
  const t = txt(raw);
  const yesToOffer = /cách nói ra ranh giới của mình/.test(lastText) && /^(co|u|uh|um|uhm|ok|oke|duoc|muon|goi y di|da|vang)( |$)/.test(t.b.trim());
  if (!HOW_SAY(t) && !yesToOffer) return null;
  return [
    "Nói ra ranh giới thì nên ngắn, bình tĩnh, và nói về cảm giác của mình thay vì buộc tội. Ví dụ:",
    "“Mình hiểu là vì lo, nhưng bị kiểm tra như vậy làm mình thấy không được tin. Có gì lo thì cứ hỏi thẳng mình, mình sẽ trả lời.”",
    "Chọn lúc cả hai đang bình tĩnh để nói. Nếu nói rồi mà mọi chuyện vẫn vậy, hoặc người đó nổi nóng, doạ nạt, thì đó là dấu hiệu bạn cần thêm người hỗ trợ — kể với một người bạn tin nha.",
  ].join("\n\n");
}
/** Đang kể chuyện bị đánh / bị doạ mà nói mình SỢ → ở bên, nhắc giữ bằng chứng và người tin cậy; không đọc bài "thao túng". */
const FEAR = P("sợ|hoảng|run|lo quá|lo lắm|không biết làm sao|không biết phải làm sao", "so qua|so lam|dang so|hoang|run qua|lo qua|lo lam|khong biet lam sao|khong biet phai lam sao");
export function fearInHarm(raw: string, h: Harm): string | null {
  const t = txt(raw);
  if (h.victim !== "self" || h.kind === "control" || t.words > 8 || !FEAR(t)) return null;
  return "Sợ là phải rồi, ai ở trong chuyện đó cũng sợ 🥺 Bạn không phải chịu một mình đâu.\n\nVài việc nên làm ngay: giữ lại tin nhắn, hình ảnh doạ nạt làm bằng chứng (đừng xoá); nói cho một người bạn tin biết chuyện; và nếu người đó tìm tới hoặc bạn thấy nguy hiểm thì gọi **113**.\n\nBạn có ai ở gần để qua ở cùng mấy hôm này không?";
}
/** Người ngoài cuộc hỏi mình giúp được gì ("e nên làm gì để giúp", "a không biết làm sao") khi người bị bạo lực là NGƯỜI KHÁC. */
const HELP_ASK = P("nên làm gì|làm gì|làm sao|giúp|khuyên|làm thế nào|cách nào|có nên|báo công an|can thiệp", "nen lam gi|lam gi|lam sao|giup|khuyen|lam the nao|cach nao|co nen|bao cong an|can thiep");
export function helperAdvice(raw: string, h: Harm): string | null {
  if (h.victim !== "other" || !HELP_ASK(txt(raw))) return null;
  if (h.setting === "school") {
    const w = h.whom ?? "người đó";
    return [
      `Bạn muốn bảo vệ ${w} là đúng rồi 💚 Vài việc làm được:`,
      `• Gặp giáo viên chủ nhiệm trước, đưa những gì đã ghi lại; chưa ổn thì gặp ban giám hiệu.\n• Dặn ${w}: bị đụng tới thì tránh ra, tới chỗ có người lớn và báo ngay cho thầy cô — không phải chịu một mình.\n• Đừng tự tìm bên kia để dằn mặt — dễ làm chuyện rối hơn; để nhà trường và phụ huynh bên kia cùng xử lý.\n• Để ý ${w} mấy tuần tới: sợ đi học, mất ngủ, ít nói hẳn đi thì nên nhờ người tư vấn — gọi **111** để được hướng dẫn.`,
      `${cap(w)} kể chuyện này với bạn thế nào?`,
    ].join("\n\n");
  }
  return [
    "Bạn muốn giúp là quý lắm 💚 Vài điều người ở ngoài làm được:",
    "• Nghe và tin người đó, đừng trách “sao không bỏ đi” — rời khỏi một người bạo lực khó hơn mình nghĩ nhiều.\n• Giữ liên lạc đều để người đó biết lúc nào cũng có chỗ gọi; hẹn trước một tín hiệu khi cần giúp gấp.\n• Đưa cho người đó các số: **113** khi nguy hiểm, **Ngôi nhà Bình yên 1900 969 680** để được tư vấn và có chỗ tạm lánh.\n• Thấy đang bị đánh hoặc nguy hiểm tới tính mạng thì gọi **113** ngay — đó không phải là xen vào chuyện nhà người ta.",
    "Đừng tự mình đối đầu với người gây bạo lực nha, dễ nguy hiểm cho cả hai. Và chuyện này nặng với cả bạn nữa — bạn thấy sao khi chứng kiến như vậy?",
  ].join("\n\n");
}

/** Người dùng đáp câu "Hiện giờ … có đang ở chỗ an toàn không?" của Lomi. lastText = tin Lomi vừa nói (đã đổi xưng hô). */
export function safetyFollow(raw: string, lastText: string): string | null {
  const t = txt(raw);
  if (t.words > 8) return null;
  const b = t.b.trim();
  const yes = /^(co|u|uh|um|uhm|da|vang|roi|co chu|co roi|nhieu lan|hay lam|thuong xuyen)( |$)/.test(b);
  const no = /^(khong|ko|k|hong|chua|chua bao gio|khong co)( |$)/.test(b);
  // Lomi vừa hỏi "người đó có bao giờ nặng lời hay doạ nạt … không?"
  if (/nặng lời hay doạ nạt \S+ không\?\s*$/.test(lastText.trim())) {
    if (yes) return `Vậy là ngoài chuyện bị quản, bạn còn bị nặng lời, doạ nạt nữa — điều đó không ổn chút nào, và **không phải lỗi của bạn**.\n\nAn toàn là trước hết:\n${HELP(false)}\n\n${SAFE_Q}`;
    if (no) return "Vậy cũng đỡ một phần 💚 Nhưng bị quản từng chút vẫn là điều bạn có quyền không chấp nhận.\n\nBạn muốn Lomi gợi ý cách nói ra ranh giới của mình, hay chỉ cần có người nghe thôi?";
    return null;
  }
  // Lomi vừa hỏi "… có bị thương ở đâu không?" (chuyện bị bạn bè đánh ở trường).
  if (/có bị thương ở đâu không(?: \S+)?\?\s*$/.test(lastText.trim())) {
    const tail = "Chuyện này xảy ra lần đầu hay đã nhiều lần rồi bạn?";
    if (no) return `Không bị thương là đỡ lo một phần 💚 Nhưng chuyện này vẫn cần người lớn và nhà trường biết để không lặp lại.\n\n${tail}`;
    if (yes || /(dau|sung|bam|tim|chay mau|tray|xuoc|gay|u dau|rach)/.test(b))
      return `Vậy nên đi khám sớm cho yên tâm, và giữ lại giấy khám để khi làm việc với nhà trường có căn cứ rõ ràng. Bị đánh vào đầu mà sau đó đau đầu nhiều, nôn, lơ mơ thì đi viện ngay nha.\n\n${tail}`;
    return null;
  }
  // Lomi vừa hỏi "có ai ở gần … ở cùng / cho ở nhờ không?"
  if (/(ở cùng mấy hôm này|cho bạn ở nhờ|cho (anh|chị|em) ở nhờ) không\?\s*$/.test(lastText.trim())) {
    if (no) return "Vậy mình tính cách khác nha: khoá cửa cẩn thận, giữ điện thoại luôn có pin và lưu sẵn số **113**; báo cho một người bạn tin (dù ở xa) biết tình hình và hẹn giờ gọi cho nhau mỗi ngày. Cần chỗ tạm lánh thì gọi **Ngôi nhà Bình yên 1900 969 680** để được tư vấn.";
    if (yes) return "Vậy tốt rồi 💚 Bạn nhắn cho người đó biết chuyện ngay hôm nay nha, đừng chờ tới lúc có chuyện mới nói.";
    return null;
  }
  if (!/có đang ở chỗ an toàn không\?\s*$/.test(lastText.trim())) return null;
  if (/^(khong|ko|k|hong|chua|khong an toan|chua an toan|khong biet|khong chac|so lam|dang so)( |$)/.test(b))
    return "Vậy việc đầu tiên là tới chỗ có người khác: nhà người thân, hàng xóm, chỗ đông người — và gọi **113** nếu người đó còn ở gần hoặc bạn thấy sắp có chuyện. Mang theo điện thoại và giấy tờ nếu kịp.\n\nBạn có ai ở gần để qua ngay bây giờ không?";
  if (/^(co|u|uh|um|uhm|da|vang|roi|on|an toan|dang an toan|tam on|co chu|dang o nha (me|ban|ngoai))( |$)/.test(b))
    return "Vậy Lomi đỡ lo một chút 💚 Bạn giữ mấy số ở trên nha — lúc nào thấy không an toàn thì đừng chần chừ gọi **113**.\n\nGiờ bạn muốn kể thêm chuyện đã xảy ra, hay muốn Lomi gợi ý vài cách tự bảo vệ mình?";
  return null;
}
