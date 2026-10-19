// 19/10 — Kir gửi spec "AUDIT VÀ SỬA LUỒNG TƯ VẤN SỨC KHỎE": chạy qua CHÍNH khung chat (AiChat), không mô phỏng thứ tự xử lý.
// Mỗi ca ghi: đầu vào · TRƯỚC khi sửa (đo trên commit 74a45aa) · mong đợi. Ca nào trước đã đúng thì ghi "đã đúng" — giữ để không hỏng lại.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { analyzeBody } from "@/lib/lomiSymptoms";

const T = 60000;
const INTAKE = /Lomi hỏi thêm (2 điều|chút)|em hỏi thêm (2 điều|chút)/;
const HOME_CARE = /Chườm ấm bụng dưới|Nghỉ ngơi, ngủ đủ, uống đủ nước/;

describe("19/10 — ca lỗi gốc", () => {
  // Trước: "Anh đang bị **đau bụng và đau bụng kinh** hả. Để gợi ý cho sát, em hỏi thêm 2 điều nha" — lặp nghĩa, chỉ hỏi lại, không có mẹo.
  it("A1. 'Tư vấn cho a đau bụng kinh nha' → mẹo có nguồn, không lặp 'đau bụng và đau bụng kinh', không bắt khai triệu chứng", async () => {
    const m = await last(["Tư vấn cho a đau bụng kinh nha"]);
    expect(m.content).not.toMatch(/đau bụng và đau bụng kinh/);
    expect(m.content).not.toMatch(INTAKE);
    expect(m.med).toMatchObject({ id: "dau-bung-kinh", aspect: "care" });
    expect(m.content).toMatch(/chườm ấm/i);
    expect(m.src).toMatch(/NHS/);
  }, T);
  // Trước: lượt 2 đáp lại cả bảng phân tích chưa có nguồn, ngữ cảnh vẫn giữ "bellyache".
  it("A2. … → 'K đau bụng kinh thôi' → nhận lại đúng điều đính chính, không còn 'đau bụng' độc lập", async () => {
    const r = await chat(["Tư vấn cho a đau bụng kinh nha", "K đau bụng kinh thôi"]);
    expect(r[1].content).toMatch(/hiểu rồi — là \*\*đau bụng kinh\*\* thôi/);
    expect(r[1].sx).toEqual(["periodpain"]);
    expect(r[1].content).not.toMatch(/Những triệu chứng này hay gặp/); // không đọc lại cả bài
  }, T);
  // Trước: chỉ hỏi "bị bao lâu rồi… có kèm sốt, nôn…" + cảnh báo 115 chung chung + "chưa gắn nguồn".
  it("B1. 'Mẹo chữa nghẹt mũi' → mẹo chăm sóc ban đầu có nguồn (nước muối, nước đun sôi để nguội / nước cất), khi nào đi khám", async () => {
    const m = await last(["Mẹo chữa nghẹt mũi"]);
    expect(m.med).toMatchObject({ id: "sx-nghet-mui", aspect: "care" });
    expect(m.content).toMatch(/nước muối/);
    expect(m.content).toMatch(/đun sôi để nguội|nước cất/);
    expect(m.content).toMatch(/co mạch chỉ dùng ngắn ngày/); // giới hạn của thuốc xịt co mạch — không khuyên dùng
    expect(m.content).toMatch(/Nên đi khám khi/);
    expect(m.content).not.toMatch(INTAKE);
    expect(m.content).not.toMatch(/chưa gắn nguồn/);
    expect(m.src).toMatch(/NHS/);
  }, T);
});

describe("19/10 — nhận diện triệu chứng cụ thể, không lặp nghĩa", () => {
  it("1. 'Đau bụng kinh thôi' → chỉ đau bụng kinh (trước: sx = bellyache + periodpain)", async () => {
    const m = await last(["Đau bụng kinh thôi"]);
    expect(m.sx).toEqual(["periodpain"]);
    expect(m.content).not.toMatch(/đau bụng và đau bụng kinh/);
  }, T);
  it("2. 'Đau bụng dưới bên phải ngày càng nặng' → giữ cảnh báo ruột thừa, không 'đau bụng và đau bụng dưới bên phải'", async () => {
    const m = await last(["Đau bụng dưới bên phải ngày càng nặng"]);
    expect(m.content).toMatch(/^⚠️/);
    expect(m.content).toMatch(/ruột thừa/);
    expect(m.content).not.toMatch(/đau bụng và đau bụng dưới/);
  }, T);
  it("3. 'Đau bụng và buồn nôn' → giữ HAI triệu chứng độc lập (đã đúng)", async () => {
    const m = await last(["Đau bụng và buồn nôn"]);
    expect(m.sx).toEqual(expect.arrayContaining(["bellyache", "nausea"]));
  }, T);
  it("4. 'sốt cao' → không 'sốt và sốt cao' (trước: lặp)", async () => {
    const m = await last(["sốt cao"]);
    expect(m.content).not.toMatch(/sốt và sốt cao|sốt, sốt cao/);
    expect(m.content).toMatch(/\*\*sốt cao\*\*/);
  }, T);
  it("5. 'Đau đầu dữ dội' → cảnh báo 115, không 'đau đầu và đau đầu dữ dội', không kèm mẹo ở nhà", async () => {
    const m = await last(["Đau đầu dữ dội"]);
    expect(m.content).toMatch(/^⚠️/);
    expect(m.content).not.toMatch(/đau đầu và đau đầu dữ dội/);
    expect(m.content).not.toMatch(HOME_CARE);
  }, T);
  it("6. 'Nghẹt mũi kèm khó thở nặng' → cảnh báo cấp cứu, không 'khó thở, khó thở nặng'", async () => {
    const m = await last(["Nghẹt mũi kèm khó thở nặng"]);
    expect(m.content).toMatch(/^⚠️/);
    expect(m.content).toMatch(/115/);
    expect(m.content).not.toMatch(/khó thở, khó thở nặng/);
  }, T);
  it("7. 'ho ra máu' → cảnh báo 115 (đã đúng)", async () => {
    const m = await last(["ho ra máu"]);
    expect(m.content).toMatch(/^⚠️ \*\*ho ra máu\*\*/);
  }, T);
  it("8. 'Không phải đau bụng, chỉ đau bụng kinh' → chỉ đau bụng kinh (trước: giữ cả 'đau bụng')", async () => {
    const m = await last(["Không phải đau bụng, chỉ đau bụng kinh"]);
    expect(m.sx).toEqual(["periodpain"]);
  }, T);
  it("9. 'đau bụng' → 'không phải đau bụng, đau bụng kinh thôi' → bỏ 'đau bụng' đã kể", async () => {
    const r = await chat(["đau bụng", "không phải đau bụng, đau bụng kinh thôi"]);
    expect(r[1].sx).not.toContain("bellyache");
    expect(r[1].sx).toContain("periodpain");
  }, T);
  it("10. 'Mình bị sốt' → 'không sốt nữa, giờ chỉ ho thôi' → không giữ sốt (trước: rơi 'ghi nhận thêm chi tiết', vẫn nhớ sốt)", async () => {
    const r = await chat(["Mình bị sốt", "không sốt nữa, giờ chỉ ho thôi"]);
    expect(r[1].sx).toEqual(["cough"]);
  }, T);
  it("11. bộ phân tích: 'đau đầu và sốt cao' → hiện 'sốt cao và đau đầu', không thêm 'sốt' riêng", () => {
    const b = analyzeBody("đau đầu và sốt cao")!;
    expect(b.text).toMatch(/\*\*sốt cao và đau đầu\*\*/);
  });
});

describe("19/10 — hỏi CÁCH XỬ LÝ thì đưa mẹo, không biến thành phiếu khai", () => {
  it("12. 'Mẹo chữa nghet mui' (không dấu) → vẫn hiểu là xin mẹo nghẹt mũi", async () => {
    const m = await last(["Mẹo chữa nghet mui"]);
    expect(m.med).toMatchObject({ id: "sx-nghet-mui", aspect: "care" });
  }, T);
  it("13. 'nghet mui quaaa, lam sao het z' → mẹo nghẹt mũi (trước: bảng ăn uống Cảm lạnh)", async () => {
    const m = await last(["nghet mui quaaa, lam sao het z"]);
    expect(m.med).toMatchObject({ id: "sx-nghet-mui", aspect: "care" });
  }, T);
  it("14. 'Làm sao cho đỡ đau bụng kinh?' → mẹo có nguồn (đã đúng)", async () => {
    const m = await last(["Làm sao cho đỡ đau bụng kinh?"]);
    expect(m.med).toMatchObject({ id: "dau-bung-kinh", aspect: "care" });
  }, T);
  it("15. 'Đau đầu thì làm gì?' → mẹo có nguồn (đã đúng)", async () => {
    const m = await last(["Đau đầu thì làm gì?"]);
    expect(m.med).toMatchObject({ id: "dau-dau", aspect: "care" });
  }, T);
  it("16. 'Bị ho thì nên làm sao?' → mẹo có nguồn + khi nào đi khám (đã đúng)", async () => {
    const m = await last(["Bị ho thì nên làm sao?"]);
    expect(m.med).toMatchObject({ id: "ho", aspect: "care" });
    expect(m.content).toMatch(/khó thở|ho ra máu/);
  }, T);
  it("17. 'Nghẹt mũi thì có cần đi khám không?' → trả lời KHI NÀO đi khám (trước: phiếu khai triệu chứng)", async () => {
    const m = await last(["Nghẹt mũi thì có cần đi khám không?"]);
    expect(m.med).toMatchObject({ id: "sx-nghet-mui", aspect: "doctor" });
    expect(m.content).toMatch(/10 ngày/);
    expect(m.content).not.toMatch(INTAKE);
  }, T);
  it("18. 'mẹo trị buồn nôn' → mẹo có nguồn của thẻ buồn nôn (đã đúng)", async () => {
    const m = await last(["mẹo trị buồn nôn"]);
    expect(m.med?.aspect).toBe("care");
  }, T);
});

describe("19/10 — kể tình trạng: chỉ hỏi điều còn thiếu", () => {
  it("19. 'Nghẹt mũi 3 ngày rồi' → không hỏi lại 'bị bao lâu rồi' (trước: hỏi lại) + gợi ý sẵn câu xin mẹo", async () => {
    const m = await last(["Nghẹt mũi 3 ngày rồi"]);
    expect(m.sx).toEqual(["stuffy"]);
    expect(m.content).not.toMatch(/bao lâu/);
    expect(m.quick).toContain("Mẹo cho đỡ nghẹt mũi");
  }, T);
  it("20. 'Tôi chỉ nghẹt mũi, không sốt' → không thêm sốt, không hỏi lại có sốt không, không dặn 115 chung chung", async () => {
    const m = await last(["Tôi chỉ nghẹt mũi, không sốt"]);
    expect(m.sx).not.toContain("fever");
    expect(m.content).not.toMatch(/kèm sốt|có sốt không/);
    expect(m.content).not.toMatch(/yếu tay chân thì gọi/);
  }, T);
  it("21. 'Mẹ tôi đau bụng kinh' → nói về mẹ, không nói người dùng đang bị", async () => {
    const m = await last(["Mẹ tôi đau bụng kinh"]);
    expect(m.content).toMatch(/^Mẹ bạn/);
    expect(m.content).not.toMatch(/^Bạn đang bị/);
    expect(m.content).not.toMatch(/đau bụng và đau bụng kinh/);
  }, T);
  it("22. 'Đau bụng kinh' → 'đau vừa thôi, 1 ngày' → nhận câu trả lời ngắn, không hỏi lại thời gian (đã đúng)", async () => {
    const r = await chat(["Đau bụng kinh", "đau vừa thôi, 1 ngày"]);
    expect(r[1].content).toMatch(/Mới 1 ngày/);
    expect(r[1].content).not.toMatch(/bao lâu/);
  }, T);
  it("23. 'đau bụng kinh quá trời ơi!!!' (than kiểu đời thường) → chỉ đau bụng kinh", async () => {
    const m = await last(["đau bụng kinh quá trời ơi!!!"]);
    expect(m.sx).toEqual(["periodpain"]);
  }, T);
});

describe("19/10 — câu nối giữ đúng chủ thể", () => {
  it("24. 'Nghẹt mũi' → 'vậy làm sao?' → mẹo nghẹt mũi (trước: bài Cúm vì khoá cũ 'cảm cúm')", async () => {
    const r = await chat(["Nghẹt mũi", "vậy làm sao?"]);
    expect(r[1].med).toMatchObject({ id: "sx-nghet-mui", aspect: "care" });
    expect(r[1].content).not.toMatch(/Cúm/);
  }, T);
  it("25. 'Nghẹt mũi' → bấm gợi ý 'Mẹo cho đỡ nghẹt mũi' → mẹo nghẹt mũi (không bị viết lại thành 'cảm cúm nên làm gì')", async () => {
    const r = await chat(["Nghẹt mũi", "Mẹo cho đỡ nghẹt mũi"]);
    expect(r[1].med).toMatchObject({ id: "sx-nghet-mui", aspect: "care" });
  }, T);
  it("26. 'Mẹo chữa nghẹt mũi' → 'Uống thuốc xịt mũi à?' → đúng phần thuốc của nghẹt mũi (trước: thuốc của Cúm); không lẫn 'khói thuốc'", async () => {
    const r = await chat(["Mẹo chữa nghẹt mũi", "Uống thuốc xịt mũi à?"]);
    expect(r[1].med).toMatchObject({ id: "sx-nghet-mui", aspect: "meds" });
    expect(r[1].content).toMatch(/co mạch/);
    expect(r[1].content).not.toMatch(/Cúm|Khói thuốc/);
    expect(r[1].content).toMatch(/không kê thuốc/);
  }, T);
  it("27. 'mình bị đau đầu' → 'uống thuốc gì được?' → vẫn là lớp thuốc (không kê, không liều) như trước", async () => {
    const r = await chat(["mình bị đau đầu", "uống thuốc gì được?"]);
    expect(r[1].content).toMatch(/không kê thuốc/);
  }, T);
});

describe("19/10 — an toàn / cấp cứu đi trước", () => {
  it("28. 'Đau bụng kinh dữ dội đột ngột, choáng muốn ngất' → gọi 115 (nguồn: thẻ thai ngoài tử cung, NHS); không kèm chườm ấm (trước: chỉ 'nên đi khám sớm')", async () => {
    const m = await last(["Đau bụng kinh dữ dội đột ngột, choáng muốn ngất"]);
    expect(m.content).toMatch(/^⚠️/);
    expect(m.content).toMatch(/115/);
    expect(m.content).not.toMatch(HOME_CARE);
    expect(m.content).not.toMatch(/bao lâu rồi/);
  }, T);
  it("29. 'Nghẹt mũi kèm khó thở nặng thì làm sao' → cảnh báo trước, KHÔNG đưa mẹo ở nhà (trước: bảng ăn uống Cảm lạnh)", async () => {
    const m = await last(["Nghẹt mũi kèm khó thở nặng thì làm sao"]);
    expect(m.content).toMatch(/^⚠️/);
    expect(m.med).toBeUndefined();
  }, T);
  it("30. 'Tôi bị nghẹt mũi 3 ngày rồi, giờ sốt cao và khó thở' → không phải phiếu khai; khuyên khám ngay", async () => {
    const m = await last(["Tôi bị nghẹt mũi 3 ngày rồi, giờ sốt cao và khó thở"]);
    expect(m.content).not.toMatch(INTAKE);
    expect(m.content).toMatch(/Khám Hô hấp\/Nội ngay|115/);
    expect(m.content).not.toMatch(/sốt, sốt cao/);
  }, T);
  it("31. 'Con tôi 2 tuổi bị sốt' → nói về bé + lưu ý trẻ nhỏ (đã đúng)", async () => {
    const m = await last(["Con tôi 2 tuổi bị sốt"]);
    expect(m.content).toMatch(/bé đang có/);
    expect(m.content).toMatch(/Với trẻ nhỏ/);
  }, T);
  it("32. 'Paracetamol uống mấy viên' → không đưa liều (đã đúng)", async () => {
    const m = await last(["Paracetamol uống mấy viên"]);
    expect(m.content).toMatch(/không đưa liều/);
    expect(m.content).not.toMatch(/\d+\s*(mg|viên)/);
  }, T);
});

describe("19/10 — nguồn minh bạch / không lấn phạm vi", () => {
  it("33. câu có thẻ nguồn ('Bệnh sốt xuất huyết là gì') → có nguồn cất kèm (đã đúng)", async () => {
    const m = await last(["Bệnh sốt xuất huyết là gì"]);
    expect(m.med?.id).toBe("sot-xuat-huyet");
    expect(m.src).toBeTruthy();
  }, T);
  it("34. chưa có kiến thức ('Mẹo chữa nghẹt tai') → nói thật là chưa biết, không bịa mẹo / nguồn (đã đúng)", async () => {
    const m = await last(["Mẹo chữa nghẹt tai"]);
    expect(m.med).toBeUndefined();
    expect(m.src).toBeFalsy();
    expect(m.content).toMatch(/chưa được tiếp thu|chưa có kiến thức/);
  }, T);
  it("35. 'nghẹt mũi là gì' → vẫn là bài nguyên nhân chung như cũ (góc nhìn triệu chứng chỉ lo mẹo / khi nào khám / thuốc)", async () => {
    const m = await last(["nghẹt mũi là gì"]);
    expect(m.med).toBeUndefined();
    expect(m.content).toMatch(/nhiều nguyên nhân/);
  }, T);
  it("36. 'tư vấn về bệnh gout' → hỏi muốn biết phần nào như cũ (chữ 'tư vấn về' không bị hiểu thành xin mẹo)", async () => {
    const m = await last(["tư vấn về bệnh gout"]);
    expect(m.med?.aspect).not.toBe("care");
  }, T);
  it("37. 'Bị tiêu chảy nên ăn gì' → bảng ăn uống có nguồn (đã đúng)", async () => {
    const m = await last(["Bị tiêu chảy nên ăn gì"]);
    expect(m.med).toMatchObject({ id: "tieu-chay", aspect: "diet" });
  }, T);
  it("38. 'Bị cảm thì kiêng gì' → ăn uống cảm lạnh có nguồn (đã đúng)", async () => {
    const m = await last(["Bị cảm thì kiêng gì"]);
    expect(m.med).toMatchObject({ id: "cam-lanh", aspect: "diet" });
  }, T);
});
