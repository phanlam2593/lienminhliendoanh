
DO $$
DECLARE
  b1 uuid := gen_random_uuid();
  b2 uuid := gen_random_uuid();
  b3 uuid := gen_random_uuid();
  b4 uuid := gen_random_uuid();
  b5 uuid := gen_random_uuid();
  b6 uuid := gen_random_uuid();
BEGIN
INSERT INTO public.businesses (id, owner_id, name, category, description, address, phone, website, image_url, status, featured) VALUES
(b1, NULL, 'Cafe Sương Mai', 'an_uong', 'Cafe view đẹp, không gian ấm cúng, đồ uống chuẩn vị Ý.', '12 Nguyễn Huệ, Q.1, TP.HCM', '0901234567', 'https://cafesuongmai.vn', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', 'approved', true),
(b2, NULL, 'Nhà hàng Hương Quê', 'an_uong', 'Đặc sản miền Tây, nguyên liệu tươi sạch mỗi ngày.', '45 Lê Lợi, Q.1, TP.HCM', '0907654321', NULL, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'approved', false),
(b3, NULL, 'Spa Lavender', 'dich_vu', 'Spa cao cấp, liệu trình thư giãn chuyên nghiệp.', '88 Trần Hưng Đạo, Q.5', '0912345678', 'https://lavender.vn', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', 'approved', true),
(b4, NULL, 'Homestay Đà Lạt View', 'luu_tru', 'Homestay view đồi thông, sương mù lãng mạn.', '20 Trần Phú, Đà Lạt', '0933333333', NULL, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'approved', false),
(b5, NULL, 'Tour Phú Quốc Express', 'du_lich', 'Tour 3N2Đ Phú Quốc trọn gói, giá tốt nhất thị trường.', 'Bến Tàu Rạch Giá', '0944444444', NULL, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 'approved', false),
(b6, NULL, 'Tiệm Hoa Tươi An Nhiên', 'khac', 'Hoa tươi nhập khẩu, bó hoa thiết kế theo yêu cầu.', '5 Pasteur, Q.3', '0955555555', NULL, 'https://images.unsplash.com/photo-1561181286-d5c92b600a8b?w=800', 'approved', false);

INSERT INTO public.offers (business_id, title, description, code) VALUES
(b1, 'Giảm 20% toàn menu cho thành viên', 'Áp dụng từ T2-T6', 'CAFE20'),
(b2, 'Tặng lẩu mắm khi đi nhóm 4 người', 'Không kèm khuyến mãi khác', 'HUONGQUE'),
(b3, 'Combo massage + xông hơi 299K', 'Tiết kiệm 40%', 'SPA40'),
(b4, 'Giảm 15% đặt phòng cuối tuần', NULL, 'DALAT15'),
(b5, 'Voucher 500K cho thành viên mới', NULL, 'PQ500'),
(b6, 'Tặng thiệp + freeship nội thành', NULL, 'HOATUOI');

-- ratings từ user đầu tiên (nếu có) để hiện sao
INSERT INTO public.reviews (business_id, user_id, rating, content)
SELECT b, (SELECT id FROM auth.users LIMIT 1), r, c
FROM (VALUES
  (b1, 5, 'Tuyệt vời'),
  (b1, 4, 'Ngon'),
  (b2, 5, 'Đậm đà'),
  (b3, 5, 'Thư giãn'),
  (b4, 4, 'View đẹp'),
  (b5, 5, 'Đáng tiền')
) v(b, r, c)
WHERE EXISTS (SELECT 1 FROM auth.users);
END $$;
