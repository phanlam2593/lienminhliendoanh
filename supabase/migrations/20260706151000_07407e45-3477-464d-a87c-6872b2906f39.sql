
-- Sequential member number + one-time welcome popup flag
CREATE SEQUENCE IF NOT EXISTS public.profiles_member_number_seq;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_number bigint UNIQUE,
  ADD COLUMN IF NOT EXISTS has_seen_welcome boolean NOT NULL DEFAULT false;

-- Backfill existing rows in join order
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.profiles
  WHERE member_number IS NULL
)
UPDATE public.profiles p
SET member_number = o.rn
FROM ordered o
WHERE p.id = o.id;

-- Advance sequence past the max backfilled value
SELECT setval('public.profiles_member_number_seq',
  COALESCE((SELECT MAX(member_number) FROM public.profiles), 0) + 1,
  false);

-- Default for future inserts
ALTER TABLE public.profiles
  ALTER COLUMN member_number SET DEFAULT nextval('public.profiles_member_number_seq');

-- Existing users should not see the welcome popup — only truly new registrations
UPDATE public.profiles SET has_seen_welcome = true WHERE has_seen_welcome = false;
