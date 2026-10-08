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

// ─────────────────────────────────────────────────────────────────────────────
// 09/10 — HIỂU THEO CẤU TRÚC CÂU (lib/lomiParse + lib/lomiFrame), chạy qua khung chat thật.
// Các câu ở đây không có câu mẫu riêng trong code: Lomi đọc chủ ngữ / phủ định / thời gian / loại câu rồi ghép câu đáp.
// ─────────────────────────────────────────────────────────────────────────────
const mem = () => JSON.parse(localStorage.getItem("lomi-mem:test-user") ?? "{}") as { addr?: string; sits?: Record<string, number> };

describe("Cấu trúc câu — câu Kir gặp và các câu cùng kiểu", () => {
  it("“Chào e bữa tối nhé” → chào lại buổi tối, không báo “chưa tiếp thu”", async () => {
    const m = await last(["Chào e bữa tối nhé"]);
    expect(m.unk).toBeUndefined();
    expect(m.content).toMatch(/^Chào buổi tối nha/);
  }, T);
  it("chào → kể chuyện đã qua → chúc ngủ ngon: không lượt nào bị bí, không lượt nào đáp lạc đề", async () => {
    const r = await chat(["Chào e bữa tối nhé", "tối qua a ngủ ngon lắm", "mai a đi Đà Nẵng chơi", "chúc e ngủ ngon nha"]);
    for (const m of r) expect(m.unk).toBeUndefined();
    expect(r[1].content).toMatch(/^Tối qua ngủ ngon hả/); // không phải lời chúc ngủ ngon
    expect(r[1].content).not.toMatch(/Mơ đẹp|Chúc (anh|bạn) ngủ/);
    expect(r[2].content).toMatch(/^Mai đi Đà Nẵng chơi hả/);
    expect(r[3].content).toMatch(/Anh cũng ngủ thật ngon/); // người dùng xưng "a" → Lomi gọi anh; "e" là Lomi
  }, T);
  it("lời chúc có dịp bất kỳ → cảm ơn + chúc lại đúng dịp đó", async () => {
    expect((await last(["chúc e cuối tuần vui vẻ nhé"])).content).toMatch(/cuối tuần vui vẻ/);
    expect((await last(["buổi tối an lành nha e"])).content).toMatch(/buổi tối an lành/);
  }, T);
});

describe("Cấu trúc câu — phủ định", () => {
  it("“a chưa đói” không bị mời ăn; lát sau “giờ đói rồi” thì mới mời", async () => {
    const r = await chat(["a chưa đói", "giờ đói rồi", "ăn gì giờ"]);
    expect(r[0].content).toMatch(/^Chưa đói/);
    expect(r[0].dishAsk).toBeUndefined();
    expect(r[0].quick ?? []).toHaveLength(0);
    expect(r[1].content).toMatch(/Đói thì ăn|Bụng réo/);
    expect(r[2].dishAsk).toBeTruthy();
  }, T);
  it("“a không buồn đâu” không bị an ủi như đang buồn", async () => {
    const m = await last(["a không buồn đâu"]);
    expect(m.heart).toBeUndefined();
    expect(m.content).toMatch(/Không buồn là tốt/);
  }, T);
  it("“a không thèm pizza” không bị hỏi chọn loại pizza", async () => {
    const m = await last(["a không thèm pizza"]);
    expect(m.dishPick).toBeUndefined();
    expect(m.content).toMatch(/Không thèm pizza hả/);
  }, T);
  it("“hôm nay a không khoẻ” → mở chuyện sức khoẻ, kể triệu chứng là vào đúng mạch", async () => {
    const r = await chat(["hôm nay a không khoẻ", "a bị đau đầu"]);
    expect(r[0].health).toBeTruthy();
    expect(r[0].heart).toBeUndefined();
    expect(r[1].sx).toContain("headache");
  }, T);
  it("còn “a không vui lắm” vẫn là chuyện buồn → mạch tâm sự như cũ", async () => expect((await last(["a không vui lắm"])).heart).toBe("sad"), T);
});

describe("Cấu trúc câu — chủ ngữ không phải người nói", () => {
  it("khen con mèo nhà mình → Lomi không nhận vơ", async () => {
    const m = await last(["con mèo nhà a dễ thương lắm"]);
    expect(m.content).toMatch(/^Con mèo nhà anh dễ thương/);
    expect(m.content).not.toMatch(/đỏ mặt|Lomi vui cả ngày/);
  }, T);
  it("còn khen Lomi thì vẫn là khen Lomi", async () => expect((await last(["lomi giỏi quá"])).content).toMatch(/đỏ mặt|vui cả ngày|cố gắng giỏi hơn|dễ thương lắm/), T);
  it("“xe a hư rồi” không phải báo lỗi app; “app bị lag quá” thì vẫn là lỗi app", async () => {
    const m = await last(["xe a hư rồi"]);
    expect(m.issue).toBeUndefined();
    expect(m.content).toMatch(/^Xe anh hư/);
    expect((await last(["app bị lag quá"])).issue).toBe("lag");
  }, T);
  it("mẹ ốm → “bị cảm thôi” vẫn là nói về mẹ → rồi “a lo quá” mới là tâm sự", async () => {
    const r = await chat(["mẹ a đang ốm", "bị cảm thôi", "a lo quá"]);
    expect(r[0].content).toMatch(/^Mẹ anh ốm hả/);
    expect(r[0].about).toEqual({ text: "mẹ anh", kind: "third" });
    expect(r[1].content).toMatch(/Mong mẹ( anh)? mau khoẻ/);
    expect(r[1].content).not.toMatch(/Thương anh ghê|mong anh mau khoẻ/i); // người ốm là mẹ, không phải người dùng
    // 10/10: "a lo quá" → an ủi, và vẫn nhớ người đang ốm là mẹ (mạch chuyện lib/lomiStory), không phải bài "lo âu" chung chung.
    expect(r[2].content).toMatch(/Mẹ anh ốm thì lo là phải/);
    expect(r[2].thread?.who.text).toBe("mẹ anh");
  }, T);
  it("con sốt → lớp sức khoẻ trả lời nhưng nói đúng người bệnh; “từ tối qua” là câu trả lời cho “bị bao lâu rồi?”", async () => {
    const r = await chat(["con a bị sốt", "từ tối qua"]);
    expect(r[0].sx).toContain("fever");
    expect(r[0].content).toMatch(/^Con anh đang bị \*\*sốt\*\*/);
    expect(r[1].unk).toBeUndefined();
    // 10/10: ghi nhận câu trả lời rồi hỏi tiếp điều còn thiếu VỀ ĐÚNG NGƯỜI BỆNH (trước đây: "Còn triệu chứng nào kèm theo không bạn?").
    expect(r[1].content).toMatch(/^Từ tối qua rồi hả/);
    expect(r[1].content).toMatch(/Con anh đã đi khám chưa/);
    expect(r[1].sx).toContain("fever"); // vẫn ở mạch sức khoẻ
  }, T);
  it("chuyện của người khác không bị ghi vào trí nhớ như hoàn cảnh của người dùng", async () => {
    await chat(["bạn a mới chia tay"]);
    expect(mem().sits ?? {}).not.toHaveProperty("heartbroken");
    await chat(["mẹ a đang ốm"]);
    expect(mem().sits ?? {}).not.toHaveProperty("sick");
    await chat(["a mới chia tay"]);
    expect(mem().sits).toHaveProperty("heartbroken"); // còn chuyện của chính mình thì vẫn nhớ
  }, T);
});

describe("Cấu trúc câu — trong lúc tâm sự", () => {
  it("thú cưng mất → chia buồn (không phải lời khuyên mỏi mắt vì chữ “mất” bỏ dấu thành “mắt”), vẫn giữ mạch tâm sự", async () => {
    const r = await chat(["a buồn quá", "con mèo nhà a mới mất"]);
    expect(r[1].heart).toBe("sad");
    expect(r[1].content).toMatch(/chia buồn/);
    expect(r[1].content).not.toMatch(/màn hình|mỏi mắt/);
  }, T);
  it("“a không muốn nói nữa” → dừng lại, không hỏi dồn; chúc ngủ ngon thì chúc lại", async () => {
    const r = await chat(["a buồn quá", "a không muốn nói nữa", "chúc e ngủ ngon"]);
    expect(r[1].content).toMatch(/dừng ở đây/);
    expect(r[1].heart).toBeUndefined();
    expect(r[2].content).toMatch(/ngủ thật ngon/);
  }, T);
  it("còn kể tiếp chuyện buồn thì mạch tâm sự vẫn chạy như cũ", async () => {
    const r = await chat(["a buồn quá", "mẹ a khó tính lắm"]);
    expect(r[1].heart).toBeTruthy();
  }, T);
});

describe("Cấu trúc câu — tham chiếu “cái đó” theo ngữ cảnh", () => {
  it("đang chọn khẩu vị pizza → “Còn cái đó thì sao?” → Lomi nói rõ đang hiểu là pizza, chưa tự đi tìm quán", async () => {
    const r = await chat(["a đang thèm pizza quá", "Còn cái đó thì sao?", "nhiều phô mai"]);
    expect(r[1].content).toMatch(/\*\*pizza\*\*/);
    expect(r[1].dishPick).toBe(true);
    expect(r[1].places ?? []).toHaveLength(0);
    expect(r[2].dish).toBe("pizza"); // câu trả lời khẩu vị sau đó vẫn dùng được
    expect((r[2].places ?? []).length).toBeGreaterThan(0);
  }, T);
  it("đang nói về gout → “còn cái đó thì sao” → hỏi lại đúng về gout, giữ mạch sức khoẻ", async () => {
    const r = await chat(["E biết cách chữa bệnh gout k", "còn cái đó thì sao", "Gout kiêng gì?"]);
    expect(r[1].content).toMatch(/\*\*gout\*\*/);
    expect(r[1].health?.diet).toBe("gout");
    expect(r[2].diet).toBe("gout");
  }, T);
});

describe("Cấu trúc câu — rủ, dự định, chỗ chơi", () => {
  it("rủ đi ăn lẩu → Lomi mời tìm quán lẩu → “ừ” → tìm quán lẩu", async () => {
    const r = await chat(["tối nay đi ăn lẩu không e", "ừ"]);
    expect(r[0].unk).toBeUndefined();
    expect(r[0].content).toMatch(/quán lẩu/);
    expect(r[1].dish).toBe("lau");
  }, T);
  it("rủ đi cà phê → “ừ” → quán cà phê → “yên tĩnh” → lọc lại", async () => {
    const r = await chat(["Tối nay đi cf không?", "ừ", "yên tĩnh"]);
    expect(r[1].dish).toBe("cafe");
    expect(r[2].dish).toBe("cafe");
    expect(r[2].content).toMatch(/yên tĩnh/);
  }, T);
  it("“muốn đi đâu đó chơi” → gợi ý chỗ chơi (không phải câu hỏi về app)", async () => {
    const m = await last(["cuối tuần này a muốn đi đâu đó chơi"]);
    expect(m.faqId).toBeUndefined();
    expect(m.search?.mode).toBe("go");
  }, T);
  it("“cuối tuần không biết làm gì” là chuyện chọn việc lúc rảnh, không phải tâm lý → chip dẫn tới gợi ý chỗ chơi", async () => {
    const r = await chat(["Cuối tuần không biết làm gì", "Cuối tuần đi đâu chơi?"]);
    expect(r[0].heart).toBeUndefined();
    expect(r[0].content).toMatch(/chưa biết làm gì/);
    expect(r[1].search?.mode).toBe("go");
  }, T);
  it("kể dự định rồi kể tiếp: vẫn là một mạch nghe kể", async () => {
    const r = await chat(["mai a đi Đà Nẵng chơi", "đi với vợ", "cuối tuần a về"]);
    expect(r[0].talk).toBe(1);
    expect(r[1].talk).toBe(2);
    expect(r[2].content).toMatch(/^Cuối tuần về hả/);
    for (const m of r) expect(m.unk).toBeUndefined();
  }, T);
  it("“chiều nay a đi đá bóng” không phải triệu chứng da bong tróc", async () => {
    const m = await last(["chiều nay a đi đá bóng"]);
    expect(m.sx ?? []).toHaveLength(0);
    expect(m.content).toMatch(/đi đá bóng hả/);
  }, T);
  it("“a đang ngồi ở quán cà phê” là kể mình đang ở đâu, không phải nhờ tìm quán; “a đang tìm quán cà phê” thì vẫn tìm", async () => {
    const a = await last(["a đang ngồi ở quán cà phê"]);
    expect(a.dish).toBeUndefined();
    expect(a.content).toMatch(/^Đang ngồi quán cà phê hả/);
    expect((await last(["a đang tìm quán cà phê"])).dish).toBe("cafe");
  }, T);
});

describe("Cấu trúc câu — hỏi thăm Lomi và xưng hô", () => {
  it("“e có buồn không” là hỏi Lomi, không phải người dùng đang buồn", async () => {
    const m = await last(["e có buồn không"]);
    expect(m.heart).toBeUndefined();
    expect(m.content).toMatch(/robot/);
  }, T);
  it("“tối nay rảnh không e” → Lomi trả lời về mình", async () => expect((await last(["tối nay rảnh không e"])).content).toMatch(/lúc nào cũng rảnh/), T);
  it("Lomi hỏi “ăn chưa” → “a ăn rồi” → đáp đúng là đã ăn", async () => {
    const r = await chat(["e ăn tối chưa", "a ăn rồi"]);
    expect(r[1].content).toMatch(/^Ăn rồi hả/);
  }, T);
  it("gọi Lomi là “e” trong câu hỏi / lời chúc không biến người dùng thành “em”", async () => {
    await chat(["e ăn tối chưa"]);
    expect(mem().addr).toBe("bạn-em");
    const m = await last(["chúc e ngủ ngon nhé"]);
    expect(mem().addr).toBe("bạn-em");
    expect(m.content).not.toMatch(/Chúc em ngủ|Em cũng ngủ/);
    await chat(["tháng sau a cưới"]); // tự xưng "a" với động từ lạ → vẫn học được là anh
    expect(mem().addr).toBe("anh");
  }, T);
});

describe("Cấu trúc câu — không làm hỏng các mạch sẵn có", () => {
  it("câu thuộc lớp chuyên môn vẫn đi đúng lớp đó", async () => {
    expect((await last(["a đang thèm pizza quá"])).dishPick).toBe(true);
    expect((await last(["hôm nay a mệt ghê"])).heart).toBe("tired");
    expect((await last(["a bị đau đầu"])).sx).toContain("headache");
    expect((await last(["làm sao để nhận ưu đãi"])).faqId).toBe("claim");
    expect((await last(["bói cho a một lá đi"])).tarot).toBeTruthy();
    expect((await last(["quán a vắng khách lắm"])).biz).toBeTruthy();
    expect((await last(["đau đầu là do đâu?"])).health).toBeTruthy();
    expect((await last(["rụng tóc"])).sx).toContain("hairloss");
  }, T);
  it("câu Lomi thật sự không biết vẫn nói thật là chưa biết (kèm nút 💡)", async () => {
    expect((await last(["bitcoin hôm nay lên 100k"])).unk).toBeTruthy();
    expect((await last(["thủ đô nước pháp là gì"])).unk).toBeTruthy();
  }, T);
  it("đang chọn khẩu vị thì câu phủ định là câu trả lời khẩu vị, không bị đáp theo khung", async () => {
    const r = await chat(["a thèm pizza", "a không thích hải sản"]);
    expect(r[1].dish).toBe("pizza");
  }, T);
  it("đang nói chuyện sức khoẻ: lời chào chen ngang không làm mất bệnh đang nói; câu kể vẫn là chi tiết sức khoẻ", async () => {
    const r = await chat(["Gout kiêng gì?", "chào e buổi tối nha", "a không uống bia"]);
    expect(r[1].content).toMatch(/^Chào buổi tối/);
    expect(r[1].health?.diet).toBe("gout");
    expect(r[2].diet).toBe("gout");
  }, T);
});

// ─────────────────────────────────────────────────────────────────────────────
// 10/10 — LỖI "VÒNG LẶP CÂU MẪU": Lomi đáp tử tế nhưng không theo nội dung
//   “Chuyện này làm anh bận lòng nhiều không?” → “Em vẫn ở đây nè, anh cứ kể tiếp...” → “Giờ điều anh mong nhất là gì?” → …
// Sáu chuỗi bắt buộc + các chuỗi kiểm tra chống lặp. Mỗi chuỗi chạy qua khung chat thật.
// ─────────────────────────────────────────────────────────────────────────────
const LOOP_LINES = /đang nghe nè 🌿|cứ kể tiếp, từ từ thôi|điều (anh|bạn|chị|em) mong nhất là gì|bận lòng nhiều không|kể thêm cho (em|Lomi) hiểu rõ hơn/;
const lastQuestion = (x: string) => (x.match(/[^.!?\n]*\?/g) ?? []).pop()?.trim() ?? "";

describe("CHAIN 1 — mẹ ốm → đi khám rồi → bác sĩ nói viêm họng → uống thuốc rồi (người bệnh vẫn là mẹ)", () => {
  it("mỗi câu trả lời được ghi vào đúng điều Lomi vừa hỏi, rồi Lomi hỏi tiếp điều còn thiếu", async () => {
    const r = await chat(["Mẹ a đang ốm", "Đi khám rồi", "Bác sĩ nói viêm họng", "Uống thuốc rồi"]);
    // Lomi hỏi "nặng không + khám chưa" → mở mạch chuyện về MẸ
    expect(r[0].thread).toMatchObject({ kind: "care", who: { text: "mẹ anh" }, asked: ["severity", "doctor"] });
    // "Đi khám rồi" = câu trả lời cho "đã đi khám chưa" → hỏi tiếp bác sĩ nói gì (không hỏi lại "đi khám chưa", không "bận lòng nhiều không")
    expect(r[1].thread?.facts.doctor).toBe(true);
    expect(r[1].content).toMatch(/Bác sĩ có nói mẹ anh bị gì không\?/);
    expect(r[1].content).not.toMatch(/đã đi khám chưa/);
    expect(r[1].heart).toBeUndefined(); // không biến thành tâm sự
    // "Bác sĩ nói viêm họng" = chẩn đoán CỦA MẸ, không phải triệu chứng của người dùng
    expect(r[2].thread?.facts.dx).toBe("viêm họng");
    expect(r[2].sx ?? []).toHaveLength(0);
    expect(r[2].content).not.toMatch(/anh đang (bị|có)|Bác sĩ đang bị/i);
    expect(r[2].content).toMatch(/thuốc/); // hỏi tiếp về thuốc
    // "Uống thuốc rồi" → đủ thông tin: khép lại bằng lời động viên, KHÔNG hỏi thêm
    expect(r[3].thread?.facts.meds).toBe(true);
    expect(r[3].thread?.who.text).toBe("mẹ anh");
    expect(r[3].content).toMatch(/mẹ anh được khám và có thuốc rồi/);
    expect(r[3].content).not.toMatch(/\?/);
    for (const m of r) {
      expect(m.unk, m.content).toBeUndefined();
      expect(m.content).not.toMatch(LOOP_LINES);
    }
  }, T);
  it("không hỏi lại điều đã có câu trả lời", async () => {
    const r = await chat(["Mẹ a đang ốm", "Đi khám rồi", "Bác sĩ nói viêm họng", "Uống thuốc rồi", "đỡ rồi"]);
    const qs = r.map((m) => lastQuestion(m.content)).filter(Boolean);
    expect(new Set(qs).size).toBe(qs.length); // không câu hỏi nào lặp lại
    expect(r.slice(1).map((m) => m.content).join(" ")).not.toMatch(/đã đi khám chưa/);
    expect(r[4].content).toMatch(/mừng/);
    expect(r[4].content).toMatch(/Mẹ anh đỡ rồi/);
  }, T);
  it("“Mẹ a á, không phải a” là SỬA CHỦ THỂ: người bệnh là mẹ, và Lomi vẫn nhớ những gì đã biết", async () => {
    const r = await chat(["Mẹ a đang ốm", "Đi khám rồi", "Bác sĩ nói viêm họng", "Uống thuốc rồi", "Mẹ a á, không phải a"]);
    expect(r[4].unk).toBeUndefined();
    expect(r[4].content).toMatch(/người đang ốm là mẹ anh, không phải anh/);
    expect(r[4].content).toMatch(/đã đi khám, bác sĩ nói viêm họng, có thuốc uống rồi/);
    expect(r[4].thread?.who.text).toBe("mẹ anh");
  }, T);
  it("Lomi lỡ đọc triệu chứng thành của người dùng → “Mẹ a á, không phải a” đổi người bệnh sang mẹ", async () => {
    const r = await chat(["a bị đau họng", "Mẹ a á, không phải a", "2 hôm rồi"]);
    expect(r[1].content).toMatch(/người bị là mẹ anh, không phải anh/);
    expect(r[1].thread?.who.text).toBe("mẹ anh");
    expect(r[2].content).toMatch(/Mẹ anh đã đi khám chưa/);
  }, T);
  it("câu trả lời cụt (“chưa”, “rồi”, “có”) được hiểu theo đúng câu Lomi vừa hỏi", async () => {
    const a = await chat(["Mẹ a đang ốm", "chưa"]);
    expect(a[1].thread?.facts.doctor).toBe(false);
    expect(a[1].content).toMatch(/Chưa đi khám hả/);
    const b = await chat(["con chó nhà a bị ốm", "rồi"]);
    expect(b[1].thread?.facts.doctor).toBe(true);
    expect(b[1].content).toMatch(/thú y có nói bé bị gì không/);
    const c = await chat(["bố e bị bệnh", "nặng lắm"]);
    expect(c[1].thread?.facts.severity).toBe(true);
    expect(c[1].content).toMatch(/bố em đã đi khám chưa/); // hỏi nốt điều còn lại trong hai điều vừa hỏi
  }, T);
  it("gõ không dấu vẫn theo được cả chuỗi", async () => {
    const r = await chat(["me a dang om", "di kham roi", "bac si noi viem hong", "uong thuoc roi"]);
    expect(r[1].thread?.facts.doctor).toBe(true);
    expect(r[2].thread?.facts.dx).toBe("viem hong");
    expect(r[3].content).toMatch(/mẹ anh được khám và có thuốc rồi/);
    for (const m of r) expect(m.unk, m.content).toBeUndefined();
  }, T);
  it("hỏi kiến thức giữa chừng vẫn được lớp sức khoẻ trả lời, rồi quay lại đúng mạch về mẹ", async () => {
    const r = await chat(["Mẹ a đang ốm", "Đi khám rồi", "Bác sĩ nói viêm họng", "Uống thuốc rồi", "viêm họng kiêng gì?", "đỡ rồi"]);
    expect(r[4].diet).toBeTruthy();
    expect(r[4].thread?.who.text).toBe("mẹ anh"); // mạch chuyện vẫn được giữ
    expect(r[5].content).toMatch(/Mẹ anh đỡ rồi/);
  }, T);
});

describe("CHAIN 2 — mẹ ốm → “A lo quá”: an ủi nhưng vẫn nhớ người bệnh là mẹ", () => {
  it("an ủi có nhắc tới mẹ; câu sau vẫn theo chuyện của mẹ", async () => {
    const r = await chat(["Mẹ a đang ốm", "A lo quá", "bà ấy lớn tuổi rồi", "đi khám rồi"]);
    expect(r[1].content).toMatch(/Mẹ anh ốm thì lo là phải/);
    expect(r[1].content).toMatch(/thương mẹ/);
    expect(r[1].thread?.who.text).toBe("mẹ anh");
    expect(r[1].content).not.toMatch(/Lo âu làm mình|căng dây đàn/); // không phải bài "lo âu" chung chung
    expect(r[2].content).toMatch(/lớn tuổi/);
    expect(r[2].content).toMatch(/mẹ( anh)? đã đi khám chưa/); // điều Lomi hỏi từ đầu mà chưa được trả lời
    expect(r[3].content).toMatch(/Bác sĩ có nói mẹ anh bị gì không/);
    for (const m of r) expect(m.content).not.toMatch(LOOP_LINES);
  }, T);
  it("“Mẹ a đang ốm” KHÔNG tự thành tâm sự (không hỏi “bận lòng nhiều không”)", async () => {
    const m = await last(["Mẹ a đang ốm"]);
    expect(m.heart).toBeUndefined();
    expect(m.content).not.toMatch(LOOP_LINES);
  }, T);
  it("người dùng tiếp tục nói ra nỗi lo → mạch tâm sự (chăm người bệnh) nghe tiếp, vẫn giữ mạch chuyện về mẹ", async () => {
    const r = await chat(["Mẹ a đang ốm", "A lo quá", "a sợ mẹ có chuyện gì", "đi khám rồi"]);
    expect(r[2].unk).toBeUndefined();
    expect(r[2].heart).toBe("caregiver");
    expect(r[3].content).toMatch(/Bác sĩ có nói mẹ anh bị gì không/);
  }, T);
});

describe("CHAIN 3 — “Người ấy im lặng” → “A có nên nhắn không?”: vẫn là chuyện với người ấy", () => {
  it("các câu nối đều bám người ấy, không rơi về câu tâm sự chung chung", async () => {
    const r = await chat(["Người ấy im lặng", "A có nên nhắn không?", "2 ngày rồi", "a sợ làm phiền", "vậy nhắn gì giờ"]);
    expect(r[0].rel).toBe("người ấy|silence");
    expect(r[1].rel).toBe("người ấy|texting");
    expect(r[1].content).toMatch(/Nhắn cho người ấy|liên quan tới người ấy/);
    // "2 ngày rồi" → vẫn nói về người ấy (trước đây: "Anh đang có người yêu, hay đang thích ai đó?")
    expect(r[2].content).toMatch(/người ấy/);
    expect(r[2].content).not.toMatch(/đang có người yêu, hay đang thích ai/);
    expect(r[2].rel).toBe("người ấy|texting");
    // "a sợ làm phiền" → nhắc lại đúng nỗi lo đó + góc nhìn về chính chuyện nhắn cho người ấy
    expect(r[3].content).toMatch(/^Anh sợ làm phiền hả/);
    expect(r[3].content).toMatch(/người ấy/);
    expect(r[3].content).not.toMatch(/Chuyện tình cảm của (anh|bạn) đang thế nào/);
    expect(r[4].rel).toBe("người ấy|texting");
    for (const m of r) {
      expect(m.heart, m.content).toBeTruthy();
      expect(m.content).not.toMatch(LOOP_LINES);
    }
  }, T);
});

describe("CHAIN 4 — “Đói quá” → “Pizza” → “loại nào ngon?”: vẫn là chuyện pizza", () => {
  it("hỏi loại nào ngon → Lomi hỏi khẩu vị cho đúng món pizza → trả lời khẩu vị → tìm quán pizza", async () => {
    const r = await chat(["Đói quá", "Pizza", "loại nào ngon?", "nhiều phô mai"]);
    expect(r[1].dish).toBe("pizza");
    expect(r[2].dish).toBe("pizza");
    expect(r[2].dishPick).toBe(true);
    expect(r[2].content).toMatch(/pizza/i);
    expect(r[2].content).not.toMatch(/hỏi về chuyện nào/);
    expect(r[3].dish).toBe("pizza");
  }, T);
  it("đang nói một món khác cũng vậy (không riêng pizza)", async () => {
    const r = await chat(["a thèm trà sữa quá", "vị nào ngon?"]);
    expect(r[1].content).not.toMatch(/hỏi về chuyện nào/);
    expect(r[1].dish ?? r[1].dishAsk).toBeTruthy();
  }, T);
});

describe("CHAIN 5 — “Đi cf không?” → “Quán nào?”: vẫn là chuyện cà phê", () => {
  it("quán nào → quán cà phê; thêm điều kiện vẫn là quán cà phê", async () => {
    const r = await chat(["Đi cf không?", "Quán nào?", "gần đây thôi"]);
    expect(r[0].content).toMatch(/cà phê/i);
    expect(r[1].dish).toBe("cafe");
    expect(r[2].dish).toBe("cafe");
  }, T);
});

describe("CHAIN 6 — bói bài → hỏi nối → vẫn là chuyện Tarot", () => {
  it("“lá này nghĩa là sao” giải đúng lá vừa rút; “thế còn tình cảm thì sao?” vẫn là hỏi bài", async () => {
    const r = await chat(["bói một lá cho hôm nay", "lá này nghĩa là sao", "thế còn tình cảm thì sao?"]);
    expect(r[0].tarot).toBeTruthy();
    expect(r[1].unk).toBeUndefined();
    expect(r[1].content).toMatch(/Lá bạn vừa rút/);
    expect(r[1].content).toMatch(/\((xuôi|ngược)\)/);
    expect(r[1].tarot).toBeUndefined(); // không rút bài mới
    expect(r[2].tarot).toBeTruthy(); // hỏi nối theo chủ đề → vẫn là bói
    expect(r[2].unk).toBeUndefined();
  }, T);
  it("các cách hỏi nghĩa khác cũng vậy", async () => {
    for (const s of ["giải thích thêm đi", "ý nghĩa lá này là gì", "nói rõ hơn đi"]) {
      const m = await last(["bói một lá cho hôm nay", s]);
      expect(m.unk, s).toBeUndefined();
      expect(m.content, s).toMatch(/vừa rút/);
    }
  }, T);
});

describe("Chống vòng lặp câu mẫu trong mạch tâm sự", () => {
  const CHAINS: string[][] = [
    ["a mệt quá", "làm cả ngày", "về còn phải nấu cơm", "con thì quậy", "chẳng ai giúp"],
    ["tâm sự với a chút", "a mới cãi nhau với vợ", "tại a về trễ", "vợ a không nói chuyện với a", "từ tối qua", "a xin lỗi rồi", "mà vợ a vẫn giận"],
    ["a buồn quá", "hôm nay bị sếp la", "trước mặt mọi người", "a làm sai báo cáo", "sếp nói a vô dụng"],
    ["a đang lo", "con a sắp thi", "nó học không tốt lắm", "a sợ nó rớt"],
    ["a thấy cô đơn", "ở một mình", "bạn bè ai cũng bận"],
  ];
  it("không còn xoay vòng “đang nghe nè / cứ kể tiếp / mong nhất là gì / bận lòng nhiều không”", async () => {
    for (const c of CHAINS) {
      const r = await chat(c);
      for (const [i, m] of r.entries()) expect(m.content, `${c[i]} → ${m.content}`).not.toMatch(LOOP_LINES);
    }
  }, 60000);
  it("câu đáp NHẮC LẠI đúng điều vừa kể", async () => {
    const r = await chat(["a mệt quá", "làm cả ngày", "về còn phải nấu cơm", "con thì quậy"]);
    expect(r[1].content).toMatch(/^Làm cả ngày hả/);
    expect(r[2].content).toMatch(/^Về còn phải nấu cơm hả/);
    expect(r[3].content).toMatch(/^Con thì quậy hả/);
    const f = await chat(["a mới cãi nhau với vợ", "tại a về trễ", "vợ a không nói chuyện với a"]);
    expect(f[1].content).toMatch(/^Tại anh về trễ hả/);
    expect(f[2].content).toMatch(/^Vợ anh không nói chuyện với anh hả/);
  }, T);
  it("không lặp lại một câu / một câu hỏi trong cùng cuộc trò chuyện; không hỏi dồn hai lượt liền", async () => {
    for (const c of CHAINS) {
      const r = await chat(c);
      const sentences = r.flatMap((m) => m.content.split(/(?<=[.!?…])\s+|\n+/).map((x) => x.trim()).filter((x) => x.length > 25));
      const dup = sentences.filter((x, i) => sentences.indexOf(x) !== i);
      expect(dup, c.join(" | ")).toEqual([]);
      // Từ lượt thứ 3: hai tin liền nhau không cùng kết bằng câu hỏi (không hỏi dồn).
      for (let i = 3; i < r.length; i++) expect(/\?\s*$/.test(r[i].content.trim()) && /\?\s*$/.test(r[i - 1].content.trim()), `${c[i]} → ${r[i].content}`).toBe(false);
    }
  }, 60000);
  it("kể được vài ý thì Lomi TÓM LẠI đúng các ý đó", async () => {
    const r = await chat(["a mệt quá", "làm cả ngày", "về còn phải nấu cơm", "con thì quậy", "chẳng ai giúp", "gợi ý đi"]);
    expect(r[4].content).toMatch(/Làm cả ngày, về còn phải nấu cơm, con thì quậy, chẳng ai giúp/);
    expect(r[4].content).toMatch(/gợi ý/);
    expect(r[5].content).toMatch(/gợi ý vài điều/); // "gợi ý đi" → lời khuyên của đúng chủ đề
  }, T);
  it("chuyện của người khác kể trong lúc lo không bị đọc thành chuyện của người dùng", async () => {
    const r = await chat(["a đang lo", "con a sắp thi", "nó học không tốt lắm"]);
    expect(r[0].content).toMatch(/Anh đang lo chuyện gì vậy/);
    expect(r[0].heart).toBe("anxiety");
    expect(r[1].content).toMatch(/^Con anh sắp thi hả/);
    expect(r[1].heart).toBe("anxiety"); // không nhảy sang "sắp tới công chuyện lớn hả 💪"
    expect(r[2].content).toMatch(/^Nó học không tốt lắm hả/);
    expect(r[2].content).not.toMatch(/Thích ghê|tự hào|Hít vào chậm/); // không khen nhầm, không chen bài hít thở
  }, T);
  it("“trước mặt mọi người” không phải “mỏi mắt”; kể tiếp vẫn ở mạch tâm sự", async () => {
    const r = await chat(["a buồn quá", "hôm nay bị sếp la", "trước mặt mọi người", "a làm sai báo cáo"]);
    expect(r[2].sx ?? []).toHaveLength(0);
    expect(r[2].heart).toBeTruthy();
    expect(r[2].content).toMatch(/^Trước mặt mọi người hả/);
    expect(r[3].faqId).toBeUndefined();
    expect(r[3].heart).toBeTruthy();
  }, T);
  it("“ừ”, “thôi kệ” sau khi Lomi không hỏi gì → đáp nhẹ, không hỏi dồn", async () => {
    const r = await chat(["a mệt quá", "làm cả ngày", "ừ", "thôi kệ"]);
    expect(r[1].content).not.toMatch(/\?\s*$/); // Lomi vừa hỏi ở tin đầu nên tin này chỉ ghi nhận, không hỏi tiếp
    expect(r[2].content).toMatch(/^Dạ 🌿/);
    expect(r[3].content).toMatch(/^Dạ 🌿/);
    expect(r[2].content + r[3].content).not.toMatch(/\?/);
  }, T);
  it("người dùng chỉ muốn được nghe → Lomi chỉ nhắc lại, không khuyên, không hỏi", async () => {
    const r = await chat(["tâm sự với a chút", "chỉ muốn được nghe thôi", "a bị điểm kém", "bố mẹ la"]);
    expect(r[2].content).toMatch(/^Anh bị điểm kém hả/);
    expect(r[3].content).toMatch(/^Bố mẹ la hả/);
    expect(r[2].content + r[3].content).not.toMatch(/\?|gợi ý|thử/);
  }, T);
});

describe("Chuyện đời thường không tự thành tư vấn tâm lý", () => {
  it("“A đang ăn pizza” → nói chuyện ăn uống, kể tiếp vẫn là chuyện phiếm", async () => {
    const r = await chat(["a đang ăn pizza", "ngon lắm", "ở quán gần nhà"]);
    for (const m of r) {
      expect(m.heart, m.content).toBeUndefined();
      expect(m.content).not.toMatch(/cảm thấy thế nào|bận lòng/);
    }
    expect(r[2].search).toBeUndefined(); // "ở quán gần nhà" là kể tiếp, không phải nhờ tìm quán
    expect(r[2].content).toMatch(/Ở quán gần nhà hả/);
  }, T);
  it("chuyện xui đời thường: kể tiếp bằng mẩu ngắn được nhắc lại đúng tông, không “😄 À à”", async () => {
    const r = await chat(["hôm nay a bị kẹt xe", "2 tiếng"]);
    expect(r[1].content).toMatch(/^2 tiếng hả 😩/);
  }, T);
  it("thú cưng mới mất: Lomi nhớ đã nuôi bao lâu, vì sao mất, và an ủi theo đúng những điều đó", async () => {
    const r = await chat(["con mèo nhà a mới mất", "nuôi 5 năm rồi", "nó bị bệnh", "a nhớ nó quá"]);
    expect(r[0].thread).toMatchObject({ kind: "loss", asked: ["dur"] });
    expect(r[1].content).toMatch(/^5 năm/);
    expect(r[1].unk).toBeUndefined();
    expect(r[2].content).not.toMatch(/đã đi khám chưa/); // bé mất rồi, không hỏi "đi khám chưa"
    expect(r[2].thread?.facts.cause).toBe("ill");
    expect(r[3].content).toMatch(/5 năm bên nhau/);
    expect(r[3].content).not.toMatch(/Ra là vậy 😄/);
  }, T);
  it("người thân nhập viện → hỏi bác sĩ nói gì (không hỏi “đi khám chưa”), nhớ người bệnh là ba", async () => {
    const r = await chat(["ba a nhập viện rồi", "bác sĩ nói bị tai biến", "a rối quá"]);
    expect(r[0].content).toMatch(/Bác sĩ có nói ba anh bị gì không/);
    expect(r[0].heart).toBeUndefined();
    expect(r[1].thread?.facts.dx).toBe("tai biến");
    expect(r[1].content).toMatch(/^Tai biến hả 🥺/);
    expect(r[2].content).toMatch(/Ba anh nằm viện thì lo là phải/);
  }, T);
  it("vừa kể chia tay (Lomi đáp câu ghi nhớ hoàn cảnh) → “3 năm” vẫn là kể tiếp chuyện đó", async () => {
    const r = await chat(["a chia tay rồi", "3 năm"]);
    expect(r[0].heart).toBe("breakup");
    expect(r[1].content).toMatch(/^3 năm là cả một chặng đường/);
  }, T);
  it("nói chuyện khác xen vào thì mạch chuyện về mẹ không giành lấy câu đó", async () => {
    const r = await chat(["Mẹ a đang ốm", "bố a cũng ốm", "rồi"]);
    expect(r[1].thread?.who.text).toBe("bố anh"); // người mới → mạch mới
    expect(r[2].content).toMatch(/Bác sĩ có nói bố anh bị gì không/);
    const s = await chat(["Mẹ a đang ốm", "hôm nay ăn gì"]);
    expect(s[1].dishAsk).toBeTruthy();
    expect(s[1].thread).toBeUndefined(); // sang việc khác hẳn thì bỏ mạch
  }, T);
});

// Các chuỗi CHƯA TỪNG dùng lúc viết (thử "mù" sau khi sửa) — giữ lại làm test để các lỗi lộ ra ở đó không quay lại.
describe("Chuỗi thử mù — theo được chuyện với câu chưa từng gặp", () => {
  it("ông ốm nặng → vô viện → bác sĩ bảo viêm phổi: không hỏi “có thuốc chưa” khi đang nằm viện; “thương ông quá” → an ủi có nhắc ông", async () => {
    const r = await chat(["ông nội e bị ốm", "nặng lắm e ạ", "đưa vô viện rồi", "bác sĩ bảo viêm phổi", "e thương ông quá"]);
    expect(r[1].content).toMatch(/ông nội em đã đi khám chưa/);
    expect(r[2].thread?.facts).toMatchObject({ doctor: true, stay: true });
    expect(r[2].content).toMatch(/Bác sĩ có nói ông nội em bị gì không/);
    expect(r[3].thread?.facts.dx).toBe("viêm phổi");
    expect(r[3].content).not.toMatch(/kê thuốc/);
    expect(r[4].content).toMatch(/ông nội/);
    expect(r[4].content).toMatch(/xót|thương/);
  }, T);
  it("“chị a đang bệnh” là chị CỦA người nói (không phải người nói bị bệnh); tên bệnh nói trống được ghi nhận", async () => {
    const r = await chat(["chị a đang bệnh", "sốt xuất huyết", "nằm viện 3 ngày rồi"]);
    expect(r[0].content).toMatch(/^Chị anh bệnh hả/);
    expect(r[0].content).not.toMatch(/mong anh mau khoẻ/i);
    expect(r[1].thread?.facts.dx).toBe("sốt xuất huyết");
    expect(r[2].thread?.facts.stay).toBe(true);
    expect(r[2].content).not.toMatch(/bị gì không/); // đã biết bị gì rồi
  }, T);
  it("“vợ a đang bầu mà bị cảm” → người ốm là vợ", async () => {
    const m = await last(["vợ a đang bầu mà bị cảm"]);
    expect(m.content).toMatch(/^Vợ anh/);
    expect(m.content).not.toMatch(/mong anh mau khoẻ|Thương anh ghê/i);
    expect(m.thread?.who.text).toBe("vợ anh");
  }, T);
  it("người thân mắc bệnh có tên → câu sau “nên kiêng gì” trả lời được ngay", async () => {
    const a = await chat(["ba e bị tiểu đường", "nên kiêng gì"]);
    expect(a[0].content).toMatch(/^Ba em/);
    expect(a[1].diet).toBe("dm");
    const b = await chat(["mẹ a bị cao huyết áp", "nên kiêng gì"]);
    expect(b[1].diet).toBe("htn");
  }, T);
  it("hỏi điều Lomi chưa có kiến thức khi đang theo chuyện người ốm → nói thật theo đúng mạch (vẫn ghi lại câu chưa trả lời được)", async () => {
    const r = await chat(["con gái c bị ho", "1 tuần rồi", "khám rồi", "bs nói viêm phế quản", "đang uống kháng sinh", "c nên cho bé ăn gì"]);
    expect(r[4].thread?.facts.meds).toBe(true);
    expect(r[5].unk).toBeTruthy();
    expect(r[5].content).toMatch(/hỏi thẳng bác sĩ/);
    expect(r[5].content).toMatch(/Con gái chị/);
  }, T);
  it("đang ở bệnh viện → chăm mẹ → mẹ mổ ruột thừa → mổ xong rồi → bác sĩ nói ổn: không câu nào bị đáp kiểu chuyện phiếm", async () => {
    const r = await chat(["a đang ở bệnh viện", "chăm mẹ", "mẹ mổ ruột thừa", "mổ xong rồi", "bác sĩ nói ổn"]);
    expect(r[0].content).toMatch(/Đang ở bệnh viện hả 🥺/);
    expect(r[1].content).toMatch(/Chăm mẹ hả 🥺/);
    expect(r[1].thread?.who.text).toBe("mẹ");
    expect(r[2].thread?.facts.dx).toBe("mổ ruột thừa");
    expect(r[3].content).toMatch(/Mổ xong rồi hả 🙏/);
    expect(r[4].content).toMatch(/nhẹ cả người/);
    for (const m of r) expect(m.content, m.content).not.toMatch(/😄|😆|thích ghê|À à/);
  }, T);
  it("người kể ở xa, không ai chăm: ghi nhận từng điều một lần, không lặp lại câu cũ, không đáp “Thích vậy trời”", async () => {
    const r = await chat(["mẹ e ốm", "e đang ở xa", "không ai chăm mẹ", "e muốn về mà không được"]);
    expect(r[1].content).toMatch(/Ở xa mà nghe mẹ ốm/);
    expect(r[2].content).toMatch(/Không có ai ở bên/);
    expect(r[3].content).not.toBe(r[1].content);
    expect(r[3].content).not.toMatch(/Thích vậy|🤩|😄/);
  }, T);
  it("người thân mất: mẩu kể thêm được nhắc lại với giọng chia sẻ; “khóc cả đêm” là nỗi buồn chứ không phải “ở với nhau cả đêm”", async () => {
    const a = await chat(["bố a mất năm ngoái", "a vẫn nhớ", "sắp tới giỗ đầu"]);
    expect(a[2].content).toMatch(/^Sắp tới giỗ đầu hả 🥺/);
    const b = await chat(["con chó nhà c mới mất", "già rồi", "c khóc cả đêm"]);
    expect(b[1].thread?.facts.cause).toBe("old");
    expect(b[2].content).toMatch(/Buồn là phải/);
    expect(b[2].content).not.toMatch(/từng ấy thời gian/);
  }, T);
  it("“a giận vợ a” → hỏi đúng chuyện đó và nghe tiếp (không “chuyện này làm anh thấy sao?” rồi “Thích vậy trời”)", async () => {
    const r = await chat(["a giận vợ a", "cô ấy tiêu tiền nhiều quá", "giờ a phải làm sao"]);
    expect(r[0].content).toMatch(/^Anh giận vợ anh hả/);
    expect(r[0].heart).toBe("fight");
    expect(r[1].content).toMatch(/^Cô ấy tiêu tiền nhiều quá hả 😔/);
    expect(r[2].content).toMatch(/gợi ý vài điều/);
    expect(r[2].unk).toBeUndefined();
  }, T);
  it("đang kể chuyện bị sếp mắng: “vì đi trễ”, “mà e bị kẹt xe” là chi tiết của chuyện đó, không mở chuyện “trễ giờ / kẹt xe” mới", async () => {
    const r = await chat(["e bị sếp mắng", "vì đi trễ", "mà e bị kẹt xe", "sếp không nghe giải thích"]);
    for (const m of r) expect(m.heart).toBe("boss");
    expect(r[1].content).toMatch(/^Vì đi trễ hả/);
    expect(r[2].content).toMatch(/bị kẹt xe hả/);
  }, T);
  it("“c nói hoài không nghe” là kể chuyện, không phải chê Lomi lặp lại", async () => {
    const r = await chat(["c buồn chồng c quá", "ảnh đi nhậu suốt", "c nói hoài không nghe"]);
    expect(r[2].content).not.toMatch(/xin lỗi|lặp lại hoài/);
    expect(r[2].content).toMatch(/nói hoài không nghe hả/);
  }, T);
  it("khoảng thời gian không tự là “đã chịu đựng bao lâu”: “còn 2 tuần nữa thi”, “làm được 5 năm” được nhắc lại đúng ý", async () => {
    const a = await chat(["e stress vì thi cử", "còn 2 tuần nữa thi"]);
    expect(a[1].content).toMatch(/^Còn 2 tuần nữa thi hả/);
    expect(a[1].content).not.toMatch(/kéo dài vậy chắc/);
    const b = await chat(["a mới bị đuổi việc", "làm được 5 năm"]);
    expect(b[1].content).toMatch(/^Làm được 5 năm hả/);
    expect(b[1].content).not.toMatch(/kéo dài vậy chắc|chưa bắt chắc ý/);
  }, T);
  it("vừa xem bài xong mà hỏi một câu quyết định → vẫn là hỏi bài", async () => {
    const r = await chat(["bói cho a 3 lá về công việc", "lá thứ 2 là sao", "vậy a có nên nghỉ việc không", "rút thêm 1 lá"]);
    expect(r[1].content).toMatch(/vừa rút/);
    expect(r[2].tarot).toBeTruthy();
    expect(r[2].heart).toBeUndefined();
    expect(r[3].tarot).toBeTruthy();
  }, T);
  it("đang hỏi khẩu vị lẩu → “lẩu thái” là câu trả lời khẩu vị → “quán nào gần đây” vẫn là quán lẩu", async () => {
    const r = await chat(["a thèm lẩu quá", "lẩu thái", "quán nào gần đây"]);
    expect(r[0].content).toMatch(/^Thèm lẩu mà/); // không còn "lẩu (gà lá é"
    expect(r[1].dish).toBe("lau");
    expect(r[2].dish).toBe("lau");
  }, T);
  it("“a mệt” → “không” → “ừ”: Lomi không hỏi dồn, không đáp “chưa bắt chắc ý”", async () => {
    const r = await chat(["a mệt", "không", "ừ"]);
    expect(r[0].heart).toBe("tired");
    expect(r[1].content).toMatch(/^Dạ 🌿/);
    expect(r[2].content).toMatch(/^Dạ 🌿/);
  }, T);
  it("câu chữ không đổi nhầm “bạn” (bạn bè) thành cách gọi: “tình bạn”, “làm bạn trước”", async () => {
    const { speak } = await import("@/lib/lomiAddress");
    expect(speak("Tình bạn cũng thay đổi theo thời gian.", "anh")).toBe("Tình bạn cũng thay đổi theo thời gian.");
    expect(speak("Cứ từ từ làm bạn trước, rồi tính.", "anh")).toBe("Cứ từ từ làm bạn trước, rồi tính.");
    expect(speak("Điều đó làm bạn khó chịu hả?", "anh")).toBe("Điều đó làm anh khó chịu hả?");
  }, T);
});
