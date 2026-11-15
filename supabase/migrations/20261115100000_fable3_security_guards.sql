-- Fable phiên 3 (15/11/2026): rà bảo mật toàn app. KHÔNG nới RLS nào; chỉ thêm chốt chặn.
--
-- 1) award_member_points(_user_id,_amount) là SECURITY DEFINER, không kiểm người gọi, ai cũng EXECUTE được
--    → bất kỳ ai (kể cả chưa đăng nhập) tự cộng điểm cho mình / trừ điểm người khác. Thu quyền gọi trực tiếp;
--    trigger nhận ưu đãi (chạy với quyền chủ hàm) vẫn gọi được.
-- 2) View member_last_login / business_customer_visits / exchanges_view chạy bằng quyền chủ view (bỏ qua RLS)
--    và cấp SELECT cho cả anon → ai cũng đọc được lần đăng nhập cuối của mọi thành viên, ai nhận ưu đãi ở đâu.
--    Chuyển sang security_invoker (RLS của bảng gốc áp cho người xem) + thu quyền anon.
-- 3) reports: chủ DN bị báo cáo sửa được nội dung / ảnh của báo cáo; người báo cáo tự bật "chủ DN xác nhận đã xử lý".
-- 4) Khoá cột không được đổi sau khi tạo: reviews, wall_posts, wall_post_comments, report_replies, offers
--    (vd chủ DN tự chỉnh claim_count, đổi created_at để đẩy bài lên đầu, chuyển đánh giá sang DN khác).
-- 5) offer_claims: không nhận được ưu đãi đã tắt hoặc của DN chưa/không còn được duyệt (#19 chốt ở server).
-- 6) notify_mention: chỉ thành viên đã duyệt, không gửi cho người đã chặn nhau, cắt độ dài.
-- 7) broadcast_offer: cùng một ưu đãi không báo lại cho người theo dõi trong vòng 1 giờ (trước đây bấm bao nhiêu
--    lần là bấy nhiêu thông báo + push).
-- 8) Quẹt: đổi action bằng UPDATE trực tiếp (không qua app) né giới hạn 10 lượt/ngày → đếm cả UPDATE,
--    không đếm 2 lần khi app upsert.

-- ── 1) ──
REVOKE EXECUTE ON FUNCTION public.award_member_points(uuid, integer) FROM PUBLIC, anon, authenticated;

-- ── 2) ──
ALTER VIEW public.member_last_login SET (security_invoker = true);
ALTER VIEW public.business_customer_visits SET (security_invoker = true);
ALTER VIEW public.exchanges_view SET (security_invoker = true);
REVOKE SELECT ON public.member_last_login, public.business_customer_visits, public.exchanges_view FROM anon;

-- ── 3) reports ──
CREATE OR REPLACE FUNCTION public.guard_report_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_author boolean;
  v_owner boolean;
BEGIN
  IF current_user NOT IN ('authenticated','anon') OR public.has_role(v_uid,'admin') THEN
    RETURN NEW;
  END IF;
  NEW.id := OLD.id; NEW.user_id := OLD.user_id; NEW.target_type := OLD.target_type;
  NEW.target_id := OLD.target_id; NEW.created_at := OLD.created_at;
  v_author := v_uid IS NOT DISTINCT FROM OLD.user_id;
  v_owner := OLD.target_type = 'business' AND EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = OLD.target_id AND b.owner_id = v_uid);
  IF NOT v_author THEN
    -- Không phải người báo cáo → không sửa được lời báo cáo, ảnh, nơi gửi.
    NEW.description := OLD.description; NEW.photo_url := OLD.photo_url;
    NEW.send_to_admin := OLD.send_to_admin; NEW.send_to_business := OLD.send_to_business;
    -- Chủ DN chỉ được XOÁ câu trả lời hài lòng cũ (khi xác nhận đã xử lý lại), không tự điền thay người báo cáo.
    IF NEW.reporter_satisfied IS NOT NULL THEN NEW.reporter_satisfied := OLD.reporter_satisfied; END IF;
  END IF;
  IF NOT v_owner THEN
    NEW.owner_confirmed_resolved := OLD.owner_confirmed_resolved;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_00_guard_report_columns ON public.reports;
CREATE TRIGGER trg_00_guard_report_columns BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_columns();

-- ── 4) Khoá cột bất biến (danh sách cột truyền qua tham số trigger) ──
CREATE OR REPLACE FUNCTION public.guard_immutable_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_old jsonb := to_jsonb(OLD);
  v_keep jsonb := '{}'::jsonb;
  c text;
BEGIN
  IF current_user NOT IN ('authenticated','anon') OR public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;
  FOREACH c IN ARRAY TG_ARGV LOOP
    v_keep := v_keep || jsonb_build_object(c, v_old -> c);
  END LOOP;
  NEW := jsonb_populate_record(NEW, v_keep);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_00_guard_immutable ON public.reviews;
CREATE TRIGGER trg_00_guard_immutable BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('id','user_id','business_id','created_at');
DROP TRIGGER IF EXISTS trg_00_guard_immutable ON public.wall_posts;
CREATE TRIGGER trg_00_guard_immutable BEFORE UPDATE ON public.wall_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('id','user_id','created_at');
DROP TRIGGER IF EXISTS trg_00_guard_immutable ON public.wall_post_comments;
CREATE TRIGGER trg_00_guard_immutable BEFORE UPDATE ON public.wall_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('id','post_id','user_id','created_at');
DROP TRIGGER IF EXISTS trg_00_guard_immutable ON public.report_replies;
CREATE TRIGGER trg_00_guard_immutable BEFORE UPDATE ON public.report_replies
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('id','report_id','author_id','created_at');
DROP TRIGGER IF EXISTS trg_00_guard_immutable ON public.offers;
CREATE TRIGGER trg_00_guard_immutable BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('id','created_at','claim_count');

CREATE OR REPLACE FUNCTION public.guard_offer_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.claim_count := 0; NEW.created_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_00_guard_offer_insert ON public.offers;
CREATE TRIGGER trg_00_guard_offer_insert BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_offer_insert();

-- ── 5) offer_claims ──
CREATE OR REPLACE FUNCTION public.guard_offer_claim_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.offers o JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = NEW.offer_id AND o.status = 'active' AND b.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Ưu đãi này hiện không còn áp dụng' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_00_guard_offer_claim_insert ON public.offer_claims;
CREATE TRIGGER trg_00_guard_offer_claim_insert BEFORE INSERT ON public.offer_claims
  FOR EACH ROW EXECUTE FUNCTION public.guard_offer_claim_insert();

-- ── 6) notify_mention ──
CREATE OR REPLACE FUNCTION public.notify_mention(_target_user_id uuid, _title text, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _target_user_id = auth.uid() then return; end if;
  if not (public.is_approved_member(auth.uid()) or public.has_role(auth.uid(),'admin')) then return; end if;
  if public.is_blocked(auth.uid(), _target_user_id) then return; end if;
  if not public.notif_pref_allowed(_target_user_id, 'mentions') then return; end if;
  insert into public.notifications (user_id, type, category, title, body)
  values (_target_user_id, 'mention', null, left(coalesce(_title,''), 120), left(coalesce(_body,''), 300));
end; $$;

-- ── 7) broadcast_offer ──
CREATE OR REPLACE FUNCTION public.broadcast_offer(_offer_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  o public.offers;
  biz public.businesses;
  inserted int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o IS NULL THEN RAISE EXCEPTION 'offer not found'; END IF;
  SELECT * INTO biz FROM public.businesses WHERE id = o.business_id;
  IF NOT (public.has_role(uid,'admin') OR biz.owner_id = uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- Cùng ưu đãi này vừa được báo trong 1 giờ qua → không báo lại (chống bấm nhiều lần / spam người theo dõi).
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.type = 'new_deal' AND n.category IS NULL AND n.target_type = 'business' AND n.target_id = biz.id
      AND n.body = o.title AND n.created_at > now() - interval '1 hour'
  ) THEN
    RETURN 0;
  END IF;
  WITH ins AS (
    INSERT INTO public.notifications(user_id, type, title, body, target_type, target_id)
    SELECT f.follower_id, 'new_deal',
           COALESCE(biz.name,'Doanh nghiệp') || ' vừa thêm ưu đãi mới!',
           o.title, 'business', biz.id
    FROM public.follows f
    JOIN public.profiles p ON p.id = f.follower_id
    WHERE f.followee_business_id = biz.id
      AND f.follower_id <> COALESCE(biz.owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE((p.notification_prefs->>'deals')::boolean, true) = true
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;
  RETURN inserted;
END $$;

-- ── 8) Quẹt: giới hạn lượt/ngày áp cả cho UPDATE action ──
-- INSERT: như cũ, thêm 1 dấu "đã đếm" (trong giao dịch) để nhánh UPDATE của upsert không đếm lần hai.
CREATE OR REPLACE FUNCTION public.enforce_swipe_daily_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date; used int;
BEGIN
  PERFORM set_config('app.swipe_counted', NEW.need_id::text || ':' || NEW.actor_id::text, true);
  IF public.is_active_member(NEW.actor_id) THEN RETURN NEW; END IF;
  INSERT INTO public.swipe_daily_usage(user_id, day, n) VALUES (NEW.actor_id, d, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET n = swipe_daily_usage.n + 1
  RETURNING n INTO used;
  IF used > 10 THEN
    RAISE EXCEPTION 'SWIPE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $function$;

-- Đếm 1 lượt cho CHÍNH người gọi (không nhận tham số → không trừ lượt của người khác được).
CREATE OR REPLACE FUNCTION public.swipe_count_self()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date; used int; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR public.is_active_member(v_uid) THEN RETURN; END IF;
  INSERT INTO public.swipe_daily_usage(user_id, day, n) VALUES (v_uid, d, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET n = swipe_daily_usage.n + 1
  RETURNING n INTO used;
  IF used > 10 THEN
    RAISE EXCEPTION 'SWIPE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.swipe_count_self() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.swipe_count_self() TO authenticated;

-- UPDATE: hàm KHÔNG security definer → current_user là vai đang chạy câu UPDATE: client gọi thẳng = 'authenticated';
-- hàm hệ thống (huỷ kết nối, hoàn tác — chạy với quyền chủ hàm) thì không phải → không tính lượt.
CREATE OR REPLACE FUNCTION public.enforce_swipe_daily_limit_upd()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.action IS NOT DISTINCT FROM OLD.action THEN RETURN NEW; END IF;
  IF current_setting('app.swipe_counted', true) = NEW.need_id::text || ':' || NEW.actor_id::text THEN
    PERFORM set_config('app.swipe_counted', '', true);
    RETURN NEW;
  END IF;
  PERFORM public.swipe_count_self();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_swipe_daily_limit_upd ON public.swipe_actions;
CREATE TRIGGER trg_enforce_swipe_daily_limit_upd BEFORE UPDATE OF action ON public.swipe_actions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_swipe_daily_limit_upd();
