-- Lomi: nhật ký "Lomi bí" kèm HỘI THOẠI (09/10, theo ý Kir).
-- Mỗi lần Lomi bí khi admin (hoặc Claude, nguồn 'claude-test') hỏi thử → tự ghi 1 dòng: câu hỏi, câu Lomi đáp, vài lượt hội thoại trước đó,
-- loại "bí". Admin xem lại, chỗ nào sai thì sửa ở đó. Người dùng thường KHÔNG bị ghi bảng này (họ vẫn chỉ vào lomi_unanswered:
-- gộp câu trùng + đếm, không lưu người hỏi, không lưu hội thoại).
-- Client không ghi/đọc trực tiếp ngoài admin; ghi qua hàm SECURITY DEFINER chỉ cho admin.

CREATE TABLE IF NOT EXISTS public.lomi_stuck_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'app' CHECK (source IN ('app','claude-test')),
  kind text NOT NULL CHECK (kind ~ '^[a-z0-9_]{1,40}$'),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  reply text NOT NULL DEFAULT '' CHECK (char_length(reply) <= 1500),
  context jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','fixed','ignored')),
  note text CHECK (note IS NULL OR char_length(note) <= 500)
);
CREATE INDEX IF NOT EXISTS lomi_stuck_log_status_idx ON public.lomi_stuck_log(status, created_at DESC);
ALTER TABLE public.lomi_stuck_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lomi_stuck_log admin all" ON public.lomi_stuck_log;
CREATE POLICY "lomi_stuck_log admin all" ON public.lomi_stuck_log
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.lomi_stuck_log FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.lomi_stuck_log TO authenticated;

-- Ghi 1 lượt bí. Chỉ admin; người khác gọi sẽ bị bỏ qua lặng lẽ.
CREATE OR REPLACE FUNCTION public.lomi_log_stuck(_kind text, _question text, _reply text, _context jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN; END IF;
  IF _kind IS NULL OR _kind !~ '^[a-z0-9_]{1,40}$' OR _question IS NULL OR char_length(btrim(_question)) = 0 THEN RETURN; END IF;
  INSERT INTO public.lomi_stuck_log(source, kind, question, reply, context)
  VALUES ('app', _kind, left(_question, 500), left(coalesce(_reply, ''), 1500),
          CASE WHEN jsonb_typeof(_context) = 'array' AND jsonb_array_length(_context) <= 12 THEN _context ELSE '[]'::jsonb END);
END $$;
REVOKE ALL ON FUNCTION public.lomi_log_stuck(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lomi_log_stuck(text, text, text, jsonb) TO authenticated;
