import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, RotateCcw, PartyPopper } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

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
    expect:
      "Hiện đúng các DN đã claim ưu đãi (kèm lượt ghé/hạng) VÀ các DN đang follow nhưng chưa claim (tag 'Đang theo dõi') — không DN nào hiện 2 tag cùng lúc.",
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
    action: "Nếu có admin hoặc chủ DN phản hồi báo cáo của bạn, mở xem, bấm vào avatar/tên người phản hồi.",
    expect:
      "Tên đúng (không 'Người dùng'), có tag 'Admin'/'Chủ doanh nghiệp' phù hợp, bấm avatar/tên mở được quick profile.",
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
    action: "Đổi trạng thái 1 báo cáo qua Chờ xử lý → Đã giải quyết → Đã đóng (3 nút bấm tay).",
    expect:
      "Trạng thái cập nhật đúng ở cả 2 phía; 'Đã phản hồi' tự chuyển khi admin gửi reply đầu tiên, không có nút bấm tay riêng.",
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

  // ===== Cập nhật phiên 31/07 =====
  {
    id: "new-follow-business-notif",
    category: "Cập nhật phiên 31/07",
    title: "Thông báo follow doanh nghiệp",
    action: "Tài khoản A follow 1 DN của tài khoản B (chưa từng follow trước đó).",
    expect:
      "B nhận thông báo có TÊN DN trong tiêu đề, bấm vào ra thẳng danh sách người theo dõi của đúng DN đó (mở sẵn), thấy A trong danh sách.",
  },
  {
    id: "new-follow-personal-notif",
    category: "Cập nhật phiên 31/07",
    title: "Thông báo follow cá nhân",
    action: "Tài khoản A follow tài khoản B với tư cách cá nhân (không phải DN).",
    expect:
      "B nhận thông báo chung 'Bạn có người theo dõi mới', bấm vào ra tab Theo dõi trong Tin nhắn (không phải trang DN).",
  },
  {
    id: "new-follow-2-separate",
    category: "Cập nhật phiên 31/07",
    title: "2 thông báo follow không đè nhau",
    action: "Cùng 1 người vừa follow DN của bạn, vừa follow bạn cá nhân (2 hành động khác nhau).",
    expect: "Thấy ĐỦ 2 dòng thông báo riêng biệt trong mục Thông báo, không cái nào bị mất/đè lên cái kia.",
  },
  {
    id: "new-claim-notif-list",
    category: "Cập nhật phiên 31/07",
    title: "Thông báo nhận ưu đãi → đúng danh sách",
    action: "Có người claim 1 ưu đãi của DN bạn, bấm vào thông báo 'Bạn có ưu đãi được nhận'.",
    expect:
      "Ra thẳng trang DN với dialog danh sách người đã nhận ĐÚNG ưu đãi đó đã mở sẵn (không phải trang DN chung chung).",
  },
  {
    id: "new-admin-report-tab",
    category: "Cập nhật phiên 31/07",
    title: "Admin bấm thông báo báo cáo → đúng tab",
    action: "Với tài khoản admin, có báo cáo mới, bấm vào thông báo 'Bạn có cập nhật báo cáo mới'.",
    expect: "Vào thẳng Admin, tự nhảy đúng tab 'Báo cáo' (không phải tab Tổng quan).",
  },
  {
    id: "new-review-edit",
    category: "Cập nhật phiên 31/07",
    title: "Sửa đánh giá của mình",
    action: "Bấm icon bút chì trên 1 review bạn đã viết, đổi sao/nội dung, lưu.",
    expect: "Cập nhật đúng ngay trong danh sách, không tạo review mới trùng.",
  },
  {
    id: "new-review-report",
    category: "Cập nhật phiên 31/07",
    title: "Chủ DN báo cáo 1 review",
    action:
      "Với DN của bạn, bấm icon cờ trên 1 review có sẵn (không phải review của chính bạn), gửi báo cáo (thử để trống ảnh).",
    expect:
      "Gửi thành công dù không có ảnh, KHÔNG có ô 'Gửi cho Doanh nghiệp' trong form này, hiện đúng trong Admin/Báo cáo của tôi.",
  },
  {
    id: "new-review-reply-both",
    category: "Cập nhật phiên 31/07",
    title: "Reply qua lại trên review",
    action: "Chủ DN reply 1 review, sau đó người viết review reply lại tiếp.",
    expect: "Cả 2 chiều đều gửi được, hiện đúng theo thứ tự thời gian.",
  },
  {
    id: "new-report-no-photo",
    category: "Cập nhật phiên 31/07",
    title: "Báo cáo không cần ảnh",
    action: "Báo cáo 1 doanh nghiệp, KHÔNG chọn ảnh nào, gửi thẳng.",
    expect: "Gửi thành công, không bị báo lỗi bắt buộc ảnh.",
  },
  {
    id: "new-report-resolve-flow",
    category: "Cập nhật phiên 31/07",
    title: "Luồng chốt báo cáo — Hài lòng",
    action:
      "Chủ DN reply xong bấm 'Đánh dấu đã xử lý xong'. Qua tài khoản người báo cáo, thấy prompt Hài lòng/Chưa hài lòng, chọn Hài lòng.",
    expect: "Trạng thái chuyển 'Đã giải quyết xong', CẢ 2 tài khoản đều thấy nút Xoá xuất hiện.",
  },
  {
    id: "new-report-dispute-flow",
    category: "Cập nhật phiên 31/07",
    title: "Luồng chốt báo cáo — Chưa hài lòng",
    action: "Lặp lại như trên nhưng chọn 'Chưa hài lòng' ở bước xác nhận.",
    expect: "Admin nhận được banner cảnh báo đỏ 'Người báo cáo chưa hài lòng' khi mở báo cáo đó trong Admin.",
  },
  {
    id: "new-report-admin-edit-any",
    category: "Cập nhật phiên 31/07",
    title: "Admin sửa/xoá comment của người khác",
    action: "Với tài khoản admin, mở 1 báo cáo có comment của người khác (không phải admin viết), bấm Sửa hoặc Xoá.",
    expect: "Sửa/xoá thành công dù không phải comment của admin.",
  },
  {
    id: "new-report-quickprofile",
    category: "Cập nhật phiên 31/07",
    title: "Quick profile trong báo cáo",
    action: "Bấm vào avatar hoặc tên bất kỳ ai (người báo cáo, người reply) trong 1 báo cáo.",
    expect: "Mở đúng popup hồ sơ nhanh của người đó, không im lặng/không phản ứng gì.",
  },
  {
    id: "new-biz-owner-visible",
    category: "Cập nhật phiên 31/07",
    title: "Thấy chủ doanh nghiệp",
    action: "Vào trang chi tiết 1 DN bất kỳ, tìm dòng 'Chủ doanh nghiệp'.",
    expect: "Hiện đúng tên chủ DN, bấm vào mở được quick profile.",
  },
  {
    id: "new-keyboard-no-reload",
    category: "Cập nhật phiên 31/07",
    title: "Gõ + gửi không bị tự reload trang",
    action: "Gõ 1 đoạn dài vào ô nhập báo cáo/đánh giá/tin nhắn (đang cuộn ở đầu trang), bấm Gửi.",
    expect: "Gửi xong ở lại ĐÚNG trang hiện tại, KHÔNG tự reload/bị đẩy về trang trước.",
  },
  {
    id: "new-lomi-icon",
    category: "Cập nhật phiên 31/07",
    title: "Tên 'Lomi' trên màn hình chính",
    action: "Gỡ và cài lại app vào màn hình chính điện thoại.",
    expect: "Tên dưới icon là 'Lomi', mở app vào bên trong vẫn thấy 'Liên Minh Liên Doanh' như cũ.",
  },

  // ===== Rủi ro dự đoán (dựa trên pattern bug đã gặp) =====
  {
    id: "risk-i18n-report-ui",
    category: "Rủi ro dự đoán",
    title: "⚠️ Giao diện báo cáo mới có bị sót dịch tiếng Anh?",
    action:
      "Đổi ngôn ngữ sang English, mở 1 báo cáo đang ở luồng chốt case (nút 'Đánh dấu đã xử lý xong', prompt Hài lòng/Chưa hài lòng, banner 'Đã giải quyết xong'/'Đang chờ admin hỗ trợ', dòng 'Người báo cáo', dòng 'Chủ doanh nghiệp: X').",
    expect:
      "NHIỀU KHẢ NĂNG SẼ THẤY CHỮ VIỆT SÓT LẠI — các cụm này được thêm hôm nay dạng viết cứng, chưa qua hệ thống dịch. Nếu thấy tiếng Việt lẫn vào giao diện English, báo lại để mình bổ sung vào bộ từ điển i18n.",
  },
  {
    id: "risk-notif-merge-other-cat",
    category: "Rủi ro dự đoán",
    title: "Thông báo 'ưu đãi mới' và 'admin' có bị kẹt dữ liệu cũ như deals_received từng bị?",
    action:
      "Follow 1 DN, đợi/nhờ DN đó đăng 2 ưu đãi mới liên tiếp (2 lần cách nhau). Tương tự: đổi trạng thái tài khoản 1 người 2 lần liên tiếp (duyệt→từ chối→duyệt lại) xem thông báo 'admin' có đúng lần cuối không.",
    expect:
      "Lần thông báo THỨ 2 phải hiện đúng thông tin MỚI NHẤT (không phải dữ liệu của lần đầu bị kẹt lại) — đây chính là loại lỗi vừa tìm thấy ở deals_received.",
  },
  {
    id: "risk-exchange-realtime-sync",
    category: "Rủi ro dự đoán",
    title: "Trao đổi hỗ trợ có đồng bộ realtime đúng như tin nhắn không?",
    action:
      "Mở 2 thiết bị/tab: 1 bên gửi yêu cầu trao đổi, bên kia đang đứng sẵn ở màn danh sách Trao đổi (không bấm F5).",
    expect:
      "Yêu cầu mới tự hiện ra ngay KHÔNG CẦN F5 — nếu phải tải lại mới thấy, đây là lỗi cùng họ với vụ thiếu Realtime DELETE listener ở Messages.tsx trước đây.",
  },
  {
    id: "risk-reaction-realtime-others",
    category: "Rủi ro dự đoán",
    title: "Reaction cộng đồng có đồng bộ cho NGƯỜI KHÁC đang xem không?",
    action: "2 tài khoản cùng mở 1 kênh Cộng đồng. Tài khoản A thả reaction vào 1 tin nhắn.",
    expect: "Tài khoản B (đang đứng yên, không thao tác gì) phải thấy số reaction tăng NGAY, không cần tải lại trang.",
  },
  {
    id: "risk-rapid-double-review",
    category: "Rủi ro dự đoán",
    title: "Bấm gửi đánh giá 2 lần nhanh có tạo trùng không?",
    action: "Viết 1 đánh giá, bấm nút Gửi 2 lần thật nhanh liên tiếp (trước khi nút kịp disable).",
    expect: "Chỉ tạo ra ĐÚNG 1 đánh giá, không có 2 review giống hệt nhau từ cùng 1 người cho cùng 1 DN.",
  },
  {
    id: "risk-rapid-double-exchange",
    category: "Rủi ro dự đoán",
    title: "Bấm gửi yêu cầu trao đổi 2 lần nhanh có tạo trùng không?",
    action: "Gửi 1 yêu cầu trao đổi hỗ trợ, bấm nút Gửi 2 lần thật nhanh liên tiếp.",
    expect: "Chỉ tạo ra ĐÚNG 1 yêu cầu, không nhân đôi trong danh sách 'Đang chờ'.",
  },
  {
    id: "risk-rapid-follow-toggle",
    category: "Rủi ro dự đoán",
    title: "Follow/Unfollow dồn dập có làm lệch số đếm không?",
    action: "Bấm Theo dõi → Bỏ theo dõi → Theo dõi lại thật nhanh liên tiếp (4-5 lần) cho cùng 1 DN.",
    expect:
      "Trạng thái cuối cùng (đang theo dõi hay không) và số người theo dõi hiển thị phải khớp đúng với lần bấm CUỐI CÙNG, không bị lệch/đếm sai do bấm nhanh.",
  },
  {
    id: "risk-listview-vs-detail-count",
    category: "Rủi ro dự đoán",
    title: "Số liệu ở danh sách Khám phá có khớp với trang chi tiết DN không?",
    action:
      "Ghi lại số 'người theo dõi'/số sao hiện trên CARD ở trang Khám phá của 1 DN, rồi bấm vào xem trang chi tiết DN đó ngay sau.",
    expect:
      "2 con số nên khớp nhau. Nếu lệch nhẹ trong vòng vài phút sau 1 thay đổi mới — đó là do card dùng dữ liệu cache 5 phút (business_card_stats), KHÔNG phải bug, chỉ cần biết trước để không hoảng khi thấy lệch tạm thời.",
  },
  {
    id: "risk-claim-mark-used",
    category: "Rủi ro dự đoán",
    title: "Chủ DN đánh dấu mã ưu đãi đã dùng — có cập nhật đúng phía khách không?",
    action:
      "Nếu có nút đánh dấu 1 mã ưu đãi đã sử dụng ở phía chủ DN, thử đánh dấu, rồi xem lại phía tài khoản khách đã claim mã đó.",
    expect: "Trạng thái mã cập nhật đúng ở cả 2 phía, không bị 'đã dùng' ở 1 bên nhưng bên kia vẫn hiện chưa dùng.",
  },

  // ===== Data test quy mô lớn (1346 acc / 1000 DN) =====
  {
    id: "bulk-type-label",
    category: "Data test quy mô lớn",
    title: "Nhãn loại hình DN không bị trống/lỗi",
    action:
      "Lọc lần lượt qua cả 8 loại hình (Ăn uống, Dịch vụ, Lưu trú, Du lịch, Sáng tạo nội dung, Nghề tự do, Môi giới, Khác) ở trang Khám phá.",
    expect:
      "Mỗi loại đều ra đúng DN, KHÔNG có DN nào hiện nhãn trống/undefined (bug cũ do gán sai type freelancer/photographer/graphic_designer đã sửa).",
  },
  {
    id: "bulk-name-unique",
    category: "Data test quy mô lớn",
    title: "Tên DN không trùng lặp lộ liễu",
    action: "Cuộn qua vài chục DN trong 1 loại hình bất kỳ (VD Dịch vụ, Môi giới).",
    expect: "Tên đa dạng, không thấy dính 1 cụm hậu tố lặp đi lặp lại (VD nhiều 'Phát Đạt'/'Thành Công' liên tiếp).",
  },
  {
    id: "bulk-cover-relevant",
    category: "Data test quy mô lớn",
    title: "Ảnh bìa khớp đúng ngành, không có ảnh người",
    action:
      "Xem ảnh bìa của vài DN thuộc nhóm Dịch vụ/Nghề tự do/Sáng tạo nội dung (taxi, thợ điện, luật sư, gia sư, MC, photographer...).",
    expect:
      "Ảnh liên quan tới vật dụng/không gian ngành đó (dây điện, sách luật, micro...), KHÔNG có ảnh chân dung người 'nhìn Tây'.",
  },
  {
    id: "bulk-avatar-gender",
    category: "Data test quy mô lớn",
    title: "Avatar khớp đúng giới tính",
    action: "Vào Admin → Thành viên, xem vài tài khoản có tên đệm 'Văn' và vài tài khoản có tên đệm 'Thị'.",
    expect: "Tên đệm 'Văn' → avatar nam; tên đệm 'Thị' → avatar nữ, khớp 100%.",
  },
  {
    id: "bulk-review-diverse",
    category: "Data test quy mô lớn",
    title: "Đánh giá đa dạng rating, không toàn 5 sao",
    action: "Mở vài DN bất kỳ, xem phần đánh giá.",
    expect:
      "Thấy rating trải đều (đa số 4-5 sao nhưng có cả 3, 2, 1 sao xen kẽ), bình luận đa dạng câu chữ, không lặp y hệt liên tục.",
  },
  {
    id: "bulk-area-filter-count",
    category: "Data test quy mô lớn",
    title: "Bộ lọc khu vực đúng số, 'Tất cả khu vực' không hiện số",
    action: "Khám phá → mở dropdown khu vực, chọn 1 khu vực bất kỳ có số hiển thị (VD Đà Lạt (45)).",
    expect: "'Tất cả khu vực' không kèm số; chọn 1 khu vực cụ thể ra đúng số lượng DN như số đã hiện trong dropdown.",
  },
  {
    id: "bulk-map-spread",
    category: "Data test quy mô lớn",
    title: "Ghim bản đồ rải khắp cả nước",
    action: "Khám phá → chế độ Bản đồ, kéo/thu nhỏ xem tổng thể.",
    expect:
      "Ghim xuất hiện ở nhiều tỉnh/thành khác nhau (Đà Lạt, Hà Nội, Đà Nẵng, Phú Quốc...), không dồn hết vào 1 điểm.",
  },
  {
    id: "bulk-food-stay-first",
    category: "Data test quy mô lớn",
    title: "Ăn uống + Lưu trú lên đầu danh sách chưa lọc",
    action: "Khám phá → để nguyên bộ lọc 'Tất cả' (chưa chọn loại hình cụ thể), xem đầu danh sách.",
    expect: "Các DN Ăn uống/Lưu trú xuất hiện trước, không bị chen ngang bởi 1 khối DN cùng loại khác (VD Nghề tự do).",
  },
  {
    id: "bulk-loadall-no-cap",
    category: "Data test quy mô lớn",
    title: "Danh sách DN tải hết, không dừng ở 300",
    action: "Khám phá → chọn 'Tất cả khu vực', cuộn xuống cuối danh sách, đếm ước lượng số DN hiện ra.",
    expect: "Không còn nút 'Tải thêm' và số lượng vượt quá 300 (đã bỏ giới hạn phân trang theo yêu cầu).",
  },
  {
    id: "bulk-niche-types-exist",
    category: "Data test quy mô lớn",
    title: "Đủ ngành nghề đặc thù mới",
    action: "Tìm kiếm lần lượt: 'Taxi', 'Sửa Ống Nước', 'Luật Sư', 'Gia Sư', 'Cho Thuê Phòng Trọ', 'Môi Giới Nhà Đất'.",
    expect: "Mỗi từ khoá đều ra ít nhất 1 kết quả DN phù hợp.",
  },
  {
    id: "bulk-membership-boundary",
    category: "Data test quy mô lớn",
    title: "Ranh giới membership 1000 người miễn phí (SAU KHI đã xoá data test)",
    action:
      "Sau khi Kir xoá hết 1346 acc test, đăng ký 1 tài khoản thật mới, kiểm tra có được cấp membership miễn phí không.",
    expect:
      "Được cấp đúng nếu tổng số người approved hiện tại (thật) chưa tới 1000 — xác nhận cơ chế đã phục hồi đúng sau khi dọn data test.",
  },

  // ===== Cập nhật phiên 01/08 =====
  {
    id: "0801-biz-list-sort",
    category: "Cập nhật phiên 01/08",
    title: "Doanh nghiệp sắp xếp theo lượt nhận ưu đãi",
    action: "Admin → tab Doanh nghiệp, quan sát thứ tự danh sách.",
    expect: "DN có nhiều lượt nhận ưu đãi nhất nằm trên đầu, giảm dần xuống dưới.",
  },
  {
    id: "0801-biz-claims-popup",
    category: "Cập nhật phiên 01/08",
    title: "Xem danh sách người nhận ưu đãi từ Admin",
    action: "Admin → Doanh nghiệp → bấm vào dòng '🎟️ X lượt nhận ưu đãi' của 1 DN.",
    expect:
      "Ra popup liệt kê từng ưu đãi của DN đó; bấm vào 1 ưu đãi thấy đúng danh sách người đã nhận (tên, thời gian, mã).",
  },
  {
    id: "0801-pending-open-direct",
    category: "Cập nhật phiên 01/08",
    title: "Chờ duyệt: bấm tên DN ra thẳng form sửa",
    action: "Admin → Chờ duyệt → bấm vào tên 1 DN đang chờ.",
    expect:
      "Ra thẳng popup sửa DN (không qua Xem nhanh, không qua Chi tiết thành viên), có nút 'Đóng' ở cuối, không có nút X đè lên nhãn trạng thái.",
  },
  {
    id: "0801-revision-request",
    category: "Cập nhật phiên 01/08",
    title: "Yêu cầu bổ sung thay vì Từ chối",
    action: "Admin → Chờ duyệt (hoặc Doanh nghiệp) → bấm nút X 'Yêu cầu bổ sung' trên 1 DN, nhập nội dung, gửi.",
    expect:
      "Ra popup nhập liệu đàng hoàng (không phải hộp thoại trình duyệt), DN KHÔNG bị xoá, chuyển sang trạng thái cần bổ sung.",
  },
  {
    id: "0801-revision-notif-owner",
    category: "Cập nhật phiên 01/08",
    title: "Chủ DN nhận đúng thông báo yêu cầu bổ sung",
    action: "Đăng nhập bằng tài khoản chủ DN vừa bị yêu cầu bổ sung, mở Thông báo, bấm vào thông báo cập nhật DN.",
    expect:
      "Vào thẳng Hồ sơ doanh nghiệp, đúng DN đó tự mở sẵn form sửa, thấy banner '📋 Ban quản trị yêu cầu bổ sung' kèm đúng nội dung admin đã nhập.",
  },
  {
    id: "0801-revision-resubmit",
    category: "Cập nhật phiên 01/08",
    title: "Sửa xong tự gửi lại chờ duyệt",
    action: "Từ màn hình trên, sửa lại thông tin DN rồi bấm 'Lưu doanh nghiệp'.",
    expect:
      "Lưu xong, DN tự quay lại trạng thái 'Chờ duyệt' — không cần bước nộp lại riêng, banner yêu cầu bổ sung biến mất.",
  },
  {
    id: "0801-pending-notif-tab",
    category: "Cập nhật phiên 01/08",
    title: "Thông báo Chờ duyệt vào đúng tab",
    action: "Với tài khoản admin, có mục chờ duyệt mới, bấm vào thông báo 'Chờ duyệt'.",
    expect: "Vào thẳng Admin, tự nhảy đúng tab 'Chờ duyệt' (không phải Tổng quan).",
  },
  {
    id: "0801-exchange-admin-vi",
    category: "Cập nhật phiên 01/08",
    title: "Trao đổi trong Admin hiện tiếng Việt + đúng bước",
    action: "Admin → tab Trao đổi, xem vài lượt trao đổi ở các trạng thái khác nhau.",
    expect:
      "Trạng thái hiện tiếng Việt (không phải 'pending'/'accepted'...), có dòng 'Đang chờ ai' đúng tên DN, có thanh tiến độ.",
  },
  {
    id: "0801-exchange-biz-quickview",
    category: "Cập nhật phiên 01/08",
    title: "Bấm tên DN trong Trao đổi ra popup xem nhanh",
    action: "Admin → Trao đổi → bấm vào tên 1 trong 2 DN của 1 lượt trao đổi.",
    expect: "Mở đúng popup Xem nhanh DN đó, có dòng 'Chủ DN: tên' bấm được để mở hồ sơ chủ.",
  },
  {
    id: "0801-broadcast-rename",
    category: "Cập nhật phiên 01/08",
    title: "Tên tab 'Phát thông báo'",
    action: "Admin → Tổng quan, tìm hàng gửi thông báo hàng loạt.",
    expect: "Hiện đúng tên 'Phát thông báo' thay vì 'Thông báo'.",
  },

  // ===== Cập nhật phiên 02/08 =====
  {
    id: "0802-type-shopping",
    category: "Cập nhật phiên 02/08",
    title: "Loại hình mới 'Buôn bán' xuất hiện đủ mọi nơi",
    action: "Kiểm tra loại hình 'Buôn bán' có trong: bộ lọc Khám phá, form Đăng ký (bước có DN), Tạo DN mới, Sửa DN.",
    expect: "Cả 4 nơi đều thấy đúng nút 'Buôn bán', chọn được, lưu được bình thường như các loại khác.",
  },
  {
    id: "0802-search-noaccent-admin",
    category: "Cập nhật phiên 02/08",
    title: "Tìm kiếm không dấu trong Admin",
    action:
      "Ở Admin, gõ KHÔNG DẤU vào ô tìm của từng tab: Thành viên, Doanh nghiệp, Hoạt động gần đây, Báo cáo, Trao đổi (VD gõ 'quang anh' hoặc 'bds').",
    expect: "Mỗi ô đều ra đúng kết quả có dấu tương ứng, không cần gõ đúng dấu mới tìm ra.",
  },
  {
    id: "0802-search-noaccent-explore",
    category: "Cập nhật phiên 02/08",
    title: "Tìm kiếm không dấu ở Khám phá",
    action: "Ở Khám phá, gõ không dấu tên 1 DN có dấu (VD 'bds' cho 'BĐS...').",
    expect: "Vẫn ra đúng kết quả dù gõ thiếu dấu.",
  },
  {
    id: "0802-explore-pagination",
    category: "Cập nhật phiên 02/08",
    title: "Khám phá tải theo trang, không mất DN cũ",
    action:
      "Mở Khám phá (để 'Tất cả', sắp xếp 'Mới nhất'), cuộn xuống cuối bấm 'Tải thêm' liên tục vài lần cho tới hết.",
    expect:
      "Ban đầu chỉ tải ~20 DN, mỗi lần bấm 'Tải thêm' ra thêm ~20 cái, KHÔNG lặp lại DN đã hiện, và tải được tới DN cuối cùng (kể cả DN cũ/tạo lâu rồi) — không còn bị mất khoảng 15 DN cuối như lỗi trước.",
  },
  {
    id: "0802-explore-sort-db",
    category: "Cập nhật phiên 02/08",
    title: "Sắp xếp 'Đánh giá cao' / 'Nhiều ưu đãi' vẫn đúng",
    action: "Khám phá → đổi lần lượt qua sắp xếp 'Đánh giá cao' và 'Nhiều ưu đãi được nhận'.",
    expect: "DN đầu danh sách đúng là DN có rating cao nhất / nhiều lượt nhận ưu đãi nhất, không bị xáo trộn.",
  },
  {
    id: "0802-explore-map-nearest",
    category: "Cập nhật phiên 02/08",
    title: "Bản đồ & 'Gần đây' vẫn đủ DN sau khi đổi qua phân trang",
    action: "Khám phá → chuyển 'Bản đồ', xem tổng thể; rồi bấm 'Gần đây'.",
    expect:
      "Bản đồ vẫn thấy đủ ghim như trước (không bị thiếu do phân trang), 'Gần đây' vẫn tính khoảng cách + lọc bán kính đúng.",
  },
  {
    id: "0802-online-toggle-form",
    category: "Cập nhật phiên 02/08",
    title: "Công tắc 'Chỉ bán hàng online' trong form DN",
    action: "Tạo DN mới (hoặc sửa DN có sẵn) → bật công tắc 'Chỉ bán hàng online'.",
    expect: "Giờ mở/Giờ đóng và nút 'Ghim vị trí' biến mất ngay khi bật, hiện lại khi tắt.",
  },
  {
    id: "0802-online-badge",
    category: "Cập nhật phiên 02/08",
    title: "Nhãn 'Bán hàng online' trên card & trang chi tiết",
    action: "Mở 1 DN đã bật bán hàng online (VD 'Tiệm Bánh Mì Đức Thành') — xem cả ở card Khám phá và trang chi tiết.",
    expect: "Hiện nhãn 'Bán hàng online' màu xanh dương thay cho huy hiệu giờ mở/đóng cửa, không có icon 🌐.",
  },
  {
    id: "0802-online-filter-chip",
    category: "Cập nhật phiên 02/08",
    title: "Nút lọc 'Bán hàng online' nằm chung hàng loại hình",
    action: "Khám phá → tìm nút 'Bán hàng online' ở hàng nút loại hình (Ăn uống, Dịch vụ...).",
    expect:
      "Nằm chung 1 hàng, hình dáng giống hệt các nút loại hình khác, bấm vào là lọc ngay (không cần bấm 'Tất cả' trước).",
  },
  {
    id: "0802-cover-images-load",
    category: "Cập nhật phiên 02/08",
    title: "Ảnh bìa DN không còn bị vỡ",
    action: "Lướt qua vài chục DN bất kỳ ở Khám phá, để ý ảnh bìa từng card.",
    expect: "Tất cả đều load được ảnh (không còn icon ảnh vỡ), kể cả nhóm từng bị lỗi trước đó như 'Kế Toán Tự Do'.",
  },

  // ===== Cập nhật phiên 02/08 (buổi tối — tin nhắn & thông báo) =====
  {
    id: "0802pm-msg-scroll-gap",
    category: "Cập nhật phiên 02/08 (tối)",
    title: "Hết khoảng trắng thừa ở Tin nhắn & Cộng đồng",
    action: "Mở 1 đoạn Tin nhắn riêng và kênh Cộng đồng, để ý khoảng cách giữa ô nhập tin và thanh điều hướng dưới.",
    expect: "Không còn khoảng trắng thừa, ô nhập tin nằm sát ngay phía trên thanh điều hướng.",
  },
  {
    id: "0802pm-msg-scroll-works",
    category: "Cập nhật phiên 02/08 (tối)",
    title: "Cuộn lên/xuống được ở Tin nhắn & Cộng đồng",
    action: "Trong 2 trang trên, thử kéo tay cuộn lên xem tin cũ, cuộn xuống lại.",
    expect: "Cuộn mượt bình thường, không bị kẹt/lệch hình như trước.",
  },
  {
    id: "0802pm-msg-open-scrolls-to-latest",
    category: "Cập nhật phiên 02/08 (tối)",
    title: "Mở đoạn chat nhảy đúng xuống tin mới nhất",
    action: "Mở 1 đoạn chat có nhiều tin nhắn (đặc biệt đoạn có kèm ảnh/GIF), quan sát vị trí dừng lại.",
    expect: "Luôn dừng đúng ở tin nhắn MỚI NHẤT, không bị kẹt trước 1-2 tin cuối do ảnh/GIF tải chậm.",
  },
  {
    id: "0802pm-msg-unread-badge",
    category: "Cập nhật phiên 02/08 (tối)",
    title: "Số tin chưa đọc giảm đúng khi mở đoạn chat",
    action: "Từ 1 tài khoản đang có tin chưa đọc, mở đúng đoạn chat đó, đợi vài giây, quay ra xem icon tin nhắn.",
    expect: "Số chưa đọc giảm đúng (hoặc hết hẳn nếu đó là tin cuối), không cần tải lại trang mới thấy đổi.",
  },
  {
    id: "0802pm-push-every-message",
    category: "Cập nhật phiên 02/08 (tối)",
    title: "Nhận thông báo đẩy cho MỌI tin nhắn, không chỉ tin đầu",
    action: "Tắt app hẳn (không mở), nhờ người khác nhắn liên tiếp 3-4 tin nhắn cách nhau vài phút.",
    expect:
      "Nhận được thông báo đẩy cho từng đợt (trước đây chỉ tin đầu tiên trong ngày mới có, các tin sau bị im lặng).",
  },
  {
    id: "0802pm-push-coalesce",
    category: "Cập nhật phiên 02/08 (tối)",
    title: "Nhiều tin nhắn dồn dập chỉ hiện 1 thông báo",
    action: "Nhờ người khác nhắn liên tiếp thật nhanh 5-10 tin nhắn trong lúc app đang tắt/chạy nền.",
    expect:
      "Chỉ thấy ĐÚNG 1 thông báo trên màn hình khoá (nội dung cập nhật theo tin mới nhất), KHÔNG bị xếp chồng thành nhiều thông báo riêng lẻ.",
  },
];

const STORAGE_KEY = "lmld:questline:v3";
const CATEGORIES = [...new Set(QUESTS.map((q) => q.category))];

export default function Questline() {
  const { role, user } = useAuth();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadProgress();
  }, [user?.id]);

  const loadProgress = async () => {
    const { data } = await supabase.from("questline_progress").select("quest_id").eq("user_id", user!.id);
    const dbDone: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => {
      dbDone[r.quest_id] = true;
    });

    // Chuyển 1 LẦN DUY NHẤT tiến độ cũ (nếu trình duyệt này từng lưu ở localStorage trước
    // khi tính năng chuyển sang lưu database) — để không mất công tick lại từ đầu.
    let localDone: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("lmld:questline:v2");
      if (raw) localDone = JSON.parse(raw);
    } catch {}
    const toMigrate = Object.keys(localDone).filter((id) => localDone[id] && !dbDone[id]);
    if (toMigrate.length) {
      await supabase.from("questline_progress").upsert(toMigrate.map((quest_id) => ({ user_id: user!.id, quest_id })));
      toMigrate.forEach((id) => {
        dbDone[id] = true;
      });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }

    setDone(dbDone);
    setLoaded(true);
  };

  const toggle = async (id: string) => {
    if (!user) return;
    const willCheck = !done[id];
    setDone((prev) => ({ ...prev, [id]: willCheck }));
    if (willCheck) {
      const { error } = await supabase.from("questline_progress").insert({ user_id: user.id, quest_id: id });
      if (error) {
        toast.error("Không lưu được: " + error.message);
        setDone((prev) => ({ ...prev, [id]: false }));
        return;
      }
      toast.success("✓ Đã lưu tiến độ", { duration: 1000 });
    } else {
      const { error } = await supabase.from("questline_progress").delete().eq("user_id", user.id).eq("quest_id", id);
      if (error) {
        toast.error("Không xoá được: " + error.message);
        setDone((prev) => ({ ...prev, [id]: true }));
      }
    }
  };

  const reset = async () => {
    if (!user || !confirm("Xoá hết tiến độ, làm lại từ đầu?")) return;
    const { error } = await supabase.from("questline_progress").delete().eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone({});
    toast("Đã làm mới tiến độ");
  };

  const total = QUESTS.length;
  const completed = useMemo(() => QUESTS.filter((q) => done[q.id]).length, [done]);
  const pct = total ? Math.round((completed / total) * 100) : 0;

  if (role !== "admin") {
    return <Navigate to="/ho-so" replace />;
  }

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
          Tự động lưu ngay khi tick — đăng nhập bằng tài khoản admin này ở bất kỳ máy/trình duyệt/domain nào cũng thấy
          đúng tiến độ.
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
