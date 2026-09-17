CREATE POLICY "Users can upload their own voice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can read voice files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice');

CREATE POLICY "Users can delete their own voice files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice' AND auth.uid()::text = (storage.foldername(name))[1]);