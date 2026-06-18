
-- 1) Convert notif_type enum column to text so we can use new type values
ALTER TABLE public.notifications ALTER COLUMN type TYPE text USING type::text;
DROP TYPE IF EXISTS public.notif_type;

-- 2) Rename related_id -> target_id and add target_type
ALTER TABLE public.notifications RENAME COLUMN related_id TO target_id;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_type text;

-- Backfill target_type for legacy rows
UPDATE public.notifications SET target_type = CASE
  WHEN type IN ('new_message','report_reply') THEN 'message'
  WHEN type = 'new_offer' THEN 'business'
  WHEN type IN ('account_approved','account_rejected') THEN 'user'
  WHEN type IN ('suggestion_approved','suggestion_rejected') THEN 'suggestion'
  WHEN type = 'report_received' THEN 'report'
  WHEN type = 'new_follower' THEN 'user'
  ELSE 'system'
END WHERE target_type IS NULL;

-- 3) Update existing trigger functions to use new types + target_type

-- Profile (member) approval
CREATE OR REPLACE FUNCTION public.notify_profile_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.id,'account_approved','Tài khoản đã được duyệt ✅',
        COALESCE(NULLIF(NEW.admin_note,''),'Bạn có thể sử dụng đầy đủ tính năng của Liên Minh.'),
        'user', NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.id,'account_rejected','Tài khoản bị từ chối ❌',
        COALESCE(NULLIF(NEW.admin_note,''),'Vui lòng liên hệ admin để biết thêm chi tiết.'),
        'user', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

-- Business approval -> use business_approved/business_rejected
CREATE OR REPLACE FUNCTION public.notify_business_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.status <> OLD.status AND NEW.owner_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.owner_id,'business_approved','Doanh nghiệp đã được duyệt ✅',NEW.name,'business',NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.owner_id,'business_rejected','Doanh nghiệp bị từ chối ❌',NEW.name,'business',NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

-- Business pinned (is_featured becomes true) -> all approved members
CREATE OR REPLACE FUNCTION public.notify_business_pinned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.is_featured = true AND COALESCE(OLD.is_featured,false) = false THEN
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    SELECT p.id,'business_pinned','Doanh nghiệp nổi bật ⭐',NEW.name,'business',NEW.id
    FROM public.profiles p WHERE p.status = 'approved';
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_notify_business_pinned ON public.businesses;
CREATE TRIGGER trg_notify_business_pinned AFTER UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.notify_business_pinned();

-- New deal -> notify followers of business
CREATE OR REPLACE FUNCTION public.notify_new_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE biz_name text;
BEGIN
  SELECT name INTO biz_name FROM public.businesses WHERE id = NEW.business_id;
  INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
  SELECT f.follower_id, 'new_deal', 'Ưu đãi mới từ ' || COALESCE(biz_name,'doanh nghiệp'), NEW.title, 'business', NEW.business_id
  FROM public.follows f
  WHERE f.followee_business_id = NEW.business_id
    AND f.follower_id <> (SELECT owner_id FROM public.businesses WHERE id = NEW.business_id);
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_notify_new_deal ON public.offers;
CREATE TRIGGER trg_notify_new_deal AFTER INSERT ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.notify_new_deal();

-- Deal claimed -> notify business owner
CREATE OR REPLACE FUNCTION public.notify_deal_claimed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE biz_id uuid; biz_owner uuid; biz_name text; claimer_name text;
BEGIN
  SELECT o.business_id INTO biz_id FROM public.offers o WHERE o.id = NEW.offer_id;
  SELECT owner_id, name INTO biz_owner, biz_name FROM public.businesses WHERE id = biz_id;
  SELECT full_name INTO claimer_name FROM public.profiles WHERE id = NEW.user_id;
  IF biz_owner IS NOT NULL AND biz_owner <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    VALUES (biz_owner, 'deal_claimed', 'Có người vừa nhận ưu đãi',
      COALESCE(claimer_name,'Thành viên') || ' nhận mã ' || NEW.code,
      'business', biz_id);
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_notify_deal_claimed ON public.offer_claims;
CREATE TRIGGER trg_notify_deal_claimed AFTER INSERT ON public.offer_claims
FOR EACH ROW EXECUTE FUNCTION public.notify_deal_claimed();

-- New message -> set target_type=message, target_id=sender_id (for /tin-nhan/:sender_id)
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE sender_name text;
BEGIN
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
  VALUES (NEW.receiver_id,'new_message','Tin nhắn mới từ ' || COALESCE(sender_name,'người dùng'),
    LEFT(NEW.content,80),'message',NEW.sender_id);
  RETURN NEW;
END $fn$;

-- Follow -> set target_type=user, target_id=follower_id
CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE follower_name text;
BEGIN
  IF NEW.followee_user_id IS NOT NULL AND NEW.followee_user_id <> NEW.follower_id THEN
    SELECT full_name INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    VALUES (NEW.followee_user_id,'new_follower','Có người mới theo dõi bạn',
      COALESCE(follower_name,'Một thành viên') || ' đang theo dõi bạn',
      'user', NEW.follower_id);
  END IF;
  RETURN NEW;
END $fn$;

-- Report submitted -> notify admins (if send_to_admin) and business owner (if send_to_business)
CREATE OR REPLACE FUNCTION public.notify_new_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE biz_owner uuid; biz_name text;
BEGIN
  IF NEW.send_to_admin THEN
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    SELECT ur.user_id, 'report_submitted', 'Báo cáo mới', LEFT(NEW.description,120), 'report', NEW.id
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
  IF NEW.send_to_business AND NEW.target_type = 'business' THEN
    SELECT owner_id, name INTO biz_owner, biz_name FROM public.businesses WHERE id = NEW.target_id;
    IF biz_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (biz_owner,'report_submitted','Báo cáo về ' || COALESCE(biz_name,'doanh nghiệp'),
        LEFT(NEW.description,120),'report',NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

-- Report resolved -> notify reporter
CREATE OR REPLACE FUNCTION public.notify_report_resolved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.status IN ('resolved','closed') AND OLD.status <> NEW.status THEN
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    VALUES (NEW.user_id,'report_resolved','Báo cáo đã được xử lý ✅',
      'Quản trị viên đã xử lý báo cáo của bạn.', 'report', NEW.id);
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS trg_notify_report_resolved ON public.reports;
CREATE TRIGGER trg_notify_report_resolved AFTER UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.notify_report_resolved();

-- Suggestion approval target_type
CREATE OR REPLACE FUNCTION public.notify_suggestion_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.user_id,'suggestion_approved','Đề xuất đã được duyệt ✅',NEW.business_name,'suggestion',NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.user_id,'suggestion_rejected','Đề xuất bị từ chối ❌',NEW.business_name,'suggestion',NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

-- Update broadcast_offer RPC to use new_deal (kept for manual broadcasts)
CREATE OR REPLACE FUNCTION public.broadcast_offer(_offer_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE uid uuid := auth.uid(); o public.offers; biz public.businesses; inserted int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o IS NULL THEN RAISE EXCEPTION 'offer not found'; END IF;
  SELECT * INTO biz FROM public.businesses WHERE id = o.business_id;
  IF NOT (public.has_role(uid,'admin') OR biz.owner_id = uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH ins AS (
    INSERT INTO public.notifications(user_id, type, title, body, target_type, target_id)
    SELECT p.id, 'new_deal', 'Ưu đãi mới từ ' || COALESCE(biz.name,'doanh nghiệp'), o.title, 'business', biz.id
    FROM public.profiles p WHERE p.status = 'approved'
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;
  RETURN inserted;
END $fn$;
