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
import { findMedTopicId, nameAsTyped } from "@/lib/lomiMed";
import { drugById, findDrugs } from "@/lib/lomiDrugData";
import { detectTarot } from "@/lib/tarot";

/** Những gì gate cần biết về một tin của Lomi. */
export type GateMsg = {
  med?: { id: string };
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
export function replyMismatch(question: string, reply: GateMsg, prev?: GateMsg): Mismatch | null {
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
  if (rTopic && rTopic !== prev?.med?.id && !nameAsTyped(question, rTopic)) {
    if (qTopic && qTopic !== rTopic) return lost();
    if (!qTopic && qDrugs.length && !reply.drug) return lost();
  }
  // 3) Đáp một THUỐC khác với thuốc được hỏi.
  const rDrug = reply.drug?.id;
  if (rDrug && rDrug !== prev?.drug?.id && qDrugs.length && !qDrugs.some((d) => d.id === rDrug) && drugById(rDrug)) return lost();
  return null;
}
