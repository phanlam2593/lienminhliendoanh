
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_own_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

-- Also allow owner to UPDATE phone via existing UPDATE policy; ensure column UPDATE grant
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;
