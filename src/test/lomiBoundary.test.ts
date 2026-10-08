// Ranh giới ý định của Lomi (08/10) — bộ test NHỎ, mỗi nhóm chặn một kiểu hiểu nhầm đã gặp thật:
//   P0  chỉ ghi "Lomi bí" + nút 💡 khi thật sự bí (senseState → senseLate → mới tới unknown)
//   P1  "lắng nghe" chỉ dành cho lời kể nhận ra được · chọn món không phụ thuộc pizza
//       ý định chung không cướp mạch đang nói · hỏi khả năng ≠ hỏi chuyện thật
//   P2  đổi cách nói về từ khoá chuẩn không được đổi luôn ý người dùng
// Các nhánh trong AiAssistant.send() cần state React nên test bằng CHÍNH hàm thư viện mà nhánh đó gọi
// (earlyIntent, senseLast, senseCanon…) — sửa luật ở đâu thì test ở đó.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: () => Promise.resolve({ data: null, error: null }), from: () => ({}) } }));

import { chitChat, expandTeen } from "@/lib/lomiChat";
import { capabilityAsk, earlyIntent, foodChoice } from "@/lib/lomiIntent";
import { isAskLike, senseCanon, senseLast, senseLate, senseState } from "@/lib/lomiSense";
import { healthFact } from "@/lib/lomiHealthFacts";
import { analyzeBody } from "@/lib/lomiSymptoms";
import { heartStart } from "@/lib/lomiHeart";
import { detectDish } from "@/lib/lomiSearch";
import { gate, understand } from "@/lib/lomiUnderstand";

/** Đúng như AiAssistant.send(): teen code → từ đầy đủ → cách nói khác về từ khoá chuẩn. */
const q = (t: string) => senseCanon(expandTeen(t));
const early = (t: string, flow: Parameters<typeof earlyIntent>[1] = {}) => earlyIntent(q(t), flow);

describe("P0 — chỉ 'bí' khi thật sự bí", () => {
  // Lomi đáp được → KHÔNG ghi vào "Lomi bí", KHÔNG hiện nút 💡 Dạy Lomi.
  for (const t of ["Chào e ngày mới nha", "Anh", "E hiểu a nói gì không", "A đói bụngh", "A cảm thấy hết pin :(", "a thấy lạ lạ", "thôi kệ đi", "Chà chà", "Thiệt không?"])
    it(`đáp được: ${t}`, () => expect(senseLast(t)).not.toBeNull());
  // Thật sự bí → null → AiAssistant mới logUnanswered(raw, q) + unk.
  for (const t of ["bitcoin hôm nay lên 100k", "máy lạnh inverter tiết kiệm điện hơn", "thủ đô của nước Pháp là gì?", "máy này bao nhiêu", "Giới hạn 5km thôi", "việt nam vô địch rồi"])
    it(`bí thật: ${t}`, () => expect(senseLast(t)).toBeNull());
  it("mẩu câu rất ngắn / chỉ tên chủ đề / teen code → hỏi lại hoặc mời nói rõ, chưa đủ ý để 'bí'", () => {
    expect(senseLast("asdf qwer zxcv")?.intent).toBe("clarify");
    expect(senseLast("tháng này")?.intent).toBe("clarify");
    expect(senseLast("sức khoẻ")?.intent).toBe("topic");
    expect(senseLast("đc k")?.intent).toBe("askback");
    expect(senseLast("mn ơi")?.intent).toBe("vocative");
  });
  it("câu về app đã có gợi ý câu hỏi → không dùng lưới 'lắng nghe', để gợi ý + ghi 'Lomi bí'", () => {
    expect(senseLast("a thấy lạ lạ", { hasSuggest: true })).toBeNull();
    expect(senseLast("A đói bụngh", { hasSuggest: true })?.intent).toBe("state:hungry"); // câu kể về mình vẫn đáp
  });
  it("AiAssistant ghi 'Lomi bí' đúng MỘT chỗ và sau senseLast", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/pages/AiAssistant.tsx", "utf8");
    expect(src.match(/logUnanswered\(/g)).toHaveLength(1);
    expect(src.indexOf("senseLast(raw")).toBeGreaterThan(0);
    expect(src.indexOf("senseLast(raw")).toBeLessThan(src.indexOf("logUnanswered("));
    expect(src).toMatch(/logUnanswered\(raw, q\)/); // mẫu lưu cho admin là câu NGUYÊN VĂN
  });
});

describe("P1 — 'lắng nghe' chỉ cho lời kể nhận ra được", () => {
  for (const t of ["a thấy lạ lạ", "hôm qua anh đi câu cá với mấy đứa bạn", "con mèo nhà em mới đẻ", "mẹ em mới mua xe", "chị ấy im quá", "tui kể cái này nghe nè"])
    it(`kể chuyện → listen: ${t}`, () => expect(senseLate(t)?.intent).toBe("listen"));
  for (const t of ["bitcoin hôm nay lên 100k", "iphone 17 ra mắt rồi đó", "việt nam vô địch rồi", "asdf qwer zxcv"])
    it(`không nhận ra → không giả vờ nghe: ${t}`, () => expect(senseLate(t)?.intent).not.toBe("listen"));
  it("lời cho qua / cảm thán có câu đáp riêng, không hỏi dồn 'kể thêm đi'", () => {
    expect(senseLate("vậy thôi")?.intent).toBe("closer");
    expect(senseLate("buồn cười ghê")?.intent).toBe("reaction");
  });
  it("từ để hỏi cuối câu là câu HỎI; có phủ định phía trước là câu KỂ", () => {
    for (const t of ["máy này bao nhiêu", "giờ ăn gì", "quán này ở đâu"]) expect(isAskLike(t)).toBe(true);
    for (const t of ["a chưa ăn gì", "mình không sao đâu", "cuối tuần không biết làm gì"]) expect(isAskLike(t)).toBe(false);
  });
  it("trạng thái phải mở đầu câu — đồ vật 'lạnh', 'hết pin' không phải kể về mình", () => {
    expect(senseState("máy lạnh inverter tiết kiệm điện hơn")).toBeNull();
    expect(senseState("điện thoại hết pin")).toBeNull();
    expect(senseState("hết pin rồi")?.intent).toBe("state:battery");
    expect(senseState("hôm nay ở Đà Lạt lạnh quá")?.intent).toBe("state:weather");
  });
  it("'buồn cười' không phải buồn", () => expect(heartStart(q("buồn cười ghê"), false)).toBeNull());
});

describe("P1 — chọn món (không phụ thuộc pizza)", () => {
  for (const t of ["nay ăn gì ta", "giờ ăn gì", "chọn món giúp a", "a đói mà không biết ăn gì", "không biết ăn gì luôn", "tối nay nên ăn gì"])
    it(`${t} → gợi ý món`, () => expect(early(t)).toMatchObject({ intent: "food_suggest", drink: false }));
  it("uống gì giờ ta → gợi ý đồ uống", () => expect(early("uống gì giờ ta")).toMatchObject({ intent: "food_suggest", drink: true }));
  it("có tên món → hỏi khẩu vị món đó (món nào cũng được)", () => {
    expect(early("a thèm pizza")).toMatchObject({ intent: "food_choice", dish: "pizza" });
    expect(early("thèm phở quá")).toMatchObject({ intent: "food_choice", dish: "pho" });
  });
  it("tìm quán pizza → tìm quán, giữ đúng món (không bị đổi thành 'tìm quán ăn gần đây')", () => {
    expect(q("tìm quán pizza")).toBe("tìm quán pizza");
    expect(early("tìm quán pizza")).toMatchObject({ intent: "food_place", dish: "pizza" });
    expect(early("quán phở ở đâu")).toMatchObject({ intent: "food_place", dish: "pho" });
  });
  it("pizza ăn nhiều có hại không? → sức khoẻ, không phải chọn món", () => {
    expect(early("pizza ăn nhiều có hại không?")).toBeNull();
    expect(healthFact(q("pizza ăn nhiều có hại không?"))).toMatch(/Đồ ăn nhanh/);
    expect(healthFact(q("pizza bao nhiêu tiền"))).toBeNull();
  });
  it("câu có bệnh / hỏi thăm / hỏi kiến thức không bị coi là nhờ chọn món", () => {
    for (const t of ["đau bụng có nên ăn phở không", "bị đau dạ dày nên ăn gì", "ăn gì để đẹp da", "e ăn gì chưa", "Lomi thích ăn gì", "hôm qua ăn gì mà ngon vậy"]) expect(early(t)).toBeNull();
  });
});

describe("P1 — ý định chung không cướp mạch đang nói", () => {
  it("Tarot: đang chờ câu hỏi bói thì mọi câu là câu hỏi bói; nhờ BÓI chuyện ăn uống vẫn là bói", () => {
    expect(early("Lomi có tư vấn sức khỏe không?", { waiting: true })).toBeNull();
    expect(early("nay ăn gì ta", { waiting: true })).toBeNull();
    expect(early("bói xem tối nay nên ăn phở hay lẩu")).toBeNull();
    expect(early("người ấy có biết tình cảm của mình không", { talk: "tarot" })).toBeNull();
  });
  it("Tình cảm: lời kể có nhắc món / chữ 'tình cảm' vẫn là kể chuyện", () => {
    expect(early("hôm qua tụi em đi ăn pizza rồi cãi nhau, em không biết chọn ai", { talk: "heart" })).toBeNull();
    expect(early("anh ấy rủ đi ăn lẩu mà em không biết chọn gì, em buồn quá", { talk: "heart" })).toBeNull();
    expect(early("em có nên hỏi thẳng anh ấy về chuyện tình cảm không", { talk: "heart" })).toBeNull();
  });
  it("Sức khoẻ: 'nên ăn gì' là xin lời khuyên sức khoẻ; hỏi thuốc là hỏi thật", () => {
    expect(early("vậy nên ăn gì", { talk: "health" })).toBeNull();
    expect(early("ăn phở được không, có nên ăn gì thêm", { talk: "health" })).toBeNull();
    expect(early("thuốc này có giúp hết đau không", { talk: "health" })).toBeNull();
  });
  it("Chọn món: câu trả lời khẩu vị / chọn món không bị hiểu thành ý định khác", () => {
    expect(early("nhiều phô mai", { talk: "dish" })).toBeNull();
    expect(detectDish("🍜 Phở")?.id).toBe("pho");
  });
  it("App / kinh doanh: kể chuyện quán có nhắc món không phải nhờ chọn món", () => {
    expect(early("quán mình bán pizza, khách không biết chọn loại nào", { talk: "biz" })).toBeNull();
    expect(early("kinh doanh online có giúp tăng thu nhập không", { talk: "biz" })).toBeNull();
    expect(early("ưu đãi này có giúp bán hàng tốt hơn không")).toBeNull();
  });
  it("đổi chủ đề RÕ RÀNG thì vẫn được", () => {
    expect(early("Lomi có tư vấn sức khỏe không?", { talk: "heart" })?.intent).toBe("capability");
    expect(early("giờ ăn gì ta", { talk: "tarot" })?.intent).toBe("food_suggest");
    expect(early("tìm quán phở gần đây", { talk: "health" })?.intent).toBe("food_place");
  });
});

describe("P1 — hỏi khả năng của Lomi", () => {
  const cap = (t: string) => capabilityAsk(q(t))?.domain;
  it("hỏi khả năng", () => {
    expect(cap("Lomi có tư vấn sức khỏe không?")).toBe("health");
    expect(cap("Lomi có tư vấn tâm lý không?")).toBe("heart");
    expect(cap("Lomi có tư vấn tình cảm không?")).toBe("heart");
    expect(cap("e tư vấn tình cảm được không?")).toBe("heart");
    expect(cap("Lomi có biết thuốc không?")).toBe("health");
    expect(cap("e tư vấn sức khỏe được không?")).toBe("health");
    expect(cap("ơ a tưởng e tư vấn sk được mà")).toBe("health"); // câu thật trong nhật ký "Lomi bí"
  });
  it("kể bệnh / hỏi kiến thức không phải hỏi khả năng", () => {
    expect(cap("mình đang đau đầu")).toBeUndefined();
    expect(analyzeBody(q("mình đang đau đầu"))!.sx).toContain("headache");
    expect(cap("mình bị đau đầu")).toBeUndefined();
    expect(cap("đau đầu là do đâu?")).toBeUndefined();
    expect(analyzeBody(q("đau đầu là do đâu?"))!.text).toMatch(/nhiều nguyên nhân/);
  });
  it("vừa hỏi khả năng vừa kể triệu chứng → chuyện sức khoẻ của người dùng thắng", () => {
    const t = "Lomi có tư vấn sức khỏe cho mình không, mình đang đau đầu";
    expect(cap(t)).toBeUndefined();
    expect(analyzeBody(q(t))!.sx).toContain("headache");
  });
  it("câu hỏi THẬT có chữ 'giúp / biết / hỏi … không' không bị đáp 'Được chứ, Lomi hỗ trợ…'", () => {
    for (const t of [
      "uống thuốc cảm có giúp hết bệnh không",
      "thuốc này có giúp hết đau không",
      "bác sĩ có biết bệnh này không",
      "mình có nên hỏi bác sĩ không",
      "anh ấy có biết tình cảm của mình không",
      "em có biết tình cảm của anh ấy không",
      "cho hỏi thuốc paracetamol uống lúc đói được không",
      "kinh doanh online có giúp tăng thu nhập không",
    ])
      expect(cap(t), t).toBeUndefined();
  });
  it("'chớ e biết cái gì' (câu thật) → Lomi nói mình biết gì, không báo bí", () => expect(chitChat(q("chớ e biết cái gì"), "vi", undefined, "chớ e biết cái gì")?.text).toMatch(/Lomi rành/));
});

describe("P2 — senseCanon không đổi ý người dùng", () => {
  it("'không biết làm gì' là đang rảnh, không phải hoang mang", () => {
    for (const t of ["cuối tuần không biết làm gì", "rảnh quá không biết làm gì"]) {
      expect(q(t)).toBe(t);
      expect(senseState(t)?.intent).toBe("state:free");
    }
    expect(q("không biết phải làm sao nữa")).toMatch(/hoang mang/); // bế tắc thật thì vẫn nhận
  });
  it("các câu dễ bị gán nhầm giữ nguyên văn", () => {
    for (const t of ["nhớ nhà quá", "mưa quá trời", "cái này dùng sao", "máy này bao nhiêu", "chị ấy im quá", "tìm tiệm cắt tóc", "tìm quán cà phê yên tĩnh để làm việc"]) expect(q(t), t).toBe(t);
  });
  it("'nhớ nhà' vào đúng chủ đề nhớ nhà sẵn có, không bị gán 'cô đơn'", () => expect(heartStart(q("nhớ nhà quá"), false)?.theme).toBe("homesick"));
});

describe("P2 — ranh giới nhỏ", () => {
  it("cf? → không phải sức khoẻ", () => {
    expect(gate(q("cf?"), {})).toMatchObject({ action: "skip", intent: "drink_only" });
    expect(healthFact(q("cf?"))).toBeNull();
  });
  it("đi cf không? → rủ đi chơi (chuyện phiếm)", () => {
    expect(early("đi cf không?")).toBeNull();
    expect(healthFact(q("đi cf không?"))).toBeNull();
    expect(understand(q("đi cf không?"), "đi cf không?", {})?.intent).toBe("invite");
  });
  it("uống cf nhiều có sao không? → sức khoẻ", () => expect(healthFact(q("uống cf nhiều có sao không?"))).toMatch(/Cà phê/));
  it("mình bị đau đầu → hỏi thêm, chưa nêu bệnh", () => expect(analyzeBody(q("mình bị đau đầu"))!.text).toMatch(/bao lâu/));
});
