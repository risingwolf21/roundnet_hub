-- Language of a user ('de' or 'en'). The app UI follows it, and so do server-written texts
-- (push / in-app notifications, see 20261103110000_localized_notifications.sql).
-- Users may change their own value: trg_user_protect_columns only guards id/role/verified/disabled/email.
alter table public."user"
  add column if not exists language text not null default 'de'
  constraint user_language_check check (language in ('de', 'en'));

-- Sign-up: take the language the person had selected on the device (auth metadata "language").
CREATE OR REPLACE FUNCTION public.trg_handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
  v_name    text;
  v_display text;
  v_lang    text;
BEGIN
  -- Aus Metadata sinnvolle Werte ziehen, mit Fallbacks
  v_name    := COALESCE(
                 NEW.raw_user_meta_data->>'name',
                 NEW.raw_user_meta_data->>'displayName',
                 'Anonymous'
               );

  v_display := COALESCE(
                 NEW.raw_user_meta_data->>'displayName',
                 v_name
               );

  -- Only the two supported languages are accepted; anything else falls back to German.
  v_lang := CASE WHEN NEW.raw_user_meta_data->>'language' = 'en' THEN 'en' ELSE 'de' END;

  -- In deine User-Tabelle eintragen (UUID als Text, wie bei dir üblich)
  INSERT INTO public."user"("id","displayName","email","name","language")
  VALUES (NEW.id, v_display, NEW.email, v_name, v_lang)
  ON CONFLICT ("id") DO NOTHING;

  RETURN NEW;
END;$function$;
