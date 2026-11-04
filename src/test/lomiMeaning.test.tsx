// 02/11 (hướng 2): gợi ý theo NGHĨA khi Lomi bí — máy chủ (edge function lomi-understand) được thay bằng nguồn giả trong test.
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { last } from "./lomiChatHarness";
import { meaningChips, setMeaningProvider } from "@/lib/lomiMeaning";
import { FAQS } from "@/lib/lomiFaq";

const T = 60000;
afterEach(() => setMeaningProvider(null));

describe("hiểu nghĩa khi Lomi bí (lomi-understand)", () => {
  it("trộn xếp hạng theo nghĩa với từ khoá; chủ đề sức khoẻ điểm thấp bị bỏ", async () => {
    setMeaningProvider(async () => [
      { id: "faq:deleteacc", score: 0.88 },
      { id: "med:viem-xoang", score: 0.86 },
      { id: "faq:deleterestore", score: 0.856 },
    ]);
    const c = await meaningChips("xoá vĩnh viễn nick");
    expect(c?.[0]).toBe("Xoá tài khoản thế nào?");
    expect(c).not.toContain("Viêm xoang là gì?");
    setMeaningProvider(async () => [{ id: "med:tieu-duong", score: 0.918 }]);
    expect(await meaningChips("đường trong máu cao")).toContain("Tiểu đường là gì?");
    // máy chủ lỗi / không trả gì → null (Lomi đáp như cũ)
    setMeaningProvider(async () => null);
    expect(await meaningChips("xoá vĩnh viễn nick")).toBeNull();
  });
  it("qua khung chat: câu hỏi Lomi bí → hỏi lại kèm gợi ý theo nghĩa, không tự trả lời", async () => {
    setMeaningProvider(async () => [{ id: "faq:theme", score: 0.861 }, { id: "faq:password", score: 0.846 }]);
    const m = await last(["chuyển sang chế độ nền đen được không"]);
    expect(m.content).toMatch(/Có phải bạn muốn hỏi/);
    expect(m.quick).toContain("Đổi giao diện tối hoặc ngôn ngữ?");
    expect(m.faqId).toBeUndefined();
    // không có nguồn → như cũ (không có gợi ý theo nghĩa)
    setMeaningProvider(null);
    expect((await last(["chuyển sang chế độ nền đen được không"])).quick ?? []).not.toContain("Đổi giao diện tối hoặc ngôn ngữ?");
  }, T);
  it("câu Lomi đã hiểu thì không hỏi máy chủ", async () => {
    let called = 0;
    setMeaningProvider(async () => (called++, [{ id: "faq:theme", score: 0.9 }]));
    expect((await last(["quên mật khẩu"])).faqId).toBe("forgot");
    expect((await last(["bị gout ăn tỏi được không"])).content).toMatch(/tỏi/);
    expect(called).toBe(0);
  }, T);
  it("câu mẫu của máy chủ còn khớp FAQ + kho bệnh hiện tại (đổi FAQ / bệnh thì chạy lại scripts/lomi-understand-build.py)", () => {
    const a = JSON.parse(readFileSync("supabase/functions/lomi-understand/anchors.json", "utf8")) as { items: string[]; owner: number[]; dim: number; q: string };
    const med = (JSON.parse(readFileSync("src/lib/medkb/index.json", "utf8")) as { id: string }[]).map((r) => `med:${r.id}`);
    expect(a.items).toEqual([...FAQS.map((f) => `faq:${f.id}`), ...med]);
    expect(Buffer.from(a.q, "base64").length).toBe(a.owner.length * a.dim);
  });
});
