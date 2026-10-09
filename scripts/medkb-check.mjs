// Kiểm nhanh thẻ kiến thức y khoa (cùng quy tắc với src/test/lomiMed.test.ts) mà KHÔNG đụng chỉ mục chung.
// Chạy: node scripts/medkb-check.mjs id1 id2 ...      (không đối số = kiểm mọi thẻ)
import fs from "node:fs";
import path from "node:path";
const dir = path.resolve("src/lib/medkb");
const TRUSTED = ["nhs.uk", "medlineplus.gov", "who.int", "fda.gov", "moh.gov.vn", "dav.gov.vn", "cdc.gov", "nih.gov", "cancer.gov", "samhsa.gov", "nice.org.uk", "apa.org", "mayoclinic.org"];
const KINDS = ["condition", "mental", "infection", "child", "women", "cancer", "term", "other"];
const DOSE = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g\/|ml|iu|đv|viên|gói|giọt|lần\/ngày|lần mỗi ngày)\b/i;
const nv = (s) => s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json");
const all = new Map(files.map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]));
const want = process.argv.slice(2).length ? process.argv.slice(2) : [...all.keys()];
const names = new Map();
for (const [id, t] of all) for (const n of t.names ?? []) { const k = nv(n); if (!names.has(k)) names.set(k, new Set()); names.get(k).add(id); }
let bad = 0;
const err = (id, m) => { bad++; console.log(`✗ ${id}: ${m}`); };
for (const id of want) {
  const t = all.get(id);
  if (!t) { err(id, "không có file"); continue; }
  if (t.id !== id) err(id, `id "${t.id}" không khớp tên file`);
  if (!KINDS.includes(t.kind)) err(id, `kind "${t.kind}" không hợp lệ`);
  if (!t.names?.length) err(id, "thiếu names");
  for (const n of t.names ?? []) { const s = names.get(nv(n)); if (s && s.size > 1) err(id, `tên "${n}" trùng với ${[...s].filter((x) => x !== id).join(",")}`); if (nv(n).length < 2) err(id, `tên quá ngắn "${n}"`); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.verifiedAt ?? "")) err(id, "verifiedAt phải là YYYY-MM-DD");
  if (!t.sources?.length) err(id, "thiếu sources");
  for (const s of t.sources ?? []) {
    let host = "";
    try { host = new URL(s.url).hostname.replace(/^www\./, ""); } catch { err(id, `url hỏng: ${s.url}`); continue; }
    if (!s.url.startsWith("https://")) err(id, `url không https: ${s.url}`);
    if (!TRUSTED.some((d) => host === d || host.endsWith(`.${d}`))) err(id, `tên miền ${host} không thuộc danh sách tin cậy`);
    if (!s.title || !s.publisher) err(id, `nguồn thiếu title/publisher: ${s.url}`);
    if (s.reviewed && !/^\d{4}-\d{2}(-\d{2})?$/.test(s.reviewed)) err(id, `reviewed sai dạng: ${s.reviewed}`);
  }
  const n = t.sources?.length ?? 0;
  const chk = (text, src, where) => {
    if (!Array.isArray(src) || !src.length) err(id, `${where}: không có src`);
    for (const i of src ?? []) if (!Number.isInteger(i) || i < 0 || i >= n) err(id, `${where}: src ${i} ngoài khoảng`);
    if (!text || text.trim().length <= 5) err(id, `${where}: rỗng`);
    else if (text.length > 260) err(id, `${where}: dài ${text.length} ký tự (>260)`);
    if (text && DOSE.test(text)) err(id, `${where}: có liều thuốc: ${text}`);
  };
  let cnt = 0;
  for (const k of ["about", "signs", "causes", "course", "care", "doctor", "emergency"]) {
    if (!Array.isArray(t[k])) { err(id, `thiếu mảng ${k} (để [] nếu không có nguồn)`); continue; }
    t[k].forEach((f, i) => { cnt++; chk(f.text, f.src, `${k}[${i}]`); });
  }
  if (t.diet !== null && t.diet !== undefined) {
    for (const k of ["avoid", "ok"]) (t.diet[k] ?? []).forEach((f, i) => { cnt++; chk(f.text, f.src, `diet.${k}[${i}]`); });
    (t.diet.foods ?? []).forEach((f, i) => {
      cnt++; chk(f.note, f.src, `diet.foods[${i}] ${f.name}`);
      if (!["avoid", "limit", "ok", "good"].includes(f.verdict)) err(id, `món ${f.name}: verdict sai`);
      if (!Array.isArray(f.aliases)) err(id, `món ${f.name}: thiếu aliases`);
    });
  }
  else if (t.diet === undefined) err(id, "thiếu trường diet (null nếu không có nguồn)");
  if (!cnt) err(id, "thẻ rỗng");
  if (!t.about?.length) err(id, "nên có ít nhất 1 ý trong `about` (định nghĩa)");
}
console.log(bad ? `\n${bad} lỗi` : `✓ ${want.length} thẻ hợp lệ`);
process.exit(bad ? 1 : 0);
