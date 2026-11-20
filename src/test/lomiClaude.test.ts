import { describe, it, expect, beforeEach } from "vitest";
import { claudeEligible, claudeNote, isHardOff, markClaudeOff, resetClaudeOff } from "@/lib/lomiClaude";

const none = { crisis: null, denial: false, checkIn: false, urgent: false, harm: false, red: false, any: false };
const base = { stuck: "fallback" as const, question: "cách trồng cây sen đá trong nhà", reply: "Câu này Lomi chưa biết", risk: none, member: true };

describe("lomiClaude — chỉ câu Lomi bí, không nguy hiểm, thành viên mới nhờ Claude", () => {
  beforeEach(() => resetClaudeOff());
  it("câu bí bình thường của thành viên → nhờ Claude", () => expect(claudeEligible(base)).toBe(true));
  it("không phải thành viên → không", () => expect(claudeEligible({ ...base, member: false })).toBe(false));
  it("không bí → không", () => expect(claudeEligible({ ...base, stuck: undefined })).toBe(false));
  it("đang gợi ý câu hỏi app / đang nghe kể → giữ trên máy", () => {
    expect(claudeEligible({ ...base, stuck: "suggest" })).toBe(false);
    expect(claudeEligible({ ...base, stuck: "generic_listen" })).toBe(false);
  });
  it("có dấu hiệu nguy hiểm → không bao giờ", () => {
    expect(claudeEligible({ ...base, risk: { ...none, crisis: { text: "x" }, any: true } })).toBe(false);
    expect(claudeEligible({ ...base, risk: { ...none, urgent: true, any: true } })).toBe(false);
  });
  it("câu đáp an toàn soạn sẵn không bị thay", () => {
    expect(claudeEligible({ ...base, reply: "🚨 Gọi 115 ngay" })).toBe(false);
    expect(claudeEligible({ ...base, reply: "Bạn không phải một mình đâu" })).toBe(false);
  });
  it("mẩu câu cụt → không", () => {
    expect(claudeEligible({ ...base, question: "hihi" })).toBe(false);
    expect(claudeEligible({ ...base, stuck: "not_understood", question: "ừ thì sao" })).toBe(false);
  });
  it("Tarot → không", () => expect(claudeEligible({ ...base, tarot: true })).toBe(false));
  it("chưa cài key / hết tiền → tắt tới khi mở lại app", () => {
    expect(isHardOff("AI_CREDITS")).toBe(true);
    expect(isHardOff("AI_LIMIT")).toBe(false);
    markClaudeOff();
    expect(claudeEligible(base)).toBe(false);
  });
  it("ghi chú nói rõ Claude trả lời; câu sức khoẻ nhắc không thay bác sĩ", () => {
    expect(claudeNote("fallback", false)).toMatch(/nhờ Claude/);
    expect(claudeNote("unknown_med", false)).toMatch(/không thay cho bác sĩ/);
  });
});
