BEGIN;

SET LOCAL TIME ZONE 'UTC';
SELECT plan(3);


INSERT INTO public.event_group(id,name,visible,is_public,need_request_to_join)
VALUES ('00000000-0000-0000-0000-0000000000aa','Open Group',TRUE,TRUE,FALSE)
ON CONFLICT (id) DO UPDATE
SET is_public = TRUE,
    need_request_to_join = TRUE;

SELECT tests.create_supabase_user('some_user', 'some_user@test.com');
SELECT tests.authenticate_as('some_user');

SELECT lives_ok(
  $$
  INSERT INTO public.group_user_mapping("user","group","role")
  VALUES (tests.get_supabase_uid('some_user'),'00000000-0000-0000-0000-0000000000aa','user')
  ON CONFLICT DO NOTHING
  $$,
  'Direkter Insert als role=user erlaubt'
);

SELECT throws_like(
  $$
  INSERT INTO public.group_user_mapping("user","group","role")
  VALUES (tests.get_supabase_uid('some_user'),'00000000-0000-0000-0000-0000000000aa','admin')
  $$,
  '%policy%',
  'Direkter Insert als role=admin verboten'
);

-- Groups can only be created by platform admins / service_role
SELECT tests.authenticate_as_service_role();
INSERT INTO public.event_group(id,name,visible,is_public,need_request_to_join)
VALUES ('00000000-0000-0000-0000-0000000000bb','Closed Group',TRUE,FALSE,TRUE)
ON CONFLICT (id) DO UPDATE
SET is_public = FALSE, need_request_to_join = TRUE;
SELECT tests.authenticate_as('some_user');

SELECT throws_like(
  $$
  INSERT INTO public.group_user_mapping("user","group","role")
  VALUES (tests.get_supabase_uid('some_user'),'00000000-0000-0000-0000-0000000000bb','user')
  $$,
  '%policy%',
  'join_public_group verweigert Closed Group'
);


SELECT * FROM finish();
ROLLBACK;
