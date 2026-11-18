-- Fable phiên 4 (15/11/2026) — kho ảnh / ghi âm riêng tư, bước nhỏ an toàn (anh Kir đã duyệt).
--
-- (a) CHẶN LIỆT KÊ: trước đây mọi người đã đăng nhập gọi API "list" là thấy toàn bộ file trong `uploads` / `voice`
--     (ảnh tin nhắn riêng, tin thoại…). RLS của storage không tách được "liệt kê" với "đọc 1 file", nên nhận biết bằng
--     câu lệnh đang chạy: API liệt kê của Supabase Storage luôn gọi các hàm storage.search* / list_objects_with_delimiter.
--     Khi đang liệt kê → chỉ thấy file trong thư mục của CHÍNH MÌNH (admin thấy hết). Đọc 1 file khi biết đúng đường dẫn
--     (app vẫn làm vậy để hiện ảnh) không đổi. Nếu sau này Storage đổi cách liệt kê thì quay về như cũ (không hỏng app).
-- (b) GIẤY TỜ TÀI XẾ: bucket riêng tư mới `driver-docs`. Ảnh bằng lái + ảnh xe: chỉ chủ hồ sơ + admin. Ảnh chân dung:
--     thêm khách của chuyến do tài xế đó nhận (khách cần nhận mặt người tới đón).

CREATE OR REPLACE FUNCTION public.storage_is_listing()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT current_query() ~* '\m(search|search_v2|search_by_timestamp|list_objects_with_delimiter)\M"?\s*\('
$$;

DROP POLICY IF EXISTS "uploads auth read" ON storage.objects;
CREATE POLICY "uploads auth read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'uploads'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
    OR NOT public.storage_is_listing()
  )
);

DROP POLICY IF EXISTS "Authenticated users can read voice files" ON storage.objects;
CREATE POLICY "Authenticated users can read voice files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
    OR NOT public.storage_is_listing()
  )
);

-- ── (b) ──
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('driver-docs', 'driver-docs', false, 5242880)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "driver docs owner insert" ON storage.objects;
CREATE POLICY "driver docs owner insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "driver docs owner delete" ON storage.objects;
CREATE POLICY "driver docs owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "driver docs read" ON storage.objects;
CREATE POLICY "driver docs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-docs'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
    OR (
      (storage.foldername(name))[2] = 'portrait'
      AND EXISTS (
        SELECT 1 FROM public.rides r
        WHERE r.customer_id = auth.uid()
          AND (r.driver_id)::text = (storage.foldername(name))[1]
          AND r.status IN ('accepted', 'picked_up', 'completed')
      )
    )
  )
);
