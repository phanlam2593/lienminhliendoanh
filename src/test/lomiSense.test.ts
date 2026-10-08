// Regression 04/10 — Lomi hiểu câu theo CẤU TRÚC (lib/lomiSense), không cần thêm từng câu vào thư viện.
// Các câu "thật" lấy từ nhật ký Lomi bí (lomi_unanswered) + biến thể chưa từng thấy để kiểm tra khả năng tổng quát.
import { describe, expect, it } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { isAskLike, senseCanon, senseLate, senseState } from "@/lib/lomiSense";
import { relationIntent } from "@/lib/lomiRelation";
import { contextReply } from "@/lib/lomiContext";

const q = (t: string) => expandTeen(t);

describe("câu kể về mình → ghi nhận, không báo 'chưa tiếp thu'", () => {
  const cases: [string, string][] = [
    ["A đói bụngh", "hungry"], ["a đói quá", "hungry"], ["em đói rồi", "hungry"],
    ["Anh đang uống cf", "coffee"], ["mình đang uống trà sữa", "coffee"],
    ["A đang chơi game", "gaming"], ["tui đang cày liên quân", "gaming"],
    ["A cảm thấy hết pin :(", "battery"], ["anh đuối quá", "battery"],
    ["em đang buồn ngủ", "sleepy"], ["a buồn ngủ quá", "sleepy"],
    ["mình mới ăn xong phở", "eating"], ["anh đang ăn bún bò", "eating"],
    ["hôm nay anh vui lắm", "happy"], ["a vừa trúng số", "goodnews"],
    ["a đang ở Đà Lạt", "place"], ["chiều nay a rảnh", "free"],
    ["trời lạnh quá em ơi", "weather"], ["Mưa qtqd", "weather"],
    ["Sáng đông khách lắm, chiều thì ế", "biz_state"],
  ];
  for (const [t, id] of cases) it(`${t} → ${id}`, () => expect(senseState(t)?.intent).toBe(`state:${id}`));
  it("câu kể về người khác không bị gán cho người dùng", () => {
    expect(senseState("con a đói bụng")).toBeNull();
    expect(senseState("vợ a đang chơi game")).toBeNull();
  });
  it("câu hỏi không bị coi là câu kể", () => {
    expect(senseState("uống cf có sao không?")).toBeNull();
    expect(senseState("đói bụng thì ăn gì?")).toBeNull();
  });
  it("a thích em → Lomi nói rõ là robot, không tình tứ", () => expect(senseState("a thích em")?.text).toMatch(/robot/));
});

describe("lưới cuối", () => {
  it("chào kèm lời chúc", () => {
    for (const t of ["Chào e ngày mới nha", "hello cưng buổi sáng", "chào buổi tối nha lomi"]) expect(senseLate(t)?.intent).toBe("greeting");
  });
  it("hỏi về chính Lomi / xưng hô / hiểu chưa", () => {
    expect(senseLate("E hiểu a nói gì không")?.intent).toBe("meta_understand");
    expect(senseLate("A chứ sao lại e?")?.intent).toBe("meta_addr");
    expect(senseLate("e có buồn không")?.intent).toBe("about_lomi");
  });
  it("gọi trống → dạ", () => expect(senseLate("Anh")?.intent).toBe("vocative"));
  it("câu hỏi cụt → hỏi lại một câu, không báo chưa tiếp thu", () => {
    expect(senseLate("Thiệt không?")?.intent).toBe("askback");
    expect(senseLate("Sao vui á?")?.intent).toBe("askback");
  });
  it("câu kể chưa nhận ra → lắng nghe", () => expect(senseLate("a thấy lạ lạ")?.intent).toBe("listen"));
  it("CÂU HỎI KIẾN THỨC thật sự ngoài hiểu biết → null (để hiện 'chưa tiếp thu' + nút Dạy Lomi)", () => {
    expect(senseLate("tại sao bầu trời lại có màu xanh vậy?")).toBeNull();
    expect(senseLate("thủ đô của nước Pháp là gì?")).toBeNull();
  });
});

describe("đồng nghĩa → từ khoá thư viện đã biết", () => {
  it("yêu cầu chọn quán/món", () => {
    expect(senseCanon(q("E lựa quán cho a đi"))).toBe("tìm quán ăn gần đây");
    expect(senseCanon(q("kiếm giùm a chỗ uống cà phê"))).toBe("tìm quán cà phê gần đây");
    expect(senseCanon(q("e chọn giùm a món ăn trưa nay"))).toBe("hôm nay ăn gì");
  });
  it("rút / bói một lá, hướng dẫn app, tư vấn", () => {
    expect(senseCanon(q("rút giùm a một lá bài đi"))).toBe("bói một lá cho hôm nay");
    expect(senseCanon(q("Hướng dẫn a xài app đi"))).toBe("hướng dẫn dùng app");
    expect(senseCanon(q("Tư vấn cho a tình cảm xíu nha"))).toBe("tư vấn tình cảm");
  });
  it("biến thể mất ngủ / áp lực công việc được nối từ khoá chuẩn", () => {
    expect(senseCanon(q("ngủ không được hoài à"))).toMatch(/mất ngủ/);
    expect(senseCanon(q("tui đang stress vì công việc"))).toMatch(/áp lực công việc/);
  });
  it("câu không dính biến thể thì giữ nguyên", () => expect(senseCanon(q("hôm nay trời đẹp"))).toBe(q("hôm nay trời đẹp")));
});

describe("phân biệt hỏi / kể", () => {
  for (const t of ["đói bụng thì ăn gì?", "cho a hỏi cái này", "có nên quay lại không", "tại sao lại vậy"]) it(`hỏi: ${t}`, () => expect(isAskLike(t)).toBe(true));
  for (const t of ["a đói bụng", "anh đang uống cf", "mình mới ăn xong phở", "chiều nay a rảnh"]) it(`kể: ${t}`, () => expect(isAskLike(t)).toBe(false));
});

describe("sửa lỗi nhỏ của bản 04/10", () => {
  it("'người yêu cũ' không bị gọi là 'người yêu bạn'", () => expect(relationIntent(q("người yêu cũ có còn tình cảm với mình không?"))?.subject).toBe("người yêu cũ"));
  it("nhận 'chị ấy'", () => expect(relationIntent(q("chị ấy có thích mình không?"))?.subject).toBe("chị ấy"));
  it("hỏi liều thuốc có tên thuốc ở giữa vẫn vào mục thuốc, không tự đưa liều", () => {
    const r = contextReply(q("uống paracetamol bao nhiêu viên một ngày?"));
    expect(r?.anchor.aspect).toBe("dose");
    expect(r?.text).not.toMatch(/\d+\s*(viên|mg)\b/);
  });
});
