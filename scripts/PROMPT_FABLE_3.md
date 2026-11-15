# Giao việc (phiên Fable 3): rà nốt các phần còn lại của iLomi + đẩy Lomi lên ≥ 93%

Bạn làm cho **Kir** (anh), solo dev của **iLomi**. Trả lời bằng tiếng Việt, xưng **em**, gọi **anh**, ngắn gọn, dễ hiểu (anh không cần đọc code). Làm tự động từ đầu tới cuối. Chỉ hỏi anh khi việc tốn credit Lovable hoặc không đảo ngược được.

## 0. Đọc trước (theo thứ tự)
1. `CLAUDE.md`: luật bất biến.
2. `scripts/lomi-audit/PROMPT_FABLE_TOAN_DIEN.md`, **mục 0 và phần C**: repo, cách deploy, miễn phí / tốn credit, thước đo bắt buộc. Dùng y nguyên.
3. `scripts/HANDOFF_FABLE_2.md`: phiên trước đã sửa gì ở Gọi / Quẹt / Chat, checklist 2 máy, bộ giữ riêng.
4. `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`: kiến trúc Lomi bước 1 đã xong, các bước 2–6 còn lại.
5. Lovable project knowledge (`get_project_knowledge`): QUY TẮC #1–#77.

**Số gốc** (15/11, commit d9dc661):

| Thước đo | Số gốc |
|---|---|
| vitest | 2.526 qua |
| paraphrase | 386/400 |
| convo | 155/160 |
| Bộ 1.000 câu | 876/985 = 88,9% (safety 26/29) |
| Bộ giữ riêng | 61/65 (`bash scripts/lomi-audit/holdout.sh`) |

Đo lại một lần đầu phiên rồi mới sửa.

Lưu ý: nhánh `kien-truc-lomi` **chưa có trên GitHub** (phiên trước gộp vào `main` nhưng không đẩy nhánh). Muốn làm kiến trúc trên nhánh thì tạo lại từ `main`.

## Phần 1 — Việc còn dở của phiên Fable 2

### 1.1 Kiểm bản đang chạy thật
Phiên trước không truy cập được ilomi.live nên chưa kiểm được bundle (quy tắc #17).
- Nếu phiên này có công cụ trình duyệt: mở ilomi.live, unregister service worker, xoá cache, tải lại. Kiểm bundle JS có chuỗi mới, ví dụ `undo_swipe_action`, "Không gọi được cho người này", `safety-first`.
- Nếu không mở được thì ghi rõ trong báo cáo.

### 1.2 Quẹt
- Gọi thẳng API `UPDATE swipe_actions` (không qua app) né được giới hạn 10 quẹt/ngày của người chưa là thành viên, vì trigger giới hạn chỉ chạy `BEFORE INSERT`.
- Cần chốt server. Thêm kiểm `BEFORE UPDATE OF action` nhưng **không đếm 2 lần** khi app upsert.
- Thử bằng khối `DO … RAISE EXCEPTION` (tự rollback) trên tài khoản `loadtest_`, như phiên trước.

### 1.3 Chat
- Che từ tục cho `messages` / `group_messages`: **anh chưa quyết**. Đừng làm, chỉ nhắc lại trong báo cáo.

### 1.4 Gọi
- Chờ anh thử checklist 11 bước ở `HANDOFF_FABLE_2.md`.
- Nếu anh gửi kết quả bước nào sai thì sửa theo kết quả đó.
- Không tự sửa thêm phần gọi khi chưa có kết quả máy thật.

## Phần 2 — Lomi (mục tiêu ≥ 93% bộ 1.000 câu, không hỏng safety, bộ giữ riêng không giảm)

Làm tiếp các bước 1–6 ở mục 3 của `HANDOFF_KIEN_TRUC.md`, đúng thứ tự:
1. **An toàn:** cấp cứu và bạo lực.
   - Tách `urgentReplyOf` / `harmReplyOf` thành hàm thuần.
   - Thêm vào `safetyCandidates`, bật chặn như `crisis`.
2. **Thuốc:** ứng viên `drug-interact`, kèm `layerOf(reply)` cho legacy.
   - Ca kiểm: "bố em uống thuốc loãng máu, ăn cải bó xôi có sao không" phải ra cảnh báo vitamin K.
3. **Câu ghép:** tìm quán ↔ sức khoẻ ↔ tâm sự, vế chính thắng.
   - Ví dụ: "tìm quán cà phê nhưng đang đau bụng dữ dội".
4. **Hỏi lại khi sát điểm** (`askBack`). Lớp askback hiện 89/112. Chỉ bật khi đã có ≥3 nhóm đề cử.
5. **Đổi chủ đề thì xoá cờ mang theo** (`medAge`, `tarotBack`, `about`).
   - Ca kiểm trong bộ giữ riêng: R04, D06, H08.
6. **Một biểu diễn tiếng Việt** + đưa `parseVi` vào `splitClauses` (nếu còn thời gian).

**Lỗi Lomi cụ thể còn mở** (chỗ nghi ngờ ghi trong `HANDOFF_FABLE_2.md` mục 2):
- "tim quan co mon gan xao… My Dinh" (không dấu) → tư vấn khách cho DN, đáng ra là tìm quán.
- "Me có tác dụng gì" → không hiểu. Nghi một nhánh trước lớp dược liệu đọc "me" = "mẹ".
- G06-029: "Em bị đau bụng sau khi uống sữa." → "Cái đó có liên quan đến lactose không?" → chưa nối được "cái đó" với bệnh.
- Bộ giữ riêng còn trượt:
  - F02 "điểm tích lũy dùng để làm gì" (FAQ app)
  - R04 (đang chờ chủ đề bói, đáp "về chuyện tiền bạc")
  - T05 (chấp nhận được, xem lại)

**Lớp yếu trên bộ 1.000 câu:**

| Lớp | Đúng |
|---|---|
| askback | 89/112 |
| food | 71/91 |
| health | 204/230 |
| tarot | 70/77 |
| biz | 53/66 |
| safety | 26/29 |

Xem 3 câu safety sai bằng `fails.py safety`; sửa được thì sửa, an toàn chỉ chặt hơn. Không chỉnh luật theo từng câu của bộ 1.000; đi bằng kiến trúc.

## Phần 3 — Rà các tính năng phiên trước CHƯA đụng

Cùng cách làm như Phần A của phiên Fable 2: đọc code + đối chiếu DB (policy, trigger, RPC), xếp lỗi P0 / P1 / P2, sửa P0–P1.
- Sửa DB bằng 1 migration rõ ràng + thử rollback trên tài khoản `loadtest_`.
- Không nới RLS.
- Không thêm tính năng lớn, không đổi giao diện tổng thể.

Thứ tự ưu tiên:
1. **Bảo mật / RLS toàn app.**
   - Quét mọi policy UPDATE / INSERT kiểu lỗi `messages` phiên trước: người dùng sửa được cột không phải của mình, tự cấp quyền, tự đổi `points`, `is_member`, `membership_*`, `is_featured`, `level`, `status` duyệt…
   - Gồm các bảng `profiles`, `businesses`, `offers`, `offer_claims`, `reviews`, `wall_posts` (+ comments, reactions), `follows`, `reports`, `rides`, `ride_drivers`, `group_*`, `notifications`.
   - Knowledge ghi "security scan 1 Critical + Warning riêng tư — chờ Kir quyết": tìm lại đó là gì, giải thích ngắn cho anh, đề xuất cách sửa.
2. **Ưu đãi** (`Offers.tsx`, `offers` / `offer_claims`): chỉ thành viên mới nhận (MEMBER_ONLY, `is_active_member`), không nhận trùng, hết hạn, hết lượt. Chốt ở server (#19).
3. **Thông báo + push** (`Notifications.tsx`, `send-push`, `register-push`, `push-sw.js`):
   - Mở đúng chỗ (#58).
   - Không bắn lại khi đánh dấu đã đọc (#30).
   - Đăng xuất xoá endpoint (#47).
   - `broadcast_offer` chưa gộp theo category (đang treo).
4. **Cộng đồng / tường / hồ sơ** (`Community.tsx`, `Profile.tsx`, `UserProfile.tsx`):
   - Sửa / xoá bài và bình luận, cảm xúc.
   - Chặn thì ẩn hai chiều.
   - Giới hạn ảnh (#20, #22).
   - Mục #13 "cảm xúc bài → gửi vào tin nhắn" **chưa làm**: hỏi anh có muốn làm không, đừng tự làm.
5. **Đưa đón** (`Rides.tsx`, #53, #59, #60): giá tính ở server, tài xế được duyệt, heartbeat online, bản đồ live, huỷ chuyến, ai xem được vị trí.
6. **Doanh nghiệp / khám phá / gần đây** (`Businesses.tsx`, `BusinessDetail.tsx`, `Nearby.tsx`):
   - Duyệt tay (không auto-approve).
   - Phân trang (`businesses_explore_view`).
   - Đánh giá: 1 người 1 lần, `business_card_stats` refresh (#45).
7. **Đăng ký / đăng nhập / quên mật khẩu**:
   - `CompleteProfileScreen`, ngày sinh ≥ 18 (#49), Google qua `lovable.auth` (#34).
   - Đăng xuất chỉ máy đó (`scope: "local"`).
8. **Admin** (`Admin.tsx`):
   - Mutation nhạy cảm phải đi qua edge function (CLAUDE.md #12).
   - Edge `admin-cleanup-orphans` **chưa deploy**: deploy edge function tốn credit, **hỏi anh trước**.
9. **PWA / cập nhật bản mới:**
   - Sau mỗi deploy người dùng phải đóng hẳn app mới thấy bản mới. Xem có cách an toàn để app tự báo "Có bản mới — chạm để tải lại" không (vite-plugin-pwa `registerType` / `onNeedRefresh`).
   - Đề xuất cho anh trước khi làm, vì đụng service worker (CLAUDE.md #14).

Việc **không** làm (đã chốt hoặc ngoài tầm web):
- Loa ngoài trên Android (#26).
- OTP điện thoại (#4, cần dịch vụ SMS trả phí).
- Lọc ảnh 18+ và huy hiệu thành viên: chỉ ghi vào danh sách đề xuất, không tự làm.

## Phần 4 — Thước đo, deploy, bàn giao
- Thước đo bắt buộc: phần C của `PROMPT_FABLE_TOAN_DIEN.md` + bộ giữ riêng.
- Chỉ deploy khi:
  - đủ mọi thước đo
  - bộ 1.000 câu ≥ 88,9%
  - 0 câu safety hỏng
  - bộ giữ riêng ≥ 61/65
  - build sạch
- Mỗi cụm sửa thì commit + push + `get_project` khớp sha + `deploy_project`.
- Ghi tiến độ liên tục:
  - `scripts/HANDOFF_FABLE_3.md`: Phần 1, 3 và lỗi Lomi cụ thể.
  - `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`: Phần 2.
- Cuối phiên:
  - Cập nhật Lovable knowledge (giữ dưới 10.000 ký tự, văn phong QUY TẮC #N ngắn). Hiện đã ~9.900 ký tự nên **gộp, rút gọn dòng cũ** trước khi thêm.
  - Báo cáo anh bằng tiếng Việt:
    - Lỗi tìm / sửa theo từng tính năng, nói bằng ví dụ người dùng gặp.
    - Bảng số đo trước / sau.
    - Việc cần anh quyết hoặc thử máy thật.
    - Việc còn dở.
    - Nhắc **đóng hẳn app rồi mở lại**.
