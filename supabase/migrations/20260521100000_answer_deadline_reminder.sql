-- 1. New columns on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS reminder_before text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;

ALTER TABLE public.events
  ADD CONSTRAINT reminder_before_is_interval
    CHECK (reminder_before IS NULL OR reminder_before::interval IS NOT NULL);

-- 2. Notification topic
INSERT INTO notifications.notification_topics (topic, scope_type, label, enabled)
VALUES ('event.answer_deadline.reminder', 'event', 'Erinnerung: Anmeldeschluss naht', true)
ON CONFLICT (topic) DO NOTHING;

-- 3. Worker function
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
    SELECT e.id, e.title, e."groupId"
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
      WHERE gum."group" = v_event."groupId"
        AND gum.role IN ('user', 'admin', 'trial')
        AND NOT EXISTS (
          SELECT 1 FROM public.event_attendance_user_mapping eaum
          WHERE eaum.event = v_event.id
            AND eaum."user" = gum."user"::uuid
            AND eaum.state NOT IN ('Pending', 'Waiting', 'WaitingAsTrial')
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

-- 4. Reset trigger: clear reminder_sent_at when deadline or window changes
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
