// 07/11 — TÂM SỰ NHIỀU LƯỢT: Lomi giữ mạch câu chuyện, không đổi chủ đề chỉ vì câu có nhắc một danh từ ("gia đình"),
// và "không biết phải làm sao" giữa chuyện đang kể thì đáp bám chuyện đó + hỏi tiếp, chưa đưa danh sách lời khuyên.
// Chạy qua chính khung chat (lomiChatHarness), vài seed để phần chọn câu ngẫu nhiên không làm test ăn may.
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";

const T = 60000;
const SEEDS = [1, 7, 42];
const PARENTS = /bố mẹ|ba mẹ|người lớn|cô, dì|con thấy buồn khi|bố mẹ thương|bất hiếu|người nhà/i;
const LIST = /gợi ý vài điều|vài bước nhỏ|\n•/;

describe("Tâm sự nhiều lượt — giữ mạch, không suy diễn theo từ khoá", () => {
  it("lo → công ty sắp phá sản → trụ cột gia đình → không biết làm sao: không thành chuyện mâu thuẫn với bố mẹ", async () => {
    for (const seed of SEEDS) {
      const r = await chat(["a đang lo quá", "công ty a sắp phá sản", "a là trụ cột gia đình", "giờ a k biết phải làm sao"], { seed });
      expect(r[2].heart).not.toBe("family");
      expect(r[3].heart).not.toBe("family");
      for (const t of r.slice(2)) expect(t.content).not.toMatch(PARENTS);
      // lượt cuối: bám đúng hai điều đã kể, hỏi tiếp — không đưa danh sách lời khuyên
      expect(r[3].content).toMatch(/phá sản/);
      expect(r[3].content).toMatch(/trụ cột gia đình/);
      expect(r[3].content).not.toMatch(LIST);
      expect(r[3].content.trim()).toMatch(/\?$/);
    }
  }, T);

  it("buồn → ba mẹ cứ la mắng → không ai chịu nghe → nên làm sao: nhận ra đúng là chuyện gia đình", async () => {
    for (const seed of SEEDS) {
      const r = await chat(["Dạo này a buồn quá", "ba mẹ cứ la mắng a", "a nói gì cũng không ai chịu nghe", "a nên làm sao?"], { seed });
      expect(r[1].heart).toBe("family");
      expect(r[3].heart).toBe("family");
      // "không ai CHỊU nghe" là đang kể (không phải "chịu, bó tay") → chưa dội lời khuyên khi chưa ai hỏi
      expect(r[2].content).not.toMatch(LIST);
      // hỏi thẳng "nên làm sao?" → có lời khuyên, hợp chuyện trong nhà, không phải chuyện công việc / tiền bạc
      expect(r[3].content).toMatch(LIST);
      expect(r[3].content).toMatch(PARENTS);
      expect(r[3].content).not.toMatch(/công việc|sếp|tiền bạc|nợ/i);
    }
  }, T);

  it("lo công việc → cắt giảm nhân sự → gia đình vẫn ủng hộ → vẫn áp lực: gia đình là chỗ dựa, mạch vẫn là công việc", async () => {
    for (const seed of SEEDS) {
      const r = await chat(["a đang lo chuyện công việc", "công ty có thể cắt giảm nhân sự", "may mà gia đình vẫn ủng hộ a", "nhưng a vẫn thấy áp lực"], { seed });
      // câu kể thứ hai được nghe như phần tiếp của nỗi lo (không phải "chưa hiểu ý")
      expect(r[1].unk).toBeUndefined();
      expect(r[1].content).toMatch(/cắt giảm nhân sự/);
      for (const t of r.slice(1)) {
        expect(t.heart).not.toBe("family");
        expect(t.content).not.toMatch(PARENTS);
      }
      // điều may → nhẹ lòng, không phải "hèn gì bạn lo"
      expect(r[2].content).not.toMatch(/hèn gì|thấp thỏm|lo như vậy/i);
      // một cảm giác nói thêm giữa chuyện → không biến thành bảng phân tích "thường gặp khi… / nên tránh…"
      expect(r[3].content).not.toMatch(/thường gặp khi|Nên tránh/);
      expect(r[3].content).toMatch(/áp lực/);
    }
  }, T);

  it("buồn → vợ chồng ít nói chuyện → sợ tình cảm nhạt → có nên nói thẳng: vẫn là chuyện vợ chồng, không phải bố mẹ", async () => {
    for (const seed of SEEDS) {
      const r = await chat(["a đang buồn", "vợ chồng a dạo này ít nói chuyện", "a sợ tình cảm nhạt dần", "a không biết có nên nói chuyện thẳng thắn không"], { seed });
      expect(r[1].heart).not.toBe("family");
      expect(r[2].heart).toBe("spark");
      expect(r[3].heart).toBe("spark");
      for (const t of r.slice(1)) expect(t.content).not.toMatch(/bố mẹ|ba mẹ|người lớn|bất hiếu/i);
      // không áp đặt là hai người đang xung đột nặng
      for (const t of r.slice(1)) expect(t.content).not.toMatch(/ngoại tình|phản bội|bạo lực|ly hôn|chia tay/i);
    }
  }, T);

  it("áp lực công việc → mệt → 'thôi đổi chuyện, tìm quán cà phê': thoát tâm sự, tìm quán bình thường", async () => {
    const r = await chat(["a đang áp lực công việc", "a mệt mỏi quá", "thôi đổi chuyện, tìm quán cà phê gần đây cho a"], { seed: 1 });
    expect(r[0].heart).toBe("work");
    expect(r[2].heart).toBeUndefined();
    expect(r[2].places?.length ?? 0).toBeGreaterThan(0);
  }, T);

  it("đối chứng: chỉ GỌI TÊN đề tài ('chuyện gia đình') vẫn mở đúng chuyện gia đình như trước", async () => {
    const r = await chat(["a đang buồn", "chuyện gia đình"], { seed: 1 });
    expect(r[1].heart).toBe("family");
  }, T);

  it("đối chứng: 'không biết làm sao' khi CHƯA kể chuyện gì → hỏi chuyện, không tóm tắt chuyện không có", async () => {
    const r = await chat(["a không biết phải làm sao"], { seed: 1 });
    expect(r[0].content).not.toMatch(/áp lực đâu chỉ nằm ở một chỗ|gỡ từng phần/);
  }, T);
});
