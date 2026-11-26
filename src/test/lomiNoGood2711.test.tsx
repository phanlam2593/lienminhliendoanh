// 27/11 (Kir chụp màn hình: "A chưa bh trúng số :((" → Lomi đáp "Hay quá trời luôn 🎊 … ăn mừng").
// Tin vui bị PHỦ ĐỊNH ("chưa bao giờ", "không", "chưa được") không phải tin vui; "bh" sau phủ định = "bao giờ".
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";
import { expandTeen } from "@/lib/lomiChat";

const CHEER = /chúc mừng|ăn mừng|vui lây|xứng đáng|tuyệt vời/i;
describe("tin vui bị phủ định", () => {
  it("bh theo ngữ cảnh", () => {
    expect(expandTeen("a chưa bh trúng số")).toContain("chưa bao giờ");
    expect(expandTeen("bh a đang ở nhà")).toContain("bây giờ");
  });
  for (const q of ["A chưa bh trúng số :((", "a chưa bao giờ trúng số", "a k trúng số", "a kbh trúng số", "hôm qua mua vé số mà không trúng"])
    it(q, async () => {
      const [r] = await chat([q]);
      expect(r.content).not.toMatch(CHEER);
      expect(r.content).toMatch(/vé số|trúng/);
    }, 60000);
  for (const q of ["a chưa được tăng lương", "a không đậu đại học", "a chưa bh được khen", "a vẫn chưa có việc"])
    it(q, async () => {
      const [r] = await chat([q]);
      expect(r.content).not.toMatch(CHEER);
    }, 60000);
  for (const q of ["a vừa trúng số", "a trúng số rồi"])
    it(q + " vẫn là tin vui", async () => {
      const [r] = await chat([q]);
      expect(r.content).toMatch(CHEER);
    }, 60000);
});
