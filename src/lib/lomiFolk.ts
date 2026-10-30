// ─────────────────────────────────────────────────────────────────────────────
// MẸO DÂN GIAN · THUỐC NAM · THUỐC BẮC CÓ NGUỒN (20/10, theo ý Kir: "kiếm thêm mẹo… bài thuốc nam, mẹo dân gian phổ biến
//   — lá tía tô, cháo cóc, kỷ tử, táo tàu…") — chạy trên máy, không gọi AI.
//
// Nguyên tắc (giống kho kiến thức y khoa lib/lomiMed, lib/lomiDrugData):
//   1. Mỗi vị / mẹo ghi rõ 3 phần: DÂN GIAN DÙNG ĐỂ LÀM GÌ · NGHIÊN CỨU NÓI GÌ (bằng chứng tới đâu) · AI KHÔNG NÊN DÙNG.
//      Mọi ý trỏ tới nguồn chính thống (NCCIH/NIH, NHS, LiverTox, NCI, Viện Dinh dưỡng / Viện Kiểm nghiệm ATVSTP – Bộ Y tế).
//   2. Không nói "chữa khỏi". Không nêu liều thuốc. Mẹo nguy hiểm (cháo cóc, hà thủ ô, ma hoàng…) nói thẳng là nguy hiểm.
//   3. Vị chưa tìm được nguồn đáng tin (kỷ tử, táo tàu, đông trùng hạ thảo…) → nói thật là chưa đối chiếu được công dụng,
//      kèm lời dặn an toàn chung khi dùng thảo dược (NCCIH), không đoán công dụng.
//   Thêm vị mới = thêm một mục vào FOLK (test src/test/lomiFolk.test.ts ép tên miền nguồn, chỉ số src, không có liều).
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { sourceLine, type DrugFact, type DrugSource } from "@/lib/lomiDrugData";
import { V, VN } from "@/lib/viMatch";
import { saidBefore } from "@/lib/lomiCite";

export type FolkVerdict = "help" | "mixed" | "unclear" | "risky" | "danger" | "myth";
export type FolkTopic = { id: string; text: string; src: number[]; v?: FolkVerdict };
export type FolkEntry = {
  id: string;
  /** Tên hiển thị. */
  name: string;
  /** Tên để nhận ra (viết đúng dấu tiếng Việt). */
  names: string[];
  verdict: FolkVerdict;
  /** Quan niệm / thói quen dân gian (verdict "myth") — mô tả điều người ta hay làm, không phải ý y khoa nên không cần nguồn. */
  belief?: string;
  /** Lời đồn Lomi đã tìm mà KHÔNG thấy nguồn y khoa nào xác nhận (nói thật là chưa thấy, không khẳng định đúng / sai). */
  unverified?: string[];
  /** Chỉ nhận khi câu cũng nói tới ngữ cảnh này ("ngửa cổ" chỉ tính khi đang nói chảy máu cam). */
  ctx?: RegExp;
  /** Mẹo sinh hoạt (chườm, ăn uống, tư thế…) chứ không phải vị thuốc → không kèm lời dặn dùng thảo dược. */
  tip?: true;
  folk: DrugFact[];
  science: DrugFact[];
  how?: DrugFact[];
  caution: DrugFact[];
  /** Bệnh trong kho lib/medkb mà vị này hay được dùng — một dòng ngắn có nguồn cho từng bệnh. */
  topics: FolkTopic[];
  sources: DrugSource[];
  verifiedAt: string;
};

export const VERDICT: Record<FolkVerdict, { icon: string; text: string }> = {
  help: { icon: "✅", text: "Có bằng chứng (còn hạn chế) là giúp được — dùng như mẹo hỗ trợ, không thay điều trị" },
  mixed: { icon: "🔸", text: "Giúp được vài trường hợp; nhiều công dụng dân gian khác chưa được chứng minh" },
  unclear: { icon: "❔", text: "Chưa đủ bằng chứng là chữa được bệnh" },
  risky: { icon: "⚠️", text: "Có rủi ro đáng kể — chỉ dùng khi bác sĩ đồng ý" },
  danger: { icon: "⛔", text: "Nguồn y khoa cảnh báo NGUY HIỂM — không nên dùng" },
  myth: { icon: "🧐", text: "Quan niệm dân gian — nguồn y khoa hướng dẫn khác" },
};

const VERIFIED = "2026-10-20";
const NCCIH = "NCCIH (Viện Y tế Quốc gia Hoa Kỳ – NIH)";
const nccih = (slug: string, title: string, upd: string): DrugSource => ({ title: `${title} (trang ghi cập nhật ${upd})`, publisher: NCCIH, url: `https://www.nccih.nih.gov/health/${slug}` });
const NHS_COUGH: DrugSource = { title: "Cough", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/cough/", reviewed: "2023-12-08" };
const NHS_COLD: DrugSource = { title: "Common cold", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/common-cold/", reviewed: "2024-03-22" };
const NHS_SINUS: DrugSource = { title: "Sinusitis (sinus infection)", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/sinusitis-sinus-infection/", reviewed: "2024-01-31" };
const NHS_BURN: DrugSource = { title: "Burns and scalds", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/burns-and-scalds/", reviewed: "2026-03-31" };
const NHS_NOSE: DrugSource = { title: "Nosebleed", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/nosebleed/", reviewed: "2023-12-05" };
const NHS_SNAKE: DrugSource = { title: "Snake bites", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/snake-bites/", reviewed: "2026-07-17" };
const NHS_FSEIZ: DrugSource = { title: "Febrile seizures", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/febrile-seizures/", reviewed: "2023-06-21" };
const NHS_FEVERKID: DrugSource = { title: "Fever in children", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/fever-in-children/", reviewed: "2024-01-03" };
const NHS_DV: DrugSource = { title: "Diarrhoea and vomiting", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/diarrhoea-and-vomiting/", reviewed: "2023-12-21" };
const NHS_POX: DrugSource = { title: "Chickenpox", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/chickenpox/", reviewed: "2025-01-31" };
const NHS_JAUN: DrugSource = { title: "Newborn jaundice", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/jaundice-newborn/", reviewed: "2026-03-24" };
const NHS_ACNE: DrugSource = { title: "Acne", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/acne/", reviewed: "2026-09-22" };
const NHS_BITE: DrugSource = { title: "Insect bites and stings", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/insect-bites-and-stings/", reviewed: "2023-06-01" };
const NHS_CONJ: DrugSource = { title: "Conjunctivitis", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/conjunctivitis/", reviewed: "2024-04-23" };
const NHS_OA: DrugSource = { title: "Osteoarthritis – Living with", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/osteoarthritis/living-with/", reviewed: "2023-03-20" };
const NHS_RA: DrugSource = { title: "Rheumatoid arthritis – Living with", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/rheumatoid-arthritis/living-with/", reviewed: "2023-03-08" };
const NHS_GOUT: DrugSource = { title: "Gout", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/gout/", reviewed: "2023-08-24" };
const WHO_RABIES: DrugSource = { title: "Rabies – fact sheet (17/09/2026)", publisher: "WHO", url: "https://www.who.int/news-room/fact-sheets/detail/rabies" };
const LIVERTOX_BM: DrugSource = { title: "Bitter Melon — LiverTox (cập nhật 20/03/2023)", publisher: "LiverTox (NIDDK – NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK590483/" };
/** Lời dặn chung khi dùng thảo dược / thực phẩm chức năng. */
export const WISELY: DrugSource = nccih("using-dietary-supplements-wisely", "Using Dietary Supplements Wisely", "01/2019");

export const FOLK: FolkEntry[] = [
  {
    id: "mat-ong-chanh",
    name: "Chanh mật ong",
    names: ["chanh mật ong", "mật ong chanh", "nước chanh mật ong", "mật ong", "trà chanh mật ong"],
    verdict: "help",
    folk: [{ text: "Chanh mật ong ấm là mẹo quen thuộc khi ho, cảm lạnh, đau họng.", src: [0, 1] }],
    science: [{ text: "NHS: chanh mật ong ấm có thể có tác dụng gần giống siro ho, nhưng bằng chứng còn hạn chế.", src: [0] }],
    how: [{ text: "Cách làm: vắt nửa quả chanh vào một cốc nước đun sôi, thêm 1–2 thìa cà phê mật ong, uống khi còn ấm.", src: [0, 1] }],
    caution: [
      { text: "KHÔNG cho trẻ dưới 1 tuổi ăn mật ong.", src: [0, 1] },
      { text: "Không cho trẻ nhỏ uống đồ uống nóng.", src: [0, 1] },
    ],
    topics: [
      { id: "ho", text: "chanh mật ong ấm có thể dịu ho gần giống siro ho (bằng chứng hạn chế); không cho bé dưới 1 tuổi", src: [0] },
      { id: "cam-lanh", text: "uống ấm cho dịu họng, đủ nước; không cho bé dưới 1 tuổi ăn mật ong", src: [1] },
      { id: "viem-hong", text: "uống ấm cho dịu họng; không cho bé dưới 1 tuổi ăn mật ong", src: [1] },
    ],
    sources: [NHS_COUGH, NHS_COLD],
    verifiedAt: VERIFIED,
  },
  {
    id: "xong-hoi",
    name: "Xông hơi",
    names: ["xông hơi", "xông mũi", "nồi xông", "xông lá", "xông giải cảm", "hít hơi nước", "xông nồi"],
    verdict: "help",
    folk: [{ text: "Xông hơi nước nóng là mẹo giải cảm, thông mũi quen thuộc khi cảm lạnh, nghẹt mũi.", src: [0] }],
    science: [{ text: "NHS: hít hơi nước có thể giúp đỡ nghẹt mũi khi cảm lạnh — ví dụ ngồi trong phòng tắm đang xả vòi sen nước nóng.", src: [0] }],
    caution: [
      { text: "Không để trẻ em xông bằng tô / nồi nước nóng vì nguy cơ bị bỏng.", src: [0] },
      { text: "Lỡ bị bỏng: xả dưới vòi nước mát 20 phút, không bôi kem, dầu hay bơ lên vết bỏng.", src: [1] },
    ],
    topics: [{ id: "cam-lanh", text: "hít hơi nước giúp đỡ nghẹt mũi; không cho trẻ xông nồi nước nóng (dễ bỏng)", src: [0] }],
    sources: [NHS_COLD, NHS_BURN],
    verifiedAt: VERIFIED,
  },
  {
    id: "nuoc-muoi",
    name: "Súc họng / rửa mũi nước muối",
    names: ["súc miệng nước muối", "súc họng nước muối", "súc nước muối", "rửa mũi nước muối", "rửa mũi bằng nước muối", "ngậm nước muối"],
    verdict: "help",
    folk: [{ text: "Súc họng nước muối khi đau họng, rửa mũi nước muối khi nghẹt mũi, viêm xoang là mẹo rất phổ biến.", src: [0, 1] }],
    science: [
      { text: "NHS: súc họng nước muối giúp dịu đau họng khi cảm lạnh.", src: [0] },
      { text: "NHS: rửa mũi bằng nước muối (nước đun sôi để nguội pha muối và baking soda) giúp đỡ viêm xoang; cố đừng để nước chảy xuống họng.", src: [1] },
    ],
    caution: [{ text: "Trẻ em không nên súc họng nước muối.", src: [0] }],
    topics: [
      { id: "viem-hong", text: "súc họng nước muối giúp dịu họng (trẻ em không nên súc)", src: [0] },
      { id: "cam-lanh", text: "súc họng nước muối giúp dịu đau họng (trẻ em không nên súc)", src: [0] },
      { id: "viem-xoang", text: "rửa mũi bằng nước muối giúp đỡ viêm xoang", src: [1] },
    ],
    sources: [NHS_COLD, NHS_SINUS],
    verifiedAt: VERIFIED,
  },
  {
    id: "gung",
    name: "Gừng",
    names: ["gừng", "trà gừng", "nước gừng", "gừng tươi", "gừng mật ong"],
    verdict: "mixed",
    folk: [{ text: "Dân gian dùng gừng từ xưa cho hen suyễn, cảm cúm, khó tiêu, khó chịu dạ dày; nay hay được quảng bá cho buồn nôn, đau khớp, đau bụng kinh.", src: [0] }],
    science: [
      { text: "Buồn nôn, nôn khi mang thai: nghiên cứu cho thấy gừng có thể giúp.", src: [0] },
      { text: "Say tàu xe: phần lớn nghiên cứu cho thấy KHÔNG giúp. Buồn nôn sau mổ, do hoá trị: chưa chắc.", src: [0] },
      { text: "Đau bụng kinh: gừng dạng bổ sung có thể làm cơn đau nhẹ bớt. Thoái hoá khớp gối: có thể giúp chút ít, nhưng nghiên cứu phần lớn chất lượng thấp.", src: [0] },
    ],
    caution: [
      { text: "Có thể gây khó chịu bụng, ợ nóng, tiêu chảy, rát miệng / họng.", src: [0] },
      { text: "Mang thai: gừng dạng bổ sung có thể an toàn nhưng nên hỏi bác sĩ trước; khi cho con bú thì chưa rõ.", src: [0] },
      { text: "Đang dùng thuốc thì hỏi bác sĩ / dược sĩ trước khi dùng gừng như thuốc — một số thảo dược tương tác có hại với thuốc.", src: [0] },
    ],
    topics: [
      { id: "om-nghen", text: "có thể giúp đỡ buồn nôn khi mang thai — hỏi bác sĩ trước khi dùng dạng bổ sung", src: [0], v: "help" },
      { id: "buon-non", text: "có thể giúp buồn nôn khi mang thai; buồn nôn sau mổ / do hoá trị thì chưa chắc", src: [0] },
      { id: "dau-bung-kinh", text: "gừng dạng bổ sung có thể giảm đau bụng kinh", src: [0], v: "help" },
      { id: "say-tau-xe", text: "phần lớn nghiên cứu cho thấy gừng KHÔNG giúp say tàu xe", src: [0], v: "unclear" },
      { id: "thoai-hoa-khop", text: "có thể đỡ chút ít đau khớp gối, nhưng nghiên cứu chất lượng thấp; bôi gừng thì không thấy giúp", src: [0] },
    ],
    sources: [nccih("ginger", "Ginger", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "tia-to",
    name: "Tía tô",
    names: ["tía tô", "lá tía tô", "cháo tía tô", "cháo hành tía tô", "nước tía tô", "tử tô"],
    verdict: "unclear",
    folk: [{ text: "Dân gian (Việt Nam, Trung Quốc, Nhật…) dùng lá tía tô cho cảm, cúm, ho, tức ngực, nôn, đau bụng, và ăn kèm cá, cua để \"giải độc\".", src: [0] }],
    science: [{ text: "Bài tổng quan năm 2018: kết quả hứa hẹn chủ yếu ở nghiên cứu phòng thí nghiệm và trên động vật; nghiên cứu trên người còn chưa đủ.", src: [0] }],
    caution: [
      { text: "Độ an toàn và hiệu quả khi dùng như thuốc còn cần nghiên cứu thêm.", src: [0] },
      { text: "\"Tự nhiên\" không có nghĩa là an toàn; đang mang thai, cho con bú, cho trẻ dùng hay đang uống thuốc thì hỏi bác sĩ trước khi dùng thảo dược như thuốc.", src: [1] },
    ],
    topics: [
      { id: "cam-lanh", text: "dân gian ăn cháo hành tía tô giải cảm; nghiên cứu trên người chưa đủ để nói là chữa được", src: [0] },
      { id: "ho", text: "dân gian dùng trị ho; nghiên cứu trên người chưa đủ", src: [0] },
    ],
    sources: [
      { title: "Ethnomedicinal, Phytochemical and Pharmacological Investigations of Perilla frutescens (Molecules, 2018)", publisher: "PubMed Central – NIH (bài tổng quan)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6337106/" },
      WISELY,
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: "nghe",
    name: "Nghệ",
    names: ["nghệ", "tinh bột nghệ", "nghệ mật ong", "curcumin", "nghệ tươi", "bột nghệ"],
    verdict: "unclear",
    folk: [{ text: "Đông y, Ấn Độ, Thái dùng nghệ cho khó tiêu, đau bụng, cảm, nhiễm trùng da, đau khớp, bệnh gan.", src: [0] }],
    science: [
      { text: "Nhìn chung CHƯA đủ bằng chứng là nghệ / curcumin có lợi cho bệnh nào.", src: [0] },
      { text: "Thoái hoá khớp gối: bằng chứng ban đầu tích cực, cần nghiên cứu tốt hơn. Gan nhiễm mỡ: có thể cải thiện vài chỉ số, chưa rõ chỉ số nào.", src: [0] },
    ],
    caution: [
      { text: "Uống có thể gây buồn nôn, nôn, trào ngược axit, đau bụng, tiêu chảy hoặc táo bón; bôi có thể nổi mề đay, ngứa.", src: [0] },
      { text: "Sản phẩm curcumin \"hấp thu cao\" có thể hại gan — thấy mệt, buồn nôn, chán ăn, nước tiểu sẫm, vàng da thì ngưng và đi khám.", src: [0] },
      { text: "Mang thai: nghệ dạng bổ sung có thể không an toàn.", src: [0] },
    ],
    topics: [
      { id: "viem-da-day", text: "dân gian hay dùng nghệ mật ong cho dạ dày, nhưng nguồn ghi chưa đủ bằng chứng; nghệ uống còn có thể gây trào ngược, đau bụng", src: [0], v: "unclear" },
      { id: "loet-da-day", text: "chưa đủ bằng chứng nghệ chữa loét dạ dày; uống nghệ có thể gây trào ngược, đau bụng", src: [0], v: "unclear" },
      { id: "kho-tieu", text: "dân gian dùng cho khó tiêu nhưng chưa đủ bằng chứng; có thể gây trào ngược, đau bụng", src: [0], v: "unclear" },
      { id: "thoai-hoa-khop", text: "bằng chứng ban đầu tích cực cho đau khớp gối, cần nghiên cứu tốt hơn", src: [0] },
      { id: "gan-nhiem-mo", text: "có thể cải thiện vài chỉ số nhưng chưa rõ; curcumin \"hấp thu cao\" từng gây tổn thương gan", src: [0] },
    ],
    sources: [nccih("turmeric", "Turmeric", "04/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "toi",
    name: "Tỏi",
    names: ["tỏi", "tỏi sống", "ngậm tỏi", "tỏi ngâm", "rượu tỏi", "tỏi mồ côi"],
    verdict: "mixed",
    folk: [{ text: "Từ xưa tỏi được dùng cho đau đầu, viêm phổi, bệnh họng, bệnh tiêu hoá; nay hay được quảng bá cho mỡ máu, huyết áp, tiểu đường, \"tăng đề kháng\".", src: [0] }],
    science: [
      { text: "Tỏi dạng bổ sung có thể giảm nhẹ cholesterol toàn phần và LDL; có thể giảm nhẹ huyết áp và đường huyết (bằng chứng hạn chế).", src: [0] },
      { text: "NHS: có rất ít bằng chứng tỏi giúp phòng cảm lạnh hay mau khỏi cảm.", src: [1] },
    ],
    caution: [
      { text: "Có thể gây hôi miệng, mùi cơ thể, đau bụng, đầy hơi, buồn nôn; có người bị dị ứng.", src: [0] },
      { text: "Đắp tỏi sống lên da có thể gây kích ứng nặng và bỏng hoá chất.", src: [0] },
      { text: "Tỏi dạng bổ sung có thể tăng nguy cơ chảy máu — báo bác sĩ, nhất là trước phẫu thuật hoặc khi đang dùng thuốc chống đông, aspirin.", src: [0] },
      { text: "Mang thai / cho con bú: dùng nhiều hơn lượng trong bữa ăn có thể không an toàn.", src: [0] },
    ],
    topics: [
      { id: "mo-mau-cao", text: "tỏi dạng bổ sung có thể giảm nhẹ cholesterol; báo bác sĩ nếu đang dùng thuốc chống đông", src: [0], v: "help" },
      { id: "tang-huyet-ap", text: "có thể giảm nhẹ huyết áp (bằng chứng hạn chế)", src: [0] },
      { id: "tieu-duong-type-2", text: "tỏi dạng bổ sung có thể giảm nhẹ đường huyết", src: [0] },
      { id: "cam-lanh", text: "rất ít bằng chứng tỏi phòng hay chữa cảm lạnh", src: [1], v: "unclear" },
    ],
    sources: [nccih("garlic", "Garlic", "02/2025"), NHS_COLD],
    verifiedAt: VERIFIED,
  },
  {
    id: "cam-thao",
    name: "Cam thảo",
    names: ["cam thảo", "rễ cam thảo", "licorice", "kẹo cam thảo"],
    verdict: "risky",
    folk: [{ text: "Nhiều nền y học cổ truyền (kể cả Đông y) dùng cam thảo cho ho, hen, vết thương, bệnh phổi, gan.", src: [0] }],
    science: [
      { text: "Nhìn chung chưa đủ bằng chứng tốt cho bệnh nào.", src: [0] },
      { text: "Nước súc / ngậm có cam thảo có thể làm vết loét miệng tái phát nhỏ lại, đỡ đau; một nghiên cứu sơ bộ thấy nước súc chiết xuất cam thảo có thể giảm hôi miệng.", src: [0] },
    ],
    caution: [
      { text: "Chất glycyrrhizin trong cam thảo có thể gây loạn nhịp tim, ngưng tim — nhất là dùng nhiều hoặc lâu ngày.", src: [0] },
      { text: "Người ăn mặn, tăng huyết áp, bệnh tim hoặc thận: lượng nhỏ cũng từng gây tác dụng nặng.", src: [0] },
      { text: "Mang thai: dùng lượng lớn không an toàn, tăng nguy cơ sinh non. Có tương tác với corticoid.", src: [0] },
    ],
    topics: [
      { id: "ho", text: "dân gian dùng trị ho nhưng chưa đủ bằng chứng; người tăng huyết áp, bệnh tim, thận cần tránh", src: [0], v: "unclear" },
      { id: "nhiet-mieng", text: "nước súc có cam thảo có thể giúp vết loét miệng tái phát nhỏ lại, đỡ đau", src: [0], v: "help" },
      { id: "hoi-mieng", text: "một nghiên cứu sơ bộ: nước súc chiết xuất cam thảo có thể giảm hôi miệng", src: [0] },
      { id: "tang-huyet-ap", text: "người tăng huyết áp nên tránh cam thảo — lượng nhỏ cũng từng gây tác dụng nặng", src: [0], v: "danger" },
    ],
    sources: [nccih("licorice-root", "Licorice Root", "04/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "nhan-sam",
    name: "Nhân sâm",
    names: ["nhân sâm", "hồng sâm", "sâm hàn quốc", "sâm hàn", "sâm cao ly", "ginseng", "trà sâm"],
    verdict: "unclear",
    folk: [{ text: "Đông y dùng nhân sâm như vị \"an thần\", giúp cơ thể chống chịu căng thẳng; được quảng bá cho mệt mỏi, trí nhớ, tiểu đường, sinh lý, chống lão hoá.", src: [0] }],
    science: [
      { text: "Phần lớn nghiên cứu nhỏ và ngắn. Mệt mỏi chung: có thể giúp chút ít. Rối loạn cương: một số nghiên cứu thấy cải thiện.", src: [0] },
      { text: "Đường huyết: kết quả mâu thuẫn, chưa kết luận được. Thành tích thể thao: phần lớn không thấy cải thiện. Chống lão hoá, lo âu: chưa đủ bằng chứng.", src: [0] },
    ],
    caution: [
      { text: "Tác dụng phụ hay gặp nhất là mất ngủ; hiếm hơn: phát ban nặng, tổn thương gan, dị ứng nặng.", src: [0] },
      { text: "Có thể hạ đường huyết (người tiểu đường hỏi bác sĩ trước), ảnh hưởng đông máu, làm nặng bệnh tự miễn.", src: [0] },
      { text: "Mang thai: có thể không an toàn (gây dị tật ở động vật). Một số chuyên gia khuyên không dùng cho trẻ nhỏ, bà bầu, mẹ cho con bú.", src: [0] },
    ],
    topics: [
      { id: "roi-loan-cuong-duong", text: "một số nghiên cứu thấy cải thiện chức năng cương", src: [0], v: "mixed" },
      { id: "tieu-duong-type-2", text: "tác dụng lên đường huyết chưa rõ; có thể gây hạ đường huyết khi dùng chung thuốc — hỏi bác sĩ trước", src: [0] },
      { id: "kiet-suc", text: "có thể giúp chút ít với mệt mỏi chung; hay gây mất ngủ", src: [0] },
    ],
    sources: [nccih("asian-ginseng", "Asian Ginseng", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "que",
    name: "Quế",
    names: ["quế", "bột quế", "trà quế", "vỏ quế", "tinh dầu quế"],
    verdict: "unclear",
    folk: [{ text: "Đông y, Ấn Độ, Ba Tư dùng quế cho viêm, đau thần kinh, bệnh tim, ho; nay được quảng bá cho tiểu đường, giảm cân.", src: [0] }],
    science: [{ text: "Chưa rõ quế có giúp tiểu đường hay giảm cân không — nghiên cứu khó diễn giải, cần nghiên cứu tốt hơn.", src: [0] }],
    caution: [
      { text: "Lượng dùng làm gia vị có lẽ an toàn; dùng nhiều / lâu dài có thể gây rối loạn tiêu hoá, dị ứng.", src: [0] },
      { text: "Nuốt bột quế khô (trò \"thử thách bột quế\") rất nguy hiểm.", src: [0] },
      { text: "Quế cassia có coumarin liên quan bệnh gan — người bệnh gan cẩn thận với sản phẩm hàm lượng cao. Bôi tinh dầu quế có thể kích ứng da.", src: [0] },
    ],
    topics: [{ id: "tieu-duong-type-2", text: "chưa rõ quế có giúp tiểu đường không — không thay thuốc", src: [0] }],
    sources: [nccih("cinnamon", "Cinnamon", "11/2024")],
    verifiedAt: VERIFIED,
  },
  {
    id: "tra-xanh",
    name: "Trà xanh",
    names: ["trà xanh", "chè xanh", "nước chè xanh", "lá chè xanh", "nước trà xanh"],
    verdict: "unclear",
    folk: [{ text: "Trà xanh được dùng cho sức khoẻ khoảng 3.000 năm; nay được quảng bá cho giảm cân, hạ mỡ máu, phòng bệnh tim, ung thư.", src: [0] }],
    science: [
      { text: "Chiết xuất trà xanh làm giảm nhẹ cholesterol toàn phần và LDL; tác dụng lên cân nặng chỉ ở mức khiêm tốn.", src: [0] },
      { text: "Với ung thư: kết quả không thống nhất. Với bệnh tim: liên quan nguy cơ thấp hơn ở người châu Á nhưng không thấy ở người phương Tây.", src: [0] },
    ],
    caution: [
      { text: "Uống như nước trà: chưa ghi nhận vấn đề an toàn ở người lớn, nhưng có caffeine.", src: [0] },
      { text: "Viên chiết xuất trà xanh: hiếm nhưng có ca tổn thương gan; có thể gây buồn nôn, táo bón, tăng huyết áp.", src: [0] },
      { text: "Liều cao có thể làm giảm tác dụng nadolol, atorvastatin. Mang thai: giữ caffeine ở mức vừa phải; cho con bú uống nhiều có thể làm bé quấy, khó ngủ.", src: [0] },
    ],
    topics: [
      { id: "mo-mau-cao", text: "chiết xuất trà xanh làm giảm nhẹ cholesterol; liều cao có thể giảm tác dụng atorvastatin", src: [0], v: "mixed" },
      { id: "beo-phi", text: "tác dụng giảm cân chỉ ở mức khiêm tốn; viên chiết xuất hiếm khi gây hại gan", src: [0] },
    ],
    sources: [nccih("green-tea", "Green Tea", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "cuc-la-ma",
    name: "Cúc La Mã (chamomile)",
    names: ["cúc la mã", "trà cúc la mã", "chamomile", "hoa cúc la mã"],
    verdict: "unclear",
    folk: [{ text: "Được dùng từ thời Trung Hoa, Ai Cập, Hy Lạp, La Mã cổ; nay được quảng bá cho cảm, khó tiêu, lo âu, mất ngủ, bé khóc dạ đề, ho.", src: [0] }],
    science: [
      { text: "Chưa đủ bằng chứng cho bệnh nào. Sơ bộ: có thể giúp lo âu lan toả.", src: [0] },
      { text: "Mất ngủ: bằng chứng rất ít — tổng quan năm 2019 chỉ tìm được 1 nghiên cứu và không thấy lợi.", src: [0] },
    ],
    caution: [
      { text: "Có thể dị ứng, kể cả sốc phản vệ — nhất là người dị ứng cúc vạn thọ, hoa cúc, cỏ phấn hương.", src: [0] },
      { text: "Có tương tác với warfarin và một số thuốc chuyển hoá qua gan; có thể giảm tác dụng thuốc tránh thai.", src: [0] },
      { text: "Mang thai, cho con bú: chưa rõ có an toàn không.", src: [0] },
    ],
    topics: [
      { id: "mat-ngu", text: "bằng chứng cho mất ngủ rất ít — tập thói quen ngủ tốt vẫn là chính", src: [0], v: "unclear" },
      { id: "lo-au", text: "nghiên cứu sơ bộ: có thể giúp lo âu lan toả", src: [0] },
    ],
    sources: [nccih("chamomile", "Chamomile", "11/2024")],
    verifiedAt: VERIFIED,
  },
  {
    id: "nha-dam",
    name: "Nha đam (lô hội)",
    names: ["nha đam", "lô hội", "aloe vera", "gel nha đam", "nước nha đam"],
    verdict: "mixed",
    folk: [{ text: "Từ xưa nha đam dùng cho bệnh da, vết thương; nay được quảng bá bôi cho mụn, bỏng, vảy nến, và uống cho giảm cân, tiểu đường.", src: [0] }],
    science: [
      { text: "Bôi lên vết bỏng: có thể giúp mau lành, đỡ đau. Mụn: gel kết hợp thuốc trị mụn có thể giúp (2 nghiên cứu nhỏ).", src: [0] },
      { text: "Uống: ít nghiên cứu, có thể giảm đường huyết; với chàm, ruột kích thích, viêm loét đại tràng chưa đủ bằng chứng.", src: [0] },
    ],
    caution: [
      { text: "Bôi: thỉnh thoảng gây rát, ngứa, phát ban.", src: [0] },
      { text: "Nhựa vàng (latex) uống để nhuận tràng gây đau quặn, tiêu chảy — FDA đã yêu cầu bỏ khỏi thuốc nhuận tràng không kê đơn. Chiết xuất lá uống có liên quan viêm gan cấp.", src: [0] },
      { text: "Mang thai, cho con bú: uống nha đam ở mọi dạng có thể không an toàn.", src: [0] },
    ],
    topics: [
      { id: "so-cuu-bong", text: "gel bôi có thể giúp vết bỏng mau lành, đỡ đau — nhưng việc đầu tiên vẫn là xả nước mát 20 phút", src: [0, 1], v: "help" },
      { id: "mun-trung-ca", text: "gel nha đam kết hợp thuốc trị mụn có thể giúp (nghiên cứu nhỏ)", src: [0] },
      { id: "tao-bon", text: "đừng uống nhựa nha đam để nhuận tràng — gây đau quặn, tiêu chảy, đã bị bỏ khỏi thuốc không kê đơn", src: [0], v: "danger" },
    ],
    sources: [nccih("aloe-vera", "Aloe Vera", "02/2025"), NHS_BURN],
    verifiedAt: VERIFIED,
  },
  {
    id: "bac-ha",
    name: "Dầu bạc hà",
    names: ["dầu bạc hà", "tinh dầu bạc hà", "lá bạc hà", "trà bạc hà", "peppermint"],
    verdict: "mixed",
    folk: [{ text: "Bạc hà dùng cho bệnh tiêu hoá từ thời Hy Lạp, La Mã, Ai Cập; nay được quảng bá cho ruột kích thích, khó tiêu, đau đầu, căng cơ, buồn nôn.", src: [0] }],
    science: [
      { text: "Hội chứng ruột kích thích: viên dầu bạc hà bao tan trong ruột giảm triệu chứng và đau bụng hơn giả dược — hướng dẫn điều trị năm 2021 có khuyên dùng.", src: [0] },
      { text: "Đau đầu do căng thẳng: bôi dầu bạc hà có thể đỡ (bằng chứng hạn chế). Khó tiêu: dầu bạc hà đơn độc chưa có bằng chứng, có khi làm nặng thêm.", src: [0] },
    ],
    caution: [
      { text: "KHÔNG bôi dầu bạc hà lên mặt trẻ sơ sinh, trẻ nhỏ — hít menthol có thể ảnh hưởng nghiêm trọng đến hô hấp.", src: [0] },
      { text: "Uống có thể gây ợ nóng, buồn nôn, đau bụng, khô miệng.", src: [0] },
    ],
    topics: [
      { id: "hoi-chung-ruot-kich-thich", text: "viên dầu bạc hà bao tan trong ruột giúp giảm triệu chứng, đau bụng", src: [0], v: "help" },
      { id: "dau-dau-cang-thang", text: "bôi dầu bạc hà có thể đỡ đau đầu do căng thẳng (bằng chứng hạn chế); không bôi lên mặt trẻ nhỏ", src: [0], v: "help" },
      { id: "kho-tieu", text: "dầu bạc hà đơn độc chưa có bằng chứng, có thể làm khó tiêu nặng hơn", src: [0], v: "unclear" },
    ],
    sources: [nccih("peppermint-oil", "Peppermint Oil", "05/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "ngai-cuu",
    name: "Ngải cứu",
    names: ["ngải cứu", "trứng ngải cứu", "trứng chiên ngải cứu", "lá ngải cứu", "ngải diệp", "canh ngải cứu"],
    verdict: "unclear",
    folk: [{ text: "Đông y, Ấn Độ, châu Âu dùng ngải cứu cho bệnh tiêu hoá và phụ khoa; nay được quảng bá cho đau bụng kinh, lo âu, mất ngủ, huyết áp cao.", src: [0] }],
    science: [{ text: "Rất ít nghiên cứu trên người — chưa đủ bằng chứng ngải cứu giúp được bệnh nào.", src: [0] }],
    caution: [
      { text: "KHÔNG dùng ngải cứu khi đang mang thai.", src: [0] },
      { text: "Cho con bú: chưa rõ có an toàn. Uống hay bôi đều chưa đủ bằng chứng về độ an toàn; đang dùng thuốc thì hỏi bác sĩ trước.", src: [0] },
    ],
    topics: [
      { id: "dau-bung-kinh", text: "được quảng bá cho đau bụng kinh nhưng chưa đủ bằng chứng; KHÔNG dùng khi mang thai", src: [0], v: "unclear" },
      { id: "mat-ngu", text: "chưa đủ bằng chứng giúp ngủ; không dùng khi mang thai", src: [0], v: "unclear" },
    ],
    sources: [nccih("mugwort", "Mugwort", "04/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "la-dau-tam",
    name: "Lá dâu tằm",
    names: ["lá dâu tằm", "trà lá dâu", "lá dâu", "tang diệp"],
    verdict: "unclear",
    folk: [{ text: "Đông y dùng lá dâu tằm cho tiểu đường, ho, đau họng, sốt, viêm phế quản; nay bán như thực phẩm chức năng giảm cân, hạ đường huyết.", src: [0] }],
    science: [{ text: "Nghiên cứu còn ít: vài nghiên cứu cho thấy có thể hạ đường huyết, các nghiên cứu khác không thấy tác dụng.", src: [0] }],
    caution: [
      { text: "Có thể gây đầy bụng, đầy hơi, táo bón hoặc phân lỏng.", src: [0] },
      { text: "Dùng chung thuốc tiểu đường có thể làm đường huyết tụt quá thấp. Mang thai, cho con bú: chưa rõ an toàn.", src: [0] },
    ],
    topics: [{ id: "tieu-duong-type-2", text: "có thể hạ đường huyết nhưng kết quả không thống nhất; dùng chung thuốc tiểu đường dễ tụt đường huyết", src: [0] }],
    sources: [nccih("white-mulberry-leaf", "White Mulberry Leaf", "09/2023")],
    verifiedAt: VERIFIED,
  },
  {
    id: "trai-nhau",
    name: "Trái nhàu",
    names: ["trái nhàu", "quả nhàu", "nước nhàu", "rượu nhàu", "trà nhàu", "noni"],
    verdict: "unclear",
    folk: [{ text: "Nhàu mọc ở Đông Nam Á, Thái Bình Dương; dân gian dùng cho cảm, sốt, nhiễm trùng, bệnh tiêu hoá; nay bán như thực phẩm chức năng.", src: [0] }],
    science: [{ text: "Nghiên cứu trên người chưa cho thấy nhàu có lợi cho bệnh nào (tác dụng chỉ thấy ở phòng thí nghiệm).", src: [0] }],
    caution: [
      { text: "Đã có ca tổn thương gan ở người uống nước / trà nhàu vài tuần (chưa rõ có phải do nhàu).", src: [0] },
      { text: "Nhàu nhiều kali — người bệnh thận, phải hạn chế kali hỏi bác sĩ trước; có thể không an toàn khi dùng chung thuốc làm tăng kali, hạ huyết áp, hại gan.", src: [0] },
    ],
    topics: [],
    sources: [nccih("noni", "Noni", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "son-tra",
    name: "Sơn tra",
    names: ["sơn tra", "hawthorn"],
    verdict: "unclear",
    folk: [{ text: "Sơn tra được dùng cho bệnh tim, tiêu hoá, tuần hoàn, thận, bàng quang; nay quảng bá cho tim mạch, giảm cân, lo âu.", src: [0] }],
    science: [{ text: "Suy tim: kết quả mâu thuẫn. Bệnh tim, đau thắt ngực, loạn nhịp: chưa đủ bằng chứng. Giảm cân: không có bằng chứng.", src: [0] }],
    caution: [
      { text: "Một nghiên cứu thấy một chế phẩm sơn tra liên quan suy tim tiến triển sớm ở vài người bệnh (có thể do tương tác thuốc tim).", src: [0] },
      { text: "Có thể gây chóng mặt, buồn nôn, nôn, tiêu chảy, đau cơ; chưa có nghiên cứu dùng quá 16 tuần.", src: [0] },
    ],
    topics: [{ id: "suy-tim", text: "kết quả mâu thuẫn, có nghiên cứu thấy suy tim nặng lên — đang uống thuốc tim thì hỏi bác sĩ trước", src: [0], v: "risky" }],
    sources: [nccih("hawthorn", "Hawthorn", "04/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "ke-sua",
    name: "Cây kế sữa (silymarin)",
    names: ["kế sữa", "cây kế sữa", "silymarin", "milk thistle"],
    verdict: "unclear",
    folk: [{ text: "Từ xưa dùng cho bệnh gan và lợi sữa; nay là thành phần hay gặp trong sản phẩm \"bổ gan, giải độc gan\".", src: [0] }],
    science: [
      { text: "Thử nghiệm cho bệnh gan mâu thuẫn hoặc quá ít; hai nghiên cứu lớn tại Mỹ (viêm gan C, gan nhiễm mỡ NASH) không thấy silymarin có lợi.", src: [0] },
      { text: "Vài nghiên cứu nhỏ: có thể giúp kiểm soát đường huyết ở tiểu đường type 2. Lợi sữa: chưa rõ.", src: [0] },
    ],
    caution: [
      { text: "Thường dễ dung nạp; có thể đầy bụng, buồn nôn, đầy hơi. Có thể dị ứng (nhất là người dị ứng hoa cúc, cúc vạn thọ).", src: [0] },
      { text: "Một số sản phẩm sai hàm lượng so với nhãn, hoặc nhiễm thuốc trừ sâu, vi sinh, độc tố nấm.", src: [0] },
    ],
    topics: [
      { id: "gan-nhiem-mo", text: "nghiên cứu lớn không thấy silymarin giúp gan nhiễm mỡ", src: [0], v: "unclear" },
      { id: "viem-gan-c", text: "nghiên cứu không thấy silymarin có lợi cho viêm gan C", src: [0], v: "unclear" },
      { id: "men-gan-cao", text: "thử nghiệm cho bệnh gan mâu thuẫn hoặc quá ít để kết luận", src: [0], v: "unclear" },
    ],
    sources: [nccih("milk-thistle", "Milk Thistle", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "co-ca-ri",
    name: "Hạt cỏ cà ri (hồ lô ba)",
    names: ["cỏ cà ri", "hạt cỏ cà ri", "hồ lô ba", "methi", "fenugreek"],
    verdict: "unclear",
    folk: [{ text: "Đã được dùng khoảng 6.000 năm, nổi tiếng là \"lợi sữa\"; nay hạt được quảng bá cho tiểu đường, đau bụng kinh.", src: [0] }],
    science: [{ text: "Lợi sữa: kết quả lẫn lộn, chưa chắc tăng sữa. Hạ đường huyết: có thể, nhưng nghiên cứu chất lượng thấp. Đau bụng kinh: chưa rõ.", src: [0] }],
    caution: [
      { text: "KHÔNG dùng khi mang thai với lượng hơn mức trong thức ăn — liên quan tăng nguy cơ dị tật thai.", src: [0] },
      { text: "Có thể dị ứng, kể cả nặng; liều lớn có thể làm tụt đường huyết; có thể tiêu chảy, buồn nôn.", src: [0] },
    ],
    topics: [{ id: "an-uong-khi-cho-con-bu", text: "\"lợi sữa\" nhưng kết quả lẫn lộn, chưa chắc tăng sữa", src: [0], v: "unclear" }],
    sources: [nccih("fenugreek", "Fenugreek", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "hoang-ky",
    name: "Hoàng kỳ",
    names: ["hoàng kỳ", "astragalus"],
    verdict: "unclear",
    folk: [{ text: "Vị thuốc bắc dùng hàng trăm năm, hay phối với vị khác; được quảng bá cho cảm, dị ứng, hen, mệt mỏi, bệnh thận, tiểu đường, \"tăng miễn dịch\".", src: [0] }],
    science: [{ text: "Chưa đủ bằng chứng khoa học đáng tin là giúp được bệnh nào; vài tổng quan thấy cải thiện chỉ số nhưng nghiên cứu chất lượng thấp.", src: [0] }],
    caution: [
      { text: "Người bệnh tự miễn nên tránh (có thể nặng thêm); có thể tương tác thuốc ức chế miễn dịch.", src: [0] },
      { text: "Mang thai: nghiên cứu động vật cho thấy có thể độc cho thai.", src: [0] },
    ],
    topics: [],
    sources: [nccih("astragalus", "Astragalus", "05/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "ma-hoang",
    name: "Ma hoàng",
    names: ["ma hoàng", "ephedra", "ma huang"],
    verdict: "danger",
    folk: [{ text: "Được dùng lâu đời ở Trung Quốc, Ấn Độ cho cảm, sốt, đau đầu, nghẹt mũi, ho, khò khè.", src: [0] }],
    science: [{ text: "Hoa Kỳ (FDA) đã CẤM thực phẩm chức năng chứa alkaloid của ma hoàng từ năm 2004 — lợi ích giảm cân ngắn hạn không bù được rủi ro.", src: [0] }],
    caution: [
      { text: "Kể cả liều thấp, dùng ngắn ngày vẫn liên quan tăng huyết áp, nhồi máu cơ tim, đột quỵ, co giật, loạn thần — có thể đe doạ tính mạng.", src: [0] },
      { text: "Không an toàn cho bà bầu, mẹ cho con bú, trẻ em; người bệnh tim mạch nguy cơ càng cao.", src: [0] },
    ],
    topics: [],
    sources: [nccih("ephedra", "Ephedra", "11/2024")],
    verifiedAt: VERIFIED,
  },
  {
    id: "loi-cong-dang",
    name: "Lôi công đằng",
    names: ["lôi công đằng", "thunder god vine", "tripterygium"],
    verdict: "risky",
    folk: [{ text: "Đông y dùng cho viêm, sốt, các bệnh viêm và tự miễn.", src: [0] }],
    science: [{ text: "Có thể giảm sưng, đau khớp trong viêm khớp dạng thấp khi dùng thêm với điều trị chuẩn (nghiên cứu chất lượng thấp–vừa).", src: [0] }],
    caution: [
      { text: "Có thể gây tổn thương thận, gan; đã có ca tử vong hiếm gặp. Thành phần triptolide có thể độc với người.", src: [0] },
      { text: "Hay gặp: rối loạn tiêu hoá, đau đầu, chóng mặt, giảm bạch cầu, rối loạn kinh nguyệt. Mang thai: không an toàn (tăng nguy cơ dị tật).", src: [0] },
    ],
    topics: [{ id: "viem-khop-dang-thap", text: "có thể đỡ sưng đau khi dùng thêm điều trị chuẩn, nhưng có độc tính gan, thận — chỉ dùng khi bác sĩ đồng ý", src: [0], v: "risky" }],
    sources: [nccih("thunder-god-vine", "Thunder God Vine", "04/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "tram-tra",
    name: "Tinh dầu tràm trà (tea tree)",
    names: ["tinh dầu tràm trà", "tràm trà", "tea tree", "dầu tràm trà"],
    verdict: "mixed",
    folk: [{ text: "Thổ dân Úc dùng lá cây cho vết thương, bỏng, côn trùng cắn; nay được quảng bá bôi cho mụn, nấm chân, nấm móng, chấy.", src: [0] }],
    science: [{ text: "Mụn: bằng chứng hạn chế là có thể giúp. Nấm chân: có thể giúp nhưng kém thuốc chuẩn. Nấm móng, chấy: chưa đủ nghiên cứu.", src: [0] }],
    caution: [
      { text: "TUYỆT ĐỐI không nuốt — uống có thể gây lú lẫn, đi đứng loạng choạng, hôn mê.", src: [0] },
      { text: "Bôi có thể đỏ, kích ứng da (hay gặp hơn với dầu để lâu, để nơi nóng / có ánh sáng).", src: [0] },
    ],
    topics: [
      { id: "mun-trung-ca", text: "bôi có thể giúp (bằng chứng hạn chế); tuyệt đối không nuốt", src: [0], v: "mixed" },
      { id: "nam-chan", text: "có thể giúp nhưng kém thuốc trị nấm chuẩn", src: [0] },
    ],
    sources: [nccih("tea-tree-oil", "Tea Tree Oil", "04/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "nam-viet-quat",
    name: "Nam việt quất (cranberry)",
    names: ["nam việt quất", "cranberry", "nước ép nam việt quất"],
    verdict: "mixed",
    folk: [{ text: "Được dùng cho bệnh bàng quang, dạ dày, gan, vết thương; nay chủ yếu được quảng bá để phòng nhiễm trùng đường tiểu tái phát.", src: [0] }],
    science: [{ text: "Có thể giảm khoảng 25% nguy cơ nhiễm trùng tiểu tái phát ở một số phụ nữ, nhưng kết quả không thống nhất; KHÔNG dùng để chữa nhiễm trùng tiểu đang mắc.", src: [0] }],
    caution: [
      { text: "Nghi nhiễm trùng tiểu thì đi khám — nam việt quất không thay được điều trị.", src: [0] },
      { text: "Dùng rất nhiều có thể đau bụng, tiêu chảy (nhất là trẻ nhỏ). Đang dùng warfarin thì hỏi bác sĩ trước.", src: [0] },
    ],
    topics: [{ id: "nhiem-trung-duong-tiet-nieu", text: "có thể giúp PHÒNG tái phát ở một số phụ nữ; không chữa được nhiễm trùng đang mắc", src: [0], v: "mixed" }],
    sources: [nccih("cranberry", "Cranberry", "11/2024")],
    verifiedAt: VERIFIED,
  },
  {
    id: "ha-thu-o",
    name: "Hà thủ ô",
    names: ["hà thủ ô", "hà thủ ô đỏ", "he shou wu", "fo ti", "polygonum multiflorum"],
    verdict: "danger",
    folk: [{ text: "Đông y dùng cho đau lưng, chóng mặt, tóc bạc sớm, táo bón, bệnh gan — dạng viên, trà, kem bôi.", src: [0] }],
    science: [{ text: "Lợi ích chưa được chứng minh trong thử nghiệm có đối chứng.", src: [0] }],
    caution: [
      { text: "Là nguyên nhân gây tổn thương gan cấp ĐÃ ĐƯỢC XÁC LẬP RÕ — ở Trung Quốc là nguyên nhân hay gặp nhất trong tổn thương gan do thảo dược.", src: [0] },
      { text: "Triệu chứng (như viêm gan cấp) có thể xuất hiện từ vài ngày đến khoảng 6 tháng sau khi dùng; tới 10% ca rõ rệt đã tử vong hoặc phải ghép gan khẩn.", src: [0] },
      { text: "Đã từng bị thì không dùng lại — tổn thương có thể tái phát nhanh hơn.", src: [0] },
    ],
    topics: [
      { id: "rung-toc", text: "dân gian dùng cho tóc bạc, rụng tóc — chưa chứng minh, mà nguy cơ hại gan đã rõ", src: [0], v: "danger" },
      { id: "men-gan-cao", text: "KHÔNG dùng — hà thủ ô là nguyên nhân tổn thương gan đã được xác lập", src: [0], v: "danger" },
    ],
    sources: [{ title: "Polygonum Multiflorum — LiverTox (cập nhật 18/08/2020)", publisher: "LiverTox (Thư viện Y khoa Quốc gia Hoa Kỳ – NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK548795/" }],
    verifiedAt: VERIFIED,
  },
  {
    id: "linh-chi",
    name: "Nấm linh chi",
    names: ["nấm linh chi", "linh chi", "reishi", "ganoderma", "trà linh chi"],
    verdict: "unclear",
    folk: [{ text: "Đông Á dùng linh chi từ lâu với niềm tin \"kéo dài tuổi thọ, chống lão hoá, tăng sinh lực\"; ở Trung Quốc dùng hỗ trợ miễn dịch cho người đang hoá trị, xạ trị.", src: [0] }],
    science: [{ text: "Vài nghiên cứu nhỏ ở bệnh nhân ung thư phổi thấy chỉ số miễn dịch thay đổi ở một số người. FDA chưa duyệt linh chi để chữa ung thư hay bệnh nào.", src: [0] }],
    caution: [
      { text: "Chất lượng khác nhau giữa các lô, các hãng; trao đổi với bác sĩ điều trị trước vì thảo dược có thể ảnh hưởng điều trị chuẩn.", src: [0] },
    ],
    topics: [
      { id: "ung-thu", text: "nghiên cứu nhỏ, chưa được duyệt để chữa ung thư — báo bác sĩ điều trị trước khi dùng", src: [0], v: "unclear" },
      { id: "hoa-tri", text: "đang hoá trị thì báo bác sĩ trước — thảo dược có thể ảnh hưởng điều trị", src: [0], v: "unclear" },
    ],
    sources: [{ title: "Medicinal Mushrooms (PDQ®) – Patient Version (cập nhật 11/07/2024)", publisher: "Viện Ung thư Quốc gia Hoa Kỳ (NCI)", url: "https://www.cancer.gov/about-cancer/treatment/cam/patient/mushrooms-pdq" }],
    verifiedAt: VERIFIED,
  },
  {
    id: "thit-coc",
    name: "Cháo cóc / thịt cóc",
    names: ["cháo cóc", "thịt cóc", "ruốc cóc", "chà bông cóc", "trứng cóc", "gan cóc", "bột cóc", "con cóc", "cóc tía", "nấu cóc", "ăn thịt cóc", "ăn cóc", "cóc ăn", "cóc nướng", "món cóc", "cóc chiên", "cóc xào"], // 30/10 (nhật ký bí): "Cóc ăn đc k?" trước bị hỏi lại "chuyện gì vậy"
    verdict: "danger",
    folk: [{ text: "Dân gian cho trẻ ăn thịt cóc (cháo cóc, ruốc cóc) để chữa suy dinh dưỡng vì giàu đạm, kẽm — cơ quan Bộ Y tế cảnh báo đây là nguy cơ nghiêm trọng.", src: [0] }],
    science: [
      { text: "Độc tố cóc (bufotoxin) có ở da, tuyến sau tai, gan, trứng — ở mọi giai đoạn từ trứng, nòng nọc đến cóc trưởng thành; thịt dễ nhiễm khi nhựa, gan, mật dập vào.", src: [0, 1] },
      { text: "Nấu chín KHÔNG làm mất độc — độc tố cóc không bị phân huỷ ở nhiệt độ sôi.", src: [0, 1] },
      { text: "Ngộ độc thường sau 1–2 giờ: nôn, đau bụng, tiêu chảy, chóng mặt, tê, co giật, ảo giác, loạn nhịp tim — nặng có thể tử vong trong vài giờ.", src: [0, 1] },
      { text: "Năm 2022 ở Quảng Trị, hai trẻ (8 tuổi và 22 tháng tuổi) đã tử vong vì ngộ độc cóc.", src: [0] },
    ],
    caution: [
      { text: "Không nên ăn thịt cóc — có nhiều nguồn dinh dưỡng khác thay thế.", src: [1] },
      { text: "Tuyệt đối không ăn trứng, gan, mật cóc, nhất là cóc tía (mắt đỏ).", src: [1] },
      { text: "Ai đã ăn cóc mà thấy buồn nôn, chóng mặt, tê, tim đập bất thường → đưa ngay đến cơ sở cấp cứu (gọi 115) và báo là đã ăn cóc.", src: [0, 1] },
    ],
    topics: [{ id: "suy-dinh-duong", text: "KHÔNG cho trẻ ăn cháo cóc — độc tố cóc không mất khi nấu chín, đã có trẻ tử vong", src: [0, 1], v: "danger" }],
    sources: [
      { title: "Phòng ngừa ngộ độc do độc tố cóc (cập nhật 07/12/2023)", publisher: "Viện Kiểm nghiệm ATVSTP Quốc gia (Bộ Y tế)", url: "https://nifc.gov.vn/ky-thuat-chuyen-mon/phong-ngua-ngo-doc-do-doc-to-coc-post2054.html" },
      { title: "Hướng dẫn phòng chống ngộ độc do độc tố của cóc (22/12/2025)", publisher: "Viện Dinh dưỡng Quốc gia (Bộ Y tế)", url: "https://viendinhduong.vn/vi/article/tin-tuc/6953557457979512cd081d23" },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: "boi-bong",
    name: "Bôi kem, dầu, mỡ lên vết bỏng",
    names: ["kem đánh răng", "nước mắm", "mỡ trăn", "lòng trắng trứng", "dầu ăn", "bơ", "dầu gió", "dầu dừa", "đắp lá"],
    verdict: "danger",
    folk: [{ text: "Nhiều nhà có thói quen bôi kem đánh răng, nước mắm, mỡ, dầu… lên vết bỏng cho \"mát\".", src: [0] }],
    science: [{ text: "NHS dặn KHÔNG bôi bất kỳ loại kem, dầu hay bơ nào lên vết bỏng; không dán băng keo dính, không chọc vỡ bóng nước.", src: [0] }],
    how: [{ text: "Sơ cứu đúng: xả dưới vòi nước mát 20 phút, càng sớm càng tốt (trong vòng 3 giờ); tháo nhẫn, đồ trang sức gần đó; rồi phủ nhẹ màng bọc thực phẩm.", src: [0] }],
    caution: [{ text: "Đi cấp cứu nếu bỏng rộng hoặc sâu, ở mặt, bộ phận sinh dục, mông, hoặc do hoá chất, axit, điện.", src: [0] }],
    topics: [{ id: "so-cuu-bong", text: "đừng bôi kem đánh răng, nước mắm, dầu, mỡ — xả nước mát 20 phút mới là sơ cứu đúng", src: [0], v: "danger" }],
    sources: [NHS_BURN],
    verifiedAt: VERIFIED,
  },
  // ── 20/10 (đợt 2): thêm vị thuốc / thực phẩm hay dùng ──
  {
    id: "kho-qua",
    name: "Khổ qua (mướp đắng)",
    names: ["khổ qua", "mướp đắng", "trà khổ qua", "canh khổ qua", "khổ qua rừng", "nước khổ qua", "bitter melon"],
    verdict: "unclear",
    folk: [{ text: "Dân gian xem khổ qua là món \"mát\", hay dùng cho táo bón, khó tiêu, bệnh ngoài da; nay được bán như thực phẩm chức năng hạ đường huyết cho tiểu đường type 2.", src: [0] }],
    science: [
      { text: "Thử nghiệm ở người tiểu đường: chỉ hạ đường huyết ở mức khiêm tốn, gần như không đổi đường huyết lúc đói và HbA1c; so với metformin thì metformin hạ đường còn khổ qua không.", src: [0] },
      { text: "Tác dụng kháng virus, chống ung thư được quảng cáo chưa được chứng minh trên người; FDA chưa duyệt khổ qua cho bệnh nào.", src: [0] },
    ],
    caution: [
      { text: "Có thể khó chịu bụng, ợ nóng, tiêu chảy hoặc táo bón, buồn nôn, chóng mặt, đau đầu; hiếm nhưng nặng: hạ đường huyết nặng, hôn mê, co giật.", src: [0] },
      { text: "Khổ qua có thể gây sảy thai — không nên dùng (dạng thuốc, chiết xuất) khi mang thai.", src: [0] },
      { text: "Người tiểu đường đang dùng thuốc hỏi bác sĩ trước khi dùng khổ qua như thuốc, vì khổ qua có thể gây hạ đường huyết.", src: [0] },
    ],
    unverified: ["khổ qua (họ bầu bí, mướp) làm nhức xương khớp"],
    topics: [{ id: "tieu-duong-type-2", text: "chỉ hạ đường huyết nhẹ, kém metformin — không thay được thuốc; bà bầu không dùng", src: [0], v: "unclear" }],
    sources: [LIVERTOX_BM],
    verifiedAt: VERIFIED,
  },
  {
    id: "bach-qua",
    name: "Bạch quả (ginkgo)",
    names: ["bạch quả", "ginkgo", "hạt bạch quả", "lá bạch quả", "hoạt huyết dưỡng não"],
    verdict: "unclear",
    folk: [{ text: "Đông y dùng bạch quả lâu đời cho ho, tiêu chảy; nay chiết xuất lá được bán cho trí nhớ, \"bổ não\", ù tai, tuần hoàn.", src: [0] }],
    science: [
      { text: "Ba nghiên cứu lớn ở người cao tuổi (một nghiên cứu hơn 3.000 người) cho thấy chiết xuất bạch quả KHÔNG làm giảm nguy cơ sa sút trí tuệ.", src: [0] },
      { text: "Không giúp phòng bệnh tim, hạ huyết áp, chữa ù tai. Người khoẻ dùng có tăng trí nhớ không: chưa chắc.", src: [0] },
    ],
    caution: [
      { text: "Hạt tươi ăn vào có độc; hạt rang, cây thô cũng từng gây tác dụng nặng.", src: [0] },
      { text: "Có thể tăng nguy cơ chảy máu, nhất là khi dùng chung thuốc chống đông như warfarin. Hay gặp: chóng mặt, rối loạn tiêu hoá, đau đầu.", src: [0] },
      { text: "Mang thai: có thể không an toàn (sinh non, chảy máu nhiều khi sinh).", src: [0] },
    ],
    topics: [
      { id: "sa-sut-tri-tue", text: "nghiên cứu lớn cho thấy KHÔNG làm giảm nguy cơ sa sút trí tuệ; dễ chảy máu khi dùng chung thuốc chống đông", src: [0], v: "unclear" },
      { id: "u-tai", text: "nghiên cứu cho thấy bạch quả không giúp ù tai", src: [0], v: "unclear" },
    ],
    sources: [nccih("ginkgo", "Ginkgo", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "bo-cong-anh",
    name: "Bồ công anh",
    names: ["bồ công anh", "trà bồ công anh", "dandelion"],
    verdict: "unclear",
    folk: [{ text: "Hoa, lá, rễ bồ công anh được dùng trong y học dân gian; nay được quảng bá uống cho khó tiêu, uống hoặc bôi cho đau khớp.", src: [0] }],
    science: [{ text: "Rất ít nghiên cứu trên người — không có bằng chứng khoa học thuyết phục bồ công anh giúp được bệnh nào.", src: [0] }],
    caution: [
      { text: "Lượng như thức ăn có lẽ an toàn; dùng nhiều hơn thì ít được nghiên cứu. Có thể dị ứng (nhất là người bị chàm khi bôi).", src: [0] },
      { text: "Có thể tương tác với thuốc tiểu đường, thuốc chống đông, thuốc lợi tiểu — hỏi bác sĩ trước.", src: [0] },
    ],
    topics: [],
    sources: [nccih("dandelion", "Dandelion", "11/2024")],
    verifiedAt: VERIFIED,
  },
  {
    id: "dau-nanh",
    name: "Đậu nành / mầm đậu nành",
    names: ["mầm đậu nành", "tinh chất mầm đậu nành", "isoflavone", "đậu nành", "sữa đậu nành", "đậu hũ"],
    verdict: "mixed",
    folk: [{ text: "Đậu nành (đậu hũ, sữa đậu nành) và viên mầm đậu nành / isoflavone được quảng bá cho tiền mãn kinh, mỡ máu, huyết áp, tiểu đường.", src: [0] }],
    science: [
      { text: "Bốc hoả tiền mãn kinh: isoflavone hoặc đạm đậu nành có thể giảm số lần và mức độ, nhưng tác dụng nhỏ và không đồng đều.", src: [0] },
      { text: "Thay đạm khác bằng đạm đậu nành có thể hạ nhẹ cholesterol; isoflavone có lẽ có lợi cho mật độ xương sau mãn kinh.", src: [0] },
    ],
    caution: [
      { text: "Có thể đầy bụng, táo bón, tiêu chảy, buồn nôn; có người dị ứng đậu nành.", src: [0] },
      { text: "Mang thai: dùng nhiều hơn lượng trong thức ăn có thể không an toàn.", src: [0] },
      { text: "Đậu hũ, nước tương (nhiều tyramine) dùng chung thuốc chống trầm cảm nhóm MAOI từng gây tăng huyết áp nguy hiểm.", src: [0] },
    ],
    topics: [
      { id: "man-kinh", text: "isoflavone / đạm đậu nành có thể giảm bốc hoả chút ít (tác dụng nhỏ, không đồng đều)", src: [0], v: "mixed" },
      { id: "mo-mau-cao", text: "thay đạm khác bằng đạm đậu nành có thể hạ nhẹ cholesterol", src: [0], v: "help" },
    ],
    sources: [nccih("soy", "Soy", "04/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "oai-huong",
    name: "Oải hương (lavender)",
    names: ["oải hương", "tinh dầu oải hương", "lavender"],
    verdict: "unclear",
    folk: [{ text: "Oải hương dùng lâu đời trong xông tinh dầu, tắm, nước hoa; nay được quảng bá uống cho lo âu, căng thẳng, và xông cho dễ ngủ.", src: [0] }],
    science: [
      { text: "Lo âu: một chế phẩm dầu oải hương dạng uống có thể giúp, nhưng nghiên cứu nhỏ, ít kiểm chứng độc lập.", src: [0] },
      { text: "Xông tinh dầu cho giấc ngủ, mất ngủ: chưa rõ có tác dụng.", src: [0] },
    ],
    caution: [
      { text: "Uống có thể gây tiêu chảy, đau đầu, buồn nôn, ợ hơi; xông có thể đau đầu, ho; bôi có thể dị ứng da.", src: [0] },
      { text: "Có thể tương tác với thuốc an thần (lưu ý trước phẫu thuật). Mang thai, cho con bú: chưa rõ an toàn.", src: [0] },
    ],
    topics: [
      { id: "mat-ngu", text: "xông tinh dầu oải hương chưa rõ có giúp ngủ", src: [0], v: "unclear" },
      { id: "lo-au", text: "dạng uống có thể giúp lo âu (nghiên cứu nhỏ); có thể tương tác thuốc an thần", src: [0], v: "mixed" },
    ],
    sources: [nccih("lavender", "Lavender", "02/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "nu-lang",
    name: "Nữ lang (valerian)",
    names: ["nữ lang", "valerian", "rễ nữ lang"],
    verdict: "unclear",
    folk: [{ text: "Rễ nữ lang dùng từ thời Hy Lạp, La Mã cho mất ngủ, đau nửa đầu, mệt mỏi; nay hay có trong viên \"ngủ ngon\" thảo dược.", src: [0] }],
    science: [{ text: "Mất ngủ: bằng chứng không thống nhất — hướng dẫn của Viện Hàn lâm Y học Giấc ngủ Hoa Kỳ (2017) khuyên KHÔNG dùng cho mất ngủ mạn ở người lớn.", src: [0] }],
    caution: [
      { text: "Có thể đau đầu, rối loạn tiêu hoá, đầu óc lờ đờ, bồn chồn, mơ nhiều; dùng lâu rồi ngưng đột ngột có thể bị triệu chứng cai.", src: [0] },
      { text: "Không dùng chung thuốc an thần, rượu. Hiếm: tổn thương gan (thường khi phối nhiều thảo dược). Mang thai, cho con bú: chưa rõ an toàn.", src: [0] },
    ],
    topics: [{ id: "mat-ngu", text: "hướng dẫn chuyên ngành khuyên không dùng cho mất ngủ mạn; không uống chung rượu, thuốc an thần", src: [0], v: "unclear" }],
    sources: [nccih("valerian", "Valerian", "05/2025")],
    verifiedAt: VERIFIED,
  },
  {
    id: "garcinia",
    name: "Garcinia cambogia (viên giảm cân)",
    names: ["garcinia", "garcinia cambogia", "hca", "hydroxycitric"],
    verdict: "risky",
    folk: [{ text: "Vỏ quả garcinia có HCA, được bán trong nhiều viên \"giảm cân thảo dược\" để giảm thèm ăn.", src: [0] }],
    science: [{ text: "Chưa rõ có giúp giảm cân không — có nghiên cứu thấy tác dụng khiêm tốn, có nghiên cứu không thấy gì.", src: [0] }],
    caution: [
      { text: "Đã có nhiều báo cáo tổn thương gan, có ca nặng — sản phẩm có garcinia (kể cả loại phối nhiều thành phần) có thể không an toàn.", src: [0] },
      { text: "Có thể đau đầu, buồn nôn, tiêu chảy; tương tác với một số thuốc ảnh hưởng gan, serotonin.", src: [0] },
    ],
    topics: [{ id: "beo-phi", text: "viên giảm cân có garcinia: chưa rõ tác dụng, đã có ca tổn thương gan", src: [0], v: "risky" }],
    sources: [nccih("garcinia-cambogia", "Garcinia Cambogia", "02/2025")],
    verifiedAt: VERIFIED,
  },
  // ── 20/10 (đợt 2): QUAN NIỆM / THÓI QUEN DÂN GIAN khi ốm — nguồn y khoa nói gì ──
  {
    id: "kieng-dau-khop",
    name: "Đau khớp kiêng măng, đồ \"nhức\"",
    names: ["măng", "đồ nhức", "món nhức", "ăn nhức", "đồ ăn nhức", "thịt vịt", "kiêng nhức", "mướp", "bí", "đồ chua", "khổ qua", "mướp đắng", "bị nhức"],
    ctx: VN(/\b(khớp|gout|gút|thấp khớp|nhức xương|nhức mỏi|xương khớp|thoái hoá|đau lưng|gai cột sống)\b/),
    verdict: "myth",
    belief: "Người đau khớp hay được dặn kiêng măng, khổ qua, mướp, bí, thịt vịt, đồ chua… vì sợ \"nhức\".",
    folk: [],
    science: [
      { text: "NHS không nêu món cụ thể nào phải kiêng với thoái hoá khớp hay viêm khớp dạng thấp — chỉ khuyên ăn uống lành mạnh, vận động, giữ cân nặng (cân dư làm khớp chịu tải nhiều hơn).", src: [0, 1] },
      { text: "Với gout, NHS khuyên hạn chế rượu bia, có ngày không uống, tránh nhiều đồ ăn / uống ngọt và bữa quá no — không nhắc tới măng.", src: [2] },
    ],
    how: [{ text: "Muốn dùng thực phẩm chức năng, thuốc bổ khớp thì hỏi đội ngũ điều trị trước — có thể ảnh hưởng thuốc đang dùng.", src: [0, 1] }],
    caution: [{ text: "Gout: bác sĩ có thể đưa danh sách món nên ăn / hạn chế riêng cho bạn.", src: [2] }],
    unverified: ["măng, khổ qua, mướp, bí, thịt vịt, đồ chua làm nặng đau khớp"],
    topics: [
      { id: "thoai-hoa-khop", text: "chưa thấy nguồn nói măng, đồ \"nhức\" làm nặng bệnh; NHS chỉ khuyên ăn lành mạnh, giữ cân, vận động", src: [0], v: "myth" },
      { id: "viem-khop-dang-thap", text: "nguồn y khoa không nêu món phải kiêng; ăn lành mạnh, vận động, giữ cân", src: [1], v: "myth" },
    ],
    sources: [NHS_OA, NHS_RA, NHS_GOUT],
    verifiedAt: VERIFIED,
  },
  // 30/10 (Kir: "mới mổ hay có vết thương thì k ăn bò — sẹo lồi, thâm sẹo, hay là rau muống, gà thì ngứa, cua thì lồi sẹo… nghệ thì bôi lên ngừa
  //   sẹo"; ảnh chụp: "Mới mổ ruột thừa ăn bò đc k?" → "chưa xác minh được"). Đối chiếu: NHS (sẹo lồi), các bệnh viện NHS (ăn uống giúp lành
  //   vết thương) — nguồn KHÔNG nêu món ăn nào gây sẹo lồi / sẹo thâm, và khuyên NÊN ăn đủ đạm (thịt đỏ, gà, cá, hải sản, trứng…).
  {
    id: "kieng-an-vet-thuong",
    name: "Có vết thương / mới mổ: kiêng bò, rau muống, gà, trứng, hải sản, đồ nếp?",
    names: ["thịt bò", "bò", "rau muống", "thịt gà", "gà", "trứng", "trứng gà", "lòng trắng trứng", "hải sản", "cua", "tôm", "ghẹ", "ốc", "mực", "cá", "đồ tanh", "đồ nếp", "xôi", "nếp", "gạo nếp", "thịt vịt", "vịt", "đồ biển", "thịt heo", "thịt lợn", "xì dầu", "nước tương", "tàu vị yểu", "cà phê", "đồ sẫm màu", "đồ màu đen", "rau lang", "đồ chua", "đồ cay"],
    ctx: VN(/\b(vết thương|vết mổ|vết khâu|mới mổ|vừa mổ|sau mổ|sau khi mổ|đi mổ|bị mổ|mổ|phẫu thuật|sinh mổ|đẻ mổ|đứt tay|đứt chân|trầy|xước|khâu|may (vết|mũi)|lên da non|da non|sẹo|sẹo lồi|sẹo thâm|thâm sẹo|lồi sẹo|xăm|bấm khuyên|xỏ khuyên|cắt mí|nâng mũi|hút mỡ|té xe|ngã xe)\b/),
    verdict: "myth",
    belief: "Có vết thương hay mới mổ thì kiêng thịt bò (sợ sẹo thâm), rau muống (sợ sẹo lồi), thịt gà (sợ ngứa), trứng (sợ sẹo trắng / lồi), cua, tôm, hải sản (sợ lồi sẹo), đồ nếp (sợ mưng mủ); xì dầu / nước tương, cà phê, đồ sẫm màu (sợ sẹo đen, thâm).",
    folk: [],
    science: [
      { text: "NHS: sẹo lồi do cơ thể tạo quá nhiều collagen khi vết thương lành; hay gặp ở người gốc Á, Phi, tuổi 10–30, người từng bị sẹo lồi; hay ở ngực, vai, cằm, cổ, tai — nguồn **không nhắc món ăn nào** gây sẹo lồi.", src: [0] },
      { text: "Hướng dẫn ăn uống giúp lành vết thương của bệnh viện: **ăn đủ đạm ở mỗi bữa** — thịt (cả thịt đỏ), gà, cá, hải sản, trứng, sữa, đậu… chính là những món hay bị kiêng.", src: [1, 2] },
      { text: "Vết thương làm cơ thể cần nhiều đạm, vitamin, khoáng hơn; ăn uống đủ chất giúp hệ miễn dịch chống nhiễm trùng và có thể giúp vết thương mau lành.", src: [1] },
      { text: "Về màu sẹo, nguồn dặn **che nắng** (sẹo mới rất dễ cháy nắng): che sẹo hoặc bôi kem chống nắng SPF 30+ ít nhất 1 năm — không nhắc xì dầu, cà phê hay đồ ăn sẫm màu.", src: [3, 4] },
    ],
    how: [
      { text: "Ăn đa dạng, có món giàu đạm ở mỗi bữa; ăn rau trái mỗi ngày; uống đủ nước (trừ khi bác sĩ dặn hạn chế).", src: [1] },
      { text: "Ăn kém thì chia nhiều bữa nhỏ, thêm bữa phụ (sữa chua, trứng, đậu, hạt); đừng ăn kiêng giảm cân khi vết thương chưa lành.", src: [1] },
      { text: "Chăm sẹo: chỉ xoa bóp với kem dưỡng khi vết thương **đã lành hẳn**; che nắng hoặc bôi kem chống nắng SPF 30+ trên sẹo ít nhất 1 năm; sẹo có thể mất khoảng 2 năm mới mờ.", src: [3, 4] },
    ],
    caution: [
      { text: "Mổ thực quản, dạ dày: ăn từng ít một, nhiều bữa, theo hướng dẫn riêng của đội phẫu thuật / chuyên viên dinh dưỡng.", src: [5] },
      { text: "Người bệnh thận nên hỏi bác sĩ trước khi tăng đạm; người tiểu đường giữ đường huyết ổn để vết thương mau lành. Dị ứng món nào thì vẫn tránh món đó.", src: [1, 2] },
      { text: "Ai đã từng bị sẹo lồi thì nên tránh xăm, xỏ khuyên; sẹo lồi gây khó chịu thì đi khám sớm — điều trị sớm có thể giúp sẹo không lớn thêm.", src: [0] },
    ],
    unverified: ["thịt bò làm sẹo thâm", "rau muống làm sẹo lồi", "thịt gà làm ngứa, lâu lành", "trứng làm sẹo trắng hay lồi", "cua, tôm, hải sản làm lồi sẹo", "đồ nếp làm vết thương mưng mủ", "xì dầu / nước tương, cà phê, đồ sẫm màu làm sẹo đen, thâm"],
    topics: [
      { id: "seo-loi", text: "chưa thấy nguồn nói món ăn nào gây sẹo lồi; nguồn chỉ nêu cơ địa, tuổi, vị trí, và khuyên điều trị sớm", src: [0], v: "myth" },
      { id: "chay-mau", text: "không cần kiêng bò, gà, trứng, hải sản — nguồn khuyên ăn đủ đạm để vết thương mau lành", src: [1, 2], v: "myth" },
    ],
    sources: [
      { title: "Keloid scars", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/keloid-scars/", reviewed: "2023-02-07" },
      { title: "Wound Healing – Dietary advice", publisher: "Milton Keynes University Hospital (NHS, Anh)", url: "https://www.mkuh.nhs.uk/patient-information-leaflet/wound-healing-dietary-advice" },
      { title: "Dietary information to promote wound healing", publisher: "Oxford University Hospitals (NHS, Anh)", url: "https://www.ouh.nhs.uk/media/gnokulyd/106907healing.pdf", reviewed: "2024-12" },
      { title: "Scars – Treatment", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/scars/treatment/", reviewed: "2023-09-18" },
      { title: "How do I take care of my scars after surgery?", publisher: "Great Ormond Street Hospital (NHS, Anh)", url: "https://www.gosh.nhs.uk/conditions-and-treatments/procedures-and-treatments/how-do-i-take-care-of-my-scars-after-surgery/", reviewed: "2025-05-01" },
      { title: "Protein in your diet for upper gastrointestinal (UGI) surgery", publisher: "Guy's and St Thomas' (NHS, Anh)", url: "https://www.guysandstthomas.nhs.uk/health-information/protein-in-your-diet-for-upper-gastrointestinal-UGI-surgery/planning-your-food", reviewed: "2025-07" },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: "boi-nghe-seo",
    name: "Bôi nghệ ngừa sẹo, mờ thâm?",
    names: ["nghệ", "bột nghệ", "nghệ tươi", "tinh bột nghệ", "đắp nghệ", "bôi nghệ", "nghệ mật ong", "curcumin"],
    ctx: VN(/\b(sẹo|lồi sẹo|thâm|vết thương|vết mổ|vết khâu|da non|lên da non|mới mổ|sau mổ|trầy|xước|vết bỏng|vết thâm)\b/),
    verdict: "myth",
    belief: "Bôi hoặc đắp nghệ (nghệ tươi, tinh bột nghệ) lên vết thương, vết mổ để ngừa sẹo và mờ thâm.",
    folk: [],
    science: [
      { text: "NCCIH (Viện Y tế Hoa Kỳ): CHƯA đủ bằng chứng nghệ / curcumin có lợi cho bệnh nào; trang không nêu tác dụng ngừa sẹo hay làm lành vết thương. Bôi nghệ có thể nổi mề đay, ngứa.", src: [0] },
      { text: "Cách chăm sẹo NHS nêu: gel hoặc miếng dán silicone, xoa bóp với kem dưỡng khi đã lành hẳn, che nắng; sẹo lồi nặng có thể tiêm / bôi thuốc, áp lạnh, laser.", src: [1] },
    ],
    how: [
      { text: "Chỉ bắt đầu chăm sẹo (xoa bóp, silicone) khi vết thương **đã lành hẳn, chỉ đã rụng** — không dùng silicone lên vết thương hở.", src: [2] },
      { text: "Che nắng hoặc bôi kem chống nắng SPF 30+ lên sẹo, nhất là năm đầu — sẹo mới rất dễ cháy nắng, sậm màu.", src: [1, 2] },
    ],
    caution: [{ text: "Vết thương đỏ, sưng, nóng, chảy mủ hoặc sốt → đi khám, đừng tự đắp thêm thứ gì.", src: [2] }],
    unverified: ["bôi nghệ giúp ngừa sẹo, mờ thâm"],
    topics: [{ id: "seo-loi", text: "chưa có nguồn nói bôi nghệ ngừa sẹo lồi; silicone, che nắng, điều trị sớm mới là cách nguồn nêu", src: [0, 1], v: "myth" }],
    sources: [
      nccih("turmeric", "Turmeric", "04/2025"),
      { title: "Scars – Treatment", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/scars/treatment/", reviewed: "2023-09-18" },
      { title: "How do I take care of my scars after surgery?", publisher: "Great Ormond Street Hospital (NHS, Anh)", url: "https://www.gosh.nhs.uk/conditions-and-treatments/procedures-and-treatments/how-do-i-take-care-of-my-scars-after-surgery/", reviewed: "2025-05-01" },
    ],
    verifiedAt: VERIFIED,
  },
  // 30/10 (Kir: "e tìm hiểu thêm về mẹo dân gian… tổng quát hơn") — các kiêng cữ hay gặp nhất, đối chiếu nguồn NHS.
  {
    id: "o-cu-sau-sinh",
    name: "Ở cữ: kiêng tắm gội, kiêng gió, nằm than, kiêng rau, kiêng đánh răng?",
    names: ["kiêng tắm", "kiêng gội", "kiêng gội đầu", "kiêng gió", "nằm than", "xông than", "sưởi than", "lò than", "than hồng", "kiêng rau", "kiêng trái cây", "kiêng hoa quả", "kiêng đánh răng", "đánh răng", "tắm", "gội đầu", "nằm một chỗ", "kiêng đi lại", "đóng kín cửa", "kiêng nước", "ăn mặn", "thịt kho tiêu", "kiêng ăn", "kiêng cữ"],
    ctx: VN(/\b(sau sinh|mới sinh|vừa sinh|sinh xong|đẻ xong|mới đẻ|vừa đẻ|ở cữ|ở cử|nằm cữ|hậu sản|bà đẻ|sản phụ|sau đẻ|sinh mổ|đẻ mổ|sinh thường|đẻ thường)\b/),
    verdict: "myth",
    belief: "Ở cữ thì kiêng tắm, gội đầu, kiêng gió, đóng kín cửa, nằm than hay xông than, kiêng rau trái, kiêng đánh răng, nằm một chỗ, ăn mặn (thịt kho tiêu).",
    folk: [],
    science: [
      { text: "Có thể tắm / tắm vòi sen ngay khi thấy đủ sức sau sinh. Vết mổ rửa nhẹ bằng nước ấm, giữ sạch khô; vùng kín rửa nhẹ nước ấm từ trước ra sau rồi lau khô; thay băng vệ sinh thường xuyên.", src: [0] },
      { text: "Nên ăn lành mạnh có rau, trái cây, ngũ cốc nguyên hạt; uống đủ nước (khoảng 1,5–2 lít, cho con bú 2,5–3 lít) để tránh táo bón — rặn nhiều làm ảnh hưởng sàn chậu và vết khâu.", src: [0] },
      { text: "Nên rời giường sớm, đi lại nhẹ khi thấy thoải mái; khi nằm nghỉ, cử động cổ chân mỗi giờ giúp máu lưu thông, phòng cục máu đông. Tập sàn chậu, đi bộ nhẹ; chạy nhảy mạnh thì chờ sau khám 6–8 tuần.", src: [0, 1] },
      { text: "**Đốt than, bếp than trong phòng kín** có thể gây ngộ độc khí CO: đau đầu, chóng mặt, buồn nôn, mệt, lú lẫn, khó thở; phòng phải thông thoáng.", src: [2] },
    ],
    how: [
      { text: "Giữ phòng thông thoáng; nếu nghi ngộ độc khí than (đau đầu, chóng mặt, buồn nôn cả nhà) → tắt nguồn đốt, ra chỗ thoáng ngay; khó thở, lú lẫn, ngất → gọi 115.", src: [2] },
    ],
    caution: [
      { text: "Đi khám khi: sốt trên 38°C, sản dịch có mùi lạ, đau bụng tăng dần, máu ra nhiều hơn hoặc không giảm, có cục máu đông, đau vùng tầng sinh môn tăng; vết mổ đỏ, chảy dịch.", src: [1, 0] },
      { text: "Chảy máu đột ngột rất nhiều, choáng, chóng mặt, tim đập dồn → gọi **115**. Buồn bã, lo âu kéo dài hơn 2 tuần sau sinh → nói với bác sĩ / nữ hộ sinh.", src: [1] },
    ],
    unverified: ["tắm, gội đầu sau sinh gây \"hậu sản\", đau đầu về già", "ra gió sau sinh gây hại", "ăn rau, trái cây sau sinh làm hại dạ dày / mất sữa", "đánh răng sau sinh làm yếu răng"],
    topics: [],
    sources: [
      { title: "Your Recovery After Childbirth", publisher: "Oxford University Hospitals (NHS, Anh)", url: "https://www.ouh.nhs.uk/media/uq3fs4fr/100782recovery.pdf", reviewed: "2024-01" },
      { title: "Early days", publisher: "NHS (Anh)", url: "https://www.nhs.uk/pregnancy/labour-and-birth/early-days/", reviewed: "2026-01-27" },
      { title: "Carbon monoxide poisoning", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/carbon-monoxide-poisoning/", reviewed: "2025-12-16" },
    ],
    verifiedAt: VERIFIED,
  },
  {
    id: "mat-ong-tre-so-sinh",
    name: "Rơ lưỡi, cho trẻ dưới 1 tuổi ăn mật ong?",
    names: ["mật ong", "rơ lưỡi mật ong", "rơ mật ong", "chấm mật ong", "nước mật ong"],
    ctx: VN(/\b(sơ sinh|mới sinh|rơ lưỡi|tưa lưỡi|nấm lưỡi|dưới 1 tuổi|dưới một tuổi|chưa đầy 1 tuổi|chưa đầy tuổi|chưa thôi nôi|\d+ tháng tuổi|(bé|con|cháu) \d+ tháng|(bé|con|cháu) mấy tháng|nhũ nhi|em bé mới đẻ)\b/),
    verdict: "danger",
    folk: [{ text: "Nhiều nhà rơ lưỡi, chấm mật ong cho trẻ sơ sinh để sạch lưỡi, trị tưa lưỡi, hoặc cho bé uống mật ong trị ho.", src: [0] }],
    science: [
      { text: "NHS: **không cho trẻ dưới 1 tuổi dùng mật ong** — mật ong đôi khi có vi khuẩn tạo độc tố trong ruột bé, gây **ngộ độc botulinum ở trẻ nhỏ**, một bệnh nghiêm trọng.", src: [0] },
      { text: "Trẻ từ 4 tuổi trở xuống cũng nên tránh đồ ăn uống có đường, kể cả đường tự nhiên trong mật ong, siro, nước ép.", src: [0] },
    ],
    caution: [{ text: "**Chờ bé qua 1 tuổi** mới cho dùng mật ong, kể cả rơ lưỡi hay pha nước chanh mật ong trị ho.", src: [0] }],
    topics: [{ id: "nam-mieng", text: "KHÔNG rơ mật ong cho bé dưới 1 tuổi — nguy cơ ngộ độc botulinum", src: [0], v: "danger" }],
    sources: [{ title: "Foods to avoid giving babies and young children", publisher: "NHS (Anh)", url: "https://www.nhs.uk/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/", reviewed: "2026-02-18" }],
    verifiedAt: VERIFIED,
  },
  {
    id: "do-nong-noi-mun",
    name: "Ăn đồ \"nóng\" (xoài, nhãn, sầu riêng, đồ chiên) làm nổi mụn?",
    names: ["đồ nóng", "ăn nóng", "nóng trong", "nóng gan", "xoài", "nhãn", "vải", "sầu riêng", "mít", "sô cô la", "socola", "chocolate", "đồ chiên", "đồ chiên rán", "dầu mỡ", "đồ ngọt", "đồ cay", "sữa", "do ăn uống", "ăn gì"],
    ctx: VN(/\b(mụn|nổi mụn|mọc mụn|lên mụn|mụn trứng cá|mụn bọc|mụn đầu đen|mụn ẩn)\b/),
    verdict: "myth",
    belief: "Ăn đồ \"nóng\" như xoài, nhãn, vải, sầu riêng, mít, sô cô la, đồ chiên, đồ cay thì nổi mụn; mụn do \"nóng trong\", do bẩn.",
    folk: [],
    science: [
      { text: "NHS: cho tới nay **nghiên cứu chưa tìm thấy món ăn nào gây mụn**; vẫn nên ăn uống cân bằng cho sức khoẻ chung.", src: [0] },
      { text: "Mụn do hormone thay đổi (nhất là tuổi dậy thì, kinh nguyệt, mang thai, buồng trứng đa nang) làm tuyến dầu tiết nhiều, bít lỗ chân lông; có thể di truyền. \"Do bẩn\" là ngộ nhận — rửa mặt quá nhiều còn làm kích ứng da.", src: [0] },
    ],
    how: [
      { text: "Rửa mặt sáng và tối (đừng rửa quá nhiều) bằng sữa rửa mặt dịu nhẹ và nước ấm; dùng mỹ phẩm gốc nước, không gây bít tắc, tẩy trang trước khi ngủ; tắm sau khi ra mồ hôi.", src: [0] },
      { text: "**Không nặn mụn** — dễ để lại sẹo.", src: [0] },
    ],
    caution: [{ text: "Mụn nhiều, mụn bọc đau, hoặc làm bạn buồn phiền → đi khám da liễu; có nhiều cách điều trị hiệu quả.", src: [0] }],
    unverified: ["xoài, nhãn, vải, sầu riêng, mít, đồ \"nóng\" làm nổi mụn"],
    topics: [{ id: "mun-trung-ca", text: "nghiên cứu chưa thấy món ăn nào gây mụn; mụn do hormone, tuyến dầu, di truyền — đừng nặn", src: [0], v: "myth" }],
    sources: [{ title: "Acne", publisher: "NHS 111 Wales (Anh)", url: "https://111.wales.nhs.uk/acne/", updated: "2024-11-07" }],
    verifiedAt: VERIFIED,
  },
  {
    id: "zona-ve-muc",
    name: "Zona (giời leo): vẽ mực, đắp đỗ xanh, kiêng tắm?",
    names: ["vẽ mực", "bôi mực", "khoanh mực", "mực tàu", "đắp đỗ xanh", "đậu xanh", "đỗ xanh", "đốt giời leo", "cắt giời leo", "kiêng tắm", "kiêng nước", "kiêng gió", "đắp lá", "thầy cúng", "chữa mẹo", "tắm", "được tắm", "tắm được không", "có được tắm", "ra gió"],
    ctx: VN(/\b(zona|giời leo|dời leo|herpes zoster|zô na)\b/),
    verdict: "myth",
    belief: "Bị zona (giời leo) thì vẽ mực khoanh lại cho \"không lan\", đắp đỗ xanh / lá giã, \"cắt / đốt giời leo\", kiêng tắm, kiêng nước, kiêng gió.",
    folk: [],
    science: [
      { text: "NHS: **thuốc kháng virus hiệu quả nhất khi bắt đầu trong vòng 3 ngày** từ lúc nổi ban — nghi zona thì đi khám sớm thay vì chữa mẹo.", src: [0] },
      { text: "Tự chăm theo NHS: giữ chỗ phát ban **sạch và khô** để bớt nhiễm trùng, mặc đồ rộng, chườm mát (khăn ướt, túi đá bọc khăn) vài lần mỗi ngày, có thể dùng paracetamol giảm đau.", src: [0] },
    ],
    caution: [
      { text: "Đừng để băng dán dính vào chỗ phát ban; tránh vải thô cọ xát.", src: [0] },
      { text: "Zona không lây thành zona, nhưng người chưa từng bị thuỷ đậu có thể bị thuỷ đậu từ bạn — tránh tiếp xúc bà bầu chưa bị thuỷ đậu, người suy giảm miễn dịch, trẻ dưới 1 tháng.", src: [0] },
      { text: "Phát ban quanh mắt có thể ảnh hưởng thị lực, thính lực → đi khám ngay.", src: [0] },
    ],
    unverified: ["vẽ mực, đắp đỗ xanh / lá giã chữa zona", "\"cắt / đốt giời leo\"", "kiêng tắm, kiêng gió khi bị zona"],
    topics: [{ id: "zona", text: "đi khám sớm — thuốc kháng virus hiệu quả nhất trong 3 ngày đầu; giữ ban sạch, khô, không cần kiêng tắm", src: [0], v: "myth" }],
    sources: [{ title: "Shingles", publisher: "NHS 111 Wales (Anh)", url: "https://111.wales.nhs.uk/encyclopaedia/s/article/shingles/", updated: "2025-10-20" }],
    verifiedAt: VERIFIED,
  },
  {
    id: "soi-kieng-gio",
    name: "Bị sởi: kiêng gió, kiêng nước, ủ kín?",
    names: ["kiêng gió", "kiêng nước", "kiêng tắm", "không tắm", "đóng kín cửa", "ủ kín", "trùm kín", "kiêng ăn", "kiêng tanh", "tắm được không", "tắm", "được tắm", "có được tắm", "ra gió", "gội đầu"],
    ctx: VN(/\b(sởi|bệnh sởi|lên sởi|phát sởi|ban sởi)\b/),
    verdict: "myth",
    belief: "Bị sởi thì kiêng gió, kiêng nước, kiêng tắm, đóng kín cửa, ủ kín, kiêng ăn đồ tanh.",
    folk: [],
    science: [
      { text: "Tự chăm theo NHS: **nghỉ ngơi, uống nhiều nước** để tránh mất nước; dùng paracetamol hoặc ibuprofen để hạ sốt, giảm khó chịu; lau gỉ mắt bằng bông thấm nước đun sôi để nguội — nguồn không nêu chuyện kiêng gió, kiêng tắm.", src: [0] },
      { text: "Nghỉ học, nghỉ làm ít nhất 4 ngày từ khi nổi ban; tránh tiếp xúc gần với trẻ nhỏ, bà bầu, người suy giảm miễn dịch.", src: [0] },
    ],
    caution: [
      { text: "Đi khám gấp khi: sốt cao không hạ dù đã dùng thuốc, khó thở, trẻ bú / uống kém, tiểu ít, người rất mệt.", src: [0] },
      { text: "Gọi **115** khi co giật, khó thở nặng, li bì khó tỉnh, lú lẫn đột ngột, mềm oặt, ban không mất khi ấn ly thuỷ tinh, cứng cổ hoặc sợ ánh sáng.", src: [0] },
    ],
    unverified: ["ra gió, tắm khi bị sởi làm bệnh nặng hơn"],
    topics: [{ id: "soi", text: "nguồn không bảo kiêng gió, kiêng tắm — nghỉ ngơi, uống nhiều nước, hạ sốt, theo dõi dấu hiệu nặng", src: [0], v: "myth" }],
    sources: [{ title: "Measles", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/measles/", reviewed: "2025-07-31" }],
    verifiedAt: VERIFIED,
  },
  // 30/10 — Kir: "trái cây có tính nóng hay lạnh… dưa hấu ăn vào nóng người, xoài, sầu riêng… tìm hiểu trái cây rau củ quả".
  {
    id: "tinh-nong-lanh",
    name: "Trái cây, rau củ \"tính nóng\" / \"tính mát\"",
    names: ["dưa hấu", "nước dưa hấu", "xoài", "sầu riêng", "vải", "vải thiều", "nhãn", "mít", "chôm chôm", "măng cụt", "quýt", "chuối", "đu đủ", "dừa", "nước dừa", "thanh long", "lê", "táo", "nho", "dâu", "dâu tây", "ổi", "bơ", "mận", "me", "khế", "sapoche", "hồng xiêm", "mãng cầu", "na", "sơ ri", "rau má", "nước rau má", "bí đao", "bí đỏ", "rau muống", "cà chua", "dưa leo", "dưa chuột", "củ cải", "khoai lang", "khoai mì", "ớt", "trái cây", "hoa quả", "rau củ", "rau củ quả", "rau quả", "đồ nóng", "đồ mát", "đồ lạnh", "say vải", "ăn nhiều vải", "trứng vịt lộn", "hột vịt lộn", "nóng trong", "bị nóng trong", "nóng gan", "bị nhiệt", "nóng người", "bị nóng"],
    ctx: VN(/\b(tính nóng|tính lạnh|tính mát|tính hàn|tính ấm|tính nhiệt|nóng người|mát người|nóng trong|lạnh bụng|lạnh người|giải nhiệt|thanh nhiệt|mát gan|nóng gan|nhiệt miệng|bị nhiệt|nhiệt|bị nóng|bốc hỏa|bốc hoả|có nóng|có mát|có lạnh|say vải|ăn nhiều|ăn vào nóng|ăn vào mát)\b/),
    verdict: "myth",
    belief: "Trái cây \"tính nóng\" (xoài, sầu riêng, vải, nhãn, mít, chôm chôm…) ăn vào nóng người, nổi mụn, nhiệt miệng; đồ \"tính mát / lạnh\" (dưa hấu, dừa, rau má, bí đao…) giải nhiệt, ăn nhiều thì lạnh bụng.",
    folk: [],
    science: [
      { text: "Chia \"nóng / lạnh\" là cách nhìn của Đông y truyền thống. Hướng dẫn dinh dưỡng của NHS không chia như vậy mà khuyên ăn **đa dạng nhiều loại** rau quả, vì mỗi loại cho chất dinh dưỡng khác nhau.", src: [0] },
      { text: "Rau quả cho vitamin, khoáng chất, chất xơ; ăn đủ giúp giảm nguy cơ bệnh tim, đột quỵ và vài loại ung thư — tươi, đông lạnh, đóng hộp hay sấy khô đều tính.", src: [0] },
      { text: "Cảm giác \"mát\" của dưa hấu, dừa: đồ ăn cũng cung cấp một phần nước cho cơ thể. Uống đủ nước thì nước tiểu vàng nhạt, trong.", src: [1] },
      { text: "Nổi mụn: nghiên cứu **chưa thấy món ăn nào gây mụn** — mụn chủ yếu do hormone, tuyến dầu và di truyền.", src: [3] },
      { text: "Nhiệt miệng (loét miệng) hay do cắn trúng má, bỏng vì đồ nóng, mệt mỏi căng thẳng, thay đổi hormone, thiếu vitamin, hoặc không dung nạp / dị ứng một món ăn.", src: [2] },
    ],
    how: [
      { text: "Ăn đủ và đa dạng rau quả mỗi ngày; nước ép, sinh tố chỉ nên **một ly nhỏ mỗi ngày**, uống trong bữa ăn vì nhiều đường.", src: [0, 1] },
      { text: "Đang bị loét miệng: tạm tránh đồ quá cay, mặn, chua, đồ cứng giòn, nước ép chua và đồ uống quá nóng; ăn đồ mềm.", src: [2] },
    ],
    caution: [
      { text: "Loét miệng quá 3 tuần, hoặc chảy máu, đau và đỏ hơn → đi khám bác sĩ / nha sĩ.", src: [2] },
      { text: "Người bệnh thận mạn: **tránh ăn khế** (độc tố tích tụ khi thận yếu); chỉ bớt chuối, bơ khi bác sĩ dặn vì nhiều kali.", src: [4] },
      { text: "Vải: CDC ghi nhận ở vùng trồng vải (Ấn Độ) nhiều trẻ nhỏ bị bệnh não kèm **hạ đường huyết** đúng mùa vải; trẻ lơ mơ, co giật → đi cấp cứu ngay.", src: [5] },
    ],
    unverified: ["dưa hấu, dừa \"tính lạnh\" ăn nhiều gây lạnh bụng, hại dạ dày", "xoài, sầu riêng, vải, nhãn \"tính nóng\" làm nóng người", "ăn sầu riêng cùng rượu bia gây ngộ độc"],
    topics: [
      { id: "nhiet-mieng", text: "nhiệt miệng hay do cắn trúng, bỏng đồ nóng, căng thẳng, thiếu vitamin, dị ứng món ăn — loét quá 3 tuần thì đi khám", src: [2], v: "myth" },
      { id: "mun-trung-ca", text: "nghiên cứu chưa thấy trái cây \"nóng\" hay món nào gây mụn", src: [3], v: "myth" },
      { id: "benh-than-man", text: "tránh ăn khế; chỉ bớt trái cây nhiều kali khi bác sĩ dặn", src: [4], v: "danger" },
    ],
    sources: [
      { title: "Why 5 A Day?", publisher: "NHS (Anh)", url: "https://www.nhs.uk/live-well/eat-well/5-a-day/why-5-a-day/", reviewed: "2026-09-30" },
      { title: "Water, drinks and your health", publisher: "NHS (Anh)", url: "https://www.nhs.uk/live-well/eat-well/water-drinks-nutrition/", reviewed: "2023-05-17" },
      { title: "Mouth ulcers", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/mouth-ulcers/", reviewed: "2024-03-11" },
      { title: "Acne", publisher: "NHS 111 Wales (Anh)", url: "https://111.wales.nhs.uk/acne/", updated: "2024-11-07" },
      { title: "Dietary advice for people with Chronic Kidney Disease (01/2024)", publisher: "Royal Devon University Healthcare NHS (Anh)", url: "https://www.royaldevon.nhs.uk/media/d5mnyqnp/patient-information-leaflet-your-diet-for-chronic-kidney-disease-rde-18-139-003.pdf" },
      { title: "Outbreaks of Unexplained Neurologic Illness — Muzaffarpur, India, 2013–2014 (MMWR 30/01/2015)", publisher: "CDC (Hoa Kỳ)", url: "https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6403a1.htm" },
    ],
    verifiedAt: "2026-10-30",
  },
  {
    id: "khe-benh-than",
    name: "Khế với người bệnh thận",
    names: ["khế", "trái khế", "quả khế", "khế chua", "khế ngọt", "nước khế", "nước ép khế", "star fruit", "carambola"],
    ctx: VN(/\b(thận|suy thận|chạy thận|lọc máu|lọc thận|bệnh thận|thận mạn|thận yếu|creatinin)\b/),
    verdict: "danger",
    belief: "Khế chua, khế ngọt là trái cây quen thuộc; nhiều người bệnh thận vẫn ăn vì nghĩ trái cây nào cũng lành.",
    folk: [],
    science: [
      { text: "Bệnh viện NHS dặn người bệnh thận mạn **tránh ăn khế**: khế có độc tố tích tụ trong cơ thể và gây hại khi thận yếu.", src: [0] },
      { text: "Không phải trái cây nào cũng phải kiêng: chỉ giảm kali (chuối, bơ…) khi bác sĩ / chuyên viên dinh dưỡng dặn — tự kiêng thì không có lợi.", src: [0] },
    ],
    caution: [
      { text: "Bị bệnh thận mạn, đang chạy thận → **không ăn khế**, không uống nước ép khế.", src: [0] },
      { text: "Hỏi bác sĩ / chuyên viên dinh dưỡng trước khi tự kiêng hay ăn thêm nhiều một loại trái cây.", src: [0] },
    ],
    topics: [{ id: "benh-than-man", text: "tránh ăn khế — độc tố tích tụ khi thận yếu", src: [0], v: "danger" }],
    sources: [{ title: "Dietary advice for people with Chronic Kidney Disease (01/2024)", publisher: "Royal Devon University Healthcare NHS (Anh)", url: "https://www.royaldevon.nhs.uk/media/d5mnyqnp/patient-information-leaflet-your-diet-for-chronic-kidney-disease-rde-18-139-003.pdf" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "san-mang-doc",
    name: "Sắn (khoai mì), măng tươi — \"say sắn\", ngộ độc măng",
    names: ["sắn", "củ sắn", "khoai mì", "củ mì", "say sắn", "say khoai mì", "măng", "măng tươi", "măng chua", "măng rừng", "măng tre", "nước măng", "luộc măng", "luộc sắn", "ngâm măng", "khoai tây mọc mầm", "khoai tây nảy mầm", "khoai tây mầm", "khoai tây xanh", "khoai tây vỏ xanh"],
    ctx: VN(/\b(độc|ngộ độc|say|ngâm|luộc|đói|an toàn|nguy hiểm|cyanua|xyanua|xianua|chế biến|sơ chế|bỏ nước|mở vung|ăn nhiều|ăn sống|mọc mầm|nảy mầm|mầm|vỏ xanh|(được|đc|dc) (không|k|ko|hông|hok)|có ăn được|ăn có sao|ăn có hại|có sao không)\b/),
    verdict: "help",
    tip: true,
    folk: [{ text: "Dân gian dặn sắn, măng phải ngâm kỹ, luộc bỏ nước, mở vung; ăn nhiều sắn lúc đói dễ bị \"say sắn\".", src: [0] }],
    science: [
      { text: "Sắn và măng chứa nhiều cyanogenic glycoside — chất sinh ra độc tố xyanua (cyanua) khi ăn vào.", src: [0, 1] },
      { text: "Ngộ độc thường xuất hiện sau ăn khoảng 30 phút tới 1–2 giờ: nóng lưỡi, họng, đau đầu, chóng mặt, đau bụng, buồn nôn, thở nhanh; nặng thì lơ mơ, co giật, ngừng thở.", src: [0] },
      { text: "Mầm khoai tây, phần vỏ xanh hay vỏ có vị đắng — và cả cà chua xanh — có nhiều độc tố solanin.", src: [1] },
    ],
    how: [
      { text: "Sắn: gọt vỏ, cắt bỏ hai đầu, ngâm nước, luộc **mở vung** cho độc bay hơi.", src: [0] },
      { text: "Măng: ngâm kỹ nhiều nước, luộc nhiều lần, mở vung khi sôi; măng chua đừng ăn / uống nước ngâm quá nhiều.", src: [0] },
      { text: "Đừng ăn quá nhiều sắn, măng, nhất là lúc đói.", src: [0] },
      { text: "Khoai tây: cất nơi tối, mát, khô; không ăn phần mọc mầm hay phần xanh.", src: [1] },
    ],
    caution: [{ text: "Ăn sắn, măng xong mà lơ mơ, khó thở, co giật, ngất → gọi 115 / đưa đi viện ngay.", src: [0] }],
    topics: [{ id: "ngo-doc-thuc-pham", text: "sắn, măng phải ngâm kỹ, luộc mở vung, bỏ nước; không ăn nhiều lúc đói", src: [0], v: "help" }],
    sources: [
      { title: "Phòng chống ngộ độc cyanogenic glycoside tự nhiên trong thực phẩm (cập nhật 09/10/2023)", publisher: "Viện Kiểm nghiệm ATVSTP Quốc gia – Bộ Y tế", url: "https://nifc.gov.vn/ky-thuat-chuyen-mon/phong-chong-ngo-doc-cyanogenic-glycoside-tu-nhien-trong-thuc-pham-post2027.html" },
      { title: "Natural toxins in food – fact sheet (10/03/2023)", publisher: "WHO", url: "https://www.who.int/news-room/fact-sheets/detail/natural-toxins-in-food" },
    ],
    verifiedAt: "2026-10-30",
  },
  // 30/10 — Kir: "có ng khuyên ung thư k nên ăn trứng vịt lộn vì độ dinh dưỡng cao… cá có omega 3 ăn bổ mắt… mẹo dân gian nhiều lắm".
  {
    id: "ung-thu-kieng-bo",
    name: "Ung thư kiêng đồ bổ (trứng vịt lộn…) để \"bỏ đói\" khối u?",
    names: ["trứng vịt lộn", "hột vịt lộn", "vịt lộn", "đồ bổ", "ăn bổ", "ăn đồ bổ", "bồi bổ", "nuôi khối u", "nuôi tế bào ung thư", "khối u lớn nhanh", "bỏ đói", "bỏ đói khối u", "bỏ đói ung thư", "nhịn ăn", "ăn kiêng", "kiêng khem"],
    ctx: VN(/\b(ung thư|ung bướu|khối u|khối bướu|di căn|hoá trị|hóa trị|xạ trị)\b/),
    verdict: "myth",
    belief: "Bị ung thư thì kiêng đồ bổ như trứng vịt lộn, thịt, sữa…, ăn ít hoặc nhịn để \"bỏ đói\" khối u, vì sợ ăn bổ thì khối u lớn nhanh.",
    folk: [],
    science: [
      { text: "\"Bỏ đói\" khối u bằng cắt đường, tinh bột hay nhịn ăn **không đơn giản vậy** — tế bào lành cũng cần đường; chưa có bằng chứng ăn kiêng giúp người bệnh sống lâu hơn.", src: [1] },
      { text: "Không có món ăn hay chế độ ăn đặc biệt nào được chứng minh làm teo hay chữa ung thư; kiêng khem quá mức dễ thiếu chất, sụt cân.", src: [0] },
      { text: "Tự ăn kiêng khắt khe khi đang điều trị có thể làm **chậm hồi phục**, thậm chí nguy hiểm tính mạng.", src: [1] },
      { text: "Trứng vịt lộn (100 g phần ăn được): 182 kcal, 13,6 g đạm, 12,4 g chất béo — là món nhiều năng lượng và đạm.", src: [3] },
    ],
    how: [
      { text: "Ăn kém, sụt cân: ăn bữa nhỏ, món nhiều năng lượng, chia nhiều lần; thèm món gì thì ăn món đó.", src: [2] },
      { text: "Muốn nhịn ăn hay theo chế độ kiêng nào thì hỏi đội điều trị trước.", src: [0] },
    ],
    caution: [{ text: "Không tự uống vitamin / thực phẩm chức năng liều cao khi đang điều trị — có thể có hại hoặc ảnh hưởng thuốc; hỏi bác sĩ ung bướu trước.", src: [0] }],
    unverified: ["ăn trứng vịt lộn, đồ bổ làm khối u lớn nhanh", "trứng vịt lộn \"tính mát\" giải nhiệt cơ thể"],
    topics: [{ id: "ung-thu", text: "không cần kiêng đồ bổ để \"bỏ đói\" khối u — ăn đủ chất giúp chịu được điều trị; hỏi đội điều trị trước khi ăn kiêng", src: [0, 1], v: "myth" }],
    sources: [
      { title: "Common questions about diet and cancer", publisher: "Macmillan Cancer Support (Anh)", url: "https://www.macmillan.org.uk/cancer-information-and-support/impacts-of-cancer/healthy-eating-and-cancer/common-questions-about-diet-and-cancer", reviewed: "2025-04-01" },
      { title: "Sugar and cancer – what you need to know (16/08/2023)", publisher: "Cancer Research UK (Anh)", url: "https://news.cancerresearchuk.org/2023/08/16/sugar-and-cancer-what-you-need-to-know/", updated: "2023-08-16" },
      { title: "Diet in advanced cancer", publisher: "Cancer Research UK (Anh)", url: "https://www.cancerresearchuk.org/about-cancer/coping/physically/diet-problems/diet-in-advanced-cancer", reviewed: "2024-03-27" },
      { title: "Bảng thành phần thực phẩm Việt Nam (2007)", publisher: "Viện Dinh dưỡng – Bộ Y tế", url: "https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf" },
    ],
    verifiedAt: "2026-10-30",
  },
  {
    id: "ca-omega3-mat",
    name: "Ăn cá, dầu cá (omega-3) bổ mắt?",
    names: ["ăn cá", "cá biển", "cá hồi", "dầu cá", "viên dầu cá", "omega 3", "omega-3", "omega3", "dầu gan cá"],
    // ("mắt cá chân" là cổ chân, không phải mắt)
    ctx: VN(/\b(mắt(?! cá)|bổ mắt|sáng mắt|tốt cho mắt|thị lực|khô mắt|cận thị|thoái hoá hoàng điểm|thoái hóa hoàng điểm|thoái hoá điểm vàng|thoái hóa điểm vàng|đục thuỷ tinh thể|đục thủy tinh thể|cườm)\b/),
    verdict: "mixed",
    tip: true,
    folk: [{ text: "Dân gian và quảng cáo hay nói ăn cá, uống dầu cá (omega-3) giúp sáng mắt, chữa khô mắt, ngừa thoái hoá điểm vàng.", src: [0, 1] }],
    science: [
      { text: "Nghiên cứu lớn (DREAM, NIH): **viên** omega-3 từ dầu cá **không hơn giả dược** trong việc giảm triệu chứng hay dấu hiệu khô mắt.", src: [0] },
      { text: "Nghiên cứu AREDS2 (NIH): thêm omega-3 vào công thức vitamin cho mắt **không làm giảm thêm** nguy cơ thoái hoá điểm vàng nặng; viên omega-3 không có tác dụng với đục thuỷ tinh thể.", src: [1] },
      { text: "Cá giàu omega-3 vẫn nên có trong bữa ăn vì tốt cho tim mạch.", src: [2] },
    ],
    how: [{ text: "Ăn cá như một phần bữa ăn lành mạnh; khô mắt, mỏi mắt, nhìn mờ thì đi khám mắt thay vì tự uống dầu cá.", src: [0, 2] }],
    caution: [{ text: "Viên omega-3 có thể làm lâu cầm máu — đang dùng thuốc chống đông thì hỏi bác sĩ trước; dị ứng cá thì không dùng.", src: [2] }],
    topics: [
      { id: "kho-mat", text: "viên dầu cá (omega-3) không hơn giả dược cho khô mắt (nghiên cứu DREAM)", src: [0], v: "unclear" },
      { id: "thoai-hoa-hoang-diem", text: "thêm omega-3 không giảm nguy cơ thoái hoá điểm vàng nặng (AREDS2)", src: [1], v: "unclear" },
    ],
    sources: [
      { title: "Omega-3s from fish oil supplements no better than placebo for dry eye (13/04/2018)", publisher: "NEI – Viện Mắt Quốc gia (NIH, Hoa Kỳ)", url: "https://www.nei.nih.gov/about/news-and-events/news/omega-3s-fish-oil-supplements-no-better-placebo-dry-eye" },
      { title: "Age-Related Eye Disease Studies (AREDS/AREDS2): major findings (cập nhật 22/10/2025)", publisher: "NEI – Viện Mắt Quốc gia (NIH, Hoa Kỳ)", url: "https://nei.nih.gov/research/clinical-trials/age-related-eye-disease-studies-aredsareds2/about-areds-and-areds2" },
      { title: "Things To Know About Omegas for Heart Disease", publisher: "NCCIH (Viện Y tế Quốc gia Hoa Kỳ – NIH)", url: "https://www.nccih.nih.gov/health/tips/things-to-know-about-omegas-for-heart-disease" },
    ],
    verifiedAt: "2026-10-30",
  },
  {
    id: "tiet-canh",
    name: "Tiết canh (huyết sống)",
    names: ["tiết canh", "tiết canh lợn", "tiết canh heo", "tiết canh vịt", "tiết canh ngan", "huyết sống", "tiết sống", "máu sống", "uống máu sống"],
    verdict: "danger",
    belief: "Tiết canh là món nhậu \"bổ máu\", ăn đầu năm cho may mắn.",
    folk: [],
    science: [
      { text: "Ở Việt Nam, ăn sản phẩm lợn sống như tiết canh liên quan tới **viêm màng não do liên cầu lợn** (Streptococcus suis) và bệnh giun xoắn.", src: [0] },
      { text: "Liên cầu lợn gây nhiễm trùng nặng: tỉ lệ tử vong khoảng 3–7%, có thể tới khoảng 60% khi nhiễm trùng huyết nặng.", src: [0] },
      { text: "Ăn đồ động vật chưa nấu chín là yếu tố nguy cơ rõ ràng của nhiều bệnh nhiễm trùng.", src: [0] },
    ],
    how: [{ text: "Ăn thịt, tiết, nội tạng lợn đã **nấu chín kỹ**; không ăn tiết canh, thịt lợn tái, lợn ốm chết.", src: [0] }],
    caution: [
      { text: "Sau khi ăn tiết canh / thịt lợn chưa chín mà sốt cao, đau đầu dữ dội, cứng cổ, sợ ánh sáng, nôn, lú lẫn, lơ mơ hay nổi ban không mất khi ấn → gọi **115** / đi cấp cứu ngay.", src: [1] },
    ],
    topics: [{ id: "viem-mang-nao", text: "ăn tiết canh, thịt lợn sống có thể nhiễm liên cầu lợn gây viêm màng não — sốt cao, cứng cổ, lơ mơ thì cấp cứu ngay", src: [0, 1], v: "danger" }],
    sources: [
      { title: "Raw Pig Blood Consumption and Potential Risk for Streptococcus suis Infection, Vietnam (EID 11/2014)", publisher: "CDC (Hoa Kỳ)", url: "https://wwwnc.cdc.gov/eid/article/20/11/14-0915_article" },
      { title: "Meningitis", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/meningitis/", reviewed: "2026-06-12" },
    ],
    verifiedAt: "2026-10-30",
  },
  {
    id: "an-cay-da-day",
    name: "Ăn cay, căng thẳng gây loét dạ dày?",
    names: ["ăn cay", "đồ cay", "ăn ớt", "ớt", "cay", "căng thẳng", "stress", "lo nghĩ"],
    ctx: VN(/\b(loét dạ dày|viêm loét dạ dày|loét bao tử|đau dạ dày|đau bao tử|viêm dạ dày|bao tử|dạ dày)\b/),
    verdict: "myth",
    belief: "Ăn cay, căng thẳng là nguyên nhân gây loét dạ dày.",
    folk: [],
    science: [
      { text: "Loét dạ dày chủ yếu do **vi khuẩn H. pylori** hoặc dùng thường xuyên thuốc giảm đau kháng viêm (NSAID) như ibuprofen; hút thuốc và tuổi cao làm dễ bị hơn.", src: [0] },
      { text: "Đồ cay, đồ béo, cà phê, sô cô la **có thể làm triệu chứng nặng hơn** ở một số người; căng thẳng, lo âu cũng làm triệu chứng tệ hơn.", src: [0] },
    ],
    how: [{ text: "Tránh món làm mình khó chịu; giảm căng thẳng; đi khám để tìm H. pylori nếu đau dạ dày hay tái lại.", src: [0, 1] }],
    caution: [{ text: "Nôn ra máu đỏ tươi hoặc như bã cà phê, đi ngoài phân đen sệt hôi hoặc có máu, đau bụng dữ dội → gọi **115** / đi cấp cứu ngay.", src: [1] }],
    topics: [{ id: "loet-da-day", text: "loét dạ dày chủ yếu do H. pylori hoặc thuốc giảm đau NSAID; đồ cay chỉ có thể làm triệu chứng nặng hơn", src: [0], v: "myth" }],
    sources: [
      { title: "Stomach ulcer – Causes", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/stomach-ulcer/causes/", reviewed: "2025-08-12" },
      { title: "Stomach ulcer", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/stomach-ulcer/", reviewed: "2025-08-12" },
    ],
    verifiedAt: "2026-10-30",
  },
  {
    id: "be-khop-tay",
    name: "Bẻ khớp ngón tay gây viêm khớp?",
    names: ["bẻ khớp", "bẻ tay", "bẻ ngón tay", "bẻ khớp ngón tay", "bẻ khớp tay", "bẻ tay kêu", "bẻ khớp kêu", "bẻ đốt ngón tay"],
    verdict: "myth",
    belief: "Bẻ khớp ngón tay kêu rắc rắc thì sau này bị viêm khớp, to khớp.",
    folk: [],
    science: [
      { text: "Bác sĩ phẫu thuật bàn tay (Mayo Clinic): nếu bẻ khớp **không đau** thì không thấy có hại.", src: [0] },
      { text: "Tiếng kêu là do các bọt khí trong dịch khớp vỡ ra khi khớp bị ấn, kéo.", src: [0] },
    ],
    caution: [{ text: "Bác sĩ chỉ nói không hại khi bẻ mà **không đau** — bẻ thấy đau thì nên ngưng.", src: [0] }],
    topics: [{ id: "thoai-hoa-khop", text: "bẻ khớp ngón tay mà không đau thì chưa thấy có hại", src: [0], v: "myth" }],
    sources: [{ title: "Mayo Clinic Minute: A hand surgeon's advice about knuckle cracking (27/06/2017)", publisher: "Mayo Clinic News Network (Hoa Kỳ)", url: "https://newsnetwork.mayoclinic.org/discussion/mayo-clinic-minute-a-hand-surgeons-advice-about-knuckle-cracking/" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "lo-vi-song",
    name: "Lò vi sóng làm đồ ăn \"nhiễm xạ\", gây ung thư?",
    names: ["lò vi sóng", "lò vi ba", "quay lò vi sóng", "hâm lò vi sóng", "hâm bằng lò vi sóng", "microwave"],
    verdict: "myth",
    tip: true,
    belief: "Đồ ăn hâm, nấu bằng lò vi sóng bị \"nhiễm xạ\", gây ung thư và mất hết chất dinh dưỡng.",
    folk: [],
    science: [
      { text: "Sóng vi ba biến thành nhiệt khi đồ ăn hấp thụ — **không làm đồ ăn \"nhiễm xạ\"** hay nhiễm bẩn.", src: [0] },
      { text: "Nấu bằng lò vi sóng **không làm mất chất dinh dưỡng nhiều hơn** cách nấu thông thường.", src: [0] },
      { text: "Lò đạt chuẩn, dùng đúng hướng dẫn của nhà sản xuất thì an toàn.", src: [0] },
    ],
    how: [{ text: "Dùng hộp, bát ghi dùng được cho lò vi sóng — một số hộp nhựa có thể chảy vì nóng; không cho nồi kim loại, giấy bạc vào lò.", src: [0] }],
    caution: [{ text: "Cửa lò đóng không kín, cong vênh, bản lề / gioăng hỏng → ngưng dùng, liên hệ nhà sản xuất (sóng có thể rò ra).", src: [0] }],
    topics: [],
    sources: [{ title: "Microwave Ovens (nội dung 12/10/2023)", publisher: "FDA (Hoa Kỳ)", url: "https://www.fda.gov/radiation-emittingproducts/resourcesforyouradiationemittingproducts/ucm252762.htm" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "mau-cam-ngua-co",
    name: "Chảy máu cam: ngửa cổ ra sau?",
    names: ["ngửa cổ", "ngửa đầu", "ngửa ra sau", "ngước lên", "nằm ngửa", "nhét giấy", "nhét bông", "ngửa mặt"],
    ctx: VN(/\b(chảy máu cam|chảy máu mũi|máu cam|máu mũi|cam)\b/),
    verdict: "myth",
    belief: "Chảy máu cam thì ngửa cổ ra sau, nằm ngửa hoặc nhét giấy vào mũi.",
    folk: [],
    science: [{ text: "NHS hướng dẫn ngồi xuống, NGHIÊNG NGƯỜI VỀ TRƯỚC (đầu cúi về trước), há miệng thở — không phải ngửa cổ.", src: [0] }],
    how: [
      { text: "Bóp phần mềm của mũi ngay trên lỗ mũi 10–15 phút, thở bằng miệng; chườm túi đá bọc khăn lên sống mũi có thể giúp (bằng chứng yếu).", src: [0] },
      { text: "24 giờ sau khi cầm máu: đừng xì / ngoáy mũi, uống đồ nóng, rượu bia, mang vác nặng, và đừng nằm thẳng.", src: [0] },
    ],
    caution: [{ text: "Đi cấp cứu nếu chảy quá 10–15 phút, chảy nhiều, nuốt máu tới mức nôn, sau va đập đầu, thấy choáng / chóng mặt hoặc khó thở.", src: [0] }],
    topics: [{ id: "chay-mau-cam", text: "đừng ngửa cổ — nghiêng người về trước, bóp mũi 10–15 phút", src: [0], v: "myth" }],
    sources: [NHS_NOSE],
    verifiedAt: VERIFIED,
  },
  {
    id: "ran-can-hut-noc",
    name: "Rắn cắn: hút nọc, garô?",
    names: ["hút nọc", "nặn nọc", "garô", "ga rô", "buộc chặt", "rạch", "cắt vết", "đắp lá", "đắp thuốc", "chích lể"],
    ctx: VN(/\b(rắn)\b/),
    verdict: "myth",
    belief: "Rắn cắn thì rạch vết cắn, hút / nặn nọc ra, buộc garô thật chặt, đắp lá.",
    folk: [],
    science: [{ text: "NHS: KHÔNG hút hay rạch để lấy nọc; KHÔNG buộc chặt quanh chỗ bị cắn; không uống aspirin, ibuprofen (làm chảy máu nặng hơn).", src: [0] }],
    how: [
      { text: "Gọi 115 / đến viện ngay (không tự lái xe); giữ phần bị cắn càng yên càng tốt, nằm nghiêng an toàn nếu được; tháo nhẫn, nới quần áo gần vết cắn.", src: [0] },
      { text: "Nhớ màu, hoa văn con rắn hoặc chụp ảnh từ xa nếu an toàn — đừng lại gần, bắt hay đập rắn.", src: [0] },
    ],
    caution: [{ text: "Có thể uống paracetamol nếu đau; tránh aspirin, ibuprofen.", src: [0] }],
    topics: [{ id: "ran-can", text: "đừng hút nọc, rạch hay buộc garô — giữ yên chỗ bị cắn, đi viện ngay", src: [0], v: "myth" }],
    sources: [NHS_SNAKE],
    verifiedAt: VERIFIED,
  },
  {
    id: "co-giat-nhet-vat",
    name: "Co giật: nhét đũa vào miệng?",
    names: ["nhét đũa", "nhét khăn", "nhét muỗng", "nhét thìa", "cạy miệng", "nhét vào miệng", "cắn lưỡi", "giữ chặt", "đè chặt", "bấm nhân trung"],
    ctx: VN(/\b(co giật|lên cơn giật|giật kinh|kinh phong|động kinh|lên cơn)\b/),
    verdict: "myth",
    belief: "Người co giật thì nhét đũa, khăn, muỗng vào miệng cho khỏi cắn lưỡi, đè giữ chặt tay chân, bấm nhân trung.",
    folk: [],
    science: [{ text: "NHS (co giật do sốt ở trẻ): KHÔNG nhét bất cứ thứ gì vào miệng; không di chuyển hay giữ chặt; không cởi đồ hay lau nước lạnh để hạ sốt.", src: [0] }],
    how: [{ text: "Ghi giờ bắt đầu – kết thúc; lấy tay hoặc đồ mềm đỡ đầu; dẹp vật nguy hiểm xung quanh; hết cơn thì đặt nằm nghiêng an toàn, xem miệng họng có vướng gì không.", src: [0] }],
    caution: [{ text: "Gọi 115 nếu: co giật lần đầu, kéo dài hơn 5 phút, khó thở, giật một bên người, li bì hơn 1 giờ sau cơn, hoặc hơn 1 cơn trong 24 giờ.", src: [0] }],
    topics: [
      { id: "sot-co-giat", text: "đừng nhét gì vào miệng, đừng giữ chặt — đỡ đầu, ghi giờ, nằm nghiêng sau cơn", src: [0], v: "myth" },
      { id: "co-giat", text: "đừng nhét đũa / khăn vào miệng, đừng đè giữ", src: [0], v: "myth" },
    ],
    sources: [NHS_FSEIZ],
    verifiedAt: VERIFIED,
  },
  {
    id: "sot-u-chan",
    name: "Trẻ sốt: ủ chăn cho ra mồ hôi?",
    names: ["trùm chăn", "ủ chăn", "ủ ấm", "đắp chăn", "đắp mền", "trùm mền", "mặc nhiều áo", "mặc nhiều đồ", "cho ra mồ hôi", "lau nước lạnh", "tắm nước lạnh", "chườm đá", "cởi hết đồ", "lau người"],
    ctx: VN(/\b(sốt|nóng sốt|sốt cao|nóng người|hâm hấp)\b/),
    verdict: "myth",
    belief: "Trẻ sốt thì trùm chăn, mặc thật nhiều áo cho \"ra mồ hôi\"; hoặc ngược lại, cởi hết đồ rồi lau nước lạnh.",
    folk: [],
    science: [{ text: "NHS: không ủ trẻ bằng quá nhiều quần áo, chăn; cũng không cởi đồ hay lau người (lau mát) để hạ sốt.", src: [0] }],
    how: [{ text: "Cho trẻ uống nhiều nước; bé bú mẹ thì cứ cho bú.", src: [0] }],
    caution: [{ text: "Trẻ sốt mà co giật: không nhét gì vào miệng, gọi 115 nếu là lần đầu hoặc kéo dài hơn 5 phút.", src: [1] }],
    topics: [{ id: "sot-o-tre-em", text: "đừng ủ chăn hay lau nước lạnh — cho uống đủ nước, bú mẹ như thường", src: [0], v: "myth" }],
    sources: [NHS_FEVERKID, NHS_FSEIZ],
    verifiedAt: VERIFIED,
  },
  {
    id: "tieu-chay-nhin-an",
    name: "Tiêu chảy: nhịn ăn, pha sữa loãng?",
    names: ["nhịn ăn", "kiêng ăn", "pha loãng", "sữa loãng", "pha sữa loãng", "nước ngọt", "nước có ga", "coca", "nước ép", "nước trái cây", "ngưng bú", "cai sữa", "bỏ bú"],
    ctx: VN(/\b(tiêu chảy|đi ngoài|tháo dạ|ỉa chảy|đi cầu nhiều|phân lỏng|rối loạn tiêu hoá)\b/),
    verdict: "myth",
    belief: "Bị tiêu chảy thì nhịn ăn cho \"ruột nghỉ\", pha sữa loãng cho bé, ngưng bú, uống nước ngọt có ga hay nước trái cây.",
    folk: [],
    science: [
      { text: "NHS: ăn khi thấy ăn được (có thể tránh đồ béo, cay); bé vẫn bú mẹ / bú bình như thường, KHÔNG pha sữa công thức loãng hơn bình thường.", src: [0] },
      { text: "NHS: không uống nước ép trái cây, nước có ga vì có thể làm tiêu chảy nặng hơn.", src: [0] },
    ],
    how: [{ text: "Uống nhiều nước, buồn nôn thì nhấp từng ngụm; dược sĩ có thể khuyên gói bù nước (ORS / oresol).", src: [0] }],
    caution: [
      { text: "Không cho trẻ dưới 12 tuổi uống thuốc cầm tiêu chảy; trẻ dưới 16 tuổi không dùng aspirin.", src: [0] },
      { text: "Trẻ dưới 5 tuổi có dấu hiệu mất nước (ít tã ướt) thì đi khám.", src: [0] },
    ],
    topics: [
      { id: "tieu-chay", text: "đừng nhịn ăn, đừng uống nước có ga / nước ép — ăn khi ăn được, uống đủ nước, ORS", src: [0], v: "myth" },
      { id: "tieu-chay-o-tre", text: "vẫn cho bú như thường, không pha sữa loãng, không cho thuốc cầm tiêu chảy", src: [0], v: "myth" },
    ],
    sources: [NHS_DV],
    verifiedAt: VERIFIED,
  },
  {
    id: "thuy-dau-kieng-tam",
    name: "Thuỷ đậu: kiêng tắm, kiêng gió?",
    names: ["kiêng tắm", "kiêng gió", "kiêng nước", "không tắm", "tắm được không", "tắm được k", "tắm được ko", "có được tắm", "đóng kín cửa"],
    ctx: VN(/\b(thuỷ đậu|thủy đậu|trái rạ|phỏng rạ|đậu mùa)\b/),
    verdict: "myth",
    belief: "Bị thuỷ đậu (trái rạ) phải kiêng tắm, kiêng gió, kiêng nước, đóng kín cửa.",
    folk: [],
    science: [{ text: "NHS: nên tắm nước mát rồi thấm khô (đừng chà xát), mặc đồ rộng rãi.", src: [0] }],
    how: [{ text: "Cắt móng tay, đeo bao tay khi ngủ cho bé đỡ gãi — gãi dễ để lại sẹo.", src: [0] }],
    caution: [
      { text: "Không dùng ibuprofen trừ khi bác sĩ bảo (có thể gây nhiễm trùng da nặng); trẻ dưới 16 tuổi không dùng aspirin.", src: [0] },
      { text: "Nghỉ học / làm tới khi mụn đóng vảy hết (thường khoảng 5 ngày); tránh lại gần trẻ sơ sinh, bà bầu, người suy giảm miễn dịch.", src: [0] },
    ],
    topics: [{ id: "thuy-dau", text: "không cần kiêng tắm — tắm nước mát, thấm khô, mặc đồ rộng; không dùng ibuprofen", src: [0], v: "myth" }],
    sources: [NHS_POX],
    verifiedAt: VERIFIED,
  },
  {
    id: "vang-da-phoi-nang",
    name: "Bé vàng da: phơi nắng?",
    names: ["phơi nắng", "tắm nắng", "ra nắng", "cho ra nắng", "đem phơi"],
    ctx: VN(/\b(vàng da|vàng mắt|da vàng)\b/),
    verdict: "myth",
    belief: "Bé sơ sinh vàng da thì đem phơi, tắm nắng cho hết vàng.",
    folk: [],
    science: [
      { text: "Hướng dẫn của NHS không có phơi nắng; ánh sáng chỉ giúp NHÌN màu vàng rõ hơn (trên da sẫm màu thì khó thấy hơn).", src: [0] },
      { text: "Cho bú đều giúp vàng da mau hết — khoảng 8–12 cữ mỗi ngày, bé ngủ li bì thì đánh thức cho bú.", src: [0] },
    ],
    caution: [
      { text: "Gọi 115 / đi cấp cứu nếu vàng da trong 24 giờ đầu, hoặc bé li bì khó đánh thức, bỏ bú, mềm nhũn / co cứng, sốt từ 38°C hoặc thân nhiệt từ 36°C trở xuống, không có tã ướt, khó thở.", src: [0] },
      { text: "Khám gấp nếu bé trên 24 giờ tuổi vàng da không đỡ / nặng hơn, nước tiểu vàng sẫm, phân bạc màu.", src: [0] },
    ],
    topics: [{ id: "vang-da-so-sinh", text: "nguồn không khuyên phơi nắng — cho bú đều 8–12 cữ/ngày; vàng da trong 24 giờ đầu phải đi cấp cứu", src: [0], v: "myth" }],
    sources: [NHS_JAUN],
    verifiedAt: VERIFIED,
  },
  {
    id: "nan-mun",
    name: "Nặn mụn, chà mặt thật mạnh?",
    names: ["nặn mụn", "nặn", "cạy mụn", "lể mụn", "bóp mụn", "chà mạnh", "chà xát", "đồ nóng", "đồ ăn nóng", "nóng trong"],
    ctx: VN(/\b(mụn|trứng cá)\b/),
    verdict: "myth",
    belief: "Mụn thì nặn cho mau khỏi, rửa mặt chà thật mạnh cho sạch; kiêng đồ \"nóng\" (xoài, nhãn, vải…).",
    folk: [],
    science: [{ text: "NHS: không nặn hay cạy mụn vì dễ để lại sẹo; không chà mạnh vì làm kích ứng, mụn có thể nặng hơn.", src: [0] }],
    how: [{ text: "Rửa mặt ngày 2 lần bằng sữa rửa mặt dịu nhẹ; tẩy trang vào cuối ngày.", src: [0] }],
    caution: [],
    unverified: ["đồ \"nóng\" như xoài, nhãn, vải làm nổi mụn"],
    topics: [{ id: "mun-trung-ca", text: "đừng nặn mụn (dễ sẹo), đừng chà mạnh — rửa mặt nhẹ ngày 2 lần", src: [0], v: "myth" }],
    sources: [NHS_ACNE],
    verifiedAt: VERIFIED,
  },
  {
    id: "con-trung-can",
    name: "Ong đốt, côn trùng cắn: bôi vôi, kem đánh răng?",
    names: ["bôi vôi", "vôi", "kem đánh răng", "dầu gió", "nước miếng", "nước bọt", "nhíp", "gắp ngòi", "nhổ ngòi", "baking soda", "dầu cù là", "chanh"],
    ctx: VN(/\b(ong|côn trùng|kiến|muỗi|rết|bọ|sâu róm|nhện)\b.*\b(đốt|cắn|chích)\b|\b(đốt|cắn|chích)\b.*\b(ong|côn trùng|kiến|muỗi|rết|bọ|sâu róm|nhện)\b/),
    verdict: "myth",
    belief: "Ong đốt, côn trùng cắn thì bôi vôi, kem đánh răng, dầu gió, nước miếng; lấy nhíp gắp ngòi.",
    folk: [],
    science: [{ text: "NHS dặn không dùng mẹo tại nhà (ví dụ baking soda) để chữa vết cắn, đốt; không gắp ngòi bằng nhíp vì có thể bóp thêm nọc vào.", src: [0] }],
    how: [{ text: "Cạo ngòi theo chiều ngang bằng móng tay / mép thẻ cứng, rửa xà phòng và nước; chườm lạnh (túi đá bọc khăn) ít nhất 20 phút, kê cao chỗ bị đốt; đừng gãi.", src: [0] }],
    caution: [{ text: "Có thể dùng paracetamol hoặc ibuprofen cho đỡ đau, thuốc kháng histamin uống cho đỡ ngứa — hỏi dược sĩ.", src: [0] }],
    topics: [{ id: "con-trung-dot", text: "đừng bôi vôi, kem đánh răng hay gắp ngòi bằng nhíp — cạo ngòi, rửa sạch, chườm lạnh", src: [0], v: "myth" }],
    sources: [NHS_BITE],
    verifiedAt: VERIFIED,
  },
  {
    id: "cho-can-thuoc-nam",
    name: "Chó, mèo cắn: đắp lá, uống thuốc nam?",
    names: ["đắp lá", "thuốc nam", "thuốc lá cây", "bốc thuốc", "thầy lang", "chữa dại", "theo dõi con chó", "theo dõi chó", "không cần tiêm", "không tiêm"],
    ctx: VN(/\b(chó|mèo|dơi|khỉ|chuột)\b.*\b(cắn|cào|liếm)\b|\b(cắn|cào)\b.*\b(chó|mèo|dơi|khỉ)\b|\bdại\b/),
    verdict: "myth",
    belief: "Chó, mèo cắn thì đắp lá, uống thuốc nam, \"theo dõi con chó\" rồi mới tính chuyện tiêm.",
    folk: [],
    science: [{ text: "WHO: bệnh dại một khi đã có triệu chứng thì gần như tử vong 100%.", src: [0] }],
    how: [{ text: "Rửa vết thương ngay bằng xà phòng và nước ít nhất 15 phút rồi đi khám ngay — tiêm phòng dại sau phơi nhiễm (vắc xin, và huyết thanh khi cần) chặn được virus.", src: [0] }],
    caution: [],
    topics: [{ id: "benh-dai", text: "đừng đắp lá / uống thuốc nam thay tiêm — rửa xà phòng 15 phút, đi tiêm phòng dại ngay", src: [0], v: "myth" }],
    sources: [WHO_RABIES],
    verifiedAt: VERIFIED,
  },
  {
    id: "dau-mat-do",
    name: "Đau mắt đỏ: nhỏ sữa mẹ, nước lá, nước tiểu?",
    names: ["sữa mẹ", "nhỏ sữa", "nước lá", "lá trầu", "nước trà", "xông mắt", "nhỏ chanh", "nước muối tự pha", "nước tiểu", "nhỏ nước tiểu", "đắp lá lên mắt"],
    ctx: VN(/\b(mắt|đau mắt|mắt đỏ|viêm kết mạc|ghèn|dử mắt)\b/),
    verdict: "myth",
    belief: "Đau mắt đỏ thì nhỏ sữa mẹ, nước tiểu, nước lá (lá trầu…), nước trà, nước chanh, đắp lá lên mắt, xông mắt.",
    folk: [],
    science: [{ text: "Cách tự chăm sóc NHS hướng dẫn chỉ gồm: lau mi bằng bông sạch nhúng nước đun sôi để nguội (mỗi mắt một miếng) và chườm khăn mát vài phút.", src: [0] }],
    caution: [{ text: "Không dụi mắt, không dùng chung khăn, gối; tạm ngưng kính áp tròng tới khi khỏi.", src: [0] }],
    unverified: ["nhỏ sữa mẹ, nước tiểu, nước lá, nước trà, nước chanh vào mắt (hay đắp lá lên mắt) giúp mau khỏi"],
    topics: [{ id: "viem-ket-mac", text: "đừng nhỏ sữa mẹ, nước tiểu hay nước lá vào mắt — lau mi bằng nước sôi để nguội, chườm khăn mát", src: [0], v: "myth" }],
    sources: [NHS_CONJ],
    verifiedAt: VERIFIED,
  },
  {
    id: "cam-vitamin-c",
    name: "Cảm: uống thật nhiều vitamin C, nước cam?",
    names: ["vitamin c", "nước cam", "uống cam", "c sủi", "viên sủi c", "uống chanh", "echinacea"],
    ctx: VN(/\b(cảm|cúm|sổ mũi|nghẹt mũi|ho|đau họng|đề kháng|miễn dịch)\b/),
    verdict: "myth",
    belief: "Bị cảm thì uống thật nhiều vitamin C, nước cam, viên sủi C cho mau khỏi.",
    folk: [],
    science: [{ text: "NHS: có rất ít bằng chứng vitamin C, echinacea hay tỏi giúp phòng cảm lạnh hoặc mau khỏi.", src: [0] }],
    how: [{ text: "Nghỉ ngơi, uống đủ nước, ăn uống lành mạnh; súc họng nước muối, chanh mật ong ấm cho dịu họng (không cho bé dưới 1 tuổi ăn mật ong).", src: [0] }],
    caution: [{ text: "Kháng sinh không chữa cảm lạnh (do virus).", src: [0] }],
    topics: [{ id: "cam-lanh", text: "rất ít bằng chứng vitamin C giúp phòng hay mau khỏi cảm", src: [0], v: "myth" }],
    sources: [NHS_COLD],
    verifiedAt: VERIFIED,
  },
  // ── 24/10 (theo ý Kir: thêm mẹo về trái cây, lá, rau) — mỗi ý đối chiếu trang nguồn đọc ngày 24/10/2026 ──
  {
    id: "buoi-thuoc",
    name: "Bưởi chùm / bưởi và thuốc uống",
    names: ["bưởi chùm", "nước bưởi", "nước ép bưởi", "ăn bưởi", "bưởi", "grapefruit", "cam seville", "quýt tangelo"],
    verdict: "risky",
    folk: [{ text: "Bưởi, nước ép bưởi hay được xem là trái cây tốt, giải nhiệt, hỗ trợ giảm cân và hạ mỡ máu.", src: [0] }],
    science: [
      { text: "FDA: bưởi chùm và nước ép bưởi chùm có thể làm thay đổi lượng thuốc vào máu — với nhiều thuốc là tăng lên (dễ tác dụng phụ), với vài thuốc lại giảm đi (kém hiệu quả).", src: [0] },
      { text: "Thuốc hay bị ảnh hưởng: vài thuốc mỡ máu nhóm statin, vài thuốc huyết áp, thuốc chống thải ghép, thuốc chống lo âu, thuốc nhịp tim, thuốc dị ứng — không phải mọi thuốc trong các nhóm này.", src: [0] },
      { text: "Bưởi (pomelo), cam Seville, quýt tangelo có thể gây tác động tương tự bưởi chùm.", src: [0] },
    ],
    caution: [
      { text: "Đang uống thuốc thường xuyên thì hỏi bác sĩ / dược sĩ xem thuốc của mình có kỵ bưởi không, và ăn được bao nhiêu.", src: [0] },
      { text: "Xem tờ hướng dẫn sử dụng thuốc — thuốc kỵ bưởi thường ghi rõ.", src: [0] },
    ],
    topics: [
      { id: "mo-mau-cao", text: "đang uống thuốc mỡ máu (statin) thì hỏi dược sĩ trước khi ăn bưởi chùm / bưởi — có thể làm tăng tác dụng phụ của thuốc", src: [0], v: "risky" },
      { id: "tang-huyet-ap", text: "vài thuốc huyết áp kỵ bưởi chùm / bưởi — hỏi dược sĩ trước khi ăn nhiều", src: [0], v: "risky" },
    ],
    sources: [{ title: "Grapefruit Juice and Some Drugs Don't Mix (nội dung cập nhật 01/07/2021)", publisher: "FDA (Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ)", url: "https://www.fda.gov/consumers/consumer-updates/grapefruit-juice-and-some-drugs-dont-mix" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "dua-bromelain",
    name: "Dứa (thơm, khóm) — bromelain",
    names: ["dứa", "trái dứa", "quả dứa", "nước dứa", "trái thơm", "trái khóm", "bromelain", "lõi dứa"],
    ctx: VN(/\b(tác dụng|công dụng|tốt|hại|chữa|trị|giúp|tiêu hoá|tiêu hóa|xoang|viêm|sưng|răng khôn|bầu|mang thai|sảy thai|uống|ăn|enzyme|men)\b/),
    verdict: "mixed",
    folk: [{ text: "Dứa được truyền nhau là giúp tiêu hoá, giảm sưng viêm; bromelain (men trong thân và quả dứa) được bán làm thực phẩm chức năng.", src: [0] }],
    science: [
      { text: "Bromelain uống: vài nghiên cứu cho thấy có thể giảm đau, sưng sau nhổ răng khôn — bằng chứng còn hạn chế.", src: [0] },
      { text: "Viêm xoang, thoái hoá khớp, đau cơ sau tập: chưa đủ nghiên cứu chất lượng để khuyên dùng.", src: [0] },
      { text: "Dạng bôi: thuốc chứa bromelain được FDA duyệt năm 2022 để làm sạch mô hoại tử ở bỏng nặng (thuốc kê đơn, dùng ở bệnh viện).", src: [0] },
    ],
    caution: [
      { text: "Bromelain uống thường dung nạp tốt; tác dụng phụ hay gặp là khó chịu bụng, tiêu chảy.", src: [0] },
      { text: "Mang thai, cho con bú: chưa rõ bromelain dạng thực phẩm chức năng có an toàn không — hỏi bác sĩ trước.", src: [0] },
      { text: "Đang dùng thuốc thì hỏi bác sĩ trước khi dùng bromelain — một số thảo dược tương tác có hại với thuốc.", src: [0] },
    ],
    topics: [
      { id: "viem-xoang", text: "bromelain chưa đủ bằng chứng giúp viêm xoang", src: [0], v: "unclear" },
      { id: "thoai-hoa-khop", text: "bromelain cho đau khớp: rất ít nghiên cứu, chưa rõ hiệu quả", src: [0], v: "unclear" },
    ],
    sources: [nccih("bromelain", "Bromelain", "11/2024")],
    verifiedAt: "2026-10-24",
  },
  {
    id: "luu",
    name: "Lựu (nước ép lựu)",
    names: ["lựu", "trái lựu", "quả lựu", "nước lựu", "nước ép lựu", "hạt lựu", "vỏ lựu", "pomegranate"],
    verdict: "mixed",
    folk: [{ text: "Dân gian dùng lựu cho giun sán, tiêu chảy, đau họng (uống, bôi, súc miệng); nay hay được quảng bá cho huyết áp, tim mạch, tiểu đường.", src: [0] }],
    science: [
      { text: "Huyết áp: nước ép / chiết xuất lựu có thể giúp hạ huyết áp, nhưng cần thêm nghiên cứu để khẳng định.", src: [0] },
      { text: "Đường huyết: giảm nhẹ trong vài nghiên cứu. Mỡ máu: chưa thấy tác dụng rõ.", src: [0] },
    ],
    caution: [
      { text: "Nước ép lựu được xem là an toàn; có người bị khó chịu tiêu hoá, đã có ca dị ứng.", src: [0] },
      { text: "Rễ, thân, VỎ lựu dùng lượng nhiều có thể không an toàn vì chứa chất có hại.", src: [0] },
      { text: "Đang dùng thuốc thì hỏi bác sĩ trước khi dùng lựu dạng chiết xuất / thực phẩm chức năng.", src: [0] },
    ],
    topics: [
      { id: "tang-huyet-ap", text: "nước ép lựu có thể giúp hạ huyết áp chút ít, chưa chắc chắn — không thay thuốc", src: [0] },
      { id: "tieu-duong-type-2", text: "lựu làm giảm đường huyết rất ít trong nghiên cứu, không thay điều trị", src: [0], v: "unclear" },
    ],
    sources: [nccih("pomegranate", "Pomegranate", "04/2025")],
    verifiedAt: "2026-10-24",
  },
  {
    id: "hat-lanh",
    name: "Hạt lanh, dầu hạt lanh",
    names: ["hạt lanh", "dầu hạt lanh", "bột hạt lanh", "flaxseed", "hạt lanh nâu", "hạt lanh vàng"],
    verdict: "mixed",
    folk: [{ text: "Hạt lanh được quảng bá tốt cho tim, não, miễn dịch (có omega-3 dạng ALA); xưa được dùng như thuốc nhuận tràng.", src: [0] }],
    science: [
      { text: "Một thử nghiệm cho thấy chất nhầy hạt lanh pha nước có thể hỗ trợ giảm cân ở người thừa cân; dầu hạt lanh và chiết xuất lignan thì không thấy giúp.", src: [0] },
      { text: "Tiểu đường type 2: chưa rõ có giúp kiểm soát đường huyết không. Tiểu đường thai kỳ: vài nghiên cứu sơ bộ.", src: [0] },
    ],
    caution: [
      { text: "Không ăn hạt lanh sống hoặc hạt chưa chín — có thể chứa chất độc.", src: [0] },
      { text: "Dùng nhiều có thể đầy bụng, chướng hơi, tiêu chảy.", src: [0] },
      { text: "Đang dùng thuốc chống đông / chống kết tập tiểu cầu thì hỏi bác sĩ trước. Mang thai: có nghiên cứu cho là có thể không an toàn.", src: [0] },
    ],
    topics: [
      { id: "beo-phi", text: "chất nhầy hạt lanh có thể hỗ trợ giảm cân chút ít (một thử nghiệm); dầu hạt lanh thì không", src: [0] },
      { id: "tieu-duong-type-2", text: "hạt lanh: chưa rõ có giúp kiểm soát đường huyết", src: [0], v: "unclear" },
    ],
    sources: [nccih("flaxseed-and-flaxseed-oil", "Flaxseed and Flaxseed Oil", "02/2025")],
    verifiedAt: "2026-10-24",
  },
  {
    id: "ca-rot-mat",
    name: "Ăn cà rốt cho sáng mắt?",
    names: ["cà rốt", "ăn cà rốt", "nước ép cà rốt", "beta carotene", "beta-carotene", "vitamin a"],
    ctx: VN(/\b(mắt|sáng mắt|thị lực|cận|nhìn|quáng gà|da vàng|vàng da|cam|bổ mắt|tốt cho mắt)\b/),
    verdict: "myth",
    belief: "Ăn thật nhiều cà rốt (vitamin A) thì mắt sáng hơn, đỡ cận.",
    folk: [],
    science: [
      { text: "Vitamin A cần cho thị lực bình thường; THIẾU vitamin A làm khó nhìn trong tối, lâu ngày có thể mù — hay gặp ở trẻ nhỏ tại nước đang phát triển.", src: [0] },
      { text: "Rau củ quả màu cam, vàng, xanh đậm (cà rốt, khoai lang, rau bina, bí đỏ, xoài) có beta-carotene — cơ thể đổi thành vitamin A.", src: [0] },
      { text: "Nguồn này không nói ăn thêm cà rốt làm người đủ chất nhìn rõ hơn; cận thị thì cần đi khám mắt, đeo kính đúng độ.", src: [0] },
    ],
    caution: [
      { text: "Ăn nhiều beta-carotene có thể làm da vàng cam — vô hại, hết khi bớt ăn.", src: [0] },
      { text: "Người hút thuốc / từng hút thuốc uống viên beta-carotene liều cao có nguy cơ ung thư phổi cao hơn.", src: [0] },
      { text: "Vitamin A dạng có sẵn (viên uống, gan động vật) dùng quá nhiều gây hại; bà bầu tránh viên vitamin A liều cao vì có thể gây dị tật thai.", src: [0] },
    ],
    topics: [],
    sources: [{ title: "Vitamin A and Carotenoids — Fact Sheet for Consumers (cập nhật 10/03/2025)", publisher: "ODS (Văn phòng Thực phẩm bổ sung – NIH Hoa Kỳ)", url: "https://ods.od.nih.gov/factsheets/VitaminA-Consumer/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "rau-ngot-song",
    name: "Rau ngót ăn sống / xay ép nước",
    names: ["rau ngót sống", "nước rau ngót sống", "nước ép rau ngót", "ép rau ngót", "xay rau ngót", "sinh tố rau ngót", "uống nước rau ngót", "rau ngót giảm cân", "ăn sống rau ngót", "katuk"],
    verdict: "danger",
    folk: [{ text: "Rau ngót được dùng làm rau ăn và để lợi sữa; có người xay / ép rau ngót sống uống để giảm cân.", src: [0] }],
    science: [
      { text: "Ăn quá nhiều lá rau ngót TƯƠI SỐNG có thể gây viêm tiểu phế quản tắc nghẽn — bệnh phổi có thể tử vong; người bị đa số là phụ nữ trẻ và trung niên.", src: [0] },
      { text: "Rau ngót nấu chín có thể không gây độc như vậy. Tác dụng lợi sữa: các nghiên cứu trên người còn nhiều thiếu sót, chưa chứng minh chắc chắn.", src: [0] },
    ],
    caution: [
      { text: "Không xay / ép rau ngót sống uống, nhất là uống đều để giảm cân — ăn rau ngót nấu chín như món ăn thường ngày.", src: [0] },
      { text: "Đã từng uống nhiều nước rau ngót sống mà bị khó thở, ho kéo dài, khò khè → đi khám chuyên khoa hô hấp và kể rõ cho bác sĩ.", src: [0] },
    ],
    topics: [{ id: "an-uong-khi-cho-con-bu", text: "rau ngót lợi sữa: bằng chứng còn yếu; chỉ ăn nấu chín, không ăn sống / ép nước", src: [0], v: "unclear" }],
    sources: [{ title: "Sauropus androgynus — Drugs and Lactation Database (LactMed), sửa đổi 15/08/2026", publisher: "NCBI Bookshelf (Thư viện Y khoa Quốc gia Hoa Kỳ – NIH)", url: "https://www.ncbi.nlm.nih.gov/books/NBK603839/" }],
    verifiedAt: "2026-10-24",
  },
  // ── 24/10 (đợt 2) — theo ý Kir: "thêm mẹo nhân gian, nhất là mấy bệnh phổ biến". Ưu tiên mẹo hay làm SAI mà gây hại
  //    (xoa rượu khi bong gân, móc họng khi ngộ độc, chích máu khi đột quỵ, ủ ấm khi say nắng), rồi mẹo đúng có nguồn.
  {
    id: "bong-gan-xoa-ruou",
    name: "Bong gân: xoa rượu, dầu nóng, bóp, chườm nóng?",
    names: ["xoa rượu", "bóp rượu", "thoa rượu", "rượu thuốc", "rượu gừng", "dầu nóng", "dầu gió", "cao nóng", "chườm nóng", "đắp nóng", "ngâm nước nóng", "xoa bóp", "bóp chân", "massage", "mát xa", "đắp muối", "rang muối"],
    ctx: VN(/\b(bong gân|trật chân|trẹo chân|lật cổ chân|sái chân|trẹo cổ chân|giãn dây chằng|căng cơ|trật khớp cổ chân|sưng mắt cá)\b/),
    verdict: "myth",
    belief: "Bong gân, trẹo chân thì xoa rượu thuốc, dầu nóng, bóp mạnh hoặc chườm nóng cho \"tan máu bầm\".",
    folk: [],
    science: [{ text: "NHS: vài ngày đầu tránh nóng (tắm nước nóng, túi chườm nóng), rượu và xoa bóp — vì làm sưng nhiều hơn.", src: [0] }],
    how: [
      { text: "Vài ngày đầu: bảo vệ chỗ đau, nghỉ (không dồn sức nặng lên), chườm lạnh bằng túi đá bọc khăn từng đợt ngắn, băng ép vừa phải ban ngày, kê cao chỗ đau.", src: [0] },
    ],
    caution: [
      { text: "Đi cấp cứu nếu lúc bị nghe tiếng \"rắc\", chỗ đau biến dạng / lệch, tê, châm chích, hoặc da tím tái, lạnh.", src: [0] },
      { text: "Đau dữ dội, sưng to, không đứng / đi được, hoặc tự chữa mà không đỡ → đi khám.", src: [0] },
    ],
    topics: [{ id: "bong-gan", text: "đừng xoa rượu, dầu nóng, bóp hay chườm nóng mấy ngày đầu — chườm lạnh, nghỉ, băng ép, kê cao", src: [0], v: "myth" }],
    sources: [{ title: "Sprains and strains", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/sprains-and-strains/", reviewed: "2024-04-23" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "ngo-doc-gay-non",
    name: "Nuốt phải chất độc: móc họng cho nôn, uống sữa?",
    names: ["móc họng", "gây nôn", "cho nôn", "cho ói", "móc cho ói", "bắt nôn", "làm cho nôn", "uống sữa", "cho uống sữa", "uống nước muối", "lòng trắng trứng", "trứng sống", "nước đậu xanh"],
    ctx: VN(/\b(ngộ độc|nuốt nhầm|uống nhầm|nuốt phải|thuốc chuột|thuốc trừ sâu|thuốc diệt cỏ|thuốc sâu|nước tẩy|nước rửa chén|nước javel|chất tẩy|dầu hoả|xăng|uống quá liều|uống cả vỉ)\b/),
    verdict: "myth",
    belief: "Nuốt phải thuốc chuột, thuốc trừ sâu, chất tẩy… thì móc họng cho nôn ra, hoặc cho uống sữa, lòng trắng trứng, nước muối để \"giải độc\".",
    folk: [],
    science: [
      { text: "NHS: KHÔNG tìm cách làm người đó nôn — họ có thể bị sặc, ngưng thở.", src: [0] },
      { text: "NHS: không cho người đó ăn hay uống gì.", src: [0] },
    ],
    how: [
      { text: "Gọi cấp cứu 115 ngay. Mang theo vỏ chai, bao bì hoặc thứ đã nuốt để bác sĩ biết là chất gì.", src: [0] },
      { text: "Bất tỉnh mà còn thở → đặt nằm nghiêng an toàn; không thở → làm hồi sức tim phổi (CPR). Ở bên cạnh, theo dõi hơi thở liên tục.", src: [0] },
    ],
    caution: [{ text: "Nếu người đó tự nôn, có thể giữ lại một ít chất nôn cho nhân viên y tế xem.", src: [0] }],
    topics: [{ id: "ngo-doc", text: "đừng móc họng gây nôn, đừng cho ăn uống gì — gọi 115, mang theo bao bì chất đã nuốt", src: [0], v: "myth" }],
    sources: [{ title: "Poisoning", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/poisoning/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "dot-quy-chich-mau",
    name: "Đột quỵ: chích máu đầu ngón tay, cạo gió rồi đợi?",
    names: ["chích máu", "chích đầu ngón tay", "chích ngón tay", "chích 10 đầu ngón tay", "chích mười đầu ngón tay", "nặn máu", "lể máu", "giật tai", "kéo tai", "cạo gió", "đánh gió", "an cung", "an cung ngưu hoàng", "đợi xem", "chờ xem", "chờ cho đỡ", "nằm nghỉ cho đỡ"],
    ctx: VN(/\b(đột quỵ|tai biến|méo miệng|méo mặt|lệch miệng|liệt nửa người|yếu nửa người|xệ mặt)\b/),
    verdict: "myth",
    belief: "Thấy người méo miệng, yếu tay chân thì chích máu mười đầu ngón tay, giật tai, cạo gió, cho uống thuốc rồi chờ xem có đỡ không.",
    folk: [],
    science: [
      { text: "NHS: đột quỵ là cấp cứu. Nhớ FAST — Face (mặt méo), Arms (tay yếu, không giơ lên được), Speech (nói khó, nói ngọng), Time (gọi cấp cứu ngay).", src: [0] },
      { text: "NHS: dù triệu chứng tự hết vẫn phải đi cấp cứu ngay — đừng chờ xem có trở lại không.", src: [0] },
    ],
    how: [{ text: "Gọi 115 ngay khi nghi đột quỵ, nhớ giờ bắt đầu có triệu chứng — đừng mất thời gian làm mẹo trước.", src: [0] }],
    caution: [],
    topics: [{ id: "dot-quy", text: "đừng chích máu, cạo gió rồi chờ — nhớ FAST, gọi 115 ngay, kể cả khi triệu chứng tự hết", src: [0], v: "myth" }],
    sources: [{ title: "Symptoms of a stroke", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/stroke/symptoms/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "say-nang-cao-gio",
    name: "Say nắng: cạo gió, ủ ấm, xông?",
    names: ["cạo gió", "đánh gió", "đánh cảm", "giật gió", "ủ ấm", "đắp chăn", "trùm chăn", "xông", "xông hơi", "uống nước gừng", "uống rượu", "mặc thêm áo"],
    ctx: VN(/\b(say nắng|sốc nhiệt|cảm nắng|trúng nắng|kiệt sức vì nóng|kiệt sức vì nắng)\b/),
    verdict: "myth",
    belief: "Say nắng, cảm nắng thì cạo gió, đánh cảm, ủ chăn hay xông cho ra mồ hôi.",
    folk: [],
    science: [{ text: "NHS: say nắng / kiệt sức vì nóng cần làm MÁT cơ thể — đưa vào chỗ mát, cởi bớt quần áo, cho uống nhiều nước.", src: [0] }],
    how: [
      { text: "Làm mát da bằng nước mát và quạt; đặt túi lạnh bọc khăn ở nách hoặc cổ. Có thể cho uống oresol hoặc nước thể thao pha với nước.", src: [0] },
    ],
    caution: [
      { text: "Gọi 115 nếu sau 30 phút làm mát, nghỉ, uống nước vẫn không đỡ; hoặc sốt rất cao, da nóng mà không ra mồ hôi, thở nhanh, lơ mơ, co giật, ngất.", src: [0] },
    ],
    topics: [{ id: "say-nang", text: "đừng ủ ấm, xông hay cạo gió — làm mát: chỗ mát, cởi bớt đồ, nước mát + quạt, uống nước", src: [0], v: "myth" }],
    sources: [{ title: "Heat exhaustion and heatstroke", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/heat-exhaustion-heatstroke/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "trao-nguoc-ke-goi",
    name: "Trào ngược: kê thật nhiều gối khi ngủ?",
    names: ["kê gối", "kê cao gối", "gối cao", "nhiều gối", "chồng gối", "thêm gối", "kê đầu cao", "nằm đầu cao", "kê cao đầu giường", "ăn xong nằm", "ăn no nằm", "nằm sau khi ăn", "ăn khuya"],
    ctx: VN(/\b(trào ngược|ợ nóng|ợ chua|nóng rát ngực|gerd|trào axit)\b/),
    verdict: "myth",
    belief: "Bị trào ngược, ợ nóng thì kê thật nhiều gối cho đầu cao khi ngủ.",
    folk: [],
    science: [{ text: "NHS: không chồng thêm gối vì có thể làm nặng hơn — thay vào đó kê cao ĐẦU GIƯỜNG (gạch, sách kê dưới chân giường) để cả nửa người trên dốc lên.", src: [0] }],
    how: [
      { text: "Ăn nhiều bữa nhỏ thay vì vài bữa lớn; không ăn trong vòng 3–4 tiếng trước khi ngủ; tránh món làm mình ợ nóng.", src: [0] },
      { text: "Tránh quần áo bó bụng, bỏ thuốc lá, hạn chế rượu bia; giảm cân nếu thừa cân; dược sĩ có thể tư vấn thuốc kháng acid.", src: [0] },
    ],
    caution: [{ text: "Đang dùng thuốc bác sĩ kê thì đừng tự ngưng — hỏi bác sĩ trước.", src: [0] }],
    topics: [{ id: "trao-nguoc-da-day-thuc-quan", text: "đừng chồng thêm gối — kê cao đầu giường, ăn bữa nhỏ, không ăn 3–4 tiếng trước khi ngủ", src: [0], v: "myth" }],
    sources: [{ title: "Heartburn and acid reflux", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/heartburn-and-acid-reflux/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "mat-ngu-uong-ruou",
    name: "Mất ngủ: uống chút rượu, ngủ bù ban ngày?",
    names: ["uống rượu", "chút rượu", "ít rượu", "rượu cho dễ ngủ", "nhấp rượu", "ly rượu", "chén rượu", "rượu vang", "uống bia", "lon bia", "ngủ bù", "ngủ trưa", "ngủ nướng", "lướt điện thoại", "xem điện thoại", "uống cà phê"],
    ctx: VN(/\b(mất ngủ|khó ngủ|trằn trọc|không ngủ được|khó vào giấc|thức trắng)\b/),
    verdict: "myth",
    belief: "Khó ngủ thì làm ly rượu cho dễ ngủ; đêm ngủ kém thì ban ngày ngủ bù, sáng ngủ nướng.",
    folk: [],
    science: [
      { text: "NHS: không uống rượu, trà, cà phê hay hút thuốc trong vòng 6 tiếng trước khi ngủ.", src: [0] },
      { text: "NHS: không ngủ ngày, và đừng ngủ nướng sau đêm ngủ kém — giữ giờ ngủ như thường.", src: [0] },
    ],
    how: [
      { text: "Chỉ lên giường khi buồn ngủ, dậy cùng giờ mỗi ngày; thư giãn ít nhất 1 tiếng trước khi ngủ; phòng ngủ tối, yên tĩnh.", src: [0] },
      { text: "Tập thể dục ban ngày (không tập trong 4 tiếng trước khi ngủ); không ăn bữa lớn khuya; tránh xem điện thoại, TV ngay trước khi ngủ.", src: [0] },
    ],
    caution: [{ text: "Buồn ngủ thì đừng lái xe.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "đừng uống rượu cho dễ ngủ hay ngủ bù ban ngày — giữ giờ dậy cố định, tránh cà phê / rượu trước ngủ", src: [0], v: "myth" }],
    sources: [{ title: "Insomnia", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/insomnia/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "dau-bung-kinh-chuom-am",
    name: "Đau bụng kinh: chườm ấm, xoa bụng",
    names: ["chườm ấm", "chườm nóng", "túi chườm", "chai nước nóng", "túi nước nóng", "miếng dán nóng", "tắm nước ấm", "tắm nước nóng", "xoa bụng", "massage bụng", "xoa lưng", "tập yoga", "yoga", "đi bộ"],
    ctx: VN(/\b(đau bụng kinh|đau kinh|hành kinh|tới tháng|đến tháng|tới kỳ|đến kỳ|ngày đèn đỏ|bị kinh|có kinh)\b/),
    tip: true,
    verdict: "help",
    folk: [{ text: "Mẹo hay truyền: chườm ấm bụng, xoa bụng, tắm nước ấm cho đỡ đau bụng kinh.", src: [0] }],
    science: [{ text: "NHS khuyên tự làm được: tắm nước ấm, chườm túi nóng / chai nước nóng bọc khăn lên bụng, xoa bụng và lưng, vận động nhẹ (yoga, bơi, đi bộ, đạp xe).", src: [0] }],
    how: [{ text: "Có thể dùng thuốc giảm đau không kê đơn theo hướng dẫn trên hộp hoặc hỏi dược sĩ; bớt rượu bia, bỏ thuốc lá cũng có thể giúp.", src: [0] }],
    caution: [
      { text: "Bọc khăn khi chườm, đừng áp thẳng chai nước nóng lên da.", src: [0] },
      { text: "Đi khám nếu đau ngày càng nặng, ra nhiều hơn / không đều, đau đến mức không sinh hoạt được, đau khi quan hệ, ra máu giữa kỳ.", src: [0] },
    ],
    topics: [{ id: "dau-bung-kinh", text: "chườm ấm (bọc khăn), xoa bụng, tắm nước ấm, vận động nhẹ đều được khuyên làm", src: [0], v: "help" }],
    sources: [{ title: "Period pain", publisher: "NHS (Anh)", url: "https://www.nhs.uk/symptoms/period-pain/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "nac-cut-meo",
    name: "Nấc cụt: nín thở, uống nước lạnh, ngậm đường",
    names: ["nín thở", "uống nước lạnh", "uống nước đá", "ngậm đường", "ăn đường", "nuốt đường", "cắn chanh", "ngậm chanh", "nếm giấm", "thổi túi giấy", "thở vào túi", "co gối", "hù", "làm giật mình"],
    ctx: VN(/\b(nấc cụt|bị nấc|nấc hoài|nấc mãi|nấc liên tục|nấc quá|đang nấc|cứ nấc|hay nấc|hết nấc|cắt nấc)\b/),
    tip: true,
    verdict: "mixed",
    folk: [{ text: "Mẹo hay truyền: nín thở, uống nước lạnh, ngậm một thìa đường, cắn chanh, thở vào túi giấy.", src: [0] }],
    science: [{ text: "NHS: nhiều người thấy các mẹo này có ích, nhưng không có bằng chứng là hiệu quả với mọi người.", src: [0] }],
    how: [{ text: "NHS liệt kê: thở vào túi giấy (không trùm lên đầu), co gối sát ngực rồi cúi người về trước, nhấp nước thật lạnh, nuốt một thìa đường, cắn chanh / nếm giấm, nín thở một lúc.", src: [0] }],
    caution: [{ text: "Đi khám nếu nấc kéo dài hơn 48 tiếng, hoặc hay bị lại đến mức ảnh hưởng sinh hoạt.", src: [0] }],
    topics: [{ id: "nac-cut", text: "nín thở, nhấp nước lạnh, ngậm đường — có người thấy đỡ, chưa chắc hiệu quả với mọi người; quá 48 tiếng thì đi khám", src: [0], v: "mixed" }],
    sources: [{ title: "Hiccups", publisher: "NHS (Anh)", url: "https://www.nhs.uk/symptoms/hiccups/" }],
    verifiedAt: "2026-10-24",
  },
  {
    id: "tao-bon-an-uong",
    name: "Táo bón: ăn rau, trái cây, uống nhiều nước",
    names: ["ăn rau", "ăn nhiều rau", "rau xanh", "ăn trái cây", "trái cây", "hoa quả", "uống nhiều nước", "uống nước nhiều", "yến mạch", "cám lúa mì", "chất xơ", "kê chân", "ghế kê chân", "ngồi xổm", "đi bộ"],
    ctx: VN(/\b(táo bón|bị bón|khó đi cầu|khó đi ngoài|không đi cầu được|đi cầu khó|phân cứng)\b/),
    tip: true,
    verdict: "help",
    folk: [{ text: "Mẹo hay truyền: táo bón thì ăn nhiều rau, trái cây, uống nhiều nước.", src: [0] }],
    science: [
      { text: "NHS: đúng hướng — tăng chất xơ TỪ TỪ (cám lúa mì, yến mạch, hạt lanh), ăn trái cây như táo, mơ, nho, mâm xôi, dâu; uống nhiều nước, tránh rượu.", src: [0] },
    ],
    how: [
      { text: "Đi vệ sinh cùng giờ, cùng chỗ mỗi ngày, đừng nhịn khi buồn đi; kê chân lên ghế thấp cho đầu gối cao hơn hông. Đi bộ hay chạy mỗi ngày cũng giúp.", src: [0] },
    ],
    caution: [
      { text: "Đã đổi ăn uống mà không đỡ → hỏi dược sĩ về thuốc nhuận tràng dùng ngắn ngày.", src: [0] },
      { text: "Đi khám nếu có máu trong phân, sụt cân không rõ lý do, đau bụng / chướng bụng thường xuyên, thói quen đi cầu đổi đột ngột.", src: [0] },
    ],
    topics: [{ id: "tao-bon", text: "tăng chất xơ từ từ, ăn trái cây, uống đủ nước, kê chân khi đi cầu", src: [0], v: "help" }],
    sources: [{ title: "Constipation", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/constipation/" }],
    verifiedAt: "2026-10-24",
  },
  // ── 30/10 (đợt 5 — Kir nhờ ChatGPT liệt kê ~1000 mẹo; Lomi gom theo chủ đề, mỗi ý đối chiếu trang nguồn đọc ngày 30/10/2026) ──
  {
    id: "thuoc-nam-benh-nang",
    name: "Bệnh nặng uống thuốc nam / thuốc không rõ thành phần thay điều trị?",
    names: ["thuốc nam", "thuốc bắc", "thuốc đông y", "thuốc gia truyền", "thầy lang", "lá thuốc", "nước lá", "bài thuốc", "thuốc dân gian", "cây thuốc", "thuốc lá cây", "lá cây rừng", "cây thuốc rừng", "thuốc rừng", "thuốc không rõ nguồn gốc", "thuốc không rõ thành phần", "thuốc trôi nổi", "thuốc không nhãn", "thuốc bổ không rõ", "cao gia truyền"],
    ctx: VN(/\b(ung thư|u ác|di căn|suy thận|chạy thận|lọc máu|suy gan|xơ gan|viêm gan b|viêm gan c|hiv|tiểu đường|đái tháo đường|suy tim|nhồi máu cơ tim|đột quỵ|tai biến|động kinh|lao phổi|bệnh lao|sốt xuất huyết|sốt rét|viêm ruột thừa|tắc ruột|lupus|trầm cảm|tâm thần|lưỡng cực|parkinson|alzheimer|hen suyễn|viêm phổi|nhiễm trùng máu|viêm màng não|uốn ván|bạch cầu|không rõ nguồn gốc|không rõ thành phần|không nhãn|trôi nổi)\b/),
    verdict: "danger",
    belief: "Bệnh nặng (ung thư, suy thận, xơ gan, tiểu đường…) thì uống thuốc nam, thuốc bắc, thuốc gia truyền không rõ thành phần thay cho điều trị ở bệnh viện.",
    folk: [],
    science: [
      { text: "Một số sản phẩm thảo dược Trung Quốc từng bị phát hiện lẫn chất độc, **kim loại nặng (như asen, chì, cadimi)**, thuốc trừ sâu, vi sinh vật — thậm chí lẫn thuốc tây như warfarin, diclofenac.", src: [0] },
      { text: "Có sản phẩm bị dùng **nhầm vị thuốc**, một số đã gây tổn thương nội tạng.", src: [0] },
      { text: "Thảo dược, thực phẩm bổ sung có thể tương tác với thuốc đang dùng.", src: [1] },
    ],
    how: [{ text: "Muốn dùng thêm thuốc nam khi đang điều trị: mang theo tên / thành phần (hoặc gói thuốc) hỏi bác sĩ điều trị trước, và kể cho bác sĩ mọi thứ mình đang uống.", src: [0, 1] }],
    caution: [{ text: "**Đừng dùng thuốc đông y để thay thế hoặc trì hoãn điều trị chính thống** — bỏ hoá trị, chạy thận, thuốc tiểu đường… để chuyển qua thuốc nam có thể làm bệnh nặng thêm không quay lại được.", src: [0] }],
    topics: [
      { id: "ung-thu", text: "đừng bỏ / hoãn điều trị để uống thuốc nam — thảo dược không rõ thành phần có thể lẫn kim loại nặng, thuốc tây", src: [0], v: "danger" },
      { id: "benh-than-man", text: "thuốc nam không rõ thành phần có thể lẫn chất độc, nhầm vị gây tổn thương nội tạng — hỏi bác sĩ thận trước khi uống", src: [0], v: "danger" },
      { id: "viem-gan", text: "đừng tự uống thuốc nam thay điều trị viêm gan — sản phẩm không rõ thành phần có thể gây hại", src: [0], v: "danger" },
      { id: "tieu-duong-type-2", text: "đừng bỏ thuốc tiểu đường để uống thuốc nam; thảo dược có thể tương tác với thuốc", src: [0, 1], v: "danger" },
    ],
    sources: [nccih("traditional-chinese-medicine-what-you-need-to-know", "Traditional Chinese Medicine: What You Need To Know", "04/2019"), WISELY],
    verifiedAt: "2026-10-30",
  },
  {
    id: "cay-doc",
    name: "Lá ngón, ấu tàu (ô đầu, phụ tử), trúc đào, cà độc dược, mã tiền",
    names: ["lá ngón", "cây lá ngón", "đoạn trường thảo", "rượu lá ngón", "trúc đào", "cây trúc đào", "lá trúc đào", "hoa trúc đào", "thông thiên", "cây thông thiên", "cà độc dược", "lá cà độc dược", "hạt cà độc dược", "phụ tử", "phụ tử sống", "ô đầu", "củ ô đầu", "ấu tàu", "củ ấu tàu", "rượu ấu tàu", "rượu ô đầu", "mã tiền", "hạt mã tiền", "mã tiền tử", "rượu mã tiền"],
    verdict: "danger",
    belief: "Ngâm rượu, sắc nước ấu tàu (ô đầu, phụ tử), mã tiền để trị đau nhức xương khớp; dùng lá cà độc dược trị hen; cây lá ngón, trúc đào làm thuốc.",
    folk: [],
    science: [
      { text: "**Lá ngón** (Gelsemium elegans): ca ngộ độc nặng tiến triển nhanh tới **suy hô hấp, suy tuần hoàn**, cần hỗ trợ thở gấp; đã có nhiều vụ tử vong.", src: [0, 1] },
      { text: "**Ấu tàu / ô đầu / phụ tử** (Aconitum): chứa aconitine độc với tim và thần kinh; ngộ độc nặng hay gặp sau uống nước sắc từ củ.", src: [2] },
      { text: "Đông y chỉ dùng củ **đã bào chế** để giảm độc — chế không đúng hoặc dùng quá nhiều là ngộ độc; loạn nhịp tim do aconitine rất khó cứu.", src: [2] },
      { text: "**Trúc đào, thông thiên**: chất độc có ở **mọi bộ phận** (hoa, lá, thân, cành) — gây tim đập chậm / không đều, tụt huyết áp, có thể tử vong.", src: [3] },
      { text: "**Cà độc dược**: độc ở mọi bộ phận, nhất là lá và hạt — gây tim nhanh, loạn nhịp, tăng huyết áp.", src: [4] },
      { text: "**Mã tiền** (Strychnos nux-vomica) là nguồn tự nhiên chính của **strychnine** — chất cực độc gây co cứng cơ toàn thân dữ dội, có thể tử vong vì không thở được.", src: [5] },
    ],
    caution: [
      { text: "Lỡ ăn / uống phải (kể cả rượu ngâm) → **gọi 115 / đến cấp cứu ngay**, mang theo cây hoặc chai rượu; **đừng tự gây nôn** trừ khi nhân viên y tế bảo.", src: [3, 4, 5] },
    ],
    topics: [{ id: "ngo-doc", text: "lá ngón, ấu tàu (ô đầu, phụ tử), trúc đào, cà độc dược, mã tiền rất độc — lỡ dùng thì cấp cứu ngay, đừng tự gây nôn", src: [2, 3, 4, 5], v: "danger" }],
    sources: [
      { title: "Caution on the severe damage of Gelsemium elegans poisoning: a case report on family poisoning and systematic review (Frontiers in Public Health, 2025)", publisher: "PubMed (Thư viện Y khoa Quốc gia Hoa Kỳ – NIH)", url: "https://pubmed.ncbi.nlm.nih.gov/40860563/" },
      { title: "Lethal poisoning with Gelsemium elegans in Guizhou, China (Public Health, 2016)", publisher: "PubMed (Thư viện Y khoa Quốc gia Hoa Kỳ – NIH)", url: "https://pubmed.ncbi.nlm.nih.gov/27026250/" },
      { title: "Aconite poisoning (Clinical Toxicology, 2009)", publisher: "PubMed (Thư viện Y khoa Quốc gia Hoa Kỳ – NIH)", url: "https://pubmed.ncbi.nlm.nih.gov/19514874/" },
      { title: "Oleander poisoning", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/ency/article/002884.htm", reviewed: "2025-10-14" },
      { title: "Jimsonweed poisoning", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/ency/article/002881.htm", reviewed: "2025-10-14" },
      { title: "Strychnine — Chemical fact sheet (cập nhật 10/06/2026)", publisher: "CDC (Hoa Kỳ)", url: "https://www.cdc.gov/chemical-emergencies/chemical-fact-sheets/strychnine.html" },
    ],
    verifiedAt: "2026-10-30",
  },
  {
    id: "nho-tai",
    name: "Nhỏ chanh, tỏi, rượu vào tai; ngoáy tai bằng tăm bông?",
    names: ["nhỏ chanh", "nhỏ tỏi", "dầu tỏi", "nhỏ dầu", "nhỏ dầu gió", "nhỏ rượu", "nhỏ nước lá", "nhỏ sữa mẹ", "nhỏ nước tiểu", "nhỏ gì vào tai", "ngoáy tai", "lấy ráy tai", "lấy ráy", "móc ráy", "móc tai", "tăm bông", "bông ngoáy tai", "nến tai", "nến xông tai", "xông tai"],
    ctx: VN(/\b(tai|lỗ tai|ráy tai|đau tai|viêm tai|ù tai|ngứa tai|nhức tai)\b/),
    verdict: "risky",
    tip: true,
    belief: "Đau tai, ngứa tai thì nhỏ chanh, tỏi, rượu, nước lá vào tai; ngoáy tai bằng tăm bông cho sạch ráy.",
    folk: [],
    science: [
      { text: "**Không dùng ngón tay hay vật gì (như tăm bông)** để lấy ráy tai — chỉ đẩy ráy vào sâu và làm nặng thêm.", src: [0] },
      { text: "Không có bằng chứng nến xông tai hay máy hút tai lấy được ráy tai.", src: [0] },
    ],
    how: [{ text: "Ráy tai bít thì có thể nhỏ vài giọt dầu ô liu hoặc dầu hạnh nhân, nằm nghiêng cho tai đó hướng lên vài phút.", src: [0] }],
    caution: [
      { text: "**Không nhỏ gì vào tai nếu có thể bị thủng màng nhĩ.**", src: [0] },
      { text: "Ráy tai không đỡ sau khoảng 5 ngày, hoặc bít tới mức không nghe được → gặp bác sĩ / điều dưỡng.", src: [0] },
    ],
    unverified: ["nhỏ chanh, tỏi, rượu, dầu gió, sữa mẹ, nước tiểu, nước lá vào tai chữa đau tai, viêm tai"],
    topics: [
      { id: "ray-tai", text: "đừng ngoáy bằng tăm bông — nhỏ vài giọt dầu ô liu nếu ráy bít (không nhỏ khi thủng màng nhĩ)", src: [0], v: "risky" },
      { id: "viem-tai-giua", text: "chưa thấy nguồn y khoa nào ủng hộ nhỏ chanh, tỏi, rượu, nước lá vào tai", src: [0], v: "unclear" },
    ],
    sources: [{ title: "Earwax build-up", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/earwax-build-up/", reviewed: "2024-01-05" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "dau-gio-tre",
    name: "Xoa dầu gió, cù là, long não cho trẻ nhỏ?",
    names: ["dầu gió", "dầu cù là", "cù là", "cao sao vàng", "long não", "dầu long não", "vick", "vicks", "dầu khuynh diệp", "tinh dầu", "dầu nóng", "dầu xoa", "xoa dầu", "bôi dầu"],
    ctx: VN(/\b(sơ sinh|trẻ sơ sinh|em bé|bé|trẻ|trẻ nhỏ|trẻ em|con nít|thóp|tháng tuổi|bé nhà)\b/),
    verdict: "risky",
    tip: true,
    belief: "Bé cảm, đầy hơi, ho thì xoa dầu gió, cù là, dầu khuynh diệp vào ngực, rốn, thóp, lòng bàn chân.",
    folk: [],
    science: [
      { text: "**Long não (camphor)** có trong nhiều loại dầu / thuốc xoa: thuốc xoa ngực (vd Vicks VapoRub), dầu long não, thuốc xoa giảm đau.", src: [0] },
      { text: "Bị nhiễm quá mức gây ngộ độc: rát miệng họng, bứt rứt, tim nhanh, run, giật cơ mặt, **co giật**, mê man.", src: [0] },
    ],
    how: [{ text: "Trước khi xoa bất cứ loại dầu nào cho bé, xem nhãn có long não (camphor) không và hỏi dược sĩ / bác sĩ có dùng được cho tuổi của bé không.", src: [0] }],
    caution: [{ text: "Dầu dính da thì rửa bằng xà phòng và nước ấm; bé lỡ nuốt phải, lừ đừ hay co giật → **cấp cứu ngay**, đừng tự gây nôn.", src: [0] }],
    unverified: ["xoa dầu gió, cù là vào thóp, rốn chữa cảm, đầy hơi cho trẻ sơ sinh"],
    topics: [],
    sources: [{ title: "Camphor overdose", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/ency/article/002566.htm", reviewed: "2025-01-08" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "nuoc-la-so-sinh",
    name: "Cho trẻ sơ sinh uống nước lá, nước lọc?",
    names: ["nước lá", "nước lá thuốc", "nước thuốc nam", "nước rau má", "nước cam thảo", "nước sắc", "nước lá hẹ", "cho uống nước", "uống nước lọc", "uống nước", "nước đường", "nước trà", "nước thảo mộc", "trà thảo mộc"],
    ctx: VN(/\b(sơ sinh|trẻ sơ sinh|dưới 6 tháng|1 tháng|2 tháng|3 tháng|4 tháng|5 tháng|mới sinh|đầy tháng)\b/),
    verdict: "risky",
    tip: true,
    belief: "Cho trẻ sơ sinh uống nước lá (lá hẹ, rau má, cam thảo…) để trị đầy hơi, táo bón, vàng da, sốt; hoặc cho uống thêm nước lọc, nước đường.",
    folk: [],
    science: [
      { text: "Bé **bú mẹ hoàn toàn không cần uống thêm nước** cho tới khi bắt đầu ăn dặm; bé bú sữa công thức dưới 6 tháng có thể cần vài ngụm nước đun sôi để nguội khi trời nóng.", src: [0] },
      { text: "Các loại \"nước cho bé\" và nước thảo mộc thường có đường, **không được khuyên dùng**.", src: [0] },
    ],
    how: [{ text: "Bé bú mẹ: cứ cho bú theo nhu cầu — không cần thêm nước lá hay nước lọc trước khi ăn dặm.", src: [0] }],
    caution: [],
    unverified: ["nước lá (lá hẹ, rau má, cam thảo…) chữa đầy hơi, táo bón, vàng da, sốt cho trẻ sơ sinh"],
    topics: [{ id: "vang-da-so-sinh", text: "bé bú mẹ không cần uống thêm nước; nước thảo mộc không được khuyên dùng cho bé", src: [0], v: "risky" }],
    sources: [{ title: "Drinks and cups for babies and young children", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/drinks-and-cups-for-babies-and-young-children/", reviewed: "2022-10-05" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "giai-ruou",
    name: "Giải rượu: cà phê, tắm nước lạnh, uống thêm rượu?",
    names: ["giải rượu", "tỉnh rượu", "giã rượu", "dã rượu", "giải bia", "cà phê giải rượu", "uống cà phê", "cà phê", "tắm nước lạnh", "tắm", "uống thêm rượu", "uống thêm bia", "gỡ rượu", "nước chanh", "nước tăng lực"],
    ctx: VN(/\b(say rượu|say bia|xỉn|say xỉn|nhậu|rượu|bia|giải rượu|tỉnh rượu|giã rượu|dã rượu)\b/),
    verdict: "myth",
    belief: "Uống cà phê, tắm nước lạnh, uống thêm chút rượu (\"gỡ rượu\") hay nước chanh, nước tăng lực là mau tỉnh rượu, hết mệt sau nhậu.",
    folk: [],
    science: [
      { text: "Uống cà phê, đi tắm hay uống thêm rượu sáng hôm sau đều **không chữa được** cơn mệt sau nhậu; chưa mẹo nào được khoa học chứng minh — **chỉ có thời gian**.", src: [0] },
      { text: "Uống thêm rượu (\"gỡ\") có thể đỡ tạm nhưng làm cơn mệt kéo dài thêm.", src: [0] },
      { text: "Lúc còn mệt sau nhậu, khả năng tập trung, ra quyết định, phối hợp cơ vẫn bị giảm — **đừng lái xe**.", src: [0] },
    ],
    caution: [{ text: "**Rượu + paracetamol** có thể gây độc cho gan — đừng uống paracetamol để chữa nhức đầu sau nhậu khi chưa hỏi dược sĩ.", src: [0] }],
    unverified: ["nước chanh, nước tăng lực giúp giải rượu"],
    topics: [{ id: "ngo-doc-ruou", text: "cà phê, tắm, uống thêm rượu không giải rượu — chỉ có thời gian; rượu + paracetamol hại gan", src: [0], v: "myth" }],
    sources: [{ title: "Hangovers (cập nhật 12/2025)", publisher: "NIAAA (Viện Y tế Quốc gia Hoa Kỳ – NIH)", url: "https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/hangovers" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "thut-thao",
    name: "Detox, thụt tháo, xổ ruột để thải độc?",
    names: ["thụt tháo", "thụt đại tràng", "thụt cà phê", "súc ruột", "làm sạch ruột", "xổ ruột", "thuốc xổ thải độc", "uống thuốc xổ", "detox", "thải độc", "thanh lọc cơ thể", "nhịn ăn thải độc", "nước ép thải độc", "nước ép cần tây", "uống nước ép cần tây"],
    verdict: "myth",
    belief: "Thụt tháo, uống thuốc xổ, nhịn ăn chỉ uống nước ép để \"thải độc\", thanh lọc cơ thể, chữa bệnh.",
    folk: [],
    science: [
      { text: "Rất ít nghiên cứu về các chương trình \"detox\" ở người; một tổng quan năm 2015 **không thấy nghiên cứu thuyết phục** nào cho thấy detox giúp giảm cân hay loại bỏ độc tố.", src: [0] },
      { text: "Bằng chứng cho **thụt rửa đại tràng** còn hạn chế, chưa đủ cho các công dụng được quảng cáo; có thể gây tác dụng phụ, đôi khi nghiêm trọng.", src: [0] },
      { text: "Detox hay kèm thuốc xổ → gây tiêu chảy.", src: [0] },
      { text: "Nước ép chưa tiệt trùng có thể gây bệnh (nặng ở trẻ em, người già, người suy giảm miễn dịch); nước ép rau lá xanh, củ dền nhiều oxalat có thể không tốt cho người dễ bị sỏi thận.", src: [0] },
    ],
    caution: [{ text: "Người có bệnh đường tiêu hoá, từng mổ ruột, trĩ nặng, bệnh thận hay bệnh tim **dễ bị hại hơn** khi thụt tháo.", src: [0] }],
    topics: [{ id: "tao-bon", text: "thụt tháo, xổ ruột \"thải độc\" chưa có bằng chứng và có thể gây hại", src: [0], v: "myth" }],
    sources: [nccih("detoxes-and-cleanses-what-you-need-to-know", "\"Detoxes\" and \"Cleanses\": What You Need To Know", "03/2025")],
    verifiedAt: "2026-10-30",
  },
  {
    id: "kieng-uong-nuoc",
    name: "Sốt, tiêu chảy, nôn, sỏi thận thì kiêng uống nước?",
    names: ["kiêng uống nước", "kiêng nước", "không cho uống nước", "nhịn uống nước", "nhịn nước", "nhịn khát", "uống ít nước", "hạn chế nước", "hạn chế uống nước", "không uống nước"],
    ctx: VN(/\b(sốt|tiêu chảy|đi ngoài|nôn|ói|ói mửa|sỏi thận|cảm|cảm lạnh|cúm|sốt xuất huyết)\b/),
    verdict: "myth",
    belief: "Bị sốt, tiêu chảy, nôn ói hay sỏi thận thì kiêng uống nước, uống ít cho \"đỡ đi ngoài\", \"đỡ phù\".",
    folk: [],
    science: [
      { text: "Tiêu chảy, nôn: NHS khuyên **uống nhiều nước**; buồn nôn thì nhấp từng ngụm nhỏ.", src: [0] },
      { text: "Trẻ sốt: NHS khuyên cho uống nhiều nước; bé bú mẹ thì cứ cho bú.", src: [1] },
      { text: "Sốt xuất huyết: nên nghỉ ngơi, **uống nhiều nước**.", src: [2] },
      { text: "Sỏi thận: NHS khuyên uống nhiều nước mỗi ngày để không bị mất nước, giữ nước tiểu trong.", src: [3] },
    ],
    how: [{ text: "Uống từng ngụm, đều trong ngày (trừ khi bác sĩ đang dặn riêng khác); tiêu chảy, nôn nhiều thì hỏi dược sĩ gói bù nước (ORS / oresol).", src: [0] }],
    caution: [{ text: "Trẻ dưới 5 tuổi có dấu hiệu mất nước (ít tã ướt) thì đi khám.", src: [0] }],
    topics: [
      { id: "tieu-chay", text: "đừng kiêng nước — uống nhiều, nhấp từng ngụm nếu buồn nôn; hỏi dược sĩ gói ORS", src: [0], v: "myth" },
      { id: "sot-xuat-huyet", text: "đừng kiêng nước — nên nghỉ ngơi, uống nhiều nước", src: [2], v: "myth" },
      { id: "soi-than", text: "đừng kiêng nước — uống nhiều nước mỗi ngày để phòng sỏi", src: [3], v: "myth" },
    ],
    sources: [NHS_DV, NHS_FEVERKID, { title: "Dengue and severe dengue — fact sheet (21/08/2025)", publisher: "WHO", url: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue" }, { title: "Kidney stones – Prevention", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/kidney-stones/prevention/", reviewed: "2022-11-30" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "chuom-da",
    name: "Chườm đá trực tiếp lên da?",
    names: ["chườm đá", "chườm lạnh", "túi đá", "đá lạnh", "chườm đá trực tiếp", "áp đá", "chườm nước đá"],
    ctx: VN(/\b(trực tiếp|lên da|vào da|bọc|khăn|bong gân|trật|sưng|bầm|va đập|chấn thương|bao lâu|mấy phút|đau khớp|đau cổ chân|lật cổ chân)\b/),
    verdict: "help",
    tip: true,
    belief: "Bị sưng, bong gân thì áp thẳng cục đá lên da, chườm càng lâu càng tốt.",
    folk: [],
    science: [{ text: "Hướng dẫn chườm đá của NHS dặn **bọc túi đá trong khăn ẩm**, không để đá chạm trực tiếp vào da.", src: [0] }],
    how: [{ text: "Chườm khoảng 15 phút, mỗi 2–3 giờ, khi chỗ khớp còn sưng, đau.", src: [0] }],
    caution: [],
    topics: [{ id: "bong-gan", text: "bọc đá trong khăn ẩm, không áp thẳng lên da; chườm khoảng 15 phút mỗi 2–3 giờ khi còn sưng", src: [0], v: "help" }],
    sources: [{ title: "Protection, rest and ice regime", publisher: "Mersey Care NHS Foundation Trust (Anh)", url: "https://www.merseycare.nhs.uk/physiotherapy/protection-rest-ice" }],
    verifiedAt: "2026-10-30",
  },
  {
    id: "hoa-chat-len-da",
    name: "Bôi dầu hoả, xăng, nhớt, vôi, nước điếu lên da?",
    names: ["dầu hỏa", "dầu hoả", "dầu hôi", "xăng", "nhớt", "dầu nhớt", "nhớt xe", "nước vôi", "vôi", "nước điếu", "thuốc nhuộm tóc"],
    ctx: VN(/\b(bôi|thoa|xức|trét|đắp|chấm|ghẻ|nấm|vết thương|lở|ngứa|kiến ba khoang|chàm|hắc lào|lác|chí|chấy)\b/),
    verdict: "danger",
    belief: "Bôi dầu hoả, xăng, nhớt xe, vôi, nước điếu, thuốc nhuộm tóc lên da để trị ghẻ, nấm, chấy, vết kiến ba khoang, vết thương.",
    folk: [],
    science: [
      { text: "Dầu hoả dính da có thể gây **bỏng và kích ứng**.", src: [0] },
      { text: "**Không bôi thêm gì** — kem hay hoá chất khác — lên vết bỏng.", src: [1] },
    ],
    how: [
      { text: "Lỡ bôi rồi: rửa xối thật nhiều nước sạch, ít nhất 15 phút.", src: [0] },
      { text: "Đã bỏng rát: đeo găng nếu được, cởi đồ dính hoá chất, phủi hoá chất khô, xối nước mát hoặc âm ấm thật lâu.", src: [1] },
    ],
    caution: [{ text: "Hoá chất dính vào **mắt** hoặc bỏng rộng → gọi **115**.", src: [1] }],
    unverified: ["vôi, nước điếu, nhớt, dầu hoả, xăng, thuốc nhuộm tóc chữa ghẻ, nấm, chấy, kiến ba khoang"],
    topics: [{ id: "ghe", text: "đừng bôi dầu hoả, nhớt, vôi — dầu hoả gây bỏng da; ghẻ cần thuốc bác sĩ / dược sĩ hướng dẫn", src: [0, 1], v: "danger" }],
    sources: [
      { title: "Kerosene poisoning", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/ency/article/002807.htm", reviewed: "2025-10-14" },
      { title: "Acid and chemical burns", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/acid-and-chemical-burns/", reviewed: "2024-06-05" },
    ],
    verifiedAt: "2026-10-30",
  },
  {
    id: "giac-hoi",
    name: "Giác hơi (giác lửa) hút độc?",
    names: ["giác hơi", "giác lửa", "ống giác", "giác chân không", "giác ướt", "giác hơi hút độc", "trích huyết giác hơi"],
    verdict: "unclear",
    tip: true,
    belief: "Giác hơi, giác lửa để \"hút độc\", \"hút gió độc\", chữa đau nhức, cảm lạnh, đau bụng.",
    folk: [],
    science: [
      { text: "Nghiên cứu về giác hơi **phần lớn chất lượng thấp**; có thể giúp giảm đau nhưng bằng chứng chưa mạnh, chưa đủ để kết luận cho các bệnh khác.", src: [0] },
      { text: "Giác hơi để lại vết tạm thời; có thể gây đổi màu da kéo dài, **sẹo, bỏng, nhiễm trùng**.", src: [0] },
      { text: "Hiếm gặp nhưng nặng — chảy máu trong sọ sau giác da đầu; thiếu máu do giác ướt (trích máu) nhiều lần.", src: [0] },
    ],
    caution: [{ text: "Đang bị chàm (eczema) hay vảy nến thì giác hơi có thể làm nặng thêm.", src: [0] }],
    unverified: ["giác hơi hút độc tố, hút gió độc ra khỏi người"],
    topics: [],
    sources: [nccih("cupping", "Cupping", "11/2018")],
    verifiedAt: "2026-10-30",
  },
  {
    id: "nuoc-dua-tieu-cau",
    name: "Sốt xuất huyết: nước dừa, lá đu đủ tăng tiểu cầu?",
    names: ["nước dừa", "lá đu đủ", "nước lá đu đủ", "nước ép lá đu đủ", "nước cam", "nước rau má", "tăng tiểu cầu", "lá thuốc", "nước lá"],
    ctx: VN(/\b(sốt xuất huyết|tiểu cầu|dengue|sxh)\b/),
    verdict: "unclear",
    tip: true,
    belief: "Bị sốt xuất huyết thì uống nước dừa, nước lá đu đủ cho tăng tiểu cầu, mau khỏi.",
    folk: [],
    science: [
      { text: "Sốt xuất huyết **không có thuốc điều trị đặc hiệu**; nghỉ ngơi, **uống nhiều nước**, giảm đau hạ sốt bằng paracetamol.", src: [0] },
      { text: "**tránh thuốc kháng viêm không steroid như ibuprofen, aspirin** vì làm tăng nguy cơ chảy máu.", src: [0] },
    ],
    how: [{ text: "Nước dừa cũng là một loại nước uống giúp uống đủ nước như WHO khuyên — nhưng không phải thuốc.", src: [0] }],
    caution: [{ text: "Dấu hiệu nặng (hay xuất hiện **sau khi hết sốt**): đau bụng dữ dội, nôn liên tục, thở nhanh, chảy máu chân răng / mũi, nôn hoặc đi cầu ra máu, khát nhiều, da lạnh tái, mệt lả, bứt rứt → **đi viện ngay**.", src: [0] }],
    unverified: ["nước dừa, lá đu đủ, nước cam, nước rau má làm tăng tiểu cầu"],
    topics: [{ id: "sot-xuat-huyet", text: "chưa thấy nguồn nào cho thấy nước dừa, lá đu đủ tăng tiểu cầu — uống đủ nước, paracetamol, tránh ibuprofen / aspirin, theo dõi dấu hiệu nặng", src: [0], v: "unclear" }],
    sources: [{ title: "Dengue and severe dengue — fact sheet (21/08/2025)", publisher: "WHO", url: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue" }],
    verifiedAt: "2026-10-30",
  },
];

/** Vị thuốc nam / bắc phổ biến mà Lomi CHƯA tìm được nguồn đáng tin đánh giá → nói thật, kèm lời dặn chung. */
export const UNVERIFIED_HERBS = [
  "kỷ tử", "câu kỷ tử", "kỉ tử", "câu kỉ tử", "táo tàu", "táo tào", "táo đỏ", "đại táo", "đông trùng hạ thảo", "đông trùng", "rau má", "diếp cá", "lá diếp cá", "lá ổi", "búp ổi",
  "lá lốt", "lá trầu không", "trầu không", "nhân trần", "cà gai leo", "lá vối", "đinh lăng", "ích mẫu", "ngưu tất",
  "đương quy", "thục địa", "xuyên khung", "bạch truật", "hoàng liên", "kim ngân hoa", "la hán quả", "hoa đu đủ đực", "lá đu đủ", "tam thất",
  "nghệ đen", "ba kích", "nhung hươu", "rượu rắn", "cao hổ cốt", "cao xương", "hoài sơn", "xạ đen", "lá xạ đen", "an cung ngưu hoàng",
  "trinh nữ hoàng cung", "lá sen", "tâm sen", "hạt sen", "râu ngô", "rễ tranh", "mã đề", "lá tre", "nước sâm", "sâm đất", "lá khôi", "chè vằng",
  "lá mơ", "lá mơ lông", "sả", "lá sả", "lá chanh",
];

const FOLK_WORD = VN(/\b(dân gian|mẹo dân gian|thuốc nam|thuốc bắc|bài thuốc|đông y|thảo dược|cây thuốc|lá thuốc|thuốc lá cây|mẹo xưa|mẹo ông bà|cách dân gian|thuốc dân gian|y học cổ truyền)\b/);
const ASK = VN(/\b(tác dụng|công dụng|có tốt|tốt không|tốt k|tốt ko|có hại|hại không|có độc|độc không|có sao|sao không|uống|dùng|xài|là gì|là cây gì|chữa|trị|giúp|đỡ|bổ|ai không nên|kiêng|được không|được k|được ko|dc k|đc k|ra sao|thế nào|như nào|có nên|nên không|nên k|ăn được|cho bé|cho con|cho trẻ|bà bầu|mang thai|có thật|thật không|hiệu quả|có ích|lợi ích|thì sao|thế sao|hết không|có hết|có khỏi|sao vậy|phải không|phải k|đúng không|đúng k|có đúng)\b/);
const BURN = VN(/\b(bỏng|phỏng)\b/);
const BOI = VN(/\b(bôi|thoa|đắp|xức|trét|chấm)\b/);
/** Câu có gõ dấu tiếng Việt. */
const ACCENTED = /[^ -~\s]/u;
const toks = (s: string) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
const baseOf = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
/** Khoá so dấu không phụ thuộc vị trí dấu ("hoá" = "hóa"). */
const keyOf = (w: string) => `${baseOf(w)}|${[...w.replace(/đ/g, "d\u0335").normalize("NFD").matchAll(/\p{M}/gu)].map((x) => x[0]).sort().join("")}`;
/** `name` có xuất hiện trong câu gõ có dấu, đúng từng dấu không (người đã gõ dấu thì "nghe" là nghe, không phải "nghệ"). */
function typedAs(text: string, name: string): boolean {
  const R = toks(text).map(keyOf), N = toks(name).map(keyOf);
  for (let i = 0; i + N.length <= R.length; i++) if (N.every((w, j) => R[i + j] === w)) return true;
  return false;
}
const TEMPER = VN(/\b(tính nóng|tính lạnh|tính mát|tính hàn|tính ấm)\b/);
const FOODPOI = VN(/\b(thực phẩm|đồ ăn|thức ăn|ăn phải|ăn trúng|ăn nhầm|ăn đồ|hải sản|ngộ độc rượu|ngộ độc bia|say rượu)\b/);
const CHEM = VN(/\b(thuốc chuột|thuốc trừ sâu|thuốc diệt cỏ|thuốc sâu|nước tẩy|nước rửa chén|nước javel|chất tẩy|dầu hoả|xăng|uống quá liều|uống cả vỉ|hoá chất)\b/);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameRe = (names: string[]) => V(new RegExp(`\\b(${[...names].sort((a, b) => b.length - a.length).map(esc).join("|")})\\b`));
const RE = new Map(FOLK.map((f) => [f.id, nameRe(f.names)]));
const UNVERIFIED_RE = nameRe(UNVERIFIED_HERBS);

export const folkById = (id?: string | null): FolkEntry | null => FOLK.find((f) => f.id === id) ?? null;
/** Các vị đã đối chiếu nguồn có liên quan tới một bệnh trong kho (id thẻ medkb). */
export const folkFor = (topicId: string): { f: FolkEntry; t: FolkTopic }[] =>
  FOLK.flatMap((f) => f.topics.filter((t) => t.id === topicId).map((t) => ({ f, t })));

/** Vị / mẹo dân gian nhắc trong câu (tên dài khớp trước). "Bôi … lên vết bỏng" chỉ nhận khi câu nói tới bỏng. */
export function findFolk(text: string): FolkEntry | null {
  const n = ` ${normalizeVi(text)} `;
  let best: { f: FolkEntry; len: number } | null = null;
  for (const f of FOLK) {
    if (f.id === "boi-bong" && !(BURN.test(n) && BOI.test(n))) continue;
    if (f.ctx && !f.ctx.test(n)) continue;
    // (bà bầu ĂN dứa là câu hỏi ăn uống khi mang thai — nguồn bromelain chỉ nói về viên bổ sung, không nói về ăn quả → để lớp ăn uống khi mang thai trả lời)
    if (f.id === "dua-bromelain" && PREG.test(n) && !VN(/\b(bromelain|viên|thực phẩm chức năng|uống men)\b/).test(n)) continue;
    // (ngộ độc THỰC PHẨM / rượu khác nuốt phải chất độc — nguồn NHS Poisoning nói về chất độc, không áp lời "đừng cho uống gì" cho tiêu chảy, nôn do đồ ăn)
    if (f.id === "ngo-doc-gay-non" && FOODPOI.test(n) && !CHEM.test(n)) continue;
    // ("toi bi ho" gõ không dấu là "tôi bị ho"; "tối nay" có dấu khác "tỏi") → chỉ nhận tỏi khi gõ đúng "tỏi", hoặc không dấu mà đi kèm chữ chỉ món tỏi.
    if (f.id === "toi" && !ACCENTED.test(text) && !/\b(toi song|ngam toi|toi ngam|ruou toi|toi mo coi|toi den|cu toi|tep toi|an toi song)\b/.test(n)) continue;
    // ("mang thai", "san nhà" gõ không dấu ≠ "măng", "sắn") → gõ không dấu thì chỉ nhận tên nhiều chữ.
    if (f.id === "san-mang-doc" && !ACCENTED.test(text) && !/\b(cu san|say san|khoai mi|cu mi|mang tuoi|mang chua|mang rung|mang tre|nuoc mang|luoc mang|luoc san|ngam mang|khoai tay)\b/.test(n)) continue;
    let m: { 0: string } | null = n.match(RE.get(f.id)!);
    // Câu gõ CÓ DẤU thì tên vị phải khớp cả dấu ("nghe nói" ≠ "nghệ", "quê" ≠ "quế", "tối" ≠ "tỏi"); chữ gõ không dấu vẫn khớp lỏng.
    if (m && ACCENTED.test(text)) {
      const hit = f.names.filter((x) => typedAs(text, x)).sort((a, b) => b.length - a.length)[0];
      m = hit ? [normalizeVi(hit)] : null;
    }
    // (mục có ngữ cảnh — "đắp lá" khi rắn cắn / chó cắn — ưu tiên hơn tên vị trần)
    // (mục chung "thuốc nam khi bệnh nặng" không cộng điểm ngữ cảnh — câu nhắc vị cụ thể như "linh chi" thì vị đó trả lời)
    const len = m ? m[0].length + ((f.ctx || f.id === "boi-bong") && f.id !== "thuoc-nam-benh-nang" ? 100 : 0) : 0;
    if (m && (!best || len > best.len)) best = { f, len };
  }
  return best?.f ?? null;
}
/** Tên vị thuốc nam / bắc phổ biến chưa có nguồn, đúng như người dùng gõ. */
export function findUnverifiedHerb(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  const m = n.match(UNVERIFIED_RE);
  if (!m) return null;
  const h = UNVERIFIED_HERBS.find((x) => normalizeVi(x) === m[0].trim());
  const raw = text.normalize("NFC").toLowerCase();
  const plain = raw.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
  // "mã đề thi", "mã đề số 3" là đề kiểm tra, không phải cây mã đề.
  if (h === "mã đề" && /\bma de (thi|so|\d)/.test(plain)) return null;
  // Gõ có dấu mà dấu khác tên vị ("sa sút", "sa vào" ≠ "sả") → không phải vị đó.
  if (ACCENTED.test(text)) {
    const hit = UNVERIFIED_HERBS.filter((x) => typedAs(text, x)).sort((a, b) => b.length - a.length)[0];
    return hit ?? null;
  }
  return h ?? m[0].trim();
}
export const isFolkAsk = (text: string) => FOLK_WORD.test(` ${normalizeVi(text)} `);
export const asksAbout = (text: string) => ASK.test(` ${normalizeVi(text)} `);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const bl = (fs: DrugFact[]) => fs.map((f) => `• ${f.text}`).join("\n");
const srcOf = (...gs: { src: number[] }[][]) => gs.flat().flatMap((x) => x.src);

/** Bài đầy đủ về một vị / mẹo. `topic` (id thẻ medkb, nếu câu có nhắc bệnh) → dòng "Với bệnh đó" đứng đầu. */
const KID = VN(/\b(bé|trẻ|em bé|sơ sinh|cháu|con nít|con nhỏ|con tôi|con em|con mình|tháng tuổi)\b/);
const PREG = VN(/\b(bầu|mang thai|có thai|cho con bú|đang bú)\b/);
const KID_FACT = /trẻ|bé/u;
const PREG_FACT = /mang thai|bà bầu|bầu|cho con bú/u;

/** Mục vốn nói về trẻ nhỏ — không kèm câu "nguồn chưa nêu riêng cho trẻ nhỏ". */
const KID_ENTRIES = new Set(["dau-gio-tre", "nuoc-la-so-sinh"]);
export function renderFolk(f: FolkEntry, topic?: { id: string; name: string } | null, now = Date.now(), q = ""): string {
  const v = VERDICT[f.verdict];
  const t = topic ? f.topics.find((x) => x.id === topic.id) : null;
  const nq = ` ${normalizeVi(q)} `;
  // Hỏi cho trẻ nhỏ / bà bầu → lưu ý của đúng nhóm đó lên đầu ("bé 6 tháng ăn mật ong được không").
  const pick = (re: RegExp) => [...(f.how ?? []), ...f.caution].filter((x) => re.test(x.text));
  const kid = q && KID.test(nq) ? pick(KID_FACT) : [];
  const preg = q && PREG.test(nq) ? pick(PREG_FACT) : [];
  const myth = f.verdict === "myth";
  const unvLine = f.unverified?.length ? `🔎 Lomi chưa tìm thấy nguồn y khoa nào xác nhận chuyện ${f.unverified.join("; ")} — nên Lomi không dám nói là đúng.` : "";
  // (30/10 — Kir hỏi "nhỏ nước tiểu vào mắt là sao" mà lời đáp nói sữa mẹ, nước lá trước) → thứ người dùng hỏi nằm trong danh sách
  //  "chưa có nguồn xác nhận" thì nói câu đó NGAY sau kết luận, không để cuối.
  const unvFirst = !!q && !!f.unverified?.length && f.names.some((n) => nq.includes(` ${normalizeVi(n)} `) && normalizeVi(f.unverified!.join(" ")).includes(normalizeVi(n)));
  const parts = [
    `${myth ? "🧐" : "🌿"} **${f.name}**`,
    kid.length ? `👶 **Với trẻ nhỏ:**\n${bl(kid)}` : "",
    preg.length ? `🤰 **Với bà bầu / mẹ cho con bú:**\n${bl(preg)}` : "",
    q && f.verdict !== "myth" && !KID_ENTRIES.has(f.id) && (KID.test(nq) || PREG.test(nq)) && !kid.length && !preg.length ? "👶🤰 Nguồn chưa nêu riêng cho trẻ nhỏ / bà bầu — hỏi bác sĩ / dược sĩ trước khi dùng nha." : "",
    `${v.icon} ${v.text}.`,
    unvFirst ? unvLine : "",
    t ? `👉 Với **${topic!.name}**: ${t.text}.` : "",
    myth && f.belief ? `🏡 **Dân gian hay:** ${f.belief}` : f.folk.length ? `🏡 **Dân gian dùng để:**\n${bl(f.folk)}` : "",
    `🔬 **${myth ? "Nguồn y khoa nói" : "Nghiên cứu nói gì"}:**\n${bl(f.science)}`,
    (() => {
      const hs = (f.how ?? []).filter((x) => !kid.includes(x) && !preg.includes(x));
      return hs.length ? `${myth ? "✅ **Nên làm:**" : "🥣 **Cách làm theo nguồn:**"}\n${bl(hs)}` : "";
    })(),
    unvLine && !unvFirst ? unvLine : "",
    (() => {
      const cs = f.caution.filter((x) => !kid.includes(x) && !preg.includes(x));
      const list = cs.length ? cs : f.caution;
      return list.length ? `⚠️ **${f.verdict === "danger" ? "Cảnh báo / khuyến cáo" : myth || f.tip ? "Lưu ý" : "Lưu ý · ai không nên dùng"}:**\n${bl(list)}` : "";
    })(),
    f.verdict === "danger" || myth || f.tip ? "" : "💊 Đang dùng thuốc, mang thai, cho con bú, có bệnh gan / thận / tim, hay sắp phẫu thuật thì hỏi bác sĩ / dược sĩ trước khi dùng thảo dược như thuốc nha.",
    sourceLine(f, srcOf(f.folk, f.science, f.how ?? [], f.caution, t ? [t] : []), now),
  ];
  return parts.filter(Boolean).join("\n\n");
}

const WISE_FACTS: DrugFact[] = [
  { text: "\"Tự nhiên\" không có nghĩa là an toàn — có loại thảo dược gây bệnh gan.", src: [0] },
  { text: "Thảo dược có thể tương tác với thuốc đang dùng (kể cả thuốc không kê đơn) hoặc không hợp với bệnh đang có.", src: [0] },
  { text: "Nhiều loại chưa được thử nghiệm ở bà bầu, mẹ cho con bú, trẻ em.", src: [0] },
  { text: "Một số loại làm tăng nguy cơ chảy máu hoặc ảnh hưởng thuốc mê — báo bác sĩ trước khi phẫu thuật.", src: [0] },
  { text: "Có sản phẩm lẫn thuốc tân dược hoặc thành phần không ghi trên nhãn.", src: [0] },
  { text: "Báo bác sĩ mọi thảo dược / thực phẩm chức năng đang dùng; có tác dụng phụ thì ngưng và báo bác sĩ.", src: [0] },
];
const wiseLine = () => sourceLine({ sources: [WISELY], verifiedAt: VERIFIED }, [0]);

/** Vị chưa đối chiếu được nguồn — nói thật, không đoán công dụng. */
export function renderUnverified(herb: string, topicName?: string | null): string {
  return [
    `🌿 **${cap(herb)}** là vị quen thuộc trong dân gian / Đông y, nhưng Lomi **chưa tìm được nguồn y khoa đáng tin** đánh giá công dụng chữa bệnh và độ an toàn của nó${topicName ? ` với **${topicName}**` : ""} — nên Lomi không dám nói nó chữa được gì.`,
    `⚠️ **Nếu muốn dùng như thuốc, nhớ mấy điều này (theo NCCIH):**\n${bl(WISE_FACTS)}`,
    `👉 Lomi có đối chiếu nguồn cho: ${FOLK.filter((f) => f.id !== "boi-bong" && f.verdict !== "myth").map((f) => f.name.split(" (")[0].toLowerCase()).slice(0, 14).join(", ")}… — hỏi tên vị (vd “gừng có tác dụng gì”) hoặc “mẹo dân gian trị ho” để xem.`,
    wiseLine(),
  ].join("\n\n");
}

/** Mẹo dân gian cho một bệnh trong kho. `withGeneric`: kèm lời dặn chung khi dùng thảo dược. */
export function renderFolkForTopic(topicId: string, topicName: string, opts: { compact?: boolean; seen?: string } = {}): string | null {
  // (30/10) Mẹo mà thẻ bệnh vừa nói rồi ("vitamin C, tỏi rất ít bằng chứng") thì không nhắc lại.
  const hits = folkFor(topicId).filter(({ t }) => !opts.seen || !saidBefore(t.text, opts.seen));
  if (!hits.length) return null;
  const order: FolkVerdict[] = ["myth", "help", "mixed", "unclear", "risky", "danger"];
  hits.sort((a, b) => order.indexOf(a.t.v ?? a.f.verdict) - order.indexOf(b.t.v ?? b.f.verdict));
  // (30/10 — Kir: "Đau mắt đỏ: nhỏ sữa mẹ, nước lá? — đừng nhỏ sữa mẹ hay nước lá…" lặp ý) → tên dạng câu hỏi thì chỉ ghi lời đáp.
  const lines = hits.map(({ f, t }) => `• ${VERDICT[t.v ?? f.verdict].icon} ${f.name.endsWith("?") ? cap(t.text) : `**${f.name}** — ${t.text}`}.`);
  const pubs = Array.from(new Set(hits.flatMap(({ f, t }) => t.src.map((i) => f.sources[i].publisher))));
  if (opts.compact)
    return `🌱 **Mẹo dân gian:**\n${lines.join("\n")}`;
  return [
    `🌱 **Mẹo dân gian cho ${topicName}:**`,
    lines.join("\n"),
    `✅ có bằng chứng (còn hạn chế) · 🔸 giúp vài trường hợp · ❔ chưa đủ bằng chứng · ⚠️ có rủi ro · ⛔ nguy hiểm · 🧐 quan niệm dân gian — nguồn hướng dẫn khác`,
    `👉 Mẹo dân gian chỉ hỗ trợ, không thay điều trị — nặng lên hay kéo dài thì đi khám nha.`,
    `📚 Nguồn: ${pubs.join(" · ")}. Lomi đối chiếu ngày ${VERIFIED.split("-").reverse().join("/")}. Đây là kiến thức tham khảo chung, không thay lời dặn của bác sĩ / dược sĩ.`,
  ].join("\n\n");
}

/** Hỏi mẹo dân gian cho một bệnh mà Lomi chưa có mẹo nào đối chiếu được nguồn. */
export function renderNoFolk(topicName: string): string {
  return [
    `🌱 Với **${topicName}**, Lomi **chưa đối chiếu được mẹo dân gian / bài thuốc nam nào** với nguồn y khoa đáng tin, nên Lomi không gợi ý bài thuốc để tránh nói sai.`,
    `👉 Mẹo chăm sóc có nguồn thì hỏi “${topicName} nên làm gì” nha.`,
    `⚠️ **Nếu vẫn muốn dùng thuốc nam / thuốc bắc (theo NCCIH):**\n${bl(WISE_FACTS.slice(0, 3))}\n• ${WISE_FACTS[5].text}`,
    wiseLine(),
  ].join("\n\n");
}

/** Hỏi chung "có mẹo dân gian nào không" (không nêu bệnh). */
export function renderFolkMenu(): string {
  const groups: [string, string[]][] = [
    ["✅ Có bằng chứng hỗ trợ", FOLK.filter((f) => f.verdict === "help").map((f) => f.name)],
    ["🔸 Giúp vài trường hợp", FOLK.filter((f) => f.verdict === "mixed").map((f) => f.name)],
    ["❔ Chưa đủ bằng chứng", FOLK.filter((f) => f.verdict === "unclear").map((f) => f.name)],
    ["⚠️ / ⛔ Cần cảnh giác", FOLK.filter((f) => f.verdict === "risky" || f.verdict === "danger").map((f) => f.name)],
    ["🧐 Quan niệm dân gian khi ốm", FOLK.filter((f) => f.verdict === "myth").map((f) => f.name)],
  ];
  return [
    `🌿 Các mẹo dân gian / thuốc nam, thuốc bắc Lomi đã kiểm chứng với nguồn y khoa:`,
    groups.map(([h, xs]) => `**${h}:** ${xs.join(", ")}`).join("\n"),
    `👉 Hỏi kiểu “gừng có tác dụng gì”, “cháo cóc có tốt không”, hoặc “mẹo dân gian trị ho” để xem chi tiết.`,
  ].join("\n\n");
}

const FOOD_ASK = VN(/\b(ăn|uống)\b.*\b(được không|được k|được ko|dc k|đc k|có sao|kiêng|có nên|nên không)\b/);
const HELP_ASK = VN(/\b(chữa|trị|giúp|đỡ|hết|khỏi|có tác dụng|công dụng|tác dụng)\b/);

/**
 * Lớp trả lời mẹo dân gian (gọi từ trang Trợ lý). `med`: bệnh nhắc trong câu (id thẻ medkb + tên hiển thị) hoặc null;
 * `prevMed`: bệnh đang nói ở lượt trước (cho câu nối "có mẹo dân gian nào không").
 * Trả null khi câu không phải hỏi mẹo dân gian — để các lớp khác xử lý.
 */
export function folkReply(
  q: string,
  med: { id: string; name: string } | null,
  prevMed: { id: string; name: string } | null,
): { text: string; folk?: string; topic?: string; verdict?: FolkVerdict } | null {
  const words = normalizeVi(q).split(" ").filter(Boolean).length;
  const folkWord = isFolkAsk(q);
  const f = findFolk(q);
  // Cháo cóc / bôi đồ lên vết bỏng: cảnh báo ngay, kể cả câu kể ("a cho con ăn cháo cóc").
  //   (Quan niệm khi ốm — "chảy máu cam ngửa cổ", "rắn cắn hút nọc" — cũng trả lời ngay: đã khớp đúng ngữ cảnh.)
  if (f && (f.id === "thit-coc" || f.id === "boi-bong" || f.verdict === "myth" || f.verdict === "danger")) return { text: renderFolk(f, med, Date.now(), q), folk: f.id, topic: med?.id, verdict: f.verdict };
  // "gừng có tính nóng không" — hỏi tính nóng / mát của một vị là đang hỏi về vị đó; mẹo sinh hoạt đã khớp đúng ngữ cảnh ("say sắn phải làm sao") cũng vậy.
  const asked = asksAbout(q) || words <= 4 || folkWord || TEMPER.test(` ${normalizeVi(q)} `) || !!(f?.tip && f.ctx);
  if (f && asked) {
    // "gout ăn gừng được không" — hỏi một MÓN với bệnh mà vị này không có ý gì cho bệnh đó → để lớp kiêng cữ trả lời.
    //   (Hỏi cho trẻ nhỏ / bà bầu mà vị này có lưu ý riêng cho nhóm đó — "bà bầu ăn ngải cứu được không" — thì vẫn trả lời ở đây.)
    const nq0 = ` ${normalizeVi(q)} `;
    const group = (KID.test(nq0) && [...(f.how ?? []), ...f.caution].some((x) => KID_FACT.test(x.text))) || (PREG.test(nq0) && f.caution.some((x) => PREG_FACT.test(x.text)));
    if (med && !group && !f.topics.some((t) => t.id === med.id) && !folkWord && FOOD_ASK.test(nq0) && !HELP_ASK.test(nq0)) return null;
    return { text: renderFolk(f, med, Date.now(), q), folk: f.id, topic: med?.id, verdict: f.verdict };
  }
  const uh = findUnverifiedHerb(q);
  if (uh && asked) {
    if (med && !folkWord && FOOD_ASK.test(` ${normalizeVi(q)} `) && !HELP_ASK.test(` ${normalizeVi(q)} `)) return null;
    return { text: renderUnverified(uh, med?.name), topic: med?.id };
  }
  if (!folkWord) return null;
  // Triệu chứng không có thẻ riêng theo tên trần ("ho", "đau họng", "nghẹt mũi") → thẻ gần nhất có mẹo dân gian.
  const nq = ` ${normalizeVi(q)} `;
  const sx = VN(/\b(ho|ho khan|ho có đờm|ho đờm|ho có đàm)\b/).test(nq) ? { id: "ho", name: "ho" } : VN(/\b(đau họng|rát họng|viêm họng)\b/).test(nq) ? { id: "viem-hong", name: "đau họng" } : VN(/\b(nghẹt mũi|sổ mũi|cảm lạnh|cảm)\b/).test(nq) ? { id: "cam-lanh", name: "cảm lạnh, nghẹt mũi" } : null;
  const tp = med ?? sx ?? prevMed;
  if (tp) return { text: renderFolkForTopic(tp.id, tp.name) ?? renderNoFolk(tp.name), topic: tp.id };
  return { text: renderFolkMenu() };
}
