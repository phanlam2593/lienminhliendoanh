create policy "Authenticated can read avatars bucket"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');