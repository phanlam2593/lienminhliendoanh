// 19/10 — Kir: hỏi về MỘT BỆNH thì Lomi trả lời đủ phần trong một lần: là gì · triệu chứng · kiêng · mẹo chăm sóc · thuốc ·
// khi nào đi khám · khi nào cần xử trí khẩn. Mọi ý lấy từ thẻ có nguồn; thuốc không kê đơn / không nêu liều. Chạy qua khung chat (giả lập).
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";

const T = 60000;
const SECTIONS = [/📖 \*\*Gout\*\* là gì:/, /🩺 \*\*Triệu chứng thường gặp:\*\*/, /🚫 \*\*Kiêng \/ nên tránh:\*\*/, /🌿 \*\*Mẹo chăm sóc:\*\*/, /💊 \*\*Về thuốc\*\*/, /🧑‍⚕️ \*\*Khi nào nên đi khám:\*\*/, /🚨 \*\*Cần xử trí khẩn khi:\*\*/];

describe("hỏi về một bệnh → trả lời đủ phần", () => {
  it.each([["gout là bệnh gì"], ["bệnh gout"], ["Gout là gì?"]])("%s → đủ 7 phần, đúng thứ tự", async (q) => {
    const m = await last([q]);
    expect(m.med?.id).toBe("gout");
    let at = -1;
    for (const re of SECTIONS) {
      const i = m.content.search(re);
      expect(i, String(re)).toBeGreaterThan(at);
      at = i;
    }
    expect(m.content).toMatch(/Món nên tránh \/ hạn chế: nội tạng/);
  }, T);

  it("phần thuốc: chỉ ý có nguồn, nói rõ không kê đơn / không nêu liều; 'bỏ thuốc lá' không bị xếp vào thuốc", async () => {
    const m = await last(["gout là bệnh gì"]);
    const meds = m.content.split("💊")[1].split("\n\n")[0];
    expect(meds).toMatch(/Lomi không kê đơn, không nêu liều/);
    expect(meds).toMatch(/thuốc hạ axit uric/);
    expect(meds).not.toMatch(/thuốc lá/);
    expect(m.content).not.toMatch(/\d+\s*mg\b/);
  }, T);

  it("nguồn không hiện trong lời đáp nhưng được cất lại (hỏi 'nguồn đâu' mới đưa)", async () => {
    const m = await last(["gout là bệnh gì"]);
    expect(m.content).not.toMatch(/📚/);
    expect(m.src).toMatch(/📚 Nguồn/);
  }, T);

  it("sốt xuất huyết: mục Kiêng không lấy ý phòng muỗi; phần thuốc có 'tránh ibuprofen, aspirin'", async () => {
    const m = await last(["sốt xuất huyết là gì"]);
    expect(m.content).not.toMatch(/🚫[^\n]*\n[^\n]*muỗi/);
    expect(m.content.split("💊")[1]).toMatch(/Tránh\*\* thuốc chống viêm giảm đau như ibuprofen và aspirin/);
    expect(m.content).toMatch(/🚨 \*\*Cần xử trí khẩn khi:\*\*[\s\S]*chảy máu chân răng/);
  }, T);

  it("trầm cảm: không đưa đường dây của Mỹ; có đường dây Ngày Mai và 115", async () => {
    const m = await last(["trầm cảm là gì"]);
    expect(m.content).not.toMatch(/988|ở Mỹ/);
    expect(m.content).toMatch(/Ngày Mai \*\*096 306 1414\*\*/);
    expect(m.content).toMatch(/115/);
  }, T);

  it("thuật ngữ (thiền) → vẫn chỉ giải thích, không có mục thuốc / kiêng", async () => {
    const m = await last(["thiền là gì"]);
    expect(m.content).not.toMatch(/💊|🚫 \*\*Kiêng/);
    expect(m.content).toMatch(/📖 \*\*Thiền\*\* là gì/);
  }, T);

  it("hỏi đúng một phần vẫn trả lời gọn phần đó (không đổ cả bài)", async () => {
    expect((await last(["gout kiêng gì"])).content).not.toMatch(/🩺 \*\*Triệu chứng thường gặp/);
    expect((await last(["triệu chứng của gout"])).content).not.toMatch(/💊 \*\*Về thuốc/);
  }, T);

  it("hỏi 'là gì' sau bài tóm tắt vẫn trả lời (không rút thành 'vẫn là X nè')", async () => {
    const r = await chat(["bệnh tiểu đường", "tiểu đường là gì"]);
    expect(r[1].content).toMatch(/📖 \*\*Tiểu đường\*\* là gì/);
  }, T);
});
