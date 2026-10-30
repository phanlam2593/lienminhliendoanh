// ─────────────────────────────────────────────────────────────────────────────
// CALO · ĐƯỜNG · BÉO · MUỐI · KALI CỦA MÓN ĂN (30/10, Kir: "calo, lượng đường đồ nữa, a muốn tư vấn mấy bệnh đồ
//   thì mấy thứ dinh dưỡng tư vấn z á") — chạy trên máy, không gọi AI.
//
// Nguyên tắc:
//   1. Số liệu chép nguyên từ bảng chính thức của FDA (Hoa Kỳ) cho trái cây, rau củ tươi và hải sản nấu chín —
//      đúng KHẨU PHẦN FDA ghi (không tự quy đổi ra 100 g để khỏi sai số làm tròn).
//   2. Món không có trong bảng (cơm, phở, xoài, sầu riêng…) → không đoán số.
//   3. Theo bệnh chỉ đổi CHỈ SỐ được nêu (tiểu đường → tinh bột, đường; béo phì → calo; huyết áp → natri;
//      thận → kali, natri; mỡ máu, tim → chất béo) — không tự đặt ngưỡng "được / không được" khi nguồn không nêu.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { sourceLine, type DrugSource } from "@/lib/lomiDrugData";

const VERIFIED = "2026-10-30";
const FDA = "FDA (Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ)";
export const FACT_SOURCES: DrugSource[] = [
  /* 0 */ { title: "Raw Fruits Poster – Nutrition Facts (nội dung 13/12/2017)", publisher: FDA, url: "https://www.fda.gov/food/food-labeling-nutrition/raw-fruits-poster-text-version-accessible-version" },
  /* 1 */ { title: "Nutrition Information for Raw Vegetables (nội dung 13/12/2017)", publisher: FDA, url: "https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/nutrition-information-raw-vegetables" },
  /* 2 */ { title: "Nutrition Information for Cooked Seafood (nội dung 31/10/2018)", publisher: FDA, url: "https://www.fda.gov/food/labeling-nutrition/cooked-seafood-poster-text-version-accessible-version" },
  /* 3 */ { title: "How much sugar is good for me?", publisher: "NHS (Anh)", url: "https://www.nhs.uk/common-health-questions/food-and-diet/how-much-sugar-is-good-for-me/", reviewed: "2023-05-19" },
  /* 4 */ { title: "What should my daily intake of calories be?", publisher: "NHS (Anh)", url: "https://www.nhs.uk/common-health-questions/food-and-diet/what-should-my-daily-intake-of-calories-be/", reviewed: "2023-04-17" },
  /* 5 */ { title: "Healthy Eating Guide for Adults with Type 2 Diabetes (34-1188-V2)", publisher: "West Hertfordshire Teaching Hospitals NHS Trust (Anh)", url: "https://westhertshospitals.nhs.uk/patients-and-visitors/patient-information-leaflets/healthy-eating-guide-adults-type-2-diabetes", reviewed: "2022-01-01" },
  /* 6 */ { title: "Top tips for diet and Type 2 Diabetes (6420-3)", publisher: "West Suffolk NHS Foundation Trust (Anh)", url: "https://www.wsh.nhs.uk/CMS-Documents/Patient-leaflets/DiabetesUnit/6420-3-Top-tips-for-diet-and-Type-2-diabetes.pdf", updated: "2021-03-19" },
  /* 7 */ { title: "What I need to know about Carbohydrate Counting and Diabetes (12/2013)", publisher: "NIDDK (Viện Y tế Quốc gia Hoa Kỳ – NIH)", url: "https://niddk.nih.gov/-/media/Files/Diabetes/WINTKA_CarbCounting_508.pdf" },
];

/** Một dòng bảng FDA. g = khẩu phần (gam); các số đúng như bảng (null = bảng không có cột này). */
export type FoodFact = {
  id: string;
  name: string;
  names: string[];
  g: number;
  kcal: number;
  fat: number;
  sat?: number;
  chol?: number;
  na: number;
  k: number;
  carb: number;
  fiber?: number;
  sugar?: number;
  protein: number;
  src: number;
  /** Ghi chú khẩu phần / cách nấu. */
  note?: string;
};
const F = (id: string, name: string, names: string[], g: number, kcal: number, fat: number, na: number, k: number, carb: number, fiber: number, sugar: number, protein: number, src: number, note?: string): FoodFact => ({ id, name, names, g, kcal, fat, na, k, carb, fiber, sugar, protein, src, note });
const S = (id: string, name: string, names: string[], kcal: number, fat: number, sat: number, chol: number, na: number, k: number, carb: number, protein: number): FoodFact => ({ id, name, names, g: 84, kcal, fat, sat, chol, na, k, carb, protein, src: 2, note: "nấu chín, không thêm gia vị, dầu mỡ" });

export const FACTS: FoodFact[] = [
  // ── Trái cây tươi (FDA) ──
  F("tao", "Táo", ["táo", "quả táo", "trái táo", "táo tây", "táo đỏ"], 242, 130, 0, 0, 260, 34, 5, 25, 1, 0, "1 quả to"),
  F("bo", "Bơ", ["trái bơ", "quả bơ", "avocado"], 30, 50, 4.5, 0, 140, 3, 1, 1, 1, 0, "khoảng 1/5 quả vừa"),
  F("chuoi", "Chuối", ["chuối", "quả chuối", "trái chuối", "chuối tiêu", "chuối già"], 126, 110, 0, 0, 450, 30, 3, 19, 1, 0, "1 quả vừa"),
  F("dua-luoi", "Dưa lưới", ["dưa lưới", "dưa vàng", "cantaloupe"], 134, 50, 0, 20, 240, 12, 1, 11, 1, 0),
  F("buoi-chum", "Bưởi chùm", ["bưởi chùm", "grapefruit"], 154, 60, 0, 0, 160, 15, 2, 11, 1, 0, "nửa quả vừa"),
  F("nho", "Nho", ["nho", "trái nho", "quả nho", "nho tươi"], 126, 90, 0, 15, 240, 23, 1, 20, 0, 0),
  F("dua-mat", "Dưa mật (honeydew)", ["dưa mật", "honeydew"], 134, 50, 0, 30, 210, 12, 1, 11, 1, 0),
  F("kiwi", "Kiwi", ["kiwi", "quả kiwi", "trái kiwi"], 148, 90, 1, 0, 450, 20, 4, 13, 1, 0, "2 quả vừa"),
  F("chanh-vang", "Chanh vàng", ["chanh vàng", "lemon"], 58, 15, 0, 0, 75, 5, 2, 2, 0, 0, "1 quả vừa"),
  F("chanh", "Chanh", ["chanh", "chanh xanh", "quả chanh", "trái chanh", "lime"], 67, 20, 0, 0, 75, 7, 2, 0, 0, 0, "1 quả vừa"),
  F("xuan-dao", "Xuân đào", ["xuân đào", "nectarine"], 140, 60, 0.5, 0, 250, 15, 2, 11, 1, 0, "1 quả vừa"),
  F("cam", "Cam", ["cam", "quả cam", "trái cam", "cam sành", "cam xoàn"], 154, 80, 0, 0, 250, 19, 3, 14, 1, 0, "1 quả vừa"),
  F("dao", "Đào", ["đào", "quả đào", "trái đào"], 147, 60, 0.5, 0, 230, 15, 2, 13, 1, 0, "1 quả vừa"),
  F("le", "Lê", ["lê", "quả lê", "trái lê"], 166, 100, 0, 0, 190, 26, 6, 16, 1, 0, "1 quả vừa"),
  F("dua", "Dứa (thơm, khóm)", ["dứa", "trái thơm", "trái khóm", "quả dứa", "trái dứa"], 112, 50, 0, 10, 120, 13, 1, 10, 1, 0, "2 lát"),
  F("man", "Mận", ["mận hậu", "mận tây", "mận bắc", "plum"], 151, 70, 0, 0, 230, 19, 2, 16, 1, 0, "2 quả vừa"),
  F("dau-tay", "Dâu tây", ["dâu tây", "strawberry"], 147, 50, 0, 0, 170, 11, 2, 8, 1, 0, "khoảng 8 quả"),
  F("cherry", "Anh đào (cherry)", ["anh đào", "cherry", "cherri", "sơ ri mỹ"], 140, 100, 0, 0, 350, 26, 1, 16, 1, 0),
  F("quyt", "Quýt", ["quýt", "quả quýt", "trái quýt"], 109, 50, 0, 0, 160, 13, 2, 9, 1, 0, "1 quả vừa"),
  F("dua-hau", "Dưa hấu", ["dưa hấu", "trái dưa hấu", "nước dưa hấu"], 280, 80, 0, 0, 270, 21, 1, 20, 1, 0),
  // ── Rau củ tươi (FDA) ──
  F("mang-tay", "Măng tây", ["măng tây"], 93, 20, 0, 0, 230, 4, 2, 2, 2, 1),
  F("ot-chuong", "Ớt chuông", ["ớt chuông", "ớt ngọt"], 148, 25, 0, 40, 220, 6, 2, 4, 1, 1, "1 quả vừa"),
  F("bong-cai", "Bông cải xanh", ["bông cải xanh", "súp lơ xanh", "bông cải", "broccoli"], 148, 45, 0.5, 80, 460, 8, 3, 2, 4, 1),
  F("ca-rot", "Cà rốt", ["cà rốt", "củ cà rốt"], 78, 30, 0, 60, 250, 7, 2, 5, 1, 1, "1 củ vừa"),
  F("sup-lo", "Súp lơ trắng", ["súp lơ trắng", "súp lơ", "bông cải trắng"], 99, 25, 0, 30, 270, 5, 2, 2, 2, 1),
  F("can-tay", "Cần tây", ["cần tây"], 110, 15, 0, 115, 260, 4, 2, 2, 0, 1),
  F("dua-leo", "Dưa leo (dưa chuột)", ["dưa leo", "dưa chuột"], 99, 10, 0, 0, 140, 2, 1, 1, 1, 1),
  F("dau-que", "Đậu que (đậu cô ve)", ["đậu que", "đậu cô ve", "đậu ve"], 83, 20, 0, 0, 200, 5, 3, 2, 1, 1),
  F("bap-cai", "Bắp cải", ["bắp cải", "cải bắp"], 84, 25, 0, 20, 190, 5, 2, 3, 1, 1),
  F("hanh-la", "Hành lá", ["hành lá"], 25, 10, 0, 10, 70, 2, 1, 1, 0, 1),
  F("xa-lach", "Xà lách", ["xà lách", "rau xà lách", "rau diếp"], 85, 15, 0, 35, 170, 2, 1, 1, 1, 1),
  F("nam", "Nấm", ["nấm", "nấm rơm", "nấm mỡ", "nấm tươi"], 84, 20, 0, 15, 300, 3, 1, 0, 3, 1),
  F("hanh-tay", "Hành tây", ["hành tây"], 148, 45, 0, 5, 190, 11, 3, 9, 1, 1, "1 củ vừa"),
  F("khoai-tay", "Khoai tây", ["khoai tây", "củ khoai tây"], 148, 110, 0, 0, 620, 26, 2, 1, 3, 1, "1 củ vừa"),
  F("cu-cai", "Củ cải (đỏ)", ["củ cải đỏ", "radish"], 85, 10, 0, 55, 190, 3, 1, 2, 0, 1),
  F("bi-ngoi", "Bí ngòi", ["bí ngòi", "zucchini"], 98, 20, 0, 0, 260, 4, 2, 2, 1, 1),
  F("bap", "Bắp (ngô) ngọt", ["bắp", "bắp ngọt", "ngô", "ngô ngọt", "bắp mỹ", "trái bắp"], 90, 90, 2.5, 0, 250, 18, 2, 5, 4, 1, "1 trái vừa"),
  F("khoai-lang", "Khoai lang", ["khoai lang", "củ khoai lang"], 130, 100, 0, 70, 440, 23, 4, 7, 2, 1, "1 củ vừa"),
  F("ca-chua", "Cà chua", ["cà chua", "trái cà chua", "quả cà chua"], 148, 25, 0, 20, 340, 5, 1, 3, 1, 1, "1 quả vừa"),
  // ── Hải sản nấu chín, 84 g (FDA) ──
  S("cua", "Cua", ["cua", "con cua", "thịt cua", "ghẹ"], 100, 1, 0, 95, 330, 300, 0, 20),
  S("ca-tre", "Cá trê (catfish)", ["cá trê", "cá da trơn", "catfish"], 130, 6, 2, 50, 230, 40, 0, 17),
  S("ngheu", "Nghêu (ngao)", ["nghêu", "ngao", "nghêu hấp"], 110, 1.5, 0, 80, 95, 470, 6, 17),
  S("ca-tuyet", "Cá tuyết", ["cá tuyết", "cod"], 90, 1, 0, 50, 65, 460, 0, 20),
  S("ca-bon", "Cá bơn", ["cá bơn", "flounder"], 100, 1.5, 0, 55, 100, 390, 0, 19),
  S("tom-hum", "Tôm hùm", ["tôm hùm", "lobster"], 80, 0.5, 0, 60, 320, 300, 1, 17),
  S("hau", "Hàu", ["hàu", "con hàu", "hàu sữa"], 100, 4, 1, 80, 300, 220, 6, 10),
  S("ca-minh-thai", "Cá minh thái (pollock)", ["cá minh thái", "pollock"], 90, 1, 0, 80, 110, 370, 0, 20),
  S("ca-hoi-van", "Cá hồi vân (cá hồi suối)", ["cá hồi vân", "cá hồi suối", "cá hồi sapa", "rainbow trout"], 140, 6, 2, 55, 35, 370, 0, 20),
  S("ca-hoi", "Cá hồi", ["cá hồi", "salmon"], 200, 10, 2, 70, 55, 430, 0, 24),
  S("so-diep", "Sò điệp", ["sò điệp", "cồi sò điệp", "scallop"], 140, 1, 0, 65, 310, 430, 5, 27),
  S("tom", "Tôm", ["tôm", "con tôm", "tôm sú", "tôm thẻ", "tôm luộc", "shrimp"], 100, 1.5, 0, 170, 240, 220, 0, 21),
  S("ca-kiem", "Cá kiếm", ["cá kiếm", "swordfish"], 120, 6, 1.5, 40, 100, 310, 0, 16),
  S("ca-ro-phi", "Cá rô phi, cá diêu hồng", ["cá rô phi", "cá diêu hồng", "rô phi", "diêu hồng", "tilapia"], 110, 2.5, 1, 75, 30, 360, 0, 22),
  S("ca-ngu", "Cá ngừ", ["cá ngừ", "tuna"], 130, 1.5, 0, 50, 40, 480, 0, 26),
];

// ── Nhận diện ───────────────────────────────────────────────────────────────
const ACCENTED = /[^\x00-\x7F]/;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LB = "(?<![\\p{L}\\p{N}])", RB = "(?![\\p{L}\\p{N}])";
const RAW = new Map(FACTS.map((f) => [f.id, new RegExp(`${LB}(${[...f.names].map((x) => x.toLowerCase().normalize("NFC")).sort((a, b) => b.length - a.length).map(esc).join("|")})${RB}`, "u")]));
const PLAIN = new Map(FACTS.map((f) => [f.id, new RegExp(`\\b(${[...new Set(f.names.map((x) => normalizeVi(x)))].sort((a, b) => b.length - a.length).map(esc).join("|")})\\b`)]));
/** Gõ không dấu: tên một chữ dễ trùng chữ khác ("cam" = cảm, "bo" = bò, "le" = lẽ, "nam" = năm…) → chỉ nhận tên nhiều chữ. */
const PLAIN_OK = (s: string) => s.includes(" ") || ["kiwi", "lemon", "lime", "tuna", "salmon", "shrimp", "broccoli", "cherry", "avocado"].includes(s);

/** Món có trong bảng FDA được nhắc trong câu (tên dài nhất thắng: "cá hồi vân" trước "cá hồi", "dưa hấu" trước "dưa"). */
export function factOf(text: string): FoodFact | null {
  const raw = text.normalize("NFC").toLowerCase();
  const n = ` ${normalizeVi(text)} `;
  let best: { f: FoodFact; len: number } | null = null;
  for (const f of FACTS) {
    let m: RegExpMatchArray | null;
    if (ACCENTED.test(text)) m = raw.match(RAW.get(f.id)!);
    else {
      m = n.match(PLAIN.get(f.id)!);
      if (m && !PLAIN_OK(m[1])) m = null;
    }
    if (m && (!best || m[1].length > best.len)) best = { f, len: m[1].length };
  }
  return best?.f ?? null;
}

/** Hỏi chỉ số dinh dưỡng của món ("chuối bao nhiêu calo", "dưa hấu nhiều đường không", "khoai tây nhiều kali không"). */
export const FACT_ASK = /\b(calo|calori|calories|kcal|nang luong|bao nhieu duong|nhieu duong|it duong|luong duong|do ngot|ngot khong|chat beo|nhieu beo|it beo|map khong|beo khong|tang can|bao nhieu kali|nhieu kali|it kali|kali|natri|nhieu muoi|it muoi|bao nhieu muoi|tinh bot|carb|carbs|chat xo|chat dam|protein|cholesterol|bao nhieu chat)\b/;

// ── Lăng kính theo bệnh ─────────────────────────────────────────────────────
type Lens = "sugar" | "kcal" | "salt" | "kidney" | "fat" | "general";
const LENS: Record<string, Lens> = {
  "tieu-duong": "sugar", "tieu-duong-type-1": "sugar", "tieu-duong-type-2": "sugar", "tien-tieu-duong": "sugar", "tieu-duong-thai-ky": "sugar",
  "beo-phi": "kcal",
  "tang-huyet-ap": "salt",
  "benh-than-man": "kidney", "hoi-chung-than-hu": "kidney",
  "mo-mau-cao": "fat", "benh-mach-vanh": "fat", "nhoi-mau-co-tim": "fat", "xo-vua-dong-mach": "fat",
};
export const lensOf = (medId?: string | null): Lens => (medId && LENS[medId]) || "general";

const num = (x: number) => String(x).replace(".", ",");
const portion = (f: FoodFact) => `${f.g} g${f.note ? ` (${f.note})` : ""}`;
/** Các chỉ số theo lăng kính — chỉ số liên quan bệnh đứng đầu, in đậm. */
function figures(f: FoodFact, lens: Lens): string {
  const all: [Lens[], string][] = [
    [["kcal", "general"], `**${f.kcal} kcal**`],
    [["sugar"], `tinh bột (carb) **${num(f.carb)} g**`],
    [["sugar", "general"], f.sugar !== undefined ? `đường **${num(f.sugar)} g**` : ""],
    [["sugar"], f.fiber !== undefined ? `chất xơ ${num(f.fiber)} g` : ""],
    [["salt", "kidney"], `natri **${f.na} mg**`],
    [["kidney"], `kali **${f.k} mg**`],
    [["fat"], `chất béo **${num(f.fat)} g**${f.sat !== undefined ? ` (bão hoà ${num(f.sat)} g)` : ""}`],
    [["fat"], f.chol !== undefined ? `cholesterol ${f.chol} mg` : ""],
  ];
  const main = all.filter(([ls, t]) => t && ls.includes(lens)).map(([, t]) => t);
  const rest = [
    lens !== "kcal" && lens !== "general" ? `${f.kcal} kcal` : "",
    lens === "general" || lens === "kcal" ? `tinh bột ${num(f.carb)} g` : "",
    lens === "kcal" && f.sugar !== undefined ? `đường ${num(f.sugar)} g` : "",
    lens !== "fat" ? `chất béo ${num(f.fat)} g` : "",
    `đạm ${num(f.protein)} g`,
    lens !== "kidney" && lens !== "salt" ? `natri ${f.na} mg` : "",
    lens !== "kidney" ? `kali ${f.k} mg` : "",
  ].filter(Boolean);
  return `${main.join(" · ")}${rest.length ? `\n  (khác: ${rest.join(", ")})` : ""}`;
}
/** Một câu nối số liệu với bệnh — chỉ nói điều nguồn có. */
function lensNote(f: FoodFact, lens: Lens): { text: string; src: number[] } | null {
  if (lens === "sugar" && f.src !== 2)
    return { text: "Đường có sẵn trong trái cây, rau **nguyên quả** không tính là “đường tự do”; còn **nước ép, sinh tố** thì có tính — người lớn nên giữ đường tự do dưới 30 g mỗi ngày.", src: [3] };
  if (lens === "kcal") return { text: "Trung bình nam cần khoảng 2.500 kcal, nữ khoảng 2.000 kcal mỗi ngày (tuỳ tuổi, cân nặng, vận động); ăn uống ít calo hơn mức cơ thể dùng thì sẽ giảm cân.", src: [4] };
  return null;
}

const line = (src: number[], now: number) => sourceLine({ sources: FACT_SOURCES, verifiedAt: VERIFIED }, [...new Set(src)], now);

/** Dòng ngắn gắn dưới lời đáp ăn uống theo bệnh ("tiểu đường ăn chuối được không"). */
export function factLine(f: FoodFact, medId?: string | null, now = Date.now()): string {
  const lens = lensOf(medId);
  const note = lensNote(f, lens);
  return [
    `📊 **${f.name}** — khẩu phần ${portion(f)}${f.src === 2 ? "" : ", tươi"}: ${figures(f, lens)}`,
    note ? `💡 ${note.text}` : "",
    line([f.src, ...(note?.src ?? [])], now),
  ].filter(Boolean).join("\n");
}

/** Lời đáp riêng cho câu hỏi chỉ số ("chuối bao nhiêu calo"). */
export function renderFact(f: FoodFact, med: { id: string; name: string } | null, now = Date.now()): string {
  const lens = lensOf(med?.id);
  const note = lensNote(f, lens) ?? (lens === "general" ? lensNote(f, f.sugar !== undefined && f.sugar >= 10 ? "sugar" : "kcal") : null);
  return [
    `📊 **${f.name}** — dinh dưỡng theo bảng số liệu chính thức${med ? `, nhìn theo **${med.name}**` : ""}`,
    `• Khẩu phần **${portion(f)}**${f.src === 2 ? "" : ", ăn tươi"}`,
    `• ${figures(f, lens)}`,
    note ? `💡 ${note.text}` : "",
    "👉 Số liệu là của nguyên liệu (chưa nêm muối, đường, dầu mỡ); món nấu xong sẽ khác. Lomi không tự đặt ngưỡng “được / không được” — hỏi bác sĩ hoặc chuyên viên dinh dưỡng để biết khẩu phần hợp với bạn.",
    line([f.src, ...(note?.src ?? [])], now),
  ].filter(Boolean).join("\n\n");
}

/** "mỗi ngày cần bao nhiêu calo", "một ngày ăn bao nhiêu đường" → mức NHS khuyên. */
export const DAILY_ASK = /\b(moi ngay|mot ngay|1 ngay|hang ngay|ngay can|ngay nen)\b.*\b(calo|kcal|nang luong|duong)\b|\b(calo|kcal|duong)\b.*\b(moi ngay|mot ngay|1 ngay|hang ngay)\b/;
export function renderDaily(now = Date.now()): string {
  return [
    "📊 **Mỗi ngày nên ăn bao nhiêu calo, bao nhiêu đường?**",
    "• Trung bình nam cần khoảng **2.500 kcal**, nữ khoảng **2.000 kcal** mỗi ngày — tuỳ tuổi, cân nặng, chiều cao, mức vận động. Ăn uống ít calo hơn mức cơ thể dùng thì sẽ giảm cân.",
    "• **Đường tự do** (đường thêm vào món, mật ong, siro, nước ép, sinh tố): người lớn **tối đa 30 g** mỗi ngày; trẻ 7–10 tuổi 24 g, 4–6 tuổi 19 g, 2–3 tuổi 14 g, 1 tuổi 10 g; dưới 1 tuổi không thêm đường. Đường có sẵn trong sữa, trái cây, rau nguyên quả không tính.",
    "👉 Hỏi “chuối bao nhiêu calo”, “dưa hấu có nhiều đường không” để xem từng món.",
    line([4, 3], now),
  ].join("\n\n");
}

/** Món chưa có trong bảng → nói thật, không đoán số. */
export function renderNoFact(food: string): string {
  return `📊 Lomi **chưa có số liệu calo, đường đã kiểm chứng** cho **${food}** — bảng chính thức Lomi đang dùng (FDA) mới có 20 loại trái cây, 20 loại rau củ tươi và một số hải sản, nên Lomi không đoán số. Bạn xem nhãn dinh dưỡng trên bao bì (nếu có) hoặc hỏi chuyên viên dinh dưỡng nha.`;
}

// ── TIỂU ĐƯỜNG & TRÁI CÂY (30/10, Kir: "tiểu đường k nên ăn mấy món có lượng đường cao như mít, xoài chín…") ──
// Nguồn (NHS, NIDDK) KHÔNG cấm loại trái cây nào: trái cây có tinh bột (đường tự nhiên) → canh khẩu phần, chia nhỏ, ăn nguyên quả,
//   tránh nước ép / sinh tố. Món có trong bảng FDA thì đưa số liệu; trái cây Việt chưa có số liệu kiểm chứng thì nói thật.
type Fact = { text: string; src: number[] };
export const DIABETES_FRUIT: Fact[] = [
  { text: "Người tiểu đường **vẫn ăn trái cây được** — nguồn không cấm loại nào. Trái cây có tinh bột (đường tự nhiên) nên làm tăng đường huyết → cần **canh khẩu phần**, không phải kiêng hẳn.", src: [5, 7] },
  { text: "Mỗi lần ăn **một phần** (khoảng một nắm tay / lòng bàn tay), **chia ra nhiều lần** trong ngày thay vì ăn dồn một lúc.", src: [5, 6] },
  { text: "Chọn trái cây **nguyên quả**; **tránh nước ép, sinh tố** (uống vào nhanh, dễ nhiều đường). Trái cây sấy khô thì phần ăn chỉ bằng **nửa lòng bàn tay**.", src: [5, 6] },
  { text: "Một quả nhỏ (táo, cam nhỏ) có khoảng **15 g tinh bột** — dùng để ước lượng khi tính khẩu phần tinh bột mỗi bữa.", src: [7] },
];
/** Trái cây hay hỏi (cả loại chưa có số liệu FDA) — để nhận ra câu hỏi "tiểu đường ăn X". */
const FRUITS = ["mít", "mít tố nữ", "xoài", "xoài chín", "xoài xanh", "sầu riêng", "nhãn", "vải", "vải thiều", "chôm chôm", "măng cụt", "thanh long", "ổi", "đu đủ", "na", "mãng cầu", "mãng cầu xiêm", "hồng xiêm", "sapoche", "vú sữa", "chuối", "nho", "dưa hấu", "dứa", "thơm", "khóm", "cam", "quýt", "bưởi", "táo", "lê", "mận", "roi", "khế", "me", "sơ ri", "chanh dây", "lựu", "hồng", "quả hồng", "trái bơ", "dừa", "nước dừa", "dưa lưới", "kiwi", "đào", "dâu tây", "cherry", "anh đào", "trái cây", "hoa quả", "trái cây sấy", "mít sấy", "chuối sấy", "xoài sấy"];
const FRUIT_RE = new RegExp(`(?<![\\p{L}\\p{N}])(${[...FRUITS].sort((a, b) => b.length - a.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "u");
/** Tên trái cây (có dấu, đúng như gõ) trong câu; null nếu không có. */
export function fruitIn(text: string): string | null {
  const m = text.normalize("NFC").toLowerCase().match(FRUIT_RE);
  return m ? m[1] : null;
}
const SUGAR_IDS = new Set(Object.entries(LENS).filter(([, l]) => l === "sugar").map(([id]) => id));
export const isSugarTopic = (id?: string | null) => !!id && SUGAR_IDS.has(id);

/** Khối gắn dưới lời đáp "tiểu đường ăn X được không" khi X là trái cây: cách ăn + số liệu (nếu có). */
export function diabetesFruitBlock(fruit: string, now = Date.now()): string {
  // (tên trái cây lấy đúng như người dùng gõ có dấu — "nho", "cam" là một chữ nên khớp thẳng tên trong bảng, không qua bộ đoán chữ không dấu)
  const f = FACTS.find((x) => x.names.includes(fruit)) ?? factOf(fruit);
  const generic = /^(trái cây|hoa quả)$/.test(fruit);
  return [
    `🍎 **Ăn trái cây khi bị tiểu đường:**\n${DIABETES_FRUIT.map((x) => `• ${x.text}`).join("\n")}`,
    f ? `📊 **${f.name}** — khẩu phần ${portion(f)}: tinh bột **${num(f.carb)} g** · đường **${num(f.sugar ?? 0)} g** · chất xơ ${num(f.fiber ?? 0)} g` : generic ? "" : `📊 Lomi **chưa có số liệu đường đã kiểm chứng** cho **${fruit}** (bảng FDA chưa có món này), nên không dám nói nó nhiều hay ít đường hơn loại khác — cứ áp dụng cách ăn ở trên, và theo dõi đường huyết sau khi ăn nếu bác sĩ đã hướng dẫn bạn đo.`,
    line([5, 6, 7, ...(f ? [f.src] : [])], now),
  ].filter(Boolean).join("\n\n");
}

/** "tiểu đường không nên ăn trái cây gì", "trái cây nào nhiều đường" → cách ăn + bảng đường của trái cây có số liệu (xếp nhiều → ít). */
export const FRUIT_LIST_ASK = /\b(trai cay|hoa qua|qua gi|trai gi|trai nao|qua nao|loai qua|loai trai)\b/;
export function renderFruitSugar(med: { id: string; name: string } | null, now = Date.now()): string {
  const fr = FACTS.filter((f) => f.src === 0 && f.sugar !== undefined).sort((a, b) => b.sugar! / b.g - a.sugar! / a.g);
  // khoảng bao nhiêu gam đường trong 100 g (tính từ số làm tròn của FDA nên chỉ để so sánh), kèm số gốc theo khẩu phần FDA
  const per100 = (f: FoodFact) => Math.round((f.sugar! / f.g) * 100);
  const rows = fr.map((f) => `• ${f.name}: khoảng **${per100(f)} g** đường / 100 g (khẩu phần ${f.g} g${f.note ? ` – ${f.note}` : ""}: ${num(f.sugar!)} g)`);
  return [
    med && isSugarTopic(med.id) ? `🍎 **${med.name.charAt(0).toUpperCase()}${med.name.slice(1)}: ăn trái cây thế nào?**` : "🍎 **Trái cây nào nhiều đường?**",
    med && isSugarTopic(med.id) ? DIABETES_FRUIT.map((x) => `• ${x.text}`).join("\n") : "",
    `📊 **Lượng đường trong trái cây tươi** (bảng FDA, nhiều trước — số “/ 100 g” tính lại từ khẩu phần nên chỉ để so sánh):\n${rows.join("\n")}`,
    "🔎 Mít, xoài chín, sầu riêng, nhãn, vải, chôm chôm… hay được nói là “nhiều đường”, nhưng Lomi **chưa có số liệu kiểm chứng** cho các loại này nên không xếp hạng được — ăn thì áp dụng đúng cách ăn ở trên.",
    line([...(med && isSugarTopic(med.id) ? [5, 6, 7] : []), 0], now),
  ].filter(Boolean).join("\n\n");
}

