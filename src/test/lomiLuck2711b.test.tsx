// 27/11 (vòng 3, Kir: "soạn tiếp test phần này… test cho kĩ") — mỉa mai, giọng miền, người thân, buôn bán, thi đấu, chuyện đã qua,
// câu dài nhiều ý, emoji, gõ tắt / sai chính tả, câu cụt, câu hỏi, lo trước kết quả. Mỗi câu chạy qua đúng khung chat.
//   N = không được chúc mừng · G = phải mừng cùng · O = câu hỏi / lo / chuyện cũ — không chúc mừng. Không câu nào được đáp "chưa hiểu".
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";

const CHEER = /chúc mừng|ăn mừng|vui lây|xứng đáng|tuyệt vời|tự hào|hên ghê|trúng thật hả|tin vui|buôn may bán đắt/i;
const LOST = /chưa hiểu|chưa biết cái này|chưa được học|chưa có kiến thức|chưa được tiếp thu|nằm ngoài|chưa rõ anh đang nói|chưa chắc hiểu|khu vực nào/i;
const CASES: [string, string][] = [
  ["N", "trúng số hả, trúng cái nịt"],
  ["N", "trúng số gì tầm này"],
  ["N", "đời a mà trúng số thì heo biết bay"],
  ["N", "số a nhọ lắm, mua bao nhiêu cũng trật"],
  ["N", "a mà trúng số chắc trời sập"],
  ["N", "trúng thì có mà trúng gió"],
  ["N", "vé số với a là duyên âm"],
  ["N", "chắc kiếp sau a mới trúng số"],
  ["N", "hên xui mà toàn xui"],
  ["N", "a đen như chó mực"],
  ["N", "a xui tận mạng"],
  ["N", "năm nay a xui quá trời"],
  ["N", "hổng có trúng gì hết trơn"],
  ["N", "tui hổng đậu rồi"],
  ["N", "rớt rồi mi ơi"],
  ["N", "răng tui hoài không trúng"],
  ["N", "tui chưa trúng lần mô hết"],
  ["N", "dò số mỏi mắt mà hông trúng"],
  ["N", "bữa giờ hông có bán được đơn nào"],
  ["N", "con a thi rớt rồi"],
  ["N", "con a không đậu đại học"],
  ["N", "vợ a bị trượt phỏng vấn"],
  ["N", "em a chưa xin được việc"],
  ["N", "ba a mua vé số cả đời chưa trúng"],
  ["G", "con a đậu đại học rồi"],
  ["G", "vợ a được thăng chức"],
  ["G", "ba a trúng số"],
  ["G", "em gái a vừa đậu thủ khoa"],
  ["N", "hôm nay quán a không bán được gì"],
  ["N", "shop a chưa có đơn nào"],
  ["N", "bán cả ngày chưa được đồng nào"],
  ["N", "tháng này a lỗ nặng"],
  ["G", "hôm nay a chốt được 20 đơn"],
  ["G", "quán a đông khách quá trời"],
  ["N", "đội a thua rồi"],
  ["N", "a thi đấu bị loại vòng 1"],
  ["N", "a không được giải gì"],
  ["G", "a đạt giải nhất rồi"],
  ["G", "đội a vô địch rồi"],
  ["O", "hồi xưa a từng trúng số 1 lần"],
  ["N", "a từng trúng mà giờ mất hết rồi"],
  ["N", "năm ngoái a đậu mà năm nay rớt"],
  ["N", "a cố gắng cả năm trời mà cuối cùng vẫn không được tăng lương, buồn ghê"],
  ["N", "mua vé số mỗi ngày suốt 10 năm nay mà chưa trúng lần nào hết em ạ"],
  ["N", "ai cũng bảo a giỏi mà phỏng vấn chỗ nào cũng trượt"],
  ["G", "sau 3 lần thi rớt thì lần này a đậu rồi em ơi"],
  ["G", "tưởng rớt ai ngờ đậu"],
  ["G", "không ngờ luôn, a trúng giải nhì"],
  ["N", "trúng số 😭😭"],
  ["N", "rớt rồi 💔"],
  ["N", "lại trượt 🙃"],
  ["G", "đậu rồi 🎉🎉"],
  ["G", "trúng rồi nè 🥳"],
  ["N", "a k trug so"],
  ["N", "a chua trug so bh"],
  ["N", "a hk dau dh"],
  ["N", "a rot pv r"],
  ["N", "a k dc tăng lươg"],
  ["G", "a dau dh roi"],
  ["G", "a trug so r e"],
  ["N", "trật"],
  ["N", "rớt"],
  ["N", "lại xịt"],
  ["G", "đậu rồi"],
  ["G", "trúng rồi"],
  ["O", "trúng số thì nên làm gì đầu tiên"],
  ["O", "rớt đại học thì làm gì tiếp"],
  ["O", "có nên mua vé số không"],
  ["O", "mua vé số có phải là cờ bạc không"],
  ["O", "lỡ a rớt thì sao"],
  ["O", "a sợ năm nay không đậu"],
  ["O", "nếu a không được tăng lương thì a nghỉ"],
  ["O", "a lo không được nhận"],
];
describe("chuyện may / không may — vòng 3", () => {
  for (const [k, q] of CASES)
    it(`[${k}] ${q}`, async () => {
      const r = (await chat([q]))[0].content;
      expect(r).not.toMatch(LOST);
      if (k === "G") expect(r).toMatch(CHEER);
      else expect(r).not.toMatch(/chúc mừng|ăn mừng|xứng đáng|tuyệt vời|hên ghê|trúng thật hả/i);
    }, 60000);
});

describe("nói đúng người — chuyện của người thân", () => {
  it("ba a trúng số → chúc mừng ba, không hỏi 'anh định dùng tiền'", async () => {
    const r = (await chat(["ba a trúng số"]))[0].content;
    expect(r).toMatch(/ba của anh/);
    expect(r).not.toMatch(/anh định dùng/i);
  });
  it("vợ a bị trượt phỏng vấn → hỏi về vợ", async () => expect((await chat(["vợ a bị trượt phỏng vấn"]))[0].content).toMatch(/vợ anh/));
  it("con a thi rớt rồi → không 😅", async () => expect((await chat(["con a thi rớt rồi"]))[0].content).not.toMatch(/😅/));
});

describe("hỏi về vé số — trả lời thật", () => {
  it("thuế trúng số theo luật mới (từ 1/7/2026: 10% phần vượt 20 triệu / vé)", async () => {
    const r = (await chat(["trúng số có phải đóng thuế không"]))[0].content;
    expect(r).toMatch(/20 triệu/);
    expect(r).toMatch(/10%/);
  });
  it("vé số có phải cờ bạc không — không bị coi là đang nghiện", async () => expect((await chat(["mua vé số có phải là cờ bạc không"]))[0].content).toMatch(/hợp pháp/));
  it("rớt đại học thì làm gì tiếp — có hướng đi", async () => expect((await chat(["rớt đại học thì làm gì tiếp"]))[0].content).toMatch(/cao đẳng|nguyện vọng/i));
});
