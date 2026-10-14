// Bộ đọc câu dùng chung (lib/viMatch): so khớp giữ dấu.
import { beforeEach, describe, expect, it } from "vitest";
import { V, canonVi, compileVi, resetViRegistry, setViStrict, stripCanon, beginViTurn } from "@/lib/viMatch";
import { normalizeVi } from "@/lib/lomiFaq";

beforeEach(() => {
  resetViRegistry();
  setViStrict(true);
});

describe("dạng có dấu chuẩn", () => {
  it("bỏ dấu ra đúng normalizeVi", () => {
    for (const t of ["Tăng huyết áp là gì?", "Đà Lạt mưa quá 😭", "  Hoà / hòa — THUỶ thủy  ", "người ơi!!!", "ĐƯỢC KHÔNG", "abc_123 x-y", "İstanbul ñ ø"]) {
      expect(stripCanon(canonVi(t)!), t).toBe(normalizeVi(t));
    }
  });
  it("cách đặt dấu cũ / mới như nhau", () => {
    expect(canonVi("hoà")).toBe(canonVi("hòa"));
    expect(canonVi("thuỷ")).toBe(canonVi("thủy"));
    expect(canonVi("là")).not.toBe(canonVi("lá"));
  });
});

describe("luật bọc V()", () => {
  it("chữ trong luật VN là đúng chữ đó: không dấu = không dấu", () => {
    expect(V(/\bla\b/).test(normalizeVi("Tăng huyết áp là gì?"))).toBe(false);
    expect(V(/\bla\b/).test(normalizeVi("sếp la a hoài"))).toBe(true);
    expect(V(/\ba\b/).test(normalizeVi("à, ra vậy"))).toBe(false);
    expect(V(/\ba\b/).test(normalizeVi("a đói quá"))).toBe(true);
    expect(V(/\bgout\b/).test(normalizeVi("bị gout ăn gì"))).toBe(true);
    expect(V(/\b[a-z]+ gì\b/).test(normalizeVi("bị gout ăn gì"))).toBe(true);
  });
  it("luật có dấu: câu gõ có dấu phải đúng chữ", () => {
    expect(V(/\blá\b/).test(normalizeVi("Tăng huyết áp là gì?"))).toBe(false);
    expect(V(/\blá\b/).test(normalizeVi("lá này nghĩa là gì"))).toBe(true);
    expect(V(/\b(đau|nhức) (đầu|bụng)\b/).test(normalizeVi("a đau đầu quá"))).toBe(true);
    expect(V(/\bđau\b/).test(normalizeVi("dấu hiệu là gì"))).toBe(false);
    expect(V(/\btrẹo\b/).test(normalizeVi("app bị treo"))).toBe(false);
    expect(V(/\btrẹo\b/).test(normalizeVi("bị trẹo cổ"))).toBe(true);
  });
  it("câu không dấu (không biết dạng có dấu) → luật có dấu bỏ dấu, so như cũ", () => {
    expect(V(/\blá\b/).test("la nay nghia la gi")).toBe(true);
    setViStrict(false);
    expect(V(/\blá\b/).test(normalizeVi("Tăng huyết áp là gì?"))).toBe(true);
  });
  it("câu nguyên văn có dấu → luật đúng như viết", () => {
    expect(V(/(thế nào|sao rồi)/i).test("Hôm nay thế nào?")).toBe(true);
    expect(V(/\?/).test("là gì?")).toBe(true);
  });
  it("chuỗi đệm khoảng trắng / một đoạn của câu vẫn biết dấu", () => {
    const n = normalizeVi("Tăng huyết áp là gì?");
    expect(V(/ lá /).test(` ${n} `)).toBe(false);
    expect(V(/^lá gì$/).test("la gi")).toBe(false); // đoạn "la gi" nằm trong câu vừa đọc → biết là "là gì"
    expect(V(/^là gì$/).test("la gi")).toBe(true);
  });
  it("câu của người dùng được ưu tiên khi tìm đoạn câu", () => {
    beginViTurn(["Tăng huyết áp là gì?"]);
    normalizeVi("Lá anh vừa rút nói gì"); // lời của Lomi chứa "lá"
    expect(V(/^lá$/).test("la")).toBe(false);
  });
  it("vị trí, nhóm bắt, replace trả về theo chuỗi không dấu", () => {
    const n = normalizeVi("Uống aspirin để làm gì");
    const m = n.match(V(/(uống|tiêm) (\w+) để (làm gì)/))!;
    expect(m[0]).toBe("uong aspirin de lam gi");
    expect(m[2]).toBe("aspirin");
    expect(m[3]).toBe("lam gi");
    expect(m.index).toBe(0);
    expect(n.replace(V(/ để làm gì/), "")).toBe("uong aspirin");
    expect(` ${n} `.replace(V(/ làm /g), " X ")).toBe(" uong aspirin de X gi ");
    expect(n.split(V(/ /))).toEqual(n.split(" "));
  });
  it("lượng từ, lớp ký tự, lookbehind", () => {
    const n = normalizeVi("có nên uống thuốc không");
    expect(V(/(?<![a-z])(nên|nền)(?![a-z])/).test(n)).toBe(true);
    expect(V(/\b[a-z]+ thuốc\b/).test(n)).toBe(true);
    expect(V(/\b(?:không|khôn)\b/).test(n)).toBe(true);
    expect(V(/^thuốc?$/).test(normalizeVi("thuố"))).toBe(true); // lượng từ áp vào chữ cái cuối, dấu thanh vẫn của cả chữ
    expect(V(/^chào+$/).test(normalizeVi("chàoooo"))).toBe(true);
    expect(V(/^chào+$/).test(normalizeVi("cháo"))).toBe(false);
    expect(n.match(V(/^([^ ]+) nên/))![1]).toBe("co");
  });
  it("dịch được các mẫu thường gặp", () => {
    for (const src of [String.raw`\b(lá|bài|lá bài)\b`, String.raw`^(?:vậy |thế )*((?:\S+ ){0,2}?\S+?) (?:thì sao|sao)$`, String.raw`(?<![a-z])(nên|hay)(?![a-z])`, String.raw`\d+(?:[.,]\d+)? ?(?:km|cây số)\b`, String.raw`[^a-z0-9\s]`, String.raw`\bla\B`])
      expect(() => new RegExp(compileVi(src), "u"), src).not.toThrow();
  });
});
