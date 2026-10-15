// ─────────────────────────────────────────────────────────────────────────────
// CHỈ SỐ HUYẾT ÁP / ĐƯỜNG HUYẾT (15/10, audit sức khoẻ) — chạy trên máy, không gọi AI.
//
// Lỗi cần sửa: "huyết áp bao nhiêu là cao", "đường huyết 7 có cao không" → "chưa có kiến thức" (thẻ tăng huyết áp / tiểu đường
// không có con số ngưỡng). File này chỉ đưa NGƯỠNG đúng như nguồn công bố, và so con số người dùng đưa với ngưỡng đó —
// không chẩn đoán: luôn nói một lần đo chưa đủ để kết luận, và với người đã có bệnh thì mục tiêu do bác sĩ đặt riêng.
//
// Nguồn (Claude mở trang và đối chiếu ngày 15/10/2026):
//  • NHS — High blood pressure (hypertension), rà soát 19/07/2024: cao khi ≥ 140/90 mmHg đo ở cơ sở y tế, ≥ 135/85 mmHg đo ở nhà;
//    cần đo lại (đo ở nhà, tái khám, máy đo 24 giờ) để xác nhận; ≥ 40 tuổi mà hơn 5 năm chưa đo thì nên đo.
//  • NHS — Low blood pressure (hypotension), rà soát 11/07/2023: thấp khi < 90/60 mmHg; không phải lúc nào cũng có triệu chứng,
//    có triệu chứng mới có thể cần điều trị.
//  • NIDDK — Diabetes Tests & Diagnosis, rà soát 07/2022 (giá trị cho người KHÔNG mang thai, theo ADA):
//    đường huyết lúc đói (nhịn ≥ 8 giờ) ≤ 99 mg/dL bình thường · 100–125 tiền tiểu đường · ≥ 126 tiểu đường;
//    A1C < 5,7% · 5,7–6,4% · ≥ 6,5%; đường huyết bất kỳ ≥ 200 mg/dL kèm triệu chứng; thường cần xét nghiệm thứ hai để xác nhận.
//  • NHS — Low blood sugar (hypoglycaemia), rà soát 03/08/2023: đường huyết thấp thường là dưới 4 mmol/L.
// Quy đổi mmol/L ↔ mg/dL theo hệ số 18 (126 mg/dL ≈ 7,0 mmol/L) — phép đổi đơn vị, không phải kiến thức mới.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

export type VitalReply = { kind: "bp" | "glucose" | "lipid"; text: string };

// 15/10 (ảnh Kir gửi: "Mỡ máu 9.0 là cao k?" → Lomi đáp lạc "Ý “9 0” anh hỏi…"): chỉ số MỠ MÁU.
//  • NHS — Cholesterol levels, rà soát 13/03/2026 (mức cho người lớn khoẻ mạnh): cholesterol toàn phần < 5 mmol/L · non-HDL < 4 mmol/L ·
//    HDL > 1,0 mmol/L (nam) / > 1,2 mmol/L (nữ); mức mục tiêu tuỳ tuổi, bệnh, nguy cơ tim mạch — bác sĩ đánh giá cùng các yếu tố khác;
//    ăn hay chưa ăn trước khi xét nghiệm không ảnh hưởng nhiều tới các chỉ số này.
//  • MedlinePlus — Triglyceride level, rà soát 14/07/2024: < 150 mg/dL (1,69 mmol/L) bình thường · 150–199 (1,69–2,25) ranh giới cao ·
//    200–499 (2,26–5,64) cao · ≥ 500 (≥ 5,65) rất cao; không ăn 8–12 tiếng trước xét nghiệm; khoảng bình thường có thể hơi khác giữa các phòng xét nghiệm.
//  Quy đổi mg/dL → mmol/L: cholesterol chia 38,67; triglycerid chia 88,57 (phép đổi đơn vị).
const LIPID = VN(/\b(mỡ máu|mỡ trong máu|máu nhiễm mỡ|cholesterol|cholesteron|cholesterol toàn phần|ldl|hdl|non hdl|triglycerid|triglyceride|triglyceride|chất béo trung tính|mỡ trung tính|xét nghiệm mỡ)\b/);
const TG = VN(/\b(triglycerid|triglyceride|chất béo trung tính|mỡ trung tính|tg)\b/);
const NONHDL = VN(/\b(non hdl|nonhdl)\b/);
const HDL = VN(/\bhdl\b/);
const LDL = VN(/\bldl\b/);
const TOTAL = VN(/\b(cholesterol|cholesteron|cholesterol toàn phần|toàn phần|tc)\b/);
const FEMALE = VN(/\b(nữ|chị|em gái|vợ|mẹ|má|bà|cô|phụ nữ|con gái)\b/);
const SRC_LIPID = "📚 Nguồn: NHS (Anh) — Cholesterol levels, rà soát 13/03/2026 · MedlinePlus (NIH, Hoa Kỳ) — Triglyceride level, rà soát 14/07/2024. Lomi đối chiếu ngày 15/10/2026. Đây là kiến thức tham khảo chung, không thay chẩn đoán của bác sĩ.";

function lipidAsk(raw: string, n: string): VitalReply | null {
  if (!LIPID.test(n)) return null;
  const kw = raw.match(/(mỡ máu|mỡ trong máu|máu nhiễm mỡ|cholesterol|cholesteron|non[- ]?hdl|ldl|hdl|triglycerid\w*|chất béo trung tính|mỡ trung tính)/u);
  const tail = kw ? raw.slice((kw.index ?? 0) + kw[0].length) : raw;
  const m0 = tail.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*(mmol|mg)?/u);
  // "bị mỡ máu 3 năm rồi", "uống thuốc mỡ máu 2 viên" — con số là thời gian / số lượng, không phải chỉ số xét nghiệm.
  const m = m0 && !/^\s*(năm|tháng|tuần|ngày|tuổi|lần|viên|tiếng|giờ|kg|cân|ký)/u.test(tail.slice((m0.index ?? 0) + m0[0].length)) ? m0 : null;
  if (!m && !ASK.test(n)) return null;
  const v = m ? Number(m[1].replace(",", ".")) : NaN;
  const mg = m?.[2] === "mg" || v >= 30;
  const out: string[] = [];
  const table =
    "📏 Mức tham khảo cho **người lớn khoẻ mạnh**:\n• **Cholesterol toàn phần**: dưới **5 mmol/L** (NHS).\n• **Non-HDL** (cholesterol “xấu”): dưới **4 mmol/L** (NHS).\n• **HDL** (cholesterol “tốt”): trên **1,0 mmol/L** ở nam, trên **1,2 mmol/L** ở nữ (NHS).\n• **Triglycerid** (chất béo trung tính): dưới 1,7 mmol/L (150 mg/dL) là bình thường · 1,7–2,25 ranh giới cao · 2,26–5,64 cao · từ 5,65 mmol/L (500 mg/dL) là **rất cao** (MedlinePlus).";
  const note =
    "Đây là mức cho người lớn khoẻ mạnh — mức mục tiêu của mỗi người tuỳ tuổi, bệnh đang có và nguy cơ tim mạch, nên bác sĩ sẽ xem cùng các yếu tố khác (huyết áp, tuổi…). Mỗi phòng xét nghiệm có thể ghi khoảng bình thường hơi khác, cứ đối chiếu với phiếu kết quả của bạn.";
  if (!isNaN(v) && v > 0) {
    const tg = TG.test(n);
    const which = tg ? "tg" : NONHDL.test(n) ? "nonhdl" : HDL.test(n) && !LDL.test(n) ? "hdl" : LDL.test(n) ? "ldl" : TOTAL.test(n) ? "total" : "unknown";
    const mmolC = mg ? v / 38.67 : v;
    const mmolT = mg ? v / 88.57 : v;
    const show = (x: number, conv: number) => (mg ? `**${fmt(v)} mg/dL** (≈ ${fmt(x)} mmol/L)` : `**${fmt(v)} mmol/L** (≈ ${Math.round(v * conv)} mg/dL)`);
    const tgCls = (x: number) => (x >= 5.65 ? "ở mức **rất cao** (từ 5,65 mmol/L)" : x >= 2.26 ? "ở mức **cao** (2,26–5,64 mmol/L)" : x >= 1.69 ? "ở mức **ranh giới cao** (1,69–2,25 mmol/L)" : "trong mức **bình thường** (dưới 1,69 mmol/L)");
    const totCls = (x: number) => (x >= 5 ? `**cao hơn** mức khoẻ mạnh của NHS (dưới 5 mmol/L)${x >= 7.5 ? " — cao hơn khá nhiều" : ""}` : "dưới 5 mmol/L — trong mức NHS coi là khoẻ mạnh");
    if (which === "tg") out.push(`🩺 Triglycerid ${show(mmolT, 88.57)} ${tgCls(mmolT)} theo MedlinePlus.`);
    else if (which === "total") out.push(`🩺 Cholesterol toàn phần ${show(mmolC, 38.67)} ${totCls(mmolC)}.`);
    else if (which === "nonhdl") out.push(`🩺 Non-HDL ${show(mmolC, 38.67)} ${mmolC >= 4 ? "**cao hơn** mức khoẻ mạnh của NHS (dưới 4 mmol/L)" : "dưới 4 mmol/L — trong mức NHS coi là khoẻ mạnh"}.`);
    else if (which === "hdl") {
      const f = FEMALE.test(n);
      const cut = f ? 1.2 : 1.0;
      out.push(`🩺 HDL ${show(mmolC, 38.67)} ${mmolC > cut ? `trên ${fmt(cut)} mmol/L — trong mức NHS coi là khoẻ mạnh${f ? " (với nữ)" : " (với nam; nữ thì cần trên 1,2)"}` : `**thấp hơn** mức khoẻ mạnh của NHS (trên ${fmt(cut)} mmol/L${f ? " với nữ" : " với nam, 1,2 với nữ"})`} — HDL là cholesterol “tốt”, càng thấp càng không có lợi.`);
    } else if (which === "ldl")
      out.push(`🩺 Về LDL thì trang NHS Lomi đối chiếu **không ghi một mức chung** — mức LDL cần đạt tuỳ nguy cơ tim mạch của từng người, nên bạn hỏi bác sĩ đọc kết quả giúp nha.`);
    else
      out.push(
        `🩺 “Mỡ máu” trên phiếu xét nghiệm gồm **nhiều chỉ số**, mỗi chỉ số một ngưỡng khác nhau — ${show(mmolC, 38.67)} là chỉ số nào thì mới nói được cao hay không:\n• Nếu là **cholesterol toàn phần**: ${totCls(mmolC)}.\n• Nếu là **triglycerid** (chất béo trung tính): ${tgCls(mmolT)}.\nBạn xem trên phiếu dòng đó ghi là gì (Cholesterol / Triglycerid / HDL / LDL) rồi gõ lại cho Lomi nha.`,
      );
    if ((which === "tg" && mmolT >= 5.65) || (which === "total" && mmolC >= 7.5) || (which === "unknown" && mmolC >= 7.5))
      out.push("Con số này cao rõ, nên đặt lịch gặp bác sĩ **sớm** để được đánh giá và tư vấn cách hạ, đừng tự mua thuốc uống.");
  }
  out.push(table);
  out.push(note);
  out.push(SRC_LIPID);
  return { kind: "lipid", text: out.join("\n\n") };
}

const BP = VN(/\b(huyết áp|tăng áp|tụt áp)\b/);
const GLU = VN(/\b(đường huyết|đường máu|đường trong máu|chỉ số đường|đo đường|thử đường|glucose|a1c|hba1c)\b/);
// Hỏi NGƯỠNG ("bao nhiêu là cao", "bình thường là mấy"). "huyết áp cao có sao không" là hỏi về bệnh → để thẻ kiến thức trả lời.
const ASK = VN(/\b(bao nhiêu|mấy|là cao|là thấp|là bình thường|bình thường là|chỉ số|ngưỡng|mức nào|thế nào là)\b/);
const HOME = VN(/\b(ở nhà|tại nhà|tự đo|máy đo ở nhà)\b/);
const FAST = VN(/\b(lúc đói|khi đói|nhịn ăn|chưa ăn|sáng sớm chưa ăn|buổi sáng lúc đói|đường huyết đói|nhịn đói)\b/);
const AFTER = VN(/\b(sau ăn|sau khi ăn|ăn xong|bất kỳ|ngẫu nhiên)\b/);

const fmt = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");
const SRC_BP = "📚 Nguồn: NHS (Anh) — High blood pressure, rà soát 19/07/2024 · Low blood pressure, rà soát 11/07/2023. Lomi đối chiếu ngày 15/10/2026. Đây là kiến thức tham khảo chung, không thay chẩn đoán của bác sĩ.";
const SRC_GLU = "📚 Nguồn: NIDDK (NIH, Hoa Kỳ) — Diabetes Tests & Diagnosis, rà soát 07/2022 · NHS (Anh) — Low blood sugar, rà soát 03/08/2023. Lomi đối chiếu ngày 15/10/2026. Đây là kiến thức tham khảo chung, không thay chẩn đoán của bác sĩ.";
const RED = "Nếu đang kèm đau ngực, khó thở, yếu hoặc tê nửa người, méo miệng, nói khó, lơ mơ thì gọi **115** ngay.";

/** Câu hỏi về NGƯỠNG / CON SỐ huyết áp, đường huyết → trả lời theo nguồn; không phải thì null. */
export function vitalAsk(text: string): VitalReply | null {
  const raw = text.normalize("NFC").toLowerCase();
  const n = ` ${normalizeVi(text)} `;
  if (n.trim().split(" ").length > 24) return null;
  // Mỡ máu xét trước: "mỡ máu cao có sao không" (không có số, không hỏi ngưỡng) thì lipidAsk trả null → để thẻ kiến thức trả lời.
  const lp = lipidAsk(raw, n);
  if (lp) return lp;
  const bpNum = raw.match(/(\d{2,3})\s*(?:\/|trên|-)\s*(\d{2,3})/u);
  if (BP.test(n) && (ASK.test(n) || !!bpNum)) {
    const out: string[] = [];
    if (bpNum) {
      const [s, d] = [Number(bpNum[1]), Number(bpNum[2])];
      if (s >= 60 && s <= 260 && d >= 30 && d <= 160 && s > d) {
        const home = HOME.test(n);
        const high = s >= 140 || d >= 90;
        const homeHigh = s >= 135 || d >= 85;
        const low = s < 90 || d < 60;
        const verdict = high
          ? `**${s}/${d} mmHg** cao hơn ngưỡng **140/90** của NHS${home ? " (đo ở nhà thì ngưỡng còn thấp hơn: 135/85)" : ""} — tức là thuộc mức **huyết áp cao** nếu đo lại vẫn như vậy.`
          : home && homeHigh
            ? `**${s}/${d} mmHg** đo ở nhà là từ ngưỡng **135/85** trở lên — NHS xếp vào mức **cao** với số đo tại nhà.`
            : low
              ? `**${s}/${d} mmHg** dưới ngưỡng **90/60** — NHS gọi là **huyết áp thấp**. Huyết áp thấp không phải lúc nào cũng gây triệu chứng; nếu hay chóng mặt, choáng hay ngất thì nên đi khám.`
              : `**${s}/${d} mmHg** chưa tới ngưỡng cao (140/90 đo ở cơ sở y tế${home ? ", 135/85 đo ở nhà" : ""}) và cũng không dưới ngưỡng thấp 90/60 của NHS.`;
        out.push(`🩺 ${verdict}`);
        out.push("**Một lần đo chưa đủ để kết luận** — bác sĩ thường cho đo lại (tự đo ở nhà nhiều ngày, tái khám, hoặc đeo máy đo 24 giờ) để xác nhận. Đang điều trị huyết áp thì mức mục tiêu do bác sĩ đặt riêng cho bạn.");
        if (high || low) out.push(RED);
        out.push(SRC_BP);
        return { kind: "bp", text: out.join("\n\n") };
      }
    }
    out.push(
      "📏 Ngưỡng huyết áp theo NHS (Anh):\n• Đo tại cơ sở y tế: từ **140/90 mmHg** trở lên là **huyết áp cao**.\n• Tự đo ở nhà: từ **135/85 mmHg** trở lên là cao.\n• Dưới **90/60 mmHg** là **huyết áp thấp** — không phải lúc nào cũng gây triệu chứng; có triệu chứng (chóng mặt, ngất) thì mới có thể cần điều trị.",
    );
    out.push("Một lần đo chưa đủ để kết luận — bác sĩ thường cho đo lại để xác nhận. Từ 40 tuổi trở lên mà hơn 5 năm chưa đo thì nên đi đo. Bạn có số đo cụ thể thì gõ kiểu “huyết áp 150/95 có cao không” để Lomi so giúp.");
    out.push(SRC_BP);
    return { kind: "bp", text: out.join("\n\n") };
  }

  // (câu chỉ nêu con số — "đường huyết 3.5", "đường huyết sau ăn 250 mg" — cũng là hỏi số đó)
  if (GLU.test(n) && (ASK.test(n) || /\d/.test(raw.replace(/h?ba1c|a1c/giu, "")))) {
    const a1c = VN(/\b(a1c|hba1c)\b/).test(n);
    // con số đứng SAU chữ đường huyết / A1C ("bé 2 tuổi đường huyết 5" → 5, không phải 2)
    const kw = raw.match(/(đường huyết|đường máu|đường|glucose|hba1c|a1c)/u);
    const at = kw ? (kw.index ?? 0) + kw[0].length : 0; // bỏ qua chính chữ "a1c" (có số 1)
    const num = raw.slice(at).match(/(\d{1,3}(?:[.,]\d)?)\s*(%|mmol|mg)?/u) ?? raw.match(/(\d{1,3}(?:[.,]\d)?)\s*(%|mmol|mg)?/u);
    const v = num ? Number(num[1].replace(",", ".")) : NaN;
    const out: string[] = [];
    const table = "📏 Ngưỡng theo NIDDK (cho người **không mang thai**):\n• Đường huyết **lúc đói** (nhịn ăn ít nhất 8 tiếng): ≤ 99 mg/dL (≈ 5,5 mmol/L) là bình thường · 100–125 mg/dL (≈ 5,6–6,9 mmol/L) là **tiền tiểu đường** · từ 126 mg/dL (≈ 7,0 mmol/L) là mức **tiểu đường**.\n• **A1C**: dưới 5,7% bình thường · 5,7–6,4% tiền tiểu đường · từ 6,5% là mức tiểu đường.\n• Đường huyết đo **bất kỳ lúc nào** từ 200 mg/dL (≈ 11,1 mmol/L) **kèm triệu chứng** cũng là mức tiểu đường.\n• Dưới **4 mmol/L** (≈ 72 mg/dL) thường là **hạ đường huyết** (NHS).";
    if (!isNaN(v) && v > 0) {
      if (a1c && v >= 3 && v <= 20) {
        const cls = v >= 6.5 ? "ở mức **tiểu đường** (≥ 6,5%)" : v >= 5.7 ? "ở mức **tiền tiểu đường** (5,7–6,4%)" : "trong mức **bình thường** (< 5,7%)";
        out.push(`🩺 A1C **${fmt(v)}%** ${cls} theo ngưỡng của NIDDK.`);
      } else if (!a1c) {
        const mg = num?.[2] === "mg" || v >= 40;
        const mmol = mg ? v / 18 : v;
        const mgv = mg ? v : v * 18;
        const show = mg ? `**${fmt(v)} mg/dL** (≈ ${fmt(mmol)} mmol/L)` : `**${fmt(v)} mmol/L** (≈ ${Math.round(mgv)} mg/dL)`;
        if (mmol < 4) out.push(`⚠️ ${show} là dưới 4 mmol/L — NHS xếp vào mức **hạ đường huyết**. Đang run, vã mồ hôi, lả hay lú lẫn thì xử trí ngay (ăn / uống thứ có đường tác dụng nhanh nếu còn tỉnh và nuốt được); lơ mơ, không tỉnh thì **không cho ăn uống**, gọi **115**.`);
        else if (FAST.test(n)) {
          const cls = mgv >= 126 ? "từ ngưỡng **tiểu đường** (≥ 126 mg/dL ≈ 7,0 mmol/L) trở lên" : mgv >= 100 ? "ở mức **tiền tiểu đường** (100–125 mg/dL ≈ 5,6–6,9 mmol/L)" : "trong mức **bình thường** (≤ 99 mg/dL)";
          out.push(`🩺 Đường huyết **lúc đói** ${show} ${cls} theo ngưỡng của NIDDK.`);
        } else if (AFTER.test(n)) {
          out.push(
            mgv >= 200
              ? `🩺 Đo **sau ăn / bất kỳ lúc nào** ${show} là từ 200 mg/dL trở lên — nếu kèm triệu chứng (khát nhiều, tiểu nhiều, sụt cân…) thì NIDDK xếp vào mức **tiểu đường**; cần bác sĩ xét nghiệm để xác nhận.`
              : `🩺 Đo **sau ăn / bất kỳ lúc nào** ${show}: không so được với ngưỡng lúc đói. Ngưỡng NIDDK cho kiểu đo này chỉ có mức từ 200 mg/dL kèm triệu chứng; dưới mức đó thì chưa kết luận được — muốn biết chắc nên xét nghiệm lúc đói hoặc A1C.`,
          );
        } else
          out.push(
            `🩺 Với ${show} thì còn tuỳ **đo lúc nào**: nếu đo **lúc đói** (nhịn ăn ít nhất 8 tiếng) thì ${mgv >= 126 ? "đã tới ngưỡng **tiểu đường** (≥ 126 mg/dL ≈ 7,0 mmol/L)" : mgv >= 100 ? "ở mức **tiền tiểu đường**" : "trong mức **bình thường**"}; còn đo **sau ăn** thì không so với ngưỡng lúc đói được. Bạn đo lúc đói hay sau ăn?`,
          );
      }
    }
    out.push(table);
    out.push("**Một lần đo chưa đủ để kết luận** — thường bác sĩ sẽ làm xét nghiệm thứ hai để xác nhận; máy đo ở nhà cũng có sai số. Đã được chẩn đoán tiểu đường thì mức mục tiêu do bác sĩ đặt riêng cho bạn.");
    out.push(SRC_GLU);
    return { kind: "glucose", text: out.join("\n\n") };
  }
  return null;
}
