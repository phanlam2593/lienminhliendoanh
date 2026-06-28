
-- Phase 2: Badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, badge_type)
);

GRANT SELECT ON public.badges TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read badges" ON public.badges;
CREATE POLICY "anyone can read badges" ON public.badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin manage badges" ON public.badges;
CREATE POLICY "admin manage badges" ON public.badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS badges_business_idx ON public.badges(business_id);

-- Rewrite completion logic: award badges + level up notifications
CREATE OR REPLACE FUNCTION public.exchanges_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  req_owner uuid; rec_owner uuid; req_name text; rec_name text;
  biz record;
  old_pts int; new_pts int; old_lvl int; new_lvl int;
  threshold int; btype text; blabel text;
  thresholds int[] := ARRAY[100,500,1000,2500,5000];
  types text[] := ARRAY['active_member','community_supporter','trusted_partner','growth_leader','community_legend'];
  labels text[] := ARRAY['🌟 Thành viên tích cực','💪 Người ủng hộ cộng đồng','🤝 Đối tác tin cậy','🚀 Người dẫn đầu phát triển','👑 Huyền thoại cộng đồng'];
  i int;
BEGIN
  SELECT owner_id, name INTO req_owner, req_name FROM public.businesses WHERE id = NEW.requester_id;
  SELECT owner_id, name INTO rec_owner, rec_name FROM public.businesses WHERE id = NEW.receiver_id;

  IF TG_OP = 'INSERT' THEN
    IF rec_owner IS NOT NULL AND rec_owner <> req_owner THEN
      INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
      VALUES (rec_owner,'admin_message','🤝 ' || COALESCE(req_name,'Một doanh nghiệp') || ' muốn trao đổi hỗ trợ với bạn',
        NEW.request_description, 'business', NEW.requester_id);
    END IF;
    RETURN NEW;
  END IF;

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

      FOR biz IN SELECT id, owner_id, points, level, name FROM public.businesses
                 WHERE id IN (NEW.requester_id, NEW.receiver_id) LOOP
        old_pts := COALESCE(biz.points,0);
        old_lvl := COALESCE(biz.level,1);
        new_pts := old_pts + 1;
        new_lvl := floor(new_pts / 10) + 1;

        UPDATE public.businesses SET points = new_pts, level = new_lvl WHERE id = biz.id;

        -- completion notification
        IF biz.owner_id IS NOT NULL THEN
          INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
          VALUES (biz.owner_id,'admin_message','🎉 Trao đổi hoàn thành! +1 điểm',
            CASE WHEN biz.id = NEW.requester_id THEN COALESCE(rec_name,'') ELSE COALESCE(req_name,'') END,
            'business', CASE WHEN biz.id = NEW.requester_id THEN NEW.receiver_id ELSE NEW.requester_id END);
        END IF;

        -- level up notification
        IF new_lvl > old_lvl AND biz.owner_id IS NOT NULL THEN
          INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
          VALUES (biz.owner_id,'level_up','⬆️ Doanh nghiệp của bạn lên Lv.' || new_lvl || '!',
            COALESCE(biz.name,'') || ' vừa đạt cấp độ mới','business', biz.id);
        END IF;

        -- badges
        FOR i IN 1..array_length(thresholds,1) LOOP
          threshold := thresholds[i]; btype := types[i]; blabel := labels[i];
          IF old_pts < threshold AND new_pts >= threshold THEN
            INSERT INTO public.badges(business_id, badge_type) VALUES (biz.id, btype)
              ON CONFLICT DO NOTHING;
            IF biz.owner_id IS NOT NULL THEN
              INSERT INTO public.notifications(user_id,type,title,body,target_type,target_id)
              VALUES (biz.owner_id,'badge_earned','🏅 Bạn vừa nhận huy hiệu ' || blabel || '!',
                COALESCE(biz.name,''),'business', biz.id);
            END IF;
          END IF;
        END LOOP;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- 24h cooldown
CREATE OR REPLACE FUNCTION public.exchanges_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE active_count int; last_done timestamptz;
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

  SELECT max(completed_at) INTO last_done FROM public.exchanges
    WHERE status = 'completed'
      AND ((requester_id = NEW.requester_id AND receiver_id = NEW.receiver_id)
        OR (requester_id = NEW.receiver_id AND receiver_id = NEW.requester_id));
  IF last_done IS NOT NULL AND last_done > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Có thể trao đổi lại sau: % giờ', ceil(extract(epoch from (last_done + interval '24 hours' - now()))/3600);
  END IF;

  SELECT count(*) INTO active_count FROM public.exchanges
    WHERE requester_id = NEW.requester_id AND status = 'pending';
  IF active_count >= 5 THEN
    RAISE EXCEPTION 'Bạn đã đạt giới hạn 5 yêu cầu đang chờ';
  END IF;

  RETURN NEW;
END $function$;
