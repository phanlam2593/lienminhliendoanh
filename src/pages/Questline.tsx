import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, RotateCcw, PartyPopper } from "lucide-react";

interface Quest {
  id: string;
  category: string;
  title: string;
  action: string;
  expect: string;
}

const QUESTS: Quest[] = [
  // ===== Tài khoản & Hồ sơ =====
  {
    id: "acc-login",
    category: "Tài khoản & Hồ sơ",
    title: "Đăng nhập",
    action: "Đăng xuất rồi đăng nhập lại bằng đúng tài khoản đang test.",
    expect: "Vào lại được trang chủ, không lỗi.",
  },
  {
    id: "acc-avatar",
    category: "Tài khoản & Hồ sơ",
    title: "Đổi ảnh đại diện",
    action: "Vào Hồ sơ → bấm vào avatar → chọn ảnh mới.",
    expect: "Ảnh mới hiện ngay, không cần tải lại trang.",
  },
  {
    id: "acc-status",
    category: "Tài khoản & Hồ sơ",
    title: "Đổi dòng trạng thái",
    action: "Bấm vào dòng trạng thái dưới tên, gõ 1 câu mới, lưu.",
    expect: "Hiện ngay dưới avatar.",
  },
  {
    id: "acc-bio",
    category: "Tài khoản & Hồ sơ",
    title: "Sửa thông tin cá nhân",
    action: "Hồ sơ → Thông tin cá nhân → sửa tên/SĐT/giới thiệu bản thân, lưu.",
    expect: "Lưu thành công, vào lại thấy đúng thông tin mới.",
  },
  {
    id: "acc-tier",
    category: "Tài khoản & Hồ sơ",
    title: "Xem huy hiệu cấp bậc",
    action: "Bấm vào huy hiệu cấp bậc cạnh tên trong Hồ sơ.",
    expect: "Hiện popup giải thích các mốc điểm/cấp bậc.",
  },
  {
    id: "acc-password",
    category: "Tài khoản & Hồ sơ",
    title: "Đổi mật khẩu",
    action: "Cài đặt → Đổi mật khẩu.",
    expect: "Đổi thành công, đăng xuất rồi đăng nhập lại bằng mật khẩu mới được.",
  },
  {
    id: "acc-notifprefs",
    category: "Tài khoản & Hồ sơ",
    title: "Tuỳ chọn thông báo",
    action: "Cài đặt → Thông báo → tắt/bật thử vài loại.",
    expect: "Trạng thái bật/tắt lưu đúng, vào lại vẫn giữ nguyên.",
  },
  {
    id: "acc-dark",
    category: "Tài khoản & Hồ sơ",
    title: "Dark mode",
    action: "Bật/tắt chế độ tối trong Cài đặt.",
    expect: "Toàn bộ giao diện đổi màu đúng, không chỗ nào 'lệch tông' (chữ trắng trên nền trắng...).",
  },
  {
    id: "acc-lang",
    category: "Tài khoản & Hồ sơ",
    title: "Đổi ngôn ngữ",
    action: "Đổi từ Tiếng Việt sang English trong Cài đặt.",
    expect: "Toàn app đổi ngôn ngữ, không còn chữ Việt sót lại (trừ trang Questline này).",
  },
  {
    id: "acc-otherprofile",
    category: "Tài khoản & Hồ sơ",
    title: "Xem hồ sơ người khác",
    action: "Bấm vào tên/avatar 1 người khác bất kỳ (trong đánh giá, chat...).",
    expect: "Hiện đúng tên thật — KHÔNG hiện 'Ẩn danh'.",
  },
  {
    id: "acc-followers",
    category: "Tài khoản & Hồ sơ",
    title: "Danh sách người theo dõi mình",
    action: "Hồ sơ → bấm số 'Người theo dõi'.",
    expect: "Tên mọi người hiện đúng, không ai 'Ẩn danh'.",
  },
  {
    id: "acc-following",
    category: "Tài khoản & Hồ sơ",
    title: "Danh sách đang theo dõi",
    action: "Hồ sơ → bấm số 'Đang theo dõi'.",
    expect: "Tên mọi người hiện đúng, có thể bỏ theo dõi ngay trong danh sách.",
  },
  {
    id: "acc-regulars",
    category: "Tài khoản & Hồ sơ",
    title: "Danh sách Tin dùng",
    action: "Hồ sơ → bấm số 'Tin dùng'.",
    expect: "Hiện đúng các DN đã claim ưu đãi trước đó.",
  },

  // ===== Doanh nghiệp (khách) =====
  {
    id: "biz-list",
    category: "Doanh nghiệp (khách)",
    title: "Duyệt danh sách DN",
    action: "Khám phá → cuộn/tải thêm danh sách doanh nghiệp.",
    expect: "Tải thêm hoạt động mượt, không lặp/thiếu DN.",
  },
  {
    id: "biz-search",
    category: "Doanh nghiệp (khách)",
    title: "Tìm kiếm DN",
    action: "Gõ tên 1 DN vào ô tìm kiếm ở trang Khám phá.",
    expect: "Ra đúng kết quả khớp tên.",
  },
  {
    id: "biz-filter",
    category: "Doanh nghiệp (khách)",
    title: "Lọc theo loại hình",
    action: "Lọc DN theo 1 loại hình (Ăn uống, Dịch vụ...).",
    expect: "Chỉ hiện đúng DN thuộc loại đó.",
  },
  {
    id: "biz-map",
    category: "Doanh nghiệp (khách)",
    title: "Bản đồ",
    action: "Khám phá → chuyển chế độ Bản đồ.",
    expect: "Thấy đúng các DN đã ghim vị trí trên bản đồ.",
  },
  {
    id: "biz-detail",
    category: "Doanh nghiệp (khách)",
    title: "Xem chi tiết 1 DN",
    action: "Bấm vào 1 doanh nghiệp bất kỳ.",
    expect: "Ảnh bìa, thông tin, giờ mở cửa đầy đủ, không treo/trắng trang.",
  },
  {
    id: "biz-gallery",
    category: "Doanh nghiệp (khách)",
    title: "Xem ảnh gallery DN",
    action: "Bấm vào 1 ảnh trong thư viện ảnh của DN.",
    expect: "Ảnh phóng to hiện NGAY GIỮA màn hình, không phải cuộn xuống mới thấy.",
  },
  {
    id: "biz-social",
    category: "Doanh nghiệp (khách)",
    title: "Link mạng xã hội DN",
    action: "Bấm vào icon Facebook/Website của 1 DN có điền link.",
    expect: "Mở đúng link ở tab mới.",
  },
  {
    id: "biz-review-write",
    category: "Doanh nghiệp (khách)",
    title: "Viết đánh giá",
    action: "Viết 1 đánh giá kèm ảnh cho 1 DN, chọn số sao.",
    expect: "Hiện ngay trong danh sách, ảnh xem được.",
  },
  {
    id: "biz-review-author",
    category: "Doanh nghiệp (khách)",
    title: "Xem tên người đánh giá",
    action: "Xem đánh giá của 1 DN có nhiều người đánh giá.",
    expect: "Tên tất cả đúng, không ai 'Ẩn danh'.",
  },
  {
    id: "biz-review-photo",
    category: "Doanh nghiệp (khách)",
    title: "Xem ảnh đánh giá",
    action: "Bấm vào ảnh đính kèm trong 1 đánh giá.",
    expect: "Ảnh phóng to đúng giữa màn hình.",
  },
  {
    id: "biz-review-delete",
    category: "Doanh nghiệp (khách)",
    title: "Xoá đánh giá của mình",
    action: "Xoá 1 đánh giá bạn vừa viết.",
    expect: "Biến mất khỏi danh sách ngay.",
  },
  {
    id: "biz-follow",
    category: "Doanh nghiệp (khách)",
    title: "Theo dõi DN",
    action: "Bấm 'Theo dõi' 1 doanh nghiệp.",
    expect: "Số người theo dõi tăng đúng, đổi thành 'Đang theo dõi'.",
  },
  {
    id: "biz-message",
    category: "Doanh nghiệp (khách)",
    title: "Nhắn tin chủ DN",
    action: "Ở trang chi tiết DN, bấm 'Nhắn tin'.",
    expect: "Chuyển đúng sang khung chat với chủ DN, không tải lại trang.",
  },
  {
    id: "biz-report",
    category: "Doanh nghiệp (khách)",
    title: "Báo cáo DN",
    action: "Bấm 'Báo cáo' ở 1 DN, điền mô tả + ảnh, gửi.",
    expect: "Gửi thành công, hiện trong 'Báo cáo của tôi'.",
  },
  {
    id: "biz-claim",
    category: "Doanh nghiệp (khách)",
    title: "Nhận 1 ưu đãi",
    action: "Bấm 'Nhận ưu đãi', nhập mã PIN do chủ DN cung cấp.",
    expect: "Nhận mã code + đồng hồ đếm ngược đúng.",
  },
  {
    id: "biz-exchange-send",
    category: "Doanh nghiệp (khách)",
    title: "Gửi yêu cầu trao đổi",
    action: "Từ 1 DN của bạn, gửi yêu cầu 'Trao đổi hỗ trợ' tới 1 DN khác.",
    expect: "Hiện trong tab 'Đang chờ'.",
  },

  // ===== Doanh nghiệp (chủ sở hữu) =====
  {
    id: "own-create",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Tạo DN mới",
    action: "Hồ sơ → Tạo doanh nghiệp mới, điền đủ thông tin + PIN.",
    expect: "Gửi thành công, trạng thái 'Chờ duyệt'.",
  },
  {
    id: "own-edit",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Sửa thông tin DN",
    action: "Sửa tên/giờ mở cửa/mô tả DN của bạn, lưu.",
    expect: "Lưu thành công, hiện đúng ở trang chi tiết.",
  },
  {
    id: "own-cover",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Đổi ảnh bìa",
    action: "Đổi ảnh bìa DN.",
    expect: "Ảnh mới hiện ngay.",
  },
  {
    id: "own-gallery",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Quản lý thư viện ảnh",
    action: "Thêm 2-3 ảnh vào thư viện, xoá thử 1 ảnh.",
    expect: "Thêm/xoá đúng, không vượt quá giới hạn cho phép.",
  },
  {
    id: "own-pin",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Ghim vị trí",
    action: "Bấm 'Ghim vị trí hiện tại' cho DN của bạn.",
    expect: "Lưu toạ độ, DN xuất hiện đúng trên Bản đồ.",
  },
  {
    id: "own-offer-add",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Thêm ưu đãi mới",
    action: "Thêm 1 ưu đãi mới cho DN.",
    expect: "Hiện ngay trong danh sách ưu đãi của DN.",
  },
  {
    id: "own-offer-hide",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Ẩn/hiện ưu đãi",
    action: "Tạm ẩn 1 ưu đãi, rồi hiện lại.",
    expect: "Ưu đãi biến mất/xuất hiện đúng ở trang công khai.",
  },
  {
    id: "own-offer-broadcast",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Gửi thông báo ưu đãi",
    action: "Bấm 'Gửi thông báo' cho 1 ưu đãi đang active.",
    expect: "Người đang theo dõi DN nhận được thông báo.",
  },
  {
    id: "own-claimlist",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Xem người đã nhận ưu đãi",
    action: "Nếu có người claim ưu đãi, xem danh sách người nhận.",
    expect: "Tên người nhận hiện đúng, không 'Ẩn danh'.",
  },
  {
    id: "own-regulars",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Xem khách quen",
    action: "Bấm 'khách quen' trong phần sửa DN.",
    expect: "Hiện đúng danh sách + hạng (VIP/Thân thiết/Mới).",
  },
  {
    id: "own-exchange-respond",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Phản hồi yêu cầu trao đổi",
    action: "Chấp nhận 1 yêu cầu trao đổi gửi tới DN của bạn.",
    expect: "Trạng thái chuyển đúng sang 'Đã chấp nhận'.",
  },
  {
    id: "own-exchange-complete",
    category: "Doanh nghiệp (chủ sở hữu)",
    title: "Hoàn thành trao đổi",
    action: "Đánh dấu hoàn thành từ cả 2 phía cho 1 lượt trao đổi.",
    expect: "Chuyển sang tab 'Hoàn thành', cả 2 bên +1 điểm.",
  },

  // ===== Cộng đồng =====
  {
    id: "comm-channel",
    category: "Cộng đồng",
    title: "Đổi kênh chat",
    action: "Đổi qua lại vài kênh vị trí/chủ đề khác nhau.",
    expect: "Tin nhắn đổi đúng theo kênh, không lẫn giữa các kênh.",
  },
  {
    id: "comm-send-text",
    category: "Cộng đồng",
    title: "Gửi tin nhắn text",
    action: "Gõ và gửi 1 tin nhắn văn bản.",
    expect: "Hiện ngay trong khung chat, không cần tải lại.",
  },
  {
    id: "comm-send-image",
    category: "Cộng đồng",
    title: "Gửi ảnh",
    action: "Gửi 1 ảnh trong khung chat.",
    expect: "Ảnh hiện đúng, bấm vào xem được phóng to.",
  },
  {
    id: "comm-send-gif",
    category: "Cộng đồng",
    title: "Gửi GIF",
    action: "Gửi 1 GIF trong khung chat.",
    expect: "GIF hiện và chạy đúng.",
  },
  {
    id: "comm-reaction",
    category: "Cộng đồng",
    title: "Thả reaction",
    action: "Thả 1 emoji reaction vào tin nhắn của người khác.",
    expect: "Hiện số đếm đúng, thả lại lần 2 để bỏ được.",
  },
  {
    id: "comm-tag",
    category: "Cộng đồng",
    title: "Gắn thẻ @tên",
    action: "Gõ '@' tag 1 người bất kỳ (kể cả người 'cũ', không nằm trong top mới nhất), gửi tin.",
    expect: "Gợi ý tên đúng, người bị tag nhận được thông báo.",
  },
  {
    id: "comm-online",
    category: "Cộng đồng",
    title: "Danh sách online",
    action: "Mở danh sách thành viên trong kênh chat.",
    expect: "Chỉ hiện đúng người đang thật sự online (khớp số 'X online').",
  },
  {
    id: "comm-delete",
    category: "Cộng đồng",
    title: "Xoá tin nhắn của mình",
    action: "Xoá 1 tin nhắn bạn vừa gửi.",
    expect: "Biến mất khỏi khung chat ngay.",
  },
  {
    id: "comm-scroll-old",
    category: "Cộng đồng",
    title: "Xem tin nhắn cũ",
    action: "Cuộn lên đầu khung chat để tải tin nhắn cũ hơn.",
    expect: "Tải thêm đúng, không lặp tin nhắn.",
  },

  // ===== Tin nhắn riêng =====
  {
    id: "msg-thread",
    category: "Tin nhắn riêng",
    title: "Nhắn tin 1-1",
    action: "Nhắn riêng 1 người, gửi vài tin liên tiếp.",
    expect: "Mượt, KHÔNG có khoảng trắng dư phía dưới, không tự tải lại liên tục.",
  },
  {
    id: "msg-image",
    category: "Tin nhắn riêng",
    title: "Gửi ảnh riêng",
    action: "Gửi 1 ảnh trong tin nhắn 1-1.",
    expect: "Ảnh hiện đúng, xem phóng to được.",
  },
  {
    id: "msg-reply",
    category: "Tin nhắn riêng",
    title: "Trả lời tin nhắn",
    action: "Bấm 'Trả lời' 1 tin nhắn cụ thể, gửi phản hồi.",
    expect: "Hiện đúng tin được trích dẫn phía trên.",
  },
  {
    id: "msg-edit",
    category: "Tin nhắn riêng",
    title: "Sửa tin nhắn",
    action: "Sửa lại nội dung 1 tin bạn vừa gửi.",
    expect: "Nội dung cập nhật, có đánh dấu 'đã sửa'.",
  },
  {
    id: "msg-delete",
    category: "Tin nhắn riêng",
    title: "Xoá tin nhắn riêng",
    action: "Xoá 1 tin nhắn bạn vừa gửi.",
    expect: "Biến mất khỏi đoạn chat.",
  },
  {
    id: "msg-inbox",
    category: "Tin nhắn riêng",
    title: "Hộp thư",
    action: "Mở danh sách hội thoại (Tin nhắn).",
    expect: "Tin nhắn cuối cùng + số chưa đọc hiện đúng.",
  },
  {
    id: "msg-unread",
    category: "Tin nhắn riêng",
    title: "Đánh dấu đã đọc",
    action: "Mở 1 hội thoại đang có tin chưa đọc.",
    expect: "Số chưa đọc giảm về 0 ngay khi mở.",
  },

  // ===== Thông báo =====
  {
    id: "notif-receive",
    category: "Thông báo",
    title: "Nhận thông báo",
    action: "Tạo 1 hành động sinh thông báo (follow ai đó, bị tag...).",
    expect: "Chuông có chấm đỏ, mở ra thấy đúng thông báo.",
  },
  {
    id: "notif-markread",
    category: "Thông báo",
    title: "Đánh dấu đã đọc",
    action: "Bấm 'Đánh dấu tất cả đã đọc'.",
    expect: "Chấm đỏ biến mất.",
  },
  {
    id: "notif-delete",
    category: "Thông báo",
    title: "Xoá thông báo đã đọc",
    action: "Xoá các thông báo đã đọc.",
    expect: "Danh sách gọn lại đúng.",
  },

  // ===== Báo cáo =====
  {
    id: "report-mine",
    category: "Báo cáo",
    title: "Xem báo cáo của tôi",
    action: "Vào Hồ sơ → Báo cáo của tôi.",
    expect: "Hiện đúng các báo cáo đã gửi + trạng thái.",
  },
  {
    id: "report-reply-view",
    category: "Báo cáo",
    title: "Xem phản hồi báo cáo",
    action: "Nếu có admin phản hồi báo cáo của bạn, mở xem.",
    expect: "Tên admin phản hồi đúng, KHÔNG hiện 'Người dùng'.",
  },

  // ===== PWA & Cài đặt =====
  {
    id: "pwa-install",
    category: "PWA & Cài đặt",
    title: "Cài app",
    action: "Cài đặt → Cài app ra màn hình chính.",
    expect: "Icon app xuất hiện trên màn hình chính, mở lên chạy như app thật.",
  },
  {
    id: "pwa-push",
    category: "PWA & Cài đặt",
    title: "Thông báo đẩy",
    action: "Bật quyền thông báo đẩy trong Cài đặt.",
    expect: "Nhận được 1 thông báo đẩy thử (kể cả khi tắt app).",
  },
  {
    id: "pwa-offline",
    category: "PWA & Cài đặt",
    title: "Mất mạng thật",
    action: "Bật chế độ máy bay, mở app.",
    expect: "Không treo/trắng màn hình, báo mất mạng rõ ràng, tắt máy bay vào lại được ngay.",
  },
  {
    id: "pwa-update",
    category: "PWA & Cài đặt",
    title: "Cập nhật bản mới",
    action: "Sau khi deploy bản mới, mở lại app.",
    expect: "Hiện toast 'Đã có bản cập nhật', bấm vào cập nhật đúng, KHÔNG tự động tải lại đột ngột.",
  },

  // ===== Admin =====
  {
    id: "admin-overview",
    category: "Admin",
    title: "Xem tổng quan",
    action: "Vào Admin → tab Tổng quan.",
    expect: "Số liệu thành viên/DN/ưu đãi hiển thị đúng.",
  },
  {
    id: "admin-approve-member",
    category: "Admin",
    title: "Duyệt thành viên mới",
    action: "Duyệt 1 tài khoản đang chờ (nếu có).",
    expect: "Chuyển đúng sang danh sách đã duyệt.",
  },
  {
    id: "admin-approve-biz",
    category: "Admin",
    title: "Duyệt DN mới",
    action: "Duyệt 1 doanh nghiệp đang chờ (nếu có).",
    expect: "DN xuất hiện công khai ngay sau khi duyệt.",
  },
  {
    id: "admin-search",
    category: "Admin",
    title: "Tìm kiếm trong Admin",
    action: "Tìm 1 thành viên/DN bằng ô tìm kiếm trong Admin.",
    expect: "Ra đúng kết quả, có phân trang 'Tải thêm' khi cần.",
  },
  {
    id: "admin-csv",
    category: "Admin",
    title: "Xuất CSV",
    action: "Xuất file CSV danh sách thành viên hoặc DN.",
    expect: "Tải về file mở được, dữ liệu đúng.",
  },
  {
    id: "admin-broadcast",
    category: "Admin",
    title: "Gửi thông báo hàng loạt",
    action: "Gửi 1 tin nhắn broadcast tới tất cả thành viên (test xong báo là được).",
    expect: "Thành viên nhận được tin nhắn từ Admin.",
  },

  // ===== Đăng ký & Đăng nhập =====
  {
    id: "reg-new",
    category: "Đăng ký & Đăng nhập",
    title: "Đăng ký tài khoản mới",
    action: "Đăng xuất → Đăng ký 1 tài khoản test hoàn toàn mới.",
    expect: "Tạo thành công, chuyển đúng vào app hoặc màn chờ duyệt.",
  },
  {
    id: "reg-forgot",
    category: "Đăng ký & Đăng nhập",
    title: "Quên mật khẩu",
    action: "Ở màn đăng nhập, dùng chức năng 'Quên mật khẩu'.",
    expect: "Luồng khôi phục hoạt động đúng, không cho thử sai quá 3 lần.",
  },
  {
    id: "reg-duplicate",
    category: "Đăng ký & Đăng nhập",
    title: "Đăng ký trùng username",
    action: "Thử đăng ký lại đúng username đã tồn tại.",
    expect: "Báo lỗi rõ ràng, không tạo ra tài khoản trùng.",
  },

  // ===== Onboarding thành viên mới =====
  {
    id: "onb-welcome",
    category: "Onboarding thành viên mới",
    title: "Màn chào mừng không lặp lại",
    action: "Với 1 tài khoản MỚI, lướt hết 5 trang chào mừng rồi đóng lại. Sau đó mở lại app (F5 hoặc mở lại tab).",
    expect: "Màn chào mừng KHÔNG hiện lại lần 2 — chứng tỏ đã lưu đúng trạng thái 'đã xem'.",
  },

  {
    id: "onb-membernum",
    category: "Onboarding thành viên mới",
    title: "Số thứ tự thành viên",
    action: "Xem dòng 'Bạn là thành viên thứ N' ở trang chào mừng đầu tiên.",
    expect: "Số hiển thị hợp lý (đúng khoảng số thành viên hiện có), không âm/lỗi.",
  },

  // ===== Trang chủ =====
  {
    id: "home-stats-search",
    category: "Trang chủ",
    title: "Tìm trong danh sách thành viên",
    action: "Trang chủ → bấm số 'Thành viên' → gõ tìm 1 tên cụ thể.",
    expect: "Ra đúng kết quả, không phải người tìm nằm ngoài danh sách đã tải.",
  },
  {
    id: "home-stats-biz-search",
    category: "Trang chủ",
    title: "Tìm trong danh sách DN",
    action: "Trang chủ → bấm số 'Doanh nghiệp' → gõ tìm tên 1 DN.",
    expect: "Ra đúng kết quả.",
  },
  {
    id: "home-loadmore",
    category: "Trang chủ",
    title: "Tải thêm thành viên",
    action: "Trong popup 'Thành viên', cuộn xuống cuối, bấm 'Tải thêm'.",
    expect: "Tải thêm đúng, không trùng lặp người đã hiện.",
  },
  {
    id: "home-footer-links",
    category: "Trang chủ",
    title: "Link chân trang",
    action: "Cuộn xuống cuối trang chủ, bấm lần lượt Hướng dẫn / Điều khoản / Bảo mật / Cookie.",
    expect: "Mở đúng từng trang, tự cuộn lên đầu trang mới (không phải đang ở giữa trang).",
  },
  {
    id: "home-welcome-guest",
    category: "Trang chủ",
    title: "Trang chủ khi CHƯA đăng nhập",
    action: "Đăng xuất, xem lại trang chủ dành cho khách.",
    expect: "Hiện đúng nội dung giới thiệu app + nút mời đăng ký/đăng nhập.",
  },

  // ===== Pháp lý & Hướng dẫn =====
  {
    id: "legal-terms",
    category: "Pháp lý & Hướng dẫn",
    title: "Trang Điều khoản không lỗi",
    action: "Mở trang Điều khoản sử dụng, cuộn hết xuống cuối, bấm nút 'Quay lại'.",
    expect: "Trang tải đủ, không trắng/vỡ giữa chừng; nút quay lại đưa đúng về Hồ sơ, không lỗi console.",
  },
  {
    id: "legal-privacy",
    category: "Pháp lý & Hướng dẫn",
    title: "Trang Chính sách bảo mật không lỗi",
    action: "Mở trang Chính sách bảo mật, cuộn hết xuống cuối.",
    expect: "Trang tải đủ, không trắng/vỡ, nút quay lại ở cuối hoạt động đúng.",
  },
  {
    id: "legal-cookie",
    category: "Pháp lý & Hướng dẫn",
    title: "Trang Chính sách Cookie không lỗi",
    action: "Mở trang Chính sách Cookie & bên thứ ba, cuộn hết xuống cuối.",
    expect: "Trang tải đủ, không trắng/vỡ, nút quay lại ở cuối hoạt động đúng.",
  },
  {
    id: "guide-page",
    category: "Pháp lý & Hướng dẫn",
    title: "Trang Hướng dẫn không lỗi",
    action: "Hồ sơ → Hướng dẫn, cuộn hết trang.",
    expect: "Trang tải đủ, không có chữ/icon vỡ, không có link chết (bấm thử 1-2 link nếu có).",
  },

  // ===== Cộng đồng nâng cao =====
  {
    id: "comm-pin",
    category: "Cộng đồng nâng cao",
    title: "Ghim tin nhắn (Admin)",
    action: "Với tài khoản admin, ghim 1 tin nhắn trong kênh chat.",
    expect: "Tin nhắn hiện ở khu vực ghim phía đầu kênh.",
  },
  {
    id: "comm-location",
    category: "Cộng đồng nâng cao",
    title: "Đổi vị trí kênh",
    action: "Đổi từ 'Toàn quốc' sang 1 khu vực cụ thể (VD Đà Lạt).",
    expect: "Danh sách tin nhắn lọc đúng theo khu vực đã chọn.",
  },
  {
    id: "comm-typing",
    category: "Cộng đồng nâng cao",
    title: "Trạng thái đang nhập",
    action: "Nhờ 1 người khác gõ tin nhắn cùng lúc, quan sát dòng 'đang nhập...'.",
    expect: "Hiện đúng tên người đang gõ, biến mất khi họ gửi/dừng.",
  },
  {
    id: "comm-mention-self",
    category: "Cộng đồng nâng cao",
    title: "Tự tag chính mình",
    action: "Gõ '@' tag đúng tên của chính bạn, gửi tin.",
    expect: "Không bị lỗi, xử lý hợp lý (không cần tự thông báo cho chính mình).",
  },

  // ===== Tin nhắn nâng cao =====
  {
    id: "msg-loadolder",
    category: "Tin nhắn nâng cao",
    title: "Xem tin nhắn cũ hơn (1-1)",
    action: "Trong 1 đoạn chat dài, cuộn lên đầu, bấm 'Xem thêm tin nhắn cũ'.",
    expect: "Tải thêm đúng, không mất vị trí đang xem, không lặp tin.",
  },

  // ===== Doanh nghiệp nâng cao (chủ sở hữu) =====
  {
    id: "own-exchange-reject",
    category: "Doanh nghiệp nâng cao",
    title: "Từ chối yêu cầu trao đổi",
    action: "Từ chối 1 yêu cầu trao đổi gửi tới DN của bạn.",
    expect: "Chuyển đúng sang tab 'Đã từ chối'.",
  },
  {
    id: "own-exchange-limit",
    category: "Doanh nghiệp nâng cao",
    title: "Giới hạn 5 trao đổi chưa xong",
    action: "Thử gửi liên tiếp 5 yêu cầu trao đổi từ 1 DN mà chưa hoàn thành cái nào.",
    expect: "Tới yêu cầu thứ 6 bị chặn, có cảnh báo rõ ràng.",
  },
  {
    id: "own-photo-limit",
    category: "Doanh nghiệp nâng cao",
    title: "Giới hạn ảnh gallery",
    action: "Thử thêm ảnh vượt quá giới hạn cho phép (8 ảnh) vào 1 DN.",
    expect: "Bị chặn thêm, có thông báo rõ ràng, không crash.",
  },
  {
    id: "own-regulars-tier",
    category: "Doanh nghiệp nâng cao",
    title: "Hạng khách quen",
    action: "Xem 1 khách quen đã ghé đủ nhiều lần để lên hạng VIP/Thân thiết.",
    expect: "Hạng hiển thị đúng theo số lượt ghé thực tế.",
  },

  // ===== Admin nâng cao =====
  {
    id: "admin-reject-member",
    category: "Admin nâng cao",
    title: "Từ chối thành viên",
    action: "Từ chối 1 tài khoản đang chờ duyệt (nếu có, test xong có thể bỏ qua).",
    expect: "Chuyển đúng sang trạng thái đã từ chối.",
  },
  {
    id: "admin-reject-biz",
    category: "Admin nâng cao",
    title: "Từ chối DN",
    action: "Từ chối 1 doanh nghiệp đang chờ duyệt (nếu có).",
    expect: "Chuyển đúng trạng thái, không hiện công khai.",
  },
  {
    id: "admin-reports-manage",
    category: "Admin nâng cao",
    title: "Quản lý trạng thái báo cáo",
    action: "Đổi trạng thái 1 báo cáo qua các bước Chờ → Đã phản hồi → Đã xử lý.",
    expect: "Trạng thái cập nhật đúng ở cả 2 phía (admin và người gửi).",
  },
  {
    id: "admin-exchanges-view",
    category: "Admin nâng cao",
    title: "Xem danh sách Trao đổi hỗ trợ",
    action: "Admin → mở tab quản lý Trao đổi hỗ trợ.",
    expect: "Danh sách đầy đủ, đúng trạng thái từng lượt trao đổi.",
  },
  {
    id: "admin-activity",
    category: "Admin nâng cao",
    title: "Nhật ký hoạt động",
    action: "Admin → xem tab Hoạt động gần đây.",
    expect: "Ghi nhận đúng các hành động quan trọng gần đây trong app.",
  },

  // ===== Trường hợp biên =====
  {
    id: "edge-empty-offers",
    category: "Trường hợp biên",
    title: "Trang Ưu đãi khi trống",
    action: "Nếu chưa từng claim ưu đãi nào, xem trang Ưu đãi.",
    expect: "Hiện đúng thông báo trống + nút 'Khám phá doanh nghiệp', không trắng trang.",
  },
  {
    id: "edge-avatar-invalid",
    category: "Trường hợp biên",
    title: "Upload sai định dạng",
    action: "Thử tải lên 1 file KHÔNG phải ảnh (PDF, ZIP...) làm avatar.",
    expect: "Báo lỗi rõ ràng, app không bị treo/crash.",
  },
  {
    id: "edge-avatar-large",
    category: "Trường hợp biên",
    title: "Upload ảnh quá lớn",
    action: "Thử tải lên 1 ảnh vượt quá 5MB.",
    expect: "Báo lỗi giới hạn dung lượng rõ ràng.",
  },
  {
    id: "edge-double-claim",
    category: "Trường hợp biên",
    title: "Bấm nhận ưu đãi 2 lần liên tiếp nhanh",
    action: "Bấm 'Nhận ưu đãi' 2 lần thật nhanh liên tiếp cho cùng 1 ưu đãi.",
    expect: "Chỉ tạo ra đúng 1 mã, không bị lỗi/trùng.",
  },
];

const STORAGE_KEY = "lmld:questline:v3";
const CATEGORIES = [...new Set(QUESTS.map((q) => q.category))];

export default function Questline() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
      else {
        // Di chuyển tiến độ từ bản v2 cũ (nếu có) sang, tránh mất công tick lại từ đầu.
        const old = localStorage.getItem("lmld:questline:v2");
        if (old) setDone(JSON.parse(old));
      }
    } catch {}
    setLoaded(true);
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const willCheck = !prev[id];
      const next = { ...prev, [id]: willCheck };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (willCheck) {
          toast.success("✓ Đã lưu tiến độ", { duration: 1000 });
        }
      } catch {
        toast.error("Không lưu được — trình duyệt đang chặn localStorage?");
      }
      return next;
    });
  };

  const reset = () => {
    if (!confirm("Xoá hết tiến độ, làm lại từ đầu?")) return;
    setDone({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    toast("Đã làm mới tiến độ");
  };

  const total = QUESTS.length;
  const completed = useMemo(() => QUESTS.filter((q) => done[q.id]).length, [done]);
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-4 space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Link
          to="/ho-so"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg flex-1">🎯 Questline kiểm tra app</h1>
        <button
          onClick={reset}
          aria-label="Làm lại từ đầu"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-primary/20 shadow-soft p-4 space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Tiến độ</span>
          <span className="text-primary">
            {completed}/{total} ({pct}%)
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-brand transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tự động lưu ngay khi tick — tắt app rồi vào lại, tiến độ vẫn còn nguyên trên máy này.
        </p>
        {pct === 100 && (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-bold pt-1">
            <PartyPopper className="w-4 h-4" /> Hoàn thành 100%! Đã đi qua hết mọi tính năng chính — tự tin launch được
            rồi 🌿
          </div>
        )}
      </div>

      {!loaded ? (
        <p className="text-center text-sm text-muted-foreground py-8">Đang tải tiến độ…</p>
      ) : (
        CATEGORIES.map((cat) => {
          const items = QUESTS.filter((q) => q.category === cat);
          const catDone = items.filter((q) => done[q.id]).length;
          return (
            <section key={cat} className="space-y-2">
              <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                {cat}
                <span className="text-[11px] font-normal">
                  ({catDone}/{items.length})
                </span>
              </h2>
              <div className="space-y-1.5">
                {items.map((q) => {
                  const checked = !!done[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => toggle(q.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                        checked ? "bg-primary/5 border-primary/30" : "bg-card border-border hover:bg-accent"
                      }`}
                    >
                      <div
                        className={`shrink-0 w-5 h-5 rounded-full grid place-items-center mt-0.5 ${
                          checked ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/40"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${checked ? "line-through text-muted-foreground" : ""}`}>
                          {q.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground/70">Làm:</span> {q.action}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground/70">Kỳ vọng:</span> {q.expect}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
