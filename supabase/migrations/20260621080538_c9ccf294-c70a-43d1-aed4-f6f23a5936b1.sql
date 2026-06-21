
-- 1. Extend notify_new_follow to also handle business follows
CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  follower_name text;
  biz_owner uuid;
  biz_name text;
BEGIN
  SELECT full_name INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;

  -- Member follow
  IF NEW.followee_user_id IS NOT NULL AND NEW.followee_user_id <> NEW.follower_id THEN
    INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
    VALUES (NEW.followee_user_id,'new_follower','👤 ' || COALESCE(follower_name,'Một thành viên') || ' vừa theo dõi bạn',
      'Nhấn để xem hồ sơ',
      'user', NEW.follower_id);
  END IF;

  -- Business follow
  IF NEW.followee_business_id IS NOT NULL THEN
    SELECT owner_id, name INTO biz_owner, biz_name FROM public.businesses WHERE id = NEW.followee_business_id;
    IF biz_owner IS NOT NULL AND biz_owner <> NEW.follower_id THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (biz_owner,'new_follower','👤 ' || COALESCE(follower_name,'Một thành viên') || ' vừa theo dõi doanh nghiệp của bạn',
        COALESCE(biz_name,''),
        'business', NEW.followee_business_id);
    END IF;
  END IF;

  RETURN NEW;
END $function$;

-- 2. Notify admins on new member registration
CREATE OR REPLACE FUNCTION public.notify_admins_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
  SELECT ur.user_id, 'admin_message',
    '👋 Thành viên mới: ' || COALESCE(NEW.full_name, NEW.username, 'không tên') || ' vừa đăng ký',
    'Nhấn để xem trong quản trị',
    'user', NEW.id
  FROM public.user_roles ur WHERE ur.role = 'admin' AND ur.user_id <> NEW.id;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_member ON public.profiles;
CREATE TRIGGER trg_notify_admins_new_member
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_member();

-- 3. Notify admins on new business
CREATE OR REPLACE FUNCTION public.notify_admins_new_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
  SELECT ur.user_id, 'admin_message',
    '🏢 Doanh nghiệp mới: ' || COALESCE(NEW.name,'') || ' đang chờ duyệt',
    'Nhấn để xem trong quản trị',
    'business', NEW.id
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_business ON public.businesses;
CREATE TRIGGER trg_notify_admins_new_business
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_business();
