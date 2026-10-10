// BỘ ĐO CÂU NỐI THEO NGỮ CẢNH (10/10): chuỗi vài lượt rồi một câu nối ("Ừa 8 chút cũng đc", "Giới hạn 5km thôi", "sao e cứ vậy hoài").
// Câu cuối phải: không bí (không "chưa hiểu / chưa có kiến thức / Dạy Lomi"), khớp "good" nếu có, không khớp "bad" nếu có.
// Mốc ở baseline.json (convo) — tụt là đỏ. Ghi lại: VIBENCH_WRITE=1 npx vitest run src/test/vibench/convo
import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { chat } from "../lomiChatHarness";

const DIR = "src/test/vibench";
type C = { g: string; t: string[]; good?: string; bad?: string; h?: { role: "user" | "assistant"; content: string }[] };
const STUCK = /chưa hiểu ý|chưa có kiến thức|chưa được tiếp thu|chưa được học|chưa biết cái này|chưa chắc hiểu|Dạy Lomi|Dạy em|Bạn hỏi về chuyện gì vậy nè|nói rõ hơn một chút giúp|chưa theo kịp ý|đang hỏi về chuyện nào|chưa bắt chắc ý|hỏi một trong mấy câu này/;

it("câu nối theo ngữ cảnh", async () => {
  const items: C[] = JSON.parse(readFileSync(`${DIR}/${process.env.CONVO_FILE ?? "convo.json"}`, "utf8"));
  let ok = 0;
  const rows: string[] = [];
  for (const [i, c] of items.entries()) {
    let a = "";
    try {
      const r = await chat(c.t, { history: c.h, seed: 1000 + i });
      a = r[r.length - 1].content;
    } catch (e) {
      a = `ERR ${String(e).slice(0, 80)}`;
    }
    // (nhóm "than phiền Lomi": lời xin lỗi kiểu "Lomi chưa theo kịp ý bạn" là ĐÚNG, không tính là bí)
    const pass = !a.startsWith("ERR") && (c.g === "than phiền Lomi" || !STUCK.test(a)) && (!c.good || new RegExp(c.good).test(a)) && (!c.bad || !new RegExp(c.bad).test(a));
    if (pass) ok++;
    rows.push(`${pass ? "✓" : "✗"} [${c.g}] ${c.t.join(" → ")}  ⇒  ${a.replace(/\s+/g, " ").slice(0, 120)}`);
  }
  const pct = Math.round((ok / items.length) * 1000) / 10;
  console.log(`CONVO ${ok}/${items.length} = ${pct}%\n${rows.join("\n")}`);
  const basePath = `${DIR}/baseline.json`;
  const base = JSON.parse(readFileSync(basePath, "utf8"));
  if (process.env.CONVO_FILE) return; // chạy bộ khác (vd câu mới) chỉ để xem, không so mốc
  if (process.env.VIBENCH_WRITE || base.convo === undefined) writeFileSync(basePath, JSON.stringify({ ...base, convo: pct }, null, 1) + "\n");
  else expect(pct, "câu nối theo ngữ cảnh").toBeGreaterThanOrEqual(base.convo - 2);
}, 600000);
