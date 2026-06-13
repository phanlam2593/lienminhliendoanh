REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_own_profile() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;
