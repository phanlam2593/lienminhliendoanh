// 10/10 — Lỗi tìm ra khi Claude chạy thử hội thoại thật với kho kiến thức y khoa (ghi ở lomi_stuck_log, nguồn claude-test).
import { afterEach, describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { setStuckSink, type StuckEntry } from "@/lib/lomiStuckLog";

const T = 30000;
afterEach(() => setStuckSink(null));

describe("kho y khoa — câu hỏi thật", () => {
  it("'đậu rang' không bị hiểu là 'dâu' (trái cây) hay cả nhóm 'đậu' → nói thẳng chưa xác minh được", async () => {
    const m = await last(["gout ăn đậu rang được không"]);
    expect(m.content).toMatch(/\*\*đậu rang\*\* thì Lomi \*\*chưa xác minh được\*\*/);
    expect(m.content).not.toMatch(/\*\*(trái cây|các loại đậu)\*\* là món/);
  }, T);
  it("'xử lý' (chữ y) vẫn là hỏi cách xử trí → trả lời từ thẻ có nguồn, không từ bảng cũ", async () => {
    expect((await last(["hạ đường huyết xử lý sao"])).content).toMatch(/Với \*\*Hạ đường huyết\*\*, theo các nguồn y khoa nên/);
    expect((await last(["say rượu nặng thì xử lý sao"])).content).toMatch(/Ngộ độc rượu/);
  }, T);
  it("'sữa chua được không' (không dấu) là hỏi món, không phải 'chữa được không'", async () => {
    expect((await last(["khong dung nap lactose uong sua chua dc ko"])).content).toMatch(/\*\*sữa chua\*\*/);
  }, T);
  it("'hăm tã' không bị đổi thành 'không tã'", async () => {
    expect((await last(["bé bị hăm tã bôi gì"])).content).toMatch(/Hăm tã/);
  }, T);
  it("hỏi đúng khía cạnh: làm sao biết → dấu hiệu; di truyền → nguyên nhân; lây thế nào → lây", async () => {
    expect((await last(["làm sao biết mình bị trầm cảm"])).content).toMatch(/Dấu hiệu thường gặp của \*\*Trầm cảm\*\*/);
    expect((await last(["thalassemia có di truyền không"])).content).toMatch(/Nguyên nhân/);
    expect((await last(["tay chân miệng lây thế nào"])).content).toMatch(/Về chuyện lây/);
  }, T);
  it("câu hỏi có từ hỏi về một bệnh trong kho không bị nhường cho mạch triệu chứng", async () => {
    expect((await last(["nám da có hết không"])).content).toMatch(/\*\*Nám\*\*/);
    expect((await last(["kinh nguyệt không đều có sao không"])).content).toMatch(/Kinh nguyệt không đều/);
  }, T);
  it("hỏi một ý cụ thể có trong thẻ → đưa đúng ý đó; ý không có → nói thẳng chưa xác minh và ghi bí", async () => {
    expect((await last(["thuốc lá điện tử có giúp bỏ được không"])).content).toMatch(/thuốc lá điện tử/);
    const got: StuckEntry[] = [];
    setStuckSink((e) => got.push(e));
    const m = await last(["sốt xuất huyết có cần truyền nước không"]);
    expect(m.content).toMatch(/“truyền nước”.*chưa nói rõ/);
    expect(got.map((g) => g.kind)).toContain("kb_partial");
  }, T);
  it("câu nối chung chung theo chủ đề mà thẻ không có ý đó → không đọc lại bài của chủ đề cũ", async () => {
    const r = await chat(["lupus là gì", "hôm nay trời có mưa không"]);
    expect(r[r.length - 1].content).not.toMatch(/Lupus/);
  }, T);
});

// 10/10 — lỗi tìm ra khi Claude chạy thử đợt 2 (sức khoẻ + tâm lý)
describe("kho y khoa + tâm lý — chạy thử 10/10", () => {
  it("'tim đập nhanh' không bị hiểu là bị đánh ('đập' ≠ 'đạp')", async () => {
    const m = await last(["em hay bị tim đập nhanh rồi run tay là sao"]);
    expect(m.content).not.toMatch(/Bị đánh|không phải lỗi của em/);
  }, T);
  it("ăn uống khi mang thai trả lời theo NHS; món nguồn không nêu (rau ngót, dứa) thì nói thẳng chưa xác minh", async () => {
    expect((await last(["bà bầu ăn sushi được không"])).content).toMatch(/cá và hải sản sống\*\* nên \*\*tránh\*\*/);
    expect((await last(["mang thai ăn pate được không"])).content).toMatch(/gan và sản phẩm từ gan/);
    expect((await last(["bà bầu ăn rau ngót được không"])).content).toMatch(/\*\*rau ngót\*\* thì Lomi \*\*chưa xác minh được\*\*/);
    expect((await last(["bầu ăn dứa được không"])).content).toMatch(/\*\*dứa\*\* thì Lomi \*\*chưa xác minh được\*\*/);
  }, T);
  it("'bầu cử', 'mang thai mấy tuần thì siêu âm' không bị coi là hỏi ăn uống / lo trễ kinh", async () => {
    expect((await last(["bầu cử là gì"])).content).not.toMatch(/kiến thức đã kiểm chứng|chuyện sức khoẻ mà nói sai|mang thai/);
    expect((await last(["mang thai mấy tuần thì siêu âm được"])).content).not.toMatch(/trễ kinh|chu kỳ|que thử/);
  }, T);
  it("sốt: hỏi bao nhiêu độ → mốc đi khám có nguồn; nói tới con / bé → thẻ sốt ở trẻ", async () => {
    expect((await last(["sốt bao nhiêu độ thì đi viện"])).content).toMatch(/Sốt ở người lớn[\s\S]*39,4°C/);
    expect((await last(["con bị sốt bao nhiêu độ thì đi viện"])).content).toMatch(/Sốt ở trẻ em/);
  }, T);
  it("khía cạnh xét ngoài tên bệnh; 'kéo dài' không phải hỏi diễn tiến; tên + cụm bổ nghĩa vẫn là hỏi", async () => {
    expect((await last(["rối loạn ăn uống là gì"])).content).toMatch(/📖 \*\*Rối loạn ăn uống\*\* là gì/);
    expect((await last(["mất ngủ kéo dài phải làm sao"])).content).toMatch(/🌿 Với \*\*Mất ngủ\*\*/);
    expect((await last(["tăng động giảm chú ý ở người lớn"])).content).toMatch(/Tăng động giảm chú ý/);
    expect((await last(["kiệt sức vì công việc phải làm sao"])).content).toMatch(/Kiệt sức nghề nghiệp/);
  }, T);
  it("hỏi khi nào cần gặp bác sĩ tâm lý → dấu hiệu cần tìm trợ giúp (có nguồn)", async () => {
    expect((await last(["khi nào cần gặp bác sĩ tâm lý"])).content).toMatch(/MedlinePlus/);
    expect((await last(["em có nên đi khám tâm lý không"])).content).toMatch(/dấu hiệu cảnh báo sớm/);
  }, T);
  it("bệnh chưa có thẻ + 'ăn gì' không bị gợi ý quán ăn", async () => {
    expect((await last(["thoái hóa cột sống ăn gì"])).content).not.toMatch(/tìm quán|Bấm chọn/);
  }, T);
  it("tâm sự: mất người thân, chán mọi thứ, kiểm soát cơn giận, ngủ không được → đúng mạch", async () => {
    expect((await last(["ba em mất rồi, em không chịu nổi"])).content).toMatch(/mất mát|mình thương|Đau buồn/);
    expect((await last(["em làm gì cũng thấy chán"])).content).not.toMatch(/chưa được tiếp thu/);
    expect((await last(["làm sao để kiểm soát cơn giận"])).content).not.toMatch(/ghen|người thương thân với ai/);
    expect((await last(["em ngủ không được, đầu cứ nghĩ linh tinh"])).content).not.toMatch(/em hỏi thì các nguồn/);
  }, T);
});

// 10/10 (chiều) — Kir chụp màn hình: "hôm nay a vui lắm hehe" → "Anh ấy vui lắm hehe vậy hả… Em chắc tự hào lắm ha?",
// rồi "là sao? sao lại liên quan e tự hào?" → tư vấn quán vắng khách.
describe("xưng hô + câu thắc mắc lại Lomi", () => {
  it("đã xưng em mà câu 'a …' đứng một mình → người nói đổi xưng anh, không phải 'anh ấy'", async () => {
    const r = await chat(["em buồn quá", "hôm nay a vui lắm hehe"]);
    const a = r[r.length - 1].content;
    expect(a).not.toMatch(/anh ấy|Anh ấy|hehe hả/);
    expect(a).toMatch(/anh/);
  }, T);
  it("vẫn hiểu 'a' là người yêu khi trong câu có 'e' ('a không nhắn cho e 3 ngày rồi')", async () => {
    const r = await chat(["em buồn quá", "a không nhắn cho e 3 ngày rồi"]);
    expect(r[r.length - 1].content).not.toMatch(/^Nghe anh/);
  }, T);
  it("'là sao? sao lại liên quan e tự hào?' → Lomi nhận đáp lạc, không tư vấn quán vắng khách", async () => {
    const m = (await chat(["hôm nay a vui lắm hehe", "là sao? sao lại liên quan e tự hào?"])).pop()!;
    expect(m.content).not.toMatch(/vắng|khách|kinh doanh/);
    expect(m.content).toMatch(/đáp lạc/);
  }, T);
  it("'quán e dạo này ế quá' là quán vắng khách, không phải ế người yêu; 'vâng ạ' là đồng ý, không nhắc lại", async () => {
    expect((await last(["quán e dạo này ế quá"])).content).not.toMatch(/người yêu|người để thương/);
    expect((await chat(["em buồn quá", "vâng ạ"])).pop()!.content).not.toMatch(/Vâng hả/);
  }, T);
});

// 10/10 (chiều) — Kir chụp: "Ừm...a bị trẹo cổ" → "App đang chậm / đơ hả" ("trẹo" bỏ dấu = "treo" = app bị treo).
describe("trẹo cổ ≠ app bị treo ≠ treo cổ", () => {
  it("trẹo cổ / sái cổ (có dấu và không dấu) → sức khoẻ, không phải lỗi app", async () => {
    for (const q of ["Ừm...a bị trẹo cổ", "Trẹo cổ", "a bi treo co", "bị sái cổ"]) {
      const m = await last([q]);
      expect(m.content, q).not.toMatch(/App đang chậm/);
      expect(m.content, q).toMatch(/cổ/);
    }
  }, T);
  it("app bị treo (có dấu và không dấu) vẫn là lỗi app", async () => {
    expect((await last(["app bị treo"])).content).toMatch(/App đang chậm/);
    expect((await last(["app bi treo hoai"])).content).toMatch(/App đang chậm/);
  }, T);
  it("ý định treo cổ (có dấu và không dấu) → lời đáp khủng hoảng", async () => {
    expect((await last(["em muốn treo cổ"])).content).toMatch(/096 306 1414/);
    expect((await last(["em muon treo co cho xong"])).content).toMatch(/096 306 1414/);
  }, T);
});
