// ────────────────────────────────────────────────────────────────────────
// "X CÓ GÂY / LÀM Y KHÔNG?" (31/10, Kir gửi ảnh: "Vitamin C có làm mất ngủ k?" → Lomi đọc nguyên thẻ Mất ngủ).
//   Câu hỏi QUAN HỆ giữa một thứ (vitamin, món, đồ uống, thói quen, thuốc) và một triệu chứng / bệnh.
//   Trả lời ĐÚNG câu hỏi: tìm trong kho có nguồn (thẻ bệnh lib/medkb + thẻ vitamin lib/lomiNutrients) những dòng
//   nhắc cả hai. Có → trích đúng dòng đó. Không có → nói thật là nguồn chưa nhắc, không đọc cả thẻ.
//   Không nêu liều, không chẩn đoán. Chạy trên máy.
// ────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { displayName, findMedTopicId, loadMedTopic, type MedTopic } from "@/lib/lomiMed";
import { foodOf, nutrientOf, type Nutrient } from "@/lib/lomiNutrients";
import { findDrug, type DrugFact } from "@/lib/lomiDrugData";
import { findFolk } from "@/lib/lomiFolk";

const N = (s: string) => ` ${normalizeVi(s)} `;

/** Tách câu: X — động từ — Y — đuôi hỏi. */
const VERB = "(?:có thể |có )?(?:làm cho|làm|gây ra|gây|khiến|dẫn tới|dẫn đến|bị|giúp cho|giúp|tốt cho|hại|ảnh hưởng tới|ảnh hưởng đến)";
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
  [/\b(tieu duong|dai thao duong)\b/, ["tiểu đường", "đường huyết"]],
  [/\b(tang can|map|beo)\b/, ["tăng cân", "béo"]],
  [/\b(huyet ap|cao huyet ap|tang huyet ap)\b/, ["huyết áp"]],
  [/\b(rung toc)\b/, ["rụng tóc"]],
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

export type CauseParse = { x: string; xShow: string; y: string; verb: "cause" | "help"; nut: Nutrient | null };
export function parseCause(q: string): CauseParse | null {
  const low = q.normalize("NFC").toLowerCase().replace(/[?!.…]+/gu, " ").replace(/\s+/g, " ").trim();
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
  return { x, xShow: xShow || x, y, verb, nut: nutrientOf(x) };
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
  const known = !!(p.nut || food || isDrugish || X_SYN.some(([re]) => re.test(xn)));
  // Phải nhận ra ít nhất một vế (Y là bệnh / triệu chứng có trong kho, hoặc X là chất / món đã biết)
  const yKnown = !!yMed || Y_SYN.some(([re]) => re.test(N(p.y)));
  if (!known || !yKnown || (xMed && !isDrugish && !p.nut && !food && !X_SYN.some(([re]) => re.test(xn)))) return null;

  const mt = yMed ? await loadMedTopic(yMed) : null;
  const yName = mt ? displayName(mt) : p.y;
  const xName = p.nut?.name ?? food?.name ?? p.xShow;
  const xKeys = [...new Set([...keysOf(p.x, [...(p.nut?.names ?? []), ...(food?.names ?? [])], X_SYN), ...keysOf(p.xShow, [], X_SYN)])];
  const yKeys = keysOf(p.y, mt ? mt.names : [], Y_SYN);

  // X chỉ tính khi xuất hiện NGOÀI tên bệnh Y ("đường" trong "tiểu đường" không tính)
  const yNames = [...yKeys, ...(mt?.names ?? [])].map((k) => N(k).trim()).filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
  const hasX = (text: string) => {
    let t = N(text.replace(/\*\*/g, ""));
    for (const k of yNames) t = t.split(` ${k} `).join(" | ");
    return xKeys.some((k) => t.includes(N(k)));
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

  const yAsk = p.y;
  const ask = p.verb === "help" ? `**${xName}** có giúp **${yAsk}** không` : `**${xName}** có gây **${yAsk}** không`;
  if (ev.length) {
    return {
      text: `Về chuyện ${ask}, các nguồn Lomi đã đối chiếu nói thế này nè:\n${ev.map((e) => `• ${e}`).join("\n")}${p.verb === "cause" ? `\n\nNếu ${yName.toLowerCase()} kéo dài hoặc làm bạn khó chịu nhiều thì nên hỏi bác sĩ để tìm đúng nguyên nhân nha.` : ""}`,
      medId: yMed ?? undefined,
    };
  }
  // Không có dòng nào nhắc cả hai → nói thật, kèm điều nguồn CÓ nói (ngắn gọn), không đọc cả thẻ.
  const parts: string[] = [];
  parts.push(`Các nguồn y khoa Lomi đã đối chiếu **chưa nhắc** ${p.verb === "help" ? `${xName} giúp ${yAsk}` : `${xName} gây ${yAsk}`}, nên Lomi không dám nói có hay không 🙏`);
  if (isDrugish) parts.push(`Có gây ${yAsk} hay không còn **tuỳ thành phần** của từng loại thuốc — xem mục tác dụng phụ / lưu ý trên tờ hướng dẫn trong hộp, hoặc đưa hộp thuốc cho dược sĩ xem.`);
  if (p.nut?.tooMuch.length && p.verb === "cause") parts.push(`Điều nguồn có nói về **${p.nut.name}** khi dùng nhiều:\n${p.nut.tooMuch.slice(0, 2).map((f) => `• ${f.text}`).join("\n")}`);
  if (mt && p.verb === "cause" && mt.causes.length) parts.push(`Còn ${yName.toLowerCase()} thì nguồn hay nêu những nguyên nhân này:\n${mt.causes.slice(0, 2).map((f) => `• ${f.text}`).join("\n")}`);
  if (mt && p.verb === "help" && mt.care.length) parts.push(`Những cách nguồn có nêu cho ${yName.toLowerCase()}:\n${mt.care.slice(0, 2).map((f) => `• ${f.text}`).join("\n")}`);
  if (p.verb === "cause") parts.push(`Nếu bạn thấy ${yAsk} bắt đầu từ khi ${p.nut || food || isDrugish ? `dùng ${xName}` : xName}, cứ ghi lại rồi hỏi dược sĩ / bác sĩ cho chắc nha.${isDrugish ? " Đang buồn ngủ thì đừng lái xe." : ""}`);
  return { text: parts.join("\n\n"), medId: yMed ?? undefined };
}

