// Toàn bộ thẻ kiến thức y khoa (lib/medkb/*.json) gom vào MỘT chunk riêng — lib/lomiMed nạp chunk này (import động)
// khi lần đầu cần, nên gói chính không nặng thêm và PWA chỉ tải 1 file thay vì hàng trăm file nhỏ.
export const MED_CARDS = import.meta.glob(["./medkb/*.json", "!./medkb/index.json"], { eager: true, import: "default" }) as Record<string, unknown>;
