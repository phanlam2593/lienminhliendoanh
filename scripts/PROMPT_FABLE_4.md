# Giao việc (phiên Fable 4): làm các việc anh Kir đã duyệt 15/11 + Lomi bước 3–4

Bạn làm cho **Kir** (anh), solo dev của **iLomi**. Trả lời tiếng Việt, xưng **em**, gọi **anh**, ngắn gọn, anh không cần đọc code. Làm tự động, không hỏi lại những việc dưới đây vì **anh đã duyệt hết**.

**Quỹ phiên có hạn:** anh còn khoảng 17% Fable. Làm **đúng thứ tự ưu tiên** dưới đây. Mỗi việc xong là commit + push + deploy + ghi `scripts/HANDOFF_FABLE_4.md` ngay, để hết lượt giữa chừng thì không mất gì. Đừng đọc lại toàn bộ code; chỉ đọc chỗ cần cho việc đang làm.

## 0. Đọc trước (lướt nhanh)
- `CLAUDE.md`: luật bất biến.
- `scripts/lomi-audit/PROMPT_FABLE_TOAN_DIEN.md` **mục 0 + phần C**: repo, deploy, miễn phí / tốn credit, thước đo.
- `scripts/HANDOFF_FABLE_3.md`: mục 2 (kho ảnh), mục 3 (PWA, Admin).
- `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`: bước 3–6.

Số gốc (15/11):

| Thước đo | Số gốc |
|---|---|
| vitest | 2.532 qua |
| paraphrase | 387/400 |
| convo | 155/160 |
| Bộ 1.000 câu | 876/985 (safety 26/29) |
| Bộ giữ riêng | 61/65 |

Không cần đo lại đầu phiên. Chỉ đo khi đã sửa Lomi.

## Việc anh đã duyệt — làm theo thứ tự

### 1. Kho ảnh / ghi âm riêng tư (ưu tiên cao nhất)
Hiện mọi người đã đăng nhập đọc **và liệt kê** được mọi file trong bucket `uploads` và `voice`: ảnh tin nhắn riêng, tin nhắn thoại, ảnh bằng lái / chân dung tài xế.

Anh duyệt làm **bước nhỏ an toàn trước**:
- **(a) Chặn liệt kê.** Bỏ quyền `list` cho người thường trên `uploads` / `voice`, chỉ đọc được khi biết đúng đường dẫn. Kiểm mọi chỗ app gọi `.list(` trên storage trước, để không làm hỏng màn nào.
- **(b) Giấy tờ tài xế.** Chuyển ảnh bằng lái / chân dung tài xế (đăng ký ở `Rides.tsx`, `apply_driver`) sang bucket **riêng tư mới**. Chỉ chủ hồ sơ + admin đọc được; admin xem bằng signed URL.
  - Chuyển cả ảnh cũ: copy, cập nhật đường dẫn trong DB, rồi mới xoá ảnh cũ. Không mất ảnh.
  - Migration rõ ràng + policy. Thử bằng tài khoản `loadtest_` có rollback.
- **(c) Nếu còn quỹ:** tin nhắn riêng / tin thoại chỉ 2 người trong cuộc (+ admin) đọc được (bucket riêng + signed URL theo cuộc trò chuyện).
  - Việc này đụng nhiều màn. **Chỉ làm khi (a)(b) xong và còn dư.** Không thì ghi kế hoạch chi tiết vào HANDOFF.

### 2. Báo "Có bản mới — chạm để tải lại" (PWA)
- Cấu hình hiện tại `autoUpdate` + `skipWaiting` + `clientsClaim` (vite-plugin-pwa). Thêm thanh báo nhỏ khi service worker có bản mới, kiểu toast ở đáy, tiếng Việt, theme emerald→blue. Chạm thì tải lại trang.
- Không đổi cách cache.
- Chú ý:
  - Không bật báo khi lần đầu cài.
  - Không chen vào lúc đang gọi điện. Nếu `call.tsx` đang có cuộc gọi thì hoãn tới khi cuộc gọi kết thúc.
- Sau khi deploy, nhắc anh đây là **lần cuối** phải đóng hẳn app. Từ bản sau app sẽ tự báo.

### 3. Mục #13: "cảm xúc bài → gửi vào tin nhắn"
- Khi A thả cảm xúc lên **bài tường / status** của B, B nhận một tin trong Inbox 1-1 với A. Kiểu Messenger: "A đã bày tỏ ❤️ về bài viết của bạn", có trích bài và chạm thì mở đúng bài.
- Dùng bảng `messages` + Inbox toàn cục có sẵn (CLAUDE.md #10); `wall_post_reactions` đã có.
- Bắt buộc:
  - Không gửi khi tự thả cảm xúc bài mình, khi hai người đã chặn nhau, hoặc khi đổi / gỡ cảm xúc liên tục. Chỉ 1 tin cho mỗi (người, bài); đổi cảm xúc thì cập nhật tin đó.
  - Làm ở server (trigger) để chặt.
  - Thông báo có `target_id` + `target_type` điều hướng được.
- Hỏi lại anh **chỉ khi** thấy cần quyết định UI lớn.

### 4. Admin: chuyển các thao tác ghi sang edge function (CLAUDE.md #12)
- `Admin.tsx` còn khoảng 30 chỗ sửa thẳng bảng từ client: duyệt / từ chối DN, sửa hồ sơ, xoá DN / ưu đãi / đánh giá, membership…
- Gom vào **một** edge function có sẵn, `admin-action`: mỗi thao tác 1 `action`, kiểm `has_role(admin)` ở server, ghi log nếu đã có cơ chế log.
- Client gọi `supabase.functions.invoke('admin-action', …)`. Giữ nguyên giao diện và hành vi.
- Làm từng nhóm, mỗi nhóm build + test rồi mới sang nhóm sau.
- **Chưa xoá policy admin cũ trên bảng** ở phiên này. Chỉ đổi đường gọi; khoá lại policy để phiên sau, khi đã chắc mọi thao tác chạy qua edge function.

### 5. Deploy edge function: một lần duy nhất, gộp hết
Anh đã duyệt tốn credit cho việc này. Sau khi xong việc 4 (hoặc khi sắp hết quỹ), gửi **một** `send_message` cho Lovable yêu cầu **chỉ deploy** các edge function:
- `admin-action` (bản mới)
- `admin-cleanup-orphans` (chưa từng deploy)
- và bất kỳ edge function nào khác bạn đã sửa

Yêu cầu nói rõ **không sửa code nào khác**. Sau đó kiểm commit của agent Lovable: nó hay tự sửa thêm, như 13/11 tự sửa `send-push`. Có sửa ngoài yêu cầu thì revert.

Nếu việc 4 chưa xong mà phải deploy, thì client vẫn phải chạy được với cả hai đường: thao tác chưa chuyển vẫn gọi thẳng bảng.

### 6. Hai lỗi nhỏ (miễn phí, nhanh)
- **Hai người nhận cùng ưu đãi cùng tích tắc có thể trùng mã:** khoá hàng (`FOR UPDATE`) hoặc ràng buộc UNIQUE trong `claim_offer`.
- **`businesses_explore_view` lộ cột `admin_note`.** Hiện 0 DN đã duyệt có ghi chú nên chưa lộ gì thật.
  - Bỏ cột khỏi view. Trước đó grep client xem có chỗ nào đọc `admin_note` từ view này không.
  - Đây là sửa bảo mật, được phép dù CLAUDE.md #5 hạn chế đổi cột.

### 7. Lomi: bước 3 và 4 kiến trúc (nếu còn quỹ)
Theo `HANDOFF_KIEN_TRUC.md` mục 3. Đây là hai bước kéo điểm lên (food 71/91, askback 89/112):
- **Bước 3, câu ghép:** "tìm quán cà phê nhưng đang đau bụng dữ dội" thì vế chính thắng.
- **Bước 4, hỏi lại khi sát điểm.**
- Thước đo phần C bắt buộc: không hỏng safety; bộ 1.000 câu ≥ 876; bộ giữ riêng ≥ 61/65; 2.532+ test qua.

### Không làm
- Che từ tục cho tin nhắn / chat nhóm: **anh đã quyết bỏ**, không làm.
- Gọi điện: chờ anh thử checklist 11 bước, không sửa thêm.

## Cuối phiên
- `scripts/HANDOFF_FABLE_4.md`: việc nào xong, việc nào dở, dở ở bước nào.
- Lovable knowledge: thêm quy tắc mới thật ngắn. Knowledge đang sát 10.000 ký tự, **rút gọn dòng cũ trước**.
- Báo cáo anh ngắn bằng tiếng Việt:
  - Từng việc: xong / dở, ví dụ người dùng thấy gì.
  - Số đo Lomi (nếu có sửa).
  - Credit đã tiêu.
  - Việc anh cần thử trên máy thật.
  - Nhắc **đóng hẳn app rồi mở lại** (lần cuối, nếu việc 2 đã lên).
