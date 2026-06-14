
-- Allow users to delete their own notifications and messages they participated in.
CREATE POLICY "notif delete own" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "messages delete participant" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Offer claims: allow unlimited claims per (user, offer); each claim has its own 2-hour expiry.
ALTER TABLE public.offer_claims DROP CONSTRAINT IF EXISTS offer_claims_offer_id_user_id_key;
ALTER TABLE public.offer_claims ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours');
ALTER TABLE public.offer_claims ADD COLUMN IF NOT EXISTS seq integer;

-- RPC: get-or-create the current active claim for (user, offer).
-- Returns existing claim if there is an unexpired one, else creates a new one with code
--   <3-letter business-name prefix uppercase A-Z> + zero-padded incremental number for that business.
CREATE OR REPLACE FUNCTION public.claim_offer(_offer_id uuid)
RETURNS public.offer_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.offer_claims;
  biz_id uuid;
  biz_name text;
  prefix text;
  next_seq int;
  new_code text;
  new_row public.offer_claims;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT is_approved_member(uid) THEN RAISE EXCEPTION 'not approved'; END IF;

  SELECT * INTO existing FROM public.offer_claims
    WHERE offer_id = _offer_id AND user_id = uid AND expires_at > now()
    ORDER BY claimed_at DESC LIMIT 1;
  IF FOUND THEN RETURN existing; END IF;

  SELECT o.business_id, b.name INTO biz_id, biz_name
    FROM public.offers o JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = _offer_id;
  IF biz_id IS NULL THEN RAISE EXCEPTION 'offer not found'; END IF;

  -- prefix: first 3 A-Z letters of business name, uppercase, fall back to 'LMD'
  prefix := upper(substring(regexp_replace(unaccent_safe(biz_name), '[^A-Za-z]', '', 'g') from 1 for 3));
  IF prefix IS NULL OR length(prefix) < 3 THEN prefix := rpad(coalesce(prefix,''),3,'X'); END IF;

  SELECT coalesce(max(c.seq),0) + 1 INTO next_seq
    FROM public.offer_claims c
    JOIN public.offers o ON o.id = c.offer_id
    WHERE o.business_id = biz_id;

  new_code := prefix || lpad(next_seq::text, 3, '0');

  INSERT INTO public.offer_claims(offer_id, user_id, code, seq, expires_at)
  VALUES (_offer_id, uid, new_code, next_seq, now() + interval '2 hours')
  RETURNING * INTO new_row;

  RETURN new_row;
END $$;

-- Helper: unaccent for prefix derivation without extension dependency.
CREATE OR REPLACE FUNCTION public.unaccent_safe(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(_t,
    'àáạảãâầấậẩẫăằắặẳẵÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴèéẹẻẽêềếệểễÈÉẸẺẼÊỀẾỆỂỄìíịỉĩÌÍỊỈĨòóọỏõôồốộổỗơờớợởỡÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠùúụủũưừứựửữÙÚỤỦŨƯỪỨỰỬỮỳýỵỷỹỲÝỴỶỸđĐ',
    'aaaaaaaaaaaaaaaaaAAAAAAAAAAAAAAAAAeeeeeeeeeeeEEEEEEEEEEEiiiiiIIIIIoooooooooooooooooOOOOOOOOOOOOOOOOOuuuuuuuuuuuUUUUUUUUUUUyyyyyYYYYYdD'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.unaccent_safe(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_offer(uuid) TO authenticated;
