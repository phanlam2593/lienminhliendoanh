// 18/10 (đợt 2) — Kir gửi "Giai đoạn E": tiêu chảy & bù nước (ORS), tên hiển thị thẻ ho, ho kèm dấu hiệu cảnh báo.
// Chạy qua CHÍNH khung chat (AiChat). Mỗi ca kiểm: đúng thẻ, có nội dung cần thiết, cảnh báo không bị mất / không bị lời khuyên ở nhà lấn át.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { loadMedTopic, displayName } from "@/lib/lomiMed";

const T = 60000;
const ORS = /ORS — ở Việt Nam hay gọi là oresol|dung dịch bù nước \(ORS, oresol\)/;
const PREP = /mỗi gói pha với đúng lượng nước đun sôi để nguội hoặc nước sạch đã xử lý như ghi trên gói/;
const first = (t: string) => t.split("\n\n")[0];

describe("tiêu chảy — bù nước", () => {
  it("“Tiêu chảy nên uống gì?” → thẻ người lớn, có mục bù nước (ORS + cách pha theo gói), vẫn giữ phần nên tránh", async () => {
    const m = await last(["Tiêu chảy nên uống gì?"]);
    expect(m.med).toEqual({ id: "tieu-chay", aspect: "diet" });
    expect(m.content).toMatch(/💧 Bù nước:/);
    expect(m.content).toMatch(ORS);
    expect(m.content).toMatch(PREP);
    expect(m.content).toMatch(/Tránh nước ép trái cây/);
    expect(m.content).not.toMatch(/\d+\s*(gói|ml|lít)/); // không tự đưa liều / công thức pha có số
    expect(m.content).not.toMatch(/chữa khỏi/);
  }, T);

  it("“Bị tiêu chảy uống Oresol thế nào?” → trả lời đúng chuyện bù nước, kèm khi nào cần khám / cấp cứu (không còn 'chưa xác minh')", async () => {
    const m = await last(["Bị tiêu chảy uống Oresol thế nào?"]);
    expect(m.med).toEqual({ id: "tieu-chay", aspect: "care" });
    expect(first(m.content)).toMatch(/💧 Bù nước khi bị \*\*Tiêu chảy\*\*/);
    expect(m.content).toMatch(PREP);
    expect(m.content).toMatch(/🧑‍⚕️ Cần đi khám sớm khi:[\s\S]*mất nước/);
    expect(m.content).toMatch(/🚨 Gọi \*\*115\*\*[\s\S]*dấu hiệu sốc/);
    expect(m.content).toMatch(/không thay được việc đi khám/);
    expect(m.content).not.toMatch(/chưa xác minh được/);
  }, T);

  it("“Bé 2 tuổi bị tiêu chảy nên uống gì?” → thẻ TRẺ EM, bù nước từng ngụm nhỏ", async () => {
    const m = await last(["Bé 2 tuổi bị tiêu chảy nên uống gì?"]);
    expect(m.med).toEqual({ id: "tieu-chay-o-tre", aspect: "diet" });
    expect(m.content).toMatch(/Cho trẻ uống dung dịch bù nước \(ORS, oresol\) từng ngụm nhỏ/);
    expect(m.content).toMatch(PREP);
    expect(m.content).not.toMatch(/người lớn tuổi và người có bệnh mạn tính/); // câu của thẻ người lớn không lọt sang
  }, T);

  it("“Bé bị tiêu chảy, có dấu hiệu mất nước thì sao?” → cảnh báo cần khám / cấp cứu đứng ĐẦU, rồi mới tới danh sách dấu hiệu", async () => {
    const m = await last(["Bé bị tiêu chảy, có dấu hiệu mất nước thì sao?"]);
    expect(m.med?.id).toBe("tieu-chay-o-tre");
    expect(first(m.content)).toMatch(/Với dấu hiệu bạn nhắc \(mất nước\), đừng chỉ tự chăm sóc ở nhà/);
    expect(first(m.content)).toMatch(/Trẻ dưới 5 tuổi có dấu hiệu mất nước cần được tư vấn y tế khẩn/);
    expect(first(m.content)).toMatch(/115/);
    expect(m.content.indexOf("115")).toBeLessThan(m.content.indexOf("Dấu hiệu thường gặp"));
  }, T);

  it("“Tiêu chảy kèm máu trong phân thì làm gì?” → ý cần đi khám (có nguồn) đứng trước phần chăm sóc tại nhà; không kéo ý 'nôn ra máu' vào", async () => {
    const m = await last(["Tiêu chảy kèm máu trong phân thì làm gì?"]);
    expect(m.med?.id).toBe("tieu-chay");
    const head = first(m.content);
    expect(head).toMatch(/có máu trong phân/);
    expect(head).toMatch(/đi ngoài ra máu|có máu trong phân hoặc có dấu hiệu mất nước/);
    expect(head).not.toMatch(/nôn ra máu/);
    expect(m.content.indexOf("Cần đi khám sớm")).toBeLessThan(m.content.indexOf("Ở nhà nghỉ ngơi"));
  }, T);

  it("hỏi một đồ uống cụ thể chưa có nguồn (nước dừa) → trả lời đúng món đó, nói thẳng chưa xác minh", async () => {
    const m = await last(["Bị tiêu chảy uống nước dừa được không?"]);
    expect(m.med).toEqual({ id: "tieu-chay", aspect: "food" });
    expect(m.content).toMatch(/Về \*\*nước dừa\*\* thì Lomi \*\*chưa xác minh được\*\*/);
  }, T);
});

describe("ho — tên hiển thị và cảnh báo", () => {
  it("thẻ ho: tiêu đề là “Ho”, id và khoá ngữ cảnh (names[0]) giữ nguyên", async () => {
    await import("@/lib/lomiMedData");
    const t = (await loadMedTopic("ho"))!;
    expect(t.id).toBe("ho");
    expect(t.names[0]).toBe("ho kéo dài");
    expect(displayName(t)).toBe("Ho");
  });

  it("“Đang ho thì nên uống nước gì?” → thẻ ho, tiêu đề **Ho** (không phải “Ho kéo dài”), ý có nguồn về uống nhiều nước", async () => {
    const m = await last(["Đang ho thì nên uống nước gì?"]);
    expect(m.med?.id).toBe("ho");
    expect(m.content).toMatch(/\*\*Ho\*\*/);
    expect(m.content).not.toMatch(/Ho kéo dài/);
    expect(m.content).toMatch(/uống nhiều nước/);
  }, T);

  it("giữ ngữ cảnh: hỏi tiếp sau khi Lomi trả lời về ho vẫn đúng thẻ ho", async () => {
    const r = await chat(["Đang ho thì nên uống nước gì?", "khi nào cần đi khám?"]);
    expect(r[1].med?.id).toBe("ho");
    expect(r[1].content).toMatch(/ho kéo dài hơn 3 tuần/);
  }, T);

  it("“Tôi bị ho thông thường.” → hỏi thêm, vẫn có dòng 115 cho dấu hiệu nguy hiểm", async () => {
    const m = await last(["Tôi bị ho thông thường."]);
    expect(m.sx).toContain("cough");
    expect(m.content).toMatch(/khó thở[\s\S]*115/);
  }, T);

  it("“Tôi ho kéo dài nhiều tuần.” → không hỏi lại 'bao lâu rồi', nhắc đi khám", async () => {
    const m = await last(["Tôi ho kéo dài nhiều tuần."]);
    expect(m.content).not.toMatch(/Bị bao lâu rồi/);
    expect(m.content).toMatch(/Bị lâu như vậy rồi thì nên đi khám/);
  }, T);

  it("“Ho kèm khó thở thì sao?” → khám gấp trong ngày đứng đầu, 115 khi nặng lên; không chỉ hỏi thêm", async () => {
    const m = await last(["Ho kèm khó thở thì sao?"]);
    expect(m.sx).toEqual(expect.arrayContaining(["cough", "breath"]));
    expect(first(m.content)).toMatch(/\*\*Ho kèm khó thở\*\* thì cần \*\*đi khám ngay trong hôm nay\*\*/);
    expect(first(m.content)).toMatch(/115/);
    expect(m.content).not.toMatch(/Lomi hỏi thêm 2 điều/);
  }, T);

  it("“họ và tên” / “cho kèm” không bị hiểu thành ho", async () => {
    expect((await last(["Họ và tên của bạn là gì?"])).sx ?? []).not.toContain("cough");
  }, T);
});
