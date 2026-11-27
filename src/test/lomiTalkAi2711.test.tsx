// 27/11 (Kir: "tâm sự để AI lo — dùng Sonnet; chưa tính Membership"): tab Tâm sự → câu đáp KIỂU TRÒ CHUYỆN do AI viết
//   (lomi-claude mode "talk"); máy vẫn giữ câu an toàn, sức khoẻ, Tarot, tìm quán, app; lần đầu hỏi đồng ý gửi tin.
import { afterEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { chat } from "./lomiChatHarness";
import { talkEligible } from "@/lib/lomiClaude";

type Sent = { name: string; body: { mode?: string; messages: { role: string; content: string }[] } };
let sent: Sent[] = [];
const g = globalThis as { __lomiInvoke?: (n: string, o: unknown) => unknown };
const fakeAi = (reply = "AI_TRẢ_LỜI") => {
  sent = [];
  g.__lomiInvoke = (name, o) => {
    const body = (o as { body: Sent["body"] }).body;
    sent.push({ name, body });
    return { data: body.mode === "talk" ? { reply, remaining: 59 } : { fallback: true, error: "MEMBER_ONLY" }, error: null };
  };
};
afterEach(() => {
  delete g.__lomiInvoke;
});
const T = 60000;

describe("tab Tâm sự — trò chuyện bằng AI", () => {
  it("đã đồng ý: câu tâm sự đi qua AI (mode talk), kèm lịch sử gần nhất", async () => {
    fakeAi();
    const r = await chat(["A chưa bh trúng số :((", "mà thôi kệ"], { tab: "heart", talkConsent: "yes" });
    expect(r[0].content).toBe("AI_TRẢ_LỜI");
    expect(r[1].content).toBe("AI_TRẢ_LỜI");
    const talk = sent.filter((x) => x.body.mode === "talk");
    expect(talk.length).toBe(2);
    expect(talk[1].body.messages.map((m) => m.content)).toEqual(["A chưa bh trúng số :((", "AI_TRẢ_LỜI", "mà thôi kệ"]);
  }, T);

  it("đã từ chối: chỉ dùng Lomi trên máy, không gọi AI", async () => {
    fakeAi();
    const r = await chat(["A chưa bh trúng số :(("], { tab: "heart", talkConsent: "no" });
    expect(r[0].content).not.toBe("AI_TRẢ_LỜI");
    expect(sent.filter((x) => x.body.mode === "talk").length).toBe(0);
  }, T);

  it("tab khác Tâm sự: không dùng đường trò chuyện AI", async () => {
    fakeAi();
    await chat(["A chưa bh trúng số :(("], { tab: "health", talkConsent: "yes" });
    expect(sent.filter((x) => x.body.mode === "talk").length).toBe(0);
  }, T);

  it("câu nguy hiểm: máy trả lời an toàn, KHÔNG gửi AI — cả lượt ngay sau câu hỏi han", async () => {
    fakeAi();
    const r = await chat(["a không muốn sống nữa", "có"], { tab: "heart", talkConsent: "yes" });
    expect(r[0].content).not.toBe("AI_TRẢ_LỜI");
    expect(r[0].content).toMatch(/096|115|không phải một mình/);
    expect(r[1].content).not.toBe("AI_TRẢ_LỜI");
    expect(sent.filter((x) => x.body.mode === "talk").length).toBe(0);
  }, T);

  it("câu hỏi bệnh có thẻ sức khoẻ: máy giữ thẻ có nguồn", async () => {
    fakeAi();
    const r = await chat(["bệnh gout kiêng ăn gì"], { tab: "heart", talkConsent: "yes" });
    expect(r[0].content).not.toBe("AI_TRẢ_LỜI");
  }, T);

  it("AI lỗi / hết lượt: giữ câu đáp trên máy", async () => {
    sent = [];
    g.__lomiInvoke = () => ({ data: { fallback: true, error: "AI_LIMIT" }, error: null });
    const r = await chat(["A chưa bh trúng số :(("], { tab: "heart", talkConsent: "yes" });
    expect(r[0].content.length).toBeGreaterThan(5);
    expect(r[0].content).not.toMatch(/chúc mừng|ăn mừng/i);
  }, T);

  it("27/11 tối — auto: chưa chọn gì thì tự dùng AI, không hiện hộp hỏi đồng ý", async () => {
    fakeAi();
    const r = await chat(["A chưa bh trúng số :(("], { tab: "heart", talkConsent: null });
    expect(r[0].content).toBe("AI_TRẢ_LỜI");
    expect(screen.queryByText("Đồng ý")).toBeNull();
  }, T);

  it("27/11 tối — lần đầu AI trả lời: báo một lần (chỉ nút OK), lần sau không báo nữa", async () => {
    fakeAi();
    const p = chat(["A chưa bh trúng số :((", "mà thôi kệ"], { tab: "heart", talkConsent: null, aiNotice: true });
    expect(await screen.findByText("💬 Lomi có nhờ AI trả lời", {}, { timeout: 20000 })).toBeTruthy();
    const r = await p;
    expect(r[1].content).toBe("AI_TRẢ_LỜI");
    expect(localStorage.getItem("lomi_ai_notice_test-user")).toBe("1");
  }, T);
});

describe("talkEligible", () => {
  const base = { tab: "heart" as const, reply: { role: "assistant" as const, content: "Lomi nghe nè" }, question: "hôm nay a buồn", risk: null };
  it("tâm sự thường → AI", () => expect(talkEligible(base)).toBe(true));
  it("tab khác → không", () => expect(talkEligible({ ...base, tab: "health" })).toBe(false));
  it("câu đáp an toàn → không", () => expect(talkEligible({ ...base, reply: { role: "assistant", content: "Bạn không phải một mình… gọi 115" } })).toBe(false));
  it("lượt sau câu hỏi han an toàn → không", () =>
    expect(talkEligible({ ...base, prev: { role: "assistant", content: "Nếu nguy hiểm gọi 115 hoặc 096 306 1414 nha" } })).toBe(false));
  it("thẻ sức khoẻ / Tarot / tìm quán → không", () => {
    expect(talkEligible({ ...base, reply: { ...base.reply, med: { id: "gout" } } })).toBe(false);
    expect(talkEligible({ ...base, reply: { ...base.reply, tarot: {} } })).toBe(false);
    expect(talkEligible({ ...base, reply: { ...base.reply, places: [] } })).toBe(false);
  });
  it("câu ngoài phạm vi rõ ràng → không gọi AI", () => expect(talkEligible({ ...base, question: "viết code python giúp mình" })).toBe(false));
});
