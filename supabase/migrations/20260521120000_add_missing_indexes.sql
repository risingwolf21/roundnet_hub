-- Add missing indexes on FK columns to eliminate O(N) RLS table scans.
--
-- Most FK-column indexes were added in 20260414063842_advisor_fixes.sql.
-- This migration covers the remaining gaps identified after that run:
--
--   • event_attendance_user_mapping(event, state) — composite used by the
--     attending/declined count sub-selects in events_user_view and the
--     maxAttendees waiting-list logic (every event page load).
--   • group_features("group") — feature-flag lookups for every user_features
--     view evaluation (used in RLS / UI on every page that checks features).
--   • group_permissions("group") — permission lookups for every user_permissions
--     view evaluation (used in RLS authorize() on every authenticated request).

CREATE INDEX IF NOT EXISTS ix_event_attendance_event_state
    ON public.event_attendance_user_mapping USING btree (event, state);

CREATE INDEX IF NOT EXISTS ix_group_features_group_fkey
    ON public.group_features USING btree ("group");

CREATE INDEX IF NOT EXISTS ix_group_permissions_group_fkey
    ON public.group_permissions USING btree ("group");
