
DROP VIEW IF EXISTS public.public_profiles;

-- Column-level grants: authenticated can only see non-sensitive columns of profiles
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, full_name, avatar_url, created_at) ON public.profiles TO authenticated;
-- Owner needs full row read (phone) — granted via separate policy + column grant
GRANT SELECT (phone, updated_at) ON public.profiles TO authenticated;
-- Wait: column GRANTs are role-level not row-level. Instead revoke phone from authenticated
REVOKE SELECT (phone) ON public.profiles FROM authenticated;

-- Add SELECT policy so authenticated can list directory rows
DROP POLICY IF EXISTS "Authenticated can read directory" ON public.profiles;
CREATE POLICY "Authenticated can read directory" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Recreate safe view (invoker mode) so it runs as caller and respects RLS + column grants
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Edge function / service_role for admin
GRANT ALL ON public.profiles TO service_role;
