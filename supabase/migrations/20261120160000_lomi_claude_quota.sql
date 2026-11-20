-- 20/11 (Kir duyệt): Lomi hỏi Claude (Anthropic API, trả trước) cho câu Lomi bí — chốt chi phí ở server:
--   tối đa 20 câu / người / ngày (trước 200 — đặt hồi AI miễn phí) và 300 câu / ngày cho cả app.
--   Hết trần → RAISE 'AI_LIMIT' / 'AI_BUSY_GLOBAL', app tự quay về câu trả lời trên máy.
--   Vẫn chỉ cho thành viên Membership còn hạn (is_active_member) như trước.
CREATE OR REPLACE FUNCTION public.consume_ai_chat_quota()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); d date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date; used int; cap int := 20; gcap int := 300; total int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTH'; END IF;
  IF NOT public.is_active_member(uid) THEN RAISE EXCEPTION 'MEMBER_ONLY'; END IF;
  SELECT coalesce(sum(n), 0) INTO total FROM ai_chat_daily_usage WHERE day = d;
  IF total >= gcap THEN RAISE EXCEPTION 'AI_BUSY_GLOBAL'; END IF;
  INSERT INTO ai_chat_daily_usage(user_id, day, n) VALUES (uid, d, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET n = ai_chat_daily_usage.n + 1
  RETURNING n INTO used;
  IF used > cap THEN
    UPDATE ai_chat_daily_usage SET n = cap WHERE user_id=uid AND day=d;
    RAISE EXCEPTION 'AI_LIMIT';
  END IF;
  RETURN cap - used;
END $function$;
REVOKE EXECUTE ON FUNCTION public.consume_ai_chat_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_chat_quota() TO authenticated, service_role;
-- Số hiển thị khớp trần mới.
CREATE OR REPLACE FUNCTION public.get_my_ai_quota()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('member', public.is_active_member(auth.uid()), 'limit', 20,
    'used', COALESCE((SELECT n FROM public.ai_chat_daily_usage WHERE user_id=auth.uid() AND day=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),0));
$function$;
