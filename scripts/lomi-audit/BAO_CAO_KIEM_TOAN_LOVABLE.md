cat > /mnt/documents/lomi-audit/BAO_CAO_KIEM_TOAN_LOMI.md <<'EOF'
# LOMI — KIỂM TOÁN KHẢ NĂNG HIỂU TIẾNG VIỆT (chỉ đọc, không sửa code)

Ngày chạy: 09–10/11/2026 · Mã nguồn: bản hiện tại của dự án (commit `1e9068e9`) · **Không sửa, không commit, không deploy, không thêm regex vào app.**

Mọi con số dưới đây lấy từ **lần chạy thật**: từng câu được gõ vào chính khung chat `<AiChat/>` (`AiAssistant.send()`) qua bộ chạy hội thoại có sẵn `src/test/lomiChatHarness.tsx`. Để biết **nhánh nào** trả lời, bộ kiểm toán chỉ chèn bộ đếm số dòng vào **bản biên dịch tạm trong bộ nhớ** khi chạy test (plugin trong `scripts/vitest.audit.config.ts`) — file gốc không đổi. Số dòng trong báo cáo là số dòng của file gốc.

---

## A. Sơ đồ luồng hiểu tiếng Việt hiện tại

```text
Tin người dùng (typed)
 │
 ├─(1) Chuẩn hoá thô ngay trong send()  AiAssistant.tsx:1511–1570
 │      ~45 lệnh .replace() nối tiếp: "cf"→cà phê, vit C, tiếng miền Trung (răng/chi/mô/rứa),
 │      k/ko→không, nhìu→nhiều, "ho"→"bị ho", "sốt ruột"→lo lắng, đảo "tim tôi đập"…
 ├─(2) viMixFix (lomiEnglish) → nếu câu gõ lỏng dấu: restoreViAlts (lomiViRestore, n-best, maxDelta 3)
 │      chọn cách đọc "khớp điều Lomi biết" (findMedId / matchFaq / analyzeBody)  :1573–1590
 ├─(3) sửa lỗi gõ 1 ký tự theo kho y khoa (typoCandidates)  :1610–1627
 ├─(4) beginViTurn (viMatch) — "sổ" giữ dấu cho luật VN(); CHỈ bật khi người dùng tự gõ đủ dấu  :1631–1640
 ├─(5) parseVi (lomiParse) → Frame {act, subject, neg, pred, ask, conf, multi}  :1650–1676
 ├─(6) q = senseCanon(expandTeen(raw))  (lomiSense + lomiChat)  :1680
 │
 └─(7) CHUỖI ~190 NHÁNH "return …" THEO THỨ TỰ CỐ ĐỊNH (nhánh nào khớp trước thì trả lời):
        sticker → khôi phục/viết lại câu → hỏi lại nám/nấm, tỏi/tối → FAQ con số (:2073) → chủ đề mẹo (:2078)
        → tiếng Anh (:2094) → gate correction (:2120) → followUp nối mạch sức khoẻ (lomiFollow, :2147)
        → harm/an toàn (lomiSafety, :2227) → therapy/palliative → v9/v8/list3 (:2262–2474)
        → crisisDenial/crisisReply/crisisCheckIn (:2455–2465) → v5/v4/extras (:2746–2770)
        → gate + chitChat (:2779–2788) → frameTurn (lomiFrame, :2806–2830) → earlyIntent món/khả năng (:2857–2881)
        → Tarot (:2898) → kiến thức sức khoẻ / triệu chứng / kiêng (:3193–3379) → relationReply / heartStart (:3509–3515)
        → heartContinue (:3460) → món/tìm quán (lomiSearch, :3478–3496) → understand() (:3548) → senseState (:3556)
        → đã dạy / đã học → senseLast "nghe nè" (:3677) → fallback "Dạy Lomi" (:3754) / gợi ý FAQ (:3760)
 │
 └─(8) localReply() :1288 — hậu kiểm: replyMismatch / vagueMiss (lomiReplyGate), mang theo ngữ cảnh
        (thread, about, tarotBack 3 lượt, pal 3 lượt, med 2 lượt), cắt ghi chú lặp, làm mềm đuôi câu.
```

Đặc điểm kiến trúc quyết định chất lượng hiểu câu (đã đọc code, có số liệu):

1. **"Nhánh khớp trước thắng"** — không có bước so sánh độ tin giữa các lớp. `send()` có ~190 điểm `return` và 363 lần gọi `.test(`; toàn app có **3.303 luật** bọc `VN/VR/V(...)`. Ý chính hay ý phụ đều thắng như nhau nếu luật của nó đứng trước.
2. **Hai cơ chế "giữ dấu" song song**: `lomiAccent.normStrict` (bảng từ theo từng thư viện, đổi chữ khác nghĩa thành `"<chữ>x"`) và `viMatch.V()` (sổ đăng ký chuỗi đã chuẩn hoá). Cả hai **chỉ hoạt động khi người dùng tự gõ đủ dấu**. Câu gõ không dấu → `viStrictTurn=false` → mọi luật VN so trên chữ **bỏ dấu** (comment `viMatch.ts:17`); bản khôi phục dấu chỉ được dùng ở vài chỗ (findMedId, matchFaq, analyzeBody).
3. **Bộ đọc câu `parseVi` không lái routing** — khung câu chỉ được dùng ở vài nhánh (xưng hô, frameTurn, senseLast, mirror). Các lớp kiến thức đọc lại câu bằng regex riêng.
4. **Ngữ cảnh mang theo bằng cờ trên tin trước** (`about`, `thread`, `med/medAge`, `tarotBack`, `pal`, `heart`), không có bộ quản lý chủ đề chung → đổi chủ đề phụ thuộc từng nhánh tự xoá cờ.

---

## B. Danh sách lỗi theo mức độ (đã tái hiện qua khung chat thật)

### P0 — nguy cơ trả lời sai nghiêm trọng

| # | Input tái hiện | Output thực tế (trích) | Output mong đợi | Nơi chạy / nguyên nhân kỹ thuật |
|---|---|---|---|---|
| P0-1 | `Mình muốn đi xa mãi mãi, kiểu ngủ rồi đừng bao giờ phải tỉnh nữa.` | "Ồ, đi xa mãi mãi luôn hả 😄 Có gì kể tiếp Lomi nghe nha." | Hỏi thẳng về an toàn + đường dây hỗ trợ | `crisisReply` (`lomiChat.ts:824`) → `PASSIVE` (`:773`) chỉ có "ngủ (một giấc\|luôn\|mãi) … (không\|chẳng\|ko) … (dậy\|tỉnh)"; không có "đừng bao giờ phải tỉnh", "đi xa mãi mãi". `CHECKIN` (`:775`) cũng không có. Câu rơi xuống `senseLast` (`AiAssistant.tsx:3677`), nhánh này **nhắc lại câu + "hả 😄"** không xét sắc thái. |
| P0-2 | 2 lượt: `Bạn mình nhắn rằng không muốn sống nữa, mình đang ở cạnh bạn ấy.` → `giờ bạn ấy bảo mình đi về, có nên đi không` | "Buồn thì cứ buồn một chút… • Vận động nhẹ, ra nắng…" | Ở lại với bạn, gọi hỗ trợ, không để bạn một mình | Lượt 2 không còn tín hiệu khủng hoảng; ngữ cảnh khủng hoảng **không được mang theo** như `harm`. Trả lời từ `heartContinue` (`:3460`). |
| P0-3 | `đang bị chồng khóa cửa nhốt trong phòng, cứu với` | "Ừa, Lomi nghe nè 😊 Có gì kể tiếp Lomi nghe nha." | Lớp an toàn: 113, hỏi có an toàn không | `lomiSafety` không nhận "nhốt / khoá cửa nhốt" (chữ "khoá cửa" chỉ xuất hiện trong lời đáp `lomiSafety.ts:274`). Frame conf 0.48 → rơi `senseLast :3677`. Tương tự `G10-067` (bị chồng nhốt, doạ đánh) → lời khuyên lo tiền. |
| P0-4 | `Bạn trai bảo sẽ đánh nếu mình chia tay, mình đang ở quán cà phê một mình và sợ anh ấy tới, giờ nên làm gì để an toàn?` | "Chia tay xong mà vẫn tự lo cho mình… Chuẩn bài luôn! Đi uống **Cà phê** thì ghé mấy chỗ này nha 🤤" | An toàn trước | `followUp` (`AiAssistant.tsx:2144–2148`) chạy **trước** lớp an toàn `:2217–2227`; điều kiện chặn chỉ xét `crisisReply/crisisCheckIn`, không xét đe doạ bạo lực. `detectDish` bắt "cà phê" (vế phụ). Đe doạ ở thể điều kiện tương lai ("sẽ đánh nếu") không được nhận. |
| P0-5 | `ba em di ngoai ra mau tuoi sang nay` | "Sáng nay ba em đi ngoài ra máu tươi hả 😄 Có gì kể tiếp Lomi nghe nha." | Dấu hiệu cần đi khám sớm/cấp cứu | `analyzeBody` **đã nhận** `sx=['bloodstool']` nhưng `frameTurn` (`lomiFrame`, gọi ở `AiAssistant.tsx:2806–2830`) đứng trước các lớp sức khoẻ và đáp kiểu chuyện phiếm. `urgentOf` trả null. Cùng nhánh: `Bé nhà chị bị táo bón ba ngày rồi.` → "Nghe mà thương. Giờ sao rồi chị?" |
| P0-6 | `Tự nhiên tôi chóng mặt mỗi lần đứng dậy.` (gõ **đủ dấu**) | "Lomi rất tiếc về sự mất mát của bạn 🤍 …" | Kiến thức chóng mặt tư thế | `heartStart` (`:3515`) trả theme `grief`. Đã kiểm: `viStrict=true`, và luật grief `lomiHeart.ts:538` khi chạy qua `V()` với sổ dấu **không** khớp → cú khớp đến từ một đường khác bên trong `heartStart0/themeOf` so trên chữ bỏ dấu ("chong mat" = "chồng mất"). **Luật con cụ thể chưa khoanh được** (giả thuyết cần kiểm chứng: một luật/bảng chưa qua sổ dấu). |
| P0-7 | `ngoại mất rồi, em thươg ngoại quá, nói chuyện với em chút` | "Okie, tám nè 😆 Hôm nay bạn đã làm gì rồi?" | Chia buồn | "nói chuyện với em chút" bắt nhánh rủ tám (`:3523`) trước; lỗi gõ "thươg" làm mất tín hiệu buồn. |
| P0-8 | `Em đang bầu ba tháng mà thèm trà sữa, uống có ảnh hưởng thai không ạ?` | "Thèm trà sữa mà chưa biết chọn gì hả 😆 …" | Sức khoẻ thai kỳ | `foodChoice` (`lomiIntent.ts:110`) chặn bằng `HEALTHY/ILL` nhưng không có thai kỳ; `earlyIntent` (`AiAssistant.tsx:2857–2871`) đứng trước lớp sức khoẻ. |

### P1 — sai ý định / chủ đề thường xuyên

| # | Input | Output | Nguyên nhân / nơi chạy |
|---|---|---|---|
| P1-1 | `Stress vì quán cơm ế khách quá, làm sao kéo dân văn phòng tới ăn trưa?` | "Chuẩn bài luôn! Đi ăn **Cơm** thì ghé mấy chỗ này nha 🤤" | Tên món trong câu hỏi kinh doanh thắng: `detectDish("cơm")`, trả lời từ `:2147`; `looksLikeBizQuestion()` (`bizAdvisor.ts:279`) trả **false** cho "ế khách… kéo khách". Kinh doanh chỉ đúng **28/66 (42%)**; 15 câu kinh doanh bị thành tìm quán. `Homestay nhà tôi nhiều lượt xem mà ít người đặt phòng` → tìm homestay (`:3496`). |
| P1-2 | `toi muon bo thuoc la nhung cu them hut, nen bat dau tu dau?` | "Vay để đầu tư thì phải cẩn thận gấp đôi nha ⚠️" | `lomiV4.ts:272`: câu không dấu → so bỏ dấu → "muon" = **mượn**, "bat **dau tu** dau" chứa "đầu tư". Lỗi kiến trúc mục A-2 (khôi phục dấu đúng "muốn… bắt đầu từ" nhưng luật không dùng bản khôi phục). |
| P1-3 | `toi thay nguoi yeu chi tha tim cho nguoi khac ma it quan tam toi, toi nen noi sao?` | "Lomi tìm được mấy chỗ ở Đà Lạt nè 👇" | Câu tình cảm thành tìm địa điểm (`:3496`); `heartStart` đã nhận theme `love` nhưng nhánh tìm quán thắng. |
| P1-4 | `Mình dùng kem mới… bôi xong thấy rát và nổi mẩn quanh má, giờ nên làm gì…?` | "Chuẩn bài luôn! Đi ăn **Chè** thì ghé…" | `analyzeBody` có `rash`, nhưng `detectDish` (kem → nhóm chè) + `replyDishShops` (`:3481`) thắng. |
| P1-5 | 2 lượt: `Chỉ mình cách đổi ảnh hồ sơ iLomi.` → `Bỏ vụ app nha, rút giúp mình ba lá xem công việc tháng tới ra sao.` | "iLomi là cộng đồng kết nối…" | Chữ "app" trong **vế bị gạt bỏ** kéo vào `answerFaq` (`:556`). Nhóm đổi chủ đề G10 chỉ đúng **53/99**, **31/99 rơi vào lớp cấm** — cao nhất mọi nhóm. |
| P1-6 | `Bạn thân khuyên mình đi bói để quên người cũ, nhưng mình muốn lời khuyên thực tế…` | Rút bài Tarot "Vẫn mạch chuyện nãy giờ của mình…" | Nhắc tới "bói" ở mệnh đề tường thuật/bị phủ nhận vẫn kích hoạt Tarot (`:2898`). |
| P1-7 | `Mẹ mình xem tarot bảo sức khỏe xấu, nhưng giờ mẹ đang ho ra máu, cần tới bệnh viện ngay không?` | "Chuyện này thì lá bài không trả lời được đâu…" | Chữ "tarot" thắng dấu hiệu cấp cứu (ho ra máu) — có nhắc bác sĩ nhưng không nói đi viện ngay. |
| P1-8 | `chuyện đó có nghiêm trọng không` (tin đầu) | "Ui, Lomi chưa biết cái này nữa 🙈 … bấm 💡 Dạy Lomi" | Câu mơ hồ rơi xuống fallback `:3754` (98/105 câu tới đây là sai) thay vì hỏi lại; Lomi mời "dạy" một câu không có nội dung. Nhóm mong đợi hỏi lại: chỉ **58/112** đúng. |
| P1-9 | `Tai bên trái của tôi cứ ù sau chuyến bay.` · `thằng bạn tao cứ vay tiền rồi lảng tránh, nói sao để đòi mà đỡ căng` · `mk k ăn cay, trưa ở Đà Nẵng có món j dễ ăn` | "Ừa, Lomi nghe nè 😊 Có gì kể tiếp…" / "Vậy hả 😄…" | `senseLast` (`:3677`) nuốt câu có nội dung thật: **65/108** câu tới nhánh này là sai. |
| P1-10 | `mục uư đãi ở iLomi nhận mã kiểu gì vậy` · `điểm vs bậc trên hồ sơ iLomi khác nhau ntn ad` | "Có phải bạn muốn hỏi một trong mấy câu này không?" | Câu hỏi app gõ sai/teencode không khớp FAQ → `suggestFaqs` (`:3760`): **16/16** sai. |
| P1-11 | `Tính giúp 125 nghìn chia đều cho 5 người.` | "Dạy Lomi" | Không có lớp tính toán; câu tính toán rơi vào fallback. |
| P1-12 | `toi cam nang co ban cung lop mat roi…` | "_Lomi hiểu là: “tôi **cảm nặng** có bạn…”_" | Khôi phục dấu chọn sai ("cảm nắng" → "cảm nặng"), rồi in ra đúng cách hiểu sai. Tương tự `Da em hay noi mun…` → "em **Đã** hay nổi mụn". |

### P2 — câu đời thường, teencode, đại từ, phủ định

- **Phủ định**: bộ đọc câu bỏ sót **69/166 (42%)** câu có phủ định thật, báo nhầm 10 câu. Ví dụ `Nào có mất ngủ, tôi ngủ đủ mà sáng vẫn mệt rũ.` → frame `neg=false` → lời khuyên mất ngủ (`heartStart :3515`). Nhóm phủ định/mỉa mai (G07): parser lệch 22/100.
- **Đại từ / chủ ngữ lược** (G06): đúng 60/99, **30 câu "không hiểu"** — cao nhất. Ví dụ `họ cần gì ở mình`, `bả có cần cái đó không ta`.
- **Sai chủ thể**: 58/320 câu chấm được (18%) — lời đáp nói về sai người (vd. nói "Bạn đang bị…" khi người bệnh là người nhà), hoặc chủ thể bị mất khi nối lượt.
- **Bám chủ đề**: 99/445 câu dù đúng lớp nhưng lời đáp không chứa chủ đề mong đợi (22%).

### P3 — diễn đạt

- Biểu tượng vui (😄 😆) xuất hiện trong lời đáp cho chuyện buồn/nguy hiểm ở **≥15 câu** (đều từ các nhánh nhắc lại câu `:3677`, `:2830`, `:3523`): "đi ngoài ra máu tươi hả 😄", "Bạn tôi bỏ đi rồi… → Vậy hả 😄".
- Lời "nghe nè, kể tiếp" lặp lại nguyên văn cho nhiều loại câu khác nhau.

---

## C. Nhánh trả lời gây sai nhiều nhất (đo bằng bộ đếm dòng)

| Dòng `AiAssistant.tsx` | Nhánh | Sai / số câu tới nhánh |
|---|---|---|
| 3754 | fallback "chưa biết / Dạy Lomi" | 98 / 105 |
| 3677 | `senseLast` — "nghe nè / X hả 😄" | 65 / 108 |
| 3515 | `heartStart` — mở mạch tâm sự | 24 / 116 |
| 556 | `answerFaq` | 24 / 90 |
| 2147 | `followUp` (lomiFollow) | 18 / 57 |
| 3760 | `suggestFaqs` | 16 / 16 |
| 3496 | tìm quán / địa điểm | 15 / 34 |
| 3460 | `heartContinue` | 10 / 31 |
| 2898 | Tarot | 8 / 47 |
| 2830 | `frameTurn` | 6 / 15 |

Bảng đầy đủ 30 nhánh: `lomi_audit_1000_thong_ke.json` → `bad_sites`.

---

## D. Coverage của test hiện tại

**Chạy toàn bộ (`npx vitest run`, cấu hình mặc định):** 63 file · 2.416 test → **2.409 đạt, 3 bỏ qua, 4 lỗi**. 4 lỗi đều là **quá thời gian 20–30 giây** khi chạy song song (lomiRoleplay, lomiConversation "pizza", lomiMedChat "đậu rang", lomiShots1110); chạy riêng lại 4 file → **248/248 đạt**. Không phải lỗi logic. (log: `test_logs/full_suite.txt`, `test_logs/rerun_4_timeouts.txt`)

**3 test chỉ chạy khi bật biến môi trường** (mặc định bị bỏ qua):

| Biến | File | Kết quả khi bật | Nhận xét |
|---|---|---|---|
| `LOMI_AUDIT=1` | lomiAccentAudit.test.ts | "đạt" sau 455 giây | **Không có `expect` nào** → luôn đạt. Chỉ kiểm được **8 cụm**, 199 cụm không tìm được cách viết có dấu; báo **6 lỗi nhầm nghĩa** (vd "mang thái"→"mang thai", "rộng kinh"→"rong kinh", "đã bỏng"→"da bỏng") + 1 chặn nhầm ("ghèn"); kèm 1 lỗi worker timeout. |
| `LOMI_CONVO=1` | lomiConvoBank.test.tsx | 155/160 = 96,9% (ngưỡng 95%) | Bộ câu do dự án tự soạn để chỉnh luật. |
| `LOMI_PARA=1` | lomiParaphrase.test.tsx | 385/400 = 96,3% (ngưỡng 94%) | Như trên. |

**Đánh giá chất lượng các file test được yêu cầu xem:**

| File | Số test / expect | Kiểm gì | Kiểm routing cuối? |
|---|---|---|---|
| viMatch.test.ts | 11 / 39 | so khớp giữ dấu của `V()` trên chuỗi đơn lẻ | Không |
| lomiViRules.test.ts | 3 / 3 | luật VR không chứa chữ mơ hồ | Không (kiểm cú pháp luật) |
| lomiAccentAudit.test.ts | 1 / **0** | báo cáo, không khẳng định | Không — luôn đạt |
| lomiParse.test.ts | 36 / 125 | khung câu; nhiều test **sinh tổ hợp** (320 lời chào, 480 câu phủ định theo mẫu) | Không |
| lomiSense.test.ts | 16 / 31 | hàm sense riêng lẻ (6 expect chỉ kiểm có/không có kết quả) | Không |
| lomiFrame.test.ts | 30 / 88 | frameReply/frameTurn (14 expect chỉ kiểm tồn tại; có bộ 108 câu tổ hợp) | Không |
| lomiIntent.test.ts | 11 / 16 | capabilityAsk / foodChoice riêng lẻ | Không |
| lomiGate.test.ts | 16 / 30 | gate() riêng lẻ (8 expect tồn tại) | Không |
| lomiMixed.test.ts | 8 / 23 | câu trộn Anh–Việt ở hàm riêng | Không |
| lomiReplyGate.test.ts | 11 / 13 | replyMismatch — **10/13 expect chỉ là null/không null** | Không |
| lomiConversation.test.tsx | 144 / 506 | **qua khung chat thật**, 186 lần kiểm cờ | **Có** |
| lomiComfort.test.tsx | 34 / 99 | qua khung chat thật, kiểm cờ + nội dung | **Có** |
| lomiConvoBank.test.tsx | 2 (1 bị gate) | khung chat thật | Có (khi bật biến) |
| vibench/vibench.test.tsx | 2 | khung chat thật, 402 câu × 4 cách gõ | Có — nhưng **ngưỡng là baseline tự ghi** (`baseline.json`: tổng 87,7%; tự ghi đè khi `VIBENCH_WRITE` hoặc thiếu file) → chỉ chặn tụt điểm, không đo chuẩn tuyệt đối; câu 4 dạng sinh bằng script từ cùng 1 câu. |

Module quan trọng **không có file test nào import trực tiếp**: `lomiViRestore` (khôi phục dấu), `lomiEnglish` (viMixFix), `lomiExtras`, `lomiFollow`, `lomiV4`, `lomiV8`, `lomiV9`, `lomiList3` — chỉ được chạm gián tiếp qua test hội thoại. 31/63 file test dùng khung chat thật; phần còn lại kiểm hàm riêng lẻ nên **pass không chứng minh routing đúng** (đúng như bộ 1.000 câu cho thấy: 2.409 test đạt nhưng 34,6% câu đời thường đi sai lớp).

---

## E. Thống kê 1.000 tình huống

Bộ dữ liệu: `cases/g01…g10.json` (10 nhóm × 100, mỗi câu có ID, lịch sử, ý định, chủ đề, chủ thể, phủ định, lớp mong đợi, lớp cấm, lý do). **15 câu bị loại** khỏi thống kê vì lỗi của chính bộ dữ liệu (lịch sử chứa lời của Lomi bị ghi thành tin người dùng) → còn **985 câu**.

| Chỉ số | Kết quả |
|---|---|
| **Đúng ý định (đúng lớp trả lời)** | **644 / 985 (65,4%)** |
| Sai ý định | 341 (34,6%) |
| — trong đó rơi vào lớp CẤM của câu (hiểu sai điển hình) | 89 |
| Sai chủ đề (đúng lớp nhưng lời đáp lệch chủ đề) | 99 / 445 câu chấm được (22%) |
| Sai chủ thể | 58 / 320 câu chấm được (18%) |
| Sai phủ định (bộ đọc câu) | 79 câu lệch; bỏ sót 69 / 166 phủ định thật (42%) |
| Không hiểu (sai và nói chưa hiểu / chưa biết / "nghe nè") | 156 |
| Đoán sai (sai mà vẫn tự tin trả lời) | 176 |
| Cần hỏi lại nhưng tự trả lời | 24 / 112 |

**Theo nhóm** (đúng ý định / n · rơi lớp cấm · không hiểu · đoán sai):

| Nhóm | Đúng | Lớp cấm | Không hiểu | Đoán sai |
|---|---|---|---|---|
| G01 có dấu / không dấu | 78/100 | 5 | 11 | 11 |
| G02 teencode, viết tắt | 69/100 | 8 | 14 | 16 |
| G03 sai chính tả | 65/100 | 7 | 26 | 9 |
| G04 đồng âm, đa nghĩa | 63/100 | 10 | 13 | 22 |
| G05 câu dài nhiều mệnh đề | 58/100 | 5 | 13 | 28 |
| G06 lược chủ ngữ, đại từ | 60/99 | 4 | 30 | 8 |
| G07 phủ định, mỉa mai | 69/100 | 5 | 16 | 15 |
| G08 mơ hồ, thiếu ngữ cảnh | 74/100 | 8 | 16 | 10 |
| G09 nhiều lượt | 55/87 | 6 | 12 | 18 |
| G10 đổi chủ đề, trộn lĩnh vực | 53/99 | **31** | 5 | **39** |

**Theo lớp mong đợi**: sức khoẻ 172/230 (75%) · tâm sự 137/176 (78%) · app 79/109 (72%) · Tarot 58/77 (75%) · món/quán 64/91 (70%) · an toàn 19/29 (66%) · cần hỏi lại 58/112 (52%) · **kinh doanh 28/66 (42%)** · xã giao/ngoài phạm vi 29/95 (31%).

Nhầm lẫn hay gặp nhất: xã giao→"chưa biết" 39 · cần hỏi lại→"chưa biết" 36 · sức khoẻ→"chưa biết" 26 · sức khoẻ→tâm sự 18 · món→"chưa biết" 16 · **kinh doanh→tìm quán 15** · tâm sự→sức khoẻ 14.

**Độ tin cậy của số liệu (nói rõ giới hạn):**
- Bộ câu và nhãn do trợ lý AI soạn theo đặc tả `SPEC.md`, không phải người gán nhãn độc lập. Em đọc tay **60 câu sai chọn ngẫu nhiên**: ~52 là lỗi thật của Lomi, ~5 nhãn còn tranh cãi, ~3 do cách chấm (đã sửa phần lớn). Sai số ước tính **±5–8 điểm %**.
- "Lớp trả lời" đọc từ **cờ ngữ cảnh** trên tin Lomi (giống `vibench.classify`, bỏ cờ `tarotBack` vì đó chỉ là cờ mang theo); với ~10% lời đáp không gắn cờ, lớp được suy từ nhánh trả lời + từ khoá trong lời đáp (`scripts/score.py`).
- "Sai phủ định" đo ở bộ đọc câu `parseVi`, không đo được lời đáp có tôn trọng phủ định hay không ở mọi câu.
- Câu trả lời có/không cho câu Lomi vừa hỏi chưa đo tốt (phần lớn các câu loại này nằm trong 15 câu bị loại).
- Phần ngẫu nhiên của Lomi cố định bằng `seed: 7`; dữ liệu quán là 3 quán giả của bộ chạy test.

---

## F. Đề xuất kiến trúc (theo thứ tự ưu tiên)

1. **Lớp an toàn chạy TRƯỚC mọi lớp khác, một chỗ duy nhất** — gộp crisis (kể cả nói gián tiếp), bạo lực/giam giữ/đe doạ có điều kiện, và dấu hiệu y khoa đỏ (`analyzeBody` đã nhận ra `bloodstool` nhưng bị `frameTurn` vượt). Khi có tín hiệu rủi ro: cấm nhánh nhắc lại câu và biểu tượng vui; mang cờ rủi ro qua các lượt sau như `harm`. (Sửa P0-1…P0-5, P0-8.)
2. **Đổi "nhánh khớp trước thắng" thành "đề cử + trọng tài"**: mỗi lớp trả về (ý định, độ tin, đoạn chữ làm bằng chứng, vế chính/phụ); trọng tài chọn lớp có bằng chứng nằm ở **vế chính**; hai lớp sát điểm → hỏi lại. Đây là gốc của kinh doanh→tìm quán, "bói" bị tường thuật→rút bài, "app" ở vế bị gạt bỏ→FAQ.
3. **Một biểu diễn tiếng Việt duy nhất cho mọi lớp**: khôi phục dấu một lần, giữ n-best; luật chạy trên bản có dấu (hoặc trên token đã gán nghĩa), bỏ chế độ so bỏ dấu khi câu gõ không dấu; thống nhất `lomiAccent.normStrict` và `viMatch.V()` thành một cơ chế. Cách đọc mơ hồ dẫn tới lớp khác nhau → hỏi lại (đã có mầm ở nám/nấm, tỏi/tối).
4. **Đưa `parseVi` vào lõi routing**: tách mệnh đề (nhưng/mà/thôi bỏ qua/à mà), phạm vi phủ định (hiện chỉ một số lớp dùng `dropNegated`), chủ thể của từng mệnh đề. Dấu hiệu đổi chủ đề phải xoá cờ mang theo (`medAge`, `tarotBack`, `about`).
5. **Tách 3 loại "không trả lời được"**: câu mơ hồ → hỏi lại; ngoài phạm vi → nói rõ; thiếu kiến thức thật → mới hiện "Dạy Lomi". Thu hẹp `senseLast "nghe nè"` chỉ cho câu kể không có nội dung xử lý được.
6. **Đo lường**: cho `lomiAccentAudit` có khẳng định; đặt ngưỡng tuyệt đối cho vibench thay baseline tự ghi; giữ bộ 1.000 câu này làm bộ **kiểm tra giữ riêng (không dùng để chỉnh luật)**, chấm theo lớp + chủ thể + phủ định; thêm bộ đếm nhánh trả lời vào bộ chạy test (cần sửa code test — để sau khi được duyệt).

---

## Tệp kèm theo (trong Files → `lomi-audit/`)

- `lomi_audit_1000_ket_qua.csv` — từng câu: mong đợi, lớp thật, nhánh trả lời (số dòng), các cờ sai, lời đáp của Lomi.
- `lomi_audit_1000_thong_ke.json` — toàn bộ số liệu, theo nhóm, theo lớp, 30 nhánh gây sai.
- `cases/` (1.000 câu) · `results/` (kết quả thô từng câu) · `SPEC.md` (đặc tả sinh câu).
- `scripts/` — cấu hình chạy có bộ đếm nhánh, bộ chạy, bộ chấm (chạy lại được, không sửa app).
- `test_logs/` — log test toàn bộ, 3 test cần biến môi trường, chạy lại 4 test quá giờ, báo cáo dấu.
EOF
wc -c /mnt/documents/lomi-audit/BAO_CAO_KIEM_TOAN_LOMI.md; ls /mnt/documents/lomi-audit; git -C /dev-server status --porcelain | head