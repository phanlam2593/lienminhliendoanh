// Nhật ký "Lomi bí": mọi lượt Lomi bí đều được ghi kèm câu hỏi, câu đáp, hội thoại trước đó và loại bí.
import { afterEach, describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";
import { setStuckSink, type StuckEntry } from "@/lib/lomiStuckLog";

afterEach(() => setStuckSink(null));

describe("nhật ký Lomi bí", () => {
  it("câu bí được ghi kèm hội thoại phía trước và loại bí", async () => {
    const got: StuckEntry[] = [];
    setStuckSink((e) => got.push(e));
    await chat(["xin chào", "cách sửa xe máy bị nổ lốp"]);
    expect(got.length).toBeGreaterThan(0);
    const e = got[got.length - 1];
    expect(e.question).toBe("cách sửa xe máy bị nổ lốp");
    expect(e.reply.length).toBeGreaterThan(10);
    expect(e.context.some((c) => c.r === "u" && /xin chào/i.test(c.t))).toBe(true);
    expect(["not_understood", "fallback", "suggest", "unknown_med"]).toContain(e.kind);
  });
  it("câu Lomi trả lời được thì KHÔNG ghi", async () => {
    const got: StuckEntry[] = [];
    setStuckSink((e) => got.push(e));
    await chat(["xin chào"]);
    expect(got.length).toBe(0);
  });
});
