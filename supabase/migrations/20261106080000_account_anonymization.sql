-- Account deletion by anonymization.
--
-- The auth user is soft-deleted by the delete-account edge function; this function scrubs
-- everything personal on the app side and keeps the shared history (games, drinks, payments,
-- comments, key log) attached to an anonymous "deleted user" so other members' data stays
-- consistent. Idempotent: running it again on an already anonymized user is harmless.
-- Only the service role (edge function) may call it.

-- Do not call the fetch-player-info worker when an RG link is being removed.
CREATE OR REPLACE FUNCTION games.trg_fetch_player_info_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  IF new.rg_link IS NULL THEN
    RETURN NEW;
  END IF;
  perform public.invoke_edge_function(
    'fetch-player-info',
    jsonb_build_object(
      'rg_link', new.rg_link,
      'player',  new.player
    ),
    5000
  );
  RETURN NEW;
END;$function$;

CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_label constant text := 'Gelöschter Nutzer';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."user" WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user % not found', p_user_id USING ERRCODE = 'P0002';
  END IF;

  -- Profile: no name, e-mail or avatar; account can no longer be used.
  UPDATE public."user"
  SET name = v_label,
      "displayName" = v_label,
      email = 'deleted-' || p_user_id || '@deleted.invalid',
      "avatarUrl" = NULL,
      disabled = true,
      verified = false,
      role = 'user',
      last_seen_at = NULL
  WHERE id = p_user_id;

  -- Copies of the name and free text written by the user in shared content.
  UPDATE public.event_comments SET "displayName" = v_label WHERE "user" = p_user_id;
  UPDATE public.event_bring_pledges SET notes = NULL WHERE "user" = p_user_id;

  -- Player profile (ranking history stays, identity goes).
  UPDATE games.players
  SET display_name = v_label,
      rg_id = NULL,
      rg_index = NULL,
      rg_avatar_url = NULL
  WHERE linked_user_id = p_user_id;

  UPDATE games.players
  SET rg_link = NULL
  WHERE linked_user_id = p_user_id AND rg_link IS NOT NULL;

  -- Access and membership.
  DELETE FROM public.group_user_mapping WHERE "user" = p_user_id;
  DELETE FROM public.user_direct_grants WHERE "user" = p_user_id;
  DELETE FROM public.user_blocks WHERE blocker = p_user_id OR blocked = p_user_id;

  -- Upcoming commitments no longer make sense; past ones are kept for statistics.
  DELETE FROM public.event_attendance_user_mapping a
  USING public.events e
  WHERE a."user" = p_user_id AND a.event = e.id AND e."startingDateTime" > now();

  DELETE FROM public.event_bring_pledges p
  USING public.events e
  WHERE p."user" = p_user_id AND p.event = e.id AND e."startingDateTime" > now();

  -- Notifications and push endpoints.
  DELETE FROM notifications.web_push_subscriptions WHERE "user" = p_user_id;
  DELETE FROM notifications.notification_outbox WHERE "user" = p_user_id;
  DELETE FROM notifications.notifications WHERE "user" = p_user_id;
  DELETE FROM notifications.user_notification_preferences WHERE "user" = p_user_id;

  -- The audit trail keeps copies of the old profile values; drop the ones that identify the person.
  DELETE FROM audit.log
  WHERE (schema_name = 'public' AND table_name = 'user' AND row_pk ->> 'id' = p_user_id::text)
     OR (schema_name = 'games' AND table_name = 'players'
         AND (coalesce(old_data, '{}'::jsonb) ->> 'linked_user_id' = p_user_id::text
              OR coalesce(new_data, '{}'::jsonb) ->> 'linked_user_id' = p_user_id::text));
END;
$function$;

REVOKE ALL ON FUNCTION public.anonymize_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_user(uuid) TO service_role;
