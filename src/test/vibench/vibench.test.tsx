// Chạy bộ đo tiếng Việt. Ghi kết quả chi tiết ra VIBENCH_OUT (nếu đặt) và so với điểm mốc baseline.json:
// tụt quá 1 điểm % ở dạng nào là đỏ (để "sửa chỗ này hỏng chỗ kia" bị chặn trước khi deploy).
// Cập nhật mốc sau khi cải thiện: VIBENCH_WRITE=1 npx vitest run src/test/vibench
import { expect, it } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { chat } from "../lomiChatHarness";
import { FORMS, addrOk, classify, variant, type Form, type Item } from "./vibench";

const DIR = "src/test/vibench";
const items: Item[] = JSON.parse(readFileSync(`${DIR}/corpus.json`, "utf8"));

it("bộ đo tiếng Việt: không tụt so với mốc", async () => {
  const score: Record<Form, { ok: number; n: number }> = { acc: { ok: 0, n: 0 }, bare: { ok: 0, n: 0 }, teen: { ok: 0, n: 0 }, bareTeen: { ok: 0, n: 0 } };
  const rows: unknown[] = [];
  for (const it0 of items)
    for (const f of FORMS) {
      const q = variant(it0.q, f);
      if (f !== "acc" && q === variant(it0.q, f === "bareTeen" ? "bare" : "acc")) continue; // dạng trùng (câu không có chữ viết tắt) — không đếm 2 lần
      let got = "err";
      let a = "";
      let ad = true;
      try {
        const r = await chat([...(it0.pre ?? []).map((p) => variant(p, f)), q]);
        const m = r[r.length - 1];
        got = classify(m);
        a = m.content.replace(/\s+/g, " ").slice(0, 160);
        if (it0.addr) ad = addrOk(m, it0.addr);
      } catch (e) {
        a = String(e).slice(0, 120);
      }
      const ok = it0.ok.includes(got) && ad;
      score[f].n++;
      if (ok) score[f].ok++;
      rows.push({ id: it0.id, f, q, ok, got, want: it0.ok, ...(it0.addr ? { addr: it0.addr, addrOk: ad } : {}), a });
    }
  const pct = Object.fromEntries(FORMS.map((f) => [f, Math.round((score[f].ok / Math.max(1, score[f].n)) * 1000) / 10]));
  const total = FORMS.reduce((s, f) => s + score[f].ok, 0) / FORMS.reduce((s, f) => s + score[f].n, 0);
  const sum = { ...pct, all: Math.round(total * 1000) / 10, n: FORMS.reduce((s, f) => s + score[f].n, 0) };
  console.log("VIBENCH", JSON.stringify(sum));
  if (process.env.VIBENCH_OUT) writeFileSync(process.env.VIBENCH_OUT, JSON.stringify({ sum, rows }, null, 1));
  const basePath = `${DIR}/baseline.json`;
  if (process.env.VIBENCH_WRITE || !existsSync(basePath)) writeFileSync(basePath, JSON.stringify(sum, null, 1) + "\n");
  const base = JSON.parse(readFileSync(basePath, "utf8"));
  for (const f of [...FORMS, "all"] as const) expect((sum as Record<string, number>)[f], `dạng ${f}`).toBeGreaterThanOrEqual(base[f] - 1);
}, 1800000);

// Câu MỚI (holdout.json — không dùng để học hay chỉnh): không có nhãn, chỉ đo Lomi hiểu câu KHÔNG DẤU có giống câu CÓ DẤU không.
it("câu mới: gõ không dấu được hiểu giống gõ có dấu", async () => {
  const { setViRestoreOff } = await import("@/lib/lomiViRestore");
  const hold: string[] = JSON.parse(readFileSync(`${DIR}/holdout.json`, "utf8"));
  const run = async (off: boolean) => {
    setViRestoreOff(off);
    let same = 0;
    const diff: string[] = [];
    for (const q of hold) {
      const a = classify((await chat([q])).pop()!);
      const b = classify((await chat([variant(q, "bare")])).pop()!);
      if (a === b) same++;
      else diff.push(`${q}: có dấu=${a}, không dấu=${b}`);
    }
    setViRestoreOff(false);
    return { pct: Math.round((same / hold.length) * 1000) / 10, diff };
  };
  const after = await run(false);
  const before = process.env.VIBENCH_BEFORE ? await run(true) : null;
  console.log("VIHOLD", JSON.stringify({ after: after.pct, ...(before ? { before: before.pct } : {}) }));
  if (process.env.VIBENCH_OUT) writeFileSync(process.env.VIBENCH_OUT.replace(/\.json$/, ".hold.json"), JSON.stringify({ after, before }, null, 1));
  const basePath = `${DIR}/baseline.json`;
  const base = JSON.parse(readFileSync(basePath, "utf8"));
  if (process.env.VIBENCH_WRITE || base.hold === undefined) writeFileSync(basePath, JSON.stringify({ ...base, hold: after.pct }, null, 1) + "\n");
  else expect(after.pct, "câu mới: không dấu hiểu giống có dấu").toBeGreaterThanOrEqual(base.hold - 2);
}, 1800000);
