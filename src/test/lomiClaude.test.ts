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
  it("24/11: thêm nhóm ngoài phạm vi rõ ràng → chặn trên máy", () => {
    for (const q of ["cách nuôi cá koi cho đẹp", "mèo nhà mình bỏ ăn, đưa đi thú y không", "cách sửa xe máy bị chết máy", "nên mua cổ phiếu nào bây giờ", "tỉ số trận MU tối qua", "dự báo thời tiết ngày mai ở Đà Lạt", "làm hộ chiếu cần giấy tờ gì", "cài win 11 cho laptop", "cách chơi liên quân cho giỏi", "thủ đô của Úc là gì", "giá bitcoin hôm nay"])
      expect(offTopic(q), q).toBe(true);
  });
  it("24/11: câu trong phạm vi gần giống vẫn KHÔNG bị chặn", () => {
    for (const q of ["mở tiệm sửa xe nhỏ cần vốn bao nhiêu", "thời tiết lạnh bị đau khớp phải làm sao", "chơi game nhiều bị mỏi mắt", "nuôi con nhỏ mệt quá", "chó cắn có cần tiêm phòng dại không", "quán cà phê có chỗ chơi cho mèo ở Đà Lạt", "bị stress vì mất tiền chứng khoán", "người yêu mê game bỏ bê mình"])
      expect(offTopic(q), q).toBe(false);
  });
  it("25/11: câu giải thích thuyết khoa học → chặn trên máy (không tốn lượt gọi AI)", () => {
    for (const q of ["giải thích thuyết tiến hóa", "thuyết tương đối hẹp của Einstein là gì", "hố đen là gì", "vũ trụ hình thành thế nào"]) expect(offTopic(q), q).toBe(true);
    for (const q of ["tiểu đường có di truyền không", "giải thích giúp mình chỉ số mỡ máu"]) expect(offTopic(q), q).toBe(false);
  });
  it("câu trong phạm vi không bị chặn nhầm", () => {
    for (const q of ["dịch bệnh sốt xuất huyết mùa này", "bị đau lưng khi ngồi lâu", "người yêu cũ nhắn lại có nên trả lời", "mở quán cà phê nhỏ cần chuẩn bị gì", "cách dùng mã ưu đãi trong app"]) expect(offTopic(q), q).toBe(false);
  });
});
