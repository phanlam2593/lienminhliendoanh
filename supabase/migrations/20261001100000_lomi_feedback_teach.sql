-- Lomi: nút ⁉️ báo câu trả lời chưa ổn + admin dạy Lomi câu trả lời (01/10, theo ý Kir).
-- lomi_feedback: người dùng báo (câu hỏi, câu Lomi đáp, lý do, ghi chú). Chỉ admin đọc/sửa.
-- lomi_taught: câu trả lời admin dạy. Mọi người đăng nhập đọc được các câu đang bật; chỉ admin ghi.

CREATE TABLE IF NOT EXISTS public.lomi_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  answer text NOT NULL CHECK (char_length(answer) <= 4000),
  reason text NOT NULL DEFAULT 'unknown' CHECK (reason IN ('unknown','wrong','offtopic','other')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','taught','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lomi_feedback_status_idx ON public.lomi_feedback(status, created_at DESC);
ALTER TABLE public.lomi_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lomi_feedback insert own" ON public.lomi_feedback;
CREATE POLICY "lomi_feedback insert own" ON public.lomi_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'new');
DROP POLICY IF EXISTS "lomi_feedback admin all" ON public.lomi_feedback;
CREATE POLICY "lomi_feedback admin all" ON public.lomi_feedback
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.lomi_taught (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE CHECK (char_length(key) BETWEEN 1 AND 200),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  answer text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 4000),
  active boolean NOT NULL DEFAULT true,
  hits integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lomi_taught ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lomi_taught read active" ON public.lomi_taught;
CREATE POLICY "lomi_taught read active" ON public.lomi_taught
  FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "lomi_taught admin write" ON public.lomi_taught;
CREATE POLICY "lomi_taught admin write" ON public.lomi_taught
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- +1 lượt dùng câu đã dạy (để admin biết câu nào hữu ích).
CREATE OR REPLACE FUNCTION public.lomi_taught_hit(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.lomi_taught SET hits = hits + 1 WHERE id = _id AND active AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.lomi_taught_hit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lomi_taught_hit(uuid) TO authenticated;

-- Admin được xoá câu "bí" đã xử lý.
DROP POLICY IF EXISTS "lomi_unanswered admin delete" ON public.lomi_unanswered;
CREATE POLICY "lomi_unanswered admin delete" ON public.lomi_unanswered
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lomi_feedback, public.lomi_taught TO authenticated;
