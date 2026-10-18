// 18/10 — Kir gửi spec "Nâng cấp kho kiến thức bệnh lý": chạy 14 câu kiểm thử bắt buộc (+ ví dụ mục 1) qua CHÍNH khung chat (AiChat).
// Mỗi test ứng với một lỗi thật đo được trước khi sửa (xem chú thích), cộng các câu đã đúng từ trước để giữ không bị hỏng.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { plainPub } from "@/lib/lomiCite";

const T = 60000;

describe("18/10 — an toàn y khoa", () => {
  it("khớp sưng nóng đỏ + sốt → khám gấp TRONG NGÀY đứng đầu; không dùng cảnh báo của đau đầu", async () => {
    const m = await last(["Tôi đau khớp dữ dội, khớp sưng nóng đỏ và sốt."]);
    const first = m.content.split("\n\n")[0];
    expect(first).toMatch(/đi khám ngay trong hôm nay/);
    expect(first).toMatch(/nhiễm trùng/);
    expect(m.content).not.toMatch(/cứng cổ, yếu tay chân, nói khó/); // trước đây dùng nhầm mẫu cảnh báo đau đầu
    expect(m.content).not.toMatch(/Nên kiêng \/ tránh/); // không kèm danh sách kiêng cữ lâu dài khi cần đi khám gấp
    expect(m.content).toMatch(/Trong lúc chuẩn bị đi khám/);
  }, T);

  it("đau đầu dữ dội vẫn giữ cảnh báo thần kinh", async () => {
    const m = await last(["Đau đầu dữ dội quá"]);
    expect(m.content).toMatch(/cứng cổ|yếu tay chân|115/);
  }, T);

  it("warfarin + ibuprofen → cảnh báo có nguồn, không 'chưa có kiến thức'", async () => {
    const m = await last(["Đang uống warfarin uống thêm ibuprofen được không?"]);
    expect(m.drug).toMatchObject({ kind: "interact", id: "warfarin" });
    expect(m.content).toMatch(/có thể không hợp/);
    expect(m.content).toMatch(/chảy máu/);
    expect(m.content).not.toMatch(/^Xếp|chưa có kiến thức/m);
    expect(m.unk).toBeFalsy();
  }, T);

  it("không có tên thuốc ngoại → không bắt nhầm thành câu hỏi thuốc", async () => {
    const m = await last(["Đang uống trà uống thêm cà phê được không?"]);
    expect(m.drug).toBeFalsy();
  }, T);
});

describe("18/10 — nhóm cần thận trọng", () => {
  it("bé 2 tuổi tiêu chảy → thẻ TRẺ EM, không phải thẻ người lớn", async () => {
    const m = await last(["Bé 2 tuổi bị tiêu chảy uống gì?"]);
    expect(m.med?.id).toBe("tieu-chay-o-tre");
  }, T);

  it("bé bị táo bón → thẻ trẻ em", async () => {
    const m = await last(["Bé nhà mình bị táo bón phải làm sao?"]);
    expect(m.med?.id).toBe("tao-bon-o-tre");
  }, T);

  it("bà bầu táo bón → lưu ý thai kỳ đặt sau danh sách đầu, nhắc hỏi bác sĩ trước khi dùng thuốc", async () => {
    const m = await last(["Bà bầu bị táo bón nên làm gì?"]);
    expect(m.med).toEqual({ id: "tao-bon", aspect: "care" });
    expect(m.content).toMatch(/🤰 \*\*Đang mang thai thì lưu ý thêm:\*\*/);
    expect(m.content).toMatch(/an toàn khi mang thai/); // ý có nguồn trong thẻ
    expect(m.content).toMatch(/bất kỳ thuốc gì/);
    expect(m.content.split("\n\n")[1]).toMatch(/^• /); // tiêu đề "nên:" vẫn liền với danh sách của nó
  }, T);

  it("người lớn hỏi bình thường → không chèn lưu ý nhóm", async () => {
    const m = await last(["Táo bón có mẹo gì?"]);
    expect(m.content).not.toMatch(/🤰|👶|🤱/);
  }, T);
});

describe("18/10 — hiểu đúng ý", () => {
  it("'có mẹo gì' → cách chăm sóc, không phải bài tổng quan", async () => {
    expect((await last(["Táo bón có mẹo gì?"])).med).toEqual({ id: "tao-bon", aspect: "care" });
    expect((await last(["bi tao bon lm sao de di cau de hon"])).med?.aspect).toBe("care");
  }, T);

  it("'cần chú ý điều gì' → chăm sóc, không tách thành ý 'ý điều'", async () => {
    const m = await last(["Cao huyết áp cần chú ý điều gì?"]);
    expect(m.med).toEqual({ id: "tang-huyet-ap", aspect: "care" });
    expect(m.content).not.toMatch(/“ý điều”/);
    expect(m.content).toMatch(/giảm muối/);
  }, T);

  it("đang ho + nước lạnh → thẻ ho, không hiểu thành 'nước chanh mật ong ấm', nói rõ nguồn không nêu riêng", async () => {
    const m = await last(["Đang ho có nên uống nước lạnh không?"]);
    expect(m.med?.id).toBe("ho");
    expect(m.content).toMatch(/\*\*nước lạnh\*\* thì Lomi \*\*chưa xác minh được\*\*/);
    expect(m.content).toMatch(/uống nhiều nước/);
    expect(m.content).not.toMatch(/thuộc nhóm “nước chanh mật ong ấm”/);
  }, T);

  it("gout → hải sản: không còn câu cụt sau khi bỏ tên cơ quan", async () => {
    const r = await chat(["Bị gout ăn gì?", "còn hải sản thì sao?"]);
    const m = r[r.length - 1];
    expect(m.med).toEqual({ id: "gout", aspect: "food" });
    expect(m.content).toMatch(/Ngoài ra còn vẹm, sò điệp/);
    expect(m.content).not.toMatch(/\. Vẹm, sò điệp/);
  }, T);

  it("lomiCite: 'X nêu thêm …' và 'X xếp **…** vào' giữ được vị ngữ", () => {
    expect(plainPub("Nguy cơ: tiền sử gia đình; NHS nêu thêm người gốc châu Á.")).toBe("Nguy cơ: tiền sử gia đình; ngoài ra còn người gốc châu Á.");
    expect(plainPub("NIDDK xếp sữa, sữa chua, phô mai mềm, kem vào nhóm FODMAP cao.")).toBe("Sữa, sữa chua, phô mai mềm, kem được xếp vào nhóm FODMAP cao.");
  });
});

describe("18/10 — các câu đã đúng, giữ nguyên", () => {
  it("cf? / rủ đi cà phê không phải câu hỏi y tế; cà phê nhiều thì có", async () => {
    expect((await last(["cf?"])).med).toBeFalsy();
    expect((await last(["Đi uống cà phê không?"])).content).not.toMatch(/caffeine/);
    expect((await last(["Uống nhiều cà phê có sao không?"])).content).toMatch(/400 mg caffeine/);
  }, T);

  it("món chưa có nguồn → nói thẳng chưa xác minh (không bịa)", async () => {
    const m = await last(["Bị gout ăn nhộng tằm được không?"]);
    expect(m.content).toMatch(/chưa xác minh được/);
  }, T);

  it("giữ ngữ cảnh bệnh qua lượt nối", async () => {
    const r = await chat(["Mình bị gout", "thế ăn trứng được không?"]);
    expect(r[1].med?.id).toBe("gout");
  }, T);
});
