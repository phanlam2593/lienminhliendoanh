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

export type FolkVerdict = "help" | "mixed" | "unclear" | "risky" | "danger";
export type FolkTopic = { id: string; text: string; src: number[]; v?: FolkVerdict };
export type FolkEntry = {
  id: string;
  /** Tên hiển thị. */
  name: string;
  /** Tên để nhận ra (viết đúng dấu tiếng Việt). */
  names: string[];
  verdict: FolkVerdict;
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
};

const VERIFIED = "2026-10-20";
const NCCIH = "NCCIH (Viện Y tế Quốc gia Hoa Kỳ – NIH)";
const nccih = (slug: string, title: string, upd: string): DrugSource => ({ title: `${title} (trang ghi cập nhật ${upd})`, publisher: NCCIH, url: `https://www.nccih.nih.gov/health/${slug}` });
const NHS_COUGH: DrugSource = { title: "Cough", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/cough/", reviewed: "2023-12-08" };
const NHS_COLD: DrugSource = { title: "Common cold", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/common-cold/", reviewed: "2024-03-22" };
const NHS_SINUS: DrugSource = { title: "Sinusitis (sinus infection)", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/sinusitis-sinus-infection/", reviewed: "2024-01-31" };
const NHS_BURN: DrugSource = { title: "Burns and scalds", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/burns-and-scalds/", reviewed: "2026-03-31" };
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
    how: [{ text: "Cách NHS gợi ý: vắt nửa quả chanh vào một cốc nước đun sôi, thêm 1–2 thìa cà phê mật ong, uống khi còn ấm.", src: [0, 1] }],
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
      { id: "cam-lanh", text: "NHS: rất ít bằng chứng tỏi phòng hay chữa cảm lạnh", src: [1], v: "unclear" },
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
      { text: "Thử nghiệm cho bệnh gan mâu thuẫn hoặc quá ít; hai nghiên cứu do NCCIH tài trợ (viêm gan C, gan nhiễm mỡ NASH) không thấy silymarin có lợi.", src: [0] },
      { text: "Vài nghiên cứu nhỏ: có thể giúp kiểm soát đường huyết ở tiểu đường type 2. Lợi sữa: chưa rõ.", src: [0] },
    ],
    caution: [
      { text: "Thường dễ dung nạp; có thể đầy bụng, buồn nôn, đầy hơi. Có thể dị ứng (nhất là người dị ứng hoa cúc, cúc vạn thọ).", src: [0] },
      { text: "Một số sản phẩm sai hàm lượng so với nhãn, hoặc nhiễm thuốc trừ sâu, vi sinh, độc tố nấm.", src: [0] },
    ],
    topics: [
      { id: "gan-nhiem-mo", text: "nghiên cứu do NCCIH tài trợ không thấy silymarin giúp gan nhiễm mỡ", src: [0], v: "unclear" },
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
    names: ["cháo cóc", "thịt cóc", "ruốc cóc", "chà bông cóc", "trứng cóc", "gan cóc", "bột cóc", "con cóc", "cóc tía", "nấu cóc", "ăn thịt cóc"],
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
];

/** Vị thuốc nam / bắc phổ biến mà Lomi CHƯA tìm được nguồn đáng tin đánh giá → nói thật, kèm lời dặn chung. */
export const UNVERIFIED_HERBS = [
  "kỷ tử", "câu kỷ tử", "kỉ tử", "câu kỉ tử", "táo tàu", "táo tào", "táo đỏ", "đại táo", "đông trùng hạ thảo", "đông trùng", "rau má", "diếp cá", "lá diếp cá", "lá ổi", "búp ổi",
  "mướp đắng", "khổ qua", "lá lốt", "lá trầu không", "trầu không", "nhân trần", "cà gai leo", "lá vối", "đinh lăng", "ích mẫu", "ngưu tất",
  "đương quy", "thục địa", "xuyên khung", "bạch truật", "hoàng liên", "kim ngân hoa", "la hán quả", "hoa đu đủ đực", "lá đu đủ", "tam thất",
  "nghệ đen", "ba kích", "nhung hươu", "rượu rắn", "cao hổ cốt", "cao xương", "hoài sơn", "bạch quả", "xạ đen", "lá xạ đen", "an cung ngưu hoàng",
  "trinh nữ hoàng cung", "lá sen", "tâm sen", "hạt sen", "râu ngô", "rễ tranh", "mã đề", "lá tre", "nước sâm", "sâm đất", "lá khôi", "chè vằng",
  "lá mơ", "lá mơ lông", "sả", "lá sả", "lá chanh",
];

const FOLK_WORD = VN(/\b(dân gian|mẹo dân gian|thuốc nam|thuốc bắc|bài thuốc|đông y|thảo dược|cây thuốc|lá thuốc|thuốc lá cây|mẹo xưa|mẹo ông bà|cách dân gian|thuốc dân gian|y học cổ truyền)\b/);
const ASK = VN(/\b(tác dụng|công dụng|có tốt|tốt không|tốt k|tốt ko|có hại|hại không|có độc|độc không|có sao|sao không|uống|dùng|xài|là gì|là cây gì|chữa|trị|giúp|đỡ|bổ|ai không nên|kiêng|được không|được k|được ko|dc k|đc k|ra sao|thế nào|như nào|có nên|nên không|nên k|ăn được|cho bé|cho con|cho trẻ|bà bầu|mang thai|có thật|thật không|hiệu quả|có ích|lợi ích|thì sao|thế sao|sao vậy)\b/);
const BURN = VN(/\b(bỏng|phỏng)\b/);
const BOI = VN(/\b(bôi|thoa|đắp|xức|trét|chấm)\b/);

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
    const m = n.match(RE.get(f.id)!);
    if (m && (!best || m[0].length > best.len)) best = { f, len: m[0].length };
  }
  return best?.f ?? null;
}
/** Tên vị thuốc nam / bắc phổ biến chưa có nguồn, đúng như người dùng gõ. */
export function findUnverifiedHerb(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  const m = n.match(UNVERIFIED_RE);
  if (!m) return null;
  return UNVERIFIED_HERBS.find((h) => normalizeVi(h) === m[0].trim()) ?? m[0].trim();
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

export function renderFolk(f: FolkEntry, topic?: { id: string; name: string } | null, now = Date.now(), q = ""): string {
  const v = VERDICT[f.verdict];
  const t = topic ? f.topics.find((x) => x.id === topic.id) : null;
  const nq = ` ${normalizeVi(q)} `;
  // Hỏi cho trẻ nhỏ / bà bầu → lưu ý của đúng nhóm đó lên đầu ("bé 6 tháng ăn mật ong được không").
  const pick = (re: RegExp) => [...(f.how ?? []), ...f.caution].filter((x) => re.test(x.text));
  const kid = q && KID.test(nq) ? pick(KID_FACT) : [];
  const preg = q && PREG.test(nq) ? pick(PREG_FACT) : [];
  const parts = [
    `🌿 **${f.name}** — mẹo dân gian & nguồn y khoa nói gì`,
    kid.length ? `👶 **Với trẻ nhỏ:**\n${bl(kid)}` : "",
    preg.length ? `🤰 **Với bà bầu / mẹ cho con bú:**\n${bl(preg)}` : "",
    q && (KID.test(nq) || PREG.test(nq)) && !kid.length && !preg.length ? "👶🤰 Nguồn chưa nêu riêng cho trẻ nhỏ / bà bầu — hỏi bác sĩ / dược sĩ trước khi dùng nha." : "",
    `${v.icon} ${v.text}.`,
    t ? `👉 Với **${topic!.name}**: ${t.text}.` : "",
    `🏡 **Dân gian dùng để:**\n${bl(f.folk)}`,
    `🔬 **Nghiên cứu nói gì:**\n${bl(f.science)}`,
    f.how?.length ? `🥣 **Cách làm theo nguồn:**\n${bl(f.how)}` : "",
    `⚠️ **${f.verdict === "danger" ? "Cảnh báo / khuyến cáo" : "Lưu ý · ai không nên dùng"}:**\n${bl(f.caution.filter((x) => !kid.includes(x) && !preg.includes(x)).length ? f.caution.filter((x) => !kid.includes(x) && !preg.includes(x)) : f.caution)}`,
    f.verdict === "danger" ? "" : "💊 Đang dùng thuốc, mang thai, cho con bú, có bệnh gan / thận / tim, hay sắp phẫu thuật thì hỏi bác sĩ / dược sĩ trước khi dùng thảo dược như thuốc nha.",
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
    `👉 Lomi có đối chiếu nguồn cho: ${FOLK.filter((f) => f.id !== "boi-bong").map((f) => f.name.split(" (")[0].toLowerCase()).slice(0, 14).join(", ")}… — hỏi tên vị (vd “gừng có tác dụng gì”) hoặc “mẹo dân gian trị ho” để xem.`,
    wiseLine(),
  ].join("\n\n");
}

/** Mẹo dân gian cho một bệnh trong kho. `withGeneric`: kèm lời dặn chung khi dùng thảo dược. */
export function renderFolkForTopic(topicId: string, topicName: string, opts: { compact?: boolean } = {}): string | null {
  const hits = folkFor(topicId);
  if (!hits.length) return null;
  const order: FolkVerdict[] = ["help", "mixed", "unclear", "risky", "danger"];
  hits.sort((a, b) => order.indexOf(a.t.v ?? a.f.verdict) - order.indexOf(b.t.v ?? b.f.verdict));
  const lines = hits.map(({ f, t }) => `• ${VERDICT[t.v ?? f.verdict].icon} **${f.name}** — ${t.text}.`);
  const pubs = Array.from(new Set(hits.flatMap(({ f, t }) => t.src.map((i) => f.sources[i].publisher))));
  if (opts.compact)
    return `🌱 **Mẹo dân gian** (đã đối chiếu nguồn: ${pubs.join(" · ")}):\n${lines.join("\n")}\n_Hỏi tên từng vị để xem ai không nên dùng._`;
  return [
    `🌱 **Mẹo dân gian cho ${topicName}** — Lomi chỉ nêu những mẹo đã đối chiếu được với nguồn y khoa:`,
    lines.join("\n"),
    `✅ có bằng chứng (còn hạn chế) · 🔸 giúp vài trường hợp · ❔ chưa đủ bằng chứng · ⚠️ có rủi ro · ⛔ nguy hiểm`,
    `👉 Hỏi tên từng vị (vd “${hits[0].f.name.split(" (")[0].toLowerCase()} có tác dụng gì”) để xem kỹ ai không nên dùng. Mẹo dân gian chỉ hỗ trợ, không thay điều trị — nặng lên hay kéo dài thì đi khám nha.`,
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
  ];
  return [
    `🌿 Lomi có đối chiếu nguồn y khoa (NIH, NHS, Bộ Y tế…) cho các mẹo dân gian / thuốc nam, thuốc bắc này:`,
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
): { text: string; folk?: string; topic?: string } | null {
  const words = normalizeVi(q).split(" ").filter(Boolean).length;
  const folkWord = isFolkAsk(q);
  const f = findFolk(q);
  // Cháo cóc / bôi đồ lên vết bỏng: cảnh báo ngay, kể cả câu kể ("a cho con ăn cháo cóc").
  if (f && (f.id === "thit-coc" || f.id === "boi-bong")) return { text: renderFolk(f, med, Date.now(), q), folk: f.id, topic: med?.id };
  const asked = asksAbout(q) || words <= 4 || folkWord;
  if (f && asked) {
    // "gout ăn gừng được không" — hỏi một MÓN với bệnh mà vị này không có ý gì cho bệnh đó → để lớp kiêng cữ trả lời.
    //   (Hỏi cho trẻ nhỏ / bà bầu mà vị này có lưu ý riêng cho nhóm đó — "bà bầu ăn ngải cứu được không" — thì vẫn trả lời ở đây.)
    const nq0 = ` ${normalizeVi(q)} `;
    const group = (KID.test(nq0) && [...(f.how ?? []), ...f.caution].some((x) => KID_FACT.test(x.text))) || (PREG.test(nq0) && f.caution.some((x) => PREG_FACT.test(x.text)));
    if (med && !group && !f.topics.some((t) => t.id === med.id) && !folkWord && FOOD_ASK.test(nq0) && !HELP_ASK.test(nq0)) return null;
    return { text: renderFolk(f, med, Date.now(), q), folk: f.id, topic: med?.id };
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
