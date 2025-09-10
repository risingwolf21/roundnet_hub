
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='supabase-dbdev') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='supabase-dbdev') THEN
      EXECUTE 'CREATE EXTENSION "supabase-dbdev" WITH SCHEMA extensions';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='basejump-supabase_test_helpers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='basejump-supabase_test_helpers') THEN
      EXECUTE 'CREATE EXTENSION "basejump-supabase_test_helpers" WITH SCHEMA extensions';
    END IF;
  END IF;
END $$;

select tests.create_supabase_user('user_1a', 'user_1a@test.com');
select tests.create_supabase_user('user_2a', 'user_2a@test.com');
select tests.create_supabase_user('user_1b', 'user_1b@test.com');
select tests.create_supabase_user('user_2b', 'user_2b@test.com');
select tests.create_supabase_user('user_1c', 'user_1c@test.com');
select tests.create_supabase_user('user_no_group', 'user_no_group@test.com');
select tests.create_supabase_user('user_group_empty', 'user_group_empty@test.com');
select tests.create_supabase_user('admin', 'admin@test.com');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.event_group WHERE id='00000000-0000-0000-0000-000000000042') THEN
    INSERT INTO public.event_group(id,name,visible,is_public,need_request_to_join)
    VALUES ('00000000-0000-0000-0000-000000000042','Testgruppe', true, true, false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.event_group WHERE id='00000000-0000-0000-0000-000000000043') THEN
    INSERT INTO public.event_group(id,name,visible,is_public,need_request_to_join)
    VALUES ('00000000-0000-0000-0000-000000000043','Gruppe ohne Permissions', true, true, false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.event_group WHERE id='00000000-0000-0000-0000-000000000044') THEN
    INSERT INTO public.event_group(id,name,visible,is_public,need_request_to_join)
    VALUES ('00000000-0000-0000-0000-000000000044','Admin Gruppe', true, true, false);
  END IF;
END $$;

-- Mitgliedschaft
INSERT INTO public.group_user_mapping("user","group","role")
VALUES (tests.get_supabase_uid('user_1a'),'00000000-0000-0000-0000-000000000042','admin'),
       (tests.get_supabase_uid('user_2a'),'00000000-0000-0000-0000-000000000042','user')
ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group","role")
VALUES (tests.get_supabase_uid('user_group_empty'),'00000000-0000-0000-0000-000000000043','admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group","role")
VALUES (tests.get_supabase_uid('admin'),'00000000-0000-0000-0000-000000000044','admin')
ON CONFLICT DO NOTHING;


INSERT INTO public.permissions(name) VALUES ('items.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions(name) VALUES ('challenge.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions(name) VALUES ('event.edit') ON CONFLICT DO NOTHING;
INSERT INTO public.features(name) VALUES ('items') ON CONFLICT DO NOTHING;


-- Gruppe bekommt die Permission
INSERT INTO public.group_permissions("group","permission")
VALUES ('00000000-0000-0000-0000-000000000042','event.edit')
       ON CONFLICT DO NOTHING;


INSERT INTO public.group_features("group","feature")
VALUES ('00000000-0000-0000-0000-000000000042','items')
       ON CONFLICT DO NOTHING;

-- Gruppe bekommt die Permission
INSERT INTO public.group_permissions("group","permission")
VALUES ('00000000-0000-0000-0000-000000000044','items.manage'),
('00000000-0000-0000-0000-000000000044','challenge.manage'),
('00000000-0000-0000-0000-000000000044','event.edit')
       ON CONFLICT DO NOTHING;
