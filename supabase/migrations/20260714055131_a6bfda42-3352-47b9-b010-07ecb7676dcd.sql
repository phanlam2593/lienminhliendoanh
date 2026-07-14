
UPDATE public.profiles SET username='minhkhoi', full_name='Trần Minh Khôi' WHERE id='bdd640fb-0667-1ad1-1c80-317fa3b1799d';
UPDATE public.profiles SET username='thuytien', full_name='Lê Thùy Tiên' WHERE id='23b8c1e9-3924-56de-3eb1-3b9046685257';
UPDATE public.profiles SET username='hoanglong', full_name='Phạm Hoàng Long' WHERE id='bd9c66b3-ad3c-2d6d-1a3d-1fa7bc8960a9';
UPDATE public.profiles SET username='ngocanh', full_name='Vũ Ngọc Anh' WHERE id='972a8469-1641-9f82-8b9d-2434e465e150';
UPDATE public.profiles SET username='quanghuy', full_name='Bùi Quang Huy' WHERE id='17fc695a-07a0-ca6e-0822-e8f36c031199';

UPDATE auth.users SET email='minhkhoi@lienminh.local', raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username','minhkhoi','full_name','Trần Minh Khôi') WHERE id='bdd640fb-0667-1ad1-1c80-317fa3b1799d';
UPDATE auth.users SET email='thuytien@lienminh.local', raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username','thuytien','full_name','Lê Thùy Tiên') WHERE id='23b8c1e9-3924-56de-3eb1-3b9046685257';
UPDATE auth.users SET email='hoanglong@lienminh.local', raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username','hoanglong','full_name','Phạm Hoàng Long') WHERE id='bd9c66b3-ad3c-2d6d-1a3d-1fa7bc8960a9';
UPDATE auth.users SET email='ngocanh@lienminh.local', raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username','ngocanh','full_name','Vũ Ngọc Anh') WHERE id='972a8469-1641-9f82-8b9d-2434e465e150';
UPDATE auth.users SET email='quanghuy@lienminh.local', raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username','quanghuy','full_name','Bùi Quang Huy') WHERE id='17fc695a-07a0-ca6e-0822-e8f36c031199';
