-- Lomi: đếm chủ đề được hỏi nhiều (01/10, theo ý Kir — nút 💡 "Chủ đề hot" trong khung chat Lomi).
-- Chỉ lưu KHOÁ chủ đề + số lượt (vd "tarot", "food", "faq:claim"), KHÔNG lưu ai hỏi hay nội dung câu hỏi.
-- Client không đọc/ghi bảng trực tiếp; chỉ qua 2 hàm SECURITY DEFINER bên dưới.

CREATE TABLE IF NOT EXISTS public.lomi_topic_stats (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9:_-]{1,60}$'),
  hits bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lomi_topic_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lomi_topic_stats admin read" ON public.lomi_topic_stats;
CREATE POLICY "lomi_topic_stats admin read" ON public.lomi_topic_stats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- +1 lượt cho một chủ đề (cần đăng nhập).
CREATE OR REPLACE FUNCTION public.lomi_topic_hit(_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _key IS NULL OR _key !~ '^[a-z0-9:_-]{1,60}$' THEN RETURN; END IF;
  INSERT INTO public.lomi_topic_stats(key, hits) VALUES (_key, 1)
  ON CONFLICT (key) DO UPDATE SET hits = public.lomi_topic_stats.hits + 1, updated_at = now();
END $$;

-- Top chủ đề (chỉ khoá + số lượt, không có dữ liệu cá nhân).
CREATE OR REPLACE FUNCTION public.lomi_top_topics(_n integer DEFAULT 8)
RETURNS TABLE(key text, hits bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.key, s.hits FROM public.lomi_topic_stats s
  WHERE auth.uid() IS NOT NULL
  ORDER BY s.hits DESC, s.updated_at DESC
  LIMIT LEAST(GREATEST(coalesce(_n, 8), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.lomi_topic_hit(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lomi_top_topics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lomi_topic_hit(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lomi_top_topics(integer) TO authenticated;
