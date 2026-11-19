// 18/11 — các lỗi hiểu lầm tìm thấy trong bộ 1.000 câu (sau khi làm 4 nút chủ đề). Mỗi ca giữ đúng nghĩa người dùng muốn nói.
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";

const T = 120000;
type M = { content: string; med?: { id: string }; heart?: string; places?: unknown[]; faqId?: string; routed?: string; tarot?: unknown };

describe("cảm nắng / say nắng một người = thích thầm, không phải bệnh", () => {
  it("có dấu: cảm nắng bạn cùng lớp → lời khuyên bắt chuyện, không phải thẻ say nắng / cảm lạnh", async () => {
    const a = (await last(["tôi cảm nắng bạn cùng lớp mất rồi, cứ gặp là hồi hộp, làm sao mở lời?"])) as M;
    expect(a.med).toBeUndefined();
    expect(a.content).not.toMatch(/Say nắng|Cảm lạnh|trục trặc/);
  }, T);
  it("không dấu: không bị hiểu là app trục trặc", async () => {
    const a = (await last(["toi cam nang co ban cung lop mat roi, cu gap la hoi hop, lam sao mo loi?"])) as M;
    expect(a.content).not.toMatch(/trục trặc|Say nắng/);
  }, T);
  it("say nắng anh ấy / bị cảm nắng cô bạn → chuyện tình cảm", async () => {
    for (const q of ["mình say nắng anh ấy rồi", "mình bị cảm nắng cô bạn cùng bàn"]) {
      const a = (await last([q])) as M;
      expect(a.med, q).toBeUndefined();
      expect(a.content, q).not.toMatch(/Nghỉ ngơi nhiều, uống đủ nước|Say nắng/);
    }
  }, T);
  it("bệnh do nóng vẫn ra thẻ say nắng", async () => {
    for (const q of ["bị cảm nắng nên làm gì", "đi ngoài trời bị cảm nắng chóng mặt", "say nắng là gì"]) {
      const a = (await last([q])) as M;
      expect(a.med?.id, q).toBe("say-nang");
    }
  }, T);
});

describe("chữ ghép không phải tìm quán / không phải lỗi app", () => {
  it("người yêu thả tim cho người khác (không dấu) → không tìm quán", async () => {
    const a = (await last(["toi thay nguoi yeu chi tha tim cho nguoi khac ma it quan tam toi, toi nen noi sao?"])) as M;
    expect(a.places).toBeUndefined();
    expect(a.content).not.toMatch(/tìm được mấy/);
  }, T);
  it("đang chạy giao hàng, muốn đăng ký làm tài xế → hướng dẫn tài xế", async () => {
    const a = (await last(["Mình đang chạy giao hàng tự do, bạn bảo iLomi có mục Đưa đón nên mình muốn tìm hiểu thêm, nếu muốn đăng ký làm tài xế trên ứng dụng thì cần gì?"])) as M;
    expect(a.faqId).toBe("ridedriver");
  }, T);
  it("\"chuẩn bị gì\" không phải \"bị gì\" (lỗi app)", async () => {
    const a = (await last(["Chị mình muốn đăng ký làm tài xế ở mục Đưa đón", "chị cần chuẩn bị gì"])) as M;
    expect(a.faqId).toBe("ridedriver");
  }, T);
});

describe("câu hỏi nối về app", () => {
  it("tối đa bao nhiêu người (7 chữ) → lấy lại đúng câu 50 người", async () => {
    const a = (await last(["Mình đang tìm hiểu chat nhóm iLomi.", "Nó chứa tối đa bao nhiêu người?"])) as M;
    expect(a.content).toMatch(/50 người/);
  }, T);
  it("câu trước chỉ KỂ đang tạo nhóm → so con số với giới hạn", async () => {
    const a = (await last(["Tôi đang tạo nhóm chat trong iLomi.", "thêm 60 người có được ko"])) as M;
    expect(a.content).toMatch(/^Chưa được.*50 người/);
    const b = (await last(["Tôi đang tạo nhóm chat trong iLomi.", "30 người được không"])) as M;
    expect(b.content).toMatch(/^Được nha.*50 người/);
  }, T);
  it("Đưa đón trả tiền mặt được chứ → trả lời cách trả tiền", async () => {
    const a = (await last(["Ba mình muốn gọi ô tô bằng mục Đưa đón iLomi", "trả tiền mặt được chứ"])) as M;
    expect(a.content).toMatch(/tiền mặt/);
  }, T);
  it("cần bằng lái không → câu trong bài đăng ký tài xế, không nhảy sang đăng ký tài khoản", async () => {
    const a = (await last(["Muốn làm tài xế thì đăng ký sao?", "cần bằng lái không"])) as M;
    expect(a.faqId).toBe("ridedriver");
    expect(a.content).toMatch(/bằng lái/);
  }, T);
  it("gửi hồ sơ doanh nghiệp rồi ai duyệt → Ban quản trị duyệt tay", async () => {
    const a = (await last(["tôi gửi hồ sơ doanh ngiệp lên iLomi ròi, ai duyệt vậy"])) as M;
    expect(a.faqId).toBe("bizcreate");
    expect(a.content).toMatch(/Ban quản trị duyệt/);
  }, T);
  it("tâm sự xen giữa vẫn được lắng nghe", async () => {
    const a = (await last(["Tôi đang tạo nhóm chat trong iLomi.", "mà buồn ghê không ai vào nhóm"])) as M;
    expect(a.faqId).toBeUndefined();
  }, T);
});

describe("hỏi kiến thức Tarot không bị rút bài luôn", () => {
  it("thứ tự đọc / dùng mấy lá → giải thích, không rút", async () => {
    for (const q of ["trải bài ba lá đọc theo thứ tự nào vậy?", "trải bài xem tháng sau công việc dùng ba lá được chứ?"]) {
      const a = (await last([q])) as M;
      expect(a.tarot, q).toBeUndefined();
      expect(a.routed, q).toBe("tarot-howto");
    }
  }, T);
  it("câu nối \"cái đó…\" sau câu nói về trải bài", async () => {
    const a = (await last(["Em vừa rút trải bài ba lá về công việc.", "Cái đó đọc theo thứ tự nào vậy?"])) as M;
    expect(a.content).toMatch(/trái sang phải/);
  }, T);
  it("xin rút bài vẫn rút như cũ", async () => {
    const a = (await last(["bói 3 lá về công việc tháng sau"])) as M;
    expect(a.tarot).toBeTruthy();
  }, T);
});

describe("sức khoẻ: đúng bài thay vì tâm sự / tarot (đợt 2, 18/11)", () => {
  const med = async (q: string) => ((await last([q])) as M).med?.id;
  it("đi bơi xong đau tai (có / không dấu) → viêm tai ngoài, không phải bói", async () => {
    expect(await med("toi di boi xong thay tai bi dau va u, co can kham tai mui hong khong?")).toBe("viem-tai-ngoai");
    expect(await med("đi bơi xong tai bị đau với ù")).toBe("viem-tai-ngoai");
  }, T);
  it("bé nhà em / bé nhà tôi chán ăn → biếng ăn ở trẻ, không phải tâm sự rối loạn ăn uống", async () => {
    expect(await med("Bé nhà tôi chán ăn sau đợt ốm và sụt cân, tôi nên ghi lại gì trước khi đưa bé khám?")).toBe("bieng-an-tre");
    const a = (await last(["bé nhà em không chịu ăn, cứ ngậm cơm"])) as M;
    expect(a.content).toMatch(/biếng ăn/i);
    expect(a.content).not.toMatch(/ngậm cơm là gì/);
  }, T);
  it("đầu gối lại đau khi chạy → thẻ đau gối", async () => {
    expect(await med("Tuy tập chạy khiến mình thấy tinh thần tốt hơn nhưng mỗi lần tăng quãng đường thì đầu gối lại đau, mình nên nghỉ tập và đi khám không?")).toBe("dau-goi");
  }, T);
  it("tăng cân / sụt cân không rõ lý do → mục có nguồn, không phải lời khuyên giảm cân", async () => {
    const a = (await last(["Tôi đâu có muốn giảm cân, tôi đang hỏi ăn sao để tăng cân cho khỏe."])) as M;
    expect(a.content).toMatch(/Tăng cân lành mạnh/);
    expect(a.content).not.toMatch(/dễ tăng lại/);
    const b = (await last(["Nếu mình ăn đủ bữa, ngủ tương đối đều mà cân nặng vẫn giảm liên tục trong hai tháng thì có nên đi khám không?"])) as M;
    expect(b.content).toMatch(/nên đi khám/);
  }, T);
  it("dấu hiệu rối loạn ăn uống → tâm sự + khuyên tìm chuyên gia, không phải chọn món / thẻ buồn nôn", async () => {
    for (const q of ["ăn xong mình hay móc họng vì sợ béo", "dạo này mình chán ăn, ăn vô là muốn nôn vì sợ mập", "toi hay moc hong sau khi an vi so beo"]) {
      const a = (await last([q])) as M;
      expect(a.heart, q).toBe("eating");
      expect(a.med, q).toBeUndefined();
      expect(a.content, q).not.toMatch(/Nếu là Lomi thì chọn/);
    }
    expect(await med("ăn xong buồn nôn là bị gì")).toBeTruthy();
  }, T);
  it("lá cây / thuốc nam khi đang uống thuốc bác sĩ → không tự ngưng thuốc, hỏi dược sĩ", async () => {
    const a = (await last(["Mình nghe đồng nghiệp bảo lá cây có thể chữa hết bệnh nên cũng tò mò, nhưng đang uống thuốc bác sĩ kê và chưa dám thử, mình nên làm sao?"])) as M;
    expect(a.content).toMatch(/Đừng tự ngưng thuốc bác sĩ kê/);
  }, T);
  it("câu kể dài: bà dùng thuốc chống đông hỏi ăn rau xanh → lời về warfarin + rau xanh", async () => {
    const a = (await last(["Bà ngoại muốn đi ăn cùng nhà mà đang dùng thuốc chống đông, ăn rau xanh có cần hỏi bác sĩ về chế độ ăn không?"])) as M;
    expect(a.content).toMatch(/tuỳ loại thuốc chống đông/);
  }, T);
});

describe("kinh doanh: chủ quán hỏi việc cụ thể (19/11)", () => {
  type B = M & { biz?: { topic?: string }; bizPick?: boolean };
  const cases: [string[], RegExp][] = [
    [["chị bán bánh online mà khách hỏi rồi im luôn, tư vấn chị với"], /Khách hỏi rồi im/],
    [["Máy quẹt thẻ ở quán tôi hay lỗi, có nên thêm mã QR để khách thanh toán tiện hơn?"], /mã QR/],
    [["Khách hủy đặt bàn làm mình hụt hẫng, nhưng điều mình cần là mẫu chính sách đặt cọc cho quán để giảm hủy sát giờ."], /đặt cọc/],
    [["Mình ngủ kém vì lo quán lỗ, nhưng giờ chỉ cần bạn giúp lập kế hoạch giảm chi phí mà vẫn giữ chất lượng."], /Giảm chi phí/],
    [["Marketing đỉnh ghê, chạy quảng cáo tốn tiền mà đơn vẫn lẹt đẹt; shop mình nên sửa từ đâu?"], /quảng cáo tốn tiền/],
    [["Cách nhận ưu đãi trên app là sao?", "À quán cà phê mình bị khách chê phục vụ chậm, nên sửa quy trình từ đâu?"], /phục vụ chậm/],
    [["Mẹ mình bán bánh tại nhà, muốn có thêm khách trên mạng.", "mẹ ngại quay mặt lên video"], /Ngại lộ mặt/],
    [["Tui tính thuê thầy bói tới quán dịp khai trương, nhưng cần bạn tính cách chia ngân sách quảng cáo cho sự kiện này."], /ngân sách/],
  ];
  it("trả lời đúng việc, không hỏi lại loại hình", async () => {
    for (const [turns, re] of cases) {
      const a = (await last(turns)) as B;
      expect(a.bizPick, turns.join(" | ")).toBeFalsy();
      expect(a.content, turns.join(" | ")).toMatch(re);
    }
  }, T * 3);
  it("\"từ đâu\" / \"Đâu có\" không bị coi là chữ \"đau\"; đau bụng thật vẫn là sức khoẻ", async () => {
    const a = (await last(["Đâu có bán online, tiệm bánh tôi chỉ bán tại chỗ, làm sao kéo người quanh khu tới?"])) as B;
    expect(a.biz).toBeTruthy();
    const b = (await last(["từ ngày mở shop mình bỏ bữa, giờ đau bụng dữ dội kèm nôn"])) as B;
    expect(b.biz).toBeFalsy();
  }, T);
  it("câu nối sau câu kể về khách của homestay → tư vấn báo giá; câu kể không thành tâm sự gia đình", async () => {
    const a = (await last(["Khách của homestay mình chủ yếu đi theo gia đình.", "Họ hay hỏi gói ở dài ngày, nên báo giá sao?"])) as B;
    expect(a.biz?.topic).toBe("price");
    const b = (await last(["Khách của homestay mình chủ yếu đi theo gia đình."])) as B;
    expect(b.content).not.toMatch(/Chuyện gia đình là chuyện khó nói/);
  }, T);
});
