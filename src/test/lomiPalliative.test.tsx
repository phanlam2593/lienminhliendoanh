// 30/10 — Kir gửi ảnh: "Ung thư phúc mạc mà bác sĩ trả về thì h làm j?" bị đáp bằng thẻ ung thư chung (phẫu thuật, hoá trị, xạ trị…),
// mất chữ "phúc mạc"; "Bố e bị ung thư gan bác sĩ trả về rồi" bị hỏi lại "đang điều trị sao rồi"; "bs cho về nhà vì k chữa được nữa"
// thì "chưa có kiến thức". Chạy qua CHÍNH khung chat (lomiChatHarness). Mỗi ca ghi lời đáp TRƯỚC khi sửa (commit d0ff6f4).
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { diseaseOf, palliativeOf } from "@/lib/lomiPalliative";

const T = 60000;
const GENERIC_TX = /phẫu thuật, hoá trị, xạ trị/;

describe("30/10 — bác sĩ trả về / giai đoạn cuối", () => {
  // Trước: "🌿 Với **Ung thư**, nên: • Cách điều trị tuỳ loại ung thư; thường gặp là phẫu thuật, hoá trị, xạ trị…"
  it("P1. ca gốc trong ảnh → đúng bệnh, chăm sóc giảm nhẹ, dấu hiệu vùng bụng, không đọc phương án điều trị", async () => {
    const m = await last(["Ung thư phúc mạc mà bác sĩ trả về thì h làm j?"]);
    expect(m.med?.id).toBe("cham-soc-giam-nhe");
    expect(m.content).toMatch(/\*\*ung thư phúc mạc\*\* mà bác sĩ cho về/);
    expect(m.content).toMatch(/Hỏi lại bác sĩ cho rõ "trả về"/);
    expect(m.content).toMatch(/chăm sóc giảm nhẹ/i);
    expect(m.content).toMatch(/đừng đợi đau nhiều mới dùng/);
    expect(m.content).toMatch(/tích dịch ổ bụng/);
    expect(m.content).toMatch(/tắc ruột/);
    expect(m.content).not.toMatch(GENERIC_TX);
    expect(m.content).not.toMatch(/chưa chắc hiểu đúng/);
    expect(m.src).toMatch(/WHO/);
  }, T);
  // Trước: "Bố em bị ung thư hả 🥺 Thương ghê. Giờ bố em đang điều trị sao rồi em?"
  it("P2. người thân + trả về → nói đúng người, không hỏi lại đang điều trị sao", async () => {
    const m = await last(["Bố e bị ung thư gan bác sĩ trả về rồi"]);
    expect(m.content).toMatch(/bố \S+ bị \*\*ung thư gan\*\* mà bác sĩ cho về/);
    expect(m.content).not.toMatch(/đang điều trị sao rồi/);
    expect(m.content).not.toMatch(/chưa chắc hiểu đúng/);
  }, T);
  // Trước: "Chuyện này Lomi chưa có kiến thức đã kiểm chứng…"
  it("P3. 'không chữa được nữa' không nêu tên bệnh → vẫn giúp", async () => {
    const m = await last(["bs cho về nhà vì k chữa được nữa, giờ sao"]);
    expect(m.med?.id).toBe("cham-soc-giam-nhe");
    expect(m.content).not.toMatch(/chưa có kiến thức/);
  }, T);
  // Trước: lượt 2 "Ba anh … đang điều trị sao rồi anh?" rồi lượt sau không còn nhớ bệnh.
  it("P4. chuỗi: kể bệnh → 'bs trả về rồi' → nhớ người + bệnh; hỏi tiếp giảm đau / ăn uống / bụng chướng đáp đúng phần", async () => {
    const r = await chat(["ba a bị ung thư", "bs trả về rồi e", "giờ chăm sao cho đỡ đau", "ba chán ăn quá", "bụng chướng to thì sao"]);
    expect(r[1].content).toMatch(/[Bb]a anh bị \*\*ung thư\*\* mà bác sĩ cho về/);
    expect(r[2].content).toMatch(/Giảm đau cho ba anh/);
    expect(r[2].content).toMatch(/không nêu liều/);
    expect(r[3].content).toMatch(/Chuyện ăn uống của ba anh/);
    expect(r[4].content).toMatch(/tích dịch ổ bụng|tắc ruột/);
  }, T);
  it("P5. cảm xúc người chăm: rối → đỡ lời; sợ mất → không nói như đã mất; kể kỷ niệm → nghe, không chuyển sang ăn uống", async () => {
    const r = await chat(["Mẹ e ung thư giai đoạn cuối, bv trả về nhà", "Đang rối quá", "e sợ mất mẹ lắm", "hồi nhỏ mẹ hay nấu cháo cho e"]);
    expect(r[1].content).toMatch(/Rối là phải mà/);
    expect(r[2].content).toMatch(/Sợ mất mẹ/);
    expect(r[2].content).not.toMatch(/ký ức|chia buồn|đã mất/);
    expect(r[3].content).toMatch(/kỷ niệm/);
    expect(r[3].content).not.toMatch(/Chuyện ăn uống/);
  }, T);
  it("P6. chính người bệnh nói → đáp với chính họ", async () => {
    const m = await last(["a bị ung thư phổi, bs bảo hết cách rồi"]);
    expect(m.content).toMatch(/Anh đang phải đối mặt với \*\*ung thư phổi\*\*/);
  }, T);
  it("P7. chỉ nói 'giai đoạn cuối' (không nói trả về) → không bịa 'bác sĩ cho về'; hỏi sống bao lâu → nói thật là khó đoán", async () => {
    const m = await last(["ung thư tuỵ giai đoạn cuối sống được bao lâu"]);
    expect(m.content).not.toMatch(/bác sĩ cho về/);
    expect(m.content).toMatch(/rất khó đoán trước/);
  }, T);
  it("P8. không nhận nhầm: ra viện vì đã đỡ, hàng bị trả về, kết quả trả về, chuyện trong phim, 'bó tay' kiểu than", () => {
    for (const q of ["bác sĩ cho về nhà rồi, đỡ nhiều rồi", "hàng bị trả về rồi", "kết quả xét nghiệm trả về bình thường", "trong phim ông ấy bị ung thư bác sĩ trả về", "bó tay với nó luôn", "mẹ a mổ ruột thừa xong bs cho về rồi", "chăm sóc giảm nhẹ là gì"])
      expect(palliativeOf(q), q).toBeNull();
  });
  it("P9. tên bệnh đúng như gõ", () => {
    expect(diseaseOf("Ung thư phúc mạc mà bác sĩ trả về")).toBe("ung thư phúc mạc");
    expect(diseaseOf("ung thư phúc mạc có chữa được không")).toBe("ung thư phúc mạc");
    expect(diseaseOf("mẹ bị ung thư cổ tử cung giai đoạn cuối")).toBe("ung thư cổ tử cung");
    expect(diseaseOf("ba bị K gan")).toBe("ung thư gan");
  });
  // Trước: đáp như "ung thư" chung mà không nói là chung — người đọc tưởng đó là thông tin của ung thư phúc mạc.
  it("P10. loại ung thư chưa có thẻ riêng → nói thật là phần chung", async () => {
    const m = await last(["ung thư phúc mạc là gì"]);
    expect(m.content).toMatch(/chưa có bài riêng về \*\*ung thư phúc mạc\*\*/);
    const g = await last(["ung thư gan là gì"]);
    expect(g.content).not.toMatch(/chưa có bài riêng/);
  }, T);
});
