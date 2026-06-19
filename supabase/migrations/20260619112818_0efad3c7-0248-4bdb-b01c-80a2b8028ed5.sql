
-- review_replies
CREATE TABLE public.review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_replies TO authenticated;
GRANT SELECT ON public.review_replies TO anon;
GRANT ALL ON public.review_replies TO service_role;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_replies read all" ON public.review_replies FOR SELECT USING (true);
CREATE POLICY "review_replies owner insert" ON public.review_replies FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(),'admin')
      OR EXISTS (
        SELECT 1 FROM public.reviews r
        JOIN public.businesses b ON b.id = r.business_id
        WHERE r.id = review_id AND b.owner_id = auth.uid()
      )
    )
  );
CREATE POLICY "review_replies author delete" ON public.review_replies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "review_replies admin manage" ON public.review_replies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- community_messages
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community read approved" ON public.community_messages FOR SELECT TO authenticated
  USING (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "community insert approved own" ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "community delete own or admin" ON public.community_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER TABLE public.community_messages REPLICA IDENTITY FULL;
