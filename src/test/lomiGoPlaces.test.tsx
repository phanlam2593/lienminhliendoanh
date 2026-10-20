// 20/10 — Kir hỏi "Đà lạt a nên đi chơi ở đâu" → Lomi gợi ý TIỆM GIẶT ỦI ở ĐÀ NẴNG cách 459km, rồi bấm
// "Đổi chỗ khác" thì Lomi trả lời FAQ theo dõi/bạn bè. Test lại đúng hội thoại đó.
import { describe, expect, it } from "vitest";
import { chat } from "@/test/lomiChatHarness";
import { detectArea, detectSearch } from "@/lib/lomiSearch";

const T = 30000;

describe("Lomi gợi ý chỗ đi chơi", () => {
  it("nhận khu vực người dùng nêu", () => {
    expect(detectArea("Đà lạt a nên đi chơi ở đâu")).toBe("Đà Lạt");
    expect(detectArea("da lat co gi choi")).toBe("Đà Lạt");
    expect(detectArea("quán cà phê ở sài gòn")).toBe("TP.HCM");
    expect(detectArea("hoa huệ đẹp quá")).toBeUndefined();
    expect(detectSearch("Đà lạt a nên đi chơi ở đâu")).toMatchObject({ mode: "go", area: "Đà Lạt" });
    expect(detectSearch("Đà Lạt có gì chơi")).toMatchObject({ mode: "go", area: "Đà Lạt" });
    expect(detectSearch("tìm quán cà phê ở Đà Lạt")).toMatchObject({ mode: "find", area: "Đà Lạt" });
    expect(detectSearch("mai a đi Đà Nẵng chơi")).toBeNull();
  });

  it("“Đà lạt nên đi chơi ở đâu” → chỗ ở Đà Lạt; “Đổi chỗ khác” → bốc chỗ KHÁC, không rơi xuống FAQ", async () => {
    const r = await chat(["Đà lạt a nên đi chơi ở đâu", "Đổi chỗ khác", "Đổi chỗ khác"], { seed: 3 });
    expect(r[0].search).toMatchObject({ mode: "go", area: "Đà Lạt" });
    expect(r[0].places?.length).toBe(1);
    for (const m of r.slice(1)) {
      expect(m.faqId).toBeUndefined();
      expect(m.search).toMatchObject({ mode: "go", area: "Đà Lạt" });
      expect(m.places?.length).toBe(1);
      expect(m.content).not.toMatch(/theo dõi/);
    }
    const ids = r.map((m) => m.places![0].id);
    expect(new Set(ids).size).toBe(3); // 3 lần → 3 chỗ khác nhau
  }, T);
});

describe("Lomi tìm loại chỗ mới ngay sau một lần gợi ý", () => {
  it("“Đà lạt đi chơi ở đâu” → chip “Tìm quán cà phê có ưu đãi” → tìm QUÁN CÀ PHÊ, không lấy lại lần tìm trước", async () => {
    const r = await chat(["Đà lạt a nên đi chơi ở đâu", "Tìm quán cà phê có ưu đãi"], { seed: 1 });
    const m = r[1];
    expect(m.content).not.toMatch(/Mấy chỗ/);
    if (m.search) expect(m.search.kind?.noun).toBe("quán cà phê");
    else expect(m.dish).toBe("cafe");
  }, T);
  it("“có ưu đãi không?” không nêu loại mới → vẫn lọc lại lần tìm trước", async () => {
    const r = await chat(["tìm quán cà phê", "có ưu đãi không?"], { seed: 1 });
    expect(r[1].search?.kind?.noun ?? r[1].dish).toBeTruthy();
  }, T);
});
