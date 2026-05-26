-- Add last_sign_in_at column to public.user to mirror auth.users without exposing auth schema
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz NULL;

-- Mirror function: fires when auth.users.last_sign_in_at changes (e.g. on every sign-in)
CREATE OR REPLACE FUNCTION public.trg_sync_last_sign_in_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
BEGIN
  UPDATE public."user"
     SET last_sign_in_at = NEW.last_sign_in_at
   WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_updated_last_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_updated_last_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION public.trg_sync_last_sign_in_at();

-- Backfill existing users
UPDATE public."user" u
   SET last_sign_in_at = a.last_sign_in_at
  FROM auth.users a
 WHERE a.id = u.id
   AND a.last_sign_in_at IS NOT NULL;
