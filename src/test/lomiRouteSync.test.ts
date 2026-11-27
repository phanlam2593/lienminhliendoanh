// 28/11: lời dặn "hiểu câu" của AI (supabase/functions/_shared/lomiRoutePrompt.ts) chép danh sách câu hỏi app + kiến thức về app
//   từ lib/lomiFaq.ts (edge function không import được src/). Test này báo lỗi khi hai bên lệch nhau.
//   Sửa FAQ xong: GEN_ROUTE=1 npx vitest run src/test/lomiRouteSync.test.ts  (ghi lại phần <gen> trong file prompt).
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { FAQS } from "@/lib/lomiFaq";
import { APP_KNOWLEDGE, FAQ_TITLES, ROUTE_PROMPT, routeSystem } from "../../supabase/functions/_shared/lomiRoutePrompt";

const titles = FAQS.map((f) => `- ${f.q.vi}`).join("\n");
const knowledge = FAQS.map((f) => `● ${f.q.vi}\n${f.a.vi.replace(/\n+/g, " ").trim()}`).join("\n");

describe("lomiRoutePrompt khớp lomiFaq", () => {
  it("danh sách câu hỏi + kiến thức về app đúng với FAQ hiện tại", () => {
    if (process.env.GEN_ROUTE) {
      const p = resolve(__dirname, "../../supabase/functions/_shared/lomiRoutePrompt.ts");
      const s = readFileSync(p, "utf8");
      const gen = `// <gen>\nexport const FAQ_TITLES = ${JSON.stringify(titles)};\nexport const APP_KNOWLEDGE = ${JSON.stringify(knowledge)};\n// </gen>`;
      writeFileSync(p, s.replace(/\/\/ <gen>[\s\S]*?\/\/ <\/gen>/, gen));
      return;
    }
    expect(FAQ_TITLES).toBe(titles);
    expect(APP_KNOWLEDGE).toBe(knowledge);
  });
  it("mục Hỏi về app mới kèm kiến thức đầy đủ; tên app đúng, không nêu nhà cung cấp AI", () => {
    expect(routeSystem(false)).toBe(ROUTE_PROMPT);
    expect(routeSystem(true).length).toBeGreaterThan(ROUTE_PROMPT.length + 10000);
    expect(ROUTE_PROMPT).toContain("iLomi");
    expect(ROUTE_PROMPT).not.toMatch(/Claude|Anthropic/);
  });
});
