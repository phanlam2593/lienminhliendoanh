// Test hành vi lời giải Tarot (03/10): giữ chi tiết câu hỏi, đọc theo vị trí,
// mạch câu chuyện giữa các lá, lá ngược mềm không bị kết luận xấu, giữ ngữ cảnh hỏi tiếp.
import { describe, expect, it } from "vitest";
import { readingText, TAROT_SPREADS, type TarotDraw, type TarotReading, type TarotSpread } from "@/lib/tarot";

const posOf = (spread: TarotSpread) => TAROT_SPREADS.find((s) => s.id === spread)!.pos;

function mk(cards: TarotDraw[], question: string, spread: TarotSpread = "sca", extra: Partial<TarotReading> = {}): TarotReading {
  return { topic: "general", spread, cards, at: Date.now(), kind: "open", question, pos: posOf(spread), ...extra };
}

// 3 Kiếm (id 52) = lá vướng thật; Người Điên (0) & Mặt Trời (19) = lá sáng; Mặt Trăng ngược (18 rev) = ngược MỀM.
const HARD = { id: 52, rev: false };
const BRIGHT1 = { id: 0, rev: false };
const BRIGHT2 = { id: 19, rev: false };
const SOFT_REV = { id: 18, rev: true };

describe("tarot narrative — giữ chi tiết câu hỏi", () => {
  it("a) câu hỏi có người/hành động/mốc thời gian thì lời giải giữ lại các chi tiết đó", () => {
    const t = readingText(mk([BRIGHT1, HARD, BRIGHT2], "Người ấy có quay lại với em trong tháng này không?"), "vi");
    expect(t.toLowerCase()).toContain("người ấy");
    expect(t).toContain("quay lại");
    expect(t).toContain("tháng này");
  });
});

describe("tarot narrative — đọc theo vị trí", () => {
  it("b) cùng một lá nhưng vị trí khác (lời khuyên vs kết quả) thì cách diễn giải khác nhau", () => {
    const cards = [BRIGHT1, HARD, BRIGHT2];
    const sca = readingText(mk(cards, "công việc sắp tới của em thế nào?", "sca"), "vi");
    const ppf = readingText(mk(cards, "công việc sắp tới của em thế nào?", "ppf"), "vi");
    const block3 = (t: string) => t.split("**🃏 3.")[1] ?? "";
    expect(block3(sca)).not.toBe(block3(ppf));
    expect(ppf).toContain("Tương lai");
    expect(sca).toContain("Lời khuyên");
  });
});

describe("tarot narrative — mạch câu chuyện giữa các lá", () => {
  it("c) trải vướng → sáng có MẠCH CÂU CHUYỆN và câu nối chuyển hướng, không chỉ nghĩa từng lá rời", () => {
    const t = readingText(mk([HARD, BRIGHT1, BRIGHT2], "chuyện tình cảm của em sắp tới ra sao?"), "vi");
    expect(t).toContain("Mạch câu chuyện");
    expect(t).toMatch(/áp lực → nhận ra → hành động|đi lên rõ rệt/);
    // lá sau chuyển hướng lá trước
    expect(t).toMatch(/mọi thứ bắt đầu chuyển|Điểm ngoặt|câu chuyện đổi hướng/);
  });
});

describe("tarot narrative — lá ngược không mặc định là xấu", () => {
  it("d) cả trải toàn lá ngược MỀM (Mặt Trăng ngược) thì kết luận không tiêu cực", () => {
    const t = readingText(mk([SOFT_REV, SOFT_REV, SOFT_REV], "em có nên nhắn tin cho người ấy không?"), "vi");
    expect(t).not.toContain("chưa phải lúc");
    expect(t).not.toContain("CHƯA NÊN");
  });
});

describe("tarot narrative — giữ ngữ cảnh hỏi tiếp", () => {
  it("e) hỏi tiếp kèm ngữ cảnh trước đó thì lời giải nhắc lại mạch chuyện cũ", () => {
    const t = readingText(
      mk([BRIGHT1, HARD, BRIGHT2], "thế còn chuyện công việc thì sao?", "sca", { context: "em vừa chia tay người yêu và đang muốn tập trung sự nghiệp" }),
      "vi",
    );
    expect(t).toMatch(/lúc nãy|nãy giờ/);
  });
});

import { drawClarifier } from "@/lib/tarot";

describe("tarot QA vòng cuối", () => {
  it("a) 3 lá ngược mềm → kết luận lưng chừng, không nghiêng CÓ/KHÔNG", () => {
    const soft = readingText(mk([SOFT_REV, SOFT_REV, SOFT_REV], "em có nên nhắn tin cho người ấy không?"), "vi");
    const bright = readingText(mk([BRIGHT1, BRIGHT2, BRIGHT1], "em có nên nhắn tin cho người ấy không?"), "vi");
    const hard = readingText(mk([HARD, HARD, HARD], "em có nên nhắn tin cho người ấy không?"), "vi");
    expect(soft).not.toBe(bright);
    // phần kết luận khác hẳn cả trải sáng lẫn trải vướng
    const tail = (t: string) => t.slice(t.indexOf("Mạch câu chuyện"));
    expect(tail(soft)).not.toBe(tail(bright));
    expect(tail(soft)).not.toBe(tail(hard));
    expect(soft).not.toContain("CHƯA NÊN");
  });
  it("b) spread 1/2/3/5/10 lá không crash", () => {
    const ids = [0, 5, 19, 52, 30, 40, 60, 70, 12, 3];
    for (const [sp, n] of [["sca", 3], ["ppf", 3], ["five", 5], ["celtic", 10], ["one", 1]] as const) {
      const p = TAROT_SPREADS.find((s) => s.id === sp);
      if (!p) continue;
      const cards = ids.slice(0, n).map((id, i) => ({ id, rev: i % 2 === 1 }));
      const t = readingText(mk(cards, "công việc tháng này thế nào?", sp as TarotSpread), "vi");
      expect(t).not.toContain("undefined");
    }
    const two = [{ id: 0, rev: false }, { id: 52, rev: true }];
    const t2 = readingText({ ...mk(two, "chọn A hay B?"), pos: posOf("sca").slice(0, 2) }, "vi");
    expect(t2).not.toContain("undefined");
  });
  it("c) lá làm rõ giữ nguyên context của trải trước", () => {
    const prev = mk([BRIGHT1, HARD, BRIGHT2], "công việc?", "sca", { context: "em vừa nghỉ việc" });
    expect(drawClarifier(prev).context).toBe("em vừa nghỉ việc");
    expect(drawClarifier(mk([BRIGHT1, HARD, BRIGHT2], "công việc?")).context).toBeUndefined();
  });
  it("d) chỉ nhắc 'lúc nãy' khi có context thật", () => {
    const t = readingText(mk([BRIGHT1, HARD, BRIGHT2], "thế còn chuyện công việc thì sao?"), "vi");
    expect(t).not.toMatch(/lúc nãy|nãy giờ/);
  });
});
