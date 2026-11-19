// 20/11 (Kir): "ăn / uống / dùng / sử dụng / xài X nhiều (nhìu) có sao (k / ko / s)?", hỏi nối "ăn nhiều có sao k" sau khi vừa hỏi X,
// "X có tác dụng phụ gì" — cho mọi loại (thuốc, vitamin, đồ ăn, đồ uống, dược liệu…).
// Trước: Lomi nhận đúng X nhưng đưa CẢ THẺ (lợi ích, thành phần…) — phần "dùng nhiều / tác dụng phụ" nằm lẫn ở giữa hoặc không có.
// Lớp này KHÔNG thêm kiến thức mới: chỉ lọc từ chính thẻ có nguồn những phần nói về dùng nhiều / quá liều / tác dụng phụ / lưu ý,
// đưa lên đầu; thẻ dinh dưỡng chỉ có số liệu (sầu riêng, trứng…) thì rút ý từ chính các con số trong thẻ.
import { normalizeVi } from "@/lib/lomiFaq";

export type ExcessKind = "excess" | "side";

const USE = "(an|uong|dung|su dung|xai|hut|boi|thoa|nhai|nhau|nhom|tiem|choi|ngam)";
const MUCH = "(nhieu|nhiu|qua nhieu|nhieu qua|qua lieu|qua tay|lien tuc|hang ngay|moi ngay|ngay nao cung|thuong xuyen|lau dai|ca ngay|lien tiep|gap doi|2 vien|hai vien|nhieu vien|nhieu ly|nhieu lon|nhieu qua)";
const HARM_Q = "(co sao|co s|sao (k|ko|khong|hong|hok)|co hai|hai (k|ko|khong|gi)|co duoc (k|ko|khong)|duoc (k|ko|khong|hong)|dc (k|ko|khong)|co anh huong|anh huong (gi|k|ko|khong)|thi sao|bi gi|bi sao|co van de|co nguy hiem|nguy hiem (k|ko|khong)|ok (k|ko|khong)|co sao ko|co sao hong|lam sao|co ton|ton (gan|than))";
const EXCESS_RE = new RegExp(`\\b${USE}\\b(?: \\S+){0,6} ${MUCH}\\b(?: \\S+){0,4} ${HARM_Q}\\b|\\b${MUCH} (thi )?${HARM_Q}\\b`);
// câu CHỐI ("a không uống quá liều đâu") — để lớp chối lo
const DENY_RE = /\b(khong|chua|dau co|ko|k) (\S+ )?(uong|an|dung|xai) (qua lieu|qua nhieu|nhieu)\b/;
const SIDE_RE = /\b(tac dung phu|tdp|tac hai|tac dung khong mong muon|phan ung phu|co hai gi|hai gi|anh huong xau|anh huong gi (toi|den) (suc khoe|co the|gan|than))\b/;

export function excessAsk(text: string): ExcessKind | null {
  const n = ` ${normalizeVi(text).replace(/\bnh(i|j)u\b/g, "nhieu")} `;
  if (DENY_RE.test(n)) return null;
  if (SIDE_RE.test(n)) return "side";
  if (EXCESS_RE.test(n)) return "excess";
  return null;
}

/** Động từ người dùng dùng ("ăn", "uống"…) — để viết lại câu nối "ăn nhiều có sao k" thành "ăn <X> nhiều có sao k". */
export function excessVerb(text: string): string | null {
  const m = text.normalize("NFC").toLowerCase().match(/(?:^|[^\p{L}])(ăn|uống|dùng|sử dụng|xài|hút|bôi|thoa|nhai|nhậu)(?=[^\p{L}]|$)/u);
  return m ? m[1] : null;
}

const KEEP_HEAD = /^(⚠️|🚫|📏|🔸|❗|‼️|🛑|🩺 \*\*Khi nào|💊 \*\*Liều|.{0,6}\*\*(Lưu ý|Tác dụng phụ|Quá liều|Liều|Ai không nên|Không nên|Cẩn thận))/u;
// (chỉ dòng nói DÙNG nhiều / quá liều / tác dụng phụ — "có trong RẤT NHIỀU rau quả", "dân gian dùng nghệ cho ĐAU BỤNG" không tính)
const MUCH_LINE = /((ăn|uống|dùng|xài|hút|bôi|thoa) (quá |rất |thật )?nhiều|nhiều quá|quá liều|quá nhiều|liều cao|dùng lâu|lâu ngày|lâu dài|tác dụng phụ|dị ứng|có hại|gây hại|nguy hiểm|tổn thương|ngộ độc|không nên|tối đa|không quá|giới hạn)/iu;

/** Lọc thẻ → phần dùng nhiều / tác dụng phụ. null = thẻ không có gì để lọc (để nguyên câu đáp). */
export function focusExcess(content: string, kind: ExcessKind, opts: { drug?: boolean } = {}): string | null {
  // chỉ lọc THẺ chuẩn (mở đầu biểu tượng + tên in đậm) — câu đáp viết riêng ("Nếu lỡ uống quá liều…", "1–2 viên 500 mg là một liều
  //   thông thường…", lời chối) giữ nguyên
  if (!/^(🥗|💊|🌿|☕|🍺|🍵)\s*\*\*[^*]+\*\*/u.test(content)) return null;
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length < 2) return null;
  const title = (content.match(/\*\*([^*]{2,60})\*\*/u)?.[1] ?? "").trim();
  if (!title) return null;
  const foot = blocks.filter((b) => /^(📌|📚)/u.test(b));
  const kept: string[] = [];
  for (const b of blocks.slice(1)) {
    if (/^(📌|📚)/u.test(b)) continue;
    const lines = b.split("\n");
    if (KEEP_HEAD.test(lines[0])) { kept.push(b); continue; }
    // khối khác: chỉ giữ dòng gạch đầu dòng nói đúng chuyện dùng nhiều / tác dụng phụ
    const hit = lines.filter((l) => /^\s*[•\-–]/u.test(l) && MUCH_LINE.test(l));
    if (hit.length) kept.push(hit.join("\n"));
  }
  // dòng mở đầu của thẻ dược liệu (🔸 / ⚠️ / ❔ ngay sau tên) thường đã là lời nhận định chung — giữ nếu có chữ "nhiều"
  const lead = blocks[1] && /^(🔸|⚠️|❔)/u.test(blocks[1]) && MUCH_LINE.test(blocks[1]) && !kept.includes(blocks[1]) ? [blocks[1]] : [];
  let body = [...lead, ...kept];
  // thẻ dinh dưỡng (có số kcal) → luôn rút ý "ăn nhiều" từ số liệu, kèm các dòng ⚠️ của thẻ
  const nut = fromNutrition(content);
  if (nut) body = [nut, ...blocks.filter((b) => /^⚠️/u.test(b) && !(/kali/u.test(b) && /kali/u.test(nut)))];
  if (!body.length) return null;
  const head = kind === "side" ? `🔎 **${title}** — tác dụng phụ · cần lưu ý:` : `🔎 **${title}** — dùng nhiều có sao không:`;
  const drugNote = opts.drug && kind === "excess"
    ? "\n\n⚠️ Đừng tự tăng liều quá mức ghi trên hộp / bác sĩ dặn. **Lỡ uống quá nhiều thì gọi 115 hoặc tới cơ sở y tế ngay**, đừng chờ có triệu chứng."
    : "";
  // thẻ thuốc: giữ dòng giới thiệu (tên hoạt chất, nhóm thuốc, dùng để làm gì) cho rõ đang nói về thuốc nào
  const intro = opts.drug && !body.includes(blocks[0]) ? `${blocks[0]}\n\n` : "";
  return `${head}\n\n${intro}${body.join("\n\n")}${drugNote}${foot.length ? `\n\n${foot.join("\n\n")}` : ""}`;
}

/** Thẻ dinh dưỡng chỉ có số liệu (vd "**132 kcal** · glucid **26,9 g** (khác: chất béo 1,6 g, đạm 2,5 g, natri 1 mg, kali 601 mg)") → ý "ăn nhiều". */
function fromNutrition(content: string): string | null {
  const num = (re: RegExp) => {
    const m = content.match(re);
    return m ? Number(m[1].replace(",", ".")) : null;
  };
  const kcal = num(/\*\*([\d.,]+) kcal\*\*/u);
  if (kcal == null) {
    // thẻ món ăn không kèm số liệu (vd Sữa) → nói thật là chưa có số liệu riêng, kèm lời khuyên chung
    if (!/^🥗/u.test(content)) return null;
    const nm = content.match(/\*\*([^*]{2,40})\*\*/u)?.[1] ?? "món này";
    return `• Lomi chưa có số liệu riêng về chuyện dùng nhiều **${nm}**; nói chung không món nào cần ăn / uống thật nhiều — **vừa phải, đa dạng** là tốt nhất.\n• Thấy khó chịu sau khi dùng (đầy bụng, tiêu chảy, nổi mẩn…) thì giảm lại; đang có bệnh thì hỏi bác sĩ / chuyên viên dinh dưỡng lượng phù hợp.`;
  }
  const glu = num(/glucid \**([\d.,]+) g/u);
  const fat = num(/chất béo \**([\d.,]+) g/u);
  const na = num(/natri \**([\d.,]+) mg/u);
  const k = num(/kali \**([\d.,]+) mg/u);
  const out: string[] = [];
  if (kcal >= 150) out.push(`• Khá nhiều **năng lượng** (${kcal} kcal / 100 g) — ăn nhiều thường xuyên dễ dư năng lượng, tăng cân.`);
  if (glu != null && glu >= 15) out.push(`• Nhiều **đường bột** (${String(glu).replace(".", ",")} g / 100 g) — người tiểu đường, đang giữ cân nên ăn ít một, không ăn liền nhiều.`);
  if (fat != null && fat >= 10) out.push(`• Nhiều **chất béo** (${String(fat).replace(".", ",")} g / 100 g) — ăn nhiều dễ đầy bụng, khó tiêu, dư năng lượng.`);
  if (na != null && na >= 400) out.push(`• Khá **mặn** (natri ${na} mg / 100 g) — người tăng huyết áp, bệnh thận nên hạn chế.`);
  if (k != null && k >= 400) out.push(`• Nhiều **kali** (${k} mg / 100 g) — người bệnh thận được dặn hạn chế kali thì hỏi bác sĩ nên ăn bao nhiêu.`);
  if (!out.length) out.push("• Món này không có chất nào quá cao, nhưng ăn quá nhiều một món vẫn dễ đầy bụng, ngán và lấn chỗ các món khác.");
  out.push("• Không món nào cần ăn thật nhiều — ăn **vừa phải, đa dạng** là tốt nhất; ăn xong thấy khó chịu (đầy bụng, dị ứng…) thì giảm lại.");
  return out.join("\n");
}

/** "uống thuốc ngủ / thuốc an thần nhiều có sao" — quá liều nguy hiểm: nói rõ, kèm cấp cứu và đường dây hỗ trợ (câu này có thể đến từ người
 *  đang khủng hoảng; lớp khủng hoảng vẫn chạy trước nếu câu có tín hiệu rõ). */
export function sleepPillExcess(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  if (!/\b(thuoc ngu|thuoc an than|thuoc giup ngu|seduxen|diazepam|stilnox|zolpidem)\b/.test(n) || !excessAsk(text)) return null;
  return "⚠️ **Thuốc ngủ, thuốc an thần uống quá liều rất nguy hiểm**: có thể ngủ li bì không gọi dậy được, thở chậm, hôn mê, nguy hiểm tới tính mạng — càng nguy hiểm khi uống cùng **rượu bia** hay thuốc khác gây buồn ngủ.\n" +
    "• **Nếu bạn hoặc ai đó đã lỡ uống nhiều → gọi 115 ngay** hoặc đưa tới cơ sở y tế gần nhất, mang theo vỉ / hộp thuốc; đừng chờ có triệu chứng.\n" +
    "• Dùng đúng liều bác sĩ kê, không tự tăng liều khi khó ngủ; dùng lâu dễ **lệ thuộc**, ngưng đột ngột cũng có thể khó chịu — muốn giảm thì hỏi bác sĩ.\n\n" +
    "Nếu bạn hỏi vì đang thấy quá mệt mỏi, muốn buông xuôi, thì nói với Lomi hoặc một người bạn tin ngay nha — bạn không phải một mình. Đường dây hỗ trợ tâm lý **Ngày Mai: 096 306 1414**.";
}
