
// Trích khu vực từ địa chỉ doanh nghiệp — lấy đoạn cuối cùng sau dấu phẩy (thường là
// thành phố/quận). Dùng chung cho bộ lọc "Khám phá" và kênh vị trí trong "Cộng đồng"
// để 2 nơi luôn tính ra cùng 1 danh sách khu vực.
export const extractArea = (addr: string | null): string => {
  if (!addr) return "Khác";
  const parts = addr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] || "Khác";
  return last.replace(/\s+/g, " ").slice(0, 40);
};
