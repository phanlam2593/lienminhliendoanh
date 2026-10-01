// Test chữ kéo dài để biểu cảm — theo tài liệu "14. Expressive text" của Kir (01/10).
// Mỗi câu kiểm riêng: nghĩa gốc (unstretch), tín hiệu nhấn (expressive), cảm xúc (tone), và cách Lomi đáp.
import { describe, expect, it } from "vitest";
import { expandTeen, expressiveReply, unstretch } from "@/lib/lomiChat";
import { expressive, tone } from "@/lib/lomiUnderstand";

describe("14.11 nghĩa gốc giữ nguyên, không phá chữ thật", () => {
  const base: [string, string][] = [
    ["okkkk", "ok"], ["okkkkkkkkk", "ok"], ["chánnnn", "chán"], ["hừmmm", "hừm"], ["khôngggg", "không"],
    ["đượcccc", "được"], ["đẹppppp", "đẹp"], ["trờiiiiii", "trời"], ["ơiiii", "ơi"], ["haizzzz", "haiz"],
    ["hahaahah", "haha"], ["kkkkk", "kk"],
    // 14.5 chữ lặp thật
    ["coffee", "coffee"], ["app", "app"], ["ưu đãi", "ưu đãi"], ["cứu", "cứu"],
  ];
  for (const [raw, want] of base) it(`${raw} → ${want}`, () => expect(unstretch(raw)).toBe(want));
});

describe("14.2–14.7 tín hiệu nhấn / dấu câu / emoji được giữ riêng", () => {
  it("kéo dài = nhấn mạnh", () => {
    expect(expressive("chánnnn").stretched).toBe(true);
    expect(expressive("chán").stretched).toBe(false);
    expect(expressive("coffee").stretched).toBe(false);
  });
  it("dấu … = do dự", () => expect(expressive("ok......").trail).toBe(true));
  it("dấu ! = dứt khoát", () => expect(expressive("ok!").bang).toBe(true));
  it("emoji lặp", () => expect(expressive("😭😭😭").repeatEmoji).toBe(true));
  it("tone theo emoji, không cố định theo chữ", () => {
    expect(tone("okkk 😂")).toBe("laugh");
    expect(tone("okkk 🥲")).toBe("sad");
    expect(tone("chánnnn 😭")).toBe("sad");
  });
});

describe("14.3 cùng chữ, khác sắc thái → đáp khác", () => {
  const reply = (raw: string) => expressiveReply(expandTeen(raw), raw)?.text ?? "";
  it("okkk 😂 → vui", () => expect(reply("okkk 😂")).toMatch(/Okiee|Chốt|Yeahh/));
  it("okkk 🥲 / ok...... → miễn cưỡng", () => {
    expect(reply("okkk 🥲")).toMatch(/miễn cưỡng|khó/);
    expect(reply("ok......")).toMatch(/miễn cưỡng|khó/);
  });
  it("ok thường → để luồng chào/đáp thường lo (không phóng đại)", () => expect(reply("ok")).toBe(""));
  it("chánnnn 😭 → hỏi han, không phân tích ngôn ngữ", () => {
    const r = reply("chánnnnn 😭");
    expect(r).toMatch(/Chán/);
    expect(r).not.toMatch(/kéo dài phụ âm|biểu đạt/);
  });
  it("haizzzz → hỏi sao thở dài", () => expect(reply("haizzzz")).toMatch(/Thở dài|Haiz/));
  it("hmmmm... → phân vân", () => expect(reply("hmmmm...")).toMatch(/phân vân|chưa chắc/));
  it("khônggggg 😭 → hỏi han", () => expect(reply("khônggggg 😭")).toMatch(/sao|buồn/i));
});
