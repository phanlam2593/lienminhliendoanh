// ─────────────────────────────────────────────────────────────────────────────
// CHỐT CUỐI "HIỂU ĐÚNG CÂU HỎI CHƯA" (14/10, theo ý Kir: "không muốn gặp lại cảnh nói 1 đường hiểu 1 nẻo")
//
// Trước khi Lomi gửi câu đáp, so CÁI ĐƯỢC HỎI với CÁI ĐƯỢC ĐÁP:
//   • câu hỏi nhắc một bệnh / một thuốc có trong kho kiến thức (lib/lomiMed, lib/lomiDrugData),
//   • mà câu đáp lại nói về một bệnh / thuốc KHÁC (hoặc rút bài Tarot trong khi người dùng không hề xin bói)
//   → không gửi câu đáp lạc đó. Lomi nói thật là chưa chắc hiểu đúng, mời hỏi lại, và tự ghi nhật ký "bí" loại "mismatch"
//     để admin / Claude xem đúng câu đó mà sửa.
// Chủ đề / thuốc lấy từ lượt trước (câu hỏi nối "vậy uống được không") thì không tính là lạc.
// ─────────────────────────────────────────────────────────────────────────────
import { heartThemeOf } from "@/lib/lomiHeart";
import { findMedTopicId, nameAsTyped } from "@/lib/lomiMed";
import { drugById, findDrugs } from "@/lib/lomiDrugData";
import { detectTarot } from "@/lib/tarot";

/** Những gì gate cần biết về một tin của Lomi. */
export type GateMsg = {
  med?: { id: string };
  /** 30/10: lời đáp tình huống "bác sĩ trả về" (lib/lomiPalliative) — cố ý đáp bằng thẻ chăm sóc giảm nhẹ dù câu nêu tên bệnh. */
  pal?: unknown;
  drug?: { id?: string; name?: string };
  tarot?: unknown;
  tarotAwait?: boolean;
  tarotSpread?: unknown;
  diet?: string;
};

export type Mismatch = { asked: string; text: string };

/**
 * question = câu người dùng gõ; reply = câu Lomi định đáp; prev = tin Lomi ngay trước (ngữ cảnh).
 * Trả về null nếu câu đáp đúng chủ đề (hoặc câu hỏi không nhắc bệnh / thuốc nào Lomi biết).
 */
export function replyMismatch(question0: string, reply: GateMsg, prev?: GateMsg): Mismatch | null {
  // 04/11: "tỏi có hạ huyết áp không" = làm giảm huyết áp CAO (không phải hỏi bệnh huyết áp thấp) — cùng cách đọc với lúc hỏi
  const question = question0.replace(/(^|[^\p{L}])(có|giúp|làm|để|sẽ)\s+hạ\s+huyết áp(?!\s*(?:cao|thấp))/giu, "$1$2 hạ huyết áp cao");
  const qTopic = findMedTopicId(question);
  const qDrugs = findDrugs(question);
  if (!qTopic && !qDrugs.length) return null;
  const askedName = (qTopic && nameAsTyped(question, qTopic)) || qDrugs[0]?.names[0] || "";
  const lost = (): Mismatch => ({
    asked: askedName,
    text: `Câu này Lomi **chưa chắc hiểu đúng** ý bạn hỏi về **${askedName}** 🙈 — Lomi không muốn trả lời nhầm sang chuyện khác. Bạn hỏi lại cụ thể hơn giúp Lomi nha, ví dụ: “${askedName} là gì”, “${askedName} có triệu chứng gì”, “${askedName} cần kiêng gì”${qDrugs.length ? `, “uống ${askedName} để làm gì”` : ""}.`,
  });
  // 1) Rút bài Tarot trong khi câu hỏi nói về bệnh / thuốc mà người dùng không xin bói.
  if (reply.tarot && !prev?.tarotAwait && !prev?.tarotSpread && !detectTarot(question)) return lost();
  // 2) Đáp một BỆNH khác với bệnh / thuốc được hỏi.
  const rTopic = reply.med?.id;
  if (rTopic && rTopic !== prev?.med?.id && !nameAsTyped(question, rTopic) && !reply.pal) {
    if (qTopic && qTopic !== rTopic) return lost();
    if (!qTopic && qDrugs.length && !reply.drug) return lost();
  }
  // 3) Đáp một THUỐC khác với thuốc được hỏi.
  const rDrug = reply.drug?.id;
  if (rDrug && rDrug !== prev?.drug?.id && qDrugs.length && !qDrugs.some((d) => d.id === rDrug) && drugById(rDrug)) return lost();
  return null;
}

/**
 * 01/11 (hiểu câu vòng 7): câu người dùng NÊU một bệnh / triệu chứng có thẻ ("mẹ tôi bị phù chân", "chị tôi mang thai bị phù chân")
 * mà câu Lomi định đáp chỉ là một câu nghe chung chung ("Lomi nghe nè, kể thêm chút được không?") không nhắc gì tới bệnh đó
 * → hỏi lại MỘT câu đúng trọng tâm: đúng NGƯỜI được nói tới + đúng bệnh, kèm lựa chọn để bấm. null = câu đáp vẫn ổn.
 */
export function vagueMiss(question: string, reply: GateMsg & { content: string; heart?: string; harm?: unknown; about?: unknown; thread?: unknown }): { text: string; medId: string; quick: string[] } | null {
  if (reply.med || reply.drug || reply.tarot || reply.harm || reply.heart || reply.content.length > 160) return null;
  // (12/11: "bị đá khỏi nhóm bạn, giờ thấy cô độc quá", "mình thích yên tĩnh mà bị chê khó gần" — chuyện cảm xúc có chủ đề tâm sự,
  //   không đổi thành "Bạn bị cô độc hả 🩺 muốn biết cô độc là gì")
  const thQ = heartThemeOf(question);
  if (thQ && !["insomnia", "headache", "stomach", "nasal", "flu", "backpain", "eyes", "weight", "skin", "hangover", "smoking", "period", "pregnant", "health", "tired", "menhealth"].includes(thQ)) return null;
  // (câu gõ không dấu thì tên bệnh chỉ là đoán dấu — "cai nhau" không phải "cai nghiện" — không đổi câu đáp)
  if (!/[^\x00-\x7F]/.test(question)) return null;
  if (!/(kể (thêm|tiếp)|kể Lomi nghe|Rồi sao nữa|Lomi nghe nè|nghe nè|Có gì kể tiếp|chưa chắc hiểu ý|Ý bạn là sao|nói rõ thêm|nói thêm chút xíu)/u.test(reply.content)) return null;
  // (một chữ triệu chứng trơn — "sốt", "ho" — thì đọc như "bị sốt", "bị ho")
  const short = question.trim().split(/\s+/).length <= 2;
  const id = findMedTopicId(question) ?? (short ? findMedTopicId(`bị ${question}`) ?? findMedTopicId(`${question} ở người lớn`) : null);
  if (!id) return null;
  const name = nameAsTyped(question, id) ?? nameAsTyped(`bị ${question}`, id) ?? (short ? question.trim().replace(/[?!.…]+$/u, "") : "");
  if (!name) return null;
  // (câu đáp đã nhắc đúng chuyện đó — "Con anh bị bạn bè bắt nạt hả…" — hoặc đang theo mạch kể về một người → không phải câu chung chung)
  if (reply.about || reply.thread) return null;
  const q = question.normalize("NFC").trim();
  const pm = q.match(/^((?:con|bé|mẹ|má|ba|bố|cha|vợ|chồng|ông|bà|anh|chị|em|bạn|cháu)(?:\s+(?:gái|trai|nội|ngoại))?)(?:\s+(?:tôi|tui|mình|em|nhà tôi))?(?=\s)/iu);
  const who = pm ? `${pm[1].charAt(0).toUpperCase()}${pm[1].slice(1).toLowerCase()} bạn` : "Bạn";
  const preg = /(mang thai|có bầu|đang bầu|bà bầu)/iu.test(q);
  return {
    // (chỉ nói "X bị … hả" khi người dùng thật sự kể là bị / mắc; "kể cho tôi về tiểu đường" là hỏi kiến thức)
    text: `${/(?:^|\s)(bị|mắc|đang bị|hay bị)(?:\s|$)/u.test(q.toLowerCase()) ? `${who} bị **${name}** hả 🩺` : `Về **${name}** nha 🩺`} Bạn muốn biết ${name} là gì, chăm sóc ở nhà thế nào, hay khi nào cần đi khám? Chọn bên dưới hoặc hỏi thẳng nha.${preg ? "\n\n⚠️ Đang mang thai mà **nhìn mờ / hoa mắt, đau đầu kèm phù mặt – tay – chân, hoặc đau dưới sườn** thì cần được khám **khẩn** — gọi **115** hoặc tới khoa sản ngay." : ""}`,
    medId: id,
    quick: [`${name} là gì?`, `Chăm sóc ${name} thế nào?`, "Khi nào cần đi khám?"],
  };
}
