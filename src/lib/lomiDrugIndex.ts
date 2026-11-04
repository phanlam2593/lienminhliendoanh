// ─────────────────────────────────────────────────────────────────────────────
// 04/11 (Kir: "a muốn lomi trả lời đc tất cả loại thuốc") — DANH MỤC TÊN THUỐC hay gặp ở Việt Nam: tên biệt dược / tên gõ sai → hoạt chất
// + NHÓM thuốc. Mỗi nhóm có vài ý CÓ NGUỒN (trang thuốc của NHS) về cách dùng, tác dụng phụ, lưu ý — chạy trên máy, không gọi AI.
//
// Nguyên tắc (giống lib/lomiDrugData):
//   • Không nêu liều (số viên, mg, số lần). Liều theo tuổi, cân nặng, bệnh nền → tờ hướng dẫn / dược sĩ / bác sĩ.
//   • Ý nào cũng trỏ tới nguồn của nhóm. Thuốc chỉ biết TÊN mà nhóm không có ý riêng → nói rõ là thuốc gì, thuộc nhóm nào,
//     rồi chỉ cách hỏi đúng chỗ (đơn thuốc, tờ hướng dẫn, dược sĩ) — không đoán công dụng, không đoán cách uống.
//   • Tên biệt dược chỉ để NHẬN RA thuốc người dùng nói tới, không phải khuyến nghị nhãn hàng.
// Thêm thuốc mới = thêm một dòng vào MEDS (tên gõ không dấu, chữ thường); thêm ý = thêm vào nhóm, kèm nguồn đã đọc.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { sourceLine, type DrugFact, type DrugSource } from "@/lib/lomiDrugData";

type GroupId = "pain" | "nsaid" | "abx" | "antihis" | "ppi" | "vitb" | "mucus" | "cold" | "rx" | "steroid" | "gi" | "other";
type Group = {
  label: string;
  how?: DrugFact[];
  side?: DrugFact[];
  care?: DrugFact[];
  sources: DrugSource[];
};
export type IndexedDrug = {
  id: string;
  /** Tên hiển thị của hoạt chất. */
  ingredient: string;
  /** Tên gõ được (không dấu, chữ thường) — tên biệt dược trước, hoạt chất sau. */
  names: string[];
  group: GroupId;
  /** Cách dùng riêng của đúng hoạt chất này (trang NHS của nó). */
  how?: DrugFact[];
  side?: DrugFact[];
  care?: DrugFact[];
  sources?: DrugSource[];
  /** Thuốc gây buồn ngủ hay không (chỉ ghi khi nguồn nói rõ). */
  drowsy?: boolean;
};

const NHS = "NHS (Anh)";
const S = {
  para: { title: "How and when to take paracetamol for adults", publisher: NHS, url: "https://www.nhs.uk/medicines/paracetamol-for-adults/how-and-when-to-take-paracetamol-for-adults/", reviewed: "2026-03-24" },
  ibu: { title: "How and when to take ibuprofen", publisher: NHS, url: "https://www.nhs.uk/medicines/ibuprofen-for-adults/how-and-when-to-take-ibuprofen/", reviewed: "2025-08-27" },
  abx: { title: "Antibiotics", publisher: NHS, url: "https://www.nhs.uk/conditions/antibiotics/", reviewed: "2022-11-11" },
  amox: { title: "How and when to take amoxicillin", publisher: NHS, url: "https://www.nhs.uk/medicines/amoxicillin/how-and-when-to-take-amoxicillin/", reviewed: "2025-06-02" },
  ah: { title: "Antihistamines", publisher: NHS, url: "https://www.nhs.uk/conditions/antihistamines/", reviewed: "2023-05-16" },
  ome: { title: "How and when to take omeprazole", publisher: NHS, url: "https://www.nhs.uk/medicines/omeprazole/how-and-when-to-take-omeprazole/", reviewed: "2025-09-17" },
  vitb: { title: "Vitamins and minerals – B vitamins and folic acid", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-b/", reviewed: "2020-08-03" },
  cough: { title: "Cough", publisher: NHS, url: "https://www.nhs.uk/conditions/cough/", reviewed: "2023-12-08" },
  coughMp: { title: "Cough", publisher: "MedlinePlus (NIH, Hoa Kỳ)", url: "https://medlineplus.gov/cough.html", reviewed: "2025-03-18" },
} satisfies Record<string, DrugSource>;
const VERIFIED = "2026-11-04";

const GROUPS: Record<GroupId, Group> = {
  pain: {
    label: "thuốc giảm đau, hạ sốt",
    how: [
      { text: "Uống **lúc no hay lúc đói đều được**; viên nén nuốt nguyên với nước, viên sủi thì hoà tan trong nước rồi uống.", src: [0] },
      { text: "**Đừng uống cùng lúc với thuốc khác cũng có paracetamol** — nhiều thuốc cảm, thuốc cúm có sẵn paracetamol, uống chung dễ quá liều.", src: [0] },
      { text: "Không tự dùng kéo dài quá số ngày ghi trên hộp / tờ hướng dẫn nếu bác sĩ không dặn — đau, sốt không đỡ thì đi khám.", src: [0] },
    ],
    sources: [S.para],
  },
  nsaid: {
    label: "thuốc giảm đau, kháng viêm nhóm NSAID",
    how: [
      { text: "Viên uống: nuốt nguyên với nước, **nên uống trong hoặc sau bữa ăn**.", src: [0] },
      { text: "**Không dùng cùng lúc với thuốc NSAID khác** (như naproxen, aspirin).", src: [0] },
      { text: "Dạng gel / xịt: bôi lên chỗ đau rồi xoa nhẹ cho thấm.", src: [0] },
      { text: "Đau nặng hơn hoặc không đỡ thì đi khám; không tự uống kéo dài quá số ngày trên tờ hướng dẫn nếu bác sĩ không dặn.", src: [0] },
    ],
    sources: [S.ibu],
  },
  abx: {
    label: "kháng sinh (thuốc kê đơn)",
    how: [
      { text: "Uống **đúng như đơn bác sĩ / tờ hướng dẫn** ghi; **chỉ uống kháng sinh kê cho chính mình** — đừng mượn của người khác.", src: [0] },
      { text: "Quên một liều: thường uống ngay khi nhớ ra; **không uống gấp đôi** để bù.", src: [0] },
      { text: "Kháng sinh **không trị** bệnh do virus như cảm lạnh, cúm và phần lớn các cơn ho.", src: [0] },
    ],
    side: [{ text: "Hay gặp: buồn nôn, nôn, đầy bụng, khó tiêu, tiêu chảy.", src: [0] }],
    care: [{ text: "Một số kháng sinh **không hợp với rượu bia, thuốc tránh thai** — hỏi dược sĩ khi nhận thuốc.", src: [0] }],
    sources: [S.abx],
  },
  antihis: {
    label: "thuốc chống dị ứng (kháng histamin)",
    how: [{ text: "Dùng cho triệu chứng dị ứng (viêm mũi dị ứng, mề đay, ngứa, côn trùng cắn…); loại nào, uống ra sao thì theo tờ hướng dẫn.", src: [0] }],
    side: [{ text: "Loại **gây buồn ngủ** làm buồn ngủ, chậm phản xạ, kém phối hợp và phán đoán — **đừng lái xe, vận hành máy** sau khi uống.", src: [0] }],
    care: [
      { text: "Tránh uống rượu bia khi đang dùng, nhất là loại gây buồn ngủ.", src: [0] },
      { text: "**Bà bầu, mẹ cho con bú, trẻ nhỏ**: hỏi dược sĩ / bác sĩ trước.", src: [0] },
    ],
    sources: [S.ah],
  },
  ppi: {
    label: "thuốc giảm tiết acid dạ dày (nhóm ức chế bơm proton)",
    how: [
      { text: "Uống **cùng giờ mỗi ngày** (ngày một lần thì buổi sáng; ngày hai lần thì sáng và tối); **lúc no hay đói đều được**.", src: [0] },
      { text: "Nuốt nguyên viên với nước — viên ghi \"bao tan trong ruột\" / \"gastro-resistant\" thì **không nhai, không nghiền**.", src: [0] },
      { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau; **không uống 2 liều cùng lúc** để bù.", src: [0] },
      { text: "Có người chỉ cần vài ngày, có người phải dùng nhiều tuần, nhiều tháng — theo bác sĩ dặn.", src: [0] },
    ],
    sources: [S.ome],
  },
  vitb: {
    label: "vitamin nhóm B",
    how: [{ text: "Phần lớn người ăn uống đa dạng (thịt, cá, trứng, sữa, đậu, ngũ cốc nguyên hạt, rau quả) là **đủ vitamin B**; người ăn thuần chay dễ thiếu **B12**.", src: [0] }],
    side: [
      { text: "Uống **B6 liều cao kéo dài** có thể gây **tê, mất cảm giác ở tay chân** — đừng tự uống liều cao, theo đúng tờ hướng dẫn.", src: [0] },
      { text: "**Niacin (vitamin PP / B3)** liều cao có thể gây đỏ bừng da; dùng liều cao lâu dài có thể hại gan.", src: [0] },
    ],
    sources: [S.vitb],
  },
  mucus: {
    label: "thuốc ho / long đờm",
    how: [
      { text: "Thuốc ho, siro ho **không chữa dứt cơn ho** nhưng có thể giảm số lần ho — hỏi **dược sĩ** để chọn đúng loại.", src: [0] },
      { text: "Nghỉ ngơi, uống nhiều nước vẫn là chính; ho thường tự hết sau vài tuần.", src: [0] },
    ],
    care: [
      { text: "**Trẻ dưới 4 tuổi không nên dùng thuốc ho**; trẻ lớn hơn phải đọc kỹ nhãn.", src: [1] },
      { text: "Đi khám nếu ho quá 3 tuần, ho ra máu, khó thở, đau ngực.", src: [0] },
    ],
    sources: [S.cough, S.coughMp],
  },
  cold: {
    label: "thuốc cảm phối hợp (thường có paracetamol)",
    how: [{ text: "**Đừng uống chung với thuốc khác cũng có paracetamol** (Panadol, Hapacol, Efferalgan…) — dễ quá liều paracetamol mà không biết.", src: [0] }],
    sources: [S.para],
  },
  rx: { label: "thuốc kê đơn dùng theo chỉ định bác sĩ", sources: [] },
  steroid: { label: "thuốc corticoid (kê đơn)", sources: [] },
  gi: { label: "thuốc tiêu hoá", sources: [] },
  other: { label: "thuốc", sources: [] },
};

const AMOX: DrugFact[] = [
  { text: "Uống **trước hay sau bữa ăn đều được**; cố **chia các liều đều nhau** trong ngày.", src: [0] },
  { text: "**Uống hết đợt** bác sĩ kê, kể cả khi đã thấy đỡ.", src: [0] },
  { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau.", src: [0] },
];

// id · hoạt chất · nhóm · tên (không dấu) — tên biệt dược hay gặp ở Việt Nam
const row = (id: string, ingredient: string, group: GroupId, names: string[], extra: Partial<IndexedDrug> = {}): IndexedDrug => ({ id, ingredient, group, names, ...extra });
export const MEDS: IndexedDrug[] = [
  row("paracetamol", "paracetamol (acetaminophen)", "pain", ["panadol", "efferalgan", "hapacol", "tylenol", "partamol", "paracetamol", "acetaminophen", "para"]),
  row("ibuprofen", "ibuprofen", "nsaid", ["advil", "nurofen", "gofen", "ibuprofen", "ibuprophen"]),
  row("ibu-para", "ibuprofen + paracetamol", "nsaid", ["alaxan"]),
  row("diclofenac", "diclofenac", "nsaid", ["voltaren", "diclofenac", "diclofenak"]),
  row("meloxicam", "meloxicam", "nsaid", ["mobic", "meloxicam"]),
  row("celecoxib", "celecoxib", "nsaid", ["celebrex", "celecoxib"]),
  row("naproxen", "naproxen", "nsaid", ["naproxen"]),
  row("amoxicillin", "amoxicillin", "abx", ["amoxicillin", "amoxicilin", "amoxil", "clamoxyl", "amoxycillin"], { how: AMOX, sources: [S.amox] }),
  row("amox-clav", "amoxicillin + acid clavulanic", "abx", ["augmentin", "klamentin", "curam", "amoxiclav"]),
  row("cefuroxime", "cefuroxime", "abx", ["zinnat", "cefuroxime", "cefuroxim"]),
  row("cefixime", "cefixime", "abx", ["cefixime", "cefixim"]),
  row("cefalexin", "cefalexin (cephalexin)", "abx", ["cefalexin", "cephalexin"]),
  row("cefadroxil", "cefadroxil", "abx", ["cefadroxil"]),
  row("azithromycin", "azithromycin", "abx", ["zithromax", "azithromycin", "azithromycine", "azicine"]),
  row("clarithromycin", "clarithromycin", "abx", ["klacid", "clarithromycin"]),
  row("ciprofloxacin", "ciprofloxacin", "abx", ["ciprofloxacin", "ciprobay"]),
  row("levofloxacin", "levofloxacin", "abx", ["levofloxacin", "tavanic"]),
  row("metronidazole", "metronidazole", "abx", ["flagyl", "metronidazole", "metronidazol"]),
  row("doxycycline", "doxycycline", "abx", ["doxycycline", "doxycyclin"]),
  row("cetirizine", "cetirizine", "antihis", ["zyrtec", "cetirizine", "cetirizin"], { drowsy: false }),
  row("loratadine", "loratadine", "antihis", ["clarityne", "loratadine", "loratadin"], { drowsy: false }),
  row("fexofenadine", "fexofenadine", "antihis", ["telfast", "fexofenadine", "fexofenadin"], { drowsy: false }),
  row("desloratadine", "desloratadine", "antihis", ["aerius", "desloratadine", "desloratadin"]),
  row("chlorphenamine", "chlorphenamine (clorpheniramin)", "antihis", ["chlorphenamine", "chlorpheniramine", "clorpheniramin", "clorpheniramine", "chlorpheniramin", "piriton"], { drowsy: true }),
  row("promethazine", "promethazine", "antihis", ["phenergan", "promethazine", "promethazin"], { drowsy: true }),
  row("diphenhydramine", "diphenhydramine", "antihis", ["diphenhydramine", "diphenhydramin"], { drowsy: true }),
  row("cinnarizine", "cinnarizine", "antihis", ["stugeron", "cinnarizine", "cinnarizin"], { drowsy: true }),
  row("omeprazole", "omeprazole", "ppi", ["losec", "omeprazole", "omeprazol"]),
  row("esomeprazole", "esomeprazole", "ppi", ["nexium", "esomeprazole", "esomeprazol"]),
  row("pantoprazole", "pantoprazole", "ppi", ["pantoloc", "pantoprazole", "pantoprazol"]),
  row("lansoprazole", "lansoprazole", "ppi", ["lansoprazole", "lansoprazol"]),
  row("rabeprazole", "rabeprazole", "ppi", ["pariet", "rabeprazole", "rabeprazol"]),
  row("vit-b", "vitamin nhóm B tổng hợp", "vitb", ["beplex", "becozyme", "vitamin b complex", "b complex", "vitamin 3b", "3b"]),
  row("neurobion", "vitamin B1 + B6 + B12", "vitb", ["neurobion", "scanneuron"]),
  row("magne-b6", "magnesi + vitamin B6", "vitb", ["magne b6", "magneb6", "magnesium b6"]),
  row("ambroxol", "ambroxol", "mucus", ["mucosolvan", "ambroxol", "ambroxon", "halixol"]),
  row("bromhexine", "bromhexine", "mucus", ["bisolvon", "bromhexine", "bromhexin"]),
  row("acetylcysteine", "acetylcysteine", "mucus", ["acemuc", "acetylcysteine", "acetylcystein", "acc 200"]),
  row("carbocisteine", "carbocisteine", "mucus", ["carbocisteine", "carbocistein", "rhinathiol"]),
  row("decolgen", "paracetamol + thuốc thông mũi + thuốc chống dị ứng", "cold", ["decolgen", "tiffy", "coldacmin", "rhumenol", "panadol cam cum"]),
  row("prednisolone", "prednisolone", "steroid", ["prednisolone", "prednisolon"]),
  row("methylprednisolone", "methylprednisolone", "steroid", ["medrol", "methylprednisolone", "methylprednisolon", "menison"]),
  row("dexamethasone", "dexamethasone", "steroid", ["dexamethasone", "dexamethason"]),
  row("amlodipine", "amlodipine (thuốc huyết áp)", "rx", ["amlor", "amlodipine", "amlodipin"]),
  row("losartan", "losartan (thuốc huyết áp)", "rx", ["cozaar", "losartan"]),
  row("perindopril", "perindopril (thuốc huyết áp)", "rx", ["coversyl", "perindopril"]),
  row("bisoprolol", "bisoprolol (thuốc tim mạch, huyết áp)", "rx", ["concor", "bisoprolol"]),
  row("metformin", "metformin (thuốc tiểu đường)", "rx", ["glucophage", "metformin"]),
  row("gliclazide", "gliclazide (thuốc tiểu đường)", "rx", ["diamicron", "gliclazide", "gliclazid"]),
  row("atorvastatin", "atorvastatin (thuốc mỡ máu)", "rx", ["lipitor", "atorvastatin"]),
  row("rosuvastatin", "rosuvastatin (thuốc mỡ máu)", "rx", ["crestor", "rosuvastatin"]),
  row("clopidogrel", "clopidogrel (thuốc chống kết tập tiểu cầu)", "rx", ["plavix", "clopidogrel"]),
  row("domperidone", "domperidone (thuốc chống nôn)", "gi", ["motilium", "domperidone", "domperidon"]),
  row("loperamide", "loperamide (thuốc cầm tiêu chảy)", "gi", ["imodium", "loperamide", "loperamid"]),
  row("diosmectite", "diosmectite", "gi", ["smecta", "diosmectite", "diosmectit"]),
  row("drotaverine", "drotaverine (thuốc chống co thắt)", "gi", ["no spa", "nospa", "drotaverine", "drotaverin"]),
  row("simethicone", "simethicone (thuốc giảm đầy hơi)", "gi", ["air x", "simethicone", "simethicon"]),
];

// Tên → mục (đã bỏ dấu); tên nhiều chữ khớp trước tên ngắn.
const BY_NAME = MEDS.flatMap((m) => m.names.map((n) => ({ n, m }))).sort((a, b) => b.n.length - a.n.length);
// Tên ngắn dễ trùng chữ thường ("para", "3b") chỉ nhận khi câu có chữ "thuốc" / "viên" / "uống".
const SHORT = new Set(["para", "3b"]);

function edit(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Thuốc trong danh mục được nhắc trong câu. `typed` = chữ người dùng gõ (khác tên chuẩn khi gõ sai / tên biệt dược). */
export function findIndexedDrug(text: string): { drug: IndexedDrug; typed: string; fuzzy: boolean; brand: string } | null {
  const n = ` ${normalizeVi(text).replace(/[-–]/g, " ")} `;
  const medCtx = /\b(thuoc|vien|uong|siro|goi|ong)\b/.test(n);
  for (const { n: name, m } of BY_NAME) {
    if (SHORT.has(name) && !medCtx) continue;
    if (n.includes(` ${name} `)) return { drug: m, typed: name, fuzzy: false, brand: name };
  }
  // gõ sai một, hai chữ cái ("paradol" → panadol, "amoxicilin" → amoxicillin): chỉ với chữ ngoại lai dài ≥ 6, đứng cạnh chữ "thuốc" / "uống"
  //   hoặc đứng đầu câu hỏi về thuốc
  const words = n.trim().split(" ").filter((w) => /^[a-z][a-z0-9]{5,}$/.test(w));
  for (const w of words) {
    let best: { m: IndexedDrug; name: string; d: number } | null = null;
    for (const { n: name, m } of BY_NAME) {
      if (name.includes(" ") || name.length < 6) continue;
      const max = name.length >= 9 ? 2 : 1;
      const d = edit(w, name, max);
      if (d <= max && (!best || d < best.d)) best = { m, name, d };
    }
    if (best && (medCtx || /\b(la gi|tri gi|chua gi|tac dung|lam sao|the nao|cach dung)\b/.test(n))) return { drug: best.m, typed: w, fuzzy: true, brand: best.name };
  }
  return null;
}

export type IndexAspect = "how" | "what" | "side";
const bl = (xs: DrugFact[]) => xs.map((x) => `• ${x.text}`).join("\n");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Lời đáp cho thuốc trong danh mục. */
export function renderIndexed(hit: { drug: IndexedDrug; typed: string; fuzzy: boolean; brand: string }, aspect: IndexAspect, now = Date.now()): string {
  const { drug: d } = hit;
  const g = GROUPS[d.group];
  const shownBrand = cap(hit.brand);
  const ing0 = normalizeVi(d.ingredient).split(/[\s(+]/)[0];
  const isIngredient = normalizeVi(d.ingredient).startsWith(hit.brand) || edit(hit.brand, ing0, 2) <= 2;
  const head = `💊 ${hit.fuzzy ? `Lomi hiểu là **${shownBrand}** nha (bạn gõ “${hit.typed}”). ` : ""}**${isIngredient ? cap(d.ingredient) : shownBrand}**${isIngredient ? "" : ` — hoạt chất **${d.ingredient}**`}, thuộc nhóm **${g.label}**.`;
  // ý riêng của hoạt chất ưu tiên hơn ý chung của nhóm
  const own = d.how && d.sources ? { how: d.how, srcs: d.sources } : null;
  const parts: string[] = [head];
  let src: { sources: DrugSource[]; verifiedAt: string } | null = null;
  let used: number[] = [];
  if (aspect === "side") {
    const s = [...(d.side ?? []), ...(g.side ?? [])];
    const dz = d.drowsy === true ? "Đây là loại **gây buồn ngủ**." : d.drowsy === false ? "Đây thuộc loại **ít gây buồn ngủ** (non-drowsy) theo nguồn — vẫn có người bị, uống lần đầu nên để ý." : "";
    if (s.length || dz) {
      parts.push(`⚠️ **Tác dụng phụ / lưu ý theo nguồn:**\n${dz ? `• ${dz}\n` : ""}${bl(s)}${g.care?.length ? `\n${bl(g.care)}` : ""}`.replace(/\n$/, ""));
      src = { sources: g.sources, verifiedAt: VERIFIED };
      used = [...s, ...(g.care ?? [])].flatMap((x) => x.src);
      if (dz && !used.length) used = [0];
    } else parts.push("Lomi **chưa có dữ liệu tác dụng phụ** có nguồn cho riêng thuốc này — tờ hướng dẫn trong hộp có mục tác dụng phụ; thấy bất thường thì ngưng và hỏi dược sĩ / bác sĩ.");
  } else {
    const how = own?.how ?? g.how ?? [];
    if (how.length) {
      parts.push(`📋 **Cách dùng chung theo nguồn:**\n${bl(how)}`);
      src = { sources: own?.srcs ?? g.sources, verifiedAt: VERIFIED };
      used = how.flatMap((x) => x.src);
      if (own && g.how?.length && d.group === "abx") parts.push(`💡 **Với mọi kháng sinh:**\n${bl(g.how.slice(0, 2))}`);
    } else if (d.group === "rx" || d.group === "steroid")
      parts.push("Đây là **thuốc kê đơn** — uống đúng giờ, đúng liều như đơn bác sĩ ghi; muốn ngưng, đổi liều hay quên liều thì hỏi lại bác sĩ / dược sĩ đã kê, **đừng tự ngưng**.");
    else parts.push("Lomi **chưa có hướng dẫn cách dùng** có nguồn cho riêng thuốc này — cách uống (trước / sau ăn, mấy lần) xem **tờ hướng dẫn trong hộp** hoặc hỏi **dược sĩ** lúc mua.");
    if (g.care?.length && aspect === "how") parts.push(`⚠️ **Lưu ý:**\n${bl(g.care)}`);
  }
  parts.push("🚫 Lomi **không nêu liều** (số viên, mg, mấy lần) — liều tuỳ tuổi, cân nặng, bệnh nền: làm theo đơn bác sĩ / tờ hướng dẫn, hoặc hỏi dược sĩ. Đang mang thai, cho con bú, cho trẻ nhỏ dùng thì hỏi trước nha.");
  if (src && used.length) {
    // nguồn: ý chung của nhóm (kháng sinh) trỏ vào nguồn của nhóm — gộp cả hai danh sách nguồn khi có ý riêng
    const all = own && d.group === "abx" ? { sources: [...own.srcs, ...g.sources], verifiedAt: VERIFIED } : src;
    parts.push(sourceLine(all, all.sources.map((_, i) => i), now));
  }
  return parts.join("\n\n");
}

/** "decolgen uống chung panadol được không" — hai thuốc trong câu cùng có paracetamol → cảnh báo uống trùng (trang NHS paracetamol). */
export function paraDupReply(text: string, now = Date.now()): string | null {
  const n = ` ${normalizeVi(text).replace(/[-–]/g, " ")} `;
  const hits = new Map<string, string>();
  for (const { n: name, m } of BY_NAME) if (["paracetamol", "ibu-para", "decolgen"].includes(m.id) && !SHORT.has(name) && n.includes(` ${name} `) && ![...hits.keys()].some((k) => k.includes(name))) hits.set(name, m.id);
  if (hits.size < 2 || !/\b(chung|cung luc|cung voi|voi|them|ket hop)\b/.test(n)) return null;
  const names = [...hits.keys()].map(cap);
  const g = GROUPS.pain;
  return [
    `⚠️ **${names.join("** và **")}** đều **có paracetamol** — uống chung là dễ **quá liều paracetamol** mà không biết, nên **đừng uống cùng lúc** nha.`,
    `• ${g.how![1].text}`,
    "• Muốn đỡ triệu chứng cảm thì chọn **một** loại thôi; hỏi **dược sĩ** nếu chưa chắc thuốc nào có paracetamol (xem mục thành phần trên hộp).",
    "🚨 Lỡ uống quá nhiều paracetamol thì cần hỗ trợ y tế **ngay** (gọi **115** / tới cấp cứu), **kể cả khi chưa thấy triệu chứng gì** — quá liều có thể làm tổn thương gan.",
    sourceLine({ sources: g.sources, verifiedAt: VERIFIED }, [0], now),
  ].join("\n\n");
}

/** Thuốc / nhóm có ý tác dụng phụ có nguồn để trả lời không. */
export const hasSideFacts = (d: IndexedDrug): boolean => !!(d.side?.length || GROUPS[d.group].side?.length || d.drowsy !== undefined);
