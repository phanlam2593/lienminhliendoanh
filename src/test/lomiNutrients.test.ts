// 30/10 — vitamin · khoáng chất theo bệnh (lib/lomiNutrients): ép quy tắc nguồn giống kho kiến thức y khoa, và nhận diện đúng chất / bệnh.
import { describe, expect, it } from "vitest";
import { TRUSTED } from "@/lib/lomiDrugData";
import { NUTRIENTS, NUT_SOURCES, nutrientOf, nutrientReply } from "@/lib/lomiNutrients";
import INDEX from "@/lib/medkb/index.json";

const DOSE = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g\/|ml|iu|ui|đv|viên|gói|giọt|lần\/ngày|lần mỗi ngày)\b/i;
const IDS = new Set((INDEX as { id: string }[]).map((r) => r.id));

describe("lomiNutrients — dữ liệu", () => {
  it("nguồn tin cậy, src hợp lệ, không liều, bệnh liên quan có trong kho", () => {
    for (const s of NUT_SOURCES) {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      expect(TRUSTED.some((d) => host === d || host.endsWith(`.${d}`)), host).toBe(true);
    }
    for (const x of NUTRIENTS) {
      const facts = [...x.what, ...x.foods, x.short, ...x.who, ...x.tooMuch, ...x.topics];
      for (const f of facts) {
        expect(f.src.length, `${x.id}: ${f.text}`).toBeGreaterThan(0);
        for (const i of f.src) expect(NUT_SOURCES[i], `${x.id}: src ${i}`).toBeTruthy();
        expect(DOSE.test(f.text), `${x.id} có liều: ${f.text}`).toBe(false);
        expect(f.text.length, `${x.id}: ${f.text}`).toBeLessThanOrEqual(260);
      }
      for (const t of x.topics) expect(IDS.has(t.id), `${x.id}: thẻ ${t.id} không có`).toBe(true);
    }
  });
});

describe("lomiNutrients — nhận diện", () => {
  it("nhận đúng chất, không nhầm chữ thường", () => {
    expect(nutrientOf("kẽm có trong thực phẩm nào")?.id).toBe("kem");
    expect(nutrientOf("hải sản có nhiều kẽm không")?.id).toBe("kem");
    expect(nutrientOf("vitamin b12 có trong gì")?.id).toBe("vitamin-b12");
    expect(nutrientOf("uống dầu cá có tốt không")?.id).toBe("omega-3");
    expect(nutrientOf("muối i-ốt có tác dụng gì")?.id).toBe("i-ot");
    expect(nutrientOf("ăn kem có mập không")).toBeNull();
    expect(nutrientOf("tối nay ăn kem nha")).toBeNull();
    expect(nutrientOf("cửa sắt bị gỉ")?.id ?? null).not.toBe("kem");
  });
  it("hỏi theo bệnh: có chất nguồn nêu → liệt kê; không có → nói thật, không bịa", () => {
    expect(nutrientReply("bị cảm nên uống vitamin gì", { id: "cam-lanh", name: "cảm lạnh" })).toMatch(/không ngừa được cảm lạnh/);
    expect(nutrientReply("bị cảm nên uống vitamin gì", { id: "cam-lanh", name: "cảm lạnh" })).toMatch(/xịt mũi/);
    expect(nutrientReply("huyết áp cao nên bổ sung gì", { id: "tang-huyet-ap", name: "tăng huyết áp" })).toMatch(/chưa nêu vitamin hay khoáng chất nào/);
    expect(nutrientReply("uống kẽm bao nhiêu mg", null)).toMatch(/không nêu liều/);
    expect(nutrientReply("nhồi máu cơ tim có nên uống dầu cá", { id: "nhoi-mau-co-tim", name: "nhồi máu cơ tim" })).toMatch(/chưa được chứng minh bảo vệ tim/);
  });
});
