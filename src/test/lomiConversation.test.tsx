// CHUỖI HỘI THOẠI NHIỀU LƯỢT (08/10) — chạy qua CHÍNH khung chat <AiChat/> (xem lomiChatHarness).
// Mỗi test là một đoạn trò chuyện thật: gõ lần lượt từng tin, rồi kiểm tra Lomi có giữ được ngữ cảnh không
// (đang nói món gì / người nào / trải bài nào, Lomi vừa hỏi gì). Câu chữ Lomi đáp có phần ngẫu nhiên nên test
// bám vào CỜ NGỮ CẢNH trên tin trả lời (dish, heart, rel, tarot, unk…) và vài chữ khoá, không so nguyên câu.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { askedKind, convoOf, resolveTurn } from "@/lib/lomiConvo";
import { explicitAddr } from "@/lib/lomiAddress";
import { detectDish } from "@/lib/lomiSearch";
import { senseCanon } from "@/lib/lomiSense";
import { expandTeen, isAppish } from "@/lib/lomiChat";
import { healthFeeling, healthSubjectOf, healthTopicReply } from "@/lib/lomiHealthTopic";

const T = 20000;

describe("Ăn uống — giữ món đang nói", () => {
  it("đói → gợi ý món → 'pizza' → tìm quán pizza", async () => {
    const r = await chat(["a đói mà không biết ăn gì", "pizza"]);
    expect(r[0].dishAsk).toBeTruthy();
    expect(r[1].dish).toBe("pizza");
  }, T);
  it("than đói (Lomi chưa gợi ý món) → 'pizza' vẫn hiểu là muốn ăn pizza", async () => expect((await last(["a đói quá", "pizza"])).dish).toBe("pizza"), T);
  it("than đói → 'ừ' / 'đúng rồi' → Lomi gợi ý món, không đáp cụt 'Okie'", async () => {
    expect((await last(["a đói bụng", "ừ"])).dishAsk).toBeTruthy();
    expect((await last(["a đói bụng", "đúng rồi"])).dishAsk).toBeTruthy();
  }, T);
  it("than đói → 'không' → không phải 'Lomi hiểu nhầm rồi'", async () => expect((await last(["a đói bụng", "không"])).content).not.toMatch(/hiểu nhầm/), T);
  it("đi cf → 'quán nào ổn?' → quán CÀ PHÊ", async () => {
    const r = await chat(["a đang tính đi cf", "quán nào ổn?"]);
    expect(r[0].content).toMatch(/cà phê/i); // ghi nhận dự định, không phải "kể thêm đi"
    expect(r[1].dish).toBe("cafe");
  }, T);
  it("đi cf → Lomi mời tìm quán → 'ừ' → tìm quán cà phê", async () => expect((await last(["a đang tính đi cf", "ừ"])).dish).toBe("cafe"), T);
  it("kể chen một câu rồi mới hỏi 'quán nào ổn?' vẫn nhớ là cà phê", async () => expect((await last(["a đang tính đi cf", "với bạn gái", "quán nào ổn?"])).dish).toBe("cafe"), T);
  it("vừa hỏi khẩu vị pizza → 'nhiều phô mai' là câu trả lời khẩu vị (không phải món phở, không phải chuyện khác)", async () => {
    const r = await chat(["a thèm pizza", "nhiều phô mai"]);
    expect(r[0].dishPick).toBe(true);
    expect(r[1].dish).toBe("pizza");
  }, T);
  it("đang nói phở mà hỏi rõ một loại chỗ KHÁC → không ép về phở", async () => {
    const m = await last(["a thèm phở", "quán nào gần đây có spa?"]);
    expect(m.dish).toBeUndefined();
    expect(m.search?.kind?.noun).toBe("spa");
  }, T);
});

describe("Tìm quán — thêm điều kiện ở câu sau", () => {
  it("tìm quán cà phê → 'yên tĩnh' → lọc đúng quán có nhắc yên tĩnh", async () => {
    const m = await last(["tìm quán cà phê gần đây", "yên tĩnh"]);
    expect(m.dish).toBe("cafe");
    expect(m.content).toMatch(/có nhắc “yên tĩnh”/);
    expect(m.places?.map((p) => p.id)).toEqual(["p1"]);
  }, T);
  it("điều kiện không quán nào có → nói thật, vẫn đưa quán cà phê", async () => {
    const m = await last(["tìm quán cà phê gần đây", "view đẹp"]);
    expect(m.dish).toBe("cafe");
    expect(m.content).toMatch(/chưa thấy.*“view đẹp”/);
    expect(m.places?.length).toBeGreaterThan(0);
  }, T);
  it("'có ưu đãi không?' / 'gần mình thôi' hỏi về chính mấy quán vừa tìm, không phải hỏi cách dùng app", async () => {
    const r = await chat(["thèm trà sữa quá", "quán nào ngon", "có ưu đãi ko", "gần mình thôi"]);
    expect(r[1].dish).toBe("trasua");
    expect(r[2].dish).toBe("trasua");
    expect(r[2].content).toMatch(/đang có ưu đãi/);
    expect(r[2].unk).toBeUndefined();
    expect(r[3].dish).toBe("trasua");
  }, T);
  it("sau kết quả tìm quán: cảm ơn / hỏi về app / đổi chủ đề vẫn được hiểu đúng", async () => {
    const r = await chat(["tìm quán cà phê gần đây", "cảm ơn nha", "làm sao nhận ưu đãi?"]);
    expect(r[1].dish).toBeUndefined();
    expect(r[2].faqId).toBe("claim");
    expect((await last(["tìm quán cà phê gần đây", "tìm quán ăn gần mình"])).search?.kind?.noun).toBe("quán ăn");
  }, T);
});

describe("Tình cảm — giữ đúng người đang nói tới", () => {
  it("người ấy im lặng → 'còn nên nhắn không?' → trả lời chuyện nhắn cho NGƯỜI ẤY", async () => {
    const r = await chat(["người ấy im lặng mấy ngày rồi", "còn nên nhắn không?"]);
    expect(r[0].rel).toMatch(/^người ấy\|/);
    expect(r[1].rel).toBe("người ấy|texting");
    expect(r[1].heart).toBeTruthy();
  }, T);
  it("'người đó thì sao?' → hỏi đúng phần còn thiếu, vẫn trong mạch; bấm gợi ý thì đi tiếp", async () => {
    const r = await chat(["người yêu mình dạo này lạnh nhạt quá", "người đó thì sao?", "Mình nên làm gì bây giờ?"]);
    expect(r[1].content).toMatch(/người yêu/);
    expect(r[1].quick).toHaveLength(2);
    expect(r[1].rel).toBe(r[0].rel);
    expect(r[2].rel).toMatch(/advice/);
  }, T);
});

describe("Sức khoẻ — giữ mạch", () => {
  it("đau đầu → hỏi thuốc → vẫn là chuyện sức khoẻ, không đưa liều", async () => {
    const r = await chat(["mình bị đau đầu", "uống thuốc gì được?"]);
    expect(r[1].health).toBeTruthy(); // mạch SỨC KHOẺ…
    expect(r[1].heart).toBeUndefined(); // …không phải mạch tâm sự
    expect(r[1].sx).toContain("headache");
    expect(r[1].content).toMatch(/không kê thuốc/);
  }, T);
  it("'cái đó thì sao?' → hỏi lại đúng 2 hướng, giữ triệu chứng đã kể", async () => {
    const r = await chat(["mình bị đau đầu 2 ngày rồi", "cái đó thì sao?", "Khi nào cần đi khám?"]);
    expect(r[1].sx).toContain("headache");
    expect(r[1].quick).toContain("Khi nào cần đi khám?");
    expect(r[2].health).toBeTruthy(); // mạch SỨC KHOẺ…
    expect(r[2].heart).toBeUndefined(); // …không phải mạch tâm sự
    expect(r[2].unk).toBeUndefined();
  }, T);
  it("'không phải' → Lomi nhận hiểu sai, bỏ triệu chứng vừa gán", async () => {
    const m = await last(["mình bị đau đầu", "không phải"]);
    expect(m.content).toMatch(/hiểu chưa đúng/);
    expect(m.sx).toBeUndefined();
  }, T);
  it("Lomi hỏi mở 'muốn hỏi chuyện gì về sức khoẻ?' mà đáp 'ừ' → mời nói cụ thể, vẫn ở mạch sức khoẻ", async () => {
    const m = await last(["Lomi có tư vấn sức khỏe không?", "ừ"]);
    expect(m.health).toBeTruthy(); // mạch SỨC KHOẺ…
    expect(m.heart).toBeUndefined(); // …không phải mạch tâm sự
    expect(m.content).toMatch(/triệu chứng/);
  }, T);
});

describe("Tarot — giữ trải bài và câu hỏi", () => {
  it("'bói tarot xem …' bói ĐÚNG câu hỏi (không biến thành lá bài hôm nay)", async () => {
    const m = await last(["bói tarot xem người ấy có còn tình cảm với mình không"]);
    expect(m.tarot?.question).toMatch(/người ấy có còn tình cảm/i);
    expect(m.content).not.toMatch(/Nối tiếp chuyện mình đang nói lúc nãy|mạch chuyện nãy giờ/); // câu đầu tiên thì chưa có "lúc nãy"
  }, T);
  it("'còn nếu ngược thì sao?' → giải nghĩa ngược của CHÍNH các lá vừa rút, đúng câu hỏi; 'rút thêm' vẫn theo trải đó", async () => {
    const r = await chat(["bói tarot xem người ấy có còn tình cảm với mình không", "còn nếu ngược thì sao?", "rút thêm"]);
    expect(r[1].tarot).toBeUndefined(); // không rút trải mới cho câu "ngược thì sao"
    expect(r[1].content).toMatch(/người ấy có còn tình cảm/i);
    expect(r[1].content).toMatch(/ngược/);
    expect(r[2].tarot?.cards.length).toBeGreaterThan(0);
  }, T);
  it("'thế còn công việc?' sau khi bói → bói tiếp chủ đề công việc", async () => expect((await last(["bói tarot xem người ấy có còn tình cảm với mình không", "thế còn công việc?"])).tarot).toBeTruthy(), T);
});

describe("Câu trả lời cho câu Lomi vừa hỏi", () => {
  it("'cuối tuần không biết làm gì' không thành chuyện tâm lý; Lomi hỏi 'A, B hay C?' mà đáp 'ừ' → hỏi lại, không tự chọn bói", async () => {
    const r = await chat(["cuối tuần không biết làm gì", "ừ"]);
    expect(r[0].heart).toBeUndefined();
    expect(r[0].content).not.toMatch(/hoang mang|suy nghĩ nhiều|overthink/i);
    expect(r[1].tarot).toBeUndefined();
    expect(r[1].quick).toEqual(r[0].quick);
  }, T);
  it("Lomi mời quay lại chủ đề cũ → 'ừ' → quay lại đúng chủ đề đó", async () => {
    const r = await chat(["mình bị đau đầu 2 ngày rồi", "hôm nay ăn gì", "ý mình là cái lúc nãy", "ừ"]);
    expect(r[2].content).toMatch(/sức khoẻ/);
    expect(r[2].content).not.toMatch(/gọi chị/); // "ý mình là cái…" không phải "mình là c(hị)"
    expect(r[3].health).toBeTruthy(); // mạch SỨC KHOẺ…
    expect(r[3].heart).toBeUndefined(); // …không phải mạch tâm sự
  }, T);
  it("vừa hỏi về app, hỏi trống 'cái đó thì sao?' → không nhảy sang câu hỏi khác", async () => {
    const r = await chat(["làm sao đăng ưu đãi?", "cái đó thì sao?"]);
    expect(r[1].faqId).toBe(r[0].faqId);
    expect(r[1].quick).toEqual(r[0].quick);
  }, T);
  it("không có ngữ cảnh thì hỏi lại ngắn gọn, không đoán", async () => {
    const m = await last(["cái này dùng sao?"]);
    expect(m.unk).toBeUndefined();
    expect(m.content).toMatch(/\?/);
  }, T);
});

describe("Nghe kể chuyện — tự nhiên, không lặp câu mẫu", () => {
  it("đang kể chuyện đi câu cá: các câu kể tiếp không bị báo 'chưa được học', không lặp 'kể thêm' ở mọi lượt", async () => {
    const r = await chat(["hôm qua anh đi câu cá với mấy đứa bạn", "vui lắm", "câu được mấy con cá to", "xong về nướng ăn luôn"]);
    expect(r[0].content).toMatch(/câu cá/); // nhắc lại đúng việc vừa kể
    for (const m of r) expect(m.unk).toBeUndefined();
    expect(r.filter((m) => /kể thêm|kể tiếp/i.test(m.content)).length).toBeLessThanOrEqual(2);
    expect(new Set(r.map((m) => m.content)).size).toBe(r.length);
  }, T);
  it("mẩu chi tiết ngắn được nhắc lại, không hỏi 'ý bạn là sao'", async () => expect((await last(["mẹ em mới mua xe", "xe máy"])).content).toMatch(/^Xe máy hả/), T);
  it("chuyện vui không bị đọc thành tâm sự nặng nề vì một chữ 'gia đình' / 'sếp'", async () => {
    const a = await chat(["a đang tính đi Nha Trang", "tuần sau", "đi với gia đình"]);
    for (const m of a) {
      expect(m.heart).toBeUndefined();
      expect(m.faqId).toBeUndefined();
      expect(m.unk).toBeUndefined();
    }
    const b = await last(["hôm nay a vui lắm", "a vừa được tăng lương", "sếp khen nữa"]);
    expect(b.content).not.toMatch(/áp lực|bị la|xúc phạm/);
  }, T);
  it("câu kể đáp lại câu Lomi hỏi ('quán gần nhà') không bị hiểu là nhờ tìm quán", async () => expect((await last(["a mới ăn xong phở", "ngon lắm", "quán gần nhà"])).search).toBeUndefined(), T);
  it("đang nghe kể mà gặp câu khác hẳn chuyện đang kể → vẫn nói thật là chưa biết", async () => {
    const m = await last(["a thấy lạ lạ", "bitcoin hôm nay lên 100k"]);
    expect(m.unk).toBe("bitcoin hôm nay lên 100k");
  }, T);
  it("'a đang chán' không bị hiểu thành hỏi về 'chặn' người dùng", async () => {
    const m = await last(["a đang chán"]);
    expect(m.unk).toBeUndefined();
    expect(m.content).toMatch(/chán/i);
    expect(isAppish("a đang chán")).toBe(false);
    expect(isAppish("chặn người này sao")).toBe(true);
  }, T);
});

describe("Tư vấn kinh doanh — giữ chủ đề đang hỏi", () => {
  it("vắng khách → 'quán cà phê' → 'buổi sáng' vẫn là tư vấn chuyện vắng khách cho quán cà phê", async () => {
    const r = await chat(["quán mình vắng khách quá", "quán cà phê", "buổi sáng"]);
    for (const m of r) expect((m.biz as { topic?: string })?.topic).toBe("slow");
    expect((r[2].biz as { noun?: string }).noun).toMatch(/cà phê/);
  }, T);
});

describe("Câu Lomi bí — giữ câu nguyên văn", () => {
  it("unk = câu người dùng gõ; unkKey = câu đã chuẩn hoá để tra / tự học", async () => {
    const raw = "thủ đô nước Pháp là j vậy";
    const m = await last([raw]);
    expect(m.unk).toBe(raw);
    expect(m.unkKey).toBe(expandTeen(raw));
    expect(m.unkKey).not.toBe(raw);
  }, T);
});

// 08/10 — "Đang nói chuyện sức khoẻ" KHÁC "đang tâm sự". Lỗi thật anh Kir gặp: hỏi về bệnh gout mà Lomi đáp
// "Chuyện này làm anh bận lòng nhiều không?" / "Giờ điều anh mong nhất là gì?" (câu của mạch tâm sự).
const HEART_LINES = /bận lòng|mong nhất là gì|kể tiếp, từ từ thôi|kể thêm cho .* hiểu rõ hơn|lúc đó .* thấy sao|vẫn ở đây nè/i;
describe("Sức khoẻ ≠ tâm sự — chuỗi bệnh gout", () => {
  it("đúng chuỗi anh Kir test: hỏi khả năng → nhắc bệnh → nhắc lại → kiêng gì → còn bia → lo quá", async () => {
    const r = await chat(["E biết cách chữa bệnh gout k", "Ừm a hỏi về bệnh gout", "Bệnh gút á", "Gout kiêng gì?", "Còn bia thì sao?", "A lo quá vì bệnh này"]);
    // 1) trả lời "có" trong giới hạn, mở mạch SỨC KHOẺ và nhớ luôn bệnh được hỏi
    expect(r[0].content).toMatch(/Được chứ/);
    expect(r[0].content).toMatch(/không kê thuốc/);
    expect(r[0].health?.subject).toBe("diet:gout");
    // 2–5) vẫn là chuyện sức khoẻ về gout, KHÔNG phải tâm sự
    for (const m of r.slice(0, 5)) {
      expect(m.heart).toBeUndefined();
      expect(m.health?.subject).toBe("diet:gout");
      expect(m.content).not.toMatch(HEART_LINES);
      expect(m.unk).toBeUndefined();
    }
    expect(r[1].content).toMatch(/gout/i);
    expect(r[1].quick).toEqual(["Gout là gì?", "Gout nên làm gì?", "Gout kiêng gì?"]);
    expect(r[2].quick).toEqual(r[1].quick); // "Bệnh gút á" → vẫn bệnh gout, không lặp cả bảng kiêng cữ
    expect(r[3].diet).toBe("gout");
    expect(r[4].content).toMatch(/tránh bia/);
    // 6) có tín hiệu cảm xúc → LÚC NÀY mới mở mạch tâm sự, và vẫn nhớ đang nói về gout
    expect(r[5].heart).toBeTruthy();
    expect(r[5].health?.subject).toBe("diet:gout");
    expect(r[5].content).toMatch(/gout/);
  }, T);
  it("câu đầu tiên (chưa có ngữ cảnh) cũng không rơi vào tâm sự", async () => {
    for (const t of ["a hỏi về bệnh gout", "bệnh gout", "a bị gout"]) {
      const m = await last([t]);
      expect(m.heart, t).toBeUndefined();
      expect(m.health?.subject, t).toBe("diet:gout");
      expect(m.content, t).not.toMatch(HEART_LINES);
      expect(m.quick, t).toContain("Gout kiêng gì?");
    }
    expect((await last(["a bị gout"])).content).toMatch(/đang bị \*\*gout\*\*/);
  }, T);
  it("hỏi kiến thức → trả lời kiến thức", async () => {
    expect((await last(["bệnh gout là gì?"])).content).toMatch(/Gút \(gout\).*khớp/s);
    expect((await last(["cách chữa bệnh gout"])).content).toMatch(/không kê thuốc/);
    expect((await last(["đang bị gout thì uống bia được không?"])).diet).toBe("gout");
    expect((await last(["gout có đáng sợ không"])).heart).toBeUndefined(); // hỏi mức độ nguy hiểm, không phải kể cảm xúc
  }, T);
  it("có cảm xúc → tâm sự + vẫn giữ chuyện sức khoẻ", async () => {
    for (const t of ["a lo vì bị gout", "a buồn vì bệnh gout"]) {
      const m = await last([t]);
      expect(m.heart, t).toBeTruthy();
      expect(m.health?.subject, t).toBe("diet:gout");
    }
    const m = await last(["a đang rất sợ bệnh này"]);
    expect(m.heart).toBeTruthy();
    expect(m.health).toBeTruthy();
  }, T);
  it("đang tâm sự mà hỏi lại kiến thức → trả lời kiến thức ngay; đang tâm sự chuyện khác thì nhắc tên bệnh chưa phải là hỏi", async () => {
    const r = await chat(["a buồn quá", "tại bệnh gout đó", "gout kiêng gì?"]);
    expect(r[1].heart).toBe("sad"); // vẫn là tâm sự…
    expect(r[1].health?.subject).toBe("diet:gout"); // …nhưng đã nhớ bệnh
    expect(r[2].heart).toBeUndefined();
    expect(r[2].diet).toBe("gout");
  }, T);
});

describe("Sức khoẻ ≠ tâm sự — không riêng gì gout", () => {
  it("sau câu trả lời khả năng, nêu bất kỳ bệnh / thuốc / xét nghiệm nào cũng đi tiếp mạch sức khoẻ", async () => {
    const cases: [string, (m: Awaited<ReturnType<typeof last>>) => unknown, unknown][] = [
      ["a hỏi về tiểu đường", (m) => m.health?.subject, "diet:dm"],
      ["huyết áp", (m) => m.health?.subject, "diet:htn"],
      ["a hỏi về gan", (m) => m.health?.subject, "diet:liver"],
      ["bệnh thận", (m) => m.health?.subject, "diet:kidney"],
      ["đau dạ dày", (m) => !!m.sx?.length, true],
      ["paracetamol", (m) => m.hsub, "paracetamol"],
      ["xét nghiệm máu", (m) => m.hsub, "bloodtest"],
    ];
    for (const [t, get, want] of cases) {
      const m = await last(["Lomi có tư vấn sức khỏe không?", t]);
      expect(m.heart, t).toBeUndefined();
      expect(m.health, t).toBeTruthy();
      expect(m.content, t).not.toMatch(HEART_LINES);
      expect(get(m), t).toBe(want);
    }
  }, 60000);
  it("câu nối không nhắc lại tên bệnh dùng bệnh đang nói: là gì → chữa sao → khám ở đâu → kiêng gì → còn trái cây", async () => {
    const r = await chat(["a hỏi về tiểu đường", "nó là gì?", "vậy chữa sao?", "khám ở đâu?", "kiêng gì?", "còn trái cây thì sao?"]);
    for (const m of r) {
      expect(m.health?.subject).toBe("diet:dm");
      expect(m.heart).toBeUndefined();
      expect(m.unk).toBeUndefined();
    }
    expect(r[1].content).toMatch(/Tiểu đường.*đường huyết/s);
    expect(r[2].content).toMatch(/không kê thuốc/);
    expect(r[3].content).toMatch(/Nội tiết/);
    expect(r[4].diet).toBe("dm");
    expect(r[5].content).toMatch(/trái cây/);
  }, T);
  it("bệnh Lomi chỉ có phần kiêng cữ → nói rõ mình có gì, không mời hỏi thứ chưa biết", async () => {
    const m = await last(["Lomi có tư vấn sức khỏe không?", "bệnh thận"]);
    expect(m.quick).toEqual(["Bệnh thận kiêng gì?"]);
    expect(m.content).toMatch(/chưa có thông tin riêng/);
  }, T);
  it("bệnh Lomi chưa có kiến thức → nói thật là chưa biết (kèm 💡), vẫn ở mạch sức khoẻ — không đáp như nghe tâm sự", async () => {
    const r = await chat(["a hỏi về bệnh lupus", "lupus á"]);
    for (const m of r) {
      expect(m.unk).toBeTruthy();
      expect(m.health).toBeTruthy();
      expect(m.heart).toBeUndefined();
      expect(m.content).not.toMatch(HEART_LINES);
    }
  }, T);
  it("cảm ơn giữa chừng không làm mất bệnh đang nói", async () => {
    const r = await chat(["gout kiêng gì", "cảm ơn", "còn hải sản?"]);
    expect(r[1].health?.subject).toBe("diet:gout");
    expect(r[2].content).toMatch(/hải sản/);
    expect(r[2].diet).toBe("gout");
  }, T);
  it("triệu chứng: kể chi tiết vẫn theo mạch sức khoẻ; than lo mới sang tâm sự; hỏi lại sức khoẻ thì quay về", async () => {
    const r = await chat(["mình bị đau đầu", "2 ngày rồi", "a lo quá", "có sao không"]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].sx).toContain("headache");
    expect(r[2].heart).toBeTruthy();
    expect(r[2].sx).toContain("headache");
    expect(r[3].heart).toBeUndefined();
    expect(r[3].health).toBeTruthy();
  }, T);
  it("đang nói chuyện sức khoẻ mà nhờ gợi ý món ăn hôm nay → là chuyện ăn uống, không ép về kiêng cữ", async () => {
    const m = await last(["🩺 Sức khoẻ", "huyết áp", "hôm nay ăn gì"]);
    expect(m.dishAsk).toBeTruthy();
  }, T);
  it("tâm sự thật thì vẫn như cũ (không bị mạch sức khoẻ chen vào)", async () => {
    const r = await chat(["người ấy im lặng mấy ngày rồi", "ừ"]);
    expect(r[1].heart).toBeTruthy();
    expect(r[1].health).toBeUndefined();
  }, T);
});

describe("lib/lomiHealthTopic — kiểm tra trực tiếp", () => {
  it("nhận chủ thể từ hai bảng sẵn có (kiêng cữ + tình trạng), không viết riêng cho từng bệnh", () => {
    expect(healthSubjectOf("a hỏi về bệnh gout")).toMatchObject({ subject: "diet:gout", label: "gout", diet: "gout", cond: "gout" });
    expect(healthSubjectOf("bệnh gút á")?.subject).toBe("diet:gout");
    expect(healthSubjectOf("tiểu đường")?.cond).toBe("diabetes");
    expect(healthSubjectOf("huyết áp cao")?.cond).toBe("highbp");
    expect(healthSubjectOf("viêm xoang là gì")?.cond).toBe("sinusitis");
    expect(healthSubjectOf("cúm là gì")?.subject).toBe("cond:flu"); // chỉ có trong bảng tình trạng
    expect(healthSubjectOf("a hỏi về gan")?.subject).toBe("diet:liver");
    expect(healthSubjectOf("ăn gan được không")).toBeNull(); // "gan" là món ăn khi không ở mạch sức khoẻ / không hỏi về bệnh
    expect(healthSubjectOf("hôm nay trời đẹp")).toBeNull();
    expect(healthSubjectOf("em đang mang thai")).toBeNull(); // hoàn cảnh, không phải bệnh
    expect(healthSubjectOf("mình bị mất ngủ")).toBeNull(); // nhóm tâm lý để thư viện tâm sự lo
  });
  it("tín hiệu cảm xúc: lo / sợ / buồn — không tính 'buồn nôn', 'chưa', câu hỏi mức độ nguy hiểm", () => {
    for (const t of ["a lo quá vì bệnh này", "a buồn vì bệnh gout", "a đang rất sợ bệnh này", "a lo vì bị gout", "em hoang mang quá"]) expect(healthFeeling(t), t).toBe(true);
    for (const t of ["a hỏi về bệnh gout", "bệnh gút á", "gout kiêng gì?", "a bị gout", "buồn nôn quá", "gout có đáng sợ không", "bệnh gout là gì"]) expect(healthFeeling(t), t).toBe(false);
  });
  it("'chữa' ≠ 'chưa': 'a chưa bị gout' không phải hỏi cách chữa", () => {
    expect(healthTopicReply("cách chữa bệnh gout")?.aspect).toBe("care");
    expect(healthTopicReply("gout chữa sao")?.aspect).toBe("care");
    expect(healthTopicReply("a chưa bị gout", undefined, "aspect")).toBeNull();
  });
  it("câu dài đang kể chuyện có nhắc tên bệnh → không chen bảng chọn vào", () => {
    expect(healthTopicReply("bạn em bị gout nên nó kiêng dữ lắm luôn á trời", undefined, "menu")).toBeNull();
  });
});

describe("Lớp ngữ cảnh (lib/lomiConvo) — kiểm tra trực tiếp", () => {
  it("đọc đúng kiểu câu trả lời Lomi đang chờ", () => {
    expect(askedKind("Bạn muốn tâm sự, bói bài hay đi tìm quán ngon?")).toBe("choice");
    expect(askedKind("Muốn Lomi tìm quán cà phê cho không?")).toBe("yesno");
    expect(askedKind("Bạn đói hả? Mở Khám phá xem nha.")).toBe("yesno");
    expect(askedKind("Bạn muốn hỏi chuyện gì về sức khoẻ nè?")).toBe("open");
    expect(askedKind("Đói thì phải ăn liền chứ!")).toBeUndefined();
  });
  it("chưa có ngữ cảnh / Lomi đang chờ đúng một câu trả lời → không ghép ngữ cảnh", () => {
    expect(resolveTurn("quán nào ổn?", "quán nào ổn?", convoOf([]))).toBeNull();
    const waiting = convoOf([{ role: "user", content: "bói bài" }, { role: "assistant", content: "Bạn muốn hỏi bài điều gì?", tarotAwait: true }]);
    expect(resolveTurn("quán nào ổn?", "quán nào ổn?", waiting)).toBeNull();
  });
  it("món đang nói chỉ được nhớ trong 2 lượt gần nhất", () => {
    const near = convoOf([{ role: "user", content: "a đang tính đi cf" }, { role: "assistant", content: "Đi cà phê hả ☕" }]);
    expect(near.dish?.id).toBe("cafe");
    const far = convoOf([
      { role: "user", content: "a đang tính đi cf" },
      { role: "assistant", content: "Đi cà phê hả ☕" },
      { role: "user", content: "hôm nay mệt ghê" },
      { role: "assistant", content: "Bạn vất vả rồi 💚" },
      { role: "user", content: "sếp giao nhiều việc" },
      { role: "assistant", content: "Nghe mà thương ghê 🥺" },
    ]);
    expect(far.dish).toBeUndefined();
  });
});

describe("Lỗi câu đơn lộ ra khi chạy chuỗi (đã sửa kèm)", () => {
  it("senseCanon không làm mất câu hỏi bói / phần kể đi kèm", () => {
    const q = "bói tarot xem người ấy có còn tình cảm với mình không";
    expect(senseCanon(q)).toBe(q);
    expect(senseCanon("rút giùm a một lá bài đi")).toBe("bói một lá cho hôm nay");
    expect(senseCanon("hướng dẫn a dùng app để nhận ưu đãi")).toBe("hướng dẫn a dùng app để nhận ưu đãi");
  });
  it("'phô mai', 'phố' không phải phở; gõ không dấu 'pho' vẫn là phở", () => {
    expect(detectDish("nhiều phô mai")).toBeUndefined();
    expect(detectDish("đi dạo phố")).toBeUndefined();
    expect(detectDish("an pho di")?.id).toBe("pho");
    expect(detectDish("thèm phở quá")?.id).toBe("pho");
  });
  it("'ý mình là cái lúc nãy' không phải tự xưng là chị", () => {
    expect(explicitAddr("ý mình là cái lúc nãy")).toBeNull();
    expect(explicitAddr("mình là c nha")).toBe("chị");
    expect(explicitAddr("tui là anh nha")).toBe("anh");
  });
});
