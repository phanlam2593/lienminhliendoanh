// ─────────────────────────────────────────────────────────────────────────────
// VITAMIN · KHOÁNG CHẤT THEO BỆNH (30/10, theo ý Kir: "bị gì thì nên bổ sung kẽm, hải sản thì nhiều kẽm…
//   bị gì thì nên uống vitamin B, C, D") — chạy trên máy, không gọi AI.
//
// Nguyên tắc (giống lib/lomiFolk, lib/lomiDrugData):
//   1. Mọi ý có nguồn chính thống (NHS, NIH – ODS / NCCIH, WHO, CDC). Không nguồn → không viết.
//   2. KHÔNG nêu liều (mg, viên, giọt…). Liều theo nhãn / dược sĩ / bác sĩ.
//   3. Bệnh mà nguồn không nêu vitamin nào giúp → nói thật là chưa thấy, kèm nhóm người thường cần bổ sung.
//   Thêm chất mới = thêm một mục vào NUTRIENTS (test src/test/lomiNutrients.test.ts ép tên miền nguồn, chỉ số src, không liều).
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { sourceLine, type DrugFact, type DrugSource } from "@/lib/lomiDrugData";
import { WISELY, findFolk } from "@/lib/lomiFolk";
import { DAILY_ASK, FACT_ASK, FRUIT_LIST_ASK, factOf, fruitIn, isSugarTopic, renderDaily, renderFact, renderFruitSugar, renderNoFact } from "@/lib/lomiFoodFacts";

const VERIFIED = "2026-10-30";
const NHS = "NHS (Anh)";
const ODS = "ODS – Văn phòng Thực phẩm bổ sung (NIH, Hoa Kỳ)";
const NCCIH = "NCCIH (Viện Y tế Quốc gia Hoa Kỳ – NIH)";

/** Nguồn dùng chung — mọi `src` trỏ vào mảng này. */
export const NUT_SOURCES: DrugSource[] = [
  /* 0 */ { title: "Zinc – Fact Sheet for Consumers (cập nhật 04/10/2022)", publisher: ODS, url: "https://ods.od.nih.gov/factsheets/Zinc-Consumer/" },
  /* 1 */ { title: "The Common Cold and Complementary Health Approaches: What the Science Says (12/2020)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/providers/digest/cold-science" },
  /* 2 */ { title: "Zinc supplementation in the management of diarrhoea (eLENA)", publisher: "WHO", url: "https://www.who.int/tools/elena/bbc/zinc-diarrhoea" },
  /* 3 */ { title: "Vitamin C", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-c/", reviewed: "2020-08-03" },
  /* 4 */ { title: "B vitamins and folic acid", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-b/", reviewed: "2020-08-03" },
  /* 5 */ { title: "Vitamin B12 or folate deficiency anaemia", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamin-b12-or-folate-deficiency-anaemia/", reviewed: "2023-02-20" },
  /* 6 */ { title: "Vitamin D", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/", reviewed: "2020-08-03" },
  /* 7 */ { title: "Vitamin A", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-a/", reviewed: "2020-08-03" },
  /* 8 */ { title: "Food for strong bones", publisher: NHS, url: "https://www.nhs.uk/live-well/bone-health/food-for-strong-bones/", reviewed: "2024-04-24" },
  /* 9 */ { title: "Iron (good sources of) (14/01/2021)", publisher: "Milton Keynes University Hospital (NHS, Anh)", url: "https://www.mkuh.nhs.uk/?p=21612" },
  /* 10 */ { title: "Iron deficiency anaemia", publisher: NHS, url: "https://www.nhs.uk/conditions/iron-deficiency-anaemia/", reviewed: "2024-01-26" },
  /* 11 */ { title: "Vitamins and minerals", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/", reviewed: "2020-08-03" },
  /* 12 */ { title: "Hepatitis C and Dietary Supplements: What the Science Says (07/2024)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/providers/digest/hepatitis-c-and-dietary-supplements-science" },
  /* 13 */ { title: "Measles prevention and treatment overview (05/2026)", publisher: "CDC (Hoa Kỳ)", url: "https://www.cdc.gov/measles/media/pdfs/2026/05/measles-prevention-and-treatment-overview.pdf" },
  /* 14 */ WISELY,
  /* 15 */ { title: "Things To Know About Omegas for Heart Disease", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/tips/things-to-know-about-omegas-for-heart-disease" },
  /* 16 */ { title: "Iodine", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/iodine/", reviewed: "2020-08-03" },
  /* 17 */ { title: "Why 5 A Day?", publisher: NHS, url: "https://www.nhs.uk/live-well/eat-well/5-a-day/why-5-a-day/", reviewed: "2026-09-30" },
];

export type NutTopic = { id: string; text: string; src: number[] };
export type Nutrient = {
  id: string;
  /** Tên hiển thị. */
  name: string;
  /** Tên để nhận ra, viết đúng dấu. */
  names: string[];
  /** Gõ không dấu thì chỉ nhận khi câu có một trong các cụm này (vd "kem" là kem ăn, "sat" là sát). */
  plainCue?: RegExp;
  what: DrugFact[];
  foods: DrugFact[];
  /** Một dòng ngắn "ăn từ đâu" cho lời đáp theo bệnh. */
  short: DrugFact;
  who: DrugFact[];
  tooMuch: DrugFact[];
  /** Bệnh trong kho lib/medkb mà nguồn có nêu chất này. */
  topics: NutTopic[];
};

export const NUTRIENTS: Nutrient[] = [
  {
    id: "kem",
    name: "Kẽm",
    names: ["kẽm", "chất kẽm", "viên kẽm", "siro kẽm", "viên ngậm kẽm", "zinc"],
    plainCue: /\b(zinc|chat kem|vien kem|siro kem|thieu kem|bo sung kem|uong kem|nhieu kem|giau kem|kem co trong|kem co tac dung|kem la gi|ngam kem)\b/,
    what: [{ text: "Kẽm giúp hệ miễn dịch chống vi khuẩn, virus; cần cho tạo đạm, ADN, cho trẻ lớn lên, giúp lành vết thương và cảm nhận vị.", src: [0] }],
    foods: [
      { text: "**Hàu** có rất nhiều kẽm; thịt, cá, gia cầm, **cua, tôm hùm** cũng nhiều.", src: [0] },
      { text: "Ngoài ra: ngũ cốc ăn sáng có bổ sung kẽm, các loại đậu, hạt, ngũ cốc nguyên hạt, trứng, sữa.", src: [0] },
    ],
    short: { text: "hàu, cua, tôm hùm, thịt, cá, gia cầm, đậu, hạt, trứng, sữa", src: [0] },
    who: [{ text: "Dễ thiếu kẽm: người ăn chay; nghiện rượu; có bệnh tiêu hoá hoặc từng mổ dạ dày, ruột; phụ nữ mang thai, cho con bú; trẻ bú mẹ trên 6 tháng (sữa mẹ không đủ kẽm cho trẻ lớn hơn 6 tháng).", src: [0] }],
    tooMuch: [
      { text: "Uống quá nhiều: buồn nôn, chóng mặt, đau đầu, đau bụng, nôn, chán ăn; dùng lâu dài có thể gây **thiếu đồng**.", src: [0] },
      { text: "Kẽm tương tác với vài thuốc (kháng sinh nhóm quinolon, tetracyclin; thuốc lợi tiểu thiazid) — hỏi dược sĩ nên uống cách nhau bao lâu.", src: [0] },
      { text: "**Không dùng kẽm xịt / nhỏ mũi** — có thể làm mất khứu giác nặng, vĩnh viễn.", src: [1] },
    ],
    topics: [
      { id: "cam-lanh", text: "viên ngậm kẽm bắt đầu trong 24 giờ đầu có thể giúp cảm lạnh mau khỏi hơn (có thể gây buồn nôn); **không** dùng kẽm xịt mũi.", src: [1] },
      { id: "tieu-chay-o-tre", text: "trẻ tiêu chảy cấp nên được dùng **kẽm kèm oresol**, thường trong 10–14 ngày — liều theo tuổi, hỏi bác sĩ / dược sĩ.", src: [2] },
      { id: "tieu-chay", text: "trẻ em bị tiêu chảy cấp nên được dùng **kẽm kèm oresol** (liều theo bác sĩ / dược sĩ).", src: [2] },
      { id: "thoai-hoa-hoang-diem", text: "người lớn tuổi có nguy cơ cao dùng viên bổ sung có kẽm hằng ngày nhiều năm thì giảm nguy cơ thoái hoá hoàng điểm nặng — hỏi bác sĩ mắt trước.", src: [0] },
      { id: "viem-gan-c", text: "bằng chứng kẽm giúp viêm gan C còn rất hạn chế; dùng quá nhiều kẽm có thể độc.", src: [12] },
    ],
  },
  {
    id: "vitamin-c",
    name: "Vitamin C",
    names: ["vitamin c", "vitamin C", "vit c", "vtm c", "axit ascorbic", "acid ascorbic"],
    what: [{ text: "Vitamin C giúp bảo vệ, giữ tế bào khoẻ; giữ da, mạch máu, xương, sụn khoẻ; giúp vết thương lành.", src: [3] }],
    foods: [{ text: "Có trong rất nhiều rau quả: cam, quýt, chanh, ớt chuông, dâu tây, bông cải xanh, cải Brussels, khoai tây…", src: [3] }],
    short: { text: "cam, quýt, chanh, ớt chuông, dâu tây, bông cải xanh, khoai tây", src: [3] },
    who: [{ text: "Ăn uống đủ rau quả thì có đủ vitamin C từ bữa ăn; uống thêm thì đừng uống quá nhiều.", src: [3] }],
    tooMuch: [{ text: "Uống liều cao có thể đau bụng, tiêu chảy, đầy hơi — thường hết khi ngưng uống.", src: [3] }],
    topics: [
      { id: "cam-lanh", text: "với đa số người, vitamin C **không ngừa được cảm lạnh**, chỉ giúp bệnh ngắn hơn, nhẹ hơn chút ít; có thể có ích với người tập luyện thể lực rất nặng.", src: [1] },
      { id: "thieu-mau", text: "ăn kèm đồ giàu vitamin C (cam, ớt chuông…) giúp cơ thể **hấp thu sắt** tốt hơn.", src: [9] },
    ],
  },
  {
    id: "vitamin-d",
    name: "Vitamin D",
    names: ["vitamin d", "vitamin D", "vitamin d3", "vit d", "vtm d"],
    what: [{ text: "Vitamin D giúp điều hoà canxi, phốt phát trong cơ thể; giữ xương, răng, cơ khoẻ.", src: [6] }],
    foods: [
      { text: "Da tự tạo vitamin D khi được **nắng chiếu trực tiếp** lúc ở ngoài trời.", src: [6] },
      { text: "Đồ ăn: cá béo (cá hồi, cá mòi, cá trích, cá thu), thịt đỏ, lòng đỏ trứng, gan, đồ ăn có bổ sung vitamin D.", src: [6] },
    ],
    short: { text: "nắng trực tiếp; cá béo, lòng đỏ trứng, thịt đỏ, đồ ăn bổ sung vitamin D", src: [6] },
    who: [{ text: "Nhóm nên uống bổ sung: trẻ bú mẹ dưới 1 tuổi, trẻ 1–4 tuổi; người ít ra nắng, ở trong nhà nhiều, mặc kín da khi ra ngoài, người da sẫm màu; ai cũng nên cân nhắc vào những tháng ít nắng.", src: [6] }],
    tooMuch: [{ text: "Uống quá nhiều vitamin D lâu ngày làm canxi tích tụ, có thể hại xương, thận, tim. Ra nắng thì không bị thừa vitamin D.", src: [6] }],
    topics: [
      { id: "loang-xuong", text: "canxi và vitamin D giúp xương chắc; đã bị loãng xương thì bác sĩ có thể kê **canxi + vitamin D** nếu lo bạn ăn thiếu canxi.", src: [8] },
      { id: "coi-xuong", text: "vitamin D cần cho xương; trẻ bú mẹ dưới 1 tuổi và trẻ 1–4 tuổi thuộc nhóm nên được bổ sung vitamin D.", src: [6] },
      { id: "thieu-vitamin-d", text: "ra nắng trực tiếp, ăn cá béo, trứng; nhóm ít ra nắng nên uống bổ sung — đừng uống quá nhiều.", src: [6] },
      { id: "an-uong-khi-mang-thai", text: "bà bầu, mẹ cho con bú cũng nên cân nhắc uống vitamin D, nhất là những tháng ít nắng.", src: [6] },
    ],
  },
  {
    id: "vitamin-b12",
    name: "Vitamin B12",
    names: ["vitamin b12", "b12", "vit b12", "vtm b12", "cobalamin"],
    what: [{ text: "Vitamin B12 giúp tạo hồng cầu, giữ hệ thần kinh khoẻ; thiếu B12 có thể gây thiếu máu.", src: [4, 5] }],
    foods: [{ text: "Thịt, cá, trứng, sữa, phô mai, một số ngũ cốc ăn sáng có bổ sung B12. Rau, quả, ngũ cốc tự nhiên **không có** B12.", src: [4, 5] }],
    short: { text: "thịt, cá, trứng, sữa, phô mai", src: [4] },
    who: [
      { text: "Người **ăn thuần chay** dễ thiếu B12 — cần đồ ăn có bổ sung B12 hoặc viên uống. Ăn thịt, cá hay sữa thì thường đủ.", src: [4, 5] },
      { text: "Nguyên nhân thiếu hay gặp là **thiếu máu ác tính** (hệ miễn dịch tấn công dạ dày); vài thuốc (thuốc chống động kinh, thuốc ức chế bơm proton – PPI) cũng có thể gây thiếu.", src: [5] },
    ],
    tooMuch: [{ text: "Chưa đủ bằng chứng về tác hại khi uống B12 liều cao mỗi ngày; liều vừa phải thì khó gây hại.", src: [4] }],
    topics: [
      { id: "thieu-vitamin-b12", text: "thường điều trị bằng **tiêm** hoặc viên uống theo bác sĩ, có khi phải dùng lâu dài.", src: [5] },
      { id: "thieu-mau", text: "thiếu máu do thiếu B12: bổ sung B12 theo bác sĩ sau khi xét nghiệm; ăn thêm thịt, cá, trứng, sữa.", src: [5] },
    ],
  },
  {
    id: "folate",
    name: "Axit folic (folate, vitamin B9)",
    names: ["axit folic", "acid folic", "a xit folic", "folic", "folate", "vitamin b9", "b9"],
    what: [{ text: "Folate (dạng viên gọi là axit folic) giúp tạo hồng cầu khoẻ; bà bầu đủ folate giúp giảm nguy cơ dị tật ống thần kinh (như nứt đốt sống) ở thai nhi.", src: [4] }],
    foods: [{ text: "Bông cải xanh, cải Brussels, rau lá xanh (bắp cải, cải xoăn, rau bina), đậu Hà Lan, đậu gà, đậu đỏ, ngũ cốc có bổ sung axit folic. Gan cũng nhiều nhưng bà bầu nên tránh gan.", src: [4] }],
    short: { text: "rau lá xanh, bông cải xanh, đậu Hà Lan, đậu gà, đậu đỏ", src: [4] },
    who: [{ text: "Phụ nữ **đang định có thai** hoặc có thể có thai: uống axit folic mỗi ngày từ **trước khi có thai** tới hết tuần 12 thai kỳ; một số người cần liều cao hơn — hỏi bác sĩ.", src: [4] }],
    tooMuch: [{ text: "Uống axit folic liều cao có thể **che lấp dấu hiệu thiếu B12** (thiếu B12 không chữa sẽ hại thần kinh) — nhất là với người lớn tuổi.", src: [4] }],
    topics: [
      { id: "an-uong-khi-mang-thai", text: "uống **axit folic** mỗi ngày từ trước khi có thai tới hết tuần 12 thai kỳ.", src: [4] },
      { id: "thieu-mau", text: "thiếu máu do thiếu folate: uống viên axit folic theo bác sĩ (thường vài tháng); ăn thêm rau lá xanh, bông cải, đậu.", src: [5] },
    ],
  },
  {
    id: "sat",
    name: "Sắt",
    names: ["sắt", "chất sắt", "viên sắt", "iron"],
    plainCue: /\b(chat sat|vien sat|bo sung sat|uong sat|nhieu sat|giau sat|sat co trong|thuc pham sat|iron)\b/,
    what: [{ text: "Sắt cần để cơ thể tạo hồng cầu; thiếu sắt là nguyên nhân hay gặp của thiếu máu.", src: [10] }],
    foods: [
      { text: "Thịt đỏ (bò, cừu), gan, một số cá và hải sản; thịt gà, gà tây có ít hơn.", src: [9] },
      { text: "Nguồn thực vật: ngũ cốc, bánh mì có bổ sung sắt; rau lá xanh đậm.", src: [9] },
    ],
    short: { text: "thịt đỏ, gan, cá, hải sản, rau lá xanh đậm, ngũ cốc bổ sung sắt", src: [9] },
    who: [{ text: "Ăn kèm đồ giàu **vitamin C** giúp hấp thu sắt; tránh uống trà, cà phê trong khoảng 1 giờ trước và sau bữa ăn.", src: [9] }],
    tooMuch: [{ text: "Viên sắt chỉ uống theo lời dặn của bác sĩ và để **xa tầm tay trẻ em** — trẻ uống nhầm có thể nguy hiểm tính mạng.", src: [10] }],
    topics: [{ id: "thieu-mau", text: "thiếu máu thiếu sắt: ăn thịt đỏ, gan, rau lá xanh đậm kèm đồ giàu vitamin C; viên sắt uống theo bác sĩ.", src: [9, 10] }],
  },
  {
    id: "canxi",
    name: "Canxi",
    names: ["canxi", "can xi", "calci", "calcium", "chất canxi", "viên canxi"],
    what: [{ text: "Canxi giúp xương chắc khoẻ; vitamin D giúp cơ thể hấp thu canxi.", src: [8] }],
    foods: [{ text: "Sữa, phô mai và đồ làm từ sữa; rau lá xanh; đậu nành, đậu phụ; bánh mì có bổ sung canxi.", src: [8] }],
    short: { text: "sữa, phô mai, rau lá xanh, đậu nành, đậu phụ", src: [8] },
    who: [{ text: "Đã bị loãng xương thì bác sĩ có thể kê canxi + vitamin D nếu lo bạn ăn thiếu canxi.", src: [8] }],
    tooMuch: [],
    topics: [{ id: "loang-xuong", text: "ăn đủ canxi (sữa, phô mai, rau lá xanh, đậu phụ); bác sĩ có thể kê canxi + vitamin D nếu bạn ăn thiếu.", src: [8] }],
  },
  {
    id: "vitamin-a",
    name: "Vitamin A",
    names: ["vitamin a", "vitamin A", "vit a", "vtm a", "retinol", "beta caroten", "beta-caroten", "betacaroten"],
    what: [{ text: "Vitamin A giúp hệ miễn dịch, giúp **nhìn trong tối**, giữ da và niêm mạc khoẻ.", src: [7] }],
    foods: [
      { text: "Phô mai, trứng, cá béo, sữa, sữa chua; gan có **rất nhiều**.", src: [7] },
      { text: "Beta-caroten (cơ thể đổi thành vitamin A): rau vàng, đỏ, lá xanh như rau bina, cà rốt, khoai lang, ớt đỏ; quả vàng như xoài, đu đủ, mơ.", src: [7] },
    ],
    short: { text: "trứng, sữa, cá béo; cà rốt, khoai lang, rau bina, xoài, đu đủ", src: [7] },
    who: [{ text: "Ăn uống đa dạng thường đủ vitamin A.", src: [7] }],
    tooMuch: [
      { text: "Dùng nhiều vitamin A nhiều năm có thể làm xương dễ gãy khi về già; ăn gan hơn 1 lần mỗi tuần có thể bị thừa.", src: [7] },
      { text: "**Bà bầu** tránh gan, đồ làm từ gan và vitamin A liều cao (liên quan dị tật thai nặng); dùng quá nhiều có thể hại gan, xương, thần kinh, da.", src: [7, 13] },
    ],
    topics: [{ id: "soi", text: "trẻ bị sởi có thể được cho uống vitamin A **dưới sự theo dõi của nhân viên y tế**; vitamin A **không phòng được sởi** và không thay được tiêm vắc xin.", src: [13] }],
  },
  {
    id: "vitamin-b",
    name: "Vitamin nhóm B (B1, B6…)",
    names: ["vitamin b", "vitamin nhóm b", "vitamin b1", "vitamin b6", "b1", "b6", "vitamin b complex", "b complex", "thiamin", "thiamine", "vit b", "vtm b"],
    what: [{ text: "Nhóm B gồm nhiều loại (B1, B6, B12, folate…); ăn uống đa dạng thường đủ. Hỏi riêng \"vitamin B12\" hay \"axit folic\" để xem chi tiết hai loại hay cần bổ sung nhất.", src: [4] }],
    foods: [
      { text: "B1: đậu Hà Lan, chuối, cam, các loại hạt, bánh mì nguyên cám, ngũ cốc bổ sung, gan.", src: [4] },
      { text: "B6: thịt heo, gia cầm, một số cá, đậu phộng, đậu nành, yến mạch, chuối, sữa.", src: [4] },
    ],
    short: { text: "thịt, cá, trứng, sữa, đậu, hạt, ngũ cốc nguyên cám, chuối", src: [4] },
    who: [{ text: "Người ăn thuần chay cần chú ý **B12**; phụ nữ định có thai cần **axit folic**.", src: [4] }],
    tooMuch: [{ text: "**Vitamin B6 liều cao kéo dài có thể làm tê, mất cảm giác tay chân** — đừng tự uống B6 liều cao khi bác sĩ không dặn.", src: [4] }],
    topics: [],
  },
  {
    id: "omega-3",
    name: "Omega-3 (dầu cá)",
    names: ["omega 3", "omega-3", "omega3", "dầu cá", "viên dầu cá", "dầu gan cá", "fish oil"],
    what: [{ text: "Omega-3 là chất béo có nhiều trong cá béo; viên dầu cá là thực phẩm chức năng chứa omega-3.", src: [15] }],
    foods: [{ text: "Cá giàu omega-3 nên có trong bữa ăn tốt cho tim; người ăn cá ít nhất mỗi tuần một lần có vẻ ít tử vong vì bệnh tim hơn (bằng chứng chưa chắc chắn).", src: [15] }],
    short: { text: "cá béo (cá hồi, cá thu, cá mòi…) — ăn cá trong bữa ăn", src: [15] },
    who: [{ text: "**Viên** omega-3 chưa được chứng minh giúp phòng bệnh tim; nên ưu tiên ăn cá.", src: [15] }],
    tooMuch: [
      { text: "Viên omega-3 có thể làm vết cắt **lâu cầm máu** hơn — đang uống thuốc chống đông hay thuốc kháng viêm giảm đau (NSAID) thì hỏi bác sĩ trước.", src: [15] },
      { text: "Dầu gan cá có cả vitamin A và D — uống liều cao có thể độc. Dị ứng cá, hải sản thì hỏi bác sĩ trước khi dùng.", src: [15] },
    ],
    topics: [
      { id: "benh-mach-vanh", text: "**viên** omega-3 (dầu cá) chưa được chứng minh bảo vệ tim; nên ăn cá giàu omega-3 trong bữa ăn. Đang uống thuốc chống đông thì hỏi bác sĩ trước khi dùng dầu cá.", src: [15] },
      { id: "nhoi-mau-co-tim", text: "**viên** omega-3 (dầu cá) chưa được chứng minh bảo vệ tim; nên ăn cá giàu omega-3 trong bữa ăn. Đang uống thuốc chống đông thì hỏi bác sĩ trước khi dùng dầu cá.", src: [15] },
    ],
  },
  {
    id: "i-ot",
    name: "I-ốt (iodine)",
    names: ["i-ốt", "i ốt", "iốt", "iod", "iodine", "muối i-ốt", "muối i ốt", "muối iốt"],
    plainCue: /\b(i ot|iot|iod|iodine|muoi i ot|muoi iot)\b/,
    what: [{ text: "I-ốt giúp cơ thể tạo hormone tuyến giáp — chất điều hoà tốc độ chuyển hoá của tế bào.", src: [16] }],
    foods: [{ text: "Sữa bò và đồ làm từ sữa, trứng, cá biển, hải sản có vỏ; ngũ cốc cũng có nhưng tuỳ đất trồng.", src: [16] }],
    short: { text: "sữa, trứng, cá biển, hải sản có vỏ", src: [16] },
    who: [{ text: "Ăn **thuần chay** (không cá, trứng, sữa) thì nên cân nhắc đồ ăn có bổ sung i-ốt hoặc viên bổ sung.", src: [16] }],
    tooMuch: [{ text: "Uống i-ốt **liều cao lâu ngày** có thể làm thay đổi cách tuyến giáp hoạt động.", src: [16] }],
    topics: [
      { id: "suy-giap", text: "đừng tự uống i-ốt liều cao — dùng lâu ngày có thể làm thay đổi cách tuyến giáp hoạt động; hỏi bác sĩ trước.", src: [16] },
      { id: "cuong-giap", text: "đừng tự uống i-ốt liều cao — dùng lâu ngày có thể làm thay đổi cách tuyến giáp hoạt động; hỏi bác sĩ trước.", src: [16] },
      { id: "buou-giap", text: "đừng tự uống i-ốt liều cao — dùng lâu ngày có thể làm thay đổi cách tuyến giáp hoạt động; hỏi bác sĩ trước.", src: [16] },
    ],
  },
];

/** Ghi chú riêng theo bệnh (không gắn với một chất). */
const DISEASE_NOTES: Record<string, DrugFact[]> = {
  "mo-mat": [{ text: "Riêng **thoái hoá hoàng điểm** ở người lớn tuổi có nguy cơ cao: dùng viên bổ sung có kẽm nhiều năm giúp giảm nguy cơ thể nặng — cần bác sĩ mắt khám, chẩn đoán trước.", src: [0] }],
  "viem-gan-c": [{ text: "Chưa có thực phẩm chức năng nào được chứng minh hiệu quả cho viêm gan C; cây kế sữa (milk thistle) không hơn giả dược.", src: [12] }],
};
/** Khi nguồn không nêu chất nào cho bệnh này. */
const GENERAL: DrugFact[] = [
  { text: "Đa số người ăn uống đa dạng, cân bằng là đủ chất; chỉ một số người cần uống thêm.", src: [11] },
  { text: "Nhóm thường cần uống thêm: phụ nữ định có thai (**axit folic**), trẻ nhỏ và người ít ra nắng (**vitamin D**), người ăn thuần chay (**vitamin B12**).", src: [4, 6] },
];
const WISE: DrugFact[] = [
  { text: "Thực phẩm chức năng có thể tương tác với thuốc đang dùng hoặc không hợp với bệnh đang có — báo bác sĩ / dược sĩ mọi loại bạn đang uống.", src: [14] },
];

// ── Nhận diện ───────────────────────────────────────────────────────────────
const ACCENTED = /[^\x00-\x7F]/;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LB = "(?<![\\p{L}\\p{N}])", RB = "(?![\\p{L}\\p{N}])";
const RAW = new Map(NUTRIENTS.map((n) => [n.id, new RegExp(`${LB}(${[...n.names].map((x) => x.toLowerCase().normalize("NFC")).sort((a, b) => b.length - a.length).map(esc).join("|")})${RB}`, "u")]));
const PLAIN = new Map(NUTRIENTS.map((n) => [n.id, new RegExp(`\\b(${[...new Set(n.names.map((x) => normalizeVi(x)))].sort((a, b) => b.length - a.length).map(esc).join("|")})\\b`)]));

/** Chất được nhắc trong câu (tên dài nhất thắng: "vitamin b12" trước "vitamin b"). */
export function nutrientOf(text: string): Nutrient | null {
  const raw = text.normalize("NFC").toLowerCase();
  const n = ` ${normalizeVi(text)} `;
  let best: { x: Nutrient; len: number } | null = null;
  for (const x of NUTRIENTS) {
    let m: RegExpMatchArray | null;
    if (ACCENTED.test(text)) m = raw.match(RAW.get(x.id)!);
    else {
      m = n.match(PLAIN.get(x.id)!);
      if (m && x.plainCue && !x.plainCue.test(n)) m = null;
    }
    if (m && (!best || m[1].length > best.len)) best = { x, len: m[1].length };
  }
  return best?.x ?? null;
}

/** Hỏi nên bổ sung chất gì ("bị cảm nên uống vitamin gì", "thiếu máu nên bổ sung gì"). */
const SUPP = /\b(vitamin|vitamine|vi ta min|khoang chat|vi chat|thuoc bo|thuc pham chuc nang|tpcn|bo sung (gi|chat gi|them gi|cai gi|nhung gi|nhung chat gi)|uong (them )?(chat )?gi (cho|de) (khoe|nhanh khoi|mau khoi|bo)|thieu chat gi|thieu vitamin gi)\b/;
/** Hỏi về một chất ("kẽm có trong món gì", "vitamin C có tác dụng gì", "hải sản có nhiều kẽm không"). */
const NUT_ASK = /\b(co trong|co nhieu|nhieu nhat|giau|chua nhieu|o dau|tac dung|cong dung|de lam gi|la gi|mon gi|thuc pham|do an|an gi|uong|bo sung|thieu|khi nao|luc nao|co tot|co can|nen|co nen|co sao|co hai|qua nhieu|thua|lieu|bao nhieu|nguon|hai san|thit|rau|trai cay)\b/;
const DOSE = /\b(lieu|bao nhieu (mg|vien|ml|giot|ui|lan)|mot ngay (uong )?bao nhieu|uong bao nhieu|bao nhieu mot ngay|may vien)\b/;
/** Câu là chuyện THIẾU chất mà kho kiến thức đã có thẻ riêng → để thẻ đó trả lời. */
const DEFICIT_CARD: Record<string, string> = { "vitamin-d": "thieu-vitamin-d", "vitamin-b12": "thieu-vitamin-b12", sat: "thieu-mau" };

const bl = (fs: DrugFact[]) => fs.map((f) => `• ${f.text}`).join("\n");
const srcOf = (...gs: { src: number[] }[][]) => gs.flat().flatMap((x) => x.src);
const line = (src: number[], now: number) => sourceLine({ sources: NUT_SOURCES, verifiedAt: VERIFIED }, src, now);

/** Bài về MỘT chất. `med` (nếu có) → dòng riêng cho bệnh đó đứng đầu. */
export function renderNutrient(x: Nutrient, med: { id: string; name: string } | null, dose: boolean, now = Date.now()): string {
  const t = med ? x.topics.find((y) => y.id === med.id) : undefined;
  const parts = [
    `💊 **${x.name}** — có trong món gì, ai cần bổ sung`,
    med ? (t ? `👉 Với **${med.name}**: ${t.text}` : `👉 Các nguồn Lomi đối chiếu **chưa nêu ${x.name.split(" (")[0].toLowerCase()} giúp chữa ${med.name}**.`) : "",
    dose ? "🔢 Lomi **không nêu liều** — liều tuỳ tuổi, bệnh, loại sản phẩm; làm theo nhãn hoặc hỏi dược sĩ / bác sĩ nha." : "",
    `📖 **Tác dụng:**\n${bl(x.what)}`,
    `🥗 **Có nhiều trong:**\n${bl(x.foods)}`,
    `🙋 **Ai cần chú ý:**\n${bl(x.who)}`,
    x.tooMuch.length ? `⚠️ **Lưu ý:**\n${bl([...x.tooMuch, ...WISE])}` : `⚠️ **Lưu ý:**\n${bl(WISE)}`,
    !med && x.topics.length ? `🩺 **Hay được nhắc với:**\n${x.topics.map((y) => `• ${TOPIC_NAMES[y.id] ?? y.id}: ${y.text}`).join("\n")}` : "",
    line(srcOf(x.what, x.foods, x.who, x.tooMuch, WISE, t ? [t] : !med ? x.topics : []), now),
  ];
  return parts.filter(Boolean).join("\n\n");
}

/** Tên hiển thị gọn của các thẻ được nhắc (khỏi phải tải thẻ). */
const TOPIC_NAMES: Record<string, string> = {
  "cam-lanh": "Cảm lạnh",
  "tieu-chay-o-tre": "Trẻ tiêu chảy",
  "tieu-chay": "Tiêu chảy",
  "thoai-hoa-hoang-diem": "Thoái hoá hoàng điểm",
  "viem-gan-c": "Viêm gan C",
  "thieu-mau": "Thiếu máu",
  "loang-xuong": "Loãng xương",
  "coi-xuong": "Còi xương",
  "thieu-vitamin-d": "Thiếu vitamin D",
  "an-uong-khi-mang-thai": "Mang thai",
  "thieu-vitamin-b12": "Thiếu B12",
  "benh-mach-vanh": "Bệnh mạch vành",
  "nhoi-mau-co-tim": "Nhồi máu cơ tim",
  "suy-giap": "Suy giáp",
  "cuong-giap": "Cường giáp",
  "buou-giap": "Bướu giáp",
  soi: "Sởi",
};

/** Bệnh → các chất nguồn có nêu. Không có → nói thật, kèm nhóm người thường cần bổ sung. */
export function renderForDisease(med: { id: string; name: string }, now = Date.now()): string {
  const hits = NUTRIENTS.flatMap((x) => x.topics.filter((t) => t.id === med.id).map((t) => ({ x, t })));
  const notes = DISEASE_NOTES[med.id] ?? [];
  if (!hits.length) {
    return [
      `💊 Với **${med.name}**, các nguồn y khoa Lomi đối chiếu **chưa nêu vitamin hay khoáng chất nào giúp chữa${notes.length ? " chung" : ""} bệnh này** — nên Lomi không dám khuyên uống thêm chất gì.`,
      notes.length ? bl(notes) : "",
      `🥗 **Nói chung:**\n${bl(GENERAL)}`,
      `⚠️ ${WISE[0].text}`,
      `👉 Muốn xem ăn uống với ${med.name}, hỏi “${med.name} nên ăn gì” nha.`,
      line(srcOf(notes, GENERAL, WISE), now),
    ].filter(Boolean).join("\n\n");
  }
  return [
    `💊 **${cap(med.name)}: nên bổ sung vitamin, khoáng chất gì?**`,
    hits.map(({ x, t }) => `• **${x.name}:** ${t.text}`).join("\n"),
    notes.length ? bl(notes) : "",
    `🥗 **Ăn từ đâu:**\n${hits.map(({ x }) => `• ${x.name}: ${x.short.text}`).join("\n")}`,
    `⚠️ **Lưu ý:** uống thêm thì theo nhãn hoặc hỏi dược sĩ / bác sĩ (Lomi không nêu liều); uống quá nhiều một số chất có thể hại.\n${bl(WISE)}`,
    line(srcOf(hits.map((h) => h.t), hits.map((h) => h.x.short), notes, WISE), now),
  ].filter(Boolean).join("\n\n");
}

/** Hỏi chung "nên uống vitamin gì" (không nêu bệnh) → ai thường cần bổ sung chất gì. */
export function renderOverview(now = Date.now()): string {
  const pick = (id: string) => NUTRIENTS.find((x) => x.id === id)!;
  const facts = [pick("folate").who[0], pick("vitamin-d").who[0], pick("vitamin-b12").who[0]];
  return [
    "💊 **Có cần uống vitamin, khoáng chất không?**",
    bl(GENERAL.slice(0, 1)),
    `🙋 **Nhóm thường cần bổ sung:**\n${bl(facts)}`,
    `⚠️ **Lưu ý:**\n${bl([pick("vitamin-a").tooMuch[1], pick("vitamin-d").tooMuch[0], ...WISE])}`,
    "👉 Hỏi Lomi theo bệnh (vd “bị cảm nên bổ sung gì”, “thiếu máu nên bổ sung gì”) hoặc theo chất (vd “kẽm có trong món gì”, “vitamin C có tác dụng gì”).",
    line(srcOf(GENERAL.slice(0, 1), facts, [pick("vitamin-a").tooMuch[1], pick("vitamin-d").tooMuch[0]], WISE), now),
  ].join("\n\n");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── MÓN ĂN → CHẤT (30/10, Kir: "thêm vô kiểu dinh dưỡng đồ") ─────────────────
// "trứng có chất gì", "hàu bổ gì", "dinh dưỡng của chuối" → các chất mà NGUỒN của từng chất (ở trên) có kể món này.
//   Chỉ ghi cặp món – chất có trong nguồn; không ghi hàm lượng.
type FoodItem = { nut: string; note?: string; src: number[] };
export type Food = { id: string; name: string; names: string[]; items: FoodItem[]; caution?: DrugFact[] };
const FRUITVEG: DrugFact = { text: "Rau quả nói chung cho vitamin, khoáng chất và chất xơ; ăn đa dạng nhiều loại vì mỗi loại cho chất khác nhau.", src: [17] };
const LIVER_WARN: DrugFact = { text: "Gan rất nhiều vitamin A: ăn gan hơn 1 lần mỗi tuần có thể bị thừa; **bà bầu nên tránh gan** và đồ làm từ gan.", src: [7] };
export const FOODS: Food[] = [
  { id: "hau", name: "Hàu", names: ["hàu", "con hàu", "hàu sữa", "oyster"], items: [{ nut: "kem", note: "**rất nhiều**", src: [0] }, { nut: "i-ot", note: "hải sản có vỏ", src: [16] }] },
  { id: "hai-san", name: "Hải sản (cua, tôm, sò, nghêu, ốc)", names: ["hải sản", "đồ biển", "cua", "ghẹ", "tôm", "tôm hùm", "sò", "nghêu", "ngao", "hến", "ốc", "sò điệp"], items: [{ nut: "kem", note: "cua, tôm hùm… là nguồn tốt", src: [0] }, { nut: "i-ot", note: "hải sản có vỏ", src: [16] }, { nut: "sat", note: "một số loại hải sản", src: [9] }] },
  { id: "thit-bo", name: "Thịt bò (thịt đỏ)", names: ["thịt bò", "bò", "thịt đỏ", "thịt cừu", "thịt dê"], items: [{ nut: "sat", note: "thịt đỏ là nguồn sắt tốt", src: [9] }, { nut: "kem", src: [0] }, { nut: "vitamin-b12", src: [4] }, { nut: "vitamin-d", note: "thịt đỏ", src: [6] }] },
  { id: "thit-heo", name: "Thịt heo", names: ["thịt heo", "thịt lợn", "heo", "lợn"], items: [{ nut: "kem", src: [0] }, { nut: "vitamin-b12", src: [4] }, { nut: "vitamin-b", note: "B6", src: [4] }] },
  { id: "thit-ga", name: "Thịt gà, gia cầm", names: ["thịt gà", "gà", "gia cầm", "thịt vịt", "vịt", "gà tây"], items: [{ nut: "kem", src: [0] }, { nut: "vitamin-b", note: "B6", src: [4] }, { nut: "sat", note: "ít hơn thịt đỏ", src: [9] }] },
  { id: "gan", name: "Gan (gan heo, gan gà, gan bò)", names: ["gan", "gan heo", "gan lợn", "gan gà", "gan bò", "pate gan", "pa tê"], items: [{ nut: "vitamin-a", note: "**rất nhiều**", src: [7] }, { nut: "sat", src: [9] }, { nut: "folate", src: [4] }, { nut: "vitamin-d", src: [6] }, { nut: "vitamin-b", note: "B1", src: [4] }], caution: [LIVER_WARN] },
  { id: "ca-beo", name: "Cá béo (cá hồi, cá thu, cá mòi, cá trích)", names: ["cá hồi", "cá thu", "cá mòi", "cá trích", "cá béo"], items: [{ nut: "vitamin-d", src: [6] }, { nut: "omega-3", src: [15] }, { nut: "vitamin-a", src: [7] }, { nut: "kem", src: [0] }, { nut: "vitamin-b12", src: [4] }, { nut: "i-ot", note: "cá biển", src: [16] }] },
  { id: "ca", name: "Cá", names: ["cá", "ăn cá", "cá biển", "cá đồng", "cá lóc", "cá rô", "cá basa", "cá diêu hồng"], items: [{ nut: "kem", src: [0] }, { nut: "vitamin-b12", src: [4] }, { nut: "vitamin-b", note: "B6 (một số loại cá)", src: [4] }, { nut: "i-ot", note: "cá biển", src: [16] }] },
  { id: "trung", name: "Trứng", names: ["trứng", "trứng gà", "trứng vịt", "trứng cút", "lòng đỏ trứng", "lòng đỏ"], items: [{ nut: "vitamin-d", note: "ở lòng đỏ", src: [6] }, { nut: "vitamin-a", src: [7] }, { nut: "vitamin-b12", src: [4] }, { nut: "i-ot", src: [16] }, { nut: "kem", note: "một ít", src: [0] }] },
  { id: "sua", name: "Sữa", names: ["sữa", "sữa bò", "sữa tươi", "uống sữa"], items: [{ nut: "canxi", src: [8] }, { nut: "vitamin-b12", src: [4] }, { nut: "vitamin-a", src: [7] }, { nut: "i-ot", src: [16] }, { nut: "vitamin-b", note: "B6", src: [4] }, { nut: "kem", note: "một ít", src: [0] }] },
  { id: "pho-mai", name: "Phô mai, sữa chua", names: ["phô mai", "phomai", "pho mát", "sữa chua", "yaourt", "da ua"], items: [{ nut: "canxi", src: [8] }, { nut: "vitamin-a", src: [7] }, { nut: "vitamin-b12", note: "phô mai", src: [4] }, { nut: "i-ot", note: "đồ làm từ sữa", src: [16] }] },
  { id: "dau-phu", name: "Đậu phụ, đậu nành", names: ["đậu phụ", "đậu hũ", "tàu hũ", "đậu nành", "sữa đậu nành"], items: [{ nut: "canxi", src: [8] }, { nut: "vitamin-b", note: "B6 (đậu nành)", src: [4] }] },
  { id: "cac-loai-dau", name: "Các loại đậu (đậu Hà Lan, đậu gà, đậu đỏ)", names: ["đậu hà lan", "đậu gà", "đậu đỏ", "đậu thận", "các loại đậu"], items: [{ nut: "folate", note: "đậu Hà Lan, đậu gà, đậu đỏ", src: [4] }, { nut: "vitamin-b", note: "B1 (đậu Hà Lan)", src: [4] }, { nut: "kem", note: "một ít", src: [0] }] },
  { id: "hat", name: "Các loại hạt, đậu phộng", names: ["các loại hạt", "hạt điều", "hạnh nhân", "óc chó", "đậu phộng", "lạc", "hạt dinh dưỡng"], items: [{ nut: "kem", note: "một ít", src: [0] }, { nut: "vitamin-b", note: "B1 (các loại hạt), B6 (đậu phộng)", src: [4] }] },
  { id: "rau-la-xanh", name: "Rau lá xanh (cải bó xôi, cải xoăn, bắp cải…)", names: ["rau lá xanh", "rau xanh", "cải bó xôi", "rau bina", "rau chân vịt", "cải xoăn", "bắp cải", "rau cải", "rau ngót", "rau dền", "rau muống"], items: [{ nut: "folate", src: [4] }, { nut: "canxi", src: [8] }, { nut: "sat", note: "rau lá xanh đậm", src: [9] }, { nut: "vitamin-a", note: "beta-caroten (rau bina, rau lá xanh)", src: [7] }], caution: [FRUITVEG] },
  { id: "bong-cai", name: "Bông cải xanh (súp lơ xanh)", names: ["bông cải xanh", "súp lơ xanh", "bông cải", "cải brussels", "broccoli"], items: [{ nut: "vitamin-c", src: [3] }, { nut: "folate", src: [4] }], caution: [FRUITVEG] },
  { id: "ca-rot", name: "Cà rốt, khoai lang", names: ["cà rốt", "khoai lang", "bí đỏ", "ớt đỏ"], items: [{ nut: "vitamin-a", note: "dạng beta-caroten, cơ thể đổi thành vitamin A", src: [7] }], caution: [FRUITVEG] },
  { id: "khoai-tay", name: "Khoai tây", names: ["khoai tây"], items: [{ nut: "vitamin-c", src: [3] }], caution: [FRUITVEG] },
  { id: "cam", name: "Cam, quýt, chanh", names: ["cam", "quả cam", "trái cam", "nước cam", "quýt", "chanh", "bưởi", "trái cây họ cam"], items: [{ nut: "vitamin-c", src: [3] }, { nut: "vitamin-b", note: "B1 (cam)", src: [4] }], caution: [FRUITVEG] },
  { id: "chuoi", name: "Chuối", names: ["chuối", "trái chuối", "quả chuối"], items: [{ nut: "vitamin-b", note: "B1, B6", src: [4] }], caution: [FRUITVEG] },
  { id: "dau-tay", name: "Dâu tây, ớt chuông", names: ["dâu tây", "ớt chuông"], items: [{ nut: "vitamin-c", src: [3] }], caution: [FRUITVEG] },
  { id: "xoai", name: "Xoài, đu đủ, mơ", names: ["xoài", "đu đủ", "mơ", "quả mơ"], items: [{ nut: "vitamin-a", note: "dạng beta-caroten", src: [7] }], caution: [FRUITVEG] },
  { id: "ngu-coc", name: "Ngũ cốc nguyên hạt, yến mạch, bánh mì nguyên cám", names: ["ngũ cốc", "ngũ cốc nguyên hạt", "yến mạch", "bánh mì nguyên cám", "gạo lứt", "bột yến mạch"], items: [{ nut: "vitamin-b", note: "B1 (bánh mì nguyên cám), B6 (yến mạch)", src: [4] }, { nut: "kem", note: "một ít (ngũ cốc nguyên hạt)", src: [0] }] },
];
const FOOD_RAW = new Map(FOODS.map((f) => [f.id, new RegExp(`${LB}(${[...f.names].map((x) => x.toLowerCase().normalize("NFC")).sort((a, b) => b.length - a.length).map(esc).join("|")})${RB}`, "u")]));
const FOOD_PLAIN = new Map(FOODS.map((f) => [f.id, new RegExp(`\\b(${[...new Set(f.names.map((x) => normalizeVi(x)))].sort((a, b) => b.length - a.length).map(esc).join("|")})\\b`)]));
/** Món được nhắc trong câu (tên dài nhất thắng: "gan gà" trước "gà", "cá hồi" trước "cá"). */
export function foodOf(text: string): Food | null {
  const raw = text.normalize("NFC").toLowerCase();
  const n = ` ${normalizeVi(text)} `;
  let best: { f: Food; len: number } | null = null;
  for (const f of FOODS) {
    const m = ACCENTED.test(text) ? raw.match(FOOD_RAW.get(f.id)!) : n.match(FOOD_PLAIN.get(f.id)!);
    if (m && (!best || m[1].length > best.len)) best = { f, len: m[1].length };
  }
  return best?.f ?? null;
}
/** Hỏi món này có chất gì ("trứng có chất gì", "dinh dưỡng của chuối", "hàu bổ gì"). Không gồm "tác dụng" — lớp mẹo dân gian lo. */
const FOOD_ASK = /\b(chat gi|nhung chat gi|chat dinh duong|dinh duong|gia tri dinh duong|vitamin gi|nhung vitamin gi|khoang chat gi|vi chat gi|bo gi|bo khong|co bo khong|bo duong|giau chat gi|nhieu chat gi|chua chat gi|co chat gi|co vitamin gi|cung cap gi|cung cap chat gi)\b/;
/** "ăn trứng có tốt không" — chỉ khi câu không nêu bệnh (có bệnh thì lớp ăn uống theo bệnh trả lời) và không phải vị đã có bài mẹo dân gian. */
const LIVER_ORGAN = /\b(viem gan|xo gan|suy gan|ung thu gan|men gan|gan nhiem mo|benh gan|dau gan|mat gan|nong gan|gan yeu|bo gan|thai doc gan|chuc nang gan)\b/;
const FOOD_GOOD = /\b(co tot khong|tot khong|co tot ko|tot ko|co loi gi|loi ich gi|tot cho suc khoe)\b/;
export function renderFood(f: Food, now = Date.now()): string {
  const byId = (id: string) => NUTRIENTS.find((x) => x.id === id)!;
  const short = (id: string) => (id === "vitamin-b" ? "Vitamin nhóm B" : byId(id).name);
  const cautions = f.caution ?? [];
  const warn = cautions.filter((c) => c !== FRUITVEG), veg = cautions.filter((c) => c === FRUITVEG);
  const first = byId(f.items[0].nut).name.split(" (")[0];
  return [
    `🥗 **${f.name}** — có những chất gì (theo nguồn y khoa)`,
    f.items.map((i) => `• **${short(i.nut)}**${i.note ? ` — ${i.note}` : ""}`).join("\n"),
    veg.length ? `🌿 ${veg[0].text}` : "",
    warn.length ? `⚠️ ${warn.map((c) => c.text).join("\n⚠️ ")}` : "",
    `💡 ${GENERAL[0].text} Hỏi tên chất (vd “${first} có tác dụng gì”) để xem chi tiết, ai cần bổ sung.`,
    line(srcOf(f.items, cautions, GENERAL.slice(0, 1)), now),
  ].filter(Boolean).join("\n\n");
}

/**
 * Lớp vitamin · khoáng chất. `med` = thẻ bệnh nhận ra trong câu (nếu có). null = không phải câu hỏi này.
 */
export function nutrientReply(q: string, med: { id: string; name: string } | null, now = Date.now(), opts: { noNumbers?: boolean; typed?: string } = {}): string | null {
  const n = ` ${normalizeVi(q)} `;
  // 30/10 — CALO · ĐƯỜNG · MUỐI · KALI của món (lib/lomiFoodFacts, bảng FDA): "chuối bao nhiêu calo", "tiểu đường ăn chuối có nhiều đường không".
  // 30/10 — "tiểu đường kiêng trái cây gì", "trái cây nào nhiều đường" → cách ăn trái cây (NHS, NIDDK) + bảng đường của trái cây có số liệu.
  if (!opts.noNumbers && FRUIT_LIST_ASK.test(n) && (!fruitIn(q) || /^(trái cây|hoa quả)$/.test(fruitIn(q)!)) && ((med && isSugarTopic(med.id) && /\b(kieng|khong nen|nen an|an gi|an duoc|loai nao|qua nao|trai nao|gi)\b/.test(n)) || /\b(nhieu duong|it duong|ngot nhat|duong cao|duong thap)\b/.test(n)))
    return renderFruitSugar(med, now);
  // (đang có dấu hiệu rối loạn ăn uống → không đưa con số calo; lớp cân nặng lib/lomiExtras trả lời nhẹ nhàng)
  if (FACT_ASK.test(n) && !opts.noNumbers) {
    const ff = factOf(q);
    if (ff) return renderFact(ff, med, now);
    // (câu gõ thiếu dấu được đoán dấu sai — "cam bao nhiêu calo" thành "cảm…" — thì đọc lại đúng chữ người dùng gõ; bệnh đoán từ chữ sai bỏ qua)
    const ft = opts.typed && opts.typed !== q ? factOf(opts.typed) : null;
    if (ft) return renderFact(ft, null, now);
    if (DAILY_ASK.test(n)) return renderDaily(now);
    // "phở bao nhiêu calo" — món chưa có số liệu kiểm chứng → nói thật (chỉ khi câu hỏi rõ là calo / đường của MÓN).
    if (!nutrientOf(q) && /\b(bao nhieu calo|bao nhieu kcal|nhieu calo|it calo|bao nhieu duong|nhieu duong khong|co nhieu duong)\b/.test(n) && !med) return renderNoFact("món này");
  }
  const x = nutrientOf(q);
  // Hỏi MỘT MÓN có chất gì (không nêu tên chất) → bảng món → chất.
  // (câu nêu bệnh mà hỏi "nên uống vitamin gì" → trả lời theo bệnh bên dưới, không theo món)
  if (!x && !(med && SUPP.test(n)) && (FOOD_ASK.test(n) || (!med && FOOD_GOOD.test(n) && !findFolk(q)))) {
    const f = foodOf(q);
    // "viêm gan", "men gan", "nóng gan" — chữ "gan" là bộ phận cơ thể, không phải món gan.
    if (f && !(f.id === "gan" && LIVER_ORGAN.test(n))) return renderFood(f, now);
  }
  if (x) {
    // "thiếu vitamin D", "thiếu sắt" — kho đã có thẻ bệnh riêng.
    if (med && DEFICIT_CARD[x.id] === med.id && !/\b(co trong|mon gi|thuc pham|an gi|giau|nhieu)\b/.test(n)) return null;
    const words = n.trim().split(" ").length;
    if (!NUT_ASK.test(n) && words > 4) return null;
    return renderNutrient(x, med && med.id !== DEFICIT_CARD[x.id] ? med : null, DOSE.test(n), now);
  }
  if (!SUPP.test(n)) return null;
  // "thuốc bổ gan uống chung với paracetamol được không" — hỏi tương tác thuốc → để lớp thuốc trả lời.
  if (/\b(uong chung|dung chung|uong cung|chung voi|cung voi|tuong tac)\b/.test(n)) return null;
  // ("vitamin" trong tên thẻ bệnh — "thiếu vitamin D" — đã bắt ở trên; ở đây là hỏi chung theo bệnh.)
  if (med) return renderForDisease(med, now);
  return renderOverview(now);
}
