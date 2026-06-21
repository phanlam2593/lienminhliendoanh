-- Drop the broadcast-to-all trigger; keep follower-only notify_new_deal
DROP TRIGGER IF EXISTS trg_notify_new_offer ON public.offers;
DROP TRIGGER IF EXISTS notify_new_offer_trigger ON public.offers;
DROP FUNCTION IF EXISTS public.notify_new_offer() CASCADE;

-- Restrict broadcast_offer RPC to followers of the business only
CREATE OR REPLACE FUNCTION public.broadcast_offer(_offer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    WHERE f.followee_business_id = biz.id
      AND f.follower_id <> COALESCE(biz.owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;
  RETURN inserted;
END $$;