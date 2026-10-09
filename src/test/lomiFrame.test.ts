// ĐÁP THEO KHUNG (09/10) — test lib/lomiFrame: câu nào Lomi đáp theo CẤU TRÚC, câu nào nhường cho lớp chuyên môn.
// Gọi thẳng frameTurn (không dựng khung chat) nên chạy được hàng nghìn câu sinh theo tổ hợp; chuỗi hội thoại thật nằm ở
// lomiConversation.test.tsx.
import { describe, expect, it } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { durationOf, frameTurn, healthClaim, patientOf, symptomClash, withAbout, type FrameFlow } from "@/lib/lomiFrame";
import { parseVi } from "@/lib/lomiParse";
import { senseCanon } from "@/lib/lomiSense";

const P = (s: string, addr: "anh" | "chị" | "em" | null = "anh") => parseVi(s, { hour: 15, addr });
/** Một lượt như trong AiAssistant.send(): q = câu đã chuẩn hoá, khung đọc từ câu gốc. */
const T = (s: string, flow: Partial<FrameFlow> = {}) => frameTurn(senseCanon(expandTeen(s)), P(s, "addr" in flow ? (flow.addr as "anh" | null) : "anh"), { mode: "full", addr: "anh", ...flow });
const cross = <X,>(...lists: X[][]): X[][] => lists.reduce<X[][]>((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
const sent = (parts: string[]) => parts.filter(Boolean).join(" ");

// Câu mẫu của lớp từ khoá mà trước đây bị đáp nhầm — không được xuất hiện ở các câu dưới đây.
const KEYWORD_LINES = /Bụng réo rồi|Đói thì ăn liền|đỏ mặt|vui cả ngày luôn á|Nghe (anh|bạn) buồn|Mơ đẹp, mai gặp lại|da khô|App đang trục trặc|Độc thân lâu|Thương (anh|bạn) ghê 🥺 Nghỉ ngơi nhiều/;

describe("câu Kir gặp: “Chào e bữa tối nhé”", () => {
  it("được hiểu là lời chào buổi tối", () => {
    const r = T("Chào e bữa tối nhé");
    expect(r?.intent).toBe("frame:greet");
    expect(r?.text).toMatch(/^Chào buổi tối nha 🌙/);
  });
  it("…và mọi biến thể cùng cấu trúc, kể cả gõ không dấu", () => {
    for (const s of ["chào e bữa trưa nha", "tối rồi chào e nha", "e ơi chào buổi trưa", "chào e cuối tuần nha", "chào e đầu tuần nha", "hello e tối thứ sáu vui vẻ nha", "chao e bua toi nhe"]) expect(T(s)?.intent, s).toBe("frame:greet");
    expect(T("chào e cuối tuần nha")?.text).toMatch(/Cuối tuần vui vẻ/);
    expect(T("hello e tối thứ sáu vui vẻ nha")?.text).toMatch(/chúc anh tối thứ sáu vui vẻ|chúc bạn tối thứ sáu vui vẻ/);
  });
});

describe("cấu trúc thắng từ khoá", () => {
  const cases: [string, RegExp, RegExp?][] = [
    // lời chúc ≠ kể mình vui
    ["chúc e cuối tuần vui vẻ nhé", /^frame:wish$/, /cuối tuần vui vẻ/],
    ["tối vui vẻ nhé e", /^frame:wish$/, /buổi tối vui vẻ/],
    ["buổi tối an lành nha e", /^frame:wish$/, /an lành/],
    ["chúc mừng sinh nhật e", /^frame:wish$/, /sinh nhật/],
    ["e chúc a may mắn đi", /^frame:wish_me$/, /Chúc bạn may mắn/], // ("bạn" trong câu mẫu được speak() đổi thành anh / chị lúc hiển thị)
    // phủ định
    ["a chưa đói", /^frame:neg_need$/, /^Chưa đói/],
    ["a không đói lắm", /^frame:neg_need$/, /^Không đói/],
    ["a không buồn đâu", /^frame:neg_feel$/, /Không buồn là tốt/],
    ["a đâu có buồn", /^frame:neg_feel$/],
    ["a không mệt lắm đâu", /^frame:neg_feel$/, /Không mệt lắm là mừng/],
    ["a không rảnh lắm", /^frame:neg_free$/, /Bận quá hả/],
    ["a không thèm pizza", /^frame:neg_desire$/, /Không thèm pizza/],
    ["a không muốn ăn phở", /^frame:neg_desire$/, /phở/],
    ["a không thích ăn cay lắm", /^frame:neg_desire$/, /không thích ăn cay/],
    ["a chưa ngủ", /^frame:neg_act$/, /^Chưa ngủ hả/],
    ["hôm nay a không đi làm", /^frame:neg_act$/, /^Hôm nay không đi làm/],
    ["hôm nay a không khoẻ", /^frame:neg_well$/, /không khoẻ/],
    // chủ ngữ là người / con vật / đồ vật khác
    ["con chó nhà a dễ thương cực", /^frame:third_pos$/, /^Con chó nhà anh dễ thương/],
    ["vợ a dễ thương lắm", /^frame:third_pos$/, /^Vợ anh dễ thương/],
    ["mẹ a nấu ăn ngon lắm", /^frame:third_pos$/, /^Mẹ anh nấu ăn ngon/],
    ["quán đó đẹp ghê", /^frame:third_pos$/, /^Quán đó đẹp/],
    ["xe a hư rồi", /^frame:third_neg$/, /^Xe anh hư/],
    ["máy lạnh hư rồi", /^frame:third_neg$/, /^Máy lạnh hư/],
    ["điện thoại a hết pin", /^frame:third_neg$/, /^Điện thoại anh hết pin/],
    ["mẹ a đang ốm", /^frame:third_ill$/, /^Mẹ anh ốm hả/],
    ["con mèo nhà a bị ốm", /^frame:third_ill$/, /thú y/],
    ["con mèo nhà a mới mất", /^frame:third_loss$/, /chia buồn/],
    ["bạn a mới chia tay", /^frame:third_neg$/, /^Người bạn của anh chia tay/],
    ["mẹ a mới lên chơi", /^frame:third_event$/, /^Mẹ anh mới lên chơi/],
    ["con a đói bụng", /^frame:third_need$/, /^Con anh đói bụng/],
    // chuyện đã qua / dự định
    ["tối qua a ngủ ngon lắm", /^frame:past$/, /^Tối qua ngủ ngon hả/],
    ["tối qua a đi nhậu về trễ", /^frame:past$/, /^Tối qua đi nhậu về trễ hả 😅/],
    ["hôm qua a đi câu cá vui lắm", /^frame:past$/, /^Hôm qua đi câu cá hả/],
    ["tuần trước a đi phú quốc", /^frame:past$/, /Phú Quốc/],
    ["a mới mua điện thoại mới", /^frame:past$/, /^Mới mua điện thoại hả/],
    ["a ăn rồi", /^frame:done$/, /^Ăn rồi hả/],
    ["mai a đi đà nẵng chơi", /^frame:plan$/, /^Mai đi Đà Nẵng chơi hả/],
    ["tuần sau a đi công tác", /^frame:plan$/, /💪/],
    ["sáng mai dậy sớm đi chạy bộ", /^frame:plan$/, /^Sáng mai dậy sớm đi chạy bộ/],
    ["lát nữa a đi đón con", /^frame:plan$/, /đi cẩn thận/],
    ["tháng sau a cưới", /^frame:plan$/, /Chúc mừng/],
    ["mai a đi phỏng vấn", /^frame:plan$/, /💪/],
    // đang ở đâu / đang làm gì — không phải nhờ tìm quán, không phải câu hỏi về app
    ["a đang ngồi ở quán cà phê", /^frame:location$/, /^Đang ngồi quán cà phê/],
    ["a đang ở quán nhậu với bạn", /^frame:location$/, /quán nhậu hả/],
    ["tối nay a ở nhà thôi", /^frame:location$/, /ở nhà/i],
    ["a đang chờ bạn", /^frame:doing$/, /^Đang chờ bạn bè hả/],
    ["a đang nấu cơm", /^frame:doing$/, /^Đang nấu cơm hả/],
    // hỏi thăm Lomi
    ["tối nay rảnh không e", /^frame:ask_lomi$/, /rảnh cho bạn nè 😄 Tối nay bạn/],
    ["e đang làm gì đó", /^frame:ask_lomi$/],
    ["e có buồn không", /^frame:ask_lomi$/, /robot/],
    ["e thích ăn gì", /^frame:ask_lomi$/, /pin/],
    ["hôm nay e thế nào", /^frame:ask_lomi$/],
    // nói với Lomi / chuyện lặt vặt
    ["a nhớ e quá", /^frame:to_lomi$/, /nhớ bạn|chờ bạn/],
    ["a đùa thôi", /^frame:joke$/],
    ["a quên mang ví", /^frame:mishap$/, /^Quên mang ví hả/],
    ["để a nghĩ đã", /^frame:hold$/, /cứ nghĩ đi/],
    ["a thích trà sữa hơn", /^frame:taste$/, /quán trà sữa/],
    ["Cuối tuần không biết làm gì", /^frame:undecided$/, /Cuối tuần chưa biết làm gì/],
    ["hôm nay trời không mưa", /^frame:weather$/, /Trời không mưa/],
    // các câu lấy từ 2 đợt thử "mù" (viết sau khi code xong, không dùng để chỉnh từng câu)
    ["a chẳng buồn ngủ tí nào", /^frame:neg_need$/, /^Không buồn ngủ/],
    ["chị chưa muốn ăn", /^frame:neg_need$/, /Chưa muốn ăn thì cứ từ từ/],
    ["anh không ghét cà phê", /^frame:neg_desire$/, /Không ghét cà phê là được/],
    ["vợ a nấu ăn dở lắm", /^frame:third_neg$/, /^Vợ anh nấu ăn dở hả 😅/],
    ["chồng chị lười lắm", /^frame:third_neg$/, /lười hả 😅/],
    ["ông a mới mất", /^frame:third_loss$/, /chia buồn/],
    ["con a mới biết đi", /^frame:third_event$/, /^Con anh mới biết đi hả/],
    ["thứ bảy này a đi sinh nhật bạn", /^frame:plan$/, /^Thứ bảy này đi sinh nhật bạn bè hả/],
    ["lát a ghé quán bạn chơi", /^frame:plan$/, /^Lát ghé quán bạn bè chơi hả/],
    ["tối hôm qua a thức khuya xem bóng đá", /^frame:past$/, /^Tối hôm qua thức khuya xem bóng đá hả/],
    ["chủ nhật này a rảnh", /^frame:free$/, /^Chủ nhật này rảnh hả/],
    ["a vừa họp xong", /^frame:past$/, /^Mới họp xong hả/],
    ["trời hôm nay âm u ghê", /^frame:weather$/, /^Trời âm u vậy hả/],
    ["e đang ở đâu vậy", /^frame:ask_lomi$/, /trong app/],
    ["e có thích mèo không", /^frame:ask_lomi$/, /thích mèo không/],
    ["e biết nấu ăn không", /^frame:ask_lomi$/, /chưa biết nấu ăn/],
    ["e ngủ ngon không", /^frame:ask_lomi$/, /không cần ngủ/],
    ["hôm nay e vui không", /^frame:ask_lomi$/, /vui rồi nè/],
    ["chào e buổi xế chiều nha", /^frame:greet$/, /^Chào buổi chiều/],
    ["lát a nhắn lại nha", /^frame:leave$/],
    ["a đi công chuyện tí", /^frame:leave$/],
    // xin phép đi
    ["thôi a đi làm đây", /^frame:leave$/, /đi làm đi nha/],
    ["a đi ăn cơm đã nha", /^frame:leave$/, /Ăn ngon miệng/],
    ["tí a quay lại", /^frame:leave$/],
    ["chào e nha a đi ngủ đây", /^frame:leave$/, /ngủ ngon/],
    // rủ
    ["tối nay đi ăn lẩu không e", /^frame:invite$/, /quán lẩu/],
    ["cuối tuần đi đà lạt chơi không", /^frame:invite$/, /chỉ ở trong app/],
  ];
  it.each(cases)("%s", (s, intent, text) => {
    const r = T(s);
    expect(r?.intent ?? "(không đáp theo khung)").toMatch(intent);
    if (text) expect(r!.text).toMatch(text);
    expect(r!.text).not.toMatch(KEYWORD_LINES);
    expect(r!.text).not.toContain("⟦"); // dấu chỉ người nói đã được đổi thành cách xưng hô
  });
  it("“muốn đi đâu đó chơi” → chuyển thành tìm chỗ chơi (không tự đáp)", () => {
    expect(T("cuối tuần này a muốn đi đâu đó chơi")).toMatchObject({ intent: "frame:leisure", redirect: "đi đâu chơi" });
  });
});

describe("nhường cho lớp chuyên môn (frameTurn trả null)", () => {
  const defer: [string, string][] = [
    // sức khoẻ
    ["a đang bị đau đầu", "triệu chứng"],
    ["a bị đau bụng từ tối qua", "triệu chứng + thời gian"],
    ["con a bị sốt", "triệu chứng của người khác — lớp sức khoẻ đáp, router đổi chủ ngữ"],
    ["e biết cách chữa bệnh gout k", "hỏi khả năng + bệnh"],
    ["tối qua a uống thuốc ngủ", "có từ y tế"],
    ["mai a đi mổ", "có từ y tế"],
    ["dạo này a hay mất ngủ", "mất ngủ"],
    // tâm sự
    ["hôm nay a mệt ghê", "trạng thái khẳng định"],
    ["a không vui lắm", "không vui = buồn"],
    ["a với vợ mới cãi nhau", "chuyện tình cảm"],
    ["sếp a khó tính lắm", "chuyện với sếp"],
    ["người yêu a không trả lời tin nhắn", "chuyện tình cảm"],
    ["a bị kẹt xe", "chuyện xui đã có lời hỏi han riêng"],
    ["nhà a mất điện", "chuyện xui đã có lời hỏi han riêng"],
    // món ăn / tìm quán
    ["a đang thèm pizza quá", "thèm món"],
    ["a đang tìm quán cà phê", "tìm quán"],
    ["a chưa biết tối nay ăn gì", "chọn món"],
    ["sáng giờ a chưa ăn gì", "chưa ăn"],
    ["tìm quán trà sữa giúp a", "nhờ tìm quán"],
    // app / kinh doanh / bói
    ["a mới đăng ký tài khoản mà chưa được duyệt", "hỏi về app"],
    ["a không vào được app", "lỗi app"],
    ["ưu đãi của a hết hạn rồi", "hỏi về app"],
    ["quán a vắng khách lắm", "kinh doanh"],
    ["bói cho a một lá đi", "bói"],
    // hỏi Lomi làm được gì / câu hỏi kiến thức
    ["e tư vấn sức khỏe a đc k", "hỏi khả năng"],
    ["e tư vấn tình cảm được không?", "hỏi khả năng"],
    ["Bạn muốn rút thêm một lá không?", "không phải hỏi sở thích của Lomi"],
    ["vợ a hay cằn nhằn", "chuyện vợ chồng"],
    ["a đang nhớ nhà", "nhớ nhà"],
    ["a mới được tăng lương", "tin vui đã có lời chúc riêng"],
    ["bệnh này có chia sẻ với người nhà được không", "hỏi kiến thức"],
    ["ăn gan được không", "hỏi kiến thức"],
    ["bitcoin hôm nay lên 100k", "không đọc được cấu trúc"],
    ["thủ đô nước pháp là gì", "câu hỏi kiến thức ngoài phạm vi"],
    // khen Lomi vẫn là khen Lomi
    ["lomi giỏi quá", "khen Lomi"],
    ["e dễ thương ghê", "khen Lomi"],
  ];
  it.each(defer)("%s  (%s)", (s) => {
    expect(T(s)).toBeNull();
  });
});

describe("theo bối cảnh", () => {
  it("đang ở mạch khác (sức khoẻ, hỏi app): chỉ nhận lời chào / chúc / cảm ơn + hỏi thăm Lomi", () => {
    expect(T("chào e buổi tối nha", { mode: "speech" })?.intent).toBe("frame:greet");
    expect(T("a cảm ơn e nhiều nha", { mode: "speech" })?.intent).toBe("frame:thanks");
    expect(T("e có mệt không", { mode: "speech" })?.intent).toBe("frame:ask_lomi");
    for (const s of ["mai a đi đà nẵng chơi", "a chưa đói", "con mèo nhà a dễ thương lắm", "a đang ở nhà"]) expect(T(s, { mode: "speech" }), s).toBeNull();
  });
  it("đang tâm sự: chỉ tin người thân / thú cưng ốm, mất và “không muốn nói nữa”", () => {
    expect(T("con mèo nhà a mới mất", { mode: "heart" })).toMatchObject({ intent: "frame:third_loss", keepHeart: true });
    expect(T("mẹ a đang ốm", { mode: "heart" })?.intent).toBe("frame:third_ill");
    expect(T("a không muốn nói nữa", { mode: "heart" })?.intent).toBe("frame:stop");
    for (const s of ["mẹ a khó tính lắm", "mai a đi làm", "a không buồn đâu", "chào e buổi tối nha", "con chó nhà a dễ thương lắm"]) expect(T(s, { mode: "heart" }), s).toBeNull();
  });
  it("tắt hẳn khi đang chọn khẩu vị / tư vấn kinh doanh", () => {
    expect(T("a không thích hải sản", { mode: "off" })).toBeNull();
  });
  it("xưng hô: nhắc lại đúng anh / chị / em / bạn, kể cả trước chữ “mới”, “học”…", () => {
    expect(T("mẹ a mới lên chơi", { addr: "anh" })?.text).toMatch(/^Mẹ anh mới lên chơi/);
    expect(T("mẹ chị mới lên chơi", { addr: "chị" })?.text).toMatch(/^Mẹ chị mới lên chơi/);
    expect(frameTurn("con mèo nhà mình dễ thương lắm", P("con mèo nhà mình dễ thương lắm", null), { mode: "full", addr: null })?.text).toMatch(/^Con mèo nhà bạn dễ thương/);
    // chữ "bạn" là người bạn thì giữ nguyên
    expect(T("hôm qua anh đi câu cá với mấy đứa bạn")?.text).toMatch(/với mấy đứa bạn hả/);
  });
  it("câu sau lược chủ ngữ vẫn nói về người vừa nhắc", () => {
    const about = T("mẹ a đang ốm")?.about;
    expect(about).toEqual({ text: "mẹ anh", kind: "third" });
    const f2 = withAbout(P("bị cảm thôi"), about);
    expect(f2.subject).toBe("third");
    const r = frameTurn("bị cảm thôi", f2, { mode: "full", addr: "anh" });
    expect(r?.text).toMatch(/Chỉ cảm thôi thì đỡ lo rồi.*mẹ anh mau khoẻ/);
    // đồ vật thì không mang sang ("xe a hư rồi" → "mai mới sửa được" là chuyện của người nói)
    expect(withAbout(P("mai mới sửa được"), T("xe a hư rồi")?.about).subject).toBe("none");
  });
});

describe("không trùng chữ khi bỏ dấu", () => {
  it("“đi đá bóng” không phải “da bong tróc”", () => {
    const s = "chiều nay a đi đá bóng";
    expect(symptomClash(s, P(s))).toBe(true);
    expect(healthClaim(s, P(s), { mode: "full" })).toBe(false);
    expect(T(s)?.intent).toMatch(/^frame:(plan|past)$/);
  });
  it("“đâu có” không phải “đau cơ”", () => {
    const s = "a đâu có buồn";
    expect(healthClaim(s, P(s), { mode: "full" })).toBe(false);
  });
  it("triệu chứng thật và câu hỏi kiến thức sức khoẻ vẫn là sức khoẻ", () => {
    for (const s of ["a bị da khô bong tróc", "a đang bị đau đầu", "rụng tóc", "đau đầu là do đâu?", "gout kiêng gì", "uống cà phê nhiều có sao không"]) {
      expect(healthClaim(s, P(s), { mode: "full" }), s).toBe(true);
      expect(symptomClash(s, P(s)), s).toBe(false);
    }
  });
  it("người bệnh là người khác → biết tên để lớp sức khoẻ không nói “Bạn đang bị…”", () => {
    expect(patientOf(P("con a bị sốt"), "anh")).toBe("Con anh");
    expect(patientOf(P("mẹ mình đau lưng", null), null)).toBe("Mẹ bạn");
    expect(patientOf(P("a bị sốt"), "anh")).toBeNull();
  });
  it("câu chỉ nói khoảng thời gian (trả lời “bị bao lâu rồi?”)", () => {
    for (const s of ["từ tối qua", "2 ngày rồi", "từ sáng tới giờ", "khoảng 1 tuần", "mới hôm qua", "3 hôm nay"]) expect(durationOf(P(s)), s).toBeTruthy();
    for (const s of ["hôm qua a đi làm", "tối nay rảnh không", "a đau từ hôm qua", "đau lắm", "không"]) expect(durationOf(P(s)), s).toBeNull();
  });
});

// ── CÂU CHƯA TỪNG CÓ: sinh theo tổ hợp ──
describe("câu sinh theo tổ hợp → đáp đúng theo cấu trúc", () => {
  it("320 lời chào → chào lại đúng buổi / dịp", () => {
    const parts: Record<string, RegExp> = { "buổi sáng": /buổi sáng/, "bữa trưa": /buổi trưa/, "buổi chiều": /buổi chiều/, "bữa tối": /buổi tối/, "cuối tuần": /Cuối tuần/, "đầu tuần": /Đầu tuần/, "thứ hai": /Thứ hai/, "chủ nhật": /Chủ nhật/, "ngày mới": /Ngày mới/, "tối thứ bảy": /buổi tối/ };
    for (const p of cross(["chào", "hello", "xin chào", "hi"], ["e", "em", "lomi", ""], Object.keys(parts), ["nha", "nhé"])) {
      const s = sent(p);
      const r = T(s);
      expect(r?.intent, s).toBe("frame:greet");
      expect(r!.text, s).toMatch(parts[p[2]]);
    }
  });
  it("480 câu phủ định trạng thái → không câu nào bị đáp như đang đói / buồn / mệt", () => {
    for (const p of cross(["a", "anh", "chị", "mình", "tui"], ["không", "chưa", "đâu có", "chẳng"], ["đói", "khát", "buồn", "mệt", "chán", "lo", "rảnh", "buồn ngủ"], ["", "lắm", "đâu"])) {
      const s = sent(p);
      const r = T(s);
      expect(r?.intent ?? "(null)", s).toMatch(/^frame:neg_(need|feel|free)$/);
      expect(r!.text, s).not.toMatch(KEYWORD_LINES);
      expect(r!.text, s).not.toMatch(/thương ghê|^Đói thì|Bụng réo|Ôm (bạn|anh)|Rảnh thì tám/i);
    }
  });
  it("216 câu khen người / vật khác → nhắc đúng chủ ngữ, Lomi không nhận vơ", () => {
    // (chưa biết cách xưng hô → người nói được nhắc lại là "bạn")
    const subj: Record<string, string> = { "con chó nhà a": "Con chó nhà bạn", "con mèo nhà chị": "Con mèo nhà bạn", "mẹ a": "Mẹ bạn", "ba mình": "Ba bạn", "con gái tui": "Con gái bạn", "bạn thân a": "Bạn thân bạn", "cái xe này": "Cái xe này", "quán đó": "Quán đó", "con Lu nhà a": "Con Lu nhà bạn" };
    for (const p of cross(Object.keys(subj), ["dễ thương", "đẹp", "giỏi", "ngoan", "xinh", "tốt"], ["lắm", "quá", "ghê", "cực"])) {
      const s = sent(p);
      const r = T(s, { addr: null });
      expect(r?.intent ?? "(null)", s).toBe("frame:third_pos");
      expect(r!.text, s).toMatch(new RegExp(`^${subj[p[0]]} `));
      expect(r!.text, s).toContain(p[1]);
      expect(r!.text, s).not.toMatch(KEYWORD_LINES);
    }
  });
  it("câu kể chuyện đã qua / dự định với nơi chốn, việc làm bất kỳ → nhắc lại đúng mốc thời gian và việc đó", () => {
    const acts = ["đi câu cá", "xem phim", "đi làm", "nấu cơm", "đi Phú Quốc", "đi siêu thị", "đi Mộc Châu chơi", "dọn nhà", "gặp khách", "đi Tà Xùa săn mây"];
    for (const p of cross(["hôm qua", "tối qua", "tuần trước", "hồi nãy"], ["a", "chị", "mình"], acts)) {
      const s = sent(p);
      const r = T(s);
      expect(r?.intent ?? "(null)", s).toMatch(/^frame:(past|echo)$/);
      expect(r!.text, s).toMatch(new RegExp(`^${p[0].charAt(0).toUpperCase()}${p[0].slice(1)} `));
      expect(r!.text.toLowerCase(), s).toContain(p[2].toLowerCase().split(" ").slice(0, 2).join(" "));
    }
    for (const p of cross(["mai", "tối mai", "tuần sau", "mốt"], ["a", "chị", "mình"], acts)) {
      const s = sent(p);
      const r = T(s);
      expect(r?.intent ?? "(null)", s).toMatch(/^frame:(plan|echo)$/);
      expect(r!.text.toLowerCase(), s).toContain(p[2].toLowerCase().split(" ").slice(0, 2).join(" "));
    }
  });
  it("động từ lạ (không có trong vốn từ) → nhắc lại + hỏi nối, không khen không chia buồn", () => {
    for (const s of ["a đang lướt ván", "mai a đi trekking Tà Năng", "hôm qua a quẩy tới sáng", "a mới nhuộm tóc"]) {
      const r = T(s);
      expect(r, s).not.toBeNull();
      expect(r!.text, s).not.toContain("⟦");
    }
    expect(T("a đang lướt ván")?.text).toMatch(/^Đang lướt ván hả\? Rồi sao nữa/);
    expect(T("hôm qua a quẩy tới sáng")?.text).not.toMatch(/😄|🥺/);
  });
});

// 11/10 — CÂU BỊ ĐỘNG về một NGƯỜI KHÁC: "X bị (ai đó) làm gì" là chuyện không may của X, không phải của người đang gõ.
// Đọc theo cấu trúc "chủ ngữ + bị + người gây ra + việc" nên việc xảy ra không cần có trong từ điển ("bỏ", "đá", "la").
describe("câu bị động: việc xảy đến với ai thì hỏi han đúng người đó", () => {
  it("108 câu: người thân × người gây ra × việc → nhắc lại 'bị <ai> <việc>' về đúng người thân đó", () => {
    const subj: Record<string, RegExp> = { "mẹ a": /^Mẹ anh /, "chị a": /^Chị anh /, "con a": /^Con anh /, "em gái a": /^Em gái anh /, "vợ a": /^Vợ anh /, "bạn a": /^Người bạn của anh / };
    const agents: Record<string, string> = { sếp: "sếp", chồng: "chồng", bạn: "bạn bè", "cô giáo": "cô giáo", "người ta": "người ta", "mẹ chồng": "mẹ chồng" };
    for (const [who, by, what] of cross(Object.keys(subj), Object.keys(agents), ["mắng", "chê", "la"])) {
      // (bỏ tổ hợp vô nghĩa: "vợ a bị chồng …" — chồng của vợ anh chính là người đang gõ)
      if (who === "vợ a" && by === "chồng") continue;
      const s = `${who} bị ${by} ${what}`;
      const r = T(s);
      expect(r?.intent, s).toBe("frame:third_neg");
      expect(r!.text, s).toMatch(subj[who]);
      expect(r!.text, s).toContain(`bị ${agents[by]} ${what} hả`);
      expect(r!.text, s).not.toMatch(/😄|😆|😅/);
    }
  });
  it("việc chưa có trong từ điển vẫn đọc được nhờ cấu trúc", () => {
    expect(T("chị a bị chồng bỏ")?.text).toMatch(/^Chị anh bị chồng bỏ hả 🥺/);
    expect(T("em gái a bị người yêu đá")?.text).toMatch(/^Em gái anh bị người yêu đá hả 🥺/);
    expect(T("bạn a bị lừa tiền")?.text).toMatch(/^Người bạn của anh bị lừa tiền hả 🥺/);
    expect(T("con a bị bạn bắt nạt")?.text).toMatch(/^Con anh bị bạn bè bắt nạt hả 🥺/); // "bạn" là bạn học — không bị đổi thành "anh"
  });
  it("người gây ra không bị đọc thành chủ ngữ / người bệnh", () => {
    const f = P("con a bị bạn đánh ở trường");
    expect(f.subject).toBe("third");
    expect(f.subjectText).toMatch(/^con /);
    expect(f.pred?.head).toBe("đánh");
    expect(f.toks.find((t) => t.t === "bạn")?.cls).toBe("agent");
  });
  it("chính người nói bị ai đó làm gì → nhắc lại đúng việc đó; chuyện ốm đau vẫn để lớp sức khoẻ", () => {
    expect(T("a bị vợ la")).toMatchObject({ intent: "frame:passive" });
    expect(T("a bị vợ la")!.text).toMatch(/^Bạn bị vợ la hả 🥺/);
    expect(T("a bị zona")).toBeNull();
    expect(T("a bị đau bụng")).toBeNull();
  });
  it("người thân ỐM vẫn là tin người thân ốm (không bị coi là 'bị ai đó làm gì')", () => {
    expect(T("mẹ a bị ốm")?.intent).toBe("frame:third_ill");
    expect(T("ba a bị ngã")?.intent).toBe("frame:third_ill");
  });
});
