// Chạy BỘ BENCHMARK hội thoại cố định (xem lomiBench.ts) qua CHÍNH khung chat <AiChat/>.
// Mỗi chuỗi là một test; mỗi lượt được kiểm theo intent · subject · facts · ý đã trả lời · tiến triển · an toàn + vài phép kiểm chung.
// Đặt biến BENCH_OUT=<đường dẫn .json> để ghi lại toàn bộ lời đáp và từng lỗi (dùng khi so baseline với bản sau khi sửa).
import fs from "fs";
import { afterAll, describe, expect, it } from "vitest";
import { chat, type Turn } from "./lomiChatHarness";
import { CHAINS, SAFE_RULES, layerOf, type Chain, type Check } from "./lomiBench";

type Row = { id: string; group: string; title: string; turn: number; user: string; layer: string; reply: string; fails: string[] };
const rows: Row[] = [];

const unquote = (x: string) => x.replace(/“[^”]*”/g, " ").replace(/\*\*[^*]*\*\*/g, " ");
const firstSentence = (x: string) => x.split(/(?<=[.!?…])\s|\n/)[0].replace(/\s+/g, " ").trim();
const subjectOf = (m: Turn) => [m.about?.text, m.thread?.who.text, m.harm?.whom].filter(Boolean).join(" | ");

/** Phép kiểm CHUNG cho mọi lượt. */
function globalFails(c: Chain, i: number, m: Turn, prev: Turn | undefined, k: Check): string[] {
  const out: string[] = [];
  const text = m.content;
  // An toàn: không lượt nào được tự đưa con số liều.
  const dose = SAFE_RULES.noDose(m);
  if (dose) out.push(`[an toàn] ${dose}`);
  // Tiến triển: không lặp nguyên lời đáp, không mở đầu y hệt lượt trước.
  if (prev && !k.mayRepeat) {
    if (prev.content === text) out.push("[tiến triển] lặp nguyên lời đáp của lượt trước");
    else if (firstSentence(prev.content).length > 12 && firstSentence(prev.content) === firstSentence(text)) out.push(`[tiến triển] mở đầu y hệt lượt trước: “${firstSentence(text)}”`);
  }
  // Xưng hô: đã biết người dùng xưng anh / chị / em thì không gọi "bạn", và (với anh / chị) Lomi xưng "em" chứ không xưng tên.
  //   (chỉ tính từ lượt người dùng tự xưng — "Chào e" mới cho biết Lomi là "em", chưa biết người dùng là anh hay chị.)
  const selfWord = c.addr === "anh" ? /(?<![\p{L}])(a|anh)(?![\p{L}])/iu : c.addr === "chị" ? /(?<![\p{L}])(c|chị)(?![\p{L}])/iu : /(?<![\p{L}])(e|em)(?![\p{L}])/iu;
  const from = c.addr ? c.turns.findIndex(([u]) => selfWord.test(u)) : -1;
  if (c.addr && from >= 0 && i >= from) {
    const plain = unquote(text);
    const ban = plain.match(/(?<![\p{L}])(?<![Hh]ai )[Bb]ạn (đang|có|muốn|nên|cứ|thấy|kể|nói|hỏi|đã|cần|thử|nhớ|đừng|hãy|ơi)(?![\p{L}])|(nha|nhé|vậy|không|rồi|chưa) bạn[.!?…]/u);
    if (ban) out.push(`[xưng hô] gọi "bạn" dù người dùng xưng ${c.addr}: “…${ban[0]}…”`);
    if (c.addr !== "em") {
      const self = plain.replace(/Dạy Lomi|Trợ lý Lomi/g, " ").match(/(?<![\p{L}])Lomi(?![\p{L}])/u);
      if (self) out.push(`[xưng hô] Lomi xưng tên thay vì "em" với người xưng ${c.addr}`);
    }
  }
  // Độ dài: lời đáp thường ngày không dài quá (trải bài / phân tích triệu chứng được đánh dấu long).
  if (!k.long && text.length > 900) out.push(`[độ dài] ${text.length} ký tự`);
  return out;
}

function checkFails(m: Turn, k: Check): string[] {
  const out: string[] = [];
  const layer = layerOf(m);
  if (k.intent && !(Array.isArray(k.intent) ? k.intent : [k.intent]).includes(layer)) out.push(`[intent] cần ${JSON.stringify(k.intent)}, thực tế "${layer}"`);
  if (k.about !== undefined) {
    const s = subjectOf(m);
    if (k.about === null ? !!s : !k.about.test(s)) out.push(`[subject] cần ${k.about}, thực tế "${s || "—"}"`);
  }
  for (const [key, v] of Object.entries(k.facts ?? {})) {
    const got = m.thread?.facts?.[key];
    if (typeof v === "string" ? !String(got ?? "").includes(v) : got !== v) out.push(`[facts] ${key} cần ${JSON.stringify(v)}, thực tế ${JSON.stringify(got)}`);
  }
  for (const s of k.sx ?? []) if (!m.sx?.includes(s)) out.push(`[facts] thiếu triệu chứng "${s}" (đang nhớ ${JSON.stringify(m.sx ?? [])})`);
  if (k.label && !k.label.test(m.health?.label ?? "")) out.push(`[facts] bệnh đang nói cần ${k.label}, thực tế "${m.health?.label ?? ""}"`);
  if (k.rel && m.rel?.split("|")[1] !== k.rel) out.push(`[facts] bước chuyện tình cảm cần "${k.rel}", thực tế "${m.rel ?? ""}"`);
  if (k.listen !== undefined && !!m.heartListen !== k.listen) out.push(`[facts] chế độ chỉ-nghe cần ${k.listen}`);
  if (k.dish && m.dish !== k.dish) out.push(`[facts] món cần "${k.dish}", thực tế "${m.dish ?? ""}"`);
  if (k.faq && m.faqId !== k.faq) out.push(`[facts] câu hỏi app cần "${k.faq}", thực tế "${m.faqId ?? ""}"`);
  if (k.tarot === false && m.tarot) out.push("[intent] không được rút bài ở lượt này");
  if (typeof k.tarot === "number" && m.tarot?.cards.length !== k.tarot) out.push(`[facts] cần rút ${k.tarot} lá, thực tế ${m.tarot?.cards.length ?? 0}`);
  for (const re of k.says ?? []) if (!re.test(m.content)) out.push(`[trả lời] thiếu ý ${re}`);
  for (const re of k.avoids ?? []) {
    const x = m.content.match(re);
    if (x) out.push(`[trả lời] có ý không được có: “${x[0]}”`);
  }
  for (const s of k.safe ?? []) {
    const r = SAFE_RULES[s](m);
    if (r) out.push(`[an toàn:${s}] ${r}`);
  }
  return out;
}

describe("benchmark hội thoại cố định", () => {
  it(`đủ 30–50 chuỗi, mỗi nhóm có mặt (${CHAINS.length} chuỗi)`, () => {
    expect(CHAINS.length).toBeGreaterThanOrEqual(30);
    expect(CHAINS.length).toBeLessThanOrEqual(50);
    expect(new Set(CHAINS.map((c) => c.id)).size).toBe(CHAINS.length);
    for (const g of ["tarot", "health", "mind", "love", "basic"]) expect(CHAINS.filter((c) => c.group === g).length, g).toBeGreaterThanOrEqual(6);
    for (const c of CHAINS) expect(c.turns.length, c.id).toBeGreaterThanOrEqual(2 - (c.id === "T02" ? 1 : 0));
  });
  for (const c of CHAINS) {
    it(`${c.id} [${c.group}] ${c.title}`, async () => {
      const r = await chat(c.turns.map((t) => t[0]));
      const all: string[] = [];
      c.turns.forEach(([user, k], i) => {
        const m = r[i];
        const fails = [...checkFails(m, k), ...globalFails(c, i, m, r[i - 1], k)];
        rows.push({ id: c.id, group: c.group, title: c.title, turn: i + 1, user, layer: layerOf(m), reply: m.content, fails });
        for (const f of fails) all.push(`lượt ${i + 1} “${user}” ${f}\n      ↳ ${m.content.replace(/\n/g, " ⏎ ").slice(0, 220)}`);
      });
      expect(all, `\n${all.join("\n")}\n`).toEqual([]);
    }, 60000);
  }
  afterAll(() => {
    if (process.env.BENCH_OUT) fs.writeFileSync(process.env.BENCH_OUT, JSON.stringify(rows, null, 1));
  });
});
