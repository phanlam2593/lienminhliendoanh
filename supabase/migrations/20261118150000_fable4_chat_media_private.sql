-- Fable phiên 4 — việc 1(c) (anh Kir duyệt): ảnh + tin thoại của TIN NHẮN RIÊNG / CHAT NHÓM chỉ người trong cuộc xem được.
--
-- Bucket riêng tư mới `chat`. Đường dẫn (do lib/upload tạo): <người gửi>/dm/<người nhận>/<uuid>.<ext>
--                                                         <người gửi>/g/<groupId>/<uuid>.<ext>
-- Đọc được: người gửi; người nhận (dm); thành viên nhóm (g); admin. Ghi: chỉ vào thư mục của chính mình
-- (nhóm thì phải đang là thành viên). Ảnh / tin thoại CŨ giữ nguyên ở `uploads` / `voice` (đã chặn liệt kê từ 15/11).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat', 'chat', false, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/gif','audio/webm','audio/mp4','audio/ogg','audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

-- Phân tích đường dẫn an toàn (không ép kiểu uuid trong policy → không lỗi với tên file lạ).
CREATE OR REPLACE FUNCTION public.chat_media_readable(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p text[] := string_to_array(_name, '/');
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR array_length(p, 1) < 4 THEN RETURN false; END IF;
  IF p[1] = v_uid::text OR public.has_role(v_uid, 'admin') THEN RETURN true; END IF;
  IF p[2] = 'dm' THEN RETURN p[3] = v_uid::text; END IF;
  IF p[2] = 'g' AND p[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN public.is_group_member(p[3]::uuid, v_uid);
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.chat_media_writable(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p text[] := string_to_array(_name, '/');
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR array_length(p, 1) < 4 OR p[1] <> v_uid::text THEN RETURN false; END IF;
  IF p[2] = 'dm' THEN RETURN p[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; END IF;
  IF p[2] = 'g' AND p[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN public.is_group_member(p[3]::uuid, v_uid);
  END IF;
  RETURN false;
END $$;

REVOKE ALL ON FUNCTION public.chat_media_readable(text), public.chat_media_writable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_media_readable(text), public.chat_media_writable(text) TO authenticated;

DROP POLICY IF EXISTS "chat media read" ON storage.objects;
CREATE POLICY "chat media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat' AND public.chat_media_readable(name));

DROP POLICY IF EXISTS "chat media insert" ON storage.objects;
CREATE POLICY "chat media insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat' AND public.chat_media_writable(name));

DROP POLICY IF EXISTS "chat media delete own" ON storage.objects;
CREATE POLICY "chat media delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat' AND (storage.foldername(name))[1] = (auth.uid())::text);
