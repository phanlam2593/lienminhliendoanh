
-- ============= ĐỢT B: follows =============
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follows_one_target CHECK (num_nonnulls(followee_user_id, followee_business_id) = 1),
  CONSTRAINT follows_no_self CHECK (followee_user_id IS DISTINCT FROM follower_id)
);
CREATE UNIQUE INDEX follows_uniq_user ON public.follows(follower_id, followee_user_id) WHERE followee_user_id IS NOT NULL;
CREATE UNIQUE INDEX follows_uniq_biz  ON public.follows(follower_id, followee_business_id) WHERE followee_business_id IS NOT NULL;
CREATE INDEX follows_followee_user_idx ON public.follows(followee_user_id);
CREATE INDEX follows_followee_biz_idx  ON public.follows(followee_business_id);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all_auth" ON public.follows
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "follows_insert_self" ON public.follows
  FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_delete_self" ON public.follows
  FOR DELETE TO authenticated USING (follower_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE follower_name text;
BEGIN
  IF NEW.followee_user_id IS NOT NULL THEN
    SELECT full_name INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
    INSERT INTO public.notifications(user_id, type, title, body, related_id)
    VALUES (NEW.followee_user_id, 'new_follower',
      'Có người mới theo dõi bạn',
      COALESCE(follower_name, 'Một thành viên') || ' đang theo dõi bạn',
      NEW.follower_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_follow AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_new_follow();

-- ============= ĐỢT C: report status + replies + admin_note =============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_note text;

CREATE TYPE public.report_status AS ENUM ('pending','replied','resolved','closed');
ALTER TABLE public.reports ADD COLUMN status public.report_status NOT NULL DEFAULT 'pending';
UPDATE public.reports SET status = CASE WHEN resolved THEN 'resolved'::public.report_status ELSE 'pending'::public.report_status END;

CREATE TABLE public.report_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_replies_report_idx ON public.report_replies(report_id, created_at);

GRANT SELECT, INSERT ON public.report_replies TO authenticated;
GRANT ALL ON public.report_replies TO service_role;
ALTER TABLE public.report_replies ENABLE ROW LEVEL SECURITY;

-- helper: can a user access a given report?
CREATE OR REPLACE FUNCTION public.can_access_report(_user_id uuid, _report_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = _report_id AND (
      public.has_role(_user_id, 'admin')
      OR r.user_id = _user_id
      OR (r.target_type = 'business' AND EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = r.target_id AND b.owner_id = _user_id
      ))
    )
  )
$$;

CREATE POLICY "report_replies_select" ON public.report_replies
  FOR SELECT TO authenticated USING (public.can_access_report(auth.uid(), report_id));
CREATE POLICY "report_replies_insert" ON public.report_replies
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_access_report(auth.uid(), report_id));

-- trigger: notify the other party + advance report status
CREATE OR REPLACE FUNCTION public.notify_report_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.reports;
  biz_owner uuid;
  author_name text;
BEGIN
  SELECT * INTO r FROM public.reports WHERE id = NEW.report_id;
  SELECT full_name INTO author_name FROM public.profiles WHERE id = NEW.author_id;
  IF r.target_type = 'business' THEN
    SELECT owner_id INTO biz_owner FROM public.businesses WHERE id = r.target_id;
  END IF;

  -- notify reporter when author is not the reporter
  IF NEW.author_id <> r.user_id THEN
    INSERT INTO public.notifications(user_id, type, title, body, related_id)
    VALUES (r.user_id, 'report_reply',
      'Phản hồi mới về báo cáo của bạn',
      COALESCE(author_name,'Quản trị') || ': ' || LEFT(NEW.body, 120),
      r.id);
  END IF;
  -- notify business owner when author is not the owner
  IF biz_owner IS NOT NULL AND NEW.author_id <> biz_owner THEN
    INSERT INTO public.notifications(user_id, type, title, body, related_id)
    VALUES (biz_owner, 'report_reply',
      'Phản hồi mới về báo cáo',
      COALESCE(author_name,'Quản trị') || ': ' || LEFT(NEW.body, 120),
      r.id);
  END IF;

  -- advance status: only bump to 'replied' from 'pending'
  UPDATE public.reports SET status = 'replied'
    WHERE id = NEW.report_id AND status = 'pending';

  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_report_reply AFTER INSERT ON public.report_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_report_reply();

-- Update notify_profile_status to include admin_note
CREATE OR REPLACE FUNCTION public.notify_profile_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body)
      VALUES (NEW.id,'account_approved','Tài khoản đã được duyệt ✅',
        COALESCE(NULLIF(NEW.admin_note,''), 'Bạn có thể sử dụng đầy đủ tính năng của Liên Minh.'));
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body)
      VALUES (NEW.id,'account_rejected','Tài khoản bị từ chối ❌',
        COALESCE(NULLIF(NEW.admin_note,''), 'Vui lòng liên hệ admin để biết thêm chi tiết.'));
    END IF;
  END IF;
  RETURN NEW;
END $$;
