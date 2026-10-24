// 20/10 — mẹo dân gian / thuốc nam có nguồn (lib/lomiFolk): ép quy tắc nguồn giống kho kiến thức y khoa.
import { describe, expect, it } from "vitest";
import { TRUSTED } from "@/lib/lomiDrugData";
import { FOLK, findFolk, findUnverifiedHerb, folkFor, folkReply } from "@/lib/lomiFolk";
import INDEX from "@/lib/medkb/index.json";

const DOSE = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g\/|ml|iu|đv|viên|gói|giọt|lần\/ngày|lần mỗi ngày)\b/i;
const IDS = new Set((INDEX as { id: string }[]).map((r) => r.id));

describe("lomiFolk — dữ liệu", () => {
  it("mọi nguồn thuộc tên miền tin cậy, mọi src hợp lệ, không liều, ý ≤ 220 ký tự, bệnh liên quan có trong kho", () => {
    for (const f of FOLK) {
      expect(f.sources.length, f.id).toBeGreaterThan(0);
      for (const s of f.sources) {
        const host = new URL(s.url).hostname.replace(/^www\./, "");
        expect(TRUSTED.some((d) => host === d || host.endsWith(`.${d}`)), `${f.id}: ${host}`).toBe(true);
      }
      const facts = [...f.folk, ...f.science, ...(f.how ?? []), ...f.caution, ...f.topics];
      for (const x of facts) {
        expect(x.src.length, `${f.id}: ${x.text}`).toBeGreaterThan(0);
        for (const i of x.src) expect(f.sources[i], `${f.id}: src ${i}`).toBeTruthy();
        expect(DOSE.test(x.text), `${f.id} có liều: ${x.text}`).toBe(false);
        expect(x.text.length, `${f.id}: ${x.text}`).toBeLessThanOrEqual(220);
      }
      for (const t of f.topics) expect(IDS.has(t.id), `${f.id}: thẻ ${t.id} không có`).toBe(true);
      expect((f.folk.length || f.belief) && f.science.length && (f.caution.length || f.how?.length), f.id).toBeTruthy();
    }
  });
  it("tên không trùng giữa các vị", () => {
    const seen = new Map<string, string>();
    for (const f of FOLK.filter((x) => !x.ctx && x.id !== "boi-bong")) for (const n of f.names) {
      expect(seen.get(n), `${n}: ${f.id} trùng ${seen.get(n)}`).toBeUndefined();
      seen.set(n, f.id);
    }
  });
});

describe("lomiFolk — nhận diện", () => {
  it("vị có nguồn", () => {
    expect(findFolk("lá tía tô có tác dụng gì")?.id).toBe("tia-to");
    expect(findFolk("cháo cóc có tốt cho trẻ suy dinh dưỡng không")?.id).toBe("thit-coc");
    expect(findFolk("uống hà thủ ô cho đen tóc được không")?.id).toBe("ha-thu-o");
    expect(findFolk("chanh mật ong trị ho")?.id).toBe("mat-ong-chanh");
    expect(findFolk("bị bỏng bôi kem đánh răng được không")?.id).toBe("boi-bong");
  });
  it("không nhầm: trái cóc, áo nhàu, kem đánh răng không nói tới bỏng", () => {
    expect(findFolk("ăn trái cóc chấm muối ớt")).toBeNull();
    expect(findFolk("áo bị nhàu quá")).toBeNull();
    expect(findFolk("kem đánh răng nào tốt")).toBeNull();
  });
  it("vị chưa có nguồn → nói thật", () => {
    expect(findUnverifiedHerb("kỷ tử có tác dụng gì")).toBe("kỷ tử");
    const r = folkReply("táo tàu có tác dụng gì", null, null)!;
    expect(r.text).toMatch(/chưa tìm được nguồn y khoa đáng tin/);
  });
  it("hỏi món với bệnh mà vị không liên quan → nhường lớp kiêng cữ", () => {
    expect(folkReply("gout ăn gừng được không", { id: "gout", name: "gout" }, null)).toBeNull();
  });
  it("bệnh có mẹo dân gian → danh sách; bệnh chưa có → nói thật", () => {
    expect(folkFor("ho").length).toBeGreaterThan(1);
    expect(folkReply("mẹo dân gian trị ho", { id: "ho", name: "ho" }, null)!.text).toMatch(/Chanh mật ong/);
    expect(folkReply("bài thuốc nam chữa gout", { id: "gout", name: "gout" }, null)!.text).toMatch(/chưa đối chiếu được mẹo dân gian/);
  });
});

// 24/10 — theo ý Kir: thêm mẹo về trái cây, lá, rau (bưởi + thuốc, dứa, lựu, hạt lanh, cà rốt sáng mắt, rau ngót sống)
describe("lomiFolk — trái cây, lá, rau (24/10)", () => {
  it("nhận đúng vị, không bắt nhầm món ăn thường", () => {
    expect(findFolk("đang uống thuốc mỡ máu ăn bưởi được không")?.id).toBe("buoi-thuoc");
    expect(findFolk("dứa có tác dụng gì")?.id).toBe("dua-bromelain");
    expect(findFolk("nước ép lựu có tốt không")?.id).toBe("luu");
    expect(findFolk("hạt lanh có tác dụng gì")?.id).toBe("hat-lanh");
    expect(findFolk("ăn cà rốt có sáng mắt không")?.id).toBe("ca-rot-mat");
    expect(findFolk("uống nước rau ngót sống giảm cân được không")?.id).toBe("rau-ngot-song");
    expect(findFolk("canh rau ngót")).toBeNull();
    expect(findFolk("mùi thơm quá")).toBeNull();
  });
  it("rau ngót sống: cảnh báo nguy hiểm ngay; bưởi + thuốc mỡ máu: lưu ý tương tác thuốc", () => {
    const a = folkReply("uống nước rau ngót sống giảm cân được không", null, null);
    expect(a?.verdict).toBe("danger");
    expect(a?.text).toMatch(/nấu chín/);
    const b = folkReply("đang uống thuốc mỡ máu ăn bưởi được không", { id: "mo-mau-cao", name: "Mỡ máu cao" }, null);
    expect(b?.text).toMatch(/statin/);
    expect(b?.text).toMatch(/FDA/);
  });
});

// 24/10 (đợt 2) — theo ý Kir: thêm mẹo nhân gian cho bệnh phổ biến; ưu tiên mẹo làm sai gây hại.
describe("lomiFolk — mẹo nhân gian bệnh phổ biến (24/10)", () => {
  it("nhận đúng mẹo theo ngữ cảnh bệnh", () => {
    expect(findFolk("bị bong gân cổ chân xoa rượu được không")?.id).toBe("bong-gan-xoa-ruou");
    expect(findFolk("trẹo chân chườm nóng được không")?.id).toBe("bong-gan-xoa-ruou");
    expect(findFolk("con uống nhầm thuốc chuột có nên móc họng cho nôn không")?.id).toBe("ngo-doc-gay-non");
    expect(findFolk("nuốt phải nước tẩy cho uống sữa được không")?.id).toBe("ngo-doc-gay-non");
    expect(findFolk("ông bị méo miệng có nên chích máu đầu ngón tay không")?.id).toBe("dot-quy-chich-mau");
    expect(findFolk("say nắng cạo gió được không")?.id).toBe("say-nang-cao-gio");
    expect(findFolk("trào ngược kê gối cao có đỡ không")?.id).toBe("trao-nguoc-ke-goi");
    expect(findFolk("mất ngủ uống rượu cho dễ ngủ được không")?.id).toBe("mat-ngu-uong-ruou");
    expect(findFolk("đau bụng kinh chườm nóng có đỡ không")?.id).toBe("dau-bung-kinh-chuom-am");
    expect(findFolk("bị nấc cụt nín thở có hết không")?.id).toBe("nac-cut-meo");
    expect(findFolk("táo bón ăn gì, ăn nhiều rau được không")?.id).toBe("tao-bon-an-uong");
  });
  it("không bắt nhầm khi không đúng ngữ cảnh", () => {
    expect(findFolk("cuối tuần đi massage thư giãn")).toBeNull();
    expect(findFolk("tối nay uống bia với bạn")).toBeNull();
    expect(findFolk("ăn trái cây gì tốt")).toBeNull();
    expect(findFolk("cạo gió có tác dụng gì")).toBeNull();
    expect(findFolk("bón phân cho cây đi bộ ra vườn")).toBeNull();
    // ngộ độc thực phẩm: không áp lời "đừng cho uống gì" của trang ngộ độc chất độc
    expect(findFolk("ngộ độc thực phẩm cho uống sữa được không")?.id).not.toBe("ngo-doc-gay-non");
  });
  it("mẹo sai gây hại: trả lời ngay, nói rõ cách đúng", () => {
    const a = folkReply("bị bong gân cổ chân xoa rượu được không", null, null)!;
    expect(a.verdict).toBe("myth");
    expect(a.text).toMatch(/chườm lạnh/);
    const b = folkReply("con uống nhầm thuốc chuột có nên móc họng cho nôn không", null, null)!;
    expect(b.text).toMatch(/KHÔNG tìm cách làm người đó nôn/);
    expect(b.text).toMatch(/115/);
    const c = folkReply("ông bị méo miệng có nên chích máu đầu ngón tay không", null, null)!;
    expect(c.text).toMatch(/FAST/);
    const d = folkReply("say nắng ủ ấm cho ra mồ hôi được không", null, null)!;
    expect(d.text).toMatch(/làm MÁT/);
  });
  it("thẻ bệnh có thêm mẹo đã đối chiếu", () => {
    for (const id of ["bong-gan", "ngo-doc", "dot-quy", "say-nang", "trao-nguoc-da-day-thuc-quan", "mat-ngu", "dau-bung-kinh", "nac-cut", "tao-bon"]) expect(folkFor(id).length, id).toBeGreaterThan(0);
  });
});

// 24/10 — câu gõ có dấu: tên vị phải khớp đúng dấu ("nghe nói" ≠ nghệ, "tối nay" ≠ tỏi, "sa sút" ≠ sả); "toi bi ho" không dấu = "tôi bị ho".
describe("lomiFolk — khớp đúng dấu (24/10)", () => {
  it("không nhận nhầm từ thường thành tên vị", () => {
    expect(findFolk("nghe nói mai mưa")).toBeNull();
    expect(findFolk("tôi nghe nhạc")).toBeNull();
    expect(findFolk("tối nay ăn gì")).toBeNull();
    expect(findFolk("quê tôi ở Huế")).toBeNull();
    expect(findFolk("toi bi ho")).toBeNull();
    expect(findUnverifiedHerb("sa sút tinh thần quá")).toBeNull();
    expect(findUnverifiedHerb("mã đề thi là gì")).toBeNull();
  });
  it("vẫn nhận tên vị gõ đúng dấu hoặc không dấu", () => {
    expect(findFolk("nghệ có tác dụng gì")?.id).toBe("nghe");
    expect(findFolk("Tỏi có tốt không")?.id).toBe("toi");
    expect(findFolk("an toi song co tot khong")?.id).toBe("toi");
    expect(findFolk("la tia to co tac dung gi")?.id).toBe("tia-to");
    expect(findUnverifiedHerb("uống nước sả được không")).toBe("sả");
    expect(findUnverifiedHerb("ky tu co tac dung gi")).toBeTruthy();
  });
});
