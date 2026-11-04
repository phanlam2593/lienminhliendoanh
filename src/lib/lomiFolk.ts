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

export type FolkVerdict = "help" | "mixed" | "unclear" | "risky" | "danger" | "myth" | "trad";
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
  // 04/11 (Kir): vị lấy từ tra cứu dược liệu (Long Châu) — nói theo y học cổ truyền, để tham khảo
  trad: { icon: "📜", text: "Thông tin tham khảo theo y học cổ truyền — không thay thuốc bác sĩ kê" },
};

const VERIFIED = "2026-10-20";
const NCCIH = "NCCIH (Viện Y tế Quốc gia Hoa Kỳ – NIH)";
const nccih = (slug: string, title: string, upd: string): DrugSource => ({ title: `${title} (trang ghi cập nhật ${upd})`, publisher: NCCIH, url: `https://www.nccih.nih.gov/health/${slug}` });
const NHS_COUGH: DrugSource = { title: "Cough", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/cough/", reviewed: "2023-12-08" };
const NHS_SORE: DrugSource = { title: "Sore throat", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/sore-throat/", reviewed: "2024-04-08" };
const MEDLINE_COUGH: DrugSource = { title: "Cough", publisher: "MedlinePlus (NIH, Hoa Kỳ)", url: "https://medlineplus.gov/cough.html", reviewed: "2025-03-18" };
const NHS_FEVER_AD: DrugSource = { title: "High temperature (fever) in adults", publisher: "NHS (Anh)", url: "https://www.nhs.uk/symptoms/fever-in-adults/", reviewed: "2026-10-19" };
const MEDLINE_FEVER: DrugSource = { title: "Fever (Medical Encyclopedia)", publisher: "MedlinePlus (NIH, Hoa Kỳ)", url: "https://medlineplus.gov/ency/article/003090.htm" };
const MAYO_MELA: DrugSource = { title: "Melatonin side effects: What are the risks? (16/12/2025)", publisher: "Mayo Clinic", url: "https://www.mayoclinic.org/healthy-lifestyle/adult-health/expert-answers/melatonin-side-effects/faq-20057874" };
const MAYO_MILK: DrugSource = { title: "Cold symptoms: Does drinking milk increase phlegm? (13/06/2023)", publisher: "Mayo Clinic", url: "https://www.mayoclinic.org/symptoms/phlegm/expert-answers/faq-20058015" };
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
      { id: "ho", text: "dân gian hay dùng khi cảm cúm, ho; nguồn chưa nêu nghiên cứu nào cho thấy gừng làm hết ho", src: [0], v: "unclear" },
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
    names: ["nghệ", "tinh bột nghệ", "nghệ mật ong", "mật ong nghệ", "mật ong với nghệ", "nghệ với mật ong", "nghệ trộn mật ong", "curcumin", "nghệ tươi", "bột nghệ"],
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
    names: ["cúc la mã", "trà cúc la mã", "chamomile", "hoa cúc la mã", "trà hoa cúc", "trà cúc"],
    verdict: "unclear",
    // 04/11: "trà hoa cúc" ở Việt Nam nhiều khi là cúc vàng / cúc chi (loài khác) — nguồn chỉ nói về cúc La Mã
    unverified: ["trà hoa cúc vàng / cúc chi (loại cúc Việt Nam hay dùng, khác cúc La Mã) giúp ngủ ngon, \"mát gan\""],
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
  // 04/11 (Kir: "có mấy loại trà trị mất ngủ… e thêm vào") — NCCIH Passionflower (cập nhật 04/2025), Mayo Clinic Melatonin (16/12/2025), đọc 04/11/2026.
  {
    id: "lac-tien",
    name: "Lạc tiên tây (passionflower)",
    names: ["passionflower", "passion flower", "lạc tiên tây", "hoa lạc tiên", "lạc tiên", "trà lạc tiên", "dây lạc tiên", "chùm bao"],
    verdict: "mixed",
    unverified: ["lạc tiên mọc dại ở Việt Nam (chùm bao) có tác dụng giống loài passionflower được nghiên cứu"],
    folk: [{ text: "Từ xưa passionflower được dùng như thuốc an thần; nay được bán làm thực phẩm bổ sung cho lo âu, khó ngủ.", src: [0] }],
    science: [
      { text: "Một ít nghiên cứu cho thấy uống passionflower **có thể tăng tổng thời gian ngủ** ở người lớn mất ngủ; còn chuyện dễ vào giấc, ngủ không thức giấc thì kết quả chưa thống nhất.", src: [0] },
      { text: "Lo âu: có thể giảm triệu chứng, nhưng bằng chứng còn ít, chưa kết luận được.", src: [0] },
    ],
    caution: [
      { text: "Có thể gây buồn ngủ, chóng mặt, lú lẫn — đừng lái xe ngay sau khi uống.", src: [0] },
      { text: "**Bà bầu không dùng** — có thể gây co bóp tử cung. Cho con bú: chưa rõ an toàn.", src: [0] },
      { text: "Dùng dạng trà ngắn ngày (khoảng một tuần) có thể an toàn; dùng lâu chưa rõ.", src: [0] },
    ],
    topics: [
      { id: "mat-ngu", text: "có thể tăng tổng thời gian ngủ (nghiên cứu ít); bà bầu không dùng", src: [0], v: "mixed" },
      { id: "lo-au", text: "có thể giảm lo âu nhưng bằng chứng còn ít", src: [0], v: "unclear" },
    ],
    sources: [{ title: "Passionflower (cập nhật 04/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/passionflower" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "melatonin",
    name: "Melatonin (viên ngủ)",
    names: ["melatonin", "viên melatonin", "kẹo ngủ melatonin"],
    verdict: "mixed",
    folk: [{ text: "Melatonin là viên bổ sung hay được mua để dễ ngủ, đỡ lệch múi giờ khi đi xa.", src: [0] }],
    science: [
      { text: "Có thể đỡ phần nào **mất ngủ và lệch múi giờ**; dùng ngắn ngày nhìn chung an toàn, dùng lâu dài cần thêm nghiên cứu.", src: [0] },
      { text: "Ít khi bị lệ thuộc hay giảm tác dụng theo thời gian.", src: [0] },
    ],
    how: [{ text: "Không nên xem melatonin là cách đầu tiên hay duy nhất cho mất ngủ — kết hợp ăn uống lành mạnh, vận động, thói quen ngủ tốt.", src: [0] }],
    caution: [
      { text: "Hay gặp: đau đầu, chóng mặt, buồn nôn, buồn ngủ ban ngày — **đừng lái xe, vận hành máy trong 5 giờ** sau khi uống.", src: [0] },
      { text: "Có thể tương tác thuốc chống đông, thuốc chống động kinh, thuốc tránh thai, thuốc huyết áp, thuốc tiểu đường, thuốc ức chế miễn dịch — hỏi bác sĩ / dược sĩ trước.", src: [0] },
      { text: "Mỗi sản phẩm chứa lượng melatonin khác nhau nhiều; có bệnh nền hay đang dùng thuốc thì hỏi bác sĩ trước khi uống.", src: [0] },
    ],
    topics: [{ id: "mat-ngu", text: "có thể đỡ phần nào mất ngủ; không thay được thói quen ngủ tốt; đừng lái xe trong 5 giờ sau khi uống", src: [0], v: "mixed" }],
    sources: [MAYO_MELA],
    verifiedAt: "2026-11-04",
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
    // (01/11: chỉ khi câu nói tới ĂN / KIÊNG — "tôi bị nhức mỏi khắp người" là kể triệu chứng, không phải hỏi kiêng "đồ nhức")
    ctx: VN(/\b(khớp|gout|gút|thấp khớp|nhức xương|nhức mỏi|xương khớp|thoái hoá|đau lưng|gai cột sống)\b(?=.*\b(ăn|kiêng|cữ|món|đồ|măng|vịt|mướp|bí|khổ qua|chua)\b)|\b(ăn|kiêng|cữ|món|đồ|măng|vịt|mướp|bí|khổ qua|chua)\b(?=.*\b(khớp|gout|gút|thấp khớp|nhức xương|nhức mỏi|xương khớp|thoái hoá|đau lưng|gai cột sống)\b)/),
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
    names: ["vitamin c", "nước cam", "uống nước cam", "c sủi", "viên sủi c", "uống nước chanh", "echinacea"],
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
  // 04/11 (Kir: "ho khá phổ biến… ho kiêng đồ lạnh, tôm, hút thuốc… nên uống chanh mật ong, gừng") — đối chiếu NHS Cough
  //   (rà 08/12/2023), NHS Sore throat (rà 08/04/2024), Mayo Clinic (sữa & đờm, 13/06/2023), đọc lại ngày 04/11/2026.
  {
    id: "ho-kieng",
    name: "Bị ho: kiêng đồ lạnh, tôm cua, hải sản, trứng, sữa, kiêng gió?",
    names: ["tôm", "cua", "tôm cua", "hải sản", "đồ biển", "đồ tanh", "tanh", "trứng", "sữa", "uống sữa", "đồ lạnh", "nước lạnh", "nước đá", "đá lạnh", "kem", "ăn kem", "đồ uống lạnh", "nước ngọt lạnh", "kiêng gió", "ra gió", "kiêng gì", "kiêng ăn", "nên ăn gì", "ăn gì", "uống gì", "hút thuốc", "thuốc lá", "khói thuốc", "ngậm muối", "nước muối", "súc miệng", "súc họng", "nước ấm", "đồ ấm", "cay", "đồ cay"],
    ctx: VN(/\b(bị ho|đang ho|còn ho|hay ho|ho khan|ho có đờm|ho có đàm|ho đờm|ho kéo dài|ho dai dẳng|ho lâu|cơn ho|ho nhiều|ho quá|ho hoài|ho suốt)\b/),
    verdict: "myth",
    tip: true,
    belief: "Bị ho thì kiêng đồ lạnh, nước đá, kem; kiêng tôm, cua, hải sản, đồ tanh, trứng, sữa (sợ thêm đờm); kiêng gió.",
    unverified: ["ho phải kiêng tôm, cua, hải sản, đồ tanh hay trứng", "ho phải kiêng gió"],
    folk: [],
    science: [
      { text: "Hướng dẫn tự chăm khi ho **không nêu món ăn nào phải kiêng** — chỉ khuyên nghỉ ngơi, uống nhiều nước.", src: [0] },
      { text: "**Đồ lạnh:** khi đau họng, hướng dẫn y khoa còn gợi ý ăn đồ mát hoặc mềm, ngậm đá viên, kem que cho dịu họng (đừng cho trẻ nhỏ ngậm vật nhỏ, cứng vì dễ hóc).", src: [1] },
      { text: "**Sữa:** uống sữa không làm cơ thể tiết thêm đờm — sữa trộn với nước bọt chỉ tạo cảm giác hơi đặc ở họng trong chốc lát.", src: [2] },
      { text: "**Hút thuốc** là một nguyên nhân gây ho; khi đau họng cũng nên tránh hút thuốc và chỗ có khói thuốc.", src: [0, 1] },
    ],
    how: [
      { text: "Nghỉ ngơi, uống nhiều nước; chanh mật ong ấm có thể dịu ho gần giống siro ho (bằng chứng còn hạn chế).", src: [0] },
      { text: "Đau họng kèm theo: súc họng bằng nước muối ấm rồi nhổ ra (trẻ em không nên làm), ăn đồ mát hoặc mềm, uống nhiều nước.", src: [1] },
    ],
    caution: [
      { text: "Không cho bé dưới 1 tuổi ăn mật ong; không cho trẻ nhỏ uống đồ nóng.", src: [0] },
      { text: "Đi khám nếu ho quá 3 tuần, ho ra máu, khó thở, đau ngực, hoặc ho nặng lên nhanh.", src: [0] },
    ],
    topics: [{ id: "ho", text: "nguồn không nêu món phải kiêng khi ho — nghỉ ngơi, uống nhiều nước, tránh khói thuốc", src: [0, 1], v: "myth" }],
    sources: [NHS_COUGH, NHS_SORE, MAYO_MILK, MEDLINE_COUGH],
    verifiedAt: "2026-11-04",
  },
  // 04/11: người lớn bị sốt hỏi kiêng gì (trẻ sốt có mục riêng "tre-sot-kieng") — NHS High temperature in adults (rà 19/10/2026), đọc 04/11/2026.
  {
    id: "sot-kieng",
    name: "Người lớn bị sốt: kiêng tôm, trứng, đồ tanh, kiêng tắm, kiêng gió?",
    names: ["tôm", "cua", "hải sản", "đồ tanh", "trứng", "sữa", "thịt", "kiêng gì", "kiêng ăn", "nên ăn gì", "ăn gì", "uống gì", "tắm", "gội đầu", "kiêng gió", "ra gió", "đồ lạnh", "nước đá"],
    ctx: VN(/\b(bị sốt|đang sốt|sốt cao|sốt nhẹ|còn sốt|lên cơn sốt|sốt)\b(?! (xuất huyết|rét|phát ban|co giật|siêu vi))/),
    verdict: "myth",
    tip: true,
    belief: "Bị sốt thì kiêng tôm, cua, trứng, đồ tanh, kiêng tắm, kiêng gió, ủ thật kín cho ra mồ hôi.",
    unverified: ["sốt phải kiêng tôm, cua, trứng hay đồ tanh", "sốt phải kiêng tắm, kiêng gió"],
    folk: [],
    science: [{ text: "Hướng dẫn tự chăm khi sốt ở người lớn **không nêu món ăn nào phải kiêng** — chỉ khuyên nghỉ ngơi nhiều, uống nhiều nước (nước lọc là tốt nhất).", src: [0] }],
    how: [
      { text: "Uống đủ nước để không mất nước — đủ để nước tiểu vàng nhạt, trong.", src: [0] },
      { text: "Cố ở nhà, hạn chế tiếp xúc người khác cho tới khi hết sốt.", src: [0] },
    ],
    caution: [{ text: "Gọi cấp cứu nếu người sốt lú lẫn, khó đánh thức, co giật, khó thở, môi / móng tím tái, đau đầu dữ dội hoặc cứng cổ.", src: [1] }],
    topics: [{ id: "sot", text: "nguồn không nêu món phải kiêng khi sốt — nghỉ ngơi, uống nhiều nước", src: [0], v: "myth" }],
    sources: [NHS_FEVER_AD, MEDLINE_FEVER],
    verifiedAt: "2026-11-04",
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
    names: ["xoa rượu", "bóp rượu", "thoa rượu", "rượu thuốc", "rượu gừng", "dầu nóng", "dầu gió", "cao nóng", "chườm nóng", "đắp nóng", "ngâm nước nóng", "xoa bóp", "bóp chân", "massage", "mát xa", "đắp muối", "rang muối", "xoa dầu", "thoa dầu", "bôi dầu"],
    ctx: VN(/\b(bong gân|trật chân|trặc chân|trặc tay|trật tay|trẹo chân|lật cổ chân|sái chân|trẹo cổ chân|giãn dây chằng|căng cơ|trật khớp cổ chân|sưng mắt cá)\b/),
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
  // ── 31/10 (đợt 6 — danh sách ChatGPT lần 2; mỗi ý đối chiếu trang nguồn đọc ngày 31/10/2026) ──
  {
    id: "rua-vung-kin-la",
    name: "Rửa, xông vùng kín bằng nước lá (trầu không, lá lốt, chè xanh)?",
    names: ["rửa vùng kín", "xông vùng kín", "xông hơi vùng kín", "thụt rửa", "thụt rửa âm đạo", "rửa sâu", "rửa bên trong", "nước lá trầu", "lá trầu không", "lá trầu", "nước lá lốt", "lá lốt", "nước chè xanh", "chè xanh", "trà xanh", "nước muối", "dung dịch vệ sinh", "xà phòng thơm"],
    ctx: VN(/\b(vùng kín|phụ khoa|âm đạo|cô bé|viêm âm đạo|khí hư|huyết trắng|ngứa vùng kín|viêm phụ khoa|nấm âm đạo|chỗ kín)\b/),
    verdict: "myth",
    belief: "Ngứa, viêm vùng kín, ra khí hư thì rửa hoặc xông bằng nước lá trầu không, lá lốt, chè xanh, nước muối; thụt rửa cho \"sạch sâu\".",
    folk: [],
    science: [
      { text: "**Không rửa bên trong âm đạo (thụt rửa).**", src: [0] },
      { text: "Không dùng sản phẩm vệ sinh có mùi thơm (xà phòng, chất khử mùi) trong hoặc quanh vùng kín.", src: [0] },
    ],
    how: [{ text: "Chỉ rửa bên ngoài vùng kín bằng nước sạch rồi lau khô kỹ.", src: [0] }],
    caution: [],
    unverified: ["nước lá trầu không, lá lốt, chè xanh chữa ngứa, viêm vùng kín, khí hư"],
    topics: [],
    sources: [{ title: "Vaginitis", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/vaginitis/", reviewed: "2023-02-27" }],
    verifiedAt: "2026-10-31",
  },
  {
    id: "phan-ta-diep",
    name: "Phan tả diệp (senna) uống trị táo bón, giảm cân?",
    names: ["phan tả diệp", "lá phan tả", "lá phan tả diệp", "trà phan tả diệp", "senna", "trà senna", "lá senna"],
    verdict: "risky",
    belief: "Uống trà phan tả diệp (senna) cho dễ đi cầu, \"xổ\" cho giảm cân.",
    folk: [{ text: "Phan tả diệp (senna) là thuốc nhuận tràng kiểu kích thích — tác động lên cơ thành ruột để đẩy phân đi.", src: [0] }],
    science: [
      { text: "Chỉ nên dùng **thỉnh thoảng, vài ngày một lần**; không dùng quá 1 tuần mà chưa hỏi bác sĩ.", src: [0, 1] },
      { text: "Dùng lâu có thể gây tiêu chảy, mất cân bằng điện giải (nặng thì co rút cơ, co giật); dùng nhiều tuần, nhiều tháng có thể làm ruột **mất khả năng tự hoạt động**.", src: [0] },
    ],
    caution: [
      { text: "Đang đau bụng, buồn nôn, nôn, hoặc thói quen đi cầu thay đổi đột ngột kéo dài hơn 2 tuần thì hỏi bác sĩ trước.", src: [1] },
      { text: "Chảy máu hậu môn khi đang dùng → ngưng và báo bác sĩ ngay.", src: [1] },
    ],
    topics: [
      { id: "tao-bon", text: "phan tả diệp (senna) chỉ dùng thỉnh thoảng vài ngày; dùng lâu có thể làm ruột lười, rối loạn điện giải", src: [0, 1], v: "risky" },
      { id: "beo-phi", text: "phan tả diệp (senna) là thuốc nhuận tràng kích thích — chỉ dùng thỉnh thoảng vài ngày; uống lâu để \"xổ\" có thể gây tiêu chảy, rối loạn điện giải, ruột lười", src: [0, 1], v: "risky" },
    ],
    sources: [
      { title: "Common questions about senna", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/senna/common-questions-about-senna/", reviewed: "2022-02-01" },
      { title: "Senna — Drug Information (sửa đổi 20/06/2024)", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a601112.html" },
    ],
    verifiedAt: "2026-10-31",
  },
  {
    id: "sinh-mo-nam-im",
    name: "Sinh mổ xong phải nằm im, kiêng đi lại?",
    names: ["nằm im", "nằm yên", "nằm một chỗ", "kiêng đi lại", "kiêng vận động", "không dám đi", "không được đi lại", "đi lại được không", "đi lại sớm", "ngồi dậy"],
    ctx: VN(/\b(sinh mổ|mổ đẻ|đẻ mổ|mổ lấy thai|mổ bắt con|sanh mổ)\b/),
    verdict: "myth",
    belief: "Sinh mổ xong phải nằm im trên giường nhiều ngày, kiêng đi lại cho \"liền vết mổ\".",
    folk: [],
    science: [
      { text: "Ở bệnh viện, mẹ sinh mổ được **khuyến khích ra khỏi giường và đi lại càng sớm càng tốt**.", src: [0] },
      { text: "Vận động nhẹ như đi bộ mỗi ngày giúp **giảm nguy cơ cục máu đông** — nhưng đừng gắng sức quá.", src: [0] },
    ],
    how: [{ text: "Lau rửa nhẹ vết mổ và giữ khô mỗi ngày; chưa bê vật nặng hơn em bé (có khi tới khoảng 6 tuần), chưa lái xe vài tuần.", src: [0] }],
    caution: [],
    topics: [],
    sources: [{ title: "Caesarean section – Recovery", publisher: "NHS (Anh)", url: "https://www.nhs.uk/tests-and-treatments/caesarean-section/recovery/", reviewed: "2023-01-04" }],
    verifiedAt: "2026-10-31",
  },
  {
    id: "hai-san-vitamin-c",
    name: "Ăn tôm, hải sản cùng vitamin C (cam, chanh) sinh thạch tín?",
    names: ["vitamin c", "uống vitamin c", "viên c", "c sủi", "cam", "nước cam", "chanh", "nước chanh", "trái cây", "thạch tín", "asen", "arsenic", "ngộ độc asen"],
    ctx: VN(/\b(tôm|cua|ghẹ|hải sản|sò|ốc|mực|hàu|nghêu|tôm hùm)\b/),
    verdict: "myth",
    belief: "Ăn tôm, cua, hải sản rồi uống vitamin C hay ăn cam, chanh sẽ \"sinh ra thạch tín\" gây ngộ độc.",
    folk: [],
    science: [
      { text: "Trong hải sản, asen (thạch tín) chủ yếu ở **dạng hữu cơ, ít độc**; asen vô cơ (như trong nước ngầm nhiễm asen) mới rất độc.", src: [0] },
    ],
    caution: [{ text: "Nguồn phơi nhiễm asen vô cơ đáng lo nhất là nước ngầm nhiễm asen dùng để uống, nấu ăn.", src: [0] }],
    unverified: ["ăn hải sản cùng vitamin C, cam, chanh tạo ra thạch tín gây ngộ độc"],
    topics: [
      { id: "ngo-doc-thuc-pham", text: "ăn hải sản cùng cam, chanh, vitamin C không có nguồn nào cho thấy sinh thạch tín — asen trong hải sản chủ yếu là dạng hữu cơ ít độc", src: [0], v: "myth" },
      { id: "ngo-doc", text: "ăn hải sản cùng cam, chanh, vitamin C không có nguồn nào cho thấy sinh thạch tín — asen trong hải sản chủ yếu là dạng hữu cơ ít độc", src: [0], v: "myth" },
    ],
    sources: [{ title: "Arsenic — fact sheet (07/12/2022)", publisher: "WHO", url: "https://www.who.int/news-room/fact-sheets/detail/arsenic" }],
    verifiedAt: "2026-10-31",
  },
  {
    id: "tre-sot-kieng-an",
    name: "Trẻ sốt phải kiêng thịt, trứng, sữa, đồ tanh?",
    names: ["kiêng thịt", "kiêng trứng", "kiêng sữa", "kiêng tanh", "kiêng đồ tanh", "kiêng thịt gà", "kiêng thịt bò", "kiêng cá", "kiêng ăn", "nhịn ăn", "không cho ăn", "ăn thịt", "ăn trứng", "uống sữa", "bú sữa", "ăn cá"],
    ctx: VN(/\b(trẻ|bé|con|em bé|cháu|con nít)\b.*\bsốt\b|\bsốt\b.*\b(trẻ|bé|con|em bé|cháu)\b/),
    verdict: "myth",
    belief: "Trẻ sốt phải kiêng thịt, trứng, sữa, đồ tanh, ăn cháo trắng cho \"hạ nhiệt\".",
    folk: [],
    science: [
      { text: "Hướng dẫn chăm trẻ sốt của NHS: **cho trẻ ăn nếu trẻ thấy đói** — không nêu món nào phải kiêng.", src: [0] },
      { text: "Cho trẻ **uống nhiều nước**; bé bú mẹ thì cứ cho bú.", src: [0] },
    ],
    caution: [{ text: "Để ý dấu hiệu mất nước: tiểu ít hơn bình thường, khát nhiều, mắt trũng — có thì đưa đi khám.", src: [0] }],
    topics: [{ id: "sot-o-tre-em", text: "không cần kiêng thịt, trứng, sữa — trẻ đói thì cho ăn, uống nhiều nước, để ý dấu hiệu mất nước", src: [0], v: "myth" }],
    sources: [{ title: "Fever (high temperature) in children (cập nhật 16/12/2024)", publisher: "Kingston and Richmond NHS Foundation Trust (Anh)", url: "https://www.kingstonandrichmond.nhs.uk/patients-and-families/patient-leaflets/fever-high-temperature-children" }],
    verifiedAt: "2026-10-31",
  },
  {
    id: "ashwagandha",
    name: "Sâm Ấn Độ (ashwagandha)",
    names: ["ashwagandha", "sâm ấn độ", "sâm ấn"],
    verdict: "mixed",
    folk: [{ text: "Dùng lâu đời trong y học Ayurveda (Ấn Độ); nay được quảng cáo giúp giảm căng thẳng, ngủ ngon, tăng khả năng sinh sản nam.", src: [0] }],
    science: [{ text: "Một số chế phẩm có thể giúp mất ngủ và căng thẳng; với lo âu thì chưa rõ. Dùng 2–4 tháng có thể tăng testosterone, chất lượng tinh trùng (dữ liệu còn ít).", src: [0] }],
    caution: [{ text: "Có lẽ an toàn tới 3 tháng; dùng lâu chưa rõ. Có thể buồn ngủ, khó chịu bụng, tiêu chảy, nôn; hiếm khi gây tổn thương gan.", src: [0] }, { text: "**Không dùng** khi mang thai, cho con bú, trước phẫu thuật, có bệnh tự miễn hay bệnh tuyến giáp, ung thư tuyến tiền liệt nhạy hormon. Có thể tương tác thuốc tiểu đường, huyết áp, tuyến giáp.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "một số chế phẩm có thể giúp ngủ; dùng tối đa khoảng 3 tháng, bà bầu không dùng", src: [0], v: "mixed" }, { id: "lo-au", text: "bằng chứng cho lo âu chưa rõ", src: [0], v: "unclear" }],
    sources: [{ title: "Ashwagandha (cập nhật 03/2023)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/ashwagandha" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoa-anh-thao",
    name: "Tinh dầu hoa anh thảo (evening primrose oil)",
    names: ["hoa anh thảo", "tinh dầu hoa anh thảo", "dầu hoa anh thảo", "evening primrose", "evening primrose oil"],
    verdict: "unclear",
    folk: [{ text: "Được quảng cáo cho chàm (viêm da cơ địa), viêm khớp dạng thấp, hội chứng tiền kinh nguyệt, đau ngực, triệu chứng mãn kinh.", src: [0] }],
    science: [{ text: "Uống **không giúp được chàm**; với đau ngực có lẽ không hơn giả dược; tiền kinh nguyệt, mãn kinh: chưa đủ bằng chứng.", src: [0] }],
    caution: [{ text: "Có lẽ an toàn với đa số người lớn; có thể đau bụng, buồn nôn, tiêu chảy. Mang thai, cho con bú: chưa rõ an toàn. Đang dùng thuốc thì hỏi bác sĩ trước.", src: [0] }],
    topics: [{ id: "viem-da-co-dia", text: "uống không giúp được chàm theo nghiên cứu", src: [0], v: "unclear" }, { id: "man-kinh", text: "chưa đủ bằng chứng giúp triệu chứng mãn kinh", src: [0], v: "unclear" }, { id: "hoi-chung-tien-kinh-nguyet", text: "chưa đủ bằng chứng giúp tiền kinh nguyệt", src: [0], v: "unclear" }],
    sources: [{ title: "Evening Primrose Oil (cập nhật 11/2024)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/evening-primrose-oil" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "echinacea",
    name: "Cúc tím (echinacea)",
    names: ["echinacea", "cúc tím", "hoa cúc tím"],
    verdict: "mixed",
    folk: [{ text: "Được bán chủ yếu để phòng, chữa cảm lạnh và nhiễm trùng hô hấp, với ý nghĩ là kích thích miễn dịch.", src: [0] }],
    science: [{ text: "Có thể **giảm nhẹ khả năng bị cảm lạnh**, nhưng chưa rõ có làm cảm mau khỏi không.", src: [0] }],
    caution: [{ text: "Dùng ngắn ngày có lẽ an toàn với đa số người lớn; có thể dị ứng (có khi nặng), khó chịu tiêu hoá. Trẻ em, bà bầu: hỏi bác sĩ trước.", src: [0] }],
    topics: [{ id: "cam-lanh", text: "có thể giảm nhẹ khả năng bị cảm; chưa rõ có làm mau khỏi không", src: [0], v: "mixed" }],
    sources: [{ title: "Echinacea (cập nhật 11/2024)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/echinacea" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "com-chay",
    name: "Quả cơm cháy (elderberry)",
    names: ["elderberry", "cơm cháy", "quả cơm cháy", "siro cơm cháy"],
    verdict: "unclear",
    folk: [{ text: "Dân gian châu Âu dùng lâu đời cho cảm lạnh, cúm; nay bán làm thực phẩm bổ sung.", src: [0] }],
    science: [{ text: "Vài nghiên cứu đầu cho thấy **có thể** giảm triệu chứng cúm, cảm lạnh — nhưng còn rất ít nghiên cứu. Không có bằng chứng giúp COVID-19.", src: [0] }],
    caution: [{ text: "**Quả sống / chưa chín, lá, thân có chất sinh ra cyanide** — gây buồn nôn, nôn, tiêu chảy nặng; nấu chín thì hết độc.", src: [0] }, { text: "Mang thai, cho con bú: chưa rõ an toàn — hỏi bác sĩ trước.", src: [0] }],
    topics: [{ id: "cum", text: "vài nghiên cứu nhỏ thấy có thể giảm triệu chứng; quả sống, lá, thân có độc", src: [0], v: "unclear" }, { id: "cam-lanh", text: "bằng chứng còn rất ít", src: [0], v: "unclear" }],
    sources: [{ title: "Elderberry (cập nhật 11/2024)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/elderberry" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ban-au",
    name: "Cỏ ban Âu (St. John's wort)",
    names: ["st john's wort", "st. john's wort", "cỏ ban", "cỏ ban âu", "hypericum"],
    verdict: "risky",
    folk: [{ text: "Được quảng cáo cho trầm cảm và triệu chứng mãn kinh; dạng bôi dùng cho vết thương, bệnh da.", src: [0] }],
    science: [{ text: "Có thể giúp **trầm cảm nhẹ – vừa** (tương đương thuốc chống trầm cảm chuẩn trong nghiên cứu); trầm cảm nặng hoặc dùng quá 12 tuần thì chưa rõ.", src: [0] }],
    caution: [{ text: "**Tương tác nguy hiểm với rất nhiều thuốc** — làm giảm tác dụng thuốc tránh thai, warfarin, một số thuốc tim, HIV; dùng chung thuốc chống trầm cảm có thể gây phản ứng nặng.", src: [0] }, { text: "Có thể tăng nguy cơ dị tật thai. Đang uống bất kỳ thuốc nào thì hỏi bác sĩ trước.", src: [0] }],
    topics: [{ id: "tram-cam", text: "có thể giúp trầm cảm nhẹ – vừa nhưng tương tác nguy hiểm với nhiều thuốc — hỏi bác sĩ trước", src: [0], v: "risky" }],
    sources: [{ title: "St. John's Wort (cập nhật 05/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/st-johns-wort" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "black-cohosh",
    name: "Black cohosh (thăng ma Bắc Mỹ)",
    names: ["black cohosh", "thăng ma bắc mỹ"],
    verdict: "mixed",
    folk: [{ text: "Rễ cây được bán làm thực phẩm bổ sung, chủ yếu cho triệu chứng mãn kinh.", src: [0] }],
    science: [{ text: "Tổng hợp 22 nghiên cứu (2023) gợi ý **có thể giúp triệu chứng mãn kinh**, chủ yếu cơn bốc hoả; các công dụng khác chưa rõ.", src: [0] }],
    caution: [{ text: "Hiếm khi có báo cáo **tổn thương gan** (có khi nặng). Mang thai, cho con bú, ung thư vú / tử cung: chưa rõ an toàn — hỏi bác sĩ.", src: [0] }],
    topics: [{ id: "man-kinh", text: "có thể giảm bốc hoả; hiếm khi gây hại gan — hỏi bác sĩ", src: [0], v: "mixed" }],
    sources: [{ title: "Black Cohosh (cập nhật 11/2024)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/black-cohosh" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "co-cua",
    name: "Cọ lùn (saw palmetto)",
    names: ["saw palmetto", "cọ lùn", "cây cọ lùn"],
    verdict: "unclear",
    folk: [{ text: "Được quảng cáo cho phì đại tuyến tiền liệt, hói kiểu nam, viêm tuyến tiền liệt mạn.", src: [0] }],
    science: [{ text: "Dùng riêng **gần như không giúp** triệu chứng tiểu tiện do phì đại tuyến tiền liệt; viêm tuyến tiền liệt mạn: không thấy lợi ích rõ; rụng tóc: chưa đủ dữ liệu.", src: [0] }],
    caution: [{ text: "Thường dung nạp tốt; có thể khó chịu tiêu hoá, chóng mặt, đau đầu. Có thể không an toàn khi mang thai, cho con bú.", src: [0] }],
    topics: [{ id: "phi-dai-tuyen-tien-liet", text: "dùng riêng gần như không giúp triệu chứng tiểu tiện", src: [0], v: "unclear" }, { id: "rung-toc", text: "chưa đủ dữ liệu", src: [0], v: "unclear" }],
    sources: [{ title: "Saw Palmetto (cập nhật 04/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/saw-palmetto" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "kava",
    name: "Kava",
    names: ["kava", "rễ kava"],
    verdict: "risky",
    folk: [{ text: "Cây vùng Nam Thái Bình Dương, được bán làm thực phẩm bổ sung chủ yếu cho lo âu.", src: [0] }],
    science: [{ text: "Vài nghiên cứu thấy có thể giúp lo âu (cần vài tuần); không thấy giúp rối loạn lo âu lan toả.", src: [0] }],
    caution: [{ text: "Liên quan đến **tổn thương gan hiếm gặp, có ca nặng hoặc tử vong**. Không dùng chung rượu bia hay thuốc an thần. Mang thai, cho con bú: hỏi bác sĩ.", src: [0] }],
    topics: [{ id: "lo-au", text: "có thể giúp lo âu nhưng có nguy cơ hại gan", src: [0], v: "risky" }],
    sources: [{ title: "Kava (cập nhật 04/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/kava" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "yohimbe",
    name: "Yohimbe",
    names: ["yohimbe", "yohimbine"],
    verdict: "danger",
    folk: [{ text: "Vỏ cây châu Phi, được quảng cáo giúp cương dương, thể thao, giảm cân; dân gian dùng làm thuốc kích dục.", src: [0] }],
    science: [{ text: "Nghiên cứu trên người rất ít, **chưa đủ bằng chứng** giúp bệnh nào; hàm lượng mỗi sản phẩm khác nhau nhiều.", src: [0] }],
    caution: [{ text: "Yohimbine liên quan đến **loạn nhịp tim, rối loạn huyết áp, nhồi máu cơ tim, co giật**. Không dùng chung thuốc chống trầm cảm MAOI hoặc ba vòng.", src: [0] }],
    topics: [{ id: "roi-loan-cuong-duong", text: "chưa đủ bằng chứng, lại có nguy cơ tim mạch, co giật — không nên tự dùng", src: [0], v: "danger" }],
    sources: [{ title: "Yohimbe (cập nhật 05/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/yohimbe" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "rhodiola",
    name: "Rhodiola (hồng cảnh thiên)",
    names: ["rhodiola", "hồng cảnh thiên"],
    verdict: "unclear",
    folk: [{ text: "Được quảng cáo tăng năng lượng, giảm căng thẳng, cải thiện tâm trạng, trí nhớ, thể lực; dân gian dùng cho mệt mỏi, trầm cảm.", src: [0] }],
    science: [{ text: "**Chưa đủ bằng chứng tin cậy** là giúp được việc gì; nghiên cứu trên người chất lượng thấp – trung bình.", src: [0] }],
    caution: [{ text: "Có lẽ an toàn tới 12 tuần; có thể chóng mặt, đau đầu, mất ngủ, khô miệng. Có báo cáo tương tác với losartan. Mang thai, cho con bú: chưa rõ.", src: [0] }],
    topics: [{ id: "tram-cam", text: "chưa đủ bằng chứng", src: [0], v: "unclear" }],
    sources: [{ title: "Rhodiola (cập nhật 04/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/rhodiola" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "viet-quat-den",
    name: "Việt quất đen (bilberry)",
    names: ["bilberry", "việt quất đen", "việt quất châu âu"],
    verdict: "unclear",
    folk: [{ text: "Được quảng cáo cho mắt và tuần hoàn; chuyện phi công Anh ăn mứt việt quất đen để nhìn đêm rõ hơn làm nó nổi tiếng.", src: [0] }],
    science: [{ text: "Chưa được chứng minh rõ là giúp bệnh nào; các nghiên cứu kỹ nhất về **nhìn đêm không thấy lợi ích** ở người khoẻ.", src: [0] }],
    caution: [{ text: "Quả ăn với lượng thức ăn thì an toàn; lá dùng liều cao, lâu dài có thể không an toàn. Đang dùng thuốc, mang thai, cho con bú: hỏi bác sĩ.", src: [0] }],
    topics: [],
    sources: [{ title: "Bilberry (cập nhật 11/2024)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/bilberry" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hat-nho",
    name: "Chiết xuất hạt nho",
    names: ["hạt nho", "chiết xuất hạt nho", "grape seed", "grape seed extract", "tinh chất hạt nho"],
    verdict: "mixed",
    folk: [{ text: "Làm từ hạt nho làm rượu, được bán để hạ cholesterol, huyết áp; cũng có trong sản phẩm bôi vết thương, chống sâu răng.", src: [0] }],
    science: [{ text: "Tổng hợp nghiên cứu gợi ý có thể **giảm nhẹ LDL, triglycerid** và huyết áp tâm trương (số dưới); lành vết thương, sâu răng: chưa đủ bằng chứng.", src: [0] }],
    caution: [{ text: "Thường dung nạp tốt. Đang dùng thuốc thì hỏi bác sĩ trước (có thể tương tác). Mang thai, cho con bú: chưa rõ an toàn.", src: [0] }],
    topics: [{ id: "mo-mau-cao", text: "có thể giảm nhẹ LDL, triglycerid — không thay thuốc", src: [0], v: "mixed" }, { id: "tang-huyet-ap", text: "có thể giảm nhẹ huyết áp tâm trương", src: [0], v: "mixed" }],
    sources: [{ title: "Grape Seed Extract (cập nhật 02/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/grape-seed-extract" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "xo-thom",
    name: "Lá xô thơm (sage)",
    names: ["xô thơm", "lá xô thơm", "sage", "cây xô thơm"],
    verdict: "mixed",
    folk: [{ text: "Gia vị nấu ăn và vị thuốc dân gian; được bán làm thực phẩm bổ sung cho triệu chứng mãn kinh, trí nhớ, cholesterol.", src: [0] }],
    science: [{ text: "Vài nghiên cứu nhỏ gợi ý xô thơm có thể **giảm bốc hoả** và có lợi cho mỡ máu; trí nhớ: vài nghiên cứu ở người khoẻ; đường huyết: chưa đủ bằng chứng.", src: [0] }],
    caution: [{ text: "Lượng dùng trong món ăn thì an toàn; xô thơm thường có **thujone** — độc khi dùng nhiều hoặc lâu ngày. Bà bầu có thể không an toàn — hỏi bác sĩ.", src: [0] }],
    topics: [{ id: "man-kinh", text: "vài nghiên cứu nhỏ thấy có thể giảm bốc hoả", src: [0], v: "mixed" }],
    sources: [{ title: "Sage (cập nhật 04/2025)", publisher: NCCIH, url: "https://www.nccih.nih.gov/health/sage" }],
    verifiedAt: "2026-11-04",
  },
  // ── 04/11 (Kir: tham khảo tra cứu dược liệu Long Châu) — y học cổ truyền + nghiên cứu, viết lại có chọn lọc, không chép nguyên văn ──
  {
    id: "ca-gai-leo",
    name: "Cà gai leo",
    names: ["cà gai leo", "cây cà gai leo", "trà cà gai leo"],
    verdict: "trad",
    folk: [{ text: "Dân gian, y học cổ truyền dùng cà gai leo để giải rượu và hỗ trợ các bệnh gan (viêm gan, xơ gan).", src: [0] }],
    science: [{ text: "Có một số nghiên cứu về tác dụng bảo vệ gan.", src: [0] }],
    how: [{ text: "Sắc hoặc hãm cà gai leo khô uống để giải rượu; liều lượng theo hướng dẫn thầy thuốc y học cổ truyền.", src: [0] }],
    caution: [{ text: "Mang thai, cho con bú: chưa đủ thông tin là an toàn — nên tránh. Chọn dược liệu rõ nguồn gốc, chất lượng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-gan", text: "dân gian, y học cổ truyền dùng hỗ trợ gan — đang điều trị viêm gan thì vẫn theo thuốc bác sĩ kê", src: [0], v: "trad" }, { id: "ngo-doc-ruou", text: "dân gian dùng giải rượu; ngộ độc rượu nặng (lơ mơ, nôn liên tục, thở chậm) phải gọi 115", src: [0], v: "trad" }],
    sources: [{ title: "Cà gai leo", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ca-gai-leo" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "diep-ha-chau",
    name: "Diệp hạ châu (chó đẻ răng cưa)",
    names: ["diệp hạ châu", "chó đẻ răng cưa", "cây chó đẻ", "chó đẻ thân xanh", "phyllanthus"],
    verdict: "trad",
    folk: [{ text: "Đông y xem diệp hạ châu vị ngọt đắng, tính bình; dân gian dùng chữa mụn nhọt, viêm họng, lở ngứa, bệnh gan, lợi tiểu.", src: [0] }],
    science: [{ text: "Một số nghiên cứu trong và ngoài nước về hỗ trợ viêm gan (kể cả viêm gan B) và đã có chế phẩm trên thị trường — nhưng **không thay thuốc kháng virus** bác sĩ kê.", src: [0] }],
    caution: [{ text: "**Phụ nữ có thai không dùng.** Dễ nhầm với các loài cây khác. Không làm theo các bài thuốc giã đắp vết thương (dễ nhiễm trùng).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-gan-b", text: "dân gian, y học cổ truyền dùng hỗ trợ — vẫn uống thuốc kháng virus bác sĩ kê, dùng gì cũng báo bác sĩ", src: [0], v: "trad" }, { id: "mun-nhot", text: "dân gian dùng giã đắp; nhọt sưng to, sốt thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Diệp hạ châu", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/diep-ha-chau" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "rau-ma",
    name: "Rau má",
    names: ["rau má", "nước rau má", "tích tuyết thảo", "gotu kola", "centella"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem rau má vị đắng, tính hàn; dùng cho tiêu chảy mùa hè, vàng da, tiểu buốt, chảy máu cam, làm lành vết thương, làm đẹp da.", src: [0] }],
    science: [{ text: "Nhiều nghiên cứu về làm lành vết thương, chống oxy hoá, chăm sóc da (chiết xuất có trong mỹ phẩm, thuốc bôi).", src: [0] }],
    caution: [{ text: "Có thể gây đau đầu, đau bụng, chóng mặt. **Mang thai, cho con bú: chưa đủ thông tin an toàn**; ngưng ít nhất 2 tuần trước phẫu thuật theo lịch.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mun-trung-ca", text: "dân gian dùng uống / đắp; mụn nặng nên khám da liễu", src: [0], v: "trad" }],
    sources: [{ title: "Rau má", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/rau-ma" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "diep-ca",
    name: "Diếp cá",
    names: ["diếp cá", "rau diếp cá", "lá diếp cá", "dấp cá", "giấp cá"],
    verdict: "trad",
    folk: [{ text: "Đông y xem diếp cá vị chua cay, tính mát; dùng thanh nhiệt, giải độc, lợi tiểu, chữa mụn nhọt; dân gian hay dùng cho trĩ (uống, xông, rửa).", src: [0] }],
    science: [{ text: "Tinh dầu diếp cá ức chế một số vi khuẩn, virus, nấm trong phòng thí nghiệm.", src: [0] }],
    how: [{ text: "Trĩ — nấu nước lá diếp cá để xông, ngâm rửa, đắp bã; liều lượng theo thầy thuốc.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền: người bị sung huyết não, mất ngủ không nên dùng nhiều.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tri", text: "dân gian dùng xông, rửa, đắp; trĩ chảy máu nhiều, đau dữ dội thì đi khám", src: [0], v: "trad" }, { id: "mun-nhot", text: "dân gian dùng thanh nhiệt, giải độc", src: [0], v: "trad" }],
    sources: [{ title: "Diếp cá", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/diep-ca" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ky-tu",
    name: "Câu kỷ tử (kỷ tử)",
    names: ["câu kỷ tử", "kỷ tử", "kỉ tử", "câu kỉ tử", "goji", "quả goji", "khởi tử"],
    verdict: "trad",
    folk: [{ text: "Tài liệu cổ xem kỷ tử vị ngọt, tính bình; dùng bổ can thận, sáng mắt, mạnh gân cốt, bồi bổ người gầy yếu, mệt mỏi.", src: [0] }],
    science: [{ text: "Một số thí nghiệm trên chuột thấy tăng miễn dịch.", src: [0] }],
    caution: [{ text: "Độc tính thấp. Không nên ngâm rượu uống thường xuyên (hại gan, nghiện rượu).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Câu kỷ tử", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cau-ky-tu" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dai-tao",
    name: "Đại táo (táo tàu)",
    names: ["đại táo", "táo tàu", "táo tào", "táo đỏ", "táo đen", "hồng táo"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem đại táo vị ngọt, tính ấm; dùng bổ khí, dưỡng huyết, an thần, cho người kém ăn, mệt mỏi, phân lỏng.", src: [0] }],
    science: [{ text: "Thí nghiệm trên chuột về tăng cân, tăng sức, bảo vệ gan.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền: không dùng khi đau răng, đầy bụng, đờm nhiệt; trẻ đau bụng do giun không dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Đại táo", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dai-tao-qua" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dong-trung",
    name: "Đông trùng hạ thảo",
    names: ["đông trùng hạ thảo", "đông trùng", "cordyceps", "nấm đông trùng"],
    verdict: "trad",
    folk: [{ text: "Dân gian, Đông y dùng làm thuốc bổ cho người già suy nhược, viêm phế quản mạn.", src: [0] }],
    science: [],
    caution: [{ text: "Dùng ngắn ngày thường được coi là an toàn; có thể đau bụng, tiêu chảy, buồn nôn, khô miệng. Hàng giả, hàng kém chất lượng nhiều — chọn nơi bán uy tín.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Đông trùng hạ thảo", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dong-trung-ha-thao" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "nhan-tran",
    name: "Nhân trần",
    names: ["nhân trần", "trà nhân trần", "bồ bồ", "nhân trần bồ bồ"],
    verdict: "trad",
    folk: [{ text: "Dân gian, y học cổ truyền dùng nhân trần thanh nhiệt, lợi thấp, chữa vàng da; hay pha nước uống \"mát gan\".", src: [0] }],
    science: [],
    caution: [{ text: "Có ít nhất 3 cây khác nhau cùng tên \"nhân trần\" — dễ dùng nhầm. Vàng da, vàng mắt là dấu hiệu cần **đi khám**, đừng chỉ uống nhân trần.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-gan", text: "dân gian dùng 'mát gan'; vàng da, vàng mắt thì phải đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Nhân trần", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/nhan-tran" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ich-mau",
    name: "Ích mẫu",
    names: ["ích mẫu", "cao ích mẫu", "cây ích mẫu", "sung úy"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng ích mẫu cho phụ nữ, nhất là sau sinh: rong kinh, kinh nguyệt ra nhiều, đau bụng kinh.", src: [0] }],
    science: [{ text: "Thí nghiệm trên động vật thấy kích thích co tử cung.", src: [0] }],
    caution: [{ text: "**Không dùng khi mang thai** (gây co tử cung), khi kinh nguyệt ra nhiều, khi máu khó đông. Dùng quá liều có thể chóng mặt, mệt, choáng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kinh-nguyet-khong-deu", text: "y học cổ truyền dùng; bà bầu không dùng — kinh ra quá nhiều, kéo dài thì đi khám", src: [0], v: "trad" }, { id: "dau-bung-kinh", text: "y học cổ truyền dùng; đau dữ dội, bất thường thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Ích mẫu", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ich-mau" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "duong-quy",
    name: "Đương quy",
    names: ["đương quy", "dong quai", "angelica sinensis", "rễ đương quy"],
    verdict: "trad",
    folk: [{ text: "Đông y xem đương quy vị ngọt cay, tính ấm; là vị đầu tiên trong thuốc bệnh phụ nữ: bổ huyết, điều kinh, giảm đau bụng kinh, nhuận tràng.", src: [0] }],
    science: [{ text: "Thí nghiệm cho thấy tác động lên tử cung và cơ trơn.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền: người thể trạng nóng, tiêu chảy không nên dùng. Đang dùng thuốc chống đông, mang thai: hỏi bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "thieu-mau", text: "y học cổ truyền dùng bổ huyết; thiếu máu cần xét nghiệm tìm nguyên nhân", src: [0], v: "trad" }, { id: "kinh-nguyet-khong-deu", text: "y học cổ truyền dùng điều kinh", src: [0], v: "trad" }],
    sources: [{ title: "Đương quy", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/duong-quy-ngon-re-than" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "tam-that",
    name: "Tam thất",
    names: ["tam thất", "bột tam thất", "sâm tam thất", "điền thất", "panax notoginseng"],
    verdict: "trad",
    folk: [{ text: "Đông y xem tam thất vị ngọt hơi đắng, tính ấm; tác dụng chính là cầm máu, tan máu bầm, tiêu sưng giảm đau.", src: [0] }],
    science: [{ text: "Nghiên cứu về tim mạch, miễn dịch, chống viêm, cầm máu.", src: [0] }],
    caution: [{ text: "**Phụ nữ có thai không dùng.** Đang dùng thuốc chống đông / chống kết tập tiểu cầu thì hỏi bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "chay-mau", text: "y học cổ truyền dùng cầm máu; chảy máu nhiều, không cầm thì gọi 115", src: [0], v: "trad" }],
    sources: [{ title: "Tam thất", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/tam-that" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "kim-tien-thao",
    name: "Kim tiền thảo",
    names: ["kim tiền thảo", "đồng tiền lông", "cỏ đồng tiền", "desmodium"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng kim tiền thảo thanh nhiệt, lợi tiểu, chữa sỏi thận, sỏi tiết niệu.", src: [0] }],
    science: [{ text: "Thí nghiệm trên chuột thấy giảm hình thành sỏi calci oxalat.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền: không dùng cho người tỳ hư, tiêu chảy, **phụ nữ có thai**. Sỏi gây đau quặn, sốt, tiểu ra máu thì đi khám.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "soi-than", text: "y học cổ truyền dùng lợi tiểu, hỗ trợ sỏi; đau quặn dữ dội, sốt, bí tiểu thì đi khám ngay", src: [0], v: "trad" }],
    sources: [{ title: "Kim tiền thảo", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/kim-tien-thao" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "giao-co-lam",
    name: "Giảo cổ lam",
    names: ["giảo cổ lam", "trà giảo cổ lam", "gynostemma"],
    verdict: "trad",
    folk: [{ text: "Được dùng lâu đời ở Trung Quốc, Nhật, Hàn; vị đắng trước ngọt sau, được ví như nhân sâm; hay dùng pha trà.", src: [0] }],
    science: [{ text: "Có nghiên cứu về hạ đường huyết, hạ mỡ máu.", src: [0] }],
    caution: [{ text: "Đang uống thuốc tiểu đường thì **dễ hạ đường huyết quá mức** khi dùng thêm — hỏi bác sĩ trước, đừng bỏ thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tieu-duong", text: "tài liệu tham khảo nói có tác dụng hạ đường huyết — đang dùng thuốc tiểu đường thì hỏi bác sĩ, đừng bỏ thuốc", src: [0], v: "trad" }, { id: "mo-mau-cao", text: "theo tài liệu tham khảo có nghiên cứu về hạ mỡ máu", src: [0], v: "trad" }],
    sources: [{ title: "Giảo cổ lam", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/giao-co-lam" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "day-thia-canh",
    name: "Dây thìa canh",
    names: ["dây thìa canh", "thìa canh", "gymnema", "dây muôi"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng dây thìa canh sắc nước uống để hạ đường huyết cho người tiểu đường.", src: [0] }],
    science: [{ text: "Hoạt chất acid gymnemic được nghiên cứu về điều hoà đường huyết.", src: [0] }],
    caution: [{ text: "Có thể làm kém ngon miệng, tiêu chảy. Đang dùng thuốc tiểu đường thì **dễ hạ đường quá mức** — hỏi bác sĩ, đừng tự bỏ thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tieu-duong", text: "dân gian dùng hạ đường; không thay thuốc — dùng chung thuốc dễ hạ đường quá mức", src: [0], v: "trad" }],
    sources: [{ title: "Dây thìa canh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/day-thia-canh" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "xa-den",
    name: "Xạ đen",
    names: ["xạ đen", "lá xạ đen", "cây xạ đen", "trà xạ đen"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem xạ đen vị đắng, tính hàn; dùng thanh nhiệt, giải độc, tiêu viêm, hỗ trợ bệnh gan, mụn nhọt.", src: [0] }],
    science: [{ text: "Y học hiện đại có nghiên cứu hoạt chất của xạ đen trên tế bào ung thư trong phòng thí nghiệm.", src: [0] }],
    caution: [{ text: "Đang điều trị ung thư (hoá trị, xạ trị) thì báo bác sĩ trước khi dùng — thảo dược có thể ảnh hưởng điều trị. Đừng bỏ điều trị chuẩn.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ung-thu", text: "y học cổ truyền dùng hỗ trợ — không bỏ điều trị ung thư, báo bác sĩ trước khi dùng", src: [0], v: "trad" }],
    sources: [{ title: "Xạ đen", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/xa-den" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "trinh-nu-hoang-cung",
    name: "Trinh nữ hoàng cung",
    names: ["trinh nữ hoàng cung", "lá trinh nữ hoàng cung", "náng lá rộng"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem trinh nữ hoàng cung vị đắng, tính ấm; dùng lợi tiểu, tiêu u bướu; dân gian dùng cho u xơ tử cung, phì đại tuyến tiền liệt.", src: [0] }],
    science: [{ text: "Y học hiện đại có nghiên cứu về các hoạt chất alcaloid và tác dụng chống oxy hoá trong phòng thí nghiệm.", src: [0] }],
    caution: [{ text: "Dùng không đúng có thể gây ngộ độc — hỏi thầy thuốc y học cổ truyền trước. U bướu cần được bác sĩ theo dõi.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "u-xo-tu-cung", text: "dân gian, y học cổ truyền dùng — u xơ vẫn cần bác sĩ phụ khoa theo dõi định kỳ", src: [0], v: "trad" }, { id: "phi-dai-tuyen-tien-liet", text: "dân gian, y học cổ truyền dùng — vẫn nên khám nam khoa / tiết niệu định kỳ", src: [0], v: "trad" }],
    sources: [{ title: "Trinh nữ hoàng cung", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/trinh-nu-hoang-cung" }],
    verifiedAt: "2026-11-04",
  },
  // ── 04/11 đợt 2 (Long Châu, theo y học cổ truyền — tham khảo) ──
  {
    id: "la-lot",
    name: "Lá lốt",
    names: ["lá lốt", "cây lá lốt", "nước lá lốt"],
    verdict: "trad",
    folk: [{ text: "Dân gian, y học cổ truyền dùng lá lốt chữa chân tay đau nhức, tê bì, mụn nhọt.", src: [0] }],
    science: [],
    how: [{ text: "Đau nhức chân tay: lá lốt phối hợp rễ bưởi bung, rễ cỏ xước… sao vàng, sắc uống; lượng theo thầy thuốc.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền: người đau dạ dày, táo bón không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "thoai-hoa-khop", text: "dân gian dùng giảm đau nhức — đau sưng nóng đỏ, cứng khớp kéo dài thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Lá lốt", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/la-lot" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "trau-khong",
    name: "Lá trầu không",
    names: ["lá trầu không", "trầu không", "lá trầu", "nước lá trầu"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng lá trầu không để đánh gió khi cảm, nấu nước rửa vết thương, vệ sinh ngoài da.", src: [0] }],
    science: [],
    how: [{ text: "Cảm: dùng lá trầu không đánh gió, xát dọc sống lưng từ trên xuống.", src: [0] }],
    caution: [{ text: "**Đắp lá trầu không lên ngực có thể gây cạn sữa** — phụ nữ có thai, mẹ đang cho con bú nên hạn chế. Vết thương sâu, sưng đỏ, chảy mủ thì đi khám, đừng đắp lá.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "cam-lanh", text: "dân gian dùng đánh gió — sốt cao, khó thở thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Lá trầu không", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/la-trau-khong" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "nguu-tat",
    name: "Ngưu tất",
    names: ["ngưu tất", "rễ ngưu tất", "cỏ xước"],
    verdict: "trad",
    folk: [{ text: "Đông y xem ngưu tất vị chua đắng, tính bình; dùng thông huyết mạch, tan máu ứ, chữa đau lưng gối, tê bại, bí tiểu, phụ nữ tắc kinh.", src: [0] }],
    science: [{ text: "Y học hiện đại có nghiên cứu về tác dụng chống loãng xương của saponin trong ngưu tất.", src: [0] }],
    caution: [{ text: "**Phụ nữ có thai không được dùng**; người khí hư không dùng (theo y học cổ truyền).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-lung", text: "y học cổ truyền dùng cho đau lưng gối — đau kèm tê yếu chân, rối loạn tiểu tiện thì đi khám ngay", src: [0], v: "trad" }, { id: "thoai-hoa-khop", text: "y học cổ truyền dùng cho đau nhức, tê bại", src: [0], v: "trad" }],
    sources: [{ title: "Ngưu tất", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/nguu-tat" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoai-son",
    name: "Hoài sơn (củ mài)",
    names: ["hoài sơn", "củ mài", "sơn dược", "hoài sơn khô"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem hoài sơn vị ngọt, tính bình; là vị thuốc bổ: bổ tỳ, bổ thận, ích phế, dùng cho ăn uống khó tiêu, tiêu chảy lâu ngày, tiểu nhiều.", src: [0] }],
    science: [{ text: "Hoài sơn chứa chất nhầy mucin và men giúp thuỷ phân tinh bột.", src: [0] }],
    how: [{ text: "Tỳ vị hư, ăn ít, tiêu chảy lâu: dân gian nấu hoài sơn với gạo thành cháo ăn buổi sáng.", src: [0] }],
    caution: [{ text: "Khá an toàn; đang uống thuốc khác thì hỏi bác sĩ. Hoài sơn có đặc điểm giống estrogen — đang dùng thuốc nội tiết thì hỏi bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tieu-chay", text: "y học cổ truyền dùng cho tiêu chảy lâu ngày — tiêu chảy kèm mất nước, phân có máu thì đi khám", src: [0], v: "trad" }, { id: "kho-tieu", text: "y học cổ truyền dùng bổ tỳ, giúp ăn uống", src: [0], v: "trad" }],
    sources: [{ title: "Hoài sơn", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hoai-son" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "kim-ngan",
    name: "Kim ngân hoa",
    names: ["kim ngân hoa", "kim ngân", "hoa kim ngân", "nhẫn đông"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem kim ngân vị ngọt, tính hàn; thanh nhiệt, giải độc, chống dị ứng; dân gian dùng chữa mụn nhọt, mề đay, lở ngứa, viêm mũi dị ứng, rôm sảy.", src: [0] }],
    science: [{ text: "Nghiên cứu cho thấy nước sắc kim ngân hoa ức chế tụ cầu, vi khuẩn thương hàn, lỵ trong phòng thí nghiệm.", src: [0] }],
    caution: [{ text: "Một số người uống bị tiêu chảy — giảm lượng hoặc ngưng là hết. Theo y học cổ truyền: người tỳ vị hư hàn, ra nhiều mồ hôi không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mun-nhot", text: "y học cổ truyền dùng thanh nhiệt, giải độc", src: [0], v: "trad" }, { id: "viem-mui-di-ung", text: "dân gian dùng chống dị ứng — vẫn theo thuốc bác sĩ kê", src: [0], v: "trad" }, { id: "rom-say", text: "dân gian dùng tắm, uống cho rôm sảy", src: [0], v: "trad" }],
    sources: [{ title: "Kim ngân hoa", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/kim-ngan" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "la-han-qua",
    name: "La hán quả",
    names: ["la hán quả", "la hán", "trà la hán", "nước la hán"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem la hán quả vị ngọt, tính mát; thanh nhiệt, trị ho, long đờm, làm dịu cổ họng, nhuận tràng.", src: [0] }],
    science: [{ text: "Chứa mogroside có vị ngọt tự nhiên, ít calo, có tác dụng chống oxy hoá.", src: [0] }],
    how: [{ text: "Đau họng, khản giọng: thái lát la hán quả, sắc lấy nước uống trong ngày.", src: [0] }],
    caution: [{ text: "Trẻ dưới 6 tuổi, phụ nữ có thai, mẹ cho con bú nên hỏi bác sĩ trước. Người đang tiêu chảy, tay chân lạnh, sợ lạnh không hợp; không dùng quả đã hư mốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-hong", text: "dân gian dùng làm dịu họng — sốt cao, khó nuốt, khó thở thì đi khám", src: [0], v: "trad" }, { id: "ho", text: "dân gian dùng trị ho, long đờm", src: [0], v: "trad" }, { id: "tao-bon", text: "y học cổ truyền dùng nhuận tràng", src: [0], v: "trad" }],
    sources: [{ title: "La hán quả", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/la-han-qua" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "tam-sen",
    name: "Tâm sen",
    names: ["tâm sen", "trà tâm sen", "tim sen", "liên tâm"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem tâm sen vị đắng, tính hàn; thanh tâm, an thần, dùng cho mất ngủ, hồi hộp, lo lắng.", src: [0] }],
    science: [{ text: "Hoạt chất liensinin trong tâm sen được nghiên cứu về hạ huyết áp, chống co thắt cơ trơn.", src: [0] }],
    caution: [{ text: "**Không dùng cho trẻ em, phụ nữ mang thai, cho con bú**, người rối loạn kinh nguyệt. Tránh uống khi đói; uống liên tục nhiều tháng có thể gây mệt mỏi, rối loạn tiêu hoá.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "y học cổ truyền dùng an thần — mất ngủ kéo dài nên đi khám", src: [0], v: "trad" }, { id: "lo-au", text: "y học cổ truyền dùng an thần — lo âu kéo dài nên gặp bác sĩ", src: [0], v: "trad" }],
    sources: [{ title: "Tâm sen", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/tam-sen" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "la-sen",
    name: "Lá sen",
    names: ["lá sen", "trà lá sen", "hà diệp"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem lá sen vị đắng, tính bình; thanh nhiệt giải thử, lợi thấp, cầm máu, an thần.", src: [0] }],
    science: [{ text: "Nghiên cứu trên mô hình thí nghiệm và động vật cho thấy chiết xuất lá sen giúp điều chỉnh đường huyết.", src: [0] }],
    caution: [{ text: "Dị ứng với lá sen thì tránh. Đang dùng thuốc tiểu đường thì hỏi bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tieu-duong", text: "y học cổ truyền dùng hỗ trợ — vẫn dùng thuốc bác sĩ kê", src: [0], v: "trad" }, { id: "mat-ngu", text: "y học cổ truyền dùng an thần", src: [0], v: "trad" }],
    sources: [{ title: "Lá sen", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/sen-la" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hat-sen",
    name: "Hạt sen",
    names: ["hạt sen", "liên nhục", "chè hạt sen", "sen khô"],
    verdict: "trad",
    folk: [{ text: "Đông y xem hạt sen vị ngọt chát, tính bình; dùng cho hồi hộp mất ngủ, tiêu chảy, giúp ăn ngon, bồi bổ cơ thể.", src: [0] }],
    science: [{ text: "Có nghiên cứu về chiết xuất hạt sen với chống béo phì.", src: [0] }],
    caution: [{ text: "Lành tính nhưng không nên ăn quá nhiều — dễ đầy bụng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "y học cổ truyền dùng an thần, giúp ngủ", src: [0], v: "trad" }],
    sources: [{ title: "Hạt sen", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/sen-hat" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "rau-ngo",
    name: "Râu ngô",
    names: ["râu ngô", "râu bắp", "nước râu ngô", "nước râu bắp"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem râu ngô vị ngọt, tính bình; lợi tiểu, thanh nhiệt, lợi mật; dân gian dùng cho tiểu buốt, phù, sỏi, huyết áp cao.", src: [0] }],
    science: [{ text: "Râu ngô làm tăng bài tiết mật và tăng prothrombin máu (làm máu chóng đông hơn).", src: [0] }],
    caution: [{ text: "Không uống quá nhiều lần trong ngày hoặc kéo dài mà không có chỉ định; không dùng chung thuốc lợi tiểu. Trẻ em, phụ nữ có thai, người suy thận, người đang dùng thuốc chống đông hỏi bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tang-huyet-ap", text: "dân gian dùng hỗ trợ — vẫn uống thuốc huyết áp bác sĩ kê", src: [0], v: "trad" }, { id: "soi-than", text: "y học cổ truyền dùng lợi tiểu — đau quặn, sốt, bí tiểu thì đi khám ngay", src: [0], v: "trad" }],
    sources: [{ title: "Râu ngô", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/rau-ngo" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ma-de",
    name: "Mã đề",
    names: ["mã đề", "lá mã đề", "cây mã đề", "xa tiền", "xa tiền tử", "hạt mã đề"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem mã đề vị nhạt, tính mát; lợi tiểu, thanh nhiệt; dân gian dùng chữa ho lâu ngày, tiểu buốt, tiểu ra máu, sỏi.", src: [0] }],
    science: [{ text: "Hoạt chất plantagin làm tăng tiết dịch phế quản, ức chế trung tâm ho.", src: [0] }],
    caution: [{ text: "Dùng làm thuốc ho cho **trẻ em có thể gây đái dầm**. Thận trọng với phụ nữ có thai; người già suy thận, tiểu đêm không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ho", text: "dân gian dùng trị ho lâu ngày — ho trên 3 tuần, ho ra máu thì đi khám", src: [0], v: "trad" }, { id: "soi-than", text: "y học cổ truyền dùng lợi tiểu", src: [0], v: "trad" }],
    sources: [{ title: "Mã đề", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ma-de" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "la-tre",
    name: "Lá tre",
    names: ["lá tre", "trúc diệp", "nước lá tre"],
    verdict: "trad",
    folk: [{ text: "Dân gian, y học cổ truyền dùng lá tre phối hợp các vị khác chữa cảm sốt, miệng khô khát.", src: [0] }],
    science: [],
    caution: [{ text: "Ngày nay ít dùng; muốn dùng thì hỏi bác sĩ / thầy thuốc y học cổ truyền.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "sot", text: "dân gian dùng phối hợp khi cảm sốt — sốt cao, sốt kéo dài, trẻ nhỏ sốt thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Lá tre", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/la-tre" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "che-vang",
    name: "Chè vằng",
    names: ["chè vằng", "lá chè vằng", "trà chè vằng", "cẩm vân"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem chè vằng vị chát hơi đắng, tính ấm; thanh nhiệt, điều kinh, tiêu viêm; dân gian hay cho phụ nữ sau sinh uống.", src: [0] }],
    science: [{ text: "Trong phòng thí nghiệm, chè vằng ức chế khá mạnh tụ cầu vàng, liên cầu, vi khuẩn lỵ.", src: [0] }],
    caution: [{ text: "**Rất dễ nhầm chè vằng với lá ngón** (cây cực độc) — đã có ca hái nhầm bị ngộ độc chết người. Chỉ mua chè vằng rõ nguồn gốc, không tự hái.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kinh-nguyet-khong-deu", text: "y học cổ truyền dùng điều kinh — kinh ra quá nhiều, kéo dài thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Chè vằng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/che-vang" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoang-lien",
    name: "Hoàng liên",
    names: ["hoàng liên", "thân rễ hoàng liên", "coptis"],
    verdict: "trad",
    folk: [{ text: "Đông y xem hoàng liên vị đắng, tính hàn; tả hoả, giải độc, chữa sốt, tiêu chảy, lỵ, loét miệng, đau mắt đỏ.", src: [0] }],
    science: [{ text: "Thí nghiệm cho thấy hoàng liên có tác dụng với tụ cầu, liên cầu, trực khuẩn lỵ, thương hàn.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền **cấm dùng** cho người thiếu máu, khí hư, tỳ vị hư nhược, đang đi tả, trẻ đang lên đậu.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kiet-ly", text: "y học cổ truyền dùng — đi ngoài ra máu, sốt cao thì phải đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Hoàng liên", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hoang-lien-than-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "bach-truat",
    name: "Bạch truật",
    names: ["bạch truật", "thân rễ bạch truật"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng bạch truật kiện tỳ, cầm tiêu chảy, cho người mệt mỏi, kém ăn, đại tiện lỏng.", src: [0] }],
    science: [],
    caution: [{ text: "Theo y học cổ truyền không dùng cho người hen suyễn, táo bón, miệng khô họng khát, mụn mủ, viêm ruột cấp do nhiễm trùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tieu-chay", text: "y học cổ truyền dùng cầm tiêu chảy — mất nước, phân có máu thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Bạch truật", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/bach-truat" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "sa",
    name: "Sả",
    names: ["sả", "lá sả", "cây sả", "nước sả", "củ sả", "tinh dầu sả"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem sả vị cay, tính ấm; dân gian dùng chữa đau bụng, đầy hơi, rối loạn tiêu hoá, tiêu chảy, cảm (xông).", src: [0] }],
    science: [{ text: "Một tổng quan năm 2011 xem xét các chế phẩm từ sả trong việc chống muỗi đốt.", src: [0] }],
    how: [{ text: "Đau bụng, rối loạn tiêu hoá: đun sả tươi lấy nước uống ấm.", src: [0] }],
    caution: [{ text: "Bôi tinh dầu sả có thể gây dị ứng, kích ứng da. Sả trong món ăn an toàn, nhưng **uống tinh dầu sả lượng lớn không an toàn**.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "dân gian dùng chữa đầy hơi, đau bụng", src: [0], v: "trad" }, { id: "buon-non", text: "dân gian dùng chữa buồn nôn", src: [0], v: "trad" }],
    sources: [{ title: "Sả", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/chi-sa" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "rau-sam",
    name: "Rau sam",
    names: ["rau sam", "mã xỉ hiện"],
    verdict: "trad",
    folk: [{ text: "Đông y xem rau sam vị chua, tính hàn; dân gian dùng chữa lỵ, giun kim, lở ngứa, mụn nhọt; ăn như rau để thanh nhiệt, lợi tiểu.", src: [0] }],
    science: [{ text: "Nước sắc rau sam ức chế vi khuẩn lỵ, E. coli trong phòng thí nghiệm.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền: người tỳ vị hư hàn, đang đi ngoài phân lỏng không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kiet-ly", text: "dân gian dùng — trẻ nhỏ đi ngoài ra máu, sốt, lừ đừ thì đưa đi khám ngay", src: [0], v: "trad" }, { id: "mun-nhot", text: "dân gian dùng ngoài chữa mụn nhọt", src: [0], v: "trad" }],
    sources: [{ title: "Rau sam", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/rau-sam" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "binh-voi",
    name: "Bình vôi",
    names: ["bình vôi", "củ bình vôi", "ngải tượng"],
    verdict: "risky",
    folk: [{ text: "Y học cổ truyền xem bình vôi vị đắng ngọt; dùng cho mất ngủ, suy nhược thần kinh, đau dạ dày, ho nhiều đờm.", src: [0] }],
    science: [{ text: "Hoạt chất L-tetrahydropalmatin (rotundin) có tác dụng an thần, gây ngủ.", src: [0] }],
    caution: [{ text: "**Bình vôi có độc** (dù lượng rất nhỏ): dùng nhiều hoặc kéo dài có thể kích thích thần kinh, gây co giật, làm chậm nhịp tim. Không tự ý dùng — hỏi thầy thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "y học cổ truyền dùng an thần nhưng có độc — đừng tự ý dùng, mất ngủ kéo dài nên đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Bình vôi", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/binh-voi" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dan-sam",
    name: "Đan sâm",
    names: ["đan sâm", "rễ đan sâm", "danshen"],
    verdict: "trad",
    folk: [{ text: "Đông y xem đan sâm giúp lưu thông máu, tan máu ứ, giảm đau; dùng cho kinh nguyệt không đều, đau tức ngực, mất ngủ.", src: [0] }],
    science: [{ text: "Được nghiên cứu nhiều về tác động lên tim mạch.", src: [0] }],
    caution: [{ text: "Đang dùng thuốc tim mạch, thuốc chống đông, mang thai thì hỏi bác sĩ trước. Đau thắt ngực là dấu hiệu cần đi khám, đừng tự chữa.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kinh-nguyet-khong-deu", text: "y học cổ truyền dùng điều kinh", src: [0], v: "trad" }],
    sources: [{ title: "Đan sâm", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dan-sam-re-va-than-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dang-sam",
    name: "Đảng sâm",
    names: ["đảng sâm", "đẳng sâm", "rễ đảng sâm", "codonopsis"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem đảng sâm vị ngọt, tính bình; bổ tỳ, ích khí, sinh tân dịch — hay dùng thay nhân sâm trong bài thuốc bổ.", src: [0] }],
    science: [{ text: "Có nghiên cứu về polysaccharid của đảng sâm trên tế bào trong phòng thí nghiệm.", src: [0] }],
    caution: [{ text: "Không nên ngâm rượu uống thường xuyên. Đang có bệnh, đang dùng thuốc thì hỏi bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Đảng sâm", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dang-sam-re" }],
    verifiedAt: "2026-11-04",
  },
  // ── 04/11 đợt 3 (Kir: đinh lăng, ba kích, lá vối + vị tiếp theo; Long Châu — theo y học cổ truyền, tham khảo) ──
  {
    id: "dinh-lang",
    name: "Đinh lăng",
    names: ["đinh lăng", "lá đinh lăng", "củ đinh lăng", "rễ đinh lăng", "cây đinh lăng", "cao đinh lăng", "nước lá đinh lăng"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng đinh lăng làm thuốc bổ (được ví như \"nhân sâm của người nghèo\"); lá tính mát, vị hơi đắng, dùng cho tiêu hoá kém, đầy hơi, mất ngủ, đau đầu, rối loạn kinh nguyệt, đau lưng, dị ứng da.", src: [0] }],
    science: [{ text: "Lá đinh lăng chứa saponin, vitamin nhóm B (nhất là B1), alcaloid, flavonoid.", src: [0] }],
    how: [{ text: "Đau lưng: dân gian giã lá đinh lăng tươi xoa bóp chỗ đau.", src: [0] }, { text: "Nước lá đinh lăng nên uống trong ngày khi còn ấm — không uống nước đã để qua đêm.", src: [0] }],
    caution: [{ text: "**Không lạm dụng / uống thường xuyên**: nhiều saponin có thể gây hoa mắt, chóng mặt, buồn nôn, mệt mỏi.", src: [0] }, { text: "**Trẻ em chỉ dùng ngoài da, không uống**. **Bà bầu 3 tháng đầu không uống** nước lá đinh lăng. Bị dị ứng với đinh lăng thì không đắp lên da.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "y học cổ truyền dùng an thần, giúp ngủ — mất ngủ kéo dài nên đi khám", src: [0], v: "trad" }, { id: "kho-tieu", text: "y học cổ truyền dùng cho đầy hơi, khó tiêu", src: [0], v: "trad" }, { id: "kinh-nguyet-khong-deu", text: "y học cổ truyền dùng điều kinh", src: [0], v: "trad" }, { id: "dau-lung", text: "dân gian giã lá xoa bóp chỗ đau", src: [0], v: "trad" }, { id: "me-day", text: "dân gian dùng cho dị ứng, mề đay — sưng môi, khó thở thì gọi 115", src: [0], v: "trad" }],
    sources: [{ title: "Cây đinh lăng: công dụng, bài thuốc và lưu ý khi dùng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/bai-viet/cay-dinh-lang-cong-dung-bai-thuoc-va-luu-y-khi-dung.html" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ba-kich",
    name: "Ba kích",
    names: ["ba kích", "ba kích tím", "ba kích trắng", "rượu ba kích", "ba kích thiên", "morinda"],
    verdict: "trad",
    folk: [{ text: "Đông y xem ba kích vị cay ngọt, tính ấm, vào kinh thận; dùng bổ thận, tráng dương, tăng sinh lý nam, mạnh gân cốt, giảm đau nhức xương khớp. Ba kích tím được dùng nhiều nhất.", src: [0] }],
    science: [{ text: "Nghiên cứu bước đầu về tác dụng lên nội tiết sinh dục nam, chống viêm, giảm mệt mỏi.", src: [0] }],
    caution: [{ text: "**Không dùng cho**: người tăng huyết áp, người bệnh gan, người \"nóng trong\", phụ nữ mang thai / cho con bú, trẻ em.", src: [0] }, { text: "Có thể gây nóng trong, nổi mụn, táo bón, tăng huyết áp. **Phải bỏ lõi** (dùng nguyên lõi dễ ngộ độc). Lạm dụng rượu ba kích hại gan.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "roi-loan-cuong-duong", text: "y học cổ truyền dùng bổ thận, tráng dương — rối loạn cương kéo dài nên khám nam khoa", src: [0], v: "trad" }, { id: "thoai-hoa-khop", text: "y học cổ truyền dùng mạnh gân cốt", src: [0], v: "trad" }, { id: "tang-huyet-ap", text: "người tăng huyết áp không nên dùng ba kích — có thể làm tăng huyết áp", src: [0], v: "risky" }, { id: "gan-nhiem-mo", text: "người bệnh gan không nên dùng ba kích, nhất là rượu ba kích", src: [0], v: "risky" }, { id: "viem-gan", text: "người bệnh gan không nên dùng ba kích, nhất là rượu ba kích", src: [0], v: "risky" }],
    sources: [{ title: "Ba kích là gì? Những công dụng của ba kích", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/bai-viet/ba-kich-la-gi-nhung-cong-dung-cua-ba-kich-doi-voi-suc-khoe.html" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "la-voi",
    name: "Lá vối / nụ vối",
    names: ["lá vối", "nụ vối", "nước vối", "nước lá vối", "chè vối", "trà vối", "trà nụ vối", "cây vối"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng nước lá vối, nụ vối để thanh nhiệt, giải khát, giúp tiêu hoá, đỡ đầy bụng, khó tiêu, lợi tiểu; còn dùng hỗ trợ gout, mỡ máu, đường huyết.", src: [0] }],
    science: [{ text: "Nụ vối có flavonoid, lá có tinh dầu, tanin được nghiên cứu về ổn định đường huyết, mỡ máu và kháng khuẩn.", src: [0] }],
    how: [{ text: "Hãm lá vối khô như pha trà, chắt bỏ nước đầu; uống trong ngày, không để nước vối qua đêm (dễ thiu, đau bụng).", src: [0] }],
    caution: [{ text: "**Không uống khi đói** (dễ mệt, chóng mặt, xây xẩm); không lạm dụng, uống quá nhiều sau ăn.", src: [0] }, { text: "Không nên dùng: người quá gầy yếu, trẻ dưới 12 tuổi; bà bầu, mẹ cho con bú nên hạn chế; đang dùng thuốc điều trị bệnh thì hỏi bác sĩ.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "dân gian dùng giúp tiêu hoá, đỡ đầy bụng", src: [0], v: "trad" }, { id: "gout", text: "dân gian dùng lợi tiểu, hỗ trợ đào thải acid uric — vẫn theo thuốc bác sĩ kê", src: [0], v: "trad" }, { id: "tieu-duong", text: "dân gian dùng hỗ trợ đường huyết — đang dùng thuốc thì hỏi bác sĩ", src: [0], v: "trad" }, { id: "mo-mau-cao", text: "dân gian dùng hỗ trợ giảm mỡ máu", src: [0], v: "trad" }],
    sources: [{ title: "Những tác hại của lá vối mà bạn nên chú ý khi dùng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/bai-viet/nhung-tac-hai-cua-la-voi-ma-ban-nen-chu-y-khi-dung.html" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "la-oi",
    name: "Lá ổi / búp ổi",
    names: ["lá ổi", "búp ổi", "lá ổi non", "nước lá ổi"],
    verdict: "trad",
    folk: [{ text: "Đông y dùng lá non, búp ổi chữa tiêu chảy, đau bụng đi ngoài; lá tươi dùng khi bầm dập, vết loét.", src: [0] }],
    science: [{ text: "Lá ổi có tác dụng làm săn, gây táo bón — vì vậy dùng cho tiêu chảy.", src: [0] }],
    caution: [{ text: "Đang táo bón không nên dùng. Tiêu chảy kèm sốt cao, phân có máu, mất nước (khát, ít tiểu) thì đi khám.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tieu-chay", text: "dân gian dùng búp ổi — trẻ nhỏ, mất nước, phân có máu thì đi khám; bù nước bằng oresol vẫn là chính", src: [0], v: "trad" }],
    sources: [{ title: "Lá ổi / búp ổi", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/oi-la" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "cat-canh",
    name: "Cát cánh",
    names: ["cát cánh", "rễ cát cánh"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem cát cánh vị đắng cay; trừ đờm, lợi họng; dùng cho ho nhiều đờm, đau họng, khàn tiếng.", src: [0] }],
    science: [{ text: "Hoạt chất platycodin (saponin) được nghiên cứu nhiều về tác dụng long đờm, miễn dịch.", src: [0] }],
    caution: [{ text: "Ho lâu ngày kiểu âm hư hoặc **ho ra máu không nên dùng**; dùng lượng lớn có thể gây nôn.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ho", text: "y học cổ truyền dùng long đờm — ho trên 3 tuần, ho ra máu thì đi khám", src: [0], v: "trad" }, { id: "viem-hong", text: "y học cổ truyền dùng lợi họng", src: [0], v: "trad" }],
    sources: [{ title: "Cát cánh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cat-canh-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "bach-bo",
    name: "Bách bộ",
    names: ["bách bộ", "rễ bách bộ", "củ bách bộ"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem bách bộ vị ngọt đắng, mát phổi; dân gian dùng chữa ho lâu ngày, trị giun.", src: [0] }],
    science: [{ text: "Hoạt chất stemonin ức chế trung tâm hô hấp, làm giảm phản xạ ho.", src: [0] }],
    caution: [{ text: "Người tỳ vị hư yếu không dùng. Ho kéo dài nhiều tuần cần đi khám tìm nguyên nhân (lao, hen…).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ho", text: "y học cổ truyền dùng cho ho lâu ngày — ho trên 3 tuần thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Bách bộ", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/bach-bo" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "bach-chi",
    name: "Bạch chỉ",
    names: ["bạch chỉ", "rễ bạch chỉ"],
    verdict: "trad",
    folk: [{ text: "Đông y xem bạch chỉ vị cay, tính ôn; giảm đau, thông mũi; dùng cho nhức đầu, đau răng, nghẹt mũi, viêm xoang.", src: [0] }],
    science: [{ text: "Thí nghiệm cho thấy bạch chỉ ức chế một số vi khuẩn như E. coli, trực khuẩn lỵ.", src: [0] }],
    caution: [{ text: "Không dùng cho người âm hư hoả vượng, nhiệt thịnh. Dễ nhầm với \"nam bạch chỉ\" (cây mát rừng) — là cây khác.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-dau", text: "y học cổ truyền dùng giảm đau đầu — đau đầu dữ dội đột ngột thì gọi 115", src: [0], v: "trad" }, { id: "viem-xoang", text: "y học cổ truyền dùng thông mũi", src: [0], v: "trad" }],
    sources: [{ title: "Bạch chỉ", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/bach-chi" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoang-ba",
    name: "Hoàng bá",
    names: ["hoàng bá", "vỏ hoàng bá"],
    verdict: "trad",
    folk: [{ text: "Đông y xem hoàng bá vị đắng, tính lạnh; thanh thấp nhiệt; dùng cho tiêu hoá kém, vàng da, trĩ, bệnh ngoài da.", src: [0] }],
    science: [{ text: "Thí nghiệm cho thấy dịch chiết hoàng bá ức chế tụ cầu, vi khuẩn lỵ, Salmonella.", src: [0] }],
    caution: [{ text: "Dùng quá mức có thể gây **vàng da ở trẻ sơ sinh** — bà bầu, mẹ cho con bú không tự dùng. Người tỳ hư, tiêu chảy không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Hoàng bá", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hoang-ba-vo-than" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "phuc-linh",
    name: "Phục linh (bạch linh)",
    names: ["phục linh", "bạch linh", "nấm phục linh", "phục thần"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng phục linh lợi tiểu, chữa phù, an thần; hay có trong các bài thuốc bổ.", src: [0] }],
    science: [{ text: "Nghiên cứu dược lý về bảo vệ gan, hạ đường huyết; polysaccharid tăng miễn dịch.", src: [0] }],
    caution: [{ text: "Đang dùng thuốc lợi tiểu, thuốc tiểu đường thì hỏi bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "y học cổ truyền dùng an thần", src: [0], v: "trad" }],
    sources: [{ title: "Phục linh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/phuc-linh" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "kinh-gioi",
    name: "Kinh giới",
    names: ["kinh giới", "lá kinh giới", "rau kinh giới"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem kinh giới vị cay, tính ôn; dùng giải cảm, đau đầu, lợi họng; vừa là rau ăn vừa là thuốc.", src: [0] }],
    science: [{ text: "Nghiên cứu ghi nhận kinh giới có tính kháng khuẩn, kháng virus, chống viêm.", src: [0] }],
    caution: [{ text: "Ăn như rau thì an toàn; dùng lượng lớn làm thuốc có thể gây tác dụng phụ — hỏi thầy thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "cam-lanh", text: "dân gian dùng giải cảm", src: [0], v: "trad" }, { id: "kho-tieu", text: "dân gian dùng chữa khó tiêu", src: [0], v: "trad" }],
    sources: [{ title: "Kinh giới", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/kinh-gioi" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hung-que",
    name: "Húng quế",
    names: ["húng quế", "rau quế", "lá húng quế", "hạt é", "hạt húng quế"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem húng quế vị cay, tính nóng; giải cảm, giảm đầy bụng khó tiêu, thông đường thở; hạt é nhuận tràng.", src: [0] }],
    science: [{ text: "Tinh dầu húng quế ức chế một số vi khuẩn trong thí nghiệm.", src: [0] }],
    caution: [{ text: "Ăn quá nhiều lá húng quế có thể ngộ độc eugenol (thở gấp, ho…). Ăn như rau gia vị thì bình thường.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "dân gian dùng đỡ đầy bụng", src: [0], v: "trad" }, { id: "tao-bon", text: "dân gian dùng hạt é nhuận tràng", src: [0], v: "trad" }],
    sources: [{ title: "Húng quế", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hung-que" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "co-man-trau",
    name: "Cỏ mần trầu",
    names: ["cỏ mần trầu", "mần trầu"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng cỏ mần trầu cho huyết áp cao, và gội đầu để giảm rụng tóc.", src: [0] }],
    science: [],
    caution: [{ text: "Theo y học cổ truyền: người không có thực nhiệt không dùng. Đang dùng thuốc huyết áp thì đừng tự bỏ thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tang-huyet-ap", text: "dân gian dùng hỗ trợ — vẫn uống thuốc huyết áp bác sĩ kê", src: [0], v: "trad" }, { id: "rung-toc", text: "dân gian dùng gội đầu", src: [0], v: "trad" }],
    sources: [{ title: "Cỏ mần trầu", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/co-man-trau" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "trach-ta",
    name: "Trạch tả",
    names: ["trạch tả", "củ trạch tả"],
    verdict: "trad",
    folk: [{ text: "Đông y xem trạch tả vị ngọt, tính lạnh; lợi tiểu, trừ thấp nhiệt; dùng cho bí tiểu, phù, tiêu chảy.", src: [0] }],
    science: [{ text: "Có nghiên cứu về trạch tả với gan nhiễm mỡ không do rượu.", src: [0] }],
    caution: [{ text: "Người gan thận hư, tiểu nhiều mà không có thấp nhiệt không được dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "gan-nhiem-mo", text: "có nghiên cứu tham khảo — gan nhiễm mỡ chủ yếu cần giảm cân, ăn uống, vận động", src: [0], v: "trad" }],
    sources: [{ title: "Trạch tả", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/trach-ta" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "la-khoi",
    name: "Lá khôi",
    names: ["lá khôi", "khôi tía", "cây khôi"],
    verdict: "trad",
    folk: [{ text: "Người dân vùng Thanh Hoá dùng lá khôi sắc uống chữa đau bụng, đau dạ dày.", src: [0] }],
    science: [],
    caution: [{ text: "Đau dạ dày kéo dài, nôn ra máu, đi ngoài phân đen thì đi khám ngay.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-da-day", text: "dân gian dùng — vẫn theo thuốc bác sĩ kê", src: [0], v: "trad" }, { id: "loet-da-day", text: "dân gian dùng — phân đen, nôn ra máu thì đi khám ngay", src: [0], v: "trad" }],
    sources: [{ title: "Lá khôi", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/khoi-la" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hy-thiem",
    name: "Hy thiêm",
    names: ["hy thiêm", "cỏ đĩ", "cây hy thiêm"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem hy thiêm vị đắng, tính hàn; dùng cho phong thấp, đau lưng mỏi gối, tê bại.", src: [0] }],
    science: [{ text: "Thí nghiệm trên chuột cho thấy tác dụng chống viêm.", src: [0] }],
    caution: [{ text: "Trẻ em, phụ nữ mang thai, cho con bú hỏi bác sĩ trước khi dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "thoai-hoa-khop", text: "y học cổ truyền dùng cho đau nhức xương khớp", src: [0], v: "trad" }, { id: "dau-lung", text: "y học cổ truyền dùng cho đau lưng mỏi gối", src: [0], v: "trad" }],
    sources: [{ title: "Hy thiêm", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hy-thiem" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "che-day",
    name: "Chè dây",
    names: ["chè dây", "trà chè dây", "lá chè dây"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem chè dây vị ngọt, tính mát; dân gian dùng cho đau dạ dày, ợ hơi, ợ chua, viêm loét dạ dày.", src: [0] }],
    science: [{ text: "Thí nghiệm trên chuột với flavonoid chè dây cho thấy giảm chỉ số loét dạ dày.", src: [0] }],
    caution: [{ text: "Đau dạ dày kéo dài, phân đen, nôn ra máu thì đi khám — đừng chỉ uống chè dây.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-da-day", text: "dân gian dùng — vẫn theo thuốc bác sĩ kê", src: [0], v: "trad" }, { id: "loet-da-day", text: "dân gian dùng — phân đen, nôn ra máu thì đi khám ngay", src: [0], v: "trad" }],
    sources: [{ title: "Chè dây", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/che-day" }],
    verifiedAt: "2026-11-04",
  },
  // ── 04/11 đợt 4 (Long Châu — theo y học cổ truyền, tham khảo) ──
  {
    id: "mach-mon",
    name: "Mạch môn",
    names: ["mạch môn", "mạch môn đông", "rễ mạch môn", "củ mạch môn"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem rễ mạch môn vị ngọt hơi đắng, tính mát; nhuận phế, giảm ho, thanh nhiệt; dùng cho ho khan, viêm họng, sốt khát nước.", src: [0] }],
    science: [{ text: "Có nghiên cứu về tác dụng chống huyết khối.", src: [0] }],
    caution: [{ text: "Không dùng liều cao kéo dài; hạn chế khi ho có đờm. Theo y học cổ truyền không dùng khi tiêu chảy, tỳ vị hư hàn.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ho", text: "y học cổ truyền dùng cho ho khan", src: [0], v: "trad" }, { id: "viem-hong", text: "y học cổ truyền dùng nhuận họng", src: [0], v: "trad" }],
    sources: [{ title: "Mạch môn", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/mach-mon-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "bach-thuoc",
    name: "Bạch thược",
    names: ["bạch thược", "rễ bạch thược"],
    verdict: "trad",
    folk: [{ text: "Đông y xem bạch thược vị đắng chua; dưỡng huyết, điều kinh, giảm đau; dùng cho đau bụng, đau bụng kinh, kinh nguyệt không đều.", src: [0] }],
    science: [{ text: "Cao nước bạch thược ức chế một số vi khuẩn (lỵ, tả, tụ cầu, Salmonella) trong thí nghiệm.", src: [0] }],
    caution: [{ text: "Không nên dùng khi đầy bụng; theo y học cổ truyền không phối hợp với lê lô.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-bung-kinh", text: "y học cổ truyền dùng giảm đau, điều kinh", src: [0], v: "trad" }, { id: "kinh-nguyet-khong-deu", text: "y học cổ truyền dùng dưỡng huyết, điều kinh", src: [0], v: "trad" }],
    sources: [{ title: "Bạch thược", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/bach-thuoc" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "moc-huong",
    name: "Mộc hương",
    names: ["mộc hương", "rễ mộc hương", "vân mộc hương"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem mộc hương vị cay đắng, tính ôn; kiện tỳ, hoà vị, giảm đau; dùng cho đầy bụng, đau bụng, tiêu chảy, lỵ, nôn.", src: [0] }],
    science: [{ text: "Thử nghiệm in vitro cho thấy cao rễ mộc hương ức chế tụ cầu và một số vi khuẩn.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền không dùng cho người táo bón do khí yếu, huyết hư.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "y học cổ truyền dùng cho đầy bụng, đau bụng", src: [0], v: "trad" }, { id: "kiet-ly", text: "y học cổ truyền dùng — đi ngoài ra máu, sốt cao thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Mộc hương", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/moc-huong" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoang-cam",
    name: "Hoàng cầm",
    names: ["hoàng cầm", "rễ hoàng cầm"],
    verdict: "trad",
    folk: [{ text: "Đông y xem hoàng cầm vị đắng, tính hàn; thanh thấp nhiệt; dùng cho tả lỵ, đau bụng, vàng da, ho do phế nhiệt.", src: [0] }],
    science: [{ text: "Tài liệu cũ ghi nhận hoàng cầm được dùng hỗ trợ hạ huyết áp.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền không dùng cho người tỳ vị hư hàn, tiêu chảy do lạnh.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Hoàng cầm", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hoang-cam-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "nga-truat",
    name: "Nga truật (nghệ đen)",
    names: ["nga truật", "nghệ đen", "nghệ tím", "ngải tím"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem nga truật vị cay đắng, tính ôn; hành khí, phá huyết; dùng cho đau bụng, ăn không tiêu, đầy hơi, kinh nguyệt ra máu cục.", src: [0] }],
    science: [{ text: "Thí nghiệm trên chuột thấy tăng tiết mật, giảm tiết dịch vị.", src: [0] }],
    caution: [{ text: "**Không dùng cho phụ nữ mang thai** và người rong kinh, kinh ra nhiều.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "y học cổ truyền dùng cho đầy hơi, ăn không tiêu", src: [0], v: "trad" }],
    sources: [{ title: "Nga truật", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/nga-truat" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "sinh-dia",
    name: "Sinh địa (địa hoàng)",
    names: ["sinh địa", "địa hoàng", "củ sinh địa", "can địa hoàng"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem sinh địa vị đắng ngọt, tính lạnh; bổ thận, dưỡng huyết, mát huyết; dùng khi sốt cao lâu ngày, mất nước, ho lao.", src: [0] }],
    science: [{ text: "Có nghiên cứu về tác dụng trên mạch máu.", src: [0] }],
    caution: [{ text: "Người ăn uống kém, khó tiêu nên thận trọng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Sinh địa", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/sinh-dia" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dai-hoang",
    name: "Đại hoàng",
    names: ["đại hoàng", "rễ đại hoàng", "rhubarb"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng đại hoàng làm thông đại tràng, giúp đi tiêu (tẩy), mát, tiêu độc; chữa táo bón do nóng.", src: [0] }],
    science: [{ text: "Đại hoàng kích thích co bóp ruột, tác dụng chậm vài giờ sau khi uống.", src: [0] }],
    caution: [{ text: "**Phụ nữ có thai, mẹ cho con bú không dùng.** Người không có nhiệt không nên dùng. Dùng lâu chữa táo bón có thể làm táo bón nặng hơn (do tanin).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tao-bon", text: "y học cổ truyền dùng làm thuốc tẩy — không dùng lâu; táo bón kéo dài nên đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Đại hoàng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dai-hoang-than-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "sa-nhan",
    name: "Sa nhân",
    names: ["sa nhân", "quả sa nhân", "sa nhân tím"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem sa nhân vị cay, tính ấm, thơm; ấm bụng, hành khí, giảm đau, giúp tiêu hoá; dùng cho đau bụng, đầy hơi, tiêu chảy.", src: [0] }],
    science: [{ text: "Tài liệu ghi nhận sa nhân giúp đỡ tiêu chảy, khó tiêu và có tính kháng khuẩn.", src: [0] }],
    caution: [{ text: "Người âm hư nội nhiệt không nên dùng. Nhiều cây có tên và hình dáng tương tự — dễ mua nhầm.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "y học cổ truyền dùng cho đầy hơi, khó tiêu", src: [0], v: "trad" }, { id: "tieu-chay", text: "y học cổ truyền dùng — mất nước, phân có máu thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Sa nhân", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/sa-nhan-qua" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "nhuc-dau-khau",
    name: "Nhục đậu khấu",
    names: ["nhục đậu khấu", "đậu khấu", "nutmeg"],
    verdict: "risky",
    folk: [{ text: "Y học cổ truyền xem nhục đậu khấu vị cay đắng, tính ấm, **có độc**; kích thích tiêu hoá, cầm tiêu chảy, chống nôn.", src: [0] }],
    science: [],
    caution: [{ text: "**Dùng lượng lớn rất nguy hiểm**: có thể chóng mặt, mất tiếng, lú lẫn, thậm chí tử vong. Chỉ dùng làm gia vị lượng nhỏ hoặc theo thầy thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Nhục đậu khấu", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/nhuc-dau-khau" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "chum-ngay",
    name: "Chùm ngây",
    names: ["chùm ngây", "rau chùm ngây", "lá chùm ngây", "moringa"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng lá non, ngọn chùm ngây nấu ăn; lá non dùng lợi sữa, lá già lợi tiểu nhẹ; ở Ấn Độ là vị thuốc dân gian quen thuộc.", src: [0] }],
    science: [{ text: "Dịch chiết lá và hạt chùm ngây có hoạt tính diệt một số nấm da trong thí nghiệm.", src: [0] }],
    caution: [{ text: "**Chống chỉ định cho phụ nữ có thai.**", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Chùm ngây", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/chum-ngay" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "cut-lon",
    name: "Cây cứt lợn (cỏ hôi)",
    names: ["cứt lợn", "cây cứt lợn", "cỏ hôi", "hoa ngũ vị", "bù xít"],
    verdict: "trad",
    folk: [{ text: "Đông y xem cây cứt lợn vị hơi đắng, tính mát; thanh nhiệt, giải độc, tiêu sưng, cầm máu; dân gian dùng cho viêm xoang, viêm mũi dị ứng.", src: [0] }],
    science: [{ text: "Nhiều nghiên cứu trong nước về ứng dụng cứt lợn cho viêm xoang, viêm mũi dị ứng.", src: [0] }],
    caution: [{ text: "Dị ứng với cây thì không dùng. **Dễ nhầm với cỏ lào, cây ngũ sắc.**", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-xoang", text: "dân gian dùng — sốt cao, sưng mắt, đau đầu dữ dội thì đi khám", src: [0], v: "trad" }, { id: "viem-mui-di-ung", text: "dân gian dùng hỗ trợ", src: [0], v: "trad" }],
    sources: [{ title: "Cây cứt lợn", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cut-lon" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "coi-xay",
    name: "Cối xay",
    names: ["cối xay", "cây cối xay"],
    verdict: "trad",
    folk: [{ text: "Đông y xem cối xay vị ngọt, tính bình; giải nhiệt, lợi tiểu; dùng cho cảm sốt, đau đầu, ù tai, vàng da, tiểu buốt, phù.", src: [0] }],
    science: [{ text: "Theo tài liệu Ấn Độ, dịch chiết cối xay có tác dụng hạ nhiệt trên súc vật thí nghiệm.", src: [0] }],
    caution: [{ text: "Không dùng cho: người tiểu nhiều do thận hư, đang tiêu chảy phân lỏng, **phụ nữ mang thai**.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "sot", text: "dân gian dùng giải nhiệt — trẻ nhỏ sốt cao, sốt kéo dài thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Cối xay", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/coi-xay" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "cuc-hoa-vang",
    name: "Cúc hoa vàng",
    names: ["cúc hoa vàng", "cúc hoa", "trà cúc hoa", "hoa cúc vàng", "kim cúc"],
    verdict: "trad",
    folk: [{ text: "Đông y xem cúc hoa vàng vị đắng cay; thanh nhiệt, giải độc, làm sáng mắt; hay pha trà uống.", src: [0] }],
    science: [{ text: "Thử nghiệm trên động vật cho thấy tác dụng hạ huyết áp.", src: [0] }],
    caution: [{ text: "Đang uống thuốc huyết áp thì hỏi bác sĩ trước, đừng tự bỏ thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tang-huyet-ap", text: "dân gian dùng pha trà hỗ trợ — vẫn uống thuốc huyết áp bác sĩ kê", src: [0], v: "trad" }],
    sources: [{ title: "Cúc hoa vàng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cuc-hoa-vang-cum-hoa" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "chi-tu",
    name: "Chi tử (quả dành dành)",
    names: ["chi tử", "dành dành", "quả dành dành", "sơn chi"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng chi tử thanh nhiệt, lợi tiểu, cầm máu; cho sốt cao, vàng da, chảy máu cam, mắt đỏ sưng đau.", src: [0] }],
    science: [{ text: "Các chất crocin, genipin trong chi tử làm tăng tiết mật.", src: [0] }],
    caution: [{ text: "Không nên dùng cho người suy nhược, tỳ vị hư hàn, tiêu hoá kém, tiêu chảy, người tiểu đường.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Chi tử", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/chi-tu" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "do-trong",
    name: "Đỗ trọng",
    names: ["đỗ trọng", "vỏ đỗ trọng"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem đỗ trọng vị ngọt hơi cay, tính ôn; bổ can thận, mạnh gân cốt; dùng cho đau lưng, mỏi gối, tiểu nhiều.", src: [0] }],
    science: [{ text: "Nghiên cứu cũ cho thấy đỗ trọng không có độc ở liều thường dùng.", src: [0] }],
    caution: [{ text: "Nhiều vỏ cây khác bán dưới tên \"nam đỗ trọng\" — không phải cùng vị thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-lung", text: "y học cổ truyền dùng cho đau lưng mỏi gối — đau kèm tê yếu chân thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Đỗ trọng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/do-trong-vo-than" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "day-dau-xuong",
    name: "Dây đau xương",
    names: ["dây đau xương", "cây đau xương"],
    verdict: "trad",
    folk: [{ text: "Đông y xem dây đau xương vị đắng, tính mát; mạnh gân cốt, trừ phong thấp; dân gian dùng cho tê thấp, đau xương, đau người.", src: [0] }],
    science: [],
    caution: [{ text: "Chưa ghi nhận lưu ý đặc biệt; đang dùng thuốc khác thì hỏi bác sĩ.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "thoai-hoa-khop", text: "dân gian dùng cho đau nhức xương khớp", src: [0], v: "trad" }],
    sources: [{ title: "Dây đau xương", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/day-dau-xuong-than" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "doc-hoat",
    name: "Độc hoạt",
    names: ["độc hoạt", "rễ độc hoạt"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem độc hoạt vị ngọt cay, hơi đắng; trừ phong thấp, giảm đau — hay có trong bài thuốc đau lưng, đau khớp.", src: [0] }],
    science: [{ text: "Thí nghiệm trên động vật cho thấy tác dụng giảm đau.", src: [0] }],
    caution: [{ text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-lung", text: "y học cổ truyền dùng trong bài thuốc đau lưng", src: [0], v: "trad" }, { id: "thoai-hoa-khop", text: "y học cổ truyền dùng trừ phong thấp, giảm đau", src: [0], v: "trad" }],
    sources: [{ title: "Độc hoạt", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/doc-hoat-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "huong-phu",
    name: "Hương phụ (củ gấu)",
    names: ["hương phụ", "củ gấu", "cỏ gấu"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem hương phụ vị cay hơi đắng; giảm đau, điều kinh, giúp tiêu hoá — được xem là vị thuốc quan trọng cho bệnh phụ nữ.", src: [0] }],
    science: [],
    caution: [{ text: "Không dùng cho: người gầy yếu, nóng trong, ra mồ hôi trộm, đang có dấu hiệu chảy máu (chảy máu chân răng, chảy máu mũi).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kinh-nguyet-khong-deu", text: "y học cổ truyền dùng điều kinh", src: [0], v: "trad" }, { id: "dau-bung-kinh", text: "y học cổ truyền dùng giảm đau bụng kinh", src: [0], v: "trad" }],
    sources: [{ title: "Hương phụ", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/huong-phu-than-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoac-huong",
    name: "Hoắc hương",
    names: ["hoắc hương", "tinh dầu hoắc hương", "patchouli"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng hoắc hương cho dạ dày, giúp tiêu hoá: ăn không ngon, hôi miệng, sôi bụng, đau bụng; còn dùng trị cảm.", src: [0] }],
    science: [],
    caution: [{ text: "**Không dùng cho phụ nữ mang thai, cho con bú**, người dị ứng với hoắc hương; người âm hư không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "dân gian dùng giúp tiêu hoá", src: [0], v: "trad" }, { id: "hoi-mieng", text: "dân gian dùng", src: [0], v: "trad" }],
    sources: [{ title: "Hoắc hương", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hoac-huong" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ha-kho-thao",
    name: "Hạ khô thảo",
    names: ["hạ khô thảo", "trà hạ khô thảo"],
    verdict: "trad",
    folk: [{ text: "Đông y xem hạ khô thảo vị đắng cay, tính hàn; thanh can hoả, sáng mắt, tán kết; hay pha nước uống giải nhiệt.", src: [0] }],
    science: [],
    caution: [{ text: "Hàng bán ngoài thị trường hay bị thay bằng cây khác (\"hạ khô thảo nam\", cải trời) — không phải cùng vị thuốc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Hạ khô thảo", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ha-kho-thao-cum-qua" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoe",
    name: "Hoa hòe",
    names: ["hòe", "hoa hòe", "nụ hoa hòe", "trà hoa hòe", "quả hòe"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng nụ hoa hòe để cầm máu, mát huyết; quả hòe dùng cầm máu, hạ áp. Dân gian hay pha trà hoa hòe.", src: [0] }],
    science: [{ text: "Hoa hòe giàu rutin — giúp bền thành mạch, giảm tính thấm mao mạch.", src: [0] }],
    caution: [{ text: "**Phụ nữ có thai không được dùng quả hòe** (dễ sảy thai).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tri", text: "y học cổ truyền dùng cầm máu — trĩ chảy máu nhiều thì đi khám", src: [0], v: "trad" }, { id: "tang-huyet-ap", text: "dân gian dùng pha trà hỗ trợ — vẫn uống thuốc huyết áp", src: [0], v: "trad" }],
    sources: [{ title: "Hoa hòe", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hoe-nu-hoa" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ke-huyet-dang",
    name: "Kê huyết đằng",
    names: ["kê huyết đằng", "huyết đằng", "dây máu người"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng kê huyết đằng cho đau nhức xương khớp, thấp khớp, lưng gối mỏi, tê bại, kinh nguyệt không đều.", src: [0] }],
    science: [{ text: "Có nghiên cứu trong nước về hoạt tính kháng viêm.", src: [0] }],
    caution: [{ text: "Thận trọng với phụ nữ mang thai, trẻ em, người dị ứng. Mua ở nơi uy tín.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "thoai-hoa-khop", text: "dân gian dùng cho đau nhức xương khớp", src: [0], v: "trad" }, { id: "kinh-nguyet-khong-deu", text: "dân gian dùng điều kinh", src: [0], v: "trad" }],
    sources: [{ title: "Kê huyết đằng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ke-huyet-dang" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ke-noi-kim",
    name: "Kê nội kim (màng mề gà)",
    names: ["kê nội kim", "màng mề gà", "màng mề"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem kê nội kim vị ngọt, tính bình; tiêu thức ăn, giúp tiêu hoá; dùng cho trẻ biếng ăn, đầy bụng.", src: [0] }],
    science: [{ text: "Làm tăng tiết dịch vị, tăng co bóp dạ dày.", src: [0] }],
    caution: [{ text: "Không bị đầy trệ thì không nên dùng; bà bầu hỏi thầy thuốc trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "y học cổ truyền dùng tiêu thực, giúp tiêu hoá", src: [0], v: "trad" }],
    sources: [{ title: "Kê nội kim", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ke-noi-kim" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ke-dau-ngua",
    name: "Ké đầu ngựa",
    names: ["ké đầu ngựa", "thương nhĩ tử", "quả ké"],
    verdict: "risky",
    folk: [{ text: "Tài liệu cổ xem ké đầu ngựa vị ngọt, tính ôn, **hơi có độc**; tán phong; dùng cho đau nhức, phong thấp, viêm mũi, mụn nhọt, mẩn ngứa.", src: [0] }],
    science: [{ text: "Ghi nhận làm giảm co bóp tim, hạ thân nhiệt, lợi tiểu.", src: [0] }],
    caution: [{ text: "Hơi có độc — không tự dùng nhiều, lâu. Theo kinh nghiệm: khi dùng kiêng thịt lợn.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-xoang", text: "y học cổ truyền dùng thông mũi", src: [0], v: "trad" }, { id: "me-day", text: "dân gian dùng cho mẩn ngứa — sưng môi, khó thở gọi 115", src: [0], v: "trad" }],
    sources: [{ title: "Ké đầu ngựa", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ke-dau-ngua-qua" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "lien-kieu",
    name: "Liên kiều",
    names: ["liên kiều", "quả liên kiều"],
    verdict: "trad",
    folk: [{ text: "Đông y xem liên kiều vị đắng, tính hàn; thanh nhiệt, giải độc, tiêu sưng; dùng cho mụn nhọt, sốt, cảm.", src: [0] }],
    science: [{ text: "Thí nghiệm cho thấy nước sắc liên kiều có tính kháng khuẩn.", src: [0] }],
    caution: [{ text: "Không nên dùng khi khí hư, tỳ hư tiêu chảy; nhọt đã vỡ mủ không dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mun-nhot", text: "y học cổ truyền dùng thanh nhiệt, giải độc", src: [0], v: "trad" }],
    sources: [{ title: "Liên kiều", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/lien-kieu-qua" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ngu-gia-bi",
    name: "Ngũ gia bì",
    names: ["ngũ gia bì", "ngũ gia bì gai", "vỏ ngũ gia bì"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem ngũ gia bì gai vị đắng cay, tính mát; dân gian coi là vị thuốc bổ, mạnh gân xương, dùng cho đau nhức xương khớp.", src: [0] }],
    science: [{ text: "Thí nghiệm trên chuột cho thấy tác dụng kích thích tâm thần, chống trầm uất.", src: [0] }],
    caution: [{ text: "**Tên \"ngũ gia bì\" chỉ nhiều vị khác nhau** (có loại có độc) — dễ nhầm, phải mua đúng loại.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "thoai-hoa-khop", text: "y học cổ truyền dùng mạnh gân xương", src: [0], v: "trad" }],
    sources: [{ title: "Ngũ gia bì", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ngu-gia-bi-gai" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "nuc-nac",
    name: "Núc nác",
    names: ["núc nác", "vỏ núc nác", "hạt núc nác"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem vỏ núc nác vị đắng, tính hàn; thanh nhiệt, giải độc; dùng cho tiêu chảy, kiết lỵ, đau dạ dày, viêm họng.", src: [0] }],
    science: [],
    caution: [{ text: "Không dùng cho người hư hàn, đau bụng, đầy bụng, tiêu chảy do lạnh.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "viem-hong", text: "y học cổ truyền dùng", src: [0], v: "trad" }, { id: "kiet-ly", text: "y học cổ truyền dùng — đi ngoài ra máu, sốt thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Núc nác", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/nuc-nac" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "o-mai",
    name: "Ô mai (mơ muối)",
    names: ["ô mai", "mơ muối", "ô mai mơ", "bạch mai"],
    verdict: "trad",
    folk: [{ text: "Đông y xem ô mai vị chua, tính mát; giảm ho, sinh tân dịch (đỡ khát); dân gian ngậm ô mai cho ho, đau họng.", src: [0] }],
    science: [],
    caution: [{ text: "Ô mai thường nhiều đường, muối — người tiểu đường, tăng huyết áp ăn vừa phải.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ho", text: "dân gian ngậm ô mai cho đỡ ho", src: [0], v: "trad" }, { id: "viem-hong", text: "dân gian ngậm cho đỡ rát họng", src: [0], v: "trad" }],
    sources: [{ title: "Ô mai", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/o-mai" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "phong-phong",
    name: "Phòng phong",
    names: ["phòng phong", "rễ phòng phong"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem phòng phong vị cay ngọt, tính ấm; trừ phong thấp; dùng cho cảm, nhức đầu, đau nhức xương khớp, tê bì.", src: [0] }],
    science: [{ text: "Dịch chiết phòng phong có tác dụng hạ sốt trên thỏ thí nghiệm.", src: [0] }],
    caution: [{ text: "Không dùng cho người âm hư hoả vượng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "cam-lanh", text: "y học cổ truyền dùng giải cảm", src: [0], v: "trad" }],
    sources: [{ title: "Phòng phong", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/phong-phong-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "rau-ram",
    name: "Rau răm",
    names: ["rau răm", "lá rau răm"],
    verdict: "trad",
    folk: [{ text: "Đông y xem rau răm tính nóng, vị cay hơi đắng; trừ hàn, tiêu độc, giúp tiêu hoá; hay ăn kèm món tính lạnh.", src: [0] }],
    science: [{ text: "Chiết xuất rau răm có tính kháng khuẩn trong thí nghiệm.", src: [0] }],
    caution: [{ text: "Không độc nhưng ăn quá nhiều có hại; tính nóng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "dân gian ăn kèm để đỡ đầy bụng", src: [0], v: "trad" }],
    sources: [{ title: "Rau răm", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/rau-ram" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "rieng",
    name: "Riềng",
    names: ["riềng", "củ riềng", "riềng ấm"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem riềng vị cay, tính ấm; làm ấm bụng, giảm đau, giúp tiêu hoá; dùng cho đau bụng do lạnh, nôn, ợ hơi.", src: [0] }],
    science: [{ text: "Thí nghiệm trên động vật cho thấy riềng làm giãn mạch, chống co thắt cơ trơn ruột.", src: [0] }],
    caution: [{ text: "Không dùng khi đang nóng trong người.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "kho-tieu", text: "dân gian dùng ấm bụng, giúp tiêu hoá", src: [0], v: "trad" }, { id: "buon-non", text: "dân gian dùng chống nôn", src: [0], v: "trad" }],
    sources: [{ title: "Riềng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/rieng-than-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "sai-ho",
    name: "Sài hồ",
    names: ["sài hồ", "rễ sài hồ", "bắc sài hồ"],
    verdict: "trad",
    folk: [{ text: "Đông y xem sài hồ vị đắng, tính lạnh; dùng cho cảm sốt lúc nóng lúc lạnh, tức ngực sườn, miệng đắng, buồn nôn; hay có trong bài thuốc gan.", src: [0] }],
    science: [],
    caution: [{ text: "Người hay nóng bừng, tay chân nóng, đỏ mặt, đau đầu không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Sài hồ", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/sai-ho-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "tang-ky-sinh",
    name: "Tang ký sinh (tầm gửi cây dâu)",
    names: ["tang ký sinh", "tầm gửi dâu", "tầm gửi cây dâu"],
    verdict: "trad",
    folk: [{ text: "Đông y xem tang ký sinh vị đắng, tính bình; bổ can thận, mạnh gân xương, trừ phong thấp, an thai, lợi sữa.", src: [0] }],
    science: [],
    caution: [{ text: "Bảo quản kín, khô ráo. Bà bầu dùng để \"an thai\" thì phải hỏi bác sĩ sản khoa trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-lung", text: "y học cổ truyền dùng cho đau lưng, gân cốt nhức mỏi", src: [0], v: "trad" }, { id: "thoai-hoa-khop", text: "y học cổ truyền dùng mạnh gân xương", src: [0], v: "trad" }],
    sources: [{ title: "Tang ký sinh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/tang-ky-sinh" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "tam-gui",
    name: "Tầm gửi",
    names: ["tầm gửi", "cây tầm gửi", "tầm gửi gạo", "tầm gửi chè"],
    verdict: "trad",
    folk: [{ text: "Đông y xem tầm gửi vị đắng ngọt, tính bình; bồi bổ, bổ thận, thanh nhiệt, chữa thấp khớp.", src: [0] }],
    science: [],
    caution: [{ text: "**Tầm gửi mọc trên cây độc sẽ mang độc** — không phải loại tầm gửi nào cũng dùng được; chỉ dùng loại rõ cây chủ, mua nơi uy tín.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Tầm gửi", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/tam-gui" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "thao-quyet-minh",
    name: "Thảo quyết minh (hạt muồng)",
    names: ["thảo quyết minh", "hạt muồng", "quyết minh tử", "trà thảo quyết minh"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng thảo quyết minh thanh can, sáng mắt, nhuận tràng; dân gian sao uống như trà, dùng cho mất ngủ, táo bón.", src: [0] }],
    science: [{ text: "Thí nghiệm trên động vật cho thấy tác dụng giãn mạch, hạ huyết áp.", src: [0] }],
    caution: [{ text: "Không dùng khi đang tiêu chảy. Dễ nhầm với hạt các cây họ muồng khác (điền thanh, lục lạc).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tao-bon", text: "y học cổ truyền dùng nhuận tràng", src: [0], v: "trad" }, { id: "mat-ngu", text: "dân gian dùng hạt sao pha trà", src: [0], v: "trad" }],
    sources: [{ title: "Thảo quyết minh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/thao-quyet-minh" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "trac-bach-diep",
    name: "Trắc bách diệp",
    names: ["trắc bách diệp", "lá trắc bách", "trắc bách"],
    verdict: "trad",
    folk: [{ text: "Đông y xem trắc bách diệp vị đắng chát; mát huyết, cầm máu; dùng cho ho ra máu, chảy máu cam, đi ngoài ra máu, trĩ chảy máu.", src: [0] }],
    science: [],
    caution: [{ text: "Ho ra máu, đi ngoài ra máu là dấu hiệu cần **đi khám ngay** — đừng chỉ tự dùng thuốc nam.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tri", text: "y học cổ truyền dùng cầm máu — trĩ chảy máu nhiều thì đi khám", src: [0], v: "trad" }, { id: "chay-mau", text: "y học cổ truyền dùng cầm máu — chảy máu nhiều gọi 115", src: [0], v: "trad" }],
    sources: [{ title: "Trắc bách diệp", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/trac-bach-diep" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "uy-linh-tien",
    name: "Uy linh tiên",
    names: ["uy linh tiên"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng uy linh tiên trừ phong thấp, thông kinh lạc, giảm đau; chữa đau nhức xương khớp, tê bì.", src: [0] }],
    science: [{ text: "Có nghiên cứu về tác dụng bảo vệ xương và sụn khớp.", src: [0] }],
    caution: [{ text: "Theo y học cổ truyền: không phải phong thấp thực chứng thì không dùng; trong thời gian dùng không uống trà.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "thoai-hoa-khop", text: "y học cổ truyền dùng giảm đau nhức xương khớp", src: [0], v: "trad" }],
    sources: [{ title: "Uy linh tiên", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/uy-linh-tien" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dinh-huong",
    name: "Đinh hương",
    names: ["đinh hương", "nụ đinh hương", "tinh dầu đinh hương"],
    verdict: "trad",
    folk: [{ text: "Được dùng từ lâu ở châu Á làm gia vị và thuốc; dân gian dùng chữa đau răng, giúp tiêu hoá.", src: [0] }],
    science: [{ text: "Y học hiện đại dùng đinh hương làm thuốc trợ tiêu hoá và chất sát trùng.", src: [0] }],
    caution: [{ text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-rang", text: "dân gian dùng giảm đau — sưng má, sốt thì đi nha khoa", src: [0], v: "trad" }],
    sources: [{ title: "Đinh hương", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dinh-huong" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "huong-nhu",
    name: "Hương nhu tía",
    names: ["hương nhu", "hương nhu tía", "é tía"],
    verdict: "trad",
    folk: [{ text: "Hương nhu tía vị cay, tính ấm, thơm; làm ra mồ hôi, giải cảm, giảm đau; dân gian dùng xông giải cảm.", src: [0] }],
    science: [{ text: "Tinh dầu hương nhu có tính kháng khuẩn trong thí nghiệm.", src: [0] }],
    caution: [{ text: "Không dùng cho người hay ra nhiều mồ hôi, khí hư, âm hư.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "cam-lanh", text: "dân gian dùng xông, uống giải cảm", src: [0], v: "trad" }],
    sources: [{ title: "Hương nhu tía", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/huong-nhu-tia" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "huyet-giac",
    name: "Huyết giác",
    names: ["huyết giác", "lõi huyết giác"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem huyết giác vị ngọt, tính bình; tan máu ứ, hoạt huyết; dùng cho bầm tím, đau nhức do chấn thương.", src: [0] }],
    science: [{ text: "Thí nghiệm cho thấy dịch chiết huyết giác ức chế kết tập tiểu cầu (chống đông).", src: [0] }],
    caution: [{ text: "**Phụ nữ có thai không nên dùng.** Đang dùng thuốc chống đông thì hỏi bác sĩ.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Huyết giác", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/huyet-giac-loi-go" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dau-tam",
    name: "Dâu tằm (lá dâu, quả dâu)",
    names: ["dâu tằm", "quả dâu tằm", "quả dâu", "tang bạch bì", "vỏ rễ dâu"],
    verdict: "trad",
    folk: [{ text: "Đông y xem lá dâu (tang diệp) vị đắng ngọt, tính hàn: thanh nhiệt, sáng mắt; vỏ rễ dâu (tang bạch bì) thanh phế, chữa ho.", src: [0] }],
    science: [{ text: "Cao lá, thân dâu ức chế một số vi khuẩn trong thí nghiệm.", src: [0] }],
    caution: [{ text: "Người ho do lạnh không dùng vỏ rễ dâu; người đang tiêu chảy không ăn quả dâu.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ho", text: "y học cổ truyền dùng vỏ rễ dâu chữa ho", src: [0], v: "trad" }],
    sources: [{ title: "Dâu tằm", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dau-tam-canh-la-qua-vo-re" }],
    verifiedAt: "2026-11-04",
  },
  // ── 04/11 đợt 5 (Long Châu): vị độc cảnh báo + vị hay dùng ──
  {
    id: "chu-sa",
    name: "Chu sa (thần sa)",
    names: ["chu sa", "thần sa", "đan sa"],
    verdict: "danger",
    folk: [{ text: "Sách cổ dùng chu sa để an thần, trấn kinh; có mặt trong một số bài thuốc cổ.", src: [0] }],
    science: [{ text: "Chu sa là hợp chất của **thuỷ ngân**; đun nóng sẽ giải phóng thuỷ ngân bay hơi rất độc.", src: [0] }],
    caution: [{ text: "**Rất độc** — tuyệt đối không tự mua, tự dùng, kể cả ngâm rượu hay bôi. Nghi ngộ độc (nôn, co giật, khó thở, lơ mơ) thì **gọi 115 ngay**.", src: [0] }, { text: "Không dùng cho phụ nữ có thai, trẻ em. Hỏi kỹ thành phần khi được cho \"thuốc an thần gia truyền\", \"thuốc cam\".", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Chu sa", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/chu-sa" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "thach-tin",
    name: "Thạch tín",
    names: ["thạch tín", "nhân ngôn", "asen"],
    verdict: "danger",
    folk: [{ text: "Sách cổ có dùng thạch tín (asen) với liều cực nhỏ trong một số bài thuốc.", src: [0] }],
    science: [{ text: "Thạch tín là asen — chất **cực độc**; chỉ dùng trong thuốc chuyên khoa theo chỉ định bác sĩ.", src: [0] }],
    caution: [{ text: "**Rất độc** — tuyệt đối không tự mua, tự dùng, kể cả ngâm rượu hay bôi. Nghi ngộ độc (nôn, co giật, khó thở, lơ mơ) thì **gọi 115 ngay**.", src: [0] }, { text: "Ngộ độc cấp: đau bụng dữ dội, nôn, tiêu chảy, phân có máu.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Thạch tín", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/thach-tin" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hung-hoang",
    name: "Hùng hoàng",
    names: ["hùng hoàng", "thư hoàng"],
    verdict: "danger",
    folk: [{ text: "Tài liệu cổ ghi hùng hoàng có độc, dùng ngoài trong một số bài thuốc.", src: [0] }],
    science: [{ text: "Hùng hoàng chứa **asen** — độc.", src: [0] }],
    caution: [{ text: "**Rất độc** — tuyệt đối không tự mua, tự dùng, kể cả ngâm rượu hay bôi. Nghi ngộ độc (nôn, co giật, khó thở, lơ mơ) thì **gọi 115 ngay**.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Hùng hoàng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hung-hoang" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ba-dau",
    name: "Ba đậu",
    names: ["ba đậu", "hạt ba đậu", "dầu ba đậu"],
    verdict: "danger",
    folk: [{ text: "Y học cổ truyền xem ba đậu vị cay, tính nóng, **rất độc**; từng dùng làm thuốc tẩy mạnh.", src: [0] }],
    science: [{ text: "Dầu ba đậu gây tẩy và nôn mạnh ngay cả với lượng nhỏ.", src: [0] }],
    caution: [{ text: "**Rất độc** — tuyệt đối không tự mua, tự dùng, kể cả ngâm rượu hay bôi. Nghi ngộ độc (nôn, co giật, khó thở, lơ mơ) thì **gọi 115 ngay**.", src: [0] }, { text: "Không dùng cho người yếu, phụ nữ có thai, người đang sốt. Dầu ba đậu dính da, mắt gây bỏng rát.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Ba đậu", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ba-dau" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "thuong-luc",
    name: "Thương lục",
    names: ["thương lục", "cây thương lục", "sâm nam độc"],
    verdict: "danger",
    folk: [{ text: "Y học cổ truyền dùng thương lục làm thuốc lợi tiểu mạnh, chữa phù.", src: [0] }],
    science: [],
    caution: [{ text: "**Rất độc** — tuyệt đối không tự mua, tự dùng, kể cả ngâm rượu hay bôi. Nghi ngộ độc (nôn, co giật, khó thở, lơ mơ) thì **gọi 115 ngay**.", src: [0] }, { text: "Rễ thương lục dễ bị nhầm với sâm — đã có người ăn nhầm bị ngộ độc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Thương lục", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/thuong-luc" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "toi-doc",
    name: "Tỏi độc",
    names: ["tỏi độc", "cây tỏi độc", "colchicum"],
    verdict: "danger",
    folk: [{ text: "Y học cổ truyền dùng tỏi độc cho bệnh gout (thống phong).", src: [0] }],
    science: [{ text: "Tỏi độc chứa colchicine — hoạt chất của thuốc trị gout, **liều độc rất gần liều chữa**.", src: [0] }],
    caution: [{ text: "**Rất độc** — tuyệt đối không tự mua, tự dùng, kể cả ngâm rượu hay bôi. Nghi ngộ độc (nôn, co giật, khó thở, lơ mơ) thì **gọi 115 ngay**.", src: [0] }, { text: "Không dùng cho người suy gan, suy thận, suy tim. Gout nên dùng thuốc bác sĩ kê, không tự dùng cây tỏi độc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "gout", text: "chứa colchicine — rất độc, không tự dùng; dùng thuốc trị gout bác sĩ kê", src: [0], v: "danger" }],
    sources: [{ title: "Tỏi độc", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/toi-doc" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "thien-tien-tu",
    name: "Thiên tiên tử",
    names: ["thiên tiên tử", "hạt thiên tiên"],
    verdict: "danger",
    folk: [{ text: "Y học cổ truyền dùng thiên tiên tử giảm đau (đau răng), trấn kinh.", src: [0] }],
    science: [{ text: "Thiên tiên tử được xếp vào **thuốc độc bảng A**.", src: [0] }],
    caution: [{ text: "**Rất độc** — tuyệt đối không tự mua, tự dùng, kể cả ngâm rượu hay bôi. Nghi ngộ độc (nôn, co giật, khó thở, lơ mơ) thì **gọi 115 ngay**.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "dau-rang", text: "thuốc độc bảng A — đừng tự dùng chữa đau răng, đi nha khoa", src: [0], v: "danger" }],
    sources: [{ title: "Thiên tiên tử", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/thien-tien-tu" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "dua-can",
    name: "Dừa cạn",
    names: ["dừa cạn", "lá dừa cạn", "cây dừa cạn", "hoa dừa cạn"],
    verdict: "risky",
    folk: [{ text: "Đông y dùng dừa cạn lợi tiểu, hạ huyết áp; dân gian dùng cho huyết áp cao.", src: [0] }],
    science: [{ text: "Dừa cạn chứa alcaloid (vinblastin, vincristin) — là nguồn của **thuốc trị ung thư**, nhưng cây có **độc tính cao**.", src: [0] }],
    caution: [{ text: "**Độc** — chỉ dùng khi bác sĩ hướng dẫn. **Phụ nữ có thai, cho con bú không dùng**; người huyết áp thấp không dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tang-huyet-ap", text: "dân gian dùng nhưng cây có độc — không tự dùng, uống thuốc huyết áp bác sĩ kê", src: [0], v: "risky" }, { id: "ung-thu", text: "là nguồn hoạt chất thuốc ung thư, nhưng cây có độc — không tự uống", src: [0], v: "risky" }],
    sources: [{ title: "Dừa cạn", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/dua-can-la-va-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "re-tranh",
    name: "Rễ cỏ tranh (bạch mao căn)",
    names: ["rễ tranh", "rễ cỏ tranh", "bạch mao căn", "cỏ tranh", "mao căn"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem rễ cỏ tranh vị ngọt, tính hàn; thanh nhiệt, lợi tiểu, cầm máu; dùng cho tiểu khó, tiểu ra máu, chảy máu cam; dân gian nấu nước mát.", src: [0] }],
    science: [{ text: "Thí nghiệm trên thỏ cho thấy nước sắc rễ cỏ tranh có tác dụng lợi tiểu.", src: [0] }],
    caution: [{ text: "Người không có thực nhiệt kiêng dùng; phụ nữ có thai thận trọng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "soi-than", text: "y học cổ truyền dùng lợi tiểu", src: [0], v: "trad" }],
    sources: [{ title: "Rễ cỏ tranh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/bach-mao-can" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "bach-hoa-xa",
    name: "Bạch hoa xà thiệt thảo",
    names: ["bạch hoa xà thiệt thảo", "bạch hoa xà", "an điền"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng thanh nhiệt, giải độc; hay được quảng cáo cho ung thư.", src: [0] }],
    science: [],
    caution: [{ text: "**Không dùng cho phụ nữ có thai, trẻ sơ sinh.** Có thể làm giảm hiệu quả thuốc tránh thai. Đang điều trị ung thư thì báo bác sĩ, đừng bỏ điều trị.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ung-thu", text: "y học cổ truyền dùng hỗ trợ — không bỏ điều trị ung thư, báo bác sĩ trước khi dùng", src: [0], v: "trad" }],
    sources: [{ title: "Bạch hoa xà thiệt thảo", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/bach-hoa-xa-thiet-thao" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ban-chi-lien",
    name: "Bán chi liên",
    names: ["bán chi liên"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem bán chi liên vị hơi đắng, tính mát; thanh nhiệt, giải độc, tiêu sưng, lợi tiểu.", src: [0] }],
    science: [],
    caution: [{ text: "Tránh dùng cho phụ nữ có thai, người huyết hư. Đang điều trị ung thư thì báo bác sĩ trước.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ung-thu", text: "y học cổ truyền dùng hỗ trợ — không bỏ điều trị ung thư", src: [0], v: "trad" }],
    sources: [{ title: "Bán chi liên", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ban-chi-lien" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoa-du-du-duc",
    name: "Hoa đu đủ đực",
    names: ["hoa đu đủ đực", "hoa đu đủ", "đu đủ đực"],
    verdict: "trad",
    folk: [{ text: "Dân gian dùng hoa đu đủ đực (hấp đường phèn, mật ong) làm thuốc ho cho trẻ.", src: [0] }],
    science: [],
    caution: [{ text: "**Không dùng cho trẻ dưới 3 tuổi, phụ nữ mang thai**; người tay chân lạnh, tiêu chảy không dùng. Trẻ ho kèm sốt cao, thở nhanh, rút lõm ngực thì đi khám ngay.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "ho", text: "dân gian dùng cho trẻ ho — không dùng cho trẻ dưới 3 tuổi", src: [0], v: "trad" }],
    sources: [{ title: "Hoa đu đủ đực", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/du-du-hoa-duc" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "cay-xau-ho",
    name: "Cây xấu hổ (cây trinh nữ)",
    names: ["cây xấu hổ", "cây trinh nữ", "cây mắc cỡ", "rễ cây xấu hổ"],
    verdict: "risky",
    folk: [{ text: "Đông y xem cây xấu hổ vị ngọt hơi se, **có độc**; an thần, giảm đau; dân gian dùng cho mất ngủ, suy nhược thần kinh.", src: [0] }],
    science: [{ text: "Rễ cây được nghiên cứu về tác dụng làm lành vết thương.", src: [0] }],
    caution: [{ text: "Có độc — không tự dùng nhiều. Người suy nhược, thể hàn không dùng. Dễ nhầm với \"trinh nữ hoàng cung\" (cây khác).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "dân gian dùng an thần nhưng cây có độc — đừng tự dùng", src: [0], v: "trad" }],
    sources: [{ title: "Cây xấu hổ", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cay-trinh-nu" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ha-thu-o-trang",
    name: "Hà thủ ô trắng",
    names: ["hà thủ ô trắng", "hà thủ ô nam"],
    verdict: "trad",
    folk: [{ text: "Thầy thuốc Việt Nam coi hà thủ ô trắng có công dụng như hà thủ ô đỏ (bổ huyết, đen tóc), thường dùng chung.", src: [0] }],
    science: [{ text: "Chưa có tài liệu nghiên cứu.", src: [0] }],
    caution: [{ text: "Không dùng cho người hư yếu, tạng lạnh. Theo kinh nghiệm kiêng tiết canh, lươn, cá, hành tỏi khi dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Hà thủ ô trắng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ha-thu-o-trang-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "hoang-tinh",
    name: "Hoàng tinh",
    names: ["hoàng tinh", "củ hoàng tinh"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem hoàng tinh vị ngọt, tính bình; bổ thận, kiện tỳ, nhuận phế; dùng khi mệt mỏi, ăn kém, ho khan.", src: [0] }],
    science: [{ text: "Thí nghiệm trên chuột cho thấy tác dụng chống mệt mỏi.", src: [0] }],
    caution: [{ text: "Không dùng cho người có nhiều đờm thấp.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Hoàng tinh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/hoang-tinh-than-re" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "cat-can",
    name: "Sắn dây (cát căn)",
    names: ["sắn dây", "bột sắn dây", "cát căn", "củ sắn dây"],
    verdict: "trad",
    folk: [{ text: "Tài liệu cổ xem sắn dây vị ngọt cay, tính bình; giải nhiệt, đỡ khát; dùng khi cảm sốt, cứng gáy; dân gian pha bột sắn dây uống \"cho mát\".", src: [0] }],
    science: [{ text: "Có theo dõi lâm sàng dùng cát căn hỗ trợ người huyết áp cao bị cứng gáy.", src: [0] }],
    caution: [{ text: "Bột sắn dây phải nấu chín hoặc pha nước sôi — đừng uống sống. Người tiêu chảy, bụng lạnh không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "sot", text: "dân gian dùng giải nhiệt — sốt cao, sốt kéo dài thì đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Sắn dây", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cat-can" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "lo-can",
    name: "Lô căn (rễ sậy)",
    names: ["lô căn", "rễ sậy", "rễ lau"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng lô căn thanh nhiệt, sinh tân, chống nôn; cho sốt khát nước, ho do phế nhiệt.", src: [0] }],
    science: [{ text: "Trong ống nghiệm có tác dụng kháng khuẩn với liên cầu.", src: [0] }],
    caution: [{ text: "Không dùng khi cảm lạnh mà chưa sốt.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Lô căn", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/lo-can" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "tao-nhan",
    name: "Toan táo nhân",
    names: ["táo nhân", "toan táo nhân", "hạt táo chua"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem toan táo nhân vị ngọt, tính bình; định tâm, an thần; dùng cho mất ngủ, hồi hộp, hay quên.", src: [0] }],
    science: [{ text: "Quan sát lâm sàng cho thấy có tác dụng trấn tĩnh, gây ngủ.", src: [0] }],
    caution: [{ text: "Dễ nhầm với hạt keo (\"nam toan táo nhân\") — tác dụng khác hẳn.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "mat-ngu", text: "y học cổ truyền dùng an thần — mất ngủ kéo dài nên đi khám", src: [0], v: "trad" }],
    sources: [{ title: "Toan táo nhân", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/tao-nhan" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "khiem-thuc",
    name: "Khiếm thực",
    names: ["khiếm thực", "hạt khiếm thực"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng khiếm thực ích thận, cố tinh, cầm tiêu chảy; cho di tinh, tiểu đêm, tiêu chảy lâu.", src: [0] }],
    science: [],
    caution: [{ text: "Không dùng khi mới cảm cúm, táo bón, bí tiểu.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Khiếm thực", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/khiem-thuc-hat" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "kim-anh",
    name: "Kim anh",
    names: ["kim anh", "quả kim anh", "kim anh tử"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng kim anh cố tinh, giảm tiểu nhiều, cầm tiêu chảy.", src: [0] }],
    science: [],
    caution: [{ text: "Có thấp nhiệt, tiểu tiện khó không nên dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Kim anh", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/kim-anh" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ngo-sen",
    name: "Ngó sen (liên ngẫu)",
    names: ["ngó sen", "liên ngẫu", "củ sen"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem ngó sen vị ngọt, tính mát; mát huyết, cầm máu, giúp tiêu hoá.", src: [0] }],
    science: [],
    caution: [{ text: "Người thể hàn dùng lâu có thể mệt mỏi. Ngó sen nhiều tinh bột — người tiểu đường ăn vừa phải.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "chay-mau", text: "y học cổ truyền dùng cầm máu — chảy máu nhiều gọi 115", src: [0], v: "trad" }],
    sources: [{ title: "Ngó sen", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/lien-ngau-ngo-sen" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "co-ngot",
    name: "Cỏ ngọt (stevia)",
    names: ["cỏ ngọt", "lá cỏ ngọt", "stevia", "đường cỏ ngọt"],
    verdict: "trad",
    folk: [{ text: "Lá cỏ ngọt có vị rất ngọt, được dùng thay đường, nhất là cho người cần hạn chế đường.", src: [0] }],
    science: [],
    caution: [{ text: "Không dùng cho trẻ nhỏ, trẻ sơ sinh, phụ nữ mang thai hoặc cho con bú (chưa đủ nghiên cứu).", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [{ id: "tieu-duong", text: "dùng thay đường — vẫn theo chế độ ăn và thuốc bác sĩ kê", src: [0], v: "trad" }],
    sources: [{ title: "Cỏ ngọt", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/co-ngot" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "cam-thao-nam",
    name: "Cam thảo nam (cam thảo đất)",
    names: ["cam thảo nam", "cam thảo đất", "dã cam thảo"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền xem cam thảo đất vị ngọt đắng, tính mát; thanh nhiệt, giải độc, lợi tiểu; dân gian nấu nước mát.", src: [0] }],
    science: [{ text: "Chứa amelin — được ghi nhận làm giảm đường huyết.", src: [0] }],
    caution: [{ text: "Lành tính nhưng dùng quá nhiều có thể tiêu chảy, phù, chóng mặt. Là cây khác với cam thảo bắc.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Cam thảo nam", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cam-thao-nam" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "cay-la-gan",
    name: "Cây lá gan",
    names: ["cây lá gan"],
    verdict: "trad",
    folk: [{ text: "Đông y xem cây lá gan vị đắng, tính mát; giúp tiêu hoá, hạ sốt; dân gian Đông Nam Á dùng lợi tiểu, chữa phù, tiêu chảy.", src: [0] }],
    science: [{ text: "Có nghiên cứu về tác dụng chống viêm.", src: [0] }],
    caution: [{ text: "Hỏi bác sĩ trước khi dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Cây lá gan", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/cay-la-gan" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "la-mong",
    name: "Lá móng",
    names: ["lá móng", "lá móng tay", "henna"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng lá móng giãn gân cốt, giảm đau; dân gian dùng nhuộm móng, tóc.", src: [0] }],
    science: [{ text: "Henna có hoạt tính kháng khuẩn trong thí nghiệm.", src: [0] }],
    caution: [{ text: "**Phụ nữ có thai không nên dùng.** Không dùng henna cho trẻ sơ sinh.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Lá móng", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/la-mong" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "sam-dai-hanh",
    name: "Sâm đại hành",
    names: ["sâm đại hành", "tỏi lào", "hành lào"],
    verdict: "trad",
    folk: [{ text: "Y học cổ truyền dùng sâm đại hành bồi bổ, chữa ho, thiếu máu.", src: [0] }],
    science: [],
    caution: [{ text: "Có thể gây dị ứng. Không dùng cho người \"máu nóng\", đang có vết loét ngứa.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Sâm đại hành", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/sam-dai-hanh-than-hanh" }],
    verifiedAt: "2026-11-04",
  },
  {
    id: "ich-tri",
    name: "Ích trí",
    names: ["ích trí", "ích trí nhân"],
    verdict: "trad",
    folk: [{ text: "Đông y xem ích trí vị cay, tính ấm; làm ấm thận, bổ dạ dày; dùng cho tiêu chảy, đái dầm, tiểu đêm.", src: [0] }],
    science: [],
    caution: [{ text: "Người âm hư, can dương vượng kiêng dùng; phụ nữ có thai không tự ý dùng.", src: [0] }, { text: "Dược liệu tự nhiên vẫn có chỉ định, chống chỉ định, tác dụng phụ và **dễ nhầm với cây khác** — đừng tự ý dùng thay thuốc bác sĩ kê; hỏi bác sĩ / thầy thuốc y học cổ truyền trước, nhất là khi đang dùng thuốc khác.", src: [0] }],
    topics: [],
    sources: [{ title: "Ích trí", publisher: "Nhà thuốc FPT Long Châu – tra cứu dược liệu (tham khảo, đọc ngày 04/11/2026)", url: "https://nhathuoclongchau.com.vn/thanh-phan/ich-tri-qua" }],
    verifiedAt: "2026-11-04",
  },
];

/** Vị thuốc nam / bắc phổ biến mà Lomi CHƯA tìm được nguồn đáng tin đánh giá → nói thật, kèm lời dặn chung. */
export const UNVERIFIED_HERBS = [
  
  
  "thục địa", "xuyên khung", "lá đu đủ", 
  "nhung hươu", "rượu rắn", "cao hổ cốt", "cao xương", "an cung ngưu hoàng",
  "nước sâm", "sâm đất", 
  "lá mơ", "lá mơ lông", "lá chanh",
  // 31/10 (danh sách ChatGPT lần 2) — chưa tìm được nguồn đáng tin
  "húng chanh", "tần dày lá", "lá hẹ", "lá dứa", "lá xoài", "lá xoài non", "lá sim", "lá mật gấu", "mật gấu",
  "lược vàng", "lá bàng", "lá bỏng", "sài đất", "lá mướp", "rau đắng đất", "rau đắng biển", "rau đắng", "rau ngổ", "rau dền gai",
  "thiên môn đông", "phòng phong", 
  "cúc tần", "đại bi", "cỏ roi ngựa", "rau má biển", "rau dệu", "rau trai", "lá thuốc dòi", "xương sông", "húng lủi", "lá bưởi",
  "hoàn ngọc", "cây hoàn ngọc", "bìm bìm", "muồng trâu", "lá muồng trâu", "hồng hoa", "lá vừng", "lá khế",
  // 04/11 (Kir: mẹo dân gian trị ho) — chưa tìm được nguồn y khoa đáng tin đánh giá
  "quất chưng đường phèn", "tắc chưng đường phèn", "quất chưng", "tắc chưng", "quất hấp", "tắc hấp", "chanh đào", "chanh đào ngâm mật ong",
  "lê chưng đường phèn", "lê chưng", "lê hấp",
  "yến sào", "tổ yến", "nước yến", "yến chưng",
  "lá vông", "trà lá vông", "lá vông nem", "trà sen", "trà tâm sen", "trà ướp sen", "lá tía tô đất", "tía tô đất", "trà dưỡng tâm an thần",
];

const FOLK_WORD = VN(/\b(dân gian|mẹo dân gian|thuốc nam|thuốc bắc|bài thuốc|đông y|thảo dược|cây thuốc|lá thuốc|thuốc lá cây|mẹo xưa|mẹo ông bà|cách dân gian|thuốc dân gian|y học cổ truyền)\b/);
// (31/10) "bồ công anh có giải độc gan không", "lá hẹ có trị ho không" — câu hỏi "có … không" cũng là hỏi về vị đó.
const ASK = VN(/\b(có(?! (?:ai|bán|chỗ|quán|nơi|người|shop|cửa hàng|tiệm|ship|giao))(?: \S+){1,5} (?:không|ko|k|hông|hok|ha|hả)|tác dụng|công dụng|có tốt|tốt không|tốt k|tốt ko|có hại|hại không|có độc|độc không|có sao|sao không|uống|dùng|xài|là gì|là cây gì|chữa|trị|giúp|đỡ|bổ|ai không nên|kiêng|được không|được k|được ko|dc k|đc k|ra sao|thế nào|như nào|có nên|nên không|nên k|ăn được|cho bé|cho con|cho trẻ|bà bầu|mang thai|có thật|thật không|hiệu quả|có ích|lợi ích|thì sao|thế sao|hết không|có hết|có khỏi|sao vậy|phải không|phải k|đúng không|đúng k|có đúng)\b/);
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
const AMBIG_BARE = new Set(["rieng", "chi tu", "do trong", "o mai", "hoe", "sa nhan", "sai ho", "tam that", "huong phu", "phong phong"]);
export function findFolk(text: string): FolkEntry | null {
  const n = ` ${normalizeVi(text)} `;
  let best: { f: FolkEntry; len: number } | null = null;
  for (const f of FOLK) {
    if (f.id === "boi-bong" && !(BURN.test(n) && BOI.test(n))) continue;
    if (f.ctx && !f.ctx.test(n)) continue;
    // (bà bầu ĂN dứa là câu hỏi ăn uống khi mang thai — nguồn bromelain chỉ nói về viên bổ sung, không nói về ăn quả → để lớp ăn uống khi mang thai trả lời)
    // (04/11: mục "người lớn bị sốt" không áp cho trẻ — trẻ sốt có mục riêng)
    if (f.id === "sot-kieng" && KID.test(n)) continue;
    if (f.id === "tia-to" && /\btia to dat\b/.test(n)) continue; // tía tô đất (lemon balm) là cây khác tía tô
    if (f.id === "dua-bromelain" && PREG.test(n) && !VN(/\b(bromelain|viên|thực phẩm chức năng|uống men)\b/).test(n)) continue;
    // (ngộ độc THỰC PHẨM / rượu khác nuốt phải chất độc — nguồn NHS Poisoning nói về chất độc, không áp lời "đừng cho uống gì" cho tiêu chảy, nôn do đồ ăn)
    if (f.id === "ngo-doc-gay-non" && FOODPOI.test(n) && !CHEM.test(n)) continue;
    // ("toi bi ho" gõ không dấu là "tôi bị ho"; "tối nay" có dấu khác "tỏi") → chỉ nhận tỏi khi gõ đúng "tỏi", hoặc không dấu mà đi kèm chữ chỉ món tỏi.
    if (f.id === "toi" && !ACCENTED.test(text) && !/\b(toi song|ngam toi|toi ngam|ruou toi|toi mo coi|toi den|cu toi|tep toi|an toi song)\b/.test(n)) continue;
    // ("mang thai", "san nhà" gõ không dấu ≠ "măng", "sắn") → gõ không dấu thì chỉ nhận tên nhiều chữ.
    if (f.id === "san-mang-doc" && !ACCENTED.test(text) && !/\b(cu san|say san|khoai mi|cu mi|mang tuoi|mang chua|mang rung|mang tre|nuoc mang|luoc mang|luoc san|ngam mang|khoai tay)\b/.test(n)) continue;
    // (04/11) "mã đề thi", "mã đề số 3" là đề kiểm tra; "sa" không dấu một mình ("bi sa sut", "sa vao") không phải cây sả.
    if (f.id === "ma-de" && /\bma de (thi|so|\d)/.test(n)) continue;
    if (f.id === "sa" && !ACCENTED.test(text) && !/\b(la sa|cu sa|cay sa|nuoc sa|tinh dau sa|tra sa|xong sa)\b/.test(n)) continue;
    let m: { 0: string } | null = n.match(RE.get(f.id)!);
    // (04/11) tên vị trùng chữ thường khi gõ không dấu ("rieng toi" = riêng tôi, "chi tu" = chị tư, "do trong" = đồ trong, "tam that" = tâm thất)
    //   → chỉ nhận khi câu có chữ chỉ vị thuốc.
    if (m && !ACCENTED.test(text) && AMBIG_BARE.has(m[0].trim()) && !/\b(tac dung|cong dung|vi thuoc|thuoc nam|thuoc bac|duoc lieu|cu|la|tra|nuoc|bot|qua|hat|vo|re)\b/.test(n)) continue;
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
  // (04/11) "nghệ đen" (nga truật) là vị khác "nghệ" — vị chưa có nguồn mà tên dài hơn tên vừa khớp thì không trả lời bằng vị ngắn.
  if (best && best.len < 100) {
    const u = findUnverifiedHerb(text);
    if (u && normalizeVi(u).length > best.len && normalizeVi(u).includes(normalizeVi(best.f.names.find((x) => n.includes(` ${normalizeVi(x)} `)) ?? "\u0000"))) return null;
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
const PREG_FACT = /mang thai|có thai|bà bầu|bầu|cho con bú/u;

/** Mục vốn nói về trẻ nhỏ — không kèm câu "nguồn chưa nêu riêng cho trẻ nhỏ". */
const KID_ENTRIES = new Set(["dau-gio-tre", "nuoc-la-so-sinh"]);
export function renderFolk(f: FolkEntry, topic?: { id: string; name: string } | null, now = Date.now(), q = ""): string {
  // (04/11) vị độc lấy từ tài liệu y học cổ truyền (Long Châu) — không gọi là "nguồn y khoa".
  const v = f.verdict === "danger" && f.sources.every((x) => /Long Châu/.test(x.publisher)) ? { icon: "⛔", text: "Vị thuốc ĐỘC — cảnh báo nguy hiểm, không tự ý dùng" } : VERDICT[f.verdict];
  const t = topic ? f.topics.find((x) => x.id === topic.id) : null;
  const nq = ` ${normalizeVi(q)} `;
  // Hỏi cho trẻ nhỏ / bà bầu → lưu ý của đúng nhóm đó lên đầu ("bé 6 tháng ăn mật ong được không").
  const pick = (re: RegExp) => [...(f.how ?? []), ...f.caution].filter((x) => re.test(x.text));
  const kid = q && KID.test(nq) ? pick(KID_FACT) : [];
  const preg = q && PREG.test(nq) ? pick(PREG_FACT) : [];
  const myth = f.verdict === "myth";
  const trad = f.verdict === "trad" || f.sources.some((x) => /Long Châu/.test(x.publisher));
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
    myth && f.belief ? `🏡 **Dân gian hay:** ${f.belief}` : f.folk.length ? `🏡 **${trad ? "Theo y học cổ truyền" : "Dân gian dùng để"}:**\n${bl(f.folk)}` : "",
    f.science.length ? `🔬 **${myth ? "Nguồn y khoa nói" : trad ? "Theo y học hiện đại" : "Nghiên cứu nói gì"}:**\n${bl(f.science)}` : "",
    (() => {
      const hs = (f.how ?? []).filter((x) => !kid.includes(x) && !preg.includes(x));
      return hs.length ? `${myth ? "✅ **Nên làm:**" : trad ? "🥣 **Bài thuốc kinh nghiệm (tham khảo):**" : "🥣 **Cách làm theo nguồn:**"}\n${bl(hs)}` : "";
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
  const order: FolkVerdict[] = ["myth", "help", "mixed", "trad", "unclear", "risky", "danger"];
  hits.sort((a, b) => order.indexOf(a.t.v ?? a.f.verdict) - order.indexOf(b.t.v ?? b.f.verdict));
  // (30/10 — Kir: "Đau mắt đỏ: nhỏ sữa mẹ, nước lá? — đừng nhỏ sữa mẹ hay nước lá…" lặp ý) → tên dạng câu hỏi thì chỉ ghi lời đáp.
  const lines = hits.map(({ f, t }) => `• ${VERDICT[t.v ?? f.verdict].icon} ${f.name.endsWith("?") ? cap(t.text) : `**${f.name}** — ${t.text}`}.`);
  const pubs = Array.from(new Set(hits.flatMap(({ f, t }) => t.src.map((i) => f.sources[i].publisher))));
  if (opts.compact)
    return `🌱 **Mẹo dân gian:**\n${lines.join("\n")}`;
  return [
    `🌱 **Mẹo dân gian cho ${topicName}:**`,
    lines.join("\n"),
    `✅ có bằng chứng (còn hạn chế) · 🔸 giúp vài trường hợp · 📜 theo y học cổ truyền (tham khảo) · ❔ chưa đủ bằng chứng · ⚠️ có rủi ro · ⛔ nguy hiểm · 🧐 quan niệm dân gian — nguồn hướng dẫn khác`,
    `👉 Mẹo dân gian chỉ hỗ trợ, không thay điều trị — nặng lên hay kéo dài thì đi khám nha.`,
    `📚 Nguồn: ${pubs.join(" · ")}. Lomi đối chiếu ngày ${VERIFIED.split("-").reverse().join("/")}. Đây là kiến thức tham khảo chung, không thay lời dặn của bác sĩ / dược sĩ.`,
  ].join("\n\n");
}

/** 04/11: "giảo cổ lam có hạ đường huyết không", "râu ngô hạ huyết áp được không" — hỏi TÁC DỤNG của một vị (hạ / giảm / tăng đường huyết,
 *  huyết áp, mỡ máu), không phải người hỏi đang bị hạ đường huyết / huyết áp thấp ("tôi bị hạ đường huyết" thì không tính). */
const HERB_EFFECT = VN(/\b(hạ|tăng|giảm) (đường huyết|đường máu|đường|huyết áp|áp|mỡ máu|cholesterol)\b/);
const SICK_EFFECT = VN(/\b(bị|đang|hay|thường|dễ) (hạ|tăng|giảm) (đường|huyết áp|áp)\b/);
export const herbEffectAsk = (q: string) => HERB_EFFECT.test(` ${normalizeVi(q)} `) && !SICK_EFFECT.test(` ${normalizeVi(q)} `) && !!findFolk(q);

/** 04/11 (Kir: "bệnh gì có liên quan thì thêm mấy dược liệu đó vào khi người ta hỏi đến") — dòng gợi ý ngắn kèm thẻ bệnh:
 *  • phần tổng quan: các vị / mẹo dân gian hay dùng cho bệnh này (tham khảo), mời hỏi riêng từng vị;
 *  • phần kiêng: vị nên TRÁNH / thận trọng với bệnh này (ý nguồn ghi rủi ro) + vị hay dùng. */
export function herbHintFor(topicId: string, topicName: string, aspect: "overview" | "diet", seen = ""): string | null {
  const hits = folkFor(topicId).filter(({ f }) => f.verdict !== "myth" && !f.name.endsWith("?"));
  const bad = hits.filter(({ f, t }) => ["risky", "danger"].includes(t.v ?? f.verdict));
  const goodE = hits.filter((h) => !bad.includes(h)).map(({ f }) => f).filter((f) => !seen.includes(`**${f.name.replace(/\s*\(.*\)$/, "")}**`));
  const good = goodE.map((f) => f.name.replace(/\s*\(.*\)$/, ""));
  const parts: string[] = [];
  if (aspect === "diet" && bad.length)
    parts.push(`⚠️ **Thảo dược / mẹo dân gian cần tránh hoặc thận trọng với ${topicName}:**\n${bad.slice(0, 5).map(({ f, t }) => `• **${f.name.replace(/\s*\(.*\)$/, "")}** — ${t.text}.`).join("\n")}`);
  if (good.length)
    parts.push(`🌿 **Dược liệu / mẹo dân gian hay dùng cho ${topicName}** (tham khảo): ${good.slice(0, 6).join(", ")}${good.length > 6 ? "…" : ""} — hỏi “${goodE[0].names[0]} có tác dụng gì” để xem cách dùng và ai không nên dùng.`);
  return parts.length ? parts.join("\n\n") : null;
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
    ["📜 Theo y học cổ truyền (tham khảo)", FOLK.filter((f) => f.verdict === "trad").map((f) => f.name)],
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

// (01/11 vòng 23: "bị gout có ăn được tỏi không", "có nên ăn tỏi", "gout ăn tỏi tốt không" cũng là hỏi kiêng cữ món đó với bệnh)
const FOOD_ASK = VN(/\b(ăn|uống)\b.*\b(được không|được k|được ko|dc k|đc k|dc ko|đc ko|có sao|kiêng|có nên|nên không|tốt không|tốt ko|tốt k|hại không|hại ko)\b|\b(có nên|nên|có được|có thể) (tránh )?(ăn|uống)\b|\bcó (ăn|uống) được\b/);
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
    //   (01/11 vòng 23: câu nối sau thẻ bệnh — "tôi bị gout" rồi "ăn tỏi được không" — bệnh lấy từ câu trước)
    const dm = med ?? prevMed;
    if (dm && !group && !herbEffectAsk(q) && !f.topics.some((t) => t.id === dm.id) && !folkWord && FOOD_ASK.test(nq0) && !HELP_ASK.test(nq0)) return null;
    return { text: renderFolk(f, med, Date.now(), q), folk: f.id, topic: med?.id, verdict: f.verdict };
  }
  const uh = findUnverifiedHerb(q);
  if (uh && asked) {
    if ((med ?? prevMed) && !folkWord && FOOD_ASK.test(` ${normalizeVi(q)} `) && !HELP_ASK.test(` ${normalizeVi(q)} `)) return null;
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

// 04/11 (Kir: "Ho có ăn tôm đc k?" — câu hỏi một món cụ thể khi ho phải được trả lời THẲNG món đó, không đưa nguyên thẻ chung).
//   Dùng đúng các ý có nguồn của mục "ho-kieng" (và thẻ Ho cho chuyện tắm); câu hỏi chung "ho kiêng gì / nên ăn gì" để folkReply đưa đủ thẻ.
const COUGH = VN(/\b(bị ho|đang ho|còn ho|hay ho|ho khan|ho có đờm|ho có đàm|ho đờm|ho kéo dài|ho dai dẳng|ho lâu|cơn ho|ho nhiều|ho quá|ho hoài|ho suốt)\b/);
const ASKY = VN(/\b(gì|lây|được không|được ko|được k|đc không|đc ko|đc k|được hông|có sao không|có sao ko|có nên|nên không|nên ko|có tốt không|tốt không|có đỡ|đỡ không|đỡ ko|có kiêng|kiêng không|kiêng ko|phải kiêng|có hại|hại không|có giúp|giúp không|không|ko|k|hông|hem)\b/);
export function coughFocusReply(text: string): string | null {
  const nq = ` ${normalizeVi(text)} `;
  const throat = !COUGH.test(nq) && VN(/\b(đau họng|rát họng|viêm họng|ngứa họng)\b/).test(nq);
  if ((!COUGH.test(nq) && !throat) || !ASKY.test(nq)) return null;
  // chỉ đau họng (không ho): chỉ trả lời các ý nguồn đau họng nói rõ — đồ lạnh, nước muối, hút thuốc
  if (throat && !VN(/\b(đồ lạnh|nước lạnh|nước đá|đá lạnh|đá|kem|đồ uống lạnh|lạnh|ngậm muối|nước muối|súc miệng|súc họng|hút thuốc|thuốc lá|khói thuốc)\b/).test(nq)) return null;
  const f = FOLK.find((x) => x.id === "ho-kieng");
  if (!f) return null;
  // hỏi thuốc (kháng sinh, siro, thuốc ho…) → để phần thuốc trả lời (Lomi không quyết dùng thuốc thay bác sĩ)
  if (VN(/\b(thuốc|kháng sinh|siro|si rô|paracetamol|ibuprofen|aspirin|viên|toa|đơn thuốc)\b/).test(nq) && !VN(/\b(thuốc lá|hút thuốc|khói thuốc)\b/).test(nq)) return null;

  // vị thuốc / mẹo có mục riêng (tía tô, cam thảo, gừng, lá hẹ, quất chưng…) → để lời đáp của vị đó trả lời
  const own = findFolk(text);
  if ((own && !["ho-kieng", "mat-ong-chanh", "cam-vitamin-c"].includes(own.id)) || findUnverifiedHerb(text)) return null;
  const kid = VN(/\b(bé|con|trẻ|cháu|em bé|con nít|tháng tuổi)\b/).test(nq);
  const close = throat ? "Chung khi đau họng: uống nhiều nước, ăn đồ mát hoặc mềm, nghỉ ngơi." : "Chung khi ho: nghỉ ngơi, uống nhiều nước. Đi khám nếu ho quá 3 tuần, ho ra máu, khó thở, đau ngực hoặc ho nặng lên nhanh.";
  const say = (head: string, src: number[]) => [head, close, sourceLine(f, [...src, 0])].join("\n\n");
  if (VN(/\b(mật ong|chanh mật ong|chanh nóng|chanh ấm|nước chanh|chanh muối)\b/).test(nq)) {
    if (kid) return null; // bé + mật ong: lời đáp riêng cho trẻ (dưới 1 tuổi không được ăn mật ong) đã có sẵn
    return say("🍋 **Chanh mật ong ấm** uống được nha — có thể dịu ho gần giống siro ho, dù bằng chứng còn hạn chế. Cách làm: vắt nửa quả chanh vào cốc nước sôi, thêm chút mật ong, uống khi còn ấm.\n⚠️ Không cho bé **dưới 1 tuổi** ăn mật ong; không cho trẻ nhỏ uống đồ nóng.", [0]);
  }
  if (VN(/\b(hút thuốc|thuốc lá|khói thuốc|vape|thuốc lá điện tử)\b/).test(nq))
    return say(throat ? "🚭 **Đang đau họng thì nên tránh hút thuốc** và chỗ có khói thuốc nha." : "🚭 **Đang ho thì đừng hút thuốc** nha — hút thuốc chính là một nguyên nhân gây ho, và khi đau họng cũng nên tránh cả chỗ có khói thuốc.", [0, 1]);
  if (VN(/\b(sữa|uống sữa)\b/).test(nq))
    return say("🥛 **Uống sữa được** nha — sữa không làm cơ thể tiết thêm đờm. Cảm giác họng hơi đặc sau khi uống chỉ là do sữa trộn với nước bọt, hết sau chốc lát.", [2]);
  if (VN(/\b(đồ lạnh|nước lạnh|nước đá|đá lạnh|đá|kem|đồ uống lạnh|nước ngọt lạnh|lạnh)\b/).test(nq))
    return say(`🧊 Nguồn y khoa **không bảo phải kiêng đồ lạnh** khi ${throat ? "đau họng" : "ho"}. ${throat ? "Hướng dẫn chăm đau họng còn gợi ý" : "Nếu đau họng kèm theo, hướng dẫn còn gợi ý"} ăn đồ mát hoặc mềm, ngậm đá viên, kem que cho dịu họng.${kid ? "\n⚠️ Đừng cho trẻ nhỏ ngậm vật nhỏ, cứng (đá viên, kẹo cứng) vì dễ hóc." : " (Đừng cho trẻ nhỏ ngậm vật nhỏ, cứng vì dễ hóc.)"} Thấy uống lạnh khó chịu hơn thì cứ chọn nước ấm.`, [1]);
  if (VN(/\b(ngậm muối|nước muối|súc miệng|súc họng)\b/).test(nq))
    return say(`🧂 Súc họng bằng **nước muối ấm** rồi nhổ ra có thể giúp dịu khi đau họng kèm theo${kid ? " — nhưng **trẻ em không nên** súc họng kiểu này" : " (trẻ em không nên làm)"}.`, [1]);
  if (VN(/\b(nước ấm|đồ ấm|uống ấm|nước nóng|nước gừng)\b/).test(nq) && !VN(/\bgừng\b/).test(nq))
    return say("☕ **Uống nước ấm tốt** nha — uống nhiều nước giúp dịu ho; chanh mật ong ấm cũng là lựa chọn quen thuộc (không cho bé dưới 1 tuổi ăn mật ong).", [0, 3]);
  if (VN(/\b(tắm|gội đầu|gội)\b/).test(nq))
    return say("🚿 Nguồn y khoa **không bảo kiêng tắm** khi ho — hơi nước ấm (như tắm nước ấm) còn có thể giúp dịu ho. Tắm nhanh, lau khô, giữ ấm sau khi tắm.", [3]);
  if (VN(/\b(gió|ra gió|kiêng gió|quạt|máy lạnh)\b/).test(nq))
    return say("🌬️ Lomi **chưa thấy nguồn y khoa nào** nói ho phải kiêng gió — hướng dẫn tự chăm chỉ khuyên nghỉ ngơi, uống nhiều nước, ở nhà nếu đang sốt.", [0]);
  if (VN(/\b(lây|lây không|lây ko|lây sang|lây cho)\b/).test(nq))
    return say("🦠 Ho là **triệu chứng**, nên có lây hay không là tuỳ **nguyên nhân** gây ho. Phần lớn cơn ho do **cảm lạnh hoặc cúm**. Đang sốt hay thấy mệt, không sinh hoạt bình thường được thì nên ở nhà, hạn chế tiếp xúc người khác.", [0]);
  // món cụ thể — tên hiển thị lấy theo bảng (câu đã bỏ dấu khi so)
  const FOODS: [RegExp, string, boolean][] = [
    [VN(/\btôm cua\b/), "tôm, cua", true], [VN(/\btôm\b/), "tôm", true], [VN(/\bcua\b/), "cua", true], [VN(/\b(hải sản|đồ biển)\b/), "hải sản", true],
    [VN(/\b(đồ tanh|tanh)\b/), "đồ tanh", true], [VN(/\btrứng\b/), "trứng", true], [VN(/\bcá\b/), "cá", true],
    [VN(/\b(thịt gà|gà)\b/), "thịt gà", true], [VN(/\b(thịt bò|bò)\b/), "thịt bò", false], [VN(/\b(đồ cay|ăn cay|cay)\b/), "đồ cay", false],
    [VN(/\b(đồ chiên|chiên|rán)\b/), "đồ chiên", false], [VN(/\b(đồ ngọt|kẹo|bánh ngọt)\b/), "đồ ngọt", false],
    [VN(/\b(trái cây|hoa quả)\b/), "trái cây", false], [VN(/\b(cam(?! thảo)|quýt)\b/), "cam, quýt", false], [VN(/\bchuối\b/), "chuối", false],
  ];
  const hit = FOODS.find(([re]) => re.test(nq));
  if (hit) {
    const [, item, tanh] = hit;
    return say(`🍤 Ăn **${item}** khi ho thì nguồn y khoa **không bảo phải kiêng** — hướng dẫn tự chăm khi ho không nêu món ăn nào cần tránh. Lomi cũng chưa thấy nguồn nào xác nhận chuyện ho phải kiêng ${tanh ? "tôm, cua, hải sản, đồ tanh hay trứng" : "món này"}.${item === "đồ cay" ? " Nếu ăn cay làm họng rát, ho nhiều hơn thì cứ bớt lại theo cảm nhận của mình." : ""}`, [0]);
  }
  if (VN(/\b(uống gì|nên uống|uống cái gì|uống nước gì)\b/).test(nq))
    return say("🥤 Với **Ho**, **uống nhiều nước** là chính — nước ấm, nước lọc đều được. **Chanh mật ong ấm** có thể dịu ho gần giống siro ho (bằng chứng còn hạn chế; không cho bé dưới 1 tuổi ăn mật ong, không cho trẻ nhỏ uống đồ nóng). Thuốc ho, siro ho thì hỏi dược sĩ để chọn đúng loại.", [0, 3]);
  if (VN(/\b(nên ăn gì|ăn gì|ăn cái gì|ăn uống sao|ăn uống thế nào)\b/).test(nq) && !VN(/\bkiêng\b/).test(nq))
    return say("🍲 Khi ho **không có món nào bắt buộc phải kiêng** theo hướng dẫn y khoa — cứ ăn uống bình thường, đủ bữa, **uống nhiều nước**. Đau họng kèm theo thì chọn đồ mềm hoặc mát cho dễ nuốt.", [0, 1]);
  return null;
}

// 04/11: người lớn bị sốt hỏi một món / thói quen cụ thể → trả lời thẳng (trẻ em: để lời đáp riêng cho trẻ sốt).
export function feverFocusReply(text: string): string | null {
  const nq = ` ${normalizeVi(text)} `;
  if (!VN(/\b(bị sốt|đang sốt|sốt cao|sốt nhẹ|còn sốt|sốt)\b/).test(nq)) return null;
  const red = VN(/\b(lú lẫn|lơ mơ|khó đánh thức|không tỉnh|co giật|khó thở|tím tái|môi tím|đau đầu dữ dội|cứng cổ|không đi được)\b/).test(nq);
  if (!red && !ASKY.test(nq)) return null;
  if (VN(/\b(bé|con|trẻ|cháu|em bé|con nít|tháng tuổi|sốt xuất huyết|sốt rét|sốt phát ban|co giật)\b/).test(nq)) return null;
  if (VN(/\b(bị ho|ho|đau họng)\b/).test(nq)) return null; // ho kèm sốt: lời đáp về ho lo
  const f = FOLK.find((x) => x.id === "sot-kieng");
  if (!f) return null;
  // hỏi thuốc (kháng sinh, siro, thuốc ho…) → để phần thuốc trả lời (Lomi không quyết dùng thuốc thay bác sĩ)
  if (VN(/\b(thuốc|kháng sinh|siro|si rô|paracetamol|ibuprofen|aspirin|viên|toa|đơn thuốc)\b/).test(nq) && !VN(/\b(thuốc lá|hút thuốc|khói thuốc)\b/).test(nq)) return null;

  // dấu hiệu phải gọi cấp cứu đi kèm sốt → nói chuyện cấp cứu trước, không bàn chuyện ăn uống
  if (red && !VN(/\b(ăn|uống|kiêng|tắm|gội|gió)\b/).test(nq)) return null; // kể dấu hiệu nặng (không hỏi ăn uống) → luồng cấp cứu sẵn có
  if (red)
    return [`⚠️ Sốt mà kèm **lú lẫn, khó đánh thức, co giật, khó thở, môi / móng tím tái, đau đầu dữ dội hoặc cứng cổ** là dấu hiệu cần **gọi cấp cứu (115)** hoặc tới cơ sở y tế gần nhất **ngay** nha, đừng chờ ở nhà.`, sourceLine(f, [1])].join("\n\n");
  const own = findFolk(text);
  if ((own && !["sot-kieng", "kieng-nuoc"].includes(own.id)) || findUnverifiedHerb(text)) return null;
  const close = "Chung khi sốt: nghỉ ngơi nhiều, uống nhiều nước, ở nhà tới khi hết sốt. Sốt kèm lú lẫn, co giật, khó thở, đau đầu dữ dội hay cứng cổ thì gọi cấp cứu ngay.";
  const say = (head: string) => [head, close, sourceLine(f, [0, 1])].join("\n\n");
  if (VN(/\b(tắm|gội|gội đầu)\b/).test(nq))
    return say("🚿 Lomi **chưa thấy nguồn y khoa nào** bảo người lớn bị sốt phải kiêng tắm — hướng dẫn tự chăm chỉ nói nghỉ ngơi, uống nhiều nước. Thấy mệt thì tắm nhanh bằng nước ấm, lau khô, đừng để bị lạnh run.");
  if (VN(/\b(gió|ra gió|kiêng gió|quạt|máy lạnh|ủ kín|trùm chăn)\b/).test(nq))
    return say("🌬️ Lomi **chưa thấy nguồn y khoa nào** nói sốt phải kiêng gió hay ủ thật kín — hướng dẫn tự chăm chỉ khuyên nghỉ ngơi, uống nhiều nước.");
  if (VN(/\b(uống gì|nên uống|uống nước gì)\b/).test(nq))
    return say("💧 Khi sốt thì **uống nhiều nước** là chính — nước lọc là tốt nhất, uống đủ để nước tiểu vàng nhạt, trong.");
  const FOODS: [RegExp, string][] = [[VN(/\btôm\b/), "tôm"], [VN(/\bcua\b/), "cua"], [VN(/\b(hải sản|đồ biển)\b/), "hải sản"], [VN(/\b(đồ tanh|tanh)\b/), "đồ tanh"], [VN(/\btrứng\b/), "trứng"], [VN(/\bsữa\b/), "sữa"], [VN(/\b(thịt gà|gà)\b/), "thịt gà"], [VN(/\b(thịt bò|bò)\b/), "thịt bò"], [VN(/\bcá\b/), "cá"], [VN(/\bthịt\b/), "thịt"], [VN(/\b(đồ lạnh|nước đá|kem)\b/), "đồ lạnh"]];
  const hit = FOODS.find(([re]) => re.test(nq));
  if (hit) return say(`🍤 Ăn **${hit[1]}** khi sốt thì nguồn y khoa **không bảo phải kiêng** — hướng dẫn tự chăm khi sốt ở người lớn không nêu món ăn nào cần tránh. Lomi cũng chưa thấy nguồn nào xác nhận chuyện sốt phải kiêng món này. Ăn được gì thì ăn, nhớ uống đủ nước.`);
  if (VN(/\b(kiêng gì|kiêng cái gì|kiêng món gì|nên ăn gì|ăn gì|ăn uống sao)\b/).test(nq))
    return say("🍲 Khi sốt **không có món nào bắt buộc phải kiêng** theo hướng dẫn y khoa — ăn được gì thì ăn, quan trọng nhất là **nghỉ ngơi** và **uống nhiều nước** (nước lọc là tốt nhất).");
  return null;
}

// 04/11 (Kir: "có mấy loại trà trị mất ngủ") — "mất ngủ uống trà gì / trà nào giúp ngủ ngon": tóm các loại hay được hỏi, mỗi loại đúng
//   một dòng lấy từ mục có nguồn của nó (thẻ "mat-ngu" của từng vị), cộng lời dặn tránh trà có caffeine trước giờ ngủ (thẻ mất ngủ).
export function sleepTeaReply(text: string): string | null {
  const nq = ` ${normalizeVi(text)} `;
  if (!VN(/\b(ngủ|mất ngủ|khó ngủ|ngủ ngon|dễ ngủ|ngủ không được|trằn trọc|an thần)\b/).test(nq)) return null;
  // "uống trà xanh / trà đen / trà sữa buổi tối có mất ngủ không" → chuyện caffeine (thẻ mất ngủ: tránh trà, cà phê ≥ 6 giờ trước khi ngủ)
  if ((VN(/\b(trà xanh|trà đen|trà sữa|trà đặc|trà ô long|trà lài|trà nhài|hồng trà|matcha|trà đá)\b/).test(nq) || VN(/\buống trà\b(?=.*\b(buổi tối|ban đêm|tối|đêm|trước khi ngủ|chiều)\b)/).test(nq)) && VN(/\b(mất ngủ|khó ngủ|ngủ không được|thức trắng)\b/).test(nq) && !VN(/\b(trà (gì|nào|loại nào)|gây|làm cho|khiến)\b/).test(nq) && !VN(/\b(trà (thảo mộc|hoa cúc|cúc|gừng|sen|tâm sen|lạc tiên|oải hương|bạc hà|atiso|lá vông))\b/).test(nq))
    return "☕ **Có thể đấy** — trà xanh, trà đen, trà sữa có **caffeine**, mà nguồn y khoa về mất ngủ khuyên **tránh trà, cà phê ít nhất 6 giờ trước khi đi ngủ** (cùng với rượu và thuốc lá).\n• Muốn uống gì ấm buổi tối thì chọn đồ không có caffeine; tránh uống quá nhiều nước sát giờ ngủ cho đỡ phải dậy đi tiểu\n• Người nhạy với caffeine có khi uống buổi chiều cũng khó ngủ — thử dời ly trà sang buổi sáng xem sao\n\nMuốn biết loại trà nào hay được dùng cho dễ ngủ thì hỏi Lomi “mất ngủ uống trà gì” nha.";
  if (!VN(/\b(trà (gì|nào|loại nào|cho dễ ngủ|giúp ngủ|ngủ ngon|an thần)|loại trà|các loại trà|mấy loại trà|uống gì (cho |để |thì )?(dễ ngủ|ngủ ngon|ngủ được)|uống gì cho ngủ|thảo dược (gì|nào)|lá gì|mẹo (gì|nào) (cho |để )?(dễ ngủ|ngủ ngon)|mẹo dân gian (trị |chữa )?mất ngủ|trị mất ngủ bằng (gì|cách nào))\b/).test(nq)) return null;
  if (VN(/\b(bé|con|trẻ|cháu|em bé|tháng tuổi)\b/).test(nq)) return null;
  const line = (id: string, label: string) => {
    const f = FOLK.find((x) => x.id === id);
    const t = f?.topics.find((x) => x.id === "mat-ngu");
    return f && t ? `• ${VERDICT[t.v ?? f.verdict].icon} **${label}** — ${t.text}` : "";
  };
  const preg = VN(/\b(bầu|mang thai|có thai|cho con bú)\b/).test(nq);
  return [
    "🍵 **Trà / thảo dược hay được dùng cho dễ ngủ** — bằng chứng của từng loại theo nguồn y khoa:",
    [line("cuc-la-ma", "Cúc La Mã (chamomile)"), line("lac-tien", "Lạc tiên tây (passionflower)"), line("nu-lang", "Nữ lang (valerian)"), line("oai-huong", "Oải hương (lavender)"), line("melatonin", "Melatonin (viên, không phải trà)")].filter(Boolean).join("\n"),
    "🔎 **Chưa có nguồn đáng tin đánh giá:** tâm sen / trà sen, lá vông, lạc tiên dại Việt Nam, tía tô đất, trà hoa cúc vàng — Lomi không dám nói chúng giúp ngủ hay không.",
    "☕ **Nên tránh trước giờ ngủ:** trà xanh, trà đen, trà sữa, cà phê (có caffeine) — tránh ít nhất 6 giờ trước khi ngủ; tránh cả rượu và thuốc lá.",
    preg ? "🤰 **Đang mang thai:** trà thảo mộc (như bạc hà, hoa cúc) không quá 4 cốc mỗi ngày; **không dùng lạc tiên tây**; hỏi bác sĩ trước khi dùng nữ lang, oải hương." : "🤰 Bà bầu: không dùng lạc tiên tây; trà thảo mộc thì hỏi bác sĩ trước.",
    "💡 Thảo dược chỉ là phụ — cái giúp ngủ chắc nhất vẫn là **giờ ngủ, giờ dậy cố định**, thư giãn một giờ trước khi ngủ, tránh màn hình sát giờ ngủ. Mất ngủ kéo dài nhiều tuần thì nên đi khám. Hỏi tên từng loại (vd “lạc tiên có giúp ngủ không”) để xem chi tiết và ai không nên dùng.",
  ].join("\n\n");
}
