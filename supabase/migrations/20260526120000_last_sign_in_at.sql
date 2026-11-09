-- last_seen_at mirrors the most recent auth.sessions.updated_at for a user.
-- auth.sessions.updated_at is refreshed on every token refresh, so this tracks
-- real app activity rather than just explicit sign-ins.
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NULL;

-- Mirror function: fires on every session INSERT or UPDATE (token refresh)
CREATE OR REPLACE FUNCTION public.trg_sync_session_last_seen()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
BEGIN
  UPDATE public."user"
     SET last_seen_at = NEW.updated_at
   WHERE id = NEW.user_id
     AND (last_seen_at IS NULL OR NEW.updated_at > last_seen_at);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_session_updated ON auth.sessions;
CREATE TRIGGER on_auth_session_updated
  AFTER INSERT OR UPDATE ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_session_last_seen();

-- Backfill: take the most recent session per user
UPDATE public."user" u
   SET last_seen_at = s.last_seen
  FROM (
    SELECT user_id, MAX(updated_at) AS last_seen
      FROM auth.sessions
     GROUP BY user_id
  ) s
 WHERE s.user_id = u.id;
