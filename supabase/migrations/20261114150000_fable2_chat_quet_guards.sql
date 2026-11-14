-- Fable phiên 2 (14/11/2026): siết Chat + sửa Quẹt. KHÔNG nới RLS nào; chỉ thêm chốt chặn.
--
-- 1) messages: policy UPDATE cho phép người NHẬN sửa mọi cột (kể cả nội dung tin của người gửi),
--    người GỬI đổi được receiver_id/type. Thêm trigger khoá cột: người nhận chỉ đổi is_read/read_at,
--    người gửi chỉ đổi content/edited_at. Người thường không tự gửi được tin type 'broadcast'.
-- 2) community_messages: người thường không tự ghim (is_pinned), không đổi created_at/topic/location/type.
-- 3) Quẹt: client dùng upsert → "thích lại" người từng bỏ qua (hoặc sau khi huỷ kết nối) đi nhánh
--    UPDATE, mà trigger tạo Kết nối chỉ chạy AFTER INSERT → không bao giờ ra Kết nối. Cho trigger
--    chạy cả khi UPDATE action sang 'like'. Không tạo Kết nối giữa 2 người đã chặn nhau.
-- 4) Quẹt: swipe_needs.updated_at chưa từng được cập nhật khi sửa bài → luật "bỏ qua hiện lại khi
--    chủ bài sửa" (#42) không chạy. Thêm trigger tự cập nhật khi NỘI DUNG đổi (bật/tắt thì không).
-- 5) Quẹt: "Hoàn tác" 1 lượt thích vừa ra Kết nối trước đây xoá match → trigger biến lượt thích của
--    NGƯỜI KIA thành "bỏ qua" 48h (mất lượt thích của họ). RPC undo_swipe_action hoàn tác sạch.

-- ── 1) messages ──
CREATE OR REPLACE FUNCTION public.guard_message_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  -- Chỉ chặn request trực tiếp từ client; hàm SECURITY DEFINER / cron / admin không bị ảnh hưởng.
  IF current_user NOT IN ('authenticated','anon') OR public.has_role(v_uid,'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'broadcast' THEN NEW.type := 'text'; END IF;
    NEW.is_read := false; NEW.read_at := NULL; NEW.edited_at := NULL; NEW.created_at := now();
    RETURN NEW;
  END IF;
  NEW.id := OLD.id; NEW.sender_id := OLD.sender_id; NEW.receiver_id := OLD.receiver_id;
  NEW.created_at := OLD.created_at; NEW.type := OLD.type; NEW.reply_to_id := OLD.reply_to_id;
  IF v_uid IS DISTINCT FROM OLD.sender_id THEN
    -- Không phải người gửi → không được đổi nội dung.
    NEW.content := OLD.content; NEW.image_url := OLD.image_url; NEW.edited_at := OLD.edited_at;
  END IF;
  IF v_uid IS DISTINCT FROM OLD.receiver_id THEN
    -- Không phải người nhận → không được tự đánh dấu "đã xem".
    NEW.is_read := OLD.is_read; NEW.read_at := OLD.read_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_00_guard_message_columns ON public.messages;
CREATE TRIGGER trg_00_guard_message_columns BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_columns();

-- ── 2) community_messages ──
CREATE OR REPLACE FUNCTION public.guard_community_message_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') OR public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;
  NEW.id := OLD.id; NEW.user_id := OLD.user_id; NEW.created_at := OLD.created_at;
  NEW.is_pinned := OLD.is_pinned; NEW.type := OLD.type; NEW.topic := OLD.topic;
  NEW.location := OLD.location; NEW.reply_to_id := OLD.reply_to_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_00_guard_community_columns ON public.community_messages;
CREATE TRIGGER trg_00_guard_community_columns BEFORE UPDATE ON public.community_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_community_message_columns();

-- ── 3) Quẹt: tạo Kết nối cả khi "thích lại" (UPDATE) ──
CREATE OR REPLACE FUNCTION public.handle_swipe_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_need_owner uuid;
  v_need_type need_type;
  v_reciprocal_need_id uuid;
  v_new_match uuid;
BEGIN
  IF NEW.action <> 'like' THEN
    RETURN NEW;
  END IF;
  -- UPDATE mà trước đó đã là 'like' (vd chỉ đổi created_at) → không xét lại.
  IF TG_OP = 'UPDATE' AND OLD.action = 'like' THEN
    RETURN NEW;
  END IF;
  -- undo_swipe_action() khôi phục lượt thích của người kia → không tạo lại Kết nối.
  IF current_setting('app.skip_swipe_match', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT user_id, need_type INTO v_need_owner, v_need_type
  FROM swipe_needs WHERE id = NEW.need_id;

  IF v_need_owner IS NULL OR public.is_blocked(NEW.actor_id, v_need_owner) THEN
    RETURN NEW;
  END IF;

  SELECT sn.id INTO v_reciprocal_need_id
  FROM swipe_needs sn
  JOIN swipe_actions sa ON sa.need_id = sn.id
  WHERE sn.user_id = NEW.actor_id
    AND sn.need_type = v_need_type
    AND sa.actor_id = v_need_owner
    AND sa.action = 'like'
  LIMIT 1;

  IF v_reciprocal_need_id IS NOT NULL THEN
    INSERT INTO swipe_matches (need_id_a, need_id_b, user_a, user_b, need_type)
    VALUES (
      LEAST(NEW.need_id, v_reciprocal_need_id),
      GREATEST(NEW.need_id, v_reciprocal_need_id),
      v_need_owner, NEW.actor_id, v_need_type
    )
    ON CONFLICT (need_id_a, need_id_b) DO NOTHING
    RETURNING id INTO v_new_match;

    -- Chỉ báo khi THẬT SỰ có Kết nối mới (trước đây trùng match vẫn tăng số thông báo).
    IF v_new_match IS NOT NULL THEN
      -- QUY TẮC #13: gộp thông báo Kết nối theo (user_id, category).
      INSERT INTO notifications (user_id, type, category, title, body, target_type, target_id, count)
      VALUES
        (v_need_owner, 'swipe_match', 'swipe_matches', 'Bạn có Kết nối mới trên Quẹt!', 'Nhấn để xem', 'swipe_need', NULL, 1),
        (NEW.actor_id, 'swipe_match', 'swipe_matches', 'Bạn có Kết nối mới trên Quẹt!', 'Nhấn để xem', 'swipe_need', NULL, 1)
      ON CONFLICT (user_id, category) WHERE category NOT IN ('achievements')
      DO UPDATE SET count = notifications.count + 1, is_read = false, created_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_swipe_match ON public.swipe_actions;
CREATE TRIGGER trg_swipe_match AFTER INSERT OR UPDATE OF action ON public.swipe_actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_swipe_match();

-- ── 4) Quẹt: updated_at tự cập nhật khi sửa NỘI DUNG bài ──
CREATE OR REPLACE FUNCTION public.touch_swipe_need_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.details IS DISTINCT FROM OLD.details
     OR NEW.area IS DISTINCT FROM OLD.area
     OR NEW.photo_url IS DISTINCT FROM OLD.photo_url
     OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls
     OR NEW.need_type IS DISTINCT FROM OLD.need_type THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END $$;

-- Tên "trg_touch…" xếp SAU "trg_mask_profanity" → so sánh trên nội dung đã che từ tục.
DROP TRIGGER IF EXISTS trg_touch_swipe_need_updated_at ON public.swipe_needs;
CREATE TRIGGER trg_touch_swipe_need_updated_at BEFORE UPDATE ON public.swipe_needs
  FOR EACH ROW EXECUTE FUNCTION public.touch_swipe_need_updated_at();

-- ── 5) Quẹt: hoàn tác sạch 1 lượt quẹt của CHÍNH MÌNH ──
CREATE OR REPLACE FUNCTION public.undo_swipe_action(_need_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_action_id uuid;
  v_owner uuid;
  v_other_need uuid;
  m record;
  v_unmatched int := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_auth'); END IF;
  SELECT id INTO v_action_id FROM swipe_actions WHERE need_id = _need_id AND actor_id = v_uid;
  IF v_action_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT user_id INTO v_owner FROM swipe_needs WHERE id = _need_id;

  -- Xoá lượt quẹt của mình TRƯỚC, rồi mới xoá Kết nối (nếu lượt thích này vừa tạo ra).
  DELETE FROM swipe_actions WHERE id = v_action_id;

  FOR m IN
    SELECT * FROM swipe_matches
    WHERE (need_id_a = _need_id OR need_id_b = _need_id)
      AND ((user_a = v_uid AND user_b = v_owner) OR (user_a = v_owner AND user_b = v_uid))
  LOOP
    v_other_need := CASE WHEN m.need_id_a = _need_id THEN m.need_id_b ELSE m.need_id_a END;
    -- Xoá match → trigger reset_swipe_actions_on_unmatch biến lượt thích của người kia thành
    -- "bỏ qua". Hoàn tác không phải huỷ kết nối: trả lượt thích của họ về như cũ.
    DELETE FROM swipe_matches WHERE id = m.id;
    PERFORM set_config('app.skip_swipe_match', '1', true);
    UPDATE swipe_actions SET action = 'like' WHERE need_id = v_other_need AND actor_id = v_owner;
    PERFORM set_config('app.skip_swipe_match', '', true);
    v_unmatched := v_unmatched + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'unmatched', v_unmatched);
END $$;

REVOKE ALL ON FUNCTION public.undo_swipe_action(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_swipe_action(uuid) TO authenticated;
