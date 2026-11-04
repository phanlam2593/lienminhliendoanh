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
  coam: { title: "Co-amoxiclav", publisher: NHS, url: "https://www.nhs.uk/medicines/co-amoxiclav/", reviewed: "2026-04-14" },
  carbo: { title: "How and when to take carbocisteine", publisher: NHS, url: "https://www.nhs.uk/medicines/carbocisteine/how-and-when-to-take-carbocisteine/", reviewed: "2023-03-03" },
  dexa: { title: "How and when to take dexamethasone tablets and liquid", publisher: NHS, url: "https://www.nhs.uk/medicines/dexamethasone-tablets-and-liquid/how-and-when-to-take-dexamethasone-tablets-and-liquid/", reviewed: "2023-09-07" },
  rosu: { title: "Rosuvastatin", publisher: NHS, url: "https://www.nhs.uk/medicines/rosuvastatin/", reviewed: "2026-06-29" },
  prom: { title: "How and when to take promethazine", publisher: NHS, url: "https://www.nhs.uk/medicines/promethazine/how-and-when-to-take-promethazine/", reviewed: "2025-05-21" },
  glic: { title: "How and when to take gliclazide", publisher: NHS, url: "https://www.nhs.uk/medicines/gliclazide/how-and-when-to-take-gliclazide/", reviewed: "2026-08-06" },
  peri: { title: "How and when to take perindopril", publisher: NHS, url: "https://www.nhs.uk/medicines/perindopril/how-and-when-to-take-perindopril/", reviewed: "2026-01-07" },
  clar: { title: "How and when to take clarithromycin", publisher: NHS, url: "https://www.nhs.uk/medicines/clarithromycin/how-and-when-to-take-clarithromycin/", reviewed: "2026-03-25" },
  panto: { title: "How and when to take pantoprazole", publisher: NHS, url: "https://www.nhs.uk/medicines/pantoprazole/how-and-when-to-take-pantoprazole/", reviewed: "2025-07-31" },
  lanso: { title: "How and when to take lansoprazole", publisher: NHS, url: "https://www.nhs.uk/medicines/lansoprazole/how-and-when-to-take-lansoprazole/", reviewed: "2025-12-03" },
  cefu: { title: "Cefuroxime", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a601206.html", reviewed: "2026-06-15" },
  cefi: { title: "Cefixime", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a690007.html", reviewed: "2026-07-15" },
  cefa2: { title: "Cefadroxil", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a682730.html", reviewed: "2026-06-15" },
  levo: { title: "Levofloxacin", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a697040.html", reviewed: "2026-08-15" },
  deslo: { title: "Desloratadine", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a602002.html", reviewed: "2026-03-15" },
  cele: { title: "Celecoxib", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a699022.html", reviewed: "2021-03-15" },
  melo: { title: "Meloxicam", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a601242.html", reviewed: "2024-07-20" },
  rabe: { title: "Rabeprazole", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a699060.html", reviewed: "2023-11-15" },
  sime: { title: "Simethicone", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a682683.html", reviewed: "2018-02-15" },
  mpred: { title: "Methylprednisolone", publisher: "MedlinePlus (NIH)", url: "https://medlineplus.gov/druginfo/meds/a682795.html", reviewed: "2017-09-15" },
  cocod: { title: "How and when to take co-codamol for adults", publisher: NHS, url: "https://www.nhs.uk/medicines/co-codamol-for-adults/how-and-when-to-take-co-codamol-for-adults/", reviewed: "2023-10-30" },
  acri: { title: "How and when to take acrivastine", publisher: NHS, url: "https://www.nhs.uk/medicines/acrivastine/how-and-when-to-take-acrivastine/", reviewed: "2025-04-02" },
  proc: { title: "How and when to take prochlorperazine", publisher: NHS, url: "https://www.nhs.uk/medicines/prochlorperazine/how-and-when-to-take-prochlorperazine/", reviewed: "2023-09-07" },
  betaS: { title: "How and when to use betamethasone for skin", publisher: NHS, url: "https://www.nhs.uk/medicines/betamethasone-skin/how-and-when-to-use-betamethasone-for-skin/", reviewed: "2023-11-13" },
  beclN: { title: "How and when to use beclometasone nasal spray", publisher: NHS, url: "https://www.nhs.uk/medicines/beclometasone-nasal-spray/how-and-when-to-use-beclometasone-nasal-spray/", reviewed: "2026-10-29" },
  momS: { title: "How and when to use mometasone for skin", publisher: NHS, url: "https://www.nhs.uk/medicines/mometasone-for-skin/how-and-when-to-use-mometasone-for-skin/", reviewed: "2024-01-24" },
  apix: { title: "How and when to take apixaban", publisher: NHS, url: "https://www.nhs.uk/medicines/apixaban/how-and-when-to-take-apixaban/", reviewed: "2026-01-21" },
  doxa: { title: "How and when to take doxazosin", publisher: NHS, url: "https://www.nhs.uk/medicines/doxazosin/how-and-when-to-take-doxazosin/", reviewed: "2026-08-03" },
  alen: { title: "How and when to take alendronic acid", publisher: NHS, url: "https://www.nhs.uk/medicines/alendronic-acid/how-and-when-to-take-alendronic-acid/", reviewed: "2025-05-07" },
  inda: { title: "How and when to take indapamide", publisher: NHS, url: "https://www.nhs.uk/medicines/indapamide/how-and-when-to-take-indapamide/", reviewed: "2026-07-03" },
  empa: { title: "How and when to take empagliflozin", publisher: NHS, url: "https://www.nhs.uk/medicines/empagliflozin/how-and-when-to-take-empagliflozin/", reviewed: "2023-02-02" },
  sita: { title: "How and when to take sitagliptin", publisher: NHS, url: "https://www.nhs.uk/medicines/sitagliptin/how-and-when-to-take-sitagliptin/", reviewed: "2026-08-19" },
  mela: { title: "How and when to take melatonin", publisher: NHS, url: "https://www.nhs.uk/medicines/melatonin/how-and-when-to-take-melatonin/", reviewed: "2023-02-13" },
  penv: { title: "How and when to take phenoxymethylpenicillin", publisher: NHS, url: "https://www.nhs.uk/medicines/phenoxymethylpenicillin/how-and-when-to-take-phenoxymethylpenicillin/", reviewed: "2022-01-26" },
  trim: { title: "How and when to take trimethoprim", publisher: NHS, url: "https://www.nhs.uk/medicines/trimethoprim/how-and-when-to-take-trimethoprim/", reviewed: "2025-11-26" },
  hcq: { title: "How and when to take hydroxychloroquine", publisher: NHS, url: "https://www.nhs.uk/medicines/hydroxychloroquine/how-and-when-to-take-hydroxychloroquine/", reviewed: "2026-01-14" },
  ery: { title: "How and when to take erythromycin", publisher: NHS, url: "https://www.nhs.uk/medicines/erythromycin/how-and-when-to-take-erythromycin/", reviewed: "2026-07-28" },
  lata: { title: "How and when to use latanoprost", publisher: NHS, url: "https://www.nhs.uk/medicines/latanoprost/how-and-when-to-use-latanoprost/", reviewed: "2023-02-20" },
  timo: { title: "How and when to use timolol eye drops", publisher: NHS, url: "https://www.nhs.uk/medicines/timolol-eye-drops/how-and-when-to-use-timolol-eye-drops/", reviewed: "2026-08-04" },
  macro: { title: "Macrogol", publisher: NHS, url: "https://www.nhs.uk/medicines/macrogol/", reviewed: "2026-05-13" },
  esci: { title: "Escitalopram", publisher: NHS, url: "https://www.nhs.uk/medicines/escitalopram/", reviewed: "2026-06-18" },
  cand: { title: "Candesartan", publisher: NHS, url: "https://www.nhs.uk/medicines/candesartan/", reviewed: "2026-03-18" },
  dapa: { title: "Dapagliflozin", publisher: NHS, url: "https://www.nhs.uk/medicines/dapagliflozin/", reviewed: "2026-06-26" },
  mag: { title: "Vitamins and minerals – Others (zinc, magnesium…)", publisher: NHS, url: "https://www.nhs.uk/conditions/vitamins-and-minerals/others/", reviewed: "2020-08-03" },
  cita: { title: "How and when to take citalopram", publisher: NHS, url: "https://www.nhs.uk/medicines/citalopram/how-and-when-to-take-citalopram/", reviewed: "2026-06-26" },
  mirt: { title: "How and when to take mirtazapine", publisher: NHS, url: "https://www.nhs.uk/medicines/mirtazapine/how-and-when-to-take-mirtazapine/", reviewed: "2026-08-18" },
  amit: { title: "How and when to take amitriptyline for depression", publisher: NHS, url: "https://www.nhs.uk/medicines/amitriptyline-for-depression/how-and-when-to-take-amitriptyline-for-depression/", reviewed: "2025-02-28" },
  preg: { title: "How and when to take pregabalin", publisher: NHS, url: "https://www.nhs.uk/medicines/pregabalin/how-and-when-to-take-pregabalin/", reviewed: "2026-01-20" },
  beta: { title: "How and when to take betahistine", publisher: NHS, url: "https://www.nhs.uk/medicines/betahistine/how-and-when-to-take-betahistine/", reviewed: "2022-08-24" },
  fluc: { title: "How and when to take flucloxacillin", publisher: NHS, url: "https://www.nhs.uk/medicines/flucloxacillin/how-and-when-to-take-flucloxacillin/", reviewed: "2025-06-26" },
  fina: { title: "How and when to take finasteride", publisher: NHS, url: "https://www.nhs.uk/medicines/finasteride/how-and-when-to-take-finasteride/", reviewed: "2023-08-02" },
  riva: { title: "How and when to take rivaroxaban", publisher: NHS, url: "https://www.nhs.uk/medicines/rivaroxaban/how-and-when-to-take-rivaroxaban/", reviewed: "2026-08-05" },
  aten: { title: "How and when to take atenolol", publisher: NHS, url: "https://www.nhs.uk/medicines/atenolol/how-and-when-to-take-atenolol/", reviewed: "2022-04-05" },
  ismn: { title: "How and when to take isosorbide mononitrate and isosorbide dinitrate", publisher: NHS, url: "https://www.nhs.uk/medicines/isosorbide-mononitrate-dinitrate/how-and-when-to-take-isosorbide-mononitrate-and-isosorbide-dinitrate/", reviewed: "2024-08-27" },
  clobe: { title: "How and when to use clobetasone", publisher: NHS, url: "https://www.nhs.uk/medicines/clobetasone/how-and-when-to-use-clobetasone/", reviewed: "2022-10-06" },
  pepp: { title: "How and when to take peppermint oil", publisher: NHS, url: "https://www.nhs.uk/medicines/peppermint-oil/how-and-when-to-take-peppermint-oil/", reviewed: "2025-03-25" },
  gaba: { title: "How and when to take gabapentin", publisher: NHS, url: "https://www.nhs.uk/medicines/gabapentin/how-and-when-to-take-gabapentin/", reviewed: "2026-02-19" },
  fybo: { title: "How and when to take Fybogel", publisher: NHS, url: "https://www.nhs.uk/medicines/fybogel-ispaghula-husk/how-and-when-to-take-fybogel/", reviewed: "2026-01-13" },
  gtn: { title: "How and when to take glyceryl trinitrate (GTN)", publisher: NHS, url: "https://www.nhs.uk/medicines/glyceryl-trinitrate-gtn/how-and-when-to-take-glyceryl-trinitrate-gtn/", reviewed: "2023-04-12" },
  lyme: { title: "How and when to take lymecycline", publisher: NHS, url: "https://www.nhs.uk/medicines/lymecycline/how-and-when-to-take-lymecycline/", reviewed: "2026-04-13" },
  iso: { title: "How and when to take isotretinoin capsules", publisher: NHS, url: "https://www.nhs.uk/medicines/isotretinoin-capsules/how-and-when-to-take-isotretinoin-capsules/", reviewed: "2026-06-26" },
  carbi: { title: "How and when to take carbimazole", publisher: NHS, url: "https://www.nhs.uk/medicines/carbimazole/how-and-when-to-take-carbimazole/", reviewed: "2025-05-01" },
  vera: { title: "How and when to take verapamil", publisher: NHS, url: "https://www.nhs.uk/medicines/verapamil/how-and-when-to-take-verapamil/", reviewed: "2025-03-13" },
  carv: { title: "How and when to take carvedilol", publisher: NHS, url: "https://www.nhs.uk/medicines/carvedilol/how-and-when-to-take-carvedilol/", reviewed: "2024-07-05" },
  digo: { title: "How and when to take digoxin", publisher: NHS, url: "https://www.nhs.uk/medicines/digoxin/how-and-when-to-take-digoxin/", reviewed: "2023-03-22" },
  irbe: { title: "How and when to take irbesartan", publisher: NHS, url: "https://www.nhs.uk/medicines/irbesartan/how-and-when-to-take-irbesartan/", reviewed: "2026-06-05" },
  dilt: { title: "How and when to take diltiazem", publisher: NHS, url: "https://www.nhs.uk/medicines/diltiazem/how-and-when-to-take-diltiazem/", reviewed: "2023-03-10" },
  venl: { title: "How and when to take venlafaxine", publisher: NHS, url: "https://www.nhs.uk/medicines/venlafaxine/how-and-when-to-take-venlafaxine/", reviewed: "2026-07-06" },
  quet: { title: "How and when to take quetiapine", publisher: NHS, url: "https://www.nhs.uk/medicines/quetiapine/how-and-when-to-take-quetiapine/", reviewed: "2026-02-24" },
  dulo: { title: "How and when to take duloxetine", publisher: NHS, url: "https://www.nhs.uk/medicines/duloxetine/how-and-when-to-take-duloxetine/", reviewed: "2026-06-18" },
  lora: { title: "How and when to take lorazepam", publisher: NHS, url: "https://www.nhs.uk/medicines/lorazepam/how-and-when-to-take-lorazepam/", reviewed: "2023-02-14" },
  zopi: { title: "How and when to take zopiclone", publisher: NHS, url: "https://www.nhs.uk/medicines/zopiclone/how-and-when-to-take-zopiclone/", reviewed: "2026-06-22" },
  done: { title: "How and when to take donepezil", publisher: NHS, url: "https://www.nhs.uk/medicines/donepezil/how-and-when-to-take-donepezil/", reviewed: "2023-03-15" },
  lamo: { title: "How and when to take lamotrigine", publisher: NHS, url: "https://www.nhs.uk/medicines/lamotrigine/how-and-when-to-take-lamotrigine/", reviewed: "2026-01-12" },
  topi: { title: "How and when to take topiramate", publisher: NHS, url: "https://www.nhs.uk/medicines/topiramate/how-and-when-to-take-topiramate/", reviewed: "2026-07-29" },
  valp: { title: "How and when to take sodium valproate", publisher: NHS, url: "https://www.nhs.uk/medicines/sodium-valproate/how-and-when-to-take-sodium-valproate/", reviewed: "2025-03-11" },
  oxyb: { title: "How and when to take oxybutynin", publisher: NHS, url: "https://www.nhs.uk/medicines/oxybutynin/how-and-when-to-take-oxybutynin/", reviewed: "2024-08-16" },
  soli: { title: "How and when to take solifenacin", publisher: NHS, url: "https://www.nhs.uk/medicines/solifenacin/how-and-when-to-take-solifenacin/", reviewed: "2024-07-02" },
  risp: { title: "How and when to take risperidone", publisher: NHS, url: "https://www.nhs.uk/medicines/risperidone/how-and-when-to-take-risperidone/", reviewed: "2025-04-15" },
  olan: { title: "How and when to take olanzapine", publisher: NHS, url: "https://www.nhs.uk/medicines/olanzapine/how-and-when-to-take-olanzapine/", reviewed: "2025-02-19" },
  leve: { title: "How and when to take levetiracetam", publisher: NHS, url: "https://www.nhs.uk/medicines/levetiracetam/how-and-when-to-take-levetiracetam/", reviewed: "2026-07-29" },
  carba: { title: "How and when to take carbamazepine", publisher: NHS, url: "https://www.nhs.uk/medicines/carbamazepine/how-and-when-to-take-carbamazepine/", reviewed: "2026-08-06" },
  arip: { title: "How and when to take aripiprazole", publisher: NHS, url: "https://www.nhs.uk/medicines/aripiprazole/how-and-when-to-take-aripiprazole/", reviewed: "2023-04-06" },
  paro: { title: "How and when to take paroxetine", publisher: NHS, url: "https://www.nhs.uk/medicines/paroxetine/how-and-when-to-take-paroxetine/", reviewed: "2026-07-23" },
  benz: { title: "How and when to use benzydamine", publisher: NHS, url: "https://www.nhs.uk/medicines/benzydamine/how-and-when-to-use-benzydamine/", reviewed: "2024-07-08" },
  mph: { title: "How and when to take methylphenidate for adults", publisher: NHS, url: "https://www.nhs.uk/medicines/methylphenidate-adults/how-and-when-to-take-methylphenidate-for-adults/", reviewed: "2025-03-25" },
  cycl: { title: "How and when to take cyclizine", publisher: NHS, url: "https://www.nhs.uk/medicines/cyclizine/how-and-when-to-take-cyclizine/", reviewed: "2022-04-01" },
  codyd: { title: "How and when to take co-dydramol", publisher: NHS, url: "https://www.nhs.uk/medicines/co-dydramol/how-and-when-to-take-co-dydramol/", reviewed: "2023-08-09" },
  dhc: { title: "How and when to take dihydrocodeine", publisher: NHS, url: "https://www.nhs.uk/medicines/dihydrocodeine/how-and-when-to-take-dihydrocodeine/", reviewed: "2022-11-17" },
  mesa: { title: "How and when to take mesalazine", publisher: NHS, url: "https://www.nhs.uk/medicines/mesalazine/how-and-when-to-take-mesalazine/", reviewed: "2025-03-06" },
  vare: { title: "How and when to take varenicline", publisher: NHS, url: "https://www.nhs.uk/medicines/varenicline/how-and-when-to-take-varenicline/", reviewed: "2025-01-24" },
  ffum: { title: "How and when to take ferrous fumarate", publisher: NHS, url: "https://www.nhs.uk/medicines/ferrous-fumarate/how-and-when-to-take-ferrous-fumarate/", reviewed: "2026-03-13" },
  orli: { title: "Orlistat", publisher: NHS, url: "https://www.nhs.uk/medicines/orlistat/", reviewed: "2026-05-06" },
  spiro: { title: "Spironolactone", publisher: NHS, url: "https://www.nhs.uk/medicines/spironolactone/", reviewed: "2026-05-06" },
  tada: { title: "Tadalafil", publisher: NHS, url: "https://www.nhs.uk/medicines/tadalafil/", reviewed: "2026-05-13" },
  nrt: { title: "Quit smoking with nicotine replacement therapies (NRTs) – Better Health", publisher: NHS, url: "https://www.nhs.uk/better-health/quit-smoking/ready-to-quit-smoking/quit-with-nicotine-replacement-therapies-nrt/", reviewed: "2026-08-10" },
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
  row("meloxicam", "meloxicam", "nsaid", ["mobic", "meloxicam"], { sources: [S.melo], how: [{ text: "Thường uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được; dạng hỗn dịch thì lắc kỹ trước khi dùng.", src: [0] }, { text: "Thuốc nhóm NSAID có thể tăng nguy cơ **nhồi máu cơ tim, đột quỵ** và gây **loét, chảy máu dạ dày** (dùng lâu, lớn tuổi, uống nhiều rượu thì nguy cơ cao hơn). Đau ngực, khó thở, yếu một bên người, nói đớ → **gọi 115**; phân đen, nôn ra máu → ngưng thuốc, đi khám ngay.", src: [0] }] }),
  row("celecoxib", "celecoxib", "nsaid", ["celebrex", "celecoxib"], { sources: [S.cele], how: [{ text: "Thường uống **ngày 1–2 lần**, cùng giờ; liều tới 200 mg uống lúc no hay đói đều được, **liều trên 200 mg thì uống cùng bữa ăn**.", src: [0] }, { text: "Khó nuốt viên nang thì có thể mở ra, rắc lên một muỗng táo nghiền rồi nuốt hết, uống thêm nước.", src: [0] }, { text: "Thuốc nhóm NSAID có thể tăng nguy cơ **nhồi máu cơ tim, đột quỵ** và gây **loét, chảy máu dạ dày** (dùng lâu, lớn tuổi, uống nhiều rượu thì nguy cơ cao hơn). Đau ngực, khó thở, yếu một bên người, nói đớ → **gọi 115**; phân đen, nôn ra máu → ngưng thuốc, đi khám ngay.", src: [0] }] }),
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
  row("amox-clav", "amoxicillin + acid clavulanic", "abx", ["augmentin", "klamentin", "curam", "amoxiclav", "co amoxiclav"], { sources: [S.coam], how: [{ text: "Thường uống **ngày 3 lần**, **cùng bữa ăn** (đỡ buồn nôn); các liều cách nhau ít nhất 4 giờ. Dạng nước đong bằng xi-lanh / muỗng đi kèm.", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ trị không dứt và vi khuẩn dễ kháng thuốc.", src: [0] }, { text: "Quên liều: uống khi nhớ rồi chờ **ít nhất 4 giờ** mới uống liều sau; gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }] }),
  row("cefuroxime", "cefuroxime", "abx", ["zinnat", "cefuroxime", "cefuroxim"], { sources: [S.cefu], how: [{ text: "Viên thường uống **mỗi 12 giờ**, trong **5–20 ngày** tuỳ bệnh; lúc no hay đói đều được, cùng giờ mỗi ngày.", src: [0] }, { text: "**Nuốt nguyên viên** (viên nghiền rất đắng).", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ trị không dứt và vi khuẩn dễ kháng thuốc.", src: [0] }, { text: "Vài ngày đầu phải thấy đỡ dần — không đỡ hoặc nặng hơn thì báo bác sĩ.", src: [0] }] }),
  row("cefixime", "cefixime", "abx", ["cefixime", "cefixim", "suprax"], { sources: [S.cefi], how: [{ text: "Uống **mỗi 12 hoặc 24 giờ** theo đơn, lúc no hay đói đều được, cùng giờ mỗi ngày.", src: [0] }, { text: "Viên nhai thì **nhai kỹ** trước khi nuốt (khó nhai có thể nghiền).", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ trị không dứt và vi khuẩn dễ kháng thuốc.", src: [0] }] }),
  row("cefalexin", "cefalexin (cephalexin)", "abx", ["cefalexin", "cephalexin", "keflex"], { sources: [S.cefa], how: [{ text: "Uống **lúc no hay đói đều được**; chia liều đều trong ngày (vd ngày 3 lần: sáng, giữa chiều, trước khi ngủ).", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm nhiễm trùng dễ quay lại.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau; các liều cách nhau **ít nhất 4 giờ**, không uống 2 liều cùng lúc.", src: [0] }], dose: { adult: [{ text: "Người lớn thường được kê **500 mg, ngày 2–3 lần**; nhiễm trùng nặng có thể cao hơn, trẻ em thấp hơn.", src: [0] }], rx: true } }),
  row("cefadroxil", "cefadroxil", "abx", ["cefadroxil"], { sources: [S.cefa2], how: [{ text: "Uống **mỗi 12 hoặc 24 giờ** theo đơn; lúc no hay đói đều được — **uống cùng bữa ăn** cho đỡ buồn nôn. Dạng hỗn dịch lắc kỹ trước khi dùng.", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ trị không dứt và vi khuẩn dễ kháng thuốc.", src: [0] }] }),
  row("azithromycin", "azithromycin", "abx", ["zithromax", "azithromycin", "azithromycine", "azicine", "azithromycin 500"], { sources: [S.azi], how: [{ text: "Uống **ngày 1 lần, cùng giờ**. Viên nén / nang: uống **trước ăn ít nhất 1 giờ hoặc sau ăn 2 giờ**; dạng siro uống lúc nào cũng được.", src: [0] }, { text: "Thuốc dạ dày (antacid) thì uống azithromycin **trước 1 giờ hoặc sau 2 giờ**.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, trừ khi gần tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn thường được kê **500 mg/ngày trong 3–10 ngày** tuỳ bệnh; có bệnh chỉ cần một liều cao duy nhất (1–2 g) theo bác sĩ.", src: [0] }], rx: true } }),
  row("clarithromycin", "clarithromycin", "abx", ["klacid", "clarithromycin", "clarithromycine"], { sources: [S.clar], how: [{ text: "Viên thường uống **ngày 2 lần**, lúc no hay đói đều được; viên phóng thích chậm thường **ngày 1 lần**.", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ trị không dứt và vi khuẩn dễ kháng thuốc. Uống 7–10 ngày vẫn không đỡ thì hỏi lại bác sĩ.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Người lớn thường **250–500 mg, ngày 2 lần**; viên phóng thích chậm 500 mg ngày 1 lần (nặng: 1 g).", src: [0] }], kid: [{ text: "Trẻ em: liều thấp hơn theo bác sĩ.", src: [0] }], rx: true } }),
  row("ciprofloxacin", "ciprofloxacin", "abx", ["ciprofloxacin", "ciprobay", "ciprofloxacine", "cipro"], { sources: [S.cip], how: [{ text: "Uống **lúc no hay đói đều được**, nhưng **tránh uống cùng sữa, phô mai, sữa chua** (làm thuốc kém tác dụng).", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ, gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn thường được kê **250–750 mg, ngày 2 lần**; trẻ em và người bệnh thận thường liều thấp hơn.", src: [0] }], rx: true } }),
  row("levofloxacin", "levofloxacin", "abx", ["levofloxacin", "levofloxacine", "tavanic", "levaquin"], { sources: [S.levo], how: [{ text: "Uống theo lịch bác sĩ (thường mỗi 24 giờ), cùng giờ; viên lúc no hay đói đều được, **dạng nước uống trước ăn 1 giờ hoặc sau ăn 2 giờ**. Uống **nhiều nước**.", src: [0] }, { text: "Thuốc dạ dày (antacid), viên sắt, kẽm, vitamin khoáng chất: uống **cách levofloxacin ít nhất 2 giờ**.", src: [0] }, { text: "Có thể gây **viêm / đứt gân** (nhất là người trên 60 tuổi): đau, sưng gân → ngưng thuốc, nghỉ và gọi bác sĩ; nghe “phựt” ở gân, không đứng được → đi cấp cứu.", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ trị không dứt và vi khuẩn dễ kháng thuốc.", src: [0] }] }),
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
  row("desloratadine", "desloratadine", "antihis", ["aerius", "desloratadine", "desloratadin", "clarinex"], { sources: [S.deslo], how: [{ text: "Uống **ngày 1 lần**, cùng giờ, lúc no hay đói đều được.", src: [0] }, { text: "Viên tan trong miệng: tay khô bóc vỉ, đặt ngay lên lưỡi, tan rồi nuốt (có hoặc không cần nước).", src: [0] }] }),
  row("chlorphenamine", "chlorphenamine (clorpheniramin)", "antihis", ["chlorphenamine", "chlorpheniramine", "clorpheniramin", "clorpheniramine", "chlorpheniramin", "piriton"], {
    drowsy: true,
    sources: [S.chlor],
    how: [{ text: "Uống **lúc no hay đói đều được**; quên liều thì uống ngay khi nhớ, trừ khi gần tới liều sau — **không uống bù gấp đôi**.", src: [0] }],
    dose: {
      adult: [{ text: "Người lớn và trẻ **từ 12 tuổi**: **1 viên mỗi 4–6 giờ**, **không quá 6 viên trong 24 giờ**.", src: [0] }],
      kid: [{ text: "Trẻ **dưới 12 tuổi** dùng liều thấp hơn; **không cho trẻ dưới 6 tuổi** thuốc ho / cảm có chlorphenamine; bé **dưới 1 tuổi** chỉ dùng khi bác sĩ kê.", src: [0] }],
    },
  }),
  row("promethazine", "promethazine", "antihis", ["phenergan", "promethazine", "promethazin"], { drowsy: true, sources: [S.prom], how: [{ text: "Say xe: uống **25 mg tối hôm trước chuyến đi** (một số loại chỉ cần uống trước 1–2 giờ).", src: [0] }, { text: "Gây **buồn ngủ**.", src: [0] }, { text: "Quên liều: dùng cho say xe thì uống ngay khi nhớ; dùng việc khác thì bỏ qua, uống liều sau như thường — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Dị ứng (người lớn, trẻ từ 10 tuổi): **10 mg × 2 lần/ngày**, tối đa 20 mg × 3 lần/ngày — hoặc 25 mg × 1–2 lần/ngày. Say xe: 25 mg tối hôm trước.", src: [0] }], kid: [{ text: "Trẻ **từ 9 tuổi trở xuống**: liều thấp hơn — xem hộp thuốc hoặc hỏi dược sĩ.", src: [0] }] } }),
  row("diphenhydramine", "diphenhydramine", "antihis", ["diphenhydramine", "diphenhydramin"], { drowsy: true }),
  row("cinnarizine", "cinnarizine (chống say xe, chóng mặt)", "antihis", ["stugeron", "cinnarizine", "cinnarizin"], { drowsy: true, sources: [S.cinn], how: [{ text: "Say xe: uống **sau khi ăn**, **2 giờ trước khi đi**; trong chuyến đi cần thì uống thêm mỗi 8 giờ.", src: [0] }, { text: "Gây **buồn ngủ**: đừng lái xe, đi xe đạp, dùng máy móc; **không nên uống rượu bia** khi dùng.", src: [0] }, { text: "Chóng mặt / bệnh Ménière: theo liều bác sĩ kê.", src: [0] }], dose: { adult: [{ text: "Say xe (viên 15 mg) — người lớn và trẻ từ 12 tuổi: **2 viên** trước khi đi 2 giờ, sau đó **1 viên mỗi 8 giờ** nếu cần.", src: [0] }], kid: [{ text: "Trẻ **5–11 tuổi**: **1 viên** trước khi đi 2 giờ, sau đó **nửa viên mỗi 8 giờ** nếu cần.", src: [0] }] } }),
  row("omeprazole", "omeprazole", "ppi", ["losec", "omeprazole", "omeprazol"], {
    sources: [S.ome],
    dose: { adult: [{ text: "Liều tuỳ bệnh — thường **ngày 1 hoặc 2 lần** theo bác sĩ dặn. **Tự mua không có đơn thì không dùng quá 2 tuần**.", src: [0] }] },
  }),
  row("esomeprazole", "esomeprazole", "ppi", ["nexium", "esomeprazole", "esomeprazol"], { sources: [S.eso], how: [{ text: "Thường uống **ngày 1 lần, buổi sáng**, lúc no hay đói đều được; **nuốt nguyên viên** với nước lọc (không ga), không nhai, không nghiền.", src: [0] }, { text: "Tự mua uống **2 tuần mà không đỡ** thì đi khám.", src: [0] }, { text: "Quên liều (ngày 1 lần): uống khi nhớ, trừ khi còn chưa tới 12 giờ là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Ợ nóng, trào ngược: thường **20 mg/ngày**; trào ngược dạ dày thực quản (GERD) **20–40 mg/ngày**; loét dạ dày **20 mg/ngày** — liều cao hơn chỉ khi bác sĩ kê.", src: [0] }] } }),
  row("pantoprazole", "pantoprazole", "ppi", ["pantoloc", "pantoprazole", "pantoprazol"], { sources: [S.panto], how: [{ text: "Thường **ngày 1 lần, buổi sáng**, uống **khoảng 1 giờ trước bữa ăn**; nuốt nguyên viên với nước.", src: [0] }, { text: "Tự mua loại 20 mg (ợ nóng): dùng tới 2 tuần, đỡ thì thêm 2 tuần — **không quá 4 tuần** khi chưa hỏi bác sĩ.", src: [0] }, { text: "Quên liều (ngày 1 lần): uống khi nhớ, trừ khi chưa tới 12 giờ là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Ợ nóng, trào ngược: **20 mg/ngày**; GERD 20–40 mg/ngày; loét dạ dày 40 mg/ngày.", src: [0] }] } }),
  row("lansoprazole", "lansoprazole", "ppi", ["lansoprazole", "lansoprazol", "zoton"], { sources: [S.lanso], how: [{ text: "Thường **ngày 1 lần, buổi sáng**, uống **ít nhất 30 phút trước khi ăn**; nuốt nguyên viên nang với nước / nước trái cây (khó nuốt thì mở viên, trộn cốm vào đồ ăn mềm). Viên tan trong miệng thì để tan trên lưỡi.", src: [0] }, { text: "Thuốc dạ dày (antacid) uống cách lansoprazole ít nhất 2 giờ.", src: [0] }, { text: "Quên liều (ngày 1 lần): uống khi nhớ, trừ khi chưa tới 12 giờ là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Khó tiêu, trào ngược, loét dạ dày: **15–30 mg/ngày**.", src: [0] }] } }),
  row("rabeprazole", "rabeprazole", "ppi", ["pariet", "rabeprazole", "rabeprazol"], { sources: [S.rabe], how: [{ text: "Thường **ngày 1 lần**; loét dạ dày tá tràng thì uống **sau bữa sáng**; diệt H. pylori (cùng thuốc khác) uống ngày 2 lần cùng bữa sáng và tối trong 7 ngày.", src: [0] }, { text: "**Nuốt nguyên viên** với nước — không bẻ, nhai, nghiền. Đừng tự ngưng khi chưa hỏi bác sĩ.", src: [0] }] }),
  row("vit-b", "vitamin nhóm B tổng hợp", "vitb", ["beplex", "becozyme", "vitamin b complex", "b complex", "vitamin 3b", "3b"]),
  row("neurobion", "vitamin B1 + B6 + B12", "vitb", ["neurobion", "scanneuron"]),
  row("magne-b6", "magnesi + vitamin B6", "vitb", ["magne b6", "magneb6", "magnesium b6"], { sources: [S.mag], how: [{ text: "Người lớn (19–64 tuổi) cần khoảng **300 mg magnesi/ngày (nam)** và **270 mg/ngày (nữ)** — ăn uống đủ chất thường là đủ.", src: [0] }, { text: "Magnesi từ viên bổ sung **400 mg/ngày trở xuống** thì khó gây hại.", src: [0] }] }),
  row("ambroxol", "ambroxol", "mucus", ["mucosolvan", "ambroxol", "ambroxon", "halixol"]),
  row("bromhexine", "bromhexine", "mucus", ["bisolvon", "bromhexine", "bromhexin"]),
  row("acetylcysteine", "acetylcysteine", "mucus", ["acemuc", "acetylcysteine", "acetylcystein", "acc 200"]),
  row("carbocisteine", "carbocisteine", "mucus", ["carbocisteine", "carbocistein", "rhinathiol", "mucodyne"], { sources: [S.carbo], how: [{ text: "Uống lúc no hay đói đều được.", src: [0] }, { text: "Quên liều: uống khi nhớ, trừ khi còn chưa tới 2 giờ là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn: viên 375 mg **2 viên × 3 lần/ngày** (siro 15 ml × 3 lần/ngày); đỡ rồi giảm còn 1 viên × 4 lần/ngày (siro 10 ml × 3 lần/ngày).", src: [0] }], kid: [{ text: "Trẻ **2–4 tuổi**: 1,25–2,5 ml × 4 lần/ngày; **5–11 tuổi**: 5 ml × 3 lần/ngày; **12–17 tuổi**: 15 ml × 3 lần/ngày, đỡ thì 10 ml × 3 lần/ngày.", src: [0] }] } }),
  row("decolgen", "paracetamol + thuốc thông mũi + thuốc chống dị ứng", "cold", ["decolgen", "tiffy", "coldacmin", "rhumenol", "panadol cam cum"]),
  row("prednisolone", "prednisolone", "steroid", ["prednisolone", "prednisolon"], { sources: [S.pred], how: [{ text: "Thường uống **ngày 1 lần, buổi sáng cùng bữa sáng** (đỡ hại dạ dày, ít mất ngủ).", src: [0] }, { text: "**Đừng tự ngưng đột ngột**, nhất là khi dùng liều cao hoặc lâu ngày — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ; nếu đã sang ngày hôm sau thì bỏ qua — không uống gấp đôi.", src: [0] }], dose: { adult: [{ text: "Liều rất khác nhau, thường **5–60 mg/ngày**, bác sĩ có thể tăng / giảm theo bệnh.", src: [0] }], rx: true } }),
  row("methylprednisolone", "methylprednisolone", "steroid", ["medrol", "methylprednisolone", "methylprednisolon"], { sources: [S.mpred], how: [{ text: "Uống **cùng thức ăn hoặc sữa** (thuốc dễ gây khó chịu dạ dày), đúng lịch bác sĩ kê.", src: [0] }, { text: "**Đừng tự ngưng** — ngưng đột ngột (nhất là sau liều cao, dùng lâu) có thể gây chán ăn, nôn, mệt, sốt, đau khớp; bác sĩ sẽ giảm liều dần.", src: [0] }], dose: { adult: [{ text: "Liều do bác sĩ quyết định theo bệnh.", src: [0] }], rx: true } }),
  row("dexamethasone", "dexamethasone", "steroid", ["dexamethasone", "dexamethason"], { sources: [S.dexa], how: [{ text: "Uống **buổi sáng cùng hoặc ngay sau bữa sáng** — không uống lúc bụng đói.", src: [0] }, { text: "**Đừng tự ngưng đột ngột**, nhất là khi dùng liều cao lâu ngày — bác sĩ sẽ giảm dần.", src: [0] }, { text: "Quên liều (ngày 1 lần): uống khi nhớ; nếu đã sang hôm sau thì bỏ qua.", src: [0] }], dose: { adult: [{ text: "Thường **0,5–10 mg/ngày** (một số bệnh tới 16 mg/ngày) theo bác sĩ.", src: [0] }], rx: true } }),
  row("amlodipine", "amlodipine (thuốc huyết áp)", "rx", ["amlor", "amlodipine", "amlodipin"], {
    sources: [S.aml],
    how: [
      { text: "Thường uống **ngày 1 lần, cùng giờ mỗi ngày**; trước hay sau ăn đều được. Liều do bác sĩ quyết định.", src: [0] },
      { text: "**Tránh bưởi chùm và nước ép bưởi chùm** (dễ tăng tác dụng phụ).", src: [0] },
      { text: "Quên liều: bỏ liều đó, uống liều sau như thường; **không uống 2 liều** để bù. **Đừng tự ngưng** — ngưng đột ngột có thể nguy hiểm.", src: [0] },
    ],
  }),
  row("losartan", "losartan (thuốc huyết áp)", "rx", ["cozaar", "losartan"], { sources: [S.los], how: [{ text: "Thường uống **ngày 1 lần, cùng giờ mỗi ngày**, với nước, lúc no hay đói đều được. Liều do bác sĩ quyết định.", src: [0] }, { text: "Quên liều: uống liều sau như thường — **không uống 2 liều** để bù. **Đừng tự ngưng**.", src: [0] }] }),
  row("perindopril", "perindopril (thuốc huyết áp)", "rx", ["coversyl", "perindopril"], { sources: [S.peri], how: [{ text: "Thường **ngày 1 lần, buổi sáng trước bữa sáng**, cùng giờ mỗi ngày. **Liều đầu** bác sĩ có thể dặn uống trước khi ngủ vì dễ chóng mặt.", src: [0] }, { text: "Quên liều: nhớ trong ngày thì uống; sang hôm sau thì bỏ qua — không uống 2 liều. Đừng tự ngưng.", src: [0] }], dose: { adult: [{ text: "Perindopril erbumine: khởi đầu 2–4 mg/ngày, huyết áp cao thường **4 mg** (tối đa 8 mg). Perindopril arginine: 2,5–5 mg, huyết áp cao thường **5 mg** (tối đa 10 mg).", src: [0] }], rx: true } }),
  row("bisoprolol", "bisoprolol (thuốc tim mạch, huyết áp)", "rx", ["concor", "bisoprolol"], { sources: [S.biso], how: [{ text: "Thường uống **ngày 1 lần, buổi sáng**, cùng giờ mỗi ngày; ăn uống bình thường được. Bác sĩ hay cho liều thấp rồi tăng dần.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bệnh có thể nặng hơn; bác sĩ sẽ giảm dần nếu cần ngưng.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }] }),
  row("metformin", "metformin (thuốc tiểu đường)", "rx", ["glucophage", "metformin"], {
    sources: [S.met],
    how: [
      { text: "Uống **cùng bữa ăn**; nuốt nguyên viên với nước, **không nghiền, không nhai**. Ăn uống bình thường được.", src: [0] },
      { text: "Phần lớn người uống **1–3 lần/ngày**, liều tuỳ bệnh và tuổi — bác sĩ có thể cho liều thấp lúc đầu.", src: [0] },
      { text: "Quên liều: ngày 1 lần thì uống ngay khi nhớ; ngày nhiều lần mà gần tới liều sau thì bỏ liều quên; **không uống 2 liều** để bù.", src: [0] },
    ],
  }),
  row("gliclazide", "gliclazide (thuốc tiểu đường)", "rx", ["diamicron", "gliclazide", "gliclazid"], { sources: [S.glic], how: [{ text: "Thường **ngày 1–2 lần**, uống **sau bữa ăn** (đỡ khó chịu dạ dày); liều theo đáp ứng, do bác sĩ chỉnh.", src: [0] }, { text: "Có dấu hiệu **hạ đường huyết** (run, vã mồ hôi, đói cồn cào, lả) → **ăn / uống ngay thứ có đường**; hay bị thì đi khám. Buồn ngủ, chóng mặt thì đừng lái xe.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("atorvastatin", "atorvastatin (thuốc mỡ máu)", "rx", ["lipitor", "atorvastatin"], {
    sources: [S.ator],
    how: [
      { text: "Uống **ngày 1 lần, cùng giờ mỗi ngày**; lúc no hay đói đều được. Bác sĩ có thể cho liều thấp rồi tăng dần.", src: [0] },
      { text: "**Đừng uống nhiều nước ép bưởi chùm** (dễ tăng tác dụng phụ).", src: [0] },
      { text: "Quên liều: bỏ liều đó, uống liều sau như thường; **không uống 2 liều** để bù.", src: [0] },
    ],
  }),
  row("rosuvastatin", "rosuvastatin (thuốc mỡ máu)", "rx", ["crestor", "rosuvastatin"], { sources: [S.rosu], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được; thường dùng lâu dài.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường. **Đừng tự ngưng** — mỡ máu có thể tăng lại.", src: [0] }] }),
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
  // ── 04/11 (đợt 5) — trang thuốc NHS đọc ngày 04/11/2026 ──
  row("co-codamol", "paracetamol + codein (co-codamol)", "pain", ["co codamol", "cocodamol", "efferalgan codein", "efferalgan codeine", "paracetamol codein", "paracetamol codeine"], { sources: [S.cocod], how: [{ text: "Lúc no hay đói đều được; các liều cách nhau **ít nhất 4–6 giờ**.", src: [0] }, { text: "Thuốc **đã có paracetamol** — đừng uống thêm thuốc khác có paracetamol (Panadol, Efferalgan, Hapacol, thuốc cảm…).", src: [0] }, { text: "Tự mua thì **không dùng quá 3 ngày** — còn đau thì hỏi dược sĩ / bác sĩ (codein dùng lâu dễ lệ thuộc).", src: [0] }], dose: { adult: [{ text: "Người lớn: **1–2 viên** (mọi hàm lượng), **tối đa 4 lần/ngày**, **không quá 8 viên trong 24 giờ**.", src: [0] }] } }),
  row("acrivastine", "acrivastine (chống dị ứng)", "antihis", ["acrivastine", "benadryl allergy relief"], { sources: [S.acri], how: [{ text: "Lúc no hay đói đều được; uống với nước, sữa hoặc nước trái cây — **không uống với nước bưởi chùm**.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Người lớn tới 65 tuổi và trẻ từ 12 tuổi: **1 viên 8 mg, tối đa 3 lần/ngày** (không quá 3 viên / 24 giờ).", src: [0] }] } }),
  row("prochlorperazine", "prochlorperazine (chống nôn, chóng mặt)", "rx", ["prochlorperazine", "stemetil", "buccastem"], { sources: [S.proc], how: [{ text: "Thường uống **ngày 2–3 lần**, liều tuỳ bệnh theo bác sĩ; trẻ 1–17 tuổi liều theo cân nặng.", src: [0] }, { text: "Viên ngậm (Buccastem): đặt **giữa môi trên và lợi** cho tan, tốt nhất **sau bữa ăn**.", src: [0] }, { text: "Quên liều: dùng cho say xe thì uống ngay khi nhớ; việc khác thì bỏ qua — không uống 2 liều.", src: [0] }] }),
  row("betamethasone-skin", "betamethasone bôi da (corticoid mạnh)", "skin", ["betnovate", "betamethasone", "betamethason", "kem betamethasone"], { sources: [S.betaS], how: [{ text: "Kem / mỡ / lotion bôi **1–2 lần/ngày**, lớp mỏng — một đốt ngón tay kem đủ cho vùng rộng gấp đôi lòng bàn tay; không băng kín; tránh vùng da trầy.", src: [0] }, { text: "Thường dùng ngắn ngày: **2–4 tuần không đỡ** (trẻ em: 5 ngày) thì đi khám, **không quá 4 tuần** khi chưa hỏi bác sĩ. Bôi mặt thì hỏi bác sĩ / dược sĩ trước.", src: [0] }, { text: "Rửa tay trước và sau khi bôi; chờ 30 phút mới thoa sản phẩm khác.", src: [0] }] }),
  row("mometasone-skin", "mometasone bôi da (corticoid)", "skin", ["elocon", "mometasone cream", "kem mometasone"], { sources: [S.momS], how: [{ text: "Thường bôi **ngày 1 lần**, trong **1–2 tuần**; một đốt ngón tay kem đủ cho vùng rộng gấp đôi lòng bàn tay.", src: [0] }, { text: "Bôi mặt (khi bác sĩ cho) thường tối đa khoảng 5 ngày; **trẻ em không quá 5 ngày** nếu bác sĩ không dặn, không băng / bọc tã lên chỗ bôi.", src: [0] }, { text: "14 ngày không đỡ (trẻ em: 5 ngày) thì đi khám.", src: [0] }] }),
  row("beclometasone-nasal", "beclometasone xịt mũi (corticoid)", "nose", ["beconase", "beclometasone nasal"], { sources: [S.beclN], how: [{ text: "Cần **vài ngày** mới thấy tác dụng — cứ dùng đều. Thường kê cho trẻ **từ 6 tuổi**.", src: [0] }], dose: { adult: [{ text: "Bắt đầu **2 nhát mỗi bên mũi, ngày 2 lần**, đỡ thì có thể giảm còn 1 nhát; **tối đa 8 nhát (mỗi bên 4) trong 24 giờ**.", src: [0] }] } }),
  row("apixaban", "apixaban (thuốc chống đông)", "rx", ["apixaban", "eliquis"], { sources: [S.apix], how: [{ text: "Thường uống **ngày 2 lần, cùng giờ**; lúc no hay đói đều được. Liều và thời gian dùng tuỳ bệnh, theo bác sĩ.", src: [0] }, { text: "**Đừng tự ngưng** khi bác sĩ chưa bảo.", src: [0] }, { text: "Quên liều: uống ngay khi nhớ rồi tiếp tục như cũ; không chắc thì hỏi bác sĩ / dược sĩ.", src: [0] }] }),
  row("doxazosin", "doxazosin (thuốc huyết áp, tuyến tiền liệt)", "rx", ["doxazosin", "cardura", "carduran"], { sources: [S.doxa], how: [{ text: "Uống **ngày 1 lần, cùng giờ**; liều do bác sĩ quyết định. Ăn uống bình thường, nên tránh rượu bia.", src: [0] }, { text: "Chóng mặt thì đừng lái xe, đi xe đạp, dùng máy móc.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("alendronic-acid", "acid alendronic (thuốc loãng xương)", "rx", ["alendronate", "alendronic", "acid alendronic", "fosamax", "binosto"], { sources: [S.alen], how: [{ text: "Uống **lúc bụng đói, khoảng 30 phút trước bữa sáng**, với **một ly đầy nước lọc** (không dùng nước khoáng, trà, cà phê, nước trái cây, sữa).", src: [0] }, { text: "Uống xong **ngồi / đứng / đi lại thẳng người 30 phút**, không nằm; không uống lúc đi ngủ. Chờ rồi mới ăn hoặc uống thuốc khác.", src: [0] }, { text: "Quên liều: loại hằng tuần thì uống vào sáng hôm sau khi nhớ; loại hằng ngày thì bỏ qua — **không uống 2 viên trong một ngày**.", src: [0] }], dose: { adult: [{ text: "Người lớn thường **70 mg mỗi tuần 1 lần** (hoặc loại 10 mg mỗi ngày).", src: [0] }], rx: true } }),
  row("indapamide", "indapamide (thuốc lợi tiểu, huyết áp)", "rx", ["indapamide", "indapamid", "natrilix"], { sources: [S.inda], how: [{ text: "Thường uống **ngày 1 lần, buổi sáng**; liều do bác sĩ quyết định. Ăn uống bình thường.", src: [0] }, { text: "Quên liều: uống khi nhớ; gần tới liều sau thì bỏ qua — không uống 2 liều.", src: [0] }] }),
  row("empagliflozin", "empagliflozin (thuốc tiểu đường, tim, thận)", "rx", ["empagliflozin", "jardiance"], { sources: [S.empa], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được.", src: [0] }, { text: "Quên liều: còn từ 12 giờ trở lên mới tới liều sau thì uống ngay; dưới 12 giờ thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Thường **10 mg ngày 1 lần** (tiểu đường, suy tim, bệnh thận mạn); tiểu đường bác sĩ có thể tăng 25 mg.", src: [0] }], rx: true } }),
  row("dapagliflozin", "dapagliflozin (thuốc tiểu đường, tim, thận)", "rx", ["dapagliflozin", "forxiga"], { sources: [S.dapa], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được.", src: [0] }, { text: "Bị nôn, tiêu chảy, sốt (dễ mất nước) → hỏi dược sĩ / bác sĩ.", src: [0] }, { text: "Quên liều: uống khi nhớ, trừ khi còn chưa tới 12 giờ là tới liều sau — không uống 2 liều.", src: [0] }] }),
  row("sitagliptin", "sitagliptin (thuốc tiểu đường)", "rx", ["sitagliptin", "januvia"], { sources: [S.sita], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("melatonin-rx", "melatonin (thuốc hỗ trợ ngủ)", "other", ["circadin", "melatonin 2mg", "melatonin phong thich cham"], { sources: [S.mela], how: [{ text: "Viên phóng thích chậm uống **1–2 giờ trước khi ngủ**, tốt nhất **sau khi ăn**; **nuốt nguyên viên**, không bẻ, nghiền.", src: [0] }, { text: "Mất ngủ ngắn hạn thường dùng **1–4 tuần** (có khi tới 13 tuần).", src: [0] }, { text: "Quên liều: bỏ qua, tối hôm sau uống như thường.", src: [0] }], dose: { adult: [{ text: "Người lớn (mất ngủ ngắn hạn): **1 viên 2 mg phóng thích chậm**, 1–2 giờ trước khi ngủ.", src: [0] }], kid: [{ text: "Trẻ em, thiếu niên: do bác sĩ chuyên khoa kê — thường bắt đầu 2 mg, tối đa 10 mg/ngày.", src: [0] }] } }),
  row("phenoxymethylpenicillin", "penicillin V (phenoxymethylpenicillin)", "abx", ["penicillin v", "phenoxymethylpenicillin", "ospen", "penicilin v"], { sources: [S.penv], how: [{ text: "Uống **30 phút trước bữa ăn hoặc ít nhất 2 giờ sau ăn** (thức ăn làm thuốc kém tác dụng).", src: [0] }, { text: "Thường dùng **5–10 ngày** — **Uống hết đợt** dù đã đỡ — ngưng sớm dễ tái nhiễm.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Người lớn trị nhiễm trùng: **500 mg × 4 lần/ngày**.", src: [0] }], kid: [{ text: "Trẻ 1–11 tháng: 62,5 mg × 4 lần/ngày; 1–5 tuổi: 125 mg × 4 lần/ngày; 6–11 tuổi: 250 mg × 4 lần/ngày (theo đơn).", src: [0] }], rx: true } }),
  row("trimethoprim", "trimethoprim (kháng sinh trị nhiễm trùng tiểu)", "abx", ["trimethoprim"], { sources: [S.trim], how: [{ text: "Lúc no hay đói đều được; nuốt nguyên viên với nước.", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ tái nhiễm.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Nhiễm trùng tiểu: **200 mg × 2 lần/ngày** — thường **3 ngày** với phụ nữ và trẻ em, **7 ngày** với nam giới và bà bầu.", src: [0] }], rx: true } }),
  row("erythromycin", "erythromycin (kháng sinh)", "abx", ["erythromycin", "erythromycine", "erythrocin"], { sources: [S.ery], how: [{ text: "Thường uống **ngày 2–4 lần** trong vài ngày đến vài tuần; uống trước hay cùng bữa ăn thì **xem tờ hướng dẫn** của loại bạn có.", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ — ngưng sớm dễ tái nhiễm.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("hydroxychloroquine", "hydroxychloroquine (thuốc bệnh tự miễn)", "rx", ["hydroxychloroquine", "plaquenil"], { sources: [S.hcq], how: [{ text: "Nuốt nguyên viên **cùng bữa ăn hoặc một ly sữa**; thường ngày 1–2 lần, dùng ít nhất 6 tháng — cần **vài tuần** mới có tác dụng.", src: [0] }, { text: "Thuốc dạ dày (antacid) có thể làm giảm hấp thu — hỏi dược sĩ nên uống cách bao lâu.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("latanoprost", "latanoprost (thuốc nhỏ mắt trị glôcôm)", "eye", ["latanoprost", "xalatan", "monopost"], { sources: [S.lata], how: [{ text: "Nhỏ **1 giọt vào mắt bệnh, ngày 1 lần, tốt nhất buổi tối**.", src: [0] }, { text: "Tháo kính áp tròng trước khi nhỏ, chờ **15 phút** mới đeo lại; dùng thêm thuốc nhỏ mắt khác thì **cách ít nhất 5 phút**.", src: [0] }, { text: "Quên liều: bỏ qua, hôm sau nhỏ như thường — không nhỏ gấp đôi.", src: [0] }] }),
  row("timolol-eye", "timolol (thuốc nhỏ mắt trị glôcôm)", "eye", ["timolol", "timoptol", "tiopex"], { sources: [S.timo], how: [{ text: "Số giọt và số lần mỗi ngày theo bác sĩ. Rửa tay trước; nhỏ xong **nhắm mắt, ấn nhẹ góc mắt trong (cạnh mũi) 2 phút**.", src: [0] }, { text: "Quên liều: nhỏ khi nhớ, gần tới liều sau thì bỏ qua — không nhỏ gấp đôi.", src: [0] }] }),
  row("macrogol", "macrogol (thuốc nhuận tràng thẩm thấu)", "gi", ["macrogol", "movicol", "laxido", "forlax", "cosmocol"], { sources: [S.macro], how: [{ text: "Bột pha **với nước** theo hướng dẫn trên gói. Người lớn và trẻ **từ 12 tuổi** dùng được; trẻ 2–11 tuổi chỉ dùng khi bác sĩ kê.", src: [0] }, { text: "Uống **2 tuần** vẫn táo bón thì đi khám.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("escitalopram", "escitalopram (thuốc chống trầm cảm, lo âu)", "rx", ["escitalopram", "cipralex", "lexapro"], { sources: [S.esci], how: [{ text: "Thường uống **ngày 1 lần**, lúc no hay đói đều được; bác sĩ hay cho liều thấp rồi tăng sau vài tuần — cần **vài tuần** mới thấy đỡ.", src: [0] }, { text: "**Đừng tự ngưng đột ngột** (dễ bị triệu chứng cai) — bác sĩ sẽ giảm dần. Nên **tránh rượu bia** (tăng buồn ngủ).", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("candesartan", "candesartan (thuốc huyết áp, suy tim)", "rx", ["candesartan", "atacand", "amias"], { sources: [S.cand], how: [{ text: "Thường uống **ngày 1 lần, cùng giờ**; bác sĩ hay cho liều thấp rồi tăng sau 2–4 tuần. Ăn uống bình thường, nên tránh rượu bia.", src: [0] }, { text: "**Không dùng khi mang thai** — có thai hoặc định có thai thì báo bác sĩ để đổi thuốc.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("citalopram", "citalopram (thuốc chống trầm cảm)", "rx", ["citalopram", "cipramil"], { sources: [S.cita], how: [{ text: "Uống **ngày 1 lần** (sáng hoặc tối), lúc no hay đói đều được; bác sĩ có thể cho liều thấp rồi tăng sau vài tuần — cần **vài tuần** mới thấy đỡ.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("mirtazapine", "mirtazapine (thuốc chống trầm cảm)", "rx", ["mirtazapine", "mirtazapin", "remeron", "zispin"], { drowsy: true, sources: [S.mirt], how: [{ text: "Thường uống **ngày 1 lần, trước khi ngủ** (thuốc gây buồn ngủ); ăn uống bình thường.", src: [0] }, { text: "Thường có tác dụng sau **1–2 tuần**; thường dùng ít nhất 4–6 tháng.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }] }),
  row("amitriptyline", "amitriptyline (thuốc chống trầm cảm, đau thần kinh)", "rx", ["amitriptyline", "amitriptylin", "elavil"], { sources: [S.amit], how: [{ text: "Trị trầm cảm thường uống **ngày 2 lần**, lúc no hay đói đều được; dùng tiếp nhiều tháng sau khi đã đỡ.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Trầm cảm (người lớn): thường **50 mg/ngày**, chia **25 mg × 2 lần**.", src: [0] }], rx: true } }),
  row("pregabalin", "pregabalin (thuốc động kinh, đau thần kinh, lo âu)", "rx", ["pregabalin", "lyrica"], { sources: [S.preg], how: [{ text: "Viên thường chia **2–3 lần/ngày**, viên phóng thích chậm ngày 1 lần; lúc no hay đói đều được, cùng giờ mỗi ngày.", src: [0] }, { text: "**Đừng ngưng đột ngột** — dễ bị triệu chứng cai; bác sĩ giảm dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, trừ khi còn chưa tới 2 giờ là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Thường **150–600 mg/ngày** (chia 2–3 lần).", src: [0] }], rx: true } }),
  row("betahistine", "betahistine (thuốc chóng mặt Ménière)", "rx", ["betahistine", "betahistin", "betaserc", "serc"], { sources: [S.beta], how: [{ text: "Uống **sau bữa ăn** (đỡ khó chịu dạ dày), **ngày 3 lần, cách 6–8 giờ**.", src: [0] }, { text: "Phòng triệu chứng Ménière có thể phải dùng nhiều tháng, nhiều năm.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Thường **16 mg × 3 lần/ngày**; đỡ rồi bác sĩ có thể giảm còn 8 mg.", src: [0] }], rx: true } }),
  row("flucloxacillin", "flucloxacillin (kháng sinh)", "abx", ["flucloxacillin", "floxapen"], { sources: [S.fluc], how: [{ text: "Uống **lúc đói: ít nhất 1 giờ trước ăn hoặc 2 giờ sau ăn**, ngày 4 lần cách đều.", src: [0] }, { text: "**Uống hết đợt** dù đã đỡ; 3–5 ngày không đỡ hoặc nặng hơn thì báo bác sĩ.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Người lớn thường **250–500 mg × 4 lần/ngày**.", src: [0] }], kid: [{ text: "Trẻ em: liều thấp hơn theo bác sĩ — đong bằng xi-lanh / muỗng đi kèm.", src: [0] }], rx: true } }),
  row("finasteride", "finasteride (thuốc phì đại tuyến tiền liệt, rụng tóc)", "rx", ["finasteride", "finasterid", "proscar", "propecia"], { sources: [S.fina], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được; **nuốt nguyên viên**, không bẻ, nghiền.", src: [0] }, { text: "Thường dùng lâu dài — ngưng thì triệu chứng hay quay lại.", src: [0] }, { text: "Quên liều: trễ dưới 6 giờ thì uống ngay; trễ hơn thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Phì đại tuyến tiền liệt: **5 mg/ngày**; rụng tóc: **1 mg/ngày**.", src: [0] }], rx: true } }),
  row("rivaroxaban", "rivaroxaban (thuốc chống đông)", "rx", ["rivaroxaban", "xarelto"], { sources: [S.riva], how: [{ text: "Uống **ngày 1–2 lần, cùng giờ, cùng bữa ăn**.", src: [0] }, { text: "**Đừng tự ngưng** — ngưng đột ngột có thể nguy hiểm.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("atenolol", "atenolol (thuốc chẹn beta)", "rx", ["atenolol", "tenormin"], { sources: [S.aten], how: [{ text: "Lúc no hay đói đều được, nhưng **mỗi ngày uống cùng một cách**.", src: [0] }, { text: "**Đừng ngưng đột ngột**, nhất là khi có bệnh tim — hỏi bác sĩ trước.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Huyết áp cao: **25–50 mg/ngày**; loạn nhịp: 50–100 mg/ngày; đau thắt ngực: 100 mg/ngày (hoặc 50 mg × 2).", src: [0] }], rx: true } }),
  row("isosorbide", "isosorbide mononitrate / dinitrate (thuốc đau thắt ngực)", "rx", ["isosorbide", "isosorbid", "imdur", "isosorbide mononitrate", "isosorbide dinitrate"], { sources: [S.ismn], how: [{ text: "Viên phóng thích chậm: **nuốt nguyên với nước**, không nhai, nghiền.", src: [0] }, { text: "Bác sĩ có thể dặn **khoảng nghỉ không dùng nitrat 4–14 giờ** (thường ban đêm) để thuốc giữ hiệu quả.", src: [0] }, { text: "Quên liều: xem tờ hướng dẫn hoặc hỏi dược sĩ.", src: [0] }], dose: { adult: [{ text: "Đau thắt ngực: isosorbide mononitrate thường 10 mg × 2 lần/ngày; loại phóng thích chậm **25–60 mg ngày 1 lần**.", src: [0] }], rx: true } }),
  row("clobetasone", "clobetasone (corticoid bôi nhẹ – vừa)", "skin", ["clobetasone", "eumovate", "clobavate"], { sources: [S.clobe], how: [{ text: "Bôi **1–2 lần/ngày** (2 lần thì cách 8–12 giờ); một đốt ngón tay kem cho vùng rộng gấp đôi lòng bàn tay.", src: [0] }, { text: "Tự mua (côn trùng cắn, hăm tã, viêm da tiếp xúc): thường **tối đa 7 ngày**; chàm dùng lâu hơn thì phải có bác sĩ theo dõi.", src: [0] }, { text: "Trẻ dưới 12 tuổi: lượng bôi tuỳ tuổi — hỏi bác sĩ / dược sĩ; 7 ngày không đỡ thì đi khám.", src: [0] }] }),
  row("peppermint-oil", "tinh dầu bạc hà (chống co thắt, đầy hơi)", "gi", ["colpermin", "mintec", "peppermint oil", "vien dau bac ha"], { sources: [S.pepp], how: [{ text: "Uống **30–60 phút trước bữa ăn**, nuốt nguyên viên với nước, không bẻ, nhai.", src: [0] }, { text: "Uống **cách thuốc dạ dày (antacid) ít nhất 2 giờ**.", src: [0] }, { text: "Tự mua thì **không quá 2 tuần** khi chưa hỏi bác sĩ.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi: **1 viên × 3 lần/ngày**, không đỡ thì có thể 2 viên × 3 lần/ngày.", src: [0] }] } }),
  // ── 04/11 (đợt 6) — trang thuốc NHS đọc ngày 04/11/2026 ──
  row("gabapentin", "gabapentin (thuốc động kinh, đau thần kinh)", "rx", ["gabapentin", "neurontin"], { sources: [S.gaba], how: [{ text: "Chia **3 lần/ngày**, lúc no hay đói đều được.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, trừ khi còn chưa tới 2 giờ là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn (động kinh, đau thần kinh): thường **900–3.600 mg/ngày**, chia 3 lần.", src: [0] }], rx: true } }),
  row("fybogel", "vỏ hạt mã đề (ispaghula — chất xơ nhuận tràng)", "gi", ["fybogel", "ispaghula", "psyllium", "ispagel"], { sources: [S.fybo], how: [{ text: "Khuấy mỗi gói vào **ít nhất 150 ml nước lạnh**, tan rồi **uống ngay**.", src: [0] }, { text: "Liều buổi tối uống **ít nhất 1 giờ trước khi ngủ**.", src: [0] }, { text: "**3 ngày** không đỡ hoặc nặng hơn thì đi khám.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi: **1 gói × 2 lần/ngày**.", src: [0] }], kid: [{ text: "Trẻ **6–11 tuổi**: ½–1 muỗng 5 ml × 2 lần/ngày; **từ 5 tuổi trở xuống** chỉ dùng khi bác sĩ khuyên.", src: [0] }] } }),
  row("gtn", "glyceryl trinitrate — nitroglycerin (cắt cơn đau thắt ngực)", "rx", ["gtn", "nitroglycerin", "glyceryl trinitrate", "nitroglycerine", "nitromint"], { sources: [S.gtn], how: [{ text: "Lên cơn đau thắt ngực: **ngồi xuống**, ngậm 1 viên hoặc xịt **1–2 nhát dưới lưỡi**.", src: [0] }, { text: "Sau **5 phút** còn đau thì dùng thêm liều thứ hai — **tối đa 2 liều**.", src: [0] }, { text: "🚨 Dùng liều thứ hai **5 phút vẫn đau**, đau tăng hoặc thấy mệt → **gọi 115 ngay**, đừng tự lái xe đi viện.", src: [0] }] }),
  row("lymecycline", "lymecycline (kháng sinh trị mụn, nhiễm trùng)", "abx", ["lymecycline", "tetralysal"], { sources: [S.lyme], how: [{ text: "Trị mụn: thường **1 viên 408 mg ngày 1 lần, buổi sáng**, ít nhất **8 tuần**; sau 2 tháng không đỡ thì gặp bác sĩ.", src: [0] }, { text: "Lúc no hay đói đều được (uống lúc no đỡ buồn nôn).", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("isotretinoin", "isotretinoin uống (thuốc trị mụn nặng, kê đơn)", "rx", ["isotretinoin", "roaccutane", "acnotin"], { sources: [S.iso], how: [{ text: "Uống **cùng bữa ăn**, nuốt nguyên viên, ngày 1–2 lần; đợt thường khoảng **3 tháng**.", src: [0] }, { text: "Phụ nữ phải **ngừa thai từ ít nhất 1 tháng trước khi bắt đầu tới ít nhất 1 tháng sau khi ngưng**.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("carbimazole", "carbimazole (thuốc cường giáp)", "rx", ["carbimazole", "neo mercazole", "neomercazole"], { sources: [S.carbi], how: [{ text: "Lúc no hay đói đều được. Ban đầu thường chia 2–3 lần/ngày, ổn rồi giảm còn 1 lần/ngày; thường dùng **12–18 tháng**, có người lâu hơn.", src: [0] }, { text: "Quên liều: uống khi nhớ; nếu đã tới giờ liều sau thì uống cả hai cùng lúc (theo hướng dẫn nguồn).", src: [0] }], dose: { adult: [{ text: "Người lớn khởi đầu: **20–60 mg/ngày**, chia 2–3 lần.", src: [0] }], rx: true } }),
  row("verapamil", "verapamil (thuốc huyết áp, tim mạch)", "rx", ["verapamil", "isoptin"], { sources: [S.vera], how: [{ text: "Lúc no hay đói đều được; viên phóng thích chậm **nuốt nguyên**.", src: [0] }, { text: "**Tránh bưởi chùm / nước bưởi chùm** (tăng nồng độ thuốc, tăng tác dụng phụ).", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Huyết áp cao: viên thường **120 mg × 2 lần/ngày**; viên phóng thích chậm **240 mg ngày 1 lần**.", src: [0] }], rx: true } }),
  row("carvedilol", "carvedilol (thuốc chẹn beta)", "rx", ["carvedilol", "dilatrend"], { sources: [S.carv], how: [{ text: "Lúc no hay đói đều được — **suy tim thì nên uống cùng bữa ăn** (đỡ chóng mặt).", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Huyết áp cao: 12,5 mg/ngày trong 2 ngày, rồi **25 mg/ngày**. Suy tim: 3,125 mg × 2 lần/ngày trong 2 tuần rồi tăng dần.", src: [0] }], rx: true } }),
  row("digoxin", "digoxin (thuốc tim)", "rx", ["digoxin", "lanoxin"], { sources: [S.digo], how: [{ text: "Thường **ngày 1 lần, buổi sáng sau bữa sáng**, cùng giờ mỗi ngày.", src: [0] }, { text: "**Đừng tự ngưng** — hỏi bác sĩ trước.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ trên 10 tuổi: thường **125–250 microgam/ngày**.", src: [0] }], rx: true } }),
  row("irbesartan", "irbesartan (thuốc huyết áp)", "rx", ["irbesartan", "aprovel"], { sources: [S.irbe], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được.", src: [0] }, { text: "Có thai hoặc định có thai thì báo bác sĩ (thường đổi thuốc) — nhưng đừng tự ngưng.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("diltiazem", "diltiazem (thuốc huyết áp, đau thắt ngực)", "rx", ["diltiazem", "tildiem"], { sources: [S.dilt], how: [{ text: "Nuốt nguyên viên với nước, lúc no hay đói đều được; **dùng đúng một hiệu thuốc** từ đầu tới cuối.", src: [0] }, { text: "Quên liều: loại ngày 1 lần thì uống khi nhớ trừ khi chưa tới 12 giờ là tới liều sau; loại ngày 3 lần thì bỏ qua — không uống 2 liều.", src: [0] }] }),
  row("venlafaxine", "venlafaxine (thuốc chống trầm cảm)", "rx", ["venlafaxine", "efexor", "effexor"], { sources: [S.venl], how: [{ text: "Uống **cùng bữa ăn**, nuốt nguyên viên; loại phóng thích chậm ngày 1 lần, loại thường ngày 2 lần.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("quetiapine", "quetiapine (thuốc chống loạn thần)", "rx", ["quetiapine", "seroquel"], { sources: [S.quet], how: [{ text: "Ngày **1–2 lần**, lúc no hay đói đều được; bác sĩ bắt đầu liều thấp rồi tăng dần trong vài ngày đầu.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("duloxetine", "duloxetine (thuốc chống trầm cảm, đau thần kinh)", "rx", ["duloxetine", "cymbalta"], { sources: [S.dulo], how: [{ text: "Nuốt nguyên viên nang với nước; ăn uống bình thường. Bác sĩ có thể tăng liều sau một tuần trở lên.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("lorazepam", "lorazepam (thuốc an thần, kê đơn)", "rx", ["lorazepam", "ativan"], { drowsy: true, sources: [S.lora], how: [{ text: "Lo âu hoặc khó ngủ: thường chỉ dùng **tối đa khoảng 4 tuần**; ngưng thì bác sĩ giảm dần để tránh triệu chứng cai.", src: [0] }, { text: "Quên liều: dùng cho lo âu thì uống nếu trễ dưới 3 giờ, quá thì bỏ qua; dùng cho giấc ngủ thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Lo âu (người lớn): **1–4 mg/ngày**; khó ngủ: **1–2 mg trước khi ngủ**.", src: [0] }], rx: true } }),
  row("zopiclone", "zopiclone (thuốc ngủ, kê đơn)", "rx", ["zopiclone", "imovane"], { drowsy: true, sources: [S.zopi], how: [{ text: "Uống **ngày 1 lần lúc đi ngủ** — có tác dụng sau 30–60 phút.", src: [0] }, { text: "Thường dùng vài ngày tới vài tuần, **thường không quá 4 tuần**. **Không uống rượu bia** khi dùng.", src: [0] }, { text: "Quên liều: bỏ qua, tối hôm sau uống như thường.", src: [0] }] }),
  row("donepezil", "donepezil (thuốc sa sút trí tuệ)", "rx", ["donepezil", "aricept"], { sources: [S.done], how: [{ text: "Tốt nhất uống **trước khi ngủ** (có thể chóng mặt); nếu gây mơ nhiều, khó ngủ thì đổi sang buổi sáng.", src: [0] }, { text: "Quên liều: bỏ qua, hôm sau uống như thường; quên **hơn 1 tuần** thì hỏi bác sĩ trước khi uống lại.", src: [0] }], dose: { adult: [{ text: "Bắt đầu **5 mg ngày 1 lần**, sau 1 tháng bác sĩ có thể tăng **10 mg ngày 1 lần**.", src: [0] }], rx: true } }),
  row("lamotrigine", "lamotrigine (thuốc động kinh, rối loạn lưỡng cực)", "rx", ["lamotrigine", "lamictal"], { sources: [S.lamo], how: [{ text: "Bác sĩ bắt đầu liều thấp, **tăng dần trong vài tuần**; ngày 1–2 lần, lúc no hay đói đều được. Viên phân tán thì hoà tan hết trong nước rồi uống.", src: [0] }, { text: "**Nổi ban đỏ** thì báo bác sĩ ngay (hiếm nhưng có phản ứng da nặng).", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }] }),
  row("topiramate", "topiramate (thuốc động kinh, phòng đau nửa đầu)", "rx", ["topiramate", "topamax"], { sources: [S.topi], how: [{ text: "Uống **ngày 2 lần, sáng và tối cùng giờ**; ăn uống bình thường, tránh rượu bia.", src: [0] }, { text: "Phụ nữ phải **ngừa thai trong lúc dùng và ít nhất 1 tháng sau khi ngưng**.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("sodium-valproate", "natri valproat (thuốc động kinh, lưỡng cực)", "rx", ["sodium valproate", "natri valproat", "valproate", "depakine", "epilim", "valproic"], { sources: [S.valp], how: [{ text: "Ngày 1–2 lần (2 lần thì cách 10–12 giờ); lúc no hay đói đều được nhưng **giữ cùng một cách**; viên bao tan trong ruột / phóng thích chậm **nuốt nguyên**.", src: [0] }, { text: "Đừng tự ngưng khi bác sĩ chưa bảo. Mang thai / định có thai: hỏi bác sĩ ngay.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Động kinh (từ 12 tuổi): thường **600–2.000 mg/ngày**.", src: [0] }], rx: true } }),
  row("oxybutynin", "oxybutynin (thuốc bàng quang tăng hoạt)", "rx", ["oxybutynin", "ditropan", "driptane"], { sources: [S.oxyb], how: [{ text: "Lúc no hay đói đều được; viên phóng thích chậm nuốt nguyên. Miếng dán: thường 1 miếng 3,9 mg, **2 lần/tuần**.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }], dose: { adult: [{ text: "Người lớn (từ 12 tuổi): thường **5 mg × 2–3 lần/ngày**, tối đa 5 mg × 4 lần/ngày; người trên 65 tuổi liều thấp hơn.", src: [0] }], kid: [{ text: "Trẻ **5–11 tuổi**: thường bắt đầu 2,5 mg × 2–3 lần/ngày.", src: [0] }], rx: true } }),
  row("solifenacin", "solifenacin (thuốc bàng quang tăng hoạt)", "rx", ["solifenacin", "vesicare"], { sources: [S.soli], how: [{ text: "Uống **ngày 1 lần**, lúc no hay đói đều được; nuốt nguyên viên, không nhai, nghiền.", src: [0] }, { text: "Quên liều: uống khi nhớ trong ngày; sang ngày hôm sau thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Thường **5 mg ngày 1 lần**, bác sĩ có thể tăng 10 mg.", src: [0] }], rx: true } }),
  row("risperidone", "risperidone (thuốc chống loạn thần)", "rx", ["risperidone", "risperdal"], { sources: [S.risp], how: [{ text: "Bắt đầu liều thấp rồi tăng; ngày 1 lần hoặc chia sáng – tối. Viên thường lúc no hay đói đều được.", src: [0] }, { text: "**Đừng tự ngưng** khi chưa hỏi bác sĩ.", src: [0] }, { text: "Quên liều: uống khi nhớ, trừ khi chưa tới 12 giờ (ngày 2 lần: 8 giờ) là tới liều sau — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Tâm thần phân liệt (từ 65 tuổi trở xuống): thường **4–6 mg/ngày**.", src: [0] }], rx: true } }),
  row("olanzapine", "olanzapine (thuốc chống loạn thần)", "rx", ["olanzapine", "zyprexa"], { sources: [S.olan], how: [{ text: "Uống **ngày 1 lần, cùng giờ**, lúc no hay đói đều được. Viên tan trong miệng: để tan trên lưỡi hoặc trong chút nước rồi uống hết.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ; gần tới liều sau thì bỏ qua — quên từ 2 lần trở lên thì báo bác sĩ.", src: [0] }], dose: { adult: [{ text: "Thường **5–20 mg/ngày** (tâm thần phân liệt thường 10 mg, hưng cảm 15 mg).", src: [0] }], rx: true } }),
  row("levetiracetam", "levetiracetam (thuốc động kinh)", "rx", ["levetiracetam", "keppra"], { sources: [S.leve], how: [{ text: "Thường **ngày 1–2 lần**, lúc no hay đói đều được; liều có thể tăng dần trong vài tuần.", src: [0] }, { text: "Dùng lâu dài theo bác sĩ — ngưng thì giảm dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("carbamazepine", "carbamazepine (thuốc động kinh, đau dây thần kinh)", "rx", ["carbamazepine", "tegretol"], { sources: [S.carba], how: [{ text: "Bác sĩ có thể cho liều thấp rồi tăng dần. **Không ăn bưởi chùm / uống nước bưởi chùm**, tránh rượu bia.", src: [0] }, { text: "**Đừng tự ngưng** — ngưng đột ngột có thể lên cơn co giật lại.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("aripiprazole", "aripiprazole (thuốc chống loạn thần)", "rx", ["aripiprazole", "abilify"], { sources: [S.arip], how: [{ text: "Uống **ngày 1 lần**, lúc no hay đói đều được.", src: [0] }, { text: "**Đừng tự ngưng** — triệu chứng có thể quay lại.", src: [0] }, { text: "Quên liều: nhớ trong vài giờ thì uống; quá thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn thường **10–15 mg/ngày** (hưng cảm 15 mg).", src: [0] }], rx: true } }),
  row("paroxetine", "paroxetine (thuốc chống trầm cảm)", "rx", ["paroxetine", "seroxat", "deroxat"], { sources: [S.paro], how: [{ text: "Thường **ngày 1 lần, buổi sáng, cùng bữa ăn** (đỡ buồn nôn); bác sĩ có thể tăng liều sau vài tuần.", src: [0] }, { text: "**Đừng ngưng đột ngột** — bác sĩ sẽ giảm liều dần.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("benzydamine", "benzydamine (xịt / súc họng giảm đau)", "other", ["benzydamine", "difflam", "tantum verde"], { sources: [S.benz], how: [{ text: "Thường dùng **tối đa 7 ngày** nếu bác sĩ, nha sĩ, dược sĩ không dặn khác.", src: [0] }, { text: "Nước súc miệng chỉ dùng cho người **từ 13 tuổi**; trẻ dưới 6 tuổi dùng xịt thì dược sĩ / bác sĩ tính liều theo cân nặng.", src: [0] }], dose: { adult: [{ text: "Súc miệng (từ 13 tuổi): **15 ml mỗi 1,5–3 giờ** khi cần. Xịt (từ 12 tuổi): loại 0,15% **4–8 nhát**, loại 0,3% 2–4 nhát, mỗi 1,5–3 giờ. Viên ngậm (từ 6 tuổi): 1 viên × tối đa 3 lần/ngày.", src: [0] }], kid: [{ text: "Trẻ **6–11 tuổi** xịt: loại 0,15% 4 nhát (0,3%: 2 nhát) mỗi 1,5–3 giờ.", src: [0] }] } }),
  // ── 04/11 (đợt 7) — trang thuốc NHS đọc ngày 04/11/2026 ──
  row("methylphenidate", "methylphenidate (thuốc ADHD, kê đơn)", "rx", ["methylphenidate", "ritalin", "concerta", "medikinet", "equasym"], { sources: [S.mph], how: [{ text: "Nuốt nguyên viên với nước, sữa hoặc nước trái cây; một số loại uống trước / cùng bữa sáng tuỳ hiệu thuốc. Không có tác dụng phụ thì **giữ nguyên một hiệu thuốc**.", src: [0] }, { text: "Quên liều: bỏ qua, uống liều sau như thường — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn: viên thường bắt đầu **5 mg × 2–3 lần/ngày**; viên phóng thích chậm bắt đầu 18 mg (hoặc nang 10 mg) ngày 1 lần.", src: [0] }], rx: true } }),
  row("cyclizine", "cyclizine (chống nôn, say xe)", "antihis", ["cyclizine", "valoid"], { sources: [S.cycl], how: [{ text: "Say xe: uống **1–2 giờ trước khi đi**.", src: [0] }, { text: "Tối đa **3 liều/ngày, cách nhau ít nhất 8 giờ**.", src: [0] }, { text: "Quên liều: dùng cho say xe thì uống khi nhớ; việc khác thì bỏ qua — không uống 2 liều.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi: **50 mg** mỗi lần.", src: [0] }], kid: [{ text: "Trẻ **6–11 tuổi**: **25 mg** mỗi lần.", src: [0] }] } }),
  row("co-dydramol", "paracetamol + dihydrocodein (co-dydramol)", "pain", ["co dydramol", "codydramol"], { sources: [S.codyd], how: [{ text: "Cách liều **ít nhất 4 giờ**, lúc no hay đói đều được, nuốt nguyên viên.", src: [0] }, { text: "Thuốc **đã có paracetamol** — đừng uống thêm thuốc khác có paracetamol.", src: [0] }, { text: "Tự mua thì **không dùng quá 3 ngày** — còn đau thì hỏi dược sĩ / bác sĩ.", src: [0] }], dose: { adult: [{ text: "Người lớn (từ 16 tuổi): **1–2 viên, tối đa 4 lần/24 giờ** — **không quá 8 viên/ngày**.", src: [0] }] } }),
  row("dihydrocodeine", "dihydrocodein (thuốc giảm đau nhóm opioid)", "rx", ["dihydrocodeine", "dihydrocodein", "df118"], { sources: [S.dhc], how: [{ text: "Uống **cùng hoặc ngay sau bữa ăn / bữa phụ**, nuốt nguyên viên với nước.", src: [0] }, { text: "Quên liều: xem tờ hướng dẫn hoặc hỏi dược sĩ — **không uống 2 liều cùng lúc**.", src: [0] }], dose: { adult: [{ text: "Người lớn và trẻ từ 12 tuổi: viên 30 mg **1 viên mỗi 4–6 giờ**, tối đa **6 viên (180 mg)/24 giờ**; viên phóng thích chậm 1 viên mỗi 12 giờ.", src: [0] }], kid: [{ text: "Trẻ 1–11 tuổi: theo cân nặng (0,5–1 mg/kg, tối đa 30 mg mỗi 4–6 giờ) — do bác sĩ tính.", src: [0] }], rx: true } }),
  row("mesalazine", "mesalazine (thuốc viêm loét đại tràng, Crohn)", "rx", ["mesalazine", "mesalazin", "pentasa", "asacol", "salofalk"], { sources: [S.mesa], how: [{ text: "Ngày 1 lần hoặc chia 2–3 lần tuỳ hiệu thuốc; có loại uống cùng bữa ăn được — **xem tờ hướng dẫn**. Viên **nuốt nguyên**, không bẻ, nhai, nghiền.", src: [0] }, { text: "Đổi hiệu thuốc thì hỏi dược sĩ trước (liều tuỳ hiệu).", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("varenicline", "varenicline (thuốc cai thuốc lá)", "rx", ["varenicline", "champix"], { sources: [S.vare], how: [{ text: "Chọn **ngày bỏ thuốc**, bắt đầu uống **1–2 tuần trước** ngày đó. Tuần đầu viên 0,5 mg ngày 1–2 lần, sau đó **1 mg × 2 lần/ngày**.", src: [0] }, { text: "Lúc no hay đói đều được, nuốt nguyên viên với nước. Đợt điều trị **12 tuần** (bác sĩ có thể cho thêm 12 tuần).", src: [0] }, { text: "Quên liều: uống khi nhớ, trừ khi còn chưa tới 3 giờ là tới liều sau — không uống 2 liều.", src: [0] }] }),
  row("ferrous-fumarate", "sắt fumarat (viên sắt)", "supp", ["ferrous fumarate", "sat fumarat", "galfer", "ferrovit"], { sources: [S.ffum], how: [{ text: "Thường uống **ngày 1 lần**; bụng đói được, nếu khó chịu dạ dày thì uống cùng bữa ăn.", src: [0] }, { text: "**Trà, trứng, sữa** làm thuốc kém hấp thu.", src: [0] }, { text: "Trẻ dưới 12 tuổi chỉ dùng khi bác sĩ kê. Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("orlistat", "orlistat (thuốc giảm cân)", "other", ["orlistat", "xenical", "alli"], { sources: [S.orli], how: [{ text: "Uống **3 lần/ngày cùng bữa ăn chính** (trước, trong hoặc tới 1 giờ sau bữa), với nước. **Bỏ bữa hoặc bữa không có chất béo thì không uống**.", src: [0] }, { text: "Ăn theo chế độ giảm năng lượng, nhiều rau trái; có chút chất béo nhưng tránh đồ nhiều béo.", src: [0] }, { text: "Uống **3 tháng** mà không giảm được 5% cân nặng thì không nên dùng tiếp.", src: [0] }, { text: "Quên liều mà đã quá 1 giờ sau bữa ăn thì bỏ qua.", src: [0] }] }),
  row("spironolactone", "spironolactone (thuốc lợi tiểu giữ kali)", "rx", ["spironolactone", "spironolacton", "aldactone", "verospiron"], { sources: [S.spiro], how: [{ text: "Uống **cùng hoặc ngay sau bữa ăn**; liều tuỳ bệnh theo bác sĩ.", src: [0] }, { text: "Thuốc có thể **tăng kali máu** — đừng dùng muối thay thế (muối ít natri, nhiều kali) khi chưa hỏi bác sĩ.", src: [0] }, { text: "Quên liều: uống khi nhớ, gần tới liều sau thì bỏ qua — **không uống 2 liều** để bù.", src: [0] }] }),
  row("tadalafil", "tadalafil (thuốc trị rối loạn cương)", "rx", ["tadalafil", "cialis"], { sources: [S.tada], how: [{ text: "Rối loạn cương: một số người được dặn uống **1 viên khoảng 30 phút trước khi quan hệ**, **không quá 1 viên/ngày** (tác dụng có thể kéo dài tới 36 giờ). Loại liều thấp hằng ngày: 1 viên cùng giờ mỗi ngày.", src: [0] }, { text: "**Tránh nước bưởi chùm**; rượu bia dễ gây chóng mặt. Thường **không dùng chung với thuốc nitrat** (như nitroglycerin).", src: [0] }] }),
  row("nrt", "nicotine thay thế (miếng dán, kẹo cao su… để cai thuốc lá)", "other", ["nicorette", "nicotinell", "mieng dan nicotine", "keo nicotine", "keo cao su nicotine", "xit nicotine", "nicotine replacement"], { sources: [S.nrt], how: [{ text: "Có miếng dán (tác dụng chậm), kẹo cao su, viên ngậm, ống hít, xịt miệng / mũi (tác dụng nhanh). Miếng dán **24 giờ** đỡ cơn thèm buổi sáng; loại **16 giờ** dán lúc thức.", src: [0] }, { text: "Kẹo cao su: **nhai rồi để yên áp má** cho nicotine thấm qua niêm mạc miệng.", src: [0] }, { text: "Dùng **miếng dán + một loại tác dụng nhanh** giúp đỡ cơn thèm đột ngột. Thường dùng khoảng **12 tuần**, rồi giảm dần.", src: [0] }] }),
  row("diosmectite", "diosmectite", "gi", ["smecta", "diosmectite", "diosmectit"]),
  row("drotaverine", "drotaverine (thuốc chống co thắt)", "gi", ["no spa", "nospa", "drotaverine", "drotaverin"]),
  row("simethicone", "simethicone (thuốc giảm đầy hơi)", "gi", ["air x", "simethicone", "simethicon", "simeticone"], { sources: [S.sime], how: [{ text: "Thường uống **ngày 4 lần: sau các bữa ăn và trước khi ngủ**.", src: [0] }, { text: "Viên nhai phải **nhai kỹ** rồi mới nuốt; viên thường / viên nang thì nuốt nguyên.", src: [0] }, { text: "Không quá **6 viên hoặc 8 viên nang mỗi ngày** nếu bác sĩ không dặn.", src: [0] }] }),
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
  // (tên là cụm tiếng Việt không dấu — "mieng dan nicotine", "vien sat", "kem permethrin" — thì hiện tên hoạt chất có dấu thay vì cụm không dấu)
  const isIngredient = normalizeVi(d.ingredient).startsWith(hit.brand) || edit(hit.brand, ing0, 2) <= 2 || /^(mieng|keo|xit|vien|kem|dau|nuoc|sat|acid|axit|thuoc|dung dich|phan) /.test(hit.brand);
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
  for (const { n: name, m } of BY_NAME) if (["paracetamol", "ibu-para", "decolgen", "co-codamol", "co-dydramol"].includes(m.id) && !SHORT.has(name) && n.includes(` ${name} `) && ![...hits.keys()].some((k) => k.includes(name))) hits.set(name, m.id);
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
