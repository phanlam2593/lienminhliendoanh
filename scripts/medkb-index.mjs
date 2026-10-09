// Cập nhật chỉ mục tên của kho kiến thức y khoa (src/lib/medkb/index.json) từ các thẻ <id>.json trong cùng thư mục.
// Chạy: node scripts/medkb-index.mjs   (test src/test/lomiMed.test.ts kiểm chỉ mục luôn khớp với thẻ)
import fs from "node:fs";
import path from "node:path";
const dir = path.resolve("src/lib/medkb");
const rows = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort()
  .map((f) => {
    const t = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (`${t.id}.json` !== f) throw new Error(`${f}: id "${t.id}" không khớp tên file`);
    return { id: t.id, kind: t.kind, names: t.names };
  });
fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(rows));
console.log(`medkb index: ${rows.length} thẻ`);
