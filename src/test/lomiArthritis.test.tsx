// 15/10 — Kir gửi: "Viêm khớp nên kiêng gì?" → Lomi đọc nguyên bài ăn uống của thẻ chung, không nói ngay rằng viêm khớp là tên gọi chung,
// không phân biệt gout với viêm khớp dạng thấp. Chạy qua CHÍNH khung chat (AiChat) — kiểm tra đúng thẻ, đúng ý, không vượt quá nguồn.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { healthSubjectOf } from "@/lib/lomiHealthTopic";

const T = 60000;
const SRC_GOUT = /Gout: .*(Mayo Clinic|CDC|MedlinePlus|NHS)/;

describe("viêm khớp — câu hỏi ăn uống", () => {
  it("1. “Viêm khớp nên kiêng gì?” → nói ngay là tên gọi chung, điều chung có nguồn, tách theo loại, hỏi một câu làm rõ", async () => {
    const m = await last(["Viêm khớp nên kiêng gì?"]);
    expect(m.med).toEqual({ id: "viem-khop", aspect: "diet" });
    const first = m.content.split("\n\n")[0];
    expect(first).toMatch(/không có một danh sách kiêng chung/);
    expect(first).toMatch(/cách gọi chung của nhiều bệnh khớp/);
    expect(m.content).toMatch(/[Tt]ránh uống quá nhiều rượu bia/); // điều chung (NHS)
    expect(m.content).toMatch(/\*\*Viêm khớp dạng thấp\*\*: Chưa có bằng chứng mạnh/); // RA: không kiêng món cụ thể như quy tắc chung
    expect(m.content).toMatch(/\*\*Gout\*\*: Hạn chế thực phẩm giàu purin[\s\S]*hướng dẫn riêng cho gout/);
    expect(m.content).toMatch(/\*\*Thoái hóa khớp\*\*: chưa thấy hướng dẫn kiêng món nào riêng/);
    expect((m.content.match(/\?/g) ?? []).length).toBe(1); // đúng MỘT câu hỏi làm rõ
    // Không khẳng định phải kiêng món cụ thể cho MỌI loại viêm khớp
    expect(first).not.toMatch(/thịt bò|hải sản|rau muống|sữa/);
    // 15/10 (Kir): lời đáp không đọc tên cơ quan, không kèm dòng nguồn — nguồn cất ở src, theo từng thẻ:
    // ngày rà soát của trang nguồn tách khỏi ngày Lomi đối chiếu
    expect(m.content).not.toMatch(/📚|NHS|MedlinePlus|CDC|Mayo|Hỏi món cụ thể/);
    expect(m.src).toMatch(/📚 Nguồn — Viêm khớp: NHS \(Anh\), rà soát 19\/01\/2026 \(Lomi đối chiếu \d{2}\/\d{2}\/\d{4}\)/);
    expect(m.src).toMatch(SRC_GOUT);
    // trước đây gắn nhầm khoá kiêng cữ "đau dạ dày"
    expect(m.diet).toBeFalsy();
    expect(m.health?.label ?? "").not.toMatch(/dạ dày/);
  }, T);

  it("2. viêm khớp dạng thấp / 3. thoái hoá khớp / 4. gout → đúng thẻ riêng, không bị gộp vào trả lời chung", async () => {
    const ra = await last(["Viêm khớp dạng thấp nên kiêng gì?"]);
    expect(ra.med).toEqual({ id: "viem-khop-dang-thap", aspect: "diet" });
    expect(ra.content).toMatch(/Chưa có bằng chứng mạnh/);
    expect(ra.content).not.toMatch(/purin/);
    const oa = await last(["Thoái hóa khớp nên kiêng gì?"]);
    expect(oa.med?.id).toBe("thoai-hoa-khop");
    expect(oa.content).toMatch(/không có danh sách kiêng cữ riêng/);
    expect(oa.content).toMatch(/giảm cân/);
    expect(oa.content).not.toMatch(/purin/);
    const g = await last(["Bị gout nên kiêng gì?"]);
    expect(g.med).toEqual({ id: "gout", aspect: "diet" });
    expect(g.content).toMatch(/purin/);
    expect(g.content).toMatch(/nội tạng \(không nên ăn nội tạng/);
    expect(g.content).not.toMatch(/📚|NHS|MedlinePlus|CDC|Mayo|NIAMS|NCBI|Hỏi món cụ thể/);
  }, T);

  it("5. “Viêm khớp ăn thịt bò được không?” → chung: nguồn không nêu; gout: thịt đỏ nên hạn chế (đúng nguồn); không nói mọi loại phải kiêng", async () => {
    const m = await last(["Viêm khớp ăn thịt bò được không?"]);
    expect(m.med).toEqual({ id: "viem-khop", aspect: "food" });
    expect(m.content).toMatch(/không nêu riêng thịt bò/);
    expect(m.content).toMatch(/\*\*Gout\*\*: thịt đỏ nên \*\*hạn chế\*\*/);
    expect(m.content).toMatch(/\*\*Thoái hóa khớp\*\*, \*\*Viêm khớp dạng thấp\*\*: nguồn không nêu riêng thịt bò/);
    expect(m.src).toMatch(SRC_GOUT);
  }, T);

  it("6. “Viêm khớp uống sữa được không?” → với gout nêu đúng cả sữa ít béo (nên) và sữa nhiều béo (hạn chế), không quy chung", async () => {
    const m = await last(["Viêm khớp uống sữa được không?"]);
    expect(m.med?.id).toBe("viem-khop");
    expect(m.content).toMatch(/không nêu riêng sữa/);
    expect(m.content).toMatch(/sữa ít béo là món \*\*nên ăn\*\*/);
    expect(m.content).toMatch(/chất béo bão hòa nên \*\*hạn chế\*\*/);
  }, T);

  it("7. hỏi viêm khớp rồi “còn rượu bia thì sao?” → vẫn đúng bệnh đang nói, có phần riêng của gout", async () => {
    const r = await chat(["Viêm khớp nên kiêng gì?", "còn rượu bia thì sao?"]);
    expect(r[1].med).toEqual({ id: "viem-khop", aspect: "food" });
    expect(r[1].content).toMatch(/Với \*\*viêm khớp\*\* nói chung: \*\*rượu bia\*\* nên \*\*hạn chế\*\*/);
    expect(r[1].content).toMatch(/\*\*Gout\*\*: bia nên \*\*hạn chế\*\*/);
  }, T);

  it("8. câu chung về viêm khớp không bị tự xếp thành gout / viêm khớp dạng thấp; 'viêm' không còn khớp nhầm đau dạ dày", async () => {
    for (const t of ["Viêm khớp nên kiêng gì?", "thấp khớp kiêng gì", "bệnh xương khớp nên ăn gì", "a bị viêm khớp"]) {
      const m = await last([t]);
      expect(m.med?.id, t).toBe("viem-khop");
    }
    expect(healthSubjectOf("viêm khớp nên kiêng gì", true)?.diet).not.toBe("stomach");
    expect(healthSubjectOf("viêm dạ dày kiêng gì", true)?.diet).toBe("stomach"); // bệnh dạ dày thật vẫn nhận đúng
  }, T);

  it("9. câu hỏi viêm khớp không phải ăn uống → vẫn đi luồng cũ (định nghĩa, diễn tiến, khám)", async () => {
    expect((await last(["viêm khớp là gì"])).med).toEqual({ id: "viem-khop", aspect: "define" });
    expect((await last(["viêm khớp có chữa được không"])).med?.aspect).toBe("course");
    expect((await last(["viêm khớp khi nào cần đi khám"])).med?.aspect).toBe("doctor");
  }, T);

  it("10. hỏi “nguồn đâu?” sau câu trả lời → mới đưa nguồn: đủ các trang (kèm đường dẫn) của viêm khớp và từng loại", async () => {
    const r = await chat(["Viêm khớp nên kiêng gì?", "nguồn đâu e"]);
    expect(r[1].content).toMatch(/\*\*viêm khớp\*\* lấy từ các trang sau/i);
    expect(r[1].content).toMatch(/https:\/\/www\.nhs\.uk\//);
    expect(r[1].content).toMatch(/\*\*gout\*\* lấy từ các trang sau/i);
    expect(r[1].content).toMatch(/rà soát \d{2}\/\d{2}\/\d{4}/);
    expect(r[1].med?.id).toBe("viem-khop"); // vẫn giữ chủ đề cho câu hỏi tiếp
    const t = await chat(["Viêm khớp nên kiêng gì?", "nguồn đâu", "còn rượu bia thì sao?"]);
    expect(t[2].med).toEqual({ id: "viem-khop", aspect: "food" });
  }, T);
});
