SET
  session_replication_role = replica;

--
-- PostgreSQL database dump
--
-- \restrict Ad3zzIEGCbuagepBz5cfIILtkT2lMAglTfvWm6dGPdhqkiGXpeocFhBlMgw8l1U
-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6
SET
  statement_timeout = 0;

SET
  lock_timeout = 0;

SET
  idle_in_transaction_session_timeout = 0;

SET
  transaction_timeout = 0;

SET
  client_encoding = 'UTF8';

SET
  standard_conforming_strings = on;

SELECT
  pg_catalog.set_config ('search_path', '', false);

SET
  check_function_bodies = false;

SET
  xmloption = content;

SET
  client_min_messages = warning;

SET
  row_security = off;

--
-- Data for Name: log; Type: TABLE DATA; Schema: audit; Owner: postgres
--
--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."audit_log_entries" (
    "instance_id",
    "id",
    "payload",
    "created_at",
    "ip_address"
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '06fa06e9-0723-4e96-8ac7-748cee0adf52',
    '{"action":"user_signedup","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@test.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}',
    '2026-11-09 10:27:13.743075+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a7ad1d27-1923-4b1c-a090-e36c1f0c3051',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-09 10:27:13.749739+00',
    ''
  );

--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
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
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'authenticated',
    'authenticated',
    'admin@test.com',
    '$2a$10$4KZAeERQvX0xEz2YcGVrye8KfNn4QkZQpqff5IZ.zOyW/HoGnWXUe',
    '2026-11-09 10:27:13.743722+00',
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2026-11-09 10:27:13.750436+00',
    '{"provider": "email", "providers": ["email"]}',
    '{"sub": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@test.com", "language": "en", "displayName": "Karl", "email_verified": true, "phone_verified": false}',
    NULL,
    '2026-11-09 10:27:13.732174+00',
    '2026-11-09 10:27:13.755452+00',
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

--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."identities" (
    "provider_id",
    "user_id",
    "identity_data",
    "provider",
    "last_sign_in_at",
    "created_at",
    "updated_at",
    "id"
  )
VALUES
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '{"sub": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@test.com", "language": "en", "displayName": "Karl", "email_verified": false, "phone_verified": false}',
    'email',
    '2026-11-09 10:27:13.741373+00',
    '2026-11-09 10:27:13.741405+00',
    '2026-11-09 10:27:13.741405+00',
    '5d75768f-fb3e-4026-9b27-f44634f405f1'
  );

--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."sessions" (
    "id",
    "user_id",
    "created_at",
    "updated_at",
    "factor_id",
    "aal",
    "not_after",
    "refreshed_at",
    "user_agent",
    "ip",
    "tag",
    "oauth_client_id",
    "refresh_token_hmac_key",
    "refresh_token_counter",
    "scopes"
  )
VALUES
  (
    '50c65db8-afaf-45ac-a001-618d2bf6cca3',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '2026-11-09 10:27:13.750508+00',
    '2026-11-09 10:27:13.750508+00',
    NULL,
    'aal1',
    NULL,
    NULL,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    '192.168.65.1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );

--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."mfa_amr_claims" (
    "session_id",
    "created_at",
    "updated_at",
    "authentication_method",
    "id"
  )
VALUES
  (
    '50c65db8-afaf-45ac-a001-618d2bf6cca3',
    '2026-11-09 10:27:13.755853+00',
    '2026-11-09 10:27:13.755853+00',
    'password',
    'e1750f6d-b840-477f-a69e-64ea10b3072f'
  );

--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."refresh_tokens" (
    "instance_id",
    "id",
    "token",
    "user_id",
    "revoked",
    "created_at",
    "updated_at",
    "parent",
    "session_id"
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    1,
    'zipul7vqmiy7',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    false,
    '2026-11-09 10:27:13.754486+00',
    '2026-11-09 10:27:13.754486+00',
    NULL,
    '50c65db8-afaf-45ac-a001-618d2bf6cca3'
  );

--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."user" (
    "created_at",
    "displayName",
    "email",
    "verified",
    "role",
    "disabled",
    "avatarUrl",
    "name",
    "id",
    "last_seen_at",
    "language"
  )
VALUES
  (
    '2026-11-09 10:27:13.731916+00',
    'Karl',
    'admin@test.com',
    false,
    'user',
    false,
    NULL,
    'Karl Admin',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '2026-11-09 10:27:13.750508+00',
    'en'
  );

--
-- Data for Name: players; Type: TABLE DATA; Schema: games; Owner: postgres
--
INSERT INTO
  "games"."players" (
    "player",
    "created_at",
    "ka_index",
    "rg_id",
    "rg_link",
    "rg_index",
    "rg_avatar_url",
    "pro_status",
    "gender",
    "effective_rating_cached",
    "hide_rating",
    "display_name",
    "linked_user_id",
    "matches_played"
  )
VALUES
  (
    'c3958a07-6c24-4bd4-bed5-9c067005546d',
    '2026-11-09 10:27:13.731916+00',
    1000,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    'm',
    1000,
    false,
    NULL,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    0
  );

--
-- Data for Name: event_group; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."event_group" (
    "created_at",
    "description",
    "name",
    "color",
    "id",
    "is_public",
    "need_request_to_join",
    "parent_group",
    "visible"
  )
VALUES
  (
    '2026-11-09 10:27:37.93626+00',
    'Main Group',
    'Main Group',
    '#000000',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    true,
    false,
    NULL,
    true
  );

--
-- Data for Name: event_series; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."event_series" (
    "id",
    "key",
    "group",
    "title",
    "description",
    "place",
    "timezone",
    "rrule",
    "recurrence",
    "until",
    "dtstart",
    "duration",
    "meeting_offset",
    "answer_offset",
    "max_attendees",
    "max_trial_attendees",
    "required_item",
    "items_enabled",
    "constellations_enabled",
    "reminder_before",
    "items_template",
    "active",
    "created_at",
    "created_by",
    "answer_start_offset"
  )
VALUES
  (
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'Thursday Training',
    'Thursday Training',
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Europe/Berlin',
    'FREQ=WEEKLY;INTERVAL=1;BYDAY=SU',
    'Weekly',
    NULL,
    '2026-11-15 10:32:00+00',
    '02:00:00',
    '00:00:00',
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    false,
    NULL,
    '[]',
    true,
    '2026-11-09 10:32:59.974927+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '-145:00:00'
  );

--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."events" (
    "created_at",
    "description",
    "meetingDateTime",
    "startingDateTime",
    "title",
    "endDateTime",
    "key",
    "isCancelled",
    "place",
    "recurrence",
    "answerDeadline",
    "maxAttendees",
    "recurrenceEnd",
    "required_item",
    "id",
    "group",
    "constellations_enabled",
    "items_enabled",
    "max_trial_attendees",
    "reminder_before",
    "reminder_sent_at",
    "series_id",
    "occurrence_date",
    "detached",
    "answerStart"
  )
VALUES
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-11-15 10:32:00+00',
    '2026-11-15 10:32:00+00',
    'Thursday Training',
    '2026-11-15 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '3c3ae9fe-72b4-456f-88da-629d9517f729',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-11-15',
    false,
    '2026-11-09 09:32:00+00'
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-11-22 10:32:00+00',
    '2026-11-22 10:32:00+00',
    'Thursday Training',
    '2026-11-22 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '243c6f00-5bc2-4305-a888-41796f19e397',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-11-22',
    false,
    '2026-11-16 09:32:00+00'
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-11-29 10:32:00+00',
    '2026-11-29 10:32:00+00',
    'Thursday Training',
    '2026-11-29 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '4dcdd532-7453-49b2-be2b-3df94c998465',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-11-29',
    false,
    '2026-11-23 09:32:00+00'
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-06 10:32:00+00',
    '2026-12-06 10:32:00+00',
    'Thursday Training',
    '2026-12-06 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    'a00ce0db-9d38-4ab8-b54b-43b1a3a4c921',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-06',
    false,
    '2026-11-30 09:32:00+00'
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-13 10:32:00+00',
    '2026-12-13 10:32:00+00',
    'Thursday Training',
    '2026-12-13 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '6f2a9fe0-314b-4fc4-88cf-a2fa75e9db48',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-13',
    false,
    '2026-12-07 09:32:00+00'
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-20 10:32:00+00',
    '2026-12-20 10:32:00+00',
    'Thursday Training',
    '2026-12-20 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '3477d53f-f128-47d2-a115-7413520ed235',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-20',
    false,
    '2026-12-14 09:32:00+00'
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-27 10:32:00+00',
    '2026-12-27 10:32:00+00',
    'Thursday Training',
    '2026-12-27 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '7d2a1fa1-1027-424b-bdaa-5996d1072624',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-27',
    false,
    '2026-12-21 09:32:00+00'
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2027-01-03 10:32:00+00',
    '2027-01-03 10:32:00+00',
    'Thursday Training',
    '2027-01-03 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '9655acd1-5801-479a-aff5-472e29eb901c',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2027-01-03',
    false,
    '2026-12-28 09:32:00+00'
  );

--
-- Data for Name: match; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: elo_calc_log; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: elo_config; Type: TABLE DATA; Schema: games; Owner: postgres
--
INSERT INTO
  "games"."elo_config" (
    "id",
    "w_rg",
    "w_ka",
    "rg_offset",
    "rg_scale",
    "k_factor",
    "men_offset",
    "mixed_offset",
    "women_offset",
    "upset_bonus_per_level"
  )
VALUES
  (1, 0.5, 0.5, 0, 1, 32, 0, 0, 0, 0);

--
-- Data for Name: elo_history; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: sets; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: notification_outbox; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: web_push_subscriptions; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: notification_outbox_targets; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: notification_retention; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: notification_topics; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
INSERT INTO
  "notifications"."notification_topics" (
    "topic",
    "description",
    "scope_type",
    "default_enabled"
  )
VALUES
  (
    'event.waitinglist.promoted',
    'Warteliste: Platz freigeworden',
    'event',
    true
  ),
  (
    'event.answer_deadline.reminder',
    'Erinnerung: Anmeldeschluss naht',
    'event',
    true
  ),
  (
    'group.trial.expired',
    'Probezeit beendet',
    'group',
    true
  ),
  (
    'group.trial.expired.admin',
    'Probezeit eines Nutzers beendet',
    'group',
    true
  ) on conflict (topic) do nothing;

--
-- Data for Name: notifications; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: user_notification_preferences; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: app_config; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."app_config" ("key", "value", "updated_at")
VALUES
  (
    'trial_duration_days',
    '28',
    '2026-11-09 10:26:17.11802+00'
  ) on conflict (key) do nothing;

--
-- Data for Name: bundesliga_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: challenge; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."challenge" (
    "created_at",
    "name",
    "description",
    "max_points_per_week",
    "automated",
    "end_date",
    "group",
    "id",
    "max_points_per_day",
    "category_enabled",
    "comments_enabled",
    "show_all_members",
    "category_options",
    "start_date"
  )
VALUES
  (
    '2026-11-09 10:34:04.768555+00',
    'Serve Challenge',
    'Serve Challenge',
    4,
    false,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'a5c15955-c014-4eb1-a008-69d6f09be7c5',
    1,
    true,
    true,
    false,
    '{"First Category",asdfhasidfbuiasdfb}',
    NULL
  );

--
-- Data for Name: challenge_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."challenge_stats" (
    "id",
    "created_at",
    "user",
    "count",
    "image_url",
    "challenge"
  )
VALUES
  (
    1,
    '2026-11-08 23:00:00+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    1,
    '',
    'a5c15955-c014-4eb1-a008-69d6f09be7c5'
  ),
  (
    2,
    '2026-11-07 23:00:00+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    1,
    '',
    'a5c15955-c014-4eb1-a008-69d6f09be7c5'
  );

--
-- Data for Name: challenge_stats_meta; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."challenge_stats_meta" ("challenge_stat", "category", "comment")
VALUES
  (1, NULL, 'kjasdfag sdfjhags df'),
  (2, 'First Category', 'asfdasdf');

--
-- Data for Name: drink; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."drink" (
    "name",
    "price",
    "stock",
    "imageUrl",
    "active",
    "deleted",
    "type",
    "id"
  )
VALUES
  (
    'Coca Cola',
    1,
    0,
    '',
    true,
    false,
    'Drink',
    '9c29b4d7-081e-4ea7-a749-63f3b9166757'
  );

--
-- Data for Name: event_attendance_user_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_bring_items; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_bring_pledges; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_transformations; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_transformation_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: features; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."features" ("name", "description")
VALUES
  ('bundesliga', NULL),
  ('challenges', 'Challenges verwalten'),
  ('costs', NULL),
  ('drinks', 'Getränke verwalten'),
  ('events', 'Events verwalten'),
  ('events.transformations', NULL),
  ('events.trials', 'Probenutzer für Events'),
  ('games', 'Spiele verwalten'),
  ('items', 'Gegenstände verwalten') on conflict (name) do nothing;

--
-- Data for Name: group_features; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."permissions" ("name", "description")
VALUES
  ('admin.analytics.view', 'Admin analysen'),
  (
    'admin.notify_users',
    'Benachrichtigungen an verschiedene Gruppen oder Nutzern schicken können'
  ),
  (
    'bundesliga.admin',
    'Erlaubt das harte Neuladen (Re-Scraping) der Bundesliga-Daten.'
  ),
  (
    'challenge.create',
    'Hiermit darf man Challenges erstellen'
  ),
  ('challenge.manage', 'Verwaltung von Challenges'),
  (
    'challenges.create.own-group',
    'Challenge erstellen wenn man Admin in der Zielgruppe ist'
  ),
  (
    'challenges.edit.own-group',
    'Challenge bearbeiten wenn man Admin in der Challenge-Gruppe ist'
  ),
  (
    'challenges.stats.read',
    'Challenge-Punkte anderer Nutzer einsehen'
  ),
  (
    'challenges.stats.write',
    'Selbst Punkte in einer Challenge eintragen'
  ),
  (
    'drinks.confirm.payments',
    'Zahlungen bestätigen und als bezahlt markieren'
  ),
  ('drinks.edit', 'Getränke bearbeiten und löschen'),
  (
    'drinks.history.admin',
    'Die komplette Historie einsehen'
  ),
  (
    'drinks.history.select',
    'Eigene History einsehen'
  ),
  ('drinks.manage', 'Getränke erstellen'),
  (
    'drinks.purchase',
    'Getränke einem aktiven Payment hinzufügen ("kaufen")'
  ),
  ('drinks.select', 'Getränke auswählen'),
  ('drinks.view.own-history', 'Eigene History sehen'),
  (
    'drinks.view.own-payments',
    'Eigene aktive Zahlung'
  ),
  (
    'event.admin.view',
    'Admin Informationen bei einem Event sehen'
  ),
  ('event.cancel', 'Event absagen'),
  ('event.comment', 'Kommentare schreiben'),
  (
    'event.create.constellations',
    'Konstellationen/Teams erstellen'
  ),
  ('event.delete', 'Ein Event löschen'),
  (
    'event.edit',
    'Event bearbeiten (z. B. Titel/Zeit ändern – nur Admins)'
  ),
  (
    'event.manage.attendees',
    'Teilnahme-Anfragen sehen & bestätigen (z. B. für Trainer)'
  ),
  ('event.signup', 'An- und Abmeldung zu Events'),
  (
    'event.signup.trainer',
    'Sich als Trainer zu einem Event anmelden können'
  ),
  ('event.transform', NULL),
  (
    'games.admin.merge_accounts',
    'Erlaubt das Mergen von Player und User Accounts'
  ),
  (
    'games.admin.view',
    'Zeigt alle Werte aus dem Spiel wie ID und ELO Log'
  ),
  ('games.create', 'Neues Spiel erstellen'),
  (
    'games.create.guest-player',
    'Es können Gastspieler beim Eintragen eines Spieles erstellt werden.'
  ),
  (
    'games.create.guest-player.with_index',
    'Beim Erstellen eines Gastspielers kann der Index direkt gesetzt werden'
  ),
  (
    'games.delete.own',
    'Erlaubt es eigene Spiele zu löschen'
  ),
  ('games.select', 'Darf Spiele generell ansehen'),
  (
    'games.update.score',
    'Score eines Spiels eintragen oder bearbeiten'
  ),
  ('games.view.own', 'Eigene Spiele sehen'),
  ('grants.manage', NULL),
  (
    'groups.manage.admin',
    'Gruppen erstellen mit Admin Funktionalität'
  ),
  (
    'items.manage',
    'Items erstellen oder bearbeiten (z. B. durch Schlüsselverantwortliche)'
  ),
  (
    'items.update.holder',
    'Aktuellen Halter eines Items ändern (z. B. Schlüsselübergabe)'
  ),
  (
    'reset_user_password',
    'Passwörter von Nutzern zurücksetzen. Benötigt ebenfalls user.role="admin"'
  ),
  ('supabase.admin', 'Admin für Supabase Verwaltung'),
  (
    'testlab.shadcn',
    'Nutze die neue Shadcn Oberfläche'
  ),
  ('users.manage', 'Benutzer verwalten') on conflict (name) do nothing;

--
-- Data for Name: group_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: group_user_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."group_user_mapping" ("user", "group", "role", "trial_started_at")
VALUES
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'admin',
    NULL
  );

--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."payments" (
    "id",
    "created_at",
    "amountToPay",
    "paymentState",
    "id_uuid",
    "user"
  )
VALUES
  (
    1,
    '2026-11-09 10:36:04.208931+00',
    0,
    'Open',
    'de24e42a-ba24-4bac-bec6-ecacbc0bfb35',
    '479397f0-bb2a-40b9-88a3-f4f485042005'
  );

--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: history; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."history" (
    "id",
    "created_at",
    "user",
    "count",
    "payment",
    "amount",
    "voucher",
    "drink"
  )
VALUES
  (
    1,
    '2026-11-09 10:36:04.208931+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    1,
    1,
    1,
    NULL,
    '9c29b4d7-081e-4ea7-a749-63f3b9166757'
  );

--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."items" (
    "id",
    "created_at",
    "name",
    "color",
    "type",
    "lastUpdate",
    "current_holder",
    "group",
    "id_uuid"
  )
VALUES
  (
    1,
    '2026-11-09 10:33:17.3126+00',
    'Test Schlüssel',
    '#841f1f',
    'mtvStorage',
    '2026-11-09 10:33:19.544704+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL,
    'c1a7014e-1ced-48a0-bf30-9d3150a52511'
  ),
  (
    2,
    '2026-11-09 10:33:33.373413+00',
    'Test2 Schlüssel',
    '#145df0',
    'mtvGymPalazzo',
    '2026-11-09 10:33:38.451396+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'ff7de2ba-acd4-469d-93c6-94e994d1aecf'
  );

--
-- Data for Name: item_history; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."item_history" (
    "id",
    "created_at",
    "key",
    "current_user",
    "past_user"
  )
VALUES
  (
    1,
    '2026-11-09 10:33:19.544704+00',
    1,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  ),
  (
    2,
    '2026-11-09 10:33:19.544704+00',
    1,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  ),
  (
    3,
    '2026-11-09 10:33:38.451396+00',
    2,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  ),
  (
    4,
    '2026-11-09 10:33:38.451396+00',
    2,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  );

--
-- Data for Name: tournament_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: user_direct_grants; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."user_direct_grants" (
    "user",
    "tenant",
    "kind",
    "key",
    "created_at",
    "updated_at"
  )
VALUES
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'grants.manage',
    '2026-11-09 10:28:52.283292+00',
    '2026-11-09 10:28:52.283292+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'supabase.admin',
    '2026-11-09 10:29:00.878681+00',
    '2026-11-09 10:29:00.878681+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.admin.view',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.cancel',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.comment',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.create.constellations',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.delete',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.edit',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.manage.attendees',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.signup',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.signup.trainer',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.transform',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.confirm.payments',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.edit',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.history.admin',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.history.select',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.purchase',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.select',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.view.own-history',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.view.own-payments',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.admin.merge_accounts',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.admin.view',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.create',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.create.guest-player',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.create.guest-player.with_index',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.delete.own',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.select',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.update.score',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.view.own',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenge.create',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenge.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.create.own-group',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.edit.own-group',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.stats.read',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.stats.write',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'groups.manage.admin',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'items.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'items.update.holder',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'admin.analytics.view',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'admin.notify_users',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'bundesliga.admin',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'reset_user_password',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'testlab.shadcn',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'users.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'bundesliga',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'challenges',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'costs',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'drinks',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'events',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'events.transformations',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'events.trials',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'games',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'items',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  );

--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--
--
-- Data for Name: background_errors; Type: TABLE DATA; Schema: util; Owner: postgres
--
--
-- Name: log_id_seq; Type: SEQUENCE SET; Schema: audit; Owner: postgres
--
SELECT
  pg_catalog.setval ('"audit"."log_id_seq"', 102, true);

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--
SELECT
  pg_catalog.setval ('"auth"."refresh_tokens_id_seq"', 1, true);

--
-- Name: notification_outbox_id_seq; Type: SEQUENCE SET; Schema: notifications; Owner: postgres
--
SELECT
  pg_catalog.setval (
    '"notifications"."notification_outbox_id_seq"',
    1,
    false
  );

--
-- Name: challenge_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."challenge_stats_id_seq"', 2, true);

--
-- Name: history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."history_id_seq"', 1, true);

--
-- Name: key_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."key_history_id_seq"', 4, true);

--
-- Name: keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."keys_id_seq"', 2, true);

--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."payments_id_seq"', 1, true);

--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--
SELECT
  pg_catalog.setval ('"supabase_functions"."hooks_id_seq"', 1, false);

--
-- PostgreSQL database dump complete
--
-- \unrestrict Ad3zzIEGCbuagepBz5cfIILtkT2lMAglTfvWm6dGPdhqkiGXpeocFhBlMgw8l1U
RESET ALL;