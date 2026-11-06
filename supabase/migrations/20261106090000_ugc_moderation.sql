-- User generated content safety: terms acceptance, reporting, blocking and moderation of comments.

-- 1) Terms acceptance
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

CREATE OR REPLACE FUNCTION public.trg_handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
  v_name    text;
  v_display text;
  v_lang    text;
  v_terms   text;
BEGIN
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

  v_terms := NULLIF(NEW.raw_user_meta_data->>'terms_version', '');

  INSERT INTO public."user"("id","displayName","email","name","language","terms_version","terms_accepted_at")
  VALUES (NEW.id, v_display, NEW.email, v_name, v_lang, v_terms, CASE WHEN v_terms IS NULL THEN NULL ELSE now() END)
  ON CONFLICT ("id") DO NOTHING;

  RETURN NEW;
END;$function$;

-- 2) Permission to handle reports. Whoever can manage users can moderate until grants are adjusted.
INSERT INTO public.permissions (name, description)
VALUES ('moderation.manage', 'Gemeldete Inhalte prüfen, entfernen oder ablehnen')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_direct_grants ("user", tenant, kind, key)
SELECT "user", tenant, kind, 'moderation.manage'
FROM public.user_direct_grants
WHERE key = 'users.manage' AND kind = 'perm'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_direct_grants x
    WHERE x."user" = user_direct_grants."user" AND x.tenant = user_direct_grants.tenant AND x.key = 'moderation.manage'
  );

INSERT INTO public.group_permissions ("group", permission)
SELECT "group", 'moderation.manage' FROM public.group_permissions WHERE permission = 'users.manage'
ON CONFLICT DO NOTHING;

-- 3) Reports
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reporter uuid NOT NULL REFERENCES public."user"(id),
  comment_id uuid REFERENCES public.event_comments(id) ON DELETE SET NULL,
  reported_user uuid REFERENCES public."user"(id),
  comment_text text,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  details text CHECK (details IS NULL OR char_length(details) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'removed')),
  handled_by uuid REFERENCES public."user"(id),
  handled_at timestamptz
);

CREATE UNIQUE INDEX content_reports_reporter_comment_key ON public.content_reports (reporter, comment_id);
CREATE INDEX content_reports_status_idx ON public.content_reports (status, created_at);
CREATE INDEX content_reports_reported_user_idx ON public.content_reports (reported_user);
CREATE INDEX content_reports_handled_by_idx ON public.content_reports (handled_by);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Fills the reported user and keeps a copy of the text, because the comment can be removed later.
CREATE OR REPLACE FUNCTION public.trg_content_report_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  SELECT c."user", c.comment INTO NEW.reported_user, NEW.comment_text
  FROM public.event_comments c WHERE c.id = NEW.comment_id;
  IF NEW.reported_user IS NULL THEN
    RAISE EXCEPTION 'comment not found' USING errcode = 'P0002';
  END IF;
  IF NEW.reported_user = NEW.reporter THEN
    RAISE EXCEPTION 'cannot report own content' USING errcode = '22023';
  END IF;
  NEW.status := 'open';
  NEW.handled_by := NULL;
  NEW.handled_at := NULL;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_content_report_fill() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_content_report_fill BEFORE INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_content_report_fill();

-- Only comments the reporter can see (RLS applies inside the sub-select) may be reported.
CREATE POLICY content_reports_insert_own ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (
    reporter = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.event_comments c WHERE c.id = comment_id)
  );

CREATE POLICY content_reports_select ON public.content_reports FOR SELECT TO authenticated
  USING (reporter = (SELECT auth.uid()) OR (SELECT public.authorize('moderation.manage')));

REVOKE ALL ON public.content_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

-- Moderators decide via this function only, so status changes and removals stay consistent.
CREATE OR REPLACE FUNCTION public.moderate_report(p_report uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comment uuid;
BEGIN
  IF NOT COALESCE(public.authorize('moderation.manage'), false) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;
  IF p_action NOT IN ('dismiss', 'remove') THEN
    RAISE EXCEPTION 'unknown action' USING errcode = '22023';
  END IF;

  SELECT comment_id INTO v_comment FROM public.content_reports WHERE id = p_report FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found' USING errcode = 'P0002';
  END IF;

  -- Every open report about the same comment is settled together.
  UPDATE public.content_reports
  SET status = CASE WHEN p_action = 'remove' THEN 'removed' ELSE 'dismissed' END,
      handled_by = (SELECT auth.uid()),
      handled_at = now()
  WHERE status = 'open' AND (id = p_report OR (v_comment IS NOT NULL AND comment_id = v_comment));

  IF p_action = 'remove' AND v_comment IS NOT NULL THEN
    -- Replies stay, but become top-level comments.
    UPDATE public.event_comments SET reply_to = NULL WHERE reply_to = v_comment;
    DELETE FROM public.event_comments WHERE id = v_comment;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.moderate_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_report(uuid, text) TO authenticated, service_role;

-- 4) Blocking
CREATE TABLE public.user_blocks (
  blocker uuid NOT NULL REFERENCES public."user"(id),
  blocked uuid NOT NULL REFERENCES public."user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker, blocked),
  CHECK (blocker <> blocked)
);
CREATE INDEX user_blocks_blocked_idx ON public.user_blocks (blocked);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_blocks_own ON public.user_blocks FOR ALL TO authenticated
  USING (blocker = (SELECT auth.uid()))
  WITH CHECK (blocker = (SELECT auth.uid()));

REVOKE ALL ON public.user_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

-- Comments of users you blocked are hidden for you.
DROP POLICY comments_select_member ON public.event_comments;
CREATE POLICY comments_select_member ON public.event_comments FOR SELECT TO authenticated
  USING (
    authorize('event.comment'::text)
    AND is_full_member_of_event(event)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE b.blocker = (SELECT auth.uid()) AND b.blocked = event_comments."user"
    )
  );
