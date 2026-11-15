# HANDOFF — kiến trúc chọn lớp mới của Lomi (nhánh `kien-truc-lomi`)

Việc giao: `PROMPT_FABLE_KIEN_TRUC.md` (+ điều chỉnh trong `PROMPT_FABLE_TOAN_DIEN.md`, mục B1).
Phiên Fable 2 (14/11/2026) làm **bước 1**. File này để phiên sau (mô hình nhẹ hơn cũng được) đọc là làm tiếp.

## 1. Hiện trạng trước khi đổi (đã đọc code)

- `AiAssistant.send()` dài ~290 KB, ~190 nhánh `return localReply(...)`, "nhánh nào khớp trước thì thắng".
- Lớp an toàn nằm **rải rác**: cờ gộp `danger0` (dòng ~1739) + khối bị nhốt/bị đánh sớm (~1741) + khối bạo lực (~2402) + khối cấp cứu
  (~2443) + khối "0) ý định tự hại" (~2654). Giữa 1739 và 2654 có ~900 dòng nhánh; nhánh nào muốn nhường thì phải tự viết
  `!crisisReply(q, lang)` / `!danger0`. Quên một chỗ = một câu nguy hiểm bị nhánh khác giành.
- **Mọi** câu đáp đều đi qua **một cửa ra**: `localReply(asked, reply)` (dòng ~1302). Ở đó đã có sẵn "chốt cuối" `replyMismatch`.

## 2. Thiết kế đã chọn — và vì sao

Không thể gom ứng viên bằng cách "chạy hết 190 nhánh rồi chấm": mỗi nhánh `return` ngay và có tác dụng phụ (push tin, ghi nhớ…).
Viết lại cả hàm một lần thì trái yêu cầu "chuyển dần, app luôn chạy được". Nên:

**Trọng tài đặt ở CỬA RA** (`localReply`), so *câu đáp của lớp legacy* (nhánh khớp trước) với *ứng viên do các lớp đã chuyển đề cử*:

```
send():  sửa lỗi gõ → ①riskScan() [một chỗ, TRƯỚC mọi nhánh] → … 190 nhánh legacy … → localReply(reply)
localReply():  ứng viên = safetyCandidates(risk) (+ các nhóm sẽ chuyển sau)
               verdict  = arbitrate(legacy, ứng viên)
               verdict.winner ? thay câu đáp : giữ legacy
               gắn cờ risk (mang qua 2 lượt), bỏ sticker khi còn cờ
```

Tất cả phần thuần nằm ở **`src/lib/lomiRouter.ts`** (không React, không Supabase), test ở `src/test/lomiRouter.test.tsx` (23 test):

| Hàm | Việc |
|---|---|
| `riskScan({q, raw, lang, en, forceAi, harm, red})` | MỘT chỗ đọc tín hiệu rủi ro: `crisis` (đã trừ câu chối), `denial`, `checkIn`, `urgent`, `harm`, `red`, `any`. |
| `safetyCandidates(risk, raw)` | Ứng viên của lớp an toàn. Hiện mới có `crisis` (độ tin 0,97). |
| `splitClauses(text)` / `clauseOf(text, evidence)` | Tách vế: vế CHÍNH = sau từ chuyển ý cuối ("nhưng", "à mà", "thôi kệ", "thôi bỏ qua", "mà" sau dấu phẩy). So trên chữ bỏ dấu. |
| `arbitrate(legacy, noms)` | (1) an toàn ≥0,9 thắng legacy chưa phải lời an toàn; (2) ứng viên ở vế chính thắng legacy ở vế phụ, cùng vế phải hơn 0,25; (3) sát điểm <0,1 khác lớp → `askBack: true`. |
| `isSafetyReply(reply)` | Câu đáp đã là lời an toàn chưa (đường dây nóng, 113/115/111, 🚨, `harm`). |
| `nextRisk(now, prev)` | Cờ `risk {kind, age}` trên tin Lomi, mang qua `RISK_CARRY_TURNS = 2` lượt. |

Đã nối vào `AiAssistant.tsx` (4 chỗ, tìm chữ `14/11 (kiến trúc mới)`):
1. `riskRef` — kết quả quét của lượt đang xử lý; xoá đầu mỗi `send()`.
2. Quét lần 1 ngay sau khi sửa lỗi gõ (trước mọi nhánh); quét lần 2 ở chỗ tính `danger0` trên câu đã chuẩn hoá (có thêm `harm`, `red`).
   `danger0` **giữ nguyên biểu thức cũ** (không đổi hành vi các nhánh đang dùng nó).
3. Trọng tài trong `localReply`, ngay trước `replyMismatch`.
4. `Msg` có thêm `risk`, `routed` ("safety-first" khi trọng tài thay câu đáp), `riskMiss` (chỉ để đo).

**Đã chuyển:** nhóm an toàn — phần *ý định tự hại*. Từ nay không nhánh nào (kể cả nhánh thêm sau này) giành được một câu nói thẳng ý định tự hại:
legacy đáp gì khác lời an toàn → lời hỗ trợ khủng hoảng thay vào. Khối "0)" cũ vẫn còn nguyên (đang là nơi đáp trong đa số trường hợp);
trọng tài là lưới chắn cuối. An toàn chỉ chặt hơn.

**Mới ĐO, chưa chặn:** cấp cứu / bạo lực / dấu hiệu đỏ. Lượt có các tín hiệu này mà câu đáp legacy chưa phải lời an toàn → gắn `riskMiss`.
Lý do chưa chặn: lời đáp của các nhóm này còn nằm trong khối legacy (2402, 2443), chưa có hàm thuần để trọng tài gọi; và `red`
(dấu hiệu đỏ) nhiều khi lớp sức khoẻ đáp đúng mà không cần chữ "115". Số `riskMiss` đo được ở bộ 1.000 câu: xem mục 4.

## 3. Việc tiếp theo (theo thứ tự)

1. **An toàn — cấp cứu & bạo lực.** Tách phần dựng lời đáp của khối 2443 (`urgentOf` → text) và 2402 (`harmReply`) thành hàm thuần
   `urgentReplyOf(raw)` / `harmReplyOf(raw, frame, ctx)`; thêm vào `safetyCandidates`; xem danh sách `riskMiss` (mục 4) để quyết
   ngưỡng; rồi bật chặn như `crisis`. Sau đó xoá dần các `!crisisReply(q, lang)` lặp trong từng nhánh (không gấp).
2. **Sức khoẻ (thuốc trước).** Ứng viên `drug-interact` từ `drugAsk(raw)` (kind "interact"), bằng chứng = tên thuốc/nhóm thuốc.
   Ca kiểm: "bố em uống thuốc loãng máu, ăn cải bó xôi có sao không" hiện ra thẻ dinh dưỡng rau xanh (lớp món ăn khớp trước).
   Muốn làm được phải cho legacy khai `layer` thật: thêm hàm `layerOf(reply)` (chép logic `src/test/vibench/vibench.ts → classify`)
   và `clause` của legacy = `clauseOf(raw, bằng chứng của nhánh đó)` — nhánh nào chưa khai bằng chứng thì coi là "main", độ tin 0,6.
3. **Tìm quán ↔ sức khoẻ ↔ tâm sự trong câu ghép.** Ứng viên `search` từ `detectSearch(q)`, `health` từ `findMedTopicId` / `redFlagsIn`,
   mỗi cái kèm `clauseOf`. Luật (2) của trọng tài xử lý "tìm quán cà phê nhưng đang đau bụng dữ dội" (vế chính là sức khoẻ).
4. **Hỏi lại khi sát điểm** (`askBack`) — lớp askback đang 89/112. Bật sau khi đã có ≥3 nhóm đề cử, nếu không sẽ hỏi lại quá nhiều.
5. **Đổi chủ đề thì xoá cờ mang theo** (`medAge`, `tarotBack`, `about`) — làm trong `localReply` khi `splitClauses(raw).marker` là
   "thôi bỏ qua / à mà thôi / quên đi" và lớp thắng khác lớp lượt trước. Ca kiểm: bộ giữ riêng `R04`, `D06`, `H08`.
6. **Một biểu diễn tiếng Việt** (thống nhất `lomiAccent.normStrict` với `viMatch.V()/VN()`) và đưa `parseVi` vào `splitClauses`
   (hiện tách vế bằng từ chuyển ý, chưa dùng phạm vi phủ định / chủ thể của `lomiParse`) — chưa đụng.

Nguyên tắc khi chuyển một nhóm: (a) viết hàm đề cử THUẦN gọi lại detector cũ, (b) `run` = đúng hàm dựng câu đáp cũ — **không đổi nội dung**,
(c) chạy đủ thước đo mục 5 của prompt, (d) ghi số vào bảng dưới, (e) commit + push nhánh.

## 4. Số đo

Đo 15/11/2026 trên nhánh `kien-truc-lomi` (commit 9df567d = main + sửa nhỏ B2 + bước 1 kiến trúc):

| Thước đo | Gốc (400e8a1) | Nhánh |
|---|---|---|
| `tsc`, `vite build` | sạch | sạch |
| `vitest` | 2.476 qua | **2.526 qua**, 0 trượt (thêm 17 test Gọi + 10 test B2 + 23 test router) |
| paraphrase / convo | 386/400 · 155/160 | 386/400 · 155/160 |
| Bộ 1.000 câu | 876/985 | **876/985**, so baseline: sửa được 1, **hỏng 0**; safety 26/29 (không đổi) |
| Bộ giữ riêng 65 câu | 61/65 | 61/65 |

Số liệu của trọng tài trên bộ 1.000 câu (lượt cuối mỗi ca): 43 lượt mang cờ `risk`; trọng tài phải thay câu đáp (`routed`) **0 lần**
— tức ở bộ này lớp legacy đã tự đáp đúng lời an toàn cho mọi câu ý định tự hại, trọng tài hiện là lưới chắn; `riskMiss` **1 lần**
(G01-029, hỏi bôi kem đánh răng lên vết bỏng — câu đáp đúng nội dung nhưng không có số cấp cứu; chấp nhận được).
Vì `riskMiss` chỉ 1/43 nên bước "bật chặn cho cấp cứu / bạo lực" (việc số 1 ở mục 3) rủi ro thấp.

Đủ điều kiện gộp (mọi thước đo ≥ gốc, 0 ca an toàn hỏng, bộ giữ riêng không giảm) → **đã gộp vào `main`** ngày 15/11.
Nhánh `kien-truc-lomi` giữ lại để làm tiếp các bước sau; trước khi làm tiếp nhớ `git merge main` vào nhánh.
