// ─────────────────────────────────────────────────────────────────────────────
// BÁM CÂU HỎI TÌNH CẢM (04/10) — câu hỏi trực tiếp về "người ấy" mà thư viện tâm sự chưa bắt:
// "người ấy còn tình cảm không?", "anh ấy nghĩ gì về mình?", "người ấy im lặng, mình nên làm gì?",
// "nên nhắn gì cho crush?". Giữ đúng chủ thể + vấn đề + mục tiêu câu hỏi (question anchor):
// không đổi "người ấy" thành "bạn", không đổi "còn tình cảm không" thành "có thành không",
// không đọc suy nghĩ người khác như sự thật, không chuyển sang Tarot. Chạy trên máy.
// ─────────────────────────────────────────────────────────────────────────────

import { HEART, normStrict } from "@/lib/lomiAccent";
import type { HeartReply } from "@/lib/lomiHeart";
import { VR, VN } from "@/lib/viMatch";

export type RelIntent = "mind_read" | "silence_advice" | "silence" | "texting" | "advice" | "after_fight" | "decide" | "draft";
// 11/10 — trạng thái của chuyện đang nói về một người, lưu trong rel = "<người>|<ý định>|<cờ>":
//   fight = đã biết trước đó hai người có cãi nhau; offer = Lomi vừa mời gợi ý câu nhắn. Nhờ vậy:
//   "Trước đó tụi a có cãi nhau" là CÂU TRẢ LỜI cho câu Lomi vừa hỏi (không rẽ sang bài "cãi nhau" chung chung),
//   "A có nên nhắn trước không?" được trả lời thẳng có / không, và "Nhắn sao cho đỡ căng?" ra câu nhắn MẪU hợp hoàn cảnh.
type RelHit = { intent: RelIntent; subject: string; flags?: string[] };

const SUBJ: [RegExp, string][] = [
  [VN(/\b(người ấy|người đó)\b/), "người ấy"],
  [VN(/\b(anh ấy|anh đó)\b/), "anh ấy"],
  [VN(/\b(cô ấy|cô đó|em ấy)\b/), "cô ấy"],
  [VR(/\bcrush\b/), "crush"],
  [VN(/\b(người yêu cũ|ny cũ)\b/), "người yêu cũ"],
  [VN(/\b(chị ấy|chị đó)\b/), "chị ấy"],
  [VN(/\b(người yêu|ny)\b/), "người yêu bạn"],
  [VN(/\bbạn trai\b/), "bạn trai bạn"],
  [VN(/\bbạn gái\b/), "bạn gái bạn"],
  [VN(/\bngười yêu cũ\b/), "người yêu cũ"],
  [VN(/\b(vợ mình|vợ tôi|vợ em|vợ anh|vợ a|vợ e|vợ tui|bà xã)\b/), "vợ bạn"],
  [VN(/\b(chồng mình|chồng tôi|chồng em|chồng chị|chồng e|chồng c|chồng tui|ông xã)\b/), "chồng bạn"],
  [VN(/\b(cho|với) vợ\b/), "vợ bạn"],
  [VN(/\b(cho|với) chồng\b/), "chồng bạn"],
];
const MIND_RE = VN(/\b(hết thích|hết thương|hết yêu|hết tình cảm|không còn thích|không còn yêu|còn tình cảm|còn yêu|còn thương|có yêu|có thương|có thích|thích mình không|yêu mình không|nghĩ gì về mình|nghĩ gì về tôi|nghĩ gì về em|nghĩ gì về anh|có để ý|có quan tâm|thật lòng không|có nghiêm túc)\b/);
const SILENT_RE = VN(/\b(im lặng|không nhắn tin|không rep|không trả lời|seen không rep|đã xem|lạnh nhạt|ghost|biến mất|ít nhắn|không liên lạc)\b/);
const ASK_ADV_RE = VN(/\b(nên làm gì|làm sao|phải làm sao|làm gì bây giờ|nên thế nào|có nên|xử lý sao|xử lí sao|làm thế nào)\b/);
const TEXT_RE = VN(/\b(nên nhắn gì|nhắn gì|nhắn tin thế nào|nhắn thế nào|mở lời sao|bắt chuyện sao|nhắn trước không|có nên nhắn)\b/);
// Hỏi CÓ NÊN chủ động không (quyết định) — khác hỏi NHẮN GÌ (soạn câu).
const DECIDE_RE = VN(/\b(nhắn trước|có nên nhắn|nên nhắn không|có nên gọi|gọi trước|chủ động (nhắn|gọi|liên lạc|trước|nói chuyện)|liên lạc trước|mở lời trước|làm lành trước|xin lỗi trước)\b/);
const DRAFT_RE = VN(/\b(hỏi sao|hỏi thế nào|hỏi như thế nào|nhắn sao|nhắn gì|nhắn thế nào|nhắn như thế nào|nhắn tin thế nào|nói sao|nói gì|nói thế nào|viết gì|viết sao|mở lời sao|mở lời thế nào|bắt chuyện sao|câu nào|gợi ý (vài |mấy )?câu|mẫu tin nhắn|tin nhắn mẫu|soạn (giúp|hộ|giùm))\b/);
const FOUGHT_RE = VN(/\b(cãi nhau|cãi lộn|cãi vã|giận nhau|to tiếng|lỡ lời|nặng lời|giận dỗi|hiểu lầm|làm (người ấy|cô ấy|anh ấy|họ|bạn ấy) giận)\b/);
const YES_RE = VN(/^(có|có chứ|ừ|u|uh|ừm|um|uhm|ok|oke|okie|được|dc|đc|muốn|gợi ý đi|có nha|ừ gợi ý đi|u gợi ý đi|dạ|vâng)( (ạ|à|a|nha|nhé|nhe|đi|e|em|lomi))*$/);

function subjectOf(n: string): string | undefined {
  return SUBJ.find(([re]) => re.test(n))?.[1];
}

/** Người đang được nhắc trong câu (để router biết câu có nói về một người cụ thể không). */
export function relationSubject(text: string): string | undefined {
  return subjectOf(` ${normStrict(text, HEART)} `);
}
/** Nhận diện câu hỏi tình cảm trực tiếp về một người cụ thể. null nếu không phải. */
export function relationIntent(text: string): { intent: RelIntent; subject: string } | null {
  const n = ` ${normStrict(text, HEART)} `;
  const subject = subjectOf(n);
  if (!subject) return null;
  if (TEXT_RE.test(n)) return { intent: "texting", subject };
  if (SILENT_RE.test(n) && ASK_ADV_RE.test(n)) return { intent: "silence_advice", subject };
  if (MIND_RE.test(n)) return { intent: "mind_read", subject };
  if (SILENT_RE.test(n)) return { intent: "silence", subject };
  return null;
}

/**
 * Câu hỏi nối không nêu chủ thể ("Vậy mình nên làm gì?") khi đang nói về một người cụ thể.
 * ctx = "<chủ thể>|<ý định trước>" lưu ở tin trước. Không có ctx → null (không tự bịa ai là "người ấy").
 */
export function relationFollow(text: string, ctx?: string): RelHit | null {
  const own: RelHit | null = relationIntent(text);
  if (!ctx) return own;
  const [subject, prev, flagStr] = ctx.split("|");
  const flags = (flagStr ?? "").split(",").filter((x) => x && x !== "offer");
  const n = ` ${normStrict(text, HEART)} `;
  const words = n.trim().split(/\s+/).length;
  // Câu tự nêu một người KHÁC người đang nói ("còn crush thì sao") → chuyện mới; cùng người thì giữ điều đã biết.
  if (own && own.subject !== subject) return own;
  if (!subject || words > 14) return own;
  const asks = /\?/.test(text) || VN(/ (không|ko|k|sao|gì|nào|thế nào|hả|ha|nhỉ|chưa) $/).test(n) || ASK_ADV_RE.test(n);
  // "Trước đó tụi a có cãi nhau" — trả lời câu "trước khi im lặng hai người có chuyện gì không?".
  if (FOUGHT_RE.test(n) && !asks && words <= 10 && !VN(/ (không|ko|chưa|chẳng) (hề |có )?(cãi|giận|to tiếng) /).test(n)) return { intent: "after_fight", subject, flags: [...new Set([...flags, "fight"])] };
  if (DECIDE_RE.test(n) && asks) return { intent: "decide", subject, flags };
  // Hỏi nhắn GÌ / nhắn SAO khi đã biết hoàn cảnh (im lặng, vừa cãi nhau), hoặc "ừ" sau khi Lomi mời gợi ý câu nhắn → soạn câu mẫu.
  const knows = prev === "silence" || prev === "silence_advice" || prev === "after_fight" || prev === "decide" || prev === "draft" || flags.includes("fight");
  if ((DRAFT_RE.test(n) && knows) || ((flagStr ?? "").includes("offer") && YES_RE.test(n.trim()))) return { intent: "draft", subject, flags };
  if (own) return { ...own, flags };
  // "lỡ bạn ấy hết thích e thì sao" — nỗi sợ về tình cảm của người đang nói tới (câu không nhắc lại tên người đó).
  if (MIND_RE.test(n) && words <= 12) return { intent: "mind_read", subject, flags };
  if (words > 10) return null;
  if (TEXT_RE.test(n)) return { intent: "texting", subject, flags };
  if (ASK_ADV_RE.test(n) || VN(/\b(nên sao|giờ sao|làm gì)\b/).test(n)) return { intent: prev === "silence" || prev === "silence_advice" ? "silence_advice" : ("advice" as RelIntent), subject, flags };
  return null;
}

let turn = 0;
const pick = (xs: string[]) => xs[turn++ % xs.length];

/** Trả lời bám đúng câu hỏi. theme dùng để giữ mạch tâm sự (tình cảm). */
export function relationReply(text: string, ctx?: string): (HeartReply & { rel: string }) | null {
  const r = relationFollow(text, ctx);
  if (!r) return null;
  const out = build(r, text);
  const fl = [...(r.flags ?? []), ...(r.intent === "decide" ? ["offer"] : [])];
  return { ...out, rel: `${r.subject}|${r.intent}${fl.length ? `|${fl.join(",")}` : ""}` };
}

function build(r: RelHit, text: string): HeartReply {
  const s = r.subject;
  const fight = !!r.flags?.includes("fight");
  // Câu nhắn MẪU để gửi cho người kia viết trong ngoặc kép “…” (speak() giữ nguyên chữ trong ngoặc) và không dùng đại từ gọi người nhận,
  // để ai gửi cho ai cũng dùng được.
  if (r.intent === "after_fight")
    return {
      theme: "cold",
      quick: [],
      text: `À, vậy là trước đó hai người có cãi nhau. Sau một trận cãi nhau mà ${s} im lặng thì thường là còn giận, còn ngại, hoặc đang chờ bên kia mở lời — chừng đó thì chưa nói lên được là hết tình cảm hay chưa.\n\nBạn đang muốn làm lành, hay cần thêm thời gian cho nguôi đã?`,
    };
  if (r.intent === "decide")
    return {
      theme: fight ? "cold" : "love",
      quick: [],
      text: fight
        ? `Nếu bạn muốn làm lành thì nhắn trước là được — chủ động mở lời không làm mình mất giá, nó chỉ cho ${s} biết bạn còn coi trọng chuyện của hai người. Tin đầu nên ngắn, không trách, và không bắt ${s} phải trả lời ngay.\n\nCòn nếu bạn vẫn đang giận nhiều thì chờ thêm một hai hôm cho nguôi rồi nhắn cũng không sao.\n\nBạn muốn Lomi gợi ý vài câu nhắn cho đỡ căng không?`
        : `Nhắn trước được chứ — một tin hỏi thăm ngắn không làm phiền ai cả, và ${s} trả lời thế nào thì bạn cũng biết thêm được một chút, đỡ phải đoán. Chỉ cần đừng nhắn dồn dập hay trách móc.\n\nBạn muốn Lomi gợi ý vài câu nhắn không?`,
    };
  if (r.intent === "draft")
    return {
      theme: fight ? "cold" : "love",
      quick: [],
      text: fight
        ? `Vài câu mở lời sau khi cãi nhau — bạn chọn câu hợp giọng mình rồi sửa lại nha:\n• “Mấy hôm nay mình nghĩ nhiều về chuyện hôm đó. Mình xin lỗi vì đã nặng lời.”\n• “Mình không muốn tụi mình im lặng hoài như vậy. Khi nào sẵn sàng thì mình nói chuyện nha.”\n• “Mình vẫn còn hơi giận, nhưng mình không muốn mất nhau vì chuyện này.”\n\nNhắn một câu thôi, rồi cho ${s} thời gian trả lời — đừng nhắn dồn, và đừng mở đầu bằng “tại sao”.`
        : `Vài câu mở lời nhẹ nhàng — bạn chọn câu hợp giọng mình rồi sửa lại nha:\n• “Dạo này thấy im ắng quá, có chuyện gì không? Khi nào tiện thì nói mình nghe nha.”\n• “Mình không hỏi dồn đâu, chỉ muốn biết là mọi thứ vẫn ổn.”\n• “Hôm nay tự nhiên nhớ tới chuyện tụi mình hay nói, nên nhắn hỏi thăm.”\n\nNhắn một câu thôi, rồi cho ${s} thời gian trả lời — đừng nhắn dồn.`,
    };
  const S = s.charAt(0).toUpperCase() + s.slice(1);
  const dm = ` ${normStrict(text, HEART)} `.match(VN(/\b(\d+|một|hai|ba|mấy|vài|cả)\s*(ngày|hôm|tuần|tháng)\b/));
  const dur = dm ? `${({ mot: "1", hai: "2", ba: "3", may: "mấy", vai: "vài", ca: "cả" } as Record<string, string>)[dm[1]] ?? dm[1]} ${({ ngay: "ngày", hom: "hôm", tuan: "tuần", thang: "tháng" } as Record<string, string>)[dm[2]]}` : undefined;
  if (r.intent === "silence")
    return {
      theme: "cold",
      quick: [],
      text: `${S} im lặng${dur ? ` ${dur}` : ""} thì chờ đợi không biết vì sao là thấy bứt rứt thật. Có thể ${s} đang bận, đang né một chuyện khó nói, hoặc đã có thay đổi trong lòng — từ bên ngoài chưa biết chắc được.\n\nTrước khi im lặng, hai người có chuyện gì không, hay mọi thứ vẫn bình thường?`,
    };
  if (r.intent === "advice")
    return {
      theme: "love",
      quick: [],
      text: `Với chuyện của bạn và ${s}, vài hướng bạn có thể cân nhắc:\n• Nhìn vào hành động của ${s} vài tuần gần đây hơn là một lời nói.\n• Nếu cần biết rõ, hỏi thẳng một cách nhẹ nhàng thay vì đoán.\n• Tự hỏi mình đang cần gì từ mối quan hệ này — quyết định là ở bạn.\n\nHiện tại điều làm bạn băn khoăn nhất về ${s} là gì?`,
    };
  if (r.intent === "mind_read") {
    const n = ` ${normStrict(text, HEART)} `;
    const what = VN(/nghĩ gì/).test(n) ? `${s} đang nghĩ gì về bạn` : VN(/hết (thích|thương|yêu|tình cảm)|không còn|còn (thích|thương|yêu|tình cảm)/).test(n) ? `${s} còn tình cảm hay không` : VN(/thích|để ý|quan tâm/).test(n) ? `${s} có để ý bạn không` : `${s} còn tình cảm hay không`;
    return {
      theme: "love",
      quick: [],
      text: [
        `${VR(/(?<![\p{L}])(sợ|lo|lỡ|nhỡ|so|lo so)(?![\p{L}])/iu).test(text) ? (fight ? "Sau một trận cãi nhau mà sợ như vậy là dễ hiểu lắm 🥺 " : "Nỗi sợ đó dễ hiểu mà 🥺 ") : ""}Thật lòng thì chỉ ${s} mới biết chắc ${what}. Lomi không đọc được suy nghĩ người khác, nhưng có thể cùng bạn nhìn vào những gì ${s} đang thể hiện.`,
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
        `${S} im lặng${dur ? ` ${dur}` : ""} thì có nhiều khả năng: đang bận hay mệt, đang tránh một chuyện khó nói, hoặc tình cảm đã nguội — từ bên ngoài khó biết chắc là cái nào.`,
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
