// 15/10 — audit tư vấn sức khoẻ: nhận diện TÌNH HUỐNG KHẨN CẤP (lib/lomiUrgent) — câu kể đúng là cấp cứu thì nhận,
// câu hỏi kiến thức / chuyện đọc trên báo / cách nói thường ngày thì KHÔNG (để không cảnh báo quá mức).
import { describe, expect, it } from "vitest";
import { urgentOf } from "@/lib/lomiUrgent";
import { drugAsk } from "@/lib/lomiDrug";
import { crisisReply } from "@/lib/lomiChat";
import { beginViTurn } from "@/lib/viMatch";

describe("urgentOf", () => {
  it.each([
    ["con a uống nhầm thuốc tẩy", "poison"],
    ["uống thuốc chuột", "poison"],
    ["bé nuốt phải pin cúc", "swallow"],
    ["con nuốt phải đồng xu", "swallow"],
    ["bé bị hóc xương", "choke"],
    ["con a bị đuối nước", "drown"],
    ["đứt tay chảy máu nhiều quá", "bleed"],
    ["tai nạn xe chảy máu đầu", "bleed"],
    ["bé bị bỏng nước sôi", "burn"],
    ["ăn tôm xong sưng môi khó thở", "anaphylaxis"],
    ["nổi mề đay khắp người khó thở", "anaphylaxis"],
    ["tự nhiên bị sưng lưỡi", "anaphylaxis"],
    ["bà bầu bị ra máu", "preg"],
    ["đang mang thai 7 tháng bị đau bụng ra máu", "preg"],
    ["bầu 8 tháng thấy thai máy ít", "preg"],
    ["mang thai bị phù chân đau đầu nhìn mờ", "preeclampsia"],
    ["ông bị tiểu đường mà chóng mặt vã mồ hôi", "hypo"],
  ])("“%s” → %s", (t, id) => expect(urgentOf(t)?.id).toBe(id));

  it.each([
    "bầu cử là gì",
    "bầu trời hôm nay đẹp quá",
    "bà bầu ăn sushi được không",
    "mang thai mấy tuần thì siêu âm được",
    "đuối nước là gì",
    "cách phòng tránh đuối nước cho trẻ",
    "a đọc tin chết đuối trên báo buồn quá",
    "bỏng có để lại sẹo không",
    "bị bỏng nắng",
    "chảy máu cam nhiều quá",
    "đến tháng chảy máu nhiều",
    "ăn tôm xong bị nổi mẩn",
    "bị ong đốt sưng mặt",
    "nghẹn ngào quá",
    "tiểu đường kiêng gì",
    "a bị đau đầu",
  ])("không khẩn: “%s”", (t) => {
    beginViTurn([t], true); // câu gõ có dấu: "bỏng nắng" ≠ "bỏng nặng" (như trong app)
    expect(urgentOf(t)).toBeNull();
    beginViTurn([], false);
  });
});

describe("khủng hoảng: hỏi liều / cách gây chết", () => {
  it.each(["thuốc ngủ uống bao nhiêu thì chết", "uống bao nhiêu viên thì chết", "a muốn uống thuốc chuột", "cách để chết không đau"])("“%s” → hỗ trợ khủng hoảng", (t) =>
    expect(crisisReply(t, "vi")?.text).toMatch(/096 306 1414/),
  );
  it.each(["điện thoại a chết nhanh quá", "uống bao nhiêu nước mỗi ngày", "chết cười với nó"])("không phải khủng hoảng: “%s”", (t) => expect(crisisReply(t, "vi")).toBeNull());
});

describe("thuốc", () => {
  it("tên thuốc ngoại lai + hỏi liều → không đưa liều (trước đây trả lời FAQ lượt quẹt)", () => {
    const r = drugAsk("amoxicillin uống mấy lần 1 ngày");
    expect(r?.kind).toBe("dose");
    expect(r?.text).not.toMatch(/\d+ ?(mg|viên|lần)/);
  });
  it("đồ uống đứng đầu câu không bị coi là thuốc", () => expect(drugAsk("coca uống bao nhiêu thì béo")?.kind).not.toBe("dose"));
  it("đang uống thuốc X mà hỏi uống thêm Y → hỏi dùng chung", () => expect(drugAsk("đang uống thuốc tim có uống panadol được không")?.kind).toBe("interact"));
  it("mang thai / cho con bú + hỏi thuốc → nhắc hỏi bác sĩ trước, có cờ preg", () => {
    for (const t of ["bà bầu uống paracetamol được không", "cho con bú uống thuốc cảm được không"]) {
      const r = drugAsk(t);
      expect(r?.preg).toBe(true);
      expect(r?.text).toMatch(/hỏi bác sĩ \/ dược sĩ \*\*trước khi\*\*/);
    }
  });
});
