// ─────────────────────────────────────────────────────────────────────────────
// NGỮ CẢNH + BÁM CÂU HỎI CHO SỨC KHOẺ (05/10) — chạy trên máy, không gọi AI.
// Mỗi "chủ thể" (xét nghiệm máu, paracetamol, nội soi…) có các KHÍA CẠNH (chuẩn bị, uống, ăn, bao lâu…).
// Câu có chủ thể → trả lời đúng khía cạnh được hỏi. Câu hỏi nối ngắn KHÔNG có chủ thể ("chuẩn bị gì?",
// "còn ăn?", "bao lâu?") → chỉ hiểu theo chủ thể Lomi đang nói (ctx), không có ctx thì trả null để
// Understanding Gate hỏi lại. Chỉ dùng dữ kiện người dùng THỰC SỰ nói (known facts): mốc thời gian,
// món định uống — không suy ra bệnh, liều hay loại xét nghiệm khi họ chưa nói.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";

export type Anchor = {
  subject: string; // id chủ thể
  aspect: string; // khía cạnh được hỏi
  timeframe?: string; // "mai", "sáng mai"… (người dùng nói)
  object?: string; // "trà atiso", "cà phê"… (người dùng nói)
  personal: boolean; // người dùng nói về chính mình / người cụ thể
};
export type ContextReply = { text: string; anchor: Anchor; urgent?: boolean };

type Subject = {
  id: string;
  label: string;
  re: RegExp;
  /** khía cạnh → câu trả lời (hàm nhận anchor để chèn đúng dữ kiện đã nói). */
  aspects: Record<string, (a: Anchor) => string>;
  main: string; // khía cạnh mặc định khi chỉ nhắc chủ thể ("đi thử máu á")
};

const OBJECTS: [RegExp, string][] = [
  [/\btra atiso\b|\batiso\b/, "trà atiso"],
  [/\btra sua\b/, "trà sữa"],
  [/\btra\b/, "trà"],
  [/\b(ca phe|cafe|cf)\b/, "cà phê"],
  [/\bsua\b/, "sữa"],
  [/\bnuoc ngot\b/, "nước ngọt"],
  [/\b(ruou|bia)\b/, "rượu bia"],
  [/\bnuoc loc\b/, "nước lọc"],
];
const TIME_RE = /\b(sang mai|chieu mai|toi mai|ngay mai|mai|tuan sau|tuan toi|hom nay|toi nay|sang nay|chieu nay)\b/;
const TIME_LABEL: Record<string, string> = {
  "sang mai": "sáng mai", "chieu mai": "chiều mai", "toi mai": "tối mai", "ngay mai": "ngày mai", mai: "mai",
  "tuan sau": "tuần sau", "tuan toi": "tuần tới", "hom nay": "hôm nay", "toi nay": "tối nay", "sang nay": "sáng nay", "chieu nay": "chiều nay",
};
const SELF_RE = /\b(minh|toi|tui|em|anh|chi|be|con|nguoi nha|me minh|ba minh)\b/;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FAST_NOTE =
  "Có cần nhịn ăn hay không là **tuỳ loại xét nghiệm**: nhiều xét nghiệm máu (công thức máu, chức năng gan thận thông thường…) không bắt buộc nhịn; một số như đường huyết lúc đói, mỡ máu thường được dặn nhịn khoảng 8–12 tiếng.";
const ASK_LAB = "Bạn hỏi lại nơi xét nghiệm (hoặc xem phiếu chỉ định) là xét nghiệm gì và có cần nhịn không nha — đó là cách chắc nhất.";

const SUBJECTS: Subject[] = [
  {
    id: "bloodtest",
    label: "xét nghiệm máu",
    re: /\b(xet nghiem mau|thu mau|lay mau|xn mau|kiem tra mau|test mau)\b/,
    main: "prep",
    aspects: {
      drink: (a) =>
        `${a.timeframe ? `${cap(a.timeframe)} đi xét nghiệm máu` : "Trước khi xét nghiệm máu"}${a.object && a.object !== "nước lọc" ? ` mà muốn uống ${a.object}` : ""} thì như vầy nha:\n\n${FAST_NOTE}\n• Nếu được dặn **nhịn ăn**: thường chỉ nên uống **nước lọc**; ${a.object && a.object !== "nước lọc" ? `${a.object}, ` : ""}trà, cà phê, sữa, nước ngọt nên để sau khi lấy máu vì có thể ảnh hưởng kết quả.\n• Nếu **không cần nhịn**: uống bình thường thường không sao, nhưng vẫn nên tránh rượu bia hôm trước.\n\n${ASK_LAB}`,
      eat: (a) =>
        `Về ăn uống trước khi xét nghiệm máu:\n\n${FAST_NOTE}\n• Nếu phải nhịn: bữa cuối nên ăn nhẹ vào tối hôm trước, tránh đồ nhiều dầu mỡ, đồ ngọt, rượu bia; sáng${a.timeframe?.includes("mai") ? " mai" : ""} đi lấy máu sớm cho đỡ đói.\n• Nếu không cần nhịn: ăn bình thường, chỉ tránh ăn quá no hay quá nhiều dầu mỡ.\n\n${ASK_LAB}`,
      prep: (a) =>
        `Chuẩn bị ${a.timeframe ? `cho buổi xét nghiệm máu ${a.timeframe}` : "trước khi xét nghiệm máu"} nè:\n• Hỏi rõ có cần **nhịn ăn** không (nếu cần thường 8–12 tiếng, chỉ uống nước lọc).\n• Tối hôm trước ngủ đủ, tránh rượu bia, không tập nặng.\n• Đang uống thuốc gì thì báo nhân viên y tế — đừng tự ngưng thuốc.\n• Uống đủ nước lọc giúp lấy ven dễ hơn; mặc áo dễ xắn tay.\n• Mang giấy tờ / phiếu chỉ định, có thể mang theo đồ ăn nhẹ để ăn ngay sau khi lấy máu.\n\n${ASK_LAB}`,
      time: () => "Thời gian có kết quả tuỳ loại xét nghiệm và từng nơi: xét nghiệm thông thường thường có trong vài giờ hoặc trong ngày; xét nghiệm đặc biệt có thể vài ngày. Nhịn ăn (nếu cần) thường khoảng 8–12 tiếng. Bạn hỏi nơi xét nghiệm để biết chính xác nha.",
      why: () => "Nhịn ăn trước một số xét nghiệm máu là vì đồ ăn thức uống làm thay đổi tạm thời các chỉ số như đường huyết, mỡ máu — nhịn giúp kết quả phản ánh đúng tình trạng lúc cơ thể nghỉ, bác sĩ dễ đánh giá hơn. Không phải xét nghiệm máu nào cũng cần nhịn.",
    },
  },
  {
    id: "endoscopy",
    label: "nội soi",
    re: /\b(noi soi)\b/,
    main: "prep",
    aspects: {
      prep: () => "Chuẩn bị nội soi tuỳ loại (dạ dày hay đại tràng) và nơi làm sẽ dặn cụ thể. Thường gặp: nhịn ăn khoảng 6–8 tiếng trước nội soi dạ dày; nội soi đại tràng thì cần ăn nhẹ và uống thuốc làm sạch ruột theo hướng dẫn. Báo bác sĩ thuốc đang dùng (nhất là thuốc chống đông) và đi cùng người thân nếu nội soi có gây mê.",
      drink: () => "Trước nội soi thường được dặn ngưng uống trong vài tiếng (có nơi cho uống chút nước lọc tới 2 tiếng trước). Trà, cà phê, sữa nên tránh. Bạn làm theo đúng giờ nơi nội soi dặn nha.",
      eat: () => "Nội soi dạ dày thường nhịn ăn khoảng 6–8 tiếng; nội soi đại tràng thì ăn nhẹ, ít chất xơ 1–2 ngày trước theo hướng dẫn. Nơi làm sẽ dặn cụ thể cho bạn.",
      time: () => "Nội soi thường chỉ mất khoảng 10–30 phút; nếu gây mê thì cần thêm thời gian nghỉ cho tỉnh hẳn. Nhịn ăn thường 6–8 tiếng trước.",
    },
  },
  {
    id: "paracetamol",
    label: "paracetamol",
    re: /\b(paracetamol|panadol|efferalgan|hapacol|acetaminophen)\b/,
    main: "info",
    aspects: {
      info: () =>
        "💊 **Paracetamol** (Panadol, Efferalgan, Hapacol…) là thuốc giảm đau, hạ sốt thông dụng.\n• Dùng đúng liều thì tác dụng phụ **ít gặp**: có thể buồn nôn, nổi mẩn, ngứa.\n• Hiếm nhưng nặng: dị ứng (sưng môi mặt, khó thở) hoặc phản ứng da nghiêm trọng (phồng rộp, bong da) → ngưng thuốc và đi cấp cứu.\n• Điểm quan trọng nhất: **quá liều gây tổn thương gan**, có thể nguy hiểm tính mạng — dễ xảy ra khi uống nhiều loại thuốc cùng chứa paracetamol (thuốc cảm, thuốc ho…), uống sát giờ, hoặc uống kèm rượu bia.\n• Người có bệnh gan, uống rượu nhiều, đang mang thai, trẻ nhỏ thì cần hỏi bác sĩ/dược sĩ trước.",
      dose: (a) =>
        `Lomi không đưa liều cụ thể${a.personal ? " cho từng người" : ""} được, vì liều paracetamol phụ thuộc **tuổi, cân nặng** (nhất là với trẻ em), bệnh gan và các thuốc khác đang dùng.\n• Làm theo tờ hướng dẫn trên hộp thuốc hoặc hỏi dược sĩ/bác sĩ.\n• Không tự tăng liều, không uống thêm thuốc cảm/thuốc ho có chứa paracetamol cùng lúc.\n\nBạn hỏi cho người lớn hay trẻ em (bao nhiêu tuổi, khoảng bao nhiêu ký), và đang uống loại viên bao nhiêu mg?`,
      kid: () => "Trẻ em dùng paracetamol được nhưng **liều phải tính theo cân nặng** của bé, dùng loại dành cho trẻ (siro, gói bột, viên đặt), không bẻ thuốc người lớn tự chia. Bạn hỏi dược sĩ/bác sĩ kèm cân nặng của bé nha. Bé dưới 3 tháng mà sốt, hoặc li bì, co giật, khó thở → đưa đi khám ngay.",
      overdose: () =>
        "⚠️ Uống quá nhiều paracetamol cần **đi cấp cứu ngay / gọi 115**, kể cả khi bây giờ thấy bình thường — tổn thương gan thường chưa có triệu chứng trong những giờ đầu, và điều trị càng sớm càng hiệu quả.\n• Mang theo vỏ hộp thuốc, nhớ khoảng bao nhiêu viên và uống lúc mấy giờ.\n• Không tự gây nôn, không chờ xem có sao không.\nNếu bạn uống nhiều vì đang thấy quá sức chịu đựng, bạn có thể gọi đường dây hỗ trợ **1900 1267** sau khi đã an toàn nha.",
      alcohol: () => "Không nên uống paracetamol cùng rượu bia hoặc khi uống rượu nhiều thường xuyên — cả hai đều đè lên gan, tăng nguy cơ tổn thương gan. Nếu đang uống rượu nhiều, hỏi dược sĩ thuốc giảm đau phù hợp hơn.",
    },
  },
];

// Khía cạnh — thứ tự = độ ưu tiên.
const ASPECTS: [string, RegExp][] = [
  ["overdose", /\b(qua lieu|uong qua nhieu|uong nham|uong nhieu qua|lo uong|uong ca vi|uong ca hop)\b/],
  ["kid", /\b(tre|be|em be|con minh|tre em|\d+ tuoi)\b/],
  ["dose", /\b(bao nhieu vien|may vien|lieu|bao nhieu mg|uong bao nhieu|cach uong|uong may lan|may tieng uong)\b/],
  ["alcohol", /\b(ruou|bia)\b/],
  ["why", /\b(de lam gi|tai sao|vi sao|nham muc dich)\b/],
  ["time", /\b(bao lau|may tieng|khi nao co|bao gio co|mat bao lau)\b/],
  ["prep", /\b(chuan bi|can gi|luu y|can lam gi|phai lam gi|mang gi|nen lam gi)\b/],
  ["eat", /\b(an|nhin an|an sang|an toi|an uong)\b/],
  ["drink", /\b(uong|nuoc|tra|ca phe|cafe|cf|sua|atiso)\b/],
  ["info", /\b(tac dung phu|tac dung|la thuoc gi|co hai|cong dung|la gi)\b/],
];
// Hỏi nối ngắn tham chiếu mơ hồ ("cái đó thì sao", "ý là cái kia á", "vậy còn cái này?").
const VAGUE_RE = /\b(cai do|cai kia|cai nay|vu do|chuyen do|no)\b/;
const OTHER_RE = /\b(cai kia|cai khac|chuyen khac)\b/;

function aspectOf(n: string, s: Subject): string | undefined {
  return ASPECTS.find(([k, re]) => s.aspects[k] && re.test(n))?.[0];
}

/** Câu chỉ gồm tham chiếu ngắn / khía cạnh, không nêu chủ thể mới (≤ 9 từ). */
function isFollowUp(n: string): boolean {
  return n.trim().split(/\s+/).length <= 9;
}

/**
 * Trả lời theo chủ thể sức khoẻ có trong câu, hoặc theo chủ thể đang nói (ctxSubject) nếu là câu hỏi nối.
 * null khi không có chủ thể rõ — để luồng khác (healthFact / triệu chứng / gate hỏi lại) xử lý.
 */
export function contextReply(text: string, ctxSubject?: string): ContextReply | null {
  const n = ` ${normalizeVi(text)} `;
  let s = SUBJECTS.find((x) => x.re.test(n));
  const fromCtx = !s;
  if (!s) {
    if (!ctxSubject || !isFollowUp(n)) return null;
    s = SUBJECTS.find((x) => x.id === ctxSubject);
    if (!s) return null;
  }
  const tm = n.match(TIME_RE)?.[1];
  const anchor: Anchor = {
    subject: s.id,
    aspect: s.main,
    timeframe: tm ? TIME_LABEL[tm] : undefined,
    object: OBJECTS.find(([re]) => re.test(n))?.[1],
    personal: SELF_RE.test(n),
  };
  const asp = aspectOf(n, s);
  if (fromCtx && !asp) {
    // "ý là cái kia á" → người dùng nói tới thứ KHÁC chủ thể đang nói → hỏi lại đúng 1 câu, không đoán.
    if (OTHER_RE.test(n)) return { text: `À, bạn đang nói tới chuyện khác ngoài ${s.label} hả? Bạn gõ rõ tên cái đó giúp Lomi nha.`, anchor };
    // "cái đó thì sao?", "vậy còn cái này?" → hiểu là vẫn hỏi về chủ thể đang nói.
    if (!VAGUE_RE.test(n) && !/\b(thi sao|the con|vay con|con)\b/.test(n)) {
      // "có được không?" — biết đang nói về chủ thể nào nhưng chưa rõ việc gì → hỏi đúng 1 câu còn thiếu.
      if (/\b(duoc khong|ok khong|on khong|sao khong)\b/.test(n) || text.includes("?"))
        return { text: `Bạn hỏi việc gì có được không trong chuyện ${s.label} nè — ăn, uống, hay dùng thuốc?`, anchor };
      return null;
    }
  }
  anchor.aspect = asp ?? s.main;
  return { text: s.aspects[anchor.aspect](anchor), anchor, urgent: anchor.aspect === "overdose" };
}

export const CONTEXT_SUBJECTS = SUBJECTS.map((s) => s.id);
