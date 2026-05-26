-- Add missing indexes on FK columns to eliminate full table scans in RLS policies.
--
-- All indexes use IF NOT EXISTS so this migration is safe to re-run and will
-- not conflict with indexes that may already exist under different names from
-- earlier migrations (advisor_fixes, bug_fixes, etc.).

-- ============================================================
-- Critical: RLS policy hot paths
-- ============================================================

-- group_user_mapping: read on every RLS check for events/challenges/items
CREATE INDEX IF NOT EXISTS idx_gum_group ON public.group_user_mapping ("group");
CREATE INDEX IF NOT EXISTS idx_gum_user ON public.group_user_mapping ("user");

-- event_attendance_user_mapping: every event page load
CREATE INDEX IF NOT EXISTS idx_eaum_event ON public.event_attendance_user_mapping (event);
CREATE INDEX IF NOT EXISTS idx_eaum_event_state ON public.event_attendance_user_mapping (event, state);

-- event_comments: every comments tab
CREATE INDEX IF NOT EXISTS idx_event_comments_event ON public.event_comments (event);

-- notifications: unread badge on every page load
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications ("user");

-- ============================================================
-- High value: FK columns frequently used in queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_elo_history_user ON games.elo_history ("user");
CREATE INDEX IF NOT EXISTS idx_elo_history_match ON games.elo_history (match);
CREATE INDEX IF NOT EXISTS idx_challenge_stats_user ON public.challenge_stats ("user");
CREATE INDEX IF NOT EXISTS idx_challenge_stats_challenge ON public.challenge_stats (challenge);
CREATE INDEX IF NOT EXISTS idx_items_group ON public.items ("group");
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON public.vouchers ("user");
CREATE INDEX IF NOT EXISTS idx_history_user ON public.history ("user");
CREATE INDEX IF NOT EXISTS idx_event_comments_reply_to ON public.event_comments (reply_to);
CREATE INDEX IF NOT EXISTS idx_group_features_group ON public.group_features ("group");
