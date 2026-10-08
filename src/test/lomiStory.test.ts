// MẠCH CHUYỆN CÓ TRẠNG THÁI (10/10) — test lib/lomiStory (đang nói về ai, đã biết gì, Lomi vừa hỏi gì, còn thiếu gì) và phần
// "kể tiếp bám nội dung" của lib/lomiHeart. Gọi thẳng hàm (không dựng khung chat) nên thử được nhiều cách nói chưa từng xuất hiện;
// chuỗi hội thoại thật nằm ở lomiConversation.test.tsx.
import { describe, expect, it } from "vitest";
import { parseVi, mirrorOf, YOU_MARK } from "@/lib/lomiParse";
import { isClause, mirrorText } from "@/lib/lomiFrame";
import { recap, storyOpen, storyOpenSymptom, storyTurn, subjectFix, type Slot, type Thread } from "@/lib/lomiStory";
import { heartContinue, heartFollow, type HeartCtx } from "@/lib/lomiHeart";

const MOM = { text: "mẹ anh", kind: "third" as const };
const DOG = { text: "con chó nhà anh", kind: "pet" as const };
const care = (asked: Slot[] = ["severity", "doctor"], facts: Thread["facts"] = {}, who = MOM): Thread => ({ kind: "care", who, facts, asked, done: [...asked] });
/** Một lượt như trong AiAssistant.send(). */
const turn = (raw: string, th: Thread, env: { claimed?: boolean; inHeart?: boolean } = {}) => {
  const f = parseVi(raw, { addr: "anh", hour: 15 });
  return storyTurn(raw, f, th, { addr: "anh", mirror: mirrorText(f, "anh", 8), ...env });
};
/** Chạy cả chuỗi, trả về các câu đáp + mạch cuối. */
function run(th: Thread, turns: string[]) {
  const out: NonNullable<ReturnType<typeof turn>>[] = [];
  for (const t of turns) {
    const r = turn(t, th);
    if (!r) throw new Error(`mạch không nhận câu: ${t}`);
    out.push(r);
    th = r.thread;
  }
  return { out, th };
}

describe("mở mạch từ câu Lomi vừa hỏi", () => {
  it("người ốm: Lomi hỏi “nặng không + khám chưa” → hai ô đang chờ", () => {
    const th = storyOpen("frame:third_ill", MOM, "Mẹ anh ốm hả 🥺 Thương ghê. Có nặng không bạn, đã đi khám chưa?");
    expect(th).toMatchObject({ kind: "care", who: MOM, asked: ["severity", "doctor"] });
  });
  it("thú cưng ốm / người nhập viện / nói là nhẹ / mới mất", () => {
    expect(storyOpen("frame:third_ill", DOG, "… Bé bị sao vậy, bạn đưa đi thú y chưa?")?.asked).toEqual(["doctor"]);
    expect(storyOpen("frame:third_ill", MOM, "… Bác sĩ có nói mẹ anh bị gì không?")).toMatchObject({ facts: { doctor: true, stay: true }, asked: ["dx"] });
    expect(storyOpen("frame:third_ill", MOM, "Chỉ bị cảm thôi thì đỡ lo rồi 😊 Mong mẹ anh mau khoẻ nha!")).toMatchObject({ facts: { severity: false }, asked: [], closed: true });
    expect(storyOpen("frame:third_loss", DOG, "…")).toMatchObject({ kind: "loss", asked: ["dur"] });
    expect(storyOpen("frame:third_loss", MOM, "…")).toMatchObject({ kind: "loss", asked: ["feel"] });
    expect(storyOpen("frame:third_pos", MOM, "…")).toBeUndefined();
    expect(storyOpen("frame:third_ill", { text: "xe anh", kind: "thing" }, "…")).toBeUndefined();
  });
});

describe("P0 — câu trả lời → ghi vào đúng ô → hỏi tiếp ô còn thiếu", () => {
  it("“Đi khám rồi” → doctor = true → hỏi bác sĩ nói gì", () => {
    const r = turn("Đi khám rồi", care())!;
    expect(r.thread.facts.doctor).toBe(true);
    expect(r.thread.asked).toEqual(["dx"]);
    expect(r.text).toMatch(/Bác sĩ có nói mẹ anh bị gì không\?/);
    expect(r.thread.who).toEqual(MOM);
  });
  it("nhiều cách nói “đã đi khám” — không cần câu nào từng gặp", () => {
    for (const s of ["đi khám rồi", "khám rồi", "a đưa mẹ đi khám rồi", "sáng nay mới đi khám", "đưa vô bệnh viện rồi", "có đi bác sĩ rồi", "đi phòng khám hôm qua", "mới tái khám xong", "di kham roi", "dua di benh vien roi"])
      expect(turn(s, care())?.thread.facts.doctor, s).toBe(true);
  });
  it("…và “chưa đi khám”", () => {
    for (const s of ["chưa đi khám", "chưa khám", "mẹ không chịu đi khám", "chưa đưa đi bác sĩ", "chua di kham", "chưa", "chưa đâu"]) {
      const r = turn(s, care());
      expect(r?.thread.facts.doctor, s).toBe(false);
      expect(r?.text, s).not.toMatch(/Bác sĩ có nói/);
    }
  });
  it("câu đáp cụt đi vào đúng kiểu câu hỏi: “rồi / chưa” ↔ “…chưa?”, “có / không” ↔ “…không?”", () => {
    expect(turn("rồi", care())?.thread.facts).toEqual({ doctor: true });
    expect(turn("chưa", care())?.thread.facts).toEqual({ doctor: false });
    expect(turn("có", care())?.thread.facts).toEqual({ severity: true });
    expect(turn("không", care())?.thread.facts).toEqual({ severity: false });
    expect(turn("ko", care())?.thread.facts).toEqual({ severity: false });
    expect(turn("rồi", care(["meds"], { doctor: true, dx: "viêm họng" }))?.thread.facts.meds).toBe(true);
    // Lomi không vừa hỏi gì thì "rồi" không thuộc mạch này.
    expect(turn("rồi", care([]))).toBeNull();
  });
  it("hỏi hai điều mà mới đáp một → hỏi nốt điều còn lại; đã đáp rồi thì không hỏi lại", () => {
    const r = turn("nặng lắm", care())!;
    expect(r.thread.facts.severity).toBe(true);
    expect(r.text).toMatch(/đã đi khám chưa/);
    const r2 = turn("đi khám rồi", r.thread)!;
    expect(r2.text).not.toMatch(/đã đi khám chưa/);
    expect(r2.text).toMatch(/bị gì không/);
  });
  it("chẩn đoán: lời bác sĩ, câu đáp ngắn cho “bị gì?”, “bị … thôi”", () => {
    const asked = care(["dx"], { doctor: true });
    for (const [s, dx] of [
      ["Bác sĩ nói viêm họng", "viêm họng"],
      ["bác sĩ bảo bị viêm phế quản", "viêm phế quản"],
      ["bs nói là sốt siêu vi", "sốt siêu vi"],
      ["họ chẩn đoán viêm dạ dày", "viêm dạ dày"],
      ["viêm họng", "viêm họng"],
      ["bị viêm xoang á", "viêm xoang"],
      ["huyết áp cao", "huyết áp cao"],
    ] as const)
      expect(turn(s, asked)?.thread.facts.dx, s).toBe(dx);
    // chưa hỏi "bị gì" vẫn nhận lời bác sĩ; và nhận luôn là đã đi khám
    const r = turn("bác sĩ nói viêm họng", care())!;
    expect(r.thread.facts).toMatchObject({ dx: "viêm họng", doctor: true });
    // nói là nhẹ
    expect(turn("bị cảm thôi", care())?.thread.facts).toMatchObject({ dx: "cảm", severity: false });
    // chưa biết
    for (const s of ["chưa biết", "bác sĩ chưa nói gì", "đang chờ kết quả", "chưa có kết quả"]) expect(turn(s, asked)?.thread.facts.dx, s).toBe(false);
    // người dùng hỏi lại thì không phải câu trả lời
    for (const s of ["bị gì vậy e", "có sao không e", "có nặng không"]) expect(turn(s, asked), s).toBeNull();
    // câu chỉ nói thời điểm không phải tên bệnh
    expect(turn("tối qua", asked)?.thread.facts.dx).toBeUndefined();
  });
  it("thuốc, đỡ / chưa đỡ, nằm viện, lớn tuổi", () => {
    const d = care(["meds"], { doctor: true, dx: "viêm họng" });
    for (const s of ["Uống thuốc rồi", "có thuốc rồi", "bác sĩ kê đơn rồi", "a mua thuốc rồi", "uong thuoc roi"]) expect(turn(s, d)?.thread.facts.meds, s).toBe(true);
    expect(turn("chưa có thuốc", d)?.thread.facts.meds).toBe(false);
    for (const s of ["đỡ rồi", "mẹ đỡ hơn rồi", "khoẻ lại rồi", "hết sốt rồi", "xuất viện rồi", "do roi"]) expect(turn(s, care([]))?.thread.facts.better, s).toBe(true);
    for (const s of ["vẫn chưa đỡ", "chưa đỡ", "nặng hơn rồi", "vẫn sốt"]) expect(turn(s, care([]))?.thread.facts.better, s).toBe(false);
    expect(turn("đang nằm viện", care())?.thread.facts).toMatchObject({ doctor: true, stay: true });
    expect(turn("bà ấy lớn tuổi rồi", care([]))?.text).toMatch(/lớn tuổi/);
  });
  it("đủ thông tin thì KHÉP LẠI bằng lời động viên — không hỏi thêm, và chỉ nói lời khép lại một lần", () => {
    const { out, th } = run(care(), ["Đi khám rồi", "Bác sĩ nói viêm họng", "Uống thuốc rồi"]);
    expect(out[2].text).toMatch(/được khám và có thuốc rồi/);
    expect(out[2].text).not.toMatch(/\?/);
    expect(out[2].quick).toEqual(["Viêm họng nên làm gì?", "Viêm họng kiêng gì?"]);
    expect(out[2].health?.label).toBeTruthy(); // để câu hỏi kiến thức kế tiếp có đúng bệnh
    expect(th.closed).toBe(true);
    const again = turn("mẹ a lớn tuổi rồi", th)!;
    expect(again.text).not.toMatch(/Mong mẹ( anh)? mau khoẻ/);
  });
  it("mỗi câu hỏi chỉ hỏi một lần trong cả mạch (trừ điều chưa được trả lời — hỏi lại đúng một lần)", () => {
    const { out } = run(care(), ["a lo quá", "bà ấy lớn tuổi rồi", "mẹ ở quê", "ở với bố", "đi khám rồi", "viêm phổi", "có thuốc rồi"]);
    const qs = out.map((o) => (o.text.match(/[^.!?—]*\?/g) ?? []).pop()?.trim()).filter(Boolean);
    expect(new Set(qs).size).toBe(qs.length);
    expect(out.filter((o) => /đã đi khám chưa/.test(o.text))).toHaveLength(1); // ô "khám chưa" chưa được đáp → hỏi lại đúng một lần
  });
  it("lượt trước hỏi một điều mà người dùng nói sang ý khác → không hỏi lại ngay điều đó", () => {
    const th = care(["dur"], { doctor: false });
    const r = turn("a mua thuốc rồi", th)!;
    expect(r.thread.facts.meds).toBe(true);
    expect(r.text).not.toMatch(/mấy hôm rồi/);
  });
});

describe("P0 — giữ đúng người đang được nói tới", () => {
  it("câu lược chủ ngữ / “bà ấy”, “nó” vẫn là người đó; cả chuỗi không đổi sang người dùng", () => {
    const { out, th } = run(care(), ["đi khám rồi", "viêm họng", "uống thuốc rồi", "đỡ rồi"]);
    expect(th.who).toEqual(MOM);
    for (const o of out) expect(o.text).not.toMatch(/(anh|bạn) (đang bị|đã đi khám|uống thuốc)|Bạn đang bị/);
    expect(out[3].text).toMatch(/Mẹ anh đỡ rồi/);
  });
  it("sửa chủ thể: “Mẹ a á, không phải a” và các cách nói khác", () => {
    for (const s of ["Mẹ a á, không phải a", "không phải a, mẹ a", "mẹ a chứ không phải a", "không phải a đâu, là mẹ a", "ko phải a, mẹ a á"]) {
      const f = subjectFix(s, "anh");
      expect(f?.who, s).toEqual(MOM);
    }
    // gõ không dấu: vẫn nhận ra là đang SỬA chủ thể (đang ở trong một mạch thì người đang nói tới được giữ nguyên)
    expect(subjectFix("me a a, khong phai a", "anh")).not.toBeNull();
    expect(subjectFix("không phải a", "anh")).toEqual({}); // sửa, nhưng không nêu ai
    expect(subjectFix("không phải a nói vậy đâu", "anh")).toBeNull();
    expect(subjectFix("a không phải bác sĩ", "anh")).toBeNull();
    expect(subjectFix("mẹ a đang ốm", "anh")).toBeNull();
  });
  it("…trong mạch: nhận lỗi, nhắc lại đúng người + những gì đã biết", () => {
    const th = care([], { doctor: true, dx: "viêm họng", meds: true });
    const r = turn("Mẹ a á, không phải a", th)!;
    expect(r.why).toBe("fix");
    expect(r.text).toMatch(/người đang ốm là mẹ anh, không phải anh/);
    expect(r.text).toMatch(/đã đi khám, bác sĩ nói viêm họng, có thuốc uống rồi/);
    // đổi sang người khác
    const r2 = turn("không phải mẹ, bố a", { ...th, facts: {} });
    expect(r2 === null || r2.thread.who.text === "mẹ anh" || r2.thread.who.text === "bố anh").toBe(true);
  });
  it("câu nói về một NGƯỜI KHÁC hẳn không bị ghi vào mạch này", () => {
    expect(turn("bố a cũng đi khám rồi", care())).toBeNull();
    expect(turn("vợ a thì khoẻ", care())).toBeNull();
    // bác sĩ làm chủ ngữ vẫn là chuyện của người đang ốm
    expect(turn("bác sĩ kê thuốc rồi", care())?.thread.facts.meds).toBe(true);
  });
  it("recap() chỉ nói những điều đã biết", () => {
    expect(recap(care([], {}))).toBe("");
    expect(recap(care([], { doctor: false }))).toBe("chưa đi khám");
    expect(recap(care([], { dx: "cảm" }))).toBe("bị cảm");
  });
});

describe("P1 — chỉ an ủi khi có tín hiệu cảm xúc; vẫn nhớ người bệnh", () => {
  it("“A lo quá” → an ủi có nhắc tới mẹ, mạch vẫn giữ", () => {
    const r = turn("A lo quá", care())!;
    expect(r.why).toBe("feel");
    expect(r.text).toMatch(/Mẹ anh ốm thì lo là phải/);
    expect(r.thread.who).toEqual(MOM);
    expect(r.thread.felt).toBe(1);
  });
  it("nhiều cách nói ra nỗi lo — và không nhầm cảm xúc của NGƯỜI ỐM thành của người kể", () => {
    for (const s of ["a lo quá", "lo ghê", "a sợ lắm", "a thương mẹ quá", "a rối quá", "a sợ mẹ có chuyện gì", "a không biết làm sao", "a buồn lắm"]) expect(turn(s, care())?.why, s).toBe("feel");
    expect(turn("mẹ a lo lắm", care())?.why).not.toBe("feel");
    expect(turn("mẹ a mệt lắm", care())?.why).not.toBe("feel");
  });
  it("câu kể dữ kiện thì KHÔNG an ủi, không hỏi cảm xúc", () => {
    for (const s of ["đi khám rồi", "uống thuốc rồi", "bác sĩ nói viêm họng", "3 ngày rồi"]) {
      const r = turn(s, care())!;
      expect(r.why, s).not.toBe("feel");
      expect(r.text, s).not.toMatch(/bận lòng|thấy sao|thấy thế nào|lo là phải/);
    }
  });
  it("lo lần thứ hai → trao cho mạch tâm sự (chăm người bệnh); lời an ủi không lặp", () => {
    const a = turn("a lo quá", care())!;
    const b = turn("a sợ lắm", a.thread)!;
    expect(b.heart).toBe("caregiver");
    expect(b.text).not.toBe(a.text);
    // đang ở mạch tâm sự thì mạch chuyện chỉ nhận dữ kiện mới, cảm xúc để mạch tâm sự nghe
    expect(turn("a lo quá", b.thread, { inHeart: true })).toBeNull();
    expect(turn("đi khám rồi", b.thread, { inHeart: true })?.thread.facts.doctor).toBe(true);
  });
});

describe("mạch không giành câu của lớp khác", () => {
  it("câu hỏi, lời chào / cảm ơn, lời nhờ → null (lớp khác trả lời)", () => {
    for (const s of ["viêm họng kiêng gì?", "có nguy hiểm không e", "nên cho mẹ ăn gì", "cảm ơn e", "chào e", "tìm quán cà phê gần đây", "bói cho a một lá", "hôm nay ăn gì"]) expect(turn(s, care([]), { claimed: true }), s).toBeNull();
  });
  it("triệu chứng cụ thể để lớp sức khoẻ phân tích (cho đúng người bệnh)", () => {
    expect(turn("bị sốt với ho", care())).toBeNull();
    expect(turn("mẹ a sốt cao lắm", care())).toBeNull();
  });
  it("chuyện khác đã chen vào (idle) thì chỉ quay lại mạch khi câu có dữ kiện mới", () => {
    const idle = { ...care([]), idle: 1 };
    expect(turn("a buồn quá", idle)).toBeNull();
    expect(turn("ở quê", idle)).toBeNull();
    expect(turn("mẹ a đỡ rồi", idle)?.thread.idle).toBe(0);
  });
  it("câu kể về chính mình không liên quan thì không nhận", () => {
    expect(turn("a đang ăn pizza", care([]))).toBeNull();
    expect(turn("mai a đi Đà Nẵng", care([]))).toBeNull();
  });
});

describe("mạch “mới mất”", () => {
  const loss = (who: Thread["who"] = DOG, asked: Slot[] = ["dur"]): Thread => ({ kind: "loss", who, facts: {}, asked, done: [...asked] });
  it("thú cưng: nhớ đã nuôi bao lâu → hỏi vì sao → không hỏi nữa → an ủi theo đúng những điều đã kể", () => {
    const { out, th } = run(loss(), ["nuôi 5 năm rồi", "nó bị bệnh", "a nhớ nó quá"]);
    expect(out[0].text).toMatch(/^5 năm/);
    expect(out[0].thread.asked).toEqual(["cause"]);
    expect(out[1].thread.facts.cause).toBe("ill");
    expect(out[1].text).not.toMatch(/\?|khám/);
    expect(out[2].text).toMatch(/5 năm bên nhau/);
    expect(th.who).toEqual(DOG);
  });
  it("nguyên do khác nhau → lời đáp khác nhau", () => {
    const base = { ...loss(DOG, ["cause"]), facts: { dur: "5 năm" } };
    expect(turn("bị xe tông", base)?.thread.facts.cause).toBe("sudden");
    expect(turn("già rồi", base)?.thread.facts.cause).toBe("old");
    expect(turn("bị ung thư", base)?.thread.facts.cause).toBe("ill");
    const texts = ["bị xe tông", "già rồi", "bị ung thư"].map((s) => turn(s, base)!.text);
    expect(new Set(texts).size).toBe(3);
  });
  it("người thân: buồn / nhớ / tự trách được đáp khác nhau, có nhắc đúng người", () => {
    const gm = loss({ text: "bà anh", kind: "third" }, ["feel"]);
    expect(turn("a buồn lắm", gm)?.text).toMatch(/Buồn là phải/);
    expect(turn("a nhớ bà quá", gm)?.text).toMatch(/Nhớ là phải/);
    expect(turn("a hối hận lắm", gm)?.text).toMatch(/Đừng tự trách/);
    const { out } = run(gm, ["a buồn lắm", "a nhớ bà", "a vẫn nhớ bà"]);
    expect(new Set(out.map((o) => o.text)).size).toBe(3); // không lặp lời an ủi
    expect(out[2].heart).toBe("grief");
  });
});

describe("lớp sức khoẻ vừa phân tích triệu chứng của người khác", () => {
  it("“con a bị sốt” → “2 ngày rồi” → hỏi tiếp về ĐÚNG người bệnh", () => {
    const th = storyOpenSymptom({ text: "con anh", kind: "third" });
    const r = turn("2 ngày rồi", th)!;
    expect(r.thread.facts.dur).toBe("2 ngày rồi");
    expect(r.text).toMatch(/Con anh đã đi khám chưa/);
  });
});

// ── Phần "kể tiếp" của mạch tâm sự ──────────────────────────────────────────
describe("nhắc lại điều vừa nghe (mirrorOf)", () => {
  const M = (s: string) => mirrorText(parseVi(s, { addr: "anh", hour: 15 }), "anh", 12);
  it("đổi ngôi, bỏ lời gọi / từ nối đầu câu / tiểu từ cuối câu", () => {
    expect(M("tại a về trễ")).toBe("tại anh về trễ");
    expect(M("vợ a không nói chuyện với a")).toBe("vợ anh không nói chuyện với anh");
    expect(M("mà vợ a vẫn giận")).toBe("vợ anh vẫn giận");
    expect(M("e ơi a mệt quá")).toBe("anh mệt quá");
    expect(M("làm cả ngày")).toBe("làm cả ngày");
    expect(M("chẳng ai giúp")).toBe("chẳng ai giúp");
    expect(M("ở một mình")).toBe("ở một mình");
    expect(M("con thì quậy nha")).toBe("con thì quậy");
    expect(M("a sợ mẹ có chuyện gì")).toBe("anh sợ mẹ có chuyện gì");
  });
  it("không nhắc lại câu hỏi, lời chào, câu chỉ có từ đệm, câu quá dài", () => {
    for (const s of ["sao vợ a lại vậy?", "chào e", "cảm ơn e nha", "ừ", "rồi", "chưa", "a"]) expect(M(s), s).toBeNull();
    expect(mirrorOf(parseVi("hôm qua a đi làm về thì thấy vợ a đang ngồi khóc ở trong phòng một mình", { addr: "anh" }), 10)).toBeNull();
  });
  it("giữ dấu chỉ người nói để lớp gọi đổi theo cách xưng hô", () => {
    expect(mirrorOf(parseVi("a xin lỗi rồi", { addr: "anh" }))).toBe(`${YOU_MARK} xin lỗi rồi`);
  });
});

describe("khung câu: phủ định nằm trong vị ngữ, cụm danh từ đứng một mình", () => {
  it("“nó học không tốt lắm” là chuyện không vui (trước đây bị đáp “Thích ghê á”)", () => {
    const f = parseVi("nó học không tốt lắm", { addr: "anh" });
    expect(f.pred?.val).toBe(-1);
    expect(f.pred?.qual).toBe("không tốt");
    expect(parseVi("nó học tốt lắm", { addr: "anh" }).pred?.val).toBe(1);
    expect(parseVi("quán đó nấu không ngon", { addr: "anh" }).pred?.val).toBe(-1);
  });
  it("“mẹ a á” cho biết đang nói về ai dù không có vị ngữ", () => {
    const f = parseVi("Mẹ a á", { addr: "anh" });
    expect(f.subject).toBe("third");
    expect(f.subjectText).toBe(`mẹ ${YOU_MARK}`);
    expect(f.conf).toBeLessThan(0.7); // câu cụt: lớp đáp theo khung không tự đáp
    expect(parseVi("pizza", { addr: "anh" }).subject).toBe("none");
  });
  it("“làm cả ngày”, “bạn bè ai cũng bận”, “a sợ mẹ có chuyện gì” là câu KỂ, không phải câu hỏi", () => {
    for (const s of ["làm cả ngày", "làm tới khuya luôn", "bạn bè ai cũng bận", "a sợ mẹ có chuyện gì", "a lo có chuyện gì không hay"]) expect(parseVi(s, { addr: "anh" }).act, s).not.toBe("question");
    for (const s of ["làm sao bây giờ", "a sợ gì?", "mẹ a có chuyện gì vậy"]) expect(parseVi(s, { addr: "anh" }).act, s).toBe("question");
    expect(parseVi("làm giúp a cái này", { addr: "anh" }).act).not.toBe("statement"); // lời nhờ
  });
});

describe("P1 — kể tiếp: bám nội dung, xoay kiểu đáp, không lặp", () => {
  const LOOP = /đang nghe nè 🌿|cứ kể tiếp, từ từ thôi|mong nhất là gì|bận lòng nhiều không|kể thêm cho Lomi hiểu rõ hơn/;
  const ctxOf = (s: string, extra: Partial<HeartCtx> = {}): HeartCtx => {
    const f = parseVi(s, { addr: "anh", hour: 15 });
    return { mirror: mirrorText(f, "anh", 12), val: f.pred?.val ?? 0, self: f.subject === "self", neg: f.neg, ask: f.act === "question", clause: isClause(f), ...extra };
  };
  /** Cả một đoạn kể tiếp trong cùng chủ đề; trả về các câu Lomi đáp. */
  function tell(theme: string, first: string, turns: string[], extra: Partial<HeartCtx> = {}) {
    const said: string[] = [first];
    const told: string[] = [];
    turns.forEach((t, i) => {
      const c = ctxOf(t, extra);
      if (c.mirror) told.push(c.mirror);
      const r = heartContinue(t, theme, false, i + 2, said[said.length - 1], "", { ...c, recent: [...said].reverse(), details: told.slice(-4) });
      said.push(r.text);
    });
    return said.slice(1);
  }
  it("mỗi câu đáp mở đầu bằng chính điều vừa kể", () => {
    const out = tell("tired", "Bạn vất vả rồi 💚 Bạn có được nghỉ ngơi đủ không?", ["làm cả ngày", "về còn phải nấu cơm", "con thì quậy"]);
    expect(out[0]).toMatch(/^Làm cả ngày hả/);
    expect(out[1]).toMatch(/^Về còn phải nấu cơm hả/);
    expect(out[2]).toMatch(/^Con thì quậy hả/);
  });
  it("không dùng mấy câu “đang nghe” chung chung khi đã nhắc lại được nội dung — với nhiều chủ đề, nhiều câu chưa từng gặp", () => {
    const stories: [string, string[]][] = [
      ["tired", ["làm cả ngày", "tối về còn dọn nhà", "cuối tuần cũng phải đi làm", "lương thì thấp", "sếp giao thêm việc"]],
      ["fight", ["tại a quên sinh nhật vợ", "vợ a khóc", "a mua quà bù rồi", "vợ a không nhận", "hai đứa im lặng cả tối"]],
      ["sad", ["bạn thân a chuyển đi xa", "tụi a chơi với nhau từ nhỏ", "giờ ít nói chuyện hẳn", "a nhắn mà nó trả lời chậm"]],
      ["anxiety", ["tuần sau a phỏng vấn", "công ty lớn lắm", "a chưa chuẩn bị gì", "tiếng Anh a kém"]],
      ["boss", ["sếp chê a trước cả phòng", "a làm đúng quy trình mà", "đồng nghiệp không ai nói gì", "a muốn xin chuyển bộ phận"]],
      ["lonely", ["ở một mình", "bạn bè ai cũng bận", "tối nào cũng ăn cơm một mình"]],
    ];
    for (const [theme, turns] of stories) {
      const out = tell(theme, "Kể Lomi nghe đi.", turns);
      for (const [i, o] of out.entries()) expect(o, `${theme}: ${turns[i]} → ${o}`).not.toMatch(LOOP);
      // không câu nào (đủ dài) bị nói hai lần trong cùng đoạn
      const sent = out.flatMap((o) => o.split(/(?<=[.!?…])\s+|\n+/).filter((x) => x.length > 25));
      expect(sent.filter((x, i) => sent.indexOf(x) !== i), theme).toEqual([]);
      // không hỏi dồn: lượt trước vừa hỏi thì lượt này không kết bằng câu hỏi
      for (let i = 1; i < out.length; i++) expect(/\?\s*$/.test(out[i]) && /\?\s*$/.test(out[i - 1]), `${theme}: ${out[i]}`).toBe(false);
    }
  });
  it("không phải lượt nào cũng kết bằng câu hỏi", () => {
    const out = tell("fight", "Hai bạn cãi nhau vì chuyện gì vậy?", ["tại a về trễ", "vợ a không nói chuyện với a", "từ tối qua", "a xin lỗi rồi", "mà vợ a vẫn giận"]);
    expect(out.filter((o) => /\?\s*$/.test(o)).length).toBeLessThan(out.length - 1);
  });
  it("kể được vài ý rồi thì tóm lại đúng các ý đó (một lần), và hỏi cần gợi ý hay chỉ cần người nghe", () => {
    const out = tell("tired", "Bạn có được nghỉ ngơi đủ không?", ["làm cả ngày", "về còn phải nấu cơm", "con thì quậy", "chẳng ai giúp", "tối còn phải dọn nhà", "sáng lại đi làm", "cuối tuần cũng vậy"]);
    const sums = out.filter((o) => /từng đó chuyện dồn lại/.test(o));
    expect(sums).toHaveLength(1);
    expect(sums[0]).toMatch(/làm cả ngày, về còn phải nấu cơm, con thì quậy/i);
    expect(sums[0]).toMatch(/gợi ý/);
  });
  it("chủ đề chung chung mà người dùng chỉ đang kể chi tiết → không chen bài “góc nhìn / bước nhỏ” (không tư vấn khi không ai hỏi)", () => {
    const out = tell("anxiety", "Bạn đang lo chuyện gì vậy 🥺 Kể Lomi nghe với.", ["con a sắp thi", "nó học không tốt lắm"], { third: true });
    expect(out[0]).toMatch(/^Con anh sắp thi hả/);
    expect(out.join(" ")).not.toMatch(/Hít vào chậm|chuyên gia tâm lý|Cảm giác lo thường lên đỉnh/);
  });
  it("câu kể về người khác không làm đổi chủ đề sang chuyện của người dùng", () => {
    const r = heartContinue("con a sắp thi", "anxiety", false, 2, "Bạn đang lo chuyện gì vậy 🥺", "", { ...ctxOf("con a sắp thi"), third: true });
    expect(r.theme).toBe("anxiety");
    expect(r.text).not.toMatch(/công chuyện lớn|Áp lực học/);
  });
  it("đang nói một cảm xúc chung mà kể thêm mệnh đề có “bạn bè / công việc” → vẫn là chi tiết của cảm xúc đó; nói trống tên chủ đề thì chuyển", () => {
    const a = heartContinue("bạn bè ai cũng bận", "lonely", false, 3, "Ở một mình hả 😔", "", ctxOf("bạn bè ai cũng bận"));
    expect(a.theme).toBe("lonely");
    expect(a.text).toMatch(/^Bạn bè ai cũng bận hả/);
    expect(a.text).not.toMatch(/làm tổn thương/);
    const b = heartContinue("chuyện gia đình", "sad", false, 2, "Có chuyện gì làm bạn buồn vậy?", "", ctxOf("chuyện gia đình"));
    expect(b.theme).toBe("family");
  });
  it("đang nói về MỘT NGƯỜI cụ thể: câu nối bám người đó", () => {
    const base = { person: "người ấy" };
    const d = heartContinue("2 ngày rồi", "love", false, 3, "Bạn với người ấy đang ở mức nào?", "", { ...ctxOf("2 ngày rồi"), ...base });
    expect(d.text).toMatch(/người ấy/);
    expect(d.text).not.toMatch(/đang có người yêu, hay đang thích ai/);
    const f = heartContinue("a sợ làm phiền", "love", false, 4, d.text, "", { ...ctxOf("a sợ làm phiền"), ...base, recent: [d.text] });
    expect(f.text).toMatch(/^Anh sợ làm phiền hả/);
    expect(f.text).toMatch(/không phiền đâu/); // chọn đúng ý có liên quan tới điều vừa nói
    const g = heartContinue("tụi a mới quen", "love", false, 5, f.text, "", { ...ctxOf("tụi a mới quen"), ...base, recent: [f.text, d.text] });
    expect(g.theme).toBe("love"); // không nhảy sang bài "đang tìm hiểu hả, dễ thương ghê"
    expect(g.text).toMatch(/^Tụi anh mới quen hả/);
  });
  it("người dùng chỉ muốn được nghe → nhắc lại, không khuyên, không hỏi", () => {
    for (const s of ["a bị điểm kém", "bố mẹ la", "a cố rồi mà"]) {
      const r = heartContinue(s, "open", true, 3, "Okie, Lomi chỉ nghe thôi 🫶", "", ctxOf(s));
      expect(r.text, s).not.toMatch(/\?|gợi ý|thử |nên /);
      expect(r.listen).toBe(true);
    }
  });
  it("“ừ”, “thôi kệ”, “vậy thôi” sau khi Lomi không hỏi gì → đáp nhẹ để khép lại", () => {
    for (const s of ["ừ", "thôi kệ", "vậy thôi", "bỏ đi"]) {
      const r = heartContinue(s, "sad", false, 4, "Lomi hiểu rồi.", "", ctxOf(s));
      expect(r.text, s).toMatch(/^Dạ 🌿/);
      expect(r.text, s).not.toMatch(/\?/);
    }
  });
  it("mấy câu “đang nghe” chung chung chỉ là phương án cuối và không bao giờ dùng hai lượt liền", () => {
    // Không có mẩu nhắc lại (lớp gọi không đọc được câu) → vẫn không lặp vòng 4 câu cũ.
    let lastText = "Kể Lomi nghe đi.";
    const said: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = heartContinue("thì cũng tại nhiều thứ linh tinh lắm nói ra không hết được đâu ấy mà", "sad", false, i + 2, lastText, "", { recent: [...said].reverse() });
      if (said.length) expect(LOOP.test(r.text) && LOOP.test(said[said.length - 1]), r.text).toBe(false);
      said.push(r.text);
      lastText = r.text;
    }
    expect(said.filter((x) => LOOP.test(x)).length).toBeLessThanOrEqual(3);
  });
  it("chuyện xui đời thường: mẩu kể tiếp được nhắc lại đúng tông", () => {
    const r = heartFollow("2 tiếng", "ev:traffic", false, 2, "Ui, mà kẹt xe thì nản ghê 😩 Có trễ hẹn gì không?", "", ctxOf("2 tiếng"));
    expect(r.text).toMatch(/^2 tiếng hả 😩/);
    expect(r.theme).toBe("ev:traffic");
    const n = heartFollow("sếp không nói gì", "ev:traffic", false, 4, "Trễ thì nhắn báo trước nha.", "", ctxOf("sếp không nói gì"));
    expect(n.text).toMatch(/^Sếp không nói gì hả\./); // chuyện KHÔNG xảy ra: chỉ nhắc lại, không "nghe mà oải"
  });
});
