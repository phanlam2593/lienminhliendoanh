// 20/11 (Kir): "ăn / uống / dùng X nhiều (nhìu) có sao (k / s)?", hỏi nối "ăn nhiều có sao k", "X có tác dụng phụ gì" — mọi loại X.
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";
import { excessAsk } from "@/lib/lomiExcess";

const T = 150000;
type M = { content: string; routed?: string };

describe("nhận dạng câu hỏi", () => {
  it("dùng nhiều / tác dụng phụ", () => {
    for (const q of ["ăn sầu riêng nhiều có sao k", "uống cà phê nhìu có s k", "sử dụng ibuprofen nhiều có sao ko", "uống metformin lâu dài có sao không", "ăn nhiều có sao k", "nhậu nhìu có s k"]) expect(excessAsk(q), q).toBe("excess");
    for (const q of ["omeprazole có tác dụng phụ gì", "có tác hại gì k", "uống sắt có tdp không"]) expect(excessAsk(q), q).toBe("side");
  });
  it("không bắt nhầm", () => {
    for (const q of ["ăn nhiều rau có tốt không", "sầu riêng có tác dụng gì", "tối nay đi nhậu không", "uống cà phê lúc nào tốt", "mình ăn nhiều lắm"]) expect(excessAsk(q), q).toBeNull();
  });
});

describe("Lomi đưa đúng phần dùng nhiều / tác dụng phụ", () => {
  const cases: [string[], RegExp, RegExp?][] = [
    [["ăn sầu riêng nhiều có sao k"], /Sầu riêng\*\* — dùng nhiều[^]*đường bột[^]*kali/, /ăn vào có lợi gì/],
    [["uống cà phê nhìu có s k"], /Cà phê\*\* — dùng nhiều[^]*mất ngủ, hồi hộp/, /Là gì · ăn thế nào/],
    [["uống paracetamol nhiều có sao không"], /Paracetamol\*\* — dùng nhiều[^]*tổn thương gan[^]*gọi 115/],
    [["uống vitamin C nhiều có sao k"], /Vitamin C\*\* — dùng nhiều[^]*liều cao/, /Có trong rất nhiều rau quả/],
    [["ăn nghệ nhiều có sao k"], /Nghệ\*\* — dùng nhiều/, /Dân gian dùng|dùng nghệ cho khó tiêu/],
    [["omeprazole có tác dụng phụ gì"], /Omeprazole\*\* — tác dụng phụ/],
    [["uống rượu nhiều có sao ko"], /không có mức uống rượu bia nào an toàn/],
    [["uống thuốc ngủ nhiều có sao không"], /quá liều rất nguy hiểm[^]*115[^]*096 306 1414/],
    [["uống sữa nhiều có sao k"], /chưa có số liệu riêng/],
  ];
  it("câu hỏi thẳng", async () => {
    for (const [turns, re, not] of cases) {
      const a = (await last(turns)) as M;
      expect(a.content, turns.join(" | ")).toMatch(re);
      if (not) expect(a.content, turns.join(" | ")).not.toMatch(not);
    }
  }, T * 2);
  it("hỏi nối sau khi vừa nói về X", async () => {
    const follow: [string[], RegExp][] = [
      [["sầu riêng có tác dụng gì", "ăn nhiều có sao k"], /Sầu riêng\*\* — dùng nhiều/],
      [["paracetamol là thuốc gì", "uống nhiều có sao không"], /Paracetamol/],
      [["omeprazole là thuốc gì", "có tác dụng phụ gì không"], /Omeprazole\*\* — tác dụng phụ[^]*buồn nôn/],
      [["trà xanh có tác dụng gì", "có tác hại gì k"], /Trà xanh\*\* — tác dụng phụ/],
      [["lá vối có tác dụng gì", "uống nhìu có s k"], /Lá vối[^*]*\*\* — dùng nhiều[^]*Không uống khi đói/],
      [["vitamin D có tác dụng gì", "uống nhiều thì sao"], /Vitamin D\*\* — dùng nhiều[^]*canxi tích tụ/],
    ];
    for (const [turns, re] of follow) expect(((await last(turns)) as M).content, turns.join(" | ")).toMatch(re);
  }, T * 2);
  it("rủ đi nhậu vẫn là trò chuyện; thẻ bệnh không bị lọc", async () => {
    expect(((await last(["tối nay đi nhậu không"])) as M).content).not.toMatch(/Rượu bia/);
    expect(((await last(["bị tiểu đường ăn nhiều có sao"])) as M).content).not.toMatch(/dùng nhiều có sao không/);
  }, T);
});

describe("đợt 2 (20/11 trưa): rau quả, đồ ăn thừa, kem chống nắng, giờ uống thuốc, cặp món, giờ ăn", () => {
  const cases: [string, RegExp][] = [
    ["ăn nhiều rau có tốt không", /Rau và trái cây[^]*5 phần/],
    ["cơm để qua đêm ăn được không", /món cơm chỉ 1 ngày/],
    ["thịt để tủ lạnh được bao lâu", /ngăn dưới cùng/],
    ["ngồi máy tính nhiều có sao k", /màn hình nhiều/],
    ["bôi kem chống nắng mỗi ngày có sao k", /SPF từ 30/],
    ["uống thuốc xong bao lâu thì được ăn", /mỗi thuốc mỗi khác/],
    ["ăn cua với hồng được không", /kỵ nhau/],
    ["uống sữa với cam có sao không", /kỵ nhau/],
    ["uống paracetamol với cà phê được không", /Paracetamol\*\* cùng \*\*cà phê[^]*chưa có dữ liệu/],
    ["bia với rượu uống chung được không", /Rượu bia/],
    ["ăn chuối lúc nào tốt nhất", /Chuối[^*]*\*\* — dùng lúc nào tốt[^]*Chưa có bằng chứng/],
    ["uống cà phê lúc nào tốt", /Không uống sát giờ ngủ/],
  ];
  it("trả lời đúng", async () => {
    for (const [q, re] of cases) expect(((await last([q])) as M).content, q).toMatch(re);
  }, T * 2);
  it("không bắt nhầm", async () => {
    expect(((await last(["đi chơi nhớ mang kem chống nắng"])) as M).content).not.toMatch(/SPF/);
    expect(((await last(["uống sữa lúc nào tốt"])) as M).content).not.toMatch(/nhìn trong tối/);
    expect(((await last(["đi chơi với bạn được không"])) as M).content).not.toMatch(/kỵ nhau/);
    expect(((await last(["uống thuốc chống đông với rau xanh được không"])) as M).content).toMatch(/tuỳ loại thuốc chống đông/);
  }, T);
});
