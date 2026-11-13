# Giao việc: sắp xếp lại kiến trúc chọn câu trả lời của Lomi (iLomi)

Bạn đang làm cho **Kir** (anh), solo dev của **iLomi**, một PWA cộng đồng ở Đà Lạt. Trả lời Kir bằng tiếng Việt, xưng **em**, gọi **anh**. Bạn làm tự động từ đầu tới cuối: đọc → thiết kế → làm → đo → báo cáo. Đây là lượt dùng **duy nhất** của anh với mô hình này, nên hãy làm thật gọn, không mất thời gian khám phá lan man.

## 0. Repo & cách làm việc
- Repo GitHub: `phanlam2593/lienminhliendoanh` (nhánh `main`). Nếu chưa có trong phiên thì add repo rồi clone. Đọc `CLAUDE.md` ở gốc repo trước tiên: đó là luật **bất biến**.
- Lovable project id: `9df4a19e-99e7-413c-9222-1626146f7c63`. Code đẩy lên GitHub `main` thì Lovable tự đồng bộ trong khoảng 90 giây. Production (ilomi.live) chỉ cập nhật khi gọi `deploy_project` của Lovable MCP.
- Commit với `git -c user.name="Kir" -c user.email="phanlam2593@gmail.com"`.
- **KHÔNG** gọi `send_message` của Lovable: tốn credit, và việc này không đụng edge function.
- Sau mỗi lần chạy test, chạy `git checkout supabase/functions/mcp/index.ts package-lock.json` (2 file này hay tự đổi khi cài, không được commit).

## 1. Lomi là gì
Lomi là trợ lý trong app, ở `/tro-ly-ai`. Nó **chạy hoàn toàn trên máy**: không LLM, không gọi API, chỉ có luật và thư viện. Đây là quyết định cố định của anh, không đề xuất đổi sang LLM. Lomi làm 5 việc:
1. Sức khoẻ: hơn 1.000 thẻ bệnh có nguồn trong `src/lib/medkb/*.json`, thuốc ở `lomiDrug*`, dược liệu ở `lomiFolk`. Câu trả lời KHÔNG nêu tên nguồn, trừ khi người dùng hỏi nguồn (`lomiCite`).
2. Tâm sự / tâm lý: `lomiHeart`, `lomiHeartMore`, `lomiTherapy`.
3. Hướng dẫn dùng app: `lomiFaq`.
4. Bói Tarot cho vui: `tarot*`.
5. Tìm quán ở Đà Lạt: `lomiSearch`. Không có công thức nấu ăn.

An toàn luôn đứng đầu: khủng hoảng / tự hại, cấp cứu y khoa (115), bạo lực / hung khí (113). Các lớp này là `lomiSafety`, `lomiUrgent`, `lomiCrisis*` và RULES[0] trong AiAssistant. **Không bao giờ nới lỏng.**

## 2. Vấn đề cần giải
Toàn bộ luồng nằm trong `src/pages/AiAssistant.tsx` (4.686 dòng), hàm `send` từ dòng ~1509. Thứ tự hiện tại:
1. `fixTypos` → `viMixFix` → `restoreVi` (khôi phục dấu) → `senseCanon` (lomiSense RENAME/SYN)
2. Các khối viết lại câu nối, dùng `la` = lời Lomi vừa đáp
3. `repairTurn` / `followUp0`
4. Khoảng **187 nhánh `return`** xếp theo thứ tự, gọi tới khoảng 67 file `src/lib/lomi*.ts` (34.000 dòng)
5. `localReply` → `push`

Nguyên tắc chọn là **"nhánh nào khớp trước thì thắng"**. Gần như mọi lỗi "nói 1 đường hiểu 1 nẻo" đều do một lớp đứng trước giành câu của lớp đúng. Ví dụ đã gặp:
- "A bị giật mắt phải" → mẹo sửa app lag
- "bill quán cà phê 85 nghìn đưa 100 nghìn thối bao nhiêu" → tìm quán cà phê
- "đau dạ dày… cần **theo dõi** dấu hiệu gì" → hướng dẫn theo dõi bạn bè trong app
- chủ quán đau bụng nôn ói → mẹo mở quán
- đang trải bài mà nói "rút toàn lá căng thẳng" → thẻ bệnh "Căng thẳng"

Mỗi lần sửa phải thêm một luật hẹp chặn trước. Cách này đã đưa điểm từ 65% lên 86,7%, nhưng càng thêm càng dễ va nhau.

Đề xuất kiến trúc của đợt kiểm toán (đọc nguyên văn trong `scripts/lomi-audit/BAO_CAO_KIEM_TOAN_LOVABLE.md`, mục F):
1. **Lớp an toàn chạy TRƯỚC mọi lớp, ở một chỗ duy nhất.** Có tín hiệu rủi ro thì cấm nhánh nhắc lại câu và biểu tượng vui; cờ rủi ro mang qua các lượt sau.
2. **Đề cử + trọng tài thay cho "khớp trước thắng".** Mỗi lớp trả về (ý định, độ tin, đoạn chữ làm bằng chứng, nằm ở vế chính hay vế phụ). Trọng tài chọn lớp có bằng chứng ở **vế chính**. Hai lớp sát điểm thì hỏi lại.
3. **Một biểu diễn tiếng Việt duy nhất.** Khôi phục dấu một lần; thống nhất `lomiAccent.normStrict` với `viMatch.V()/VN()`.
4. **Đưa `parseVi` (lomiParse) vào lõi chọn lớp.** Tách mệnh đề (nhưng / mà / thôi bỏ qua / à mà), xác định phạm vi phủ định và chủ thể. Đổi chủ đề thì xoá các cờ mang theo (`medAge`, `tarotBack`, `about`…).
5. **Tách 3 loại "không trả lời được":** mơ hồ → hỏi lại; ngoài phạm vi → nói rõ; thiếu kiến thức → "💡 Dạy Lomi".

## 3. Mục tiêu của lượt này
Đổi **cách chọn lớp**, không đổi **nội dung trả lời**. Cụ thể:
- Làm ít nhất (1) + (2): an toàn đi trước, có trọng tài chấm điểm các ứng viên.
- Làm (3), (4), (5) trong phạm vi còn đủ thời gian và đo được.
- Chuyển dần từng nhóm nhánh sang mô hình "đề cử", **không viết lại toàn bộ một lần**. Nhánh nào chưa chuyển vẫn chạy như cũ qua một lớp "legacy" đặt sau trọng tài, để app luôn chạy được ở mọi bước.
- Gợi ý thứ tự chuyển: an toàn → sức khoẻ (lomiMed / medkb, lomiSymptoms, lomiDrug) → tâm sự → FAQ app → tìm quán → tarot → phần còn lại. Mỗi nhóm chuyển xong thì chạy đủ thước đo ở mục 5 rồi mới sang nhóm sau.
- Có thể tạo file mới, ví dụ `src/lib/lomiRouter.ts` (trọng tài) và `src/lib/lomiCandidates/*`. KHÔNG đổi tên hay xoá file, component, route, bảng DB đang có (CLAUDE.md #5). Hàm cũ thì gói lại để dùng, không xoá.

## 4. Không được đổi
- Nội dung, giọng văn câu trả lời; nguồn y khoa; liều thuốc tham khảo; thẻ medkb.
- Hành vi an toàn: chỉ được chặt hơn, không được lỏng hơn.
- Xưng hô đối xứng (người dùng tự xưng anh / chị / em thì Lomi xưng theo), các nút gợi ý (quick), thẻ quán (places), nút "💡 Dạy Lomi" chỉ hiện khi Lomi không biết.
- Không thêm tính năng mới, không sửa UI.

## 5. Thước đo (bắt buộc, chạy sau mỗi nhóm)
Tất cả chạy từ gốc repo:
1. `npx tsc --noEmit -p tsconfig.app.json`: không lỗi.
2. `npx vitest run --exclude "src/test/tmp/**"`: **2.460 test phải qua hết** (mất ~11 phút; chạy nền rồi chờ). Test cũ chỉ được sửa nếu nó kiểm hình thức (vd chuỗi số "9100000" thành "9.100.000"), không được sửa để che lỗi hành vi. Sửa test nào thì ghi rõ trong báo cáo.
3. `LOMI_PARA=1 LOMI_CONVO=1 npx vitest run src/test/lomiConvoBank.test.tsx src/test/lomiParaphrase.test.tsx`: hai bộ đề ChatGPT. Hiện qua hết; tỉ lệ in ra phải ≥ ~97%.
4. `bash scripts/lomi-audit/rerun.sh`: bộ 1.000 câu kiểm toán (985 câu chấm được, ~10 phút). Chuẩn hiện tại **854/985 = 86,7%**. Theo từng lớp:

   | Lớp | Đúng |
   |---|---|
   | askback | 89/112 |
   | biz | 53/66 |
   | chat | 92/95 |
   | faq | 102/109 |
   | food | 67/91 |
   | health | 198/230 |
   | heart | 169/176 |
   | safety | 25/29 |
   | tarot | 59/77 |

   Sau đó chạy `python3 -I scripts/lomi-audit/diff_baseline.py` để in từng câu bị **hỏng** so với chuẩn. **Không được hỏng câu nào ở lớp `safety`.** Tổng điểm không được giảm. `fails.py <lớp>` liệt kê câu sai theo lớp.

   Lưu ý: bộ 1.000 câu này đã được dùng để chỉnh luật, nên nó nghiêng về những gì đã sửa. Đừng tối ưu luật cho đúng từng câu của bộ này. Hãy tự viết thêm khoảng 60 câu mới (chat kiểu Việt thật: không dấu, teencode, câu ghép "nhưng / mà", đổi chủ đề, chủ thể là người khác) làm bộ giữ riêng, chấm trước và sau khi đổi kiến trúc, rồi báo cả hai con số.
5. `npx vite build`: không lỗi.

Bộ chạy thử hội thoại: `src/test/lomiChatHarness` (`chat(turns, {seed})`, `last(turns)`). Test mới cho kiến trúc thì đặt ở `src/test/lomiRouter.test.tsx`.

## 6. Cách làm & bàn giao
- Làm trên nhánh **`kien-truc-lomi`**. Commit nhỏ sau mỗi nhóm đã qua thước đo, đẩy nhánh lên GitHub thường xuyên để không mất việc nếu phiên bị cắt.
- Ghi tiến độ liên tục vào `scripts/lomi-audit/HANDOFF_KIEN_TRUC.md`: nhóm nào đã chuyển, số đo sau mỗi bước, quyết định thiết kế, việc còn dở. Một phiên khác (mô hình nhẹ hơn) sẽ đọc file này để làm tiếp, nên viết sao cho đọc là hiểu.
- **Khi nào được merge vào `main` và deploy:** chỉ khi đủ cả 4 điều sau:
  - tất cả thước đo ở mục 5 đều đạt
  - bộ 1.000 câu ≥ 86,7% và 0 câu safety bị hỏng
  - bộ giữ riêng không giảm
  - build sạch

  Khi đó: merge nhánh vào main, push, chờ khoảng 90 giây, gọi `get_project` kiểm tra `latest_commit_sha` khớp, rồi `deploy_project`. Chưa đạt thì **để nguyên trên nhánh, không merge**, và báo anh lý do.
- Báo cáo cuối cho anh (tiếng Việt, ngắn, dễ hiểu, anh không cần đọc code):
  - Đã đổi gì, kiến trúc mới chạy ra sao, giải thích 3–4 câu bằng ví dụ thật.
  - Số đo trước / sau: tổng điểm và từng lớp, bộ giữ riêng, 2 bộ ChatGPT, số test.
  - Test nào phải sửa và vì sao.
  - Rủi ro, và những gì còn dở trong HANDOFF.
  - Nếu đã deploy, nhắc anh **đóng hẳn app rồi mở lại**.
