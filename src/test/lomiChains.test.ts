// Chuỗi hội thoại Tarot + câu hỏi nối về app (06/10). Các nhánh này nằm trong AiAssistant.send() (cần state React),
// nên test bằng chính các hàm thư viện mà nhánh đó gọi — để không bị rơi context giữa các lượt.
import { describe, expect, it } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { detectTarot, drawForQuestion, isTarotMore, isTarotRedo, questionTopic, readingText } from "@/lib/tarot";
import { matchFaq, matchFaqFollowUp } from "@/lib/lomiFaq";

const q = (t: string) => expandTeen(t);

describe("Tarot — giữ đúng câu hỏi (question anchor)", () => {
  it("'người ấy còn tình cảm không' không bị đổi thành 'có thành không' / 'quay lại không'", () => {
    const d = detectTarot(q("Bói Tarot xem người ấy có còn tình cảm với mình không?"))!;
    expect(d.question).toMatch(/người ấy có còn tình cảm/i);
    const txt = readingText(drawForQuestion(d.question), "vi");
    expect(txt).toMatch(/Người ấy có còn tình cảm với mình không\?/);
    expect(txt).not.toMatch(/có thành không|quay lại không/);
  });
  it("giữ mốc thời gian + mục tiêu: 'tháng tới mình có việc không?'", () => {
    const d = detectTarot(q("bói tarot tháng tới mình có việc không?"))!;
    expect(questionTopic(d.question)).toBe("work");
    expect(readingText(drawForQuestion(d.question), "vi")).toMatch(/tháng tới/i);
  });
  it("'Rút thêm' / 'làm rõ hơn' là yêu cầu rút thêm lá, không phải câu hỏi mới", () => {
    for (const t of ["Rút thêm", "rút thêm 1 lá", "làm rõ hơn"]) {
      expect(isTarotMore(t)).toBe(true);
      expect(detectTarot(t)).toBeNull();
    }
    expect(isTarotRedo("bói lại")).toBe(true);
  });
  it("'Thế còn công việc?' (đang trong mạch Tarot) → hiểu là chủ đề công việc", () => {
    expect(questionTopic(q("công việc").replace(/(thế|vậy|thì|còn|sao|chuyện|về)(?=\s|$|\?)/giu, " "))).toBe("work");
  });
});

describe("App — câu hỏi nối giữ ngữ cảnh tính năng", () => {
  it("'Lomi có giao đồ ăn không?' → 'Vậy còn giao người?' hiểu theo mạch trước, không rơi unknown", () => {
    const f1 = matchFaq(q("Lomi có giao đồ ăn không?"));
    expect(f1).toBeTruthy();
    const f2 = matchFaqFollowUp(q("Vậy còn giao người?"), f1!.id, undefined);
    expect(f2).toBeTruthy();
    expect(f2!.id).not.toBe(f1!.id);
  });
  it("không có mạch trước thì KHÔNG đoán bừa", () => expect(matchFaq(q("Vậy còn giao người?"))).toBeNull());
});

// ── Chuỗi sức khoẻ nhiều lượt (xét nghiệm máu) — ngữ cảnh lưu ở Msg.hsub, hàm thư viện contextReply ──
import { contextReply } from "@/lib/lomiContext";
import { analyzeBody } from "@/lib/lomiSymptoms";

function runChain(turns: string[]) {
  let hsub: string | undefined;
  return turns.map((t) => {
    const cx = contextReply(q(t), hsub);
    if (cx) hsub = cx.anchor.subject;
    return { t, cx };
  });
}

describe("Chuỗi sức khoẻ — giữ ngữ cảnh xuyên các lượt", () => {
  it("thử máu → 'ý là thử máu thì chuẩn bị gì' → 'đi thử máu á' không rơi unknown, không hỏi lại vô ích", () => {
    const r = runChain(["Mai mình đi thử máu, uống trà atiso ok không?", "Ý là thử máu thì cần chuẩn bị gì?", "Đi thử máu á"]);
    expect(r[0].cx?.anchor).toMatchObject({ subject: "bloodtest", aspect: "drink", object: "trà atiso", timeframe: "mai" });
    expect(r[1].cx?.anchor).toMatchObject({ subject: "bloodtest", aspect: "prep" });
    expect(r[2].cx?.anchor.subject).toBe("bloodtest");
    for (const x of r) expect(x.cx?.text).toBeTruthy();
  });
  it("các câu nối ngắn hiểu theo chủ thể đang nói", () => {
    const r = runChain(["Mai mình đi xét nghiệm máu.", "uống được không?", "bao lâu?", "thế còn ăn?", "cái này thì sao?"]);
    expect(r.map((x) => x.cx?.anchor.aspect)).toEqual(["prep", "drink", "time", "eat", "prep"]);
  });
  it("KHÔNG đoán bừa khi chưa có ngữ cảnh", () => {
    for (const t of ["Chuẩn bị gì?", "vậy có được không?", "còn cái đó?", "bao lâu?"]) expect(runChain([t])[0].cx).toBeNull();
  });
  it("'vậy còn cái kia?' → hỏi lại đúng một câu, không tự bịa chủ đề", () => {
    const r = runChain(["Mai mình đi xét nghiệm máu.", "vậy còn cái kia?"]);
    expect(r[1].cx?.text).toMatch(/chuyện khác/);
  });
  it("không bị trộn sang chủ thể khác: có chủ thể mới thì đổi chủ thể", () => {
    const r = runChain(["Mai mình đi xét nghiệm máu.", "Paracetamol có tác dụng phụ gì?"]);
    expect(r[1].cx?.anchor.subject).toBe("paracetamol");
  });
});

describe("Kiến thức chung vs triệu chứng cá nhân", () => {
  it("'Đau đầu là do đâu?' → liệt kê NHIỀU nguyên nhân, không gán căng thẳng cho người hỏi", () => {
    const t = analyzeBody(q("Đau đầu là do đâu?"), [], false, false)!.text;
    expect(t).toMatch(/nhiều nguyên nhân/);
    expect(t).toMatch(/thiếu ngủ/);
    expect(t).toMatch(/chưa xác định được nguyên nhân/);
    expect(t).not.toMatch(/Bạn đang bị|Lomi ghi nhận bạn/);
  });
  it("'sốt là do đâu?' / 'chóng mặt là bị gì vậy' cũng là kiến thức chung", () => {
    for (const s of ["sốt là do đâu?", "chóng mặt là bị gì vậy"]) {
      const t = analyzeBody(q(s), [], false, false)?.text ?? "";
      expect(t).toMatch(/nhiều nguyên nhân/);
      expect(t).not.toMatch(/Bạn đang bị|Lomi ghi nhận bạn/);
    }
  });
  it("'Mình bị đau đầu' → tình trạng cá nhân: hỏi thêm, chưa chẩn đoán", () => {
    const t = analyzeBody(q("Mình bị đau đầu"), [], false, false)!.text;
    expect(t).toMatch(/Bạn đang bị/);
    expect(t).toMatch(/hỏi thêm/);
    expect(t).not.toMatch(/hay gặp ở/);
  });
  it("dấu hiệu nguy hiểm → ưu tiên an toàn", () => expect(analyzeBody(q("mình bị đau ngực khó thở"), [], false, false)!.text).toMatch(/115/));
});

describe("Thuốc — kiến thức chung vs liều / quá liều / trẻ em", () => {
  const A = (s: string) => contextReply(q(s))!;
  it("tác dụng phụ / dùng để làm gì → trả lời trực tiếp, không từ chối", () => {
    for (const s of ["Paracetamol có tác dụng phụ gì?", "Paracetamol dùng để làm gì?"]) {
      const r = A(s);
      expect(r.anchor.aspect).toBe("info");
      expect(r.text).toMatch(/giảm đau/);
      expect(r.text).not.toMatch(/Lomi không đưa liều/);
    }
  });
  it("hỏi liều → không tự đưa số, hỏi thêm tuổi/cân nặng/hàm lượng", () => {
    const r = A("Paracetamol uống bao nhiêu viên?");
    expect(r.anchor.aspect).toBe("dose");
    expect(r.text).toMatch(/tuổi|cân nặng/);
    expect(r.text).not.toMatch(/\d+\s*(viên|mg)\b/);
  });
  it("vừa uống quá nhiều → cấp cứu / 115", () => {
    const r = A("Mình vừa uống quá nhiều paracetamol");
    expect(r.urgent).toBe(true);
    expect(r.text).toMatch(/115/);
  });
  it("trẻ 5 tuổi → theo cân nặng, không đưa liều từ trí nhớ", () => {
    const r = A("Trẻ 5 tuổi uống paracetamol được không?");
    expect(r.anchor.aspect).toBe("kid");
    expect(r.text).toMatch(/cân nặng/);
    expect(r.text).not.toMatch(/\d+\s*(viên|mg)\b/);
  });
  it("'Trà atiso có tác dụng gì?' → kiến thức chung; 'đi thử máu, uống trà atiso' vẫn là xét nghiệm máu", () => {
    expect(A("Trà atiso có tác dụng gì?").anchor.subject).toBe("atiso");
    expect(A("Mai mình đi thử máu, uống trà atiso ok không?").anchor.subject).toBe("bloodtest");
  });
});
