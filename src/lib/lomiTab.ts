// Chủ đề Lomi (18/11, anh Kir duyệt) — 4 nút ở màn Trợ lý Lomi. Là GỢI Ý MỀM, không khoá cứng:
//  • chỉ nghiêng về chủ đề đã chọn ở những câu NƯỚC ĐÔI (vd "mất ngủ" = bệnh hay tâm sự?);
//  • câu rõ ràng thuộc chủ đề khác thì Lomi vẫn trả lời đúng chủ đề đó;
//  • lớp an toàn (ý định tự hại, cấp cứu, bạo lực) luôn chạy trước, bất kể đang chọn nút nào.
// Không chọn nút nào = "tự do" như trước. Giá trị để ở biến dùng chung cho luồng xử lý tin (AiAssistant đọc lúc gửi).
// 22/11 (Kir): bỏ nút "Khác" — tách thành các mảng Lomi đã làm được (ăn chơi Đà Lạt, nấu ăn, Tarot, kinh doanh).
//   Các nút mới chỉ đổi câu gợi ý trong ô nhập, KHÔNG đổi cách xử lý (luồng chung vẫn tự nhận ra chủ đề).
export type LomiTab = "heart" | "health" | "food" | "cook" | "tarot" | "biz" | "app";

export const LOMI_TABS: { id: LomiTab; emoji: string; label: string; placeholder: string }[] = [
  { id: "heart", emoji: "💬", label: "Tâm sự", placeholder: "Có chuyện gì kể Lomi nghe nè…" },
  { id: "health", emoji: "🩺", label: "Sức khoẻ", placeholder: "Vd: mất ngủ nên làm gì" },
  { id: "food", emoji: "📍", label: "Ăn chơi", placeholder: "Vd: quán lẩu cho nhóm 6 người" },
  { id: "cook", emoji: "🍳", label: "Nấu ăn", placeholder: "Vd: cách nấu canh chua cá lóc" },
  { id: "tarot", emoji: "🔮", label: "Tarot", placeholder: "Vd: bói tình duyên tháng này" },
  { id: "biz", emoji: "💼", label: "Kinh doanh", placeholder: "Vd: làm sao để quán đông khách" },
  { id: "app", emoji: "📱", label: "Hỏi về app", placeholder: "Vd: làm sao nhận ưu đãi" },
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
