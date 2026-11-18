# HANDOFF — phiên Fable 4 (15/11 → 18/11/2026)

Việc giao: `scripts/PROMPT_FABLE_4.md`. Ghi theo thứ tự việc trong prompt.

## 1. Kho ảnh / ghi âm riêng tư — (a)(b) XONG, (c) chưa làm
Migration `20261115170000_fable4_storage_privacy.sql` (đã chạy trên DB thật).
- **(a) Chặn liệt kê** `uploads` / `voice`: gọi API liệt kê chỉ thấy file thư mục của chính mình (admin thấy hết). Đọc 1 file khi
  biết đúng đường dẫn như cũ (app hiện ảnh vẫn chạy). App không có chỗ nào gọi `.list()`.
  Nhận biết "đang liệt kê" bằng câu lệnh đang chạy (`storage_is_listing()`: các hàm `storage.search*` / `list_objects_with_delimiter`).
  Đo trên `loadtest_`: đọc từng file 405 + 12 → liệt kê chỉ ra 1 (file của mình), 0 voice.
  Nếu Supabase đổi tên hàm liệt kê thì chỉ quay về như cũ (không làm hỏng app).
- **(b) Giấy tờ tài xế** → bucket riêng tư `driver-docs`: bằng lái + ảnh xe chỉ chủ hồ sơ + admin; ảnh chân dung thêm khách của chuyến
  tài xế đó đã nhận (`accepted/picked_up/completed`). Đăng ký tài xế (`Rides.tsx`) tải lên đường dẫn `driver-docs/<uid>/{portrait|vehicle|license}/…`;
  `getSignedUrl` ký theo tiền tố bucket. **Ảnh cũ:** không có tài xế nào từng gửi bằng lái / ảnh xe; ảnh chân dung duy nhất (`lamphan`)
  chính là ảnh đại diện hồ sơ (công khai sẵn) → không có gì phải chuyển, không xoá gì.
- **(c) Tin nhắn riêng / tin thoại chỉ 2 người đọc — CHƯA làm.** Kế hoạch:
  1. Bucket mới `dm` (riêng tư). Đường dẫn `dm/<uid gửi>/<uid nhận>/<uuid>.<ext>` → policy SELECT: `auth.uid()` là phần 1 hoặc 2 của đường dẫn, hoặc admin.
  2. `uploadImage` / `uploadAudio` nhận thêm `bucket` + thư mục `<partnerId>`; Messages.tsx (ảnh, tin thoại) truyền vào. Chat nhóm: `gm/<groupId>/…`
     + policy qua `is_group_member((storage.foldername(name))[1]::uuid, auth.uid())`.
  3. Ảnh/tin thoại cũ: để nguyên trong `uploads` / `voice` (đã chặn liệt kê) — hoặc chép sang rồi cập nhật `messages.image_url` theo từng dòng.
  4. Nhớ: thông báo đẩy / bản xem trước link không dùng đường dẫn này.

## 2. Thanh báo "Có bản mới — chạm để tải lại" — XONG
`src/components/UpdatePrompt.tsx` + `lib/pwa.ts`. Khi service worker mới nắm quyền (`controllerchange`, **không** tính lần cài đầu) hoặc khi
có bản mới đã cài → thanh ở đáy (gradient-brand), giữ tới khi chạm; thay toast 8 giây cũ. Đang gọi điện (`useCall().state.status !== "idle"`)
thì ẩn tới khi cúp máy. Không đổi cách cache.

## 3. #13 Thả tim bài tường → tin nhắn — XONG
Migration `20261118120000_fable4_post_reaction_message.sql` (đã chạy trên DB thật).
- Bài tường chỉ có 1 loại cảm xúc (tim) → không có "đổi cảm xúc".
- Trigger `post_reaction_to_message` trên `wall_post_reactions` tạo tin `messages.type='post_reaction'`, cột mới `ref_post_id`.
  Nội dung "❤️ đã thích bài viết của bạn: “<80 ký tự đầu>”". Không gửi khi tự thả / chặn nhau / người thả tim chưa được duyệt.
  1 tin cho mỗi (người, bài) — UNIQUE một phần `messages_post_reaction_once`; bỏ tim thì tin vẫn giữ.
- Client không tự tạo / sửa được tin loại này (`guard_message_columns`).
- Thông báo: dùng thông báo tin nhắn sẵn có (`notify_new_message` → mở Hộp thư, tôn trọng tắt tiếng).
- UI: bong bóng riêng trong `Messages.tsx` có "Xem bài viết →" mở `/ho-so?post=<id>` (bài của mình) hoặc `/ho-so/<chủ bài>?post=<id>`;
  `WallPostCard` tự cuộn tới + sáng viền. Hạn chế: tường chỉ tải 20 bài mới nhất — bài cũ hơn thì không cuộn tới được.
- Thử rollback trên `loadtest_`: thả/bỏ/thả lại = 1 tin; tự thả = 0; bị chặn = 0; giả tin từ client bị hạ thành tin thường; không sửa được nội dung.

## 6. Hai lỗi nhỏ — XONG
Migration `20261118123000_fable4_claim_lock_explore_view.sql` (đã chạy).
- `claim_offer`: khoá theo DN (`pg_advisory_xact_lock`) trước khi cấp số → hết trùng mã; 1 người bấm 2 lần cùng lúc không ra 2 mã.
  DB thật **đã có 1 cặp mã trùng** từ trước nên không thêm UNIQUE.
- `businesses_explore_view` dựng lại **bỏ `admin_note`** (không màn nào đọc cột này từ view). Vẫn 1.017 DN, quyền đọc giữ nguyên.

## 4. Admin qua edge function — XONG (chưa khoá policy cũ, đúng như dặn)
- `supabase/functions/admin-action` **không hề có trong repo** (knowledge ghi nhầm là có sẵn) → tạo mới.
  Kiểm `has_role(admin)` ở server; danh sách trắng thao tác `update` / `delete` / `insert_offer` / `broadcast` + danh sách trắng CỘT theo
  bảng (profiles, businesses, offers). Thực thi bằng **phiên đăng nhập của admin** (không service role) → RLS, trigger, thông báo y như cũ.
  Không có bảng log admin sẵn → không ghi log.
- `src/lib/adminAction.ts` + `Admin.tsx`: 18 lệnh sửa, 3 lệnh xoá DN (kèm ưu đãi), 4 lệnh xoá lẻ, 2 lệnh thêm ưu đãi, gửi thông báo hàng loạt.
  Không còn lệnh ghi thẳng bảng nào trong `Admin.tsx`. Giao diện / câu báo giữ nguyên.
- Edge function trả 404 / lỗi CORS preflight (chưa deploy) → tự quay về ghi thẳng bảng.
- **Phiên sau:** khi anh xác nhận trang Admin chạy ổn, khoá các policy `* admin manage` / `profiles admin update` trên bảng (chỉ còn đường edge function)
  và đổi edge function sang service role. Trước khi khoá: grep lại toàn `src/` xem còn chỗ nào (ngoài Admin.tsx) dùng quyền admin ghi thẳng bảng.

## 5. Deploy edge function — XONG (1 lần send_message, 0,6 credit theo Lovable báo)
- Deploy `admin-action` + `admin-cleanup-orphans` (lần đầu). Kiểm thật: cả hai trả 401 "thiếu đăng nhập" (không phải 404) → đã chạy.
- Commit của agent (`76862b3`) chỉ sinh lại `src/integrations/supabase/types.ts` cho khớp DB (cột `ref_post_id`, bỏ `admin_note` ở view,
  3 hàm mới) — đúng, giữ lại. Không sửa file nào khác.
## 7. Lomi bước 3–4 — (ghi khi làm)
