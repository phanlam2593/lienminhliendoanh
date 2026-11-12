// 12/11 — Kir: (1) bỏ tên nguồn (Long Châu, NHS, MedlinePlus…) khỏi câu trả lời, ai hỏi nguồn mới nói; bổ sung phần sức khoẻ cho hoàn thiện;
//   (2) tối ưu phần tâm sự. Các câu dưới đây lấy từ bộ 1.000 câu kiểm toán của Lovable (hoặc biến thể / ca đối chứng của chúng).
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { plainPub, tidyCited } from "@/lib/lomiCite";

const T = 120000;
const NAMES = /(Long Châu|NHS|MedlinePlus|Mayo|NIDDK|NIMH|CDC|\bWHO\b|FDA|[Tt]heo nguồn)/u;

describe("12/11 — không đọc tên nguồn trong câu trả lời", () => {
  it("gỡ tên ở mọi dạng: đầu ý, giữa câu, 'xếp vào nhóm', 'tra cứu dược chất', 'theo nguồn', hai nguồn nói khác nhau", () => {
    expect(plainPub("**Sỏi niệu quản** — Nhà thuốc Long Châu xếp vào nhóm bệnh: thận - tiết niệu.")).toBe("**Sỏi niệu quản** — thuộc nhóm bệnh: thận - tiết niệu.");
    expect(plainPub("Theo tra cứu dược chất Long Châu, Nepafenac là: thuốc nhỏ mắt.")).toBe("Nepafenac là: thuốc nhỏ mắt.");
    expect(plainPub("💊 **Về thuốc** (theo nguồn): giảm đau bằng paracetamol.")).toBe("💊 **Về thuốc**: giảm đau bằng paracetamol.");
    expect(plainPub("• Cho nằm xuống; medlinePlus nói kê chân cao khoảng 30 cm.")).not.toMatch(NAMES);
    expect(plainPub("• Các nguồn nêu khác nhau: Mayo Clinic nói khoảng 10 phút, MedlinePlus nói ít nhất 5 đến 30 phút.")).toBe("• Các nguồn nêu khác nhau: có nguồn nói khoảng 10 phút, nguồn khác nói ít nhất 5 đến 30 phút.");
    // lời đáp cho câu "nguồn đâu?" thì giữ nguyên tên trang
    const ans = "Mấy điều Lomi nói về **paracetamol** lấy từ các trang sau (Lomi đối chiếu ngày 09/10/2026):\n\n• NHS (Anh) — “Paracetamol for adults”";
    expect(tidyCited(ans).text).toBe(ans);
  });
  it("qua khung chat: bài bệnh, bài tóm tắt, thuốc không nêu tên nguồn; hỏi 'nguồn đâu' thì có tên và đường dẫn", async () => {
    for (const q of ["say nắng có dấu hiệu gì", "bị bỏng nhẹ làm sao", "sỏi niệu quản là gì", "nepafenac là thuốc gì", "lỡ uống 2 viên panadol"])
      expect((await last([q])).content, q).not.toMatch(NAMES);
    expect((await last(["sỏi niệu quản là gì"])).content).not.toMatch(/nguồn bên dưới|nguồn có nhắc tới/);
    const src = (await last(["sỏi niệu quản là gì", "nguồn ở đâu vậy"])).content;
    expect(src).toMatch(/Long Châu/);
    expect(src).toMatch(/https:\/\//);
    expect((await last(["lỡ uống 2 viên panadol", "nguồn đâu"])).content).toMatch(/NHS/);
  }, T);
});

describe("12/11 — sức khoẻ: câu nêu đúng bệnh Lomi có bài thì đưa bài, không 'chưa có kiến thức'", () => {
  it("bệnh có bài mà câu kể kèm hỏi kiểu đời thường", async () => {
    const cases: [string, string][] = [
      ["toi bi men gan cao, bac si thuong can lam them xet nghiem gi?", "men-gan-cao"],
      ["Kết quả siêu âm ghi lá gan của tôi nhiễm mỡ, ăn uống cần lưu ý gì?", "gan-nhiem-mo"],
      ["nhổ răng khôn trc đó 2 hôm r mà má vẫn sưng, bt ko ạ", "nho-rang-khon"],
      ["ông e lãng tai dần, cứ tưởng ngta nói nhỏ, nên khám ở đâu z", "nghe-kem"],
      ["Tôi hay nóng rát sau xương ức khi nằm sau bữa tối, có nên đi khám tiêu hóa không?", "trao-nguoc-da-day-thuc-quan"],
      ["đầu gối tui xưng sau khi chạy bộ, chườm sao cho đúng", "dau-goi"],
      ["tui đau dạ dầy từ tối qua, ăn vô là cồn cào", "viem-da-day"],
      ["em bị chầy da ở chân, rửa vết thương thế nào", "chay-mau"],
      ["Ông tôi không phải không nghe được, ông nghe nhỏ thôi, có nên đo thính lực?", "nghe-kem"],
    ];
    for (const [q, id] of cases) {
      const m = await last([q]);
      expect(m.med?.id, q).toBe(id);
      expect(m.content, q).not.toMatch(/chưa có kiến thức đã kiểm chứng|Dạy Lomi/);
    }
  }, T);
  it("va đập đầu kèm nôn / buồn ngủ → cảnh báo cấp cứu (kể cả câu dài, kể lại lời của trẻ); va nhẹ thì chỉ đưa bài", async () => {
    const a = (await last(["Con trai mình vừa đá bóng về, cháu bảo va đầu vào cột rồi nôn hai lần và buồn ngủ nhiều, tuy bên ngoài chỉ sưng nhẹ nhưng mình vẫn lo"])).content;
    expect(a).toMatch(/115/);
    expect(a).toMatch(/cấp cứu/);
    expect(a).not.toMatch(/Lomi ở đây với bạn nè/);
    expect((await last(["bé bị va đầu vào bàn, giờ vẫn chơi bình thường"])).content).not.toMatch(/Bị va đập đầu mà \*\*nôn/);
  }, T);
  it("lỗi gõ ở chữ sức khoẻ được sửa cả ở bước đối chiếu dấu", async () => {
    expect((await last(["TÔi bị nỗi mẫn đỏ sau khi uống thuốc mới"])).content).toMatch(/phản ứng với thuốc/);
    expect((await last(["bé nhà tôi ói 2 lần ròi, vẩn uống được nước"])).content).toMatch(/nôn/);
  }, T);
});

describe("12/11 — tâm sự", () => {
  it("câu đầu tiên không bị coi là người dùng chỉnh Lomi; hỏi thẳng Lomi thì vẫn xin lỗi", async () => {
    for (const q of ["t ko buồn vì độc thân nha, chỉ ngại họ hàng hỏi hoài chuyện ck con", "Mẹ hay la nhưng mình biết mẹ lo, làm sao nói để mẹ hiểu mình cũng cần được tôn trọng?"]) {
      const m = await last([q]);
      expect(m.content, q).not.toMatch(/chắc Lomi hiểu chưa đúng ý/);
      expect(m.heart, q).toBeTruthy();
    }
    expect((await last(["t ko buồn vì độc thân nha, chỉ ngại họ hàng hỏi hoài chuyện ck con"])).heart).toBe("marrypressure");
    expect((await last(["Mẹ hay la nhưng mình biết mẹ lo, làm sao nói để mẹ hiểu mình cũng cần được tôn trọng?"])).heart).toBe("beheard");
  }, T);
  it("nhắc chuyện nhắn tin với người khác / 'thay đổi' không phải nhờ Lomi nhắn hộ", async () => {
    expect((await last(["em khoong muốn nhắn cho anh ấy nữa mà cứ nhớ"])).content).not.toMatch(/không tự nhắn tin thay/);
    const r = await chat(["Người yêu cũ của em vừa nhắn muốn quay lại.", "Người ấy bảo đã thay đổi, em có nên tin?"]);
    expect(r.find((m) => m.role === "assistant")!.content).not.toMatch(/😄 Nghe được đó/u);
    expect(r.at(-1)!.content).not.toMatch(/không tự nhắn tin thay/);
    expect((await last(["nhắn giúp mình cho mẹ là tối nay về trễ"])).content).toMatch(/không tự nhắn tin thay/); // nhờ thật thì vẫn nói rõ
  }, T);
  it("chối bói / người khác khuyên đi bói → không trải bài; vẫn rút bài khi xin", async () => {
    expect((await last(["chị k cần bói đâu, chỉ muốn kể chuyện vk ck đang lạnh nhạt thôi"])).tarot).toBeUndefined();
    expect((await last(["Bạn thân khuyên mình đi bói để quên người cũ, nhưng mình muốn lời khuyên thực tế để ngừng kiểm tra trang cá nhân của họ."])).tarot).toBeUndefined();
    const t = await last(["Đừng bói sức khỏe, rút bài giúp mình xem công việc tháng tới thôi."]);
    expect(t.content).not.toMatch(/không chẩn đoán được bệnh/);
    expect(!!(t.tarot || t.tarotAwait || t.tarotRef)).toBe(true);
    expect(!!(await last(["Rút giúp mình ba lá xem công việc tháng tới nhé."])).tarot).toBe(true);
  }, T);
  it("chủ đề mới / mở rộng: làm lành, an ủi người khác, muốn được hiểu, hướng nội, bị đá khỏi nhóm, nhớ người đã mất lâu", async () => {
    const cases: [string[], string][] = [
      [["em chẳg biết phải làm lành với bố thế nào"], "makeup"],
      [["em xin lổi rồi mà bạn vẫn giận, có nên cho bạn thời gian ko"], "makeup"],
      [["bạn thân t bảo nó cô đơn dù quen nhìu ng, t nên an ủi sao z"], "comfortother"],
      [["ba e nghỉ hưu r cứ bảo mình vô dụng, e động viên ba ntn"], "comfortother"],
      [["Đâu có giận mẹ, mình buồn vì mẹ chẳng chịu nghe mình nói."], "beheard"],
      [["Không phải cứ ở một mình là cô đơn, mình thích yên tĩnh nhưng bị người nhà chê khó gần."], "introvert"],
      [["Hôm qua mình bị đá khỏi nhóm bạn vì một hiểu lầm, giờ thấy cô độc quá."], "friends"],
      [["bà ngoại mất lâu r mà hnay nghe bài cũ e lại nhớ bà ghê"], "grief"],
      [["tui với mẹ lại cải nhau, làm sao nói chuyện dịu hơn"], "parentsclash"],
    ];
    for (const [turns, th] of cases) {
      const m = await last(turns);
      expect(m.heart, turns.join(" | ")).toBe(th);
      expect(m.content, turns.join(" | ")).not.toMatch(/Dạy Lomi|🩺|Lomi nghe nè/u);
    }
    // ba nghỉ hưu tự thấy vô dụng là lời của BA, không bật lời hỏi thăm khủng hoảng cho người kể
    expect((await last(["ba e nghỉ hưu r cứ bảo mình vô dụng, e động viên ba ntn"])).content).not.toMatch(/Nghe bạn nói “/);
    // "tụi mình mới làm hoà" là chuyện đã xong — xin gợi ý quán thì vẫn tìm quán
    expect((await last(["Tụi mình mới làm hòa, muốn đi ăn tối lãng mạn ở Đà Nẵng, gợi ý quán giúp nhé."])).heart).toBeUndefined();
    // "rút giúp mình ba lá" không phải an ủi "ba"
    expect((await last(["Rút giúp mình ba lá xem công việc tháng tới nhé."])).heart).toBeUndefined();
  }, T);
  it("tin dài MỘT chuyện không bị tách thành 'dồn tới mấy chuyện'; chuyện chia tay không ra 'chưa hiểu'", async () => {
    for (const q of [
      "Vì vừa chia tay nên mình cứ mở lại tin nhắn cũ mỗi tối, sáng vẫn đi làm bình thường nhưng đầu óc rất mệt, có cách nào giúp mình dừng lại không?",
      "Đám cưới bạn thân rất vui, mình cũng thật lòng chúc mừng, nhưng về nhà lại buồn vì thấy mình chậm hơn mọi người trong chuyện tình cảm, mình nên nghĩ sao cho nhẹ lòng hơn?",
    ]) {
      const m = await last([q]);
      expect(m.content, q).not.toMatch(/dồn tới mấy chuyện|chưa chắc hiểu đúng ý/);
      expect(m.heart, q).toBeTruthy();
    }
  }, T);
  it("đang tâm sự mà hỏi 'còn cách nào nữa' → thêm lời khuyên cho đúng chuyện, không mở menu mẹo", async () => {
    const r = await chat(["Em ngại từ chối khi bạn vay tiền liên tục.", "còn cách nào nữa, câu đó hơi cứng"]);
    expect(r.find((m) => m.role === "assistant")!.heart).toBe("decline");
    expect(r.at(-1)!.content).not.toMatch(/Lomi có mẹo ở mấy mảng này/);
    expect(r.at(-1)!.heart).toBeTruthy();
  }, T);
  it("chuyện vui → mừng cùng; 'chỉ muốn tâm sự' → nghe; kể chuyện tự nấu không bị tìm quán", async () => {
    expect((await last(["Ba vừa khen mình gan hơn vì dám phát biểu trước lớp, mình thấy tự hào ghê."])).content).toMatch(/vui lây|mừng cho bạn/);
    const c = await last(["Tìm giúp mình quán cà phê yên tĩnh.", "thôi không cần tìm quán nữa, chỉ muốn tâm sự"]);
    expect(c.places?.length ?? 0).toBe(0);
    expect(c.content).toMatch(/nghe/);
    const k = await last(["Mà thôi, tui chỉ muốn kể là hôm nay tự nấu được bữa cơm đầu tiên, vui ghê!"]);
    expect(k.places?.length ?? 0).toBe(0);
    expect(k.content).not.toMatch(/Đi ăn \*\*Cơm\*\*/);
  }, T);
});
