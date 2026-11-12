// 12/11 (đợt 3) — Kir: "rà bệnh hoặc lỗi Lomi không hiểu câu". Câu lấy từ bộ 1.000 câu kiểm toán của Lovable (nhóm trò chuyện,
//   hỏi app, ăn uống, an toàn) và ca đối chứng để luật mới không bắt nhầm.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { calcReply } from "@/lib/lomiRescue";

const T = 120000;

describe("phép tính / bài toán đố", () => {
  it("bài toán đố ngắn và nối phép tính trước", () => {
    expect(calcReply("Hai đội đá bóng mỗi đội ghi hai bàn thì tổng cộng có mấy bàn?")).toMatch(/\*\*4 bàn\*\*/);
    expect(calcReply("Lomi tính giúp: mình chạy bộ ba vòng, mỗi vòng hai cây số thì được bao nhiêu cây?")).toMatch(/\*\*6 cây số\*\*/);
    expect(calcReply("Nếu hôm qua mình mua ba quyển vở giá mười hai nghìn mỗi quyển, hôm nay mua thêm một cây bút tám nghìn và trả bằng tờ năm mươi nghìn, thì còn được thối bao nhiêu?")).toMatch(/\*\*6\.000 đồng\*\* tiền thối/);
    expect(calcReply("nếu chia đều hóa đơn sáu trăm nghìn cho bốn người thì mỗi người trả bao nhiêu?")).toMatch(/\*\*150\.000 đồng\*\* mỗi người/);
    expect(calcReply("Quán cà phê báo bill 85 nghìn, mình đưa 100 nghìn thì được thối bao nhiêu?")).toMatch(/\*\*15\.000 đồng\*\*/);
    expect(calcReply("đổi 2 giờ rưỡi ra phúc giúp tui")).toMatch(/150 phút/);
    expect(calcReply("thêm 10 nghìn phí nữa thì tổng bao nhiêu", "🧮 3 × 25.000 đồng = **75.000 đồng**.")).toMatch(/\*\*85\.000 đồng\*\*/);
    expect(calcReply("rồi nhân đôi số đó lên", "🧮 120 ÷ 4 = **30**.")).toMatch(/\*\*60\*\*/);
    // không phải phép tính
    for (const q of ["ba mình năm nay năm mươi tuổi", "mỗi ngày uống hai viên, mỗi viên 500mg thì bao nhiêu", "mẹ mình bán ba ký cam, mỗi ký 30 nghìn"]) expect(calcReply(q), q).toBeNull();
  });
  it("qua khung chat: 'cà phê' trong bài toán không thành tìm quán; nối phép tính lượt trước", async () => {
    expect((await last(["Quán cà phê báo bill 85 nghìn, mình đưa 100 nghìn thì được thối bao nhiêu?"])).content).toMatch(/15\.000 đồng/);
    expect((await last(["Tính giúp mình 3 phần, mỗi phần 25 nghìn.", "thêm 10 nghìn phí nữa thì tổng bao nhiêu"])).content).toMatch(/85\.000 đồng/);
  }, T);
});

describe("nói chuyện với Lomi", () => {
  it("hỏi Lomi là người hay máy, có ngủ, có tự nhắn trước; cảm ơn / chào dài; câu ngoài phạm vi", async () => {
    for (const q of ["Lomi là người thật hay trợ lý ảo vậy?", "Lomi là ng thật hay bot z, nói chuyện dễ thương ghê", "Lomi chỉ là máy hay có người thật đang nhắn với mình vậy?", "Mình nghe mọi người trong cộng đồng nhắc bạn hỗ trợ được nhiều chuyện, tuy đã trò chuyện vài lần nhưng vẫn tò mò, bạn là trợ lý trong iLomi hay là một thành viên thật đang nhắn vậy?"]) {
      const a = (await last([q])).content;
      expect(a, q).toMatch(/trợ lý ảo/);
      expect(a, q).not.toMatch(/bác sĩ/);
    }
    expect((await last(["Lomi có phải thầy bói thật không hay chỉ là AI trò chuyện vậy?"])).content).toMatch(/không phải thầy bói/);
    expect((await last(["Bạn đâu có ngủ như người thật, đúng không Lomi?"])).content).toMatch(/không cần ngủ/);
    expect((await last(["b có tự ib mk trc mỗi sáng đc ko Lomi"])).content).toMatch(/chưa tự nhắn trước/);
    expect((await last(["hihi iu Lomi wá, cảm ơn đã nghe mk kể nha"])).content).toMatch(/Không có gì/);
    expect((await last(["Mình bán hàng mệt quá nên muốn chào Lomi một tiếng cho vui, hôm nay bạn thế nào?"])).content).toMatch(/^Chào bạn/);
    expect((await last(["dau xe o dau thi dung luat khi duong nay co bien cam dung?"])).content).toMatch(/luật giao thông/);
    // ca đối chứng: "mình tự nhắn xin lỗi bạn ấy" là người dùng tự nhắn, không phải hỏi Lomi nhắn trước
    expect((await last(["Không cần đâu, mình tự nhắn xin lỗi bạn ấy được, nhưng vẫn thấy ngại quá."])).content).not.toMatch(/chưa tự nhắn trước/);
  }, T);
  it("lời mở đầu xã giao / đổi chủ đề → đọc phần hỏi phía sau", async () => {
    for (const q of ["cảm ơn bạn nhưng cho mình hỏi thêm về sốt", "cho mình hỏi thêm về sốt", "mình muốn hỏi về sốt"]) expect((await last([q])).content, q).toMatch(/\*\*sốt\*\*/i);
    expect((await last(["Tui ho ba hôm nay rồi.", "Thôi bỏ qua, tối nay quanh Hồ Tây có quán bún nào ngon?"])).content).toMatch(/bún/);
  }, T);
});

describe("hỏi cách dùng app nhắc rõ iLomi", () => {
  it("đúng câu hỏi thường gặp, không thành tìm quán / tâm sự", async () => {
    const C: [string, RegExp][] = [
      ["toi goi xe trong muc Dua don cua iLomi thi tra tien mat cho tai xe duoc khong?", /tiền mặt/],
      ["Người yêu cũ nhắn trên iLomi làm mình phiền, chỉ mình cách chặn tài khoản đó với.", /Chặn/],
      ["Mình nhắn người yêu trên iLomi mà muốn xóa cuộc trò chuyện, thao tác chỗ nào vậy?", /[Xx]oá|[Xx]óa/],
      ["Trong Quẹt của iLomi, mình bấm bỏ qua hồ sơ rồi có xem lại được không?", /↺|hoàn tác|48/],
      ["điểm vs bậc trên hồ sơ iLomi khác nhau ntn ad", /điểm/],
      ["Tôi đang tạo nhóm chat trong iLomi, thêm 60 người có được ko", /50/],
    ];
    for (const [q, re] of C) expect((await last([q])).content, q).toMatch(re);
  }, T);
  it("câu sức khoẻ / kinh doanh có chữ trùng câu hỏi app thì không đáp bằng hướng dẫn app", async () => {
    expect((await last(["Vì mấy hôm nay chạy đơn liên tục nên mình hay bỏ bữa trưa, đến chiều lại cồn cào và nóng rát vùng trên rốn, vậy mình cần theo dõi những dấu hiệu gì?"])).content).not.toMatch(/Bạn bè|theo dõi qua lại/);
    expect((await last(["Khách hủy đặt bàn làm mình hụt hẫng, nhưng điều mình cần là mẫu chính sách đặt cọc cho quán để giảm hủy sát giờ."])).content).not.toMatch(/không bán dữ liệu/);
  }, T);
});

describe("ăn uống & an toàn", () => {
  it("không có công thức nấu ăn thì nói thật + mời tìm quán; chọn giữa hai món", async () => {
    for (const q of ["tủ còn trứng vs cà chua, làm món j nhanh cho bữa tối z", "Nhà có đậu phụ với nấm, tối nấu món gì nhanh gọn?"]) expect((await last([q])).content, q).toMatch(/chưa có công thức nấu ăn/);
    expect((await last(["tối ăn cơm hay phở nhỉ"])).content).toMatch(/\*\*(cơm|phở)\*\*/);
    expect((await last(["bị tiểu đường nên nấu món gì"])).content).not.toMatch(/chưa có công thức nấu ăn/);
  }, T);
  it("có người cầm hung khí đe doạ → gọi 113 ngay", async () => {
    for (const q of ["bạn e ib bảo có ng cầm dao đe dọa ngay trc cửa, bh giúp nó sao", "có người cầm dao đe dọa trước cửa nhà em"]) expect((await last([q])).content, q).toMatch(/113/);
    expect((await last(["mẹ cầm dao chặt gà ngoài sân"])).content).not.toMatch(/113/);
  }, T);
});
