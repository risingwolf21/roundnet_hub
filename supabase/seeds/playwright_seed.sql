-- Playwright / E2E seed for local development
-- Idempotent: uses ON CONFLICT DO NOTHING

INSERT INTO
	"auth"."users" (
		"instance_id",
		"id",
		"aud",
		"role",
		"email",
		"encrypted_password",
		"email_confirmed_at",
		"invited_at",
		"confirmation_token",
		"confirmation_sent_at",
		"recovery_token",
		"recovery_sent_at",
		"email_change_token_new",
		"email_change",
		"email_change_sent_at",
		"last_sign_in_at",
		"raw_app_meta_data",
		"raw_user_meta_data",
		"is_super_admin",
		"created_at",
		"updated_at",
		"phone",
		"phone_confirmed_at",
		"phone_change",
		"phone_change_token",
		"phone_change_sent_at",
		"email_change_token_current",
		"email_change_confirm_status",
		"banned_until",
		"reauthentication_token",
		"reauthentication_sent_at",
		"is_sso_user",
		"deleted_at",
		"is_anonymous"
	)
VALUES
	(
		'00000000-0000-0000-0000-000000000000',
		'00000000-0000-0000-0000-000000000001',
		'authenticated',
		'authenticated',
		'admin@test.com',
		'$2a$10$3jjJxEdsT.hqralUJpEPp.gbeYmHAl5k.dG4Ou6uM.0FBOvr6qD4K',
		'2025-07-03 09:17:08.541237+00',
		NULL,
		'',
		NULL,
		'',
		NULL,
		'',
		'',
		NULL,
		'2026-02-03 21:28:50.156423+00',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "00000000-0000-0000-0000-000000000001", "name": "Admin User", "role": "user", "email": "admin@test.com", "displayName": "Admin User", "email_verified": true, "phone_verified": false}',
		NULL,
		'2025-07-03 09:17:08.433149+00',
		'2026-03-26 22:56:10.288159+00',
		NULL,
		NULL,
		'',
		'',
		NULL,
		'',
		0,
		NULL,
		'',
		NULL,
		false,
		NULL,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'00000000-0000-0000-0000-000000000002',
		'authenticated',
		'authenticated',
		'user_needs_approval@test.com',
		'$2a$10$4HSoiw4zoXVEnnIXFZ5zWuSNi0A2RyxrZQQyT7BVCsVLLm7ctNfie',
		'2025-10-01 13:14:17.551894+00',
		NULL,
		'',
		'2025-10-01 13:14:01.757927+00',
		'',
		NULL,
		'',
		'',
		NULL,
		'2025-10-01 13:14:30.995226+00',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "00000000-0000-0000-0000-000000000002", "name": "Needs Approval", "role": "user", "email": "user_needs_approval@test.com", "displayName": "Needs Approval", "email_verified": true, "phone_verified": false}',
		NULL,
		'2025-10-01 13:14:01.602564+00',
		'2025-10-01 15:33:45.406889+00',
		NULL,
		NULL,
		'',
		'',
		NULL,
		'',
		0,
		NULL,
		'',
		NULL,
		false,
		NULL,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'00000000-0000-0000-0000-000000000003',
		'authenticated',
		'authenticated',
		'user_no_approval@test.com',
		'$2a$10$jHyeMTF/fBEf49laP7mCnOd9V1czOjb8qfe/bqyt0VfYodb7oR3Nq',
		'2025-07-03 10:42:54.596142+00',
		NULL,
		'',
		NULL,
		'',
		NULL,
		'',
		'',
		NULL,
		'2026-01-28 10:41:32.119409+00',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "00000000-0000-0000-0000-000000000003", "name": "No Approval", "role": "user", "email": "user_no_approval@test.com", "displayName": "No Approval", "email_verified": true, "phone_verified": false}',
		NULL,
		'2025-07-03 10:42:54.574283+00',
		'2026-04-17 09:53:43.611821+00',
		NULL,
		NULL,
		'',
		'',
		NULL,
		'',
		0,
		NULL,
		'',
		NULL,
		false,
		NULL,
		false
	);

-- Test users (fixed UUIDs so tests can reference them)
INSERT INTO public."user" (id, email, "displayName", name, role, created_at, verified)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@test.com', 'Admin User', 'Admin User', 'admin', now(), true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."user" (id, email, "displayName", name, role, created_at, verified)
VALUES
  ('00000000-0000-0000-0000-000000000002'::uuid, 'user_needs_approval@test.com', 'Needs Approval', 'Needs Approval', 'user', now(), true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."user" (id, email, "displayName", name, role, created_at, verified)
VALUES
  ('00000000-0000-0000-0000-000000000003'::uuid, 'user_no_approval@test.com', 'No Approval', 'No Approval', 'user', now(), true)
ON CONFLICT (id) DO NOTHING;

-- Groups used by tests
INSERT INTO public.event_group (id, name, visible, is_public, need_request_to_join)
VALUES
  ('00000000-0000-0000-0000-000000000004'::uuid, 'Group No Approval', true, true, false),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'Group Approval', true, true, true),
  ('00000000-0000-0000-0000-000000000006'::uuid, 'Admin Group', true, true, false)
ON CONFLICT (id) DO NOTHING;

-- Ensure permissions/features tables have minimal entries (idempotent)
INSERT INTO public.permissions (name) VALUES ('items.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name) VALUES ('challenge.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.permissions (name) VALUES ('event.edit') ON CONFLICT DO NOTHING;
INSERT INTO public.features (name) VALUES ('items') ON CONFLICT DO NOTHING;

-- Group permissions and features
INSERT INTO public.group_permissions ("group", "permission")
VALUES
  ('00000000-0000-0000-0000-000000000004'::uuid, 'event.edit'),
  ('00000000-0000-0000-0000-000000000006'::uuid, 'items.manage'),
  ('00000000-0000-0000-0000-000000000006'::uuid, 'challenge.manage'),
  ('00000000-0000-0000-0000-000000000006'::uuid, 'event.edit')
ON CONFLICT DO NOTHING;

INSERT INTO public.group_features ("group", "feature")
VALUES
  ('00000000-0000-0000-0000-000000000004'::uuid, 'items')
ON CONFLICT DO NOTHING;

-- Make admin user an admin of Admin Group and No Approval group
INSERT INTO public.group_user_mapping ("user", "group", role)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000006'::uuid, 'admin'),
  ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000004'::uuid, 'admin')
ON CONFLICT DO NOTHING;

-- Clean up any stray joinRequested mappings for our test users (safe to run idempotently)
DELETE FROM public.group_user_mapping
WHERE role = 'joinRequested' AND ("user" = '00000000-0000-0000-0000-000000000002'::uuid OR "user" = '00000000-0000-0000-0000-000000000003'::uuid);

-- End of seed
