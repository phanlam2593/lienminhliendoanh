// AN TOÀN TRONG MỐI QUAN HỆ (lib/lomiSafety) — bị đánh / bị doạ / bị kiểm soát: đọc theo cấu trúc (ai làm, làm gì, với ai),
// đáp bằng lời đặt an toàn lên trước; không phán "phải chia tay", không ép tha thứ.
import { describe, expect, it } from "vitest";
import { boundaryAdvice, fearInHarm, harmOf, harmReply, helperAdvice, safetyFollow } from "@/lib/lomiSafety";
import { parseVi } from "@/lib/lomiParse";

const H = (s: string, inHarm?: ReturnType<typeof harmOf>) => harmOf(s, parseVi(s, { hour: 15 }), { addr: "em", inHarm: inHarm ?? undefined });

describe("harmOf — nhận đúng chuyện và đúng người", () => {
  it.each([
    ["chồng e đánh e", "violence", "self"],
    ["e bị chồng đánh", "violence", "self"],
    ["bạn trai e hay đánh đập e", "violence", "self"],
    ["e bị bạo hành", "violence", "self"],
    ["bạn e bị chồng đánh", "violence", "other"],
    ["mẹ e bị ba đánh", "violence", "other"],
    ["ba a hay đánh mẹ a", "violence", "other"],
    ["ảnh còn doạ đánh e", "threat", "self"],
    ["bạn trai e doạ tung ảnh của e", "threat", "self"],
    ["bạn trai e hay kiểm tra điện thoại e", "control", "self"],
    ["chồng c giữ hết tiền lương của c", "control", "self"],
    ["chồng c cấm c đi làm", "control", "self"],
  ])("%s → %s / %s", (s, kind, victim) => {
    const h = H(s);
    expect(h, s).toBeTruthy();
    expect(h!.kind).toBe(kind);
    expect(h!.victim).toBe(victim);
  });
  it("không phải chuyện bị hại → null", () => {
    for (const s of ["a mới đi đánh cầu lông về", "con a không chịu đánh răng", "tối qua a đánh bài thua", "ảnh chưa bao giờ đánh e", "trong phim nó đánh vợ ghê lắm", "mẹ e không cho e đi chơi", "a lỡ doạ đánh nó", "sếp đánh giá a thấp"]) expect(H(s), s).toBeNull();
  });
  it("câu lược chủ ngữ chỉ là kể tiếp khi đang nói dở chuyện đó", () => {
    expect(H("không cho e đi chơi với bạn")).toBeNull();
    expect(H("không cho e đi chơi với bạn", { kind: "control", victim: "self" })?.kind).toBe("control");
  });
  it("chuyện ở trường / giữa bạn bè được đánh dấu riêng; 'bị bạn trai đánh' thì không", () => {
    expect(H("con e bị bạn đánh ở trường")).toMatchObject({ victim: "other", setting: "school", whom: "con em" });
    expect(H("e bị mấy bạn đánh")?.setting).toBe("school");
    expect(H("e bị bạn trai đánh")?.setting).toBeUndefined();
    expect(H("e bị chồng đánh")?.setting).toBeUndefined();
  });
});

describe("harmReply — an toàn trước, không đổ lỗi, không ép quyết định", () => {
  it("bị đánh: không phải lỗi của người kể + 113 / 115 / Ngôi nhà Bình yên / 111 + hỏi có an toàn không", () => {
    const t = harmReply(H("chồng e đánh e")!).text;
    expect(t).toMatch(/không phải lỗi của bạn/);
    for (const n of ["113", "115", "1900 969 680", "111"]) expect(t).toContain(n);
    expect(t).toMatch(/không ép bạn phải quyết định gì ngay/);
    expect(t).toMatch(/có đang ở chỗ an toàn không\?$/);
    expect(t).not.toMatch(/phải chia tay|nên ly hôn|hãy tha thứ|😄|😆/);
  });
  it("người bị là người khác: nói về người đó", () => {
    const t = harmReply(H("mẹ e bị ba đánh")!).text;
    expect(t).toMatch(/lo cho mẹ em/);
    expect(t).toMatch(/không phải lỗi của người bị đánh/);
    expect(t).toMatch(/Người đó hiện giờ có đang ở chỗ an toàn không\?$/);
  });
  it("bị kiểm soát: lượt đầu gọi tên chuyện đó, lượt sau hỏi một câu về an toàn", () => {
    const h1 = H("bạn trai e hay kiểm tra điện thoại e")!;
    const r1 = harmReply(h1);
    expect(r1.text).toMatch(/Quan tâm khác với kiểm soát/);
    const r2 = harmReply(H("không cho e đi chơi với bạn", r1.harm)!, { inHarm: r1.harm, said: [r1.text] });
    expect(r2.text).toMatch(/nặng lời hay doạ nạt bạn không\?$/);
  });
  it("đã đưa số ở lượt trước thì không lặp lại cả danh sách", () => {
    const r1 = harmReply(H("chồng e đánh e")!);
    const r2 = harmReply(H("hôm qua ảnh lại đánh e", r1.harm)!, { inHarm: r1.harm, said: [r1.text] });
    expect(r2.text).not.toContain("1900 969 680");
    expect(r2.text).toMatch(/Mấy số Lomi gửi ở trên/);
  });
  it("ở trường: xem vết thương, báo giáo viên chủ nhiệm, 111 — không nhắc chỗ tạm lánh", () => {
    const t = harmReply(H("con e bị bạn đánh ở trường")!).text;
    expect(t).toMatch(/giáo viên chủ nhiệm/);
    expect(t).toContain("**111**");
    expect(t).toContain("**115**");
    expect(t).not.toMatch(/tạm lánh|Ngôi nhà Bình yên/);
    expect(t).toMatch(/có bị thương ở đâu không bạn\?$/);
  });
});

describe("các câu nói tiếp trong chuyện đó", () => {
  const SAFE = "… Hiện giờ bạn có đang ở chỗ an toàn không?";
  it("đáp câu hỏi an toàn", () => {
    expect(safetyFollow("không", SAFE)).toMatch(/113/);
    expect(safetyFollow("có", SAFE)).toMatch(/đỡ lo/);
    expect(safetyFollow("có", "Hôm nay bạn thế nào?")).toBeNull();
    expect(safetyFollow("hôm qua e đi chơi với bạn rồi về trễ nên ảnh giận lắm luôn", SAFE)).toBeNull();
  });
  it("đáp câu hỏi có bị thương không (chuyện ở trường)", () => {
    const Q = "… Con em có bị thương ở đâu không em?";
    expect(safetyFollow("có, bị bầm ở tay", Q)).toMatch(/đi khám sớm/);
    expect(safetyFollow("không", Q)).toMatch(/nhà trường biết/);
  });
  it("người ngoài hỏi giúp được gì", () => {
    const dom = helperAdvice("e nên làm gì để giúp", { kind: "violence", victim: "other" })!;
    expect(dom).toMatch(/Đừng tự mình đối đầu/);
    const sch = helperAdvice("e nên làm gì", { kind: "violence", victim: "other", setting: "school", whom: "con em" })!;
    expect(sch).toMatch(/giáo viên chủ nhiệm/);
    expect(sch).not.toMatch(/người bạo lực/);
    expect(helperAdvice("e nên làm gì", { kind: "violence", victim: "self" })).toBeNull();
  });
  it("bị kiểm soát mà hỏi nên nói sao → một câu mẫu về ranh giới, không ép rời đi", () => {
    const t = boundaryAdvice("nói sao cho ảnh hiểu", { kind: "control", victim: "self" }, "")!;
    expect(t).toMatch(/“[^”]+”/);
    expect(t).not.toMatch(/chia tay/);
    expect(boundaryAdvice("nói sao cho ảnh hiểu", { kind: "violence", victim: "self" }, "")).toBeNull();
  });
  it("đang kể bị đánh / doạ mà nói sợ → ở bên + giữ bằng chứng + 113", () => {
    const t = fearInHarm("e sợ lắm", { kind: "threat", victim: "self" })!;
    expect(t).toMatch(/bằng chứng/);
    expect(t).toContain("113");
    expect(fearInHarm("e sợ lắm", { kind: "control", victim: "self" })).toBeNull();
  });
});
