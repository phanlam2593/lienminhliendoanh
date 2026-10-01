// Test theo tài liệu Kir 01/10 r3: chào linh hoạt, viết tắt nhiều nghĩa, tiếng Việt chen tiếng Anh, câu ngắn.
// Chạy: npx vitest run src/test/lomiMixed.test.ts
import { describe, expect, it } from "vitest";
import { chitChat, expandTeen, scopedFallback, UNKNOWN_FULL } from "@/lib/lomiChat";
import { understand } from "@/lib/lomiUnderstand";
import { matchFaq } from "@/lib/lomiFaq";

/** Rút gọn luồng hiểu câu của Lomi: chuyện phiếm → ý định → hỏi đáp app. */
function route(raw: string, lastText?: string): string {
  const q = expandTeen(raw);
  if (chitChat(q, "vi", undefined, raw)) return "chit";
  const u = understand(q, raw, { lastText }, matchFaq(q)?.id);
  if (u) return u.intent;
  const f = matchFaq(q);
  return f ? `faq:${f.id}` : "unknown";
}

describe("2–3. chào: từ gọi / từ đệm không làm mất ý chào", () => {
  const greets = "chào|chào em|chào em nhé|chào em nha|chào anh|chào chị|chào bạn|chào nha|chào nhé|chào buổi sáng|chào buổi tối|xin chào|hello|hi|hê lô|hé lô|alo|hey|hey there|good morning|good evening|hi em|hello em|hi bro|hey bro|chào bro|hello nha|chào cưng|hi cưng|ê chào|alo em|hello mọi người|hello mn|chào cả nhà|alo?|hello?".split("|");
  for (const g of greets) it(g, () => expect(route(g)).toBe("chit"));
  it("chào + câu hỏi phía sau thì trả lời luôn phần sau", () => {
    const r = chitChat(expandTeen("hi em, nay làm gì?"), "vi", undefined, "hi em, nay làm gì?");
    expect(r?.text).not.toMatch(/chưa được|chưa biết/);
  });
});

describe("4. viết tắt nhiều nghĩa — theo ngữ cảnh, không đổi bừa", () => {
  it("cf + uống/đi → cà phê", () => {
    expect(expandTeen("đi cf không")).toContain("cà phê");
    expect(expandTeen("uống cf ở đâu ngon")).toContain("cà phê");
    expect(expandTeen("cf?")).toBe("cà phê?");
  });
  it("cf không rõ ngữ cảnh → giữ nguyên", () => expect(expandTeen("sao cf vậy")).toContain("cf"));
  it("tt: thông tin / thanh toán tuỳ câu", () => {
    expect(expandTeen("cập nhật tt cá nhân")).toContain("thông tin");
    expect(expandTeen("tt tiền sao")).toContain("thanh toán");
    expect(expandTeen("tt")).toBe("tt");
  });
  it("pass: mật khẩu / bỏ qua tuỳ câu", () => {
    expect(expandTeen("đổi pass sao")).toContain("mật khẩu");
    expect(expandTeen("pass nhầm rồi")).toContain("bỏ qua");
  });
  it("viết tắt thường gặp", () => {
    expect(expandTeen("mn ơi")).toBe("mọi người ơi");
    expect(expandTeen("đc k")).toBe("được không");
    expect(expandTeen("bn làm j r")).toBe("bạn làm gì rồi");
    expect(expandTeen("mk cx vậy")).toBe("mình cũng vậy");
  });
});

describe("5–8. câu Việt chen tiếng Anh — hiểu theo ý", () => {
  const cases: [string, string | RegExp][] = [
    ["tối nay chơi game không?", "invite"],
    ["tối nay chơi game hong?", "invite"],
    ["đi cf không", "invite"],
    ["app bị lag", "issue"],
    ["app này lag quá", "issue"],
    ["cho mình xin info", "ask_info"],
    ["cho mình xin info với", "ask_info"],
    ["cho mình link với", "ask_link"],
    ["ib mình nha", "ib"],
    ["để mình check", "user_check"],
    ["check giúp mình cái này", "opener"],
    ["mình muốn update profile", "faq:avatar"],
    ["mình muốn call", "faq:call"],
    ["review giúp mình", "faq:review"],
    ["voucher này dùng sao?", "faq:claim"],
    ["offer này còn không?", "faq:offerlist"],
    ["update app chưa?", "faq:update"],
    ["logout sao", "faq:logout"],
    ["đổi pass sao", "faq:password"],
    ["làm member sao", "faq:membership"],
    ["app có free không", "faq:free"],
    ["support ở đâu", "faq:support"],
    ["cập nhật tt cá nhân", "faq:avatar"],
    ["sao mình bị offline", "issue"],
  ];
  for (const [t, want] of cases) it(t, () => expect(route(t)).toMatch(want));
});

describe("9. câu ngắn vẫn hiểu — thiếu ngữ cảnh thì hỏi lại ngắn", () => {
  const cases: [string, string][] = [
    ["game?", "short_game"],
    ["app?", "short_app"],
    ["link?", "ask_link"],
    ["info?", "ask_info"],
    ["cf?", "short_coffee"],
    ["ủa?", "vague"],
    ["còn không?", "vague"],
    ["sao vậy?", "vague"],
    ["ở đâu?", "vague"],
  ];
  for (const [t, want] of cases) it(t, () => expect(route(t)).toBe(want));
  it("cf? có ngữ cảnh đang nói chuyện quán → gợi ý tìm quán luôn", () => {
    const u = understand(expandTeen("cf?"), "cf?", { lastText: "Đà Lạt có nhiều quán xinh lắm nè" });
    expect(u?.quick).toContain("Tìm quán cà phê gần đây");
  });
  it("không câu nào ở trên rơi vào 'chưa được học'", () => {
    expect(scopedFallback("game?").text).toBeTruthy(); // vẫn có câu dự phòng, nhưng route() không đi tới đó
    expect(UNKNOWN_FULL).toMatch(/Lomi/);
  });
});
