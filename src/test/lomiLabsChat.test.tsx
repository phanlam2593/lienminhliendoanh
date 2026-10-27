// 27/10 — chỉ số xét nghiệm qua cả mạch chat (theo ý Kir: "chỉ số mỡ máu, ion, đường… cao thấp, mức nguy hiểm, mẹo, kiêng").
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";

const T = 60_000;
describe("chỉ số xét nghiệm trong chat (27/10)", () => {
  it("kali / natri / tiểu cầu / bạch cầu có số → đọc theo nguồn, có nguồn ẩn", async () => {
    for (const [q, re] of [
      ["Kali 3.1 có sao không", /hạ kali máu/],
      ["Natri 128 là sao", /hạ natri máu/],
      ["Tiểu cầu 40 nguy hiểm không", /dưới 50\.000/],
      ["Bạch cầu 15.6 cao không", /tăng bạch cầu/],
      ["eGFR 45 là bệnh gì", /bệnh thận mạn/],
    ] as const) {
      const m = await last([q]);
      expect(m.content, q).toMatch(re);
      expect(m.src, q).toMatch(/MedlinePlus/);
    }
  }, T);
  it("chỉ số lệch → kèm mẹo & kiêng từ thẻ có nguồn", async () => {
    const a = await last(["Axit uric 520 có cao không, anh là nam"]);
    expect(a.content).toMatch(/Mẹo & kiêng — gout[\s\S]*purin/);
    const b = await last(["Mỡ máu cholesterol 6.5 có cao không"]);
    expect(b.content).toMatch(/Mẹo & kiêng/);
    const c = await last(["Kali cao kiêng gì"]);
    expect(c.content).toMatch(/hạn chế thực phẩm nhiều kali/);
  }, T);
  it("không cướp câu khác", async () => {
    expect((await last(["Đau gót chân có sao không"])).content).not.toMatch(/AST|GOT/);
    expect((await last(["Bệnh bạch cầu là gì"])).content).toMatch(/Ung thư máu/);
    expect((await last(["Vitamin D3 uống bao nhiêu"])).content).not.toMatch(/nmol/);
  }, T);
});
