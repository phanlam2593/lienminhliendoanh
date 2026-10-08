// KHUNG CÂU (09/10) — test cấu trúc câu của lib/lomiParse: câu được đọc thành chủ ngữ / phủ định / thời gian / loại câu / vị ngữ,
// không phải khớp với câu mẫu. Phần cuối sinh câu theo TỔ HỢP (hàng trăm câu chưa từng được viết sẵn ở đâu trong code).
import { describe, expect, it } from "vitest";
import { YOU_MARK, parseVi, type Frame } from "@/lib/lomiParse";

/** Giờ cố định (15h) để "tối nay / sáng nay" không phụ thuộc đồng hồ; người dùng xưng anh như Kir. */
const P = (s: string, o: Parameters<typeof parseVi>[1] = {}): Frame => parseVi(s, { hour: 15, addr: "anh", ...o });
const roles = (f: Frame) => f.toks.map((t) => `${t.t}/${t.r}`).join(" ");

describe("5 câu ví dụ trong yêu cầu", () => {
  it("“Chào e bữa tối nhé” → GREETING + PERSON + TIME + POLITENESS", () => {
    const f = P("Chào e bữa tối nhé");
    expect(f.act).toBe("greet");
    expect(f.time?.part).toBe("tối");
    expect(f.tags).toEqual(expect.arrayContaining(["GREETING", "PERSON", "TIME", "POLITENESS"]));
    expect(f.polite).toBe(true);
    expect(f.conf).toBeGreaterThan(0.9);
    expect(f.raw).toBe("Chào e bữa tối nhé"); // câu gốc giữ nguyên
  });
  it("“A đang thèm pizza quá” → trạng thái của người nói + món + mức độ", () => {
    const f = P("A đang thèm pizza quá");
    expect(f.act).toBe("statement");
    expect(f.subject).toBe("self");
    expect(f.pred).toMatchObject({ kind: "desire", head: "thèm", obj: "pizza", ongoing: true });
    expect(f.degree).toBe("high");
    expect(f.tags).toEqual(expect.arrayContaining(["SUBJECT", "VERB", "OBJECT", "DEGREE"]));
  });
  it("“Tối nay đi cf không?” → rủ + thời gian + cà phê", () => {
    const f = P("Tối nay đi cf không?");
    expect(f.act).toBe("invite");
    expect(f.time).toMatchObject({ rel: "future", label: "tối nay" });
    expect(f.pred?.obj).toBe("cà phê"); // "cf" đã được hiểu là cà phê, câu gốc vẫn là "cf"
    expect(f.raw).toContain("cf");
  });
  it("“Cuối tuần không biết làm gì” → chưa biết làm gì lúc rảnh, KHÔNG phải vấn đề tâm lý", () => {
    const f = P("Cuối tuần không biết làm gì");
    expect(f.act).toBe("statement"); // "gì" sau phủ định là phiếm chỉ, không phải câu hỏi
    expect(f.neg).toBe(true);
    expect(f.time?.label).toBe("cuối tuần");
    expect(f.pred).toMatchObject({ kind: "cognition", head: "biết", obj: "làm gì" });
    expect(f.tags).not.toContain("EMOTION");
  });
  it("“Còn cái đó thì sao?” → câu hỏi nối, không có vị ngữ riêng (ngữ cảnh mới biết “cái đó” là gì)", () => {
    const f = P("Còn cái đó thì sao?");
    expect(f.act).toBe("question");
    expect(f.pred).toBeUndefined();
    expect(f.conf).toBeLessThan(0.7);
  });
});

describe("một từ — nhiều vai tuỳ vị trí", () => {
  it("“không”: phủ định giữa câu, từ hỏi cuối câu", () => {
    expect(roles(P("a không đói"))).toContain("không/NEG");
    expect(roles(P("e có mệt không"))).toContain("không/QPART");
    expect(roles(P("tối nay đi ăn lẩu không e"))).toContain("không/QPART"); // "e" gọi ở cuối không che mất
  });
  it("“mới”: vừa xong / mới tinh / tới lúc đó mới", () => {
    expect(roles(P("a mới mua cái xe mới"))).toBe("a/SELF mới/ASPECT mua/VERB cái/CLS xe/NOUN mới/ADJ");
    expect(roles(P("mai mới sửa được"))).toContain("mới/FILL");
  });
  it("“đi”: đi lại / lời giục cuối câu", () => {
    expect(roles(P("mai a đi làm"))).not.toContain("đi/PART");
    expect(roles(P("chúc a ngủ ngon đi"))).toContain("đi/PART");
  });
  it("“gì”: hỏi / phiếm chỉ sau phủ định; “gì đó” cuối câu hỏi người nghe là hỏi", () => {
    expect(P("e thích ăn gì").ask).toBe("what");
    expect(P("sáng giờ a chưa ăn gì").act).toBe("statement");
    expect(P("e đang làm gì đó").ask).toBe("what");
    expect(P("a thèm ăn gì đó cay cay").act).toBe("statement");
  });
  it("“đâu”: hỏi nơi chốn / nhấn mạnh phủ định", () => {
    expect(P("quán đó ở đâu").ask).toBe("where");
    const f = P("a không buồn đâu");
    expect(f.act).toBe("statement");
    expect(f.neg).toBe(true);
  });
  it("“e / em”: Lomi hay người nói", () => {
    expect(P("e ăn tối chưa", { addr: null }).subject).toBe("you"); // câu hỏi mở đầu bằng e = hỏi Lomi
    expect(P("em đang buồn ngủ", { addr: null }).subject).toBe("self"); // câu kể = người nói xưng em
    expect(P("em đang buồn ngủ", { addr: "em" }).subject).toBe("self");
    expect(P("chị Hoa mới nhắn em", { addr: null }).em).toBe("self"); // chủ ngữ là người khác → em là người nói
    expect(P("chúc e ngủ ngon nha", { addr: null }).em).toBe("you"); // người được chúc
  });
  it("“bạn”: gọi Lomi hay người bạn", () => {
    expect(P("bạn rảnh không", { addr: null }).subject).toBe("you");
    expect(P("bạn a mới chia tay").subject).toBe("third");
    expect(P("a đang chờ bạn").pred?.obj).toBe("bạn bè");
  });
  it("“con”: loại từ (con mèo) hay đứa con", () => {
    expect(P("con mèo nhà a dễ thương lắm").subject).toBe("pet");
    expect(P("con a giỏi lắm").subject).toBe("third");
    expect(P("con Mực nhà a dễ thương lắm")).toMatchObject({ subject: "pet", subjectText: `con Mực nhà ${YOU_MARK}` }); // con vật có tên riêng
  });
  it("tên riêng sau từ xưng hô là người thứ ba, không phải người nói", () => {
    expect(P("chị Hoa mới nhắn em", { addr: null }).subject).toBe("third");
    expect(P("anh Minh đang ở Đà Lạt").subject).toBe("third");
  });
});

describe("ưu tiên CỤM trước từ đơn", () => {
  it("cụm thời gian", () => {
    expect(roles(P("tối hôm qua a đi nhậu"))).toMatch(/^tối hôm qua\/TIME/);
    expect(roles(P("cuối tuần này a về quê"))).toMatch(/^cuối tuần này\/TIME/);
    expect(roles(P("lát nữa a đi đón con"))).toMatch(/^lát nữa\/TIME/);
  });
  it("cụm trạng thái / việc làm", () => {
    expect(P("a hơi buồn ngủ").pred).toMatchObject({ kind: "state", head: "buồn ngủ" }); // không phải "buồn"
    expect(P("chiều nay a đi đá bóng").pred).toMatchObject({ kind: "activity", head: "đi đá bóng", cls: "leisure" });
    expect(P("điện thoại a hết pin").pred).toMatchObject({ kind: "event", head: "hết pin" });
    expect(P("tuần sau a nghỉ phép").pred?.head).toBe("nghỉ phép");
  });
});

describe("chủ ngữ, phủ định, thời gian", () => {
  it("chủ ngữ: người nói / Lomi / người thân / con vật / đồ vật / nơi chốn / thời tiết", () => {
    expect(P("hôm nay a mệt ghê").subject).toBe("self");
    expect(P("lomi giỏi quá").subject).toBe("you");
    expect(P("mẹ a nấu ăn ngon lắm")).toMatchObject({ subject: "third", subjectText: `mẹ ${YOU_MARK}` });
    expect(P("con chó nhà a dễ thương cực")).toMatchObject({ subject: "pet", subjectText: `con chó nhà ${YOU_MARK}` });
    expect(P("xe a hư rồi")).toMatchObject({ subject: "thing", subjectText: `xe ${YOU_MARK}` });
    expect(P("quán đó đẹp ghê")).toMatchObject({ subject: "place", subjectText: "quán đó" });
    expect(P("hôm nay trời không mưa").subject).toBe("weather");
    expect(P("a với vợ mới cãi nhau").subject).toBe("self"); // chủ ngữ ghép
  });
  it("phủ định + “lắm” = chỉ hơi hơi; nhớ từ phủ định người dùng nói", () => {
    expect(P("a không đói lắm")).toMatchObject({ neg: true, degree: "low", negWord: "không" });
    expect(P("a chưa đói")).toMatchObject({ neg: true, negWord: "chưa" });
    expect(P("a đâu có buồn").neg).toBe(true);
  });
  it("thì: mốc rõ, từ chỉ thì, và “tối nay / sáng nay” đọc theo đồng hồ", () => {
    expect(P("tối qua a ngủ ngon lắm").time).toMatchObject({ rel: "past", explicit: true });
    expect(P("mai a đi Đà Nẵng chơi").time).toMatchObject({ rel: "future", explicit: true });
    expect(P("a sắp đi du lịch").time?.rel).toBe("future");
    expect(P("a đang nấu cơm").pred?.ongoing).toBe(true);
    expect(P("a mới cắt tóc").pred?.recent).toBe(true);
    expect(P("a ăn rồi").pred?.done).toBe(true);
    expect(P("sáng nay a dậy trễ", { hour: 15 }).time?.rel).toBe("past");
    expect(P("tối nay a ở nhà thôi", { hour: 15 }).time?.rel).toBe("future");
    expect(P("tối nay a ở nhà thôi", { hour: 20 }).time?.rel).toBe("now");
    expect(P("chiều a đi đá bóng", { hour: 9 }).time?.rel).toBe("future"); // "chiều" trần = chiều nay
  });
  it("nhận xét cuối câu cho biết chuyện vui hay không", () => {
    expect(P("hôm qua a đi câu cá vui lắm").pred).toMatchObject({ val: 1, qual: "vui", objCore: "" });
    expect(P("tối qua a đi nhậu về trễ").pred).toMatchObject({ val: -1, qual: "trễ" });
    expect(P("mẹ a nấu ăn ngon lắm").pred?.val).toBe(1);
  });
  it("với người / con vật, “mất” là qua đời; với đồ vật là thất lạc", () => {
    expect(P("con mèo nhà a mới mất").pred?.cls).toBe("death");
    expect(P("ví a mất rồi").pred?.cls).toBe("bad");
  });
});

describe("loại câu", () => {
  it("chào / chúc / cảm ơn / xin phép đi / xin thêm thời gian", () => {
    expect(P("tối rồi chào e nha").act).toBe("greet");
    expect(P("chúc e cuối tuần vui vẻ nhé")).toMatchObject({ act: "wish", wish: { good: "vui vẻ", to: "you" } });
    expect(P("cuối tuần vui vẻ nha e").act).toBe("wish"); // không có chữ "chúc"
    expect(P("e chúc a may mắn đi").wish).toMatchObject({ to: "self", good: "may mắn" });
    expect(P("a cảm ơn e nhiều nha").act).toBe("thanks");
    expect(P("thôi a đi làm đây")).toMatchObject({ act: "leave", leave: "go" });
    expect(P("tí a quay lại")).toMatchObject({ act: "leave", leave: "brb" });
    expect(P("để a nghĩ đã").act).toBe("hold");
  });
  it("chào xong nói tiếp (có hay không có dấu phẩy) → đọc phần sau, ghi nhớ là đã chào", () => {
    expect(P("chào e, a mới đi làm về")).toMatchObject({ act: "statement", greeted: true, subject: "self" });
    expect(P("chào e nha a đi ngủ đây")).toMatchObject({ act: "leave", greeted: true });
  });
  it("điều tốt đẹp ĐÃ QUA không phải lời chúc", () => {
    const f = P("tối qua a ngủ ngon lắm");
    expect(f.act).toBe("statement");
    expect(f.wish).toBeUndefined();
  });
  it("rủ: phải là việc đi / ăn uống / vui chơi — không phải mọi câu hỏi có-không", () => {
    for (const s of ["tối nay đi ăn lẩu không e", "mai đi cà phê nha", "cuối tuần đi Đà Lạt chơi không", "đi xem phim không e", "tụi mình đi ăn kem không"]) expect(P(s).act, s).toBe("invite");
    for (const s of ["ăn gan được không", "có nên quay lại không", "uống thuốc cảm có giúp hết bệnh không", "ăn pizza mỗi ngày được không", "thế còn ăn?", "làm rõ hơn", "ib mình nha", "ngủ không được hoài à"])
      expect(P(s).act, s).not.toBe("invite");
  });
  it("nhờ Lomi làm việc khác với rủ", () => {
    expect(P("bói cho a một lá đi").act).toBe("request");
    expect(P("tìm quán trà sữa giúp a").act).toBe("request");
  });
  it("hỏi thăm Lomi: lược chủ ngữ + trạng thái + có/không = hỏi người nghe", () => {
    expect(P("tối nay rảnh không e")).toMatchObject({ act: "question", subject: "you" });
    expect(P("hôm nay e thế nào")).toMatchObject({ act: "question", subject: "you", ask: "how" });
    // …nhưng câu hỏi kiến thức có chữ trạng thái thì không: "bệnh này có chia sẻ với người nhà được không"
    expect(P("bệnh này có chia sẻ với người nhà được không").subject).not.toBe("you");
  });
});

describe("độ chắc", () => {
  it("câu không đọc được cấu trúc → conf thấp (lớp đáp theo khung sẽ không đụng tới)", () => {
    for (const s of ["bitcoin hôm nay lên 100k", "thủ đô nước pháp là gì", "1 cộng 1 bằng mấy", "asdf qwer", "làm sao để nhận ưu đãi"]) expect(P(s).conf, s).toBeLessThan(0.7);
  });
  it("câu có 2 vế / lời thuật lại → đánh dấu multi", () => {
    expect(P("a mới đăng ký tài khoản mà chưa được duyệt").multi).toBe(true);
    expect(P("anh Minh nói với em là mai đi").multi).toBe(true);
  });
  it("gõ không dấu vẫn đọc được, nhưng kém chắc hơn", () => {
    const f = P("chao e bua toi nhe");
    expect(f).toMatchObject({ act: "greet", loose: true });
    expect(f.conf).toBeLessThan(P("chào e bữa tối nhé").conf);
    expect(P("hom qua a di cau ca vui lam")).toMatchObject({ subject: "self", time: { rel: "past" } });
    expect(P("a khong buon dau")).toMatchObject({ neg: true, subject: "self" });
  });
  it("từ lạ ở vị trí bổ ngữ / tên riêng là bình thường", () => {
    const f = P("mai a đi Tà Xùa săn mây");
    expect(f.conf).toBeGreaterThanOrEqual(0.75);
    expect(f.pred).toMatchObject({ kind: "motion", head: "đi" });
    expect(f.pred?.obj).toBe("Tà Xùa săn mây"); // giữ đúng chữ người dùng gõ
  });
});

// ── CÂU CHƯA TỪNG CÓ: sinh theo tổ hợp, không câu nào được viết sẵn trong code ──
const cross = <T,>(...lists: T[][]): T[][] => lists.reduce<T[][]>((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
const sent = (parts: string[]) => parts.filter(Boolean).join(" ");

describe("câu sinh theo tổ hợp", () => {
  it("320 lời chào: từ chào × người được chào × buổi / dịp × tiểu từ", () => {
    const all = cross(["chào", "hello", "xin chào", "hi"], ["e", "em", "lomi", ""], ["buổi sáng", "bữa trưa", "buổi chiều", "bữa tối", "cuối tuần", "đầu tuần", "thứ hai", "chủ nhật", "ngày mới", "tối thứ bảy"], ["nha", "nhé"]).map(sent);
    expect(all.length).toBe(320);
    for (const s of all) {
      const f = P(s);
      expect(f.act, s).toBe("greet");
      expect(f.time?.label, s).toBeTruthy();
    }
  });
  it("192 lời chúc: (chúc + người) × dịp × điều tốt lành", () => {
    const all = cross(["chúc e", "chúc em", "chúc lomi"], ["buổi sáng", "buổi tối", "cuối tuần", "tuần mới", "ngày mới", "một ngày", "thứ bảy", "tối nay"], ["vui vẻ", "tốt lành", "an lành", "bình an"], ["nha", ""]).map(sent);
    for (const s of all) expect(P(s), s).toMatchObject({ act: "wish", wish: { to: "you" } });
    // không có chữ "chúc": dịp + điều tốt lành + tiểu từ
    for (const s of cross(["buổi tối", "cuối tuần", "ngày mới"], ["vui vẻ", "an lành"], ["nha e", "nhé", "nha lomi"]).map(sent)) expect(P(s).act, s).toBe("wish");
  });
  it("480 câu phủ định trạng thái: người nói × từ phủ định × trạng thái × đuôi", () => {
    const all = cross(["a", "anh", "chị", "mình", "tui"], ["không", "chưa", "đâu có", "chẳng"], ["đói", "khát", "buồn", "mệt", "chán", "lo", "rảnh", "buồn ngủ"], ["", "lắm", "đâu"]).map(sent);
    expect(all.length).toBe(480);
    for (const s of all) {
      const f = P(s, { addr: null });
      expect(f, s).toMatchObject({ act: "statement", subject: "self", neg: true, pred: { kind: "state" } });
      expect(f.conf, s).toBeGreaterThanOrEqual(0.75);
    }
  });
  it("216 câu khen người / vật khác: chủ ngữ × tính từ × mức độ", () => {
    const all = cross(["con chó nhà a", "con mèo nhà chị", "mẹ a", "ba mình", "con gái tui", "bạn thân a", "cái xe này", "quán đó", "con Lu nhà a"], ["dễ thương", "đẹp", "giỏi", "ngoan", "xinh", "tốt"], ["lắm", "quá", "ghê", "cực"]).map(sent);
    for (const s of all) {
      const f = P(s, { addr: null });
      expect(["third", "pet", "thing", "place"], s).toContain(f.subject);
      expect(f.pred, s).toMatchObject({ kind: "quality", val: 1 });
      expect(f.subjectText, s).toBeTruthy();
    }
  });
  it("câu kể có mốc thời gian: 5 mốc đã qua × 4 mốc sắp tới × người nói × 9 việc", () => {
    const acts = ["đi câu cá", "đi nhậu", "xem phim", "đi làm", "nấu cơm", "đi Phú Quốc", "ăn phở", "đi siêu thị", "đi Mộc Châu chơi"];
    for (const s of cross(["hôm qua", "tối qua", "tuần trước", "hồi nãy", "sáng hôm qua"], ["a", "chị", "mình"], acts).map(sent)) expect(P(s, { addr: null }), s).toMatchObject({ act: "statement", subject: "self", time: { rel: "past", explicit: true } });
    for (const s of cross(["mai", "tối mai", "tuần sau", "mốt"], ["a", "chị", "mình"], acts).map(sent)) expect(P(s, { addr: null }), s).toMatchObject({ act: "statement", subject: "self", time: { rel: "future", explicit: true } });
  });
});
