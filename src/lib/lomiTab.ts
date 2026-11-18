// Chủ đề Lomi (18/11, anh Kir duyệt) — 4 nút ở màn Trợ lý Lomi. Là GỢI Ý MỀM, không khoá cứng:
//  • chỉ nghiêng về chủ đề đã chọn ở những câu NƯỚC ĐÔI (vd "mất ngủ" = bệnh hay tâm sự?);
//  • câu rõ ràng thuộc chủ đề khác thì Lomi vẫn trả lời đúng chủ đề đó;
//  • lớp an toàn (ý định tự hại, cấp cứu, bạo lực) luôn chạy trước, bất kể đang chọn nút nào.
// Không chọn nút nào = "tự do" như trước. Giá trị để ở biến dùng chung cho luồng xử lý tin (AiAssistant đọc lúc gửi).
export type LomiTab = "heart" | "health" | "app" | "other";

export const LOMI_TABS: { id: LomiTab; emoji: string; label: string; placeholder: string }[] = [
  { id: "heart", emoji: "💬", label: "Tâm sự & tâm lý", placeholder: "Có chuyện gì kể Lomi nghe nè…" },
  { id: "health", emoji: "🩺", label: "Sức khoẻ", placeholder: "Bạn hỏi gì về sức khoẻ nè? Vd: mất ngủ nên làm gì" },
  { id: "app", emoji: "📱", label: "Hỏi về app", placeholder: "Hỏi cách dùng iLomi. Vd: làm sao nhận ưu đãi" },
  { id: "other", emoji: "✨", label: "Khác", placeholder: "Bói tarot, tìm quán, tư vấn kinh doanh…" },
];

export const lomiTab: { cur: LomiTab | null } = { cur: null };

const KEY = "lomi:tab";
export function loadLomiTab(): LomiTab | null {
  try {
    const v = localStorage.getItem(KEY);
    return LOMI_TABS.some((t) => t.id === v) ? (v as LomiTab) : null;
  } catch {
    return null;
  }
}
export function saveLomiTab(v: LomiTab | null) {
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
}
