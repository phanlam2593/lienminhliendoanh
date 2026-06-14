
-- =========================================================
-- 1. DROP OLD OBJECTS
-- =========================================================
DROP TABLE IF EXISTS public.business_suggestions CASCADE;
DROP TABLE IF EXISTS public.suggestions CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_own_profile() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.touch_updated_at() CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.account_status CASCADE;
DROP TYPE IF EXISTS public.business_type CASCADE;
DROP TYPE IF EXISTS public.business_status CASCADE;
DROP TYPE IF EXISTS public.offer_status CASCADE;
DROP TYPE IF EXISTS public.suggestion_status CASCADE;
DROP TYPE IF EXISTS public.report_target CASCADE;
DROP TYPE IF EXISTS public.notif_type CASCADE;

-- =========================================================
-- 2. ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('guest','member','admin');
CREATE TYPE public.account_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.business_type AS ENUM ('food','service','stay','travel','other');
CREATE TYPE public.business_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.offer_status AS ENUM ('active','inactive');
CREATE TYPE public.suggestion_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.report_target AS ENUM ('business','offer');
CREATE TYPE public.notif_type AS ENUM (
  'account_approved','account_rejected','new_offer','new_message',
  'suggestion_approved','suggestion_rejected','report_received','broadcast'
);

-- =========================================================
-- 3. UTILITY FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- 4. PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text UNIQUE NOT NULL,
  avatar_url text,
  status public.account_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 5. USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security-definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

-- Profile policies
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles admin update" ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "user_roles read own or admin" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles admin manage" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 6. BUSINESSES
-- =========================================================
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  type public.business_type NOT NULL DEFAULT 'other',
  description text,
  hours_open time,
  hours_close time,
  phone text,
  address text,
  facebook_url text,
  website_url text,
  cover_url text,
  is_featured boolean NOT NULL DEFAULT false,
  status public.business_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "biz read approved or own or admin" ON public.businesses FOR SELECT
  USING (status = 'approved' OR auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "biz insert own" ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "biz update own" ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "biz admin manage" ON public.businesses FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 7. OFFERS
-- =========================================================
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  code text,
  status public.offer_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO anon;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "offers read all" ON public.offers FOR SELECT USING (true);
CREATE POLICY "offers owner manage" ON public.offers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE POLICY "offers admin manage" ON public.offers FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 8. REVIEWS
-- =========================================================
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews read all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews member insert" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_approved_member(auth.uid()));
CREATE POLICY "reviews owner update" ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews owner delete" ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "reviews admin manage" ON public.reviews FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 9. SUGGESTIONS
-- =========================================================
CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type public.business_type NOT NULL DEFAULT 'other',
  contact_info text NOT NULL,
  description text,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_suggestions_updated BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "suggestions read own or admin" ON public.suggestions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "suggestions insert member" ON public.suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_approved_member(auth.uid()));
CREATE POLICY "suggestions admin manage" ON public.suggestions FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 10. REPORTS
-- =========================================================
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  description text NOT NULL,
  photo_url text,
  send_to_admin boolean NOT NULL DEFAULT true,
  send_to_business boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports read own or admin" ON public.reports FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reports insert member" ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_approved_member(auth.uid()));
CREATE POLICY "reports admin manage" ON public.reports FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 11. MESSAGES
-- =========================================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_pair ON public.messages(sender_id, receiver_id, created_at DESC);

CREATE POLICY "messages read own" ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "messages insert member" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "messages update receiver" ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
CREATE POLICY "messages admin manage" ON public.messages FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 12. NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notif_type NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);

CREATE POLICY "notif read own" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif admin manage" ON public.notifications FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 13. AUTO-CREATE PROFILE + ROLE ON SIGN UP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'real_email', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 14. AUTOMATIC NOTIFICATIONS
-- =========================================================

-- Profile status change → notify user
CREATE OR REPLACE FUNCTION public.notify_profile_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body)
      VALUES (NEW.id,'account_approved','Tài khoản đã được duyệt ✅','Bạn có thể sử dụng đầy đủ tính năng của Liên Minh.');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body)
      VALUES (NEW.id,'account_rejected','Tài khoản bị từ chối ❌','Vui lòng liên hệ admin để biết thêm chi tiết.');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_profile AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_profile_status();

-- Business status change → notify owner
CREATE OR REPLACE FUNCTION public.notify_business_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.owner_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,related_id)
      VALUES (NEW.owner_id,'account_approved','Doanh nghiệp đã được duyệt ✅',NEW.name,NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body,related_id)
      VALUES (NEW.owner_id,'account_rejected','Doanh nghiệp bị từ chối ❌',NEW.name,NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_business AFTER UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.notify_business_status();

-- Suggestion status change → notify user
CREATE OR REPLACE FUNCTION public.notify_suggestion_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications(user_id,type,title,body,related_id)
      VALUES (NEW.user_id,'suggestion_approved','Đề xuất đã được duyệt ✅',NEW.business_name,NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications(user_id,type,title,body,related_id)
      VALUES (NEW.user_id,'suggestion_rejected','Đề xuất bị từ chối ❌',NEW.business_name,NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_suggestion AFTER UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.notify_suggestion_status();

-- New offer → notify all approved members
CREATE OR REPLACE FUNCTION public.notify_new_offer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE biz_name text;
BEGIN
  SELECT name INTO biz_name FROM public.businesses WHERE id = NEW.business_id;
  INSERT INTO public.notifications(user_id,type,title,body,related_id)
  SELECT p.id, 'new_offer', 'Ưu đãi mới từ ' || COALESCE(biz_name,'doanh nghiệp'), NEW.title, NEW.business_id
  FROM public.profiles p WHERE p.status = 'approved';
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_offer AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_offer();

-- New message → notify receiver
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name text;
BEGIN
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications(user_id,type,title,body,related_id)
  VALUES (NEW.receiver_id,'new_message','Tin nhắn mới từ ' || COALESCE(sender_name,'người dùng'), LEFT(NEW.content,80), NEW.sender_id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- New report → notify business owner if send_to_business
CREATE OR REPLACE FUNCTION public.notify_new_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE biz_owner uuid; biz_name text;
BEGIN
  IF NEW.send_to_business AND NEW.target_type = 'business' THEN
    SELECT owner_id, name INTO biz_owner, biz_name FROM public.businesses WHERE id = NEW.target_id;
    IF biz_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,type,title,body,related_id)
      VALUES (biz_owner,'report_received','Báo cáo mới về ' || COALESCE(biz_name,'doanh nghiệp'), LEFT(NEW.description,120), NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_report AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_report();

-- =========================================================
-- 15. REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
