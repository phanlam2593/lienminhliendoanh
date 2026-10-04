// ─────────────────────────────────────────────────────────────────────────────
// BÁM CÂU HỎI TÌNH CẢM (04/10) — câu hỏi trực tiếp về "người ấy" mà thư viện tâm sự chưa bắt:
// "người ấy còn tình cảm không?", "anh ấy nghĩ gì về mình?", "người ấy im lặng, mình nên làm gì?",
// "nên nhắn gì cho crush?". Giữ đúng chủ thể + vấn đề + mục tiêu câu hỏi (question anchor):
// không đổi "người ấy" thành "bạn", không đổi "còn tình cảm không" thành "có thành không",
// không đọc suy nghĩ người khác như sự thật, không chuyển sang Tarot. Chạy trên máy.
// ─────────────────────────────────────────────────────────────────────────────

import { HEART, normStrict } from "@/lib/lomiAccent";
import type { HeartReply } from "@/lib/lomiHeart";

export type RelIntent = "mind_read" | "silence_advice" | "texting";

const SUBJ: [RegExp, string][] = [
  [/\b(nguoi ay|nguoi do)\b/, "người ấy"],
  [/\b(anh ay|anh do)\b/, "anh ấy"],
  [/\b(co ay|co do|em ay)\b/, "cô ấy"],
  [/\bcrush\b/, "crush"],
  [/\b(nguoi yeu|ny)\b/, "người yêu bạn"],
  [/\bban trai\b/, "bạn trai bạn"],
  [/\bban gai\b/, "bạn gái bạn"],
  [/\bnguoi yeu cu\b/, "người yêu cũ"],
  [/\b(vo minh|vo toi|vo em|vo anh)\b/, "vợ bạn"],
  [/\b(chong minh|chong toi|chong em|chong chi)\b/, "chồng bạn"],
];
const MIND_RE = /\b(con tinh cam|con yeu|con thuong|co yeu|co thuong|co thich|thich minh khong|yeu minh khong|nghi gi ve minh|nghi gi ve toi|nghi gi ve em|nghi gi ve anh|co de y|co quan tam|that long khong|co nghiem tuc)\b/;
const SILENT_RE = /\b(im lang|khong nhan tin|khong rep|khong tra loi|seen khong rep|da xem|lanh nhat|ghost|bien mat|it nhan|khong lien lac)\b/;
const ASK_ADV_RE = /\b(nen lam gi|lam sao|phai lam sao|lam gi bay gio|nen the nao|co nen|xu ly sao|lam the nao)\b/;
const TEXT_RE = /\b(nen nhan gi|nhan gi|nhan tin the nao|nhan the nao|mo loi sao|bat chuyen sao|nhan truoc khong|co nen nhan)\b/;

function subjectOf(n: string): string | undefined {
  return SUBJ.find(([re]) => re.test(n))?.[1];
}

/** Nhận diện câu hỏi tình cảm trực tiếp về một người cụ thể. null nếu không phải. */
export function relationIntent(text: string): { intent: RelIntent; subject: string } | null {
  const n = ` ${normStrict(text, HEART)} `;
  const subject = subjectOf(n);
  if (!subject) return null;
  if (TEXT_RE.test(n)) return { intent: "texting", subject };
  if (SILENT_RE.test(n) && ASK_ADV_RE.test(n)) return { intent: "silence_advice", subject };
  if (MIND_RE.test(n)) return { intent: "mind_read", subject };
  return null;
}

let turn = 0;
const pick = (xs: string[]) => xs[turn++ % xs.length];

/** Trả lời bám đúng câu hỏi. theme dùng để giữ mạch tâm sự (tình cảm). */
export function relationReply(text: string): HeartReply | null {
  const r = relationIntent(text);
  if (!r) return null;
  const s = r.subject;
  const S = s.charAt(0).toUpperCase() + s.slice(1);
  if (r.intent === "mind_read") {
    const n = ` ${normStrict(text, HEART)} `;
    const what = /nghi gi/.test(n) ? `${s} đang nghĩ gì về bạn` : /thich|de y|quan tam/.test(n) ? `${s} có để ý bạn không` : `${s} còn tình cảm hay không`;
    return {
      theme: "love",
      quick: [],
      text: [
        `Thật lòng thì chỉ ${s} mới biết chắc ${what}. Lomi không đọc được suy nghĩ người khác, nhưng có thể cùng bạn nhìn vào những gì ${s} đang thể hiện.`,
        `Vài dấu hiệu hay đáng để ý hơn lời nói: ${s} có chủ động hỏi han, giữ lời hẹn, dành thời gian cho bạn không — hay chỉ xuất hiện khi rảnh/khi cần? Hành động lặp lại theo thời gian thường nói nhiều hơn một tin nhắn.`,
        `Dạo gần đây ${s} cư xử với bạn thế nào, có gì thay đổi so với trước không?`,
      ].join("\n\n"),
    };
  }
  if (r.intent === "silence_advice") {
    return {
      theme: "cold",
      quick: [],
      text: [
        `${S} im lặng thì có nhiều khả năng: đang bận hay mệt, đang tránh một chuyện khó nói, hoặc tình cảm đã nguội — từ bên ngoài khó biết chắc là cái nào.`,
        `Vài cách bạn có thể cân nhắc:\n• Nhắn một tin ngắn, rõ ràng, không trách móc — kiểu “Dạo này thấy bạn im hơn, có chuyện gì không? Khi nào tiện thì nói mình nghe.”\n• Sau đó cho ${s} thời gian, tránh nhắn dồn dập.\n• Tự đặt cho mình một mốc: im lặng kéo dài tới đâu thì bạn cần một câu trả lời thẳng.`,
        `${S} im lặng bao lâu rồi, và trước đó hai người có chuyện gì không?`,
      ].join("\n\n"),
    };
  }
  return {
    theme: "love",
    quick: [],
    text: [
      pick([
        `Nhắn cho ${s} thì nên ngắn, tự nhiên và dễ trả lời: hỏi về một điều cụ thể (một chuyện ${s} từng kể, một việc vừa xảy ra) hơn là “đang làm gì đó?”.`,
        `Tin nhắn mở lời dễ nhất là tin có liên quan tới ${s}: nhắc một chuyện chung, hỏi ý kiến một điều nhỏ — đừng dài và đừng đòi hỏi phải trả lời ngay.`,
      ]),
      `Bạn với ${s} đang ở mức nào — mới quen, đang thân, hay vừa có chuyện? Biết vậy Lomi gợi ý câu sát hơn.`,
    ].join("\n\n"),
  };
}
