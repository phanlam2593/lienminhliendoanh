-- Ensure endpoint is unique so client upsert(onConflict: endpoint) works
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key
  ON public.push_subscriptions (endpoint);

-- pg_net for async HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger: on every new notification row, POST the row to the send-push edge function
CREATE OR REPLACE FUNCTION public.notifications_dispatch_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text := 'https://ewquysvcjuqdkfieeuxd.supabase.co/functions/v1/send-push';
BEGIN
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'record', to_jsonb(NEW)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never block notification inserts if push dispatch fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_dispatch_push ON public.notifications;
CREATE TRIGGER trg_notifications_dispatch_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_dispatch_push();