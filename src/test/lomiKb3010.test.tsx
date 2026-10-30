// 30/10 — Kir: "update thêm thư viện bệnh đi, ung thư này ung thư kia, viêm này viêm kia". Thêm 25 thẻ có nguồn (NHS / NHS 111 Wales /
// MedlinePlus / Moorfields / Guy's and St Thomas'). Mỗi ca: câu người dùng hay hỏi → đúng thẻ, đúng khía cạnh. Chạy qua khung chat thật.
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";
import { findMedTopicId } from "@/lib/lomiMed";

const T = 60000;

describe("30/10 — thẻ mới: nhận đúng tên", () => {
  const CASES: [string, string][] = [
    ["u não là gì", "u-nao"], ["ung thư não", "u-nao"], ["ung thư miệng", "ung-thu-mieng"], ["ung thư lưỡi", "ung-thu-mieng"],
    ["ung thư thanh quản", "ung-thu-thanh-quan"], ["ung thư tinh hoàn", "ung-thu-tinh-hoan"], ["ung thư xương", "ung-thu-xuong"],
    ["ung thư tử cung", "ung-thu-noi-mac-tu-cung"], ["ung thư cổ tử cung", "ung-thu-co-tu-cung"], ["đa u tủy", "da-u-tuy"],
    ["ung thư túi mật", "ung-thu-tui-mat"], ["ung thư đường mật", "ung-thu-duong-mat"], ["u trung biểu mô phúc mạc", "u-trung-bieu-mo"],
    ["sarcoma mô mềm", "sarcoma-mo-mem"], ["viêm bể thận", "viem-be-than"], ["viêm vùng chậu", "viem-vung-chau"],
    ["viêm giác mạc", "viem-giac-mac"], ["viêm màng ngoài tim", "viem-mang-ngoai-tim"], ["viêm cơ tim", "viem-co-tim"],
    ["viêm bao hoạt dịch", "viem-bao-hoat-dich"], ["viêm tai ngoài", "viem-tai-ngoai"], ["viêm tai giữa", "viem-tai-giua"],
    ["viêm màng bồ đào", "viem-mang-bo-dao"], ["viêm xương tủy", "viem-xuong-tuy"], ["viêm quy đầu", "viem-quy-dau"],
    ["viêm phúc mạc", "viem-phuc-mac"], ["viêm khớp nhiễm trùng", "viem-khop-nhiem-trung"], ["viêm niệu đạo", "viem-nieu-dao"],
    ["ra máu sau mãn kinh", "ra-mau-sau-man-kinh"], ["mãn kinh là gì", "man-kinh"],
  ];
  it.each(CASES)("%s → %s", (q, id) => expect(findMedTopicId(q)).toBe(id));
  it("không bắt nhầm: 'ngủ' không phải viêm niệu đạo, 'viêm gan' không phải viêm gân", () => {
    expect(findMedTopicId("a ngu qua")).not.toBe("viem-nieu-dao");
    expect(findMedTopicId("viêm gan b là gì")).toBe("viem-gan-b");
  });
});

describe("30/10 — trả lời qua khung chat", () => {
  it("Khàn tiếng lâu ngày → đúng thẻ ung thư thanh quản, nêu triệu chứng có nguồn", async () => {
    const m = await last(["khàn tiếng lâu ngày có phải ung thư thanh quản"]);
    expect(m.med?.id).toBe("ung-thu-thanh-quan");
    expect(m.content).toMatch(/khàn tiếng/);
  }, T);
  it("Loét miệng không lành → ung thư miệng, mốc 3 tuần", async () => {
    const m = await last(["bị loét miệng 1 tháng không lành có phải ung thư miệng không"]);
    expect(m.med?.id).toBe("ung-thu-mieng");
    expect(m.content).toMatch(/3 tuần/);
  }, T);
  // Trước: "ra máu sau mãn kinh có sao không" → thẻ mãn kinh "Không phải ai cũng cần điều trị"; kể chuyện mẹ → "Vậy hả 😄 Nghe được đó."
  it("Ra máu sau mãn kinh → luôn đi khám, kể cả khi kể chuyện người nhà", async () => {
    const a = await last(["ra máu sau mãn kinh có sao không"]);
    expect(a.content).toMatch(/luôn nên đi khám/);
    const b = await last(["mẹ e mãn kinh 3 năm rồi giờ ra máu lại"]);
    expect(b.content).toMatch(/luôn nên đi khám/);
    expect(b.content).not.toMatch(/Nghe được đó/);
  }, T);
  it("Hỏi cách chữa viêm bao hoạt dịch → mẹo tự chăm (nghỉ, chườm đá) đứng đầu, thuốc tách riêng", async () => {
    const m = await last(["viêm bao hoạt dịch đầu gối chữa sao"]);
    expect(m.med?.id).toBe("viem-bao-hoat-dich");
    expect(m.content.split("\n").find((l) => l.startsWith("•"))).toMatch(/nghỉ|chườm/);
  }, T);
  it("Viêm màng ngoài tim → có dấu hiệu gọi 115 khi đau ngực kiểu nhồi máu", async () => {
    const m = await last(["viêm màng ngoài tim"]);
    expect(m.content).toMatch(/115/);
  }, T);
  it("Ung thư xương không còn bị đáp bằng thẻ ung thư chung", async () => {
    const m = await last(["ung thư xương là gì"]);
    expect(m.med?.id).toBe("ung-thu-xuong");
    expect(m.content).not.toMatch(/chưa có bài riêng/);
  }, T);
});
