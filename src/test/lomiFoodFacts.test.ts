// 30/10 — calo · đường · muối · kali · purin của món (lib/lomiFoodFacts + lib/vnFoodData): số liệu chép từ
//   Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng) và bảng FDA; nhận diện món; chỉ số theo bệnh.
import { describe, expect, it } from "vitest";
import { TRUSTED } from "@/lib/lomiDrugData";
import { FACTS, FACT_SOURCES, factLine, factOf, renderFact } from "@/lib/lomiFoodFacts";
import { VN_ROWS } from "@/lib/vnFoodData";
import { nutrientReply } from "@/lib/lomiNutrients";

describe("lomiFoodFacts — dữ liệu", () => {
  it("nguồn tin cậy; mỗi món trỏ đúng nguồn; mã bảng không trùng; tên gọi không trùng", () => {
    for (const s of FACT_SOURCES) {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      expect(TRUSTED.some((d) => host === d || host.endsWith(`.${d}`)), host).toBe(true);
    }
    const ids = new Set<string>();
    for (const f of FACTS) {
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      expect(FACT_SOURCES[f.src], f.id).toBeTruthy();
      expect(f.g, f.id).toBeGreaterThan(0);
      if (f.src === 2) expect(f.g, f.id).toBe(84);
      if (f.src === 8) expect(f.g, f.id).toBe(100);
    }
    const names = new Set<string>();
    for (const r of VN_ROWS) {
      expect(r.v.length, r.table).toBe(14);
      for (const n of r.names) {
        expect(names.has(n), n).toBe(false);
        names.add(n);
      }
    }
    // chữ trùng nghĩa khác dễ bắt nhầm — không được làm tên gọi trần
    for (const bad of ["đường", "táo", "giá", "trai", "tương", "muối", "thơm", "me", "hồng", "tắc", "bơ"]) expect(names.has(bad), bad).toBe(false);
  });
  it("vài số khớp đúng bảng Việt Nam (100 g phần ăn được)", () => {
    const by = (code: number) => VN_ROWS.find((r) => r.code === code)!.v;
    expect(by(5030).slice(0, 4)).toEqual([62, 1.5, undefined, 14]); // Mít mật
    expect([by(5055)[0], by(5055)[3], by(5055)[5]]).toEqual([62, 14.1, 14.8]); // Xoài chín
    expect([by(5048)[0], by(5048)[3]]).toEqual([132, 26.9]); // Sầu riêng
    expect([by(13017)[6]]).toEqual([7720]); // Nước mắm: natri
    expect([by(8051)[12]]).toEqual([147]); // Tôm biển: purin
  });
});

describe("lomiFoodFacts — nhận diện, theo bệnh", () => {
  it("bảng Việt Nam trước, tên dài thắng; chữ dễ nhầm không bắt", () => {
    expect(factOf("mít bao nhiêu calo")?.id).toBe("vn-5030");
    expect(factOf("mít dai bao nhiêu calo")?.id).toBe("vn-5028");
    expect(factOf("chuối bao nhiêu calo")?.id).toBe("vn-5007");
    expect(factOf("cá hồi bao nhiêu calo")?.id).toBe("vn-8011");
    expect(factOf("cá hồi vân bao nhiêu calo")?.id).toBe("ca-hoi-van"); // chỉ FDA có
    expect(factOf("cam bao nhieu calo")).toBeNull(); // "cam" không dấu có thể là "cảm"
    expect(factOf("bị táo bón nên ăn gì nhiều chất xơ")).toBeNull();
    expect(factOf("tiểu đường ăn mít được không")?.id).toBe("vn-5030"); // "đường" trong "tiểu đường" không phải món đường
  });
  it("chỉ số theo bệnh đứng đầu", () => {
    const banana = factOf("chuối")!;
    expect(factLine(banana, "tieu-duong")).toMatch(/glucid\) \*\*22,2 g\*\*/);
    expect(factLine(banana, "benh-than-man")).toMatch(/kali \*\*329 mg\*\*/);
    expect(factLine(factOf("nước mắm")!, "tang-huyet-ap")).toMatch(/natri \*\*7720 mg\*\*/);
    expect(factLine(factOf("tôm")!, "gout")).toMatch(/purin \*\*147 mg\*\*/);
    expect(factLine(factOf("tôm")!, "mo-mau-cao")).toMatch(/cholesterol 152 mg/);
    expect(renderFact(banana, null)).toMatch(/97 kcal/);
  });
  it("lớp vitamin chuyển câu hỏi calo / đường sang bảng số liệu; món nấu sẵn thì nói thật", () => {
    expect(nutrientReply("chuối bao nhiêu calo", null)).toMatch(/97 kcal/);
    expect(nutrientReply("phở bao nhiêu calo", null)).toMatch(/chưa có số liệu/);
    expect(nutrientReply("chuối bao nhiêu calo", null, Date.now(), { noNumbers: true }) ?? "").not.toMatch(/97 kcal/);
    expect(nutrientReply("cảm bao nhiêu calo", { id: "cam-lanh", name: "cảm lạnh" }, Date.now(), { typed: "cam bao nhiêu calo" })).toMatch(/\*\*Cam\*\*/);
  });
});
