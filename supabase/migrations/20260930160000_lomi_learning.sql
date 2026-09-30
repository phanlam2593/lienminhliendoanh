-- Lomi tự học (30/09, theo ý Kir): ghi câu Lomi chưa trả lời được (gộp trùng + đếm, KHÔNG lưu người hỏi)
-- và tự học "câu lạ → câu hỏi thường gặp" khi người dùng chọn gợi ý / hỏi lại trúng.
-- Chỉ đọc/ghi qua hàm SECURITY DEFINER; bảng không cho client đọc trực tiếp (trừ admin).

CREATE TABLE IF NOT EXISTS public.lomi_unanswered (
  key text PRIMARY KEY CHECK (char_length(key) BETWEEN 1 AND 200),
  sample text NOT NULL CHECK (char_length(sample) <= 300),
  ask_count integer NOT NULL DEFAULT 1,
  first_at timestamptz NOT NULL DEFAULT now(),
  last_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lomi_unanswered ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lomi_unanswered admin read" ON public.lomi_unanswered;
CREATE POLICY "lomi_unanswered admin read" ON public.lomi_unanswered
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.lomi_learned (
  key text NOT NULL CHECK (char_length(key) BETWEEN 1 AND 200),
  faq_id text NOT NULL CHECK (faq_id ~ '^[a-z0-9_-]{1,40}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, faq_id, user_id)
);
ALTER TABLE public.lomi_learned ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lomi_learned admin read" ON public.lomi_learned;
CREATE POLICY "lomi_learned admin read" ON public.lomi_learned
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Ghi 1 lượt "Lomi bí" (gộp theo key đã chuẩn hoá).
CREATE OR REPLACE FUNCTION public.lomi_log_unanswered(_key text, _sample text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _key IS NULL OR char_length(_key) NOT BETWEEN 1 AND 200 THEN RETURN; END IF;
  INSERT INTO public.lomi_unanswered(key, sample) VALUES (_key, left(coalesce(_sample, _key), 300))
  ON CONFLICT (key) DO UPDATE SET ask_count = public.lomi_unanswered.ask_count + 1, last_at = now();
END $$;

-- Ghi 1 phiếu "câu lạ này thật ra là câu hỏi X"; xoá khỏi danh sách "bí" khi đã học.
CREATE OR REPLACE FUNCTION public.lomi_learn(_key text, _faq_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _key IS NULL OR char_length(_key) NOT BETWEEN 1 AND 200 OR _faq_id !~ '^[a-z0-9_-]{1,40}$' THEN RETURN; END IF;
  INSERT INTO public.lomi_learned(key, faq_id, user_id) VALUES (_key, _faq_id, auth.uid()) ON CONFLICT DO NOTHING;
  IF (SELECT count(*) FROM public.lomi_learned WHERE key = _key AND faq_id = _faq_id) >= 2 THEN
    DELETE FROM public.lomi_unanswered WHERE key = _key;
  END IF;
END $$;

-- Tra câu đã học: dùng khi có ≥2 người khác nhau xác nhận, hoặc chính người này từng xác nhận.
CREATE OR REPLACE FUNCTION public.lomi_lookup(_key text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT faq_id FROM public.lomi_learned
  WHERE key = _key AND auth.uid() IS NOT NULL
  GROUP BY faq_id
  HAVING count(*) >= 2 OR bool_or(user_id = auth.uid())
  ORDER BY count(*) DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lomi_log_unanswered(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lomi_learn(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lomi_lookup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lomi_log_unanswered(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lomi_learn(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lomi_lookup(text) TO authenticated;
