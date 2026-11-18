-- Fable phiên 4 — 2 lỗi nhỏ (anh Kir duyệt 15/11). Đã chạy trên DB thật 18/11.
--
-- 1) claim_offer: số mã (seq = max+1 theo DN) không khoá → 2 người nhận cùng tích tắc ra TRÙNG mã (DB thật đã có 1 cặp
--    trùng, nên không thêm UNIQUE được). Thêm khoá theo DN tới hết giao dịch, ngay trước bước kiểm "đã có mã còn hạn"
--    → vừa hết trùng số, vừa không ra 2 mã khi 1 người bấm 2 lần cùng lúc. Vá tại chỗ (giữ nguyên phần còn lại của hàm).
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.claim_offer(uuid,text)'::regprocedure);
  IF position('pg_advisory_xact_lock' in d) = 0 THEN
    d := replace(d, E'  SELECT * INTO existing FROM public.offer_claims\n',
      E'  -- 18/11: khoá theo DN tới hết giao dịch — 2 người nhận cùng tích tắc không còn ra trùng số mã (seq = max+1),\n  -- và 1 người bấm 2 lần cùng lúc không ra 2 mã.\n  PERFORM pg_advisory_xact_lock(hashtextextended(''claim_offer:'' || biz_id::text, 0));\n\n  SELECT * INTO existing FROM public.offer_claims\n');
    IF position('pg_advisory_xact_lock' in d) = 0 THEN RAISE EXCEPTION 'patch point not found'; END IF;
    EXECUTE d;
  END IF;
END $do$;

-- 2) businesses_explore_view lộ cột admin_note (ghi chú admin) cho cả người chưa đăng nhập. Không màn nào đọc cột này
--    từ view (Admin đọc thẳng bảng businesses). Dựng lại view bỏ cột đó, giữ nguyên quyền đọc.
BEGIN;
DROP VIEW public.businesses_explore_view;
CREATE VIEW public.businesses_explore_view AS
 SELECT b.id, b.owner_id, b.name, b.type, b.description, b.hours_open, b.hours_close, b.phone, b.address,
    b.facebook_url, b.website_url, b.cover_url, b.is_featured, b.status, b.created_at, b.updated_at,
    b.tiktok_url, b.instagram_url, b.youtube_url, b.points, b.level, b.latitude, b.longitude, b.area,
    b.total_claims, b.name_unaccent, b.is_online,
    s.rating, s.review_count, s.offer_count, s.latest_offer, s.latest_offer_claims,
    s.latest_review_rating, s.latest_review_comment, s.latest_review_author
   FROM businesses b
     LEFT JOIN business_card_stats s ON s.business_id = b.id
  WHERE b.status = 'approved'::business_status;
GRANT SELECT ON public.businesses_explore_view TO anon, authenticated;
GRANT ALL ON public.businesses_explore_view TO service_role;
COMMIT;
