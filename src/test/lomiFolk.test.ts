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
