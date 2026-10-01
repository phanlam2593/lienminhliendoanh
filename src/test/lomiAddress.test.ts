// Test xưng hô của Lomi — theo tài liệu "11. Xưng hô" của Kir (01/10). Chạy: npx vitest run src/test/lomiAddress.test.ts
import { describe, expect, it } from "vitest";
import { detectAddr, explicitAddr, speak } from "@/lib/lomiAddress";

describe("11.13 xưng hô", () => {
  const cases: [string, ReturnType<typeof detectAddr>][] = [
    ["anh ơi cái này làm sao vậy?", null], // "anh" là người được gọi (Lomi) — không suy ra người dùng
    ["chị ơi cho em hỏi", "em"], // "chị" = Lomi, người dùng tự xưng "em"
    ["ê bro cứu tui", null], // gọi đùa, không đổi xưng hô
    ["ông biết cái này không?", null], // có thể là ngôi thứ ba — giữ cách đang dùng
    ["anh Minh nói với em là mai đi", "em"], // "anh Minh" là người thứ ba; người dùng xưng "em"
    ["chị Hoa mới nhắn em", null], // "chị Hoa" là người thứ ba
    ["từ giờ gọi tui là anh nha", "anh"],
    ["thôi đừng xưng anh em nữa, gọi mình là bạn", "bạn"],
    ["anh ơi 😭", null],
    ["bro cái app bị gì v :))", null],
    // Lỗi Kir gặp: gọi Lomi là "e" → không được gọi người dùng là "em"
    ["lomi e đang làm j đó", "bạn-em"],
    ["lomi em ơi", "bạn-em"],
    ["e ơi giúp a với", "anh"],
    ["anh hỏi em cái này", "anh"],
    ["em hỏi anh ấy rồi", "em"],
    ["chị tui mới gọi", null],
    ["xưng anh em với tui nha", "anh"],
    ["mình đang chán", "bạn"],
  ];
  for (const [text, want] of cases) it(text, () => expect(detectAddr(text)).toBe(want));

  it("chỉ câu nói RÕ mới là yêu cầu khoá xưng hô", () => {
    expect(explicitAddr("từ giờ gọi tui là anh nha")).toBe("anh");
    expect(explicitAddr("anh ơi cái này làm sao")).toBeNull();
  });
  it("bạn-em: Lomi xưng em, vẫn gọi người dùng là bạn", () => {
    expect(speak("Lomi đang chờ bạn nè", "bạn-em")).toBe("Em đang chờ bạn nè");
  });
  it("người dùng là anh: gọi anh, Lomi xưng em", () => {
    expect(speak("Lomi giúp bạn liền nha", "anh")).toBe("Em giúp anh liền nha");
  });
});
