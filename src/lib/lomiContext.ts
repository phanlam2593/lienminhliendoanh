// ─────────────────────────────────────────────────────────────────────────────
// NGỮ CẢNH + BÁM CÂU HỎI CHO SỨC KHOẺ (05/10) — chạy trên máy, không gọi AI.
// Mỗi "chủ thể" (xét nghiệm máu, paracetamol, nội soi…) có các KHÍA CẠNH (chuẩn bị, uống, ăn, bao lâu…).
// Câu có chủ thể → trả lời đúng khía cạnh được hỏi. Câu hỏi nối ngắn KHÔNG có chủ thể ("chuẩn bị gì?",
// "còn ăn?", "bao lâu?") → chỉ hiểu theo chủ thể Lomi đang nói (ctx), không có ctx thì trả null để
// Understanding Gate hỏi lại. Chỉ dùng dữ kiện người dùng THỰC SỰ nói (known facts): mốc thời gian,
// món định uống — không suy ra bệnh, liều hay loại xét nghiệm khi họ chưa nói.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { drugById, renderDrug, sourceLine } from "@/lib/lomiDrugData";
import { VR, VN } from "@/lib/viMatch";

const PARA = drugById("paracetamol")!;

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
  [VN(/\btrà atiso\b|\batiso\b/), "trà atiso"],
  [VN(/\btrà sữa\b/), "trà sữa"],
  [VN(/\btrà\b/), "trà"],
  [VN(/\b(cà phê|cafe|cf)\b/), "cà phê"],
  [VN(/\bsữa\b/), "sữa"],
  [VN(/\bnước ngọt\b/), "nước ngọt"],
  [VN(/\b(rượu|bia)\b/), "rượu bia"],
  [VN(/\bnước lọc\b/), "nước lọc"],
];
const TIME_RE = VN(/\b(sáng mai|chiều mai|tối mai|ngày mai|mai|tuần sau|tuần tới|hôm nay|tối nay|sáng nay|chiều nay)\b/);
const TIME_LABEL: Record<string, string> = {
  "sang mai": "sáng mai", "chieu mai": "chiều mai", "toi mai": "tối mai", "ngay mai": "ngày mai", mai: "mai",
  "tuan sau": "tuần sau", "tuan toi": "tuần tới", "hom nay": "hôm nay", "toi nay": "tối nay", "sang nay": "sáng nay", "chieu nay": "chiều nay",
};
const SELF_RE = VN(/\b(mình|tôi|tui|em|anh|chị|bé|con|người nhà|mẹ mình|ba mình)\b/);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FAST_NOTE =
  "Có cần nhịn ăn hay không là **tuỳ loại xét nghiệm**: nhiều xét nghiệm máu (công thức máu, chức năng gan thận thông thường…) không bắt buộc nhịn; một số như đường huyết lúc đói, mỡ máu thường được dặn nhịn khoảng 8–12 tiếng.";
const ASK_LAB = "Bạn hỏi lại nơi xét nghiệm (hoặc xem phiếu chỉ định) là xét nghiệm gì và có cần nhịn không nha — đó là cách chắc nhất.";

const SUBJECTS: Subject[] = [
  {
    id: "bloodtest",
    label: "xét nghiệm máu",
    re: VN(/\b(xét nghiệm máu|thử máu|lấy máu|xn máu|kiểm tra máu|test máu)\b/),
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
    id: "atiso",
    label: "trà atiso",
    re: VN(/\b(trà atiso|atiso|actiso)\b/),
    main: "info",
    aspects: {
      info: () =>
        "🍵 **Trà atiso** thường được dùng trong dân gian để hỗ trợ tiêu hoá, \"mát gan\", lợi tiểu nhẹ.\n• Bằng chứng khoa học còn hạn chế — không thay được thuốc hay điều trị bệnh gan.\n• Thận trọng nếu bạn đang mang thai/cho con bú, bị sỏi hoặc tắc mật, dị ứng họ cúc (hoa cúc, cúc tây…), hoặc đang dùng thuốc điều trị (hỏi bác sĩ/dược sĩ).\n• Uống quá nhiều có thể gây đầy bụng, đi lỏng.\n\nĐây là kiến thức tham khảo chung, không phải lời khuyên riêng cho bạn.",
    },
  },
  {
    id: "endoscopy",
    label: "nội soi",
    re: VN(/\b(nội soi)\b/),
    main: "prep",
    aspects: {
      prep: () => "Chuẩn bị nội soi tuỳ loại (dạ dày hay đại tràng) và nơi làm sẽ dặn cụ thể. Thường gặp: nhịn ăn khoảng 6–8 tiếng trước nội soi dạ dày; nội soi đại tràng thì cần ăn nhẹ và uống thuốc làm sạch ruột theo hướng dẫn. Báo bác sĩ thuốc đang dùng (nhất là thuốc chống đông) và đi cùng người thân nếu nội soi có gây mê.",
      drink: () => "Trước nội soi thường được dặn ngưng uống trong vài tiếng (có nơi cho uống chút nước lọc tới 2 tiếng trước). Trà, cà phê, sữa nên tránh. Bạn làm theo đúng giờ nơi nội soi dặn nha.",
      eat: () => "Nội soi dạ dày thường nhịn ăn khoảng 6–8 tiếng; nội soi đại tràng thì ăn nhẹ, ít chất xơ 1–2 ngày trước theo hướng dẫn. Nơi làm sẽ dặn cụ thể cho bạn.",
      time: () => "Nội soi thường chỉ mất khoảng 10–30 phút; nếu gây mê thì cần thêm thời gian nghỉ cho tỉnh hẳn. Nhịn ăn thường 6–8 tiếng trước.",
    },
  },
  {
    // Kiến thức về paracetamol lấy từ lib/lomiDrugData (mỗi ý có nguồn + ngày đối chiếu) — ở đây chỉ còn việc chọn KHÍA CẠNH được hỏi.
    id: PARA.id,
    label: "paracetamol",
    re: PARA.match,
    main: "info",
    aspects: {
      info: () => renderDrug(PARA, "info"),
      // Liều: không có con số nào ở đây — chỉ nói liều phụ thuộc vào đâu và hỏi ai.
      dose: (a) =>
        `Lomi không đưa liều cụ thể${a.personal ? " cho từng người" : ""} được, vì liều paracetamol phụ thuộc **tuổi, cân nặng** (nhất là với trẻ em), bệnh gan và các thuốc khác đang dùng.\n• Làm theo tờ hướng dẫn trên hộp thuốc hoặc hỏi dược sĩ/bác sĩ.\n• Không tự tăng liều, không uống thêm thuốc cảm/thuốc ho có chứa paracetamol cùng lúc.\n\nBạn hỏi cho người lớn hay trẻ em (bao nhiêu tuổi, khoảng bao nhiêu ký)? Có thông tin đó thì dược sĩ tư vấn được ngay.`,
      kid: () => `${renderDrug(PARA, "children")}\n\nBé dưới 3 tháng mà sốt từ 38°C thì cần được nhân viên y tế xem sớm; bé li bì, co giật, khó thở → đưa đi cấp cứu ngay.`,
      overdose: () =>
        `${renderDrug(PARA, "overdose")}\n\nKhông tự gây nôn nha. Nếu bạn uống nhiều vì đang thấy quá sức chịu đựng: sau khi đã an toàn, bạn có thể gọi đường dây nóng Ngày Mai **096 306 1414** (13h–20h30, thứ 4 đến Chủ nhật), hoặc nói với một người bạn tin.`,
      alcohol: () => {
        const x = PARA.interactions.find((i) => i.id === "alcohol")!;
        return `🍺 Paracetamol và rượu bia: ${x.note}\n\n${sourceLine(PARA, x.src)}`;
      },
    },
  },
];

// Khía cạnh — thứ tự = độ ưu tiên.
const ASPECTS: [string, RegExp][] = [
  ["overdose", VN(/\b(quá liều|uống quá nhiều|uống nhầm|uống nhiều quá|uống nhiều|lỡ uống|uống cả vỉ|uống cả hộp|hại gan|tổn thương gan|suy gan)\b/)],
  ["kid", VN(/\b(trẻ|bé|em bé|con mình|trẻ em|\d+ tuổi)\b/)],
  ["dose", VN(/\b(bao nhiêu viên|mấy viên|liều|bao nhiêu mg|uống bao nhiêu|cách uống|uống mấy lần|mấy tiếng uống)\b/)],
  ["alcohol", VN(/\b(rượu|bia)\b/)],
  ["why", VN(/\b(để làm gì|tại sao|vì sao|nhằm mục đích)\b/)],
  ["time", VN(/\b(bao lâu|mấy tiếng|khi nào có|bao giờ có|mất bao lâu)\b/)],
  ["prep", VN(/\b(chuẩn bị|cần gì|lưu ý|cần làm gì|phải làm gì|mang gì|nên làm gì)\b/)],
  ["eat", VN(/\b(ăn|nhịn ăn|ăn sáng|ăn tối|ăn uống)\b/)],
  ["drink", VN(/\b(uống|nước|trà|cà phê|cafe|cf|sữa|atiso)\b/)],
  ["info", VN(/\b(tác dụng phụ|tác dụng|là thuốc gì|có hại|công dụng|là gì)\b/)],
];
// Hỏi nối ngắn tham chiếu mơ hồ ("cái đó thì sao", "ý là cái kia á", "vậy còn cái này?").
const VAGUE_RE = VN(/\b(cái đó|cái kia|cái này|vụ đó|chuyện đó|nó)\b/);
const OTHER_RE = VN(/\b(cái kia|cái khác|chuyện khác)\b/);

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
    if (!VAGUE_RE.test(n) && !VN(/\b(thì sao|thế còn|vậy còn|còn)\b/).test(n)) {
      // "có được không?" — biết đang nói về chủ thể nào nhưng chưa rõ việc gì → hỏi đúng 1 câu còn thiếu.
      if (VN(/\b(được không|ok không|ổn không|sao không)\b/).test(n) || text.includes("?"))
        return { text: `Bạn hỏi việc gì có được không trong chuyện ${s.label} nè — ăn, uống, hay dùng thuốc?`, anchor };
      return null;
    }
  }
  anchor.aspect = asp ?? s.main;
  return { text: s.aspects[anchor.aspect](anchor), anchor, urgent: anchor.aspect === "overdose" };
}

export const CONTEXT_SUBJECTS = SUBJECTS.map((s) => s.id);
