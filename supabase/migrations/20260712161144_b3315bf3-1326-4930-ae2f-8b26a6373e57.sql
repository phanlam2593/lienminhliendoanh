
DO $$
DECLARE
  i int; uid uuid; uname text; v_full_name text; biz_id uuid; v_phone text; v_pin text;
  biz_specs jsonb := '[
    {"name":"Quán Ăn Cao Nguyên","type":"food","addr":"123 Bùi Thị Xuân, Phường 2, Đà Lạt","open":"07:00","close":"22:00","desc":"Quán ăn gia đình chuyên món Việt vùng cao.","offer":"Giảm 15% hóa đơn từ 200k","code":"CN15"},
    {"name":"Homestay Sương Mai","type":"stay","addr":"45 Trần Hưng Đạo, Phường 10, Đà Lạt","open":"00:00","close":"23:59","desc":"Homestay ấm cúng view thông và sương mù.","offer":"Miễn phí bữa sáng khi đặt 2 đêm","code":"SM2N"},
    {"name":"Tour Đà Lạt Xanh","type":"travel","addr":"78 Nguyễn Chí Thanh, Phường 1, Đà Lạt","open":"08:00","close":"18:00","desc":"Tour khám phá thiên nhiên Đà Lạt.","offer":"Giảm 100k tour trekking","code":"TREK100"},
    {"name":"Giặt Ủi Nhanh","type":"service","addr":"12 Phan Đình Phùng, Phường 1, Đà Lạt","open":"07:30","close":"20:00","desc":"Giặt ủi lấy nhanh trong ngày.","offer":"Giặt 5kg tặng 1kg","code":"GIAT51"},
    {"name":"Studio Ảnh Mộng Mơ","type":"creator","addr":"56 Ba Tháng Hai, Phường 1, Đà Lạt","open":"09:00","close":"19:00","desc":"Chụp ảnh chân dung, cưới hỏi phong cách Đà Lạt.","offer":"Tặng 5 ảnh in khi chụp gói cơ bản","code":"ANH5IN"},
    {"name":"Thiết Kế Web Freelance","type":"freelance","addr":"89 Nguyễn Văn Cừ, Phường 1, Đà Lạt","open":"09:00","close":"18:00","desc":"Nhận thiết kế landing page, web bán hàng nhỏ.","offer":"Giảm 20% cho khách hàng đầu tiên","code":"WEB20"},
    {"name":"Môi Giới BĐS Cao Nguyên","type":"broker","addr":"34 Hai Bà Trưng, Phường 6, Đà Lạt","open":"08:00","close":"17:30","desc":"Môi giới đất nền và nhà phố Đà Lạt.","offer":"Miễn phí tư vấn pháp lý lần đầu","code":"BDSFREE"},
    {"name":"Bánh Mì Sài Gòn","type":"food","addr":"100 Nguyễn Huệ, Phường Bến Nghé, TP.HCM","open":"06:00","close":"22:00","desc":"Bánh mì thịt nướng chuẩn vị Sài Gòn.","offer":"Mua 5 tặng 1","code":"BM51"},
    {"name":"Khách Sạn Biển Xanh","type":"stay","addr":"22 Trần Phú, Phường Lộc Thọ, Nha Trang","open":"00:00","close":"23:59","desc":"Khách sạn view biển trung tâm Nha Trang.","offer":"Giảm 10% đặt phòng online","code":"NT10"},
    {"name":"Cửa Hàng Tiện Lợi 24h","type":"other","addr":"55 Cầu Giấy, Phường Quan Hoa, Hà Nội","open":"00:00","close":"23:59","desc":"Cửa hàng tiện lợi mở cửa 24/7.","offer":"Giảm 5% cho thành viên","code":"HN5"}
  ]'::jsonb;
  spec jsonb;
BEGIN
  FOR i IN 1..10 LOOP
    uname := 'tester' || i;
    v_full_name := 'Tester ' || i;
    v_phone := '0900000' || lpad(i::text, 3, '0');
    v_pin := 'tst' || lpad(i::text, 2, '0');
    uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      is_super_admin, is_sso_user, is_anonymous
    ) VALUES (
      uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      uname || '@lienminh.local', crypt('test123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', uname, 'full_name', v_full_name, 'real_email', uname || '@lienminh.local', 'phone', v_phone),
      '', '', '', '', false, false, false
    );

    UPDATE public.profiles SET status = 'approved', full_name = v_full_name WHERE id = uid;

    spec := biz_specs -> (i - 1);
    INSERT INTO public.businesses (owner_id, name, type, description, hours_open, hours_close, address, status, cover_url)
    VALUES (
      uid, spec->>'name', (spec->>'type')::business_type, spec->>'desc',
      (spec->>'open')::time, (spec->>'close')::time,
      spec->>'addr', 'approved',
      'https://picsum.photos/seed/lmld' || i || '/800/500'
    ) RETURNING id INTO biz_id;

    INSERT INTO public.business_pins (business_id, pin) VALUES (biz_id, v_pin);

    INSERT INTO public.offers (business_id, title, description, code, status)
    VALUES (biz_id, spec->>'offer', spec->>'offer', spec->>'code', 'active');
  END LOOP;
END $$;
