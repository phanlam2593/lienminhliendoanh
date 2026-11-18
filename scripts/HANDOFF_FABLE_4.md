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
- **(c) Tin nhắn riêng / chat nhóm — XONG (18/11 chiều, Kir bảo làm tiếp).** Migration `20261118150000_fable4_chat_media_private.sql`.
  Bucket riêng tư `chat`: `<người gửi>/dm/<người nhận>/…`, `<người gửi>/g/<groupId>/…`. Đọc: người gửi, người nhận, thành viên nhóm, admin
  (`chat_media_readable`); ghi: chỉ thư mục của mình, nhóm phải là thành viên (`chat_media_writable`). Messages.tsx (ảnh + tin thoại),
  GroupChat.tsx (ảnh) tải lên đây. Ảnh / tin thoại CŨ để nguyên ở `uploads` / `voice` (đã chặn liệt kê). Kênh Cộng đồng giữ `uploads` (công khai
  trong app). `get_usage_stats` đếm thêm kho `chat`. Thử loadtest_: người ngoài đọc 0 file; không ghi vào thư mục người khác / nhóm ngoài.
  Chưa làm: chép ảnh cũ sang kho mới (không cần gấp — không ai liệt kê được, phải biết đúng đường dẫn ngẫu nhiên).

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
## 7. Lomi bước 3–4 — bước 4 XONG, bước 3 chưa làm (có lý do)
Chi tiết: `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md` mục 6.
- Đo trước khi làm: câu ghép "nhưng / mà" gần như không có trong danh sách trượt → bước 3 không kéo điểm, để sau.
- Lớp food: ~12/20 câu trượt là **hỏi nấu ăn ở nhà** — Lomi đáp đúng luật #71 (không nấu ăn) nhưng bộ chấm đòi "food". **Cần anh quyết.**
- Bước 4: Lomi bí mà câu có cụm chỉ trỏ tới thứ chưa nói ("cho tui xin chổ đó với", "em bị vậyy từ hôm qua") → hỏi lại thay vì "chưa biết".

| Thước đo | Gốc | Cuối phiên |
|---|---|---|
| vitest | 2.532 | 2.539 qua, 0 trượt |
| paraphrase / convo | 387 · 155 | 389/400 · 155/160 |
| Bộ 1.000 câu | 876/985 | 877/985 — sửa 2, hỏng 0; safety 26/29 |
| Bộ giữ riêng | 61/65 | 61/65 |

## Deploy
- 18/11 ~14:30: **tất cả đã lên thật** — bundle `index-DewZ_M1n.js` trên ilomi.live có admin-action, kho chat riêng tư, Lomi bước 4.
- Lưu ý: Lovable publish **trễ** (lần này ~2 giờ, 15/11 cũng vậy). deploy_project trả "pending" không có nghĩa đã lên — kiểm bundle thật
  (quy tắc #17); chưa thấy thì chờ, đừng tưởng hỏng.
- Edge function: `admin-action`, `admin-cleanup-orphans` đã chạy (401 khi thiếu đăng nhập).

## Credit đã tiêu
1 lần `send_message` (Lovable báo 0,6 credit; con số này thường báo thấp hơn thực tế — anh xem số dư trong Lovable).

## 8. Lomi — 4 nút chủ đề (18/11 chiều, anh Kir giao "em quyết rồi làm luôn")
Quyết định: **gợi ý mềm**, không khoá cứng; gộp "tâm lý" + "tâm sự" (trong Lomi là cùng một lớp); thêm "Khác" cho tarot / tìm quán / kinh doanh.
- `src/lib/lomiTab.ts` (danh sách nút, nhớ lựa chọn trên máy) + hàng nút trên ô nhập ở `AiAssistant.tsx` (chạm lại = bỏ chọn = tự do).
- **Sức khoẻ:** (1) `heartThemeOf` / `heartStart` nhường khi câu nhắc bệnh có trong kho; (2) câu KỂ có nhắc bệnh (không phải câu hỏi, không có rủi ro,
  không đang nói tiếp bệnh đó) → thẻ kiến thức ngay sau lớp an toàn (`routed: "tab-health"`).
- **Tâm sự & tâm lý:** `parseMedAsk` nhường khi câu có chủ đề cảm xúc mà không hỏi kiến thức (là gì / triệu chứng / thuốc / khám…).
- **Hỏi về app:** Lomi bí → gợi ý câu hướng dẫn app gần nhất (`routed: "tab-app"`).
- An toàn không đi qua các hàm này → luôn chạy trước. Test: `src/test/lomiTab.test.tsx`; khung giả lập nhận `{ tab }`.
- Đo: **không chọn tab 877/985 (y như trước, hỏng 0)**; **chọn đúng tab 882/985** (sức khoẻ 204→209) — `bash scripts/lomi-audit/rerun_tab.sh`.
  Tab không giúp được lớp food/askback (đó là chuyện nấu ăn #71 và câu mơ hồ).
- Ghi chú đo: bộ paraphrase không cố định ngẫu nhiên — 2 câu "stress" chấm theo chữ trong câu đáp ngẫu nhiên nên 387 ↔ 389 dao động, không phải lỗi.
- Gợi ý phiên sau: xem số người bấm từng nút (chưa ghi lại — có thể ghi vào `lomi_topic_stats`) trước khi đầu tư thêm cho tab.

## 9. Sửa hiểu lầm từ bộ 1.000 câu (18/11, sau 4 nút chủ đề)

Đo: bộ 1.000 câu **886/985** (trước 877), so mốc gốc: sửa được 11, hỏng 0 · test tự động 2.560 qua · giữ riêng 61/65 · paraphrase 386/400 (dao động ngẫu nhiên) · hội thoại 155/160.
Test chặn tái phát: `src/test/lomiFix1118.test.tsx`.

| Câu | Trước | Sau | Sửa ở |
|---|---|---|---|
| "tôi **cảm nắng** bạn cùng lớp, làm sao mở lời" | thẻ sơ cứu Say nắng / Cảm lạnh; không dấu → "app trục trặc" | lời khuyên bắt chuyện | lomiMed (CRUSH_CUE, "nắng" sau "cảm"), lomiTrap, lomiMemory ("bị cảm nắng cô bạn" ≠ ốm), lomiHeart ("say nắng anh ấy" = crush), AiAssistant (viết lại câu say nắng) |
| "đi ngoài trời bị cảm nắng chóng mặt" | an ủi chung chung | thẻ Say nắng | AiAssistant |
| "người yêu thả tim cho người khác mà ít quan tâm" (không dấu) | tìm quán | tâm sự | lomiSearch (bỏ "tha tim", "quan tam"… trước khi xét) |
| "chị cần **chuẩn bị gì**" | "app bị gì" → trục trặc | bài đăng ký tài xế | lomiUnderstand |
| "đang chạy giao hàng… muốn đăng ký làm tài xế" | tìm dịch vụ giao hàng | bài tài xế | lomiSearch ("tìm hiểu" ≠ tìm), lomiFaq từ khoá |
| "Nó chứa tối đa bao nhiêu người?" sau bài nhóm chat | "chưa có hướng dẫn" | "Mỗi nhóm tối đa 50 người" | AiAssistant (câu hỏi số lượng ≤12 chữ cũng soi câu trả lời trước) |
| "[đang tạo nhóm chat] thêm 60 người có được ko" | "chưa được học" | "Chưa được đâu — tối đa 50 người" | lomiFaq.answerFromPrev (so con số), AiAssistant `faq-ctx` |
| "[Ba mình muốn gọi ô tô bằng mục Đưa đón] trả tiền mặt được chứ" | tâm sự gia đình | trả tiền mặt cho tài xế | AiAssistant (câu nói Ý ĐỊNH dùng app = hỏi app; `faq-ctx`) |
| "cần bằng lái không" sau bài tài xế | nhảy sang Đăng ký tài khoản | câu "có thể thêm… bằng lái" | AiAssistant |
| "gửi hồ sơ doanh nghiệp rồi ai duyệt" | gợi ý lạc đề | bài Đăng doanh nghiệp (Ban quản trị duyệt) | lomiFaq từ khoá |
| "trải ba lá đọc theo thứ tự nào", "dùng ba lá được chứ", "[vừa rút trải bài] Cái đó…" | rút bài luôn / "chưa rõ bạn nói gì" | giải thích | lomiRescue.tarotHowto (thêm ý số lá), AiAssistant `tarot-howto` |

Lưu ý an toàn: nhánh `faq-ctx` (hiểu câu cụt theo câu kể trước) chỉ chạy khi câu trước nhắc rõ một phần của app, không có tín hiệu khủng hoảng / cấp cứu, và Lomi vừa đáp không phải lời an toàn / tâm sự / sức khoẻ — test QA V8 "bạn nói muốn chết → không biết làm sao" từng bắt lỗi này, nay đã qua.
Không thêm câu hỏi đáp mới vào FAQS (thêm sẽ phải dựng lại anchors.json của edge function lomi-understand → phải deploy, tốn credit).

## 10. Sức khoẻ: đúng bài thay vì tâm sự / tarot (18/11 tối)

Đo: bộ 1.000 câu **891/985** (sức khoẻ 204 → 210), so mốc gốc sửa 16 / hỏng 0 · test 2.566 qua · giữ riêng 61/65 · paraphrase 388/400 · hội thoại 155/160.

- **Dấu hiệu rối loạn ăn uống đi trước mọi lớp** (AiAssistant, sau quét an toàn): "ăn xong mình hay móc họng vì sợ béo" trước bị bộ chọn món đọc thành "A hay B" → "chọn xong mình nha 😋"; "chán ăn, ăn vô là muốn nôn vì sợ mập" ra thẻ Buồn nôn. Nay → mạch tâm sự "eating" (khuyên gặp bác sĩ / chuyên gia, không số liệu).
- "đi bơi xong đau tai" (cả "di boi" không dấu, trước bị hiểu là đi bói) → Viêm tai ngoài (lomiMed).
- "bé NHÀ EM / con CỦA TÔI …" — bỏ phần sở hữu khi dò tên thẻ; thêm tên gọi cho Biếng ăn ở trẻ, Đau gối, Không dung nạp lactose, Viêm tai ngoài (thêm ở CUỐI danh sách tên → câu mẫu máy chủ không đổi). "Bé chán ăn" không còn vào tâm sự rối loạn ăn uống (chủ đề đó dành cho người lớn tự kể).
- lomiHealthFacts thêm 3 mục có nguồn NHS: **tăng cân lành mạnh** (Healthy ways to gain weight, 28/03/2023), **sụt cân dù không cố giảm → nên đi khám**, **lá cây / thuốc nam khi đang uống thuốc bác sĩ** (Herbal medicines, 01/05/2026). Mục "weight" cũ không còn bắt câu tăng cân.
- Câu kể dài về thuốc chống đông + rau xanh (>22 chữ) nay vẫn được lớp thuốc xét (tới 32 chữ).
- lomiReplyGate: khi chữ gõ không trùng tên thẻ ("bé nhà em không chịu ăn") dùng tên chính của thẻ.

Ghi chú kiểm deploy: fetch('/') từ trang đang mở bị service worker trả index.html cũ → luôn kiểm bằng cách điều hướng hẳn tới trang rồi đọc document.scripts.
