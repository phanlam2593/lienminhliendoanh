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
  { id: "acc-login", category: "Tài khoản & Hồ sơ", title: "Đăng nhập", action: "Đăng xuất rồi đăng nhập lại bằng đúng tài khoản đang test.", expect: "Vào lại được trang chủ, không lỗi." },
  { id: "acc-avatar", category: "Tài khoản & Hồ sơ", title: "Đổi ảnh đại diện", action: "Vào Hồ sơ → bấm vào avatar → chọn ảnh mới.", expect: "Ảnh mới hiện ngay, không cần tải lại trang." },
  { id: "acc-status", category: "Tài khoản & Hồ sơ", title: "Đổi dòng trạng thái", action: "Bấm vào dòng trạng thái dưới tên, gõ 1 câu mới, lưu.", expect: "Hiện ngay dưới avatar." },
  { id: "acc-bio", category: "Tài khoản & Hồ sơ", title: "Sửa thông tin cá nhân", action: "Hồ sơ → Thông tin cá nhân → sửa tên/SĐT/giới thiệu bản thân, lưu.", expect: "Lưu thành công, vào lại thấy đúng thông tin mới." },
  { id: "acc-tier", category: "Tài khoản & Hồ sơ", title: "Xem huy hiệu cấp bậc", action: "Bấm vào huy hiệu cấp bậc cạnh tên trong Hồ sơ.", expect: "Hiện popup giải thích các mốc điểm/cấp bậc." },
  { id: "acc-password", category: "Tài khoản & Hồ sơ", title: "Đổi mật khẩu", action: "Cài đặt → Đổi mật khẩu.", expect: "Đổi thành công, đăng xuất rồi đăng nhập lại bằng mật khẩu mới được." },
  { id: "acc-notifprefs", category: "Tài khoản & Hồ sơ", title: "Tuỳ chọn thông báo", action: "Cài đặt → Thông báo → tắt/bật thử vài loại.", expect: "Trạng thái bật/tắt lưu đúng, vào lại vẫn giữ nguyên." },
  { id: "acc-dark", category: "Tài khoản & Hồ sơ", title: "Dark mode", action: "Bật/tắt chế độ tối trong Cài đặt.", expect: "Toàn bộ giao diện đổi màu đúng, không chỗ nào 'lệch tông' (chữ trắng trên nền trắng...)." },
  { id: "acc-lang", category: "Tài khoản & Hồ sơ", title: "Đổi ngôn ngữ", action: "Đổi từ Tiếng Việt sang English trong Cài đặt.", expect: "Toàn app đổi ngôn ngữ, không còn chữ Việt sót lại (trừ trang Questline này)." },
  { id: "acc-otherprofile", category: "Tài khoản & Hồ sơ", title: "Xem hồ sơ người khác", action: "Bấm vào tên/avatar 1 người khác bất kỳ (trong đánh giá, chat...).", expect: "Hiện đúng tên thật — KHÔNG hiện 'Ẩn danh'." },
  { id: "acc-followers", category: "Tài khoản & Hồ sơ", title: "Danh sách người theo dõi mình", action: "Hồ sơ → bấm số 'Người theo dõi'.", expect: "Tên mọi người hiện đúng, không ai 'Ẩn danh'." },
  { id: "acc-following", category: "Tài khoản & Hồ sơ", title: "Danh sách đang theo dõi", action: "Hồ sơ → bấm số 'Đang theo dõi'.", expect: "Tên mọi người hiện đúng, có thể bỏ theo dõi ngay trong danh sách." },
  { id: "acc-regulars", category: "Tài khoản & Hồ sơ", title: "Danh sách Tin dùng", action: "Hồ sơ → bấm số 'Tin dùng'.", expect: "Hiện đúng các DN đã claim ưu đãi trước đó." },

  // ===== Doanh nghiệp (khách) =====
  { id: "biz-list", category: "Doanh nghiệp (khách)", title: "Duyệt danh sách DN", action: "Khám phá → cuộn/tải thêm danh sách doanh nghiệp.", expect: "Tải thêm hoạt động mượt, không lặp/thiếu DN." },
  { id: "biz-search", category: "Doanh nghiệp (khách)", title: "Tìm kiếm DN", action: "Gõ tên 1 DN vào ô tìm kiếm ở trang Khám phá.", expect: "Ra đúng kết quả khớp tên." },
  { id: "biz-filter", category: "Doanh nghiệp (khách)", title: "Lọc theo loại hình", action: "Lọc DN theo 1 loại hình (Ăn uống, Dịch vụ...).", expect: "Chỉ hiện đúng DN thuộc loại đó." },
  { id: "biz-map", category: "Doanh nghiệp (khách)", title: "Bản đồ", action: "Khám phá → chuyển chế độ Bản đồ.", expect: "Thấy đúng các DN đã ghim vị trí trên bản đồ." },
  { id: "biz-detail", category: "Doanh nghiệp (khách)", title: "Xem chi tiết 1 DN", action: "Bấm vào 1 doanh nghiệp bất kỳ.", expect: "Ảnh bìa, thông tin, giờ mở cửa đầy đủ, không treo/trắng trang." },
  { id: "biz-gallery", category: "Doanh nghiệp (khách)", title: "Xem ảnh gallery DN", action: "Bấm vào 1 ảnh trong thư viện ảnh của DN.", expect: "Ảnh phóng to hiện NGAY GIỮA màn hình, không phải cuộn xuống mới thấy." },
  { id: "biz-social", category: "Doanh nghiệp (khách)", title: "Link mạng xã hội DN", action: "Bấm vào icon Facebook/Website của 1 DN có điền link.", expect: "Mở đúng link ở tab mới." },
  { id: "biz-review-write", category: "Doanh nghiệp (khách)", title: "Viết đánh giá", action: "Viết 1 đánh giá kèm ảnh cho 1 DN, chọn số sao.", expect: "Hiện ngay trong danh sách, ảnh xem được." },
  { id: "biz-review-author", category: "Doanh nghiệp (khách)", title: "Xem tên người đánh giá", action: "Xem đánh giá của 1 DN có nhiều người đánh giá.", expect: "Tên tất cả đúng, không ai 'Ẩn danh'." },
  { id: "biz-review-photo", category: "Doanh nghiệp (khách)", title: "Xem ảnh đánh giá", action: "Bấm vào ảnh đính kèm trong 1 đánh giá.", expect: "Ảnh phóng to đúng giữa màn hình." },
  { id: "biz-review-delete", category: "Doanh nghiệp (khách)", title: "Xoá đánh giá của mình", action: "Xoá 1 đánh giá bạn vừa viết.", expect: "Biến mất khỏi danh sách ngay." },
  { id: "biz-follow", category: "Doanh nghiệp (khách)", title: "Theo dõi DN", action: "Bấm 'Theo dõi' 1 doanh nghiệp.", expect: "Số người theo dõi tăng đúng, đổi thành 'Đang theo dõi'." },
  { id: "biz-message", category: "Doanh nghiệp (khách)", title: "Nhắn tin chủ DN", action: "Ở trang chi tiết DN, bấm 'Nhắn tin'.", expect: "Chuyển đúng sang khung