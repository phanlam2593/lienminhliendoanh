import { describe, expect, it } from "vitest";
import { dropRepeats, saidBefore } from "@/lib/lomiCite";

describe("dropRepeats (30/10)", () => {
  it("bỏ câu gần trùng, giữ câu khác nghĩa", () => {
    const t = "• Dược sĩ có thể tư vấn thuốc nhỏ mắt; trẻ dưới 2 tuổi cần bác sĩ kê đơn.\n• Trẻ dưới 2 tuổi cần bác sĩ kê thuốc. Bé dưới 30 ngày tuổi mà mắt đỏ thì đi khám gấp.";
    expect(dropRepeats(t)).toBe("• Dược sĩ có thể tư vấn thuốc nhỏ mắt; trẻ dưới 2 tuổi cần bác sĩ kê đơn.\n• Bé dưới 30 ngày tuổi mà mắt đỏ thì đi khám gấp.");
    const neg = "• Nên cho trẻ uống nhiều nước khi bị sốt cao.\n• Không nên cho trẻ uống nhiều nước khi bị sốt cao.";
    expect(dropRepeats(neg)).toBe(neg);
    const num = "• Trẻ dưới 2 tuổi cần bác sĩ kê đơn thuốc.\n• Trẻ dưới 6 tuổi cần bác sĩ kê đơn thuốc.";
    expect(dropRepeats(num)).toBe(num);
    const head = "• Tránh rượu bia và cà phê khi bị bệnh.\n🚫 Nên tránh: rượu bia, cà phê khi bị bệnh";
    expect(dropRepeats(head)).toBe(head);
  });
  it("saidBefore", () => {
    expect(saidBefore("rất ít bằng chứng vitamin C giúp phòng hay mau khỏi cảm", "• Bằng chứng cho thấy vitamin C giúp phòng cảm hay mau khỏi còn rất ít.")).toBe(true);
    expect(saidBefore("chườm ấm, xoa bụng giúp giảm đau", "• Uống nhiều nước.")).toBe(false);
  });
});
