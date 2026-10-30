// ─────────────────────────────────────────────────────────────────────────────
// CHỈ SỐ XÉT NGHIỆM (27/10, theo ý Kir: "update toàn bộ mấy chỉ số về bệnh — mỡ máu, ion, đường… cao thấp, mức độ nguy hiểm,
//   cùng với mẹo, kiêng") — chạy trên máy, không gọi AI. Huyết áp / đường huyết / mỡ máu nằm ở lib/lomiVitals.
//
// Nguyên tắc (giống lib/lomiVitals):
//   1. Chỉ đưa KHOẢNG THAM KHẢO đúng như nguồn công bố (MedlinePlus, NIDDK, NIH ODS, CDC, NHS) — luôn nói mỗi phòng xét nghiệm
//      có thể ghi khoảng hơi khác, đối chiếu phiếu kết quả; không chẩn đoán.
//   2. "Mức nguy hiểm" chỉ nêu khi nguồn có ghi (vd tiểu cầu dưới 50.000 dễ chảy máu, eGFR từ 15 trở xuống là suy thận,
//      vitamin D trên 375 nmol/L có thể gây hại nghiêm trọng); kali / natri: nguồn không ghi con số nguy hiểm → nói dấu hiệu cần đi ngay.
//   3. Mẹo & kiêng: lấy từ thẻ kiến thức có nguồn (lib/medkb — gout, bệnh thận mạn, thiếu máu…) qua `cards`, hoặc ý có nguồn
//      ngay trong file này (thực phẩm giàu kali — MedlinePlus).
// Nguồn (Claude mở từng trang và đối chiếu ngày 27/10/2026) — xem LAB_SOURCES.
// ─────────────────────────────────────────────────────────────────────────────
import { sourceLine, type DrugFact, type DrugSource } from "@/lib/lomiDrugData";
import type { MedTopic } from "@/lib/lomiMed";

const VERIFIED = "2026-10-27";
const mp = (art: string, title: string, reviewed: string): DrugSource => ({ title, publisher: "MedlinePlus (NIH, Hoa Kỳ)", url: `https://medlineplus.gov/ency/article/${art}.htm`, reviewed });
export const LAB_SOURCES: Record<string, DrugSource> = {
  na: mp("003481", "Sodium blood test", "2025-11-06"),
  naLow: mp("000394", "Low blood sodium", "2025-05-19"),
  k: mp("003484", "Potassium test", "2025-05-19"),
  kHigh: mp("001179", "High potassium level", "2025-10-01"),
  kLow: mp("000479", "Low blood potassium", "2025-05-19"),
  cl: mp("003485", "Chloride test – blood", "2025-05-19"),
  ca: mp("003477", "Calcium blood test", "2025-11-06"),
  caIon: mp("003486", "Calcium – ionized", "2025-05-19"),
  uric: mp("003476", "Uric acid – blood", "2025-04-01"),
  cre: mp("003475", "Creatinine blood test", "2025-07-13"),
  gfr: mp("007305", "Glomerular filtration rate", "2025-07-01"),
  gfrNiddk: { title: "Chronic Kidney Disease Tests & Diagnosis", publisher: "NIDDK (NIH, Hoa Kỳ)", url: "https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/tests-diagnosis", reviewed: "2016-10-01" },
  alt: mp("003473", "Alanine transaminase (ALT) blood test", "2025-01-01"),
  ast: mp("003472", "Aspartate aminotransferase (AST) blood test", "2025-01-01"),
  hb: mp("003645", "Hemoglobin", "2026-02-27"),
  cbc: mp("003642", "CBC blood test", "2024-10-14"),
  wbc: mp("003643", "WBC count", "2025-02-03"),
  plt: mp("003647", "Platelet count", "2025-02-03"),
  tsh: mp("003684", "TSH test", "2026-01-25"),
  vitd: { title: "Vitamin D – Fact Sheet for Consumers", publisher: "NIH ODS (Văn phòng Thực phẩm bổ sung, Hoa Kỳ)", url: "https://ods.od.nih.gov/factsheets/VitaminD-Consumer/", updated: "2022-11-08" },
  bmiCdc: { title: "Adult BMI Categories", publisher: "CDC (Hoa Kỳ)", url: "https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html", updated: "2024-03-19" },
  bmiNhs: { title: "Obesity", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/obesity/", reviewed: "2026-04-29" },
};

export type LabId = "na" | "k" | "cl" | "ca" | "caIon" | "uric" | "cre" | "gfr" | "alt" | "ast" | "hb" | "rbc" | "hct" | "wbc" | "plt" | "tsh" | "vitd" | "bmi";
export type LabReply = { kind: "lab"; labs: LabId[]; text: string; /** thẻ kiến thức (lib/medkb) để đưa mẹo & kiêng */ cards: string[] };

/** Bỏ dấu, giữ ký hiệu (+, /, .) để đọc đơn vị. */
const plainOf = (s: string) => s.normalize("NFC").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
const fmt = (x: number, d = 1) => {
  const r = Math.round(x * 10 ** d) / 10 ** d;
  return String(r).replace(".", ",");
};
const thou = (x: number) => Math.round(x).toLocaleString("de-DE"); // 150000 → "150.000"

type Sex = "m" | "f" | null;
/** Giới tính trên chữ CÓ DẤU ("chỉ số" không phải "chị", "có" không phải "cô"); gõ không dấu thì không đoán. */
const sexOf = (raw: string): Sex =>
  /(^|[^\p{L}])(nữ|phụ nữ|chị|vợ|mẹ|má|bà|cô ấy|con gái|em gái|bạn gái)(?=$|[^\p{L}])/u.test(raw) ? "f"
  : /(^|[^\p{L}])(nam|nam giới|đàn ông|chồng|bố|ba|ông|anh|con trai|em trai)(?=$|[^\p{L}])/u.test(raw) ? "m" : null;

type Level = "ok" | "low" | "high" | "danger-low" | "danger-high";
type Read = { level: Level; line: string; cards?: string[]; src: string[]; extra?: string[] };
type LabDef = {
  id: LabId;
  name: string;
  /** chữ nhận ra (trên chuỗi đã bỏ dấu, giữ ký hiệu). Có `needNum` thì chỉ nhận khi ngay sau là con số. */
  re: RegExp;
  needNum?: RegExp;
  range: string;
  src: string[];
  /** đọc con số (đơn vị người dùng gõ, có thể rỗng) */
  read: (v: number, unit: string, sex: Sex, p: string) => Read | null;
  /** câu hỏi cao / thấp không có số → ý nghĩa + mẹo */
  high?: { means: string; cards?: string[]; src: string[]; tips?: string };
  low?: { means: string; cards?: string[]; src: string[]; tips?: string };
  /** có thẻ kiến thức riêng (câu "X cao" không số để thẻ đó đáp) */
  hasCard?: boolean;
};

const K_HIGH_FOODS = "MedlinePlus: kali máu cao thì thường cần **hạn chế thực phẩm nhiều kali** — măng tây, bơ, khoai tây, cà chua / sốt cà chua, bí, bí đỏ, rau chân vịt (cải bó xôi) nấu chín; cam / nước cam, kiwi, nho khô và trái cây sấy, chuối, dưa lưới, mận khô; và **muối ăn kiêng (muối thay thế) vì rất nhiều kali**. Ăn kiêng cụ thể thế nào thì theo bác sĩ / chuyên gia dinh dưỡng dặn, vì còn tuỳ bệnh thận, thuốc đang uống.";
const K_LOW_FOODS = "MedlinePlus kể các thực phẩm giàu kali: bơ, khoai tây nướng, chuối, cám, cà rốt, thịt bò nạc nấu chín, sữa, cam, bơ đậu phộng, đậu Hà Lan và các loại đậu, cá hồi, rong biển, rau chân vịt, cà chua, mầm lúa mì. Đừng tự uống viên kali khi bác sĩ chưa chỉ định.";
const K_URGENT = "🚨 Đi khám / cấp cứu **ngay** nếu kèm đau ngực, khó thở, hồi hộp đánh trống ngực, mạch chậm / yếu / không đều, yếu cơ nhiều, nôn — kali lệch nhiều có thể gây rối loạn nhịp tim nguy hiểm (MedlinePlus).";
const NA_URGENT = "🚨 Natri máu thấp **có thể nguy hiểm tính mạng**: nếu kèm lú lẫn, bứt rứt, đau đầu, buồn nôn / nôn, yếu hay chuột rút cơ, co giật, lơ mơ thì gọi bác sĩ / đi cấp cứu **ngay**; natri tụt nhanh (dưới 48 giờ) nguy hiểm hơn tụt từ từ (MedlinePlus).";

/** Bảng các chỉ số. Khoảng tham khảo người lớn; mỗi phòng xét nghiệm có thể ghi khoảng hơi khác. */
export const LABS: LabDef[] = [
  {
    id: "na",
    name: "Natri (Na)",
    re: /\b(natri|sodium|na\+|natri mau)\b/,
    needNum: /\bna\s*\+?\s*[:=]?\s*(?=\d)/,
    range: "**Natri (Na)**: 135–145 mmol/L (mEq/L)",
    src: ["na"],
    read: (v) => {
      if (v < 90 || v > 200) return null;
      if (v < 135) return { level: "low", line: `Natri **${fmt(v)} mmol/L** thấp hơn mức bình thường (135–145) — gọi là **hạ natri máu**. Hay gặp khi nôn / tiêu chảy, đổ nhiều mồ hôi, dùng thuốc lợi tiểu, suy tim, bệnh thận, xơ gan, suy giáp… (MedlinePlus).`, src: ["na", "naLow"], extra: [NA_URGENT] };
      if (v > 145) return { level: "high", line: `Natri **${fmt(v)} mmol/L** cao hơn mức bình thường (135–145) — gọi là **tăng natri máu**. Hay do mất nước (uống không đủ, đổ nhiều mồ hôi, tiêu chảy, bỏng), ăn quá mặn, một số thuốc hoặc bệnh tuyến thượng thận / đái tháo nhạt (MedlinePlus).`, src: ["na"] };
      return { level: "ok", line: `Natri **${fmt(v)} mmol/L** nằm trong mức bình thường (135–145).`, src: ["na"] };
    },
    high: { means: "Natri cao thường do **mất nước** (uống không đủ, đổ nhiều mồ hôi, tiêu chảy, bỏng), ăn quá mặn, một số thuốc, hoặc bệnh tuyến thượng thận / đái tháo nhạt (MedlinePlus).", src: ["na"] },
    low: { means: "Natri thấp hay gặp khi nôn / tiêu chảy, đổ nhiều mồ hôi, dùng thuốc lợi tiểu, suy tim, bệnh thận, xơ gan, suy giáp, hội chứng SIADH (MedlinePlus).", src: ["na", "naLow"], tips: NA_URGENT },
  },
  {
    id: "k",
    name: "Kali (K)",
    re: /\b(kali|kali mau|potassium|k\+)/,
    needNum: /\bk\s*\+?\s*[:=]\s*(?=\d)|\bk\+\s*(?=\d)/,
    range: "**Kali (K)**: 3,7–5,2 mmol/L (mEq/L)",
    src: ["k"],
    read: (v) => {
      if (v < 1 || v > 10) return null;
      if (v < 3.7) return { level: "low", line: `Kali **${fmt(v)} mmol/L** thấp hơn mức bình thường (3,7–5,2) — gọi là **hạ kali máu**. Hay do tiêu chảy, nôn, thuốc lợi tiểu, ăn quá ít kali… Thấp ít thường không triệu chứng hoặc chỉ mệt, yếu / chuột rút cơ, táo bón, tê bì; thấp nhiều có thể gây rối loạn nhịp tim, choáng, ngất (MedlinePlus).`, src: ["k", "kLow"], extra: [K_LOW_FOODS, K_URGENT] };
      if (v > 5.2) return { level: "high", line: `Kali **${fmt(v)} mmol/L** cao hơn mức bình thường (3,7–5,2) — gọi là **tăng kali máu**. Hay gặp ở bệnh thận / suy thận, một số thuốc huyết áp (nhóm ức chế men chuyển, ARB, lợi tiểu giữ kali, chẹn beta), ăn quá nhiều kali… Thường không có triệu chứng; kali rất cao cần **cấp cứu** (MedlinePlus).`, src: ["k", "kHigh"], extra: [K_URGENT, K_HIGH_FOODS] };
      return { level: "ok", line: `Kali **${fmt(v)} mmol/L** nằm trong mức bình thường (3,7–5,2).`, src: ["k"] };
    },
    high: { means: "Kali cao hay gặp ở bệnh thận / suy thận, một số thuốc huyết áp (ức chế men chuyển, ARB, lợi tiểu giữ kali, chẹn beta), ăn quá nhiều kali. Thường không có triệu chứng; kali rất cao cần cấp cứu (MedlinePlus).", src: ["k", "kHigh"], tips: `${K_HIGH_FOODS}\n\n${K_URGENT}` },
    low: { means: "Kali thấp hay do tiêu chảy, nôn, thuốc lợi tiểu, lạm dụng thuốc nhuận tràng, đổ nhiều mồ hôi, ăn quá ít kali (MedlinePlus).", src: ["k", "kLow"], tips: `${K_LOW_FOODS}\n\n${K_URGENT}` },
  },
  {
    id: "cl",
    name: "Clo (Cl)",
    re: /\b(clo|clorua|chloride|clo mau)\b/,
    needNum: /\bcl\s*-?\s*[:=]?\s*(?=\d)/,
    range: "**Clo (Cl)**: 98–107 mmol/L (mEq/L)",
    src: ["cl"],
    read: (v) => {
      if (v < 60 || v > 160) return null;
      if (v < 98) return { level: "low", line: `Clo **${fmt(v)} mmol/L** thấp hơn mức bình thường (98–107). Hay gặp khi nôn, mất nước / đổ nhiều mồ hôi, suy tim, bỏng… (MedlinePlus).`, src: ["cl"] };
      if (v > 107) return { level: "high", line: `Clo **${fmt(v)} mmol/L** cao hơn mức bình thường (98–107). Hay gặp khi tiêu chảy, bệnh thận, nhiễm toan… (MedlinePlus).`, src: ["cl"] };
      return { level: "ok", line: `Clo **${fmt(v)} mmol/L** nằm trong mức bình thường (98–107).`, src: ["cl"] };
    },
  },
  {
    id: "caIon",
    name: "Canxi ion hoá",
    re: /\b(canxi ion|calci ion|ca ion|canxi ion hoa|calci ion hoa|ion calci|ionized calcium|ca\+\+|ca2\+)/,
    range: "**Canxi ion hoá**: 1,20–1,40 mmol/L (4,8–5,6 mg/dL) ở người lớn",
    src: ["caIon"],
    read: (v, unit) => {
      const mg = /mg/.test(unit) || v > 3;
      const mmol = mg ? v / 4 : v;
      if (mmol < 0.4 || mmol > 3) return null;
      const show = mg ? `**${fmt(v)} mg/dL**` : `**${fmt(v, 2)} mmol/L**`;
      if (mmol < 1.2) return { level: "low", line: `Canxi ion hoá ${show} thấp hơn mức bình thường (1,20–1,40 mmol/L). Có thể gặp khi suy tuyến cận giáp, kém hấp thu, viêm tuỵ, suy thận, thiếu vitamin D… (MedlinePlus).`, src: ["caIon"] };
      if (mmol > 1.4) return { level: "high", line: `Canxi ion hoá ${show} cao hơn mức bình thường (1,20–1,40 mmol/L). Có thể gặp khi cường tuyến cận giáp, cường giáp, dùng quá nhiều vitamin A / D, một số bệnh ung thư… (MedlinePlus).`, src: ["caIon"] };
      return { level: "ok", line: `Canxi ion hoá ${show} nằm trong mức bình thường (1,20–1,40 mmol/L).`, src: ["caIon"] };
    },
  },
  {
    id: "ca",
    name: "Canxi toàn phần",
    re: /\b(canxi|calci|calcium|canxi mau|canxi toan phan|calci toan phan)\b/,
    range: "**Canxi toàn phần**: 2,20–2,58 mmol/L (8,8–10,3 mg/dL)",
    src: ["ca"],
    read: (v, unit) => {
      const mg = /mg/.test(unit) || v > 4;
      const mmol = mg ? v / 4.008 : v;
      if (mmol < 1 || mmol > 5) return null;
      const show = mg ? `**${fmt(v)} mg/dL**` : `**${fmt(v, 2)} mmol/L**`;
      if (mmol < 2.2) return { level: "low", line: `Canxi ${show} thấp hơn mức bình thường (2,20–2,58 mmol/L). Có thể do thiếu vitamin D, kém hấp thu, suy tuyến cận giáp, suy thận, bệnh gan, albumin máu thấp, thiếu magie, viêm tuỵ (MedlinePlus).`, src: ["ca"], cards: ["thieu-vitamin-d"] };
      if (mmol > 2.58) return { level: "high", line: `Canxi ${show} cao hơn mức bình thường (2,20–2,58 mmol/L). Có thể do cường tuyến cận giáp, dùng quá nhiều canxi / vitamin D, nằm bất động lâu, cường giáp, một số bệnh ung thư hay thuốc (MedlinePlus).`, src: ["ca"] };
      return { level: "ok", line: `Canxi ${show} nằm trong mức bình thường (2,20–2,58 mmol/L).`, src: ["ca"] };
    },
    low: { means: "Canxi máu thấp có thể do thiếu vitamin D, kém hấp thu, suy tuyến cận giáp, suy thận, bệnh gan, albumin máu thấp, thiếu magie, viêm tuỵ (MedlinePlus).", cards: ["thieu-vitamin-d"], src: ["ca"] },
    high: { means: "Canxi máu cao có thể do cường tuyến cận giáp, dùng quá nhiều canxi / vitamin D, nằm bất động lâu, cường giáp, một số bệnh ung thư hay thuốc (MedlinePlus).", src: ["ca"] },
  },
  {
    id: "uric",
    name: "Axit uric",
    re: /\b(axit uric|acid uric|a xit uric|uric acid|a uric|uric)\b/,
    range: "**Axit uric**: nữ 3,0–7,1 mg/dL (≈ 178–422 µmol/L) · nam 4,0–8,6 mg/dL (≈ 238–512 µmol/L); người đang điều trị gout thường được đặt mục tiêu dưới 6 (hoặc dưới 5) mg/dL",
    src: ["uric"],
    read: (v, unit, sex) => {
      const um = /mol/.test(unit) || v > 25;
      const mg = um ? v / 59.48 : v;
      if (mg < 0.5 || mg > 25) return null;
      const show = um ? `**${fmt(v, 0)} µmol/L** (≈ ${fmt(mg)} mg/dL)` : `**${fmt(v)} mg/dL** (≈ ${fmt(v * 59.48, 0)} µmol/L)`;
      const top = sex === "f" ? 7.1 : 8.6;
      const lo = sex === "f" ? 3.0 : sex === "m" ? 4.0 : 3.0;
      if (mg > top) return { level: "high", line: `Axit uric ${show} cao hơn mức bình thường${sex ? (sex === "f" ? " ở nữ (3,0–7,1 mg/dL)" : " ở nam (4,0–8,6 mg/dL)") : " (nữ tới 7,1 · nam tới 8,6 mg/dL)"} — gọi là **tăng axit uric máu**, đôi khi gây **gout** hoặc bệnh thận. Hay do ăn nhiều đạm có purin, rượu bia, đồ uống nhiều đường fructose, mất nước, béo phì, bệnh thận, một số thuốc (MedlinePlus).`, src: ["uric"], cards: ["gout"] };
      if (!sex && mg > 7.1) return { level: "high", line: `Axit uric ${show}: **cao** nếu là nữ (trên 7,1 mg/dL); nếu là nam thì còn trong mức (tới 8,6 mg/dL). Người đang điều trị gout thường cần dưới 6 mg/dL (MedlinePlus).`, src: ["uric"], cards: ["gout"] };
      if (mg < lo) return { level: "low", line: `Axit uric ${show} thấp hơn mức thường gặp. Axit uric thấp ít khi gây vấn đề; có thể do ăn ít purin, một số thuốc hoặc bệnh hiếm (MedlinePlus).`, src: ["uric"] };
      return { level: "ok", line: `Axit uric ${show} nằm trong mức bình thường${sex === "f" ? " ở nữ (3,0–7,1 mg/dL)" : sex === "m" ? " ở nam (4,0–8,6 mg/dL)" : ""}${mg >= 6 ? " — nhưng nếu đang điều trị gout thì mục tiêu thường là dưới 6 mg/dL" : ""}.`, src: ["uric"], cards: mg >= 6 ? ["gout"] : undefined };
    },
    high: { means: "Axit uric cao (tăng axit uric máu) đôi khi gây **gout** hoặc bệnh thận. Hay do ăn nhiều purin, rượu bia, đồ uống nhiều đường fructose, mất nước, béo phì, bệnh thận, một số thuốc (MedlinePlus).", cards: ["gout"], src: ["uric"] },
  },
  {
    id: "cre",
    name: "Creatinin",
    re: /\b(creatinin|creatinine|creatinin mau|cre|crea|creatinin huyet thanh)\b/,
    range: "**Creatinin**: nam 0,7–1,3 mg/dL (62–115 µmol/L) · nữ 0,5–0,95 mg/dL (44–84 µmol/L)",
    src: ["cre"],
    read: (v, unit, sex) => {
      const um = /mol/.test(unit) || v > 15;
      const mg = um ? v / 88.4 : v;
      if (mg < 0.1 || mg > 20) return null;
      const show = um ? `**${fmt(v, 0)} µmol/L** (≈ ${fmt(mg, 2)} mg/dL)` : `**${fmt(v, 2)} mg/dL** (≈ ${fmt(v * 88.4, 0)} µmol/L)`;
      const top = sex === "f" ? 0.95 : 1.3;
      if (mg > top || (!sex && mg > 0.95)) {
        const both = !sex && mg <= 1.3 ? " — **cao nếu là nữ** (trên 0,95 mg/dL ≈ 84 µmol/L), còn nam thì vẫn trong mức (tới 1,3 mg/dL)" : ` — cao hơn mức bình thường${sex === "f" ? " ở nữ" : sex === "m" ? " ở nam" : ""}`;
        return { level: "high", line: `Creatinin ${show}${both}. Creatinin cao có thể do thận lọc kém (bệnh thận, nhiễm trùng thận, giảm máu tới thận), tắc đường tiểu, mất nước, tiêu cơ… (MedlinePlus). Bác sĩ thường xem kèm **eGFR** để biết thận lọc còn bao nhiêu.`, src: ["cre"], cards: mg > top ? ["benh-than-man"] : undefined };
      }
      return { level: "ok", line: `Creatinin ${show} nằm trong mức bình thường${sex === "f" ? " ở nữ" : sex === "m" ? " ở nam" : ""}.`, src: ["cre"] };
    },
    high: { means: "Creatinin cao có thể do thận lọc kém (bệnh thận, nhiễm trùng thận, giảm máu tới thận), tắc đường tiểu, mất nước, tiêu cơ… (MedlinePlus). Bác sĩ thường xem kèm eGFR.", cards: ["benh-than-man"], src: ["cre"] },
  },
  {
    id: "gfr",
    name: "eGFR (mức lọc cầu thận)",
    re: /\b(e ?gfr|gfr|muc loc cau than|do loc cau than|loc cau than|muc loc cau)\b/,
    range: "**eGFR** (mức lọc cầu thận): 90–120 mL/phút/1,73 m² là bình thường, giảm dần theo tuổi; NIDDK coi từ 60 trở lên là bình thường · dưới 60 kéo dài từ 3 tháng là dấu hiệu bệnh thận mạn · từ 15 trở xuống là **suy thận**",
    src: ["gfr", "gfrNiddk"],
    read: (v) => {
      if (v <= 0 || v > 200) return null;
      if (v <= 15) return { level: "danger-low", line: `eGFR **${fmt(v, 0)}** — từ 15 trở xuống là mức **suy thận**, cần được bác sĩ chăm sóc **ngay**; đa số người ở mức này cần lọc máu hoặc ghép thận (MedlinePlus, NIDDK).`, src: ["gfr", "gfrNiddk"], cards: ["benh-than-man"] };
      if (v < 60) return { level: "low", line: `eGFR **${fmt(v, 0)}** dưới 60 — nếu kéo dài từ 3 tháng trở lên là dấu hiệu **bệnh thận mạn** (MedlinePlus); bác sĩ thường xét nghiệm lại và làm thêm xét nghiệm nước tiểu (albumin) để xác nhận.`, src: ["gfr", "gfrNiddk"], cards: ["benh-than-man"] };
      if (v < 90) return { level: "ok", line: `eGFR **${fmt(v, 0)}** — NIDDK coi từ 60 trở lên là mức bình thường; eGFR cũng giảm dần theo tuổi. Hỏi bác sĩ khi nào nên xét nghiệm lại.`, src: ["gfr", "gfrNiddk"] };
      return { level: "ok", line: `eGFR **${fmt(v, 0)}** nằm trong mức bình thường (90–120).`, src: ["gfr"] };
    },
    low: { means: "eGFR dưới 60 kéo dài từ 3 tháng là dấu hiệu bệnh thận mạn; từ 15 trở xuống là suy thận, cần chăm sóc y tế ngay (MedlinePlus, NIDDK).", cards: ["benh-than-man"], src: ["gfr", "gfrNiddk"] },
  },
  {
    id: "alt",
    name: "ALT (GPT)",
    re: /\b(alt|gpt|sgpt|alat)\b/,
    range: "**ALT (GPT)**: 4–36 U/L",
    src: ["alt"],
    read: (v) => {
      if (v <= 0 || v > 5000) return null;
      if (v > 36) return { level: "high", line: `ALT (GPT) **${fmt(v, 0)} U/L** cao hơn mức bình thường (4–36) — ALT cao thường là dấu hiệu **gan đang bị tổn thương**${v > 36 * 3 ? `, ở đây cao gấp khoảng ${fmt(v / 36, 0)} lần mức trên` : ""}. Nguyên nhân hay gặp: gan nhiễm mỡ, viêm gan (virus, rượu), thuốc / chất hại gan (rượu, paracetamol quá liều)… (MedlinePlus).`, src: ["alt"], cards: ["men-gan-cao", "gan-nhiem-mo"] };
      return { level: "ok", line: `ALT (GPT) **${fmt(v, 0)} U/L** nằm trong mức bình thường (4–36).`, src: ["alt"] };
    },
    hasCard: true,
  },
  {
    id: "ast",
    name: "AST (GOT)",
    re: /\b(ast|got|sgot|asat)\b/,
    range: "**AST (GOT)**: 8–33 U/L",
    src: ["ast"],
    read: (v) => {
      if (v <= 0 || v > 5000) return null;
      if (v > 33) return { level: "high", line: `AST (GOT) **${fmt(v, 0)} U/L** cao hơn mức bình thường (8–33)${v > 33 * 3 ? `, cao gấp khoảng ${fmt(v / 33, 0)} lần mức trên` : ""}. AST cao hay do bệnh gan, nhưng cũng có thể do tổn thương cơ, nhồi máu cơ tim, viêm tuỵ, rượu, thuốc; tăng tạm thời sau vận động mạnh, phẫu thuật (MedlinePlus).`, src: ["ast"], cards: ["men-gan-cao", "gan-nhiem-mo"] };
      return { level: "ok", line: `AST (GOT) **${fmt(v, 0)} U/L** nằm trong mức bình thường (8–33).`, src: ["ast"] };
    },
    hasCard: true,
  },
  {
    id: "hb",
    name: "Hemoglobin (Hb)",
    re: /\b(hemoglobin|haemoglobin|huyet sac to|hgb|hb(?!a1c| a1c|a 1c))\b/,
    range: "**Hemoglobin (Hb)**: nam 13,8–17,2 g/dL (138–172 g/L) · nữ 12,1–15,1 g/dL (121–151 g/L)",
    src: ["hb"],
    read: (v, unit, sex) => {
      const gl = /g\/l\b|g\/ l/.test(unit) || v > 30;
      const g = gl ? v / 10 : v;
      if (g < 2 || g > 26) return null;
      const show = gl ? `**${fmt(v, 0)} g/L**` : `**${fmt(v)} g/dL**`;
      const lo = sex === "f" ? 12.1 : sex === "m" ? 13.8 : 12.1;
      const hi = sex === "f" ? 15.1 : 17.2;
      if (g < lo || (!sex && g < 13.8)) {
        const both = !sex && g >= 12.1 ? " — **thấp nếu là nam** (dưới 13,8 g/dL); nữ thì vẫn trong mức (từ 12,1)" : ` — thấp hơn mức bình thường${sex === "f" ? " ở nữ" : sex === "m" ? " ở nam" : ""}, tức là **thiếu máu**`;
        return { level: "low", line: `Hemoglobin ${show}${both}. Hb thấp có thể do mất máu, thiếu sắt / folate / vitamin B12, bệnh mạn tính, bệnh thận, mang thai… (MedlinePlus).`, src: ["hb"], cards: ["thieu-mau"] };
      }
      if (g > hi) return { level: "high", line: `Hemoglobin ${show} cao hơn mức bình thường. Hay do thiếu oxy lâu ngày (hút thuốc, bệnh tim phổi), mất nước, sống vùng cao (như Đà Lạt — Hb tăng vài tuần khi lên cao), hoặc bệnh đa hồng cầu (MedlinePlus).`, src: ["hb"] };
      return { level: "ok", line: `Hemoglobin ${show} nằm trong mức bình thường${sex === "f" ? " ở nữ" : sex === "m" ? " ở nam" : ""}.`, src: ["hb"] };
    },
    low: { means: "Hemoglobin thấp là thiếu máu — có thể do mất máu, thiếu sắt / folate / vitamin B12, bệnh mạn tính, bệnh thận, mang thai (MedlinePlus).", cards: ["thieu-mau"], src: ["hb"] },
  },
  {
    id: "rbc",
    name: "Hồng cầu (RBC)",
    re: /\b(hong cau|rbc|so luong hong cau)\b/,
    range: "**Hồng cầu (RBC)**: nam 4,6–6,2 triệu/µL (T/L) · nữ 4,2–5,4 triệu/µL",
    src: ["cbc"],
    read: (v, _u, sex) => {
      const x = v > 100 ? v / 1e6 : v;
      if (x < 1 || x > 9) return null;
      const lo = sex === "f" ? 4.2 : 4.6;
      const hi = sex === "f" ? 5.4 : 6.2;
      if (x < lo || (!sex && x < 4.6)) return { level: "low", line: `Hồng cầu **${fmt(x, 2)} triệu/µL**${!sex && x >= 4.2 ? " — thấp nếu là nam (dưới 4,6), nữ thì vẫn trong mức (từ 4,2)" : " thấp hơn mức bình thường"} — hay đi kèm thiếu máu; bác sĩ xem cùng Hb, Hct (MedlinePlus).`, src: ["cbc"], cards: ["thieu-mau"] };
      if (x > hi) return { level: "high", line: `Hồng cầu **${fmt(x, 2)} triệu/µL** cao hơn mức bình thường — bác sĩ xem cùng Hb, Hct để tìm nguyên nhân (MedlinePlus).`, src: ["cbc"] };
      return { level: "ok", line: `Hồng cầu **${fmt(x, 2)} triệu/µL** nằm trong mức bình thường.`, src: ["cbc"] };
    },
  },
  {
    id: "hct",
    name: "Hematocrit (Hct)",
    re: /\b(hematocrit|hct|dung tich hong cau)\b/,
    range: "**Hematocrit (Hct)**: nam 40–55% · nữ 36–48%",
    src: ["cbc"],
    read: (v, _u, sex) => {
      const x = v < 1 ? v * 100 : v;
      if (x < 10 || x > 75) return null;
      const lo = sex === "f" ? 36 : 40;
      const hi = sex === "f" ? 48 : 55;
      if (x < lo || (!sex && x < 40)) return { level: "low", line: `Hematocrit **${fmt(x, 0)}%**${!sex && x >= 36 ? " — thấp nếu là nam (dưới 40%), nữ thì vẫn trong mức" : " thấp hơn mức bình thường"} — hay đi kèm thiếu máu (MedlinePlus).`, src: ["cbc"], cards: ["thieu-mau"] };
      if (x > hi) return { level: "high", line: `Hematocrit **${fmt(x, 0)}%** cao hơn mức bình thường — có thể do mất nước, thiếu oxy lâu ngày, bệnh đa hồng cầu (MedlinePlus).`, src: ["cbc", "hb"] };
      return { level: "ok", line: `Hematocrit **${fmt(x, 0)}%** nằm trong mức bình thường.`, src: ["cbc"] };
    },
  },
  {
    id: "wbc",
    name: "Bạch cầu (WBC)",
    re: /\b(wbc|so luong bach cau|chi so bach cau|bach cau)\b/,
    range: "**Bạch cầu (WBC)**: 4,5–11 G/L (4.500–11.000 tế bào/µL)",
    src: ["wbc"],
    read: (v) => {
      const x = v >= 300 ? v / 1000 : v;
      if (x <= 0 || x > 300) return null;
      if (x < 4.5) return { level: "low", line: `Bạch cầu **${fmt(x)} G/L** (≈ ${thou(x * 1000)}/µL) thấp hơn mức bình thường (4,5–11) — gọi là **giảm bạch cầu**. Có thể do một số bệnh virus, thuốc (gồm thuốc điều trị ung thư), bệnh tự miễn như lupus, bệnh tuỷ xương, gan, lách, nhiễm khuẩn rất nặng (MedlinePlus).`, src: ["wbc"] };
      if (x > 11) return { level: "high", line: `Bạch cầu **${fmt(x)} G/L** (≈ ${thou(x * 1000)}/µL) cao hơn mức bình thường (4,5–11) — gọi là **tăng bạch cầu**. Hay gặp nhất là do **nhiễm trùng** (thường do vi khuẩn), ngoài ra viêm, hút thuốc, mang thai, căng thẳng, bỏng, thuốc; hoặc bệnh máu như bệnh bạch cầu (MedlinePlus).`, src: ["wbc"] };
      return { level: "ok", line: `Bạch cầu **${fmt(x)} G/L** nằm trong mức bình thường (4,5–11).`, src: ["wbc"] };
    },
  },
  {
    id: "plt",
    name: "Tiểu cầu (PLT)",
    re: /\b(tieu cau|plt|platelet|so luong tieu cau)\b/,
    range: "**Tiểu cầu (PLT)**: 150–400 G/L (150.000–400.000/µL)",
    src: ["plt"],
    read: (v) => {
      const x = v >= 2000 ? v / 1000 : v;
      if (x <= 0 || x > 3000) return null;
      if (x < 50) return { level: "danger-low", line: `Tiểu cầu **${fmt(x, 0)} G/L** (≈ ${thou(x * 1000)}/µL) — **dưới 50.000** thì nguy cơ chảy máu cao hơn rõ, sinh hoạt hằng ngày cũng có thể gây chảy máu (MedlinePlus). Nên báo bác sĩ **sớm** để được dặn cách phòng và xử trí chảy máu.`, src: ["plt"] };
      if (x < 150) return { level: "low", line: `Tiểu cầu **${fmt(x, 0)} G/L** (≈ ${thou(x * 1000)}/µL) thấp hơn mức bình thường (150–400) — gọi là **giảm tiểu cầu**. Có thể do thuốc, hoá / xạ trị, bệnh tự miễn… (MedlinePlus). Bác sĩ sẽ tìm nguyên nhân và dặn cách phòng chảy máu.`, src: ["plt"] };
      if (x >= 400) return { level: "high", line: `Tiểu cầu **${fmt(x, 0)} G/L** (≈ ${thou(x * 1000)}/µL) từ 400 trở lên — gọi là **tăng tiểu cầu**. Hay do thiếu sắt, vừa nhiễm trùng, sau phẫu thuật / chấn thương; ít gặp hơn là bệnh tuỷ xương, ung thư. Tăng rất cao có thể làm tăng nguy cơ huyết khối hoặc chảy máu (MedlinePlus).`, src: ["plt"] };
      return { level: "ok", line: `Tiểu cầu **${fmt(x, 0)} G/L** nằm trong mức bình thường (150–400).`, src: ["plt"] };
    },
    low: { means: "Tiểu cầu thấp (dưới 150 G/L) có thể do thuốc, hoá / xạ trị, bệnh tự miễn; dưới 50 G/L thì nguy cơ chảy máu cao hơn rõ (MedlinePlus).", src: ["plt"] },
    high: { means: "Tiểu cầu cao (từ 400 G/L) hay do thiếu sắt, vừa nhiễm trùng, sau phẫu thuật / chấn thương; ít gặp hơn là bệnh tuỷ xương, ung thư (MedlinePlus).", src: ["plt"] },
  },
  {
    id: "tsh",
    name: "TSH (tuyến giáp)",
    re: /\b(tsh)\b/,
    range: "**TSH** (hormon kích thích tuyến giáp): 0,4–4,8 mIU/L; một số phòng xét nghiệm cho người lớn tuổi tới 7",
    src: ["tsh"],
    read: (v) => {
      if (v < 0 || v > 200) return null;
      if (v < 0.4) return { level: "low", line: `TSH **${fmt(v, 2)} mIU/L** thấp hơn mức bình thường (0,4–4,8) — có thể là **cường giáp** (tuyến giáp hoạt động quá mức, vd bệnh Basedow / Graves), hoặc đang uống quá liều thuốc tuyến giáp, một số thuốc khác (MedlinePlus).`, src: ["tsh"], cards: ["cuong-giap"] };
      if (v > 4.8) return { level: "high", line: `TSH **${fmt(v, 2)} mIU/L** cao hơn mức bình thường (0,4–4,8; người lớn tuổi có nơi lấy tới 7) — thường là dấu hiệu **suy giáp** (tuyến giáp hoạt động kém), hay gặp nhất do viêm tuyến giáp Hashimoto (MedlinePlus).`, src: ["tsh"], cards: ["suy-giap"] };
      return { level: "ok", line: `TSH **${fmt(v, 2)} mIU/L** nằm trong mức bình thường (0,4–4,8).`, src: ["tsh"] };
    },
    high: { means: "TSH cao thường là dấu hiệu suy giáp (tuyến giáp hoạt động kém), hay gặp nhất do viêm tuyến giáp Hashimoto (MedlinePlus).", cards: ["suy-giap"], src: ["tsh"] },
    low: { means: "TSH thấp có thể là cường giáp (vd bệnh Basedow / Graves), hoặc uống quá liều thuốc tuyến giáp (MedlinePlus).", cards: ["cuong-giap"], src: ["tsh"] },
  },
  {
    id: "vitd",
    name: "Vitamin D (25-OH)",
    re: /\b(vitamin d3?|vit d3?|vitd3?|25 ?oh|25\(oh\)d|25-oh|25 hydroxy)\b/,
    range: "**Vitamin D** (25(OH)D trong máu): dưới 30 nmol/L (12 ng/mL) là **quá thấp**, có thể làm xương yếu · từ 50 nmol/L (20 ng/mL) là đủ với hầu hết mọi người · trên 125 nmol/L (50 ng/mL) là quá cao · trên 375 nmol/L (150 ng/mL) có thể gây hại nghiêm trọng",
    src: ["vitd"],
    read: (v, unit) => {
      const ng = /ng/.test(unit);
      const nm = /nmol/.test(unit);
      if (v <= 0 || v > 1000) return null;
      const cls = (x: number) => (x > 375 ? "danger-high" : x > 125 ? "high" : x < 30 ? "low" : x < 50 ? "low" : "ok") as Level;
      const say = (x: number) => (x > 375 ? "trên 375 nmol/L — mức **có thể gây hại nghiêm trọng**, cần báo bác sĩ ngay và ngưng viên vitamin D tự mua" : x > 125 ? "trên 125 nmol/L — **quá cao**, thường do uống viên bổ sung nhiều (phơi nắng không gây thừa vitamin D)" : x < 30 ? "dưới 30 nmol/L — **quá thấp**, có thể làm xương yếu" : x < 50 ? "dưới 50 nmol/L — chưa tới mức đủ" : "từ 50 nmol/L trở lên — **đủ** với hầu hết mọi người");
      if (ng || nm) {
        const x = ng ? v * 2.5 : v;
        const lv = cls(x);
        return { level: lv, line: `Vitamin D **${fmt(v, 1)} ${ng ? "ng/mL" : "nmol/L"}**${ng ? ` (≈ ${fmt(x, 0)} nmol/L)` : ""}: ${say(x)}.`, src: ["vitd"], cards: lv === "low" ? ["thieu-vitamin-d"] : undefined };
      }
      // không ghi đơn vị: ng/mL và nmol/L lệch nhau 2,5 lần → nói cả hai cách đọc
      const a = cls(v * 2.5), b = cls(v);
      if (a === b) return { level: a, line: `Vitamin D **${fmt(v, 1)}**: dù phiếu ghi ng/mL hay nmol/L thì đều ${say(v * 2.5).split(" — ")[1] ?? say(v)}.`, src: ["vitd"], cards: a === "low" ? ["thieu-vitamin-d"] : undefined };
      return { level: a === "ok" || b === "ok" ? "ok" : a, line: `Vitamin D **${fmt(v, 1)}** — phiếu ghi đơn vị nào? Nếu là **ng/mL** (≈ ${fmt(v * 2.5, 0)} nmol/L) thì ${say(v * 2.5)}; nếu là **nmol/L** thì ${say(v)}.`, src: ["vitd"], cards: a === "low" || b === "low" ? ["thieu-vitamin-d"] : undefined };
    },
    low: { means: "Vitamin D dưới 30 nmol/L (12 ng/mL) là quá thấp, có thể làm xương yếu. Rất ít thực phẩm tự nhiên có vitamin D: cá béo, dầu gan cá, ít hơn ở gan bò, lòng đỏ trứng, phô mai, nấm phơi nắng; sữa / ngũ cốc có bổ sung. Da tự tạo vitamin D khi phơi nắng (kính cửa sổ chặn tia nắng này).", cards: ["thieu-vitamin-d"], src: ["vitd"] },
    high: { means: "Vitamin D trên 125 nmol/L (50 ng/mL) là quá cao, trên 375 nmol/L có thể gây hại nghiêm trọng — thường do uống viên bổ sung nhiều; phơi nắng không gây thừa vitamin D.", src: ["vitd"] },
  },
];

const NUM = /(\d+(?:[.,]\d+)?)\s*(mmol\/l|mmol|meq\/l|meq|µmol\/l|umol\/l|µmol|umol|micromol|mg\/dl|mg|g\/dl|g\/l|g|u\/l|ui\/l|iu\/l|ui|iu|ng\/ml|ng|nmol\/l|nmol|miu\/l|µiu\/ml|uiu\/ml|%|g\/l|k\/ul|\/ul|t\/l|x ?10)?/;
const NOT_LAB_AFTER = /^\s*(nam|thang|tuan|ngay|tuoi|lan|vien|tieng|gio|phut|kg|can|ky|cm|m\b)/;
const ASK = /\b(bao nhieu|may|la cao|la thap|binh thuong|chi so|nguong|muc nao|muc bao|the nao la|co sao|co nguy hiem|nguy hiem|co cao|co thap|cao khong|thap khong|on khong|doc giup|xem giup|ket qua|nghia la gi|la sao|xet nghiem)\b/;
const HIGH_W = /\b(cao|tang|vuot)\b/;
const LOW_W = /\b(thap|giam|thieu|hut|ha (kali|natri|canxi|calci|tieu cau|bach cau))\b/;
/** hỏi THUỐC / viên bổ sung ("vitamin D3 uống bao nhiêu", "uống kali") — để lớp thuốc đáp, không đọc như chỉ số máu. */
const DOSE_Q = /\b(uong|vien|lieu|bo sung|chich|tiem|truyen)\b/;
const DOSE_UNIT = /^(iu|ui|mcg|vien|mg)$/;
/** Chữ viết tắt Latin dễ trùng chữ Việt ("gót chân" → got, "cờ re"…) — câu gõ có dấu thì phải gõ đúng không dấu. */
const ABBR = /^(alt|ast|got|gpt|sgot|sgpt|alat|asat|cre|crea|hb|hgb|plt|tsh|wbc|rbc|hct|gfr|e ?gfr|na|na\s*\+?|k\s*\+?|k|clo|cl)$/;
const LATIN_IDS = new Set<LabId>(["alt", "ast", "cre", "hb", "plt", "tsh", "cl", "wbc", "rbc", "hct", "gfr", "na", "k"]);
const DIET_W = /\b(kieng|an gi|nen an|tranh an|meo|nen lam gi|lam sao|phai lam sao|cach ha|cach tang|ha xuong|tang len)\b/;
/** "điện giải đồ", "ion đồ" — hỏi chung cả nhóm. */
const IONO = /\b(ion do|dien giai do|dien giai|ion mau|xet nghiem ion|chi so ion|ion do mau)\b/;

type Hit = { lab: LabDef; at: number; end: number };
function findHits(p: string, raw: string): Hit[] {
  const hits: Hit[] = [];
  for (const lab of LABS) {
    const res = [lab.re, ...(lab.needNum ? [lab.needNum] : [])];
    for (const re0 of res) {
      const re = new RegExp(re0.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(p))) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        // chữ viết tắt Latin ("got", "alt", "na"…) mà trong câu gõ có dấu ("gót chân", "nà") → không phải tên xét nghiệm
        if (LATIN_IDS.has(lab.id) && ABBR.test(m[0].trim()) && raw.slice(m.index, m.index + m[0].length) !== p.slice(m.index, m.index + m[0].length)) continue;
        hits.push({ lab, at: m.index, end: m.index + m[0].length });
      }
    }
  }
  // canxi ion che canxi toàn phần ở cùng chỗ; giữ chữ dài hơn khi chồng nhau
  hits.sort((a, b) => a.at - b.at || b.end - a.end);
  const out: Hit[] = [];
  for (const h of hits) {
    const last = out[out.length - 1];
    if (last && h.at < last.end) continue;
    out.push(h);
  }
  return out;
}

const srcLineOf = (keys: string[]) => {
  const uniq = [...new Set(keys)];
  return sourceLine({ sources: uniq.map((k) => LAB_SOURCES[k]), verifiedAt: VERIFIED }, uniq.map((_, i) => i));
};
const NOTE = "Mỗi phòng xét nghiệm có thể ghi khoảng bình thường **hơi khác** — cứ đối chiếu cột “khoảng tham chiếu” trên phiếu của bạn. Một chỉ số lệch một chút chưa chắc là bệnh: bác sĩ đọc cùng các chỉ số khác, triệu chứng và thuốc đang dùng.";

/**
 * Câu hỏi / câu kể CHỈ SỐ XÉT NGHIỆM (kali, natri, axit uric, creatinin, eGFR, ALT/AST, Hb, bạch cầu, tiểu cầu, TSH, vitamin D,
 * BMI…) → đọc con số theo khoảng tham khảo có nguồn; không phải thì null.
 */
export function labAsk(text: string): LabReply | null {
  const raw = ` ${text.normalize("NFC").toLowerCase().replace(/[“”"']/g, " ")} `;
  const p = plainOf(raw);
  if (p.trim().split(/\s+/).length > 60) return null;
  const bmi = bmiAsk(p);
  if (bmi) return bmi;
  const hits = findHits(p, raw);
  const iono = IONO.test(p);
  if (!hits.length && !iono) return null;
  const sex = sexOf(raw);
  const reads: { lab: LabDef; r: Read }[] = [];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const stop = hits[i + 1]?.at ?? p.length;
    const seg = p.slice(h.end, Math.min(stop, h.end + 28));
    const m = seg.match(NUM);
    if (!m) continue;
    const after = seg.slice((m.index ?? 0) + m[0].length);
    if (NOT_LAB_AFTER.test(after) || /^\s*(nam|thang|tuoi)/.test(seg.slice((m.index ?? 0) + m[1].length))) continue;
    // số chen giữa hai chữ ("bạch cầu 3 ngày nay") — bỏ
    let v = Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    // "4.500" (dấu chấm hàng nghìn) đã bỏ ở trên; "4,5" → 4.5
    if (!isFinite(v)) continue;
    const unit = (m[2] ?? "").trim();
    if (DOSE_UNIT.test(unit) && DOSE_Q.test(p) && h.lab.id === "vitd") continue;
    if (h.lab.id === "wbc" && /x ?10/.test(unit)) v = Number(m[1].replace(",", "."));
    const r = h.lab.read(v, unit, sex, p);
    if (r) reads.push({ lab: h.lab, r });
  }
  const askNo = ASK.test(p) || DIET_W.test(p) || HIGH_W.test(p) || LOW_W.test(p);
  if (!reads.length) {
    // không có con số: hỏi ngưỡng ("kali bao nhiêu là bình thường"), hỏi chung điện giải đồ, hoặc "kali cao kiêng gì"
    if (iono && !hits.length) return { kind: "lab", labs: ["na", "k", "cl", "ca", "caIon"], text: renderTable(LABS.filter((l) => ["na", "k", "cl", "ca", "caIon"].includes(l.id)), "📏 **Điện giải đồ (ion đồ)** — khoảng tham khảo ở người lớn:"), cards: [] };
    if (!hits.length || !askNo || DOSE_Q.test(p)) return null;
    const labs = [...new Set(hits.map((h) => h.lab))];
    const dir: "high" | "low" | null = HIGH_W.test(p) && !LOW_W.test(p) ? "high" : LOW_W.test(p) && !HIGH_W.test(p) ? "low" : null;
    const lines: string[] = [];
    const src: string[] = [];
    const cards: string[] = [];
    // thẻ riêng ("men gan cao", "bạch cầu" — bệnh) đáp câu cao / thấp không số; ở đây chỉ trả khi hỏi NGƯỠNG
    if (!ASK.test(p) && labs.every((l) => l.hasCard || !(dir ? l[dir] : null))) return null;
    for (const l of labs) {
      const d = dir ? l[dir] : null;
      if (d) {
        lines.push(`🩺 **${l.name} ${dir === "high" ? "cao" : "thấp"}**: ${d.means}`);
        if (d.tips) lines.push(d.tips);
        src.push(...d.src);
        cards.push(...(d.cards ?? []));
      }
      src.push(...l.src);
    }
    lines.push(renderTable(labs, "📏 Khoảng tham khảo ở người lớn:"));
    lines.push(NOTE);
    lines.push(srcLineOf(src));
    return { kind: "lab", labs: labs.map((l) => l.id), text: lines.join("\n\n"), cards: [...new Set(cards)] };
  }
  const out: string[] = [];
  const src: string[] = [];
  const cards: string[] = [];
  const extras: string[] = [];
  const icon = (lv: Level) => (lv === "ok" ? "✅" : lv.startsWith("danger") ? "🚨" : "⚠️");
  const abnormal = reads.filter((x) => x.r.level !== "ok");
  if (reads.length > 1) out.push(`🩺 Lomi đọc ${reads.length} chỉ số bạn gửi${abnormal.length ? ` — **${abnormal.length} chỉ số ngoài mức bình thường**` : " — **đều trong mức bình thường**"}:`);
  for (const { r } of reads) {
    out.push(`${icon(r.level)} ${r.line}`);
    src.push(...r.src);
    cards.push(...(r.cards ?? []));
    for (const e of r.extra ?? []) if (!extras.includes(e)) extras.push(e);
  }
  out.push(...extras);
  if (abnormal.some((x) => x.r.level.startsWith("danger"))) out.push("Có chỉ số ở **mức nguy hiểm** theo nguồn — bạn nên liên hệ bác sĩ **sớm nhất có thể** (hôm nay), đừng chờ tái khám định kỳ.");
  else if (abnormal.length) out.push("Có chỉ số ngoài mức bình thường — nên mang phiếu kết quả tới bác sĩ để được đọc cùng các chỉ số khác và tìm nguyên nhân; đừng tự mua thuốc uống.");
  if (reads.length === 1) out.push(`📏 Khoảng tham khảo: ${reads[0].lab.range.replace(/^\*\*[^*]+\*\*:\s*/, "")}.`);
  out.push(NOTE);
  if (sex === null && reads.some((x) => ["uric", "cre", "hb", "rbc", "hct"].includes(x.lab.id))) out.push("(Chỉ số này có mức khác nhau giữa **nam và nữ** — bạn cho Lomi biết là nam hay nữ để đọc chính xác hơn nha.)");
  out.push(srcLineOf(src));
  return { kind: "lab", labs: reads.map((x) => x.lab.id), text: out.join("\n\n"), cards: [...new Set(cards)] };
}

function renderTable(labs: LabDef[], head: string): string {
  return `${head}\n${labs.map((l) => `• ${l.range}`).join("\n")}`;
}

// ── BMI (chỉ số khối cơ thể) ────────────────────────────────────────────────
const BMI_W = /\b(bmi|chi so khoi|chi so co the|chi so khoi co the|beo khong|map khong|gay khong|thua can khong|can nang chuan|can nang hop ly|co beo|co gay|co map|beo phi khong)\b/;
function bmiAsk(p: string): LabReply | null {
  const hasW = BMI_W.test(p);
  const hM = p.match(/\b(?:cao\s*)?(1)\s*m\s*(\d{1,2})\b/) ?? p.match(/\b(?:cao\s*)?(1)[.,](\d{1,2})\s*m\b/);
  const hCm = p.match(/\bcao\s*(\d{3})\s*(?:cm)?\b/) ?? p.match(/\b(1\d{2})\s*cm\b/);
  const wKg = p.match(/\b(?:nang|can nang|can|nang ky)\s*(\d{2,3}(?:[.,]\d)?)\s*(?:kg|ky|ki|can|ki lo|kilo)?\b/) ?? p.match(/\b(\d{2,3}(?:[.,]\d)?)\s*(?:kg|ky|ki lo|kilo|kí)\b/);
  const bmiN = p.match(/\bbmi\s*(?:la|=|:|cua (?:a|anh|em|toi|minh|chi))?\s*(\d{2}(?:[.,]\d+)?)\b/);
  let bmi: number | null = null;
  let how = "";
  if (bmiN) bmi = Number(bmiN[1].replace(",", "."));
  else if ((hM || hCm) && wKg) {
    const h = hM ? Number(`${hM[1]}.${hM[2].padEnd(2, "0")}`) : Number(hCm![1]) / 100;
    const w = Number(wKg[1].replace(",", "."));
    if (h < 1.2 || h > 2.2 || w < 25 || w > 250) return null;
    bmi = w / (h * h);
    how = `Chiều cao **${fmt(h, 2)} m**, cân nặng **${fmt(w)} kg** → BMI = cân nặng ÷ (chiều cao × chiều cao) ≈ **${fmt(bmi)}**.`;
  } else if (!hasW || !ASK.test(p) || !/\bbmi\b/.test(p)) return null;
  if (bmi !== null && (bmi < 10 || bmi > 70)) return null;
  if (!hasW && !how && bmi === null) return null;
  if (!hasW && !(hM || hCm)) return null;
  const table = "📏 Phân loại BMI người lớn:\n• Theo CDC (Hoa Kỳ): dưới 18,5 **thiếu cân** · 18,5–dưới 25 **khoẻ mạnh** · 25–dưới 30 **thừa cân** · từ 30 **béo phì** (từ 40 là béo phì nặng).\n• NHS (Anh) lưu ý người **gốc châu Á** (gồm người Việt) gặp vấn đề sức khoẻ ở BMI **thấp hơn**: từ **23** đã là thừa cân, từ **27,5** là béo phì.";
  const out: string[] = [];
  const cards: string[] = [];
  if (bmi !== null) {
    if (how) out.push(`🩺 ${how}`);
    const cls = bmi < 18.5 ? "⚠️ **thiếu cân** (dưới 18,5)" : bmi < 23 ? "✅ **khoẻ mạnh**" : bmi < 25 ? "🔸 vẫn trong mức khoẻ mạnh theo CDC (dưới 25), nhưng với người **gốc châu Á** NHS đã xếp là **thừa cân** (từ 23)" : bmi < 27.5 ? "⚠️ **thừa cân** (CDC: 25–dưới 30; người gốc châu Á: 23–27,4)" : bmi < 30 ? "⚠️ thừa cân theo CDC, nhưng với người **gốc châu Á** NHS xếp là **béo phì** (từ 27,5)" : bmi < 40 ? "⚠️ **béo phì** (từ 30)" : "🚨 **béo phì nặng** (từ 40)";
    out.push(`BMI **${fmt(bmi)}**: ${cls}.`);
    if (bmi >= 23) cards.push("beo-phi");
    out.push("BMI chỉ là con số ước lượng — không phân biệt cơ với mỡ, nên người tập thể hình nhiều cơ có thể BMI cao mà không béo; vòng bụng to cũng là dấu hiệu nguy cơ. Không dùng bảng này cho trẻ em, phụ nữ mang thai.");
  }
  out.push(table);
  out.push(srcLineOf(["bmiCdc", "bmiNhs"]));
  return { kind: "lab", labs: ["bmi"], text: out.join("\n\n"), cards };
}

// ── Mẹo & kiêng lấy từ thẻ kiến thức có nguồn (lib/medkb) ─────────────────────
/** Đoạn ngắn "mẹo & kiêng" từ phần ăn uống / chăm sóc của thẻ — kèm nguồn của thẻ. */
export function labTips(t: MedTopic, name: string, now = Date.now()): string | null {
  const ok = t.diet?.ok.slice(0, 2) ?? [];
  const avoid = t.diet?.avoid.slice(0, 2) ?? [];
  const care = t.care.slice(0, ok.length + avoid.length ? 2 : 3);
  if (!ok.length && !avoid.length && !care.length) return null;
  const b = (fs: DrugFact[]) => fs.map((f) => `• ${f.text}`).join("\n");
  const parts = [
    `🥗 **Mẹo & kiêng — ${name}:**`,
    avoid.length ? `🚫 Hạn chế / kiêng:\n${b(avoid)}` : "",
    ok.length ? `✅ Nên:\n${b(ok)}` : "",
    care.length ? `💡 Chăm sóc:\n${b(care)}` : "",
    sourceLine(t, [...ok, ...avoid, ...care].flatMap((f) => f.src), now),
  ].filter(Boolean);
  return parts.join("\n");
}
