// 01/10 — "Híc" sau một câu hỏi app không được đáp "Về chuyện <câu app>…, chưa có hướng dẫn".
import { describe, expect, it } from "vitest";
import { tone } from "@/lib/lomiUnderstand";
import { chitChat, scopedFallback } from "@/lib/lomiChat";

describe("híc / hic / hix là buồn", () => {
  for (const s of ["Híc", "hic", "hixx", "hức", "hu hu", "huhu"]) it(s, () => expect(tone(s)).toBe("sad"));
  it("chữ có 'hic' bên trong không tính", () => expect(tone("chic quá")).toBe("neutral"));
  it("chitChat hỏi han khi gõ Híc", () => {
    const r = chitChat("Híc", "vi", undefined, "Híc");
    expect(r?.text).toMatch(/sao vậy|Ôm/);
  });
  it("fallback không lôi câu app cũ ra khi chỉ là cảm thán", () => {
    expect(scopedFallback("ủa", "Liên hệ Ban quản trị thế nào?").text).not.toMatch(/Về chuyện/);
  });
});
