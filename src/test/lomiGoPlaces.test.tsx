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

// 23/10 — Kir hỏi "Mũi né có gì chơi k?" → Lomi bốc "Vé Máy Bay Nắng Vàng (ở Đà Lạt)", bấm "Đổi chỗ khác" → "Tour Vạn Phúc (ở Vũng Tàu)".
describe("Địa danh: chỉ gợi ý đúng nơi người dùng hỏi", () => {
  it("nhận tên điểm du lịch / tỉnh / khu trong Đà Lạt, không bắt nhầm chữ thường", async () => {
    const { detectPlace } = await import("@/lib/lomiPlaces");
    expect(detectSearch("Mũi né có gì chơi k?")).toMatchObject({ mode: "go", place: "Mũi Né" });
    expect(detectSearch("Mũi né có gì chơi k?")?.area).toBeUndefined();
    expect(detectSearch("mui ne co gi choi")).toMatchObject({ mode: "go", place: "Mũi Né" });
    expect(detectSearch("hồ Tuyền Lâm có gì chơi")).toMatchObject({ mode: "go", area: "Đà Lạt" });
    expect(detectSearch("quán cà phê ở Mũi Né")).toMatchObject({ mode: "find", place: "Mũi Né" });
    expect(detectSearch("ở Nha Trang ăn gì ngon")).toMatchObject({ mode: "find", area: "Nha Trang" });
    expect(detectArea("Langbiang có gì")).toBe("Lạc Dương");
    for (const s of ["tôi bị lạc đường rồi", "máy đa năng tốt không", "hỏi an toàn không", "con dao này sắc không", "biến hoá khôn lường", "hai phòng ngủ", "mấy lần hả", "ăn thôi", "mang đến cho em", "suy nghĩ kỹ có nên", "cần thở oxy"])
      expect(detectPlace(s), s).toBeUndefined();
  });
  it("“Mũi né có gì chơi k?” → nói thật app chưa có chỗ ở Mũi Né + điểm nổi tiếng; “Đổi chỗ khác” không bốc chỗ tỉnh khác", async () => {
    const r = await chat(["Mũi né có gì chơi k?", "Đổi chỗ khác"], { seed: 3 });
    expect(r[0].places ?? []).toHaveLength(0);
    expect(r[0].content).toMatch(/chưa có chỗ nào ở \*\*Mũi Né\*\*/);
    expect(r[0].content).toMatch(/Bàu Trắng/);
    expect(r[1].places ?? []).toHaveLength(0);
    expect(r[1].content).toMatch(/Mũi Né/);
    for (const m of r) expect(m.content).not.toMatch(/\(ở (Đà Lạt|Vũng Tàu)\)/);
  }, T);
  it("“Đà Lạt có gì chơi” → kể điểm nổi tiếng + chỗ trong app ĐÚNG ở Đà Lạt", async () => {
    const r = await chat(["Đà Lạt có gì chơi"], { seed: 3 });
    expect(r[0].content).toMatch(/Hồ Xuân Hương/);
    for (const p of (r[0].places ?? []) as { area?: string }[]) expect(p.area).toBe("Đà Lạt");
  }, T);
  it("tìm quán theo món ở một nơi: chỉ lấy quán ở đó; nơi app chưa có → nói thật", async () => {
    const a = await chat(["quán lẩu ở Đà Lạt", "🔁 Quán khác"], { seed: 3 });
    for (const m of a) for (const p of (m.places ?? []) as { area?: string }[]) expect(p.area).toBe("Đà Lạt");
    const b = await chat(["quán lẩu ở Mũi Né"], { seed: 3 });
    expect(b[0].places ?? []).toHaveLength(0);
    expect(b[0].content).toMatch(/Mũi Né/);
  }, T);
});

// 23/10 — Kir hỏi "Đà lạt nên ở đâu" → Lomi đáp "kiến thức này em chưa được tiếp thu". Kir: "địa điểm hay dịch vụ này nọ
//   nếu người ta hỏi thì vô Lomi luôn".
describe("Hỏi chỗ ở / dịch vụ ở một nơi → tìm trong app (không đáp 'chưa biết')", () => {
  it("nhận đúng loại dịch vụ và nơi", () => {
    const cases: [string, string, string?][] = [
      ["Đà lạt nên ở đâu", "chỗ ở", "Đà Lạt"],
      ["Đi Nha Trang ở đâu thì tốt", "chỗ ở", "Nha Trang"],
      ["Đà Lạt có homestay nào đẹp không", "homestay", "Đà Lạt"],
      ["tìm phòng trọ ở Đà Lạt", "phòng trọ", "Đà Lạt"],
      ["Đà Lạt có chỗ thuê xe máy không", "chỗ thuê xe máy", "Đà Lạt"],
      ["gần đây có chỗ sửa xe không", "tiệm sửa xe"],
      ["xe a bị hư, chỗ nào sửa", "tiệm sửa xe"],
      ["tìm tiệm giặt ủi", "tiệm giặt ủi"],
      ["a cần thợ điện", "thợ điện"],
      ["cần dọn nhà", "dịch vụ vệ sinh nhà"],
      ["tìm gia sư tiếng anh cho con", "gia sư"],
      ["có luật sư nào tư vấn không", "luật sư / tư vấn pháp lý"],
      ["chỗ nào chụp ảnh cưới đẹp ở Đà Lạt", "studio chụp ảnh cưới", "Đà Lạt"],
      ["a muốn thuê mặt bằng", "mặt bằng / sang nhượng"],
      ["mua hoa tươi ở đâu", "tiệm hoa"],
      ["ở đâu bán đặc sản Đà Lạt", "cửa hàng nông sản / đặc sản", "Đà Lạt"],
    ];
    for (const [s, noun, area] of cases) {
      const it = detectSearch(s);
      expect(it?.kind?.noun, s).toBe(noun);
      expect(it?.area, s).toBe(area);
    }
    // xe ghép "đi Sài Gòn": Sài Gòn là điểm đến, không lọc nhà xe ở Sài Gòn
    expect(detectSearch("xe ghép đi Sài Gòn")).toMatchObject({ mode: "find" });
    expect(detectSearch("xe ghép đi Sài Gòn")?.area).toBeUndefined();
    // không bắt nhầm: "cần thợ" không phải Cần Thơ; câu kể dự định / việc đã làm không thành đi tìm
    expect(detectArea("a cần thợ điện")).toBeUndefined();
    expect(detectSearch("mai a dọn nhà")).toBeNull();
    expect(detectSearch("a mới đi sửa xe về")).toBeNull();
  });
  it("“Đà lạt nên ở đâu” trong hội thoại → không đáp 'chưa biết', không bấm Dạy Lomi", async () => {
    const r = await chat(["Đà lạt nên ở đâu"], { seed: 3 });
    expect(r[0].unk).toBeFalsy();
    expect(r[0].search).toMatchObject({ mode: "find", area: "Đà Lạt" });
    expect(r[0].content).not.toMatch(/chưa được tiếp thu|Dạy em|Dạy Lomi/);
  }, T);
});

describe("24/10 (kiểm trên bản thật): đang tâm sự / bài tập thở mà hỏi chỗ ở một nơi → tìm chỗ luôn", () => {
  it("sau bài tập thở → “Mũi né có gì chơi k?” không bị đáp “Ừa, em nghe nè…”", async () => {
    const r = await chat(["a hồi hộp quá", "bài tập thở", "xong", "thôi dừng nha", "Mũi né có gì chơi k?"], { seed: 3 });
    expect(r[4].content).toMatch(/Mũi Né/);
    expect(r[4].content).not.toMatch(/em nghe nè|bắt đúng ý/);
    const b = await chat(["a buồn quá", "Mũi né có gì chơi k?"], { seed: 3 });
    expect(b[1].content).toMatch(/Mũi Né/);
    const c = await chat(["a buồn quá", "quán lẩu ở Mũi Né"], { seed: 3 });
    expect(c[1].content).toMatch(/Mũi Né/);
  }, T);
});
