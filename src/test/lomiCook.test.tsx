// 19/11 — gợi ý món nấu ở nhà (lib/lomiCook; Kir duyệt bỏ "không nấu ăn" ở luật #71).
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";
import { cookReply, isCookAsk } from "@/lib/lomiCook";

const T = 120000;
type M = { content: string; routed?: string; med?: unknown; health?: unknown };

describe("thư viện món (lomiCook)", () => {
  it("chọn món theo nguyên liệu đang có, món thiếu nguyên liệu chính xếp sau", () => {
    expect(cookReply("tủ còn trứng vs cà chua, làm món j nhanh cho bữa tối z")).toMatch(/Trứng xào cà chua/);
    expect(cookReply("cả nhà còn mỗi trứng, nấu gì giờ")).toMatch(/^Với trứng[^]*1\. Trứng hấp/);
    expect(cookReply("Nhà có đậu phụ với nấm, tối nấu món gì nhanh gọn?")).toMatch(/Đậu phụ xào nấm/);
  });
  it("tôn trọng điều kiện: chay, không chiên / món hấp, chán món nước, mang đi", () => {
    const chay = cookReply("cho mình món chay có nấm dễ làm, đừng cho thịt nhé")!;
    expect(chay).toMatch(/món chay/);
    expect(chay).not.toMatch(/Thịt|Gà|Cá /);
    expect(cookReply("Thôi khỏi món chiên, có món hấp nào dễ làm cho bữa tối ko?")).not.toMatch(/\*\*\d\. [^*]*(chiên|Chiên)/);
    expect(cookReply("ở nhà có mì, nấm và cà rốt nhưng đã chán món nước, chỉ giúp một món ăn")).not.toMatch(/\*\*\d\. Canh/);
    expect(cookReply("muốn chuẩn bị đồ ăn mang theo đi công viên, gợi ý món dễ chia phần")).toMatch(/mang theo/);
  });
  it("nhận đúng nguyên liệu: bánh mì ≠ mì, 'chuẩn bị đồ ăn' ≠ bí đỏ, 'bất ngờ' ≠ bắp, 'cả nhà' ≠ cá", () => {
    expect(cookReply("chuẩn bị đồ ăn mang theo, đang nghĩ bánh mì với trái cây, gợi ý món dễ chia phần")).not.toMatch(/bí đỏ|Mì xào/);
    expect(cookReply("Mình có cơm nguội, ít hành và đậu Hà Lan, bạn ghé chơi bất ngờ nên muốn làm món đãi nhanh, nên chế biến sao?")).not.toMatch(/bắp/);
    expect(cookReply("cả nhà còn mỗi trứng, nấu gì giờ")).not.toMatch(/Với [^\n]*cá/);
  });
  it("hỏi cách nấu một món: có trong thư viện → cách làm; ngoài thư viện → không lấy món khác thế vào", () => {
    expect(cookReply("canh chua cá nấu sao")).toMatch(/^🍳 \*\*Canh chua cá\*\*/);
    expect(cookReply("cách làm trứng chưng")).toMatch(/Trứng hấp/);
    expect(cookReply("nấu bún bò Huế thế nào")).toBeNull();
  });
  it("không nhận nhầm câu thường là hỏi nấu ăn", () => {
    for (const q of ["sao khó quá vậy", "làm sao để hết buồn", "tìm quán cơm gần chợ", "app lỗi làm sao"]) expect(isCookAsk(q), q).toBe(false);
  });
});

describe("Lomi trả lời nấu ăn trong hội thoại", () => {
  it("câu nối: nguyên liệu kể ở lượt trước", async () => {
    const a = (await last(["Tủ lạnh còn đậu hũ và nấm.", "Nấu cái đó kiểu gì cho bữa tối nhanh gọn?"])) as M;
    expect(a.content).toMatch(/Đậu phụ xào nấm/);
    const b = (await last(["Nay mình muốn nấu bữa tối đơn giản cho hai người", "trong tủ chỉ còn trứng với cà chua"])) as M;
    expect(b.content).toMatch(/Trứng xào cà chua/);
  }, T);
  it("trời mưa ngại ra ngoài + nguyên liệu → gợi ý món, không phải tâm sự chuyện mắc mưa", async () => {
    const a = (await last(["Vì trời mưa từ chiều nên mình ngại ra ngoài, ở nhà có mì, nấm và cà rốt nhưng đã chán món nước, bạn chỉ giúp một món ăn nhé"])) as M;
    expect(a.routed).toBe("cook");
    expect(a.content).toMatch(/Mì xào rau củ/);
  }, T);
  it("câu có bệnh / thai → lớp sức khoẻ, không gợi ý món", async () => {
    for (const q of ["bà bầu nên nấu món gì cho bữa tối", "mình bị tiểu đường nên nấu món gì buổi tối"]) {
      const a = (await last([q])) as M;
      expect(a.routed, q).not.toBe("cook");
      expect(a.med ?? a.health, q).toBeTruthy();
    }
  }, T);
  it("tìm quán vẫn là tìm quán", async () => {
    const a = (await last(["tìm quán cơm gần chợ Đà Lạt"])) as M;
    expect(a.routed).not.toBe("cook");
  }, T);
});
