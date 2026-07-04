# Project Rules — Liên Minh Liên Doanh

## Bất biến (không bao giờ vi phạm)
1. Tên app luôn là "Liên Minh Liên Doanh" — không đổi, không viết tắt, không dịch, ở bất kỳ đâu (code, UI, metadata, docs).
2. 8 loại hình doanh nghiệp là cố định (food, service, stay, travel, creator, freelance, broker, other) — không thêm, bớt, đổi tên key hay label.
3. Không bật lại auto-approve cho business hoặc member — admin duyệt tay.
4. Không đổi cơ chế auth username+password / email giả @lienminh.local.
5. Không đổi route paths, tên component, tên file, tên bảng/cột DB trừ khi được yêu cầu rõ ràng.

## Phạm vi thay đổi
6. Chỉ sửa đúng những file liên quan trực tiếp đến yêu cầu. Không "tiện tay" refactor, đổi format, xóa comment, hay tối ưu file khác.
7. Giữ nguyên mọi tính năng không được nhắc đến. Nếu thay đổi có nguy cơ ảnh hưởng tính năng khác, phải nêu rõ TRƯỚC khi làm.
8. Tái sử dụng pattern sẵn có: shadcn/ui, React Query, useAuth() (isAdmin, isApproved).

## Quy ước code
9. UI mới: tiếng Việt, theme emerald→blue (gradient-brand).
10. Notification mới phải có target_id + target_type hợp lệ và điều hướng được. Messaging dùng Inbox toàn cục hiện có.
11. Thay đổi DB: migration SQL rõ ràng, kèm RLS policy cho bảng mới. Không nới lỏng RLS hiện có.
12. Mutation nhạy cảm của admin đi qua edge function, không gọi trực tiếp từ client.

## Sau khi sửa
13. Build không lỗi TypeScript, test luồng liên quan end-to-end trước khi kết thúc.
14. Nếu sửa PWA/Service Worker, nhắc user cần đóng hẳn app + mở lại để thấy bản mới.
15. Tóm tắt: đã sửa file nào, vì sao, rủi ro gì.
