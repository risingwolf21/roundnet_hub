-- =============================================================================
-- Answer Deadline Reminders
-- =============================================================================

-- New columns on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS reminder_before text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;

ALTER TABLE public.events
  ADD CONSTRAINT reminder_before_is_interval
    CHECK (reminder_before IS NULL OR reminder_before::interval IS NOT NULL);

-- Notification topic
INSERT INTO notifications.notification_topics (topic, scope_type, description, default_enabled)
VALUES ('event.answer_deadline.reminder', 'event', 'Erinnerung: Anmeldeschluss naht', true)
ON CONFLICT (topic) DO NOTHING;

-- Worker function: sends push notifications to group members who have not yet
-- committed to an event when the answer deadline is approaching.
CREATE OR REPLACE FUNCTION public.send_answer_deadline_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, notifications
AS $$
DECLARE
  v_event   record;
  v_user_id uuid;
  v_count   integer := 0;
BEGIN
  FOR v_event IN
    SELECT e.id, e.title, e."group"
    FROM public.events e
    WHERE e."answerDeadline" IS NOT NULL
      AND e.reminder_before IS NOT NULL
      AND e.reminder_sent_at IS NULL
      AND e."isCancelled" = false
      AND e."answerDeadline" > now()
      AND e."answerDeadline" <= now() + e.reminder_before::interval
  LOOP
    FOR v_user_id IN
      SELECT gum."user"::uuid
      FROM public.group_user_mapping gum
      WHERE gum."group" = v_event."group"
        AND gum.role IN ('user', 'admin', 'trial')
        AND NOT EXISTS (
          SELECT 1 FROM public.event_attendance_user_mapping eaum
          WHERE eaum.event = v_event.id
            AND eaum."user" = gum."user"
            AND eaum.state NOT IN ('Unanswered', 'Waiting', 'WaitingAsTrial')
        )
    LOOP
      PERFORM notifications.enqueue_notification(
        p_user        := v_user_id,
        p_title       := 'Anmeldeschluss naht',
        p_body        := 'Bitte melde dich jetzt für "' || v_event.title || '" an!',
        p_topic       := 'event.answer_deadline.reminder',
        p_source_type := 'event',
        p_source_id   := v_event.id
      );
      v_count := v_count + 1;
    END LOOP;

    UPDATE public.events SET reminder_sent_at = now() WHERE id = v_event.id;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Reset trigger: clear reminder_sent_at when deadline or reminder window changes
CREATE OR REPLACE FUNCTION public.reset_reminder_sent_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."answerDeadline" IS DISTINCT FROM OLD."answerDeadline"
     OR NEW.reminder_before IS DISTINCT FROM OLD.reminder_before
  THEN
    NEW.reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_reminder_sent_at ON public.events;
CREATE TRIGGER trg_reset_reminder_sent_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.reset_reminder_sent_at();

-- =============================================================================
-- iCal token
-- =============================================================================

ALTER TABLE public.user
  ADD COLUMN IF NOT EXISTS ical_token uuid NOT NULL DEFAULT gen_random_uuid();

-- =============================================================================
-- Missing indexes (performance / RLS hot paths)
-- =============================================================================

-- event_attendance_user_mapping(event, state) — attending/waiting-list queries
CREATE INDEX IF NOT EXISTS ix_event_attendance_event_state
    ON public.event_attendance_user_mapping USING btree (event, state);

-- group_features("group") — feature-flag lookups
CREATE INDEX IF NOT EXISTS ix_group_features_group_fkey
    ON public.group_features USING btree ("group");

-- group_permissions("group") — permission lookups
CREATE INDEX IF NOT EXISTS ix_group_permissions_group_fkey
    ON public.group_permissions USING btree ("group");

-- group_user_mapping: read on every RLS check for events/challenges/items
CREATE INDEX IF NOT EXISTS idx_gum_group ON public.group_user_mapping ("group");
CREATE INDEX IF NOT EXISTS idx_gum_user ON public.group_user_mapping ("user");

-- event_attendance_user_mapping: every event page load
CREATE INDEX IF NOT EXISTS idx_eaum_event ON public.event_attendance_user_mapping (event);
CREATE INDEX IF NOT EXISTS idx_eaum_event_state ON public.event_attendance_user_mapping (event, state);

-- event_comments
CREATE INDEX IF NOT EXISTS idx_event_comments_event ON public.event_comments (event);
CREATE INDEX IF NOT EXISTS idx_event_comments_reply_to ON public.event_comments (reply_to);

-- notifications.notifications: unread badge on every page load
CREATE INDEX IF NOT EXISTS idx_notifications_notifications_user ON notifications.notifications ("user");

-- games.elo_history
CREATE INDEX IF NOT EXISTS idx_elo_history_user ON games.elo_history ("user");
CREATE INDEX IF NOT EXISTS idx_elo_history_match ON games.elo_history (match);

-- challenge_stats
CREATE INDEX IF NOT EXISTS idx_challenge_stats_user ON public.challenge_stats ("user");
CREATE INDEX IF NOT EXISTS idx_challenge_stats_challenge ON public.challenge_stats (challenge);

-- items / vouchers / history / group_features
CREATE INDEX IF NOT EXISTS idx_items_group ON public.items ("group");
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON public.vouchers ("user");
CREATE INDEX IF NOT EXISTS idx_history_user ON public.history ("user");
CREATE INDEX IF NOT EXISTS idx_group_features_group ON public.group_features ("group");

-- =============================================================================
-- ELO concurrent-sets race fix
-- =============================================================================

-- apply_elo_for_match is called by a AFTER INSERT trigger on games.sets.
-- When add_match_with_sets inserts multiple sets in a loop the trigger fires
-- once per row, causing duplicate/partial ELO history entries.  An advisory
-- transaction lock keyed on the match UUID serialises concurrent calls within
-- the same transaction and is automatically released at transaction end.
CREATE OR REPLACE FUNCTION games.apply_elo_for_match(p_match uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec record;
    outcome_a numeric;
    calc games.elo_calculation_result;
    hist record;
    v_cat_a text; v_cat_b text;
    v_eff_a numeric; v_eff_b numeric;
    v_sets_a int; v_sets_b int;
    v_pts_a int; v_pts_b int;
    v_total_sets int;
    v_cfg record;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('elo_for_match_' || p_match::text));

    SELECT * INTO v_cfg FROM games.elo_config WHERE id = 1;

    SELECT m.rated,
           p_a1.ka_index as r_a1, p_a1.rg_index as rg_a1, p_a1.matches_played as m_a1, p_a1.effective_rating_cached as eff_a1,
           p_a2.ka_index as r_a2, p_a2.rg_index as rg_a2, p_a2.matches_played as m_a2, p_a2.effective_rating_cached as eff_a2,
           p_b1.ka_index as r_b1, p_b1.rg_index as rg_b1, p_b1.matches_played as m_b1, p_b1.effective_rating_cached as eff_b1,
           p_b2.ka_index as r_b2, p_b2.rg_index as rg_b2, p_b2.matches_played as m_b2, p_b2.effective_rating_cached as eff_b2,
           m.a_player_1 as p_a1_id, m.a_player_2 as p_a2_id, m.b_player_1 as p_b1_id, m.b_player_2 as p_b2_id
    INTO rec FROM games.match m
    JOIN games.players p_a1 ON m.a_player_1 = p_a1.player JOIN games.players p_a2 ON m.a_player_2 = p_a2.player
    JOIN games.players p_b1 ON m.b_player_1 = p_b1.player JOIN games.players p_b2 ON m.b_player_2 = p_b2.player
    WHERE m.id = p_match FOR UPDATE;

    FOR hist IN SELECT * FROM games.elo_history WHERE match = p_match LOOP
        UPDATE games.players SET ka_index = ka_index - hist.delta, matches_played = matches_played - 1 WHERE player = hist."user";
    END LOOP;
    DELETE FROM games.elo_history WHERE match = p_match;

    SELECT
        COALESCE(count(*) FILTER (WHERE team_a_score > team_b_score), 0),
        COALESCE(count(*) FILTER (WHERE team_b_score > team_a_score), 0),
        COALESCE(sum(team_a_score), 0),
        COALESCE(sum(team_b_score), 0),
        count(*)
    INTO v_sets_a, v_sets_b, v_pts_a, v_pts_b, v_total_sets
    FROM games.sets WHERE match = p_match;

    IF v_total_sets = 0 THEN RETURN; END IF;

    outcome_a := CASE
        WHEN v_sets_a > v_sets_b THEN 1.0
        WHEN v_sets_b > v_sets_a THEN 0.0
        ELSE (CASE WHEN v_pts_a > v_pts_b THEN 1.0 WHEN v_pts_b > v_pts_a THEN 0.0 ELSE 0.5 END)
    END;

    calc := games.calculate_match_physics(rec.eff_a1, rec.eff_a2, rec.eff_b1, rec.eff_b2, rec.m_a1, rec.m_a2, rec.m_b1, rec.m_b2, outcome_a, rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id);
    v_cat_a := games.team_category(rec.p_a1_id, rec.p_a2_id);
    v_cat_b := games.team_category(rec.p_b1_id, rec.p_b2_id);
    v_eff_a := ((rec.eff_a1 + rec.eff_a2)/2.0) + games.category_offset(v_cat_a);
    v_eff_b := ((rec.eff_b1 + rec.eff_b2)/2.0) + games.category_offset(v_cat_b);

    IF NOT COALESCE(rec.rated, true) THEN RETURN; END IF;

    INSERT INTO games.elo_calc_log(
        match, calculated_at, eff_team_a, eff_team_b, expected_a, expected_b,
        k_base, k_eff, category_a, category_b, upset_levels, upset_multiplier,
        outcome_a, sets_a, sets_b, points_a, points_b,
        a1_user, a2_user, b1_user, b2_user,
        rg_a1_used, rg_a2_used, rg_b1_used, rg_b2_used,
        ka_a1_used, ka_a2_used, ka_b1_used, ka_b2_used, cfg_snapshot
    )
    VALUES (
        p_match, now(), v_eff_a, v_eff_b, calc.exp_a, 1.0-calc.exp_a,
        v_cfg.k_factor, (v_cfg.k_factor * calc.global_conf), v_cat_a, v_cat_b, 0, 1.0,
        outcome_a, v_sets_a, v_sets_b, v_pts_a, v_pts_b,
        rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id,
        rec.rg_a1, rec.rg_a2, rec.rg_b1, rec.rg_b2,
        rec.r_a1, rec.r_a2, rec.r_b1, rec.r_b2,
        jsonb_build_object('w_rg', v_cfg.w_rg, 'w_ka', v_cfg.w_ka, 'rg_offset', v_cfg.rg_offset, 'rg_scale', v_cfg.rg_scale, 'k_factor', v_cfg.k_factor)
    )
    ON CONFLICT (match) DO UPDATE SET
        calculated_at = excluded.calculated_at, outcome_a = excluded.outcome_a,
        sets_a = excluded.sets_a, sets_b = excluded.sets_b;

    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a1 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a1_id;
    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a2 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a2_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b1 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b1_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b2 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b2_id;

    INSERT INTO games.elo_history(match, "user", old_rating, new_rating, delta, eff_old_rating, eff_new_rating)
    VALUES
        (p_match, rec.p_a1_id, rec.r_a1, rec.r_a1 + calc.base_delta, calc.base_delta, rec.eff_a1, rec.eff_a1 + calc.final_sync_delta),
        (p_match, rec.p_a2_id, rec.r_a2, rec.r_a2 + calc.base_delta, calc.base_delta, rec.eff_a2, rec.eff_a2 + calc.final_sync_delta),
        (p_match, rec.p_b1_id, rec.r_b1, rec.r_b1 - calc.base_delta, -calc.base_delta, rec.eff_b1, rec.eff_b1 - calc.final_sync_delta),
        (p_match, rec.p_b2_id, rec.r_b2, rec.r_b2 - calc.base_delta, -calc.base_delta, rec.eff_b2, rec.eff_b2 - calc.final_sync_delta);
END;
$function$
;

-- =============================================================================
-- Notification reliability: no_subscriptions status + updated enqueue function
-- =============================================================================

-- Add 'no_subscriptions' as a valid outbox status so entries can be marked
-- undeliverable immediately when a user has no active push subscriptions.
alter table "notifications"."notification_outbox"
  drop constraint if exists "notification_outbox_status_check";

alter table "notifications"."notification_outbox"
  add constraint "notification_outbox_status_check"
  CHECK ((status = ANY (ARRAY[
    'pending'::text,
    'processing'::text,
    'sent'::text,
    'dead'::text,
    'no_subscriptions'::text
  ])));

CREATE OR REPLACE FUNCTION notifications.enqueue_notification(p_user uuid, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_urgency text DEFAULT 'normal'::text, p_ttl_seconds integer DEFAULT NULL::integer, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_dedupe_key text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_id bigint;
  v_nid uuid;
begin
  insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
  values (p_user, p_tenant, coalesce(p_topic,'custom'), p_title, p_body, p_data, p_source_type, p_source_id)
  returning id into v_nid;

  insert into notifications.notification_outbox("user", title, body, data, urgency, ttl_seconds, tenant, dedupe_key, notification)
  values (p_user, p_title, p_body, p_data, p_urgency, p_ttl_seconds, p_tenant, p_dedupe_key, v_nid)
  returning id into v_id;

  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select v_id, s.id
  from notifications.web_push_subscriptions s
  where s."user" = p_user and s.revoked_at is null;

  IF NOT FOUND THEN
    UPDATE notifications.notification_outbox
    SET status = 'no_subscriptions', sent_at = now()
    WHERE id = v_id;
  END IF;

  return v_id;
end;$function$
;

-- =============================================================================
-- Attendance race condition fix: advisory locks on all three trigger functions
-- =============================================================================

-- 1. trg_update_attendance_on_maxattendees_change
--    Fires: events AFTER UPDATE when maxAttendees changes
CREATE OR REPLACE FUNCTION public.trg_update_attendance_on_maxattendees_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
    newEvent public.events;
begin
    PERFORM pg_advisory_xact_lock(('x' || md5('attendance_event_' || NEW.id::text))::bit(64)::bigint);
    select * into newEvent from events where id = new.id limit 1;
    if (new."maxAttendees" < old."maxAttendees") then
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'Attending'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'Waiting'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
    else
        if (new."maxAttendees" > old."maxAttendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'Waiting'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'Attending'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;$function$
;

-- 2. trg_update_waiting_list_attendance
--    Fires: event_attendance_user_mapping AFTER DELETE OR UPDATE
CREATE OR REPLACE FUNCTION public.trg_update_waiting_list_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
  BEGIN
    PERFORM pg_advisory_xact_lock(('x' || md5('attendance_event_' || NEW.event::text))::bit(64)::bigint);
    if((Select count(*) from event_attendance_user_mapping where event_attendance_user_mapping.event = NEW.event AND event_attendance_user_mapping.state = 'Attending') < (Select events."maxAttendees" from events where events.id = NEW.event LIMIT 1) AND NEW.state = 'Declined') then

    UPDATE event_attendance_user_mapping
    SET state = 'Attending'
    WHERE event_attendance_user_mapping."user" = (SELECT event_attendance_user_mapping."user" from event_attendance_user_mapping where event_attendance_user_mapping.state = 'Waiting' AND event_attendance_user_mapping.event = NEW.event order by event_attendance_user_mapping."lastUpdate" Limit 1);
    end if;
    return NEW;
  END;$function$
;

-- 3. auto_promote_from_waitinglist
--    Fires: event_attendance_user_mapping AFTER UPDATE (via trigger set up elsewhere)
CREATE OR REPLACE FUNCTION public.auto_promote_from_waitinglist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'notifications', 'pg_temp'
AS $$
DECLARE
  v_max_attendees integer;
  v_attending_count integer;
  v_next_user uuid;
  v_next_state text;
  v_event_title text;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || md5('attendance_event_' || NEW.event::text))::bit(64)::bigint);

  IF NEW.state NOT IN ('Declined') THEN
    RETURN NEW;
  END IF;
  IF OLD.state NOT IN ('Attending', 'AttendingAsTrial') THEN
    RETURN NEW;
  END IF;

  SELECT "maxAttendees", title
  INTO v_max_attendees, v_event_title
  FROM public.events
  WHERE id = NEW.event;

  IF v_max_attendees IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_attending_count
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event
    AND state IN ('Attending', 'AttendingAsTrial');

  IF v_attending_count >= v_max_attendees THEN
    RETURN NEW;
  END IF;

  SELECT "user"::uuid, state
  INTO v_next_user, v_next_state
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event
    AND state IN ('Waiting', 'WaitingAsTrial')
  ORDER BY "lastUpdate" ASC
  LIMIT 1;

  IF v_next_user IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.event_attendance_user_mapping
  SET state = CASE
    WHEN v_next_state = 'WaitingAsTrial' THEN 'AttendingAsTrial'
    ELSE 'Attending'
  END,
  "lastUpdate" = now()
  WHERE event = NEW.event
    AND "user" = v_next_user::text;

  PERFORM notifications.enqueue_notification(
    p_user        := v_next_user,
    p_title       := 'Du bist aufgerückt!',
    p_body        := 'Ein Platz wurde frei. Du bist von der Warteliste auf die Teilnehmerliste gerutscht.',
    p_topic       := 'event.waitinglist.promoted',
    p_source_type := 'event',
    p_source_id   := NEW.event
  );

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Unique constraint on event_transformation_applications
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_transformation_event'
      AND conrelid = 'public.event_transformation_applications'::regclass
  ) THEN
    ALTER TABLE public.event_transformation_applications
      ADD CONSTRAINT uq_transformation_event
        UNIQUE (transformation_id, event_id);
  END IF;
END $$;
