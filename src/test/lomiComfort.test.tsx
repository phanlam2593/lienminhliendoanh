// 08/11 — TÂM SỰ, AN ỦI, CHUYỂN CHỦ ĐỀ (theo tài liệu Kir "Cải thiện Lomi – tâm sự, đồng cảm, an ủi và chuyển chủ đề").
// Chạy qua CHÍNH khung chat <AiChat/> (lomiChatHarness), kiểm cả lời đáp lẫn trạng thái mạch hội thoại trên tin Lomi
// (heart / heartListen / unk / dishAsk / places / tarot).
//   Ba lỗi gốc: "a chán quá" → bày trò Tarot/Quẹt; "em an ủi anh đi chứ" → "chưa bắt chắc ý"; đang buồn mà hỏi học tiếng Anh → bị giữ trong mạch tâm sự.
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";

const PROMO = /Tarot|Quẹt|\/quet|tìm quán|bày trò/;
const LOST = /chưa bắt chắc|không rành|chưa hiểu ý|Dạy em|Dạy Lomi/;
const COMFORT = /mạnh mẽ|gồng|không làm quá|yếu đuối|giá trị|kém cỏi|ở đây với|ngồi cạnh|nghe .*kể/;
const run = (turns: string[], seed = 1) => chat(turns, { seed });

describe("A — tâm sự và đồng cảm", () => {
  it("1. 'A chán quá' → hỏi thăm, không bày trò Tarot / Quẹt / tìm quán", async () => {
    for (const seed of [1, 2, 3]) {
      const [r] = await run(["A chán quá."], seed);
      expect(r.heart).toBe("ev:bored");
      expect(r.content).not.toMatch(PROMO);
      expect(r.content).toMatch(/\?/);
    }
  }, 90000); // (lượt đầu của file nạp kho dữ liệu — chạy chung cả bộ test thì chậm)
  it("2. 'A buồn quá' → mạch buồn, không giới thiệu tính năng", async () => {
    const [r] = await run(["A buồn quá."]);
    expect(r.heart).toBe("sad");
    expect(r.content).not.toMatch(PROMO);
  });
  it("3–4. 'A muốn tâm sự (với em một chút)' → mở mạch tâm sự", async () => {
    for (const q of ["A muốn tâm sự.", "A muốn tâm sự với em một chút."]) {
      const [r] = await run([q]);
      expect(r.heart).toBe("open");
      expect(r.content).not.toMatch(LOST);
    }
  });
  it("5–7. kể chuyện tìm việc không được → mạch công việc, đồng cảm trước, chưa chỉ tính năng app", async () => {
    for (const q of ["Mãi không kiếm được việc làm.", "A thất nghiệp 3 tháng rồi.", "A tìm việc mãi không được."]) {
      const [r] = await run([q]);
      expect(r.heart).toBe("work");
      expect(r.unk).toBeUndefined();
      expect(r.content).not.toMatch(/Quẹt|\/quet|Vào Quẹt/);
      expect(r.content).toMatch(/giá trị|tự trách|áp lực/);
    }
  });
  it("8. 'A thấy mình vô dụng quá' → chuyện tự ti", async () => {
    const [r] = await run(["A thấy mình vô dụng quá."]);
    expect(r.heart).toBe("selfworth");
  });
  it("9. 'Công ty sắp phá sản rồi' → chuyện công việc, không 'Xui ghê ha'", async () => {
    const [r] = await run(["Công ty sắp phá sản rồi."]);
    expect(r.heart).toBe("work");
    expect(r.content).not.toMatch(/Xui ghê/);
    expect(r.content).not.toMatch(/burnout/);
  });
  it("10. 'A lo không biết thời gian tới sống sao' → nỗi lo, không 'chưa hiểu ý'", async () => {
    const [r] = await run(["A lo không biết thời gian tới sống sao."]);
    expect(r.heart).toBe("anxiety");
    expect(r.unk).toBeUndefined();
    expect(r.content).not.toMatch(LOST);
  });
});

describe("B — xin được an ủi", () => {
  it("11. tâm sự → 'mãi không kiếm được việc làm' → 'em an ủi anh đi chứ' → an ủi bám chuyện tìm việc", async () => {
    for (const seed of [1, 2, 3]) {
      const r = await run(["A muốn tâm sự.", "Mãi không kiếm được việc làm.", "Em an ủi anh đi chứ."], seed);
      expect(r[1].heart).toBe("work");
      expect(r[2].heart).toBe("work");
      expect(r[2].content).not.toMatch(LOST);
      expect(r[2].content).not.toMatch(PROMO);
      expect(r[2].content).not.toMatch(/•|gợi ý vài/); // an ủi, không phải danh sách giải pháp
      expect(r[2].content).toMatch(/việc/);
      expect(r[2].content).toMatch(COMFORT);
      expect(r[2].content).not.toMatch(/mọi chuyện rồi sẽ ổn/i);
    }
  });
  it("12–13. đang buồn → 'dỗ anh một chút đi' / 'nói gì cho anh đỡ buồn đi' → an ủi, không nhắc lại nguyên câu", async () => {
    for (const q of ["Dỗ anh một chút đi.", "Nói gì cho anh đỡ buồn đi."]) {
      const r = await run(["A buồn quá", q]);
      expect(r[1].heart).toBe("sad");
      expect(r[1].content).not.toMatch(/^(Dỗ anh|Nói gì cho anh)/);
      expect(r[1].content).not.toMatch(/•/);
      expect(r[1].content).toMatch(COMFORT);
    }
  });
  it("14–15. 'cần một chút động viên', 'nói gì dễ nghe với anh đi' (chưa kể gì) → an ủi + mời kể, mở mạch tâm sự", async () => {
    for (const q of ["Anh cần một chút động viên.", "Em nói gì dễ nghe với anh đi."]) {
      const [r] = await run([q]);
      expect(r.heart).toBe("sad");
      expect(r.unk).toBeUndefined();
      expect(r.content).not.toMatch(/Không cần chạy nhanh/);
      expect(r.content).toMatch(/kể/);
    }
  });
  it("16. 'Anh mệt mỏi quá, an ủi anh đi' → an ủi cái mệt, không hỏi kiểu bác sĩ", async () => {
    const [r] = await run(["Anh mệt mỏi quá, an ủi anh đi."]);
    expect(r.heart).toBe("tired");
    expect(r.content).not.toMatch(/•/);
    expect(r.content).toMatch(/cố|gồng|nghỉ/);
  });
  it("17. 'không cần lời khuyên, chỉ muốn được an ủi' → an ủi (không chỉ 'em nghe nè') + chế độ không khuyên", async () => {
    const r = await run(["A thất nghiệp rồi", "Anh không cần lời khuyên, chỉ muốn được an ủi."]);
    expect(r[1].heart).toBe("work");
    expect(r[1].heartListen).toBe(true);
    expect(r[1].content).toMatch(/thất nghiệp|việc/);
    expect(r[1].content).toMatch(COMFORT);
    expect(r[1].content).not.toMatch(/•/);
  });
  it("18. 'em nghe anh kể thôi nha, đừng khuyên' → chỉ nghe (khác an ủi)", async () => {
    const r = await run(["A thất nghiệp rồi", "Em nghe anh kể thôi nha, đừng khuyên."]);
    expect(r[1].heart).toBe("work");
    expect(r[1].heartListen).toBe(true);
    expect(r[1].content).not.toMatch(/giá trị|kém cỏi/);
  });
  it("'Do anh đi trễ nên bị sếp mắng' không bị hiểu là xin dỗ dành", async () => {
    const [r] = await run(["Do anh đi trễ nên bị sếp mắng"]);
    expect(r.content).not.toMatch(/mạnh mẽ|ngồi cạnh/);
  });
});

describe("C — kể tiếp nhiều lượt", () => {
  it("19–25. thất nghiệp → CV không ai gọi → mất tự tin → tiền nhà → bí → tự chê: giữ đúng mạch công việc", async () => {
    for (const seed of [1, 2]) {
      const r = await run(
        ["A đang thất nghiệp.", "Tìm việc mãi không được.", "Gửi CV nhiều nơi rồi mà không ai gọi.", "A bắt đầu thấy mất tự tin.", "A còn lo tiền nhà nữa.", "Không biết phải làm sao.", "Chắc a kém cỏi thật."],
        seed,
      );
      for (const t of r) {
        expect(t.heart).toBe("work");
        expect(t.unk).toBeUndefined();
        expect(t.content).not.toMatch(LOST);
      }
      for (const t of r.slice(1, 5)) expect(t.content).not.toMatch(PROMO);
      // kể thêm chi tiết → không nhắc lại rồi buông "Em hiểu." / "Ra là vậy."
      for (const t of r.slice(2, 5)) expect(t.content.trim()).not.toMatch(/(Em hiểu|Ra là vậy)\.?$/);
      // "không biết phải làm sao" → bám các điều đã kể, chưa đưa danh sách khuyên
      expect(r[5].content).toMatch(/tiền nhà|tự tin/);
      expect(r[5].content).not.toMatch(/•/);
      // không hỏi dồn hai câu liền
      expect((r[1].content.match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
    }
  });
});

describe("D — chuyển chủ đề khi đang tâm sự", () => {
  it("26–27. đang buồn → học tiếng Anh: thoát mạch tâm sự, nói thật + bài ngắn soạn sẵn", async () => {
    for (const q of ["A muốn học vài câu tiếng Anh.", "Học tiếng Anh với anh một chút được không?", "Học vài câu tiếng Anh được không?"]) {
      const r = await run(["A đang buồn", q]);
      expect(r[1].heart).toBeUndefined();
      expect(r[1].content).toMatch(/chưa có chương trình dạy tiếng Anh/);
      expect(r[1].content).toMatch(/\*\*[A-Z][^*]+\*\* — /);
    }
  });
  it("28. 'Thôi đổi chủ đề đi' → đổi chuyện, không đọc lại câu đó như chuyện buồn", async () => {
    const r = await run(["A đang buồn", "Thôi đổi chủ đề đi."]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].content).toMatch(/đổi chuyện/);
  });
  it("29. 'Hôm nay ăn gì?' → gợi ý món", async () => {
    const r = await run(["A đang buồn", "Hôm nay ăn gì?"]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].dishAsk).toBeTruthy();
  });
  it("30. 'Tìm quán cà phê gần đây' → tìm quán", async () => {
    const r = await run(["A đang buồn", "Tìm quán cà phê gần đây."]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].places?.length).toBeGreaterThan(0);
  });
  it("31. 'Bói Tarot cho anh đi' → bói", async () => {
    const r = await run(["A đang buồn", "Bói Tarot cho anh đi."]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].tarot).toBeTruthy();
  });
  it("32. 'Anh hỏi chuyện sức khỏe một chút' → mời kể triệu chứng / hỏi sức khoẻ", async () => {
    const r = await run(["A đang buồn", "Anh hỏi chuyện sức khỏe một chút."]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].content).toMatch(/triệu chứng/);
  });
  it("33. 'Chỉ anh cách sử dụng Quẹt' → hướng dẫn Quẹt", async () => {
    const r = await run(["A đang buồn", "Chỉ anh cách sử dụng Quẹt."]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].content).toMatch(/Quẹt/);
    expect(r[1].content).toMatch(/Vuốt|vuốt/);
  });
  it("34. 'Giúp anh tính tiền lương' → nói thật chỉ tính phép đơn giản, rồi tính được", async () => {
    const r = await run(["A đang buồn", "Giúp anh tính tiền lương.", "26 x 350000"]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].content).toMatch(/phép tính/);
    expect(r[2].content).toMatch(/9100000/);
  });
  it("35. thất nghiệp → học tiếng Anh → 'quay lại chuyện tìm việc lúc nãy' → về lại mạch công việc", async () => {
    const r = await run(["A đang thất nghiệp.", "Tìm việc mãi không được.", "Học tiếng Anh với anh một chút được không?", "Thôi quay lại chuyện tìm việc lúc nãy đi."]);
    expect(r[1].heart).toBe("work");
    expect(r[2].heart).toBeUndefined();
    expect(r[3].heart).toBe("work");
    expect(r[3].content).toMatch(/quay lại/);
  });
});

describe("E — chống hồi quy", () => {
  it("36. 'A chán vì không có gì làm' → chán vì rảnh (gợi chuyện làm), không hỏi như chuyện buồn", async () => {
    const [r] = await run(["A chán vì không có gì làm."]);
    expect(r.content).not.toMatch(/có chuyện gì làm anh thấy vậy/);
    expect(r.content).toMatch(/Rảnh|làm gì/);
  });
  it("37. 'A chán vì thất nghiệp' → chuyện công việc", async () => {
    const [r] = await run(["A chán vì thất nghiệp."]);
    expect(r.heart).toBe("work");
    expect(r.content).not.toMatch(PROMO);
  });
  it("38. 'A chán nhưng không muốn tâm sự' → tôn trọng, không hỏi dồn chuyện gì", async () => {
    const [r] = await run(["A chán nhưng không muốn tâm sự."]);
    expect(r.content).toMatch(/không muốn kể thì mình không kể/);
    expect(r.content).not.toMatch(/có chuyện gì/i);
  });
  it("39. 'muốn tâm sự nhưng không muốn nhận lời khuyên' → chế độ chỉ nghe", async () => {
    const [r] = await run(["A muốn tâm sự nhưng không muốn nhận lời khuyên."]);
    expect(r.heart).toBe("open");
    expect(r.heartListen).toBe(true);
  });
  it("40. 'muốn lời khuyên chứ không cần an ủi' → hỏi hoàn cảnh để khuyên, không an ủi", async () => {
    const [r] = await run(["A muốn lời khuyên chứ không cần an ủi."]);
    expect(r.heart).toBe("open");
    expect(r.content).toMatch(/cách xử lý/);
    expect(r.content).not.toMatch(/mạnh mẽ|ngồi cạnh|yếu đuối/);
  });
  it("41. kể chuyện buồn của người khác → không đáp như chính người dùng bị chia tay", async () => {
    const [r] = await run(["Bạn a đang buồn vì bị bồ đá."]);
    expect(r.content).toMatch(/Người bạn đó/);
    expect(r.content).not.toMatch(/Chia tay đau lắm/);
  });
  it("42. hỏi cách an ủi bạn gái → cách an ủi người đó, không phải lời khuyên cho chính mình", async () => {
    const [r] = await run(["Làm sao để an ủi bạn gái đang buồn?"]);
    expect(r.content).toMatch(/an ủi bạn gái/);
    expect(r.content).not.toMatch(/Vận động nhẹ|ra nắng/);
  });
  it("43. đang buồn → 'không muốn tâm sự nữa' → dừng mạch", async () => {
    const r = await run(["A đang buồn", "A không muốn tâm sự nữa."]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].content).toMatch(/dừng/);
  });
  it("44. đang buồn → hỏi vitamin C → trả lời sức khoẻ", async () => {
    const r = await run(["A đang buồn", "Uống vitamin C mỗi ngày có tốt không?"]);
    expect(r[1].heart).toBeUndefined();
    expect(r[1].content).toMatch(/Vitamin C/);
  });
  it("45. đang tâm sự thất nghiệp → 'nó làm a mất ngủ luôn' → vẫn là kể tiếp, không ra bảng phân tích cảm xúc", async () => {
    const r = await run(["A đang thất nghiệp.", "Nó làm a mất ngủ luôn."]);
    expect(r[1].heart).toBeTruthy();
    expect(r[1].content).toMatch(/mất ngủ/);
    expect(r[1].content).not.toMatch(/Em nghe anh đang cảm thấy:/);
  });
});
