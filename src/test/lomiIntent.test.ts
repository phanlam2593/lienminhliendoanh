// Regression 06/10 — hỏi khả năng của Lomi, thèm/chọn món, báo cáo giữ câu gốc.
import { describe, expect, it, vi } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { capabilityAsk, foodChoice } from "@/lib/lomiIntent";
import { healthFact } from "@/lib/lomiHealthFacts";
import { analyzeBody } from "@/lib/lomiSymptoms";
import { contextReply } from "@/lib/lomiContext";

const rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...(a as [])) } }));
const q = (t: string) => expandTeen(t);

describe("capability", () => {
  for (const t of ["e tư vấn sức khỏe a đc k", "Lomi có tư vấn sức khoẻ không?", "em biết tư vấn sức khỏe không?", "hỏi Lomi về sức khỏe được không?", "Lomi tư vấn bệnh được không?", "có hỏi về thuốc được không?", "Lomi làm được gì về sức khỏe?"])
    it(`${t} → capability/health`, () => expect(capabilityAsk(q(t))?.domain).toBe("health"));
  it("nói đúng khả năng thật: không chẩn đoán, không đưa liều", () => expect(capabilityAsk(q("Lomi có tư vấn sức khoẻ không?"))!.text).toMatch(/không chẩn đoán.*không đưa liều/));
  for (const t of ["sức khỏe dạo này sao rồi?", "sức khỏe có quan trọng không?", "mình bị đau đầu", "đau đầu là do đâu?"])
    it(`${t} → không phải capability`, () => expect(capabilityAsk(q(t))).toBeNull());
  it("'mình bị đau đầu' vẫn là triệu chứng cá nhân, 'đau đầu là do đâu' vẫn là kiến thức", () => {
    expect(analyzeBody(q("mình bị đau đầu"))!.text).toMatch(/bao lâu/);
    expect(analyzeBody(q("đau đầu là do đâu?"))!.text).toMatch(/nhiều nguyên nhân/);
  });
});

describe("food choice", () => {
  for (const t of ["chưa đang thèm pizza mà k biết nên ăn pizza j", "đang thèm pizza mà không biết ăn pizza gì", "nay ăn pizza gì ta", "chọn pizza giúp a", "pizza nào ngon", "a thèm pizza"])
    it(`${t} → food_choice pizza`, () => expect(foodChoice(q(t))).toMatchObject({ intent: "food_choice", dish: "pizza" }));
  it("không hard-code pizza: món khác cũng được", () => {
    expect(foodChoice(q("thèm phở quá"))).toMatchObject({ intent: "food_choice", dish: "pho" });
    expect(foodChoice(q("chọn món lẩu giúp mình"))).toMatchObject({ intent: "food_choice", dish: "lau" });
  });
  for (const t of ["tìm quán pizza", "pizza nào gần đây?"]) it(`${t} → tìm quán`, () => expect(foodChoice(q(t))?.intent).toBe("food_place"));
  it("pizza ăn nhiều có hại không? → không phải chọn món", () => expect(foodChoice(q("pizza ăn nhiều có hại không?"))).toBeNull());
  it("không nhắc món → null", () => expect(foodChoice(q("hôm nay trời đẹp"))).toBeNull());
});

describe("báo cáo giữ câu gốc", () => {
  it("logUnanswered lưu câu gõ nguyên văn, khoá gộp từ câu đã chuẩn hoá", async () => {
    const { logUnanswered } = await import("@/lib/lomiLearn");
    const raw = "chưa đang thèm pizza mà k biết nên ăn pizza j";
    logUnanswered(raw, expandTeen(raw));
    expect(rpc).toHaveBeenCalledWith("lomi_log_unanswered", expect.objectContaining({ _sample: raw }));
  });
});

describe("không regression", () => {
  it("cf? không health, cà phê nhiều vẫn health", () => {
    expect(healthFact(q("cf?"))).toBeNull();
    expect(healthFact(q("uống cà phê nhiều có sao không?"))).toMatch(/Cà phê/);
  });
  it("paracetamol: kiến thức vs liều", () => {
    expect(contextReply(q("paracetamol có tác dụng phụ gì?"))?.anchor.aspect).toBe("info");
    expect(contextReply(q("paracetamol uống bao nhiêu viên?"))?.anchor.aspect).toBe("dose");
  });
});
