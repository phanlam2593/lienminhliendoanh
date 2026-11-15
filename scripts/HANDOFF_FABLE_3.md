# HANDOFF — phiên Fable 3 (15/11/2026)

Việc giao: `scripts/PROMPT_FABLE_3.md`. Phần kiến trúc Lomi ghi ở `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`.

## 0. Số gốc
Dùng lại lượt đo sáng 15/11 trên đúng mã nguồn này (commit d9dc661; commit 35359c2 chỉ thêm file prompt):
vitest 2.526 · paraphrase 386/400 · convo 155/160 · bộ 1.000 câu 876/985 (safety 26/29) · giữ riêng 61/65.

## 1. Việc còn dở của Fable 2

- **1.1 Bundle thật — ĐÃ KIỂM (15/11, qua trình duyệt trong app Claude trên máy anh).** Gỡ service worker + xoá cache + tải lại
  `ilomi.live`: bundle `index-iQGkoQ62.js` có đủ `undo_swipe_action`, "Không gọi được cho người này", `safety-first`, `chat.cannotSendTo`.
  → cả hai lần deploy 14/11 và 15/11 đã lên thật.
- **1.2 Quẹt — XONG.** Đổi `action` bằng `UPDATE` trực tiếp giờ cũng tính vào 10 lượt/ngày (`enforce_swipe_daily_limit_upd` +
  `swipe_count_self`); app upsert không bị đếm 2 lần (dấu `app.swipe_counted` trong giao dịch); huỷ kết nối / hoàn tác không tính lượt.
  Thử rollback: 2 lần upsert + 1 lần UPDATE trực tiếp = 3 lượt; UPDATE không đổi giá trị và UPDATE của hệ thống = không tính.
- **1.3 Che từ tục cho `messages` / `group_messages`:** chưa làm — **chờ anh quyết**.
- **1.4 Gọi:** chưa có kết quả thử 2 máy → không sửa gì thêm. Checklist 11 bước ở `HANDOFF_FABLE_2.md`.

## 2. Rà bảo mật / RLS toàn app (Phần 3.1) — migration `20261115100000_fable3_security_guards.sql`

Đã chạy trên DB thật, thử bằng khối `DO … RAISE EXCEPTION` (tự rollback) trên tài khoản `loadtest_`. Không nới RLS nào.

| Mức | Lỗi (ví dụ người dùng làm được) | Sửa |
|---|---|---|
| **P0** | **Ai cũng tự cộng điểm được.** Hàm `award_member_points(_user_id, _amount)` chạy quyền cao, không kiểm người gọi, cấp cho cả người chưa đăng nhập → gọi 1 lệnh là lên hạng "Huyền thoại", hoặc trừ sạch điểm người khác. | Thu quyền gọi trực tiếp. Trigger nhận ưu đãi vẫn cộng điểm bình thường. |
| **P0** | **Lộ lịch sử đăng nhập + ai nhận ưu đãi ở đâu.** 3 view (`member_last_login`, `business_customer_visits`, `exchanges_view`) bỏ qua RLS và mở cho cả người chưa đăng nhập → đọc được tên + lần đăng nhập cuối của mọi thành viên, ai đã ghé quán nào bao nhiêu lần. | `security_invoker = true` (RLS bảng gốc áp cho người xem) + thu quyền `anon`. Admin vẫn xem được như cũ. |
| P1 | Chủ DN bị báo cáo **sửa được lời + ảnh của báo cáo** về mình; người báo cáo tự bật "chủ DN xác nhận đã xử lý". | Trigger `guard_report_columns`. |
| P1 | Nhận được ưu đãi **đã tắt** hoặc của DN chưa/không còn được duyệt (gọi thẳng `claim_offer`). | Trigger `guard_offer_claim_insert` (#19). |
| P1 | Chủ DN bấm "báo cho người theo dõi" bao nhiêu lần là bấy nhiêu thông báo + push. | `broadcast_offer`: cùng ưu đãi không báo lại trong 1 giờ. |
| P1 | `notify_mention`: ai đăng nhập cũng gửi được thông báo tiêu đề/nội dung tuỳ ý cho bất kỳ ai (kể cả người đã chặn mình). | Chỉ thành viên đã duyệt, không gửi qua chặn, cắt độ dài. |
| P2 | Chủ DN tự chỉnh `claim_count`; đổi `created_at` bài tường để đẩy lên đầu; chuyển đánh giá sang DN khác; chuyển bình luận sang bài khác. | Trigger `guard_immutable_columns` cho `offers`, `reviews`, `wall_posts`, `wall_post_comments`, `report_replies`. |

Đã kiểm và **thấy ổn**: `profiles` / `businesses` (trigger `guard_privileged_columns` khoá `points`, `level`, `is_member`, `membership_*`, `status`,
`is_featured`…), `rides` / `ride_drivers` (chỉ ghi qua RPC, tài xế không tự duyệt được), `group_*`, `user_roles`, `notifications` (chỉ của mình;
đánh dấu đã đọc không bắn lại push — #30), các RPC `admin_*` (đều kiểm `has_role`), đăng xuất `scope: "local"` + xoá endpoint push (#47).

### "Security scan 1 Critical + Warning riêng tư" — em tìm lại được gì
- Ứng viên "Critical": hai lỗi P0 ở trên (đã vá).
- **Còn 1 cảnh báo riêng tư CHƯA vá, cần anh quyết:** kho ảnh `uploads` và kho ghi âm `voice` cho **mọi người đã đăng nhập** đọc
  (và liệt kê) mọi file — gồm ảnh gửi trong tin nhắn riêng, tin nhắn thoại, **ảnh bằng lái / ảnh chân dung tài xế**. Ai biết (hoặc dò)
  đường dẫn là xem được. Vá đúng cách = tách thư mục riêng tư (tin nhắn, giấy tờ tài xế) sang bucket chỉ 2 bên + admin đọc, và đổi cách
  app lấy link ảnh (signed URL theo cuộc trò chuyện). Việc này đụng nhiều màn và ảnh cũ → **không tự làm**. Bước nhỏ an toàn có thể làm
  trước: chặn quyền *liệt kê* (chỉ cho đọc khi biết đúng đường dẫn) và chuyển riêng ảnh giấy tờ tài xế.
- `follows` (ai theo dõi ai) mọi người đăng nhập đều đọc được — coi là công khai theo thiết kế.

## 3. Các tính năng khác (Phần 3.2–3.9) — mức rà: DB kỹ, code giao diện mới soi điểm chính

| Mục | Kết quả |
|---|---|
| 3.2 Ưu đãi | Server đã chốt: phải được duyệt, còn hạn thành viên (`MEMBER_ONLY`), PIN + khoá 5 lần sai/5 phút, mã còn hạn 2 giờ thì trả lại mã cũ (không nhận trùng). Thiếu kiểm ưu đãi đã tắt → **đã vá**. Ưu đãi không có khái niệm "hết lượt" (bảng `offers` không có cột giới hạn). Ghi chú: số thứ tự mã (`seq`) lấy `max+1` không khoá → 2 người nhận cùng tích tắc có thể trùng mã (P2, chưa sửa). |
| 3.3 Thông báo + push | #30, #47, #58 đọc thấy đúng. `broadcast_offer` giờ có chống spam; vẫn **không gộp theo category** (mỗi người theo dõi 1 dòng riêng — giữ nguyên thiết kế). |
| 3.4 Cộng đồng / tường | Chặn 2 chiều có ở policy `wall_posts` / bình luận / cảm xúc. Thêm khoá cột. Mục #13 "cảm xúc bài → gửi vào tin nhắn": **chưa làm, hỏi anh**. |
| 3.5 Đưa đón | Giá, nhận chuyến, vị trí đều qua RPC quyền cao; khách/tài xế của chuyến + tài xế đủ điều kiện (chuyến đang tìm) mới đọc được. Chưa đọc `Rides.tsx`. |
| 3.6 Doanh nghiệp | Duyệt tay (trigger ép `status='pending'` khi tạo), 1 người 1 đánh giá (UNIQUE), thống kê thẻ refresh qua trigger. `businesses_explore_view` có lộ cột `admin_note` của DN đã duyệt (thường rỗng) — P2, chưa sửa. |
| 3.7 Đăng nhập | Đăng xuất chỉ máy đó ✔. `is_field_taken` cho người lạ dò "số điện thoại / email này đã đăng ký chưa" — cần cho màn đăng ký, chấp nhận. Chưa đọc `CompleteProfileScreen`. |
| 3.8 Admin | `Admin.tsx` còn ~30 chỗ sửa thẳng bảng từ client (duyệt, sửa hồ sơ, xoá DN/ưu đãi/đánh giá). **An toàn** vì RLS chỉ cho admin, nhưng trái CLAUDE.md #12 (đi qua edge function). Chuyển hết sang `admin-action` = sửa lớn + deploy edge (tốn credit) → không tự làm. `admin-cleanup-orphans` vẫn **chưa deploy** (tốn credit — chờ anh). |
| 3.9 PWA | Cấu hình hiện tại: `autoUpdate` + `skipWaiting` + `clientsClaim` → bản mới tự tải ngầm, nhưng trang đang mở vẫn chạy mã cũ tới khi tải lại. **Đề xuất (chưa làm):** khi service worker mới nắm quyền (`controllerchange`) hiện 1 thanh nhỏ "Có bản mới — chạm để tải lại" (≈20 dòng trong `src/lib/pwa.ts`, không đổi cách cache). Rủi ro thấp; cần anh gật vì đụng service worker (CLAUDE.md #14). |

Chưa rà (hết quỹ phiên): đọc kỹ giao diện `Offers.tsx`, `Notifications.tsx`, `Profile.tsx`, `UserProfile.tsx`, `Rides.tsx`, `Businesses.tsx`,
`BusinessDetail.tsx`, `Nearby.tsx`, `CompleteProfileScreen`, edge `send-push` / `register-push`.

## 4. Lomi — lỗi cụ thể

| Lỗi | Trạng thái |
|---|---|
| "bố em uống thuốc loãng máu, ăn cải bó xôi có sao không" | **Sửa bằng kiến trúc** (bước 2, trọng tài nhóm thuốc) — ra cảnh báo vitamin K. |
| "tim quan… My Dinh" không dấu · "Me có tác dụng gì" · G06-029 (lactose) · giữ riêng F02, R04 | **Chưa** — chưa tới lượt. Chỗ nghi ngờ ở `HANDOFF_FABLE_2.md` mục 2. |
| 3 câu safety sai của bộ 1.000 | Chưa xem. |

## 5. Số đo cuối + deploy
| Thước đo | Gốc | Cuối phiên |
|---|---|---|
| `tsc`, `vite build` | sạch | sạch |
| vitest | 2.526 | 2.532 qua, 0 trượt |
| paraphrase / convo | 386/400 · 155/160 | 387/400 · 155/160 |
| Bộ 1.000 câu | 876/985 (safety 26/29) | 876/985 — sửa 1, hỏng 0; safety 26/29 |
| Bộ giữ riêng | 61/65 | 61/65 |

- Migration bảo mật: đã chạy trên DB thật (có hiệu lực ngay, không cần deploy app).
- Lomi bước 2: gộp `main` + deploy 15/11. Mục tiêu ≥ 93% **chưa đạt** (vẫn 88,9%) — xem `HANDOFF_KIEN_TRUC.md` mục 5.
- Nhánh `kien-truc-lomi` có trên GitHub, đang bằng `main`.
