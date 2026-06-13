
DROP FUNCTION IF EXISTS public.list_member_directory();
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, avatar_url, created_at
FROM public.profiles;

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated;
