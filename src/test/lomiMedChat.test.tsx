// 10/10 — Lỗi tìm ra khi Claude chạy thử hội thoại thật với kho kiến thức y khoa (ghi ở lomi_stuck_log, nguồn claude-test).
import { afterEach, describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { setStuckSink, type StuckEntry } from "@/lib/lomiStuckLog";

const T = 30000;
afterEach(() => setStuckSink(null));

describe("kho y khoa — câu hỏi thật", () => {
  it("'đậu rang' không bị hiểu là 'dâu' (trái cây) hay cả nhóm 'đậu' → nói thẳng chưa xác minh được", async () => {
    const m = await last(["gout ăn đậu rang được không"]);
    expect(m.content).toMatch(/\*\*đậu rang\*\* thì Lomi \*\*chưa xác minh được\*\*/);
    expect(m.content).not.toMatch(/\*\*(trái cây|các loại đậu)\*\* là món/);
  }, T);
  it("'xử lý' (chữ y) vẫn là hỏi cách xử trí → trả lời từ thẻ có nguồn, không từ bảng cũ", async () => {
    expect((await last(["hạ đường huyết xử lý sao"])).content).toMatch(/Với \*\*Hạ đường huyết\*\*, theo các nguồn y khoa nên/);
    expect((await last(["say rượu nặng thì xử lý sao"])).content).toMatch(/Ngộ độc rượu/);
  }, T);
  it("'hăm tã' không bị đổi thành 'không tã'", async () => {
    expect((await last(["bé bị hăm tã bôi gì"])).content).toMatch(/Hăm tã/);
  }, T);
  it("hỏi đúng khía cạnh: làm sao biết → dấu hiệu; di truyền → nguyên nhân; lây thế nào → lây", async () => {
    expect((await last(["làm sao biết mình bị trầm cảm"])).content).toMatch(/Dấu hiệu thường gặp của \*\*Trầm cảm\*\*/);
    expect((await last(["thalassemia có di truyền không"])).content).toMatch(/Nguyên nhân/);
    expect((await last(["tay chân miệng lây thế nào"])).content).toMatch(/Về chuyện lây/);
  }, T);
  it("câu hỏi có từ hỏi về một bệnh trong kho không bị nhường cho mạch triệu chứng", async () => {
    expect((await last(["nám da có hết không"])).content).toMatch(/\*\*Nám\*\*/);
    expect((await last(["kinh nguyệt không đều có sao không"])).content).toMatch(/Kinh nguyệt không đều/);
  }, T);
  it("hỏi một ý cụ thể có trong thẻ → đưa đúng ý đó; ý không có → nói thẳng chưa xác minh và ghi bí", async () => {
    expect((await last(["thuốc lá điện tử có giúp bỏ được không"])).content).toMatch(/thuốc lá điện tử/);
    const got: StuckEntry[] = [];
    setStuckSink((e) => got.push(e));
    const m = await last(["sốt xuất huyết có cần truyền nước không"]);
    expect(m.content).toMatch(/“truyền nước”.*chưa nói rõ/);
    expect(got.map((g) => g.kind)).toContain("kb_partial");
  }, T);
  it("câu nối chung chung theo chủ đề mà thẻ không có ý đó → không đọc lại bài của chủ đề cũ", async () => {
    const r = await chat(["lupus là gì", "hôm nay trời có mưa không"]);
    expect(r[r.length - 1].content).not.toMatch(/Lupus/);
  }, T);
});
