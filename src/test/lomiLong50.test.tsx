// 11/11 — Kir hỏi 50 câu LIÊN TỤC trong một cuộc trò chuyện (không reset): câu đời thường, sức khoẻ, thuốc & dược liệu, tâm sự, câu đa nghĩa.
// Giữ các lượt từng trả lời lạc không tụt lại. (Harness đọc được hội thoại > 15 lượt từ 11/11.)
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";
import Q from "./lomiLong50.json";

const UNKNOWN = /chưa được tiếp thu|chưa biết cái này|chưa được học/;
describe("50 câu liền một cuộc trò chuyện", () => {
  it("không lượt nào lạc kiểu cũ", async () => {
    const r = (await chat(Q as string[])).filter((t) => t.role === "assistant").map((t) => t.content);
    expect(r.length).toBe(50);
    const at = (n: number) => r[n - 1];
    expect(at(4)).not.toMatch(/Quay quay/); // "đầu óc quay cuồng vì công việc" — áp lực, không hỏi chóng mặt
    expect(at(6)).not.toMatch(UNKNOWN); // "có cách nào nhẹ nhàng hơn không?"
    expect(at(7)).not.toMatch(/Lomi (khoẻ re|vẫn ổn)/); // "làm vậy có ổn không ta?"
    expect(at(21)).toMatch(/tên thuốc/); // "thuốc này dùng để làm gì?" — không nối vào bài đau khớp
    expect(at(22)).toMatch(/tác dụng phụ/); // "uống thuốc xong thấy buồn ngủ thì sao?"
    expect(at(24)).not.toMatch(/Mẹo dân gian cho|đau dạ dày/i); // thuốc nam vs thuốc bắc
    expect(at(25)).toMatch(/Gừng/);
    expect(at(28)).not.toMatch(/kcal/); // nghệ vàng vs tinh bột nghệ — không ra bảng dinh dưỡng
    expect(at(32)).not.toMatch(UNKNOWN); // "không biết mình đang cố gắng vì điều gì nữa"
    expect(at(34)).not.toMatch(/máy móc/); // "người thân không hiểu mình" — không phải chê Lomi
    expect(at(40)).toMatch(/nghe/);
    expect(at(41)).toMatch(/Quẹt/);
    expect(at(47)).not.toMatch(/Lomi (khoẻ re|vẫn ổn)/); // "quán này có ổn không?"
    expect(at(49)).toMatch(/đánh liều/); // không lặp lời khuyên mở tiệm
    for (const n of [3, 5, 10, 11, 17, 23, 29, 30, 33, 35, 36, 37, 38, 39, 44, 45, 48, 50]) expect(at(n), `#${n}`).not.toMatch(UNKNOWN);
  }, 300000);
});
