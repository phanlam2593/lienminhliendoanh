# Giao việc (phiên Fable 2): rà soát toàn diện Gọi · Quẹt · Chat + hoàn thiện Lomi

Bạn làm cho **Kir** (anh), solo dev của **iLomi**, một PWA cộng đồng ở Đà Lạt. Trả lời anh bằng tiếng Việt, xưng **em**, gọi **anh**, ngắn gọn, dễ hiểu (anh không cần đọc code). Bạn làm tự động từ đầu tới cuối: đọc → tìm lỗi → sửa → đo → deploy → báo cáo. Chỉ hỏi anh khi gặp quyết định không đảo ngược được hoặc việc tốn credit Lovable.

## 0. Repo, luật, cách deploy
- Repo GitHub `phanlam2593/lienminhliendoanh`, nhánh `main`. Nếu chưa có trong phiên thì add repo (quyền push) rồi clone. **Đọc `CLAUDE.md` ở gốc repo trước tiên**: đó là luật bất biến (tên app "iLomi", 9 loại DN cố định, không bật auto-approve, không đổi route / tên file / bảng / cột, chỉ sửa đúng file liên quan, migration SQL + RLS cho bảng mới, không nới RLS, mutation admin đi qua edge function…).
- Lovable project id: `9df4a19e-99e7-413c-9222-1626146f7c63`. Push `main` thì Lovable tự đồng bộ sau khoảng 90 giây. Production **ilomi.live** chỉ cập nhật khi gọi `deploy_project`. Trước khi deploy, gọi `get_project` để chắc `latest_commit_sha` khớp commit vừa push.
- **Miễn phí:** git push; Lovable `get_project`, `read_file`, `query_database`, `deploy_project`, `get/set_project_knowledge`.
- **Tốn credit:** Lovable `send_message` (anh có ~5 credit/ngày). Chỉ dùng khi phải deploy **edge function**, và phải hỏi anh trước. Sau khi agent Lovable làm xong thì kiểm commit của nó, vì nó hay sửa thêm ngoài yêu cầu (13/11 nó tự sửa `send-push`).
- Commit với `git -c user.name="Kir" -c user.email="phanlam2593@gmail.com"`. Trước mỗi commit chạy `git checkout supabase/functions/mcp/index.ts package-lock.json`: 2 file này tự đổi khi cài, không được commit.
- DB: đọc / kiểm bằng `query_database` thoải mái. Thay đổi schema thì làm migration rõ ràng, có RLS. **Không xoá dữ liệu thật.** Dữ liệu test giả (`profiles.username LIKE 'loadtest_%'`) cứ để nguyên.
- Sau mỗi lần deploy: nhắc anh **đóng hẳn app rồi mở lại**. Service worker giữ bản cũ; muốn kiểm bundle thật thì unregister SW + xoá cache trước khi fetch.
- Đọc thêm Lovable project knowledge (`get_project_knowledge`). Nó có các QUY TẮC #1–#77 rút ra từ lỗi thật: gọi, Quẹt, push, Android, RLS… **Đừng lặp lại lỗi cũ.**

## Phần A — Rà soát và hoàn thiện Gọi · Quẹt · Chat

Mục tiêu: tìm và sửa lỗi thật, làm mượt trải nghiệm. **Không thêm tính năng lớn mới, không đổi giao diện tổng thể.** Với mỗi phần: đọc code, đối chiếu DB (policy, trigger, function), lập danh sách lỗi theo mức độ (P0 hỏng / mất dữ liệu / bảo mật → P1 sai hành vi → P2 khó chịu), rồi sửa P0–P1. P2 thì sửa nếu rẻ và an toàn.

### A1. Gọi thoại / video
- Code: `src/lib/call.tsx` (CallProvider, WebRTC 1-1, ~930 dòng), `src/pages/CallHistory.tsx` (`/cuoc-goi`), bong bóng cuộc gọi trong `Messages.tsx`. Edge `get-turn-credentials` (TURN Cloudflare Realtime). Bảng `calls` (call_type voice/video, nằm trong `supabase_realtime`). Push `call_ringing` qua `send-push`.
- Đã biết:
  - "Kẹt đang kết nối" trước đây do secret TURN cũ, đã sửa.
  - Đổi camera phải `oldTrack.stop()` **trước** `getUserMedia()` (#28).
  - `getIceServers()` phải log lỗi mọi nhánh (#27).
  - Loa ngoài: `setSinkId` không có trên Android (#26), không có cách sửa trên web.
  - **Chưa xác nhận:** hai người gọi cùng lúc (glare, #21); push cuộc gọi tới khi app đã đóng.
- Cần rà:
  - Vòng đời cuộc gọi: gọi → đổ chuông → nghe / từ chối / nhỡ / huỷ / timeout → kết thúc. Kiểm cả 2 phía.
  - Dọn track, peer, kênh realtime khi kết thúc, khi mạng rớt, khi đóng tab.
  - Glare.
  - Cuộc gọi bị chặn bởi `blocks`.
  - Nhật ký cuộc gọi đúng trạng thái.
  - Quyền mic / camera bị từ chối.
  - Push `call_ringing` mở đúng màn hình.
- **Bạn không gọi thật được:** cần 2 trình duyệt khác engine; Claude_Browser chặn mic (#21). Vì vậy:
  - Rà tĩnh kỹ, viết test cho phần logic tách được (state machine, xử lý trạng thái).
  - Cuối phiên đưa anh **checklist thử trên 2 điện thoại thật**, ngắn, từng bước.

### A2. Quẹt (`/quet`)
- Code: `src/pages/Quet.tsx` (~3.000 dòng). Bảng `swipe_needs`, `swipe_actions`, `swipe_matches`. Trigger `handle_swipe_match`, `enforce_swipe_daily_limit` (10 quẹt/ngày khi không phải thành viên), `reset_swipe_actions_on_unmatch`. RPC `get_my_swipe_quota`, `quet_loai_hinh_counts`, `business_area_counts`.
- Quy tắc đã chốt:
  - `need_id_a/b` gán theo LEAST/GREATEST(uuid), **không** tương ứng `user_a/b` (#41).
  - "Bỏ qua" hiện lại sau 48h hoặc khi chủ bài sửa (#42); unmatch hồi phục 48h (#43).
  - Kéo-thả ghi transform qua ref + rAF; vùng mô tả **không** được `overflow-y-auto` hay `pointer-events-auto`, vì sẽ giật (r29.8).
  - Card tự co theo đo DOM thật (#32).
  - Nút luôn hiện, render slot cố định (#40).
- Cần rà:
  - Lọc ứng viên: theo loại, target hai chiều, đã chặn, bản thân, bán kính, khu vực.
  - Đếm quota đúng ở cả client và server.
  - Match realtime + màn hình chúc mừng; hoàn tác; báo cáo / chặn.
  - Tạo / sửa / bật tắt nhu cầu: field theo từng loại và hướng, tối đa 4 ảnh, validate.
  - Tab Kết nối: đúng người, đúng nhu cầu, nút nhắn tin.
  - Hiệu năng khi nhiều card.

### A3. Chat
- Code:
  - `src/pages/Messages.tsx` (~2.200 dòng): inbox + thread 1-1 `/tin-nhan/:id`.
  - `src/pages/GroupChat.tsx`: `/tin-nhan/nhom/:gid`, tối đa 50 người, RLS `is_group_member` / `is_group_admin` (#52).
  - `src/pages/Community.tsx`: chat cộng đồng `community_messages`.
  - `VoiceMessageBubble.tsx`; edge `link-preview`, `giphy-search`.
- Cần rà:
  - Gửi / nhận realtime; thứ tự tin; trùng tin khi mạng chập chờn.
  - Số chưa đọc và đánh dấu đã đọc. Push chỉ bắn khi `is_read=false` (#30); push mở đúng chỗ (#58).
  - Chặn người dùng thì không nhắn, không gọi được.
  - Tin thoại; link preview; GIF; ảnh (giới hạn dung lượng #22, kiểm content-type #20).
  - Bàn phím Android che ô nhập (`--vvh`, #44); padding nav (#31).
  - Nút Back (#56: `useGoBack`, cấm `nav("/x")` cứng).
  - Che từ tục (`mask_profanity`: có ở community / reviews / swipe_needs / wall, **chưa** có ở messages / group_messages; hỏi anh trước khi thêm).
  - Trạng thái online (`src/lib/onlineUsers.tsx`).

### Thước đo phần A
- `npx tsc --noEmit -p tsconfig.app.json` sạch.
- Toàn bộ test qua (xem phần C).
- `npx vite build` sạch.
- Kiểm DB bằng `query_database` sau mỗi migration: policy đúng, không nới lỏng.
- Ghi tiến độ, lỗi tìm được, lỗi đã sửa, checklist thử máy thật vào `scripts/HANDOFF_FABLE_2.md`. Viết sao cho phiên khác đọc là làm tiếp được.

## Phần B — Hoàn thiện Lomi (`/tro-ly-ai`)

Lomi là trợ lý **chạy hoàn toàn trên máy**: không LLM, không API, chỉ có luật + thư viện. Đây là quyết định cố định của anh. Luồng nằm trong `src/pages/AiAssistant.tsx` (hàm `send`, ~190 nhánh `return`, "khớp trước thì thắng"), gọi khoảng 67 file `src/lib/lomi*.ts`.

### B1. Việc kiến trúc của phiên Fable trước (CHƯA làm, nhánh chưa từng được tạo)
Đọc nguyên văn `scripts/lomi-audit/PROMPT_FABLE_KIEN_TRUC.md` và làm theo, với các điều chỉnh sau:
- Làm trên nhánh `kien-truc-lomi`. Tiến độ ghi `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`.
- Cốt lõi: **lớp an toàn chạy trước** ở một chỗ duy nhất, rồi **đề cử + trọng tài** thay cho "khớp trước thắng". Chuyển dần từng nhóm, các nhánh chưa chuyển chạy qua lớp "legacy".
- **Đổi cách chọn lớp, không đổi nội dung trả lời.** An toàn chỉ được chặt hơn.
- Chỉ merge vào `main` và deploy khi đủ mọi thước đo ở phần C. Không đạt thì để trên nhánh và báo anh lý do.

### B2. Các việc Lomi còn dở (làm trên `main` nếu nhỏ và độc lập, hoặc gộp vào nhánh kiến trúc)
- Lớp yếu nhất trong bộ 1.000 câu:
  - askback 89/112: câu mơ hồ nên hỏi lại một câu ngắn.
  - food 71/91.
  - tarot 70/77: đang trải bài mà nói "rút toàn lá căng thẳng…" bị hiểu thành thẻ bệnh "Căng thẳng".
  - health 204/230.
- Lỗi đã biết, chưa sửa:
  - "tim quan co mon gan xao… My Dinh" (không dấu) → tư vấn khách cho DN.
  - Đang uống thuốc chống đông + hỏi rau xanh → trả lời ăn uống chung chung.
  - G06-029: hỏi nối về lactose.
  - "Me có tác dụng gì" (gõ trống, dễ nhầm "mẹ").
  - Hỏi bệnh kèm món mà nguồn không nhắc (vd "bà bầu ăn trứng muối") → nên kèm kiến thức phổ thông (`knNote`) như đã làm cho tiểu đường.
- Dược liệu, thực phẩm (`src/lib/lomiFolk.ts`, `lomiNutrients.ts`), quy ước Kir đã chốt 13–14/11:
  - Mỗi câu chỉ **1 dòng** "📌 để tham khảo".
  - Không nêu tên nguồn, trừ khi người dùng hỏi "nguồn đâu".
  - Có liều tham khảo (mục 📏 `dose` + bài thuốc `how`).
  - Mục `kn: true` = kiến thức phổ thông do Claude tổng hợp. Khi hỏi nguồn thì nói thật (`KN_SOURCE`). Lọc ngữ cảnh bằng `KN_CTX` / `KN_PLACE` để không cướp câu kể chuyện hay câu tìm quán.
  - Muốn thêm món, vị thuốc nào thì ưu tiên nguồn chính thống (NIH / NCCIH / MedlinePlus / Mayo / NHS / Long Châu); không có nguồn mới dùng `kn`.
- **Không tối ưu luật cho từng câu của bộ 1.000 câu** (bộ này đã dùng để chỉnh luật). Tự viết thêm khoảng 60 câu mới kiểu chat Việt thật (không dấu, teencode, câu ghép "nhưng / mà", đổi chủ đề giữa chừng) làm **bộ giữ riêng**, đo trước và sau.

## Phần C — Thước đo bắt buộc (chạy từ gốc repo)
1. `npx tsc --noEmit -p tsconfig.app.json`: không lỗi.
2. `npx vitest run --exclude "src/test/tmp/**"`: hiện **2.476 test qua, 3 skip**. Chạy khoảng 12 phút; chạy nền rồi chờ, vì lệnh foreground bị cắt ở 10 phút.
   - Test cũ chỉ được sửa khi nó kiểm hình thức, không được sửa để che lỗi hành vi.
   - Sửa test nào thì ghi lý do vào HANDOFF.
3. `LOMI_PARA=1 LOMI_CONVO=1 npx vitest run src/test/lomiConvoBank.test.tsx src/test/lomiParaphrase.test.tsx`: hiện khoảng **387/400** và **155/160**. Dao động ±2 câu vì Lomi chọn ngẫu nhiên vài câu đáp; so từng câu trượt in ra, không chỉ nhìn điểm.
4. `bash scripts/lomi-audit/rerun.sh`, rồi `python3 -I scripts/lomi-audit/diff_baseline.py`:
   - Chuẩn hiện tại **876/985 = 88,9%** (14/11).
   - **Không được hỏng câu `safety` nào.** Tổng điểm không được giảm.
   - `python3 -I scripts/lomi-audit/fails.py <lớp>` liệt kê câu sai theo lớp.
5. `npx vite build`: sạch.

Công cụ thử Lomi: `src/test/lomiChatHarness` (`chat(turns, {seed})`, `last(turns)`). Test thử nháp đặt ở `src/test/tmp/` (bị loại khỏi bộ test, không commit). Test thật của đợt này đặt file mới, ví dụ `src/test/lomiFable2.test.tsx` / `src/test/lomiRouter.test.tsx`.

## Phần D — Thứ tự đề xuất và bàn giao
1. Đọc CLAUDE.md, project knowledge, prompt kiến trúc cũ. Chạy đủ thước đo một lần để có số gốc.
2. **Phần A** (A3 Chat → A2 Quẹt → A1 Gọi): rà, sửa P0–P1, mỗi cụm sửa thì test + build + commit + push + deploy.
3. **B2** các lỗi nhỏ của Lomi trên `main` (deploy được ngay).
4. **B1** kiến trúc trên nhánh riêng. Đây là việc lớn nhất; làm tới đâu ghi HANDOFF tới đó.
5. Cuối phiên:
   - Cập nhật Lovable project knowledge (giữ dưới 10.000 ký tự, đúng văn phong QUY TẮC #N ngắn gọn) cho những quy tắc mới rút ra.
   - Báo cáo anh bằng tiếng Việt, ngắn:
     - Đã sửa gì ở Gọi / Quẹt / Chat, nói bằng ví dụ người dùng gặp.
     - Lomi đổi gì, số đo trước / sau (tổng, từng lớp, bộ giữ riêng, 2 bộ ChatGPT, số test).
     - Test nào phải sửa và vì sao.
     - Việc tốn credit cần anh duyệt (nếu có).
     - **Checklist thử trên 2 điện thoại thật** cho phần gọi.
     - Việc còn dở (đã ghi HANDOFF).
     - Nhắc **đóng hẳn app rồi mở lại**.
