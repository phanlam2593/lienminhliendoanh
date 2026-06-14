DROP POLICY IF EXISTS "profiles read all" ON public.profiles;
CREATE POLICY "profiles read auth" ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.is_field_taken(_field text, _value text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE found boolean;
BEGIN
  IF _value IS NULL OR length(_value) = 0 THEN RETURN false; END IF;
  IF _field = 'username' THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = lower(_value)) INTO found;
  ELSIF _field = 'email' THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = _value) INTO found;
  ELSIF _field = 'phone' THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE phone = _value) INTO found;
  ELSE RETURN false; END IF;
  RETURN found;
END $$;
REVOKE ALL ON FUNCTION public.is_field_taken(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_field_taken(text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner update upload" ON storage.objects;
DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
DROP POLICY IF EXISTS "uploads anon insert" ON storage.objects;
DROP POLICY IF EXISTS "uploads anon read" ON storage.objects;
DROP POLICY IF EXISTS "uploads auth delete" ON storage.objects;
DROP POLICY IF EXISTS "uploads auth insert" ON storage.objects;
DROP POLICY IF EXISTS "uploads auth read" ON storage.objects;
DROP POLICY IF EXISTS "uploads auth update" ON storage.objects;

CREATE POLICY "uploads owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "uploads owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "uploads owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "uploads auth read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads');

REVOKE EXECUTE ON FUNCTION public.notify_suggestion_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_offer() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_report() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_profile_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_business_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_offer_claim_count() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;