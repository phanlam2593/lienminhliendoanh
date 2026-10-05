// Regression 05/10 — ngữ cảnh hỏi nối, kiến thức chung vs tình trạng cá nhân, thuốc, bám câu hỏi.
// route() mô phỏng đúng thứ tự trong AiAssistant: crisis → tarot đang mở → gate → tarot mới → sức khoẻ (context → facts → triệu chứng) → tình cảm.
import { describe, expect, it } from "vitest";
import { expandTeen, crisisReply } from "@/lib/lomiChat";
import { gate } from "@/lib/lomiUnderstand";
import { contextReply } from "@/lib/lomiContext";
import { healthFact } from "@/lib/lomiHealthFacts";
import { analyzeBody } from "@/lib/lomiSymptoms";
import { relationReply } from "@/lib/lomiRelation";
import { detectTarot, isTarotMore } from "@/lib/tarot";

type Ctx = { heart?: string; hsub?: string; rel?: string; tarot?: boolean; last?: string };
type Out = { domain: string; text: string; ctx: Ctx };

function route(raw: string, c: Ctx = {}): Out {
  const q = expandTeen(raw);
  const cr = crisisReply(q, "vi");
  if (cr) return { domain: "crisis", text: cr.text, ctx: { heart: "sad" } };
  if (c.tarot) {
    if (isTarotMore(q)) return { domain: "tarot_more", text: "", ctx: { tarot: true } };
    if (/(?<![a-z])(thi sao|the con|vay con|con chuyen|con ve)(?![a-z])/.test(q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase()) && !detectTarot(q))
      return { domain: "tarot", text: "", ctx: { tarot: true } };
  }
  const inFlow = !!c.heart;
  const g0 = gate(q, { lastText: c.last, topic: c.tarot ? "tarot" : c.heart === "health" ? "health" : c.heart ? "heart" : undefined, inFlow }, true);
  const qq = g0?.action === "rewrite" ? g0.q : q;
  const g = gate(qq, g0?.action === "rewrite" ? {} : { lastText: c.last, inFlow, topic: c.tarot ? "tarot" : c.heart === "health" ? "health" : c.heart ? "heart" : undefined });
  if (g?.action === "reply") return { domain: `gate:${g.reply.intent}`, text: g.reply.text, ctx: {} };
  if (g?.action === "skip") return { domain: `skip:${g.intent}`, text: "", ctx: {} };
  const d = detectTarot(qq);
  if (d) return { domain: "tarot", text: d.question ?? "", ctx: { tarot: true } };
  const cx = contextReply(qq, c.hsub);
  if (cx) return { domain: `health:${cx.anchor.subject}:${cx.anchor.aspect}`, text: cx.text, ctx: { heart: "health", hsub: cx.anchor.subject, last: cx.text } };
  const f = healthFact(qq);
  if (f) return { domain: "health:fact", text: f, ctx: { heart: "health", last: f } };
  const b = analyzeBody(qq);
  if (b) return { domain: "health:body", text: b.text, ctx: { heart: "health", last: b.text } };
  const r = relationReply(qq, c.rel);
  if (r) return { domain: `rel:${r.rel.split("|")[1]}`, text: r.text, ctx: { heart: r.theme, rel: r.rel, last: r.text } };
  return { domain: "other", text: "", ctx: {} };
}
function chain(lines: string[]): Out[] {
  let c: Ctx = {};
  return lines.map((l) => {
    const o = route(l, c);
    c = o.ctx;
    return o;
  });
}
const UNKNOWN = /chưa hiểu|chưa chắc hiểu|chưa bắt chắc/;

describe("sức khoẻ — xét nghiệm máu", () => {
  it("1. thử máu + trà atiso → trả lời chuyện uống, giữ mốc 'mai' và món 'trà atiso'", () => {
    const o = route("Mai mình đi thử máu, uống trà atiso ok không?");
    expect(o.domain).toBe("health:bloodtest:drink");
    expect(o.text).toMatch(/Mai đi xét nghiệm máu/);
    expect(o.text).toMatch(/trà atiso/);
    expect(o.text).toMatch(/tuỳ loại xét nghiệm/); // không khẳng định mọi xét nghiệm đều phải nhịn
  });
  it("2. 'Ý là thử máu thì cần chuẩn bị gì?' → chuẩn bị, không unknown", () => {
    const o = route("Ý là thử máu thì cần chuẩn bị gì?", { last: "Lomi chưa chắc hiểu ý bạn" });
    expect(o.domain).toBe("health:bloodtest:prep");
  });
  it("3. 'Đi thử máu á' → vẫn nhận ra chủ thể", () => expect(route("Đi thử máu á").domain).toBe("health:bloodtest:prep"));
  it("4. 'Trước khi thử máu có được uống trà không?' → uống", () => expect(route("Trước khi thử máu có được uống trà không?").domain).toBe("health:bloodtest:drink"));
  it("nhịn ăn trước xét nghiệm máu để làm gì → kiến thức chung", () => expect(route("Nhịn ăn trước xét nghiệm máu để làm gì?").domain).toBe("health:bloodtest:why"));
});

describe("chuỗi hội thoại", () => {
  it("A: thử máu → chuẩn bị → đi thử máu á, không vòng lặp chưa hiểu", () => {
    const o = chain(["Mai mình đi thử máu, uống trà atiso ok không?", "Ý là thử máu thì cần chuẩn bị gì?", "Đi thử máu á"]);
    expect(o.map((x) => x.domain.split(":").slice(0, 2).join(":"))).toEqual(["health:bloodtest", "health:bloodtest", "health:bloodtest"]);
    for (const x of o) expect(x.text).not.toMatch(UNKNOWN);
  });
  it("B: xét nghiệm máu → chuẩn bị gì? → còn ăn thì sao?", () => {
    const o = chain(["Mai mình đi xét nghiệm máu.", "Chuẩn bị gì?", "Còn ăn thì sao?"]);
    expect(o.map((x) => x.domain)).toEqual(["health:bloodtest:prep", "health:bloodtest:prep", "health:bloodtest:eat"]);
  });
  it("các câu nối ngắn được hiểu theo chủ thể đang nói", () => {
    const c: Ctx = { heart: "health", hsub: "bloodtest" };
    expect(route("chuẩn bị gì?", c).domain).toBe("health:bloodtest:prep");
    expect(route("uống được không?", c).domain).toBe("health:bloodtest:drink");
    expect(route("còn ăn?", c).domain).toBe("health:bloodtest:eat");
    expect(route("bao lâu?", c).domain).toBe("health:bloodtest:time");
    expect(route("cái đó thì sao?", c).domain).toBe("health:bloodtest:prep");
    expect(route("vậy còn cái này?", c).domain).toBe("health:bloodtest:prep");
    // chưa rõ việc gì / nói tới thứ khác → hỏi lại đúng 1 câu, có nhắc chủ thể, không đoán
    expect(route("có được không?", c).text).toMatch(/xét nghiệm máu.*ăn, uống, hay dùng thuốc/);
    expect(route("ý là cái kia á", c).text).toMatch(/chuyện khác ngoài xét nghiệm máu/);
  });
  it("không có ngữ cảnh → hỏi lại, không bịa chủ thể", () => {
    for (const t of ["chuẩn bị gì?", "cái đó thì sao?", "vậy còn cái này?"]) {
      const o = route(t);
      expect(o.domain).not.toMatch(/^health:bloodtest/);
      expect(o.domain).toMatch(/^(skip|gate|other)/);
    }
  });
  it("C: người ấy còn tình cảm? → im lặng? → nên làm gì?", () => {
    const o = chain(["Người ấy có còn tình cảm với mình không?", "Thế nếu người ấy im lặng?", "Vậy mình nên làm gì?"]);
    expect(o.map((x) => x.domain)).toEqual(["rel:mind_read", "rel:silence", "rel:silence_advice"]);
    expect(o[2].text).toMatch(/Người ấy im lặng/);
  });
  it("D: Tarot → thế còn công việc? → rút thêm — giữ Tarot", () => {
    const o = chain(["Bói Tarot xem người ấy có còn tình cảm với mình không?", "Thế còn công việc?", "Rút thêm"]);
    expect(o.map((x) => x.domain)).toEqual(["tarot", "tarot", "tarot_more"]);
    expect(o[0].text).toMatch(/người ấy có còn tình cảm/); // giữ nguyên câu hỏi, không đổi thành "có thành không"
  });
});

describe("kiến thức chung vs cá nhân", () => {
  it("5. 'Đau đầu là do đâu?' → nêu nhiều nguyên nhân, không gán cho người hỏi", () => {
    const o = route("Đau đầu là do đâu?");
    expect(o.text).toMatch(/nhiều nguyên nhân/);
    expect(o.text).toMatch(/chưa xác định được nguyên nhân cụ thể/);
    expect(o.text).not.toMatch(/bạn đang có|Nên làm/);
  });
  it("'Đau đầu có những nguyên nhân gì?' cũng là kiến thức chung", () => expect(route("Đau đầu có những nguyên nhân gì?").text).toMatch(/nhiều nguyên nhân/));
  it("6. 'Mình bị đau đầu' → hỏi thêm, không chẩn đoán", () => {
    const t = route("Mình bị đau đầu").text;
    expect(t).toMatch(/bao lâu/);
    expect(t).not.toMatch(/hay gặp ở|nhiều nguyên nhân/);
  });
  it("'Mình bị đau đầu kèm buồn nôn' → vẫn hỏi thêm trước", () => expect(route("Mình bị đau đầu kèm buồn nôn").text).not.toMatch(/hay gặp ở/));
  it("'Mình đau đầu 2 ngày rồi' → có dữ kiện thời gian thì mới gợi ý khả năng", () => expect(route("Mình đau đầu 2 ngày rồi").text).toMatch(/hay gặp ở/));
});

describe("thuốc", () => {
  it("7. tác dụng phụ paracetamol → trả lời kiến thức trực tiếp (gan, quá liều)", () => {
    const o = route("Paracetamol có tác dụng phụ gì?");
    expect(o.domain).toBe("health:paracetamol:info");
    expect(o.text).toMatch(/gan/);
    expect(o.text).not.toMatch(/không kê thuốc/);
  });
  it("8. uống bao nhiêu viên → hỏi tuổi/cân nặng, không đưa liều", () => {
    const o = route("Paracetamol uống bao nhiêu viên?");
    expect(o.domain).toBe("health:paracetamol:dose");
    expect(o.text).toMatch(/cân nặng/);
    expect(o.text).not.toMatch(/\d+\s*(mg\/kg|viên mỗi|g mỗi ngày)/);
  });
  it("9. uống quá nhiều → cấp cứu/115 ngay", () => {
    const o = route("Mình vừa uống quá nhiều paracetamol");
    expect(o.domain).toBe("health:paracetamol:overdose");
    expect(o.text).toMatch(/115/);
  });
  it("trẻ 5 tuổi → theo cân nặng, hỏi dược sĩ", () => expect(route("Trẻ 5 tuổi uống paracetamol được không?").domain).toBe("health:paracetamol:kid"));
  it("hỏi nối: 'còn uống rượu thì sao?' sau paracetamol", () => expect(route("còn uống rượu thì sao?", { heart: "health", hsub: "paracetamol" }).domain).toBe("health:paracetamol:alcohol"));
});

describe("tình cảm + giữ hành vi cũ", () => {
  it("10. còn tình cảm không → mind_read, không đổi câu hỏi", () => {
    const o = route("Người ấy có còn tình cảm với mình không?");
    expect(o.text).toMatch(/người ấy còn tình cảm/);
    expect(o.text).not.toMatch(/có thành|quay lại/);
  });
  it("11. im lặng 3 ngày → giữ dữ kiện '3 ngày'", () => expect(route("Người ấy im lặng 3 ngày rồi.").text).toMatch(/im lặng 3 ngày/));
  it("12. 'Vậy mình nên làm gì?' sau đó → lời khuyên về người ấy", () => {
    const o = chain(["Người ấy im lặng 3 ngày rồi.", "Vậy mình nên làm gì?"]);
    expect(o[1].domain).toBe("rel:silence_advice");
  });
  it("'Vậy mình nên làm gì?' không có ngữ cảnh → không bịa 'người ấy'", () => expect(route("Vậy mình nên làm gì?").domain).not.toMatch(/^rel/));
  it("cf? vẫn không vào health; cà phê nhiều vẫn vào health", () => {
    expect(route("cf?").domain).toBe("skip:drink_only");
    expect(route("uống cà phê nhiều có sao không?").domain).toBe("health:fact");
  });
});
