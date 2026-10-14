// Luật đọc câu tiếng Việt: viết có dấu đúng chữ (VN), không còn luật không dấu mơ hồ (VR).
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import ts from "typescript";
import { compileVi } from "@/lib/viMatch";
import model from "@/lib/viAccent/model.json";

const FILES = [
  ...readdirSync("src/lib").filter((f) => /^(lomi\w*|tarot|bizAdvisor)\.ts$/.test(f) && !/^(lomiViRestore|lomiSound|lomiStuckLog)\.ts$/.test(f)).map((f) => `src/lib/${f}`),
  "src/pages/AiAssistant.tsx",
];

type Lit = { file: string; line: number; fn: string; src: string };
function literals(): Lit[] {
  const out: Lit[] = [];
  for (const f of FILES) {
    const text = readFileSync(f, "utf8");
    const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "VN" || node.expression.text === "VR")) {
        const a = node.arguments[0];
        if (a && a.kind === ts.SyntaxKind.RegularExpressionLiteral) {
          const lit = a.getText(sf);
          out.push({ file: f, line: sf.getLineAndCharacterOfPosition(a.getStart()).line + 1, fn: node.expression.text, src: lit.slice(1, lit.lastIndexOf("/")) });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

// Chữ không dấu có ≥2 cách bỏ dấu thường gặp (vd la → là/lá/la) theo bộ đếm tiếng Việt của app
const strip = (w: string) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").normalize("NFC");
const forms = new Map<string, Map<string, number>>();
for (const [w0, c] of Object.entries((model as { u: Record<string, number> }).u)) {
  if (w0.startsWith("<")) continue;
  const w = w0.toLowerCase();
  const k = strip(w);
  if (!forms.has(k)) forms.set(k, new Map());
  forms.get(k)!.set(w, (forms.get(k)!.get(w) ?? 0) + c);
}
function ambiguous(k: string): boolean {
  const m = forms.get(k);
  if (!m) return false;
  const tot = [...m.values()].reduce((s, x) => s + x, 0);
  return tot >= 15 && [...m.values()].filter((x) => x / tot >= 0.08).length >= 2;
}
function words(src: string): string[] {
  // bỏ escape, lớp ký tự, tiền tố nhóm; lấy các dãy chữ
  const s = src
    .replace(/\\[pPu]\{[^}]*\}|\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|\\./g, " ")
    .replace(/\[(?:\\.|[^\]])*\]/g, " ")
    .replace(/\(\?(?:[:=!]|<[=!]|<[A-Za-z_]\w*>)/g, " ");
  return s.match(/[a-z]+/gi) ?? [];
}
// Luật cố ý để không dấu (đã xem từng chữ): khớp mọi dạng có dấu
const ALLOW = [/lomiDrug\.ts$/, /lomiMed\.ts$/];

describe("luật đọc câu", () => {
  const lits = literals();
  it("tìm thấy luật", () => expect(lits.length).toBeGreaterThan(1500));
  it("mọi luật VN dịch được sang dạng giữ dấu", () => {
    const bad = lits.filter((l) => l.fn === "VN").filter((l) => {
      try { new RegExp(compileVi(l.src), "u"); return false; } catch { return true; }
    });
    expect(bad.map((l) => `${l.file}:${l.line} ${l.src.slice(0, 80)}`)).toEqual([]);
  });
  it("không còn luật VR chứa chữ không dấu mơ hồ", () => {
    const bad = lits.filter((l) => l.fn === "VR" && !/[^\x00-\x7f]/.test(l.src) && !ALLOW.some((a) => a.test(l.file)))
      .map((l) => ({ l, amb: words(l.src).filter((w) => ambiguous(w.toLowerCase())) }))
      .filter((x) => x.amb.length);
    expect(bad.map((x) => `${x.l.file}:${x.l.line} [${x.amb.join(",")}]`)).toEqual([]);
  });
});
