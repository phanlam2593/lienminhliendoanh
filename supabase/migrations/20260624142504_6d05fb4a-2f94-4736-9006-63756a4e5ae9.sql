
-- 1. Add notification_prefs column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"messages":true,"follows":true,"deals":true,"admin":true}'::jsonb;

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.notif_pref_allowed(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((p.notification_prefs->>_key)::boolean, true)
  FROM public.profiles p WHERE p.id = _user_id
$$;

-- 3. notify_new_message — respect "messages"
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name text;
BEGIN
  IF NOT public.notif_pref_allowed(NEW.receiver_id, 'messages') THEN RETURN NEW; END IF;
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
  VALUES (NEW.receiver_id,'new_message','Tin nhắn mới từ ' || COALESCE(sender_name,'người dùng'),
    LEFT(NEW.content,80),'message',NEW.sender_id);
  RETURN NEW;
END $$;

-- 4. notify_new_follow — respect "follows"
CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE follower_name text; biz_owner uuid; biz_name text;
BEGIN
  SELECT full_name INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;

  IF NEW.followee_user_id IS NOT NULL AND NEW.followee_user_id <> NEW.follower_id
     AND public.notif_pref_allowed(NEW.followee_user_id, 'follows') THEN
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    VALUES (NEW.followee_user_id,'new_follower','👤 ' || COALESCE(follower_name,'Một thành viên') || ' vừa theo dõi bạn',
      'Nhấn để xem hồ sơ','user', NEW.follower_id);
  END IF;

  IF NEW.followee_business_id IS NOT NULL THEN
    SELECT owner_id, name INTO biz_owner, biz_name FROM public.businesses WHERE id = NEW.followee_business_id;
    IF biz_owner IS NOT NULL AND biz_owner <> NEW.follower_id
       AND public.notif_pref_allowed(biz_owner, 'follows') THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (biz_owner,'new_follower','👤 ' || COALESCE(follower_name,'Một thành viên') || ' vừa theo dõi doanh nghiệp của bạn',
        COALESCE(biz_name,''),'business', NEW.followee_business_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 5. notify_new_deal — respect "deals"
CREATE OR REPLACE FUNCTION public.notify_new_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE biz_name text; owner uuid;
BEGIN
  SELECT name, owner_id INTO biz_name, owner FROM public.businesses WHERE id = NEW.business_id;
  INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
  SELECT f.follower_id, 'new_deal', COALESCE(biz_name,'Doanh nghiệp') || ' vừa thêm ưu đãi mới!', NEW.title, 'business', NEW.business_id
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.follower_id
  WHERE f.followee_business_id = NEW.business_id
    AND f.follower_id <> COALESCE(owner, '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE((p.notification_prefs->>'deals')::boolean, true) = true;
  RETURN NEW;
END $$;

-- 6. broadcast_offer — respect "deals"
CREATE OR REPLACE FUNCTION public.broadcast_offer(_offer_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); o public.offers; biz public.businesses; inserted int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o IS NULL THEN RAISE EXCEPTION 'offer not found'; END IF;
  SELECT * INTO biz FROM public.businesses WHERE id = o.business_id;
  IF NOT (public.has_role(uid,'admin') OR biz.owner_id = uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
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

-- 7. notify_business_pinned — respect "admin"
CREATE OR REPLACE FUNCTION public.notify_business_pinned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_featured = true AND COALESCE(OLD.is_featured,false) = false THEN
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    SELECT p.id,'business_pinned','Doanh nghiệp nổi bật ⭐',NEW.name,'business',NEW.id
    FROM public.profiles p
    WHERE p.status = 'approved'
      AND COALESCE((p.notification_prefs->>'admin')::boolean, true) = true;
  END IF;
  RETURN NEW;
END $$;

-- 8. notify_profile_status — respect "admin"
CREATE OR REPLACE FUNCTION public.notify_profile_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status AND public.notif_pref_allowed(NEW.id, 'admin') THEN
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
END $$;

-- 9. notify_business_status — respect "admin"
CREATE OR REPLACE FUNCTION public.notify_business_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.owner_id IS NOT NULL
     AND public.notif_pref_allowed(NEW.owner_id, 'admin') THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.owner_id,'business_approved','Doanh nghiệp đã được duyệt ✅',NEW.name,'business',NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (NEW.owner_id,'business_rejected','Doanh nghiệp bị từ chối ❌',NEW.name,'business',NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
