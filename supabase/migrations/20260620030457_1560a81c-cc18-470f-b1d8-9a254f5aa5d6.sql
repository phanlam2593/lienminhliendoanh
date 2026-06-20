CREATE OR REPLACE FUNCTION public.notify_new_deal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE biz_name text; owner uuid;
BEGIN
  SELECT name, owner_id INTO biz_name, owner FROM public.businesses WHERE id = NEW.business_id;
  INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
  SELECT f.follower_id, 'new_deal', COALESCE(biz_name,'Doanh nghiệp') || ' vừa thêm ưu đãi mới!', NEW.title, 'business', NEW.business_id
  FROM public.follows f
  WHERE f.followee_business_id = NEW.business_id
    AND f.follower_id <> COALESCE(owner, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END; $function$;