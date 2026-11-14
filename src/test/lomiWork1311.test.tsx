// 13/11 — tiếp tục rà bộ 1.000 câu: an toàn (bị nhốt + doạ đánh trong câu dài), xin bói rõ ràng / nghĩa một lá có tên,
//   va chạm bỏ dấu ("ngay"≠"ngáy", "hỏi ăn"≠"Hội An", "bắt đầu từ đâu"≠"đầu tư", "bói"≠"bơi"), tìm quán ở tỉnh khác, kem bôi da, đánh cảm.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { findMedTopicId } from "@/lib/lomiMed";
import { detectPlace } from "@/lib/lomiPlaces";

const T = 120000;

describe("an toàn", () => {
  it("câu dài kể làm ăn rồi mới tới bị nhốt + doạ đánh → 113 ngay", async () => {
    const a = (await last(["Tôi mở tiệm vì muốn tự lập mà chồng giữ hết tiền, nhốt tôi trong nhà và dọa đánh nếu tôi ra ngoài, cứu tôi với."])).content;
    expect(a).toMatch(/113/);
    expect(a).not.toMatch(/tiền bạc/);
  }, T);
  it("đánh cảm / cạo gió không phải bạo lực", async () => {
    expect((await last(["Bà định đánh cảm bằng đồng xu cho tôi đang sốt, cách này có rủi ro gì?"])).content).not.toMatch(/bạo lực|113/);
  }, T);
});

describe("Tarot", () => {
  it("xin bói rõ ràng → trải bài, kể cả câu có chữ cà phê / người ấy / gõ sai 'bóc bài'", async () => {
    for (const t of [["Bói bài xem mình có nên mở quán cà phê năm nay không, mình đang phân vân lắm."], ["Lomi ơi bóc bài cho tuần này đc khôg"], ["Em muốn xem Tarot về người đang tìm hiểu", "Người ấy có nghiêm túc không, rút giúp em một trải nhé."], ["Mình đang bị táo bón.", "Bỏ chủ đề đó nhé, bói xem mình với người mới quen có hợp nhau không."]]) {
      const r = await chat(t, { seed: 7 });
      expect(r[r.length - 1].tarot, t[t.length - 1]).toBeTruthy();
    }
    expect((await last(["Tuy đã hẹn khám để kiểm tra cơn đau kéo dài nhưng mình vẫn muốn biết tương lai sức khỏe qua Tarot, bạn có thể bói bài xem giúp mình không?"])).content).not.toMatch(/không bơi/);
    // chối bói / kể người khác rủ đi xem bói / đi xem tarot XONG rồi hỏi quán → không trải bài
    for (const q of ["chị k cần bói đâu, chỉ muốn kể chuyện vk ck đang lạnh nhạt thôi", "Đi xem tarot xong đói bụng, ở gần Nhà thờ Đức Bà có món gì ăn nhẹ không?"]) expect((await last([q])).tarot, q).toBeFalsy();
  }, T);
  it("nghĩa một lá có tên, xuôi / ngược, hoặc 'nó' chỉ lá ở câu trước", async () => {
    expect((await last(["toi vua rut la Lovers nguoc cho tinh yeu, ban giai thich y nghia duoc khong?"])).content).toMatch(/The Lovers.*ngược/s);
    expect((await last(["Rút cho mình ba lá Tarot về tình cảm nhé", "Hay quá, rút toàn lá căng thẳng luôn; giải thích lại lá Tower trong trải tình cảm này giúp mình."])).content).toMatch(/The Tower/);
    expect((await last(["Tui đang học ý nghĩa lá The Hermit.", "Nó ngược thì giải thế nào?"])).content).toMatch(/The Hermit.*ngược/s);
    expect((await last(["hôm nay mặt trời đẹp quá, nghĩa là sao ta"])).content).not.toMatch(/The Sun/);
    expect((await last(["tui muốn xem một lá bài cho ngày hôm nay"])).tarot).toBeTruthy();
    expect((await last(["mình xem lá thư mẹ gửi"])).tarot).toBeFalsy();
  }, T);
});

describe("va chạm bỏ dấu & sức khoẻ", () => {
  it("'khám ngay không' không phải 'ngáy'; 'hỏi ăn' không phải Hội An", () => {
    expect(findMedTopicId("đau bụng dữ dội kèm nôn, cần đi khám ngay không?")).not.toBe("ngung-tho-khi-ngu");
    expect(findMedTopicId("chồng mình ngủ ngáy to quá")).toBe("ngung-tho-khi-ngu");
    expect(detectPlace("tôi đang hỏi ăn sao để tăng cân cho khỏe")?.label).not.toBe("Hội An");
    expect(detectPlace("đi Hội An ăn gì ngon")?.label).toBe("Hội An");
  });
  it("bỏ thuốc lá 'bắt đầu từ đâu' không phải đầu tư; kem bôi da không phải quán chè; đau bụng + nôn đi trước chuyện mở shop", async () => {
    expect((await last(["toi muon bo thuoc la nhung cu them hut, nen bat dau tu dau?"])).content).not.toMatch(/đầu tư/);
    expect((await last(["Mình dùng kem mới theo lời bạn giới thiệu vì da hơi khô, nhưng bôi xong thấy rát và nổi mẩn quanh má, giờ nên làm gì trước?"])).content).not.toMatch(/Chè|quán/);
    const a = (await last(["Từ ngày mở shop mình bỏ bữa, giờ đau bụng dữ dội kèm nôn, cần đi khám ngay không?"])).content;
    expect(a).toMatch(/115|cấp cứu|khám/);
    expect(a).not.toMatch(/khai trương/);
  }, T);
  it("người thân bị một bệnh có thẻ → thông tin ngay, không chỉ hỏi han", async () => {
    for (const q of ["Bé nhà chị bị táo bón ba ngày rồi.", "con tôi bị táo bón"]) expect((await last([q])).content, q).toMatch(/\*\*táo bón\*\*/);
  }, T);
  it("tìm chỗ ăn ở tỉnh khác", async () => {
    for (const q of ["Cuối tuần muốn dẫn cả nhà ăn chay ở Đà Nẵng.", "mk k ăn cay, trưa ở Đà Nẵng có món j dễ ăn"]) expect((await last([q])).content, q).toMatch(/Đà Nẵng/);
  }, T);
});

// 13/11 (Kir so với ChatGPT): bỏ dòng "📜 Thông tin tham khảo theo y học cổ truyền…" và "(chủ yếu trên động vật / phòng thí nghiệm)";
//   "bồ kết" là QUẢ bồ kết (tạo giác, hơi có độc) — gai bồ kết là vị riêng.
describe("tư vấn dược liệu — bồ kết", () => {
  it("quả bồ kết: tên khác, dùng ngoài / uống, cảnh báo độc, bà bầu; không còn 2 dòng Kir bỏ", async () => {
    const a = (await last(["trái bồ kết có tác dụng gì"])).content;
    expect(a).toMatch(/\*\*Bồ kết\*\*/);
    expect(a).toMatch(/tạo giác/);
    expect(a).toMatch(/Dùng ngoài/);
    expect(a).toMatch(/hơi có độc/);
    expect(a).toMatch(/Phụ nữ có thai không được dùng/);
    expect(a).not.toMatch(/Thông tin tham khảo theo y học cổ truyền|chủ yếu trên động vật|Long Châu|Tài liệu ghi/);
    expect(a).toMatch(/Liều thường dùng[\s\S]*0,5–1 g/);
    expect(a.match(/tham khảo/g)?.length, "chỉ nói 'tham khảo' một lần").toBe(1);
    expect((await last(["gai bồ kết chữa bệnh gì"])).content).toMatch(/Gai bồ kết[\s\S]*tạo giác thích/);
    const b = (await last(["bạch sâm có tác dụng gì"])).content;
    expect(b).toMatch(/Y học hiện đại có nghiên cứu liên quan tới/);
    expect(b).not.toMatch(/📜|chủ yếu trên động vật/);
  }, T);
});

// 13/11 (Kir: "thêm thực phẩm chức năng, món ăn dinh dưỡng, rau, lá, trái cây") — "X có tác dụng gì" cho món chưa có bài mẹo dân gian
//   ghép từ bảng chất (NHS) + bảng thành phần thực phẩm Việt Nam; CoQ10 (NCCIH); "đu đủ có tác dụng gì" không còn ra câu "dưới 18 tuổi".
describe("thực phẩm, rau, trái cây — tác dụng", () => {
  it("rau, trái cây ra bài lợi ích có số liệu; tên ghép không bị hiểu sai", async () => {
    const a = (await last(["đu đủ có tác dụng gì"])).content;
    expect(a).not.toMatch(/18 tuổi/);
    expect(a).toMatch(/Đu đủ[\s\S]*Vitamin A/);
    const b = (await last(["rau ngót có tác dụng gì"])).content;
    expect(b).toMatch(/Rau ngót[\s\S]*canxi/);
    expect(b.match(/tham khảo/g)?.length).toBe(1);
    expect((await last(["cam có tác dụng gì"])).content).toMatch(/Vitamin C/);
    expect((await last(["ăn rau muống có tốt không"])).content).toMatch(/Rau muống/);
    for (const q of ["việt quất có tác dụng gì", "đậu bắp có tác dụng gì"]) expect((await last([q])).content, q).not.toMatch(/Quất chín|Ngô bắp/);
    expect((await last(["dưa hấu bao nhiêu calo"])).content).toMatch(/📊 \*\*Dưa hấu/);
  }, T);
  it("thực phẩm chức năng: CoQ10, tinh bột nghệ", async () => {
    const a = (await last(["coenzyme q10 có tác dụng gì"])).content;
    expect(a).toMatch(/CoQ10[\s\S]*warfarin/);
    expect(a).not.toMatch(/B-coenzyme/);
    expect((await last(["tinh bột nghệ có tác dụng gì"])).content).toMatch(/\*\*Nghệ\*\*/);
  }, T);
});

describe("thực phẩm chức năng / thực phẩm hay hỏi — giấm táo, hạt chia, whey, collagen", () => {
  it("trả lời có liều tham khảo, lưu ý thuốc / bệnh thận, chỉ một dòng 'tham khảo', không nêu tên nguồn", async () => {
    const a = (await last(["uống giấm táo có giảm cân không"])).content;
    expect(a).toMatch(/Giấm táo[\s\S]*chưa chứng minh[\s\S]*2 thìa canh[\s\S]*insulin/);
    expect((await last(["hạt chia có tác dụng gì"])).content).toMatch(/Hạt chia[\s\S]*táo bón[\s\S]*2 thìa canh/);
    const w = (await last(["uống whey có tốt không"])).content;
    expect(w).toMatch(/15–30 g đạm[\s\S]*Bệnh thận/);
    const c = (await last(["collagen có tác dụng gì"])).content;
    expect(c).toMatch(/chưa có bằng chứng mạnh[\s\S]*kem chống nắng/);
    for (const x of [a, w, c]) {
      expect(x.match(/tham khảo/g)?.length).toBe(1);
      expect(x).not.toMatch(/Mayo|MedlinePlus|NCCIH/);
    }
  }, T);
});

// 14/11: lutein (NEI), tảo xoắn (NCCIH, Mayo, FDA), sữa ong chúa (chỉ có nguồn về dị ứng); "dừa / nước dừa có tốt không"
describe("thực phẩm chức năng đợt 2 + dừa", () => {
  it("lutein, tảo xoắn, sữa ong chúa, dừa", async () => {
    const l = (await last(["uống lutein có tốt cho mắt không"])).content;
    expect(l).toMatch(/AREDS2[\s\S]*Không phòng được[\s\S]*10 mg[\s\S]*beta-carotene/);
    expect((await last(["tảo xoắn có tác dụng gì"])).content).toMatch(/microcystin/);
    expect((await last(["sữa ong chúa có tác dụng gì"])).content).toMatch(/dị ứng phấn hoa/);
    expect((await last(["dừa có tác dụng gì"])).content).toMatch(/Cùi dừa/);
    expect((await last(["uống nước dừa có tốt không"])).content).toMatch(/Nước dừa/);
    expect(l).not.toMatch(/NEI|NIH|Mayo/);
  }, T);
});

// 14/11 (Kir: "mấy cái e k kím đc nguồn thì lấy trong kho kiến thức của e") — mục kn: kiến thức phổ thông, khi hỏi nguồn thì nói thật
describe("thực phẩm — kiến thức phổ thông (kn)", () => {
  it("củ dền, đậu bắp, cà phê, óc heo, phở…; hỏi nguồn thì nói là Lomi tổng hợp", async () => {
    for (const [q, re] of [["củ dền có tác dụng gì", /Củ dền[\s\S]*nitrat/], ["đậu bắp có tác dụng gì", /Đậu bắp[\s\S]*warfarin/], ["uống cà phê có tốt không", /400 mg caffeine/],
      ["ăn óc heo có bổ não không", /cholesterol/], ["nước hầm xương có bổ không", /không phải nguồn canxi/], ["quả hồng có tác dụng gì", /lúc bụng đói/], ["phở có tác dụng gì", /nước dùng/]] as const)
      expect((await last([q])).content, q).toMatch(re);
    const src = (await last(["củ dền có tác dụng gì", "nguồn đâu"])).content;
    expect(src).toMatch(/Lomi tổng hợp — chưa đối chiếu/);
  }, T);
});
