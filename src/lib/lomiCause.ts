// ────────────────────────────────────────────────────────────────────────
// "X CÓ GÂY / LÀM Y KHÔNG?" (31/10, Kir gửi ảnh: "Vitamin C có làm mất ngủ k?" → Lomi đọc nguyên thẻ Mất ngủ).
//   Câu hỏi QUAN HỆ giữa một thứ (vitamin, món, đồ uống, thói quen, thuốc) và một triệu chứng / bệnh.
//   Trả lời ĐÚNG câu hỏi: tìm trong kho có nguồn (thẻ bệnh lib/medkb + thẻ vitamin lib/lomiNutrients) những dòng
//   nhắc cả hai. Có → trích đúng dòng đó. Không có → nói thật là nguồn chưa nhắc, không đọc cả thẻ.
//   Không nêu liều, không chẩn đoán. Chạy trên máy.
// ────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { displayName, findMedTopicId, loadMedTopic, type MedTopic } from "@/lib/lomiMed";
import { NUTRIENTS, foodOf, nutrientOf, type Nutrient } from "@/lib/lomiNutrients";
import { findDrug, type DrugFact } from "@/lib/lomiDrugData";
import { findFolk } from "@/lib/lomiFolk";

const N = (s: string) => ` ${normalizeVi(s)} `;

/** Tách câu: X — động từ — Y — đuôi hỏi. */
const VERB = "(?:có thể |có )?(?:làm cho|làm|gây ra|gây|khiến|dẫn tới|dẫn đến|bị|giúp cho|giúp|tốt cho|hại|ảnh hưởng tới|ảnh hưởng đến|ảnh hưởng)";
const TAIL = "(?:\\s+(?:hay )?(?:không|ko|k|hông|hem|hok|hả|chứ|ha|ạ|vậy|nha|thật không|đúng không|phải không))+";
const RE = new RegExp(`^(?:cho (?:em|anh|chị|tui|mình|con|cô|chú|bác) hỏi\\s+)?(.{2,40}?)\\s+(${VERB})\\s+(.{2,40}?)${TAIL}\\s*$`, "u");

const X_SYN: [RegExp, string[]][] = [
  [/\b(ca phe|cafe|cf|caffeine|cafein)\b/, ["cà phê", "caffeine", "cafein"]],
  [/\b(tra xanh|tra sua|hong tra|uong tra|tra da|tra dao|tra den|tra)\b(?<! kiem tra)(?! cuu)/, ["trà", "caffeine"]],
  [/\b(nuoc tang luc|coca|cola|pepsi|sting|redbull)\b/, ["caffeine", "cola", "nước tăng lực"]],
  [/\b(ruou|bia|nhau|do uong co con)\b/, ["rượu", "bia", "đồ uống có cồn", "cồn"]],
  [/\b(thuoc la|hut thuoc|thuoc lao|vape|thuoc la dien tu)\b/, ["thuốc lá", "hút thuốc", "nicotine"]],
  [/\b(duong|do ngot|banh keo|keo|nuoc ngot|an ngot)\b/, ["đường", "đồ ngọt", "ngọt"]],
  [/\b(an cay|ot|do cay|cay)\b/, ["cay", "ớt"]],
  [/\b(do chien|dau mo|chien ran|do beo)\b/, ["chiên", "dầu mỡ", "chất béo", "béo"]],
  [/\b(an toi muon|toi muon|an khuya|an dem|an muon|khuya)\b/, ["tối muộn", "ăn khuya", "bữa lớn"]],
  [/\b(dien thoai|man hinh|luot dien thoai|choi game)\b/, ["màn hình", "điện thoại"]],
  [/\b(muoi|an man|do man|man)\b/, ["muối", "mặn"]],
  [/\b(sua)\b/, ["sữa"]],
  [/\b(tap the duc|tap gym|chay bo|van dong|di bo|dap xe|boi loi|tap yoga|yoga)\b/, ["tập thể dục", "vận động", "hoạt động thể chất", "đi bộ", "tập"]],
  [/\b(ngu trua)\b/, ["ngủ trưa", "ngủ ngày"]],
  [/\b(thieu ngu|ngu it|thuc khuya|mat ngu|ngu khong du)\b/, ["thiếu ngủ", "ngủ ít", "ngủ không đủ", "thiếu ngủ"]],
  [/\b(ngoi lau|it van dong|luoi van dong|ngoi may tinh)\b/, ["ít vận động", "ngồi lâu"]],
  [/\b(nuoc lanh|nuoc da|da lanh)\b/, ["nước lạnh", "đồ lạnh"]],
  // chất bổ sung / thảo dược hay hỏi mà kho chưa có thẻ riêng — vẫn nhận câu để nói thật
  [/\b(magie|magnesium|melatonin|collagen|glucosamine|nhan sam|sam|dong trung ha thao|yen sao|to yen|mat ong|tinh dau|hoa cuc|tra hoa cuc|gung|nghe|curcumin|probiotic|men vi sinh|tao bien|spirulina|vitamin tong hop|thuc pham chuc nang|tpcn)\b/, []],
];
const Y_SYN: [RegExp, string[]][] = [
  [/\b(mat ngu|kho ngu|thuc khuya|tinh ngu|khong ngu duoc)\b/, ["mất ngủ", "khó ngủ", "thao thức", "tỉnh táo", "giấc ngủ"]],
  [/\b(ngu ngon|de ngu|ngu sau)\b/, ["mất ngủ", "giấc ngủ", "ngủ"]],
  [/\b(buon ngu|lo mo|ngu ga)\b/, ["buồn ngủ", "lơ mơ"]],
  [/\b(tao bon)\b/, ["táo bón"]],
  [/\b(tieu chay|di ngoai)\b/, ["tiêu chảy"]],
  [/\b(mun|trung ca)\b/, ["mụn", "trứng cá"]],
  [/\b(dau bung|dau da day|dau bao tu)\b/, ["đau bụng", "dạ dày"]],
  [/\b(dau dau)\b/, ["đau đầu"]],
  [/\b(soi than)\b/, ["sỏi thận", "sỏi"]],
  [/\b(tieu duong|dai thao duong|duong huyet|duong mau)\b/, ["tiểu đường", "đường huyết"]],
  [/\b(tang can|map|beo)\b/, ["tăng cân", "béo"]],
  [/\b(huyet ap|cao huyet ap|tang huyet ap)\b/, ["huyết áp"]],
  [/\b(rung toc)\b/, ["rụng tóc"]],
  [/\b(dom|nhieu dom|co dom)\b/, ["đờm", "đàm", "ho có đờm"]],
  [/\b(nong trong|nhiet mieng|loet mieng)\b/, ["nhiệt miệng", "loét miệng"]],
];

const strip = (s: string) =>
  s.replace(/^(?:(?:à|ờ|mà|vậy|thế|cho hỏi|hỏi chút)\s+)*/u, "")
    .replace(/^(?:(?:em|anh|chị|tui|tôi|mình|con|bé|mẹ|ba|người ta)\s+)?(?:(?:hay|thường|mỗi ngày|đang|có)\s+)?/u, "")
    .replace(/^(?:uống|ăn|dùng|xài|bổ sung|hút|thức|nằm)\s+(?!muộn|khuya|đêm)/u, "")
    .replace(/^(?:nhiều|thêm)\s+/u, "")
    .trim();

function keysOf(x: string, extra: string[], table: [RegExp, string[]][]): string[] {
  const n = N(x);
  const out = new Set<string>([x.normalize("NFC").toLowerCase().trim(), ...extra]);
  for (const [re, ks] of table) if (re.test(n)) ks.forEach((k) => out.add(k));
  return [...out].filter((k) => k.length >= 2);
}
const hasKey = (text: string, keys: string[]) => {
  const t = N(text.replace(/\*\*/g, ""));
  return keys.some((k) => t.includes(N(k)));
};

export type CauseParse = { x: string; xShow: string; y: string; yShow?: string; aff?: boolean; verb: "cause" | "help"; nut: Nutrient | null };
export function parseCause(q: string): CauseParse | null {
  let low = q.normalize("NFC").toLowerCase().replace(/[?!.…,]+/gu, " ").replace(/\s+/g, " ").trim();
  // "nếu uống vitamin C buổi tối thì có mất ngủ không" → "uống vitamin C buổi tối có làm mất ngủ không"
  low = low.replace(/^nếu\s+(.+?)\s+thì\s+có\s+(?:bị\s+)?(?!làm|gây|giúp|khiến)/u, "$1 có làm ");
  // "vitamin C có làm mất ngủ nếu uống trước giờ ngủ 2 tiếng không" → bỏ vế "nếu …"
  low = low.replace(/\s+nếu\s+.+?(\s+(?:không|ko|k|hông))$/u, "$1");
  if (low.split(" ").length > 16) return null;
  const m = low.match(RE);
  if (!m) return null;
  const x = strip(m[1]);
  const xShow = m[1].replace(/^(?:(?:à|ờ|mà|vậy|thế|cho hỏi|hỏi chút)\s+)*/u, "").replace(/^(?:(?:em|anh|chị|tui|tôi|mình|con|bé|người ta)\s+)?(?:(?:hay|thường|đang|có)\s+)?/u, "").trim();
  let y = m[3].replace(/\s+(?:hơn|nhiều hơn|quá)$/u, "").trim();
  if (!x || !y || x.length > 30 || y.length > 30) return null;
  // "ăn gì có giúp…" / "làm sao…" / "cái gì gây…" — câu hỏi mở, để lớp khác
  if (/\b(gì|nào|sao|ai|đâu)\b/u.test(x)) return null;
  const verb = /giúp|tốt cho/u.test(m[2]) ? "help" : "cause";
  if (verb === "help") y = y.replace(/^(?:cho\s+)?/u, "");
  // "giúp giảm huyết áp", "giúp hạ đường huyết" → bệnh là huyết áp cao / đường huyết cao
  const yShow = y;
  if (verb === "help") {
    const y2 = y.replace(/^(?:giảm|hạ|bớt|trị|chữa|ngừa|phòng|đỡ)\s+/u, "");
    if (y2 !== y) y = /^huyết áp$/u.test(y2) ? "tăng huyết áp" : /^(?:đường huyết|đường máu)$/u.test(y2) ? "tiểu đường" : /^(?:mỡ máu|cholesterol)$/u.test(y2) ? "mỡ máu cao" : y2;
  }
  return { x, xShow: xShow || x, y, yShow, verb, aff: /ảnh hưởng/u.test(m[2]), nut: nutrientOf(x) };
}

const SECTIONS = (t: MedTopic): DrugFact[] => [
  ...t.causes, ...t.about, ...t.signs, ...t.care,
  ...(t.diet ? [...t.diet.avoid, ...t.diet.ok] : []),
  ...t.doctor,
];

/** Trả lời "X có gây / giúp Y không". null = không phải dạng câu này (hoặc không đủ dữ kiện để nhận). */
export async function causeReply(q: string): Promise<{ text: string; medId?: string } | null> {
  const p = parseCause(q);
  if (!p) return null;
  const xn = `${N(p.x)}${N(p.xShow)}`;
  // Quan niệm dân gian đã có bài riêng ("ăn cay gây đau dạ dày", "cua + cam ngộ độc") → để lớp mẹo dân gian trả lời.
  const fk = findFolk(q);
  if (fk && (fk.verdict === "myth" || fk.belief || fk.ctx)) return null;
  // Thuốc có trong kho thuốc → lớp thuốc (tác dụng phụ có nguồn) trả lời.
  if (findDrug(p.x)) return null;
  const ySyn = Y_SYN.find(([re]) => re.test(N(p.y)))?.[1];
  const yMed = findMedTopicId(p.y) ?? findMedTopicId(`bị ${p.y}`) ?? (ySyn ? findMedTopicId(ySyn[0]) : null);
  const xMed = findMedTopicId(p.x);
  const food = p.nut ? null : foodOf(p.x);
  const isDrugish = /^ thuoc\b/.test(xn);
  const eatDrink = /^(?:uống|ăn)\s+\S/u.test(p.xShow) && p.xShow.split(" ").length <= 5;
  const known = !!(p.nut || food || isDrugish || eatDrink || X_SYN.some(([re]) => re.test(xn)));
  // Phải nhận ra ít nhất một vế (Y là bệnh / triệu chứng có trong kho, hoặc X là chất / món đã biết)
  const yKnown = !!yMed || Y_SYN.some(([re]) => re.test(N(p.y)));
  if (!known || !yKnown || (xMed && !isDrugish && !eatDrink && !p.nut && !food && !X_SYN.some(([re]) => re.test(xn)))) return null;

  const mt = yMed ? await loadMedTopic(yMed) : null;
  const yName = mt ? displayName(mt) : p.y;
  const xName = p.nut?.name ?? food?.name ?? p.xShow;
  const xKeys = [...new Set([...keysOf(p.x, [...(p.nut?.names ?? []), ...(food?.names ?? [])], X_SYN), ...keysOf(p.xShow, [], X_SYN)])];
  const yKeys = keysOf(p.y, mt ? mt.names : [], Y_SYN);

  // X chỉ tính khi xuất hiện NGOÀI tên bệnh Y ("đường" trong "tiểu đường" không tính)
  const yNames0 = [...yKeys, ...(mt?.names ?? [])].filter((k) => k.trim().length >= 3).sort((a, b) => b.length - a.length);
  const A = (s: string) => ` ${s.normalize("NFC").toLowerCase().replace(/\*\*/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  const accented = (k: string) => /[^\x00-\x7F]/.test(k);
  const hasX = (text: string) => {
    // so CÓ DẤU khi từ khoá có dấu ("cam" bỏ dấu trùng "cảm", "cám"); X chỉ tính khi nằm NGOÀI tên bệnh Y
    let ta = A(text);
    for (const k of yNames0) ta = ta.split(A(k)).join(" | ");
    const tn = N(ta);
    return xKeys.some((k) => (accented(k) ? ta.includes(A(k)) : tn.includes(N(k))));
  };
  const ev: string[] = [];
  const push = (t: string) => {
    const s = t.trim();
    if (s && !ev.includes(s) && ev.length < 3) ev.push(s);
  };
  // (a) thẻ bệnh Y nhắc tới X
  if (mt) {
    const VERD = { avoid: "nên tránh", limit: "nên hạn chế", ok: "ăn / uống được", good: "nên dùng" } as const;
    for (const f of mt.diet?.foods ?? []) if (hasX(`${f.name} ${f.aliases.join(" ")}`)) push(`Với ${displayName(mt).toLowerCase()}, **${f.name}** ${VERD[f.verdict]}${f.note ? ` — ${f.note}` : ""}`);
    for (const f of [...mt.causes].reverse()) if (hasX(f.text)) ev.unshift(f.text.trim());
    if (ev.length > 3) ev.length = 3;
    for (const f of SECTIONS(mt)) if (hasX(f.text)) push(f.text);
  }
  // (b) thẻ chất X nhắc tới Y (tác hại khi dùng nhiều, bệnh có nêu chất này)
  if (p.nut) {
    for (const t of p.nut.topics) if ((yMed && t.id === yMed) || hasKey(t.text, yKeys)) push(t.text.replace(/^\p{L}/u, (c) => c.toUpperCase()));
    for (const f of [...p.nut.tooMuch, ...p.nut.what]) if (hasKey(f.text, yKeys)) push(f.text);
  }
  if (food?.caution) for (const f of food.caution) if (hasKey(f.text, yKeys)) push(f.text);

  const yAsk = p.yShow ?? p.y;
  const ask = p.verb === "help" ? `**${xName}** có giúp **${yAsk}** không` : `**${xName}** có ${p.aff ? "ảnh hưởng tới" : "gây"} **${yAsk}** không`;
  if (ev.length) {
    return {
      text: `Về chuyện ${ask}, các nguồn Lomi đã đối chiếu nói thế này nè:\n${ev.map((e) => `• ${e}`).join("\n")}${p.verb === "cause" ? `\n\nNếu ${yName.toLowerCase()} kéo dài hoặc làm bạn khó chịu nhiều thì nên hỏi bác sĩ để tìm đúng nguyên nhân nha.` : ""}`,
      medId: yMed ?? undefined,
    };
  }
  // Không có dòng nào nhắc cả hai → nói thật, kèm điều nguồn CÓ nói (ngắn gọn), không đọc cả thẻ.
  const parts: string[] = [];
  parts.push(`Các nguồn y khoa Lomi đã đối chiếu **chưa nhắc** ${p.verb === "help" ? `${xName} giúp ${yAsk}` : `${xName} ${p.aff ? "ảnh hưởng tới" : "gây"} ${yAsk}`}, nên Lomi không dám nói có hay không 🙏`);
  if (isDrugish) parts.push(`Có gây ${yAsk} hay không còn **tuỳ thành phần** của từng loại thuốc — xem mục tác dụng phụ / lưu ý trên tờ hướng dẫn trong hộp, hoặc đưa hộp thuốc cho dược sĩ xem.`);
  if (p.nut?.tooMuch.length && p.verb === "cause") parts.push(`Điều nguồn có nói về **${p.nut.name}** khi dùng nhiều:\n${p.nut.tooMuch.slice(0, 2).map((f) => `• ${f.text}`).join("\n")}`);
  if (mt && p.verb === "cause" && mt.causes.length) parts.push(`Còn ${yName.toLowerCase()} thì nguồn hay nêu những nguyên nhân này:\n${mt.causes.slice(0, 2).map((f) => `• ${f.text}`).join("\n")}`);
  if (mt && p.verb === "help" && mt.care.length) parts.push(`Những cách nguồn có nêu cho ${yName.toLowerCase()}:\n${mt.care.slice(0, 2).map((f) => `• ${f.text}`).join("\n")}`);
  if (p.verb === "cause") parts.push(`Nếu bạn thấy ${yAsk} bắt đầu từ khi ${p.nut || food || isDrugish ? `dùng ${xName}` : xName}, cứ ghi lại rồi hỏi dược sĩ / bác sĩ cho chắc nha.${isDrugish && /buồn ngủ|lơ mơ|chóng mặt/u.test(yAsk) ? " Đang buồn ngủ, chóng mặt thì đừng lái xe." : ""}`);
  return { text: parts.join("\n\n"), medId: yMed ?? undefined };
}


// ────────────────────────────────────────────────────────────────────────
// "A HAY B TỐT HƠN / KHÁC NHAU CHỖ NÀO" (31/10, danh sách ChatGPT lần 6): so hai vitamin, hai thuốc, hai đồ uống có caffeine,
//   hai món. Chỉ đặt cạnh nhau điều nguồn nói về từng thứ; không tự xếp hạng.
// ────────────────────────────────────────────────────────────────────────
const SUPP_RE = /\b(magie|magnesium|melatonin|collagen|glucosamine|nhan sam|dong trung|yen|mat ong|tinh dau|curcumin|probiotic|men vi sinh|sua hat|sua bo|sua|di bo|dap xe|boi|chay bo|yoga|tap)\b/;
const NUT_NAME: Record<string, string> = Object.fromEntries(NUTRIENTS.map((n) => [n.id, n.name]));
const CAFF = /\b(ca phe|cafe|cf|tra xanh|tra|matcha|tra sua|hong tra|nuoc tang luc|coca|cola)\b/;
type Side = { label: string; nut?: Nutrient | null; drug?: ReturnType<typeof findDrug>; food?: ReturnType<typeof foodOf>; caff?: boolean };
function sideOf(t: string): Side | null {
  const x = t.replace(/^(?:nên\s+)?(?:uống|ăn|dùng|bổ sung|xài)\s+/u, "").trim();
  if (!x || x.split(" ").length > 5) return null;
  const drug = findDrug(x);
  if (drug) return { label: drug.ingredient, drug };
  const nut = nutrientOf(x);
  if (nut) return { label: nut.name, nut };
  if (CAFF.test(N(x))) return { label: x, caff: true };
  const food = foodOf(x);
  if (food) return { label: food.name, food };
  return { label: x };
}
export function compareReply(q: string): string | null {
  const low = q.normalize("NFC").toLowerCase().replace(/[?!.…]+/gu, " ").replace(/\s+/g, " ").trim();
  const m = low.match(/^(?:(?:nên|em nên|anh nên|tui nên|mình nên|tôi nên)\s+)?(.{2,30}?)\s+hay\s+(.{2,40})$/u);
  if (!m) return null;
  const cmpWord = /(tốt hơn|hợp hơn|phù hợp|tiện hơn|hiệu quả|khác nhau|khác gì|ít .* hơn|hơn|nên chọn|chọn cái nào)/u.test(m[2]);
  const shouldQ = /^(?:em |anh |tui |mình |tôi )?nên\b/u.test(low);
  if (!cmpWord && !shouldQ) return null;
  const rightHead = m[2].split(/\s+(?=tốt|hợp|phù|tiện|hiệu|khác|ít|nhiều|nên|cho|khi|buổi|vào|lúc|thì|trước|sau)/u)[0];
  const a = sideOf(m[1]);
  const b = sideOf(rightHead);
  if (!a || !b || a.label === b.label) return null;
  const known = (s: Side) => !!(s.drug || s.nut || s.caff || s.food);
  if (!cmpWord && !(known(a) && known(b))) return null;
  // một bên là thuốc có trong kho, bên kia là tên thuốc Lomi chưa có thẻ đầy đủ
  const latin = (s: Side) => /^[a-z][a-z-]{4,}$/.test(s.label);
  if ((a.drug && !known(b) && latin(b)) || (b.drug && !known(a) && latin(a))) {
    const d = (a.drug ?? b.drug)!;
    const other = a.drug ? b.label : a.label;
    return `Lomi đặt cạnh nhau điều đã kiểm chứng được nha:\n• **${d.ingredient}** (${d.group}): ${d.uses[0]?.text ?? ""}${d.contraindications[0] ? `\n   ↳ Lưu ý: ${d.contraindications[0].text}` : ""}\n• **${other}**: Lomi **chưa có thẻ đã kiểm chứng đầy đủ** về thuốc này, nên không so được công dụng, tác dụng phụ hay ai không nên dùng.\n\nChọn thuốc nào cho trường hợp của bạn (tuổi, bệnh nền, dạ dày, đang mang thai, thuốc khác đang dùng) thì hỏi dược sĩ / bác sĩ nha — Lomi không kê thuốc.`;
  }
  const healthy = /(khớp|đường huyết|tim|huyết áp|giảm cân|ngủ|người lớn|trẻ|sức khoẻ|sức khỏe|dạ dày|xương|miễn dịch|đề kháng|cảm|đau|mệt|tiêu hoá|tiêu hóa)/u.test(m[2]);
  if (!known(a) && !known(b)) {
    if (!healthy || !SUPP_RE.test(N(`${m[1]} ${rightHead}`)) && !/^(?:đi bộ|đạp xe|bơi|chạy bộ|tập|yoga|sữa)/u.test(a.label)) return null;
    return `Lomi **chưa có nguồn đã kiểm chứng** so sánh trực tiếp **${a.label}** với **${b.label}**, nên không dám nói cái nào hơn 🙏\n• Mỗi người hợp một kiểu — tuỳ tuổi, bệnh nền, thuốc đang dùng và mục tiêu của bạn\n• Chất bổ sung / thảo dược: hỏi dược sĩ hoặc bác sĩ trước khi dùng, nhất là khi đang uống thuốc, mang thai\n• Vận động: chọn kiểu bạn làm đều được và không làm đau thêm; đang đau khớp, tim mạch thì hỏi bác sĩ nên tập mức nào\n\nMuốn Lomi nói riêng về từng cái thì hỏi kiểu “${a.label} có tác dụng gì” nha.`;
  }
  if (!known(a) || !known(b)) {
    if (!healthy && !(known(a) && known(b))) return null;
  }
  const head = `Lomi không xếp hạng **${a.label}** hay **${b.label}** “tốt hơn” được — tuỳ người, tuỳ lúc. Điều nguồn nói về từng thứ nè:`;
  if (a.drug && b.drug) {
    const one = (d: NonNullable<Side["drug"]>) => `• **${d.ingredient}** (${d.group}): ${d.uses[0]?.text ?? ""}${d.contraindications[0] ? `\n   ↳ Lưu ý: ${d.contraindications[0].text}` : ""}`;
    return `${head}\n${one(a.drug)}\n${one(b.drug)}\n\nChọn thuốc nào cho trường hợp của bạn (tuổi, bệnh nền, đang mang thai, thuốc khác đang dùng) thì hỏi dược sĩ / bác sĩ nha — Lomi không kê thuốc.`;
  }
  if (a.nut && b.nut) {
    const one = (n: Nutrient) => `• **${n.name}**: ${n.what[0]?.text ?? ""} Có trong: ${n.short.text}.`;
    const ctx = /miễn dịch|cảm|đề kháng/u.test(low) ? "\n\nVới cảm lạnh, nguồn nói vitamin C **không ngừa được cảm** với đa số người; ăn uống đa dạng là đủ. Chưa có nguồn nào cho thấy một vitamin “tăng miễn dịch” vượt trội." : "";
    return `${head}\n${one(a.nut)}\n${one(b.nut)}${ctx}\n\nĂn uống đa dạng thì thường đủ cả hai; chỉ uống viên bổ sung khi thiếu hoặc bác sĩ dặn.`;
  }
  if (a.caff && b.caff)
    return `Cả **${a.label}** và **${b.label}** đều có **caffeine** (lượng tuỳ loại và cách pha) ☕ Nguồn về mất ngủ khuyên **tránh trà, cà phê ít nhất 6 giờ trước khi đi ngủ**; người lớn khoẻ mạnh dùng caffeine vừa phải thường không sao.\n\nUống buổi sáng thì cái nào cũng được — chọn theo khẩu vị, và để ý cơ thể: thấy hồi hộp, khó ngủ thì giảm lại nha.`;
  if ((a.food || a.nut) && (b.food || b.nut)) {
    const one = (s: Side) => s.food ? `• **${s.food.name}**: có ${s.food.items.map((i) => NUT_NAME[i.nut] ?? i.nut).join(", ")}` : `• **${s.nut!.name}**: có trong ${s.nut!.short.text}`;
    return `${head}\n${one(a)}\n${one(b)}\n\nĂn đa dạng cả hai là tốt nhất; nếu đang có bệnh (tiểu đường, gout, thận…) thì hỏi Lomi “bị … ăn … được không” để Lomi xem theo bệnh nha.`;
  }
  return null;
}
