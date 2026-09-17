ALTER TABLE public.messages DROP CONSTRAINT messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check
  CHECK (type = ANY (ARRAY['text','image','sticker','broadcast','gif','voice']));

ALTER TABLE public.community_messages DROP CONSTRAINT community_messages_type_check;
ALTER TABLE public.community_messages ADD CONSTRAINT community_messages_type_check
  CHECK (type = ANY (ARRAY['text','image','sticker','gif','voice']));