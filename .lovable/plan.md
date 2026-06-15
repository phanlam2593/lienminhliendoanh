## Đợt A — Đồng bộ màu Teal & nút Đăng nhập nổi bật

Phạm vi: chỉ `Logo.tsx` và `Layout.tsx` (Welcome screen).

- **Logo.tsx**: thay constant `GREEN = "#18a974"` bằng màu primary từ design token (`hsl(var(--primary))`). Logo & chữ trên header dùng cùng tông teal với UI còn lại.
- **Layout.tsx → WelcomeScreen**:
  - Bỏ constant `GREEN = "#1a5c35"`. Dùng `text-primary`, `bg-primary`, `border-primary`, `bg-accent`.
  - Đảo thứ tự CTA: **"Đăng nhập"** ở trên (gradient-brand, đậm), **"Tham gia ngay"** ở dưới (outline).
  - Stats card / icon container chuyển sang `bg-accent text-primary`.
- **KHÔNG** đụng layout, nội dung text, contact footer, features list.

Test: mở `/` chưa login → màu logo + welcome đồng bộ tông teal hiện tại; Đăng nhập là nút nổi bật nhất.

## Đợt B — Avatar tương tác + Profile popup

### B1. Avatar hiển thị & đổi được
- Tạo component mới `src/components/Avatar.tsx`: wrap `StoredImage` + initials fallback. Props: `path`, `name`, `size`, `onClick?`, `className?`.
- **Layout header** (avatar góc phải): dùng `<Avatar>` thay khối chữ cái → hiện avatar thực.
- **Profile.tsx**: avatar 16x16 click được. Click → `<input type="file">` → `uploadImage(file, "avatars", uid)` → update `profiles.avatar_url` → `refresh()`. Toast thành công.
- **BusinessDetail.tsx** (block reviews): thay div chữ cái bằng `<Avatar>` để hiện avatar người đánh giá.

### B2. Profile quick-view popup
- Tạo `src/components/ProfileQuickView.tsx`: Dialog hiển thị avatar lớn, tên, `@username`, role (member/admin), email & phone (luôn hiển thị nếu có; không có ô "công khai" trong schema), nút **Follow / Đang theo dõi**, nút **Xem hồ sơ đầy đủ** (chuyển `/ho-so` cho chính chủ, hoặc đóng popup cho người khác — vì hiện chưa có trang profile public, sẽ ẩn nút này khi không phải self để không tạo route ảo).
- Trigger: click avatar/tên trong review block ở `BusinessDetail.tsx`.
- Nút Follow gọi follows table (xem C0).

### C0 (chia sẻ với B2). Bảng `follows` tối giản
Polymorphic để hỗ trợ cả popup (user→user) và nhu cầu tương lai (user→business):
```
follows(id, follower_id uuid, followee_user_id uuid NULL, followee_business_id uuid NULL,
        created_at, CHECK (num_nonnulls(followee_user_id, followee_business_id) = 1),
        UNIQUE (follower_id, followee_user_id),
        UNIQUE (follower_id, followee_business_id))
```
RLS: anyone authenticated SELECT (để đếm); follower_id = auth.uid() cho INSERT/DELETE. Grants chuẩn.

Trigger `notify_new_follow`: tạo notification type `new_follower` cho followee_user_id khi có follow user→user. (Không spam với follow business.)

Thêm `NotifType` mới: `new_follower`.

Test: 
- Avatar hiển thị đúng sau upload, refresh, đăng xuất/đăng nhập lại
- Click avatar trong review → popup hiện, Follow toggle hoạt động, người được follow nhận notification.

## Đợt C — Báo cáo 2 chiều & Duyệt thành viên có phản hồi

### C1. Schema
- `reports.status` enum mới `report_status` (`pending`, `replied`, `resolved`, `closed`). Default `pending`. Backfill: `resolved=true` → `resolved`, ngược lại `pending`. Giữ cột `resolved` để tương thích, không xóa.
- Bảng mới `report_replies(id, report_id, author_id, body text, created_at)`.
- `profiles.admin_note text NULL` — lưu lý do duyệt/từ chối gần nhất.
- RLS `report_replies`:
  - SELECT: admin, reporter (report.user_id = auth.uid()), hoặc owner của business target (nếu target_type='business').
  - INSERT: cùng tập trên + author_id = auth.uid().
- Trigger `notify_report_reply`: notify reporter (nếu author là admin/business owner) và notify business owner (nếu author là reporter/admin) — kèm type mới `report_reply`.
- Cập nhật `notify_profile_status`: kèm `admin_note` vào body khi rejected/approved.
- Thêm NotifType: `report_reply`.

### C2. UI Admin
- `Admin.tsx → ReportsSection`:
  - Hiển thị badge status (pending/replied/resolved/closed) thay vì checkbox resolved.
  - Mở rộng từng report: list `report_replies` (avatar + tên + body + time), input + nút "Gửi phản hồi".
  - Dropdown thay đổi status. "Đã xử lý" set `resolved=true` + `status='resolved'`.
- `Admin.tsx → MemberDetail` khi pending:
  - Nút Duyệt giữ nguyên (kèm `admin_note` tùy chọn).
  - Nút Từ chối: bắt buộc nhập lý do (textarea inline). Save `admin_note` rồi `status='rejected'`.

### C3. UI Doanh nghiệp (Profile.tsx ReportsInbox)
- Hiển thị status badge, list replies, ô nhập + nút "Trả lời".
- Nút "Đánh dấu đã xử lý" → set `status='resolved'`, `resolved=true`.

### C4. UI người báo cáo
- Trang `Notifications`: khi type=`report_reply`, click chuyển đến… (chưa có trang chi tiết report). Giải pháp tối thiểu: hiển thị body notification kèm preview reply (đã có từ trigger). Không tạo trang mới để không phình scope.

Test E2E:
1. Member gửi report → admin thấy status `pending`.
2. Admin trả lời → reporter nhận notification `report_reply`, status đổi `replied`.
3. Reporter trả lời lại từ Profile (nếu là DN owner cũng có thể). Admin thấy reply mới.
4. Admin "Đánh dấu đã xử lý" → status `resolved`.
5. Duyệt member: từ chối yêu cầu lý do, member nhận notification với lý do trong body.

## Ngoài phạm vi đợt này (sẽ làm sau theo yêu cầu)
- Mục 5 (tắt auto-notify offer), 7 (khu vực động), 9 đầy đủ, 10 (DN tự quản offer), 11 (lịch giờ/thứ), 12 chi tiết hơn.

## Kỹ thuật
- Tất cả migration tuân thủ GRANT + RLS chuẩn.
- Không sửa `types.ts` auto-gen của Supabase (sẽ regenerate sau migration). `src/lib/types.ts` (manual) sẽ cập nhật theo schema mới.
- Không động `index.css` token (đã chuẩn teal).
