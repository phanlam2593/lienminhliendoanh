// 30/10 — calo · đường · muối · kali của món (lib/lomiFoodFacts): số liệu chép từ bảng FDA, nhận diện món, chỉ số theo bệnh.
import { describe, expect, it } from "vitest";
import { TRUSTED } from "@/lib/lomiDrugData";
import { FACTS, FACT_SOURCES, factLine, factOf, renderFact } from "@/lib/lomiFoodFacts";
import { nutrientReply } from "@/lib/lomiNutrients";

describe("lomiFoodFacts — dữ liệu", () => {
  it("nguồn tin cậy; mỗi món trỏ đúng nguồn; số hợp lý", () => {
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
      if (f.sugar !== undefined) expect(f.sugar, f.id).toBeLessThanOrEqual(f.carb);
      if (f.src === 2) expect(f.g, f.id).toBe(84);
    }
  });
  it("vài số khớp bảng FDA", () => {
    const by = (id: string) => FACTS.find((f) => f.id === id)!;
    expect([by("chuoi").g, by("chuoi").kcal, by("chuoi").sugar]).toEqual([126, 110, 19]);
    expect([by("dua-hau").g, by("dua-hau").kcal, by("dua-hau").sugar]).toEqual([280, 80, 20]);
    expect([by("khoai-tay").k, by("can-tay").na]).toEqual([620, 115]);
    expect([by("tom").chol, by("ca-hoi").kcal]).toEqual([170, 200]);
  });
});

describe("lomiFoodFacts — nhận diện, theo bệnh", () => {
  it("tên dài thắng; tên một chữ gõ không dấu không bắt", () => {
    expect(factOf("cá hồi vân bao nhiêu calo")?.id).toBe("ca-hoi-van");
    expect(factOf("cá hồi bao nhiêu calo")?.id).toBe("ca-hoi");
    expect(factOf("dưa hấu có nhiều đường không")?.id).toBe("dua-hau");
    expect(factOf("cam bao nhieu calo")).toBeNull(); // "cam" không dấu có thể là "cảm"
    expect(factOf("dua hau bao nhieu calo")?.id).toBe("dua-hau");
    expect(factOf("bơ bao nhiêu calo")).toBeNull(); // bơ (trái) hay bơ (thực phẩm từ sữa) — không đoán
  });
  it("chỉ số theo bệnh đứng đầu", () => {
    const banana = factOf("chuối")!;
    expect(factLine(banana, "tieu-duong")).toMatch(/tinh bột \(carb\) \*\*30 g\*\* · đường \*\*19 g\*\*/);
    expect(factLine(banana, "benh-than-man")).toMatch(/kali \*\*450 mg\*\*/);
    expect(factLine(factOf("cần tây")!, "tang-huyet-ap")).toMatch(/natri \*\*115 mg\*\*/);
    expect(factLine(factOf("tôm")!, "mo-mau-cao")).toMatch(/cholesterol 170 mg/);
    expect(renderFact(banana, null)).toMatch(/110 kcal/);
  });
  it("lớp vitamin chuyển câu hỏi calo / đường sang bảng số liệu; món chưa có thì nói thật", () => {
    expect(nutrientReply("chuối bao nhiêu calo", null)).toMatch(/110 kcal/);
    expect(nutrientReply("phở bao nhiêu calo", null)).toMatch(/chưa có số liệu/);
    expect(nutrientReply("chuối bao nhiêu calo", null, Date.now(), { noNumbers: true }) ?? "").not.toMatch(/110 kcal/);
    expect(nutrientReply("cảm bao nhiêu calo", { id: "cam-lanh", name: "cảm lạnh" }, Date.now(), { typed: "cam bao nhiêu calo" })).toMatch(/\*\*Cam\*\*/);
  });
});
