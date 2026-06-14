
-- 1) Add claim_count to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS claim_count integer NOT NULL DEFAULT 0;

-- 2) offer_claims table
CREATE TABLE IF NOT EXISTS public.offer_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(offer_id, user_id)
);
GRANT SELECT, INSERT ON public.offer_claims TO authenticated;
GRANT ALL ON public.offer_claims TO service_role;
ALTER TABLE public.offer_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims insert self approved" ON public.offer_claims;
CREATE POLICY "claims insert self approved" ON public.offer_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_approved_member(auth.uid()));

DROP POLICY IF EXISTS "claims read own or admin or biz owner" ON public.offer_claims;
CREATE POLICY "claims read own or admin or biz owner" ON public.offer_claims FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.businesses b ON b.id = o.business_id
      WHERE o.id = offer_claims.offer_id AND b.owner_id = auth.uid()
    )
  );

-- Trigger to bump claim_count
CREATE OR REPLACE FUNCTION public.bump_offer_claim_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.offers SET claim_count = claim_count + 1 WHERE id = NEW.offer_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_offer_claim_count ON public.offer_claims;
CREATE TRIGGER trg_bump_offer_claim_count AFTER INSERT ON public.offer_claims
  FOR EACH ROW EXECUTE FUNCTION public.bump_offer_claim_count();

-- 3) Reports: business owner can read reports sent to them
DROP POLICY IF EXISTS "reports read by business owner" ON public.reports;
CREATE POLICY "reports read by business owner" ON public.reports FOR SELECT
  USING (
    send_to_business AND target_type = 'business' AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = reports.target_id AND b.owner_id = auth.uid()
    )
  );

-- 4) Storage policies for `uploads` bucket so authenticated users can upload & read
DROP POLICY IF EXISTS "uploads auth read" ON storage.objects;
CREATE POLICY "uploads auth read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads anon read" ON storage.objects;
CREATE POLICY "uploads anon read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads auth insert" ON storage.objects;
CREATE POLICY "uploads auth insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads anon insert" ON storage.objects;
CREATE POLICY "uploads anon insert" ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads auth update" ON storage.objects;
CREATE POLICY "uploads auth update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads auth delete" ON storage.objects;
CREATE POLICY "uploads auth delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads');
