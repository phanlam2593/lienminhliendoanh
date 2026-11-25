// 25/11 — sửa theo câu người dùng thật trong nhật ký Lomi bí (lomi_stuck_log / lomi_unanswered). Chạy qua khung chat thật.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";

const T = 60000;

describe("25/11 — câu thật Lomi từng bí", () => {
  it("'Uống nước chanh thì sao?' / 'Ăn chuối thì sao?' (không nêu bệnh) → bài lợi ích món đó, không 'chưa tiếp thu'", async () => {
    for (const [q, re] of [["Uống nước chanh thì sao?", /Chanh/], ["Ăn chuối thì sao?", /Chuối/], ["Uống nước dừa thì sao?", /dừa/i]] as const) {
      const m = await last([q]);
      expect(m.stuck, q).toBeFalsy();
      expect(m.content, q).toMatch(re);
    }
  }, T);

  it("'Gà mà' ngay sau 'Thấp khớp ăn gà đc k?' → trả lời lại về gà, không 'chưa tiếp thu'", async () => {
    const r = await chat(["Thấp khớp ăn gà đc k?", "Gà mà"]);
    expect(r[1].stuck).toBeFalsy();
    expect(r[1].content).toMatch(/gà/);
  }, T);

  it("'Có cách nào nhẹ nhàng hơn không?' sau bài cách xử trí mất ngủ → gợi ý bắt đầu từ 1–2 cách dễ, không đổ bài 'khi nào đi khám'", async () => {
    const m = await last(["mất ngủ kéo dài phải làm sao", "Có cách nào nhẹ nhàng hơn không?"]);
    expect(m.content).toMatch(/1–2 cách/);
    expect(m.content).not.toMatch(/^🧑‍⚕️/u);
  }, T);

  it("gout ăn hành tây / tỏi / bắp → nhóm rau (nên ăn, có nguồn); 'đậu bắp' không bị đọc thành bắp", async () => {
    for (const q of ["Bị gout ăn hành tây đc k?", "Bị gout ăn tỏi đc k?", "Bị gout ăn bắp đc k?"]) {
      const m = await last([q]);
      expect(m.stuck, q).toBeFalsy();
      expect(m.content, q).toMatch(/nên ăn/);
    }
    expect((await last(["gout ăn đậu bắp được không"])).content).not.toMatch(/rau và ngũ cốc nguyên hạt\*\* là món/);
  }, T);

  it("sốt xuất huyết có cần truyền nước / đi truyền dịch không → trả lời đúng ý (CDC), không đọc 'đi truyền' thành 'di truyền'", async () => {
    for (const q of ["sốt xuất huyết có cần truyền nước không", "bị sxh có nên đi truyền dịch không"]) {
      const m = await last([q]);
      expect(m.stuck, q).toBeFalsy();
      expect(m.content, q).toMatch(/không phải ai cũng cần/);
    }
    expect((await last(["sốt xuất huyết lây truyền thế nào"])).content).not.toMatch(/Truyền dịch/);
  }, T);
});

describe("25/11 — nấu ăn: món phổ biến, bữa sáng, câu nối", () => {
  it("'nấu bún bò', 'cách nấu phở bò', 'bánh xèo làm sao' → công thức đúng món", async () => {
    for (const [q, re] of [["nấu bún bò", /Bún bò Huế/], ["cách nấu phở bò", /Phở bò/], ["bánh xèo làm sao", /Bánh xèo/]] as const)
      expect((await last([q])).content, q).toMatch(re);
  }, T);

  it("'Gợi ý món ăn sáng' → món hợp bữa sáng (không phải rau xào)", async () => {
    const m = await last(["Gợi ý món ăn sáng"]);
    expect(m.content).not.toMatch(/Rau cải xào tỏi/);
    expect(m.content).toMatch(/Mì trộn trứng|Bánh mì kẹp trứng|Cháo trứng|Trứng hấp|Xôi|Cơm chiên trứng/);
  }, T);

  it("vừa gợi ý món mà hỏi 'Vậy bún bò thì sao?' → cách nấu bún bò", async () => {
    const r = await chat(["Gợi ý món ăn sáng", "Vậy bún bò thì sao?"]);
    expect(r[1].content).toMatch(/Bún bò Huế/);
  }, T);

  it("gõ mỗi tên món ('phở', 'bún bò', 'trà sữa') → hỏi tìm quán hay cách nấu", async () => {
    const p = await last(["phở"]);
    expect(p.quick).toEqual(expect.arrayContaining([expect.stringMatching(/Tìm quán phở/), expect.stringMatching(/Cách nấu phở/)]));
    expect((await last(["bún bò"])).quick?.some((x) => /Tìm quán bún bò/.test(x))).toBe(true);
    const ts = await last(["trà sữa"]);
    expect(ts.quick?.some((x) => /Cách nấu/.test(x))).toBe(false);
  }, T);

  it("gõ cụm ngắn 'quán phở ngon', 'quán cafe đẹp' → đi tìm, không hỏi 'kể Lomi nghe'", async () => {
    for (const q of ["quán phở ngon", "quán cafe đẹp"]) expect((await last([q])).content, q).not.toMatch(/kể Lomi nghe/);
    expect((await last(["hôm qua ăn quán bún bò ngon lắm"])).content).not.toMatch(/ghé mấy chỗ này/);
  }, T);
});

describe("25/11 (đợt 2) — bệnh / mẹo dân gian", () => {
  it("'bài thuốc dân gian chữa tiểu đường' → danh sách mẹo có nguồn của tiểu đường (không phải thẻ cảnh báo chung); nói chuyện bỏ thuốc / dứt điểm thì vẫn cảnh báo", async () => {
    expect((await last(["bài thuốc dân gian chữa tiểu đường"])).content).toMatch(/Mẹo dân gian cho tiểu đường/);
    expect((await last(["bài thuốc nam chữa tiểu đường dứt điểm"])).content).toMatch(/NGUY HIỂM/);
  }, T);
  it("tên gọi thông dụng: mồ hôi trộm, sán lá gan, tiểu đêm, viêm gân (gõ đúng dấu) → đúng thẻ", async () => {
    for (const [q, re] of [["mẹo chữa ra mồ hôi trộm", /mồ hôi trộm/], ["mẹo chữa sán lá gan", /sán lá gan/], ["mẹo chữa tiểu đêm", /tiểu đêm/], ["viêm gân là gì", /Viêm gân/]] as const) {
      const m = await last([q]);
      expect(m.stuck, q).toBeFalsy();
      expect(m.content, q).toMatch(re);
    }
    expect((await last(["viêm gan là gì"])).content).toMatch(/\*\*Viêm gan\*\*/);
  }, T);
  it("'viêm đại tràng' (gọi chung) → hỏi lại bệnh nào, kèm nút; 'viêm đại tràng co thắt' → hội chứng ruột kích thích", async () => {
    const m = await last(["bài thuốc dân gian chữa viêm đại tràng"]);
    expect(m.quick).toContain("bài thuốc dân gian chữa hội chứng ruột kích thích");
    expect((await last(["viêm đại tràng co thắt kiêng gì"])).content).toMatch(/Hội chứng ruột kích thích/);
    expect((await last(["viêm loét đại tràng nên ăn gì"])).content).toMatch(/Viêm loét đại tràng/);
  }, T);
});

describe("25/11 (đợt 3) — thẻ bệnh + mẹo dân gian mới có nguồn", () => {
  it("thẻ mới: đau nhức xương khớp (NHS), khí hư (NHS), gai gót chân (Long Châu + NHS), thâm quầng mắt (Mayo)", async () => {
    for (const [q, re] of [["mẹo chữa đau nhức xương khớp", /Đau nhức xương khớp/], ["ra nhiều huyết trắng có sao không", /Khí hư/], ["gai gót chân nên làm gì", /Gai gót chân/], ["thâm quầng mắt phải làm sao", /Thâm quầng mắt/]] as const) {
      const m = await last([q]);
      expect(m.stuck, q).toBeFalsy();
      expect(m.content, q).toMatch(re);
    }
    expect((await last(["mẹo chữa đau nhức xương khớp"])).content).toMatch(/Mẹo dân gian/);
    expect((await last(["đau khớp gối"])).content).toMatch(/Đau gối/);
  }, T);
  it("mẹo / vị mới: châm cứu (NCCIH), rượu tự nấu – methanol (UKHSA), dầu dừa (Mayo), atiso (Pharmacity), nhung hươu", async () => {
    for (const [q, re] of [["châm cứu có tác dụng gì", /Châm cứu/], ["uống rượu ngâm có tốt không", /methanol/], ["dầu dừa có tốt không", /bão hoà/], ["trà atiso có tác dụng gì", /Atiso/], ["nhung hươu có tác dụng gì", /Lộc Nhung/]] as const) {
      const m = await last([q]);
      expect(m.content, q).toMatch(re);
    }
  }, T);
});
