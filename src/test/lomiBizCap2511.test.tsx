// 25/11 (Kir, ảnh chụp app) — "E giúp a tư vấn kinh doanh đc k?" → Lomi hỏi "đang kinh doanh gì" → "A đang làm app lomi nè"
// từng bị đọc như kể đang làm việc ("Nhớ uống nước và vươn vai"). Câu kế tiếp phải là câu trả lời loại hình.
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";
import { bizAnswerNoun, detectBizKind } from "@/lib/bizAdvisor";

const T = 60000;

describe("25/11 — tư vấn kinh doanh: trả lời loại hình sau câu hỏi khả năng", () => {
  it("đúng đoạn chat của anh Kir", async () => {
    const r = await chat(["E giúp a tư vấn kinh doanh đc k?", "A đang làm app lomi nè 🫣"]);
    expect(r[0].content).toMatch(/kinh doanh gì/);
    expect(r[1].content).not.toMatch(/vươn vai|uống nước/);
    expect(r[1].content).toMatch(/app iLomi/i);
    expect(r[1].content).not.toMatch(/đang làm/i);
    const r3 = await chat(["E giúp a tư vấn kinh doanh đc k?", "A đang làm app lomi nè", "làm sao có thêm khách mới"]);
    expect(r3[2].stuck).toBeFalsy();
    expect(r3[2].content).toMatch(/①/);
    expect(r3[2].content).not.toMatch(/Mã QR trước cửa|ở quầy/);
  }, T);

  it("trả lời loại hình khác kiểu gõ tự do", async () => {
    const r = await chat(["Lomi có tư vấn kinh doanh không", "mình bán bánh tráng nè"]);
    expect(r[1].content).toMatch(/^Bánh tráng hả/);
    const r2 = await chat(["e tư vấn kinh doanh được ko", "a mở quán cà phê"]);
    expect(r2[1].stuck).toBeFalsy();
    expect(r2[1].content).not.toMatch(/vươn vai/);
  }, T);

  it("app: mẹo dành cho sản phẩm số; 'gợi ý ưu đãi' giữa cuộc tư vấn là xin ý tưởng, không đi tìm chỗ", async () => {
    const r = await chat(["E giúp a tư vấn kinh doanh đc k?", "A đang làm app lomi nè", "gợi ý ưu đãi", "viết bài đăng giới thiệu"]);
    expect(r[2].content).not.toMatch(/khu vực nào/);
    expect(r[2].content).not.toMatch(/Freeship|đóng 1 dấu|ở quầy/);
    expect(r[3].content).toMatch(/📝 Mẫu 1/);
    expect(r[3].content).not.toMatch(/ghé chơi|giữ chỗ/);
    const c = await chat(["e tư vấn kinh doanh được ko", "quán cà phê", "gợi ý ưu đãi"]);
    expect(c[2].content).not.toMatch(/khu vực nào/);
    expect(c[2].content).toMatch(/①/);
  }, T);

  it("bài đăng mẫu giữ 'bạn' (lời nói với khách) dù người dùng xưng anh", async () => {
    for (let i = 0; i < 4; i++) {
      const r = await chat(["a mở quán cà phê, viết giúp a bài đăng ưu đãi"]);
      const posts = r[0].content.match(/📝 Mẫu \d+:\n[\s\S]*?(?=\n\n|$)/gu) ?? [];
      for (const p of posts) expect(p).not.toMatch(/(^|\s)(anh|Anh) (đã|đang tìm)|Hẹn gặp anh/u);
    }
  }, T);

  it("bizAnswerNoun / detectBizKind", () => {
    expect(bizAnswerNoun("A đang làm app lomi nè 🫣")).toBe("app iLomi");
    expect(bizAnswerNoun("mình bán bánh tráng á")).toBe("bánh tráng");
    expect(bizAnswerNoun("nhà hàng")).toBe("nhà hàng");
    expect(detectBizKind("a đang làm app").type).toBe("other");
    expect(detectBizKind("homestay").type).toBe("stay");
  });
});
