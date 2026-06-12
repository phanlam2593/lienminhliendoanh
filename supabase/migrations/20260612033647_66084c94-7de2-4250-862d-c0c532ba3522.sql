
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Storage policies for uploads bucket
CREATE POLICY "Public read uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Owner update upload" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'uploads' AND owner = auth.uid());
CREATE POLICY "Owner delete upload" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads' AND owner = auth.uid());
