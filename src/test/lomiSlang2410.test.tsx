// 24/10 — theo ý Kir: thêm từ lóng, viết tắt, teen code, giọng miền. Chỉ đổi những chữ / cụm không trùng nghĩa với từ thường.
import { describe, expect, it } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { chat } from "@/test/lomiChatHarness";

describe("từ lóng / viết tắt / giọng miền", () => {
  it("đổi đúng nghĩa", () => {
    const cases: [string, string][] = [
      ["gấu a giận a rồi", "người yêu a giận a rồi"],
      ["a chưa có gấu", "a chưa có người yêu"],
      ["trầm kẽm quá", "trầm cảm quá"],
      ["a mắc ói quá", "a buồn nôn quá"],
      ["răng rứa", "sao vậy"],
      ["đi mô rứa", "đi đâu vậy"],
      ["a nỏ biết", "a không biết"],
      ["bữa ni a buồn", "hôm nay a buồn"],
      ["bs nói a bị viêm họng", "bác sĩ nói a bị viêm họng"],
      ["khg bít làm sao", "không biết làm sao"],
      ["nma a sợ", "nhưng mà a sợ"],
      ["bgio a phải làm gì", "bây giờ a phải làm gì"],
      ["chèn ơi mệt quá", "trời ơi mệt quá"],
      ["hổm rày a mất ngủ", "mấy hôm nay a mất ngủ"],
      ["sad quá", "buồn quá"],
    ];
    for (const [a, b] of cases) expect(expandTeen(a), a).toBe(b);
  });
  it("không đổi nhầm chữ thường", () => {
    for (const s of ["con gấu bông", "mắc tiền quá", "đau răng quá", "a bị mắc kẹt", "mô hình đẹp", "răng khôn mọc lệch"]) expect(expandTeen(s), s).toBe(s);
  });
  it("trong hội thoại: mắc ói → buồn nôn; trầm kẽm → tâm sự trầm cảm; gấu giận → chuyện tình cảm", async () => {
    expect((await chat(["a mắc ói quá"], { seed: 3 }))[0].health?.label).toBe("buồn nôn");
    expect((await chat(["trầm kẽm quá e ơi"], { seed: 3 }))[0].heart).toBe("depress");
    expect((await chat(["gấu a giận a rồi"], { seed: 3 }))[0].heart).toBeTruthy();
  }, 60000);
});
