// 30/10 — Kir: "update thêm thư viện bệnh đi, ung thư này ung thư kia, viêm này viêm kia". Thêm 25 thẻ có nguồn (NHS / NHS 111 Wales /
// MedlinePlus / Moorfields / Guy's and St Thomas'). Mỗi ca: câu người dùng hay hỏi → đúng thẻ, đúng khía cạnh. Chạy qua khung chat thật.
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";
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
});

