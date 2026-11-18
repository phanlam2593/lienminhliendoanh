-- Fable phiên 4 — mục #13 (anh Kir duyệt 15/11): thả tim bài tường → tin nhắn 1-1 cho chủ bài, kiểu Messenger
-- "❤️ đã thích bài viết của bạn: “…”", chạm "Xem bài viết" mở đúng bài.
--
-- Làm ở server (trigger) cho chặt:
--  • không gửi khi tự thả tim bài mình, khi 2 người chặn nhau, khi người thả tim chưa được duyệt;
--  • đúng 1 tin cho mỗi (người thả tim, bài): bỏ tim rồi thả lại không tạo thêm tin (UNIQUE một phần);
--  • thông báo dùng luôn thông báo tin nhắn sẵn có (notify_new_message → mở Hộp thư) — vẫn tôn trọng tắt tiếng / tuỳ chọn.
-- Người dùng KHÔNG tự tạo được tin loại này từ client (guard_message_columns).

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ref_post_id uuid REFERENCES public.wall_posts(id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check
  CHECK (type = ANY (ARRAY['text','image','sticker','broadcast','gif','voice','post_reaction']));

CREATE UNIQUE INDEX IF NOT EXISTS messages_post_reaction_once
  ON public.messages (sender_id, ref_post_id) WHERE type = 'post_reaction' AND ref_post_id IS NOT NULL;

-- Khoá cột: thêm ref_post_id + loại post_reaction (giữ nguyên phần cũ của 14/11).
CREATE OR REPLACE FUNCTION public.guard_message_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_user NOT IN ('authenticated','anon') OR public.has_role(v_uid,'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.type IN ('broadcast','post_reaction') THEN NEW.type := 'text'; END IF;
    NEW.ref_post_id := NULL;
    NEW.is_read := false; NEW.read_at := NULL; NEW.edited_at := NULL; NEW.created_at := now();
    RETURN NEW;
  END IF;
  NEW.id := OLD.id; NEW.sender_id := OLD.sender_id; NEW.receiver_id := OLD.receiver_id;
  NEW.created_at := OLD.created_at; NEW.type := OLD.type; NEW.reply_to_id := OLD.reply_to_id;
  NEW.ref_post_id := OLD.ref_post_id;
  IF v_uid IS DISTINCT FROM OLD.sender_id OR OLD.type = 'post_reaction' THEN
    -- Không phải người gửi (hoặc là tin hệ thống tạo) → không được đổi nội dung.
    NEW.content := OLD.content; NEW.image_url := OLD.image_url; NEW.edited_at := OLD.edited_at;
  END IF;
  IF v_uid IS DISTINCT FROM OLD.receiver_id THEN
    NEW.is_read := OLD.is_read; NEW.read_at := OLD.read_at;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.post_reaction_to_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_content text;
  v_image text;
  v_snip text;
BEGIN
  SELECT user_id, content, image_url INTO v_owner, v_content, v_image FROM public.wall_posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  IF public.is_blocked(NEW.user_id, v_owner) THEN RETURN NEW; END IF;
  IF NOT (public.is_approved_member(NEW.user_id) OR public.has_role(NEW.user_id, 'admin')) THEN RETURN NEW; END IF;

  v_snip := btrim(regexp_replace(coalesce(v_content, ''), '\s+', ' ', 'g'));
  IF v_snip = '' THEN
    v_snip := CASE WHEN v_image IS NOT NULL THEN '📷 ảnh' ELSE '' END;
  ELSIF char_length(v_snip) > 80 THEN
    v_snip := left(v_snip, 80) || '…';
  END IF;

  INSERT INTO public.messages (sender_id, receiver_id, type, content, ref_post_id)
  VALUES (
    NEW.user_id, v_owner, 'post_reaction',
    '❤️ đã thích bài viết của bạn' || CASE WHEN v_snip <> '' THEN ': “' || v_snip || '”' ELSE '' END,
    NEW.post_id
  )
  ON CONFLICT (sender_id, ref_post_id) WHERE type = 'post_reaction' AND ref_post_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_post_reaction_to_message ON public.wall_post_reactions;
CREATE TRIGGER trg_post_reaction_to_message AFTER INSERT ON public.wall_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.post_reaction_to_message();
