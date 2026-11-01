// 30/10 — Kir: "update thêm thư viện bệnh đi, ung thư này ung thư kia, viêm này viêm kia". Thêm 25 thẻ có nguồn (NHS / NHS 111 Wales /
// MedlinePlus / Moorfields / Guy's and St Thomas'). Mỗi ca: câu người dùng hay hỏi → đúng thẻ, đúng khía cạnh. Chạy qua khung chat thật.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { findMedTopicId } from "@/lib/lomiMed";

const T = 60000;

describe("30/10 — thẻ mới: nhận đúng tên", () => {
  const CASES: [string, string][] = [
    ["u não là gì", "u-nao"], ["ung thư não", "u-nao"], ["ung thư miệng", "ung-thu-mieng"], ["ung thư lưỡi", "ung-thu-mieng"],
    ["ung thư thanh quản", "ung-thu-thanh-quan"], ["ung thư tinh hoàn", "ung-thu-tinh-hoan"], ["ung thư xương", "ung-thu-xuong"],
    ["ung thư tử cung", "ung-thu-noi-mac-tu-cung"], ["ung thư cổ tử cung", "ung-thu-co-tu-cung"], ["đa u tủy", "da-u-tuy"],
    ["ung thư túi mật", "ung-thu-tui-mat"], ["ung thư đường mật", "ung-thu-duong-mat"], ["u trung biểu mô phúc mạc", "u-trung-bieu-mo"],
    ["sarcoma mô mềm", "sarcoma-mo-mem"], ["viêm bể thận", "viem-be-than"], ["viêm vùng chậu", "viem-vung-chau"],
    ["viêm giác mạc", "viem-giac-mac"], ["viêm màng ngoài tim", "viem-mang-ngoai-tim"], ["viêm cơ tim", "viem-co-tim"],
    ["viêm bao hoạt dịch", "viem-bao-hoat-dich"], ["viêm tai ngoài", "viem-tai-ngoai"], ["viêm tai giữa", "viem-tai-giua"],
    ["viêm màng bồ đào", "viem-mang-bo-dao"], ["viêm xương tủy", "viem-xuong-tuy"], ["viêm quy đầu", "viem-quy-dau"],
    ["viêm phúc mạc", "viem-phuc-mac"], ["viêm khớp nhiễm trùng", "viem-khop-nhiem-trung"], ["viêm niệu đạo", "viem-nieu-dao"],
    ["ra máu sau mãn kinh", "ra-mau-sau-man-kinh"], ["mãn kinh là gì", "man-kinh"],
    // đợt 2 (30/10, "e tự làm giúp a cho hoàn chỉnh")
    ["phình động mạch chủ là gì", "phinh-dong-mach-chu-bung"], ["bệnh động mạch ngoại biên", "benh-dong-mach-ngoai-bien"],
    ["nhịp nhanh trên thất", "nhip-nhanh-tren-that"], ["bệnh cơ tim phì đại", "benh-co-tim"], ["đau dây thần kinh sinh ba", "dau-day-than-kinh-sinh-ba"],
    ["nhược cơ là gì", "nhuoc-co"], ["guillain barre", "hoi-chung-guillain-barre"], ["bệnh als", "benh-than-kinh-van-dong"],
    ["bé ho ông ổng", "viem-thanh-khi-phe-quan"], ["lồng ruột ở trẻ", "long-ruot"], ["tràn khí màng phổi", "tran-khi-mang-phoi"],
    ["tràn dịch màng phổi", "tran-dich-mang-phoi"], ["xơ phổi", "xo-phoi"], ["áp xe hậu môn", "ro-hau-mon"], ["bệnh addison", "benh-addison"],
    ["máu khó đông", "benh-hemophilia"], ["giảm tiểu cầu miễn dịch", "giam-tieu-cau-mien-dich"], ["sốt xuất huyết giảm tiểu cầu", "sot-xuat-huyet"],
    ["móng chân chọc thịt", "mong-chot-thit"], ["chai chân", "chai-chan"], ["bong võng mạc", "bong-vong-mac"], ["nhược thị", "nhuoc-thi"],
    ["polyp mũi", "polyp-mui"], ["mất khứu giác", "mat-khu-giac"], ["bàn chân bẹt", "ban-chan-bet"], ["vẹo cột sống", "cong-veo-cot-song"],
    ["đau khớp háng", "dau-khop-hang"], ["tiểu ra máu", "tieu-ra-mau"], ["hội chứng thận hư", "hoi-chung-than-hu"], ["rong kinh", "rong-kinh"],
    ["trễ kinh", "mat-kinh"], ["hội chứng tiền kinh nguyệt", "hoi-chung-tien-kinh-nguyet"], ["giãn tĩnh mạch thừng tinh", "gian-tinh-mach-thung-tinh"],
    ["sa tử cung", "sa-tang-chau"], ["bệnh whitmore", "benh-whitmore"], ["bệnh lyme", "benh-lyme"], ["viêm bàng quang kẽ", "viem-bang-quang-ke"],
    ["rsv", "viem-tieu-phe-quan"], ["chàm sữa", "viem-da-co-dia"], ["cúm a", "cum"], ["đau cổ vai gáy", "dau-vai-gay"], ["chấy đầu", "chi-ran"],
  ];
  it.each(CASES)("%s → %s", (q, id) => expect(findMedTopicId(q)).toBe(id));
  it("không bắt nhầm: 'ngủ' không phải viêm niệu đạo, 'viêm gan' không phải viêm gân", () => {
    expect(findMedTopicId("a ngu qua")).not.toBe("viem-nieu-dao");
    expect(findMedTopicId("viêm gan b là gì")).toBe("viem-gan-b");
  });
});

describe("30/10 — trả lời qua khung chat", () => {
  it("Khàn tiếng lâu ngày → đúng thẻ ung thư thanh quản, nêu triệu chứng có nguồn", async () => {
    const m = await last(["khàn tiếng lâu ngày có phải ung thư thanh quản"]);
    expect(m.med?.id).toBe("ung-thu-thanh-quan");
    expect(m.content).toMatch(/khàn tiếng/);
  }, T);
  it("Loét miệng không lành → ung thư miệng, mốc 3 tuần", async () => {
    const m = await last(["bị loét miệng 1 tháng không lành có phải ung thư miệng không"]);
    expect(m.med?.id).toBe("ung-thu-mieng");
    expect(m.content).toMatch(/3 tuần/);
  }, T);
  // Trước: "ra máu sau mãn kinh có sao không" → thẻ mãn kinh "Không phải ai cũng cần điều trị"; kể chuyện mẹ → "Vậy hả 😄 Nghe được đó."
  it("Ra máu sau mãn kinh → luôn đi khám, kể cả khi kể chuyện người nhà", async () => {
    const a = await last(["ra máu sau mãn kinh có sao không"]);
    expect(a.content).toMatch(/luôn nên đi khám/);
    const b = await last(["mẹ e mãn kinh 3 năm rồi giờ ra máu lại"]);
    expect(b.content).toMatch(/luôn nên đi khám/);
    expect(b.content).not.toMatch(/Nghe được đó/);
  }, T);
  it("Hỏi cách chữa viêm bao hoạt dịch → mẹo tự chăm (nghỉ, chườm đá) đứng đầu, thuốc tách riêng", async () => {
    const m = await last(["viêm bao hoạt dịch đầu gối chữa sao"]);
    expect(m.med?.id).toBe("viem-bao-hoat-dich");
    expect(m.content.split("\n").find((l) => l.startsWith("•"))).toMatch(/nghỉ|chườm/);
  }, T);
  it("Viêm màng ngoài tim → có dấu hiệu gọi 115 khi đau ngực kiểu nhồi máu", async () => {
    const m = await last(["viêm màng ngoài tim"]);
    expect(m.content).toMatch(/115/);
  }, T);
  // Trước khi thêm phần diễn tiến: "bàn chân bẹt có sao không" → "nguồn không nêu phần này".
  it("Hỏi 'có sao không' / 'chữa được không' → có câu trả lời có nguồn", async () => {
    const a = await last(["bàn chân bẹt có sao không"]);
    expect(a.content).toMatch(/không đáng lo/);
    const b = await last(["nhược thị ở trẻ chữa được không"]);
    expect(b.content).toMatch(/càng sớm càng hiệu quả/);
  }, T);
  it("Ung thư xương không còn bị đáp bằng thẻ ung thư chung", async () => {
    const m = await last(["ung thư xương là gì"]);
    expect(m.med?.id).toBe("ung-thu-xuong");
    expect(m.content).not.toMatch(/chưa có bài riêng/);
  }, T);
  // Từ nhật ký bí (lomi_stuck_log) + lỗi còn treo đợt trước.
  it("Gõ sai một chữ trong tên bệnh vẫn hiểu; chữ không dấu như 'alo' không bị sửa thành 'lao'", async () => {
    const a = await last(["Mẹo chữa nghẹt mũu"]);
    expect(a.med?.id).toBe("sx-nghet-mui");
    const b = await last(["e bị tiểu đườmg kiêng gì"]);
    expect(b.med?.id).toMatch(/tieu-duong/);
    const c = await last(["Ủa alo?"]);
    expect(c.med).toBeUndefined();
  }, T);
  it("'Cóc ăn đc k?' → cảnh báo ngộ độc cóc có nguồn Bộ Y tế, không hỏi lại", async () => {
    const m = await last(["Cóc ăn đc k?"]);
    expect(m.content).toMatch(/NGUY HIỂM/);
  }, T);
  it("Ho ông ổng ở trẻ → viêm thanh khí phế quản; kèm tím tái / thở không nổi → gọi 115", async () => {
    const a = await last(["bé nhà e ho ông ổng thở rít"]);
    expect(a.med?.id).toBe("viem-thanh-khi-phe-quan");
    expect(a.content).toMatch(/115/);
    const b = await last(["bé ho ông ổng tím tái thở không nổi"]);
    expect(b.content).toMatch(/^🚨/);
  }, T);
  // Nhật ký bí: "Ung thư cổ tử cung kiêng gì?" → "không nêu cách ăn uống riêng".
  it("Ung thư từng loại chưa có nguồn ăn uống riêng → nói thật, rồi đưa phần ăn uống có nguồn cho người bệnh ung thư nói chung", async () => {
    const m = await last(["Ung thư cổ tử cung kiêng gì?"]);
    expect(m.content).toMatch(/chưa nêu cách ăn uống riêng.*ung thư cổ tử cung/s);
    expect(m.content).toMatch(/không nên tự nhịn ăn/);
  }, T);
  it("'kiêng X không' với X là món thẻ có nhận định riêng → trả lời đúng món; 'kiêng gì' vẫn đọc cả danh sách", async () => {
    const a = await last(["bị ung thư có nên kiêng đường không"]);
    expect(a.med?.aspect).toBe("food");
    expect(a.content).toMatch(/Không có bằng chứng/);
    const b = await last(["gout có nên kiêng bia không"]);
    expect(b.content).toMatch(/\*\*bia\*\*/);
    const c = await last(["gout kiêng gì"]);
    expect(c.med?.aspect).toBe("diet");
  }, T);
  // Kir (ảnh chụp): "Mới mổ ruột thừa ăn bò đc k?" → "chưa xác minh được". Mẹo kiêng khi có vết thương / mới mổ, bôi nghệ ngừa sẹo.
  it("Mới mổ / có vết thương hỏi kiêng bò, rau muống, gà → quan niệm dân gian + nguồn: không món nào gây sẹo lồi, nên ăn đủ đạm", async () => {
    for (const q of ["Mới mổ ruột thừa ăn bò đc k?", "bị đứt tay ăn rau muống có bị sẹo lồi không", "mới sinh mổ ăn gà được không"]) {
      const m = await last([q]);
      expect(m.content, q).toMatch(/không nhắc món ăn nào/);
      expect(m.content, q).toMatch(/ăn đủ đạm/);
      expect(m.content, q).not.toMatch(/chưa xác minh được: các nguồn/);
    }
  }, T);
  it("Bôi nghệ lên vết mổ ngừa sẹo → chưa có bằng chứng, chỉ chăm sẹo khi đã lành hẳn; 'nghệ có tác dụng gì' vẫn là bài nghệ chung", async () => {
    const a = await last(["bôi nghệ lên vết mổ có hết sẹo không"]);
    expect(a.content).toMatch(/Bôi nghệ ngừa sẹo/);
    expect(a.content).toMatch(/lành hẳn/);
    const b = await last(["nghệ có tác dụng gì"]);
    expect(b.content).toMatch(/\*\*Nghệ\*\*/);
  }, T);
  it("Gout hỏi ăn bò vẫn theo thẻ gout (không bị mẹo vết thương bắt nhầm)", async () => {
    const m = await last(["a bị gout ăn bò được không"]);
    expect(m.med?.id).toBe("gout");
  }, T);
  // Kir: "kiêng xì dầu vì làm đen vết thương… e tìm hiểu tổng quát hơn" — các kiêng cữ dân gian hay gặp, đối chiếu NHS.
  it("Mẹo dân gian hay gặp → đúng bài, có nguồn", async () => {
    const CASES: [string, RegExp][] = [
      ["bị thương ăn xì dầu có bị thâm sẹo không", /che nắng/],
      ["mới sinh có được tắm gội không", /Ở cữ/],
      ["ở cữ có nên nằm than không", /khí CO/],
      ["bé 2 tháng rơ lưỡi mật ong được không", /botulinum/],
      ["ăn xoài có nổi mụn không", /chưa tìm thấy món ăn nào gây mụn/],
      ["bị giời leo có nên vẽ mực không", /3 ngày/],
      ["con bị sởi có được tắm không", /Bị sởi/],
    ];
    for (const [q, re] of CASES) expect((await last([q])).content, q).toMatch(re);
  }, T);
  it("Không bắt nhầm: mật ong cho bé 3 tuổi vẫn là bài chanh mật ong; 'kiêng cữ gì khi bị gout' vẫn là thẻ gout", async () => {
    expect((await last(["bé 3 tuổi ho uống mật ong chanh được không"])).content).toMatch(/Chanh mật ong/);
    expect((await last(["kiêng cữ gì khi bị gout"])).med?.id).toBe("gout");
  }, T);
  // Kir: "trái cây có tính nóng hay lạnh… dưa hấu, xoài, sầu riêng… tìm hiểu trái cây rau củ quả".
  it("Trái cây, rau củ tính nóng / lạnh; khế với bệnh thận; sắn, măng, khoai tây mọc mầm", async () => {
    const CASES: [string, RegExp][] = [
      ["dưa hấu tính nóng hay lạnh", /đa dạng nhiều loại/],
      ["ăn xoài có nóng người không", /Đông y/],
      ["ăn vải bị nhiệt miệng phải không", /cắn trúng/],
      ["người suy thận ăn khế được không", /tránh ăn khế/],
      ["say sắn phải làm sao", /mở vung/],
      ["măng tươi luộc thế nào cho hết độc", /luộc nhiều lần/],
      ["khoai tây mọc mầm ăn được không", /solanin/],
      ["gừng có tính nóng không", /\*\*Gừng\*\*/],
    ];
    for (const [q, re] of CASES) expect((await last([q])).content, q).toMatch(re);
    expect((await last(["chạy thận có ăn chuối được không"])).med?.id).toBe("benh-than-man");
    expect((await last(["ăn xoài nổi mụn không"])).content).toMatch(/chưa tìm thấy món ăn nào gây mụn/);
  }, T);
  it("Không bắt nhầm: 'tốt cho mắt' không phải mất thú cưng; 'mang thai' không phải măng", async () => {
    expect((await last(["xoài tốt cho mắt không"])).content).not.toMatch(/mất mát/);
    expect((await last(["con chó mất rồi"])).content).toMatch(/mất|thương/);
    expect((await last(["mang thai ăn gì an toàn"])).content).not.toMatch(/xyanua/);
  }, T);
  // Kir: "từng bệnh e xem nên bổ sung vitamin gì… kẽm, hải sản nhiều kẽm… viêm gan, sốt siêu vi, mờ mắt, huyết áp, đột quỵ, tiền đình".
  it("Vitamin · khoáng chất theo bệnh và theo chất; bệnh mới", async () => {
    const CASES: [string, RegExp][] = [
      ["bị cảm nên uống vitamin gì", /Kẽm/],
      ["bị thiếu máu nên bổ sung gì", /hấp thu sắt/],
      ["hải sản có nhiều kẽm không", /Hàu/],
      ["ăn gì bổ sung sắt", /Thịt đỏ/],
      ["bà bầu nên uống vitamin gì", /axit folic/],
      ["viêm gan B nên uống vitamin gì", /chưa nêu vitamin/],
      ["bị sởi uống vitamin A được không", /không phòng được sởi/],
    ];
    for (const [q, re] of CASES) expect((await last([q])).content, q).toMatch(re);
    expect((await last(["sốt siêu vi"])).med?.id).toBe("sot");
    expect((await last(["mờ mắt"])).med?.id).toBe("mo-mat");
    expect((await last(["viêm gan E"])).med?.id).toBe("viem-gan-e");
    expect((await last(["bị tiền đình"])).med?.id).toBe("roi-loan-tien-dinh");
    expect((await last(["bà bầu uống axit folic khi nào"])).content).not.toMatch(/ngộ độc|115/);
  }, T);
  // Kir: "thêm vô kiểu dinh dưỡng đồ" — món ăn có chất gì.
  it("Món ăn có chất gì", async () => {
    expect((await last(["trứng có chất gì"])).content).toMatch(/ở lòng đỏ/);
    expect((await last(["hàu bổ gì"])).content).toMatch(/Kẽm/);
    expect((await last(["dinh dưỡng của chuối"])).content).toMatch(/B1, B6/);
    expect((await last(["bánh căn có chất gì"])).content).not.toMatch(/theo nguồn y khoa\)/);
  }, T);
  // Kir: "calo, lượng đường đồ nữa, a muốn tư vấn mấy bệnh đồ thì mấy thứ dinh dưỡng tư vấn z á".
  it("Calo, đường của món; tư vấn theo bệnh kèm số liệu", async () => {
    expect((await last(["chuối bao nhiêu calo"])).content).toMatch(/97 kcal/);
    expect((await last(["cam bao nhiêu calo"])).content).toMatch(/38 kcal/);
    expect((await last(["tiểu đường ăn chuối được không"])).content).toMatch(/glucid\) \*\*22,2 g/);
    expect((await last(["suy thận ăn khoai tây được không"])).content).toMatch(/rau củ nhiều kali[\s\S]*kali \*\*396 mg/);
    expect((await last(["mình nên ăn bao nhiêu calo mỗi ngày"])).content).toMatch(/2\.500 kcal/);
    expect((await last(["phở bao nhiêu calo"])).content).toMatch(/chưa có số liệu/);
    expect((await last(["sợ mập lắm, chuối bao nhiêu calo vậy"])).content).not.toMatch(/97 kcal/);
  }, T);
  // Kir: "tiểu đường k nên ăn uống mấy món có lượng đường cao như mít, xoài chín…".
  it("Tiểu đường và trái cây: cách ăn có nguồn, số liệu khi có, nói thật khi chưa có", async () => {
    const mit = (await last(["tiểu đường ăn mít được không"])).content;
    expect(mit).toMatch(/vẫn ăn trái cây được/);
    expect(mit).toMatch(/Mít mật\*\* — trong 100 g phần ăn được: tinh bột \+ đường \(glucid\) \*\*14 g/);
    expect((await last(["tiểu đường type 2 ăn nho được không"])).content).toMatch(/Nho ngọt\*\* — trong 100 g phần ăn được: tinh bột \+ đường \(glucid\) \*\*16,3 g/);
    const list = (await last(["bị tiểu đường kiêng trái cây gì"])).content;
    expect(list).toMatch(/tránh nước ép, sinh tố/);
    expect(list).toMatch(/Sầu riêng: \*\*26,9 g/);
    expect((await last(["trái cây nào nhiều đường"])).content).toMatch(/Xoài chín: \*\*14,1 g\*\* \(đường 14,8 g\)/);
    expect((await last(["tiểu đường ăn thịt bò được không"])).content).not.toMatch(/Ăn trái cây khi bị tiểu đường/);
  }, T);
  // Kir: "e rà tiếp mấy cái lỗi hiểu lầm câu đi" — câu thật trong nhật ký bí + câu dễ hiểu lầm.
  it("Rà câu hiểu lầm (30/10)", async () => {
    const no = async (q: string, re: RegExp) => expect((await last([q])).content, q).not.toMatch(re);
    const yes = async (q: string, re: RegExp) => expect((await last([q])).content, q).toMatch(re);
    await no("giá vàng hôm nay bao nhiêu", /giá mở cửa/);
    await no("cam kết bảo hành bao lâu", /hiệu lực 2 giờ/);
    await yes("giá cuốc xe tính sao", /giá mở cửa/);
    await yes("mã ưu đãi dùng được bao lâu", /hiệu lực 2 giờ/);
    await no("gà quá đi mất", /Tội bé|chia buồn/);
    await yes("Haizzz sao e cứ vậy hoài á lomi ơi", /xin lỗi/);
    await yes("chớ e biết cái gì", /giúp được mấy chuyện/);
    await yes("đi đường cẩn thận nha", /cảm ơn/);
    await yes("huyết áp cao thì nên uống aspririn k?", /không kê thuốc/);
    await yes("Thoái hoá cột sống thì sao?", /thoái hoá cột sống CỔ/);
    await yes("con em 3 tuổi chưa biết nói", /Chậm nói\*\* là gì/);
    await yes("bé chậm nói", /Chậm nói\*\* là gì/);
    await yes("mang thai mấy tuần thì siêu âm được", /tuần \*\*11–14\*\*/);
    await yes("siêu âm có hại cho thai không", /tác dụng phụ đã biết/);
    await yes("nhìn điện thoại nhiều bị mỏi mắt", /20-20-20/);
    await yes("ăn bún bò có mập không", /món nấu sẵn còn nước dùng/);
    await yes("Ăn măng đc k?", /luộc nhiều lần/);
    await yes("con 3 tuổi chưa biết nói có sao không", /Chậm nói\*\*, Lomi có kiến thức/);
  }, T);
  // Kir: "ung thư k nên ăn trứng vịt lộn… cá có omega 3 ăn bổ mắt… bị cảm sốt thì ăn tỏi… mẹo dân gian nhiều lắm".
  it("Mẹo dân gian đợt 4: kiêng đồ bổ khi ung thư, cá bổ mắt, tỏi trị cảm, tiết canh, ăn cay, bẻ khớp, lò vi sóng", async () => {
    const CASES: [string, RegExp][] = [
      ["ung thư có nên ăn trứng vịt lộn không", /bỏ đói/],
      ["nghe nói ung thư phải nhịn ăn để bỏ đói khối u", /chậm hồi phục/],
      ["ăn cá có bổ mắt không", /không hơn giả dược/],
      ["dầu cá có tốt cho mắt không", /AREDS2/],
      ["bị cảm sốt ăn tỏi có khỏi không", /rất ít bằng chứng/],
      ["ăn tiết canh có sao không", /liên cầu lợn/],
      ["ăn cay có bị đau dạ dày không", /H\. pylori/],
      ["bẻ khớp tay có bị viêm khớp không", /bọt khí/],
      ["lò vi sóng có gây ung thư không", /nhiễm xạ/],
      ["mắt cá chân bị sưng", /Phù chân/],
    ];
    for (const [q, re] of CASES) expect((await last([q])).content, q).toMatch(re);
    expect((await last(["mắt cá chân bị sưng"])).content).not.toMatch(/Tội bé|omega/);
  }, T);
  it("Rà câu hiểu lầm đợt 2 (30/10)", async () => {
    const no = async (q: string, re: RegExp) => expect((await last([q])).content, q).not.toMatch(re);
    const yes = async (q: string, re: RegExp) => expect((await last([q])).content, q).toMatch(re);
    await no("ông nội bị té ngã đập đầu", /bạo lực|bị đánh/i);
    await yes("ông nội bị té ngã đập đầu", /ngã/);
    await yes("bé 6 tháng ăn dặm gì", /Ăn dặm/);
    await yes("sữa mẹ ít quá", /ít sữa/i);
    await yes("bị hói", /rụng tóc/i);
    await yes("con bị rôm sảy", /rôm sảy/i);
    await yes("toang rồi", /Toang hả/);
    await yes("chill thôi", /Chill chill/);
    await yes("kèo này thơm", /Kèo thơm/);
    await yes("Đà Lạt có lạnh không", /áo khoác/);
    await yes("tháng này em có tiền không", /không ai đoán chắc/);
    await yes("bị chó cắn có sao không", /Chó cắn\*\*, Lomi có kiến thức/);
    await yes("bị nóng trong", /tính nóng/);
  }, T);
  it("Mẹo dân gian đợt 5 (danh sách ChatGPT, 30/10)", async () => {
    const yes = async (q: string, re: RegExp) => expect((await last([q])).content, q).toMatch(re);
    const no = async (q: string, re: RegExp) => expect((await last([q])).content, q).not.toMatch(re);
    await yes("uống thuốc nam chữa ung thư được không", /thay thế hoặc trì hoãn điều trị/);
    await yes("linh chi chữa ung thư không", /Nấm linh chi/);
    await yes("rượu ấu tàu uống được không", /aconitine/);
    await yes("lá ngón có độc không", /suy hô hấp/);
    await yes("trúc đào có độc không", /mọi bộ phận/);
    await yes("nhỏ chanh vào tai được không", /tăm bông/);
    await yes("bôi dầu gió cho trẻ sơ sinh được không", /long não/i);
    await yes("trẻ sơ sinh uống nước lá được không", /không cần uống thêm nước/);
    await no("trẻ sơ sinh uống nước lá được không", /Nguồn chưa nêu riêng cho trẻ nhỏ/);
    await yes("uống cà phê giải rượu được không", /chỉ có thời gian/);
    await yes("thụt tháo có tốt không", /thụt rửa đại tràng/);
    await yes("bị tiêu chảy kiêng uống nước đúng không", /uống nhiều nước/);
    await yes("chườm đá trực tiếp lên da được không", /khăn ẩm/);
    await yes("bôi dầu hỏa trị ghẻ được không", /bỏng và kích ứng/);
    await yes("uống nước dừa tăng tiểu cầu không", /ibuprofen, aspirin/);
    await yes("giác hơi có tốt không", /chất lượng thấp/);
    await yes("nhỏ nước tiểu vào mắt được không", /Đau mắt đỏ/);
    await no("tôm với vitamin C có độc không", /\bem\b/);
  }, T);
  it("Bớt lặp ý, không nêu nguồn khi chưa hỏi, đáp đúng thứ được hỏi (30/10)", async () => {
    const a1 = (await last(["Nhỏ nước tiểu vào mắt là sao"])).content;
    expect(a1.slice(0, 400)).toMatch(/nước tiểu/);
    expect(a1).not.toMatch(/nguồn y khoa nói gì/);
    const a2 = (await last(["đau mắt đỏ nên làm gì"])).content;
    expect(a2).not.toMatch(/đã đối chiếu nguồn|Hỏi tên từng vị|NHS/);
    expect(a2.match(/Trẻ dưới 2 tuổi cần bác sĩ/gi)?.length ?? 0).toBeLessThanOrEqual(1);
    const a3 = (await last(["cảm lạnh nên làm gì"])).content;
    expect(a3.match(/vitamin C/g)?.length ?? 0).toBe(1);
  }, T);
  it("Đổi tên app thành iLomi (31/10)", async () => {
    for (const q of ["ilomi là gì", "app này để làm gì", "liên minh liên doanh là gì"]) {
      const a = (await last([q])).content;
      expect(a, q).toMatch(/iLomi là cộng đồng/);
      expect(a, q).not.toMatch(/Liên Minh Liên Doanh/);
    }
  }, T);
  it("Mẹo dân gian đợt 6 (danh sách ChatGPT lần 2, 31/10)", async () => {
    const yes = async (q: string, re: RegExp) => expect((await last([q])).content, q).toMatch(re);
    const no = async (q: string, re: RegExp) => expect((await last([q])).content, q).not.toMatch(re);
    await yes("Lá lốt rửa vùng kín có hết viêm không?", /thụt rửa/);
    await yes("uống phan tả diệp giảm cân được không", /nhuận tràng kích thích/);
    await yes("Sinh mổ có phải nằm im không?", /đi lại càng sớm/);
    await yes("Ăn cua xong ăn cam có bị ngộ độc không?", /hữu cơ, ít độc/);
    await yes("Trẻ sốt có phải kiêng thịt không?", /trẻ thấy đói/);
    await yes("Bồ công anh có giải độc gan không?", /Bồ công anh/);
    await no("Bồ công anh có giải độc gan không?", /\bem\b/);
    await yes("tỏi có giải độc gan không", /Tỏi/);
    await yes("Lá hẹ hấp đường phèn có trị ho không?", /Lá hẹ\*\* là vị quen thuộc/);
    await no("có ai bán tỏi không", /Tỏi\*\*\s+🔸/);
    await no("Bà bầu ăn rau ngót có gây sảy thai không?", /Ý “bầu ăn”/);
  }, T);
  it("Danh sách ChatGPT lần 3 (31/10): ý nghĩ không muốn sống nói gián tiếp", async () => {
    for (const q of ["Có lúc em nghĩ biến mất thì mọi người đỡ khổ.", "Nhiều khi em nghĩ giá mà mình không thức dậy nữa.", "Em nghĩ mọi người sẽ nhẹ nhõm nếu không có em.", "Em cứ nghĩ mình chẳng cần tồn tại nữa."])
      expect((await last([q])).content, q).toMatch(/không phải một mình|096 306 1414|115/);
    for (const q of ["Em mệt sống kiểu này quá, chẳng muốn cố nữa.", "Có lúc em chỉ muốn ngủ luôn cho khỏi phải đối mặt.", "Em không thấy tương lai có gì đáng mong chờ.", "Em feel hopeless, chẳng muốn cố nữa."])
      expect((await last([q])).content, q).toMatch(/không muốn sống nữa|không phải một mình/);
    expect((await last(["Tối nay buồn ngủ quá, mai dậy sớm"])).content).not.toMatch(/không muốn sống/);
  }, T);
  it("Danh sách ChatGPT lần 3 (31/10): thuốc, tâm lý, trò chuyện không bị hiểu sang chỗ khác", async () => {
    const yes = async (q: string, re: RegExp) => expect((await last([q])).content, q).toMatch(re);
    const no = async (q: string, re: RegExp) => expect((await last([q])).content, q).not.toMatch(re);
    await yes("Em mới phát hiện thuốc hết hạn tháng trước.", /quá hạn sử dụng/);
    await yes("Thuốc nhỏ mắt mở nắp lâu rồi còn dùng được không?", /sau khi mở nắp/);
    await yes("I forgot my medicine sáng nay, giờ sao?", /quên liều/);
    await yes("Em uống thuốc rồi mà quên mất, không biết có uống lần nữa chưa.", /đừng uống thêm/);
    await yes("Em uống thuốc tránh thai hằng ngày trễ giờ rồi.", /tờ hướng dẫn/);
    await yes("Ibuprofen có uống lúc bụng đói được không?", /sau bữa ăn/);
    await yes("Em lo uong thuoc khi dang cho con bu.", /đừng hoảng/);
    await yes("Thuốc này ghi gây chóng mặt, em đi xe máy được chứ?", /đừng lái xe/);
    await yes("Làm sao biết mình cần gặp chuyên viên tâm lý?", /kéo dài vài tuần/);
    await yes("Em ngại kể chuyện riêng với người lạ lắm.", /không phán xét/);
    await yes("Lomi có phải bác sĩ không?", /không phải bác sĩ/);
    await yes("Tui đang cảm một người, mà người ta có ny rồi.", /đã có đôi/);
    await no("Tui đang cảm một người, mà người ta có ny rồi.", /chúc hai bạn/);
    await yes("Cảm xúc của em cứ lên xuống như thời tiết Đà Lạt.", /lên xuống thất thường/);
    await yes("Tui bị cảm mà vẫn phải đi làm, chán ghê.", /Bị cảm mà vẫn phải đi làm/);
    await yes("Me em khong dong y cho em yeu nguoi nay.", /gia đình không đồng ý/);
    await yes("My boyfriend just broke up với em.", /chia tay/);
    await yes("Thôi được rồi, cảm ơn nhiều.", /không có gì/);
    await no("Em bị stress mấy tháng nay rồi.", /robot/);
    await no("Em thấy mình chẳng làm được tích sự gì.", /Làm được tích sự hả|😄/);
    await no("Nhà em đang lục đục chuyện chia tài sản.", /😄/);
  }, T);
  it("Danh sách ChatGPT lần 4 (31/10): hội thoại nhiều lượt — an toàn", async () => {
    const a = await chat(["Em không muốn sống kiểu này nữa", "Mọi thứ nặng nề quá", "Em đang một mình"]);
    expect(a[2].content).toMatch(/115|096 306 1414/);
    expect(a[2].content).toMatch(/một người em tin|gọi/);
    expect((await last(["Em đã nghĩ đến chuyện biến mất"])).content).toMatch(/không muốn sống nữa|không phải một mình/);
    expect((await last(["Em sợ chính mình"])).content).toMatch(/115|không phải một mình/);
    const b = await chat(["Tui bị nổi mề đay", "Ngứa lắm", "Giờ môi hơi sưng"]);
    expect(b[2].content).toMatch(/115/);
  }, T);
  it("Danh sách ChatGPT lần 4 (31/10): nhớ mạch sức khoẻ / thuốc", async () => {
    const r1 = await chat(["Bị cảm cúm thì sao em?", "Bé nhà anh 4 tuổi", "Bao lâu mới khỏi?"]);
    expect(r1[1].content).toMatch(/trẻ nhỏ|bé 4 tuổi/);
    expect(r1[2].content).toMatch(/Cúm/);
    const r2 = await chat(["Bé nhà em sốt", "38 độ thôi", "Bé mới 2 tháng"]);
    expect(r2[2].content).toMatch(/dưới 3 tháng/);
    const r3 = await chat(["Bị đau dạ dày thì kiêng gì?", "Cà phê thì sao", "Tui uống mỗi ngày"]);
    expect(r3[2].content).not.toMatch(/quẹt/);
    expect(r3[2].content).toMatch(/caffeine|giảm dần/);
    const r4 = await chat(["Mẹ em uống metformin", "Bầu uống được không?"]);
    expect(r4[0].content).toMatch(/metformin/);
    expect(r4[1].content).toMatch(/mang thai/);
    const r5 = await chat(["Em đang uống thuốc kháng sinh", "Ngưng khi hết sốt được không?"]);
    expect(r5[1].content).toMatch(/đủ số ngày/);
    const r6 = await chat(["Em bị đau bụng", "Quanh rốn á", "Giờ đau bên phải"]);
    expect(r6[2].content).toMatch(/ruột thừa/);
  }, T);
  it("Danh sách ChatGPT lần 4 (31/10): hỏi tiếp về app, tìm quán, tarot", async () => {
    expect((await chat(["Có người nhắn tin quấy rối", "Em báo cáo rồi", "Chặn ở đâu?"]))[2].faqId).toBe("block");
    expect((await chat(["A đăng ký iLomi rồi", "Giờ xác minh sao em?"]))[1].content).toMatch(/không gửi email xác minh/);
    expect((await chat(["Em đặt xe trên Lomi", "Tài xế chưa nhận", "Hủy được không?"]))[2].faqId).toBe("ridecancel");
    const s1 = await chat(["Tìm quán nướng", "Cho nhóm 8 người"]);
    expect(s1[1].faqId).toBeUndefined();
    expect(s1[1].content).toMatch(/số người/);
    expect((await chat(["Tìm quán cơm", "À đổi qua bún bò"]))[1].content).toMatch(/Bún bò/);
    expect((await last(["Lá The Fool là gì?"])).content).toMatch(/The Fool/);
    expect((await last(["anh bị đau gót chân khi đi bộ"])).faqId).toBeUndefined();
  }, T);
  it("Danh sách ChatGPT lần 5 (31/10): quay lại chuyện cũ", async () => {
    const q1 = await chat(["Em bị đau bụng", "Từ sáng rồi", "Có quán cháo nào gần đây ko", "À em hỏi cách bật thông báo", "Quay lại vụ đau bụng, giờ đau hơn"]);
    expect(q1[4].content).toMatch(/nặng hơn/);
    expect(q1[4].content).toMatch(/115/);
    const q2 = await chat(["Rút tarot tiền bạc", "À đổi qua tình yêu", "Quay lại lá tiền lúc nãy"]);
    expect(q2[2].content).toMatch(/quay lại trải bài/);
    expect(q2[2].content).toMatch(/tiền bạc/);
    const q3 = await chat(["Em đang dùng thuốc sắt", "Rút bài tình yêu đi", "Quay lại thuốc sắt", "Uống nước cam được hông?"]);
    expect(q3[2].content).toMatch(/thuốc sắt/);
    expect(q3[3].content).toMatch(/vitamin C/);
    const q4 = await chat(["Tui muốn đăng bài cộng đồng", "Bài tuyển nhân viên quán cà phê", "À tìm quán ăn tối", "Quay lại bài tuyển dụng", "Đăng ở đâu vậy em?"]);
    expect(q4[1].content).toMatch(/TUYỂN/);
    expect(q4[2].biz).toBeUndefined();
    expect(q4[3].content).toMatch(/TUYỂN/);
    expect(q4[4].content).toMatch(/Tuyển người/);
    const q5 = await chat(["Mẹ em bị đau khớp", "À em quên mật khẩu", "Còn vụ ăn uống của mẹ thì sao?"]);
    expect(q5[2].faqId).toBeUndefined();
    expect(q5[2].content).toMatch(/đau khớp/);
  }, T);
  it("Danh sách ChatGPT lần 5 (31/10): sửa ý giữa chừng", async () => {
    const s1 = await chat(["Bé nhà em sốt", "Lộn, 3 tuổi chứ không phải 3 tháng", "Sốt 38 độ", "Ho nữa", "Ăn uống sao chị", "Bao lâu khỏi?"]);
    expect(s1[1].content).toMatch(/bé 3 tuổi/);
    expect(s1[1].content).not.toMatch(/fever/);
    expect(s1[3].content).toMatch(/thêm \*\*ho\*\*/);
    expect(s1[4].content).not.toMatch(/Uống trước hay sau ăn/);
    expect(s1[5].content).toMatch(/Sốt ở trẻ em/);
    expect((await chat(["Tìm quán ăn ở Đà Lạt", "Không phải Đà Lạt"]))[1].content).toMatch(/khu nào/);
    expect((await chat(["Anh muốn ăn phở", "À không phải phở"]))[1].places).toBeUndefined();
    expect((await chat(["Mẹ em uống thuốc huyết áp", "Nhầm, ba em"]))[1].content).toMatch(/là ba em/);
    const s2 = await chat(["Tui hỏi thuốc gout", "Không phải thuốc đau đầu"]);
    expect(s2[1].med).toBeUndefined();
    expect(s2[1].content).toMatch(/thuốc gout/);
    expect((await chat(["Em muốn đổi mật khẩu", "Không phải quên mật khẩu", "Trong hồ sơ á"]))[2].content).toMatch(/Cài đặt/);
  }, T);
  it("Danh sách ChatGPT lần 5 (31/10): chủ quán nhiều lượt", async () => {
    const o1 = await chat(["Anh có quán ăn", "À vợ anh hỏi thuốc cảm", "Bầu uống được không em"]);
    expect(o1[1].biz).toBeUndefined();
    expect(o1[2].biz).toBeUndefined();
    expect(o1[2].content).toMatch(/mang thai/);
    const o2 = await chat(["Anh muốn đăng ưu đãi trên Lomi", "Quán ăn gia đình", "Giảm 10%", "Cuối tuần thôi", "Cần ghi điều kiện gì", "Viết giúp anh"]);
    expect(o2[1].heart).toBeUndefined();
    expect(o2[4].content).toMatch(/Thời gian áp dụng/);
    expect(o2[5].content).toMatch(/GIẢM 10%/);
    const o3 = await chat(["Khách đánh giá quán em 1 sao", "Họ nói phục vụ chậm", "Hôm đó đông thật", "Em trả lời sao", "Đừng cãi nhau", "Viết ngắn hơn đi"]);
    expect(o3[5].content).toMatch(/chờ lâu/);
    const o4 = await chat(["Em cần tuyển nhân viên", "Quán cà phê", "Ca tối"]);
    expect(o4[2].content).toMatch(/ca tối/);
    expect((await last(["cô muốn đăng cái ưu đãi quán ăn của cô trên lomi cô có tài khoản doanh nghiệp rồi mà không thấy chỗ đăng bài giảm giá"])).faqId).toBe("bizoffer");
    expect((await chat(["Anh muốn đăng ưu đãi", "Không phải tài khoản cá nhân"]))[1].content).toMatch(/hồ sơ doanh nghiệp/);
  }, T);
  it("31/10 (ảnh Kir): 'X có gây / giúp Y không' trả lời đúng quan hệ, không đọc cả thẻ bệnh", async () => {
    const v = await last(["Vitamin C có làm mất ngủ k?"]);
    expect(v.content).toMatch(/chưa nhắc/);
    expect(v.content).not.toMatch(/Mất ngủ\*\* là gì/);
    expect(v.content).toMatch(/Vitamin C/);
    expect((await last(["cà phê có gây mất ngủ không"])).content).toMatch(/caffeine/);
    expect((await last(["hút thuốc có gây ung thư phổi không"])).content).toMatch(/Hút thuốc lá/);
    expect((await last(["canxi có gây sỏi thận không"])).content).toMatch(/canxi/);
    expect((await last(["magie có giúp ngủ ngon không"])).content).not.toMatch(/^Ngủ ngon nha|^Chúc bạn ngủ/);
    expect((await last(["thuốc cảm có làm buồn ngủ không"])).content).toMatch(/tuỳ thành phần/);
    expect((await last(["ăn đường có gây tiểu đường không"])).content).not.toMatch(/Tiểu đường\*\* là gì/);
    expect((await last(["chúc lomi ngủ ngon"])).content).toMatch(/ngủ/);
    expect((await last(["muốn kiểm tra xem có bị trầm cảm không"])).content).toMatch(/sàng lọc/);
  }, T);
  it("Danh sách ChatGPT lần 6 (31/10): so sánh, hai ý một câu, phủ định", async () => {
    expect((await last(["Nên uống trà xanh hay cà phê buổi sáng?"])).content).toMatch(/caffeine/);
    expect((await last(["Paracetamol hay ibuprofen khác nhau chỗ nào?"])).content).toMatch(/chưa có thẻ đã kiểm chứng đầy đủ/);
    expect((await last(["vit C hay zinc tot hon khi cam?"])).content).toMatch(/Kẽm/);
    const two = await last(["Đau đầu uống gì, mà quán phở nào ngon ở Đà Lạt?"]);
    expect(two.content).toMatch(/Còn ý “Quán phở nào ngon ở Đà Lạt\?”/);
    expect(two.quick?.[0]).toBe("Quán phở nào ngon ở Đà Lạt?");
    expect((await last(["Tối qua a uống rượu với bạn khá nhiều, sáng nay dậy buồn nôn, uống gì cho đỡ?"])).content).not.toMatch(/Còn ý/);
    expect((await last(["ko phai mat ngu, tui hoi app dang nhap sao bi loi?"])).content).toMatch(/tên đăng nhập/);
    expect((await last(["Không phải đau đầu do thiếu nước mà do thiếu ngủ thì làm gì?"])).med?.id).toBe("dau-dau");
    expect((await last(["vit C co lam mat ngu k?"])).content).toMatch(/Vitamin C/);
  }, T);
  it("Danh sách ChatGPT lần 6 (31/10): từ khoá bẫy, câu hỏi app, số lần", async () => {
    expect((await last(["Thuốc nào trị lỗi không tải được ảnh?"])).content).toMatch(/app bị trục trặc/);
    expect((await last(["Bài đăng của tôi bị sốt lượt xem."])).med).toBeUndefined();
    expect((await last(["Quán có tên 'Mất Ngủ' mở cửa mấy giờ?"])).med).toBeUndefined();
    expect((await last(["Có bệnh gì khiến app không gửi mã OTP?"])).content).toMatch(/không gửi mã OTP/);
    expect((await last(["bn tuoi thi dc tao acc iLomi?"])).content).toMatch(/18 tuổi/);
    expect((await last(["Đăng bài bao lâu thì được duyệt?"])).content).toMatch(/không cần chờ duyệt/);
    expect((await last(["Mỗi tuần nên ăn cá mấy lần?"])).faqId).toBeUndefined();
    expect((await last(["Mỗi tuần nên ăn cá mấy lần?"])).content).toMatch(/2 phần cá/);
    expect((await last(["Mỗi ngày nên ăn rau mấy bữa?"])).content).toMatch(/5 phần/);
    expect((await last(["Bao nhiêu tuổi thì trẻ có thể ăn mật ong?"])).content).toMatch(/dưới 1 tuổi/);
    expect((await last(["Bao lâu thì nên đánh giá quán sau khi dùng ưu đãi?"])).dish).toBeUndefined();
    expect((await last(["Ngoài tarot, Lomi còn giúp tôi tâm sự được không?"])).tarot).toBeFalsy();
    expect((await last(["toi muon Quet ma ko thay ai, co phai app hong?"])).content).toMatch(/bộ lọc/);
    expect((await last(["Uống nước dừa có làm tăng đường huyết không?"])).stuck).toBeUndefined();
  }, T);
  it("Danh sách ChatGPT lần 5 (31/10): người lớn tuổi, tâm sự, tarot, hỗn hợp", async () => {
    expect((await last(["chú đăng ký tài khoản rồi mà nó cứ báo chưa xác minh chú bấm gửi lại mấy lần rồi giờ chú phải làm sao con"])).content).toMatch(/không gửi email xác minh/);
    expect((await last(["ông muốn tìm quán cơm gần chợ đà lạt giá vừa phải có chỗ ngồi thoải mái ông đi với bà nhà ông hai người thôi"])).dish).toBe("com");
    expect((await last(["bà muốn hỏi cái thuốc huyết áp bà quên uống sáng nay rồi giờ chiều rồi có uống bù không bà 68 tuổi"])).content).toMatch(/đừng uống gấp đôi/);
    const h1 = await chat(["Em sợ về nhà", "Ba mẹ hay cãi nhau"]);
    expect(h1[0].content).toMatch(/111/);
    expect(h1[1].content).not.toMatch(/Cặp đôi/);
    expect((await chat(["Em mới chia tay", "Bạn bảo em vô tâm"]))[1].content).not.toMatch(/Lomi bảo em/);
    expect((await chat(["Em lo chuyện cưới", "Hai bên không thống nhất"]))[1].content).toMatch(/hai nhà|Hai bên/);
    const t1 = await chat(["Rút bài tình yêu đi", "Có phải người cũ không"]);
    expect(t1[1].heart).toBeUndefined();
    expect(t1[1].content).toMatch(/một người cụ thể/);
    expect((await chat(["Rút tarot tiền bạc", "Lá này tốt không", "Có hết nợ năm nay không"]))[2].tarot).toBeTruthy();
    const m1 = await chat(["Anh muốn đặt xe đi quán nướng", "Anh bị gout", "Đặt xe xong chưa"]);
    expect(m1[2].content).toMatch(/không tự đặt xe/);
    expect((await chat(["Tui đau bụng từ sáng", "Có quán cháo gần đây ko", "Quán cháo có ưu đãi không?"]))[2].faqId).toBeUndefined();
    const m2 = await chat(["Con em sốt", "Bé 2 tháng", "38 độ", "Tìm xe đi bệnh viện", "Có quán cháo gần đó không", "À app báo lỗi", "Bé vẫn sốt"]);
    expect(m2[6].content).toMatch(/dưới 3 tháng/);
  }, T);
  it("Danh sách ChatGPT lần 7 (31/10): đại từ, câu cụt, ngoài khả năng, liều/chẩn đoán, vùng miền", async () => {
    expect((await chat(["Tôi đang đọc thẻ về thiếu máu.", "Vậy còn nó có làm chóng mặt không?"]))[1].content).toMatch(/thiếu máu/);
    expect((await chat(["Tôi uống trà xanh buổi chiều rồi khó ngủ.", "Nó có phải nguyên nhân không?"]))[1].content).toMatch(/trà xanh/);
    expect((await chat(["Tôi đang bị đau đầu và uống thuốc giảm đau.", "Cái đó có ảnh hưởng dạ dày không?"]))[1].content).toMatch(/thuốc giảm đau/);
    expect((await chat(["Lomi có thể đặt xe cho tôi không?", "Thôi"]))[1].content).toMatch(/không sao/);
    expect((await last(["Bạn nhắn cho chủ quán hỏi món còn không, nhẹ nhàng thôi."])).content).toMatch(/không tự nhắn tin thay bạn/);
    expect((await last(["Tôi uống kháng sinh được 2 ngày, hết sốt rồi thì ngưng được chứ?"])).content).toMatch(/uống đủ số ngày/);
    expect((await last(["Đường huyết cao vậy là tiểu đường chắc rồi đúng không?"])).content).toMatch(/không chẩn đoán được/);
    expect((await last(["Tôi bị chóng mặt, chắc thiếu máu nên uống sắt nhỉ?"])).content).toMatch(/không chẩn đoán được/);
    expect((await last(["Uống 3 viên vitamin C một lúc chắc cũng được mà?"])).content).toMatch(/không nêu liều/);
    expect((await last(["Tôi uống thuốc ngủ của bạn một viên chắc không sao đâu ha?"])).content).toMatch(/Đừng dùng thuốc kê cho người khác/);
    expect((await last(["Uống thuốc dị ứng xong buồn ngủ quá trời, chạy xe dc ko?"])).content).toMatch(/đừng lái xe/);
    expect((await last(["Bé bị nóng hổi, sốt 38 độ thì làm răng?"])).content).toMatch(/sốt/);
    expect((await last(["Chời ơi, Quẹt của tui hổng thấy ai hết trơn, bị gì dzậy?"])).faqId).toBe("quetwhat");
    expect((await last(["Tui hk nhận dc OTP, thử mấy lần rồi, ntn giờ?"])).content).toMatch(/không gửi mã OTP/);
    expect((await last(["Tìm quán cf yên tĩnh để làm việc giúp tui vs."])).dish).toBe("cafe");
    expect((await last(["Bé 2 tháng sốt 38 độ, có thể đợi mai khám không?"])).content).toMatch(/dưới 3 tháng/);
  }, T);
  it("01/11 — hiểu câu vòng 1: chủ thể / đối tượng (câu đảo), loại câu hỏi, từ khoá bẫy", async () => {
    // Câu nhân quả đảo vị trí ("Y có phải do X không") → trả lời đúng quan hệ X → Y như câu xuôi, không đọc cả thẻ Y
    const rev = await last(["mất ngủ có phải do cà phê không"]);
    expect(rev.content).toMatch(/\*\*cà phê\*\* có gây \*\*mất ngủ\*\*/);
    expect(rev.content).not.toMatch(/Mất ngủ\*\* là gì/);
    expect((await last(["bị mất ngủ là vì uống cà phê hả"])).content).toMatch(/cà phê\*\* có gây \*\*mất ngủ/);
    expect((await last(["gan nhiễm mỡ là do rượu hả"])).content).toMatch(/\*\*rượu\*\* có gây \*\*gan nhiễm mỡ/);
    expect((await last(["bị tiểu đường có phải do ăn nhiều đường không"])).content).not.toMatch(/không đường\*\* là món/);
    expect((await last(["vì sao uống cà phê lại mất ngủ"])).content).toMatch(/cà phê\*\* có gây \*\*mất ngủ/);
    // "trà sữa" là trà (chữ chính đứng trước), không phải sữa
    expect((await last(["trà sữa có gây mập không"])).content).not.toMatch(/Sữa gây/);
    // Loại câu hỏi: "bao lâu thì hết / lành" = diễn tiến; "là gì" = định nghĩa; "ở đâu" = nơi chốn
    expect((await last(["thủy đậu bao lâu thì lành"])).content).toMatch(/Diễn tiến/);
    expect((await last(["thủy đậu là gì"])).content).not.toMatch(/Diễn tiến/);
    expect((await last(["sốt xuất huyết bao lâu thì hết"])).content).toMatch(/Diễn tiến/);
    expect((await last(["tiêm phòng cúm ở đâu"])).content).toMatch(/chưa có danh sách điểm tiêm/);
    expect((await last(["khám thủy đậu ở đâu"])).content).toMatch(/trạm y tế/);
    expect((await last(["khi nào thủy đậu cần đi khám"])).content).not.toMatch(/trạm y tế/);
    expect((await last(["viêm họng ở đâu"])).content).toMatch(/khám viêm họng ở đâu/);
    // "khác nhau ở đâu" là so sánh, không phải hỏi chỗ
    const df = await last(["viêm dạ dày với trào ngược khác nhau ở đâu"]);
    expect(df.content).toMatch(/đặt cạnh nhau/);
    expect(df.content).not.toMatch(/trạm y tế/);
    expect((await last(["đau đầu với đau nửa đầu khác nhau thế nào"])).content).toMatch(/\*\*đau đầu\*\*:[\s\S]*\*\*Đau nửa đầu|\*\*đau đầu\*\*:[\s\S]*\*\*đau nửa đầu/i);
    // "bao nhiêu nước" là lượng đồ uống; "bao nhiêu ml hạ sốt" mới là xin liều
    expect((await last(["mỗi ngày nên uống bao nhiêu nước"])).content).not.toMatch(/không nêu liều/);
    expect((await last(["bé uống bao nhiêu ml hạ sốt"])).content).toMatch(/không tính liều/);
    // Bệnh + món → theo bệnh; không bệnh → thông tin chung
    expect((await last(["đau dạ dày có nên uống cà phê không"])).content).toMatch(/Viêm dạ dày/);
    // Từ khoá bẫy: tên quán viết hoa, máy móc "bị sốt", chữa cháy, con vật
    const shop = await last(["quán Đau Đầu ở đâu"]);
    expect(shop.med).toBeUndefined();
    expect(shop.content).toMatch(/tên quán/);
    expect((await last(["điện thoại bị sốt pin"])).med).toBeUndefined();
    expect((await last(["chữa cháy thế nào khi bếp bén lửa"])).content).toMatch(/114/);
    const cat = await last(["con mèo nhà tui bị tiêu chảy"]);
    expect(cat.content).toMatch(/thú y/);
    expect(cat.content).not.toMatch(/thường gặp do/);
    // Mốc "tới 3-4h sáng" là giờ kết thúc, không phải "sáng nay"
    expect((await last(["A chơi game tới 3-4h sáng"])).heart).toBe("addict");
  }, T);
  it("01/11 — hiểu câu vòng 2: phủ định, mệnh đề điều kiện, đính chính / đổi ý", async () => {
    // Phủ định: "không phải A mà là B" → theo B; đối chứng "A mà không phải B" → theo A
    expect((await last(["không phải đau đầu mà là đau bụng thì làm sao"])).content).toMatch(/đau bụng/);
    expect((await last(["đau đầu mà không phải đau bụng thì làm sao"])).content).toMatch(/Đau đầu/);
    const self = await last(["không phải con tôi mà là tôi bị sốt"]);
    expect(self.content).not.toMatch(/bé|trẻ nhỏ/i);
    expect((await last(["không phải tôi mà là con tôi bị sốt"])).content).toMatch(/bé|trẻ/i);
    // Phủ định tu từ / giả định → câu hỏi thẳng
    expect((await last(["chẳng lẽ uống cà phê không gây mất ngủ"])).content).toMatch(/cà phê\*\* có gây \*\*mất ngủ/);
    expect((await last(["cà phê đâu có gây mất ngủ đâu đúng không"])).content).toMatch(/cà phê\*\* có gây \*\*mất ngủ/);
    expect((await last(["cúm không lây đúng không"])).content).toMatch(/chuyện lây của \*\*Cúm/);
    // "làm gì" là hỏi cách chăm sóc, không phải hỏi ăn uống; "ngủ không ngon giấc" không phải câu đổi giao diện
    expect((await last(["không ngủ được thì làm gì"])).content).not.toMatch(/Ăn uống với|nên ăn uống thế nào/);
    expect((await last(["ngủ được nhưng không ngon giấc"])).faqId).toBeUndefined();
    // Mệnh đề phụ: "sau khi ăn có nên đi ngủ liền không" là câu hỏi, không phải chào đi ngủ; "nếu bé…" không thành chủ ngữ
    expect((await last(["sau khi ăn có nên đi ngủ liền không"])).content).not.toMatch(/Ngủ ngon nha|Chúc bạn ngủ/);
    expect((await last(["nếu bé sốt 39 độ thì có cần đi viện không"])).content).not.toMatch(/^Nếu bé/);
    expect((await last(["tuần trước con tôi bị cúm, giờ vẫn còn ho, có sao không"])).content).not.toMatch(/“tuần trước”/);
    expect((await last(["nếu đăng ưu đãi thì có mất phí không"])).content).toMatch(/miễn phí/);
    // Đính chính: bỏ ý cũ, ghép ý mới vào đúng chỗ, giữ loại câu hỏi
    expect((await chat(["gout kiêng gì", "không, ý mình là tiểu đường"]))[1].content).toMatch(/Ăn uống với \*\*Tiểu đường|Tiểu đường nên ăn uống/);
    expect((await chat(["cúm là gì", "à không, ý là cảm lạnh"]))[1].med?.id).toBe("cam-lanh");
    expect((await chat(["cà phê có gây mất ngủ không", "ý là trà xanh"]))[1].content).toMatch(/trà xanh\*\* có gây \*\*mất ngủ/);
    expect((await chat(["vitamin C có tác dụng gì", "à mình hỏi vitamin D"]))[1].content).not.toMatch(/Vitamin C/);
    const who = await chat(["con tôi bị sốt", "à nhầm, là tôi bị sốt"]);
    expect(who[1].content).not.toMatch(/Tôi bao nhiêu tuổi|là tôi nha/);
    const dd = await chat(["đau đầu nên ăn gì", "nhầm, ý tui là đau bụng"]);
    expect(dd[1].content).not.toMatch(/Đau đầu/);
    const tb = await chat(["rút bài tarot tình yêu", "thôi không bói nữa, cho hỏi đau lưng"]);
    expect(tb[1].content).toMatch(/đau lưng/);
    expect(tb[1].tarot).toBeFalsy();
  }, T);
  it("01/11 — hiểu câu vòng 3: đại từ / tỉnh lược, người được nói tới, tiếng địa phương", async () => {
    // Tỉnh lược "vậy còn X": thay X vào đúng chỗ, giữ loại câu hỏi
    expect((await chat(["cúm là gì", "vậy còn cảm lạnh"]))[1].med?.id).toBe("cam-lanh");
    expect((await chat(["cà phê có gây mất ngủ không", "còn trà thì sao"]))[1].content).toMatch(/\*\*trà\*\* có gây \*\*mất ngủ/);
    expect((await chat(["ung thư phổi có phải do hút thuốc không", "vậy còn thuốc lá điện tử"]))[1].content).toMatch(/thuốc lá điện tử\*\* có gây \*\*ung thư phổi/);
    const kid = await chat(["tôi bị sốt", "thế còn bé thì sao"]);
    expect(kid[1].content).toMatch(/bé|trẻ/);
    expect(kid[1].content).not.toMatch(/Về \*\*bé\*\* thì Lomi/);
    // đối chứng: "còn bia thì sao" sau "gout kiêng gì" vẫn là hỏi món với gout
    expect((await chat(["gout kiêng gì", "còn bia thì sao"]))[1].content).toMatch(/Gout/);
    // Người được nói tới: tuổi chen giữa không làm mất người bệnh; người già không nhận lời dặn cho trẻ
    expect((await last(["mẹ tôi 75 tuổi bị sốt"])).content).toMatch(/^Mẹ bạn/);
    const old = await last(["ông tôi 80 tuổi bị ho"]);
    expect(old.content).toMatch(/^Ông bạn/);
    expect(old.content).not.toMatch(/Với trẻ nhỏ/);
    expect((await last(["con tôi 2 tuổi bị sốt"])).content).toMatch(/bé|trẻ/);
    // Loại câu hỏi khi kể triệu chứng: "thì làm gì" → phần chăm sóc, không đọc cả thẻ
    expect((await last(["ko ngủ dc thì lm j"])).content).toMatch(/Với \*\*Mất ngủ\*\*, nên/);
    // "quán này có ưu đãi không" (chưa nói quán nào) ≠ phàn nàn quán không giữ ưu đãi
    const qn = await last(["quán ni có ưu đãi không"]);
    expect(qn.content).not.toMatch(/Báo cáo/);
    expect(qn.content).toMatch(/quán nào/);
    expect((await chat(["tìm quán phở", "chỗ đó có ưu đãi không"]))[1].content).toMatch(/Phở/);
    // Tiếng địa phương: "bị chi mà mệt dữ rứa" không phải báo lỗi app; "răng mà ho hoài" là hỏi vì sao
    expect((await last(["bị chi mà mệt dữ rứa"])).content).not.toMatch(/App đang trục trặc/);
    expect((await last(["răng mà ho hoài rứa"])).content).toMatch(/Nguyên nhân/);
    expect((await last(["tiểu đường ăn chuối được hông nhen"])).content).toMatch(/Tiểu đường/);
  }, T);
  it("01/11 — hiểu câu vòng 4: hai ý trong một câu, câu ghép, sửa ý / tỉnh lược khi chưa có câu trước", async () => {
    // Hai ý cùng một bệnh → trả lời cả hai phần (đối chứng: một ý thì một phần)
    const two = await last(["cúm có lây không và bao lâu thì khỏi"]);
    expect(two.content).toMatch(/chuyện lây của \*\*Cúm/);
    expect(two.content).toMatch(/Diễn tiến của \*\*Cúm/);
    const one = await last(["cúm có lây không"]);
    expect(one.content).not.toMatch(/Diễn tiến/);
    const sxh = await last(["sốt xuất huyết là gì và có nguy hiểm không"]);
    expect(sxh.content).toMatch(/Sốt xuất huyết\*\* là gì/);
    expect(sxh.content).toMatch(/khám|115/);
    const dd = await last(["tôi bị đau dạ dày, uống cà phê được không, ăn cay được không"]);
    expect(dd.content).toMatch(/caffeine/);
    expect(dd.content).toMatch(/cay/);
    // Hai người, hai chuyện → không gộp thành một người bị cả hai
    const p2 = await last(["con tôi bị sốt còn tôi bị ho"]);
    expect(p2.content).not.toMatch(/bé đang có: \*\*sốt và ho/);
    expect(p2.content).toMatch(/Còn ý/);
    // Hai bệnh hỏi ăn chung → đặt cạnh nhau phần ăn uống của từng bệnh
    const dz = await last(["mẹ tôi bị tiểu đường, bố tôi bị gout, nấu món gì cho cả hai"]);
    expect(dz.content).toMatch(/tiểu đường/i);
    expect(dz.content).toMatch(/gout/i);
    // "với lại" / "rồi + lời nhờ" tách hai việc, ý sau thành nút bấm
    expect((await last(["đau đầu uống gì, với lại quán phở nào ngon"])).content).toMatch(/Còn ý “Quán phở nào ngon”/);
    expect((await last(["tìm quán phở rồi chỉ tôi cách nhận ưu đãi"])).content).toMatch(/Còn ý “Chỉ tôi cách nhận ưu đãi”/);
    // Cơ quan làm hậu quả: "ăn mặn có hại thận không" → bệnh thận, có trích dòng nguồn
    expect((await last(["ăn mặn có hại thận không"])).content).toMatch(/có hại cho \*\*thận/);
    // Câu hỏi thông tin không bị đáp bằng lời an ủi
    expect((await last(["bao lâu thì nên đi khám răng"])).content).not.toMatch(/Đi khám đều đặn là tốt/);
    // Sửa ý / tỉnh lược ở câu đầu tiên: hiểu phần sau, hoặc hỏi lại đúng một câu
    expect((await last(["à không, ý là tiểu đường"])).content).toMatch(/Tiểu đường/);
    const e0 = await last(["vậy còn trẻ em"]);
    expect(e0.content).toMatch(/muốn hỏi chuyện gì về trẻ em/);
    expect(e0.content).not.toMatch(/18 tuổi/);
  }, T);
  it("01/11 — hiểu câu vòng 5: câu mới trộn các loại (thành ngữ, 'có phải X gây Y', lây bao lâu, không uống thuốc, phương ngữ)", async () => {
    // "có phải X gây Y" — từ hỏi đứng đầu không thuộc chủ thể; thiếu "có" vẫn là câu hỏi quan hệ
    const cp = await last(["có phải cà phê gây mất ngủ không"]);
    expect(cp.content).toMatch(/\*\*cà phê\*\* có gây \*\*mất ngủ/);
    expect(cp.content).not.toMatch(/phải cà phê/);
    expect((await last(["mất ngủ làm tăng cân không"])).content).not.toMatch(/từ khi dùng mất ngủ/);
    expect((await last(["nổi mụn có phải do thức khuya không"])).content).not.toMatch(/dùng thức khuya/);
    // "lây bao lâu" là hỏi chuyện lây, đối chứng "bao lâu thì khỏi" là diễn tiến
    expect((await last(["bệnh tay chân miệng lây bao lâu"])).content).toMatch(/chuyện lây của/);
    expect((await last(["tay chân miệng bao lâu thì khỏi"])).content).toMatch(/Diễn tiến/);
    // "đau răng nên đi khám ở đâu" = hỏi chỗ (có chữ "đau" vẫn nhận được "ở đâu")
    expect((await last(["đau răng nên đi khám ở đâu"])).content).toMatch(/chưa có danh sách/);
    // phủ định: "không uống thuốc" → cách không dùng thuốc; "đâu phải tôi bị sốt, tôi chỉ hơi mệt" → không nói sốt
    expect((await last(["mất ngủ mà không uống thuốc thì có cách nào"])).content).toMatch(/Với \*\*Mất ngủ\*\*, nên/);
    expect((await last(["đâu phải tôi bị sốt, tôi chỉ hơi mệt thôi"])).content).not.toMatch(/sốt/);
    expect((await last(["không phải ho khan mà là ho có đờm thì sao"])).content).not.toMatch(/Cảm lạnh/);
    // thành ngữ cảm xúc không phải triệu chứng
    expect((await last(["sốt ruột quá"])).content).not.toMatch(/sốt\*\*|chưa chắc hiểu/);
    expect((await last(["đau lòng quá"])).med).toBeUndefined();
    expect((await last(["không ai nói chuyện với tôi cả"])).content).toMatch(/[Cc]ô đơn/);
    // từ khoá bẫy: tên quán có chữ "Bầu"; app "như bị cảm"
    expect((await last(["quán Bà Bầu có món gì"])).content).toMatch(/tên quán/);
    expect((await last(["app bị đơ như bị cảm"])).content).toMatch(/app bị trục trặc/);
    // "trước khi đi ngủ nên ăn gì" là hỏi ăn uống cho giấc ngủ, không phải gợi ý món
    expect((await last(["trước khi đi ngủ nên ăn gì"])).dish).toBeUndefined();
    // hai món cùng bệnh, nói "và X thì sao"; "đậu" không bị đọc thành "dâu"
    const g = await last(["gout có ăn được đậu không và bia thì sao"]);
    expect(g.content).toMatch(/đậu/);
    expect(g.content).toMatch(/bia/);
    // phương ngữ / câu hỏi triệu chứng không có "bị"
    expect((await last(["sốt rứa có răng không"])).content).toMatch(/Nên đi khám/);
    expect((await last(["gout ăn tôm đặng không"])).content).not.toMatch(/tôm đặng/);
    expect((await last(["tui bị tiêu chảy, mần răng chừ"])).content).toMatch(/Với \*\*Tiêu chảy\*\*, nên/);
  }, T);
});
