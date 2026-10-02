# Audit Tarot của Lomi — vì sao kém "trúng mạch" hơn trợ lý AI

Chỉ audit, chưa sửa file nào. Phần dưới là kết luận và hướng cải thiện để anh chọn.

## Cách Lomi đang tạo một lần bói (tóm tắt)

```text
câu hỏi -> detectKind (yes/no, timing, choice, open)
        -> detectTopic + sceneOf (love/ex/crush/jobseek/business/...)
        -> detectIntent (regex trong ~40 INTENTS: "người thứ ba", ...)
        -> drawCards: xáo 78 lá thật (crypto), mỗi lá 50% ngược
        -> readingNarrativeVi: ghép 7 khối
           mở đầu | danh sách lá | từng lá | mối liên hệ | tổng quan | lưu ý | lời khuyên | thông điệp
```

Mỗi khối được ghép từ các mảnh viết sẵn: nghĩa lá (xuôi/ngược) + câu theo lĩnh vực (domainText) + mẫu câu theo scene với `{k}` = từ khoá lá và `{S}` = "chuyện ..." rút từ câu hỏi. Kết luận dựa trên tổng điểm `cardScore` (xuôi +1, ngược -1, vài lá sáng/nặng điều chỉnh).

## 7 điểm chính làm Tarot kém tự nhiên

1. **Mỗi lá được giải ĐỘC LẬP, không biết các lá khác.** Đoạn của lá 2 không biết lá 1 nói gì. Phần "Mối liên hệ" chỉ nối từ khoá bằng mũi tên (`Tháp -> Ngôi Sao -> Mặt Trời`) và một câu cung đi lên/đi xuống. Ví dụ với Ba Kiếm, Ngôi Sao, Hai Cốc: AI sẽ kể "vết thương -> hồi phục -> mở lòng với người mới". Lomi thì đưa ra 3 đoạn riêng rẽ, rồi một dòng "đau lòng -> hy vọng -> kết nối. Một mạch đi lên".

2. **"Hiểu câu hỏi" chỉ là gắn nhãn, không giữ chi tiết.** Hệ thống chỉ còn lại kind + scene + intent (+ chuỗi `{S}` tối đa 5 chữ, câu dài hơn thì quay về tên chủ đề như "chuyện tình cảm"). Ví dụ "anh ấy hứa tháng 3 về mà giờ im lặng, mình nên đợi không": các chi tiết hứa, tháng 3, im lặng, đợi đều mất. Lời giải chỉ còn nói "chuyện tình cảm" chung chung. AI thì nhắc lại đúng hoàn cảnh đó.

3. **Kết luận theo phép cộng điểm, không theo ý nghĩa.** Câu chốt CÓ/KHÔNG/NÊN chỉ lấy từ `toneTotal`. Hai trải bài cùng tổng điểm nhưng câu chuyện ngược nhau vẫn ra cùng một câu chốt. Lá ngược luôn bị tính -1 (dù đã có danh sách SOFT_REV/HARD_UP ngoại lệ), nên rút được nhiều lá ngược là gần như chắc chắn ra câu chốt tiêu cực.

4. **Vị trí lá không thật sự đổi cách đọc lá.** `posName` chỉ là nhãn; nội dung vẫn là nghĩa chung của lá + mẫu câu theo nhóm (state/action/block/result). Cùng là Ngôi Sao, ở vị trí "Điều cản trở" vẫn đọc gần giống ở "Kết quả", nên người đọc thấy lạ, mâu thuẫn.

5. **Ghép câu từ nhiều kho viết riêng → giọng văn lẫn lộn và dễ lặp.** Cùng một lá có thể đi qua nghĩa lá, domainText, phần đuôi mẫu scene, ROLE_LEAD, ADVICE theo chất, `bank.tip`. Mỗi kho do một người/một lần viết riêng, nên có lúc lặp ý ("hy vọng ... tin tưởng ... hy vọng"), có lúc đổi giọng giữa câu. `usedTails`/`rotate` chỉ chống lặp đúng nguyên câu, không chống lặp ý.

6. **Không nhớ cuộc trò chuyện xung quanh.** `context` chỉ được dùng khi topic là "general", và chỉ để đoán scene. Những gì người dùng đã kể trước đó (đang thất nghiệp, vừa chia tay, tên người ấy) không đi vào lời giải. Hỏi nối kiểu "thế còn công việc?" sẽ rút một trải mới với câu hỏi mẫu chuẩn (`FOLLOW_TOPIC_Q`), không nối với trải trước. "Rút thêm" chỉ thêm một lá làm rõ với câu chốt 1 dòng theo điểm.

7. **Đọc dài và theo khuôn cố định.** Lần nào cũng đủ 7 khối, kể cả câu hỏi nhẹ. AI thì trả lời thẳng trước, độ dài vừa với câu hỏi. Khối "Thông điệp" và "Mở đầu" huyền bí (thắp nến, quả cầu) xoay vòng giữa vài câu, đọc 2–3 lần là thấy lặp.

8. (Phụ) **Hai luồng giải song song.** `readingNarrativeVi` cho tiếng Việt từ 2 lá trở lên, còn `readingText` cũ cho tiếng Anh/1 lá/lá làm rõ. Luồng cũ dùng cách đọc khác (TOPIC_LINE, ROLE_LEAD), nên chất lượng không đồng đều giữa các kiểu bói.

## Hướng cải thiện

### Mức A — không dùng AI, vẫn chạy trên máy

1. **Bước "kể chuyện" trước khi viết:** gom cả trải bài thành một mạch (ví dụ khó -> gỡ -> sáng, thuận -> vướng, ...) từ điểm từng lá + vị trí, rồi chọn MỘT mẫu câu cho cả mạch, cài từ khoá 3 lá vào đó. Mẫu câu này thay cho dòng mũi tên hiện tại.
2. **Nghĩa theo vị trí:** với 22 lá Ẩn Chính + nhóm Ẩn Phụ theo chất/số, thêm câu ngắn theo vai (cản trở / lời khuyên / kết quả). Có câu riêng thì dùng thay cho nghĩa chung.
3. **Giữ chi tiết câu hỏi:** tách 1–3 cụm chi tiết (người, mốc thời gian, hành động: "đợi", "nhắn tin", "nghỉ việc") rồi chèn lại vào phần trả lời thẳng và lời khuyên. Cụm dài thì cắt gọn thay vì bỏ hết.
4. **Kết luận theo mạch, không chỉ theo tổng điểm:** lá ở vị trí "kết quả" và "cản trở" có trọng số lớn hơn. Lá ngược có trong SOFT_REV không bị trừ điểm.
5. **Dùng ngữ cảnh đã nhớ:** đưa hoàn cảnh từ bộ nhớ của Lomi (thất nghiệp, chia tay, loại hình kinh doanh) và câu người dùng vừa kể vào `context` mọi lúc, không chỉ khi topic là "general".
6. **Độ dài theo câu hỏi:** bản rút gọn (trả lời thẳng + 3 lá ngắn + lời khuyên) làm mặc định, có nút "Xem giải chi tiết" để mở đủ 7 khối.
7. **Hỏi nối nối với trải cũ:** "thế còn công việc?" rút 1–3 lá mới nhưng nhắc lại lá trước ("lá Tháp lúc nãy ...").

Ưu: miễn phí, chạy offline, giữ quy tắc #61/#62. Nhược: tốn công viết nội dung; vẫn có giới hạn với câu hỏi lạ.

### Mức B — hybrid: rút bài trên máy, AI chỉ diễn giải

1. Việc rút bài vẫn ở `drawForQuestion` (ngẫu nhiên thật, không để AI chọn lá).
2. Gửi sang AI một gói đã cấu trúc: câu hỏi gốc, ngữ cảnh gần (2–3 tin), kind/scene/intent, từng lá + vị trí + xuôi/ngược + từ khoá + nghĩa trong kho, và điểm/hướng kết luận do Lomi tính sẵn. Nâng cấp `readingAiPrompt` hiện có thành gói này.
3. Ràng buộc trong prompt: không đổi lá, không đổi xuôi/ngược, không hứa chắc, không bàn chuyện sức khoẻ/đầu tư ngoài nhắc nhở; độ dài theo câu hỏi.
4. Dự phòng: AI lỗi, hết lượt hoặc không phải thành viên → hiện lời giải trên máy như bây giờ. Lá bài và hiệu ứng lật vẫn hiện ngay; lời giải AI đến sau.
5. Chi phí và tuân thủ: dùng edge function `ai-assistant` đã có (đang tắt, `AI_ENABLED=false`), chỉ cho thành viên và có giới hạn lượt/ngày. Việc này trái với quyết định #62 ("Gemini: Kir bỏ"), nên cần anh quyết lại trước khi làm.

## Đề xuất thứ tự

1. Làm A1 + A3 + A4 trước: tác động lớn nhất tới cảm giác "trúng mạch", phạm vi chỉ trong `src/lib/tarot.ts`, thêm test cho các trải bài mẫu.
2. Sau đó làm A6 (rút gọn mặc định), đụng tới phần hiển thị trong khung chat.
3. Chỉ cân nhắc B nếu anh đồng ý mở lại AI.

## Chi tiết kỹ thuật (tham chiếu)

- Rút bài: `drawCards` (Fisher–Yates + `crypto.getRandomValues`), `rev = randInt(2)`.
- Hiểu câu hỏi: `detectKind`, `detectTopic`, `sceneOf`, `detectIntent` (regex), `subjectOf` (tối đa 5 chữ, không thì dùng `TOPIC_NOUN`).
- Lời giải: `readingNarrativeVi` (khối 1–7), `cardScore`/`toneTotal`/`rough`/`hard`, `kw`, `domainText`, `SCENE[scene][group]`, `ADVICE`, `vary`/`rotate` (chống lặp nguyên câu, lưu trên máy).
- Nối tiếp: `isTarotMore` -> `drawClarifier` (1 lá), `FOLLOW_TOPIC_Q`, `tarotFollowUps`.
- Hiển thị: `LomiTarot.tsx` chỉ lo hình lá + hiệu ứng lật; không có logic giải.
- Định tuyến: `AiAssistant.tsx` các bước c/d/e (chờ câu hỏi, hỏi nối, nhận diện bói). Bước kiểm tra trong `lomiUnderstand.ts` trả lời câu hỏi luật Tarot trước khi bói.
