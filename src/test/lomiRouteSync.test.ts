// 28/11: lời dặn "hiểu câu" của AI (supabase/functions/_shared/lomiRoutePrompt.ts) chép kiến thức về app
//   từ lib/lomiFaq.ts (edge function không import được src/). Test này báo lỗi khi hai bên lệch nhau.
//   Sửa FAQ xong: GEN_ROUTE=1 npx vitest run src/test/lomiRouteSync.test.ts  (ghi lại phần <gen> trong file prompt).
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { FAQS } from "@/lib/lomiFaq";
import { APP_KNOWLEDGE, APP_PROMPT, ROUTE_PROMPT } from "../../supabase/functions/_shared/lomiRoutePrompt";

const knowledge = FAQS.map((f) => `● ${f.q.vi}\n${f.a.vi.replace(/\n+/g, " ").trim()}`).join("\n");

describe("lomiRoutePrompt khớp lomiFaq", () => {
  it("kiến thức về app đúng với FAQ hiện tại", () => {
    if (process.env.GEN_ROUTE) {
      const p = resolve(__dirname, "../../supabase/functions/_shared/lomiRoutePrompt.ts");
      const s = readFileSync(p, "utf8");
      const gen = `// <gen>\nexport const APP_KNOWLEDGE = ${JSON.stringify(knowledge)};\n// </gen>`;
      writeFileSync(p, s.replace(/\/\/ <gen>[\s\S]*?\/\/ <\/gen>/, gen));
      return;
    }
    expect(APP_KNOWLEDGE).toBe(knowledge);
  });
  it("lời dặn gọn (vừa giới hạn Groq 8.000 token/phút); mục app kèm kiến thức; tên app đúng, không nêu nhà cung cấp AI", () => {
    expect(ROUTE_PROMPT.length).toBeLessThan(4500);
    expect(APP_PROMPT.endsWith(APP_KNOWLEDGE)).toBe(true);
    expect(APP_PROMPT).not.toMatch(/Claude|Anthropic/);
    expect(ROUTE_PROMPT).toContain("iLomi");
    expect(ROUTE_PROMPT).not.toMatch(/Claude|Anthropic/);
  });
});
