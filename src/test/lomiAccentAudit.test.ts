// Kiểm tra tự động lỗi "nhầm nghĩa khi bỏ dấu" cho các thư viện Lomi.
// Với mỗi cụm từ khoá (không dấu) trong regex: tìm cách viết CÓ DẤU đúng của cụm đó trong chính chữ của app,
// rồi thay từng chữ bằng một chữ khác nghĩa cùng mặt chữ không dấu (vd đau → đâu) — nếu thư viện vẫn trả
// đúng kết quả cũ thì là lỗi: Lomi sẽ hiểu nhầm câu có chữ khác nghĩa đó. Chiều ngược lại: gõ đúng dấu mà
// thư viện không hiểu (bảng lib/lomiAccent chặn nhầm) cũng được liệt kê.
// Chạy (mất vài phút, không chạy trong `npm test` thường):
//   LOMI_AUDIT=1 npx vitest run src/test/lomiAccentAudit.test.ts
// Kết quả in ra màn hình + ghi đầy đủ vào file lomi-accent-report.txt trong thư mục tạm của máy.
import { test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { normalizeVi } from "@/lib/lomiFaq";
import { analyzeBody, analyzeMind } from "@/lib/lomiSymptoms";
import { heartThemeOf } from "@/lib/lomiHeart";
import { eventOf } from "@/lib/lomiTalk";
import { dietOf } from "@/lib/lomiDiet";
import { healthFact } from "@/lib/lomiHealthFacts";
import { detectBizTopic } from "@/lib/bizAdvisor";
import { HEART, normStrict } from "@/lib/lomiAccent";

type Lib = { file: string; run: (s: string) => string | null };
const LIBS: Lib[] = [
  { file: "lomiSymptoms.ts", run: (s) => { const b = analyzeBody(s, [], true, true); const m = analyzeMind(s); return b ? "B:" + b.sx.sort().join(",") : m ? "M:" + m.mood.sort().join(",") : null; } },
  { file: "lomiHeart.ts", run: (s) => heartThemeOf(s) ?? null },
  { file: "lomiHeartMore.ts", run: (s) => heartThemeOf(s) ?? null },
  { file: "lomiTalk.ts", run: (s) => eventOf(normStrict(s, HEART))?.id ?? null },
  { file: "lomiDiet.ts", run: (s) => dietOf(s) ?? null },
  { file: "lomiHealthFacts.ts", run: (s) => healthFact(s + " có sao không")?.slice(0, 40) ?? null },
  { file: "bizAdvisor.ts", run: (s) => detectBizTopic(s) ?? null },
];

const SRC = path.resolve(__dirname, "..");
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) && !e.name.startsWith("zz_") ? [path.join(d, e.name)] : []));
const files = walk(SRC);
const WORD = /[\p{L}]+/gu;
const hasMark = (w: string) => /[^\u0000-\u007f]/.test(w);
const nfc = (s: string) => s.normalize("NFC").toLowerCase();
// Dấu của 1 chữ (bỏ chữ cái gốc) — để coi "hoà" và "hòa", "thuỷ" và "thủy" là cùng một chữ.
const marks = (w: string) => [...w.normalize("NFD")].filter((c) => /[̀-ͯ]/.test(c) || c === "đ" || c === "Đ").sort().join("") + (w.includes("đ") ? "đ" : "");

// Chữ tiếng Việt (có dấu) xuất hiện trong chuỗi của từng file và toàn app.
const strOf = (txt: string) => (txt.match(/(["'`])(?:\\.|(?!\1).)*\1/g) ?? []).map((s) => nfc(s.slice(1, -1)));
const formsAll = new Map<string, Map<string, number>>(); // bare → (form → count)
const sentencesByFile = new Map<string, string[]>();
const allSentences: string[] = [];
for (const f of files) {
  const strs = strOf(fs.readFileSync(f, "utf8")).filter((s) => hasMark(s));
  sentencesByFile.set(path.basename(f), strs);
  allSentences.push(...strs);
  for (const s of strs)
    for (const w of s.match(WORD) ?? []) {
      const b = normalizeVi(w);
      if (!b || b.includes(" ")) continue;
      const m = formsAll.get(b) ?? new Map();
      m.set(w, (m.get(w) ?? 0) + 1);
      formsAll.set(b, m);
    }
}

const CORPUS = ` ${allSentences.map((x) => (x.match(WORD) ?? []).join(" ")).join(" | ")} `;

// Cụm từ khoá không dấu trong các regex của 1 file.
function phrasesOf(txt: string): string[] {
  const out = new Set<string>();
  for (const line of txt.split("\n")) {
    const m = line.match(/\/\\b\((.*)\)\\b\//) ?? line.match(/\/\\b(.*)\\b\//);
    if (!m) continue;
    for (const br of m[1].split(/[|()]/)) {
      const p = br.replace(/\\s\*|\\s\+|\?|\.\*|\\b/g, " ").trim();
      if (/^[a-z]+( [a-z]+)*$/.test(p) && p.length >= 3) out.add(p);
    }
  }
  return [...out];
}

// Tìm cách viết có dấu của cụm trong chữ của app (ưu tiên chính file đó).
function accentedOf(phrase: string, own: string[]): string | null {
  const n = phrase.split(" ").length;
  for (const pool of [own, allSentences])
    for (const s of pool) {
      const ws = s.match(WORD) ?? [];
      for (let i = 0; i + n <= ws.length; i++) {
        const seg = ws.slice(i, i + n);
        if (normalizeVi(seg.join(" ")) === phrase && seg.some(hasMark)) return seg.join(" ");
      }
    }
  return null;
}

test.skipIf(!process.env.LOMI_AUDIT)("accent audit", { timeout: 900000 }, () => {
  const report: string[] = [];
  const byToken = new Map<string, Set<string>>();
  let checked = 0, noAccent = 0;
  const blocked: string[] = [];
  for (const lib of LIBS) {
    const txt = fs.readFileSync(path.join(SRC, "lib", lib.file), "utf8");
    const own = sentencesByFile.get(lib.file) ?? [];
    for (const ph of phrasesOf(txt)) {
      const acc = accentedOf(ph, own);
      if (!acc) { noAccent++; continue; }
      const base = lib.run(acc);
      // Chiều ngược lại: gõ không dấu thì khớp, gõ đúng dấu lại không khớp → bảng chặn nhầm nghĩa đúng.
      const bareRes = lib.run(ph);
      if (bareRes && bareRes !== base) blocked.push(`${lib.file}  "${acc}" → ${base ?? "∅"} (không dấu: ${bareRes})`);
      if (!base) continue;
      checked++;
      const ws = acc.split(" ");
      ws.forEach((w, i) => {
        const without = ws.filter((_, j) => j !== i).join(" ");
        if (lib.run(without) === base) return; // chữ này không quyết định kết quả
        const alts = [...(formsAll.get(normalizeVi(w))?.keys() ?? [])].filter((f) => f !== w && marks(f) !== marks(w));
        for (const f of alts) {
          const v = ws.map((x, j) => (j === i ? f : x)).join(" ");
          // Chỉ tính khi câu thay thế là cụm có thật (gặp trong chữ của app) hoặc từ khoá chỉ 1 chữ.
          if ((ws.length === 1 || CORPUS.includes(` ${v} `)) && lib.run(v) === base) {
            const key = `${lib.file}  ${w} → ${f}`;
            const s = byToken.get(key) ?? new Set();
            s.add(`"${acc}" → "${v}" [${base}]`);
            byToken.set(key, s);
          }
        }
      });
    }
  }
  for (const [k, ex] of [...byToken].sort()) report.push(`${k}   (${ex.size} cụm)  vd: ${[...ex][0]}`);
  const out = `Đã kiểm ${checked} cụm (không tìm được cách viết có dấu: ${noAccent})\nNHẦM NGHĨA: ${byToken.size}\n\n${report.join("\n")}\n\nCHẶN NHẦM (gõ đúng dấu mà không hiểu): ${blocked.length}\n${blocked.join("\n")}\n`;
  const file = path.join(os.tmpdir(), "lomi-accent-report.txt");
  fs.writeFileSync(file, out);
  console.log(out.split("\n").slice(0, 2).join("\n"), `\n→ ${file}`);
});
