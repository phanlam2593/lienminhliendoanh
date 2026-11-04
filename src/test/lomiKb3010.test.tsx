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
    // 04/11: chính sách mới — vitamin / khoáng chất có số liệu NHS thì nêu nhu cầu mỗi ngày + ngưỡng không nên vượt
    expect((await last(["Uống 3 viên vitamin C một lúc chắc cũng được mà?"])).content).toMatch(/trên 1\.000 mg\/ngày/);
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
  it("01/11 — hiểu câu vòng 6: câu hỏi app (loại câu hỏi, từ khoá bẫy) và hội thoại nhiều lượt", async () => {
    // "không nhắn tin được" là lỗi, không phải người yêu lạnh nhạt; đối chứng "người yêu không nhắn tin" vẫn là tâm sự
    const mt = await last(["sao tôi không nhắn tin được"]);
    expect(mt.content).toMatch(/Không nhắn \/ gọi được/);
    expect(mt.heart).toBeUndefined();
    expect((await last(["người yêu không nhắn tin"])).content).not.toMatch(/Không nhắn \/ gọi được/);
    // "bị chặn thì sao biết" ≠ "chặn thế nào"
    expect((await last(["bị người khác chặn thì sao biết"])).content).toMatch(/không gửi thông báo/);
    expect((await last(["chặn người khác thế nào"])).content).toMatch(/Chặn người dùng/);
    // quán của mình không hiện → trạng thái duyệt, không phải mẹo quảng cáo
    expect((await last(["quán tôi bị ẩn là sao"])).content).toMatch(/duyệt tay/);
    expect((await last(["làm sao để quán tôi hiện trên khám phá"])).content).toMatch(/hiện công khai/);
    // quyền riêng tư: nói thật là chưa chắc, không đưa nhầm hướng dẫn đổi ảnh như câu trả lời
    expect((await last(["ai thấy được số điện thoại của tôi"])).content).toMatch(/chưa chắc/);
    expect((await last(["tôi bị app chặn rồi"])).content).toMatch(/Tài khoản bị khoá/);
    expect((await last(["lomi có bị bệnh không"])).content).not.toMatch(/chưa có kiến thức/);
    expect((await last(["ưu đãi này có độc không"])).content).toMatch(/không chứa mã độc/);
    // hội thoại: "bé bị ho" rồi "có cần đi khám không" → thẻ ho (không phải cúm)
    expect((await chat(["bé bị ho", "có cần đi khám không"]))[1].med?.id).toBe("ho");
    expect((await chat(["cúm có lây không", "vậy bao lâu thì hết lây"]))[1].content).toMatch(/chuyện lây của \*\*Cúm/);
    expect((await chat(["đổi mật khẩu ở đâu", "còn đổi email"]))[1].faqId).toBe("avatar");
    expect((await chat(["ưu đãi là gì", "nhận nó ở đâu"]))[1].stuck).toBeUndefined();
    const fw = await chat(["gout kiêng gì", "nhầm, tôi hỏi cho chồng tôi"]);
    expect(fw[1].content).toMatch(/chồng bạn/);
    expect(fw[1].content).toMatch(/Gout/);
    expect((await chat(["tôi bị cảm", "à không phải cảm, cúm"]))[1].content).toMatch(/cúm/i);
    expect((await chat(["tìm quán phở", "à quên, tôi bị gout, ăn phở được không"]))[1].content).toMatch(/Gout/);
  }, T);
  it("01/11 — hiểu câu vòng 7: thông tin nền đầu câu, an toàn (say không biết gì), người thân kể bệnh, điều kiện tìm quán", async () => {
    // Câu dài: chữ ở phần kể nền không được coi là điều được hỏi
    expect((await last(["hôm qua đi đám cưới về ăn nhiều đồ biển, sáng nay bị nổi mẩn ngứa khắp người, có phải dị ứng không"])).content).not.toMatch(/“đám cưới”/);
    expect((await last(["mẹ tôi năm nay 65 tuổi, bị tiểu đường mười năm, gần đây hay tê chân, có sao không"])).content).not.toMatch(/“mười năm”/);
    expect((await last(["bé nhà tôi 8 tháng, mấy hôm nay biếng ăn, có sao không"])).content).not.toMatch(/“tháng mấy”/);
    // An toàn: say tới mức không biết gì → khẩn; đối chứng: rủ đi nhậu vẫn là chuyện vui
    const drunk = await last(["thằng bạn tôi uống rượu say không biết gì"]);
    expect(drunk.content).toMatch(/115/);
    expect(drunk.content).not.toMatch(/vui rồi/);
    // con vật ăn phải thứ lạ → thú y ngay; người ăn phải bị dị ứng → sức khoẻ người
    const cat = await last(["mèo nhà tôi ăn phải chocolate"]);
    expect(cat.content).toMatch(/thú y \*\*ngay\*\*/);
    expect((await last(["tôi ăn phải chocolate bị dị ứng"])).content).not.toMatch(/thú y/);
    // Không chèn con số người dùng không nói
    const fast = await last(["giảm cân bằng cách nhịn ăn được không"]);
    expect(fast.content).not.toMatch(/10 kg/);
    expect(fast.content).toMatch(/không an toàn/);
    expect((await last(["giảm 5kg trong 1 tuần được không"])).content).not.toMatch(/10 kg/);
    // Người thân kể bệnh có thẻ → hỏi lại đúng người + đúng bệnh, không "kể thêm đi" chung chung
    const mom = await last(["mẹ tôi bị phù chân"]);
    expect(mom.content).toMatch(/Mẹ bạn bị \*\*phù chân\*\*/);
    expect(mom.med?.id).toBe("phu-chan");
    const preg = await last(["chị tôi mang thai bị phù chân"]);
    expect(preg.content).toMatch(/Chị bạn/);
    expect(preg.content).toMatch(/115/);
    // Tìm quán kèm điều kiện chưa lọc được → vẫn đưa quán nhưng nói rõ
    const late = await last(["tìm quán cà phê mở khuya"]);
    expect(late.places?.length).toBeGreaterThan(0);
    expect(late.content).toMatch(/chưa lọc được theo \*\*giờ mở cửa/);
  }, T);
  it("01/11 — hiểu câu vòng 8: viết tắt / teen code / gõ sai, câu một chữ, 'bò không' ≠ 'bổ không'", async () => {
    // "thịt bò không" bỏ dấu trùng "bổ không" — câu có dấu thì hỏi gout + bò; đối chứng "thịt bò có bổ không" vẫn là hỏi chất
    expect((await last(["gout có ăn đc thịt bò ko"])).content).toMatch(/Với \*\*Gout\*\*/);
    expect((await last(["gout có ăn được thịt bò không"])).content).toMatch(/Gout/);
    expect((await last(["thịt bò có bổ không"])).content).toMatch(/có những chất gì/);
    // viết tắt
    expect((await last(["tiểu đg ăn xoài đc k"])).content).toMatch(/Tiểu đường/);
    expect((await last(["acc bị khóa"])).content).toMatch(/Tài khoản bị khoá/);
    expect((await last(["sao ko nhận đc voucher"])).content).not.toMatch(/Tài khoản bị khoá thì/);
    // câu hỏi định nghĩa tính năng / một chữ triệu chứng
    expect((await last(["voucher là gì"])).content).toMatch(/\*\*Ưu đãi\*\* \(voucher\) là/);
    expect((await last(["ưu đãi?"])).stuck).toBeUndefined();
    const fv = await last(["sốt"]);
    expect(fv.content).toMatch(/\*\*sốt\*\*/);
    expect(fv.quick?.length).toBeGreaterThan(0);
    // gõ sót dấu đ sau "đau"
    expect((await last(["đau dầu quá"])).content).toMatch(/đau đầu/i);
  }, T);
  it("01/11 — hiểu câu vòng 9: ai / loại nào / có nên, 'khi bị' là điều kiện, mốc tuổi ≠ tuổi Lomi", async () => {
    // "ai dễ bị X" → đối tượng nguy cơ (phần nguyên nhân / yếu tố nguy cơ), không phải menu chung
    expect((await last(["ai dễ bị gout"])).content).toMatch(/yếu tố nguy cơ của \*\*Gout/);
    // "X nào tốt cho người Y" → ăn uống theo bệnh
    expect((await last(["thịt nào tốt cho người gout"])).content).toMatch(/Ăn uống với \*\*Gout/);
    expect((await last(["loại trái cây nào tốt cho người tiểu đường"])).stuck).toBeUndefined();
    // "uống gì cho dễ ngủ" → ăn uống cho giấc ngủ, không phải gợi ý đồ uống
    expect((await last(["uống gì cho dễ ngủ"])).content).toMatch(/Mất ngủ/);
    // "khi bị Y" là điều kiện, không phải "X gây Y"; đối chứng câu nhân quả thật vẫn đọc như cũ
    expect((await last(["có nên cho bé uống sữa khi bị tiêu chảy không"])).content).not.toMatch(/có gây \*\*tiêu chảy/);
    expect((await last(["có nên tập thể dục khi bị cảm không"])).content).not.toMatch(/có gây \*\*cảm/);
    expect((await last(["cà phê có gây mất ngủ không"])).content).toMatch(/có gây \*\*mất ngủ/);
    // so sánh triệu chứng hai bệnh; hai kiểu vận động
    const cs = await last(["cúm có triệu chứng gì khác cảm lạnh"]);
    expect(cs.content).toMatch(/\*\*cúm\*\*:/i);
    expect(cs.content).toMatch(/\*\*cảm lạnh\*\*:/i);
    expect((await last(["đi bộ hay chạy bộ tốt hơn"])).content).toMatch(/không dám nói cái nào hơn/);
    // "có nên mua iPhone" không phải đồ ăn; mốc tuổi cho một việc ≠ tuổi của Lomi ≠ tuổi dùng app
    expect((await last(["có nên mua iPhone không"])).content).not.toMatch(/Thèm|làm một bữa/);
    const eye = await last(["bao nhiêu tuổi thì nên đi khám mắt"]);
    expect(eye.content).not.toMatch(/Không có tuổi|là robot|18 tuổi/);
    expect((await last(["lomi bao nhiêu tuổi"])).content).toMatch(/Không có tuổi|là robot/);
    expect((await last(["mấy tuổi được dùng app"])).content).toMatch(/18 tuổi/);
    // ngưỡng sốt
    expect((await last(["sốt bao nhiêu độ là cao"])).stuck).toBeUndefined();
  }, T);
  it("01/11 — hiểu câu vòng 10: hội thoại dài đổi chủ đề, câu hỏi tiếp ngắn giữ đúng ngữ cảnh", async () => {
    // trẻ sốt không hạ → "giờ sao" là hỏi phải làm gì, theo thẻ TRẺ EM (không phải món "giờ", không phải thẻ người lớn)
    const kid = await chat(["con tôi 5 tuổi", "bị sốt 39 độ", "uống hạ sốt rồi", "vẫn chưa hạ", "giờ sao"]);
    expect(kid[4].content).toMatch(/Sốt ở trẻ em/);
    expect(kid[4].content).not.toMatch(/Về \*\*giờ\*\*/);
    // đang nói đau dạ dày mà "tìm quán cháo" là lệnh tìm quán; hỏi "cháo ăn được không" mới là hỏi món
    const sto = await chat(["tôi bị đau dạ dày", "tìm quán cháo", "mấy giờ mở cửa"]);
    expect(sto[1].places?.length).toBeGreaterThan(0);
    expect(sto[2].content).toMatch(/giờ mở cửa/);
    expect((await chat(["tôi bị đau dạ dày", "cháo ăn được không"]))[1].places).toBeUndefined();
    // câu hỏi tiếp ngắn trong mạch app
    expect((await chat(["ưu đãi là gì", "làm sao nhận", "hết hạn chưa"]))[2].content).toMatch(/2 giờ/);
    expect((await chat(["đặt xe ở đâu", "giá sao", "trả bằng gì"]))[2].content).toMatch(/tiền mặt/);
    expect((await chat(["chủ quán không trả lời tin nhắn", "vậy gọi điện được không"]))[1].content).toMatch(/📞/);
    // câu hỏi tiếp ngắn trong mạch sức khoẻ
    expect((await chat(["tôi bị đau đầu", "do thiếu ngủ hả"]))[1].content).toMatch(/thiếu ngủ\*\* có gây \*\*đau đầu/);
    expect((await chat(["thủy đậu có lây không", "con tôi bị thì có được đi học không"]))[1].content).toMatch(/đi học/);
    expect((await chat(["vitamin C có tác dụng gì", "uống nhiều có sao không"]))[1].content).not.toMatch(/không có dữ liệu riêng về thuốc đó/);
    // tarot: "vậy tôi nên làm gì" sau trải bài → tóm lại trải bài + quyết định ở người dùng
    const tr = await chat(["rút bài tình yêu", "vậy tôi nên làm gì"]);
    expect(tr[1].content).toMatch(/quyết định vẫn là ở bạn/);
    expect(tr[1].stuck).toBeUndefined();
  }, T);
  it("01/11 — hiểu câu vòng 11: câu dài kiểu người lớn tuổi (không dấu câu), lời mở đầu 'cô muốn hỏi', hai bệnh một món", async () => {
    // "cô muốn hỏi con cô…" — người bệnh là con cô, không phải cô
    const c = await last(["cô muốn hỏi con cô 3 tuổi ho mấy hôm nay ban đêm ho nhiều lắm có cần đưa đi khám không"]);
    expect(c.content).not.toMatch(/ghi nhận cô đang có/);
    // "sưng đỏ đau … phải làm sao" — "đỏ đau" bỏ dấu trùng "do đâu" nhưng đây là hỏi cách xử lý
    expect((await last(["ông bị gout lâu rồi hôm qua ăn nhậu đám giỗ giờ ngón chân cái sưng đỏ đau quá phải làm sao con"])).content).toMatch(/Với \*\*Gout\*\*, nên/);
    expect((await last(["gout do đâu mà bị"])).content).toMatch(/Nguyên nhân/);
    // "uống thuốc ngủ được không" là hỏi thuốc, không phải món
    expect((await last(["chú bị mất ngủ cả tháng nay đêm nào cũng thức tới 3 giờ sáng uống thuốc ngủ được không con"])).content).toMatch(/không kê thuốc/);
    // hai bệnh + một món → xét với từng bệnh
    const two = await last(["bà năm nay 72 tuổi bị tiểu đường với huyết áp cao bà muốn hỏi ăn chuối được không con"]);
    expect(two.content).toMatch(/Tiểu đường/);
    expect(two.content).toMatch(/huyết áp/i);
    // đưa quán của mình lên app ≠ tìm quán
    const biz = await last(["cô có quán bún bò muốn đăng lên app cho người ta biết thì làm sao con"]);
    expect(biz.places).toBeUndefined();
    expect(biz.content).toMatch(/Tạo hồ sơ doanh nghiệp/);
  }, T);
  it("01/11 — hiểu câu vòng 12: đại từ sở hữu chen giữa bộ phận cơ thể, người khác không làm ≠ nhờ Lomi làm, thành ngữ", async () => {
    expect((await last(["tim tôi đập nhanh"])).content).toMatch(/tim đập nhanh/);
    expect((await last(["mắt tôi bị đỏ"])).content).toMatch(/đỏ mắt/);
    expect((await last(["bụng tôi đói"])).content).toMatch(/Đói/);
    expect((await last(["dạ dày tôi khó chịu"])).content).not.toMatch(/Ai làm bạn bực/);
    expect((await last(["bực mình quá"])).content).toMatch(/bực|Hít sâu|giận/i);
    // "họ không thèm nhắn cho tôi" là than phiền; "nhắn cho tôi chủ quán…" mới là nhờ làm thay
    const sad = await last(["họ không thèm nhắn cho tôi"]);
    expect(sad.content).not.toMatch(/không tự nhắn tin thay bạn|Vậy hả 😄/);
    expect((await last(["nhắn cho tôi chủ quán là tôi tới trễ nha"])).content).toMatch(/không tự nhắn tin thay bạn/);
    // "nôn nóng" là sốt ruột, không phải trời nóng
    expect((await last(["tôi nôn nóng quá"])).content).not.toMatch(/Nắng nóng/);
  }, T);
  it("01/11 — hiểu câu vòng 13: kể lại lời người khác, câu bị động, bị lừa / mất mã, tai nạn kể kèm mô tả", async () => {
    // "bạn tôi nói X" — hỏi X có đúng không, không phải người dùng bị bệnh
    expect((await last(["bạn tôi nói uống bia nhiều bị gout"])).content).toMatch(/uống bia nhiều\*\* có gây \*\*gout\*\* không/);
    expect((await last(["trên mạng nói ăn chuối lúc đói bị đau bụng"])).content).not.toMatch(/Bạn đang bị/);
    // đối chứng: lời người khác nói VỀ CHÍNH MÌNH vẫn là tâm sự
    expect((await last(["mẹ tôi nói tôi lười"])).content).not.toMatch(/có đúng không|có gây/);
    // bị động: "bị X làm cho Y" → X có làm Y không
    expect((await last(["tôi bị cà phê làm cho mất ngủ"])).content).toMatch(/cà phê\*\* có gây \*\*mất ngủ/);
    // bị lừa / giả danh → an toàn; mất mã ưu đãi → xem lại ưu đãi đã nhận
    const scam = await last(["tôi bị lừa mất tiền trên app"]);
    expect(scam.content).toMatch(/Đừng chuyển tiền/);
    expect(scam.content).not.toMatch(/miễn phí/);
    expect((await last(["có người giả làm chủ quán nhắn tin xin tiền"])).content).toMatch(/Đừng chuyển tiền/);
    expect((await last(["ưu đãi có mất tiền không"])).content).toMatch(/miễn phí/);
    expect((await last(["tôi làm mất mã ưu đãi"])).content).toMatch(/Ưu đãi đã nhận/);
    // tai nạn kể kèm mô tả → kiến thức xử trí, không lặp "bị bị"
    const dog = await last(["tôi bị chó cắn chảy máu"]);
    expect(dog.med?.id).toBe("cho-can");
    expect(dog.content).not.toMatch(/bị \*\*bị/);
  }, T);
  it("01/11 — hiểu câu vòng 14: 'có nên' là cân nhắc (không mặc định là có, không thêm chi tiết), câu xác nhận đã hiểu, câu hỏi khi kể đi khám", async () => {
    expect((await last(["có nên nhắn tin cho người yêu cũ không"])).content).toMatch(/quyết định của bạn/);
    expect((await last(["có nên tỏ tình không"])).content).not.toMatch(/đồng nghiệp/);
    expect((await last(["có nên tỏ tình với đồng nghiệp không"])).content).toMatch(/đồng nghiệp/);
    expect((await last(["có nên nâng cấp membership không"])).content).toMatch(/Membership mở khoá/);
    expect((await last(["app có bị virus không"])).content).not.toMatch(/app bị trục trặc/);
    expect((await last(["dạ, tôi hiểu rồi"])).content).not.toMatch(/kể tiếp/);
    expect((await last(["mai tôi đi khám răng, có cần chuẩn bị gì không"])).content).not.toMatch(/Đi khám đều đặn là tốt/);
    expect((await last(["cảm lạnh với dị ứng mũi khác gì nhau"])).content).toMatch(/đặt cạnh nhau/);
  }, T);
  it("01/11 — hiểu câu vòng 15: đính chính trong cùng câu, mẹo dân gian chỉ khi hỏi ăn / kiêng, 'ăn không ngon' ≠ chê quán, quẹt chưa ghép đôi", async () => {
    expect((await last(["tôi bị táo bón, à không, tiêu chảy"])).content).toMatch(/tiêu chảy/i);
    expect((await last(["tôi bị táo bón, à không, tiêu chảy"])).content).not.toMatch(/táo bón\*\*/i);
    expect((await last(["gout kiêng gì, à nhầm, tiểu đường"])).content).toMatch(/Tiểu đường/);
    expect((await last(["tôi bị nhức mỏi khắp người"])).content).not.toMatch(/kiêng măng/);
    expect((await last(["đau khớp có kiêng măng không"])).content).toMatch(/kiêng măng/);
    expect((await last(["tôi ăn không ngon"])).content).not.toMatch(/quán dở|chặt chém/);
    expect((await last(["sao quẹt hoài không ai thích"])).content).toMatch(/hai bên cùng thích/);
    expect((await last(["tìm nha sĩ gần đây"])).content).toMatch(/chưa có danh sách phòng khám/);
  }, T);
  it("01/11 — hiểu câu vòng 16: kể chuyện của NGƯỜI KHÁC trong tâm sự → đáp với vai người thân đang lo, không như chính người dùng bị", async () => {
    const dad = await last(["bố tôi nghiện rượu"]);
    expect(dad.content).toMatch(/bố bạn/i);
    expect(dad.content).not.toMatch(/bạn đã làm được rồi đó/);
    expect((await last(["tôi nghiện rượu"])).content).not.toMatch(/Thấy .* như vậy chắc bạn lo lắm/);
    expect((await last(["mẹ tôi hay lo lắng"])).content).toMatch(/mẹ bạn/i);
    expect((await last(["con tôi nghiện điện thoại"])).content).toMatch(/con bạn/i);
    const fr = await last(["bạn tôi bị trầm cảm, tôi phải làm sao"]);
    expect(fr.content).toMatch(/bạn của bạn/);
    expect(fr.content).toMatch(/115/);
    expect((await last(["tôi bị trầm cảm"])).content).not.toMatch(/Thấy .* như vậy chắc bạn lo lắm/);
  }, T);
  it("01/11 — hiểu câu vòng 17: từ tự xưng (bà / con / em / anh / chú) ≠ người thân; đại từ 'nó / anh ấy / bả / ổng' giữ đúng người", async () => {
    expect((await last(["bà bị mất ngủ mấy đêm nay"])).content).not.toMatch(/Thấy bà/);
    const g = await last(["bà tôi bị mất ngủ mấy đêm nay"]);
    expect(g.content).toMatch(/bà bạn/);
    expect(g.content).not.toMatch(/muốn chết/);
    expect((await last(["con bị đau bụng quá"])).content).not.toMatch(/bé đang có/);
    expect((await last(["con tôi bị đau bụng quá"])).content).toMatch(/bé/);
    expect((await last(["em bị sốt"])).content).not.toMatch(/Em bạn/);
    expect((await last(["em tôi bị sốt"])).content).toMatch(/Em bạn/);
    expect((await chat(["chồng tôi bị gout", "anh ấy ăn hải sản được không"]))[1].content).toMatch(/Gout/);
    expect((await chat(["tôi uống thuốc giảm đau", "nó có hại dạ dày không"]))[1].content).toMatch(/thuốc giảm đau/);
  }, T);
  it("01/11 — hiểu câu vòng 18: câu hỏi THAO TÁC của chủ quán → đúng câu hỏi thường gặp, không phải mẹo quảng cáo", async () => {
    expect((await last(["quán tôi đổi giờ mở cửa thì sửa ở đâu"])).faqId).toBe("bizedit");
    expect((await last(["quán tôi chuyển địa chỉ"])).faqId).toBe("bizedit");
    expect((await last(["ai thấy được ưu đãi của quán tôi"])).content).toMatch(/mọi thành viên/);
    expect((await last(["mã PIN của quán để làm gì"])).faqId).toBe("pin");
    expect((await last(["đổi mã PIN ở đâu"])).faqId).toBe("bizpin");
    expect((await last(["khách nhận ưu đãi thì tôi biết bằng cách nào"])).content).toMatch(/mã PIN/);
    expect((await last(["có xoá được đánh giá xấu không"])).content).toMatch(/chưa thấy/);
    expect((await last(["hồ sơ doanh nghiệp duyệt bao lâu"])).content).toMatch(/duyệt tay/);
    expect((await last(["một tài khoản tạo được mấy quán"])).faqId).toBe("bizmulti");
    // đối chứng: xin ý tưởng thu hút khách vẫn là tư vấn kinh doanh
    expect((await last(["quán tôi vắng khách quá, làm sao thu hút khách"])).faqId).toBeUndefined();
  }, T);
  it("01/11 — hiểu câu vòng 19: câu hỏi thao tác ở Đưa đón / Quẹt / Tin nhắn đúng loại câu hỏi; 'X được không' là hỏi app cho làm không", async () => {
    expect((await last(["đặt xe rồi bao lâu tài xế tới"])).faqId).toBe("ridetrack");
    expect((await last(["gửi đồ cồng kềnh được không"])).content).toMatch(/phụ phí/);
    expect((await last(["người tôi quẹt trái có thấy lại không"])).content).toMatch(/48 giờ/);
    expect((await last(["ai thấy được nhu cầu quẹt của tôi"])).content).toMatch(/cùng mục/);
    const img = await last(["gửi ảnh trong tin nhắn được không"]);
    expect(img.content).toMatch(/Gửi ảnh/);
    expect(img.content).not.toMatch(/không tự nhắn tin thay bạn/);
    // đối chứng: nhờ Lomi làm thay vẫn nói thật là không làm thay
    expect((await last(["nhắn cho chủ quán giúp tôi được không"])).content).toMatch(/không tự nhắn tin thay bạn/);
    expect((await last(["thu hồi tin nhắn được không"])).stuck).toBeUndefined();
  }, T);
  it("01/11 — hiểu câu vòng 20: tarot — 'không tin' không rút bài, hỏi nghĩa một lá, chữ đệm không thành câu hỏi, không có tử vi", async () => {
    const nb = await last(["tôi không tin tarot"]);
    expect(nb.tarot).toBeFalsy();
    expect(nb.content).toMatch(/Không tin cũng không sao/);
    const dt = await last(["lá Death có phải là chết không"]);
    expect(dt.content).toMatch(/Cái Chết/);
    expect(dt.content).not.toMatch(/chưa có kiến thức/);
    expect((await last(["rút một lá thôi"])).content).not.toMatch(/câu hỏi “thôi”/);
    expect((await last(["xem bói tử vi được không"])).tarot).toBeFalsy();
    expect((await chat(["bói tình yêu", "còn công việc thì sao"]))[1].content).not.toMatch(/vẫn như Lomi vừa nói/);
    // đối chứng: xin bói vẫn rút bài
    expect((await last(["bói tình yêu"])).tarot).toBeTruthy();
  }, T);
  it("01/11 — hiểu câu vòng 21: câu hỏi lồng trong lời mở đầu ('bạn có biết…', 'tôi tự hỏi liệu…', 'kể cho tôi về…', 'tóm tắt giúp tôi bệnh…')", async () => {
    expect((await last(["bạn có biết gout là gì không"])).content).toMatch(/Gout\*\* là gì/);
    expect((await last(["tôi tự hỏi liệu cà phê có làm mất ngủ không"])).content).toMatch(/\*\*cà phê\*\* có gây \*\*mất ngủ/);
    expect((await last(["nói tôi nghe về bệnh thủy đậu"])).content).toMatch(/Thuỷ đậu\*\* là gì/);
    const dm = await last(["kể cho tôi về tiểu đường đi"]);
    expect(dm.content).toMatch(/Tiểu đường\*\* là gì/);
    expect(dm.content).not.toMatch(/Bạn bị \*\*tiểu đường/);
    expect((await last(["tóm tắt giúp tôi bệnh gout"])).content).toMatch(/Gout/);
    expect((await last(["tóm tắt giúp tôi"])).content).toMatch(/tóm lại chuyện gì/);
    expect((await last(["mình đang phân vân không biết có nên đi khám không"])).content).toMatch(/khó chịu ở đâu/);
  }, T);
  it("01/11 — hiểu câu vòng 22: câu hỏi con số (mấy ký tự / mấy lần / tối đa / giá bao nhiêu) trả đúng con số; số liệu theo tuổi không đánh tráo", async () => {
    expect((await last(["mật khẩu tối thiểu mấy ký tự"])).content).toMatch(/6 ký tự/);
    expect((await last(["mat khau toi thieu may ky tu"])).content).toMatch(/6 ký tự/);
    expect((await last(["tên đăng nhập tối đa mấy ký tự"])).content).toMatch(/3–20 ký tự/);
    expect((await last(["mã PIN mấy số"])).content).toMatch(/4–8 ký tự/);
    expect((await last(["nhập sai PIN mấy lần thì bị khoá"])).content).toMatch(/sai 5 lần/);
    expect((await last(["mỗi người đánh giá được mấy lần"])).content).toMatch(/đánh giá 1 lần/);
    expect((await last(["membership giá bao nhiêu"])).content).toMatch(/^Dạ 🙂 .*49\.000đ\/tháng/);
    expect((await last(["dòng trạng thái tối đa mấy ký tự"])).content).toMatch(/60 ký tự/);
    expect((await last(["mã ưu đãi hết hạn sau mấy tiếng"])).content).toMatch(/2 giờ/);
    expect((await last(["tạo nhóm được bao nhiêu thành viên"])).content).toMatch(/50 người/);
    // đối chứng: hỏi cách làm vẫn ra hướng dẫn đầy đủ; thứ ngoài app cùng tên không lấy số của app
    expect((await last(["tạo nhóm chat thế nào"])).content).toMatch(/Vào Tin nhắn/);
    expect((await last(["nhóm máu O là gì"])).content).not.toMatch(/Tin nhắn/);
    expect((await last(["mật khẩu wifi quán là bao nhiêu"])).content).not.toMatch(/6 ký tự/);
    expect((await last(["mỗi tuần ăn cá mấy lần"])).content).toMatch(/cá/);
    expect((await last(["mỗi ngày uống mấy ly nước"])).content).toMatch(/Uống nước/);
    // số liệu theo tuổi
    const k5 = await last(["trẻ 5 tuổi ngủ bao nhiêu tiếng"]);
    expect(k5.content).toMatch(/từ 13 tuổi trở lên/);
    expect(k5.content).not.toMatch(/8–10 tiếng/);
    expect((await last(["bé 8 tháng tuổi ngủ bao lâu"])).content).toMatch(/trẻ nhỏ/);
    expect((await last(["con tôi 15 tuổi ngủ bao nhiêu là đủ"])).content).toMatch(/8–10 tiếng/);
    expect((await last(["con 10 tuổi nên tập thể dục bao nhiêu"])).content).toMatch(/từ 19 tuổi trở lên/);
    expect((await last(["người lớn tập thể dục bao nhiêu là đủ"])).content).toMatch(/150 phút/);
    expect((await last(["mỗi ngày đi bộ bao nhiêu bước"])).content).toMatch(/bước chân/);
  }, T);
  it("01/11 — hiểu câu vòng 23: 'bị X ăn/uống Y được không' trả lời đúng món Y với bệnh X (tỏi ≠ tôi, chua ≠ chứa, nhiều món, câu nối)", async () => {
    const g = await last(["Bị gout ăn tỏi đc k?"]);
    expect(g.content).toMatch(/Về \*\*tỏi\*\*/);
    expect(g.content).not.toMatch(/Gout\*\* là gì/);
    for (const q of ["bị gout ăn tỏi được không", "bị gout có ăn được tỏi không", "bị gout thì ăn tỏi có sao không", "bị gout có nên ăn tỏi", "gout ăn tỏi tốt không"])
      expect((await last([q])).content, q).toMatch(/Về \*\*tỏi\*\*.*Gout/);
    const me = await last(["mẹ tôi bị gout ăn tỏi được không"]);
    expect(me.content).toMatch(/Về \*\*tỏi\*\*/);
    expect(me.content).not.toMatch(/Về \*\*tôi\*\*/);
    // gõ không dấu "an toi" (tỏi / bữa tối) → hỏi lại, kèm 2 câu bấm sẵn
    const nd = await last(["bi gout an toi dc ko"]);
    expect(nd.content).toMatch(/tỏi\*\* hay ăn \*\*bữa tối/);
    expect(nd.quick).toEqual(["bi gout an toi dc ko".replace("an toi", "ăn tỏi"), "bi gout an toi dc ko".replace("an toi", "ăn tối")]);
    // câu nối sau khi kể bệnh
    expect((await chat(["tôi bị gout", "ăn tỏi được không"]))[1].content).toMatch(/Về \*\*tỏi\*\*.*Gout/);
    // tên bệnh gan nêu rõ → thẻ bệnh trả lời món đó
    expect((await last(["bị gan nhiễm mỡ uống bia được không"])).content).toMatch(/Gan nhiễm mỡ\*\*: \*\*rượu bia/);
    expect((await last(["gout nên tránh bia không"])).content).toMatch(/Gout\*\*: \*\*bia\*\* nên/);
    const ch = await last(["bị trào ngược dạ dày ăn chua được không"]);
    expect(ch.content).not.toMatch(/caffeine\*\* nên|cà chua\*\* nên/);
    expect((await last(["bị sốt xuất huyết ăn đồ đỏ được không"])).content).toMatch(/Về \*\*đồ đỏ\*\*/);
    // nhiều món một lúc → từng món, phần nguyên tắc chung chỉ một lần
    const two = await last(["gout ăn tỏi, gừng được không"]);
    expect(two.content).toMatch(/Về \*\*tỏi\*\*, \*\*gừng\*\*/);
    expect(two.content.match(/Nguyên tắc chung/g)?.length).toBe(1);
    const tb = await last(["bị gout ăn tôm và thịt bò được không"]);
    expect(tb.content).toMatch(/hải sản\*\* nên/);
    expect(tb.content).toMatch(/thịt đỏ\*\* nên/);
    expect((await last(["tiểu đường ăn chuối với xoài được không"])).content).toMatch(/“chuối”, “xoài” thuộc nhóm/);
    // đối chứng: hỏi cả chế độ ăn vẫn ra danh sách; vị mặn vẫn khớp nhóm muối; món có trong nguồn vẫn trả lời như cũ
    expect((await last(["bị gout kiêng gì"])).content).toMatch(/Ăn uống với \*\*Gout/);
    expect((await last(["bị sỏi thận ăn mặn được không"])).content).toMatch(/Sỏi thận\*\*: \*\*muối/);
    expect((await last(["bị gout ăn thịt bò được k"])).content).toMatch(/thịt đỏ\*\* nên/);
    expect((await last(["bi gout an thit bo duoc khong"])).content).toMatch(/thịt đỏ\*\* nên/);
  }, T);
  it("01/11 — hiểu câu vòng 24: gõ không dấu / teen code hiểu như có dấu (bơi ≠ bói, đậu ≠ đâu, nhận ≠ nhắn, cơn đau ≠ con dâu, bộ phận + triệu chứng)", async () => {
    expect((await last(["bi viem xoang co nen di boi khong"])).tarot).toBeFalsy();
    expect((await last(["bi gout an dau duoc khong"])).content).toMatch(/các loại đậu/);
    expect((await last(["an trung nhieu co tot khong"])).content).toMatch(/Trứng/);
    expect((await last(["bi nac cut khong dut"])).content).toMatch(/nấc cụt/);
    expect((await last(["bị nấc cụt không dứt"])).content).toMatch(/nấc cụt/);
    expect((await last(["sao toi k nhan dc thong bao"])).content).not.toMatch(/Không nhắn \/ gọi được/);
    expect((await last(["sao toi khong nhan duoc thong bao"])).faqId).toBeTruthy();
    expect((await last(["mat toi bi mo"])).content).toMatch(/mờ mắt/);
    expect((await last(["tai tôi bị ù"])).content).toMatch(/ù tai/);
    expect((await last(["rang toi bi e buot"])).content).toMatch(/đau răng/);
    const hm = await last(["con tôi bị hăm tã"]);
    expect(hm.content).toMatch(/hăm tã/i);
    expect(hm.content).not.toMatch(/keep/);
    expect((await last(["em be bi ham ta"])).content).toMatch(/Hăm tã/);
    const nm = await last(["bi nam da phai lam sao"]);
    expect(nm.content).toMatch(/nám da\*\*.*nấm da/);
    expect(nm.quick).toEqual(["bi nám da phai lam sao", "bi nấm da phai lam sao"]);
    expect((await last(["con dau den dot ngot"])).content).not.toMatch(/nhà chồng|Làm dâu/);
    const sl = await last(["ăn cơm xong buồn ngủ"]);
    expect(sl.content).not.toMatch(/Ngủ ngon nha|nghe ngon ghê|hấp dẫn quá/);
    expect((await last(["uong nuoc nong co tot k"])).content).not.toMatch(/Cà phê hả/);
    expect((await chat(["toi dau dau wa", "do dau v"]))[1].content).toMatch(/Nguyên nhân/);
    expect((await last(["sot xuat huyet khac sot thuong ntn"])).content).not.toMatch(/Ý “khác sốt”/);
    // đối chứng: nghĩa còn lại vẫn đúng
    expect((await last(["bói thử chuyện học hành của em"])).tarot).toBeTruthy();
    expect((await last(["mẹ chồng hay soi mói tôi"])).content).toMatch(/nhà chồng|Làm dâu|mẹ chồng/i);
    expect((await last(["đi ngủ đây"])).content).toMatch(/ngủ/i);
  }, T);
  it("01/11 — hiểu câu vòng 25: không dấu cho câu hỏi app + câu kể nhiều vế (k = không, lợi ≠ lỗi, sắp tới ≠ sạp tôi, cãi với mẹ, gout + uống bia + đau)", async () => {
    expect((await last(["tai xe k toi thi sao"])).faqId).toBe("ridetrack");
    const mb = await last(["membership co loi gi"]);
    expect(mb.content).not.toMatch(/trục trặc/);
    expect(mb.content).toMatch(/Membership/);
    for (const q of ["toi bi mat viec, tien nha sap toi han, toi roi qua", "tôi bị mất việc, tiền nhà sắp tới hạn, tôi rối quá"]) {
      const r = await last([q]);
      expect(r.biz, q).toBeFalsy();
    }
    expect((await last(["quan cua toi chua dc duyet"])).biz).toBeFalsy();
    const mom = await last(["tôi cãi nhau với mẹ vì chuyện lấy chồng"]);
    expect(mom.content).not.toMatch(/Cặp đôi|người yêu/);
    const g = await last(["tôi bị gout, hôm qua lỡ uống bia, giờ đau chân quá"]);
    expect(g.content).toMatch(/Bạn đang bị \*\*gout\*\* mà giờ đau chân quá/);
    expect(g.content).not.toMatch(/🍻|Uống bia hả/);
    expect((await last(["toi bi gout, hom qua lo uong bia, gio dau chan qua"])).content).toMatch(/gout\*\* mà giờ đau chân/);
    expect((await last(["toi muon bo thuoc la ma kho qua"])).content).not.toMatch(/Khổ qua/);
    // đối chứng: rủ nhậu vẫn là rủ nhậu; hỏi chế độ ăn vẫn ra danh sách; "50 k" vẫn là tiền; app lỗi vẫn là lỗi
    expect((await last(["nhậu thôi anh em"])).content).toMatch(/🍻/);
    expect((await last(["tôi bị gout, nên ăn gì"])).content).toMatch(/Ăn uống với \*\*Gout/);
    expect((await last(["app bị lỗi gì vậy"])).content).toMatch(/trục trặc|lỗi/);
    expect((await last(["cãi nhau với người yêu"])).content).not.toMatch(/Chuyện gia đình/);
  }, T);
  it("02/11 — hướng 1 (sửa gốc phần dấu): đoán dấu trả về cả các cách đọc sát điểm; chọn cách đọc khớp điều Lomi biết", async () => {
    const { restoreViAlts, restoreVi, loadViModel } = await import("@/lib/lomiViRestore");
    await loadViModel();
    // cách đọc tốt nhất của restoreViAlts trùng restoreVi (không đổi hành vi cũ)
    for (const q of ["bi gout an dau duoc khong", "chi bi dau bung", "quen mat khau", "toi muon bo thuoc la ma kho qua", "an toi muon"]) expect(restoreViAlts(q).best).toBe(restoreVi(q));
    // chữ còn phân vân có cách đọc thay thế kèm độ chênh điểm
    const nm = restoreViAlts("bi nam da", { maxDelta: 3 });
    expect([nm.best, ...nm.alts.map((a) => a.text)]).toEqual(expect.arrayContaining(["bị nám da", "bị nấm da"]));
    expect(nm.alts.every((a) => a.delta >= 0 && a.delta <= 3)).toBe(true);
    const ch = restoreViAlts("chi bi dau bung", { maxDelta: 3 });
    expect([ch.best, ...ch.alts.map((a) => a.text)]).toEqual(expect.arrayContaining(["chị bị đau bụng", "chỉ bị đau bụng"]));
    // không có chữ nào phân vân → không có cách đọc thay thế
    expect(restoreViAlts("quen mat khau", { maxDelta: 3 }).alts).toEqual([]);
    // qua khung chat: câu không dấu vẫn ra đúng nội dung
    expect((await last(["bi gout an dau duoc khong"])).content).toMatch(/các loại đậu/);
    expect((await last(["bi tri kieng gi"])).content).toMatch(/Trĩ/i);
    expect((await last(["bi soi than"])).content).toMatch(/sỏi thận/i);
    expect((await last(["quen mat khau"])).faqId).toBe("forgot");
  }, T);
  it("Rà lại 04/11 sau các vòng cloud: nuốt pin, người khác nhắn, tài xế bao lâu, đặt xe tới chỗ, đính chính tên đăng nhập", async () => {
    expect((await last(["Bé nhà tôi ăn phải viên pin"])).content).toMatch(/115/);
    expect((await last(["con tui lỡ ngậm nuốt cục pin"])).content).toMatch(/115/);
    expect((await last(["Ăn hạt điều có béo không"])).content).not.toMatch(/115/);
    expect((await last(["Người lạ nhắn tin cho tôi, chặn sao?"])).faqId).toBe("block");
    expect((await last(["Có người cứ nhắn làm phiền tôi"])).faqId).toBe("block");
    expect((await last(["Bạn nhắn cho chủ quán giùm tôi"])).faqId).toBe("msgstart");
    expect((await last(["Tài xế bao lâu mới tới?"])).faqId).toBe("ridetrack");
    expect((await last(["Tôi muốn đặt xe ra sân bay Liên Khương"])).faqId).toBe("ridebook");
    expect((await last(["giá đặt xe ra sân bay bao nhiêu"])).faqId).toBe("ridprice");
    expect((await last(["Không phải tôi hỏi mật khẩu, tôi hỏi tên đăng nhập quên thì sao"])).faqId).toBe("forgot");
  }, T);
  it("04/11 — ho / sốt hỏi món, kiêng cữ, mẹo dân gian; câu thật của người dùng", async () => {
    expect((await last(["Ho có ăn tôm đc k?"])).content).toMatch(/Ăn \*\*tôm\*\* khi ho.*không bảo phải kiêng/s);
    expect((await last(["ho kiêng gì"])).content).toMatch(/kiêng/);
    expect((await last(["Ho nên ăn gì"])).content).toMatch(/không có món nào bắt buộc phải kiêng/);
    expect((await last(["ho có uống nước đá được không"])).content).toMatch(/không bảo phải kiêng đồ lạnh/);
    expect((await last(["bị ho có nên hút thuốc k"])).content).toMatch(/đừng hút thuốc/);
    expect((await last(["ho uống chanh mật ong được không"])).content).toMatch(/Chanh mật ong ấm.*dưới 1 tuổi/s);
    expect((await last(["ho uống sữa được không"])).content).toMatch(/không làm cơ thể tiết thêm đờm/);
    expect((await last(["ho uống gừng có đỡ không"])).content).toMatch(/Gừng/);
    expect((await last(["ho uống cam thảo được không"])).content).toMatch(/Cam thảo/);
    expect((await last(["ho có tiêu chảy không"])).content).not.toMatch(/Ăn \*\*/);
    expect((await last(["bé 6 tháng bị ho uống mật ong được k"])).content).toMatch(/Bé 6 tháng/);
    expect((await chat(["Tôi bị ho", "Có ăn tôm được không?"]))[1].content).toMatch(/khi ho/);
    expect((await last(["đau họng uống nước đá được ko"])).content).toMatch(/đau họng/);
    expect((await last(["sốt có ăn tôm được không"])).content).toMatch(/khi sốt/);
    expect((await last(["sốt kiêng gì"])).content).toMatch(/không có món nào bắt buộc phải kiêng/);
    expect((await last(["sốt cao 40 độ, cứng cổ, ăn gì"])).content).toMatch(/115/);
    expect((await last(["bé 2 tuổi sốt có ăn trứng được không"])).content).toMatch(/Trẻ sốt/);
    expect((await last(["Họ có ăn tôm được không"])).content).not.toMatch(/khi ho/);
    expect((await last(["Nổi tràm thì nên làm gì?"])).content).toMatch(/Rôm sảy/);
    expect((await last(["Nghiện thủ dâm nên làm gì?"])).content).toMatch(/nghiện tình dục/);
    expect((await last(["Mới mổi nên kiêng gì?"])).content).toMatch(/mới mổ/);
    expect((await last(["Có bệnh gì cần kiêng rượu bia j?"])).content).toMatch(/Rượu bia/);
  }, T);
  it("04/11 (vòng 2) — dinh dưỡng, kiêng cữ, mẹo dân gian, hỏi A trả lời B", async () => {
    expect((await last(["ăn gì để tăng cân"])).content).toMatch(/Tăng cân lành mạnh/);
    expect((await last(["ăn nhiều muối có hại gì"])).content).toMatch(/6 g muối/);
    expect((await last(["mỗi ngày ăn bao nhiêu muối"])).content).toMatch(/6 g muối/);
    expect((await last(["ăn chay có thiếu chất không"])).content).toMatch(/B12/);
    expect((await last(["bé 1 tuổi uống sữa tươi được chưa"])).content).toMatch(/12 tháng/);
    expect((await last(["người già nên ăn gì"])).content).toMatch(/người lớn tuổi/);
    expect((await last(["quán cơm cho người già"])).dish).toBe("com");
    expect((await last(["ăn gì bổ máu"])).med?.id).toBe("thieu-mau");
    expect((await last(["dạ dày có nên ăn chuối không"])).med?.id).toBe("viem-da-day");
    expect((await last(["dạ dày ăn xôi được không"])).med?.id).toBe("viem-da-day");
    expect((await last(["mỗi ngày nên ăn bao nhiêu rau"])).content).toMatch(/5 phần/);
    expect((await last(["bầu ăn dứa được không"])).content).toMatch(/không có trong danh sách món cần tránh khi mang thai/);
    expect((await last(["bầu ăn sushi được không"])).content).toMatch(/tránh/);
    expect((await last(["mỡ máu cao ăn trứng được không"])).content).toMatch(/tránh \/ hạn chế/);
    expect((await last(["mật ong nghệ trị dạ dày"])).content).toMatch(/Nghệ/);
    const t = await last(["tỏi có hạ huyết áp không"]);
    expect(t.med?.id).toBe("tang-huyet-ap");
    expect(t.content).toMatch(/Tỏi/);
    expect((await last(["bị hạ huyết áp nên ăn gì"])).med?.id).toBe("huyet-ap-thap");
    expect((await last(["yến sào có bổ không"])).content).toMatch(/chưa tìm được nguồn/);
    expect((await last(["nóng trong người uống gì"])).content).toMatch(/cách gọi dân gian/);
    expect((await last(["đến tháng có được gội đầu không"])).content).toMatch(/chưa thấy nguồn y khoa nào/);
    expect((await last(["đến tháng đau bụng dữ dội ngất xỉu"])).content).toMatch(/115/);
    expect((await last(["sau khi nôn nên ăn gì"])).med?.id).toBe("buon-non");
    expect((await last(["dị ứng thời tiết kiêng gì"])).med?.id).toBe("me-day");
    expect((await last(["trời Đà Lạt hôm nay có mưa không"])).content).toMatch(/dự báo thời tiết/);
    expect((await last(["trật chân xoa dầu được không"])).content).toMatch(/Bong gân/);
    expect((await last(["bé bị sốt có tắm được không"])).content).not.toMatch(/Người lớn bị sốt/);
  }, T);
  it("04/11 (vòng 3) — trà / thảo dược cho giấc ngủ, chu kỳ kinh, nóng giận", async () => {
    const t = await last(["mất ngủ uống trà gì"]);
    expect(t.content).toMatch(/Cúc La Mã/);
    expect(t.content).toMatch(/passionflower/);
    expect(t.content).toMatch(/6 giờ trước khi ngủ/);
    expect((await last(["trà nào giúp ngủ ngon"])).content).toMatch(/Trà \/ thảo dược hay được dùng cho dễ ngủ/);
    expect((await last(["bà bầu mất ngủ uống trà gì"])).content).toMatch(/không dùng lạc tiên tây/);
    expect((await last(["trà hoa cúc có giúp ngủ ngon không"])).content).toMatch(/Cúc La Mã/);
    expect((await last(["lạc tiên có giúp ngủ không"])).content).toMatch(/passionflower.*Bà bầu không dùng/s);
    expect((await last(["melatonin có giúp ngủ không"])).content).toMatch(/5 giờ/);
    expect((await last(["trà lá vông có ngủ ngon không"])).content).toMatch(/chưa tìm được nguồn/);
    expect((await last(["tía tô đất có giúp ngủ không"])).content).not.toMatch(/\*\*Tía tô\*\* ❔/);
    expect((await last(["uống trà xanh buổi tối có mất ngủ không"])).content).toMatch(/caffeine/);
    expect((await last(["đến tháng mấy ngày là bình thường"])).content).toMatch(/28 ngày/);
    expect((await last(["chu kỳ kinh 40 ngày có sao không"])).content).toMatch(/ngoài\*\* mốc 21–35/);
    expect((await last(["mẹ tôi hay nóng giận"])).content).not.toMatch(/nóng hả/);
  }, T);
  it("04/11 (vòng 4) — danh mục thuốc: biệt dược, gõ sai, cách dùng có nguồn, không liều", async () => {
    const p = await last(["Thuốc paradol uống làm sao?"]);
    expect(p.content).toMatch(/Lomi hiểu là \*\*Panadol\*\*/);
    expect(p.content).toMatch(/lúc no hay lúc đói đều được/);
    expect(p.content).toMatch(/đọc tham khảo/);
    expect((await last(["Thuốc ambroxol uống sao"])).content).toMatch(/long đờm/);
    expect((await last(["Thuốc amoxicilin uống làm sao"])).content).toMatch(/Uống hết đợt/);
    expect((await last(["Thuốc beplex"])).content).toMatch(/vitamin nhóm B/);
    expect((await last(["ibuprofen uống làm sao"])).content).toMatch(/trong hoặc sau bữa ăn/);
    expect((await last(["paracetamol uống trước hay sau ăn"])).content).toMatch(/lúc no hay lúc đói đều được/);
    expect((await last(["omeprazol uống lúc nào"])).content).toMatch(/cùng giờ mỗi ngày/);
    expect((await last(["cetirizin có buồn ngủ không"])).content).toMatch(/ít gây buồn ngủ/);
    expect((await last(["augmentin uống mấy viên"])).content).toMatch(/amoxicillin \+ acid clavulanic/);
    expect((await last(["medrol uống sao"])).content).toMatch(/thuốc kê đơn/);
    expect((await last(["decolgen uống chung panadol được không"])).content).toMatch(/đều \*\*có paracetamol/);
    expect((await last(["panadol là thuốc gì"])).content).toMatch(/giảm đau, hạ sốt/);
    expect((await last(["parasite là gì"])).content).not.toMatch(/💊/);
  }, T);
  it("04/11 (vòng 5) — liều tham khảo + hướng dẫn dùng theo trang thuốc NHS", async () => {
    const p = await last(["panadol uống mấy viên"]);
    expect(p.content).toMatch(/không quá 8 viên trong 24 giờ/);
    expect(p.content).toMatch(/tờ hướng dẫn/);
    expect((await last(["ibuprofen uống làm sao"])).content).toMatch(/không quá 6 viên trong 24 giờ/);
    expect((await last(["bé 4 tuổi uống cetirizin bao nhiêu"])).content).toMatch(/2–5 tuổi.*2,5 mg/s);
    expect((await last(["motilium uống trước hay sau ăn"])).content).toMatch(/15–30 phút trước bữa ăn/);
    expect((await last(["flagyl uống rượu được không"])).content).toMatch(/Không uống rượu bia/);
    expect((await last(["amlodipin quên uống thì sao"])).content).toMatch(/bưởi chùm/);
    expect((await last(["metformin uống lúc nào"])).content).toMatch(/cùng bữa ăn/);
    expect((await last(["amoxicilin uống mấy viên"])).content).toMatch(/bác sĩ quyết định/);
    const kid = await last(["bé 5 tuổi uống paracetamol mấy viên"]);
    expect(kid.content).not.toMatch(/\d+\s*(mg|viên)\b/);
    expect((await last(["amoxicillin là thuốc gì"])).content).not.toMatch(/\d+\s*mg/);
  }, T);
  it("04/11 (vòng 6) — thuốc bôi / xịt / nhỏ / hít / tẩy giun / nhuận tràng… theo trang thuốc NHS, WHO, MedlinePlus", async () => {
    const C: [string, RegExp][] = [
      ["canesten bôi sao", /2–3 lần\/ngày/], ["otrivin xịt mấy ngày", /không dùng quá 5 ngày/], ["ventolin xịt mấy nhát", /không quá 4 lần trong 24 giờ/],
      ["fugacar uống sao", /một liều duy nhất/], ["cloraxin nhỏ mắt mấy lần", /đủ \*\*5 ngày/], ["fucidin bôi mấy lần", /3–4 lần\/ngày/],
      ["kem acyclovir bôi thế nào", /5 lần\/ngày/], ["voltaren gel bôi sao", /không quá 4 lần trong 24 giờ/], ["lamisil bôi bao lâu", /1–2 tuần/],
      ["flixonase xịt sao", /vài tuần/], ["nizoral gội sao", /3–5 phút/], ["dulcolax uống lúc nào", /trước khi đi ngủ/], ["zentel uống sao", /400 mg/],
      ["oresol pha sao", /đúng lượng nước sạch/], ["postinor uống khi nào", /72 giờ/], ["sudafed uống mấy viên", /cách nhau ít nhất 4 giờ/],
      ["gaviscon uống sao", /sau bữa ăn và trước khi ngủ/], ["buscopan uống mấy viên", /tối đa 8 viên/], ["duphalac uống sao", /15 ml/],
      ["permethrin bôi sao", /12 giờ/], ["nystatin rơ miệng sao", /30 giây/], ["telfast uống sao", /không uống với nước cam/],
      ["hydrocortisone bôi mặt được không", /không bôi lên vết thương hở, mặt/], ["chlorhexidine súc sao", /10 ml/], ["beclometasone xịt sao", /kể cả khi không có triệu chứng/],
      ["aspirin uống sao", /15 tuổi trở xuống/], ["bactroban là thuốc gì", /kháng sinh bôi da/], ["nexium uống sao", /nuốt nguyên viên/],
    ];
    for (const [q, re] of C) expect((await last([q])).content, q).toMatch(re);
    // thuốc + mang thai → không còn rơi vào bảng MÓN ĂN khi mang thai
    const pz = await last(["bà bầu uống zentel được không"]);
    expect(pz.content).not.toMatch(/món cần tránh/);
    expect(pz.content).toMatch(/hại thai nhi/);
    expect((await last(["đang cho con bú dùng canesten được không"])).content).toMatch(/đừng tự dùng/);
    expect((await last(["uống senokot với rượu được không"])).content).toMatch(/chưa có nguồn đã kiểm chứng/);
    // "là thuốc gì" của thuốc bôi → gợi ý hỏi "bôi sao", không nêu liều
    expect((await last(["salbutamol là thuốc gì"])).content).toMatch(/xịt sao/);
  }, 120000);
  it("04/11 (vòng 7) — thuốc mạn tính / thần kinh / tiết niệu / say xe theo trang thuốc NHS", async () => {
    const C: [string, RegExp][] = [
      ["duspatalin uống sao", /20 phút trước bữa ăn/], ["transamin uống mấy viên", /4 ngày/], ["diflucan uống sao", /150 mg một liều duy nhất/],
      ["nasonex xịt sao", /14 ngày/], ["stilnox uống lúc nào", /ngay trước khi lên giường/], ["harnal uống lúc nào", /sau bữa sáng/],
      ["seduxen uống được bao lâu", /tối đa khoảng 4 tuần/], ["zoloft uống sao", /Đừng tự ngưng đột ngột/], ["viagra uống trước bao lâu", /1 giờ trước khi quan hệ/],
      ["stugeron uống trước khi đi bao lâu", /2 giờ trước khi đi/], ["adalat uống sao", /ít nhất 12 giờ/], ["imigran uống sao", /tối đa 300 mg/],
      ["pulmicort xịt sao", /dự phòng/], ["macrobid uống sao", /uống hết đợt/i], ["propranolol uống mấy viên", /80 mg × 2 lần/],
      ["tritace uống sao", /trước khi ngủ/], ["lasix uống lúc nào", /buổi sáng/], ["zocor uống lúc nào", /buổi tối/], ["kwells uống sao", /20–30 phút/],
    ];
    for (const [q, re] of C) expect((await last([q])).content, q).toMatch(re);
    expect((await last(["uống seduxen với rượu được không"])).content).toMatch(/Không uống rượu bia/);
    expect((await last(["bà bầu uống renitec được không"])).content).toMatch(/không dùng khi mang thai/);
    expect((await last(["thiếu vitamin d nên ăn gì"])).content).not.toMatch(/colecalciferol/);
  }, 120000);
  it("04/11 (vòng 8) — thuốc trước đây chỉ biết tên nay có cách dùng theo NHS / MedlinePlus", async () => {
    const C: [string, RegExp][] = [
      ["augmentin uống sao", /cùng bữa ăn/], ["zinnat uống mấy lần", /mỗi 12 giờ/], ["mobic uống sao", /ngày 1 lần/], ["celebrex uống lúc nào", /trên 200 mg/],
      ["klacid uống mấy viên", /250–500 mg, ngày 2 lần/], ["levofloxacin uống sao", /đứt gân/], ["aerius uống sao", /ngày 1 lần/], ["phenergan uống sao", /tối hôm trước/],
      ["pantoloc uống trước hay sau ăn", /1 giờ trước bữa ăn/], ["pariet uống lúc nào", /sau bữa sáng/], ["medrol uống sao", /thức ăn hoặc sữa/],
      ["dexamethasone uống lúc nào", /bữa sáng/], ["coversyl uống sao", /trước bữa sáng/], ["diamicron uống sao", /hạ đường huyết/],
      ["crestor uống lúc nào", /cùng giờ/], ["air x uống sao", /nhai kỹ/], ["bé 3 tuổi uống rhinathiol mấy ml", /2–4 tuổi/],
    ];
    for (const [q, re] of C) expect((await last([q])).content, q).toMatch(re);
  }, 120000);
  it("04/11 (vòng 9) — viên sủi kẽm / vitamin C / canxi / D3: nhu cầu mỗi ngày theo NHS; thêm 23 thuốc", async () => {
    const C: [string, RegExp][] = [
      ["viên sủi vitamin c uống sao", /40 mg vitamin C mỗi ngày/], ["viên sủi kẽm uống mấy viên 1 ngày", /Không uống quá 25 mg/], ["canxi uống bao nhiêu 1 ngày", /700 mg/],
      ["vitamin d3 uống bao nhiêu", /400 IU/], ["redoxon uống sao", /1\.000 mg/], ["magne b6 uống bao nhiêu", /400 mg\/ngày trở xuống/],
      ["efferalgan codein uống mấy viên", /không quá 8 viên/], ["forlax uống sao", /2 tuần/], ["fosamax uống sao", /30 phút/], ["betnovate bôi mặt được không", /hỏi bác sĩ/],
      ["eliquis quên uống thì sao", /ngày 2 lần/], ["jardiance uống sao", /12 giờ/], ["circadin uống lúc nào", /1–2 giờ trước khi ngủ/], ["xalatan nhỏ sao", /buổi tối/],
      ["trimethoprim uống mấy ngày", /3 ngày/], ["beconase xịt sao", /8 nhát/], ["cipralex uống sao", /Đừng tự ngưng/], ["ospen uống trước hay sau ăn", /30 phút trước bữa ăn/],
    ];
    for (const [q, re] of C) expect((await last([q])).content, q).toMatch(re);
    expect((await last(["kẽm có trong món gì"])).content).not.toMatch(/25 mg/);
    expect((await last(["efferalgan codein uống chung panadol được không"])).content).toMatch(/có paracetamol/);
    expect((await last(["efferalgan uống mấy viên"])).content).toMatch(/Paracetamol/);
  }, 120000);
  it("04/11 (vòng 10) — thêm thuốc thần kinh, tim mạch, da, tiêu hoá theo NHS", async () => {
    const C: [string, RegExp][] = [
      ["remeron uống lúc nào", /trước khi ngủ/], ["lyrica uống sao", /Đừng ngưng đột ngột/], ["betaserc uống sao", /sau bữa ăn/], ["flucloxacillin uống sao", /1 giờ trước ăn/],
      ["propecia uống sao", /1 mg\/ngày/], ["xarelto uống sao", /cùng bữa ăn/], ["tenormin uống mấy viên", /25–50 mg/], ["imdur uống sao", /nuốt nguyên/],
      ["eumovate bôi mấy ngày", /7 ngày/], ["colpermin uống sao", /30–60 phút trước bữa ăn/], ["amitriptyline uống sao", /25 mg × 2 lần/], ["citalopram uống lúc nào", /ngày 1 lần/],
    ];
    for (const [q, re] of C) expect((await last([q])).content, q).toMatch(re);
  }, 120000);
  it("04/11 (vòng 11) — thêm thuốc thần kinh, động kinh, tim, tiết niệu, da theo NHS", async () => {
    const C: [string, RegExp][] = [
      ["neurontin uống sao", /900–3\.600 mg/], ["fybogel uống sao", /150 ml/], ["nitroglycerin xịt sao", /gọi 115/], ["tetralysal uống bao lâu", /8 tuần/],
      ["roaccutane uống sao", /ngừa thai/], ["carbimazole uống mấy viên", /20–60 mg/], ["isoptin uống sao", /bưởi chùm/], ["dilatrend uống sao", /suy tim/],
      ["lanoxin uống lúc nào", /sau bữa sáng/], ["aprovel uống sao", /ngày 1 lần/], ["efexor uống sao", /cùng bữa ăn/], ["seroquel uống sao", /tăng dần/],
      ["ativan uống được bao lâu", /4 tuần/], ["imovane uống lúc nào", /lúc đi ngủ/], ["aricept uống lúc nào", /trước khi ngủ/], ["lamictal uống sao", /ban đỏ/],
      ["topamax uống sao", /ngừa thai/], ["depakine uống sao", /nuốt nguyên/], ["vesicare uống sao", /5 mg ngày 1 lần/], ["ditropan uống mấy viên", /5 mg × 2–3 lần/],
      ["zyprexa uống sao", /5–20 mg/], ["keppra uống sao", /ngày 1–2 lần/], ["tegretol uống sao", /bưởi chùm/], ["abilify uống sao", /10–15 mg/], ["seroxat uống lúc nào", /buổi sáng/], ["tantum verde xịt mấy nhát", /4–8 nhát/], ["risperdal uống sao", /4–6 mg/],
      ["xenical uống sao", /cùng bữa ăn chính/], ["champix uống sao", /ngày bỏ thuốc/], ["cialis uống trước bao lâu", /30 phút/], ["aldactone uống lúc nào", /kali/],
      ["ritalin uống sao", /nuốt nguyên/i], ["valoid uống trước khi đi bao lâu", /1–2 giờ/], ["co dydramol uống mấy viên", /không quá 8 viên/], ["pentasa uống sao", /nuốt nguyên/],
    ];
    for (const [q, re] of C) expect((await last([q])).content, q).toMatch(re);
    expect((await last(["miếng dán nicotine dán sao"])).content).toMatch(/\*\*Nicotine thay thế/);
    const D: [string, RegExp][] = [
      ["milurit uống sao", /sau bữa ăn/], ["colchicin uống mấy viên", /tối đa 12 viên/], ["tamiflu uống mấy ngày", /5 ngày/], ["atarax uống sao", /buồn ngủ/i],
      ["ponstan uống sao", /mỗi 6 giờ/], ["sirdalud uống sao", /tối đa 3 lần/], ["lipanthyl uống lúc nào", /cùng bữa ăn/], ["visine nhỏ sao", /3–4 lần/],
      ["maalox uống sao", /nhai kỹ/], ["sporal uống sao", /bữa ăn no/], ["valtrex uống sao", /12 giờ/], ["xyzal uống lúc nào", /buổi tối/],
      ["pepto bismol uống sao", /48 giờ/], ["amaryl uống lúc nào", /bữa sáng/], ["micardis uống sao", /mang thai/], ["fasigyn uống rượu được không", /3 ngày/],
      ["tobrex nhỏ mấy lần", /4–8 giờ/], ["dalacin c uống sao", /ly nước đầy/], ["zaditor nhỏ sao", /8–12 giờ/], ["nebilet uống sao", /ngày 1 lần/],
    ];
    for (const [q, re] of D) expect((await last([q])).content, q).toMatch(re);
    const E: [string, RegExp][] = [
      ["berlthyrox uống lúc nào", /30–60 phút trước bữa sáng/], ["xanax uống sao", /lệ thuộc/], ["combantrin uống sao", /2 tuần/], ["seretide xịt sao", /Không dùng để cắt cơn/],
      ["methotrexate uống mấy lần", /MỖI TUẦN 1 LẦN/], ["differin bôi sao", /8–12 tuần/], ["betaloc zok uống sao", /nuốt nguyên/], ["utrogestan uống lúc nào", /đi ngủ/],
      ["rivotril uống rượu được không", /hôn mê/], ["doxycyclin uống sao", /ly nước đầy/], ["symbicort xịt sao", /súc miệng/], ["xatral uống lúc nào", /sau cùng một bữa ăn/],
      ["thyrozol uống sao", /Đau họng, sốt/], ["pradaxa uống sao", /không mở/], ["brilinta uống sao", /chảy máu/], ["glucobay uống sao", /miếng ăn đầu tiên/],
      ["selsun gội sao", /10 phút/], ["minoxidil bôi bao lâu", /4 tháng/], ["distocide uống sao", /3 liều/], ["famotidin uống mấy viên", /2 viên/],
    ];
    for (const [q, re] of E) expect((await last([q])).content, q).toMatch(re);
    // 04/11 (Kir gửi danh sách dược liệu Long Châu) — thảo dược theo NCCIH
    const H: [string, RegExp][] = [
      ["sâm ấn độ có tác dụng gì", /Ayurveda/], ["tinh dầu hoa anh thảo có tốt không", /không giúp được chàm/], ["uống cúc tím có hết cảm không", /giảm nhẹ khả năng bị cảm/],
      ["kava có hại không", /tổn thương gan/], ["yohimbe có tốt cho đàn ông không", /NGUY HIỂM/], ["việt quất đen có sáng mắt không", /nhìn đêm không thấy lợi ích/],
      ["hạt nho có tốt không", /Chiết xuất hạt nho/], ["cỏ ban âu có tác dụng gì", /Tương tác nguy hiểm/], ["quả cơm cháy có độc không", /cyanide/], ["saw palmetto có tốt cho tuyến tiền liệt không", /gần như không giúp/],
    ];
    for (const [q, re] of H) expect((await last([q])).content, q).toMatch(re);
  }, 120000);
});
// 04/11 — mọi thuốc trong danh mục: nguồn https thuộc TRUSTED, src trỏ đúng chỉ mục, tên không trùng giữa hai thuốc.
import { MEDS } from "@/lib/lomiDrugIndex";
import { TRUSTED } from "@/lib/lomiDrugData";
describe("04/11 — danh mục thuốc: nguồn hợp lệ", () => {
  it("nguồn chính thống, src hợp lệ, tên không trùng", () => {
    const seen = new Map<string, string>();
    for (const m of MEDS) {
      for (const s of m.sources ?? []) {
        const host = new URL(s.url).hostname;
        expect(s.url.startsWith("https://"), m.id).toBe(true);
        expect(TRUSTED.some((d) => host === d || host.endsWith(`.${d}`)), `${m.id}: ${host}`).toBe(true);
      }
      const facts = [...(m.how ?? []), ...(m.side ?? []), ...(m.care ?? []), ...(m.dose?.adult ?? []), ...(m.dose?.kid ?? [])];
      for (const f of facts) for (const i of f.src) expect(m.sources?.[i], `${m.id}: ${f.text.slice(0, 40)}`).toBeTruthy();
      for (const n of m.names) {
        expect(seen.get(n) ?? m.id, `tên "${n}" trùng`).toBe(m.id);
        seen.set(n, m.id);
      }
    }
    expect(MEDS.length).toBeGreaterThanOrEqual(85);
  });
});

// ── 04/11 vòng 12: dược liệu tham khảo tra cứu Long Châu (y học cổ truyền + nghiên cứu, viết lại có chọn lọc) ──
describe("04/11 vòng 12 — dược liệu (Long Châu)", () => {
  const H2: [string, RegExp][] = [
    ["cà gai leo có tác dụng gì", /Cà gai leo[\s\S]*giải rượu/],
    ["ca gai leo co tac dung gi", /Cà gai leo/],
    ["bà bầu uống diệp hạ châu được không", /Diệp hạ châu[\s\S]*bà bầu[\s\S]*có thai không dùng/],
    ["mang thai uống tam thất được không", /Tam thất[\s\S]*có thai không dùng/],
    ["bầu uống ích mẫu được không", /Ích mẫu[\s\S]*Không dùng khi mang thai/],
    ["giảo cổ lam có hạ đường huyết không", /Giảo cổ lam[\s\S]*hạ đường huyết quá mức/],
    ["dây thìa canh chữa tiểu đường được không", /Dây thìa canh[\s\S]*không thay thuốc/],
    ["xạ đen chữa ung thư được không", /Xạ đen[\s\S]*không bỏ điều trị ung thư[\s\S]*Theo y học cổ truyền/],
    ["kim tien thao tri soi than duoc khong", /Kim tiền thảo[\s\S]*đi khám/],
    ["nhân trần uống được không", /Nhân trần[\s\S]*3 cây khác nhau/],
    ["kỷ tử có tác dụng gì", /kỷ tử[\s\S]*sáng mắt/i],
    ["táo tàu có tác dụng gì", /Đại táo/],
    ["diếp cá chữa trĩ được không", /Diếp cá[\s\S]*trĩ/],
    ["trinh nữ hoàng cung chữa u xơ tử cung được không", /Trinh nữ hoàng cung[\s\S]*bác sĩ phụ khoa theo dõi/],
  ];
  for (const [q, re] of H2) it(q, async () => expect((await last([q])).content).toMatch(re));
  it("vẫn là thẻ bệnh khi người dùng BỊ hạ đường huyết", async () => {
    expect((await last(["tôi bị hạ đường huyết"])).content).toMatch(/Hạ đường huyết/);
  });
  it("nguồn tham khảo Long Châu nằm trong danh sách tin cậy", () => {
    expect(TRUSTED).toContain("nhathuoclongchau.com.vn");
  });
});

// ── 04/11 vòng 13 (Kir: "nói theo y học cổ truyền, để tham khảo", bỏ câu "chưa đủ bằng chứng trên người") + 20 vị đợt 2 ──
describe("04/11 vòng 13 — dược liệu theo y học cổ truyền (Long Châu đợt 2)", () => {
  const H3: [string, RegExp][] = [
    ["lá lốt có tác dụng gì", /Lá lốt[\s\S]*đau dạ dày, táo bón không nên dùng/],
    ["bà bầu uống ngưu tất được không", /Ngưu tất[\s\S]*có thai không được dùng/],
    ["hoai son co tac dung gi", /Hoài sơn[\s\S]*bổ tỳ/],
    ["kim ngan hoa co tac dung gi", /Kim ngân hoa[\s\S]*thanh nhiệt/],
    ["la han qua co tac dung gi", /La hán quả[\s\S]*Trẻ dưới 6 tuổi/],
    ["bà bầu uống trà tâm sen được không", /Tâm sen[\s\S]*phụ nữ mang thai/],
    ["uống nước râu ngô hạ huyết áp được không", /Râu ngô[\s\S]*thuốc chống đông/],
    ["mã đề trị ho được không", /Mã đề[\s\S]*đái dầm/],
    ["lá tre có tác dụng gì", /Lá tre[\s\S]*cảm sốt/],
    ["che vang co tac dung gi", /Chè vằng[\s\S]*lá ngón/],
    ["rau sam có tác dụng gì", /Rau sam[\s\S]*lỵ/],
    ["bình vôi chữa mất ngủ được không", /Bình vôi[\s\S]*có độc/],
    ["uống nước sả có tốt không", /Sả[\s\S]*tinh dầu sả lượng lớn/],
    ["lá trầu không có tác dụng gì", /trầu không[\s\S]*cạn sữa/],
  ];
  for (const [q, re] of H3) it(q, async () => {
    const c = (await last([q])).content;
    expect(c).toMatch(re);
    expect(c).toMatch(/Theo y học cổ truyền/);
  });
  it("vị lấy từ Long Châu không còn câu 'chưa đủ bằng chứng trên người'", async () => {
    const { FOLK } = await import("@/lib/lomiFolk");
    for (const f of FOLK.filter((x) => x.sources.some((s) => /Long Châu/.test(s.publisher))))
      for (const x of [...f.folk, ...f.science, ...(f.how ?? []), ...f.caution, ...f.topics]) expect(x.text, f.id).not.toMatch(/bằng chứng/);
  });
  it("người BỊ huyết áp thấp vẫn ra thẻ bệnh", async () => {
    expect((await last(["tôi bị huyết áp thấp"])).content).toMatch(/Huyết áp thấp/);
  });
});

// ── 04/11 vòng 14: đinh lăng, ba kích, lá vối + 13 vị (Long Châu) · thẻ bệnh kèm dược liệu liên quan ──
describe("04/11 vòng 14 — đinh lăng, ba kích, lá vối; bệnh kèm dược liệu", () => {
  const H4: [string, RegExp][] = [
    ["đinh lăng có tác dụng gì", /Đinh lăng[\s\S]*Trẻ em chỉ dùng ngoài da/],
    ["dinh lang co tac dung gi", /Đinh lăng/],
    ["ba kích có tác dụng gì", /Ba kích[\s\S]*bỏ lõi/],
    ["tăng huyết áp uống ba kích được không", /Ba kích[\s\S]*tăng huyết áp/],
    ["uống nước lá vối có tốt không", /vối[\s\S]*Không uống khi đói/],
    ["la voi co tac dung gi", /vối/],
    ["búp ổi trị tiêu chảy được không", /ổi[\s\S]*tiêu chảy/i],
    ["cát cánh có tác dụng gì", /Cát cánh[\s\S]*ho ra máu không nên dùng/],
    ["chè dây có tác dụng gì", /Chè dây[\s\S]*dạ dày/],
    ["húng quế có tác dụng gì", /Húng quế[\s\S]*eugenol/],
  ];
  for (const [q, re] of H4) it(q, async () => expect((await last([q])).content).toMatch(re));
  it("'nghệ đen' không bị trả lời bằng bài về nghệ", async () => {
    expect((await last(["nghệ đen có tác dụng gì"])).content).toMatch(/Nga truật[\s\S]*mang thai/);
  });
  it("hỏi bệnh → kèm dược liệu hay dùng", async () => {
    expect((await last(["sỏi thận là gì"])).content).toMatch(/Dược liệu \/ mẹo dân gian hay dùng cho sỏi thận[\s\S]*Kim tiền thảo/);
    expect((await last(["gout là gì"])).content).toMatch(/hay dùng cho gout[\s\S]*vối/);
  });
  it("hỏi kiêng gì → kèm thảo dược cần tránh", async () => {
    expect((await last(["tăng huyết áp kiêng gì"])).content).toMatch(/cần tránh hoặc thận trọng với tăng huyết áp[\s\S]*Cam thảo[\s\S]*Ba kích/);
  });
});

// ── 04/11 vòng 15: dược liệu đợt 4 (Long Châu) ──
describe("04/11 vòng 15 — dược liệu đợt 4", () => {
  const H5: [string, RegExp][] = [
    ["nghe den co tac dung gi", /Nga truật[\s\S]*mang thai/],
    ["nhục đậu khấu có tác dụng gì", /Nhục đậu khấu[\s\S]*rất nguy hiểm/],
    ["chùm ngây có tác dụng gì", /Chùm ngây[\s\S]*phụ nữ có thai/],
    ["cây cứt lợn chữa viêm xoang được không", /cứt lợn[\s\S]*cỏ lào/i],
    ["bà bầu uống trà hoa hòe được không", /hòe[\s\S]*sảy thai/i],
    ["tầm gửi có tác dụng gì", /Tầm gửi[\s\S]*cây độc/],
    ["đại hoàng trị táo bón được không", /Đại hoàng[\s\S]*có thai/],
    ["củ gấu có tác dụng gì", /Hương phụ/],
  ];
  for (const [q, re] of H5) it(q, async () => expect((await last([q])).content).toMatch(re));
  it("tên vị trùng chữ thường khi gõ không dấu không bị nhận nhầm", async () => {
    const { findFolk } = await import("@/lib/lomiFolk");
    for (const q of ["rieng toi bi dau dau uong gi", "chi tu bi dau bung", "benh tam that"]) expect(findFolk(q), q).toBeNull();
    expect(findFolk("cu rieng chua dau bung")?.id).toBe("rieng");
  });
});

// ── 04/11 vòng 16: vị độc (cảnh báo) + dược liệu đợt 5 ──
describe("04/11 vòng 16 — vị độc + dược liệu đợt 5", () => {
  const H6: [string, RegExp][] = [
    ["chu sa có tác dụng gì", /Chu sa[\s\S]*thuỷ ngân[\s\S]*115/],
    ["tỏi độc trị gout được không", /Tỏi độc[\s\S]*Vị thuốc ĐỘC[\s\S]*colchicine/],
    ["thương lục có tác dụng gì", /Thương lục[\s\S]*nhầm với sâm/],
    ["dừa cạn chữa huyết áp được không", /Dừa cạn[\s\S]*có thai/],
    ["hoa đu đủ đực trị ho cho bé được không", /Hoa đu đủ đực[\s\S]*dưới 3 tuổi/],
    ["re co tranh co tac dung gi", /cỏ tranh/i],
    ["uống bột sắn dây có tốt không", /Sắn dây[\s\S]*nấu chín/],
  ];
  for (const [q, re] of H6) it(q, async () => expect((await last([q])).content).toMatch(re));
  it("'xấu hổ' (cảm xúc) không thành cây xấu hổ", async () => {
    expect((await last(["tôi thấy xấu hổ quá"])).content).not.toMatch(/cây xấu hổ/i);
  });
});

// ── 04/11 vòng 17: dược chất đợt 1 (tra cứu dược chất Long Châu) + hỏi thuốc cho trẻ em ──
describe("04/11 vòng 17 — dược chất đợt 1 + thuốc cho trẻ", () => {
  const H7: [string, RegExp][] = [
    ["alpha choay uống sao", /alpha chymotrypsin[\s\S]*không nhai/],
    ["debridat có tác dụng gì", /trimebutine[\s\S]*đầy hơi/],
    ["myonal uống mấy viên", /eperisone[\s\S]*Liều tham khảo[\s\S]*50 mg/],
    ["decontractyl có gây buồn ngủ không", /mephenesin[\s\S]*gây buồn ngủ/],
    ["bà bầu uống berberin được không", /Berberin[\s\S]*có thai không dùng/],
    ["daflon uống sao", /diosmin[\s\S]*trĩ/],
    ["arcoxia có tác dụng phụ gì", /etoricoxib[\s\S]*tăng huyết áp/],
    ["no spa uống mấy viên", /drotaverin[\s\S]*120–240 mg/],
    ["smecta uống sao", /diosmectite[\s\S]*cách các thuốc khác khoảng 2 giờ/],
    ["toplexil có gây buồn ngủ không", /oxomemazin[\s\S]*gây buồn ngủ/],
    ["betadine dùng sao", /povidon iod/],
  ];
  for (const [q, re] of H7) it(q, async () => expect((await last([q])).content).toMatch(re));
  it("thuốc trong danh mục + cho bé → ý về trẻ em, không 'chưa biết'", async () => {
    expect((await last(["smecta cho bé 1 tuổi được không"])).content).toMatch(/Nguồn nói về trẻ em[\s\S]*dưới 2 tuổi chỉ dùng khi bác sĩ cho/);
    expect((await last(["zyrtec cho bé uống được không"])).content).toMatch(/cetirizine[\s\S]*trẻ em/i);
    expect((await last(["terpin codein trẻ em uống được không"])).content).toMatch(/Không dùng cho trẻ dưới 12 tuổi/);
    expect((await last(["panadol cho bé 2 tuổi được không"])).content).toMatch(/Paracetamol\*\* cho trẻ em/);
  });
});

// ── 04/11 vòng 18: dược chất đợt 2 (tra cứu dược chất Long Châu) ──
describe("04/11 vòng 18 — dược chất đợt 2", () => {
  const H8: [string, RegExp][] = [
    ["gasmotin là thuốc gì", /mosaprid/],
    ["salonpas dán sao", /methyl salicylat[\s\S]*dưới 2 tuổi/],
    ["dermovate bôi mặt được không", /clobetasol[\s\S]*trứng cá/],
    ["daktarin cho bé 4 tháng được không", /dưới 6 tháng/],
    ["bactrim bà bầu uống được không", /co-trimoxazol[\s\S]*có thai không nên dùng/],
    ["dramamine uống lúc nào", /dimenhydrinat[\s\S]*30 phút trước/],
    ["bisolvon uống mấy viên", /bromhexin[\s\S]*8–16 mg/],
    ["vitamin e uống có tác dụng gì", /Vitamin E[\s\S]*rối loạn chảy máu/],
    ["flagentyl uống sao", /secnidazol[\s\S]*mang thai/],
  ];
  for (const [q, re] of H8) it(q, async () => expect((await last([q])).content).toMatch(re));
});

// ── 04/11 vòng 19: các vị còn lại của tra cứu dược liệu Long Châu (tóm tắt tự động, chỉ nhận khi có ngữ cảnh vị thuốc) ──
describe("04/11 vòng 19 — dược liệu còn lại (tự động)", () => {
  const H9: [string, RegExp][] = [
    ["a giao có tác dụng gì", /A giao[\s\S]*Theo y học cổ truyền/],
    ["anh túc xác có tác dụng gì", /Anh túc xác[\s\S]*Vị thuốc ĐỘC[\s\S]*thuốc phiện/],
    ["hạnh nhân đắng ăn được không", /Hạnh nhân đắng[\s\S]*cyanid/],
    ["thầu dầu có tác dụng gì", /Thầu dầu[\s\S]*Hạt thầu dầu rất độc/],
    ["bà bầu uống huyền sâm được không", /Huyền sâm[\s\S]*bà bầu/],
    ["mè đen có tác dụng gì", /Mè đen[\s\S]*Theo y học cổ truyền/],
  ];
  for (const [q, re] of H9) it(q, async () => expect((await last([q])).content).toMatch(re));
  it("tên rau / vật thường ngày không bị hiểu là hỏi vị thuốc khi không có ngữ cảnh", async () => {
    const { findFolk } = await import("@/lib/lomiFolk");
    for (const q of ["tôi thích ăn sim", "sua chua duoc khong", "chỉ muốn than thôi"]) expect(findFolk(q)?.gen, q).toBeFalsy();
  });
  it("mẹo dân gian theo bệnh: vị tự động gom thành một dòng", async () => {
    const c = (await last(["mẹo dân gian trị ho"])).content;
    expect(c.split("\n").filter((l) => l.startsWith("• ")).length).toBeLessThan(25);
  });
});
