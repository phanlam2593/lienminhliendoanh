# Bộ kiểm toán 1.000 câu của Lomi (thước đo, KHÔNG phải test CI)

- `cases.json` — 985 ca chấm được (id, turns = lịch sử + câu hỏi) lấy từ đợt kiểm toán read-only của Lovable 09–11/11/2026.
- `ket_qua_lovable.csv` — kết quả gốc của Lovable: `lop_mong_doi` (lớp đúng: health/heart/faq/food/tarot/biz/safety/chat/askback, có thể `a/b`), `lop_thuc_te`, `loi_dap_lomi`…
- `BAO_CAO_KIEM_TOAN_LOVABLE.md` — báo cáo gốc (P0–P3 + 6 đề xuất kiến trúc).
- `baseline/run_1311.json` — câu trả lời của Lomi ngày 13/11/2026 (88,8%).

Chạy: `bash scripts/lomi-audit/rerun.sh` (từ gốc repo) → in % đúng theo từng lớp. Lỗi theo lớp: `python3 -I scripts/lomi-audit/fails.py <lớp_mong_đợi> [lớp_thực_tế] [độ_dài]`. So với baseline từng câu: `python3 -I scripts/lomi-audit/diff_baseline.py`.

Cách chấm: lớp của câu trả lời = `vibench.classify` (src/test/vibench); câu trả lời không đổi so với lúc Lovable chấm (70 ký tự đầu giống) thì giữ nhãn của Lovable. `askback` đúng nếu Lomi hỏi lại. Thước đo thô — luôn đọc câu trả lời thật, đừng tối ưu cho bộ chấm.
