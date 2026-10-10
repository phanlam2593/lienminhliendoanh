# Gaps — batch n3 (mắt / da / răng / nhiễm trùng) — 2026-10-09

Trang KHÔNG đọc được (lỗi fetch, không dùng làm nguồn): NHS "Chalazion" (/conditions/chalazion/, thử 2 lần), NHS "Melasma" (/conditions/melasma/, thử 2 lần — có thể NHS không có trang này), WHO "avian-influenza-(h5n1)" (URL đoán sai), CDC mpox (/mpox/signs-symptoms/, /mpox/about/). URL Mayo melasma đoán được lại trả về trang Stevens-Johnson → bỏ, không dùng.

## Tên bị bỏ vì va chạm khi so khớp không dấu (cần người quyết)
- `nam-da-mat`: KHÔNG dùng "nám da" (bỏ dấu = "nam da" trùng "nấm da" của thẻ nam-da), "nám da mặt" (câu "nấm da mặt" sẽ bị kéo sang nám), "nám má" (bỏ dấu = "nam ma", trùng câu thường "Nam mà…"), "trị nám" (= "trị nấm"). Đã dùng "nám" (ngắn → chỉ khớp khi gõ đúng dấu), "vết nám", "bị nám", "da bị nám", "nám sạm", "melasma" + disambiguation. Người gõ "nam da" không dấu sẽ vào nấm da.
- `viem-gan-co`: KHÔNG dùng "viêm gân" trơn — findMedTopicId so khớp bỏ dấu với tên ≥4 chữ, nên "viêm gân" = "viem gan" sẽ bắt mọi câu "viêm gan là gì" (gan) sang viêm gân. Cũng bỏ "bệnh viêm gân", "đau gân", "sưng gân", "tổn thương gân", "viêm gân cơ" (đều trùng cụm về gan). Chỉ dùng tên có vị trí ("viêm gân cổ tay", "viêm gân ở vai"…) + "tendonitis". → Hệ quả: hỏi "viêm gân" trơn sẽ KHÔNG nhận ra thẻ. Cần thêm cơ chế "tên chỉ khớp khi đúng dấu" cho tên dài thì mới thêm được "viêm gân".
- `lac-mat`: KHÔNG dùng "lác mắt" trơn (bỏ dấu = "lac mat" = "lạc mất"). Tên chính "lác mắt (mắt lé)". Hỏi "lác mắt" trơn sẽ không nhận ra.
- `dau-mua-khi`: bỏ "đậu khỉ" (bỏ dấu = "đau khi", vd "đau khi nuốt").
- `dau-rang`: "đau răng" bỏ dấu = "đậu rang" (món ăn) — câu kiểu "gout ăn đậu rang được không" có thể bị kéo sang thẻ đau răng (tên dài hơn "gout"). Chưa xử lý.

## Theo thẻ
- chap-leo-mat: chỉ NHS Stye + MedlinePlus Chalazion + NHS Eyelid problems (sơ lược). Chưa có nguồn: lẹo có lây không, lẹo ở trẻ em, ăn uống (đồ nóng, hải sản…), dân gian ("lẹo do nhìn trộm") — không có nguồn nào nêu. Không có mục cấp cứu.
- viem-bo-mi: không có cấp cứu; không có ăn uống (MedlinePlus chỉ nêu bổ sung dầu cá như lựa chọn điều trị, đã ghi ở care). Chưa có: viêm bờ mi ở trẻ, có liên quan dùng điện thoại/màn hình không.
- lac-mat: NHS không có mục khẩn cấp; MedlinePlus cũng không nêu khẩn cấp cho lác đột ngột ở người lớn (bộ tóm tắt tự suy ra "đi cấp cứu" — đã KHÔNG dùng). Chưa có: tuổi nên mổ, mổ có đau/tái lác không, nhược thị chữa được đến tuổi nào (MedlinePlus nói ~11 tuổi "có thể vĩnh viễn" — chưa đưa vào vì là con số dễ gây hiểu sai).
- dau-rang: có cấp cứu (sưng mắt/cổ, khó thở/nuốt/nói). Chưa có: mẹo dân gian (tỏi, đinh hương, ngậm rượu…), đau răng khi mang thai, đau răng ở trẻ (ngoài việc trẻ không súc nước muối), răng khôn — không nguồn nào nêu. Món: chỉ có nhóm nguồn nêu (đồ ngọt, quá nóng, quá lạnh, sữa chua, trứng bác).
- nam-da-mat: CHỈ 1 nguồn (MedlinePlus). Chưa có: mỹ phẩm/kem trộn, tên hoạt chất (hydroquinone, tretinoin… nguồn chỉ nói "kem chứa một số chất"), nám do gen, nám ở nam, ăn uống/vitamin, nám có thành ung thư không, tàn nhang vs nám.
- lang-ben: chưa có: ăn uống, lang ben ở trẻ sơ sinh, dùng chung quần áo (nguồn chỉ nói không lây người–người), mẹo dân gian (lá trầu, chanh…).
- viem-nang-long: chỉ đọc trang Mayo "Symptoms & causes" (2022) + MedlinePlus; chưa đọc trang Mayo "Diagnosis & treatment". Chưa có: ăn uống, có lây không (nguồn không nói thẳng), phân biệt với mụn trứng cá.
- viem-gan-co: không cấp cứu (NHS chỉ nói gọi 111 khi rất đau/nghi đứt gân → đặt ở doctor). Chưa có: ăn uống, thời gian lành theo vị trí, viêm gân De Quervain/"ngón tay cò súng" (không nêu).
- bach-hau: không nguồn nào nêu dấu hiệu cấp cứu cụ thể; lịch tiêm cụ thể của Việt Nam (moh.gov.vn chưa đọc). Chưa có: bạch hầu ở người lớn đã tiêm hồi nhỏ có cần nhắc lại không (WHO chỉ nói cần mũi nhắc).
- bai-liet: không đưa con số liều vắc xin (CDC nêu số mũi IPV ở Mỹ — khác lịch VN). Chưa có: lịch tiêm VN, bại liệt do vắc xin (WHO chỉ có video, không có nội dung).
- dau-mua-khi: CHỈ 1 nguồn (WHO, 08/2024); CDC chặn. Chưa có: dấu hiệu cấp cứu cụ thể, vắc xin hiện có ở Việt Nam, ăn uống.
- cum-a-h5n1: trang NHS là "bird flu" nói chung (không riêng H5N1). Chưa có: thời gian ủ bệnh theo WHO (WHO không nêu; số 4–6 ngày là của NHS), tên thuốc kháng virus (cả hai nguồn không nêu), H5N1 ở bò sữa/sữa tươi chưa tiệt trùng (WHO chỉ nhắc ổ dịch bò sữa Mỹ, không nói về uống sữa). Món "tiết canh" được xếp vào nhóm "món gia cầm sống/chưa nấu chín" mà NHS nêu — người kiểm nên xác nhận cách xếp này.
