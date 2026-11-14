// 14/11 (Fable phiên 2) — các lỗi Lomi còn dở sửa ở đợt này:
//   • vừa trải bài mà chê "toàn lá căng thẳng / nặng nề" → vẫn là chuyện lá bài, không đọc thẻ bệnh "Căng thẳng";
//   • đang uống thuốc chống đông (gọi theo nhóm) + hỏi rau xanh → nói đúng điều nguồn warfarin ghi, không đáp chung chung;
//   • đang mang thai hỏi một món nguồn thai kỳ không nhắc → kèm kiến thức phổ thông của món (ghi rõ là phổ thông).
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";
import { drugAsk } from "@/lib/lomiDrug";
import { knNote } from "@/lib/lomiFolk";

const T = 120000;

describe("Tarot — chê trải bài vừa rút", () => {
  it("'rút toàn lá căng thẳng' sau khi trải bài → nói về lá bài, không ra thẻ bệnh", async () => {
    const a = await last(["bói tarot cho mình về tình yêu", "rút toàn lá căng thẳng thế này thì có sao không"]);
    expect(a.content).toMatch(/tarot|lá/i);
    expect(a.content).not.toMatch(/Căng thẳng\*\* là gì|đã kiểm chứng/);
    expect(a.med).toBeUndefined();
  }, T);
  it("'mấy lá này nặng nề quá' → cũng vậy", async () => {
    const a = await last(["bói tarot cho mình về công việc", "sao mấy lá này nặng nề quá vậy"]);
    expect(a.content).toMatch(/không có lá \*\*tốt\*\* hay \*\*xấu\*\*/);
  }, T);
  it("không có trải bài nào thì 'mình căng thẳng quá' vẫn là chuyện của người dùng", async () => {
    const a = await last(["dạo này mình căng thẳng quá"]);
    expect(a.content).not.toMatch(/Trong tarot/);
  }, T);
});

describe("Thuốc chống đông + rau xanh", () => {
  it("gọi theo nhóm → nêu điều nguồn warfarin ghi và nói rõ thuốc khác chưa có nguồn", () => {
    const r = drugAsk("mình đang uống thuốc chống đông thì có ăn rau xanh được không");
    expect(r?.kind).toBe("interact");
    expect(r?.text).toMatch(/warfarin/);
    expect(r?.text).toMatch(/vitamin K/);
    expect(r?.text).toMatch(/chưa có nguồn/);
  });
  it("trong khung chat: không còn câu 'chưa có thông tin riêng về thuốc này'", async () => {
    const a = await last(["mình đang uống thuốc chống đông thì có ăn rau xanh được không"]);
    expect(a.content).toMatch(/tuỳ loại thuốc chống đông/);
    expect(a.content).not.toMatch(/chưa có thông tin riêng về thuốc này/);
  }, T);
  it("không hỏi về món nguồn có ghi (vd cơm trắng) → không bịa tương tác", () => {
    const r = drugAsk("đang uống thuốc chống đông ăn cơm trắng được không");
    expect(r?.text ?? "").not.toMatch(/tuỳ loại thuốc chống đông/);
  });
  it("chống đông + ibuprofen vẫn ra câu cũ (NSAID)", () => {
    expect(drugAsk("đang uống xarelto uống thêm ibuprofen được không")?.text).toMatch(/NSAID/);
  });
});

describe("Mang thai + món nguồn không nhắc", () => {
  it("knNote: món có mục phổ thông → kèm phần lưu ý của món", () => {
    const k = knNote("bà bầu ăn trứng muối được không", "an-uong-khi-mang-thai");
    expect(k).toMatch(/kiến thức dinh dưỡng phổ thông/);
    expect(k).toMatch(/Trứng muối/);
  });
  it("knNote: bệnh khác vẫn chỉ lấy ý nhắc đúng bệnh đó", () => {
    const k = knNote("tiểu đường ăn chè được không", "tieu-duong");
    expect(k).toMatch(/Tiểu đường/);
    expect(k).not.toMatch(/ôi thiu/);
  });
  it("trong khung chat: vẫn nói rõ nguồn không nhắc món, rồi mới kèm kiến thức phổ thông", async () => {
    const a = (await last(["bà bầu ăn trứng muối được không"])).content;
    expect(a).toMatch(/không có trong danh sách món cần tránh khi mang thai/);
    expect(a).toMatch(/kiến thức dinh dưỡng phổ thông/);
  }, T);
});
