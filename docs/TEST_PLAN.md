# Test Plan — roundnet_karlsruhe_app

This plan lists every part of the app (Supabase backend and React frontend) that needs tests, which test layer covers it, and where those tests live.
The status column shows where the plan has gaps.

| Status | Meaning |
| --- | --- |
| ✅ | Covered by existing tests |
| 🆕 | Covered by tests added with the security hardening (`20261002072326_security_hardening.sql`) |
| ⬜ | Gap. Write these tests next, in priority order (P1 → P3) |
| 🐞 | A test documents a known bug (pgTAP `todo_start`/`todo_end`, so the suite still passes) |

---

## 1. Test layers

| Layer | Tooling | Location | Runs against | Command |
| --- | --- | --- | --- | --- |
| Database (RLS, functions, triggers, grants) | pgTAP + basejump test helpers | `supabase/tests/*.sql` (security: `085` regressions and guards, `086` helpers/RPCs/grants, `087` triggers and players, `088` event policy matrix, `089` group/items/drinks/challenges policy matrix) | local DB, each file inside `BEGIN … ROLLBACK` | `yarn test:db` (`supabase test db`) |
| Edge functions, unit | Deno test | `supabase/functions/tests/*Routes.test.ts` | pure code | `yarn test:functions` |
| Edge functions, integration | Deno test + supabase-js | `supabase/functions/tests/edgeFunctionAuthz.test.ts` | local stack incl. edge runtime | `yarn test:functions` (skipped when the stack isn't running) |
| Frontend unit / component | Vitest + Testing Library + jsdom | `src/tests/**/*.test.ts(x)` | mocked `@/lib/supabase` (see `src/tests/helpers/`) | `yarn test` / `npx vitest run <file>` |
| Frontend integration | Vitest (node env) + supabase-js | `src/tests/groupCreation.test.tsx`, `src/tests/profileCreation.test.tsx` | local stack only. Skipped unless `VITE_SUPABASE_URL` points to localhost | `yarn test` |
| End-to-end | Playwright | `e2e/playwright/*.spec.ts` | `yarn start` + local stack | `yarn test:e2e` |

Prerequisites: `supabase start`; `supabase db reset` loads all migrations plus `seed.sql`; `environments/.env.local` points to the local stack.

Run the layers in this order. Each later layer depends on the earlier ones passing:

```bash
supabase db reset && yarn test:db
yarn test:functions
npx vitest run
yarn test:e2e
```

### Conventions
- **Personas.** Every access rule is tested against the matrix below. Group, permission and direct-grant fixtures are created as `service_role`. Users act through `tests.authenticate_as()` (pgTAP) or a signed-in client (integration).

  | Persona | Definition |
  | --- | --- |
  | `anon` | not signed in |
  | `outsider` | authenticated, not in the group |
  | `requested` | `joinRequested` |
  | `trial` | trial member |
  | `member` | `user` role |
  | `group admin` | `admin` role in the group |
  | `platform admin` | `supabase.admin` |
  | `perm holder` | holds one specific permission, e.g. `drinks.confirm.payments` |

- **Assertions.**
  - Blocked writes must fail with SQLSTATE `42501`, an RLS violation, or `forbidden`.
  - A blocked `UPDATE` or `DELETE` must affect 0 rows.
  - A blocked `SELECT` must return 0 rows.
- **Guard tests.** These fail when something new is added without a security decision:
  - the `SECURITY DEFINER` EXECUTE allow-list
  - "anon cannot execute definer functions"
  - the `games.players` privileges

  Update the allow-list in `085_security_hardening.sql` deliberately, never just to make CI pass.
- **Frontend mocks.**
  - Repositories are tested by recording the query-builder chain (`from/select/eq/or/not/upsert/delete/rpc`) and asserting the calls.
  - Hooks and components mock the repository or hook modules instead of the network.
- Integration tests create their own users and groups and delete them in `afterAll`. Run them only against a local stack, never against staging or production.

### Manual persona check (local)
`yarn seed:personas` creates two groups, two upcoming events and seven logins in the **local** stack. It refuses to run against any non-local URL. Every login uses the password `persona-password`. Run `yarn seed:personas --remove` to delete everything it created.

| Login | Setup | Expected in the app (`yarn start`) |
| --- | --- | --- |
| `outsider@persona.test` | no group | Sees neither persona event. No create-group "+" button. Can join group B (public, open). Can only request to join group A. |
| `member@persona.test` | `user` in A | Sees "Persona Training A" only. Can sign up, comment, book drinks, report games. All features unlocked. |
| `trial@persona.test` | `trial` in A | Sees event A and can sign up. Only the `events` features. No comments, drinks or games. |
| `requested@persona.test` | `joinRequested` in A | Sees nothing of group A. |
| `groupadmin@persona.test` | `admin` in A | Edits group A, accepts or declines requests (e.g. `requested`), edits event A. Cannot touch group B or grants. |
| `memberb@persona.test` | `user` in B | Sees event B only. |
| `platformadmin@persona.test` | direct grants (`supabase.admin`, `grants.manage`, `groups.manage.admin`, …) | Create-group button, grants manager, DB browser, logs, analytics, notify users, password reset. Group events stay group-scoped: sees persona events only after joining the group. |

Note: depending on `trg_add_user_to_public`, new accounts may also be added to the public main group, which can show seed events from that group.

---

## 2. Supabase backend

### 2.1 Auth, users and profiles
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `trg_handle_new_auth_user`, `trg_add_user_to_public`, `games.trg_user_to_player` | Sign-up creates `public.user` and a linked `games.players` row. Membership in the public main group. | `profileCreation.test.tsx`, `072_public_group.sql` | ✅ 🆕 |
| `public.user` RLS | Users read and update only their own allowed columns. Admins (`users.manage`) can update others. | `075_public_user.sql`, `085`, `087` | ✅ 🆕 |
| `trg_user_protect_columns` | Users cannot change `role`, `email` or other protected columns. Allowed columns still change. Service role is unrestricted. | `085`, `087` | 🆕 |
| `trg_sync_session_last_seen` / `last_sign_in_at` | Login updates the timestamp. | — | ⬜ P3 |
| `custom_access_token_hook` (public / util) | Claims contain the expected permissions. Unknown users don't break login. | — | ⬜ P3 (hooks currently unused: remove or test) |
| Email visibility | Decide whether all users may read every email (finding B12), then test the decision. | — | ⬜ P1 (pending decision) |

### 2.2 Groups and membership
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `event_group` CRUD | Only platform admins (`supabase.admin`, `groups.manage.admin`) create groups. A group admin updates only their own group. Normal users and anon are rejected. | `072`, `085`, `089`, `groupCreation.test.tsx` | 🆕 |
| `group_user_mapping` insert | Self-join as `user` only into public groups without a join request. Self-insert as `joinRequested` is allowed. A group admin adds `user`. Admin role only via group admin, platform admin, or `groups.manage.admin` on an empty group. Nobody self-promotes. | `079`, `085`, `089`, `groupCreation.test.tsx` | 🆕 |
| `group_user_mapping` update / delete | Only group or platform admins change roles. Members may leave. Outsiders cannot remove members. | `089` | 🆕 |
| `is_user_in_group`, `is_user_admin_in_group`, `is_full_member_of_group`, `is_member_of_event`, `is_full_member_of_event`, `group_has_no_members`, `is_group_public_joinable` | true/false per persona | `079`, `086` | 🆕 |
| `check_parent_groups`, `trg_delete_user_from_subgroups` | Joining a subgroup requires the parent group. Leaving the parent also removes the user from its subgroups. | `089` (subgroup cascade on admin removal, TODO test) | 🐞 P1: bug, see §6 |
| `create_group_with_user` | Creator becomes admin. Non-platform-admins are rejected. | — | ⬜ P2 |
| `event_groups_view` | Shows only the caller's groups with their role. | `040` (partial) | ⬜ P2 |

### 2.3 Grants (permissions and features)
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `permissions`, `features` catalogue | Readable by authenticated users. Writable only by platform admins. | `050` | ✅ |
| `group_permissions`, `group_features` | Only platform admins write. Members read their own group's grants. | `074`, `085`, `086`, `089` | ✅ 🆕 |
| `user_direct_grants` | No column default for `user`. Only `supabase.admin` writes. Users read only their own grants. | `074`, `086` | 🆕 |
| `grant_group_grants`, `revoke_group_grants`, `grant_user_grants`, `revoke_user_grants` | Platform admin succeeds. Group admin and members get `forbidden`. Idempotent. | `074`, `085`, `086` | ✅ 🆕 |
| `user_grants_view` / `authorize()` | Full member gets group grants plus direct grants. Trial gets `events`/`events.trials` feats and `event.signup` only if the group has it. `joinRequested` gets nothing. Tenant scoping. | `074`, `085`, `086` | ✅ 🆕 |

### 2.4 Trials
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `set_trial_started_at` | Set when the role becomes `trial`. Kept on other updates. | — | ⬜ P2 |
| `expire_trial_memberships`, `admin_expire_trials` (cron 03:00) | Expired trials are removed or downgraded. Only admins may call it. | — | ⬜ P2 |
| `max_trial_attendees` (`trg_update_attendance_on_max_trial_attendees_change`) | The trial attendee limit is enforced. Changing it re-evaluates the waiting list. | — | ⬜ P2 |

### 2.5 Events
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `events` RLS | Visible only to members of the event's group (trial included). Outsiders, `requested` and anon see nothing. Only group admins or event managers write. | `010`, `04`, `085`, `088` | ✅ 🆕 |
| `insert_event_with_bring_items` | Creates the event with its items. Rejected for non-admins. | `077` | ✅ |
| `delete_event`, `delete_event_and_children`, `delete_recurring_events` | Cascades to attendance, comments and items. Only permitted users. | — | ⬜ P1 |
| Recurring events: `create_next_occurrences(_candidates)` and its private wrapper | Creates the next occurrence (DST-safe, deadline offset, items copied). Normal users get `forbidden`. | `081`, `085`, `086` | ✅ 🆕 |
| Transformations: `create_event_transformation_by_key`, `apply_transformation_to_event`, `revert_transformation_application`, `run_event_transformations` (cron hourly) | Apply and revert. Anon and normal users are blocked. | `082`, `085` | ✅ 🆕 |
| Views: `distinct_event`, `current_distinct_event`, `events_user_view` | Latest future occurrence per series. Scoped to the caller. | `060`, `040` | ✅ |
| `reset_reminder_sent_at`, `send_answer_deadline_reminders` | Reminder sent once. Reset when the deadline moves. | — | ⬜ P2 |

### 2.6 Attendance
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `event_attendance_user_mapping` RLS | Members and trials sign themselves up. Admins edit others. Outsiders cannot read or write. | `020`, `070`, `085`, `088` | ✅ 🆕 |
| `update_attendance` | Answer before the deadline. Late answers go through the request flow. Trainer flag requires permission. | `070` | ✅ |
| Waiting list (`trg_update_waiting_list_attendance`, `auto_promote_from_waitinglist`, `trg_update_attendance_on_maxattendees_change`) | Overflow goes to the waiting list. Promotion when a place frees up or the limit is raised. | `020` | ✅ |
| `trg_attendance_immutable_keys` | `event` and `user` cannot be changed by update. | `087` | 🆕 |

### 2.7 Bring items and pledges
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `event_bring_items`, `event_bring_pledges` RLS | Group-scoped read. Pledge only for yourself. Admins manage items. | `030`, `088` | ✅ 🆕 |
| `trg_check_item_capacity`, `trg_pledge_sanity`, `trg_sync_pledge_event_from_item` | Capacity limit. No negative pledges. Pledge event synced from its item. | `05`, `030` | ✅ |
| Views `event_bring_item_status`, `event_bring_overview` | Totals are correct. | `030` (partial) | ⬜ P3 |

### 2.8 Comments
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `event_comments` RLS | Group members read and write. Authors edit and delete their own comments. Outsiders are blocked. | `088` | 🆕 |
| `check_reply_to`, `trg_update_event_comment`, `trg_event_comment_immutable_event` | Replies stay within the same event. A comment cannot be moved to another event. | `087` | 🆕 |
| Comment notification | Recipients are the other attendees. No self-notification. | `076` | ✅ |

### 2.9 Drinks, history, payments, vouchers
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `drink` RLS | Everyone reads. Only `drinks.manage` writes. | `089` (fixtures only) | ⬜ P2 |
| `add_drinks_history` / `history` RLS / `trg_history_enforce_amount` | Price is taken from the drink, never from the client. Users only book for themselves. `drinks.history.admin` edits. | `080`, `085`, `087` | ✅ 🆕 |
| `payments`, `get_or_create_payment_for_user` | Users see only their own payments. `drinks.confirm.payments` confirms them. Fulfilment triggers a notification. | `089` | 🆕 |
| `vouchers`, `user_vouchers` | Redeem only your own vouchers. | — | ⬜ P2 |

### 2.10 Keys and items
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `items` RLS | Readable by full group members (or global items). Writable with `items.manage`. | `071`, `089` | ✅ 🆕 |
| `key_handover` | Only the current holder or `items.manage` hands over. The target must be a group member. Logged in `item_history`. | `071`, `086` | ✅ 🆕 |
| `edit_item`, `trg_add_item_history_entry`, `trg_items_handover_log` | History is written on every change. | `071` (partial) | ⬜ P3 |

### 2.11 Challenges
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `challenge`, `challenge_stats`, `challenge_stats_meta` RLS | Read requires `challenge.manage` or full membership. Inserting stats requires `challenge.manage`. | `073`, `089` | ✅ 🆕 |
| `increase_challenge_stats_count`, `_sum_challenge_points_for_self` | Only for yourself and only in a group you belong to. Points are summed correctly. | `073`, `086` | ✅ 🆕 |
| Views `challenge_podium`, `challenge_user_points` | Ranking is correct. Group-scoped. | `073` (partial) | ⬜ P3 |
| `admin_challenge_zero_points_candidates` (private wrapper) | Admin-only. | `085`, `086` | 🆕 |

### 2.12 Games and ELO
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `games.players` privileges | Users may only `UPDATE(hide_rating, rg_link, gender)` on their own player (legacy and linked). Rating columns are denied. No PUBLIC privileges. | `03`, `085`, `087`, `profileCreation.test.tsx` | ✅ 🆕 |
| `trg_players_reset_rg_data` | Changing `rg_link` clears `rg_index`, `rg_avatar_url` and `rg_id`. | `087` | 🆕 |
| `add_match_with_sets`, `apply_elo_for_match`, ELO helpers | ELO maths, K factor, confidence, category offset. | `02`, `084` | ✅ |
| `add_match_with_sets` authorization | `created_by` must equal the caller. New players cannot be given arbitrary ratings. | — | ⬜ P1 (open finding) |
| `match`, `sets` RLS, `is_match_participant`, `is_match_public_or_match_member` | Participants and admins edit. Public matches are readable. | `03` (partial) | ⬜ P2 |
| `merge_guest_player` | Merge rules. Admin only (`games.admin.merge_accounts`). | `083` | ✅ |
| `recompute_all_elo_from_scratch`, `trg_on_elo_config_recompute` | Deterministic recompute. Admin only. | — | ⬜ P3 |
| Views `leaderboard`, `players_public`, `unified_player_profiles`, `user_matches` | `hide_rating` respected. New-style players resolved via `linked_user_id`. | `03` (partial) | ⬜ P1 (player identity bug) |

### 2.13 Notifications and web push
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `notifications`, `user_notification_preferences`, `web_push_subscriptions` RLS | Users read and write only their own rows. | — | ⬜ P2 |
| `mark_notification_read`, `mark_all_notifications_read`, `set_notification_pref`, `is_topic_enabled_for_user` | Affect only your own notifications. Topic opt-out is respected. | — | ⬜ P2 |
| `notify_emit` (internal) / `admin_notify_emit` | Not executable by clients. The admin wrapper requires `admin.notify_users`. | `085`, `086` | 🆕 |
| Domain triggers `_trg_*_to_notify` | Correct recipients for each event type (event updated or cancelled, join requested or confirmed, item handover, payment, challenge, game). | `076` (comments only) | ⬜ P2 |
| Outbox / `enqueue_notification` / `inc_target_attempt` / `webpush_prune_subscriptions` / `run_push_worker_if_needed` (cron every minute) | Retry counting. Pruning of stale subscriptions. Not callable by clients. | `085` (EXECUTE guard) | ⬜ P3 |

### 2.14 Admin, util, audit
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `admin_analytics_*` wrappers | Require `admin.analytics.view`. `forbidden` otherwise. | `085`, `086` | 🆕 |
| `util.get_table_metadata` wrapper, `get_column_info`, `get_primary_keys`, `get_public_table_names`, `get_enum_types` | Admin-only metadata for the DB browser. | `086` | 🆕 |
| `audit.log`, `audit.log_change`, retention | Changes are logged with the actor. Users cannot read or modify the log. Retention deletes old rows. | — | ⬜ P3 |
| `util.background_errors` → Sentry trigger | Errors are forwarded. Not readable by users. | — | ⬜ P3 |
| `tournament_costs` | Requires the `costs` feature. Users see their group's costs. Managers write. | — | ⬜ P2 |
| `app_config` | Readable by users, writable by admins only. | — | ⬜ P3 |

### 2.15 Cross-cutting guards
| Guard | Tests | Status |
| --- | --- | --- |
| Every `SECURITY DEFINER` function is either on the allow-list or not executable by `authenticated`/`anon` | `085` | 🆕 |
| `anon` cannot execute any definer function | `085` | 🆕 |
| No `PUBLIC` privileges on `games` schema/tables | `085`, `087` | 🆕 |
| Every table in exposed schemas has RLS enabled | — | ⬜ P1 (add to `085`: `select … from pg_class where relrowsecurity = false`) |
| Legacy permissive policies removed (no `using (true)` write policies except the allow-listed ones) | — | ⬜ P2 |

### 2.16 Edge functions
| Function | Cases | Tests | Status |
| --- | --- | --- | --- |
| `management-proxy` | CORS preflight. 401 without a session or with the anon key. 403 without `supabase.admin`. 403 for paths and methods outside the allow-list, other projects and path tricks. Allowed routes are forwarded. | `managementProxyRoutes.test.ts`, `edgeFunctionAuthz.test.ts` | 🆕 |
| `reset-user-password` | 405 for anything but POST. 401 without a token or with the anon key. 400 for too-short passwords. 403 for normal users (password unchanged). 200 with `reset_user_password` or `supabase.admin`. | `edgeFunctionAuthz.test.ts` | 🆕 |
| `event-creation`, `event-transformation-worker`, `deadline-reminder-worker`, `push-worker` | Only callable with the internal bearer (Vault `EDGE_BEARER`). Idempotent. | — | ⬜ P1 (auth); P3 (logic) |
| `ical` | Feed only contains events the token owner may see. Invalid token returns 401. | — | ⬜ P1 |
| `fetch-player-info` | Only callable by cron or service role. Parses the rankings page (fixture HTML). | — | ⬜ P2 |
| `sentry-report` | Rate limiting and payload size cap. | — | ⬜ P3 |

---

## 3. Frontend

### 3.1 Repositories (`src/repository`): query-builder assertions with the mocked client
| Repository | Cases | Tests | Status |
| --- | --- | --- | --- |
| `EventRepository` | `updateSingleEvent` throws when RLS filters out the row. Series update is DST-safe. | `eventRepository.test.ts` | ✅ |
| `GamesRepository.upsertSetsToMatch` | An empty list deletes all sets of the match. Otherwise upsert, then delete the rest by upserted ids. Errors propagate. | `repositoryFixes.test.ts` | 🆕 |
| `PlayerDataRepository` | Own-player filter covers legacy and linked players. `fetchEloHistory` throws on error. | `repositoryFixes.test.ts` | 🆕 |
| `DrinkRepository`, `AdminDrinksRepository` | `fetchAllDrinks` throws on error. `deleteDrink` takes the uuid string. | `repositoryFixes.test.ts` | 🆕 |
| `GrantsRepository` | `fetchAdminGroups` filters `role = admin` and throws on error. | `repositoryFixes.test.ts` | 🆕 |
| `AdminUsersRepository` | Notifications go through `admin_notify_emit`. Add and remove users. | `repositoryFixes.test.ts` | 🆕 (notify) / ⬜ P2 (rest) |
| `GroupsRepository`, `UserRepository`, `KeysRepository`, `ChallengeRepository`, `NotificationsRepository`, `TournamentCostRepository` | Correct table, filters and error propagation for every method. | — | ⬜ P2 |

### 3.2 TanStack hooks (`src/tanstack`, `src/features/**/query`)
| Area | Cases | Tests | Status |
| --- | --- | --- | --- |
| `grants.ts` grant/revoke user/group mutations | Optimistic update. On error, permissions and features restore into their own cache keys. Invalidation on settle. | `grantsMutations.test.tsx` | 🆕 |
| `events.ts` mutations | Optimistic attendance, rollback, invalidation. | `eventMutations.test.tsx` | ✅ |
| `useUserGrantsQuery` | `loading` only on the first load, not during background refetch. Realtime refetch on mapping changes. | `useUserGrantsQuery.test.tsx` | 🆕 |
| `groups` join/accept/decline/add/remove mutations | Correct role and cache invalidation. | — | ⬜ P2 |
| `drinks`, `items`, `challenge`, `games`, `player_data`, `notifications`, `tournamentCosts`, `admin`, `user`, `auth` | Query keys stable. Error toasts shown. Offline persistence restores. | — | ⬜ P3 |

### 3.3 Auth, grants and routing
| Functionality | Cases | Tests | Status |
| --- | --- | --- | --- |
| `GrantsContext` / `Has` (`perm`, `feat`, `any`, `fallback`) | Renders children only with the grant. `any` = OR. Fallback rendered. | `publicGroupList.test.tsx` (indirect) | 🆕 / ⬜ P1 (direct unit test) |
| `AppRoutes` guards | Each feature-locked route (`costs`, `drinks`, `challenges`, `events`, `games`) shows `FeatureLockedRouteElement`. Each admin route (`supabase.admin`, `drinks.history.admin`, `drinks.confirm.payments`, `users.manage`, `admin.analytics.view`, `grants.manage`, `games.admin.merge_accounts`, `admin.notify_users`) shows `UnauthorizedRouteElement` without the permission. | — | ⬜ P1 |
| `AuthGate`, `LoginForm`, `SignUpForm`, `ForgotPassword`, `signOut` | Redirect to login with the return path. Validation. Error messages. | — | ⬜ P2 |

### 3.4 Feature components
| Feature | Component(s) | Cases | Tests | Status |
| --- | --- | --- | --- | --- |
| groups | `PublicGroupList` | Create button only with `supabase.admin` or `groups.manage.admin`. | `publicGroupList.test.tsx` | 🆕 |
| groups | `PublicGroupInformation`, `CreateOrUpdateGroupDialog` | Join vs request button by group settings. Admin actions only for group admins. | — | ⬜ P2 |
| profile | `PlayerzoneTab` | Update payload is only `rg_link` and `gender`. Gender is required. | `playerzoneTab.test.tsx` | 🆕 |
| profile | `AccountTab`, `ChangePasswordTab`, `NotificationsTab`, `CalendarTab` | Saves only allowed fields. Password rules. Topic toggles. iCal link. | — | ⬜ P3 |
| events | `ConstellationsCreationDialog` | Player lookup by `linked_user_id` or `player`. Names mapped for both player styles. | `constellationsCreationDialog.test.tsx` | 🆕 |
| events | `EventList`, `EventInformation` tabs (attendance, bring items, comments, matches), `CreateOrUpdateEventDialog`, `RecurringEvents`, `TransformEventDialog`, `DeleteEventDialog` | Trial users see sign-up only. Deadline handling. Admin-only edit controls. | — | ⬜ P2 |
| games | `ReportSetsDialog` | `onClose` receives the saved sets. Error toast. | `reportSetsDialog.test.tsx` | 🆕 |
| games | `ReportScore`, `Leaderboard`, `MatchInformation`, `GameList` | Hidden ratings are respected. Validation of set scores. | — | ⬜ P3 |
| drinks | `DrinkListScreen` | Empty drink has `id: ''` (uuid) and no `previousDrink`. | `drinkListScreen.test.ts` | 🆕 |
| drinks | `PayDrinksScreen`, `HistoryScreen`, dialogs | The client never sends prices. Pagination. | — | ⬜ P2 |
| keys | `ItemHolderScreen`, `KeyHandOverDialog` | Hand-over only offered to the holder or a manager. | — | ⬜ P2 |
| challenges | list, leaderboard, `EnterPointDialog` | Points entry for yourself. Manager controls. | — | ⬜ P3 |
| admin | dashboard, users, analytics, payments, history, merge, notify | Visible only with the matching permission. Forbidden errors surfaced. | — | ⬜ P2 |
| grants | `GrantsManager`, `GrantsEditorDialog` | Shows and edits group and direct grants. Disabled without `grants.manage`. | — | ⬜ P2 |
| supabase | DB browser and logs (`management-api`, `use-run-query`, `use-logs`) | Only allowed Management API routes are used (keep in sync with `_shared/managementProxyRoutes.ts`). | — | ⬜ P2 |
| costs, notifications, search, push, homepage | — | Smoke render plus the main interaction. | — | ⬜ P3 |

---

## 4. End-to-end journeys (Playwright)
| Journey | Spec | Status |
| --- | --- | --- |
| Register, log out, log in | `group-join.spec.ts` (commented out) | ⬜ P2 |
| Join a public group without approval; request to join, then admin accepts | `group-join.spec.ts` | ✅ |
| See only your own groups' events; attend with and without permission; deadline request flow; attend as trainer | `event-attendance.spec.ts` | ✅ |
| Trial member: sees events, signs up, cannot comment or bring items | — | ⬜ P1 |
| Platform admin creates a group and grants a feature; the member sees the feature unlock without reloading | — | ⬜ P1 |
| Normal user does not see the create-group button or admin routes | — | ⬜ P1 |
| Book a drink, then admin confirms the payment | — | ⬜ P2 |
| Report a match, then the leaderboard updates | — | ⬜ P2 |
| Key hand-over | — | ⬜ P3 |

---

## 5. Definition of done for changes
1. **Schema or policy change:** add pgTAP tests for every persona in §1. Add the function to or remove it from the allow-list in `085` with a justification. Regenerate types (`yarn gen-types:local`).
2. **New `SECURITY DEFINER` function:** check permissions inside the function, `revoke execute … from public, anon`, and add a pgTAP test for the allowed and the forbidden caller.
3. **New edge function:** authenticate the caller with their own JWT client and `authorize()`. Never trust request bodies for identity. Add a Deno integration test.
4. **Frontend change touching data access:** add a repository test with the mocked client. Hide UI behind `Has` and also enforce it server-side.
5. **CI:**
   - `supabase db start && supabase test db`
   - `npx vitest run`
   - `deno test` for edge-function unit tests
   - E2E nightly or before deploy.

## 6. Backlog (prioritized gaps)
- **Known bug** (documented by the TODO test in `089`): when a group admin removes a member from a parent group, the member keeps their subgroup memberships. `trg_delete_user_from_subgroups` runs as the caller, and RLS only allows the admin to delete rows in groups they administer. Possible fix: make the trigger function `SECURITY DEFINER`, then drop the `todo_start`/`todo_end` around the test.
- **Behaviour to decide on** (currently tested as-is in `086`–`089`):
  - Anon has no table grant on `event_group`, so the "visible groups" policy never applies to anon.
  - `challenge.manage` lets a user insert challenge stats into groups they are not in.
  - `authenticated` still has `TRUNCATE` on many tables. This bypasses RLS, but PostgREST can't issue it.
- **P1**
  - RLS-enabled guard
  - `add_match_with_sets` authorization
  - player identity (views and leaderboard for new-style players)
  - `ical` and internal-worker edge-function authentication
  - `delete_event*` functions
  - `AppRoutes` guard tests
  - direct `Has` unit test
  - trial and admin e2e journeys
- **P2**
  - trial expiry
  - parent/subgroup triggers
  - notifications RLS and triggers
  - vouchers
  - tournament costs
  - match/sets RLS
  - remaining repositories and group mutations
  - main feature components
- **P3**
  - audit
  - background errors
  - views totals
  - ELO recompute
  - remaining hooks and components smoke tests
