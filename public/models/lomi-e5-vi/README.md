# lomi-e5-vi

Mô hình hiểu nghĩa câu cho Lomi (edge function `lomi-understand`), rút gọn từ **multilingual-e5-small**
(intfloat, giấy phép MIT — https://huggingface.co/intfloat/multilingual-e5-small; bản ONNX lượng tử hoá của Xenova).

Rút gọn: chỉ giữ ~35.000 mảnh chữ (trên 250.002) xuất hiện khi tách chữ văn bản tiếng Việt có dấu / không dấu và tiếng Anh;
phần còn lại của mô hình giữ nguyên (kết quả trùng bản gốc khi tắt tối ưu đồ thị). Dựng lại: `scripts/lomi-understand-model.py` (mô hình) và `scripts/lomi-understand-build.py` (câu mẫu cho máy chủ).

MIT License — Copyright (c) intfloat. Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files, to deal in the Software without restriction… (xem bản đầy đủ tại nguồn).
