-- 20/11 (Kir): "thư viện" câu Claude đã trả lời cho Lomi — lần sau ai hỏi đúng câu đó thì lấy từ đây, không gọi Claude.
--   key   = câu hỏi chuẩn hoá (chữ thường, giữ dấu, bỏ dấu câu / lời mở đầu / tiểu từ cuối) — xem cacheKey() trong edge function lomi-claude.
--   scope = 'ok' (có câu trả lời dùng chung được) | 'out' (ngoài 4 mục chính của Lomi — nhớ để khỏi hỏi Claude lại).
--   Chỉ edge function (service role) ghi; admin được xem. Người dùng thường không đọc / ghi trực tiếp.
CREATE TABLE IF NOT EXISTS public.lomi_claude_answers (
  key text PRIMARY KEY,
  question text NOT NULL,
  answer text,
  scope text NOT NULL CHECK (scope IN ('ok','out')),
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_hit_at timestamptz
);
ALTER TABLE public.lomi_claude_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lomi_claude_answers admin read" ON public.lomi_claude_answers;
CREATE POLICY "lomi_claude_answers admin read" ON public.lomi_claude_answers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE ALL ON public.lomi_claude_answers FROM anon;
-- Admin xoá được câu đã lưu (trang Quản trị → Lomi học hỏi → ✨ Claude đã trả lời), như các bảng Lomi học hỏi khác.
DROP POLICY IF EXISTS "lomi_claude_answers admin delete" ON public.lomi_claude_answers;
CREATE POLICY "lomi_claude_answers admin delete" ON public.lomi_claude_answers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
GRANT SELECT, DELETE ON public.lomi_claude_answers TO authenticated;
