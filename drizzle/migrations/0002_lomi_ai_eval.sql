-- 27/11 (Kir: "tâm sự để AI lo" — đo trước rồi mới quyết): bảng chạy thử câu trả lời AI cho bộ test của Lomi.
-- Chỉ edge function lomi-eval (service role) đọc / ghi. Bật RLS, KHÔNG có policy nào → người dùng app không đọc / ghi được.
create table if not exists public.lomi_ai_eval (
  id bigserial primary key,
  batch text not null,
  label text,
  note text,
  turns jsonb not null,            -- mảng câu người dùng, chạy lần lượt (hội thoại nhiều lượt)
  replies jsonb,                   -- mảng câu AI trả lời tương ứng
  ms integer,
  in_tok integer,
  out_tok integer,
  status text not null default 'pending',  -- pending | running | done | error
  error text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists lomi_ai_eval_batch_status on public.lomi_ai_eval (batch, status);
alter table public.lomi_ai_eval enable row level security;

-- Mã chạy thử (chỉ service role đọc). Function so mã trong header với bảng này.
create table if not exists public.lomi_eval_keys (
  key text primary key,
  created_at timestamptz not null default now()
);
alter table public.lomi_eval_keys enable row level security;