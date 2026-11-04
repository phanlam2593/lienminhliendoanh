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

type GroupId = "pain" | "nsaid" | "abx" | "antihis" | "ppi" | "vitb" | "mucus" | "cold" | "rx" | "steroid" | "gi" | "skin" | "eye" | "nose" | "inhaler" | "worm" | "supp" | "coughrx" | "other";
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
  /** 04/11 (Kir: "liều dùng hay hướng dẫn sử dụng gì cũng thêm vào để ngta đọc tham khảo") — liều THAM KHẢO đúng như trang NHS ghi
   *  (src trỏ vào `sources` của thuốc). kid: chỉ khi nguồn ghi rõ theo tuổi; không có thì nhắc xem nhãn / hỏi dược sĩ. */
  dose?: { adult: DrugFact[]; kid?: DrugFact[]; rx?: boolean };
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
  paraMain: { title: "Paracetamol for adults", publisher: NHS, url: "https://www.nhs.uk/medicines/paracetamol-for-adults/", reviewed: "2026-03-24" },
  cet: { title: "How and when to take cetirizine", publisher: NHS, url: "https://www.nhs.uk/medicines/cetirizine/how-and-when-to-take-cetirizine/", reviewed: "2025-02-18" },
  lor: { title: "How and when to take loratadine", publisher: NHS, url: "https://www.nhs.uk/medicines/loratadine/how-and-when-to-take-loratadine/", reviewed: "2025-04-22" },
  chlor: { title: "How and when to take chlorphenamine", publisher: NHS, url: "https://www.nhs.uk/medicines/chlorphenamine-including-piriton/how-and-when-to-take-chlorphenamine/", reviewed: "2025-05-14" },
  dom: { title: "How and when to take domperidone", publisher: NHS, url: "https://www.nhs.uk/medicines/domperidone/how-and-when-to-take-domperidone/", reviewed: "2023-04-06" },
  met: { title: "How and when to take metformin", publisher: NHS, url: "https://www.nhs.uk/medicines/metformin/how-and-when-to-take-metformin/", reviewed: "2026-08-05" },
  aml: { title: "How and when to take amlodipine", publisher: NHS, url: "https://www.nhs.uk/medicines/amlodipine/how-and-when-to-take-amlodipine/", reviewed: "2026-06-09" },
  ator: { title: "How and when to take atorvastatin", publisher: NHS, url: "https://www.nhs.uk/medicines/atorvastatin/how-and-when-to-take-atorvastatin/", reviewed: "2026-06-23" },
  metro: { title: "About metronidazole", publisher: NHS, url: "https://www.nhs.uk/medicines/metronidazole/about-metronidazole/", reviewed: "2025-12-31" },
  acv: { title: "How and when to take or use aciclovir", publisher: NHS, url: "https://www.nhs.uk/medicines/aciclovir/how-and-when-to-take-or-use-aciclovir/", reviewed: "2026-02-23" },
  clo: { title: "How and when to use clotrimazole cream, spray and solution", publisher: NHS, url: "https://www.nhs.uk/medicines/clotrimazole/how-and-when-to-use-clotrimazole-cream-spray-and-solution/", reviewed: "2026-07-08" },
  hc: { title: "How and when to use hydrocortisone for skin", publisher: NHS, url: "https://www.nhs.uk/medicines/hydrocortisone-for-skin/how-and-when-to-use-hydrocortisone-for-skin/", reviewed: "2025-08-28" },
  fus: { title: "How and when to use fusidic acid", publisher: NHS, url: "https://www.nhs.uk/medicines/fusidic-acid/how-and-when-to-use-fusidic-acid/", reviewed: "2026-01-30" },
  chl: { title: "How and when to use chloramphenicol", publisher: NHS, url: "https://www.nhs.uk/medicines/chloramphenicol/how-and-when-to-use-chloramphenicol/", reviewed: "2026-01-30" },
  mhra: { title: "Recommended use of some nasal decongestant sprays limited to five days by UK regulator (30/04/2026)", publisher: "MHRA (Cơ quan quản lý thuốc Anh)", url: "https://www.gov.uk/government/news/recommended-use-of-some-nasal-decongestant-sprays-limited-to-five-days-by-uk-regulator" },
  flu: { title: "How and when to use fluticasone nasal spray and drops", publisher: NHS, url: "https://www.nhs.uk/medicines/fluticasone-nasal-spray-and-drops/how-and-when-to-use-fluticasone-nasal-spray-and-drops/", reviewed: "2023-02-24" },
  salb: { title: "How and when to use salbutamol inhalers", publisher: NHS, url: "https://www.nhs.uk/medicines/salbutamol-inhaler/how-and-when-to-use-salbutamol-inhalers/", reviewed: "2025-02-13" },
  dicl: { title: "How and when to take or use diclofenac", publisher: NHS, url: "https://www.nhs.uk/medicines/diclofenac/how-and-when-to-take-or-use-diclofenac/", reviewed: "2024-08-05" },
  terb: { title: "How and when to take or use terbinafine", publisher: NHS, url: "https://www.nhs.uk/medicines/terbinafine/how-and-when-to-take-or-use-terbinafine/", reviewed: "2023-03-24" },
  meb: { title: "How and when to take mebendazole", publisher: NHS, url: "https://www.nhs.uk/medicines/mebendazole/how-and-when-to-take-mebendazole/", reviewed: "2026-07-22" },
  lop: { title: "About loperamide", publisher: NHS, url: "https://www.nhs.uk/medicines/loperamide/about-loperamide/", reviewed: "2024-04-10" },
  nap: { title: "How and when to take naproxen", publisher: NHS, url: "https://www.nhs.uk/medicines/naproxen/how-and-when-to-take-naproxen/", reviewed: "2026-06-25" },
  pred: { title: "How and when to take prednisolone tablets and liquid", publisher: NHS, url: "https://www.nhs.uk/medicines/prednisolone/how-and-when-to-take-prednisolone-tablets-and-liquid/", reviewed: "2022-02-24" },
  cefa: { title: "How and when to take cefalexin", publisher: NHS, url: "https://www.nhs.uk/medicines/cefalexin/how-and-when-to-take-cefalexin/", reviewed: "2023-04-05" },
  azi: { title: "How and when to take azithromycin", publisher: NHS, url: "https://www.nhs.uk/medicines/azithromycin/how-and-when-to-take-azithromycin/", reviewed: "2026-01-30" },
  los: { title: "How and when to take losartan", publisher: NHS, url: "https://www.nhs.uk/medicines/losartan/how-and-when-to-take-losartan/", reviewed: "2026-06-10" },
  gav: { title: "How and when to take Gaviscon", publisher: NHS, url: "https://www.nhs.uk/medicines/gaviscon/how-and-when-to-take-gaviscon/", reviewed: "2025-04-23" },
  bus: { title: "How and when to take Buscopan", publisher: NHS, url: "https://www.nhs.uk/medicines/buscopan-hyoscine-butylbromide/how-and-when-to-take-buscopan/", reviewed: "2025-05-13" },
  lac: { title: "How and when to take lactulose", publisher: NHS, url: "https://www.nhs.uk/medicines/lactulose/how-and-when-to-take-lactulose/", reviewed: "2022-03-04" },
  fe: { title: "How and when to take ferrous sulfate", publisher: NHS, url: "https://www.nhs.uk/medicines/ferrous-sulfate/how-and-when-to-take-ferrous-sulfate/", reviewed: "2023-02-09" },
  fol: { title: "How and when to take folic acid", publisher: NHS, url: "https://www.nhs.uk/medicines/folic-acid/how-and-when-to-take-folic-acid/", reviewed: "2026-05-05" },
  fex: { title: "How and when to take fexofenadine", publisher: NHS, url: "https://www.nhs.uk/medicines/fexofenadine/how-and-when-to-take-fexofenadine/", reviewed: "2025-04-22" },
  mont: { title: "How and when to take montelukast", publisher: NHS, url: "https://www.nhs.uk/medicines/montelukast/how-and-when-to-take-montelukast/", reviewed: "2023-03-14" },
  cip: { title: "How and when to take or use ciprofloxacin", publisher: NHS, url: "https://www.nhs.uk/medicines/ciprofloxacin/how-and-when-to-take-or-use-ciprofloxacin/", reviewed: "2022-12-13" },
  clop: { title: "How and when to take clopidogrel", publisher: NHS, url: "https://www.nhs.uk/medicines/clopidogrel/how-and-when-to-take-clopidogrel/", reviewed: "2025-03-12" },
  biso: { title: "How and when to take bisoprolol", publisher: NHS, url: "https://www.nhs.uk/medicines/bisoprolol/how-and-when-to-take-bisoprolol/", reviewed: "2026-01-08" },
  eso: { title: "How and when to take esomeprazole", publisher: NHS, url: "https://www.nhs.uk/medicines/esomeprazole/how-and-when-to-take-esomeprazole/", reviewed: "2025-11-26" },
  bpo: { title: "How and when to use benzoyl peroxide", publisher: NHS, url: "https://www.nhs.uk/medicines/benzoyl-peroxide/how-and-when-to-use-benzoyl-peroxide/", reviewed: "2022-09-30" },
  scab: { title: "Scabies – patient information", publisher: "Primary Care Dermatology Society (Anh)", url: "https://www.pcds.org.uk/patient-info-leaflets/scabies" },
  keto: { title: "How and when to use ketoconazole", publisher: NHS, url: "https://www.nhs.uk/medicines/ketoconazole/how-and-when-to-use-ketoconazole/", reviewed: "2024-08-16" },
  bisa: { title: "How and when to take or use bisacodyl", publisher: NHS, url: "https://www.nhs.uk/medicines/bisacodyl/how-and-when-to-take-or-use-bisacodyl/", reviewed: "2024-08-02" },
  senna: { title: "How and when to take senna", publisher: NHS, url: "https://www.nhs.uk/medicines/senna/how-and-when-to-take-senna/", reviewed: "2026-09-24" },
  becl: { title: "How and when to use beclometasone inhalers", publisher: NHS, url: "https://www.nhs.uk/medicines/beclometasone-inhalers/how-and-when-to-use-beclometasone-inhalers/", reviewed: "2023-03-22" },
  nys: { title: "How and when to take or use nystatin", publisher: NHS, url: "https://www.nhs.uk/medicines/nystatin/how-and-when-to-take-or-use-nystatin/", reviewed: "2023-08-01" },
  chx: { title: "How and when to use chlorhexidine", publisher: NHS, url: "https://www.nhs.uk/medicines/chlorhexidine/how-and-when-to-use-chlorhexidine/", reviewed: "2024-08-19" },
  albWho: { title: "Deworming in non-pregnant adolescent girls and women of reproductive age (eLENA)", publisher: "WHO", url: "https://www.who.int/tools/elena/interventions/deworming-women", reviewed: "2023-08-09" },
  alb: { title: "Albendazole", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a610019.html", reviewed: "2023-10-15" },
  mup: { title: "Mupirocin topical", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a688004.html", reviewed: "2017-12-15" },
  dxm: { title: "Dextromethorphan", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a682492.html", reviewed: "2022-01-15" },
  pse: { title: "How and when to take pseudoephedrine", publisher: NHS, url: "https://www.nhs.uk/medicines/pseudoephedrine/how-and-when-to-take-pseudoephedrine/", reviewed: "2026-09-24" },
  asp: { title: "How and when to take low-dose aspirin", publisher: NHS, url: "https://www.nhs.uk/medicines/low-dose-aspirin/how-and-when-to-take-low-dose-aspirin/", reviewed: "2026-07-03" },
  ec: { title: "How to take the emergency contraceptive pill (morning after pill)", publisher: NHS, url: "https://www.nhs.uk/contraception/methods-of-contraception/emergency-contraceptive-pill-morning-after-pill/how-to-take-it/", reviewed: "2024-02-09" },
  ors: { title: "How to make oral rehydration solution (ORS)", publisher: "CDC", url: "https://www.cdc.gov/global-water-sanitation-hygiene/media/pdfs/ors_seasia_508.pdf" },
  nitro: { title: "How and when to take nitrofurantoin", publisher: NHS, url: "https://www.nhs.uk/medicines/nitrofurantoin/how-and-when-to-take-nitrofurantoin/", reviewed: "2026-01-06" },
  meb2: { title: "How and when to take mebeverine", publisher: NHS, url: "https://www.nhs.uk/medicines/mebeverine/how-and-when-to-take-mebeverine/", reviewed: "2026-07-23" },
  txa: { title: "How and when to take tranexamic acid", publisher: NHS, url: "https://www.nhs.uk/medicines/tranexamic-acid/how-and-when-to-take-tranexamic-acid/", reviewed: "2023-03-09" },
  flc: { title: "How and when to take fluconazole", publisher: NHS, url: "https://www.nhs.uk/medicines/fluconazole/how-and-when-to-take-fluconazole/", reviewed: "2023-03-09" },
  tram: { title: "How and when to take tramadol", publisher: NHS, url: "https://www.nhs.uk/medicines/tramadol/how-and-when-to-take-tramadol/", reviewed: "2026-02-04" },
  bud: { title: "How and when to use budesonide inhalers", publisher: NHS, url: "https://www.nhs.uk/medicines/budesonide-inhalers/how-and-when-to-use-budesonide-inhalers/", reviewed: "2023-08-16" },
  mom: { title: "How and when to use mometasone nasal spray", publisher: NHS, url: "https://www.nhs.uk/medicines/mometasone-nasal-spray/how-and-when-to-use-mometasone-nasal-spray/", reviewed: "2024-01-24" },
  simv: { title: "How and when to take simvastatin", publisher: NHS, url: "https://www.nhs.uk/medicines/simvastatin/how-and-when-to-take-simvastatin/", reviewed: "2026-05-12" },
  furo: { title: "How and when to take furosemide", publisher: NHS, url: "https://www.nhs.uk/medicines/furosemide/how-and-when-to-take-furosemide/", reviewed: "2026-07-07" },
  zolp: { title: "How and when to take zolpidem", publisher: NHS, url: "https://www.nhs.uk/medicines/zolpidem/how-and-when-to-take-zolpidem/", reviewed: "2023-01-10" },
  vitd: { title: "How and when to take colecalciferol", publisher: NHS, url: "https://www.nhs.uk/medicines/colecalciferol/how-and-when-to-take-colecalciferol/", reviewed: "2023-01-10" },
  tams: { title: "How and when to take tamsulosin", publisher: NHS, url: "https://www.nhs.uk/medicines/tamsulosin/how-and-when-to-take-tamsulosin/", reviewed: "2023-02-02" },
  flx: { title: "Fluoxetine", publisher: NHS, url: "https://www.nhs.uk/medicines/fluoxetine/", reviewed: "2026-06-01" },
  dzp: { title: "Diazepam", publisher: NHS, url: "https://www.nhs.uk/medicines/diazepam/", reviewed: "2026-06-02" },
  sert: { title: "Sertraline", publisher: NHS, url: "https://www.nhs.uk/medicines/sertraline/", reviewed: "2025-09-08" },
  lisi: { title: "How and when to take lisinopril", publisher: NHS, url: "https://www.nhs.uk/medicines/lisinopril/how-and-when-to-take-lisinopril/", reviewed: "2026-02-04" },
  rami: { title: "How and when to take ramipril", publisher: NHS, url: "https://www.nhs.uk/medicines/ramipril/how-and-when-to-take-ramipril/", reviewed: "2026-03-18" },
  enal: { title: "Enalapril", publisher: NHS, url: "https://www.nhs.uk/medicines/enalapril/", reviewed: "2026-06-16" },
  nife: { title: "Nifedipine", publisher: NHS, url: "https://www.nhs.uk/medicines/nifedipine/", reviewed: "2026-05-20" },
  suma: { title: "How and when to take or use sumatriptan", publisher: NHS, url: "https://www.nhs.uk/medicines/sumatriptan/how-and-when-to-take-or-use-sumatriptan/", reviewed: "2022-12-08" },
  sild: { title: "How and when to take sildenafil", publisher: NHS, url: "https://www.nhs.uk/medicines/sildenafil-viagra/how-and-when-to-take-sildenafil/", reviewed: "2026-07-29" },
  hyo: { title: "How and when to take hyoscine hydrobromide", publisher: NHS, url: "https://www.nhs.uk/medicines/hyoscine-hydrobromide/how-and-when-to-take-hyoscine-hydrobromide/", reviewed: "2022-10-05" },
  prop: { title: "How and when to take propranolol", publisher: NHS, url: "https://www.nhs.uk/medicines/propranolol/how-and-when-to-take-propranolol/", reviewed: "2026-01-06" },
  cinn: { title: "Cinnarizine", publisher: NHS, url: "https://www.nhs.uk/medicines/cinnarizine/", reviewed: "2026-08-06" },
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
  skin: { label: "thuốc bôi ngoài da", sources: [] },
  eye: { label: "thuốc nhỏ / tra mắt", sources: [] },
  nose: { label: "thuốc xịt / nhỏ mũi", sources: [] },
  inhaler: { label: "thuốc hít (bình xịt hen)", sources: [] },
  worm: { label: "thuốc tẩy giun", sources: [] },
  supp: { label: "thuốc bổ sung (sắt, acid folic…)", sources: [] },
  coughrx: { label: "thuốc giảm ho / thông mũi dạng uống", sources: [] },
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
  row("paracetamol", "paracetamol (acetaminophen)", "pain", ["panadol", "efferalgan", "hapacol", "tylenol", "partamol", "paracetamol", "acetaminophen", "para"], {
    sources: [S.paraMain],
    dose: {
      adult: [
        { text: "Viên / nang **500 mg** (loại hay gặp): mỗi lần **1–2 viên**, các lần cách nhau **ít nhất 4 giờ**, **không quá 8 viên trong 24 giờ**.", src: [0] },
        { text: "Viên **1 g** (nếu có): mỗi lần **1 viên**, **không quá 4 viên trong 24 giờ**.", src: [0] },
        { text: "Người **nặng dưới 50 kg** có thể cần liều thấp hơn; có **bệnh gan, thận** thì hỏi dược sĩ / bác sĩ trước khi dùng.", src: [0] },
      ],
      kid: [{ text: "Liều trên chỉ cho người **từ 18 tuổi**; trẻ em dùng loại paracetamol dành cho trẻ, liều theo tuổi / cân nặng ghi trên nhãn — hỏi dược sĩ nếu chưa chắc.", src: [0] }],
    },
  }),
  row("ibuprofen", "ibuprofen", "nsaid", ["advil", "nurofen", "gofen", "ibuprofen", "ibuprophen"], {
    sources: [S.ibu],
    dose: {
      adult: [
        { text: "Viên **200 mg**: mỗi lần **1–2 viên**, **tối đa 3 lần/ngày**, cách nhau **ít nhất 4 giờ**, **không quá 6 viên trong 24 giờ**.", src: [0] },
        { text: "Viên **400 mg**: mỗi lần **1 viên**, **tối đa 3 lần/ngày**, cách nhau **ít nhất 4 giờ**, **không quá 3 viên trong 24 giờ**.", src: [0] },
        { text: "Không tự uống quá **10 ngày** nếu bác sĩ không dặn; bác sĩ kê liều cao hơn thì làm theo bác sĩ.", src: [0] },
      ],
    },
  }),
  row("ibu-para", "ibuprofen + paracetamol", "nsaid", ["alaxan"]),
  row("diclofenac", "diclofenac", "nsaid", ["voltaren", "voltaren emulgel", "diclofenac", "diclofenak", "diclofenac gel"], { sources: [S.dicl], how: [{ text: "Viên uống: uống **với sữa hoặc sau bữa ăn / bữa phụ** cho đỡ hại dạ dày, thường ngày 2–3 lần.", src: [0] }, { text: "Dạng **gel**: lấy khoảng 2–4 g (cỡ quả anh đào đến quả óc chó), bôi ngày 2–4 lần, **không quá 4 lần trong 24 giờ**; rửa tay sau khi bôi.", src: [0] }, { text: "Miếng dán: dán một chỗ đau mỗi lần, tối đa 2 lần/ngày (sáng và tối), không quá 2 miếng trong 24 giờ.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau — **không dùng 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Viên uống: liều thường **75 mg/ngày**, tối đa **150 mg/ngày** (theo đơn bác sĩ).", src: [0] }] } }),
  row("meloxicam", "meloxicam", "nsaid", ["mobic", "meloxicam"]),
  row("celecoxib", "celecoxib", "nsaid", ["celebrex", "celecoxib"]),
  row("naproxen", "naproxen", "nsaid", ["naproxen", "naprosyn"], { sources: [S.nap], how: [{ text: "Uống **trong hoặc sau bữa ăn** để bảo vệ dạ dày, thường **tối đa 3 lần/ngày**.", src: [0] }, { text: "**Tự mua không có đơn** (vd đau bụng kinh) thì **không dùng quá 3 ngày** — không đỡ thì đi khám.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều cùng lúc**.", src: [0] }] }),
  row("amoxicillin", "amoxicillin", "abx", ["amoxicillin", "amoxicilin", "amoxil", "clamoxyl", "amoxycillin"], {
    how: AMOX,
    sources: [S.amox],
    dose: {
      rx: true,
      adult: [
        { text: "Liều **hay được kê** cho người lớn: **250–500 mg mỗi lần, ngày 3 lần** — liều và số ngày của bạn là do **bác sĩ kê**.", src: [0] },
        { text: "Uống **3–5 ngày** mà không thấy đỡ thì báo bác sĩ.", src: [0] },
      ],
      kid: [{ text: "Trẻ em thường dùng liều thấp hơn (có dạng siro) — theo đơn bác sĩ.", src: [0] }],
    },
  }),
  row("amox-clav", "amoxicillin + acid clavulanic", "abx", ["augmentin", "klamentin", "curam", "amoxiclav"]),
  row("cefuroxime", "cefuroxime", "abx", ["zinnat", "cefuroxime", "cefuroxim"]),
  row("cefixime", "cefixime", "abx", ["cefixime", "cefixim"]),
  row("cefalexin", "cefalexin (cephalexin)", "abx", ["cefalexin", "cephalexin", "keflex"], { sources: [S.cefa], how: [{ text: "Uống **lúc no hay đói đều được**; chia liều đều trong ngày (vd ngày 3 lần: sáng, giữa chiều, trước khi ngủ).", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm nhiễm trùng dễ quay lại.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau; các liều cách nhau **ít nhất 4 giờ**, không uống 2 liều cùng lúc.", src: [0] }], dose: { adult: [{ text: "Người lớn thường được kê **500 mg, ngày 2–3 lần**; nhiễm trùng nặng có thể cao hơn, trẻ em thấp hơn.", src: [0] }], rx: true } }),
  row("cefadroxil", "cefadroxil", "abx", ["cefadroxil"]),
  row("azithromycin", "azithromycin", "abx", ["zithromax", "azithromycin", "azithromycine", "azicine", "azithromycin 500"], { sources: [S.azi], how: [{ text: "Uống **ngày 1 lần, cùng giờ**. Viên nén / nang: uống **trước ăn ít nhất 1 giờ hoặc sau ăn 2 giờ**; dạng siro uống lúc nào cũng được.", src: [0] }, { text: "Thuốc dạ dày (antacid) thì uống azithromycin **trước 1 giờ hoặc sau 2 giờ**.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn thường được kê **500 mg/ngày trong 3–10 ngày** tuỳ bệnh; có bệnh chỉ cần một liều cao duy nhất (1–2 g) theo bác sĩ.", src: [0] }], rx: true } }),
  row("clarithromycin", "clarithromycin", "abx", ["klacid", "clarithromycin"]),
  row("ciprofloxacin", "ciprofloxacin", "abx", ["ciprofloxacin", "ciprobay", "ciprofloxacine", "cipro"], { sources: [S.cip], how: [{ text: "Uống **lúc no hay đói đều được**, nhưng **tránh uống cùng sữa, phô mai, sữa chua** (làm thuốc kém tác dụng).", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn thường được kê **250–750 mg, ngày 2 lần**; trẻ em và người bệnh thận thường liều thấp hơn.", src: [0] }], rx: true } }),
  row("levofloxacin", "levofloxacin", "abx", ["levofloxacin", "tavanic"]),
  row("metronidazole", "metronidazole", "abx", ["flagyl", "metronidazole", "metronidazol"], {
    sources: [S.metro],
    care: [{ text: "**Không uống rượu bia** trong thời gian dùng metronidazole (viên, siro hay viên đặt).", src: [0] }],
    side: [{ text: "Hay gặp: buồn nôn, nôn, tiêu chảy, **vị kim loại** trong miệng.", src: [0] }],
  }),
  row("doxycycline", "doxycycline", "abx", ["doxycycline", "doxycyclin"]),
  row("cetirizine", "cetirizine", "antihis", ["zyrtec", "cetirizine", "cetirizin"], {
    drowsy: false,
    sources: [S.cet],
    how: [
      { text: "Uống **lúc no hay đói đều được**, uống với nước / sữa.", src: [0] },
      { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau; **không uống 2 liều** để bù.", src: [0] },
    ],
    dose: {
      adult: [{ text: "Người lớn và trẻ **từ 12 tuổi**: **10 mg, ngày 1 lần**.", src: [0] }],
      kid: [
        { text: "Trẻ **6–11 tuổi**: thường **5 mg, ngày 2 lần** (cách nhau 10–12 giờ). Trẻ **2–5 tuổi**: **2,5 mg, ngày 2 lần**.", src: [0] },
        { text: "Trẻ **1 tuổi**: bác sĩ tính liều theo cân nặng / tuổi. Trẻ nhỏ dùng dạng siro dễ uống hơn.", src: [0] },
      ],
    },
  }),
  row("loratadine", "loratadine", "antihis", ["clarityne", "loratadine", "loratadin"], {
    drowsy: false,
    sources: [S.lor],
    how: [
      { text: "Uống **lúc no hay đói đều được**.", src: [0] },
      { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau; **không uống 2 liều** để bù.", src: [0] },
    ],
    dose: {
      adult: [{ text: "Người lớn: thường **10 mg, ngày 1 lần**.", src: [0] }],
      kid: [{ text: "Trẻ em: bác sĩ tính liều theo cân nặng / tuổi; trẻ **6–12 tuổi chỉ uống dạng viên khi nặng trên 30 kg**, trẻ **dưới 6 tuổi hoặc ≤ 30 kg** dùng dạng siro.", src: [0] }],
    },
  }),
  row("fexofenadine", "fexofenadine", "antihis", ["telfast", "fexofenadine", "fexofenadin", "allegra"], { drowsy: false, sources: [S.fex], how: [{ text: "Viên 120 mg / 180 mg uống **trước bữa ăn**, với **nước lọc** — **không uống với nước cam, nước táo, nước bưởi**.", src: [0] }, { text: "Quên liều: uống khi nhớ, trừ khi gần tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi: viêm mũi dị ứng **120 mg ngày 1 lần**; mề đay **180 mg ngày 1 lần**.", src: [0] }], kid: [{ text: "Trẻ **6–11 tuổi** bị viêm mũi dị ứng: **30 mg, ngày 2 lần** (cách 10–12 giờ).", src: [0] }] } }),
  row("desloratadine", "desloratadine", "antihis", ["aerius", "desloratadine", "desloratadin"]),
  row("chlorphenamine", "chlorphenamine (clorpheniramin)", "antihis", ["chlorphenamine", "chlorpheniramine", "clorpheniramin", "clorpheniramine", "chlorpheniramin", "piriton"], {
    drowsy: true,
    sources: [S.chlor],
    how: [{ text: "Uống **lúc no hay đói đều được**; quên liều thì uống ngay khi nhớ, trừ khi gần tới liều sau — **không uống bù gấp đôi**.", src: [0] }],
    dose: {
      adult: [{ text: "Người lớn và trẻ **từ 12 tuổi**: **1 viên mỗi 4–6 giờ**, **không quá 6 viên trong 24 giờ**.", src: [0] }],
      kid: [{ text: "Trẻ **dưới 12 tuổi** dùng liều thấp hơn; **không cho trẻ dưới 6 tuổi** thuốc ho / cảm có chlorphenamine; bé **dưới 1 tuổi** chỉ dùng khi bác sĩ kê.", src: [0] }],
    },
  }),
  row("promethazine", "promethazine", "antihis", ["phenergan", "promethazine", "promethazin"], { drowsy: true }),
  row("diphenhydramine", "diphenhydramine", "antihis", ["diphenhydramine", "diphenhydramin"], { drowsy: true }),
  row("cinnarizine", "cinnarizine (chống say xe, chóng mặt)", "antihis", ["stugeron", "cinnarizine", "cinnarizin"], { drowsy: true, sources: [S.cinn], how: [{ text: "Say xe: uống **sau khi ăn**, **2 giờ trước khi đi**; trong chuyến đi cần thì uống thêm mỗi 8 giờ.", src: [0] }, { text: "Gây **buồn ngủ**: đừng lái xe, đi xe đạp, dùng máy móc; **không nên uống rượu bia** khi dùng.", src: [0] }, { text: "Chóng mặt / bệnh Ménière: theo liều bác sĩ kê.", src: [0] }], dose: { adult: [{ text: "Say xe (viên 15 mg) — người lớn và trẻ từ 12 tuổi: **2 viên** trước khi đi 2 giờ, sau đó **1 viên mỗi 8 giờ** nếu cần.", src: [0] }], kid: [{ text: "Trẻ **5–11 tuổi**: **1 viên** trước khi đi 2 giờ, sau đó **nửa viên mỗi 8 giờ** nếu cần.", src: [0] }] } }),
  row("omeprazole", "omeprazole", "ppi", ["losec", "omeprazole", "omeprazol"], {
    sources: [S.ome],
    dose: { adult: [{ text: "Liều tuỳ bệnh — thường **ngày 1 hoặc 2 lần** theo bác sĩ dặn. **Tự mua không có đơn thì không dùng quá 2 tuần**.", src: [0] }] },
  }),
  row("esomeprazole", "esomeprazole", "ppi", ["nexium", "esomeprazole", "esomeprazol"], { sources: [S.eso], how: [{ text: "Thường uống **ngày 1 lần, buổi sáng**, lúc no hay đói đều được; **nuốt nguyên viên** với nước lọc (không ga), không nhai, không nghiền.", src: [0] }, { text: "Tự mua uống **2 tuần mà không đỡ** thì đi khám.", src: [0] }, { text: "Quên liều (ngày 1 lần): uống khi nhớ, trừ khi còn chưa tới 12 giờ là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Ợ nóng, trào ngược: thường **20 mg/ngày**; trào ngược dạ dày thực quản (GERD) **20–40 mg/ngày**; loét dạ dày **20 mg/ngày** — liều cao hơn chỉ khi bác sĩ kê.", src: [0] }] } }),
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
  row("prednisolone", "prednisolone", "steroid", ["prednisolone", "prednisolon"], { sources: [S.pred], how: [{ text: "Thường uống **ngày 1 lần, buổi sáng cùng bữa sáng** (đỡ hại dạ dày, ít mất ngủ).", src: [0] }, { text: "**Đừng tự ngưng đột ngột**, nhất là khi dùng liều cao hoặc lâu ngày — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ; nếu đã sang ngày hôm sau thì bỏ qua — không uống gấp đôi.", src: [0] }], dose: { adult: [{ text: "Liều rất khác nhau, thường **5–60 mg/ngày**, bác sĩ có thể tăng / giảm theo bệnh.", src: [0] }], rx: true } }),
  row("methylprednisolone", "methylprednisolone", "steroid", ["medrol", "methylprednisolone", "methylprednisolon", "menison"]),
  row("dexamethasone", "dexamethasone", "steroid", ["dexamethasone", "dexamethason"]),
  row("amlodipine", "amlodipine (thuốc huyết áp)", "rx", ["amlor", "amlodipine", "amlodipin"], {
    sources: [S.aml],
    how: [
      { text: "Thường uống **ngày 1 lần, cùng giờ mỗi ngày**; trước hay sau ăn đều được. Liều do bác sĩ quyết định.", src: [0] },
      { text: "**Tránh bưởi chùm và nước ép bưởi chùm** (dễ tăng tác dụng phụ).", src: [0] },
      { text: "Quên liều: bỏ liều đó, uống liều sau như thường; **không uống 2 liều** để bù. **Đừng tự ngưng** — ngưng đột ngột có thể nguy hiểm.", src: [0] },
    ],
  }),
  row("losartan", "losartan (thuốc huyết áp)", "rx", ["cozaar", "losartan"], { sources: [S.los], how: [{ text: "Thường uống **ngày 1 lần, cùng giờ mỗi ngày**, với nước, lúc no hay đói đều được. Liều do bác sĩ quyết định.", src: [0] }, { text: "Quên liều: uống liều sau như thường — **không uống 2 liều** để bù. **Đừng tự ngưng**.", src: [0] }] }),
  row("perindopril", "perindopril (thuốc huyết áp)", "rx", ["coversyl", "perindopril"]),
  row("bisoprolol", "bisoprolol (thuốc tim mạch, huyết áp)", "rx", ["concor", "bisoprolol"], { sources: [S.biso], how: [{ text: "Thường uống **ngày 1 lần, buổi sáng**, cùng giờ mỗi ngày; ăn uống bình thường được. Bác sĩ hay cho liều thấp rồi tăng dần.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bệnh có thể nặng hơn; bác sĩ sẽ giảm dần nếu cần ngưng.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }] }),
  row("metformin", "metformin (thuốc tiểu đường)", "rx", ["glucophage", "metformin"], {
    sources: [S.met],
    how: [
      { text: "Uống **cùng bữa ăn**; nuốt nguyên viên với nước, **không nghiền, không nhai**. Ăn uống bình thường được.", src: [0] },
      { text: "Phần lớn người uống **1–3 lần/ngày**, liều tuỳ bệnh và tuổi — bác sĩ có thể cho liều thấp lúc đầu.", src: [0] },
      { text: "Quên liều: ngày 1 lần thì uống ngay khi nhớ; ngày nhiều lần mà gần tới liều sau thì bỏ liều quên; **không uống 2 liều** để bù.", src: [0] },
    ],
  }),
  row("gliclazide", "gliclazide (thuốc tiểu đường)", "rx", ["diamicron", "gliclazide", "gliclazid"]),
  row("atorvastatin", "atorvastatin (thuốc mỡ máu)", "rx", ["lipitor", "atorvastatin"], {
    sources: [S.ator],
    how: [
      { text: "Uống **ngày 1 lần, cùng giờ mỗi ngày**; lúc no hay đói đều được. Bác sĩ có thể cho liều thấp rồi tăng dần.", src: [0] },
      { text: "**Đừng uống nhiều nước ép bưởi chùm** (dễ tăng tác dụng phụ).", src: [0] },
      { text: "Quên liều: bỏ liều đó, uống liều sau như thường; **không uống 2 liều** để bù.", src: [0] },
    ],
  }),
  row("rosuvastatin", "rosuvastatin (thuốc mỡ máu)", "rx", ["crestor", "rosuvastatin"]),
  row("clopidogrel", "clopidogrel (thuốc chống kết tập tiểu cầu)", "rx", ["plavix", "clopidogrel"], { sources: [S.clop], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, nuốt nguyên viên với nước, lúc no hay đói đều được.", src: [0] }, { text: "Có thể phải dùng nhiều tuần, nhiều tháng hoặc suốt đời — **đừng tự ngưng** (tăng nguy cơ nhồi máu cơ tim, đột quỵ).", src: [0] }, { text: "Quên liều: nhớ ra trong vòng 12 giờ thì uống; quá 12 giờ thì bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Liều thường dùng **75 mg ngày 1 lần**.", src: [0] }], rx: true } }),
  row("domperidone", "domperidone (thuốc chống nôn)", "gi", ["motilium", "domperidone", "domperidon"], {
    sources: [S.dom],
    how: [
      { text: "Uống **15–30 phút trước bữa ăn** (hoặc bữa phụ).", src: [0] },
      { text: "Thường chỉ dùng **tối đa khoảng 1 tuần** — dùng lâu hoặc liều cao có thể gây **loạn nhịp tim**.", src: [0] },
      { text: "Quên liều: uống ngay nếu còn cách liều sau ít nhất 2 giờ; không thì bỏ qua — **không uống 2 liều cùng lúc**.", src: [0] },
    ],
    dose: { adult: [{ text: "Người lớn và trẻ **từ 12 tuổi**: thường **10 mg mỗi lần, tối đa 3 lần/ngày**, các lần cách nhau **ít nhất 8 giờ**.", src: [0] }] },
  }),
  row("loperamide", "loperamide (thuốc cầm tiêu chảy)", "gi", ["imodium", "loperamide", "loperamid"], { sources: [S.lop], how: [{ text: "Làm chậm nhu động ruột cho phân đặc lại; uống đúng lượng ghi trên hộp / tờ hướng dẫn.", src: [0] }, { text: "**Tự mua không có đơn thì không dùng quá 48 giờ** khi chưa hỏi bác sĩ.", src: [0] }] }),
  // ── 04/11 (Kir: "thêm nhiều loại thuốc phổ biến… thuốc bôi, uống, xịt, nhỏ") — trang thuốc NHS / MHRA / PCDS đọc ngày 04/11/2026 ──
  row("aciclovir", "aciclovir (acyclovir)", "skin", ["zovirax", "aciclovir", "acyclovir", "acyclovir cream", "kem acyclovir"], { sources: [S.acv], how: [{ text: "Kem bôi (mụn rộp môi): bôi **ngay khi thấy ngứa, rát**; bôi lớp mỏng **5 lần/ngày, cách nhau 4 giờ**; rửa tay trước và sau khi bôi.", src: [0] }, { text: "Bôi **9 ngày** mà mụn rộp chưa lành (mụn rộp sinh dục: 10 ngày) thì ngưng và đi khám.", src: [0] }, { text: "Viên uống (kê đơn): bắt đầu uống càng sớm càng tốt, **uống nhiều nước**; quên liều thì uống khi nhớ, gần tới liều sau thì bỏ qua.", src: [0] }] }),
  row("clotrimazole", "clotrimazole (thuốc trị nấm)", "skin", ["canesten", "clotrimazole", "clotrimazol"], { sources: [S.clo], how: [{ text: "Bôi **2–3 lần/ngày** trong **2–4 tuần** tuỳ bệnh (nấm da, nấm kẽ chân, hắc lào, nấm ở nếp gấp da…).", src: [0] }, { text: "Lấy khoảng nửa centimet kem trên đầu ngón tay cho một vùng bằng lòng bàn tay; bôi lớp mỏng, xoa nhẹ — tránh mắt, miệng.", src: [0] }, { text: "Dạng xịt / dung dịch: dùng tiếp **ít nhất 2 tuần sau khi hết triệu chứng** (tổng không quá 4 tuần). Rửa tay trước và sau khi bôi.", src: [0] }] }),
  row("hydrocortisone", "hydrocortisone bôi da (corticoid nhẹ)", "skin", ["hydrocortisone", "hydrocortison", "kem hydrocortisone"], { sources: [S.hc], how: [{ text: "Bôi **1–2 lần/ngày**, lớp mỏng, xoa đến khi thấm; không băng kín lại.", src: [0] }, { text: "**Không bôi quá 7 ngày** nếu dược sĩ / bác sĩ không dặn; không bôi lên vết thương hở, mặt, vùng kín khi chưa hỏi.", src: [0] }, { text: "**Trẻ dưới 10 tuổi** chỉ dùng khi bác sĩ / dược sĩ khuyên.", src: [0] }, { text: "Một “đốt ngón tay” kem (từ đầu ngón đến nếp gấp đầu tiên) đủ bôi vùng rộng gấp đôi lòng bàn tay.", src: [0] }] }),
  row("fusidic-acid", "acid fusidic (kháng sinh bôi)", "skin", ["fucidin", "fusidic acid", "acid fusidic", "axit fusidic", "fucidin h"], { sources: [S.fus], how: [{ text: "Kem / mỡ bôi lên chỗ da nhiễm trùng **3–4 lần/ngày** (loại có thêm corticoid như Fucidin H thường 2 lần/ngày), lớp mỏng, xoa nhẹ.", src: [0] }, { text: "Thường dùng **1–2 tuần**; rửa tay trước và sau khi bôi.", src: [0] }, { text: "Quên lần bôi: bôi ngay khi nhớ rồi theo lịch cũ.", src: [0] }] }),
  row("chloramphenicol", "chloramphenicol (kháng sinh nhỏ mắt)", "eye", ["chloramphenicol", "cloramphenicol", "cloraxin", "chloramphenicol eye drops"], { sources: [S.chl], how: [{ text: "Nhỏ mắt: ngửa đầu, kéo mi dưới, nhỏ **1 giọt**; nhắm mắt, ấn nhẹ góc mắt trong khoảng 1 phút. Mỡ tra mắt: thường **3–4 lần/ngày**, cách 4–6 giờ.", src: [0] }, { text: "Dùng đủ **5 ngày** dù mắt đã đỡ, không dùng quá 5 ngày nếu bác sĩ không dặn.", src: [0] }, { text: "**Không đeo kính áp tròng** khi đang dùng; kính mềm thì chờ 24 giờ sau liều cuối.", src: [0] }, { text: "Sau **2 ngày** không đỡ hoặc nặng hơn thì đi khám.", src: [0] }] }),
  row("xylometazoline", "xylometazoline / oxymetazoline (xịt thông mũi)", "nose", ["otrivin", "otrivine", "xylometazoline", "xylometazolin", "oxymetazoline", "oxymetazolin", "afrin"], { sources: [S.mhra], how: [{ text: "Dùng để đỡ nghẹt mũi khi cảm, cúm, dị ứng — **không dùng quá 5 ngày**.", src: [0] }, { text: "Dùng lâu dễ bị **nghẹt mũi dội ngược** (càng xịt càng nghẹt), lâu dần thành viêm mũi do thuốc; xịt 5 ngày vẫn nghẹt thì hỏi bác sĩ / dược sĩ.", src: [0] }] }),
  row("fluticasone-nasal", "fluticasone xịt mũi (corticoid)", "nose", ["flixonase", "fluticasone", "fluticason", "fluticasone nasal"], { sources: [S.flu], how: [{ text: "Lắc nhẹ; xì mũi, bịt một bên, cúi đầu hơi về trước, đưa đầu xịt vào bên kia, vừa hít vào chậm vừa ấn xịt; thở ra bằng miệng. Bình mới / lâu không dùng thì xịt thử vài lần ra ngoài.", src: [0] }, { text: "Có thể **mất vài tuần** mới thấy hiệu quả — cứ dùng đều.", src: [0] }, { text: "Quên liều: dùng khi nhớ, gần tới liều sau thì bỏ qua — không dùng gấp đôi.", src: [0] }], dose: { adult: [{ text: "Người lớn: thường **1–2 nhát mỗi bên mũi, ngày 1–2 lần**, không quá số nhát tối đa trên hộp.", src: [0] }] } }),
  row("salbutamol", "salbutamol (thuốc hít cắt cơn hen)", "inhaler", ["ventolin", "salbutamol", "albuterol"], { sources: [S.salb], how: [{ text: "Dùng khi cần: **1–2 nhát**; có thể dùng buồng đệm (spacer), nhất là trẻ nhỏ.", src: [0] }, { text: "Phải dùng **hơn 4 lần trong 24 giờ, từ 3 ngày/tuần trở lên, hoặc thức giấc ban đêm vì hen ≥ 1 lần/tuần** → đi khám để chỉnh thuốc.", src: [0] }, { text: "🚨 Lên cơn hen mà **xịt tới 10 nhát vẫn không đỡ** hoặc thấy nặng hơn → **gọi 115 ngay**.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ em: **1–2 nhát khi cần**, **không quá 4 lần trong 24 giờ** (ngoài cơn cấp cứu).", src: [0] }] } }),
  row("terbinafine", "terbinafine (thuốc trị nấm)", "skin", ["lamisil", "terbinafine", "terbinafin"], { sources: [S.terb], how: [{ text: "Kem / gel: rửa và lau khô chỗ nấm, bôi lớp mỏng **1–2 lần/ngày trong 1–2 tuần**; 2 tuần không đỡ thì đi khám. Tránh mắt, miệng; rửa tay trước và sau.", src: [0] }, { text: "Viên uống (kê đơn): thường **1 viên/ngày**; nấm kẽ chân uống 2–6 tuần, **nấm móng 6 tuần – 3 tháng**, có khi lâu hơn.", src: [0] }] }),
  row("mebendazole", "mebendazole (thuốc tẩy giun)", "worm", ["fugacar", "vermox", "mebendazole", "mebendazol"], { sources: [S.meb], how: [{ text: "Trị giun kim: người lớn và trẻ **từ 2 tuổi** uống **một liều duy nhất**; nếu triệu chứng quay lại có thể uống thêm liều sau **2 tuần**.", src: [0] }, { text: "Viên có thể nhai, nghiền hoặc nuốt nguyên với nước (viên cho trẻ thì nên nghiền); ăn uống bình thường.", src: [0] }, { text: "**Cả nhà từ 2 tuổi trở lên nên uống cùng lúc**; bà bầu, mẹ cho con bú, trẻ dưới 2 tuổi thì hỏi bác sĩ.", src: [0] }] }),
  row("gaviscon", "natri alginat + antacid (Gaviscon)", "gi", ["gaviscon", "gaviscon dual action"], { sources: [S.gav], how: [{ text: "Uống **sau bữa ăn và trước khi ngủ**; viên thì **nhai** chứ không nuốt nguyên; dùng muỗng đong kèm theo.", src: [0] }, { text: "Dùng **hơn 7 ngày** vẫn khó chịu, đau thì đi khám.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi: **10–20 ml** dạng lỏng hoặc **2–4 viên**, **tối đa 4 lần/ngày**.", src: [0] }], kid: [{ text: "Trẻ **dưới 12 tuổi**: theo lời bác sĩ.", src: [0] }] } }),
  row("buscopan", "hyoscine butylbromide (chống co thắt)", "gi", ["buscopan", "hyoscine", "hyoscine butylbromide", "butylscopolamine"], { sources: [S.bus], how: [{ text: "Nuốt nguyên viên với nước — **không bẻ, nghiền, nhai**.", src: [0] }, { text: "**Không dùng quá 2 tuần** nếu bác sĩ không dặn; triệu chứng đổi khác, nặng hơn hoặc 2 tuần không đỡ thì đi khám.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi (đau quặn bụng, hội chứng ruột kích thích): **1 viên × 3 lần/ngày**, cần thì tăng lên **2 viên × 4 lần/ngày** (tối đa 8 viên/ngày).", src: [0] }], kid: [{ text: "Trẻ **6–11 tuổi** đau quặn bụng: **1 viên × 3 lần/ngày**.", src: [0] }] } }),
  row("lactulose", "lactulose (thuốc nhuận tràng)", "gi", ["duphalac", "lactulose", "lactulose syrup"], { sources: [S.lac], how: [{ text: "Uống thêm nhiều nước (khoảng 6–8 ly/ngày), không thì táo bón có thể nặng hơn.", src: [0] }, { text: "Táo bón thường dùng tới khoảng 1 tuần (hoặc theo bác sĩ); liều có thể tăng / giảm tuỳ hiệu quả.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn bị táo bón: liều khởi đầu thường **15 ml, ngày 2 lần**.", src: [0] }], kid: [{ text: "Trẻ **1–4 tuổi**: 2,5–10 ml ngày 2 lần; **trẻ dưới 14 tuổi chỉ dùng khi bác sĩ khuyên**.", src: [0] }] } }),
  row("ferrous-sulfate", "sắt sulfat (viên sắt)", "supp", ["ferrous sulfate", "ferrous sulphate", "sat sulfat", "tardyferon", "vien sat"], { sources: [S.fe], how: [{ text: "Uống **lúc đói** (30 phút trước ăn hoặc 2 giờ sau ăn); nếu khó chịu dạ dày thì uống cùng / sau bữa ăn.", src: [0] }, { text: "**Cách trà, cà phê, sữa và chế phẩm sữa khoảng 2 giờ** (làm giảm hấp thu sắt).", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Viên 200 mg: phòng thiếu sắt **1 viên/ngày**; điều trị thiếu máu thường **1 viên/ngày**, có thể tới **2–3 lần/ngày** theo bác sĩ.", src: [0] }] } }),
  row("folic-acid", "acid folic", "supp", ["acid folic", "axit folic", "folic acid", "folic"], { sources: [S.fol], how: [{ text: "Bà bầu: uống acid folic **trong 12 tuần đầu thai kỳ**; định có thai thì **bắt đầu khoảng 3 tháng trước**. Một số người cần liều cao hơn — hỏi bác sĩ / nữ hộ sinh.", src: [0] }, { text: "Thiếu máu do thiếu folate: uống theo đơn bác sĩ. Quên liều: uống khi nhớ, không uống 2 liều.", src: [0] }] }),
  row("montelukast", "montelukast (thuốc phòng hen, dị ứng)", "rx", ["singulair", "montelukast"], { sources: [S.mont], how: [{ text: "Uống **ngày 1 lần, buổi tối**, để **phòng** triệu chứng hen / dị ứng — không quá 1 liều trong 24 giờ.", src: [0] }, { text: "Viên nhai: uống trước ăn 1 giờ hoặc sau ăn 2 giờ.", src: [0] }, { text: "Quên liều: bỏ qua, hôm sau uống như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 15 tuổi: **10 mg ngày 1 lần**.", src: [0] }], kid: [{ text: "Trẻ **6–14 tuổi**: viên nhai **5 mg/ngày**; **6 tháng – 5 tuổi**: **4 mg/ngày** (cốm, hoặc viên nhai nếu trên 2 tuổi).", src: [0] }], rx: true } }),
  row("benzoyl-peroxide", "benzoyl peroxide (thuốc bôi trị mụn)", "skin", ["benzoyl peroxide", "benzoyl", "oxy 10", "oxy 5"], { sources: [S.bpo], how: [{ text: "Rửa tay và vùng da, lau khô, bôi **lớp mỏng lên toàn vùng có mụn**, ngày **1–2 lần** (da nhạy cảm thì 1 lần buổi tối); da khô, bong thì bôi thưa lại.", src: [0] }, { text: "Tránh mắt; thuốc có thể **làm bạc màu tóc, quần áo, khăn, ga gối**.", src: [0] }, { text: "Tránh nắng gắt, dùng kem chống nắng không dầu SPF30 trở lên.", src: [0] }, { text: "Thường khoảng **4 tuần** mới thấy hiệu quả.", src: [0] }] }),
  row("permethrin", "permethrin (thuốc bôi trị ghẻ)", "skin", ["permethrin", "permethrine", "kem permethrin"], { sources: [S.scab], how: [{ text: "Bôi lớp mỏng **khắp người, cả mặt, cổ, da đầu, tai** (tránh mắt), kẽ ngón tay, ngón chân, dưới móng, vùng kín — bôi buổi tối lên da mát, khô.", src: [0] }, { text: "Để thuốc **ít nhất 12 giờ** rồi tắm rửa; **bôi lần 2 sau 7 ngày**.", src: [0] }, { text: "**Cả nhà, người tiếp xúc gần, bạn tình cùng bôi một ngày**, kể cả chưa ngứa.", src: [0] }, { text: "Giặt quần áo, khăn, ga gối ở **≥ 50°C**; đồ không giặt được thì bỏ túi kín **72 giờ**. Ngứa có thể kéo dài 2–3 tuần sau khi hết ghẻ.", src: [0] }] }),
  row("ketoconazole", "ketoconazole bôi / dầu gội (thuốc trị nấm)", "skin", ["nizoral", "ketoconazole", "ketoconazol", "dau goi nizoral"], { sources: [S.keto], how: [{ text: "Kem (nấm kẽ chân, nấm bẹn, hăm): bôi **1–2 lần/ngày** (nấm kẽ chân: 2 lần), dùng tiếp **3 ngày sau khi hết triệu chứng**. Rửa và lau khô chỗ bôi, dùng khăn riêng, rửa tay sau khi bôi.", src: [0] }, { text: "Dầu gội trị gàu / viêm da tiết bã: gội **2 lần/tuần trong 2–4 tuần**, sau đó **1 lần mỗi 1–2 tuần**; để bọt trên da đầu **3–5 phút** rồi xả sạch.", src: [0] }, { text: "Lang ben: dầu gội **ngày 1 lần, tối đa 5 ngày** (hoặc kem 1–2 lần/ngày trong 2–3 tuần nếu vùng nhỏ).", src: [0] }, { text: "Tránh mắt, miệng. Quên một lần thì bỏ qua, dùng tiếp như thường.", src: [0] }] }),
  row("bisacodyl", "bisacodyl (thuốc nhuận tràng kích thích)", "gi", ["dulcolax", "bisacodyl"], { sources: [S.bisa], how: [{ text: "Viên uống **trước khi đi ngủ**, nuốt nguyên viên với nước (không uống với sữa). Viên đặt hậu môn: **buổi sáng**, thường có tác dụng sau **10–45 phút**.", src: [0] }, { text: "**Không dùng hằng ngày quá 5 ngày** — sau 5 ngày vẫn táo bón thì đi khám.", src: [0] }, { text: "Quên liều: bỏ qua, tối hôm sau uống như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Viên uống (từ 12 tuổi): **5–10 mg ngày 1 lần** lúc đi ngủ — bắt đầu 5 mg, tối đa 10 mg. Viên đặt (người lớn, trẻ từ 10 tuổi): **10 mg ngày 1 lần** buổi sáng.", src: [0] }], kid: [{ text: "Trẻ **4–9 tuổi**: viên đặt 5 mg/ngày **chỉ khi bác sĩ khuyên**.", src: [0] }] } }),
  row("senna", "senna (lá phan tả diệp — nhuận tràng)", "gi", ["senokot", "senna", "phan ta diep"], { sources: [S.senna], how: [{ text: "Uống **ngày 1 lần, thường buổi tối trước khi ngủ**; thuốc có tác dụng sau khoảng **8–12 giờ**. Bắt đầu liều thấp nhất, không đỡ mới tăng dần.", src: [0] }, { text: "**Không dùng quá 7 ngày** nếu bác sĩ / dược sĩ không dặn; **3 ngày không đỡ** thì đi khám.", src: [0] }, { text: "**Trẻ dưới 12 tuổi** chỉ dùng khi bác sĩ kê. Quên liều: bỏ qua, không uống 2 liều.", src: [0] }] }),
  row("beclometasone", "beclometasone (thuốc hít dự phòng hen)", "inhaler", ["beclometasone", "beclomethasone", "clenil", "qvar", "fostair", "becotide"], { sources: [S.becl], how: [{ text: "Là thuốc **dự phòng** — dùng **đều đặn mỗi ngày kể cả khi không có triệu chứng**, không phải thuốc cắt cơn.", src: [0] }, { text: "Nên dùng buồng đệm (spacer), **luôn khuyên dùng cho trẻ từ 15 tuổi trở xuống**; spacer còn giảm tác dụng phụ ở miệng, họng.", src: [0] }, { text: "Quên liều: dùng khi nhớ, gần tới liều sau thì bỏ qua — không dùng 2 liều.", src: [0] }], dose: { adult: [{ text: "Liều thường dùng: **1–2 nhát, ngày 2 lần** (bác sĩ có thể cho tới 4 lần/ngày).", src: [0] }], rx: true } }),
  row("nystatin", "nystatin (thuốc trị nấm miệng, nấm da)", "other", ["nystatin", "nystan", "mycostatin"], { sources: [S.nys], how: [{ text: "Dạng nước (nấm miệng / tưa lưỡi): uống **sau bữa ăn**, không pha với thức ăn, nước. Lắc chai, đong bằng xi-lanh / muỗng đong (không dùng muỗng ăn); **ngậm, súc khắp miệng ít nhất 30 giây** rồi nuốt; **chờ 30 phút** mới ăn uống.", src: [0] }, { text: "Trị nấm miệng thường khoảng 1 tuần, rồi **dùng thêm 2 ngày** sau khi hết.", src: [0] }, { text: "Kem / mỡ bôi: **2–3 lần/ngày**, thường **7–14 ngày**.", src: [0] }, { text: "Quên liều: dùng khi nhớ, trừ khi còn chưa tới 3 giờ là tới liều sau — không dùng 2 liều.", src: [0] }], dose: { adult: [{ text: "Dạng nước trị nấm miệng (người lớn, trẻ em, cả em bé): **1 ml × 4 lần/ngày**, mỗi lần cách ít nhất 3 giờ.", src: [0] }] } }),
  row("chlorhexidine", "chlorhexidine (nước súc miệng / sát khuẩn)", "other", ["chlorhexidine", "chlorhexidin", "corsodyl", "nuoc suc mieng chlorhexidine"], { sources: [S.chx], how: [{ text: "Súc miệng: **10 ml**, súc khoảng **1 phút** rồi nhổ ra, **ngày 2 lần**; **chờ 30 phút** mới ăn uống.", src: [0] }, { text: "Dùng **khác giờ đánh răng** (kem đánh răng làm thuốc kém tác dụng); nếu không được thì súc sạch sau khi đánh răng, chờ ít nhất 5 phút.", src: [0] }, { text: "Thường dùng tối đa **4 tuần**; loét miệng / nấm miệng thì dùng thêm 2 ngày sau khi hết. Dùng lâu hơn khuyến cáo **dễ ố vàng răng**.", src: [0] }] }),
  row("albendazole", "albendazole (thuốc tẩy giun)", "worm", ["zentel", "albendazole", "albendazol"], { sources: [S.albWho], how: [{ text: "Tẩy giun định kỳ (WHO, cho trẻ gái vị thành niên và phụ nữ không mang thai): **một liều duy nhất 400 mg, 1 lần/năm**; vùng nhiễm giun nhiều (trên 50%) thì **2 lần/năm**.", src: [0] }, { text: "Bệnh sán (sán lợn, sán chó) bác sĩ kê đợt dài, thường uống **cùng bữa ăn, ngày 2 lần**.", src: [0] }, { text: "Có thể gây hại thai nhi: **đang hoặc có thể đang mang thai thì hỏi bác sĩ trước**; tránh có thai trong lúc dùng và 3 ngày sau liều cuối.", src: [0] }, { text: "Trẻ nhỏ: liều theo hộp thuốc hoặc hỏi bác sĩ / dược sĩ.", src: [0] }] }),
  row("mupirocin", "mupirocin (kháng sinh bôi da)", "skin", ["bactroban", "mupirocin", "mupirocine"], { sources: [S.mup], how: [{ text: "Rửa sạch chỗ da nhiễm trùng, bôi **lớp mỏng, ngày 3 lần, trong 1–2 tuần**; có thể đắp gạc vô trùng.", src: [0] }, { text: "Chỉ dùng ngoài da — **tránh mắt, mũi, miệng** (trừ loại dành riêng cho mũi).", src: [0] }, { text: "Dùng hết đợt mà vẫn còn dấu hiệu nhiễm trùng thì đi khám. Quên lần bôi: bôi khi nhớ, gần tới lần sau thì bỏ qua.", src: [0] }] }),
  row("dextromethorphan", "dextromethorphan (thuốc giảm ho khan)", "coughrx", ["dextromethorphan", "dextromethorphane", "delsym"], { sources: [S.dxm], how: [{ text: "Thường uống **mỗi 4–12 giờ khi cần** (tuỳ loại); siro đong bằng dụng cụ đi kèm, **không dùng muỗng ăn**.", src: [0] }, { text: "**Không cho trẻ dưới 4 tuổi** dùng.", src: [0] }, { text: "Đang dùng thuốc trầm cảm nhóm MAOI (hoặc mới ngưng trong 2 tuần) thì báo bác sĩ / dược sĩ trước.", src: [0] }, { text: "Ho **7 ngày không đỡ**, hoặc ho kèm sốt, phát ban, đau đầu → ngưng thuốc và đi khám.", src: [0] }] }),
  row("pseudoephedrine", "pseudoephedrine (thuốc thông mũi uống)", "coughrx", ["sudafed", "pseudoephedrine", "pseudoephedrin"], { sources: [S.pse], how: [{ text: "Viên nuốt nguyên với nước, lúc no hay đói đều được; dùng **ngắn ngày**, triệu chứng nặng hơn hoặc không đỡ thì đi khám.", src: [0] }, { text: "Có thể gây **khó ngủ**. Quên liều: uống liều sau khi cần, cách ít nhất 4 giờ — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi: **1 viên** (siro: 10 ml = 60 mg) mỗi lần, **tối đa 4 lần trong 24 giờ, cách nhau ít nhất 4 giờ**.", src: [0] }], kid: [{ text: "Trẻ **6–11 tuổi**: siro 5 ml (30 mg) mỗi lần (viên thì hỏi bác sĩ / dược sĩ), **không quá 5 ngày**; **trẻ từ 5 tuổi trở xuống không dùng**.", src: [0] }] } }),
  row("aspirin", "aspirin (liều thấp chống đông: aspirin 75–81 mg)", "rx", ["aspirin", "aspirin 81", "aspirin 75", "aspirin ph8", "aspilets"], { sources: [S.asp], how: [{ text: "Aspirin liều giảm đau thì nên uống **cùng hoặc sau bữa ăn**.", src: [0] }, { text: "Aspirin liều thấp thường uống **1 viên ngày 1 lần**; viên sủi / phân tán thì hoà tan trong ly nước rồi uống.", src: [0] }, { text: "Đang uống thường xuyên thì **tiếp tục cho tới khi bác sĩ bảo ngưng** — đừng tự ngưng.", src: [0] }, { text: "🚫 **Không cho trẻ từ 15 tuổi trở xuống uống aspirin** (hiếm nhưng có thể gây hội chứng Reye).", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }] }),
  row("levonorgestrel", "levonorgestrel (thuốc tránh thai khẩn cấp)", "other", ["postinor", "postinor 1", "postinor 2", "levonorgestrel", "levonelle"], { sources: [S.ec], how: [{ text: "Viên levonorgestrel (vd Postinor) phải uống **trong vòng 3 ngày (72 giờ)** sau quan hệ; hiệu quả phụ thuộc vào việc **uống sớm hay muộn** sau quan hệ.", src: [0] }, { text: "Loại ulipristal (ellaOne) uống được **trong vòng 5 ngày (120 giờ)**.", src: [0] }, { text: "Đây là biện pháp **khẩn cấp**, không thay cho tránh thai thường xuyên — hỏi dược sĩ / bác sĩ về cách tránh thai lâu dài.", src: [0] }] }),
  row("ors", "oresol (muối bù nước ORS)", "gi", ["oresol", "hydrite", "orezol", "dung dich bu nuoc"], { sources: [S.ors], how: [{ text: "Rửa tay, rửa sạch ly / bình; **pha đúng lượng nước sạch ghi trên gói** (gói 1 lít thì pha 1 lít), khuấy tới khi tan hết — không pha đặc hơn hay loãng hơn.", src: [0] }, { text: "Lượng uống trong ngày khi tiêu chảy / nôn: em bé, trẻ mới biết đi khoảng **½ lít**, trẻ lớn khoảng **1 lít**, người lớn khoảng **3 lít**.", src: [0] }, { text: "Em bé **vẫn tiếp tục bú mẹ**. Đi khám càng sớm càng tốt nếu nặng, vừa đi vừa cho uống oresol.", src: [0] }] }),
  // ── 04/11 (đợt 3) — thuốc mạn tính, thần kinh, tiết niệu, nam / nữ khoa: trang thuốc NHS đọc ngày 04/11/2026 ──
  row("nitrofurantoin", "nitrofurantoin (kháng sinh trị nhiễm trùng tiểu)", "abx", ["nitrofurantoin", "macrobid", "macrodantin"], { sources: [S.nitro], how: [{ text: "Uống **cùng hoặc sau bữa ăn / bữa phụ** (hấp thu tốt hơn, đỡ khó chịu dạ dày); nuốt nguyên viên, không nhai, không bẻ.", src: [0] }, { text: "Trị nhiễm trùng tiểu thường **3–7 ngày** — **uống hết đợt** dù đã đỡ.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Trị nhiễm trùng tiểu (người lớn): viên phóng thích chậm **100 mg ngày 2 lần**, hoặc viên thường **50 mg ngày 4 lần** (nặng: 100 mg ngày 4 lần).", src: [0] }], kid: [{ text: "Trẻ em: liều thấp hơn, bác sĩ tính theo cân nặng / tuổi.", src: [0] }], rx: true } }),
  row("mebeverine", "mebeverine (chống co thắt ruột)", "gi", ["mebeverine", "mebeverin", "duspatalin", "colofac"], { sources: [S.meb2], how: [{ text: "Uống khoảng **20 phút trước bữa ăn**. Viên nén thường ngày 3 lần, viên nang ngày 2 lần — lượng và thời gian dùng tuỳ bệnh.", src: [0] }, { text: "Người lớn và trẻ **từ 10 tuổi** dùng được.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("tranexamic-acid", "acid tranexamic (thuốc cầm máu)", "rx", ["transamin", "tranexamic", "acid tranexamic", "axit tranexamic", "cyklokapron"], { sources: [S.txa], how: [{ text: "Rong kinh / kinh nhiều: thường dùng **4 ngày** mỗi kỳ; uống lúc no hay đói đều được.", src: [0] }, { text: "Uống quá liều mà mắt nhìn mờ, hoặc chân tay sưng đau đỏ nóng → gọi bác sĩ ngay; khó thở, đau ngực, ho ra máu → **gọi 115**.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Kinh nhiều (người lớn): thường **2 viên 500 mg × 3 lần/ngày** (có người 3 viên), bác sĩ có thể cho 2 viên × 4 lần/ngày.", src: [0] }] } }),
  row("fluconazole", "fluconazole (thuốc trị nấm uống)", "rx", ["fluconazole", "fluconazol", "diflucan", "canesten oral"], { sources: [S.flc], how: [{ text: "Uống lúc no hay đói đều được.", src: [0] }, { text: "Nấm âm đạo / nấm quy đầu: **một liều duy nhất**; các bệnh nấm khác uống theo đợt bác sĩ kê — đừng tự ngưng giữa chừng.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Nấm âm đạo / quy đầu (người lớn): **150 mg một liều duy nhất**. Nấm miệng: 50 mg/ngày trong 7–14 ngày.", src: [0] }], kid: [{ text: "Trẻ em: bác sĩ tính liều theo bệnh, tuổi và cân nặng.", src: [0] }] } }),
  row("tramadol", "tramadol (thuốc giảm đau gây nghiện, kê đơn)", "rx", ["tramadol", "tramadol hcl"], { sources: [S.tram], how: [{ text: "Liều do bác sĩ quyết định: viên thường / giọt uống ngày **3–4 lần**, viên phóng thích chậm ngày **1–2 lần** — **nuốt nguyên viên** phóng thích chậm, không bẻ, nghiền, nhai, ngậm.", src: [0] }, { text: "Dùng **vài tuần trở lên** thì **đừng tự ngưng** (dễ bị hội chứng cai) — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: **không uống 2 liều cùng lúc**; xem tờ hướng dẫn hoặc hỏi dược sĩ.", src: [0] }] }),
  row("budesonide-inhaler", "budesonide (thuốc hít dự phòng hen)", "inhaler", ["pulmicort", "budesonide", "budesonid", "budelin"], { sources: [S.bud], how: [{ text: "Là thuốc **dự phòng** — dùng **đều mỗi ngày kể cả khi không có triệu chứng**.", src: [0] }, { text: "Bình xịt định liều có corticoid nên dùng buồng đệm (spacer) — **luôn dùng cho trẻ từ 15 tuổi trở xuống**.", src: [0] }, { text: "Quên liều: dùng khi nhớ, gần tới liều sau thì bỏ qua — không dùng thêm để bù.", src: [0] }], dose: { adult: [{ text: "Liều thường dùng: **1–2 nhát, ngày 1–2 lần**; bác sĩ có thể cho nhiều hơn tuỳ mức độ.", src: [0] }], rx: true } }),
  row("mometasone-nasal", "mometasone xịt mũi (corticoid)", "nose", ["nasonex", "mometasone", "mometason"], { sources: [S.mom], how: [{ text: "Lắc nhẹ (bình mới / lâu không dùng thì xịt thử tới khi ra sương); xì mũi, bịt một bên, cúi đầu hơi về trước, giữ bình thẳng, vừa hít vào chậm bằng mũi vừa ấn xịt; thở ra bằng miệng.", src: [0] }, { text: "Dùng **14 ngày** mà không đỡ thì báo bác sĩ.", src: [0] }, { text: "Quên liều: dùng khi nhớ, gần tới liều sau thì bỏ qua — không xịt thêm để bù.", src: [0] }], dose: { adult: [{ text: "Viêm mũi dị ứng: **1–2 nhát mỗi bên mũi, ngày 1 lần**, không quá 2 nhát mỗi bên trong 24 giờ. Polyp mũi: 1–2 nhát mỗi bên, ngày 1–2 lần (tối đa 4 nhát mỗi bên / 24 giờ).", src: [0] }] } }),
  row("simvastatin", "simvastatin (thuốc mỡ máu)", "rx", ["simvastatin", "zocor"], { sources: [S.simv], how: [{ text: "Uống cùng giờ mỗi ngày, **thường buổi tối**; lúc no hay đói đều được.", src: [0] }, { text: "**Tránh nước bưởi chùm (grapefruit)** — làm thuốc không hiệu quả đúng.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường. **Đừng tự ngưng** — mỡ máu có thể tăng lại.", src: [0] }] }),
  row("furosemide", "furosemide (thuốc lợi tiểu)", "rx", ["furosemide", "furosemid", "lasix"], { sources: [S.furo], how: [{ text: "Uống cùng giờ mỗi ngày: ngày 1 lần thì **buổi sáng**; ngày 2 lần thì sáng và chiều muộn. Lúc no hay đói đều được.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("zolpidem", "zolpidem (thuốc ngủ, kê đơn)", "rx", ["zolpidem", "stilnox"], { drowsy: true, sources: [S.zolp], how: [{ text: "Uống **ngay trước khi lên giường** — thuốc có tác dụng sau khoảng 30 phút.", src: [0] }, { text: "Thường chỉ kê **2 ngày – 4 tuần**.", src: [0] }, { text: "Quên liều: bỏ qua, tối hôm sau uống như thường — **không uống 2 liều**.", src: [0] }], dose: { adult: [{ text: "Thường **10 mg trước khi ngủ**; người từ 65 tuổi hoặc bệnh gan / thận bác sĩ có thể cho 5 mg.", src: [0] }], rx: true } }),
  row("colecalciferol", "vitamin D3 (colecalciferol)", "supp", ["vitamin d3", "colecalciferol", "cholecalciferol"], { sources: [S.vitd], how: [{ text: "Viên nang / viên nén nuốt nguyên với nước, uống **cùng bữa ăn chính trong ngày**.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — không uống gấp đôi.", src: [0] }], dose: { adult: [{ text: "Duy trì / phòng thiếu (người lớn): **400 IU (10 microgam) mỗi ngày**. Điều trị thiếu vitamin D thì bác sĩ cho liều cao theo đợt rồi duy trì 800–2.000 IU/ngày.", src: [0] }], kid: [{ text: "Em bé dưới 1 tuổi: **340–400 IU/ngày**; trẻ 1–4 tuổi: **400 IU/ngày**.", src: [0] }] } }),
  row("tamsulosin", "tamsulosin (thuốc phì đại tuyến tiền liệt)", "rx", ["tamsulosin", "harnal", "flomax", "tamsulosine"], { sources: [S.tams], how: [{ text: "Uống **buổi sáng sau bữa sáng** (hoặc bữa ăn / bữa phụ đầu tiên trong ngày), cùng giờ mỗi ngày; **nuốt nguyên viên**, không bẻ, nhai, nghiền.", src: [0] }, { text: "Quên liều: nhớ ra trong ngày thì uống; sang ngày hôm sau thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Liều thường dùng (phì đại tuyến tiền liệt, sỏi thận): **400 microgam ngày 1 lần**.", src: [0] }], rx: true } }),
  row("fluoxetine", "fluoxetine (thuốc chống trầm cảm)", "rx", ["fluoxetine", "fluoxetin", "prozac"], { sources: [S.flx], how: [{ text: "Bác sĩ thường cho liều thấp, có thể tăng sau 3–4 tuần; thuốc **cần vài tuần** mới thấy đỡ — cứ uống đều.", src: [0] }, { text: "**Đừng tự ngưng đột ngột** (dễ bị triệu chứng cai) — bác sĩ sẽ giảm liều dần qua vài tuần / vài tháng.", src: [0] }] }),
  row("sertraline", "sertraline (thuốc chống trầm cảm)", "rx", ["sertraline", "sertralin", "zoloft", "lustral"], { sources: [S.sert], how: [{ text: "Uống **1 viên ngày 1 lần, cùng giờ** (sáng hoặc tối), với nước, lúc no hay đói đều được. Bác sĩ thường cho liều thấp rồi tăng sau một tuần trở lên.", src: [0] }, { text: "Tác dụng phụ thường **dịu dần sau vài tuần**; điều trị trầm cảm thường kéo dài vài tháng trở lên.", src: [0] }, { text: "**Đừng tự ngưng đột ngột** — bác sĩ sẽ giảm dần. Nên **tránh rượu bia và nước bưởi chùm**.", src: [0] }, { text: "Quên liều: bỏ qua, hôm sau uống như thường — không uống 2 liều.", src: [0] }] }),
  row("diazepam", "diazepam (thuốc an thần, kê đơn)", "rx", ["diazepam", "seduxen", "valium"], { drowsy: true, sources: [S.dzp], how: [{ text: "Chỉ dùng **ngắn hạn, tối đa khoảng 4 tuần** — dùng lâu dễ **lệ thuộc (nghiện)** và bị triệu chứng cai; muốn ngưng thì bác sĩ giảm liều dần.", src: [0] }, { text: "**Không uống rượu bia, nước bưởi chùm** khi đang dùng.", src: [0] }, { text: "Gây **buồn ngủ**: đừng lái xe, đạp xe, dùng máy móc tới khi tỉnh táo hẳn.", src: [0] }] }),
  row("lisinopril", "lisinopril (thuốc huyết áp)", "rx", ["lisinopril", "zestril"], { sources: [S.lisi], how: [{ text: "Uống **cùng giờ mỗi ngày**; bác sĩ thường cho liều thấp rồi tăng dần. Ăn uống bình thường, nên hạn chế rượu bia.", src: [0] }, { text: "Thấy chóng mặt, buồn ngủ thì đừng lái xe tới khi hết.", src: [0] }, { text: "Đừng tự ngưng. Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("ramipril", "ramipril (thuốc huyết áp, tim mạch)", "rx", ["ramipril", "tritace"], { sources: [S.rami], how: [{ text: "Uống ngày 1–2 lần, **cùng giờ mỗi ngày**, nuốt nguyên viên với nước, lúc no hay đói đều được.", src: [0] }, { text: "**Liều đầu** bác sĩ có thể dặn uống **trước khi ngủ** vì dễ chóng mặt; không chóng mặt thì sau đó uống giờ nào cũng được.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Khởi đầu thường **1,25–2,5 mg ngày 1 lần**, tăng dần qua vài tuần; tối đa **10 mg/ngày** (hoặc 5 mg × 2 lần).", src: [0] }], rx: true } }),
  row("enalapril", "enalapril (thuốc huyết áp)", "rx", ["enalapril", "renitec", "innovace", "ednyt"], { sources: [S.enal], how: [{ text: "Uống **cùng giờ mỗi ngày** với một ly nước; ăn uống bình thường. Bác sĩ thường cho liều thấp rồi tăng dần qua vài tuần.", src: [0] }, { text: "Dùng lâu dài theo đơn **dù đã thấy khoẻ**.", src: [0] }, { text: "Thường **không dùng khi mang thai** (ảnh hưởng em bé) — có thai hoặc định có thai thì báo bác sĩ để đổi thuốc.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }] }),
  row("nifedipine", "nifedipine (thuốc huyết áp, đau thắt ngực)", "rx", ["nifedipine", "nifedipin", "adalat", "coracten"], { sources: [S.nife], how: [{ text: "Uống **1–3 lần/ngày** tuỳ loại viên, liều theo đơn bác sĩ; lúc no hay đói đều được.", src: [0] }, { text: "**Tránh bưởi chùm / nước bưởi chùm** (tăng tác dụng phụ).", src: [0] }, { text: "Quên liều: uống khi nhớ rồi chờ **ít nhất 12 giờ** mới uống liều sau — không uống 2 liều. Đừng tự ngưng.", src: [0] }] }),
  row("sumatriptan", "sumatriptan (thuốc cắt cơn đau nửa đầu)", "rx", ["sumatriptan", "imigran"], { sources: [S.suma], how: [{ text: "Uống **ngay khi bắt đầu đau đầu** (không uống lúc mới có dấu hiệu báo trước).", src: [0] }, { text: "Đỡ rồi đau lại thì có thể uống thêm cùng liều **sau 2 giờ**. Dạng xịt mũi: tối đa 2 liều / 24 giờ.", src: [0] }], dose: { adult: [{ text: "Viên: thường **50 mg** (cơn nặng có người cần 100 mg); **tối đa 300 mg trong 24 giờ**.", src: [0] }], rx: true } }),
  row("sildenafil", "sildenafil (thuốc trị rối loạn cương)", "rx", ["sildenafil", "viagra"], { sources: [S.sild], how: [{ text: "Thường uống **1 viên khoảng 1 giờ trước khi quan hệ**; ăn no bữa lớn có thể làm thuốc tác dụng chậm hơn.", src: [0] }, { text: "**Không quá 1 viên mỗi ngày** (tác dụng có thể kéo dài tới 36 giờ). Tránh bưởi chùm / nước bưởi chùm.", src: [0] }, { text: "Cương **đau kéo dài hơn 4 giờ** là tác dụng phụ nghiêm trọng → đi khám ngay.", src: [0] }] }),
  row("hyoscine-hydrobromide", "hyoscine hydrobromide (chống say xe)", "other", ["kwells", "scopoderm", "hyoscine hydrobromide", "joy rides"], { sources: [S.hyo], how: [{ text: "Viên: uống **ít nhất 20–30 phút trước khi đi** (hoặc ngay khi thấy buồn nôn); đi xa có thể uống lại **mỗi 6 giờ**. Liều theo hướng dẫn trên hộp.", src: [0] }, { text: "Miếng dán: dán **sau tai 5–6 giờ trước chuyến đi** (hoặc tối hôm trước), gỡ khi tới nơi; giữ tối đa **72 giờ**, chỉ dán **1 miếng mỗi lần**.", src: [0] }] }),
  row("propranolol", "propranolol (thuốc chẹn beta)", "rx", ["propranolol", "dorocardyl", "inderal"], { sources: [S.prop], how: [{ text: "Uống lúc no hay đói đều được, nhưng **mỗi ngày uống cùng một cách**.", src: [0] }, { text: "**Đừng tự ngưng đột ngột** — bệnh có thể nặng hơn; bác sĩ giảm liều dần trong 1–2 tuần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Lo âu: **40 mg ngày 1 lần**, có thể tăng tới 40 mg × 3 lần/ngày. Huyết áp cao: khởi đầu **80 mg × 2 lần/ngày**, tối đa 160 mg × 2 lần/ngày.", src: [0] }], rx: true } }),
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
  const medCtx = /\b(thuoc|vien|uong|siro|goi|ong|boi|thoa|xit|nho|kem|gel|mo|hit|dan)\b/.test(n);
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

export type IndexAspect = "how" | "what" | "side" | "preg";
const bl = (xs: DrugFact[]) => xs.map((x) => `• ${x.text}`).join("\n");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Lời đáp cho thuốc trong danh mục. */
export function renderIndexed(hit: { drug: IndexedDrug; typed: string; fuzzy: boolean; brand: string }, aspect: IndexAspect, now = Date.now()): string {
  const { drug: d } = hit;
  const g = GROUPS[d.group];
  const shownBrand = cap(hit.brand);
  const ing0 = normalizeVi(d.ingredient).split(/[\s(+]/)[0];
  const isIngredient = normalizeVi(d.ingredient).startsWith(hit.brand) || edit(hit.brand, ing0, 2) <= 2;
  const head = `💊 ${hit.fuzzy ? `Lomi hiểu là **${shownBrand}** nha (bạn gõ “${hit.typed}”). ` : ""}**${isIngredient ? cap(d.ingredient) : shownBrand}**${isIngredient ? "" : ` — hoạt chất **${d.ingredient}**`}${d.group === "other" ? "." : `, thuộc nhóm **${g.label}**.`}`;
  const parts: string[] = [head];
  // nguồn đã dùng: gom theo đối tượng nguồn (ý của thuốc trỏ vào d.sources, ý của nhóm trỏ vào g.sources)
  const usedSrc = new Set<DrugSource>();
  const use = (xs: DrugFact[], from: DrugSource[]) => xs.forEach((x) => x.src.forEach((i) => from[i] && usedSrc.add(from[i])));
  const own = d.sources ?? [];
  if (aspect === "preg") {
    // 04/11: "bà bầu uống zentel được không" — trước đây rơi vào bảng MÓN ĂN khi mang thai ("không có trong danh sách món cần tránh")
    //   → sai hẳn với thuốc. Chỉ nêu ý CÓ NGUỒN của thuốc nhắc tới thai kỳ / cho con bú, không tự suy là an toàn.
    const PG = /\b(thai|bau|cho con bu|me cho con bu)\b/;
    const lines = [...(d.how ?? []), ...(d.care ?? []), ...(d.side ?? [])].filter((x) => PG.test(normalizeVi(x.text)));
    if (lines.length) {
      parts.push(`🤰 **Nguồn nói về thai kỳ / cho con bú:**\n${bl(lines)}`);
      use(lines, own);
    }
    parts.push(`Lomi **chưa có nguồn đã kiểm chứng** khẳng định **${isIngredient ? cap(d.ingredient) : shownBrand}** an toàn khi mang thai hay cho con bú, nên **đừng tự dùng** — hỏi **bác sĩ / dược sĩ** trước, nói rõ bạn đang mang thai (tháng thứ mấy) hoặc đang cho con bú.`);
    const list = [...usedSrc];
    if (list.length) parts.push(sourceLine({ sources: list, verifiedAt: VERIFIED }, list.map((_, i) => i), now));
    return parts.join("\n\n");
  }
  if (aspect === "side") {
    const dz = d.drowsy === true ? "Đây là loại **gây buồn ngủ**." : d.drowsy === false ? "Đây thuộc loại **ít gây buồn ngủ** (non-drowsy) theo nguồn — vẫn có người bị, uống lần đầu nên để ý." : "";
    // (ý về rượu bia / buồn ngủ nằm trong phần cách dùng của thuốc → đưa luôn vào đây)
    const howX = (d.how ?? []).filter((x) => /rượu|buồn ngủ|lái xe/u.test(x.text));
    const lines = [...(d.side ?? []), ...(g.side ?? []), ...(d.care ?? []), ...(g.care ?? []), ...howX];
    if (lines.length || dz) {
      parts.push(`⚠️ **Tác dụng phụ / lưu ý theo nguồn:**\n${dz ? `• ${dz}${lines.length ? "\n" : ""}` : ""}${bl(lines)}`);
      use([...(d.side ?? []), ...(d.care ?? []), ...howX], own);
      use([...(g.side ?? []), ...(g.care ?? [])], g.sources);
      if (dz) g.sources[0] && usedSrc.add(g.sources[0]);
    } else parts.push("Lomi **chưa có dữ liệu tác dụng phụ** có nguồn cho riêng thuốc này — tờ hướng dẫn trong hộp có mục tác dụng phụ; thấy bất thường thì ngưng và hỏi dược sĩ / bác sĩ.");
  } else {
    const how = d.how?.length ? d.how : g.how ?? [];
    if (how.length) {
      parts.push(`📋 **Cách dùng theo nguồn:**\n${bl(how)}`);
      use(how, d.how?.length ? own : g.sources);
      if (d.how?.length && g.how?.length && d.group === "abx") {
        parts.push(`💡 **Với mọi kháng sinh:**\n${bl(g.how.slice(0, 2))}`);
        use(g.how.slice(0, 2), g.sources);
      }
    } else if (d.group === "rx" || d.group === "steroid")
      parts.push("Đây là **thuốc kê đơn** — uống đúng giờ, đúng liều như đơn bác sĩ ghi; muốn ngưng, đổi liều hay quên liều thì hỏi lại bác sĩ / dược sĩ đã kê, **đừng tự ngưng**.");
    else parts.push("Lomi **chưa có hướng dẫn cách dùng** có nguồn cho riêng thuốc này — cách uống (trước / sau ăn, mấy lần) xem **tờ hướng dẫn trong hộp** hoặc hỏi **dược sĩ** lúc mua.");
    const care = [...(d.care ?? []), ...(g.care ?? [])];
    if (care.length) {
      parts.push(`⚠️ **Lưu ý:**\n${bl(care)}`);
      use(d.care ?? [], own);
      use(g.care ?? [], g.sources);
    }
  }
  if (aspect === "what" && d.dose)
    parts.push(`📏 Muốn xem **liều tham khảo** theo nguồn thì hỏi Lomi “${isIngredient ? d.id : hit.brand} ${({ skin: "bôi sao", eye: "nhỏ sao", nose: "xịt sao", inhaler: "xịt sao" } as Partial<Record<GroupId, string>>)[d.group] ?? "uống liều bao nhiêu"}” nha.`);
  else if (aspect !== "side" && d.dose) {
    parts.push(`📏 **Liều tham khảo theo nguồn${d.dose.rx ? " (thuốc kê đơn — liều của bạn do bác sĩ quyết định)" : " cho người lớn"}:**\n${bl(d.dose.adult)}${d.dose.kid?.length ? `\n👶 ${d.dose.kid.map((x) => x.text).join(" ")}` : "\n👶 Trẻ em: liều theo tuổi / cân nặng — xem nhãn thuốc dành cho trẻ hoặc hỏi dược sĩ."}`);
    use([...d.dose.adult, ...(d.dose.kid ?? [])], own);
    parts.push("ℹ️ Liều trên để **đọc tham khảo** — liều thực tế còn tuỳ **hàm lượng viên** bạn có, tuổi, cân nặng, bệnh gan / thận, đang mang thai hay cho con bú và thuốc khác đang dùng: luôn đối chiếu **tờ hướng dẫn trong hộp** hoặc hỏi **dược sĩ / bác sĩ**.");
  } else if (aspect !== "side")
    parts.push("📏 Lomi **chưa có liều tham khảo** có nguồn cho thuốc này — liều tuỳ hàm lượng viên, tuổi, cân nặng, bệnh nền: xem **tờ hướng dẫn trong hộp** / đơn bác sĩ, hoặc hỏi dược sĩ. Mang thai, cho con bú, cho trẻ nhỏ dùng thì hỏi trước nha.");
  if (usedSrc.size) {
    const list = [...usedSrc];
    parts.push(sourceLine({ sources: list, verifiedAt: VERIFIED }, list.map((_, i) => i), now));
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
export const hasSideFacts = (d: IndexedDrug): boolean => !!(d.side?.length || d.care?.length || GROUPS[d.group].side?.length || d.drowsy !== undefined);
/** Thuốc / nhóm có ý về rượu bia có nguồn. */
export const hasAlcoholFact = (d: IndexedDrug): boolean => [...(d.care ?? []), ...(d.how ?? []), ...(GROUPS[d.group].care ?? [])].some((x) => /rượu/u.test(x.text));
