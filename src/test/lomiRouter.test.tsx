// 14/11 — kiến trúc chọn lớp mới (lib/lomiRouter): quét rủi ro một chỗ, đề cử + trọng tài ở cửa ra, cờ rủi ro mang qua lượt.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { arbitrate, clauseOf, isSafetyReply, nextRisk, riskScan, safetyCandidates, splitClauses, type Candidate } from "@/lib/lomiRouter";

const T = 120000;
const scan = (t: string, extra: { harm?: boolean; red?: boolean } = {}) => riskScan({ q: t, raw: t, lang: "vi", ...extra });

describe("tách vế chính / vế phụ", () => {
  it("không có từ chuyển ý → cả câu là vế chính", () => {
    expect(splitClauses("quán nào bán phở ngon").subs).toHaveLength(0);
  });
  it("'… nhưng …' → vế sau là vế chính", () => {
    const s = splitClauses("mình muốn tìm quán cà phê nhưng đang đau bụng dữ dội");
    expect(s.main).toBe("dang dau bung du doi");
    expect(s.subs[0]).toMatch(/quan ca phe/);
  });
  it("gõ không dấu cũng tách được; 'à mà', 'thôi kệ' là từ chuyển ý", () => {
    expect(splitClauses("e buon qua, a ma quan tra sua nao ngon").main).toMatch(/quan tra sua/);
    expect(splitClauses("đang tính bói bài thôi kệ tìm quán lẩu đi").main).toMatch(/tim quan lau/);
  });
  it("'mà' giữa câu (người mà mình thương) không phải từ chuyển ý", () => {
    expect(splitClauses("người mà mình thương đã đi rồi").subs).toHaveLength(0);
  });
  it("vế sau quá ngắn thì không tách", () => {
    expect(splitClauses("mình mệt lắm nhưng thôi").subs).toHaveLength(0);
  });
  it("clauseOf: bằng chứng ở vế nào", () => {
    const t = "mình muốn tìm quán cà phê nhưng đang đau bụng dữ dội";
    expect(clauseOf(t, "quán cà phê")).toBe("sub");
    expect(clauseOf(t, "đau bụng")).toBe("main");
    expect(clauseOf("đau bụng quá", "đau bụng")).toBe("main");
  });
});

describe("quét rủi ro — một chỗ", () => {
  it("nói thẳng ý định tự hại → crisis", () => {
    const r = scan("em không muốn sống nữa");
    expect(r.crisis?.text).toBeTruthy();
    expect(r.any).toBe(true);
  });
  it("câu chối → không bật crisis", () => {
    const r = scan("không, mình không có ý định làm hại bản thân đâu, chỉ mệt thôi");
    expect(r.crisis).toBeNull();
    expect(r.denial).toBe(true);
  });
  it("câu thường → không có gì", () => {
    expect(scan("tối nay ăn gì ta").any).toBe(false);
    expect(scan("quán cà phê nào yên tĩnh").any).toBe(false);
  });
  it("forceAi → không quét", () => {
    expect(riskScan({ q: "em không muốn sống nữa", raw: "em không muốn sống nữa", lang: "vi", forceAi: true }).any).toBe(false);
  });
  it("cờ do nơi gọi đưa vào (bạo lực, dấu hiệu đỏ) cũng tính là rủi ro", () => {
    expect(scan("anh ấy đánh em", { harm: true }).any).toBe(true);
    expect(scan("ba đi ngoài ra máu", { red: true }).any).toBe(true);
  });
});

describe("trọng tài", () => {
  const crisis = safetyCandidates(scan("em không muốn sống nữa"), "em không muốn sống nữa");
  it("an toàn thắng mọi lớp legacy chưa phải lời an toàn", () => {
    const v = arbitrate({ layer: "food", clause: "main", safety: false }, crisis);
    expect(v.reason).toBe("safety-first");
    expect(v.winner?.intent).toBe("crisis");
  });
  it("legacy đã là lời an toàn → giữ nguyên (không thay lời an toàn này bằng lời an toàn khác)", () => {
    expect(arbitrate({ layer: "safety", clause: "main", safety: true }, crisis).winner).toBeNull();
  });
  it("không có ứng viên → legacy", () => {
    expect(arbitrate({ layer: "food", clause: "main", safety: false }, []).reason).toBe("legacy");
  });
  const cand = (over: Partial<Candidate>): Candidate => ({ layer: "health", intent: "x", confidence: 0.8, evidence: "", clause: "main", ...over });
  it("ứng viên có bằng chứng ở vế CHÍNH thắng câu đáp legacy chỉ dựa vào vế phụ", () => {
    const v = arbitrate({ layer: "food", clause: "sub", safety: false }, [cand({})]);
    expect(v.reason).toBe("main-clause");
  });
  it("cùng vế chính: phải hơn hẳn mới thay legacy; sát điểm thì đánh dấu nên hỏi lại", () => {
    expect(arbitrate({ layer: "food", clause: "main", confidence: 0.5, safety: false }, [cand({ confidence: 0.8 })]).reason).toBe("main-clause");
    const close = arbitrate({ layer: "food", clause: "main", confidence: 0.75, safety: false }, [cand({ confidence: 0.8 })]);
    expect(close.winner).toBeNull();
    expect(close.askBack).toBe(true);
  });
  it("ứng viên ở vế phụ không thắng legacy ở vế chính", () => {
    expect(arbitrate({ layer: "food", clause: "main", safety: false }, [cand({ clause: "sub", confidence: 0.99 })]).winner).toBeNull();
  });
  it("isSafetyReply: đường dây nóng, 113 / 115, cảnh báo cấp cứu", () => {
    expect(isSafetyReply({ content: "Gọi **115** ngay nha" })).toBe(true);
    expect(isSafetyReply({ content: "🚨 Dấu hiệu nguy hiểm" })).toBe(true);
    expect(isSafetyReply({ content: "Lomi tìm được mấy quán nè" })).toBe(false);
    expect(isSafetyReply({ content: "giá 115.000đ một phần" })).toBe(false);
  });
});

describe("cờ rủi ro mang qua lượt", () => {
  const calm = scan("tối nay ăn gì");
  it("lượt có rủi ro → age 0; hai lượt sau còn cờ; lượt thứ ba hết", () => {
    const r0 = nextRisk(scan("em không muốn sống nữa"), undefined);
    expect(r0).toEqual({ kind: "crisis", age: 0 });
    const r1 = nextRisk(calm, r0);
    expect(r1).toEqual({ kind: "crisis", age: 1 });
    const r2 = nextRisk(calm, r1);
    expect(r2?.age).toBe(2);
    expect(nextRisk(calm, r2)).toBeUndefined();
  });
});

describe("trong khung chat thật", () => {
  it("câu nói thẳng ý định tự hại → lời hỗ trợ khủng hoảng, có cờ rủi ro", async () => {
    const a = await last(["em không muốn sống nữa"]);
    expect(isSafetyReply(a)).toBe(true);
    expect((a as { risk?: { kind: string } }).risk?.kind).toBe("crisis");
  }, T);
  it("ý định tự hại lẫn trong câu tìm quán / bói bài → vẫn là lời hỗ trợ khủng hoảng (không nhánh nào giành)", async () => {
    for (const t of [
      "tìm quán cà phê nào yên tĩnh để ngồi một mình, em không muốn sống nữa",
      "bói cho em một quẻ đi, em muốn chết quách cho xong",
      "quán em ế quá làm sao kéo khách, em chỉ muốn tự tử thôi",
    ]) {
      const a = await last([t]);
      expect(isSafetyReply(a), t).toBe(true);
      expect(a.content, t).not.toMatch(/Lomi tìm được|ưu đãi lần đầu/);
    }
  }, T);
  it("hai lượt sau câu khủng hoảng: câu đáp còn mang cờ rủi ro và không kèm sticker", async () => {
    const turns = await chat(["em không muốn sống nữa", "ừ", "abcxyz gì đó"]);
    const as = turns.filter((m) => m.role === "assistant") as (typeof turns[number] & { risk?: { age: number }; sticker?: string })[];
    expect(as[1].risk?.age).toBe(1);
    expect(as[2].risk?.age).toBe(2);
    expect(as[2].sticker).toBeUndefined();
  }, T);
  it("câu thường không bị gắn cờ, không bị đổi câu đáp", async () => {
    const a = (await last(["tìm quán cà phê yên tĩnh"])) as { risk?: unknown; routed?: string };
    expect(a.risk).toBeUndefined();
    expect(a.routed).toBeUndefined();
  }, T);
});
