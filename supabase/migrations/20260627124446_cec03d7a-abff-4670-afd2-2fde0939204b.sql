
-- 1. Expand business_type enum
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'freelancer';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'photographer';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'graphic_designer';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'youtube';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'streamer';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'influencer';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'content_creator';

-- 2. Add social/gamification columns to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- 3. Exchanges table
CREATE TABLE IF NOT EXISTS public.exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  request_description text NOT NULL,
  return_description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','requester_done','receiver_done','completed','rejected','expired')),
  requester_completed_at timestamptz,
  receiver_completed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exchanges TO authenticated;
GRANT ALL ON public.exchanges TO service_role;

ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read their business exchanges"
ON public.exchanges FOR SELECT TO authenticated
USING (
  requester_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  OR receiver_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "members insert exchanges as requester"
ON public.exchanges FOR INSERT TO authenticated
WITH CHECK (
  requester_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

CREATE POLICY "participants update their exchange"
ON public.exchanges FOR UPDATE TO authenticated
USING (
  requester_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  OR receiver_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "admin delete exchanges"
ON public.exchanges FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS exchanges_requester_idx ON public.exchanges(requester_id);
CREATE INDEX IF NOT EXISTS exchanges_receiver_idx ON public.exchanges(receiver_id);
CREATE INDEX IF NOT EXISTS exchanges_status_idx ON public.exchanges(status);

CREATE TRIGGER exchanges_touch_updated_at
BEFORE UPDATE ON public.exchanges
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Validate duplicates and pending cap via trigger (CHECK can't query)
CREATE OR REPLACE FUNCTION public.exchanges_validate_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE active_count int;
BEGIN
  IF NEW.requester_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Không thể trao đổi với chính mình';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.exchanges
    WHERE status IN ('pending','accepted','requester_done','receiver_done')
      AND ((requester_id = NEW.requester_id AND receiver_id = NEW.receiver_id)
        OR (requester_id = NEW.receiver_id AND receiver_id = NEW.requester_id))
  ) THEN
    RAISE EXCEPTION 'Bạn đang có một trao đổi chưa hoàn thành với doanh nghiệp này';
  END IF;

  SELECT count(*) INTO active_count FROM public.exchanges
    WHERE requester_id = NEW.requester_id AND status = 'pending';
  IF active_count >= 5 THEN
    RAISE EXCEPTION 'Bạn đã đạt giới hạn 5 yêu cầu đang chờ';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER exchanges_before_insert
BEFORE INSERT ON public.exchanges
FOR EACH ROW EXECUTE FUNCTION public.exchanges_validate_insert();

-- Auto-complete + points trigger
CREATE OR REPLACE FUNCTION public.exchanges_on_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req_owner uuid; rec_owner uuid; req_name text; rec_name text;
BEGIN
  SELECT owner_id, name INTO req_owner, req_name FROM public.businesses WHERE id = NEW.requester_id;
  SELECT owner_id, name INTO rec_owner, rec_name FROM public.businesses WHERE id = NEW.receiver_id;

  IF TG_OP = 'INSERT' THEN
    -- notify receiver of new request
    IF rec_owner IS NOT NULL AND rec_owner <> req_owner THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (rec_owner,'admin_message','🤝 ' || COALESCE(req_name,'Một doanh nghiệp') || ' muốn trao đổi hỗ trợ với bạn',
        NEW.request_description, 'business', NEW.requester_id);
    END IF;
    RETURN NEW;
  END IF;

  -- status transitions
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'accepted' AND req_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (req_owner,'admin_message','✅ ' || COALESCE(rec_name,'Đối phương') || ' đã chấp nhận yêu cầu trao đổi',
        NEW.return_description, 'business', NEW.receiver_id);
    ELSIF NEW.status = 'requester_done' AND rec_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (rec_owner,'admin_message','👀 ' || COALESCE(req_name,'Đối phương') || ' đã hoàn thành phần của họ, hãy kiểm tra!',
        NEW.request_description, 'business', NEW.requester_id);
    ELSIF NEW.status = 'receiver_done' AND req_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (req_owner,'admin_message','🎯 ' || COALESCE(rec_name,'Đối phương') || ' xác nhận và đã hoàn thành!',
        NEW.return_description, 'business', NEW.receiver_id);
    ELSIF NEW.status = 'completed' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      UPDATE public.businesses
        SET points = points + 1, level = floor((points + 1) / 10) + 1
        WHERE id IN (NEW.requester_id, NEW.receiver_id);
      IF req_owner IS NOT NULL THEN
        INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
        VALUES (req_owner,'admin_message','🎉 Trao đổi hoàn thành! Bạn nhận được +1 điểm',
          COALESCE(rec_name,''), 'business', NEW.receiver_id);
      END IF;
      IF rec_owner IS NOT NULL THEN
        INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
        VALUES (rec_owner,'admin_message','🎉 Trao đổi hoàn thành! Bạn nhận được +1 điểm',
          COALESCE(req_name,''), 'business', NEW.requester_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER exchanges_after_insert
AFTER INSERT ON public.exchanges
FOR EACH ROW EXECUTE FUNCTION public.exchanges_on_change();

CREATE TRIGGER exchanges_before_update
BEFORE UPDATE ON public.exchanges
FOR EACH ROW EXECUTE FUNCTION public.exchanges_on_change();

-- Auto-expire helper (called on read)
CREATE OR REPLACE FUNCTION public.expire_stale_exchanges()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.exchanges
  SET status = 'expired'
  WHERE status IN ('pending','accepted','requester_done','receiver_done')
    AND expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_exchanges() TO authenticated;
