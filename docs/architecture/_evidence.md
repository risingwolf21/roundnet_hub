# Evidence for the architecture diagrams

Every node, participant and table in the diagrams below points to a file and line range at commit
`eeb7254ae658af8c774487bc44e7c90ad12511cc` (branch `production`). Archify verified each range against
the committed bytes (`finalize --repo-root .`). Things with no code backing are not drawn; see the PR under
"Bewusst ausgelassen".

## Runtime architecture

Source: `runtime.architecture.json`

| Component | Type | Evidence |
| --- | --- | --- |
| Members | external | `src/index.tsx:1-70` (browser entry) |
| Firebase Hosting | cloud | `firebase.json:1-50` (hosting targets)<br>`.github/workflows/production.yml:201-207` (deploy job) |
| React SPA | frontend | `vite.config.js:52-70` (Sentry + PWA plugins)<br>`src/lib/supabase.tsx:1-18` (supabase-js client)<br>`src/service-worker.ts:122-140` (push handler) |
| Map & geocoding | external | `src/components/ui/map.tsx:263-265` (Carto tiles)<br>`src/features/events/dialogs/SearchPlacesDialog.tsx:64` (Nominatim reverse)<br>`src/components/ui/place-autocomplete.tsx:126` (Photon search) |
| Sentry | external | `src/instrument.tsx:19-56` (Sentry.init) |
| Supabase Auth | security | `src/features/auth/LoginForm.tsx:29-46` (signInWithPassword)<br>`src/features/auth/AuthGate.tsx:24-38` (session restore) |
| PostgREST | backend | `src/repository/EventRepository.ts:160-172` (rpc update_attendance)<br>`src/repository/DrinkRepository.ts:8-12` (rpc add_drinks_history) |
| Supabase Storage | database | `src/repository/UserRepository.ts:42-56` (storage.from('user')) |
| Postgres | database | `supabase/migrations/000_initial.sql:1286-1303` (events table)<br>`supabase/migrations/20261002072326_security_hardening.sql:579-581` (RLS policy)<br>`supabase/migrations/20251123154825_change_column_type_of_user_and_player.sql:2466-2478` (authorize()) |
| pg_cron + pg_net | backend | `supabase/migrations/20250913134721_web_push_notification_system.sql:2122-2126` (push_worker_quick)<br>`supabase/migrations/20260128184754_event_transformations.sql:128-132` (event_transformations)<br>`supabase/migrations/20251030140434_fix_player_update.sql:12-55` (invoke_edge_function) |
| Edge Functions | backend | `supabase/functions/push-worker/index.ts:382-413` (push-worker run)<br>`supabase/functions/ical/index.ts:74-90` (ical feed)<br>`supabase/functions/fetch-bundesliga/index.ts:38-107` (fetch-bundesliga) |
| Calendar apps | external | `src/features/profile/tabs/CalendarTab.tsx:25` (webcal URL) |
| Web Push services | external | `supabase/functions/push-worker/index.ts:56` (VAPID setup)<br>`supabase/functions/push-worker/index.ts:298-300` (sendNotification)<br>`src/features/profile/tabs/NotificationsTab.tsx:142` (pushManager.subscribe) |
| Playerzone | external | `supabase/functions/fetch-player-info/index.ts:63` (fetch profile)<br>`supabase/functions/fetch-bundesliga/index.ts:38-68` (scrape league) |

### Connections and their call sites

| Connection | Evidence |
| --- | --- |
| Members → Firebase Hosting → React SPA | `firebase.json:1-50` (SPA rewrite to index.html), `.github/workflows/production.yml:201-207` (deploy) |
| SPA → Supabase Auth | `src/features/auth/LoginForm.tsx:29-46`, `src/lib/supabase.tsx:7-12` |
| Supabase Auth → Postgres (auth.users) | `supabase/migrations/20251107130454_notify_custom_schema.sql:2213` (trigger on auth.users creates the profile row) |
| SPA → PostgREST → Postgres (RLS) | `src/lib/supabase.tsx:1-18`, `src/repository/*.ts`, `supabase/migrations/20261002072326_security_hardening.sql:579-581` |
| SPA → Storage | `src/repository/UserRepository.ts:42-56` |
| SPA → Edge Functions | `src/features/bundesliga/repository.ts:55-56`, `src/features/admin/dialogs/EditUserDialog.tsx:31-32`, `src/features/supabase/lib/management-api.tsx:20` |
| SPA → Map & geocoding | `src/components/ui/map.tsx:263-265`, `src/features/events/dialogs/SearchPlacesDialog.tsx:64`, `src/components/ui/place-autocomplete.tsx:126` |
| SPA → Sentry | `src/instrument.tsx:18-21` |
| pg_cron → Postgres / Edge Functions | cron jobs: `supabase/migrations/20250913134721_web_push_notification_system.sql:2122-2126`, `supabase/migrations/20260128184754_event_transformations.sql:128-132`, `supabase/migrations/20261025160000_recurrence_cron_sql.sql:131-135`, `supabase/migrations/20260602120000_trial_started_at.sql:194-198`, `supabase/migrations/20261030140000_bundesliga_cache.sql:90-94`; pg_net call: `supabase/migrations/20251030140434_fix_player_update.sql:12-55`; trigger on players.rg_link: `supabase/migrations/20260115152247_general_fixes.sql:7-23` |
| Edge Functions → Postgres (service role) | `supabase/functions/push-worker/index.ts:103-175`, `supabase/functions/fetch-player-info/index.ts:89-90`, `supabase/functions/ical/index.ts:88` |
| Calendar apps → Edge Functions (ical) | `src/features/profile/tabs/CalendarTab.tsx:25`, `supabase/functions/ical/index.ts:74` |
| Edge Functions → Web Push | `supabase/functions/push-worker/index.ts:56`, `supabase/functions/push-worker/index.ts:298-301` |
| Edge Functions → Playerzone | `supabase/functions/fetch-player-info/index.ts:63`, `supabase/functions/fetch-bundesliga/index.ts:38-68` |
| Realtime (card only) | `src/features/auth/tanstack/useUserGrantsQuery.tsx:36-63` |

## Core data model

Source: `data-model.erd.json`

| Table | Type | Evidence |
| --- | --- | --- |
| event_group | groups | `supabase/migrations/000_initial.sql:532-542` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:1919-1969` (current columns) |
| group_user_mapping | groups | `supabase/migrations/000_initial.sql:1423-1427` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:2366-2408` (current columns) |
| user | groups | `supabase/migrations/000_initial.sql:1256-1266` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:2665-2703` (current columns) |
| event_series | events | `supabase/migrations/20261025140000_event_series.sql:18-50` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:1970-2065` (current columns) |
| events | events | `supabase/migrations/000_initial.sql:1286-1303` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:2174-2276` (current columns) |
| event_attendance_user_mapping | events | `supabase/migrations/000_initial.sql:1006-1011` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:1618-1674` (current columns) |
| event_bring_items | events | `supabase/migrations/20250826081744_pledge_event_items.sql:1-11` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:1675-1746` (current columns) |
| event_bring_pledges | events | `supabase/migrations/20250826081744_pledge_event_items.sql:16-26` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:1747-1839` (current columns) |
| event_comments | events | `supabase/migrations/000_initial.sql:1407-1417` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:1840-1918` (current columns) |
| drink | drinks | `supabase/migrations/000_initial.sql:1337-1347` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:1585-1617` (current columns) |
| history | drinks | `supabase/migrations/000_initial.sql:1509-1518` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:2409-2477` (current columns) |
| payments | drinks | `supabase/migrations/000_initial.sql:1610-1616` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:2582-2616` (current columns) |
| vouchers | drinks | `supabase/migrations/000_initial.sql:1733-1739` (CREATE TABLE)<br>`src/types/supabase-generated.types.ts:2739-2771` (current columns) |

Columns, types and keys were read from the local Supabase database after applying all 103 migrations
at the pinned commit (`information_schema.columns` and `pg_constraint`). The `CREATE TABLE` line shows where
each table starts; later migrations add columns. The generated types (`src/types/supabase-generated.types.ts`)
show the current column set.

## Login and session check

Source: `auth-login.sequence.json`

| Participant | Type | Evidence |
| --- | --- | --- |
| Member | external | `src/features/auth/LoginForm.tsx:25-28` (form submit) |
| React SPA | frontend | `src/features/auth/LoginForm.tsx:29-46` (signInWithPassword)<br>`src/features/auth/AuthGate.tsx:14-38` (session listener)<br>`src/AppRoutes.tsx:20-33` (PrivateRoute) |
| Supabase Auth | security | `src/lib/supabase.tsx:7-12` (persist + refresh)<br>`supabase/migrations/20251107130454_notify_custom_schema.sql:2213` (on_auth_user_created) |
| PostgREST | backend | `src/tanstack/auth.ts:15-38` (useCurrentUser)<br>`src/repository/GrantsRepository.ts:96` (user_grants_view) |
| Postgres | database | `supabase/migrations/20261002072326_security_hardening.sql:579-581` (RLS example)<br>`supabase/migrations/20251123154825_change_column_type_of_user_and_player.sql:2466-2477` (authorize()) |

## Training RSVP and waitlist push

Source: `event-attendance.sequence.json`

| Participant | Type | Evidence |
| --- | --- | --- |
| Member | external | `src/features/events/EventList.tsx:138-144` (Zusagen / Absagen) |
| React SPA | frontend | `src/tanstack/events.ts:397-458` (useUpdateAttendanceMutation)<br>`src/repository/EventRepository.ts:160-172` (rpc update_attendance) |
| PostgREST | backend | `src/repository/EventRepository.ts:165-171` (supabase.rpc) |
| Postgres | database | `supabase/migrations/20261101120000_attendance_waitlist_fixes.sql:30-140` (update_attendance)<br>`supabase/migrations/20261101120000_attendance_waitlist_fixes.sql:143-221` (auto promote trigger)<br>`supabase/migrations/20260521100000_branch_changes.sql:260-289` (enqueue_notification) |
| pg_cron | backend | `supabase/migrations/20250913134721_web_push_notification_system.sql:2122-2126` (push_worker_quick)<br>`supabase/migrations/20251205065159_event_transformations_and_db_linting.sql:706-731` (run_push_worker_if_needed) |
| push-worker | backend | `supabase/functions/push-worker/index.ts:103-175` (claim outbox)<br>`supabase/functions/push-worker/index.ts:245-300` (processJob)<br>`supabase/functions/push-worker/index.ts:382-413` (handleRun) |
| Web Push | external | `src/service-worker.ts:122-140` (push event) |

## Drink booking and payment

Source: `drinks-booking.sequence.json`

| Participant | Type | Evidence |
| --- | --- | --- |
| Member | external | `src/features/drinks/DrinkListScreen.tsx:49-75` (book drinks) |
| React SPA | frontend | `src/tanstack/drinks.ts:53-75` (useInsertHistoryEntryMutation)<br>`src/features/drinks/PayDrinksScreen.tsx:43` (amount to pay)<br>`src/tanstack/admin.ts:78-79` (confirm payment) |
| PostgREST | backend | `src/repository/DrinkRepository.ts:8-12` (rpc add_drinks_history)<br>`src/repository/AdminUsersRepository.ts:96-104` (payments update) |
| Postgres | database | `supabase/migrations/20260930075703_fix_functions.sql:191-271` (add_drinks_history)<br>`supabase/migrations/20261002072326_security_hardening.sql:434-478` (enforce amount)<br>`supabase/migrations/20260204140246_challenge_extension.sql:395-417` (payment push trigger) |
| PayPal.me | external | `src/features/drinks/PayDrinksScreen.tsx:165` (paypal.me link) |
| Drinks admin | external | `src/features/admin/PaymentsPendingAdmin.tsx:19-62` (confirm button) |
