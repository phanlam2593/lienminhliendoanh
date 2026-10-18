// 15/10 — Kir: câu trả lời sức khoẻ đọc "máy móc" vì chỗ nào cũng "NHS: …", "NIDDK khuyên …", cuối lại một dòng "📚 Nguồn …".
// Cách làm: nội dung VẪN lấy nguyên từ thẻ có nguồn, chỉ đổi cách TRÌNH BÀY —
//   • bỏ tên cơ quan ở đầu ý ("NHS: …", "Theo CDC, …", "NIDDK khuyên tránh …" → "Tránh …");
//   • dòng "📚 Nguồn …" tách khỏi lời đáp, cất theo tin (Msg.src) — ai hỏi "nguồn đâu?" thì Lomi mới đưa ra (kèm đường dẫn nếu có thẻ).
// Nguồn và ngày rà soát không mất: vẫn nằm trong thẻ, trong Msg.src và trong câu trả lời khi được hỏi.
import { VN } from "@/lib/viMatch";
import { normalizeVi } from "@/lib/lomiFaq";

// Tên cơ quan / trang nguồn hay gặp trong các ý của thẻ (phân biệt hoa thường — "WHO" không phải "who").
const PUB =
  "(?:(?:Guy's and St Thomas' NHS|NHS Healthier Together(?: \\(Wessex\\))?|NHS Every Mind Matters|NHS inform|NHS(?: \\(Anh\\)| Anh)?|NIDDK|NIAMS|NIMH|NINDS|NHLBI|NIAID|NICHD|NCCIH|NIDCD|NIDCR|NIDA|NIAAA|NEI|NIA|NCI|NIH|CDC|WHO|FDA|AAO|AAP|AAD|AAFP|ACOG|AHA|ADA|ACS|SAMHSA|USPSTF|Mayo Clinic|Mayo|MedlinePlus Magazine|MedlinePlus|StatPearls|NCBI Bookshelf|NCBI|Cleveland Clinic|Johns Hopkins|NICE|UNICEF|Bộ Y tế)(?: \\((?:Mỹ|Hoa Kỳ|Anh|NIH, Hoa Kỳ)\\))?)";
const PUBS = `${PUB}(?:(?:, | và | lẫn | cùng |\\/)${PUB})*`;
const S = "(^|[.;:!?]\\s+|\\(|\\n(?:• )?|• )"; // đầu một ý
const CUE = "(?:nêu thêm|nêu rõ|nêu|cho biết|mô tả|ghi rõ|ghi nhận|ghi|lưu ý|nhấn mạnh|liệt kê|nói rõ|nói|định nghĩa|giải thích|thêm)";
const ADVISE = "(?:khuyến khích|khuyên|khuyến cáo|khuyến nghị|gợi ý|đề nghị|hướng dẫn)";
const WHO_TO = "(mọi người|bạn|người bệnh|người lớn|phụ nữ mang thai|cha mẹ|người chăm sóc)";
const NEG = "(?:không|đừng|tránh|hạn chế|nên|chỉ|hãy|theo)";
const IMPER = "(?:nên|không|đừng|tránh|hạn chế|hãy|cần|chỉ|giữ|bỏ|ngưng|ngừng|uống|ăn|tập|đi|gọi|dùng|cho|chọn|giảm|tăng|thay|kiểm tra|theo dõi|nghỉ|ngủ|rửa|che|đeo|tiêm|bôi|chườm)";
const NB = "(?![\\p{L}])";

const RULES: [RegExp, string][] = [
  // số khẩn của Anh không dùng được ở Việt Nam: "(NHS 111 ở Anh)", "(ở Anh là gọi đường dây NHS 111)", "(NHS Anh nêu gọi 111)"
  [/\s*\((?:ở Anh là |gọi )?(?:gọi )?(?:đường dây )?NHS(?: Anh)? (?:nêu gọi )?111(?: ở Anh)?\)/gu, ""],
  // "(NHS)", "(theo CDC)", "(NHS, CDC)" — chú thích nguồn trong ngoặc; "(NHS Anh nêu 11h–15h)" → "(11h–15h)"
  [new RegExp(`\\s*\\((?:theo |nguồn:? )?${PUBS}\\)`, "gu"), ""],
  [new RegExp(`\\((?:theo )?${PUBS} ${CUE} `, "gu"), "("],
  // "Theo NHS, …" / "Theo NHS thì …"
  [new RegExp(`${S}[Tt]heo ${PUBS}(?:,| thì)?\\s+(?!${CUE}|:)`, "gu"), "$1\u0001"],
  // "NHS (khi nôn hoặc tiêu chảy): …" → "Khi nôn hoặc tiêu chảy: …"; "NHS (về rung nhĩ) nêu …" → "Với rung nhĩ, …"
  [new RegExp(`${S}${PUBS} \\(về ([^()]{2,40})\\) (?:${CUE}|${ADVISE})\\s+`, "gu"), "$1\u0001với $2, "],
  [new RegExp(`${S}${PUBS} \\((?:về |nói về )?([^()]{2,60})\\):\\s*`, "gu"), "$1\u0001$2: "],
  // "Mayo Clinic, đợi cấp cứu: …"
  [new RegExp(`${S}${PUBS}, (?=[a-zà-ỹđ])`, "gu"), "$1\u0001"],
  // 18/10: "CDC nêu thêm vẹm, sò điệp…" — bỏ tên cơ quan mà cắt cả động từ thì còn trơ một danh sách ("Vẹm, sò điệp…", 36 thẻ có kiểu
  //   câu này) → giữ ý "thêm" bằng lời thường: "Ngoài ra còn vẹm, sò điệp…".
  [new RegExp(`${S}(?:[Tt]heo )?${PUBS}(?: (?:cũng|còn))? nêu thêm(?: rằng)?:?\\s+`, "gu"), "$1\u0001ngoài ra còn "],
  // "NHS: …", "NHS cũng nêu: …", "MedlinePlus nêu thêm: …", "Theo MedlinePlus: …", "Mayo Clinic ghi rõ …"
  [new RegExp(`${S}(?:[Tt]heo )?${PUBS}(?: (?:cũng|còn|thì))?(?: ${CUE})?(?: rằng| là)?\\s*:\\s*`, "gu"), "$1\u0001"],
  [new RegExp(`${S}(?:[Tt]heo )?${PUBS}(?: (?:cũng|còn))? ${CUE}(?: rằng| là)?\\s+`, "gu"), "$1\u0001"],
  // "NHS gợi ý kiểu ăn Địa Trung Hải" → "Nên theo kiểu ăn Địa Trung Hải"
  [new RegExp(`${S}${PUBS}(?: (?:cũng|còn))? ${ADVISE} (kiểu|chế độ|cách ăn)`, "gu"), "$1\u0001nên theo $2"],
  [new RegExp(`(?<=[\\p{L}\\d,;)] )${PUBS}(?: (?:cũng|còn))? ${ADVISE} (kiểu|chế độ|cách ăn)`, "gu"), "nên theo $1"],
  // "NHS khuyên tránh …" → "Tránh …"; "NHS khuyên mọi người cân nhắc …" → "Mọi người nên cân nhắc …"; "khuyên ăn …" → "Nên ăn …"
  [new RegExp(`${S}${PUBS}(?: (?:cũng|còn))? ${ADVISE}(?: rằng)? ${WHO_TO} (?!${IMPER}${NB})`, "gu"), "$1\u0001$2 nên "],
  [new RegExp(`${S}${PUBS}(?: (?:cũng|còn))? ${ADVISE}(?: rằng)?(?: ${WHO_TO})?\\s+(?=${NEG}${NB})`, "gu"), "$1\u0001$2 "],
  [new RegExp(`${S}${PUBS}(?: (?:cũng|còn))? ${ADVISE}(?: rằng)?(?: ${WHO_TO})?\\s+`, "gu"), "$1\u0001$2 nên "],
  // "NHS xếp cà phê vào …" → "cà phê được xếp vào …"
  [new RegExp(`${S}${PUBS} xếp (.{2,80}?) vào `, "gu"), "$1\u0001$2 được xếp vào "],
  // "NIDDK không nêu …" → "Hướng dẫn y khoa không nêu …"
  [new RegExp(`${S}${PUBS} (không|chưa) `, "gu"), "$1\u0001hướng dẫn y khoa $2 "],
  // giữa câu
  //  "được Mayo Clinic gợi ý" → "được gợi ý", "mức NHS khuyến cáo" → "mức khuyến cáo"
  [new RegExp(`(được|do|mà|mức) ${PUBS} (${ADVISE}|${CUE})`, "gu"), "$1 $2"],
  //  "**Cà phê:** theo FDA (Mỹ), người lớn …" → "**Cà phê:** người lớn …"; "ngưỡng 140/90 của NHS" → "ngưỡng 140/90"
  [new RegExp(`(:\\**) theo ${PUBS},\\s*`, "gu"), "$1 "],
  [new RegExp(`([Ll]ời khuyên|[Hh]ướng dẫn) của ${PUBS}`, "gu"), "$1 y khoa"],
  [new RegExp(` của ${PUBS}(?=[\\s,.;:)]|$)`, "gu"), ""],
  //  "Yếu tố nguy cơ theo Mayo Clinic: …", "…, theo NHS", "theo NHS đa số …" → bỏ "theo …"
  [new RegExp(`,? theo ${PUBS}(?=[\\s.,:;)]|$)`, "gu"), ""],
  //  "Các dạng nốt NHS nêu: …", "các yếu tố khởi phát NHS và NINDS nêu." → bỏ "NHS nêu"
  [new RegExp(` ${PUBS} (?:${CUE})(?=[.:,;])`, "gu"), ""],
  //  "Khi đau răng NHS khuyên không ăn …" → "Khi đau răng không ăn …"; "MedlinePlus khuyên ăn ít …" → "nên ăn ít …"
  [new RegExp(`(?<=[\\p{L}\\d,;)] )${PUBS}(?: (?:cũng|còn))? ${ADVISE}(?: rằng)? ${WHO_TO} (?!${IMPER}${NB})`, "gu"), "$1 nên "],
  [new RegExp(`(?<=[\\p{L}\\d,;)] )${PUBS}(?: (?:cũng|còn))? ${ADVISE}(?: rằng)?(?: ${WHO_TO})?\\s+(?=${NEG}${NB})`, "gu"), "$1 "],
  [new RegExp(`(?<=[\\p{L}\\d,;)] )${PUBS}(?: (?:cũng|còn))? ${ADVISE}(?: rằng)?(?: ${WHO_TO})?\\s+`, "gu"), "$1 nên "],
  //  "MedlinePlus nói ngưng rượu là …", "NIH còn nêu da xanh …", "Mayo Clinic cho biết tránh …" → bỏ tên + động từ trích dẫn
  [new RegExp(`(?<=[\\p{L}\\d,;)] )${PUBS}(?: (?:cũng|còn))? (?:nêu thêm|nêu|cho biết|nói|ghi nhận|ghi)(?: rằng)?:?\\s+`, "gu"), ""],
  //  "Nguồn MedlinePlus ghi …" → "Nguồn ghi …"; "lời khuyên của NHS và Mayo Clinic" → "lời khuyên y khoa"
  [new RegExp(`([Nn]guồn) ${PUBS}`, "gu"), "$1"],
  // còn lại: tên cơ quan đứng đầu ý trước một động từ ("NHS chỉ cho ăn …") → bỏ tên
  [new RegExp(`${S}${PUBS} (?=[a-zà-ỹđ])`, "gu"), "$1\u0001"],
];

const PUB_RE = new RegExp(PUB, "gu");
// Hai nguồn nói KHÁC nhau trong cùng một ý ("NHS tính là trước 24 tuần; MedlinePlus tính là trước tuần 20") → giữ nguyên tên,
// bỏ tên đi thì thành hai câu mâu thuẫn không rõ của ai.
const CONTRAST = /(khác nhau|chưa thống nhất|(^|\s)lại\s|trong khi|cho rằng|tính là|nhưng)/u;
function plainLine(line: string): string {
  const pubs = new Set((line.match(PUB_RE) ?? []).map((x) => x.replace(/ (Clinic|\(Anh\)|Anh)$/u, "")));
  if (pubs.size >= 2 && CONTRAST.test(line)) return line;
  let s = line;
  for (const [re, to] of RULES) s = s.replace(re, to);
  s = s.replace(/\u0001\s+/gu, "\u0001");
  // viết hoa lại chữ đầu ý chỗ vừa bỏ tên ("NHS: tránh …" → "Tránh …"); trong ngoặc / sau dấu ":" thì giữ chữ thường
  s = s.replace(/\u0001([a-zà-ỹđ])?/gu, (_m, c: string | undefined, off: number, all: string) => {
    if (!c) return "";
    const before = all.slice(0, off);
    return before === "" || /([.!?]\s+|• )$/u.test(before) ? c.toUpperCase() : c;
  });
  return s.replace(/\bnên nên /gu, "nên ").replace(/[ \t]{2,}/g, " ");
}

/** Bỏ tên cơ quan nguồn khỏi câu chữ hiển thị (nội dung giữ nguyên). Xét từng dòng. */
export function plainPub(text: string): string {
  return text.split("\n").map(plainLine).join("\n");
}

/** Tách các dòng "📚 Nguồn …" khỏi lời đáp. */
export function splitSource(content: string): { text: string; src?: string } {
  const lines = content.split("\n");
  const src = lines.filter((l) => /^📚 Nguồn/u.test(l.trim()));
  if (!src.length) return { text: content };
  // "đã hơn một năm" là lời nhắc an toàn (thông tin có thể cũ) — vẫn để lại trong lời đáp
  const stale = src.some((l) => /đã hơn một năm/u.test(l));
  const text = lines.filter((l) => !/^📚 Nguồn/u.test(l.trim())).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text: stale ? `${text}\n\n(Thông tin này Lomi kiểm lại đã hơn một năm — bạn nên hỏi lại dược sĩ / bác sĩ cho chắc.)` : text, src: src.join("\n") };
}

/** Lời đáp sức khoẻ có nguồn → câu chữ tự nhiên + nguồn cất riêng. Lời đáp không có dòng nguồn thì giữ nguyên. */
export function tidyCited(content: string): { text: string; src?: string } {
  const r = splitSource(content);
  return r.src ? { text: plainPub(r.text), src: r.src } : r;
}

/** Hỏi nguồn ngắn gọn: "nguồn đâu", "lấy ở đâu ra", "dựa vào đâu", "có nguồn không" (không phải "nguồn gốc", "nguồn canxi"…). */
export function asksSource(text: string): boolean {
  const n = normalizeVi(text);
  return n.split(" ").length <= 9 && VN(/\b(có nguồn|nguồn (ở )?đâu|nguồn nào|nguồn gì|nguồn tham khảo|nguồn tin|xin nguồn|cho (xin )?nguồn|dẫn nguồn|lấy (ở|từ) đâu|ở đâu ra|dựa vào đâu|căn cứ (vào )?đâu|tài liệu nào|trang nào)\b|^nguồn( (e|em|ạ|vậy|nha|nhé|đâu))?$/).test(n);
}

/** Dòng nguồn đã cất → câu trả lời khi được hỏi. */
export function sourceSay(src: string): string {
  const items = src.split("\n").map((l) => l.replace(/^📚 Nguồn\s*[:—-]\s*/u, "").trim()).filter(Boolean);
  return [`Phần Lomi vừa nói dựa trên:`, items.map((x) => `• ${x}`).join("\n")].join("\n\n");
}
