// ─────────────────────────────────────────────────────────────────────────────
// ĐÍNH CHÍNH / ĐỔI Ý (01/11, Kir: "không bao giờ hỏi A trả lời B") — "à không, ý là cảm lạnh", "nhầm, là tôi bị sốt",
//   "lộn, vitamin D", "ý là trà xanh". Bỏ phần cũ người dùng vừa sửa, ghép phần mới vào ĐÚNG CHỖ của câu hỏi trước
//   (tên bệnh thay tên bệnh, chất thay chất, người thay người, thứ gây ra thay thứ gây ra) để giữ nguyên LOẠI câu hỏi
//   ("gout kiêng gì" → "không, ý mình là tiểu đường" = "tiểu đường kiêng gì"). Chạy trên máy, không thêm kiến thức.
// ─────────────────────────────────────────────────────────────────────────────
import { findMedTopicId, nameAsTyped } from "@/lib/lomiMed";
import { nutrientOf, NUTRIENTS } from "@/lib/lomiNutrients";
import { causeSide, parseCause } from "@/lib/lomiCause";
import { qtypeOf } from "@/lib/lomiQShape";
import { matchFaq } from "@/lib/lomiFaq";

/** Dấu hiệu sửa ý ở đầu câu, rồi tới phần mới. */
const MARK = /^(?:(?:à|ờ|ơ|ủa|à mà|xin lỗi|sorry)\s*,?\s*)?(?:(?:không|ko|k|hông|nhầm|lộn|nhầm rồi|lộn rồi|sửa lại|đính chính|gõ nhầm|gõ lộn|viết nhầm)\s*[,.:!\-–]*\s*)?(?:(?:ý tui là|ý tôi là|ý mình là|ý em là|ý anh là|ý chị là|mình muốn hỏi|tui muốn hỏi|tôi muốn hỏi|em muốn hỏi|ý là|ý tui|ý mình|tui hỏi|tôi hỏi|mình hỏi|em hỏi|ý|là)\s+)?(.{2,80})$/u;
const HAS_MARK = /^(?:(?:à|ờ|ơ|ủa)\s*,?\s*)?(?:không\s*[,.]|ko\s*[,.]|nhầm|lộn|sửa lại|đính chính|gõ nhầm|gõ lộn|viết nhầm|à không|à nhầm|à lộn|ý là|ý tui là|ý tôi là|ý mình là|ý em là|ý anh là|ý chị là|à mình hỏi|à tui hỏi|à tôi hỏi|à em hỏi)/u;

const PERSON =/^(?:là\s+)?((?:con|bé|mẹ|má|ba|bố|cha|vợ|chồng|ông|bà|anh|chị|em)(?:\s+(?:tôi|tui|mình|em|anh|chị|nội|ngoại))?|tôi|tui|mình|tớ)(?=\s|$)/u;

export type Repair = { q: string; lead?: string; /** Câu viết lại khớp đúng một câu hỏi app (FAQ) → trả lời luôn câu đó. */ faqId?: string; /** Không đủ ngữ cảnh để hiểu → hỏi lại đúng một câu (không đoán). */ ask?: string };
/** prevQ = câu hỏi trước của người dùng; q = câu vừa gõ. Không phải câu sửa ý → null. */
export function repairTurn(q: string, prevQ: string | undefined): Repair | null {
  const low = q.normalize("NFC").toLowerCase().replace(/[?!.…]+$/u, "").replace(/\s+/g, " ").trim();
  // "thôi không bói nữa, cho hỏi đau lưng" — dừng việc cũ + hỏi chuyện mới trong cùng câu → trả lời chuyện mới
  const stop = low.match(/^(?:thôi|ok|okie|ừ)?\s*,?\s*(?:không|ko|khỏi)\s+(?:bói|rút bài|xem bài|tìm quán|tìm)\s+nữa\s*[,.]?\s*(?:cho\s+(?:tui|tôi|mình|em|anh|chị)\s+)?(?:hỏi|cho hỏi|hỏi về|giờ hỏi)\s+(.{2,60})$/u);
  if (stop) return { q: stop[1], lead: "Okie, mình dừng ở đây nha 😊" };
  if (!prevQ) {
    // Chưa có câu nào trước đó: "à không, ý là tiểu đường" → hiểu phần sau; "vậy còn trẻ em" → hỏi lại, không đoán
    if (HAS_MARK.test(low)) {
      const nw0 = (low.match(MARK)?.[1] ?? "").replace(/^(?:là|hỏi)\s+/u, "").trim();
      return nw0 && nw0 !== low && nw0.split(" ").length <= 5 && findMedTopicId(nw0) ? { q: nw0 } : null;
    }
    const e0 = low.match(/^(?:(?:vậy|thế|rồi)\s+)?còn\s+(.{2,30}?)(?:\s+(?:thì sao|thì thế nào|sao|thì|nữa|nhỉ|ạ|ha|hả))*$/u);
    if (e0 && e0[1].split(" ").length <= 3 && !/(?:^|\s)(?:bao|mấy|gì|nào|không|ko|hạn|hàng|chỗ|món|ưu đãi|mở|được|đâu|ai|ko|k|kia|đó|này|ấy|trên|dưới|lại)(?:\s|$)/u.test(e0[1])) return { q: low, ask: `“Còn ${e0[1]}” là bạn muốn hỏi chuyện gì về ${e0[1]} nè? Nói Lomi thêm một chút để Lomi trả lời đúng ý nha 😊` };
    return null;
  }
  // TỈNH LƯỢC "vậy còn X (thì sao)" — X cùng loại với một phần của câu trước → thay đúng phần đó, giữ loại câu hỏi
  //   ("tôi bị sốt" → "thế còn bé thì sao" = "bé bị sốt"; "ung thư phổi có phải do hút thuốc không" → "vậy còn thuốc lá điện tử")
  const ell = low.match(/^(?:(?:vậy|thế|rồi|à|ủa|nhưng)\s+)?còn\s+(.{2,40}?)(?:\s+(?:thì sao|thì thế nào|thì như nào|thì ra sao|thì sao nhỉ|thì sao ạ|sao|thì|nữa|nhỉ|ạ|ha|hả))*$/u);
  if (ell && !HAS_MARK.test(low)) return swapInto(ell[1].replace(/^(?:cái|con|người|vụ)\s+(?=\S+\s+\S)/u, "").trim(), prevQ, true);
  // 01/11 (vòng 10): HỎI NGUYÊN NHÂN NGẮN sau khi kể bệnh — "tôi bị đau đầu" → "do thiếu ngủ hả" = "đau đầu có phải do thiếu ngủ không"
  const why = low.match(/^(?:có phải |là |chắc |chắc là |hay là )?(?:do|tại|vì|bởi) (.{2,30}?)(?:\s+(?:hả|không|ko|à|ha|nhỉ|đúng không|phải không|chứ gì))*$/u);
  if (why && !HAS_MARK.test(low)) {
    const tid = findMedTopicId(prevQ);
    const tn = tid ? nameAsTyped(prevQ, tid) : null;
    if (tn) return { q: `${tn.replace(/^(?:bị|mắc)\s+/u, "")} có phải do ${why[1]} không` };
  }
  // CHẤT vừa hỏi ("vitamin C có tác dụng gì") rồi hỏi tiếp không nêu tên ("uống nhiều có sao không", "có trong trái gì") → mang tên chất theo
  if (!HAS_MARK.test(low) && low.split(" ").length <= 8 && !nutrientOf(low) && !findMedTopicId(low)) {
    const nOld = nutrientOf(prevQ);
    if (nOld && /(có sao|có hại|có tốt|có trong|có nhiều|ở đâu|bao nhiêu|lúc nào|khi nào|uống nhiều|thiếu|thừa|tác dụng|để làm gì)/u.test(low))
      return { q: `${nOld.name.split(" (")[0]} ${low}` };
  }
  // ĐẠI TỪ "nó / cái đó" thay cho chủ đề câu trước ("ưu đãi là gì" → "nhận nó ở đâu" = "nhận ưu đãi ở đâu")
  if (!HAS_MARK.test(low) && low.split(" ").length <= 8 && /(?:^|\s)(nó|cái đó|cái này|cái ấy)(?=\s|$)/u.test(low)) {
    const pp = prevQ.normalize("NFC").toLowerCase().replace(/[?!.…]+$/u, "").trim();
    const tm = pp.match(/^(.{2,30}?)\s+(?:là gì|là sao|là cái gì|có tác dụng gì|dùng để làm gì|hoạt động sao|là bệnh gì)$/u);
    if (tm && tm[1].split(" ").length <= 4) {
      const cand = low.replace(/(^|\s)(nó|cái đó|cái này|cái ấy)(?=\s|$)/u, `$1${tm[1]}`);
      if (matchFaq(cand) || findMedTopicId(cand)) return { q: cand };
    }
  }
  if (!HAS_MARK.test(low)) return null;
  const m = low.match(MARK);
  let nw = (m?.[1] ?? "").replace(/^(?:là|hỏi)\s+/u, "").trim();
  // "à không phải cảm, cúm" / "không phải A mà là B" — bỏ phần bị bác, giữ phần sửa lại
  const np = nw.match(/^phải\s+(?:là\s+)?.{1,25}?\s*(?:,|mà)\s*(?:mà\s+)?(?:là\s+)?(.{2,40})$/u);
  if (np) nw = np[1].trim();
  // "nhầm, tôi hỏi cho chồng tôi" — đổi người được hỏi cho, giữ câu hỏi cũ
  const forWho = nw.match(/^(?:tôi|tui|mình|em)?\s*(?:hỏi\s+)?(?:cho|giùm|giúp|dùm)\s+((?:con|bé|mẹ|má|ba|bố|cha|vợ|chồng|ông|bà|anh|chị|em|bạn)(?:\s+(?:tôi|tui|mình|em|nội|ngoại))?)$/u);
  if (forWho) return { q: prevQ.normalize("NFC").replace(/[?!.…]+$/u, "").trim(), lead: `Dạ, Lomi hiểu là bạn hỏi cho **${forWho[1].replace(/\s+(tôi|tui|mình)$/u, " bạn")}** nha 📝` };
  return swapInto(nw, prevQ, false);
}

function swapInto(nw: string, prevQ: string, ellipsis: boolean): Repair | null {
  if (!nw || nw.length < 2) return null;
  const prev = prevQ.normalize("NFC").replace(/[?!.…]+$/u, "").replace(/\s+/g, " ").trim();
  const pl = prev.toLowerCase();
  // Phần mới đã là một câu hỏi đầy đủ → dùng luôn
  if (qtypeOf(nw) && nw.split(" ").length >= 3) return ellipsis ? null : { q: nw };
  // Người: "nhầm, là tôi bị sốt" (đủ câu) / "nhầm, con tôi" (chỉ người)
  const pn = nw.match(PERSON);
  //   (chỉ nêu người — "nhầm, ba em" — thì để lớp đang nói (thuốc / triệu chứng) đổi người dùng, giữ mạch đang nói)
  if (pn && nw.split(" ").length >= 3 && !ellipsis) return { q: nw };
  if (pn && ellipsis && nw.split(" ").length <= 3) {
    // "tôi bị sốt" → "còn bé thì sao": thay người bệnh; câu trước không có người mà là câu kể bệnh ("bị ho") → thêm người vào đầu
    const pp = pl.match(PERSON);
    if (pp) return { q: `${pn[1]}${prev.slice(pp[0].length)}` };
    if (/^(?:bị|đang bị|hay bị)\s/u.test(pl)) return { q: `${pn[1]} ${prev}` };
    return null;
  }
  if (pn) return null;
  // Câu trước hỏi QUAN HỆ "X gây Y" và phần mới là một nguyên nhân khác ("vậy còn thuốc lá điện tử") → thay X, giữ Y
  const pc0 = parseCause(prev);
  if (pc0 && causeSide(nw) === "x" && nw.split(" ").length <= 5) {
    const i = pl.indexOf(pc0.xShow.toLowerCase());
    if (i >= 0) return { q: `${prev.slice(0, i)}${nw}${prev.slice(i + pc0.xShow.length)}` };
  }
  // Bệnh thay bệnh (giữ loại câu hỏi): "gout kiêng gì" + "tiểu đường" → "tiểu đường kiêng gì"
  const idNew = findMedTopicId(nw);
  const idOld = findMedTopicId(prev);
  if (idNew && idOld && idNew !== idOld && nw.split(" ").length <= 5) {
    const oldName = nameAsTyped(prev, idOld);
    if (oldName && pl.includes(oldName.toLowerCase())) {
      const i = pl.indexOf(oldName.toLowerCase());
      return { q: `${prev.slice(0, i)}${nw}${prev.slice(i + oldName.length)}` };
    }
  }
  // Chất thay chất: "vitamin C có tác dụng gì" + "vitamin D"
  const nNew = nutrientOf(nw);
  const nOld = nutrientOf(prev);
  if (nNew && nOld && nNew.id !== nOld.id) {
    const nm = (NUTRIENTS.find((x) => x.id === nOld.id)?.names ?? []).filter((x) => pl.includes(x.toLowerCase())).sort((a, b) => b.length - a.length)[0];
    if (nm) {
      const i = pl.indexOf(nm.toLowerCase());
      return { q: `${prev.slice(0, i)}${nw}${prev.slice(i + nm.length)}` };
    }
  }
  // Thứ gây ra thay thứ gây ra: "cà phê có gây mất ngủ không" + "ý là trà xanh"
  const pc = parseCause(prev);
  if (pc && nw.split(" ").length <= 4 && !idNew) {
    const i = pl.indexOf(pc.xShow.toLowerCase());
    if (i >= 0) return { q: `${prev.slice(0, i)}${nw}${prev.slice(i + pc.xShow.length)}` };
  }
  // Câu cũ = <chủ đề> + <phần hỏi> ("đau đầu nên ăn gì") và phần mới chỉ là chủ đề ("đau bụng") → giữ phần hỏi, thay chủ đề
  if (!qtypeOf(nw) && nw.split(" ").length <= 4 && ((!ellipsis && idOld) || idNew || /(?:^|\s)(?:đau|viêm|sốt|ho|ngứa|nổi|nhức|tiêu chảy|táo bón|buồn nôn|chóng mặt|mất ngủ)(?:\s|$)/u.test(nw.toLowerCase()))) {
    const qm = pl.match(/\s(nên ăn gì|ăn gì|uống gì|kiêng gì|nên kiêng gì|là gì|là bệnh gì|có lây không|bao lâu thì (?:khỏi|hết|đỡ)|có nguy hiểm không|có sao không|vì sao|tại sao|làm sao|thì làm sao|thì sao|nên làm gì|thì làm gì|có nên .+|có (?:gây|làm) .+|khi nào .+|ở đâu|chỗ nào|triệu chứng gì|có triệu chứng gì|dấu hiệu gì|nguyên nhân gì|có tác dụng gì|tác dụng gì|có trong .+|chữa sao|chữa thế nào|thế nào|ra sao)$/u);
    if (qm && qm.index !== undefined && qm.index > 0 && pl.slice(0, qm.index).split(" ").length <= 5) return { q: `${nw} ${prev.slice(qm.index + 1)}` };
  }
  // Câu hỏi APP: câu cũ = <việc> + <phần hỏi> ("đổi mật khẩu ở đâu") và phần mới là một việc khác ("còn đổi email") → "đổi email ở đâu"
  if (!qtypeOf(nw) && nw.split(" ").length <= 5 && matchFaq(prev)) {
    const qa = pl.match(/\s(ở đâu|chỗ nào|thế nào|như thế nào|làm sao|ra sao|được không|mất bao lâu|bao lâu|khi nào)$/u);
    if (qa && qa.index) {
      const cand = `${nw} ${prev.slice(qa.index + 1)}`;
      const f1 = matchFaq(cand);
      if (f1 && f1.id !== matchFaq(prev)?.id) return { q: cand, faqId: f1.id };
    }
  }
  // Chỉ có tên bệnh mới, câu cũ không có bệnh → hỏi về bệnh mới (lớp sau hiểu như câu nêu tên bệnh)
  if (idNew && nw.split(" ").length <= 5 && !ellipsis) return { q: nw };
  return null;
}
