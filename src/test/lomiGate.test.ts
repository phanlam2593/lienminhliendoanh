// Regression cho Understanding Gate (01/10) — xác định ý định trước khi module chuyên biệt bắt câu.
import { describe, expect, it } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { gate, isShortFollowUp } from "@/lib/lomiUnderstand";
import { healthFact } from "@/lib/lomiHealthFacts";
import { detectTarot } from "@/lib/tarot";

const g = (raw: string, ctx: Parameters<typeof gate>[1] = {}) => gate(expandTeen(raw), ctx);
/** Rút gọn thứ tự trong AiAssistant: gate → (nếu không skip) tarot → health. */
function route(raw: string, ctx: Parameters<typeof gate>[1] = {}): string {
  const q = expandTeen(raw);
  const c = gate(q, ctx, true);
  if (c?.action === "reply") return c.reply.intent;
  const qq = c?.action === "rewrite" ? c.q : q;
  const r = gate(qq, c?.action === "rewrite" ? {} : ctx);
  if (r?.action === "reply") return r.reply.intent;
  if (r?.action === "skip") return `skip:${r.intent}`;
  if (r?.action === "social") return r.reply.intent;
  if (detectTarot(qq)) return "tarot";
  if (healthFact(qq)) return "health";
  return "other";
}

describe("regression bắt buộc", () => {
  it("cf? không vào health", () => expect(route("cf?")).toBe("skip:drink_only"));
  it("uống cf nhiều có sao không? vẫn vào health", () => expect(route("uống cf nhiều có sao không?")).toBe("health"));
  it("tarot có bài ngược hả? vào tarot", () => expect(route("tarot có bài ngược hả?")).toMatch(/^tarot/));
  it("follow-up tarot giữ ngữ cảnh", () => {
    const r = g("vậy tính luôn hả?", { topic: "tarot", lastText: "Lomi tính cả lá ngược nha 🔮" });
    expect(r?.action === "reply" && r.reply.intent).toBe("followup_tarot");
    const r2 = g("vậy tính luôn hả?", { lastText: "Trong Tarot, lá rút ra bị lộn đầu gọi là lá ngược." });
    expect(r2?.action === "reply" && r2.reply.text).toMatch(/tính luôn/);
  });
  it("correction chuyển chủ đề mới, không khoá câu trước", () => {
    const last = { lastText: "Lá Ngôi Sao xuôi: hy vọng 🔮", topic: "tarot" as const };
    const c = gate(expandTeen("không, a hỏi uống cà phê nhiều có sao không"), last, true);
    expect(c).toEqual({ action: "rewrite", q: "uống cà phê nhiều có sao không" });
    expect(route("không, a hỏi uống cà phê nhiều có sao không", last)).toBe("health");
    expect(route("ý mình là uống cà phê nhiều có sao không", last)).toBe("health");
    expect(route("không phải, a hỏi cái kia", last)).toBe("correction");
    expect(route("không phải", last)).toBe("correction");
  });
});

describe("follow-up / mơ hồ / filler", () => {
  for (const t of ["vậy sao?", "thế còn?", "còn cái này?", "ý là?", "rồi?", "cái này?", "cái này sao?", "tính sao?"]) {
    it(`${t} là follow-up`, () => expect(isShortFollowUp(expandTeen(t))).toBe(true));
    it(`${t} không ngữ cảnh → hỏi lại (skip)`, () => expect(route(t)).toBe("skip:followup_nocontext"));
  }
  it("có ngữ cảnh FAQ → để phần câu hỏi nối xử lý", () => expect(route("vậy sao?", { topic: "faq", faqId: "claim" })).toBe("skip:followup_faq"));
  it("đang mạch tâm sự / sức khoẻ → không chặn", () => expect(g("vậy sao?", { topic: "health", inFlow: true })).toBeNull());
  for (const t of ["ủa", "ok", "ừ", "haha", "trời", "haiz"]) it(`${t} không vào module kiến thức`, () => expect(route(t)).toMatch(/^(ack|reaction)$/));
  it("câu thường không bị gate đụng", () => {
    expect(g("quán phở nào ngon")).toBeNull();
    expect(g("bói tình yêu cho mình")).toBeNull();
    expect(g("không gửi tin nhắn được", { lastText: "Chào bạn" })).toBeNull();
  });
});

import { matchFaq } from "@/lib/lomiFaq";
import { tarotRuleInfo } from "@/lib/lomiUnderstand";
describe("giao tiếp cơ bản (02/10)", () => {
  const cases: [string, string][] = [
    ["chào e", "greeting"], ["hello Lomi", "greeting"], ["xin chào", "greeting"], ["hi", "greeting"], ["buổi sáng nha", "greeting"],
    ["ê Lomi", "call"], ["Lomi ơi", "call"], ["em ơi", "call"], ["a gọi Lomi", "call"], ["alo Lomi", "greeting"],
    ["cảm ơn e", "thanks"], ["cám ơn nha", "thanks"], ["thanks", "thanks"], ["thank you", "thanks"],
    ["bye nha", "goodbye"], ["tạm biệt", "goodbye"], ["thôi nha", "goodbye"], ["a đi đây", "goodbye"], ["ngủ ngon", "goodbye"],
    ["ủa?", "reaction"], ["wow", "reaction"], ["kk", "reaction"],
    ["ok", "ack"], ["oke", "ack"], ["được", "ack"], ["hay", "ack"],
    ["a hỏi cái này", "opener"], ["a muốn hỏi cái này", "opener"], ["cho a hỏi", "opener"],
    ["hôm nay sao rồi", "smalltalk"], ["Lomi khỏe không", "smalltalk"], ["đang làm gì", "smalltalk"], ["rảnh không", "smalltalk"], ["có đó không", "smalltalk"],
    ["có", "yes"],
  ];
  for (const [t, want] of cases) it(`${t} → ${want}`, () => expect(route(t)).toBe(want));
  it("có/không khi Lomi vừa hỏi → để luồng hiện có hiểu theo câu hỏi", () => {
    expect(g("có", { lastText: "Bạn muốn rút thêm một lá không?" })).toBeNull();
    expect(g("không", { lastText: "Bạn muốn rút thêm một lá không?" })).toBeNull();
  });
  it("đang ở flow chờ trả lời → không bị greeting/filler bắt", () => {
    for (const t of ["ok", "có", "không", "chào e", "thôi nha"]) expect(g(t, { inFlow: true, lastText: "Bạn đau lâu chưa?" })).toBeNull();
    expect(gate(expandTeen("không"), { inFlow: true, lastText: "Kể Lomi nghe thêm nha." }, true)).toBeNull();
  });
  it("correction sau membership → chuyển sang phí giao hàng", () => {
    const c = gate(expandTeen("không, ý a là phí giao hàng"), { lastText: "Thành viên được nhận ưu đãi…", topic: "faq", faqId: "membership" }, true);
    expect(c).toEqual({ action: "rewrite", q: "phí giao hàng" });
    expect(matchFaq("phí giao hàng")?.id).toBe("ridprice");
  });
  it("còn cái này? có ngữ cảnh dùng context, không có thì hỏi lại", () => {
    expect(route("còn cái này?", { topic: "faq", faqId: "claim", lastText: "Bấm Nhận ưu đãi nha." })).toBe("skip:followup_faq");
    expect(route("còn cái này?")).toBe("skip:followup_nocontext");
  });
  it("luật Tarot trả lời cả khi đang chờ câu hỏi bói (tarotAwait)", () => expect(tarotRuleInfo("tarot có bài ngược hả?")?.intent).toBe("tarot_info"));
  it("cà phê vẫn đúng", () => {
    expect(route("cà phê?")).toBe("skip:drink_only");
    expect(route("uống cà phê nhiều có sao không?")).toBe("health");
  });
});
