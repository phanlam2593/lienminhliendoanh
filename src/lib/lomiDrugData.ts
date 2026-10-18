import { VR, VN } from "@/lib/viMatch";
// ─────────────────────────────────────────────────────────────────────────────
// KIẾN THỨC THUỐC CÓ NGUỒN (12/10) — dữ liệu, không phải bộ nhận diện câu hỏi.
//
// Tách hai việc trước đây dễ lẫn:
//   • NHẬN RA người dùng đang hỏi về thuốc (lib/lomiDrug.drugAsk — theo dáng câu, không cần biết thuốc đó là gì);
//   • CÓ KIẾN THỨC đã kiểm chứng về thuốc đó hay không (file này).
// Lomi chỉ được nói công dụng / tác dụng phụ / chống chỉ định / tương tác của một thuốc khi thuốc đó có mục ở đây, và
// MỖI Ý phải trỏ tới nguồn. Thuốc chưa có mục → lớp hỏi-thuốc nói rõ là chưa có dữ liệu đã kiểm chứng. Tương tác chỉ được nêu
// khi có bản ghi riêng cho đúng cặp đó — không bao giờ suy ra từ tên thuốc hay từ nhóm thuốc.
//
// QUY TẮC THÊM / SỬA MỘT MỤC (test lomiDrugData.test.ts ép các quy tắc này):
//   1. Nguồn phải là trang của cơ quan y tế / thư viện y khoa chính thống (danh sách TRUSTED bên dưới), có đường dẫn https.
//   2. Mỗi ý (DrugFact / DrugInteraction) ghi chỉ số nguồn của nó trong `src`. Không có nguồn → không được viết ý đó.
//   3. `verifiedAt` là ngày NGƯỜI SỬA mở lại nguồn và đối chiếu từng ý (không phải ngày viết code). Quá REVIEW_AFTER_DAYS ngày
//      thì lời đáp tự kèm ghi chú "nên kiểm tra lại", để dữ liệu cũ không được trình bày như mới.
//   4. Không ghi con số liều. Liều phụ thuộc tuổi, cân nặng, bệnh nền — Lomi luôn chỉ về tờ hướng dẫn / dược sĩ / bác sĩ.
//   5. `names` chỉ để NHẬN RA người dùng đang nói tới hoạt chất này (tên gốc + vài tên họ hay gõ), không phải khuyến nghị nhãn hàng.
// ─────────────────────────────────────────────────────────────────────────────

export type DrugSource = {
  /** Tên trang nguồn. */
  title: string;
  /** Cơ quan phát hành (hiện trong lời đáp). */
  publisher: string;
  url: string;
  /** Ngày chính trang nguồn ghi là đã rà soát / cập nhật (YYYY-MM-DD), nếu có. */
  reviewed?: string;
  /** 15/10: trang KHÔNG ghi ngày rà soát (vd trang tổng của NHS) → ngày trang được cập nhật (YYYY-MM-DD), hiện là "cập nhật …". */
  updated?: string;
};
/** Một ý kiến thức + nguồn của nó (chỉ số trong `sources`). */
export type DrugFact = { text: string; src: number[] };
export type DrugInteraction = {
  id: string;
  /** Nhận ra thứ dùng chung trong câu hỏi (trên chuỗi đã bỏ dấu, chữ thường). */
  match: RegExp;
  /** Tên hiển thị của thứ dùng chung. */
  with: string;
  note: string;
  src: number[];
};
export type DrugEntry = {
  id: string;
  /** Hoạt chất. */
  ingredient: string;
  /** Tên để nhận diện (hoạt chất + tên hay gõ). */
  names: string[];
  /** Nhận diện trong câu (trên chuỗi đã bỏ dấu, chữ thường). */
  match: RegExp;
  /** Nhóm thuốc, nói bằng lời thường. */
  group: string;
  /** Công dụng. */
  uses: DrugFact[];
  /** Tác dụng phụ: mức độ thường gặp + dấu hiệu nặng cần ngưng thuốc / đi cấp cứu. */
  sideEffects: { common: DrugFact[]; serious: DrugFact[] };
  /** Chống chỉ định / trường hợp phải hỏi bác sĩ, dược sĩ trước khi dùng. */
  contraindications: DrugFact[];
  /** Tương tác đã có nguồn — CHỈ những cặp này Lomi mới được nói. */
  interactions: DrugInteraction[];
  /** Uống quá liều. */
  overdose: DrugFact[];
  /** Dùng cho trẻ em. */
  children: DrugFact[];
  sources: DrugSource[];
  /** Ngày đối chiếu lại toàn bộ mục này với nguồn (YYYY-MM-DD). */
  verifiedAt: string;
};

/** Tên miền nguồn được chấp nhận. Thêm tên miền mới phải là cơ quan y tế / thư viện y khoa chính thống. */
export const TRUSTED = [
  "nhs.uk", "medlineplus.gov", "who.int", "fda.gov", "moh.gov.vn", "dav.gov.vn", "cdc.gov",
  // 09/10: mở rộng cho kho kiến thức y khoa (lib/lomiMedData) — cơ quan y tế quốc gia Hoa Kỳ / Anh, hiệp hội tâm lý, bệnh viện học thuật phi lợi nhuận.
  "nih.gov", "cancer.gov", "samhsa.gov", "nice.org.uk", "apa.org", "mayoclinic.org",
];
/** Sau chừng này ngày kể từ `verifiedAt`, lời đáp kèm ghi chú nên kiểm tra lại. */
export const REVIEW_AFTER_DAYS = 365;

export const DRUGS: DrugEntry[] = [
  {
    id: "paracetamol",
    ingredient: "paracetamol (acetaminophen)",
    names: ["paracetamol", "acetaminophen", "Panadol", "Efferalgan", "Hapacol"],
    match: VR(/\b(paracetamol|panadol|efferalgan|hapacol|acetaminophen)\b/),
    group: "thuốc giảm đau, hạ sốt",
    sources: [
      // (09/10/2026: bốn trang con cũ của NHS — About / Side effects / Taking with other medicines / Common questions — nay gộp về một trang này.)
      { title: "Paracetamol for adults", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/paracetamol-for-adults/", reviewed: "2026-03-24" },
      { title: "Acetaminophen", publisher: "MedlinePlus (Thư viện Y khoa Quốc gia Hoa Kỳ)", url: "https://medlineplus.gov/druginfo/meds/a681004.html", reviewed: "2025-10-15" },
    ],
    verifiedAt: "2026-10-09",
    uses: [{ text: "giảm đau mức nhẹ đến vừa và hạ sốt — ví dụ đau đầu, đau răng, đau họng, sưng cứng khớp, triệu chứng cảm cúm", src: [0, 1] }],
    sideEffects: {
      common: [{ text: "Dùng đúng hướng dẫn thì **rất hiếm khi** gây tác dụng phụ.", src: [0] }],
      serious: [
        { text: "Dị ứng nặng: sưng họng hoặc lưỡi, nổi ban gồ và ngứa, khó thở, khó nuốt, khàn tiếng → ngưng thuốc và **gọi 115 / đi cấp cứu**.", src: [0, 1] },
        { text: "Phản ứng da nặng: da phồng rộp hoặc bong tróc, nổi mày đay → ngưng thuốc và đi cấp cứu.", src: [1] },
        { text: "Dấu hiệu gan bị ảnh hưởng: buồn nôn, vàng da hoặc vàng mắt, đau vùng bụng trên, nước tiểu sẫm màu → đi khám ngay.", src: [0, 1] },
        { text: "Dễ bầm tím, chảy máu cam bất thường → đi khám.", src: [0] },
      ],
    },
    contraindications: [
      { text: "Từng dị ứng với paracetamol.", src: [0] },
      { text: "Có bệnh gan hoặc bệnh thận.", src: [0] },
      { text: "Nghiện rượu hoặc thường uống rất nhiều rượu bia.", src: [0, 1] },
      { text: "Người nhẹ cân (dưới 50 kg) có thể cần liều thấp hơn — hỏi dược sĩ / bác sĩ.", src: [0] },
    ],
    interactions: [
      {
        id: "same",
        match: VN(/\b(thuốc cảm|thuốc cúm|thuốc ho)\b/),
        with: "thuốc cảm, thuốc cúm, thuốc ho (nhiều loại cũng chứa paracetamol)",
        note: "Tránh uống cùng lúc với sản phẩm khác **cũng chứa paracetamol** (ví dụ thuốc cảm cúm) — cộng lại có thể thành uống quá nhiều paracetamol, điều này nguy hiểm. Xem dòng thành phần trên hộp trước khi uống.",
        src: [0, 1],
      },
      {
        id: "ibuprofen",
        match: VR(/\bibuprofen\b/),
        with: "ibuprofen",
        note: "Theo nguồn, **người lớn** có thể dùng paracetamol cùng ibuprofen nếu cần; nên thử từng thuốc riêng trước, và dùng mức thấp nhất còn hiệu quả, ngưng khi hết đau. Lưu ý: ibuprofen có những chống chỉ định riêng mà Lomi **chưa có dữ liệu đã kiểm chứng** — phần đó phải hỏi dược sĩ / bác sĩ.",
        src: [0],
      },
      { id: "warfarin", match: VR(/\bwarfarin\b/), with: "warfarin (thuốc chống đông)", note: "Đang dùng warfarin thì phải hỏi bác sĩ / dược sĩ trước khi dùng paracetamol.", src: [0] },
      { id: "antisick", match: VR(/\b(metoclopramide|metoclopramid|domperidone|domperidon)\b/), with: "metoclopramide, domperidone (thuốc chống nôn)", note: "Đang dùng metoclopramide hoặc domperidone thì hỏi bác sĩ / dược sĩ trước khi dùng paracetamol.", src: [0] },
      { id: "flucloxacillin", match: VR(/\bflucloxacillin\b/), with: "flucloxacillin (kháng sinh)", note: "Đang dùng flucloxacillin thì hỏi bác sĩ / dược sĩ trước khi dùng paracetamol.", src: [0] },
      {
        id: "alcohol",
        match: VN(/\b(rượu|bia|nhậu|đồ uống có cồn)\b/),
        with: "rượu bia",
        note: "Theo NHS, khi dùng paracetamol vẫn có thể ăn uống bình thường, kể cả rượu bia. Nhưng người nghiện rượu hoặc hay uống rất nhiều một lần thì paracetamol có thể không phù hợp, và MedlinePlus ghi **không nên dùng** paracetamol nếu ngày nào cũng uống từ 3 ly rượu bia trở lên. Đang uống nhiều thì hỏi dược sĩ / bác sĩ trước.",
        src: [0, 1],
      },
    ],
    overdose: [
      { text: "Uống quá nhiều paracetamol có thể làm **tổn thương gan**, nặng thì nguy hiểm tới tính mạng.", src: [0, 1] },
      { text: "Cần được hỗ trợ y tế **ngay**, kể cả khi chưa thấy triệu chứng gì.", src: [1] },
      { text: "Dấu hiệu có thể gặp: buồn nôn, nôn, đau bụng trên, vã mồ hôi, mệt lả, vàng da hoặc vàng mắt, chảy máu hay bầm tím bất thường.", src: [1] },
      { text: "Mang theo vỏ hộp / tờ hướng dẫn, phần thuốc còn lại và các thuốc khác đang dùng.", src: [0] },
    ],
    children: [
      { text: "Không cho trẻ dùng sản phẩm của người lớn; chọn loại ghi đúng lứa tuổi của trẻ.", src: [1] },
      { text: "Lượng dùng cho trẻ tính theo **cân nặng** (theo bảng trên nhãn); không chắc thì hỏi bác sĩ của trẻ.", src: [1] },
    ],
  },
  {
    // 11/10/2026 — thêm sau khi Lomi đáp sai câu "Uống aspirin để làm gì" (đọc lại bài tăng huyết áp). Mỗi ý đối chiếu với hai trang dưới.
    id: "aspirin",
    ingredient: "aspirin (acid acetylsalicylic)",
    names: ["aspirin", "acid acetylsalicylic"],
    match: VR(/\b(aspirin|aspirine|acid acetylsalicylic|axit acetylsalicylic|acetylsalicylic)\b/),
    group: "thuốc kháng viêm không steroid (NSAID), thuộc nhóm salicylat",
    sources: [
      // (11/10/2026: các trang cũ "aspirin for pain relief" / "low-dose aspirin" của NHS nay gộp về một trang này.)
      { title: "Aspirin: medicine for pain relief or preventing blood clots", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/aspirin/", reviewed: "2026-07-03" },
      { title: "Aspirin", publisher: "MedlinePlus (Thư viện Y khoa Quốc gia Hoa Kỳ)", url: "https://medlineplus.gov/druginfo/meds/a682878.html", reviewed: "2025-11-15" },
    ],
    verifiedAt: "2026-10-11",
    uses: [
      { text: "giảm đau mức nhẹ đến vừa, hạ sốt và giảm viêm (dùng khi cần)", src: [0, 1] },
      { text: "ở liều thấp uống đều hằng ngày, thường là lâu dài, để giảm nguy cơ hình thành cục máu đông — phòng nhồi máu cơ tim và đột quỵ", src: [0, 1] },
    ],
    sideEffects: {
      common: [{ text: "Thường gặp: khó tiêu, đau bụng, ợ nóng, buồn nôn; **dễ chảy máu hơn** bình thường.", src: [0, 1] }],
      serious: [
        { text: "Loét hoặc chảy máu dạ dày: đau bụng, da tái nhợt, nôn ra máu (hoặc chất nôn giống bã cà phê), phân đen như hắc ín hoặc có máu đỏ tươi → liên hệ bác sĩ / đi khám **ngay**.", src: [0, 1] },
        { text: "Dị ứng nặng: sưng họng, lưỡi, môi hoặc mặt, nổi ban gồ và ngứa, khó thở hoặc thở khò khè → **gọi 115 / đi cấp cứu**.", src: [0, 1] },
        { text: "Ù tai hoặc nghe kém đi, tim đập nhanh hoặc thở nhanh, da lạnh và ẩm → báo bác sĩ ngay.", src: [1] },
      ],
    },
    contraindications: [
      { text: "Người dùng là trẻ từ 15 tuổi trở xuống — **không cho trẻ dùng aspirin**, vì hiếm gặp nhưng thuốc có thể gây hội chứng Reye, một tình trạng nặng.", src: [0, 1] },
      { text: "Từng dị ứng hoặc bị tác dụng phụ nặng với aspirin, ibuprofen hay thuốc kháng viêm NSAID khác.", src: [0] },
      { text: "Đang hoặc từng bị loét dạ dày, bị hen suyễn, suy tim, có bệnh gan / thận hoặc rối loạn đông máu.", src: [0, 1] },
      { text: "Đang mang thai hoặc cho con bú — aspirin liều giảm đau không được khuyên dùng khi mang thai.", src: [0] },
      { text: "Sắp phẫu thuật, kể cả phẫu thuật răng miệng.", src: [1] },
      { text: "Ngày nào cũng uống từ ba ly rượu bia trở lên.", src: [1] },
    ],
    interactions: [
      {
        id: "nsaid",
        match: VR(/\b(ibuprofen|naproxen|nsaid|nsaids|khang viem khong steroid)\b/),
        with: "ibuprofen, naproxen và các thuốc kháng viêm NSAID khác",
        note: "NHS xếp các thuốc NSAID khác (như ibuprofen, naproxen) vào nhóm **có thể không hợp** khi dùng cùng aspirin — hỏi bác sĩ / dược sĩ trước. Riêng người đang uống aspirin đều đặn để phòng nhồi máu cơ tim, đột quỵ: MedlinePlus ghi không tự uống ibuprofen để giảm đau, hạ sốt khi chưa hỏi bác sĩ.",
        src: [0, 1],
      },
      { id: "anticoagulant", match: VN(/\b(warfarin|rivaroxaban|xarelto|thuốc chống đông|chống đông máu)\b/), with: "thuốc chống đông (như warfarin, rivaroxaban)", note: "Thuốc chống đông (như warfarin, rivaroxaban) nằm trong nhóm NHS ghi là **có thể không hợp** khi dùng cùng aspirin — phải báo bác sĩ trước khi dùng.", src: [0] },
      { id: "bp", match: VN(/\b(thuốc huyết áp|thuốc hạ huyết áp|thuốc hạ áp|thuốc tăng huyết áp|thuốc cao huyết áp)\b/), with: "thuốc hạ huyết áp", note: "Một số thuốc hạ huyết áp nằm trong nhóm NHS ghi là **có thể không hợp** khi dùng cùng aspirin — đang uống thuốc huyết áp thì báo bác sĩ / dược sĩ trước khi dùng aspirin.", src: [0] },
      { id: "steroid", match: VR(/\b(steroid|steroids|corticoid|corticosteroid)\b/), with: "một số thuốc steroid (corticoid)", note: "Một số thuốc steroid nằm trong nhóm NHS ghi là có thể không hợp khi dùng cùng aspirin — hỏi bác sĩ / dược sĩ trước.", src: [0] },
      { id: "antidepressant", match: VN(/\b(thuốc chống trầm cảm|chống trầm cảm|thuốc trầm cảm|antidepressant)\b/), with: "một số thuốc chống trầm cảm", note: "Một số thuốc chống trầm cảm nằm trong nhóm NHS ghi là có thể không hợp khi dùng cùng aspirin — hỏi bác sĩ / dược sĩ trước.", src: [0] },
      { id: "methotrexate", match: VR(/\bmethotrexat(e)?\b/), with: "methotrexate", note: "Methotrexate nằm trong nhóm NHS ghi là có thể không hợp khi dùng cùng aspirin — phải hỏi bác sĩ trước.", src: [0] },
      {
        id: "paracetamol",
        match: VR(/\b(paracetamol|panadol|efferalgan|hapacol|acetaminophen)\b/),
        with: "paracetamol",
        note: "Theo NHS, **có thể** dùng aspirin cùng lúc với paracetamol nếu cần; nếu chỉ để giảm đau thì nên thử riêng từng thuốc trước. (Người không dùng được aspirin — ví dụ trẻ từ 15 tuổi trở xuống — thì vẫn không dùng.)",
        src: [0],
      },
      {
        id: "alcohol",
        match: VN(/\b(rượu|bia|nhậu|đồ uống có cồn)\b/),
        with: "rượu bia",
        note: "NHS khuyên **hạn chế rượu bia** khi dùng aspirin vì rượu bia làm tăng nguy cơ gặp tác dụng phụ. MedlinePlus ghi: ngày nào cũng uống từ ba ly rượu bia trở lên thì hỏi bác sĩ xem có nên dùng aspirin không.",
        src: [0, 1],
      },
    ],
    overdose: [
      { text: "Uống quá nhiều aspirin **có thể nguy hiểm** — lỡ uống nhiều hơn hướng dẫn trên hộp / trong đơn thì cần hỏi ý kiến y tế ngay.", src: [0] },
      { text: "Dấu hiệu có thể gặp: đau rát họng hoặc dạ dày, nôn, tiểu ít, sốt, bồn chồn, lú lẫn, chóng mặt, nhìn đôi, run, co giật, lơ mơ hoặc bất tỉnh.", src: [1] },
      { text: "Người bị ngã quỵ, co giật, khó thở hoặc gọi không tỉnh → gọi cấp cứu ngay.", src: [1] },
      { text: "Mang theo vỏ hộp / tờ hướng dẫn, phần thuốc còn lại và các thuốc khác đang dùng.", src: [0] },
    ],
    children: [
      { text: "**Không cho trẻ từ 15 tuổi trở xuống dùng aspirin**: hiếm gặp nhưng thuốc có thể gây hội chứng Reye, một tình trạng nặng.", src: [0] },
      { text: "Nguy cơ hội chứng Reye cao hơn khi trẻ đang nhiễm virus như thuỷ đậu hoặc cúm; với thiếu niên cũng phải hỏi bác sĩ trước.", src: [1] },
    ],
  },
  {
    // 18/10/2026 — thêm sau khi Lomi đáp "chưa có kiến thức" cho câu "Đang uống warfarin uống thêm ibuprofen được không?".
    //   Mọi ý chỉ lấy từ trang NHS dưới (đọc ngày 18/10/2026). Trang KHÔNG nói về paracetamol cùng warfarin (bản ghi đó nằm ở mục paracetamol)
    //   và KHÔNG có phần riêng cho trẻ em → `children` để trống.
    id: "warfarin",
    ingredient: "warfarin",
    names: ["warfarin", "thuốc chống đông warfarin"],
    match: VR(/\bwarfarin\b/),
    group: "thuốc chống đông máu (hay gọi là thuốc làm loãng máu)",
    sources: [{ title: "Warfarin", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/warfarin/", reviewed: "2026-02-24" }],
    verifiedAt: "2026-10-18",
    uses: [{ text: "điều trị và phòng ngừa cục máu đông, ví dụ ở người bị rung nhĩ hoặc sau cơn thiếu máu não thoáng qua — chỉ dùng theo đơn bác sĩ", src: [0] }],
    sideEffects: {
      common: [{ text: "Tác dụng phụ chính là **tăng nguy cơ chảy máu**.", src: [0] }],
      serious: [
        { text: "Dấu hiệu chảy máu nặng: tiểu ra máu hoặc đi ngoài ra máu / phân đen, bầm tím hay chảy máu cam không rõ lý do, ho hoặc nôn ra máu → **đi khám ngay**.", src: [0] },
        { text: "Đau đầu dữ dội đột ngột kèm lú lẫn hay yếu người có thể là chảy máu trong não → gọi **115** ngay. Bị va đập vào đầu khi đang dùng warfarin cũng cần đi khám ngay.", src: [0] },
        { text: "Dị ứng nặng: sưng họng hoặc lưỡi, nổi ban gồ ngứa, khó thở → gọi **115** / đi cấp cứu.", src: [0] },
      ],
    },
    contraindications: [
      { text: "Có thể không phù hợp nếu: từng dị ứng warfarin; có bệnh gan hoặc thận; tăng huyết áp; mới bị đột quỵ; mới mổ hoặc sắp mổ; đang mang thai hoặc định có thai; có bệnh dễ chảy máu như loét dạ dày.", src: [0] },
      { text: "Báo bác sĩ **mọi** thuốc, thuốc nam / thảo dược, vitamin và thực phẩm chức năng đang dùng — trước và trong khi dùng warfarin.", src: [0] },
      { text: "Không tự ngưng warfarin khi chưa hỏi bác sĩ.", src: [0] },
    ],
    interactions: [
      {
        id: "nsaid",
        match: VN(/\b(ibuprofen|aspirin|naproxen|diclofenac|nsaid|nsaids|khang viem khong steroid|giam dau khang viem)\b/),
        with: "ibuprofen, aspirin và các thuốc kháng viêm NSAID khác",
        note: "Ibuprofen, aspirin và các thuốc kháng viêm NSAID thuộc nhóm **có thể không hợp** khi đang dùng warfarin — đừng tự uống thêm, phải hỏi bác sĩ trước (warfarin vốn đã làm tăng nguy cơ chảy máu).",
        src: [0],
      },
      {
        id: "other-meds",
        match: VN(/\b(khang sinh|thuoc chong tram cam|thuoc tim|thuoc da day|thuoc chong nam|statin)\b/),
        with: "kháng sinh, thuốc chống trầm cảm, thuốc tim mạch, thuốc dạ dày, thuốc chống nấm, statin",
        note: "Đây là những nhóm thuốc được ghi là **có thể không hợp** với warfarin — hỏi bác sĩ trước khi dùng thêm.",
        src: [0],
      },
      {
        id: "herbal",
        match: VN(/\b(st john|cỏ ban|vitamin k|thuốc nam|thuốc bắc|thảo dược|thực phẩm chức năng)\b/),
        with: "thảo dược, thuốc nam, vitamin K",
        note: "Không dùng cỏ ban (St John's wort) hay viên bổ sung vitamin K. Thuốc nam, thảo dược, thực phẩm chức năng khác thì phải báo bác sĩ trước khi dùng.",
        src: [0],
      },
      {
        id: "alcohol",
        match: VN(/\b(rượu|bia|nhậu|đồ uống có cồn)\b/),
        with: "rượu bia",
        note: "Đang dùng warfarin thì **không uống nhiều rượu bia**.",
        src: [0],
      },
      {
        id: "food",
        match: VN(/\b(nam việt quất|cranberry|bưởi chùm|grapefruit|rau xanh|bông cải|súp lơ xanh|rau bina|cải bó xôi)\b/),
        with: "nước ép nam việt quất, nước bưởi chùm, rau xanh nhiều vitamin K",
        note: "Không uống nước ép nam việt quất (cranberry) hay nước bưởi chùm (grapefruit). Rau lá xanh, bông cải xanh có nhiều vitamin K có thể ảnh hưởng tới thuốc — vẫn ăn được, nhưng hỏi nơi đang theo dõi thuốc cho bạn về cách ăn cho đều.",
        src: [0],
      },
    ],
    overdose: [
      { text: "Uống thêm một liều warfarin **có thể nguy hiểm** — lỡ uống nhiều hơn liều được kê thì hỏi ý kiến y tế ngay.", src: [0] },
    ],
    children: [],
  },
];

/**
 * Các lời dặn về thuốc nằm rải trong phần triệu chứng / tâm sự (không thuộc về một mục thuốc cụ thể) và nguồn đã đối chiếu.
 * Dùng để rà soát: sửa câu chữ ở lib/lomiSymptoms, lib/lomiHeartMore, lib/lomiDrug thì đối chiếu lại với nguồn ở đây.
 */
export const DRUG_CLAIMS: { id: string; claim: string; where: string[]; sources: DrugSource[]; verifiedAt: string }[] = [
  {
    id: "preg-ibuprofen",
    claim: "Khi mang thai nên tránh ibuprofen, trừ khi bác sĩ hoặc dược sĩ khuyên dùng.",
    where: ["lomiDrug: PREG_IBU_TEXT", "lomiMed: withGroupNote (dòng gợi ý ibuprofen khi câu nhắc mang thai)"],
    sources: [{ title: "Ibuprofen for adults", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/ibuprofen-for-adults/", reviewed: "2025-08-27" }],
    verifiedAt: "2026-10-18",
  },
  {
    id: "anticoag-nsaid",
    claim: "Thuốc chống đông (như warfarin, rivaroxaban – Xarelto) có thể không hợp với ibuprofen / thuốc giảm đau kháng viêm NSAID; dấu hiệu chảy máu nặng cần đi khám / gọi cấp cứu.",
    where: ["lomiDrug: ANTICOAG_NSAID_TEXT"],
    sources: [
      { title: "Ibuprofen for adults", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/ibuprofen-for-adults/", reviewed: "2025-08-27" },
      { title: "Rivaroxaban", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/rivaroxaban/", reviewed: "2026-08-05" },
    ],
    verifiedAt: "2026-10-18",
  },
  {
    id: "dengue-nsaid",
    claim: "Bị sốt xuất huyết thì tránh thuốc nhóm NSAID như ibuprofen, aspirin (có thể tăng nguy cơ chảy máu); đau thì có thể dùng paracetamol.",
    where: ["lomiSymptoms: dengue"],
    sources: [{ title: "Dengue and severe dengue", publisher: "WHO", url: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue", reviewed: "2025-08-21" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "decongestant-spray",
    claim: "Thuốc xịt / nhỏ thông mũi co mạch chỉ dùng ngắn ngày (nguồn: không quá 5 ngày mỗi đợt); dùng lâu hơn có thể làm nghẹt nặng thêm.",
    where: ["lomiSymptoms: rhinitis-rebound", "lomiHeartMore: nghẹt mũi kéo dài"],
    sources: [{ title: "Decongestants", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/decongestants/", reviewed: "2022-11-03" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "antibiotic-virus",
    claim: "Kháng sinh không có tác dụng với bệnh do virus như cảm lạnh, cúm và phần lớn các trường hợp ho.",
    where: ["lomiSymptoms: cold / flu / bronchitis", "lomiHeartMore: cảm cúm", "lomiDrug: should"],
    sources: [{ title: "Antibiotics", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/antibiotics/", reviewed: "2022-11-11" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "poison-first-aid",
    claim: "Uống nhầm / quá liều: không tự gây nôn, xin hỗ trợ y tế ngay vì triệu chứng có thể vài giờ đến vài ngày sau mới xuất hiện; mang theo vỏ hộp thuốc.",
    where: ["lomiDrug: overdose", "lomiDrugData: paracetamol.overdose"],
    sources: [{ title: "Poisoning", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/poisoning/", reviewed: "2025-06-12" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "infant-fever",
    claim: "Trẻ dưới 3 tháng sốt từ 38°C trở lên cần được nhân viên y tế đánh giá sớm.",
    where: ["lomiContext: paracetamol.kid", "lomiSymptoms: KID_NOTE"],
    sources: [{ title: "High temperature (fever) in children", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/fever-in-children/", reviewed: "2024-01-03" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "human-meds-pets",
    claim: "Thuốc của người có thể không an toàn, thậm chí gây hại cho chó mèo — phải hỏi bác sĩ thú y trước.",
    where: ["lomiDrug: pet"],
    sources: [{ title: "Get the Facts about Pain Relievers for Pets", publisher: "FDA (Hoa Kỳ)", url: "https://www.fda.gov/animal-veterinary/animal-health-literacy/get-facts-about-pain-relievers-pets", reviewed: "2022-09-29" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "pregnancy-meds",
    claim: "Phần lớn thuốc dùng khi mang thai đi qua nhau thai tới em bé; trước khi dùng bất kỳ thuốc gì phải hỏi dược sĩ / bác sĩ.",
    where: ["lomiDrug: should (mang thai / cho con bú)", "lomiMed: groupNote"],
    sources: [{ title: "Medicines in pregnancy", publisher: "NHS (Anh)", url: "https://www.nhs.uk/pregnancy/keeping-well/medicines/", reviewed: "2022-09-05" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "breastfeeding-meds",
    claim: "Một lượng nhỏ thuốc người mẹ uống có thể qua sữa sang em bé (nguồn: thường rất thấp, rất ít thuốc không an toàn khi cho con bú) — nói với bác sĩ / dược sĩ là mình đang cho con bú trước khi dùng thuốc.",
    where: ["lomiDrug: should (mang thai / cho con bú)", "lomiMed: groupNote"],
    sources: [{ title: "Breastfeeding and medicines", publisher: "NHS (Anh)", url: "https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding-and-lifestyle/medicines/", reviewed: "2026-05-07" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "nsaid-stomach",
    claim: "Thuốc giảm đau nhóm kháng viêm (NSAID) có thể gây khó tiêu, đau dạ dày; nặng thì loét hoặc chảy máu dạ dày.",
    where: ["lomiSymptoms: gastritis (about / avoid)", "lomiSymptoms: hangover (avoid)"],
    sources: [{ title: "NSAIDs", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/nsaids/", reviewed: "2026-04-28" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "painkiller-headache",
    claim: "Dùng thuốc giảm đau quá nhiều là một nguyên nhân thường gặp của đau đầu.",
    where: ["lomiSymptoms: tension / migraine (avoid)", "lomiSymptoms: COMMON_CAUSES.headache"],
    sources: [{ title: "Headaches", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/headaches/", reviewed: "2024-04-17" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "steroid-long",
    claim: "Dùng steroid (corticoid) liều cao hoặc kéo dài có thể làm tăng khả năng gặp tác dụng phụ nặng hơn. (Nguồn nói chung về steroid — không có câu riêng cho thuốc bôi.)",
    where: ["lomiSymptoms: urticaria (avoid — không tự bôi corticoid kéo dài)"],
    sources: [{ title: "Steroids", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/steroids/", reviewed: "2025-06-19" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "antibiotic-resistance",
    claim: "Dùng kháng sinh khi không cần có thể khiến thuốc không còn tác dụng với mình về sau (kháng kháng sinh); tiêu chảy là một tác dụng phụ thường gặp của kháng sinh.",
    where: ["lomiSymptoms: uti (avoid)", "lomiSymptoms: COMMON_CAUSES.diarrhea"],
    sources: [{ title: "Antibiotics", publisher: "NHS (Anh)", url: "https://www.nhs.uk/medicines/antibiotics/", reviewed: "2022-11-11" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "sleeping-pills",
    claim: "Thuốc ngủ có thể gây tác dụng phụ nghiêm trọng và gây lệ thuộc; bác sĩ hiếm khi kê cho mất ngủ. Không uống rượu, trà, cà phê trong ít nhất 6 tiếng trước khi ngủ.",
    where: ["lomiHeart: insomnia (hint thuốc ngủ)", "lomiSymptoms: insomnia / apnea (avoid)"],
    sources: [{ title: "Insomnia", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/insomnia/", reviewed: "2024-03-19" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "iron-absorption",
    claim: "Uống nhiều trà, cà phê làm cơ thể khó hấp thu sắt hơn; viên sắt uống theo lời dặn của bác sĩ và để xa tầm tay trẻ em (quá liều có thể nguy hiểm tính mạng).",
    where: ["lomiSymptoms: anemia (avoid)", "lomiHealthFacts: vitamin"],
    sources: [{ title: "Iron deficiency anaemia", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/iron-deficiency-anaemia/", reviewed: "2024-01-26" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "vitamin-excess",
    claim: "Uống quá nhiều vitamin A hoặc vitamin D có thể gây hại.",
    where: ["lomiHealthFacts: vitamin"],
    sources: [
      { title: "Vitamin A", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-a/", reviewed: "2020-08-03" },
      { title: "Vitamin D", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/", reviewed: "2020-08-03" },
    ],
    verifiedAt: "2026-10-09",
  },
  {
    id: "laxatives",
    claim: "Thuốc nhuận tràng tự mua không dùng quá 7 ngày; dùng quá thường xuyên hoặc quá lâu có thể gây mất nước, tắc ruột, hạ kali máu.",
    where: ["lomiSymptoms: constipation (avoid)"],
    sources: [{ title: "Laxatives", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/laxatives/", reviewed: "2026-04-30" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "ors",
    claim: "Tiêu chảy nên bù nước bằng dung dịch oresol (ORS).",
    where: ["lomiSymptoms: dengue / gastroenteritis (do)", "lomiDiet: tiêu chảy / sốt xuất huyết", "lomiHealthFacts"],
    sources: [{ title: "Diarrhoeal disease", publisher: "WHO", url: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease", reviewed: "2024-03-07" }],
    verifiedAt: "2026-10-09",
  },
  {
    id: "motion-sickness",
    claim: "Say xe: ngồi phía trước, nhìn thẳng vào một điểm cố định như đường chân trời, hít thở không khí thoáng, không đọc hay xem điện thoại; có thể thử gừng.",
    where: ["lomiHealthFacts: carsick"],
    sources: [{ title: "Motion sickness", publisher: "NHS (Anh)", url: "https://www.nhs.uk/conditions/motion-sickness/", reviewed: "2023-06-19" }],
    verifiedAt: "2026-10-09",
  },
];

/**
 * CHƯA XÁC MINH — các lời dặn về thuốc còn nằm trong code mà lần rà soát 09/10/2026 CHƯA tìm được nguồn khớp (hoặc nguồn chỉ khớp một phần).
 * Đây là danh sách việc cần làm, không phải kiến thức: sửa được ý nào thì chuyển ý đó lên DRUG_CLAIMS kèm nguồn; không tìm được nguồn
 * thì bỏ hoặc viết lại ý đó cho đúng điều nguồn nói.
 */
export const DRUG_CLAIMS_UNVERIFIED: { id: string; claim: string; where: string[]; note: string }[] = [
  {
    id: "decongestant-brands",
    claim: "Otilin, Otrivin, Naphazolin là thuốc xịt thông mũi co mạch; dùng lâu gây “nghẹt mũi dội ngược”, lệ thuộc thuốc (viêm mũi do thuốc).",
    where: ["lomiSymptoms: rhinmed", "lomiHeartMore: nasal"],
    note: "Nguồn NHS chỉ xác nhận: thuốc xịt / nhỏ thông mũi không dùng quá 5 ngày mỗi đợt, dùng lâu hơn có thể làm nghẹt nặng thêm. Tên nhãn hàng và các chữ “dội ngược / lệ thuộc / viêm mũi do thuốc” chưa đối chiếu được với nguồn nào.",
  },
  { id: "steroid-eye-drops", claim: "Không tự nhỏ mắt bằng thuốc có corticoid.", where: ["lomiSymptoms: conjunctivitis (avoid)"], note: "Lời dặn thận trọng, chưa có nguồn riêng." },
  { id: "steroid-fungal", claim: "Bôi corticoid lên vùng da nhiễm nấm làm nấm lan rộng.", where: ["(đã gỡ khỏi lomiSymptoms: fungus — chỉ còn lời dặn không tự bôi khi chưa khám)"], note: "Trang NHS về corticoid bôi không nêu ý này → đã bỏ phần giải thích cơ chế." },
  { id: "painkiller-mask", claim: "Tự uống thuốc giảm đau khi đau bụng nghi ruột thừa dễ che triệu chứng.", where: ["(đã gỡ khỏi lomiSymptoms: appendicitis — chỉ còn lời dặn không tự uống rồi chờ)"], note: "Chưa tìm nguồn → đã bỏ phần giải thích." },
  { id: "bp-meds-stop", claim: "Không tự ý ngưng thuốc huyết áp.", where: ["lomiSymptoms: highbp (avoid)", "lomiTarotGate: treatment"], note: "Lời dặn thận trọng (hỏi bác sĩ trước khi ngưng thuốc được kê); chưa gắn nguồn riêng cho thuốc huyết áp." },
  { id: "herbal-liver", claim: "Không tự dùng thuốc nam, thực phẩm chức năng “mát gan” không rõ nguồn gốc.", where: ["lomiSymptoms: liver (avoid)", "lomiDiet"], note: "Lời dặn thận trọng, chưa có nguồn riêng." },
];

const bare = (x: string) => ` ${x.normalize("NFD").replace(VR(/[̀-ͯ]/g), "").replace(VR(/đ/g), "d").replace(VR(/Đ/g), "D").toLowerCase().replace(VR(/[^a-z0-9\s-]/g), " ").replace(/\s+/g, " ").trim()} `;

/** Thuốc có dữ liệu đã kiểm chứng được nhắc trong câu (null nếu không có). */
export function findDrug(text: string): DrugEntry | null {
  const n = bare(text);
  return DRUGS.find((d) => d.match.test(n)) ?? null;
}
/** MỌI thuốc có dữ liệu được nhắc trong câu (câu hỏi dùng chung thường nhắc hai thuốc). */
export function findDrugs(text: string): DrugEntry[] {
  const n = bare(text);
  return DRUGS.filter((d) => d.match.test(n));
}
export const drugById = (id?: string): DrugEntry | null => DRUGS.find((d) => d.id === id) ?? null;

/** Bản ghi tương tác đã có nguồn giữa thuốc `d` và thứ được nhắc trong câu (null = không có bản ghi → KHÔNG được đoán). */
export function findInteraction(d: DrugEntry, text: string): DrugInteraction | null {
  const n = bare(text);
  return d.interactions.find((x) => x.match.test(n)) ?? null;
}

const dmy = (iso: string) => iso.split("-").reverse().join("/");
/** Trả lời câu "có nguồn không / lấy ở đâu ra": liệt kê đầy đủ nguồn (kèm đường dẫn) của một mục thuốc. */
export function sourceList(d: Pick<DrugEntry, "names" | "sources" | "verifiedAt">): string {
  return [
    `Mấy điều Lomi nói về **${d.names[0]}** lấy từ các trang sau (Lomi đối chiếu ngày ${dmy(d.verifiedAt)}):`,
    d.sources.map((s) => `• ${s.publisher} — “${s.title}”${s.reviewed ? ` (trang ghi rà soát ${dmy(s.reviewed)})` : s.updated ? ` (trang cập nhật ${dmy(s.updated)})` : ""}\n  ${s.url}`).join("\n"),
    "Điều gì không có trong các trang đó thì Lomi không nói. Thông tin có thể đã được cập nhật sau ngày Lomi đối chiếu — cần chắc thì hỏi dược sĩ / bác sĩ nha.",
  ].join("\n\n");
}

/** Dòng nguồn đặt cuối lời đáp: tên cơ quan + ngày nguồn rà soát + ngày Lomi đối chiếu. `now` để test. */
export function sourceLine(d: Pick<DrugEntry, "sources" | "verifiedAt">, src: number[], now = Date.now()): string {
  const used = Array.from(new Set(src)).sort((a, b) => a - b).map((i) => d.sources[i]);
  // Mỗi cơ quan một mục, lấy ngày mới nhất; ngày rà soát ghi "rà soát", ngày trang cập nhật (trang không ghi rà soát) ghi "cập nhật".
  const byPub = new Map<string, { d?: string; kind: "rà soát" | "cập nhật" }>();
  for (const s of used) {
    const prev = byPub.get(s.publisher);
    const cur = s.reviewed ? { d: s.reviewed, kind: "rà soát" as const } : s.updated ? { d: s.updated, kind: "cập nhật" as const } : { kind: "rà soát" as const };
    byPub.set(s.publisher, prev?.d && (!cur.d || prev.d > cur.d) ? prev : cur.d ? cur : (prev ?? cur));
  }
  const list = [...byPub.entries()].map(([p, r]) => (r.d ? `${p}, ${r.kind} ${dmy(r.d)}` : p)).join(" · ");
  const stale = (now - Date.parse(d.verifiedAt)) / 86_400_000 > REVIEW_AFTER_DAYS;
  return `📚 Nguồn: ${list}. Lomi đối chiếu ngày ${dmy(d.verifiedAt)}${stale ? " — đã hơn một năm, bạn nên hỏi lại dược sĩ / bác sĩ để có thông tin mới nhất" : ""}. Đây là kiến thức tham khảo chung, không thay lời dặn của bác sĩ / dược sĩ.`;
}

const srcOf = (...groups: { src: number[] }[][]) => groups.flat().flatMap((f) => f.src);
const bullets = (fs: DrugFact[]) => fs.map((f) => `• ${f.text}`).join("\n");

export type DrugAspect = "info" | "side" | "caution" | "overdose" | "children" | "interactions";
/** Lời đáp về MỘT khía cạnh của một thuốc đã kiểm chứng — ghép hoàn toàn từ dữ liệu có nguồn, kèm dòng nguồn. */
export function renderDrug(d: DrugEntry, aspect: DrugAspect, now = Date.now()): string {
  const name = `**${d.names[0].charAt(0).toUpperCase()}${d.names[0].slice(1)}**`;
  const brands = d.names.slice(2);
  if (aspect === "side")
    return [`💊 Tác dụng phụ của ${name}:`, bullets(d.sideEffects.common), `Dấu hiệu nặng cần xử trí ngay:\n${bullets(d.sideEffects.serious)}`, sourceLine(d, srcOf(d.sideEffects.common, d.sideEffects.serious), now)].join("\n\n");
  if (aspect === "caution")
    return [`💊 Những trường hợp cần hỏi bác sĩ / dược sĩ **trước khi** dùng ${name}:`, bullets(d.contraindications), sourceLine(d, srcOf(d.contraindications), now)].join("\n\n");
  if (aspect === "overdose")
    return [`⚠️ Uống quá nhiều ${name} thì **gọi 115 hoặc tới cơ sở y tế gần nhất ngay**, đừng chờ xem có sao không.`, bullets(d.overdose), sourceLine(d, srcOf(d.overdose), now)].join("\n\n");
  if (aspect === "children")
    return [`👶 Về ${name} cho trẻ em:`, d.children.length ? bullets(d.children) : "Nguồn Lomi đã đối chiếu **không có hướng dẫn riêng cho trẻ em** với thuốc này.", "Lomi không đưa con số liều — bạn hỏi dược sĩ / bác sĩ kèm tuổi và cân nặng của bé nha.", sourceLine(d, srcOf(d.children), now)].join("\n\n");
  if (aspect === "interactions")
    return [
      `💊 Về việc dùng ${name} chung với thuốc khác, Lomi chỉ có dữ liệu đã kiểm chứng cho mấy trường hợp sau:`,
      d.interactions.map((x) => `• **${x.with}:** ${x.note}`).join("\n"),
      "Thuốc nào không có trong danh sách trên thì Lomi **chưa xác minh được** — đừng hiểu là dùng chung an toàn; bạn hỏi dược sĩ nha.",
      sourceLine(d, d.interactions.flatMap((x) => x.src), now),
    ].join("\n\n");
  // info: là thuốc gì + tác dụng phụ + quá liều + ai cần hỏi trước.
  const same = d.interactions.find((x) => x.id === "same");
  return [
    `💊 ${name}${brands.length ? ` (${brands.join(", ")}…)` : ""} là ${d.group}, dùng để ${d.uses.map((u) => u.text).join("; ")}.`,
    `${bullets([...d.sideEffects.common, ...d.sideEffects.serious.slice(0, 2)])}\n• Quá liều: ${d.overdose[0].text}${same ? ` ${same.note}` : ""}`,
    `Nên hỏi bác sĩ / dược sĩ trước nếu: ${d.contraindications.slice(0, 3).map((c) => c.text.replace(/\.$/, "").replace(/^./, (x) => x.toLowerCase())).join("; ")}.`,
    sourceLine(d, [...srcOf(d.uses, d.sideEffects.common, d.sideEffects.serious.slice(0, 2), d.overdose.slice(0, 1), d.contraindications.slice(0, 3)), ...(same?.src ?? [])], now),
  ].join("\n\n");
}
