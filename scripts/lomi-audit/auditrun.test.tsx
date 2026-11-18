import { it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { chat } from "../lomiChatHarness";
import { classify } from "../vibench/vibench";
const all: { id: string; turns: string[] }[] = JSON.parse(readFileSync(process.env.CASES ?? "scripts/lomi-audit/cases.json", "utf8"));
const [si, sn] = (process.env.SHARD ?? "0/1").split("/").map(Number);
const only = process.env.ONLY?.split(",");
it("audit", async () => {
  const out: unknown[] = [];
  for (const [i, c] of all.entries()) {
    if (only ? !only.includes(c.id) : i % sn !== si) continue;
    try {
      localStorage.clear();
      // 18/11: trường "tab" (nếu có) = chủ đề Lomi người dùng đang chọn (xem rerun_tab.sh).
      const r = await chat(c.turns, { seed: 7, tab: (c as { tab?: string }).tab });
      const m: any = r[r.length - 1];
      const { content, role, quick, places, ...flags } = m;
      out.push({ id: c.id, layer: classify({ ...m, tarotBack: undefined }), stuck: m.stuck ?? "", content, quick, nplaces: places?.length ?? 0, flags: Object.keys(flags).filter((k) => flags[k] !== undefined) });
    } catch (e) {
      out.push({ id: c.id, layer: "err", stuck: "", content: String(e).slice(0, 200), flags: [] });
    }
  }
  writeFileSync(process.env.OUT ?? `scripts/lomi-audit/out/run.${si}.json`, JSON.stringify(out));
}, 3600000);
