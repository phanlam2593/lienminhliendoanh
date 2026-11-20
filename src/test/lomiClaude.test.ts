import { describe, it, expect, beforeEach } from "vitest";
import { claudeEligible, isHardOff, markClaudeOff, offTopic, resetClaudeOff } from "@/lib/lomiClaude";

const none = { crisis: null, denial: false, checkIn: false, urgent: false, harm: false, red: false, any: false };
const base = { stuck: "fallback" as const, question: "cách trồng cây sen đá trong nhà", reply: "Câu này Lomi chưa biết", risk: none };

describe("lomiClaude — chỉ câu Lomi bí, không nguy hiểm, thành viên mới nhờ Claude", () => {
  beforeEach(() => resetClaudeOff());
  it("câu bí bình thường của thành viên → nhờ Claude", () => expect(claudeEligible(base)).toBe(true));
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
  it("câu ngoài 4 mục chính (code, bài tập, dịch, bài văn) → không gửi", () => {
    for (const q of ["viết code python đọc file csv", "giúp mình sửa lỗi javascript", "giải bài tập toán lớp 9", "dịch đoạn này sang tiếng anh", "viết bài văn tả mẹ", "lập trình web học từ đâu"]) {
      expect(offTopic(q), q).toBe(true);
      expect(claudeEligible({ ...base, question: q })).toBe(false);
    }
  });
  it("câu trong phạm vi không bị chặn nhầm", () => {
    for (const q of ["dịch bệnh sốt xuất huyết mùa này", "bị đau lưng khi ngồi lâu", "người yêu cũ nhắn lại có nên trả lời", "mở quán cà phê nhỏ cần chuẩn bị gì", "cách dùng mã ưu đãi trong app"]) expect(offTopic(q), q).toBe(false);
  });
});
