# Làm lại câu chữ thẻ bệnh (medkb) theo đợt ChatGPT — 26/11, Kir

- PROMPT.md: prompt Kir dán vào ChatGPT; danh-sach-dot.txt: 1.497 thẻ chia 300 đợt × 5 (đợt 1–85 = 423 bệnh thường gặp).
- Mỗi đợt: lưu nguyên văn kết quả ChatGPT → dot-NNN.md.
- Kiểm nguồn (BẮT BUỘC): mở từng link bằng WebFetch, đối chiếu từng câu trích; ghi dot-NNN.verify.json
  { "checked": [link đã kiểm], "drop": [đầu câu cần bỏ], "edit": { "đầu câu": "câu sửa" } }.
  Link không có trong "checked" → mọi ý trỏ tới nó bị bỏ.
- Chạy: python3 scripts/medkb-gpt-merge.py scripts/medkb-gpt/dot-NNN.md (thêm --dry để xem trước).
  Thay about/signs/causes/course/care bằng ý mới; doctor/emergency = ý mới + giữ ý cũ (an toàn); care giữ ý cũ về thuốc;
  diet.foods thêm nhóm mới (trùng tên gọi với nhóm cũ → chỉ thêm tên gọi).
- Sau đó: tsc → vitest → vite build → push → Kir publish. Test cũ hỏng vì câu chữ đổi → sửa câu trong verify.json "edit" (giữ ý cũ đã kiểm), không sửa test cho qua.
- "3 câu hỏi hay gặp" của ChatGPT chưa dùng (chỉ để tham khảo cách nói).
