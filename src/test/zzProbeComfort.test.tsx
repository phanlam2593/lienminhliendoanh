import { it } from "vitest";
import { chat } from "./lomiChatHarness";
import { writeFileSync, appendFileSync } from "fs";
const OUT = "/tmp/probe/comfort.txt";
const chains: string[][] = [
  ["A chán quá."],
  ["A muốn tâm sự.", "Mãi không kiếm được việc làm.", "Em an ủi anh đi chứ."],
  ["A đang buồn.", "Học vài câu tiếng Anh được không?"],
  ["A buồn quá."], ["A muốn tâm sự với em một chút."], ["Mãi không kiếm được việc làm."],
  ["A thất nghiệp 3 tháng rồi."], ["A tìm việc mãi không được."], ["A thấy mình vô dụng quá."],
  ["Công ty sắp phá sản rồi."], ["A lo không biết thời gian tới sống sao."],
  ["A buồn quá", "Dỗ anh một chút đi."], ["A buồn quá", "Nói gì cho anh đỡ buồn đi."],
  ["Anh cần một chút động viên."], ["Em nói gì dễ nghe với anh đi."], ["Anh mệt mỏi quá, an ủi anh đi."],
  ["A thất nghiệp rồi", "Anh không cần lời khuyên, chỉ muốn được an ủi."], ["A thất nghiệp rồi", "Em nghe anh kể thôi nha, đừng khuyên."],
  ["A đang thất nghiệp.", "Tìm việc mãi không được.", "Gửi CV nhiều nơi rồi mà không ai gọi.", "A bắt đầu thấy mất tự tin.", "A còn lo tiền nhà nữa.", "Không biết phải làm sao.", "Chắc a kém cỏi thật."],
  ["A đang buồn", "A muốn học vài câu tiếng Anh."], ["A đang buồn", "Học tiếng Anh với anh một chút được không?"],
  ["A đang buồn", "Thôi đổi chủ đề đi."], ["A đang buồn", "Hôm nay ăn gì?"], ["A đang buồn", "Tìm quán cà phê gần đây."],
  ["A đang buồn", "Bói Tarot cho anh đi."], ["A đang buồn", "Anh hỏi chuyện sức khỏe một chút."],
  ["A đang buồn", "Chỉ anh cách sử dụng Quẹt."], ["A đang buồn", "Giúp anh tính tiền lương."],
  ["A đang thất nghiệp.", "Tìm việc mãi không được.", "Học tiếng Anh với anh một chút được không?", "Thôi quay lại chuyện tìm việc lúc nãy đi."],
  ["A chán vì không có gì làm."], ["A chán vì thất nghiệp."], ["A chán nhưng không muốn tâm sự."],
  ["A muốn tâm sự nhưng không muốn nhận lời khuyên."], ["A muốn lời khuyên chứ không cần an ủi."],
  ["Bạn a đang buồn vì bị bồ đá."], ["Làm sao để an ủi bạn gái đang buồn?"],
  ["A đang buồn", "A không muốn tâm sự nữa."], ["A đang buồn", "Uống vitamin C mỗi ngày có tốt không?"],
  ["A đang thất nghiệp.", "Nó làm a mất ngủ luôn."],
  ["Cho anh chút động lực đi"], ["Anh buồn quá, dỗ anh đi"], ["Động viên mình một chút được không?"], ["Anh đang cần được an ủi."], ["Do anh đi trễ nên bị sếp mắng"],
  ["A đang thất nghiệp.", "Tìm việc mãi không được.", "Em an ủi anh đi chứ."], ["A đang buồn", "Giúp anh tính tiền lương."],
];
it("probe", async () => {
  writeFileSync(OUT, "");
  for (const c of chains) {
    const r = await chat(c, { seed: 1 });
    appendFileSync(OUT, "=== " + c.join(" | ") + "\n");
    r.forEach((t, i) => appendFileSync(OUT, `U: ${c[i]}\nL[heart=${t.heart ?? "-"} listen=${t.heartListen ?? "-"} unk=${t.unk ?? "-"}]: ${t.content.replace(/\n/g, " ⏎ ").slice(0, 400)}\n`));
  }
}, 600000);
