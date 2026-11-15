# HANDOFF — phiên Fable 2 (14/11/2026)

Việc giao: `scripts/lomi-audit/PROMPT_FABLE_TOAN_DIEN.md`. File này ghi **đã làm gì, tìm ra gì, còn dở gì** để phiên sau đọc là làm tiếp được.
Phần kiến trúc Lomi ghi riêng ở `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`.

## 0. Số gốc đo đầu phiên (commit 400e8a1)

| Thước đo | Số gốc |
|---|---|
| `tsc` | sạch |
| `vitest` (trừ tmp) | 2.476 qua, 3 skip |
| Bộ ChatGPT | paraphrase 386/400, convo 155/160 |
| Bộ 1.000 câu | 876/985 = 88,9% (safety 26/29) |
| Bộ giữ riêng mới (65 câu) | 61/65 |
| `vite build` | sạch |

## 1. Phần A — Gọi · Quẹt · Chat (đã deploy, commit b3eb23b)

Migration: `supabase/migrations/20261114150000_fable2_chat_quet_guards.sql` — **đã chạy trên DB thật** bằng `query_database`,
đã thử bằng 1 khối `DO … RAISE EXCEPTION` (tự rollback) trên 2 tài khoản `loadtest_`: kết quả đúng hết. Không nới RLS nào.

### A2 Quẹt — lỗi tìm được và đã sửa

| Mức | Lỗi (người dùng gặp) | Nguyên nhân | Sửa |
|---|---|---|---|
| P0 | Bỏ qua 1 người, 2 hôm sau họ hiện lại, mình bấm thích, họ cũng thích mình → **không bao giờ ra Kết nối**. Tương tự sau khi huỷ kết nối rồi thích lại. | Client `upsert` → dòng cũ còn nên đi nhánh UPDATE; trigger `handle_swipe_match` chỉ chạy `AFTER INSERT`. | Trigger chạy `AFTER INSERT OR UPDATE OF action`; bỏ qua khi `OLD.action='like'`; không tạo Kết nối giữa 2 người đã chặn nhau; chỉ bắn thông báo khi thật sự có match mới. |
| P1 | Mục có nhiều bài (Tìm việc 146, Trao đổi 141…): quẹt hết 50 bài mới nhất là báo "hết", dù còn gần 100 bài cũ hơn. | `loadCandidates` lấy `limit(50)` rồi mới lọc bài đã quẹt. | Nạp theo trang (`range`), tra lượt đã quẹt theo đúng bài của trang, tự nạp thêm khi còn ≤3 thẻ. Bỏ luôn trần 1.000 dòng của `swipe_actions`. |
| P1 | Thích nhầm 1 người đúng lúc ra Kết nối, bấm **Hoàn tác** → lượt thích của *người kia* bị đổi thành "bỏ qua" 48 giờ (họ mất lượt thích, không thấy mình 2 ngày). | Client tự xoá `swipe_matches` → trigger unmatch đổi cả 2 lượt thành pass. | RPC mới `undo_swipe_action(_need_id)`: xoá lượt của mình, gỡ match, **trả lượt thích của người kia về như cũ**. |
| P1 | Luật #42 "bỏ qua hiện lại khi chủ bài sửa" không chạy. | `swipe_needs.updated_at` chưa từng được cập nhật (0/445 bài). | Trigger `touch_swipe_need_updated_at` — chỉ khi đổi NỘI DUNG (bật/tắt không tính). |
| P1 | Có Kết nối nhưng không hiện màn chúc mừng khi mình có ≥2 nhu cầu cùng mục. | Client đoán "nhu cầu của mình" = cái đầu tiên trong mục. | Tìm match theo (mình, nhu cầu vừa thích). |
| P2 | Bật/tắt, xoá nhu cầu lỗi thì im lặng. Vào thẳng màn quẹt Làm quen (mở lại trang) thì bộ lọc 2 chiều không áp. | — | Báo lỗi; nạp nhu cầu của mình trước khi nạp ứng viên. |

Chưa sửa (ghi lại): gọi thẳng API `UPDATE swipe_actions` (không qua app) né được giới hạn 10 lượt/ngày của người chưa là thành viên —
trigger giới hạn chỉ `BEFORE INSERT`. App không làm vậy (dùng upsert, có đi qua BEFORE INSERT). Muốn chốt hẳn: thêm kiểm trong 1 trigger
`BEFORE UPDATE OF action` nhưng phải tránh đếm 2 lần với upsert.

### A3 Chat — lỗi tìm được và đã sửa

| Mức | Lỗi | Sửa |
|---|---|---|
| P0 (bảo mật) | Policy `messages update receiver` cho người **nhận** sửa mọi cột → sửa được **nội dung tin người khác gửi**; người gửi đổi được `receiver_id`, `type`; ai cũng tự gửi được tin `type='broadcast'` (giả tin Ban quản trị). | Trigger `guard_message_columns`: người nhận chỉ đổi `is_read/read_at`, người gửi chỉ đổi `content/edited_at`; người thường gửi `broadcast` → thành `text`. |
| P1 (bảo mật) | Người thường tự ghim tin của mình ở Cộng đồng (`is_pinned`), đổi `created_at` để đẩy tin lên. | Trigger `guard_community_message_columns`. |
| P1 | Để app nằm nền rồi quay lại đoạn chat: tin đến trong lúc đó **bị đánh dấu đã xem** (mất chấm đỏ, bên kia thấy "Đã xem") nhưng **không hiện** trên màn hình tới khi thoát ra vào lại. | Quay lại app → nạp lại đoạn chat rồi mới đánh dấu đã đọc. Áp cho chat 1-1, hộp thư, chat nhóm, Cộng đồng. Realtime đến lúc app ẩn thì không đánh dấu đã đọc. |
| P1 | Đối phương xoá 1 tin, bên mình vẫn thấy tới khi vào lại (cả 1-1 lẫn nhóm). | Sự kiện DELETE của realtime không lọc theo cột được (bảng chỉ gửi khoá chính) → bộ lọc cũ không bao giờ khớp. Giờ nghe không lọc, đối chiếu theo id. Cảm xúc bị gỡ cũng nạp lại. |
| P2 | Bị chặn mà gửi tin → hiện nguyên văn lỗi tiếng Anh "new row violates row-level security policy". | "Không gửi được tin cho người này". |
| P2 | Xoá đoạn chat / rời nhóm rồi bấm Back → quay lại đúng chỗ vừa xoá (#56). | `replace: true`. |
| P2 | Mở chat với chính mình vẫn có nút Gọi. Dòng cuộc gọi "ringing" bị bỏ dở hiện là "Máy đang bận". | Ẩn nút; ringing quá hạn hiện như cuộc nhỡ. |

**Cần anh quyết (chưa làm):** che từ tục (`mask_profanity`) cho `messages` / `group_messages` — prompt dặn hỏi trước.

### A1 Gọi — lỗi tìm được và đã sửa (rà tĩnh + test logic, CHƯA gọi thật được)

Logic tách ra `src/lib/callLogic.ts`, 17 test ở `src/test/callLogic.test.ts`.

| Mức | Lỗi | Sửa |
|---|---|---|
| P0 | **Người đã bị chặn vẫn gọi được, máy vẫn reo.** Tín hiệu gọi đi qua kênh broadcast; RLS bảng `calls` chỉ chặn dòng nhật ký. | Người gọi: ghi dòng `ringing` vào DB **trước**, RLS từ chối thì dừng ("Không gọi được cho người này"). Người nhận: bỏ qua im lặng offer của người mình đã chặn (có kiểm lại DB phòng danh sách cũ). |
| P1 | **Glare (#21): hai người bấm gọi nhau cùng lúc → cả hai kẹt "đang kết nối" rồi thất bại.** Đọc code thấy cả hai bên cùng "nhường", không ai còn giữ offer. | Phân vai cố định theo id: id nhỏ giữ vai người gọi và **gửi lại offer** (kèm ICE đã gom), id lớn nhường. Trường hợp "Nghe qua đường trễ" (cùng callId) giữ như cũ. |
| P1 | Bấm Gọi rồi bấm Kết thúc ngay (đang xin mic / lấy TURN) → máy bên kia vẫn reo "ma" 30 giây. | Sau mỗi bước chờ kiểm lại cuộc gọi còn sống không (`stillSameCall`). |
| P1 | Người gọi cúp máy đúng lúc mình vừa bấm Nghe → màn hình mình kẹt "00:00 đã kết nối". | Cùng cách trên, phía người nghe. |
| P1 | Bấm Gọi / Nghe 2 lần nhanh → 2 kết nối chồng nhau. | Chốt `startingRef` / `acceptingRef`. |
| P2 | Đóng tab giữa cuộc gọi: bên kia chờ ~30 giây mới tự rớt. | `pagehide` → gửi "end" + ghi nhật ký. |
| P2 | Máy reo hết giờ không ai bấm → người gọi thấy "Đối phương đã từ chối". | Báo "Không có phản hồi", ghi là nhỡ. |

Không sửa được trên web: loa ngoài Android (#26). Push `call_ringing`: mở `/tin-nhan/<người gọi>` → vào app là `checkPendingRinging` bật màn Nghe/Từ chối (đọc code thấy đúng; cần thử máy thật). Lưu ý: nút Gọi chỉ cho gọi khi đối phương **đang online** (presence), nên "gọi khi app đã đóng hẳn" thực tế chỉ xảy ra khi app vừa bị đưa xuống nền.

### Checklist thử trên 2 điện thoại thật (máy A và máy B, 2 tài khoản khác nhau; cả hai đóng hẳn app rồi mở lại trước khi thử)

1. **Gọi thường:** A gọi thoại B → B reo → B bấm Nghe → nói 10 giây, hai bên nghe rõ → A cúp. Vào chat: cả hai thấy bong bóng "Cuộc gọi thoại · X giây".
2. **Gọi video + đổi camera:** A gọi video B → B nghe → A bấm đổi camera 2 lần → B vẫn thấy hình.
3. **Từ chối:** A gọi → B bấm Từ chối → A thấy "Đối phương đã từ chối". Nhật ký: "Đã từ chối".
4. **Không bắt máy:** A gọi → B để reo hết 30 giây → A thấy "**Không có phản hồi**" (không phải "từ chối"). B có thông báo cuộc gọi nhỡ.
5. **Huỷ sớm:** A bấm Gọi rồi bấm Kết thúc **trong 1 giây** → máy B **không được reo** (hoặc tắt ngay), không kẹt màn hình.
6. **Cúp lúc đang nghe:** A gọi → ngay lúc B bấm Nghe thì A cúp → B phải về màn hình thường, **không kẹt "00:00"**.
7. **Gọi nhau cùng lúc (glare):** A và B đếm 1-2-3 cùng bấm gọi nhau → phải **nối được với nhau** trong vài giây, nghe được tiếng.
8. **Chặn:** B chặn A → A bấm gọi B → A thấy "Không gọi được cho người này", **máy B không reo**. B bỏ chặn → A gọi lại → B reo bình thường.
9. **Bấm đúp:** A bấm nút Gọi 2 lần thật nhanh → chỉ 1 cuộc gọi. B bấm Nghe 2 lần nhanh → vẫn nói chuyện bình thường.
10. **App để nền:** B bấm Home (không tắt app) → A gọi → B có thông báo đẩy → bấm vào → hiện màn Nghe/Từ chối → Nghe được.
11. **Rớt mạng:** đang nói, A tắt wifi/4G → trong ~30 giây B thấy báo kết thúc; nhật ký vẫn ghi thời lượng.

Bước nào sai: ghi lại bước số mấy + chụp màn hình 2 máy.

## 2. Phần B2 — Lomi, lỗi nhỏ (xem trạng thái deploy ở mục 4)

Test mới: `src/test/lomiFable2.test.tsx` (10 test).

| Lỗi | Trạng thái |
|---|---|
| Vừa trải bài mà nói "rút toàn lá căng thẳng…" → thẻ bệnh "Căng thẳng" | **Sửa.** Bản câu trong bộ 1.000 (G07-077) vốn đã qua từ 14/11; biến thể khác ("rút toàn lá căng thẳng thế này thì có sao không", "sao mấy lá này nặng nề quá") vẫn hỏng → mở rộng luật "lá tốt / xấu" trong `followUp0`. |
| Đang uống thuốc chống đông + hỏi rau xanh → trả lời chung chung | **Sửa** (`lomiDrug.ts`): dùng đúng mục ăn uống của warfarin (nguồn NHS đã có sẵn trong `lomiDrugData`), nói rõ thuốc chống đông khác chưa có nguồn. |
| Hỏi bệnh kèm món nguồn không nhắc ("bà bầu ăn trứng muối") | **Sửa** (`knNote` trong `lomiFolk.ts`): mang thai → kèm ý phổ thông nhắc bầu/thai, không có thì kèm phần lưu ý chung của món. |
| "bố em uống thuốc loãng máu, ăn cải bó xôi có sao không" | **Chưa.** Lớp "món này có lợi gì" khớp trước lớp thuốc → đáp dinh dưỡng rau xanh, thiếu cảnh báo vitamin K. Đúng kiểu "khớp trước thắng" → để trọng tài lo (ứng viên `drug-interact` ở vế chính phải thắng lớp món ăn). |
| "tim quan co mon gan xao… My Dinh" (không dấu) → tư vấn khách cho DN | **Chưa.** Đã loại trừ `ownerBizAsk` (không khớp). Bản có dấu ra tìm quán đúng. Bản không dấu được đoán dấu thành "tìm quán có món gan xao ở Mỹ Định" rồi rơi vào 1 nhánh kinh doanh khác (2821–2976 hoặc 3835 trong `AiAssistant.tsx`) — chưa lần ra nhánh nào. |
| G06-029: "Em bị đau bụng sau khi uống sữa." → "Cái đó có liên quan đến lactose không?" | **Chưa.** Vẫn ra "chưa có kiến thức". Câu hỏi thẳng "có phải không dung nạp lactose không" thì đúng → lỗi ở chỗ nối đại từ "cái đó" + tên bệnh. |
| "Me có tác dụng gì" | **Chưa.** `findFolk("Me có tác dụng gì")` trả đúng mục `kn-me`, bộ đoán dấu ở chế độ gõ-có-dấu cũng giữ nguyên "Me" → lỗi nằm ở 1 nhánh đứng trước lớp dược liệu (nghi lớp đọc "me" = "mẹ"). "quả me có tác dụng gì" thì đúng. |

Lớp yếu (askback, food, health): **không** chỉnh luật theo từng câu của bộ 1.000 (đúng dặn dò). Hướng xử lý là trọng tài + hỏi lại khi sát điểm — xem HANDOFF kiến trúc.

## 3. Bộ giữ riêng

`scripts/lomi-audit/holdout_fable2.json` — 65 câu em tự viết (không dấu, teencode, câu ghép "nhưng / mà", đổi chủ đề, chủ thể là người khác),
viết **trước** khi sửa Lomi, không dùng để chỉnh luật. Chạy: `bash scripts/lomi-audit/holdout.sh` (~1 phút). Số gốc 61/65. 4 câu trượt:
`T05` ("thi rớt đại học rồi, ko dám về nhà" → hỏi an toàn ở nhà; chấp nhận được), `F02` ("điểm tích lũy dùng để làm gì" → không hiểu),
`R04` (đang chờ chủ đề bói, đáp "về chuyện tiền bạc" → bài tâm sự về tiền), `A05` ("giúp e với" → hỏi lại đúng, bộ chấm xếp nhầm lớp).

## 4. Trạng thái deploy / số đo cuối phiên

Đo lại 15/11/2026 trên trạng thái cuối (Phần A + B2 + bước 1 kiến trúc), cùng một lượt:

| Thước đo | Gốc | Cuối phiên |
|---|---|---|
| `tsc`, `vite build` | sạch | sạch |
| `vitest` | 2.476 qua | 2.526 qua, 0 trượt |
| paraphrase / convo | 386/400 · 155/160 | 386/400 · 155/160 |
| Bộ 1.000 câu | 876/985 | 876/985 — sửa được 1, hỏng 0; safety 26/29 |
| Bộ giữ riêng | 61/65 | 61/65 |

- Phần A: deploy 14/11 (commit b3eb23b). Migration đã chạy trên DB thật.
- B2 + B1: gộp vào `main` và deploy 15/11. Chi tiết B1: `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`.
- **Chưa kiểm được bundle JS thật trên ilomi.live** (quy tắc #17): máy ảo của phiên không ra được ngoài tới ilomi.live.
  Cần anh đóng hẳn app, mở lại, rồi thử checklist ở mục 1.
- Điểm bộ 1.000 **không tăng** ở phiên này: 3 sửa nhỏ của B2 là biến thể ngoài bộ; bước 1 kiến trúc là lưới an toàn, chưa đổi lớp nào.
  Mục tiêu ≥ 93% còn nguyên — đường đi là các bước 2–4 trong HANDOFF kiến trúc.
