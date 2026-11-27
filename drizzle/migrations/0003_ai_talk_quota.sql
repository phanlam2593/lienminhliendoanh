-- 27/11 (Kir: "tâm sự để AI lo — dùng Sonnet; trước mắt chưa tính Membership"): lượt trò chuyện với AI ở tab Tâm sự.
--   Ai đăng nhập cũng dùng được (KHÔNG yêu cầu Membership). Chốt chi phí: 60 tin / người / ngày, 1.500 tin / ngày cho cả app.
--   Tách riêng khỏi ai_chat_daily_usage (lượt "Lomi bí → nhờ AI", 20 câu / người, chỉ Membership).
create table if not exists public.ai_talk_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.ai_talk_daily_usage enable row level security;
-- Người dùng chỉ xem được số lượt của chính mình (không sửa / thêm trực tiếp — chỉ qua hàm bên dưới).
create policy "ai_talk_usage_select_own" on public.ai_talk_daily_usage for select to authenticated using (auth.uid() = user_id);

create or replace function public.consume_ai_talk_quota()
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; used int; cap int := 60; gcap int := 1500; total int;
begin
  if uid is null then raise exception 'NOT_AUTH'; end if;
  select coalesce(sum(n), 0) into total from ai_talk_daily_usage where day = d;
  if total >= gcap then raise exception 'AI_BUSY_GLOBAL'; end if;
  insert into ai_talk_daily_usage(user_id, day, n) values (uid, d, 1)
  on conflict (user_id, day) do update set n = ai_talk_daily_usage.n + 1
  returning n into used;
  if used > cap then
    update ai_talk_daily_usage set n = cap where user_id = uid and day = d;
    raise exception 'AI_LIMIT';
  end if;
  return cap - used;
end $$;

create or replace function public.refund_ai_talk_quota(_uid uuid)
returns void language sql security definer set search_path = public as $$
  update ai_talk_daily_usage set n = greatest(n - 1, 0) where user_id = _uid and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

revoke all on function public.consume_ai_talk_quota() from public, anon;
grant execute on function public.consume_ai_talk_quota() to authenticated;
revoke all on function public.refund_ai_talk_quota(uuid) from public, anon, authenticated;
