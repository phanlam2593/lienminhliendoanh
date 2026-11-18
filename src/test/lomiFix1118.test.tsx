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
