
-- Item 5: stop auto-notifying everyone on new offers
DROP TRIGGER IF EXISTS trg_notify_offer ON public.offers;

-- Manual broadcast (only admin or business owner)
CREATE OR REPLACE FUNCTION public.broadcast_offer(_offer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  WITH ins AS (
    INSERT INTO public.notifications(user_id, type, title, body, related_id)
    SELECT p.id, 'new_offer', 'Ưu đãi mới từ ' || COALESCE(biz.name,'doanh nghiệp'), o.title, biz.id
    FROM public.profiles p WHERE p.status = 'approved'
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;
  RETURN inserted;
END $$;

GRANT EXECUTE ON FUNCTION public.broadcast_offer(uuid) TO authenticated;
