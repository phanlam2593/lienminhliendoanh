// Regression 04/10 — tư vấn sức khoẻ / tâm lý / tình cảm: bám câu hỏi, không chẩn đoán, biết hỏi lại.
import { describe, expect, it } from "vitest";
import { expandTeen, crisisReply } from "@/lib/lomiChat";
import { gate } from "@/lib/lomiUnderstand";
import { healthFact } from "@/lib/lomiHealthFacts";
import { analyzeBody } from "@/lib/lomiSymptoms";
import { heartStart, heartContinue } from "@/lib/lomiHeart";
import { relationIntent, relationReply } from "@/lib/lomiRelation";
import { detectTarot } from "@/lib/tarot";

const q = (t: string) => expandTeen(t);

describe("sức khoẻ", () => {
  it("cf? không vào health", () => {
    expect(gate(q("cf?"), {})).toMatchObject({ action: "skip" });
    expect(healthFact(q("cf?"))).toBeNull();
  });
  for (const t of ["trà sữa?", "uống cf đi không?", "quán cf nào ngon?"]) it(`${t} không ra bài sức khoẻ`, () => expect(healthFact(q(t))).toBeNull());
  it("uống nhiều cà phê có sao không? → health", () => expect(healthFact(q("uống nhiều cà phê có sao không?"))).toMatch(/Cà phê/));
  it("câu kiến thức không bị gán là người hỏi đang bệnh", () => {
    const k = analyzeBody(q("đau đầu là do đâu?"))!.text;
    expect(k).toMatch(/nói chung/);
    expect(k).not.toMatch(/bạn đang có/);
  });
  it("kể 1 triệu chứng thiếu dữ kiện → hỏi thêm, chưa nêu bệnh", () => {
    const t = analyzeBody(q("mình bị đau đầu"))!.text;
    expect(t).toMatch(/bao lâu/);
    expect(t).not.toMatch(/hay gặp ở/);
  });
  it("có thời gian rồi thì mới gợi ý khả năng", () => expect(analyzeBody(q("mình bị đau đầu 3 ngày rồi"))!.text).toMatch(/hay gặp ở/));
  it("hỏi thuốc/tác dụng phụ → không kê thuốc, nhắc dược sĩ", () => {
    const t = healthFact(q("paracetamol có tác dụng phụ gì?"))!;
    expect(t).toMatch(/không kê thuốc/);
    expect(t).toMatch(/dược sĩ/);
  });
  it("dấu hiệu nguy hiểm vẫn khuyên 115", () => expect(analyzeBody(q("mình bị đau ngực khó thở"))!.text).toMatch(/115/));
});

describe("tâm lý", () => {
  it("crisis vẫn được nhận diện (ưu tiên trước mọi luồng ở AiAssistant)", () => expect(crisisReply(q("mình muốn chết"), "vi")).toBeTruthy());
  it("buồn vì chia tay → tâm sự, không chẩn đoán", () => {
    const h = heartStart(q("mình buồn vì chia tay"), false)!;
    expect(h.theme).toBe("breakup");
    expect(h.text).not.toMatch(/trầm cảm|rối loạn/);
    expect(h.text).not.toMatch(/Ôm bạn|Lomi thương bạn/);
  });
});

describe("tình cảm — bám câu hỏi", () => {
  it("còn tình cảm không? giữ đúng câu hỏi, không thành 'có thành không'", () => {
    const r = relationReply(q("người ấy có còn tình cảm với mình không?"))!;
    expect(relationIntent(q("người ấy có còn tình cảm với mình không?"))?.intent).toBe("mind_read");
    expect(r.text).toMatch(/người ấy còn tình cảm/);
    expect(r.text).toMatch(/chỉ người ấy mới biết chắc/);
    expect(r.text).not.toMatch(/có thành|thành đôi|đến với nhau/);
  });
  it("giữ chủ thể 'anh ấy', không đổi thành 'bạn'", () => expect(relationReply(q("anh ấy nghĩ gì về mình?"))!.text).toMatch(/anh ấy đang nghĩ gì về bạn/));
  it("người ấy im lặng, nên làm gì? → lời khuyên", () => {
    const r = relationReply(q("người ấy im lặng, mình nên làm gì?"))!;
    expect(relationIntent(q("người ấy im lặng, mình nên làm gì?"))?.intent).toBe("silence_advice");
    expect(r.text).toMatch(/cân nhắc/);
  });
  it("em nghĩ anh nên làm gì? trong mạch tình cảm → lời khuyên", () => {
    const r = heartContinue(q("em nghĩ anh nên làm gì?"), "cold", false, 2, "Người ấy im lặng lâu chưa?");
    expect(r.text).toMatch(/gợi ý/);
  });
  it("không tự chuyển tình cảm sang Tarot", () => {
    for (const t of ["người ấy có còn tình cảm với mình không?", "người ấy im lặng, mình nên làm gì?", "mình buồn vì chia tay"]) expect(detectTarot(q(t))).toBeNull();
  });
  it("muốn bói thì vẫn là Tarot (relation không ăn mất)", () => expect(detectTarot(q("bói tarot xem người ấy còn tình cảm không"))).toBeTruthy());
  it("Heart thường vẫn hoạt động", () => {
    expect(heartStart(q("cãi nhau với người yêu mệt quá"), false)?.theme).toBeTruthy();
    expect(relationReply(q("hôm nay trời đẹp"))).toBeNull();
  });
});
