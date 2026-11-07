import { it } from "vitest";
import { chat } from "./lomiChatHarness";
const S: string[][] = [
  ["a đang lo quá", "công ty a sắp phá sản", "a là trụ cột gia đình", "giờ a k biết phải làm sao"],
  ["Dạo này a buồn quá", "ba mẹ cứ la mắng a", "a nói gì cũng không ai chịu nghe", "a nên làm sao?"],
  ["a đang lo chuyện công việc", "công ty có thể cắt giảm nhân sự", "may mà gia đình vẫn ủng hộ a", "nhưng a vẫn thấy áp lực"],
  ["a đang buồn", "vợ chồng a dạo này ít nói chuyện", "a sợ tình cảm nhạt dần", "a không biết có nên nói chuyện thẳng thắn không"],
  ["a đang áp lực công việc", "a mệt mỏi quá", "thôi đổi chuyện, tìm quán cà phê gần đây cho a"],
];
(globalThis as any).__DBG = 1;
for (const [i, s] of S.entries()) it("s" + i, async () => {
  for (const seed of [1]) {
    const r = await chat(s, { seed });
    console.log(`\n=== S${i + 1} seed ${seed}`);
    r.forEach((t, j) => console.log(`> ${s[j]}\n  [heart=${t.heart} listen=${t.heartListen} dish=${t.dish} search=${JSON.stringify(t.search)} places=${t.places?.length}] ${t.content.replace(/\n/g, " ⏎ ")}`));
  }
}, 60000);
