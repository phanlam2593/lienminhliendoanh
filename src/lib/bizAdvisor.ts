// ─────────────────────────────────────────────────────────────────────────────
// TƯ VẤN KINH DOANH CỦA LOMI (30/09, theo ý Kir) — chạy 100% trên máy như Bói Tarot: không gọi AI,
// không tốn credit, ai cũng dùng được. Thư viện các chủ đề chủ kinh doanh hay hỏi (ưu đãi, hút khách
// lúc vắng, tìm khách mới, giữ khách quen, viết bài đăng, đánh giá, giá & combo, khai trương, dịp lễ),
// ý tưởng riêng theo từng loại hình. Lomi XOAY VÒNG ý (nhớ ý đã gợi ý trên máy) + đổi câu mở/kết
// để không bị lặp. Nội dung tự viết, giọng thân thiện – lịch sự. Hiện chỉ có tiếng Việt.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import type { BusinessType } from "@/lib/types";

export type BizTopic = "offer" | "slow" | "newcust" | "loyal" | "post" | "review" | "price" | "opening" | "holiday";
export type BizCtx = { type?: BusinessType; noun?: string; topic?: BizTopic; seen?: string[] };
type Idea = { id: string; t: string; d: string };

const rnd = (n: number) => {
  try {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
};
const pick = <X,>(a: X[]) => a[rnd(a.length)];
const shuffle = <X,>(a: X[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

// ── Loại hình: tên gọi mặc định + nhận diện loại cụ thể trong câu gõ ──
const TYPE_NOUN: Record<BusinessType, string> = {
  food: "quán",
  service: "tiệm",
  stay: "chỗ lưu trú",
  travel: "dịch vụ du lịch",
  creator: "kênh",
  freelance: "dịch vụ",
  broker: "dịch vụ môi giới",
  shopping: "shop",
  other: "cơ sở kinh doanh",
};

const SUBTYPES: { re: RegExp; type: BusinessType; noun: string }[] = [
  { re: /\b(ca phe|cafe|coffee|cf)\b/, type: "food", noun: "quán cà phê" },
  { re: /\b(tra sua|tra chanh|milk tea)\b/, type: "food", noun: "quán trà sữa" },
  { re: /\b(tiem banh|banh ngot|banh mi|bakery)\b/, type: "food", noun: "tiệm bánh" },
  { re: /\b(lau|nuong|bbq)\b/, type: "food", noun: "quán lẩu nướng" },
  { re: /\b(quan che|che thai|kem|an vat)\b/, type: "food", noun: "quán ăn vặt" },
  { re: /\b(bar|pub|quan bia|quan nhau)\b/, type: "food", noun: "quán" },
  { re: /\b(pho|bun|com|quan an|nha hang|mi quang|hu tieu)\b/, type: "food", noun: "quán ăn" },
  { re: /\b(spa|massage|goi dau)\b/, type: "service", noun: "spa" },
  { re: /\b(nail|mong)\b/, type: "service", noun: "tiệm nail" },
  { re: /\b(toc|salon|barber|cat toc)\b/, type: "service", noun: "tiệm tóc" },
  { re: /\b(gym|yoga|phong tap)\b/, type: "service", noun: "phòng tập" },
  { re: /\b(giat ui|giat say|giat)\b/, type: "service", noun: "tiệm giặt" },
  { re: /\b(sua xe|rua xe)\b/, type: "service", noun: "tiệm xe" },
  { re: /\b(lop hoc|day hoc|trung tam|gia su)\b/, type: "service", noun: "lớp học" },
  { re: /\b(homestay)\b/, type: "stay", noun: "homestay" },
  { re: /\b(khach san|hotel)\b/, type: "stay", noun: "khách sạn" },
  { re: /\b(villa)\b/, type: "stay", noun: "villa" },
  { re: /\b(nha nghi)\b/, type: "stay", noun: "nhà nghỉ" },
  { re: /\b(tour)\b/, type: "travel", noun: "tour" },
  { re: /\b(thue xe|cho thue xe)\b/, type: "travel", noun: "dịch vụ thuê xe" },
  { re: /\b(tiktok|youtube|kenh|livestream|kol|koc)\b/, type: "creator", noun: "kênh" },
  { re: /\b(chup anh|photo|studio)\b/, type: "freelance", noun: "dịch vụ chụp ảnh" },
  { re: /\b(thiet ke|design)\b/, type: "freelance", noun: "dịch vụ thiết kế" },
  { re: /\b(nha dat|bat dong san|bds)\b/, type: "broker", noun: "văn phòng nhà đất" },
  { re: /\b(quan ao|thoi trang|giay dep)\b/, type: "shopping", noun: "shop thời trang" },
  { re: /\b(my pham|skincare)\b/, type: "shopping", noun: "shop mỹ phẩm" },
  { re: /\b(tap hoa|tap hoa)\b/, type: "shopping", noun: "tiệm tạp hoá" },
  { re: /\b(tiem hoa|shop hoa|hoa tuoi)\b/, type: "shopping", noun: "tiệm hoa" },
  { re: /\b(dac san)\b/, type: "shopping", noun: "shop đặc sản" },
];

export function detectBizKind(text: string): { type?: BusinessType; noun?: string } {
  const n = ` ${normalizeVi(text)} `;
  for (const s of SUBTYPES) if (s.re.test(n)) return { type: s.type, noun: s.noun };
  return {};
}

// ── Ý tưởng ưu đãi theo loại hình ──
const I = (id: string, t: string, d: string): Idea => ({ id, t, d });
const OFFERS: Record<BusinessType, Idea[]> = {
  food: [
    I("f1", "Giờ vàng buổi sáng", "Giảm 10–15% trong khung giờ vắng nhất (vd 7h–9h). Khách quen giờ đó dần sẽ thành thói quen."),
    I("f2", "Combo giá chẵn", "Gộp món chính + nước thành combo giá tròn (49k, 79k…). Khách dễ quyết, bạn bán thêm được nước."),
    I("f3", "Mua 5 tặng 1", "Mỗi lần mua được đóng 1 dấu, đủ 5 tặng 1 phần. Chi phí thấp mà giữ khách rất hiệu quả."),
    I("f4", "Đi nhóm có quà", "Nhóm từ 4 người được tặng 1 phần ăn vặt hoặc giảm 10% — kéo khách đi đông."),
    I("f5", "Món mới mời nếm thử", "Ra món mới thì mời 20 khách đầu nếm thử miễn phí hoặc nửa giá, nhân tiện xin góp ý."),
    I("f6", "Freeship quanh khu", "Miễn phí giao trong bán kính 2–3km cho đơn từ mức nhỏ, hút khách ngại ra đường."),
    I("f7", "Mang ly riêng được giảm", "Khách mang ly/hộp riêng giảm 3–5k. Vừa xanh vừa được khách thiện cảm."),
    I("f8", "Tuần sinh nhật có quà", "Khách đến đúng tuần sinh nhật được tặng bánh hoặc nước — họ hay chụp ảnh đăng lên, quảng cáo miễn phí cho bạn."),
  ],
  service: [
    I("s1", "Lần đầu giảm sâu", "Khách mới giảm 20–30% lần đầu để dám thử; lần sau về giá thường nhưng tặng kèm một dịch vụ nhỏ."),
    I("s2", "Gói nhiều buổi", "Bán gói 5 hoặc 10 buổi rẻ hơn mua lẻ 10–15%. Bạn có tiền trước, khách có lý do quay lại."),
    I("s3", "Rủ bạn cùng đi", "Khách dẫn bạn mới tới thì cả hai cùng được giảm 10%."),
    I("s4", "Giờ vắng giá mềm", "Giảm nhẹ cho buổi trưa hoặc đầu tuần để lấp lịch trống."),
    I("s5", "Tặng kèm dịch vụ nhỏ", "Đi kèm một dịch vụ nhỏ miễn phí (gội đầu, massage tay, kiểm tra nhanh…) — tốn ít mà khách thấy được chăm."),
    I("s6", "Tư vấn miễn phí", "Buổi tư vấn/kiểm tra đầu tiên miễn phí để khách hiểu mình cần gì."),
    I("s7", "Nhắc lịch có quà", "Nhắn nhắc lịch định kỳ; khách quay lại đúng hẹn được ưu đãi nhỏ."),
    I("s8", "Tháng sinh nhật", "Giảm 15–20% trong tháng sinh nhật của khách."),
  ],
  stay: [
    I("h1", "Đêm thứ hai giảm giá", "Ở từ 2 đêm thì đêm thứ hai giảm 20–30% để khách ở lâu hơn."),
    I("h2", "Đặt sớm giá tốt", "Đặt trước 14 ngày giảm 10% — bạn chủ động lấp phòng từ sớm."),
    I("h3", "Ngày thường giá mềm", "Chủ nhật đến thứ năm giảm giá hoặc tặng bữa sáng."),
    I("h4", "Quà trải nghiệm địa phương", "Tặng bản đồ quán ngon tự làm, voucher cà phê gần đó, hoặc cho mượn xe đạp miễn phí."),
    I("h5", "Khách quay lại", "Lần ở thứ hai giảm 10%, hoặc nâng hạng phòng nếu còn trống."),
    I("h6", "Trả phòng muộn miễn phí", "Cho trả phòng muộn 1–2 tiếng khi phòng không có khách kế tiếp."),
    I("h7", "Gói cặp đôi, gia đình", "Trang trí nhẹ + bữa sáng cho cặp đôi; phòng gia đình tặng đồ ăn vặt cho bé."),
    I("h8", "Giá tuần, giá tháng", "Giá ở dài ngày cho khách công tác hoặc làm việc từ xa."),
  ],
  travel: [
    I("t1", "Đi nhóm giảm giá", "Nhóm từ 4–5 người giảm theo đầu người."),
    I("t2", "Đặt sớm", "Đặt trước 1 tuần giảm 10%."),
    I("t3", "Combo trọn gói", "Gộp xe + vé + ăn thành một giá, khách khỏi phải tính toán."),
    I("t4", "Tặng ảnh chuyến đi", "Chụp ảnh đẹp cho khách trong chuyến đi rồi gửi miễn phí — khách đăng lên là quảng bá giúp bạn."),
    I("t5", "Ngày thường giá mềm", "Tour ngày thường rẻ hơn cuối tuần."),
    I("t6", "Khách cũ giới thiệu", "Giới thiệu bạn bè đặt tour thì người giới thiệu được giảm cho lần sau."),
    I("t7", "Nước và đồ ăn nhẹ", "Tặng nước, bánh trên xe — nhỏ thôi mà khách nhớ."),
    I("t8", "Thuê dài ngày", "Thuê từ 3 ngày giảm giá theo ngày."),
  ],
  creator: [
    I("c1", "Mã giảm giá cho người xem", "Hợp tác với quán/tiệm, tạo mã giảm giá riêng cho người theo dõi kênh."),
    I("c2", "Minigame tặng quà", "Bình luận, chia sẻ để nhận quà nhỏ — tăng tương tác rất nhanh."),
    I("c3", "Gói hợp tác trọn gói", "Báo giá gói video + bài đăng + story rẻ hơn làm lẻ."),
    I("c4", "Hậu trường độc quyền", "Người theo dõi lâu năm được xem trước hoặc nhận quà nhỏ."),
    I("c5", "Lần hợp tác đầu giá mềm", "Nhãn hàng hợp tác lần đầu giảm 10–20% để thử."),
    I("c6", "Livestream có ưu đãi", "Xem live đến cuối nhận mã giảm giá."),
  ],
  freelance: [
    I("r1", "Dự án đầu giá mềm", "Khách mới giảm 10–15% cho lần đầu để tạo niềm tin."),
    I("r2", "Gói theo tháng", "Nhận việc định kỳ theo tháng với giá ổn định."),
    I("r3", "Tặng thêm một lần chỉnh sửa", "Miễn phí thêm 1 lượt sửa — khách yên tâm hơn nhiều."),
    I("r4", "Giới thiệu khách", "Giới thiệu khách mới thì được giảm cho lần làm kế tiếp."),
    I("r5", "Tư vấn nhanh miễn phí", "15 phút trao đổi miễn phí để hiểu đúng nhu cầu."),
    I("r6", "Sản phẩm mẫu kèm ưu đãi", "Đăng sản phẩm mẫu kèm ưu đãi ngắn hạn cho khách đặt trong tuần."),
  ],
  broker: [
    I("b1", "Tư vấn miễn phí", "Buổi tư vấn đầu tiên miễn phí, không ràng buộc."),
    I("b2", "Giảm phí cho khách được giới thiệu", "Khách do khách cũ giới thiệu được giảm phí dịch vụ."),
    I("b3", "Hỗ trợ giấy tờ", "Hỗ trợ miễn phí phần thủ tục, giấy tờ đi kèm."),
    I("b4", "Dẫn xem miễn phí", "Đưa đón khách đi xem miễn phí."),
    I("b5", "Bản tin riêng mỗi tuần", "Gửi danh sách mới mỗi tuần cho khách đăng ký."),
    I("b6", "Công khai phí từ đầu", "Trong môi giới, rõ ràng chi phí ngay từ đầu chính là “ưu đãi” khiến khách tin nhất."),
  ],
  shopping: [
    I("p1", "Món thứ hai giảm giá", "Mua món thứ hai giảm 10–20% — tăng giá trị mỗi đơn."),
    I("p2", "Freeship từ mức nhỏ", "Miễn phí giao cho đơn từ mức vừa phải."),
    I("p3", "Quà tặng kèm", "Tặng túi, móc khoá, mẫu thử… cho đơn đủ mức."),
    I("p4", "Xả hàng cuối mùa", "Giảm sâu mẫu cũ để quay vòng vốn."),
    I("p5", "Tích điểm khách quen", "Tích điểm để đổi quà hoặc giảm giá lần sau."),
    I("p6", "Flash sale khung giờ", "Giảm mạnh trong 1–2 tiếng, báo trước để khách canh."),
    I("p7", "Đổi trả dễ dàng", "Cho đổi size/màu trong 3–7 ngày — khách dám mua hơn."),
    I("p8", "Gói quà miễn phí", "Gói quà đẹp miễn phí vào dịp lễ."),
  ],
  other: [
    I("o1", "Khách mới giảm lần đầu", "Ưu đãi riêng cho lần đầu để khách dám thử."),
    I("o2", "Rủ bạn cùng được ưu đãi", "Khách giới thiệu bạn mới thì cả hai cùng được giảm."),
    I("o3", "Ngày vắng giá mềm", "Giảm nhẹ vào ngày/khung giờ vắng nhất."),
    I("o4", "Tích điểm khách quen", "Đủ số lần thì tặng quà hoặc giảm giá."),
    I("o5", "Quà nhỏ kèm theo", "Một món quà nhỏ bất ngờ — tốn ít mà khách nhớ lâu."),
    I("o6", "Tháng sinh nhật", "Ưu đãi riêng trong tháng sinh nhật của khách."),
  ],
};

// ── Mẹo theo chủ đề (dùng chung mọi loại hình; {n} = tên chỗ kinh doanh) ──
const TIPS: Record<Exclude<BizTopic, "offer" | "post" | "holiday">, Idea[]> = {
  slow: [
    I("sl1", "Ưu đãi đúng khung vắng", "Chọn đúng khung giờ vắng nhất rồi làm ưu đãi riêng cho khung đó — đừng giảm cả ngày, dễ lỗ."),
    I("sl2", "Đăng ưu đãi lên app", "Đăng ưu đãi giờ vắng lên Liên Minh Liên Doanh (/uu-dai) để người quanh khu vực thấy ngay."),
    I("sl3", "Lý do để ghé", "Tạo một món/dịch vụ chỉ có trong khung giờ đó — khách sẽ có lý do để đến."),
    I("sl4", "Nhắn khách quen", "Nhắn khách quen kiểu “Sáng nay {n} vắng, ghé mình tặng…”. Khách quen rất dễ quay lại."),
    I("sl5", "Hợp tác với hàng xóm", "Bắt tay với chỗ bên cạnh: khách bên kia mang hoá đơn qua được giảm, và ngược lại."),
    I("sl6", "Thẻ ưu đãi mùa thấp điểm", "Mùa vắng thì bán trước thẻ ưu đãi cả tháng với giá tốt — có tiền trước, khách có lý do quay lại."),
    I("sl7", "Tận dụng lúc vắng", "Giờ vắng là lúc đẹp để chụp ảnh, quay video giới thiệu {n} cho thật chỉn chu."),
    I("sl8", "Làm mới không khí", "Đổi nhạc, ánh đèn, thêm góc chụp ảnh mới — đôi khi khách vắng chỉ vì thấy không có gì mới."),
  ],
  newcust: [
    I("n1", "Trang doanh nghiệp thật đầy đủ", "Cập nhật trang {n} trên app với ảnh rõ, giờ mở cửa, địa chỉ — người ta tin chỗ có thông tin đầy đủ."),
    I("n2", "Ưu đãi lần đầu", "Có một ưu đãi riêng cho khách lần đầu để họ dám thử."),
    I("n3", "Xin khách đánh giá", "Nhờ khách hài lòng để lại đánh giá — khách mới hay đọc đánh giá trước khi đến."),
    I("n4", "Đăng bài đều tay", "Đăng 3–4 bài mỗi tuần, nhiều ảnh thật, ít chữ."),
    I("n5", "Góp mặt ở Cộng đồng", "Tham gia kênh Cộng đồng theo khu vực (/cong-dong), chia sẻ điều hữu ích thay vì chỉ quảng cáo."),
    I("n6", "Hợp tác chéo", "Hợp tác với chủ kinh doanh khác trong app (không cạnh tranh trực tiếp) để giới thiệu khách cho nhau."),
    I("n7", "Mã QR trước cửa", "Đặt mã QR đơn giản trước cửa để người đi ngang dễ theo dõi {n}."),
    I("n8", "Một điểm nhớ", "Làm một món/dịch vụ “đặc trưng” để người ta nhắc tới là nhớ ngay {n} của bạn."),
  ],
  loyal: [
    I("l1", "Nhớ tên, nhớ món quen", "Nhớ tên và món quen của khách — cách rẻ nhất mà hiệu quả nhất."),
    I("l2", "Tích điểm, đóng dấu", "Đủ số lần thì tặng quà — khách có động lực quay lại."),
    I("l3", "Hỏi thăm sau lần đầu", "Nhắn hỏi “Bạn thấy thế nào, lần sau mình làm tốt hơn nha” — khách thấy được quan tâm."),
    I("l4", "Người theo dõi được ưu tiên", "Ưu đãi dành riêng cho người theo dõi {n} trên app — họ nhận thông báo ngay khi có ưu đãi mới."),
    I("l5", "Bất ngờ nho nhỏ", "Thỉnh thoảng tặng một món nhỏ không báo trước, khách sẽ nhớ rất lâu."),
    I("l6", "Hỏi ý khách quen", "Hỏi ý kiến khách quen trước khi ra món/dịch vụ mới — họ thấy mình là một phần của {n}."),
    I("l7", "Tháng sinh nhật", "Một ưu đãi nhỏ trong tháng sinh nhật khách."),
    I("l8", "Xử lý phàn nàn thật khéo", "Xử lý phàn nàn nhanh và lịch sự — khách được xử lý tốt thường còn trung thành hơn trước."),
  ],
  review: [
    I("v1", "Hỏi đúng lúc", "Xin đánh giá lúc khách đang vui nhất: vừa ăn xong, vừa làm xong."),
    I("v2", "Trả lời mọi đánh giá", "Trả lời cả lời khen — cảm ơn và gọi tên khách."),
    I("v3", "Đánh giá chưa tốt", "Xin lỗi trước, giải thích ngắn gọn, mời khách quay lại để bù đắp. Tránh tranh cãi công khai."),
    I("v4", "QR ở quầy", "Đặt mã QR dẫn tới trang {n} trên app ở quầy thanh toán."),
    I("v5", "Đánh giá thật mới quý", "Đừng tặng quà đổi lấy 5 sao — chỉ khuyến khích khách đánh giá thật lòng."),
    I("v6", "Nghe góp ý lặp lại", "Góp ý nào lặp lại nhiều lần thì đó là chỗ nên sửa trước tiên."),
  ],
  price: [
    I("pr1", "Ba mức giá", "Làm 3 mức: cơ bản – phổ biến – cao cấp. Đa số khách sẽ chọn mức giữa."),
    I("pr2", "Giá chẵn cho combo", "Combo để giá chẵn dễ nhớ (49k, 99k), món lẻ để giá lẻ."),
    I("pr3", "Tăng giá kèm giá trị", "Muốn tăng giá thì thêm giá trị đi kèm (phần to hơn, bao bì đẹp hơn…) và báo trước cho khách quen."),
    I("pr4", "Tính đủ chi phí", "Tính đủ nguyên liệu, mặt bằng, công trước khi giảm giá — giảm quá sâu rất dễ lỗ."),
    I("pr5", "Gợi ý mua kèm", "Gợi ý thêm một món/dịch vụ nhỏ ở quầy — tăng giá trị đơn nhẹ nhàng."),
    I("pr6", "Giá theo khung giờ", "Giờ đông giữ giá, giờ vắng giá mềm hơn."),
  ],
  opening: [
    I("op1", "Ưu đãi khai trương có hạn", "Tuần đầu ưu đãi mạnh nhưng chỉ 3–7 ngày để tạo cảm giác “phải đi ngay”."),
    I("op2", "Chạy thử với người quen", "Mời người quen, hàng xóm trải nghiệm trước 1–2 ngày để kịp sửa lỗi."),
    I("op3", "Đăng ký trên app sớm", "Đăng ký doanh nghiệp trên Liên Minh Liên Doanh sớm để kịp được duyệt trước ngày mở (/ho-so?view=business)."),
    I("op4", "Góc check-in", "Chuẩn bị một góc chụp ảnh đẹp — khách sẽ tự chụp và đăng giúp bạn."),
    I("op5", "Đếm ngược", "Đăng bài đếm ngược 3–5 ngày trước khai trương."),
    I("op6", "Quà cho khách đầu tiên", "Tặng quà nhỏ cho 50 khách đầu tiên."),
  ],
};

// ── Dịp lễ trong năm (tháng, ngày dương lịch; Tết/Trung thu tính gần đúng theo tháng) ──
const HOLIDAYS: { m: number; d: number; name: string; ideas: string[] }[] = [
  { m: 1, d: 25, name: "Tết", ideas: ["Combo quà Tết đóng hộp đẹp", "Lì xì may mắn cho khách mua đủ mức", "Nhận đặt trước, giao tận nhà dịp Tết"] },
  { m: 2, d: 14, name: "Valentine (14/2)", ideas: ["Combo cặp đôi", "Tặng thiệp hoặc hoa nhỏ cho cặp đôi", "Góc chụp ảnh chủ đề tình yêu"] },
  { m: 3, d: 8, name: "Quốc tế Phụ nữ (8/3)", ideas: ["Tặng hoa hoặc quà nhỏ cho khách nữ", "Giảm giá cho nhóm bạn nữ", "Gói quà miễn phí để tặng mẹ, vợ, người yêu"] },
  { m: 4, d: 30, name: "30/4 – 1/5", ideas: ["Ưu đãi nhóm đi chơi đông", "Đặt sớm giá tốt cho kỳ nghỉ dài", "Combo gia đình"] },
  { m: 6, d: 1, name: "Quốc tế Thiếu nhi (1/6)", ideas: ["Quà nhỏ cho bé đi cùng bố mẹ", "Combo gia đình", "Góc vui chơi, tô màu cho trẻ"] },
  { m: 9, d: 15, name: "Trung thu", ideas: ["Tặng lồng đèn hoặc bánh nhỏ cho bé", "Combo trà – bánh Trung thu", "Đêm hội có trang trí, chụp ảnh"] },
  { m: 10, d: 20, name: "Phụ nữ Việt Nam (20/10)", ideas: ["Tặng hoa hoặc quà nhỏ cho khách nữ", "Combo đôi tặng mẹ, bạn gái", "Gói quà miễn phí"] },
  { m: 10, d: 31, name: "Halloween", ideas: ["Hoá trang đến được giảm giá", "Món/dịch vụ phiên bản Halloween", "Góc chụp ảnh ma mị vui vui"] },
  { m: 11, d: 20, name: "Nhà giáo Việt Nam (20/11)", ideas: ["Ưu đãi cho thầy cô", "Gói quà tặng thầy cô", "Học sinh, sinh viên mua quà được giảm"] },
  { m: 11, d: 27, name: "Black Friday", ideas: ["Flash sale 1 ngày", "Mua nhiều giảm sâu hơn", "Ưu đãi riêng cho người theo dõi"] },
  { m: 12, d: 24, name: "Giáng sinh", ideas: ["Trang trí Noel, góc chụp ảnh", "Quà tặng kèm dịp Giáng sinh", "Combo nhóm bạn, gia đình"] },
];

function upcomingHolidays(now = new Date()): typeof HOLIDAYS {
  const y = now.getFullYear();
  const withDate = HOLIDAYS.flatMap((h) => [
    { ...h, at: new Date(y, h.m - 1, h.d) },
    { ...h, at: new Date(y + 1, h.m - 1, h.d) },
  ]).filter((h) => h.at.getTime() >= now.getTime() - 86400000);
  withDate.sort((a, b) => a.at.getTime() - b.at.getTime());
  return withDate.slice(0, 2);
}

// ── Nhận diện chủ đề trong câu gõ ──
const TOPIC_RE: [BizTopic, RegExp][] = [
  ["post", /\b(viet|caption|bai dang|dang bai|content|noi dung|slogan|quang cao cho)\b/],
  ["review", /\b(danh gia|review|phan nan|che |bi che|feedback|gop y)\b/],
  ["slow", /\b(vang|e am|it khach|khong co khach|thap diem|mua thap|khong ai|ban cham|e hang)\b/],
  ["holiday", /\b(dip le|ngay le|le tet|tet|noel|giang sinh|valentine|8 3|20 10|20 11|trung thu|halloween|black friday|mua le)\b/],
  ["opening", /\b(khai truong|moi mo|sap mo|mo quan|mo tiem|mo shop|mo cua hang|moi khai truong)\b/],
  ["price", /\b(dinh gia|tang gia|bang gia|dat gia|gia ban|gia ca|combo)\b/],
  ["loyal", /\b(khach quen|giu khach|giu chan|quay lai|trung thanh|tich diem|cham soc khach)\b/],
  ["newcust", /\b(khach moi|hut khach|thu hut|quang ba|them khach|tang khach|marketing|tiep thi|nhieu khach|noi tieng|khach biet)\b/],
  ["offer", /\b(uu dai|khuyen mai|giam gia|voucher|sale|chuong trinh|y tuong)\b/],
];
const BIZ_WORD =
  /\b(quan|tiem|shop|cua hang|homestay|khach san|spa|kinh doanh|buon ban|ban hang|doanh nghiep|khach hang|tour|dich vu|salon|nha hang|doanh thu|mo quan|chu quan|cua minh)\b/;

export function detectBizTopic(text: string): BizTopic | undefined {
  const n = ` ${normalizeVi(text)} `;
  for (const [tp, re] of TOPIC_RE) if (re.test(n)) return tp;
  return undefined;
}
/** Câu gõ tự do (ngoài luồng tư vấn) có phải đang hỏi chuyện kinh doanh không. */
export function looksLikeBizQuestion(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  if (/\b(nen lam|lam|chay|len|nghi|goi y|tu van) (uu dai|khuyen mai|chuong trinh)\b/.test(n)) return true;
  return !!detectBizTopic(text) && (BIZ_WORD.test(n) || !!detectBizKind(text).type);
}
export const isMoreIdeas = (text: string) =>
  /^(them y|y khac|them|con gi nua|nua|goi y them|them goi y|them nua|con y nao)/.test(normalizeVi(text));
export const isThanks = (text: string) =>
  /^(cam on|thanks|thank|tks|ok|oke|okie|okay|hay qua|tuyet|hay do|duoc do|good)\b/.test(normalizeVi(text)) && normalizeVi(text).split(" ").length <= 6;

export function nounFor(type?: BusinessType, noun?: string) {
  return noun || (type ? TYPE_NOUN[type] : "chỗ kinh doanh");
}

// ── Chọn ý không trùng: ưu tiên ý chưa gợi ý (nhớ trên máy), hết thì xoay vòng lại ──
const SEEN_KEY = "lmld:biz-seen";
function loadSeen(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
function saveSeen(a: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(a.slice(-200)));
  } catch {
    /* bỏ qua */
  }
}
function takeFresh(pool: Idea[], n: number): Idea[] {
  const seen = loadSeen();
  let fresh = shuffle(pool.filter((x) => !seen.includes(x.id)));
  if (fresh.length < n) {
    // Đã gợi ý hết → quên các ý của nhóm này, bắt đầu vòng mới.
    const ids = new Set(pool.map((x) => x.id));
    const kept = seen.filter((s) => !ids.has(s));
    saveSeen(kept);
    fresh = [...fresh, ...shuffle(pool.filter((x) => !fresh.includes(x)))];
  }
  const out = fresh.slice(0, n);
  saveSeen([...loadSeen(), ...out.map((x) => x.id)]);
  return out;
}

export const TOPIC_LABEL: Record<BizTopic, string> = {
  offer: "Ý tưởng ưu đãi",
  slow: "Hút khách lúc vắng",
  newcust: "Tìm thêm khách mới",
  loyal: "Giữ chân khách quen",
  post: "Viết bài đăng giúp mình",
  review: "Đánh giá của khách",
  price: "Định giá, làm combo",
  opening: "Chuẩn bị khai trương",
  holiday: "Dịp lễ sắp tới",
};
export const TOPIC_CHIPS = (Object.keys(TOPIC_LABEL) as BizTopic[]).map((k) => TOPIC_LABEL[k]);
/** Chip gợi ý sau mỗi câu trả lời: "Thêm ý khác" + 3 chủ đề khác. */
export function followUpChips(current: BizTopic): string[] {
  const others = shuffle((Object.keys(TOPIC_LABEL) as BizTopic[]).filter((k) => k !== current && k !== "offer")).slice(0, 2);
  const base = current === "offer" ? [] : [TOPIC_LABEL.offer];
  return ["Thêm ý khác", ...base, ...others.map((k) => TOPIC_LABEL[k])].slice(0, 4);
}

const fill = (s: string, n: string) => s.replace(/\{n\}/g, n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const INTRO: Record<BizTopic, string[]> = {
  offer: [
    "Okie, Lomi gợi ý cho {n} của bạn vài ý ưu đãi nè 💡",
    "Để Lomi nghĩ giúp nha… Mấy ưu đãi này khá hợp với {n} đó 😊",
    "Có ngay đây! Vài kiểu ưu đãi nhiều nơi làm rất hiệu quả:",
  ],
  slow: [
    "Vắng khách thì ai làm kinh doanh cũng lo, nhưng có nhiều cách lấp chỗ trống lắm nè:",
    "Lúc vắng cũng là lúc để thử cái mới đó. Lomi gợi ý vài cách cho {n} nha:",
    "Đừng lo quá nha 😊 Thử mấy cách này xem:",
  ],
  newcust: [
    "Muốn nhiều người biết tới {n} hơn thì thử mấy cách này nè:",
    "Tìm khách mới không nhất thiết phải tốn nhiều tiền đâu. Lomi gợi ý nha:",
    "Vài cách để {n} được nhiều người biết tới hơn:",
  ],
  loyal: [
    "Giữ một khách quen dễ hơn tìm một khách mới nhiều lắm đó. Vài cách cho {n} nè:",
    "Khách quen là “tài sản” quý nhất của {n}. Lomi gợi ý nha:",
    "Để khách nhớ và quay lại {n}, bạn thử mấy cách này:",
  ],
  review: [
    "Đánh giá của khách ảnh hưởng nhiều tới khách mới lắm. Vài mẹo cho {n} nè:",
    "Chuyện đánh giá thì Lomi có mấy mẹo nhỏ nè:",
  ],
  price: ["Chuyện giá cả thì Lomi có vài gợi ý cho {n} nè:", "Định giá khéo một chút là khách dễ chọn hơn nhiều. Tham khảo nha:"],
  opening: [
    "Chúc mừng {n} sắp khai trương nha 🎉 Vài việc nên chuẩn bị nè:",
    "Khai trương là dịp tạo ấn tượng đầu tiên. Lomi gợi ý nha:",
  ],
  holiday: ["Sắp tới có mấy dịp lễ nè, {n} tranh thủ được đó:", "Dịp lễ là cơ hội tốt để hút khách. Lomi gợi ý cho {n} nha:"],
  post: ["Lomi viết thử vài mẫu cho {n} nè, bạn sửa lại theo ý mình nha ✍️", "Đây là vài mẫu bài đăng cho {n}, bạn chỉnh tên món/giá cho đúng nha ✍️"],
};

const CLOSE: string[] = [
  "Bạn thấy ý nào hợp nhất? Muốn Lomi viết luôn bài đăng cho ý đó không?",
  "Cần thêm ý khác thì cứ bảo Lomi nha 😊",
  "Nếu kể thêm về {n} (khách chủ yếu là ai, lúc nào hay vắng…), Lomi gợi ý sát hơn được đó.",
  "Chúc {n} đông khách nha 💚 Cần gì cứ hỏi Lomi.",
];

// Mẫu bài đăng (giọng nói với KHÁCH) — {n} tên chỗ, {N} viết hoa đầu, {T} tên ưu đãi.
const POSTS: string[] = [
  "✨ Ưu đãi “{T}” tại {n} nhà mình!\nGhé {n} trong tuần này để nhận ưu đãi nha — có hạn thôi đó 💚",
  "Ai đang tìm một {n} dễ thương thì ghé tụi mình nha 🥰\nĐang có ưu đãi “{T}”.\nNhắn tin để giữ chỗ hoặc hỏi thêm nhé!",
  "📣 TIN VUI CHO KHÁCH QUEN\n{N} đang có ưu đãi “{T}”!\nCảm ơn mọi người đã luôn ủng hộ tụi mình 💛",
  "Hôm nay bạn đã tự thưởng cho mình chưa? ✨\n{N} đang có ưu đãi “{T}” — ghé chơi nha!\nHẹn gặp bạn 😊",
  "🎁 Ưu đãi có hạn: “{T}”\nTheo dõi {n} trên Liên Minh Liên Doanh để không bỏ lỡ ưu đãi tiếp theo nha!",
];
const POST_SEEN = "lmld:biz-post-seen";

function writePosts(type: BusinessType | undefined, n: string): string {
  const offer = takeFresh(OFFERS[type ?? "other"], 1)[0];
  let seen: number[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(POST_SEEN) || "[]");
  } catch {
    /* bỏ qua */
  }
  let idx = shuffle(POSTS.map((_, i) => i).filter((i) => !seen.includes(i)));
  if (idx.length < 2) {
    seen = [];
    idx = shuffle(POSTS.map((_, i) => i));
  }
  const two = idx.slice(0, 2);
  try {
    localStorage.setItem(POST_SEEN, JSON.stringify([...seen, ...two]));
  } catch {
    /* bỏ qua */
  }
  const body = two
    .map((i, k) =>
      `📝 Mẫu ${k + 1}:\n` +
      POSTS[i].replace(/\{T\}/g, cap(offer.t)).replace(/\{N\}/g, cap(n)).replace(/\{n\}/g, n),
    )
    .join("\n\n");
  return `${body}\n\n🎯 Ưu đãi Lomi chọn cho mẫu: “${cap(offer.t)}” — ${offer.d} Bạn thay bằng ưu đãi thật của mình nha.\n\n💡 Mẹo: kèm 1–3 ảnh thật, sáng và rõ; ghi rõ thời hạn ưu đãi. Muốn đăng ưu đãi lên app: Hồ sơ → Doanh nghiệp → Ưu đãi (/ho-so?view=business).`;
}

const MORE_INTRO = [
  "Thêm vài ý nữa cho {n} nè 💡",
  "Còn mấy cách này nữa, bạn xem thử nha:",
  "Lomi nghĩ thêm được mấy ý nè:",
  "Okie, thêm ý mới cho bạn đây 😊",
];
// Nhớ câu mở/kết vừa dùng để lần sau không nói lại y chang.
let lastIntro = "";
let lastClose = "";
const pickNot = (arr: string[], prev: string) => {
  const rest = arr.filter((x) => x !== prev);
  return pick(rest.length ? rest : arr);
};

/** Soạn câu trả lời tư vấn cho 1 chủ đề. more = người dùng bấm/gõ "thêm ý khác". */
export function bizAnswer(ctx: BizCtx, topic: BizTopic, more = false): string {
  const n = nounFor(ctx.type, ctx.noun);
  lastIntro = pickNot(more && topic !== "post" ? MORE_INTRO : INTRO[topic], lastIntro);
  const out: string[] = [fill(lastIntro, n)];
  if (topic === "post") {
    out.push(writePosts(ctx.type, n));
    return out.join("\n\n");
  }
  if (topic === "holiday") {
    const hs = upcomingHolidays();
    for (const h of hs) out.push(`🎉 ${h.name}\n${shuffle(h.ideas).slice(0, 2).map((x) => `• ${x}`).join("\n")}`);
    out.push("💡 Mẹo: lên ý tưởng và đăng ưu đãi trước dịp lễ khoảng 1–2 tuần để khách kịp biết.");
  } else {
    const pool = topic === "offer" ? OFFERS[ctx.type ?? "other"] : TIPS[topic];
    const ideas = takeFresh(pool, 3);
    out.push(ideas.map((x, i) => `${["①", "②", "③"][i]} ${x.t}\n${fill(x.d, n)}`).join("\n\n"));
    if (topic === "offer")
      out.push(
        pick([
          "💡 Mẹo: mỗi lần chỉ nên chạy 1–2 ưu đãi, ghi rõ thời hạn để khách thấy cần tranh thủ.",
          "💡 Mẹo: đăng ưu đãi lên app (Hồ sơ → Doanh nghiệp → Ưu đãi) để người theo dõi nhận thông báo ngay.",
          "💡 Mẹo: tính thử chi phí trước khi giảm — ưu đãi hay là ưu đãi mà mình vẫn có lời.",
        ]),
      );
  }
  lastClose = pickNot(CLOSE, lastClose);
  out.push(fill(lastClose, n));
  return out.join("\n\n");
}

/** Câu gửi Lomi AI nếu thành viên muốn hỏi sâu hơn. */
export function bizAiPrompt(ctx: BizCtx, topic: BizTopic): string {
  return `Tư vấn kỹ hơn giúp mình về "${TOPIC_LABEL[topic].toLowerCase()}" cho ${nounFor(ctx.type, ctx.noun)} của mình.`;
}

export function topicFromChip(text: string): BizTopic | undefined {
  const t = text.trim();
  return (Object.keys(TOPIC_LABEL) as BizTopic[]).find((k) => TOPIC_LABEL[k] === t);
}
