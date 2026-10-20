// Audit Lomi 20/10 — mỗi ca dưới đây là một lỗi đã TÁI HIỆN qua khung chat thật (AiChat → send) trước khi sửa.
// Chạy qua lomiChatHarness (không gọi riêng hàm helper) để test thấy đúng thứ tự xử lý trong AiAssistant.send().
import { describe, expect, it } from "vitest";
import { chat, last } from "@/test/lomiChatHarness";
import { overdoseSignal } from "@/lib/lomiDrug";
import { dropNegated } from "@/lib/viMatch";

const T = 30000;
const URGENT = /gọi \*\*115\*\*/;

describe("P0 — kể đã uống quá liều / cả vỉ, cả lọ thuốc → báo cấp cứu ngay", () => {
  // Trước: "a uống quá liều rồi" → "😋 Ngon không anh?"; "a uống hết vỉ thuốc rồi" → "hả 😄 kể nghe với";
  //        "e ơi a nuốt cả lọ thuốc" → "em nghe nè"; "nguyên hộp panadol" / "20 viên thuốc ngủ" → chỉ thông tin thuốc.
  for (const s of ["a uống quá liều rồi", "a uống hết vỉ thuốc rồi", "e ơi a nuốt cả lọ thuốc", "a uống nguyên hộp panadol", "a vừa uống 20 viên thuốc ngủ", "uong qua lieu roi"])
    it(`“${s}”`, async () => {
      const m = await last([s]);
      expect(m.content).toMatch(URGENT);
      expect(m.content).not.toMatch(/😋|😄|Ngon không/);
      expect(m.drug?.kind).toBe("overdose");
    }, T);
  it("paracetamol nêu tên → thêm phần quá liều có nguồn của đúng thuốc đó (hại gan)", async () => {
    const m = await last(["a uống nguyên hộp panadol"]);
    expect(m.content).toMatch(/gan/);
  }, T);
  it("không bắt nhầm chuyện ăn uống bình thường", () => {
    for (const s of ["a uống thuốc rồi", "a uống hết ly cà phê rồi", "a uống 2 viên panadol", "a uống hết chai nước", "a ăn hết vỉ trứng", "a uống cả hộp sữa", "a uống hết gói mì"]) expect(overdoseSignal(s), s).toBe(false);
  });
});

describe("P1 — phủ định không được mở chủ đề", () => {
  it("“không hỏi về sức khỏe” không mở mạch sức khoẻ", async () => {
    const m = await last(["a đang kể chuyện buồn, không hỏi về sức khỏe"]);
    expect(m.heart).toBe("sad");
    expect(m.health).toBeUndefined();
  }, T);
  it("“không bị sốt, chỉ hơi mệt” không bị chốt thành bệnh cảm cúm", async () => {
    const m = await last(["không bị sốt, chỉ hơi mệt thôi"]);
    expect(m.health?.label).toBeUndefined();
    expect(m.content).toMatch(/mệt mỏi/);
  }, T);
  it("dropNegated chỉ cắt phần CHỐI, giữ triệu chứng “không ngủ được”", () => {
    expect(dropNegated("không bị sốt, chỉ hơi mệt thôi")).not.toMatch(/sốt/);
    expect(dropNegated("a không ngủ được")).toBe("a không ngủ được");
    expect(dropNegated("ko bi sot")).not.toMatch(/sot/);
  });
});

describe("P1 — FAQ không khớp nhầm", () => {
  it("“em có hiểu a đang nói gì không” không phải câu hỏi Báo cáo nội dung (nói ≠ nội)", async () => {
    const m = await last(["em có hiểu a đang nói gì không"]);
    expect(m.faqId).toBeUndefined();
  }, T);
  it("“có nên nhắn tin trước không” là xin ý kiến, không phải hướng dẫn mở khung chat", async () => {
    const m = await last(["vậy a có nên nhắn tin trước không"]);
    expect(m.faqId).toBeUndefined();
  }, T);
  it("“hết hạn rồi thì sao” không có ngữ cảnh → hỏi lại bằng các câu gần đúng (Membership / mã ưu đãi)", async () => {
    const m = await last(["hết hạn rồi thì sao"]);
    expect(m.quick?.join(" | ")).toMatch(/Membership/);
    expect(m.quick?.join(" | ")).toMatch(/Mã ưu đãi/);
  }, T);
  it("câu hỏi về app có chữ “gia hạn membership” vẫn trả lời bằng FAQ", async () => {
    const m = await last(["có nên gia hạn membership không"]);
    expect(m.faqId).toBe("memberexp");
  }, T);
});

describe("P1 — mạch tình cảm giữ đúng người, không khuyên ngược điều người kia xin", () => {
  const LOVE = ["a với người yêu mới cãi nhau", "cô ấy lạnh nhạt với a dạo này", "vậy a có nên nhắn tin trước không", "nhưng cô ấy bảo cần thời gian", "vậy là hết hy vọng rồi hả"];
  it("“cô ấy bảo cần thời gian” → tôn trọng khoảng lặng; “hết hy vọng rồi hả” → đáp đúng nỗi sợ, không đoán lòng người kia", async () => {
    const r = await chat(LOVE, { seed: 7 });
    expect(r[3].content).toMatch(/tôn trọng|khoảng lặng/);
    expect(r[3].content).not.toMatch(/Một tin hỏi thăm ngắn thì không phiền/);
    expect(r[4].content).not.toMatch(/chưa bắt chắc ý/);
    expect(r[4].content).toMatch(/không đoán được lòng cô ấy/);
    expect(r[4].heart).toBeTruthy();
  }, T * 2);
  it("người yêu cũ → “nếu người đó có người mới rồi thì sao” là nỗi lo, không phải câu chưa hiểu", async () => {
    const r = await chat(["a vẫn còn nhớ người yêu cũ", "nếu người đó có người mới rồi thì sao"], { seed: 7 });
    expect(r[1].content).toMatch(/nhói|nỗi sợ/);
    expect(r[1].heart).toBe("ex");
  }, T);
});

describe("P1 — đổi chủ đề / quay lại chủ đề cũ", () => {
  it("đang tâm sự mà hỏi rõ về app (“thôi, 1 ngày quẹt được mấy lần”) → trả lời câu app", async () => {
    const r = await chat(["a với người yêu mới cãi nhau", "giờ sao e", "thôi, 1 ngày quẹt được mấy lần"], { seed: 7 });
    expect(r[2].faqId).toBe("quetlimit");
  }, T);
  it("“thôi quay lại chuyện lúc nãy” → quay lại mạch tâm sự (mang theo ngữ cảnh), câu kể sau đó vẫn là tâm sự", async () => {
    const r = await chat(["dạo này a buồn lắm", "à mà uống cà phê nhiều có sao không", "thôi quay lại chuyện lúc nãy", "tại công việc áp lực quá"], { seed: 7 });
    expect(r[2].unk).toBeUndefined();
    expect(r[2].content).toMatch(/quay lại/);
    expect(r[2].heart).toBeTruthy();
    expect(r[3].heart).toBeTruthy();
  }, T * 2);
});

describe("P1 — hỏi lại / bác câu Lomi vừa trả lời", () => {
  it("“ý e là sao” → tóm ý câu vừa trả lời, giữ mạch bệnh; “e nói sai rồi” → hỏi chỗ sai; câu sau vẫn hiểu đúng bệnh", async () => {
    const r = await chat(["a bị gout nên kiêng gì", "ý e là sao", "e nói sai rồi", "vậy nên ăn gì"], { seed: 7 });
    expect(r[1].content).toMatch(/purin/);
    expect(r[1].health?.label).toBe("gout");
    expect(r[2].content).toMatch(/chỗ nào chưa đúng/);
    expect(r[3].content).toMatch(/Gout/);
  }, T * 2);
  it("“sai rồi” trơn sau một lời đoán triệu chứng vẫn là Lomi hiểu nhầm (giữ hành vi cũ)", async () => {
    const r = await chat(["a bị đau đầu", "sai rồi"], { seed: 7 });
    expect(r[1].content).toMatch(/hiểu chưa đúng/);
  }, T);
});

describe("P2 — sắc thái lời nhắc lại", () => {
  it("“chuyện đó làm a tổn thương” không đáp kèm 😄", async () => {
    const m = await last(["chuyện đó làm a tổn thương"]);
    expect(m.content).not.toMatch(/😄|😋/);
  }, T);
  it("“a làm theo rồi mà không được” → hỏi đang kẹt ở bước nào", async () => {
    const m = await last(["a làm theo rồi mà không được"]);
    expect(m.content).toMatch(/kẹt ở bước nào/);
  }, T);
  it("“a bị đau đầu” không lặp chữ “bị bị”", async () => {
    const m = await last(["a bị đau đầu"]);
    expect(m.content).not.toMatch(/bị \*\*bị/);
  }, T);
});
