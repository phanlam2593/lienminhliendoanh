// Kho kiến thức y khoa có nguồn — chạy qua CẢ khung chat (router thật), đúng các câu anh Kir hỏi thử + các ca biên.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";

const T = 60000;
const SRC = /📚 Nguồn:/;

describe("kho kiến thức y khoa qua khung chat", () => {
  it("“ám thị tự kỉ là gì” → giải thích tự ám thị, nói rõ KHÔNG phải chứng tự kỷ, có nguồn", async () => {
    const m = await last(["ám thị tự kỉ là gì"]);
    expect(m.content).toMatch(/KHÔNG phải chứng tự kỷ/);
    expect(m.content).toMatch(SRC);
    expect(m.unk).toBeUndefined();
  }, T);
  it("“bệnh gout ăn nhộng đc k” → nói thẳng chưa xác minh được món này, kèm nguyên tắc chung có nguồn; ghi nhật ký bí", async () => {
    const m = await last(["bệnh gout ăn nhộng đc k"]);
    expect(m.content).toMatch(/\*\*nhộng\*\*.*chưa xác minh được/s);
    expect(m.content).toMatch(/purin/);
    expect(m.content).toMatch(SRC);
    expect(m.stuck).toBe("kb_partial");
    expect(m.diet).toBe("gout");
  }, T);
  it("câu nối không nhắc lại tên bệnh vẫn theo bệnh đang nói", async () => {
    const r = await chat(["bệnh gout ăn nhộng đc k", "còn bia thì sao", "triệu chứng", "khi nào cần đi khám"]);
    expect(r[1].content).toMatch(/\*\*bia\*\* nên \*\*hạn chế\*\*/);
    expect(r[2].content).toMatch(/Dấu hiệu thường gặp của \*\*Gout\*\*/);
    expect(r[3].content).toMatch(/Nên đi khám với \*\*Gout\*\*/);
    for (const m of r) expect(m.med?.id).toBe("gout");
  }, T);
  it("gõ không dấu / chữ cái tên loại (“viem gan b”) vẫn vào đúng thẻ — “b” không bị đọc thành “bạn”", async () => {
    for (const t of ["viem gan b co lay khong", "viêm gan B có lây không"]) {
      const m = await last([t]);
      expect(m.med?.id, t).toBe("viem-gan-b");
      expect(m.med?.aspect, t).toBe("spread");
      expect(m.content, t).toMatch(/Về chuyện lây của \*\*Viêm gan B\*\*/);
    }
  }, T);
  it("“có chữa khỏi không” là hỏi diễn tiến, không phải cách chữa", async () => {
    const m = await last(["rối loạn lưỡng cực có chữa khỏi không"]);
    expect(m.med?.aspect).toBe("course");
    expect(m.content).toMatch(/không chữa khỏi hẳn nhưng có thể kiểm soát/);
  }, T);
  it("hỏi cách chữa → có câu nói rõ Lomi không kê thuốc / liều", async () => {
    const m = await last(["cách chữa bệnh gout"]);
    expect(m.content).toMatch(/không kê thuốc hay nêu liều/);
  }, T);
  it("nói CHÍNH MÌNH bị trầm cảm → mạch tâm sự lắng nghe, không đổ bài kiến thức; hỏi “trầm cảm là gì” mới trả lời kiến thức", async () => {
    const a = await last(["a bị trầm cảm"]);
    expect(a.heart).toBe("depress");
    expect(a.med).toBeUndefined();
    const b = await last(["trầm cảm là gì"]);
    expect(b.med?.id).toBe("tram-cam");
    expect(b.content).toMatch(SRC);
  }, T);
  it("nói mình mắc bệnh thể chất (“a bị gout”) → ghi nhận trước rồi mới đưa kiến thức", async () => {
    const m = await last(["a bị gout"]);
    expect(m.content).toMatch(/đang bị \*\*gout\*\* hả/);
    expect(m.content).toMatch(SRC);
  }, T);
  it("“thiếu vitamin D nên ăn gì” là hỏi ăn uống theo tình trạng, không phải gợi ý quán", async () => {
    const m = await last(["thiếu vitamin d nên ăn gì"]);
    expect(m.dishPick).toBeUndefined();
    expect(m.med?.id).toBe("thieu-vitamin-d");
  }, T);
  it("bệnh không có phần ăn uống → nói thẳng, chỉ đưa ý chăm sóc có nhắc ăn uống", async () => {
    const m = await last(["sốt xuất huyết kiêng gì"]);
    expect(m.content).toMatch(/không có danh sách kiêng cữ riêng/);
    expect(m.content).toMatch(/uống nhiều nước/);
    expect(m.content).not.toMatch(/muỗi/);
    expect(m.stuck).toBe("kb_partial");
  }, T);
  it("sơ cứu: hỏi cách xử trí → có luôn các dấu hiệu phải đi cấp cứu", async () => {
    const m = await last(["bị bỏng phải làm sao"]);
    expect(m.content).toMatch(/nước mát/);
    expect(m.content).toMatch(/Gọi \*\*115\*\*/);
  }, T);
  it("chỉ kể một triệu chứng (“a bị đau đầu”, “đau dạ dày”) → vẫn đi mạch triệu chứng như cũ", async () => {
    expect((await last(["a bị đau đầu"])).sx).toContain("headache");
    expect((await last(["Lomi có tư vấn sức khỏe không?", "đau dạ dày"])).sx?.length).toBeGreaterThan(0);
  }, T);
  it("câu hỏi Claude chạy thử (10/10) bị bí trước khi sửa: lây khi ăn chung, có từ hỏi mà không rõ khía cạnh, uống nước gì, khác gì", async () => {
    const r = await chat(["HP dạ dày có lây không", "ăn chung có lây không"]);
    for (const m of r) expect(m.med).toEqual({ id: "nhiem-hp", aspect: "spread" });
    expect((await last(["ADHD người lớn có không"])).med?.id).toBe("adhd");
    expect((await last(["tay chân miệng ở người lớn có không"])).med?.id).toBe("tay-chan-mieng");
    expect((await last(["sỏi thận uống nước gì tốt"])).med).toEqual({ id: "soi-than", aspect: "diet" });
    expect((await last(["bác sĩ tâm lý với bác sĩ tâm thần khác gì"])).med?.id).toBe("khac-biet-bac-si-tam-than-nha-tam-ly");
    // tự hỏi chẩn đoán về chính mình → không phải câu hỏi kiến thức
    expect((await last(["có phải a bị trầm cảm không"])).med).toBeUndefined();
  }, T);
  it("đang nói về bệnh mà nhờ gợi ý món hôm nay → vẫn là gợi ý món", async () => {
    expect((await last(["huyết áp cao kiêng gì", "hôm nay ăn gì"])).dishAsk).toBeTruthy();
  }, T);
  it("đang theo chuyện người ốm (bệnh chưa có thẻ) mà hỏi “nên cho bé ăn gì” → không bị gợi ý quán", async () => {
    const r = await chat(["con gái c bị ốm", "khám rồi", "bs nói bị bệnh kawasaki", "đang uống thuốc", "c nên cho bé ăn gì"]);
    expect(r[4].dishPick).toBeUndefined();
    expect(r[4].unk).toBeTruthy();
    expect(r[4].content).toMatch(/Con gái chị/);
  }, T);
});
