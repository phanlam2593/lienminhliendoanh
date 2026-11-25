// 25/11 (Kir: "đề xuất tags để đỡ hiểu sai mà vẫn hiểu sai, thêm Claude mà vẫn sai") — nút chủ đề phải thật sự được dùng:
//  • tab Kinh doanh: kể mình làm / bán gì → hiểu là giới thiệu loại hình kinh doanh;
//  • tab khác "Tâm sự" mà Lomi chỉ đáp được câu trò chuyện chung → chuyển Claude kèm ghi chú chủ đề.
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";
import { tabClaudeEligible, withTabHint } from "@/lib/lomiClaude";

const T = 60000;

describe("25/11 — nút chủ đề được dùng thật", () => {
  it("tab Kinh doanh: 'A đang làm app lomi nè' ngay câu đầu → tư vấn kinh doanh, không khuyên uống nước", async () => {
    const r = await chat(["A đang làm app lomi nè 🫣"], { tab: "biz" });
    expect(r[0].content).not.toMatch(/vươn vai|uống nước/);
    expect(r[0].content).toMatch(/app iLomi/i);
    const b = await chat(["mình bán bánh tráng nướng ở chợ"], { tab: "biz" });
    expect(b[0].content).not.toMatch(/vươn vai|uống nước/);
    expect(b[0].quick?.length ?? 0).toBeGreaterThan(0);
  }, T);

  it("không chọn tab thì câu kể chuyện đi làm vẫn đáp như trò chuyện", async () => {
    const r = await chat(["a đang làm việc mệt quá"]);
    expect(r[0].biz).toBeFalsy();
  }, T);

  it("tab khác Tâm sự + Lomi chỉ đáp được câu trò chuyện chung → hỏi Claude kèm ghi chú chủ đề", async () => {
    const sent: { messages: { role: string; content: string }[]; kind?: string }[] = [];
    (globalThis as any).__lomiInvoke = (_n: string, o: { body: (typeof sent)[number] }) => {
      sent.push(o.body);
      return { data: { reply: "CLAUDE_TRẢ_LỜI" }, error: null };
    };
    try {
      const plain = await chat(["a đang làm việc nè"]);
      expect(sent.length).toBe(0); // không chọn tab: như cũ
      const r = await chat(["a đang làm việc nè"], { tab: "cook" });
      expect(sent.length).toBe(1);
      expect(sent[0].kind).toBe("tab_offtopic");
      expect(sent[0].messages.at(-1)?.content).toMatch(/"Nấu ăn"/);
      expect(r[0].content).toBe("CLAUDE_TRẢ_LỜI");
      expect(plain[0].content).not.toBe("CLAUDE_TRẢ_LỜI");
      await chat(["a đang làm việc nè"], { tab: "heart" });
      expect(sent.length).toBe(1); // tab Tâm sự: câu trò chuyện là đúng chỗ
    } finally {
      delete (globalThis as any).__lomiInvoke;
    }
  }, T);

  it("tabClaudeEligible / withTabHint", () => {
    const base = { sense: true, question: "A đang làm app lomi nè", risk: null };
    expect(tabClaudeEligible({ ...base, tab: "biz" })).toBe(true);
    expect(tabClaudeEligible({ ...base, tab: "heart" })).toBe(false);
    expect(tabClaudeEligible({ ...base, tab: null })).toBe(false);
    expect(tabClaudeEligible({ ...base, tab: "biz", sense: false })).toBe(false);
    expect(tabClaudeEligible({ ...base, tab: "biz", question: "ừ ok" })).toBe(false);
    expect(withTabHint("abc", "biz")).toMatch(/"Kinh doanh"/);
  });
});

// 25/11 (Kir, ảnh chụp + bản ChatGPT): "Gout ăn cá biển đc k?" từng ra "chưa xác minh được" rồi lại liệt kê cá cơm, cá mòi — lủng củng.
describe("25/11 — gout ăn cá", () => {
  it("cá biển / cá thu → hạn chế, nêu loại cần hạn chế; cá lóc → được, vừa phải", async () => {
    const a = await chat(["Gout ăn cá biển đc k?"], { tab: "health" });
    expect(a[0].content).toMatch(/hạn chế/);
    expect(a[0].content).toMatch(/cá cơm, cá mòi/);
    expect(a[0].content).not.toMatch(/chưa xác minh/);
    const b = await chat(["bị gút ăn cá lóc được ko"]);
    expect(b[0].content).toMatch(/cá nước ngọt/);
    expect(b[0].content).not.toMatch(/chưa xác minh/);
  }, T);
});

// 25/11 — bộ câu Kir lấy nguồn qua ChatGPT, Claude đối chiếu lại (Mayo Clinic, CDC "Carb Choices").
describe("25/11 — gout ăn tôm, tiểu đường ăn chuối", () => {
  it("tôm → hạn chế (hải sản có vỏ), không bỏ hẳn; chuối → kèm khẩu phần CDC; chuối sấy không còn 'chưa xác minh'", async () => {
    const a = await chat(["Gout ăn tôm được không?"]);
    expect(a[0].content).toMatch(/hải sản có vỏ/);
    expect(a[0].content).toMatch(/hạn chế/);
    expect(a[0].content).not.toMatch(/trout/);
    const b = await chat(["Tiểu đường ăn chuối được không?"]);
    expect(b[0].content).toMatch(/chuối \*\*rất nhỏ\*\*/);
    const c = await chat(["tiểu đường ăn chuối sấy được ko"]);
    expect(c[0].content).not.toMatch(/chưa xác minh/);
    expect(c[0].content).toMatch(/nửa lòng bàn tay/);
  }, T);
});

// 26/11 — "X có nguy hiểm không": câu mở đầu theo thẻ (trước đây bệnh nào cũng "hay gặp và nhiều khi tự đỡ").
describe("26/11 — có nguy hiểm không", () => {
  it("bong võng mạc → có thể nguy hiểm; không nói 'tự đỡ'", async () => {
    const r = await chat(["bong võng mạc có nguy hiểm không"]);
    expect(r[0].content).toMatch(/có thể nguy hiểm/);
    expect(r[0].content).not.toMatch(/tự đỡ/);
  }, T);
});
