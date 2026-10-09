// HỎI VỀ THUỐC (lib/lomiDrug) — Lomi nhận DÁNG câu hỏi về thuốc và trả lời trong giới hạn của mình:
// không kê thuốc, không đưa liều, không đoán tương tác, không bịa công dụng cho thuốc chưa có dữ liệu.
import { describe, expect, it } from "vitest";
import { drugAsk } from "@/lib/lomiDrug";

const DOSE_NUM = /\d+\s?(mg|ml|mcg|viên|gói|ống)\b/i;

describe("drugAsk — nhận đúng loại câu hỏi", () => {
  it.each([
    ["amoxicillin là thuốc gì", "what"],
    ["thuốc omeprazol trị gì", "what"],
    ["thuốc này có tác dụng phụ gì không", "side"],
    ["ibuprofen uống chung với paracetamol được không", "interact"],
    ["thuốc huyết áp uống chung với thuốc cảm được không", "interact"],
    ["thuốc này uống với bia được không", "interact"],
    ["uống thuốc hạ sốt liều bao nhiêu", "dose"],
    ["thuốc này uống trước hay sau ăn", "dose"],
    ["quên uống thuốc 1 bữa có sao không", "stop"],
    ["a tự ngưng thuốc được không", "stop"],
    ["a uống nhầm thuốc của vợ", "overdose"],
    ["lỡ uống quá liều thuốc hạ sốt", "overdose"],
    ["đau đầu uống thuốc gì", "which"],
    ["có nên uống kháng sinh không", "should"],
    ["uống thuốc ngủ được không", "should"],
  ])("%s → %s", (q, kind) => {
    const r = drugAsk(q);
    expect(r?.kind, q).toBe(kind);
    expect(r!.text).not.toMatch(DOSE_NUM); // không bao giờ tự đưa một con số liều
  });
  it("không phải chuyện thuốc chữa bệnh → null", () => {
    for (const q of ["a muốn bỏ thuốc lá", "hút thuốc có hại không", "mua thuốc nhuộm tóc ở đâu", "hôm nay ăn gì", "a đau đầu quá", "liều bao nhiêu"]) expect(drugAsk(q), q).toBeNull();
  });
  it("câu cụt chỉ được hiểu là hỏi thuốc khi đang ở mạch sức khoẻ", () => {
    expect(drugAsk("liều bao nhiêu")).toBeNull();
    expect(drugAsk("liều bao nhiêu", { inHealth: true })?.kind).toBe("dose");
    expect(drugAsk("có hại không")).toBeNull();
    expect(drugAsk("có hại không", { afterDrug: true })?.kind).toBe("side");
    expect(drugAsk("2 viên")).toBeNull();
    expect(drugAsk("2 viên", { afterOverdose: true })?.kind).toBe("overdose");
  });
});

describe("drugAsk — nội dung lời đáp", () => {
  it("thuốc chưa có dữ liệu: nói rõ là chưa có dữ liệu + nhắc lại đúng tên người dùng hỏi", () => {
    const r = drugAsk("Colchicine là thuốc gì?")!;
    expect(r.text).toMatch(/chưa có dữ liệu đã kiểm chứng về \*\*Colchicine\*\*/);
    expect(r.text).toMatch(/dược sĩ/);
  });
  it("tên BỆNH sau chữ 'thuốc' không bị coi là tên thuốc", () => {
    const r = drugAsk("thuốc gout là gì");
    expect(r?.text ?? "").not.toMatch(/\*\*gout\*\*/);
  });
  it("tương tác: không đoán, khuyên mang tất cả thuốc ra hỏi dược sĩ; có rượu bia thì nhắc tránh", () => {
    const r = drugAsk("thuốc này uống với bia được không")!;
    expect(r.text).toMatch(/không có dữ liệu tương tác thuốc/);
    expect(r.text).toMatch(/rượu bia/);
    expect(drugAsk("ibuprofen uống chung với paracetamol được không")!.text).toMatch(/xem thành phần trên hộp/);
  });
  it("uống nhầm / quá liều là việc gấp: 115, không tự gây nôn", () => {
    const r = drugAsk("a uống nhầm thuốc của vợ")!;
    expect(r.urgent).toBe(true);
    expect(r.text).toMatch(/115/);
    expect(r.text).toMatch(/Không tự gây nôn/);
  });
  it("kháng sinh / thuốc ngủ: nhắc là thuốc cần bác sĩ kê đơn", () => {
    expect(drugAsk("có nên uống kháng sinh không")!.text).toMatch(/cần bác sĩ kê đơn/);
    expect(drugAsk("có nên uống thuốc dạ dày không")!.text).not.toMatch(/cần bác sĩ kê đơn/);
  });
  it("đang nói về người khác / thú cưng → lời khuyên hướng tới đúng đối tượng", () => {
    expect(drugAsk("uống thuốc gì cho đỡ", { inHealth: true, who: "mẹ anh", label: "đau dạ dày" })!.text).toMatch(/cho mẹ anh/);
    const pet = drugAsk("cho uống thuốc người được không", { pet: true })!;
    expect(pet.kind).toBe("pet");
    expect(pet.text).toMatch(/thú y/);
  });
  it("vừa hỏi thuốc rồi nói đang cho con bú / mang thai → hỏi bác sĩ trước khi uống", () => {
    expect(drugAsk("e đang cho con bú", { afterDrug: true })!.text).toMatch(/trước khi\*\* uống bất kỳ thuốc gì/);
    expect(drugAsk("e đang cho con bú")).toBeNull();
  });
});
