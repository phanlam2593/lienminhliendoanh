
-- Restrict profiles direct access: only owner can read full row (including phone)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Public-safe view for member directory (no phone)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Allow authenticated users to list directory rows via the view by also
-- adding a SELECT policy on profiles restricted to safe columns is not possible;
-- instead expose a SECURITY DEFINER function to list directory entries safely.
CREATE OR REPLACE FUNCTION public.list_member_directory()
RETURNS TABLE(id uuid, full_name text, avatar_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name, avatar_url, created_at FROM public.profiles ORDER BY created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.list_member_directory() FROM public;
GRANT EXECUTE ON FUNCTION public.list_member_directory() TO authenticated;
