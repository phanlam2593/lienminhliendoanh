// 27/10 — chỉ số xét nghiệm (lib/lomiLabs): khoảng tham khảo có nguồn, đọc con số, mức nguy hiểm, mẹo & kiêng từ thẻ.
import { describe, expect, it } from "vitest";
import { TRUSTED } from "@/lib/lomiDrugData";
import { LAB_SOURCES, LABS, labAsk } from "@/lib/lomiLabs";
import { vitalAsk } from "@/lib/lomiVitals";
import INDEX from "@/lib/medkb/index.json";

const IDS = new Set((INDEX as { id: string }[]).map((r) => r.id));

describe("lomiLabs — dữ liệu", () => {
  it("mọi nguồn thuộc tên miền tin cậy, mọi chỉ số trỏ tới nguồn có thật", () => {
    for (const [k, s] of Object.entries(LAB_SOURCES)) {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      expect(TRUSTED.some((d) => host === d || host.endsWith(`.${d}`)), `${k}: ${host}`).toBe(true);
    }
    for (const l of LABS) for (const k of [...l.src, ...(l.high?.src ?? []), ...(l.low?.src ?? [])]) expect(LAB_SOURCES[k], `${l.id}: ${k}`).toBeTruthy();
  });
  it("thẻ mẹo & kiêng có trong kho kiến thức", () => {
    const cards = new Set<string>(["mo-mau-cao", "tang-huyet-ap", "huyet-ap-thap", "tieu-duong-type-2", "tien-tieu-duong", "ha-duong-huyet", "beo-phi"]);
    for (const l of LABS) for (const c of [...(l.high?.cards ?? []), ...(l.low?.cards ?? [])]) cards.add(c);
    for (const q of ["axit uric 9 nam", "creatinin 2 mg/dl", "alt 100", "hemoglobin 9", "tsh 8", "tsh 0.1", "vitamin d 8 ng/ml", "egfr 40"]) for (const c of labAsk(q)?.cards ?? []) cards.add(c);
    for (const c of cards) expect(IDS.has(c), c).toBe(true);
  });
});

describe("lomiLabs — đọc con số", () => {
  it("điện giải", () => {
    expect(labAsk("Kali 3.1 có sao không")!.text).toMatch(/hạ kali máu/);
    expect(labAsk("Kali máu 5.9 nguy hiểm không")!.text).toMatch(/tăng kali máu[\s\S]*cấp cứu/);
    expect(labAsk("Natri 128 là sao")!.text).toMatch(/hạ natri máu[\s\S]*nguy hiểm tính mạng/);
    const r = labAsk("kết quả: natri 139, kali 4.2, clo 101, canxi 2.3")!;
    expect(r.labs).toEqual(["na", "k", "cl", "ca"]);
    expect(r.text).toMatch(/đều trong mức bình thường/);
    expect(labAsk("điện giải đồ bình thường bao nhiêu")!.text).toMatch(/Natri[\s\S]*Kali[\s\S]*Clo[\s\S]*Canxi/);
  });
  it("nam / nữ khác ngưỡng; đổi đơn vị", () => {
    expect(labAsk("Axit uric 520 có cao không, anh là nam")!.text).toMatch(/cao hơn mức bình thường ở nam/);
    expect(labAsk("acid uric 7.5 của chị có sao không")!.text).toMatch(/ở nữ/);
    expect(labAsk("acid uric 7.5 có sao không")!.text).toMatch(/cao\*\* nếu là nữ/);
    expect(labAsk("Creatinin 150 µmol/L có sao không")!.text).toMatch(/≈ 1,7 mg\/dL/);
    expect(labAsk("Hemoglobin 10.5 vợ anh có thiếu máu không")!.text).toMatch(/thiếu máu/);
  });
  it("mức nguy hiểm khi nguồn có ghi", () => {
    expect(labAsk("Tiểu cầu 40 nguy hiểm không")!.text).toMatch(/🚨[\s\S]*dưới 50\.000/);
    expect(labAsk("tiểu cầu 40000")!.text).toMatch(/dưới 50\.000/);
    expect(labAsk("eGFR 12")!.text).toMatch(/suy thận/);
    expect(labAsk("vitamin D 400 nmol/L")!.text).toMatch(/gây hại nghiêm trọng/);
    expect(vitalAsk("Huyết áp 190/115 có sao không")!.text).toMatch(/180\/110/);
  });
  it("gan, máu, giáp, vitamin D, BMI", () => {
    const g = labAsk("ALT 120 AST 80 có sao không")!;
    expect(g.labs).toEqual(["alt", "ast"]);
    expect(g.cards).toContain("men-gan-cao");
    expect(labAsk("Bạch cầu 15.6 cao không")!.text).toMatch(/tăng bạch cầu/);
    expect(labAsk("TSH 6.8 là sao")!.cards).toEqual(["suy-giap"]);
    expect(labAsk("vitamin D 18 ng/mL")!.text).toMatch(/≈ 45 nmol\/L/);
    expect(labAsk("vitamin D 25")!.text).toMatch(/đơn vị nào/);
    const b = labAsk("A cao 1m68 nặng 75kg có béo không")!;
    expect(b.text).toMatch(/26,6/);
    expect(b.cards).toEqual(["beo-phi"]);
    expect(labAsk("BMI 24 có ổn không")!.text).toMatch(/gốc châu Á/);
  });
  it("hỏi kiêng không số: kali cao → danh sách thực phẩm có nguồn", () => {
    expect(labAsk("Kali cao kiêng gì")!.text).toMatch(/hạn chế thực phẩm nhiều kali/);
  });
  it("chỉ số lệch thì có thẻ mẹo & kiêng; bình thường thì không", () => {
    expect(vitalAsk("cholesterol 6.5 có cao không")!.cards).toEqual(["mo-mau-cao"]);
    expect(vitalAsk("huyết áp 150/95")!.cards).toEqual(["tang-huyet-ap"]);
    expect(vitalAsk("đường huyết lúc đói 8.5")!.cards).toEqual(["tieu-duong-type-2"]);
    expect(vitalAsk("huyết áp 120/80")!.cards).toBeUndefined();
    expect(labAsk("kali 4.2")!.cards).toEqual([]);
  });
});

describe("lomiLabs — không bắt nhầm", () => {
  it("chữ Việt trùng chữ viết tắt, hỏi liều thuốc, bệnh có thẻ riêng", () => {
    expect(labAsk("đau gót chân có sao không")).toBeNull();
    expect(labAsk("Vitamin D3 uống bao nhiêu")).toBeNull();
    expect(labAsk("uống vitamin D 1000 IU mỗi ngày được không")).toBeNull();
    expect(labAsk("bệnh bạch cầu là gì")).toBeNull();
    expect(labAsk("men gan cao kiêng gì")).toBeNull();
    expect(labAsk("bị gout 3 năm rồi")).toBeNull();
    expect(labAsk("tối nay ăn gì")).toBeNull();
    expect(labAsk("chỉ số này là gì")).toBeNull();
  });
});
