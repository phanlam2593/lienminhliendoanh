// 15/10: Tarot bám sát câu hỏi — không chèn việc làm / tình cảm / đầu tư lạc chủ đề; xổ số kết luận thẳng là bài không đoán được.
import { it, expect } from "vitest";
import { chat } from "./lomiChatHarness";
const Q = [
  "Tuần này anh có trúng số không?",
  "Tháng tới anh có tìm được việc không?",
  "Anh có nên khai trương Lomi tháng này không?",
  "Người ấy còn yêu anh không?",
  "Tài chính của anh tháng tới thế nào?",
  "Khi nào anh trúng số?",
  "Mua vé số tuần này có trúng không?",
  "Người ấy có thích anh không?",
  "Có nên đầu tư vàng không?",
  "Tháng tới thế nào?",
];
const BAD: Record<number, RegExp> = {
  0: /Về công việc|nộp hồ sơ|phỏng vấn|đầu tư|Làm theo trái tim|tình cảm|nghiêng về CÓ|phụ thuộc nhiều vào bước/,
  1: /Làm theo trái tim|tình cảm|đầu tư|phụ thuộc nhiều vào bước/,
  2: /Về công việc|nộp hồ sơ|phỏng vấn|Làm theo trái tim|phụ thuộc nhiều vào bước/,
  3: /Về công việc|nộp hồ sơ|đầu tư|Sợ bị từ chối|chưa phải lúc|phụ thuộc nhiều vào bước/,
  4: /Về công việc|nộp hồ sơ|phỏng vấn|Làm theo trái tim|tình cảm|phụ thuộc nhiều vào bước|Tháng 12/,
  5: /Về công việc|nộp hồ sơ|nghiêng về CÓ|khoảng \d/,
  6: /Về công việc|nghiêng về CÓ/,
};
it("mỗi câu hỏi Tarot đọc đúng chủ đề của nó (xổ số / tìm việc / khai trương / tình cảm / tài chính)", async () => {
  for (const seed of [7, 11, 23, 42]) {
    for (let i = 0; i < Q.length; i++) {
      const q = Q[i];
      const r = await chat([`bói tarot xem ${q.charAt(0).toLowerCase() + q.slice(1)}`], { seed });
      const txt = r.map((m) => m.content).join("\n---\n");
      if (BAD[i]) {
        const m = txt.match(BAD[i]);
        expect(m, `${seed} ${q}`).toBeNull();
      }
      if (i === 0 || i === 5 || i === 6) expect(txt).toMatch(/KHÔNG thể xác định/);
    }
  }
}, 300000);
